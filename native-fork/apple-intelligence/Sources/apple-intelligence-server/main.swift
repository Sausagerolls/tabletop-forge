// apple-intelligence-server
//
// A tiny localhost HTTP server that bridges the TableTop Forge backend to
// Apple's on-device model (Apple Intelligence) through the FoundationModels
// framework. It speaks just enough of the OpenAI Chat Completions protocol for
// the backend's existing `callOpenAICompat()` path to use it unchanged:
//
//   POST /v1/chat/completions   { model, messages:[{role,content}], temperature, max_tokens }
//        -> { choices:[{ message:{ role:"assistant", content }, finish_reason }], model }
//   GET  /health                -> { status, available, reason? }
//
// The Tauri shell picks a free port, passes it in $PORT, spawns this binary,
// and hands the resulting http://127.0.0.1:<port> to the Node backend via
// $APPLE_AI_URL. If Apple Intelligence is unavailable on this machine the
// /health probe reports it and chat requests return a 503 with the reason, so
// the GM sees a clear message instead of a silent failure.

import Foundation
import FoundationModels
import Network

// MARK: - Availability

/// Human-readable reason the on-device model can't be used right now, or nil
/// when it's ready. Kept as a free function so both /health and the chat
/// handler share one source of truth.
@available(macOS 26.0, *)
func unavailabilityReason() -> String? {
    switch SystemLanguageModel.default.availability {
    case .available:
        return nil
    case .unavailable(let reason):
        switch reason {
        case .deviceNotEligible:
            return "This Mac does not support Apple Intelligence."
        case .appleIntelligenceNotEnabled:
            return "Apple Intelligence is not enabled. Turn it on in System Settings > Apple Intelligence & Siri."
        case .modelNotReady:
            return "The on-device model is still downloading or warming up. Try again shortly."
        @unknown default:
            return "Apple Intelligence is unavailable on this Mac."
        }
    }
}

// MARK: - Generation

@available(macOS 26.0, *)
func generate(system: String, prompt: String, temperature: Double?, maxTokens: Int?) async throws -> String {
    if let reason = unavailabilityReason() {
        throw ChatError.unavailable(reason)
    }
    let session = system.isEmpty
        ? LanguageModelSession()
        : LanguageModelSession(instructions: system)
    let options = GenerationOptions(
        temperature: temperature,
        maximumResponseTokens: maxTokens
    )
    let response = try await session.respond(to: prompt, options: options)
    return response.content
}

enum ChatError: Error {
    case unavailable(String)
    case badRequest(String)
}

// MARK: - Request shapes

struct ChatMessage: Decodable {
    let role: String
    let content: String
}

struct ChatRequest: Decodable {
    let model: String?
    let messages: [ChatMessage]
    let temperature: Double?
    let max_tokens: Int?
}

/// Split OpenAI-style messages into a single instructions string (all `system`
/// turns) and a prompt (the remaining user/assistant turns). For the common
/// single-shot case — one system + one user — this is just system→instructions
/// and user→prompt. Multi-turn conversations are flattened into a labelled
/// transcript, which is good enough for the backend's one-shot generation use.
func splitMessages(_ messages: [ChatMessage]) -> (system: String, prompt: String) {
    let system = messages
        .filter { $0.role == "system" }
        .map { $0.content }
        .joined(separator: "\n\n")
    let turns = messages.filter { $0.role != "system" }
    let prompt: String
    if turns.count <= 1 {
        prompt = turns.first?.content ?? ""
    } else {
        prompt = turns.map { turn in
            let label = turn.role == "assistant" ? "Assistant" : "User"
            return "\(label): \(turn.content)"
        }.joined(separator: "\n\n")
    }
    return (system, prompt)
}

// MARK: - JSON helpers

func jsonString(_ value: Any) -> Data {
    (try? JSONSerialization.data(withJSONObject: value)) ?? Data("{}".utf8)
}

func chatResponseJSON(content: String, model: String) -> Data {
    jsonString([
        "id": "applechatcmpl",
        "object": "chat.completion",
        "model": model,
        "choices": [[
            "index": 0,
            "message": ["role": "assistant", "content": content],
            "finish_reason": "stop",
        ]],
    ])
}

// MARK: - Minimal HTTP/1.1 server over Network.framework

// All mutable work funnels through the single serial `queue`, and the response
// helpers only touch the per-request NWConnection, so the shared instance is
// safe to hand to Network.framework's @Sendable closures.
final class HTTPServer: @unchecked Sendable {
    private let listener: NWListener
    private let queue = DispatchQueue(label: "studio.giantmushroom.appleai.server")

    init(port: UInt16) throws {
        let params = NWParameters.tcp
        // Loopback only — never expose the on-device model to the LAN.
        params.requiredInterfaceType = .loopback
        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            throw ChatError.badRequest("invalid port \(port)")
        }
        listener = try NWListener(using: params, on: nwPort)
    }

    func start() {
        listener.newConnectionHandler = { [weak self] conn in
            self?.handle(conn)
        }
        listener.start(queue: queue)
        FileHandle.standardError.write(Data("[apple-ai] listening on 127.0.0.1\n".utf8))
    }

    private func handle(_ conn: NWConnection) {
        conn.start(queue: queue)
        receive(conn, buffer: Data())
    }

    /// Accumulate bytes until we have headers + the full body (Content-Length),
    /// then dispatch. HTTP/1.1 keep-alive is not supported — one request per
    /// connection, which is all the backend needs.
    private func receive(_ conn: NWConnection, buffer: Data) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 1 << 20) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            var buffer = buffer
            if let data, !data.isEmpty { buffer.append(data) }

            if let request = Self.parse(buffer) {
                self.route(request, on: conn)
                return
            }
            if error != nil || isComplete {
                self.respond(conn, status: "400 Bad Request", body: self.jsonError("malformed request"))
                return
            }
            self.receive(conn, buffer: buffer)
        }
    }

    private struct ParsedRequest {
        let method: String
        let path: String
        let body: Data
    }

    /// Returns nil while the request is still incomplete (need more bytes).
    private static func parse(_ buffer: Data) -> ParsedRequest? {
        let separator = Data("\r\n\r\n".utf8)
        guard let range = buffer.range(of: separator) else { return nil }
        let headerData = buffer.subdata(in: buffer.startIndex..<range.lowerBound)
        guard let headerText = String(data: headerData, encoding: .utf8) else { return nil }

        let lines = headerText.split(separator: "\r\n", omittingEmptySubsequences: false)
        guard let requestLine = lines.first else { return nil }
        let parts = requestLine.split(separator: " ")
        guard parts.count >= 2 else { return nil }
        let method = String(parts[0])
        let path = String(parts[1])

        var contentLength = 0
        for line in lines.dropFirst() {
            let lower = line.lowercased()
            if lower.hasPrefix("content-length:") {
                contentLength = Int(line.split(separator: ":")[1].trimmingCharacters(in: .whitespaces)) ?? 0
            }
        }

        let bodyStart = range.upperBound
        let available = buffer.distance(from: bodyStart, to: buffer.endIndex)
        if available < contentLength { return nil } // wait for the rest of the body
        let body = buffer.subdata(in: bodyStart..<buffer.index(bodyStart, offsetBy: contentLength))
        return ParsedRequest(method: method, path: path, body: body)
    }

    private func route(_ request: ParsedRequest, on conn: NWConnection) {
        // Strip any query string.
        let path = request.path.split(separator: "?").first.map(String.init) ?? request.path

        if request.method == "GET" && path == "/health" {
            let reason = unavailabilityReason()
            let body = jsonString([
                "status": "ok",
                "available": reason == nil,
                "reason": reason as Any,
            ])
            respond(conn, status: "200 OK", body: body)
            return
        }

        if request.method == "POST" && path == "/v1/chat/completions" {
            handleChat(request.body, on: conn)
            return
        }

        respond(conn, status: "404 Not Found", body: jsonError("not found"))
    }

    private func handleChat(_ body: Data, on conn: NWConnection) {
        let decoded: ChatRequest
        do {
            decoded = try JSONDecoder().decode(ChatRequest.self, from: body)
        } catch {
            respond(conn, status: "400 Bad Request", body: jsonError("invalid JSON body"))
            return
        }
        let (system, prompt) = splitMessages(decoded.messages)
        let model = decoded.model ?? "apple-on-device"

        Task {
            do {
                let content = try await generate(
                    system: system,
                    prompt: prompt,
                    temperature: decoded.temperature,
                    maxTokens: decoded.max_tokens
                )
                respond(conn, status: "200 OK", body: chatResponseJSON(content: content, model: model))
            } catch ChatError.unavailable(let reason) {
                respond(conn, status: "503 Service Unavailable", body: jsonError(reason))
            } catch {
                respond(conn, status: "500 Internal Server Error", body: jsonError(error.localizedDescription))
            }
        }
    }

    private func jsonError(_ message: String) -> Data {
        jsonString(["error": ["message": message]])
    }

    private func respond(_ conn: NWConnection, status: String, body: Data) {
        var header = "HTTP/1.1 \(status)\r\n"
        header += "Content-Type: application/json\r\n"
        header += "Content-Length: \(body.count)\r\n"
        header += "Connection: close\r\n\r\n"
        var payload = Data(header.utf8)
        payload.append(body)
        conn.send(content: payload, completion: .contentProcessed { _ in
            conn.cancel()
        })
    }
}

// MARK: - Entry point

guard #available(macOS 26.0, *) else {
    FileHandle.standardError.write(Data("[apple-ai] requires macOS 26 or newer\n".utf8))
    exit(1)
}

let env = ProcessInfo.processInfo.environment
let port = UInt16(env["PORT"] ?? "") ?? 11535

do {
    let server = try HTTPServer(port: port)
    server.start()
    dispatchMain()
} catch {
    FileHandle.standardError.write(Data("[apple-ai] failed to bind :\(port): \(error)\n".utf8))
    exit(1)
}

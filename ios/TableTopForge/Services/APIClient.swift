import Foundation

// REST helper for fetch-by-id reads and creature-sheet PUTs. Everything
// real-time (token movement, HP, light, dice rolls) goes via Socket.IO.
// REST is the right fit for "get the full creature row" and "save the
// edited sheet" — large payloads, one-shot, not session-scoped.
struct APIClient {
    let baseURL: URL

    func fetchCreature(id: Int) async throws -> Creature {
        let url = baseURL.appendingPathComponent("api/creatures/\(id)")
        let (data, resp) = try await URLSession.shared.data(from: url)
        try Self.checkOk(resp, data: data)
        return try JSONDecoder().decode(Creature.self, from: data)
    }

    // For now we only support patching the simple scalar fields the
    // Stats tab edits (HP, max HP, AC, ability scores). The full
    // creature form is a multipart upload (image included) which the
    // web client builds inline; we'd add that here when we wire the
    // edit-image flow.
    func patchCreature(id: Int, updates: [String: Any]) async throws -> Creature {
        let url = baseURL.appendingPathComponent("api/creatures/\(id)")
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        // Server accepts JSON for non-multipart updates. Confirmed by
        // the web client's PUT path which falls back to JSON when no
        // image file is attached.
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: updates)
        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.checkOk(resp, data: data)
        return try JSONDecoder().decode(Creature.self, from: data)
    }

    static func checkOk(_ resp: URLResponse, data: Data) throws {
        guard let http = resp as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw APIError.server(http.statusCode, body)
        }
    }
}

enum APIError: LocalizedError {
    case network(String)
    case server(Int, String)

    var errorDescription: String? {
        switch self {
        case .network(let s): return s
        case .server(let code, let body): return "Server \(code): \(body)"
        }
    }
}

import SwiftUI

// LoginView — first screen the user sees on launch (and after Logout).
// Three fields persisted between launches via SessionStore. Hitting
// Connect spins up the socket; on session_joined the parent view swaps
// to HomeView.
struct LoginView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var serverUrl: String = ""
    @State private var sessionCode: String = ""
    @State private var playerName: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Server") {
                    TextField("https://your-server", text: $serverUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }
                Section("Session") {
                    TextField("Session code", text: $sessionCode)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .font(.system(.body, design: .monospaced))
                    TextField("Player name", text: $playerName)
                        .textInputAutocapitalization(.words)
                }
                if let err = store.lastError {
                    Section {
                        Text(err)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                Section {
                    Button {
                        connect()
                    } label: {
                        if socket.connectionStatus == .connecting {
                            HStack {
                                ProgressView()
                                Text("Connecting…")
                            }
                        } else {
                            Text("Connect")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(!isValid || socket.connectionStatus == .connecting)
                }
            }
            .navigationTitle("TableTop Forge")
            .onAppear {
                // Pre-fill from prior session — UserDefaults remembers
                // these between launches per the spec.
                serverUrl   = store.serverUrl
                sessionCode = store.sessionCode
                playerName  = store.playerName
            }
            // When the socket transitions to .connected and the server
            // sends back session_joined, the parent ContentView flips
            // store.loggedIn = true and swaps in HomeView.
        }
    }

    private var isValid: Bool {
        !serverUrl.trimmingCharacters(in: .whitespaces).isEmpty
            && !sessionCode.trimmingCharacters(in: .whitespaces).isEmpty
            && !playerName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func connect() {
        store.serverUrl   = normaliseUrl(serverUrl.trimmingCharacters(in: .whitespaces))
        store.sessionCode = sessionCode.trimmingCharacters(in: .whitespaces).uppercased()
        store.playerName  = playerName.trimmingCharacters(in: .whitespaces)
        store.lastError   = nil
        store.persist()
        socket.connect(
            serverUrl: store.serverUrl,
            sessionCode: store.sessionCode,
            playerName: store.playerName,
            creatureId: store.lastCreatureId
        )
    }

    // Accept "192.168.50.131" or "host" as shorthand and prepend http://
    // Saves users typing the scheme on a TV-room iPad.
    private func normaliseUrl(_ raw: String) -> String {
        if raw.hasPrefix("http://") || raw.hasPrefix("https://") { return raw }
        return "http://\(raw)"
    }
}

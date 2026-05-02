import SwiftUI

// SettingsSheet — minimal sheet with the connection details (read-only
// reminder of what's been remembered) and the Logout button. Logout
// disconnects the socket, clears UserDefaults, and the parent flips
// store.loggedIn=false which routes back to LoginView.
struct SettingsSheet: View {
    let store: SessionStore
    let socket: SocketClient
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section("Connection") {
                    LabeledContent("Server", value: store.serverUrl)
                    LabeledContent("Session", value: store.sessionCode)
                        .font(.system(.body, design: .monospaced))
                    LabeledContent("Player", value: store.playerName)
                    LabeledContent("Status", value: statusLabel)
                }
                Section {
                    Button(role: .destructive) {
                        socket.disconnect()
                        store.logout()
                        isPresented = false
                    } label: {
                        Text("Log out")
                            .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { isPresented = false }
                }
            }
        }
    }

    private var statusLabel: String {
        switch socket.connectionStatus {
        case .connected:    return "Connected"
        case .connecting:   return "Connecting…"
        case .reconnecting: return "Reconnecting…"
        case .disconnected: return "Disconnected"
        case .failed:       return "Failed"
        }
    }
}

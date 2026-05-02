import SwiftUI

// ContentView — root view. Holds the SessionStore and SocketClient and
// switches between LoginView (when not connected to a session) and
// HomeView (when session_joined has fired).
//
// The transition is driven by the socket's connectionStatus: as soon as
// it goes .connected, we flip store.loggedIn=true. Disconnect / failure
// flips it back. Hard refresh / app relaunch re-uses the persisted
// credentials but still re-runs the login flow so the user sees what
// went wrong if the server is unreachable.
struct ContentView: View {
    @State private var store = SessionStore()
    @State private var socket = SocketClient()
    // Theme picker lives on the right-most tab; ContentView reads
    // the same UserDefaults key and applies preferredColorScheme so
    // the choice cascades to every screen.
    @AppStorage("vtt.theme") private var themeRaw: String = AppTheme.system.rawValue

    private var preferredScheme: ColorScheme? {
        AppTheme(rawValue: themeRaw)?.colorScheme
    }

    var body: some View {
        Group {
            if store.loggedIn {
                // Three post-login states:
                //   1. We have a token (existing match by name OR fresh
                //      one we just spawned via create_player_token) →
                //      show the home tabs.
                //   2. needsCharacterSelection: server has no token for
                //      this player AND we don't have a stored creatureId
                //      → show the picker so they can adopt one of their
                //      existing characters.
                //   3. Otherwise we're mid-handshake; show a brief
                //      loading state.
                if socket.playerTokenId != nil {
                    HomeView(store: store, socket: socket)
                } else if socket.needsCharacterSelection {
                    CharacterPickerView(store: store, socket: socket)
                } else {
                    ProgressView("Joining session…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } else {
                LoginView(store: store, socket: socket)
            }
        }
        .preferredColorScheme(preferredScheme)
        .onChange(of: socket.connectionStatus) { _, new in
            switch new {
            case .connected:
                store.loggedIn = true
                store.lastError = nil
            case .failed:
                store.loggedIn = false
                store.lastError = "Couldn't reach the server. Check the URL and try again."
            case .disconnected where store.loggedIn:
                // Keep loggedIn=true while reconnecting — only flip back
                // on explicit Logout. The HomeView shows a banner.
                break
            default:
                break
            }
        }
    }
}

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
//
// As of the session-switcher change, on cold launch we no longer dump
// the user back at the empty Login form — if `savedSessions` has any
// entries, we auto-connect to the most recent one. They can still
// switch via the in-app switcher (Settings → Switch Session, or the
// "Switch session" button overlaid on LoginView while a connect is in
// flight). Failures fall through to LoginView with the usual error
// banner.
struct ContentView: View {
    @State private var store = SessionStore()
    @State private var socket = SocketClient()
    @State private var didAutoRejoin = false
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
        .onAppear { autoRejoinIfPossible() }
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
        // Refresh the saved-sessions row once we have the live
        // creature in hand, so the switcher row carries the char
        // name + portrait next time the app launches.
        .onChange(of: socket.creature?.id) { _, cid in
            guard let cid else { return }
            store.lastCreatureId = cid
            store.persist()
            store.rememberCurrent(
                creatureId: cid,
                creatureName: socket.creature?.name,
                creatureImagePath: socket.creature?.image_path,
            )
        }
    }

    /// Called once on first appear. If the user has at least one
    /// saved session, fold its values into the live store and kick
    /// off a socket connect — the LoginView will render briefly
    /// behind the .connecting state until session_joined flips us
    /// over to HomeView.
    private func autoRejoinIfPossible() {
        guard !didAutoRejoin else { return }
        didAutoRejoin = true
        guard !store.loggedIn,
              socket.connectionStatus != .connecting,
              let entry = store.savedSessionsByRecency.first else { return }
        store.adopt(entry)
        store.connecting = true
        socket.connect(
            serverUrl: entry.serverUrl,
            sessionCode: entry.sessionCode,
            playerName: entry.playerName,
            creatureId: entry.creatureId,
        )
    }
}

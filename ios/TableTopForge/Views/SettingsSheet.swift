import SwiftUI
import WebKit

// SettingsSheet — connection summary + Logout + an "Edit Character on
// Web" row that opens the full PlayerView in an in-app browser. The
// web client renders the entire CreatureForm flow (race / background /
// class / multiclass / inventory / spells / abilities / etc.), so
// hosting it in a WKWebView gives us 100% parity with the desktop UI
// without re-porting CreatureForm to SwiftUI.
struct SettingsSheet: View {
    let store: SessionStore
    let socket: SocketClient
    @Binding var isPresented: Bool

    @State private var showCharacterEditor = false
    @State private var showSessionSwitcher = false

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
                // Switch between previously-used sessions, or fall
                // back to the LoginView form to add a brand-new one.
                // Hidden when there's nothing to switch to so the
                // Settings list isn't littered with dead options.
                if !store.savedSessions.isEmpty {
                    Section("Sessions") {
                        Button {
                            showSessionSwitcher = true
                        } label: {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Switch Session")
                                    Text("Pick a different campaign you've joined before, or add a new one.")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            } icon: {
                                Image(systemName: "rectangle.2.swap")
                                    .foregroundStyle(.tint)
                            }
                        }
                    }
                }
                Section("Character") {
                    Button {
                        showCharacterEditor = true
                    } label: {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Edit Stat Block")
                                Text("Opens the full character sheet editor — race, class, abilities, inventory, spells. Same as the desktop site.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "pencil.and.list.clipboard")
                                .foregroundStyle(.tint)
                        }
                    }
                    .disabled(characterEditorURL == nil)
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
            .sheet(isPresented: $showCharacterEditor) {
                if let url = characterEditorURL {
                    NavigationStack {
                        WebView(url: url)
                            .ignoresSafeArea(edges: .bottom)
                            .navigationTitle("Edit Character")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .topBarTrailing) {
                                    Button("Done") { showCharacterEditor = false }
                                }
                            }
                    }
                }
            }
            .sheet(isPresented: $showSessionSwitcher) {
                SessionSwitcherView(
                    store: store,
                    socket: socket,
                    isPresented: $showSessionSwitcher,
                ) {
                    // "Add another" — drop the live session so the
                    // root view falls back to LoginView with empty
                    // fields and the user can type a new one.
                    socket.disconnect()
                    store.clearActive()
                    isPresented = false
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

    // /edit-character?id=N mounts the same CreatureForm the GM uses
    // on the desktop, full-screen with a thin "Saved." indicator.
    // The mobile session already knows the creature id — pulled
    // from the socket if connected, otherwise from the persisted
    // lastCreatureId so the editor still opens after a cold launch
    // before the socket completes its join.
    private var characterEditorURL: URL? {
        guard let base = store.baseURL else { return nil }
        guard let cid = socket.creature?.id ?? store.lastCreatureId else { return nil }
        var comps = URLComponents(url: base.appendingPathComponent("edit-character"),
                                  resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "id", value: "\(cid)")]
        return comps?.url
    }
}

// Thin SwiftUI wrapper around WKWebView. Inline link clicks load
// in-place; non-HTTP schemes (mailto, tel) open in the system handler.
private struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView(frame: .zero)
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        if uiView.url != url {
            uiView.load(URLRequest(url: url))
        }
    }
}

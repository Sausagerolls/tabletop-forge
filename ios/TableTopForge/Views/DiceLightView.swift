import SwiftUI
import WebKit

// DiceSettingsView — the right-most tab. Used to be "Dice & Light" but
// the light source picker now lives on the Inventory tab where it
// belongs alongside the items it represents. This tab is now:
//   1. Dice rolling controls (count + modifier + d4..d100)
//   2. The most recent roll only (the full session log lives on the
//      GM's view; the player phone just wants "what did I just roll")
//   3. App settings — theme picker + connection summary + Logout
//
// File is still named DiceLightView.swift so we don't churn the
// project file; the struct rename is the meaningful change.
struct DiceLightView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var diceCount: Int = 1
    @State private var modifier: Int = 0

    // Theme stored in UserDefaults so a relaunch picks up the player's
    // preference. Persistence key matches the rest of the app's
    // vtt.* namespace and what the Android port will use.
    @AppStorage("vtt.theme") private var themeRaw: String = AppTheme.system.rawValue

    private static let dieFaces = [4, 6, 8, 10, 12, 20, 100]

    @State private var showCharacterEditor: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                diceSection
                if let r = socket.diceRolls.last {
                    Section("Last roll") {
                        LastRollRow(roll: r)
                    }
                }
                characterSection
                appearanceSection
                connectionSection
                logoutSection
            }
            .navigationTitle("Dice & Settings")
            .sheet(isPresented: $showCharacterEditor) {
                if let url = characterEditorURL {
                    NavigationStack {
                        WebView(url: url)
                            .navigationTitle("Edit Stat Block")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .topBarTrailing) {
                                    Button("Done") { showCharacterEditor = false }
                                }
                            }
                    }
                }
            }
        }
    }

    // ── Character ────────────────────────────────────────────────────
    // Opens the web client's /edit-character?id=N route in a
    // WKWebView so the player gets the same CreatureForm the GM uses
    // on the desktop — race / class / multiclass / inventory /
    // spells / abilities — without us re-porting the editor to
    // SwiftUI. Disabled until a creature id resolves so the button
    // still surfaces during the post-login "Loading character…" gap.
    @ViewBuilder
    private var characterSection: some View {
        Section("Character") {
            Button {
                showCharacterEditor = true
            } label: {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Edit Stat Block")
                        Text("Race, class, abilities, inventory, spells. Same as the desktop site.")
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
    }

    private var characterEditorURL: URL? {
        guard let base = store.baseURL else { return nil }
        guard let cid = socket.creature?.id ?? store.lastCreatureId else { return nil }
        var comps = URLComponents(url: base.appendingPathComponent("edit-character"),
                                  resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "id", value: "\(cid)")]
        return comps?.url
    }

    // ── Dice ──────────────────────────────────────────────────────────
    @ViewBuilder
    private var diceSection: some View {
        Section("Dice") {
            Stepper("Count: \(diceCount)", value: $diceCount, in: 1...20)
            Stepper("Modifier: \(modifier >= 0 ? "+\(modifier)" : "\(modifier)")",
                    value: $modifier, in: -20...20)
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 64), spacing: 8)],
                spacing: 8
            ) {
                ForEach(Self.dieFaces, id: \.self) { faces in
                    Button {
                        roll(d: faces)
                    } label: {
                        Text("d\(faces)")
                            .font(.system(.body, design: .monospaced).weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .foregroundStyle(.white)
                            .background(.tint, in: RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func roll(d: Int) {
        let label = "d\(d)"
            + (diceCount > 1 ? " ×\(diceCount)" : "")
            + (modifier != 0 ? " \(modifier >= 0 ? "+" : "")\(modifier)" : "")
        socket.emitDiceRoll(DiceRollRequest(dice: d, count: diceCount, modifier: modifier, label: label))
    }

    // ── Appearance ────────────────────────────────────────────────────
    @ViewBuilder
    private var appearanceSection: some View {
        Section("Appearance") {
            Picker("Theme", selection: Binding(
                get: { AppTheme(rawValue: themeRaw) ?? .system },
                set: { themeRaw = $0.rawValue }
            )) {
                ForEach(AppTheme.allCases, id: \.self) { theme in
                    Text(theme.label).tag(theme)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    // ── Connection summary (read-only) ────────────────────────────────
    @ViewBuilder
    private var connectionSection: some View {
        Section("Connection") {
            LabeledContent("Server",   value: store.serverUrl)
            LabeledContent("Session",  value: store.sessionCode)
                .font(.system(.body, design: .monospaced))
            LabeledContent("Player",   value: store.playerName)
            LabeledContent("Status",   value: statusLabel)
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

    // ── Logout ────────────────────────────────────────────────────────
    @ViewBuilder
    private var logoutSection: some View {
        Section {
            Button(role: .destructive) {
                socket.disconnect()
                store.logout()
            } label: {
                Text("Log out").frame(maxWidth: .infinity)
            }
        }
    }
}

// AppTheme — three-state theme switcher backed by UserDefaults. The
// raw value lives in @AppStorage so a relaunch starts with the same
// pick. ContentView reads it and applies preferredColorScheme on the
// root so the choice cascades to every screen.
enum AppTheme: String, CaseIterable {
    case system, light, dark

    var label: String {
        switch self {
        case .system: return "System"
        case .light:  return "Light"
        case .dark:   return "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light:  return .light
        case .dark:   return .dark
        }
    }
}

// Single most-recent roll, formatted as a left-aligned label/breakdown
// pair with a big monospaced total on the right.
private struct LastRollRow: View {
    let roll: DiceRollLine
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(roll.label.isEmpty ? "Roll" : roll.label)
                    .font(.callout.weight(.semibold))
                if !roll.breakdown.isEmpty {
                    Text(roll.breakdown)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text("\(roll.total)")
                .font(.system(.title2, design: .monospaced).weight(.bold))
        }
    }
}

// Re-declared here so the character-editor sheet works without
// adding a separate WebView.swift to the Xcode project. Mirror of
// the private struct in SettingsSheet.swift — both privates are
// scoped to their file so the duplication is intentional.
fileprivate struct WebView: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView(frame: .zero)
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: url))
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {
        if uiView.url != url { uiView.load(URLRequest(url: url)) }
    }
}

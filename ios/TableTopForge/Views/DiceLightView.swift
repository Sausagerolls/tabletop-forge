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
    @State private var showSessionSwitcher: Bool = false
    @State private var serverVersion: String = "—"
    /// `.local` hostname the server reported via /api/version. Comes
    /// from the backend's bonjour-service publish on Linux + native
    /// macOS, or from the host machine's own `<host>.local` on
    /// Mac/Win Docker. nil when the server is older than v1.9.16
    /// (no mDNS field in the response) — UI hides the row in that
    /// case rather than show an empty value.
    @State private var serverMdnsHost: String? = nil
    // Easter-egg state — three taps on the version row within ~2s
    // launches the Brotato-style minigame. Tap counter resets on
    // any inactivity gap so accidental double-taps don't drift in.
    @State private var versionTapCount: Int = 0
    @State private var lastVersionTapAt: Date = .distantPast
    @State private var showMinigame: Bool = false

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
                sessionsSection
                serverSection
                storageSection
                logoutSection
            }
            .navigationTitle("Dice & Settings")
            .task(id: store.serverUrl) { await refreshServerVersion() }
            .fullScreenCover(isPresented: $showMinigame) {
                MinigameView(socket: socket, store: store, onClose: { showMinigame = false })
            }
            .sheet(isPresented: $showSessionSwitcher) {
                SessionSwitcherView(
                    store: store,
                    socket: socket,
                    isPresented: $showSessionSwitcher,
                ) {
                    // "Add another" — drop the live socket + active
                    // session fields so the root view falls back to
                    // LoginView with empty fields.
                    socket.disconnect()
                    store.clearActive()
                }
            }
            // fullScreenCover, not .sheet, on purpose. On iPad a
            // .sheet is a form-sheet card; when WebKit presents the
            // <input type=file> photo/camera picker from inside that
            // card, the system collapses the card itself — the Edit
            // Stat Block editor vanishes mid-edit. A full-screen
            // cover is a stable presentation host: the picker stacks
            // on top and dismisses back to the editor intact.
            .fullScreenCover(isPresented: $showCharacterEditor) {
                if let url = characterEditorURL {
                    NavigationStack {
                        // The character-editor route writes a
                        // tabletopforge-saved / tabletopforge-cancel
                        // hash on Update / Cancel; we close the sheet
                        // the moment that's seen so the in-form
                        // buttons feel native.
                        //
                        // Title goes through ToolbarItem(.principal)
                        // rather than `.navigationTitle("Edit Stat
                        // Block")` because the latter, when applied
                        // to a UIViewRepresentable child, leaks its
                        // preference key past the sheet boundary up
                        // into the outer Dice & Settings NavigationStack
                        // — leaving an "Edit Stat Block" title stuck
                        // in the top-left of the Settings tab after
                        // dismiss. Toolbar items are scoped to their
                        // own NavigationStack and don't have that
                        // leak.
                        WebView(url: url, onDone: { showCharacterEditor = false })
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .principal) {
                                    Text("Edit Stat Block")
                                        .font(.headline)
                                }
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
            // Surface the server's `.local` URL — the GM reads this
            // off the panel; we mirror it here so a player who's
            // joined and wants to share the URL with another player
            // doesn't have to ask. Tap the row to copy the full URL
            // to the clipboard.
            if let host = serverMdnsHost {
                Button {
                    UIPasteboard.general.string = "http://\(host)/"
                } label: {
                    HStack {
                        Text("Reachable as")
                            .foregroundStyle(.primary)
                        Spacer()
                        VStack(alignment: .trailing, spacing: 1) {
                            Text(host)
                                .font(.system(.subheadline, design: .monospaced))
                                .foregroundStyle(.secondary)
                            Text("Tap to copy")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    // ── Server (with the easter egg) ─────────────────────────────────
    // Tapping the version line three times within two seconds opens
    // a SpriteKit-backed Brotato-style minigame. The whole thing is
    // a hidden goof — the section header just reads "Server" so the
    // version row is the only visible cue.
    @ViewBuilder
    private var serverSection: some View {
        Section("Server") {
            LabeledContent("Version", value: serverVersion)
                .contentShape(Rectangle())
                .onTapGesture { handleVersionTap() }
        }
    }

    private func handleVersionTap() {
        let now = Date()
        // Reset counter if too much time passed since the last tap.
        if now.timeIntervalSince(lastVersionTapAt) > 2.0 {
            versionTapCount = 0
        }
        versionTapCount += 1
        lastVersionTapAt = now
        if versionTapCount >= 3 {
            versionTapCount = 0
            showMinigame = true
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }

    private func refreshServerVersion() async {
        guard let base = store.baseURL else {
            serverVersion = "—"; serverMdnsHost = nil; return
        }
        do {
            let (data, _) = try await URLSession.shared.data(
                from: base.appendingPathComponent("api/version"))
            if let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                if let v = obj["version"] as? String { serverVersion = v }
                // Prefer the explicit canonical name the backend
                // advertises (`tabletopforge.local`), fall back to the
                // host's own `.local` if that's all the server can
                // resolve (Mac/Win Docker case where multicast is
                // trapped in the VM but the host OS publishes
                // <hostname>.local). nil-safe both directions.
                let preferred = (obj["mdnsName"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                let fallback  = (obj["mdnsHost"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                serverMdnsHost = preferred ?? fallback
                return
            }
        } catch { /* offline — fall through */ }
        serverVersion = "—"
        serverMdnsHost = nil
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

    // ── Storage (offline cache) ───────────────────────────────────
    // Mirrors the Android Storage card: shows whether a cached
    // creature is on disk + a Clear button to wipe it. The cached
    // copy is what HomeView hydrates from on cold launch when the
    // device is offline or the live REST fetch is still in flight.
    @ViewBuilder
    private var storageSection: some View {
        Section("Storage") {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cached character")
                        .font(.body.weight(.semibold))
                    Text(store.cachedCreatureJson != nil
                         ? "Last fetched copy is stored on device — used when offline."
                         : "No cached copy yet.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Clear") {
                    store.clearCachedCreature()
                }
                .disabled(store.cachedCreatureJson == nil)
            }
        }
    }

    // ── Sessions ──────────────────────────────────────────────────────
    // Switch between previously-used sessions on this device, or
    // start a fresh login. Always visible — even with one row in
    // the list ("Add Another Session" is the new-login entry-point
    // and the user shouldn't have to rummage to find it).
    @ViewBuilder
    private var sessionsSection: some View {
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
// adding a separate WebView.swift to the Xcode project. Watches the
// URL fragment via a Coordinator + WKNavigationDelegate so the
// in-form Cancel / Update buttons can dismiss the host sheet.
//
// This is a UIViewControllerRepresentable — NOT a plain
// UIViewRepresentable — on purpose. The stat block editor exposes an
// <input type=file> for the character portrait; tapping it makes
// WebKit present a photo-library / camera picker. WebKit presents
// that picker from the nearest UIViewController in the web view's
// responder chain. If the bare WKWebView is handed straight to a
// UIViewRepresentable, that nearest controller is the SwiftUI
// sheet's own UIHostingController — so dismissing the picker tears
// the whole Edit Stat Block sheet down with it, discarding every
// unsaved edit. Hosting the web view inside a dedicated
// WebViewController gives the picker its own stable presentation
// context: cancelling the picker now returns to the editor intact.
fileprivate struct WebView: UIViewControllerRepresentable {
    let url: URL
    let onDone: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onDone: onDone) }

    func makeUIViewController(context: Context) -> WebViewController {
        let controller = WebViewController()
        controller.webView.navigationDelegate = context.coordinator
        controller.webView.load(URLRequest(url: url))
        return controller
    }

    func updateUIViewController(_ controller: WebViewController, context: Context) {
        // Only reload when the host hands us a different URL —
        // hash-only mutations (the dismiss sentinel) shouldn't
        // bounce us back to the start of the editor.
        if (controller.webView.url?.absoluteString.split(separator: "#").first ?? "")
           != (url.absoluteString.split(separator: "#").first ?? "") {
            controller.webView.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let onDone: () -> Void
        init(onDone: @escaping () -> Void) { self.onDone = onDone }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // The CharacterEditor route flips window.location.hash
            // on Cancel / Update — match `tabletopforge-saved` or
            // `tabletopforge-cancel` and dismiss the sheet.
            let frag = navigationAction.request.url?.fragment ?? ""
            if frag.hasPrefix("tabletopforge-") {
                decisionHandler(.cancel)
                DispatchQueue.main.async { self.onDone() }
                return
            }
            decisionHandler(.allow)
        }
    }
}

// Plain UIKit controller whose root view *is* the WKWebView. Exists
// solely to be the presentation context for WebKit's file-upload
// picker — see the note on `WebView` above for why that matters.
fileprivate final class WebViewController: UIViewController {
    let webView: WKWebView = {
        let webView = WKWebView(frame: .zero)
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }()

    override func loadView() {
        view = webView
    }
}

import SwiftUI
import UIKit

// LoginView — first screen the user sees on launch (and after Logout).
// Three fields persisted between launches via SessionStore. Hitting
// Connect spins up the socket; on session_joined the parent view swaps
// to HomeView.
//
// Visual: dark gradient background, centered hero with the crossed-
// hammers app mark, a tinted-glass card holding the three fields, and
// a large gold Connect button. Mirror lives at
// android/.../ui/LoginScreen.kt.
struct LoginView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var serverUrl: String = ""
    @State private var sessionCode: String = ""
    @State private var playerName: String = ""
    @FocusState private var focusedField: Field?

    private enum Field { case server, session, name }

    var body: some View {
        ZStack {
            backdrop
            GeometryReader { geo in
                ScrollView {
                    VStack(spacing: 22) {
                        Spacer().frame(height: 24)
                        hero
                            .padding(.bottom, 4)
                        formCard
                        if let err = store.lastError, !err.isEmpty {
                            errorBanner(err)
                        }
                        connectButton
                            .padding(.top, 4)
                        footer
                            .padding(.top, 8)
                    }
                    .padding(.horizontal, 24)
                    .frame(minHeight: geo.size.height)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            serverUrl   = store.serverUrl
            sessionCode = store.sessionCode
            playerName  = store.playerName
        }
    }

    // ── Backdrop ──────────────────────────────────────────────────────
    private var backdrop: some View {
        ZStack {
            // Deep navy → near-black diagonal gradient.
            LinearGradient(
                colors: [Color(red: 0.07, green: 0.09, blue: 0.13),
                         Color(red: 0.02, green: 0.03, blue: 0.05)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            // Soft gold radial glow behind the hero so the logo "lifts"
            // off the page without needing a hard ring.
            RadialGradient(
                colors: [Color.yellow.opacity(0.18), .clear],
                center: .init(x: 0.5, y: 0.18),
                startRadius: 0, endRadius: 280
            )
        }
        .ignoresSafeArea()
    }

    // ── Hero (icon + title + tagline) ─────────────────────────────────
    private var hero: some View {
        VStack(spacing: 10) {
            // Same crossed-hammers art the home-screen icon ships,
            // pulled from Assets.xcassets/AppMark so a future icon
            // change cascades to the login screen automatically.
            // The thin gold ring + radial glow on the backdrop give
            // the mark the same "lifted" feel the previous SwiftUI-
            // drawn version had, without the parallel codepath.
            Image("AppMark")
                .resizable()
                .interpolation(.high)
                .aspectRatio(contentMode: .fit)
                .frame(width: 96, height: 96)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.yellow.opacity(0.45), lineWidth: 1.2)
                )
                .shadow(color: Color.yellow.opacity(0.18), radius: 18, y: 4)
            Text("TableTop Forge")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
            Text("Sign in to your campaign")
                .font(.callout)
                .foregroundStyle(.white.opacity(0.55))
        }
    }

    // ── Form ──────────────────────────────────────────────────────────
    private var formCard: some View {
        VStack(spacing: 14) {
            FieldRow(
                icon: "globe",
                placeholder: "https://your-server",
                text: $serverUrl,
                keyboard: .URL,
                autocap: .never,
                isFocused: focusedField == .server
            )
            .focused($focusedField, equals: .server)
            .onSubmit { focusedField = .session }
            .submitLabel(.next)

            FieldRow(
                icon: "key.fill",
                placeholder: "Session code",
                text: $sessionCode,
                autocap: .characters,
                monospaced: true,
                isFocused: focusedField == .session
            )
            .focused($focusedField, equals: .session)
            .onSubmit { focusedField = .name }
            .submitLabel(.next)

            FieldRow(
                icon: "person.fill",
                placeholder: "Player name",
                text: $playerName,
                autocap: .words,
                isFocused: focusedField == .name
            )
            .focused($focusedField, equals: .name)
            .onSubmit {
                focusedField = nil
                if isValid { connect() }
            }
            .submitLabel(.go)
        }
        .padding(16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private func errorBanner(_ msg: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(msg)
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.leading)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(Color.red.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.red.opacity(0.35), lineWidth: 1))
    }

    // ── Connect button ────────────────────────────────────────────────
    private var connectButton: some View {
        Button {
            focusedField = nil
            connect()
        } label: {
            HStack(spacing: 10) {
                if socket.connectionStatus == .connecting {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.black)
                    Text("Connecting…")
                } else {
                    Image(systemName: "arrow.right.circle.fill")
                    Text("Join Session")
                }
            }
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(.black)
            .background(
                LinearGradient(
                    colors: [Color.yellow, Color(red: 0.95, green: 0.74, blue: 0.16)],
                    startPoint: .leading, endPoint: .trailing
                ),
                in: RoundedRectangle(cornerRadius: 14)
            )
            .opacity(isValid && socket.connectionStatus != .connecting ? 1.0 : 0.55)
            .shadow(color: .yellow.opacity(0.35), radius: 12, y: 4)
        }
        .buttonStyle(.plain)
        .disabled(!isValid || socket.connectionStatus == .connecting)
    }

    private var footer: some View {
        Text("Your campaign details are remembered between launches.")
            .font(.caption2)
            .foregroundStyle(.white.opacity(0.45))
            .multilineTextAlignment(.center)
    }

    // ── Logic ─────────────────────────────────────────────────────────

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

    // Accept "192.168.50.131", "forge.example.com", or a full URL.
    // Public hostnames default to https (the App Store build's ATS
    // posture only allows http for local IPs / .local domains, so a
    // bare http://forge.example.com would silently fail in release
    // builds). IP literals + .local hostnames default to http for
    // LAN-only deployments.
    private func normaliseUrl(_ raw: String) -> String {
        if raw.hasPrefix("http://") || raw.hasPrefix("https://") { return raw }
        // Strip any leading slashes the user may have typed.
        let host = raw.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let isIP = host.split(separator: ":").first.map { piece in
            piece.split(separator: ".")
                .allSatisfy { Int($0) != nil }
        } ?? false
        let isMDNS = host.lowercased().hasSuffix(".local")
        return ((isIP || isMDNS) ? "http://" : "https://") + raw
    }
}

// One field row used by all three inputs — leading SF symbol icon, then
// the TextField; the row ring tightens up to gold when focused.
private struct FieldRow: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var autocap: TextInputAutocapitalization = .sentences
    var monospaced: Bool = false
    var isFocused: Bool = false

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.callout)
                .foregroundStyle(.yellow.opacity(0.9))
                .frame(width: 22)
            // Custom prompt with an explicit higher-contrast color
            // so the placeholder reads against the dark glass card.
            // Default SwiftUI placeholder is far too dim against
            // ultraThinMaterial.
            TextField(
                "",
                text: $text,
                prompt: Text(placeholder).foregroundStyle(.white.opacity(0.55))
            )
                .textInputAutocapitalization(autocap)
                .keyboardType(keyboard)
                .autocorrectionDisabled()
                .font(monospaced ? .system(.body, design: .monospaced).weight(.medium)
                                 : .body.weight(.medium))
                .foregroundStyle(.white)
                .tint(.yellow)
        }
        .padding(.horizontal, 12).padding(.vertical, 12)
        // Bumped from 0.04 → 0.14 so the field reads as a real
        // panel against the frosted card instead of a hairline.
        .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isFocused ? Color.yellow.opacity(0.6)
                                  : Color.white.opacity(0.18),
                        lineWidth: isFocused ? 1.4 : 1)
                .animation(.easeInOut(duration: 0.18), value: isFocused)
        )
    }
}

// Crossed-hammers mark — vector copy of the icon-options/1 SVG so it
// renders at any size without needing a raster asset bundled in.
private struct CrossedHammersMark: View {
    var body: some View {
        GeometryReader { geo in
            let s = min(geo.size.width, geo.size.height)
            ZStack {
                ForEach([true, false], id: \.self) { mirrored in
                    Hammer()
                        .fill(LinearGradient(
                            colors: [Color.yellow, Color(red: 0.95, green: 0.74, blue: 0.16)],
                            startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: s, height: s)
                        .scaleEffect(x: mirrored ? -1 : 1, y: 1)
                }
            }
        }
    }
}

private struct Hammer: Shape {
    func path(in rect: CGRect) -> Path {
        // Stylised hammer pointing diagonally up-right. Two crossed
        // copies (the second mirrored on X) form the app mark.
        var p = Path()
        let r = min(rect.width, rect.height)
        let head = CGRect(x: r * 0.55, y: r * 0.05, width: r * 0.40, height: r * 0.20)
        p.addRoundedRect(in: head, cornerSize: CGSize(width: r * 0.04, height: r * 0.04))
        // Handle: thick line from upper-right head to lower-left.
        p.move(to: CGPoint(x: r * 0.62, y: r * 0.27))
        p.addLine(to: CGPoint(x: r * 0.20, y: r * 0.85))
        p.addLine(to: CGPoint(x: r * 0.10, y: r * 0.95))
        p.addLine(to: CGPoint(x: r * 0.18, y: r * 0.78))
        p.addLine(to: CGPoint(x: r * 0.55, y: r * 0.32))
        p.closeSubpath()
        return p
    }
}

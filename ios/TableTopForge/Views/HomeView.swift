import SwiftUI

// HomeView — the post-login tab bar. Four tabs per the spec; no Map
// tab (the TV/spectator is the only map surface). A toolbar gear in
// each tab opens the Settings sheet which carries the Logout button.
struct HomeView: View {
    let store: SessionStore
    let socket: SocketClient

    // Whisper popup — when a whisper arrives, store it here and the
    // .sheet below pops it up over whichever tab the player is on. The
    // tab UI keeps running underneath so messages don't interrupt
    // anything stateful, but the sheet is visually loud (medium-detent
    // + envelope icon + purple branding) so it's hard to miss. New
    // whispers while one is displayed REPLACE the current one — the
    // newest is always what the player sees.
    @State private var popupWhisper: WhisperLine? = nil
    // Same pattern as whispers: when an NPC speaks (filtered to ones
    // aimed at this player), pop a sheet with the speaker name + line.
    // Untranslated lines come pre-scrambled by the SocketClient so
    // this view stays oblivious to language logic.
    @State private var popupNpcSay: NpcSay? = nil

    // Surface the result of the .task creature fetch so silent
    // decoding/network failures don't leave StatsView blank with no
    // explanation. When non-nil, we render a small banner at the top
    // of HomeView with the message + URL we tried.
    @State private var fetchDiag: String? = nil

    // Creature_id sourced from the matched token, falling back to the
    // value we stored on previous logins. Drives the .task below that
    // populates socket.creature for every tab — without it the light
    // filter / spells / inventory all read an empty list because
    // socket.creature is nil until StatsView's local task runs.
    private var creatureId: Int? {
        socket.tokens.first(where: { $0.id == socket.playerTokenId })?.creature_id
            ?? store.lastCreatureId
    }

    // Compound key: the .task fires both when the player adopts a
    // different token (id changes) AND when the server signals the
    // sheet was edited GM-side (refresh tick bumped). Either way we
    // pull a fresh REST creature row.
    private struct RefreshKey: Equatable, Hashable {
        let cid: Int?
        let tick: Int
    }
    private var refreshKey: RefreshKey {
        RefreshKey(cid: creatureId, tick: socket.requestCreatureRefresh)
    }

    var body: some View {
        TabView {
            StatsView(store: store, socket: socket)
                .tabItem { Label("Stats", systemImage: "heart.fill") }

            AbilitiesView(store: store, socket: socket)
                .tabItem { Label("Skills", systemImage: "figure.run") }

            SpellsView(store: store, socket: socket)
                .tabItem { Label("Spells", systemImage: "sparkles") }

            InventoryView(store: store, socket: socket)
                .tabItem { Label("Inventory", systemImage: "bag.fill") }

            DiceLightView(store: store, socket: socket)
                .tabItem { Label("Dice & Settings", systemImage: "dice.fill") }
        }
        .task(id: refreshKey) {
            guard let cid = creatureId else {
                fetchDiag = "No creature id resolved (token=\(socket.playerTokenId.map(String.init) ?? "—"), tokens=\(socket.tokens.count), lastId=\(store.lastCreatureId.map(String.init) ?? "—"))"
                return
            }
            guard let base = store.baseURL else {
                fetchDiag = "Base URL is empty — check the Server field on login."
                return
            }
            fetchDiag = nil
            do {
                socket.creature = try await APIClient(baseURL: base).fetchCreature(id: cid)
                store.lastCreatureId = cid
                store.persist()
            } catch {
                fetchDiag = "GET \(base.absoluteString)/api/creatures/\(cid) failed: \(error)"
            }
        }
        // Connection health banner — shown above the tab content when
        // the socket isn't healthy. Tap-to-dismiss isn't useful here
        // because the banner is purely informational.
        .overlay(alignment: .top) {
            VStack(spacing: 4) {
                connectionBanner
                if let diag = fetchDiag, socket.creature == nil {
                    Text(diag)
                        .font(.caption2.monospaced())
                        .foregroundStyle(.white)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.red.opacity(0.85))
                        .padding(.horizontal, 4)
                }
            }
        }
        // Whisper popup driver — fires the moment socket.whispers
        // grows. Only watching the count keeps this cheap; we always
        // show the latest entry regardless of which one triggered it.
        .onChange(of: socket.whispers.count) { _, _ in
            guard let latest = socket.whispers.last else { return }
            popupWhisper = latest
            // Haptic punch so the phone gets the player's attention
            // even if they're looking at the laptop / dice / each
            // other rather than the screen.
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        }
        .sheet(item: $popupWhisper) { whisper in
            WhisperPopupSheet(whisper: whisper, onDismiss: { popupWhisper = nil })
        }
        .onChange(of: socket.npcSays.count) { _, _ in
            guard let latest = socket.npcSays.last else { return }
            popupNpcSay = latest
            // Lighter haptic than whispers — NPC chatter is a more
            // common, less critical event than a private GM whisper.
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
        .sheet(item: $popupNpcSay) { say in
            NpcSayPopupSheet(say: say, onDismiss: { popupNpcSay = nil })
        }
    }

    @ViewBuilder
    private var connectionBanner: some View {
        switch socket.connectionStatus {
        case .reconnecting:
            BannerLabel(text: "Reconnecting…", color: .orange)
        case .disconnected:
            BannerLabel(text: "Disconnected", color: .red)
        case .failed:
            BannerLabel(text: "Connection failed", color: .red)
        default:
            EmptyView()
        }
    }
}

private struct BannerLabel: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(color, in: Capsule())
            .padding(.top, 4)
    }
}

// NpcSayPopupSheet — same modal pattern as WhisperPopupSheet but
// styled for ambient NPC chatter rather than private GM-to-player
// communication. Speaker name is prominent; understood lines render
// in plain dialogue style, untranslated lines render in italicised
// monospace and surface a "you don't recognise this language" caption
// instead of pretending to be the actual word.
private struct NpcSayPopupSheet: View {
    let say: NpcSay
    let onDismiss: () -> Void

    var body: some View {
        // Single ScrollView wrapping the upper content lets short
        // messages sit tight (no stretched box) while still letting
        // a long monologue grow past the medium detent. The Spacer
        // before the button is what pushes Dismiss to the bottom of
        // the sheet without inflating the dialogue card.
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 14) {
                    Image(systemName: say.understood ? "person.wave.2.fill" : "questionmark.bubble.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(say.understood ? .teal : .indigo)

                    Text(say.speaker)
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(.primary)

                    // Understood lines use a normal serif title3;
                    // untranslated stays italic monospace so it reads
                    // as "noises you can't parse".
                    Text(say.understood
                         ? "\u{201C}\(say.displayText)\u{201D}"
                         : say.displayText)
                        .font(say.understood
                              ? .title3
                              : .system(.title3, design: .monospaced).italic())
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.primary)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(
                            (say.understood ? Color.teal : Color.indigo).opacity(0.08),
                            in: RoundedRectangle(cornerRadius: 14)
                        )

                    // Caption row — language only when understood, so
                    // an untranslated line never reveals which tongue
                    // was spoken.
                    if say.understood {
                        Text("(\(say.langSlug.replacingOccurrences(of: "-", with: " ").capitalized))")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    } else {
                        Text("You don't recognise this language.")
                            .font(.caption.italic())
                            .foregroundStyle(.secondary)
                    }

                    Text(say.ts, style: .time)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal)
                .padding(.top, 16)
            }

            Spacer(minLength: 0)

            Button {
                onDismiss()
            } label: {
                Text("Dismiss").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(say.understood ? .teal : .indigo)
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// WhisperPopupSheet — modal-style takeover that surfaces a GM whisper
// loud and clear. Centered envelope icon + "GM whispers to you" title
// + the message in scroll-when-long body type + a single big Dismiss
// button. Sheet detents are [.medium, .large] so a long whisper can
// be expanded to full height by the player; short ones stay compact.
private struct WhisperPopupSheet: View {
    let whisper: WhisperLine
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Spacer(minLength: 8)

            Image(systemName: "envelope.fill")
                .font(.system(size: 56))
                .foregroundStyle(.purple)

            Text("GM whispers to you")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.purple)

            // Long whispers shouldn't get crammed; ScrollView keeps
            // the message readable even if it overflows the medium
            // detent. The wrapping background reads as a "card".
            ScrollView {
                Text(whisper.message)
                    .font(.title3)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.primary)
                    .padding()
            }
            .background(.purple.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal)

            Text(whisper.ts, style: .time)
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer(minLength: 8)

            Button {
                onDismiss()
            } label: {
                Text("Dismiss")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(.purple)
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
        .padding(.top, 12)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

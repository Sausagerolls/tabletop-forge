import SwiftUI

// CharacterPickerView — shown after session_joined when the player
// doesn't already have a token in the session AND we don't have a
// stored creatureId to spawn one with. Mirrors the web's
// CharacterSetup step 2: fetch every character whose player_owner
// matches the player's name, list them with portraits + HP/AC, tap
// to use.
//
// New-character creation goes through the web app for now — porting
// the full CreatureForm to SwiftUI is a substantial chunk of UI on
// its own and not worth blocking the iOS rollout for.
struct CharacterPickerView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var characters: [Creature] = []
    @State private var loading = true
    @State private var error: String? = nil

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading characters…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = error {
                    ContentUnavailableView(
                        "Couldn't load characters",
                        systemImage: "exclamationmark.triangle",
                        description: Text(err)
                    )
                } else if characters.isEmpty {
                    ContentUnavailableView(
                        "No characters yet",
                        systemImage: "person.crop.circle.badge.questionmark",
                        description: Text("Create a character on the web first — open the session URL in a browser, pick \(store.playerName), and build your character. Then come back here and the app will find it.")
                    )
                } else {
                    List {
                        Section {
                            ForEach(characters) { c in
                                CharacterRow(creature: c, baseURL: store.baseURL) {
                                    pick(c)
                                }
                            }
                        } header: {
                            Text("Tap a character to play as them")
                                .textCase(nil)
                        } footer: {
                            Text("New characters can be created in the web app and will appear here automatically.")
                        }
                    }
                }
            }
            .navigationTitle("Choose Character")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        socket.disconnect()
                        store.loggedIn = false
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await load() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        guard let base = store.baseURL else { return }
        loading = true
        error = nil
        defer { loading = false }
        // Same endpoint the web's CharacterSetup uses: filter to player
        // characters owned by this player name.
        var components = URLComponents(url: base.appendingPathComponent("api/creatures"),
                                       resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "filter", value: "characters"),
            URLQueryItem(name: "player_owner", value: store.playerName),
        ]
        guard let url = components.url else { error = "Bad URL"; return }
        do {
            let (data, resp) = try await URLSession.shared.data(from: url)
            try APIClient.checkOk(resp, data: data)
            characters = try JSONDecoder().decode([Creature].self, from: data)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func pick(_ creature: Creature) {
        // Persist so a future relaunch goes straight in without the
        // picker (assuming the token still exists server-side).
        store.lastCreatureId = creature.id
        store.persist()
        socket.selectCharacter(creature)
    }
}

private struct CharacterRow: View {
    let creature: Creature
    let baseURL: URL?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                portrait
                    .frame(width: 52, height: 52)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(.tint.opacity(0.4), lineWidth: 1))
                VStack(alignment: .leading, spacing: 3) {
                    Text(creature.name ?? "(unnamed)")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.primary)
                    HStack(spacing: 8) {
                        if let lvl = creature.char_level, lvl > 0 {
                            Text("Lv \(lvl)").font(.caption).foregroundStyle(.secondary)
                        }
                        if let type = creature.creature_type, !type.isEmpty {
                            Text(type).font(.caption).foregroundStyle(.secondary)
                        }
                        if let hp = creature.hit_points {
                            Text("HP \(hp)")
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                        if let ac = creature.armor_class {
                            Text("AC \(ac)")
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.tertiary)
                    .font(.caption)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var portrait: some View {
        if let path = creature.image_path,
           let base = baseURL,
           let url = URL(string: "\(base.absoluteString)/uploads/\(path)") {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                default: placeholder
                }
            }
        } else {
            placeholder
        }
    }
    private var placeholder: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable()
            .scaledToFit()
            .foregroundStyle(.tint.opacity(0.5))
    }
}

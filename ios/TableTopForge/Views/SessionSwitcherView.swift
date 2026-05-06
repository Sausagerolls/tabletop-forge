import SwiftUI

// SessionSwitcherView — modal list of every previously-used session
// on this device. Surfaced from two places:
//
//   1. SettingsSheet → "Switch Session"  — the user is currently
//      connected and wants to swap to a different campaign.
//   2. LoginView → "Switch Session"      — auto-rejoin failed (or
//      they just want to bypass the typed-in fallback) and want
//      to pick from their existing logins.
//
// Tapping a row swaps the active session over and reconnects the
// socket. Swipe-to-delete (or the trailing "Forget" button) drops
// the row from the list. "Add Another Session" closes the sheet
// and surfaces the typing form.
struct SessionSwitcherView: View {
    let store: SessionStore
    let socket: SocketClient
    @Binding var isPresented: Bool
    /// Called when the user picks "Add Another Session" — the parent
    /// is responsible for showing the LoginView form / fields. We
    /// only know how to dismiss ourselves.
    let onAddNew: () -> Void

    var body: some View {
        NavigationStack {
            Group {
                if store.savedSessions.isEmpty {
                    ContentUnavailableView(
                        "No remembered sessions",
                        systemImage: "person.crop.circle.badge.questionmark",
                        description: Text("Log into a session and we'll keep it here for next time."),
                    )
                } else {
                    List {
                        Section("Player Characters") {
                            ForEach(store.savedSessionsByRecency) { row in
                                SwitcherRow(entry: row, baseURL: URL(string: row.serverUrl)) {
                                    pick(row)
                                }
                            }
                            .onDelete(perform: deleteAt)
                        }
                    }
                }
            }
            .navigationTitle("Switch Session")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isPresented = false
                        onAddNew()
                    } label: {
                        Label("Add", systemImage: "plus")
                    }
                }
            }
        }
    }

    private func pick(_ entry: SavedSession) {
        // Drop any live socket first so the new connect doesn't
        // collide with the old session_joined handler.
        socket.disconnect()
        store.adopt(entry)
        store.connecting = true
        socket.connect(
            serverUrl: entry.serverUrl,
            sessionCode: entry.sessionCode,
            playerName: entry.playerName,
            creatureId: entry.creatureId,
        )
        isPresented = false
    }

    private func deleteAt(_ indexSet: IndexSet) {
        let rows = store.savedSessionsByRecency
        for idx in indexSet {
            guard idx < rows.count else { continue }
            store.forget(sessionId: rows[idx].id)
        }
    }
}

private struct SwitcherRow: View {
    let entry: SavedSession
    let baseURL: URL?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                portrait
                    .frame(width: 48, height: 48)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(.tint.opacity(0.4), lineWidth: 1))
                VStack(alignment: .leading, spacing: 3) {
                    Text(entry.creatureName ?? entry.playerName)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("\(entry.playerName) • \(entry.sessionCode)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.tertiary)
                    .font(.caption)
            }
            .padding(.vertical, 2)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var portrait: some View {
        if let path = entry.creatureImagePath, !path.isEmpty,
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

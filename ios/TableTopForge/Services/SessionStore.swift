import Foundation
import SwiftUI

// SessionStore — persistence + auth state for the app.
//
// Stored values use UserDefaults with the same keys we'll use on the
// Android port (SharedPreferences) so behaviour stays identical across
// platforms. Auth model is trust-by-name: no per-player password, no
// token, just (serverUrl, sessionCode, playerName).
//
// As of v1.10.x the store also keeps a list of previously-used
// (server, code, name, character) tuples — `savedSessions` — so the
// app can auto-rejoin the most recent on launch and let the user
// pick a different one from Settings → Switch Session. The single
// "active" set of fields above is whichever entry is currently live.

/// One past login. Mobile platforms have no GM role so type is
/// implicitly "player"; the iOS Settings + Android Settings UI
/// list these and let the user pick one to rejoin.
struct SavedSession: Codable, Identifiable, Hashable {
    var id: String
    var serverUrl: String
    var sessionCode: String
    var playerName: String
    var creatureId: Int?
    var creatureName: String?
    var creatureImagePath: String?
    var lastUsedAt: TimeInterval
}

@Observable
final class SessionStore {
    // Keys — keep these aligned with the Android port. See
    // memory/native_app_spec.md for the canonical list.
    enum Keys {
        static let serverUrl     = "vtt.serverUrl"
        static let sessionCode   = "vtt.sessionCode"
        static let playerName    = "vtt.playerName"
        static let lastCreatureId = "vtt.lastCreatureId"
        // Offline cache — last successful Creature JSON. Read on
        // launch so the player tabs render instantly with stale
        // data instead of flashing "Loading character…" for the
        // duration of the live REST fetch. Mirrors the Android
        // SessionStore key.
        static let cachedCreature = "vtt.cachedCreature"
        // JSON-encoded [SavedSession]. Sorted most-recent-first when
        // surfaced via savedSessions. Wiped by forgetAll() but not
        // by logout (logout drops only the active session — see
        // forgetActive() for "log out and forget").
        static let savedSessions  = "vtt.savedSessions"
    }

    var serverUrl: String
    var sessionCode: String
    var playerName: String
    var lastCreatureId: Int?
    /// Raw JSON of the last Creature successfully fetched from the
    /// server. Persisted across launches so the app can hydrate
    /// state instantly + show a usable sheet when the device is
    /// offline.
    var cachedCreatureJson: String?
    /// All past logins on this device. Drives the LoginView fast-
    /// path (auto-connect to the most recent) and the Settings
    /// switcher.
    var savedSessions: [SavedSession]

    // Login completes when we get session_joined back from the server;
    // until then we're either on the Login screen (loggedIn=false) or
    // showing a "Connecting…" splash (connecting=true).
    var loggedIn: Bool = false
    var connecting: Bool = false
    var lastError: String? = nil

    init() {
        let defaults = UserDefaults.standard
        self.serverUrl   = defaults.string(forKey: Keys.serverUrl)   ?? ""
        self.sessionCode = defaults.string(forKey: Keys.sessionCode) ?? ""
        self.playerName  = defaults.string(forKey: Keys.playerName)  ?? ""
        let storedCreature = defaults.integer(forKey: Keys.lastCreatureId)
        self.lastCreatureId = storedCreature > 0 ? storedCreature : nil
        self.cachedCreatureJson = defaults.string(forKey: Keys.cachedCreature)
        self.savedSessions = Self.loadSavedSessions(from: defaults)
        // Migration: older builds shipped only the active fields. If
        // the user upgrades into the switcher with a populated active
        // session but no entry in savedSessions, fold the live values
        // in so they don't lose their existing rejoin path.
        if savedSessions.isEmpty,
           !sessionCode.isEmpty, !playerName.isEmpty {
            let migrated = SavedSession(
                id: UUID().uuidString,
                serverUrl: serverUrl,
                sessionCode: sessionCode,
                playerName: playerName,
                creatureId: lastCreatureId,
                creatureName: nil,
                creatureImagePath: nil,
                lastUsedAt: Date().timeIntervalSince1970,
            )
            savedSessions = [migrated]
            persistSavedSessions()
        }
    }

    func persist() {
        let d = UserDefaults.standard
        d.set(serverUrl,   forKey: Keys.serverUrl)
        d.set(sessionCode, forKey: Keys.sessionCode)
        d.set(playerName,  forKey: Keys.playerName)
        if let id = lastCreatureId {
            d.set(id, forKey: Keys.lastCreatureId)
        } else {
            d.removeObject(forKey: Keys.lastCreatureId)
        }
    }

    /// Stash the JSON returned by the most recent successful
    /// `GET /api/creatures/<id>` so a subsequent cold launch can
    /// hydrate the tabs without waiting for the live fetch.
    func cacheCreatureJson(_ json: String) {
        cachedCreatureJson = json
        UserDefaults.standard.set(json, forKey: Keys.cachedCreature)
    }

    /// Wipe the persisted creature JSON. Surfaced from the
    /// Storage section in Dice & Settings.
    func clearCachedCreature() {
        cachedCreatureJson = nil
        UserDefaults.standard.removeObject(forKey: Keys.cachedCreature)
    }

    /// Clear the *active* session fields without touching the
    /// savedSessions list — used when the user wants to switch but
    /// keep the row available for next time. Old `logout()` callers
    /// that want the full nuke should call `forgetActive()` instead.
    func clearActive() {
        let d = UserDefaults.standard
        d.removeObject(forKey: Keys.serverUrl)
        d.removeObject(forKey: Keys.sessionCode)
        d.removeObject(forKey: Keys.playerName)
        d.removeObject(forKey: Keys.lastCreatureId)
        d.removeObject(forKey: Keys.cachedCreature)
        serverUrl = ""
        sessionCode = ""
        playerName = ""
        lastCreatureId = nil
        cachedCreatureJson = nil
        loggedIn = false
        lastError = nil
    }

    /// Backwards-compatible "log out" — drops the active fields and
    /// removes any matching entry from savedSessions so the user
    /// won't be auto-rejoined into it.
    func logout() {
        forgetActive()
    }

    /// Drop the active session both from the live fields and from
    /// the saved-sessions list (so the next launch picks a different
    /// row, or shows the LoginView if the list is empty).
    func forgetActive() {
        let id = activeSessionId()
        clearActive()
        if let id { savedSessions.removeAll { $0.id == id } }
        persistSavedSessions()
    }

    // Derived URL for REST calls. Falls back to a junk URL if the user
    // hasn't logged in yet — callers should gate on loggedIn instead.
    var baseURL: URL? {
        guard !serverUrl.isEmpty, let u = URL(string: serverUrl) else { return nil }
        return u
    }

    // ── Saved sessions ────────────────────────────────────────────

    /// Insert or refresh the saved-session row for the live
    /// (server, code, name) tuple. Called after a successful
    /// session_joined + creature fetch so the row carries the
    /// character name + portrait the switcher renders.
    func rememberCurrent(creatureId: Int?, creatureName: String?, creatureImagePath: String?) {
        guard !sessionCode.isEmpty, !playerName.isEmpty else { return }
        let now = Date().timeIntervalSince1970
        let idx = savedSessions.firstIndex {
            $0.serverUrl == serverUrl &&
            $0.sessionCode == sessionCode &&
            $0.playerName == playerName &&
            ($0.creatureId ?? -1) == (creatureId ?? -1)
        }
        if let idx {
            var row = savedSessions[idx]
            row.creatureName      = creatureName ?? row.creatureName
            row.creatureImagePath = creatureImagePath ?? row.creatureImagePath
            row.lastUsedAt        = now
            savedSessions[idx]    = row
        } else {
            savedSessions.append(SavedSession(
                id: UUID().uuidString,
                serverUrl: serverUrl,
                sessionCode: sessionCode,
                playerName: playerName,
                creatureId: creatureId,
                creatureName: creatureName,
                creatureImagePath: creatureImagePath,
                lastUsedAt: now,
            ))
        }
        persistSavedSessions()
    }

    func forget(sessionId: String) {
        savedSessions.removeAll { $0.id == sessionId }
        persistSavedSessions()
    }

    /// Sorted most-recent-first for the UI lists.
    var savedSessionsByRecency: [SavedSession] {
        savedSessions.sorted { $0.lastUsedAt > $1.lastUsedAt }
    }

    /// Promote `entry` into the active fields. Doesn't itself open
    /// the socket — the caller does that after this returns.
    func adopt(_ entry: SavedSession) {
        serverUrl      = entry.serverUrl
        sessionCode    = entry.sessionCode
        playerName     = entry.playerName
        lastCreatureId = entry.creatureId
        lastError      = nil
        persist()
    }

    private func activeSessionId() -> String? {
        savedSessions.first {
            $0.serverUrl == serverUrl &&
            $0.sessionCode == sessionCode &&
            $0.playerName == playerName &&
            ($0.creatureId ?? -1) == (lastCreatureId ?? -1)
        }?.id
    }

    private static func loadSavedSessions(from d: UserDefaults) -> [SavedSession] {
        guard let raw = d.string(forKey: Keys.savedSessions),
              let data = raw.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([SavedSession].self, from: data)) ?? []
    }

    private func persistSavedSessions() {
        let d = UserDefaults.standard
        if let data = try? JSONEncoder().encode(savedSessions),
           let raw = String(data: data, encoding: .utf8) {
            d.set(raw, forKey: Keys.savedSessions)
        }
    }
}

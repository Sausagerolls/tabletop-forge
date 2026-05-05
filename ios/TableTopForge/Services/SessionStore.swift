import Foundation
import SwiftUI

// SessionStore — persistence + auth state for the app.
//
// Stored values use UserDefaults with the same keys we'll use on the
// Android port (SharedPreferences) so behaviour stays identical across
// platforms. Auth model is trust-by-name: no per-player password, no
// token, just (serverUrl, sessionCode, playerName).
//
// Logout clears all four keys and bounces back to the Login screen.
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

    func logout() {
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

    // Derived URL for REST calls. Falls back to a junk URL if the user
    // hasn't logged in yet — callers should gate on loggedIn instead.
    var baseURL: URL? {
        guard !serverUrl.isEmpty, let u = URL(string: serverUrl) else { return nil }
        return u
    }
}

import Foundation
import SocketIO

// SocketClient — the app's only real-time connection to the server.
// Wraps Socket.IO-Client-Swift with a small surface tailored to what
// PlayerView.jsx emits/listens for. State changes coming from the server
// land on a single @Observable session object the SwiftUI views bind to;
// outbound emits are method calls.
//
// The connection lifecycle:
//   1. Login screen calls connect(serverUrl:) — SocketManager spins up.
//   2. On 'connect', we emit 'join_session' with role=player.
//   3. Server replies with 'session_joined' carrying the full state slice.
//   4. We persist the session details, set GameState.loggedIn = true.
//   5. Subsequent broadcasts (token_moved, token_hp_changed, etc.) patch
//      the GameState in place so SwiftUI re-renders the tabs.
//
// The SocketManager.config sets reconnectAttempts(5) and reconnectWait(2)
// — the same defaults the web app uses, so behaviour matches.
@Observable
final class SocketClient {
    private var manager: SocketManager?
    private var sock: SocketIOClient?

    // Live state — the source of truth for the tabs. Mutated in place
    // when the server broadcasts updates so SwiftUI's @Observable tracks
    // each individual property.
    var session: SessionInfo? = nil
    var tokens: [Token] = []
    var creature: Creature? = nil
    var diceRolls: [DiceRollLine] = []
    var whispers: [WhisperLine] = []
    var npcSays: [NpcSay] = []
    var connectionStatus: ConnectionStatus = .disconnected
    // Tick that HomeView watches with a .task(id:) — bumped whenever
    // the server hints the creature row has changed beyond what we
    // can patch incrementally (e.g. the DM edited the sheet directly).
    // Forces a fresh REST fetch so the Stats tab picks up new spells,
    // ability score changes, etc. without the user reopening the tab.
    var requestCreatureRefresh: Int = 0

    // Picked up by the Stats tab to know which token belongs to this
    // player. Resolved on connect from one of three sources, in order:
    //   1. session_joined: match by player_name against the existing
    //      tokens already on the map. This is the common case — the
    //      player has played before, the server already has their row.
    //   2. player_token_ready: emitted by the server after we send
    //      create_player_token (when we have a lastCreatureId).
    //   3. nil: no token, prompts a setup flow we'll add later.
    var playerTokenId: Int? = nil

    // True when session_joined arrived but no existing token matched
    // the player's name AND we didn't have a stored creatureId to
    // create one with. ContentView watches this to surface the
    // character picker.
    var needsCharacterSelection: Bool = false

    // Cached for the session_joined name-match.
    private var connectPlayerName: String = ""
    // Stashed by connect() so applySessionJoined can fire
    // create_player_token with the correct sessionId once the join
    // response arrives.
    private var pendingCreatureIdOnJoin: Int? = nil

    enum ConnectionStatus { case disconnected, connecting, connected, reconnecting, failed }

    func connect(serverUrl: String, sessionCode: String, playerName: String, creatureId: Int?) {
        guard let url = URL(string: serverUrl) else {
            connectionStatus = .failed
            return
        }
        connectionStatus = .connecting
        connectPlayerName = playerName
        // forceWebsockets: skip the long-poll handshake — both the web
        // client and our server are happy to start on websockets, and
        // skipping polling avoids the few-second reconnect delay when
        // the network blips.
        let config: SocketIOClientConfiguration = [
            .compress,
            .reconnects(true),
            .reconnectAttempts(5),
            .reconnectWait(2),
            .forceWebsockets(true),
            .log(false),
        ]
        let manager = SocketManager(socketURL: url, config: config)
        let sock = manager.defaultSocket
        self.manager = manager
        self.sock = sock

        sock.on(clientEvent: .connect) { [weak self] _, _ in
            guard let self else { return }
            self.connectionStatus = .connected
            // Re-emit on every connect (including reconnects) — the
            // server treats join_session as idempotent.
            sock.emit("join_session", [
                "sessionCode": sessionCode,
                "role": "player",
                "name": playerName,
            ])
            // create_player_token requires sessionId — it isn't safe
            // to emit yet because we won't know the session id until
            // session_joined arrives. Defer that emit to the
            // session_joined handler (see applySessionJoined below).
            // Stash the desired creatureId so the deferred emit can
            // pick it up if no token matches by name.
            self.pendingCreatureIdOnJoin = creatureId
        }

        sock.on(clientEvent: .reconnectAttempt) { [weak self] _, _ in
            self?.connectionStatus = .reconnecting
        }
        sock.on(clientEvent: .disconnect) { [weak self] _, _ in
            self?.connectionStatus = .disconnected
        }
        sock.on("error") { [weak self] data, _ in
            // Server sends `{ message: "..." }`. We surface it via the
            // status enum + a one-shot error string the views can show.
            if let payload = data.first as? [String: Any], let msg = payload["message"] as? String {
                print("[socket] error: \(msg)")
            }
            self?.connectionStatus = .failed
        }

        // ── Inbound state ──────────────────────────────────────────────
        sock.on("session_joined") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any] else { return }
            self.applySessionJoined(payload)
        }

        sock.on("player_token_ready") { [weak self] data, _ in
            guard let payload = data.first as? [String: Any] else { return }
            if let tid = payload["tokenId"] as? Int { self?.playerTokenId = tid }
        }

        // Token lifecycle — the server broadcasts these for every
        // mutation. Without these listeners the iOS app's tokens array
        // gets stale the moment the DM (or another client) does
        // anything: a new token spawned, an old one removed, a
        // creature edit re-syncing the token row would all leave us
        // showing data that no longer exists. token_refreshed in
        // particular fires every time the iOS app's own
        // create_player_token completes — without the listener we
        // never see our token's enriched fields after a re-sync.
        sock.on("token_added") { [weak self] data, _ in
            guard
                let self,
                let payload = data.first as? [String: Any],
                let tokDict = payload["token"] as? [String: Any],
                let tok = self.decodeToken(tokDict)
            else { return }
            if !self.tokens.contains(where: { $0.id == tok.id }) {
                self.tokens.append(tok)
            }
        }
        sock.on("token_removed") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            self?.tokens.removeAll { $0.id == id }
            if self?.playerTokenId == id { self?.playerTokenId = nil }
        }
        sock.on("token_refreshed") { [weak self] data, _ in
            guard
                let self,
                let payload = data.first as? [String: Any],
                let tokDict = payload["token"] as? [String: Any],
                let tok = self.decodeToken(tokDict)
            else { return }
            if let idx = self.tokens.firstIndex(where: { $0.id == tok.id }) {
                self.tokens[idx] = tok
            } else {
                self.tokens.append(tok)
            }
        }

        sock.on("token_hp_changed") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            self?.patchToken(id: id) { $0.current_hp = p["currentHp"] as? Int }
        }
        sock.on("token_max_hp_changed") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            self?.patchToken(id: id) { $0.max_hp = p["maxHp"] as? Int }
        }
        sock.on("token_temp_hp_changed") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            self?.patchToken(id: id) { $0.temp_hp = p["tempHp"] as? Int }
        }
        sock.on("token_light_changed") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            self?.patchToken(id: id) { t in
                t.token_light_bright  = p["brightFt"] as? Double
                t.token_light_dim     = p["dimFt"]    as? Double
                if let c = p["color"]   as? String { t.token_light_color   = c }
                if let f = p["flicker"] as? Bool   { t.token_light_flicker = f }
            }
        }
        sock.on("token_moved") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            self?.patchToken(id: id) { t in
                t.grid_col = p["gridCol"] as? Double
                t.grid_row = p["gridRow"] as? Double
            }
        }
        sock.on("token_conditions_changed") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let id = p["tokenId"] as? Int else { return }
            // The server can send conditions as either a JSON-encoded
            // string or an array depending on the path that broadcasted
            // it; accept both shapes.
            let conds: [String] = {
                if let arr = p["conditions"] as? [String] { return arr }
                if let str = p["conditions"] as? String,
                   let data = str.data(using: .utf8),
                   let arr = try? JSONDecoder().decode([String].self, from: data) { return arr }
                return []
            }()
            self?.patchToken(id: id) { $0.conditions = conds }
        }

        sock.on("dice_rolled") { [weak self] data, _ in
            guard let payload = data.first as? [String: Any] else { return }
            // Match the server's actual broadcast shape (see
            // backend/src/index.js's roll_dice handler):
            //   { userName, role, dice, count, modifier, rolls, total, label, timestamp }
            // Compose the breakdown string from the rolls array so the
            // tab shows "[7,12] +3 = 22" style details.
            let label = payload["label"] as? String ?? ""
            let total = payload["total"] as? Int ?? 0
            let by    = payload["userName"] as? String ?? ""
            let rolls = payload["rolls"] as? [Int] ?? []
            let mod   = payload["modifier"] as? Int ?? 0
            let breakdown: String = {
                if rolls.isEmpty { return "" }
                let parts = rolls.map(String.init).joined(separator: ", ")
                let modStr = mod == 0 ? "" : (mod > 0 ? " +\(mod)" : " \(mod)")
                return "[\(parts)]\(modStr)"
            }()
            self?.diceRolls.append(DiceRollLine(label: label, total: total, breakdown: breakdown, rolledBy: by, ts: Date()))
            // Keep at most 50 rolls in memory.
            if let count = self?.diceRolls.count, count > 50 {
                self?.diceRolls.removeFirst(count - 50)
            }
        }

        sock.on("whisper_received") { [weak self] data, _ in
            guard let p = data.first as? [String: Any], let msg = p["message"] as? String else { return }
            self?.whispers.append(WhisperLine(message: msg, ts: Date()))
            NotificationManager.shared.deliver(title: "DM whispers", body: msg)
        }

        // NPC chat — the npc-chat plugin broadcasts via the generic
        // plugin_event channel. We filter to that plugin's "say"
        // payloads, drop ones targeted at a different player, decide
        // whether this character understands the language (based on
        // the loaded creature.languages string), and pre-scramble
        // gibberish locally when they don't. The popup just renders
        // displayText; it doesn't know about scrambling.
        sock.on("plugin_event") { [weak self] data, _ in
            guard
                let self,
                let frame = data.first as? [String: Any],
                (frame["pluginId"] as? String) == "npc-chat",
                (frame["type"] as? String) == "say",
                let payload = frame["payload"] as? [String: Any],
                let raw = payload["text"] as? String, !raw.isEmpty
            else { return }
            let speaker  = (payload["speaker"] as? String) ?? "NPC"
            let langSlug = (payload["langSlug"] as? String) ?? "common"
            let target   = payload["target"] as? Int
            let msgId    = (payload["msgId"] as? String) ?? "\(Date().timeIntervalSince1970)"
            // If this say is targeted, drop frames that aren't for us.
            // Untargeted (target == nil) reaches every player.
            if let t = target, t != self.playerTokenId { return }
            let knownSlugs = npcParseKnownLanguages(self.creature?.languages ?? "")
            let understood = knownSlugs.contains(langSlug)
            let display = understood ? raw : npcScramble(raw, slug: langSlug)
            let entry = NpcSay(
                id: msgId,
                speaker: speaker,
                langSlug: langSlug,
                text: raw,
                target: target,
                ts: Date(),
                understood: understood,
                displayText: display
            )
            self.npcSays.append(entry)
            // Cap memory.
            if self.npcSays.count > 50 {
                self.npcSays.removeFirst(self.npcSays.count - 50)
            }
            // Native banner — short preview only; the full text lands
            // in the popup the player sees on next foreground.
            let preview = display.count > 60 ? String(display.prefix(60)) + "…" : display
            NotificationManager.shared.deliver(title: speaker, body: preview)
        }

        // ── DM-side loot drops ────────────────────────────────────────
        // The DM's treasure tab broadcasts treasure_received with the
        // recipient creatureId and the new full inventory array. We
        // patch socket.creature in place so every tab (Inventory,
        // Stats, Dice & Light) re-renders with the new items the
        // moment the DM hits Send.
        sock.on("treasure_received") { [weak self] data, _ in
            guard
                let self,
                let payload = data.first as? [String: Any],
                let cid = payload["creatureId"] as? Int,
                self.creature?.id == cid
            else { return }
            // Decode the new inventory directly from the broadcast.
            // Fall back to the existing inventory if the payload is
            // missing or malformed so we never blank the tab on a
            // schema drift.
            if let invArr = payload["newInventory"] as? [[String: Any]],
               let invData = try? JSONSerialization.data(withJSONObject: invArr),
               let inv = try? JSONDecoder().decode([InventoryItem].self, from: invData) {
                self.creature?.inventory = inv
            }
            // Native banner so the player knows even if the app is
            // backgrounded between turns.
            let count = (payload["items"] as? [Any])?.count ?? 0
            if count > 0 {
                NotificationManager.shared.deliver(
                    title: "You received treasure",
                    body: count == 1 ? "1 new item in your inventory" : "\(count) new items in your inventory"
                )
            }
        }

        sock.on("currency_received") { [weak self] data, _ in
            guard
                let self,
                let payload = data.first as? [String: Any],
                let cid = payload["creatureId"] as? Int,
                self.creature?.id == cid
            else { return }
            // Server includes both deltas (gp/sp/cp) AND new totals
            // (newGp/newSp/newCp). Use the totals so we don't drift if
            // we missed an earlier event.
            if let newGp = payload["newGp"] as? Int { self.creature?.currency_gp = newGp }
            if let newSp = payload["newSp"] as? Int { self.creature?.currency_sp = newSp }
            if let newCp = payload["newCp"] as? Int { self.creature?.currency_cp = newCp }
            let gp = payload["gp"] as? Int ?? 0
            let sp = payload["sp"] as? Int ?? 0
            let cp = payload["cp"] as? Int ?? 0
            var parts: [String] = []
            if gp > 0 { parts.append("\(gp) gp") }
            if sp > 0 { parts.append("\(sp) sp") }
            if cp > 0 { parts.append("\(cp) cp") }
            if !parts.isEmpty {
                NotificationManager.shared.deliver(
                    title: "Currency received",
                    body: parts.joined(separator: ", ")
                )
            }
        }

        // Generic creature_updated catch-all — the DM panel emits this
        // when it pushes any creature-row patch through. Refetching is
        // simpler than trying to merge per-field, and the tabs all
        // bind to socket.creature so a clean swap re-renders the lot.
        sock.on("creature_updated") { [weak self] data, _ in
            guard
                let payload = data.first as? [String: Any],
                let cid = payload["creatureId"] as? Int,
                self?.creature?.id == cid
            else { return }
            self?.requestCreatureRefresh = (self?.requestCreatureRefresh ?? 0) &+ 1
        }

        sock.on("session_code_changed") { [weak self] _, _ in
            self?.connectionStatus = .failed
        }

        sock.connect()
    }

    func disconnect() {
        sock?.disconnect()
        sock = nil
        manager = nil
        session = nil
        tokens = []
        creature = nil
        playerTokenId = nil
        diceRolls = []
        whispers = []
        npcSays = []
        connectionStatus = .disconnected
    }

    // ── Outbound emits ────────────────────────────────────────────────
    func emitHpChange(tokenId: Int, currentHp: Int) {
        sock?.emit("update_token_hp", ["tokenId": tokenId, "currentHp": currentHp])
    }
    func emitTempHp(tokenId: Int, tempHp: Int) {
        sock?.emit("update_token_temp_hp", ["tokenId": tokenId, "tempHp": tempHp])
    }
    func emitLight(tokenId: Int, preset: LightPreset, color: String = "#fbbf24") {
        sock?.emit("set_token_light", [
            "tokenId": tokenId,
            "brightFt": preset.brightFt,
            "dimFt": preset.dimFt,
            "color": color,
            "flicker": preset.flicker,
        ])
    }
    // Used by the Inventory tab when the player taps "Light it up" on
    // a custom shed-light item — we already have all the values from
    // the inventory row, no need to round-trip through LightPreset.
    func emitRawSetTokenLight(_ dict: [String: Any]) {
        sock?.emit("set_token_light", dict)
    }
    func emitDiceRoll(_ req: DiceRollRequest) {
        // Server expects the canonical "dN" string. The original code
        // sent an integer, which made the server's dice.replace('d',…)
        // throw inside the socket handler and tear down every connection
        // in the session.
        var dict: [String: Any] = [
            "dice": "d\(req.dice)",
            "count": req.count,
            "modifier": req.modifier,
        ]
        if let label = req.label { dict["label"] = label }
        sock?.emit("roll_dice", dict)
    }

    // ── Internals ─────────────────────────────────────────────────────
    private func applySessionJoined(_ payload: [String: Any]) {
        guard let state = payload["state"] as? [String: Any] else { return }
        if let s = state["session"] as? [String: Any], let id = s["id"] as? Int {
            self.session = SessionInfo(
                id: id,
                session_code: s["session_code"] as? String,
                map_id:       s["map_id"]       as? Int,
                combat_active: s["combat_active"] as? Bool,
                combat_turn:   s["combat_turn"]   as? Int
            )
        }
        if let toks = state["tokens"] as? [[String: Any]] {
            self.tokens = toks.compactMap(decodeToken)
        }
        // Match the existing token by player_name. The server uses the
        // exact name as the join key, so this is the same lookup the
        // web app's DMView does. If the player has played before, this
        // is how we adopt their row without re-emitting create_player_token.
        if !connectPlayerName.isEmpty {
            if let mine = tokens.first(where: {
                ($0.is_player ?? false) && $0.player_name == connectPlayerName
            }) {
                if playerTokenId != mine.id { playerTokenId = mine.id }
                needsCharacterSelection = false
                // Refresh the server-side token row (creature stats,
                // image_path on the joined creature, senses, etc) by
                // re-emitting create_player_token now that we know
                // both the sessionId and the creatureId. The server's
                // existing-token branch returns player_token_ready
                // and broadcasts token_refreshed.
                if let cid = pendingCreatureIdOnJoin ?? mine.creature_id,
                   let sid = self.session?.id {
                    sock?.emit("create_player_token", [
                        "sessionId": sid,
                        "playerName": connectPlayerName,
                        "creatureId": cid,
                    ])
                }
            } else if playerTokenId == nil {
                // No token in this session. If we have a stored
                // creatureId, ask the server to spawn the row now;
                // otherwise surface the character picker so the user
                // can choose one.
                if let cid = pendingCreatureIdOnJoin, let sid = self.session?.id {
                    sock?.emit("create_player_token", [
                        "sessionId": sid,
                        "playerName": connectPlayerName,
                        "creatureId": cid,
                    ])
                } else {
                    needsCharacterSelection = true
                }
            }
        }
        pendingCreatureIdOnJoin = nil
    }

    // Called by CharacterPickerView when the player taps "Use this
    // character". Emits create_player_token with the chosen creature
    // and clears the picker flag — the server will reply with
    // player_token_ready and the home tabs take over.
    func selectCharacter(_ creature: Creature) {
        self.creature = creature
        guard let sid = self.session?.id else { return }
        sock?.emit("create_player_token", [
            "sessionId": sid,
            "playerName": connectPlayerName,
            "creatureId": creature.id,
            "maxHp": creature.hit_points ?? 20,
            "size": creature.size ?? "medium",
        ])
        needsCharacterSelection = false
    }

    private func patchToken(id: Int, mutate: (inout Token) -> Void) {
        guard let idx = tokens.firstIndex(where: { $0.id == id }) else { return }
        var t = tokens[idx]
        mutate(&t)
        tokens[idx] = t
    }

    private func decodeToken(_ dict: [String: Any]) -> Token? {
        guard let id = dict["id"] as? Int else { return nil }
        // conditions can come over the wire as either an array or a
        // JSON-encoded string (depends on which broadcast path wrote
        // it). Normalise to [String] here so the views stay simple.
        let conditions: [String] = {
            if let arr = dict["conditions"] as? [String] { return arr }
            if let str = dict["conditions"] as? String,
               let data = str.data(using: .utf8),
               let arr = try? JSONDecoder().decode([String].self, from: data) { return arr }
            return []
        }()
        return Token(
            id: id,
            name:        dict["name"]        as? String,
            nickname:    dict["nickname"]    as? String,
            player_name: dict["player_name"] as? String,
            size:        dict["size"]        as? String,
            current_hp:  dict["current_hp"]  as? Int,
            max_hp:      dict["max_hp"]      as? Int,
            temp_hp:     dict["temp_hp"]     as? Int,
            is_player:   dict["is_player"]   as? Bool,
            is_hidden:   dict["is_hidden"]   as? Bool,
            is_flying:   dict["is_flying"]   as? Bool,
            grid_col:    dict["grid_col"]    as? Double,
            grid_row:    dict["grid_row"]    as? Double,
            map_id:      dict["map_id"]      as? Int,
            creature_id: dict["creature_id"] as? Int,
            token_light_bright:  dict["token_light_bright"]  as? Double,
            token_light_dim:     dict["token_light_dim"]     as? Double,
            token_light_color:   dict["token_light_color"]   as? String,
            token_light_flicker: dict["token_light_flicker"] as? Bool,
            conditions:  conditions.isEmpty ? nil : conditions
        )
    }
}

struct DiceRollLine: Identifiable, Equatable {
    let id = UUID()
    let label: String
    let total: Int
    let breakdown: String
    let rolledBy: String
    let ts: Date
}

struct WhisperLine: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let ts: Date
}

// SocketClient — Kotlin mirror of ios/TableTopForge/Services/SocketClient.swift.
//
// Same connection lifecycle: connect → emit join_session → wait for
// session_joined → patch in-memory state on each broadcast. Outbound
// emits are method calls. State lives in MutableState<*> fields the
// UI subscribes to.
//
// When the iOS file changes, mirror here:
//  - new event → add a `socket.on(...)` block that updates state
//  - new emit  → add an outbound method
//  - new state field → add a MutableState<T> + initialize on disconnect

package com.tabletopforge.services

import android.content.Context
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import com.tabletopforge.data.AppJson
import com.tabletopforge.data.Creature
import com.tabletopforge.data.DiceRollLine
import com.tabletopforge.data.DiceRollRequest
import com.tabletopforge.data.InventoryItem
import com.tabletopforge.data.LightPreset
import com.tabletopforge.data.NpcSay
import com.tabletopforge.data.SessionInfo
import com.tabletopforge.data.Token
import com.tabletopforge.data.WhisperLine
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

enum class ConnectionStatus { Disconnected, Connecting, Connected, Reconnecting, Failed }

class SocketClient(private val ctx: Context, private val baseUrl: String) {
    private var socket: Socket? = null

    val session: MutableState<SessionInfo?>      = mutableStateOf(null)
    val tokens                                   = mutableStateListOf<Token>()
    val creature: MutableState<Creature?>        = mutableStateOf(null)
    val diceRolls                                = mutableStateListOf<DiceRollLine>()
    val whispers                                 = mutableStateListOf<WhisperLine>()
    val npcSays                                  = mutableStateListOf<NpcSay>()
    val connectionStatus: MutableState<ConnectionStatus> =
        mutableStateOf(ConnectionStatus.Disconnected)
    val joinError: MutableState<String?>         = mutableStateOf(null)

    // Bumped when the server hints the creature row changed beyond
    // what we can patch incrementally — UI watches this and refetches
    // via REST.
    val requestCreatureRefresh: MutableState<Int> = mutableStateOf(0)

    val playerTokenId: MutableState<Int?>        = mutableStateOf(null)
    val needsCharacterSelection: MutableState<Boolean> = mutableStateOf(false)

    // Combat tracking — populated by `combat_changed` (which carries
    // the ordered tokenIds) and `combat_turn_changed` (the current
    // index). When a turn change lands on the player's token we fire
    // a system notification — turning the phone into the "your turn"
    // alarm clock between rounds.
    private var combatTokenIds: List<Int> = emptyList()
    private var lastNotifiedTurn: Int = -1

    private var connectPlayerName: String = ""
    private var pendingCreatureIdOnJoin: Int? = null

    fun connect(sessionCode: String, playerName: String, creatureId: Int?) {
        joinError.value = null
        connectionStatus.value = ConnectionStatus.Connecting
        connectPlayerName = playerName
        pendingCreatureIdOnJoin = creatureId

        val opts = IO.Options().apply {
            forceNew = true
            reconnection = true
            reconnectionAttempts = 5
            reconnectionDelay = 2000
            transports = arrayOf("websocket")
        }
        val s = IO.socket(URI.create(baseUrl), opts)
        socket = s

        s.on(Socket.EVENT_CONNECT) {
            connectionStatus.value = ConnectionStatus.Connected
            val join = JSONObject().apply {
                put("sessionCode", sessionCode)
                put("role", "player")
                put("name", playerName)
            }
            s.emit("join_session", join)
        }
        s.on(Socket.EVENT_DISCONNECT) {
            connectionStatus.value = ConnectionStatus.Disconnected
        }
        s.on(Socket.EVENT_CONNECT_ERROR) {
            connectionStatus.value = ConnectionStatus.Failed
        }

        // ── Inbound state ───────────────────────────────────────────
        s.on("session_joined") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            applySessionJoined(payload)
        }
        s.on("session_join_error") { args ->
            joinError.value = (args.firstOrNull() as? JSONObject)?.optString("error", "join failed")
                ?: "join failed"
            connectionStatus.value = ConnectionStatus.Failed
        }
        s.on("player_token_ready") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            if (p.has("tokenId")) playerTokenId.value = p.optInt("tokenId")
        }

        // ── Token lifecycle ─────────────────────────────────────────
        s.on("token_added") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val tok = decodeToken(payload.optJSONObject("token") ?: return@on) ?: return@on
            if (tokens.none { it.id == tok.id }) tokens.add(tok)
        }
        s.on("token_removed") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            tokens.removeAll { it.id == id }
            if (playerTokenId.value == id) playerTokenId.value = null
        }
        s.on("token_refreshed") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val tok = decodeToken(payload.optJSONObject("token") ?: return@on) ?: return@on
            val idx = tokens.indexOfFirst { it.id == tok.id }
            if (idx >= 0) tokens[idx] = tok else tokens.add(tok)
        }
        s.on("token_hp_changed") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            patchToken(id) { it.copy(current_hp = p.optIntOrNull("currentHp")) }
        }
        s.on("token_max_hp_changed") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            patchToken(id) { it.copy(max_hp = p.optIntOrNull("maxHp")) }
        }
        s.on("token_temp_hp_changed") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            patchToken(id) { it.copy(temp_hp = p.optIntOrNull("tempHp")) }
        }
        s.on("token_light_changed") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            patchToken(id) {
                it.copy(
                    token_light_bright  = p.optDoubleOrNull("brightFt") ?: it.token_light_bright,
                    token_light_dim     = p.optDoubleOrNull("dimFt")    ?: it.token_light_dim,
                    token_light_color   = p.optString("color", null) ?: it.token_light_color,
                    token_light_flicker = if (p.has("flicker")) p.optBoolean("flicker") else it.token_light_flicker,
                )
            }
        }
        s.on("token_moved") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            patchToken(id) {
                it.copy(
                    grid_col = p.optDoubleOrNull("gridCol"),
                    grid_row = p.optDoubleOrNull("gridRow"),
                )
            }
        }
        s.on("token_conditions_changed") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val id = p.optInt("tokenId", -1)
            if (id == -1) return@on
            val conds = parseStringArray(p.opt("conditions"))
            patchToken(id) { it.copy(conditions = conds) }
        }

        // ── Dice / whisper / NPC chat ───────────────────────────────
        s.on("dice_rolled") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val label = payload.optString("label", "")
            val total = payload.optInt("total", 0)
            val by    = payload.optString("userName", "")
            val rolls = payload.optJSONArray("rolls")?.let { arr ->
                (0 until arr.length()).map { arr.optInt(it) }
            } ?: emptyList()
            val mod = payload.optInt("modifier", 0)
            val breakdown = if (rolls.isEmpty()) "" else {
                val parts = rolls.joinToString(", ")
                val modStr = if (mod == 0) "" else if (mod > 0) " +$mod" else " $mod"
                "[$parts]$modStr"
            }
            diceRolls.add(DiceRollLine(label = label, total = total, breakdown = breakdown, rolledBy = by))
            while (diceRolls.size > 50) diceRolls.removeAt(0)
        }
        s.on("whisper_received") { args ->
            val p = args.firstOrNull() as? JSONObject ?: return@on
            val msg = p.optString("message", "").takeIf { it.isNotEmpty() } ?: return@on
            whispers.add(WhisperLine(message = msg))
            Notifier.show(ctx, id = msg.hashCode(), title = "GM whispers", body = msg)
        }
        s.on("plugin_event") { args ->
            val frame = args.firstOrNull() as? JSONObject ?: return@on
            if (frame.optString("pluginId") != "npc-chat") return@on
            if (frame.optString("type") != "say") return@on
            val payload = frame.optJSONObject("payload") ?: return@on
            val raw = payload.optString("text").takeIf { it.isNotEmpty() } ?: return@on
            val speaker = payload.optString("speaker", "NPC")
            val langSlug = payload.optString("langSlug", "common")
            val target = if (payload.has("target")) payload.optInt("target") else null
            val msgId = payload.optString("msgId", System.nanoTime().toString())
            if (target != null && target != playerTokenId.value) return@on
            val knownSlugs = parseKnownLanguages(creature.value?.languages ?: "")
            val understood = knownSlugs.contains(langSlug)
            val display = if (understood) raw else scrambleText(raw, langSlug)
            npcSays.add(NpcSay(
                id = msgId, speaker = speaker, langSlug = langSlug, text = raw,
                target = target, understood = understood, displayText = display,
            ))
            while (npcSays.size > 50) npcSays.removeAt(0)
            val preview = if (display.length > 60) display.take(60) + "…" else display
            Notifier.show(ctx, id = msgId.hashCode(), title = speaker, body = preview)
        }

        // ── Treasure / currency ─────────────────────────────────────
        s.on("treasure_received") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val cid = payload.optInt("creatureId", -1)
            if (cid == -1 || creature.value?.id != cid) return@on
            val invArr = payload.optJSONArray("newInventory") ?: return@on
            val inv = runCatching {
                AppJson.decodeFromString<List<InventoryItem>>(invArr.toString())
            }.getOrNull() ?: return@on
            creature.value = creature.value?.copy(inventory = inv)
            val count = payload.optJSONArray("items")?.length() ?: 0
            if (count > 0) {
                Notifier.show(ctx, id = "treasure".hashCode() xor cid,
                    title = "You received treasure",
                    body = if (count == 1) "1 new item in your inventory"
                           else "$count new items in your inventory")
            }
        }
        s.on("currency_received") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val cid = payload.optInt("creatureId", -1)
            if (cid == -1 || creature.value?.id != cid) return@on
            val newGp = payload.optIntOrNull("newGp")
            val newSp = payload.optIntOrNull("newSp")
            val newCp = payload.optIntOrNull("newCp")
            creature.value = creature.value?.copy(
                currency_gp = newGp ?: creature.value?.currency_gp,
                currency_sp = newSp ?: creature.value?.currency_sp,
                currency_cp = newCp ?: creature.value?.currency_cp,
            )
            val parts = mutableListOf<String>()
            payload.optInt("gp", 0).takeIf { it > 0 }?.let { parts += "$it gp" }
            payload.optInt("sp", 0).takeIf { it > 0 }?.let { parts += "$it sp" }
            payload.optInt("cp", 0).takeIf { it > 0 }?.let { parts += "$it cp" }
            if (parts.isNotEmpty()) {
                Notifier.show(ctx, id = "currency".hashCode() xor cid,
                    title = "Currency received", body = parts.joinToString(", "))
            }
        }

        // ── Generic creature update — UI refetches via REST ─────────
        s.on("creature_updated") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val cid = payload.optInt("creatureId", -1)
            if (cid == -1 || creature.value?.id != cid) return@on
            requestCreatureRefresh.value = requestCreatureRefresh.value + 1
        }
        s.on("session_code_changed") {
            connectionStatus.value = ConnectionStatus.Failed
        }

        // ── Combat / initiative ─────────────────────────────────────
        s.on("combat_changed") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val arr = payload.optJSONArray("tokenIds")
            combatTokenIds = if (arr == null) emptyList() else (0 until arr.length()).map { arr.optInt(it) }
            lastNotifiedTurn = -1
        }
        s.on("combat_turn_changed") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val turn = payload.optInt("currentTurn", -1)
            if (turn < 0 || turn >= combatTokenIds.size) return@on
            if (turn == lastNotifiedTurn) return@on
            lastNotifiedTurn = turn
            val activeTok = combatTokenIds[turn]
            if (activeTok == playerTokenId.value) {
                Notifier.show(
                    ctx,
                    id = "turn".hashCode(),
                    title = "Your turn",
                    body = creature.value?.name?.let { "$it — your turn" } ?: "It's your turn",
                )
            }
        }
        s.on("tokens_added_to_combat") { args ->
            val payload = args.firstOrNull() as? JSONObject ?: return@on
            val arr = payload.optJSONArray("tokenIds") ?: return@on
            val added = (0 until arr.length()).map { arr.optInt(it) }
            combatTokenIds = combatTokenIds + added.filter { it !in combatTokenIds }
        }

        s.connect()
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        session.value = null
        tokens.clear()
        creature.value = null
        playerTokenId.value = null
        diceRolls.clear()
        whispers.clear()
        npcSays.clear()
        connectionStatus.value = ConnectionStatus.Disconnected
    }

    // ── Outbound emits ─────────────────────────────────────────────
    fun emitHpChange(tokenId: Int, currentHp: Int) {
        socket?.emit("update_token_hp",
            JSONObject().apply { put("tokenId", tokenId); put("currentHp", currentHp) })
    }
    fun emitTempHp(tokenId: Int, tempHp: Int) {
        socket?.emit("update_token_temp_hp",
            JSONObject().apply { put("tokenId", tokenId); put("tempHp", tempHp) })
    }
    fun emitLight(tokenId: Int, preset: LightPreset, color: String = "#fbbf24") {
        socket?.emit("set_token_light", JSONObject().apply {
            put("tokenId", tokenId)
            put("brightFt", preset.brightFt)
            put("dimFt", preset.dimFt)
            put("color", color)
            put("flicker", preset.flicker)
        })
    }
    fun emitRawSetTokenLight(payload: Map<String, Any?>) {
        socket?.emit("set_token_light", JSONObject(payload))
    }
    fun emitDiceRoll(req: DiceRollRequest) {
        // Server expects "dN" string, not the bare int — passing the
        // integer crashes the room's broadcast loop.
        val dict = JSONObject().apply {
            put("dice", "d${req.dice}")
            put("count", req.count)
            put("modifier", req.modifier)
            req.label?.let { put("label", it) }
        }
        socket?.emit("roll_dice", dict)
    }

    fun selectCharacter(c: Creature) {
        creature.value = c
        val sid = session.value?.id ?: return
        socket?.emit("create_player_token", JSONObject().apply {
            put("sessionId", sid)
            put("playerName", connectPlayerName)
            put("creatureId", c.id)
            put("maxHp", c.hit_points ?: 20)
            put("size", c.size ?: "medium")
        })
        needsCharacterSelection.value = false
    }

    // ── Internals ──────────────────────────────────────────────────
    private fun applySessionJoined(payload: JSONObject) {
        val state = payload.optJSONObject("state") ?: return
        state.optJSONObject("session")?.let { s ->
            val id = s.optInt("id", -1)
            if (id != -1) {
                session.value = SessionInfo(
                    id = id,
                    session_code = s.optString("session_code", null),
                    map_id = s.optIntOrNull("map_id"),
                    combat_active = if (s.has("combat_active")) s.optBoolean("combat_active") else null,
                    combat_turn = s.optIntOrNull("combat_turn"),
                )
            }
        }
        state.optJSONArray("tokens")?.let { arr ->
            tokens.clear()
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                decodeToken(obj)?.let { tokens.add(it) }
            }
        }
        if (connectPlayerName.isNotEmpty()) {
            val mine = tokens.firstOrNull {
                (it.is_player == true) && it.player_name == connectPlayerName
            }
            if (mine != null) {
                if (playerTokenId.value != mine.id) playerTokenId.value = mine.id
                needsCharacterSelection.value = false
                val cid = pendingCreatureIdOnJoin ?: mine.creature_id
                val sid = session.value?.id
                if (cid != null && sid != null) {
                    socket?.emit("create_player_token", JSONObject().apply {
                        put("sessionId", sid)
                        put("playerName", connectPlayerName)
                        put("creatureId", cid)
                    })
                }
            } else if (playerTokenId.value == null) {
                val cid = pendingCreatureIdOnJoin
                val sid = session.value?.id
                if (cid != null && sid != null) {
                    socket?.emit("create_player_token", JSONObject().apply {
                        put("sessionId", sid)
                        put("playerName", connectPlayerName)
                        put("creatureId", cid)
                    })
                } else {
                    needsCharacterSelection.value = true
                }
            }
        }
        pendingCreatureIdOnJoin = null
    }

    private fun patchToken(id: Int, transform: (Token) -> Token) {
        val idx = tokens.indexOfFirst { it.id == id }
        if (idx < 0) return
        tokens[idx] = transform(tokens[idx])
    }

    private fun decodeToken(obj: JSONObject): Token? {
        val id = obj.optInt("id", -1)
        if (id == -1) return null
        return Token(
            id = id,
            name        = obj.optString("name", null),
            nickname    = obj.optString("nickname", null),
            player_name = obj.optString("player_name", null),
            size        = obj.optString("size", null),
            current_hp  = obj.optIntOrNull("current_hp"),
            max_hp      = obj.optIntOrNull("max_hp"),
            temp_hp     = obj.optIntOrNull("temp_hp"),
            is_player   = obj.optBooleanOrNull("is_player"),
            is_hidden   = obj.optBooleanOrNull("is_hidden"),
            is_flying   = obj.optBooleanOrNull("is_flying"),
            grid_col    = obj.optDoubleOrNull("grid_col"),
            grid_row    = obj.optDoubleOrNull("grid_row"),
            map_id      = obj.optIntOrNull("map_id"),
            creature_id = obj.optIntOrNull("creature_id"),
            token_light_bright  = obj.optDoubleOrNull("token_light_bright"),
            token_light_dim     = obj.optDoubleOrNull("token_light_dim"),
            token_light_color   = obj.optString("token_light_color", null),
            token_light_flicker = obj.optBooleanOrNull("token_light_flicker"),
            conditions = parseStringArray(obj.opt("conditions")).takeIf { it.isNotEmpty() },
        )
    }
}

// ── JSONObject convenience ─────────────────────────────────────────

private fun JSONObject.optIntOrNull(name: String): Int? =
    if (this.has(name) && !this.isNull(name)) this.optInt(name) else null

private fun JSONObject.optDoubleOrNull(name: String): Double? =
    if (this.has(name) && !this.isNull(name)) this.optDouble(name) else null

private fun JSONObject.optBooleanOrNull(name: String): Boolean? =
    if (this.has(name) && !this.isNull(name)) this.optBoolean(name) else null

private fun JSONObject.optString(name: String, fallback: String?): String? {
    if (!this.has(name) || this.isNull(name)) return fallback
    val s = this.optString(name, "")
    return s.ifEmpty { fallback }
}

// `conditions` arrives over the wire as either a JSON array or a
// JSON-encoded string. Normalise both to List<String>.
private fun parseStringArray(raw: Any?): List<String> {
    return when (raw) {
        is JSONArray -> (0 until raw.length()).mapNotNull { raw.optString(it) }
        is String -> runCatching { JSONArray(raw) }.map { arr ->
            (0 until arr.length()).mapNotNull { arr.optString(it) }
        }.getOrDefault(emptyList())
        else -> emptyList()
    }
}

// ── NPC language scrambler ─────────────────────────────────────────
// Direct port of the web plugin's deterministic scrambler so iOS,
// Android and web players see the same gibberish for the same
// untranslated line.

private data class NpcLangFlavour(val chars: String, val avgWord: Int, val joiner: String)

private val npcLangTable: Map<String, NpcLangFlavour> = mapOf(
    "common"       to NpcLangFlavour("abcdefghijklmnopqrstuvwxyz", 5, ""),
    "dwarvish"     to NpcLangFlavour("bdgkrtvzhcdmnp", 6, "-"),
    "elvish"       to NpcLangFlavour("aeilmnorsuyãë", 7, "'"),
    "giant"        to NpcLangFlavour("aoughrtkmnj", 5, ""),
    "gnomish"      to NpcLangFlavour("iaezvksrhlu", 6, ""),
    "goblin"       to NpcLangFlavour("ksgrtzbhix", 4, ""),
    "halfling"     to NpcLangFlavour("aeiouhlrwbnmt", 5, ""),
    "orc"          to NpcLangFlavour("kgthrzbmnu", 5, "-"),
    "abyssal"      to NpcLangFlavour("kxszvqthrum", 6, ""),
    "celestial"    to NpcLangFlavour("aeiouhlmsrntw", 7, "'"),
    "draconic"     to NpcLangFlavour("sshrxkthazvi", 6, "-"),
    "deep-speech"  to NpcLangFlavour("qzxk'h…rnv", 5, "·"),
    "infernal"     to NpcLangFlavour("kzthrxvqsbm", 6, ""),
    "primordial"   to NpcLangFlavour("aelourwhsv", 6, ""),
    "sylvan"       to NpcLangFlavour("aeilmnorsywp", 7, "'"),
    "undercommon"  to NpcLangFlavour("kszthrxqvm", 5, ""),
    "druidic"      to NpcLangFlavour("oacisthlmrne", 6, "-"),
    "thieves-cant" to NpcLangFlavour("gestkmnrhloi", 4, ""),
)

private fun fnv1a(s: String): Long {
    var h = 2166136261L and 0xFFFFFFFFL
    for (b in s.toByteArray(Charsets.UTF_8)) {
        h = (h xor (b.toLong() and 0xFFL)) and 0xFFFFFFFFL
        h = (h * 16777619L) and 0xFFFFFFFFL
    }
    return h
}

private fun scrambleText(text: String, slug: String): String {
    val flav = npcLangTable[slug] ?: npcLangTable["common"]!!
    var seed = fnv1a("$slug::$text")
    fun next(): Long {
        seed = (seed + 0x6D2B79F5L) and 0xFFFFFFFFL
        var t = seed
        t = ((t xor (t ushr 15)) * (t or 1L)) and 0xFFFFFFFFL
        t = (t xor (t + ((t xor (t ushr 7)) and 61L) * (t or 1L))) and 0xFFFFFFFFL
        return t xor (t ushr 14)
    }
    return text.split(' ').joinToString(" ") { word ->
        val len = word.length.coerceAtLeast(1)
        val targetLen = (flav.avgWord + ((next() % 3) - 1).toInt())
            .coerceAtLeast(2).coerceAtMost(len + 2)
        val sb = StringBuilder()
        for (i in 0 until targetLen) {
            val idx = (next() % flav.chars.length.toLong()).toInt().let {
                if (it < 0) it + flav.chars.length else it
            }
            sb.append(flav.chars[idx])
            if (flav.joiner.isNotEmpty() && i in 1 until targetLen - 1
                && (next() and 7L) == 0L) sb.append(flav.joiner)
        }
        sb.toString()
    }
}

// Mirror of the iOS npcParseKnownLanguages — turn the comma-separated
// `creature.languages` text into a Set<slug> for quick membership checks.
private fun parseKnownLanguages(csv: String): Set<String> {
    if (csv.isBlank()) return emptySet()
    return csv.split(',').map {
        it.trim().lowercase()
            .replace(' ', '-')
            .replace("'", "")
    }.filter { it.isNotEmpty() }.toSet()
}

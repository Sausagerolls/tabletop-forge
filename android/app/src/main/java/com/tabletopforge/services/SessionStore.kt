// SessionStore — Kotlin mirror of ios/TableTopForge/Services/SessionStore.swift.
//
// Same KEYS as the iOS port so behaviour stays identical across
// platforms (vtt.serverUrl / vtt.sessionCode / vtt.playerName /
// vtt.lastCreatureId). Reads/writes through DataStore-Preferences
// which is the modern Android equivalent of UserDefaults.
//
// As of v1.10.x the store also keeps a list of previously-used
// (server, code, name, character) tuples — `savedSessions` — so the
// app can auto-rejoin the most recent on launch and let the user
// pick a different one from Settings → Switch Session.

package com.tabletopforge.services

import android.content.Context
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

private val Context.dataStore by preferencesDataStore(name = "vtt")

private object Keys {
    val serverUrl       = stringPreferencesKey("vtt.serverUrl")
    val sessionCode     = stringPreferencesKey("vtt.sessionCode")
    val playerName      = stringPreferencesKey("vtt.playerName")
    val lastCreatureId  = intPreferencesKey("vtt.lastCreatureId")
    // Theme — string of "system" / "light" / "dark". Same key as iOS
    // (@AppStorage("vtt.theme")) so the choice round-trips if a user
    // somehow shares the prefs across platforms.
    val theme           = stringPreferencesKey("vtt.theme")
    // Offline cache — last successful Creature JSON. Read on launch
    // so screens have something to render before the socket connects;
    // refreshed every time fetchCreature succeeds. Settings has a
    // "Clear cached character" button that wipes this key.
    val cachedCreature  = stringPreferencesKey("vtt.cachedCreature")
    // JSON array of previously-used sessions. Same key name as iOS so
    // a future cross-platform sync can read both.
    val savedSessions   = stringPreferencesKey("vtt.savedSessions")
}

enum class AppTheme(val raw: String, val label: String) {
    System("system", "System"),
    Light("light",   "Light"),
    Dark("dark",     "Dark");
    companion object {
        fun from(raw: String?) = entries.firstOrNull { it.raw == raw } ?: System
    }
}

/** One past login. Mirrors the iOS SavedSession struct. */
data class SavedSession(
    val id: String,
    val serverUrl: String,
    val sessionCode: String,
    val playerName: String,
    val creatureId: Int?,
    val creatureName: String?,
    val creatureImagePath: String?,
    val lastUsedAt: Long,
)

class SessionStore(private val ctx: Context, private val scope: CoroutineScope) {
    val serverUrl: MutableState<String>        = mutableStateOf("")
    val sessionCode: MutableState<String>      = mutableStateOf("")
    val playerName: MutableState<String>       = mutableStateOf("")
    val lastCreatureId: MutableState<Int?>     = mutableStateOf(null)

    val loggedIn: MutableState<Boolean>   = mutableStateOf(false)
    val connecting: MutableState<Boolean> = mutableStateOf(false)
    val lastError: MutableState<String?>  = mutableStateOf(null)
    val theme: MutableState<AppTheme>     = mutableStateOf(AppTheme.System)
    val cachedCreatureJson: MutableState<String?> = mutableStateOf(null)
    /** All past logins on this device, sorted most-recent-first. */
    val savedSessions: MutableState<List<SavedSession>> = mutableStateOf(emptyList())

    init {
        scope.launch {
            val prefs: Preferences = ctx.dataStore.data.first()
            serverUrl.value      = prefs[Keys.serverUrl]    ?: ""
            sessionCode.value    = prefs[Keys.sessionCode]  ?: ""
            playerName.value     = prefs[Keys.playerName]   ?: ""
            val storedCreature   = prefs[Keys.lastCreatureId] ?: 0
            lastCreatureId.value = if (storedCreature > 0) storedCreature else null
            theme.value          = AppTheme.from(prefs[Keys.theme])
            cachedCreatureJson.value = prefs[Keys.cachedCreature]
            savedSessions.value  = parseSavedSessions(prefs[Keys.savedSessions])
            // Migration — if the user is upgrading into the switcher
            // with an active session but an empty list, fold the
            // active fields in so they don't lose their rejoin path.
            if (savedSessions.value.isEmpty()
                && sessionCode.value.isNotBlank()
                && playerName.value.isNotBlank()) {
                val migrated = SavedSession(
                    id = UUID.randomUUID().toString(),
                    serverUrl = serverUrl.value,
                    sessionCode = sessionCode.value,
                    playerName = playerName.value,
                    creatureId = lastCreatureId.value,
                    creatureName = null,
                    creatureImagePath = null,
                    lastUsedAt = System.currentTimeMillis(),
                )
                savedSessions.value = listOf(migrated)
                writeSavedSessions(savedSessions.value)
            }
        }
    }

    fun cacheCreatureJson(json: String) {
        cachedCreatureJson.value = json
        scope.launch(Dispatchers.IO) {
            ctx.dataStore.edit { p -> p[Keys.cachedCreature] = json }
        }
    }

    fun clearCachedCreature() {
        cachedCreatureJson.value = null
        scope.launch(Dispatchers.IO) {
            ctx.dataStore.edit { p -> p.remove(Keys.cachedCreature) }
        }
    }

    fun setTheme(t: AppTheme) {
        theme.value = t
        scope.launch(Dispatchers.IO) {
            ctx.dataStore.edit { p -> p[Keys.theme] = t.raw }
        }
    }

    fun persist() {
        scope.launch(Dispatchers.IO) {
            ctx.dataStore.edit { p ->
                p[Keys.serverUrl]   = serverUrl.value
                p[Keys.sessionCode] = sessionCode.value
                p[Keys.playerName]  = playerName.value
                val id = lastCreatureId.value
                if (id != null) p[Keys.lastCreatureId] = id else p.remove(Keys.lastCreatureId)
            }
        }
    }

    /**
     * Drop the *active* session from both the live state and the
     * saved-sessions list so the next launch picks a different row,
     * or shows LoginScreen if the list is empty.
     */
    fun logout() {
        val activeId = activeSessionId()
        val without = savedSessions.value.filterNot { it.id == activeId }
        clearActiveOnly()
        if (activeId != null) {
            savedSessions.value = without
            writeSavedSessions(without)
        }
    }

    /**
     * Wipe just the live fields — the saved-sessions list keeps the
     * matching row so the user can rejoin via the switcher. Used by
     * "Add Another Session" which wants the LoginScreen blank.
     */
    fun clearActiveOnly() {
        serverUrl.value      = ""
        sessionCode.value    = ""
        playerName.value     = ""
        lastCreatureId.value = null
        loggedIn.value       = false
        lastError.value      = null
        scope.launch(Dispatchers.IO) {
            ctx.dataStore.edit { p ->
                p.remove(Keys.serverUrl)
                p.remove(Keys.sessionCode)
                p.remove(Keys.playerName)
                p.remove(Keys.lastCreatureId)
                p.remove(Keys.cachedCreature)
            }
        }
    }

    val baseUrl: String? get() =
        if (serverUrl.value.isBlank()) null else serverUrl.value.trimEnd('/')

    // ── Saved sessions ──────────────────────────────────────────────

    /**
     * Insert or refresh a saved-sessions row for the live tuple.
     * Identity is (server, code, playerName, creatureId) so a
     * different character on the same code creates a separate row.
     */
    fun rememberCurrent(
        creatureId: Int?,
        creatureName: String?,
        creatureImagePath: String?,
    ) {
        if (sessionCode.value.isBlank() || playerName.value.isBlank()) return
        val now = System.currentTimeMillis()
        val list = savedSessions.value.toMutableList()
        val idx = list.indexOfFirst {
            it.serverUrl == serverUrl.value &&
            it.sessionCode == sessionCode.value &&
            it.playerName == playerName.value &&
            (it.creatureId ?: -1) == (creatureId ?: -1)
        }
        if (idx >= 0) {
            val cur = list[idx]
            list[idx] = cur.copy(
                creatureName       = creatureName ?: cur.creatureName,
                creatureImagePath  = creatureImagePath ?: cur.creatureImagePath,
                lastUsedAt         = now,
            )
        } else {
            list += SavedSession(
                id = UUID.randomUUID().toString(),
                serverUrl = serverUrl.value,
                sessionCode = sessionCode.value,
                playerName = playerName.value,
                creatureId = creatureId,
                creatureName = creatureName,
                creatureImagePath = creatureImagePath,
                lastUsedAt = now,
            )
        }
        savedSessions.value = list.sortedByDescending { it.lastUsedAt }
        writeSavedSessions(savedSessions.value)
    }

    fun forget(sessionId: String) {
        val without = savedSessions.value.filterNot { it.id == sessionId }
        savedSessions.value = without
        writeSavedSessions(without)
    }

    /** Promote `entry` into the active fields — caller opens the socket. */
    fun adopt(entry: SavedSession) {
        serverUrl.value      = entry.serverUrl
        sessionCode.value    = entry.sessionCode
        playerName.value     = entry.playerName
        lastCreatureId.value = entry.creatureId
        lastError.value      = null
        persist()
    }

    private fun activeSessionId(): String? = savedSessions.value.firstOrNull {
        it.serverUrl == serverUrl.value &&
        it.sessionCode == sessionCode.value &&
        it.playerName == playerName.value &&
        (it.creatureId ?: -1) == (lastCreatureId.value ?: -1)
    }?.id

    private fun parseSavedSessions(raw: String?): List<SavedSession> {
        if (raw.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                SavedSession(
                    id = o.optString("id"),
                    serverUrl = o.optString("serverUrl"),
                    sessionCode = o.optString("sessionCode"),
                    playerName = o.optString("playerName"),
                    creatureId = if (o.has("creatureId") && !o.isNull("creatureId")) o.optInt("creatureId") else null,
                    creatureName = if (o.has("creatureName") && !o.isNull("creatureName")) o.optString("creatureName") else null,
                    creatureImagePath = if (o.has("creatureImagePath") && !o.isNull("creatureImagePath")) o.optString("creatureImagePath") else null,
                    lastUsedAt = o.optLong("lastUsedAt"),
                )
            }.sortedByDescending { it.lastUsedAt }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun writeSavedSessions(list: List<SavedSession>) {
        val arr = JSONArray()
        list.forEach { s ->
            val o = JSONObject()
            o.put("id", s.id)
            o.put("serverUrl", s.serverUrl)
            o.put("sessionCode", s.sessionCode)
            o.put("playerName", s.playerName)
            if (s.creatureId != null) o.put("creatureId", s.creatureId) else o.put("creatureId", JSONObject.NULL)
            o.put("creatureName", s.creatureName ?: JSONObject.NULL)
            o.put("creatureImagePath", s.creatureImagePath ?: JSONObject.NULL)
            o.put("lastUsedAt", s.lastUsedAt)
            arr.put(o)
        }
        val raw = arr.toString()
        scope.launch(Dispatchers.IO) {
            ctx.dataStore.edit { p -> p[Keys.savedSessions] = raw }
        }
    }
}

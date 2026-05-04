// SessionStore — Kotlin mirror of ios/TableTopForge/Services/SessionStore.swift.
//
// Same KEYS as the iOS port so behaviour stays identical across
// platforms (vtt.serverUrl / vtt.sessionCode / vtt.playerName /
// vtt.lastCreatureId). Reads/writes through DataStore-Preferences
// which is the modern Android equivalent of UserDefaults.

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
}

enum class AppTheme(val raw: String, val label: String) {
    System("system", "System"),
    Light("light",   "Light"),
    Dark("dark",     "Dark");
    companion object {
        fun from(raw: String?) = entries.firstOrNull { it.raw == raw } ?: System
    }
}

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

    fun logout() {
        serverUrl.value      = ""
        sessionCode.value    = ""
        playerName.value     = ""
        lastCreatureId.value = null
        loggedIn.value       = false
        lastError.value      = null
        scope.launch(Dispatchers.IO) { ctx.dataStore.edit { it.clear() } }
    }

    val baseUrl: String? get() =
        if (serverUrl.value.isBlank()) null else serverUrl.value.trimEnd('/')
}

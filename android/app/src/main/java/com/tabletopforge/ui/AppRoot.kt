// AppRoot — top-level composable that picks between the login screen
// and the main tabbed UI based on store.loggedIn.

package com.tabletopforge.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.tabletopforge.SocketHolder
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore
import com.tabletopforge.services.SocketClient
import com.tabletopforge.services.UpdateBus
import com.tabletopforge.services.UpdateChecker

@Composable
fun AppRoot(store: SessionStore, socketHolder: SocketHolder, resourceStore: ResourceStore) {
    val loggedIn by store.loggedIn
    val savedSessions by store.savedSessions
    val ctx = LocalContext.current
    var didAutoRejoin by remember { mutableStateOf(false) }

    // Auto-rejoin the most recent saved session on cold launch. The
    // store hydrates savedSessions asynchronously from DataStore, so
    // we re-evaluate this whenever the list arrives instead of doing
    // it once on first composition. After it fires we set the flag
    // so a later "Add Another Session" doesn't yank the user back.
    LaunchedEffect(savedSessions) {
        if (didAutoRejoin) return@LaunchedEffect
        val entry = savedSessions.firstOrNull() ?: return@LaunchedEffect
        if (loggedIn || store.connecting.value) return@LaunchedEffect
        didAutoRejoin = true
        store.adopt(entry)
        store.connecting.value = true
        store.lastError.value = null
        val sc = SocketClient(ctx, normalizeServerUrl(entry.serverUrl))
        socketHolder.current = sc
        sc.connect(entry.sessionCode, entry.playerName, entry.creatureId)
    }

    // When the live socket lands a creature for the active session,
    // refresh the saved-sessions row so the next launch's switcher
    // can show the character name + portrait.
    val sc = socketHolder.current
    if (sc != null) {
        val cre by sc.creature
        LaunchedEffect(cre?.id) {
            val c = cre ?: return@LaunchedEffect
            store.lastCreatureId.value = c.id
            store.persist()
            store.rememberCurrent(
                creatureId = c.id,
                creatureName = c.name,
                creatureImagePath = c.image_path,
            )
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (loggedIn) {
            HomeScreen(store = store, socketHolder = socketHolder, resourceStore = resourceStore)
        } else {
            LoginScreen(store = store, socketHolder = socketHolder)
        }
        // Site-flavor only: poll the update manifest once on launch.
        // The checker no-ops on the play flavor, so this LaunchedEffect
        // is harmless (and unreachable past the early-return) there.
        // Result lands in the shared UpdateBus so DiceLightScreen and
        // the bottom-nav badge can read it without prop drilling.
        var dismissed by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) {
            val checker = UpdateChecker(ctx)
            if (!checker.enabled) return@LaunchedEffect
            UpdateBus.checking.value = true
            UpdateBus.available.value = checker.check()
            UpdateBus.lastError.value = null
            UpdateBus.lastCheckedAt.value = System.currentTimeMillis()
            UpdateBus.checking.value = false
        }
        val a by UpdateBus.available
        a?.takeIf { !dismissed }?.let { upd ->
            UpdatePromptDialog(update = upd, onDismiss = { dismissed = true })
        }
    }
}

private fun normalizeServerUrl(raw: String): String {
    val trimmed = raw.trim()
    return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed
        else "http://$trimmed"
}

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
import com.tabletopforge.services.AvailableUpdate
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore
import com.tabletopforge.services.UpdateChecker

@Composable
fun AppRoot(store: SessionStore, socketHolder: SocketHolder, resourceStore: ResourceStore) {
    val loggedIn by store.loggedIn
    Box(modifier = Modifier.fillMaxSize()) {
        if (loggedIn) {
            HomeScreen(store = store, socketHolder = socketHolder, resourceStore = resourceStore)
        } else {
            LoginScreen(store = store, socketHolder = socketHolder)
        }
        // Site-flavor only: poll the update manifest once on launch.
        // The checker no-ops on the play flavor, so this LaunchedEffect
        // is harmless (and unreachable past the early-return) there.
        val ctx = LocalContext.current
        var available by remember { mutableStateOf<AvailableUpdate?>(null) }
        var dismissed by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) {
            val checker = UpdateChecker(ctx)
            if (!checker.enabled) return@LaunchedEffect
            available = checker.check()
        }
        val a = available
        if (a != null && !dismissed) {
            UpdatePromptDialog(update = a, onDismiss = { dismissed = true })
        }
    }
}

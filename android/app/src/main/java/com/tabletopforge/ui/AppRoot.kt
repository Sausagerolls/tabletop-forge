// AppRoot — top-level composable that picks between the login screen
// and the main tabbed UI based on store.loggedIn.

package com.tabletopforge.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.tabletopforge.SocketHolder
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore

@Composable
fun AppRoot(store: SessionStore, socketHolder: SocketHolder, resourceStore: ResourceStore) {
    val loggedIn by store.loggedIn
    Box(modifier = Modifier.fillMaxSize()) {
        if (loggedIn) {
            HomeScreen(store = store, socketHolder = socketHolder, resourceStore = resourceStore)
        } else {
            LoginScreen(store = store, socketHolder = socketHolder)
        }
    }
}

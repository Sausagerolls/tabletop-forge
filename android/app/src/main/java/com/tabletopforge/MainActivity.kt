// MainActivity — Compose host for the entire app. Mirrors the role
// played by ios/TableTopForge/TableTopForgeApp.swift on iOS: holds
// the SessionStore + SocketClient and routes between Login and the
// main tabbed UI based on `loggedIn` state.

package com.tabletopforge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.tabletopforge.services.AppTheme
import com.tabletopforge.services.Notifier
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore
import com.tabletopforge.services.SocketClient
import com.tabletopforge.ui.AppRoot

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Notifier.ensureChannel(this)
        setContent {
            val ctx = LocalContext.current
            val scope = rememberCoroutineScope()
            val store         = remember { SessionStore(ctx, scope) }
            val resourceStore = remember { ResourceStore(ctx, scope) }
            val socketHolder  = remember { SocketHolder() }
            // Theme picker on the Dice tab persists into the store; the
            // root composable subscribes here so a swap recomposes the
            // entire UI tree without restarting the activity.
            val themeChoice by store.theme
            val systemDark = isSystemInDarkTheme()
            val useDark = when (themeChoice) {
                AppTheme.System -> systemDark
                AppTheme.Light  -> false
                AppTheme.Dark   -> true
            }
            MaterialTheme(colorScheme = if (useDark) darkColorScheme() else lightColorScheme()) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppRoot(store = store, socketHolder = socketHolder, resourceStore = resourceStore)
                }
            }
        }
    }
}

// Wraps the SocketClient so the AppRoot can swap it out on logout/login
// without re-mounting the whole tree.
class SocketHolder {
    var current: SocketClient? = null
}

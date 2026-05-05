// CharacterEditorWebView — full-screen WebView pointed at the web
// client's CharacterEditor route (`/edit-character?id=…`). Lets the
// user edit their character with 100% parity to the desktop site,
// without us re-porting CreatureForm to Compose. Mirror of iOS's
// SettingsSheet WebView modal.

package com.tabletopforge.ui

import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import java.net.URLEncoder

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CharacterEditorWebView(
    serverUrl: String,
    sessionCode: String,
    playerName: String,
    creatureId: Int?,
    onClose: () -> Unit,
) {
    // sessionCode + playerName are no longer needed by the route
    // (the editor only needs ?id=…), but they're kept on the
    // composable signature so the call sites that pass them stay
    // unchanged. Suppressing the unused warnings via underscores.
    @Suppress("UNUSED_PARAMETER", "UNUSED_VARIABLE")
    val _unused = sessionCode to playerName
    val url = remember(serverUrl, creatureId) {
        buildString {
            append(serverUrl.trimEnd('/'))
            append("/edit-character")
            if (creatureId != null) {
                append("?id=")
                append(creatureId)
            }
        }
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Stat Block") },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Close")
                    }
                },
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                            mediaPlaybackRequiresUserGesture = false
                            useWideViewPort = true
                            loadWithOverviewMode = true
                        }
                        webViewClient = WebViewClient()
                        webChromeClient = WebChromeClient()
                        loadUrl(url)
                    }
                },
                update = { view ->
                    if (view.url != url) view.loadUrl(url)
                },
            )
        }
    }
}


// CharacterEditorWebView — full-screen WebView pointed at the web
// client's PlayerView (`/play?code=…&name=…&creatureId=…`). Lets the
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
    val url = remember(serverUrl, sessionCode, playerName, creatureId) {
        buildString {
            append(serverUrl.trimEnd('/'))
            append("/play?code=")
            append(URLEncoder.encode(sessionCode, "UTF-8"))
            append("&name=")
            append(URLEncoder.encode(playerName, "UTF-8"))
            if (creatureId != null) {
                append("&creatureId=")
                append(creatureId)
            }
        }
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Character") },
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


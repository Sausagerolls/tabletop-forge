// LoginScreen — Kotlin mirror of ios/TableTopForge/Views/LoginView.swift.
//
// Visual: dark gradient backdrop, soft gold radial glow, centered hero
// (crossed-hammers mark + "TableTop Forge" + tagline), three icon-led
// fields in a glass card, a gold gradient Connect button. The mirror
// on iOS uses the same palette + layout; keep them aligned when
// updating either.

package com.tabletopforge.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tabletopforge.SocketHolder
import com.tabletopforge.services.ConnectionStatus
import com.tabletopforge.services.SessionStore
import com.tabletopforge.services.SocketClient

private val Gold       = Color(0xFFFBBF24)
private val GoldDeep   = Color(0xFFF2BD2A)
private val NavyTop    = Color(0xFF111722)
private val NavyBottom = Color(0xFF050709)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(store: SessionStore, socketHolder: SocketHolder) {
    val ctx = LocalContext.current
    var serverUrl   by store.serverUrl
    var sessionCode by store.sessionCode
    var playerName  by store.playerName
    val connecting  by store.connecting
    val lastError   by store.lastError
    val saved       by store.savedSessions
    var showSwitcher by remember { mutableStateOf(false) }

    if (showSwitcher) {
        SessionSwitcherScreen(
            store = store,
            socketHolder = socketHolder,
            onClose = { showSwitcher = false },
            // "Add another" is a no-op here — we're already on
            // LoginScreen, so just dropping the sheet leaves the
            // user staring at the typing form.
            onAddNew = { /* stay on LoginScreen */ },
        )
        return
    }

    Box(
        modifier = Modifier.fillMaxSize().background(
            Brush.linearGradient(
                colors = listOf(NavyTop, NavyBottom),
                start = Offset.Zero,
                end = Offset(1500f, 1500f),
            )
        )
    ) {
        // Soft gold radial glow behind the hero
        Box(
            modifier = Modifier.fillMaxSize().drawBehind {
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(Gold.copy(alpha = 0.18f), Color.Transparent),
                        center = Offset(size.width / 2f, size.height * 0.15f),
                        radius = size.width * 0.6f,
                    ),
                    radius = size.width * 0.6f,
                    center = Offset(size.width / 2f, size.height * 0.15f),
                )
            }
        )

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Spacer(Modifier.height(20.dp))
            HeroBlock()
            Spacer(Modifier.height(4.dp))

            // Glass-card form
            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color.White.copy(alpha = 0.04f))
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(18.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                FieldRow(
                    icon = Icons.Filled.Public,
                    placeholder = "tabletopforge.local",
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    keyboardType = KeyboardType.Uri,
                    capitalization = KeyboardCapitalization.None,
                    imeAction = ImeAction.Next,
                )
                // Tip: spell out the LAN-private URL formats the
                // app's network-security-config actually accepts.
                // Play Store NSC blocks cleartext to raw LAN IP
                // literals (192.168.x.y) but allows .local mDNS,
                // localhost, and HTTPS. The GM panel prints the
                // exact URL — surface it here so the player has a
                // pointer when they're staring at the field.
                Text(
                    "Server URL — read it from the GM's panel. " +
                        "Use the .local form (e.g. tabletopforge.local) " +
                        "or HTTPS for off-LAN.",
                    color = Color.White.copy(alpha = 0.45f),
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    modifier = Modifier.padding(start = 4.dp, end = 4.dp, top = 2.dp),
                )
                FieldRow(
                    icon = Icons.Filled.Key,
                    placeholder = "Session code",
                    value = sessionCode,
                    onValueChange = { sessionCode = it.uppercase() },
                    capitalization = KeyboardCapitalization.Characters,
                    monospaced = true,
                    imeAction = ImeAction.Next,
                )
                FieldRow(
                    icon = Icons.Filled.Person,
                    placeholder = "Player name",
                    value = playerName,
                    onValueChange = { playerName = it },
                    capitalization = KeyboardCapitalization.Words,
                    imeAction = ImeAction.Go,
                )
            }

            if (!lastError.isNullOrBlank()) {
                ErrorBanner(lastError ?: "")
            }

            // Connect button
            val isValid = serverUrl.isNotBlank() && sessionCode.isNotBlank() && playerName.isNotBlank()
            val canConnect = isValid && !connecting
            Box(
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)
                    .shadow(elevation = if (canConnect) 14.dp else 0.dp,
                            shape = RoundedCornerShape(14.dp),
                            ambientColor = Gold.copy(alpha = 0.4f),
                            spotColor = Gold.copy(alpha = 0.5f))
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        Brush.horizontalGradient(listOf(Gold, GoldDeep))
                    )
                    .pointerInput(canConnect) {
                        if (!canConnect) return@pointerInput
                        awaitPointerEventScope {
                            while (true) {
                                val ev = awaitPointerEvent()
                                if (ev.changes.any { it.changedToUp() }) {
                                    store.persist()
                                    store.connecting.value = true
                                    store.lastError.value = null
                                    val sc = SocketClient(ctx, normalizeUrl(serverUrl))
                                    socketHolder.current = sc
                                    sc.connect(sessionCode, playerName, store.lastCreatureId.value)
                                }
                            }
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                if (connecting) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp), strokeWidth = 2.dp,
                            color = Color.Black,
                        )
                        Text("Connecting…", color = Color.Black,
                            fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.ArrowForward, contentDescription = null, tint = Color.Black)
                        Text("Join Session", color = Color.Black,
                            fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
                    }
                }
                if (!canConnect) {
                    Box(modifier = Modifier.fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.45f)))
                }
            }

            if (saved.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                Box(
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, Gold.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                        .pointerInput(Unit) {
                            awaitPointerEventScope {
                                while (true) {
                                    val ev = awaitPointerEvent()
                                    if (ev.changes.any { it.changedToUp() }) {
                                        showSwitcher = true
                                    }
                                }
                            }
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "Switch to a Saved Session",
                        color = Gold,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                }
            }

            Spacer(Modifier.height(4.dp))
            Text(
                "Your campaign details are remembered between launches.",
                fontSize = 11.sp,
                color = Color.White.copy(alpha = 0.45f),
                textAlign = TextAlign.Center,
            )
        }
    }

    // Bridge socket state into store.loggedIn / store.lastError so the
    // root composable swaps to HomeScreen once we're connected.
    val sc = socketHolder.current
    if (sc != null) {
        val statusNow by sc.connectionStatus
        val errNow    by sc.joinError
        LaunchedEffect(statusNow) {
            if (statusNow == ConnectionStatus.Connected) {
                store.connecting.value = false
                store.loggedIn.value = true
            }
        }
        LaunchedEffect(errNow) {
            if (!errNow.isNullOrBlank()) {
                store.connecting.value = false
                // Decorate the raw error with a hint when the user
                // typed a LAN IP literal (192.168.x.y / 10.x.y.z /
                // 172.16-31.x.y) — Play Store NSC blocks cleartext
                // to those, so the connection bounces with a
                // non-obvious "no route to host" / "trust anchor"
                // / "cleartext not permitted" error. Pointing them
                // at the .local form is the difference between a
                // returning user giving up and them looking at the
                // GM's panel for the right URL.
                val typed = serverUrl.trim()
                val looksLikeLanIp = Regex(
                    "^(https?://)?(10\\.\\d|172\\.(1[6-9]|2\\d|3[01])\\.|192\\.168\\.).*"
                ).matches(typed)
                store.lastError.value = if (looksLikeLanIp) {
                    "$errNow\n\nTip: this build of the app blocks plain HTTP to LAN " +
                    "IP literals. Try the .local URL the GM panel prints (e.g. " +
                    "tabletopforge.local) or an HTTPS endpoint."
                } else errNow
            }
        }
    }
}

@Composable
private fun HeroBlock() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Same crossed-hammers art the launcher icon ships, pulled
        // from the mipmap so a future icon swap cascades to the
        // login screen automatically. Rounded-rect clip + thin gold
        // border give the mark the "lifted" feel the previous
        // Canvas-drawn version had, without the parallel codepath.
        val markShape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp)
        Box(
            modifier = Modifier.size(96.dp).clip(markShape)
                .border(1.dp, Gold.copy(alpha = 0.45f), markShape),
            contentAlignment = Alignment.Center,
        ) {
            // AsyncImage handles the adaptive-icon XML the launcher
            // uses on API 26+. painterResource() does not — it only
            // accepts vector / raster drawables and crashes on the
            // <adaptive-icon> wrapper that the icon resource resolves
            // to on modern devices.
            coil.compose.AsyncImage(
                model = com.tabletopforge.R.mipmap.ic_launcher,
                contentDescription = "TableTop Forge",
                modifier = Modifier.fillMaxSize(),
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            )
        }
        Text("TableTop Forge", color = Color.White,
            fontSize = 30.sp, fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center)
        Text("Sign in to your campaign", color = Color.White.copy(alpha = 0.55f),
            fontSize = 14.sp, textAlign = TextAlign.Center)
    }
}

// Crossed-hammers vector — same shape as the launcher icon foreground.
@Composable
private fun CrossedHammersMark(size: androidx.compose.ui.unit.Dp) {
    androidx.compose.foundation.Canvas(modifier = Modifier.size(size)) {
        // Two crossed hammers — an "X" silhouette filled with gold gradient.
        val r = this.size.minDimension
        val gold = Brush.linearGradient(listOf(Gold, GoldDeep))
        // Hammer head (right) — small rounded rect
        drawRoundRect(
            brush = gold,
            topLeft = Offset(r * 0.55f, r * 0.05f),
            size = androidx.compose.ui.geometry.Size(r * 0.40f, r * 0.20f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(r * 0.04f, r * 0.04f),
        )
        // Hammer head (left) — mirrored
        drawRoundRect(
            brush = gold,
            topLeft = Offset(r * 0.05f, r * 0.05f),
            size = androidx.compose.ui.geometry.Size(r * 0.40f, r * 0.20f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(r * 0.04f, r * 0.04f),
        )
        // Right handle — diagonal
        drawPath(
            path = Path().apply {
                moveTo(r * 0.62f, r * 0.27f)
                lineTo(r * 0.20f, r * 0.85f)
                lineTo(r * 0.10f, r * 0.95f)
                lineTo(r * 0.18f, r * 0.78f)
                lineTo(r * 0.55f, r * 0.32f)
                close()
            },
            brush = gold,
        )
        // Left handle — mirrored diagonal
        drawPath(
            path = Path().apply {
                moveTo(r * 0.38f, r * 0.27f)
                lineTo(r * 0.80f, r * 0.85f)
                lineTo(r * 0.90f, r * 0.95f)
                lineTo(r * 0.82f, r * 0.78f)
                lineTo(r * 0.45f, r * 0.32f)
                close()
            },
            brush = gold,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FieldRow(
    icon: ImageVector,
    placeholder: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    monospaced: Boolean = false,
    imeAction: ImeAction = ImeAction.Default,
) {
    var focused by remember { mutableStateOf(false) }
    Row(
        // Bumped 0.04 → 0.14 so the field reads as a real panel
        // against the dark frosted login card, and the unfocused
        // border 0.08 → 0.18 to match. Same change landed on iOS.
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(Color.White.copy(alpha = 0.14f))
            .border(
                width = if (focused) 1.4.dp else 1.dp,
                color = if (focused) Gold.copy(alpha = 0.6f)
                        else Color.White.copy(alpha = 0.18f),
                shape = RoundedCornerShape(12.dp),
            )
            .padding(horizontal = 12.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(icon, contentDescription = null,
            tint = Gold.copy(alpha = 0.9f),
            modifier = Modifier.size(20.dp))
        TextField(
            value = value,
            onValueChange = onValueChange,
            // Placeholder bumped 0.4 → 0.55 — the previous shade
            // was the same brightness as the panel background,
            // making the hint nearly invisible.
            placeholder = { Text(placeholder, color = Color.White.copy(alpha = 0.55f)) },
            singleLine = true,
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                disabledContainerColor = Color.Transparent,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                cursorColor = Gold,
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
            ),
            keyboardOptions = KeyboardOptions(
                keyboardType = keyboardType,
                capitalization = capitalization,
                imeAction = imeAction,
            ),
            textStyle = if (monospaced) MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Monospace)
                        else MaterialTheme.typography.bodyLarge,
            modifier = Modifier.fillMaxWidth(),
        )
    }
    // Track focus via interaction source — simpler than the text-field's own
    // delegate so we keep the picker decoupled from material internals.
    LaunchedEffect(value) { focused = value.isNotBlank() }
}

@Composable
private fun ErrorBanner(msg: String) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
            .background(Color.Red.copy(alpha = 0.15f))
            .border(1.dp, Color.Red.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Filled.Warning, contentDescription = null, tint = Color.Red)
        Text(msg, fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f))
    }
}

private fun normalizeUrl(raw: String): String {
    val trimmed = raw.trim()
    return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed
        else "http://$trimmed"
}

private fun androidx.compose.ui.input.pointer.PointerInputChange.changedToUp(): Boolean =
    pressed.not() && previousPressed

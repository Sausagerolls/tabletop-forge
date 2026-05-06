// SessionSwitcherScreen — Kotlin mirror of
// ios/TableTopForge/Views/SessionSwitcherView.swift.
//
// Modal list of every previously-used session on this device.
// Surfaced from SettingsScreen ("Switch Session") and from
// LoginScreen ("Switch to a Saved Session" fallback when an auto-
// rejoin fails). Tap a row to swap the active session and reconnect;
// the trailing Forget button drops the row from the list. The
// "Add" toolbar button delegates to the parent which handles the
// "go to LoginScreen with empty fields" flow.

package com.tabletopforge.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tabletopforge.SocketHolder
import com.tabletopforge.services.SavedSession
import com.tabletopforge.services.SessionStore
import com.tabletopforge.services.SocketClient

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionSwitcherScreen(
    store: SessionStore,
    socketHolder: SocketHolder,
    onClose: () -> Unit,
    onAddNew: () -> Unit,
) {
    val ctx = LocalContext.current
    val saved by store.savedSessions

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Switch Session") },
                navigationIcon = {
                    TextButton(onClick = onClose) { Text("Cancel") }
                },
                actions = {
                    IconButton(onClick = {
                        onClose()
                        onAddNew()
                    }) {
                        Icon(Icons.Filled.Add, contentDescription = "Add another session")
                    }
                },
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            if (saved.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(48.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text("No remembered sessions",
                         style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(4.dp))
                    Text("Log into a session and we'll keep it here for next time.",
                         style = MaterialTheme.typography.bodySmall,
                         color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(saved, key = { it.id }) { row ->
                        SessionRow(
                            entry = row,
                            onTap = {
                                socketHolder.current?.disconnect()
                                store.adopt(row)
                                store.connecting.value = true
                                val sc = SocketClient(ctx, row.serverUrl)
                                socketHolder.current = sc
                                sc.connect(row.sessionCode, row.playerName, row.creatureId)
                                onClose()
                            },
                            onForget = { store.forget(row.id) },
                            baseUrl = row.serverUrl,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SessionRow(
    entry: SavedSession,
    onTap: () -> Unit,
    onForget: () -> Unit,
    baseUrl: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.weight(1f).clickable { onTap() },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier.size(48.dp).clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                val path = entry.creatureImagePath
                if (!path.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = "$baseUrl/uploads/$path",
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    )
                } else {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    entry.creatureName ?: entry.playerName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "${entry.playerName} • ${entry.sessionCode}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        TextButton(onClick = onForget) {
            Text("Forget", color = MaterialTheme.colorScheme.error)
        }
    }
}

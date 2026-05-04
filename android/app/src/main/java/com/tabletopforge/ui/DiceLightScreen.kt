// DiceLightScreen — Kotlin mirror of ios/TableTopForge/Views/DiceLightView.swift.
// Dice rolling controls, last-roll readout, theme picker placeholder,
// connection summary, logout. (Light source picker now lives in
// Inventory tab to match iOS.)

package com.tabletopforge.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tabletopforge.SocketHolder
import com.tabletopforge.data.DiceRollRequest
import com.tabletopforge.services.AppTheme
import com.tabletopforge.services.ConnectionStatus
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore

private val dieFaces = listOf(4, 6, 8, 10, 12, 20, 100)

@Composable
fun DiceLightScreen(store: SessionStore, socketHolder: SocketHolder, resourceStore: ResourceStore) {
    var diceCount by remember { mutableIntStateOf(1) }
    var modifier  by remember { mutableIntStateOf(0) }
    var showEditor by remember { mutableStateOf(false) }
    val sc = socketHolder.current
    val rolls = sc?.diceRolls
    val lastRoll = rolls?.lastOrNull()
    val creatureId = sc?.creature?.value?.id ?: store.lastCreatureId.value

    if (showEditor) {
        CharacterEditorWebView(
            serverUrl = store.baseUrl ?: "",
            sessionCode = store.sessionCode.value,
            playerName = store.playerName.value,
            creatureId = creatureId,
            onClose = { showEditor = false },
        )
        return
    }

    Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Dice
        SectionHeader("Dice")
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                StepperRow(
                    label = "Count",
                    value = diceCount,
                    valueLabel = "$diceCount",
                    onDec = { if (diceCount > 1) diceCount-- },
                    onInc = { if (diceCount < 20) diceCount++ },
                )
                StepperRow(
                    label = "Modifier",
                    value = modifier,
                    valueLabel = if (modifier >= 0) "+$modifier" else "$modifier",
                    onDec = { if (modifier > -20) modifier-- },
                    onInc = { if (modifier < 20) modifier++ },
                )
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 72.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.height(180.dp),
                ) {
                    items(dieFaces, key = { it }) { faces ->
                        Button(
                            onClick = {
                                val label = "d$faces" +
                                    (if (diceCount > 1) " ×$diceCount" else "") +
                                    (if (modifier != 0)
                                        if (modifier >= 0) " +$modifier" else " $modifier"
                                     else "")
                                sc?.emitDiceRoll(DiceRollRequest(faces, diceCount, modifier, label))
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("d$faces", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold) }
                    }
                }
            }
        }

        // Last roll
        if (lastRoll != null) {
            SectionHeader("Last roll")
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(lastRoll.label.ifEmpty { "Roll" }, fontWeight = FontWeight.SemiBold)
                        if (lastRoll.breakdown.isNotEmpty()) {
                            Text(lastRoll.breakdown, fontFamily = FontFamily.Monospace, fontSize = 12.sp,
                                 color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Text(
                        text = lastRoll.total.toString(),
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 24.sp,
                    )
                }
            }
        }

        // Character — opens an in-app web view to the desktop editor
        // for full-fidelity edits (race / class / inventory / spells /
        // everything). Mirror of iOS's SettingsSheet "Edit Character".
        SectionHeader("Character")
        Card(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.Filled.Edit, contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary)
                Column(modifier = Modifier.weight(1f)) {
                    Text("Edit Character on Web",
                        fontWeight = FontWeight.SemiBold)
                    Text("Opens the full character sheet editor — same as the desktop site.",
                        fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Button(
                    onClick = { showEditor = true },
                    enabled = !store.baseUrl.isNullOrBlank(),
                ) { Text("Open") }
            }
        }

        // Appearance
        SectionHeader("Appearance")
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Theme", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                val current by store.theme
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    for (t in AppTheme.entries) {
                        val selected = current == t
                        Button(
                            onClick = { store.setTheme(t) },
                            modifier = Modifier.weight(1f),
                            colors = if (selected) ButtonDefaults.buttonColors()
                                     else ButtonDefaults.outlinedButtonColors(
                                        contentColor = MaterialTheme.colorScheme.onSurface,
                                     ),
                        ) { Text(t.label) }
                    }
                }
            }
        }

        // Connection summary
        SectionHeader("Connection")
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                LabeledRow("Server",  store.serverUrl.value)
                LabeledRow("Session", store.sessionCode.value)
                LabeledRow("Player",  store.playerName.value)
                LabeledRow("Status",  statusLabel(sc?.connectionStatus?.value))
            }
        }

        // Cache controls
        SectionHeader("Storage")
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val hasCache = store.cachedCreatureJson.value != null
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Cached character", fontWeight = FontWeight.SemiBold)
                        Text(
                            if (hasCache) "Last fetched copy is stored on device — used when offline."
                            else "No cached copy yet.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Button(
                        onClick = {
                            store.clearCachedCreature()
                            sc?.creature?.value?.id?.let { cid -> resourceStore.resetAll(cid) }
                        },
                        enabled = hasCache,
                    ) { Text("Clear") }
                }
            }
        }

        // Logout
        Button(
            onClick = { sc?.disconnect(); store.logout() },
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.errorContainer,
                contentColor = MaterialTheme.colorScheme.onErrorContainer,
            ),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Log out") }
    }
}

@Composable
private fun StepperRow(
    label: String, value: Int, valueLabel: String,
    onDec: () -> Unit, onInc: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, modifier = Modifier.weight(1f))
        IconButton(onClick = onDec) { Icon(Icons.Filled.Remove, contentDescription = "Decrease $label") }
        Box(modifier = Modifier.padding(horizontal = 8.dp)) { Text(valueLabel, fontFamily = FontFamily.Monospace) }
        IconButton(onClick = onInc) { Icon(Icons.Filled.Add, contentDescription = "Increase $label") }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
}

@Composable
private fun LabeledRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f),
             color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value.ifEmpty { "—" }, fontFamily = FontFamily.Monospace)
    }
}

private fun statusLabel(s: ConnectionStatus?): String = when (s) {
    ConnectionStatus.Connected   -> "Connected"
    ConnectionStatus.Connecting  -> "Connecting…"
    ConnectionStatus.Reconnecting -> "Reconnecting…"
    ConnectionStatus.Disconnected -> "Disconnected"
    ConnectionStatus.Failed       -> "Failed"
    null -> "—"
}

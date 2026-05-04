// SettingsScreen — Kotlin mirror of ios/TableTopForge/Views/SettingsSheet.swift.
// Read-only summary of the connection details + Log out button.

package com.tabletopforge.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tabletopforge.SocketHolder
import com.tabletopforge.services.ConnectionStatus
import com.tabletopforge.services.SessionStore

@Composable
fun SettingsScreen(store: SessionStore, socketHolder: SocketHolder, onClose: () -> Unit) {
    val sc = socketHolder.current
    val statusLabel = when (sc?.connectionStatus?.value) {
        ConnectionStatus.Connected   -> "Connected"
        ConnectionStatus.Connecting  -> "Connecting…"
        ConnectionStatus.Reconnecting -> "Reconnecting…"
        ConnectionStatus.Disconnected -> "Disconnected"
        ConnectionStatus.Failed       -> "Failed"
        null -> "—"
    }
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Settings", style = MaterialTheme.typography.titleLarge,
             fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(12.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                LabeledRow("Server",  store.serverUrl.value)
                LabeledRow("Session", store.sessionCode.value)
                LabeledRow("Player",  store.playerName.value)
                LabeledRow("Status",  statusLabel)
            }
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                sc?.disconnect()
                store.logout()
                onClose()
            },
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.errorContainer,
                contentColor = MaterialTheme.colorScheme.onErrorContainer,
            ),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Log out") }
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) {
            Text("Done")
        }
    }
}

@Composable
private fun LabeledRow(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall,
             color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value.ifEmpty { "—" }, style = MaterialTheme.typography.bodyMedium)
    }
}

// UpdatePromptDialog — site-flavor "a new version is available"
// dialog. Shown when UpdateChecker.check() returns a populated
// AvailableUpdate; tapping Update kicks off the download + install
// flow inline.
package com.tabletopforge.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tabletopforge.services.AvailableUpdate
import com.tabletopforge.services.UpdateChecker
import kotlinx.coroutines.launch

@Composable
fun UpdatePromptDialog(
    update: AvailableUpdate,
    onDismiss: () -> Unit,
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val checker = remember { UpdateChecker(ctx) }
    var downloading by remember { mutableStateOf(false) }
    var progress by remember { mutableFloatStateOf(0f) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!downloading) onDismiss() },
        title = { Text("Update available") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    "Version ${update.manifest.version_name} is available. " +
                    "You're on ${update.installedVersionName}.",
                )
                if (update.manifest.release_notes.isNotBlank()) {
                    Text(
                        "What's new",
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                    Text(
                        update.manifest.release_notes,
                        fontSize = 13.sp,
                    )
                }
                if (downloading) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    )
                    Text(
                        "Downloading… ${(progress * 100).toInt()} %",
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                    )
                }
                if (error != null) {
                    Text(
                        error!!,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !downloading,
                onClick = {
                    downloading = true
                    error = null
                    scope.launch {
                        runCatching {
                            val apk = checker.download(update) { progress = it }
                            checker.install(apk)
                        }.onFailure { t ->
                            error = t.localizedMessage ?: "Download failed."
                            downloading = false
                        }
                    }
                },
            ) { Text(if (downloading) "Updating…" else "Update") }
        },
        dismissButton = {
            TextButton(
                enabled = !downloading,
                onClick = onDismiss,
            ) { Text("Later") }
        },
    )
}

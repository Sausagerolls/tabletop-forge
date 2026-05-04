// CharacterPickerScreen — Kotlin mirror of ios/TableTopForge/Views/CharacterPickerView.swift.
//
// Shown when session_joined arrived but the player has no token AND we
// don't have a stored creatureId to spawn one with. Lists every
// creature owned by the player (filter=characters&player_owner=…) so
// they can adopt one. New-character creation goes through the web
// app — porting the full CreatureForm to Compose isn't worth blocking
// the rollout for.

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
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.tabletopforge.SocketHolder
import com.tabletopforge.data.AppJson
import com.tabletopforge.data.Creature
import com.tabletopforge.services.SessionStore
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.launch

@Composable
fun CharacterPickerScreen(store: SessionStore, socketHolder: SocketHolder) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var characters by remember { mutableStateOf<List<Creature>>(emptyList()) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        val base = store.baseUrl ?: return
        loading = true; error = null
        try {
            val http = HttpClient(OkHttp) { install(ContentNegotiation) { json(AppJson) } }
            val res = http.get("$base/api/creatures") {
                parameter("filter", "characters")
                parameter("player_owner", store.playerName.value)
            }
            if (!res.status.isSuccess()) {
                error = "Server ${res.status.value}"
            } else {
                characters = AppJson.decodeFromString(res.bodyAsText())
            }
            http.close()
        } catch (e: Exception) {
            error = e.message ?: "load failed"
        } finally { loading = false }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Choose Character", style = MaterialTheme.typography.titleLarge,
                 fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            IconButton(onClick = { scope.launch { load() } }) {
                Icon(Icons.Filled.Refresh, contentDescription = "Reload")
            }
        }
        Spacer(Modifier.height(8.dp))
        when {
            loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            error != null -> Text("Couldn't load: ${error!!}",
                color = MaterialTheme.colorScheme.error)
            characters.isEmpty() -> Text(
                "No characters yet. Open the session in the web app, " +
                "pick the name \"${store.playerName.value}\", and build your character. " +
                "It'll appear here automatically.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            else -> LazyColumn(modifier = Modifier.weight(1f)) {
                items(characters, key = { it.id }) { c ->
                    CharacterRow(creature = c, baseUrl = store.baseUrl) {
                        store.lastCreatureId.value = c.id
                        store.persist()
                        socketHolder.current?.selectCharacter(c)
                    }
                    HorizontalDivider()
                }
            }
        }
        TextButton(
            onClick = {
                socketHolder.current?.disconnect()
                store.loggedIn.value = false
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Cancel — back to login") }
    }
}

@Composable
private fun CharacterRow(creature: Creature, baseUrl: String?, onTap: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onTap).padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val portraitUrl = creature.image_path?.let { p -> baseUrl?.let { "$it/uploads/$p" } }
        if (portraitUrl != null) {
            AsyncImage(
                model = portraitUrl,
                contentDescription = null,
                modifier = Modifier.size(52.dp).clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            )
        } else {
            Icon(
                Icons.Filled.AccountCircle, contentDescription = null,
                modifier = Modifier.size(52.dp),
                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(creature.name ?: "(unnamed)", fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                creature.char_level?.takeIf { it > 0 }?.let {
                    Text("Lv $it", fontSize = 12.sp,
                         color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                creature.creature_type?.takeIf { it.isNotEmpty() }?.let {
                    Text(it, fontSize = 12.sp,
                         color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                creature.hit_points?.let {
                    Text("HP $it", fontSize = 12.sp, fontFamily = FontFamily.Monospace,
                         color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                creature.armor_class?.let {
                    Text("AC $it", fontSize = 12.sp, fontFamily = FontFamily.Monospace,
                         color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Icon(Icons.Filled.ChevronRight, contentDescription = null,
             tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

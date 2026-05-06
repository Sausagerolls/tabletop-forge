// HomeScreen — Kotlin mirror of ios/TableTopForge/Views/HomeView.swift.
//
// Bottom-bar nav between Stats / Abilities / Inventory / Spells /
// Dice & Settings, plus a Settings overflow + character-picker overlay
// when the server tells us we need to pick one.

package com.tabletopforge.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tabletopforge.SocketHolder
import com.tabletopforge.services.ApiClient
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore
import com.tabletopforge.services.UpdateBus
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText

private enum class Tab(val label: String) {
    Stats("Stats"), Abilities("Abilities"),
    Inventory("Inventory"), Spells("Spells"), DiceLight("Dice & Settings"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(store: SessionStore, socketHolder: SocketHolder, resourceStore: ResourceStore) {
    var tab by remember { mutableStateOf(Tab.Stats) }
    var showSettings by remember { mutableStateOf(false) }
    val sc = socketHolder.current
    val needsPick = sc?.needsCharacterSelection?.value == true
    if (needsPick) {
        CharacterPickerScreen(store = store, socketHolder = socketHolder)
        return
    }

    // ── Creature fetcher (mirror of iOS HomeView's .task(id: refreshKey)) ──
    // Resolves the creature_id from the player's token (or the
    // remembered lastCreatureId) and pulls the full creature row via
    // REST. Re-fires whenever playerTokenId changes, when the
    // remembered creatureId changes, or when the server pings us via
    // requestCreatureRefresh — covering both first-load and GM-side
    // edits to the sheet.
    val tokenId      = sc?.playerTokenId?.value
    val tokens       = sc?.tokens
    val refreshTick  = sc?.requestCreatureRefresh?.value ?: 0
    val rememberedId = store.lastCreatureId.value
    val resolvedCid: Int? = remember(tokenId, tokens?.size, rememberedId) {
        tokens?.firstOrNull { it.id == tokenId }?.creature_id ?: rememberedId
    }
    var creatureLoadError by remember { mutableStateOf<String?>(null) }
    // Bootstrap the screen with the cached creature (if any) so the
    // tabs render instantly while the live fetch is in flight. Live
    // fetch overwrites it as soon as it lands.
    LaunchedEffect(Unit) {
        if (sc?.creature?.value == null) {
            val json = store.cachedCreatureJson.value ?: return@LaunchedEffect
            try {
                val cached = com.tabletopforge.data.AppJson
                    .decodeFromString<com.tabletopforge.data.Creature>(json)
                sc?.creature?.value = cached
            } catch (_: Exception) {}
        }
    }

    LaunchedEffect(resolvedCid, refreshTick) {
        val cid  = resolvedCid ?: run {
            // If we have a cached creature, don't surface a confusing
            // "no character" banner — we're showing stale data from
            // the cache while the socket finishes joining.
            if (sc?.creature?.value == null) {
                creatureLoadError = "No character resolved yet — token id ${tokenId ?: "—"}, " +
                    "tokens loaded ${tokens?.size ?: 0}, lastCreatureId ${rememberedId ?: "—"}"
            }
            return@LaunchedEffect
        }
        val base = store.baseUrl ?: run {
            creatureLoadError = "Base URL is empty — check the Server field on login."
            return@LaunchedEffect
        }
        creatureLoadError = null
        try {
            val rawJson = io.ktor.client.HttpClient(io.ktor.client.engine.okhttp.OkHttp) { }
                .use { client -> client.get(base.trimEnd('/') + "/api/creatures/$cid").bodyAsText() }
            val fetched = com.tabletopforge.data.AppJson
                .decodeFromString<com.tabletopforge.data.Creature>(rawJson)
            sc?.creature?.value = fetched
            store.cacheCreatureJson(rawJson)
            if (store.lastCreatureId.value != cid) {
                store.lastCreatureId.value = cid
                store.persist()
            }
        } catch (e: Exception) {
            // Surface the real failure unless we still have a cached
            // sheet to show — better to read stale data than nothing.
            if (sc?.creature?.value == null) {
                creatureLoadError = "GET /api/creatures/$cid failed: " +
                    "${e::class.java.simpleName}: ${e.message ?: "(no message)"}"
            }
        }
    }
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == Tab.Stats,
                    onClick = { tab = Tab.Stats },
                    icon = { Icon(Icons.Filled.Favorite, contentDescription = null) },
                    label = { Text(Tab.Stats.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.Abilities,
                    onClick = { tab = Tab.Abilities },
                    icon = { Icon(Icons.Filled.AutoAwesome, contentDescription = null) },
                    label = { Text(Tab.Abilities.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.Inventory,
                    onClick = { tab = Tab.Inventory },
                    icon = { Icon(Icons.Filled.Inventory, contentDescription = null) },
                    label = { Text(Tab.Inventory.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.Spells,
                    onClick = { tab = Tab.Spells },
                    icon = { Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null) },
                    label = { Text(Tab.Spells.label) },
                )
                // OTA badge — show a dot on the Dice & Settings tab
                // when an update is waiting so the indicator is
                // visible regardless of which tab the user is on.
                val updateAvailable by UpdateBus.available
                NavigationBarItem(
                    selected = tab == Tab.DiceLight,
                    onClick = { tab = Tab.DiceLight },
                    icon = {
                        BadgedBox(badge = {
                            if (updateAvailable != null) Badge()
                        }) {
                            Icon(Icons.Filled.Casino, contentDescription = null)
                        }
                    },
                    label = { Text(Tab.DiceLight.label) },
                )
            }
        }
    ) { padding ->
        androidx.compose.foundation.layout.Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Visible diagnostics — only shows when the creature fetch
            // is still failing. Lets us see where in the chain things
            // are breaking instead of staring at "Loading character…".
            creatureLoadError?.let { msg ->
                androidx.compose.material3.Text(
                    text = msg,
                    color = androidx.compose.material3.MaterialTheme.colorScheme.onErrorContainer,
                    fontSize = androidx.compose.ui.unit.TextUnit(11f, androidx.compose.ui.unit.TextUnitType.Sp),
                    modifier = Modifier.fillMaxWidth()
                        .background(androidx.compose.material3.MaterialTheme.colorScheme.errorContainer)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
            Box(modifier = Modifier.fillMaxSize()) {
                when (tab) {
                    Tab.Stats     -> StatsScreen(store = store, socketHolder = socketHolder, resourceStore = resourceStore)
                    Tab.Abilities -> AbilitiesScreen(store = store, socketHolder = socketHolder)
                    Tab.Inventory -> InventoryScreen(store = store, socketHolder = socketHolder)
                    Tab.Spells    -> SpellsScreen(store = store, socketHolder = socketHolder)
                    Tab.DiceLight -> DiceLightScreen(store = store, socketHolder = socketHolder, resourceStore = resourceStore)
                }
            }
        }
    }

    if (showSettings) {
        val sheetState = rememberModalBottomSheetState()
        ModalBottomSheet(
            onDismissRequest = { showSettings = false },
            sheetState = sheetState,
        ) {
            SettingsScreen(store = store, socketHolder = socketHolder) { showSettings = false }
        }
    }
}

@Composable
private fun Placeholder(text: String) {
    Box(modifier = Modifier.fillMaxSize().padding(24.dp)) { Text(text) }
}

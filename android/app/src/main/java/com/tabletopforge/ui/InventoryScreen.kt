// InventoryScreen — Kotlin mirror of ios/TableTopForge/Views/InventoryView.swift.
//
// Three sections:
//   1. Currency — GP/SP/CP steppers, persisted via REST.
//   2. Light source — preset picker bound to the player's token.
//   3. Items grouped by type (Weapons / Armor / Gear / Magic Items),
//      each row collapsible to show damage / range / properties /
//      sheds-light data / freeform desc, with an Equip toggle.
//
// Persists via PUT /api/creatures/:id (handled by ApiClient).

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tabletopforge.SocketHolder
import com.tabletopforge.data.Creature
import com.tabletopforge.data.InventoryItem
import com.tabletopforge.data.LightPreset
import com.tabletopforge.services.ApiClient
import com.tabletopforge.services.SessionStore
import kotlinx.coroutines.launch

@Composable
fun InventoryScreen(store: SessionStore, socketHolder: SocketHolder) {
    val sc = socketHolder.current
    val creature = sc?.creature?.value
    val items = creature?.inventory ?: emptyList()
    val scope = rememberCoroutineScope()
    var saveError by remember { mutableStateOf<String?>(null) }

    if (creature == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Loading inventory…")
        }
        return
    }

    suspend fun persist(updates: Map<String, Any?>) {
        val base = store.baseUrl ?: return
        try {
            val updated = ApiClient(base).patchCreature(creature.id, updates)
            sc?.creature?.value = updated
            saveError = null
        } catch (e: Exception) { saveError = e.message }
    }

    fun bumpCurrency(field: String, delta: Int) {
        val current = when (field) {
            "currency_gp" -> creature.currency_gp ?: 0
            "currency_sp" -> creature.currency_sp ?: 0
            "currency_cp" -> creature.currency_cp ?: 0
            else -> 0
        }
        val next = (current + delta).coerceAtLeast(0)
        // Optimistic local patch for snappy UI
        sc?.creature?.value = when (field) {
            "currency_gp" -> creature.copy(currency_gp = next)
            "currency_sp" -> creature.copy(currency_sp = next)
            "currency_cp" -> creature.copy(currency_cp = next)
            else -> creature
        }
        scope.launch { persist(mapOf(field to next)) }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Currency
        item {
            Section("Currency") {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        CurrencyRow("Gold (GP)",   creature.currency_gp ?: 0, Color(0xFFFBBF24)) { bumpCurrency("currency_gp", it) }
                        CurrencyRow("Silver (SP)", creature.currency_sp ?: 0, Color(0xFFCBD5E1)) { bumpCurrency("currency_sp", it) }
                        CurrencyRow("Copper (CP)", creature.currency_cp ?: 0, Color(0xFFD9A066)) { bumpCurrency("currency_cp", it) }
                    }
                }
            }
        }

        // Light source
        val tokenId = sc?.playerTokenId?.value
        if (tokenId != null) {
            item {
                Section("Light Source") {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            val opts = availablePresets(items)
                            if (opts.size == 1) {
                                Text(
                                    "Add a torch, lantern, or candle (or any sheds_light item) to your inventory to enable a light source.",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            // Match the active token's bright/dim against
                            // the available options; mirror of iOS's
                            // currentLightId so the checkmark shows on
                            // the same row both apps would highlight.
                            val playerToken = sc?.tokens?.firstOrNull { it.id == tokenId }
                            val tokBright = playerToken?.token_light_bright ?: 0.0
                            val tokDim    = playerToken?.token_light_dim    ?: 0.0
                            val activeId = if (tokBright == 0.0 && tokDim == 0.0) {
                                opts.firstOrNull()?.id
                            } else {
                                opts.firstOrNull {
                                    kotlin.math.abs(it.brightFt - tokBright) < 0.5 &&
                                    kotlin.math.abs(it.dimFt    - tokDim)    < 0.5
                                }?.id
                            }
                            for (opt in opts) {
                                val isActive = opt.id == activeId
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable {
                                        sc.emitRawSetTokenLight(mapOf(
                                            "tokenId" to tokenId,
                                            "brightFt" to opt.brightFt,
                                            "dimFt" to opt.dimFt,
                                            "color" to (opt.color ?: "#fbbf24"),
                                            "flicker" to opt.flicker,
                                        ))
                                    }
                                    .background(
                                        if (isActive) Color(0xFFFBBF24).copy(alpha = 0.12f)
                                        else Color.Transparent
                                    )
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(Icons.Filled.Lightbulb, contentDescription = null,
                                        tint = if (opt.brightFt == 0.0 && opt.dimFt == 0.0)
                                            MaterialTheme.colorScheme.onSurfaceVariant
                                        else Color(0xFFFBBF24))
                                    Text(
                                        opt.label,
                                        modifier = Modifier.weight(1f),
                                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                    if (opt.brightFt > 0 || opt.dimFt > 0) {
                                        Text("${opt.brightFt.toInt()}/${opt.dimFt.toInt()} ft",
                                            fontFamily = FontFamily.Monospace, fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    if (isActive) {
                                        Icon(Icons.Filled.Check, contentDescription = "Active",
                                            tint = Color(0xFFFBBF24))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Items grouped by type
        val groups = items.groupBy { (it.item_type ?: "item").lowercase() }
        val typeOrder = listOf("weapon", "armor", "magic_item", "item")
        for (type in typeOrder) {
            val group = groups[type] ?: continue
            if (group.isEmpty()) continue
            item {
                Section(typeLabel(type)) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column { group.forEachIndexed { i, it -> ItemRow(it); if (i < group.lastIndex) HorizontalDivider() } }
                    }
                }
            }
        }
        // Anything in an unrecognized type bucket
        for ((type, group) in groups) {
            if (type in typeOrder) continue
            item {
                Section(typeLabel(type)) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column { group.forEachIndexed { i, it -> ItemRow(it); if (i < group.lastIndex) HorizontalDivider() } }
                    }
                }
            }
        }

        if (saveError != null) {
            item {
                Text("Save error: $saveError",
                    color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun Section(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        content()
    }
}

@Composable
private fun CurrencyRow(label: String, value: Int, tint: Color, onDelta: (Int) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(12.dp).clip(RoundedCornerShape(2.dp)).background(tint))
        Spacer(Modifier.width(8.dp))
        Text(label, modifier = Modifier.weight(1f))
        IconButton(onClick = { onDelta(-1) }) { Icon(Icons.Filled.Remove, contentDescription = "Decrease $label") }
        Text("$value", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 8.dp))
        IconButton(onClick = { onDelta(+1) }) { Icon(Icons.Filled.Add, contentDescription = "Increase $label") }
    }
}

@Composable
private fun ItemRow(item: InventoryItem) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name ?: "(unnamed)", fontWeight = FontWeight.SemiBold)
                val sub = buildList {
                    item.qty?.takeIf { it > 1 }?.let { add("×$it") }
                    item.weight?.takeIf { it > 0 }?.let { add("${it} lb") }
                    item.rarity?.takeIf { it.isNotEmpty() }?.let { add(it) }
                    item.weapon_range?.takeIf { it.isNotEmpty() }?.let { add(it) }
                }
                if (sub.isNotEmpty()) {
                    Text(sub.joinToString(" · "), fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Icon(
                imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = if (expanded) "Collapse" else "Expand",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (expanded) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp).padding(bottom = 8.dp)) {
                item.damage_entries?.forEach { d ->
                    Text("Damage: ${d.damage ?: ""} ${d.damage_type ?: ""}".trim(),
                        fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                }
                item.properties?.takeIf { it.isNotEmpty() }?.let {
                    Text("Properties: $it", fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item.mastery?.takeIf { it.isNotEmpty() }?.let {
                    Text("Mastery: $it", fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item.ac_base?.takeIf { it > 0 }?.let {
                    Text("AC: $it ${item.armor_category ?: ""}", fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item.desc?.takeIf { it.isNotEmpty() }?.let {
                    Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (item.item_type == "weapon" || item.item_type == "armor" || item.item_type == "magic_item") {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Equipped", modifier = Modifier.weight(1f))
                        Switch(checked = item.equipped == true, onCheckedChange = { /* TODO: persist via PUT */ })
                    }
                }
            }
        }
    }
}

private fun typeLabel(type: String) = when (type) {
    "weapon" -> "Weapons"
    "armor" -> "Armor"
    "magic_item" -> "Magic Items"
    "item" -> "Gear"
    "gear" -> "Gear"
    else -> type.replaceFirstChar(Char::uppercase)
}

// Mirror of the iOS InventoryView's availablePresets — name-keyword
// match against base presets (Candle/Torch/Lantern), plus surface any
// custom sheds_light items as their own row. "No Light" always shown.
data class LightOption(
    val id: String,
    val label: String,
    val brightFt: Double,
    val dimFt: Double,
    val flicker: Boolean,
    val color: String? = null,
    val isCustom: Boolean = false,
)

private fun availablePresets(items: List<InventoryItem>): List<LightOption> {
    val out = mutableListOf<LightOption>()
    fun fromPreset(p: LightPreset, idPrefix: String = "preset") = LightOption(
        id = "$idPrefix-${p.id}", label = p.label,
        brightFt = p.brightFt, dimFt = p.dimFt, flicker = p.flicker,
    )
    out += fromPreset(LightPreset.ALL[0])  // No Light
    val baseKeywords = listOf(
        LightPreset.ALL[1] to "candle",
        LightPreset.ALL[2] to "torch",
        LightPreset.ALL[3] to "lantern",
    )
    for ((preset, keyword) in baseKeywords) {
        if (items.any { (it.name ?: "").contains(keyword, ignoreCase = true) }) {
            out += fromPreset(preset)
        }
    }
    val baseKeywordSet = baseKeywords.map { it.second }.toSet()
    for (item in items) {
        if (item.sheds_light != true) continue
        val name = item.name?.takeIf { it.isNotEmpty() } ?: continue
        val lower = name.lowercase()
        if (baseKeywordSet.any { lower.contains(it) }) continue
        out += LightOption(
            id = "custom-$name",
            label = name,
            brightFt = item.bright_ft ?: 0.0,
            dimFt = item.dim_ft ?: 0.0,
            flicker = item.flicker ?: true,
            color = item.light_color,
            isCustom = true,
        )
    }
    return out
}


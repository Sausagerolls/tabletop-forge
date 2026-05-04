// SpellsScreen — Kotlin mirror of ios/TableTopForge/Views/SpellsView.swift.
//
// Three sections:
//   1. Spellcasting modifiers — per casting ability that's actually
//      used by at least one of the character's prepared spells.
//   2. Prepared spells grouped by level, with a per-level slot tracker
//      (one circle per slot, tap toggles used/available).
//   3. Collapsible "All known spells" — every spell on the creature.
//
// Slot-toggle persistence (PUT spell_slots) follows on a future pass.

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.tabletopforge.data.Spell
import com.tabletopforge.services.SessionStore

@Composable
fun SpellsScreen(store: SessionStore, socketHolder: SocketHolder) {
    val sc = socketHolder.current
    val c = sc?.creature?.value
    val all = c?.spells ?: emptyList()
    val prepared = all.filter { (it.prepared ?: false) || (it.level ?: 0) == 0 }

    if (c == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Loading spells…")
        }
        return
    }
    if (all.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text("No spells. Add some via the web character editor.",
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    val levels = (prepared.mapNotNull { it.level }.toSet() +
        (c.spell_slots?.keys?.mapNotNull { it.toIntOrNull() } ?: emptyList())).sorted()

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        val abilities = usedCastingAbilities(prepared)
        if (abilities.isNotEmpty()) {
            item {
                Section("Spellcasting") {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            for (ab in abilities) ModifierRow(ab, c)
                        }
                    }
                }
            }
        }

        for (lvl in levels) {
            val list = prepared.filter { (it.level ?: 0) == lvl }
            if (list.isEmpty() && (c.spell_slots?.get(lvl.toString())?.total ?: 0) == 0) continue
            item {
                Section(if (lvl == 0) "Cantrips" else levelLabel(lvl)) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column {
                            // Slot tracker — only shown for level >= 1
                            if (lvl > 0) {
                                val slot = c.spell_slots?.get(lvl.toString())
                                val total = slot?.total ?: 0
                                val used  = slot?.used ?: 0
                                if (total > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        Text("Slots", fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        for (i in 0 until total) {
                                            Box(modifier = Modifier.size(14.dp).clip(CircleShape)
                                                .background(if (i < used)
                                                    Color.Gray.copy(alpha = 0.4f)
                                                else MaterialTheme.colorScheme.primary))
                                        }
                                        Spacer(Modifier.weight(1f))
                                        Text("${total - used}/$total",
                                            fontFamily = FontFamily.Monospace, fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    HorizontalDivider()
                                }
                            }
                            list.forEachIndexed { i, sp ->
                                SpellRow(sp)
                                if (i < list.lastIndex) HorizontalDivider()
                            }
                        }
                    }
                }
            }
        }

        // All known spells (collapsible). `remember` has to live inside
        // the item lambda — LazyColumn's content scope isn't @Composable.
        item {
            var allOpen by remember { mutableStateOf(false) }
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { allOpen = !allOpen }
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("All known spells (${all.size})", fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f))
                    Icon(if (allOpen) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (allOpen) {
                    Column {
                        all.sortedBy { it.level ?: 0 }.forEachIndexed { i, sp ->
                            SpellRow(sp); if (i < all.lastIndex) HorizontalDivider()
                        }
                    }
                }
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
private fun ModifierRow(ability: String, c: Creature) {
    val mod = abilityMod(ability, c)
    val pb = c.proficiency_bonus ?: (((c.char_level ?: 1) - 1) / 4 + 2)
    val dc = 8 + pb + mod
    val atk = pb + mod
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(ability, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary, modifier = Modifier.width(40.dp))
        Pill("Mod", signed(mod))
        Pill("Save DC", "$dc")
        Pill("Atk", signed(atk))
    }
}

@Composable
private fun Pill(label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SpellRow(sp: Spell) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(sp.name ?: "(unnamed)", fontWeight = FontWeight.SemiBold)
                val sub = buildList {
                    sp.school?.takeIf { it.isNotEmpty() }?.let { add(it) }
                    sp.casting_time?.takeIf { it.isNotEmpty() }?.let { add(it) }
                    if (sp.concentration == true) add("Concentration")
                    if (sp.ritual == true) add("Ritual")
                }
                if (sub.isNotEmpty()) {
                    Text(sub.joinToString(" · "), fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Icon(if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (expanded) {
            Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)) {
                sp.range_area?.takeIf { it.isNotEmpty() }?.let {
                    Text("Range: $it", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                sp.duration?.takeIf { it.isNotEmpty() }?.let {
                    Text("Duration: $it", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                sp.attack_save?.takeIf { it.isNotEmpty() }?.let {
                    Text("Attack/Save: $it", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                sp.damage_entries?.forEach { d ->
                    Text("Damage: ${d.damage ?: ""} ${d.damage_type ?: ""}".trim(),
                        fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                }
                sp.description?.takeIf { it.isNotEmpty() }?.let {
                    Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

private fun signed(v: Int) = if (v >= 0) "+$v" else "$v"

private fun levelLabel(lvl: Int) = when (lvl) {
    1 -> "1st level"; 2 -> "2nd level"; 3 -> "3rd level"
    else -> "${lvl}th level"
}

private fun usedCastingAbilities(prepared: List<Spell>): List<String> {
    val raw = prepared.mapNotNull { it.casting_ability?.uppercase() }
    val order = listOf("STR", "DEX", "CON", "INT", "WIS", "CHA")
    return order.filter { it in raw }
}

private fun abilityMod(ability: String, c: Creature): Int {
    val raw = when (ability) {
        "STR" -> c.strength;     "DEX" -> c.dexterity;    "CON" -> c.constitution
        "INT" -> c.intelligence; "WIS" -> c.wisdom;       "CHA" -> c.charisma
        else -> 10
    } ?: 10
    return (raw - 10) / 2
}

// AbilitiesScreen — Kotlin mirror of ios/TableTopForge/Views/AbilitiesView.swift.
//
// Combined Abilities + Skills tab. Top: 3×2 ability score grid with
// modifier + save proficiency dot. Middle: every D&D 5e skill, each
// row showing prof dot + bonus. Bottom: Proficiencies panel listing
// armor / weapons / tools.

package com.tabletopforge.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.tabletopforge.services.SessionStore

@Composable
fun AbilitiesScreen(store: SessionStore, socketHolder: SocketHolder) {
    val c = socketHolder.current?.creature?.value
    if (c == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Loading character…")
        }
        return
    }
    Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
           verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AbilityGrid(c)
        SkillsList(c)
        ProficienciesPanel(c)
    }
}

@Composable
private fun AbilityGrid(c: Creature) {
    val cells = listOf(
        AbilityCell("STR", c.strength,    c.save_str),
        AbilityCell("DEX", c.dexterity,   c.save_dex),
        AbilityCell("CON", c.constitution,c.save_con),
        AbilityCell("INT", c.intelligence,c.save_int),
        AbilityCell("WIS", c.wisdom,      c.save_wis),
        AbilityCell("CHA", c.charisma,    c.save_cha),
    )
    // Two rows of three cells each. Plain Row + Modifier.weight(1f) per
    // cell, no fixed height — cells grow to fit their content so
    // longer "+15" save lines don't get clipped.
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        for (rowCells in cells.chunked(3)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                for (cell in rowCells) {
                    Box(modifier = Modifier.weight(1f)) {
                        AbilityCellView(cell)
                    }
                }
            }
        }
    }
}

private data class AbilityCell(val label: String, val score: Int?, val save: Int?)

@Composable
private fun AbilityCellView(cell: AbilityCell) {
    val mod = cell.score?.let { (it - 10) / 2 }
    val modText = mod?.let { if (it >= 0) "+$it" else "$it" } ?: "—"
    val saveText = (cell.save?.let { if (it >= 0) "+$it" else "$it" }) ?: modText
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(cell.label, fontFamily = FontFamily.Monospace,
             fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
             color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(cell.score?.toString() ?: "—",
             fontWeight = FontWeight.Bold, fontSize = 28.sp)
        Text(modText, fontFamily = FontFamily.Monospace, fontSize = 14.sp,
             color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
            // Save-proficiency dot.
            Box(
                modifier = Modifier.size(8.dp).clip(CircleShape)
                    .background(if (cell.save != null) MaterialTheme.colorScheme.primary
                                else Color.Gray.copy(alpha = 0.5f))
            )
            Text("Save $saveText", fontFamily = FontFamily.Monospace, fontSize = 11.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ── Skills ────────────────────────────────────────────────────────

private data class Skill(val key: String, val label: String, val stat: String, val read: (Creature) -> Int?)

private val ALL_SKILLS = listOf(
    Skill("skill_acrobatics",      "Acrobatics",      "DEX") { it.skill_acrobatics },
    Skill("skill_animal_handling", "Animal Handling", "WIS") { it.skill_animal_handling },
    Skill("skill_arcana",          "Arcana",          "INT") { it.skill_arcana },
    Skill("skill_athletics",       "Athletics",       "STR") { it.skill_athletics },
    Skill("skill_deception",       "Deception",       "CHA") { it.skill_deception },
    Skill("skill_history",         "History",         "INT") { it.skill_history },
    Skill("skill_insight",         "Insight",         "WIS") { it.skill_insight },
    Skill("skill_intimidation",    "Intimidation",    "CHA") { it.skill_intimidation },
    Skill("skill_investigation",   "Investigation",   "INT") { it.skill_investigation },
    Skill("skill_medicine",        "Medicine",        "WIS") { it.skill_medicine },
    Skill("skill_nature",          "Nature",          "INT") { it.skill_nature },
    Skill("skill_perception",      "Perception",      "WIS") { it.skill_perception },
    Skill("skill_performance",     "Performance",     "CHA") { it.skill_performance },
    Skill("skill_persuasion",      "Persuasion",      "CHA") { it.skill_persuasion },
    Skill("skill_religion",        "Religion",        "INT") { it.skill_religion },
    Skill("skill_sleight_of_hand", "Sleight of Hand", "DEX") { it.skill_sleight_of_hand },
    Skill("skill_stealth",         "Stealth",         "DEX") { it.skill_stealth },
    Skill("skill_survival",        "Survival",        "WIS") { it.skill_survival },
)

@Composable
private fun SkillsList(c: Creature) {
    Column {
        Text("Skills", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(4.dp))
        Column(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
                .padding(vertical = 4.dp),
        ) {
            ALL_SKILLS.forEachIndexed { idx, sk ->
                SkillRow(sk, c)
                if (idx < ALL_SKILLS.lastIndex) {
                    HorizontalDivider(modifier = Modifier.padding(start = 28.dp))
                }
            }
        }
    }
}

@Composable
private fun SkillRow(sk: Skill, c: Creature) {
    val stored = sk.read(c)
    val isProf = stored != null
    val isExpert = c.skill_expertise?.get(sk.key) == true
    val rawStat = when (sk.stat) {
        "STR" -> c.strength;     "DEX" -> c.dexterity;    "CON" -> c.constitution
        "INT" -> c.intelligence; "WIS" -> c.wisdom;       "CHA" -> c.charisma
        else -> 10
    } ?: 10
    val baseMod = (rawStat - 10) / 2
    val bonus = stored ?: baseMod
    val bonusStr = if (bonus >= 0) "+$bonus" else "$bonus"
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Proficiency dot
        Box(
            modifier = Modifier.size(12.dp).clip(CircleShape).background(
                when {
                    isExpert -> Color(0xFFFBBF24)                       // Yellow ringed
                    isProf   -> MaterialTheme.colorScheme.primary
                    else     -> Color.Gray.copy(alpha = 0.5f)
                }
            )
        )
        Text(sk.label)
        Text("(${sk.stat})", fontFamily = FontFamily.Monospace, fontSize = 11.sp,
             color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1f))
        Text(bonusStr, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold,
             color = if (isProf) MaterialTheme.colorScheme.onSurface
                      else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ── Proficiencies ─────────────────────────────────────────────────

@Composable
private fun ProficienciesPanel(c: Creature) {
    val armorParts = buildList {
        if (c.prof_light_armor  == true) add("Light")
        if (c.prof_medium_armor == true) add("Medium")
        if (c.prof_heavy_armor  == true) add("Heavy")
        if (c.prof_shields      == true) add("Shields")
    }
    val weaponList = (c.weapon_proficiencies ?: "").split(",")
        .map { it.trim() }.filter { it.isNotEmpty() }
    val toolList = (c.tool_proficiencies ?: "").split(",")
        .map { it.trim() }.filter { it.isNotEmpty() }
    if (armorParts.isEmpty() && weaponList.isEmpty() && toolList.isEmpty()) return

    Column {
        Text("Proficiencies", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(4.dp))
        Column(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
                .padding(vertical = 4.dp),
        ) {
            if (armorParts.isNotEmpty()) {
                ProficiencyRow("Armor & Shields", armorParts, Icons.Filled.Shield)
                HorizontalDivider(modifier = Modifier.padding(start = 28.dp))
            }
            if (weaponList.isNotEmpty()) {
                ProficiencyRow("Weapons", weaponList, Icons.Filled.GpsFixed)
                HorizontalDivider(modifier = Modifier.padding(start = 28.dp))
            }
            if (toolList.isNotEmpty()) {
                ProficiencyRow("Tools", toolList, Icons.Filled.Build)
            }
        }
    }
}

@Composable
private fun ProficiencyRow(label: String, items: List<String>, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp).padding(top = 2.dp),
             tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Column {
            Text(label, fontSize = 14.sp)
            Text(items.joinToString(", "), fontSize = 12.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// items helper — local LazyVerticalGrid items needs the indexed variant
private fun <T> androidx.compose.foundation.lazy.grid.LazyGridScope.items(
    items: List<T>,
    key: (T) -> Any,
    content: @Composable (T) -> Unit,
) {
    items(items.size, key = { i -> key(items[i]) }) { i -> content(items[i]) }
}

// StatsScreen — Kotlin mirror of ios/TableTopForge/Views/StatsView.swift.
//
// The headline player tab. Layout:
//   1. Identity card (portrait, name, level/class, race/background,
//      languages, Heroic Inspiration tap-to-toggle)
//   2. Vitals (HP / Temp HP +/- + HP bar) — drives socket emits
//   3. Hit dice tracker
//   4. Death saves (only when current_hp == 0)
//   5. Combat cells (AC, Initiative, Passive Perception, Prof Bonus)
//      + every non-zero movement speed + concentration line
//   6. Equipped weapons (one row per item_type=='weapon' && equipped)
//   7. Collapsible stat-block sections (class features, feats, special
//      abilities, actions, bonus actions, reactions, movement, legendary)
//   8. Conditions (capsule chips)
//   9. GM whispers (with per-row dismiss)

package com.tabletopforge.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.tabletopforge.SocketHolder
import com.tabletopforge.data.Creature
import com.tabletopforge.data.DiceRollRequest
import com.tabletopforge.data.HitDicePoolEntry
import com.tabletopforge.data.InventoryItem
import com.tabletopforge.data.StatAction
import com.tabletopforge.data.Token
import com.tabletopforge.data.computeHitDicePool
import com.tabletopforge.data.resourcesFor
import com.tabletopforge.services.ApiClient
import com.tabletopforge.services.ResourceStore
import com.tabletopforge.services.SessionStore
import kotlin.random.Random
import kotlinx.coroutines.launch

@Composable
fun StatsScreen(store: SessionStore, socketHolder: SocketHolder, resourceStore: ResourceStore) {
    val sc = socketHolder.current
    val creature = sc?.creature?.value
    val tokenId = sc?.playerTokenId?.value
    val token = sc?.tokens?.firstOrNull { it.id == tokenId }
    val scope = rememberCoroutineScope()
    var saveError by remember { mutableStateOf<String?>(null) }
    val clearedWhispers = remember { mutableStateOf(setOf<Long>()) }

    if (creature == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Loading character…")
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

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // 1. Identity card
        item {
            IdentityCard(
                creature = creature,
                token = token,
                playerName = store.playerName.value,
                baseUrl = store.baseUrl,
                onToggleInspiration = {
                    val next = !(creature.heroic_inspiration ?: false)
                    sc?.creature?.value = creature.copy(heroic_inspiration = next)
                    scope.launch { persist(mapOf("heroic_inspiration" to next)) }
                },
            )
        }

        // 2. Vitals
        if (token != null) {
            item { Section("Hit Points") {
                VitalsCard(
                    token = token,
                    onHpChange = { sc?.emitHpChange(token.id, it) },
                    onTempHpChange = { sc?.emitTempHp(token.id, it) },
                )
            } }
        }

        // 3. Hit Dice — multi-class pool. One row per die type derived
        // from char_class + multiclasses, plus a single "Use Hit Die"
        // button. When more than one die type is available the button
        // opens a chooser dialog; with one type it spends immediately.
        val hdPool = computeHitDicePool(creature)
        if (hdPool.isNotEmpty()) {
            item { Section("Hit Dice") {
                HitDicePoolCard(
                    pool = hdPool,
                    creature = creature,
                    token = token,
                    onSpend = { type ->
                        val faces = type.removePrefix("d").toIntOrNull() ?: 8
                        val roll = Random.nextInt(1, faces + 1)
                        val mod = (((creature.constitution ?: 10) - 10) / 2)
                        val healed = (roll + mod).coerceAtLeast(0)
                        val usedMap = creature.hit_dice_used_by_type.orEmpty()
                        val qty = hdPool.firstOrNull { it.type == type }?.qty ?: 0
                        val nextForType = ((usedMap[type] ?: 0) + 1).coerceAtMost(qty)
                        val nextMap = usedMap.toMutableMap().apply { put(type, nextForType) }
                        sc?.creature?.value = creature.copy(hit_dice_used_by_type = nextMap)
                        scope.launch { persist(mapOf("hit_dice_used_by_type" to nextMap)) }
                        if (token != null && healed > 0) {
                            val newHp = ((token.current_hp ?: 0) + healed)
                                .coerceAtMost(token.max_hp ?: 0)
                            sc.emitHpChange(token.id, newHp)
                        }
                        sc?.emitDiceRoll(DiceRollRequest(
                            dice = faces, count = 1, modifier = mod,
                            label = "Hit Die ($type${if (mod >= 0) "+$mod" else "$mod"}) — heal",
                        ))
                    },
                    onRestore = { type ->
                        val usedMap = creature.hit_dice_used_by_type.orEmpty()
                        val nextForType = ((usedMap[type] ?: 0) - 1).coerceAtLeast(0)
                        val nextMap = usedMap.toMutableMap().apply { put(type, nextForType) }
                        sc?.creature?.value = creature.copy(hit_dice_used_by_type = nextMap)
                        scope.launch { persist(mapOf("hit_dice_used_by_type" to nextMap)) }
                    },
                )
            } }
        }

        // 4. Death Saves — auto-roll fills the right pip; nat-1 / nat-20 honoured.
        if ((token?.current_hp ?: -1) == 0) {
            item { Section("Death Saves") {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        DeathSaveRow("Successes", Color(0xFF22C55E), creature.death_save_successes ?: 0) { n ->
                            sc?.creature?.value = creature.copy(death_save_successes = n)
                            scope.launch { persist(mapOf("death_save_successes" to n)) }
                        }
                        DeathSaveRow("Failures",  Color(0xFFEF4444), creature.death_save_failures ?: 0) { n ->
                            sc?.creature?.value = creature.copy(death_save_failures = n)
                            scope.launch { persist(mapOf("death_save_failures" to n)) }
                        }
                        androidx.compose.material3.Button(
                            onClick = {
                                val roll = Random.nextInt(1, 21)
                                var s = creature.death_save_successes ?: 0
                                var f = creature.death_save_failures ?: 0
                                val updates = mutableMapOf<String, Any?>()
                                when {
                                    roll == 20 -> {
                                        // Jump back to 1 HP, reset both counters.
                                        s = 0; f = 0
                                        if (token != null) sc?.emitHpChange(token.id, 1)
                                    }
                                    roll == 1 -> { f = (f + 2).coerceAtMost(3) }
                                    roll >= 10 -> { s = (s + 1).coerceAtMost(3) }
                                    else -> { f = (f + 1).coerceAtMost(3) }
                                }
                                updates["death_save_successes"] = s
                                updates["death_save_failures"] = f
                                sc?.creature?.value = creature.copy(
                                    death_save_successes = s,
                                    death_save_failures = f,
                                )
                                scope.launch { persist(updates) }
                                sc?.emitDiceRoll(DiceRollRequest(
                                    dice = 20, count = 1, modifier = 0,
                                    label = when {
                                        roll == 20 -> "Death Save — Nat 20! (revive at 1 HP)"
                                        roll == 1  -> "Death Save — Nat 1 (2 failures)"
                                        roll >= 10 -> "Death Save — success"
                                        else       -> "Death Save — failure"
                                    },
                                ))
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("Roll Death Save") }
                    }
                }
            } }
        }

        // 4b. Class resources (Bardic Inspiration / Ki / Sorcery Points / etc.)
        val resources = resourcesFor(creature)
        if (resources.isNotEmpty()) {
            item { Section("Resources") {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        for ((def, total) in resources) {
                            val usedState = resourceStore.used(creature.id, def.id)
                            val used = usedState.value
                            val totalLabel = if (total >= Int.MAX_VALUE / 2) "∞" else total.toString()
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(def.label, fontWeight = FontWeight.SemiBold)
                                    if (def.note != null) {
                                        Text(def.note, fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                IconButton(
                                    enabled = used < total,
                                    onClick = { resourceStore.bump(creature.id, def.id, +1, total) },
                                ) { Icon(Icons.Filled.Remove, contentDescription = "Use one ${def.label}") }
                                Text("${(total - used).coerceAtLeast(0)} / $totalLabel",
                                    fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.width(80.dp).wrapContentWidth(Alignment.CenterHorizontally))
                                IconButton(
                                    enabled = used > 0,
                                    onClick = { resourceStore.bump(creature.id, def.id, -1, total) },
                                ) { Icon(Icons.Filled.Add, contentDescription = "Restore one ${def.label}") }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            androidx.compose.material3.OutlinedButton(
                                onClick = { resourceStore.resetAll(creature.id) },
                                modifier = Modifier.weight(1f),
                            ) { Text("Reset all (long rest)") }
                        }
                    }
                }
            } }
        }

        // 5. Combat
        item { Section("Combat") { CombatCard(creature) } }

        // 6. Equipped weapons
        val weapons = (creature.inventory ?: emptyList()).filter {
            it.item_type == "weapon" && it.equipped == true
        }
        if (weapons.isNotEmpty()) {
            item { Section("Equipped Weapons") {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        weapons.forEachIndexed { i, w ->
                            EquippedWeaponRow(w, attackBonus(w, creature))
                            if (i < weapons.lastIndex) HorizontalDivider()
                        }
                    }
                }
            } }
        }

        // 7. Stat-block sections (each collapsible)
        val groups = listOf(
            "Class Features"   to creature.class_features,
            "Feats"            to creature.feats,
            "Special Abilities" to creature.special_abilities,
            "Actions"          to creature.actions,
            "Bonus Actions"    to creature.bonus_actions,
            "Reactions"        to creature.reactions,
            "Movement"         to creature.movement_actions,
            "Legendary Actions" to creature.legendary_actions,
        )
        for ((title, entries) in groups) {
            if (entries.isNullOrEmpty()) continue
            item { CollapsibleStatBlockSection(title, entries) }
        }

        // 8. Conditions
        val conditions = token?.conditions ?: emptyList()
        if (conditions.isNotEmpty()) {
            item { Section("Conditions") {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        conditions.forEach { c ->
                            Box(
                                modifier = Modifier.clip(RoundedCornerShape(50))
                                    .background(Color(0xFFEF4444).copy(alpha = 0.15f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(c.replaceFirstChar(Char::uppercase),
                                    color = Color(0xFFEF4444), fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            } }
        }

        // 9. Whispers (last 10, dismissable)
        val whispers = sc?.whispers
            ?.filter { it.id !in clearedWhispers.value }
            ?.takeLast(10)
            ?: emptyList()
        if (whispers.isNotEmpty()) {
            item {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("GM whispers", style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        TextButton(onClick = {
                            clearedWhispers.value = (sc?.whispers?.map { it.id } ?: emptyList()).toSet()
                        }) { Text("Clear all", fontSize = 12.sp) }
                    }
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column {
                            whispers.forEachIndexed { i, w ->
                                Row(
                                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                    verticalAlignment = Alignment.Top,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(Icons.Filled.Email, contentDescription = null,
                                        tint = Color(0xFF8B5CF6))
                                    Text(w.message, modifier = Modifier.weight(1f), fontSize = 14.sp)
                                    IconButton(onClick = {
                                        clearedWhispers.value = clearedWhispers.value + w.id
                                    }) {
                                        Icon(Icons.Filled.Cancel, contentDescription = "Dismiss",
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                if (i < whispers.lastIndex) HorizontalDivider()
                            }
                        }
                    }
                }
            }
        }

        if (saveError != null) {
            item {
                Text("Save error: $saveError", fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.error)
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
private fun IdentityCard(
    creature: Creature,
    token: Token?,
    playerName: String,
    baseUrl: String?,
    onToggleInspiration: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            val portraitUrl = creature.image_path?.let { p -> baseUrl?.let { "$it/uploads/$p" } }
            Box(
                modifier = Modifier.size(110.dp).clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .clickable(onClick = onToggleInspiration)
                    .border(
                        width = if (creature.heroic_inspiration == true) 3.dp else 2.dp,
                        color = if (creature.heroic_inspiration == true) Color(0xFFFBBF24)
                                else MaterialTheme.colorScheme.primary.copy(alpha = 0.4f),
                        shape = CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (portraitUrl != null) {
                    AsyncImage(model = portraitUrl, contentDescription = null,
                        modifier = Modifier.fillMaxSize().clip(CircleShape))
                } else {
                    Icon(Icons.Filled.AccountCircle, contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f))
                }
            }
            val displayName = creature.name ?: token?.nickname ?: token?.name ?: playerName
            Text(displayName, fontWeight = FontWeight.Bold, fontSize = 22.sp,
                textAlign = TextAlign.Center)
            identitySubtitle(creature)?.let {
                Text(it, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center)
            }
            raceLine(creature)?.let {
                Text(it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center)
            }
            creature.languages?.takeIf { it.isNotEmpty() }?.let {
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Languages:", fontWeight = FontWeight.SemiBold, fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (creature.heroic_inspiration == true) {
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Filled.Star, contentDescription = null,
                        tint = Color(0xFFFBBF24), modifier = Modifier.size(16.dp))
                    Text("Heroic Inspiration active — tap avatar to spend",
                        fontSize = 11.sp, color = Color(0xFFFBBF24))
                }
            }
        }
    }
}

private fun identitySubtitle(c: Creature): String? {
    val parts = mutableListOf<String>()
    c.char_level?.takeIf { it > 0 }?.let { parts += "Level $it" }
    c.char_class?.takeIf { it.isNotEmpty() }?.let { parts += it }
    c.char_subclass?.takeIf { it.isNotEmpty() }?.let { parts += "($it)" }
    return parts.takeIf { it.isNotEmpty() }?.joinToString(" ")
}

private fun raceLine(c: Creature): String? {
    val parts = mutableListOf<String>()
    c.subtype?.takeIf { it.isNotEmpty() }?.let { parts += it }
    backgroundDisplayName(c)?.let { parts += it }
    c.alignment?.takeIf { it.isNotEmpty() }?.let { parts += it }
    return parts.takeIf { it.isNotEmpty() }?.joinToString(" · ")
}

private fun backgroundDisplayName(c: Creature): String? {
    val raw = c.background?.takeIf { it.isNotEmpty() } ?: return null
    val trimmed = raw.replace("-2024", "").replace("-2014", "")
    if (trimmed.length == 36 && trimmed.contains("-")) return null
    return if (trimmed.contains("-") && trimmed.length <= 30) {
        trimmed.split("-").joinToString(" ") { it.replaceFirstChar(Char::uppercase) }
    } else {
        trimmed.replaceFirstChar(Char::uppercase)
    }
}

@Composable
private fun VitalsCard(
    token: Token,
    onHpChange: (Int) -> Unit,
    onTempHpChange: (Int) -> Unit,
) {
    val cur = token.current_hp ?: 0
    val max = token.max_hp ?: 1
    val temp = token.temp_hp ?: 0
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Both rows share the same column structure (label / − / value
            // / +). The value column uses a fixed 96dp width so the +/-
            // buttons line up vertically across rows regardless of digit
            // count. Centering happens within that fixed slot.
            HpStepperRow(
                label = "Current HP",
                value = "$cur / $max",
                canDec = cur > 0,
                canInc = cur < max,
                onDec  = { onHpChange((cur - 1).coerceAtLeast(0)) },
                onInc  = { onHpChange((cur + 1).coerceAtMost(max)) },
            )
            HpStepperRow(
                label = "Temp HP",
                value = "$temp",
                canDec = temp > 0,
                canInc = true,
                onDec  = { onTempHpChange((temp - 1).coerceAtLeast(0)) },
                onInc  = { onTempHpChange(temp + 1) },
            )
            HpBar(current = cur, max = max, temp = temp)
        }
    }
}

@Composable
private fun HpStepperRow(
    label: String,
    value: String,
    canDec: Boolean,
    canInc: Boolean,
    onDec: () -> Unit,
    onInc: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f))
        IconButton(onClick = onDec, enabled = canDec) {
            Icon(Icons.Filled.Remove, contentDescription = "Decrease $label")
        }
        Text(
            text = value,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            modifier = Modifier.width(96.dp),
        )
        IconButton(onClick = onInc, enabled = canInc) {
            Icon(Icons.Filled.Add, contentDescription = "Increase $label")
        }
    }
}

@Composable
private fun HpBar(current: Int, max: Int, temp: Int) {
    val denom = (max + temp).coerceAtLeast(1).toFloat()
    val hpRatio = current.toFloat() / denom
    val tempRatio = temp.toFloat() / denom
    val healthRatio = current.toFloat() / max.coerceAtLeast(1).toFloat()
    val color = when {
        healthRatio >= 0.5f  -> Color(0xFF22C55E)
        healthRatio >= 0.25f -> Color(0xFFFBBF24)
        else                 -> Color(0xFFEF4444)
    }
    Box(modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(50))
            .background(Color.Gray.copy(alpha = 0.3f))) {
        Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(hpRatio).background(color))
        if (temp > 0) {
            Row(modifier = Modifier.fillMaxHeight()) {
                Spacer(Modifier.fillMaxWidth(hpRatio).fillMaxHeight())
                Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(tempRatio / (1f - hpRatio).coerceAtLeast(0.001f))
                    .background(Color(0xFF3B82F6).copy(alpha = 0.55f)))
            }
        }
    }
}

@Composable
private fun DeathSaveRow(label: String, color: Color, count: Int, onChange: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, modifier = Modifier.width(80.dp))
        for (i in 1..3) {
            Box(
                modifier = Modifier.size(20.dp).clip(CircleShape)
                    .background(if (i <= count) color else Color.Gray.copy(alpha = 0.3f))
                    .clickable { onChange(if (i == count) i - 1 else i) }
            )
        }
    }
}

@Composable
private fun CombatCard(c: Creature) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.height(180.dp),
            ) {
                gridItems(listOf(
                    Triple("Armor Class", c.armor_class?.toString() ?: "—", Icons.Filled.Shield),
                    Triple("Initiative", signed(c.initiative_bonus), Icons.Filled.Bolt),
                    Triple("Passive Perception", c.passive_perception?.toString() ?: "—", Icons.Filled.Visibility),
                    Triple("Proficiency Bonus", profBonusString(c), Icons.Filled.CheckCircle),
                )) { (label, value, icon) -> CombatCell(label, value, icon) }
            }
            for ((kind, value) in movementSpeeds(c)) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text(kind, modifier = Modifier.weight(1f))
                    Text("$value ft", fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            c.concentrating_on?.takeIf { it.isNotEmpty() }?.let {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Star, contentDescription = null,
                        tint = Color(0xFF8B5CF6), modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Concentrating on", modifier = Modifier.weight(1f))
                    Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun CombatCell(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(12.dp))
            Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(value, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 22.sp)
    }
}

private fun signed(v: Int?) = v?.let { if (it >= 0) "+$it" else "$it" } ?: "—"
private fun profBonusString(c: Creature) =
    c.proficiency_bonus?.let { "+$it" }
        ?: c.char_level?.takeIf { it > 0 }?.let { "+${(it - 1) / 4 + 2}" }
        ?: "—"

private fun movementSpeeds(c: Creature): List<Pair<String, Int>> {
    val rows = mutableListOf<Pair<String, Int>>()
    val walk = c.speed_walk ?: 0
    if (walk > 0) rows += "Walk" to walk
    c.speed_fly?.takeIf { it > 0 }?.let    { rows += "Fly" to it }
    c.speed_swim?.takeIf { it > 0 }?.let   { rows += "Swim" to it }
    c.speed_burrow?.takeIf { it > 0 }?.let { rows += "Burrow" to it }
    c.speed_climb?.takeIf { it > 0 }?.let  { rows += "Climb" to it }
    if (rows.isEmpty()) c.speed?.takeIf { it > 0 }?.let { rows += "Speed" to it }
    return rows
}

@Composable
private fun EquippedWeaponRow(w: InventoryItem, atk: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(w.name ?: "(unnamed)", fontWeight = FontWeight.SemiBold)
            val sub = buildList {
                w.damage_entries?.firstOrNull()?.let { d ->
                    add("${d.damage ?: ""} ${d.damage_type ?: ""}".trim())
                }
                w.weapon_range?.takeIf { it.isNotEmpty() }?.let { add(it) }
                w.properties?.takeIf { it.isNotEmpty() }?.let { add(it) }
            }
            if (sub.isNotEmpty()) {
                Text(sub.joinToString(" · "), fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Text(if (atk >= 0) "+$atk" else "$atk", fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.SemiBold)
    }
}

private fun attackBonus(w: InventoryItem, c: Creature): Int {
    val raw = when ((w.attack_stat ?: "STR").uppercase()) {
        "STR" -> c.strength;     "DEX" -> c.dexterity;    "CON" -> c.constitution
        "INT" -> c.intelligence; "WIS" -> c.wisdom;       "CHA" -> c.charisma
        else -> c.strength
    } ?: 10
    val mod = (raw - 10) / 2
    val pb = c.proficiency_bonus ?: (((c.char_level ?: 1) - 1) / 4 + 2)
    return mod + pb + (w.attack_bonus_misc ?: 0)
}

@Composable
private fun CollapsibleStatBlockSection(title: String, entries: List<StatAction>) {
    var open by remember { mutableStateOf(false) }
    Column {
        Card(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { open = !open }.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(title, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                Text("(${entries.size})", fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(end = 6.dp))
                Icon(if (open) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (open) {
                Column {
                    entries.forEachIndexed { i, e ->
                        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                            Text(e.name ?: "(unnamed)", fontWeight = FontWeight.SemiBold)
                            e.desc?.takeIf { it.isNotEmpty() }?.let {
                                Text(it, fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        if (i < entries.lastIndex) HorizontalDivider()
                    }
                }
            }
        }
    }
}

// ── helpers ────────────────────────────────────────────────────────

private fun <T> androidx.compose.foundation.lazy.grid.LazyGridScope.gridItems(
    items: List<T>,
    content: @Composable (T) -> Unit,
) { items(items.size) { i -> content(items[i]) } }

// HitDicePoolCard — one row per die type with available/total
// readout + a single "Use Hit Die" button. With multiple types
// the button opens a chooser dialog so the player picks which
// pool to draw from. Restore-one-die plus button per row keeps
// long-rest restoration easy without a global "reset" action.
@Composable
private fun HitDicePoolCard(
    pool: List<HitDicePoolEntry>,
    creature: Creature,
    token: Token?,
    onSpend: (String) -> Unit,
    onRestore: (String) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val usedMap = creature.hit_dice_used_by_type.orEmpty()
    val anyAvailable = pool.any { (usedMap[it.type] ?: 0) < it.qty }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            for (entry in pool) {
                val used = (usedMap[entry.type] ?: 0).coerceIn(0, entry.qty)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${entry.qty}${entry.type}", modifier = Modifier.weight(1f))
                    Text("${entry.qty - used} / ${entry.qty}",
                        fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.width(70.dp).wrapContentWidth(Alignment.CenterHorizontally))
                    IconButton(
                        enabled = used > 0,
                        onClick = { onRestore(entry.type) },
                    ) { Icon(Icons.Filled.Add, contentDescription = "Restore one ${entry.type}") }
                }
            }
            androidx.compose.material3.Button(
                enabled = anyAvailable && token != null,
                onClick = {
                    val available = pool.filter { (usedMap[it.type] ?: 0) < it.qty }
                    if (available.size == 1) onSpend(available[0].type)
                    else showPicker = true
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Use Hit Die") }
        }
    }

    if (showPicker) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showPicker = false },
            title = { Text("Use which hit die?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val available = pool.filter { (usedMap[it.type] ?: 0) < it.qty }
                    for (entry in available) {
                        val used = (usedMap[entry.type] ?: 0)
                        androidx.compose.material3.OutlinedButton(
                            onClick = {
                                showPicker = false
                                onSpend(entry.type)
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("${entry.type}  (${entry.qty - used}/${entry.qty} left)")
                        }
                    }
                }
            },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = { showPicker = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

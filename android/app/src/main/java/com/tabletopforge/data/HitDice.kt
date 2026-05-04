// HitDice — Kotlin mirror of frontend/src/utils/classes.js helpers.
//
// Computes the merged multi-class hit-dice pool for player characters.
// SRD-canonical die assignments; same-die classes stack into one row.
// Custom plugin-added classes default to d8 (the SRD majority).

package com.tabletopforge.data

private val HIT_DIE_BY_CLASS = mapOf(
    "Barbarian" to "d12",
    "Fighter"   to "d10", "Paladin" to "d10", "Ranger" to "d10",
    "Artificer" to "d8",  "Bard"    to "d8",  "Cleric" to "d8",
    "Druid"     to "d8",  "Monk"    to "d8",  "Rogue"  to "d8",
    "Warlock"   to "d8",
    "Sorcerer"  to "d6",  "Wizard"  to "d6",
)

private val HIT_DIE_ORDER = listOf("d12", "d10", "d8", "d6", "d4")

fun hitDieFor(className: String?): String? {
    if (className.isNullOrBlank()) return null
    return HIT_DIE_BY_CLASS[className] ?: "d8"
}

data class HitDicePoolEntry(val type: String, val qty: Int)

fun computeHitDicePool(c: Creature): List<HitDicePoolEntry> {
    // No is_player_character flag on the Android model — non-PCs
    // typically have null char_class, so the pool comes back empty
    // naturally. Adding a class to a monster row would surface a
    // pool, which is acceptable since the pool is purely additive UI.
    val merged = LinkedHashMap<String, Int>()
    c.char_class?.let { cls ->
        hitDieFor(cls)?.let { die ->
            val lvl = (c.char_level ?: 1).coerceAtLeast(1)
            merged[die] = (merged[die] ?: 0) + lvl
        }
    }
    for (mc in c.multiclasses.orEmpty()) {
        val die = hitDieFor(mc.charClass) ?: continue
        val lvl = (mc.level ?: 1).coerceAtLeast(1)
        merged[die] = (merged[die] ?: 0) + lvl
    }
    return merged.entries
        .sortedBy { HIT_DIE_ORDER.indexOf(it.key).let { i -> if (i < 0) Int.MAX_VALUE else i } }
        .map { (type, qty) -> HitDicePoolEntry(type, qty) }
}

// Class resource counters — Bardic Inspiration, Ki, Sorcery Points,
// Channel Divinity, Action Surge, Lay on Hands, Wild Shape, etc.
//
// Each definition computes its `total` from the character's level on
// that class. The "used" count lives on the device (DataStore-backed)
// keyed by creatureId + resource id, so the player can tap +/- without
// a round-trip; the GM doesn't typically need a live readout of these.
//
// Resets follow the SRD's short/long-rest rules (the rest_kind field).
// Reset buttons aren't auto-fired — players hit them after the table
// agrees a rest happened.

package com.tabletopforge.data

enum class RestKind { SHORT, LONG }

data class ResourceDef(
    val id: String,
    val label: String,
    val total: (level: Int) -> Int,
    val rest: RestKind,
    val note: String? = null,
)

private fun cha(c: Creature) = ((c.charisma     ?: 10) - 10) / 2
private fun wis(c: Creature) = ((c.wisdom       ?: 10) - 10) / 2
private fun con(c: Creature) = ((c.constitution ?: 10) - 10) / 2

// Map char_class (case-sensitive — matches the SRD names from
// utils/classes.js BASE_CLASSES) to its resource list. Custom classes
// from the custom-classes plugin won't appear here yet — they'd need a
// JSON definition uploaded alongside the choices, which is a follow-up.
fun resourcesFor(c: Creature): List<Pair<ResourceDef, Int>> {
    val cls   = c.char_class?.trim() ?: return emptyList()
    val level = (c.char_level ?: 1).coerceAtLeast(1)
    val defs: List<ResourceDef> = when (cls) {
        "Barbarian" -> listOf(
            ResourceDef("rages", "Rages",
                total = { lvl -> when {
                    lvl >= 17 -> 6
                    lvl >= 12 -> 5
                    lvl >= 6  -> 4
                    lvl >= 3  -> 3
                    else      -> 2
                } },
                rest = RestKind.LONG,
            ),
        )
        "Bard" -> listOf(
            ResourceDef("bardic-inspiration", "Bardic Inspiration",
                total = { _ -> (cha(c)).coerceAtLeast(1) },
                rest = RestKind.SHORT,
                note = "Recharges on a short or long rest.",
            ),
        )
        "Cleric" -> listOf(
            ResourceDef("channel-divinity", "Channel Divinity",
                total = { lvl -> if (lvl >= 18) 3 else if (lvl >= 6) 2 else 1 },
                rest = RestKind.SHORT,
            ),
        )
        "Druid" -> listOf(
            ResourceDef("wild-shape", "Wild Shape",
                total = { lvl -> if (lvl >= 20) Int.MAX_VALUE else 2 },
                rest = RestKind.SHORT,
                note = "2/short rest until level 20 (then unlimited).",
            ),
            ResourceDef("channel-nature", "Channel Nature",
                total = { lvl -> if (lvl >= 18) 3 else if (lvl >= 6) 2 else 1 },
                rest = RestKind.SHORT,
            ),
        )
        "Fighter" -> listOf(
            ResourceDef("action-surge", "Action Surge",
                total = { lvl -> if (lvl >= 17) 2 else 1 },
                rest = RestKind.SHORT,
            ),
            ResourceDef("second-wind", "Second Wind",
                total = { lvl -> if (lvl >= 17) 4 else if (lvl >= 10) 3 else 2 },
                rest = RestKind.SHORT,
            ),
            ResourceDef("indomitable", "Indomitable",
                total = { lvl -> if (lvl >= 17) 3 else if (lvl >= 13) 2 else 1 },
                rest = RestKind.LONG,
                note = "Available from level 9.",
            ),
        )
        "Monk" -> listOf(
            ResourceDef("focus-points", "Focus Points",
                total = { lvl -> lvl.coerceAtLeast(2).let { if (it >= 2) it else 0 } },
                rest = RestKind.SHORT,
                note = "Equal to your monk level (2nd level+).",
            ),
        )
        "Paladin" -> listOf(
            ResourceDef("lay-on-hands", "Lay on Hands (HP pool)",
                total = { lvl -> 5 * lvl },
                rest = RestKind.LONG,
            ),
            ResourceDef("channel-divinity", "Channel Divinity",
                total = { lvl -> if (lvl >= 11) 3 else if (lvl >= 7) 2 else 1 },
                rest = RestKind.SHORT,
                note = "Available from level 3.",
            ),
        )
        "Ranger" -> listOf(
            ResourceDef("hunters-mark-uses", "Hunter's Mark uses",
                total = { _ -> wis(c).coerceAtLeast(1) },
                rest = RestKind.LONG,
                note = "Free casts equal to your WIS modifier.",
            ),
        )
        "Rogue" -> emptyList()
        "Sorcerer" -> listOf(
            ResourceDef("sorcery-points", "Sorcery Points",
                total = { lvl -> if (lvl >= 2) lvl else 0 },
                rest = RestKind.LONG,
            ),
        )
        "Warlock" -> listOf(
            ResourceDef("genies-vessel", "Genie's Vessel charges",
                total = { _ -> 1 },
                rest = RestKind.LONG,
                note = "Replace with whichever Patron-specific feature applies.",
            ),
        )
        "Wizard" -> listOf(
            ResourceDef("arcane-recovery", "Arcane Recovery",
                total = { _ -> 1 },
                rest = RestKind.LONG,
                note = "Once per long rest, on a short rest.",
            ),
        )
        "Artificer" -> listOf(
            ResourceDef("infusions-known",  "Infusions known",
                total = { lvl -> when {
                    lvl >= 18 -> 6; lvl >= 14 -> 5; lvl >= 10 -> 4; lvl >= 6 -> 3; else -> 2
                } },
                rest = RestKind.LONG,
            ),
        )
        else -> emptyList()
    }
    return defs.map { def -> def to def.total(level) }
}

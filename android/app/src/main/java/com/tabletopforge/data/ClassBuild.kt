// ClassBuild — read-only mirror of frontend/src/data/class_build.js.
//
// Surfaces the SRD core traits (primary ability, hit die, saves,
// armor training, weapons) for the StatsScreen "Class Details"
// disclosure. The mobile app doesn't apply class kits — that flow
// stays on the web sheet (and reaches the device via the creature
// row round-trip), so we don't need the multiclass grants subset
// or starting equipment data here.

package com.tabletopforge.data

data class ClassBuild(
    val primary: String,
    val hitDie:  String,
    val saves:   List<String>,
    val armor:   List<String>,
    val weapons: List<String>,
)

private val CLASS_BUILDS = mapOf(
    "Barbarian" to ClassBuild("Strength",                "d12", listOf("STR","CON"), listOf("Light","Medium","Shields"),         listOf("Simple","Martial")),
    "Bard"      to ClassBuild("Charisma",                "d8",  listOf("DEX","CHA"), listOf("Light"),                              listOf("Simple")),
    "Cleric"    to ClassBuild("Wisdom",                  "d8",  listOf("WIS","CHA"), listOf("Light","Medium","Shields"),         listOf("Simple")),
    "Druid"     to ClassBuild("Wisdom",                  "d8",  listOf("INT","WIS"), listOf("Light","Shields"),                   listOf("Simple")),
    "Fighter"   to ClassBuild("Strength or Dexterity",   "d10", listOf("STR","CON"), listOf("Light","Medium","Heavy","Shields"), listOf("Simple","Martial")),
    "Monk"      to ClassBuild("Dexterity and Wisdom",    "d8",  listOf("STR","DEX"), emptyList(),                                  listOf("Simple","Martial (Light)")),
    "Paladin"   to ClassBuild("Strength and Charisma",   "d10", listOf("WIS","CHA"), listOf("Light","Medium","Heavy","Shields"), listOf("Simple","Martial")),
    "Ranger"    to ClassBuild("Dexterity and Wisdom",    "d10", listOf("STR","DEX"), listOf("Light","Medium","Shields"),         listOf("Simple","Martial")),
    "Rogue"     to ClassBuild("Dexterity",               "d8",  listOf("DEX","INT"), listOf("Light"),                              listOf("Simple","Martial (Finesse or Light)")),
    "Sorcerer"  to ClassBuild("Charisma",                "d6",  listOf("CON","CHA"), emptyList(),                                  listOf("Simple")),
    "Warlock"   to ClassBuild("Charisma",                "d8",  listOf("WIS","CHA"), listOf("Light"),                              listOf("Simple")),
    "Wizard"    to ClassBuild("Intelligence",            "d6",  listOf("INT","WIS"), emptyList(),                                  listOf("Simple")),
    "Artificer" to ClassBuild("Intelligence",            "d8",  listOf("CON","INT"), listOf("Light","Medium","Shields"),         listOf("Simple")),
)

fun classBuild(name: String?): ClassBuild? {
    if (name.isNullOrBlank()) return null
    return CLASS_BUILDS[name]
}

// "Lvl 5 — Fighter 3 / Wizard 2" for multi-class characters,
// "Level 5 Fighter (Battle Master)" for single-class. Returns null
// when the character has no class set yet.
fun classLevelLine(c: Creature): String? {
    val primaryLvl = (c.char_level ?: 0).coerceAtLeast(0)
    val primaryCls = c.char_class.orEmpty()
    val mcs = (c.multiclasses.orEmpty()).filter {
        !it.charClass.isNullOrBlank() && (it.level ?: 0) > 0
    }
    if (primaryLvl <= 0 && mcs.isEmpty()) return null
    val total = primaryLvl + mcs.sumOf { (it.level ?: 0).coerceAtLeast(0) }
    if (mcs.isEmpty()) {
        val parts = buildList {
            add("Level $primaryLvl")
            if (primaryCls.isNotEmpty()) add(primaryCls)
            c.char_subclass?.takeIf { it.isNotEmpty() }?.let { add("($it)") }
        }
        return parts.joinToString(" ")
    }
    val rows = buildList {
        if (primaryCls.isNotEmpty()) add("$primaryCls $primaryLvl")
        for (mc in mcs) {
            mc.charClass?.let { add("$it ${mc.level}") }
        }
    }
    return "Level $total — ${rows.joinToString(" / ")}"
}

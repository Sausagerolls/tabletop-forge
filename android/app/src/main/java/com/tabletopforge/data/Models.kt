// Models — Kotlin mirror of ios/TableTopForge/Models/Models.swift.
//
// Mirroring rule: when a field is added on either side, add it to BOTH
// files. Field names match the server's JSON keys exactly so the same
// payload decodes on iOS (Codable) and Android (kotlinx.serialization).
//
// Decode tolerance: many fields are nullable because the web form
// stores blanks as empty strings, and the server's JSONB rows can come
// back partially populated for legacy creatures. Custom serializers
// (FlexibleInt, FlexibleDouble, FlexibleBool) accept Int / Double /
// String so a `"3"` from the form's text input decodes as 3 and a
// blank `""` decodes as null.

package com.tabletopforge.data

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive

// ── Tolerant scalar serializers ───────────────────────────────────
// Server is generous about types: a "3" string can come back where an
// Int is expected. These serializers normalize at decode time.

object FlexibleInt : KSerializer<Int?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleInt", PrimitiveKind.STRING)
    override fun deserialize(decoder: Decoder): Int? {
        val jd = decoder as? JsonDecoder ?: return null
        val el = jd.decodeJsonElement()
        if (el is JsonNull) return null
        val p = el.jsonPrimitive
        if (p.contentOrNull == "") return null
        return p.intOrNull ?: p.doubleOrNull?.toInt()
    }
    override fun serialize(encoder: Encoder, value: Int?) {
        if (value == null) encoder.encodeNull()
        else encoder.encodeInt(value)
    }
}

object FlexibleDouble : KSerializer<Double?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleDouble", PrimitiveKind.STRING)
    override fun deserialize(decoder: Decoder): Double? {
        val jd = decoder as? JsonDecoder ?: return null
        val el = jd.decodeJsonElement()
        if (el is JsonNull) return null
        val p = el.jsonPrimitive
        if (p.contentOrNull == "") return null
        return p.doubleOrNull
    }
    override fun serialize(encoder: Encoder, value: Double?) {
        if (value == null) encoder.encodeNull() else encoder.encodeDouble(value)
    }
}

object FlexibleBool : KSerializer<Boolean?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleBool", PrimitiveKind.STRING)
    override fun deserialize(decoder: Decoder): Boolean? {
        val jd = decoder as? JsonDecoder ?: return null
        val el = jd.decodeJsonElement()
        if (el is JsonNull) return null
        val p = el.jsonPrimitive
        return p.booleanOrNull ?: when (p.contentOrNull?.lowercase()) {
            "true", "1", "yes" -> true
            "false", "0", "no", "" -> false
            null -> null
            else -> null
        }
    }
    override fun serialize(encoder: Encoder, value: Boolean?) {
        if (value == null) encoder.encodeNull() else encoder.encodeBoolean(value)
    }
}

// Shared JSON config — `ignoreUnknownKeys` matches the iOS Codable
// behavior of silently skipping unrecognized fields.
val AppJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    isLenient = true
    explicitNulls = false
}

// ── Stat-block sub-shapes ─────────────────────────────────────────

@Serializable
data class StatAction(
    val name: String? = null,
    val desc: String? = null,
    val __source: String? = null,
)

@Serializable
data class SpellDamage(
    val damage: String? = null,
    val damage_type: String? = null,
)

@Serializable
data class SpellSlot(
    @Serializable(with = FlexibleInt::class) val total: Int? = null,
    @Serializable(with = FlexibleInt::class) val used:  Int? = null,
)

// ── InventoryItem ────────────────────────────────────────────────

@Serializable
data class InventoryItem(
    val name: String? = null,
    @Serializable(with = FlexibleInt::class)    val qty: Int? = null,
    @Serializable(with = FlexibleDouble::class) val weight: Double? = null,
    val desc: String? = null,
    val item_type: String? = null,
    @Serializable(with = FlexibleBool::class) val equipped: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val sheds_light: Boolean? = null,
    @Serializable(with = FlexibleDouble::class) val bright_ft: Double? = null,
    @Serializable(with = FlexibleDouble::class) val dim_ft: Double? = null,
    val light_color: String? = null,
    @Serializable(with = FlexibleBool::class) val flicker: Boolean? = null,
    val weapon_range: String? = null,
    val attack_stat: String? = null,
    @Serializable(with = FlexibleInt::class) val attack_bonus_misc: Int? = null,
    val damage_entries: List<SpellDamage>? = null,
    val properties: String? = null,
    val mastery: String? = null,
    val rarity: String? = null,
    @Serializable(with = FlexibleInt::class) val ac_base: Int? = null,
    val armor_category: String? = null,
    @Serializable(with = FlexibleInt::class) val ac_bonus: Int? = null,
)

// ── Spell ─────────────────────────────────────────────────────────

@Serializable
data class Spell(
    val name: String? = null,
    @Serializable(with = FlexibleInt::class) val level: Int? = null,
    val type: String? = null,
    val school: String? = null,
    val casting_time: String? = null,
    val range_area: String? = null,
    val duration: String? = null,
    val attack_save: String? = null,
    val save_ability: String? = null,
    val casting_ability: String? = null,
    val description: String? = null,
    val damage_entries: List<SpellDamage>? = null,
    @Serializable(with = FlexibleBool::class) val prepared: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val concentration: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val ritual: Boolean? = null,
)

// ── Creature ──────────────────────────────────────────────────────

@Serializable
data class Creature(
    val id: Int,
    val name: String? = null,
    @Serializable(with = FlexibleInt::class) val hit_points: Int? = null,
    @Serializable(with = FlexibleInt::class) val max_hp: Int? = null,
    @Serializable(with = FlexibleInt::class) val armor_class: Int? = null,
    val size: String? = null,
    val creature_type: String? = null,
    val alignment: String? = null,
    val subtype: String? = null,
    val char_class: String? = null,
    val char_subclass: String? = null,
    val background: String? = null,
    val languages: String? = null,
    val tool_proficiencies: String? = null,
    val weapon_proficiencies: String? = null,
    @Serializable(with = FlexibleBool::class) val prof_light_armor: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val prof_medium_armor: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val prof_heavy_armor: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val prof_shields: Boolean? = null,
    @Serializable(with = FlexibleInt::class) val initiative_bonus: Int? = null,
    @Serializable(with = FlexibleInt::class) val passive_perception: Int? = null,
    @Serializable(with = FlexibleInt::class) val proficiency_bonus: Int? = null,
    @Serializable(with = FlexibleBool::class) val heroic_inspiration: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val shield_equipped: Boolean? = null,
    val hit_dice: String? = null,
    @Serializable(with = FlexibleInt::class) val hit_dice_qty: Int? = null,
    val hit_dice_type: String? = null,
    @Serializable(with = FlexibleInt::class) val hit_dice_used: Int? = null,
    @Serializable(with = FlexibleInt::class) val death_save_successes: Int? = null,
    @Serializable(with = FlexibleInt::class) val death_save_failures: Int? = null,
    @Serializable(with = FlexibleInt::class) val save_str: Int? = null,
    @Serializable(with = FlexibleInt::class) val save_dex: Int? = null,
    @Serializable(with = FlexibleInt::class) val save_con: Int? = null,
    @Serializable(with = FlexibleInt::class) val save_int: Int? = null,
    @Serializable(with = FlexibleInt::class) val save_wis: Int? = null,
    @Serializable(with = FlexibleInt::class) val save_cha: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_acrobatics: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_animal_handling: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_arcana: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_athletics: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_deception: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_history: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_insight: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_intimidation: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_investigation: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_medicine: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_nature: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_perception: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_performance: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_persuasion: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_religion: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_sleight_of_hand: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_stealth: Int? = null,
    @Serializable(with = FlexibleInt::class) val skill_survival: Int? = null,
    val skill_expertise: Map<String, Boolean>? = null,
    val actions: List<StatAction>? = null,
    val bonus_actions: List<StatAction>? = null,
    val reactions: List<StatAction>? = null,
    val movement_actions: List<StatAction>? = null,
    val legendary_actions: List<StatAction>? = null,
    val special_abilities: List<StatAction>? = null,
    val class_features: List<StatAction>? = null,
    val feats: List<StatAction>? = null,
    @Serializable(with = FlexibleInt::class) val speed: Int? = null,
    @Serializable(with = FlexibleInt::class) val speed_walk: Int? = null,
    @Serializable(with = FlexibleInt::class) val speed_fly: Int? = null,
    @Serializable(with = FlexibleInt::class) val speed_swim: Int? = null,
    @Serializable(with = FlexibleInt::class) val speed_burrow: Int? = null,
    @Serializable(with = FlexibleInt::class) val speed_climb: Int? = null,
    @Serializable(with = FlexibleInt::class) val strength: Int? = null,
    @Serializable(with = FlexibleInt::class) val dexterity: Int? = null,
    @Serializable(with = FlexibleInt::class) val constitution: Int? = null,
    @Serializable(with = FlexibleInt::class) val intelligence: Int? = null,
    @Serializable(with = FlexibleInt::class) val wisdom: Int? = null,
    @Serializable(with = FlexibleInt::class) val charisma: Int? = null,
    @Serializable(with = FlexibleInt::class) val char_level: Int? = null,
    val image_path: String? = null,
    val inventory: List<InventoryItem>? = null,
    val spells: List<Spell>? = null,
    // Spell slots — server stores `{ "1": {total: 4, used: 1}, "2": ... }`
    // keyed by level-as-string. Decode as Map<String, SpellSlot>; the
    // SpellsScreen can stride 1..9 by parsing keys back to Int.
    val spell_slots: Map<String, SpellSlot>? = null,
    val concentrating_on: String? = null,
    @Serializable(with = FlexibleInt::class) val currency_gp: Int? = null,
    @Serializable(with = FlexibleInt::class) val currency_sp: Int? = null,
    @Serializable(with = FlexibleInt::class) val currency_cp: Int? = null,
    // Extra class rows on top of the primary char_class. Each entry
    // contributes its own hit-die pool to the multi-class pool. Class
    // names are deserialized off `class` (a Kotlin reserved word) via
    // SerialName.
    val multiclasses: List<Multiclass>? = null,
    // Per-die-type spent count for the multi-pool hit dice. Format
    // matches the web client: { "d10": 2, "d6": 0 }.
    val hit_dice_used_by_type: Map<String, Int>? = null,
)

@Serializable
data class Multiclass(
    val id: String? = null,
    @kotlinx.serialization.SerialName("class") val charClass: String? = null,
    val subclass: String? = null,
    @Serializable(with = FlexibleInt::class) val level: Int? = null,
)

// ── Token (map presence) ──────────────────────────────────────────

@Serializable
data class Token(
    val id: Int,
    val creature_id: Int? = null,
    val name: String? = null,
    val nickname: String? = null,
    val player_name: String? = null,
    val image_path: String? = null,
    val creature_image: String? = null,
    @Serializable(with = FlexibleInt::class) val current_hp: Int? = null,
    @Serializable(with = FlexibleInt::class) val max_hp: Int? = null,
    @Serializable(with = FlexibleInt::class) val temp_hp: Int? = null,
    @Serializable(with = FlexibleBool::class) val is_player: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val is_hidden: Boolean? = null,
    @Serializable(with = FlexibleBool::class) val is_flying: Boolean? = null,
    val size: String? = null,
    @Serializable(with = FlexibleInt::class) val initiative: Int? = null,
    val conditions: List<String>? = null,
    @Serializable(with = FlexibleDouble::class) val grid_col: Double? = null,
    @Serializable(with = FlexibleDouble::class) val grid_row: Double? = null,
    val map_id: Int? = null,
    @Serializable(with = FlexibleDouble::class) val token_light_bright: Double? = null,
    @Serializable(with = FlexibleDouble::class) val token_light_dim: Double? = null,
    val token_light_color: String? = null,
    @Serializable(with = FlexibleBool::class) val token_light_flicker: Boolean? = null,
    @Serializable(with = FlexibleInt::class) val creature_dex: Int? = null,
    val ability_scores: Map<String, Int>? = null,
)

// ── Session / live-state envelopes ────────────────────────────────

@Serializable
data class SessionInfo(
    val id: Int,
    val session_code: String? = null,
    val map_id: Int? = null,
    val combat_active: Boolean? = null,
    val combat_turn: Int? = null,
)

// Dice / light helper types — pure UI / wire shapes, not server-derived,
// so no @Serializable needed for state (still serializable for emit).

data class DiceRollLine(
    val id: Long = System.nanoTime(),
    val label: String,
    val total: Int,
    val breakdown: String,
    val rolledBy: String,
    val timestamp: Long = System.currentTimeMillis(),
)

data class WhisperLine(
    val id: Long = System.nanoTime(),
    val message: String,
    val timestamp: Long = System.currentTimeMillis(),
)

data class NpcSay(
    val id: String,
    val speaker: String,
    val langSlug: String,
    val text: String,
    val target: Int?,
    val timestamp: Long = System.currentTimeMillis(),
    val understood: Boolean,
    val displayText: String,
)

data class DiceRollRequest(
    val dice: Int,
    val count: Int,
    val modifier: Int,
    val label: String? = null,
)

data class LightPreset(
    val id: Int,
    val label: String,
    val brightFt: Double,
    val dimFt: Double,
    val flicker: Boolean,
) {
    companion object {
        val ALL = listOf(
            LightPreset(0, "No Light", 0.0, 0.0,  false),
            LightPreset(1, "Candle",   0.0, 5.0,  true),
            LightPreset(2, "Torch",    20.0, 40.0, true),
            LightPreset(3, "Lantern",  30.0, 60.0, true),
        )
        fun match(brightFt: Double, dimFt: Double): LightPreset =
            ALL.firstOrNull {
                kotlin.math.abs(it.brightFt - brightFt) < 0.5
                    && kotlin.math.abs(it.dimFt - dimFt) < 0.5
            } ?: ALL[0]
    }
}

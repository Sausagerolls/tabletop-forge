import Foundation

// Models matching the server's payloads. Decoding is defensive — the
// server payloads are wide and we only consume a small subset, so the
// structs use optional fields liberally to survive future schema
// extensions without crashing.

struct Token: Codable, Identifiable, Equatable {
    let id: Int
    var name: String?
    var nickname: String?
    var player_name: String?
    var size: String?
    var current_hp: Int?
    var max_hp: Int?
    var temp_hp: Int?
    var is_player: Bool?
    var is_hidden: Bool?
    var is_flying: Bool?
    var grid_col: Double?
    var grid_row: Double?
    var map_id: Int?
    var creature_id: Int?
    var token_light_bright: Double?
    var token_light_dim: Double?
    var token_light_color: String?
    var token_light_flicker: Bool?
    var conditions: [String]?
}

struct Creature: Codable, Identifiable, Equatable {
    let id: Int
    var name: String?
    var hit_points: Int?
    var max_hp: Int?
    var armor_class: Int?
    var size: String?
    var creature_type: String?
    var alignment: String?
    var subtype: String?            // "race" in player-character speak
    var char_class: String?
    var char_subclass: String?
    // The DM-applied background id — display name comes from the
    // companion `background_state.added.feat` and the catalog the web
    // app keeps. iOS only renders the canonical name part of the id
    // (e.g. `acolyte-2024` → "Acolyte") so we never need the full data.
    var background: String?
    var languages: String?
    // Free-form CSV for non-skill proficiencies. The backend stores
    // them as plain text fields the DM (or a background apply) can
    // append to.
    var tool_proficiencies: String?
    var weapon_proficiencies: String?
    // Booleans for armor + shield training. Class features and the
    // player-character checkboxes drive these directly.
    var prof_light_armor: Bool?
    var prof_medium_armor: Bool?
    var prof_heavy_armor: Bool?
    var prof_shields: Bool?
    var initiative_bonus: Int?
    var passive_perception: Int?
    var proficiency_bonus: Int?
    var heroic_inspiration: Bool?
    var shield_equipped: Bool?
    // Hit dice tracking
    var hit_dice: String?
    var hit_dice_qty: Int?
    var hit_dice_type: String?
    var hit_dice_used: Int?
    // Death save state — only meaningful when current_hp == 0
    var death_save_successes: Int?
    var death_save_failures: Int?
    // Saving throw bonuses (nil = no proficiency)
    var save_str: Int?
    var save_dex: Int?
    var save_con: Int?
    var save_int: Int?
    var save_wis: Int?
    var save_cha: Int?
    // Skill bonuses — server stores the FULL bonus (ability mod +
    // proficiency + expertise + magic items) when proficient, or nil
    // when not proficient. Empty cell = not proficient = derive bonus
    // from the raw ability mod.
    var skill_acrobatics: Int?
    var skill_animal_handling: Int?
    var skill_arcana: Int?
    var skill_athletics: Int?
    var skill_deception: Int?
    var skill_history: Int?
    var skill_insight: Int?
    var skill_intimidation: Int?
    var skill_investigation: Int?
    var skill_medicine: Int?
    var skill_nature: Int?
    var skill_perception: Int?
    var skill_performance: Int?
    var skill_persuasion: Int?
    var skill_religion: Int?
    var skill_sleight_of_hand: Int?
    var skill_stealth: Int?
    var skill_survival: Int?
    // skill_expertise: { skill_acrobatics: true, ... } — flag per skill
    // for double-proficiency. Server uses bool values, occasionally null.
    var skill_expertise: [String: Bool]?
    // Stat-block sections — JSONB arrays of {name, desc}
    var actions: [StatAction]?
    var bonus_actions: [StatAction]?
    var reactions: [StatAction]?
    var movement_actions: [StatAction]?
    var legendary_actions: [StatAction]?
    var special_abilities: [StatAction]?
    var class_features: [StatAction]?
    var feats: [StatAction]?
    var speed: Int?
    var speed_walk: Int?
    var speed_fly: Int?
    var speed_swim: Int?
    var speed_burrow: Int?
    var speed_climb: Int?
    var strength: Int?
    var dexterity: Int?
    var constitution: Int?
    var intelligence: Int?
    var wisdom: Int?
    var charisma: Int?
    var char_level: Int?
    var image_path: String?
    var inventory: [InventoryItem]?
    var spells: [Spell]?
    var spell_slots: SpellSlots?
    var concentrating_on: String?
    // Currency tracked separately on the creature row — DM gold drops
    // and player purchases update these via socket broadcasts so the
    // wallet readout stays in sync across every client.
    var currency_gp: Int?
    var currency_sp: Int?
    var currency_cp: Int?

    // Custom decoder: each optional field uses try? so a single
    // malformed JSONB column (e.g. server returns spell_slots as a
    // string instead of an object, or damage_entries comes back as a
    // legacy shape) doesn't fail the whole creature decode and blank
    // the Stats tab. The required `id` field is the only one that
    // throws on absence.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Required.
        self.id = try c.decode(Int.self, forKey: .id)
        // Optional scalars — try? so type mismatches degrade to nil
        // rather than failing.
        self.name           = try? c.decodeIfPresent(String.self, forKey: .name)
        self.hit_points     = try? c.decodeIfPresent(Int.self,    forKey: .hit_points)
        self.max_hp         = try? c.decodeIfPresent(Int.self,    forKey: .max_hp)
        self.armor_class    = try? c.decodeIfPresent(Int.self,    forKey: .armor_class)
        self.size           = try? c.decodeIfPresent(String.self, forKey: .size)
        self.creature_type  = try? c.decodeIfPresent(String.self, forKey: .creature_type)
        self.alignment      = try? c.decodeIfPresent(String.self, forKey: .alignment)
        self.subtype        = try? c.decodeIfPresent(String.self, forKey: .subtype)
        self.char_class     = try? c.decodeIfPresent(String.self, forKey: .char_class)
        self.char_subclass  = try? c.decodeIfPresent(String.self, forKey: .char_subclass)
        self.background     = try? c.decodeIfPresent(String.self, forKey: .background)
        self.languages      = try? c.decodeIfPresent(String.self, forKey: .languages)
        self.tool_proficiencies   = try? c.decodeIfPresent(String.self, forKey: .tool_proficiencies)
        self.weapon_proficiencies = try? c.decodeIfPresent(String.self, forKey: .weapon_proficiencies)
        self.prof_light_armor  = try? c.decodeIfPresent(Bool.self, forKey: .prof_light_armor)
        self.prof_medium_armor = try? c.decodeIfPresent(Bool.self, forKey: .prof_medium_armor)
        self.prof_heavy_armor  = try? c.decodeIfPresent(Bool.self, forKey: .prof_heavy_armor)
        self.prof_shields      = try? c.decodeIfPresent(Bool.self, forKey: .prof_shields)
        self.initiative_bonus   = decodeFlexibleInt(c, .initiative_bonus)
        self.passive_perception = decodeFlexibleInt(c, .passive_perception)
        self.proficiency_bonus  = decodeFlexibleInt(c, .proficiency_bonus)
        self.heroic_inspiration = try? c.decodeIfPresent(Bool.self, forKey: .heroic_inspiration)
        self.shield_equipped    = try? c.decodeIfPresent(Bool.self, forKey: .shield_equipped)
        self.hit_dice           = try? c.decodeIfPresent(String.self, forKey: .hit_dice)
        self.hit_dice_qty       = decodeFlexibleInt(c, .hit_dice_qty)
        self.hit_dice_type      = try? c.decodeIfPresent(String.self, forKey: .hit_dice_type)
        self.hit_dice_used      = decodeFlexibleInt(c, .hit_dice_used)
        self.death_save_successes = decodeFlexibleInt(c, .death_save_successes)
        self.death_save_failures  = decodeFlexibleInt(c, .death_save_failures)
        self.save_str = decodeFlexibleInt(c, .save_str)
        self.save_dex = decodeFlexibleInt(c, .save_dex)
        self.save_con = decodeFlexibleInt(c, .save_con)
        self.save_int = decodeFlexibleInt(c, .save_int)
        self.save_wis = decodeFlexibleInt(c, .save_wis)
        self.save_cha = decodeFlexibleInt(c, .save_cha)
        self.skill_acrobatics       = decodeFlexibleInt(c, .skill_acrobatics)
        self.skill_animal_handling  = decodeFlexibleInt(c, .skill_animal_handling)
        self.skill_arcana           = decodeFlexibleInt(c, .skill_arcana)
        self.skill_athletics        = decodeFlexibleInt(c, .skill_athletics)
        self.skill_deception        = decodeFlexibleInt(c, .skill_deception)
        self.skill_history          = decodeFlexibleInt(c, .skill_history)
        self.skill_insight          = decodeFlexibleInt(c, .skill_insight)
        self.skill_intimidation     = decodeFlexibleInt(c, .skill_intimidation)
        self.skill_investigation    = decodeFlexibleInt(c, .skill_investigation)
        self.skill_medicine         = decodeFlexibleInt(c, .skill_medicine)
        self.skill_nature           = decodeFlexibleInt(c, .skill_nature)
        self.skill_perception       = decodeFlexibleInt(c, .skill_perception)
        self.skill_performance      = decodeFlexibleInt(c, .skill_performance)
        self.skill_persuasion       = decodeFlexibleInt(c, .skill_persuasion)
        self.skill_religion         = decodeFlexibleInt(c, .skill_religion)
        self.skill_sleight_of_hand  = decodeFlexibleInt(c, .skill_sleight_of_hand)
        self.skill_stealth          = decodeFlexibleInt(c, .skill_stealth)
        self.skill_survival         = decodeFlexibleInt(c, .skill_survival)
        self.skill_expertise        = (try? c.decodeIfPresent([String: Bool].self, forKey: .skill_expertise)) ?? nil
        self.actions            = decodeJSONBArray(StatAction.self, c, .actions)
        self.bonus_actions      = decodeJSONBArray(StatAction.self, c, .bonus_actions)
        self.reactions          = decodeJSONBArray(StatAction.self, c, .reactions)
        self.movement_actions   = decodeJSONBArray(StatAction.self, c, .movement_actions)
        self.legendary_actions  = decodeJSONBArray(StatAction.self, c, .legendary_actions)
        self.special_abilities  = decodeJSONBArray(StatAction.self, c, .special_abilities)
        self.class_features     = decodeJSONBArray(StatAction.self, c, .class_features)
        self.feats              = decodeJSONBArray(StatAction.self, c, .feats)
        self.speed          = try? c.decodeIfPresent(Int.self,    forKey: .speed)
        self.speed_walk     = try? c.decodeIfPresent(Int.self,    forKey: .speed_walk)
        self.speed_fly      = try? c.decodeIfPresent(Int.self,    forKey: .speed_fly)
        self.speed_swim     = try? c.decodeIfPresent(Int.self,    forKey: .speed_swim)
        self.speed_burrow   = try? c.decodeIfPresent(Int.self,    forKey: .speed_burrow)
        self.speed_climb    = try? c.decodeIfPresent(Int.self,    forKey: .speed_climb)
        self.strength       = try? c.decodeIfPresent(Int.self,    forKey: .strength)
        self.dexterity      = try? c.decodeIfPresent(Int.self,    forKey: .dexterity)
        self.constitution   = try? c.decodeIfPresent(Int.self,    forKey: .constitution)
        self.intelligence   = try? c.decodeIfPresent(Int.self,    forKey: .intelligence)
        self.wisdom         = try? c.decodeIfPresent(Int.self,    forKey: .wisdom)
        self.charisma       = try? c.decodeIfPresent(Int.self,    forKey: .charisma)
        self.char_level     = try? c.decodeIfPresent(Int.self,    forKey: .char_level)
        self.image_path     = try? c.decodeIfPresent(String.self, forKey: .image_path)
        self.concentrating_on = try? c.decodeIfPresent(String.self, forKey: .concentrating_on)
        self.currency_gp     = decodeFlexibleInt(c, .currency_gp)
        self.currency_sp     = decodeFlexibleInt(c, .currency_sp)
        self.currency_cp     = decodeFlexibleInt(c, .currency_cp)
        // JSONB columns — these are the most likely to break decoding.
        // The server's pg driver normally parses them, but legacy rows
        // or specific endpoints can return the raw JSON string. Handle
        // both via decodeJSONBArray / decodeJSONBObject helpers.
        self.inventory   = decodeJSONBArray(InventoryItem.self, c, .inventory)
        self.spells      = decodeJSONBArray(Spell.self,         c, .spells)
        self.spell_slots = decodeJSONBObject(SpellSlots.self,   c, .spell_slots)
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, hit_points, max_hp, armor_class, size, creature_type, alignment
        case speed, speed_walk, speed_fly, speed_swim, speed_burrow, speed_climb
        case strength, dexterity, constitution, intelligence, wisdom, charisma
        case char_level, image_path, inventory, spells, spell_slots, concentrating_on
        case currency_gp, currency_sp, currency_cp
        case subtype, char_class, char_subclass, languages
        case background, tool_proficiencies, weapon_proficiencies
        case prof_light_armor, prof_medium_armor, prof_heavy_armor, prof_shields
        case initiative_bonus, passive_perception, proficiency_bonus
        case heroic_inspiration, shield_equipped
        case hit_dice, hit_dice_qty, hit_dice_type, hit_dice_used
        case death_save_successes, death_save_failures
        case save_str, save_dex, save_con, save_int, save_wis, save_cha
        case skill_acrobatics, skill_animal_handling, skill_arcana, skill_athletics
        case skill_deception, skill_history, skill_insight, skill_intimidation
        case skill_investigation, skill_medicine, skill_nature, skill_perception
        case skill_performance, skill_persuasion, skill_religion, skill_sleight_of_hand
        case skill_stealth, skill_survival, skill_expertise
        case actions, bonus_actions, reactions, movement_actions
        case legendary_actions, special_abilities, class_features, feats
    }
}

// Decode a JSONB array column. Server normally returns an array of
// objects; some legacy paths return a JSON-encoded string. This helper
// accepts either shape and returns nil on anything else (which the
// model treats as "empty").
private func decodeJSONBArray<T: Decodable, K: CodingKey>(
    _ type: T.Type,
    _ container: KeyedDecodingContainer<K>,
    _ key: K
) -> [T]? {
    if let arr = try? container.decodeIfPresent([T].self, forKey: key) {
        return arr
    }
    if let str = try? container.decodeIfPresent(String.self, forKey: key),
       let data = str.data(using: .utf8),
       let arr = try? JSONDecoder().decode([T].self, from: data) {
        return arr
    }
    return nil
}

private func decodeJSONBObject<T: Decodable, K: CodingKey>(
    _ type: T.Type,
    _ container: KeyedDecodingContainer<K>,
    _ key: K
) -> T? {
    if let obj = try? container.decodeIfPresent(T.self, forKey: key) {
        return obj
    }
    if let str = try? container.decodeIfPresent(String.self, forKey: key),
       let data = str.data(using: .utf8),
       let obj = try? JSONDecoder().decode(T.self, from: data) {
        return obj
    }
    return nil
}

// SpellSlots — server stores `{ "1": {total: 4, used: 1}, "2": ... }`
// keyed by level-as-string. We decode it as a typed wrapper so the
// Spells tab can stride `1...9` cleanly.
struct SpellSlot: Codable, Equatable {
    var total: Int?
    var used: Int?
}

struct SpellSlots: Codable, Equatable {
    var levels: [Int: SpellSlot]
    init(levels: [Int: SpellSlot] = [:]) { self.levels = levels }
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: StringKey.self)
        var out: [Int: SpellSlot] = [:]
        for key in container.allKeys {
            if let lvl = Int(key.stringValue) {
                out[lvl] = try? container.decode(SpellSlot.self, forKey: key)
            }
        }
        self.levels = out
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: StringKey.self)
        for (lvl, slot) in levels {
            try container.encode(slot, forKey: StringKey(stringValue: "\(lvl)")!)
        }
    }
    private struct StringKey: CodingKey {
        var stringValue: String
        init?(stringValue: String) { self.stringValue = stringValue }
        var intValue: Int? { Int(stringValue) }
        init?(intValue: Int) { self.stringValue = "\(intValue)" }
    }
}

// InventoryItem — JSONB row on creature.inventory. The schema is wide
// (the web CreatureForm has dozens of fields) but the iOS tab only
// reads a small subset and round-trips the rest untouched via the JSON
// patch. Optional-everything keeps decoding tolerant.
//
// Numeric fields (weight / bright_ft / dim_ft / qty) use a flexible
// decode because the web form lets users leave them blank — the server
// then stores `""` (empty string) in the JSONB column, which strict
// Double/Int decoding rejects and cascades into a full-creature decode
// failure. The flexible helpers accept Int, Double, and String, with
// blank strings degrading to nil instead of throwing.
struct InventoryItem: Codable, Equatable, Identifiable {
    var name: String?
    var qty: Int?
    var weight: Double?
    var desc: String?
    var item_type: String?       // "item" | "weapon" | "armor"
    var equipped: Bool?
    var sheds_light: Bool?
    var bright_ft: Double?
    var dim_ft: Double?
    var light_color: String?
    var flicker: Bool?
    // Weapon-only fields, surfaced in StatsView's "Equipped Weapons"
    // section. The web's CreatureForm exposes all of these on weapon
    // items; for non-weapon items they're missing/blank.
    var weapon_range: String?    // melee / ranged / "30/60" etc.
    var attack_stat: String?     // STR / DEX / etc.
    var attack_bonus_misc: Int?  // additional +N on the attack roll
    var damage_entries: [SpellDamage]?
    var properties: String?      // freeform "Finesse, Light, Versatile (1d10)"

    var id: String { name ?? UUID().uuidString }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.name        = try? c.decodeIfPresent(String.self, forKey: .name)
        self.qty         = decodeFlexibleInt(c, .qty)
        self.weight      = decodeFlexibleDouble(c, .weight)
        self.desc        = try? c.decodeIfPresent(String.self, forKey: .desc)
        self.item_type   = try? c.decodeIfPresent(String.self, forKey: .item_type)
        self.equipped    = try? c.decodeIfPresent(Bool.self,   forKey: .equipped)
        self.sheds_light = try? c.decodeIfPresent(Bool.self,   forKey: .sheds_light)
        self.bright_ft   = decodeFlexibleDouble(c, .bright_ft)
        self.dim_ft      = decodeFlexibleDouble(c, .dim_ft)
        self.light_color = try? c.decodeIfPresent(String.self, forKey: .light_color)
        self.flicker     = try? c.decodeIfPresent(Bool.self,   forKey: .flicker)
        self.weapon_range      = try? c.decodeIfPresent(String.self, forKey: .weapon_range)
        self.attack_stat       = try? c.decodeIfPresent(String.self, forKey: .attack_stat)
        self.attack_bonus_misc = decodeFlexibleInt(c, .attack_bonus_misc)
        self.damage_entries    = try? c.decodeIfPresent([SpellDamage].self, forKey: .damage_entries)
        self.properties        = try? c.decodeIfPresent(String.self, forKey: .properties)
    }
    private enum CodingKeys: String, CodingKey {
        case name, qty, weight, desc, item_type, equipped, sheds_light
        case bright_ft, dim_ft, light_color, flicker
        case weapon_range, attack_stat, attack_bonus_misc, damage_entries, properties
    }
}

// Spell — JSONB row on creature.spells. Mirrors the shape spell_library
// uses (see init.sql) so the same model decodes both sources. Same
// flexible-numeric treatment as InventoryItem because the web form
// stores blank numerics as empty strings.
struct Spell: Codable, Equatable, Identifiable {
    var name: String?
    var level: Int?
    var type: String?            // "attack" | "save" | "utility" | "heal"
    var school: String?
    var casting_time: String?
    var range_area: String?
    var duration: String?
    var attack_save: String?
    var save_ability: String?
    var casting_ability: String?  // STR / DEX / ... — drives Save DC / Atk Bonus
    var prepared: Bool?
    var damage_entries: [SpellDamage]?
    var description: String?
    var extra_effects: String?
    var allowed_classes: [String]?

    var id: String { name ?? UUID().uuidString }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.name            = try? c.decodeIfPresent(String.self, forKey: .name)
        self.level           = decodeFlexibleInt(c, .level)
        self.type            = try? c.decodeIfPresent(String.self, forKey: .type)
        self.school          = try? c.decodeIfPresent(String.self, forKey: .school)
        self.casting_time    = try? c.decodeIfPresent(String.self, forKey: .casting_time)
        self.range_area      = try? c.decodeIfPresent(String.self, forKey: .range_area)
        self.duration        = try? c.decodeIfPresent(String.self, forKey: .duration)
        self.attack_save     = try? c.decodeIfPresent(String.self, forKey: .attack_save)
        self.save_ability    = try? c.decodeIfPresent(String.self, forKey: .save_ability)
        self.casting_ability = try? c.decodeIfPresent(String.self, forKey: .casting_ability)
        self.prepared        = try? c.decodeIfPresent(Bool.self, forKey: .prepared)
        self.damage_entries  = try? c.decodeIfPresent([SpellDamage].self, forKey: .damage_entries)
        self.description     = try? c.decodeIfPresent(String.self, forKey: .description)
        self.extra_effects   = try? c.decodeIfPresent(String.self, forKey: .extra_effects)
        self.allowed_classes = try? c.decodeIfPresent([String].self, forKey: .allowed_classes)
    }
    private enum CodingKeys: String, CodingKey {
        case name, level, type, school, casting_time, range_area, duration
        case attack_save, save_ability, casting_ability, prepared
        case damage_entries, description, extra_effects, allowed_classes
    }
}

// StatAction — minimal {name, desc} entry used by every stat-block
// section (actions / bonus_actions / reactions / class_features / etc).
// Server stores them as JSONB arrays of objects; we tolerate extra
// fields and pull just the two we render.
struct StatAction: Codable, Equatable, Identifiable {
    var name: String?
    var desc: String?
    var id: String { name ?? UUID().uuidString }
}

struct SpellDamage: Codable, Equatable {
    var damage: String?          // "2d6" / "1d8 + WIS"
    var damage_type: String?     // "fire" / "radiant" / etc.
}

// NPC chat — DM-driven NPC speech relayed through the plugin event
// bus. Identifiable so SwiftUI's .sheet(item:) can present them; one
// at a time, just like whispers.
struct NpcSay: Identifiable, Equatable {
    let id: String
    let speaker: String
    let langSlug: String
    let text: String
    let target: Int?
    let ts: Date
    // Resolved when the say event lands — true if the player's
    // creature knows the language (so we render plain text). false →
    // scrambled gibberish.
    let understood: Bool
    // The text actually shown to the player. plainText when understood,
    // scrambled gibberish otherwise. Computed once at receive-time so
    // the popup can stay dumb.
    let displayText: String
}

// ── NPC chat language scrambler ────────────────────────────────────
// Direct port of the web plugin's scrambler so iOS players see the
// same gibberish their web friends see for the same untranslated line.
// Algorithm: deterministic per-language flavour table + a mulberry32
// PRNG seeded by a hash of (slug :: text). Each word in the source is
// replaced with a same-ish-length string drawn from the language's
// character pool. Same input → same output → players cross-checking
// see matching nonsense.
struct NpcLangFlavour {
    let chars: String
    let avgWord: Int
    let joiner: String
}

private let npcChatFlavourTable: [String: NpcLangFlavour] = [
    "common":       NpcLangFlavour(chars: "abcdefghijklmnopqrstuvwxyz", avgWord: 5, joiner: ""),
    "dwarvish":     NpcLangFlavour(chars: "bdgkrtvzhcdmnp",              avgWord: 6, joiner: "-"),
    "elvish":       NpcLangFlavour(chars: "aeilmnorsuyãë",               avgWord: 7, joiner: "'"),
    "giant":        NpcLangFlavour(chars: "aoughrtkmnj",                 avgWord: 5, joiner: ""),
    "gnomish":      NpcLangFlavour(chars: "iaezvksrhlu",                 avgWord: 6, joiner: ""),
    "goblin":       NpcLangFlavour(chars: "ksgrtzbhix",                  avgWord: 4, joiner: ""),
    "halfling":     NpcLangFlavour(chars: "aeiouhlrwbnmt",               avgWord: 5, joiner: ""),
    "orc":          NpcLangFlavour(chars: "kgthrzbmnu",                  avgWord: 5, joiner: "-"),
    "abyssal":      NpcLangFlavour(chars: "kxszvqthrum",                 avgWord: 6, joiner: ""),
    "celestial":    NpcLangFlavour(chars: "aeiouhlmsrntw",               avgWord: 7, joiner: "'"),
    "draconic":     NpcLangFlavour(chars: "sshrxkthazvi",                avgWord: 6, joiner: "-"),
    "deep-speech":  NpcLangFlavour(chars: "qzxk'h…rnv",                  avgWord: 5, joiner: "·"),
    "infernal":     NpcLangFlavour(chars: "kzthrxvqsbm",                 avgWord: 6, joiner: ""),
    "primordial":   NpcLangFlavour(chars: "aelourwhsv",                  avgWord: 6, joiner: ""),
    "sylvan":       NpcLangFlavour(chars: "aeilmnorsywp",                avgWord: 7, joiner: "'"),
    "undercommon":  NpcLangFlavour(chars: "kszthrxqvm",                  avgWord: 5, joiner: ""),
    "druidic":      NpcLangFlavour(chars: "oacisthlmrne",                avgWord: 6, joiner: "-"),
    "thieves-cant": NpcLangFlavour(chars: "gestkmnrhloi",                avgWord: 4, joiner: ""),
]

private func npcHashSeed(_ s: String) -> UInt32 {
    var h: UInt32 = 2166136261
    for byte in s.utf8 {
        h ^= UInt32(byte)
        h = h &* 16777619
    }
    return h
}

// mulberry32 — pure port of the JS implementation. Returns a fresh
// closure each call so concurrent scrambles don't share state.
private func npcMulberry32(_ seed: UInt32) -> () -> Double {
    var a: UInt32 = seed
    return {
        a = a &+ 0x6D2B79F5
        var t: UInt32 = a
        t = (t ^ (t >> 15)) &* (t | 1)
        t = t ^ (t &+ ((t ^ (t >> 7)) &* (t | 61)))
        return Double((t ^ (t >> 14))) / 4294967296.0
    }
}

private func npcGenerateFlavour(_ slug: String) -> NpcLangFlavour {
    let baseLetters = Array("aeiouybcdfghjklmnprstvwxz")
    let rng = npcMulberry32(npcHashSeed(slug.isEmpty ? "custom" : slug))
    let len = 10 + Int(rng() * 6)
    var chars = ""
    for _ in 0..<len { chars.append(baseLetters[Int(rng() * Double(baseLetters.count))]) }
    let avgWord = 4 + Int(rng() * 5)
    let joiner: String
    let r1 = rng()
    let r2 = rng()
    if r1 < 0.3      { joiner = "'" }
    else if r2 < 0.5 { joiner = "-" }
    else             { joiner = "" }
    return NpcLangFlavour(chars: chars, avgWord: avgWord, joiner: joiner)
}

func npcScramble(_ text: String, slug: String) -> String {
    let flav = npcChatFlavourTable[slug] ?? npcGenerateFlavour(slug)
    let rng = npcMulberry32(npcHashSeed("\(slug)::\(text)"))
    let chars = Array(flav.chars)
    let avg = max(1, flav.avgWord)
    let joiner = flav.joiner
    // Word boundaries — replace each \w+ with a same-ish-length nonsense
    // word. Punctuation and spaces flow through unchanged so the cadence
    // of the original line is preserved.
    var out = ""
    var word = ""
    func flushWord() {
        guard !word.isEmpty else { return }
        let wordLen = max(2, Int(Double(word.count) * (0.85 + rng() * 0.4)))
        var w = ""
        for i in 0..<wordLen {
            if !joiner.isEmpty, i > 1, i < wordLen - 1, rng() < 1.0 / Double(avg) {
                w += joiner
            } else {
                w.append(chars[Int(rng() * Double(chars.count))])
            }
        }
        // Preserve leading capital so "Hello" stays "Iorip" not "iorip".
        if let first = word.first, first.isUppercase, let scrambledFirst = w.first {
            w = String(scrambledFirst).uppercased() + w.dropFirst()
        }
        out += w
        word = ""
    }
    for ch in text {
        if ch.isLetter || ch == "'" {
            word.append(ch)
        } else {
            flushWord()
            out.append(ch)
        }
    }
    flushWord()
    return out
}

// Player-known languages parser — same shape the web uses. Input
// is "Common, Goblin (understands but cannot speak), Custom Tongue".
// Output is the slug list; tail annotations are dropped.
func npcParseKnownLanguages(_ raw: String) -> [String] {
    raw.split(separator: ",")
        .map { $0.trimmingCharacters(in: .whitespaces) }
        .compactMap { part -> String? in
            // Strip parenthetical tails: "Goblin (understands…)" → "Goblin".
            let name = part.split(separator: "(").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? part
            guard !name.isEmpty else { return nil }
            return npcSlugForName(name)
        }
}

func npcSlugForName(_ name: String) -> String {
    let lower = name.lowercased().trimmingCharacters(in: .whitespaces)
    if lower.isEmpty { return "" }
    // Direct table hit (canonical languages always slugify cleanly).
    if npcChatFlavourTable.keys.contains(lower) { return lower }
    // Fallback: kebab-case the input.
    let allowed = Set("abcdefghijklmnopqrstuvwxyz0123456789")
    var out = ""
    var lastDash = false
    for ch in lower {
        if allowed.contains(ch) {
            out.append(ch)
            lastDash = false
        } else if !lastDash, !out.isEmpty {
            out.append("-")
            lastDash = true
        }
    }
    while out.hasSuffix("-") { out.removeLast() }
    return out
}

// Flexible numeric decoders for JSONB fields where the web form may
// have stored a number, a numeric string, or a blank string. Strict
// Codable's Double/Int decoders throw on any of those mismatches and
// fail the entire enclosing object — these helpers degrade to nil so
// individual mismatches don't blow up the whole creature decode.
func decodeFlexibleDouble<K: CodingKey>(_ container: KeyedDecodingContainer<K>, _ key: K) -> Double? {
    if let d = try? container.decodeIfPresent(Double.self, forKey: key) { return d }
    if let i = try? container.decodeIfPresent(Int.self, forKey: key) { return Double(i) }
    if let s = try? container.decodeIfPresent(String.self, forKey: key) {
        return s.isEmpty ? nil : Double(s)
    }
    return nil
}

func decodeFlexibleInt<K: CodingKey>(_ container: KeyedDecodingContainer<K>, _ key: K) -> Int? {
    if let i = try? container.decodeIfPresent(Int.self, forKey: key) { return i }
    if let d = try? container.decodeIfPresent(Double.self, forKey: key) { return Int(d) }
    if let s = try? container.decodeIfPresent(String.self, forKey: key) {
        return s.isEmpty ? nil : Int(s)
    }
    return nil
}

struct SessionInfo: Codable, Equatable {
    let id: Int
    let session_code: String?
    let map_id: Int?
    let combat_active: Bool?
    let combat_turn: Int?
}

// Dice roll payload — same shape as the server's `roll_dice` socket
// event. Players emit these and the server broadcasts dice_rolled.
struct DiceRollRequest: Encodable {
    let dice: Int       // 4, 6, 8, 10, 12, 20, 100
    let count: Int
    let modifier: Int
    let label: String?
}

// Light source preset selectable from the Dice/Light tab. Matches the
// web app's BASE_TORCH_PRESETS in PlayerView.jsx so the brightFt/dimFt
// values agree across clients.
struct LightPreset: Identifiable, Hashable {
    let id: Int          // index into the static list
    let label: String
    let brightFt: Double
    let dimFt: Double
    let flicker: Bool

    static let all: [LightPreset] = [
        LightPreset(id: 0, label: "No Light", brightFt: 0,  dimFt: 0,  flicker: false),
        LightPreset(id: 1, label: "Candle",   brightFt: 0,  dimFt: 5,  flicker: true),
        LightPreset(id: 2, label: "Torch",    brightFt: 20, dimFt: 40, flicker: true),
        LightPreset(id: 3, label: "Lantern",  brightFt: 30, dimFt: 60, flicker: true),
    ]

    static func match(brightFt: Double, dimFt: Double) -> LightPreset {
        all.first(where: { abs($0.brightFt - brightFt) < 0.5 && abs($0.dimFt - dimFt) < 0.5 })
            ?? all[0]
    }
}

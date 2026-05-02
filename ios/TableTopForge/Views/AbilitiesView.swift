import SwiftUI

// AbilitiesView — combined Abilities + Skills tab.
//
// Top: a 3-column × 2-row grid of all six ability scores. Each cell
// shows the score, the modifier, and a small filled-circle indicator
// when the player is proficient in that ability's saving throw. The
// grid order follows the standard sheet layout (STR / DEX / CON in the
// first row, INT / WIS / CHA in the second).
//
// Below: every D&D 5e skill in alphabetical order, each row showing
// the proficiency dot (none / proficient / expert) and the final
// modifier — server stores the full bonus when proficient (ability
// mod + proficiency [+ expertise + magic items]) so we can read it
// directly. When the skill field is nil, fall back to the bare
// ability mod.
struct AbilitiesView: View {
    let store: SessionStore
    let socket: SocketClient

    private var creature: Creature? { socket.creature }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let c = creature {
                        abilityGrid(c: c)
                            .padding(.horizontal)
                            .padding(.top)
                        skillsList(c: c)
                            .padding(.horizontal)
                        proficienciesPanel(c: c)
                            .padding(.horizontal)
                            .padding(.bottom)
                    } else {
                        ContentUnavailableView(
                            "Loading character",
                            systemImage: "figure.run",
                            description: Text("Once your character loads, ability scores and skills show here.")
                        )
                        .padding(.top, 80)
                    }
                }
            }
            .navigationTitle("Abilities & Skills")
        }
    }

    // ── Ability grid ──────────────────────────────────────────────────
    @ViewBuilder
    private func abilityGrid(c: Creature) -> some View {
        let cells: [AbilityCell] = [
            .init(label: "STR", score: c.strength,    save: c.save_str),
            .init(label: "DEX", score: c.dexterity,   save: c.save_dex),
            .init(label: "CON", score: c.constitution,save: c.save_con),
            .init(label: "INT", score: c.intelligence,save: c.save_int),
            .init(label: "WIS", score: c.wisdom,      save: c.save_wis),
            .init(label: "CHA", score: c.charisma,    save: c.save_cha),
        ]
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
            ForEach(cells) { cell in
                AbilityCellView(cell: cell)
            }
        }
    }

    // ── Proficiencies (armor / shields / tools / weapons) ─────────────
    // Read-only readout of the four non-skill proficiency families
    // the character sheet tracks. Sections collapse out automatically
    // when their data is empty so the panel stays compact.
    @ViewBuilder
    private func proficienciesPanel(c: Creature) -> some View {
        let armorParts: [String] = {
            var arr: [String] = []
            if c.prof_light_armor  == true { arr.append("Light") }
            if c.prof_medium_armor == true { arr.append("Medium") }
            if c.prof_heavy_armor  == true { arr.append("Heavy") }
            if c.prof_shields      == true { arr.append("Shields") }
            return arr
        }()
        let weaponList = (c.weapon_proficiencies ?? "")
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let toolList = (c.tool_proficiencies ?? "")
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let anyContent = !armorParts.isEmpty || !weaponList.isEmpty || !toolList.isEmpty

        if anyContent {
            VStack(alignment: .leading, spacing: 0) {
                Text("Proficiencies")
                    .font(.headline)
                    .padding(.bottom, 6)
                VStack(alignment: .leading, spacing: 0) {
                    if !armorParts.isEmpty {
                        ProficiencyRow(label: "Armor & Shields",
                                       items: armorParts,
                                       systemImage: "shield.fill")
                        Divider().padding(.leading, 28)
                    }
                    if !weaponList.isEmpty {
                        ProficiencyRow(label: "Weapons",
                                       items: weaponList,
                                       systemImage: "scope")
                        Divider().padding(.leading, 28)
                    }
                    if !toolList.isEmpty {
                        ProficiencyRow(label: "Tools",
                                       items: toolList,
                                       systemImage: "hammer.fill")
                    }
                }
                .padding(.vertical, 4)
                .background(.tint.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // ── Skills list ───────────────────────────────────────────────────
    @ViewBuilder
    private func skillsList(c: Creature) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Skills")
                .font(.headline)
                .padding(.bottom, 6)
            VStack(spacing: 0) {
                ForEach(Array(SkillCatalog.all.enumerated()), id: \.element.key) { idx, def in
                    SkillRow(
                        def: def,
                        bonus: skillBonus(for: def, c: c),
                        proficiency: proficiency(for: def, c: c)
                    )
                    if idx < SkillCatalog.all.count - 1 {
                        Divider().padding(.leading, 28)
                    }
                }
            }
            .padding(.vertical, 4)
            .background(.tint.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
        }
    }

    // Returns the modifier we display next to a skill. If the server
    // stored a value, that's authoritative — it already includes
    // proficiency + expertise + any magic-item bonuses. Otherwise fall
    // back to the bare ability mod.
    private func skillBonus(for def: SkillCatalog.Skill, c: Creature) -> Int {
        if let stored = def.read(c) { return stored }
        return modifier(for: def.stat, c: c)
    }

    private func proficiency(for def: SkillCatalog.Skill, c: Creature) -> SkillRow.Proficiency {
        let isProf = def.read(c) != nil
        let isExpert = c.skill_expertise?[def.key] == true
        if isExpert { return .expert }
        if isProf   { return .proficient }
        return .none
    }

    private func modifier(for stat: SkillCatalog.Stat, c: Creature) -> Int {
        let raw: Int
        switch stat {
        case .str: raw = c.strength     ?? 10
        case .dex: raw = c.dexterity    ?? 10
        case .con: raw = c.constitution ?? 10
        case .int: raw = c.intelligence ?? 10
        case .wis: raw = c.wisdom       ?? 10
        case .cha: raw = c.charisma     ?? 10
        }
        return (raw - 10) / 2
    }
}

// One cell in the ability grid.
private struct AbilityCell: Identifiable {
    let label: String
    let score: Int?
    let save: Int?
    var id: String { label }
}

private struct AbilityCellView: View {
    let cell: AbilityCell

    var body: some View {
        VStack(spacing: 6) {
            Text(cell.label)
                .font(.caption.weight(.semibold).monospaced())
                .foregroundStyle(.secondary)
            Text(cell.score.map { "\($0)" } ?? "—")
                .font(.system(.title, design: .rounded).weight(.bold))
            Text(modText)
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
            HStack(spacing: 4) {
                // Both arms of a foregroundStyle ternary need the
                // same concrete ShapeStyle type — `.tint` resolves
                // to TintShapeStyle while `.gray.opacity(...)` is a
                // Color, so the compiler can't pick a common type
                // without an explicit cast. Use Color.accentColor
                // for the proficient pip to keep both arms `Color`.
                Image(systemName: cell.save != nil ? "circle.fill" : "circle")
                    .font(.caption2)
                    .foregroundStyle(cell.save != nil ? Color.accentColor : Color.gray.opacity(0.6))
                Text("Save \(saveText)")
                    .font(.caption2.monospaced())
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
    }

    private var modValue: Int? {
        guard let s = cell.score else { return nil }
        return (s - 10) / 2
    }
    private var modText: String {
        guard let m = modValue else { return "—" }
        return m >= 0 ? "+\(m)" : "\(m)"
    }
    private var saveText: String {
        if let save = cell.save {
            return save >= 0 ? "+\(save)" : "\(save)"
        }
        return modText
    }
}

// One row inside the Proficiencies panel: an SF Symbol, a category
// label, then a comma-separated readout. Used for armor/weapons/tools.
private struct ProficiencyRow: View {
    let label: String
    let items: [String]
    let systemImage: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .frame(width: 16)
                .foregroundStyle(.secondary)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.callout)
                Text(items.joined(separator: ", "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
    }
}

private struct SkillRow: View {
    let def: SkillCatalog.Skill
    let bonus: Int
    let proficiency: Proficiency

    enum Proficiency { case none, proficient, expert }

    var body: some View {
        HStack(spacing: 12) {
            proficiencyDot
            Text(def.label)
                .font(.callout)
            Text("(\(def.stat.short))")
                .font(.caption.monospaced())
                .foregroundStyle(.tertiary)
            Spacer()
            Text(bonus >= 0 ? "+\(bonus)" : "\(bonus)")
                .font(.system(.callout, design: .monospaced).weight(.semibold))
                .foregroundStyle(proficiency == .none ? .secondary : .primary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private var proficiencyDot: some View {
        switch proficiency {
        case .none:
            Image(systemName: "circle").foregroundStyle(.gray.opacity(0.5))
        case .proficient:
            Image(systemName: "circle.fill").foregroundStyle(.tint)
        case .expert:
            // Expert = double-proficiency. A circle inside a circle
            // reads as "more than just proficient" without needing a
            // separate text label.
            Image(systemName: "smallcircle.filled.circle.fill")
                .foregroundStyle(.yellow)
        }
    }
}

// ── Skill catalogue (canonical 5e order, alphabetical) ───────────────
enum SkillCatalog {
    enum Stat: String {
        case str, dex, con, int, wis, cha
        var short: String { rawValue.uppercased() }
    }

    struct Skill {
        let key: String
        let label: String
        let stat: Stat
        let read: (Creature) -> Int?
    }

    static let all: [Skill] = [
        Skill(key: "skill_acrobatics",      label: "Acrobatics",      stat: .dex,
              read: { $0.skill_acrobatics }),
        Skill(key: "skill_animal_handling", label: "Animal Handling", stat: .wis,
              read: { $0.skill_animal_handling }),
        Skill(key: "skill_arcana",          label: "Arcana",          stat: .int,
              read: { $0.skill_arcana }),
        Skill(key: "skill_athletics",       label: "Athletics",       stat: .str,
              read: { $0.skill_athletics }),
        Skill(key: "skill_deception",       label: "Deception",       stat: .cha,
              read: { $0.skill_deception }),
        Skill(key: "skill_history",         label: "History",         stat: .int,
              read: { $0.skill_history }),
        Skill(key: "skill_insight",         label: "Insight",         stat: .wis,
              read: { $0.skill_insight }),
        Skill(key: "skill_intimidation",    label: "Intimidation",    stat: .cha,
              read: { $0.skill_intimidation }),
        Skill(key: "skill_investigation",   label: "Investigation",   stat: .int,
              read: { $0.skill_investigation }),
        Skill(key: "skill_medicine",        label: "Medicine",        stat: .wis,
              read: { $0.skill_medicine }),
        Skill(key: "skill_nature",          label: "Nature",          stat: .int,
              read: { $0.skill_nature }),
        Skill(key: "skill_perception",      label: "Perception",      stat: .wis,
              read: { $0.skill_perception }),
        Skill(key: "skill_performance",     label: "Performance",     stat: .cha,
              read: { $0.skill_performance }),
        Skill(key: "skill_persuasion",      label: "Persuasion",      stat: .cha,
              read: { $0.skill_persuasion }),
        Skill(key: "skill_religion",        label: "Religion",        stat: .int,
              read: { $0.skill_religion }),
        Skill(key: "skill_sleight_of_hand", label: "Sleight of Hand", stat: .dex,
              read: { $0.skill_sleight_of_hand }),
        Skill(key: "skill_stealth",         label: "Stealth",         stat: .dex,
              read: { $0.skill_stealth }),
        Skill(key: "skill_survival",        label: "Survival",        stat: .wis,
              read: { $0.skill_survival }),
    ]
}

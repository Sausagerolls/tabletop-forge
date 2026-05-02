import SwiftUI

// SpellsView — three sections, top to bottom:
//   1. Spellcasting modifiers — for every casting ability that's
//      actually used by at least one of this character's spells, show
//      Mod / Save DC / Atk Bonus. Same logic as the web's StatBlock
//      so a multiclass caster gets a row per ability.
//   2. Prepared spells, grouped by level. Each level header has a
//      checkbox-style slot tracker (one circle per slot — tap to
//      toggle used/available). Cantrips have no slot row.
//   3. Collapsible "All known spells" — every spell on the creature
//      regardless of prepared, so the player can see what they could
//      prepare. Closed by default.
struct SpellsView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var saveError: String? = nil
    @State private var saving = false

    private var creature: Creature? { socket.creature }
    private var allSpells: [Spell] { creature?.spells ?? [] }
    private var preparedSpells: [Spell] {
        // Cantrips are always available — treat them as "prepared" for
        // display purposes regardless of the prepared flag, because
        // the web flow doesn't require them to be ticked.
        allSpells.filter { ($0.prepared ?? false) || ($0.level ?? 0) == 0 }
    }

    private var spellLevels: [Int] {
        let used = Set(preparedSpells.compactMap(\.level))
        let withSlots = creature?.spell_slots?.levels.keys ?? [:].keys
        return Array(used.union(Set(withSlots))).sorted()
    }

    var body: some View {
        NavigationStack {
            Group {
                if creature == nil {
                    ContentUnavailableView(
                        "Loading character",
                        systemImage: "sparkles",
                        description: Text("Open the Stats tab once to populate your spells, then come back.")
                    )
                } else if allSpells.isEmpty {
                    ContentUnavailableView(
                        "No spells",
                        systemImage: "sparkles",
                        description: Text("Add spells via the web character editor — they'll show up here.")
                    )
                } else {
                    List {
                        modifiersSection
                        ForEach(spellLevels, id: \.self) { lvl in
                            preparedSection(level: lvl)
                        }
                        knownSpellsSection
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await reloadCreature() }
                }
            }
            .navigationTitle("Spells")
            .overlay(alignment: .bottom) {
                if saving {
                    ProgressView("Saving…")
                        .padding(8)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(.bottom, 12)
                }
                if let err = saveError {
                    Text(err).font(.footnote).foregroundStyle(.red)
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                        .padding(.bottom, 12)
                }
            }
        }
    }

    // ── Spellcasting modifiers ────────────────────────────────────────
    @ViewBuilder
    private var modifiersSection: some View {
        let abilities = usedCastingAbilities
        if let c = creature, !abilities.isEmpty {
            Section("Spellcasting") {
                ForEach(abilities, id: \.self) { ab in
                    let mod = abilityMod(ability: ab, c: c)
                    let pb  = c.proficiency_bonus ?? ((c.char_level ?? 1) - 1) / 4 + 2
                    let dc  = 8 + pb + mod
                    let atk = pb + mod
                    HStack(spacing: 14) {
                        Text(ab)
                            .font(.system(.body, design: .monospaced).weight(.semibold))
                            .frame(width: 38, alignment: .leading)
                            .foregroundStyle(.tint)
                        ModifierPill(label: "Mod",     value: signed(mod))
                        ModifierPill(label: "Save DC", value: "\(dc)")
                        ModifierPill(label: "Atk",     value: signed(atk))
                    }
                }
            }
        }
    }

    private var usedCastingAbilities: [String] {
        let raw = preparedSpells.compactMap { $0.casting_ability?.uppercased() }
        let valid = Set(raw.filter { ["STR","DEX","CON","INT","WIS","CHA"].contains($0) })
        return ["STR","DEX","CON","INT","WIS","CHA"].filter { valid.contains($0) }
    }

    private func abilityMod(ability: String, c: Creature) -> Int {
        let raw: Int
        switch ability {
        case "STR": raw = c.strength     ?? 10
        case "DEX": raw = c.dexterity    ?? 10
        case "CON": raw = c.constitution ?? 10
        case "INT": raw = c.intelligence ?? 10
        case "WIS": raw = c.wisdom       ?? 10
        case "CHA": raw = c.charisma     ?? 10
        default:    raw = 10
        }
        return (raw - 10) / 2
    }

    private func signed(_ n: Int) -> String { n >= 0 ? "+\(n)" : "\(n)" }

    // ── Prepared spells per level ─────────────────────────────────────
    @ViewBuilder
    private func preparedSection(level lvl: Int) -> some View {
        let bucket = preparedSpells.filter { ($0.level ?? 0) == lvl }
        if !bucket.isEmpty {
            Section {
                ForEach(bucket) { spell in
                    SpellRow(spell: spell)
                }
            } header: {
                LevelHeader(
                    level: lvl,
                    slot: creature?.spell_slots?.levels[lvl],
                    onToggleSlot: { idx in toggleSlot(level: lvl, slotIndex: idx) }
                )
            }
        }
    }

    // ── All known spells ──────────────────────────────────────────────
    @ViewBuilder
    private var knownSpellsSection: some View {
        // Skip the section if every known spell is already shown in
        // prepared (no use in a redundant collapsible).
        let unpreparedExists = allSpells.contains { ($0.prepared ?? false) == false && ($0.level ?? 0) > 0 }
        if unpreparedExists {
            Section {
                AllKnownDisclosure(spells: allSpells)
            }
        }
    }

    // ── Slot tracker ──────────────────────────────────────────────────
    // Tapping a slot circle: if the circle is "used", clear it (and
    // any later ones); if "available", mark it (and earlier ones)
    // used. Standard sheet UX.
    private func toggleSlot(level: Int, slotIndex: Int) {
        guard var creature = creature else { return }
        var slots = creature.spell_slots ?? SpellSlots()
        var slot = slots.levels[level] ?? SpellSlot(total: 0, used: 0)
        let total = slot.total ?? 0
        let used = slot.used ?? 0
        // Indexes are 1-based for clarity (matches the visual). If
        // tapping a used slot, drop used to slotIndex - 1; if tapping
        // an available slot, raise used to slotIndex.
        let nextUsed = slotIndex <= used ? slotIndex - 1 : slotIndex
        slot.used = max(0, min(total, nextUsed))
        slots.levels[level] = slot
        creature.spell_slots = slots
        socket.creature = creature
        Task { await persistSpellSlots(slots) }
    }

    private func persistSpellSlots(_ slots: SpellSlots) async {
        guard
            let cid = socket.creature?.id,
            let base = store.baseURL
        else { return }
        saving = true
        defer { saving = false }
        do {
            let data = try JSONEncoder().encode(slots)
            let json = try JSONSerialization.jsonObject(with: data)
            _ = try await APIClient(baseURL: base).patchCreature(id: cid, updates: ["spell_slots": json])
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func reloadCreature() async {
        guard
            let cid = socket.creature?.id,
            let base = store.baseURL
        else { return }
        do {
            socket.creature = try await APIClient(baseURL: base).fetchCreature(id: cid)
        } catch {
            saveError = error.localizedDescription
        }
    }
}

// One small pill rendering a label + monospaced value, used for the
// Mod / Save DC / Atk bonus row in the spellcasting section.
private struct ModifierPill: View {
    let label: String
    let value: String
    var body: some View {
        HStack(spacing: 4) {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            Text(value).font(.system(.callout, design: .monospaced).weight(.semibold))
        }
    }
}

// Level header with a slot-tracker checkbox row. Cantrip headers (lvl
// 0) skip the checkboxes — they have no slots.
private struct LevelHeader: View {
    let level: Int
    let slot: SpellSlot?
    let onToggleSlot: (Int) -> Void

    var body: some View {
        HStack {
            Text(level == 0 ? "Cantrips" : "Level \(level)")
                .font(.headline)
            Spacer()
            if level > 0, let slot, let total = slot.total, total > 0 {
                let used = slot.used ?? 0
                HStack(spacing: 4) {
                    ForEach(1...total, id: \.self) { idx in
                        Button {
                            onToggleSlot(idx)
                        } label: {
                            Image(systemName: idx <= used ? "circle.fill" : "circle")
                                .font(.callout)
                                .foregroundStyle(idx <= used ? Color.gray.opacity(0.7) : Color.accentColor)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Level \(level) slot \(idx)")
                        .accessibilityValue(idx <= used ? "spent" : "available")
                        .accessibilityHint("Double-tap to toggle whether this spell slot is used.")
                    }
                }
                .accessibilityElement(children: .contain)
            }
        }
    }
}

// Single spell row used in both prepared sections and the
// collapsible all-known list.
private struct SpellRow: View {
    let spell: Spell
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                // No withAnimation — animating the toggle made the
                // List animate the cell's frame, which in turn shifted
                // the title text up/down during the transition. Instant
                // expand keeps the title locked in place.
                expanded.toggle()
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(spell.name ?? "(unnamed)")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.primary)
                        HStack(spacing: 8) {
                            if let school = spell.school, !school.isEmpty {
                                Text(school).font(.caption).foregroundStyle(.secondary)
                            }
                            if let dmg = firstDamageString {
                                Text(dmg).font(.caption.monospaced()).foregroundStyle(.red)
                            }
                            if let save = spell.save_ability, !save.isEmpty {
                                Text("save: \(save.uppercased())")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.purple)
                            }
                        }
                    }
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.secondary).font(.caption)
                }
            }
            .buttonStyle(.plain)

            if expanded {
                if let castingTime = spell.casting_time, !castingTime.isEmpty {
                    DetailLine(label: "Cast", value: castingTime)
                }
                if let range = spell.range_area, !range.isEmpty {
                    DetailLine(label: "Range", value: range)
                }
                if let duration = spell.duration, !duration.isEmpty {
                    DetailLine(label: "Duration", value: duration)
                }
                if let desc = spell.description, !desc.isEmpty {
                    Text(desc).font(.footnote).foregroundStyle(.secondary).padding(.top, 2)
                }
                // Extra effects — freeform "on a hit" / upcast / etc.
                // text written by the DM. Render with a small heading
                // so it doesn't blend into the description above.
                if let extra = spell.extra_effects, !extra.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Extra Effects")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.purple)
                        Text(extra).font(.footnote).foregroundStyle(.secondary)
                    }
                    .padding(.top, 4)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var firstDamageString: String? {
        guard let entries = spell.damage_entries, !entries.isEmpty else { return nil }
        return entries.compactMap { e in
            let d = e.damage ?? ""
            let t = e.damage_type ?? ""
            return [d, t].filter { !$0.isEmpty }.joined(separator: " ")
        }
        .joined(separator: ", ")
    }
}

// Collapsible "All known spells" — shows every spell on the creature,
// each line just the name + level + prepared dot. Tapping a row
// expands the same SpellRow detail.
private struct AllKnownDisclosure: View {
    let spells: [Spell]
    @State private var expanded = false

    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            ForEach(grouped, id: \.0) { (lvl, bucket) in
                Text(lvl == 0 ? "Cantrips" : "Level \(lvl)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)
                ForEach(bucket) { spell in
                    HStack {
                        Image(systemName: spell.prepared == true ? "checkmark.circle.fill" : "circle")
                            .font(.caption)
                            .foregroundStyle(spell.prepared == true ? Color.purple : Color.gray.opacity(0.5))
                        Text(spell.name ?? "(unnamed)").font(.callout)
                        Spacer()
                        if let school = spell.school, !school.isEmpty {
                            Text(school).font(.caption).foregroundStyle(.tertiary)
                        }
                    }
                }
            }
        } label: {
            HStack {
                Text("All known spells").font(.headline)
                Spacer()
                Text("\(spells.count)")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var grouped: [(Int, [Spell])] {
        let dict = Dictionary(grouping: spells, by: { $0.level ?? 0 })
        return dict.keys.sorted().map { ($0, dict[$0] ?? []) }
    }
}

private struct DetailLine: View {
    let label: String
    let value: String
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .frame(width: 60, alignment: .leading)
            Text(value).font(.caption)
        }
    }
}


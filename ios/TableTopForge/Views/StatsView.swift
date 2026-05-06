import SwiftUI

// StatsView — the headline player tab. Layout:
//   1. Identity card: avatar (tappable to toggle Heroic Inspiration,
//      glowing ring when active), name, level/class/subclass, race,
//      alignment, languages.
//   2. Vitals: HP/temp HP steppers + bar, hit-dice tracker.
//   3. Death Saves (only when current_hp == 0): success / failure pips.
//   4. Combat: AC, Initiative bonus, Passive Perception, Proficiency
//      Bonus, every non-zero movement speed.
//   5. Equipped Weapons: each weapon item with item_type=='weapon'
//      and equipped==true rendered with attack stat, bonus, damage,
//      range, properties.
//   6. Collapsible stat-block sections: Class Features, Special
//      Abilities, Feats, Actions, Bonus Actions, Reactions, Movement.
//   7. Conditions, GM whispers.
//
// Ability scores moved to AbilitiesView (separate tab) so this tab
// can give the at-the-table info more vertical room.
struct StatsView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var saveError: String? = nil
    @State private var clearedWhisperIds: Set<UUID> = []
    // Drives the hit-die chooser when a player has more than one
    // pool. Single-pool characters never see the picker — the button
    // spends the only available type immediately.
    @State private var showHitDicePicker: Bool = false

    private var creature: Creature? { socket.creature }
    private var playerToken: Token? {
        socket.tokens.first(where: { $0.id == socket.playerTokenId })
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                // Below this width the screen is too narrow to split
                // sensibly — iPhone portrait, narrow iPad split-view,
                // and Catalyst windows the user has tightened down.
                // Above it (iPhone landscape on a Pro/Plus, iPad in
                // any orientation, Mac Catalyst with a normal window)
                // the at-the-table info on the left + reference
                // material on the right reads much better than one
                // tall scrolling column.
                if geo.size.width >= 700 {
                    twoColumnLayout
                } else {
                    singleColumnLayout
                }
            }
            // No nav title on this tab — the avatar + name combo at
            // the top of the page is the heading. The redundant
            // "Stats" bar wasted vertical space and competed with
            // the character name visually.
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    // ── Layouts ──────────────────────────────────────────────────────
    // The two layouts share every Section view-builder — only the
    // packing differs. Refreshable goes on each Form so a pull-down
    // works on whichever column the user is touching.

    @ViewBuilder
    private var singleColumnLayout: some View {
        Form {
            identityCard
            if let token = playerToken { vitalsSection(token: token) }
            hitDiceSection
            bardicInspirationSection
            if (playerToken?.current_hp ?? -1) == 0 { deathSavesSection }
            combatSection
            equippedWeaponsSection
            classDetailsSection
            statBlockSections
            conditionsSection
            whispersSection
        }
        .refreshable { await reloadCreature() }
    }

    /// Wide layout — two side-by-side scrolling Forms. Left column
    /// is "what I'm doing this turn" (identity + vitals + combat
    /// + equipped weapons + active conditions); right column is
    /// "what I am / what was said" (class reference, stat-block
    /// sections, GM whispers). Both columns scroll independently
    /// so the player can leave their stat-block expanded on the
    /// right without losing sight of HP on the left.
    @ViewBuilder
    private var twoColumnLayout: some View {
        HStack(spacing: 0) {
            Form {
                identityCard
                if let token = playerToken { vitalsSection(token: token) }
                hitDiceSection
                bardicInspirationSection
                if (playerToken?.current_hp ?? -1) == 0 { deathSavesSection }
                combatSection
                equippedWeaponsSection
                conditionsSection
            }
            .refreshable { await reloadCreature() }
            .frame(maxWidth: .infinity)

            Divider()

            Form {
                classDetailsSection
                statBlockSections
                whispersSection
            }
            .refreshable { await reloadCreature() }
            .frame(maxWidth: .infinity)
        }
    }

    // ── Identity card ─────────────────────────────────────────────────
    // Centered portrait → name → subtitle stack. Bigger avatar (110pt
    // vs the old 72pt inline one) gives the page a clear focal point
    // and matches the way most physical character sheets lead with
    // the portrait.
    @ViewBuilder
    private var identityCard: some View {
        Section {
            VStack(spacing: 8) {
                Button {
                    toggleHeroicInspiration()
                } label: {
                    portrait
                        .frame(width: 110, height: 110)
                        .clipShape(Circle())
                        .overlay(inspirationRing)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
                // VoiceOver — the avatar button has no visible label so
                // we provide one explicitly. Hint communicates the
                // tappable behaviour for screen-reader users.
                .accessibilityLabel("Character portrait")
                .accessibilityHint(
                    creature?.heroic_inspiration == true
                    ? "Heroic Inspiration is active. Double-tap to spend it."
                    : "Double-tap to grant Heroic Inspiration."
                )
                .accessibilityAddTraits(.isButton)

                Text(displayName)
                    .font(.title2.weight(.bold))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.primary)

                if let subtitle = identitySubtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                if let raceLine = raceLine, !raceLine.isEmpty {
                    Text(raceLine)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                if let langs = creature?.languages, !langs.isEmpty {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("Languages:")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(langs)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 2)
                }
                if creature?.heroic_inspiration == true {
                    Label("Heroic Inspiration active — tap the avatar to spend it",
                          systemImage: "sparkles")
                        .font(.caption)
                        .foregroundStyle(.yellow)
                        .padding(.top, 2)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
    }

    private var displayName: String {
        creature?.name
            ?? playerToken?.nickname
            ?? playerToken?.name
            ?? store.playerName
    }

    private var identitySubtitle: String? {
        // Multiclass-aware: a multiclassed character renders as
        // "Level 5 — Fighter 3 / Wizard 2"; a single-class
        // character keeps the original "Level 5 Fighter (Battle
        // Master)" form so it stays readable when there's nothing
        // to merge.
        guard let c = creature else { return nil }
        return classLevelLine(c)
    }

    // Convert the stored background id (e.g. "acolyte-2024",
    // "criminal-2024", a UUID for a custom background) into a human-
    // friendly title-cased name. The web client keeps the canonical
    // catalog; we only need to render what the player picked.
    private var backgroundDisplayName: String? {
        guard let raw = creature?.background, !raw.isEmpty else { return nil }
        // SRD ids look like "acolyte-2024" — strip the trailing edition
        // and title-case the remaining slug. For UUIDs (custom rows)
        // there's no readable form on this side; fall through to nil
        // and let the web client name it.
        let trimmed = raw
            .replacingOccurrences(of: "-2024", with: "")
            .replacingOccurrences(of: "-2014", with: "")
        if trimmed.contains("-") && trimmed.count <= 30 {
            let words = trimmed.split(separator: "-").map { $0.capitalized }
            return words.joined(separator: " ")
        }
        // Don't try to render a bare UUID. Better to show nothing.
        if trimmed.count == 36 && trimmed.contains("-") { return nil }
        return trimmed.capitalized
    }

    private var raceLine: String? {
        var parts: [String] = []
        if let race = creature?.subtype, !race.isEmpty { parts.append(race) }
        if let bg = backgroundDisplayName       { parts.append(bg) }
        if let align = creature?.alignment, !align.isEmpty { parts.append(align) }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    @ViewBuilder
    private var portrait: some View {
        if let path = creature?.image_path,
           let base = store.baseURL,
           let url = URL(string: "\(base.absoluteString)/uploads/\(path)") {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                default: placeholderImage
                }
            }
        } else {
            placeholderImage
        }
    }
    private var placeholderImage: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable().scaledToFit().foregroundStyle(.tint.opacity(0.6))
    }

    // The glowing ring overlay — bright gold + radial blur when
    // Heroic Inspiration is on, plain tinted ring when off.
    @ViewBuilder
    private var inspirationRing: some View {
        if creature?.heroic_inspiration == true {
            Circle()
                .stroke(.yellow, lineWidth: 3)
                .shadow(color: .yellow.opacity(0.85), radius: 6)
                .shadow(color: .yellow.opacity(0.5), radius: 12)
        } else {
            Circle().stroke(.tint.opacity(0.4), lineWidth: 2)
        }
    }

    private func toggleHeroicInspiration() {
        guard var creature else { return }
        let next = !(creature.heroic_inspiration ?? false)
        creature.heroic_inspiration = next
        socket.creature = creature
        Task { await persist(["heroic_inspiration": next]) }
    }

    // ── Vitals ────────────────────────────────────────────────────────
    @ViewBuilder
    private func vitalsSection(token: Token) -> some View {
        Section("Hit Points") {
            Stepper(value: hpBinding(token: token), in: 0...max(token.max_hp ?? 1, 1)) {
                HStack {
                    Text("Current HP")
                    Spacer()
                    Text("\(token.current_hp ?? 0) / \(token.max_hp ?? 0)")
                        .font(.system(.body, design: .monospaced))
                }
            }
            Stepper(value: tempHpBinding(token: token), in: 0...99) {
                HStack {
                    Text("Temp HP")
                    Spacer()
                    Text("\(token.temp_hp ?? 0)")
                        .font(.system(.body, design: .monospaced))
                }
            }
            if let cur = token.current_hp, let mx = token.max_hp, mx > 0 {
                HpBar(current: cur, max: mx, temp: token.temp_hp ?? 0)
                    .padding(.vertical, 2)
            }
        }
    }

    // ── Hit Dice ──────────────────────────────────────────────────────
    // Multi-class pool. One row per die type derived from
    // char_class + multiclasses, plus a single "Use Hit Die" button.
    // With more than one type the button opens a confirmationDialog
    // chooser; with one type it spends immediately. Per-row plus
    // button restores a single die for that type (long-rest helper).
    @ViewBuilder
    private var hitDiceSection: some View {
        if let creature {
            let pool = computeHitDicePool(creature)
            if !pool.isEmpty {
                let usedMap = creature.hit_dice_used_by_type ?? [:]
                let availableTypes = pool.filter { (usedMap[$0.type] ?? 0) < $0.qty }
                Section("Hit Dice") {
                    ForEach(pool) { entry in
                        let used = max(0, min(entry.qty, usedMap[entry.type] ?? 0))
                        HStack {
                            Text("\(entry.qty)\(entry.type)")
                                .font(.system(.body, design: .monospaced))
                            Spacer()
                            Text("\(entry.qty - used) / \(entry.qty)")
                                .font(.system(.body, design: .monospaced))
                                .frame(minWidth: 70)
                            // Decrement-only — burn a die without
                            // rolling or healing. Mirrors the web
                            // sheet's checkbox toggle: "this die is
                            // gone, GM handled the HP separately"
                            // (e.g. the Bard's Song of Rest healed
                            // for them, the GM said "you used one
                            // off-screen", or the player wants to
                            // revert a botched Use Hit Die press
                            // without rolling another one).
                            Button { consumeHitDie(type: entry.type) } label: {
                                Image(systemName: "minus.circle")
                            }
                            .disabled(used >= entry.qty)
                            .buttonStyle(.plain)
                            .foregroundStyle(.tint)
                            Button { restoreHitDie(type: entry.type) } label: {
                                Image(systemName: "plus.circle")
                            }
                            .disabled(used <= 0)
                            .buttonStyle(.plain)
                            .foregroundStyle(.tint)
                        }
                    }
                    Button {
                        if availableTypes.count == 1 {
                            spendHitDie(type: availableTypes[0].type)
                        } else if availableTypes.count > 1 {
                            showHitDicePicker = true
                        }
                    } label: {
                        Text("Use Hit Die")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(availableTypes.isEmpty || playerToken == nil)
                    .buttonStyle(.borderedProminent)
                    .confirmationDialog(
                        "Use which hit die?",
                        isPresented: $showHitDicePicker,
                        titleVisibility: .visible,
                    ) {
                        ForEach(availableTypes) { entry in
                            let used = usedMap[entry.type] ?? 0
                            Button("\(entry.type)  (\(entry.qty - used)/\(entry.qty) left)") {
                                spendHitDie(type: entry.type)
                            }
                        }
                        Button("Cancel", role: .cancel) { }
                    }
                }
            }
        }
    }

    // Restore one die for the given type (long-rest helper). Mirrors
    // the web client's checkbox-toggle restore. No HP change — only
    // spending heals.
    private func restoreHitDie(type: String) {
        guard var creature else { return }
        var map = creature.hit_dice_used_by_type ?? [:]
        let cur = map[type] ?? 0
        map[type] = max(0, cur - 1)
        creature.hit_dice_used_by_type = map
        socket.creature = creature
        Task { await persist(["hit_dice_used_by_type": map]) }
    }

    // Consume one die for the given type WITHOUT rolling or healing.
    // Inverse of restoreHitDie. Used when the GM is handling the HP
    // change off-screen (e.g. Bardic Song of Rest, narrative healing)
    // and the player just needs to mark the die as gone.
    private func consumeHitDie(type: String) {
        guard var creature else { return }
        let pool = computeHitDicePool(creature)
        guard let entry = pool.first(where: { $0.type == type }) else { return }
        var map = creature.hit_dice_used_by_type ?? [:]
        let cur = map[type] ?? 0
        guard cur < entry.qty else { return }
        map[type] = cur + 1
        creature.hit_dice_used_by_type = map
        socket.creature = creature
        Task { await persist(["hit_dice_used_by_type": map]) }
    }

    // Spend one die of the given type: roll d{N} + CON mod, heal HP,
    // bump used count, broadcast the dice roll so the table sees it.
    private func spendHitDie(type: String) {
        guard var creature else { return }
        guard let token = playerToken else { return }
        let pool = computeHitDicePool(creature)
        guard let entry = pool.first(where: { $0.type == type }) else { return }
        let usedMap = creature.hit_dice_used_by_type ?? [:]
        let curUsed = usedMap[type] ?? 0
        guard curUsed < entry.qty else { return }

        let faces = Int(type.dropFirst()) ?? 8     // "d8" → 8
        let roll = Int.random(in: 1...faces)
        let conMod = ((creature.constitution ?? 10) - 10) / 2
        let healed = max(0, roll + conMod)

        var nextMap = usedMap
        nextMap[type] = curUsed + 1
        creature.hit_dice_used_by_type = nextMap
        socket.creature = creature

        Task { await persist(["hit_dice_used_by_type": nextMap]) }

        if healed > 0, let mx = token.max_hp {
            let newHp = min(mx, (token.current_hp ?? 0) + healed)
            socket.emitHpChange(tokenId: token.id, currentHp: newHp)
        }
        let modStr = conMod >= 0 ? "+\(conMod)" : "\(conMod)"
        socket.emitDiceRoll(DiceRollRequest(
            dice: faces, count: 1, modifier: conMod,
            label: "Hit Die (\(type)\(modStr)) — heal",
        ))
    }

    // ── Bardic Inspiration ────────────────────────────────────────────
    // Granted to a non-Bard PC by a Bard via the web Grant flow.
    // Stored as the bare die label ("d6" / "d8" / "d10" / "d12") on
    // creature.inspiration_die. The recipient sees a one-row section
    // with a Use button that rolls the die, broadcasts the roll, and
    // clears the field. Hidden when the field is empty/nil.
    @ViewBuilder
    private var bardicInspirationSection: some View {
        if let creature, let die = creature.inspiration_die, !die.isEmpty {
            Section("Bardic Inspiration") {
                HStack {
                    Image(systemName: "music.note")
                        .foregroundStyle(.purple)
                    Text(die)
                        .font(.system(.body, design: .monospaced))
                    Spacer()
                    Button {
                        useBardicInspiration(die: die)
                    } label: {
                        Text("Use")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.purple)
                }
            }
        }
    }

    private func useBardicInspiration(die: String) {
        guard var creature else { return }
        let faces = Int(die.dropFirst()) ?? 0
        guard faces > 0 else { return }
        let roll = Int.random(in: 1...faces)
        // Optimistic clear so the Use button drops away the moment
        // the player taps it. The PUT below cements the change on
        // the server; if that fails the next REST refetch reseeds.
        creature.inspiration_die = ""
        socket.creature = creature
        socket.emitDiceRoll(DiceRollRequest(
            dice: faces, count: 1, modifier: 0,
            label: "Bardic Inspiration (\(die)) — \(creature.name ?? "character") consumes it. Rolled \(roll).",
        ))
        Task { await persist(["inspiration_die": ""]) }
    }

    // ── Death Saves ───────────────────────────────────────────────────
    @ViewBuilder
    private var deathSavesSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                DeathSaveRow(
                    label: "Successes",
                    color: .green,
                    count: creature?.death_save_successes ?? 0,
                    onChange: { setDeathSaves(successes: $0) }
                )
                DeathSaveRow(
                    label: "Failures",
                    color: .red,
                    count: creature?.death_save_failures ?? 0,
                    onChange: { setDeathSaves(failures: $0) }
                )
            }
        } header: {
            Text("Death Saves")
        } footer: {
            Text("Roll a d20 — 10+ is a success, below 10 a failure. 3 of either ends it. A natural 20 jumps you back to 1 HP; a natural 1 counts as two failures.")
                .font(.caption)
        }
    }

    private func setDeathSaves(successes: Int? = nil, failures: Int? = nil) {
        guard var creature else { return }
        var patch: [String: Any] = [:]
        if let s = successes {
            creature.death_save_successes = s
            patch["death_save_successes"] = s
        }
        if let f = failures {
            creature.death_save_failures = f
            patch["death_save_failures"] = f
        }
        socket.creature = creature
        Task { await persist(patch) }
    }

    // ── Combat row ────────────────────────────────────────────────────
    // Top: 2×2 grid of the four at-a-glance combat numbers (AC,
    // Initiative, Passive Perception, Proficiency Bonus). Each cell is
    // a small card so the values pop off the page rather than getting
    // lost in a vertical list. Speeds + concentration line up below.
    @ViewBuilder
    private var combatSection: some View {
        if let c = creature {
            Section("Combat") {
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 10),
                              GridItem(.flexible(), spacing: 10)],
                    spacing: 10
                ) {
                    CombatCell(
                        label: "Armor Class",
                        value: c.armor_class.map { "\($0)" } ?? "—",
                        icon: "shield.lefthalf.filled"
                    )
                    CombatCell(
                        label: "Initiative",
                        value: signedString(c.initiative_bonus),
                        icon: "bolt.fill"
                    )
                    CombatCell(
                        label: "Passive Perception",
                        value: c.passive_perception.map { "\($0)" } ?? "—",
                        icon: "eye.fill"
                    )
                    CombatCell(
                        label: "Proficiency Bonus",
                        value: profBonusString(for: c),
                        icon: "checkmark.seal.fill"
                    )
                }
                .padding(.vertical, 4)

                let speeds = movementSpeeds(for: c)
                if !speeds.isEmpty {
                    ForEach(speeds, id: \.0) { (kind, value) in
                        StatRow(label: kind, value: "\(value) ft")
                    }
                }
                if let conc = c.concentrating_on, !conc.isEmpty {
                    HStack {
                        Image(systemName: "circle.hexagongrid").foregroundStyle(.purple)
                        Text("Concentrating on")
                        Spacer()
                        Text(conc).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func signedString(_ value: Int?) -> String {
        guard let v = value else { return "—" }
        return v >= 0 ? "+\(v)" : "\(v)"
    }
    private func profBonusString(for c: Creature) -> String {
        if let pb = c.proficiency_bonus { return "+\(pb)" }
        if let lvl = c.char_level, lvl > 0 { return "+\((lvl - 1) / 4 + 2)" }
        return "—"
    }

    private func movementSpeeds(for c: Creature) -> [(String, Int)] {
        var rows: [(String, Int)] = []
        let walk = c.speed_walk ?? 0
        if walk > 0 { rows.append(("Walk", walk)) }
        if let fly    = c.speed_fly,    fly > 0    { rows.append(("Fly",    fly)) }
        if let swim   = c.speed_swim,   swim > 0   { rows.append(("Swim",   swim)) }
        if let burrow = c.speed_burrow, burrow > 0 { rows.append(("Burrow", burrow)) }
        if let climb  = c.speed_climb,  climb > 0  { rows.append(("Climb",  climb)) }
        if rows.isEmpty, let s = c.speed, s > 0 { rows.append(("Speed", s)) }
        return rows
    }

    // ── Equipped weapons ──────────────────────────────────────────────
    @ViewBuilder
    private var equippedWeaponsSection: some View {
        let weapons = (creature?.inventory ?? []).filter {
            $0.item_type == "weapon" && ($0.equipped ?? false)
        }
        if !weapons.isEmpty {
            Section("Equipped Weapons") {
                ForEach(weapons) { weapon in
                    EquippedWeaponRow(
                        weapon: weapon,
                        attackBonus: attackBonus(for: weapon)
                    )
                }
            }
        }
    }

    // Computes total attack bonus = ability mod (from attack_stat) +
    // proficiency bonus (assumed proficient with equipped weapons) +
    // any miscellaneous bonus on the item.
    private func attackBonus(for weapon: InventoryItem) -> Int {
        guard let c = creature else { return 0 }
        let stat = (weapon.attack_stat ?? "STR").uppercased()
        let raw: Int = {
            switch stat {
            case "STR": return c.strength ?? 10
            case "DEX": return c.dexterity ?? 10
            case "CON": return c.constitution ?? 10
            case "INT": return c.intelligence ?? 10
            case "WIS": return c.wisdom ?? 10
            case "CHA": return c.charisma ?? 10
            default:    return c.strength ?? 10
            }
        }()
        let mod = (raw - 10) / 2
        let pb = c.proficiency_bonus ?? ((c.char_level ?? 1) - 1) / 4 + 2
        return mod + pb + (weapon.attack_bonus_misc ?? 0)
    }

    // ── Class Details ───────────────────────────────────────────────
    // Read-only SRD reference for the player's classes. Collapsed
    // by default — the at-the-table info (HP, profs, weapons) is
    // already on this screen, so this is a "just in case" lookup
    // rather than a primary data row. Multiclass characters get one
    // collapsed group per class so the header row stays the same
    // height regardless of how many classes the character has.
    // Resolved list lives outside the ViewBuilder — Swift's result
    // builder doesn't accept var/for in the body block. We compute
    // the (className, build) pairs here so the view layer is just
    // declarative ForEach + DisclosureGroup.
    private var classDetailRows: [(label: String, build: ClassBuild)] {
        guard let c = creature else { return [] }
        var names: [String] = []
        if let p = c.char_class, !p.isEmpty { names.append(p) }
        for mc in (c.multiclasses ?? []) {
            if let cls = mc.charClass, !cls.isEmpty { names.append(cls) }
        }
        return names.compactMap { name in
            guard let b = classBuild(for: name) else { return nil }
            return (name, b)
        }
    }

    @ViewBuilder
    private var classDetailsSection: some View {
        let rows = classDetailRows
        if !rows.isEmpty {
            Section("Class Details") {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, pair in
                    DisclosureGroup(pair.label) {
                        VStack(alignment: .leading, spacing: 4) {
                            ClassDetailRow(label: "Primary",  value: pair.build.primary)
                            ClassDetailRow(label: "Hit Die",  value: pair.build.hitDie)
                            ClassDetailRow(label: "Saves",    value: pair.build.saves.joined(separator: ", "))
                            ClassDetailRow(label: "Armor",    value: pair.build.armor.isEmpty ? "—" : pair.build.armor.joined(separator: ", "))
                            ClassDetailRow(label: "Weapons",  value: pair.build.weapons.joined(separator: ", "))
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // ── Stat-block sections ──────────────────────────────────────────
    @ViewBuilder
    private var statBlockSections: some View {
        let groups: [(title: String, entries: [StatAction]?)] = [
            ("Class Features",   creature?.class_features),
            ("Feats",            creature?.feats),
            ("Special Abilities",creature?.special_abilities),
            ("Actions",          creature?.actions),
            ("Bonus Actions",    creature?.bonus_actions),
            ("Reactions",        creature?.reactions),
            ("Movement",         creature?.movement_actions),
            ("Legendary Actions",creature?.legendary_actions),
        ]
        ForEach(groups, id: \.title) { group in
            if let entries = group.entries, !entries.isEmpty {
                CollapsibleStatBlockSection(title: group.title, entries: entries)
            }
        }
    }

    // ── Conditions / Whispers ─────────────────────────────────────────
    @ViewBuilder
    private var conditionsSection: some View {
        if let conditions = playerToken?.conditions, !conditions.isEmpty {
            Section("Conditions") {
                FlowLayout(spacing: 6) {
                    ForEach(conditions, id: \.self) { cond in
                        Text(cond.capitalized)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(.red.opacity(0.15), in: Capsule())
                            .foregroundStyle(.red)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var whispersSection: some View {
        let activeWhispers = socket.whispers.filter { !clearedWhisperIds.contains($0.id) }
        if !activeWhispers.isEmpty {
            Section {
                ForEach(activeWhispers.suffix(10)) { w in
                    HStack(alignment: .top) {
                        Image(systemName: "envelope.fill")
                            .foregroundStyle(.purple).padding(.top, 2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(w.message).font(.callout)
                            Text(w.ts, style: .time).font(.caption2).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button { clearedWhisperIds.insert(w.id) } label: {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                }
            } header: {
                HStack {
                    Text("GM whispers")
                    Spacer()
                    Button("Clear all") {
                        clearedWhisperIds.formUnion(socket.whispers.map(\.id))
                    }
                    .font(.caption).textCase(nil)
                }
            }
        }
    }

    // ── HP / temp HP bindings ─────────────────────────────────────────
    private func hpBinding(token: Token) -> Binding<Int> {
        Binding(
            get: { token.current_hp ?? 0 },
            set: { newValue in socket.emitHpChange(tokenId: token.id, currentHp: newValue) }
        )
    }
    private func tempHpBinding(token: Token) -> Binding<Int> {
        Binding(
            get: { token.temp_hp ?? 0 },
            set: { newValue in socket.emitTempHp(tokenId: token.id, tempHp: newValue) }
        )
    }

    // ── REST helpers ──────────────────────────────────────────────────
    private func persist(_ updates: [String: Any]) async {
        guard
            let cid = creature?.id,
            let base = store.baseURL
        else { return }
        do {
            _ = try await APIClient(baseURL: base).patchCreature(id: cid, updates: updates)
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func reloadCreature() async {
        guard
            let cid = creature?.id ?? playerToken?.creature_id ?? store.lastCreatureId,
            let base = store.baseURL
        else { return }
        do {
            socket.creature = try await APIClient(baseURL: base).fetchCreature(id: cid)
        } catch {
            saveError = error.localizedDescription
        }
    }
}

// HP bar — segmented green / yellow / red based on remaining ratio,
// plus a blue overlay for temp HP. Both fills share the same
// denominator (maxHp + temp) so the bar never extends past its track:
// when temp HP is added, the HP fill compresses slightly to make
// room within the same width instead of overflowing the screen edge
// (the previous version used different denominators and could draw
// out to ~120% of the bar's width on a full-HP + temp character).
struct HpBar: View {
    let current: Int
    let maxHp: Int
    let temp: Int

    init(current: Int, max: Int, temp: Int) {
        self.current = current
        self.maxHp = max
        self.temp = temp
    }

    // Shared denominator — bar represents the full pool the character
    // currently has access to (max + temp). Always >= 1 to keep the
    // math safe even on a 0/0 token.
    private var denom: Double   { Double(Swift.max(maxHp + temp, 1)) }
    private var hpRatio: Double { Double(current) / denom }
    private var tempRatio: Double { Double(temp)  / denom }

    // Colour stays driven by current/max — adding temp HP to a healthy
    // character shouldn't recolour the bar to yellow just because the
    // visible green segment got slightly compressed.
    private var healthRatio: Double { Double(current) / Double(Swift.max(maxHp, 1)) }
    private var color: Color {
        switch healthRatio {
        case 0.5...:  return .green
        case 0.25...: return .yellow
        default:      return .red
        }
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(.gray.opacity(0.3))
                Capsule()
                    .fill(color)
                    .frame(width: Swift.max(geo.size.width * hpRatio, 0))
                if temp > 0 {
                    Capsule()
                        .fill(.blue.opacity(0.55))
                        .frame(width: Swift.max(geo.size.width * tempRatio, 0))
                        .offset(x: Swift.max(geo.size.width * hpRatio, 0))
                }
            }
        }
        .frame(height: 10)
    }
}

// CombatCell — one cell in the AC/Init/Perception/PB 2×2 grid. Big
// monospaced value below a small label, with a coloured SF icon for
// quick visual recognition (shield / bolt / eye / seal).
private struct CombatCell: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                    .foregroundStyle(.tint)
                Text(label)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            Text(value)
                .font(.system(.title2, design: .rounded).weight(.bold))
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
    }
}

private struct StatRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
                .font(.system(.body, design: .monospaced))
        }
    }
}

// Death-save pip row — three filled circles per state, tap a circle
// to set the count to that index (so going from 2 to 0 is one tap).
private struct DeathSaveRow: View {
    let label: String
    let color: Color
    let count: Int
    let onChange: (Int) -> Void

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            HStack(spacing: 6) {
                ForEach(1...3, id: \.self) { idx in
                    Button {
                        onChange(idx <= count ? idx - 1 : idx)
                    } label: {
                        Image(systemName: idx <= count ? "circle.fill" : "circle")
                            .foregroundStyle(idx <= count ? color : .gray.opacity(0.5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(label) \(idx)")
                    .accessibilityValue(idx <= count ? "marked" : "empty")
                    .accessibilityHint("Double-tap to toggle this \(label.lowercased()) pip.")
                }
            }
        }
        .accessibilityElement(children: .contain)
    }
}

// Collapsible stat-block section (Class Features / Actions / etc).
// One label/value row inside the Class Details disclosure. Kept
// compact — value monospace so saves like "STR, CON" line up nicely
// across multiple classes when a multiclassed character has the
// section expanded.
private struct ClassDetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label).foregroundStyle(.tertiary).frame(width: 70, alignment: .leading)
            Text(value).foregroundStyle(.secondary)
        }
    }
}

// Closed by default so the page isn't a wall of text on first load.
private struct CollapsibleStatBlockSection: View {
    let title: String
    let entries: [StatAction]
    @State private var open: Bool = false

    var body: some View {
        Section {
            DisclosureGroup(isExpanded: $open) {
                ForEach(entries) { entry in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.name ?? "").font(.callout.weight(.semibold))
                        if let desc = entry.desc, !desc.isEmpty {
                            Text(desc).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            } label: {
                HStack {
                    Text(title).font(.headline)
                    Spacer()
                    Text("\(entries.count)")
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

private struct EquippedWeaponRow: View {
    let weapon: InventoryItem
    let attackBonus: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(weapon.name ?? "(unnamed weapon)").font(.body.weight(.semibold))
                Spacer()
                Text(formattedBonus)
                    .font(.system(.callout, design: .monospaced).weight(.semibold))
                    .foregroundStyle(.tint)
            }
            HStack(spacing: 10) {
                if let damage = damageString {
                    Label(damage, systemImage: "burst")
                        .font(.caption.monospaced())
                        .foregroundStyle(.red)
                }
                if let range = weapon.weapon_range, !range.isEmpty {
                    Label(range, systemImage: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let stat = weapon.attack_stat, !stat.isEmpty {
                    Text(stat.uppercased())
                        .font(.caption.weight(.semibold).monospaced())
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(.tint.opacity(0.15), in: Capsule())
                }
            }
            if let props = weapon.properties, !props.isEmpty {
                Text(props).font(.caption).foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }

    private var formattedBonus: String {
        attackBonus >= 0 ? "+\(attackBonus) to hit" : "\(attackBonus) to hit"
    }
    private var damageString: String? {
        guard let entries = weapon.damage_entries, !entries.isEmpty else { return nil }
        return entries.compactMap { e in
            let d = e.damage ?? ""
            let t = e.damage_type ?? ""
            return [d, t].filter { !$0.isEmpty }.joined(separator: " ")
        }
        .joined(separator: ", ")
    }
}

// FlowLayout — minimal flowing horizontal layout for the conditions chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        guard !subviews.isEmpty else { return .zero }
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for sub in subviews {
            let s = sub.sizeThatFits(.unspecified)
            if x + s.width > maxWidth { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += s.width + spacing
            rowHeight = max(rowHeight, s.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for sub in subviews {
            let s = sub.sizeThatFits(.unspecified)
            if x + s.width > bounds.maxX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            rowHeight = max(rowHeight, s.height)
        }
    }
}

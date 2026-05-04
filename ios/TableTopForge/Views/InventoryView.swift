import SwiftUI

// InventoryView — three sections:
//   1. Currency controls — GP / SP / CP steppers, persisted via REST.
//   2. Light source picker — same available-preset logic as the
//      Dice & Light tab. Lifted up here too so the player can swap
//      what they're holding without leaving the inventory page.
//   3. Items list grouped by item_type (Weapons / Armor / Gear).
//      Each row taps open like a spell row to show full stats —
//      damage / range / properties / sheds-light data / freeform desc.
//      Equip / unequip toggle on every row; PATCH /api/creatures/:id
//      persists.
struct InventoryView: View {
    let store: SessionStore
    let socket: SocketClient

    @State private var saveError: String? = nil
    @State private var saving = false

    private var creature: Creature? { socket.creature }
    private var items: [InventoryItem] { creature?.inventory ?? [] }
    private var playerToken: Token? {
        socket.tokens.first(where: { $0.id == socket.playerTokenId })
    }

    var body: some View {
        NavigationStack {
            Group {
                if creature == nil {
                    ContentUnavailableView(
                        "Loading character",
                        systemImage: "bag",
                        description: Text("Open the Stats tab once to populate your inventory, then come back.")
                    )
                } else {
                    List {
                        currencySection
                        lightSourceSection
                        itemsByType
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await reloadCreature() }
                }
            }
            .navigationTitle("Inventory")
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

    // ── Currency ──────────────────────────────────────────────────────
    @ViewBuilder
    private var currencySection: some View {
        Section("Currency") {
            CurrencyRow(
                label: "Gold (GP)",
                tint: .yellow,
                value: Binding(
                    get: { creature?.currency_gp ?? 0 },
                    set: { setCurrency(gp: $0) }
                )
            )
            CurrencyRow(
                label: "Silver (SP)",
                tint: .gray,
                value: Binding(
                    get: { creature?.currency_sp ?? 0 },
                    set: { setCurrency(sp: $0) }
                )
            )
            CurrencyRow(
                label: "Copper (CP)",
                tint: .brown,
                value: Binding(
                    get: { creature?.currency_cp ?? 0 },
                    set: { setCurrency(cp: $0) }
                )
            )
        }
    }

    private func setCurrency(gp: Int? = nil, sp: Int? = nil, cp: Int? = nil) {
        guard var creature else { return }
        var patch: [String: Any] = [:]
        if let v = gp { creature.currency_gp = v; patch["currency_gp"] = v }
        if let v = sp { creature.currency_sp = v; patch["currency_sp"] = v }
        if let v = cp { creature.currency_cp = v; patch["currency_cp"] = v }
        socket.creature = creature
        Task { await persist(patch) }
    }

    // ── Light source ──────────────────────────────────────────────────
    @ViewBuilder
    private var lightSourceSection: some View {
        if let token = playerToken {
            Section("Light Source") {
                if availablePresets.count == 1 {
                    Text("Add a torch, lantern, or candle to your inventory to enable a light source.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                ForEach(availablePresets) { entry in
                    Button {
                        applyLight(entry: entry, tokenId: token.id)
                    } label: {
                        HStack {
                            Image(systemName: entry.iconName)
                                .foregroundStyle(entry.brightFt == 0 && entry.dimFt == 0
                                                 ? Color.secondary : Color.orange)
                            Text(entry.label)
                            Spacer()
                            if entry.brightFt > 0 || entry.dimFt > 0 {
                                Text(entry.formattedRange)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                            if currentLightId == entry.identifier {
                                Image(systemName: "checkmark").foregroundStyle(.tint)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // Same filter logic as DiceLightView — only show presets the
    // player actually has. Kept inline (not a shared helper) so each
    // tab stays self-contained.
    private var availablePresets: [LightOption] {
        var out: [LightOption] = [.base(LightPreset.all[0])]
        let inv = items
        let baseKeywords: [(LightPreset, String)] = [
            (LightPreset.all[1], "candle"),
            (LightPreset.all[2], "torch"),
            (LightPreset.all[3], "lantern"),
        ]
        for (preset, keyword) in baseKeywords {
            if inv.contains(where: { ($0.name ?? "").lowercased().contains(keyword) }) {
                out.append(.base(preset))
            }
        }
        let baseSet = Set(baseKeywords.map { $0.1 })
        for item in inv {
            guard item.sheds_light == true,
                  let name = item.name, !name.isEmpty else { continue }
            let lower = name.lowercased()
            if baseSet.contains(where: { lower.contains($0) }) { continue }
            out.append(.custom(item))
        }
        return out
    }

    private var currentLightId: String? {
        guard let t = playerToken else { return nil }
        let bright = t.token_light_bright ?? 0
        let dim    = t.token_light_dim    ?? 0
        if bright == 0 && dim == 0 { return availablePresets.first?.identifier }
        return availablePresets.first(where: {
            abs($0.brightFt - bright) < 0.5 && abs($0.dimFt - dim) < 0.5
        })?.identifier
    }

    private func applyLight(entry: LightOption, tokenId: Int) {
        switch entry {
        case .base(let preset):
            socket.emitLight(tokenId: tokenId, preset: preset)
        case .custom(let item):
            socket.emitRawSetTokenLight([
                "tokenId": tokenId,
                "brightFt": item.bright_ft ?? 0,
                "dimFt":    item.dim_ft ?? 0,
                "color":    item.light_color ?? "#fbbf24",
                "flicker":  item.flicker ?? true,
            ])
        }
    }

    // ── Items, grouped by type ────────────────────────────────────────
    @ViewBuilder
    private var itemsByType: some View {
        let groups: [(label: String, type: String?)] = [
            ("Weapons", "weapon"),
            ("Armor",   "armor"),
            ("Gear",    "item"),
        ]
        // Pre-bucket items so the loop stays simple. "Other" catches
        // anything with an unrecognised item_type so nothing is hidden.
        let known = Set(groups.compactMap(\.type))
        let others = items.filter { item in
            let t = item.item_type ?? "item"
            return !known.contains(t)
        }
        ForEach(groups, id: \.label) { group in
            let bucket = items.enumerated()
                .filter { (_, item) in (item.item_type ?? "item") == group.type }
            if !bucket.isEmpty {
                Section(group.label) {
                    ForEach(bucket, id: \.offset) { idx, item in
                        ItemRow(
                            item: item,
                            isEquippedLight: isCurrentLight(item),
                            onToggleEquipped: { toggleEquipped(at: idx) }
                        )
                    }
                }
            }
        }
        if !others.isEmpty {
            Section("Other") {
                ForEach(Array(others.enumerated()), id: \.offset) { _, item in
                    if let realIdx = items.firstIndex(where: { $0.id == item.id }) {
                        ItemRow(
                            item: item,
                            isEquippedLight: isCurrentLight(item),
                            onToggleEquipped: { toggleEquipped(at: realIdx) }
                        )
                    }
                }
            }
        }
    }

    private func isCurrentLight(_ item: InventoryItem) -> Bool {
        guard let token = playerToken, item.sheds_light == true else { return false }
        let bright = item.bright_ft ?? 0
        let dim    = item.dim_ft ?? 0
        return abs((token.token_light_bright ?? 0) - bright) < 0.5
            && abs((token.token_light_dim    ?? 0) - dim)    < 0.5
    }

    private func toggleEquipped(at index: Int) {
        guard
            var creature,
            var inv = creature.inventory,
            inv.indices.contains(index)
        else { return }
        let next = !(inv[index].equipped ?? false)
        inv[index].equipped = next
        creature.inventory = inv
        socket.creature = creature
        Task { await persistInventory(inv) }
    }

    private func persistInventory(_ inv: [InventoryItem]) async {
        guard
            let cid = socket.creature?.id,
            let base = store.baseURL
        else { return }
        saving = true
        defer { saving = false }
        do {
            let data = try JSONEncoder().encode(inv)
            let json = try JSONSerialization.jsonObject(with: data)
            _ = try await APIClient(baseURL: base).patchCreature(id: cid, updates: ["inventory": json])
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func persist(_ updates: [String: Any]) async {
        guard
            let cid = socket.creature?.id,
            let base = store.baseURL
        else { return }
        saving = true
        defer { saving = false }
        do {
            _ = try await APIClient(baseURL: base).patchCreature(id: cid, updates: updates)
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

// ── Light option (shared shape with DiceLightView) ──────────────────
private enum LightOption: Identifiable {
    case base(LightPreset)
    case custom(InventoryItem)

    var identifier: String {
        switch self {
        case .base(let p):   return "base-\(p.id)"
        case .custom(let i): return "custom-\(i.name ?? UUID().uuidString)"
        }
    }
    var id: String { identifier }
    var label: String {
        switch self {
        case .base(let p):   return p.label
        case .custom(let i): return i.name ?? "(unnamed)"
        }
    }
    var brightFt: Double {
        switch self {
        case .base(let p):   return p.brightFt
        case .custom(let i): return i.bright_ft ?? 0
        }
    }
    var dimFt: Double {
        switch self {
        case .base(let p):   return p.dimFt
        case .custom(let i): return i.dim_ft ?? 0
        }
    }
    var iconName: String {
        switch self {
        case .base(let p):
            switch p.id {
            case 0: return "circle.slash"
            case 1: return "flame"
            case 2: return "flame.fill"
            case 3: return "lightbulb.fill"
            default: return "lightbulb"
            }
        case .custom: return "lightbulb.max.fill"
        }
    }
    var formattedRange: String {
        if brightFt > 0 { return "\(Int(brightFt)) / \(Int(dimFt)) ft" }
        return "\(Int(dimFt)) ft dim"
    }
}

private struct CurrencyRow: View {
    let label: String
    let tint: Color
    @Binding var value: Int

    var body: some View {
        Stepper(value: $value, in: 0...99999) {
            HStack {
                Image(systemName: "circle.fill").font(.caption2).foregroundStyle(tint)
                Text(label)
                Spacer()
                Text("\(value)")
                    .font(.system(.body, design: .monospaced).weight(.semibold))
            }
        }
    }
}

// One row per inventory item. Same expand-on-tap pattern as the spells
// tab — closed shows name + qty/weight + flags, open reveals full
// stats (damage / range / properties / sheds-light data / desc).
private struct ItemRow: View {
    let item: InventoryItem
    let isEquippedLight: Bool
    let onToggleEquipped: () -> Void

    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                // No withAnimation — animating the toggle made the
                // List animate the cell's frame, which shifted the
                // title text up/down during the transition. Instant
                // expand keeps the title locked in place.
                expanded.toggle()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: typeIcon)
                        .frame(width: 22)
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(item.name ?? "(unnamed)")
                                .font(.body.weight(.semibold))
                                .foregroundStyle(.primary)
                            if item.equipped == true {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green).font(.caption)
                            }
                            if isEquippedLight {
                                Image(systemName: "flame.fill")
                                    .foregroundStyle(.orange).font(.caption)
                            }
                        }
                        HStack(spacing: 8) {
                            if let q = item.qty, q > 1 {
                                Text("×\(q)").font(.caption).foregroundStyle(.secondary)
                            }
                            if let w = item.weight, w > 0 {
                                Text("\(format(w)) lb").font(.caption).foregroundStyle(.secondary)
                            }
                            if item.sheds_light == true,
                               let dim = item.dim_ft, dim > 0 {
                                Text("\(Int(item.bright_ft ?? 0))/\(Int(dim)) ft")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.orange)
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
                expandedDetails
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var expandedDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Weapon stats — only meaningful when item_type == weapon
            if item.item_type == "weapon" {
                if let damage = damageString {
                    DetailLine(label: "Damage", value: damage)
                }
                if let range = item.weapon_range, !range.isEmpty {
                    DetailLine(label: "Range", value: range)
                }
                if let stat = item.attack_stat, !stat.isEmpty {
                    DetailLine(label: "Stat", value: stat.uppercased())
                }
                if let bonus = item.attack_bonus_misc, bonus != 0 {
                    DetailLine(label: "Atk Bonus",
                               value: bonus >= 0 ? "+\(bonus)" : "\(bonus)")
                }
            }
            if let props = item.properties, !props.isEmpty {
                DetailLine(label: "Properties", value: props)
            }
            // Light info — only if sheds_light
            if item.sheds_light == true {
                let bright = Int(item.bright_ft ?? 0)
                let dim    = Int(item.dim_ft ?? 0)
                DetailLine(label: "Light", value: "\(bright) ft bright / \(dim) ft dim")
            }
            // Freeform description always last so the player has the
            // full GM-written paragraph in context with the stats.
            if let desc = item.desc, !desc.isEmpty {
                Text(desc).font(.footnote).foregroundStyle(.secondary).padding(.top, 2)
            }
            Button {
                onToggleEquipped()
            } label: {
                Label(item.equipped == true ? "Unequip" : "Equip",
                      systemImage: item.equipped == true ? "checkmark.circle.fill" : "circle")
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .padding(.top, 4)
        }
        .padding(.leading, 32)
    }

    private var typeIcon: String {
        switch item.item_type {
        case "weapon": return "sword.line.dashed"
        case "armor":  return "shield"
        default:       return "shippingbox"
        }
    }

    private var damageString: String? {
        guard let entries = item.damage_entries, !entries.isEmpty else { return nil }
        let parts = entries.compactMap { e -> String? in
            let d = e.damage ?? ""
            let t = e.damage_type ?? ""
            let combined = [d, t].filter { !$0.isEmpty }.joined(separator: " ")
            return combined.isEmpty ? nil : combined
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private func format(_ d: Double) -> String {
        d.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(d))" : String(format: "%.1f", d)
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
                .frame(width: 80, alignment: .leading)
            Text(value).font(.caption)
        }
    }
}

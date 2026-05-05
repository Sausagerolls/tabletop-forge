// MinigameView — SpriteKit-backed Brotato-style reverse bullet hell
// minigame. Triggered from the Dice & Settings tab by tapping the
// server version row three times.
//
// Architecture
// ────────────
// * MinigameView (SwiftUI)   — host. Pre-game shows an avatar
//   picker; once the player picks a character token, swaps in
//   GameSceneView for the live arena.
// * GameSceneView            — UIViewRepresentable wrapping SKView.
// * GameScene (SpriteKit)    — the actual game. Auto-shoots toward
//   the nearest enemy at a fixed cadence; movement is a virtual
//   joystick (drag anywhere on screen). Enemies spawn from the
//   edges in 30-second waves with escalating count + speed.
// * SpritePool               — node recycler so we never alloc a
//   bullet or enemy per shot. Critical at 60 FPS with hundreds of
//   active sprites.
//
// Performance notes
// ─────────────────
// * SpriteKit batches draws by texture, so we keep textures shared
//   (player tokens are a stable set; monster tokens are sampled
//   round-robin from the cached pool). Enemies share one texture
//   across each kind so the renderer can batch.
// * Physics is built-in — bullet vs enemy collisions go through
//   SKPhysicsContactDelegate. Categories are bitmasks: player(1),
//   enemy(2), bullet(4). Player collides with enemy directly to
//   take damage; bullet with enemy to score. Nothing else collides.
// * Bullets recycle via SpritePool when off-screen or on hit; same
//   for enemies on death. preferredFramesPerSecond = 60 since the
//   ProMotion 120Hz opt-in already happened in Info.plist.

import SwiftUI
import SpriteKit

struct MinigameView: View {
    let socket: SocketClient
    let store: SessionStore
    let onClose: () -> Void

    @State private var avatarTexture: SKTexture? = nil
    @State private var enemyKinds: [EnemyKind] = []
    @State private var loadingError: String? = nil
    @State private var didLoadCreatures: Bool = false

    // Player + monster creatures on the live server. Players become
    // avatar choices; monsters become the enemy roster.
    @State private var playerCreatures: [Creature] = []
    @State private var monsterCreatures: [Creature] = []

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Once an avatar is picked, hand off to the game scene.
            if let avatar = avatarTexture, !enemyKinds.isEmpty {
                GameSceneView(playerTexture: avatar, enemyKinds: enemyKinds)
                    .ignoresSafeArea()
            } else {
                avatarPicker
            }
            // Persistent close button. Fixed corner so it survives
            // the picker/game swap without rebuilding the SKView.
            Button {
                onClose()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 30))
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(.white, .black.opacity(0.6))
                    .padding(12)
            }
            .accessibilityLabel("Close minigame")
        }
        .background(Color.black)
        .preferredColorScheme(.dark)
        .task { if !didLoadCreatures { await loadCreatures() } }
    }

    // ── Pre-game avatar picker ────────────────────────────────────
    @ViewBuilder
    private var avatarPicker: some View {
        VStack(spacing: 12) {
            Text("CHOOSE YOUR HERO")
                .font(.system(.title3, design: .rounded).weight(.bold))
                .foregroundStyle(.white)
                .tracking(2)
                .padding(.top, 36)
            if let err = loadingError {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding()
            }
            if !didLoadCreatures && loadingError == nil {
                ProgressView()
                    .padding(.top, 12)
            }
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3),
                          spacing: 12) {
                    ForEach(playerCreatures) { creature in
                        avatarCell(creature: creature)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
            }
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private func avatarCell(creature: Creature) -> some View {
        Button {
            Task { await pick(avatar: creature) }
        } label: {
            VStack(spacing: 6) {
                imageOrPlaceholder(path: creature.image_path)
                    .frame(width: 90, height: 90)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.yellow.opacity(0.5), lineWidth: 1)
                    )
                Text(creature.name ?? "—")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func imageOrPlaceholder(path: String?) -> some View {
        if let path, let base = store.baseURL,
           let url = URL(string: "\(base.absoluteString)/uploads/\(path)") {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                default: placeholder
                }
            }
        } else {
            placeholder
        }
    }
    private var placeholder: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable().scaledToFit()
            .foregroundStyle(.tint.opacity(0.6))
            .background(Color.black)
    }

    // ── Loading ──────────────────────────────────────────────────
    private func loadCreatures() async {
        guard let base = store.baseURL else {
            loadingError = "No server URL configured"
            didLoadCreatures = true
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(
                from: base.appendingPathComponent("api/creatures"))
            let decoder = JSONDecoder()
            let all = try decoder.decode([Creature].self, from: data)
            playerCreatures = all.filter { c in
                // PCs first; the API returns is_player_character but
                // our Creature model doesn't decode it, so we sniff
                // via creature_type instead and fall back to
                // "anything with a name and an image".
                (c.creature_type ?? "").lowercased() == "humanoid"
                && (c.image_path != nil)
            }
            // Monsters = anything that's not a humanoid player. We
            // pick a small rotating roster (up to 8 textures) so the
            // texture cache stays warm and SpriteKit can batch.
            monsterCreatures = Array(
                all.filter { c in
                    (c.creature_type ?? "").lowercased() != "humanoid"
                    && (c.image_path != nil)
                }
                .prefix(8)
            )
            // Pre-load enemy textures up front + tag each one with
            // the creature's size class so spawns can pick a random
            // KIND (not just a random texture) and inherit the right
            // diameter / hp / speed.
            enemyKinds = await loadEnemyKinds(creatures: monsterCreatures, base: base)
            if monsterCreatures.isEmpty {
                loadingError = "No monsters in the server library."
            }
        } catch {
            loadingError = error.localizedDescription
        }
        didLoadCreatures = true
    }

    private func pick(avatar creature: Creature) async {
        guard let base = store.baseURL,
              let path = creature.image_path,
              let url  = URL(string: "\(base.absoluteString)/uploads/\(path)") else { return }
        if let tex = await loadTexture(url: url) {
            avatarTexture = tex
        }
    }

    private func loadEnemyKinds(creatures: [Creature], base: URL) async -> [EnemyKind] {
        var out: [EnemyKind] = []
        for c in creatures {
            guard let path = c.image_path,
                  let url = URL(string: "\(base.absoluteString)/uploads/\(path)") else { continue }
            guard let tex = await loadTexture(url: url) else { continue }
            out.append(EnemyKind(
                texture: tex,
                size: EnemySize(c.size),
                displayName: c.name ?? "—",
            ))
        }
        return out
    }

    private func loadTexture(url: URL) async -> SKTexture? {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let img = UIImage(data: data) else { return nil }
            let circular = roundedSquare(image: img, side: 256)
            let tex = SKTexture(image: circular)
            tex.filteringMode = .linear
            return tex
        } catch { return nil }
    }

    /// Crop + circular-mask the source image so SpriteKit doesn't
    /// render a square box around every token. Cheaper than wrapping
    /// each sprite in an SKCropNode at runtime — one-time CG pass on
    /// load, then the texture is GPU-resident.
    private func roundedSquare(image: UIImage, side: CGFloat) -> UIImage {
        let size = CGSize(width: side, height: side)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            let rect = CGRect(origin: .zero, size: size)
            UIBezierPath(ovalIn: rect).addClip()
            // Cover-fit — square crop that fills the circle.
            let src = image.size
            let scale = max(side / src.width, side / src.height)
            let drawSize = CGSize(width: src.width * scale, height: src.height * scale)
            let drawRect = CGRect(
                x: (side - drawSize.width) / 2,
                y: (side - drawSize.height) / 2,
                width: drawSize.width, height: drawSize.height,
            )
            image.draw(in: drawRect)
        }
    }
}

// ── SpriteKit host ──────────────────────────────────────────────
// Each enemy in the game has a texture + a size class lifted from
// the creature's stat block. The scene draws on this list so spawns
// inherit the right stats, and so a single texture can map to a
// specific size band rather than averaging them all.
struct EnemyKind {
    let texture: SKTexture
    let size: EnemySize
    let displayName: String
}

enum EnemySize: String {
    case tiny, small, medium, large, huge, gargantuan
    init(_ raw: String?) {
        switch (raw ?? "").lowercased() {
        case "tiny": self = .tiny
        case "small": self = .small
        case "large": self = .large
        case "huge": self = .huge
        case "gargantuan": self = .gargantuan
        default: self = .medium
        }
    }
    /// Pixel diameter of the sprite + circular hit-box.
    var diameter: CGFloat {
        switch self {
        case .tiny: return 26
        case .small: return 36
        case .medium: return 48
        case .large: return 64
        case .huge: return 84
        case .gargantuan: return 110
        }
    }
    /// Speed multiplier — smaller = faster, bigger = slower.
    var speedMultiplier: CGFloat {
        switch self {
        case .tiny: return 1.7
        case .small: return 1.35
        case .medium: return 1.0
        case .large: return 0.78
        case .huge: return 0.6
        case .gargantuan: return 0.45
        }
    }
    /// Hit points — bigger = tougher.
    var hp: Int {
        switch self {
        case .tiny: return 1
        case .small: return 1
        case .medium: return 2
        case .large: return 4
        case .huge: return 7
        case .gargantuan: return 12
        }
    }
    /// Damage dealt to the player on contact.
    var contactDamage: Int {
        switch self {
        case .tiny: return 6
        case .small: return 9
        case .medium: return 12
        case .large: return 18
        case .huge: return 26
        case .gargantuan: return 36
        }
    }
    /// Score awarded on kill — scales with toughness.
    var scoreReward: Int {
        switch self {
        case .tiny: return 5
        case .small: return 8
        case .medium: return 12
        case .large: return 22
        case .huge: return 38
        case .gargantuan: return 60
        }
    }
}

private struct GameSceneView: UIViewRepresentable {
    let playerTexture: SKTexture
    let enemyKinds: [EnemyKind]

    func makeUIView(context: Context) -> SKView {
        let view = SKView(frame: .zero)
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        view.showsFPS = false
        view.showsNodeCount = false
        let scene = GameScene(playerTexture: playerTexture,
                              enemyKinds: enemyKinds,
                              size: UIScreen.main.bounds.size)
        scene.scaleMode = .resizeFill
        view.presentScene(scene)
        return view
    }
    func updateUIView(_ uiView: SKView, context: Context) {
        // Scene lifetime owns its own state; nothing to push down.
    }
}

// ── The game ────────────────────────────────────────────────────
private final class GameScene: SKScene, SKPhysicsContactDelegate {
    // Physics categories (bitmask).
    private static let catPlayer: UInt32 = 1
    private static let catEnemy:  UInt32 = 2
    private static let catBullet: UInt32 = 4

    private let playerTexture: SKTexture
    private let enemyKinds: [EnemyKind]

    init(playerTexture: SKTexture, enemyKinds: [EnemyKind], size: CGSize) {
        self.playerTexture = playerTexture
        self.enemyKinds = enemyKinds
        super.init(size: size)
        backgroundColor = SKColor(red: 0.04, green: 0.05, blue: 0.07, alpha: 1)
    }
    required init?(coder: NSCoder) { fatalError() }

    // ── Game state ──────────────────────────────────────────────
    private var player: SKSpriteNode!
    private var maxHp: Int = 100
    private var hp: Int = 100 { didSet { updateHud() } }
    private var score: Int = 0 { didSet { updateHud() } }
    private var wave: Int = 0 { didSet { updateHud() } }
    private var elapsed: TimeInterval = 0
    private var lastUpdate: TimeInterval = 0
    private var lastShot: TimeInterval = 0
    private var lastSpawn: TimeInterval = 0
    private var waveStart: TimeInterval = 0
    private let waveDuration: TimeInterval = 20
    private var spawnInterval: TimeInterval = 1.2
    private var enemyBaseSpeed: CGFloat = 65
    private var moveTouchDown: CGPoint?
    private var moveTarget: CGVector = .zero
    private var hudLabel: SKLabelNode!
    private var hpBarFill: SKShapeNode!
    private var hpBarBack: SKShapeNode!
    private let hpBarWidth: CGFloat = 220
    private let hpBarHeight: CGFloat = 12
    private var gameOverNode: SKNode?
    private var shopNode: SKNode?
    private var paused_: Bool = false      // shop / game-over halt
    private let bulletPool = SpritePool()
    private let enemyPool  = SpritePool()

    // Player loadout — Brotato-style multi-gun. Up to MAX_GUNS
    // weapons orbit the player at evenly-spaced angles; each fires
    // independently on its own cadence. Default loadout is a
    // single Arcane Bolt; the wave-end shop adds more guns up to
    // the cap, after which buying a new weapon prompts the player
    // to replace one of the existing slots.
    private static let maxGuns: Int = 3
    private var guns: [Gun] = []
    private var gunSprites: [SKShapeNode] = []   // orbital indicators
    private var bulletDamage: Int = 1
    private var bulletSpeed: CGFloat = 460
    private var fireRateMul: CGFloat = 1.0
    private var moveSpeedMul: CGFloat = 1.0
    private var lifestealOnKill: Int = 0
    private var bonusEnemyDamageReduction: Int = 0

    override func didMove(to view: SKView) {
        physicsWorld.gravity = .zero
        physicsWorld.contactDelegate = self
        spawnPlayer()
        spawnHud()
        // Default loadout: a single Arcane Bolt orbiting the player.
        equip(weapon: .arcaneBolt, replacing: nil)
        wave = 1
    }

    private func spawnPlayer() {
        let p = SKSpriteNode(texture: playerTexture, size: CGSize(width: 56, height: 56))
        p.position = CGPoint(x: size.width / 2, y: size.height / 2)
        p.zPosition = 10
        let body = SKPhysicsBody(circleOfRadius: 22)
        body.isDynamic = true
        body.affectedByGravity = false
        body.allowsRotation = false
        body.categoryBitMask = Self.catPlayer
        body.contactTestBitMask = Self.catEnemy
        body.collisionBitMask = 0
        p.physicsBody = body
        addChild(p)
        player = p
    }

    private func spawnHud() {
        // Top-left HP bar — green fill on a dark trough, fixed
        // pixel size so it stays readable on every device. The
        // top inset clears the iPhone notch / Dynamic Island —
        // 70 px down from screen top puts the bar comfortably
        // below either on every modern device.
        let topY = size.height - 70
        let backRect = CGRect(x: 0, y: 0, width: hpBarWidth, height: hpBarHeight)
        let back = SKShapeNode(rect: backRect, cornerRadius: 3)
        back.fillColor = SKColor.black.withAlphaComponent(0.55)
        back.strokeColor = SKColor.white.withAlphaComponent(0.35)
        back.lineWidth = 1
        back.position = CGPoint(x: 16, y: topY)
        back.zPosition = 99
        addChild(back)
        hpBarBack = back

        let fill = SKShapeNode(rect: backRect, cornerRadius: 3)
        fill.fillColor = SKColor(red: 0.36, green: 0.85, blue: 0.42, alpha: 1)
        fill.strokeColor = .clear
        fill.position = back.position
        fill.zPosition = 100
        // Anchor the scale to the LEFT edge so xScale shrinks from
        // the right. SKShapeNode rects are bottom-left anchored by
        // default, which is what we want here.
        fill.xScale = 1
        addChild(fill)
        hpBarFill = fill

        // Caption row directly UNDER the HP bar. Stacks the
        // critical info vertically: HP digits over the bar, the
        // score/wave/guns caption below.
        let l = SKLabelNode(fontNamed: "Menlo-Bold")
        l.fontSize = 13
        l.fontColor = .white
        l.horizontalAlignmentMode = .left
        l.verticalAlignmentMode = .top
        l.position = CGPoint(x: 16, y: topY - 4)
        l.zPosition = 100
        l.numberOfLines = 0
        l.preferredMaxLayoutWidth = size.width - 32
        addChild(l)
        hudLabel = l
        updateHud()
    }

    private func updateHud() {
        let pct = max(0, min(1, CGFloat(hp) / CGFloat(maxHp)))
        hpBarFill?.xScale = pct
        // Recolour green → orange → red as the bar drains.
        if pct > 0.6 {
            hpBarFill?.fillColor = SKColor(red: 0.36, green: 0.85, blue: 0.42, alpha: 1)
        } else if pct > 0.3 {
            hpBarFill?.fillColor = SKColor(red: 0.95, green: 0.72, blue: 0.30, alpha: 1)
        } else {
            hpBarFill?.fillColor = SKColor(red: 0.92, green: 0.30, blue: 0.32, alpha: 1)
        }
        let gunNames = guns.isEmpty ? "—" : guns.map { $0.weapon.shortName }.joined(separator: " + ")
        hudLabel?.text = "HP \(hp)/\(maxHp)   SCORE \(score)\nWAVE \(wave)   GUNS \(gunNames)"
    }

    // ── Touch — drag anywhere = move toward that direction ───────
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        if gameOverNode != nil { restart(); return }
        if shopNode != nil { return }      // shop has its own buttons
        guard let t = touches.first else { return }
        moveTouchDown = t.location(in: self)
    }
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard shopNode == nil, let t = touches.first, let start = moveTouchDown else { return }
        let cur = t.location(in: self)
        let dx = cur.x - start.x
        let dy = cur.y - start.y
        let len = max(1, sqrt(dx * dx + dy * dy))
        let cap: CGFloat = 60   // joystick radius before max speed clamps
        let mag = min(len, cap) / cap
        moveTarget = CGVector(dx: dx / len * mag, dy: dy / len * mag)
    }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        moveTouchDown = nil
        moveTarget = .zero
    }

    // ── Update loop ──────────────────────────────────────────────
    override func update(_ currentTime: TimeInterval) {
        guard gameOverNode == nil else { return }
        if lastUpdate == 0 { lastUpdate = currentTime }
        let dt = currentTime - lastUpdate
        lastUpdate = currentTime
        // Frozen during the wave-end shop.
        if paused_ { return }
        elapsed += dt
        if waveStart == 0 { waveStart = currentTime }

        // Player movement.
        if let p = player {
            let topSpeed: CGFloat = 200 * moveSpeedMul
            let nx = p.position.x + moveTarget.dx * topSpeed * CGFloat(dt)
            let ny = p.position.y + moveTarget.dy * topSpeed * CGFloat(dt)
            p.position = CGPoint(
                x: max(28, min(size.width - 28, nx)),
                y: max(28, min(size.height - 28, ny)),
            )
        }

        // Per-gun auto-shoot. Each gun fires on its own cadence
        // and spawns bullets from its own orbital position.
        if let target = nearestEnemy()?.position {
            for i in guns.indices {
                let g = guns[i]
                let interval = 0.32 / Double(fireRateMul * g.weapon.nativeFireRateBoost)
                if currentTime - g.lastFire > interval {
                    let origin = gunWorldPosition(index: i)
                    fire(weapon: g.weapon, from: origin, toward: target)
                    guns[i].lastFire = currentTime
                }
            }
        }
        // Reposition orbital gun sprites every frame so they
        // follow the player smoothly.
        layoutGunSprites()

        // Enemy spawns.
        if currentTime - lastSpawn > spawnInterval {
            spawnEnemy()
            lastSpawn = currentTime
        }

        // Wave end → shop overlay. Resumes via shop's Done button.
        if currentTime - waveStart > waveDuration {
            openShop()
            return
        }

        // Move enemies toward player. Each enemy carries its own
        // size-scaled speed multiplier baked into userData on spawn.
        if let pp = player?.position {
            for child in children where child.userData?["enemy"] as? Bool == true {
                let dx = pp.x - child.position.x
                let dy = pp.y - child.position.y
                let len = max(1, sqrt(dx * dx + dy * dy))
                let mul = (child.userData?["speedMul"] as? CGFloat) ?? 1.0
                let speed = enemyBaseSpeed * mul
                child.position.x += dx / len * speed * CGFloat(dt)
                child.position.y += dy / len * speed * CGFloat(dt)
            }
        }
    }

    private func nearestEnemy() -> SKNode? {
        guard let pp = player?.position else { return nil }
        var best: SKNode? = nil
        var bestDist = CGFloat.greatestFiniteMagnitude
        for c in children where c.userData?["enemy"] as? Bool == true {
            let dx = c.position.x - pp.x
            let dy = c.position.y - pp.y
            let d  = dx * dx + dy * dy
            if d < bestDist { bestDist = d; best = c }
        }
        return best
    }

    /// Spawn the bullets implied by `weapon` from `origin` aimed
    /// at `target`. Multi-gun build: each orbital gun fires its
    /// own pattern. We re-use the pool across every shape so
    /// switching weapons mid-run doesn't churn allocations.
    private func fire(weapon w: WeaponLoadout, from origin: CGPoint, toward target: CGPoint) {
        let dx = target.x - origin.x
        let dy = target.y - origin.y
        let baseAngle = atan2(dy, dx)
        let count = w.bulletCount
        let spreadDeg = w.spreadDegrees
        for i in 0..<count {
            let t: CGFloat = count == 1
                ? 0
                : CGFloat(i) / CGFloat(count - 1) - 0.5
            let theta = baseAngle + CGFloat(spreadDeg) * .pi / 180 * t
            spawnBullet(weapon: w, from: origin, angle: theta)
        }
    }

    private func spawnBullet(weapon w: WeaponLoadout, from origin: CGPoint, angle: CGFloat) {
        let color = w.bulletColor
        let radius: CGFloat = w.bulletRadius
        let pierce = w.pierces
        let dmg = w.bulletDamage * bulletDamage
        let speed = bulletSpeed * w.speedMultiplier
        let bullet = bulletPool.acquire {
            let n = SKShapeNode(circleOfRadius: radius)
            n.zPosition = 5
            let body = SKPhysicsBody(circleOfRadius: radius)
            body.isDynamic = true
            body.affectedByGravity = false
            body.categoryBitMask = Self.catBullet
            body.contactTestBitMask = Self.catEnemy
            body.collisionBitMask = 0
            n.physicsBody = body
            return n
        }
        if let shape = bullet as? SKShapeNode {
            shape.fillColor = color
            shape.strokeColor = SKColor.white.withAlphaComponent(0.85)
            shape.lineWidth = 0.5
            shape.path = CGPath(ellipseIn:
                CGRect(x: -radius, y: -radius, width: radius * 2, height: radius * 2),
                transform: nil)
        }
        bullet.userData = ["bullet": true, "dmg": dmg, "pierce": pierce]
        bullet.position = origin
        if bullet.parent == nil { addChild(bullet) }
        bullet.physicsBody?.velocity = CGVector(
            dx: cos(angle) * speed, dy: sin(angle) * speed)
        bullet.removeAction(forKey: "lifespan")
        bullet.run(.sequence([
            .wait(forDuration: w.lifespan),
            .run { [weak self, weak bullet] in
                guard let bullet else { return }
                self?.recycle(bullet, into: self?.bulletPool)
            },
        ]), withKey: "lifespan")
    }

    // ── Gun loadout helpers ──────────────────────────────────────
    private func gunWorldPosition(index: Int) -> CGPoint {
        guard let p = player?.position else { return .zero }
        let count = max(1, guns.count)
        let radius: CGFloat = 38
        let angle = (CGFloat(index) / CGFloat(count)) * 2 * .pi
        return CGPoint(x: p.x + cos(angle) * radius,
                       y: p.y + sin(angle) * radius)
    }

    private func layoutGunSprites() {
        for (i, sprite) in gunSprites.enumerated() {
            sprite.position = gunWorldPosition(index: i)
        }
    }

    /// Add or replace a gun. `replacing` is the index of an existing
    /// gun to swap (used when the player buys a new weapon while
    /// already at the cap); pass nil for "append if room".
    fileprivate func equip(weapon w: WeaponLoadout, replacing slot: Int?) {
        if let slot, guns.indices.contains(slot) {
            guns[slot] = Gun(weapon: w, lastFire: 0)
        } else if guns.count < Self.maxGuns {
            guns.append(Gun(weapon: w, lastFire: 0))
        } else {
            // Pool is full and the caller didn't pick a slot to
            // overwrite — silently drop the request rather than
            // exceeding the cap. Shop UI already handles "pick a
            // slot" before reaching this branch.
            return
        }
        // Rebuild the orbital indicators so positions stay tidy.
        for sprite in gunSprites { sprite.removeFromParent() }
        gunSprites = []
        for g in guns {
            let s = SKShapeNode(circleOfRadius: 6)
            s.fillColor = g.weapon.bulletColor
            s.strokeColor = SKColor.white.withAlphaComponent(0.85)
            s.lineWidth = 0.6
            s.zPosition = 11
            addChild(s)
            gunSprites.append(s)
        }
        layoutGunSprites()
        updateHud()
    }

    private func spawnEnemy() {
        guard !enemyKinds.isEmpty else { return }
        let kind = enemyKinds.randomElement()!
        let diameter = kind.size.diameter
        let radius = diameter / 2
        let enemyNode = enemyPool.acquire {
            let n = SKSpriteNode(texture: kind.texture, size: CGSize(width: diameter, height: diameter))
            let body = SKPhysicsBody(circleOfRadius: radius)
            body.isDynamic = true
            body.affectedByGravity = false
            body.allowsRotation = false
            body.categoryBitMask = Self.catEnemy
            body.contactTestBitMask = Self.catPlayer | Self.catBullet
            body.collisionBitMask = 0
            n.physicsBody = body
            n.zPosition = 4
            return n
        }
        // Pool may hand back an old node with a different texture
        // / size — refresh it to match this kind. Physics body has
        // to be recreated when the radius changes.
        if let sprite = enemyNode as? SKSpriteNode {
            sprite.texture = kind.texture
            sprite.size = CGSize(width: diameter, height: diameter)
        }
        let body = SKPhysicsBody(circleOfRadius: radius)
        body.isDynamic = true
        body.affectedByGravity = false
        body.allowsRotation = false
        body.categoryBitMask = Self.catEnemy
        body.contactTestBitMask = Self.catPlayer | Self.catBullet
        body.collisionBitMask = 0
        enemyNode.physicsBody = body
        enemyNode.userData = [
            "enemy": true,
            "hp": kind.size.hp,
            "speedMul": kind.size.speedMultiplier,
            "contact": kind.size.contactDamage,
            "score": kind.size.scoreReward,
        ]
        // Spawn just outside the playable area on a random edge.
        let edge = Int.random(in: 0..<4)
        switch edge {
        case 0: enemyNode.position = CGPoint(x: -30, y: .random(in: 0...size.height))
        case 1: enemyNode.position = CGPoint(x: size.width + 30, y: .random(in: 0...size.height))
        case 2: enemyNode.position = CGPoint(x: .random(in: 0...size.width), y: -30)
        default: enemyNode.position = CGPoint(x: .random(in: 0...size.width), y: size.height + 30)
        }
        if enemyNode.parent == nil { addChild(enemyNode) }
    }

    private func recycle(_ node: SKNode, into pool: SpritePool?) {
        node.removeAllActions()
        node.physicsBody?.velocity = .zero
        node.removeFromParent()
        pool?.release(node)
    }

    // ── Collisions ──────────────────────────────────────────────
    func didBegin(_ contact: SKPhysicsContact) {
        let a = contact.bodyA, b = contact.bodyB
        let cats = a.categoryBitMask | b.categoryBitMask
        if cats == (Self.catBullet | Self.catEnemy) {
            let bullet = a.categoryBitMask == Self.catBullet ? a.node : b.node
            let enemy  = a.categoryBitMask == Self.catEnemy  ? a.node : b.node
            let dmg = (bullet?.userData?["dmg"] as? Int) ?? 1
            let pierces = (bullet?.userData?["pierce"] as? Bool) ?? false
            if let bullet, !pierces { recycle(bullet, into: bulletPool) }
            if let enemy {
                var hpLeft = (enemy.userData?["hp"] as? Int) ?? 1
                hpLeft -= dmg
                if hpLeft <= 0 {
                    let reward = (enemy.userData?["score"] as? Int) ?? 10
                    recycle(enemy, into: enemyPool)
                    score += reward
                    if lifestealOnKill > 0 {
                        hp = min(maxHp, hp + lifestealOnKill)
                    }
                } else {
                    enemy.userData?["hp"] = hpLeft
                }
            }
        } else if cats == (Self.catPlayer | Self.catEnemy) {
            let enemy = a.categoryBitMask == Self.catEnemy ? a.node : b.node
            let damage = ((enemy?.userData?["contact"] as? Int) ?? 12)
                - bonusEnemyDamageReduction
            if let enemy { recycle(enemy, into: enemyPool) }
            hp = max(0, hp - max(2, damage))
            if hp == 0 { triggerGameOver() }
            // Brief player flash.
            player?.run(.sequence([
                .colorize(with: .red, colorBlendFactor: 0.7, duration: 0.1),
                .colorize(withColorBlendFactor: 0, duration: 0.2),
            ]))
        }
    }

    // ── Game over ───────────────────────────────────────────────
    private func triggerGameOver() {
        let group = SKNode()
        group.zPosition = 200
        let bg = SKShapeNode(rect: CGRect(origin: .zero, size: size))
        bg.fillColor = SKColor.black.withAlphaComponent(0.7)
        bg.strokeColor = .clear
        group.addChild(bg)
        let title = SKLabelNode(fontNamed: "Menlo-Bold")
        title.text = "GAME OVER"
        title.fontSize = 36
        title.fontColor = .white
        title.position = CGPoint(x: size.width / 2, y: size.height / 2 + 24)
        group.addChild(title)
        let sub = SKLabelNode(fontNamed: "Menlo")
        sub.text = "Score \(score)   ·   Wave \(wave)   ·   tap to retry"
        sub.fontSize = 16
        sub.fontColor = .white.withAlphaComponent(0.8)
        sub.position = CGPoint(x: size.width / 2, y: size.height / 2 - 14)
        group.addChild(sub)
        addChild(group)
        gameOverNode = group
    }

    private func restart() {
        // Tear down existing game entities (player kept).
        for child in children where (child.userData?["enemy"] as? Bool == true)
                                 || (child.userData?["bullet"] as? Bool == true) {
            recycle(child, into: child.userData?["bullet"] as? Bool == true ? bulletPool : enemyPool)
        }
        gameOverNode?.removeFromParent()
        gameOverNode = nil
        maxHp = 100
        hp = 100
        score = 0
        wave = 1
        spawnInterval = 1.2
        enemyBaseSpeed = 65
        elapsed = 0
        lastShot = 0
        lastSpawn = 0
        waveStart = 0
        lastUpdate = 0
        moveTouchDown = nil
        moveTarget = .zero
        for sprite in gunSprites { sprite.removeFromParent() }
        gunSprites = []
        guns = []
        equip(weapon: .arcaneBolt, replacing: nil)
        bulletDamage = 1
        bulletSpeed = 460
        fireRateMul = 1.0
        moveSpeedMul = 1.0
        lifestealOnKill = 0
        bonusEnemyDamageReduction = 0
    }

    // ── Wave-end shop ────────────────────────────────────────────
    // Pauses gameplay, draws three random upgrade cards from the
    // pool that the player can afford-or-skip. Tap a card to buy
    // it (deducts the cost from score, applies the effect); tap
    // "Skip" to pass on all three. Either way the next wave starts
    // afterwards.
    private func openShop() {
        // Clear bullets so the wave-end pause looks clean. Enemies
        // freeze but stay on screen so the next wave doesn't start
        // from zero density.
        for child in children where (child.userData?["bullet"] as? Bool == true) {
            recycle(child, into: bulletPool)
        }
        paused_ = true
        moveTarget = .zero
        moveTouchDown = nil

        // Roll three distinct affordable + relevant upgrades.
        let equipped = Set(guns.map { $0.weapon })
        let pool = Upgrade.draftPool(currentScore: score, equippedWeapons: equipped)
        let drafted = pool.shuffled().prefix(3)

        let group = SKNode()
        group.zPosition = 250
        let bg = SKShapeNode(rect: CGRect(origin: .zero, size: size))
        bg.fillColor = SKColor.black.withAlphaComponent(0.78)
        bg.strokeColor = .clear
        group.addChild(bg)

        let title = SKLabelNode(fontNamed: "Menlo-Bold")
        title.text = "WAVE \(wave) CLEARED"
        title.fontSize = 22
        title.fontColor = SKColor(red: 1, green: 0.9, blue: 0.55, alpha: 1)
        title.position = CGPoint(x: size.width / 2, y: size.height - 110)
        group.addChild(title)

        let sub = SKLabelNode(fontNamed: "Menlo")
        sub.text = "Choose a boon · score \(score)"
        sub.fontSize = 13
        sub.fontColor = .white.withAlphaComponent(0.75)
        sub.position = CGPoint(x: size.width / 2, y: size.height - 134)
        group.addChild(sub)

        // Three cards stacked vertically.
        let cardW: CGFloat = min(size.width - 36, 320)
        let cardH: CGFloat = 96
        let gap:   CGFloat = 14
        let totalH = cardH * 3 + gap * 2
        let topY  = size.height / 2 + totalH / 2
        for (i, up) in drafted.enumerated() {
            let card = makeShopCard(upgrade: up,
                                    width: cardW, height: cardH)
            card.position = CGPoint(
                x: size.width / 2,
                y: topY - (CGFloat(i) * (cardH + gap)) - cardH / 2,
            )
            group.addChild(card)
        }
        // Skip button.
        let skip = SKLabelNode(fontNamed: "Menlo-Bold")
        skip.text = "Skip ▸"
        skip.fontSize = 16
        skip.fontColor = .white.withAlphaComponent(0.7)
        skip.name = "shop_skip"
        skip.horizontalAlignmentMode = .center
        skip.position = CGPoint(x: size.width / 2, y: 80)
        skip.zPosition = 1
        group.addChild(skip)

        addChild(group)
        shopNode = group
    }

    private func makeShopCard(upgrade: Upgrade, width: CGFloat, height: CGFloat) -> SKNode {
        let card = SKNode()
        card.name = "shop_card:\(upgrade.id)"
        let rect = CGRect(x: -width / 2, y: -height / 2, width: width, height: height)
        let bg = SKShapeNode(rect: rect, cornerRadius: 10)
        bg.fillColor = SKColor(red: 0.10, green: 0.10, blue: 0.18, alpha: 0.94)
        let canAfford = score >= upgrade.cost
        bg.strokeColor = canAfford
            ? SKColor(red: 0.85, green: 0.65, blue: 0.20, alpha: 1)
            : SKColor.white.withAlphaComponent(0.15)
        bg.lineWidth = canAfford ? 1.6 : 1
        bg.userData = ["card": upgrade.id]
        card.addChild(bg)

        let name = SKLabelNode(fontNamed: "Menlo-Bold")
        name.text = upgrade.name
        name.fontSize = 16
        name.fontColor = canAfford
            ? SKColor(red: 1, green: 0.92, blue: 0.65, alpha: 1)
            : .white.withAlphaComponent(0.5)
        name.horizontalAlignmentMode = .left
        name.position = CGPoint(x: -width / 2 + 14, y: height / 2 - 24)
        card.addChild(name)

        let cost = SKLabelNode(fontNamed: "Menlo-Bold")
        cost.text = "\(upgrade.cost)"
        cost.fontSize = 14
        cost.fontColor = canAfford ? .yellow : .white.withAlphaComponent(0.4)
        cost.horizontalAlignmentMode = .right
        cost.position = CGPoint(x: width / 2 - 14, y: height / 2 - 22)
        card.addChild(cost)

        let desc = SKLabelNode(fontNamed: "Menlo")
        desc.text = upgrade.desc
        desc.fontSize = 12
        desc.fontColor = .white.withAlphaComponent(canAfford ? 0.85 : 0.4)
        desc.horizontalAlignmentMode = .left
        desc.numberOfLines = 0
        desc.preferredMaxLayoutWidth = width - 28
        desc.position = CGPoint(x: -width / 2 + 14, y: -2)
        card.addChild(desc)

        // Tag the card with its upgrade id so touchesBegan can
        // resolve which one the user tapped.
        card.userData = ["upgrade": upgrade.id, "cost": upgrade.cost]
        return card
    }

    /// Called from touchesEnded when the shop is open.
    private func handleShopTap(at point: CGPoint) {
        // Replace-slot picker takes priority — it sits on top of
        // the shop overlay when the player is at the gun cap.
        if replacePickerNode != nil { handleReplaceTap(at: point); return }
        guard let shop = shopNode else { return }
        let nodes = self.nodes(at: point)
        for n in nodes {
            var cur: SKNode? = n
            while let c = cur {
                if c.name == "shop_skip" {
                    closeShop(); return
                }
                if let upgradeId = c.userData?["upgrade"] as? String {
                    if let up = Upgrade.byId(upgradeId) { tryPurchase(up) }
                    return
                }
                cur = c.parent
                if cur === shop { break }
            }
        }
    }

    /// Either deducts + applies + closes immediately, or — for
    /// weapon unlocks while the gun cap is full — opens the
    /// replace-slot picker WITHOUT deducting yet.
    private func tryPurchase(_ up: Upgrade) {
        guard score >= up.cost else { return }
        if let weapon = up.weaponUnlock, guns.count >= Self.maxGuns {
            openReplacePicker(weapon: weapon, cost: up.cost)
            return
        }
        score -= up.cost
        if let weapon = up.weaponUnlock {
            equip(weapon: weapon, replacing: nil)
        } else {
            up.apply(self)
        }
        closeShop()
    }

    // ── Replace-slot picker ─────────────────────────────────────
    private var replacePickerNode: SKNode?
    private var replacePickerWeapon: WeaponLoadout?
    private var replacePickerCost: Int = 0

    private func openReplacePicker(weapon: WeaponLoadout, cost: Int) {
        replacePickerWeapon = weapon
        replacePickerCost = cost
        let group = SKNode()
        group.zPosition = 350
        let bg = SKShapeNode(rect: CGRect(origin: .zero, size: size))
        bg.fillColor = SKColor.black.withAlphaComponent(0.85)
        bg.strokeColor = .clear
        group.addChild(bg)

        let title = SKLabelNode(fontNamed: "Menlo-Bold")
        title.text = "REPLACE A GUN"
        title.fontSize = 22
        title.fontColor = SKColor(red: 1, green: 0.9, blue: 0.55, alpha: 1)
        title.position = CGPoint(x: size.width / 2, y: size.height - 130)
        group.addChild(title)

        let sub = SKLabelNode(fontNamed: "Menlo")
        sub.text = "Buying \(weapon.displayName) (\(cost) pts) — pick a slot to swap out."
        sub.fontSize = 12
        sub.fontColor = .white.withAlphaComponent(0.8)
        sub.numberOfLines = 0
        sub.preferredMaxLayoutWidth = size.width - 60
        sub.position = CGPoint(x: size.width / 2, y: size.height - 156)
        group.addChild(sub)

        let cardW: CGFloat = min(size.width - 36, 320)
        let cardH: CGFloat = 78
        let gap: CGFloat = 12
        let total = cardH * 3 + gap * 2
        let topY = size.height / 2 + total / 2
        for (i, g) in guns.enumerated() {
            let card = makeReplaceCard(slot: i, weapon: g.weapon,
                                       width: cardW, height: cardH)
            card.position = CGPoint(
                x: size.width / 2,
                y: topY - CGFloat(i) * (cardH + gap) - cardH / 2,
            )
            group.addChild(card)
        }
        let cancel = SKLabelNode(fontNamed: "Menlo-Bold")
        cancel.text = "Cancel"
        cancel.fontSize = 16
        cancel.fontColor = .white.withAlphaComponent(0.7)
        cancel.name = "replace_cancel"
        cancel.horizontalAlignmentMode = .center
        cancel.position = CGPoint(x: size.width / 2, y: 80)
        cancel.zPosition = 1
        group.addChild(cancel)

        addChild(group)
        replacePickerNode = group
    }

    private func makeReplaceCard(slot: Int, weapon: WeaponLoadout,
                                 width: CGFloat, height: CGFloat) -> SKNode {
        let card = SKNode()
        let rect = CGRect(x: -width / 2, y: -height / 2, width: width, height: height)
        let bg = SKShapeNode(rect: rect, cornerRadius: 10)
        bg.fillColor = SKColor(red: 0.10, green: 0.10, blue: 0.18, alpha: 0.96)
        bg.strokeColor = SKColor(red: 0.85, green: 0.65, blue: 0.20, alpha: 1)
        bg.lineWidth = 1.4
        card.addChild(bg)

        let label = SKLabelNode(fontNamed: "Menlo-Bold")
        label.text = "Slot \(slot + 1)  ·  \(weapon.displayName)"
        label.fontSize = 15
        label.fontColor = SKColor(red: 1, green: 0.92, blue: 0.65, alpha: 1)
        label.horizontalAlignmentMode = .left
        label.position = CGPoint(x: -width / 2 + 14, y: 6)
        card.addChild(label)

        let hint = SKLabelNode(fontNamed: "Menlo")
        hint.text = "Tap to replace this slot"
        hint.fontSize = 11
        hint.fontColor = .white.withAlphaComponent(0.65)
        hint.horizontalAlignmentMode = .left
        hint.position = CGPoint(x: -width / 2 + 14, y: -14)
        card.addChild(hint)

        card.userData = ["replace_slot": slot]
        return card
    }

    private func handleReplaceTap(at point: CGPoint) {
        guard let picker = replacePickerNode else { return }
        let nodes = self.nodes(at: point)
        for n in nodes {
            var cur: SKNode? = n
            while let c = cur {
                if c.name == "replace_cancel" {
                    closeReplacePicker(refund: false)
                    // Drop back to the live shop. Player keeps
                    // their score; they can pick a different
                    // upgrade or skip the wave.
                    return
                }
                if let slot = c.userData?["replace_slot"] as? Int,
                   let weapon = replacePickerWeapon {
                    score -= replacePickerCost
                    equip(weapon: weapon, replacing: slot)
                    closeReplacePicker(refund: false)
                    closeShop()
                    return
                }
                cur = c.parent
                if cur === picker { break }
            }
        }
    }

    private func closeReplacePicker(refund: Bool) {
        replacePickerNode?.removeFromParent()
        replacePickerNode = nil
        replacePickerWeapon = nil
        replacePickerCost = 0
    }

    private func closeShop() {
        shopNode?.removeFromParent()
        shopNode = nil
        paused_ = false
        wave += 1
        // Tighten difficulty for the next wave.
        spawnInterval = max(0.18, spawnInterval * 0.85)
        enemyBaseSpeed = min(220, enemyBaseSpeed * 1.07)
        waveStart = 0   // resets on the next update tick
        lastSpawn = 0
        lastShot = 0
        lastUpdate = 0
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    // Override touchesBegan via a separate path when shop is open
    // so the joystick doesn't engage. Keep the existing pure-game
    // code path readable by routing the shop case here.
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        moveTouchDown = nil
        moveTarget = .zero
        if shopNode != nil, let t = touches.first {
            handleShopTap(at: t.location(in: self))
        }
    }
}

// ── Weapons ─────────────────────────────────────────────────────

// One equipped gun on the player's orbital ring. Brotato-style:
// each gun fires its own pattern on its own cadence; the loadout
// is up to MAX_GUNS distinct WeaponLoadouts at once.
fileprivate struct Gun {
    let weapon: WeaponLoadout
    var lastFire: TimeInterval
}

fileprivate enum WeaponLoadout: String, CaseIterable {
    case arcaneBolt   // default — single straight shot
    case twinBlades   // 2 spread bullets
    case frostLance   // pierces, +1 damage, slower fire
    case holyTrinity  // 3-spread
    case shadowstrike // single, +50% bullet speed, +60% fire rate
    case dragonsBreath // 3 bullets, narrow cone, faster fire
    case stormcaller  // single, very fast, high damage

    var displayName: String {
        switch self {
        case .arcaneBolt:    return "Arcane Bolt"
        case .twinBlades:    return "Twin Blades"
        case .frostLance:    return "Frost Lance"
        case .holyTrinity:   return "Holy Trinity"
        case .shadowstrike:  return "Shadowstrike"
        case .dragonsBreath: return "Dragon's Breath"
        case .stormcaller:   return "Stormcaller"
        }
    }
    /// Compact tag for the HUD caption (3 guns side-by-side).
    var shortName: String {
        switch self {
        case .arcaneBolt:    return "Bolt"
        case .twinBlades:    return "Twin"
        case .frostLance:    return "Lance"
        case .holyTrinity:   return "Trinity"
        case .shadowstrike:  return "Shadow"
        case .dragonsBreath: return "Breath"
        case .stormcaller:   return "Storm"
        }
    }
    var bulletCount: Int {
        switch self {
        case .arcaneBolt, .frostLance, .shadowstrike, .stormcaller: return 1
        case .twinBlades:    return 2
        case .holyTrinity, .dragonsBreath: return 3
        }
    }
    var spreadDegrees: Double {
        switch self {
        case .arcaneBolt, .frostLance, .shadowstrike, .stormcaller: return 0
        case .twinBlades:    return 16
        case .holyTrinity:   return 26
        case .dragonsBreath: return 14
        }
    }
    var bulletDamage: Int {
        switch self {
        case .frostLance: return 2
        case .stormcaller: return 3
        default: return 1
        }
    }
    var bulletRadius: CGFloat {
        switch self {
        case .frostLance: return 5
        case .stormcaller: return 6
        case .dragonsBreath: return 3
        default: return 4
        }
    }
    var bulletColor: SKColor {
        switch self {
        case .arcaneBolt:    return SKColor(red: 1, green: 0.86, blue: 0.30, alpha: 1)
        case .twinBlades:    return SKColor(red: 0.85, green: 0.85, blue: 0.95, alpha: 1)
        case .frostLance:    return SKColor(red: 0.55, green: 0.85, blue: 1.0,  alpha: 1)
        case .holyTrinity:   return SKColor(red: 1, green: 1, blue: 0.65, alpha: 1)
        case .shadowstrike:  return SKColor(red: 0.65, green: 0.40, blue: 0.95, alpha: 1)
        case .dragonsBreath: return SKColor(red: 1, green: 0.50, blue: 0.20, alpha: 1)
        case .stormcaller:   return SKColor(red: 0.55, green: 0.85, blue: 1.0,  alpha: 1)
        }
    }
    var pierces: Bool {
        switch self {
        case .frostLance: return true
        default: return false
        }
    }
    var lifespan: TimeInterval {
        switch self {
        case .frostLance: return 2.0
        case .shadowstrike: return 1.2
        default: return 1.5
        }
    }
    var speedMultiplier: CGFloat {
        switch self {
        case .shadowstrike: return 1.5
        case .stormcaller: return 1.7
        case .dragonsBreath: return 1.2
        default: return 1.0
        }
    }
    /// Native fire-rate boost — multiplied with the player's
    /// fireRateMul.  Reads as "this weapon fires X× as fast as
    /// the default Arcane Bolt".
    var nativeFireRateBoost: CGFloat {
        switch self {
        case .shadowstrike: return 1.6
        case .dragonsBreath: return 1.4
        case .stormcaller: return 0.65   // slower, hits hard
        default: return 1.0
        }
    }
}

// ── Upgrades / shop pool ───────────────────────────────────────

// fileprivate because the apply closure references the private
// GameScene type — the compiler refuses to expose a stricter
// visibility on the closure than the struct's own. Same pattern
// the Weapon enum below the GameScene class uses.
fileprivate struct Upgrade {
    let id: String
    let name: String
    let desc: String
    let cost: Int
    /// Non-nil for weapon unlocks. The shop short-circuits the
    /// "guns full → replace picker" flow before invoking apply()
    /// so this closure stays pure for stat upgrades.
    let weaponUnlock: WeaponLoadout?
    let apply: (GameScene) -> Void
}

fileprivate extension Upgrade {
    /// Brotato-priced — costs scale with the typical points-per-
    /// wave (~150-300 once medium-class enemies are dying). One or
    /// two upgrades per wave is the intended cadence; weapon
    /// unlocks are the most expensive tier so they read as a
    /// proper milestone.
    static let pool: [Upgrade] = [
        // ── Stat upgrades ──────────────────────────────────────
        Upgrade(id: "swift_boots",    name: "Swift Boots",
                desc: "+25 % movement speed.",
                cost: 90, weaponUnlock: nil,
                apply: { $0.applyMoveSpeedBoost(0.25) }),
        Upgrade(id: "chain_mail",     name: "Chain Mail",
                desc: "+30 max HP, full heal.",
                cost: 130, weaponUnlock: nil,
                apply: { $0.applyMaxHpBoost(30, fullHeal: true) }),
        Upgrade(id: "sharpshooter",   name: "Sharpshooter",
                desc: "+1 bullet damage on every gun.",
                cost: 180, weaponUnlock: nil,
                apply: { $0.applyBulletDamageBoost(1) }),
        Upgrade(id: "fleet_arrows",   name: "Fleet Arrows",
                desc: "+30 % bullet speed.",
                cost: 90, weaponUnlock: nil,
                apply: { $0.applyBulletSpeedBoost(0.3) }),
        Upgrade(id: "quickdraw",      name: "Quickdraw",
                desc: "+25 % fire rate on every gun.",
                cost: 150, weaponUnlock: nil,
                apply: { $0.applyFireRateBoost(0.25) }),
        Upgrade(id: "battle_hardened", name: "Battle Hardened",
                desc: "Take 3 less damage from each hit.",
                cost: 130, weaponUnlock: nil,
                apply: { $0.applyDamageReduction(3) }),
        Upgrade(id: "vampiric",       name: "Vampiric Aura",
                desc: "Heal 1 HP for every kill.",
                cost: 220, weaponUnlock: nil,
                apply: { $0.applyLifesteal(1) }),
        // ── Weapon unlocks ─────────────────────────────────────
        // Each one adds a new gun to the orbital ring (or, when
        // already at the cap, prompts the player to replace one).
        Upgrade(id: "weapon_twin",    name: "Twin Blades",
                desc: "Adds a gun firing a 2-bullet 16° spread.",
                cost: 180, weaponUnlock: .twinBlades, apply: { _ in }),
        Upgrade(id: "weapon_frost",   name: "Frost Lance",
                desc: "Adds a gun whose bullets pierce. 2 damage.",
                cost: 240, weaponUnlock: .frostLance, apply: { _ in }),
        Upgrade(id: "weapon_trinity", name: "Holy Trinity",
                desc: "Adds a gun firing a 3-bullet 26° spread.",
                cost: 220, weaponUnlock: .holyTrinity, apply: { _ in }),
        Upgrade(id: "weapon_shadow",  name: "Shadowstrike",
                desc: "Adds a fast gun. 1.5× speed, 1.6× fire rate.",
                cost: 260, weaponUnlock: .shadowstrike, apply: { _ in }),
        Upgrade(id: "weapon_breath",  name: "Dragon's Breath",
                desc: "Adds a 3-bullet cone gun, 1.4× fire rate.",
                cost: 280, weaponUnlock: .dragonsBreath, apply: { _ in }),
        Upgrade(id: "weapon_storm",   name: "Stormcaller",
                desc: "Adds a heavy gun. 3 damage, 0.65× cadence.",
                cost: 320, weaponUnlock: .stormcaller, apply: { _ in }),
    ]
    static func byId(_ id: String) -> Upgrade? { pool.first { $0.id == id } }

    /// Drops weapon unlocks the player already has equipped — re-
    /// adding the same weapon to a different slot wouldn't change
    /// anything visible. Keeps the card draft varied.
    static func draftPool(currentScore: Int, equippedWeapons: Set<WeaponLoadout>) -> [Upgrade] {
        return pool.filter { up in
            guard let w = up.weaponUnlock else { return true }
            return !equippedWeapons.contains(w)
        }
    }
}

// ── Upgrade application — lives on GameScene ────────────────────

private extension GameScene {
    func applyMoveSpeedBoost(_ pct: CGFloat) {
        moveSpeedMul *= (1 + pct)
    }
    func applyMaxHpBoost(_ amount: Int, fullHeal: Bool) {
        maxHp += amount
        if fullHeal { hp = maxHp } else { hp = min(maxHp, hp + amount) }
    }
    func applyBulletDamageBoost(_ amount: Int) {
        bulletDamage += amount
    }
    func applyBulletSpeedBoost(_ pct: CGFloat) {
        bulletSpeed *= (1 + pct)
    }
    func applyFireRateBoost(_ pct: CGFloat) {
        fireRateMul *= (1 + pct)
    }
    func applyDamageReduction(_ amount: Int) {
        bonusEnemyDamageReduction += amount
    }
    func applyLifesteal(_ amount: Int) {
        lifestealOnKill += amount
    }
}

// ── Sprite pool ─────────────────────────────────────────────────
// Keeps a stack of inactive SKNodes ready for re-use so we never
// allocate a bullet or an enemy mid-frame. Retain count stays >0
// for pooled nodes; SpriteKit removes them from the scene graph
// via removeFromParent() when released.
private final class SpritePool {
    private var idle: [SKNode] = []
    func acquire(_ make: () -> SKNode) -> SKNode {
        if let n = idle.popLast() { return n }
        return make()
    }
    func release(_ node: SKNode) {
        idle.append(node)
    }
}

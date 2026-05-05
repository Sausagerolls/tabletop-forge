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
    @State private var enemyTextures: [SKTexture] = []
    @State private var loadingError: String? = nil
    @State private var didLoadCreatures: Bool = false

    // Player + monster creatures on the live server. Players become
    // avatar choices; monsters become the enemy roster.
    @State private var playerCreatures: [Creature] = []
    @State private var monsterCreatures: [Creature] = []

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Once an avatar is picked, hand off to the game scene.
            if let avatar = avatarTexture, !enemyTextures.isEmpty {
                GameSceneView(playerTexture: avatar, enemyTextures: enemyTextures)
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
            Text("(server version easter egg)")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.55))
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
            // Pre-load enemy textures up front. This blocks the
            // picker view ever-so-briefly but means the game scene
            // boots with everything resident in GPU memory — no
            // hitches on the first wave.
            enemyTextures = await loadTextures(creatures: monsterCreatures, base: base)
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

    private func loadTextures(creatures: [Creature], base: URL) async -> [SKTexture] {
        var out: [SKTexture] = []
        for c in creatures {
            guard let path = c.image_path,
                  let url = URL(string: "\(base.absoluteString)/uploads/\(path)") else { continue }
            if let t = await loadTexture(url: url) { out.append(t) }
        }
        return out
    }

    private func loadTexture(url: URL) async -> SKTexture? {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let img = UIImage(data: data) else { return nil }
            let tex = SKTexture(image: img)
            tex.filteringMode = .linear
            return tex
        } catch { return nil }
    }
}

// ── SpriteKit host ──────────────────────────────────────────────
private struct GameSceneView: UIViewRepresentable {
    let playerTexture: SKTexture
    let enemyTextures: [SKTexture]

    func makeUIView(context: Context) -> SKView {
        let view = SKView(frame: .zero)
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        view.showsFPS = false
        view.showsNodeCount = false
        let scene = GameScene(playerTexture: playerTexture,
                              enemyTextures: enemyTextures,
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
    private let enemyTextures: [SKTexture]

    init(playerTexture: SKTexture, enemyTextures: [SKTexture], size: CGSize) {
        self.playerTexture = playerTexture
        self.enemyTextures = enemyTextures
        super.init(size: size)
        backgroundColor = SKColor(red: 0.04, green: 0.05, blue: 0.07, alpha: 1)
    }
    required init?(coder: NSCoder) { fatalError() }

    // ── Game state ──────────────────────────────────────────────
    private var player: SKSpriteNode!
    private var hp: Int = 100 { didSet { updateHud() } }
    private var score: Int = 0 { didSet { updateHud() } }
    private var wave: Int = 0 { didSet { updateHud() } }
    private var elapsed: TimeInterval = 0
    private var lastUpdate: TimeInterval = 0
    private var lastShot: TimeInterval = 0
    private var lastSpawn: TimeInterval = 0
    private var lastWaveTick: TimeInterval = 0
    private let shotInterval: TimeInterval = 0.32
    private var spawnInterval: TimeInterval = 1.2
    private var enemySpeed: CGFloat = 60
    private var moveTouchDown: CGPoint?
    private var moveTarget: CGVector = .zero
    private var hudLabel: SKLabelNode!
    private var gameOverNode: SKNode?
    private let bulletPool = SpritePool()
    private let enemyPool  = SpritePool()
    private var enemyPhysicsBody: SKPhysicsBody?

    override func didMove(to view: SKView) {
        physicsWorld.gravity = .zero
        physicsWorld.contactDelegate = self
        spawnPlayer()
        spawnHud()
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
        let l = SKLabelNode(fontNamed: "Menlo-Bold")
        l.fontSize = 16
        l.fontColor = .white
        l.horizontalAlignmentMode = .left
        l.verticalAlignmentMode = .top
        l.position = CGPoint(x: 16, y: size.height - 50)
        l.zPosition = 100
        addChild(l)
        hudLabel = l
        updateHud()
    }

    private func updateHud() {
        hudLabel?.text = "HP \(hp)   ·   SCORE \(score)   ·   WAVE \(wave)"
    }

    // ── Touch — drag anywhere = move toward that direction ───────
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        if gameOverNode != nil { restart(); return }
        guard let t = touches.first else { return }
        moveTouchDown = t.location(in: self)
    }
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = touches.first, let start = moveTouchDown else { return }
        let cur = t.location(in: self)
        let dx = cur.x - start.x
        let dy = cur.y - start.y
        let len = max(1, sqrt(dx * dx + dy * dy))
        let cap: CGFloat = 60   // joystick radius before max speed clamps
        let mag = min(len, cap) / cap
        moveTarget = CGVector(dx: dx / len * mag, dy: dy / len * mag)
    }
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        moveTouchDown = nil
        moveTarget = .zero
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
        elapsed += dt

        // Player movement (200 px/s top speed).
        if let p = player {
            let nx = p.position.x + moveTarget.dx * 200 * CGFloat(dt)
            let ny = p.position.y + moveTarget.dy * 200 * CGFloat(dt)
            p.position = CGPoint(
                x: max(28, min(size.width - 28, nx)),
                y: max(28, min(size.height - 28, ny)),
            )
        }

        // Auto-shoot at the nearest enemy.
        if currentTime - lastShot > shotInterval, let target = nearestEnemy() {
            shoot(toward: target.position)
            lastShot = currentTime
        }

        // Enemy spawns.
        if currentTime - lastSpawn > spawnInterval {
            spawnEnemy()
            lastSpawn = currentTime
        }

        // Wave escalation every 20 seconds — more enemies, faster.
        if currentTime - lastWaveTick > 20 {
            lastWaveTick = currentTime
            wave += 1
            spawnInterval = max(0.18, spawnInterval * 0.85)
            enemySpeed   = min(220, enemySpeed * 1.1)
        }

        // Move enemies toward player + cull off-screen / dead.
        if let pp = player?.position {
            for child in children where child.userData?["enemy"] as? Bool == true {
                let dx = pp.x - child.position.x
                let dy = pp.y - child.position.y
                let len = max(1, sqrt(dx * dx + dy * dy))
                child.position.x += dx / len * enemySpeed * CGFloat(dt)
                child.position.y += dy / len * enemySpeed * CGFloat(dt)
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

    private func shoot(toward target: CGPoint) {
        guard let pp = player?.position else { return }
        let bullet = bulletPool.acquire {
            let n = SKShapeNode(circleOfRadius: 4)
            n.fillColor = .yellow
            n.strokeColor = .white
            n.lineWidth = 0.5
            n.zPosition = 5
            let body = SKPhysicsBody(circleOfRadius: 4)
            body.isDynamic = true
            body.affectedByGravity = false
            body.categoryBitMask = Self.catBullet
            body.contactTestBitMask = Self.catEnemy
            body.collisionBitMask = 0
            n.physicsBody = body
            n.userData = ["bullet": true]
            return n
        }
        bullet.position = pp
        if bullet.parent == nil { addChild(bullet) }
        let dx = target.x - pp.x
        let dy = target.y - pp.y
        let len = max(1, sqrt(dx * dx + dy * dy))
        let speed: CGFloat = 460
        bullet.physicsBody?.velocity = CGVector(dx: dx / len * speed, dy: dy / len * speed)
        // Auto-cull after 1.5 s.
        bullet.run(.sequence([
            .wait(forDuration: 1.5),
            .run { [weak self, weak bullet] in
                guard let bullet else { return }
                self?.recycle(bullet, into: self?.bulletPool)
            },
        ]), withKey: "lifespan")
    }

    private func spawnEnemy() {
        guard !enemyTextures.isEmpty else { return }
        let tex = enemyTextures.randomElement()!
        let enemyNode = enemyPool.acquire {
            let n = SKSpriteNode(texture: tex, size: CGSize(width: 44, height: 44))
            let body = SKPhysicsBody(circleOfRadius: 18)
            body.isDynamic = true
            body.affectedByGravity = false
            body.allowsRotation = false
            body.categoryBitMask = Self.catEnemy
            body.contactTestBitMask = Self.catPlayer | Self.catBullet
            body.collisionBitMask = 0
            n.physicsBody = body
            n.zPosition = 4
            n.userData = ["enemy": true, "hp": 2]
            return n
        }
        // Pool may hand back an old node — refresh the texture
        // (sprite-only) and reset hp so re-used enemies don't
        // inherit the previous spawn's damage state.
        let enemy = enemyNode
        if let sprite = enemy as? SKSpriteNode { sprite.texture = tex }
        enemy.userData?["hp"] = 2
        // Spawn just outside the playable area on a random edge.
        let edge = Int.random(in: 0..<4)
        switch edge {
        case 0: enemy.position = CGPoint(x: -30, y: .random(in: 0...size.height))
        case 1: enemy.position = CGPoint(x: size.width + 30, y: .random(in: 0...size.height))
        case 2: enemy.position = CGPoint(x: .random(in: 0...size.width), y: -30)
        default: enemy.position = CGPoint(x: .random(in: 0...size.width), y: size.height + 30)
        }
        if enemy.parent == nil { addChild(enemy) }
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
            if let bullet { recycle(bullet, into: bulletPool) }
            if let enemy {
                var hpLeft = (enemy.userData?["hp"] as? Int) ?? 1
                hpLeft -= 1
                if hpLeft <= 0 {
                    recycle(enemy, into: enemyPool)
                    score += 10
                } else {
                    enemy.userData?["hp"] = hpLeft
                }
            }
        } else if cats == (Self.catPlayer | Self.catEnemy) {
            let enemy = a.categoryBitMask == Self.catEnemy ? a.node : b.node
            if let enemy { recycle(enemy, into: enemyPool) }
            hp = max(0, hp - 12)
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
        hp = 100
        score = 0
        wave = 1
        spawnInterval = 1.2
        enemySpeed = 60
        elapsed = 0
        lastShot = 0
        lastSpawn = 0
        lastWaveTick = 0
        lastUpdate = 0
        moveTouchDown = nil
        moveTarget = .zero
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

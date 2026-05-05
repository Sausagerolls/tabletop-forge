// MinigameScreen — Kotlin port of ios/TableTopForge/Views/MinigameView.swift.
// Brotato-style reverse bullet hell easter egg, triggered from the
// DiceLight screen by tapping the server version row three times.
//
// Architecture
// ────────────
// * MinigameScreen (Compose)         — host. Loads creatures, shows
//   the avatar picker, then hands off to GameArena once an avatar
//   has been chosen.
// * GameArena (Compose)              — the live game. Drives a
//   `withFrameNanos`-paced game loop via LaunchedEffect; renders
//   via Compose's foundation Canvas; touch is handled with a single
//   pointerInput that captures the first finger as a virtual joystick.
// * GameEngine (plain class)         — all the mutable game state
//   (player, enemies, bullets, guns, wave, upgrades). Recomposition
//   is driven by a tick counter so the engine can mutate plain vars
//   without going through Compose's snapshot system at 60 fps.
//
// Bitmaps for player + enemy tokens are downloaded once on entry,
// circular-masked via android.graphics.Canvas, then cached as
// ImageBitmap so the renderer can blit them straight to the GPU.
package com.tabletopforge.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.tabletopforge.data.AppJson
import com.tabletopforge.data.Creature
import com.tabletopforge.services.SessionStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

// ────────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────────
@Composable
fun MinigameScreen(store: SessionStore, onClose: () -> Unit) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var players by remember { mutableStateOf<List<Pair<Creature, ImageBitmap>>>(emptyList()) }
    var enemyKinds by remember { mutableStateOf<List<EnemyKind>>(emptyList()) }
    var avatar by remember { mutableStateOf<ImageBitmap?>(null) }

    // Pull the creature list once on entry. Players become the
    // avatar grid, monsters become the enemy roster (capped at 8
    // textures so the GPU can batch).
    LaunchedEffect(store.baseUrl) {
        val base = store.baseUrl
        if (base == null) {
            error = "No server URL configured"; loading = false; return@LaunchedEffect
        }
        try {
            val raw = withContext(Dispatchers.IO) {
                val u = URL("$base/api/creatures")
                (u.openConnection() as HttpURLConnection).run {
                    connectTimeout = 8000; readTimeout = 8000
                    inputStream.bufferedReader().use { it.readText() }
                        .also { disconnect() }
                }
            }
            val all = AppJson.decodeFromString(ListSerializer(Creature.serializer()), raw)
            val playerCreatures = all.filter {
                (it.creature_type ?: "").lowercase() == "humanoid" && it.image_path != null
            }
            val monsterCreatures = all.filter {
                (it.creature_type ?: "").lowercase() != "humanoid" && it.image_path != null
            }.take(8)

            val playerPairs = playerCreatures.mapNotNull { c ->
                val bmp = loadBitmap("$base/uploads/${c.image_path}") ?: return@mapNotNull null
                c to bmp
            }
            val kinds = monsterCreatures.mapNotNull { c ->
                val bmp = loadBitmap("$base/uploads/${c.image_path}") ?: return@mapNotNull null
                EnemyKind(bmp, EnemySize.from(c.size), c.name ?: "—")
            }
            players = playerPairs
            enemyKinds = kinds
            if (kinds.isEmpty()) error = "No monsters in the server library."
        } catch (t: Throwable) {
            error = t.localizedMessage ?: "Failed to load creatures."
        }
        loading = false
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
    ) {
        val a = avatar
        if (a != null && enemyKinds.isNotEmpty()) {
            GameArena(avatar = a, enemyKinds = enemyKinds, modifier = Modifier.fillMaxSize())
        } else {
            AvatarPicker(
                loading = loading,
                error = error,
                players = players,
                onPick = { bmp -> avatar = bmp },
                modifier = Modifier.fillMaxSize(),
            )
        }
        // Persistent close. Top-right, palette colours so it reads
        // on both the picker and the in-game scene.
        IconButton(
            onClick = onClose,
            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = "Close minigame",
                tint = Color.White,
                modifier = Modifier.background(Color.Black.copy(alpha = 0.55f), CircleShape).padding(4.dp),
            )
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Avatar picker
// ────────────────────────────────────────────────────────────────
@Composable
private fun AvatarPicker(
    loading: Boolean,
    error: String?,
    players: List<Pair<Creature, ImageBitmap>>,
    onPick: (ImageBitmap) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(top = 36.dp, start = 18.dp, end = 18.dp, bottom = 18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "CHOOSE YOUR HERO",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            letterSpacing = 2.sp,
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            Text(error, color = Color.Red, fontSize = 12.sp)
        }
        if (loading) {
            CircularProgressIndicator(color = Color.White)
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(top = 12.dp, bottom = 12.dp),
        ) {
            items(players, key = { it.first.id }) { (c, bmp) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .pointerInput(c.id) {
                                detectTapGestures(onTap = { onPick(bmp) })
                            },
                    ) {
                        AsyncImage(
                            model = bmp,
                            contentDescription = c.name,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        c.name ?: "—",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Live game arena
// ────────────────────────────────────────────────────────────────
@Composable
private fun GameArena(
    avatar: ImageBitmap,
    enemyKinds: List<EnemyKind>,
    modifier: Modifier = Modifier,
) {
    val engine = remember { GameEngine(avatar = avatar, enemyKinds = enemyKinds) }
    // tick counter forces Compose to re-read engine state every frame.
    var tick by remember { mutableIntStateOf(0) }
    var canvasSize by remember { mutableStateOf(Size.Zero) }
    var lastNanos by remember { mutableStateOf(0L) }

    LaunchedEffect(canvasSize) {
        if (canvasSize == Size.Zero) return@LaunchedEffect
        engine.start(canvasSize)
        // Drive the loop. Compose's withFrameNanos is the recommended
        // 60-fps tick — pauses with the surface, no need for our own
        // SurfaceView / Choreographer wiring.
        while (true) {
            androidx.compose.runtime.withFrameNanos { now ->
                if (lastNanos == 0L) lastNanos = now
                val dt = ((now - lastNanos).coerceAtLeast(0L)) / 1_000_000_000f
                lastNanos = now
                engine.update(dt.coerceAtMost(0.05f), canvasSize)
                tick++
            }
        }
    }

    Box(
        modifier = modifier
            .background(Color(0xFF0B0E14))
            // Drag = move toward the drag direction. Anchor is the
            // initial down position, drag delta gives a unit vector
            // — same model as the iOS virtual joystick.
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset -> engine.onDragStart(offset) },
                    onDrag = { change, _ -> engine.onDrag(change.position) },
                    onDragEnd = { engine.onDragEnd() },
                    onDragCancel = { engine.onDragEnd() },
                )
            }
            // Tap-to-restart on game-over, tap-to-buy on shop is
            // handled inline by reading hit-testing in the engine.
            .pointerInput(Unit) {
                detectTapGestures(onTap = { offset -> engine.onTap(offset) })
            },
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            // Reading `tick` here makes Compose recompose the Canvas
            // every frame the engine ticks. No state-snapshot churn
            // for the 100+ entities the engine moves each frame.
            @Suppress("UNUSED_EXPRESSION") tick
            canvasSize = size
            engine.draw(this)
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Game engine
// ────────────────────────────────────────────────────────────────
private class GameEngine(
    private val avatar: ImageBitmap,
    private val enemyKinds: List<EnemyKind>,
) {
    // ── World ──
    private var width: Float = 0f
    private var height: Float = 0f
    private var didLayout = false

    // ── Player ──
    private var px = 0f; private var py = 0f
    private val playerRadius = 28f
    private var hp = 100
    private var maxHp = 100
    private var moveDx = 0f; private var moveDy = 0f
    private var dragAnchor: Offset? = null
    private var moveSpeedMul = 1f
    private var bonusEnemyDamageReduction = 0
    private var lifestealOnKill = 0

    // ── Score / wave ──
    private var score = 0
    private var wave = 1
    private var elapsed = 0f
    private var spawnInterval = 1.5f
    private var lastSpawn = 0f
    private var enemyBaseSpeed = 55f
    private var waveStart = 0f
    private val waveDuration = 20f
    private var paused = false
    private var gameOver = false

    // ── Combat state ──
    private val enemies = ArrayList<Enemy>(64)
    private val bullets = ArrayList<Bullet>(128)
    private val guns = ArrayList<Gun>(MAX_GUNS).apply { add(Gun(Weapon.ARCANE_BOLT)) }
    private var bulletDamage = 1
    private var bulletSpeed = 460f
    private var fireRateMul = 1f
    private var gunRotationPhase = 0f
    private val gunRotationRate = 0.4f

    // ── Shop overlay ──
    private var shop: Shop? = null
    // ── Replace-slot picker ──
    private var slotPicker: SlotPicker? = null

    fun start(size: Size) {
        if (didLayout) return
        width = size.width; height = size.height
        px = width / 2f; py = height / 2f
        didLayout = true
    }

    // ── Input ──
    fun onDragStart(at: Offset) {
        if (gameOver) return
        dragAnchor = at
        moveDx = 0f; moveDy = 0f
    }

    fun onDrag(at: Offset) {
        val anchor = dragAnchor ?: return
        val dx = at.x - anchor.x
        val dy = at.y - anchor.y
        val mag = hypot(dx, dy).coerceAtLeast(1f)
        // Same dead-zone-then-clamp as iOS: drag a few px before we
        // commit to a direction; cap to a unit vector so longer drags
        // don't go faster.
        if (mag < 12f) { moveDx = 0f; moveDy = 0f; return }
        val clamp = mag.coerceAtMost(60f) / 60f
        moveDx = (dx / mag) * clamp
        moveDy = (dy / mag) * clamp
    }

    fun onDragEnd() {
        dragAnchor = null
        moveDx = 0f; moveDy = 0f
    }

    fun onTap(at: Offset) {
        if (gameOver) { restart(); return }
        slotPicker?.let { sp ->
            sp.cards.forEachIndexed { i, c ->
                if (at.x in c.x..(c.x + c.w) && at.y in c.y..(c.y + c.h)) {
                    if (i == sp.cards.lastIndex) closeSlotPicker(refund = true)
                    else replaceGun(slot = i, weapon = sp.weapon, cost = sp.cost)
                }
            }
            return
        }
        shop?.let { s ->
            s.cards.forEachIndexed { i, c ->
                if (at.x in c.x..(c.x + c.w) && at.y in c.y..(c.y + c.h)) {
                    if (i == s.cards.lastIndex) { closeShop(); return }
                    val up = s.upgrades[i]
                    if (score < up.cost) return
                    buyUpgrade(up)
                }
            }
        }
    }

    // ── Tick ──
    fun update(dt: Float, size: Size) {
        if (!didLayout) return
        if (size.width != width || size.height != height) {
            // Letterbox-safe resize: keep player on-screen.
            width = size.width; height = size.height
            px = px.coerceIn(playerRadius, width - playerRadius)
            py = py.coerceIn(playerRadius, height - playerRadius)
        }
        if (gameOver || paused) return
        elapsed += dt
        if (waveStart == 0f) waveStart = elapsed
        gunRotationPhase += gunRotationRate * dt

        // ── Player movement ──
        val topSpeed = 200f * moveSpeedMul
        px = (px + moveDx * topSpeed * dt).coerceIn(playerRadius, width - playerRadius)
        py = (py + moveDy * topSpeed * dt).coerceIn(playerRadius, height - playerRadius)

        // ── Auto-shoot ──
        val tgt = nearestEnemy()
        if (tgt != null) {
            for (i in guns.indices) {
                val g = guns[i]
                val interval = 0.32f / (fireRateMul * g.weapon.nativeFireRateBoost)
                if (elapsed - g.lastFire > interval) {
                    val origin = gunWorldPosition(i)
                    fire(g.weapon, origin, Offset(tgt.x, tgt.y))
                    g.lastFire = elapsed
                }
            }
        }

        // ── Enemy movement + collision ──
        val it = enemies.iterator()
        while (it.hasNext()) {
            val e = it.next()
            val dx = px - e.x; val dy = py - e.y
            val d = hypot(dx, dy).coerceAtLeast(1f)
            val sp = enemyBaseSpeed * e.size.speedMultiplier
            e.x += (dx / d) * sp * dt
            e.y += (dy / d) * sp * dt
            if (d < playerRadius + e.radius) {
                val dmg = max(2, e.contactDamage - bonusEnemyDamageReduction)
                hp = max(0, hp - dmg)
                if (hp == 0) { triggerGameOver(); return }
                // Knock the offender away so we don't take 60 dmg/s
                // hugging an enemy.
                e.x += (e.x - px) * 0.6f
                e.y += (e.y - py) * 0.6f
            }
        }

        // ── Bullets ──
        val bit = bullets.iterator()
        while (bit.hasNext()) {
            val b = bit.next()
            b.x += b.vx * dt
            b.y += b.vy * dt
            b.life -= dt
            if (b.life <= 0 || b.x < -20 || b.x > width + 20 || b.y < -20 || b.y > height + 20) {
                bit.remove(); continue
            }
            // Bullet vs enemy. O(N*M) but N and M are small enough to
            // not matter at 60 fps with our caps; profile if it ever
            // does.
            var consumed = false
            for (e in enemies) {
                val ddx = b.x - e.x; val ddy = b.y - e.y
                if (ddx * ddx + ddy * ddy < (b.radius + e.radius) * (b.radius + e.radius)) {
                    e.hp -= b.damage
                    if (!b.pierces) { consumed = true }
                    if (e.hp <= 0) {
                        score += e.size.scoreReward
                        if (lifestealOnKill > 0) hp = min(maxHp, hp + lifestealOnKill)
                    }
                    break
                }
            }
            if (consumed) bit.remove()
        }
        // Drop dead enemies AFTER the bullet pass so we don't mutate
        // mid-loop.
        enemies.removeAll { it.hp <= 0 }

        // ── Spawn ──
        if (elapsed - lastSpawn > spawnInterval) {
            spawnEnemy()
            lastSpawn = elapsed
        }

        // ── Wave end ──
        if (elapsed - waveStart > waveDuration) {
            openShop()
        }
    }

    private fun nearestEnemy(): Enemy? {
        var best: Enemy? = null; var bd = Float.MAX_VALUE
        for (e in enemies) {
            val d = (e.x - px) * (e.x - px) + (e.y - py) * (e.y - py)
            if (d < bd) { bd = d; best = e }
        }
        return best
    }

    private fun gunWorldPosition(index: Int): Offset {
        val n = max(1, guns.size)
        val r = 42f
        val angle = (index.toFloat() / n.toFloat()) * 2f * Math.PI.toFloat() + gunRotationPhase
        return Offset(px + cos(angle) * r, py + sin(angle) * r)
    }

    private fun fire(w: Weapon, from: Offset, target: Offset) {
        val dx = target.x - from.x
        val dy = target.y - from.y
        val baseAngle = atan2(dy, dx)
        val n = w.bulletCount
        val spread = (w.spreadDegrees.toFloat()) * Math.PI.toFloat() / 180f
        for (i in 0 until n) {
            val t = if (n == 1) 0f else i.toFloat() / (n - 1).toFloat() - 0.5f
            val a = baseAngle + spread * t
            val sp = bulletSpeed * w.speedMultiplier
            bullets.add(
                Bullet(
                    x = from.x, y = from.y,
                    vx = cos(a) * sp, vy = sin(a) * sp,
                    radius = w.bulletRadius,
                    damage = w.bulletDamage * bulletDamage,
                    color = w.bulletColor,
                    pierces = w.pierces,
                    life = w.lifespan,
                )
            )
        }
    }

    private fun spawnEnemy() {
        if (enemyKinds.isEmpty()) return
        val maxTier = min(5, max(1, wave))
        val pool = enemyKinds.filter { it.size.tier <= maxTier }
        val kind = pool.randomOrNull()
            ?: enemyKinds.minByOrNull { it.size.tier } ?: return
        val e = Enemy(
            x = 0f, y = 0f,
            radius = kind.size.diameter / 2f,
            hp = kind.size.hp,
            size = kind.size,
            contactDamage = kind.size.contactDamage,
            texture = kind.texture,
        )
        when (Random.nextInt(4)) {
            0 -> { e.x = -30f; e.y = Random.nextFloat() * height }
            1 -> { e.x = width + 30f; e.y = Random.nextFloat() * height }
            2 -> { e.x = Random.nextFloat() * width; e.y = -30f }
            else -> { e.x = Random.nextFloat() * width; e.y = height + 30f }
        }
        enemies.add(e)
    }

    private fun triggerGameOver() { gameOver = true }

    private fun restart() {
        enemies.clear(); bullets.clear()
        guns.clear(); guns.add(Gun(Weapon.ARCANE_BOLT))
        hp = 100; maxHp = 100; score = 0; wave = 1
        spawnInterval = 1.5f; enemyBaseSpeed = 55f
        moveSpeedMul = 1f; fireRateMul = 1f; bulletDamage = 1; bulletSpeed = 460f
        lifestealOnKill = 0; bonusEnemyDamageReduction = 0
        elapsed = 0f; waveStart = 0f; lastSpawn = 0f
        gunRotationPhase = 0f
        gameOver = false; paused = false
        shop = null; slotPicker = null
        px = width / 2f; py = height / 2f
        moveDx = 0f; moveDy = 0f; dragAnchor = null
    }

    // ── Shop ──
    private fun openShop() {
        paused = true
        val equipped = guns.map { it.weapon }.toSet()
        val pool = Upgrades.draftPool(equipped)
        val draft = pool.shuffled().take(3)
        if (draft.isEmpty()) { paused = false; return }
        shop = Shop(draft)
    }

    private fun closeShop() {
        shop = null
        paused = false
        wave += 1
        spawnInterval = max(0.28f, spawnInterval * 0.92f)
        enemyBaseSpeed = min(180f, enemyBaseSpeed * 1.04f)
        waveStart = 0f
        // Heal a token amount each wave so a long run isn't strictly
        // a one-way HP slope.
        hp = min(maxHp, hp + 12)
    }

    private fun buyUpgrade(up: Upgrade) {
        val w = up.weaponUnlock
        if (w != null) {
            if (guns.size < MAX_GUNS) {
                guns.add(Gun(w))
                score -= up.cost
            } else {
                // Pop the slot picker — only deduct cost if the
                // player commits to a slot.
                slotPicker = SlotPicker(weapon = w, cost = up.cost,
                    cards = listOf())
            }
            return
        }
        score -= up.cost
        up.apply(this)
    }

    private fun replaceGun(slot: Int, weapon: Weapon, cost: Int) {
        if (slot in guns.indices) guns[slot] = Gun(weapon)
        score -= cost
        slotPicker = null
    }

    private fun closeSlotPicker(refund: Boolean) {
        slotPicker = null
    }

    // ── Upgrade hooks (called from Upgrade.apply) ──
    fun applyMoveSpeedBoost(m: Float)        { moveSpeedMul *= (1f + m) }
    fun applyMaxHpBoost(amt: Int, full: Boolean) {
        maxHp += amt
        hp = if (full) maxHp else min(maxHp, hp + amt)
    }
    fun applyBulletDamageBoost(amt: Int)     { bulletDamage += amt }
    fun applyBulletSpeedBoost(m: Float)      { bulletSpeed *= (1f + m) }
    fun applyFireRateBoost(m: Float)         { fireRateMul *= (1f + m) }
    fun applyDamageReduction(amt: Int)       { bonusEnemyDamageReduction += amt }
    fun applyLifesteal(amt: Int)             { lifestealOnKill += amt }

    // ────────────────────────────────────────────────────────────
    // Rendering
    // ────────────────────────────────────────────────────────────
    fun draw(scope: DrawScope) {
        with(scope) {
            // Background grid — subtle dotted look so the arena
            // doesn't feel like a black void.
            val cell = 60f
            var x = 0f
            while (x < size.width) {
                drawLine(
                    color = Color.White.copy(alpha = 0.04f),
                    start = Offset(x, 0f), end = Offset(x, size.height),
                    strokeWidth = 1f,
                )
                x += cell
            }
            var y = 0f
            while (y < size.height) {
                drawLine(
                    color = Color.White.copy(alpha = 0.04f),
                    start = Offset(0f, y), end = Offset(size.width, y),
                    strokeWidth = 1f,
                )
                y += cell
            }

            // Enemies.
            for (e in enemies) {
                drawCircleBitmap(e.texture, Offset(e.x, e.y), e.radius)
            }

            // Bullets.
            for (b in bullets) {
                drawCircle(color = b.color, radius = b.radius, center = Offset(b.x, b.y))
                drawCircle(
                    color = Color.White.copy(alpha = 0.7f),
                    radius = b.radius, center = Offset(b.x, b.y),
                    style = Stroke(width = 0.8f),
                )
            }

            // Player.
            drawCircleBitmap(avatar, Offset(px, py), playerRadius)

            // Orbital gun ring — small dot per gun, colour-coded.
            for (i in guns.indices) {
                val gp = gunWorldPosition(i)
                drawCircle(
                    color = guns[i].weapon.bulletColor,
                    radius = 6f, center = gp,
                )
                drawCircle(
                    color = Color.White,
                    radius = 6f, center = gp,
                    style = Stroke(width = 1f),
                )
            }

            // ── HUD: bottom-center HP bar + caption ──
            val barW = 260f; val barH = 18f
            val cx = size.width / 2f; val by = size.height - 70f
            // Trough.
            drawRect(
                color = Color(0xEE0A0B10),
                topLeft = Offset(cx - barW / 2f - 3f, by - barH / 2f - 3f),
                size = Size(barW + 6f, barH + 6f),
            )
            val pct = (hp.toFloat() / maxHp.toFloat()).coerceIn(0f, 1f)
            val fillColor = when {
                pct > 0.6f -> Color(0xFF5CDF6A)
                pct > 0.3f -> Color(0xFFF3B84D)
                else -> Color(0xFFEC4D52)
            }
            drawRect(
                color = fillColor,
                topLeft = Offset(cx - barW / 2f, by - barH / 2f),
                size = Size(barW * pct, barH),
            )
            drawNativeText("$hp / $maxHp", cx, by + 4f, 14f, Color.White, centered = true)
            val gunNames = if (guns.isEmpty()) "—" else guns.joinToString(" + ") { it.weapon.shortName }
            drawNativeText(
                "WAVE $wave   ·   SCORE $score   ·   $gunNames",
                cx, by - barH / 2f - 14f,
                12f, Color.White, centered = true,
            )

            // ── Shop overlay ──
            shop?.let { drawShop(it) }
            slotPicker?.let { drawSlotPicker(it) }

            // ── Game over ──
            if (gameOver) drawGameOver()
        }
    }

    private fun DrawScope.drawCircleBitmap(bmp: ImageBitmap, center: Offset, radius: Float) {
        // Bitmaps come in pre-circular-masked, so a plain bitmap
        // draw is enough — but we still clip to a circle in case
        // the source had transparent pixels outside the mask.
        val src = androidx.compose.ui.unit.IntOffset(0, 0)
        val srcSize = androidx.compose.ui.unit.IntSize(bmp.width, bmp.height)
        val dstTopLeft = androidx.compose.ui.unit.IntOffset(
            (center.x - radius).toInt(), (center.y - radius).toInt(),
        )
        val dstSize = androidx.compose.ui.unit.IntSize(
            (radius * 2f).toInt(), (radius * 2f).toInt(),
        )
        drawImage(
            image = bmp,
            srcOffset = src, srcSize = srcSize,
            dstOffset = dstTopLeft, dstSize = dstSize,
        )
    }

    private fun DrawScope.drawNativeText(
        text: String, cx: Float, cy: Float, sizePx: Float, color: Color, centered: Boolean,
    ) {
        // Compose's DrawScope doesn't have a high-level text helper,
        // but we can drop into the platform Canvas for the score /
        // HUD text. Native Paint is faster than TextLayoutResult for
        // tiny per-frame strings.
        val p = Paint().apply {
            this.color = color.toArgb()
            this.textSize = sizePx
            this.isAntiAlias = true
            this.textAlign = if (centered) Paint.Align.CENTER else Paint.Align.LEFT
            this.typeface = android.graphics.Typeface.MONOSPACE
        }
        drawContext.canvas.nativeCanvas.drawText(text, cx, cy + sizePx / 3f, p)
    }

    // ── Shop draw + hit boxes ──
    private fun DrawScope.drawShop(s: Shop) {
        // Dim the arena.
        drawRect(color = Color.Black.copy(alpha = 0.55f), size = size)
        drawNativeText(
            "WAVE ${wave - 0} CLEARED",
            size.width / 2f, 80f, 22f, Color(0xFFF6CD4A), centered = true,
        )
        drawNativeText(
            "Score: $score",
            size.width / 2f, 110f, 16f, Color.White, centered = true,
        )
        // Cards laid out vertically. Compose dialogs don't compose
        // well with our Canvas-driven rendering, so we draw + tap-
        // test our own.
        val cardW = (size.width - 60f).coerceAtMost(420f)
        val cardH = 96f
        val gap = 12f
        val totalH = (s.upgrades.size + 1) * cardH + s.upgrades.size * gap
        var top = (size.height - totalH) / 2f
        val cards = ArrayList<Rect2>(s.upgrades.size + 1)
        for ((i, up) in s.upgrades.withIndex()) {
            val left = (size.width - cardW) / 2f
            val canAfford = score >= up.cost
            val bg = if (canAfford) Color(0xFF1B2030) else Color(0xFF1A1A1A)
            drawRect(
                color = bg,
                topLeft = Offset(left, top),
                size = Size(cardW, cardH),
            )
            drawRect(
                color = Color.White.copy(alpha = if (canAfford) 0.4f else 0.15f),
                topLeft = Offset(left, top),
                size = Size(cardW, cardH),
                style = Stroke(width = 1f),
            )
            drawNativeText(
                up.name, left + 12f, top + 22f, 16f,
                if (canAfford) Color(0xFFF6CD4A) else Color.Gray, centered = false,
            )
            drawNativeText(
                up.desc, left + 12f, top + 44f, 12f,
                Color.White.copy(alpha = if (canAfford) 0.85f else 0.4f), centered = false,
            )
            drawNativeText(
                "Cost ${up.cost}", left + 12f, top + 76f, 13f,
                if (canAfford) Color(0xFF8AD79A) else Color(0xFFE36767), centered = false,
            )
            cards += Rect2(left, top, cardW, cardH)
            top += cardH + gap
        }
        // Skip card.
        val left = (size.width - cardW) / 2f
        drawRect(color = Color(0xFF222222), topLeft = Offset(left, top), size = Size(cardW, cardH))
        drawRect(color = Color.White.copy(alpha = 0.2f), topLeft = Offset(left, top),
                 size = Size(cardW, cardH), style = Stroke(1f))
        drawNativeText("Skip wave", size.width / 2f, top + cardH / 2f, 16f, Color.White, centered = true)
        cards += Rect2(left, top, cardW, cardH)
        s.cards = cards
    }

    private fun DrawScope.drawSlotPicker(sp: SlotPicker) {
        drawRect(color = Color.Black.copy(alpha = 0.7f), size = size)
        drawNativeText(
            "REPLACE A WEAPON",
            size.width / 2f, 80f, 20f, Color(0xFFF6CD4A), centered = true,
        )
        drawNativeText(
            "New: ${sp.weapon.displayName}",
            size.width / 2f, 110f, 14f, Color.White, centered = true,
        )
        val cardW = (size.width - 60f).coerceAtMost(420f)
        val cardH = 80f
        val gap = 12f
        val cards = ArrayList<Rect2>(guns.size + 1)
        var top = (size.height - ((guns.size + 1) * cardH + guns.size * gap)) / 2f
        for ((i, g) in guns.withIndex()) {
            val left = (size.width - cardW) / 2f
            drawRect(color = Color(0xFF1B2030), topLeft = Offset(left, top), size = Size(cardW, cardH))
            drawRect(color = Color.White.copy(alpha = 0.35f), topLeft = Offset(left, top),
                     size = Size(cardW, cardH), style = Stroke(1f))
            drawNativeText(
                "Slot ${i + 1}: ${g.weapon.displayName}",
                left + 12f, top + 30f, 15f, Color.White, centered = false,
            )
            drawNativeText(
                "→ ${sp.weapon.displayName}",
                left + 12f, top + 56f, 13f, Color(0xFF8AD79A), centered = false,
            )
            cards += Rect2(left, top, cardW, cardH)
            top += cardH + gap
        }
        val left = (size.width - cardW) / 2f
        drawRect(color = Color(0xFF222222), topLeft = Offset(left, top), size = Size(cardW, cardH))
        drawRect(color = Color.White.copy(alpha = 0.2f), topLeft = Offset(left, top),
                 size = Size(cardW, cardH), style = Stroke(1f))
        drawNativeText("Cancel", size.width / 2f, top + cardH / 2f, 16f, Color.White, centered = true)
        cards += Rect2(left, top, cardW, cardH)
        sp.cards = cards
    }

    private fun DrawScope.drawGameOver() {
        drawRect(color = Color.Black.copy(alpha = 0.7f), size = size)
        drawNativeText("YOU DIED", size.width / 2f, size.height / 2f - 12f,
                       30f, Color(0xFFEC4D52), centered = true)
        drawNativeText(
            "Score $score · Wave $wave · tap to retry",
            size.width / 2f, size.height / 2f + 14f, 14f,
            Color.White.copy(alpha = 0.9f), centered = true,
        )
    }
}

// ────────────────────────────────────────────────────────────────
// Data types
// ────────────────────────────────────────────────────────────────
private const val MAX_GUNS = 3

private enum class EnemySize {
    TINY, SMALL, MEDIUM, LARGE, HUGE, GARGANTUAN;

    companion object {
        fun from(raw: String?): EnemySize = when ((raw ?: "").lowercase()) {
            "tiny" -> TINY
            "small" -> SMALL
            "large" -> LARGE
            "huge" -> HUGE
            "gargantuan" -> GARGANTUAN
            else -> MEDIUM
        }
    }

    val tier: Int get() = ordinal
    val diameter: Float get() = when (this) {
        TINY -> 26f; SMALL -> 36f; MEDIUM -> 48f
        LARGE -> 64f; HUGE -> 84f; GARGANTUAN -> 110f
    }
    val speedMultiplier: Float get() = when (this) {
        TINY -> 1.7f; SMALL -> 1.35f; MEDIUM -> 1.0f
        LARGE -> 0.78f; HUGE -> 0.6f; GARGANTUAN -> 0.45f
    }
    val hp: Int get() = when (this) {
        TINY -> 1; SMALL -> 2; MEDIUM -> 3
        LARGE -> 6; HUGE -> 10; GARGANTUAN -> 16
    }
    val contactDamage: Int get() = when (this) {
        TINY -> 6; SMALL -> 9; MEDIUM -> 13
        LARGE -> 20; HUGE -> 28; GARGANTUAN -> 38
    }
    val scoreReward: Int get() = when (this) {
        TINY -> 4; SMALL -> 7; MEDIUM -> 11
        LARGE -> 20; HUGE -> 34; GARGANTUAN -> 55
    }
}

private data class EnemyKind(
    val texture: ImageBitmap,
    val size: EnemySize,
    val displayName: String,
)

private class Enemy(
    var x: Float, var y: Float,
    val radius: Float,
    var hp: Int,
    val size: EnemySize,
    val contactDamage: Int,
    val texture: ImageBitmap,
)

private class Bullet(
    var x: Float, var y: Float,
    val vx: Float, val vy: Float,
    val radius: Float,
    val damage: Int,
    val color: Color,
    val pierces: Boolean,
    var life: Float,
)

private class Gun(val weapon: Weapon, var lastFire: Float = 0f)

private enum class Weapon {
    ARCANE_BOLT, TWIN_BLADES, FROST_LANCE, HOLY_TRINITY,
    SHADOWSTRIKE, DRAGONS_BREATH, STORMCALLER;

    val displayName: String get() = when (this) {
        ARCANE_BOLT -> "Arcane Bolt"; TWIN_BLADES -> "Twin Blades"
        FROST_LANCE -> "Frost Lance"; HOLY_TRINITY -> "Holy Trinity"
        SHADOWSTRIKE -> "Shadowstrike"; DRAGONS_BREATH -> "Dragon's Breath"
        STORMCALLER -> "Stormcaller"
    }
    val shortName: String get() = when (this) {
        ARCANE_BOLT -> "Bolt"; TWIN_BLADES -> "Twin"
        FROST_LANCE -> "Lance"; HOLY_TRINITY -> "Trinity"
        SHADOWSTRIKE -> "Shadow"; DRAGONS_BREATH -> "Breath"
        STORMCALLER -> "Storm"
    }
    val bulletCount: Int get() = when (this) {
        ARCANE_BOLT, FROST_LANCE, SHADOWSTRIKE, STORMCALLER -> 1
        TWIN_BLADES -> 2; HOLY_TRINITY, DRAGONS_BREATH -> 3
    }
    val spreadDegrees: Double get() = when (this) {
        ARCANE_BOLT, FROST_LANCE, SHADOWSTRIKE, STORMCALLER -> 0.0
        TWIN_BLADES -> 16.0; HOLY_TRINITY -> 26.0; DRAGONS_BREATH -> 14.0
    }
    val bulletDamage: Int get() = when (this) {
        FROST_LANCE -> 2; STORMCALLER -> 3; else -> 1
    }
    val bulletRadius: Float get() = when (this) {
        FROST_LANCE -> 5f; STORMCALLER -> 6f; DRAGONS_BREATH -> 3f; else -> 4f
    }
    val bulletColor: Color get() = when (this) {
        ARCANE_BOLT -> Color(0xFFFFDB4D)
        TWIN_BLADES -> Color(0xFFD9D9F2)
        FROST_LANCE -> Color(0xFF8CD9FF)
        HOLY_TRINITY -> Color(0xFFFFFFA6)
        SHADOWSTRIKE -> Color(0xFFA666F2)
        DRAGONS_BREATH -> Color(0xFFFF8033)
        STORMCALLER -> Color(0xFF8CD9FF)
    }
    val pierces: Boolean get() = this == FROST_LANCE
    val lifespan: Float get() = when (this) {
        FROST_LANCE -> 2.0f; SHADOWSTRIKE -> 1.2f; else -> 1.5f
    }
    val speedMultiplier: Float get() = when (this) {
        SHADOWSTRIKE -> 1.5f; STORMCALLER -> 1.7f; DRAGONS_BREATH -> 1.2f; else -> 1f
    }
    val nativeFireRateBoost: Float get() = when (this) {
        SHADOWSTRIKE -> 1.6f; DRAGONS_BREATH -> 1.4f; STORMCALLER -> 0.65f; else -> 1f
    }
}

private data class Upgrade(
    val id: String,
    val name: String,
    val desc: String,
    val cost: Int,
    val weaponUnlock: Weapon?,
    val apply: (GameEngine) -> Unit,
)

private object Upgrades {
    val pool: List<Upgrade> = listOf(
        Upgrade("swift_boots", "Swift Boots", "+25 % movement speed.", 140, null) { it.applyMoveSpeedBoost(0.25f) },
        Upgrade("chain_mail", "Chain Mail", "+30 max HP, full heal.", 200, null) { it.applyMaxHpBoost(30, true) },
        Upgrade("sharpshooter", "Sharpshooter", "+1 bullet damage on every gun.", 280, null) { it.applyBulletDamageBoost(1) },
        Upgrade("fleet_arrows", "Fleet Arrows", "+30 % bullet speed.", 140, null) { it.applyBulletSpeedBoost(0.3f) },
        Upgrade("quickdraw", "Quickdraw", "+25 % fire rate on every gun.", 230, null) { it.applyFireRateBoost(0.25f) },
        Upgrade("battle_hardened", "Battle Hardened", "Take 3 less damage from each hit.", 200, null) { it.applyDamageReduction(3) },
        Upgrade("vampiric", "Vampiric Aura", "Heal 1 HP for every kill.", 340, null) { it.applyLifesteal(1) },
        Upgrade("weapon_twin", "Twin Blades", "Adds a gun firing a 2-bullet 16° spread.", 280, Weapon.TWIN_BLADES) {},
        Upgrade("weapon_frost", "Frost Lance", "Adds a gun whose bullets pierce. 2 damage.", 380, Weapon.FROST_LANCE) {},
        Upgrade("weapon_trinity", "Holy Trinity", "Adds a gun firing a 3-bullet 26° spread.", 340, Weapon.HOLY_TRINITY) {},
        Upgrade("weapon_shadow", "Shadowstrike", "Adds a fast gun. 1.5× speed, 1.6× fire rate.", 420, Weapon.SHADOWSTRIKE) {},
        Upgrade("weapon_breath", "Dragon's Breath", "Adds a 3-bullet cone gun, 1.4× fire rate.", 460, Weapon.DRAGONS_BREATH) {},
        Upgrade("weapon_storm", "Stormcaller", "Adds a heavy gun. 3 damage, 0.65× cadence.", 520, Weapon.STORMCALLER) {},
    )

    fun draftPool(equippedWeapons: Set<Weapon>): List<Upgrade> = pool.filter {
        val w = it.weaponUnlock ?: return@filter true
        w !in equippedWeapons
    }
}

private class Shop(val upgrades: List<Upgrade>) {
    var cards: List<Rect2> = emptyList()
}

private class SlotPicker(
    val weapon: Weapon,
    val cost: Int,
    var cards: List<Rect2>,
)

private class Rect2(val x: Float, val y: Float, val w: Float, val h: Float)

// ────────────────────────────────────────────────────────────────
// Bitmap fetch + circular masking
// ────────────────────────────────────────────────────────────────
private suspend fun loadBitmap(url: String): ImageBitmap? = withContext(Dispatchers.IO) {
    runCatching {
        val u = URL(url)
        val bytes = (u.openConnection() as HttpURLConnection).run {
            connectTimeout = 8000; readTimeout = 8000
            inputStream.use { it.readBytes() }.also { disconnect() }
        }
        val src = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return@runCatching null
        roundedSquare(src, 256).asImageBitmap()
    }.getOrNull()
}

/** Circular-mask the source so the renderer doesn't need to clip
 * every frame. Cover-fit so a wide source still fills the disk. */
private fun roundedSquare(src: Bitmap, side: Int): Bitmap {
    val out = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(out)
    val path = Path().apply { addCircle(side / 2f, side / 2f, side / 2f, Path.Direction.CW) }
    canvas.save()
    canvas.clipPath(path)
    val scale = max(side.toFloat() / src.width, side.toFloat() / src.height)
    val drawW = src.width * scale
    val drawH = src.height * scale
    val dx = (side - drawW) / 2f; val dy = (side - drawH) / 2f
    val rect = RectF(dx, dy, dx + drawW, dy + drawH)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    canvas.drawBitmap(src, null, rect, paint)
    canvas.restore()
    return out
}

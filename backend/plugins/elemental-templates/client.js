// Elemental Templates — example plugin shipped with TableTop Forge.
//
// Demonstrates the plugin contract:
//   - imports nothing; uses the React + ReactKonva instances handed to us
//     by the host so hooks and contexts stay compatible
//   - extends two registries: spellTemplateDecorators and
//     templateEditorExtensions
//   - persists state via the host's plugin_data KV API, scoped to this
//     plugin's id (data survives disable + uninstall by design)
//
// Each spell template can be tagged with one of five elements (or "none").
// While a template has an element set, an animated overlay is rendered on
// top of the base shape — fire flickers orange-red, water (deliberately
// mimicking the existing Water Zone style) ripples cyan, ice shimmers
// white-blue, lightning forks yellow, and void swirls purple.
//
// The animations are intentionally lightweight: a few translucent shapes
// with sin/cos-driven properties. They look decorative without burning
// CPU on slower machines.

const PLUGIN_ID = 'elemental-templates';
const KEY_PREFIX = 'tmpl_';   // plugin_data key = `tmpl_<templateId>`

// In-memory cache of templateId → element. Hydrated once per plugin load
// from /api/plugins/<id>/data. Decorator looks up elements synchronously;
// editor writes update both the cache and the backing store, then bump
// the registry to force a re-render across the app.
const elementCache = new Map();
let cacheReady = false;

// Subscribers for cache changes — used by both the decorator (to know when
// a template's element changed) and the editor extension (to reflect the
// chosen element in the select). Local subs handle live React components
// the plugin owns; `hostNotify` (set in register) re-runs the host's
// TemplateShapeWithDecorators so a decorator that previously returned
// null (cache not yet hydrated, or element was 'none') gets re-invoked
// and produces an overlay this time.
const subs = new Set();
let hostNotify = () => {};
function notify() {
  for (const fn of subs) fn();
  try { hostNotify(); } catch {}
}

const DEFAULT_PALETTE = {
  fire:      { stroke: 'rgba(248,113,40,0.95)',  glow: 'rgba(255,140,30,0.45)',   tone: 'rgba(254,202,87,0.55)' },
  water:     { stroke: 'rgba(6,182,212,0.85)',   glow: 'rgba(14,116,144,0.45)',   tone: 'rgba(103,232,249,0.7)' },
  ice:       { stroke: 'rgba(186,230,253,0.95)', glow: 'rgba(147,197,253,0.45)',  tone: 'rgba(255,255,255,0.7)' },
  lightning: { stroke: 'rgba(250,204,21,0.95)',  glow: 'rgba(253,224,71,0.45)',   tone: 'rgba(255,247,150,0.85)' },
  void:      { stroke: 'rgba(168,85,247,0.95)',  glow: 'rgba(126,34,206,0.5)',    tone: 'rgba(216,180,254,0.7)' },
  acid:      { stroke: 'rgba(132,204,22,0.95)',  glow: 'rgba(101,163,13,0.45)',   tone: 'rgba(217,249,157,0.85)' },
};

const ELEMENT_LABELS = {
  none: 'None',
  fire: '🔥 Fire',
  water: '💧 Water',
  ice: '❄ Ice',
  lightning: '⚡ Lightning',
  void: '🟣 Void',
  acid: '🧪 Acid / Poison',
};

// Helper — derive bounds for an arbitrary template shape so we can sprinkle
// effect particles inside it. Falls back to a small bbox at the anchor.
//
// v1.1.0 change for lines: cx/cy is now the LINE'S START POINT (not its
// midpoint), so any element that just uses b.cx/b.cy as its anchor
// naturally emits from the start of the line — which is what a 5e
// line spell visually wants (the caster is at the start). Element
// renderers that benefit from directional info also get a `lineSource`
// object below alongside the existing `cone` derivation.
function boundsForBaseProps(p) {
  if (!p) return { cx: 0, cy: 0, rx: 24, ry: 24 };
  if (p.kind === 'circle') return { cx: p.x, cy: p.y, rx: p.radius, ry: p.radius };
  if (p.kind === 'rect')   return { cx: p.x + p.width / 2, cy: p.y + p.height / 2, rx: p.width / 2, ry: p.height / 2 };
  if (p.kind === 'wedge')  return { cx: p.x, cy: p.y, rx: p.radius, ry: p.radius };
  if (p.kind === 'line') {
    // Host now ships ax/ay/bx/by/length/widthPx as canonical fields,
    // with `points` kept for backwards compat with older deploys.
    const ax = (p.ax != null) ? p.ax : (p.points?.[0] || 0);
    const ay = (p.ay != null) ? p.ay : (p.points?.[1] || 0);
    const bx = (p.bx != null) ? p.bx : (p.points?.[2] || 0);
    const by = (p.by != null) ? p.by : (p.points?.[3] || 0);
    const length = (p.length != null) ? p.length : Math.hypot(bx - ax, by - ay);
    const halfWidth = Math.max(4, ((p.widthPx != null) ? p.widthPx : 16) / 2);
    return { cx: ax, cy: ay, rx: Math.max(length, 8), ry: halfWidth };
  }
  return { cx: 0, cy: 0, rx: 24, ry: 24 };
}

// Build directional info for a line template — the analogue of `cone`
// for radial wedges. Element renderers use this to flow effects from
// the start point (ax, ay) along the line axis, instead of treating
// the line as a centred bbox.
function lineSourceFor(baseProps) {
  if (!baseProps || baseProps.kind !== 'line') return null;
  const ax = (baseProps.ax != null) ? baseProps.ax : (baseProps.points?.[0] || 0);
  const ay = (baseProps.ay != null) ? baseProps.ay : (baseProps.points?.[1] || 0);
  const bx = (baseProps.bx != null) ? baseProps.bx : (baseProps.points?.[2] || 0);
  const by = (baseProps.by != null) ? baseProps.by : (baseProps.points?.[3] || 0);
  const dx = bx - ax, dy = by - ay;
  const length = Math.hypot(dx, dy);
  if (length < 1e-3) return null;
  const dirX = dx / length, dirY = dy / length;
  const halfWidth = Math.max(4, ((baseProps.widthPx != null) ? baseProps.widthPx : 16) / 2);
  return {
    startX: ax, startY: ay,
    endX: bx, endY: by,
    dirX, dirY,
    length, halfWidth,
    angleRad: Math.atan2(dy, dx),
  };
}

export default {
  register({ React, ReactKonva, registries, context }) {
    const { Group, Circle, Line, Rect, Wedge } = ReactKonva;
    const { data, notifyChange, subscribe } = context;
    // Latch the host bumper so the module-level notify() can fire it.
    if (typeof notifyChange === 'function') hostNotify = notifyChange;

    // Mirror the element cache into the host's templateOverlays registry.
    // Only 'water' is reflected — that's the kind the host actually
    // post-processes natively. Everything else is rendered by our Konva
    // decorator below as before.
    function syncOverlays() {
      const overlays = registries.templateOverlays;
      // Drop entries owned by us before re-adding so disabled / removed
      // tags clean up properly.
      for (const [k, v] of Array.from(overlays.entries())) {
        if (v && v.pluginId === PLUGIN_ID) overlays.delete(k);
      }
      for (const [tid, el] of elementCache.entries()) {
        if (el === 'water') overlays.set(tid, { kind: 'water', pluginId: PLUGIN_ID });
      }
    }

    // Cross-client sync: when ANY client (including ourselves) writes an
    // element via data.write/delete, the host relays a `plugin_event`
    // through the socket. We subscribe so a player's view picks up DM
    // changes — which is the whole point of being able to "modify things
    // for both the DM and the players" from a plugin.
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload || !payload.key) return;
        const key = String(payload.key);
        if (!key.startsWith(KEY_PREFIX)) return;
        const tid = key.slice(KEY_PREFIX.length);
        if (payload.op === 'delete') {
          elementCache.delete(tid);
        } else if (payload.op === 'write') {
          const v = payload.value;
          elementCache.set(tid, (v && v.element) || v);
        }
        syncOverlays();
        notify();
      });
    }

    // Hydrate the cache once per plugin load. Errors are non-fatal — the
    // plugin still works, just every template starts at "none" until the
    // user sets one.
    if (!cacheReady) {
      cacheReady = true;
      data.readPrefix(KEY_PREFIX).then(rows => {
        for (const row of rows) {
          const id = String(row.key || '').slice(KEY_PREFIX.length);
          if (id) elementCache.set(id, row.value && row.value.element || row.value);
        }
        syncOverlays();
        notify();
      }).catch(() => {});
    } else {
      // If register() runs again (live reload after enable), make sure
      // the overlay registry reflects whatever we have cached locally.
      syncOverlays();
    }

    // ── Animated overlay component ─────────────────────────────────────
    // Re-renders ~30 fps via requestAnimationFrame for smooth motion.
    // Returns a Group anchored to the template's existing geometry.
    function ElementalOverlay({ template, baseProps, element }) {
      const [tick, setTick] = React.useState(0);
      const startRef = React.useRef(performance.now());
      React.useEffect(() => {
        let raf, last = 0;
        const loop = (now) => {
          // Cap to ~30fps — looks fine, halves the cost.
          if (now - last >= 33) { setTick(t => (t + 1) | 0); last = now; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
      }, []);
      // Subscribe to cache notifies so a live element change updates this
      // overlay without unmounting (would lose the RAF clock otherwise).
      React.useEffect(() => {
        const fn = () => setTick(t => (t + 1) | 0);
        subs.add(fn);
        return () => subs.delete(fn);
      }, []);

      const elapsed = (performance.now() - startRef.current) / 1000;
      const palette = DEFAULT_PALETTE[element] || DEFAULT_PALETTE.fire;
      const b = boundsForBaseProps(baseProps);
      // Number of particles scales with shape area, but capped — we don't
      // want a giant 60ft circle to produce hundreds of nodes.
      const area = b.rx * b.ry;
      const particleCount = Math.max(4, Math.min(14, Math.floor(area / 1500)));

      // Cone (wedge) detection. When non-null, effects anchor at the apex
      // (b.cx/b.cy already equal the apex for wedges) and constrain their
      // angular spread to (startRad, startRad + spanRad) so particles
      // never leak outside the visible cone arc.
      const cone = baseProps?.kind === 'wedge'
        ? {
            startRad: (baseProps.rotation || 0) * Math.PI / 180,
            spanRad:  (baseProps.angle    || 60) * Math.PI / 180,
            radius:   baseProps.radius,
            apexX:    baseProps.x,
            apexY:    baseProps.y,
          }
        : null;

      // Line-source detection (v1.1.0). The host now renders line
      // templates as a 1ft-wide rotated rectangle; b.cx/b.cy already
      // points at the line's start, but renderers that want directional
      // flow (fire travelling along the line, lightning forking from
      // start to tip, etc.) use lineSource to know which way to push.
      const lineSource = lineSourceFor(baseProps);

      // Element-specific renderings. Each returns an array of Konva nodes
      // already laid out inside the template's bounds.
      const nodes = [];
      const t = elapsed; // shorthand

      if (element === 'fire') {
        // Fire body — built from many large, soft particles with additive
        // blending (`globalCompositeOperation: 'lighter'`) so overlapping
        // embers brighten where they meet instead of looking like discrete
        // dots. Combined with a radial-gradient fill per particle, the
        // mass reads as a single glowing flame instead of a particle field.
        const minRad = cone ? cone.radius
                       : lineSource ? lineSource.length
                       : Math.max(b.rx, b.ry);
        // Twice as many particles as before, scaled by area so big templates
        // don't look sparse.
        const flameCount = Math.max(20, Math.min(60, Math.floor(area / 350)));

        // Anchor and base-glow position. For cones, the apex (b.cx/b.cy)
        // is the SOURCE — the warm body sits half-way down the centerline
        // so it visually fills the cone instead of overflowing behind it.
        // For lines, the source is the start point and the body extends
        // along the line axis.
        const glowCx = cone       ? b.cx + Math.cos(cone.startRad + cone.spanRad / 2) * cone.radius * 0.5
                       : lineSource ? lineSource.startX + lineSource.dirX * lineSource.length * 0.5
                       : b.cx;
        const glowCy = cone       ? b.cy + Math.sin(cone.startRad + cone.spanRad / 2) * cone.radius * 0.5
                       : lineSource ? lineSource.startY + lineSource.dirY * lineSource.length * 0.5
                       : b.cy;
        const glowR  = cone       ? cone.radius * 0.55
                       : lineSource ? Math.max(lineSource.halfWidth * 4, lineSource.length * 0.18)
                       : minRad * 0.95;

        nodes.push(React.createElement(Circle, {
          key: 'glow-base',
          x: glowCx, y: glowCy, radius: glowR,
          fillRadialGradientStartPoint: { x: 0, y: 0 },
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint: { x: 0, y: 0 },
          fillRadialGradientEndRadius: glowR,
          fillRadialGradientColorStops: [
            0,    'rgba(255,200,80,0.55)',
            0.4,  'rgba(248,113,40,0.35)',
            0.75, 'rgba(180,40,10,0.18)',
            1,    'rgba(180,40,10,0)',
          ],
          globalCompositeOperation: 'lighter',
          listening: false,
        }));

        for (let i = 0; i < flameCount; i++) {
          const phase = (i / flameCount);
          const life = ((t * 0.45 + phase) % 1);            // 0..1 each cycle
          let px, py;
          if (cone) {
            // Stable angular slot inside the cone arc + small wobble so
            // embers don't form straight radial lines from the apex.
            const slot = ((i * 0.61803398) % 1);              // golden ratio spread
            const wobble = Math.sin(t * 0.7 + i * 1.3) * 0.04;
            const ang = cone.startRad + Math.max(0, Math.min(1, slot + wobble)) * cone.spanRad;
            const reach = 1.0 * life;
            px = b.cx + Math.cos(ang) * cone.radius * reach;
            py = b.cy + Math.sin(ang) * cone.radius * reach;
          } else if (lineSource) {
            // Embers travel from the start point along the line, with a
            // small perpendicular wobble that grows with distance so the
            // flame visibly widens past the 1ft template silhouette.
            const along = life * lineSource.length;
            const wobble = (Math.sin(t * 1.4 + i * 1.7) + Math.sin(t * 0.6 + i * 0.4)) * 0.5;
            const taper = lineSource.halfWidth + Math.min(lineSource.length * 0.12, 14) * life;
            const perp = wobble * taper;
            const nx = -lineSource.dirY, ny = lineSource.dirX;   // perpendicular
            px = lineSource.startX + lineSource.dirX * along + nx * perp;
            py = lineSource.startY + lineSource.dirY * along + ny * perp;
          } else {
            const ang = (i * 2.39994) + t * 0.18;
            const reach = 1.05 * life;
            const radial = Math.max(b.rx, b.ry);
            px = b.cx + Math.cos(ang) * radial * reach;
            py = b.cy + Math.sin(ang) * radial * reach;
          }
          // Larger particles overall; biggest at birth, shrinking as they
          // travel outward but staying meaty enough to overlap heavily.
          const size = (1 - life) * (minRad * 0.22) + 6;
          nodes.push(React.createElement(Circle, {
            key: `em-${i}`, x: px, y: py, radius: size,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint: { x: 0, y: 0 },
            fillRadialGradientEndRadius: size,
            fillRadialGradientColorStops: [
              0,    `rgba(254,232,180,${(1 - life) * 0.85})`,
              0.45, `rgba(248,140,40,${(1 - life) * 0.55})`,
              1,    'rgba(248,113,40,0)',
            ],
            globalCompositeOperation: 'lighter',
            listening: false,
          }));
        }
        // Bright pulsing core — sits at the apex for cones (the actual
        // origin of the spell) and at the centroid otherwise.
        const corePulse = 0.7 + 0.3 * Math.sin(t * 4);
        const coreR = Math.max(10, minRad * 0.16);
        nodes.push(React.createElement(Circle, {
          key: 'core', x: b.cx, y: b.cy, radius: coreR * (1 + 0.25 * corePulse),
          fillRadialGradientStartPoint: { x: 0, y: 0 },
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint: { x: 0, y: 0 },
          fillRadialGradientEndRadius: coreR * (1 + 0.25 * corePulse),
          fillRadialGradientColorStops: [
            0,    `rgba(255,255,210,${0.95 * corePulse})`,
            0.5,  `rgba(255,200,80,${0.7 * corePulse})`,
            1,    'rgba(255,200,80,0)',
          ],
          globalCompositeOperation: 'lighter',
          listening: false,
        }));

      } else if (element === 'water') {
        // Mirrors the in-app Water Zone style exactly: dashed cyan outline
        // + a small bright centroid dot. Subtle alpha breathing on the
        // outline keeps it animated without adding visual noise.
        const breathe = 0.85 + 0.15 * Math.sin(t * 1.2);
        const W_FILL = 'rgba(14,116,144,0.18)';
        const W_STROKE = 'rgba(6,182,212,0.75)';
        const W_DOT = 'rgba(103,232,249,0.9)';
        if (baseProps?.kind === 'circle') {
          nodes.push(React.createElement(Circle, {
            key: 'wo', x: baseProps.x, y: baseProps.y, radius: baseProps.radius,
            fill: W_FILL, stroke: W_STROKE, strokeWidth: 2, dash: [6, 3],
            opacity: breathe, listening: false,
          }));
        } else if (baseProps?.kind === 'rect') {
          nodes.push(React.createElement(Rect, {
            key: 'wo', x: baseProps.x, y: baseProps.y,
            width: baseProps.width, height: baseProps.height,
            fill: W_FILL, stroke: W_STROKE, strokeWidth: 2, dash: [6, 3],
            opacity: breathe, listening: false,
          }));
        } else if (baseProps?.kind === 'wedge') {
          nodes.push(React.createElement(Wedge, {
            key: 'wo', x: baseProps.x, y: baseProps.y, radius: baseProps.radius,
            angle: baseProps.angle, rotation: baseProps.rotation,
            fill: W_FILL, stroke: W_STROKE, strokeWidth: 2, dash: [6, 3],
            opacity: breathe, listening: false,
          }));
        } else if (baseProps?.kind === 'line') {
          nodes.push(React.createElement(Line, {
            key: 'wo', points: baseProps.points,
            stroke: W_STROKE, strokeWidth: 4, dash: [6, 3],
            opacity: breathe, listening: false,
          }));
        }
        nodes.push(React.createElement(Circle, {
          key: 'wd', x: b.cx, y: b.cy, radius: 5,
          fill: W_DOT, listening: false,
        }));

      } else if (element === 'ice') {
        // A few snowflake-like glyphs scattered around the bounds, slowly
        // rotating individually + twinkling on a per-flake phase. No more
        // ugly full-bounds shimmer rectangle.
        const flakeCount = lineSource
          ? Math.max(5, Math.min(14, Math.floor(lineSource.length / 22)))
          : Math.max(5, Math.min(10, Math.floor(area / 2200)));
        for (let i = 0; i < flakeCount; i++) {
          // Stable-ish placement — positions don't change frame-to-frame,
          // only the rotation and twinkle do. For cones, place each flake
          // along an angular slot inside the cone arc so they fall within
          // the visible wedge instead of all 360° around the apex.
          let fx, fy;
          if (cone) {
            const slot = ((i * 0.61803398) % 1);
            const dist = 0.25 + ((i * 0.37) % 0.65);
            const a = cone.startRad + slot * cone.spanRad;
            fx = b.cx + Math.cos(a) * cone.radius * dist;
            fy = b.cy + Math.sin(a) * cone.radius * dist;
          } else if (lineSource) {
            // Distribute flakes evenly along the line direction with a
            // small perpendicular jitter so they sit on / above the
            // 1ft template strip rather than in a horizontal ellipse.
            const slot = (i + 0.5) / flakeCount;
            const along = slot * lineSource.length;
            const nx = -lineSource.dirY, ny = lineSource.dirX;
            const jitter = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * (lineSource.halfWidth + 6);
            fx = lineSource.startX + lineSource.dirX * along + nx * jitter;
            fy = lineSource.startY + lineSource.dirY * along + ny * jitter;
          } else {
            const dist = 0.25 + ((i * 0.37) % 0.65);
            const a = i * 2.39994;
            fx = b.cx + Math.cos(a) * b.rx * dist;
            fy = b.cy + Math.sin(a) * b.ry * dist;
          }
          const rot = t * 0.5 + i * 0.7;
          const len = 5 + (i % 3);
          const tw = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.8 + i * 1.3));
          // Six-armed star
          for (let k = 0; k < 6; k++) {
            const ang = rot + k * (Math.PI / 3);
            nodes.push(React.createElement(Line, {
              key: `if-${i}-${k}`,
              points: [fx, fy, fx + Math.cos(ang) * len, fy + Math.sin(ang) * len],
              stroke: palette.stroke, strokeWidth: 1, opacity: tw,
              listening: false,
            }));
          }
          nodes.push(React.createElement(Circle, {
            key: `ic-${i}`, x: fx, y: fy, radius: 1.5,
            fill: palette.tone, opacity: tw * 0.9, listening: false,
          }));
        }
        // Faint outline ring so the affected area is still visible behind
        // the snowflakes (not a fill — it's the ugly bit before).
        if (baseProps?.kind === 'circle') {
          nodes.push(React.createElement(Circle, {
            key: 'irim', x: baseProps.x, y: baseProps.y, radius: baseProps.radius * 0.98,
            stroke: 'rgba(186,230,253,0.45)', strokeWidth: 1.2, dash: [3, 4],
            listening: false,
          }));
        }

      } else if (element === 'lightning') {
        // Random-looking jagged forks regenerated every few frames; the
        // (tick % N) gate stops them from re-randomising every single
        // frame which would be visually frantic.
        const seed = Math.floor(tick / 4);
        function rng(i) { let x = seed * 1000 + i; x ^= x << 13; x ^= x >> 17; x ^= x << 5; return ((x >>> 0) % 1000) / 1000; }
        const forks = 3;
        for (let f = 0; f < forks; f++) {
          // For cones, bolts originate at the apex and spread within the
          // arc. For lines, every bolt fires from the start point along
          // the line direction with perpendicular zig-zag wobble — the
          // classic Lightning-Bolt-spell look. For circles/rects, the
          // legacy radial pattern stays.
          const segs = 6;
          const pts = [b.cx, b.cy];
          if (cone) {
            const ang = cone.startRad + rng(f * 7) * cone.spanRad;
            for (let s = 1; s <= segs; s++) {
              const r = cone.radius * (s / segs);
              const wob = (rng(f * 7 + s) - 0.5) * 0.18;
              pts.push(b.cx + Math.cos(ang + wob) * r, b.cy + Math.sin(ang + wob) * r);
            }
          } else if (lineSource) {
            const nx = -lineSource.dirY, ny = lineSource.dirX;
            const wobAmp = lineSource.halfWidth + 6;
            for (let s = 1; s <= segs; s++) {
              const along = lineSource.length * (s / segs);
              const perp = (rng(f * 7 + s) - 0.5) * wobAmp;
              pts.push(
                lineSource.startX + lineSource.dirX * along + nx * perp,
                lineSource.startY + lineSource.dirY * along + ny * perp
              );
            }
          } else {
            const ang = rng(f * 7) * Math.PI * 2;
            const radial = Math.min(b.rx, b.ry);
            for (let s = 1; s <= segs; s++) {
              const r = radial * (s / segs);
              const wob = (rng(f * 7 + s) - 0.5) * 0.6;
              pts.push(b.cx + Math.cos(ang + wob) * r, b.cy + Math.sin(ang + wob) * r);
            }
          }
          nodes.push(React.createElement(Line, {
            key: `fk-${f}`, points: pts,
            stroke: palette.stroke, strokeWidth: 1.5,
            opacity: 0.85, listening: false,
          }));
        }

      } else if (element === 'void' && lineSource) {
        // Line variant — the classic black-hole vortex doesn't make
        // sense as a circle on a 1ft-wide line spell. Instead, render
        // as a "tear in space" running along the line: a dark band
        // with travelling pulses converging toward the line's centre
        // line, plus tiny event-horizon points spaced along it.
        const nx = -lineSource.dirY, ny = lineSource.dirX;
        const halfW = Math.max(lineSource.halfWidth, 8) * 2;     // visible band, not the literal 1ft sliver
        const A = { x: lineSource.startX, y: lineSource.startY };
        const B = { x: lineSource.endX,   y: lineSource.endY   };

        // ── Dark band along the line ───────────────────────────────
        // Polygon = (A+nL, B+nL, B-nL, A-nL). Filled with a vertical
        // (perpendicular-to-line) gradient so the centre is darkest
        // and the edges fade out, mirroring the radial vignette in
        // the circular variant.
        const bandPts = [
          A.x + nx * halfW, A.y + ny * halfW,
          B.x + nx * halfW, B.y + ny * halfW,
          B.x - nx * halfW, B.y - ny * halfW,
          A.x - nx * halfW, A.y - ny * halfW,
        ];
        nodes.push(React.createElement(Line, {
          key: 'vshade', points: bandPts, closed: true,
          fillLinearGradientStartPoint: { x: A.x + nx * halfW, y: A.y + ny * halfW },
          fillLinearGradientEndPoint:   { x: A.x - nx * halfW, y: A.y - ny * halfW },
          fillLinearGradientColorStops: [
            0,   'rgba(40,15,55,0)',
            0.5, 'rgba(0,0,0,0.85)',
            1,   'rgba(40,15,55,0)',
          ],
          listening: false,
        }));

        // ── Distortion pulses travelling toward the line's midpoint ─
        // Each pulse has a phase 0..1; born at a random end, arrives
        // at the midpoint as it ages.
        const midX = (A.x + B.x) / 2, midY = (A.y + B.y) / 2;
        const pulseCount = 4;
        for (let i = 0; i < pulseCount; i++) {
          const phase = ((t * 0.42 + i / pulseCount) % 1);
          const fromStart = (i % 2) === 0;
          const sx = fromStart ? A.x : B.x;
          const sy = fromStart ? A.y : B.y;
          const px = sx + (midX - sx) * phase;
          const py = sy + (midY - sy) * phase;
          const alpha = Math.sin(phase * Math.PI) * 0.55;
          // Pulse = small ellipse perpendicular to line, shrinking as it converges.
          const spanAlong = lineSource.length * 0.05 * (1 - phase * 0.5);
          const spanPerp  = halfW * 0.7 * (1 - phase * 0.4);
          // Approximate the rotated ellipse with a polygon along the line normal.
          const ringSegs = 24;
          const ringPts = [];
          for (let s = 0; s <= ringSegs; s++) {
            const a = (s / ringSegs) * Math.PI * 2;
            const along = Math.cos(a) * spanAlong;
            const perp  = Math.sin(a) * spanPerp;
            ringPts.push(
              px + lineSource.dirX * along + nx * perp,
              py + lineSource.dirY * along + ny * perp
            );
          }
          nodes.push(React.createElement(Line, {
            key: `vw-${i}`, points: ringPts, closed: true,
            stroke: palette.stroke, strokeWidth: 1.4, opacity: alpha,
            listening: false,
          }));
        }

        // ── Event-horizon dots spaced along the line ───────────────
        // Three tiny black dots equidistant along the line — visually
        // suggests a connected tear rather than one big singularity.
        const horizonCount = 3;
        for (let i = 0; i < horizonCount; i++) {
          const slot = (i + 1) / (horizonCount + 1);
          const hx = A.x + (B.x - A.x) * slot;
          const hy = A.y + (B.y - A.y) * slot;
          const r = Math.max(2.5, halfW * 0.18);
          nodes.push(React.createElement(Circle, {
            key: `vcore-${i}`, x: hx, y: hy, radius: r,
            fill: 'rgba(0,0,0,0.97)', listening: false,
          }));
          nodes.push(React.createElement(Circle, {
            key: `vedge-${i}`, x: hx, y: hy, radius: r + 0.6,
            stroke: palette.stroke, strokeWidth: 1.1, opacity: 0.9,
            listening: false,
          }));
        }

      } else if (element === 'void') {
        // Black-hole pull. Reads as "space warping toward a singularity":
        //   * a dark radial vignette dims the whole affected area
        //   * concentric wavy rings (the "distortion waves") shrink inward
        //     toward the event horizon, alpha-rising to a peak then fading
        //     as they're absorbed
        //   * radial streamers are pulled from the outer edge into the
        //     core over their phase — the visual "things being sucked in"
        // The event horizon itself is a solid black disc with a faint
        // purple rim — light-bending hint without an accretion disk.
        const baseRadius = cone ? cone.radius : Math.min(b.rx, b.ry);
        const innerR = baseRadius * 0.14;

        // ── Dark vignette ──────────────────────────────────────────────
        // Black at the centre, transparent at the edge — gives the whole
        // area a "dimmed / suppressed" feel that suggests gravitational
        // weight without a hard outline.
        const vignetteStops = [
          0,    'rgba(0,0,0,0.85)',
          0.35, 'rgba(20,5,30,0.55)',
          0.75, 'rgba(40,15,55,0.18)',
          1,    'rgba(40,15,55,0)',
        ];
        if (cone) {
          // For cones, fill the wedge with a radial gradient anchored at
          // the apex (the local origin of the Wedge shape).
          nodes.push(React.createElement(Wedge, {
            key: 'vshade',
            x: cone.apexX, y: cone.apexY, radius: cone.radius,
            angle: baseProps.angle, rotation: baseProps.rotation,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint:   { x: 0, y: 0 },
            fillRadialGradientEndRadius:  cone.radius,
            fillRadialGradientColorStops: vignetteStops,
            listening: false,
          }));
        } else {
          nodes.push(React.createElement(Circle, {
            key: 'vshade',
            x: b.cx, y: b.cy, radius: baseRadius,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint:   { x: 0, y: 0 },
            fillRadialGradientEndRadius:  baseRadius,
            fillRadialGradientColorStops: vignetteStops,
            listening: false,
          }));
        }

        // ── Distortion waves — wavy concentric rings shrinking inward ──
        // Each ring has a phase 0..1 where 0 = born at the outer edge
        // and 1 = absorbed at the event horizon. Multiple rings staggered
        // in phase keep the effect continuous. Sinusoidal wobble around
        // the circumference is the "distortion" — same idea as the slice
        // distortion in the host's water canvas, but radial.
        const waveCount = 4;
        const segments = 64;
        for (let i = 0; i < waveCount; i++) {
          const phase = ((t * 0.42 + i / waveCount) % 1);     // 0..1
          const ringR = baseRadius * (1 - phase) + innerR * phase;
          // Alpha rises mid-life and fades as the ring is absorbed —
          // sin(πφ) gives a smooth in-and-out envelope.
          const alpha = Math.sin(phase * Math.PI) * 0.55;
          const wobAmp = ringR * 0.07;
          const wobFreq = 5 + (i % 2);                         // 5–6 lobes
          const points = [];
          for (let s = 0; s <= segments; s++) {
            const a = (s / segments) * Math.PI * 2;
            const wob = Math.sin(a * wobFreq + t * 1.6 + i * 0.9) * wobAmp;
            const r = Math.max(innerR * 0.9, ringR + wob);
            points.push(b.cx + Math.cos(a) * r, b.cy + Math.sin(a) * r);
          }
          nodes.push(React.createElement(Line, {
            key: `vw-${i}`, points,
            stroke: palette.stroke, strokeWidth: 1.4,
            opacity: alpha,
            closed: true,
            listening: false,
          }));
        }

        // ── Streamers being pulled in ───────────────────────────────────
        // Each streamer has a phase 0..1 — at 0 it's a long line near the
        // outer edge, at 1 it's a short stub disappearing into the core.
        // Tangential angle nudge gives a slight "spiralling in" feel
        // without committing to a full vortex.
        const streamerCount = 18;
        for (let i = 0; i < streamerCount; i++) {
          const slot = i / streamerCount;
          const baseAng = cone
            ? cone.startRad + slot * cone.spanRad
            : slot * Math.PI * 2;
          const phase = ((t * 0.55 + i * 0.139) % 1);
          // Tail (outer end) and head (nearer the core). Both shrink
          // radially as phase advances — entire line travels inward.
          const tailR = baseRadius * (1 - phase * 0.95);
          const headR = Math.max(innerR * 1.3,
                                  baseRadius * (0.55 - phase * 0.55) + innerR * phase);
          // Slight tangential offset so streamers aren't pure radials —
          // suggests rotation under gravity. Smaller for cones.
          const tangNudge = (cone ? 0.05 : 0.10);
          const angTail = baseAng + tangNudge;
          const angHead = baseAng;
          const sx1 = b.cx + Math.cos(angTail) * tailR;
          const sy1 = b.cy + Math.sin(angTail) * tailR;
          const sx2 = b.cx + Math.cos(angHead) * headR;
          const sy2 = b.cy + Math.sin(angHead) * headR;
          // Fade in early, fade out as the streamer is absorbed.
          const sAlpha = phase < 0.15 ? phase / 0.15
                       : phase > 0.85 ? (1 - phase) / 0.15
                       : 1;
          nodes.push(React.createElement(Line, {
            key: `vs-${i}`, points: [sx1, sy1, sx2, sy2],
            stroke: palette.tone, strokeWidth: 1.3,
            opacity: 0.7 * sAlpha,
            lineCap: 'round',
            listening: false,
          }));
        }

        // ── Rim glow (light bending around the horizon) ─────────────────
        nodes.push(React.createElement(Circle, {
          key: 'vrim', x: b.cx, y: b.cy, radius: innerR + 6,
          fillRadialGradientStartPoint: { x: 0, y: 0 },
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint:   { x: 0, y: 0 },
          fillRadialGradientEndRadius:  innerR + 6,
          fillRadialGradientColorStops: [
            0,   'rgba(168,85,247,0.0)',
            0.6, 'rgba(168,85,247,0.35)',
            1,   'rgba(168,85,247,0.0)',
          ],
          listening: false,
        }));
        // ── Event horizon — opaque black disc that visibly blots out
        // whatever is underneath (template fill, grid lines, art). ──────
        nodes.push(React.createElement(Circle, {
          key: 'vcore', x: b.cx, y: b.cy, radius: innerR,
          fill: 'rgba(0,0,0,0.97)', listening: false,
        }));
        // Thin purple horizon edge.
        nodes.push(React.createElement(Circle, {
          key: 'vedge', x: b.cx, y: b.cy, radius: innerR + 0.6,
          stroke: palette.stroke, strokeWidth: 1.3, opacity: 0.9,
          listening: false,
        }));

      } else if (element === 'acid') {
        // Bubbling caustic pool. Bubbles rise + pop on a per-bubble life
        // cycle, with a faint chartreuse base wash so empty templates
        // still read as "acid". Position is deterministic per-bubble so
        // bubbles stay in their slot through their whole life cycle.
        const bubbleCount = lineSource
          ? Math.max(10, Math.min(28, Math.floor(lineSource.length / 14)))
          : Math.max(10, Math.min(28, Math.floor(area / 600)));

        // Faint base wash — shape-aware so the wash matches the template.
        if (cone) {
          nodes.push(React.createElement(Wedge, {
            key: 'wash',
            x: cone.apexX, y: cone.apexY, radius: cone.radius,
            angle: baseProps.angle, rotation: baseProps.rotation,
            fill: 'rgba(132,204,22,0.18)', listening: false,
          }));
        } else if (lineSource) {
          // Rotated rectangle wash that hugs the line template — a
          // bit wider than the 1ft strip so the bubbles have a visual
          // "pool" to sit in, not a flat sliver.
          const washHalf = Math.max(lineSource.halfWidth, 6) * 2.2;
          const nx = -lineSource.dirY, ny = lineSource.dirX;
          const A = { x: lineSource.startX, y: lineSource.startY };
          const B = { x: lineSource.endX,   y: lineSource.endY   };
          nodes.push(React.createElement(Line, {
            key: 'wash',
            points: [
              A.x + nx * washHalf, A.y + ny * washHalf,
              B.x + nx * washHalf, B.y + ny * washHalf,
              B.x - nx * washHalf, B.y - ny * washHalf,
              A.x - nx * washHalf, A.y - ny * washHalf,
            ],
            closed: true,
            fill: 'rgba(132,204,22,0.18)', listening: false,
          }));
        } else if (baseProps?.kind === 'circle') {
          nodes.push(React.createElement(Circle, {
            key: 'wash', x: baseProps.x, y: baseProps.y, radius: baseProps.radius,
            fill: 'rgba(132,204,22,0.18)', listening: false,
          }));
        } else if (baseProps?.kind === 'rect') {
          nodes.push(React.createElement(Rect, {
            key: 'wash', x: baseProps.x, y: baseProps.y,
            width: baseProps.width, height: baseProps.height,
            fill: 'rgba(132,204,22,0.18)', listening: false,
          }));
        }

        for (let i = 0; i < bubbleCount; i++) {
          const lifeCycle = 1.4 + (i % 5) * 0.18;            // staggered cycle lengths
          const phase = i * 0.137;                            // stable per-bubble phase
          const life = ((t / lifeCycle + phase) % 1);          // 0..1
          // Position — stable per-bubble within the template bounds. For
          // cones the bubble lives along an angular slot inside the arc.
          let bx, by;
          if (cone) {
            const slot = ((i * 0.61803398) % 1);
            const distFrac = 0.20 + ((i * 0.387) % 0.70);
            const ang = cone.startRad + slot * cone.spanRad;
            bx = b.cx + Math.cos(ang) * cone.radius * distFrac;
            by = b.cy + Math.sin(ang) * cone.radius * distFrac;
          } else if (lineSource) {
            // Bubbles distributed along the line's length with a small
            // perpendicular offset — they sit within the wash strip.
            const slot = ((i * 0.61803398) % 1);
            const along = slot * lineSource.length;
            const perp  = (((i * 0.541) % 1) - 0.5) * 2 * Math.max(lineSource.halfWidth, 6) * 1.8;
            const nx = -lineSource.dirY, ny = lineSource.dirX;
            bx = lineSource.startX + lineSource.dirX * along + nx * perp;
            by = lineSource.startY + lineSource.dirY * along + ny * perp;
          } else {
            const angI = i * 2.39994;
            const distI = 0.20 + ((i * 0.541) % 0.75);
            bx = b.cx + Math.cos(angI) * b.rx * distI;
            by = b.cy + Math.sin(angI) * b.ry * distI;
          }
          // Subtle wobble so bubbles feel alive instead of static dots.
          bx += Math.sin(t * 1.5 + i * 0.7) * 1.5;
          by += Math.cos(t * 1.7 + i * 0.9) * 1.5;
          // Lifecycle: grow during first 70% of life, then pop (fade) in
          // the last 30%. Pop is faster than growth — feels acidic, not balloon-y.
          const peak = 5 + (i % 4) * 1.5;
          const grow = life < 0.7 ? life / 0.7 : 1;
          const fade = life < 0.7 ? 1 : 1 - (life - 0.7) / 0.3;
          const size = peak * grow;
          const alpha = 0.85 * fade;
          if (size < 0.5) continue;
          // Single radial-gradient circle gives the spherical highlight
          // without needing 2-3 stacked nodes per bubble.
          nodes.push(React.createElement(Circle, {
            key: `ab-${i}`, x: bx, y: by, radius: size,
            fillRadialGradientStartPoint: { x: -size * 0.35, y: -size * 0.35 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint:   { x: 0, y: 0 },
            fillRadialGradientEndRadius:  size,
            fillRadialGradientColorStops: [
              0,    `rgba(255,255,255,${alpha * 0.85})`,
              0.30, `rgba(217,249,157,${alpha * 0.70})`,
              0.70, `rgba(132,204,22,${alpha * 0.55})`,
              1,    `rgba(80,120,15,${alpha * 0.20})`,
            ],
            stroke: `rgba(80,120,15,${alpha * 0.5})`, strokeWidth: 0.5,
            listening: false,
          }));
          // When the bubble pops (last 20% of life) leave a quick splatter ring
          if (life > 0.8 && size > 3) {
            const splatProgress = (life - 0.8) / 0.2;
            nodes.push(React.createElement(Circle, {
              key: `as-${i}`, x: bx, y: by,
              radius: size * (1 + splatProgress * 1.2),
              stroke: palette.stroke, strokeWidth: 1,
              opacity: (1 - splatProgress) * 0.8,
              listening: false,
            }));
          }
        }

      }

      // For cones, clip the entire effect Group to the wedge so any
      // particle that strays past the cone's arc or radius is cut off
      // visually. This is the safety net — the per-effect angular
      // constraints above keep most particles inside, this guarantees it.
      const groupProps = cone
        ? {
            listening: false,
            clipFunc: (canvasCtx) => {
              canvasCtx.beginPath();
              canvasCtx.moveTo(cone.apexX, cone.apexY);
              canvasCtx.arc(cone.apexX, cone.apexY, cone.radius, cone.startRad, cone.startRad + cone.spanRad);
              canvasCtx.closePath();
            },
          }
        : { listening: false };
      return React.createElement(Group, groupProps, nodes);
    }

    // Decorator: returns the overlay component for a template that has an
    // element set. Returning null when no element is set is the contract
    // for "render nothing". Water is special — the host's water canvas
    // post-processes the template directly (real ripple effect), so we
    // skip the Konva overlay for it.
    registries.spellTemplateDecorators.set(PLUGIN_ID, (template, baseProps) => {
      const raw = elementCache.get(template.id);
      // Legacy data shim: an earlier version of this plugin shipped a
      // separate 'poison' element. We've folded it into 'acid' (now
      // labelled "Acid / Poison"). Map silently so any template already
      // saved as 'poison' keeps rendering instead of going blank.
      const element = raw === 'poison' ? 'acid' : raw;
      if (!element || element === 'none') return null;
      if (element === 'water') return null;
      return React.createElement(ElementalOverlay, { template, baseProps, element, key: `${template.id}-${element}` });
    });

    // ── Editor extension (popup field) ─────────────────────────────────
    // A select inside the template-edit popup; its value comes from the
    // cache, persistence goes via plugin_data. Both notifyChange and the
    // backing store are updated so the UI and the decorator stay in sync.
    function ElementSelect({ template }) {
      const [, force] = React.useState(0);
      // Re-render this control whenever the cache changes — handles the
      // initial async hydrate so the select shows the right element on
      // popup open.
      React.useEffect(() => {
        const fn = () => force(x => x + 1);
        subs.add(fn);
        return () => subs.delete(fn);
      }, []);
      // Same legacy shim as the decorator — legacy 'poison' shows as the
      // renamed 'acid' option so the dropdown isn't blank.
      const raw = elementCache.get(template.id) || 'none';
      const current = raw === 'poison' ? 'acid' : raw;
      const onChange = async (e) => {
        const v = e.target.value;
        elementCache.set(template.id, v);
        syncOverlays();
        notify();
        try {
          if (v === 'none') {
            await data.delete(KEY_PREFIX + template.id);
          } else {
            await data.write(KEY_PREFIX + template.id, { element: v });
          }
        } catch { /* ignore — UI already reflects local change */ }
      };
      return React.createElement(
        'div',
        null,
        React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' }, 'Elemental Effect'),
        React.createElement(
          'select',
          {
            className: 'w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white',
            value: current,
            onChange,
          },
          Object.entries(ELEMENT_LABELS).map(([k, label]) =>
            React.createElement('option', { key: k, value: k }, label)
          )
        ),
        React.createElement('p', { className: 'text-[10px] text-gray-500 mt-0.5' },
          'Adds an animated overlay matching the chosen element. Provided by the Elemental Templates plugin.')
      );
    }

    registries.templateEditorExtensions.set(PLUGIN_ID, (template) =>
      React.createElement(ElementSelect, { template, key: template.id })
    );
  },

  // Called on disable / reload — clean up registries so removing the
  // plugin really removes its UI. The element cache is intentionally NOT
  // cleared here: if the plugin is re-enabled in the same session, we
  // want its state to come back without a re-fetch.
  unregister({ registries }) {
    registries.spellTemplateDecorators.delete(PLUGIN_ID);
    registries.templateEditorExtensions.delete(PLUGIN_ID);
  },
};

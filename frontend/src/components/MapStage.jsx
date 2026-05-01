import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Image as KonvaImage, Group, Circle, Rect, Text, Wedge } from 'react-konva';
import useImage from 'use-image';
import { wallToSegments, wallsToSegments, doorsToSegments, computeVisibilityPolygon, ledgeData, ledgeFarSidePolygon } from '../utils/los.js';
import { registries as pluginRegistries, useRegistryVersion } from '../plugins/pluginRegistry.js';

export const TOKEN_SIZES = {
  tiny:       { gridW: 1, gridH: 1, scale: 0.45, label: 'Tiny' },
  small:      { gridW: 1, gridH: 1, scale: 0.85, label: 'Small' },
  medium:     { gridW: 1, gridH: 1, scale: 0.85, label: 'Medium' },
  large:      { gridW: 2, gridH: 2, scale: 0.92, label: 'Large' },
  huge:       { gridW: 3, gridH: 3, scale: 0.92, label: 'Huge' },
  gargantuan: { gridW: 4, gridH: 4, scale: 0.92, label: 'Gargantuan' },
};

// DM marker visual config — kept in sync with DMView's DM_MARKER_TYPES
export const DM_MARKER_ICONS = {
  trap:        '🪤',
  hazard:      '⚠️',
  patrol:      '👁️',
  secret_door: '🔒',
  encounter:   '💀',
  treasure:    '💰',
  magic:       '🔮',
  note:        '📝',
  reminder:    '🔔',
  poison:      '🧪',
  ambush:      '🏹',
  npc:         '🧙',
  text_label:  '✏️',
};
export const DM_MARKER_COLORS = {
  trap:        '#ef4444',
  hazard:      '#f97316',
  patrol:      '#3b82f6',
  secret_door: '#8b5cf6',
  encounter:   '#dc2626',
  treasure:    '#eab308',
  magic:       '#a855f7',
  note:        '#6b7280',
  reminder:    '#22d3ee',
  poison:      '#84cc16',
  ambush:      '#f59e0b',
  npc:         '#10b981',
  text_label:  '#facc15',
};

const FEET_PER_SQUARE = 5;
const MEASURE_TOOLS = new Set(['ruler', 'cone', 'circle']);

// Clip a 2D canvas context to a wedge (directional light cone). No-op for full circles.
function clipToWedge(ctx, cx, cy, r, dirDeg, spreadDeg) {
  if (spreadDeg >= 360) return;
  const half = (spreadDeg / 2) * (Math.PI / 180);
  const dirRad = dirDeg * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, dirRad - half, dirRad + half);
  ctx.closePath();
  ctx.clip();
}
const WALL_DRAW_TOOLS = new Set(['wall-line', 'wall-rect', 'wall-polygon', 'wall-circle', 'wall-ledge', 'wall-erase']);
const TEMPLATE_TOOLS = new Set(['tpl-cone', 'tpl-circle', 'tpl-line', 'tpl-square']);
const DOOR_DRAW_TOOLS = new Set(['door-std', 'door-heavy', 'door-port']);
const LIGHT_DRAW_TOOLS = new Set(['light']);
const DOOR_ERASE_TOOLS = new Set(['door-erase']);
const DARKNESS_DRAW_TOOLS = new Set(['magical-darkness', 'heavy-fog', 'darkness-polygon', 'fog-polygon', 'water-circle', 'water-polygon']);
const DARKNESS_POLY_TOOLS = new Set(['darkness-polygon', 'fog-polygon', 'water-polygon']);
const SPAWN_TOOLS = new Set(['spawn-point', 'spawn-named']);

// Distance from point (px,py) to segment (ax,ay)-(bx,by)
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function findNearestWall(mapX, mapY, walls, threshold) {
  let nearest = null, minDist = threshold;
  for (const wall of walls) {
    let d = Infinity;
    if (wall.type === 'circle' && wall.points.length >= 3) {
      const [cx, cy, r] = wall.points;
      d = Math.abs(Math.hypot(mapX - cx, mapY - cy) - r);
    } else if (wall.type === 'ledge' && wall.points.length >= 4) {
      const [ax, ay, bx, by] = wall.points;
      d = distToSeg(mapX, mapY, ax, ay, bx, by);
    } else {
      const segs = wallToSegments(wall);
      for (const seg of segs) d = Math.min(d, distToSeg(mapX, mapY, seg.ax, seg.ay, seg.bx, seg.by));
    }
    if (d < minDist) { minDist = d; nearest = { wall, dist: d }; }
  }
  return nearest;
}

function findNearestLight(mapX, mapY, lights, threshold) {
  let nearest = null, minDist = threshold;
  for (const light of lights) {
    const d = Math.hypot(mapX - light.x, mapY - light.y);
    if (d < minDist) { minDist = d; nearest = { light, dist: d }; }
  }
  return nearest;
}

function findNearestDarkness(mapX, mapY, darknesses, threshold) {
  // Primary: check if the click is inside any zone (handles circles and polygons correctly)
  for (const dz of darknesses) {
    if (pointInZone(mapX, mapY, dz)) return { darkness: dz, dist: 0 };
  }
  // Fallback: proximity to anchor point (catches circles the cursor just missed)
  let nearest = null, minDist = threshold;
  for (const dz of darknesses) {
    const d = Math.hypot(mapX - dz.x, mapY - dz.y);
    if (d < minDist) { minDist = d; nearest = { darkness: dz, dist: d }; }
  }
  return nearest;
}

function findNearestDoor(mapX, mapY, doors, threshold) {
  let nearest = null, minDist = threshold;
  for (const door of doors) {
    const pts = door.points;
    if (!pts || pts.length < 4) continue;
    const d = distToSeg(mapX, mapY, pts[0], pts[1], pts[2], pts[3]);
    if (d < minDist) { minDist = d; nearest = { door, dist: d }; }
  }
  return nearest;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Ray-cast point-in-polygon test. pts is a flat [x1,y1,x2,y2,...] array.
function pointInPoly(x, y, pts) {
  const n = pts.length >> 1;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Containment check that supports both circle and polygon magical-darkness/fog zones.
function pointInZone(px, py, dz) {
  if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
    return pointInPoly(px, py, dz.poly_points);
  }
  return Math.hypot(px - dz.x, py - dz.y) <= dz.radius;
}

// Centroid of a zone (used for LOS origin of fog/darkness zones).
function zoneCentroid(dz) {
  if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 4) {
    const pts = dz.poly_points;
    const n = pts.length / 2;
    let sx = 0, sy = 0;
    for (let i = 0; i < pts.length; i += 2) { sx += pts[i]; sy += pts[i + 1]; }
    return { x: sx / n, y: sy / n };
  }
  return { x: dz.x, y: dz.y };
}

// Approximate bounding radius for a zone (used for truesight range checks).
function zoneEffectiveRadius(dz) {
  if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 4) {
    const pts = dz.poly_points;
    const n = pts.length / 2;
    let sx = 0, sy = 0;
    for (let i = 0; i < pts.length; i += 2) { sx += pts[i]; sy += pts[i + 1]; }
    const cx = sx / n, cy = sy / n;
    let maxR = 0;
    for (let i = 0; i < pts.length; i += 2) maxR = Math.max(maxR, Math.hypot(pts[i] - cx, pts[i + 1] - cy));
    return maxR;
  }
  return dz.radius || 0;
}

// Returns true if any visOrigin can see through invisibility (truesight always; blindsight within range)
function canSeeInvisible(token, visOrigins, offsetX, offsetY, gridSize) {
  const sz = TOKEN_SIZES[token.size] || TOKEN_SIZES.medium;
  const cx = offsetX + Number(token.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
  const cy = offsetY + Number(token.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
  return visOrigins.some(origin => {
    if (origin.visionType === 'truesight' || origin.visionType === 'blindsight') {
      const d = Math.hypot(cx - origin.x, cy - origin.y);
      return origin.visionRangePx <= 0 || d <= origin.visionRangePx;
    }
    return false;
  });
}

// HP-bar fill colour by remaining-HP fraction. Thresholds:
//   ≥ 50%  → green   (#22c55e)
//   ≥ 25%  → orange  (#f59e0b)
//   > 0%   → red     (#ef4444)
//   dead   → black   (handled by caller — see Token render)
function hpColor(cur, max) {
  if (!max) return '#22c55e';
  const p = cur / max;
  if (p >= 0.5) return '#22c55e';
  if (p >= 0.25) return '#f59e0b';
  return '#ef4444';
}

// Text colour that contrasts with `bgHex`. Uses standard luminance from sRGB
// — white for dark backgrounds, near-black for bright ones. Used to keep
// the HP text readable over both the bar fill and the dark track.
function contrastTextColor(bgHex) {
  const m = /^#([0-9a-f]{6})$/i.exec(bgHex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 150 ? '#0a0a0a' : '#ffffff';
}

function dist(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function pxToFt(px, gridSize) {
  return Math.round((px / gridSize) * FEET_PER_SQUARE);
}

// ── Measurement overlay ───────────────────────────────────────────────────────

function MeasureOverlay({ meas, gridSize, tint }) {
  if (!meas?.start || !meas?.end) return null;
  const { type, start, end } = meas;
  const d = dist(start, end);
  const ft = pxToFt(d, gridSize);

  if (type === 'ruler') {
    if (d < 1) return null;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const STROKE = tint || 'rgba(255,220,50,0.9)';
    return (
      <>
        <Line points={[start.x, start.y, end.x, end.y]} stroke={STROKE} strokeWidth={2.5} listening={false} />
        <Circle x={start.x} y={start.y} radius={5} fill={STROKE} listening={false} />
        <Circle x={end.x} y={end.y} radius={5} fill={STROKE} listening={false} />
        {Array.from({ length: Math.floor(d / gridSize) }, (_, i) => {
          const t = ((i + 1) * gridSize) / d;
          const tx = start.x + (end.x - start.x) * t;
          const ty = start.y + (end.y - start.y) * t;
          const ux = (end.x - start.x) / d, uy = (end.y - start.y) / d;
          const px = -uy * 7, py = ux * 7;
          return <Line key={i} points={[tx - px, ty - py, tx + px, ty + py]} stroke={STROKE} strokeWidth={1.5} listening={false} />;
        })}
        <Rect x={mx - 38} y={my - 14} width={76} height={22} fill="rgba(0,0,0,0.7)" cornerRadius={4} listening={false} />
        <Text x={mx - 38} y={my - 10} width={76} align="center" text={`${ft} ft`} fill={STROKE} fontSize={13} fontStyle="bold" listening={false} />
      </>
    );
  }

  if (type === 'cone') {
    if (d < 2) return null;
    const ux = (end.x - start.x) / d, uy = (end.y - start.y) / d;
    const px = -uy, py = ux;
    const halfW = d / 2;
    const v1x = end.x + px * halfW, v1y = end.y + py * halfW;
    const v2x = end.x - px * halfW, v2y = end.y - py * halfW;
    const lx = end.x + ux * 20, ly = end.y + uy * 20;
    const STROKE = tint || 'rgba(255,140,0,0.9)';
    const FILL = tint ? (tint + '38') : 'rgba(255,140,0,0.22)';
    return (
      <>
        <Line points={[start.x, start.y, v1x, v1y, v2x, v2y, start.x, start.y]}
          closed fill={FILL} stroke={STROKE} strokeWidth={2} listening={false} />
        <Rect x={lx - 38} y={ly - 11} width={76} height={22} fill="rgba(0,0,0,0.7)" cornerRadius={4} listening={false} />
        <Text x={lx - 38} y={ly - 7} width={76} align="center" text={`${ft} ft`} fill={STROKE} fontSize={13} fontStyle="bold" listening={false} />
      </>
    );
  }

  if (type === 'circle') {
    if (d < 2) return null;
    const STROKE = tint || 'rgba(100,180,255,0.9)';
    const FILL = tint ? (tint + '26') : 'rgba(100,180,255,0.15)';
    return (
      <>
        <Circle x={start.x} y={start.y} radius={d} fill={FILL} stroke={STROKE} strokeWidth={2} listening={false} />
        <Line points={[start.x, start.y, end.x, end.y]} stroke={STROKE} strokeWidth={1.5} dash={[6, 4]} listening={false} />
        <Circle x={start.x} y={start.y} radius={4} fill={STROKE} listening={false} />
        <Rect x={start.x - 52} y={start.y - 14} width={104} height={22} fill="rgba(0,0,0,0.7)" cornerRadius={4} listening={false} />
        <Text x={start.x - 52} y={start.y - 10} width={104} align="center" text={`r = ${ft} ft`} fill={STROKE} fontSize={13} fontStyle="bold" listening={false} />
      </>
    );
  }

  return null;
}

// ── Token ─────────────────────────────────────────────────────────────────────

const CONDITIONS = {
  blinded:      { color: '#9ca3af' },
  charmed:      { color: '#f9a8d4' },
  deafened:     { color: '#6b7280' },
  exhaustion:   { color: '#dc2626' },
  frightened:   { color: '#7c3aed' },
  grappled:     { color: '#d97706' },
  incapacitated:{ color: '#f97316' },
  invisible:    { color: '#e5e7eb' },
  paralyzed:    { color: '#60a5fa' },
  petrified:    { color: '#a3a3a3' },
  poisoned:     { color: '#4ade80' },
  prone:        { color: '#92400e' },
  restrained:   { color: '#ea580c' },
  stunned:      { color: '#2dd4bf' },
  unconscious:  { color: '#374151' },
  submerged:    { color: '#06b6d4' },
};

const TokenArt = React.memo(function TokenArt({ src, w, h, x, y }) {
  const [img] = useImage(src, 'anonymous');
  if (!img) return <Circle x={x + w / 2} y={y + h / 2} radius={w / 2} fill="#6366f1" listening={false} />;
  return <KonvaImage image={img} x={x} y={y} width={w} height={h} cornerRadius={w / 2} listening={false} />;
});

// Token is purely visual — all interaction handled at the DOM level in MapStage.
// offset: { x, y } is the grid origin in map-space (so token at col,row renders
// at map position offset + col*gridSize, offset + row*gridSize).
// dragVisPos, when set, is already in map-space (includes the offset).
function Token({ token, gridSize, offset, isPlayer, isSelected, isCurrentTurn = false, dragVisPos, playerTokenId, showLabel = true, overrideOpacity = null, tokenNameFontSize = 45 }) {
  const sz = TOKEN_SIZES[token.size] || TOKEN_SIZES.medium;
  const tW = sz.gridW * gridSize;
  const tH = sz.gridH * gridSize;
  const iW = tW * sz.scale;
  const iH = tH * sz.scale;
  const iOff = (tW - iW) / 2;
  const conditions = Array.isArray(token.conditions) ? token.conditions : [];
  const tempHp = token.temp_hp || 0;
  const isOwnToken = playerTokenId != null && token.id === playerTokenId;

  const imgUrl = token.image_path
    ? `/uploads/${token.image_path}`
    : token.creature_image
    ? `/uploads/${token.creature_image}`
    : token.is_player
    ? '/uploads/creatures/default_player.png'
    : null;

  const hpPct = token.max_hp > 0 ? Math.max(0, token.current_hp / token.max_hp) : 0;
  const isDead = token.is_dead;
  const fontSize = tokenNameFontSize;
  // HP text sits ~2px smaller than the bar's interior so the digits
  // get vertical breathing room — Konva's verticalAlign 'middle' uses
  // the full font height (ascender + descender) for centring, which
  // visually shoves the cap-height portion toward the top edge when
  // text height equals bar height.
  const hpFontSize = Math.max(6, Math.round(fontSize / 2) - 2);

  // Position derived purely from props — no internal state to cause stale snaps
  const x = dragVisPos ? dragVisPos.x : offset.x + Number(token.grid_col) * gridSize;
  const y = dragVisPos ? dragVisPos.y : offset.y + Number(token.grid_row) * gridSize;

  const groupOpacity = overrideOpacity !== null ? overrideOpacity : (isDead ? 0.5 : 1);

  // Subtle breathing pulse when this token's turn is up — scales the whole
  // token (image + outline + conditions) around its centre by ±4% at a slow
  // sine. Only one token typically pulses at once so the per-frame React
  // updates are negligible.
  const [pulseScale, setPulseScale] = useState(1);
  useEffect(() => {
    if (!isCurrentTurn) { setPulseScale(1); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      // ω ≈ 2.4 rad/s → ~2.6s per breath cycle, ±4% scale.
      setPulseScale(1 + 0.04 * Math.sin(t * 2.4));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isCurrentTurn]);

  // Inner Group does the scaling — outer Group stays at the unscaled (x,y)
  // grid position so layout/coordinates downstream don't shift.
  const innerProps = isCurrentTurn
    ? {
        x: tW / 2, y: tH / 2,
        offsetX: tW / 2, offsetY: tH / 2,
        scaleX: pulseScale, scaleY: pulseScale,
      }
    : {};

  return (
    <Group x={x} y={y} opacity={groupOpacity} listening={false}>
      <Group {...innerProps} listening={false}>
      {isCurrentTurn && (
        <Rect width={tW} height={tH} stroke="#22d3ee" strokeWidth={3}
          fill="rgba(34,211,238,0.08)" cornerRadius={4} listening={false} />
      )}
      {isSelected && (
        <Rect width={tW} height={tH} stroke="#fbbf24" strokeWidth={3}
          fill="rgba(251,191,36,0.08)" cornerRadius={4} dash={[6, 3]} listening={false} />
      )}
      {dragVisPos && (
        <Rect width={tW} height={tH} stroke="white" strokeWidth={2}
          fill="rgba(255,255,255,0.05)" cornerRadius={4} listening={false} />
      )}
      {imgUrl
        ? <TokenArt src={imgUrl} w={iW} h={iH} x={iOff} y={iOff} />
        : <Circle x={tW / 2} y={tH / 2} radius={iW / 2} fill={isDead ? '#4b5563' : '#6366f1'}
            listening={false} />
      }
      {isDead && <>
        <Line points={[iOff, iOff, iOff + iW, iOff + iH]} stroke="red" strokeWidth={3} listening={false} />
        <Line points={[iOff + iW, iOff, iOff, iOff + iH]} stroke="red" strokeWidth={3} listening={false} />
      </>}
      {conditions.map((cond, i) => {
        const c = CONDITIONS[cond];
        if (!c) return null;
        const r = Math.max(tW, tH) / 2 + 4 + i * 5;
        return (
          <Circle
            key={cond}
            x={tW / 2}
            y={tH / 2}
            radius={r}
            stroke={c.color}
            strokeWidth={2.5}
            fill="transparent"
            dash={[5, 3]}
            listening={false}
          />
        );
      })}
      {/* ── Label card ──────────────────────────────────────────────────────── */}
      {showLabel && (() => {
        const dmgTaken = Math.max(0, token.max_hp - token.current_hp);
        // HP text is now rendered INSIDE the bar. When dead the bar reads
        // "Dead" regardless of whether DM/player visibility would otherwise
        // hide HP numbers — death is public information.
        const hpText = isDead
          ? 'Dead'
          : !isPlayer
            ? `${token.current_hp}/${token.max_hp}`
            : token.is_player
              ? `${token.current_hp}/${token.max_hp} hp`
              : dmgTaken > 0
                ? `${dmgTaken} dmg`
                : null;

        const displayName = token.nickname || token.name;
        const estTextW = displayName.length * fontSize * 0.62;
        const cardW    = Math.max(tW + 4, estTextW + 14);
        const cardX    = (tW - cardW) / 2;
        const cardY    = tH + 5;
        const bPad     = 6;
        const bW       = cardW - bPad * 2;
        const nameH    = fontSize + 2;
        const barOff   = nameH + 5;
        // Bar height has 4px more than the bare font/2 so the HP text
        // (rendered slightly smaller via hpFontSize) has room top and
        // bottom regardless of Konva's font-box interpretation.
        const barH     = Math.max(8, Math.round(fontSize / 2) + 4);
        const cardH    = barOff + barH + 5;
        // Filled-portion colour (green/orange/red) and the matching text
        // colour for letters that fall over it. Empty track (#1e293b) and
        // dead-bar (#000) are dark, so their text stays white.
        const fillHex     = hpColor(token.current_hp, token.max_hp);
        const filledTextC = isDead ? '#fff' : contrastTextColor(fillHex);
        const trackTextC  = '#fff';
        const fillW       = isDead ? bW : bW * hpPct;
        const barX        = cardX + bPad;
        const barY        = cardY + barOff;

        return (
          <>
            {/* Card background */}
            <Rect
              x={cardX} y={cardY}
              width={cardW} height={cardH}
              fill="rgba(8,10,18,0.86)"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={0.75}
              cornerRadius={5}
              listening={false}
            />
            {/* Name */}
            <Text
              text={displayName}
              x={cardX + 3} y={cardY + 4}
              width={cardW - 6}
              align="center"
              fill="white"
              fontSize={fontSize}
              fontStyle="bold"
              wrap="word"
              listening={false}
            />
            {/* HP bar track. When dead this is the full black bar — no
                green/orange/red fill is layered on top. */}
            <Rect
              x={barX} y={barY}
              width={bW} height={barH}
              fill={isDead ? '#000' : '#1e293b'}
              cornerRadius={2}
              listening={false}
            />
            {/* HP bar fill — only when alive. */}
            {!isDead && fillW > 0 && (
              <Rect
                x={barX} y={barY}
                width={fillW} height={barH}
                fill={fillHex}
                cornerRadius={2}
                listening={false}
              />
            )}
            {/* Temp HP extension — only when alive and there's empty space. */}
            {!isDead && tempHp > 0 && (
              <Rect
                x={barX + fillW}
                y={barY}
                width={Math.min(bW - fillW, (tempHp / Math.max(1, token.max_hp)) * bW)}
                height={barH}
                fill="#22d3ee"
                cornerRadius={[0, 2, 2, 0]}
                listening={false}
              />
            )}
            {/* HP text inside the bar. To keep contrast across the
                fill/track boundary we render the text twice — once
                clipped to the filled portion (with a colour that
                contrasts against the fill) and once clipped to the empty
                portion (always white over the dark track). When the
                boundary crosses a glyph, each half picks up the right
                colour automatically. */}
            {hpText && (() => {
              // Bar is ~4px taller than the text (see barH + hpFontSize
              // above), so verticalAlign:'middle' has enough slack to
              // visually centre regardless of how Konva measures the
              // font box.
              const tProps = {
                text: hpText,
                x: barX, y: barY,
                width: bW, height: barH,
                align: 'center',
                verticalAlign: 'middle',
                fontSize: hpFontSize,
                fontStyle: 'bold',
                listening: false,
              };
              if (isDead) {
                // Solid black bar — single render, white text.
                return <Text {...tProps} fill={trackTextC} />;
              }
              return (
                <>
                  <Group
                    clipX={barX} clipY={barY}
                    clipWidth={fillW} clipHeight={barH}
                    listening={false}
                  >
                    <Text {...tProps} fill={filledTextC} />
                  </Group>
                  <Group
                    clipX={barX + fillW} clipY={barY}
                    clipWidth={Math.max(0, bW - fillW)} clipHeight={barH}
                    listening={false}
                  >
                    <Text {...tProps} fill={trackTextC} />
                  </Group>
                </>
              );
            })()}
          </>
        );
      })()}
      </Group>
    </Group>
  );
}

// ── Wall shapes ───────────────────────────────────────────────────────────────

const WALL_STROKE = 'rgba(255,110,30,0.92)';
const WALL_FILL   = 'rgba(255,110,30,0.08)';
const WALL_SW     = 2.5;

function WallShape({ wall }) {
  const pts = wall.points;
  if (!pts || pts.length < 2) return null;

  if (wall.type === 'line') {
    return pts.length >= 4
      ? <Line points={pts} stroke={WALL_STROKE} strokeWidth={WALL_SW} lineCap="round" listening={false} />
      : null;
  }
  if (wall.type === 'rect') {
    if (pts.length < 4) return null;
    const x = Math.min(pts[0], pts[2]), y = Math.min(pts[1], pts[3]);
    const w = Math.abs(pts[2] - pts[0]),  h = Math.abs(pts[3] - pts[1]);
    return <Rect x={x} y={y} width={w} height={h} stroke={WALL_STROKE} strokeWidth={WALL_SW} fill={WALL_FILL} listening={false} />;
  }
  if (wall.type === 'polygon') {
    return pts.length >= 4
      ? <Line points={pts} closed stroke={WALL_STROKE} strokeWidth={WALL_SW} fill={WALL_FILL} lineCap="round" lineJoin="round" listening={false} />
      : null;
  }
  if (wall.type === 'circle') {
    return pts.length >= 3
      ? <Circle x={pts[0]} y={pts[1]} radius={pts[2]} stroke={WALL_STROKE} strokeWidth={WALL_SW} fill={WALL_FILL} listening={false} />
      : null;
  }
  if (wall.type === 'ledge') {
    if (pts.length < 4) return null;
    const [ax, ay, bx, by] = pts;
    // Perpendicular arrow pointing to the "above" (unimpeded) side = LEFT of A→B
    // (canvas y-down → above-pointing normal is (dy_unit, -dx_unit)).
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux; // above-side normal
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const arrowLen = 18;
    const tx = mx + nx * arrowLen, ty = my + ny * arrowLen;
    const LEDGE_STROKE = 'rgba(180,120,60,0.95)';
    return (
      <>
        <Line points={pts} stroke={LEDGE_STROKE} strokeWidth={WALL_SW} dash={[6, 3]} lineCap="round" listening={false} />
        <Line points={[mx, my, tx, ty]} stroke={LEDGE_STROKE} strokeWidth={1.5} lineCap="round" listening={false} />
        <Circle x={tx} y={ty} radius={3} fill={LEDGE_STROKE} listening={false} />
      </>
    );
  }
  return null;
}

const PREV_STROKE = 'rgba(255,210,50,0.95)';
const PREV_FILL   = 'rgba(255,210,50,0.06)';

function WallPreview({ preview }) {
  if (!preview) return null;
  const pts = preview.points;
  if (!pts || pts.length < 2) return null;

  if (preview.type === 'line') {
    return pts.length >= 4
      ? <Line points={pts} stroke={PREV_STROKE} strokeWidth={2} dash={[8, 4]} lineCap="round" listening={false} />
      : null;
  }
  if (preview.type === 'rect') {
    if (pts.length < 4) return null;
    const x = Math.min(pts[0], pts[2]), y = Math.min(pts[1], pts[3]);
    const w = Math.abs(pts[2] - pts[0]),  h = Math.abs(pts[3] - pts[1]);
    return <Rect x={x} y={y} width={w} height={h} stroke={PREV_STROKE} strokeWidth={2} dash={[8, 4]} fill={PREV_FILL} listening={false} />;
  }
  if (preview.type === 'polygon') {
    const n = Math.floor(pts.length / 2);
    return (
      <>
        {pts.length >= 4 && <Line points={pts} stroke={PREV_STROKE} strokeWidth={2} lineCap="round" lineJoin="round" listening={false} />}
        {Array.from({ length: n }, (_, i) => (
          <Circle key={i} x={pts[i * 2]} y={pts[i * 2 + 1]} radius={4} fill={PREV_STROKE} listening={false} />
        ))}
        {preview.cursorX !== undefined && pts.length >= 2 && (
          <Line points={[pts[pts.length - 2], pts[pts.length - 1], preview.cursorX, preview.cursorY]}
            stroke={PREV_STROKE} strokeWidth={2} dash={[6, 4]} lineCap="round" listening={false} />
        )}
        {n >= 3 && (
          <Line points={[pts[pts.length - 2], pts[pts.length - 1], pts[0], pts[1]]}
            stroke="rgba(255,210,50,0.25)" strokeWidth={1} dash={[4, 4]} listening={false} />
        )}
      </>
    );
  }
  if (preview.type === 'circle') {
    const r = pts.length >= 4 ? Math.hypot(pts[2] - pts[0], pts[3] - pts[1]) : 0;
    return (
      <>
        <Circle x={pts[0]} y={pts[1]} radius={Math.max(4, r)} stroke={PREV_STROKE} strokeWidth={2} dash={[8, 4]} fill={PREV_FILL} listening={false} />
        {r > 0 && <Line points={[pts[0], pts[1], pts[0] + r, pts[1]]} stroke={PREV_STROKE} strokeWidth={1} dash={[4, 4]} listening={false} />}
        <Circle x={pts[0]} y={pts[1]} radius={4} fill={PREV_STROKE} listening={false} />
      </>
    );
  }
  if (preview.type === 'ledge') {
    if (pts.length < 4) return null;
    const [ax, ay, bx, by] = pts;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const tx = mx + nx * 18, ty = my + ny * 18;
    return (
      <>
        <Line points={pts} stroke={PREV_STROKE} strokeWidth={2} dash={[6, 3]} lineCap="round" listening={false} />
        <Line points={[mx, my, tx, ty]} stroke={PREV_STROKE} strokeWidth={1.5} lineCap="round" listening={false} />
      </>
    );
  }
  return null;
}

// ── Door shapes ───────────────────────────────────────────────────────────────

// Approximate an arc as a flat point array for Konva Line
function arcPts(cx, cy, r, a0, a1, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

const DOOR_COLORS = {
  standard:  { closed: '#a16207', open: '#16a34a' },
  heavy:     { closed: '#475569', open: '#16a34a' },
  portcullis:{ closed: '#6b7280', open: '#16a34a' },
};

function DoorShape({ door }) {
  const pts = door.points;
  if (!pts || pts.length < 4) return null;

  const [x1, y1, x2, y2] = pts;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return null;

  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const dir = door.open_dir === -1 ? -1 : 1;
  const px = -uy * dir, py = ux * dir; // perpendicular (swing direction)

  const isOpen  = door.is_open;
  const style   = door.style || 'standard';
  const palette = DOOR_COLORS[style] || DOOR_COLORS.standard;
  const color   = isOpen ? palette.open : palette.closed;

  // Angles
  const doorAngle = Math.atan2(uy, ux);
  const perpAngle = Math.atan2(py, px);

  // ── Portcullis ────────────────────────────────────────────────────────────
  if (style === 'portcullis') {
    const numBars  = Math.max(2, Math.round(len / 14));
    const barReach = Math.max(5, Math.min(14, len * 0.13));
    const bars = Array.from({ length: numBars + 1 }, (_, i) => {
      const t  = i / numBars;
      const bx = x1 + t * (x2 - x1);
      const by = y1 + t * (y2 - y1);
      // When open, bars are offset to simulate raised portcullis
      const shift = isOpen ? -barReach * 1.2 : 0;
      return (
        <Line key={i}
          points={[bx + px * (shift - barReach), by + py * (shift - barReach),
                   bx + px * (shift + barReach), by + py * (shift + barReach)]}
          stroke={color} strokeWidth={isOpen ? 1.5 : 2.5} lineCap="round" listening={false} />
      );
    });
    return (
      <Group>
        <Line points={[x1, y1, x2, y2]} stroke={color} strokeWidth={2.5} lineCap="round" listening={false} />
        {bars}
        {/* Second crossbar when closed */}
        {!isOpen && (
          <Line points={[x1 + px * barReach * 0.6, y1 + py * barReach * 0.6,
                         x2 + px * barReach * 0.6, y2 + py * barReach * 0.6]}
            stroke={color} strokeWidth={1.5} lineCap="round" listening={false} />
        )}
      </Group>
    );
  }

  // ── Standard / Heavy ──────────────────────────────────────────────────────
  const sw = style === 'heavy' ? 5 : 3.5;

  if (isOpen) {
    // Panel swung 90° from hinge at (x1,y1)
    const panelX = x1 + px * len;
    const panelY = y1 + py * len;
    const swingArc = arcPts(x1, y1, len, doorAngle, perpAngle);

    return (
      <Group>
        {/* Ghost of door frame */}
        <Line points={[x1, y1, x2, y2]}
          stroke="#374151" strokeWidth={1} dash={[5, 4]} lineCap="round" listening={false} />
        {/* Swing arc */}
        <Line points={swingArc} stroke={color + '55'} strokeWidth={1} listening={false} />
        {/* Open panel */}
        <Line points={[x1, y1, panelX, panelY]}
          stroke={color} strokeWidth={sw} lineCap="round" listening={false} />
        {/* Hinge */}
        <Circle x={x1} y={y1} radius={3} fill={color} listening={false} />
        {/* Handle */}
        <Circle x={panelX} y={panelY} radius={2.5} fill={color} listening={false} />
      </Group>
    );
  }

  // Closed
  const swingArc = arcPts(x1, y1, len, doorAngle, perpAngle);

  return (
    <Group>
      {/* Swing arc */}
      <Line points={swingArc} stroke={color + '55'} strokeWidth={1} listening={false} />
      {/* Door panel */}
      <Line points={[x1, y1, x2, y2]}
        stroke={color} strokeWidth={sw} lineCap="round" listening={false} />
      {style === 'heavy' && (
        // Reinforcement edge line
        <Line points={[x1 + px * 2, y1 + py * 2, x2 + px * 2, y2 + py * 2]}
          stroke={color + '80'} strokeWidth={1.5} lineCap="round" listening={false} />
      )}
      {/* Hinge */}
      <Circle x={x1} y={y1} radius={3} fill={color} listening={false} />
      {/* Handle — offset slightly to one side so it's visible */}
      <Circle x={(x1 + x2) / 2 + px * 4} y={(y1 + y2) / 2 + py * 4}
        radius={2.5} fill={color} listening={false} />
    </Group>
  );
}

// ── Light source shapes ───────────────────────────────────────────────────────

function LightShape({ light }) {
  const brightR = light.bright_radius || 60;
  const dimR    = light.dim_radius    || brightR * 2;
  const col     = light.color || '#fbbf24';
  const spread  = light.spread_angle ?? 360;
  const dir     = light.direction ?? 0;
  const isDirectional = spread < 360;
  // Konva Wedge: rotation is start angle (degrees, clockwise from east); angle is the sweep
  const wedgeRot = dir - spread / 2;
  return (
    <Group>
      {isDirectional ? (
        <>
          <Wedge x={light.x} y={light.y} radius={dimR} angle={spread} rotation={wedgeRot}
            fill={col + '0d'} stroke={col + '59'} strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Wedge x={light.x} y={light.y} radius={brightR} angle={spread} rotation={wedgeRot}
            fill={col + '21'} stroke={col + 'bf'} strokeWidth={1.5} listening={false} />
          {/* Direction indicator line */}
          <Line
            points={[light.x, light.y, light.x + Math.cos(dir * Math.PI / 180) * dimR, light.y + Math.sin(dir * Math.PI / 180) * dimR]}
            stroke={col + '80'} strokeWidth={1} dash={[4, 3]} listening={false}
          />
        </>
      ) : (
        <>
          <Circle x={light.x} y={light.y} radius={dimR}
            fill={col + '0d'} stroke={col + '59'}
            strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Circle x={light.x} y={light.y} radius={brightR}
            fill={col + '21'} stroke={col + 'bf'}
            strokeWidth={1.5} listening={false} />
        </>
      )}
      <Circle x={light.x} y={light.y} radius={4} fill={col} listening={false} />
    </Group>
  );
}

function LightPreview({ preview, gridSize }) {
  if (!preview) return null;
  const { cx, cy, brightR, direction = 0, spread = 360 } = preview;
  const dimR = brightR * 2;
  const brightFt = pxToFt(brightR, gridSize);
  const dimFt    = pxToFt(dimR, gridSize);
  const isDirectional = spread < 360;
  // Konva Wedge: rotation = start angle (clockwise from east), angle = sweep
  const wedgeRot = direction - spread / 2;
  // Guide line tip in drag direction
  const dirRad = direction * Math.PI / 180;
  const tipX = cx + Math.max(4, brightR) * Math.cos(dirRad);
  const tipY = cy + Math.max(4, brightR) * Math.sin(dirRad);
  // Label placed just past the tip
  const labelX = cx + (Math.max(4, brightR) + 6) * Math.cos(dirRad);
  const labelY = cy + (Math.max(4, brightR) + 6) * Math.sin(dirRad) - 11;
  const labelW = 96;

  return (
    <Group>
      {isDirectional ? (
        <>
          <Wedge x={cx} y={cy} radius={Math.max(4, dimR)} angle={spread} rotation={wedgeRot}
            fill="rgba(251,191,36,0.04)" stroke="rgba(251,191,36,0.4)"
            strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Wedge x={cx} y={cy} radius={Math.max(4, brightR)} angle={spread} rotation={wedgeRot}
            fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.8)"
            strokeWidth={1.5} dash={[4, 3]} listening={false} />
        </>
      ) : (
        <>
          <Circle x={cx} y={cy} radius={Math.max(4, dimR)}
            fill="rgba(251,191,36,0.04)" stroke="rgba(251,191,36,0.4)"
            strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Circle x={cx} y={cy} radius={Math.max(4, brightR)}
            fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.8)"
            strokeWidth={1.5} dash={[4, 3]} listening={false} />
        </>
      )}
      {/* Direction guide line */}
      {brightR > 4 && (
        <Line points={[cx, cy, tipX, tipY]}
          stroke="rgba(251,191,36,0.5)" strokeWidth={1} dash={[4, 3]} listening={false} />
      )}
      {/* Centre dot */}
      <Circle x={cx} y={cy} radius={4} fill="#fbbf24" listening={false} />
      {/* Radius label */}
      {brightR > 4 && (
        <>
          <Rect x={labelX} y={labelY} width={labelW} height={22}
            fill="rgba(0,0,0,0.72)" cornerRadius={4} listening={false} />
          <Text x={labelX} y={labelY + 4} width={labelW} align="center"
            text={`${brightFt} / ${dimFt} ft`}
            fill="#fbbf24" fontSize={12} fontStyle="bold" listening={false} />
        </>
      )}
    </Group>
  );
}

// ── Spell template shapes (DM-only) ─────────────────────────────────────────
function colorToFillStroke(color) {
  const c = typeof color === 'string' && color.startsWith('#') ? color : '#a855f7';
  // Use the hex color directly for stroke; build a translucent fill from it.
  // Simple approach: parse rgb and emit rgba.
  const h = c.replace('#', '');
  const norm = h.length === 3 ? h.split('').map(x => x + x).join('') : (h.length === 8 ? h.slice(0, 6) : h);
  const n = parseInt(norm, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return {
    fill:   `rgba(${r},${g},${b},0.18)`,
    stroke: `rgba(${r},${g},${b},0.95)`,
    previewFill:   `rgba(${r},${g},${b},0.10)`,
    previewStroke: `rgba(${r},${g},${b},0.75)`,
  };
}

// `gridSize` is needed for line templates (1ft width = gridSize/5).
// Callers without grid context can fall back to the default 50 px/cell
// the host ships with — the line still renders correctly, just at
// whatever the default cell size implies.
function templateShapeProps(t, fill, stroke, dash, gridSize = 50) {
  if (!t || !t.points) return null;
  const p = t.points;
  if (t.type === 'circle' && p.length >= 3) {
    return { kind: 'circle', x: p[0], y: p[1], radius: Math.max(2, p[2]), fill, stroke, dash };
  }
  if (t.type === 'square' && p.length >= 4) {
    const x = Math.min(p[0], p[2]), y = Math.min(p[1], p[3]);
    const w = Math.abs(p[2] - p[0]), h = Math.abs(p[3] - p[1]);
    return { kind: 'rect', x, y, width: w, height: h, fill, stroke, dash };
  }
  if (t.type === 'line' && p.length >= 4) {
    // Line templates are rendered as a thin rotated rectangle: 1 ft
    // wide (gridSize / 5 since one cell = 5 ft in 5e), with the
    // length being whatever the DM dragged. Plugins (e.g. elemental-
    // templates) read `ax/ay` as the source point and `bx/by` as the
    // tip so directional effects can flow along the line.
    const ax = p[0], ay = p[1], bx = p[2], by = p[3];
    const dx = bx - ax, dy = by - ay;
    const length = Math.hypot(dx, dy);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const LINE_WIDTH_FT = 1;
    const widthPx = (LINE_WIDTH_FT / 5) * (gridSize || 50);
    return {
      kind: 'line',
      ax, ay, bx, by, length, angleDeg, widthPx,
      points: [ax, ay, bx, by],         // legacy callers still expect this
      fill, stroke, dash,
    };
  }
  if (t.type === 'cone' && p.length >= 4) {
    const dx = p[2] - p[0], dy = p[3] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return { kind: 'wedge', x: p[0], y: p[1], radius: len, angle: 60, rotation: ang - 30, fill, stroke, dash };
  }
  return null;
}

function TemplateShape({ template, isSelected = false, gridSize = 50 }) {
  const { fill, stroke } = colorToFillStroke(template.color);
  const dash = isSelected ? [3, 2] : [6, 3];
  const sw = isSelected ? 2.5 : 1.5;
  const props = templateShapeProps(template, fill, stroke, dash, gridSize);
  if (!props) return null;
  return (
    <>
      {props.kind === 'circle' && <Circle x={props.x} y={props.y} radius={props.radius} fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {props.kind === 'rect'   && <Rect x={props.x} y={props.y} width={props.width} height={props.height} fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {props.kind === 'wedge'  && <Wedge x={props.x} y={props.y} radius={props.radius} angle={props.angle} rotation={props.rotation} fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {/* Line is now a rotated 1ft-wide rectangle: positioned at the
          line's start (ax, ay), rotated by angleDeg, with offsetY set
          to half-width so the rect's vertical centre sits exactly on
          the dragged line. Length = the user's drag distance. */}
      {props.kind === 'line'   && <Rect
        x={props.ax} y={props.ay}
        width={props.length} height={props.widthPx}
        offsetY={props.widthPx / 2}
        rotation={props.angleDeg}
        fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {template.label && (
        <Text x={(template.points[0] || 0) + 6} y={(template.points[1] || 0) + 6}
          text={template.label} fill={props.stroke} fontSize={11} fontStyle="bold" listening={false} />
      )}
    </>
  );
}

// Wraps a TemplateShape with any plugin-supplied decorators. Plugins
// register a function (template, baseProps) => ReactNode in the
// spellTemplateDecorators registry; we render its output above the base
// shape inside the same Group, so plugin overlays move with the template
// and respect the same Layer ordering. Decorators that throw are swallowed
// so a single bad plugin can't crash the whole map.
function TemplateShapeWithDecorators({ template, isSelected = false, gridSize = 50 }) {
  // Subscribe so live-disabled plugins drop out of the render immediately.
  useRegistryVersion();
  const decorators = pluginRegistries.spellTemplateDecorators;
  // Compute the same shape props the base TemplateShape would, so plugin
  // decorators can position relative to the underlying geometry without
  // re-deriving it.
  const { fill, stroke } = colorToFillStroke(template.color);
  const baseProps = templateShapeProps(template, fill, stroke, isSelected ? [3, 2] : [6, 3], gridSize);
  return (
    <>
      <TemplateShape template={template} isSelected={isSelected} gridSize={gridSize} />
      {decorators.size > 0 && Array.from(decorators.entries()).map(([pid, fn]) => {
        try {
          const node = fn(template, baseProps);
          return node ? <React.Fragment key={pid}>{node}</React.Fragment> : null;
        } catch (err) {
          console.warn(`spellTemplateDecorator "${pid}" threw:`, err);
          return null;
        }
      })}
    </>
  );
}

function TemplatePreview({ preview, gridSize }) {
  const { previewFill, previewStroke } = colorToFillStroke(preview?.color || '#a855f7');
  if (!preview) return null;
  const props = templateShapeProps(preview, previewFill, previewStroke, [4, 3], gridSize);
  if (!props) return null;

  // Live feet readout while dragging — matches the style used by the
  // measurement tool's MeasureOverlay (black rounded chip + bold label).
  // Position varies per shape so the label sits next to the bit the DM
  // is actually adjusting (centre for circles, far corner for squares,
  // tip for cones, midpoint for lines).
  function readoutNode() {
    if (!gridSize) return null;
    // Big, easily-readable chip — sized for a DM zoomed out to see the
    // whole battlefield rather than zoomed in on the click. Tweak both
    // CHIP_H and FONT_SIZE together to keep the text vertically centred.
    const FONT_SIZE = 36;
    const CHIP_H    = 54;
    const TEXT_PAD  = 8;        // vertical offset to centre text in chip
    const CHIP_PAD  = 20;       // horizontal padding inside chip
    const APPROX_CHAR_W = FONT_SIZE * 0.62;
    const chipFor = (text) => Math.max(140, Math.ceil(text.length * APPROX_CHAR_W) + CHIP_PAD * 2);

    const labelStyle = {
      fill: 'rgba(0,0,0,0.82)',
      stroke: 'rgba(255,255,255,0.18)',
      strokeWidth: 1,
      cornerRadius: 6,
      listening: false,
    };
    const textStyle = {
      fill: props.stroke,
      fontSize: FONT_SIZE,
      fontStyle: 'bold',
      listening: false,
    };

    if (props.kind === 'circle') {
      const ft = pxToFt(props.radius, gridSize);
      const text = `r = ${ft} ft`;
      const w = chipFor(text);
      const lx = props.x - w / 2;
      const ly = props.y - props.radius - CHIP_H - 8;
      return (
        <>
          <Rect x={lx} y={ly} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={lx} y={ly + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    if (props.kind === 'rect') {
      // Squares are drawn corner-to-corner — show width × height in ft so
      // the DM gets both axes if they're not perfectly square.
      const wFt = pxToFt(props.width,  gridSize);
      const hFt = pxToFt(props.height, gridSize);
      const text = wFt === hFt ? `${wFt} ft` : `${wFt} × ${hFt} ft`;
      const w = chipFor(text);
      const lx = props.x + props.width / 2 - w / 2;
      const ly = props.y - CHIP_H - 8;
      return (
        <>
          <Rect x={lx} y={ly} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={lx} y={ly + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    if (props.kind === 'wedge') {
      // Cone: place the chip at the tip along the cone's centerline so
      // the reading sits next to the part the DM is dragging.
      const ft = pxToFt(props.radius, gridSize);
      const text = `${ft} ft`;
      const w = chipFor(text);
      const midRad = (props.rotation + props.angle / 2) * Math.PI / 180;
      const tipX = props.x + Math.cos(midRad) * (props.radius + 40);
      const tipY = props.y + Math.sin(midRad) * (props.radius + 40);
      return (
        <>
          <Rect x={tipX - w / 2} y={tipY - CHIP_H / 2} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={tipX - w / 2} y={tipY - CHIP_H / 2 + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    if (props.kind === 'line') {
      const [x1, y1, x2, y2] = props.points;
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 1) return null;
      const ft = pxToFt(len, gridSize);
      const text = `${ft} ft`;
      const w = chipFor(text);
      // Offset the chip perpendicular to the line so it doesn't sit
      // directly on top of the line.
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const off = CHIP_H / 2 + 6;
      const px = -uy * off, py = ux * off;
      const mx = (x1 + x2) / 2 + px;
      const my = (y1 + y2) / 2 + py;
      return (
        <>
          <Rect x={mx - w / 2} y={my - CHIP_H / 2} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={mx - w / 2} y={my - CHIP_H / 2 + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    return null;
  }

  return (
    <>
      {props.kind === 'circle' && <Circle x={props.x} y={props.y} radius={props.radius} fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={props.dash} listening={false} />}
      {props.kind === 'rect'   && <Rect x={props.x} y={props.y} width={props.width} height={props.height} fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={props.dash} listening={false} />}
      {props.kind === 'wedge'  && <Wedge x={props.x} y={props.y} radius={props.radius} angle={props.angle} rotation={props.rotation} fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={props.dash} listening={false} />}
      {/* Live preview while drawing — rotated 1ft-wide rectangle so
          the player sees the actual area-of-effect shape, not a thin
          line that the final render would replace. */}
      {props.kind === 'line'   && <Rect
        x={props.ax} y={props.ay}
        width={props.length} height={props.widthPx}
        offsetY={props.widthPx / 2}
        rotation={props.angleDeg}
        fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={[4, 3]} listening={false} />}
      {readoutNode()}
    </>
  );
}

function findNearestTemplate(mapX, mapY, templates, threshold, gridSize = 50) {
  let nearest = null, minDist = threshold;
  for (const t of templates) {
    const p = t.points || [];
    let d = Infinity;
    if (t.type === 'circle' && p.length >= 3) {
      const distFromCentre = Math.hypot(mapX - p[0], mapY - p[1]);
      d = distFromCentre <= p[2] ? 0 : distFromCentre - p[2];
    } else if (t.type === 'square' && p.length >= 4) {
      const x1 = Math.min(p[0], p[2]), y1 = Math.min(p[1], p[3]);
      const x2 = Math.max(p[0], p[2]), y2 = Math.max(p[1], p[3]);
      if (mapX >= x1 && mapX <= x2 && mapY >= y1 && mapY <= y2) d = 0;
      else d = Math.min(Math.abs(mapX - x1), Math.abs(mapX - x2), Math.abs(mapY - y1), Math.abs(mapY - y2));
    } else if (t.type === 'line' && p.length >= 4) {
      // Line templates are now rotated 1ft-wide rectangles. Hit-test
      // by rotating the click into the rect's local frame, where the
      // rect spans (0..length, -halfW..halfW). Click "inside" → 0;
      // click "outside" → distance to the nearest rect edge.
      const ax = p[0], ay = p[1], bx = p[2], by = p[3];
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) {
        d = Math.hypot(mapX - ax, mapY - ay);
      } else {
        const halfW = ((1 / 5) * (gridSize || 50)) / 2;
        const ux = dx / len, uy = dy / len;
        const vx = mapX - ax, vy = mapY - ay;
        const along = vx * ux + vy * uy;
        const perp  = vx * (-uy) + vy * ux;
        if (along >= 0 && along <= len && Math.abs(perp) <= halfW) {
          d = 0;
        } else {
          const cAlong = Math.max(0, Math.min(len, along));
          const cPerp  = Math.max(-halfW, Math.min(halfW, perp));
          d = Math.hypot(along - cAlong, perp - cPerp);
        }
      }
    } else if (t.type === 'cone' && p.length >= 4) {
      // Old version returned `hypot(mapX-p[0], mapY-p[1])` — distance
      // from the cone's apex only. That meant clicking ANY direction
      // 30 px away from the apex registered as a hit, including the
      // half of the map BEHIND the caster, which is why the DM saw
      // templates jump when they thought they were clicking empty
      // ground. Proper hit-test:
      //   - inside the 60° wedge AND within range  → 0
      //   - outside the wedge angular range        → perp distance to
      //                                              the nearest cone edge
      //   - past the cone's tip but still inside
      //     the wedge angular range                → distance past the arc
      const dx = p[2] - p[0], dy = p[3] - p[1];
      const len = Math.hypot(dx, dy);
      const vx = mapX - p[0], vy = mapY - p[1];
      const distFromApex = Math.hypot(vx, vy);
      const HALF_ANG = Math.PI / 6;       // 30° → 60° total wedge
      if (len === 0 || distFromApex === 0) {
        d = 0;
      } else {
        const coneAng  = Math.atan2(dy, dx);
        const clickAng = Math.atan2(vy, vx);
        let delta = clickAng - coneAng;
        while (delta >  Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        if (Math.abs(delta) <= HALF_ANG) {
          d = distFromApex <= len ? 0 : distFromApex - len;
        } else {
          // Perpendicular distance to whichever edge is on the
          // click's side. Edge runs from apex out to (cos*len, sin*len).
          const sign = delta > 0 ? 1 : -1;
          const edgeAng = coneAng + sign * HALF_ANG;
          const ex = Math.cos(edgeAng), ey = Math.sin(edgeAng);
          const along = vx * ex + vy * ey;
          if (along <= 0)        d = distFromApex;
          else if (along >= len) d = Math.hypot(vx - ex * len, vy - ey * len);
          else                   d = Math.abs(vx * (-ey) + vy * ex);
        }
      }
    }
    if (d < minDist) { minDist = d; nearest = { template: t, dist: d }; }
  }
  return nearest;
}

function DarknessZone({ dz }) {
  const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
  const { x: cx, y: cy } = zoneCentroid(dz);
  return (
    <Group>
      {isPolygon
        ? <Line points={dz.poly_points} closed fill="rgba(88,28,135,0.30)" stroke="rgba(147,51,234,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
        : <Circle x={dz.x} y={dz.y} radius={dz.radius} fill="rgba(88,28,135,0.30)" stroke="rgba(147,51,234,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
      }
      <Circle x={cx} y={cy} radius={5} fill="rgba(167,139,250,0.9)" stroke="none" listening={false} />
    </Group>
  );
}

function FogZone({ dz }) {
  const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
  const { x: cx, y: cy } = zoneCentroid(dz);
  return (
    <Group>
      {isPolygon
        ? <Line points={dz.poly_points} closed fill="rgba(100,116,139,0.28)" stroke="rgba(148,163,184,0.80)" strokeWidth={2} dash={[6, 3]} listening={false} />
        : <Circle x={dz.x} y={dz.y} radius={dz.radius} fill="rgba(100,116,139,0.28)" stroke="rgba(148,163,184,0.80)" strokeWidth={2} dash={[6, 3]} listening={false} />
      }
      <Circle x={cx} y={cy} radius={5} fill="rgba(203,213,225,0.9)" stroke="none" listening={false} />
    </Group>
  );
}

function WaterZone({ dz }) {
  const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
  const { x: cx, y: cy } = zoneCentroid(dz);
  return (
    <Group>
      {isPolygon
        ? <Line points={dz.poly_points} closed fill="rgba(14,116,144,0.18)" stroke="rgba(6,182,212,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
        : <Circle x={dz.x} y={dz.y} radius={dz.radius} fill="rgba(14,116,144,0.18)" stroke="rgba(6,182,212,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
      }
      <Circle x={cx} y={cy} radius={5} fill="rgba(103,232,249,0.9)" stroke="none" listening={false} />
    </Group>
  );
}

function DarknessPreview({ preview, gridSize, isFog = false, isWater = false }) {
  if (!preview) return null;
  const fillColor   = isWater ? 'rgba(14,116,144,0.18)'  : isFog ? 'rgba(100,116,139,0.18)' : 'rgba(88,28,135,0.18)';
  const strokeColor = isWater ? 'rgba(6,182,212,0.85)'   : isFog ? 'rgba(148,163,184,0.85)' : 'rgba(147,51,234,0.85)';
  const lineColor   = isWater ? 'rgba(6,182,212,0.5)'    : isFog ? 'rgba(148,163,184,0.5)'  : 'rgba(147,51,234,0.5)';
  const dotColor    = isWater ? 'rgba(103,232,249,0.9)'  : isFog ? 'rgba(203,213,225,0.9)'  : 'rgba(167,139,250,0.9)';
  const textColor   = isWater ? '#22d3ee'                : isFog ? '#94a3b8'                : '#c084fc';

  // Polygon drawing in-progress
  if (preview.isPolygon) {
    const { points, cursorX, cursorY } = preview;
    const n = points.length / 2;
    const livePts = (cursorX != null && n > 0) ? [...points, cursorX, cursorY] : points;
    return (
      <Group>
        {livePts.length >= 4 && (
          <Line points={livePts} closed={false}
            fill="transparent" stroke={strokeColor}
            strokeWidth={2} dash={[6, 3]} listening={false} />
        )}
        {/* Faint closing segment so you can see where the polygon will close */}
        {cursorX != null && n >= 2 && (
          <Line points={[cursorX, cursorY, points[0], points[1]]}
            stroke={strokeColor} strokeWidth={1} dash={[4, 3]} opacity={0.35} listening={false} />
        )}
        {/* Vertex dots */}
        {Array.from({ length: n }, (_, i) => (
          <Circle key={i} x={points[i * 2]} y={points[i * 2 + 1]}
            radius={i === 0 ? 6 : 4}
            fill={i === 0 ? strokeColor : dotColor}
            stroke={i === 0 ? 'white' : 'none'} strokeWidth={1}
            listening={false} />
        ))}
      </Group>
    );
  }

  // Circle drawing
  const { cx, cy, r } = preview;
  const ft = pxToFt(r, gridSize);
  const labelX = cx + Math.max(4, r) + 6;
  const labelY = cy - 11;
  const labelW = 82;
  return (
    <Group>
      <Circle x={cx} y={cy} radius={Math.max(4, r)}
        fill={fillColor} stroke={strokeColor}
        strokeWidth={2} dash={[6, 3]} listening={false} />
      {r > 4 && (
        <Line points={[cx, cy, cx + r, cy]}
          stroke={lineColor} strokeWidth={1} dash={[4, 3]} listening={false} />
      )}
      <Circle x={cx} y={cy} radius={4} fill={dotColor} listening={false} />
      {r > 4 && (
        <>
          <Rect x={labelX} y={labelY} width={labelW} height={22}
            fill="rgba(0,0,0,0.72)" cornerRadius={4} listening={false} />
          <Text x={labelX} y={labelY + 4} width={labelW} align="center"
            text={`r = ${ft} ft`}
            fill={textColor} fontSize={12} fontStyle="bold" listening={false} />
        </>
      )}
    </Group>
  );
}

// ── Map image — uses natural dimensions ───────────────────────────────────────

function MapImage({ src, onDims }) {
  const [img] = useImage(src, 'anonymous');
  useEffect(() => {
    if (!img) return;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w && h) onDims(w, h);
  }, [img, onDims]);
  if (!img) return null;
  return <KonvaImage image={img} listening={false} />;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MapStage({
  mapUrl, mapWidth, mapHeight, gridSize,
  tokens, isPlayer, isSpectator = false,
  onTokenMove, selectedTokenId, onTokenSelect,
  onMapClick, placingToken,
  activeTool = 'pan',
  gridColor = 'rgba(0,0,0,0.35)',
  gridThickness = 0.7,
  playerTokenId = null,
  // Walls / doors / lights / fog
  walls = [],
  doors = [],
  lights = [],
  fogOfWar = false,
  fowBlur = 16,
  fowColor = '#000000',
  ambientLight = 'bright',
  onWallAdd = null,
  onWallDelete = null,
  onDoorAdd = null,
  onDoorDelete = null,
  onDoorToggle = null,
  onDoorFlip = null,
  onLightAdd = null,
  onLightDelete = null,
  onLightSelect = null,
  magicalDarkness = [],
  onMagicalDarknessAdd = null,
  onMagicalDarknessDelete = null,
  onZoneFeatherChange = null,
  spawnPoint = null,
  onSetSpawnPoint = null,
  dmMarkers = [],
  onDmMarkerClick = null,
  centerOnMapPoint = null,
  activeLightSpread = 360,
  fitToMap = false,
  currentCombatTokenId = null,
  onMeasureChange = null,
  remoteMeasurements = [],
  spellTemplates = [],
  onTemplatePlace = null,
  onTemplateDelete = null,
  onTemplateUpdate = null,
  onTemplateSelect = null,
  selectedTemplateId = null,
  tokenNameFontSize = 45,
  onTokenContextMenu = null,
  // Named per-map spawn points (Phase 2 — split-the-party):
  // an array of { id, label, grid_col, grid_row }. Glyphs are DM-only.
  // The 'spawn-named' tool fires `onSpawnNamedAdd(col, row)` on click;
  // the parent prompts for a label and emits the socket event itself.
  spawnPoints = [],
  // Fired when the DM finalises a polygon (Enter / double-click) with
  // the spawn-named tool. Parent collects the points + label and
  // persists via add_spawn_point.
  onSpawnNamedAdd = null,
  // Fired when the DM drags an existing named spawn-point glyph to a
  // new tile. Parent persists via the update_spawn_point socket event.
  onSpawnPointMove = null,
  // Map-terrain rendering. Each item carries its library-joined
  // metadata (lib_image_path, blocks_*, hide_until_revealed, etc.).
  // Players never receive hidden terrain at the network layer, so
  // every item we get here is renderable. The parent owns
  // drag/resize/right-click callbacks below.
  terrain = [],
  onTerrainMove = null,
  onTerrainResize = null,
  onTerrainContextMenu = null,
  // When non-null the DM is in "place from library" mode — clicking
  // the canvas drops a piece at the click point.
  pendingTerrain = null,
  onTerrainPlace = null,
  // The id of the currently-selected terrain (null = none). Used by
  // the canvas to render resize handles around the selected piece.
  selectedTerrainId = null,
  onTerrainSelect = null,
}) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const submergedTokensLayerRef = useRef(null);
  const aboveWaterTokensLayerRef = useRef(null);
  const onZoneFeatherChangeRef = useRef(onZoneFeatherChange);
  useEffect(() => { onZoneFeatherChangeRef.current = onZoneFeatherChange; }, [onZoneFeatherChange]);

  // Refs so the animation loop can read the latest LoS/FoW state each frame
  // without being restarted on every change.
  const visPolysRef  = useRef([]);
  const fogOfWarRef  = useRef(fogOfWar);
  useEffect(() => { fogOfWarRef.current = fogOfWar; }, [fogOfWar]);

  const [featherZoneId, setFeatherZoneId] = useState(null);
  const [featherValue,  setFeatherValue]  = useState(0);
  useEffect(() => { if (activeTool !== 'zone-feather') setFeatherZoneId(null); }, [activeTool]);

  // Track which tokens were most recently moved so we can render them last
  // (i.e. on top) — keeps the moved token's HP card visible above neighbours
  // when several stack up. Bumps come from any source: local drag, socket
  // updates from another client. tokenZBumps is a stable Map of id → epoch
  // ms; the renderer sorts ascending so the freshest move ends up on top.
  const [tokenZBumps, setTokenZBumps] = useState(() => new Map());
  const prevTokenPosRef = useRef(new Map());
  useEffect(() => {
    const prev = prevTokenPosRef.current;
    const next = new Map();
    const bumps = [];
    for (const t of tokens) {
      const key = `${t.grid_col},${t.grid_row}`;
      next.set(t.id, key);
      const old = prev.get(t.id);
      if (old !== undefined && old !== key) bumps.push(t.id);
    }
    prevTokenPosRef.current = next;
    if (bumps.length > 0) {
      setTokenZBumps(prev => {
        const m = new Map(prev);
        const now = Date.now();
        for (const id of bumps) m.set(id, now + bumps.indexOf(id));
        return m;
      });
    }
  }, [tokens]);
  function sortByZBump(list) {
    return [...list].sort((a, b) => {
      const ab = tokenZBumps.get(a.id);
      const bb = tokenZBumps.get(b.id);
      if (ab == null && bb == null) return 0;
      if (ab == null) return -1;
      if (bb == null) return 1;
      return ab - bb;
    });
  }
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });

  // Force fog/glow canvases to redraw when the browser tab becomes visible again.
  // Browsers can clear canvas contents when a tab is hidden under memory pressure.
  const [visibilityTick, setVisibilityTick] = useState(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setVisibilityTick(n => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Stage transform — kept in both refs (for handlers) and state (for rendering)
  const scaleRef = useRef(1);
  const posRef   = useRef({ x: 0, y: 0 });
  const [scale, _setScale] = useState(1);
  const [pos,   _setPos]   = useState({ x: 0, y: 0 });
  const setScale = (s) => { scaleRef.current = s; _setScale(s); };
  const setPos   = (p) => { posRef.current = p;   _setPos(p); };

  // Fit the entire map into view — fires whenever the map URL changes (new map loaded).
  // Reads the container's real pixel size via getBoundingClientRect so the calculation
  // is never based on the stateSize default of 800x600. stageSize is kept as a dep
  // so the effect re-runs once the ResizeObserver has measured the real size.
  const fittedMapUrlRef = useRef(null);
  useEffect(() => {
    if (!fitToMap || !mapWidth || !mapHeight || !mapUrl) return;
    if (fittedMapUrlRef.current === mapUrl) return;
    const el = containerRef.current;
    if (!el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    if (w <= 0 || h <= 0) return;
    fittedMapUrlRef.current = mapUrl;
    const fitScale = Math.min((w * 0.9) / mapWidth, (h * 0.9) / mapHeight);
    setScale(fitScale);
    setPos({
      x: (w - mapWidth * fitScale) / 2,
      y: (h - mapHeight * fitScale) / 2,
    });
  }, [fitToMap, stageSize, mapWidth, mapHeight, mapUrl]);

  // Center the view on a given map point. The parent drives re-centring
  // by setting a *new* `centerOnMapPoint` reference each time it wants
  // a recentre — initial load AND after every map transition. Same-
  // reference re-renders don't trigger this since the dep is the
  // object identity.
  useEffect(() => {
    if (!centerOnMapPoint) return;
    if (stageSize.w <= 0 || stageSize.h <= 0) return;
    setPos({
      x: stageSize.w / 2 - centerOnMapPoint.x * scaleRef.current,
      y: stageSize.h / 2 - centerOnMapPoint.y * scaleRef.current,
    });
  }, [centerOnMapPoint, stageSize]);

  // Panning / measuring state (refs — mutated without re-render)
  const panning   = useRef(false);
  const panStart  = useRef({ cx: 0, cy: 0, sx: 0, sy: 0 });
  const pinchDist = useRef(0);
  const measuring = useRef(false);
  const [meas, setMeas] = useState(null);
  const onMeasureChangeRef = useRef(onMeasureChange);
  useEffect(() => { onMeasureChangeRef.current = onMeasureChange; }, [onMeasureChange]);
  useEffect(() => { onMeasureChangeRef.current?.(meas); }, [meas]);

  // Token drag
  const tokenDragRef = useRef(null); // { tokenIds[], origPositions Map<id,{col,row}>, startMapX, startMapY }
  const [dragVis, setDragVis] = useState(null); // { positions: Map<tokenId, {x,y}> }
  const [multiSelected, setMultiSelected] = useState(() => new Set());
  // Mousedown is attached once with an empty-deps effect, so reading
  // `multiSelected` directly there sees a stale empty Set. Mirror it into a
  // ref that the handler can dereference for the current value.
  const multiSelectedRef = useRef(multiSelected);
  useEffect(() => { multiSelectedRef.current = multiSelected; }, [multiSelected]);
  const marqueeRef = useRef(null); // { startX, startY, additive }
  const [marqueeRect, setMarqueeRect] = useState(null); // { x, y, w, h }
  const templateDrawRef = useRef(null);
  const templateMoveRef = useRef(null); // { id, origPoints, startMapX, startMapY }
  const [templatePreview, setTemplatePreview] = useState(null);
  const [templateMovePreview, setTemplateMovePreview] = useState(null); // { id, points }
  const onTemplatePlaceRef  = useRef(onTemplatePlace);
  const onTemplateDeleteRef = useRef(onTemplateDelete);
  const onTemplateUpdateRef = useRef(onTemplateUpdate);
  const onTemplateSelectRef = useRef(onTemplateSelect);
  useEffect(() => { onTemplatePlaceRef.current  = onTemplatePlace;  }, [onTemplatePlace]);
  useEffect(() => { onTemplateDeleteRef.current = onTemplateDelete; }, [onTemplateDelete]);
  useEffect(() => { onTemplateUpdateRef.current = onTemplateUpdate; }, [onTemplateUpdate]);
  useEffect(() => { onTemplateSelectRef.current = onTemplateSelect; }, [onTemplateSelect]);

  // Wall drawing
  const wallDrawRef  = useRef(null);  // { type, startX, startY } for line/rect/circle
  const polyDrawRef  = useRef(null);  // [x1,y1,...] for in-progress polygon
  const [wallPreview, setWallPreview] = useState(null);

  // Light drawing
  const lightDrawRef = useRef(null);  // { startX, startY }
  const [lightPreview, setLightPreview] = useState(null); // { cx, cy, brightR }

  // Magical darkness drawing
  const darknessDrawRef = useRef(null); // { startX, startY } for circle draw
  const [darknessPreview, setDarknessPreview] = useState(null); // { cx,cy,r } or { isPolygon, points, cursorX, cursorY }
  const darkPolyDrawRef = useRef(null);  // [x1,y1,...] for in-progress polygon
  const darkPolyToolRef = useRef('darkness'); // tracks whether it's a fog or darkness polygon

  const wallsRef        = useRef(walls);
  const doorsRef        = useRef(doors);
  const lightsRef       = useRef(lights);
  const magicalDarknessRef = useRef(magicalDarkness);
  const onWallAddRef    = useRef(onWallAdd);
  const onWallDeleteRef = useRef(onWallDelete);
  const onDoorAddRef    = useRef(onDoorAdd);
  const onDoorDeleteRef = useRef(onDoorDelete);
  const onDoorToggleRef = useRef(onDoorToggle);
  const onDoorFlipRef   = useRef(onDoorFlip);
  const onLightAddRef    = useRef(onLightAdd);
  const onLightDeleteRef = useRef(onLightDelete);
  const onLightSelectRef = useRef(onLightSelect);
  const activeLightSpreadRef = useRef(activeLightSpread);
  const onMagicalDarknessAddRef    = useRef(onMagicalDarknessAdd);
  const onMagicalDarknessDeleteRef = useRef(onMagicalDarknessDelete);
  const onSetSpawnPointRef = useRef(onSetSpawnPoint);
  useEffect(() => { wallsRef.current        = walls;       }, [walls]);
  useEffect(() => { doorsRef.current        = doors;       }, [doors]);
  useEffect(() => { lightsRef.current       = lights;      }, [lights]);
  useEffect(() => { magicalDarknessRef.current = magicalDarkness; }, [magicalDarkness]);
  useEffect(() => { onWallAddRef.current    = onWallAdd;   }, [onWallAdd]);
  useEffect(() => { onWallDeleteRef.current = onWallDelete; }, [onWallDelete]);
  useEffect(() => { onDoorAddRef.current    = onDoorAdd;   }, [onDoorAdd]);
  useEffect(() => { onDoorDeleteRef.current = onDoorDelete; }, [onDoorDelete]);
  useEffect(() => { onDoorToggleRef.current = onDoorToggle; }, [onDoorToggle]);
  useEffect(() => { onDoorFlipRef.current   = onDoorFlip;  }, [onDoorFlip]);
  useEffect(() => { onLightAddRef.current    = onLightAdd;    }, [onLightAdd]);
  useEffect(() => { onLightDeleteRef.current = onLightDelete; }, [onLightDelete]);
  useEffect(() => { onLightSelectRef.current = onLightSelect; }, [onLightSelect]);
  useEffect(() => { activeLightSpreadRef.current = activeLightSpread; }, [activeLightSpread]);
  useEffect(() => { onMagicalDarknessAddRef.current    = onMagicalDarknessAdd;    }, [onMagicalDarknessAdd]);
  useEffect(() => { onMagicalDarknessDeleteRef.current = onMagicalDarknessDelete; }, [onMagicalDarknessDelete]);
  useEffect(() => { onSetSpawnPointRef.current = onSetSpawnPoint; }, [onSetSpawnPoint]);

  // Cancel in-progress wall draw when tool changes away from wall tools
  useEffect(() => {
    if (!WALL_DRAW_TOOLS.has(activeTool)) {
      if (polyDrawRef.current) {
        const pts = polyDrawRef.current;
        if (pts.length >= 6) onWallAddRef.current?.({ type: 'polygon', points: pts });
        polyDrawRef.current = null;
      }
      wallDrawRef.current = null;
      setWallPreview(null);
    }
  }, [activeTool]);

  // Discard a spawn polygon mid-draw if the DM picks a different tool.
  useEffect(() => {
    if (activeTool !== 'spawn-named') {
      spawnPolyDrawRef.current = null;
      setSpawnPolyPreview(null);
    }
  }, [activeTool]);

  // Cancel in-progress light draw when tool changes away from light tools
  useEffect(() => {
    if (!LIGHT_DRAW_TOOLS.has(activeTool)) {
      lightDrawRef.current = null;
      setLightPreview(null);
    }
  }, [activeTool]);

  // Cancel in-progress darkness draw when tool changes away from darkness tools
  useEffect(() => {
    if (!DARKNESS_DRAW_TOOLS.has(activeTool)) {
      darknessDrawRef.current = null;
      darkPolyDrawRef.current = null;
      setDarknessPreview(null);
    }
  }, [activeTool]);

  useEffect(() => {
    if (!TEMPLATE_TOOLS.has(activeTool)) {
      templateDrawRef.current = null;
      setTemplatePreview(null);
    }
    if (activeTool !== 'tpl-edit') {
      templateMoveRef.current = null;
      setTemplateMovePreview(null);
    }
    if (activeTool !== 'move') {
      marqueeRef.current = null;
      setMarqueeRect(null);
    }
  }, [activeTool]);


  // Natural image dims
  const [imgDims, setImgDims] = useState(null);
  const onDims = useCallback((w, h) => setImgDims({ w, h }), []);
  useEffect(() => { setImgDims(null); }, [mapUrl]);
  useEffect(() => { if (!MEASURE_TOOLS.has(activeTool)) setMeas(null); }, [activeTool]);

  const mW = imgDims?.w || mapWidth || 2000;
  const mH = imgDims?.h || mapHeight || 1500;

  // Grid offset — center the grid so partial cells are equal on all sides
  const offsetX = gridSize > 0 ? (mW % gridSize) / 2 : 0;
  const offsetY = gridSize > 0 ? (mH % gridSize) / 2 : 0;
  // Stable object ref — prevents Token memo from seeing a new object on every render
  const tokenOffset = useMemo(() => ({ x: offsetX, y: offsetY }), [offsetX, offsetY]);

  // Derive vision origins. Player view: just their own token. Spectator
  // view (TV): the union of every player token on the current map — the
  // audience-facing display reveals everything any party member can see.
  const visOrigins = useMemo(() => {
    if (!fogOfWar || !tokens) return [];
    function originsForToken(t) {
      if (!t) return [];
      const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
      const sensesArr = Array.isArray(t.senses) && t.senses.length > 0
        ? t.senses
        : [{ type: t.vision_type || 'normal', range: t.vision_range || 0 }];
      return sensesArr.map(s => ({
        x: cx, y: cy,
        visionType: s.type || 'normal',
        visionRangePx: (s.range || 0) > 0 ? (s.range) * (gridSize / 5) : 0,
      }));
    }
    if (isSpectator) {
      return (tokens || [])
        .filter(t => t.is_player && !t.is_hidden)
        .flatMap(originsForToken);
    }
    if (!playerTokenId) return [];
    const myToken = tokens.find(t => t.id === playerTokenId);
    return originsForToken(myToken);
  }, [fogOfWar, isSpectator, playerTokenId, tokens, offsetX, offsetY, gridSize]);

  // Visibility polygons for fog of war — per-origin, pass-based rendering.
  //
  // Each entry: { pts, passes }
  //   pts    – flat [x,y,...] LOS polygon (used for label visibility too)
  //   passes – ordered rendering passes, each clipping the LOS polygon to a
  //            specific illuminated area:
  //     { kind:'full',  alpha }                — entire LOS polygon
  //     { kind:'range', alpha, ox, oy, r }     — LOS ∩ vision-range circle
  //     { kind:'light', alpha, lx, ly, lr }    — LOS ∩ light-source circle
  //
  // Vision × ambient light matrix:
  //   bright  → everyone sees full LOS (light sources irrelevant)
  //   dim     → normal: half-alpha full + bright-zone upgrades from lights
  //             darkvision/truesight: full LOS full-alpha
  //             blindsight: range-clipped full-alpha
  //   dark    → normal: only light-source circles visible (dim ring α0.5, bright ring α1)
  //             darkvision: range-clipped half-alpha + bright-zone upgrades from lights
  //             truesight: full LOS full-alpha
  //             blindsight: range-clipped full-alpha
  // Tremorsense: detect non-flying grounded tokens within range as blips.
  // Does not contribute to FoW reveals — handled separately from visPolys.
  // Position-keyed LOS polygon cache. Recomputing LOS for every light on every
  // render is the single most expensive thing this component does — and a token
  // HP/initiative tick produces a new `tokens` array, invalidating any naive
  // useMemo that depends on tokens. The cache survives across renders and is
  // invalidated only when walls, doors, or map dimensions actually change, so
  // light sources whose position hasn't moved hit the cache instead of paying
  // for a fresh raycast.
  const losCacheRef = useRef({ key: '', polys: new Map() });
  function getCachedLightPoly(x, y, segs, cacheKey) {
    const cache = losCacheRef.current;
    if (cache.key !== cacheKey) {
      cache.polys.clear();
      cache.key = cacheKey;
    }
    // Round to 1px to dedupe near-identical positions; full px precision is
    // overkill for visibility computation.
    const k = `${Math.round(x)}|${Math.round(y)}`;
    let pts = cache.polys.get(k);
    if (!pts) {
      pts = computeVisibilityPolygon(x, y, segs, mW, mH);
      cache.polys.set(k, pts);
      // Cap cache to avoid unbounded growth during heavy token drags.
      if (cache.polys.size > 256) {
        const firstKey = cache.polys.keys().next().value;
        cache.polys.delete(firstKey);
      }
    }
    return pts;
  }

  const visPolys = useMemo(() => {
    if (!fogOfWar || visOrigins.length === 0 || mW <= 0 || mH <= 0) return [];
    const segs = [...wallsToSegments(walls), ...doorsToSegments(doors)];
    const ledges = (walls || []).map(w => ledgeData(w)).filter(Boolean);
    // Cache key for light LOS — only walls, doors, and map dims affect LOS.
    const losCacheKey = `${walls.length}#${walls.map(w => `${w.id || ''}:${(w.points || []).length}`).join(',')}#${doors.map(d => `${d.id}:${d.is_open}:${(d.points || []).length}`).join(',')}#${mW}x${mH}`;

    // Approximate each obscuring zone circle as 32 line segments so the
    // ray-casting LOS algorithm can treat the zone perimeter as an opaque wall.
    // Applies to both magical darkness and heavy obscuring fog.
    const darknessZones = (magicalDarkness || []).filter(dz => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water');
    const fogZones      = (magicalDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');

    function zoneToSegs(zones) {
      return zones.flatMap(dz => {
        if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
          const pts = dz.poly_points;
          const n = pts.length / 2;
          return Array.from({ length: n }, (_, i) => {
            const j = (i + 1) % n;
            return { ax: pts[i * 2], ay: pts[i * 2 + 1], bx: pts[j * 2], by: pts[j * 2 + 1] };
          });
        }
        const N = 32;
        const out = [];
        for (let i = 0; i < N; i++) {
          const a0 = (i / N) * Math.PI * 2;
          const a1 = ((i + 1) / N) * Math.PI * 2;
          out.push({
            ax: dz.x + Math.cos(a0) * dz.radius, ay: dz.y + Math.sin(a0) * dz.radius,
            bx: dz.x + Math.cos(a1) * dz.radius, by: dz.y + Math.sin(a1) * dz.radius,
          });
        }
        return out;
      });
    }
    const darknessSegs = zoneToSegs(darknessZones);
    // Fog zones are purely visual — they do NOT block LOS
    const segsWithDarkness = darknessSegs.length > 0 ? [...segs, ...darknessSegs] : segs;

    // Build token-attached lights from tokens that have a light source equipped.
    // Positions mirror the token centre calculation used in visOrigins.
    const offsetX = gridSize > 0 ? (mW % gridSize) / 2 : 0;
    const offsetY = gridSize > 0 ? (mH % gridSize) / 2 : 0;
    const tokenLights = (tokens || []).flatMap(t => {
      const brightFt = Number(t.token_light_bright) || 0;
      const dimFt    = Number(t.token_light_dim)    || 0;
      if (brightFt <= 0 && dimFt <= 0) return [];
      const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
      const pxPerFt = gridSize / FEET_PER_SQUARE;
      return [{ x: cx, y: cy, bright_radius: brightFt * pxPerFt, dim_radius: dimFt * pxPerFt, flicker: t.token_light_flicker !== false }];
    });

    // Pre-compute each light source's own LOS polygon (walls/doors block light).
    // Reused across all player origins so we only compute it once per light.
    const allLights = [...lights, ...tokenLights];
    const lightPolys = allLights.map(l => ({
      l,
      pts: getCachedLightPoly(l.x, l.y, segs, losCacheKey),
    }));

    return visOrigins.flatMap(origin => {
      if (origin.visionType === 'tremorsense') return []; // blips only, no FoW reveal
      const { x: ox, y: oy, visionType = 'normal', visionRangePx = 0 } = origin;

      // Check if this vision origin is inside magical darkness.
      // Normal vision and darkvision are suppressed; truesight/blindsight pierce it.
      // Heavy fog zones do NOT affect LOS — they are purely visual overlays.
      const inDarkness = darknessZones.some(
        dz => Math.hypot(ox - dz.x, oy - dz.y) <= dz.radius
      );

      const canPierceDarkness = visionType === 'truesight' || visionType === 'blindsight';

      const losSegs = canPierceDarkness ? segs : segsWithDarkness;
      const pts = computeVisibilityPolygon(ox, oy, losSegs, mW, mH);

      // Inside magical darkness with non-penetrating vision → completely blind.
      // (Handled in fog canvas by re-stamping with opaque black.)
      if (inDarkness && !canPierceDarkness) {
        return { pts, passes: [] };
      }

      // For non-truesight/non-blindsight, filter out light sources inside darkness zones.
      // Fog zones do not block lights — they are visual-only.
      const effectiveLightPolys = canPierceDarkness
        ? lightPolys
        : lightPolys.filter(({ l }) =>
            !darknessZones.some(dz => Math.hypot(l.x - dz.x, l.y - dz.y) <= dz.radius)
          );

      const passes = [];
      const rangeR = visionRangePx > 0 ? visionRangePx : 0;

      function lightPass(l, lp, alpha, lr) {
        return { kind: 'light', alpha, lx: l.x, ly: l.y, lr, lightPts: lp, ldir: l.direction ?? 0, lspread: l.spread_angle ?? 360, flicker: l.flicker !== false };
      }
      // Read an explicit radius from a light (respecting 0 as "none") with a
      // sensible fallback only when the field is missing entirely.
      function brightOf(l) { return l.bright_radius != null ? l.bright_radius : 60; }
      function dimOf(l)    { return l.dim_radius    != null ? l.dim_radius    : 120; }

      if (ambientLight === 'bright') {
        if ((visionType === 'blindsight' || visionType === 'truesight') && rangeR > 0) {
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR });
        } else {
          passes.push({ kind: 'full', alpha: 1.0 });
        }
      } else if (ambientLight === 'dim') {
        if (visionType === 'normal') {
          passes.push({ kind: 'full', alpha: 0.5 });
          // Upgrade areas inside a light source's bright zone to full visibility
          for (const { l, pts: lp } of effectiveLightPolys) {
            const br = brightOf(l);
            if (br > 0) passes.push(lightPass(l, lp, 1.0, br));
          }
        } else if (visionType === 'darkvision') {
          // Darkvision treats dim ambient as bright within range; dim beyond range
          if (rangeR > 0) {
            passes.push({ kind: 'full', alpha: 0.5 });  // dim everywhere in LOS
            passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR }); // bright within darkvision range
          } else {
            passes.push({ kind: 'full', alpha: 1.0 }); // unlimited darkvision = bright everywhere
          }
        } else if (visionType === 'truesight') {
          // Truesight: bright within range (ignores dim ambient and magical darkness)
          if (rangeR > 0) {
            passes.push({ kind: 'full', alpha: 0.5 });  // dim ambient everywhere in LOS
            passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR }); // bright within truesight range
          } else {
            passes.push({ kind: 'full', alpha: 1.0 }); // unlimited truesight
          }
        } else if (visionType === 'blindsight') {
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR > 0 ? rangeR : mW });
        }
      } else if (ambientLight === 'dark') {
        if (visionType === 'normal') {
          // Only areas illuminated by light sources are visible; light is blocked by walls
          for (const { l, pts: lp } of effectiveLightPolys) {
            const dr = dimOf(l), br = brightOf(l);
            if (dr > 0) passes.push(lightPass(l, lp, 0.5, dr));
            if (br > 0) passes.push(lightPass(l, lp, 1.0, br));
          }
        } else if (visionType === 'darkvision') {
          // Dark is treated as dim within darkvision range; darkvision also upgrades light dim zones to bright
          passes.push({ kind: 'range', alpha: 0.5, ox, oy, r: rangeR > 0 ? rangeR : mW });
          for (const { l, pts: lp } of effectiveLightPolys) {
            // Darkvision treats dim light as bright — upgrade entire dim zone of light source
            const dr = dimOf(l);
            if (dr > 0) passes.push(lightPass(l, lp, 1.0, dr));
          }
        } else if (visionType === 'truesight') {
          // Truesight sees perfectly regardless of lighting and magical darkness
          if (rangeR > 0) {
            passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR });
          } else {
            passes.push({ kind: 'full', alpha: 1.0 }); // unlimited truesight
          }
        } else if (visionType === 'blindsight') {
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR > 0 ? rangeR : mW });
        }
      }

      // Tokens inside a fog zone skip the main punch loop — their full LOS would
      // reveal everything through and beyond the fog.  The fog canvas handles a
      // light-aware 5ft visibility bubble for them after painting the grey overlay.
      const containingFogZone = !canPierceDarkness
        ? fogZones.find(fz => pointInZone(ox, oy, fz)) || null
        : null;

      // Ledges: when origin is on the "below" side of a ledge, the area on the far
      // side is only dimly visible. Collect dim polygons to overlay on the fog.
      const ledgeDimPolys = ledges
        .map(l => ledgeFarSidePolygon(l, ox, oy, mW, mH))
        .filter(Boolean);

      if (containingFogZone) {
        // Keep normal passes so outside-fog LOS is still punched in the main loop.
        // fogOrigin lets the fog canvas re-punch a 5ft bubble after the grey overlay.
        return [{ pts, passes, fogOrigin: { fz: containingFogZone, ox, oy, fogPasses: passes }, visionType, ox, oy, visionRangePx, ledgeDimPolys }];
      }
      return [{ pts, passes, fogOrigin: null, visionType, ox, oy, visionRangePx, ledgeDimPolys }];
    });
  }, [fogOfWar, visOrigins, walls, doors, mW, mH, ambientLight, lights, tokens, gridSize, magicalDarkness]);
  // Keep the ref in sync — declared here so visPolys is in scope
  useEffect(() => { visPolysRef.current = visPolys; }, [visPolys]);

  // Pre-compute label visibility per token so pointInPoly loops don't run inside render
  const tokenLabelVis = useMemo(() => {
    const map = new Map();
    if (!fogOfWar || visPolys.length === 0) return map;
    for (const t of tokens) {
      const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
      const tH = sz.gridH * gridSize;
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + tH / 2;
      const labelCY = cy + tH / 2 + 24;
      const tokenVis = visPolys.some(v => v.passes.length > 0 && pointInPoly(cx, cy, v.pts));
      const labelVis = visPolys.some(v => v.passes.length > 0 && pointInPoly(cx, labelCY, v.pts));
      map.set(t.id, tokenVis && labelVis);
    }
    return map;
  }, [fogOfWar, visPolys, tokens, offsetX, offsetY, gridSize]);

  // Tremorsense blip targets — computed after visPolys so LOS is available.
  // A blip is shown when the token is in tremorsense range but NOT clearly
  // visible (i.e. outside LOS, or inside fog/darkness that hides them).
  const tremorsenseBlips = useMemo(() => {
    if (!fogOfWar || !tokens || !playerTokenId) return [];
    const tremorsenseOrigins = visOrigins.filter(o => o.visionType === 'tremorsense');
    if (tremorsenseOrigins.length === 0) return [];

    const fogZones  = (magicalDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');
    const darkZones = (magicalDarkness || []).filter(dz => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water');

    // Player token centre — used for the in-fog proximity suppression.
    const playerToken = tokens.find(t => t.id === playerTokenId);
    let pcx = null, pcy = null, playerInFog = false;
    if (playerToken) {
      const psz = TOKEN_SIZES[playerToken.size] || TOKEN_SIZES.medium;
      pcx = offsetX + Number(playerToken.grid_col) * gridSize + (psz.gridW * gridSize) / 2;
      pcy = offsetY + Number(playerToken.grid_row) * gridSize + (psz.gridH * gridSize) / 2;
      playerInFog = fogZones.some(fz => pointInZone(pcx, pcy, fz));
    }
    const eightFtPx = (8 / FEET_PER_SQUARE) * gridSize;

    return tokens
      .filter(t => {
        if (t.id === playerTokenId) return false;
        if (t.is_hidden) return false;
        if (t.is_flying) return false;
        const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
        const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
        const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;

        const inRange = tremorsenseOrigins.some(o =>
          o.visionRangePx <= 0 || Math.hypot(cx - o.x, cy - o.y) <= o.visionRangePx
        );
        if (!inRange) return false;

        // When the observing player is inside fog, suppress blips for creatures
        // within 8ft — they're within the visible 5ft bubble, close enough to
        // be perceived directly without a sonar indicator.
        if (playerInFog && pcx !== null && Math.hypot(cx - pcx, cy - pcy) <= eightFtPx) {
          return false;
        }

        // If the token is already clearly visible (in LOS and not obscured by
        // fog or darkness), skip the blip — the player can see them directly.
        const inLOS = visPolys.some(v => v.passes.length > 0 && pointInPoly(cx, cy, v.pts));
        if (inLOS) {
          const inFog      = fogZones.some(fz => pointInZone(cx, cy, fz));
          const inDarkness = darkZones.some(dz => pointInZone(cx, cy, dz));
          if (!inFog && !inDarkness) return false;
        }

        return true;
      })
      .map(t => {
        const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
        const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
        const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
        return { id: t.id, cx, cy, size: t.size };
      });
  }, [fogOfWar, tokens, playerTokenId, visOrigins, visPolys, magicalDarkness, offsetX, offsetY, gridSize]);

  // HTML canvas overlay for light glow — warm radial gradients drawn at each
  // light source position, below the fog so walls/darkness occludes them.
  const glowCanvasRef = useRef(null);

  useEffect(() => {
    if (!fogOfWar) return;
    const canvas = glowCanvasRef.current;
    if (!canvas) return;

    // Collect all light sources: static lights + token-attached lights.
    // Hoisted out of the RAF loop so we don't re-build the array 60×/sec.
    const allGlowLights = [
      ...lights.map(l => ({
        // Stable per-light seed for the flicker phase. Two lights with the
        // same coords would otherwise pulse in lockstep, so we mix the id
        // (or a derived hash if the id is missing) into the seed.
        seed: ((l.id != null ? Number(l.id) : (l.x * 13 + l.y * 31)) * 0.1731) % (Math.PI * 2),
        x: l.x, y: l.y,
        brightR: l.bright_radius || 60,
        dimR: l.dim_radius || 120,
        color: l.color || '#fbbf24',
        dir: l.direction ?? 0,
        spread: l.spread_angle ?? 360,
        // DM-controlled per-light: false → render as a steady glow (sun
        // shafts, magical continual flame, daylight spell, etc).
        flicker: l.flicker !== false,
      })),
      ...(tokens || []).flatMap(t => {
        const brightFt = Number(t.token_light_bright) || 0;
        const dimFt    = Number(t.token_light_dim)    || 0;
        if (brightFt <= 0 && dimFt <= 0) return [];
        const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
        const pxPerFt = gridSize / FEET_PER_SQUARE;
        const ox = gridSize > 0 ? (mW % gridSize) / 2 : 0;
        const oy = gridSize > 0 ? (mH % gridSize) / 2 : 0;
        const cx = ox + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
        const cy = oy + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
        return [{
          seed: ((Number(t.id) || 0) * 0.2389 + 1.7) % (Math.PI * 2),
          x: cx, y: cy,
          brightR: brightFt * pxPerFt,
          dimR: (dimFt || brightFt * 2) * pxPerFt,
          color: t.token_light_color || '#fbbf24',
          dir: 0, spread: 360,
          // Per-token flicker flag — defaults to true for legacy tokens
          // (torches / lanterns) and turns off for inventory items the
          // player has marked as steady (magical light, sunblade, etc).
          flicker: t.token_light_flicker !== false,
        }];
      }),
    ];

    function hexToRgb(hex) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    // Walls and closed doors block light. Compute each light's LOS polygon so
    // the glow can be clipped to the area the light actually reaches. The
    // polygon is keyed by (x,y) and walls — flickering the radius doesn't
    // invalidate it, so the per-frame work stays cheap (just gradient draws).
    const glowWallSegs = [...wallsToSegments(walls), ...doorsToSegments(doors)];
    const glowCacheKey = `${walls.length}#${walls.map(w => `${w.id || ''}:${(w.points || []).length}`).join(',')}#${doors.map(d => `${d.id}:${d.is_open}:${(d.points || []).length}`).join(',')}#${mW}x${mH}`;

    let raf = null;
    let running = true;

    function draw() {
      if (!running) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);

      // Candle-flame flicker model: two slow sines (sub-Hz) for a gentle
      // breathing, two faster sines (~3–7 Hz) for the moment-to-moment
      // wobble that reads as a real flame, and a small per-frame jitter
      // for the bottom-octave noise. Phase offsets are derived from each
      // light's own seed so adjacent torches don't pulse in unison.
      const t = performance.now() / 1000;

      for (const { seed, x, y, brightR, dimR, color, dir, spread, flicker } of allGlowLights) {
        // Lights with flicker disabled render as steady glows — useful
        // for sun shafts, magical continual flame, daylight spell, etc.
        const flickerR = flicker
          ? 1
            + Math.sin(t * 6.7  + seed)         * 0.05
            + Math.sin(t * 3.1  + seed * 1.7)   * 0.035
            + Math.sin(t * 11.3 + seed * 0.5)   * 0.02
            + (Math.random() - 0.5)             * 0.015
          : 1;
        // Brightness modulates a touch more than radius — the rim shimmer
        // comes from the radial gradient, but the perceived flame
        // intensity comes from the alpha at the centre.
        const flickerA = flicker
          ? 1
            + Math.sin(t * 8.9  + seed * 2.3)   * 0.10
            + Math.sin(t * 4.2  + seed)         * 0.05
            + (Math.random() - 0.5)             * 0.04
          : 1;

        const fBrightR = Math.max(0, brightR * flickerR);
        const fDimR    = Math.max(0, dimR    * flickerR);
        const outerR   = Math.max(fDimR, fBrightR);
        if (outerR <= 0) continue;
        const [r, g, b] = hexToRgb(color || '#fbbf24');
        ctx.save();
        clipToWedge(ctx, x, y, outerR, dir, spread);
        const lp = getCachedLightPoly(x, y, glowWallSegs, glowCacheKey);
        if (lp && lp.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(lp[0], lp[1]);
          for (let i = 2; i < lp.length; i += 2) ctx.lineTo(lp[i], lp[i + 1]);
          ctx.closePath();
          ctx.clip();
        }
        const a = Math.max(0.5, Math.min(1.4, flickerA));
        const grad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
        grad.addColorStop(0,                            `rgba(${r}, ${g}, ${b}, ${(0.40 * a).toFixed(3)})`);
        grad.addColorStop(fBrightR / outerR * 0.6,      `rgba(${r}, ${g}, ${b}, ${(0.24 * a).toFixed(3)})`);
        grad.addColorStop(fBrightR / outerR,            `rgba(${r}, ${g}, ${b}, ${(0.12 * a).toFixed(3)})`);
        grad.addColorStop(1,                            `rgba(${r}, ${g}, ${b}, 0.00)`);
        ctx.beginPath();
        ctx.arc(x, y, outerR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => { running = false; if (raf) cancelAnimationFrame(raf); };
  }, [fogOfWar, lights, tokens, pos, scale, mW, mH, stageSize, gridSize, visibilityTick, walls, doors]);

  // Cache per-fog-zone LOS polygons — expensive to compute so only done when
  // zones / walls change, not on every animation frame.
  const fogZoneLOS = useMemo(() => {
    if (!fogOfWar || mW <= 0 || mH <= 0) return {};
    const fzs = (magicalDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');
    if (fzs.length === 0) return {};
    const allSegs = [...wallsToSegments(walls), ...doorsToSegments(doors)];
    const cache = {};
    for (const fz of fzs) {
      const { x: cx, y: cy } = zoneCentroid(fz);
      cache[fz.id] = computeVisibilityPolygon(cx, cy, allSegs, mW, mH);
    }
    return cache;
  }, [fogOfWar, walls, doors, magicalDarkness, mW, mH]);

  // HTML canvas overlay for fog of war — bypasses Konva entirely so
  // destination-out compositing works reliably on all browsers.
  // Runs as a RAF loop so the animated fog gradients update every frame without
  // going through React's re-render cycle.
  const fogCanvasRef = useRef(null);

  useEffect(() => {
    if (!fogOfWar) return;
    const canvas = fogCanvasRef.current;
    if (!canvas) return;

    let raf = null;
    let running = true;

    function draw() {
      if (!running) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Shift by fowBlur*scale to account for oversized canvas offset (Safari-safe blur approach).
    // Scaling the blur by the current zoom keeps the softness visually constant regardless of zoom level.
    ctx.translate(pos.x + fowBlur * scale, pos.y + fowBlur * scale);
    ctx.scale(scale, scale);
    // Fill entire map with fully-opaque fog. Colour is configurable
    // (sessions.fow_color); the destination-out passes below ignore
    // colour and only modulate alpha, so the visible fog tint is set
    // entirely by THIS fillStyle.
    ctx.fillStyle = fowColor;
    if (isPlayer || isSpectator) {
      // Extend fog past the map edges so neither players nor TV viewers
      // can infer the map's bounds from where the fog stops. The LOS
      // polygon is bounded by the map boundary segments, so the
      // destination-out below only punches holes within the map —
      // anything beyond mW/mH stays solid fog.
      const left   = -pos.x / scale - stageSize.w / scale;
      const top    = -pos.y / scale - stageSize.h / scale;
      const right  = (stageSize.w - pos.x) / scale + stageSize.w / scale;
      const bottom = (stageSize.h - pos.y) / scale + stageSize.h / scale;
      ctx.fillRect(left, top, right - left, bottom - top);
    } else {
      ctx.fillRect(0, 0, mW, mH);
    }
    // Punch fully-transparent visibility holes using destination-out.
    // CSS filter blur is applied to the canvas element itself (works on all browsers
    // including Safari). The canvas is oversized by 2*fowBlur on each side and offset
    // by -fowBlur so blur at visibility polygon edges bleeds into the padding rather
    // than hitting the browser viewport edge.
    // For each origin, for each rendering pass:
    //   1. Clip drawing to the LOS polygon
    //   2. Fill the illuminated shape (full polygon, range circle, or light circle)
    // destination-out with globalAlpha controls how much fog is erased:
    //   alpha=1.0 → fully transparent (bright), alpha=0.5 → half fog remains (dim)
    for (const { pts, passes } of visPolys) {
      if (pts.length < 4 || passes.length === 0) continue;
      for (const pass of passes) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = pass.alpha;
        ctx.fillStyle = '#000';

        // Clip all drawing to the LOS polygon
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath();
        ctx.clip();

        // Draw the illuminated area within the LOS clip
        if (pass.kind === 'full') {
          ctx.fillRect(0, 0, mW, mH);
        } else if (pass.kind === 'range') {
          ctx.beginPath();
          ctx.arc(pass.ox, pass.oy, pass.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (pass.kind === 'light') {
          // Candle-flame flicker: modulate the lit-area radius per frame
          // so the visible edge wobbles in step with the glow canvas above.
          // Seed off (lx,ly) so two adjacent torches don't pulse in sync.
          // Radius is the only thing flickered here — the LOS clip polygon
          // (pass.lightPts) is fixed because re-raycasting walls every frame
          // would be catastrophic. The clip already extends to wall edges,
          // so a wobbling radius just expands/contracts within that envelope.
          // Lights with flicker disabled render with their stored radius
          // unchanged — so sun shafts and magical lights have crisp,
          // steady edges instead of the candle wobble.
          const tNow = performance.now() / 1000;
          const fSeed = (pass.lx * 0.013 + pass.ly * 0.029);
          const flickerR = pass.flicker !== false
            ? 1
              + Math.sin(tNow * 6.7  + fSeed)         * 0.05
              + Math.sin(tNow * 3.1  + fSeed * 1.7)   * 0.035
              + Math.sin(tNow * 11.3 + fSeed * 0.5)   * 0.02
            : 1;
          const flickeredLr = Math.max(0, pass.lr * flickerR);

          // Clip to directional cone first (no-op for full circles)
          clipToWedge(ctx, pass.lx, pass.ly, flickeredLr, pass.ldir ?? 0, pass.lspread ?? 360);
          // Also clip to the light source's own LOS polygon so walls block the light
          if (pass.lightPts && pass.lightPts.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(pass.lightPts[0], pass.lightPts[1]);
            for (let i = 2; i < pass.lightPts.length; i += 2) ctx.lineTo(pass.lightPts[i], pass.lightPts[i + 1]);
            ctx.closePath();
            ctx.clip();
          }
          // Feather the outer edge with a radial gradient so the light doesn't
          // terminate in a hard ring. Alpha plateaus across the bright/dim zone
          // then ramps to 0 across a small outer band.
          ctx.globalAlpha = 1;
          const feather = Math.max(8, flickeredLr * 0.15);
          const outerR = flickeredLr + feather;
          const grad = ctx.createRadialGradient(pass.lx, pass.ly, 0, pass.lx, pass.ly, outerR);
          grad.addColorStop(0, `rgba(0,0,0,${pass.alpha})`);
          grad.addColorStop(flickeredLr / outerR, `rgba(0,0,0,${pass.alpha})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pass.lx, pass.ly, outerR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Ledge dim overlay: for each origin, re-fog the area on the far side of
    // any below-side ledge back to ~50% alpha, simulating only dim light
    // passing through the ledge.
    for (const { pts, ledgeDimPolys } of visPolys) {
      if (!ledgeDimPolys || ledgeDimPolys.length === 0) continue;
      if (pts.length < 4) continue;
      for (const poly of ledgeDimPolys) {
        if (!poly || poly.length < 6) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#000';
        // Clip to the origin's LOS polygon
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath();
        ctx.clip();
        // Clip to the far-side ledge polygon
        ctx.beginPath();
        ctx.moveTo(poly[0], poly[1]);
        for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
        ctx.closePath();
        ctx.clip();
        ctx.fillRect(0, 0, mW, mH);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    // Re-stamp magical darkness zones with opaque black fog for any vision origin
    // that cannot pierce magical darkness (i.e. not truesight or blindsight within range).
    // This runs after all normal vision passes so it always wins over ordinary vision.
    const canSeeThroughAnyZone = (dz) => {
      const { x: dzX, y: dzY } = zoneCentroid(dz);
      const dzR = zoneEffectiveRadius(dz);
      return (visOrigins || []).some(origin => {
        if (origin.visionType !== 'truesight' && origin.visionType !== 'blindsight') return false;
        if (origin.visionRangePx <= 0) return true;
        return Math.hypot(dzX - origin.x, dzY - origin.y) - dzR <= origin.visionRangePx;
      });
    };

    const darknessZones = (magicalDarkness || []).filter(dz => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water');
    const fogZones      = (magicalDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');

    for (const dz of darknessZones) {
      if (!canSeeThroughAnyZone(dz)) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
          const pts = dz.poly_points;
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.closePath();
        } else {
          ctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }
    }

    // Heavy fog zones — animated misty overlay drawn directly on the main canvas.
    // Uses destination-over so fog only fills LOS-revealed (transparent) pixels;
    // the opaque black FoW stays untouched.
    if (fogZones.length > 0) {
      const t = performance.now() / 1000; // seconds

      for (const fz of fogZones) {
        const fzLOS = fogZoneLOS[fz.id];
        const { x: fzCx, y: fzCy } = zoneCentroid(fz);
        const fzR = Math.max(zoneEffectiveRadius(fz), 40);
        const isPolygon = fz.shape === 'polygon' && Array.isArray(fz.poly_points) && fz.poly_points.length >= 6;

        ctx.save();

        // Clip to LOS polygon when available (prevents fog bleeding through walls)
        if (fzLOS && fzLOS.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(fzLOS[0], fzLOS[1]);
          for (let i = 2; i < fzLOS.length; i += 2) ctx.lineTo(fzLOS[i], fzLOS[i + 1]);
          ctx.closePath();
          ctx.clip();
        }

        // Also clip to fog zone shape
        ctx.beginPath();
        if (isPolygon) {
          const pts = fz.poly_points;
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.closePath();
        } else {
          ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
        }
        ctx.clip();

        // All fog layers use destination-over so they only fill transparent (LOS-revealed)
        // pixels and never paint over the opaque black FoW.
        // Draw order is reversed — topmost layer first — because destination-over
        // inserts new content *behind* existing opaque pixels.
        ctx.globalCompositeOperation = 'destination-over';

        // ── Light wisps first (topmost) — 4 bright drifting patches ──
        for (let i = 0; i < 4; i++) {
          const seed = i * 2.618;
          const sp   = 0.7 + i * 0.18;
          const wx   = fzCx + Math.sin(t * sp       + seed)        * fzR * 0.42;
          const wy   = fzCy + Math.cos(t * sp * 0.71 + seed + 1.3) * fzR * 0.38;
          const wr   = fzR * (0.38 + i * 0.07);
          const g    = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
          g.addColorStop(0,   'rgba(255,255,255,0.58)');
          g.addColorStop(0.45,'rgba(238,244,255,0.26)');
          g.addColorStop(1,   'rgba(218,226,245,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, mW, mH);
        }

        // ── Density patches (behind wisps) — 3 drifting darker blobs ──
        for (let i = 0; i < 3; i++) {
          const seed = i * 3.14 + 0.9;
          const sp   = 0.5 + i * 0.13;
          const wx   = fzCx + Math.sin(t * sp + seed + 2.5)        * fzR * 0.48;
          const wy   = fzCy + Math.cos(t * sp * 0.83 + seed + 3.7) * fzR * 0.44;
          const wr   = fzR * (0.32 + i * 0.09);
          const g    = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
          g.addColorStop(0,   'rgba(125,133,158,0.50)');
          g.addColorStop(0.55,'rgba(150,158,178,0.22)');
          g.addColorStop(1,   'rgba(178,186,205,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, mW, mH);
        }

        // ── Base fog fill last (bottommost) — fills any remaining transparent gaps ──
        const baseGrad = ctx.createRadialGradient(fzCx, fzCy, 0, fzCx, fzCy, fzR * 1.05);
        baseGrad.addColorStop(0,   'rgba(220,228,245,1.0)');
        baseGrad.addColorStop(0.55,'rgba(200,210,228,1.0)');
        baseGrad.addColorStop(0.85,'rgba(182,192,212,1.0)');
        baseGrad.addColorStop(1,   'rgba(165,175,198,1.0)');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, mW, mH);

        ctx.restore();

        // Re-punch 5ft visibility bubble for tokens inside this fog zone.
        // Runs after the grey overlay so only the small lit area around the token is clear.
        for (const { pts, fogOrigin } of visPolys) {
          if (!fogOrigin || fogOrigin.fz.id !== fz.id) continue;
          const { ox, oy, fogPasses } = fogOrigin;
          if (!fogPasses || fogPasses.length === 0) continue;

          for (const pass of fogPasses) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = pass.alpha;
            ctx.fillStyle = '#000';

            // Clip to token's LOS polygon
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.closePath();
            ctx.clip();

            // Clip to inside the fog zone (circle or polygon)
            ctx.beginPath();
            if (fz.shape === 'polygon' && Array.isArray(fz.poly_points) && fz.poly_points.length >= 6) {
              const fp = fz.poly_points;
              ctx.moveTo(fp[0], fp[1]);
              for (let i = 2; i < fp.length; i += 2) ctx.lineTo(fp[i], fp[i + 1]);
              ctx.closePath();
            } else {
              ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
            }
            ctx.clip();

            // Clip to 5ft bubble
            ctx.beginPath();
            ctx.arc(ox, oy, gridSize, 0, Math.PI * 2);
            ctx.clip();

            if (pass.kind === 'full') {
              ctx.fillRect(0, 0, mW, mH);
            } else if (pass.kind === 'range') {
              if (pass.r < gridSize) {
                ctx.beginPath();
                ctx.arc(pass.ox, pass.oy, pass.r, 0, Math.PI * 2);
                ctx.clip();
              }
              ctx.fillRect(0, 0, mW, mH);
            } else if (pass.kind === 'light') {
              clipToWedge(ctx, pass.lx, pass.ly, pass.lr, pass.ldir ?? 0, pass.lspread ?? 360);
              if (pass.lightPts && pass.lightPts.length >= 4) {
                ctx.beginPath();
                ctx.moveTo(pass.lightPts[0], pass.lightPts[1]);
                for (let i = 2; i < pass.lightPts.length; i += 2) ctx.lineTo(pass.lightPts[i], pass.lightPts[i + 1]);
                ctx.closePath();
                ctx.clip();
              }
              ctx.globalAlpha = 1;
              const feather = Math.max(8, pass.lr * 0.15);
              const outerR = pass.lr + feather;
              const grad = ctx.createRadialGradient(pass.lx, pass.ly, 0, pass.lx, pass.ly, outerR);
              grad.addColorStop(0, `rgba(0,0,0,${pass.alpha})`);
              grad.addColorStop(pass.lr / outerR, `rgba(0,0,0,${pass.alpha})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(pass.lx, pass.ly, outerR, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }

        // Punch truesight / blindsight range clear inside this fog zone.
        // These vision types can see through magical fog up to their range —
        // the fog grey overlay is erased inside that circle after being drawn.
        for (const { pts, visionType: vt, ox: vox, oy: voy, visionRangePx: vrpx } of visPolys) {
          if (vt !== 'truesight' && vt !== 'blindsight') continue;

          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';

          // Clip to this origin's LOS polygon (walls still block truesight)
          if (pts.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.closePath();
            ctx.clip();
          }

          // Clip to fog zone shape so the punch stays inside the fog boundary
          ctx.beginPath();
          if (isPolygon) {
            const fp = fz.poly_points;
            ctx.moveTo(fp[0], fp[1]);
            for (let i = 2; i < fp.length; i += 2) ctx.lineTo(fp[i], fp[i + 1]);
            ctx.closePath();
          } else {
            ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
          }
          ctx.clip();

          if (vrpx > 0) {
            // Bounded truesight — punch a range circle
            ctx.beginPath();
            ctx.arc(vox, voy, vrpx, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Unlimited truesight — punch the entire clipped area
            ctx.fillRect(0, 0, mW, mH);
          }

          ctx.restore();
        }

      }
    }

    ctx.restore();

    raf = requestAnimationFrame(draw);
    } // end draw()

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [fogOfWar, visPolys, fowBlur, fowColor, pos, scale, mW, mH, stageSize, ambientLight, visibilityTick, fogZoneLOS, magicalDarkness, visOrigins, gridSize, walls, doors]);

  // Water/illusion effect canvas — sits above the Konva stage, below the FoW.
  // Reads pixels from the Konva map layer and replays them with sinusoidal
  // horizontal-slice distortion to create a rippling water/illusion effect.
  const waterCanvasRef = useRef(null);

  // Plugin-supplied template overlays. Plugins can tag a template id with
  // { kind: 'water' } to opt it into the host's native water canvas pass.
  // Subscribing to the registry version ensures changes from the plugin
  // re-trigger the water-canvas effect's deps via the derived list below.
  const pluginRegVersion = useRegistryVersion();
  // Convert each tagged template into the dz-shape the water canvas effect
  // already understands. Circles map naturally; rect / wedge / line are
  // approximated as polygons. The synthetic id is prefixed so it can't
  // collide with a real magical-darkness zone id.
  const pluginWaterZones = useMemo(() => {
    const tagged = pluginRegistries.templateOverlays;
    if (!tagged || tagged.size === 0 || !spellTemplates?.length) return [];
    const out = [];
    for (const t of spellTemplates) {
      const tag = tagged.get(t.id);
      if (!tag || tag.kind !== 'water') continue;
      const ts = templateShapeProps(t, undefined, undefined, undefined, gridSize);
      if (!ts) continue;
      const idStr = `tpl-water-${t.id}`;
      if (ts.kind === 'circle') {
        out.push({ id: idStr, zone_type: 'water', shape: 'circle', x: ts.x, y: ts.y, radius: ts.radius, feather_amount: 0 });
      } else if (ts.kind === 'rect') {
        const x0 = ts.x, y0 = ts.y, x1 = ts.x + ts.width, y1 = ts.y + ts.height;
        out.push({ id: idStr, zone_type: 'water', shape: 'polygon', poly_points: [x0, y0, x1, y0, x1, y1, x0, y1], feather_amount: 0 });
      } else if (ts.kind === 'wedge') {
        // Approximate the cone as a polygon: apex + arc points.
        const seg = 14;
        const halfAng = (ts.angle / 2) * Math.PI / 180;
        const baseAng = ts.rotation * Math.PI / 180;
        const pts = [ts.x, ts.y];
        for (let i = 0; i <= seg; i++) {
          const a = baseAng + (i / seg) * (halfAng * 2);
          pts.push(ts.x + Math.cos(a) * ts.radius, ts.y + Math.sin(a) * ts.radius);
        }
        out.push({ id: idStr, zone_type: 'water', shape: 'polygon', poly_points: pts, feather_amount: 0 });
      } else if (ts.kind === 'line') {
        // Use the rotated rect's actual width (1 ft worth of pixels)
        // so the water-zone polygon matches the visible line template
        // exactly instead of the previous hard-coded 8 px sliver.
        const { ax, ay, bx, by, widthPx } = ts;
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const half = (widthPx || 8) / 2;
        const nx = -dy / len * half, ny = dx / len * half;
        out.push({ id: idStr, zone_type: 'water', shape: 'polygon', poly_points: [ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny], feather_amount: 0 });
      }
    }
    return out;
  }, [spellTemplates, pluginRegVersion]);

  useEffect(() => {
    const baseWaterZones = (magicalDarkness || []).filter(dz => dz.zone_type === 'water');
    // Merge in plugin-tagged template water zones so they get the same
    // slice-distortion ripple + tint as DM-drawn water zones.
    const waterZones = [...baseWaterZones, ...pluginWaterZones];
    const fogZones   = (magicalDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');
    const canvas = waterCanvasRef.current;
    if (!canvas) return;

    if (!waterZones.length && !fogZones.length) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let raf = null;
    let running = true;
    let offscreen = null; // reused each frame to avoid per-frame allocation

    // Returns true if any sample point of a zone is inside at least one LOS polygon.
    // When FoW is disabled (DM view) always returns true.
    function zoneIsVisible(dz, czX, czY) {
      if (!fogOfWarRef.current) return true;
      const vp = visPolysRef.current;
      if (!vp || vp.length === 0) return false;
      const activePolys = vp.filter(v => v.passes && v.passes.length > 0);
      if (activePolys.length === 0) return false;

      const samples = [[czX, czY]];
      if (dz.shape === 'polygon' && Array.isArray(dz.poly_points)) {
        for (let i = 0; i < dz.poly_points.length; i += 2)
          samples.push([dz.poly_points[i], dz.poly_points[i + 1]]);
      } else if (dz.radius) {
        // 8 points around the perimeter at 80% radius
        const r = dz.radius * 0.8;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          samples.push([dz.x + Math.cos(a) * r, dz.y + Math.sin(a) * r]);
        }
      }

      return samples.some(([sx, sy]) =>
        activePolys.some(v => pointInPoly(sx, sy, v.pts))
      );
    }

    function draw() {
      if (!running) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = performance.now() / 1000;
      const dpr = window.devicePixelRatio || 1;

      let konvaCanvas = null;
      try {
        const stage = stageRef.current?.getStage();
        if (stage) konvaCanvas = stage.container().querySelector('canvas');
      } catch (_) {}

      // Reuse offscreen canvas, reallocate only when dimensions change
      if (!offscreen || offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
        offscreen = document.createElement('canvas');
        offscreen.width  = canvas.width;
        offscreen.height = canvas.height;
      }
      const offCtx = offscreen.getContext('2d');

      for (const dz of waterZones) {
        const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
        const { x: czX, y: czY } = zoneCentroid(dz);
        const czR = Math.max(zoneEffectiveRadius(dz), 40);

        if (!zoneIsVisible(dz, czX, czY)) continue;

        let bbX, bbY, bbW, bbH;
        if (isPolygon) {
          const pts = dz.poly_points;
          let x0 = pts[0], y0 = pts[1], x1 = pts[0], y1 = pts[1];
          for (let i = 2; i < pts.length; i += 2) {
            x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
            y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
          }
          bbX = x0; bbY = y0; bbW = x1 - x0; bbH = y1 - y0;
        } else {
          bbX = dz.x - dz.radius; bbY = dz.y - dz.radius;
          bbW = dz.radius * 2;    bbH = dz.radius * 2;
        }

        // ── Compute feather amount early so content is drawn beyond the bb ──
        // The blur mask fades featherPx outward from the zone edge. If content
        // stops at the bounding-box edge (which for circles/tight polygons
        // coincides with the zone edge), the outer half of the fade has nothing
        // to blend into, producing a harsh step. Expanding the content draw
        // region by padMap gives the blur transition real pixels to work with.
        const liveFeather = featherZoneId === dz.id ? featherValue : (dz.feather_amount || 0);
        const featherPx = liveFeather > 0
          ? Math.min(liveFeather * scale, 48)
          : Math.min(czR * scale * 0.10, 24);
        const padMap = featherPx / scale;
        const drawBbX = bbX - padMap;
        const drawBbY = bbY - padMap;
        const drawBbW = bbW + 2 * padMap;
        const drawBbH = bbH + 2 * padMap;

        // ── Draw water content to offscreen (expanded by padMap) ──────────
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.save();
        offCtx.translate(pos.x, pos.y);
        offCtx.scale(scale, scale);

        if (konvaCanvas && konvaCanvas.width > 0) {
          const submergedCanvas = submergedTokensLayerRef.current?.getCanvas?.()?._canvas;
          const SLICES = 50;
          const sliceH = drawBbH / SLICES;
          const maxAmp = Math.min(drawBbW * 0.045, 12);

          offCtx.globalAlpha = 0.90;
          for (let i = 0; i <= SLICES; i++) {
            const mapY = drawBbY + i * sliceH;
            const xOff = Math.sin(i * 0.42 + t * 1.5) * maxAmp
                       + Math.sin(i * 0.75 + t * 0.8) * maxAmp * 0.45;
            const yOff = Math.cos(i * 0.6  + t * 1.1) * maxAmp * 0.25;

            let srcX = ((drawBbX + xOff) * scale + pos.x) * dpr;
            let srcY = ((mapY + yOff) * scale + pos.y) * dpr;
            let srcW = drawBbW * scale * dpr;
            let srcH = (sliceH + 1) * scale * dpr;
            let dstX = drawBbX, dstY = mapY + yOff;
            let dstW = drawBbW, dstH = sliceH + 1 / scale;

            // Clamp source rect to canvas bounds, adjusting dest proportionally.
            // Without this, zooming in causes srcW to exceed canvas width and
            // every slice is skipped — stopping the animation entirely.
            if (srcX < 0) {
              const trim = -srcX; dstX += trim / (scale * dpr); dstW -= trim / (scale * dpr); srcW -= trim; srcX = 0;
            }
            if (srcX + srcW > konvaCanvas.width) {
              const trim = srcX + srcW - konvaCanvas.width; srcW -= trim; dstW -= trim / (scale * dpr);
            }
            if (srcY < 0) {
              const trim = -srcY; dstY += trim / (scale * dpr); dstH -= trim / (scale * dpr); srcH -= trim; srcY = 0;
            }
            if (srcY + srcH > konvaCanvas.height) {
              const trim = srcY + srcH - konvaCanvas.height; srcH -= trim; dstH -= trim / (scale * dpr);
            }
            if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) continue;

            offCtx.drawImage(konvaCanvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);

            if (submergedCanvas && submergedCanvas.width > 0) {
              offCtx.drawImage(submergedCanvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
            }
          }
          offCtx.globalAlpha = 1.0;
        }

        // Blue-teal tint (expanded to match content region)
        offCtx.fillStyle = 'rgba(8, 38, 88, 0.25)';
        offCtx.fillRect(drawBbX - 1, drawBbY - 1, drawBbW + 2, drawBbH + 2);

        offCtx.restore();

        // ── Feathered edge mask via blurred destination-in ────────────────
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.filter = `blur(${featherPx}px)`;
        offCtx.save();
        offCtx.translate(pos.x, pos.y);
        offCtx.scale(scale, scale);
        offCtx.beginPath();
        if (isPolygon) {
          const pts = dz.poly_points;
          offCtx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) offCtx.lineTo(pts[i], pts[i + 1]);
          offCtx.closePath();
        } else {
          offCtx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
        }
        offCtx.fillStyle = 'black';
        offCtx.fill();
        offCtx.restore();
        offCtx.filter = 'none';
        offCtx.globalCompositeOperation = 'source-over';

        // ── Composite feathered water onto main canvas ────────────────────
        ctx.drawImage(offscreen, 0, 0);
      }

      // ── Fog zones: grey mist overlay with feathered edges ────────────────
      for (const dz of fogZones) {
        const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
        const { x: czX, y: czY } = zoneCentroid(dz);
        const czR = Math.max(zoneEffectiveRadius(dz), 40);

        if (!zoneIsVisible(dz, czX, czY)) continue;

        // Compute feather before filling so we can expand the fill region.
        const liveFeather = featherZoneId === dz.id ? featherValue : (dz.feather_amount || 0);
        const featherPx = liveFeather > 0
          ? Math.min(liveFeather * scale, 48)
          : Math.min(czR * scale * 0.10, 24);
        const padMap = featherPx / scale;

        // Compute bounding box for the expanded fill rect.
        let fogBbX, fogBbY, fogBbW, fogBbH;
        if (isPolygon) {
          const pts = dz.poly_points;
          let x0 = pts[0], y0 = pts[1], x1 = pts[0], y1 = pts[1];
          for (let i = 2; i < pts.length; i += 2) {
            x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
            y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
          }
          fogBbX = x0; fogBbY = y0; fogBbW = x1 - x0; fogBbH = y1 - y0;
        } else {
          fogBbX = dz.x - dz.radius; fogBbY = dz.y - dz.radius;
          fogBbW = dz.radius * 2;    fogBbH = dz.radius * 2;
        }

        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.save();
        offCtx.translate(pos.x, pos.y);
        offCtx.scale(scale, scale);
        // Fill the expanded bounding box — mask will clip to zone shape with feathered edge.
        offCtx.fillStyle = 'rgba(100, 116, 139, 0.55)';
        offCtx.fillRect(fogBbX - padMap, fogBbY - padMap, fogBbW + 2 * padMap, fogBbH + 2 * padMap);
        offCtx.restore();

        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.filter = `blur(${featherPx}px)`;
        offCtx.save();
        offCtx.translate(pos.x, pos.y);
        offCtx.scale(scale, scale);
        offCtx.beginPath();
        if (isPolygon) {
          const pts = dz.poly_points;
          offCtx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) offCtx.lineTo(pts[i], pts[i + 1]);
          offCtx.closePath();
        } else {
          offCtx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
        }
        offCtx.fillStyle = 'black';
        offCtx.fill();
        offCtx.restore();
        offCtx.filter = 'none';
        offCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(offscreen, 0, 0);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); offscreen = null; };
  }, [magicalDarkness, pluginWaterZones, pos, scale, mW, mH, stageSize, gridSize]);

  // Tremorsense blip canvas — sits above the fog canvas, no blur.
  // Draws sonar-ring indicators for grounded tokens detected by tremorsense
  // that aren't already visible through normal line of sight.
  const blipCanvasRef = useRef(null);
  const BLIP_RADII = { tiny: 0.25, small: 0.45, medium: 0.5, large: 1.0, huge: 1.5, gargantuan: 2.0 };

  useEffect(() => {
    const canvas = blipCanvasRef.current;
    if (!canvas) return;

    if (!fogOfWar || tremorsenseBlips.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let raf = null;
    let running = true;

    // Each blip gets a stable random phase offset based on its id so rings
    // aren't all in sync across different tokens.
    const phaseSeeds = tremorsenseBlips.map(b => ((b.id * 2654435761) & 0xFFFFFF) / 0xFFFFFF);

    function draw() {
      if (!running) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = performance.now() / 1000;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);

      tremorsenseBlips.forEach(({ cx, cy, size }, bi) => {
        const r   = (BLIP_RADII[size] || 0.5) * gridSize;
        const lw  = Math.max(1, 2 / scale);
        const maxR = r * 2.2;          // rings stay within the original outer size
        const span = maxR - r;
        const PERIOD = 1.8;            // seconds per ring cycle
        const N_RINGS = 3;
        const seed = phaseSeeds[bi] || 0;

        // Expanding rings — 3 evenly staggered, starting from r, fading as they grow
        for (let i = 0; i < N_RINGS; i++) {
          const phase = ((t / PERIOD + seed + i / N_RINGS) % 1.0);
          const ringR = r + span * phase;
          const alpha = (1 - phase) * 0.58;
          const lwidth = lw * (1.8 - phase);   // thicker at center, thinner at edge
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(205,133,50,${alpha.toFixed(3)})`;
          ctx.lineWidth = lwidth;
          ctx.stroke();
        }

        // Inner disc — subtle brightness pulse
        const pulse = 0.55 + 0.12 * Math.sin(t * 3.2 + seed * Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(205,133,50,${pulse.toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,185,90,0.90)';
        ctx.lineWidth = lw * 1.5;
        ctx.stroke();
      });

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [fogOfWar, tremorsenseBlips, pos, scale, stageSize, gridSize]);


  // Refs to always-current props (avoid stale closures in DOM event handlers)
  const onTokenMoveRef   = useRef(onTokenMove);
  const onTokenSelectRef = useRef(onTokenSelect);
  const onMapClickRef    = useRef(onMapClick);
  const gridSizeRef      = useRef(gridSize);
  const offsetXRef       = useRef(offsetX);
  const offsetYRef       = useRef(offsetY);
  const tokensRef        = useRef(tokens);
  const activeToolRef    = useRef(activeTool);
  const placingTokenRef  = useRef(placingToken);
  const selectedTokenIdRef = useRef(selectedTokenId);
  // Without this ref, the stable mousedown handler captures the empty
  // initial array and never sees templates placed after the first mount —
  // so tpl-edit / tpl-erase silently do nothing on freshly-drawn shapes.
  const spellTemplatesRef = useRef(spellTemplates);
  const onTokenContextMenuRef = useRef(onTokenContextMenu);
  useEffect(() => { onTokenContextMenuRef.current = onTokenContextMenu; }, [onTokenContextMenu]);
  const spawnPointsRef = useRef(spawnPoints);
  useEffect(() => { spawnPointsRef.current = spawnPoints; }, [spawnPoints]);
  const onSpawnNamedAddRef = useRef(onSpawnNamedAdd);
  useEffect(() => { onSpawnNamedAddRef.current = onSpawnNamedAdd; }, [onSpawnNamedAdd]);
  // Polygon-draw scratch space for the spawn-named tool. Holds a flat
  // [x, y, x, y, ...] array of vertices in map-pixel coords while the
  // DM is dragging vertices in. Cleared on finalise / Esc.
  const spawnPolyDrawRef = useRef(null);
  const [spawnPolyPreview, setSpawnPolyPreview] = useState(null);
  const onSpawnPointMoveRef = useRef(onSpawnPointMove);
  useEffect(() => { onSpawnPointMoveRef.current = onSpawnPointMove; }, [onSpawnPointMove]);
  const terrainRef = useRef(terrain);
  useEffect(() => { terrainRef.current = terrain; }, [terrain]);
  const onTerrainMoveRef = useRef(onTerrainMove);
  useEffect(() => { onTerrainMoveRef.current = onTerrainMove; }, [onTerrainMove]);
  const onTerrainResizeRef = useRef(onTerrainResize);
  useEffect(() => { onTerrainResizeRef.current = onTerrainResize; }, [onTerrainResize]);
  const onTerrainContextMenuRef = useRef(onTerrainContextMenu);
  useEffect(() => { onTerrainContextMenuRef.current = onTerrainContextMenu; }, [onTerrainContextMenu]);
  const onTerrainPlaceRef = useRef(onTerrainPlace);
  useEffect(() => { onTerrainPlaceRef.current = onTerrainPlace; }, [onTerrainPlace]);
  const onTerrainSelectRef = useRef(onTerrainSelect);
  useEffect(() => { onTerrainSelectRef.current = onTerrainSelect; }, [onTerrainSelect]);
  const pendingTerrainRef = useRef(pendingTerrain);
  useEffect(() => { pendingTerrainRef.current = pendingTerrain; }, [pendingTerrain]);
  const selectedTerrainIdRef = useRef(selectedTerrainId);
  useEffect(() => { selectedTerrainIdRef.current = selectedTerrainId; }, [selectedTerrainId]);

  // HTMLImageElement cache keyed by lib_image_path so each terrain
  // image only loads once across all instances.
  const [terrainImages, setTerrainImages] = useState({});
  useEffect(() => {
    const need = new Set();
    for (const t of terrain) if (t.lib_image_path) need.add(t.lib_image_path);
    if (pendingTerrain?.lib_image_path) need.add(pendingTerrain.lib_image_path);
    let cancelled = false;
    for (const p of need) {
      if (terrainImages[p]) continue;
      const img = new window.Image();
      img.src = `/uploads/${p}`;
      img.onload = () => {
        if (cancelled) return;
        setTerrainImages((prev) => ({ ...prev, [p]: img }));
      };
    }
    return () => { cancelled = true; };
  }, [terrain, pendingTerrain]); // eslint-disable-line react-hooks/exhaustive-deps
  // Live drag preview for the spawn point being moved. Stage listening
  // is disabled at the Konva level (perf), so drag is implemented via
  // the container's native mousedown/move/up like tokens — see the
  // matching ref/state in the gesture block below.
  const [spawnDragVis, setSpawnDragVis] = useState(null);
  useEffect(() => { onTokenMoveRef.current   = onTokenMove;   }, [onTokenMove]);
  useEffect(() => { onTokenSelectRef.current = onTokenSelect; }, [onTokenSelect]);
  useEffect(() => { onMapClickRef.current    = onMapClick;    }, [onMapClick]);
  useEffect(() => { gridSizeRef.current      = gridSize;      }, [gridSize]);
  useEffect(() => { offsetXRef.current       = offsetX;       }, [offsetX]);
  useEffect(() => { offsetYRef.current       = offsetY;       }, [offsetY]);
  useEffect(() => { tokensRef.current        = tokens;        }, [tokens]);
  useEffect(() => { activeToolRef.current    = activeTool;    }, [activeTool]);
  useEffect(() => { placingTokenRef.current  = placingToken;  }, [placingToken]);
  useEffect(() => { selectedTokenIdRef.current = selectedTokenId; }, [selectedTokenId]);
  useEffect(() => { spellTemplatesRef.current = spellTemplates; }, [spellTemplates]);

  // Container resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setStageSize({ w: width, h: height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width > 0) setStageSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // ── DOM-level mouse interaction ───────────────────────────────────────────
  // Bypasses Konva's hit detection entirely — uses bounding box math instead.
  // mousemove/mouseup on window so drag works even when mouse leaves the canvas.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function toMap(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      return {
        x: (clientX - rect.left - posRef.current.x) / scaleRef.current,
        y: (clientY - rect.top  - posRef.current.y) / scaleRef.current,
      };
    }

    // World → piece-local-unrotated frame transform. Reverses the
    // Group's center-pivot rotation so we can hit-test and drag in
    // the piece's natural [0,0]–[w,h] coordinate space. Returns the
    // local x/y plus the piece's pixel width/height for convenience.
    function worldToLocal(mapX, mapY, t) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      const w = Number(t.width)  * gs;
      const h = Number(t.height) * gs;
      const cx = ox + (Number(t.grid_col) + Number(t.width)  / 2) * gs;
      const cy = oy + (Number(t.grid_row) + Number(t.height) / 2) * gs;
      const θ = (Number(t.rotation) || 0) * Math.PI / 180;
      const dx = mapX - cx;
      const dy = mapY - cy;
      const cosA = Math.cos(-θ), sinA = Math.sin(-θ);
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;
      return { x: lx + w / 2, y: ly + h / 2, w, h };
    }

    // Resize / rotate handle hit-test for the currently-selected
    // terrain piece. Returns 'br' / 'r' / 'b' / 'rotate' or null.
    // All math runs in the piece's local frame via worldToLocal.
    // Rotate handle stub-length scales with the piece's height so it
    // shrinks alongside the artwork at zoom-out — keeps the handle
    // visually anchored to the piece rather than floating in screen
    // space.
    function hitTerrainHandle(mapX, mapY) {
      const id = selectedTerrainIdRef.current;
      if (id == null) return null;
      const t = (terrainRef.current || []).find((x) => x.id === id);
      if (!t) return null;
      const local = worldToLocal(mapX, mapY, t);
      const r = 12 / scaleRef.current;
      const rotOffset = Math.max(local.h * 0.18, 8);
      const handles = [
        { id: 'rotate', x: local.w / 2, y: -rotOffset },
        { id: 'br',     x: local.w,     y: local.h     },
        { id: 'r',      x: local.w,     y: local.h / 2 },
        { id: 'b',      x: local.w / 2, y: local.h     },
      ];
      for (const h of handles) {
        if (Math.abs(local.x - h.x) <= r && Math.abs(local.y - h.y) <= r) return h.id;
      }
      return null;
    }

    // Topmost terrain piece under the cursor. Body hit-test runs in
    // piece-local coords so a rotated rectangle still picks up
    // correctly — clicking the rotated artwork hits, clicking outside
    // its actual silhouette doesn't.
    function hitTerrain(mapX, mapY) {
      const list = terrainRef.current || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const t = list[i];
        const local = worldToLocal(mapX, mapY, t);
        if (local.x >= 0 && local.x <= local.w && local.y >= 0 && local.y <= local.h) return t;
      }
      return null;
    }

    function hitToken(mapX, mapY) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      return tokensRef.current.find(t => {
        const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
        const tx = ox + Number(t.grid_col) * gs;
        const ty = oy + Number(t.grid_row) * gs;
        return mapX >= tx && mapX < tx + sz.gridW * gs
            && mapY >= ty && mapY < ty + sz.gridH * gs;
      }) || null;
    }

    // Picks the named spawn-point glyph under the given map-space
    // coords. Hits anywhere inside the polygon (or bubble / halo for
    // legacy circle rows). DM-only path; players are passed an empty
    // spawnPoints list.
    function hitSpawnPoint(mapX, mapY) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      for (const sp of spawnPointsRef.current) {
        const poly = Array.isArray(sp.shape_points) ? sp.shape_points : null;
        if (poly && poly.length >= 3) {
          let inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = ox + Number(poly[i].col) * gs;
            const yi = oy + Number(poly[i].row) * gs;
            const xj = ox + Number(poly[j].col) * gs;
            const yj = oy + Number(poly[j].row) * gs;
            const intersect = ((yi > mapY) !== (yj > mapY)) &&
              (mapX < (xj - xi) * (mapY - yi) / ((yj - yi) || 1e-9) + xi);
            if (intersect) inside = !inside;
          }
          if (inside) return sp;
          continue;
        }
        const cx = ox + Number(sp.grid_col) * gs;
        const cy = oy + Number(sp.grid_row) * gs;
        const r = Number(sp.radius) || 0;
        const hitR = r > 0 ? r * gs : Math.max(14, gs * 0.4);
        if ((mapX - cx) * (mapX - cx) + (mapY - cy) * (mapY - cy) <= hitR * hitR) {
          return sp;
        }
      }
      return null;
    }

    let downX = 0, downY = 0;
    // Right-click drag always pans, regardless of the active tool.
    // When `rightPanMoved` ends up true on mouseup, the contextmenu
    // event that browsers fire next is suppressed so a drag-pan
    // doesn't accidentally open the door-flip / token menu.
    let rightPanning = false;
    let rightPanStart = { cx: 0, cy: 0, sx: 0, sy: 0 };
    let rightPanMoved = false;
    // DM-only spawn-point drag. Captured on mousedown when the cursor
    // is inside a spawn glyph; live preview updates on mousemove; the
    // committed grid coords go to the parent on mouseup.
    let spawnDrag = null; // { id, origCol, origRow }
    // DM-only terrain drag. Same pattern as spawnDrag — pickup on
    // mousedown, live preview on mousemove, commit on mouseup.
    let terrainDrag = null; // { id, startCol, startRow, offsetCol, offsetRow }
    let terrainResize = null; // { id, mode, startW, startH, startCol, startRow, startMapX, startMapY }
    let terrainRotate = null; // { id, cx, cy } — center used for angle math

    function onMouseDown(e) {
      if (e.button === 2) {
        rightPanning = true;
        rightPanMoved = false;
        rightPanStart = {
          cx: e.clientX, cy: e.clientY,
          sx: posRef.current.x, sy: posRef.current.y,
        };
        return;
      }
      if (e.button !== 0) return;
      downX = e.clientX;
      downY = e.clientY;
      const tool = activeToolRef.current;
      const mc   = toMap(e.clientX, e.clientY);

      // DM-only: clicking off the selected terrain piece deselects
      // it. Doesn't consume the click — whatever tool was active
      // still gets to react.
      if (!isPlayer && selectedTerrainIdRef.current != null
          && !pendingTerrainRef.current
          && !hitTerrain(mc.x, mc.y)
          && !hitTerrainHandle(mc.x, mc.y)) {
        onTerrainSelectRef.current?.(null);
      }

      // DM-only: terrain place mode. When the parent has set
      // `pendingTerrain` (the DM clicked a library piece), the next
      // canvas click drops it here. Skip every other tool path.
      if (!isPlayer && pendingTerrainRef.current) {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        // Centre the new piece on the click — the parent gets the
        // top-left corner since that's how we store grid_col/grid_row.
        const w = Number(pendingTerrainRef.current.default_w) || 1;
        const h = Number(pendingTerrainRef.current.default_h) || 1;
        const col = (mc.x - ox) / gs - w / 2;
        const row = (mc.y - oy) / gs - h / 2;
        onTerrainPlaceRef.current?.(pendingTerrainRef.current, col, row);
        return;
      }

      // DM-only: resize / rotate handle on the selected piece —
      // checked before body-drag so a click on a handle resizes or
      // rotates instead of moving.
      if (!isPlayer && !hitToken(mc.x, mc.y)) {
        const handle = hitTerrainHandle(mc.x, mc.y);
        if (handle) {
          const t = (terrainRef.current || []).find((x) => x.id === selectedTerrainIdRef.current);
          if (t) {
            if (handle === 'rotate') {
              const gs = gridSizeRef.current;
              const ox = offsetXRef.current, oy = offsetYRef.current;
              terrainRotate = {
                id: t.id,
                cx: ox + (Number(t.grid_col) + Number(t.width)  / 2) * gs,
                cy: oy + (Number(t.grid_row) + Number(t.height) / 2) * gs,
              };
            } else {
              terrainResize = {
                id: t.id,
                mode: handle,
                startW: Number(t.width),
                startH: Number(t.height),
                startCol: Number(t.grid_col),
                startRow: Number(t.grid_row),
                startMapX: mc.x,
                startMapY: mc.y,
              };
            }
            return;
          }
        }
      }

      // DM-only: drag terrain. Tokens take priority over terrain
      // (so a token standing on a terrain piece is still grabbable).
      if (!isPlayer && !hitToken(mc.x, mc.y)) {
        const t = hitTerrain(mc.x, mc.y);
        if (t) {
          const gs = gridSizeRef.current;
          const ox = offsetXRef.current, oy = offsetYRef.current;
          const tx = ox + Number(t.grid_col) * gs;
          const ty = oy + Number(t.grid_row) * gs;
          terrainDrag = {
            id: t.id,
            startCol: Number(t.grid_col),
            startRow: Number(t.grid_row),
            // Offset from the top-left of the piece to the cursor — so
            // the piece doesn't snap its corner to the cursor on drag.
            offsetCol: (mc.x - tx) / gs,
            offsetRow: (mc.y - ty) / gs,
          };
          onTerrainSelectRef.current?.(t.id);
          return;
        }
      }

      // DM-only: if the click landed on a named spawn-point glyph
      // and the move tool is active, start a spawn drag and skip
      // every other tool/dispatch path. Gating on the move tool means
      // the pan tool can pan freely across spawn zones without
      // accidentally grabbing them. Stage listening is off (perf
      // choice) so we do the drag bookkeeping ourselves. Tokens take
      // priority — if a token sits inside the spawn polygon the
      // click should drag the token, not the zone.
      if (!isPlayer && tool === 'move' && !hitToken(mc.x, mc.y)) {
        const sp = hitSpawnPoint(mc.x, mc.y);
        if (sp) {
          spawnDrag = { id: sp.id, origCol: Number(sp.grid_col), origRow: Number(sp.grid_row) };
          setSpawnDragVis({ id: sp.id, col: spawnDrag.origCol, row: spawnDrag.origRow });
          return;
        }
      }


      // ── Plugin click handlers ────────────────────────────────────────────
      // Plugins can intercept map clicks by registering in
      // pluginRegistries.mapClickHandlers. Returning true consumes the
      // click and skips the host's built-in tool handling. Role gating
      // lets a plugin restrict its handler to DM or player only.
      for (const [, entry] of pluginRegistries.mapClickHandlers.entries()) {
        if (!entry || typeof entry.handler !== 'function') continue;
        if (entry.role === 'dm' && isPlayer) continue;
        if (entry.role === 'player' && !isPlayer) continue;
        try {
          if (entry.handler({ x: mc.x, y: mc.y, tool, isPlayer })) return;
        } catch (err) { /* misbehaving plugin — fall through to next */ }
      }

      // ── Wall tools ────────────────────────────────────────────────────────
      if (WALL_DRAW_TOOLS.has(tool)) {
        if (tool === 'wall-erase') {
          const threshold = 20 / scaleRef.current;
          const hitW = findNearestWall(mc.x, mc.y, wallsRef.current, threshold);
          const hitD = findNearestDoor(mc.x, mc.y, doorsRef.current, threshold);
          if (hitW && (!hitD || hitW.dist <= hitD.dist)) {
            onWallDeleteRef.current?.(hitW.wall.id);
          } else if (hitD) {
            onDoorDeleteRef.current?.(hitD.door.id);
          }
        } else if (tool !== 'wall-polygon') {
          // line / rect / circle: record start, show preview
          wallDrawRef.current = { type: tool.slice(5), startX: mc.x, startY: mc.y };
          setWallPreview({ type: tool.slice(5), points: [mc.x, mc.y, mc.x, mc.y] });
        }
        // polygon: handled on mouseup (click to place points)
        return;
      }

      // ── Door tools ────────────────────────────────────────────────────────
      if (DOOR_DRAW_TOOLS.has(tool)) {
        const doorStyle = tool === 'door-heavy' ? 'heavy' : tool === 'door-port' ? 'portcullis' : 'standard';
        wallDrawRef.current = { type: 'door', style: doorStyle, startX: mc.x, startY: mc.y };
        setWallPreview({ type: 'line', points: [mc.x, mc.y, mc.x, mc.y] });
        return;
      }

      // ── Light tools ───────────────────────────────────────────────────────
      if (LIGHT_DRAW_TOOLS.has(tool)) {
        lightDrawRef.current = { startX: mc.x, startY: mc.y };
        setLightPreview({ cx: mc.x, cy: mc.y, brightR: 0, direction: 0, spread: activeLightSpreadRef.current });
        return;
      }
      if (tool === 'light-erase') {
        const threshold = 40 / scaleRef.current;
        const hit = findNearestLight(mc.x, mc.y, lightsRef.current, threshold);
        if (hit) onLightDeleteRef.current?.(hit.light.id);
        return;
      }
      if (tool === 'light-edit') {
        const threshold = 60 / scaleRef.current;
        const hit = findNearestLight(mc.x, mc.y, lightsRef.current, threshold);
        if (hit) onLightSelectRef.current?.(hit.light);
        return;
      }

      // ── Magical darkness tools ────────────────────────────────────────────
      if (DARKNESS_DRAW_TOOLS.has(tool)) {
        if (DARKNESS_POLY_TOOLS.has(tool)) {
          // Polygon drawing: points added on mouseup; mousedown does nothing special
          return;
        }
        darknessDrawRef.current = { startX: mc.x, startY: mc.y };
        setDarknessPreview({ cx: mc.x, cy: mc.y, r: 0 });
        return;
      }
      if (tool === 'darkness-erase') {
        const threshold = 40 / scaleRef.current;
        const hit = findNearestDarkness(mc.x, mc.y, magicalDarknessRef.current, threshold);
        if (hit) onMagicalDarknessDeleteRef.current?.(hit.darkness.id);
        return;
      }

      if (tool === 'zone-feather') {
        const hit = (magicalDarknessRef.current || []).find(dz =>
          (dz.zone_type === 'water' || dz.zone_type === 'heavy-fog') && pointInZone(mc.x, mc.y, dz)
        );
        if (hit) {
          setFeatherZoneId(hit.id);
          setFeatherValue(hit.feather_amount || 0);
        }
        return;
      }

      // ── Spawn point ───────────────────────────────────────────────────────
      if (tool === 'spawn-point') {
        const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
        // Store exact fractional grid coordinates so marker appears at cursor
        const col = (mc.x - ox) / gs;
        const row = (mc.y - oy) / gs;
        onSetSpawnPointRef.current?.(col, row);
        return;
      }

      // ── Named spawn point (polygon mode) ──────────────────────────────────
      // Each click drops a vertex; Enter or double-click finalises and
      // hands the polygon to the parent for the label modal. Esc cancels.
      // Coordinates kept in map-pixel space during draw — converted to
      // grid space at finalise time.
      if (tool === 'spawn-named') {
        const ref = spawnPolyDrawRef.current;
        spawnPolyDrawRef.current = ref ? [...ref, mc.x, mc.y] : [mc.x, mc.y];
        setSpawnPolyPreview({
          points: [...spawnPolyDrawRef.current],
          cursorX: mc.x,
          cursorY: mc.y,
        });
        return;
      }

      // ── Door erase ────────────────────────────────────────────────────────
      if (tool === 'door-erase') {
        const threshold = 20 / scaleRef.current;
        const hit = findNearestDoor(mc.x, mc.y, doorsRef.current, threshold);
        if (hit) onDoorDeleteRef.current?.(hit.door.id);
        return;
      }

      // ── Spell template tools (DM only — players never have these tools) ─
      if (TEMPLATE_TOOLS.has(tool)) {
        const type = tool === 'tpl-cone' ? 'cone'
                   : tool === 'tpl-circle' ? 'circle'
                   : tool === 'tpl-line' ? 'line'
                   : 'square';
        templateDrawRef.current = { type, startX: mc.x, startY: mc.y };
        setTemplatePreview({ type, points: [mc.x, mc.y, mc.x, mc.y] });
        return;
      }
      if (tool === 'tpl-erase') {
        const threshold = 30 / scaleRef.current;
        const hit = findNearestTemplate(mc.x, mc.y, spellTemplatesRef.current, threshold, gridSize);
        if (hit) onTemplateDeleteRef.current?.(hit.template.id);
        return;
      }
      if (tool === 'tpl-edit') {
        const threshold = 30 / scaleRef.current;
        const hit = findNearestTemplate(mc.x, mc.y, spellTemplatesRef.current, threshold, gridSize);
        if (hit) {
          templateMoveRef.current = {
            id: hit.template.id,
            origPoints: hit.template.points.slice(),
            startMapX: mc.x,
            startMapY: mc.y,
          };
        }
        return;
      }

      // ── Standard tools ────────────────────────────────────────────────────
      if (tool === 'move') {
        const hit = hitToken(mc.x, mc.y);
        if (hit) {
          // Token mousedown — drag the whole group if this token is already
          // part of the selection, otherwise replace selection with just it.
          const liveMulti = multiSelectedRef.current;
          const inGroup = (selectedTokenIdRef.current === hit.id) || liveMulti.has(hit.id);
          const groupIds = inGroup
            ? Array.from(new Set([selectedTokenIdRef.current, hit.id, ...liveMulti].filter(Boolean)))
            : [hit.id];
          if (!inGroup) setMultiSelected(new Set());
          const origPositions = new Map();
          for (const id of groupIds) {
            const tk = tokensRef.current.find(tt => tt.id === id);
            if (tk) origPositions.set(id, { col: Number(tk.grid_col), row: Number(tk.grid_row) });
          }
          tokenDragRef.current = {
            tokenIds: groupIds,
            primaryId: hit.id,
            origPositions,
            startMapX: mc.x,
            startMapY: mc.y,
          };
        } else {
          // Empty-space mousedown starts a marquee. Shift-drag adds to the
          // existing selection instead of replacing it. Use the Pan tool when
          // you actually want to pan with a left-drag.
          marqueeRef.current = {
            startX: mc.x,
            startY: mc.y,
            additive: !!e.shiftKey,
          };
          setMarqueeRect({ x: mc.x, y: mc.y, w: 0, h: 0 });
        }
      } else if (tool === 'pan') {
        panning.current = true;
        panStart.current = { cx: e.clientX, cy: e.clientY, sx: posRef.current.x, sy: posRef.current.y };
      } else if (MEASURE_TOOLS.has(tool)) {
        measuring.current = true;
        setMeas({ type: tool, start: mc, end: mc });
      }
    }

    function onMouseMove(e) {
      const tool = activeToolRef.current;

      // Terrain rotate preview. Angle from the piece's centre to the
      // cursor — 0° = up, clockwise positive (matches Konva).
      if (terrainRotate) {
        const mc = toMap(e.clientX, e.clientY);
        const dx = mc.x - terrainRotate.cx;
        const dy = mc.y - terrainRotate.cy;
        let deg = Math.atan2(dx, -dy) * 180 / Math.PI;
        // Hold Shift for 15° snap — handy for orthogonal alignment.
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        terrainRotate.lastRotation = deg;
        onTerrainResizeRef.current?.(terrainRotate.id, { rotation: deg }, /* live */ true);
        return;
      }

      // Terrain resize preview. Cursor's position in the piece's
      // local (unrotated) frame drives the new width/height — so a
      // rotated piece still resizes along its own axes, not the
      // screen's. Top-left anchored.
      if (terrainResize) {
        const mc = toMap(e.clientX, e.clientY);
        const t = (terrainRef.current || []).find((x) => x.id === terrainResize.id);
        if (!t) return;
        const local = worldToLocal(mc.x, mc.y, t);
        const gs = gridSizeRef.current;
        let newW = terrainResize.startW;
        let newH = terrainResize.startH;
        if (terrainResize.mode === 'br') {
          newW = Math.max(0.25, local.x / gs);
          newH = Math.max(0.25, local.y / gs);
        } else if (terrainResize.mode === 'r') {
          newW = Math.max(0.25, local.x / gs);
        } else if (terrainResize.mode === 'b') {
          newH = Math.max(0.25, local.y / gs);
        }
        terrainResize.lastW = newW;
        terrainResize.lastH = newH;
        onTerrainResizeRef.current?.(terrainResize.id, { width: newW, height: newH }, /* live */ true);
        return;
      }

      // Terrain drag preview — fractional coords, no grid snap.
      if (terrainDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const newCol = (mc.x - ox) / gs - terrainDrag.offsetCol;
        const newRow = (mc.y - oy) / gs - terrainDrag.offsetRow;
        terrainDrag.lastCol = newCol;
        terrainDrag.lastRow = newRow;
        // Trigger a re-render via the parent's optimistic state. Cheap
        // enough at 60Hz; throttling can come later if needed.
        onTerrainMoveRef.current?.(terrainDrag.id, newCol, newRow, /* live */ true);
        return;
      }

      // Spawn-point drag preview. Updates on every mousemove so the
      // bubble follows the cursor; final commit happens in onMouseUp.
      // Coords stay fractional — snapping to integer cells made
      // polygons with non-integer vertices jump unpredictably.
      if (spawnDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        setSpawnDragVis({
          id: spawnDrag.id,
          col: (mc.x - ox) / gs,
          row: (mc.y - oy) / gs,
        });
        return;
      }

      // Right-click drag pans regardless of tool. Tracked separately
      // from the left-click pan tool's `panning.current` so the two
      // can't fight for state.
      if (rightPanning) {
        const dx = e.clientX - rightPanStart.cx;
        const dy = e.clientY - rightPanStart.cy;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) rightPanMoved = true;
        setPos({ x: rightPanStart.sx + dx, y: rightPanStart.sy + dy });
        return;
      }

      // ── Wall preview update ───────────────────────────────────────────────
      if (wallDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = wallDrawRef.current;
        setWallPreview({ type: dr.type, points: [dr.startX, dr.startY, mc.x, mc.y] });
        return;
      }
      if (tool === 'wall-polygon' && polyDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        setWallPreview({ type: 'polygon', points: [...polyDrawRef.current], cursorX: mc.x, cursorY: mc.y });
        return;
      }
      if (tool === 'spawn-named' && spawnPolyDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        setSpawnPolyPreview({
          points: [...spawnPolyDrawRef.current],
          cursorX: mc.x,
          cursorY: mc.y,
        });
        return;
      }

      // ── Light preview update ──────────────────────────────────────────────
      if (lightDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = lightDrawRef.current;
        const dx = mc.x - dr.startX;
        const dy = mc.y - dr.startY;
        const brightR = Math.hypot(dx, dy);
        const direction = Math.atan2(dy, dx) * 180 / Math.PI;
        const spread = activeLightSpreadRef.current;
        setLightPreview({ cx: dr.startX, cy: dr.startY, brightR, direction, spread });
        return;
      }

      // ── Darkness preview update ───────────────────────────────────────────
      if (darkPolyDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        setDarknessPreview({ isPolygon: true, points: [...darkPolyDrawRef.current], cursorX: mc.x, cursorY: mc.y });
        return;
      }
      if (darknessDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = darknessDrawRef.current;
        const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
        setDarknessPreview({ cx: dr.startX, cy: dr.startY, r });
        return;
      }

      // ── Template move preview ─────────────────────────────────────────────
      if (templateMoveRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = templateMoveRef.current;
        const dxMap = mc.x - dr.startMapX;
        const dyMap = mc.y - dr.startMapY;
        const orig = dr.origPoints;
        // For circle, only translate the centre (idx 0,1) and leave radius (idx 2).
        // For line/cone/square, translate both endpoints.
        let next;
        if (orig.length === 3) {
          next = [orig[0] + dxMap, orig[1] + dyMap, orig[2]];
        } else {
          next = [orig[0] + dxMap, orig[1] + dyMap, orig[2] + dxMap, orig[3] + dyMap];
        }
        setTemplateMovePreview({ id: dr.id, points: next });
        return;
      }

      // ── Template preview update ───────────────────────────────────────────
      if (templateDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = templateDrawRef.current;
        if (dr.type === 'circle') {
          const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
          setTemplatePreview({ type: 'circle', points: [dr.startX, dr.startY, r] });
        } else {
          setTemplatePreview({ type: dr.type, points: [dr.startX, dr.startY, mc.x, mc.y] });
        }
        return;
      }

      // ── Marquee selection rectangle ───────────────────────────────────────
      if (marqueeRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const m = marqueeRef.current;
        setMarqueeRect({
          x: Math.min(m.startX, mc.x),
          y: Math.min(m.startY, mc.y),
          w: Math.abs(mc.x - m.startX),
          h: Math.abs(mc.y - m.startY),
        });
        return;
      }

      // ── Token drag ────────────────────────────────────────────────────────
      if (tokenDragRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = tokenDragRef.current;
        const dxMap = mc.x - dr.startMapX;
        const dyMap = mc.y - dr.startMapY;
        const positions = new Map();
        for (const id of dr.tokenIds) {
          const orig = dr.origPositions.get(id);
          if (!orig) continue;
          positions.set(id, {
            x: offsetXRef.current + orig.col * gridSizeRef.current + dxMap,
            y: offsetYRef.current + orig.row * gridSizeRef.current + dyMap,
          });
        }
        setDragVis({ positions });
        return;
      }
      if (panning.current) {
        setPos({
          x: panStart.current.sx + (e.clientX - panStart.current.cx),
          y: panStart.current.sy + (e.clientY - panStart.current.cy),
        });
        return;
      }
      if (measuring.current) {
        const mc = toMap(e.clientX, e.clientY);
        setMeas(prev => prev ? { ...prev, end: mc } : null);
      }
    }

    function onMouseUp(e) {
      // Commit a spawn-point drag (or a no-move click). Either way
      // we clear local drag state. Same-tile mouseup is a no-op for
      // the parent so a stray click doesn't churn the DB.
      if (spawnDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const col = (mc.x - ox) / gs;
        const row = (mc.y - oy) / gs;
        // Tiny-movement guard: a click-without-drag doesn't churn the
        // DB. Threshold in grid units, ~1/10 of a cell.
        if (Math.abs(col - spawnDrag.origCol) > 0.1 || Math.abs(row - spawnDrag.origRow) > 0.1) {
          onSpawnPointMoveRef.current?.(spawnDrag.id, col, row);
        }
        spawnDrag = null;
        setSpawnDragVis(null);
        return;
      }
      // Terrain rotate commit.
      if (terrainRotate) {
        if (terrainRotate.lastRotation !== undefined) {
          onTerrainResizeRef.current?.(terrainRotate.id, { rotation: terrainRotate.lastRotation }, /* live */ false);
        }
        terrainRotate = null;
        return;
      }

      // Terrain resize commit — fires the socket emit on drop so the
      // server stops getting per-frame updates.
      if (terrainResize) {
        if (terrainResize.lastW !== undefined &&
            (Math.abs(terrainResize.lastW - terrainResize.startW) > 0.05 ||
             Math.abs(terrainResize.lastH - terrainResize.startH) > 0.05)) {
          onTerrainResizeRef.current?.(terrainResize.id, {
            width: terrainResize.lastW,
            height: terrainResize.lastH,
          }, /* live */ false);
        }
        terrainResize = null;
        return;
      }

      // Terrain drag commit — only push to the server if the piece
      // actually moved (saves DB churn on a single-click select).
      if (terrainDrag) {
        if (terrainDrag.lastCol !== undefined &&
            (Math.abs(terrainDrag.lastCol - terrainDrag.startCol) > 0.05 ||
             Math.abs(terrainDrag.lastRow - terrainDrag.startRow) > 0.05)) {
          onTerrainMoveRef.current?.(terrainDrag.id, terrainDrag.lastCol, terrainDrag.lastRow, /* live */ false);
        }
        terrainDrag = null;
        return;
      }
      // End the right-click pan-drag without falling through to any
      // left-click finalisation logic. The contextmenu handler reads
      // `rightPanMoved` to decide whether to suppress the menu.
      if (e.button === 2) {
        rightPanning = false;
        return;
      }
      const moved = Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5;
      const tool  = activeToolRef.current;

      // ── Wall tools ────────────────────────────────────────────────────────
      if (WALL_DRAW_TOOLS.has(tool)) {
        if (tool === 'wall-polygon' && !moved) {
          const mc  = toMap(e.clientX, e.clientY);
          const pts = polyDrawRef.current;
          // Close polygon when clicking near first point
          if (pts && pts.length >= 6) {
            const d = Math.hypot(mc.x - pts[0], mc.y - pts[1]);
            if (d < 20 / scaleRef.current) {
              onWallAddRef.current?.({ type: 'polygon', points: pts });
              polyDrawRef.current = null;
              setWallPreview(null);
              return;
            }
          }
          polyDrawRef.current = pts ? [...pts, mc.x, mc.y] : [mc.x, mc.y];
          setWallPreview({ type: 'polygon', points: [...polyDrawRef.current] });
          return;
        }
        if (wallDrawRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const dr = wallDrawRef.current;
          if (dr.type === 'circle') {
            const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (r > 5) onWallAddRef.current?.({ type: 'circle', points: [dr.startX, dr.startY, r] });
          } else {
            const d = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (d > 5) onWallAddRef.current?.({ type: dr.type, points: [dr.startX, dr.startY, mc.x, mc.y] });
          }
          wallDrawRef.current = null;
          setWallPreview(null);
        }
        return; // don't fall through to token/map logic
      }

      // ── Template move complete / select on tap (DM only) ────────────────
      if (tool === 'tpl-edit' && templateMoveRef.current) {
        const dr = templateMoveRef.current;
        if (moved) {
          const mc = toMap(e.clientX, e.clientY);
          const dxMap = mc.x - dr.startMapX;
          const dyMap = mc.y - dr.startMapY;
          const orig = dr.origPoints;
          const next = orig.length === 3
            ? [orig[0] + dxMap, orig[1] + dyMap, orig[2]]
            : [orig[0] + dxMap, orig[1] + dyMap, orig[2] + dxMap, orig[3] + dyMap];
          onTemplateUpdateRef.current?.({ id: dr.id, points: next });
        } else {
          onTemplateSelectRef.current?.(dr.id);
        }
        templateMoveRef.current = null;
        setTemplateMovePreview(null);
        return;
      }

      // ── Spell template draw complete (DM only) ──────────────────────────
      if (TEMPLATE_TOOLS.has(tool)) {
        if (templateDrawRef.current) {
          const dr = templateDrawRef.current;
          const mc = toMap(e.clientX, e.clientY);
          let points = null;
          if (dr.type === 'circle') {
            const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (r > 5) points = [dr.startX, dr.startY, r];
          } else {
            const d = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (d > 5) points = [dr.startX, dr.startY, mc.x, mc.y];
          }
          if (points) onTemplatePlaceRef.current?.({ type: dr.type, points });
          templateDrawRef.current = null;
          setTemplatePreview(null);
        }
        return;
      }

      // ── Light drawing complete ────────────────────────────────────────────
      if (LIGHT_DRAW_TOOLS.has(tool)) {
        if (lightDrawRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const dr = lightDrawRef.current;
          const dx = mc.x - dr.startX;
          const dy = mc.y - dr.startY;
          const brightR = Math.hypot(dx, dy);
          if (brightR > 5) {
            const dirDeg = Math.atan2(dy, dx) * 180 / Math.PI;
            onLightAddRef.current?.({
              x: dr.startX, y: dr.startY,
              brightRadius: Math.round(brightR),
              dimRadius: Math.round(brightR * 2),
              direction: Math.round(dirDeg),
            });
          }
          lightDrawRef.current = null;
          setLightPreview(null);
        }
        return;
      }
      if (tool === 'light-erase') return;

      // ── Magical darkness / heavy fog drawing complete ─────────────────────
      if (DARKNESS_DRAW_TOOLS.has(tool)) {
        // Polygon tools: click to add vertices, click near first vertex to close
        if (DARKNESS_POLY_TOOLS.has(tool)) {
          if (!moved) {
            const mc = toMap(e.clientX, e.clientY);
            const pts = darkPolyDrawRef.current;
            if (!pts) {
              // First vertex
              darkPolyDrawRef.current = [mc.x, mc.y];
              darkPolyToolRef.current = tool;
              setDarknessPreview({ isPolygon: true, points: [mc.x, mc.y], cursorX: mc.x, cursorY: mc.y });
            } else if (pts.length >= 6 && Math.hypot(mc.x - pts[0], mc.y - pts[1]) < 18 / scaleRef.current) {
              // Close polygon — enough vertices and near start point
              onMagicalDarknessAddRef.current?.({
                zoneType: darkPolyToolRef.current === 'fog-polygon' ? 'heavy-fog' : darkPolyToolRef.current === 'water-polygon' ? 'water' : 'darkness',
                shape: 'polygon',
                x: 0, y: 0, radius: 0,
                polyPoints: pts,
              });
              darkPolyDrawRef.current = null;
              setDarknessPreview(null);
            } else {
              // Add vertex
              darkPolyDrawRef.current = [...pts, mc.x, mc.y];
              setDarknessPreview({ isPolygon: true, points: [...darkPolyDrawRef.current], cursorX: mc.x, cursorY: mc.y });
            }
          }
          return;
        }
        // Circle tools
        if (darknessDrawRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const dr = darknessDrawRef.current;
          const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
          if (r > 5) {
            onMagicalDarknessAddRef.current?.({
              x: dr.startX, y: dr.startY,
              radius: Math.round(r),
              zoneType: tool === 'heavy-fog' ? 'heavy-fog' : tool === 'water-circle' ? 'water' : 'darkness',
            });
          }
          darknessDrawRef.current = null;
          setDarknessPreview(null);
        }
        return;
      }
      if (tool === 'darkness-erase') return;

      // ── Door drawing complete ─────────────────────────────────────────────
      if (DOOR_DRAW_TOOLS.has(tool)) {
        if (wallDrawRef.current && wallDrawRef.current.type === 'door') {
          const mc = toMap(e.clientX, e.clientY);
          const dr = wallDrawRef.current;
          const d  = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
          if (d > 5) {
            onDoorAddRef.current?.({ style: dr.style, points: [dr.startX, dr.startY, mc.x, mc.y] });
          }
          wallDrawRef.current = null;
          setWallPreview(null);
        }
        return;
      }

      // ── Marquee complete — pick all tokens whose centre is inside the box.
      if (marqueeRef.current) {
        const m = marqueeRef.current;
        const rect = {
          x: Math.min(m.startX, toMap(e.clientX, e.clientY).x),
          y: Math.min(m.startY, toMap(e.clientX, e.clientY).y),
          w: 0, h: 0,
        };
        const mc = toMap(e.clientX, e.clientY);
        const x1 = Math.min(m.startX, mc.x), y1 = Math.min(m.startY, mc.y);
        const x2 = Math.max(m.startX, mc.x), y2 = Math.max(m.startY, mc.y);
        if (moved) {
          const gs = gridSizeRef.current;
          const ox = offsetXRef.current, oy = offsetYRef.current;
          const ids = [];
          for (const t of tokensRef.current) {
            const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
            const cx = ox + Number(t.grid_col) * gs + (sz.gridW * gs) / 2;
            const cy = oy + Number(t.grid_row) * gs + (sz.gridH * gs) / 2;
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) ids.push(t.id);
          }
          setMultiSelected(prev => {
            if (m.additive) {
              const next = new Set(prev);
              for (const id of ids) next.add(id);
              return next;
            }
            return new Set(ids);
          });
        } else {
          // Treat a non-drag click on empty space as "clear selection".
          setMultiSelected(new Set());
          onTokenSelectRef.current?.(null);
        }
        marqueeRef.current = null;
        setMarqueeRect(null);
        return;
      }

      // ── Token drag / select ───────────────────────────────────────────────
      if (tokenDragRef.current) {
        const dr = tokenDragRef.current;
        if (moved) {
          const mc = toMap(e.clientX, e.clientY);
          const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
          const dxMap = mc.x - dr.startMapX;
          const dyMap = mc.y - dr.startMapY;
          for (const id of dr.tokenIds) {
            const orig = dr.origPositions.get(id);
            if (!orig) continue;
            const finalX = ox + orig.col * gs + dxMap;
            const finalY = oy + orig.row * gs + dyMap;
            onTokenMoveRef.current(id, (finalX - ox) / gs, (finalY - oy) / gs);
          }
        } else {
          onTokenSelectRef.current?.(dr.primaryId);
        }
        tokenDragRef.current = null;
        setDragVis(null);
      } else if (!moved) {
        // DM can click near a door (pan or move mode) to toggle it
        if (onDoorToggleRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const hit = findNearestDoor(mc.x, mc.y, doorsRef.current, 14 / scaleRef.current);
          if (hit) {
            onDoorToggleRef.current(hit.door.id);
            panning.current = false;
            measuring.current = false;
            return;
          }
        }
        if (placingTokenRef.current && onMapClickRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
          onMapClickRef.current(
            Math.floor((mc.x - ox) / gs),
            Math.floor((mc.y - oy) / gs),
          );
        } else {
          onTokenSelectRef.current?.(null);
          // Clicking empty space also clears any active multi-selection.
          setMultiSelected(prev => (prev.size === 0 ? prev : new Set()));
        }
      }

      panning.current  = false;
      measuring.current = false;
    }

    // Spawn polygon: convert in-progress map-pixel vertices into the
    // grid-space {col, row} list the parent expects, then hand off to
    // onSpawnNamedAdd. Resets the in-progress state either way.
    function finaliseSpawnPolygon() {
      const ref = spawnPolyDrawRef.current;
      spawnPolyDrawRef.current = null;
      setSpawnPolyPreview(null);
      if (!ref || ref.length < 6) return; // need ≥3 vertices
      const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
      const pts = [];
      for (let i = 0; i < ref.length; i += 2) {
        pts.push({ col: (ref[i] - ox) / gs, row: (ref[i + 1] - oy) / gs });
      }
      onSpawnNamedAddRef.current?.(pts);
    }

    // Escape = cancel in-progress draws. Enter = finalise polygons
    // (walls or spawn) when at least 3 vertices have been placed.
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        if (spawnPolyDrawRef.current && spawnPolyDrawRef.current.length >= 6) {
          finaliseSpawnPolygon();
          return;
        }
        if (polyDrawRef.current && polyDrawRef.current.length >= 6) {
          onWallAddRef.current?.({ type: 'polygon', points: polyDrawRef.current });
          polyDrawRef.current = null;
          setWallPreview(null);
          return;
        }
      }
      if (e.key === 'Escape') {
        if (polyDrawRef.current) {
          const pts = polyDrawRef.current;
          if (pts.length >= 6) onWallAddRef.current?.({ type: 'polygon', points: pts });
          polyDrawRef.current = null;
        }
        wallDrawRef.current = null;
        setWallPreview(null);
        // Cancel darkness/fog polygon
        if (darkPolyDrawRef.current) {
          darkPolyDrawRef.current = null;
          setDarknessPreview(null);
        }
        darknessDrawRef.current = null;
        // Cancel any in-progress spawn polygon. Esc always discards;
        // use Enter to finalise.
        spawnPolyDrawRef.current = null;
        setSpawnPolyPreview(null);
      }
    }

    function onContextMenu(e) {
      e.preventDefault();
      // If the user just finished a right-drag pan, swallow the menu —
      // they meant to pan, not to open a door / token menu. The flag
      // is cleared after each contextmenu so the next plain right-
      // click without a drag opens the menu normally.
      if (rightPanMoved) {
        rightPanMoved = false;
        return;
      }
      // Token right-click takes priority over door-flip when a token is
      // under the cursor — DM-only callback; player passes a no-op.
      if (onTokenContextMenuRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const tk = hitToken(mc.x, mc.y);
        if (tk) {
          onTokenContextMenuRef.current(tk.id, e.clientX, e.clientY);
          return;
        }
      }
      // Terrain right-click — DM-only menu (delete / reveal / edit).
      // Falls through to the door-flip path below if no piece is hit.
      if (onTerrainContextMenuRef.current && !isPlayer) {
        const mc = toMap(e.clientX, e.clientY);
        const t = hitTerrain(mc.x, mc.y);
        if (t) {
          onTerrainContextMenuRef.current(t.id, e.clientX, e.clientY);
          return;
        }
      }
      if (onDoorFlipRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const hit = findNearestDoor(mc.x, mc.y, doorsRef.current, 14 / scaleRef.current);
        if (hit) onDoorFlipRef.current(hit.door.id);
      }
    }

    container.addEventListener('mousedown',   onMouseDown);
    container.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('keydown',   onKeyDown);
    return () => {
      container.removeEventListener('mousedown',   onMouseDown);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('keydown',   onKeyDown);
    };
  }, []); // stable — all live state accessed via refs

  // ── Wheel zoom (Konva) ────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const pt = stageRef.current.getPointerPosition();
    const s0 = scaleRef.current, p0 = posRef.current;
    const mx = (pt.x - p0.x) / s0, my = (pt.y - p0.y) / s0;
    const s1 = Math.max(0.08, Math.min(10, s0 * (e.evt.deltaY < 0 ? 1.1 : 1 / 1.1)));
    setScale(s1);
    setPos({ x: pt.x - mx * s1, y: pt.y - my * s1 });
  }, []);

  // ── Touch handlers (Konva) ────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    const t = e.evt.touches;
    if (t.length === 1) {
      const tool = activeToolRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const mc = {
        x: (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current,
        y: (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current,
      };
      if (tool === 'move') {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const hit = tokensRef.current.find(tk => {
          const sz = TOKEN_SIZES[tk.size] || TOKEN_SIZES.medium;
          const tx = ox + Number(tk.grid_col) * gs, ty = oy + Number(tk.grid_row) * gs;
          return mc.x >= tx && mc.x < tx + sz.gridW * gs && mc.y >= ty && mc.y < ty + sz.gridH * gs;
        });
        if (hit) {
          // Touch drag: single-token only (no shift modifier on touch).
          tokenDragRef.current = {
            tokenIds: [hit.id],
            primaryId: hit.id,
            origPositions: new Map([[hit.id, { col: Number(hit.grid_col), row: Number(hit.grid_row) }]]),
            startMapX: mc.x,
            startMapY: mc.y,
          };
          return;
        }
      }
      if (tool === 'pan' || tool === 'move') {
        panning.current = true;
        panStart.current = { cx: t[0].clientX, cy: t[0].clientY, sx: posRef.current.x, sy: posRef.current.y };
      } else if (MEASURE_TOOLS.has(tool)) {
        measuring.current = true;
        setMeas({ type: tool, start: mc, end: mc });
      }
    } else if (t.length === 2) {
      tokenDragRef.current = null; setDragVis(null);
      panning.current = false; measuring.current = false;
      pinchDist.current = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.evt.preventDefault();
    const t = e.evt.touches;
    const rect = containerRef.current.getBoundingClientRect();
    if (t.length === 1) {
      if (tokenDragRef.current) {
        const dr = tokenDragRef.current;
        const mapX = (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current;
        const mapY = (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current;
        const dxMap = mapX - dr.startMapX;
        const dyMap = mapY - dr.startMapY;
        const positions = new Map();
        for (const id of dr.tokenIds) {
          const orig = dr.origPositions.get(id);
          if (!orig) continue;
          positions.set(id, {
            x: offsetXRef.current + orig.col * gridSizeRef.current + dxMap,
            y: offsetYRef.current + orig.row * gridSizeRef.current + dyMap,
          });
        }
        setDragVis({ positions });
      } else if (panning.current) {
        setPos({
          x: panStart.current.sx + (t[0].clientX - panStart.current.cx),
          y: panStart.current.sy + (t[0].clientY - panStart.current.cy),
        });
      } else if (measuring.current) {
        const mc = {
          x: (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current,
          y: (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current,
        };
        setMeas(prev => prev ? { ...prev, end: mc } : null);
      }
    } else if (t.length === 2) {
      const d = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
      if (pinchDist.current > 0) {
        const mx = (t[0].clientX + t[1].clientX) / 2;
        const my = (t[0].clientY + t[1].clientY) / 2;
        const s0 = scaleRef.current, p0 = posRef.current;
        const mapX = (mx - p0.x) / s0, mapY = (my - p0.y) / s0;
        const s1 = Math.max(0.08, Math.min(10, s0 * (d / pinchDist.current)));
        setScale(s1);
        setPos({ x: mx - mapX * s1, y: my - mapY * s1 });
      }
      pinchDist.current = d;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (tokenDragRef.current) {
      const dr = tokenDragRef.current;
      const t  = e.evt.changedTouches;
      if (t.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const mapX = (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current;
        const mapY = (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
        const dxMap = mapX - dr.startMapX, dyMap = mapY - dr.startMapY;
        for (const id of dr.tokenIds) {
          const orig = dr.origPositions.get(id);
          if (!orig) continue;
          const finalX = ox + orig.col * gs + dxMap;
          const finalY = oy + orig.row * gs + dyMap;
          onTokenMoveRef.current(id, (finalX - ox) / gs, (finalY - oy) / gs);
        }
      }
      tokenDragRef.current = null;
      setDragVis(null);
    }
    panning.current  = false;
    measuring.current = false;
    pinchDist.current = 0;
  }, []);

  // Cursor
  const cursor = placingToken                     ? 'crosshair'
    : activeTool === 'pan'                        ? 'grab'
    : activeTool === 'move'                       ? 'default'
    : MEASURE_TOOLS.has(activeTool)               ? 'crosshair'
    : activeTool === 'wall-erase'                 ? 'not-allowed'
    : activeTool === 'light-erase'                ? 'not-allowed'
    : activeTool === 'door-erase'                 ? 'not-allowed'
    : activeTool === 'darkness-erase'             ? 'not-allowed'
    : activeTool === 'zone-feather'               ? 'pointer'
    : WALL_DRAW_TOOLS.has(activeTool)             ? 'crosshair'
    : DOOR_DRAW_TOOLS.has(activeTool)             ? 'crosshair'
    : LIGHT_DRAW_TOOLS.has(activeTool)            ? 'crosshair'
    : DARKNESS_DRAW_TOOLS.has(activeTool)         ? 'crosshair'
    : SPAWN_TOOLS.has(activeTool)                 ? 'crosshair'
    : 'default';

  // Grid lines — centered so partial cells are equal on both sides
  const gridLines = [];
  for (let c = 0; offsetX + c * gridSize <= mW; c++)
    gridLines.push(<Line key={`v${c}`} points={[offsetX + c * gridSize, 0, offsetX + c * gridSize, mH]} stroke={gridColor} strokeWidth={gridThickness} listening={false} />);
  for (let r = 0; offsetY + r * gridSize <= mH; r++)
    gridLines.push(<Line key={`h${r}`} points={[0, offsetY + r * gridSize, mW, offsetY + r * gridSize]} stroke={gridColor} strokeWidth={gridThickness} listening={false} />);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden" style={{ cursor, position: 'relative' }}>
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        scaleX={scale} scaleY={scale}
        x={pos.x} y={pos.y}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ background: '#111827' }}
        listening={false}
      >
        {/* Map image */}
        <Layer listening={false}>
          {mapUrl
            ? <MapImage src={mapUrl} onDims={onDims} />
            : <Rect width={mW} height={mH} fill="#1f2937" listening={false} />}
        </Layer>

        {/* Grid */}
        <Layer listening={false}>{gridLines}</Layer>

        {/* Walls — DM only */}
        {!fogOfWar && (
          <Layer listening={false}>
            {walls.map(w => <WallShape key={w.id} wall={w} />)}
            <WallPreview preview={wallPreview} />
          </Layer>
        )}

        {/* Doors — always rendered (players see doors; DM sees open/closed state).
            Door preview uses the wall preview yellow dashed style. */}
        <Layer listening={false}>
          {doors.map(d => <DoorShape key={d.id} door={d} />)}
          {DOOR_DRAW_TOOLS.has(activeTool) && <WallPreview preview={wallPreview} />}
        </Layer>

        {/* Marquee selection rectangle — drawn while drag-selecting. */}
        {marqueeRect && (marqueeRect.w > 0 || marqueeRect.h > 0) && (
          <Layer listening={false}>
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.w}
              height={marqueeRect.h}
              fill="rgba(96,165,250,0.10)"
              stroke="rgba(96,165,250,0.85)"
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          </Layer>
        )}

        {/* Spell templates — DM places and edits them, but the resulting
            shapes (and any plugin-driven elemental overlays) render for
            both DM and players so AOE effects are visible at the table. */}
        <Layer listening={false}>
          {(spellTemplates || []).map(t => {
            // DM-side live-translate during drag — players never see the
            // half-finished position because the move preview is DM state.
            const live = !isPlayer && templateMovePreview && templateMovePreview.id === t.id
              ? { ...t, points: templateMovePreview.points }
              : t;
            return (
              <TemplateShapeWithDecorators
                key={t.id}
                template={live}
                // Selection highlight is a DM affordance for editing — players
                // get the unselected look regardless.
                isSelected={!isPlayer && selectedTemplateId === t.id}
                gridSize={gridSize}
              />
            );
          })}
          {!isPlayer && (TEMPLATE_TOOLS.has(activeTool) || activeTool === 'tpl-erase') && templatePreview && (
            <TemplatePreview preview={templatePreview} gridSize={gridSize} />
          )}
        </Layer>

        {/* Lights — DM-only visual indicators; players see the lighting effect via FOW, not these circles */}
        {!isPlayer && (
          <Layer listening={false}>
            {lights.map(l => <LightShape key={l.id} light={l} />)}
            {/* Token-attached lights */}
            {tokens.filter(t => (Number(t.token_light_bright) || 0) > 0 || (Number(t.token_light_dim) || 0) > 0).map(t => {
              const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
              const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
              const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
              const pxPerFt = gridSize / FEET_PER_SQUARE;
              const fakeLight = {
                x: cx, y: cy,
                bright_radius: (Number(t.token_light_bright) || 0) * pxPerFt,
                dim_radius: (Number(t.token_light_dim) || 0) * pxPerFt,
                color: t.token_light_color || '#fbbf24',
              };
              return <LightShape key={`tl-${t.id}`} light={fakeLight} />;
            })}
            {LIGHT_DRAW_TOOLS.has(activeTool) && <LightPreview preview={lightPreview} gridSize={gridSize} />}
          </Layer>
        )}

        {/* Magical Darkness / Heavy Fog zones — DM-only visual indicators.
            Players experience these via the fog canvas re-fill step. */}
        {!isPlayer && (
          <Layer listening={false}>
            {magicalDarkness.map(dz =>
              dz.zone_type === 'heavy-fog' ? <FogZone key={dz.id} dz={dz} /> :
              dz.zone_type === 'water'     ? <WaterZone key={dz.id} dz={dz} /> :
                                             <DarknessZone key={dz.id} dz={dz} />
            )}
            {DARKNESS_DRAW_TOOLS.has(activeTool) && (
              <DarknessPreview
                preview={darknessPreview}
                gridSize={gridSize}
                isFog={activeTool === 'heavy-fog' || activeTool === 'fog-polygon'}
                isWater={activeTool === 'water-circle' || activeTool === 'water-polygon'}
              />
            )}
          </Layer>
        )}

        {/* Spawn point marker — DM-only. When the map's spawn point has
            a radius, render the bubble that new tokens scatter into. */}
        {!isPlayer && spawnPoint != null && (
          <Layer listening={false}>
            {(() => {
              const sx = offsetX + spawnPoint.col * gridSize;
              const sy = offsetY + spawnPoint.row * gridSize;
              const r = Number(spawnPoint.radius) || 0;
              const bubble = r > 0 ? r * gridSize : gridSize * 0.45;
              return (
                <Group x={sx} y={sy}>
                  <Circle radius={bubble} stroke="#22c55e" strokeWidth={2} dash={[6, 4]} fill="#22c55e" fillOpacity={r > 0 ? 0.08 : 0.15} />
                  <Circle radius={5} fill="#22c55e" />
                  <Text text="⚑" fontSize={gridSize * 0.4} fill="#22c55e" x={4} y={-gridSize * 0.45} />
                </Group>
              );
            })()}
          </Layer>
        )}

        {/* Named spawn points — DM-only. Cyan to distinguish from the
            map's default green spawn glyph; label rendered above. The
            DM can drag the centre dot to relocate; on release the
            grid-snapped col/row goes back to the parent. */}
        {!isPlayer && (
          <Layer listening={false}>
            {spawnPoints.map((sp) => {
              const isDragging = spawnDragVis && spawnDragVis.id === sp.id;
              const dragDx = isDragging ? (spawnDragVis.col - Number(sp.grid_col)) : 0;
              const dragDy = isDragging ? (spawnDragVis.row - Number(sp.grid_row)) : 0;
              const col = Number(sp.grid_col) + dragDx;
              const row = Number(sp.grid_row) + dragDy;
              const sx = offsetX + col * gridSize;
              const sy = offsetY + row * gridSize;
              const label = sp.label || 'Spawn';
              const r = Number(sp.radius) || 0;
              const poly = Array.isArray(sp.shape_points) ? sp.shape_points : null;
              const bubble = r > 0 ? r * gridSize : gridSize * 0.4;
              // Polygon mode: render the closed shape with the centre
              // dot at the stored anchor (which the DM is dragging).
              if (poly && poly.length >= 3) {
                // Polygon points are stored absolute; we offset them
                // from the dragged centre by the original anchor so a
                // drag relocates the whole shape.
                const flat = [];
                for (const p of poly) {
                  const px = offsetX + (Number(p.col) + dragDx) * gridSize;
                  const py = offsetY + (Number(p.row) + dragDy) * gridSize;
                  flat.push(px, py);
                }
                // Centroid for the label position.
                let lx = 0, ly = 0;
                for (let i = 0; i < flat.length; i += 2) { lx += flat[i]; ly += flat[i + 1]; }
                lx /= (flat.length / 2); ly /= (flat.length / 2);
                const labelW = Math.max(gridSize * 1.6, gridSize * 2);
                return (
                  <Group key={sp.id} opacity={isDragging ? 0.7 : 1}>
                    <Line
                      points={flat}
                      closed
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dash={[6, 4]}
                      // Konva's `Line` ignores `fillOpacity`, so encode
                      // the alpha channel directly. 0.5 keeps the map
                      // visible underneath while clearly marking the
                      // zone.
                      fill="rgba(6,182,212,0.5)"
                    />
                    <Circle x={sx} y={sy} radius={4} fill="#06b6d4" />
                    <Text
                      text={label}
                      fontSize={Math.max(11, gridSize * 0.28)}
                      fill="#fff"
                      stroke="#0e7490"
                      strokeWidth={2.4}
                      fillAfterStrokeEnabled
                      x={lx - labelW / 2}
                      y={ly - gridSize * 0.2}
                      width={labelW}
                      align="center"
                    />
                  </Group>
                );
              }
              // Legacy bubble (radius) / single-tile glyph.
              const labelW = Math.max(gridSize * 1.2, bubble * 2);
              return (
                <Group key={sp.id} x={sx} y={sy} opacity={isDragging ? 0.7 : 1}>
                  <Circle radius={bubble} stroke="#06b6d4" strokeWidth={2} dash={[6, 4]} fill={r > 0 ? "rgba(6,182,212,0.5)" : "rgba(6,182,212,0.5)"} />
                  <Circle radius={4} fill="#06b6d4" />
                  <Text
                    text={label}
                    fontSize={Math.max(11, gridSize * 0.28)}
                    fill="#fff"
                    stroke="#0e7490"
                    strokeWidth={2.4}
                    fillAfterStrokeEnabled
                    x={-labelW / 2}
                    y={-(bubble + gridSize * 0.35)}
                    width={labelW}
                    align="center"
                  />
                </Group>
              );
            })}
            {/* In-progress polygon preview while the DM places vertices
                with the spawn-named tool. */}
            {spawnPolyPreview && spawnPolyPreview.points.length >= 2 && (() => {
              const pts = spawnPolyPreview.points;
              const cur = [...pts];
              if (spawnPolyPreview.cursorX != null) {
                cur.push(spawnPolyPreview.cursorX, spawnPolyPreview.cursorY);
              }
              const dots = [];
              for (let i = 0; i < pts.length; i += 2) {
                dots.push(<Circle key={i} x={pts[i]} y={pts[i + 1]} radius={3.5} fill="#06b6d4" />);
              }
              return (
                <Group>
                  <Line
                    points={cur}
                    closed={pts.length >= 6}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    dash={[5, 4]}
                    fill={pts.length >= 6 ? "rgba(6,182,212,0.5)" : null}
                  />
                  {dots}
                </Group>
              );
            })()}
          </Layer>
        )}

        {/* Map terrain — placed pieces from the global library. Below
            tokens so a creature standing on a tree renders on top. The
            DM sees pieces flagged hide_until_revealed (until revealed)
            with reduced opacity + a dashed border; players never see
            them at all (filtered server-side). The Group rotates
            around the piece's visual centre (offset = w/2, h/2). */}
        <Layer listening={false}>
          {terrain.map((t) => {
            const img = terrainImages[t.lib_image_path];
            if (!img) return null;
            const x = offsetX + Number(t.grid_col) * gridSize;
            const y = offsetY + Number(t.grid_row) * gridSize;
            const w = Number(t.width)  * gridSize;
            const h = Number(t.height) * gridSize;
            const rot = Number(t.rotation) || 0;
            const ghosted = !isPlayer && t.hide_until_revealed && !t.is_revealed;
            const selected = !isPlayer && selectedTerrainId === t.id;
            // Scale the rotate handle's stub length with the piece's
            // visible size so it shrinks at zoom-out instead of
            // floating off in screen space. Floor at 8px so it stays
            // grabbable on tiny pieces.
            const rotOffsetPx = Math.max(h * 0.18, 8);
            return (
              <Group
                key={t.id}
                x={x + w / 2}
                y={y + h / 2}
                offsetX={w / 2}
                offsetY={h / 2}
                rotation={rot}
                opacity={ghosted ? 0.45 : 1}
              >
                <KonvaImage image={img} width={w} height={h} />
                {ghosted && (
                  <Rect
                    width={w}
                    height={h}
                    stroke="#a78bfa"
                    strokeWidth={1.5}
                    dash={[6, 4]}
                    fill="rgba(167,139,250,0.06)"
                  />
                )}
                {selected && (
                  <Rect
                    width={w}
                    height={h}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    dash={[5, 3]}
                  />
                )}
                {/* Resize + rotate handles — visual only; the actual
                    hit-test runs in the DOM mousedown handler since
                    the Stage has listening={false}. */}
                {selected && (
                  <>
                    <Line
                      points={[w / 2, 0, w / 2, -rotOffsetPx]}
                      stroke="#06b6d4"
                      strokeWidth={1.5 / scale}
                    />
                    <Circle x={w / 2} y={-rotOffsetPx} radius={6} fill="#22d3ee" stroke="#fff" strokeWidth={1.5} />
                    <Circle x={w}     y={h}     radius={6} fill="#06b6d4" stroke="#fff" strokeWidth={1.5} />
                    <Circle x={w}     y={h / 2} radius={5} fill="#06b6d4" stroke="#fff" strokeWidth={1.5} />
                    <Circle x={w / 2} y={h}     radius={5} fill="#06b6d4" stroke="#fff" strokeWidth={1.5} />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>

        {/* Submerged tokens — below the water canvas so they get distorted.
            DM sees them at reduced opacity to signal they are hidden from players. */}
        <Layer listening={false} ref={submergedTokensLayerRef} perfectDrawEnabled={false}>
          {sortByZBump(tokens).map(t => {
            const isSubmerged = Array.isArray(t.conditions) && t.conditions.includes('submerged');
            if (!isSubmerged) return null;
            const overrideOpacity = !isPlayer ? 0.55 : null;
            const showLabel = tokenLabelVis.get(t.id) ?? true;
            return (
              <Token
                key={t.id}
                token={t}
                gridSize={gridSize}
                offset={tokenOffset}
                isPlayer={isPlayer}
                isSelected={selectedTokenId === t.id || multiSelected.has(t.id)}
                isCurrentTurn={currentCombatTokenId === t.id}
                dragVisPos={dragVis?.positions?.get(t.id) || null}
                playerTokenId={playerTokenId}
                showLabel={showLabel}
                overrideOpacity={overrideOpacity}
                tokenNameFontSize={tokenNameFontSize}
              />
            );
          })}
        </Layer>

        {/* Non-submerged tokens — composited above the water canvas so they
            appear on the surface undistorted. */}
        <Layer listening={false} ref={aboveWaterTokensLayerRef} perfectDrawEnabled={false}>
          {sortByZBump(tokens).map(t => {
            const isSubmerged = Array.isArray(t.conditions) && t.conditions.includes('submerged');
            if (isSubmerged) return null;

            const isInvisible = Array.isArray(t.conditions) && t.conditions.includes('invisible');
            const isOwnToken  = t.id === playerTokenId;
            let overrideOpacity = null;
            if (isInvisible) {
              if (!isPlayer) {
                overrideOpacity = 0.35;
              } else if (isOwnToken) {
                overrideOpacity = 0.45;
              } else if (!canSeeInvisible(t, visOrigins, offsetX, offsetY, gridSize)) {
                return null;
              }
            }

            const showLabel = tokenLabelVis.get(t.id) ?? true;
            return (
              <Token
                key={t.id}
                token={t}
                gridSize={gridSize}
                offset={tokenOffset}
                isPlayer={isPlayer}
                isSelected={selectedTokenId === t.id || multiSelected.has(t.id)}
                isCurrentTurn={currentCombatTokenId === t.id}
                dragVisPos={dragVis?.positions?.get(t.id) || null}
                playerTokenId={playerTokenId}
                showLabel={showLabel}
                overrideOpacity={overrideOpacity}
                tokenNameFontSize={tokenNameFontSize}
              />
            );
          })}
        </Layer>

        {/* Plugin map decorations. Rendered ABOVE tokens so plugins can
            draw things like tree canopies, clouds, etc. that occlude
            tokens. Layer is non-interactive — plugin nodes never
            intercept clicks. Plugins handle clicks via mapClickHandlers
            in pluginRegistry.js if they need them. */}
        <Layer listening={false}>
          {Array.from(pluginRegistries.mapDecorations.entries()).map(([pid, fn]) => {
            try {
              const node = fn({
                tokens, gridSize, offsetX, offsetY,
                mapWidth: mW, mapHeight: mH,
                isPlayer, playerTokenId,
              });
              return node ? <React.Fragment key={pid}>{node}</React.Fragment> : null;
            } catch (err) {
              console.warn(`mapDecoration "${pid}" threw:`, err);
              return null;
            }
          })}
        </Layer>

        {/* DM-only markers — rendered above tokens, never visible to players */}
        {dmMarkers.length > 0 && (
          <Layer>
            {dmMarkers.map((m) => {
              const cx = offsetX + (Number(m.grid_col) + 0.5) * gridSize;
              const cy = offsetY + (Number(m.grid_row) + 0.5) * gridSize;
              const r  = Math.max(18, gridSize * 0.38);
              if (m.marker_type === 'text_label') {
                const labelText = m.label || m.note || '';
                const fontSize = Math.max(11, gridSize * 0.28);
                const approxW = Math.max(labelText.length * fontSize * 0.6, 60);
                return (
                  <React.Fragment key={m.id}>
                    <Rect
                      x={cx - approxW / 2 - 6} y={cy - fontSize / 2 - 5}
                      width={approxW + 12} height={fontSize + 10}
                      fill="rgba(0,0,0,0.72)" cornerRadius={4}
                      stroke="#facc15" strokeWidth={1}
                      onClick={() => onDmMarkerClick?.(m)}
                      onTap={() => onDmMarkerClick?.(m)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Text
                      x={cx - approxW / 2} y={cy - fontSize / 2}
                      width={approxW} height={fontSize + 2}
                      text={labelText}
                      fontSize={fontSize}
                      fill="#facc15"
                      fontStyle="bold"
                      align="center" verticalAlign="middle"
                      listening={false}
                    />
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={m.id}>
                  <Circle
                    x={cx} y={cy} radius={r}
                    fill={DM_MARKER_COLORS[m.marker_type] || '#6b7280'}
                    opacity={0.82}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={1.5}
                    onClick={() => onDmMarkerClick?.(m)}
                    onTap={() => onDmMarkerClick?.(m)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Text
                    x={cx - r} y={cy - r}
                    width={r * 2} height={r * 2}
                    text={DM_MARKER_ICONS[m.marker_type] || '📝'}
                    fontSize={Math.max(14, r * 0.9)}
                    align="center" verticalAlign="middle"
                    listening={false}
                  />
                  {m.note && (
                    <Circle
                      x={cx + r * 0.6} y={cy - r * 0.6}
                      radius={4} fill="white" opacity={0.9}
                      listening={false}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Layer>
        )}

        {/* Measurement overlay — always on top */}
        <Layer listening={false}>
          {remoteMeasurements.map((rm) => (
            <MeasureOverlay key={rm.name} meas={rm.meas} gridSize={gridSize} tint={rm.color} />
          ))}
          <MeasureOverlay meas={meas} gridSize={gridSize} />
        </Layer>
      </Stage>

      {/* Water/illusion effect — sits above Konva but below FoW so it is hidden in
          unexplored areas. Applies horizontal-slice pixel distortion + caustic overlays. */}
      <canvas
        ref={waterCanvasRef}
        width={stageSize.w}
        height={stageSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />

      {/* Light glow — sits above the map/tokens but below fog so darkness occludes it.
          mix-blend-mode: screen makes the warm amber glow additive so it brightens
          whatever is below (including tokens) rather than painting over them. */}
      {fogOfWar && (
        <canvas
          ref={glowCanvasRef}
          width={stageSize.w}
          height={stageSize.h}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Fog of war — HTML canvas overlay so destination-out compositing works
          reliably across all browsers (Konva sceneFunc approach is unreliable).
          Canvas is oversized by 2*fowBlur on each side so CSS blur never clips
          at the browser viewport edge (Safari-safe alternative to ctx.filter). */}
      {fogOfWar && (
        <canvas
          ref={fogCanvasRef}
          width={stageSize.w + 2 * Math.ceil(fowBlur * scale)}
          height={stageSize.h + 2 * Math.ceil(fowBlur * scale)}
          style={{
            position: 'absolute',
            top: -Math.ceil(fowBlur * scale),
            left: -Math.ceil(fowBlur * scale),
            pointerEvents: 'none',
            filter: fowBlur > 0 ? `blur(${Math.round(fowBlur * scale)}px)` : 'none',
          }}
        />
      )}

      {/* Tremorsense blip canvas — above the fog canvas, no blur.
          Shows sonar-ring indicators for grounded tokens detected by tremorsense
          that are not yet revealed by normal line of sight. */}
      <canvas
        ref={blipCanvasRef}
        width={stageSize.w}
        height={stageSize.h}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Feather tool panel — floats above selected zone centroid */}
      {activeTool === 'zone-feather' && featherZoneId && (() => {
        const dz = magicalDarkness.find(d => d.id === featherZoneId);
        if (!dz) return null;
        const { x: czX, y: czY } = zoneCentroid(dz);
        const panelX = czX * scale + pos.x;
        const panelY = czY * scale + pos.y;
        return (
          <div
            style={{ position: 'absolute', left: panelX, top: panelY, transform: 'translate(-50%, -115%)', zIndex: 60 }}
            className="bg-gray-900 border border-cyan-700 rounded-xl p-3 shadow-2xl min-w-[180px]"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="text-xs text-cyan-400 font-semibold mb-2 capitalize">
              {dz.zone_type === 'heavy-fog' ? 'Fog' : 'Water'} — edge feather
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={50} step={1}
                value={featherValue}
                onChange={e => {
                  const v = Number(e.target.value);
                  setFeatherValue(v);
                  onZoneFeatherChangeRef.current?.(featherZoneId, v);
                }}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs text-gray-300 w-10 text-right font-mono">
                {featherValue === 0 ? 'auto' : featherValue}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredMenu } from '../utils/anchoredMenu.js';
import { PING_SIZES } from '../utils/ping.js';
import CompassTool from './CompassTool.jsx';

// ── Icons ─────────────────────────────────────────────────────────────────────

const PanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M9 11V6.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M12 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M15 11V8.5a1.5 1.5 0 0 1 3 0v3.5c0 3.314-2.686 6-6 6s-6-2.686-6-6V11a1.5 1.5 0 0 1 3 0" />
  </svg>
);

const MoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 3v18M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RulerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M4 20L20 4" strokeLinecap="round" />
    <path d="M8.5 15.5l2-2M12 12l2-2M15.5 8.5l2-2" strokeLinecap="round" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="4" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const ConeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M12 3L3 21h18L12 3z" strokeLinejoin="round" />
  </svg>
);

const CircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    <line x1="12" y1="12" x2="20" y2="12" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);

const WallLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <line x1="4" y1="20" x2="20" y2="4" strokeLinecap="round" />
    <circle cx="4" cy="20" r="2" fill="currentColor" stroke="none" />
    <circle cx="20" cy="4" r="2" fill="currentColor" stroke="none" />
  </svg>
);

const WallRectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <rect x="4" y="4" width="16" height="16" strokeLinejoin="round" />
  </svg>
);

const WallPolyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <polygon points="12,3 21,18 3,18" strokeLinejoin="round" />
  </svg>
);

const WallCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const LedgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <line x1="3" y1="14" x2="21" y2="14" strokeLinecap="round" strokeDasharray="4 2" />
    <path d="M12 14v-5M9 12l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} />
  </svg>
);

const WindowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <line x1="3" y1="14" x2="21" y2="14" strokeLinecap="round" />
    <line x1="8" y1="11" x2="8" y2="17" strokeLinecap="round" strokeWidth={1.4} />
    <line x1="16" y1="11" x2="16" y2="17" strokeLinecap="round" strokeWidth={1.4} />
  </svg>
);

const DoorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <line x1="5" y1="20" x2="19" y2="20" strokeLinecap="round" strokeWidth={2.5} />
    <path d="M5 20 Q5 8 19 20" strokeLinecap="round" fill="none" strokeWidth={1} />
    <circle cx="5" cy="20" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const LightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.3" />
    <circle cx="12" cy="12" r="8" strokeDasharray="3 2" strokeOpacity="0.7" />
    <line x1="12" y1="2"  x2="12" y2="5"  strokeLinecap="round" />
    <line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" />
    <line x1="2"  y1="12" x2="5"  y2="12" strokeLinecap="round" />
    <line x1="19" y1="12" x2="22" y2="12" strokeLinecap="round" />
  </svg>
);

const EraseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M20 20H7L3 16l9-13 8 10-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="20" x2="20" y2="20" strokeLinecap="round" />
  </svg>
);

const SpawnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.3" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <line x1="12" y1="2" x2="12" y2="6" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" strokeLinecap="round" />
    <line x1="2" y1="12" x2="6" y2="12" strokeLinecap="round" />
    <line x1="18" y1="12" x2="22" y2="12" strokeLinecap="round" />
    <path d="M8 4l2 2M16 4l-2 2M4 8l2 2M20 8l-2 2" strokeLinecap="round" strokeOpacity="0.5" />
  </svg>
);

const MagicalDarknessIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.28" strokeDasharray="4 2" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.65" stroke="none" />
    <line x1="12" y1="1" x2="12" y2="4" strokeLinecap="round" strokeOpacity="0.6" />
    <line x1="12" y1="20" x2="12" y2="23" strokeLinecap="round" strokeOpacity="0.6" />
    <line x1="1" y1="12" x2="4" y2="12" strokeLinecap="round" strokeOpacity="0.6" />
    <line x1="20" y1="12" x2="23" y2="12" strokeLinecap="round" strokeOpacity="0.6" />
  </svg>
);

const DarknessPolyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <polygon points="12,3 21,18 3,18" fill="currentColor" fillOpacity="0.28" strokeDasharray="4 2" strokeLinejoin="round" />
    <circle cx="12" cy="3" r="2" fill="currentColor" stroke="none" />
    <circle cx="21" cy="18" r="2" fill="currentColor" stroke="none" />
    <circle cx="3" cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

const HeavyFogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.18" strokeDasharray="4 2" />
    <line x1="6" y1="10" x2="18" y2="10" strokeLinecap="round" strokeOpacity="0.7" />
    <line x1="5" y1="13" x2="19" y2="13" strokeLinecap="round" strokeOpacity="0.7" />
    <line x1="7" y1="16" x2="17" y2="16" strokeLinecap="round" strokeOpacity="0.5" />
  </svg>
);

const FogPolyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <polygon points="12,3 21,18 3,18" fill="currentColor" fillOpacity="0.18" strokeDasharray="4 2" strokeLinejoin="round" />
    <line x1="6"  y1="13" x2="18" y2="13" strokeLinecap="round" strokeOpacity="0.7" />
    <line x1="8"  y1="16" x2="16" y2="16" strokeLinecap="round" strokeOpacity="0.5" />
    <circle cx="12" cy="3"  r="2" fill="currentColor" stroke="none" />
    <circle cx="21" cy="18" r="2" fill="currentColor" stroke="none" />
    <circle cx="3"  cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

const WaterCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.18" strokeDasharray="4 2" />
    <path d="M5 12 Q8 9 12 12 Q16 15 19 12" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
    <path d="M6 15 Q9 12 12 15 Q15 18 18 15" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
  </svg>
);

const WaterPolyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <polygon points="12,3 21,18 3,18" fill="currentColor" fillOpacity="0.18" strokeDasharray="4 2" strokeLinejoin="round" />
    <path d="M6 13 Q9 10.5 12 13 Q15 15.5 18 13" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
    <circle cx="12" cy="3"  r="2" fill="currentColor" stroke="none" />
    <circle cx="21" cy="18" r="2" fill="currentColor" stroke="none" />
    <circle cx="3"  cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

const FeatherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.45" strokeOpacity="0.9" />
    <circle cx="12" cy="12" r="6.5" strokeOpacity="0.45" />
    <circle cx="12" cy="12" r="9.5" strokeOpacity="0.15" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="5.5" strokeOpacity="0.7" />
    <circle cx="12" cy="12" r="9" strokeOpacity="0.35" strokeDasharray="3 2" />
  </svg>
);

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="12" cy="12" r="9" />
    {/* The needle, as a compass rose draws it: one filled half, one open. */}
    <polygon points="12,5 14,12 12,11 10,12" fill="currentColor" stroke="none" />
    <polygon points="12,19 10,12 12,13 14,12" fill="currentColor" fillOpacity="0.35" stroke="none" />
  </svg>
);

const FogBlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeOpacity="0.5" strokeDasharray="3 2" />
    <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" fillOpacity="0.25" />
    <line x1="5" y1="19" x2="19" y2="5" strokeOpacity="0.6" />
  </svg>
);

const PortalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <ellipse cx="12" cy="12" rx="6" ry="9" />
    <ellipse cx="12" cy="12" rx="2.5" ry="4.5" strokeOpacity="0.6" />
    <path d="M12 3v0M12 21v0" strokeLinecap="round" />
  </svg>
);

// ── Tool groups config ────────────────────────────────────────────────────────

const PenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M4 20l4-1 9.5-9.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z" strokeLinejoin="round" />
    <path d="M13.5 6.5l4 4" strokeLinecap="round" />
  </svg>
);

const DrawEraseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M4 20l4-1 9.5-9.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z" strokeLinejoin="round" />
    <path d="M15 19h6M18 16l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Drawing is offered to players as well as the GM, so it sits outside the
// showWallTools split below.
const DRAW_GROUP = {
  id: 'draw',
  label: 'Draw',
  color: 'dnd-gold',
  icon: <PenIcon />,
  tools: [
    { id: 'draw',       label: 'Pen',      key: '6', icon: <PenIcon /> },
    { id: 'draw-erase', label: 'Undo ink', key: '7', icon: <DrawEraseIcon />, danger: true },
  ],
};

const MEASURE_GROUP = {
  id: 'measure',
  label: 'Measure',
  color: 'dnd-gold',
  icon: <RulerIcon />,
  tools: [
    { id: 'ruler',  label: 'Ruler',  key: '3', icon: <RulerIcon /> },
    { id: 'cone',   label: 'Cone',   key: '4', icon: <ConeIcon /> },
    { id: 'circle', label: 'Circle', key: '5', icon: <CircleIcon /> },
  ],
};

const WALL_GROUP = {
  id: 'wall',
  label: 'Walls',
  color: 'orange-500',
  icon: <WallLineIcon />,
  tools: [
    { id: 'wall-line',    label: 'Line',   key: 'W', icon: <WallLineIcon /> },
    { id: 'wall-rect',    label: 'Rect',   key: 'R', icon: <WallRectIcon /> },
    { id: 'wall-polygon', label: 'Poly',   key: 'P', icon: <WallPolyIcon /> },
    { id: 'wall-circle',  label: 'Circle', key: 'O', icon: <WallCircleIcon /> },
    { id: 'wall-ledge',   label: 'Ledge',  key: 'T', icon: <LedgeIcon /> },
    { id: 'wall-window',  label: 'Window', key: 'S', icon: <WindowIcon /> },
    { id: 'wall-erase',   label: 'Erase',  key: 'E', icon: <EraseIcon />, danger: true },
  ],
};

const DOOR_GROUP = {
  id: 'door',
  label: 'Doors',
  color: 'amber-600',
  icon: <DoorIcon />,
  tools: [
    { id: 'door-std',   label: 'Door',  key: 'D', icon: <DoorIcon /> },
    { id: 'door-erase', label: 'Erase', key: 'F', icon: <EraseIcon />, danger: true },
  ],
};

const LIGHT_DARK_GROUP = {
  id: 'light-dark',
  label: 'Light/Dark',
  color: 'yellow-500',
  icon: <LightIcon />,
  tools: [
    { id: 'light',             label: 'Place Light', key: 'L', icon: <LightIcon /> },
    { id: 'light-edit',        label: 'Edit Light',  key: 'J', icon: <FeatherIcon /> },
    { id: 'light-erase',       label: 'Erase Light', key: 'X', icon: <EraseIcon />, danger: true },
    { id: 'magical-darkness',  label: 'Darkness',    key: 'M', icon: <MagicalDarknessIcon /> },
    { id: 'darkness-polygon',  label: 'Dark Poly',   key: 'G', icon: <DarknessPolyIcon /> },
    { id: 'darkness-erase',    label: 'Erase Dark',  key: 'N', icon: <EraseIcon />, danger: true },
  ],
};

const EFFECTS_GROUP = {
  id: 'effects',
  label: 'Effects',
  color: 'cyan-600',
  icon: <HeavyFogIcon />,
  tools: [
    { id: 'heavy-fog',      label: 'Heavy Fog',  key: 'F', icon: <HeavyFogIcon /> },
    { id: 'fog-polygon',    label: 'Fog Poly',   key: 'H', icon: <FogPolyIcon /> },
    { id: 'water-circle',   label: 'Water',      key: 'W', icon: <WaterCircleIcon /> },
    { id: 'water-polygon',  label: 'Water Poly', key: 'E', icon: <WaterPolyIcon /> },
    { id: 'zone-feather',   label: 'Feather',    key: 'Q', icon: <FeatherIcon /> },
    { id: 'darkness-erase', label: 'Erase',      key: 'N', icon: <EraseIcon />, danger: true },
  ],
};

// Ping, in three sizes.
//
// A group rather than a size control beside the button: the active tool already
// encodes which one is armed, exactly as it does for draw and measure, so there
// is no second piece of state that can disagree with the rail. Labels come from
// the shared table so the rail and the wire can't drift.
const PING_GROUP = {
  id: 'ping',
  label: 'Ping',
  icon: <PingIcon />,
  tools: PING_SIZES.map((s, i) => ({
    id: i === 0 ? 'ping' : `ping-${s.id}`,
    label: s.label,
    title: s.hint,
    // Only the default keeps a shortcut. Three bindings for one gesture is
    // more keyboard than the choice is worth.
    key: i === 0 ? 'C' : undefined,
    icon: <PingIcon />,
  })),
};

// The same effects, minus Feather, for the 3D rail.
//
// Feather doesn't place anything — it selects an existing zone and edits its
// edge softness through a slider that lives with the flat map's zone chrome.
// Offering the button in 3D without that panel would be a tool that visibly
// does nothing, which is worse than not offering it.
const EFFECTS_GROUP_3D = {
  ...EFFECTS_GROUP,
  tools: EFFECTS_GROUP.tools.filter((t) => t.id !== 'zone-feather'),
};

const SPAWN_GROUP = {
  id: 'spawn',
  label: 'Spawn',
  color: 'green-500',
  icon: <SpawnIcon />,
  tools: [
    { id: 'spawn-point', label: 'Set Spawn',  key: 'Z', icon: <SpawnIcon /> },
    { id: 'spawn-named', label: 'Add Named', key: 'X', icon: <SpawnIcon /> },
  ],
};

const TEMPLATE_GROUP = {
  id: 'template',
  label: 'Templates',
  color: 'purple-500',
  icon: <ConeIcon />,
  tools: [
    { id: 'tpl-cone',   label: 'Cone',   key: 'U', icon: <ConeIcon /> },
    { id: 'tpl-circle', label: 'Sphere', key: 'I', icon: <CircleIcon /> },
    { id: 'tpl-line',   label: 'Line',   key: 'K', icon: <RulerIcon /> },
    { id: 'tpl-square', label: 'Cube',   key: 'B', icon: <WallRectIcon /> },
    { id: 'tpl-edit',   label: 'Move/Edit', key: 'Y', icon: <FeatherIcon /> },
    { id: 'tpl-erase',  label: 'Erase',  key: 'V', icon: <EraseIcon />, danger: true },
  ],
};

// Templates on the 3D rail — the full set, Move/Edit included.
//
// Move/Edit is how a template's label and colour get set, so leaving it out
// made every template placed in 3D permanently anonymous. It resolves to a
// press on the board like the rest: drag one to move it, click one to open its
// settings, and the settings dialog is the host's own — it renders above this
// overlay already.
const TEMPLATE_GROUP_3D = TEMPLATE_GROUP;

const PORTAL_GROUP = {
  id: 'portal',
  label: 'Portals',
  color: 'fuchsia-500',
  icon: <PortalIcon />,
  tools: [
    { id: 'portal-place', label: 'Place Pair', key: '6', icon: <PortalIcon /> },
    { id: 'portal-erase', label: 'Erase',      key: '7', icon: <EraseIcon />, danger: true },
  ],
};

// The rail is split by how often a tool is reached for, not by what it does.
//
// PRIMARY is the handful used constantly while play is running — pan, move,
// draw, measure, ping. They sit together with no divider because they are one
// set of gestures, not five categories.
//
// OTHER is the map-building half: walls, doors, lighting, effects, templates,
// spawns, portals, and the fog block. All of it matters when preparing a map
// and almost none of it is touched mid-encounter, which is why it collapses —
// eight group buttons down the side of the screen is a lot of board to give up
// for tools nobody is about to press.
//
// Measure is no longer in this list: it moved up to PRIMARY, and leaving it
// here as well would have put two Measure buttons on the GM's rail.
const OTHER_GROUPS = [WALL_GROUP, DOOR_GROUP, LIGHT_DARK_GROUP, EFFECTS_GROUP, TEMPLATE_GROUP, SPAWN_GROUP, PORTAL_GROUP];
const OTHER_GROUPS_3D = [EFFECTS_GROUP_3D, TEMPLATE_GROUP_3D];

const FOG_BLOCK_TOOL = { id: 'fog-block', label: 'Fog Block', key: 'V', icon: <FogBlockIcon /> };

// Which tool ids live inside a collapsed section, so the toggle can show that
// something in there is armed. A hidden active tool with no sign of it is the
// one way this collapse could bite: the GM presses on the board and gets a
// wall instead of a pan, with nothing on screen explaining why.
function toolIdsIn(groups, extraTools = []) {
  const ids = new Set(extraTools.map((t) => t.id));
  for (const g of groups) for (const t of (g.tools || [])) ids.add(t.id);
  return ids;
}

const OTHER_IDS = toolIdsIn(OTHER_GROUPS, [FOG_BLOCK_TOOL]);
const OTHER_IDS_3D = toolIdsIn(OTHER_GROUPS_3D);

const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
       strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {open ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
  </svg>
);

// Remembered per rail so collapsing it stays collapsed into the next session —
// the point is to get it off the screen and leave it off.
//
// The absent-key case is checked explicitly. `localStorage.getItem` returns
// null for a key that was never written, and coercing that to a boolean would
// have made "never set" mean "collapsed", hiding half the toolbar from every
// GM the first time they loaded the app.
function readOtherOpen(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return true;
    return raw !== 'false';
  } catch { return true; }
}

// ── Fitting the rail to the window ──────────────────────────────────────────
//
// The GM's rail is fourteen buttons tall when everything is showing, which is
// more than a laptop or a landscape tablet has room for — it ran off the top
// and bottom of the screen and the tools at the ends became unreachable.
//
// Height is computed from the number of buttons rather than measured. Measuring
// would mean rendering, reading the height, re-rendering smaller and reading
// again, which can oscillate on a boundary; every button here has a fixed
// height, so the arithmetic is exact and settles in one pass.
//
// Scrolling is the last resort, not the first: shrinking the buttons keeps
// every tool visible at once, which is the point of a rail.
const DENSITIES = {
  full:    { btn: 48, gap: 4, toggle: 36, labels: true },
  compact: { btn: 40, gap: 3, toggle: 30, labels: true },
  mini:    { btn: 32, gap: 2, toggle: 24, labels: false },
};
const DENSITY_ORDER = ['full', 'compact', 'mini'];
const RAIL_PADDING = 12;   // p-1.5 top and bottom
const RAIL_MARGIN = 16;    // clear of the window edges
const DIVIDER = 5;

function railHeight(density, buttons, toggles, dividers) {
  const d = DENSITIES[density];
  const items = buttons + toggles;
  return buttons * d.btn + toggles * d.toggle
    + Math.max(0, items - 1) * d.gap
    + dividers * DIVIDER + RAIL_PADDING;
}

// The densest layout that still fits, and whether even the smallest overflows —
// in which case the rail scrolls, which is why the flyouts had to leave it.
function fitRail(buttons, toggles, dividers, viewportH) {
  // A non-finite or absurd height means we could not read the window. Assume
  // there is room rather than assuming there is none: NaN failed every fit
  // test below and silently dropped the rail to its smallest, label-less
  // density — a worse outcome than being slightly too tall on an odd host.
  const h = Number.isFinite(viewportH) && viewportH > 0 ? viewportH : 900;
  const avail = Math.max(120, h - RAIL_MARGIN);
  for (const key of DENSITY_ORDER) {
    if (railHeight(key, buttons, toggles, dividers) <= avail) {
      return { density: key, scroll: false, maxHeight: avail };
    }
  }
  return { density: 'mini', scroll: true, maxHeight: avail };
}

// `|| 900` catches innerHeight being 0 or undefined as well as window being
// absent — a measurement of zero must not read as "no room at all".
function readViewportHeight() {
  if (typeof window === 'undefined') return 900;
  return Number(window.innerHeight) || 900;
}

function useViewportHeight() {
  const [h, setH] = useState(readViewportHeight);
  useEffect(() => {
    const on = () => setH(readViewportHeight());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    // On mobile the visual viewport shrinks as browser chrome appears;
    // window.innerHeight alone misses it.
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      if (vv) vv.removeEventListener('resize', on);
    };
  }, []);
  return h;
}

// Shared by both rails: the container's classes and style for a given fit.
function railShell(fit) {
  return {
    className: `absolute left-2 top-1/2 -translate-y-1/2 z-40 flex flex-col ${
      fit.density === 'mini' ? 'gap-0.5' : fit.density === 'compact' ? 'gap-[3px]' : 'gap-1'
    } bg-gray-900/95 border border-gray-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-sm ${
      fit.scroll ? 'overflow-y-auto overscroll-contain' : ''
    }`,
    style: { maxHeight: fit.maxHeight },
  };
}

// Controlled: the rail owns `open` because it has to know how many buttons are
// showing before it can pick a density.
function OtherSection({ open, onToggle, hasActive, density = 'full', children }) {
  return (
    <>
      <div className="border-t border-gray-700 my-0.5" />
      <button
        onClick={onToggle}
        title={open ? 'Hide the map-building tools' : 'Show the map-building tools'}
        aria-expanded={open}
        className={`relative flex flex-col items-center justify-center gap-0.5 ${
          density === 'mini' ? 'w-9 h-6' : density === 'compact' ? 'w-11 h-[30px]' : 'w-12 h-9'
        } rounded-lg transition-colors ${
          open ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
        }`}
      >
        <ChevronIcon open={open} />
        {DENSITIES[density].labels && <span className="text-[9px] font-semibold leading-none">Other</span>}
        {!open && hasActive && (
          <span
            title="A tool in here is selected"
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-dnd-gold"
          />
        )}
      </button>
      {open && children}
    </>
  );
}

// ── Flyout group button ───────────────────────────────────────────────────────

function GroupButton({ group, activeTool, onToolChange, extra, density = 'full' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isGroupActive = group.tools.some(t => t.id === activeTool);

  // Close flyout when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      // The flyout lives on <body> now, so it is not inside `ref` any more —
      // without this second test, clicking a tool in the flyout would count as
      // an outside click and close the menu before the click landed.
      if (ref.current && ref.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-toolflyout]')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Where the flyout should open: just right of this button, aligned to its top.
  // Read on open rather than stored, so a rail that has scrolled or resized
  // since still puts the flyout against the button the user actually pressed.
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setAnchor({ x: r.right + 8, y: r.top });
  }, [open]);

  // Active tool's icon for the group button
  const activeTool_ = group.tools.find(t => t.id === activeTool);
  const displayIcon = activeTool_?.icon ?? group.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={group.label}
        className={`relative flex flex-col items-center justify-center gap-0.5 ${BTN_SIZE[density]} rounded-lg transition-all select-none ${
          isGroupActive
            ? `bg-${group.color} text-white shadow-lg scale-105`
            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
        }`}
      >
        {displayIcon}
        {DENSITIES[density].labels && <span className="text-[9px] font-semibold leading-none">{group.label}</span>}
        <span className="absolute bottom-0.5 right-0.5 opacity-60"><ChevronRightIcon /></span>
      </button>

      {open && createPortal(
        <FlyoutPanel anchor={anchor}>
          {group.tools.map(tool => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => { onToolChange(tool.id); setOpen(false); }}
                title={tool.key ? `${tool.label} (${tool.key})` : tool.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all select-none text-sm font-medium whitespace-nowrap ${
                  active
                    ? tool.danger
                      ? 'bg-red-600 text-white shadow-lg'
                      : `bg-${group.color} text-white shadow-lg`
                    : tool.danger
                    ? 'text-red-400 hover:bg-red-900/40 hover:text-red-300'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <span className="ml-auto text-[10px] font-mono opacity-50">{tool.key}</span>
              </button>
            );
          })}
          {extra && (
            <div className="border-t border-gray-700 mt-0.5 pt-1.5">
              {extra}
            </div>
          )}
        </FlyoutPanel>,
        document.body,
      )}
    </div>
  );
}

// The flyout, rendered on <body> rather than inside the rail.
//
// It used to be an absolutely-positioned child of the rail with its own
// bespoke clamping. That stopped working the moment the rail needed to scroll:
// a scroll container clips its children on BOTH axes, so the flyout would have
// been cut off at the rail's edge — and `position: fixed` could not have escaped
// it either, because the rail carries a transform and so becomes the containing
// block for fixed descendants.
//
// Positioning comes from the same hook the right-click menus use, which already
// slides a panel up to fit, pins and scrolls it when it is taller than the
// screen, and flips it to the other side when there is no room — all the
// behaviour the hand-rolled version only partly had.
//
// `fixed` is not optional. The hook hands back nothing but `left`/`top`/
// `maxHeight` — it is the caller's job to say what those coordinates are
// measured against, and every other caller (the token and terrain context
// menus, AnchoredPanel) adds `fixed` itself. Without it this div stayed
// `position: static`: left/top were ignored, z-index did not apply either, and
// the flyout was laid out at the very end of <body> — off-screen for all
// practical purposes. Every group on the rail (Draw, Measure, Ping, and the
// whole map-building section) opens through here, so the entire rail read as
// dead: the button depressed and nothing appeared.
//
// z-[85] rather than z-[60] because the rail exists in the 3D view too, and
// that overlay is a fixed z-70 sheet. The portal target is <body>, so the
// flyout is not inside the overlay and does not inherit its level — at 60 it
// would have opened behind the board it belongs to. 85 clears the overlay and
// the z-80 chrome that survives on top of it, and still sits under the modals
// at z-90.
function FlyoutPanel({ anchor, children }) {
  const a = useAnchoredMenu(anchor.x, anchor.y);
  return (
    <div
      ref={a.ref}
      style={a.style}
      data-toolflyout=""
      className={`fixed flex flex-col gap-1 bg-gray-900 border border-gray-600 rounded-xl p-1.5 shadow-2xl z-[85] min-w-max ${a.className}`}
    >
      {children}
    </div>
  );
}

// ── Tool button (simple, always visible) ─────────────────────────────────────

// Sizes for each density. Tailwind needs whole class names, so these are
// written out rather than interpolated.
const BTN_SIZE = { full: 'w-12 h-12', compact: 'w-11 h-10', mini: 'w-9 h-8' };

// The compass button and its panel.
//
// Not a member of `activeTool`. Everything else on the rail arms a gesture the
// map is then waiting for; the compass arms nothing, so making it a tool would
// take away the GM's current one and give them nothing that needs the pointer
// back. It keeps its own open/shut state and leaves the board as it was.
//
// Rendered by the rail rather than by the views, so the flat map and the 3D
// board both get it from one place — this file is the only thing they share.
function CompassButton({ density }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ToolButton
        tool={{ id: 'compass', label: 'Compass', icon: <CompassIcon /> }}
        activeTool={open ? 'compass' : null}
        onToolChange={() => setOpen((o) => !o)}
        density={density}
      />
      {/* Through a portal, like the group flyouts above, and for the same
          reason: the rail is `-translate-y-1/2`, and a transform makes an
          element the containing block for its fixed descendants. Rendered
          inline, a `fixed` panel would be positioned against the RAIL instead
          of the viewport, and trapped under the rail's own z-40 besides. */}
      {open && createPortal(
        <CompassTool onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

function ToolButton({ tool, activeTool, onToolChange, density = 'full' }) {
  const active = activeTool === tool.id;
  const showLabel = DENSITIES[density].labels;
  return (
    <button
      onClick={() => onToolChange(tool.id)}
      // At mini the label is gone, so the title carries the whole name — it is
      // the only thing left that says what the icon does.
      title={tool.key ? `${tool.label} (${tool.key})` : tool.label}
      className={`relative flex flex-col items-center justify-center gap-0.5 ${BTN_SIZE[density]} rounded-lg transition-all select-none ${
        active
          ? 'bg-dnd-gold text-gray-900 shadow-lg shadow-yellow-900/40 scale-105'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
      }`}
    >
      {tool.icon}
      {showLabel && <span className="text-[9px] font-semibold leading-none">{tool.label}</span>}
      {showLabel && tool.key && (
        <span className={`absolute top-0.5 right-1 text-[8px] leading-none font-mono ${active ? 'text-gray-700' : 'text-gray-600'}`}>
          {tool.key}
        </span>
      )}
    </button>
  );
}

// ── Main ToolPanel ────────────────────────────────────────────────────────────

const LIGHT_SHAPES = [
  { id: 'circle', label: '● Circle', title: 'Omnidirectional (360°)' },
  { id: 'cone',   label: '◈ Cone',   title: 'Narrow beam (60°) — drag sets direction' },
  { id: 'panel',  label: '◑ Panel',  title: 'Half-circle panel (180°) — drag sets direction' },
];

export default function ToolPanel({ activeTool, onToolChange, showWallTools = false, lightShape = 'circle', onLightShapeChange }) {
  const [otherOpen, setOtherOpen] = useState(() => readOtherOpen('ttf.toolrail.other.2d'));
  useEffect(() => {
    try { localStorage.setItem('ttf.toolrail.other.2d', String(otherOpen)); } catch { /* private mode */ }
  }, [otherOpen]);

  const viewportH = useViewportHeight();
  // Count what will actually render, then size to fit it.
  const buttons = 2 /* pan, move */ + 2 /* draw, measure */
    + (showWallTools ? 2 : 0)                                   // ping, compass
    + (showWallTools && otherOpen ? 1 + OTHER_GROUPS.length : 0); // fog block + groups
  const toggles = showWallTools ? 1 : 0;
  const dividers = showWallTools ? 1 : 0;
  const fit = fitRail(buttons, toggles, dividers, viewportH);
  const shell = railShell(fit);
  const d = fit.density;

  const lightExtra = onLightShapeChange ? (
    <div className="px-1 pb-0.5 space-y-1.5">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">Shape</div>
      <div className="flex flex-col gap-1">
        {LIGHT_SHAPES.map(s => (
          <button
            key={s.id}
            title={s.title}
            onClick={() => onLightShapeChange(s.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              lightShape === s.id
                ? 'bg-yellow-600/40 border border-yellow-500 text-yellow-200'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white border border-transparent'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {lightShape !== 'circle' && (
        <div className="text-[10px] text-gray-500 px-1">Drag to set direction</div>
      )}
    </div>
  ) : null;

  return (
    <div className={shell.className} style={shell.style}>
      {/* In play: pan, move, draw, measure, ping — one set, no dividers.
          Ping stays GM-only, as it was. */}
      <ToolButton tool={{ id: 'pan',  label: 'Pan',  key: '1', icon: <PanIcon /> }}  activeTool={activeTool} onToolChange={onToolChange} density={d} />
      <ToolButton tool={{ id: 'move', label: 'Move', key: '2', icon: <MoveIcon /> }} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      <GroupButton group={DRAW_GROUP} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      <GroupButton group={MEASURE_GROUP} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      {showWallTools && (
        <GroupButton group={PING_GROUP} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      )}
      {showWallTools && <CompassButton density={d} />}

      {/* Map building, collapsed away when it is not wanted. */}
      {showWallTools && (
        <OtherSection
          open={otherOpen}
          onToggle={() => setOtherOpen((o) => !o)}
          hasActive={OTHER_IDS.has(activeTool)}
          density={d}
        >
          <ToolButton tool={FOG_BLOCK_TOOL} activeTool={activeTool} onToolChange={onToolChange} density={d} />
          {OTHER_GROUPS.map(group => (
            <GroupButton
              key={group.id}
              group={group}
              activeTool={activeTool}
              onToolChange={onToolChange}
              density={d}
              extra={group.id === 'light-dark' ? lightExtra : undefined}
            />
          ))}
        </OtherSection>
      )}
    </div>
  );
}

// ── The 3D view's rail ────────────────────────────────────────────────────────
//
// The same Draw and Measure flyouts the flat map offers, plus — for the GM —
// Ping and the Effects group. Pan has no equivalent: a left-drag on empty floor
// always orbits, whatever tool is up.
//
// Sharing the group definitions with the panel above is the point: the measure
// options and the effects options are then the same in both views by
// construction rather than by memory.
//
// `isGM` gates the GM half exactly as `showWallTools` does on the flat map —
// a player has no business fogging the board or pinging it.
export function Tool3DPanel({ activeTool, onToolChange, isGM = false }) {
  const [otherOpen, setOtherOpen] = useState(() => readOtherOpen('ttf.toolrail.other.3d'));
  useEffect(() => {
    try { localStorage.setItem('ttf.toolrail.other.3d', String(otherOpen)); } catch { /* private mode */ }
  }, [otherOpen]);

  const viewportH = useViewportHeight();
  const buttons = 1 /* move */ + 2 /* draw, measure */
    + (isGM ? 2 : 0) /* ping, compass */
    + (isGM && otherOpen ? OTHER_GROUPS_3D.length : 0);
  const fit = fitRail(buttons, isGM ? 1 : 0, isGM ? 1 : 0, viewportH);
  const shell = railShell(fit);
  const d = fit.density;

  return (
    <div className={shell.className} style={shell.style}>
      {/* Move is the default here. Same split as the flat rail so the two
          read alike: the in-play gestures together, map building collapsed. */}
      <ToolButton tool={{ id: 'move', label: 'Move', key: '2', icon: <MoveIcon /> }} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      <GroupButton group={DRAW_GROUP} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      <GroupButton group={MEASURE_GROUP} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      {isGM && (
        <GroupButton group={PING_GROUP} activeTool={activeTool} onToolChange={onToolChange} density={d} />
      )}
      {isGM && <CompassButton density={d} />}
      {isGM && (
        <OtherSection
          open={otherOpen}
          onToggle={() => setOtherOpen((o) => !o)}
          hasActive={OTHER_IDS_3D.has(activeTool)}
          density={d}
        >
          {OTHER_GROUPS_3D.map(group => (
            <GroupButton key={group.id} group={group} activeTool={activeTool} onToolChange={onToolChange} density={d} />
          ))}
        </OtherSection>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';

// An offer in one of these states is finished with and leaves the GM's list.
const OFFER_SETTLED = ['accepted', 'declined', 'withdrawn'];
import MapStage, { TOKEN_SIZES, tokenFootprint, DM_MARKER_ICONS, DM_MARKER_COLORS } from './MapStage.jsx';
import DiceRoller, { DiceRollOverlay } from './DiceRoller.jsx';
import RollLog from './RollLog.jsx';
// Lazy: three.js is ~600KB and most sessions never open the 3D view.
import ErrorBoundary from './ErrorBoundary.jsx';
import { prefetchSky } from '../utils/skyTexture.js';
import { prepareSkyUpload } from '../utils/skyConvert.js';
const Map3DView = React.lazy(() => import('./Map3DView.jsx'));
import ViewToggle from './ViewToggle.jsx';
import Thumb from './Thumb.jsx';
import { resolveLevelAfterMove, occupiedLevel } from '../utils/levelFloor.js';
import { gridOffsets } from '../utils/ships.js';
import RollableTables from './RollableTables.jsx';
import CreatureLibrary from './CreatureLibrary.jsx';
import SpellLibrary from './SpellLibrary.jsx';
import ItemLibrary  from './ItemLibrary.jsx';
import CustomOriginsPanel from './CustomOriginsPanel.jsx';
import ToolPanel from './ToolPanel.jsx';
import ShipBuilder from './ShipBuilder.jsx';
import StatBlock, { SpellBox } from './StatBlock.jsx';
import { spellType } from '../utils/spellTypes.js';
import { formatDamageWithMod, formatDamageType, weaponDamageModes, damageParts, bestWeaponStat, weaponDamageMod } from '../utils/damage.js';
import ActionsReference from './ActionsReference.jsx';
import { wallsToSegments, doorsToSegments, lineBlocked } from '../utils/los.js';
import { buildCombatOrder, shipMaxHp, shipCurrentHp, COMBAT_STRIP_H } from '../utils/combatOrder.js';
import { registries as pluginRegistries, useRegistryVersion, loadPlugins, unloadPlugin, reloadPlugin } from '../plugins/pluginRegistry.js';
import { gmToken } from '../utils/gmAccount.js';
import { CustomClassesProvider } from '../plugins/customClassesProvider.js';
import ImageFramer from './ImageFramer.jsx';
import TokenSheet from './TokenSheet.jsx';
import ItemStatsEditor from './ItemStatsEditor';
import DoorMenu from './DoorMenu.jsx';
import TileMapPanel from './TileMapPanel.jsx';
import SneakPanel from './SneakPanel.jsx';
import ShopPanel from './ShopPanel.jsx';
import TileMenu from './TileMenu.jsx';
import MagicItemForge from './MagicItemForge.jsx';
import ReferenceSearch from './ReferenceSearch.jsx';
import EditionTag from './EditionTag.jsx';
import { MINIGAMES, MINIGAME_DCS } from '../data/minigames.js';
import { useAnchoredMenu, AnchoredPanel, Submenu } from '../utils/anchoredMenu.js';
import { SKY_PRESETS, skyPresetPreviewUrl } from '../utils/skyPresets.js';
import {
  parseSessionDate, countdownText, formatSessionDate, downloadSessionIcs,
  toLocalInputValue, fromLocalInputValue,
} from '../utils/nextSession.js';
// Shared with the tile-stocking editor and the server's spawn whitelist.
import { ALL_CONDITIONS } from '../utils/conditions.js';

// ── SVG icon components ───────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SwordIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 3.5l6 6-10 10-2.5-2.5L18 7 14.5 3.5z" /><path d="M3 21l3-3M9.5 14.5l-3 3" />
  </svg>
);
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
  </svg>
);
const MonsterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
    <path d="M12 2l1.5 3H17l-2.5 2 1 3L12 8.5 8.5 10l1-3L7 5h3.5L12 2z" />
    <path d="M7 13c-2.2 0-4 1.5-4 4.5h18C21 14.5 19.2 13 17 13l-5-2-5 2z" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const WaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4">
    <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
  </svg>
);
const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const FeatherBadge = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z" /><line x1="16" y1="8" x2="2" y2="22" /><line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
);
const SpinnerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-10 h-10 animate-spin">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 inline mr-2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-3 opacity-40">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

// Marker type SVG icons
const MarkerIcons = {
  text_label: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>,
  trap:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2.5} /></svg>,
  hazard:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  encounter:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="8" r="3" /><path d="M7 21v-2a5 5 0 0110 0v2" /><line x1="5" y1="3" x2="19" y2="21" /></svg>,
  ambush:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" /></svg>,
  patrol:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  secret_door: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M12 7v2M12 15v2M7 12h2M15 12h2" /></svg>,
  treasure:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="10" width="20" height="12" rx="2" /><path d="M2 10l2-4h16l2 4" /><line x1="12" y1="10" x2="12" y2="22" /><path d="M7 15h2M15 15h2" /></svg>,
  magic:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><path d="M12 2l1 4 4 1-4 1-1 4-1-4-4-1 4-1z" /><path d="M5 14l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z" /></svg>,
  poison:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 3h6v4l3 3v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8l3-3V3z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>,
  npc:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  reminder:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
  note:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></svg>,
};

// A v4 UUID, without assuming `crypto.randomUUID` exists: it is only defined
// in secure contexts, and this app is normally served over plain HTTP on a LAN
// address. The column that receives this is typed UUID, so a "close enough"
// random string would be rejected by Postgres rather than degrade gracefully.
function makeUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;   // version 4
  b[8] = (b[8] & 0x3f) | 0x80;   // variant 10x
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseRgba(rgba) {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return { hex: '#000000', opacity: 0.35 };
  const toHex = (n) => parseInt(n).toString(16).padStart(2, '0');
  return {
    hex: `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`,
    opacity: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}

function hexOpacityToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Number(opacity).toFixed(2)})`;
}

const DEFAULT_PANEL_TABS = ['lobby', 'map', 'backdrops', 'library', 'terrain', 'tiles', 'sneak', 'shop', 'print', 'lookup', 'spells', 'items', 'tables', 'origins', 'tokens', 'markers', 'treasure', 'handouts', 'session'];
const PANEL_LABELS = { lookup: 'Look up', lobby: 'Lobby', map: 'Map', backdrops: 'Backdrops', library: 'Library', terrain: 'Terrain', tiles: 'Tiles', sneak: 'Sneak', shop: 'Shop', print: 'Print', spells: 'Spells', items: 'Items', tables: 'Tables', origins: 'Origins', tokens: 'Tokens', markers: 'Markers', treasure: 'Treasure', handouts: 'Handouts', session: 'Session' };
const PANEL_TAB_ORDER_KEY = 'dndvtt_dm_panel_tab_order';
// The treasure chest has no backend table — it's GM-side scratch state.
// Mirroring it to localStorage per session means a page refresh (or a
// frontend redeploy) no longer empties the chest.
const TREASURE_CHEST_KEY = 'dndvtt_dm_treasure_chest';
// Buckets for the treasure list, keyed by an item's `item_type`. Order
// here is the order the groups render in. Anything with an unrecognised
// type falls into a trailing "Other" group so it can never go missing.
const TREASURE_CATEGORIES = [
  { id: 'item',          label: 'Items' },
  { id: 'weapon',        label: 'Weapons' },
  { id: 'potion',        label: 'Potions' },
  { id: 'magic_item',    label: 'Magic Items' },
  { id: 'wondrous_item', label: 'Wondrous Items' },
];
// Singular labels for the same ids, used wherever one item is described
// rather than a group (the export picker, for one).
const ITEM_TYPE_LABELS = {
  item: 'Item', weapon: 'Weapon', armor: 'Armor',
  magic_item: 'Magic Item', potion: 'Potion', wondrous_item: 'Wondrous Item',
};
// Types that can carry "requires attunement". Potions are consumed
// rather than worn, so they deliberately can't be flagged.
const ATTUNABLE_ITEM_TYPES = new Set(['weapon', 'magic_item', 'wondrous_item']);

const DM_MARKER_TYPES = [
  { type: 'text_label',  Icon: MarkerIcons.text_label, label: 'Text Label'    },
  { type: 'trap',        Icon: MarkerIcons.trap,        label: 'Trap'          },
  { type: 'hazard',      Icon: MarkerIcons.hazard,      label: 'Hazard'        },
  { type: 'encounter',   Icon: MarkerIcons.encounter,   label: 'Encounter'     },
  { type: 'ambush',      Icon: MarkerIcons.ambush,      label: 'Ambush'        },
  { type: 'patrol',      Icon: MarkerIcons.patrol,      label: 'Patrol Route'  },
  { type: 'secret_door', Icon: MarkerIcons.secret_door, label: 'Secret Door'   },
  { type: 'treasure',    Icon: MarkerIcons.treasure,    label: 'Treasure'      },
  { type: 'magic',       Icon: MarkerIcons.magic,       label: 'Magic Aura'    },
  { type: 'poison',      Icon: MarkerIcons.poison,      label: 'Poison/Disease'},
  { type: 'npc',         Icon: MarkerIcons.npc,         label: 'NPC'           },
  { type: 'reminder',    Icon: MarkerIcons.reminder,    label: 'Reminder'      },
  { type: 'note',        Icon: MarkerIcons.note,        label: 'Note'          },
];


const CONDITION_COLORS = {
  blinded: '#9ca3af', charmed: '#f9a8d4', deafened: '#6b7280',
  exhaustion: '#dc2626', frightened: '#7c3aed', grappled: '#d97706',
  incapacitated: '#f97316', invisible: '#e5e7eb', paralyzed: '#60a5fa',
  petrified: '#a3a3a3', poisoned: '#4ade80', prone: '#92400e',
  restrained: '#ea580c', stunned: '#2dd4bf', unconscious: '#374151',
  submerged: '#06b6d4',
};

function WhisperToast({ toast, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [toast.ts, onClose]);
  const offline = toast.delivered === 0;
  return (
    <div
      className="fixed top-4 right-4 z-50 bg-purple-900/95 border border-purple-500 rounded-xl px-4 py-3 shadow-2xl max-w-sm cursor-pointer"
      onClick={onClose}
      title="Click to dismiss"
    >
      <div className="text-[10px] uppercase tracking-wider text-purple-300 mb-0.5">
        {offline ? `Whisper queued — ${toast.targetName} offline` : `Whisper → ${toast.targetName}`}
      </div>
      <div className="text-sm text-purple-50 whitespace-pre-wrap break-words">
        {toast.message}
      </div>
    </div>
  );
}

function WhisperComposer({ onSend, onCancel }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  function send() {
    const v = text.trim();
    if (!v) return;
    onSend(v);
  }
  return (
    <div className="space-y-1.5">
      <textarea
        ref={ref}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        placeholder="Whisper privately… (Enter to send, Shift+Enter for newline)"
        className="w-full bg-gray-900 border border-purple-700/60 rounded px-2 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-purple-400"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-white px-2 py-0.5"
        >
          Cancel
        </button>
        <button
          onClick={send}
          disabled={!text.trim()}
          className="text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-purple-100 px-2.5 py-0.5 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// Sending a skill-check mini game to one player's phone.
//
// Beside the whisper button, because it is the same shape of thing: a private
// word with one person at the table. The GM picks the lock and how hard it is;
// everything about how hard it FEELS is worked out from that player's own
// sheet on their device.
function ChallengeComposer({ onSend, onCancel }) {
  const [gameId, setGameId] = useState('lockpick');
  const [dc, setDc] = useState(15);
  const [note, setNote] = useState('');
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1">
        {MINIGAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGameId(g.id)}
            className={`px-2 py-1 rounded text-left text-[11px] border ${
              gameId === g.id
                ? 'bg-gray-700 border-dnd-gold text-gray-100'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
          >
            <span className="mr-1">{g.icon}</span>{g.name}
            <span className="block text-[9px] text-gray-500">{g.skillName}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {MINIGAME_DCS.map((d) => (
          <button
            key={d.dc}
            onClick={() => setDc(d.dc)}
            className={`px-2 py-0.5 rounded text-[10px] border ${
              dc === d.dc
                ? 'bg-dnd-gold/30 border-dnd-gold/60 text-dnd-gold'
                : 'bg-gray-900 border-gray-700 text-gray-400'}`}
          >{d.label} · {d.dc}</button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSend({ gameId, dc, note: note.trim() }); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        placeholder="A line of setting — optional"
        className="w-full bg-gray-900 border border-emerald-700/60 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400"
      />
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white px-2 py-0.5">Cancel</button>
        <button
          onClick={() => onSend({ gameId, dc, note: note.trim() })}
          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-emerald-50 px-2.5 py-0.5 rounded"
        >Send to their phone</button>
      </div>
    </div>
  );
}

function HPControl({ token, onChange, onTempHpChange }) {
  const [val, setVal] = useState(token.current_hp);
  const [tempVal, setTempVal] = useState(token.temp_hp || 0);

  useEffect(() => setVal(token.current_hp), [token.current_hp]);
  useEffect(() => setTempVal(token.temp_hp || 0), [token.temp_hp]);

  function apply(delta) {
    const next = Math.max(0, Math.min(token.max_hp, val + delta));
    setVal(next);
    onChange(next);
  }

  function handleBlur() {
    const next = Math.max(0, Math.min(token.max_hp, val));
    onChange(next);
  }

  function applyTemp(delta) {
    const next = Math.max(0, tempVal + delta);
    setTempVal(next);
    onTempHpChange(next);
  }

  function handleTempBlur() {
    const next = Math.max(0, tempVal);
    onTempHpChange(next);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <button onClick={() => apply(-1)} className="w-6 h-6 bg-red-800 hover:bg-red-700 text-white rounded text-sm leading-none">−</button>
        <button onClick={() => apply(-5)} className="w-8 h-6 bg-red-900 hover:bg-red-800 text-white rounded text-xs leading-none">−5</button>
        <input
          type="number"
          className="w-14 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white text-center text-xs"
          value={val}
          min={0}
          max={token.max_hp}
          onChange={(e) => setVal(parseInt(e.target.value) || 0)}
          onBlur={handleBlur}
        />
        <span className="text-gray-500 text-xs">/{token.max_hp}</span>
        <button onClick={() => apply(5)} className="w-8 h-6 bg-green-900 hover:bg-green-800 text-white rounded text-xs leading-none">+5</button>
        <button onClick={() => apply(1)} className="w-6 h-6 bg-green-800 hover:bg-green-700 text-white rounded text-sm leading-none">+</button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-cyan-400 w-10 shrink-0">Temp:</span>
        <button onClick={() => applyTemp(-5)} className="w-8 h-5 bg-cyan-900 hover:bg-cyan-800 text-white rounded text-xs leading-none">−5</button>
        <button onClick={() => applyTemp(-1)} className="w-6 h-5 bg-cyan-800 hover:bg-cyan-700 text-white rounded text-xs leading-none">−</button>
        <input
          type="number"
          className="w-14 bg-gray-800 border border-cyan-700 rounded px-1 py-0.5 text-cyan-300 text-center text-xs"
          value={tempVal}
          min={0}
          onChange={(e) => setTempVal(parseInt(e.target.value) || 0)}
          onBlur={handleTempBlur}
        />
        <button onClick={() => applyTemp(1)} className="w-6 h-5 bg-cyan-800 hover:bg-cyan-700 text-white rounded text-xs leading-none">+</button>
        <button onClick={() => applyTemp(5)} className="w-8 h-5 bg-cyan-900 hover:bg-cyan-800 text-white rounded text-xs leading-none">+5</button>
      </div>
    </div>
  );
}

function ConditionsDropdown({ conditions, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  function toggle(cond) {
    const next = conditions.includes(cond)
      ? conditions.filter((c) => c !== cond)
      : [...conditions, cond];
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          conditions.length > 0
            ? 'bg-purple-900/50 border-purple-600 text-purple-200'
            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
        }`}
      >
        {conditions.length > 0 ? `${conditions.length} condition${conditions.length > 1 ? 's' : ''}` : 'Conditions'}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 bg-gray-900 border border-gray-600 rounded-lg p-2 w-44 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 gap-0.5 max-h-48 overflow-y-auto">
            {ALL_CONDITIONS.map((cond) => (
              <label key={cond} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conditions.includes(cond)}
                  onChange={() => toggle(cond)}
                  className="accent-purple-500"
                />
                <span
                  className="text-xs capitalize"
                  style={{ color: CONDITION_COLORS[cond] || 'white' }}
                >
                  {cond}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenRow({
  token, onHPChange, onTempHpChange, onToggleVisibility, onToggleFlying, onRemove,
  onSizeChange, onConditionsChange, onInitiativeChange, onNicknameChange,
  onLabelVisibilityChange,
  onTrackerReminderChange,
  onElevationChange,
  isSelected, onSelect, onViewStatBlock, collapsed = false,
  combatActive = false, onAddToCombat,
}) {
  function toggleSubmerged() {
    const conditions = Array.isArray(token.conditions) ? token.conditions : [];
    const next = conditions.includes('submerged')
      ? conditions.filter(c => c !== 'submerged')
      : [...conditions, 'submerged'];
    onConditionsChange(token.id, next);
  }
  const imageUrl = token.image_path
    ? `/uploads/${token.image_path}`
    : token.creature_image
    ? `/uploads/${token.creature_image}`
    : token.is_player
    ? '/uploads/creatures/default_player.png'
    : null;

  const conditions = Array.isArray(token.conditions) ? token.conditions : [];

  return (
    <div
      data-token-row-id={token.id}
      className={`bg-gray-800 rounded-lg p-3 space-y-2 border transition-colors cursor-pointer ${
        isSelected ? 'border-dnd-gold ring-2 ring-dnd-gold/50' : 'border-gray-700 hover:border-gray-600'
      }`}
      onClick={() => onSelect(token.id)}
    >
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img src={imageUrl} alt={token.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm shrink-0 text-indigo-200">
            {token.is_player ? <PersonIcon /> : <MonsterIcon />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{token.name}</div>
          <div className="text-xs text-gray-400">{TOKEN_SIZES[token.size]?.label || token.size}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          {token.creature_id && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewStatBlock(token.creature_id); }}
              title="View stat block"
              className="text-sm w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-dnd-gold flex items-center justify-center transition-colors"
            >
              <ClipboardIcon />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFlying(token.id); }}
            title={token.is_flying ? 'Mark as grounded' : 'Mark as flying'}
            className={`text-sm w-7 h-7 rounded flex items-center justify-center transition-colors ${
              token.is_flying ? 'bg-sky-800 text-sky-200 hover:bg-sky-700' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <FeatherBadge />
          </button>
          {(() => {
            const isSubmerged = Array.isArray(token.conditions) && token.conditions.includes('submerged');
            return (
              <button
                onClick={(e) => { e.stopPropagation(); toggleSubmerged(); }}
                title={isSubmerged ? 'Reveal from water' : 'Hide in water'}
                className={`text-sm w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  isSubmerged ? 'bg-cyan-800 text-cyan-200 hover:bg-cyan-700' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <WaveIcon />
              </button>
            );
          })()}
          {combatActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (token.in_combat) return;        // already in — no-op
                onAddToCombat?.(token.id);
              }}
              disabled={!!token.in_combat}
              title={token.in_combat ? 'Already in combat' : 'Add to current combat'}
              className={`text-sm w-7 h-7 rounded flex items-center justify-center transition-colors ${
                token.in_combat
                  ? 'bg-yellow-900/40 text-yellow-500/60 cursor-default'
                  : 'bg-yellow-800 text-yellow-200 hover:bg-yellow-700'
              }`}
            >
              <SwordIcon />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(token.id); }}
            title={token.is_hidden ? 'Show to players' : 'Hide from players'}
            className={`text-sm w-7 h-7 rounded flex items-center justify-center transition-colors ${
              token.is_hidden ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'
            }`}
          >
            {token.is_hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(token.id); }}
            className="text-sm w-7 h-7 rounded bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-300 flex items-center justify-center transition-colors"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {collapsed ? null : (<>
      <HPControl
        token={token}
        onChange={(hp) => onHPChange(token.id, hp)}
        onTempHpChange={(tempHp) => onTempHpChange(token.id, tempHp)}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Init:</span>
          <input
            type="number"
            className="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white text-center"
            value={token.initiative ?? ''}
            placeholder="—"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              const v = e.target.value === '' ? null : parseInt(e.target.value);
              onInitiativeChange(token.id, v);
            }}
          />
          {(() => {
            const dexMod = Math.floor(((token.creature_dex ?? 10) - 10) / 2);
            const initBonus = token.initiative_bonus ?? 0;
            const base = dexMod + initBonus;
            return <span className="text-xs text-gray-500" title="Dex mod + initiative bonus">({base >= 0 ? '+' : ''}{base})</span>;
          })()}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ConditionsDropdown
            conditions={conditions}
            onChange={(c) => onConditionsChange(token.id, c)}
          />
        </div>
      </div>

      {/* Player-facing label visibility — the same two flags as the map's
          right-click menu, surfaced here so a token can be set up before it
          ever matters. Combat still overrides both. */}
      <div className="flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-gray-400">Hide from players:</span>
        <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-amber-500"
            checked={!!token.hide_name_from_players}
            onChange={(e) => onLabelVisibilityChange(token.id, { hideName: e.target.checked })}
          />
          Name
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-amber-500"
            checked={!!token.hide_hp_from_players}
            onChange={(e) => onLabelVisibilityChange(token.id, { hideHp: e.target.checked })}
          />
          Health
        </label>

      </div>

      {/* A GM-only note pinned after this token in the initiative strip. For
          the recurring end-of-turn effects that get forgotten mid-fight —
          a fire elemental's burn, a troll's regeneration. It disappears when
          the creature dies. */}
      {/* Height in feet. The flying flag follows it automatically (see the
          server handler) — this is the number, that's the state. */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">Elevation:</span>
        {[-10, -5].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onElevationChange?.(token.id, (Number(token.elevation) || 0) + d)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-1.5 py-1 rounded"
          >{d}</button>
        ))}
        <input
          type="number"
          step={5}
          value={Number(token.elevation) || 0}
          onChange={(e) => onElevationChange?.(token.id, parseInt(e.target.value, 10) || 0)}
          className="w-16 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-white text-center"
        />
        <span className="text-[10px] text-gray-500">ft</span>
        {[5, 10].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onElevationChange?.(token.id, (Number(token.elevation) || 0) + d)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-1.5 py-1 rounded"
          >+{d}</button>
        ))}
        {!!Number(token.elevation) && (
          <button
            type="button"
            onClick={() => onElevationChange?.(token.id, 0)}
            className="text-[11px] text-gray-500 hover:text-gray-300"
            title="Back to ground level"
          >land</button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">Tracker note:</span>
        <input
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
          placeholder="e.g. Burn — GM only"
          maxLength={60}
          value={token.tracker_reminder || ''}
          onChange={(e) => onTrackerReminderChange?.(token.id, e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Size:</span>
        <select
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white"
          value={token.size}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onSizeChange(token.id, e.target.value); }}
        >
          {Object.entries(TOKEN_SIZES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Gargantuan is "20 feet or more", so the preset 4×4 is only its floor —
          a tarrasque, a kraken and a dragon turtle are all gargantuan and none
          of them is the same size. Only shown for gargantuan: every other
          category has a fixed footprint, and offering the box there would
          invite tokens that don't match their own size line. */}
      {token.size === 'gargantuan' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Squares:</span>
          <input
            type="number"
            min={4}
            max={40}
            step={0.5}
            value={token.size_squares ?? 4}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              const v = e.target.value;
              // Empty box means "back to the 4×4 default" rather than 0.
              onSizeChange(token.id, token.size, v === '' ? null : Number(v));
            }}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white"
          />
          <span className="text-[10px] text-gray-500">
            {((token.size_squares ?? 4) * 5)} ft across
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Nickname:</span>
        <input
          type="text"
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white"
          placeholder={token.name}
          value={token.nickname || ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onNicknameChange(token.id, e.target.value); }}
        />
      </div>

      {Array.isArray(token.conditions) && token.conditions.filter(c => c !== 'submerged').length > 0 && (
        <div className="flex flex-wrap gap-1">
          {token.conditions.filter(c => c !== 'submerged').map((cond) => (
            <span
              key={cond}
              className="text-xs px-1.5 py-0.5 rounded-full border"
              style={{ color: CONDITION_COLORS[cond] || 'white', borderColor: CONDITION_COLORS[cond] || 'gray', background: 'rgba(0,0,0,0.4)' }}
            >
              {cond.slice(0, 4)}
            </span>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}

function CombatTokenEntry({ token, isCurrent, displayName, dataCurrent }) {
  const imgUrl = token.image_path
    ? `/uploads/${token.image_path}`
    : token.creature_image
    ? `/uploads/${token.creature_image}`
    : token.is_player
    ? '/uploads/creatures/default_player.png'
    : null;

  const size = isCurrent ? 52 : 34;

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0" style={{ width: 60 }} data-current={dataCurrent ? 'true' : undefined}>
      <div
        className="relative rounded-full overflow-hidden transition-all duration-300"
        style={{
          width: size,
          height: size,
          border: isCurrent ? '2.5px solid #fbbf24' : '2px solid #4b5563',
          boxShadow: isCurrent ? '0 0 12px 3px rgba(251,191,36,0.45)' : 'none',
        }}
      >
        {imgUrl ? (
          <img src={imgUrl} alt={token.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-base"
            style={{ background: token.is_player ? '#4338ca' : '#374151' }}
          >
            {token.is_player ? <PersonIcon /> : <MonsterIcon />}
          </div>
        )}
        {/* Initiative badge */}
        <div
          className="absolute bottom-0 right-0 bg-black/80 text-yellow-300 font-bold leading-none rounded-tl"
          style={{ fontSize: 9, padding: '1px 3px' }}
        >
          {token.initiative}
        </div>
      </div>
      <span
        className="truncate text-center leading-tight transition-all duration-300"
        style={{
          maxWidth: 58,
          fontSize: isCurrent ? 11 : 9,
          color: isCurrent ? '#fde68a' : '#9ca3af',
          fontWeight: isCurrent ? 600 : 400,
        }}
      >
        {displayName || token.nickname || token.name}
      </span>
    </div>
  );
}

// A hull in the initiative strip. Square rather than round, so a ship reads as
// a different kind of combatant at a glance, with its hull bar under the name
// — the number the GM is actually tracking during a ship fight.
function CombatShipEntry({ ship, isCurrent, dataCurrent }) {
  const size = isCurrent ? 52 : 34;
  const max = shipMaxHp(ship);
  const cur = shipCurrentHp(ship);
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  const bar = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0" style={{ width: 60 }} data-current={dataCurrent ? 'true' : undefined}>
      <div
        className="relative overflow-hidden transition-all duration-300 rounded-md flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: '#1f2937',
          border: isCurrent ? '2.5px solid #fbbf24' : '2px solid #4b5563',
          boxShadow: isCurrent ? '0 0 12px 3px rgba(251,191,36,0.45)' : 'none',
        }}
      >
        <span style={{ fontSize: isCurrent ? 24 : 16 }} role="img" aria-label="ship">⛵</span>
        <div
          className="absolute bottom-0 right-0 bg-black/80 text-yellow-300 font-bold leading-none rounded-tl"
          style={{ fontSize: 9, padding: '1px 3px' }}
        >
          {ship.initiative}
        </div>
      </div>
      {max > 0 && (
        <div className="w-full h-[3px] rounded-full bg-gray-700 overflow-hidden" style={{ maxWidth: 58 }}>
          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: bar }} />
        </div>
      )}
      <span
        className="truncate text-center leading-tight transition-all duration-300"
        style={{
          maxWidth: 58,
          fontSize: isCurrent ? 11 : 9,
          color: isCurrent ? '#fde68a' : '#9ca3af',
          fontWeight: isCurrent ? 600 : 400,
        }}
        title={max > 0 ? `${cur} / ${max} hull` : undefined}
      >
        {ship.name || ship.class_name || 'Ship'}
      </span>
    </div>
  );
}

// One round is 6 seconds of in-game time regardless of how many
// creatures are in it, so elapsed time comes off the ROUND count, not
// the turn count.
const SECONDS_PER_ROUND = 6;
function formatCombatClock(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Renaming the session ────────────────────────────────────────────────────
//
// Draft state, committed on Save or Enter rather than on every keystroke: the
// name is on every player's screen, and live-saving would broadcast "S", "St",
// "Str"… to the whole table as the GM typed.
function SessionNameEditor({ name, onRename }) {
  const [draft, setDraft] = useState(name || '');
  // Re-sync when it changes underneath — renamed from another GM tab, or the
  // session payload landing after this mounted.
  useEffect(() => { setDraft(name || ''); }, [name]);

  const clean = draft.trim();
  // An empty name is refused rather than saved: it would leave every player
  // looking at a blank bar with no way to ask for the old one back.
  const dirty = clean !== (name || '') && clean.length > 0;

  const commit = () => { if (dirty) onRename(clean); };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={draft}
        maxLength={255}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        // Abandon a half-typed rename on the way out rather than leaving the
        // box showing something that was never saved.
        onBlur={() => setDraft(name || '')}
        className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white font-semibold focus:outline-none focus:border-dnd-gold"
      />
      <button
        type="button"
        disabled={!dirty}
        // onMouseDown, not onClick: the input's onBlur resets the draft, and
        // blur lands first on a click — the button would reset the name and
        // then read it back as unchanged, saving nothing.
        onMouseDown={(e) => { e.preventDefault(); commit(); }}
        className="shrink-0 text-xs bg-dnd-gold hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-semibold rounded px-3 py-1.5"
      >Rename</button>
    </div>
  );
}

// ── Scheduling the next session ─────────────────────────────────────────────
//
// The GM half of the lobby countdown. Draft state is local and only committed
// on Save, so half-typed dates never reach the players' screens — a
// datetime-local input fires a change on every digit, and live-saving would
// broadcast the year 0002 on the way to 2026.
function NextSessionPanel({ at, note, minutes, sessionName, onSave, onClear }) {
  const [draftAt, setDraftAt] = useState(() => toLocalInputValue(at));
  const [draftNote, setDraftNote] = useState(note || '');
  const [draftMins, setDraftMins] = useState(String(minutes ?? 180));

  // Re-sync when the stored value changes underneath — another GM window, or
  // the initial session payload landing after this mounted. Keyed on the
  // committed values only, so it cannot stomp on typing in progress.
  useEffect(() => {
    setDraftAt(toLocalInputValue(at));
    setDraftNote(note || '');
    setDraftMins(String(minutes ?? 180));
  }, [at, note, minutes]);

  const parsed = parseSessionDate(at);
  const dirty = toLocalInputValue(at) !== draftAt
    || (note || '') !== draftNote
    || String(minutes ?? 180) !== draftMins;

  return (
    <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-900/60 border-b border-gray-700">
        <span className="text-[11px] uppercase tracking-wider text-gray-400">Next session</span>
      </div>

      <div className="p-3 space-y-2">
        {/* What the players are seeing right now. The GM is the one person who
            never looks at the lobby, so without this they would be setting a
            date they cannot check. */}
        {parsed ? (
          <div className="rounded-lg bg-gray-900/60 border border-gray-700 px-2.5 py-2">
            <div className="text-dnd-gold font-mono font-semibold text-sm tabular-nums leading-none">
              {countdownText(parsed)}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{formatSessionDate(parsed)}</div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            Nothing scheduled — the players' lobby shows no countdown.
          </p>
        )}

        <label className="block">
          <span className="text-[11px] text-gray-400 block mb-1">Date &amp; time (your local time)</span>
          <input
            type="datetime-local"
            value={draftAt}
            onChange={(e) => setDraftAt(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
          />
        </label>

        <label className="block">
          <span className="text-[11px] text-gray-400 block mb-1">What to call it (optional)</span>
          <input
            type="text"
            value={draftNote}
            maxLength={200}
            placeholder="Session 12 — The Sunless Citadel"
            onChange={(e) => setDraftNote(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-dnd-gold"
          />
        </label>

        <label className="block">
          <span className="text-[11px] text-gray-400 block mb-1">
            Expected length (minutes) — sets the calendar event's end
          </span>
          <input
            type="number"
            min={15}
            max={1440}
            step={15}
            value={draftMins}
            onChange={(e) => setDraftMins(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
          />
        </label>

        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            disabled={!draftAt || !dirty}
            onClick={() => onSave({
              at: fromLocalInputValue(draftAt),
              note: draftNote,
              minutes: Number(draftMins) || 180,
            })}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors bg-dnd-gold hover:bg-yellow-400 text-gray-900
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-dnd-gold"
            title={dirty ? 'Publish this to the players’ lobby' : 'No changes to save'}
          >
            {parsed ? 'Update' : 'Set date'}
          </button>
          {parsed && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              title="Remove the countdown from the players' lobby"
            >
              Clear
            </button>
          )}
        </div>

        {/* The GM wants it in their own calendar too — same invite the players
            get, from the same builder. */}
        {parsed && (
          <button
            type="button"
            onClick={() => downloadSessionIcs({ at: parsed, minutes, sessionName, note })}
            className="w-full rounded-lg py-1.5 text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 transition-colors"
          >
            Add to my calendar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Lobby combat roster ──────────────────────────────────────────────────────
//
// Combat with no battlemap. The GM builds an initiative order out of library
// creatures without placing anything: these tokens carry map_id NULL, so they
// exist for the tracker and for nothing else. Deliberately not the map's
// combat picker — that one is built around LOS viewers and grid placement,
// neither of which means anything here.
//
// Player characters already in the session appear automatically, because a
// player token with no map is loaded by the same query.
function LobbyCombatRoster({
  tokens, combatActive, lobbyRoster = [], onAddCreature, onAddPlayer, onRemoveToken,
  onInitiativeChange, onStartCombat, onEndCombat,
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        params.set('role', 'dm');
        const res = await fetch(`/api/creatures?${params}`);
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setResults(data.slice(0, 40));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, open]);

  // Everything on the roster, in initiative order so the list reads the same
  // way the tracker strip does.
  const roster = [...tokens].sort((a, b) => {
    const d = (b.initiative ?? 0) - (a.initiative ?? 0);
    return d || a.id - b.id;
  });
  const inCombat = roster.filter((t) => t.in_combat).length;

  // Players sitting in the lobby who aren't on the roster yet. Matched on
  // player_name, which is what a player token is keyed by everywhere else.
  // Anyone who hasn't picked a character yet has no creature to build from, so
  // they're listed but not addable rather than quietly missing.
  const onRosterNames = new Set(
    roster.filter((t) => t.is_player && t.player_name).map((t) => t.player_name)
  );
  const addablePlayers = lobbyRoster.filter((r) => !onRosterNames.has(r.name));

  return (
    <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-900/60 border-b border-gray-700 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-gray-400">Combat roster</span>
        <span className="text-[11px] text-gray-500">
          {roster.length === 0
            ? 'nobody yet'
            : `${roster.length} ${roster.length === 1 ? 'combatant' : 'combatants'}`}
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        <p className="text-[11px] text-gray-500 leading-snug">
          For a fight with no map. Nothing is placed — these only exist in the
          initiative order.
        </p>

        {roster.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-1">
            Add creatures below to build an initiative order.
          </p>
        ) : (
          <ul className="space-y-1 max-h-56 overflow-y-auto">
            {roster.map((t) => (
              <li key={t.id} className="flex items-center gap-2 bg-gray-800/70 rounded px-2 py-1">
                <input
                  type="number"
                  className="w-11 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none focus:border-dnd-gold"
                  value={t.initiative ?? ''}
                  placeholder="—"
                  title="Initiative"
                  onChange={(e) => {
                    const v = e.target.value;
                    onInitiativeChange(t.id, v === '' ? null : parseInt(v, 10) || 0);
                  }}
                />
                <span className="flex-1 min-w-0 text-sm text-gray-200 truncate">
                  {t.nickname || t.name}
                  {t.is_player && <span className="ml-1 text-[10px] text-blue-300">player</span>}
                </span>
                <span className="text-[10px] text-gray-500 shrink-0 tabular-nums">
                  {t.current_hp}/{t.max_hp}
                </span>
                {combatActive && (
                  <span
                    className={`text-[10px] shrink-0 ${t.in_combat ? 'text-yellow-300' : 'text-gray-600'}`}
                    title={t.in_combat ? 'In the current combat' : 'Not in the current combat'}
                  >
                    {t.in_combat ? '⚔' : '·'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveToken(t.id)}
                  className="text-red-400 hover:text-red-300 text-xs shrink-0 px-1"
                  title="Remove from roster"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {addablePlayers.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                In the lobby, not in the fight
              </span>
              {addablePlayers.some((r) => r.creatureId) && (
                <button
                  type="button"
                  onClick={() => addablePlayers.forEach((r) => r.creatureId && onAddPlayer(r))}
                  className="text-[11px] text-dnd-gold hover:text-yellow-300"
                >
                  Add all
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {addablePlayers.map((r) => (
                <li key={r.socketId} className="flex items-center gap-2 bg-gray-800/50 rounded px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-xs text-gray-200 shrink-0">{r.name}</span>
                  <span className="text-[10px] text-gray-500 truncate flex-1">
                    {r.characterName || 'no character yet'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddPlayer(r)}
                    disabled={!r.creatureId}
                    title={r.creatureId
                      ? `Add ${r.characterName} to the roster`
                      : 'This player has not bound a character sheet yet — ask them to pick one, or add their creature from the library below'}
                    className="text-[11px] bg-dnd-gold hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 px-2 py-0.5 rounded font-semibold shrink-0"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-1.5">
          {combatActive ? (
            <button
              type="button"
              onClick={onEndCombat}
              className="flex-1 text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1.5 rounded font-semibold"
            >
              End combat
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartCombat}
              disabled={roster.length === 0}
              className="flex-1 text-xs bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2 py-1.5 rounded font-semibold"
              title={roster.length === 0 ? 'Add at least one combatant first' : 'Start combat with everyone on this roster'}
            >
              Start combat
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1.5 rounded"
          >
            {open ? 'Close' : '+ Add'}
          </button>
        </div>
        {combatActive && inCombat === 0 && (
          <p className="text-[10px] text-amber-300/90 italic">
            Combat is running but nobody on this roster is in it — end and restart it to pull them in.
          </p>
        )}

        {open && (
          <div className="space-y-1.5 pt-1 border-t border-gray-800">
            <input
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
              placeholder="Search creatures…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && <p className="text-[11px] text-gray-500">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="text-[11px] text-gray-500 italic">No creatures match.</p>
            )}
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id} className="flex items-center gap-2 bg-gray-800/70 rounded px-2 py-1">
                  <span className="flex-1 min-w-0 text-xs text-gray-200 truncate">{c.name}</span>
                  <span className="text-[10px] text-gray-500 shrink-0">HP {c.hit_points}</span>
                  <button
                    type="button"
                    onClick={() => onAddCreature(c)}
                    className="text-[11px] bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-2 py-0.5 rounded font-semibold shrink-0"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function CombatTracker({ tokens, ships = [], combatTurn, onNext, onPrev, onEnd }) {
  const sorted = buildCombatOrder(tokens, ships);

  // Compute A/B/C suffixes for combatants sharing the same base name
  const nameCounts = {};
  for (const e of sorted) {
    nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
  }
  const nameSeenCount = {};
  const displayNames = sorted.map((e) => {
    const base = e.name;
    if (nameCounts[base] <= 1) return base;
    nameSeenCount[base] = (nameSeenCount[base] || 0);
    const suffix = String.fromCharCode(65 + nameSeenCount[base]);
    nameSeenCount[base]++;
    return `${base} ${suffix}`;
  });

  const scrollRef = useRef(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector('[data-current="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [combatTurn]);

  if (sorted.length === 0) return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400">
      Nothing in combat.
    </div>
  );

  // combatTurn is cumulative across the whole combat, so the round is
  // just how many times the order has wrapped. Elapsed counts COMPLETED
  // rounds — during round 1 no in-game time has passed yet.
  const roundNum = Math.floor(combatTurn / sorted.length) + 1;
  const elapsedSec = (roundNum - 1) * SECONDS_PER_ROUND;

  return (
    <div className="flex items-end gap-2 min-w-0 flex-1">
      <div className="shrink-0 self-center pb-1 pr-1 leading-tight">
        <div className="text-[11px] font-semibold text-yellow-300 whitespace-nowrap">Round {roundNum}</div>
        <div
          className="text-[10px] text-gray-400 tabular-nums whitespace-nowrap"
          title={`In-game time elapsed — one round is ${SECONDS_PER_ROUND} seconds`}
        >{formatCombatClock(elapsedSec)} elapsed</div>
      </div>
      <div ref={scrollRef} className="flex items-end gap-2 overflow-x-auto min-w-0 flex-1 pb-1">
        {sorted.map((e, i) => {
          const isCurrent = i === combatTurn % sorted.length;
          // A GM-only reminder pinned immediately after its creature — for
          // recurring end-of-turn effects that get forgotten mid-fight. It is
          // rendered here rather than added to `sorted` on purpose: combat_turn
          // is an index into that array, and inserting a pseudo-entry would
          // point the GM and the players at different combatants.
          //
          // It vanishes with the creature: no note on a corpse.
          const reminder = e.kind === 'token'
            && !!(e.token.tracker_reminder || '').trim()
            && !e.token.is_dead
            && Number(e.token.current_hp) > 0
              ? String(e.token.tracker_reminder).trim()
              : null;
          const note = reminder ? (
            <div
              key={`${e.key}-note`}
              className="flex flex-col items-center justify-end shrink-0 self-stretch pb-1"
              title={`Reminder for ${displayNames[i]} — only you can see this`}
            >
              <div className={`px-2 py-1 rounded-md border text-[11px] font-semibold whitespace-nowrap transition-colors ${
                isCurrent
                  ? 'bg-orange-600/30 border-orange-400 text-orange-100'
                  : 'bg-gray-800/70 border-gray-600 text-gray-300'
              }`}>
                🔥 {reminder}
              </div>
              <span className="text-[9px] text-gray-600 mt-0.5">GM only</span>
            </div>
          ) : null;

          const entry = e.kind === 'ship' ? (
            <CombatShipEntry
              key={e.key}
              ship={e.ship}
              isCurrent={isCurrent}
              dataCurrent={isCurrent}
            />
          ) : (
            <CombatTokenEntry
              key={e.key}
              token={e.token}
              isCurrent={isCurrent}
              displayName={displayNames[i]}
              dataCurrent={isCurrent}
            />
          );
          return note ? <React.Fragment key={e.key}>{entry}{note}</React.Fragment> : entry;
        })}
      </div>
      <div className="flex flex-col gap-1 shrink-0 self-center pb-1">
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            disabled={combatTurn <= 0}
            title="Step back one turn (undo a mis-click)"
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700 text-gray-200 rounded text-xs font-semibold"
          >
            ← Back
          </button>
          <button
            onClick={onNext}
            className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded text-xs font-semibold"
          >
            Next →
          </button>
        </div>
        <button
          onClick={onEnd}
          className="px-2 py-1 bg-gray-700 hover:bg-red-900/50 text-gray-300 hover:text-red-300 rounded text-xs"
        >
          End
        </button>
      </div>
    </div>
  );
}

// Plural-aware summary for the disable / delete cleanup toast. The
// server returns one count per content bucket it removed; we want a
// single readable phrase that lists only the buckets that changed
// ("3 creature(s), 2 race(s)") rather than seven zeroed labels.
function pluginCleanupSummary(data) {
  if (!data) return '';
  const buckets = [
    ['creatures',   'creature'],
    ['spells',      'spell'],
    ['terrain',     'terrain piece'],
    ['races',       'custom race'],
    ['backgrounds', 'custom background'],
    ['classes',     'custom class'],
    ['languages',   'language'],
  ];
  const parts = [];
  for (const [key, singular] of buckets) {
    const n = data[key] || 0;
    if (n > 0) parts.push(`${n} ${singular}${n === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

// PluginManager — Session-tab UI for installing, enabling, disabling, and
// removing plugins. Designed to keep working even if a plugin is broken:
//   - Listing comes from the plugins table, not the live JS modules, so a
//     plugin that throws on import still appears here and can be disabled.
//   - The "stuck plugin" hint reminds the GM about the documented escape
//     hatch: deleting backend/plugins/<id> on disk forces a clean reset.
function PluginManager({ loadErrors, pluginsTick, onPluginsChanged, context }) {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(null);   // id currently being acted on
  const [uploadErr, setUploadErr] = React.useState('');
  const [actionErr, setActionErr] = React.useState('');

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/plugins');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) { /* leave the existing list visible */ }
    finally { setLoading(false); }
  }
  React.useEffect(() => { refresh(); }, [pluginsTick]);

  async function setEnabled(id, enabled) {
    setBusy(id); setActionErr('');
    try {
      const res = await fetch(`/api/plugins/${id}/${enabled ? 'enable' : 'disable'}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Live (un)load the JS so the change takes effect without a refresh.
      if (enabled) await reloadPlugin(id, context);
      else unloadPlugin(id);
      await refresh();
      onPluginsChanged && onPluginsChanged();
      // Disable now runs server-side cleanup of every tracked
      // library bucket the plugin imported into — creatures, spells,
      // terrain, custom races / backgrounds / classes, languages.
      // Surface the counts so the GM sees the side-effect.
      if (!enabled) {
        const summary = pluginCleanupSummary(data);
        if (summary) setActionErr(`Disabled — removed ${summary} the plugin had imported.`);
      }
    } catch (err) { setActionErr(err.message); }
    finally { setBusy(null); }
  }

  async function deletePlugin(id) {
    if (!confirm(
      `Delete plugin "${id}"?\n\n` +
      `• Files removed from disk.\n` +
      `• Library content the plugin imported (creatures, spells) is removed too.\n` +
      `• GM-side preferences for the plugin (its plugin_data) are KEPT so re-installing restores per-GM state.`
    )) return;
    setBusy(id); setActionErr('');
    try {
      const res = await fetch(`/api/plugins/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      unloadPlugin(id);
      await refresh();
      onPluginsChanged && onPluginsChanged();
      const summary = pluginCleanupSummary(data);
      if (summary) setActionErr(`Removed ${summary} imported by this plugin.`);
    } catch (err) { setActionErr(err.message); }
    finally { setBusy(null); }
  }

  // Server-side cleanup for tracking rows whose plugin is gone. Useful
  // for libraries left behind by plugins removed before this version
  // shipped (DELETE didn't clean tracked content automatically until
  // v1.4.9). Surfaces the count so the GM can see what got tidied.
  async function cleanupOrphans() {
    if (!confirm(
      'Scan for orphaned plugin content and remove it?\n\n' +
      'Looks for tracking rows in plugin_data whose plugin is no longer installed, ' +
      'then deletes the listed creatures and spells. Safe to run at any time — does ' +
      'nothing if there are no orphans.'
    )) return;
    setBusy('__orphans'); setActionErr('');
    try {
      const res = await fetch('/api/plugins/cleanup-orphans', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const c = data.creaturesRemoved || 0;
      const s = data.spellsRemoved || 0;
      const p = data.orphanPlugins || 0;
      setActionErr(p === 0
        ? 'No orphaned plugin content found.'
        : `Cleaned ${c} creature(s) and ${s} spell(s) from ${p} orphaned plugin tracking row(s).`);
    } catch (err) { setActionErr(err.message); }
    finally { setBusy(null); }
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/plugins/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // The new plugin lands enabled by default — load its JS now.
      if (data.installed?.enabled) await reloadPlugin(data.installed.id, context);
      await refresh();
      onPluginsChanged && onPluginsChanged();
    } catch (err) { setUploadErr(err.message); }
  }

  // Build a quick map of dependency status per plugin so we can flag rows
  // that won't enable cleanly without action.
  const byId = new Map(list.map(p => [p.id, p]));
  function depStatus(p) {
    const requires = (p.manifest && p.manifest.requires) || [];
    if (!requires.length) return null;
    const missing = requires.filter(d => !byId.has(d));
    const disabled = requires.filter(d => byId.has(d) && !byId.get(d).enabled);
    if (missing.length || disabled.length) {
      return { ok: false, missing, disabled };
    }
    return { ok: true, requires };
  }

  return (
    <div>
      {/* The visible "Plugins" header used to live here; it's now provided
          by the wrapping CollapsibleSection in the Session tab so the
          plugin panel folds away in the same chevron style as the other
          host sections. */}
      <div className="bg-gray-800 rounded-xl p-3 space-y-3">
        <p className="text-[11px] text-gray-400 leading-snug">
          Plugins extend the app with new tools, tabs and overlays. <strong>Disable</strong> hides
          a plugin's features and asks it to clean up any library content it imported.
          <strong> Delete</strong> additionally removes the plugin's files; library content
          (creatures, spells) imported by the plugin is removed too, but per-GM
          preferences are preserved so re-installing restores them. If a plugin breaks
          the app, exit and delete <code className="text-amber-300">backend/plugins/&lt;id&gt;</code> on
          disk — the manager picks up the change on next start.
        </p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-3 cursor-pointer transition-colors border-gray-600 hover:border-dnd-gold/60">
          <span className="text-xs text-gray-300">Upload plugin .zip</span>
          <span className="text-[10px] text-gray-500 mt-0.5">Must contain a plugin.json at the root or top dir</span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => { uploadFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </label>
        {uploadErr && <div className="text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1">{uploadErr}</div>}
        {actionErr && <div className="text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1">{actionErr}</div>}

        <button
          type="button"
          onClick={cleanupOrphans}
          disabled={busy === '__orphans'}
          className="w-full text-[11px] bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 py-1.5 rounded"
          title="Find tracking rows whose plugin is gone and delete the leftover creatures + spells they imported."
        >
          {busy === '__orphans' ? 'Cleaning…' : 'Clean up orphaned plugin content'}
        </button>

        {loading && <p className="text-[11px] text-gray-500 italic">Loading…</p>}
        {!loading && list.length === 0 && (
          <p className="text-[11px] text-gray-500 italic">No plugins installed yet.</p>
        )}
        {list.map(p => {
          const m = p.manifest || {};
          const dep = depStatus(p);
          const loadErr = (loadErrors || []).find(e => e.id === p.id);
          return (
            <div key={p.id} className={`rounded-lg p-2 border ${p.enabled ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-900/20 border-gray-800'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {m.name || p.id}
                    <span className="ml-2 text-[10px] text-gray-500">v{m.version || '?'}</span>
                    {p.source === 'builtin' && (
                      <span className="ml-2 text-[10px] text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-1 rounded">built-in</span>
                    )}
                  </div>
                  {m.description && <div className="text-[11px] text-gray-400 leading-snug">{m.description}</div>}
                  {m.author && <div className="text-[10px] text-gray-500">by {m.author}</div>}
                  {dep && !dep.ok && (
                    <div className="text-[11px] text-amber-300 mt-1">
                      Dependency issue —
                      {dep.missing.length > 0 && <> missing: {dep.missing.join(', ')}</>}
                      {dep.disabled.length > 0 && <> {dep.missing.length ? ' · ' : ''}disabled: {dep.disabled.join(', ')}</>}
                    </div>
                  )}
                  {loadErr && (
                    <div className="text-[11px] text-red-300 mt-1">Load error: {loadErr.error}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => setEnabled(p.id, !p.enabled)}
                    disabled={busy === p.id || (!p.enabled && dep && !dep.ok)}
                    className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
                      p.enabled
                        ? 'bg-emerald-900/40 hover:bg-emerald-800/60 border-emerald-700 text-emerald-200'
                        : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                    title={p.enabled ? 'Disable this plugin' : 'Enable this plugin'}
                  >
                    {busy === p.id ? '…' : p.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => deletePlugin(p.id)}
                    disabled={busy === p.id}
                    className="text-xs px-2 py-1 rounded bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-300 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Renders any plugin-registered extensions inside the template-edit popup.
// Each extension is a pure (template) => ReactNode and receives the live
// template; updates flow through the host's socket emit, same as the
// built-in fields. Extensions that throw are isolated so a single broken
// plugin can't blank out the whole popup.
function PluginTemplateEditorExtensions({ template }) {
  useRegistryVersion();
  const ext = pluginRegistries.templateEditorExtensions;
  if (ext.size === 0) return null;
  return (
    <div className="space-y-2 pt-1 border-t border-gray-800">
      {Array.from(ext.entries()).map(([pid, fn]) => {
        try {
          const node = fn(template);
          return node ? <div key={pid}>{node}</div> : null;
        } catch (err) {
          console.warn(`templateEditorExtension "${pid}" threw:`, err);
          return null;
        }
      })}
    </div>
  );
}

// Collapsible wrapper used by the Session tab so each subsection can be folded
// away when the panel gets crowded. State persists per-id in localStorage so a
// GM's collapsed/expanded preference survives reloads.
//
// Plugins can completely HIDE a section by adding its id to
// `pluginRegistries.sessionSectionHidden[pluginId]`. The component subscribes
// to the registry version so a hide/unhide propagates without remounting
// anything else.
const SESSION_COLLAPSED_KEY = 'dndvtt_session_section_collapsed_v1';
function CollapsibleSection({ id, title, children, defaultOpen = true }) {
  useRegistryVersion();
  // Plugin-driven hide check first — if any plugin marks this id as hidden,
  // skip rendering entirely.
  const hiddenByPlugin = (() => {
    for (const set of pluginRegistries.sessionSectionHidden.values()) {
      if (set && set.has && set.has(id)) return true;
    }
    return false;
  })();
  const [open, setOpen] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SESSION_COLLAPSED_KEY) || '{}');
      if (id in stored) return !stored[id];
    } catch {}
    return defaultOpen;
  });
  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        const stored = JSON.parse(localStorage.getItem(SESSION_COLLAPSED_KEY) || '{}');
        stored[id] = !next;
        localStorage.setItem(SESSION_COLLAPSED_KEY, JSON.stringify(stored));
      } catch {}
      return next;
    });
  }
  if (hiddenByPlugin) return null;
  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between text-sm font-semibold text-dnd-gold mb-2 hover:text-yellow-200 transition-colors"
        title={open ? 'Collapse section' : 'Expand section'}
      >
        <span>{title}</span>
        <span className="text-xs text-gray-500 select-none">{open ? '▼' : '▶'}</span>
      </button>
      {open && children}
    </div>
  );
}

// Built-in panel tab bar — filtered by the panelTabHidden registry.
// Subscribing to the registry version means a plugin enabling/disabling a
// hide rule re-renders the bar live. Hiding only removes the BUTTON;
// the corresponding tab content is still rendered when active so a
// plugin can call setPanelTab to land the user inside a hidden tab.
function PanelTabBar({ tabs, labels, activeTab, onSelect, onReorder, badges = {} }) {
  useRegistryVersion();
  const hidden = new Set();
  for (const set of pluginRegistries.panelTabHidden.values()) {
    for (const id of set) hidden.add(id);
  }
  const visible = tabs.filter((t) => !hidden.has(t));
  return (
    <>
      {visible.map((t) => (
        <button
          key={t}
          // SELECT ON POINTER DOWN, NOT ON CLICK.
          //
          // These buttons are draggable so the GM can reorder the bar, and a
          // draggable element starts its drag on the smallest movement while
          // the button is held — at which point the browser cancels the click
          // outright and swaps the cursor for the no-drop one until the mouse
          // moves again. The tab simply did not respond, and mashing the
          // button was the only way through, because a fast enough click beats
          // the drag threshold. Acting on pointerdown means the tab is already
          // chosen by the time any drag begins.
          onPointerDown={(e) => { if (e.button === 0) onSelect(t); }}
          // Keyboard activation only: a click from Enter or Space carries
          // detail 0 and never had a pointerdown to act on. A mouse click is
          // ignored here because pointerdown has already handled it.
          onClick={(e) => { if (e.detail === 0) onSelect(t); }}
          draggable={!!onReorder}
          onDragStart={(e) => {
            if (!onReorder) return;
            e.dataTransfer.setData('application/x-dm-tab', t);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-dm-tab')) e.preventDefault();
          }}
          onDrop={(e) => {
            const from = e.dataTransfer.getData('application/x-dm-tab');
            if (!from || from === t) return;
            e.preventDefault();
            onReorder?.(from, t);
          }}
          className={`flex-1 py-2 text-xs font-medium transition-colors truncate px-1 ${
            activeTab === t ? 'text-dnd-gold border-b-2 border-dnd-gold bg-black/20' : 'text-gray-400 hover:text-gray-200'
          }`}
          title={onReorder ? 'Drag to reorder' : undefined}
        >
          {labels[t]}
          {/* A waiting offer has to be visible from whatever tab the GM is on.
              The party cannot buy anything else until it is answered, and the
              old behaviour — visible only once you opened the Shop tab — is
              how someone ends up waiting on a GM who does not know. */}
          {badges[t] > 0 && (
            <span className="ml-1 px-1 py-0.5 rounded-full bg-amber-500 text-gray-900 text-[9px] font-bold align-middle">
              {badges[t]}
            </span>
          )}
        </button>
      ))}
    </>
  );
}

// Renders any plugin extensions targeted at a specific built-in panel
// tab. Drop one of these inside each tab's body just before any
// host-trailing UI. Extensions are rendered in plugin-registration
// order; throws are caught per-plugin so one bad extension can't blank
// the rest of the tab.
function PluginPanelTabExtensions({ tabId, ctx }) {
  useRegistryVersion();
  const ext = pluginRegistries.panelTabExtensions;
  const items = [];
  for (const [pid, def] of ext.entries()) {
    if (!def || def.tabId !== tabId || typeof def.render !== 'function') continue;
    items.push([pid, def]);
  }
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map(([pid, def]) => {
        let node = null;
        try { node = def.render(ctx || {}); }
        catch (err) {
          return (
            <div key={pid} className="text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1.5">
              Plugin "{pid}" panel extension threw: {String(err.message || err)}
            </div>
          );
        }
        return node ? <React.Fragment key={pid}>{node}</React.Fragment> : null;
      })}
    </div>
  );
}

// Renders any plugin-registered GM tabs as additional buttons in the panel
// tab bar. Tabs are identified by their plugin id; the registry value is a
// { label, icon, render } object. The render function is called with a
// `ctx` of session/socket helpers when the tab is the active one.
function PluginDmTabs({ activeTab, onSelect }) {
  useRegistryVersion();
  const tabs = pluginRegistries.dmTabs;
  if (tabs.size === 0) return null;
  // Same hidden-set logic as the built-in PanelTabBar — plugin tabs use
  // ids of the form `plugin:<pluginId>` for the panelTabHidden registry,
  // so a tab-management plugin can hide them with the same mechanism.
  const hidden = new Set();
  for (const set of pluginRegistries.panelTabHidden.values()) {
    for (const id of set) hidden.add(id);
  }
  return (
    <>
      {Array.from(tabs.entries())
        .filter(([pid]) => !hidden.has(`plugin:${pid}`))
        .map(([pid, def]) => {
          const isActive = activeTab === `plugin:${pid}`;
          return (
            <button
              key={pid}
              onClick={() => onSelect(`plugin:${pid}`)}
              className={`flex-1 min-w-0 py-2 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
                isActive
                  ? 'text-dnd-gold border-dnd-gold'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
              title={def.label || pid}
            >
              <span className="truncate">{def.label || pid}</span>
            </button>
          );
        })}
    </>
  );
}

// Stable identity so the default doesn't remount anything on every render.
const EMPTY_SET = new Set();

function CombatPicker({ tokens, ships = [], selection, shipSelection = EMPTY_SET, onToggle, onToggleShip, onConfirm, onCancel, mode = 'start', autoSelectedIds, viewerId, onViewerChange, hasWalls }) {
  // In add-mode, hide tokens already in combat (they're not candidates).
  const visible = tokens.filter((t) => {
    if (t.is_hidden) return false;
    if (mode === 'add' && t.in_combat) return false;
    return true;
  });
  // Hulls roll their own initiative, so they're combatants to be picked here
  // rather than scenery the crew stands on.
  const visibleShips = ships.filter((s) => !(mode === 'add' && s.in_combat));
  const isAdd = mode === 'add';
  const title = isAdd ? 'Add to Combat' : 'Start Combat';
  const totalPicked = selection.size + shipSelection.size;
  const confirmLabel = isAdd
    ? `Add (${totalPicked})`
    : `Start (${totalPicked})`;
  // Eligible viewers — non-hidden tokens, sorted by name. The dropdown lets
  // the GM pick a viewer right here instead of cancelling out to select one
  // on the map first.
  const viewerCandidates = tokens
    .filter((t) => !t.is_hidden)
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const viewerToken = viewerId ? tokens.find((t) => t.id === viewerId) : null;
  const totalVisible = visible.length;
  const autoCount = autoSelectedIds ? autoSelectedIds.size : 0;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70">
      <div className="bg-dnd-panel border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-dnd-gold font-semibold text-base flex items-center gap-1.5"><SwordIcon />{title}</h2>
          <span className="text-xs text-gray-400">{totalPicked} selected</span>
        </div>
        {!isAdd && (
          <div className="px-5 py-3 border-b border-gray-700 bg-gray-900/40">
            <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1">
              Auto-select by line of sight from
            </label>
            <select
              value={viewerId || ''}
              onChange={(e) => onViewerChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
            >
              <option value="">— None (pre-tick everything) —</option>
              {viewerCandidates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {viewerToken ? (
              hasWalls ? (
                <p className="mt-1.5 text-[11px] text-yellow-200">
                  {autoCount} of {totalVisible} token{totalVisible === 1 ? '' : 's'} visible from <strong>{viewerToken.name}</strong> — the rest are blocked by walls.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-amber-300">
                  This map has no walls or doors yet, so every token is in line of sight from <strong>{viewerToken.name}</strong>. Draw walls to make this filter meaningful.
                </p>
              )
            ) : (
              <p className="mt-1.5 text-[11px] text-gray-400">
                Pick a viewer to pre-tick only the tokens it can see.
              </p>
            )}
          </div>
        )}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {visible.length === 0 && visibleShips.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-sm">
              {isAdd ? 'Nothing left to add.' : 'No visible tokens or ships on map.'}
            </div>
          )}
          {visible.map((t) => {
            const checked = selection.has(t.id);
            const imgUrl = t.creature_image
              ? `/uploads/${t.creature_image}`
              : t.image_path
              ? `/uploads/${t.image_path}`
              : null;
            return (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  checked ? 'bg-yellow-900/30 border border-yellow-600/40' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(t.id)}
                  className="w-4 h-4 accent-yellow-500 shrink-0"
                />
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={imgUrl} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400"><SwordIcon /></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{t.name}</div>
                  <div className="text-xs text-gray-400">
                    HP {t.hit_points}{t.initiative != null ? ` · Init ${t.initiative}` : ''}
                  </div>
                </div>
              </label>
            );
          })}

          {visibleShips.length > 0 && (
            <>
              <div className="pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-500">
                Ships
              </div>
              {visibleShips.map((s) => {
                const checked = shipSelection.has(s.id);
                const max = shipMaxHp(s);
                const cur = shipCurrentHp(s);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      checked ? 'bg-yellow-900/30 border border-yellow-600/40' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleShip?.(s.id)}
                      className="w-4 h-4 accent-yellow-500 shrink-0"
                    />
                    <div className="w-8 h-8 rounded-md bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-sm">
                      <span role="img" aria-label="ship">⛵</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{s.name || s.class_name || 'Ship'}</div>
                      <div className="text-xs text-gray-400">
                        Hull {max > 0 ? `${cur} / ${max}` : '—'}{s.initiative != null ? ` · Init ${s.initiative}` : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </>
          )}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-gray-400 border border-gray-600 rounded-lg hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            // Ships count towards the total — a ship-to-ship fight with no
            // tokens picked at all is a legitimate combat.
            disabled={totalPicked === 0}
            className="flex-1 py-2 text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Right-click-on-token context menu. Positioned with `fixed` at the
// click's viewport coords; the parent passes those in via `menu`.
// First action is "Send to →" — relocates the token to a different
// campaign map. More actions slot in below as the app grows.
function TokenContextMenu({ menu, tokens, maps, currentMapId, spawnPointsByMapId, onClose, onSendToMap, onSetFamiliar, onSetLabelVisibility, onShowImageToPlayers, onStopShowingImage, liveBackdrop, onTransform, onRevert, onTokenFx, onWildShape, onWildShapeRevert, onSetAuras, onSetMark, onSetExhaustion, onAddDarkness, onDetachDarkness, attachedDarkness, onViewStatBlock, onRollLoot, patrol, onPatrolDraw, onPatrolToggle, onPatrolClear }) {
  const token = tokens.find((t) => t.id === menu.tokenId) || null;
  // Two-level submenu: hovering "Send to map" opens the map list;
  // hovering a map (when it has named spawn points) opens its
  // sub-submenu of points. Track which map's sub-sub is open so only
  // one renders at a time.
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [hoverMapId, setHoverMapId] = useState(null);
  const [familiarMenuOpen, setFamiliarMenuOpen] = useState(false);
  const [fxMenuOpen, setFxMenuOpen] = useState(false);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [auraMenuOpen, setAuraMenuOpen] = useState(false);
  const [darkMenuOpen, setDarkMenuOpen] = useState(false);
  // A shaped token's creature_id is the BEAST, so the character sheet — and
  // therefore the curated form list — comes from pretransform when set.
  const sheetId = token?.pretransform?.creature_id ?? token?.creature_id ?? null;
  const [wsForms, setWsForms] = useState([]);
  useEffect(() => {
    let cancelled = false;
    setWsForms([]);
    if (!token?.is_player || !sheetId) return;
    (async () => {
      try {
        const sheetRes = await fetch(`/api/creatures/${sheetId}`);
        if (!sheetRes.ok) return;
        const sheet = await sheetRes.json();
        const ids = Array.isArray(sheet.wildshape_forms) ? sheet.wildshape_forms : [];
        if (!ids.length) return;
        const rows = await Promise.all(ids.map((id) =>
          fetch(`/api/creatures/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        ));
        if (!cancelled) setWsForms(rows.filter(Boolean));
      } catch { /* menu just won't offer Wild Shape */ }
    })();
    return () => { cancelled = true; };
  }, [token?.is_player, sheetId]);
  // Close on Escape and on any outside click. Mousedown rather than click
  // so the menu dismisses before any new gesture begins.
  useEffect(() => {
    function onDown(e) {
      const root = document.getElementById('token-context-menu-root');
      if (root && !root.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Destination list. Other-map entries always show; the current map
  // is included only if it has at least one named spawn point — sending
  // to a map's default spawn would dump the token where it already is.
  const destinationMaps = (maps || []).filter((m) => {
    if (m.id !== currentMapId) return true;
    const pts = spawnPointsByMapId?.[m.id] || [];
    return pts.length > 0;
  });

  // Every player currently holding a token in this session — the possible
  // owners for a familiar. Names are the identity familiars bind to, so a
  // token whose player has no token yet simply isn't offered.
  const playerNames = Array.from(new Set(
    (tokens || []).filter((t) => t.is_player && t.player_name).map((t) => t.player_name)
  )).sort((a, b) => a.localeCompare(b));

  // Measured rather than guessed — see utils/anchoredMenu. This menu had
  // outgrown the 240px its old clamp assumed, so right-clicking near the
  // bottom of the screen left its lower entries unreachable.
  const anchored = useAnchoredMenu(menu.x, menu.y);

  return (
    <div
      id="token-context-menu-root"
      ref={anchored.ref}
      className={`fixed z-[95] bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-sm text-gray-100 min-w-[200px] py-1 ${anchored.className}`}
      style={anchored.style}
    >
      <div className="px-3 py-2 border-b border-gray-800 text-gray-400 text-xs">
        {token?.name || 'Token'}
        {token?.familiar_of && (
          <span className="text-violet-300"> — {token.companion_kind || 'familiar'} of {token.familiar_of}</span>
        )}
      </div>

      {/* Stat block. First in the list because it is the question most often
          asked of a token mid-fight — what is this thing, and what can it do —
          and unlike everything below it, it changes nothing.

          Keyed off token.creature_id rather than the sheet id used for wild
          shape further down: what the GM clicked is what is standing on the
          board, so a shaped druid gives the bear's block, not the druid's.
          That also matches the same button on the Tokens tab.

          Hidden rather than disabled for a token with no creature behind it —
          a marker, or a stand-in dropped straight onto the map — because there
          is no block to show and a greyed row invites a click that can't work. */}
      {token?.creature_id != null && onViewStatBlock && (
        <div
          className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3 border-b border-gray-800"
          onClick={(e) => { e.stopPropagation(); onViewStatBlock(token.creature_id); }}
        >
          <span>Stat block</span>
          <span className="text-gray-500 text-xs">view</span>
        </div>
      )}

      {/* Loot. Offered for anything with a creature behind it rather than only
          for the dead: a GM may want to know what a monster is carrying before
          deciding whether it surrenders. Whether a loot table is actually set
          is the SERVER's question — it looks the creature up from the token —
          so this never has to guess, and says so if there is none. */}
      {token?.creature_id != null && onRollLoot && (
        <div
          className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3 border-b border-gray-800"
          onClick={(e) => { e.stopPropagation(); onRollLoot(menu.tokenId); }}
        >
          <span>Roll loot</span>
          <span className="text-gray-500 text-xs">{token?.current_hp <= 0 ? 'slain' : 'table'}</span>
        </div>
      )}

      {/* Patrols. A route is drawn on the map rather than typed, so the entry
          here starts that and the floating bar finishes it. */}
      <div
        className="px-3 py-1.5 hover:bg-gray-700 cursor-pointer flex items-center justify-between gap-6"
        onClick={(e) => { e.stopPropagation(); onPatrolDraw(menu.tokenId); }}
      >
        <span>{patrol ? 'Redraw patrol route' : 'Set patrol route…'}</span>
        <span className="text-gray-500 text-xs">
          {patrol ? `${(patrol.waypoints || []).length} pts · ${patrol.speed_ft} ft` : 'waypoints'}
        </span>
      </div>
      {patrol && (
        <>
          <div
            className="px-3 py-1.5 hover:bg-gray-700 cursor-pointer flex items-center justify-between gap-6"
            onClick={(e) => { e.stopPropagation(); onPatrolToggle(menu.tokenId, !patrol.active); }}
          >
            <span>{patrol.active ? 'Halt this patrol' : 'Resume this patrol'}</span>
            <span className={`text-xs ${patrol.active ? 'text-emerald-400' : 'text-gray-500'}`}>
              {patrol.active ? 'walking' : 'stopped'}
            </span>
          </div>
          <div
            className="px-3 py-1.5 hover:bg-gray-700 cursor-pointer text-red-300"
            onClick={(e) => { e.stopPropagation(); onPatrolClear(menu.tokenId); }}
          >Delete patrol route</div>
        </>
      )}

      {/* Aura rings anchored to this token — they travel with it. */}
      <div
        className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between"
        onMouseEnter={() => setAuraMenuOpen(true)}
        onMouseLeave={() => setAuraMenuOpen(false)}
      >
        <span>Aura</span>
        <span className="text-gray-500">▸</span>
        {auraMenuOpen && (
          <Submenu className="min-w-[230px]">
            {[
              { label: 'Aura of Protection', radius: 10, color: '#fbbf24' },
              { label: 'Aura (30 ft)',       radius: 30, color: '#fbbf24' },
              { label: 'Spirit Guardians',   radius: 15, color: '#a78bfa' },
              { label: 'Wrath of the Sea',   radius: 10, color: '#38bdf8' },
              { label: 'Shock Wave',         radius: 10, color: '#f97316' },
              { label: 'Emanation (5 ft)',   radius: 5,  color: '#34d399' },
            ].map((preset) => (
              <div
                key={preset.label}
                className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const existing = Array.isArray(token?.auras) ? token.auras : [];
                  onSetAuras(menu.tokenId, [...existing, { id: `a-${Date.now()}`, ...preset }]);
                }}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: preset.color }} />
                <span className="truncate">{preset.label}</span>
                <span className="text-gray-500 text-[11px] ml-auto">{preset.radius} ft</span>
              </div>
            ))}
            {Array.isArray(token?.auras) && token.auras.length > 0 && (
              <div
                className="px-3 py-2 hover:bg-red-900/40 cursor-pointer text-red-300 border-t border-gray-800"
                onClick={(e) => { e.stopPropagation(); onSetAuras(menu.tokenId, []); }}
              >
                Clear {token.auras.length} aura{token.auras.length === 1 ? '' : 's'}
              </div>
            )}
          </Submenu>
        )}
      </div>

      {/* Darkness that travels with this token — Shadow Arts, Warrior of
          Shadow. The zone is created already attached, so moving the token
          moves the darkness and the fog recomputes from its new centre. */}
      <div
        className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between"
        onMouseEnter={() => setDarkMenuOpen(true)}
        onMouseLeave={() => setDarkMenuOpen(false)}
      >
        <span>Darkness{attachedDarkness ? ' ✓' : ''}</span>
        <span className="text-gray-500">▸</span>
        {darkMenuOpen && (
          <Submenu className="min-w-[230px]">
            {attachedDarkness ? (
              <div
                className="px-3 py-2 hover:bg-red-900/40 cursor-pointer text-red-300"
                onClick={(e) => { e.stopPropagation(); onDetachDarkness(attachedDarkness.id); }}
              >
                Remove darkness from this token
              </div>
            ) : (
              <>
                {[10, 15, 20, 30].map((ft) => (
                  <div
                    key={ft}
                    className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
                    onClick={(e) => { e.stopPropagation(); onAddDarkness(menu.tokenId, ft, 'darkness'); }}
                  >
                    <span>Darkness follows token</span>
                    <span className="text-gray-500 text-[11px]">{ft} ft</span>
                  </div>
                ))}
                <div
                  className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3 border-t border-gray-800"
                  onClick={(e) => { e.stopPropagation(); onAddDarkness(menu.tokenId, 20, 'heavy-fog'); }}
                >
                  <span>Heavy fog follows token</span>
                  <span className="text-gray-500 text-[11px]">20 ft</span>
                </div>
              </>
            )}
          </Submenu>
        )}
      </div>

      {/* Marked target + exhaustion level. */}
      <div
        className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
        onClick={(e) => { e.stopPropagation(); onSetMark(menu.tokenId, !!token?.marked_by); }}
      >
        <span>{token?.marked_by ? `Clear mark (${token.marked_by})` : 'Mark this creature'}</span>
        {token?.marked_by && <span className="text-red-300">✦</span>}
      </div>
      <div className="px-3 py-2 flex items-center justify-between gap-3 border-b border-gray-800">
        <span>Exhaustion</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSetExhaustion(menu.tokenId, Math.max(0, (Number(token?.exhaustion) || 0) - 1))}
            className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 leading-none"
          >−</button>
          <span className="font-mono w-5 text-center">{Number(token?.exhaustion) || 0}</span>
          <button
            onClick={() => onSetExhaustion(menu.tokenId, Math.min(6, (Number(token?.exhaustion) || 0) + 1))}
            className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 leading-none"
          >+</button>
        </div>
      </div>

      {/* Wild Shape — only for player tokens whose character has forms curated.
          Uses the same server path the player's own panel does, so the temp HP
          and keep-HP rules are identical however it's triggered. */}
      {token?.is_player && (wsForms.length > 0 || token?.pretransform) && (
        <div
          className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between"
          onMouseEnter={() => setWsMenuOpen(true)}
          onMouseLeave={() => setWsMenuOpen(false)}
        >
          <span>Wild Shape</span>
          <span className="text-gray-500">▸</span>
          {wsMenuOpen && (
            <Submenu className="min-w-[220px] max-h-72 overflow-y-auto">
              {token?.pretransform && (
                <div
                  className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-emerald-300 border-b border-gray-800"
                  onClick={(e) => { e.stopPropagation(); onWildShapeRevert(menu.tokenId); }}
                >
                  ↺ Return to own form
                </div>
              )}
              {wsForms.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 italic">No forms on this sheet</div>
              ) : wsForms.map((f) => (
                <div
                  key={f.id}
                  className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onWildShape(menu.tokenId, f.id); }}
                >
                  {f.image_path
                    ? <img src={`/uploads/${f.image_path}`} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                    : <span className="w-6 h-6 rounded bg-gray-700 shrink-0" />}
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </Submenu>
          )}
        </div>
      )}
      {/* Transformation. "Transform into…" opens the creature picker; the
          effects below are spectacle on their own — fire consumes the token
          entirely, frost leaves it paralysed where it stands. */}
      <div
        className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
        onClick={(e) => { e.stopPropagation(); onTransform(menu.tokenId); }}
      >
        <span>Transform into…</span>
        <span className="text-emerald-300">✦</span>
      </div>
      {token?.pretransform && (
        <div
          className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
          onClick={(e) => { e.stopPropagation(); onRevert(menu.tokenId); }}
        >
          <span>Revert to {token.pretransform.name || 'original form'}</span>
          <span className="text-emerald-300">↺</span>
        </div>
      )}
      <div
        className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between border-b border-gray-800"
        onMouseEnter={() => setFxMenuOpen(true)}
        onMouseLeave={() => setFxMenuOpen(false)}
      >
        <span>Cast effect</span>
        <span className="text-gray-500">▸</span>
        {fxMenuOpen && (
          <Submenu className="min-w-[220px]">
            <div
              className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-emerald-300"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'vines', condition: 'restrained' }); }}
            >
              🌿 Vine cocoon <span className="text-gray-500 text-[11px]">— restrained</span>
            </div>
            <div
              className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-sky-300"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'frost', condition: 'paralyzed' }); }}
            >
              ❄ Freeze solid <span className="text-gray-500 text-[11px]">— paralyzed</span>
            </div>
            <div
              className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-violet-300"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'blink' }); }}
            >
              ✨ Blink <span className="text-gray-500 text-[11px]">— teleport flash</span>
            </div>
            {/* The destroying effects, grouped under one rule so they read as
                a set and can't be clicked by accident on the way to Blink. */}
            <div
              className="px-3 py-2 hover:bg-red-900/40 cursor-pointer text-orange-300 border-t border-gray-800"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'fire', destroy: true }); }}
            >
              🔥 Fire blast <span className="text-red-400 text-[11px]">— destroys token</span>
            </div>
            <div
              className="px-3 py-2 hover:bg-red-900/40 cursor-pointer text-stone-300"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'dissolve', destroy: true }); }}
            >
              🌫 Disintegrate <span className="text-red-400 text-[11px]">— crumbles to ash</span>
            </div>
            <div
              className="px-3 py-2 hover:bg-red-900/40 cursor-pointer text-amber-300"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'explode', destroy: true }); }}
            >
              💥 Explode <span className="text-red-400 text-[11px]">— blast outward</span>
            </div>
            <div
              className="px-3 py-2 hover:bg-red-900/40 cursor-pointer text-indigo-300"
              onClick={(e) => { e.stopPropagation(); onTokenFx(menu.tokenId, { effect: 'implode', destroy: true }); }}
            >
              🕳 Implode <span className="text-red-400 text-[11px]">— collapses inward</span>
            </div>
          </Submenu>
        )}
      </div>
      {/* Push this token's art to the players' screens as a backdrop. The
          creature's presentation art wins when it has any — that's the full
          picture, where the token image (its own override if set, otherwise
          its creature's portrait) is a small square face. The server picks the
          same way; this mirrors it so the menu can say which one it will send
          and light up while that art is live. */}
      {(() => {
        const displayArt = token?.creature_display_image || null;
        const tokenArt = displayArt || token?.image_path || token?.creature_image || null;
        const isShowing = !!tokenArt && liveBackdrop?.source_image_path === tokenArt;
        if (!tokenArt) {
          return (
            <div className="px-3 py-2 text-gray-600 flex items-center justify-between gap-3 cursor-default">
              <span>Show image to players</span>
              <span className="text-[11px] italic">no image</span>
            </div>
          );
        }
        return (
          <div
            className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3 border-b border-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              if (isShowing) onStopShowingImage();
              else onShowImageToPlayers(menu.tokenId);
            }}
          >
            <span>
              {isShowing ? 'Stop showing image'
                : displayArt ? 'Show artwork to players'
                : 'Show image to players'}
            </span>
            {isShowing && <span className="text-amber-300">●</span>}
          </div>
        );
      })()}
      {/* Label visibility — players' view only; the GM always sees both. Each
          half toggles on its own. A token in combat shows both regardless,
          which is why the note appears once either is hidden. */}
      <div
        className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
        onClick={(e) => {
          e.stopPropagation();
          onSetLabelVisibility(menu.tokenId, { hideName: !token?.hide_name_from_players });
        }}
      >
        <span>Hide name from players</span>
        {token?.hide_name_from_players && <span className="text-amber-300">✓</span>}
      </div>
      <div
        className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
        onClick={(e) => {
          e.stopPropagation();
          onSetLabelVisibility(menu.tokenId, { hideHp: !token?.hide_hp_from_players });
        }}
      >
        <span>Hide health bar from players</span>
        {token?.hide_hp_from_players && <span className="text-amber-300">✓</span>}
      </div>
      {(token?.hide_name_from_players || token?.hide_hp_from_players) && (
        <div className="px-3 pb-2 pt-0.5 text-[11px] text-gray-500 leading-snug border-b border-gray-800">
          {token?.in_combat
            ? 'Showing anyway — token is in combat.'
            : 'Reappears for players once the token joins combat.'}
        </div>
      )}
      {/* Familiar binding. A player's own token can't be a familiar (the
          server rejects it too), so the row is hidden for player tokens. */}
      {!token?.is_player && (
        <div
          className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between"
          onMouseEnter={() => setFamiliarMenuOpen(true)}
          onMouseLeave={() => setFamiliarMenuOpen(false)}
        >
          <span>Companion of</span>
          <span className="text-gray-500">▸</span>
          {familiarMenuOpen && (
            <Submenu className="min-w-[180px]">
              <div
                className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-gray-300 italic border-b border-gray-800"
                onClick={(e) => { e.stopPropagation(); onSetFamiliar(menu.tokenId, null); }}
              >
                Nobody (detach)
              </div>
              {playerNames.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 italic">No players in session</div>
              ) : playerNames.map((pn) => (
                <div key={pn} className="border-b border-gray-800 last:border-0">
                  <div className={`px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider ${
                    token?.familiar_of === pn ? 'text-violet-300' : 'text-gray-500'
                  }`}>
                    {pn}{token?.familiar_of === pn ? ` ✓ (${token.companion_kind || 'familiar'})` : ''}
                  </div>
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {['familiar', 'summon', 'companion', 'mount', 'duplicate'].map((k) => (
                      <button
                        key={k}
                        onClick={(e) => { e.stopPropagation(); onSetFamiliar(menu.tokenId, pn, k); }}
                        className={`text-[11px] px-2 py-1 rounded transition-colors ${
                          token?.familiar_of === pn && (token.companion_kind || 'familiar') === k
                            ? 'bg-violet-700 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </Submenu>
          )}
        </div>
      )}
      <div
        className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between"
        onMouseEnter={() => setSubmenuOpen(true)}
        onMouseLeave={() => setSubmenuOpen(false)}
      >
        <span>Send to map</span>
        <span className="text-gray-500">▸</span>
        {submenuOpen && (
          <Submenu className="min-w-[200px]">
            {destinationMaps.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 italic">No other maps</div>
            ) : (
              destinationMaps.map((m) => {
                const pts = spawnPointsByMapId?.[m.id] || [];
                const hasPts = pts.length > 0;
                return (
                  <div
                    key={m.id}
                    className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between gap-3"
                    onMouseEnter={() => setHoverMapId(m.id)}
                    onMouseLeave={() => setHoverMapId(prev => prev === m.id ? null : prev)}
                    onClick={(e) => {
                      // Maps with named points: clicking the map row
                      // alone would be ambiguous, so require picking a
                      // specific point from the sub-submenu. Maps
                      // without named points fall through to the
                      // default spawn.
                      if (hasPts) return;
                      e.stopPropagation();
                      onSendToMap(menu.tokenId, m.id, null);
                    }}
                  >
                    <span>{m.name || `Map #${m.id}`}</span>
                    {hasPts && <span className="text-gray-500">▸</span>}
                    {hasPts && hoverMapId === m.id && (
                      <Submenu className="min-w-[180px]">
                        <div
                          className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-gray-300 italic border-b border-gray-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendToMap(menu.tokenId, m.id, null);
                          }}
                        >
                          Default spawn
                        </div>
                        {pts.map((sp) => (
                          <div
                            key={sp.id}
                            className="px-3 py-2 hover:bg-gray-800 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendToMap(menu.tokenId, m.id, sp.id);
                            }}
                          >
                            {sp.label || `Point ${sp.id}`}
                          </div>
                        ))}
                      </Submenu>
                    )}
                  </div>
                );
              })
            )}
          </Submenu>
        )}
      </div>
    </div>
  );
}

// Transform picker — choose what a token becomes and which effect carries the
// change. Search hits the same creature library the token list draws from, so
// anything placeable is a valid destination (the cocoon, a wolf, a statue).
function TransformModal({ token, onCancel, onConfirm }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const [effect, setEffect] = useState('vines');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        params.set('role', 'dm');
        const res = await fetch(`/api/creatures?${params}`);
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setResults(data.slice(0, 60));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  const EFFECTS = [
    { id: 'vines', label: '🌿 Vine cocoon', hint: 'Green tendrils wrap the token', ring: 'border-emerald-500 bg-emerald-900/40' },
    { id: 'frost', label: '❄ Deep freeze',  hint: 'Ice sheathes it, then shatters', ring: 'border-sky-500 bg-sky-900/40' },
    { id: 'fire',  label: '🔥 Immolation',  hint: 'Flame swallows the old form',   ring: 'border-orange-500 bg-orange-900/40' },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="text-lg font-semibold text-gray-100">Transform {token?.nickname || token?.name}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            The token keeps its position and, for a player, its owner — only its form changes. Revert from the same menu.
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-800">
          <div className="grid grid-cols-3 gap-2">
            {EFFECTS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEffect(e.id)}
                title={e.hint}
                className={`text-xs px-2 py-2 rounded-lg border transition-colors ${
                  effect === e.id ? e.ring + ' text-white' : 'border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 border-b border-gray-800">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creatures — cocoon, wolf, statue…"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:border-emerald-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[140px]">
          {loading && <p className="text-xs text-gray-500 px-2 py-3">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-3">No creatures match. The target must exist in the library.</p>
          )}
          <div className="grid grid-cols-2 gap-1">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => setPicked(c)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                  picked?.id === c.id ? 'bg-emerald-800/60 text-white' : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                {c.image_path
                  ? <img src={`/uploads/${c.image_path}`} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  : <div className="w-8 h-8 rounded bg-gray-700 shrink-0" />}
                <span className="text-xs truncate">
                  {c.name}
                  <span className="block text-[10px] text-gray-500">
                    {c.size} • {c.hit_points} hp
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between gap-2">
          <div className="text-[11px] text-gray-500 truncate">
            {picked ? `Becomes ${picked.name} (${picked.hit_points} hp)` : 'Pick a creature to become'}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm">Cancel</button>
            <button
              onClick={() => picked && onConfirm(picked.id, effect)}
              disabled={!picked}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm"
            >
              Transform
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Label-prompt modal opened after the GM clicks the canvas with the
// 'spawn-named' tool. The parent owns the pending coords and the
// socket emit; we only collect the label and call back.
function SpawnPointLabelModal({ onCancel, onSubmit }) {
  const [label, setLabel] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  function submit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 shadow-2xl">
        <div className="text-lg font-semibold mb-3 text-gray-100">Name this spawn point</div>
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
          maxLength={100}
          placeholder="e.g. Front Entrance"
          className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 focus:border-cyan-500 outline-none"
        />
        <div className="text-[11px] text-gray-500 leading-snug mt-3">
          Tokens sent here scatter inside the polygon you drew, avoiding existing tokens.
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100"
          >Cancel</button>
          <button
            onClick={submit}
            disabled={!label.trim()}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white"
          >Save</button>
        </div>
      </div>
    </div>
  );
}

// Cloud colours offered in the terrain menu.
//
// These are the colours the cloud ENDS UP, not filters laid over it: the art is
// multiplied by the swatch, and the shipped bank is near-white, so what you pick
// is roughly what you get. Kept deliberately desaturated — a cloud at full
// chroma reads as a solid coloured shape rather than as vapour.
const CLOUD_TINTS = [
  { hex: null,      name: 'Cloud',  swatch: '#e8eef6' },
  { hex: '#b8c4d4', name: 'Storm',  swatch: '#b8c4d4' },
  { hex: '#6b7280', name: 'Smoke',  swatch: '#6b7280' },
  { hex: '#9ccf72', name: 'Poison', swatch: '#9ccf72' },
  { hex: '#7fb6e8', name: 'Mist',   swatch: '#7fb6e8' },
  { hex: '#c9a36a', name: 'Dust',   swatch: '#c9a36a' },
  { hex: '#e8874a', name: 'Ember',  swatch: '#e8874a' },
  { hex: '#a978e8', name: 'Arcane', swatch: '#a978e8' },
  { hex: '#d95a5a', name: 'Blood',  swatch: '#d95a5a' },
];

// Animation speeds offered for the pieces that move in 3D.
//
// A short ladder rather than a slider: the useful answers are "stop it",
// "slower", "as drawn" and "faster", and a continuous control invites fiddling
// to find a value that a preset already covers. 4x is the ceiling because past
// there a cloud stops reading as vapour and starts reading as a fault.
const ANIM_SPEEDS = [
  { v: 0,    label: 'Stop' },
  { v: 0.25, label: '¼×' },
  { v: 0.5,  label: '½×' },
  { v: 1,    label: '1×' },
  { v: 2,    label: '2×' },
  { v: 4,    label: '4×' },
];

// Does this piece move in 3D at all? Only these two shapes are animated, and
// showing a speed control on a rock the GM can never see move is worse than
// not offering one.
const ANIMATED_3D_SHAPES = new Set(['cloud', 'gate', 'blackhole', 'wormhole', 'ionstorm', 'debris', 'vine', 'tentacle']);

// Right-click menu for a placed terrain piece. Stays within the
// existing context-menu pattern used by tokens — `fixed` positioned at
// the click's viewport coords, dismissed on outside-click or Escape.
function TerrainContextMenu({ menu, terrain, onClose, onDelete, onToggleReveal, onResize, onRotate, onRename, onShowImage, isShowingImage, isResizing = false, onToggleResizeMode, onSetProps }) {
  useEffect(() => {
    function onDown(e) {
      const root = document.getElementById('terrain-context-menu-root');
      if (root && !root.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  // The hook must run before the early return below: bailing out first would
  // change the number of hooks this component calls between renders, which is
  // an error the moment a terrain row appears or disappears under an open menu.
  const anchored = useAnchoredMenu(menu.x, menu.y);
  if (!terrain) return null;
  return (
    <div
      id="terrain-context-menu-root"
      ref={anchored.ref}
      className={`fixed z-[95] bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-sm text-gray-100 min-w-[220px] py-1 ${anchored.className}`}
      style={anchored.style}
    >
      <div className="px-3 py-2 border-b border-gray-800 text-gray-400 text-xs">
        {terrain.label || terrain.lib_name || 'Terrain'}
      </div>
      {/* The stepped buttons below are the safe way to resize; free drag is
          opt-in because its handles reach past the piece and take clicks with
          them. */}
      <button
        onClick={() => onToggleResizeMode?.(terrain.id)}
        disabled={!!terrain.locked}
        className={`w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent ${isResizing ? 'text-cyan-300' : ''}`}
      >
        <span>{isResizing ? 'Done resizing' : 'Resize / rotate by hand'}</span>
        {isResizing && <span className="text-[10px] text-gray-500">Esc</span>}
      </button>
      {/* Pin the piece down. A locked piece can't be dragged, resized or
          rotated, and stops taking clicks meant for the map or for whatever is
          standing on it — which is the actual complaint big scenery causes.
          Right-click still reaches it, so this is always reversible. */}
      <button
        onClick={() => { onSetProps?.(terrain.id, { locked: !terrain.locked }); onClose(); }}
        className={`w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center justify-between ${terrain.locked ? 'text-amber-300' : ''}`}
      >
        <span>{terrain.locked ? 'Unlock (allow moving)' : 'Lock in place'}</span>
        <span className="text-xs">{terrain.locked ? '🔒' : '🔓'}</span>
      </button>
      <div className="my-1 border-t border-gray-800" />
      <button
        onClick={() => onResize(terrain.id, 0.85)}
        disabled={!!terrain.locked}
        className="w-full text-left px-3 py-2 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >Shrink ×0.85</button>
      <button
        onClick={() => onResize(terrain.id, 1.18)}
        disabled={!!terrain.locked}
        className="w-full text-left px-3 py-2 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >Grow ×1.18</button>
      <button
        onClick={() => onRotate(terrain.id, 90)}
        disabled={!!terrain.locked}
        className="w-full text-left px-3 py-2 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >Rotate 90°</button>
      {/* ── 3D view ────────────────────────────────────────────────────────
          Height and name tag are per-PLACEMENT, so two copies of the same
          library piece can sit at different altitudes with different names.
          None of it changes the flat map, which keeps showing the piece at its
          grid square whatever height it is drawn at in 3D. */}
      <div className="my-1 border-t border-gray-800" />
      <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-gray-500">3D view</div>
      {/* Open or shut. A dormant gate loses its surface entirely — the ring is
          empty and you see through it — and every player's screen follows the
          moment this is flipped. */}
      {terrain.lib_three_d_shape === 'gate' && (() => {
        const on = terrain.is_active !== false;
        return (
          <button
            onClick={() => onSetProps?.(terrain.id, { isActive: !on })}
            className={`w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center justify-between ${on ? 'text-cyan-300' : 'text-gray-400'}`}
          >
            <span>{on ? 'Shut the gate' : 'Open the gate'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${on ? 'bg-cyan-900/60 text-cyan-200' : 'bg-gray-800 text-gray-500'}`}>
              {on ? 'ACTIVE' : 'DORMANT'}
            </span>
          </button>
        );
      })()}
      <div className="px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-xs text-gray-400 shrink-0">Height</span>
        <button
          onClick={() => onSetProps?.(terrain.id, { elevation: (Number(terrain.elevation) || 0) - 10 })}
          className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 hover:border-cyan-500 text-xs"
        >−10</button>
        <input
          type="number"
          step="5"
          value={Number(terrain.elevation) || 0}
          onChange={(e) => onSetProps?.(terrain.id, { elevation: Number(e.target.value) || 0 })}
          className="w-16 px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-100 text-xs text-right"
        />
        <span className="text-[10px] text-gray-500">ft</span>
        <button
          onClick={() => onSetProps?.(terrain.id, { elevation: (Number(terrain.elevation) || 0) + 10 })}
          className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 hover:border-cyan-500 text-xs"
        >+10</button>
      </div>
      {/* Tri-state, not a checkbox. "Auto" is the flat map's own rule — markers
          are named, scenery isn't — and the other two are the GM overriding it
          for this one piece. */}
      <div className="px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">Name tag</span>
        <select
          value={terrain.show_label === true ? 'on' : terrain.show_label === false ? 'off' : 'auto'}
          onChange={(e) => onSetProps?.(terrain.id, {
            showLabel: e.target.value === 'auto' ? null : e.target.value === 'on',
          })}
          className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-0.5 text-xs"
        >
          <option value="auto">Auto{terrain.is_marker ? ' (shown)' : ' (hidden)'}</option>
          <option value="on">Always show</option>
          <option value="off">Never show</option>
        </select>
      </div>
      <label className="px-3 py-1.5 flex items-center gap-2 text-xs text-gray-200 hover:bg-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={!!terrain.hide_label_from_players}
          onChange={(e) => onSetProps?.(terrain.id, { hideLabelFromPlayers: e.target.checked })}
        />
        <span>Name is GM-only</span>
      </label>
      {/* Colour, for cloud pieces. Offered here rather than on the library
          entry because it is the thing most worth varying per placement: one
          map wants grey fog over the moor AND green gas in the crypt, from the
          same Cloud Bank. Applies to both views — the flat map multiplies the
          art by the same colour, so the two never disagree. */}
      {terrain.lib_three_d_shape === 'cloud' && (
        <div className="px-3 py-1.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Colour</span>
            <span className="text-[10px] text-gray-500">
              {CLOUD_TINTS.find((c) => c.hex === (terrain.tint || null))?.name || 'Custom'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CLOUD_TINTS.map((c) => {
              const active = (terrain.tint || null) === c.hex;
              return (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => onSetProps?.(terrain.id, { tint: c.hex })}
                  className={`w-5 h-5 rounded-full border transition-colors ${
                    active ? 'border-cyan-300 ring-1 ring-cyan-400' : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: c.swatch }}
                />
              );
            })}
            {/* Anything the presets don't cover. The native picker fires on
                every drag step, so this commits on change only — which for a
                colour input is when the dialog closes. */}
            <label
              title="Custom colour"
              className="w-5 h-5 rounded-full border border-gray-600 hover:border-gray-400 cursor-pointer overflow-hidden relative"
              style={{ background: 'conic-gradient(#e8874a,#9ccf72,#7fb6e8,#a978e8,#d95a5a,#e8874a)' }}
            >
              <input
                type="color"
                value={terrain.tint || '#e8eef6'}
                onChange={(e) => onSetProps?.(terrain.id, { tint: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
      <div className="my-1 border-t border-gray-800" />
      {/* Animation pacing, for the shapes that move. Speed 0 freezes the piece
          where it stands rather than snapping it to a rest pose, so stopping a
          cloud leaves it looking like a cloud. */}
      {ANIMATED_3D_SHAPES.has(terrain.lib_three_d_shape) && (
        <div className="px-3 py-1.5 space-y-1.5">
          <span className="text-xs text-gray-400">Animation</span>
          <div className="flex gap-1">
            {ANIM_SPEEDS.map((sp) => {
              const cur = Number.isFinite(Number(terrain.anim_speed)) ? Number(terrain.anim_speed) : 1;
              const active = Math.abs(cur - sp.v) < 0.001;
              return (
                <button
                  key={sp.v}
                  type="button"
                  onClick={() => onSetProps?.(terrain.id, { animSpeed: sp.v })}
                  className={`flex-1 px-1 py-0.5 rounded text-[11px] border transition-colors ${
                    active
                      ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >{sp.label}</button>
              );
            })}
          </div>
        </div>
      )}
      {/* Markers hide on a plain toggle, always available. Scenery keeps the
          hidden-until-revealed rule, so its button only appears when the
          library entry opted in. */}
      {(terrain.is_marker || terrain.hide_until_revealed) && (
        <button
          onClick={() => onToggleReveal(terrain.id, !terrain.is_revealed)}
          className="w-full text-left px-3 py-2 hover:bg-gray-800"
        >{terrain.is_revealed ? 'Hide from players' : 'Show to players'}</button>
      )}
      {/* Not marker-only any more: a name tag is available to any piece in 3D,
          and a tag needs something to say. */}
      <button
        onClick={() => onRename(terrain)}
        className="w-full text-left px-3 py-2 hover:bg-gray-800"
      >Rename…</button>
      {/* The full picture behind the disc, pushed to the players' screens
          through the backdrop system — same channel as a token's portrait. */}
      {terrain.is_marker && (
        <button
          onClick={() => onShowImage(terrain)}
          className="w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center justify-between gap-3"
        >
          <span>{isShowingImage ? 'Stop showing image' : 'Show full image to players'}</span>
          {isShowingImage && <span className="text-amber-300">●</span>}
        </button>
      )}
      <button
        onClick={() => onDelete(terrain.id)}
        className="w-full text-left px-3 py-2 hover:bg-gray-800 text-red-400 border-t border-gray-800"
      >Delete</button>
    </div>
  );
}

// Upload modal for adding a new terrain piece to the global library.
// Image upload + the same flag set you can edit later.
function TerrainUploadModal({ onCancel, onSaved }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [defaultW, setDefaultW] = useState(2);
  const [defaultH, setDefaultH] = useState(2);
  const [hideUntilRevealed, setHideUntilRevealed] = useState(false);
  const [isMarker, setIsMarker] = useState(false);
  // Framed square art for a marker, produced by ImageFramer. `file` stays the
  // untouched original so the GM can push the full picture to players later and
  // so re-framing always crops from the source rather than from the last crop.
  const [framedBlob, setFramedBlob] = useState(null);
  const [showFramer, setShowFramer] = useState(false);
  // An optional Blender export. It does NOT replace the flat art — the 2D
  // board still draws the sprite, and this is only what the 3D view stands up
  // in its place. Uploaded as a second request after the row exists, because
  // the row's id is what the model route addresses.
  const [modelFile, setModelFile] = useState(null);
  const [busy, setBusy] = useState(false);
  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (!f) return;
    // Auto-suggest the piece name from the filename's stem so the GM
    // doesn't have to retype it. Keeps any value they've already typed.
    if (!name) {
      const stem = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setName(stem.replace(/\b\w/g, (c) => c.toUpperCase()));
    }
    // Derive default size from the image's natural aspect ratio so a
    // wide rock-wall comes in as 6×1 instead of getting squashed into
    // the 2×2 baseline. Browsers handle SVGs (with width/height or a
    // viewBox), PNG/JPG/WebP/GIF via the standard Image() pipeline.
    const url = URL.createObjectURL(f);
    const img = new window.Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (!nw || !nh) return;
      const aspect = nw / nh;
      const base = 4; // grid units along the longer axis
      if (aspect >= 1) {
        setDefaultW(+base.toFixed(2));
        setDefaultH(+(base / aspect).toFixed(2));
      } else {
        setDefaultH(+base.toFixed(2));
        setDefaultW(+(base * aspect).toFixed(2));
      }
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }
  async function submit() {
    if (!file || !name.trim()) return;
    setBusy(true);
    const fd = new FormData();
    // Markers draw as a disc, so the framed square is what lands on the map and
    // the original rides along for "show full image to players".
    if (isMarker && framedBlob) {
      fd.append('image', framedBlob, 'marker.png');
      fd.append('source_image', file);
    } else {
      fd.append('image', file);
    }
    fd.append('name', name.trim());
    fd.append('default_w', String(defaultW));
    fd.append('default_h', String(defaultH));
    fd.append('hide_until_revealed', String(hideUntilRevealed));
    fd.append('is_marker', String(isMarker));
    try {
      const r = await fetch('/api/terrain/library', { method: 'POST', body: fd });
      if (!r.ok) return;
      let row = await r.json();
      if (modelFile) {
        const mf = new FormData();
        mf.append('model', modelFile);
        const mr = await fetch(`/api/terrain/library/${row.id}/model`, { method: 'POST', body: mf });
        // A failed model upload still leaves a usable piece — the sprite is
        // saved and the model can be attached later from Edit — so this
        // reports rather than rolls back.
        if (mr.ok) row = await mr.json();
        else window.alert('The piece was saved, but its 3D model could not be uploaded.');
      }
      onSaved(row);
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[28rem] shadow-2xl space-y-3">
        <div className="text-lg font-semibold text-gray-100">New Terrain Piece</div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Name</div>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Crumbling Pillar"
            maxLength={120}
            className="w-full px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-100 focus:border-cyan-500 outline-none"
          />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Image (PNG / JPG / SVG / WebP / GIF)</div>
          <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp,.gif" onChange={handleFileChange} className="text-xs text-gray-300" />
        </div>
        {/* The mesh is optional and additive. The image above is what the flat
            board draws either way; this is what replaces it in the 3D view. */}
        <div>
          <div className="text-xs text-gray-400 mb-1">3D model (optional — .glb)</div>
          <input
            type="file"
            accept=".glb,.gltf"
            onChange={(e) => setModelFile(e.target.files?.[0] || null)}
            className="text-xs text-gray-300"
          />
          <p className="text-[11px] text-gray-500 leading-snug mt-1">
            Export from Blender with <em>File → Export → glTF 2.0 (.glb)</em>. Use
            .glb, not .gltf: it packs the materials and textures into the one file,
            where a .gltf leaves them in separate files that don't come along.
            The model is scaled to fit the piece's grid footprint when it's placed.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-300">Default width
            <input type="number" min="0.25" step="0.25" value={defaultW} onChange={(e) => setDefaultW(Number(e.target.value) || 1)} className="mt-0.5 w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-100"/>
          </label>
          <label className="text-xs text-gray-300">Default height
            <input type="number" min="0.25" step="0.25" value={defaultH} onChange={(e) => setDefaultH(Number(e.target.value) || 1)} className="mt-0.5 w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-100"/>
          </label>
        </div>
        <div className="space-y-1.5 pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-200"><input type="checkbox" checked={hideUntilRevealed} onChange={(e) => setHideUntilRevealed(e.target.checked)} /> Hidden from players by default (GM reveals later)</label>
          <label className="flex items-center gap-2 text-xs text-gray-200"><input type="checkbox" checked={isMarker} onChange={(e) => setIsMarker(e.target.checked)} /> Map marker (ship, settlement, point of interest)</label>
          {isMarker && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500 leading-snug">
                Markers draw as a circle with their name under it, and can be hidden or
                shown at any time. No health bar — they aren't creatures.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!file}
                  onClick={() => setShowFramer(true)}
                  className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-200 hover:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >{framedBlob ? 'Adjust framing' : 'Frame artwork'}</button>
                {framedBlob
                  ? <span className="text-[11px] text-cyan-300">framed ✓</span>
                  : <span className="text-[11px] text-gray-500">optional — centres the art if skipped</span>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-500 leading-snug">
            Walls are drawn manually after upload — open the piece's <em>Edit</em> from the library to paint blocking polygons over the artwork.
          </p>
        </div>
        {showFramer && file && (
          <ImageFramer
            src={URL.createObjectURL(file)}
            title="Frame marker art"
            onCancel={() => setShowFramer(false)}
            onConfirm={(blob) => { setFramedBlob(blob); setShowFramer(false); }}
          />
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !file || !name.trim()}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white"
          >{busy ? 'Uploading…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// Edit modal — same fields as Upload minus the file input. PATCHes
// the library row in place; placed instances pick up the new flags
// next time the broadcast goes out (delete + re-place locks in any
// new wall config in the meantime).
function TerrainEditModal({ piece, onCancel, onSaved }) {
  const [name, setName] = useState(piece.name);
  const [defaultW, setDefaultW] = useState(piece.default_w);
  const [defaultH, setDefaultH] = useState(piece.default_h);
  const [hideUntilRevealed, setHideUntilRevealed] = useState(!!piece.hide_until_revealed);
  const [isMarker, setIsMarker] = useState(!!piece.is_marker);
  // How this piece is drawn in 3D. Flat is the default and right for most
  // scenery; a rock or a world is a solid rather than a picture on the floor.
  const [shape3D, setShape3D] = useState(piece.three_d_shape || 'flat');
  // The attached Blender mesh, and the multiplier on top of its auto-fit. Both
  // live on the LIBRARY entry, so every placement of the piece gets them.
  const [cloudForm, setCloudForm] = useState(piece.cloud_form || 'bank');
  // Which variation of a shape that HAS variations — a tentacle's pose. Blank
  // for every shape that doesn't; see piece_form in the schema.
  const [pieceForm, setPieceForm] = useState(piece.piece_form || '');
  const [modelPath, setModelPath] = useState(piece.model_path || null);
  const [modelScale, setModelScale] = useState(Number(piece.model_scale) > 0 ? Number(piece.model_scale) : 1);
  const [modelBusy, setModelBusy] = useState(false);
  const [showFramer, setShowFramer] = useState(false);
  const [art, setArt] = useState(piece.image_path);
  // Re-frame from the UNFRAMED original when there is one, so repeated passes
  // always crop the picture rather than compounding on the last crop.
  const framerSrc = `/uploads/${piece.source_image_path || piece.image_path}`;
  async function reframe(blob) {
    setShowFramer(false);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', blob, 'marker.png');
      const r = await fetch(`/api/terrain/library/${piece.id}/image`, { method: 'POST', body: fd });
      if (r.ok) {
        const row = await r.json();
        // Cache-bust: a replaced file can keep its URL shape, and the browser
        // would otherwise redraw the old crop.
        setArt(`${row.image_path}?v=${Date.now()}`);
      }
    } finally { setBusy(false); }
  }
  const [customWalls, setCustomWalls] = useState(
    Array.isArray(piece.custom_walls) ? piece.custom_walls : []
  );
  const [showWallEditor, setShowWallEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const r = await fetch(`/api/terrain/library/${piece.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || piece.name,
          default_w: Number(defaultW) || 1,
          default_h: Number(defaultH) || 1,
          hide_until_revealed: hideUntilRevealed,
          is_marker: isMarker,
          three_d_shape: shape3D,
          cloud_form: cloudForm,
          piece_form: pieceForm,
          model_scale: Number(modelScale) > 0 ? Number(modelScale) : 1,
          custom_walls: customWalls.length ? customWalls : null,
        }),
      });
      if (r.ok) onSaved(await r.json());
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[28rem] shadow-2xl space-y-3">
        <div className="text-lg font-semibold text-gray-100">Edit “{piece.name}”</div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Name</div>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-100 focus:border-cyan-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-300">Default width
            <input type="number" min="0.25" step="0.25" value={defaultW} onChange={(e) => setDefaultW(Number(e.target.value) || 1)} className="mt-0.5 w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-100"/>
          </label>
          <label className="text-xs text-gray-300">Default height
            <input type="number" min="0.25" step="0.25" value={defaultH} onChange={(e) => setDefaultH(Number(e.target.value) || 1)} className="mt-0.5 w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-100"/>
          </label>
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs text-gray-200"><input type="checkbox" checked={hideUntilRevealed} onChange={(e) => setHideUntilRevealed(e.target.checked)} /> Hidden until revealed</label>
          <label className="flex items-center gap-2 text-xs text-gray-200"><input type="checkbox" checked={isMarker} onChange={(e) => setIsMarker(e.target.checked)} /> Map marker (ship, settlement, point of interest)</label>
          {/* Shape in the 3D view. The flat map is unaffected either way — this
              only decides whether the 3D view stands the piece up as a solid or
              leaves it lying on the board. */}
          <div className="flex items-center gap-2 text-xs text-gray-200">
            <span className="shrink-0">In 3D</span>
            <select
              value={shape3D}
              onChange={(e) => setShape3D(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs flex-1"
            >
              <option value="flat">Flat on the board</option>
              <option value="rock">Solid rock / asteroid</option>
              <option value="sphere">Sphere / world</option>
              <option value="model">Imported 3D model</option>
              <option value="cloud">Obscuring cloud</option>
              <option value="gate">Wildspace gate / portal ring</option>
              <optgroup label="Growth">
                <option value="vine">Crystal vine</option>
                <option value="tentacle">Alien tentacle</option>
              </optgroup>
              <optgroup label="Hazards">
                <option value="blackhole">Black hole</option>
                <option value="wormhole">Wormhole</option>
                <option value="ionstorm">Ion storm</option>
                <option value="debris">Debris field</option>
              </optgroup>
            </select>
          </div>
          {shape3D === 'vine' && (
            <p className="text-[10px] text-gray-500 leading-snug">
              Grown in 3D as a coiling crystal stalk — tall for its footprint,
              so the piece's grid size sets how big the plant is. Every
              placement grows differently. The flat map shows the image above.
            </p>
          )}
          {['blackhole', 'wormhole', 'ionstorm', 'debris'].includes(shape3D) && (
            <p className="text-[10px] text-gray-500 leading-snug">
              Built and animated in 3D — the flat map shows the image above.
              Set the pace per placement with <em>Animation</em> in the
              right-click menu; hazards are mostly motion, so stopping one makes
              it read as scenery.
            </p>
          )}
          {shape3D === 'gate' && (
            <p className="text-[10px] text-gray-500 leading-snug">
              Stands upright as a ring with a shimmering surface, resting on the
              board — give the placement a <em>Height</em> to float it clear.
              Turning the piece on the flat map aims the ring.
            </p>
          )}
          {(shape3D === 'rock' || shape3D === 'sphere') && (
            <p className="text-[10px] text-gray-500 leading-snug">
              The 3D solid gets a generated surface in this art's own colours —
              the picture itself isn't wrapped round it, because its painted-in
              shadows and cut-out background would come with it. The flat map
              still shows your art exactly as it is.
            </p>
          )}
          {shape3D === 'tentacle' && (
            <>
              {/* Which pose the limbs take. Like the cloud forms below, the
                  shipped tentacles each ship with overhead art drawn to match,
                  so changing this on one of them leaves the flat map showing a
                  silhouette the 3D view no longer grows. */}
              <div className="flex items-center gap-2 text-xs text-gray-200">
                <span className="shrink-0">Pose</span>
                <select
                  value={pieceForm || 'rearing'}
                  onChange={(e) => setPieceForm(e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs flex-1"
                >
                  <option value="rearing">Rearing — one heavy arm, hooked over</option>
                  <option value="coiled">Coiled — wound around its own breach</option>
                  <option value="nest">Nest — several arms, one hole</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-500 leading-snug">
                Grown and writhing in 3D, sized off the piece's grid footprint.
                Every placement moves on its own clock — pace it with
                <em> Animation</em> in the right-click menu. The flat map shows
                the image above.
              </p>
            </>
          )}
          {shape3D === 'cloud' && (
            <>
              {/* Which volume the 3D view builds. The shipped clouds each come
                  with art drawn to match their form, so changing this on one of
                  them will leave the flat map showing the old silhouette. */}
              <div className="flex items-center gap-2 text-xs text-gray-200">
                <span className="shrink-0">Cloud form</span>
                <select
                  value={cloudForm}
                  onChange={(e) => setCloudForm(e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs flex-1"
                >
                  <option value="bank">Bank — wide, slightly domed</option>
                  <option value="ground">Ground fog — low haze on the board</option>
                  <option value="column">Column — tall pillar</option>
                  <option value="wisps">Wisps — torn shreds with gaps</option>
                  <option value="ring">Ring — open middle</option>
                  <option value="wall">Wall — slab across the footprint</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-500 leading-snug">
                Drawn as a translucent mass you can see into. It never takes a
                click and never hides what's behind it in 3D — to make it actually
                block sight, paint blocking polygons under <em>Walls</em> below.
                The image above is what the flat map draws, so pick a form that
                matches it.
              </p>
            </>
          )}
          {/* ── Imported mesh ─────────────────────────────────────────────
              Additive, not a replacement: the flat board keeps drawing the
              sprite above, and this is only what the 3D view stands up. */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-200 font-semibold">3D model</span>
              {modelPath
                ? <span className="text-[11px] text-cyan-300 truncate max-w-[11rem]">{modelPath.split('/').pop()}</span>
                : <span className="text-[11px] text-gray-500">none</span>}
            </div>
            <div className="flex items-center gap-2">
              <label className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-200 hover:border-cyan-500 cursor-pointer">
                {modelPath ? 'Replace…' : 'Upload .glb…'}
                <input
                  type="file"
                  accept=".glb,.gltf"
                  className="hidden"
                  disabled={modelBusy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    setModelBusy(true);
                    try {
                      const fd = new FormData();
                      fd.append('model', f);
                      const r = await fetch(`/api/terrain/library/${piece.id}/model`, { method: 'POST', body: fd });
                      if (!r.ok) { window.alert('That model could not be uploaded. Use a .glb, or a .gltf with everything embedded.'); return; }
                      const row = await r.json();
                      setModelPath(row.model_path || null);
                      // The server flips a 'flat' piece to 'model' on upload;
                      // mirror that here so the dropdown doesn't disagree with
                      // what was just saved.
                      setShape3D(row.three_d_shape || shape3D);
                    } finally { setModelBusy(false); }
                  }}
                />
              </label>
              {modelPath && (
                <button
                  type="button"
                  disabled={modelBusy}
                  onClick={async () => {
                    setModelBusy(true);
                    try {
                      const r = await fetch(`/api/terrain/library/${piece.id}/model`, { method: 'DELETE' });
                      if (r.ok) {
                        const row = await r.json();
                        setModelPath(null);
                        setShape3D(row.three_d_shape || 'flat');
                      }
                    } finally { setModelBusy(false); }
                  }}
                  className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-red-400 hover:border-red-500"
                >Remove</button>
              )}
              {modelBusy && <span className="text-[11px] text-gray-400">working…</span>}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <span className="shrink-0">Fit scale</span>
              <input
                type="number" min="0.05" step="0.05" value={modelScale}
                onChange={(e) => setModelScale(Number(e.target.value) || 1)}
                className="w-20 px-2 py-0.5 rounded bg-gray-900 border border-gray-700 text-gray-100 text-xs text-right"
              />
              <span className="text-[10px] text-gray-500">×</span>
            </label>
            <p className="text-[11px] text-gray-500 leading-snug">
              The model is scaled to fit each placement's grid footprint. Nudge
              this if your export has empty space around it, or a glow shell that
              shouldn't count towards the fit. Model and image are independent:
              the flat map always draws the image.
            </p>
          </div>
          {/* The 2D artwork. Separate from the 3D model above and always
              editable: the flat board draws this whatever the 3D view does
              with the piece, so a GM who imports a Blender world still needs
              to say what it looks like from overhead. */}
          <div className="flex items-center gap-2">
            <div className={`w-12 h-12 overflow-hidden border border-gray-700 bg-gray-800 shrink-0 ${isMarker ? 'rounded-full' : 'rounded'}`}>
              <img src={`/uploads/${art}`} alt="" className="w-full h-full object-cover" />
            </div>
            <label className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-200 hover:border-cyan-500 cursor-pointer">
              Replace image…
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp,.gif"
                className="hidden"
                disabled={busy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append('image', f);
                    // Sent as the source too, so re-framing later crops the new
                    // picture rather than the one it replaced.
                    fd.append('source_image', f);
                    const r = await fetch(`/api/terrain/library/${piece.id}/image`, { method: 'POST', body: fd });
                    if (!r.ok) { window.alert('That image could not be uploaded.'); return; }
                    const row = await r.json();
                    // Cache-bust: a replaced file can keep its URL shape, and
                    // the browser would otherwise keep drawing the old art.
                    setArt(`${row.image_path}?v=${Date.now()}`);
                  } finally { setBusy(false); }
                }}
              />
            </label>
            {isMarker && (
              <button
                type="button"
                onClick={() => setShowFramer(true)}
                className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-200 hover:border-cyan-500"
              >Adjust framing</button>
            )}
            <span className="text-[11px] text-gray-500">{isMarker ? 'how the disc is cropped on the map' : 'drawn on the flat board'}</span>
          </div>
          {showFramer && (
            <ImageFramer
              src={framerSrc}
              title="Frame marker art"
              onCancel={() => setShowFramer(false)}
              onConfirm={reframe}
            />
          )}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-200 font-semibold">Walls</span>
            <span className="text-[11px] text-gray-500">{customWalls.length} polygon{customWalls.length === 1 ? '' : 's'}</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Manually paint blocking polygons over the artwork. Stored relative to the piece's bbox so they scale with width/height. Delete a piece's walls by editing them and saving with none.
          </p>
          <button
            type="button"
            onClick={() => setShowWallEditor(true)}
            className="w-full px-3 py-1.5 text-xs rounded bg-cyan-700 hover:bg-cyan-600 text-white"
          >Edit walls…</button>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">Cancel</button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white"
          >{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      {showWallEditor && (
        <TerrainWallEditor
          piece={piece}
          initialWalls={customWalls}
          onCancel={() => setShowWallEditor(false)}
          onSave={(walls) => { setCustomWalls(walls); setShowWallEditor(false); }}
        />
      )}
    </div>
  );
}

// Wall-painter modal. The GM clicks vertices over the artwork to draw
// blocking polygons; coordinates are normalised to the piece's bbox so
// the walls scale with width/height when placed.
function TerrainWallEditor({ piece, initialWalls, onCancel, onSave }) {
  const [polygons, setPolygons] = useState(() =>
    (Array.isArray(initialWalls) ? initialWalls : [])
      .map((p) => Array.isArray(p) ? p.map((v) => ({ col: Number(v.col) || 0, row: Number(v.row) || 0 })) : [])
      .filter((p) => p.length >= 2)
  );
  const [draft, setDraft] = useState([]);          // current in-progress polygon
  const [cursor, setCursor] = useState(null);      // { x, y } in 0-1 space
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  // Canvas display size — fit the image into a 480×480 box, preserving
  // aspect. Vertex coords are computed in 0-1 normalised space so the
  // panel is resolution-independent.
  const MAX = 480;
  const aspect = imgSize.w / imgSize.h || 1;
  const W = aspect >= 1 ? MAX : MAX * aspect;
  const H = aspect >= 1 ? MAX / aspect : MAX;
  function onImgLoad(e) {
    setImgSize({ w: e.target.naturalWidth || 1, h: e.target.naturalHeight || 1 });
  }
  function onCanvasClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraft((prev) => [...prev, { col: x, row: y }]);
  }
  function onCanvasMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursor({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Enter') {
        if (draft.length >= 3) {
          setPolygons((prev) => [...prev, draft]);
          setDraft([]);
        }
      } else if (e.key === 'Escape') {
        if (draft.length) setDraft([]);
        else onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, onCancel]);
  // SVG points strings — normalised → display pixel coords.
  function ptsStr(poly) {
    return poly.map((p) => `${p.col * W},${p.row * H}`).join(' ');
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 shadow-2xl space-y-3" style={{ minWidth: W + 64 }}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-100">Edit walls — {piece.name}</div>
          <span className="text-[11px] text-gray-400">
            Click to add vertex · <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Enter</kbd> finish polygon · <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Esc</kbd> cancel
          </span>
        </div>
        <div className="relative inline-block bg-gray-800 border border-gray-700 mx-auto" style={{ width: W, height: H }}>
          <img
            src={`/uploads/${piece.image_path}`}
            alt={piece.name}
            onLoad={onImgLoad}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onClick={onCanvasClick}
            onMouseMove={onCanvasMove}
            onMouseLeave={() => setCursor(null)}
          >
            {/* finalised polygons */}
            {polygons.map((poly, i) => (
              <polygon
                key={i}
                points={ptsStr(poly)}
                fill="rgba(6,182,212,0.25)"
                stroke="#06b6d4"
                strokeWidth={2}
              />
            ))}
            {/* in-progress polygon */}
            {draft.length > 0 && (
              <>
                <polyline
                  points={[
                    ...draft.map((p) => `${p.col * W},${p.row * H}`),
                    cursor ? `${cursor.x * W},${cursor.y * H}` : '',
                  ].filter(Boolean).join(' ')}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                {draft.map((p, i) => (
                  <circle key={i} cx={p.col * W} cy={p.row * H} r={4} fill="#06b6d4" />
                ))}
              </>
            )}
          </svg>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-400">
            {polygons.length} polygon{polygons.length === 1 ? '' : 's'}{draft.length ? ` · ${draft.length}-vertex draft` : ''}
          </div>
          <div className="flex gap-2">
            {polygons.length > 0 && (
              <button
                onClick={() => setPolygons([])}
                className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
              >Clear all</button>
            )}
            {polygons.length > 0 && (
              <button
                onClick={() => setPolygons((prev) => prev.slice(0, -1))}
                className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
              >Undo last</button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">Cancel</button>
          <button
            onClick={() => onSave(polygons)}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
          >Save walls</button>
        </div>
      </div>
    </div>
  );
}

export default function DMView() {
  // Subscribe DMView itself to registry bumps so plugin-registered
  // toolbar buttons (and any other extension point we wire into the
  // host UI) re-render when plugins enable/disable.
  useRegistryVersion();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || '';
  const pass = searchParams.get('pass') || '';

  const [session, setSession] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [maps, setMaps] = useState([]);
  // The map the GM was on before stepping into the lobby, so they can go back.
  const [preLobbyMapId, setPreLobbyMapId] = useState(null);
  // The door menu the 3D view asks for. The flat map keeps its own inside
  // MapStage; in 3D the board is a sibling of this component, so the menu has
  // to be rendered out here.
  const [door3DMenu, setDoor3DMenu] = useState(null); // { doorId, x, y }

  // ── Tile maps ────────────────────────────────────────────────────────────
  // `tiles` is the dungeon so far; `pendingTile` is the card turned and not
  // yet laid, which arms the next map click as a placement.
  const [tiles, setTiles] = useState([]);
  const [pendingTile, setPendingTile] = useState(null);
  const [tileRotation, setTileRotation] = useState(0);
  // Where the turned card is sitting before it is committed. Local to this
  // GM: nothing has been sent, so the players' boards show nothing until
  // 'Lay it down'.
  const [stagedTile, setStagedTile] = useState(null);  // { col, row } | null
  const [tileMenu, setTileMenu] = useState(null);      // { tileId, x, y } | null
  const [tileDeck, setTileDeck] = useState(null);      // the deck in play
  const [tileCounts, setTileCounts] = useState({ draw: 0, pending: 0, discard: 0 });
  // Default map newly-spawned player tokens land on. Stored in
  // sessions.spawn_map_id; null means "use the session's current map_id"
  // (legacy behaviour). Set via the picker in the Map tab and surfaced
  // through window.__tabletopForge.dm so the split-the-party plugin can
  // read it without scraping React state.
  const [spawnMapId, setSpawnMapId] = useState(null);
  const [diceRolls, setDiceRolls] = useState([]);
  // Session roll history + the freehand ink on the current map. Both arrive in
  // the join payload and are kept live by their own socket events.
  const [rollLog, setRollLog] = useState([]);
  const [rollLogOpen, setRollLogOpen] = useState(false);
  const [drawings, setDrawings] = useState([]);
  // Saved board states for this session — where every token stood, its HP and
  // combat state — so a map can be put back exactly as the party left it.
  const [show3D, setShow3D] = useState(false);
  const [sneakMode, setSneakMode] = useState(false);
  const [sneakRoundAt, setSneakRoundAt] = useState(null);
  // Shops. `shopList` is the names for the picker; `shop` is the one open in
  // the panel, with its stock; `shopOffers` is what the party has proposed.
  const [shopList, setShopList] = useState([]);
  const [shop, setShop] = useState(null);
  const [shopOffers, setShopOffers] = useState([]);
  const [mapStates, setMapStates] = useState([]);
  const [mapStateBusy, setMapStateBusy] = useState(false);
  const [mapStateMsg, setMapStateMsg] = useState('');
  const [myInkColor, setMyInkColor] = useState('#ef4444');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [appVersion, setAppVersion] = useState(null);
  // Discovery info — what the server thinks its `.local` host
  // names are. mdnsName is the one the backend itself broadcasts
  // (`tabletopforge.local`); mdnsHost is the host machine's own
  // hostname (`<computer>.local`) which Mac/Windows users get via
  // their OS even when the container's mDNS can't escape the VM.
  // Surfaced in the Player Join Link block as a `.local` fallback
  // alongside the IP-based URL.
  const [mdnsInfo, setMdnsInfo] = useState({ mdnsName: null, mdnsHost: null });
  // Lightweight one-shot fetch — version doesn't change without a
  // server restart so we don't need to re-poll. Failure is silent so
  // the Session Info section just hides the version row.
  useEffect(() => {
    fetch('/api/version').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      if (d.version) setAppVersion(d.version);
      setMdnsInfo({ mdnsName: d.mdnsName || null, mdnsHost: d.mdnsHost || null });
    }).catch(() => {});
  }, []);

  // `reconnectAttempt` is bumped by socket.io's reconnect_attempt event;
  // 0 means "no reconnect in progress". Drives the dropped-connection
  // banner so the user knows the network blip is being recovered
  // automatically rather than wondering why the UI just sat there.
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [panelTab, setPanelTab] = useState('map');
  const [panelOpen, setPanelOpen] = useState(true);
  const [tokenNameFontSize, setTokenNameFontSize] = useState(45);
  function handleTokenNameFontSizeChange(v) {
    const clamped = Math.max(10, Math.min(100, Math.round(v)));
    setTokenNameFontSize(clamped);
    if (session?.id) {
      socket.emit('change_token_name_font_size', { sessionId: session.id, tokenNameFontSize: clamped });
    }
  }
  const [panelTabs, setPanelTabs] = useState(() => {
    // Always parks 'session' at the rightmost position. The GM can
    // still drag it elsewhere; this is just the default — including
    // when a stored order from before a new tab was added pushed
    // session out of the last slot.
    function pinSessionLast(arr) {
      const out = arr.filter((t) => t !== 'session');
      if (arr.includes('session')) out.push('session');
      return out;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(PANEL_TAB_ORDER_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) {
        // Keep only known tabs and append any missing ones (e.g. after upgrade
        // adds a new built-in tab) so the bar stays complete.
        const known = stored.filter((t) => DEFAULT_PANEL_TABS.includes(t));
        for (const t of DEFAULT_PANEL_TABS) if (!known.includes(t)) known.push(t);
        return pinSessionLast(known);
      }
    } catch {}
    return pinSessionLast([...DEFAULT_PANEL_TABS]);
  });
  function reorderPanelTab(fromId, toId) {
    setPanelTabs((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(fromId);
      const toIdx = arr.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      const insertAt = arr.indexOf(toId);
      arr.splice(insertAt, 0, fromId);
      try { localStorage.setItem(PANEL_TAB_ORDER_KEY, JSON.stringify(arr)); } catch {}
      return arr;
    });
  }
  const [selectedToken, setSelectedToken] = useState(null);
  // Right-click-on-token context menu. `null` when closed, otherwise
  // { tokenId, x, y } where x/y are viewport coords from the
  // contextmenu event so the popup can position itself with `fixed`.
  const [tokenContextMenu, setTokenContextMenu] = useState(null);
  const [tokenListCollapsed, setTokenListCollapsed] = useState(false);
  const [tokenOrder, setTokenOrder] = useState([]); // array of token ids — manual order for non-player tokens
  const [handoutTitle, setHandoutTitle] = useState('');
  const [handoutBody, setHandoutBody] = useState('');
  const [handoutImageUrl, setHandoutImageUrl] = useState('');
  const sortedTokens = useMemo(() => {
    // Player tokens always first (by name), then non-player in manual order
    // (tokens not yet in tokenOrder are appended to the end by id).
    const players = tokens.filter(t => t.is_player).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const others = tokens.filter(t => !t.is_player);
    const orderIdx = new Map(tokenOrder.map((id, i) => [id, i]));
    const ordered = [...others].sort((a, b) => {
      const ai = orderIdx.has(a.id) ? orderIdx.get(a.id) : Infinity;
      const bi = orderIdx.has(b.id) ? orderIdx.get(b.id) : Infinity;
      if (ai !== bi) return ai - bi;
      return a.id - b.id;
    });
    return [...players, ...ordered];
  }, [tokens, tokenOrder]);

  function reorderToken(fromId, toId) {
    setTokenOrder(prev => {
      // Start from the current computed order for non-players, then move.
      const others = tokens.filter(t => !t.is_player).map(t => t.id);
      const orderIdx = new Map(prev.map((id, i) => [id, i]));
      const sorted = [...others].sort((a, b) => {
        const ai = orderIdx.has(a) ? orderIdx.get(a) : Infinity;
        const bi = orderIdx.has(b) ? orderIdx.get(b) : Infinity;
        if (ai !== bi) return ai - bi;
        return a - b;
      });
      const from = sorted.indexOf(fromId);
      const to = sorted.indexOf(toId);
      if (from === -1 || to === -1) return prev;
      sorted.splice(to, 0, sorted.splice(from, 1)[0]);
      return sorted;
    });
  }
  // Auto-scroll the token list so the selected row is visible when a token is
  // picked on the map.
  useEffect(() => {
    if (!selectedToken) return;
    if (panelTab !== 'tokens' || !panelOpen) return;
    const el = document.querySelector(`[data-token-row-id="${selectedToken}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedToken, panelTab, panelOpen]);

  // Plugin runtime — load enabled plugins once we have a session connection.
  // Errors per plugin are isolated by the loader; we just stash a summary
  // for the manager UI. Re-runs only when the session id changes (typically
  // means the GM logged into a different session).
  const [pluginLoadErrors, setPluginLoadErrors] = useState([]);
  const [pluginsTick, setPluginsTick] = useState(0); // increment to force re-list in manager
  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    (async () => {
      const { errors } = await loadPlugins({
        // setPanelTab is forwarded so plugins can switch tabs from
        // their UI (e.g. a tab-visibility manager that needs to "open"
        // a currently-hidden tab). Hidden tabs still render their
        // body, so this works seamlessly with panelTabHidden.
        context: { sessionId: session.id, role: 'dm', socket, setPanelTab },
      });
      if (!cancelled) setPluginLoadErrors(errors || []);
    })();
    return () => { cancelled = true; };
  }, [session?.id]);
  const [showDice, setShowDice] = useState(false);
  const [showSounds, setShowSounds] = useState(false);
  const [soundTab, setSoundTab] = useState('oneshots');
  const [soundFiles, setSoundFiles] = useState([]);
  const [soundVolume, setSoundVolume] = useState(1.0);
  const [ambientFiles, setAmbientFiles] = useState([]);
  // Server-mirrored snapshot of which ambient tracks are layered on
  // which map across the whole session. Keyed by mapId →
  // Array<{ filename, volume }>. Multiple tracks coexist per map so
  // the GM can build scenes by stacking loops (Forest + Bird Song +
  // Wind Blowing). The GM panel reads from this to render running
  // tracks + per-track volume sliders even for maps the GM isn't
  // currently viewing.
  const [runningAmbients, setRunningAmbients] = useState({});
  // Default starting volume for newly-added tracks. After a track is
  // playing, its own per-track slider in the Currently Playing list
  // takes over — this is just the initial level for the next "+ play".
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [soundUploading, setSoundUploading] = useState(false);
  const [uploadMainType, setUploadMainType] = useState('oneshot');
  const [uploadSubcat, setUploadSubcat] = useState('combat');
  const [uploadCustomName, setUploadCustomName] = useState('');
  const [treasureList, setTreasureList] = useState([]);
  // Exporting the session as one file (Session tab → Take This Session Away).
  const [packPassword, setPackPassword] = useState('');
  const [packBusy, setPackBusy] = useState(false);
  const [packMsg, setPackMsg] = useState('');
  // Patrols. `patrolDraft` is a route being laid down: { tokenId, name, points }.
  // Held here rather than in the map so the waypoints survive a re-render of the
  // stage, and so the finishing dialogue can read them.
  const [patrolDraft, setPatrolDraft] = useState(null);
  const [patrols, setPatrols] = useState({});          // tokenId -> patrol row
  const [patrolsPaused, setPatrolsPaused] = useState(false);
  const [patrolSetup, setPatrolSetup] = useState(null); // { tokenId, points } while choosing speed

  // What the map draws: the saved routes for tokens on the current map, plus the
  // one being laid down. Only this map's, or a route on another floor would hang
  // in mid-air over the one being looked at.
  const patrolRoutes = useMemo(() => {
    const out = [];
    for (const p of Object.values(patrols)) {
      const tok = tokens.find((t) => t.id === p.token_id);
      if (!tok || tok.map_id !== session?.map_id) continue;
      out.push({ tokenId: p.token_id, points: p.waypoints || [], active: !!p.active, draft: false });
    }
    if (patrolDraft) out.push({ tokenId: patrolDraft.tokenId, points: patrolDraft.points, active: true, draft: true });
    return out;
  }, [patrols, patrolDraft, tokens, session?.map_id]);

  // Routes on THIS board. The pause button pauses this map and reports on this
  // map, so what it counts has to be this map too — a "3 routes" badge that
  // included two guards on a different floor was telling the GM about patrols
  // their button would not touch.
  const patrolsHere = useMemo(
    () => Object.values(patrols).filter((p) => {
      if (!p.active) return false;
      const tok = tokens.find((t) => t.id === p.token_id);
      return tok && tok.map_id === session?.map_id;
    }).length,
    [patrols, tokens, session?.map_id],
  );
  // Bringing a pack back IN — the return leg, after a holiday spent on the laptop.
  const [inPassword, setInPassword] = useState('');
  const [inConfirm, setInConfirm] = useState('');
  const [inFile, setInFile] = useState(null);
  const [inBusy, setInBusy] = useState(false);
  const [inResult, setInResult] = useState(null);
  const [inError, setInError] = useState('');
  const [sendingItemId, setSendingItemId] = useState(null);
  // How many of a stack the GM is handing over, keyed by chest item id.
  // Absent means "all of it", which is what sending did before there was a
  // choice and is still the common case.
  const [sendQty, setSendQty] = useState({});
  const [treasureSearch, setTreasureSearch] = useState('');
  // Pulling loot straight from the item library rather than typing it out.
  // The library is the SRD import — 1,588 rows of gear, weapons, armour and
  // magic items — and it already carries the damage, properties, attunement
  // and weight a treasure entry wants, so a picked row arrives complete.
  const [showTreasurePicker, setShowTreasurePicker] = useState(false);
  const [tpSearch, setTpSearch] = useState('');
  const [tpType, setTpType] = useState('');
  const [tpRarity, setTpRarity] = useState('');
  const [tpEdition, setTpEdition] = useState('');
  const [tpRows, setTpRows] = useState([]);
  const [tpLoading, setTpLoading] = useState(false);
  const [tpPicked, setTpPicked] = useState(() => new Map()); // id -> qty
  const [treasureCollapsedGroups, setTreasureCollapsedGroups] = useState(() => new Set());
  // Which session's chest is currently loaded. Kept in state rather than
  // a ref so the save effect below can't fire before the restore has
  // actually landed — a ref would already read as "hydrated" during the
  // same commit and write the initial [] over the stored chest.
  const [treasureHydratedFor, setTreasureHydratedFor] = useState(null);
  // THE CHEST COMES FROM THE SESSION NOW, not from this browser.
  //
  // It used to live in localStorage, which made it invisible to any other
  // screen the GM had open — the tablet could not hand out loot the laptop had
  // collected. The server holds it; what is left here is a ONE-TIME migration
  // of whatever this browser was already carrying, so a chest filled before
  // this change is not thrown away.
  useEffect(() => {
    const sid = session?.id;
    if (sid == null || treasureHydratedFor === sid) return;
    const fromServer = Array.isArray(session?.treasure_chest) ? session.treasure_chest : [];
    let local = [];
    try {
      const raw = localStorage.getItem(`${TREASURE_CHEST_KEY}:${sid}`);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) local = parsed;
    } catch { /* nothing stored, or private mode */ }

    if (fromServer.length === 0 && local.length > 0) {
      // Carry the old chest up, once, then stop reading the local copy.
      setTreasureList(local);
      socket.emit('set_treasure_chest', { sessionId: sid, items: local });
      try { localStorage.removeItem(`${TREASURE_CHEST_KEY}:${sid}`); } catch { /* fine */ }
    } else {
      setTreasureList(fromServer);
    }
    setTreasureHydratedFor(sid);
  }, [session?.id, session?.treasure_chest, treasureHydratedFor]);

  // Write-through, debounced: the chest is edited field by field and a save per
  // keystroke would be a request per keystroke.
  useEffect(() => {
    const sid = session?.id;
    if (sid == null || treasureHydratedFor !== sid) return undefined;
    const t = setTimeout(() => {
      socket.emit('set_treasure_chest', { sessionId: sid, items: treasureList });
    }, 600);
    return () => clearTimeout(t);
  }, [treasureList, treasureHydratedFor, session?.id]);
  // Library search for the treasure picker. Debounced because the search box
  // fires per keystroke and the endpoint does a LIKE across 1,588 rows; the
  // filters are applied server-side, which is what keeps the payload small.
  useEffect(() => {
    if (!showTreasurePicker) return;
    let cancelled = false;
    setTpLoading(true);
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ role: 'dm' });
        if (tpSearch.trim()) qs.set('search', tpSearch.trim());
        if (tpType) qs.set('type', tpType);
        if (tpRarity) qs.set('rarity', tpRarity);
        if (tpEdition) qs.set('edition', tpEdition);
        const res = await fetch(`/api/item-library?${qs}`);
        const data = await res.json();
        if (!cancelled) setTpRows(Array.isArray(data) ? data : (data.items || []));
      } catch {
        if (!cancelled) setTpRows([]);
      } finally {
        if (!cancelled) setTpLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [showTreasurePicker, tpSearch, tpType, tpRarity, tpEdition]);

  // ── Plugin bridge for the treasure chest ─────────────────────────────
  // The treasure chest is purely GM-side ephemeral state — there's no
  // backend table for it, so plugins (e.g. Content Exporter) can't reach
  // it through the usual /api/* endpoints. Expose a tiny, namespaced
  // accessor on `window` so GM-side plugins can read the current items
  // and push new ones onto the list. We refresh the list on every
  // setTreasureList call via an effect — keeps the accessor's snapshot
  // in lockstep with React state without re-rendering anything else.
  // Available only in the GM browser; on the player view this object is
  // undefined and plugins should noop.
  const treasureListRef = useRef(treasureList);
  useEffect(() => { treasureListRef.current = treasureList; }, [treasureList]);
  const treasureSubsRef = useRef(new Set());
  useEffect(() => {
    for (const fn of treasureSubsRef.current) {
      try { fn(treasureList); } catch {}
    }
  }, [treasureList]);
  useEffect(() => {
    const ns = (window.__tabletopForge = window.__tabletopForge || {});
    ns.treasure = {
      // Snapshot of the current chest. Returns a shallow clone so callers
      // can't mutate React state in-place.
      getList: () => treasureListRef.current.map(it => ({ ...it })),
      // Subscribe to chest changes — handler is called with the full new
      // list each time it changes. Returns an unsubscribe fn.
      subscribe: (fn) => {
        treasureSubsRef.current.add(fn);
        return () => treasureSubsRef.current.delete(fn);
      },
      // Append items to the chest. Each gets a fresh client-side id so
      // it doesn't collide with anything already in the list. Items
      // missing required defaults are filled in (qty defaults to 1, etc.)
      // so a Content Pack importing third-party items can't break the
      // host UI by sending mis-shaped rows.
      addItems: (items) => {
        if (!Array.isArray(items) || items.length === 0) return 0;
        const cleaned = items.map((raw) => ({
          id: Date.now() + Math.random(),
          item_type: raw.item_type || 'item',
          name: String(raw.name || '').trim() || 'Unnamed item',
          qty: Math.max(1, parseInt(raw.qty, 10) || 1),
          weight: raw.weight || '',
          desc: raw.desc || '',
          equipped: !!raw.equipped,
          weapon_range: raw.weapon_range || '',
          attack_stat: raw.attack_stat || 'STR',
          attack_bonus_misc: parseInt(raw.attack_bonus_misc, 10) || 0,
          damage_bonus_misc: parseInt(raw.damage_bonus_misc, 10) || 0,
          damage_entries: Array.isArray(raw.damage_entries) && raw.damage_entries.length
            ? raw.damage_entries.map(e => ({ damage: e.damage || '', damage_type: e.damage_type || '' }))
            : [{ damage: '', damage_type: '' }],
          properties: raw.properties || '',
          mastery: raw.mastery || '',
          attunement_required: !!raw.attunement_required,
          attuned: !!raw.attuned,
          sheds_light: !!raw.sheds_light,
          bright_ft: parseInt(raw.bright_ft, 10) || 0,
          dim_ft: parseInt(raw.dim_ft, 10) || 0,
        }));
        setTreasureList(prev => [...prev, ...cleaned]);
        return cleaned.length;
      },
    };
    return () => {
      // Tear down on unmount so a remount doesn't see a stale snapshot.
      if (window.__tabletopForge?.treasure) delete window.__tabletopForge.treasure;
    };
  }, []);
  const [showTreasureExport, setShowTreasureExport] = useState(false);
  const [treasureExportSelected, setTreasureExportSelected] = useState(new Set());
  const [activeTool, setActiveTool] = useState('pan');
  const [placingCreature, setPlacingCreature] = useState(null);
  // Leaving the portal tool mid-pair drops the banked anchor: the ghost
  // shouldn't sit on the map waiting for a click that is never coming.
  useEffect(() => {
    if (activeTool !== 'portal-place') setPortalAnchor(null);
  }, [activeTool]);
  const [gridColor, setGridColor] = useState('rgba(0,0,0,0.35)');
  const [gridThickness, setGridThickness] = useState(0.7);
  const [gridHex, setGridHex] = useState('#000000');
  const [gridOpacity, setGridOpacity] = useState(0.35);
  const [gridSize, setGridSize] = useState(50);
  // Projecting the live map to the party: whole map revealed, everyone's
  // camera following the GM's. See MapStage's `revealAll` / `cameraRect`.
  const [liveMapView, setLiveMapView] = useState(false);
  const [mapUploading, setMapUploading] = useState(false);
  const [dd2vttImporting, setDd2vttImporting] = useState(false);
  // Which parts of a .dd2vtt to take. Everything on by default — the old
  // behaviour — so an import nobody touched the options for is unchanged.
  const [dd2vttOpts, setDd2vttOpts] = useState({ walls: true, doors: true, lights: true });
  // Staged multilevel import: the chosen files plus the GM's ordering and
  // naming, held until they confirm. A .dd2vtt is one STOREY — the format has
  // no concept of levels — so a building arrives as several files and only the
  // GM can say which of them is the ground floor.
  const [levelImport, setLevelImport] = useState(null); // { rows: [{file,name,height}] }
  const [levelImporting, setLevelImporting] = useState(false);
  // Map id whose artwork is being replaced, so the row can show a spinner.
  const [swappingMapArt, setSwappingMapArt] = useState(null);
  // Wildspace map builder — size in squares, not pixels. 40x40 (200ft) is a
  // reasonable ship-to-ship engagement; 200 squares is the 1000ft ceiling.
  const [wildspaceCols, setWildspaceCols] = useState(40);
  const [wildspaceRows, setWildspaceRows] = useState(40);
  // Generated star-system map: stars at the centre, N orbital rings, planets
  // left to the GM's tokens.
  const [systemStars, setSystemStars] = useState(1);
  const [systemRings, setSystemRings] = useState(5);
  const [systemCols, setSystemCols] = useState(30);
  const [systemRows, setSystemRows] = useState(30);
  const [systemGenerating, setSystemGenerating] = useState(false);
  const [combatActive, setCombatActive] = useState(false);
  const [combatTurn, setCombatTurn] = useState(0);
  const [showCombatPicker, setShowCombatPicker] = useState(false);
  const [combatPickerSelection, setCombatPickerSelection] = useState(new Set());
  // Ships are picked alongside tokens but tracked separately — a ship id and a
  // token id are both plain integers and would collide in one set.
  const [combatPickerShipSelection, setCombatPickerShipSelection] = useState(new Set());
  const [combatPickerMode, setCombatPickerMode] = useState('start'); // 'start' | 'add'
  // Track which tokens were auto-selected via line-of-sight so the modal can
  // surface a "we picked these for you" banner without re-running the LOS test.
  const [combatPickerAutoIds, setCombatPickerAutoIds] = useState(new Set());
  // Which token's POV we're using for the auto-select. Mutable from inside the
  // modal so the GM can switch viewers without cancelling out.
  const [combatPickerViewerId, setCombatPickerViewerId] = useState(null);
  const [userColors, setUserColors] = useState({});
  const [users, setUsers] = useState([]);
  const [connectionLog, setConnectionLog] = useState([]); // recently disconnected players
  const [activePings, setActivePings] = useState([]);
  const [tokenFx, setTokenFx] = useState([]);
  const [lairAction, setLairAction] = useState({ enabled: false, note: '' });
  // Session-wide starting state for the two player-facing label flags. Seeded
  // from the session payload and confirmed by the server's ack.
  const [labelDefaults, setLabelDefaults] = useState({ hideName: false, hideHp: false });
  // Token id whose transform picker is open, or null.
  const [transformFor, setTransformFor] = useState(null);
  const [fogBlocks, setFogBlocks] = useState([]);

  // ── GM-side bridge for the split-the-party plugin ────────────────
  // Exposes a snapshot of the data the plugin needs to render its
  // assignment UI: maps in this session, connected users, the live
  // session row, and the configured default spawn map. The plugin
  // subscribes once and gets re-rendered when any of these change.
  // Like the treasure bridge, this is GM-only — players don't have a
  // tabletop-forge.dm namespace. Declared here (after `users`) so the
  // refs/effects don't hit a TDZ on the `users` state.
  const mapsRef = useRef(maps);
  const usersRef = useRef(users);
  // Start pulling the panorama down while the flat map is still up — see the
  // same effect in PlayerView. The GM is the one most likely to flick into 3D,
  // and the one who just uploaded the thing.
  useEffect(() => {
    const p = session?.map_sky_image;
    if (p) prefetchSky(`/uploads/${p}`);
  }, [session?.map_sky_image]);

  const sessionRef = useRef(session);
  const spawnMapIdRef = useRef(spawnMapId);
  useEffect(() => { mapsRef.current = maps; }, [maps]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  // Pull the saved states once the session is known, so the panel isn't empty
  // the first time the GM opens it.
  useEffect(() => {
    if (session?.id) socket.emit('list_map_states', { sessionId: session.id });
  }, [session?.id]);
  // Tell the server which map the GM is currently viewing so it can
  // route per-map ambient back to us when we switch maps mid-session.
  useEffect(() => {
    const id = session?.map_id ?? null;
    // Report null too. Skipping it left the server holding the LAST map the GM
    // was on after they stepped into the lobby, and per-map routing then
    // filtered the GM out of their own audio.
    socket.emit('set_player_active_map_id', { mapId: id });
  }, [session?.map_id]);
  useEffect(() => { spawnMapIdRef.current = spawnMapId; }, [spawnMapId]);
  const dmSubsRef = useRef(new Set());
  useEffect(() => {
    for (const fn of dmSubsRef.current) {
      try { fn({ maps: mapsRef.current, users: usersRef.current, session: sessionRef.current, spawnMapId: spawnMapIdRef.current }); }
      catch {}
    }
  }, [maps, users, session, spawnMapId]);
  useEffect(() => {
    const ns = (window.__tabletopForge = window.__tabletopForge || {});
    ns.dm = {
      get: () => ({
        maps: (mapsRef.current || []).map((m) => ({ ...m })),
        users: (usersRef.current || []).map((u) => ({ ...u })),
        session: sessionRef.current ? { ...sessionRef.current } : null,
        spawnMapId: spawnMapIdRef.current,
      }),
      subscribe: (fn) => {
        dmSubsRef.current.add(fn);
        return () => dmSubsRef.current.delete(fn);
      },
      setPanelTab: (tabId) => setPanelTab(tabId),
    };
    return () => { if (window.__tabletopForge) delete window.__tabletopForge.dm; };
  }, []);

  const rollIdRef = useRef(0);
  const activeSoundsRef = useRef([]);
  const audioCtxRef    = useRef(null);
  // Layered ambient playback. Same model as the player view — a Map
  // keyed by filename of currently-playing AudioBufferSourceNode +
  // GainNode pairs, plus a "wanted" set so a stop issued during the
  // async fetch→decode pipeline aborts the start. See PlayerView.jsx
  // for the canonical comments on the design.
  const ambientTracksRef  = useRef(new Map());
  const wantedAmbientsRef = useRef(new Set());

  const [statBlockCreature, setStatBlockCreature] = useState(null);
  const [statBlockTab, setStatBlockTab] = useState('stats');
  const [showActionsRef, setShowActionsRef] = useState(false);
  const [whisperOpen, setWhisperOpen] = useState(null);
  const [challengeOpen, setChallengeOpen] = useState(null);
  // What the players made of the challenges sent to them, newest first.
  const [challengeResults, setChallengeResults] = useState([]);
  const [whisperToast, setWhisperToast] = useState(null);
  const [showWhisperBar, setShowWhisperBar] = useState(false);
  // The challenge flyout, beside the whisper one: both are "a private word
  // with one player", and both are wanted mid-session without hunting through
  // a panel.
  const [showChallengeBar, setShowChallengeBar] = useState(false);
  const [challengeBarTarget, setChallengeBarTarget] = useState(null);
  const [whisperBarTarget, setWhisperBarTarget] = useState(null);
  const [lightColor, setLightColor] = useState('#fbbf24');
  const [lightShape, setLightShape] = useState('circle');
  const [editingLight, setEditingLight] = useState(null);
  const [currencyToSend, setCurrencyToSend] = useState({ gp: '', sp: '', cp: '' });
  const [panelWidth, setPanelWidth] = useState(320);
  // How much of the right edge the GM panel is occupying, drag handle included.
  //
  // The panel is a flex sibling of the map, but the view switch, the roll log
  // and the 3D view's own right-hand controls are all viewport-anchored — so
  // without this they sit ON TOP of an open panel rather than beside it. Every
  // one of them shifts left by this instead.
  const panelInset = panelOpen ? panelWidth + 6 : 0;

  // Height the map's top bar takes off the top of the view: py-2 either side of
  // a px-3 py-1.5 text-sm button, so 16 + 34 ≈ 50, rounded up for clearance.
  //
  // Only meaningful in 3D, where the bar is pinned to the window over the
  // overlay and the 3D view's own top-anchored controls have to drop below it.
  // In 2D the bar is an ordinary absolute child of the map column and nothing
  // needs telling.
  const TOP_BAR_H = 52;

  // Where the top bar's flyouts (Dice, Sounds, Whisper) hang.
  //
  // They follow the bar they belong to: an absolute child of the map column in
  // 2D, pinned to the window above the 3D overlay in 3D. Left at z-40 they were
  // UNDER that overlay, so in 3D each button toggled a panel that was
  // technically open and completely invisible.
  const flyoutCls = show3D
    ? 'fixed top-14 z-[85]'
    : 'absolute top-14 right-4 z-40';
  const flyoutStyle = show3D ? { right: panelInset + 16 } : undefined;

  // Handed to Map3DView, which fills it with its "centre on a token" action.
  // The GM's version is a picker rather than a single button: they have no one
  // token to be returned to, and on a busy board "where is the owlbear" is the
  // actual question.
  const focusTokenRef = useRef(null);
  const [tokenJumpOpen, setTokenJumpOpen] = useState(false);
  const panelDragRef = useRef(null);
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [lights, setLights] = useState([]);
  // The active map's storeys, and which one is drawn.
  //
  // An ordinary single-floor map has NO level rows at all — `levels` stays
  // empty and every code path below falls back to treating the map as one
  // level, which is what keeps this invisible on the maps that have always
  // worked.
  const [levels, setLevels] = useState([]);
  const [activeLevel, setActiveLevel] = useState(0);
  // Placing a stair. Holds the level the GM is linking FROM; the next click on
  // the map picks the square, and a prompt asks which storey it leads to.
  // Placing stairs. Holds the destination storey, chosen ONCE when the mode is
  // switched on — a building has several staircases and being asked "to which
  // level?" after every one of them is the wrong question repeated.
  const [placingStair, setPlacingStair] = useState(null); // { toLevel } | null
  const [magicalDarkness, setMagicalDarkness] = useState([]);
  const [spawnPoint, setSpawnPoint] = useState({ col: 0, row: 0 });
  const [spellTemplates, setSpellTemplates] = useState([]);
  const [skyUploading, setSkyUploading] = useState(false);
  // Which step of the conversion is running, and what it achieved — an HDRI
  // takes long enough to decode that a silent button reads as a hang.
  const [skyStage, setSkyStage] = useState('');
  const [skyNote, setSkyNote] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  // Right-clicking a fog bank in 3D. Height only means anything there, so this
  // menu is opened from that view alone.
  const [zoneHeightMenu, setZoneHeightMenu] = useState(null); // { id, x, y }
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowBlur, setFowBlur] = useState(16);
  const [fowColor, setFowColor] = useState('#000000');
  const [ambientLight, setAmbientLight] = useState('bright');
  // 'both' / '2014' / '2024' — what slice of the SRD spell library the
  // players are allowed to browse. GM-controlled, syncs via socket.
  const [activeSrdEdition, setActiveSrdEdition] = useState('both');

  // GM markers
  const [dmMarkers, setDmMarkers] = useState([]);
  // Named per-map spawn points (Phase 2). Keyed by mapId so the
  // right-click "Send to map → spawn point" submenu can list points
  // for ANY map in the campaign, not just the one the GM is currently
  // viewing. Glyphs for the current map are derived from this via
  // `currentMapSpawnPoints` below.
  const [allSpawnPoints, setAllSpawnPoints] = useState({});
  // GM-set per-player map overrides (native Split the Party). Keyed
  // by player name → mapId. Mirrored from the server on session_joined
  // and kept in sync via player_map_override_changed broadcasts.
  const [playerMapOverrides, setPlayerMapOverrides] = useState({});
  // After clicking the canvas with the spawn-named tool we hold the
  // pending coords here while the label modal is open. Submit creates
  // the row; cancel discards it.
  const [pendingSpawnPoint, setPendingSpawnPoint] = useState(null);
  // ── Portal state ─────────────────────────────────────────────────
  // Portals on the current map, both ends of every pair. `portalAnchor`
  // holds the first square while the GM is mid-placement: the pair only
  // reaches the server once the second click lands, so an abandoned
  // placement leaves nothing behind.
  const [portals, setPortals] = useState([]);
  const [portalAnchor, setPortalAnchor] = useState(null); // { col, row, pairId }
  // Transient nudge when a portal click had no traveller to send.
  const [portalHint, setPortalHint] = useState('');
  useEffect(() => {
    if (!portalHint) return;
    const t = setTimeout(() => setPortalHint(''), 2600);
    return () => clearTimeout(t);
  }, [portalHint]);
  // ── Terrain state ────────────────────────────────────────────────
  // `terrain` is the placed pieces on the current map (broadcast +
  // hydrated from session_joined). `terrainLibrary` is the global
  // catalogue of reusable pieces (fetched via REST). `pendingTerrain`
  // holds a library piece while the GM is in click-to-place mode.
  const [terrain, setTerrain] = useState([]);
  const [terrainLibrary, setTerrainLibrary] = useState([]);
  // Which shelf of the terrain library the GM is browsing: 'scenery' (obstacles
  // with wall geometry) or 'markers' (ships, settlements, landmarks).
  const [terrainKind, setTerrainKind] = useState('scenery');
  // Declared up here with the state it derives from, well above the JSX that
  // reads it — a const declared after the render body would be in its temporal
  // dead zone when the panel renders.
  const shownTerrainLibrary = useMemo(
    () => terrainLibrary.filter(p => (terrainKind === 'markers') === !!p.is_marker),
    [terrainLibrary, terrainKind]
  );
  // Ships placed on the current map, each with its decks attached, plus the
  // reusable ship classes for the builder / place menu.
  const [ships, setShips] = useState([]);
  const [shipFx, setShipFx] = useState([]);
  const [shipLibrary, setShipLibrary] = useState([]);
  const [selectedShipId, setSelectedShipId] = useState(null);
  const [shipBuilderOpen, setShipBuilderOpen] = useState(false);
  const [doorSprites, setDoorSprites] = useState([]);
  // The spell library, for building scrolls and enspelled items on the
  // Treasure tab. Fetched once; the forge filters it by level itself.
  const [librarySpells, setLibrarySpells] = useState([]);
  // The look every NEW door is born with. Held server-side rather than in this
  // browser, so it follows the GM between machines and — more importantly —
  // so the server can apply it to doors the GM never touches: the ones a tile
  // lays or an import brings in.
  const [doorDefault, setDoorDefault] = useState({ spritePath: null, spriteMotion: 'swing' });
  const [pendingTerrain, setPendingTerrain] = useState(null);
  const [selectedTerrainId, setSelectedTerrainId] = useState(null);
  // Free resize/rotate is a mode the GM enters deliberately, not something
  // selection turns on: the drag handles have hit boxes reaching past the
  // piece, and armed by default they steal clicks from the map around it.
  const [resizingTerrainId, setResizingTerrainId] = useState(null);
  useEffect(() => {
    if (resizingTerrainId == null) return;
    const onKey = (e) => { if (e.key === 'Escape') setResizingTerrainId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resizingTerrainId]);
  const [terrainContextMenu, setTerrainContextMenu] = useState(null);
  const [editingTerrainPiece, setEditingTerrainPiece] = useState(null); // library row being edited
  const [showTerrainUpload, setShowTerrainUpload] = useState(false);
  const [placingMarkerType, setPlacingMarkerType] = useState(null); // type string when placing
  const [editingMarker, setEditingMarker] = useState(null);         // marker object being edited

  // Remote measurements from other users
  const [remoteMeasurements, setRemoteMeasurements] = useState([]);

  async function handleViewStatBlock(creatureId) {
    try {
      // role=dm: this is the GM's own window onto a sheet, so it has to carry
      // the items the player cannot see (see itemSecrets.js). Without it the
      // GM would be shown the same censored pack the player is.
      const res = await fetch(`/api/creatures/${creatureId}?role=dm`);
      const data = await res.json();
      if (!data.error) { setStatBlockCreature(data); setStatBlockTab('stats'); }
    } catch {}
  }

  const AI_DEFAULTS = {
    provider: 'lmstudio',
    baseUrl: 'http://host.docker.internal:1234',
    apiKey: '',
    model: '',
    // ── Image generation (optional) ──
    imageEnabled: false,
    imageProvider: 'swarmui',
    imageBaseUrl: 'http://host.docker.internal:7801',
    imageApiKey: '',
    imageModel: '',
    imageWidth: 768,
    imageHeight: 768,
    imageSteps: 25,
    imageCfgScale: 6,
    imagePromptTemplate: 'fantasy portrait of a {name}, detailed digital painting, dramatic lighting, painterly',
    imageNegativePrompt: '',
    imageAllowNsfw: false,
  };

  // Per-provider UI hints — what fields the panel asks for. Mirrors the
  // backend's IMAGE_PROVIDERS table; the backend is authoritative
  // (errors out for unsupported combos), this is just for showing/hiding
  // controls. Default URLs are per-provider so switching the dropdown
  // gives the user a sensible starting point.
  const IMAGE_PROVIDER_DEFS = {
    swarmui:  {
      label: 'SwarmUI',
      defaultBaseUrl: 'http://host.docker.internal:7801',
      placeholderUrl: 'http://host.docker.internal:7801',
      needsBaseUrl: true,  needsApiKey: false,
      supportsNegativePrompt: true,  supportsCfg: true,  supportsSteps: true,
      supportsCustomSize: true,  supportsSeed: true,
      apiKeyLabel: 'Optional auth token',
      help: 'SwarmUI runs on Windows? From inside Docker use host.docker.internal, not localhost.',
    },
    auto1111: {
      label: 'Stable Diffusion WebUI (AUTO1111)',
      defaultBaseUrl: 'http://host.docker.internal:7860',
      placeholderUrl: 'http://host.docker.internal:7860',
      needsBaseUrl: true,  needsApiKey: false,
      supportsNegativePrompt: true,  supportsCfg: true,  supportsSteps: true,
      supportsCustomSize: true,  supportsSeed: true,
      apiKeyLabel: 'Optional auth token (Bearer)',
      help: 'Launch with --api flag. From Docker, use host.docker.internal:7860 to reach a Windows/macOS host.',
    },
    openai: {
      label: 'OpenAI Images (DALL·E / gpt-image)',
      defaultBaseUrl: '',
      placeholderUrl: '',
      needsBaseUrl: false,  needsApiKey: true,
      supportsNegativePrompt: false,  supportsCfg: false,  supportsSteps: false,
      supportsCustomSize: true,  supportsSeed: false,
      apiKeyLabel: 'OpenAI API key',
      help: 'Hosted, paid. dall-e-3 supports 1024x1024, 1024x1792, 1792x1024. gpt-image-1 supports 1024x1024, 1024x1536, 1536x1024.',
    },
    stability: {
      label: 'Stability AI',
      defaultBaseUrl: '',
      placeholderUrl: '',
      needsBaseUrl: false,  needsApiKey: true,
      supportsNegativePrompt: true,  supportsCfg: false,  supportsSteps: false,
      supportsCustomSize: true,  supportsSeed: true,
      apiKeyLabel: 'Stability API key',
      help: 'Hosted, paid. Width/height are mapped to the closest supported aspect ratio. Models: core, ultra, sd3.5-large, sd3.5-medium.',
    },
  };

  // AI settings live server-side in `app_settings` (key `ai_config`)
  // so they follow the GM across phones, browsers, and incognito tabs.
  // localStorage is kept as a SECOND-line read for two reasons:
  //   (a) instant first paint while the server fetch is in flight, and
  //   (b) plugins read settings via context.getAiSettings(), which
  //       still pulls from localStorage. Mirroring the server value
  //       into localStorage on every load keeps that contract working
  //       without modifying every plugin.
  const [aiSettings, setAISettings] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dndvtt_ai_settings') || 'null');
      return { ...AI_DEFAULTS, ...(stored || {}) };
    } catch {
      return { ...AI_DEFAULTS };
    }
  });
  const [aiTestStatus, setAITestStatus] = useState(null); // null | 'testing' | 'ok' | 'error'
  const [aiTestMessage, setAITestMessage] = useState('');
  const [aiImageTestStatus, setAIImageTestStatus] = useState(null);
  const [aiImageTestMessage, setAIImageTestMessage] = useState('');
  const [aiImageModelList, setAIImageModelList] = useState([]);
  // Latch so we don't fire a server PUT for the initial state
  // (which would clobber whatever's already saved with the local
  // defaults during the brief window before the GET finishes).
  const aiHydratedRef = useRef(false);

  // One-shot fetch from the server's app_settings store. Failure is
  // non-fatal — we keep whatever localStorage gave us.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/ai_config')
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        if (cancelled || !row || !row.value) { aiHydratedRef.current = true; return; }
        setAISettings((prev) => {
          const next = { ...AI_DEFAULTS, ...prev, ...row.value };
          try { localStorage.setItem('dndvtt_ai_settings', JSON.stringify(next)); } catch {}
          return next;
        });
        aiHydratedRef.current = true;
      })
      .catch(() => { aiHydratedRef.current = true; });
    return () => { cancelled = true; };
  }, []);

  // ── Where the 5eTools mirror lives ──────────────────────────────────────
  //
  // The compendium — every creature, spell, item and rule the Look up panel
  // and the importer read — is served by a 5eTools mirror on the GM's own
  // network. Its address used to be baked into the server, so moving the
  // mirror meant editing a file and restarting; it is a setting now, and the
  // server applies it on save rather than on the next boot.
  const [compendium, setCompendium] = useState(null);     // { url, source, saved, default, env }
  const [compendiumDraft, setCompendiumDraft] = useState('');
  const [compendiumBusy, setCompendiumBusy] = useState(false);
  const [compendiumTest, setCompendiumTest] = useState(null);  // { ok, message }

  const loadCompendium = useCallback(async () => {
    try {
      const info = await fetch('/api/settings/compendium/info').then((r) => (r.ok ? r.json() : null));
      if (!info) return;
      setCompendium(info);
      setCompendiumDraft(info.saved || info.url || '');
    } catch { /* an older server with no such route — leave the panel empty */ }
  }, []);
  useEffect(() => { loadCompendium(); }, [loadCompendium]);

  // Ask the server whether the mirror actually answers, rather than whether the
  // address looks plausible: a typo and a box that is switched off read the
  // same in a text field.
  const testCompendium = useCallback(async () => {
    setCompendiumBusy(true);
    setCompendiumTest(null);
    try {
      const r = await fetch('/api/compendium/status').then((x) => x.json());
      // "fetch failed" on its own tells a GM nothing. The address it failed
      // against is the half that matters.
      setCompendiumTest(r.ok
        ? { ok: true, message: `Answering at ${r.url}` }
        : { ok: false, message: `No answer from ${r.url}${r.error ? ` — ${r.error}` : ''}` });
    } catch (err) {
      setCompendiumTest({ ok: false, message: err.message });
    } finally {
      setCompendiumBusy(false);
    }
  }, []);

  const saveCompendium = useCallback(async (value) => {
    setCompendiumBusy(true);
    setCompendiumTest(null);
    try {
      const body = { value };
      const r = value
        ? await fetch('/api/settings/compendium_url', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        : await fetch('/api/settings/compendium_url', { method: 'DELETE' });
      const data = await r.json().catch(() => ({}));
      if (data.compendium) {
        setCompendium(data.compendium);
        setCompendiumDraft(data.compendium.saved || data.compendium.url || '');
      } else {
        await loadCompendium();
      }
    } finally {
      setCompendiumBusy(false);
    }
    await testCompendium();
  }, [loadCompendium, testCompendium]);

  // On-device provider availability (Apple Intelligence). Only the native
  // macOS app built with --apple-intelligence reports present:true; every
  // other build (web, Docker, plain .dmg) returns present:false, so the
  // provider option simply never appears. Probed once on mount.
  const [nativeAi, setNativeAi] = useState({ appleIntelligence: { present: false } });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/native')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setNativeAi(d); })
      .catch(() => { /* not a native build — leave the default */ });
    return () => { cancelled = true; };
  }, []);
  const appleAi = nativeAi.appleIntelligence || { present: false };

  function updateAISettings(updates) {
    setAISettings((prev) => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem('dndvtt_ai_settings', JSON.stringify(next)); } catch {}
      // Don't overwrite the server value with our local defaults
      // before the initial GET has completed.
      if (aiHydratedRef.current) {
        fetch('/api/settings/ai_config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: next }),
        }).catch(() => { /* offline write: localStorage is the fallback */ });
      }
      return next;
    });
    setAITestStatus(null);
  }

  const AI_PROVIDER_DEFAULTS = {
    lmstudio: { baseUrl: 'http://host.docker.internal:1234', placeholder: 'http://host.docker.internal:1234' },
    ollama: { baseUrl: 'http://host.docker.internal:11434', placeholder: 'http://host.docker.internal:11434' },
    openai: { baseUrl: 'https://api.openai.com', placeholder: 'https://api.openai.com' },
    custom: { baseUrl: '', placeholder: 'https://your-api-host.com' },
    // Apple Intelligence: the base URL is the local sidecar, supplied by the
    // native shell — not user-entered. Selecting it fills baseUrl from the
    // /api/ai/native probe (see the Provider dropdown onChange).
    apple: { baseUrl: '', placeholder: 'on-device — no URL needed' },
  };

  async function handleAITest() {
    if (!aiSettings.baseUrl) return;
    setAITestStatus('testing');
    setAITestMessage('');
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      setAITestStatus('ok');
      setAITestMessage(data.preview || 'Connected');
    } catch (err) {
      setAITestStatus('error');
      setAITestMessage(err.message);
    }
  }

  async function handleAIImageTest() {
    const def = IMAGE_PROVIDER_DEFS[aiSettings.imageProvider] || IMAGE_PROVIDER_DEFS.swarmui;
    if (def.needsBaseUrl && !aiSettings.imageBaseUrl) return;
    if (def.needsApiKey && !aiSettings.imageApiKey) return;
    setAIImageTestStatus('testing');
    setAIImageTestMessage('');
    setAIImageModelList([]);
    try {
      const res = await fetch('/api/ai/test-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.imageProvider,
          baseUrl: aiSettings.imageBaseUrl,
          apiKey: aiSettings.imageApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      setAIImageTestStatus('ok');
      setAIImageTestMessage(data.preview || 'Connected');
      setAIImageModelList(Array.isArray(data.models) ? data.models : []);
    } catch (err) {
      setAIImageTestStatus('error');
      setAIImageTestMessage(err.message);
    }
  }

  async function loadMaps(sessionId) {
    if (!sessionId) return;
    const res = await fetch(`/api/maps?session_id=${sessionId}`);
    const data = await res.json();
    setMaps(data);
  }

  useEffect(() => {
    // EITHER CREDENTIAL WILL DO.
    //
    // ?pass= is the old way and still works. A GM signed in to an account
    // arrives with no password in the URL at all: their token is in this
    // browser, the session is paired to their account, and the server checks
    // that instead (see join_session in the backend). No credential of either
    // kind means there is nothing to join with, so back to the front door.
    if (!code || (!pass && !gmToken())) { navigate('/'); return; }

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setReconnectAttempt(0);
      // Re-emit on every connect, including after a reconnect — the
      // server treats join_session as idempotent and re-hydrates state.
      socket.emit('join_session', {
        sessionCode: code, role: 'dm', name: 'Game Master',
        dmPassword: pass, gmToken: gmToken(),
      });
    });
    socket.io.on('reconnect_attempt', (n) => setReconnectAttempt(n));
    socket.io.on('reconnect_failed', () => setReconnectAttempt(-1));

    // GM's own rotate: navigate to the new ?code= so the effect re-runs
    // and the socket reconnects on the new session. Also clear the
    // in-memory session so the spinner shows briefly while the new
    // session_joined payload arrives — better UX than a flash of stale
    // tokens before they swap out.
    socket.on('session_code_changed', ({ newCode }) => {
      if (!newCode) return;
      setSession(null);
      navigate(`/dm?code=${encodeURIComponent(newCode)}&pass=${encodeURIComponent(pass)}`);
    });

    socket.on('session_joined', ({ state, userColors: uc, users: u, connectionLog: cl }) => {
      // Which board this screen is showing, re-reported on every join.
      //
      // The effect that normally sends this fires on a CHANGE of map id, and a
      // reconnect changes nothing — but it is a new socket, and the server's
      // record of who is watching what lives on the socket. Without this, a GM
      // who dropped and came back was invisible to the patrol runner and the
      // guards on their map quietly stopped. Sent from here, not from the
      // 'connect' handler, because join_session must land first: the server
      // ignores this event until the socket has a session.
      socket.emit('set_player_active_map_id', { mapId: state?.session?.map_id ?? null });
      setSession(state.session);
      loadMaps(state.session.id);
      setTokens(state.tokens);
      setWalls(state.walls || []);
      setDoors(state.doors || []);
      setLights(state.lights || []);
      setLevels(state.levels || []);
      setActiveLevel(Number(state.session?.map_active_level) || 0);
      setMagicalDarkness(state.magicalDarkness || []);
      setSpellTemplates(state.spellTemplates || []);
      setRollLog(Array.isArray(state.rollLog) ? state.rollLog : []);
      // The server allocates ink colours per session, so it is the authority;
      // this only drives the local preview while a stroke is being drawn.
      if (state.inkColor) setMyInkColor(state.inkColor);
      setDrawings(Array.isArray(state.drawings) ? state.drawings : []);
      setDmMarkers(state.dmMarkers || []);
      setTerrain(state.terrain || []);
      setTiles(state.tiles || []);
      setShips(state.ships || []);
      // Library is global, fetched once on join. Re-fetch on
      // upload/edit/delete is handled inline by those actions.
      fetch('/api/terrain/library')
        .then((r) => r.ok ? r.json() : [])
        .then((rows) => setTerrainLibrary(rows || []))
        .catch(() => {});
      fetch('/api/spell-library')
        .then((r) => r.ok ? r.json() : [])
        .then((rows) => setLibrarySpells(Array.isArray(rows) ? rows : (rows?.spells || [])))
        .catch(() => {});
      fetch('/api/door-sprites')
        .then((r) => r.ok ? r.json() : [])
        .then((rows) => setDoorSprites(rows || []))
        .catch(() => {});
      // 404 simply means no default has been chosen yet, which is a plain
      // door — the behaviour before this existed.
      fetch('/api/settings/door_default')
        .then((r) => r.ok ? r.json() : null)
        .then((row) => {
          const v = row?.value;
          if (v) setDoorDefault({ spritePath: v.spritePath || null, spriteMotion: v.spriteMotion || 'swing' });
        })
        .catch(() => {});
      setFogBlocks(state.fogBlocks || []);
      setPlayerMapOverrides(state.playerMapOverrides || {});
      // Seed the current map's spawn points immediately, then pull
      // every other map's points in one shot so the right-click submenu
      // can list them without firing a fetch per map.
      const seed = state.session?.map_id != null
        ? { [state.session.map_id]: state.spawnPoints || [] }
        : {};
      setAllSpawnPoints(seed);
      if (state.session?.id != null) {
        fetch(`/api/sessions/${state.session.id}/spawn-points`)
          .then(r => r.ok ? r.json() : [])
          .then(rows => {
            const grouped = {};
            for (const sp of rows || []) {
              if (sp.map_id == null) continue;
              (grouped[sp.map_id] = grouped[sp.map_id] || []).push(sp);
            }
            // Merge — current-map seed wins to stay consistent with
            // socket events that may have already fired for it.
            setAllSpawnPoints(prev => ({ ...grouped, ...prev }));
          })
          .catch(() => {});
      }
      setSpawnPoint(state.spawnPoint || { col: 0, row: 0 });
      setPortals(state.portals || []);
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setFowColor(state.session.fow_color || '#000000');
      setAmbientLight(state.session.ambient_light || 'bright');
      setSneakMode(!!state.session.sneak_mode);
      setSneakRoundAt(state.session.sneak_round_at ?? null);
      // Shops are the GM's own preparation — fetched rather than carried in
      // the session payload, which every client receives.
      socket.emit('shop_list', { sessionId: state.session.id });
      socket.emit('shop_offers_pending', { sessionId: state.session.id });
      setActiveSrdEdition(state.session.active_srd_edition || 'both');
      setGridSize(state.session.grid_size || 50);
      setLiveMapView(!!state.session.live_map_view);
      const gc = state.session.grid_color || 'rgba(0,0,0,0.35)';
      const gt = state.session.grid_thickness ?? 0.7;
      setGridColor(gc);
      setGridThickness(gt);
      const parsed = parseRgba(gc);
      setGridHex(parsed.hex);
      setGridOpacity(parsed.opacity);
      setCombatActive(state.session.combat_active || false);
      setPatrolsPaused(!!state.session.patrols_paused);
      // The routes themselves are not in the session payload — they are GM-only
      // and most sessions have none — so they are asked for on arrival.
      socket.emit('list_patrols');
      setCombatTurn(state.session.combat_turn || 0);
      setTokenNameFontSize(state.session.token_name_font_size ?? 45);
      setSpawnMapId(state.session.spawn_map_id ?? null);
      if (uc) setUserColors(uc);
      if (u) setUsers(u);
      if (cl) setConnectionLog(cl);
    });

    socket.on('error', ({ message }) => setError(message));

    socket.on('token_moved', ({ tokenId, gridCol, gridRow, facing }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, grid_col: gridCol, grid_row: gridRow, ...(facing == null ? {} : { facing }) }
        : t));
    });

    // ── Sneak mode ──────────────────────────────────────────────────────
    // Only the GM receives awareness at all; a player gets a coarse pulse and
    // nothing else (see backend/src/detection.js).
    socket.on('treasure_chest_changed', ({ items }) => {
      setTreasureList(Array.isArray(items) ? items : []);
    });
    socket.on('shop_list', ({ shops: rows }) => setShopList(Array.isArray(rows) ? rows : []));
    socket.on('shop_changed', (payload) => {
      if (!payload) return;
      setShop(payload);
      setShopList((prev) => {
        const without = prev.filter((x) => x.id !== payload.id);
        return [...without, {
          id: payload.id, name: payload.name, is_open: payload.is_open,
          blurb: payload.blurb, allow_haggle: payload.allow_haggle, allow_selling: payload.allow_selling,
        }].sort((a, b) => a.id - b.id);
      });
    });
    socket.on('shop_deleted', ({ shopId }) => {
      setShopList((prev) => prev.filter((x) => x.id !== shopId));
      setShop((prev) => (prev && prev.id === shopId ? null : prev));
    });
    socket.on('shop_offer_received', ({ offer }) => {
      setShopOffers((prev) => [...prev.filter((o) => o.id !== offer.id), offer]);
    });
    socket.on('shop_offer_updated', ({ offer }) => {
      setShopOffers((prev) => (OFFER_SETTLED.includes(offer.status)
        ? prev.filter((o) => o.id !== offer.id)
        : prev.map((o) => (o.id === offer.id ? offer : o))));
    });
    socket.on('shop_offers_pending', ({ offers }) => setShopOffers(Array.isArray(offers) ? offers : []));
    socket.on('sneak_mode_changed', ({ enabled, roundAt }) => {
      setSneakMode(!!enabled);
      setSneakRoundAt(roundAt ?? null);
    });
    socket.on('awareness_changed', ({ tokenId, awareness, facing }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, awareness, ...(facing == null ? {} : { facing }) } : t));
    });
    socket.on('token_sneak_changed', ({ tokenId, sneaking, stealthDc }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, ...(sneaking === undefined ? {} : { sneaking }),
                  ...(stealthDc === undefined ? {} : { stealth_dc: stealthDc }) } : t));
    });
    socket.on('token_facing_changed', ({ tokenId, facing, arc }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, facing, vision_arc: arc } : t));
    });
    socket.on('token_move_mode_changed', ({ tokenId, mode }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, move_mode: mode === 'auto' ? null : mode } : t));
    });
    socket.on('token_senses_changed', ({ tokenId, senses }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, senses } : t));
    });
    // The existing vision editor emits this one; it carries arcs through now.
    socket.on('token_vision_changed', ({ tokenId, senses }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, senses } : t));
    });
    // A round's worth of movement, so the GM can see what the party has left.
    socket.on('move_budget', ({ tokenId, spent, resetsAt }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, move_spent: spent, move_window_at: new Date(resetsAt - 6000).toISOString() }
        : t));
    });
    socket.on('move_budgets_cleared', () => {
      setTokens((prev) => prev.map((t) => ({ ...t, move_spent: 0, move_window_at: null })));
    });

    // A token was relocated to a different map (e.g. via the right-click
    // "Send to" menu). The GM only loads tokens for the current map at a
    // time, so:
    //   - If the token left this map → drop it from local state.
    //   - If the token arrived on this map → re-load tokens to pull the
    //     full row (we don't have it client-side yet).
    socket.on('token_map_changed', async ({ tokenId, fromMapId, toMapId, gridCol, gridRow }) => {
      const currentMapId = sessionRef.current?.map_id ?? null;
      if (currentMapId == null) return;
      if (toMapId === currentMapId) {
        // Token came to us — re-fetch tokens for this map.
        try {
          const r = await fetch(`/api/maps/${currentMapId}/state?session_id=${sessionRef.current.id}`);
          if (r.ok) {
            const data = await r.json();
            setTokens(data.tokens || []);
          }
        } catch {}
      } else if (fromMapId === currentMapId) {
        setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      }
    });

    socket.on('token_hp_changed', ({ tokenId, currentHp }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, current_hp: currentHp } : t));
    });

    socket.on('token_max_hp_changed', ({ tokenId, maxHp }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, max_hp: maxHp } : t));
    });

    socket.on('token_temp_hp_changed', ({ tokenId, tempHp }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, temp_hp: tempHp } : t));
    });

    socket.on('token_conditions_changed', ({ tokenId, conditions }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, conditions } : t));
    });

    socket.on('token_light_changed', ({ tokenId, brightFt, dimFt, color, flicker }) => {
      setTokens(prev => prev.map(t => t.id === tokenId ? {
        ...t,
        token_light_bright: brightFt,
        token_light_dim: dimFt,
        ...(color !== undefined ? { token_light_color: color } : {}),
        ...(flicker !== undefined ? { token_light_flicker: flicker } : {}),
      } : t));
    });

    socket.on('token_initiative_changed', ({ tokenId, initiative }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, initiative } : t));
    });

    socket.on('token_visibility_changed', ({ tokenId, isHidden }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, is_hidden: isHidden } : t));
    });

    socket.on('token_flying_changed', ({ tokenId, isFlying }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, is_flying: isFlying } : t));
    });

    // The server declining a loot roll, because that creature has no table set.
    // Told to the GM who asked rather than broadcast — nobody else needs to
    // know the GM went looking.
    socket.on('creature_loot_missing', ({ name }) => {
      setError(`${name} has no loot table set. Pick one on its library entry.`);
      setTimeout(() => setError(''), 6000);
    });

    socket.on('token_added', ({ token }) => {
      // Upsert, not append — this event now also carries tokens moved onto the
      // map in bulk, which the GM may already be holding.
      setTokens((prev) => prev.some((t) => t.id === token.id)
        ? prev.map((t) => (t.id === token.id ? { ...t, ...token } : t))
        : [...prev, token]);
    });

    socket.on('token_refreshed', ({ token }) => {
      setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, ...token } : t));
    });

    socket.on('token_removed', ({ tokenId }) => {
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      if (selectedToken === tokenId) setSelectedToken(null);
    });

    // Live terrain sync.
    //
    // The server broadcasts these to the WHOLE session room — see
    // broadcastTerrain in backend/src/index.js — filtered only by whether the
    // piece is hidden, not by which map each client happens to be rendering.
    // The row carries its own map_id, so `added` has to be filtered here or a
    // piece placed on one board turns up on whatever board this client is
    // showing. That is exactly how a star system's planets ended up standing
    // on a dockside map.
    //
    // `updated` and `removed` need no guard: both are no-ops when the piece
    // isn't already in the list.
    socket.on('terrain_added', ({ terrain: t }) => {
      if (!t) return;
      const here = sessionRef.current?.map_id;
      if (t.map_id != null && here != null && Number(t.map_id) !== Number(here)) return;
      setTerrain(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]);
    });
    socket.on('terrain_updated', ({ terrain: t }) => setTerrain(prev => prev.map(x => x.id === t.id ? t : x)));
    socket.on('terrain_removed', ({ id })          => setTerrain(prev => prev.filter(x => x.id !== id)));

    // ── Ships ──────────────────────────────────────────────────────────────
    // move/rotate carry `tokenPatches`: the server already re-projected every
    // token aboard, so the crew's world coords are patched in the same tick as
    // the hull. Applying them together is what stops the crew visibly lagging
    // a frame behind the ship they're standing on.
    const applyTokenPatches = (patches) => {
      if (!patches?.length) return;
      const byId = new Map(patches.map(p => [p.tokenId, p]));
      setTokens(prev => prev.map(t => {
        const p = byId.get(t.id);
        return p ? { ...t, grid_col: p.gridCol, grid_row: p.gridRow } : t;
      }));
    };
    socket.on('ship_placed',  ({ ship }) => setShips(prev => prev.some(s => s.id === ship.id) ? prev : [...prev, ship]));
    // Ship destruction animation. Carries its own geometry because the ship row
    // is already gone by the time this lands. Entries are dropped once the
    // longest effect has had time to finish, so the list can't grow.
    socket.on('ship_destroyed', (fx) => {
      setShipFx((prev) => [...prev.filter((f) => Date.now() - f.ts < 4000), fx]);
      setTimeout(() => setShipFx((prev) => prev.filter((f) => f !== fx)), 4000);
    });
    socket.on('ship_removed', ({ shipId }) => {
      setShips(prev => prev.filter(s => s.id !== shipId));
      setSelectedShipId(prev => (prev === shipId ? null : prev));
      // Crew are set adrift server-side rather than deleted — drop the binding
      // locally too so they don't stay pinned to a ship that's gone.
      setTokens(prev => prev.map(t => t.ship_id === shipId ? { ...t, ship_id: null, deck_col: null, deck_row: null } : t));
    });
    socket.on('ship_moved', ({ shipId, gridCol, gridRow, tokenPatches }) => {
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, grid_col: gridCol, grid_row: gridRow } : s));
      applyTokenPatches(tokenPatches);
    });
    socket.on('ship_rotated', ({ shipId, rotation, tokenPatches }) => {
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, rotation } : s));
      applyTokenPatches(tokenPatches);
    });
    socket.on('ships_refreshed', ({ ships: rows }) => setShips(rows || []));
    socket.on('ship_deck_changed', ({ shipId, deckIndex }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, active_deck: deckIndex } : s)));
    socket.on('ship_renamed', ({ shipId, name }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, name } : s)));
    socket.on('ship_attunement_changed', ({ shipId, playerName }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, attuned_player: playerName } : s)));
    socket.on('ship_hp_changed', ({ shipId, currentHp }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, current_hp: currentHp } : s)));
    socket.on('ship_initiative_changed', ({ shipId, initiative }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, initiative } : s)));
    socket.on('ship_combat_changed', ({ shipId, inCombat }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, in_combat: inCombat } : s)));
    socket.on('token_deck_moved', ({ tokenId, shipId, deckIndex, gridCol, gridRow, deckCol, deckRow }) =>
      setTokens(prev => prev.map(t => t.id === tokenId
        ? { ...t, ship_id: shipId, deck_index: deckIndex, grid_col: gridCol, grid_row: gridRow, deck_col: deckCol, deck_row: deckRow }
        : t)));

    socket.on('dm_marker_added',   ({ marker }) => setDmMarkers(prev => [...prev, marker]));
    socket.on('dm_marker_removed', ({ markerId }) => setDmMarkers(prev => prev.filter(m => m.id !== markerId)));
    socket.on('dm_marker_updated', ({ marker }) => setDmMarkers(prev => prev.map(m => m.id === marker.id ? marker : m)));

    // Spawn point CRUD broadcasts (Phase 2). Bucketed by mapId so all
    // maps' points stay in sync — the canvas reads only the current
    // map's, the right-click submenu reads them all.
    socket.on('spawn_point_added', ({ spawnPoint }) => {
      const m = spawnPoint?.map_id;
      if (m == null) return;
      setAllSpawnPoints(prev => {
        const list = prev[m] || [];
        if (list.some(s => s.id === spawnPoint.id)) return prev;
        return { ...prev, [m]: [...list, spawnPoint] };
      });
    });
    socket.on('spawn_point_updated', ({ spawnPoint }) => {
      const m = spawnPoint?.map_id;
      if (m == null) return;
      setAllSpawnPoints(prev => ({
        ...prev,
        [m]: (prev[m] || []).map(s => s.id === spawnPoint.id ? spawnPoint : s),
      }));
    });
    // GM-set player map overrides (native Split the Party).
    socket.on('player_map_override_changed', ({ playerName, mapId }) => {
      setPlayerMapOverrides(prev => {
        const next = { ...prev };
        if (mapId == null) delete next[playerName];
        else next[playerName] = Number(mapId);
        return next;
      });
    });
    socket.on('player_map_overrides_cleared', () => setPlayerMapOverrides({}));

    socket.on('spawn_point_removed', ({ id, mapId }) => {
      if (mapId == null) {
        // Defensive: if the broadcast omitted mapId, sweep every bucket.
        setAllSpawnPoints(prev => Object.fromEntries(
          Object.entries(prev).map(([k, v]) => [k, v.filter(s => s.id !== id)])
        ));
        return;
      }
      setAllSpawnPoints(prev => ({
        ...prev,
        [mapId]: (prev[mapId] || []).filter(s => s.id !== id),
      }));
    });

    // ── Portals ──────────────────────────────────────────────────────────
    // Added and updated are both upserts: the server re-sends a portal that
    // was hidden and has just been revealed as an update, and a client that
    // dropped the row while it was hidden needs to take it back.
    const upsertPortal = (portal) => {
      if (!portal) return;
      setPortals(prev => prev.some(p => p.id === portal.id)
        ? prev.map(p => (p.id === portal.id ? portal : p))
        : [...prev, portal]);
    };
    socket.on('portal_needs_token', ({ standing }) => setPortalHint(
      standing > 1
        ? 'More than one token on that portal — select the one to send.'
        : 'Select a token first, then click the portal.'
    ));
    socket.on('portal_added',   ({ portal }) => upsertPortal(portal));
    socket.on('portal_updated', ({ portal }) => upsertPortal(portal));
    socket.on('portal_removed', ({ id }) => setPortals(prev => prev.filter(p => p.id !== id)));
    socket.on('portals_cleared', () => setPortals([]));

    socket.on('token_size_changed', ({ tokenId, size, sizeSquares }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, size, size_squares: sizeSquares ?? null } : t));
    });

    socket.on('token_name_changed', ({ tokenId, name: tokenName }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, name: tokenName } : t));
    });

    socket.on('token_nickname_changed', ({ tokenId, nickname }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, nickname } : t));
    });

    socket.on('token_auras_changed', ({ tokenId, auras }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, auras } : t));
    });
    socket.on('token_mark_changed', ({ tokenId, markedBy, markLabel }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, marked_by: markedBy, mark_label: markLabel } : t));
    });
    socket.on('token_exhaustion_changed', ({ tokenId, exhaustion }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, exhaustion } : t));
    });
    socket.on('darkness_attached', ({ darknessId, tokenId }) => {
      setMagicalDarkness((prev) => prev.map((d) => d.id === darknessId ? { ...d, attached_token_id: tokenId } : d));
    });

    socket.on('patrols_list', ({ patrols: list }) => {
      setPatrols(Object.fromEntries((list || []).map((p) => [String(p.token_id), p])));
    });
    socket.on('patrol_changed', ({ tokenId, patrol }) => {
      setPatrols((prev) => {
        const next = { ...prev };
        if (patrol) next[String(tokenId)] = patrol; else delete next[String(tokenId)];
        return next;
      });
    });
    // Per map: ignore a change to a board we are not looking at, or switching
    // maps would inherit the wrong state until the next full refresh.
    socket.on('patrols_paused_changed', ({ mapId, paused }) => {
      const here = sessionRef.current?.map_id ?? null;
      if (mapId != null && here != null && Number(mapId) !== Number(here)) return;
      setPatrolsPaused(!!paused);
    });
    socket.on('patrol_finished', ({ tokenId }) => {
      // A 'once' route that has run its course. Reflected so the panel stops
      // claiming it is walking.
      setPatrols((prev) => (prev[String(tokenId)]
        ? { ...prev, [String(tokenId)]: { ...prev[String(tokenId)], active: false } }
        : prev));
    });

    socket.on('token_familiar_changed', ({ tokenId, familiarOf, companionKind }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, familiar_of: familiarOf, companion_kind: companionKind || null }
        : t));
    });

    // Transformation / destruction animations. Entries are pruned on a timer
    // rather than per-frame — MapStage ignores expired ones anyway, this just
    // stops the array growing over a long session.
    socket.on('token_fx', ({ tokenId, effect, ts }) => {
      const entry = { tokenId, effect, ts: ts || Date.now() };
      setTokenFx((prev) => [...prev, entry]);
      setTimeout(() => setTokenFx((prev) => prev.filter((f) => f !== entry)), 2500);
    });

    socket.on('lair_action_changed', ({ enabled, note }) => {
      setLairAction({ enabled: !!enabled, note: note || '' });
    });

    socket.on('token_label_defaults_changed', ({ hideName, hideHp }) => {
      setLabelDefaults({ hideName: !!hideName, hideHp: !!hideHp });
    });

    socket.on('map_states', ({ snapshots }) => setMapStates(Array.isArray(snapshots) ? snapshots : []));
    socket.on('map_state_saved', ({ name, count }) => {
      setMapStateBusy(false);
      setMapStateMsg(`Saved "${name}" — ${count} token${count === 1 ? '' : 's'}.`);
      if (sessionRef.current) socket.emit('list_map_states', { sessionId: sessionRef.current.id });
    });
    socket.on('map_state_restored', ({ name, restored, missing }) => {
      setMapStateBusy(false);
      setMapStateMsg(
        `Restored "${name}" — ${restored} token${restored === 1 ? '' : 's'}` +
        (missing && missing.length ? `. Not found: ${missing.join(', ')}` : '.')
      );
    });
    socket.on('map_state_deleted', () => {
      if (sessionRef.current) socket.emit('list_map_states', { sessionId: sessionRef.current.id });
    });

    socket.on('token_elevation_changed', ({ tokenId, elevation, isFlying }) => {
      setTokens((prev) => prev.map((t) => (t.id === tokenId
        ? { ...t, elevation, is_flying: isFlying } : t)));
    });

    socket.on('tracker_reminder_changed', ({ tokenId, text }) => {
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, tracker_reminder: text } : t)));
    });

    socket.on('token_label_visibility_changed', ({ tokenId, hideName, hideHp }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, hide_name_from_players: hideName, hide_hp_from_players: hideHp }
        : t));
    });

    socket.on('token_level_changed', ({ token }) => {
      setTokens((prev) => prev.map((t) => (t.id === token.id ? token : t)));
    });

    socket.on('map_level_changed', ({ mapId, levelIndex }) => {
      // Echoed to the GM who sent it as well as to everyone else, so one
      // handler covers both and there is no optimistic path to drift.
      setSession((prev) => (prev && prev.map_id === mapId ? { ...prev, map_active_level: levelIndex } : prev));
      setActiveLevel(Number(levelIndex) || 0);
    });

    socket.on('map_changed', ({ map, levels: newLevels, walls: newWalls, doors: newDoors, lights: newLights, tokens: newTokens, magicalDarkness: newDarkness, spawnPoint: newSpawn, spawnPoints: newSpawnPoints, terrain: newTerrain, ships: newShips, portals: newPortals, fowEnabled: newFowEnabled, spellTemplates: newTemplates, drawings: newDrawings, tiles: newTiles }) => {
      // Whether THIS board's patrols are held. Map-scoped like everything else
      // here: walking into the undercroft must not inherit the pause the GM set
      // on the courtyard, nor silently un-pause the courtyard.
      setPatrolsPaused(!!map?.patrols_paused);
      // Map-scoped state arrives with the map. Both of these used to persist
      // across a board change, so the last map's AOEs and ink came along.
      setSpellTemplates(Array.isArray(newTemplates) ? newTemplates : []);
      // Tiles are map-scoped and must be REPLACED, not kept. Leaving them put
      // was why a dungeon laid on one board appeared on every board visited
      // afterwards: nothing ever cleared the previous map's tiles.
      setTiles(Array.isArray(newTiles) ? newTiles : []);
      setDrawings(Array.isArray(newDrawings) ? newDrawings : []);
      setEditingTemplateId(null);
      setTerrain(newTerrain || []);
      setLevels(newLevels || []);
      // Back to the ground floor on every board change. Carrying the last
      // map's floor number across would land on a storey the new map may not
      // have, and "which floor am I on" should have an obvious answer the
      // moment a board appears.
      setActiveLevel(Number(map?.active_level) || 0);
      setShips(newShips || []);
      setSelectedShipId(null);
      setSelectedTerrainId(null);
      setSession((prev) => map ? ({
        ...prev, map_id: map.id,
        map_image: map.image_path, map_name: map.name,
        map_width: map.width, map_height: map.height,
        map_type: map.map_type || 'image',
        map_sky_image: map.sky_image_path || null,
        map_sky_preset: map.sky_preset || null,
        map_system: map.system_data || null,
        map_grid_cols: map.grid_cols ?? null, map_grid_rows: map.grid_rows ?? null,
        map_grid_size: map.grid_size ?? null,
        map_grid_type: map.grid_type || 'square',
        map_grid_scale: map.grid_scale ?? 5,
        map_grid_unit: map.grid_unit ?? 'ft',
        map_grid_scale_visible: !!map.grid_scale_visible,
      }) : ({ ...prev, map_id: null, map_image: null, map_name: null }));
      setWalls(newWalls  || []);
      setDoors(newDoors  || []);
      setLights(newLights || []);
      setTokens(newTokens || []);
      setMagicalDarkness(newDarkness || []);
      setSpawnPoint(newSpawn || { col: 0, row: 0 });
      if (newFowEnabled !== undefined) setFowEnabled(!!newFowEnabled);
      setPortals(newPortals || []);
      setPortalAnchor(null);
      if (map?.id != null) {
        setAllSpawnPoints(prev => ({ ...prev, [map.id]: newSpawnPoints || [] }));
      }
      setDmMarkers([]);
      // Don't override the session's grid_size with the map's stored
      // value here — sessions.grid_size is the source of truth (set
      // via the GM's grid-size slider) and the backend resolves
      // terrain wall coords against it. Overriding made walls land
      // off the artwork after a map switch.
    });

    socket.on('wall_added',   ({ wall })   => setWalls(prev => [...prev, wall]));
    socket.on('wall_deleted', ({ wallId }) => setWalls(prev => prev.filter(w => w.id !== wallId)));
    socket.on('walls_cleared', ()          => setWalls([]));

    socket.on('door_added',      ({ door })   => setDoors(prev => [...prev, door]));
    socket.on('door_deleted',    ({ doorId }) => setDoors(prev => prev.filter(d => d.id !== doorId)));
    socket.on('door_kind_changed', ({ doorId, portalKind }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, portal_kind: portalKind } : d)));
    socket.on('door_toggled',    ({ doorId, isOpen }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, is_open: isOpen } : d)));
    socket.on('door_dir_flipped', ({ doorId, openDir }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, open_dir: openDir } : d)));
    socket.on('door_sprite_changed', ({ doorId, spritePath, spriteMotion }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, sprite_path: spritePath, sprite_motion: spriteMotion } : d)));
    socket.on('door_label_changed', ({ doorId, label }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, label } : d)));
    socket.on('door_light_changed', ({ doorId, lightRadius, lightColor, lightSide }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, light_radius: lightRadius, light_color: lightColor, light_side: lightSide } : d)));
    socket.on('doors_cleared', () => setDoors([]));

    socket.on('light_added',   ({ light })   => setLights(prev => [...prev, light]));
    socket.on('light_deleted', ({ lightId }) => setLights(prev => prev.filter(l => l.id !== lightId)));
    socket.on('light_updated', ({ light })   => setLights(prev => prev.map(l => l.id === light.id ? light : l)));
    socket.on('lights_cleared', ()           => setLights([]));

    socket.on('magical_darkness_added',   ({ darkness }) => setMagicalDarkness(prev => [...prev, darkness]));
    socket.on('magical_darkness_deleted', ({ darknessId }) => setMagicalDarkness(prev => prev.filter(d => d.id !== darknessId)));
    socket.on('template_placed',   (tpl) => setSpellTemplates(prev => [...prev, tpl]));
    socket.on('template_updated',  (tpl) => setSpellTemplates(prev => prev.map(t => t.id === tpl.id ? tpl : t)));
    socket.on('template_deleted',  ({ id }) => {
      setSpellTemplates(prev => prev.filter(t => t.id !== id));
      setEditingTemplateId(prev => prev === id ? null : prev);
    });
    socket.on('templates_cleared', () => { setSpellTemplates([]); setEditingTemplateId(null); });
    socket.on('magical_darkness_cleared', () => setMagicalDarkness([]));
    socket.on('zone_feather_updated', ({ darknessId, featherAmount }) =>
      setMagicalDarkness(prev => prev.map(d => d.id === darknessId ? { ...d, feather_amount: featherAmount } : d)));
    socket.on('zone_height_updated', ({ darknessId, heightFt }) =>
      setMagicalDarkness(prev => prev.map(d => d.id === darknessId ? { ...d, height_ft: heightFt } : d)));
    socket.on('spawn_point_set', (payload) => setSpawnPoint(prev => ({
      col:    payload.col    !== undefined ? payload.col    : (prev?.col    ?? 0),
      row:    payload.row    !== undefined ? payload.row    : (prev?.row    ?? 0),
      radius: payload.radius !== undefined ? payload.radius : (prev?.radius ?? 0),
    })));

    socket.on('play_sound', ({ filename, volume }) => {
      const audio = new Audio(`/sounds/${encodeURIComponent(filename)}`);
      audio.volume = Math.max(0, Math.min(1, volume ?? 1.0));
      activeSoundsRef.current.push(audio);
      audio.addEventListener('ended', () => {
        activeSoundsRef.current = activeSoundsRef.current.filter(a => a !== audio);
      });
      audio.play().catch(() => {});
    });

    socket.on('stop_sounds', () => {
      activeSoundsRef.current.forEach(a => { a.pause(); a.currentTime = 0; });
      activeSoundsRef.current = [];
    });

    socket.on('play_ambient', ({ filename, volume }) => {
      const ctx = audioCtxRef.current;
      if (!ctx || !filename) return;
      const vol = Math.max(0, Math.min(1, volume ?? 0.5));

      const existing = ambientTracksRef.current.get(filename);
      if (existing) {
        const now = ctx.currentTime;
        existing.gain.gain.cancelScheduledValues(now);
        existing.gain.gain.setValueAtTime(existing.gain.gain.value, now);
        existing.gain.gain.linearRampToValueAtTime(vol, now + 0.2);
        return;
      }

      wantedAmbientsRef.current.add(filename);

      ctx.resume()
        .then(() => fetch(`/sounds/ambient/${encodeURIComponent(filename)}`))
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then(buf => ctx.decodeAudioData(buf))
        .then(decoded => {
          if (!wantedAmbientsRef.current.has(filename)) return;
          if (ambientTracksRef.current.has(filename)) return;
          const src  = ctx.createBufferSource();
          const gain = ctx.createGain();
          src.buffer = decoded;
          src.loop   = true;
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
          src.connect(gain);
          gain.connect(ctx.destination);
          src.start(0);
          ambientTracksRef.current.set(filename, { src, gain });
        })
        .catch(console.error);
    });

    socket.on('session_ambients_changed', (state) => {
      setRunningAmbients(state || {});
    });

    socket.on('stop_ambient_track', ({ filename }) => {
      const ctx = audioCtxRef.current;
      if (!ctx || !filename) return;
      wantedAmbientsRef.current.delete(filename);
      const track = ambientTracksRef.current.get(filename);
      if (!track) return;
      ambientTracksRef.current.delete(filename);
      const FADE = 2;
      track.gain.gain.cancelScheduledValues(ctx.currentTime);
      track.gain.gain.setValueAtTime(track.gain.gain.value, ctx.currentTime);
      track.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
      try { track.src.stop(ctx.currentTime + FADE); } catch (_) {}
    });

    socket.on('stop_ambient', () => {
      const ctx = audioCtxRef.current;
      wantedAmbientsRef.current.clear();
      if (!ctx) { ambientTracksRef.current.clear(); return; }
      const FADE = 2;
      const tracks = Array.from(ambientTracksRef.current.values());
      ambientTracksRef.current.clear();
      for (const t of tracks) {
        t.gain.gain.cancelScheduledValues(ctx.currentTime);
        t.gain.gain.setValueAtTime(t.gain.gain.value, ctx.currentTime);
        t.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
        try { t.src.stop(ctx.currentTime + FADE); } catch (_) {}
      }
    });

    socket.on('fow_changed', ({ enabled, mapId }) => {
      // Per-map now: ignore a flip aimed at a map we aren't looking at.
      // mapId null is the session-wide fallback (no map loaded), which
      // everyone still takes.
      if (mapId != null && Number(mapId) !== Number(sessionRef.current?.map_id)) return;
      setFowEnabled(enabled);
    });
    socket.on('fow_blur_changed',      ({ blur })               => setFowBlur(blur));
    socket.on('fow_color_changed',     ({ color })              => setFowColor(color || '#000000'));
    socket.on('ambient_light_changed', ({ ambientLight: al })   => setAmbientLight(al));
    socket.on('active_srd_edition_changed', ({ edition })       => setActiveSrdEdition(edition || 'both'));

    socket.on('live_map_view_changed', ({ on }) => setLiveMapView(!!on));

    socket.on('grid_size_changed', ({ gridSize: gs }) => {
      setGridSize(gs);
      setSession((prev) => ({ ...prev, grid_size: gs }));
    });

    socket.on('grid_style_changed', ({ gridColor: gc, gridThickness: gt }) => {
      if (gc) { setGridColor(gc); const p = parseRgba(gc); setGridHex(p.hex); setGridOpacity(p.opacity); }
      if (gt != null) setGridThickness(gt);
    });

    socket.on('token_name_font_size_changed', ({ tokenNameFontSize: ts }) => {
      if (Number.isFinite(ts)) setTokenNameFontSize(ts);
    });

    socket.on('spawn_map_changed', ({ spawnMapId: m }) => {
      setSpawnMapId(m == null ? null : Number(m));
    });

    socket.on('combat_changed', ({ active, currentTurn, tokenIds, shipIds }) => {
      setCombatActive(active);
      setCombatTurn(currentTurn);
      if (active && Array.isArray(shipIds)) {
        const shipSet = new Set(shipIds);
        setShips((prev) => prev.map((s) => ({ ...s, in_combat: shipSet.has(s.id) })));
      }
      if (!active) {
        setTokens((prev) => prev.map((t) => ({ ...t, in_combat: false })));
        // The server clears hulls too when a fight ends.
        setShips((prev) => prev.map((s) => ({ ...s, in_combat: false })));
      } else if (Array.isArray(tokenIds)) {
        const idSet = new Set(tokenIds);
        setTokens((prev) => prev.map((t) => ({ ...t, in_combat: idSet.has(t.id) })));
      }
    });

    socket.on('combat_turn_changed', ({ currentTurn }) => {
      setCombatTurn(currentTurn);
    });

    socket.on('tokens_added_to_combat', ({ tokenIds }) => {
      const idSet = new Set(tokenIds);
      setTokens((prev) => prev.map((t) => idSet.has(t.id) ? { ...t, in_combat: true } : t));
    });

    socket.on('user_color_changed', ({ name, color }) => {
      setUserColors((prev) => ({ ...prev, [name]: color }));
    });

    socket.on('users_updated', ({ users: u, connectionLog: cl }) => {
      setUsers(u);
      if (cl) setConnectionLog(cl);
    });

    socket.on('map_ping', ({ id, x, y, mapId, level, size }) => {
      if (mapId != null && mapId !== sessionRef.current?.map_id) return;
      const ts = Date.now();
      // `level` rides along for the 3D view, which raises the ping to that
      // storey. The flat map ignores it — it only ever draws one floor.
      setActivePings(prev => [...prev, { id, x, y, ts, level: Number(level) || 0, size }]);
      setTimeout(() => setActivePings(prev => prev.filter(p => p.id !== id)), 3500);
    });

    socket.on('fog_block_added', ({ fogBlock }) => {
      setFogBlocks(prev => [...prev, fogBlock]);
    });
    socket.on('fog_block_updated', ({ fogBlock }) => {
      setFogBlocks(prev => prev.map(fb => fb.id === fogBlock.id ? fogBlock : fb));
    });
    socket.on('fog_block_deleted', ({ id }) => {
      setFogBlocks(prev => prev.filter(fb => fb.id !== id));
    });

    socket.on('whisper_sent', ({ targetName, message, delivered }) => {
      setWhisperToast({ targetName, message, delivered, ts: Date.now() });
    });

    // A challenge landing, and what came back from it. The receipt reuses the
    // whisper toast: it answers the same question — did that actually reach
    // the phone, or is it asleep in somebody's pocket.
    socket.on('minigame_sent', ({ targetName, delivered }) => {
      setWhisperToast({ targetName, message: 'Challenge sent', delivered, ts: Date.now() });
    });
    socket.on('minigame_result', (r) => {
      setChallengeResults((prev) => [r, ...prev].slice(0, 20));
    });

    socket.on('dice_rolled', (data) => {
      const id = ++rollIdRef.current;
      setDiceRolls((prev) => [...prev, { ...data, id }]);
      setTimeout(() => setDiceRolls((prev) => prev.filter((r) => r.id !== id)), 5000);
      // The overlay is a 5-second flash; the log is the record.
      setRollLog((prev) => [...prev, data].slice(-200));
    });

    socket.on('table_rolled', (entry) => setRollLog((prev) => [...prev, entry].slice(-200)));

    // ── Freehand ink ──
    socket.on('draw_stroke', (stroke) => setDrawings((prev) => [...prev, stroke]));
    socket.on('draw_removed', ({ ids }) => {
      const gone = new Set(ids || []);
      setDrawings((prev) => prev.filter((d) => !gone.has(d.id)));
    });

    socket.on('measure_update', ({ meas, color, name }) => {
      setRemoteMeasurements(prev => {
        const filtered = prev.filter(m => m.name !== name);
        if (!meas) return filtered;
        return [...filtered, { name, meas, color }];
      });
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [code, pass]);

  useEffect(() => {
    fetch('/api/sounds').then(r => r.json()).then(setSoundFiles).catch(() => {});
    fetch('/api/sounds/ambient').then(r => r.json()).then(setAmbientFiles).catch(() => {});
    // Create AudioContext for GM ambient playback; unlock on first gesture
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    function unlock() {
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      audioCtxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === '1') setActiveTool('pan');
      if (e.key === '2') setActiveTool('move');
      if (e.key === '3') setActiveTool('ruler');
      if (e.key === '4') setActiveTool('cone');
      if (e.key === '5') setActiveTool('circle');
      if (e.key === 'f' || e.key === 'F') setActiveTool('door-erase');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleTokenMove(tokenId, col, row) {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, grid_col: col, grid_row: row } : t));
    socket.emit('move_token', { tokenId, gridCol: col, gridRow: row });
    applyLevelDrop(tokenId, col, row);
  }

  // Walking off a storey.
  //
  // A building's floors are pictures, so "is there floor here" is a question
  // about the art, and it can only be answered on the client where the images
  // are. The move itself has already gone; this is the consequence of it —
  // which keeps every existing mover (drag, arrow keys, a spell that shoves
  // someone) working without knowing levels exist.
  function applyLevelDrop(tokenId, col, row) {
    const tok = tokens.find((t) => t.id === tokenId);
    if (!tok) return;
    // The rule lives in utils/levelFloor.js so this view and the players' share
    // one copy — the move happens in several places and the consequence must
    // not differ by which one.
    const next = resolveLevelAfterMove({
      levels, token: tok, col, row,
      mapW: session.map_width, mapH: session.map_height,
      gridSize: effectiveGridSize,
      isGM: true,
      // The floor images load asynchronously; ask again once they have.
      onReady: () => applyLevelDrop(tokenId, col, row),
      debug: true,
    });
    if (!next) return;
    setTokens((prev) => prev.map((t) => (t.id === tokenId
      ? { ...t, level_index: next.levelIndex, grid_col: next.gridCol, grid_row: next.gridRow } : t)));
    socket.emit('set_token_level', {
      tokenId, levelIndex: next.levelIndex, gridCol: next.gridCol, gridRow: next.gridRow,
    });
    // Follow them, so the GM sees where the token went.
    socket.emit('set_map_level', { levelIndex: next.levelIndex });
  }

  function handleHPChange(tokenId, hp) {
    socket.emit('update_token_hp', { tokenId, currentHp: hp });
  }

  function handleTempHpChange(tokenId, tempHp) {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, temp_hp: tempHp } : t));
    socket.emit('update_token_temp_hp', { tokenId, tempHp });
  }

  function handleConditionsChange(tokenId, conditions) {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, conditions } : t));
    socket.emit('update_token_conditions', { tokenId, conditions });
  }

  function handleInitiativeChange(tokenId, initiative) {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, initiative } : t));
    socket.emit('update_token_initiative', { tokenId, initiative });
  }

  function handleNicknameChange(tokenId, nickname) {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, nickname: nickname || null } : t));
    socket.emit('update_token_nickname', { tokenId, nickname });
  }

  function handleToggleVisibility(tokenId) {
    socket.emit('toggle_token_visibility', { tokenId });
  }

  function handleToggleFlying(tokenId) {
    socket.emit('toggle_token_flying', { tokenId });
  }

  function handleRemoveToken(tokenId) {
    socket.emit('remove_token', { tokenId });
  }

  // `sizeSquares` is the gargantuan footprint override, in squares. Passing
  // undefined (a plain category change) clears it server-side, so switching a
  // resized creature down to Large doesn't leave it eight squares wide.
  function handleSizeChange(tokenId, size, sizeSquares) {
    socket.emit('update_token_size', { tokenId, size, sizeSquares });
  }

  function handleWallAdd(wallData) {
    if (!session) return;
    socket.emit('add_wall', { mapId: session.map_id, ...wallData });
  }

  function handleWallDelete(wallId) {
    socket.emit('delete_wall', { wallId });
  }

  function handleClearWalls() {
    if (!session?.map_id) return;
    if (!window.confirm('Clear all walls on this map?')) return;
    socket.emit('clear_walls', { mapId: session.map_id });
  }

  function handleDoorAdd(doorData) {
    if (!session) return;
    socket.emit('add_door', { mapId: session.map_id, ...doorData });
  }

  function handleDoorDelete(doorId) {
    socket.emit('delete_door', { doorId });
  }

  function handleClearDoors() {
    if (!session?.map_id) return;
    if (!window.confirm('Clear all doors on this map?')) return;
    socket.emit('clear_doors', { mapId: session.map_id });
  }

  // Make a blank tile map and switch everyone onto it.
  async function handleCreateTileMap() {
    if (!session?.id) return;
    try {
      const res = await fetch('/api/maps/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, name: 'Tile Map', grid_size: session.grid_size || 50 }),
      });
      if (!res.ok) return;
      const map = await res.json();
      await loadMaps(session.id);
      handleChangeMap(map.id);
    } catch { /* the map list will show it on the next refresh */ }
  }

  function handleDoorToggle(doorId) {
    socket.emit('toggle_door', { doorId });
  }

  function handleDoorFlip(doorId) {
    socket.emit('flip_door_dir', { doorId });
  }

  function handleDoorSpriteSet({ doorId, spritePath, spriteMotion }) {
    socket.emit('set_door_sprite', { doorId, spritePath, spriteMotion });
  }

  function handleDoorLabelSet(doorId, label) {
    socket.emit('set_door_label', { doorId, label });
  }

  function handleDoorLightSet(doorId, { radius, color, side }) {
    socket.emit('set_door_light', { doorId, radius, color, side });
  }

  async function handleDoorSpriteUpload(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('name', (file.name || 'Door').replace(/\.[^.]+$/, '').slice(0, 120));
    try {
      const r = await fetch('/api/door-sprites', { method: 'POST', body: fd });
      const row = await r.json();
      if (row && !row.error) setDoorSprites((prev) => [...prev, row]);
    } catch (err) { console.error('Door sprite upload failed', err); }
  }

  // Chosen once, applied by the server to every door created afterwards.
  // Optimistic: the panel updates immediately and only rolls back if the write
  // actually failed, so picking a default never feels like it lagged.
  async function handleDoorDefaultSet(next) {
    const prev = doorDefault;
    setDoorDefault(next);
    try {
      const r = await fetch('/api/settings/door_default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: next }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (err) {
      console.error('Could not save the default door', err);
      setDoorDefault(prev);
    }
  }

  async function handleDoorSpriteDelete(id) {
    try {
      const gone = doorSprites.find((sp) => sp.id === id);
      await fetch(`/api/door-sprites/${id}`, { method: 'DELETE' });
      setDoorSprites((prev) => prev.filter((s) => s.id !== id));
      // Deleting the art that WAS the default would otherwise leave every new
      // door pointing at a missing image — a broken texture rather than a
      // plain door, which is the worse of the two failures.
      if (gone && doorDefault.spritePath === gone.image_path) {
        handleDoorDefaultSet({ spritePath: null, spriteMotion: doorDefault.spriteMotion });
      }
    } catch (err) { console.error('Door sprite delete failed', err); }
  }

  function handleLightAdd(lightData) {
    if (!session) return;
    const spreadAngle = lightShape === 'cone' ? 60 : lightShape === 'panel' ? 180 : 360;
    socket.emit('add_light', { mapId: session.map_id, color: lightColor, spreadAngle, ...lightData });
  }

  function handleLightUpdate(lightId, updates) {
    socket.emit('update_light', { lightId, ...updates });
    setEditingLight(null);
  }

  function handleLightDelete(lightId) {
    socket.emit('delete_light', { lightId });
  }

  function handleClearLights() {
    if (!session?.map_id) return;
    if (!window.confirm('Clear all light sources on this map?')) return;
    socket.emit('clear_lights', { mapId: session.map_id });
  }

  function handleMagicalDarknessAdd(darknessData) {
    if (!session) return;
    socket.emit('add_magical_darkness', {
      sessionId: session.id,
      mapId: session.map_id || null,
      zoneType: darknessData.zoneType || 'darkness',
      // The storey the table is on. Both views draw one floor at a time, so
      // "here" always means the floor being worked on — without this a bank
      // drawn on an upper storey came back as a ground-floor object.
      levelIndex: activeLevel,
      ...darknessData,
    });
  }

  function handlePlaySound(filename) {
    socket.emit('play_sound', { filename, volume: soundVolume });
  }

  function handleStopSounds() {
    socket.emit('stop_sounds');
  }

  // Toggle a single ambient track in the layer on the GM's current
  // map. Reads the live server snapshot (runningAmbients) so the
  // toggle reflects whatever's actually playing — staying correct
  // even after a map switch auto-resyncs us into a different scene.
  function handlePlayAmbient(filename) {
    const tracksOnThisMap = runningAmbients[session?.map_id] || [];
    if (tracksOnThisMap.some(t => t.filename === filename)) {
      socket.emit('stop_ambient_track', { filename });
      return;
    }
    socket.emit('play_ambient', { filename, volume: ambientVolume });
  }

  // Live volume drag for one track in the current map's layer.
  // Server treats play_ambient as upsert (filename already in the
  // layer = volume update, with a short ramp to avoid clicks).
  function handleSetAmbientTrackVolume(filename, volume) {
    socket.emit('play_ambient', { filename, volume });
  }

  function handleStopAmbient() {
    socket.emit('stop_ambient');
  }

  function handleStopAmbientOnMap(mapId) {
    socket.emit('stop_ambient_on_map', { mapId });
  }

  async function handleSoundUpload(file) {
    if (!file) return;
    let category;
    if (uploadMainType === 'ambient') {
      category = 'ambient';
    } else if (uploadSubcat === 'custom') {
      category = uploadCustomName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-]/g, '') || 'other';
    } else {
      category = uploadSubcat;
    }
    setSoundUploading(true);
    try {
      const fd = new FormData();
      fd.append('category', category);  // must come before file so multer destination sees it
      fd.append('file', file);
      const res = await fetch('/api/sounds/upload', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Upload failed'); return; }
      if (category === 'ambient') {
        setAmbientFiles(await fetch('/api/sounds/ambient').then(r => r.json()));
        setSoundTab('ambience');
      } else {
        setSoundFiles(await fetch('/api/sounds').then(r => r.json()));
        setSoundTab('oneshots');
      }
    } finally {
      setSoundUploading(false);
    }
  }

  async function handleDeleteSound(relpath, isAmbient) {
    const displayName = relpath.split('/').pop();
    if (!confirm(`Delete "${displayName}"?`)) return;
    const encodedPath = relpath.split('/').map(encodeURIComponent).join('/');
    await fetch(`/api/sounds/${encodedPath}`, { method: 'DELETE' });
    if (isAmbient) {
      const fname = relpath.split('/').pop();
      setAmbientFiles(prev => prev.filter(f => f !== fname));
      // If this track was layered anywhere in the running scene, pull
      // it out so we're not trying to play a file we just deleted.
      const playingAnywhere = Object.values(runningAmbients || {})
        .some(list => Array.isArray(list) && list.some(t => t.filename === fname));
      if (playingAnywhere) socket.emit('stop_ambient_track', { filename: fname });
    } else {
      setSoundFiles(prev => prev.filter(f => f !== relpath));
    }
  }

  function handleZoneFeatherChange(darknessId, featherAmount) {
    setMagicalDarkness(prev => prev.map(d => d.id === darknessId ? { ...d, feather_amount: featherAmount } : d));
    socket.emit('update_zone_feather', { darknessId, featherAmount });
  }

  function handleMagicalDarknessDelete(darknessId) {
    socket.emit('delete_magical_darkness', { darknessId });
  }

  function handleSetSpawnPoint(col, row) {
    if (!session?.map_id) return;
    socket.emit('set_spawn_point', { mapId: session.map_id, col, row });
  }

  function handleClearMagicalDarkness() {
    if (!session) return;
    if (!window.confirm('Clear all magical darkness zones?')) return;
    socket.emit('clear_magical_darkness', { sessionId: session.id, mapId: session.map_id || null });
  }

  function handleAmbientLightChange(val) {
    setAmbientLight(val);
    if (!session) return;
    socket.emit('set_ambient_light', { sessionId: session.id, ambientLight: val });
  }

  function handleToggleFow() {
    if (!session) return;
    socket.emit('toggle_fow', { sessionId: session.id, mapId: session.map_id ?? null });
  }

  function handleFowBlurChange(val) {
    setFowBlur(val);
    if (!session) return;
    socket.emit('set_fow_blur', { sessionId: session.id, blur: val });
  }

  function handleFowColorChange(val) {
    // Accept anything the picker emits; only commit if it's a valid hex.
    // The backend re-validates (set_fow_color rejects bad values), so
    // typing partial hex into the text input doesn't push noise to the DB.
    const v = String(val || '').trim();
    setFowColor(v || '#000000');
    if (!session) return;
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return;
    socket.emit('set_fow_color', { sessionId: session.id, color: v });
  }

  function handleAddToMap(creature) {
    console.log('[place] handleAddToMap', creature?.name, creature?.id);
    setPlacingCreature(creature);
    setPanelOpen(false);
    setPanelTab('tokens');
  }

  // Token art choices for the creature currently being placed. Fetched on
  // demand rather than carried on the creature row — the library list would
  // otherwise haul every alternate for every creature on every load.
  //
  // `placingImage` is the GM's pick; null means "use the primary", which is
  // exactly what the server does with no imagePath, so a creature with one
  // image needs no extra clicks and behaves as it always did.
  const [placingImages, setPlacingImages] = useState([]);
  const [placingImage, setPlacingImage] = useState(null);

  // ── Backdrops ────────────────────────────────────────────────────────────
  // Scene art pushed to the players' screens in place of the map. `liveBackdrop`
  // is the one currently on their screens; null means they're seeing the map.
  // The GM's own view never changes, so this is the only readout of what the
  // table is actually looking at — hence the banner over the map too.
  // ── Lobby ────────────────────────────────────────────────────────────────
  // Who's waiting, and whether the doors are open. sessionStarted mirrors
  // sessions.session_started; the roster is ephemeral server-side state.
  const [lobbyRoster, setLobbyRoster] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(true);

  useEffect(() => {
    const onLobby = ({ roster }) => setLobbyRoster(Array.isArray(roster) ? roster : []);
    const onStarted = ({ started }) => setSessionStarted(!!started);
    socket.on('lobby_updated', onLobby);
    socket.on('session_started_changed', onStarted);
    return () => {
      socket.off('lobby_updated', onLobby);
      socket.off('session_started_changed', onStarted);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    // Sessions predating the column read as undefined — treat as started.
    setSessionStarted(session.session_started !== false);
  }, [session?.session_started]); // eslint-disable-line react-hooks/exhaustive-deps

  function setSessionOpen(started) {
    if (!session) return;
    socket.emit('set_session_started', { sessionId: session.id, started });
  }

  // Bulk-move every player token onto the map the GM is looking at, and take
  // the players out of the lobby in the same gesture.
  function spawnPlayersToMap() {
    if (!session) return;
    socket.emit('spawn_players_to_map', { sessionId: session.id });
  }

  const [backdrops, setBackdrops] = useState([]);
  const [liveBackdrop, setLiveBackdrop] = useState(null);
  const [backdropBusy, setBackdropBusy] = useState(false);
  const [backdropError, setBackdropError] = useState('');

  const reloadBackdrops = useCallback(async () => {
    if (!session?.id) return;
    try {
      const res = await fetch(`/api/backdrops?session_id=${session.id}`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      setBackdrops(await res.json());
    } catch (err) {
      setBackdropError(err.message);
    }
  }, [session?.id]);

  useEffect(() => { reloadBackdrops(); }, [reloadBackdrops]);

  // Leaving the 3D view drops its door menu. Without this, flipping back in
  // later re-renders the one that was open when you left, at the coordinates
  // it had then.
  useEffect(() => { if (!show3D) setDoor3DMenu(null); }, [show3D]);

  // A creature's 3D standing art changed — a fresh upload, or the GM picking a
  // different look from the wardrobe. Tokens carry `creature_standee` from the
  // JOIN made when the map loaded, so the board needs patching or the figure
  // only changes on the next reload.
  useEffect(() => {
    const onStandee = ({ creatureId, standeeImagePath }) => {
      setTokens((prev) => prev.map((t) => (Number(t.creature_id) === Number(creatureId)
        ? { ...t, creature_standee: standeeImagePath } : t)));
    };
    socket.on('creature_standee_changed', onStandee);
    return () => socket.off('creature_standee_changed', onStandee);
  }, []);

  // The tile map grew to fit a tile laid past its edge.
  //
  // A plain grow leaves every existing coordinate where it was, so only the
  // map's dimensions need patching. A SHIFT moved the origin and therefore
  // everything on the board, so the whole map state is re-read — through the
  // same /state route a map switch already uses.
  useEffect(() => {
    const onResized = async ({ mapId, width, height, gridCols, gridRows, shifted }) => {
      if (sessionRef.current?.map_id !== mapId) return;
      setSession((prev) => (prev ? {
        ...prev, map_width: width, map_height: height,
        map_grid_cols: gridCols, map_grid_rows: gridRows,
      } : prev));
      if (!shifted) return;
      try {
        const r = await fetch(`/api/maps/${mapId}/state?session_id=${sessionRef.current.id}&role=dm`);
        if (!r.ok) return;
        const d = await r.json();
        setTiles(d.tiles || []);
        setTokens(d.tokens || []);
        setWalls(d.walls || []);
        setDoors(d.doors || []);
        setTerrain(d.terrain || []);
      } catch { /* the next map change will resync */ }
    };
    socket.on('map_resized', onResized);
    return () => socket.off('map_resized', onResized);
  }, []);

  // Tile maps: the board and the deck. Followed from the broadcast rather
  // than set optimistically, so a second GM tab sees the same dungeon and
  // the same card counts as this one.
  useEffect(() => {
    const onPlaced = ({ tile }) => {
      // For THIS board only. The broadcast goes to the whole session, so a tile
      // laid on another map would otherwise be appended to whatever board this
      // tab happens to be showing.
      const here = sessionRef.current?.map_id ?? null;
      if (tile?.map_id != null && here != null && tile.map_id !== here) return;
      setTiles((p) => (p.some((x) => x.id === tile.id) ? p : [...p, tile]));
      // It is on the board now, so the ghost has done its job.
      setStagedTile(null);
      // A DRAWN card is cleared by the server's tiles_card_drawn broadcast,
      // because the pending pile is server state every GM tab shares. A tile
      // picked from the library is not on any pile, so nothing would ever
      // clear it — and the GM would be left holding the one they just laid.
      setPendingTile((p) => (p && p.direct ? null : p));
    };
    const onRemoved = ({ tileId }) => setTiles((p) => p.filter((x) => x.id !== tileId));
    const onDrawn = ({ card, counts }) => {
      setPendingTile(card || null);
      // A fresh card starts unrotated: carrying the last tile's rotation
      // over is a surprise, and the GM has to look at the new one anyway.
      setTileRotation(0);
      // ...and unstaged, or the new card would appear already sitting
      // wherever the last one was being lined up.
      setStagedTile(null);
      if (counts) setTileCounts(counts);
    };
    const onDeck = ({ counts }) => { if (counts) setTileCounts(counts); };
    socket.on('tiles_placed', onPlaced);
    socket.on('tiles_removed', onRemoved);
    socket.on('tiles_card_drawn', onDrawn);
    socket.on('tiles_deck_changed', onDeck);
    return () => {
      socket.off('tiles_placed', onPlaced);
      socket.off('tiles_removed', onRemoved);
      socket.off('tiles_card_drawn', onDrawn);
      socket.off('tiles_deck_changed', onDeck);
    };
  }, []);

  // The session was renamed — from this tab or another one.
  useEffect(() => {
    const onRenamed = ({ name }) => setSession((prev) => (prev ? { ...prev, name } : prev));
    socket.on('session_renamed', onRenamed);
    return () => socket.off('session_renamed', onRenamed);
  }, []);

  // Same reasoning as the backdrop listener below: follow our own broadcast
  // rather than setting state optimistically, so the panel shows the schedule
  // the players actually have — including one set from a second GM tab.
  useEffect(() => {
    const onNextSession = ({ at, note, minutes }) => {
      setSession((prev) => (prev ? {
        ...prev,
        next_session_at: at ?? null,
        next_session_note: note || '',
        next_session_minutes: minutes ?? 180,
      } : prev));
    };
    socket.on('next_session_changed', onNextSession);
    return () => socket.off('next_session_changed', onNextSession);
  }, []);

  // Follow our own broadcast rather than setting state optimistically — the
  // GM's panel then shows what the players are genuinely being shown, even if
  // a second GM tab pushed a different scene.
  useEffect(() => {
    const onChanged = ({ backdrop }) => {
      setLiveBackdrop(backdrop || null);
      // "Show image to players" mints the backdrop server-side, so this may be
      // the panel's first sight of it — refresh the list so it's there to
      // rename, re-push or delete like any other scene.
      if (backdrop?.id) reloadBackdrops();
    };
    socket.on('backdrop_changed', onChanged);
    return () => socket.off('backdrop_changed', onChanged);
  }, [reloadBackdrops]);

  useEffect(() => {
    if (!session) return;
    setLairAction({
      enabled: !!session.lair_action_enabled,
      note: session.lair_action_note || '',
    });
  }, [session?.lair_action_enabled, session?.lair_action_note]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed the label defaults from the session row so reopening the GM view
  // shows the switches as they actually are, not reset to off.
  useEffect(() => {
    if (!session) return;
    setLabelDefaults({
      hideName: !!session.default_hide_token_names,
      hideHp: !!session.default_hide_token_hp,
    });
  }, [session?.default_hide_token_names, session?.default_hide_token_hp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed from the session so reopening the GM view shows the live scene.
  useEffect(() => {
    if (!session) return;
    setLiveBackdrop(session.backdrop_id && session.backdrop_image
      ? {
          id: session.backdrop_id,
          name: session.backdrop_name,
          image_path: session.backdrop_image,
          // Carried so the token menu still reads "Stop showing image" after a
          // GM refresh, rather than offering to push what's already up.
          source_image_path: session.backdrop_source || null,
        }
      : null);
  }, [session?.backdrop_id, session?.backdrop_image]); // eslint-disable-line react-hooks/exhaustive-deps

  function pushBackdrop(b) {
    if (!session) return;
    socket.emit('set_backdrop', { sessionId: session.id, backdropId: b ? b.id : null });
  }

  async function handleBackdropUpload(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length || !session?.id) return;
    setBackdropBusy(true);
    setBackdropError('');
    try {
      const fd = new FormData();
      for (const f of files) fd.append('images', f);
      fd.append('session_id', session.id);
      const res = await fetch('/api/backdrops', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Upload failed (${res.status})`);
      await reloadBackdrops();
    } catch (err) {
      setBackdropError(err.message);
    } finally {
      setBackdropBusy(false);
    }
  }

  async function handleBackdropDelete(b) {
    if (!window.confirm(`Delete backdrop "${b.name}"? This cannot be undone.`)) return;
    setBackdropBusy(true);
    try {
      const res = await fetch(`/api/backdrops/${b.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      // Deleting the live scene drops the table back to the map. The DB's
      // ON DELETE SET NULL handles the row; this is what clears the screens.
      if (liveBackdrop?.id === b.id) pushBackdrop(null);
      await reloadBackdrops();
    } catch (err) {
      setBackdropError(err.message);
    } finally {
      setBackdropBusy(false);
    }
  }

  useEffect(() => {
    if (!placingCreature) { setPlacingImages([]); setPlacingImage(null); return; }
    let cancelled = false;
    setPlacingImage(null);
    fetch(`/api/creatures/${placingCreature.id}/images`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => { if (!cancelled) setPlacingImages(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setPlacingImages([]); });
    return () => { cancelled = true; };
  }, [placingCreature]);

  function handleMapClick(col, row, exact) {
    // Laying down a patrol route: every click is a waypoint, and nothing else
    // happens until the GM says the route is finished.
    //
    // The EXACT point, not the snapped square. A waypoint is a place on a path,
    // not a square a creature stands in, and snapping it to the middle of a
    // square moved the route off wherever the GM actually pointed — by up to
    // half a square, which on a corridor two squares wide reads as the line
    // running through the wall, or through the corner of the guard walking it.
    // Rounded to a hundredth of a square: finer than anyone can click, and it
    // keeps the stored route readable.
    if (patrolDraft) {
      const p = exact || { col, row };
      const at = { col: Math.round(Number(p.col) * 100) / 100, row: Math.round(Number(p.row) * 100) / 100 };
      setPatrolDraft((d) => (d ? { ...d, points: [...d.points, at] } : d));
      return;
    }
    if (placingMarkerType && session) {
      const mtype = DM_MARKER_TYPES.find(m => m.type === placingMarkerType);
      socket.emit('add_dm_marker', {
        markerType: placingMarkerType,
        label: mtype?.label || placingMarkerType,
        note: '',
        gridCol: col,
        gridRow: row,
      });
      setPlacingMarkerType(null);
      return;
    }
    if (!placingCreature || !session) return;
    // Drop the creature CENTRED on the square you clicked.
    //
    // grid_col/grid_row are a token's top-left, and the click used to be written
    // straight into them — so anything bigger than one square landed down and to
    // the right of the cursor, by half its own size. A gargantuan placed by
    // clicking its intended centre appeared ten squares away from it.
    // Terrain placement already did this; tokens didn't.
    //
    // The rounding keeps a square-grid drop flush with the lattice, which is
    // why it only applies to whole-cell input: a hex map hands us the
    // fractional centre of the hex that was clicked (hex columns don't line up
    // with integer grid columns), and rounding that would shove the token back
    // onto the nearest square cell — off the hex the GM aimed at.
    const centred = (v, extent) => {
      const raw = v - (Number(extent) - 1) / 2;
      return Number.isInteger(v) ? Math.round(raw) : raw;
    };
    const fp = tokenFootprint(placingCreature);
    const gridCol = centred(col, fp.gridW);
    const gridRow = centred(row, fp.gridH);
    console.log('[place] emitting add_token', placingCreature.name, gridCol, gridRow);
    socket.emit('add_token', {
      sessionId: session.id,
      mapId: session.map_id || null,
      creatureId: placingCreature.id,
      gridCol,
      gridRow,
      // Omitted when the GM hasn't picked an alternate — the server falls back
      // to the creature's primary portrait.
      imagePath: placingImage,
    });
    setPlacingCreature(null);
    setPanelOpen(true);
    setPanelTab('tokens');
  }

  // Pinging, from either view.
  //
  // `opts.level` is the 3D view telling us which storey the ping belongs to;
  // the flat map has no opinion (it only ever draws one floor), so it omits it
  // and the storey the table is on is the right answer. `opts.size` comes from
  // which of the ping tools is up.
  function handlePingMap(x, y, opts = {}) {
    socket.emit('dm_ping', {
      x, y,
      mapId: session?.map_id ?? null,
      level: opts.level ?? activeLevel,
      size: opts.size || 'small',
    });
  }

  // Shared by both views. The flat map and the 3D view resolve a click to the
  // same grid coordinates, so the placement itself is one function rather than
  // one per view — the alternative is two copies that drift.
  function handleTerrainPlace(piece, col, row) {
    socket.emit('place_terrain', {
      libraryId: piece.id,
      gridCol: col,
      gridRow: row,
      width: piece.default_w,
      height: piece.default_h,
    });
    setPendingTerrain(null);
  }

  function handleDmMarkerClick(marker) {
    setEditingMarker({ ...marker });
  }

  function handleMeasureChange(meas) {
    socket.emit('measure_update', { meas, color: '#ffd700' });
  }

  function handleChangeMap(mapId) {
    if (!session) return;
    socket.emit('change_map', { sessionId: session.id, mapId });
  }

  // Clearing the session's map is what "go to the lobby" actually means —
  // there's no separate lobby room, it's the state of having no map. Remember
  // where we came from so the trip is round: without this the GM has to hunt
  // for the map again in the Maps tab to resume play.
  function handleGoToLobby() {
    if (!session?.map_id) return;
    if (!window.confirm('Send everyone to the lobby? The current map is unloaded for all players — you can send them back afterwards.')) return;
    setPreLobbyMapId(session.map_id);
    handleChangeMap(null);
  }

  async function handleDeleteMap(e, mapId) {
    e.stopPropagation();
    if (!window.confirm('Delete this map? This cannot be undone.')) return;
    await fetch(`/api/maps/${mapId}`, { method: 'DELETE' });
    await loadMaps(session?.id);
    // If deleted map was active, clear the session map
    if (session?.map_id === mapId) {
      socket.emit('change_map', { sessionId: session.id, mapId: null });
    }
  }

  // Grid size is per map. The session-wide `change_grid_size` is still emitted
  // so a freshly uploaded map inherits a sensible default, but what actually
  // sizes THIS map's grid is the map row.
  //
  // The map write is debounced because this fires on every step of a slider
  // DRAG, and each write is a PATCH plus a full map re-broadcast — undebounced
  // that's a hundred round trips to drag from 50 to 256. Local state updates
  // immediately, so the grid still resizes under the cursor in real time; only
  // the persist waits for the GM to stop moving.
  const gridSizePatchTimer = useRef(null);
  function handleGridSizeChange(newSize) {
    if (!session) return;
    setGridSize(newSize);
    setSession(prev => ({ ...prev, map_grid_size: newSize }));
    socket.emit('change_grid_size', { sessionId: session.id, gridSize: newSize });
    if (!session.map_id) return;
    clearTimeout(gridSizePatchTimer.current);
    gridSizePatchTimer.current = setTimeout(() => {
      patchActiveMapGrid({ grid_size: newSize }, { map_grid_size: newSize });
    }, 300);
  }

  // Square or hex lattice, stored on the MAP rather than the session — an
  // overland hexcrawl and the dungeon it leads into belong to one campaign.
  //
  // Grid size / colour / thickness are session-wide and ride their own socket
  // events; this is a map row, so it goes through the maps REST route and then
  // re-broadcasts the map to push it to players. Re-sending the whole map is
  // more than strictly needed, but this is a once-per-map GM action and it
  // reuses the one path every client already handles correctly.
  async function handleGridTypeChange(type) {
    return patchActiveMapGrid({ grid_type: type }, { map_grid_type: type });
  }

  // Shared write path for the per-map grid settings (shape + scale key). PATCH
  // the map row, refresh the GM's own list, then re-broadcast the map so
  // players and the TV pick it up — `change_map` is the one path every client
  // already handles, and these are rare GM actions.
  //
  // `local` is applied optimistically so the control doesn't lag a round trip;
  // the broadcast overwrites it with whatever actually persisted.
  async function patchActiveMapGrid(body, local) {
    if (!session?.map_id) return;
    setSession(prev => ({ ...prev, ...local }));
    try {
      const res = await fetch(`/api/maps/${session.map_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      await loadMaps(session.id);
      socket.emit('change_map', { sessionId: session.id, mapId: session.map_id });
    } catch {}
  }

  // Put the live map on the party's screens, or take it back off.
  //
  // This REVEALS the whole map — fog and all — for as long as it's on, which is
  // the point on an overland map but is a genuine reveal on a dungeon. Hence an
  // explicit toggle that nothing else turns on for you.
  function handleLiveMapViewToggle(on) {
    if (!session) return;
    setLiveMapView(on);
    socket.emit('set_live_map_view', { sessionId: session.id, on });
  }

  // The GM's visible map rectangle, relayed to the followers. MapStage hands
  // this over on a trailing animation frame, so a pan is a stream of frames
  // rather than a stream of socket writes; the server keeps only the latest.
  const handleCameraRect = useCallback((camera) => {
    const sid = sessionRef.current?.id;
    if (!sid) return;
    socket.emit('live_map_camera', { sessionId: sid, camera });
  }, []);

  function handleGridStyleChange({ hex, opacity, thickness } = {}) {
    if (!session) return;
    const h = hex !== undefined ? hex : gridHex;
    const o = opacity !== undefined ? opacity : gridOpacity;
    const t = thickness !== undefined ? thickness : gridThickness;
    if (hex !== undefined) setGridHex(h);
    if (opacity !== undefined) setGridOpacity(o);
    if (thickness !== undefined) setGridThickness(t);
    const color = hexOpacityToRgba(h, o);
    setGridColor(color);
    socket.emit('change_grid_style', { sessionId: session.id, gridColor: color, gridThickness: t });
  }

  // Compute the centre of a token in map-pixel coordinates. Token grid
  // position lives in `grid_col` / `grid_row` (NOT `col` / `row` — that
  // bit me once already), and large/huge/gargantuan tokens occupy
  // multiple cells so the centre offset has to use the size's gridW/H.
  function tokenCenter(t) {
    const sz = tokenFootprint(t);
    const col = Number(t.grid_col) || 0;
    const row = Number(t.grid_row) || 0;
    return {
      x: col * gridSize + (sz.gridW * gridSize) / 2,
      y: row * gridSize + (sz.gridH * gridSize) / 2,
    };
  }

  // Build the wall+door segment list once and ask "is the line from
  // viewer to candidate blocked?". Used as the auto-select rule for
  // Start Combat — only tokens the viewer can actually see are pre-ticked.
  // The viewer token is always considered visible to itself.
  function computeVisibleTokenIds(viewerId) {
    const viewer = tokens.find((t) => t.id === viewerId);
    if (!viewer) return new Set();
    // doorToSegments handles open/closed + sprite-leaf occlusion itself, so
    // pass every door rather than pre-filtering out the open ones.
    const segs = [...wallsToSegments(walls), ...doorsToSegments(doors)];
    const v = tokenCenter(viewer);
    const out = new Set([viewer.id]);
    for (const t of tokens) {
      if (t.id === viewer.id || t.is_hidden) continue;
      const c = tokenCenter(t);
      if (!lineBlocked(v.x, v.y, c.x, c.y, segs)) out.add(t.id);
    }
    return out;
  }

  // Picks the viewer used for the LOS auto-select and sets the picker state
  // accordingly. Pulled out so it's reusable from the in-modal dropdown.
  function applyViewerToPicker(viewerId) {
    setCombatPickerViewerId(viewerId);
    if (viewerId) {
      const autoIds = computeVisibleTokenIds(viewerId);
      setCombatPickerAutoIds(autoIds);
      setCombatPickerSelection(new Set(autoIds));
    } else {
      setCombatPickerAutoIds(new Set());
      setCombatPickerSelection(new Set(tokens.filter((t) => !t.is_hidden).map((t) => t.id)));
    }
  }

  function handleStartCombat() {
    if (!session) return;
    // Default the viewer to whatever's currently selected on the map. The
    // dropdown inside the picker lets the GM swap viewers or clear it.
    setCombatPickerMode('start');
    applyViewerToPicker(selectedToken || null);
    // Every hull on the map starts ticked: a ship is hard to miss, and the LOS
    // auto-select is a token idea (ships have no vision of their own).
    setCombatPickerShipSelection(new Set(ships.map((s) => s.id)));
    setShowCombatPicker(true);
  }

  // One-click "add this token to combat" used by the per-token panel button.
  // Skips the picker entirely — useful when reinforcements walk in one at
  // a time and the GM just wants them on the initiative track.
  function handleAddSingleTokenToCombat(tokenId) {
    if (!session || !combatActive) return;
    const t = tokens.find((x) => x.id === tokenId);
    if (!t || t.in_combat) return;
    socket.emit('add_tokens_to_combat', { sessionId: session.id, tokenIds: [tokenId] });
    // Optimistic local update — the server broadcast will re-confirm.
    setTokens((prev) => prev.map((x) => x.id === tokenId ? { ...x, in_combat: true } : x));
  }

  // Mid-combat reinforcement: opens the picker with no auto-selection so the
  // GM can hand-pick which (already-on-map) tokens to add. Anything currently
  // in_combat is filtered out by CombatPicker.
  function handleAddToCombat() {
    if (!session) return;
    setCombatPickerSelection(new Set());
    setCombatPickerShipSelection(new Set());
    setCombatPickerAutoIds(new Set());
    setCombatPickerViewerId(null);
    setCombatPickerMode('add');
    setShowCombatPicker(true);
  }

  function handleConfirmCombat() {
    if (!session) return;
    const tokenIds = [...combatPickerSelection];
    const shipIds = [...combatPickerShipSelection];
    if (combatPickerMode === 'add') {
      if (tokenIds.length > 0) {
        socket.emit('add_tokens_to_combat', { sessionId: session.id, tokenIds });
      }
      // No bulk add for hulls — there are rarely more than a couple, and
      // set_ship_combat is already the toggle the hull menu uses.
      for (const shipId of shipIds) {
        socket.emit('set_ship_combat', { shipId, inCombat: true });
      }
    } else {
      socket.emit('set_combat', { sessionId: session.id, active: true, tokenIds, shipIds });
    }
    setShowCombatPicker(false);
  }

  function handleEndCombat() {
    if (!session) return;
    socket.emit('set_combat', { sessionId: session.id, active: false });
  }

  // combat_turn is stored CUMULATIVELY (it no longer wraps) so the round
  // number and elapsed in-game clock can be derived from it. Every reader
  // already takes `combatTurn % length` to find the active combatant, so
  // letting it run past the combatant count is safe.
  function handleNextTurn() {
    if (!session) return;
    socket.emit('next_combat_turn', { sessionId: session.id, currentTurn: combatTurn + 1 });
  }

  // Step back one turn after a mis-click. Clamped at 0 so combat can't
  // rewind past the top of round 1.
  function handlePrevTurn() {
    if (!session) return;
    if (combatTurn <= 0) return;
    socket.emit('next_combat_turn', { sessionId: session.id, currentTurn: combatTurn - 1 });
  }

  function handleSetUserColor(name, color) {
    socket.emit('set_user_color', { name, color });
    setUserColors((prev) => ({ ...prev, [name]: color }));
  }

  async function handleMapUpload(e) {
    const file = e.target.files[0];
    if (!file || !session) return;
    setMapUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', file.name.replace(/\.[^.]+$/, ''));
      fd.append('grid_size', gridSize);
      fd.append('session_id', session.id);
      const res = await fetch('/api/maps', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadMaps(session.id);
      handleChangeMap(data.id);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setMapUploading(false);
      e.target.value = '';
    }
  }

  // Wildspace map: the uploaded image is a fixed starscape backdrop, not the
  // play surface. Size comes from the square counts, so the art only ever has
  // to cover a screen no matter how large the encounter area is.
  async function handleWildspaceUpload(e) {
    const file = e.target.files[0];
    if (!file || !session) return;
    setMapUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', file.name.replace(/\.[^.]+$/, ''));
      fd.append('grid_size', gridSize);
      fd.append('session_id', session.id);
      fd.append('grid_cols', wildspaceCols);
      fd.append('grid_rows', wildspaceRows);
      const res = await fetch('/api/maps/wildspace', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadMaps(session.id);
      handleChangeMap(data.id);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setMapUploading(false);
      e.target.value = '';
    }
  }

  // Generate a star-system map. No upload: the art is drawn server-side from
  // the star and ring counts, and the GM populates it with planet tokens.
  async function handleGenerateSystem() {
    if (!session || systemGenerating) return;
    setSystemGenerating(true);
    try {
      const res = await fetch('/api/maps/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${systemStars > 1 ? `${systemStars}-Star` : 'Star'} System`,
          session_id: session.id,
          grid_size: gridSize,
          grid_cols: systemCols,
          grid_rows: systemRows,
          stars: systemStars,
          rings: systemRings,
          grid_type: 'hex',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadMaps(session.id);
      handleChangeMap(data.id);
    } catch (err) {
      alert('Could not generate the system: ' + err.message);
    } finally {
      setSystemGenerating(false);
    }
  }

  // Swap the artwork under an existing map, keeping its walls, doors, lights,
  // terrain and tokens exactly where they are.
  async function handleSwapMapArt(e, mapId) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !session) return;
    setSwappingMapArt(mapId);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`/api/maps/${mapId}/image`, { method: 'PUT', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadMaps(session.id);
      // Re-broadcast the map so every client picks up the new file — the path
      // changes on swap, so a cached image can't linger.
      if (session.map_id === mapId) handleChangeMap(mapId);
      if (data.sizeChanged) {
        alert(
          `Artwork swapped.\n\n` +
          `The new image is ${data.naturalWidth}×${data.naturalHeight}, but this map stays ` +
          `${data.map.width}×${data.map.height} so its walls, lights and tokens keep their positions — ` +
          `the new art is scaled to fit. Use art the same size as the original for a pixel-perfect swap.`
        );
      }
    } catch (err) {
      alert('Could not swap map artwork: ' + err.message);
    } finally {
      setSwappingMapArt(null);
    }
  }

  // Stage a multilevel import. Files come back from the browser in an
  // arbitrary order, so they are listed for the GM to sort rather than assumed
  // to be bottom-up; the name is seeded from the filename because that is
  // usually already "ground", "first", "roof".
  function handleLevelFilesPicked(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setLevelImport({
      rows: files.map((f) => ({
        file: f,
        name: f.name.replace(/\.dd2vtt$/i, '').slice(0, 80),
        height: 10,
      })),
    });
  }

  function moveLevelRow(from, to) {
    setLevelImport((cur) => {
      if (!cur) return cur;
      if (to < 0 || to >= cur.rows.length) return cur;
      const rows = [...cur.rows];
      const [row] = rows.splice(from, 1);
      rows.splice(to, 0, row);
      return { ...cur, rows };
    });
  }

  // ── Managing the storeys of the map already loaded ────────────────────────
  //
  // Reordering renumbers the walls, doors, lights and tokens on each storey as
  // well as the level rows — a floor's index is what everything standing on it
  // points at — so it is one server operation rather than something assembled
  // here.
  // Save one storey's transition list.
  async function saveTransitions(levelIndex, transitions) {
    if (!session?.map_id) return null;
    const r = await fetch(`/api/maps/${session.map_id}/levels/${levelIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transitions }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.error) throw new Error(d.error);
    return d;
  }

  // Place a staircase at a square, linking this storey to another.
  //
  // BOTH ends are written. A stair you can climb but not descend is a bug
  // waiting to be reported, and since every storey shares the map's coordinate
  // space the far end is the same square on the other floor — which is what a
  // staircase actually is.
  // Ask once which storey the stairs lead to, then stay in the mode so several
  // can be drawn.
  function startPlacingStairs() {
    if (placingStair) { setPlacingStair(null); return; }
    if (levels.length <= 1) return;
    const others = levels.filter((l) => l.level_index !== activeLevel);
    const answer = window.prompt(
      `Stairs from "${activeLevelRow?.name || `Level ${activeLevel}`}" to which level?\n`
      + others.map((l) => `${l.level_index} — ${l.name || `Level ${l.level_index}`}`).join('\n')
      + '\n\nThen drag out each staircase. Click the button again when done.',
      String(others[0]?.level_index ?? '')
    );
    if (answer === null) return;
    const to = Math.trunc(Number(answer));
    if (!levels.some((l) => l.level_index === to) || to === activeLevel) return;
    setPlacingStair({ toLevel: to });
  }

  // One staircase, in fractional grid units exactly as it was drawn. The mode
  // stays on — a building has more than one.
  async function placeStairAt(col, row, w, h) {
    if (!placingStair || levels.length <= 1) return;
    const to = placingStair.toLevel;
    if (!levels.some((l) => l.level_index === to) || to === activeLevel) return;

    const c = Number(col), r = Number(row);
    const ww = Math.max(0.2, Number(w) || 1);
    const hh = Math.max(0.2, Number(h) || 1);
    const here = levels.find((l) => l.level_index === activeLevel);
    const there = levels.find((l) => l.level_index === to);
    // Both ends land on the same footprint: the storeys share the map's
    // coordinate space, so a staircase occupies the same rectangle on each.
    const mk = (toLevel) => ({
      col: c, row: r, w: ww, h: hh, kind: 'stairs',
      to_col: c, to_row: r, to_level: toLevel,
    });
    try {
      const a = await saveTransitions(activeLevel, [...(here?.transitions || []), mk(to)]);
      const b = await saveTransitions(to, [...(there?.transitions || []), mk(activeLevel)]);
      setLevels((prev) => prev.map((l) => {
        if (l.level_index === activeLevel && a) return a;
        if (l.level_index === to && b) return b;
        return l;
      }));
    } catch (err) {
      alert('Could not place the stairs: ' + err.message);
    }
  }

  // Adjust ONE storey's copy of a staircase.
  //
  // Only the level being looked at is written. The far end keeps whatever
  // footprint it has: a flight of stairs occupies a different rectangle on the
  // floor it leaves than on the one it arrives at, and forcing them to match
  // was only ever a convenience at creation time.
  async function adjustStair(idx, rect) {
    const here = levels.find((l) => l.level_index === activeLevel);
    if (!here || !Array.isArray(here.transitions) || !here.transitions[idx]) return;
    const next = here.transitions.map((t, i) => (i === idx
      ? { ...t, col: rect.col, row: rect.row, w: rect.w, h: rect.h }
      : t));
    // Local first — a drag that waits on the server to redraw feels broken.
    setLevels((prev) => prev.map((l) => (l.level_index === activeLevel ? { ...l, transitions: next } : l)));
    try {
      const saved = await saveTransitions(activeLevel, next);
      if (saved) setLevels((prev) => prev.map((l) => (l.level_index === activeLevel ? saved : l)));
    } catch (err) {
      alert('Could not move the stairs: ' + err.message);
    }
  }


  // Remove one staircase — both ends of it.
  //
  // Matched by GEOMETRY rather than by identity: transitions are plain JSON with
  // no ids, and the two ends were written with the same rectangle, so the far
  // end is the one at the same place pointing back here. An epsilon because
  // these are fractional and survive a round trip through JSON.
  async function removeStair(tr) {
    if (!tr || !session?.map_id) return;
    const here = levels.find((l) => l.level_index === activeLevel);
    if (!here) return;
    const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001;
    const sameSpot = (t) => near(t.col, tr.col) && near(t.row, tr.row)
      && near(t.w, tr.w) && near(t.h, tr.h);
    if (!window.confirm('Remove these stairs? Both ends go.')) return;
    try {
      const updated = [];
      updated.push(await saveTransitions(
        activeLevel,
        (here.transitions || []).filter((t) => !(sameSpot(t) && t.to_level === tr.to_level))
      ));
      const other = levels.find((l) => l.level_index === tr.to_level);
      if (other) {
        updated.push(await saveTransitions(
          tr.to_level,
          (other.transitions || []).filter((t) => !(sameSpot(t) && t.to_level === activeLevel))
        ));
      }
      setLevels((prev) => prev.map((l) => updated.find((u) => u && u.level_index === l.level_index) || l));
    } catch (err) {
      alert('Could not remove the stairs: ' + err.message);
    }
  }

  async function refreshLevels(nextLevels) {
    setLevels(nextLevels || []);
    setActiveLevel(0);
    if (session?.id) await loadMaps(session.id);
    // The ground floor's image is the map's own, and a reorder or a delete can
    // change which storey that is.
    const ground = (nextLevels || []).find((l) => l.level_index === 0);
    if (ground) setSession((prev) => (prev ? { ...prev, map_image: ground.image_path } : prev));
    // Tell the room.
    //
    // Reordering and deleting are REST calls, so nobody else hears about them —
    // and they renumber the floor that every wall, light and TOKEN on the board
    // points at. A player left on the old numbering would be standing on a
    // storey that has moved under them. Re-selecting the same map is the
    // existing "everyone reload this board" broadcast, and a structural change
    // to the stack is exactly the case it is for.
    if (session?.map_id) handleChangeMap(session.map_id);
  }

  async function patchLevel(levelIndex, patch) {
    if (!session?.map_id) return;
    // Local first so typing in the name box doesn't wait on the server.
    setLevels((prev) => prev.map((l) => (l.level_index === levelIndex ? { ...l, ...patch } : l)));
    try {
      await fetch(`/api/maps/${session.map_id}/levels/${levelIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch { /* the local edit stands; the next load re-reads the truth */ }
  }

  async function reorderLevel(levelIndex, delta) {
    if (!session?.map_id) return;
    const ordered = [...levels].sort((a, b) => a.level_index - b.level_index).map((l) => l.level_index);
    const from = ordered.indexOf(levelIndex);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ordered.length) return;
    ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    try {
      const r = await fetch(`/api/maps/${session.map_id}/levels/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ordered }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      await refreshLevels(d.levels);
    } catch (err) {
      alert('Reorder failed: ' + err.message);
    }
  }

  async function deleteLevel(levelIndex) {
    if (!session?.map_id) return;
    const l = levels.find((x) => x.level_index === levelIndex);
    if (!window.confirm(`Delete "${l?.name || `Level ${levelIndex}`}" and its walls, doors and lights? Tokens standing on it drop to the ground floor.`)) return;
    try {
      const r = await fetch(`/api/maps/${session.map_id}/levels/${levelIndex}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      await refreshLevels(d.levels);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  async function submitLevelImport() {
    if (!levelImport || !session || levelImporting) return;
    setLevelImporting(true);
    try {
      const fd = new FormData();
      fd.append('session_id', session.id);
      fd.append('name', levelImport.rows[0]?.name || 'Dungeondraft Import');
      fd.append('import_walls', String(dd2vttOpts.walls));
      fd.append('import_doors', String(dd2vttOpts.doors));
      fd.append('import_lights', String(dd2vttOpts.lights));
      // The list is already in the GM's chosen order, so the files go up in
      // that order and level_order is the identity — sent anyway so the server
      // never has to trust multipart ordering.
      levelImport.rows.forEach((r, i) => {
        fd.append('files', r.file);
        fd.append('level_order', String(i));
        fd.append('level_names', r.name);
        fd.append('level_heights', String(r.height));
      });
      const res = await fetch('/api/dd2vtt/import-multi', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadMaps(session.id);
      handleChangeMap(data.map.id);
      if (data.map.grid_size) handleGridSizeChange(data.map.grid_size);
      setLevelImport(null);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setLevelImporting(false);
    }
  }

  async function handleDD2VTTImport(e) {
    const file = e.target.files[0];
    if (!file || !session) return;
    setDd2vttImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('session_id', session.id);
      fd.append('name', file.name.replace(/\.dd2vtt$/i, ''));
      fd.append('import_walls',  String(dd2vttOpts.walls));
      fd.append('import_doors',  String(dd2vttOpts.doors));
      fd.append('import_lights', String(dd2vttOpts.lights));
      const res = await fetch('/api/dd2vtt/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadMaps(session.id);
      handleChangeMap(data.map.id);
      // Persist the map's grid size to the session so all clients (players) use it
      if (data.map.grid_size) handleGridSizeChange(data.map.grid_size);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setDd2vttImporting(false);
      e.target.value = '';
    }
  }

  // ── The active storey ─────────────────────────────────────────────────────
  //
  // Everything below degrades to "one level" when the map has no level rows,
  // which is every map that isn't a multilevel import.
  //
  // Placed ABOVE the error/no-session early returns, and it has to stay there:
  // the useMemo calls are hooks, and hooks that sit after a conditional return
  // are skipped on the renders that take it. React counts hooks per render, so
  // the first render without a session would leave four of them unaccounted
  // for and blow up the whole view. Hence the null-safe `session?.` below —
  // this now runs before anything has proved a session exists.
  const activeLevelRow = levels.find((l) => l.level_index === activeLevel) || null;

  // The picture on the board. A level carries its own image; without one the
  // map's own is the only floor there is.
  const mapUrl = activeLevelRow?.image_path
    ? `/uploads/${activeLevelRow.image_path}`
    : (session?.map_image ? `/uploads/${session.map_image}` : null);

  // Geometry belongs to a storey. Walls upstairs must not block sight down
  // here, and a door on the first floor is not a door on the ground.
  //
  // Filtered on the CLIENT rather than at the source: the server would
  // otherwise have to re-broadcast every wall on the map each time the GM
  // changed floor, for geometry that is not secret. Rows written before levels
  // existed have level_index 0, so a single-storey map filters to all of them.
  const onActiveLevel = (row) => levels.length === 0 || (Number(row.level_index) || 0) === activeLevel;
  const levelWalls = React.useMemo(() => walls.filter(onActiveLevel), [walls, levels.length, activeLevel]);
  const levelDoors = React.useMemo(() => doors.filter(onActiveLevel), [doors, levels.length, activeLevel]);
  const levelLights = React.useMemo(() => lights.filter(onActiveLevel), [lights, levels.length, activeLevel]);
  // Tokens standing on other floors are not drawn on this one — the same rule
  // the ships' decks already apply to their crew.
  //
  // "Standing on" counts a flier's elevation against the storey heights in the
  // map's level settings: a token twenty feet up from the ground floor of a
  // building with ten-foot storeys is on the second floor, and the GM looking
  // at the second floor should see it there. Same helper the players' view
  // uses, so the two never disagree about who is on which floor.
  //
  // Depends on `levels` itself, not just its length: change a storey's height
  // and every flier's floor can change with it.
  const levelTokens = React.useMemo(
    () => (levels.length === 0 ? tokens : tokens.filter((t) => occupiedLevel(levels, t) === activeLevel)),
    [tokens, levels, activeLevel]
  );

  if (error) {
    return (
      <div className="min-h-screen bg-dnd-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4 flex items-center justify-center gap-2"><WarningIcon />{error}</div>
          <button onClick={() => navigate('/')} className="text-dnd-gold underline">Back to lobby</button>
        </div>
      </div>
    );
  }

  // Only show the full-screen connecting spinner BEFORE the first
  // session payload lands. Once `session` is populated, brief socket
  // drops (cell handover, iOS WebKit suspending the WS) get a small
  // top banner instead of yanking the GM out of their working view.
  if (!session) {
    return (
      <div className="min-h-screen bg-dnd-dark flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-dnd-gold"><SpinnerIcon /></div>
          <div className="text-gray-400">
            {reconnectAttempt > 0 ? `Reconnecting (attempt ${reconnectAttempt})…` : 'Connecting as Game Master...'}
          </div>
        </div>
      </div>
    );
  }

  // Grid size actually in force. Ordinary maps use the session-wide value (the
  // GM's slider, and what the backend resolves terrain walls against). A
  // wildspace map uses its own: a 200-square starfield and a dockside
  // battlemap can't share one pixels-per-square, and when they were forced to,
  // every token on the other map bunched into the corner.
  // The map's OWN grid size, whatever kind of map it is. The session value is
  // only a fallback for rows that predate per-map sizing (and the default for
  // newly uploaded maps).
  const effectiveGridSize = Number(session.map_grid_size) || gridSize;
  const playerLink    = `${window.location.origin}/play?code=${code}`;
  const spectatorLink = `${window.location.origin}/spectate?code=${code}`;
  // Build a `.local` variant of the player join link when the server
  // reported one. Prefer the explicit mDNS-advertised name
  // (`tabletopforge.local`) since it stays stable across host names;
  // fall back to the host machine's own `.local` (Mac/Win Docker
  // case where multicast is trapped in the VM but the host OS is
  // already advertising itself). null when neither is available —
  // the panel quietly hides the row in that case.
  const localHostname = mdnsInfo.mdnsName || mdnsInfo.mdnsHost;
  const playerLinkLocal = localHostname
    ? `${window.location.protocol}//${localHostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}/play?code=${code}`
    : null;
  const visibleTokens = tokens;

  // Tokens and ships share one order — combat_turn indexes into it.
  const combatSorted = buildCombatOrder(tokens, ships);
  const currentCombatEntry = combatActive && combatSorted.length > 0
    ? combatSorted[combatTurn % combatSorted.length] ?? null
    : null;
  // Null while a SHIP holds the turn: this drives the map's "it's your go"
  // ring, which is drawn on tokens.
  const currentCombatTokenId = currentCombatEntry?.kind === 'token'
    ? currentCombatEntry.id
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-900">
      {/* Loads /api/custom/classes once on mount and pumps the
          results into pluginRegistries (customClasses,
          customSubclasses, customClassBuilds, customClassFeatures,
          customClassResources) so the dropdowns + class kit
          machinery see GM-authored classes alongside the SRD ones. */}
      <CustomClassesProvider />
      {/* Reconnect banner — visible while the socket is dropped, hidden
          the moment it reconnects. Stays out of the way of the live
          UI so the GM can keep working with the last-known state
          rather than being kicked back to the login spinner. */}
      {!connected && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-900/90 border border-yellow-600/60 text-yellow-100 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2 pointer-events-none">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
          {reconnectAttempt < 0
            ? 'Reconnect failed — pull-to-refresh to retry'
            : reconnectAttempt > 0
              ? `Reconnecting (attempt ${reconnectAttempt})…`
              : 'Connection dropped — reconnecting…'}
        </div>
      )}
      {/* Map area */}
      <div className="flex-1 relative overflow-hidden flex flex-col" style={{ cursor: placingCreature ? 'crosshair' : 'default' }}>
        {/* Combat tracker strip.

            `relative` is load-bearing: a static element takes no part in
            stacking, so the old bare `z-20` did nothing and the 3D overlay —
            a fixed z-70 sheet across the window — painted straight over the
            turn order. Keeping it in the flow rather than lifting it to
            `fixed` leaves the 2D layout untouched and keeps it clear of the
            GM panel for free, exactly as the flex column already did. */}
        {combatActive && (
          <div className="shrink-0 relative z-[80] flex items-end gap-2 bg-gray-900/90 border-b border-yellow-600/40 px-3 pb-1.5" style={{ height: COMBAT_STRIP_H }}>
            <span className="text-yellow-400 shrink-0 mb-1.5"><SwordIcon className="w-4 h-4" /></span>
            <CombatTracker
              tokens={tokens}
              ships={ships}
              combatTurn={combatTurn}
              onNext={handleNextTurn}
              onPrev={handlePrevTurn}
              onEnd={handleEndCombat}
            />
            {/* Lair actions resolve on initiative count 20 — after any
                combatant who beat 20, before everyone slower. Shown as a
                marker rather than a turn: the GM narrates it, nobody's
                turn is consumed. Lights up when the order crosses 20. */}
            {lairAction.enabled && (() => {
              const order = combatSorted;
              const current = order.length ? order[combatTurn % order.length] : null;
              const currentInit = Number(current?.initiative ?? 0);
              const anyAbove20 = order.some((t) => Number(t.initiative ?? 0) > 20);
              // "Due" once the turn pointer reaches the first combatant at or
              // below 20 — i.e. everyone faster has already gone.
              const due = !anyAbove20 || currentInit <= 20;
              return (
                <div
                  title={lairAction.note || 'Lair action on initiative 20'}
                  className={`shrink-0 mb-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors ${
                    due
                      ? 'bg-purple-800 border-purple-500 text-purple-100 animate-pulse'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  Lair · init 20
                </div>
              );
            })()}
            <button
              onClick={handleAddToCombat}
              className="shrink-0 mb-1.5 text-xs px-2.5 py-1 rounded-md bg-yellow-700 hover:bg-yellow-600 text-white border border-yellow-600/60 transition-colors"
              title="Add reinforcements or forgotten tokens to the active combat without resetting the turn order"
            >
              + Add tokens
            </button>
          </div>
        )}

        {/* Map + overlays */}
        <div className="flex-1 relative overflow-hidden">
          <ToolPanel activeTool={activeTool} onToolChange={setActiveTool} showWallTools lightShape={lightShape} onLightShapeChange={setLightShape} />

          <MapStage
            sneakMode={sneakMode}
            sneakRoundAt={sneakRoundAt}
            sneakBarInset={52}
            mapUrl={mapUrl}
            mapId={session?.map_id ?? null}
            mapWidth={session.map_width}
            mapHeight={session.map_height}
            mapType={session.map_type || 'image'}
            gridCols={session.map_grid_cols ?? null}
            gridRows={session.map_grid_rows ?? null}
            ships={ships}
            shipFx={shipFx}
            // GM-only ship removal, from the right-click menu on a hull.
            onShipRemove={(shipId, effect, crew) => socket.emit('remove_ship', { shipId, effect, crew })}
            // Renames THIS hull, not its class — see the field in the menu.
            onShipRename={(shipId, name) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, name } : s));
              socket.emit('rename_ship', { shipId, name });
            }}
            // Hull HP, initiative and combat membership — same menu. Optimistic
            // local updates keep the menu's numbers moving under the cursor;
            // the server broadcast re-confirms (and clamps) a moment later.
            combatActive={combatActive}
            // change is { delta } for damage/repair or { currentHp } to set an
            // exact value. Only the exact-value form updates optimistically: a
            // delta is applied to the server's running total, so guessing the
            // result here risks showing a number the server won't agree with.
            // The ship_hp_changed broadcast lands a moment later either way.
            onShipHpChange={(shipId, change) => {
              if (change && change.currentHp != null) {
                setShips(prev => prev.map(s => {
                  if (s.id !== shipId) return s;
                  const max = Number(s.hull_hp) || 0;
                  const clamped = Math.max(0, max > 0 ? Math.min(max, change.currentHp) : change.currentHp);
                  return { ...s, current_hp: clamped };
                }));
                socket.emit('update_ship_hp', { shipId, currentHp: change.currentHp });
              } else if (change && change.delta != null) {
                socket.emit('update_ship_hp', { shipId, delta: change.delta });
              }
            }}
            onShipInitiativeChange={(shipId, initiative) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, initiative } : s));
              socket.emit('update_ship_initiative', { shipId, initiative });
            }}
            onShipCombatToggle={(shipId, inCombat) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, in_combat: inCombat } : s));
              socket.emit('set_ship_combat', { shipId, inCombat });
            }}
            // Optimistic, like handleTokenMove — without it the token repaints
            // at its pre-drag square for the length of the round trip, reading
            // as a snap back to where it started before it jumps to where it
            // was dropped. deck_col/deck_row stay for the echo to fill in: the
            // server owns the deck-local truth, and it lands a few ms later.
            onTokenDeckMove={(tokenId, shipId, deckIndex, gridCol, gridRow) => {
              setTokens(prev => prev.map(t => t.id === tokenId
                ? { ...t, grid_col: gridCol, grid_row: gridRow, ship_id: shipId, deck_index: deckIndex }
                : t));
              socket.emit('token_deck_move', { tokenId, shipId, deckIndex, gridCol, gridRow });
            }}
            onTokenChangeDeck={(tokenId, shipId, toDeck, toCol, toRow) =>
              socket.emit('token_change_deck', { tokenId, shipId, toDeck, toCol, toRow })}
            selectedShipId={selectedShipId}
            onShipSelect={setSelectedShipId}
            // `live` is true for every frame of the drag and false on release.
            // Local state repaints throughout; only the release hits the wire,
            // so a long drag is one socket event and one server re-projection
            // of the crew rather than dozens.
            onShipMove={(shipId, gridCol, gridRow, live) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, grid_col: gridCol, grid_row: gridRow } : s));
              if (!live) socket.emit('move_ship', { shipId, gridCol, gridRow });
            }}
            onShipRotate={(shipId, rotation, live) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, rotation } : s));
              if (!live) socket.emit('rotate_ship', { shipId, rotation });
            }}
            onShipDeckChange={(shipId, deckIndex) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, active_deck: deckIndex } : s));
              socket.emit('set_ship_deck', { shipId, deckIndex });
            }}
            gridSize={effectiveGridSize}
            fitToMap={true}
            tokens={visibleTokens}
            isPlayer={false}
            onTokenMove={handleTokenMove}
            selectedTokenId={selectedToken}
            onTokenSelect={setSelectedToken}
            // `placingToken` is what actually arms the map's click reporting;
            // `onMapClick` on its own is ignored. Laying a patrol route is the
            // same kind of mode, so it arms it the same way.
            placingToken={!!(placingCreature || placingMarkerType || patrolDraft)}
            onMapClick={(placingCreature || placingMarkerType || patrolDraft) ? handleMapClick : null}
            patrolRoutes={patrolRoutes}
            activeTool={activeTool}
            gridColor={gridColor}
            gridThickness={gridThickness}
            gridType={session.map_grid_type || 'square'}
            // Only report the camera while actually projecting — otherwise every
            // GM pan would emit into a room with nobody listening for it.
            onCameraRect={liveMapView ? handleCameraRect : null}
            gridScale={session.map_grid_scale ?? 5}
            gridUnit={session.map_grid_unit ?? 'ft'}
            showScaleKey={!!session.map_grid_scale_visible}
            walls={levelWalls}
            doors={levelDoors}
            lights={levelLights}
            levelTransitions={activeLevelRow?.transitions || []}
            onStairPlace={placingStair ? placeStairAt : null}
            onStairRemove={removeStair}
            onStairAdjust={adjustStair}
            onDoorKindSet={(doorId, kind) => socket.emit('set_door_kind', { doorId, kind })}
            fogOfWar={false}
            onWallAdd={handleWallAdd}
            onWallDelete={handleWallDelete}
            onDoorAdd={handleDoorAdd}
            onDoorDelete={handleDoorDelete}
            onDoorToggle={handleDoorToggle}
            onDoorFlip={handleDoorFlip}
            onDoorSpriteSet={handleDoorSpriteSet}
            doorSprites={doorSprites}
            onLightAdd={handleLightAdd}
            onLightDelete={handleLightDelete}
            onLightSelect={setEditingLight}
            activeLightSpread={lightShape === 'cone' ? 60 : lightShape === 'panel' ? 180 : 360}
            magicalDarkness={magicalDarkness}
            onMagicalDarknessAdd={handleMagicalDarknessAdd}
            onMagicalDarknessDelete={handleMagicalDarknessDelete}
            onZoneFeatherChange={handleZoneFeatherChange}
            spawnPoint={spawnPoint}
            onSetSpawnPoint={handleSetSpawnPoint}
            dmMarkers={dmMarkers}
            onDmMarkerClick={handleDmMarkerClick}
            currentCombatTokenId={currentCombatTokenId}
            onMeasureChange={handleMeasureChange}
            spellTemplates={spellTemplates}
            drawings={drawings}
            myInkColor={myInkColor}
            onDrawStroke={(points) => socket.emit('draw_stroke', { mapId: session?.map_id ?? null, points, width: 4 })}
            onDrawUndo={() => socket.emit('draw_undo', { mapId: session?.map_id ?? null })}
            selectedTemplateId={editingTemplateId}
            onTemplatePlace={(tpl) => socket.emit('place_template', tpl)}
            onTemplateUpdate={(payload) => socket.emit('update_template', payload)}
            onTemplateDelete={(id) => { socket.emit('delete_template', { id }); setEditingTemplateId(prev => prev === id ? null : prev); }}
            onTemplateSelect={(id) => setEditingTemplateId(id)}
            remoteMeasurements={remoteMeasurements}
            tokenNameFontSize={tokenNameFontSize}
            onTokenContextMenu={(tokenId, x, y) => setTokenContextMenu({ tokenId, x, y })}
            terrain={terrain}
            tiles={tiles}
            pendingTile={pendingTile}
            stagedTile={stagedTile}
            onTileMenu={(tileId, x, y) => setTileMenu({ tileId, x, y })}
            tileRotation={tileRotation}
            onTileStage={(col, row) => setStagedTile({ col, row })}
            pendingTerrain={pendingTerrain}
            selectedTerrainId={selectedTerrainId}
            resizingTerrainId={resizingTerrainId}
            onTerrainSelect={(id) => {
              setSelectedTerrainId(id);
              // Selecting anything else (or nothing) leaves resize mode, so it
              // can never linger armed on a piece the GM has moved on from.
              setResizingTerrainId((cur) => (cur === id ? cur : null));
            }}
            onTerrainPlace={handleTerrainPlace}
            onTerrainMove={(id, col, row, live) => {
              // Optimistic local update so the piece tracks the cursor
              // without round-tripping per frame; server fires only on
              // commit (live === false).
              setTerrain(prev => prev.map(t => t.id === id ? { ...t, grid_col: col, grid_row: row } : t));
              if (!live) socket.emit('move_terrain', { id, gridCol: col, gridRow: row });
            }}
            onTerrainResize={(id, patch, live) => {
              // Optimistic local update every frame for smooth visual
              // feedback; server emit only on commit (live === false).
              setTerrain(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
              if (!live) socket.emit('resize_terrain', { id, ...patch });
            }}
            onTerrainContextMenu={(id, x, y) => setTerrainContextMenu({ id, x, y })}
            onDoorToggle={handleDoorToggle}
            portals={portals}
            portalPendingAnchor={portalAnchor}
            onPortalPlace={(col, row) => {
              // First click banks the anchor, second click sends both ends up
              // together — a pair is only ever created whole.
              if (!portalAnchor) {
                setPortalAnchor({ col, row, pairId: makeUuidV4() });
                return;
              }
              // Both ends on the same spot is a gate to nowhere. Compared with
              // a tolerance now that placement is free — exact equality would
              // never trip on floats.
              if (Math.abs(portalAnchor.col - col) < 0.25 && Math.abs(portalAnchor.row - row) < 0.25) return;
              const { pairId } = portalAnchor;
              socket.emit('add_portal', { mapId: session.map_id, pairId, gridCol: portalAnchor.col, gridRow: portalAnchor.row, label: '' });
              socket.emit('add_portal', { mapId: session.map_id, pairId, gridCol: col, gridRow: row, label: '' });
              setPortalAnchor(null);
            }}
            onPortalErase={(id) => socket.emit('remove_portal', { id })}
            onPortalUpdate={(id, patch) => socket.emit('update_portal', { id, ...patch })}
            onPortalPairUpdate={(pairId, patch) => {
              // Both ends, one gesture — "disable this portal" means the gate,
              // not the pad you happened to right-click.
              for (const p of portals.filter(x => x.pair_id === pairId)) {
                socket.emit('update_portal', { id: p.id, ...patch });
              }
            }}
            onPortalUse={(portalId) => {
              // No selection is not a dead end: the server sends whoever is
              // standing on the pad, and tells us when it can't decide.
              socket.emit('use_portal', { portalId, tokenId: selectedToken || null });
            }}
            spawnPoints={allSpawnPoints[session?.map_id] || []}
            onSpawnNamedAdd={(shapePoints) => setPendingSpawnPoint({ shapePoints })}
            onSpawnPointMove={(id, col, row) => {
              // Optimistic local update so the glyph stays at the
              // dropped position instead of flickering back to the
              // server-stored anchor while the round-trip lands.
              // Polygon vertices are translated by the same delta so
              // the whole shape moves with the centre dot.
              setAllSpawnPoints((prev) => {
                const out = { ...prev };
                for (const k of Object.keys(out)) {
                  const list = out[k];
                  const idx = list.findIndex((s) => s.id === id);
                  if (idx === -1) continue;
                  const sp = list[idx];
                  const dCol = col - Number(sp.grid_col);
                  const dRow = row - Number(sp.grid_row);
                  const updated = { ...sp, grid_col: col, grid_row: row };
                  if (Array.isArray(sp.shape_points)) {
                    updated.shape_points = sp.shape_points.map((p) => ({
                      col: Number(p.col) + dCol,
                      row: Number(p.row) + dRow,
                    }));
                  }
                  const next = list.slice();
                  next[idx] = updated;
                  out[k] = next;
                  break;
                }
                return out;
              });
              socket.emit('update_spawn_point', { id, gridCol: col, gridRow: row });
            }}
            pings={activePings}
            tokenFx={tokenFx}
            onPingMap={handlePingMap}
            fogBlocks={fogBlocks}
            onFogBlockAdd={({ points }) =>
              socket.emit('add_fog_block', { mapId: session?.map_id, points })
            }
            onFogBlockDelete={(id) => socket.emit('delete_fog_block', { id })}
            onFogBlockReveal={(id) => socket.emit('reveal_fog_block', { id })}
            onFogBlockHide={(id) => socket.emit('hide_fog_block', { id })}
          />

          {tokenContextMenu && (
            <TokenContextMenu
              menu={tokenContextMenu}
              tokens={tokens}
              maps={maps}
              // The flat map and the 3D board both report their right-clicks
              // through this one menu, so wiring it here serves both.
              onViewStatBlock={(creatureId) => {
                handleViewStatBlock(creatureId);
                setTokenContextMenu(null);
              }}
              onRollLoot={(tokenId) => {
                socket.emit('roll_creature_loot', { tokenId });
                setTokenContextMenu(null);
              }}
              currentMapId={session?.map_id}
              spawnPointsByMapId={allSpawnPoints}
              onClose={() => setTokenContextMenu(null)}
              onSendToMap={(tokenId, mapId, spawnPointId) => {
                socket.emit('dm_send_token_to_map', { tokenId, mapId, spawnPointId });
                setTokenContextMenu(null);
              }}
              onSetFamiliar={(tokenId, playerName, kind) => {
                socket.emit('dm_set_token_familiar', { tokenId, playerName, kind });
                setTokenContextMenu(null);
              }}
              // Menu deliberately stays open — hiding the name and the health
              // bar are usually done together, and the ticks update in place.
              onSetLabelVisibility={(tokenId, patch) => {
                socket.emit('dm_set_token_label_visibility', { tokenId, ...patch });
              }}
              liveBackdrop={liveBackdrop}
              patrol={patrols[String(tokenContextMenu.tokenId)] || null}
              onPatrolDraw={(tokenId) => {
                const t = tokens.find((x) => x.id === tokenId);
                setPatrolDraft({ tokenId, name: t?.name || 'token', points: [] });
                setTokenContextMenu(null);
              }}
              onPatrolToggle={(tokenId, active) => {
                socket.emit('set_token_patrol_active', { tokenId, active });
                setTokenContextMenu(null);
              }}
              onPatrolClear={(tokenId) => {
                socket.emit('clear_token_patrol', { tokenId });
                setTokenContextMenu(null);
              }}
              onTransform={(tokenId) => {
                setTransformFor(tokenId);
                setTokenContextMenu(null);
              }}
              onRevert={(tokenId) => {
                socket.emit('dm_revert_token', { tokenId, effect: 'vines' });
                setTokenContextMenu(null);
              }}
              attachedDarkness={magicalDarkness.find((d) => d.attached_token_id === tokenContextMenu.tokenId) || null}
              onAddDarkness={(tokenId, radiusFt, zoneType) => {
                socket.emit('dm_add_darkness_on_token', { sessionId: session?.id, tokenId, radiusFt, zoneType });
                setTokenContextMenu(null);
              }}
              onDetachDarkness={(darknessId) => {
                socket.emit('delete_magical_darkness', { darknessId });
                setTokenContextMenu(null);
              }}
              onSetAuras={(tokenId, auras) => socket.emit('set_token_auras', { tokenId, auras })}
              onSetMark={(tokenId, clear) => socket.emit('set_token_mark', { tokenId, clear, label: 'Marked' })}
              onSetExhaustion={(tokenId, level) => socket.emit('set_token_exhaustion', { tokenId, level })}
              onWildShape={(tokenId, creatureId) => {
                socket.emit('player_wildshape', { tokenId, creatureId });
                setTokenContextMenu(null);
              }}
              onWildShapeRevert={(tokenId) => {
                socket.emit('player_wildshape_revert', { tokenId });
                setTokenContextMenu(null);
              }}
              onTokenFx={(tokenId, opts) => {
                // Destroying a player's token isn't a visual — it deletes the
                // row they're bound to, and they need a GM respawn to get back
                // on the map. Worth one confirmation.
                if (opts?.destroy) {
                  const t = tokens.find((tk) => tk.id === tokenId);
                  if (t?.is_player && !window.confirm(
                    `Burn away ${t.nickname || t.name}'s token?\n\n` +
                    `This deletes the player's token — they'll need a respawn to return to the map.`
                  )) return;
                }
                socket.emit('dm_token_fx', { tokenId, ...opts });
                setTokenContextMenu(null);
              }}
              onShowImageToPlayers={(tokenId) => {
                socket.emit('dm_push_token_image_as_backdrop', { sessionId: session?.id, tokenId });
                setTokenContextMenu(null);
              }}
              onStopShowingImage={() => {
                pushBackdrop(null);
                setTokenContextMenu(null);
              }}
            />
          )}

          {transformFor != null && (
            <TransformModal
              token={tokens.find((t) => t.id === transformFor) || null}
              onCancel={() => setTransformFor(null)}
              onConfirm={(creatureId, effect) => {
                socket.emit('dm_transform_token', { tokenId: transformFor, creatureId, effect });
                setTransformFor(null);
              }}
            />
          )}

          {pendingSpawnPoint && (
            <SpawnPointLabelModal
              onCancel={() => setPendingSpawnPoint(null)}
              onSubmit={(label) => {
                const pts = pendingSpawnPoint.shapePoints || [];
                // Centroid as the anchor — used as the grid_col/grid_row
                // fallback and for drag-to-relocate maths.
                let sx = 0, sy = 0;
                for (const p of pts) { sx += Number(p.col); sy += Number(p.row); }
                const cx = pts.length ? sx / pts.length : 0;
                const cy = pts.length ? sy / pts.length : 0;
                socket.emit('add_spawn_point', {
                  mapId: session.map_id,
                  label,
                  gridCol: cx,
                  gridRow: cy,
                  shapePoints: pts,
                });
                setPendingSpawnPoint(null);
              }}
            />
          )}

          {/* Status banners — what the players are seeing that the GM's own
              view gives no hint of. Stacked in one bottom-centre column so a
              second banner pushes the first up rather than landing on top of
              it (or on top of whatever control is underneath). */}
          {portalHint && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-fuchsia-700/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none">
              {portalHint}
            </div>
          )}

          {(!sessionStarted || liveBackdrop) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
              {!sessionStarted && (
                <div className="bg-amber-600 text-gray-900 px-3 py-2 rounded-xl text-sm shadow-lg flex items-center gap-3 pointer-events-auto">
                  <span>
                    Lobby — <strong>{lobbyRoster.length}</strong> waiting
                  </span>
                  <button
                    onClick={spawnPlayersToMap}
                    disabled={!session?.map_id}
                    className="bg-gray-900/20 hover:bg-gray-900/35 disabled:opacity-40 rounded px-2 py-1 text-xs font-semibold"
                  >Spawn here</button>
                </div>
              )}

              {liveBackdrop && (
                <div className="bg-purple-700 text-white px-4 py-2 rounded-xl text-sm shadow-lg flex items-center gap-3 pointer-events-auto">
                  <img src={`/uploads/${liveBackdrop.image_path}`} alt="" className="w-8 h-8 rounded object-cover" />
                  <span>Players are seeing <strong>{liveBackdrop.name}</strong></span>
                  <button
                    onClick={() => pushBackdrop(null)}
                    className="bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs font-semibold"
                  >Back to map</button>
                </div>
              )}
            </div>
          )}

          {placingCreature && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dnd-gold text-gray-900 px-4 py-2 rounded-xl font-semibold text-sm shadow-lg z-30">
              <div className="flex items-center">
                Click on the map to place <strong className="ml-1">{placingCreature.name}</strong>
                <button onClick={() => setPlacingCreature(null)} className="ml-3 opacity-70 hover:opacity-100"><XIcon /></button>
              </div>
              {/* Art picker — only worth showing when there's an actual choice.
                  Selection persists until the token is placed, so the GM picks
                  the face first and then clicks the map. */}
              {placingImages.length > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-900/20 flex items-center gap-2">
                  <span className="text-[11px] font-normal opacity-80 shrink-0">Art:</span>
                  <div className="flex gap-1.5 flex-wrap max-w-[22rem]">
                    {placingImages.map((img) => {
                      const selected = img.is_primary
                        ? placingImage === null
                        : placingImage === img.image_path;
                      return (
                        <button
                          key={img.is_primary ? 'primary' : img.id}
                          type="button"
                          onClick={() => setPlacingImage(img.is_primary ? null : img.image_path)}
                          title={img.is_primary ? 'Primary portrait' : 'Alternate token art'}
                          className={`w-9 h-9 rounded-md overflow-hidden border-2 transition-colors ${
                            selected ? 'border-gray-900' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={`/uploads/${img.image_path}`} alt="" className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Storey switcher.
              Only when the board actually has storeys. Highest at the top, so
              the column reads the way the building stands — the same ordering
              the ships' deck buttons use.

              On the RIGHT: the tool rail owns the left edge of the map and was
              sitting on top of this.

              A scene control, not a personal view: it changes what every player
              is looking at, which is why it emits rather than setting state
              locally and waits for the broadcast like everyone else. */}
          {levels.length > 1 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 bg-gray-900/90 border border-gray-700 rounded-xl p-1.5 shadow-2xl">
              <span className="text-[9px] uppercase tracking-wide text-gray-500 text-center pb-0.5">Level</span>
              {/* Place a staircase. Both ends are written at once, so the stair
                  works in each direction from the moment it exists. */}
              <button
                type="button"
                onClick={startPlacingStairs}
                title={placingStair
                  ? `Drag out staircases to level ${placingStair.toLevel}, or drag an existing one to move it and its corner to resize. Click again when done.`
                  : 'Draw and adjust stairs between levels'}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                  placingStair
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-sky-400/60'
                }`}
              >{placingStair ? `→${placingStair.toLevel}` : 'Stairs'}</button>
              {[...levels].sort((a, b) => b.level_index - a.level_index).map((l) => {
                const on = l.level_index === activeLevel;
                return (
                  <button
                    key={l.level_index}
                    type="button"
                    onClick={() => socket.emit('set_map_level', { levelIndex: l.level_index })}
                    title={`${l.name || `Level ${l.level_index}`} · ${l.height_ft} ft`}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors min-w-[3.5rem] ${
                      on
                        ? 'bg-dnd-gold text-gray-900 border-dnd-gold'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-dnd-gold/60'
                    }`}
                  >
                    <span className="block leading-tight">{l.level_index}</span>
                    <span className="block text-[9px] leading-tight truncate opacity-80">
                      {l.name || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {pendingTerrain && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg z-30 flex items-center gap-2">
              <span>Click map to place <strong>{pendingTerrain.name}</strong></span>
              <button onClick={() => setPendingTerrain(null)} className="ml-2 opacity-70 hover:opacity-100"><XIcon /></button>
            </div>
          )}

          {terrainContextMenu && (
            <TerrainContextMenu
              menu={terrainContextMenu}
              terrain={terrain.find(t => t.id === terrainContextMenu.id) || null}
              onClose={() => setTerrainContextMenu(null)}
              isResizing={resizingTerrainId === terrainContextMenu.id}
              onToggleResizeMode={(id) => {
                setSelectedTerrainId(id);
                setResizingTerrainId((cur) => (cur === id ? null : id));
                setTerrainContextMenu(null);
              }}
              onDelete={(id) => { socket.emit('remove_terrain', { id }); setTerrainContextMenu(null); }}
              onToggleReveal={(id, isRevealed) => { socket.emit('reveal_terrain', { id, isRevealed }); setTerrainContextMenu(null); }}
              isShowingImage={(() => {
                // The live backdrop records the art it was generated FROM, so
                // comparing against this marker's source is what tells us it's
                // the one currently on the players' screens.
                const row = terrain.find(x => x.id === terrainContextMenu.id);
                const art = row?.lib_source_image_path || row?.lib_image_path;
                return !!art && liveBackdrop?.source_image_path === art;
              })()}
              onShowImage={(t) => {
                if (!session) return;
                const art = t.lib_source_image_path || t.lib_image_path;
                if (liveBackdrop?.source_image_path && liveBackdrop.source_image_path === art) {
                  socket.emit('set_backdrop', { sessionId: session.id, backdropId: null });
                } else {
                  socket.emit('dm_push_terrain_image_as_backdrop', { sessionId: session.id, terrainId: t.id });
                }
                setTerrainContextMenu(null);
              }}
              onRename={(t) => {
                // A placed piece's own name, over the library's. Blank clears
                // the override and falls back to the library name.
                const next = window.prompt('Name for this piece', t.label || t.lib_name || '');
                if (next === null) return;
                socket.emit('set_terrain_label', { id: t.id, label: next });
                setTerrainContextMenu(null);
              }}
              // Per-placement 3D properties: height off the board, the movement
              // lock, and the name tag. Applied locally first — the height box
              // is a text field, and waiting on the server round trip for each
              // keystroke makes it feel broken to type in.
              onSetProps={(id, patch) => {
                const localPatch = {};
                if (patch.elevation !== undefined) localPatch.elevation = patch.elevation;
                if (patch.locked !== undefined) localPatch.locked = patch.locked;
                if (patch.showLabel !== undefined) localPatch.show_label = patch.showLabel;
                if (patch.hideLabelFromPlayers !== undefined) localPatch.hide_label_from_players = patch.hideLabelFromPlayers;
                if (patch.tint !== undefined) localPatch.tint = patch.tint;
                if (patch.animSpeed !== undefined) localPatch.anim_speed = patch.animSpeed;
                if (patch.isActive !== undefined) localPatch.is_active = patch.isActive;
                setTerrain(prev => prev.map(x => x.id === id ? { ...x, ...localPatch } : x));
                // Locking a piece that is currently in free resize mode has to
                // disarm that mode, or the handles stay on screen advertising
                // an interaction the stage now refuses.
                if (patch.locked === true) setResizingTerrainId((cur) => (cur === id ? null : cur));
                socket.emit('set_terrain_props', { id, ...patch });
              }}
              onResize={(id, factor) => {
                const t = terrain.find(x => x.id === id);
                if (!t) return;
                const newW = Math.max(0.1, Number(t.width) * factor);
                const newH = Math.max(0.1, Number(t.height) * factor);
                setTerrain(prev => prev.map(x => x.id === id ? { ...x, width: newW, height: newH } : x));
                socket.emit('resize_terrain', { id, width: newW, height: newH });
                setTerrainContextMenu(null);
              }}
              onRotate={(id, deg) => {
                const t = terrain.find(x => x.id === id);
                if (!t) return;
                const next = (Number(t.rotation || 0) + deg) % 360;
                setTerrain(prev => prev.map(x => x.id === id ? { ...x, rotation: next } : x));
                socket.emit('resize_terrain', { id, rotation: next });
                setTerrainContextMenu(null);
              }}
            />
          )}

          {/* Multilevel import staging.
          The order is the whole point of this screen: the browser hands back
          multi-selected files in no particular order, and which one is the
          ground floor is a question only the GM can answer. */}
      {levelImport && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-3">
            <div>
              <h3 className="text-dnd-gold font-semibold">Import multilevel map</h3>
              <p className="text-[11px] text-gray-500">
                Ground floor at the top. Level 0 sets the map's size and grid; the
                floors above are centred on it.
              </p>
              {/* Dungeondraft bakes its grid overlay into the exported image
                  unless it is switched off. Those are pixels in the artwork —
                  nothing here can hide them, and they sit under the grid this
                  app draws, so you end up looking at two. */}
              <p className="text-[11px] text-amber-300/90 bg-amber-900/20 border border-amber-800/60 rounded-lg px-2.5 py-1.5 leading-snug">
                Export from Dungeondraft with its <strong>grid turned off</strong>.
                Its grid is drawn into the image itself, so it can't be hidden here
                and you'll see it doubled under the one this app draws.
              </p>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {levelImport.rows.map((r, i) => (
                <div key={`${r.file.name}-${i}`} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5">
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => moveLevelRow(i, i - 1)}
                      disabled={i === 0}
                      className="text-[10px] leading-none px-1 text-gray-400 hover:text-white disabled:opacity-25"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => moveLevelRow(i, i + 1)}
                      disabled={i === levelImport.rows.length - 1}
                      className="text-[10px] leading-none px-1 text-gray-400 hover:text-white disabled:opacity-25"
                    >▼</button>
                  </div>
                  <span className="text-[10px] text-gray-500 w-10 shrink-0">
                    {i === 0 ? 'Ground' : `Lvl ${i}`}
                  </span>
                  <input
                    value={r.name}
                    onChange={(e) => setLevelImport((cur) => ({
                      ...cur,
                      rows: cur.rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    }))}
                    maxLength={80}
                    className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100"
                  />
                  <label className="flex items-center gap-1 shrink-0" title="Storey height, used by the 3D view">
                    <input
                      type="number" min="1" max="200" step="1" value={r.height}
                      onChange={(e) => setLevelImport((cur) => ({
                        ...cur,
                        rows: cur.rows.map((x, j) => (j === i ? { ...x, height: Number(e.target.value) || 10 } : x)),
                      }))}
                      className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-100 text-right"
                    />
                    <span className="text-[10px] text-gray-500">ft</span>
                  </label>
                  <span className="text-[10px] text-gray-600 truncate max-w-[7rem] shrink-0" title={r.file.name}>
                    {r.file.name}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-500">
              Taking: {Object.entries(dd2vttOpts).filter(([, v]) => v).map(([k]) => k).join(' + ') || 'map images only'}
              {' '}— change this with the Include tickboxes in the Map panel.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setLevelImport(null)}
                disabled={levelImporting}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm"
              >Cancel</button>
              <button
                onClick={submitLevelImport}
                disabled={levelImporting}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm"
              >{levelImporting ? 'Importing…' : `Import ${levelImport.rows.length} level${levelImport.rows.length === 1 ? '' : 's'}`}</button>
            </div>
          </div>
        </div>
      )}

      {showTerrainUpload && (
            <TerrainUploadModal
              onCancel={() => setShowTerrainUpload(false)}
              onSaved={(row) => {
                setTerrainLibrary(prev => [...prev, row]);
                setShowTerrainUpload(false);
              }}
            />
          )}

          {editingTerrainPiece && (
            <TerrainEditModal
              piece={editingTerrainPiece}
              onCancel={() => setEditingTerrainPiece(null)}
              onSaved={(row) => {
                setTerrainLibrary(prev => prev.map(p => p.id === row.id ? row : p));
                setEditingTerrainPiece(null);
              }}
            />
          )}
          {placingMarkerType && (() => {
            const mtype = DM_MARKER_TYPES.find(m => m.type === placingMarkerType);
            return (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-800 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg z-30 flex items-center gap-2">
                {mtype?.Icon && <mtype.Icon />}
                <span>Click map to place <strong>{mtype?.label}</strong> marker</span>
                <button onClick={() => setPlacingMarkerType(null)} className="ml-2 opacity-70 hover:opacity-100"><XIcon /></button>
              </div>
            );
          })()}
          {activeTool === 'spawn-named' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg z-30 flex items-center gap-2">
              <span>Click to place vertices · <kbd className="px-1.5 py-0.5 bg-cyan-900 rounded">Enter</kbd> to finish · <kbd className="px-1.5 py-0.5 bg-cyan-900 rounded">Esc</kbd> to cancel</span>
              <button onClick={() => setActiveTool('pan')} className="ml-2 opacity-70 hover:opacity-100"><XIcon /></button>
            </div>
          )}

          {/* Top bar.
              It stays on screen in 3D. The overlay is a fixed z-70 sheet across
              the whole window, so an absolute bar inside the map column is
              painted underneath it — which is how switching to 3D used to take
              Actions, Sounds, Dice, Whisper and every plugin button with it.
              Going fixed at z-[80] puts it back above the overlay, the same
              level the view switch and roll log already use to survive there,
              and tracking panelInset keeps it clear of an open GM panel exactly
              as the flex column does in 2D. */}
          <div
            className={`flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none ${
              show3D ? 'fixed left-0 z-[80]' : 'absolute top-0 left-0 right-0'
            }`}
            // `top` joins `right` here for the same reason: once the bar is
            // fixed it measures from the window, not from the map column, so
            // the initiative strip above it no longer pushes it down and has
            // to be accounted for explicitly.
            style={show3D ? { right: panelInset, top: combatActive ? COMBAT_STRIP_H : 0 } : undefined}
          >
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setPanelOpen(!panelOpen)}
                className="bg-dnd-panel/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 hover:border-dnd-gold transition-colors"
              >
                {panelOpen ? '◀ Panel' : '▶ Panel'}
              </button>
              <span className="text-dnd-gold font-semibold text-sm">{session.name}</span>
              <div className={`w-2 h-2 rounded-full ml-1 ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => setShowActionsRef(true)}
                className="bg-dnd-panel/90 text-white px-3 py-1.5 rounded-lg text-sm border border-gray-600 hover:border-yellow-400 transition-colors"
                title="Actions Reference"
              >
                📖 Actions
              </button>
              <button
                onClick={() => { setShowSounds(!showSounds); setShowDice(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${showSounds ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-dnd-panel/90 text-white border-gray-600 hover:border-indigo-400'}`}
              >
                Sounds
              </button>
              <button
                onClick={() => { setShowDice(!showDice); setShowSounds(false); }}
                className="bg-dnd-red/90 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-dnd-red border border-red-700 transition-colors"
              >
                Dice
              </button>
              <button
                onClick={() => { setShowWhisperBar(v => !v); setShowDice(false); setShowSounds(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${showWhisperBar ? 'bg-purple-700 border-purple-500 text-white' : 'bg-dnd-panel/90 text-white border-gray-600 hover:border-purple-400'}`}
                title="Whisper privately to a player"
              >
                💬 Whisper
              </button>
              <button
                onClick={() => { setShowChallengeBar(v => !v); setShowWhisperBar(false); setShowDice(false); setShowSounds(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${showChallengeBar ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-dnd-panel/90 text-white border-gray-600 hover:border-emerald-400'}`}
                title="Send a skill-check mini game to a player's phone"
              >
                🗝️ Challenge
              </button>
              {/* Plugin-registered top-bar buttons — each plugin
                  renders its own button + flyout via the
                  dmTopBarButtons registry. */}
              {Array.from(pluginRegistries.dmTopBarButtons.entries()).map(([id, entry]) => (
                <React.Fragment key={id}>
                  {entry && typeof entry.render === 'function' ? entry.render() : null}
                </React.Fragment>
              ))}
            </div>
          </div>

          {showDice && (
            <div className={`${flyoutCls} bg-dnd-panel border border-gray-600 rounded-xl p-4 w-80 shadow-2xl`} style={flyoutStyle}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-dnd-gold font-semibold">Dice Roller</h3>
                <button onClick={() => setShowDice(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
              </div>
              <DiceRoller rolls={diceRolls} />
            </div>
          )}

          {showChallengeBar && (() => {
            const playerUsers = users.filter(u => u.role !== 'dm');
            const target = challengeBarTarget && playerUsers.some(u => u.name === challengeBarTarget)
              ? challengeBarTarget
              : (playerUsers[0]?.name || null);
            const theirs = challengeResults.filter((r) => r.playerName === target).slice(0, 3);
            return (
              <div className={`${flyoutCls} bg-dnd-panel border border-emerald-700/60 rounded-xl p-4 w-96 shadow-2xl space-y-3`} style={flyoutStyle}>
                <div className="flex items-center justify-between">
                  <h3 className="text-emerald-300 font-semibold flex items-center gap-2">
                    <span>🗝️</span><span>Send a challenge</span>
                  </h3>
                  <button onClick={() => setShowChallengeBar(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
                </div>
                {playerUsers.length === 0 ? (
                  <div className="text-xs text-gray-400 italic bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                    No players connected.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Send to</label>
                      <select
                        value={target || ''}
                        onChange={(e) => setChallengeBarTarget(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                      >
                        {playerUsers.map((u) => (
                          <option key={u.name} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <ChallengeComposer
                      onSend={(payload) => {
                        if (!target) return;
                        socket.emit('dm_minigame', { targetName: target, ...payload });
                      }}
                      onCancel={() => setShowChallengeBar(false)}
                    />
                    <p className="text-[11px] text-gray-500 leading-snug">
                      It opens on their phone. The game reads that character's
                      ability and proficiency and eases itself to match.
                    </p>
                    {theirs.length > 0 && (
                      <div className="pt-2 border-t border-gray-700 space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">What came back</div>
                        {theirs.map((r) => (
                          <div key={r.id + r.ts} className="flex items-baseline gap-2 text-[11px]">
                            <span className={r.won ? 'text-emerald-300' : 'text-rose-300'}>{r.won ? '✓' : '✗'}</span>
                            <span className="text-gray-400 truncate">DC {r.dc} · {r.detail}</span>
                            <span className="ml-auto shrink-0 text-gray-600">{r.seconds}s</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {showWhisperBar && (() => {
            const playerUsers = users.filter(u => u.role !== 'dm');
            const target = whisperBarTarget && playerUsers.some(u => u.name === whisperBarTarget)
              ? whisperBarTarget
              : (playerUsers[0]?.name || null);
            return (
              <div className={`${flyoutCls} bg-dnd-panel border border-purple-700/60 rounded-xl p-4 w-80 shadow-2xl space-y-3`} style={flyoutStyle}>
                <div className="flex items-center justify-between">
                  <h3 className="text-purple-300 font-semibold flex items-center gap-2">
                    <span>💬</span><span>Whisper</span>
                  </h3>
                  <button onClick={() => setShowWhisperBar(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
                </div>
                {playerUsers.length === 0 ? (
                  <div className="text-xs text-gray-400 italic bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                    No players connected.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Send to</label>
                      <select
                        value={target || ''}
                        onChange={(e) => setWhisperBarTarget(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-purple-400"
                      >
                        {playerUsers.map((u) => (
                          <option key={u.name} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <WhisperComposer
                      onSend={(msg) => {
                        if (!target) return;
                        socket.emit('dm_whisper', { targetName: target, message: msg });
                      }}
                      onCancel={() => setShowWhisperBar(false)}
                    />
                  </>
                )}
              </div>
            );
          })()}

          {showSounds && (() => {
            // Strip extension, remove common prefixes, title-case words,
            // turn trailing digit into " (n)".
            function formatName(filename) {
              let name = filename.replace(/\.[^.]+$/, '');
              // strip known uninformative prefixes
              name = name.replace(/^(spellsound|sfx|sound|fx)[-_]/i, '');
              // split on hyphens/underscores/camelCase boundaries
              name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
              name = name.replace(/[-_]+/g, ' ');
              // move trailing lone digit to " (n)"
              name = name.replace(/\s+(\d+)$/, ' ($1)');
              return name.replace(/\b\w/g, c => c.toUpperCase()).trim();
            }

            // Directory-based group metadata
            const SUBCAT_META = {
              combat:   { label: 'Combat'   },
              creatures:{ label: 'Creatures' },
              spells:   { label: 'Spells'   },
              music:    { label: 'Music'    },
              other:    { label: 'Other'    },
            };
            const KNOWN_ORDER = ['combat','creatures','spells','music','other'];
            function subcatMeta(key) {
              return SUBCAT_META[key] || { label: key.charAt(0).toUpperCase() + key.slice(1) };
            }

            // Group by first path component; root-level legacy files go under 'other'
            const soundGroups = {};
            for (const relpath of soundFiles) {
              const parts = relpath.split('/');
              const subcat = parts.length > 1 ? parts[0] : 'other';
              const filename = parts[parts.length - 1];
              (soundGroups[subcat] = soundGroups[subcat] || []).push({ relpath, filename });
            }
            const orderedSubcats = [
              ...KNOWN_ORDER.filter(k => soundGroups[k]),
              ...Object.keys(soundGroups).filter(k => !KNOWN_ORDER.includes(k)).sort(),
            ];

            return (
              <div className={`${flyoutCls} bg-dnd-panel border border-gray-600 rounded-xl p-4 w-80 shadow-2xl`} style={flyoutStyle}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-indigo-300 font-semibold">Sounds</h3>
                  <button onClick={() => setShowSounds(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
                </div>

                {/* Upload section */}
                <div className="mb-3 p-2.5 bg-gray-800/60 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-400 font-semibold mb-2">Upload Sound</div>
                  {/* Type toggle */}
                  <div className="flex gap-1 mb-2">
                    {[['oneshot','One-Shot'],['ambient','Ambience']].map(([v,lbl]) => (
                      <button key={v} onClick={() => setUploadMainType(v)}
                        className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${uploadMainType===v ? 'bg-indigo-700 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {/* Sub-category (one-shots only) */}
                  {uploadMainType === 'oneshot' && (
                    <div className="mb-2">
                      <select
                        value={uploadSubcat}
                        onChange={e => setUploadSubcat(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 mb-1"
                      >
                        <option value="combat">Combat</option>
                        <option value="creatures">Creatures</option>
                        <option value="spells">Spells</option>
                        <option value="music">Music</option>
                        <option value="other">Other</option>
                        <option value="custom">✏️ Custom category…</option>
                      </select>
                      {uploadSubcat === 'custom' && (
                        <input
                          type="text"
                          placeholder="Category name (e.g. traps)"
                          value={uploadCustomName}
                          onChange={e => setUploadCustomName(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>
                  )}
                  <label className={`flex items-center justify-center gap-2 w-full px-3 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors ${soundUploading ? 'opacity-50 cursor-not-allowed border-gray-700 text-gray-500' : 'border-dashed border-indigo-600/60 hover:border-indigo-400 text-indigo-300 hover:bg-indigo-900/20'}`}>
                    {soundUploading ? 'Uploading…' : '+ Choose audio file'}
                    <input
                      type="file"
                      accept=".mp3,.ogg,.wav,.m4a,.webm,.flac"
                      className="hidden"
                      disabled={soundUploading}
                      onChange={e => { if (e.target.files[0]) handleSoundUpload(e.target.files[0]); e.target.value = ''; }}
                    />
                  </label>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-3">
                  {[['oneshots', 'One-Shots'], ['ambience', 'Ambience']].map(([tab, label]) => (
                    <button
                      key={tab}
                      onClick={() => setSoundTab(tab)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${soundTab === tab ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {soundTab === 'oneshots' ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-400 w-14 shrink-0">Volume</span>
                      <input
                        type="range" min={0} max={1} step={0.05} value={soundVolume}
                        onChange={e => setSoundVolume(Number(e.target.value))}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="text-xs text-gray-300 w-8 text-right font-mono">
                        {Math.round(soundVolume * 100)}%
                      </span>
                    </div>

                    <button
                      onClick={handleStopSounds}
                      className="w-full mb-3 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded-lg text-sm transition-colors"
                    >
                      ⏹ Stop All
                    </button>

                    {soundFiles.length === 0 ? (
                      <div className="text-gray-500 text-xs text-center py-4">
                        No one-shots yet — upload audio files above.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                        {orderedSubcats.map(subcat => {
                          const { label, icon } = subcatMeta(subcat);
                          return (
                          <div key={subcat}>
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              <span className="text-sm">{icon}</span>
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {soundGroups[subcat].map(({ relpath, filename }) => (
                                <div key={relpath} className="flex items-center gap-1">
                                  <button
                                    onClick={() => handlePlaySound(relpath)}
                                    className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-indigo-900/50 border border-gray-700 hover:border-indigo-600 rounded-lg text-left transition-colors"
                                  >
                                    <span className="text-xs shrink-0">▶</span>
                                    <span className="text-xs text-gray-200 truncate">{formatName(filename)}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSound(relpath, false)}
                                    className="text-gray-600 hover:text-red-400 text-sm px-1 transition-colors shrink-0"
                                    title="Delete"
                                  ><XIcon /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (() => {
                  // Build per-map lookups for the currently-playing list
                  // and the picker's "is this layered here?" check.
                  const tracksOnThisMap = runningAmbients[session?.map_id] || [];
                  const playingFilenamesOnThisMap = new Set(tracksOnThisMap.map(t => t.filename));
                  // Flatten { mapId: tracks[] } into one row per track
                  // so each layer in every map gets its own slider.
                  const runningRows = Object.entries(runningAmbients || {})
                    .flatMap(([mapIdStr, list]) =>
                      Array.isArray(list)
                        ? list.map(t => ({ mapIdStr, mid: Number(mapIdStr), filename: t.filename, volume: t.volume }))
                        : []
                    );
                  const totalLayers = runningRows.length;
                  return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-400 w-14 shrink-0">New track</span>
                      <input
                        type="range" min={0} max={1} step={0.05} value={ambientVolume}
                        onChange={e => setAmbientVolume(Number(e.target.value))}
                        className="flex-1 accent-purple-500"
                        title="Default starting volume for the next track you add to the scene"
                      />
                      <span className="text-xs text-gray-300 w-8 text-right font-mono">
                        {Math.round(ambientVolume * 100)}%
                      </span>
                    </div>

                    <button
                      onClick={handleStopAmbient}
                      className="w-full mb-3 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded-lg text-sm transition-colors"
                    >
                      ⏹ Stop All Ambience
                    </button>

                    {runningRows.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <div className="text-[11px] uppercase tracking-wider text-gray-500">
                            Currently Playing ({totalLayers})
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {runningRows.map(({ mapIdStr, mid, filename, volume }) => {
                            const m = maps.find(mm => mm.id === mid);
                            const mapLabel = m?.name || `Map #${mid}`;
                            const onThisMap = mid === session?.map_id;
                            return (
                              <div
                                key={`${mapIdStr}::${filename}`}
                                className={`flex flex-col gap-1.5 px-2 py-1.5 rounded-lg border ${onThisMap ? 'bg-purple-900/40 border-purple-600' : 'bg-gray-800 border-gray-700'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-purple-300">▶</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-200 truncate">{formatName(filename)}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{mapLabel}{onThisMap ? ' · here' : ''}</div>
                                  </div>
                                  <button
                                    onClick={() => onThisMap ? socket.emit('stop_ambient_track', { filename }) : handleStopAmbientOnMap(mid)}
                                    className="text-gray-500 hover:text-red-400 text-xs px-1.5 py-0.5 rounded transition-colors"
                                    title={onThisMap ? `Stop "${formatName(filename)}"` : `Stop all ambience on ${mapLabel}`}
                                  >⏹</button>
                                </div>
                                {onThisMap && (
                                  <div className="flex items-center gap-2 pl-4">
                                    <input
                                      type="range" min={0} max={1} step={0.02} value={volume}
                                      onChange={e => handleSetAmbientTrackVolume(filename, Number(e.target.value))}
                                      className="flex-1 accent-purple-500"
                                      title="Track volume"
                                    />
                                    <span className="text-[10px] text-gray-400 w-8 text-right font-mono">
                                      {Math.round(volume * 100)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {ambientFiles.length === 0 ? (
                      <div className="text-gray-500 text-xs text-center py-4">
                        No ambience yet — upload audio files above.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
                        {ambientFiles.map(f => {
                          const layered = playingFilenamesOnThisMap.has(f);
                          return (
                          <div key={f} className="flex items-center gap-1">
                            <button
                              onClick={() => handlePlayAmbient(f)}
                              className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 border rounded-lg text-left transition-colors ${layered ? 'bg-purple-900/60 border-purple-600 text-purple-200' : 'bg-gray-800 hover:bg-purple-900/30 border-gray-700 hover:border-purple-600 text-gray-200'}`}
                              title={layered ? 'Click to remove from scene' : 'Click to layer into the scene'}
                            >
                              <span className="text-xs shrink-0">{layered ? '▶' : '+'}</span>
                              <span className="text-xs truncate">{formatName(f)}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSound(`ambient/${f}`, true)}
                              className="text-gray-600 hover:text-red-400 text-sm px-1 transition-colors shrink-0"
                              title="Delete"
                            ><XIcon /></button>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                  );
                })()}
              </div>
            );
          })()}

          {!mapUrl && !placingCreature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-500">
                <MapIcon />
                <div>Upload a battle map in the Map panel</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GM Panel */}
      {panelOpen && (
        <>
        {/* Resize handle */}
        <div
          className={`w-1.5 bg-gray-700 hover:bg-dnd-gold/60 cursor-col-resize shrink-0 transition-colors ${show3D ? 'relative z-[85]' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = panelWidth;
            function onMove(ev) { setPanelWidth(Math.max(260, Math.min(600, startW - (ev.clientX - startX)))); }
            function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />
        {/* In 3D the board is a fixed inset-0 overlay at z-70 that would cover
            this panel completely. Lifting the panel above it — rather than
            re-rendering it inside the overlay — keeps ONE copy of every tab and
            all of its state, and the flex layout still reserves the panel its
            slot underneath, so it lands in exactly the right place.

            ABOVE the bottom-right chrome (z-80: the roll log and the view
            switch), not below it. A z-index on this div makes it a stacking
            context, which means every dialog opened from inside a panel tab —
            the image framer, the token editor, the spell and creature editors —
            is confined to this layer no matter what z-index it sets for itself.
            At z-75 they were sealed underneath the log and the view switch,
            which sat over their buttons with no way to raise them.

            Nothing is hidden by the swap: the chrome is positioned at
            `right: panelInset + 16`, so it is already clear of the panel's
            width and the two never overlap. */}
        <div
          className={`bg-dnd-panel border-l border-gray-700 flex flex-col shrink-0 h-full ${show3D ? 'relative z-[85]' : ''}`}
          style={{ width: panelWidth }}
        >
          <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
            <PanelTabBar
              tabs={panelTabs}
              labels={PANEL_LABELS}
              activeTab={panelTab}
              onSelect={setPanelTab}
              onReorder={reorderPanelTab}
              badges={{ shop: shopOffers.filter((o) => o.status === 'pending' || o.status === 'countered').length }}
            />
            <PluginDmTabs activeTab={panelTab} onSelect={setPanelTab} />
          </div>

          <div className="flex-1 overflow-hidden relative">
            {/* ── MAP TAB ── */}
            {panelTab === 'map' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Upload Battle Map</h3>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 cursor-pointer transition-colors ${
                    mapUploading ? 'border-dnd-gold bg-dnd-gold/5' : 'border-gray-600 hover:border-dnd-gold/60'
                  }`}>
                    <span className="text-3xl mb-2">{mapUploading ? <SpinnerIcon /> : null}</span>
                    <span className="text-sm text-gray-400">{mapUploading ? 'Uploading...' : 'Click to upload map image'}</span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG, WebP up to 100MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleMapUpload} disabled={mapUploading} />
                  </label>

                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-5 cursor-pointer transition-colors ${
                    dd2vttImporting ? 'border-purple-400 bg-purple-900/10' : 'border-gray-600 hover:border-purple-400/60'
                  }`}>
                    {dd2vttImporting && <span className="mb-1.5"><SpinnerIcon /></span>}
                    <span className="text-sm text-gray-300 font-medium">
                      {dd2vttImporting ? 'Importing…' : 'Import Dungeondraft (.dd2vtt)'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {dd2vttImporting
                        ? 'Importing…'
                        : (() => {
                            const on = Object.entries(dd2vttOpts).filter(([, v]) => v).map(([k]) => k);
                            return on.length ? `Imports map + ${on.join(' + ')}` : 'Imports the map image only';
                          })()}
                    </span>
                    <input
                      type="file"
                      accept=".dd2vtt"
                      className="hidden"
                      onChange={handleDD2VTTImport}
                      disabled={dd2vttImporting}
                    />
                  </label>

                  {/* The storeys of the board currently loaded. Only shown
                      when there are any — an ordinary map has none. */}
                  {levels.length > 0 && (
                    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-dnd-gold">Levels</h3>
                        <span className="text-[11px] text-gray-500">ground floor at the bottom</span>
                      </div>
                      {[...levels].sort((a, b) => b.level_index - a.level_index).map((l) => (
                        <div key={l.level_index} className="flex items-center gap-1.5 bg-gray-900/60 border border-gray-700 rounded-lg px-2 py-1.5">
                          <div className="flex flex-col shrink-0">
                            <button
                              type="button"
                              onClick={() => reorderLevel(l.level_index, 1)}
                              disabled={l.level_index === levels.length - 1}
                              title="Move up"
                              className="text-[10px] leading-none px-1 text-gray-400 hover:text-white disabled:opacity-25"
                            >▲</button>
                            <button
                              type="button"
                              onClick={() => reorderLevel(l.level_index, -1)}
                              disabled={l.level_index === 0}
                              title="Move down"
                              className="text-[10px] leading-none px-1 text-gray-400 hover:text-white disabled:opacity-25"
                            >▼</button>
                          </div>
                          <button
                            type="button"
                            onClick={() => socket.emit('set_map_level', { levelIndex: l.level_index })}
                            title="Show this level"
                            className={`w-6 h-6 shrink-0 rounded text-[11px] font-bold ${
                              l.level_index === activeLevel ? 'bg-dnd-gold text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >{l.level_index}</button>
                          <input
                            value={l.name || ''}
                            onChange={(e) => patchLevel(l.level_index, { name: e.target.value })}
                            maxLength={80}
                            className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100"
                          />
                          <label className="flex items-center gap-1 shrink-0" title="Storey height, used by the 3D view">
                            <input
                              type="number" min="1" max="200" value={l.height_ft ?? 10}
                              onChange={(e) => patchLevel(l.level_index, { height_ft: Number(e.target.value) || 10 })}
                              className="w-12 bg-gray-900 border border-gray-700 rounded px-1 py-1 text-xs text-gray-100 text-right"
                            />
                            <span className="text-[10px] text-gray-500">ft</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => deleteLevel(l.level_index)}
                            disabled={levels.length <= 1}
                            title="Delete this level"
                            className="shrink-0 px-1.5 text-xs text-gray-500 hover:text-red-400 disabled:opacity-25"
                          >✕</button>
                        </div>
                      ))}
                      <p className="text-[11px] text-gray-500 leading-snug">
                        Reordering carries each floor's walls, doors, lights and tokens with it.
                      </p>
                    </div>
                  )}

                  {/* Multi-storey buildings. A .dd2vtt holds ONE level, so a
                      building comes in as several files ordered ground-up. */}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-sky-400/60 rounded-xl py-5 cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300 font-medium">Import multilevel Dungeondraft</span>
                    <span className="text-xs text-gray-500 mt-1">Pick one .dd2vtt per floor</span>
                    <input
                      type="file"
                      accept=".dd2vtt"
                      multiple
                      className="hidden"
                      onChange={handleLevelFilesPicked}
                    />
                  </label>

                  {/* What to take from the file. Unticked parts are skipped
                      entirely — handy when a map's own lighting or its
                      thousands of LOS segments would fight your setup. */}
                  <div className="flex items-center gap-3 mt-1.5 px-1">
                    <span className="text-[11px] text-gray-500">Include:</span>
                    {[
                      { key: 'walls',  label: 'Walls'  },
                      { key: 'doors',  label: 'Doors'  },
                      { key: 'lights', label: 'Lights' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dd2vttOpts[key]}
                          disabled={dd2vttImporting}
                          onChange={(e) => setDd2vttOpts(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="accent-purple-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Wildspace Map</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Grid defines the play area; the image is a fixed starscape behind it that
                    never pans or scales. Lets an encounter run to 1000ft without a huge image.
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex-1">
                      <span className="block text-xs text-gray-400 mb-1">Width (squares)</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={wildspaceCols}
                        onChange={(e) => setWildspaceCols(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="block text-xs text-gray-400 mb-1">Height (squares)</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={wildspaceRows}
                        onChange={(e) => setWildspaceRows(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {wildspaceCols * 5}ft × {wildspaceRows * 5}ft
                  </p>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-5 cursor-pointer transition-colors ${
                    mapUploading ? 'border-indigo-400 bg-indigo-900/10' : 'border-gray-600 hover:border-indigo-400/60'
                  }`}>
                    {mapUploading && <span className="mb-1.5"><SpinnerIcon /></span>}
                    <span className="text-sm text-gray-300 font-medium">
                      {mapUploading ? 'Uploading…' : 'Upload starscape backdrop'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">Screen-sized image is enough</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleWildspaceUpload} disabled={mapUploading} />
                  </label>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Generate System Map</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    A hexcrawl across a solar system — star at the centre, orbital rings
                    to travel between. Planets aren't drawn: place them as tokens wherever
                    you want them.
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex-1">
                      <span className="block text-xs text-gray-400 mb-1">Stars</span>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={systemStars}
                        onChange={(e) => setSystemStars(Math.min(4, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="block text-xs text-gray-400 mb-1">Orbital rings</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={systemRings}
                        onChange={(e) => setSystemRings(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex-1">
                      <span className="block text-xs text-gray-400 mb-1">Width (hexes)</span>
                      <input
                        type="number"
                        min={4}
                        max={200}
                        value={systemCols}
                        onChange={(e) => setSystemCols(Math.min(200, Math.max(4, parseInt(e.target.value) || 4)))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="block text-xs text-gray-400 mb-1">Height (hexes)</span>
                      <input
                        type="number"
                        min={4}
                        max={200}
                        value={systemRows}
                        onChange={(e) => setSystemRows(Math.min(200, Math.max(4, parseInt(e.target.value) || 4)))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSystem}
                    disabled={systemGenerating}
                    className="w-full rounded-lg py-2 text-sm font-semibold transition-colors bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white"
                  >
                    {systemGenerating
                      ? 'Generating…'
                      : `Generate ${systemStars > 1 ? `${systemStars}-star` : 'single-star'} system, ${systemRings} ring${systemRings === 1 ? '' : 's'}`}
                  </button>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Each generation gets its own starfield. Rings are numbered from the
                    star outwards, so "third orbit" means the same circle to everyone.
                  </p>
                </div>

                {/* The 3D view's surrounding panorama. Separate from the map
                    image because it's a different kind of picture: the board is
                    drawn top-down, a sky is an equirectangular panorama, and
                    .hdr — which is what people actually have for this — isn't
                    an image type the map uploader will take. */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">3D Sky</h3>
                  <div className="space-y-2 bg-gray-800 rounded-xl p-3">
                    <p className="text-[11px] text-gray-400 leading-snug">
                      Wraps this map in a panorama in the 3D view instead of laying
                      it flat. Best with a 2:1 equirectangular image — .hdr, .jpg,
                      .png or .webp.
                    </p>
                    <div className="flex items-center gap-2">
                      <label
                        className={`flex-1 text-center px-3 py-2 rounded-lg text-xs border cursor-pointer ${
                          session.map_id
                            ? 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                            : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {skyUploading ? (skyStage || 'Uploading…') : session.map_sky_image ? 'Replace panorama' : 'Upload panorama'}
                        <input
                          type="file"
                          accept=".hdr,image/*"
                          className="hidden"
                          disabled={!session.map_id || skyUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file || !session.map_id) return;
                            setSkyUploading(true);
                            try {
                              // Shrink it here, before it goes anywhere. The
                              // sky is a backdrop on an unlit sphere, so an
                              // HDRI's float range is decoded and then thrown
                              // away — see utils/skyConvert.js.
                              // A failed conversion must not cost the GM their
                              // upload — fall back to the file they picked.
                              let toSend = file;
                              let note = null;
                              try {
                                const r = await prepareSkyUpload(file, setSkyStage);
                                toSend = r.file;
                                note = r.note;
                              } catch (convErr) {
                                console.warn('Sky conversion failed, uploading the original:', convErr);
                                note = `Could not convert this file (${convErr.message}) — uploaded as-is.`;
                              }
                              setSkyStage('Uploading…');
                              const fd = new FormData();
                              fd.append('sky', toSend);
                              const r = await fetch(`/api/maps/${session.map_id}/sky`, { method: 'POST', body: fd });
                              if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
                              const row = await r.json();
                              setSession((prev) => ({ ...prev, map_sky_image: row.sky_image_path || null }));
                              setSkyNote(note);
                            } catch (err) {
                              alert(`Sky upload failed: ${err.message}`);
                            } finally {
                              setSkyUploading(false);
                              setSkyStage('');
                            }
                          }}
                        />
                      </label>
                      {skyNote && (
                        <p className="text-[10px] text-emerald-300/90 leading-snug mt-1">{skyNote}</p>
                      )}
                      {session.map_sky_image && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await fetch(`/api/maps/${session.map_id}/sky`, { method: 'DELETE' });
                              setSession((prev) => ({ ...prev, map_sky_image: null }));
                            } catch {}
                          }}
                          className="px-3 py-2 rounded-lg text-xs bg-gray-900 border border-red-900/60 text-red-300 hover:text-red-200"
                        >Remove</button>
                      )}
                    </div>
                    {/* Built-in skies. Only offered when nothing is uploaded —
                        a panorama of the actual place always beats a drawn one,
                        and two competing controls would just raise the question
                        of which wins. */}
                    {!session.map_sky_image && (
                      <div className="mt-2">
                        <p className="text-[11px] text-gray-400 mb-1.5">
                          Or use a built-in sky — no upload needed:
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SKY_PRESETS.map((sp) => {
                            const active = session.map_sky_preset === sp.id;
                            return (
                              <button
                                key={sp.id}
                                type="button"
                                title={sp.hint}
                                onClick={async () => {
                                  const next = active ? null : sp.id;
                                  try {
                                    const r = await fetch(`/api/maps/${session.map_id}/sky-preset`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ preset: next }),
                                    });
                                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                                    setSession((prev) => ({ ...prev, map_sky_preset: next }));
                                  } catch (err) {
                                    alert(`Could not set the sky: ${err.message}`);
                                  }
                                }}
                                className={`rounded-lg overflow-hidden border transition-colors ${
                                  active
                                    ? 'border-dnd-gold ring-1 ring-dnd-gold'
                                    : 'border-gray-700 hover:border-gray-500'
                                }`}
                              >
                                {/* The thumbnail is the preset itself, drawn small —
                                    so the list can never disagree with the sky. */}
                                <img
                                  src={skyPresetPreviewUrl(sp.id)}
                                  alt=""
                                  className="w-full h-10 object-cover block"
                                />
                                <span className={`block text-[10px] py-1 ${active ? 'text-dnd-gold' : 'text-gray-400'}`}>
                                  {sp.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {session.map_sky_preset && (
                          <p className="text-[11px] text-green-400 mt-1.5">
                            Using the built-in {(SKY_PRESETS.find((x) => x.id === session.map_sky_preset) || {}).label} — click it again to clear.
                          </p>
                        )}
                      </div>
                    )}
                    {session.map_sky_image && (
                      <p className="text-[11px] text-green-400 truncate">
                        Using {session.map_sky_image.split('/').pop()}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Grid Shape</h3>
                  <div className="flex gap-2">
                    {[
                      { v: 'square', label: 'Square', hint: 'Standard battlemap grid' },
                      { v: 'hex',    label: 'Hex',    hint: 'Flat-top hexes — overland travel, hexcrawls' },
                    ].map(({ v, label, hint }) => (
                      <button
                        key={v}
                        onClick={() => handleGridTypeChange(v)}
                        disabled={!session.map_id}
                        title={session.map_id ? hint : 'Select a map first'}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          (session.map_grid_type || 'square') === v
                            ? 'bg-dnd-gold/20 border-dnd-gold text-dnd-gold'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Set per map. Tokens, walls and lighting don't move when you switch.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Scale Key</h3>
                  <div className="space-y-3 bg-gray-800 rounded-xl p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!session.map_grid_scale_visible}
                        disabled={!session.map_id}
                        onChange={(e) => patchActiveMapGrid(
                          { grid_scale_visible: e.target.checked },
                          { map_grid_scale_visible: e.target.checked },
                        )}
                        className="accent-dnd-gold"
                      />
                      <span className="text-xs text-gray-300">
                        Show key on the map (players and TV see it too)
                      </span>
                    </label>
                    {/* Uncontrolled + commit on blur, like the map name / floor
                        label fields above — one PATCH per edit, not per
                        keystroke. Keyed on the map id so switching maps
                        reloads the values instead of keeping the last map's. */}
                    <div className="flex items-center gap-2" key={session.map_id || 'none'}>
                      <span className="text-xs text-gray-400 shrink-0">
                        1 {(session.map_grid_type || 'square') === 'hex' ? 'hex' : 'square'} =
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        disabled={!session.map_id}
                        defaultValue={session.map_grid_scale ?? 5}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!(v > 0) || v === Number(session.map_grid_scale)) {
                            e.target.value = session.map_grid_scale ?? 5;
                            return;
                          }
                          patchActiveMapGrid({ grid_scale: v }, { map_grid_scale: v });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        className="w-20 bg-gray-900/60 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                      <input
                        type="text"
                        maxLength={24}
                        disabled={!session.map_id}
                        defaultValue={session.map_grid_unit ?? 'ft'}
                        placeholder="ft"
                        title="Anything you like — ft, miles, km, days travel"
                        onBlur={(e) => {
                          const v = e.target.value.trim().slice(0, 24);
                          if (v === (session.map_grid_unit ?? 'ft')) return;
                          patchActiveMapGrid({ grid_unit: v }, { map_grid_unit: v });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        className="flex-1 min-w-0 bg-gray-900/60 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      The unit is free text — "6 miles" or "10 days travel" both work. The
                      ruler reports in these units. Spell ranges, light and vision stay in
                      feet.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">
                    Grid Size: {effectiveGridSize}px (5ft per {(session.map_grid_type || 'square') === 'hex' ? 'hex' : 'square'})
                  </h3>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    step={5}
                    value={Math.min(effectiveGridSize, 300)}
                    onChange={(e) => handleGridSizeChange(parseInt(e.target.value))}
                    className="w-full accent-dnd-gold"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>20px</span><span>300px</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Grid Style</h3>
                  <div className="space-y-3 bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400 w-14 shrink-0">Colour</label>
                      <input
                        type="color"
                        value={gridHex}
                        onChange={(e) => handleGridStyleChange({ hex: e.target.value })}
                        className="w-9 h-8 rounded cursor-pointer border border-gray-600 bg-transparent"
                      />
                      <div
                        className="flex-1 h-3 rounded"
                        style={{ background: gridColor, border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Opacity</span>
                        <span>{Math.round(gridOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={gridOpacity}
                        onChange={(e) => handleGridStyleChange({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-dnd-gold"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Thickness</span>
                        <span>{gridThickness}px</span>
                      </div>
                      <input
                        type="range" min={0.3} max={5} step={0.1}
                        value={gridThickness}
                        onChange={(e) => handleGridStyleChange({ thickness: parseFloat(e.target.value) })}
                        className="w-full accent-dnd-gold"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Thin</span><span>Thick</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Show Map to Players</h3>
                  <button
                    onClick={() => handleLiveMapViewToggle(!liveMapView)}
                    disabled={!session.map_id}
                    className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      liveMapView
                        ? 'bg-dnd-gold/25 border-dnd-gold text-dnd-gold'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {liveMapView ? '● Projecting — tap to stop' : '🗺️ Show map to players'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {liveMapView
                      ? "Players and the TV are watching your view live — they follow your pan and zoom, and can't move anything."
                      : 'Puts the live map on every player screen, following your camera. Reveals the whole map while it\'s on.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Token Labels</h3>
                  <div className="bg-gray-800 rounded-xl p-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Name font size</span>
                      <span>{tokenNameFontSize}px</span>
                    </div>
                    <input
                      type="range" min={10} max={100} step={1}
                      value={tokenNameFontSize}
                      onChange={(e) => handleTokenNameFontSizeChange(parseInt(e.target.value, 10))}
                      className="w-full accent-dnd-gold"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Small</span><span>Large</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                      HP text and bar height scale to half the name size automatically. Synced to all players.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Default Spawn Map</h3>
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                      value={spawnMapId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        socket.emit('change_spawn_map', { sessionId: session.id, mapId: v });
                        setSpawnMapId(v);
                      }}
                    >
                      <option value="">— Use current map —</option>
                      {maps.map((m) => (
                        <option key={m.id} value={m.id}>{m.name || `Map #${m.id}`}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      New player tokens spawn on this map by default. Useful for staging incoming
                      players on a "lobby" map while the rest of the party is mid-encounter elsewhere.
                      Leave blank to use whatever map is currently loaded.
                    </p>
                  </div>
                </div>

                {/* Default-spawn bubble radius (current map). New players
                    spawning into this map scatter inside the radius so
                    a full party doesn't stack on a single tile. */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Default Spawn Bubble</h3>
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-16">Radius</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={spawnPoint?.radius ?? 0}
                        onChange={(e) => {
                          const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          setSpawnPoint(prev => ({ ...(prev || { col: 0, row: 0 }), radius: v }));
                          if (session?.map_id) socket.emit('set_spawn_point', { mapId: session.map_id, radius: v });
                        }}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="text-[11px] text-gray-300 tabular-nums w-10 text-right">{spawnPoint?.radius ?? 0} sq</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Use the <strong>Spawn → Set Spawn</strong> tool to place the centre. Set radius to 0 to
                      collapse it back to a single tile.
                    </p>
                  </div>
                </div>

                {/* Named spawn points (current map) */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Named Spawn Points</h3>
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    {(allSpawnPoints[session?.map_id] || []).length === 0 ? (
                      <div className="text-[11px] text-gray-500">
                        None on this map. Use the <strong>Spawn → Add Named</strong> tool, then click on the map to drop one.
                      </div>
                    ) : (
                      (allSpawnPoints[session?.map_id] || []).map((sp) => (
                        <div key={sp.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              defaultValue={sp.label}
                              maxLength={100}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v && v !== sp.label) {
                                  socket.emit('update_spawn_point', { id: sp.id, label: v });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                                if (e.key === 'Escape') { e.target.value = sp.label; e.target.blur(); }
                              }}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete spawn point "${sp.label}"?`)) {
                                  socket.emit('remove_spawn_point', { id: sp.id });
                                }
                              }}
                              className="px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white"
                              title="Delete spawn point"
                            >×</button>
                          </div>
                          {Array.isArray(sp.shape_points) && sp.shape_points.length >= 3 ? (
                            <div className="text-[10px] text-gray-500 pl-1">
                              {sp.shape_points.length}-vertex polygon · drag glyph to relocate
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[10px] text-gray-500 w-12">Radius</span>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                defaultValue={sp.radius ?? 0}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                  socket.emit('update_spawn_point', { id: sp.id, radius: v });
                                }}
                                className="flex-1 accent-cyan-500"
                              />
                              <span className="text-[10px] text-gray-300 tabular-nums w-8 text-right">{sp.radius ?? 0} sq</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Right-click a token → <em>Send to map → [point]</em> to drop it at a named point.
                    </p>
                  </div>
                </div>

                {/* Portals (current map) — one row per pair, both ends
                    editable side by side, because the two only make sense
                    together. */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Portals</h3>
                  <div className="bg-gray-800 rounded-xl p-3 space-y-3">
                    {portals.length === 0 ? (
                      <div className="text-[11px] text-gray-500">
                        None on this map. Pick <strong>Portals → Place Pair</strong>, then click the two squares
                        to link. Tokens teleport on click or on stepping onto a pad.
                      </div>
                    ) : (
                      Object.values(portals.reduce((acc, p) => {
                        (acc[p.pair_id] = acc[p.pair_id] || []).push(p);
                        return acc;
                      }, {})).map((pair) => (
                        <div key={pair[0].pair_id} className="space-y-2 border-b border-gray-700 last:border-0 pb-2 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">
                              Pair · {pair.length === 2 ? 'linked' : 'incomplete'}
                            </span>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this portal pair? Both ends go.')) {
                                  socket.emit('remove_portal', { id: pair[0].id });
                                }
                              }}
                              className="px-2 py-0.5 text-xs rounded bg-red-700 hover:bg-red-600 text-white"
                              title="Delete both ends"
                            >×</button>
                          </div>
                          {pair.map((p) => (
                            <div key={p.id} className="space-y-1 pl-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={p.color || '#a855f7'}
                                  onChange={(e) => socket.emit('update_portal', { id: p.id, color: e.target.value })}
                                  className="w-6 h-6 bg-transparent border border-gray-600 rounded cursor-pointer"
                                  title="Portal colour"
                                />
                                <input
                                  type="text"
                                  defaultValue={p.label}
                                  maxLength={100}
                                  placeholder={`(${(Number(p.grid_col) + 0.5).toFixed(1)}, ${(Number(p.grid_row) + 0.5).toFixed(1)})`}
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v !== (p.label || '')) socket.emit('update_portal', { id: p.id, label: v });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                    if (e.key === 'Escape') { e.target.value = p.label; e.target.blur(); }
                                  }}
                                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                                />
                              </div>
                              <div className="flex items-center gap-3 pl-1">
                                <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer" title="Players can't see or click this end. It still fires when something steps on it.">
                                  <input
                                    type="checkbox"
                                    checked={!!p.hidden}
                                    onChange={(e) => socket.emit('update_portal', { id: p.id, hidden: e.target.checked })}
                                    className="accent-fuchsia-500"
                                  />
                                  Hidden
                                </label>
                                <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer" title="Off = arrival only. Turn it off at one end for a one-way gate.">
                                  <input
                                    type="checkbox"
                                    checked={p.exit_enabled !== false}
                                    onChange={(e) => socket.emit('update_portal', { id: p.id, exitEnabled: e.target.checked })}
                                    className="accent-fuchsia-500"
                                  />
                                  Sends
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Clicking a portal sends your <em>selected</em> token through. Uncheck <em>Sends</em> on one
                      end to make the gate one-way. These rings are GM-only — players see nothing but the map
                      art, though the square is still clickable to them unless <em>Hidden</em> is ticked.
                    </p>
                  </div>
                </div>

                {/* Fog of War */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Fog of War</h3>
                  <div className="bg-gray-800 rounded-xl p-3 space-y-3">

                    {/* Ambient Light */}
                    <div>
                      <div className="text-xs font-medium text-gray-300 mb-2">Ambient Light</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: 'bright', label: 'Bright', icon: '☀️', desc: 'Outdoor daylight. All vision types see fully.' },
                          { val: 'dim',    label: 'Dim',    icon: '🌙', desc: 'Torchlit corridors. Normal vision is partially obscured.' },
                          { val: 'dark',   label: 'Dark',   icon: '🌑', desc: 'Underground darkness. Normal vision is blind.' },
                        ].map(({ val, label, icon, desc }) => (
                          <button
                            key={val}
                            title={desc}
                            onClick={() => handleAmbientLightChange(val)}
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-xs font-medium transition-colors ${
                              ambientLight === val
                                ? 'bg-dnd-gold/20 border-dnd-gold text-dnd-gold'
                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                            }`}
                          >
                            <span className="text-base">{icon}</span>
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-1.5 text-xs text-gray-500">
                        {ambientLight === 'bright' && 'Bright — all tokens see their full line of sight.'}
                        {ambientLight === 'dim'    && 'Dim — normal vision is hazy. Darkvision and Truesight see fully.'}
                        {ambientLight === 'dark'   && 'Dark — normal vision is blind. Darkvision sees dimly within range. Truesight and Blindsight unaffected.'}
                      </div>
                    </div>

                    {/* SRD edition toggle moved to the Spell Library
                        tab — keeps it next to the spell list it
                        filters and out of the FOW settings. */}

                    {/* FOW Toggle */}
                    <div className="flex items-center justify-between border-t border-gray-700 pt-2">
                      <div>
                        <div className="text-sm text-white font-medium">Player Fog of War</div>
                        <div className="text-xs text-gray-400 mt-0.5">Players see only what their tokens can see</div>
                      </div>
                      <button
                        onClick={handleToggleFow}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fowEnabled ? 'bg-orange-600' : 'bg-gray-600'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${fowEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <label className="text-xs text-gray-400 shrink-0 w-24">Edge feather</label>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={fowBlur}
                        onChange={e => handleFowBlurChange(Number(e.target.value))}
                        className="flex-1 min-w-0 accent-orange-500"
                      />
                      <span className="text-xs text-gray-300 shrink-0 w-6 text-right">{fowBlur}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="text-xs text-gray-400 shrink-0 w-24">Fog colour</label>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(fowColor) ? fowColor : '#000000'}
                        onChange={(e) => handleFowColorChange(e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer bg-transparent border border-gray-700 shrink-0 p-0"
                        title="Visible only when Fog of War is on"
                      />
                      <button
                        onClick={() => handleFowColorChange('#000000')}
                        className="text-[10px] text-gray-500 hover:text-gray-300 shrink-0"
                        title="Reset to default black"
                      >Reset</button>
                    </div>
                    <div className="text-xs text-gray-400">
                      Use the wall tools (W, R, P, O) in the left toolbar to draw LOS barriers. The GM always sees the full map.
                    </div>

                    {walls.length > 0 && (
                      <button
                        onClick={handleClearWalls}
                        className="w-full text-xs py-1.5 bg-red-900/40 hover:bg-red-800/50 border border-red-800 text-red-300 rounded-lg transition-colors"
                      >
                        Clear All Walls ({walls.length})
                      </button>
                    )}
                    {doors.length > 0 && (
                      <button
                        onClick={handleClearDoors}
                        className="w-full text-xs py-1.5 bg-red-900/40 hover:bg-red-800/50 border border-red-800 text-red-300 rounded-lg transition-colors"
                      >
                        Clear All Doors ({doors.length})
                      </button>
                    )}
                    {lights.length > 0 && (
                      <button
                        onClick={handleClearLights}
                        className="w-full text-xs py-1.5 bg-yellow-900/40 hover:bg-yellow-800/50 border border-yellow-800 text-yellow-300 rounded-lg transition-colors"
                      >
                        Clear All Lights ({lights.length})
                      </button>
                    )}
                    {magicalDarkness.length > 0 && (
                      <button
                        onClick={handleClearMagicalDarkness}
                        className="w-full text-xs py-1.5 bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700 text-purple-300 rounded-lg transition-colors"
                      >
                        Clear All Darkness/Fog ({magicalDarkness.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Doors — sprite library + per-door sprite/motion controls.
                    Draw doors with the Door tool (D) in the left toolbar. */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Doors</h3>
                  <div className="bg-gray-800 rounded-xl p-3 space-y-3">
                    {/* Sprite library */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-amber-300">Sprite Library</span>
                        <label className="text-[11px] px-2 py-1 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-800 text-amber-200 rounded cursor-pointer">
                          + Upload sprite
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleDoorSpriteUpload(f); }}
                          />
                        </label>
                      </div>
                      {doorSprites.length > 0 ? (
                        <div className="grid grid-cols-5 gap-2">
                          {doorSprites.map((s) => {
                            const isDefault = doorDefault.spritePath === s.image_path;
                            return (
                              <div key={s.id} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => handleDoorDefaultSet({
                                    spritePath: isDefault ? null : s.image_path,
                                    spriteMotion: doorDefault.spriteMotion,
                                  })}
                                  title={isDefault
                                    ? 'This is the default for new doors — click to clear it'
                                    : 'Use this for every new door'}
                                  className={`w-full aspect-square bg-gray-900 rounded border flex items-center justify-center overflow-hidden transition-colors ${
                                    isDefault
                                      ? 'border-amber-400 ring-2 ring-amber-400/60'
                                      : 'border-gray-700 hover:border-amber-700'
                                  }`}
                                >
                                  <img src={`/uploads/${s.image_path}`} alt={s.name} className="max-w-full max-h-full object-contain" />
                                </button>
                                {isDefault && (
                                  <span className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-[9px] font-semibold text-gray-900 text-center leading-tight rounded-b pointer-events-none">
                                    DEFAULT
                                  </span>
                                )}
                                <button
                                  onClick={() => handleDoorSpriteDelete(s.id)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-800 hover:bg-red-700 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete sprite"
                                >×</button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500 italic">Upload a top-down door image to overlay on doors.</p>
                      )}

                      {/* What a new door is born with. Worth saying out loud
                          that this is about FUTURE doors — the per-door
                          controls below are how you change one that already
                          exists. */}
                      <div className="mt-2 pt-2 border-t border-gray-700/70">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-gray-400">
                            New doors:{' '}
                            <span className="text-amber-300 font-semibold">
                              {doorDefault.spritePath
                                ? (doorSprites.find((s) => s.image_path === doorDefault.spritePath)?.name || 'chosen sprite')
                                : 'plain'}
                            </span>
                          </span>
                          <select
                            value={doorDefault.spriteMotion}
                            onChange={(e) => handleDoorDefaultSet({
                              spritePath: doorDefault.spritePath,
                              spriteMotion: e.target.value,
                            })}
                            className="bg-gray-800 border border-gray-700 rounded text-[11px] text-gray-200 px-1.5 py-0.5"
                            title="How a new door moves when it opens"
                          >
                            <option value="swing">Swing</option>
                            <option value="double">Double</option>
                            <option value="slide">Slide</option>
                            <option value="vanish">Vanish</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight mt-1">
                          Applied by the server to every door created from here on — drawn by hand,
                          laid with a tile, or brought in by an import. Windows stay plain.
                          Doors already on a map keep what they have.
                        </p>
                      </div>
                    </div>

                    {/* Per-door controls */}
                    <div className="border-t border-gray-700 pt-2">
                      {doors.length === 0 ? (
                        <p className="text-[11px] text-gray-500 italic">
                          No doors on this map. Select the Door tool (D) in the left toolbar and drag across a doorway.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {doors.map((d, i) => {
                            const motion = (d.sprite_motion === 'slide' || d.sprite_motion === 'double') ? d.sprite_motion : 'swing';
                            return (
                              <div key={d.id} className="bg-gray-900/60 rounded-lg p-2 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    defaultValue={d.label || ''}
                                    key={d.label || ''}
                                    placeholder={`Door ${i + 1}`}
                                    maxLength={100}
                                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (d.label || '')) handleDoorLabelSet(d.id, v); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                    className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 px-2 py-1 placeholder-gray-500"
                                    title="Rename this door"
                                  />
                                  <button
                                    onClick={() => handleDoorToggle(d.id)}
                                    className={`text-[11px] px-2 py-0.5 rounded ${d.is_open ? 'bg-green-800 hover:bg-green-700 text-green-100' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                                  >{d.is_open ? 'Open' : 'Closed'}</button>
                                  <button
                                    onClick={() => handleDoorFlip(d.id)}
                                    className="text-[11px] px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                                    title="Flip swing direction"
                                  >Flip</button>
                                  <button
                                    onClick={() => handleDoorDelete(d.id)}
                                    className="text-[11px] px-1.5 py-0.5 rounded bg-red-900/60 hover:bg-red-800 text-red-300"
                                    title="Delete door"
                                  >×</button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={d.sprite_path || ''}
                                    onChange={(e) => handleDoorSpriteSet({ doorId: d.id, spritePath: e.target.value || null, spriteMotion: motion })}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 px-2 py-1"
                                  >
                                    <option value="">No sprite (schematic)</option>
                                    {doorSprites.map((s) => (
                                      <option key={s.id} value={s.image_path}>{s.name}</option>
                                    ))}
                                  </select>
                                  <div className="flex rounded overflow-hidden border border-gray-700 shrink-0">
                                    {['swing', 'slide', 'double'].map((m) => (
                                      <button
                                        key={m}
                                        onClick={() => handleDoorSpriteSet({ doorId: d.id, spritePath: d.sprite_path || null, spriteMotion: m })}
                                        disabled={!d.sprite_path}
                                        className={`text-[11px] px-2 py-1 capitalize transition-colors ${
                                          motion === m
                                            ? 'bg-amber-700 text-amber-100'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        } ${!d.sprite_path ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        title={!d.sprite_path ? 'Assign a sprite first' : m === 'double' ? 'Splits the sprite into two leaves that swing apart' : `${m} motion`}
                                      >{m}</button>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-[11px] text-gray-600 mt-2">Tip: right-click a door on the map for the same options.</p>
                    </div>
                  </div>
                </div>

                {maps.length > 0 && (() => {
                  // Group by floor_label so multi-floor dungeons read clearly.
                  const groups = new Map();
                  for (const m of maps) {
                    const k = m.floor_label || '';
                    if (!groups.has(k)) groups.set(k, []);
                    groups.get(k).push(m);
                  }
                  const groupKeys = Array.from(groups.keys()).sort();
                  return (
                    <div>
                      <h3 className="text-sm font-semibold text-dnd-gold mb-2">Map Library</h3>
                      <div className="space-y-3">
                        {groupKeys.map(gk => (
                          <div key={gk}>
                            {gk && <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{gk}</div>}
                            <div className="space-y-2">
                              {groups.get(gk).map((m) => (
                                <div
                                  key={m.id}
                                  onClick={() => handleChangeMap(m.id)}
                                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    session.map_id === m.id ? 'bg-dnd-gold/10 border border-dnd-gold/30' : 'bg-gray-800 hover:bg-gray-750'
                                  }`}
                                >
                                  <div className="w-12 h-9 bg-gray-700 rounded overflow-hidden shrink-0">
                                    <Thumb src={`/uploads/${m.image_path}`} alt={m.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <input
                                      onClick={(e) => e.stopPropagation()}
                                      onBlur={async (e) => {
                                        const v = e.target.value.trim();
                                        if (!v || v === m.name) {
                                          // Empty / unchanged: revert to the
                                          // current name so the field never
                                          // shows blank after a no-op edit.
                                          e.target.value = m.name;
                                          return;
                                        }
                                        try {
                                          const res = await fetch(`/api/maps/${m.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ name: v }),
                                          });
                                          if (res.ok) await loadMaps(session.id);
                                        } catch {}
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.target.blur();
                                        if (e.key === 'Escape') { e.target.value = m.name; e.target.blur(); }
                                      }}
                                      defaultValue={m.name}
                                      maxLength={120}
                                      title="Click to rename map"
                                      className="w-full bg-transparent hover:bg-gray-900/40 focus:bg-gray-900/60 border border-transparent hover:border-gray-700 focus:border-dnd-gold rounded px-1.5 py-0.5 text-sm text-white truncate outline-none"
                                    />
                                    <div className="text-xs text-gray-400 mt-0.5 px-1.5">
                                      Grid: {m.grid_size}px
                                      {m.grid_type === 'hex' ? ' · hex' : ''}
                                      {m.floor_label ? ` · ${m.floor_label}` : ''}
                                    </div>
                                    <input
                                      onClick={(e) => e.stopPropagation()}
                                      onBlur={async (e) => {
                                        const v = e.target.value;
                                        if ((m.floor_label || '') === v) return;
                                        try {
                                          const res = await fetch(`/api/maps/${m.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ floor_label: v }),
                                          });
                                          if (res.ok) await loadMaps(session.id);
                                        } catch {}
                                      }}
                                      defaultValue={m.floor_label || ''}
                                      placeholder="Floor label (e.g. Ground)"
                                      className="mt-1 w-full bg-gray-900/40 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-gray-300"
                                    />
                                  </div>
                                  {session.map_id === m.id && <span className="text-dnd-gold text-xs shrink-0">Active</span>}
                                  <label
                                    onClick={(e) => e.stopPropagation()}
                                    title="Swap the artwork, keeping walls, doors, lights and tokens"
                                    className={`shrink-0 text-sm px-1 transition-colors ${
                                      swappingMapArt === m.id
                                        ? 'text-dnd-gold cursor-wait'
                                        : 'text-gray-600 hover:text-dnd-gold cursor-pointer'
                                    }`}
                                  >
                                    {swappingMapArt === m.id ? '…' : '🖼️'}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={swappingMapArt != null}
                                      onChange={(e) => handleSwapMapArt(e, m.id)}
                                    />
                                  </label>
                                  <button
                                    onClick={(e) => handleDeleteMap(e, m.id)}
                                    title="Delete map"
                                    className="shrink-0 text-gray-600 hover:text-red-400 transition-colors text-sm px-1"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── LIBRARY TAB ── */}
            {panelTab === 'library' && (
              <CreatureLibrary sessionId={session.id} onAddToMap={handleAddToMap} aiSettings={aiSettings} />
            )}

            {/* ── LOBBY TAB ── */}
            {panelTab === 'tables' && (
              <RollableTables
                onRoll={(tableId, secret) => socket.emit('roll_table', { tableId, secret })}
              />
            )}

            {panelTab === 'sneak' && (
              <div className="h-full overflow-y-auto">
                <SneakPanel
                  sessionId={session?.id}
                  enabled={sneakMode}
                  tokens={tokens}
                  onSetMode={(enabled) => socket.emit('set_sneak_mode', { sessionId: session?.id, enabled })}
                  onSetSneaking={(tokenId, sneaking, stealthDc) =>
                    socket.emit('set_token_sneaking', { tokenId, sneaking, stealthDc })}
                  onSetFacing={(tokenId, facing, arc) =>
                    socket.emit('set_token_facing', { tokenId, facing, arc })}
                  onSetSenseArc={(tokenId, index, arc) =>
                    socket.emit('set_token_sense_arc', { tokenId, index, arc })}
                  onSetSenses={(tokenId, senses) =>
                    socket.emit('player_set_token_senses', { tokenId, senses })}
                  onSetMoveMode={(tokenId, mode) =>
                    socket.emit('set_token_move_mode', { tokenId, mode })}
                  onClearAwareness={(tokenId, sessId) =>
                    socket.emit('clear_awareness', { tokenId, sessionId: sessId })}
                />
              </div>
            )}

            {panelTab === 'shop' && (
              <div className="h-full overflow-y-auto">
                <ShopPanel
                  sessionId={session?.id}
                  shops={shopList}
                  shop={shop}
                  offers={shopOffers}
                  onSelectShop={(id) => {
                    if (!id) { setShop(null); return; }
                    socket.emit('shop_save', { sessionId: session?.id, shopId: id,
                      name: shopList.find((x) => x.id === id)?.name,
                      blurb: shopList.find((x) => x.id === id)?.blurb,
                      allowHaggle: shopList.find((x) => x.id === id)?.allow_haggle !== false,
                      allowSelling: shopList.find((x) => x.id === id)?.allow_selling !== false });
                  }}
                  onSaveShop={(payload) => socket.emit('shop_save', { sessionId: session?.id, ...payload })}
                  onDeleteShop={(shopId) => socket.emit('shop_delete', { shopId, sessionId: session?.id })}
                  onOpenShop={(shopId, open) => socket.emit('shop_open', { shopId, sessionId: session?.id, open })}
                  onSaveItem={(listing, itemId) => socket.emit('shop_item_save', {
                    shopId: shop?.id, itemId, item: listing.item,
                    playerName: listing.playerName, playerDesc: listing.playerDesc,
                    showStats: listing.showStats, priceCp: listing.priceCp, qty: listing.qty,
                  })}
                  onRemoveItem={(itemId) => socket.emit('shop_item_remove', { shopId: shop?.id, itemId })}
                  onRespond={(offerId, action, counterCp, note) =>
                    socket.emit('shop_offer_respond', { offerId, action, counterCp, note })}
                />
              </div>
            )}

            {panelTab === 'print' && (
              <TokenSheet sessionId={session?.id} sessionTokens={tokens} />
            )}

            {panelTab === 'tiles' && (
              <TileMapPanel
                sessionId={session?.id}
                isTileMap={session?.map_type === 'tiles'}
                deck={tileDeck}
                onDeckChange={(d) => {
                  setTileDeck(d);
                  // A different (or rebuilt) deck means the turned card and
                  // the counts belong to the old one. Cleared rather than
                  // left showing, so the GM never lays a card off a pile
                  // that is no longer in play.
                  setPendingTile(null);
                  setTileCounts(d?.counts || { draw: 0, pending: 0, discard: 0 });
                }}
                counts={tileCounts}
                pendingTile={pendingTile}
                staged={stagedTile}
                rotation={tileRotation}
                onRotate={setTileRotation}
                onCommit={() => {
                  if (!pendingTile || !stagedTile || !session?.map_id) return;
                  // A directly-picked tile needs no deck; a drawn card does.
                  if (!pendingTile.direct && !tileDeck) return;
                  socket.emit('tiles_place', {
                    ...(pendingTile.direct
                      ? { tileId: pendingTile.id }
                      : { deckId: tileDeck.id }),
                    mapId: session.map_id,
                    col: stagedTile.col, row: stagedTile.row, rotation: tileRotation,
                  });
                }}
                onUnstage={() => setStagedTile(null)}
                // Picked out of the library rather than drawn. Marked
                // `direct` so committing places the library tile itself and
                // spends no card — everything between (staging, dragging,
                // rotating) is the same machinery either way.
                onPickTile={(t) => {
                  setPendingTile(t ? { ...t, direct: true } : null);
                  setStagedTile(null);
                  setTileRotation(0);
                }}
                onDraw={() => tileDeck && socket.emit('tiles_draw_card', { deckId: tileDeck.id })}
                onDiscardCard={() => tileDeck && socket.emit('tiles_discard_card', { deckId: tileDeck.id })}
                onReshuffle={() => tileDeck && socket.emit('tiles_reshuffle', { deckId: tileDeck.id })}
                onCreateMap={handleCreateTileMap}
              />
            )}

            {panelTab === 'lobby' && (
              <div className="h-full overflow-y-auto p-3 space-y-3">
                <div className={`rounded-lg px-3 py-2 text-sm font-semibold text-center ${
                  sessionStarted ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/50 text-amber-300'
                }`}>
                  {sessionStarted ? 'Session is running' : 'Players are in the lobby'}
                </div>

                <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-gray-900/60 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400">In the lobby</span>
                    <span className="text-[11px] text-gray-500">
                      {lobbyRoster.length} {lobbyRoster.length === 1 ? 'player' : 'players'}
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
                    {lobbyRoster.length === 0 && (
                      <li className="px-3 py-2.5 text-xs text-gray-500">No players connected.</li>
                    )}
                    {lobbyRoster.map((r) => (
                      <li key={r.socketId} className="px-3 py-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-green-400" />
                        <span className="text-sm text-gray-200 shrink-0">{r.name}</span>
                        <span className="text-[11px] text-gray-500 truncate flex-1">
                          {r.characterName || 'no character yet'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Scheduling. Lives in the Lobby tab because the countdown it
                    drives is a lobby fixture — this is the tab the GM is on
                    when they are thinking about the waiting room at all. */}
                <NextSessionPanel
                  at={session?.next_session_at || null}
                  note={session?.next_session_note || ''}
                  minutes={session?.next_session_minutes ?? 180}
                  sessionName={session?.name}
                  onSave={({ at, note, minutes }) =>
                    socket.emit('dm_set_next_session', { sessionId: session.id, at, note, minutes })}
                  onClear={() =>
                    socket.emit('dm_set_next_session', { sessionId: session.id, at: null })}
                />

                {/* Getting to the lobby. "The lobby" isn't a room you enter —
                    it's the session having no map — so this is the control that
                    unloads the map, and the one that puts it back. */}
                {session?.map_id ? (
                  <button
                    type="button"
                    onClick={handleGoToLobby}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors bg-gray-700 hover:bg-gray-600 text-gray-100"
                    title="Unload the current map — you and the players all land in the lobby"
                  >
                    Go to the lobby
                  </button>
                ) : preLobbyMapId ? (
                  <button
                    type="button"
                    onClick={() => { handleChangeMap(preLobbyMapId); setPreLobbyMapId(null); }}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors bg-dnd-gold hover:bg-yellow-400 text-gray-900"
                    title="Load that map again for everyone"
                  >
                    Back to {maps.find((m) => m.id === preLobbyMapId)?.name || 'the map'}
                  </button>
                ) : null}

                {/* Mapless combat. Only offered when no map is loaded — with a
                    map up, the map's own tracker and combat picker are the
                    right tools and these tokens wouldn't even be visible. */}
                {!session?.map_id && (
                  <LobbyCombatRoster
                    tokens={tokens}
                    combatActive={combatActive}
                    lobbyRoster={lobbyRoster}
                    onAddCreature={(c) => socket.emit('add_lobby_token', { sessionId: session.id, creatureId: c.id })}
                    onAddPlayer={(r) => socket.emit('add_lobby_token', {
                      sessionId: session.id,
                      creatureId: r.creatureId,
                      playerName: r.name,
                    })}
                    onRemoveToken={(tokenId) => socket.emit('remove_token', { tokenId })}
                    onInitiativeChange={handleInitiativeChange}
                    onStartCombat={() => socket.emit('set_combat', {
                      sessionId: session.id,
                      active: true,
                      tokenIds: tokens.map((t) => t.id),
                      shipIds: [],
                    })}
                    onEndCombat={handleEndCombat}
                  />
                )}

                <button
                  type="button"
                  onClick={spawnPlayersToMap}
                  disabled={!session?.map_id}
                  title={session?.map_id ? undefined : 'Load a map first'}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors bg-dnd-gold hover:bg-yellow-400 disabled:bg-gray-800 disabled:text-gray-500 text-gray-900"
                >
                  Spawn players to this map
                </button>
                <button
                  type="button"
                  onClick={() => setSessionOpen(false)}
                  disabled={!sessionStarted}
                  className="w-full rounded-lg py-2 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 border border-gray-600"
                >
                  Send everyone back to the lobby
                </button>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Drops every player token onto <strong>{session?.map_name || 'the current map'}</strong> at
                  its spawn point, scattered so they don't stack, and takes them out of the lobby.
                </p>
              </div>
            )}

            {/* ── BACKDROPS TAB ── */}
            {panelTab === 'backdrops' && (
              <div className="h-full overflow-y-auto p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-400 leading-snug">
                    Full-screen scene art for the players. Click one to push it;
                    the map stays exactly as you left it underneath.
                  </p>
                  <button
                    type="button"
                    disabled={backdropBusy}
                    onClick={() => document.getElementById('backdrop-upload').click()}
                    className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded px-3 py-1.5 text-gray-200 shrink-0"
                  >{backdropBusy ? 'Working…' : '+ Add'}</button>
                  <input id="backdrop-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleBackdropUpload} />
                </div>

                {/* Back-to-map is the one control that must always be
                    reachable, so it sits above the grid rather than being a
                    second click on whichever tile happens to be live. */}
                <button
                  type="button"
                  onClick={() => pushBackdrop(null)}
                  disabled={!liveBackdrop}
                  className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
                    liveBackdrop
                      ? 'bg-dnd-gold text-gray-900 hover:bg-yellow-400'
                      : 'bg-gray-800 text-gray-500 cursor-default'
                  }`}
                >
                  {liveBackdrop ? '← Back to the map' : 'Players are seeing the map'}
                </button>

                {backdrops.length === 0 ? (
                  <p className="text-xs text-gray-500">No backdrops yet. Add some scene art above.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {backdrops.map((b) => {
                      const live = liveBackdrop?.id === b.id;
                      return (
                        <div
                          key={b.id}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer group ${
                            live ? 'border-dnd-gold' : 'border-gray-700 hover:border-gray-500'
                          }`}
                          onClick={() => pushBackdrop(live ? null : b)}
                          title={live ? 'Showing now — click to return to the map' : `Push "${b.name}" to the players`}
                        >
                          <img src={`/uploads/${b.image_path}`} alt={b.name} className="w-full h-24 object-cover" />
                          <div className="px-1.5 py-1 text-[11px] text-gray-300 truncate bg-gray-900/80">{b.name}</div>
                          {live && (
                            <span className="absolute top-1 left-1 bg-dnd-gold text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              LIVE
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleBackdropDelete(b); }}
                            className="absolute top-1 right-1 bg-red-700/90 hover:bg-red-600 text-white rounded px-1.5 py-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {backdropError && <p className="text-[11px] text-red-400">{backdropError}</p>}
              </div>
            )}

            {/* ── TERRAIN TAB ── */}
            {panelTab === 'terrain' && (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-dnd-gold">Terrain Library</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={async () => {
                        if (!terrainLibrary.length) return;
                        try {
                          const r = await fetch('/api/terrain/library/export');
                          if (!r.ok) throw new Error(`HTTP ${r.status}`);
                          const blob = await r.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'terrain-library.json';
                          document.body.appendChild(a); a.click(); a.remove();
                          setTimeout(() => URL.revokeObjectURL(url), 5000);
                        } catch (err) { alert('Export failed: ' + err.message); }
                      }}
                      disabled={terrainLibrary.length === 0}
                      className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-2 py-1 rounded text-gray-200"
                      title="Download every terrain piece in the library as a JSON file"
                    >Export</button>
                    <label className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200 cursor-pointer">
                      Import
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const text = await file.text();
                            const r = await fetch('/api/terrain/library/import', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: text,
                            });
                            if (!r.ok) throw new Error(`HTTP ${r.status}`);
                            const out = await r.json();
                            if (Array.isArray(out.terrain) && out.terrain.length) {
                              setTerrainLibrary((prev) => [...prev, ...out.terrain]);
                            } else {
                              alert('Nothing imported — JSON had no valid terrain entries.');
                            }
                          } catch (err) {
                            alert('Import failed: ' + err.message);
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <button
                      onClick={() => setShowTerrainUpload(true)}
                      className="px-3 py-1 text-xs rounded bg-cyan-700 hover:bg-cyan-600 text-white"
                      title="Upload a new terrain piece"
                    >+ Create</button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Click a piece to enter place-mode, then click the map to drop it. Right-click a placed piece for delete / hide / edit. Drag any placed piece to move it. Players see your changes live.
                </p>

                {pendingTerrain && (
                  <div className="bg-cyan-900/40 border border-cyan-700 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-cyan-100">
                    <span className="flex-1 truncate">Click the map to place <strong>{pendingTerrain.name}</strong></span>
                    <button
                      onClick={() => setPendingTerrain(null)}
                      className="text-cyan-300 hover:text-white text-xs"
                    >Cancel</button>
                  </div>
                )}

                {/* Scenery vs markers. One library table, two shelves: scenery
                    is obstacles with wall geometry, markers are the ships,
                    settlements and landmarks an overland map is made of. */}
                <div className="flex gap-1 mb-2">
                  {[
                    { k: 'scenery', label: 'Scenery' },
                    { k: 'markers', label: 'Markers' },
                  ].map(({ k, label }) => {
                    const count = terrainLibrary.filter(p => (k === 'markers') === !!p.is_marker).length;
                    return (
                      <button
                        key={k}
                        onClick={() => setTerrainKind(k)}
                        className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${
                          terrainKind === k
                            ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >{label} ({count})</button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {shownTerrainLibrary.length === 0 ? (
                    <div className="col-span-2 text-gray-500 text-xs text-center py-6">
                      {terrainKind === 'markers'
                        ? 'No markers yet. Add one and tick “Map marker”.'
                        : 'No terrain pieces yet.'}
                    </div>
                  ) : (
                    shownTerrainLibrary.map((p) => (
                      <div
                        key={p.id}
                        className={`bg-gray-800 border ${pendingTerrain?.id === p.id ? 'border-cyan-500' : 'border-gray-700'} hover:border-cyan-500 rounded-lg overflow-hidden transition-colors`}
                      >
                        <button
                          onClick={() => setPendingTerrain(p)}
                          className="block w-full"
                          title={`Place ${p.name}`}
                        >
                          <div className="aspect-square bg-gray-900 flex items-center justify-center p-2">
                            <img
                              src={`/uploads/${p.image_path}`}
                              alt={p.name}
                              className="max-w-full max-h-full object-contain pointer-events-none"
                            />
                          </div>
                          <div className="px-2 py-1.5 text-left">
                            <div className="text-xs text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-gray-500 flex gap-1.5 flex-wrap">
                              {Array.isArray(p.custom_walls) && p.custom_walls.length > 0 && (
                                <span title={`${p.custom_walls.length} wall polygon${p.custom_walls.length === 1 ? '' : 's'}`}>🧱{p.custom_walls.length}</span>
                              )}
                              {p.hide_until_revealed && <span title="Hidden by default">🙈</span>}
                              {p.is_marker && <span title="Map marker — shows its name, no health bar">📍</span>}
                              {p.three_d_shape === 'rock' && <span title="Stands up as a solid rock in the 3D view">🪨</span>}
                              {p.three_d_shape === 'sphere' && <span title="Stands up as a sphere in the 3D view">🪐</span>}
                              {p.three_d_shape === 'model' && <span title="Drawn as an imported 3D model in the 3D view">🧊</span>}
                              {p.three_d_shape === 'cloud' && <span title="Drawn as a translucent cloud bank in the 3D view">☁️</span>}
                              {p.three_d_shape === 'gate' && <span title="Stands up as a wildspace gate ring in the 3D view">🌀</span>}
                              {p.three_d_shape === 'blackhole' && <span title="Animated black hole in the 3D view">🕳️</span>}
                              {p.three_d_shape === 'wormhole' && <span title="Animated wormhole in the 3D view">🌌</span>}
                              {p.three_d_shape === 'ionstorm' && <span title="Animated ion storm in the 3D view">⚡</span>}
                              {p.three_d_shape === 'debris' && <span title="Animated debris field in the 3D view">☄️</span>}
                              {p.three_d_shape === 'vine' && <span title="Grows as a crystal vine in the 3D view">🔮</span>}
                              {p.three_d_shape === 'tentacle' && <span title="Grows as a writhing tentacle in the 3D view">🐙</span>}
                              <span className="ml-auto">{p.default_w}×{p.default_h}</span>
                            </div>
                          </div>
                        </button>
                        <div className="flex border-t border-gray-700">
                          <button
                            onClick={() => setEditingTerrainPiece(p)}
                            className="flex-1 text-[11px] py-1 text-gray-400 hover:text-cyan-300 transition-colors"
                          >Edit</button>
                          <button
                            onClick={() => {
                              if (!window.confirm(`Delete "${p.name}" from the library? Already-placed instances on maps stay put but become unlinked.`)) return;
                              fetch(`/api/terrain/library/${p.id}`, { method: 'DELETE' })
                                .then(r => r.ok && setTerrainLibrary(prev => prev.filter(x => x.id !== p.id)))
                                .catch(() => {});
                            }}
                            className="flex-1 text-[11px] py-1 text-gray-400 hover:text-red-400 border-l border-gray-700 transition-colors"
                          >Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── LOOK UP (everything, from one box) ──
                The Spells and Items tabs beside this one are for MANAGING the
                library — editing rows, importing, setting editions. This is for
                answering a question at the table, which is a different job and
                reaches past the library into the rulebooks. role="dm": the one
                place a GM secret may be shown. */}
            {panelTab === 'lookup' && (
              <div className="h-full min-h-0">
                <ReferenceSearch role="dm" embedded />
              </div>
            )}

            {/* ── SPELLS TAB (GM library) ── */}
            {panelTab === 'spells' && (
              <SpellLibrary
                aiSettings={aiSettings}
                activeSrdEdition={activeSrdEdition}
                onChangeActiveSrdEdition={(val) => {
                  setActiveSrdEdition(val);
                  socket.emit('set_active_srd_edition', { sessionId: session.id, edition: val });
                }}
              />
            )}

            {/* ── ITEMS TAB (GM library) ── */}
            {panelTab === 'items' && (
              <ItemLibrary
                activeSrdEdition={activeSrdEdition}
                onChangeActiveSrdEdition={(val) => {
                  setActiveSrdEdition(val);
                  socket.emit('set_active_srd_edition', { sessionId: session.id, edition: val });
                }}
              />
            )}

            {/* ── ORIGINS TAB (custom GM-authored races + backgrounds) ── */}
            {panelTab === 'origins' && (
              <CustomOriginsPanel />
            )}

            {/* ── TOKENS TAB ── */}
            {panelTab === 'tokens' && (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-dnd-gold">Ships</span>
                  <button
                    onClick={() => setShipBuilderOpen(true)}
                    className="text-xs px-3 py-1 bg-sky-900/50 hover:bg-sky-800/50 border border-sky-700 text-sky-200 rounded-lg"
                  >
                    Create / Place Ship
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-dnd-gold">Combat</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTokenListCollapsed(v => !v)}
                      className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 rounded-lg"
                      title={tokenListCollapsed ? 'Expand tokens' : 'Collapse tokens'}
                    >
                      {tokenListCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                    {combatActive ? (
                      <button
                        onClick={handleEndCombat}
                        className="text-xs px-3 py-1 bg-red-900/50 hover:bg-red-800/50 border border-red-700 text-red-300 rounded-lg"
                      >
                        End Combat
                      </button>
                    ) : (
                      <button
                        onClick={handleStartCombat}
                        className="text-xs px-3 py-1 bg-yellow-700/50 hover:bg-yellow-600/50 border border-yellow-600 text-yellow-200 rounded-lg"
                      >
                        Start Combat
                      </button>
                    )}
                  </div>
                </div>

                {/* Lair actions: on for this fight, plus the text the GM
                    reads when initiative 20 comes round. */}
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-purple-500"
                      checked={lairAction.enabled}
                      onChange={(e) => {
                        setLairAction((p) => ({ ...p, enabled: e.target.checked }));
                        socket.emit('dm_set_lair_action', { sessionId: session?.id, enabled: e.target.checked });
                      }}
                    />
                    Lair actions (initiative 20)
                  </label>
                  {lairAction.enabled && (
                    <textarea
                      rows={2}
                      value={lairAction.note}
                      onChange={(e) => setLairAction((p) => ({ ...p, note: e.target.value }))}
                      onBlur={(e) => socket.emit('dm_set_lair_action', { sessionId: session?.id, note: e.target.value })}
                      placeholder="What the lair does on initiative 20…"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 outline-none focus:border-purple-500"
                    />
                  )}
                </div>

                {/* Defaults for tokens added from here on. Existing tokens are
                    left alone — retroactively hiding a monster the party has
                    already met would be a surprise, not a convenience. */}
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400">
                    New tokens start hidden
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-amber-500"
                        checked={labelDefaults.hideName}
                        onChange={(e) => {
                          const next = { ...labelDefaults, hideName: e.target.checked };
                          setLabelDefaults(next);
                          socket.emit('dm_set_token_label_defaults', {
                            sessionId: session?.id, hideName: e.target.checked,
                          });
                        }}
                      />
                      Name
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-amber-500"
                        checked={labelDefaults.hideHp}
                        onChange={(e) => {
                          const next = { ...labelDefaults, hideHp: e.target.checked };
                          setLabelDefaults(next);
                          socket.emit('dm_set_token_label_defaults', {
                            sessionId: session?.id, hideHp: e.target.checked,
                          });
                        }}
                      />
                      Health
                    </label>
                  </div>
                  <div className="text-[10px] text-gray-500 leading-snug">
                    Applies to creatures added from the Library. Player tokens always start visible, and anything in combat shows both.
                  </div>
                </div>

                {tokens.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-dnd-gold mb-2"><SwordIcon className="w-8 h-8" /></div>
                    <div className="text-sm">No tokens on the map.</div>
                    <div className="text-xs mt-1">Add creatures from the Library tab.</div>
                  </div>
                )}
                {sortedTokens.map((token, idx) => (
                  <div
                    key={token.id}
                    draggable={!token.is_player}
                    onDragStart={(e) => {
                      if (token.is_player) { e.preventDefault(); return; }
                      e.dataTransfer.setData('text/plain', token.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => { if (!token.is_player) e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId = Number(e.dataTransfer.getData('text/plain'));
                      if (!fromId || fromId === token.id) return;
                      reorderToken(fromId, token.id);
                    }}
                  >
                    <TokenRow
                      token={token}
                      isSelected={selectedToken === token.id}
                      onSelect={setSelectedToken}
                      onHPChange={handleHPChange}
                      onTempHpChange={handleTempHpChange}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleFlying={handleToggleFlying}
                      onViewStatBlock={handleViewStatBlock}
                      onRemove={handleRemoveToken}
                      onSizeChange={handleSizeChange}
                      onConditionsChange={handleConditionsChange}
                      onInitiativeChange={handleInitiativeChange}
                      onNicknameChange={handleNicknameChange}
                      onElevationChange={(tokenId, elevation) => {
                        setTokens((prev) => prev.map((t) => (t.id === tokenId
                          ? { ...t, elevation, is_flying: elevation > 0 } : t)));
                        socket.emit('set_token_elevation', { tokenId, elevation });
                      }}
                      onTrackerReminderChange={(tokenId, text) => {
                        setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, tracker_reminder: text } : t)));
                        socket.emit('dm_set_tracker_reminder', { tokenId, text });
                      }}
                      onLabelVisibilityChange={(tokenId, patch) =>
                        socket.emit('dm_set_token_label_visibility', { tokenId, ...patch })
                      }
                      collapsed={tokenListCollapsed}
                      combatActive={combatActive}
                      onAddToCombat={handleAddSingleTokenToCombat}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── MARKERS TAB ── */}
            {panelTab === 'markers' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Place Marker</h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DM_MARKER_TYPES.map((mt) => (
                      <button
                        key={mt.type}
                        onClick={() => { setPlacingMarkerType(mt.type); setPanelOpen(false); }}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-colors border ${
                          placingMarkerType === mt.type
                            ? 'border-purple-400 bg-purple-900/60 text-white'
                            : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                        style={{ borderColor: placingMarkerType === mt.type ? undefined : DM_MARKER_COLORS[mt.type] + '66' }}
                      >
                        <span className="flex items-center justify-center">{mt.Icon && <mt.Icon />}</span>
                        <span className="leading-tight text-center">{mt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">
                    Placed Markers
                    {dmMarkers.length > 0 && <span className="ml-2 text-gray-400 font-normal">({dmMarkers.length})</span>}
                  </h3>
                  {dmMarkers.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No markers placed. Select a type above then click on the map.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dmMarkers.map((m) => {
                        const mtype = DM_MARKER_TYPES.find(t => t.type === m.marker_type);
                        return (
                          <div
                            key={m.id}
                            className="flex items-start gap-2 bg-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-700 transition-colors"
                            onClick={() => setEditingMarker({ ...m })}
                          >
                            <span className="shrink-0 mt-0.5 text-gray-400">{mtype?.Icon ? <mtype.Icon /> : <MarkerIcons.note />}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-200 truncate">{m.label || mtype?.label}</div>
                              {m.note && <div className="text-xs text-gray-400 truncate mt-0.5">{m.note}</div>}
                              <div className="text-xs text-gray-600 mt-0.5">col {Math.round(m.grid_col)}, row {Math.round(m.grid_row)}</div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); socket.emit('remove_dm_marker', { markerId: m.id }); }}
                              className="text-red-500 hover:text-red-400 text-base leading-none shrink-0 mt-0.5"
                              title="Delete marker"
                            ><XIcon /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TREASURE TAB ── */}
            {panelTab === 'treasure' && (() => {
              const pcTokens = tokens.filter(t => t.creature_id && t.is_player);

              function newItem() {
                return {
                  id: Date.now() + Math.random(),
                  item_type: 'item',
                  name: '',
                  qty: 1,
                  weight: '',
                  desc: '',
                  equipped: false,
                  weapon_range: '',
                  attack_stat: 'STR',
                  attack_bonus_misc: 0,
                  damage_bonus_misc: 0,
                  damage_entries: [{ damage: '', damage_type: '' }],
                  properties: '',
                  mastery: '',
                  attunement_required: false,
                  attuned: false,
                  sheds_light: false,
                  bright_ft: 20,
                  dim_ft: 40,
                };
              }
              function addTreasureItem() {
                setTreasureList(prev => [...prev, newItem()]);
              }
              function removeTreasureItem(id) {
                setTreasureList(prev => prev.filter(it => it.id !== id));
              }
              function updateTreasureItem(id, field, value) {
                setTreasureList(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
              }
              function getDmgEntries(item) {
                if (Array.isArray(item.damage_entries) && item.damage_entries.length) return item.damage_entries;
                return [{ damage: '', damage_type: '' }];
              }
              function addDmgEntry(id) {
                setTreasureList(prev => prev.map(it => it.id === id
                  ? { ...it, damage_entries: [...getDmgEntries(it), { damage: '', damage_type: '' }] }
                  : it));
              }
              function removeDmgEntry(id, ei) {
                setTreasureList(prev => prev.map(it => {
                  if (it.id !== id) return it;
                  const entries = getDmgEntries(it).filter((_, idx) => idx !== ei);
                  return { ...it, damage_entries: entries.length ? entries : [{ damage: '', damage_type: '' }] };
                }));
              }
              function updateDmgEntry(id, ei, field, value) {
                setTreasureList(prev => prev.map(it => {
                  if (it.id !== id) return it;
                  const entries = getDmgEntries(it).map((e, idx) => idx === ei ? { ...e, [field]: value } : e);
                  return { ...it, damage_entries: entries };
                }));
              }
              // A weapon's "versatile"/"thrown" lines are derived from its
              // properties rather than stored, so they cannot be edited in
              // place. Materialising one writes it into damage_entries as a
              // real line the GM can then change.
              function materialiseTreasureMode(id, mode) {
                setTreasureList(prev => prev.map(it => {
                  if (it.id !== id) return it;
                  const entries = [...getDmgEntries(it).filter(e => e.damage || e.damage_type),
                                   { damage: mode.damage || '', damage_type: mode.damage_type || '',
                                     label: mode.label || '', range: mode.range || '',
                                     stat: mode.stat || '' }];
                  return { ...it, damage_entries: entries };
                }));
              }
              // Hand over some or all of a stack.
              //
              // What is sent LEAVES the chest. Five potions minus the three you
              // gave away is two, and a chest that still read five would have
              // the GM editing the number by hand every time — which is the
              // arithmetic this is meant to take off them.
              function sendItemToPlayer(itemId, creatureId, qtyWanted) {
                const item = treasureList.find(it => it.id === itemId);
                if (!item) return;
                const have = Math.max(1, Number(item.qty) || 1);
                const sending = Math.max(1, Math.min(have, Number(qtyWanted) || have));
                const { id, ...rest } = item;
                socket.emit('send_treasure', { creatureId, items: [{ ...rest, qty: sending }] });
                setTreasureList(prev => prev.flatMap(it => {
                  if (it.id !== itemId) return [it];
                  const left = have - sending;
                  return left > 0 ? [{ ...it, qty: left }] : [];
                }));
                setSendQty(prev => {
                  const next = { ...prev };
                  delete next[itemId];
                  return next;
                });
              }
              function sendAllToPlayer(creatureId) {
                if (!treasureList.length) return;
                const items = treasureList.map(({ id, ...rest }) => rest);
                socket.emit('send_treasure', { creatureId, items });
              }

              const inputCls = 'bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold';
              const labelCls = 'block text-xs text-gray-400 mb-0.5';

              function toggleTreasureGroup(id) {
                setTreasureCollapsedGroups(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              }

              // Free-text filter across the fields a GM would actually
              // scan for — name, description and weapon properties.
              const q = treasureSearch.trim().toLowerCase();
              const matchesSearch = (it) => !q
                || String(it.name || '').toLowerCase().includes(q)
                || String(it.desc || '').toLowerCase().includes(q)
                || String(it.properties || '').toLowerCase().includes(q);
              const visibleItems = treasureList.filter(matchesSearch);

              const knownTypes = new Set(TREASURE_CATEGORIES.map(c => c.id));
              const treasureGroups = [
                ...TREASURE_CATEGORIES.map(c => ({
                  ...c,
                  items: visibleItems.filter(it => (it.item_type || 'item') === c.id),
                })),
                { id: 'other', label: 'Other',
                  items: visibleItems.filter(it => !knownTypes.has(it.item_type || 'item')) },
              ].filter(g => g.items.length > 0);

              return (
                <div className="h-full overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-dnd-gold">Treasure Chest</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setTpPicked(new Map());
                          setTpSearch(''); setTpType(''); setTpRarity(''); setTpEdition('');
                          setShowTreasurePicker(true);
                        }}
                        className="text-xs bg-dnd-gold/30 hover:bg-dnd-gold/50 border border-dnd-gold/50 px-2 py-1 rounded text-amber-100"
                        title="Add loot from the item library"
                      >From Library</button>
                      <button
                        onClick={() => {
                          // Default to "all selected" — the modal lets the
                          // GM untick ones they don't want to export.
                          setTreasureExportSelected(new Set(treasureList.map(it => it.id)));
                          setShowTreasureExport(true);
                        }}
                        disabled={treasureList.length === 0}
                        className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-2 py-1 rounded text-gray-200"
                        title="Choose which treasure items to export, then download as JSON"
                      >Export</button>
                      <label className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200 cursor-pointer">
                        Import
                        <input
                          type="file"
                          accept="application/json,.json"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const text = await file.text();
                              const parsed = JSON.parse(text);
                              const loot = Array.isArray(parsed.loot) ? parsed.loot : (Array.isArray(parsed) ? parsed : []);
                              if (!loot.length) { alert('No loot items found in file.'); return; }
                              const withIds = loot.map(it => ({ ...it, id: Date.now() + Math.random() }));
                              setTreasureList(prev => [...prev, ...withIds]);
                            } catch (err) {
                              alert('Invalid JSON: ' + err.message);
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <button onClick={addTreasureItem} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200">+ Add Item</button>
                    </div>
                  </div>

                  {/* Built to rules, then dropped into the list above as an
                      ordinary item — so it can still be edited by hand and sent
                      to a player the same way anything else is. */}
                  <MagicItemForge
                    spells={librarySpells}
                    onCreate={(item) => setTreasureList((prev) => [
                      ...prev,
                      { ...newItem(), ...item, id: Date.now() + Math.random() },
                    ])}
                  />

                  {treasureList.length > 1 && (
                    <input
                      className={`w-full ${inputCls}`}
                      placeholder="Search treasure by name, description or properties…"
                      value={treasureSearch}
                      onChange={e => setTreasureSearch(e.target.value)}
                    />
                  )}

                  {treasureList.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Add items to send to players.</p>
                  ) : treasureGroups.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No items match “{treasureSearch}”.</p>
                  ) : (
                    <div className="space-y-3">
                      {treasureGroups.map(group => {
                        // An active search force-opens every group — a
                        // match the GM can't see is worse than a tidy list.
                        const groupCollapsed = !q && treasureCollapsedGroups.has(group.id);
                        return (
                        <div key={group.id} className="space-y-3">
                          <button
                            onClick={() => toggleTreasureGroup(group.id)}
                            className="w-full flex items-center gap-2 px-2 py-1 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded text-left transition-colors"
                            title={groupCollapsed ? 'Expand group' : 'Collapse group'}
                          >
                            <span className={`text-gray-400 text-[10px] transition-transform ${groupCollapsed ? '' : 'rotate-90'}`}>▶</span>
                            <span className="text-xs font-semibold text-dnd-gold uppercase tracking-wider">{group.label}</span>
                            <span className="text-xs text-gray-500 ml-auto">{group.items.length}</span>
                          </button>
                          {!groupCollapsed && group.items.map(item => (
                            <ItemStatsEditor
                              key={item.id}
                              item={item}
                              /* The chest is the GM's own panel, so it offers
                                 the secret box and the hide toggle. An item
                                 marked hidden here is planted silently: the
                                 player's sheet never shows it and no
                                 "you received" toast fires (see send_treasure). */
                              canHide
                              /* The chest has no owner, so the damage preview
                                 shows dice and enchantment only — no ability
                                 modifier, because there is nobody to take it
                                 from until the item is sent to a player. */
                              onChange={(field, value) => updateTreasureItem(item.id, field, value)}
                              onRemove={() => removeTreasureItem(item.id)}
                              onDamageAdd={() => addDmgEntry(item.id)}
                              onDamageRemove={(ei) => removeDmgEntry(item.id, ei)}
                              onDamageChange={(ei, field, value) => updateDmgEntry(item.id, ei, field, value)}
                              onMaterialiseMode={(m) => materialiseTreasureMode(item.id, m)}
                              headerExtra={(
                                <button
                                  title="Send this item to a player"
                                  onClick={() => setSendingItemId(prev => prev === item.id ? null : item.id)}
                                  className={`px-1.5 shrink-0 rounded text-sm transition-colors ${sendingItemId === item.id ? 'bg-yellow-600 text-yellow-100' : 'text-yellow-400 hover:text-yellow-200'}`}
                                >📤</button>
                              )}
                              belowHeader={sendingItemId === item.id && (() => {
                                const have = Math.max(1, Number(item.qty) || 1);
                                const wanted = Math.max(1, Math.min(have, Number(sendQty[item.id]) || have));
                                return (
                                <div className="flex flex-col gap-1 pl-1">
                                  {/* Only a stack needs the question asked. A
                                      single item has one answer and a spinner
                                      stuck on 1 is just another thing to read. */}
                                  {have > 1 && (
                                    <div className="flex items-center gap-2 pb-1">
                                      <span className="text-xs text-gray-400">Send</span>
                                      <input
                                        type="number"
                                        min="1"
                                        max={have}
                                        value={wanted}
                                        onChange={(e) => setSendQty(prev => ({
                                          ...prev,
                                          [item.id]: Math.max(1, Math.min(have, Number(e.target.value) || 1)),
                                        }))}
                                        className="w-16 bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-gray-100"
                                      />
                                      <span className="text-xs text-gray-500">of {have}</span>
                                      {wanted !== have && (
                                        <button
                                          type="button"
                                          onClick={() => setSendQty(prev => ({ ...prev, [item.id]: have }))}
                                          className="text-[11px] text-yellow-300 underline underline-offset-2"
                                        >all</button>
                                      )}
                                      <span className="text-[11px] text-gray-500 ml-auto">
                                        {have - wanted} left
                                      </span>
                                    </div>
                                  )}
                                  {pcTokens.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">No players on map.</p>
                                  ) : pcTokens.map(tok => (
                                    <button
                                      key={tok.id}
                                      onClick={() => { sendItemToPlayer(item.id, tok.creature_id, wanted); setSendingItemId(null); }}
                                      className="flex items-center gap-2 px-2 py-1 bg-yellow-900/40 hover:bg-yellow-900/70 border border-yellow-700/50 hover:border-yellow-500 rounded text-left transition-colors"
                                    >
                                      <span className="text-xs text-yellow-400">gp</span>
                                      <span className="text-xs text-yellow-200">
                                        {have > 1 ? `Send ${wanted} to ${tok.name}` : tok.name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                                );
                              })()}
                            />
                          ))}
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {treasureList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Send All ({treasureList.length}) to Player</h4>
                      {pcTokens.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No player characters on the map.</p>
                      ) : (
                        pcTokens.map(tok => (
                          <button
                            key={tok.id}
                            onClick={() => sendAllToPlayer(tok.creature_id)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-900/30 hover:bg-yellow-900/60 border border-yellow-700/50 hover:border-yellow-600 rounded-lg text-left transition-colors"
                          >
                            <span className="text-base text-yellow-400">gp</span>
                            <span className="text-sm text-yellow-200 font-medium">Send all to {tok.name}</span>
                            <span className="text-xs text-gray-400 ml-auto">{treasureList.length} item{treasureList.length !== 1 ? 's' : ''}</span>
                          </button>
                        ))
                      )}
                      <button
                        onClick={() => setTreasureList([])}
                        className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors"
                      >
                        Clear treasure list
                      </button>
                    </div>
                  )}

                  {/* Send Currency */}
                  <div className="border border-gray-700 rounded-lg p-3 space-y-2">
                    <h4 className="text-xs font-semibold text-dnd-gold uppercase tracking-wider">Send Currency</h4>
                    <div className="flex gap-2">
                      {[
                        { key: 'gp', label: 'GP', color: 'text-yellow-400' },
                        { key: 'sp', label: 'SP', color: 'text-gray-300' },
                        { key: 'cp', label: 'CP', color: 'text-orange-400' },
                      ].map(({ key, label, color }) => (
                        <div key={key} className="flex-1">
                          <label className={`block text-xs font-semibold ${color} mb-1 text-center`}>{label}</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                            placeholder="0"
                            value={currencyToSend[key]}
                            onChange={e => setCurrencyToSend(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    {pcTokens.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No player characters on the map.</p>
                    ) : (
                      pcTokens.map(tok => (
                        <button
                          key={tok.id}
                          onClick={() => {
                            const gp = parseInt(currencyToSend.gp) || 0;
                            const sp = parseInt(currencyToSend.sp) || 0;
                            const cp = parseInt(currencyToSend.cp) || 0;
                            if (!gp && !sp && !cp) return;
                            socket.emit('send_currency', { creatureId: tok.creature_id, gp, sp, cp });
                            setCurrencyToSend({ gp: '', sp: '', cp: '' });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-900/30 hover:bg-yellow-900/60 border border-yellow-700/50 hover:border-yellow-600 rounded-lg text-left transition-colors"
                        >
                          <span className="text-base">🪙</span>
                          <span className="text-sm text-yellow-200 font-medium">Send to {tok.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── HANDOUTS TAB ── */}
            {panelTab === 'handouts' && (() => {
              const pcTokens = tokens.filter(t => t.is_player && t.player_name);
              return (
                <div className="h-full overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-dnd-gold">Compose Handout</h3>
                  </div>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="Title (e.g. Letter from the Baron)"
                    value={handoutTitle}
                    onChange={(e) => setHandoutTitle(e.target.value)}
                  />
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="Image URL (optional)"
                    value={handoutImageUrl}
                    onChange={(e) => setHandoutImageUrl(e.target.value)}
                  />
                  <textarea
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none"
                    placeholder="Body — text the players will read"
                    rows={6}
                    value={handoutBody}
                    onChange={(e) => setHandoutBody(e.target.value)}
                  />
                  <div className="space-y-2">
                    <h4 className="text-xs text-gray-400 uppercase tracking-wide">Send To</h4>
                    <button
                      onClick={() => {
                        if (!handoutTitle && !handoutBody && !handoutImageUrl) return;
                        socket.emit('send_handout', {
                          target: 'all',
                          title: handoutTitle,
                          body: handoutBody,
                          imageUrl: handoutImageUrl,
                        });
                      }}
                      disabled={!handoutTitle && !handoutBody && !handoutImageUrl}
                      className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold"
                    >
                      Send to all players
                    </button>
                    {pcTokens.length > 0 && (
                      <div className="space-y-1">
                        {pcTokens.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              if (!handoutTitle && !handoutBody && !handoutImageUrl) return;
                              socket.emit('send_handout', {
                                target: t.player_name,
                                title: handoutTitle,
                                body: handoutBody,
                                imageUrl: handoutImageUrl,
                              });
                            }}
                            disabled={!handoutTitle && !handoutBody && !handoutImageUrl}
                            className="w-full text-left bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 px-3 py-1.5 rounded text-sm"
                          >
                            Send only to <span className="text-purple-300">{t.player_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setHandoutTitle(''); setHandoutBody(''); setHandoutImageUrl(''); }}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
                  >
                    Clear
                  </button>
                </div>
              );
            })()}

            {/* ── SESSION TAB ── */}
            {panelTab === 'session' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {/* Taking the whole install elsewhere.
                    One file holding every table and every upload — for importing
                    into the desktop app on a laptop going somewhere without this
                    server. Above the map states because it is the bigger thing: a
                    map state is one board, this is the server. */}
                <CollapsibleSection id="session_pack" title="Take Everything Away">
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-gray-400 leading-snug">
                      Copies this whole server into one file: <span className="text-gray-300">every
                      session</span>, every map with its walls, doors and lights, the full
                      creature, terrain, tile, spell and item libraries, character sheets,
                      loot tables, plugins, settings — and all {' '}
                      <span className="text-gray-300">542MB</span> of uploaded art and sound.
                      Import it from the desktop app's first screen and run it offline.
                    </p>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      It takes a minute or two and the download is large. Earlier versions
                      of this exported only the chosen session, which left the laptop
                      without a creature library to build encounters from.
                    </p>
                    <input
                      type="password"
                      value={packPassword}
                      onChange={(e) => setPackPassword(e.target.value)}
                      placeholder="GM password (this session's, or the master)"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                    />
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Asked for because the file contains every character sheet and every GM
                      secret on the server.
                    </p>
                    <button
                      type="button"
                      disabled={packBusy || !session?.session_code}
                      onClick={async () => {
                        setPackBusy(true);
                        setPackMsg('Building the pack — a big campaign takes a minute…');
                        try {
                          const res = await fetch('/api/transfer/export', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: session.session_code, dmPassword: packPassword }),
                          });
                          if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            throw new Error(body.error || `Failed (${res.status})`);
                          }
                          // Handed to the browser as a download rather than held in
                          // memory twice: these files are hundreds of megabytes.
                          const blob = await res.blob();
                          const name = (res.headers.get('Content-Disposition') || '')
                            .match(/filename="([^"]+)"/)?.[1] || `session-${session.session_code}.ttfpack`;
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = name;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          setTimeout(() => URL.revokeObjectURL(url), 30000);
                          const rows = res.headers.get('X-Pack-Rows');
                          const files = res.headers.get('X-Pack-Files');
                          const tables = res.headers.get('X-Pack-Tables');
                          const sessions = res.headers.get('X-Pack-Sessions');
                          setPackMsg(`Saved ${name} — ${rows || '?'} rows across ${tables || '?'} tables, `
                            + `${files || '?'} files, ${sessions || '?'} session(s).`);
                        } catch (err) {
                          setPackMsg(err.message);
                        } finally {
                          setPackBusy(false);
                        }
                      }}
                      className="w-full rounded-lg py-2 text-sm font-semibold bg-dnd-gold hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900"
                    >{packBusy ? 'Packing everything…' : 'Export everything'}</button>
                    {packMsg && (
                      <p className={`text-[11px] leading-snug ${/failed|wrong|error|not /i.test(packMsg) ? 'text-red-300' : 'text-emerald-300'}`}>
                        {packMsg}
                      </p>
                    )}
                  </div>
                </CollapsibleSection>

                {/* The return leg.
                    Whatever was played on the laptop comes back here. Separate
                    section from the export because the risk is not symmetrical:
                    going out costs nothing, coming back writes over the campaign
                    everyone else plays on. Hence the password, the typed
                    confirmation, and the automatic backup. */}
                <CollapsibleSection id="session_import" title="Bring A Pack Back In">
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-gray-400 leading-snug">
                      Loads a <span className="font-mono">.ttfpack</span> into <em>this server</em> —
                      for coming home from a holiday and putting everything that happened on the
                      laptop back onto the shared board.
                    </p>
                    <p className="text-[11px] text-amber-300/90 leading-snug">
                      Rows in the pack overwrite rows here with the same id. Nothing is deleted:
                      anything you removed on the laptop still exists here afterwards, and anything
                      the party did here in the meantime is overwritten. A backup of the current
                      rows is taken first and offered as a download.
                    </p>

                    <input
                      type="file"
                      accept=".ttfpack,.zip"
                      disabled={inBusy}
                      onChange={(e) => { setInFile(e.target.files?.[0] || null); setInResult(null); setInError(''); }}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0
                                 file:text-xs file:font-semibold file:bg-gray-700 file:text-gray-100 hover:file:bg-gray-600"
                    />
                    <input
                      type="password"
                      value={inPassword}
                      onChange={(e) => setInPassword(e.target.value)}
                      placeholder="GM password (a session's, or the master)"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                    />
                    <input
                      value={inConfirm}
                      onChange={(e) => setInConfirm(e.target.value)}
                      placeholder={'Type "overwrite" to confirm'}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                    />

                    <button
                      type="button"
                      disabled={inBusy || !inFile || inConfirm !== 'overwrite' || !inPassword}
                      onClick={async () => {
                        setInBusy(true);
                        setInError('');
                        setInResult(null);
                        try {
                          const body = new FormData();
                          body.append('pack', inFile);
                          body.append('dmPassword', inPassword);
                          body.append('confirm', inConfirm);
                          const res = await fetch('/api/transfer/import', { method: 'POST', body });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
                          setInResult(data);
                        } catch (err) {
                          setInError(err.message);
                        } finally {
                          setInBusy(false);
                        }
                      }}
                      className="w-full rounded-lg py-2 text-sm font-semibold bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-amber-50"
                    >{inBusy ? 'Importing — do not close this tab…' : 'Import into this server'}</button>

                    {inError && <p className="text-[11px] text-red-300 leading-snug">{inError}</p>}

                    {inResult && (
                      <div className="rounded-lg bg-gray-900 border border-gray-700 p-3 space-y-1">
                        <p className="text-sm text-emerald-300 font-semibold">Imported.</p>
                        <p className="text-[11px] text-gray-400">
                          {inResult.written} rows, {inResult.files} files
                          {inResult.packedAt ? ` · packed ${String(inResult.packedAt).slice(0, 16).replace('T', ' ')}` : ''}
                        </p>
                        {inResult.backup && (
                          <p className="text-[11px] text-gray-300">
                            Backup of what was here:{' '}
                            <a href={inResult.backup.url} download className="text-dnd-gold underline">
                              {inResult.backup.file}
                            </a>{' '}
                            <span className="text-gray-500">({inResult.backup.rows} rows)</span>
                          </p>
                        )}
                        {inResult.failureCount > 0 && (
                          <details className="text-[11px] text-amber-300">
                            <summary className="cursor-pointer">{inResult.failureCount} row(s) did not load</summary>
                            <ul className="mt-1 space-y-0.5 text-gray-400 max-h-40 overflow-y-auto">
                              {inResult.failures.map((f, i) => <li key={i} className="font-mono text-[10px]">{f}</li>)}
                            </ul>
                          </details>
                        )}
                        <p className="text-[11px] text-amber-200">
                          Tell everyone to reload — their clients are still holding the old board.
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="map_state" title="Saved Map States">
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-gray-400 leading-snug">
                      Saves where every token stands on the current map, plus HP,
                      conditions, initiative and combat state. Restore it next
                      session if anything gets moved in between.
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!session?.map_id || mapStateBusy}
                        onClick={() => {
                          const name = window.prompt('Name this save', 'End of session');
                          if (name === null) return;
                          setMapStateBusy(true);
                          setMapStateMsg('');
                          socket.emit('save_map_state', { sessionId: session.id, name: name || 'End of session' });
                        }}
                        title={session?.map_id ? 'Save the board as it stands' : 'Load a map first'}
                        className="flex-1 rounded-lg py-2 text-sm font-semibold bg-dnd-gold hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900"
                      >Save map state</button>
                      <button
                        type="button"
                        onClick={() => socket.emit('list_map_states', { sessionId: session.id })}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-gray-200"
                      >Refresh</button>
                    </div>

                    {mapStateMsg && <p className="text-[11px] text-emerald-300">{mapStateMsg}</p>}

                    {mapStates.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        Nothing saved yet. Press Refresh if you've saved on another device.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {mapStates.map((ms) => (
                          <li key={ms.id} className="bg-gray-900/50 border border-gray-700 rounded-lg px-2.5 py-2 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-100 truncate">{ms.name}</div>
                              <div className="text-[10px] text-gray-500">
                                {ms.map_name || `map ${ms.map_id}`} · {ms.token_count} token{ms.token_count === 1 ? '' : 's'} · {new Date(ms.created_at).toLocaleString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`Restore "${ms.name}"? Tokens on that map will be moved back to their saved positions and HP.`)) return;
                                setMapStateBusy(true);
                                setMapStateMsg('');
                                socket.emit('restore_map_state', { sessionId: session.id, snapshotId: ms.id });
                              }}
                              className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-1 rounded font-semibold shrink-0"
                            >Restore</button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`Delete the save "${ms.name}"?`)) return;
                                socket.emit('delete_map_state', { sessionId: session.id, snapshotId: ms.id });
                              }}
                              className="text-red-400 hover:text-red-300 text-xs px-1 shrink-0"
                            >✕</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="session_info" title="Session Info">
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Session Name</div>
                      <SessionNameEditor
                        name={session.name}
                        onRename={(next) => socket.emit('dm_rename_session', { sessionId: session.id, name: next })}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Session Code</div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-mono text-dnd-gold tracking-widest">{code}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(code)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => {
                            if (!session) return;
                            const ok = confirm(
                              'Rotate the session code?\n\n' +
                              'This will disconnect every player currently in the session — they will need the new join link to come back. ' +
                              'Use this to remove a troublesome player you have already kicked, then share the new link only with the players you want.'
                            );
                            if (!ok) return;
                            socket.emit('rotate_session_code', { sessionId: session.id });
                          }}
                          className="text-xs bg-red-900/50 hover:bg-red-800/60 border border-red-700/50 text-red-200 px-2 py-1 rounded"
                          title="Generate a new code and disconnect all current players"
                        >
                          Rotate
                        </button>
                      </div>
                    </div>
                    {appVersion && (
                      <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-700/50">
                        Server v{appVersion}
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Player Join Link</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 break-all flex-1 bg-gray-900 rounded p-2">{playerLink}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(playerLink)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                      {/* `.local` variant — only when the server detected
                          a usable mDNS name. The Android player app's
                          Network Security Config blocks cleartext to
                          arbitrary LAN IPs but allows it for `.local`
                          hostnames, so this is the URL phone players
                          should actually paste. Hidden when neither
                          tabletopforge.local (advertised by the
                          backend itself) nor the host's own .local
                          (advertised by macOS / Bonjour-on-Windows /
                          Avahi-on-Linux) is reachable — falls back
                          silently to the IP-based link above. */}
                      {playerLinkLocal && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-[10px] text-yellow-300/80 shrink-0 w-16">Phones:</div>
                          <span className="text-xs text-gray-300 break-all flex-1 bg-gray-900 rounded p-2">{playerLinkLocal}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(playerLinkLocal)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Spectator / TV view — read-only window the GM
                        opens on the table TV so the players see the
                        map without exposing GM-only controls. The
                        Open button is the headline; we keep Copy too
                        so a GM hosting on a separate display can
                        paste the URL straight into a browser there. */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Spectator (TV View)</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(spectatorLink, 'tabletopforge_spectator', 'noopener,noreferrer')}
                          className="text-xs bg-dnd-gold hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 rounded flex items-center gap-1.5 shrink-0"
                          title="Opens the read-only audience view in a new window — drag it onto your table TV."
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>
                          </svg>
                          Open Spectator
                        </button>
                        <span className="text-xs text-gray-300 break-all flex-1 bg-gray-900 rounded p-2">{spectatorLink}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(spectatorLink)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="fog_blocks" title="Vision Blocks">
                  <div className="space-y-1.5">
                    {fogBlocks.length === 0 && (
                      <p className="text-xs text-gray-500 italic py-1">
                        No vision blocks. Select the Fog Block tool and drag on the map to add one.
                      </p>
                    )}
                    {fogBlocks.map((fb) => (
                      <div key={fb.id} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-sm shrink-0 ${fb.is_revealed ? 'bg-green-400' : 'bg-violet-500'}`} />
                        <span className="text-xs text-gray-300 flex-1">
                          {fb.label || `Polygon (${(fb.points || []).length} pts)`}
                        </span>
                        <button
                          onClick={() => socket.emit(fb.is_revealed ? 'hide_fog_block' : 'reveal_fog_block', { id: fb.id })}
                          className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                            fb.is_revealed
                              ? 'bg-violet-800 hover:bg-violet-700 text-violet-100'
                              : 'bg-green-800 hover:bg-green-700 text-green-100'
                          }`}
                        >
                          {fb.is_revealed ? 'Hide' : 'Reveal'}
                        </button>
                        <button
                          onClick={() => socket.emit('delete_fog_block', { id: fb.id })}
                          className="text-xs px-2 py-0.5 rounded shrink-0 bg-red-900 hover:bg-red-800 text-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {(users.length > 0 || connectionLog.length > 0) && (
                  <CollapsibleSection id="connected_players" title="Connected Players">
                    <div className="space-y-2">
                      {connectionLog.map((entry) => {
                        const disconnectedMs = entry.disconnectedAt ? Date.now() - new Date(entry.disconnectedAt).getTime() : 0;
                        const mins = Math.floor(disconnectedMs / 60000);
                        const timeAgo = mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} min ago`;
                        return (
                          <div key={`disc-${entry.name}`} className="bg-gray-800/60 rounded-lg px-3 py-2 flex items-center gap-3 opacity-70">
                            <div className="w-2 h-2 rounded-full shrink-0 bg-red-500" />
                            <span className="text-sm flex-1 text-gray-400">{entry.name}</span>
                            <span className="text-xs text-red-400/80">dropped {timeAgo}</span>
                          </div>
                        );
                      })}
                      {users.map((u) => {
                        const hasToken = tokens.some(t => t.is_player && t.player_name === u.name);
                        const isWhispering = whisperOpen === u.name;
                        return (
                          <div key={u.name} className="bg-gray-800 rounded-lg px-3 py-2 space-y-2">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: u.role === 'dm' ? '#f59e0b' : '#22d3ee' }}
                              />
                              <span
                                className="text-sm flex-1"
                                style={{ color: userColors[u.name] || 'white' }}
                              >
                                {u.name}
                              </span>
                              <span className="text-xs text-gray-500">{u.role}</span>
                              {u.role !== 'dm' && !hasToken && (
                                <button
                                  onClick={() => socket.emit('dm_respawn_player_token', { playerName: u.name })}
                                  className="text-xs bg-yellow-700 hover:bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded"
                                  title="Spawn token onto map"
                                >
                                  + Token
                                </button>
                              )}
                              {u.role !== 'dm' && (
                                <button
                                  onClick={() => setWhisperOpen(isWhispering ? null : u.name)}
                                  className={`text-xs px-2 py-0.5 rounded ${isWhispering ? 'bg-purple-700 text-purple-100' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                                  title="Whisper privately"
                                >
                                  💬
                                </button>
                              )}
                              {u.role !== 'dm' && (
                                <button
                                  onClick={() => setChallengeOpen(challengeOpen === u.name ? null : u.name)}
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    challengeOpen === u.name
                                      ? 'bg-emerald-700 text-emerald-100'
                                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                                  title="Send a skill-check mini game to their phone"
                                >
                                  🗝️
                                </button>
                              )}
                              {u.role !== 'dm' && (
                                <input
                                  type="color"
                                  value={userColors[u.name] || '#ffffff'}
                                  onChange={(e) => handleSetUserColor(u.name, e.target.value)}
                                  className="w-7 h-7 rounded cursor-pointer border border-gray-600 bg-transparent"
                                  title="Set player color"
                                />
                              )}
                            </div>
                            {isWhispering && (
                              <WhisperComposer
                                onSend={(msg) => {
                                  socket.emit('dm_whisper', { targetName: u.name, message: msg });
                                  setWhisperOpen(null);
                                }}
                                onCancel={() => setWhisperOpen(null)}
                              />
                            )}
                            {challengeOpen === u.name && (
                              <ChallengeComposer
                                onSend={(payload) => {
                                  socket.emit('dm_minigame', { targetName: u.name, ...payload });
                                  setChallengeOpen(null);
                                }}
                                onCancel={() => setChallengeOpen(null)}
                              />
                            )}
                            {/* What they made of it, on the row that sent it. */}
                            {challengeResults.filter((r) => r.playerName === u.name).slice(0, 2).map((r) => (
                              <div key={r.id + r.ts} className="flex items-baseline gap-2 text-[11px] mt-0.5">
                                <span className={r.won ? 'text-emerald-300' : 'text-rose-300'}>{r.won ? '✓' : '✗'}</span>
                                <span className="text-gray-400 truncate">DC {r.dc} · {r.detail}</span>
                                <span className="ml-auto shrink-0 text-gray-600">{r.seconds}s</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                )}

                {(() => {
                  const playersOnly = users.filter(u => u.role !== 'dm');
                  if (playersOnly.length === 0) return null;
                  const assignedCount = Object.values(playerMapOverrides).filter(v => v != null).length;
                  return (
                    <CollapsibleSection
                      id="split_the_party"
                      title={
                        assignedCount > 0
                          ? `Split the Party — ${assignedCount} routed`
                          : 'Split the Party'
                      }
                      defaultOpen={false}
                    >
                      <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Pin a player to a specific map regardless of which map you're viewing or
                          where their token is. "Follow GM" reverts them to the session's current
                          map.
                        </p>
                        {playersOnly.map((u) => {
                          const current = playerMapOverrides[u.name];
                          return (
                            <div key={u.name} className="flex items-center gap-2">
                              <span
                                className="text-xs flex-1 truncate"
                                style={{ color: userColors[u.name] || 'white' }}
                                title={u.name}
                              >
                                {u.name}
                              </span>
                              <select
                                className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
                                value={current == null ? '' : String(current)}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  socket.emit('set_player_map_override', {
                                    sessionId: session.id,
                                    playerName: u.name,
                                    mapId: v,
                                  });
                                }}
                              >
                                <option value="">— Follow GM —</option>
                                {maps.map((m) => (
                                  <option key={m.id} value={String(m.id)}>
                                    {(m.name || `Map #${m.id}`) + (m.id === session.map_id ? '  (GM viewing)' : '')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                        {assignedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => socket.emit('clear_player_map_overrides', { sessionId: session.id })}
                            className="w-full text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 rounded mt-1"
                          >
                            Clear all ({assignedCount})
                          </button>
                        )}
                      </div>
                    </CollapsibleSection>
                  );
                })()}

                <CollapsibleSection id="dice_reference" title="Quick Dice Reference">
                  <DiceRoller rolls={diceRolls} />
                </CollapsibleSection>

                {/* ── Where the compendium is read from ── */}
                <CollapsibleSection id="compendium_source" title="Compendium (5eTools mirror)" defaultOpen={false}>
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-gray-400 leading-snug">
                      The Look up panel, the creature importer and the spell and item libraries all read
                      from a 5eTools mirror. Point the app at yours — a box on your network, or any host
                      serving the same files.
                    </p>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Mirror address</label>
                      <input
                        type="url"
                        inputMode="url"
                        spellCheck={false}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                                   focus:outline-none focus:border-dnd-gold"
                        placeholder={compendium?.default || 'http://192.168.1.10:5050'}
                        value={compendiumDraft}
                        onChange={(e) => { setCompendiumDraft(e.target.value); setCompendiumTest(null); }}
                      />
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Scheme and port, no trailing path — the mirror's own home page address.
                        Leave it empty to fall back to{' '}
                        {compendium?.env
                          ? <>the server's <code className="text-gray-400">COMPENDIUM_URL</code></>
                          : <>the built-in <code className="text-gray-400">{compendium?.default || ''}</code></>}.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={compendiumBusy || (compendiumDraft || '') === (compendium?.saved || '')}
                        onClick={() => saveCompendium(compendiumDraft.trim())}
                        className="px-3 py-2 rounded-lg bg-dnd-gold text-gray-900 text-sm font-semibold
                                   disabled:opacity-40"
                      >{compendiumBusy ? 'Saving…' : 'Save and test'}</button>
                      <button
                        type="button"
                        disabled={compendiumBusy}
                        onClick={testCompendium}
                        className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 text-sm
                                   disabled:opacity-40"
                      >Test now</button>
                      {compendium?.saved && (
                        <button
                          type="button"
                          disabled={compendiumBusy}
                          onClick={() => saveCompendium('')}
                          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-sm
                                     disabled:opacity-40"
                        >Reset to default</button>
                      )}
                    </div>

                    {compendiumTest && (
                      <div className={`text-xs rounded-lg px-2.5 py-2 border leading-snug ${
                        compendiumTest.ok
                          ? 'bg-emerald-900/30 border-emerald-700/60 text-emerald-200'
                          : 'bg-red-900/30 border-red-700/60 text-red-200'}`}>
                        {compendiumTest.ok ? '✓ ' : '✕ '}{compendiumTest.message}
                      </div>
                    )}

                    {compendium && (
                      <p className="text-[11px] text-gray-500 leading-snug">
                        In use: <span className="text-gray-300 font-mono">{compendium.url}</span>
                        {' · '}
                        {compendium.source === 'setting' ? 'from this setting'
                          : compendium.source === 'environment' ? 'from the server environment'
                            : 'the built-in default'}
                      </p>
                    )}

                    <p className="text-[11px] text-gray-500 leading-snug">
                      Changing it takes effect at once: everything read from the old mirror — the creature
                      index, cached files, artwork lookups — is dropped, and the next search rebuilds
                      against the new one.
                    </p>
                  </div>
                </CollapsibleSection>

                {/* ── AI Settings ── */}
                <CollapsibleSection id="ai_integration" title="AI Integration" defaultOpen={false}>
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-gray-400">
                      Configure a local or cloud LLM to generate stat blocks on the fly and to scan spell PDFs.
                    </p>
                    <div className="text-[11px] text-amber-300 bg-amber-900/20 border border-amber-700/50 rounded-lg px-2.5 py-2 leading-snug">
                      <strong>For the PDF spell scanner:</strong> use a <strong>vision-capable</strong> model
                      (Gemma 3/4 Vision, Llama 3.2 Vision, GPT-4o, etc.) and bump the model's
                      <strong> context window to at least 16k tokens</strong> (32k+ for full books).
                      A small context silently truncates pages and drops spells. Stat-block generation
                      doesn't need vision and works with any chat model.
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Provider</label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                        value={aiSettings.provider}
                        onChange={(e) => {
                          const p = e.target.value;
                          if (p === 'apple') {
                            // On-device: point at the sidecar, no key/model.
                            updateAISettings({ provider: 'apple', baseUrl: appleAi.url || '', model: '', apiKey: '' });
                          } else {
                            const defaults = AI_PROVIDER_DEFAULTS[p] || AI_PROVIDER_DEFAULTS.custom;
                            updateAISettings({ provider: p, baseUrl: defaults.baseUrl });
                          }
                        }}
                      >
                        {appleAi.present && (
                          <option value="apple">
                            Apple Intelligence (on-device){appleAi.available ? '' : ' — unavailable'}
                          </option>
                        )}
                        <option value="lmstudio">LM Studio</option>
                        <option value="ollama">Ollama</option>
                        <option value="openai">OpenAI</option>
                        <option value="custom">Custom (OpenAI-compat)</option>
                      </select>
                    </div>

                    {aiSettings.provider === 'apple' && (
                      <div className={`text-xs rounded-lg px-3 py-2 leading-snug border ${appleAi.available ? 'text-gray-300 bg-gray-700/40 border-gray-600' : 'text-amber-300 bg-amber-900/20 border-amber-700/50'}`}>
                        {appleAi.available
                          ? 'Runs entirely on this Mac using Apple Intelligence — no API key, no model download, nothing leaves the device. No setup needed.'
                          : (appleAi.reason || 'Apple Intelligence is not available on this Mac right now.')}
                      </div>
                    )}

                    {aiSettings.provider !== 'apple' && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Base URL</label>
                        <input
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                          placeholder={AI_PROVIDER_DEFAULTS[aiSettings.provider]?.placeholder || 'http://...'}
                          value={aiSettings.baseUrl}
                          onChange={(e) => updateAISettings({ baseUrl: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {aiSettings.provider === 'lmstudio' && 'App runs in Docker — use host.docker.internal, not localhost'}
                          {aiSettings.provider === 'ollama' && 'App runs in Docker — use host.docker.internal, not localhost'}
                          {aiSettings.provider === 'openai' && '/v1/chat/completions is appended automatically'}
                        </p>
                      </div>
                    )}

                    {aiSettings.provider !== 'apple' && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Model Name{aiSettings.provider !== 'openai' && ' (optional)'}
                        </label>
                        <input
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                          placeholder={
                            aiSettings.provider === 'ollama' ? 'llama3' :
                            aiSettings.provider === 'openai' ? 'gpt-4o' :
                            'leave blank to use whatever is loaded'
                          }
                          value={aiSettings.model}
                          onChange={(e) => updateAISettings({ model: e.target.value })}
                        />
                      </div>
                    )}

                    {aiSettings.provider !== 'lmstudio' && aiSettings.provider !== 'ollama' && aiSettings.provider !== 'apple' && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">API Key</label>
                        <input
                          type="password"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                          placeholder="sk-..."
                          value={aiSettings.apiKey}
                          onChange={(e) => updateAISettings({ apiKey: e.target.value })}
                        />
                      </div>
                    )}

                    <button
                      onClick={handleAITest}
                      disabled={!aiSettings.baseUrl || aiTestStatus === 'testing'}
                      className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {aiTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>

                    {aiTestStatus === 'ok' && (
                      <div className="text-xs text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
                        Connected — {aiTestMessage}
                      </div>
                    )}
                    {aiTestStatus === 'error' && (
                      <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                        {aiTestMessage}
                      </div>
                    )}

                    {/* ── Image Generation (SwarmUI) ── */}
                    <div className="pt-3 border-t border-gray-700 space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-dnd-gold"
                          checked={!!aiSettings.imageEnabled}
                          onChange={(e) => updateAISettings({ imageEnabled: e.target.checked })}
                        />
                        <span>
                          <span className="text-sm text-gray-200 font-semibold">Generate token images</span>
                          <span className="block text-xs text-gray-400 leading-snug">
                            When AI generates a creature, also produce a portrait via SwarmUI and use it as the token avatar.
                          </span>
                        </span>
                      </label>

                      {aiSettings.imageEnabled && (() => {
                        const def = IMAGE_PROVIDER_DEFS[aiSettings.imageProvider] || IMAGE_PROVIDER_DEFS.swarmui;
                        return (
                        <>
                          {/* Provider picker. Switching providers wipes
                              the model + clears the test status because
                              "currently loaded model" doesn't carry
                              between platforms. Base URL is updated
                              only if it's blank or matched the previous
                              provider's default — preserves a manual
                              override the user typed in. */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Image provider</label>
                            <select
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                              value={aiSettings.imageProvider}
                              onChange={(e) => {
                                const next = e.target.value;
                                const prevDef = IMAGE_PROVIDER_DEFS[aiSettings.imageProvider];
                                const nextDef = IMAGE_PROVIDER_DEFS[next];
                                const overwriteUrl =
                                  !aiSettings.imageBaseUrl ||
                                  aiSettings.imageBaseUrl === (prevDef?.defaultBaseUrl || '');
                                const patch = { imageProvider: next, imageModel: '' };
                                if (overwriteUrl) patch.imageBaseUrl = nextDef?.defaultBaseUrl || '';
                                updateAISettings(patch);
                                setAIImageTestStatus(null);
                                setAIImageModelList([]);
                              }}
                            >
                              {Object.entries(IMAGE_PROVIDER_DEFS).map(([id, p]) => (
                                <option key={id} value={id}>{p.label}</option>
                              ))}
                            </select>
                          </div>

                          {def.needsBaseUrl && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Base URL</label>
                              <input
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                                placeholder={def.placeholderUrl}
                                value={aiSettings.imageBaseUrl}
                                onChange={(e) => updateAISettings({ imageBaseUrl: e.target.value })}
                              />
                              {def.help && (
                                <p className="text-xs text-gray-500 mt-1">{def.help}</p>
                              )}
                            </div>
                          )}

                          {(def.needsApiKey || aiSettings.imageProvider === 'swarmui' || aiSettings.imageProvider === 'auto1111') && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                {def.apiKeyLabel || 'API key'}
                                {!def.needsApiKey && <span className="text-gray-500"> (optional)</span>}
                              </label>
                              <input
                                type="password"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                                placeholder={def.needsApiKey ? 'sk-...' : 'leave blank if no auth'}
                                value={aiSettings.imageApiKey || ''}
                                onChange={(e) => updateAISettings({ imageApiKey: e.target.value })}
                              />
                              {!def.needsApiKey && aiSettings.imageProvider === 'openai' === false && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Most local installs leave this blank. If you've set <code>--api-auth</code> or proxied behind auth, paste the bearer token here.
                                </p>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Model {!def.needsApiKey && <span className="text-gray-500">(optional)</span>}</label>
                            <input
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                              placeholder={
                                aiSettings.imageProvider === 'openai'  ? 'dall-e-3' :
                                aiSettings.imageProvider === 'stability' ? 'core (or sd3.5-large, ultra)' :
                                'leave blank to use whatever\'s loaded'
                              }
                              value={aiSettings.imageModel}
                              onChange={(e) => updateAISettings({ imageModel: e.target.value })}
                            />
                          </div>

                          {def.supportsCustomSize && (
                            <div className={`grid gap-2 ${def.supportsSteps && def.supportsCfg ? 'grid-cols-4' : 'grid-cols-2'}`}>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Width</label>
                                <input
                                  type="number" min={256} max={2048} step={64}
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                                  value={aiSettings.imageWidth}
                                  onChange={(e) => updateAISettings({ imageWidth: Number(e.target.value) || 768 })}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Height</label>
                                <input
                                  type="number" min={256} max={2048} step={64}
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                                  value={aiSettings.imageHeight}
                                  onChange={(e) => updateAISettings({ imageHeight: Number(e.target.value) || 768 })}
                                />
                              </div>
                              {def.supportsSteps && (
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Steps</label>
                                  <input
                                    type="number" min={1} max={150}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                                    value={aiSettings.imageSteps}
                                    onChange={(e) => updateAISettings({ imageSteps: Number(e.target.value) || 25 })}
                                  />
                                </div>
                              )}
                              {def.supportsCfg && (
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">CFG</label>
                                  <input
                                    type="number" min={1} max={30} step={0.5}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                                    value={aiSettings.imageCfgScale}
                                    onChange={(e) => updateAISettings({ imageCfgScale: Number(e.target.value) || 6 })}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              Prompt template <span className="text-gray-500">— <code>{'{name}'}</code> and <code>{'{appearance}'}</code> are substituted; appearance is auto-appended if you don't include the placeholder</span>
                            </label>
                            <textarea
                              rows={2}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold resize-y"
                              value={aiSettings.imagePromptTemplate}
                              onChange={(e) => updateAISettings({ imagePromptTemplate: e.target.value })}
                            />
                          </div>

                          {def.supportsNegativePrompt && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Negative prompt (optional)</label>
                              <textarea
                                rows={2}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold resize-y"
                                placeholder="things you don't want — e.g. blurry, watermark, extra limbs"
                                value={aiSettings.imageNegativePrompt}
                                onChange={(e) => updateAISettings({ imageNegativePrompt: e.target.value })}
                              />
                            </div>
                          )}

                          <label className="flex items-start gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="mt-0.5 accent-red-500"
                              checked={!!aiSettings.imageAllowNsfw}
                              onChange={(e) => updateAISettings({ imageAllowNsfw: e.target.checked })}
                            />
                            <span>
                              <span className="text-sm text-red-300 font-semibold">Allow NSFW content</span>
                              <span className="block text-xs text-gray-400 leading-snug">
                                {def.supportsNegativePrompt
                                  ? 'When off, safe-content terms are appended to the negative prompt. When on, only your prompt + your negative prompt are sent — what you actually get depends on the model loaded.'
                                  : 'This provider has its own content policy and ignores negative prompts. Toggling this only affects how your locally-stored settings are exported.'}
                              </span>
                            </span>
                          </label>

                          <button
                            onClick={handleAIImageTest}
                            disabled={
                              (def.needsBaseUrl && !aiSettings.imageBaseUrl) ||
                              (def.needsApiKey && !aiSettings.imageApiKey) ||
                              aiImageTestStatus === 'testing'
                            }
                            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                          >
                            {aiImageTestStatus === 'testing' ? 'Testing...' : 'Test Image Connection'}
                          </button>

                          {aiImageTestStatus === 'ok' && (
                            <div className="text-xs text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 space-y-1">
                              <div>Connected — {aiImageTestMessage}</div>
                              {aiImageModelList.length > 0 && (
                                <div className="text-gray-300 text-[11px] leading-snug">
                                  <div className="text-gray-400 mb-0.5">Models found ({aiImageModelList.length}) — click to use:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {aiImageModelList.slice(0, 30).map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => updateAISettings({ imageModel: m })}
                                        className={`px-1.5 py-0.5 rounded border text-[10px] ${
                                          aiSettings.imageModel === m
                                            ? 'bg-dnd-gold/20 border-dnd-gold text-dnd-gold'
                                            : 'bg-gray-700 border-gray-600 hover:border-dnd-gold text-gray-200'
                                        }`}
                                      >{m}</button>
                                    ))}
                                  </div>
                                  <div className="text-gray-500 mt-1">Leave the Model field blank to auto-pick the first one.</div>
                                </div>
                              )}
                            </div>
                          )}
                          {aiImageTestStatus === 'error' && (
                            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                              {aiImageTestMessage}
                            </div>
                          )}
                        </>
                        );
                      })()}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Plugin extensions targeting the Session tab — render
                    just above the manager so plugin-driven controls are
                    closer to the top while the install / enable UI stays
                    near the bottom. */}
                <PluginPanelTabExtensions
                  tabId="session"
                  ctx={{ sessionId: session.id, role: 'dm', socket, setPanelTab }}
                />

                {/* Plugin manager — install / enable / disable / delete.
                    Wrapped so the panel folds away with the same chevron
                    treatment as the other Session-tab sections. The
                    section id matches what tab-controller looks for if a
                    GM later wants to hide the panel entirely. */}
                <CollapsibleSection id="plugins" title="Plugins">
                  <PluginManager
                    loadErrors={pluginLoadErrors}
                    pluginsTick={pluginsTick}
                    onPluginsChanged={() => setPluginsTick(t => t + 1)}
                    context={{ sessionId: session.id, role: 'dm', socket }}
                  />
                </CollapsibleSection>

                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
                >
                  Leave Session
                </button>
              </div>
            )}

            {/* Plugin-supplied panel tabs. The render function returns the
                full tab content; we wrap it in the same scroll container
                style as built-in tabs for visual consistency. Only the
                currently-active plugin tab is rendered. */}
            {typeof panelTab === 'string' && panelTab.startsWith('plugin:') && (() => {
              const pid = panelTab.slice('plugin:'.length);
              const def = pluginRegistries.dmTabs.get(pid);
              if (!def || typeof def.render !== 'function') {
                return <div className="p-4 text-xs text-gray-400">Plugin tab unavailable.</div>;
              }
              try {
                return (
                  <div className="h-full overflow-y-auto">
                    {def.render({ sessionId: session.id, role: 'dm', socket })}
                  </div>
                );
              } catch (err) {
                return <div className="p-4 text-xs text-red-300">Plugin tab "{pid}" threw: {String(err.message || err)}</div>;
              }
            })()}
          </div>
        </div>
        </>
      )}

      {show3D && (
        <ErrorBoundary label="3D view" onReset={() => setShow3D(false)}>
        <React.Suspense fallback={<div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center text-gray-300 text-sm">Loading 3D…</div>}>
          <Map3DView
            mapId={session?.map_id ?? null}
            /* The same list the flat map gets, so a cast looks the same in
               whichever view the GM happens to be in. */
            tokenFx={tokenFx}
            /* Stacked, the ground plane must be the GROUND floor.
               `mapUrl` follows the selected storey, which is right for the flat
               map and for a single floor in 3D — but with the stack expanded it
               painted the selected floor's image at y=0 as well as at its own
               height, so that floor appeared twice: once where it belongs and
               once on the ground. */
            /* The base plane is always the GROUND floor: the storeys above it
               are drawn as their own planes at their own heights. */
            mapUrl={levels.find((l) => l.level_index === 0)?.image_path
              ? `/uploads/${levels.find((l) => l.level_index === 0).image_path}`
              : mapUrl}
            mapWidth={session.map_width}
            mapHeight={session.map_height}
            gridSize={effectiveGridSize}
            /* Everything, every storey. The 3D view stacks the floors below
               the one being viewed and decides for itself what to draw — the
               flat map is the one that shows a single floor. */
            tokens={tokens}
            walls={walls}
            doors={doors}
            // Right-click a door in 3D. Without this the GM got nothing at
            // all there — the flat map's menu lives inside MapStage, which
            // the 3D view does not render, so the handler had no menu to open
            // and no toggle to fall back on either.
            onDoorMenu={(doorId, x, y) => setDoor3DMenu({ doorId, x, y })}
            onTileMenu={(tileId, x, y) => setTileMenu({ tileId, x, y })}
            /* The GM can drag anything; movement is horizontal, so a flying
               token keeps its height. */
            movableTokenIds={tokens.map((t) => t.id)}
            onTokenMove={handleTokenMove}
            spellTemplates={spellTemplates}
            magicalDarkness={magicalDarkness}
            /* Hulls are drawn from the same deck maths the flat map uses. */
            ships={ships}
            /* Steering. The GM drags any hull, as on the flat map — there is
               no helm requirement for them, so Map3DView gates on the presence
               of these handlers plus its GM flag rather than on a ship id. */
            onShipMove={(shipId, gridCol, gridRow, live) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, grid_col: gridCol, grid_row: gridRow } : s));
              if (!live) socket.emit('move_ship', { shipId, gridCol, gridRow });
            }}
            onShipRotate={(shipId, rotation, live) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, rotation } : s));
              if (!live) socket.emit('rotate_ship', { shipId, rotation });
            }}
            /* Stairs. Dropping a token on a stairwell square sends it to
               the linked deck — the same socket call the flat map makes when
               you click the stairs there. */
            onTokenChangeDeck={(tokenId, shipId, toDeck, toCol, toRow) =>
              socket.emit('token_change_deck', { tokenId, shipId, toDeck, toCol, toRow })}
            /* Dropping a token on a hull puts it on whichever level is under
               the cursor — the GM places on the deck they are looking at. */
            onTokenDeckMove={(tokenId, shipId, deckIndex, gridCol, gridRow) => {
              setTokens(prev => prev.map(t => t.id === tokenId
                ? { ...t, grid_col: gridCol, grid_row: gridRow, ship_id: shipId, deck_index: deckIndex }
                : t));
              socket.emit('token_deck_move', { tokenId, shipId, deckIndex, gridCol, gridRow });
            }}
            /* Same action as the flat map's deck buttons, so switching level
               in either view moves both. GM only: PlayerView passes no
               handler, which is what hides the control there. */
            onShipDeckChange={(shipId, deckIndex) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, active_deck: deckIndex } : s));
              socket.emit('set_ship_deck', { shipId, deckIndex });
            }}
            /* Scenery, and the lattice the flat map uses — square or hex. */
            terrain={terrain}
            tiles={tiles}
            gridType={session?.map_grid_type || 'square'}
            /* Generated systems raise real suns and orbit rings — see the
               star-system pass in Map3DView. */
            system={session?.map_system}
            /* Wildspace maps get the starfield wrapped around the scene, and
               any map with an uploaded panorama can use one. */
            skyUrl={session?.map_sky_image ? `/uploads/${session.map_sky_image}` : null}
            /* A built-in sky when nothing has been uploaded for this map. */
            skyPreset={session?.map_sky_preset || null}
            mapType={session?.map_type || 'image'}
            /* Lit by the same code the flat map uses — see the light layer
               in Map3DView. */
            lights={levelLights}
            gridScale={session?.map_grid_scale || 5}
            gridUnit={session?.map_grid_unit || 'ft'}
            /* Ink is shared across both views and both roles — a line the GM
               draws in 3D is the same stroke the players see on the flat
               map. */
            drawings={drawings}
            inkColor={myInkColor}
            onDrawStroke={(points) => socket.emit('draw_stroke', { mapId: session?.map_id ?? null, points, width: 4 })}
            onDrawUndo={() => socket.emit('draw_undo', { mapId: session?.map_id ?? null })}
            rightInset={panelInset}
            /* Placing from the panel, on the same terms as the flat map.
               These are the identical props and handlers MapStage gets: 3D is a
               view of the map, so arming a creature, a marker or a terrain
               piece and clicking the board has to work in whichever view
               happens to be open. Without them the 3D canvas simply covered an
               inert board — the panel armed the thing and the click went
               nowhere. */
            // `placingToken` is what actually arms the map's click reporting;
            // `onMapClick` on its own is ignored. Laying a patrol route is the
            // same kind of mode, so it arms it the same way.
            placingToken={!!(placingCreature || placingMarkerType || patrolDraft)}
            onMapClick={(placingCreature || placingMarkerType || patrolDraft) ? handleMapClick : null}
            patrolRoutes={patrolRoutes}
            pendingTerrain={pendingTerrain}
            onTerrainPlace={handleTerrainPlace}
            /* Ping and the Effects zones, on the same handlers the flat map
               uses. The ping carries the storey the table is on so it surfaces
               at that floor's height for everyone — see the dm_ping relay. */
            pings={activePings}
            onPingMap={handlePingMap}
            onMagicalDarknessAdd={handleMagicalDarknessAdd}
            onMagicalDarknessDelete={handleMagicalDarknessDelete}
            /* Templates, on the same two handlers the flat map uses — a cone
               dropped in either view is one row in spell_templates. */
            onTemplatePlace={(tpl) => socket.emit('place_template', tpl)}
            onTemplateDelete={(id) => {
              socket.emit('delete_template', { id });
              setEditingTemplateId(prev => (prev === id ? null : prev));
            }}
            onTemplateUpdate={(payload) => socket.emit('update_template', payload)}
            /* Opens the same settings dialog the flat map opens — it is
               rendered at z-[90], above this overlay, so it shows in 3D. */
            onTemplateSelect={(id) => setEditingTemplateId(id)}
            /* Right-click a fog bank to set how tall it stands. */
            onZoneContextMenu={(id, x, y) => setZoneHeightMenu({ id, x, y })}
            /* Same selection the flat map drives, so clicking a creature in
               3D scrolls the panel's token list to its row exactly as it does
               in 2D. */
            onTokenSelect={setSelectedToken}
            /* The top bar stays on screen in 3D, so the view's own
               top-anchored controls drop below it instead of under it. */
            topInset={TOP_BAR_H}
            focusTokenRef={focusTokenRef}
            /* Walls stand up in 3D only for maps that have storeys. On a
               single-storey battlemap the ground image already shows them and
               extruding boxes on top just fights with the artwork. */
            /* Standing walls on a tile map, for the same reason a
               multi-storey one gets them: 'none' is right when the ground
               carries a drawn map that already shows its walls, and a tile
               map's ground is a dark field with top-down art laid on it.
               Without this an imported Dungeondraft room blocked sight but
               nothing stood up — the walls were there and invisible. */
            wallMode={(levels.length > 1 || session?.map_type === 'tiles') ? 'solid' : 'none'}
            gridColor={gridColor}
            levels={levels}
            activeLevel={activeLevel}
            onLevelChange={(i) => socket.emit('set_map_level', { levelIndex: i })}
            /* No stackLevels here: the GM's 3D view ticks each storey and
               each deck on or off in its own layers panel, which "all at once"
               is only one arrangement of. The flag is the PLAYER's control —
               one button, because a player is standing in the building rather
               than arranging a view of it. */
            /* The same two menus the flat map opens, driven by a raycast in 3D
               instead of a hit test on the canvas. Passing the setters directly
               means there is one menu per thing, not one per view. */
            onTokenContextMenu={(tokenId, x, y) => setTokenContextMenu({ tokenId, x, y })}
            onTerrainContextMenu={(id, x, y) => setTerrainContextMenu({ id, x, y })}
            onClose={() => setShow3D(false)}
          />
        </React.Suspense>
        </ErrorBoundary>
      )}

      {/* The tile menu, shared by both views — the flat map and the 3D board
          both just report which tile was right-clicked and where. */}
      {tileMenu && (() => {
        const t = (tiles || []).find((x) => x.id === tileMenu.tileId);
        if (!t) return null;
        // What is standing on it RIGHT NOW, by position — the same test the
        // server uses to decide what gets removed. Counting what the tile
        // spawned would promise to delete a monster that has since walked
        // away, and stay silent about one that wandered in.
        //
        // Centre-in-footprint, and player characters never counted: they are
        // exempt from removal.
        const spawnCount = (tokens || []).filter((tk) => {
          if (tk.is_player) return false;
          const half = (Number(tk.size_squares) || 1) / 2;
          const cx = Number(tk.grid_col) + half;
          const cy = Number(tk.grid_row) + half;
          return cx >= t.grid_col && cx <= t.grid_col + t.grid_w
              && cy >= t.grid_row && cy <= t.grid_row + t.grid_h;
        }).length;
        return (
          <TileMenu
            tile={{ ...t, spawn_count: spawnCount }}
            x={tileMenu.x}
            y={tileMenu.y}
            onRemove={(tileId, keepTokens) => socket.emit('tiles_remove', { tileId, keepTokens })}
            onClose={() => setTileMenu(null)}
          />
        );
      })()}

      {/* The 3D view's door menu. Reads the LIVE door row rather than one
          captured when the menu opened, so "Open door" flips to "Close door"
          the moment the action lands, and the menu closes by itself if the
          door is deleted from under it. */}
      {show3D && door3DMenu && (() => {
        const d = (doors || []).find((x) => x.id === door3DMenu.doorId);
        if (!d) return null;
        return (
          <DoorMenu
            door={d}
            doorSprites={doorSprites}
            x={door3DMenu.x}
            y={door3DMenu.y}
            onToggle={handleDoorToggle}
            onFlip={handleDoorFlip}
            onKindSet={(id, kind) => socket.emit('set_door_kind', { doorId: id, kind })}
            onSpriteSet={handleDoorSpriteSet}
            onDelete={handleDoorDelete}
            onClose={() => setDoor3DMenu(null)}
          />
        );
      })()}
      {/* The 3D view used to need its own Panel button here, because the top
          bar carrying the real one was buried under the overlay. The bar now
          stays on top in 3D and brings its Panel toggle with it, so a second
          one would just be two buttons doing one job. */}
      {/* Fog bank height.
          Fixed at the cursor and above the 3D overlay, like every other
          context menu here. Height is a property of the bank, so it is stored
          on the zone and everyone sees the same fog. */}
      {zoneHeightMenu && (() => {
        const zone = magicalDarkness.find((d) => d.id === zoneHeightMenu.id);
        if (!zone) return null;
        const cur = zone.height_ft == null ? '' : String(zone.height_ft);
        const setH = (v) => socket.emit('update_zone_height', {
          darknessId: zone.id,
          heightFt: v,
        });
        return (
          <>
            {/* Click-away catcher, so the menu closes like the others. */}
            <div className="fixed inset-0 z-[88]" onClick={() => setZoneHeightMenu(null)} />
            <AnchoredPanel
              x={zoneHeightMenu.x}
              y={zoneHeightMenu.y}
              className="z-[89] w-56 rounded-xl bg-gray-900/97 border border-gray-700 shadow-2xl p-3 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-gray-400">Fog height</span>
                <button
                  onClick={() => setZoneHeightMenu(null)}
                  className="text-gray-500 hover:text-white flex items-center"
                ><XIcon /></button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="500" step="5"
                  value={cur}
                  placeholder="auto"
                  onChange={(e) => {
                    const v = e.target.value;
                    setH(v === '' ? null : Number(v));
                  }}
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100"
                />
                <span className="text-[11px] text-gray-500 shrink-0">ft</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[10, 20, 30, 50].map((h) => (
                  <button
                    key={h}
                    onClick={() => setH(h)}
                    className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                      Number(zone.height_ft) === h
                        ? 'bg-sky-600 border-sky-400 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-sky-400/60'
                    }`}
                  >{h}ft</button>
                ))}
                <button
                  onClick={() => setH(null)}
                  title="Size it from the bank's own footprint, capped to the storey"
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    zone.height_ft == null
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-sky-400/60'
                  }`}
                >Auto</button>
              </div>
              <p className="text-[10px] text-gray-500 leading-snug">
                Auto sizes the bank from its own footprint and keeps it under the
                storey it stands in. Set a figure to fill a stairwell — or to
                stop fog pushing through the floor above.
              </p>
            </AnchoredPanel>
          </>
        );
      })()}

      <DiceRollOverlay rolls={diceRolls} />
      {/* The view switch. Above the 3D overlay (z-70) so the same control
          flips back — in 3D it's the only chrome on screen besides the rail. */}
      {/* Jump the 3D camera to a token.
          Above the view switch and tracking the same panel inset, so an open
          GM panel pushes both of them left together. Closes itself on pick —
          the point is to get to the token, not to browse. */}
      {show3D && (
        <div className="fixed z-[80] flex flex-col items-end" style={{ right: panelInset + 16, bottom: 80 }}>
          {tokenJumpOpen && (
            <div className="mb-2 w-60 max-h-72 overflow-y-auto rounded-xl bg-gray-900/95 border border-gray-700 shadow-2xl p-1">
              {tokens.length === 0 && (
                <p className="text-xs text-gray-500 px-2 py-2">No tokens on this map.</p>
              )}
              {/* Players first: on a crowded board they are the ones the GM
                  jumps to most, and hunting for them among thirty goblins is
                  the thing this control exists to avoid. */}
              {[...tokens]
                .sort((a, b) => (b.is_player ? 1 : 0) - (a.is_player ? 1 : 0)
                  || String(a.name || '').localeCompare(String(b.name || '')))
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      // Aboard a hull, on a level that isn't the one drawn?
                      // Switch the ship to it first. Crew on an undrawn deck
                      // are culled from the scene entirely, so without this the
                      // jump would silently do nothing for exactly the tokens
                      // hardest to find by eye.
                      //
                      // The focus call that follows retries across frames until
                      // the sprite appears, which is what covers the round trip
                      // to the server and back.
                      const sh = t.ship_id != null ? ships.find((x) => x.id === t.ship_id) : null;
                      const wantDeck = Number(t.deck_index) || 0;
                      if (sh && (Number(sh.active_deck) || 0) !== wantDeck) {
                        socket.emit('set_ship_deck', { shipId: sh.id, deckIndex: wantDeck });
                      }
                      focusTokenRef.current?.(t.id);
                      setTokenJumpOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-800 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${t.is_player ? 'bg-sky-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-gray-200 truncate flex-1">{t.name || 'Token'}</span>
                    {t.ship_id != null && (
                      <span className="text-[10px] text-gray-500 shrink-0" title="Aboard a ship">
                        ⚓{Number(t.deck_index) || 0}
                      </span>
                    )}
                    {Number(t.elevation) ? (
                      <span className="text-[10px] text-sky-300 shrink-0">▲{t.elevation}</span>
                    ) : null}
                  </button>
                ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setTokenJumpOpen((o) => !o)}
            title="Jump the camera to a token"
            className={`h-12 px-4 rounded-full bg-gray-900/95 border shadow-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${
              tokenJumpOpen ? 'border-dnd-gold text-white' : 'border-gray-700 text-gray-200 hover:border-dnd-gold hover:text-white'
            }`}
          >
            <span aria-hidden="true">◎</span>
            <span>Tokens</span>
          </button>
        </div>
      )}

      {/* Patrols: the stop button, in the bottom row with the log and the view
          switch rather than pinned across the top of the map.
          Placed left of the roll log (which sits at panelInset + 136 and is a
          little under 90px wide), so the three controls read as one row.
          Only rendered when this map has something to stop — a board with no
          patrols carries no extra chrome. */}
      {patrolsHere > 0 && (
        <button
          type="button"
          onClick={() => socket.emit('set_patrols_paused',
            { paused: !patrolsPaused, mapId: session?.map_id ?? null })}
          title={patrolsPaused
            ? 'Let the patrols on this map walk again'
            : 'Freeze the patrols on this map (other maps keep walking)'}
          className={`fixed bottom-4 z-[80] flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border shadow-lg transition-colors ${
            patrolsPaused
              ? 'bg-red-900/95 border-red-500 text-red-100 hover:bg-red-800'
              : 'bg-emerald-900/95 border-emerald-500 text-emerald-100 hover:bg-emerald-800'
          }`}
          style={{ right: panelInset + 234 }}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${
            patrolsPaused ? 'bg-red-300' : 'bg-emerald-300 animate-pulse'}`} />
          {patrolsPaused ? 'Paused' : 'Patrols'}
          <span className="text-[10px] font-normal opacity-80">
            {patrolsHere}{combatActive ? ' · combat' : ''}
          </span>
        </button>
      )}

      <div className="fixed bottom-4 z-[80]" style={{ right: panelInset + 16 }}>
        <ViewToggle
          is3D={show3D}
          onChange={(next) => { setShow3D(next); if (!next) setTokenJumpOpen(false); }}
          disabled={!session?.map_id}
          title={session?.map_id ? undefined : 'Load a map first'}
        />
      </div>

      <RollLog
        /* Beside the 3D view switch, not on top of it — both live in the
           bottom-right corner at z-80. */
        side="right-inset"
        rightInset={panelInset}
        entries={rollLog}
        open={rollLogOpen}
        onToggle={() => setRollLogOpen((o) => !o)}
        canRoll
        onQuickRoll={(d) => socket.emit('roll_dice', { dice: d, count: 1, modifier: 0, label: null })}
      />

      {/* Actions reference modal */}
      {showActionsRef && <ActionsReference onClose={() => setShowActionsRef(false)} />}

      {whisperToast && (
        <WhisperToast
          toast={whisperToast}
          onClose={() => setWhisperToast(null)}
        />
      )}

      {/* Spell template edit popup */}
      {editingTemplateId && (() => {
        const tpl = spellTemplates.find(t => t.id === editingTemplateId);
        if (!tpl) return null;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-4" onClick={() => setEditingTemplateId(null)}>
            <div
              className="bg-dnd-panel border border-gray-700 rounded-xl w-80 shadow-2xl p-4 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-dnd-gold font-semibold">Edit Template</h3>
                <button onClick={() => setEditingTemplateId(null)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
              </div>
              <div className="text-xs text-gray-400 capitalize">{tpl.type}</div>
              {/* Anchored to a deck. The server keeps `points` in map pixels
                  and rewrites them whenever the hull moves, so nothing about
                  the rendering changes — this is purely so the GM can see that
                  a template is riding a ship, and get it off again. */}
              {tpl.ship && (() => {
                const sh = ships.find((x) => x.id === tpl.ship.shipId);
                return (
                  <div className="flex items-center gap-2 bg-cyan-900/25 border border-cyan-800 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs text-cyan-200 flex-1 min-w-0 truncate">
                      ⚓ Aboard {sh?.name || sh?.class_name || 'ship'}
                      <span className="text-cyan-400/70"> · deck {tpl.ship.deckIndex}</span>
                    </span>
                    <button
                      onClick={() => socket.emit('update_template', { id: tpl.id, detachShip: true })}
                      className="px-2 py-0.5 rounded bg-gray-800 border border-gray-600 text-[11px] text-gray-200 hover:border-cyan-400 shrink-0"
                      title="Leave it where it is, but stop it following the hull"
                    >Detach</button>
                  </div>
                );
              })()}
              {tpl.type === 'square' && tpl.ship && (
                <p className="text-[10px] text-gray-500 leading-snug">
                  Squares ride the deck but don't turn with it — the renderer
                  draws them axis-aligned, so a turned square would shrink
                  rather than rotate. Use a line or cone if it needs to swing
                  with the hull.
                </p>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Color:</label>
                <input
                  type="color"
                  className="w-10 h-8 rounded border border-gray-600 cursor-pointer"
                  value={tpl.color || '#a855f7'}
                  onChange={(e) => socket.emit('update_template', { id: tpl.id, color: e.target.value })}
                />
                <span className="text-xs text-gray-500 font-mono">{tpl.color || '#a855f7'}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Label</label>
                <input
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  placeholder="(optional)"
                  defaultValue={tpl.label || ''}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v !== (tpl.label || '')) socket.emit('update_template', { id: tpl.id, label: v });
                  }}
                />
              </div>
              {tpl.type === 'circle' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Radius (ft)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                    defaultValue={Math.round((tpl.points[2] || 0) / (gridSize / 5))}
                    onBlur={(e) => {
                      const ft = Math.max(1, parseInt(e.target.value) || 1);
                      const px = ft * (gridSize / 5);
                      const next = [tpl.points[0], tpl.points[1], px];
                      socket.emit('update_template', { id: tpl.id, points: next });
                    }}
                  />
                </div>
              )}
              {/* Plugin-supplied editor extensions render here, after built-in
                  fields. The registry is keyed by pluginId so disabling a
                  plugin instantly removes its extension from the popup. */}
              <PluginTemplateEditorExtensions template={tpl} />
              <button
                onClick={() => { socket.emit('delete_template', { id: tpl.id }); setEditingTemplateId(null); }}
                className="w-full bg-red-900/50 hover:bg-red-800/60 border border-red-700 text-red-300 py-1.5 rounded-lg text-sm font-semibold"
              >
                Delete template
              </button>
            </div>
          </div>
        );
      })()}

      {/* Light edit popup */}
      {editingLight && (() => {
        const light = editingLight;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-4" onClick={() => setEditingLight(null)}>
            <div
              className="bg-dnd-panel border border-gray-700 rounded-xl w-80 shadow-2xl p-4 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-dnd-gold font-semibold">Edit Light Source</h3>
                <button onClick={() => setEditingLight(null)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Label (optional)</label>
                  <input
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                    value={light.label || ''}
                    onChange={e => setEditingLight(l => ({ ...l, label: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Bright Radius (px)</label>
                    <input
                      type="number" min="0"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                      value={light.bright_radius || 60}
                      onChange={e => setEditingLight(l => ({ ...l, bright_radius: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dim Radius (px)</label>
                    <input
                      type="number" min="0"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                      value={light.dim_radius || 120}
                      onChange={e => setEditingLight(l => ({ ...l, dim_radius: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Direction: {Math.round(light.direction ?? 0)}°
                      <span className="text-gray-600 ml-1">(0=E 90=S 180=W 270=N)</span>
                    </label>
                    <input
                      type="range" min="-180" max="180" step="5"
                      className="w-full accent-dnd-gold"
                      value={light.direction ?? 0}
                      onChange={e => setEditingLight(l => ({ ...l, direction: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Spread: {Math.round(light.spread_angle ?? 360)}°
                    </label>
                    <input
                      type="range" min="15" max="360" step="5"
                      className="w-full accent-dnd-gold"
                      value={light.spread_angle ?? 360}
                      onChange={e => setEditingLight(l => ({ ...l, spread_angle: Number(e.target.value) }))}
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                      <span>Cone</span><span>Panel</span><span>Full</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['#fbbf24','#f97316','#ef4444','#22d3ee','#34d399','#a78bfa','#f9fafb'].map(c => (
                      <button
                        key={c}
                        onClick={() => setEditingLight(l => ({ ...l, color: c }))}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${(light.color || '#fbbf24') === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ background: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={light.color || '#fbbf24'}
                      onChange={e => setEditingLight(l => ({ ...l, color: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border border-gray-600 bg-transparent"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-dnd-gold"
                    checked={light.flicker !== false}
                    onChange={e => setEditingLight(l => ({ ...l, flicker: e.target.checked }))}
                  />
                  <span>Flicker like a flame</span>
                  <span className="text-gray-500 ml-auto">off for sun / magical light</span>
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleLightUpdate(light.id, {
                    brightRadius: light.bright_radius,
                    dimRadius: light.dim_radius,
                    color: light.color,
                    label: light.label,
                    direction: light.direction ?? 0,
                    spreadAngle: light.spread_angle ?? 360,
                    flicker: light.flicker !== false,
                  })}
                  className="flex-1 bg-dnd-gold/80 hover:bg-dnd-gold text-gray-900 font-semibold py-1.5 rounded-lg text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { handleLightDelete(light.id); setEditingLight(null); }}
                  className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 border border-red-700 text-red-300 rounded-lg text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stat block modal */}
      {statBlockCreature && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[90] p-4 print-backdrop"
          onClick={() => setStatBlockCreature(null)}
        >
          <div
            className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl print-sheet"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0 no-print">
              <h3 className="font-bold text-dnd-gold truncate">{statBlockCreature.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  title="Print / Export as PDF"
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  PDF
                </button>
                <button onClick={() => setStatBlockCreature(null)} className="text-gray-400 hover:text-white flex items-center ml-1"><XIcon /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 shrink-0 no-print">
              {(statBlockCreature.is_player_character ? ['stats', 'inventory', 'spells', 'weapons'] : ['stats', 'inventory', 'spells', 'loot']).map((t) => (
                <button
                  key={t}
                  onClick={() => setStatBlockTab(t)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    statBlockTab === t ? 'text-dnd-gold border-b-2 border-dnd-gold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t === 'stats' ? 'Stat Block' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Stat Block tab */}
            {statBlockTab === 'stats' && (
              <div className="flex-1 overflow-y-auto p-4 no-print">
                <StatBlock creature={statBlockCreature} />
              </div>
            )}

            {/* Always-rendered stat block for PDF export. Hidden on screen,
                shown by @media print so export works regardless of active tab. */}
            <div className="print-only">
              <StatBlock creature={statBlockCreature} />
            </div>

            {/* Inventory tab */}
            {statBlockTab === 'inventory' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(() => {
                  let inv = [];
                  if (Array.isArray(statBlockCreature.inventory)) inv = statBlockCreature.inventory;
                  else if (typeof statBlockCreature.inventory === 'string' && statBlockCreature.inventory.startsWith('[')) {
                    try { inv = JSON.parse(statBlockCreature.inventory); } catch { inv = []; }
                  }
                  const gp = statBlockCreature.currency_gp, sp = statBlockCreature.currency_sp, cp = statBlockCreature.currency_cp;
                  const currency = [gp && `${gp} GP`, sp && `${sp} SP`, cp && `${cp} CP`].filter(Boolean);
                  const attunable = inv.filter(it => it?.attunement_required);
                  const attuned = attunable.filter(it => it.attuned);
                  return (
                    <>
                      {/* What this character is currently attuned to, and how
                          many of their three slots are spoken for. */}
                      {attunable.length > 0 && (
                        <div className="bg-gray-800 rounded-lg p-3 border border-purple-800/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-gray-400 font-semibold">Attunement</div>
                            <div className={`text-xs font-mono ${attuned.length >= 3 ? 'text-amber-300' : 'text-gray-500'}`}>{attuned.length}/3</div>
                          </div>
                          {attuned.length === 0 ? (
                            <div className="text-xs text-gray-500 italic">Nothing attuned.</div>
                          ) : (
                            <div className="space-y-0.5">
                              {attuned.map((it, i) => (
                                <div key={it.id ?? i} className="flex items-baseline gap-2 text-xs">
                                  <span className="text-purple-300">◆</span>
                                  <span className="text-white">{it.name || 'Unnamed item'}</span>
                                  {it.rarity && <span className="text-gray-500">{it.rarity}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {attunable.filter(it => !it.attuned).length > 0 && (
                            <div className="mt-1 pt-1 border-t border-gray-700 text-xs text-gray-500">
                              Carried, not attuned: {attunable.filter(it => !it.attuned).map(it => it.name).filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                      {currency.length > 0 && (
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1 font-semibold">Currency</div>
                          <div className="text-sm text-white">{currency.join(' · ')}</div>
                        </div>
                      )}
                      {inv.length === 0 && currency.length === 0 && (
                        <p className="text-xs text-gray-500 italic text-center py-8">No inventory recorded.</p>
                      )}
                      {inv.map((item, i) => (
                        <div key={i} className={`rounded-lg px-3 py-2 flex items-start justify-between gap-2 ${item.gm_hidden ? 'bg-gray-800 border border-amber-700/60' : 'bg-gray-800'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium">
                              {item.equipped ? <strong>{item.name}</strong> : item.name}
                              {item.equipped && <span className="text-xs text-dnd-gold ml-1">(equipped)</span>}
                              {item.gm_hidden && <span className="text-xs text-amber-400 ml-1" title="The player's sheet does not show this item at all.">(hidden from player)</span>}
                            </div>
                            {item.desc && <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>}
                          </div>
                          <div className="text-xs text-gray-400 shrink-0">×{item.qty || 1}</div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Spells tab */}
            {statBlockTab === 'spells' && (
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  let spells = [];
                  if (Array.isArray(statBlockCreature.spells)) spells = statBlockCreature.spells;
                  else if (typeof statBlockCreature.spells === 'string' && statBlockCreature.spells.startsWith('[')) {
                    try { spells = JSON.parse(statBlockCreature.spells); } catch { spells = []; }
                  }
                  let slots = {};
                  if (statBlockCreature.spell_slots && typeof statBlockCreature.spell_slots === 'object' && !Array.isArray(statBlockCreature.spell_slots)) slots = statBlockCreature.spell_slots;
                  else if (typeof statBlockCreature.spell_slots === 'string') { try { slots = JSON.parse(statBlockCreature.spell_slots); } catch { slots = {}; } }
                  const levels = [0,1,2,3,4,5,6,7,8,9].filter((l) => spells.some((s) => s.level === l));
                  if (!levels.length) return <p className="text-xs text-gray-500 italic text-center py-8">No spells recorded.</p>;
                  return levels.map((lvl) => {
                    const lvlSpells = spells.filter((s) => s.level === lvl);
                    const slotInfo = slots[lvl];
                    const available = slotInfo ? slotInfo.total - (slotInfo.used || 0) : null;
                    return (
                      <div key={lvl} className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-dnd-gold">{lvl === 0 ? 'Cantrips' : `Level ${lvl}`}</span>
                          {slotInfo && slotInfo.total > 0 && (
                            <span className="text-xs text-gray-400">{available}/{slotInfo.total} slots — {Array.from({ length: slotInfo.total }).map((_, i) => <span key={i} className={`slot-box${i < (slotInfo.used || 0) ? ' slot-box-used' : ''}`} />)}</span>
                          )}
                        </div>
                        {/* Every category in one alphabetical run, filling left
                            to right before wrapping — the type shows on each
                            card's own badge. */}
                        <div
                          className="spell-grid grid grid-cols-2 gap-2 mt-1"
                          style={{ gridAutoFlow: 'row', alignItems: 'start' }}
                        >
                          {[...lvlSpells]
                            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
                            .map((s, i) => {
                              const t = spellType(s.type);
                              return (
                                <SpellBox
                                  key={s.id ?? i}
                                  spell={s}
                                  typeLabel={t.badge}
                                  typeColor={t.dark}
                                  darkTheme
                                />
                              );
                            })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Weapons tab (PC only) */}
            {statBlockTab === 'weapons' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(() => {
                  let inv = [];
                  if (Array.isArray(statBlockCreature.inventory)) inv = statBlockCreature.inventory;
                  else if (typeof statBlockCreature.inventory === 'string' && statBlockCreature.inventory.startsWith('[')) {
                    try { inv = JSON.parse(statBlockCreature.inventory); } catch { inv = []; }
                  }
                  let spells = [];
                  if (Array.isArray(statBlockCreature.spells)) spells = statBlockCreature.spells;
                  else if (typeof statBlockCreature.spells === 'string' && statBlockCreature.spells.startsWith('[')) {
                    try { spells = JSON.parse(statBlockCreature.spells); } catch { spells = []; }
                  }
                  const weapons = inv.filter(it => it.item_type === 'weapon');
                  const combatSpells = spells.filter(s => spellType(s.type).key === 'combat');
                  const STAT_KEYS = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };
                  function atkBonus(item) {
                    const mod = bestWeaponStat(item, statBlockCreature).mod;
                    const pb = statBlockCreature.proficiency_bonus || 2;
                    const misc = item.attack_bonus_misc || 0;
                    const total = mod + pb + misc;
                    return (total >= 0 ? '+' : '') + total;
                  }
                  return (
                    <>
                      <div>
                        <div className="text-xs font-semibold text-dnd-gold mb-2">Weapons</div>
                        {weapons.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No weapons.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-gray-300">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-700">
                                  <th className="text-left pb-1.5 pr-2">Name</th>
                                  <th className="text-center pb-1.5 pr-2">Atk</th>
                                  <th className="text-left pb-1.5 pr-2">Damage</th>
                                  <th className="text-left pb-1.5">Range</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {weapons.map((w, idx) => {
                                  // A Spear thrown and a Spear swung two-handed are
                                  // different attacks; they get a row each rather
                                  // than one cell listing every die.
                                  const modes = weaponDamageModes(w);
                                  if (!modes.length) {
                                    return (
                                      <tr key={idx} className={w.equipped ? 'text-white' : 'text-gray-400'}>
                                        <td className="py-1.5 pr-2 font-medium">{w.name || '—'}{w.equipped && <span className="text-dnd-gold ml-1">★</span>}</td>
                                        <td className="py-1.5 pr-2 text-center font-mono text-green-400">{atkBonus(w)}</td>
                                        <td className="py-1.5 pr-2 font-mono">—</td>
                                        <td className="py-1.5">{w.weapon_range || '—'}</td>
                                      </tr>
                                    );
                                  }
                                  return modes.map((m, mi) => {
                                    const pick = weaponDamageMod(w, statBlockCreature, m.stat);
                                    const dm = pick.total;
                                    return (
                                    <tr key={`${idx}-${m.key}`} className={w.equipped ? 'text-white' : 'text-gray-400'}>
                                      <td className={`py-1.5 pr-2 font-medium ${mi > 0 ? 'pl-3 text-gray-500 font-normal' : ''}`}>
                                        {mi === 0
                                          ? <>{w.name || '—'}{w.equipped && <span className="text-dnd-gold ml-1">★</span>}</>
                                          : <span className="text-[11px]">↳ {m.label}</span>}
                                      </td>
                                      <td className="py-1.5 pr-2 text-center font-mono text-green-400">{mi === 0 ? atkBonus(w) : ''}</td>
                                      <td className="py-1.5 pr-2 font-mono">
                                        {mi === 0 && modes.length > 1 && <span className="text-gray-500 font-sans mr-1">{m.label}:</span>}
                                        {formatDamageWithMod(m.damage, dm)}{m.damage_type ? ` ${formatDamageType(m.damage_type)}` : ''}
                                        {(() => {
                                          const bd = damageParts(m.damage, pick.mod, pick.abbr, pick.misc);
                                          return bd.parts.length > 0
                                            ? <span className="text-gray-500 font-sans ml-1">({bd.dice} + {bd.parts.join(' + ')})</span>
                                            : null;
                                        })()}
                                      </td>
                                      <td className="py-1.5">{m.range || '—'}</td>
                                    </tr>
                                    );
                                  });
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      {combatSpells.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-red-400 mb-2">Offensive Spells</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-gray-300">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-700">
                                  <th className="text-left pb-1.5 pr-2">Name</th>
                                  <th className="text-left pb-1.5 pr-2">Damage</th>
                                  <th className="text-left pb-1.5 pr-2">Range</th>
                                  <th className="text-left pb-1.5">Level</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {combatSpells.map((s, i) => {
                                  const entries = Array.isArray(s.damage_entries) && s.damage_entries.length
                                    ? s.damage_entries
                                    : [{ damage: '', damage_type: '' }];
                                  const filtered = entries.filter(e => e.damage);
                                  const dmg = filtered.length
                                    ? filtered.map(e => `${e.damage}${e.damage_type ? ` ${e.damage_type}` : ''}`).join(' + ')
                                    : '—';
                                  return (
                                    <tr key={s.id ?? i}>
                                      <td className="py-1.5 pr-2 font-medium text-white">{s.name || '—'}</td>
                                      <td className="py-1.5 pr-2 font-mono">{dmg}</td>
                                      <td className="py-1.5 pr-2">{s.spell_range || '—'}</td>
                                      <td className="py-1.5 text-gray-500">{s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Loot tab */}
            {statBlockTab === 'loot' && (
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  let loot = [];
                  if (Array.isArray(statBlockCreature.loot)) loot = statBlockCreature.loot;
                  else if (typeof statBlockCreature.loot === 'string' && statBlockCreature.loot.startsWith('[')) {
                    try { loot = JSON.parse(statBlockCreature.loot); } catch { loot = []; }
                  }
                  if (!loot.length) return <p className="text-xs text-gray-500 italic text-center py-8">No loot table defined.</p>;
                  return (
                    <div className="space-y-1">
                      <div className="grid grid-cols-[1fr_60px_60px] gap-2 px-1 text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
                        <span>Item</span><span className="text-center">Qty</span><span className="text-center">Chance</span>
                      </div>
                      {loot.map((item, i) => (
                        <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                          <div className="grid grid-cols-[1fr_60px_60px] gap-2 items-center">
                            <span className="text-sm text-white font-medium">{item.name}</span>
                            <span className="text-xs text-gray-300 text-center">{item.qty || '1'}</span>
                            <span className={`text-xs text-center font-semibold ${item.chance >= 75 ? 'text-green-400' : item.chance >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>{item.chance}%</span>
                          </div>
                          {item.desc && <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GM Marker Edit Popup */}
      {editingMarker && (() => {
        const mtype = DM_MARKER_TYPES.find(t => t.type === editingMarker.marker_type);
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60" onClick={() => setEditingMarker(null)}>
            <div
              className="bg-dnd-panel border border-gray-600 rounded-2xl shadow-2xl w-80 p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-300 w-8 h-8">{mtype?.Icon ? <mtype.Icon /> : <MarkerIcons.note />}</span>
                <div>
                  <div className="text-base font-bold text-white">{mtype?.label || editingMarker.marker_type}</div>
                  <div className="text-xs text-gray-400">col {Math.round(editingMarker.grid_col)}, row {Math.round(editingMarker.grid_row)}</div>
                </div>
              </div>

              {editingMarker.marker_type === 'text_label' ? (
                <div>
                  <label className="block text-xs text-yellow-400 mb-1 font-semibold">Map Text (visible on map)</label>
                  <input
                    autoFocus
                    className="w-full bg-gray-700 border border-yellow-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                    value={editingMarker.label || ''}
                    onChange={(e) => setEditingMarker(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Text shown on the map…"
                  />
                  <p className="text-xs text-gray-500 mt-1">Only you can see this text.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Label</label>
                    <input
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                      value={editingMarker.label || ''}
                      onChange={(e) => setEditingMarker(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Short label"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Notes</label>
                    <textarea
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-dnd-gold"
                      rows={4}
                      value={editingMarker.note || ''}
                      onChange={(e) => setEditingMarker(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="GM notes for this marker…"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    socket.emit('update_dm_marker', { markerId: editingMarker.id, note: editingMarker.note, label: editingMarker.label });
                    setEditingMarker(null);
                  }}
                  className="flex-1 bg-dnd-gold hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    socket.emit('remove_dm_marker', { markerId: editingMarker.id });
                    setEditingMarker(null);
                  }}
                  className="px-3 py-2 bg-red-900/60 hover:bg-red-800 text-red-300 rounded-lg text-sm transition-colors border border-red-700"
                  title="Delete marker"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setEditingMarker(null)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Treasure export modal */}
      {/* Add loot from the item library.
          Typing a magic item out by hand means re-entering its damage,
          properties, attunement and weight — all of which the library already
          holds. Picking a row copies them across intact. */}
      {showTreasurePicker && (
        <div className="fixed inset-0 bg-black/70 z-[95] flex items-center justify-center p-4"
          onClick={() => setShowTreasurePicker(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-dnd-gold/60 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <h3 className="text-dnd-gold font-semibold">Add from Item Library</h3>
              <button type="button" onClick={() => setShowTreasurePicker(false)}
                className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-gray-800">
              <input
                autoFocus
                value={tpSearch}
                onChange={(e) => setTpSearch(e.target.value)}
                placeholder="Search the library…"
                className="flex-1 min-w-[12rem] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100"
              />
              <select value={tpType} onChange={(e) => setTpType(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100">
                <option value="">All types</option>
                <option value="magic_item">Magic items</option>
                <option value="gear">Gear</option>
                <option value="weapon">Weapons</option>
                <option value="armor">Armour</option>
              </select>
              <select value={tpRarity} onChange={(e) => setTpRarity(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100">
                <option value="">Any rarity</option>
                {['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'].map((r) => (
                  <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <select value={tpEdition} onChange={(e) => setTpEdition(e.target.value)}
                title="Most items are stocked in both editions, so this halves the duplicates"
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100">
                <option value="">Both editions</option>
                <option value="2024">2024</option>
                <option value="2014">2014</option>
              </select>
              <span className="text-[11px] text-gray-500 shrink-0">
                {tpLoading ? 'searching…' : `${tpRows.length} shown`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {!tpLoading && tpRows.length === 0 && (
                <div className="text-xs text-gray-500 italic text-center py-6">
                  Nothing matches those filters.
                </div>
              )}
              {tpRows.map((row) => {
                const picked = tpPicked.has(row.id);
                const qty = tpPicked.get(row.id) || 1;
                return (
                  <div key={row.id}
                    className={`flex items-start gap-2 p-2 rounded border ${
                      picked ? 'bg-dnd-gold/15 border-dnd-gold/60' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                    }`}>
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => setTpPicked((prev) => {
                        const next = new Map(prev);
                        if (next.has(row.id)) next.delete(row.id); else next.set(row.id, 1);
                        return next;
                      })}
                      className="accent-dnd-gold mt-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-100 flex items-center gap-2 flex-wrap">
                        <span>{row.name}</span>
                        {row.rarity && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                            {row.rarity}
                          </span>
                        )}
                        {row.attunement && (
                          <span className="text-[10px] text-amber-300">attunement</span>
                        )}
                        <EditionTag edition={row.edition} source={row.source} />
                        {row.cost && (
                          // Worth showing when you are deciding what a hoard
                          // is made of.
                          <span className="text-[10px] text-emerald-300/90">{row.cost}</span>
                        )}
                      </div>
                      {row.description && (
                        <div className="text-[11px] text-gray-400 line-clamp-2">{row.description}</div>
                      )}
                    </div>
                    {picked && (
                      <label className="flex items-center gap-1 shrink-0 text-[11px] text-gray-400">
                        <span>×</span>
                        <input
                          type="number" min="1" max="999" value={qty}
                          onChange={(e) => setTpPicked((prev) => {
                            const next = new Map(prev);
                            next.set(row.id, Math.max(1, Number(e.target.value) || 1));
                            return next;
                          })}
                          className="w-14 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-100"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700">
              <span className="text-xs text-gray-400">
                {tpPicked.size === 0 ? 'Nothing selected' : `${tpPicked.size} selected`}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowTreasurePicker(false)}
                  className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
                <button
                  type="button"
                  disabled={tpPicked.size === 0}
                  onClick={() => {
                    // Copy the library row's mechanics across rather than just
                    // its name — a longsword arrives with its damage and
                    // properties, a magic item with its attunement flag.
                    const additions = [];
                    for (const row of tpRows) {
                      if (!tpPicked.has(row.id)) continue;
                      additions.push({
                        id: Date.now() + Math.random(),
                        item_type: row.item_type || 'item',
                        name: row.name || '',
                        qty: tpPicked.get(row.id) || 1,
                        weight: row.weight || '',
                        desc: row.description || '',
                        equipped: false,
                        weapon_range: row.weapon_range || '',
                        attack_stat: row.attack_stat || 'STR',
                        attack_bonus_misc: Number(row.attack_bonus_misc) || 0,
                        damage_bonus_misc: Number(row.damage_bonus_misc) || 0,
                        damage_entries: Array.isArray(row.damage_entries) && row.damage_entries.length
                          ? row.damage_entries
                          : [{ damage: '', damage_type: '' }],
                        properties: row.properties || '',
                        mastery: row.mastery || '',
                        attunement_required: !!row.attunement,
                        attuned: false,
                        sheds_light: false,
                        bright_ft: 20,
                        dim_ft: 40,
                        rarity: row.rarity || '',
                        // Behaviour travels with the copy. A Bell of the Unseen
                        // Servant that lost its grant on the way out of the
                        // library would be a paragraph of prose and nothing
                        // else on the player's sheet.
                        ...(Array.isArray(row.grants_spells) && row.grants_spells.length
                          ? { grants_spells: row.grants_spells }
                          : {}),
                        ...(String(row.possession_form || '').trim()
                          ? { possession_form: row.possession_form }
                          : {}),
                        ...(row.charges && Number(row.charges.max) > 0
                          ? { charges: row.charges }
                          : {}),
                        ...(Number(row.ac_bonus) > 0 ? { ac_bonus: row.ac_bonus } : {}),
                        ...(String(row.attunement_req || '').trim()
                          ? { attunement_req: row.attunement_req }
                          : {}),
                        // The item's hidden clause comes with it, unrevealed.
                        ...(String(row.gm_secret || '').trim()
                          ? { gm_secret: row.gm_secret, secret_revealed: false }
                          : {}),
                      });
                    }
                    setTreasureList((prev) => [...prev, ...additions]);
                    setShowTreasurePicker(false);
                  }}
                  className="text-xs bg-dnd-gold/40 hover:bg-dnd-gold/60 disabled:bg-gray-700 disabled:text-gray-500 border border-dnd-gold/50 text-amber-100 px-3 py-1.5 rounded"
                >Add {tpPicked.size || ''} to chest</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Laying down a route.
          A floating bar rather than a modal: the map has to stay clickable, since
          clicking the map is how the waypoints get placed. */}
      {patrolDraft && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[95] bg-dnd-panel border border-sky-600 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
          <div className="text-sm">
            <div className="font-semibold text-sky-200">Drawing {patrolDraft.name}'s patrol</div>
            <div className="text-[11px] text-gray-400">
              Click the map to drop waypoints — {patrolDraft.points.length} placed
              {patrolDraft.points.length < 2 ? ' (two is the minimum)' : ''}
            </div>
          </div>
          <button
            type="button"
            disabled={!patrolDraft.points.length}
            onClick={() => setPatrolDraft((d) => ({ ...d, points: d.points.slice(0, -1) }))}
            className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-3 py-2 rounded"
          >Undo</button>
          <button
            type="button"
            disabled={patrolDraft.points.length < 2}
            onClick={() => { setPatrolSetup({ tokenId: patrolDraft.tokenId, points: patrolDraft.points }); setPatrolDraft(null); }}
            className="text-xs bg-sky-700 hover:bg-sky-600 disabled:bg-gray-700 disabled:text-gray-500 px-3 py-2 rounded font-semibold"
          >Finish route</button>
          <button
            type="button"
            onClick={() => setPatrolDraft(null)}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-2"
          >Cancel</button>
        </div>
      )}

      {/* How fast, and what to do at the end.
          The speeds offered are the token's OWN — a patrol at a speed the creature
          does not have is a house rule the GM can still type in, but it should not
          be the first thing offered. */}
      {patrolSetup && (() => {
        const tok = tokens.find((t) => t.id === patrolSetup.tokenId) || {};
        const speeds = [
          ['Walk', tok.creature_speed],
          ['Fly', tok.creature_speed_fly],
          ['Swim', tok.creature_speed_swim],
          ['Climb', tok.creature_speed_climb],
          ['Burrow', tok.creature_speed_burrow],
        ].filter(([, v]) => Number(v) > 0);
        // Half speed is how a guard actually patrols — at a walk, not a jog — so
        // it is offered alongside the full speeds.
        const walk = Number(tok.creature_speed) || 30;
        const options = [
          ...speeds.map(([label, v]) => ({ label: `${label} — ${v} ft`, value: Number(v) })),
          { label: `Half walk — ${Math.max(5, Math.round(walk / 2))} ft (a stroll)`, value: Math.max(5, Math.round(walk / 2)) },
        ];
        return (
          <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70" onClick={() => setPatrolSetup(null)}>
            <div className="bg-dnd-panel border border-sky-700 rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-sky-200 font-semibold">{tok.name || 'Token'} — patrol</h2>
                <span className="text-xs text-gray-500">{patrolSetup.points.length} waypoints</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Speed</label>
                  <select
                    value={patrolSetup.speedFt ?? options[0]?.value ?? 30}
                    onChange={(e) => setPatrolSetup((v) => ({ ...v, speedFt: Number(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm text-white"
                  >
                    {options.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-gray-500">or type one</span>
                    <input
                      type="number" min={5} max={500} step={5}
                      value={patrolSetup.speedFt ?? options[0]?.value ?? 30}
                      onChange={(e) => setPatrolSetup((v) => ({ ...v, speedFt: Number(e.target.value) }))}
                      className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center"
                    />
                    <span className="text-[11px] text-gray-500">ft per round</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">At the end of the route</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['loop', 'Loop'], ['pingpong', 'There and back'], ['once', 'Stop']].map(([v, label]) => (
                      <button key={v} type="button"
                        onClick={() => setPatrolSetup((x) => ({ ...x, mode: v }))}
                        className={`py-2 rounded text-xs border ${
                          (patrolSetup.mode || 'loop') === v
                            ? 'bg-sky-800 border-sky-500 text-sky-100'
                            : 'bg-gray-800 border-gray-600 text-gray-300'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  It starts from where the token stands now and walks to the first waypoint.
                  Patrols hold still during combat, and while you have them paused.
                </p>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setPatrolSetup(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm">Cancel</button>
                  <button
                    type="button"
                    onClick={() => {
                      socket.emit('set_token_patrol', {
                        tokenId: patrolSetup.tokenId,
                        waypoints: patrolSetup.points,
                        speedFt: patrolSetup.speedFt ?? options[0]?.value ?? 30,
                        mode: patrolSetup.mode || 'loop',
                        active: true,
                      });
                      setPatrolSetup(null);
                    }}
                    className="flex-1 bg-sky-700 hover:bg-sky-600 py-2 rounded text-sm font-semibold">Start patrolling</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showTreasureExport && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70">
          <div className="bg-dnd-panel border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-dnd-gold font-semibold text-base">Export Treasure</h2>
              <span className="text-xs text-gray-400">{treasureExportSelected.size} of {treasureList.length} selected</span>
            </div>
            <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between text-xs text-gray-300">
              <span>Tick the items you want to include in the export.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTreasureExportSelected(new Set(treasureList.map(it => it.id)))}
                  className="text-[11px] text-emerald-300 hover:text-emerald-200 underline"
                >All</button>
                <button
                  onClick={() => setTreasureExportSelected(new Set())}
                  className="text-[11px] text-gray-400 hover:text-white underline"
                >None</button>
              </div>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-1">
              {treasureList.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-6">No items in the treasure list.</p>
              )}
              {treasureList.map(it => {
                const checked = treasureExportSelected.has(it.id);
                return (
                  <label
                    key={it.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                      checked ? 'bg-emerald-900/30 border border-emerald-700/40' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setTreasureExportSelected(prev => {
                        const next = new Set(prev);
                        next.has(it.id) ? next.delete(it.id) : next.add(it.id);
                        return next;
                      })}
                      className="w-4 h-4 accent-emerald-400 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{it.name || '(unnamed)'}</div>
                      <div className="text-[11px] text-gray-400">
                        {ITEM_TYPE_LABELS[it.item_type] || 'Item'}
                        {it.qty > 1 ? ` ×${it.qty}` : ''}
                        {it.attunement_required ? ' · attunement' : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowTreasureExport(false)}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded"
              >Cancel</button>
              <button
                onClick={() => {
                  const items = treasureList
                    .filter(it => treasureExportSelected.has(it.id))
                    .map(({ id, ...rest }) => rest);
                  if (items.length === 0) return;
                  const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), loot: items }, null, 2);
                  const blob = new Blob([payload], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `treasure-export-${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setShowTreasureExport(false);
                }}
                disabled={treasureExportSelected.size === 0}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded"
              >Export ({treasureExportSelected.size})</button>
            </div>
          </div>
        </div>
      )}

      {/* Combat Picker Modal */}
      {showCombatPicker && (
        <CombatPicker
          tokens={tokens}
          ships={ships}
          selection={combatPickerSelection}
          shipSelection={combatPickerShipSelection}
          mode={combatPickerMode}
          autoSelectedIds={combatPickerAutoIds}
          viewerId={combatPickerViewerId}
          onViewerChange={applyViewerToPicker}
          hasWalls={walls.length > 0 || doors.some((d) => !d.is_open)}
          onToggle={(id) =>
            setCombatPickerSelection((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onToggleShip={(id) =>
            setCombatPickerShipSelection((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onConfirm={handleConfirmCombat}
          onCancel={() => setShowCombatPicker(false)}
        />
      )}

      <ShipBuilder
        open={shipBuilderOpen}
        onClose={() => setShipBuilderOpen(false)}
        socket={socket}
        sessionId={session?.id}
        mapId={session?.map_id ?? null}
      />
    </div>
  );
}

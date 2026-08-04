import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import MapStage, { TOKEN_SIZES, DM_MARKER_ICONS, DM_MARKER_COLORS } from './MapStage.jsx';
import DiceRoller, { DiceRollOverlay } from './DiceRoller.jsx';
import CreatureLibrary from './CreatureLibrary.jsx';
import SpellLibrary from './SpellLibrary.jsx';
import ItemLibrary  from './ItemLibrary.jsx';
import CustomOriginsPanel from './CustomOriginsPanel.jsx';
import ToolPanel from './ToolPanel.jsx';
import StatBlock from './StatBlock.jsx';
import { formatDamageWithMod, formatDamageType } from '../utils/damage.js';
import ActionsReference from './ActionsReference.jsx';
import { wallsToSegments, doorsToSegments, lineBlocked } from '../utils/los.js';
import { registries as pluginRegistries, useRegistryVersion, loadPlugins, unloadPlugin, reloadPlugin } from '../plugins/pluginRegistry.js';
import { CustomClassesProvider } from '../plugins/customClassesProvider.js';

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

const DEFAULT_PANEL_TABS = ['map', 'library', 'terrain', 'spells', 'items', 'origins', 'tokens', 'markers', 'treasure', 'handouts', 'session'];
const PANEL_LABELS = { map: 'Map', library: 'Library', terrain: 'Terrain', spells: 'Spells', items: 'Items', origins: 'Origins', tokens: 'Tokens', markers: 'Markers', treasure: 'Treasure', handouts: 'Handouts', session: 'Session' };
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

const ALL_CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
  'prone', 'restrained', 'stunned', 'unconscious',
];
// 'submerged' is intentionally excluded — toggled via the 🌊 button in TokenRow

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

// One round is 6 seconds of in-game time regardless of how many
// creatures are in it, so elapsed time comes off the ROUND count, not
// the turn count.
const SECONDS_PER_ROUND = 6;
function formatCombatClock(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function CombatTracker({ tokens, combatTurn, onNext, onPrev, onEnd }) {
  const sorted = [...tokens]
    .filter((t) => !t.is_hidden && t.in_combat)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  // Compute A/B/C suffixes for tokens sharing the same base name
  const nameCounts = {};
  for (const t of sorted) {
    const base = t.nickname || t.name;
    nameCounts[base] = (nameCounts[base] || 0) + 1;
  }
  const nameSeenCount = {};
  const displayNames = sorted.map((t) => {
    const base = t.nickname || t.name;
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
      No tokens in combat.
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
        {sorted.map((t, i) => {
          const isCurrent = i === combatTurn % sorted.length;
          return (
            <CombatTokenEntry
              key={t.id}
              token={t}
              isCurrent={isCurrent}
              displayName={displayNames[i]}
              dataCurrent={isCurrent}
            />
          );
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
function PanelTabBar({ tabs, labels, activeTab, onSelect, onReorder }) {
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
          onClick={() => onSelect(t)}
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

function CombatPicker({ tokens, selection, onToggle, onConfirm, onCancel, mode = 'start', autoSelectedIds, viewerId, onViewerChange, hasWalls }) {
  // In add-mode, hide tokens already in combat (they're not candidates).
  const visible = tokens.filter((t) => {
    if (t.is_hidden) return false;
    if (mode === 'add' && t.in_combat) return false;
    return true;
  });
  const isAdd = mode === 'add';
  const title = isAdd ? 'Add to Combat' : 'Start Combat';
  const confirmLabel = isAdd
    ? `Add (${selection.size})`
    : `Start (${selection.size})`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-dnd-panel border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-dnd-gold font-semibold text-base flex items-center gap-1.5"><SwordIcon />{title}</h2>
          <span className="text-xs text-gray-400">{selection.size} selected</span>
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
          {visible.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-sm">
              {isAdd ? 'No tokens left to add.' : 'No visible tokens on map.'}
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
            disabled={selection.size === 0}
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
function TokenContextMenu({ menu, tokens, maps, currentMapId, spawnPointsByMapId, onClose, onSendToMap }) {
  const token = tokens.find((t) => t.id === menu.tokenId) || null;
  // Two-level submenu: hovering "Send to map" opens the map list;
  // hovering a map (when it has named spawn points) opens its
  // sub-submenu of points. Track which map's sub-sub is open so only
  // one renders at a time.
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [hoverMapId, setHoverMapId] = useState(null);
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

  // Clamp to viewport so the menu doesn't render off-screen when the
  // GM right-clicks near the edge of the canvas.
  const left = Math.min(menu.x, window.innerWidth - 240);
  const top  = Math.min(menu.y, window.innerHeight - 240);

  return (
    <div
      id="token-context-menu-root"
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-sm text-gray-100 min-w-[200px] py-1"
      style={{ left, top }}
    >
      <div className="px-3 py-2 border-b border-gray-800 text-gray-400 text-xs">
        {token?.name || 'Token'}
      </div>
      <div
        className="relative px-3 py-2 hover:bg-gray-800 cursor-pointer flex items-center justify-between"
        onMouseEnter={() => setSubmenuOpen(true)}
        onMouseLeave={() => setSubmenuOpen(false)}
      >
        <span>Send to map</span>
        <span className="text-gray-500">▸</span>
        {submenuOpen && (
          <div
            className="absolute left-full top-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[200px] py-1"
          >
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
                      <div className="absolute left-full top-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[180px] py-1">
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
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

// Right-click menu for a placed terrain piece. Stays within the
// existing context-menu pattern used by tokens — `fixed` positioned at
// the click's viewport coords, dismissed on outside-click or Escape.
function TerrainContextMenu({ menu, terrain, onClose, onDelete, onToggleReveal, onResize, onRotate }) {
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
  if (!terrain) return null;
  const left = Math.min(menu.x, window.innerWidth - 220);
  const top  = Math.min(menu.y, window.innerHeight - 240);
  return (
    <div
      id="terrain-context-menu-root"
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-sm text-gray-100 min-w-[200px] py-1"
      style={{ left, top }}
    >
      <div className="px-3 py-2 border-b border-gray-800 text-gray-400 text-xs">
        {terrain.lib_name || 'Terrain'}
      </div>
      <button
        onClick={() => onResize(terrain.id, 0.85)}
        className="w-full text-left px-3 py-2 hover:bg-gray-800"
      >Shrink ×0.85</button>
      <button
        onClick={() => onResize(terrain.id, 1.18)}
        className="w-full text-left px-3 py-2 hover:bg-gray-800"
      >Grow ×1.18</button>
      <button
        onClick={() => onRotate(terrain.id, 90)}
        className="w-full text-left px-3 py-2 hover:bg-gray-800"
      >Rotate 90°</button>
      {terrain.hide_until_revealed && (
        <button
          onClick={() => onToggleReveal(terrain.id, !terrain.is_revealed)}
          className="w-full text-left px-3 py-2 hover:bg-gray-800"
        >{terrain.is_revealed ? 'Hide from players' : 'Reveal to players'}</button>
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
    fd.append('image', file);
    fd.append('name', name.trim());
    fd.append('default_w', String(defaultW));
    fd.append('default_h', String(defaultH));
    fd.append('hide_until_revealed', String(hideUntilRevealed));
    try {
      const r = await fetch('/api/terrain/library', { method: 'POST', body: fd });
      if (r.ok) onSaved(await r.json());
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
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
          <p className="text-[11px] text-gray-500 leading-snug">
            Walls are drawn manually after upload — open the piece's <em>Edit</em> from the library to paint blocking polygons over the artwork.
          </p>
        </div>
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
          custom_walls: customWalls.length ? customWalls : null,
        }),
      });
      if (r.ok) onSaved(await r.json());
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
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
  // Default map newly-spawned player tokens land on. Stored in
  // sessions.spawn_map_id; null means "use the session's current map_id"
  // (legacy behaviour). Set via the picker in the Map tab and surfaced
  // through window.__tabletopForge.dm so the split-the-party plugin can
  // read it without scraping React state.
  const [spawnMapId, setSpawnMapId] = useState(null);
  const [diceRolls, setDiceRolls] = useState([]);
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
  const [sendingItemId, setSendingItemId] = useState(null);
  const [treasureSearch, setTreasureSearch] = useState('');
  const [treasureCollapsedGroups, setTreasureCollapsedGroups] = useState(() => new Set());
  // Which session's chest is currently loaded. Kept in state rather than
  // a ref so the save effect below can't fire before the restore has
  // actually landed — a ref would already read as "hydrated" during the
  // same commit and write the initial [] over the stored chest.
  const [treasureHydratedFor, setTreasureHydratedFor] = useState(null);
  useEffect(() => {
    const sid = session?.id;
    if (sid == null || treasureHydratedFor === sid) return;
    try {
      const raw = localStorage.getItem(`${TREASURE_CHEST_KEY}:${sid}`);
      const parsed = raw ? JSON.parse(raw) : null;
      setTreasureList(Array.isArray(parsed) ? parsed : []);
    } catch { setTreasureList([]); }
    setTreasureHydratedFor(sid);
  }, [session?.id, treasureHydratedFor]);
  useEffect(() => {
    const sid = session?.id;
    if (sid == null || treasureHydratedFor !== sid) return;
    try {
      localStorage.setItem(`${TREASURE_CHEST_KEY}:${sid}`, JSON.stringify(treasureList));
    } catch { /* quota / private mode — chest just stays in-memory */ }
  }, [treasureList, treasureHydratedFor, session?.id]);
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
  const [gridColor, setGridColor] = useState('rgba(0,0,0,0.35)');
  const [gridThickness, setGridThickness] = useState(0.7);
  const [gridHex, setGridHex] = useState('#000000');
  const [gridOpacity, setGridOpacity] = useState(0.35);
  const [gridSize, setGridSize] = useState(50);
  const [mapUploading, setMapUploading] = useState(false);
  const [dd2vttImporting, setDd2vttImporting] = useState(false);
  const [combatActive, setCombatActive] = useState(false);
  const [combatTurn, setCombatTurn] = useState(0);
  const [showCombatPicker, setShowCombatPicker] = useState(false);
  const [combatPickerSelection, setCombatPickerSelection] = useState(new Set());
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
  const sessionRef = useRef(session);
  const spawnMapIdRef = useRef(spawnMapId);
  useEffect(() => { mapsRef.current = maps; }, [maps]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  // Tell the server which map the GM is currently viewing so it can
  // route per-map ambient back to us when we switch maps mid-session.
  useEffect(() => {
    const id = session?.map_id ?? null;
    if (id != null) socket.emit('set_player_active_map_id', { mapId: id });
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
  const [whisperToast, setWhisperToast] = useState(null);
  const [showWhisperBar, setShowWhisperBar] = useState(false);
  const [whisperBarTarget, setWhisperBarTarget] = useState(null);
  const [lightColor, setLightColor] = useState('#fbbf24');
  const [lightShape, setLightShape] = useState('circle');
  const [editingLight, setEditingLight] = useState(null);
  const [currencyToSend, setCurrencyToSend] = useState({ gp: '', sp: '', cp: '' });
  const [panelWidth, setPanelWidth] = useState(320);
  const panelDragRef = useRef(null);
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [lights, setLights] = useState([]);
  const [magicalDarkness, setMagicalDarkness] = useState([]);
  const [spawnPoint, setSpawnPoint] = useState({ col: 0, row: 0 });
  const [spellTemplates, setSpellTemplates] = useState([]);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
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
  // ── Terrain state ────────────────────────────────────────────────
  // `terrain` is the placed pieces on the current map (broadcast +
  // hydrated from session_joined). `terrainLibrary` is the global
  // catalogue of reusable pieces (fetched via REST). `pendingTerrain`
  // holds a library piece while the GM is in click-to-place mode.
  const [terrain, setTerrain] = useState([]);
  const [terrainLibrary, setTerrainLibrary] = useState([]);
  const [doorSprites, setDoorSprites] = useState([]);
  const [pendingTerrain, setPendingTerrain] = useState(null);
  const [selectedTerrainId, setSelectedTerrainId] = useState(null);
  const [terrainContextMenu, setTerrainContextMenu] = useState(null);
  const [editingTerrainPiece, setEditingTerrainPiece] = useState(null); // library row being edited
  const [showTerrainUpload, setShowTerrainUpload] = useState(false);
  const [placingMarkerType, setPlacingMarkerType] = useState(null); // type string when placing
  const [editingMarker, setEditingMarker] = useState(null);         // marker object being edited

  // Remote measurements from other users
  const [remoteMeasurements, setRemoteMeasurements] = useState([]);

  async function handleViewStatBlock(creatureId) {
    try {
      const res = await fetch(`/api/creatures/${creatureId}`);
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
    if (!code || !pass) { navigate('/'); return; }

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setReconnectAttempt(0);
      // Re-emit on every connect, including after a reconnect — the
      // server treats join_session as idempotent and re-hydrates state.
      socket.emit('join_session', { sessionCode: code, role: 'dm', name: 'Game Master', dmPassword: pass });
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
      setSession(state.session);
      loadMaps(state.session.id);
      setTokens(state.tokens);
      setWalls(state.walls || []);
      setDoors(state.doors || []);
      setLights(state.lights || []);
      setMagicalDarkness(state.magicalDarkness || []);
      setSpellTemplates(state.spellTemplates || []);
      setDmMarkers(state.dmMarkers || []);
      setTerrain(state.terrain || []);
      // Library is global, fetched once on join. Re-fetch on
      // upload/edit/delete is handled inline by those actions.
      fetch('/api/terrain/library')
        .then((r) => r.ok ? r.json() : [])
        .then((rows) => setTerrainLibrary(rows || []))
        .catch(() => {});
      fetch('/api/door-sprites')
        .then((r) => r.ok ? r.json() : [])
        .then((rows) => setDoorSprites(rows || []))
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
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setFowColor(state.session.fow_color || '#000000');
      setAmbientLight(state.session.ambient_light || 'bright');
      setActiveSrdEdition(state.session.active_srd_edition || 'both');
      setGridSize(state.session.grid_size || 50);
      const gc = state.session.grid_color || 'rgba(0,0,0,0.35)';
      const gt = state.session.grid_thickness ?? 0.7;
      setGridColor(gc);
      setGridThickness(gt);
      const parsed = parseRgba(gc);
      setGridHex(parsed.hex);
      setGridOpacity(parsed.opacity);
      setCombatActive(state.session.combat_active || false);
      setCombatTurn(state.session.combat_turn || 0);
      setTokenNameFontSize(state.session.token_name_font_size ?? 45);
      setSpawnMapId(state.session.spawn_map_id ?? null);
      if (uc) setUserColors(uc);
      if (u) setUsers(u);
      if (cl) setConnectionLog(cl);
    });

    socket.on('error', ({ message }) => setError(message));

    socket.on('token_moved', ({ tokenId, gridCol, gridRow }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, grid_col: gridCol, grid_row: gridRow } : t));
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

    socket.on('token_added', ({ token }) => {
      setTokens((prev) => [...prev, token]);
    });

    socket.on('token_refreshed', ({ token }) => {
      setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, ...token } : t));
    });

    socket.on('token_removed', ({ tokenId }) => {
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      if (selectedToken === tokenId) setSelectedToken(null);
    });

    socket.on('terrain_added',   ({ terrain: t }) => setTerrain(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]));
    socket.on('terrain_updated', ({ terrain: t }) => setTerrain(prev => prev.map(x => x.id === t.id ? t : x)));
    socket.on('terrain_removed', ({ id })          => setTerrain(prev => prev.filter(x => x.id !== id)));

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

    socket.on('token_size_changed', ({ tokenId, size }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, size } : t));
    });

    socket.on('token_name_changed', ({ tokenId, name: tokenName }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, name: tokenName } : t));
    });

    socket.on('token_nickname_changed', ({ tokenId, nickname }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, nickname } : t));
    });

    socket.on('map_changed', ({ map, walls: newWalls, doors: newDoors, lights: newLights, tokens: newTokens, magicalDarkness: newDarkness, spawnPoint: newSpawn, spawnPoints: newSpawnPoints, terrain: newTerrain }) => {
      setTerrain(newTerrain || []);
      setSelectedTerrainId(null);
      setSession((prev) => map ? ({
        ...prev, map_id: map.id,
        map_image: map.image_path, map_name: map.name,
        map_width: map.width, map_height: map.height,
      }) : ({ ...prev, map_id: null, map_image: null, map_name: null }));
      setWalls(newWalls  || []);
      setDoors(newDoors  || []);
      setLights(newLights || []);
      setTokens(newTokens || []);
      setMagicalDarkness(newDarkness || []);
      setSpawnPoint(newSpawn || { col: 0, row: 0 });
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

    socket.on('fow_changed',           ({ enabled })            => setFowEnabled(enabled));
    socket.on('fow_blur_changed',      ({ blur })               => setFowBlur(blur));
    socket.on('fow_color_changed',     ({ color })              => setFowColor(color || '#000000'));
    socket.on('ambient_light_changed', ({ ambientLight: al })   => setAmbientLight(al));
    socket.on('active_srd_edition_changed', ({ edition })       => setActiveSrdEdition(edition || 'both'));

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

    socket.on('combat_changed', ({ active, currentTurn, tokenIds }) => {
      setCombatActive(active);
      setCombatTurn(currentTurn);
      if (!active) {
        setTokens((prev) => prev.map((t) => ({ ...t, in_combat: false })));
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

    socket.on('map_ping', ({ id, x, y, mapId }) => {
      if (mapId != null && mapId !== sessionRef.current?.map_id) return;
      const ts = Date.now();
      setActivePings(prev => [...prev, { id, x, y, ts }]);
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

    socket.on('dice_rolled', (data) => {
      const id = ++rollIdRef.current;
      setDiceRolls((prev) => [...prev, { ...data, id }]);
      setTimeout(() => setDiceRolls((prev) => prev.filter((r) => r.id !== id)), 5000);
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

  function handleSizeChange(tokenId, size) {
    socket.emit('update_token_size', { tokenId, size });
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

  async function handleDoorSpriteDelete(id) {
    try {
      await fetch(`/api/door-sprites/${id}`, { method: 'DELETE' });
      setDoorSprites((prev) => prev.filter((s) => s.id !== id));
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
    socket.emit('toggle_fow', { sessionId: session.id });
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
    setPlacingCreature(creature);
    setPanelOpen(false);
    setPanelTab('tokens');
  }

  function handleMapClick(col, row) {
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
    socket.emit('add_token', {
      sessionId: session.id,
      mapId: session.map_id || null,
      creatureId: placingCreature.id,
      gridCol: col,
      gridRow: row,
    });
    setPlacingCreature(null);
    setPanelOpen(true);
    setPanelTab('tokens');
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

  function handleGridSizeChange(newSize) {
    if (!session) return;
    setGridSize(newSize);
    socket.emit('change_grid_size', { sessionId: session.id, gridSize: newSize });
  }

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
    const sz = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
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
    setCombatPickerAutoIds(new Set());
    setCombatPickerViewerId(null);
    setCombatPickerMode('add');
    setShowCombatPicker(true);
  }

  function handleConfirmCombat() {
    if (!session) return;
    const tokenIds = [...combatPickerSelection];
    if (combatPickerMode === 'add') {
      if (tokenIds.length > 0) {
        socket.emit('add_tokens_to_combat', { sessionId: session.id, tokenIds });
      }
    } else {
      socket.emit('set_combat', { sessionId: session.id, active: true, tokenIds });
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

  async function handleDD2VTTImport(e) {
    const file = e.target.files[0];
    if (!file || !session) return;
    setDd2vttImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('session_id', session.id);
      fd.append('name', file.name.replace(/\.dd2vtt$/i, ''));
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

  const mapUrl = session.map_image ? `/uploads/${session.map_image}` : null;
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

  const combatSorted = [...tokens]
    .filter((t) => !t.is_hidden && t.in_combat)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
  const currentCombatTokenId = combatActive && combatSorted.length > 0
    ? combatSorted[combatTurn % combatSorted.length]?.id ?? null
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
        {/* Combat tracker strip */}
        {combatActive && (
          <div className="shrink-0 flex items-end gap-2 bg-gray-900/90 border-b border-yellow-600/40 px-3 pb-1.5 z-20" style={{ height: 76 }}>
            <span className="text-yellow-400 shrink-0 mb-1.5"><SwordIcon className="w-4 h-4" /></span>
            <CombatTracker
              tokens={tokens}
              combatTurn={combatTurn}
              onNext={handleNextTurn}
              onPrev={handlePrevTurn}
              onEnd={handleEndCombat}
            />
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
            mapUrl={mapUrl}
            mapId={session?.map_id ?? null}
            mapWidth={session.map_width}
            mapHeight={session.map_height}
            gridSize={gridSize}
            fitToMap={true}
            tokens={visibleTokens}
            isPlayer={false}
            onTokenMove={handleTokenMove}
            selectedTokenId={selectedToken}
            onTokenSelect={setSelectedToken}
            placingToken={!!(placingCreature || placingMarkerType)}
            onMapClick={(placingCreature || placingMarkerType) ? handleMapClick : null}
            activeTool={activeTool}
            gridColor={gridColor}
            gridThickness={gridThickness}
            walls={walls}
            doors={doors}
            lights={lights}
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
            selectedTemplateId={editingTemplateId}
            onTemplatePlace={(tpl) => socket.emit('place_template', tpl)}
            onTemplateUpdate={(payload) => socket.emit('update_template', payload)}
            onTemplateDelete={(id) => { socket.emit('delete_template', { id }); setEditingTemplateId(prev => prev === id ? null : prev); }}
            onTemplateSelect={(id) => setEditingTemplateId(id)}
            remoteMeasurements={remoteMeasurements}
            tokenNameFontSize={tokenNameFontSize}
            onTokenContextMenu={(tokenId, x, y) => setTokenContextMenu({ tokenId, x, y })}
            terrain={terrain}
            pendingTerrain={pendingTerrain}
            selectedTerrainId={selectedTerrainId}
            onTerrainSelect={setSelectedTerrainId}
            onTerrainPlace={(piece, col, row) => {
              socket.emit('place_terrain', {
                libraryId: piece.id,
                gridCol: col,
                gridRow: row,
                width: piece.default_w,
                height: piece.default_h,
              });
              setPendingTerrain(null);
            }}
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
            onPingMap={(x, y) => socket.emit('dm_ping', { x, y, mapId: session?.map_id ?? null })}
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
              currentMapId={session?.map_id}
              spawnPointsByMapId={allSpawnPoints}
              onClose={() => setTokenContextMenu(null)}
              onSendToMap={(tokenId, mapId, spawnPointId) => {
                socket.emit('dm_send_token_to_map', { tokenId, mapId, spawnPointId });
                setTokenContextMenu(null);
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

          {placingCreature && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dnd-gold text-gray-900 px-4 py-2 rounded-xl font-semibold text-sm shadow-lg z-30">
              Click on the map to place <strong>{placingCreature.name}</strong>
              <button onClick={() => setPlacingCreature(null)} className="ml-3 opacity-70 hover:opacity-100"><XIcon /></button>
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
              onDelete={(id) => { socket.emit('remove_terrain', { id }); setTerrainContextMenu(null); }}
              onToggleReveal={(id, isRevealed) => { socket.emit('reveal_terrain', { id, isRevealed }); setTerrainContextMenu(null); }}
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

          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
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
            <div className="absolute top-14 right-4 z-40 bg-dnd-panel border border-gray-600 rounded-xl p-4 w-80 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-dnd-gold font-semibold">Dice Roller</h3>
                <button onClick={() => setShowDice(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
              </div>
              <DiceRoller rolls={diceRolls} />
            </div>
          )}

          {showWhisperBar && (() => {
            const playerUsers = users.filter(u => u.role !== 'dm');
            const target = whisperBarTarget && playerUsers.some(u => u.name === whisperBarTarget)
              ? whisperBarTarget
              : (playerUsers[0]?.name || null);
            return (
              <div className="absolute top-14 right-4 z-40 bg-dnd-panel border border-purple-700/60 rounded-xl p-4 w-80 shadow-2xl space-y-3">
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
              <div className="absolute top-14 right-4 z-40 bg-dnd-panel border border-gray-600 rounded-xl p-4 w-80 shadow-2xl">
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
          className="w-1.5 bg-gray-700 hover:bg-dnd-gold/60 cursor-col-resize shrink-0 transition-colors"
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
        <div className="bg-dnd-panel border-l border-gray-700 flex flex-col shrink-0 h-full" style={{ width: panelWidth }}>
          <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
            <PanelTabBar
              tabs={panelTabs}
              labels={PANEL_LABELS}
              activeTab={panelTab}
              onSelect={setPanelTab}
              onReorder={reorderPanelTab}
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
                      {dd2vttImporting ? 'Importing walls, doors & lights…' : 'Imports map + walls + doors + lights'}
                    </span>
                    <input
                      type="file"
                      accept=".dd2vtt"
                      className="hidden"
                      onChange={handleDD2VTTImport}
                      disabled={dd2vttImporting}
                    />
                  </label>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Grid Size: {gridSize}px (5ft per square)</h3>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    step={5}
                    value={Math.min(gridSize, 300)}
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
                          {doorSprites.map((s) => (
                            <div key={s.id} className="relative group">
                              <div className="aspect-square bg-gray-900 rounded border border-gray-700 flex items-center justify-center overflow-hidden">
                                <img src={`/uploads/${s.image_path}`} alt={s.name} className="max-w-full max-h-full object-contain" />
                              </div>
                              <button
                                onClick={() => handleDoorSpriteDelete(s.id)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-800 hover:bg-red-700 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete sprite"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500 italic">Upload a top-down door image to overlay on doors.</p>
                      )}
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
                            const spr = doorSprites.find((s) => s.image_path === d.sprite_path);
                            const isFireplace = spr && /fire/i.test(spr.name || '');
                            const lightRadius = Number(d.light_radius) || 0;
                            const lightColor = d.light_color || '#ff7a2a';
                            const lightSide = d.light_side === -1 ? -1 : 1;
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

                                {/* Fireplace light — only for fire sprites. Sheds
                                    directional glow out the fire side. */}
                                {isFireplace && (
                                  <div className="border-t border-gray-700/60 pt-1.5 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-orange-300 shrink-0">🔥 Light</span>
                                      <input
                                        type="range" min={0} max={60} step={5}
                                        value={lightRadius}
                                        onChange={(e) => handleDoorLightSet(d.id, { radius: Number(e.target.value), color: lightColor, side: lightSide })}
                                        className="flex-1 min-w-0 accent-orange-500"
                                        title="Light radius (feet). 0 = off."
                                      />
                                      <span className="text-[11px] text-gray-400 font-mono w-10 text-right shrink-0">
                                        {lightRadius > 0 ? `${lightRadius}ft` : 'off'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={/^#[0-9a-fA-F]{6}$/.test(lightColor) ? lightColor : '#ff7a2a'}
                                        onChange={(e) => handleDoorLightSet(d.id, { radius: lightRadius, color: e.target.value, side: lightSide })}
                                        disabled={lightRadius <= 0}
                                        className="w-8 h-6 rounded bg-transparent border border-gray-700 p-0 shrink-0 disabled:opacity-40"
                                        title="Fire colour"
                                      />
                                      <button
                                        onClick={() => handleDoorLightSet(d.id, { radius: lightRadius, color: lightColor, side: -lightSide })}
                                        disabled={lightRadius <= 0}
                                        className="text-[11px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40"
                                        title="Flip which side the fire faces"
                                      >Flip fire side</button>
                                    </div>
                                  </div>
                                )}
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
                                    <img src={`/uploads/${m.image_path}`} alt={m.name} className="w-full h-full object-cover" />
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

                <div className="grid grid-cols-2 gap-2">
                  {terrainLibrary.length === 0 ? (
                    <div className="col-span-2 text-gray-500 text-xs text-center py-6">
                      No terrain pieces yet.
                    </div>
                  ) : (
                    terrainLibrary.map((p) => (
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
              function sendItemToPlayer(itemId, creatureId) {
                const item = treasureList.find(it => it.id === itemId);
                if (!item) return;
                const { id, ...rest } = item;
                socket.emit('send_treasure', { creatureId, items: [rest] });
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
                          {!groupCollapsed && group.items.map(item => {
                            const isWeapon = item.item_type === 'weapon';
                            return (
                              <div key={item.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
                                {/* Row 1: type / name / qty / send / remove */}
                                <div className="flex gap-1.5">
                                  <select
                                    className="w-24 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-gray-300 focus:outline-none focus:border-dnd-gold shrink-0"
                                    value={item.item_type || 'item'}
                                    onChange={e => updateTreasureItem(item.id, 'item_type', e.target.value)}
                                  >
                                    <option value="item">Item</option>
                                    <option value="weapon">Weapon</option>
                                    <option value="potion">Potion</option>
                                    <option value="magic_item">Magic Item</option>
                                    <option value="wondrous_item">Wondrous Item</option>
                                  </select>
                                  <input
                                    className={`flex-1 ${inputCls}`}
                                    placeholder="Name"
                                    value={item.name}
                                    onChange={e => updateTreasureItem(item.id, 'name', e.target.value)}
                                  />
                                  <input
                                    type="number" min={1}
                                    className={`w-12 text-center ${inputCls}`}
                                    title="Qty"
                                    value={item.qty}
                                    onChange={e => updateTreasureItem(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                  />
                                  <button
                                    title="Send this item to a player"
                                    onClick={() => setSendingItemId(prev => prev === item.id ? null : item.id)}
                                    className={`px-1.5 shrink-0 rounded text-sm transition-colors ${sendingItemId === item.id ? 'bg-yellow-600 text-yellow-100' : 'text-yellow-400 hover:text-yellow-200'}`}
                                  >📤</button>
                                  <button onClick={() => removeTreasureItem(item.id)} className="text-red-400 hover:text-red-300 px-1 shrink-0 flex items-center"><XIcon /></button>
                                </div>

                                {/* Per-item player picker */}
                                {sendingItemId === item.id && (
                                  <div className="flex flex-col gap-1 pl-1">
                                    {pcTokens.length === 0 ? (
                                      <p className="text-xs text-gray-500 italic">No players on map.</p>
                                    ) : pcTokens.map(tok => (
                                      <button
                                        key={tok.id}
                                        onClick={() => { sendItemToPlayer(item.id, tok.creature_id); setSendingItemId(null); }}
                                        className="flex items-center gap-2 px-2 py-1 bg-yellow-900/40 hover:bg-yellow-900/70 border border-yellow-700/50 hover:border-yellow-500 rounded text-left transition-colors"
                                      >
                                        <span className="text-xs text-yellow-400">gp</span>
                                        <span className="text-xs text-yellow-200">{tok.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Weapon fields */}
                                {isWeapon && (
                                  <div className="space-y-2 border-l-2 border-dnd-gold/40 pl-3">
                                    {/* Range + Atk stat + Misc bonus */}
                                    <div className="flex gap-1.5">
                                      <div className="flex-1">
                                        <label className={labelCls}>Range</label>
                                        <input className={`w-full ${inputCls}`} placeholder="5ft or 60/120ft"
                                          value={item.weapon_range || ''}
                                          onChange={e => updateTreasureItem(item.id, 'weapon_range', e.target.value)} />
                                      </div>
                                      <div className="w-20">
                                        <label className={labelCls}>Atk Stat</label>
                                        <select className={`w-full ${inputCls}`}
                                          value={item.attack_stat || 'STR'}
                                          onChange={e => updateTreasureItem(item.id, 'attack_stat', e.target.value)}>
                                          {['STR','DEX','CON','INT','WIS','CHA'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                      </div>
                                      <div className="w-14">
                                        <label className={labelCls}>Misc+</label>
                                        <input type="number" className={`w-full text-center ${inputCls}`}
                                          placeholder="0"
                                          value={item.attack_bonus_misc ?? 0}
                                          onChange={e => updateTreasureItem(item.id, 'attack_bonus_misc', parseInt(e.target.value) || 0)} />
                                      </div>
                                    </div>

                                    {/* Damage entries */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className={labelCls}>Damage</label>
                                        <button type="button" onClick={() => addDmgEntry(item.id)} className="text-xs text-indigo-400 hover:text-indigo-200">+ Add</button>
                                      </div>
                                      <div className="space-y-1">
                                        {getDmgEntries(item).map((entry, ei) => (
                                          <div key={ei} className="flex gap-1.5 items-center">
                                            <input className={`w-20 ${inputCls}`} placeholder="1d8+3"
                                              value={entry.damage}
                                              onChange={e => updateDmgEntry(item.id, ei, 'damage', e.target.value)} />
                                            <input className={`flex-1 ${inputCls}`} placeholder="Slashing"
                                              value={entry.damage_type}
                                              onChange={e => updateDmgEntry(item.id, ei, 'damage_type', e.target.value)} />
                                            {getDmgEntries(item).length > 1 && (
                                              <button type="button" onClick={() => removeDmgEntry(item.id, ei)} className="text-red-400 hover:text-red-300 px-1 shrink-0 flex items-center"><XIcon /></button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Properties */}
                                    <div>
                                      <label className={labelCls}>Properties</label>
                                      <input className={`w-full ${inputCls}`} placeholder="Versatile, Finesse…"
                                        value={item.properties || ''}
                                        onChange={e => updateTreasureItem(item.id, 'properties', e.target.value)} />
                                    </div>

                                    {/* Mastery */}
                                    <div>
                                      <label className={labelCls}>Mastery</label>
                                      <select
                                        className={`w-full ${inputCls}`}
                                        value={item.mastery || ''}
                                        onChange={e => updateTreasureItem(item.id, 'mastery', e.target.value)}
                                      >
                                        <option value="">None</option>
                                        {['Cleave','Graze','Nick','Push','Sap','Slow','Topple','Vex'].map(m => (
                                          <option key={m} value={m}>{m}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* Attunement — weapons, magic items and
                                    wondrous items. Not potions. */}
                                {ATTUNABLE_ITEM_TYPES.has(item.item_type) && (
                                  <label className="flex items-center gap-1.5 text-xs text-gray-300">
                                    <span className="text-gray-400">Attunement:</span>
                                    <select
                                      className={inputCls}
                                      value={item.attunement_required ? 'yes' : 'no'}
                                      onChange={e => updateTreasureItem(item.id, 'attunement_required', e.target.value === 'yes')}
                                    >
                                      <option value="no">Not required</option>
                                      <option value="yes">Requires attunement</option>
                                    </select>
                                  </label>
                                )}

                                {/* Equipped + Sheds light — mirror the
                                    inventory form so a weapon arrives with
                                    the same toggles available. */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.equipped || false}
                                      onChange={e => updateTreasureItem(item.id, 'equipped', e.target.checked)}
                                      className="accent-dnd-gold"
                                    />
                                    Equipped
                                  </label>
                                  <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.sheds_light || false}
                                      onChange={e => updateTreasureItem(item.id, 'sheds_light', e.target.checked)}
                                      className="accent-yellow-400"
                                    />
                                    Sheds Light
                                  </label>
                                </div>
                                {item.sheds_light && (
                                  <div className="flex items-center gap-3 flex-wrap pl-1">
                                    <label className="flex items-center gap-1.5 text-xs text-gray-300">
                                      <span className="text-yellow-300">Bright:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={5}
                                        className={`w-16 text-center ${inputCls}`}
                                        value={item.bright_ft ?? 20}
                                        onChange={e => updateTreasureItem(item.id, 'bright_ft', Math.max(0, parseInt(e.target.value) || 0))}
                                      />
                                      <span className="text-gray-500">ft</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-gray-300">
                                      <span className="text-yellow-600">Dim:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={5}
                                        className={`w-16 text-center ${inputCls}`}
                                        value={item.dim_ft ?? 40}
                                        onChange={e => updateTreasureItem(item.id, 'dim_ft', Math.max(0, parseInt(e.target.value) || 0))}
                                      />
                                      <span className="text-gray-500">ft</span>
                                    </label>
                                  </div>
                                )}

                                {/* Weight */}
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-400 shrink-0">Weight</label>
                                  <input
                                    className={`w-24 ${inputCls}`}
                                    placeholder="e.g. 3 lb"
                                    value={item.weight || ''}
                                    onChange={e => updateTreasureItem(item.id, 'weight', e.target.value)}
                                  />
                                </div>

                                {/* Description */}
                                <input
                                  className={`w-full text-xs ${inputCls}`}
                                  placeholder="Description (optional)"
                                  value={item.desc || ''}
                                  onChange={e => updateTreasureItem(item.id, 'desc', e.target.value)}
                                />
                              </div>
                            );
                          })}
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
                <CollapsibleSection id="session_info" title="Session Info">
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Session Name</div>
                      <div className="text-white font-semibold">{session.name}</div>
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

      <DiceRollOverlay rolls={diceRolls} />

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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingTemplateId(null)}>
            <div
              className="bg-dnd-panel border border-gray-700 rounded-xl w-80 shadow-2xl p-4 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-dnd-gold font-semibold">Edit Template</h3>
                <button onClick={() => setEditingTemplateId(null)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
              </div>
              <div className="text-xs text-gray-400 capitalize">{tpl.type}</div>
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingLight(null)}>
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
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 print-backdrop"
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
                  return (
                    <>
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
                        <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium">
                              {item.equipped ? <strong>{item.name}</strong> : item.name}
                              {item.equipped && <span className="text-xs text-dnd-gold ml-1">(equipped)</span>}
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
                            <span className="text-xs text-gray-400">{available}/{slotInfo.total} slots — {Array.from({ length: slotInfo.total }).map((_, i) => <span key={i}>{i < (slotInfo.used || 0) ? '☒' : '☐'}</span>)}</span>
                          )}
                        </div>
                        {['combat','utility'].map((type) => {
                          const group = lvlSpells.filter((s) => s.type === type);
                          if (!group.length) return null;
                          return (
                            <div key={type} className="pl-2 mb-1">
                              <span className={`text-xs font-semibold ${type === 'combat' ? 'text-red-400' : 'text-blue-400'}`}>{type === 'combat' ? 'Combat' : 'Utility'}:</span>
                              {group.map((s, i) => <span key={s.id ?? i} className="text-xs text-gray-300 ml-1">{s.name}{s.description ? ` — ${s.description}` : ''}{i < group.length - 1 ? ', ' : ''}</span>)}
                            </div>
                          );
                        })}
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
                  const combatSpells = spells.filter(s => s.type === 'combat');
                  const STAT_KEYS = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };
                  function atkBonus(item) {
                    const statKey = STAT_KEYS[item.attack_stat] || 'strength';
                    const statVal = statBlockCreature[statKey] || 10;
                    const mod = Math.floor((statVal - 10) / 2);
                    const pb = statBlockCreature.proficiency_bonus || 2;
                    const misc = item.attack_bonus_misc || 0;
                    const total = mod + pb + misc;
                    return (total >= 0 ? '+' : '') + total;
                  }
                  function dmgMod(item) {
                    const statKey = STAT_KEYS[item.attack_stat] || 'strength';
                    const statVal = statBlockCreature[statKey] || 10;
                    return Math.floor((statVal - 10) / 2);
                  }
                  function dmgStr(w) {
                    const entries = Array.isArray(w.damage_entries) && w.damage_entries.length
                      ? w.damage_entries
                      : (w.damage ? [{ damage: w.damage, damage_type: w.damage_type || '' }] : []);
                    const filtered = entries.filter(e => e.damage);
                    if (!filtered.length) return '—';
                    const dm = dmgMod(w);
                    return filtered.map(e => `${formatDamageWithMod(e.damage, dm)}${e.damage_type ? ` ${formatDamageType(e.damage_type)}` : ''}`).join(' + ');
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
                                {weapons.map((w, idx) => (
                                  <tr key={idx} className={w.equipped ? 'text-white' : 'text-gray-400'}>
                                    <td className="py-1.5 pr-2 font-medium">{w.name || '—'}{w.equipped && <span className="text-dnd-gold ml-1">★</span>}</td>
                                    <td className="py-1.5 pr-2 text-center font-mono text-green-400">{atkBonus(w)}</td>
                                    <td className="py-1.5 pr-2 font-mono">{dmgStr(w)}</td>
                                    <td className="py-1.5">{w.weapon_range || '—'}</td>
                                  </tr>
                                ))}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingMarker(null)}>
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
      {showTreasureExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
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
          selection={combatPickerSelection}
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
          onConfirm={handleConfirmCombat}
          onCancel={() => setShowCombatPicker(false)}
        />
      )}
    </div>
  );
}

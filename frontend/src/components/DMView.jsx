import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import MapStage, { TOKEN_SIZES, DM_MARKER_ICONS, DM_MARKER_COLORS } from './MapStage.jsx';
import DiceRoller, { DiceRollOverlay } from './DiceRoller.jsx';
import CreatureLibrary from './CreatureLibrary.jsx';
import ToolPanel from './ToolPanel.jsx';
import StatBlock from './StatBlock.jsx';
import ActionsReference from './ActionsReference.jsx';

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

const PANEL_TABS = ['map', 'library', 'tokens', 'markers', 'treasure', 'handouts', 'session'];
const PANEL_LABELS = { map: 'Map', library: 'Library', tokens: 'Tokens', markers: 'Markers', treasure: 'Treasure', handouts: 'Handouts', session: 'Session' };

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

function CombatTracker({ tokens, combatTurn, onNext, onEnd }) {
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

  return (
    <div className="flex items-end gap-2 min-w-0 flex-1">
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
        <button
          onClick={onNext}
          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded text-xs font-semibold"
        >
          Next →
        </button>
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

function CombatPicker({ tokens, selection, onToggle, onConfirm, onCancel }) {
  const visible = tokens.filter((t) => !t.is_hidden);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-dnd-panel border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-dnd-gold font-semibold text-base flex items-center gap-1.5"><SwordIcon />Start Combat</h2>
          <span className="text-xs text-gray-400">{selection.size} selected</span>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {visible.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-sm">No visible tokens on map.</div>
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
            Start ({selection.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DMView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || '';
  const pass = searchParams.get('pass') || '';

  const [session, setSession] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [maps, setMaps] = useState([]);
  const [diceRolls, setDiceRolls] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [panelTab, setPanelTab] = useState('map');
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);
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
  const [showDice, setShowDice] = useState(false);
  const [showSounds, setShowSounds] = useState(false);
  const [soundTab, setSoundTab] = useState('oneshots');
  const [soundFiles, setSoundFiles] = useState([]);
  const [soundVolume, setSoundVolume] = useState(1.0);
  const [ambientFiles, setAmbientFiles] = useState([]);
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [currentAmbient, setCurrentAmbient] = useState(null);
  const [soundUploading, setSoundUploading] = useState(false);
  const [uploadMainType, setUploadMainType] = useState('oneshot');
  const [uploadSubcat, setUploadSubcat] = useState('combat');
  const [uploadCustomName, setUploadCustomName] = useState('');
  const [treasureList, setTreasureList] = useState([]);
  const [sendingItemId, setSendingItemId] = useState(null);
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
  const [userColors, setUserColors] = useState({});
  const [users, setUsers] = useState([]);
  const rollIdRef = useRef(0);
  const activeSoundsRef = useRef([]);
  const audioCtxRef    = useRef(null);
  const ambientSrcRef  = useRef(null);
  const ambientGainRef = useRef(null);

  const [statBlockCreature, setStatBlockCreature] = useState(null);
  const [statBlockTab, setStatBlockTab] = useState('stats');
  const [showActionsRef, setShowActionsRef] = useState(false);
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
  const [ambientLight, setAmbientLight] = useState('bright');

  // DM markers
  const [dmMarkers, setDmMarkers] = useState([]);
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

  const [aiSettings, setAISettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dndvtt_ai_settings') || 'null') || {
        provider: 'lmstudio',
        baseUrl: 'http://host.docker.internal:1234',
        apiKey: '',
        model: '',
      };
    } catch {
      return { provider: 'lmstudio', baseUrl: 'http://host.docker.internal:1234', apiKey: '', model: '' };
    }
  });
  const [aiTestStatus, setAITestStatus] = useState(null); // null | 'testing' | 'ok' | 'error'
  const [aiTestMessage, setAITestMessage] = useState('');

  function updateAISettings(updates) {
    setAISettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('dndvtt_ai_settings', JSON.stringify(next));
      return next;
    });
    setAITestStatus(null);
  }

  const AI_PROVIDER_DEFAULTS = {
    lmstudio: { baseUrl: 'http://host.docker.internal:1234', placeholder: 'http://host.docker.internal:1234' },
    ollama: { baseUrl: 'http://host.docker.internal:11434', placeholder: 'http://host.docker.internal:11434' },
    openai: { baseUrl: 'https://api.openai.com', placeholder: 'https://api.openai.com' },
    custom: { baseUrl: '', placeholder: 'https://your-api-host.com' },
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
      socket.emit('join_session', { sessionCode: code, role: 'dm', name: 'Dungeon Master', dmPassword: pass });
    });

    socket.on('session_joined', ({ state, userColors: uc, users: u }) => {
      setSession(state.session);
      loadMaps(state.session.id);
      setTokens(state.tokens);
      setWalls(state.walls || []);
      setDoors(state.doors || []);
      setLights(state.lights || []);
      setMagicalDarkness(state.magicalDarkness || []);
      setSpellTemplates(state.spellTemplates || []);
      setDmMarkers(state.dmMarkers || []);
      setSpawnPoint(state.spawnPoint || { col: 0, row: 0 });
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setAmbientLight(state.session.ambient_light || 'bright');
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
      if (uc) setUserColors(uc);
      if (u) setUsers(u);
    });

    socket.on('error', ({ message }) => setError(message));

    socket.on('token_moved', ({ tokenId, gridCol, gridRow }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, grid_col: gridCol, grid_row: gridRow } : t));
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

    socket.on('token_light_changed', ({ tokenId, brightFt, dimFt, color }) => {
      setTokens(prev => prev.map(t => t.id === tokenId ? {
        ...t,
        token_light_bright: brightFt,
        token_light_dim: dimFt,
        ...(color !== undefined ? { token_light_color: color } : {}),
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

    socket.on('dm_marker_added',   ({ marker }) => setDmMarkers(prev => [...prev, marker]));
    socket.on('dm_marker_removed', ({ markerId }) => setDmMarkers(prev => prev.filter(m => m.id !== markerId)));
    socket.on('dm_marker_updated', ({ marker }) => setDmMarkers(prev => prev.map(m => m.id === marker.id ? marker : m)));

    socket.on('token_size_changed', ({ tokenId, size }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, size } : t));
    });

    socket.on('token_name_changed', ({ tokenId, name: tokenName }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, name: tokenName } : t));
    });

    socket.on('token_nickname_changed', ({ tokenId, nickname }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, nickname } : t));
    });

    socket.on('map_changed', ({ map, walls: newWalls, doors: newDoors, lights: newLights, tokens: newTokens, magicalDarkness: newDarkness, spawnPoint: newSpawn }) => {
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
      setDmMarkers([]);
      // Sync grid size from the map record (important after dd2vtt import)
      if (map?.grid_size) setGridSize(map.grid_size);
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
    socket.on('spawn_point_set', ({ col, row }) => setSpawnPoint({ col, row }));

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
      if (!ctx) return;
      const vol  = Math.max(0, Math.min(1, volume ?? 0.5));
      const FADE = 2;
      if (ambientSrcRef.current && ambientGainRef.current) {
        const oldGain = ambientGainRef.current;
        const oldSrc  = ambientSrcRef.current;
        ambientSrcRef.current  = null;
        ambientGainRef.current = null;
        oldGain.gain.setValueAtTime(oldGain.gain.value, ctx.currentTime);
        oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
        oldSrc.stop(ctx.currentTime + FADE);
      }
      ctx.resume()
        .then(() => fetch(`/sounds/ambient/${encodeURIComponent(filename)}`))
        .then(r => r.arrayBuffer())
        .then(buf => ctx.decodeAudioData(buf))
        .then(decoded => {
          const src  = ctx.createBufferSource();
          const gain = ctx.createGain();
          src.buffer = decoded;
          src.loop   = true;
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + FADE);
          src.connect(gain);
          gain.connect(ctx.destination);
          src.start(0);
          ambientSrcRef.current  = src;
          ambientGainRef.current = gain;
        })
        .catch(console.error);
    });

    socket.on('stop_ambient', () => {
      const ctx = audioCtxRef.current;
      if (!ctx || !ambientSrcRef.current) return;
      const FADE = 2;
      const gain = ambientGainRef.current;
      const src  = ambientSrcRef.current;
      ambientSrcRef.current  = null;
      ambientGainRef.current = null;
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
      src.stop(ctx.currentTime + FADE);
    });

    socket.on('fow_changed',           ({ enabled })            => setFowEnabled(enabled));
    socket.on('fow_blur_changed',      ({ blur })               => setFowBlur(blur));
    socket.on('ambient_light_changed', ({ ambientLight: al })   => setAmbientLight(al));

    socket.on('grid_size_changed', ({ gridSize: gs }) => {
      setGridSize(gs);
      setSession((prev) => ({ ...prev, grid_size: gs }));
    });

    socket.on('grid_style_changed', ({ gridColor: gc, gridThickness: gt }) => {
      if (gc) { setGridColor(gc); const p = parseRgba(gc); setGridHex(p.hex); setGridOpacity(p.opacity); }
      if (gt != null) setGridThickness(gt);
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

    socket.on('user_color_changed', ({ name, color }) => {
      setUserColors((prev) => ({ ...prev, [name]: color }));
    });

    socket.on('users_updated', ({ users: u }) => {
      setUsers(u);
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
    // Create AudioContext for DM ambient playback; unlock on first gesture
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

  function handlePlayAmbient(filename) {
    if (currentAmbient === filename) {
      handleStopAmbient();
      return;
    }
    setCurrentAmbient(filename);
    socket.emit('play_ambient', { filename, volume: ambientVolume });
  }

  function handleStopAmbient() {
    setCurrentAmbient(null);
    socket.emit('stop_ambient');
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
      if (currentAmbient === fname) handleStopAmbient();
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

  function handleStartCombat() {
    if (!session) return;
    // Pre-select all non-hidden tokens
    const allIds = new Set(tokens.filter((t) => !t.is_hidden).map((t) => t.id));
    setCombatPickerSelection(allIds);
    setShowCombatPicker(true);
  }

  function handleConfirmCombat() {
    if (!session) return;
    const tokenIds = [...combatPickerSelection];
    socket.emit('set_combat', { sessionId: session.id, active: true, tokenIds });
    setShowCombatPicker(false);
  }

  function handleEndCombat() {
    if (!session) return;
    socket.emit('set_combat', { sessionId: session.id, active: false });
  }

  function handleNextTurn() {
    if (!session) return;
    const sorted = [...tokens]
      .filter((t) => !t.is_hidden && t.in_combat)
      .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
    const next = (combatTurn + 1) % Math.max(1, sorted.length);
    socket.emit('next_combat_turn', { sessionId: session.id, currentTurn: next });
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

  if (!connected || !session) {
    return (
      <div className="min-h-screen bg-dnd-dark flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-dnd-gold"><SpinnerIcon /></div>
          <div className="text-gray-400">Connecting as Dungeon Master...</div>
        </div>
      </div>
    );
  }

  const mapUrl = session.map_image ? `/uploads/${session.map_image}` : null;
  const playerLink = `${window.location.origin}/play?code=${code}`;
  const visibleTokens = tokens;

  const combatSorted = [...tokens]
    .filter((t) => !t.is_hidden && t.in_combat)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
  const currentCombatTokenId = combatActive && combatSorted.length > 0
    ? combatSorted[combatTurn % combatSorted.length]?.id ?? null
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-900">
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
              onEnd={handleEndCombat}
            />
          </div>
        )}

        {/* Map + overlays */}
        <div className="flex-1 relative overflow-hidden">
          <ToolPanel activeTool={activeTool} onToolChange={setActiveTool} showWallTools lightShape={lightShape} onLightShapeChange={setLightShape} />

          <MapStage
            mapUrl={mapUrl}
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
          />

          {placingCreature && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dnd-gold text-gray-900 px-4 py-2 rounded-xl font-semibold text-sm shadow-lg z-30">
              Click on the map to place <strong>{placingCreature.name}</strong>
              <button onClick={() => setPlacingCreature(null)} className="ml-3 opacity-70 hover:opacity-100"><XIcon /></button>
            </div>
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
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-400 w-14 shrink-0">Volume</span>
                      <input
                        type="range" min={0} max={1} step={0.05} value={ambientVolume}
                        onChange={e => setAmbientVolume(Number(e.target.value))}
                        className="flex-1 accent-purple-500"
                      />
                      <span className="text-xs text-gray-300 w-8 text-right font-mono">
                        {Math.round(ambientVolume * 100)}%
                      </span>
                    </div>

                    <button
                      onClick={handleStopAmbient}
                      className="w-full mb-3 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded-lg text-sm transition-colors"
                    >
                      ⏹ Stop Ambience
                    </button>

                    {ambientFiles.length === 0 ? (
                      <div className="text-gray-500 text-xs text-center py-4">
                        No ambience yet — upload audio files above.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
                        {ambientFiles.map(f => (
                          <div key={f} className="flex items-center gap-1">
                            <button
                              onClick={() => handlePlayAmbient(f)}
                              className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 border rounded-lg text-left transition-colors ${currentAmbient === f ? 'bg-purple-900/60 border-purple-600 text-purple-200' : 'bg-gray-800 hover:bg-purple-900/30 border-gray-700 hover:border-purple-600 text-gray-200'}`}
                            >
                              <span className="text-xs shrink-0">{currentAmbient === f ? '▶' : '○'}</span>
                              <span className="text-xs truncate">{formatName(f)}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSound(`ambient/${f}`, true)}
                              className="text-gray-600 hover:text-red-400 text-sm px-1 transition-colors shrink-0"
                              title="Delete"
                            ><XIcon /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
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

      {/* DM Panel */}
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
          <div className="flex border-b border-gray-700 shrink-0">
            {PANEL_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setPanelTab(t)}
                className={`flex-1 py-2 text-xs font-medium transition-colors truncate px-1 ${
                  panelTab === t ? 'text-dnd-gold border-b-2 border-dnd-gold bg-black/20' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {PANEL_LABELS[t]}
              </button>
            ))}
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
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400 shrink-0 w-24">Edge feather</label>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={fowBlur}
                        onChange={e => handleFowBlurChange(Number(e.target.value))}
                        className="flex-1 accent-orange-500"
                      />
                      <span className="text-xs text-gray-300 w-6 text-right">{fowBlur}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Use the wall tools (W, R, P, O) in the left toolbar to draw LOS barriers. The DM always sees the full map.
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
                                    <div className="text-sm text-white truncate">{m.name}</div>
                                    <div className="text-xs text-gray-400">
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
                return { id: Date.now() + Math.random(), item_type: 'item', name: '', qty: 1, weight: '', desc: '', equipped: false, weapon_range: '', attack_stat: 'STR', attack_bonus_misc: 0, damage_entries: [{ damage: '', damage_type: '' }], properties: '' };
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

              return (
                <div className="h-full overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-dnd-gold">Treasure Chest</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), loot: treasureList.map(({ id, ...rest }) => rest) }, null, 2);
                          const blob = new Blob([payload], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'treasure-export.json';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200"
                        title="Download treasure list as JSON"
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

                  {treasureList.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Add items to send to players.</p>
                  ) : (
                    <div className="space-y-3">
                      {treasureList.map(item => {
                        const isWeapon = item.item_type === 'weapon';
                        return (
                          <div key={item.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
                            {/* Row 1: type / name / qty / send / remove */}
                            <div className="flex gap-1.5">
                              <select
                                className="w-20 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-gray-300 focus:outline-none focus:border-dnd-gold shrink-0"
                                value={item.item_type || 'item'}
                                onChange={e => updateTreasureItem(item.id, 'item_type', e.target.value)}
                              >
                                <option value="item">Item</option>
                                <option value="weapon">Weapon</option>
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
                              </div>
                            )}

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
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Session Info</h3>
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
                      </div>
                    </div>
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
                    </div>
                  </div>
                </div>

                {users.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-dnd-gold mb-2">Connected Players</h3>
                    <div className="space-y-2">
                      {users.map((u) => {
                        const hasToken = tokens.some(t => t.is_player && t.player_name === u.name);
                        return (
                          <div key={u.name} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
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
                              <input
                                type="color"
                                value={userColors[u.name] || '#ffffff'}
                                onChange={(e) => handleSetUserColor(u.name, e.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border border-gray-600 bg-transparent"
                                title="Set player color"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Quick Dice Reference</h3>
                  <DiceRoller rolls={diceRolls} />
                </div>

                {/* ── AI Settings ── */}
                <div>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">AI Integration</h3>
                  <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-gray-400">
                      Configure a local or cloud LLM to generate stat blocks on the fly. Used only in the Library tab.
                    </p>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Provider</label>
                      <select
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold"
                        value={aiSettings.provider}
                        onChange={(e) => {
                          const p = e.target.value;
                          const defaults = AI_PROVIDER_DEFAULTS[p] || AI_PROVIDER_DEFAULTS.custom;
                          updateAISettings({ provider: p, baseUrl: defaults.baseUrl });
                        }}
                      >
                        <option value="lmstudio">LM Studio</option>
                        <option value="ollama">Ollama</option>
                        <option value="openai">OpenAI</option>
                        <option value="custom">Custom (OpenAI-compat)</option>
                      </select>
                    </div>

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

                    {aiSettings.provider !== 'lmstudio' && aiSettings.provider !== 'ollama' && (
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
                  </div>
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
                >
                  Leave Session
                </button>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      <DiceRollOverlay rolls={diceRolls} />

      {/* Actions reference modal */}
      {showActionsRef && <ActionsReference onClose={() => setShowActionsRef(false)} />}

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
                  function dmgStr(w) {
                    const entries = Array.isArray(w.damage_entries) && w.damage_entries.length
                      ? w.damage_entries
                      : (w.damage ? [{ damage: w.damage, damage_type: w.damage_type || '' }] : []);
                    const filtered = entries.filter(e => e.damage);
                    return filtered.length
                      ? filtered.map(e => `${e.damage}${e.damage_type ? ` ${e.damage_type}` : ''}`).join(' + ')
                      : '—';
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

      {/* DM Marker Edit Popup */}
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
                      placeholder="DM notes for this marker…"
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

      {/* Combat Picker Modal */}
      {showCombatPicker && (
        <CombatPicker
          tokens={tokens}
          selection={combatPickerSelection}
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

import React, { useState, useRef, useEffect } from 'react';

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

const FogBlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeOpacity="0.5" strokeDasharray="3 2" />
    <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" fillOpacity="0.25" />
    <line x1="5" y1="19" x2="19" y2="5" strokeOpacity="0.6" />
  </svg>
);

// ── Tool groups config ────────────────────────────────────────────────────────

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

const DM_GROUPS = [MEASURE_GROUP, WALL_GROUP, DOOR_GROUP, LIGHT_DARK_GROUP, EFFECTS_GROUP, TEMPLATE_GROUP, SPAWN_GROUP];

// ── Flyout group button ───────────────────────────────────────────────────────

function GroupButton({ group, activeTool, onToolChange, extra }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const flyoutRef = useRef(null);
  const isGroupActive = group.tools.some(t => t.id === activeTool);

  // Close flyout when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // After flyout renders, clamp it within the viewport
  useEffect(() => {
    if (!open || !flyoutRef.current) return;
    const flyout = flyoutRef.current;
    // Reset first so measurement is accurate
    flyout.style.top = '0';
    flyout.style.maxHeight = '';
    const rect = flyout.getBoundingClientRect();
    const margin = 8;
    const overflow = rect.bottom - window.innerHeight + margin;
    if (overflow > 0) {
      flyout.style.top = `${-overflow}px`;
    }
    // Cap height so it never exceeds the viewport
    const availableHeight = window.innerHeight - margin * 2;
    if (rect.height > availableHeight) {
      flyout.style.maxHeight = `${availableHeight}px`;
      flyout.style.overflowY = 'auto';
    }
  }, [open, extra]); // re-check when extra content changes too

  // Active tool's icon for the group button
  const activeTool_ = group.tools.find(t => t.id === activeTool);
  const displayIcon = activeTool_?.icon ?? group.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={group.label}
        className={`relative flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-lg transition-all select-none ${
          isGroupActive
            ? `bg-${group.color} text-white shadow-lg scale-105`
            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
        }`}
      >
        {displayIcon}
        <span className="text-[9px] font-semibold leading-none">{group.label}</span>
        <span className="absolute bottom-0.5 right-0.5 opacity-60"><ChevronRightIcon /></span>
      </button>

      {open && (
        <div ref={flyoutRef} className="absolute left-full top-0 ml-2 flex flex-col gap-1 bg-gray-900 border border-gray-600 rounded-xl p-1.5 shadow-2xl z-50 min-w-max">
          {group.tools.map(tool => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => { onToolChange(tool.id); setOpen(false); }}
                title={`${tool.label} (${tool.key})`}
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
        </div>
      )}
    </div>
  );
}

// ── Tool button (simple, always visible) ─────────────────────────────────────

function ToolButton({ tool, activeTool, onToolChange }) {
  const active = activeTool === tool.id;
  return (
    <button
      onClick={() => onToolChange(tool.id)}
      title={`${tool.label} (${tool.key})`}
      className={`relative flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-lg transition-all select-none ${
        active
          ? 'bg-dnd-gold text-gray-900 shadow-lg shadow-yellow-900/40 scale-105'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
      }`}
    >
      {tool.icon}
      <span className="text-[9px] font-semibold leading-none">{tool.label}</span>
      <span className={`absolute top-0.5 right-1 text-[8px] leading-none font-mono ${active ? 'text-gray-700' : 'text-gray-600'}`}>
        {tool.key}
      </span>
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
    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 bg-gray-900/95 border border-gray-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-sm">
      {/* Always-visible: Pan + Move */}
      <ToolButton tool={{ id: 'pan',  label: 'Pan',  key: '1', icon: <PanIcon /> }}  activeTool={activeTool} onToolChange={onToolChange} />
      <ToolButton tool={{ id: 'move', label: 'Move', key: '2', icon: <MoveIcon /> }} activeTool={activeTool} onToolChange={onToolChange} />

      {showWallTools && (
        <>
          <div className="border-t border-gray-700 my-0.5" />
          <ToolButton tool={{ id: 'ping', label: 'Ping', key: 'C', icon: <PingIcon /> }} activeTool={activeTool} onToolChange={onToolChange} />
          <ToolButton tool={{ id: 'fog-block', label: 'Fog Block', key: 'V', icon: <FogBlockIcon /> }} activeTool={activeTool} onToolChange={onToolChange} />
          <div className="border-t border-gray-700 my-0.5" />
          {DM_GROUPS.map(group => (
            <GroupButton
              key={group.id}
              group={group}
              activeTool={activeTool}
              onToolChange={onToolChange}
              extra={group.id === 'light-dark' ? lightExtra : undefined}
            />
          ))}
        </>
      )}

      {!showWallTools && (
        <>
          <div className="border-t border-gray-700 my-0.5" />
          <GroupButton group={MEASURE_GROUP} activeTool={activeTool} onToolChange={onToolChange} />
        </>
      )}
    </div>
  );
}

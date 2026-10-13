import React, { useMemo, useState } from 'react';

// SneakPanel — the GM's switchboard for sneak mode.
//
// The rules live on the server (backend/src/detection.js); everything here is a
// switch that feeds them. Two lists, because the GM is doing two different jobs:
// deciding who is sneaking and how well they rolled, and pointing guards in
// directions.
//
// Nothing in this panel is available to a player, and that is the point — a
// player who could set their own Stealth DC has deleted the feature rather than
// used it.

const AWARE = {
  unaware:    { label: 'Unaware',    cls: 'bg-sky-900/60 text-sky-200 border-sky-700' },
  suspicious: { label: 'Suspicious', cls: 'bg-amber-900/60 text-amber-200 border-amber-600' },
  alerted:    { label: 'Alerted',    cls: 'bg-red-900/60 text-red-200 border-red-600' },
};

// The eight headings a GM actually thinks in. A free number field as well, for
// anyone who wants one, but nobody wants to type 135.
const HEADINGS = [
  ['N', 0], ['NE', 45], ['E', 90], ['SE', 135],
  ['S', 180], ['SW', 225], ['W', 270], ['NW', 315],
];

// Senses that come from something other than eyes, and so are all round unless
// the GM says otherwise. Mirrors NO_NATURAL_FRONT in backend/src/detection.js —
// the two have to agree or the panel shows a shape the engine does not use.
const NO_NATURAL_FRONT = new Set(['blindsight', 'tremorsense']);

// The movement speeds a sneaker can be told to use. `auto` reads the board —
// airborne with a fly speed means flying — and is what everything does outside
// a sneak sequence. Mirrors MOVE_MODES in backend/src/movement.js.
const MOVE_MODES = [
  ['auto', 'Auto'], ['walk', 'Walk'], ['fly', 'Fly'],
  ['swim', 'Swim'], ['climb', 'Climb'], ['burrow', 'Burrow'],
];
const SPEED_FIELD = {
  walk: 'creature_speed', fly: 'creature_speed_fly', swim: 'creature_speed_swim',
  climb: 'creature_speed_climb', burrow: 'creature_speed_burrow',
};

// What a given mode is actually worth for this token, in feet. Same fallbacks
// as the server: a mode the creature has no speed for walks instead.
function speedFor(t, mode) {
  const walk = Number(t?.creature_speed) > 0 ? Number(t.creature_speed) : 30;
  if (!SPEED_FIELD[mode] || mode === 'auto') {
    const airborne = !!t?.is_flying || (Number(t?.elevation) || 0) > 0;
    const fly = Number(t?.creature_speed_fly) || 0;
    return airborne && fly > 0 ? { ft: fly, mode: 'fly' } : { ft: walk, mode: 'walk' };
  }
  const ft = Number(t?.[SPEED_FIELD[mode]]) || 0;
  return ft > 0 ? { ft, mode } : { ft: walk, mode: 'walk' };
}

const SENSE_TYPES = ['normal', 'darkvision', 'blindsight', 'tremorsense', 'truesight', 'devilsight'];

const SENSE_LABEL = {
  normal: 'Sight', darkvision: 'Darkvision', blindsight: 'Blindsight',
  tremorsense: 'Tremorsense', truesight: 'Truesight', devilsight: "Devil's sight",
};

// The sense list as every reader interprets it: the explicit array when there
// is one, otherwise the single vision_type/vision_range pair.
function sensesOf(t) {
  const arr = Array.isArray(t.senses) ? t.senses : null;
  if (arr && arr.length) return arr;
  return [{ type: t.vision_type || 'normal', range: Number(t.vision_range) || 0 }];
}

// What arc this sense is actually using right now.
function effectiveArc(sense, token) {
  if (sense.arc != null && Number.isFinite(Number(sense.arc))) return Number(sense.arc);
  if (NO_NATURAL_FRONT.has(sense.type)) return 360;
  const a = Number(token.vision_arc);
  return Number.isFinite(a) && a > 0 ? a : 360;
}

function AwarenessChip({ state }) {
  const a = AWARE[state] || AWARE.unaware;
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${a.cls}`}>
      {a.label}
    </span>
  );
}

export default function SneakPanel({
  sessionId,
  enabled,
  tokens = [],
  onSetMode,
  onSetSneaking,
  onSetFacing,
  onSetSenseArc,
  onSetSenses,
  onSetMoveMode,
  onClearAwareness,
}) {
  // Which guard has its "add a sense" row open. One at a time — the panel is
  // narrow and two open editors in a list is a mess.
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState({ type: 'darkvision', range: 60 });
  // Who is who. `is_player` is set when a person claims a token, so it is not
  // reliable on its own — a PC the GM dropped on the board reads as false. The
  // sneaking flag is therefore what moves a token into the top list, and the
  // GM can put anyone there.
  const { sneakers, guards } = useMemo(() => {
    const live = (tokens || []).filter((t) => !t.is_dead);
    return {
      sneakers: live.filter((t) => t.is_player || t.sneaking),
      guards: live.filter((t) => !t.is_player && !t.sneaking),
    };
  }, [tokens]);

  const alerted = guards.filter((t) => t.awareness === 'alerted').length;
  const suspicious = guards.filter((t) => t.awareness === 'suspicious').length;

  return (
    <div className="p-3 space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-dnd-gold font-semibold">Sneak mode</h3>
          <p className="text-xs text-gray-400 mt-0.5 max-w-[34ch]">
            Guards check what they can see whenever anything moves. Off by
            default, and switching it off stands everyone down.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSetMode(!enabled)}
          aria-pressed={enabled}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            enabled
              ? 'bg-emerald-800/70 border-emerald-600 text-emerald-100 hover:bg-emerald-700/70'
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {enabled && (alerted > 0 || suspicious > 0) && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-900/70 border border-gray-700">
          <span className="text-xs text-gray-300">
            {alerted > 0 && <span className="text-red-300 font-semibold">{alerted} alerted</span>}
            {alerted > 0 && suspicious > 0 && <span className="text-gray-500"> · </span>}
            {suspicious > 0 && <span className="text-amber-300 font-semibold">{suspicious} suspicious</span>}
          </span>
          <button
            type="button"
            onClick={() => onClearAwareness(null, sessionId)}
            className="px-2 py-1 rounded text-[11px] bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700"
          >
            Stand all down
          </button>
        </div>
      )}

      {/* ── Who is sneaking ─────────────────────────────────────────────── */}
      <section>
        <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-1.5">
          Sneaking · speed · Stealth DC
        </h4>
        {sneakers.length === 0 && (
          <p className="text-xs text-gray-500">
            Nobody is sneaking yet. Any token can — use <span className="text-gray-300">Sneak</span> on
            one below.
          </p>
        )}
        <div className="space-y-1">
          {sneakers.map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800/60 border border-gray-700">
              <button
                type="button"
                onClick={() => onSetSneaking(t.id, !t.sneaking, undefined)}
                aria-pressed={!!t.sneaking}
                title={t.sneaking ? 'Stop sneaking' : 'Start sneaking'}
                className={`w-7 h-6 rounded text-[10px] font-bold border shrink-0 ${
                  t.sneaking
                    ? 'bg-indigo-800 border-indigo-500 text-indigo-100'
                    : 'bg-gray-900 border-gray-600 text-gray-500'
                }`}
              >
                {t.sneaking ? 'ON' : 'off'}
              </button>
              <span className="flex-1 truncate text-gray-200">{t.nickname || t.name}</span>
              {/* Which speed this one sneaks at. `Auto` follows the board, so a
                  token lifted into the air starts using its fly speed without
                  anybody touching this; the other settings are for what the
                  board cannot see — crawling, or swimming a flooded corridor
                  the map draws as floor. The resolved figure is shown next to
                  it, because a mode the creature has no speed for quietly
                  walks instead. */}
              <select
                value={t.move_mode || 'auto'}
                onChange={(e) => onSetMoveMode(t.id, e.target.value)}
                title={`Moves ${speedFor(t, t.move_mode || 'auto').ft} ft a round`}
                className="px-1 py-0.5 rounded bg-gray-900 border border-gray-600 text-gray-200 text-[11px]"
              >
                {MOVE_MODES.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-500 w-11 text-right tabular-nums">
                {speedFor(t, t.move_mode || 'auto').ft} ft
              </span>
              {/* The roll, not the modifier. The same rogue is a different
                  problem on a 4 than on a 24. */}
              <input
                type="number"
                min="0"
                max="50"
                value={t.stealth_dc ?? ''}
                placeholder="DC"
                onChange={(e) => {
                  const v = e.target.value;
                  onSetSneaking(t.id, undefined, v === '' ? null : Number(v));
                }}
                className="w-14 px-1.5 py-0.5 text-center rounded bg-gray-900 border border-gray-600 text-gray-100 text-xs"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Guards ──────────────────────────────────────────────────────── */}
      <section>
        <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-1.5">
          Guards · facing and arc
        </h4>
        {guards.length === 0 && (
          <p className="text-xs text-gray-500">Nothing on this map to sneak past.</p>
        )}
        <div className="space-y-1.5">
          {guards.map((t) => {
            const senses = sensesOf(t);
            const anyConed = senses.some((sn) => effectiveArc(sn, t) < 360);
            return (
              <div key={t.id} className="px-2 py-1.5 rounded bg-gray-800/60 border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-gray-200">{t.nickname || t.name}</span>
                  {/* ANY token can be the one sneaking.
                      `is_player` is only set when a person CLAIMS a token from
                      the lobby, so a character the GM dropped from the library
                      — which is how anyone tests this alone — lands here rather
                      than in the list above. Without this button there was no
                      way to start it sneaking at all. It is also just correct:
                      an NPC ally slipping past a guard is the same problem. */}
                  <button
                    type="button"
                    onClick={() => onSetSneaking(t.id, true, undefined)}
                    title="Move this one into the sneaking list"
                    className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/70 border border-indigo-600 text-indigo-200 hover:bg-indigo-800"
                  >
                    Sneak
                  </button>
                  <AwarenessChip state={t.awareness} />
                  {t.awareness && t.awareness !== 'unaware' && (
                    <button
                      type="button"
                      onClick={() => onClearAwareness(t.id, null)}
                      title="Stand this one down"
                      className="px-1.5 py-0.5 rounded text-[10px] bg-gray-900 border border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {/* One row per sense. A creature is usually several sensors
                    at once and they do not share a shape — eyes in a wedge in
                    front, blindsight in a bubble all round — so the arc belongs
                    to the sense, not to the token. */}
                <div className="mt-1.5 space-y-1">
                  {senses.map((sn, i) => {
                    const a = effectiveArc(sn, t);
                    const inherited = sn.arc == null && !NO_NATURAL_FRONT.has(sn.type);
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-300 w-[92px] shrink-0 truncate">
                          {SENSE_LABEL[sn.type] || sn.type}
                        </span>
                        <span className="text-[10px] text-gray-500 w-[46px] shrink-0 tabular-nums">
                          {Number(sn.range) > 0 ? `${sn.range} ft` : '∞'}
                        </span>
                        <select
                          value={String(a)}
                          onChange={(e) => onSetSenseArc(t.id, i, Number(e.target.value))}
                          className="px-1 py-0.5 rounded bg-gray-900 border border-gray-600 text-gray-200 text-[11px]"
                          title={inherited
                            ? "Following this token's default arc"
                            : `${SENSE_LABEL[sn.type] || sn.type} covers ${a}°`}
                        >
                          <option value="360">All round</option>
                          <option value="60">60°</option>
                          <option value="90">90°</option>
                          <option value="120">120°</option>
                          <option value="180">180°</option>
                        </select>
                        {inherited && (
                          <span className="text-[10px] text-gray-600">default</span>
                        )}
                        {senses.length > 1 && (
                          <button
                            type="button"
                            title="Remove this sense"
                            onClick={() => onSetSenses(t.id, senses.filter((_, k) => k !== i))}
                            className="ml-auto w-5 h-5 rounded text-[11px] leading-none bg-gray-900 border border-gray-700 text-gray-500 hover:text-red-300 hover:border-red-700"
                          >×</button>
                        )}
                      </div>
                    );
                  })}

                  {/* Adding a sense, rather than only re-shaping the ones the
                      creature came with. Without this a token whose statblock
                      lists no senses has exactly one row and no way to gain a
                      second, which is the whole point of per-sense arcs. */}
                  {adding === t.id ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <select
                        value={draft.type}
                        onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                        className="px-1 py-0.5 rounded bg-gray-900 border border-gray-600 text-gray-200 text-[11px]"
                      >
                        {SENSE_TYPES.map((ty) => (
                          <option key={ty} value={ty}>{SENSE_LABEL[ty] || ty}</option>
                        ))}
                      </select>
                      <input
                        type="number" min="0" max="1000"
                        value={draft.range}
                        onChange={(e) => setDraft((d) => ({ ...d, range: e.target.value }))}
                        className="w-16 px-1.5 py-0.5 rounded bg-gray-900 border border-gray-600 text-gray-100 text-[11px]"
                        placeholder="ft"
                      />
                      <span className="text-[10px] text-gray-500">ft · 0 = ∞</span>
                      <button
                        type="button"
                        onClick={() => {
                          onSetSenses(t.id, [...senses, {
                            type: draft.type, range: Math.max(0, Number(draft.range) || 0),
                          }]);
                          setAdding(null);
                        }}
                        className="px-2 py-0.5 rounded text-[11px] bg-emerald-900/70 border border-emerald-600 text-emerald-200 hover:bg-emerald-800"
                      >Add</button>
                      <button
                        type="button"
                        onClick={() => setAdding(null)}
                        className="px-1.5 py-0.5 rounded text-[11px] bg-gray-900 border border-gray-700 text-gray-400"
                      >Cancel</button>
                    </div>
                  ) : senses.length < 6 && (
                    <button
                      type="button"
                      onClick={() => { setAdding(t.id); setDraft({ type: 'darkvision', range: 60 }); }}
                      className="text-[11px] text-gray-400 hover:text-dnd-gold"
                    >+ Add a sense</button>
                  )}
                </div>

                {/* Facing is per TOKEN — a creature turns as a whole, however
                    many senses it is turning. Only worth showing once at least
                    one sense is actually directional. */}
                {anyConed && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {HEADINGS.map(([label, deg]) => {
                      const on = Math.round(((Number(t.facing) || 0) % 360) / 45) * 45 % 360 === deg;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onSetFacing(t.id, deg, undefined)}
                          title={`Face ${label}`}
                          className={`w-6 h-6 rounded text-[10px] font-semibold border ${
                            on ? 'bg-dnd-gold/80 border-dnd-gold text-gray-900'
                               : 'bg-gray-900 border-gray-600 text-gray-400 hover:bg-gray-700'
                          }`}
                        >{label}</button>
                      );
                    })}
                    <span className="text-[10px] text-gray-500 ml-1">
                      patrols turn this automatically
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

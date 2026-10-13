import React, { useState, useRef, useEffect } from 'react';

// A compass the GM spins to decide which way.
//
// For the moments a direction should not be the GM's choice: which way the
// party stumbles out of the fog, which corridor the wandering thing came down,
// where the wind is blowing from. Rolling a d8 and counting round the table
// works, but it makes the GM do arithmetic in front of the players; a dial
// that spins and stops answers the same question and looks like the thing it
// represents.
//
// Deliberately NOT a map tool. It arms nothing, places nothing, and leaves the
// current tool alone — the board keeps working underneath it, so a GM can spin
// for a direction without first putting down whatever they were doing.
//
// The result is local to the GM. A spin is usually a decision being made, not
// an announcement: what the party learns about it is the GM's to narrate.

const POINTS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];
const POINTS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const POINTS_4 = ['N', 'E', 'S', 'W'];

// How long the needle takes to settle. Long enough to read as a spin rather
// than a jump, short enough not to be waited on at the table.
const SPIN_MS = 2200;

const norm = (deg) => ((deg % 360) + 360) % 360;

// The name for a bearing, at the resolution that was actually rolled. A spin
// on the 8-point setting says "NE", not "NE (44°)" — reporting more precision
// than was rolled would be a lie about how the number was made.
function labelFor(bearing, segments) {
  const b = norm(bearing);
  if (segments === 4) return POINTS_4[Math.round(b / 90) % 4];
  if (segments === 8) return POINTS_8[Math.round(b / 45) % 8];
  if (segments === 16) return POINTS_16[Math.round(b / 22.5) % 16];
  return POINTS_16[Math.round(b / 22.5) % 16];
}

const MODES = [
  { n: 4, label: '4' },
  { n: 8, label: '8' },
  { n: 16, label: '16' },
  { n: 0, label: 'Any' },
];

export default function CompassTool({ onClose }) {
  // Cumulative, and only ever increasing: the needle should always travel
  // forwards, however many times it is spun. Rotating to the absolute bearing
  // each time would make it snap backwards whenever the new direction sat
  // anticlockwise of the old one.
  const [deg, setDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [segments, setSegments] = useState(8);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    // Uniform over the segments, or over the whole circle when the setting is
    // "Any". Picking a segment INDEX rather than an angle and rounding keeps
    // every direction equally likely — rounding a uniform angle would give the
    // segments straddling 0° a different share.
    const bearing = segments === 0
      ? Math.random() * 360
      : Math.floor(Math.random() * segments) * (360 / segments);

    // Several whole turns first, so it reads as a spin, then on round to the
    // answer. Varying the turns stops two spins to the same bearing looking
    // identical.
    const turns = 4 + Math.floor(Math.random() * 3);
    const delta = norm(bearing - norm(deg));
    setDeg((d) => d + turns * 360 + delta);

    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult({ bearing, label: labelFor(bearing, segments) });
      setSpinning(false);
    }, SPIN_MS);
  }

  // The dial's own furniture: sixteen ticks, long ones on the cardinals.
  const ticks = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 * Math.PI) / 180;
    const cardinal = i % 4 === 0;
    const r1 = cardinal ? 60 : 66;
    return {
      key: i,
      x1: 80 + Math.sin(a) * r1, y1: 80 - Math.cos(a) * r1,
      x2: 80 + Math.sin(a) * 72, y2: 80 - Math.cos(a) * 72,
      cardinal,
    };
  });

  return (
    <div className="fixed left-24 top-1/2 -translate-y-1/2 z-[86] w-56 bg-gray-900/95 border border-amber-800/70 rounded-2xl shadow-2xl backdrop-blur-sm select-none">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-[11px] uppercase tracking-wider text-amber-400">Compass</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white leading-none text-lg px-1">×</button>
      </div>

      <div className="p-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={spin}
          title={spinning ? 'Spinning…' : 'Spin the compass'}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/60"
          style={{ cursor: spinning ? 'default' : 'pointer' }}
        >
          <svg viewBox="0 0 160 160" className="w-36 h-36">
            <circle cx="80" cy="80" r="76" fill="#0f1421" stroke="#3f3f46" strokeWidth="2" />
            <circle cx="80" cy="80" r="66" fill="none" stroke="#27272a" strokeWidth="1" />
            {ticks.map((t) => (
              <line
                key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke={t.cardinal ? '#d4a745' : '#52525b'}
                strokeWidth={t.cardinal ? 2 : 1}
              />
            ))}
            <text x="80" y="26" textAnchor="middle" className="fill-amber-400" style={{ fontSize: 13, fontWeight: 700 }}>N</text>
            <text x="141" y="85" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 11 }}>E</text>
            <text x="80" y="146" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 11 }}>S</text>
            <text x="19" y="85" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 11 }}>W</text>

            {/* The needle. Rotated by a CSS transition rather than by frames of
                JS: the browser interpolates it on the compositor, so the spin
                stays smooth even while the board behind it is redrawing. */}
            <g
              style={{
                transform: `rotate(${deg}deg)`,
                transformOrigin: '80px 80px',
                transition: `transform ${SPIN_MS}ms cubic-bezier(0.13, 0.75, 0.15, 1)`,
              }}
            >
              <polygon points="80,18 88,80 80,72 72,80" fill="#dc2626" />
              <polygon points="80,142 72,80 80,88 88,80" fill="#94a3b8" />
            </g>
            <circle cx="80" cy="80" r="5" fill="#18181b" stroke="#d4a745" strokeWidth="1.5" />
          </svg>
        </button>

        <div className="h-10 flex flex-col items-center justify-center">
          {result ? (
            <>
              <span className="text-2xl font-bold text-amber-300 leading-none">{result.label}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">{Math.round(result.bearing)}°</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-500 italic">
              {spinning ? 'Spinning…' : 'Click the dial to spin'}
            </span>
          )}
        </div>

        <div className="w-full">
          <div className="text-[10px] text-gray-500 mb-1 text-center">Directions</div>
          <div className="grid grid-cols-4 gap-1">
            {MODES.map((m) => (
              <button
                key={m.n}
                type="button"
                onClick={() => { setSegments(m.n); setResult(null); }}
                className={`text-[11px] py-1 rounded border transition-colors ${
                  segments === m.n
                    ? 'bg-amber-800/70 border-amber-500 text-amber-100'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >{m.label}</button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="w-full text-xs bg-dnd-gold hover:bg-yellow-400 disabled:opacity-60 text-gray-900 font-semibold rounded px-3 py-1.5"
        >
          {spinning ? 'Spinning…' : 'Spin'}
        </button>
        <p className="text-[10px] text-gray-500 leading-tight text-center">
          Only you see this.
        </p>
      </div>
    </div>
  );
}

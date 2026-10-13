import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MINIGAME_BY_ID, skillScoreFor, skillCredits, tuningFor, ABILITY_WORDS } from '../data/minigames.js';

// The games themselves.
//
// Each one is handed a `t` (its tuning, already worked out from the character
// and the DC) and an `onEnd(result)`. None of them reads the character sheet:
// by the time a game starts, everything the sheet had to say has been spent on
// the numbers in `t`. That is what keeps them honest — a game cannot forget to
// apply proficiency, because a game has never heard of proficiency.
//
// `onEnd` takes { won, detail } and nothing else. Scoring, reporting and what
// the table is told are the host's business, below.

const useRaf = (fn, running) => {
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; });
  useEffect(() => {
    if (!running) return undefined;
    let id = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);  // a backgrounded tab must
      last = now;                                       // not jump the game
      cb.current(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
};

const Bar = ({ value, tone = 'bg-dnd-gold', className = '' }) => (
  <div className={`h-2 rounded-full bg-gray-800 overflow-hidden ${className}`}>
    <div className={`h-full ${tone} transition-[width] duration-100`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

// ── Pick the lock ────────────────────────────────────────────────────────────
//
// A pick sweeps the barrel; tap while it sits in the sweet spot and that pin
// sets. Miss and the pick slips. Proficiency widens the spot and slows the
// sweep, which is the difference between "impossible" and "tense".
function Lockpick({ t, onEnd }) {
  const [pos, setPos] = useState(0);
  const [set, setSet] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [flash, setFlash] = useState(null);
  const done = useRef(false);

  // WHERE THE PICK REALLY IS, in a ref as well as in state.
  //
  // State is for drawing; this is for judging. A tap was being judged against
  // the position React last RENDERED, and on a phone the gap between the
  // finger landing and a click event arriving is enough for the pick to cross
  // a whole sweet spot at these speeds — so a tap that visibly landed in the
  // green was scored where the pick had got to afterwards. The ref is written
  // every frame and read the instant the finger touches down.
  const posRef = useRef(0);
  const dirRef = useRef(1);

  // Each pin hides its sweet spot somewhere new, so the lock cannot be learned
  // by rhythm alone.
  const [zoneAt, setZoneAt] = useState(() => 0.2 + Math.random() * 0.6);
  const zoneRef = useRef(zoneAt);
  useEffect(() => { zoneRef.current = zoneAt; }, [zoneAt]);

  useRaf((dt) => {
    let next = posRef.current + dirRef.current * t.speed * dt;
    if (next > 1) { dirRef.current = -1; next = 1; }
    if (next < 0) { dirRef.current = 1; next = 0; }
    posRef.current = next;
    setPos(next);
  }, !done.current);

  const tap = () => {
    if (done.current) return;
    const half = t.zone / 2;
    const hit = Math.abs(posRef.current - zoneRef.current) <= half;
    if (hit) {
      const next = set + 1;
      setSet(next);
      setFlash('set');
      setZoneAt(0.15 + Math.random() * 0.7);
      if (next >= t.pins) {
        done.current = true;
        onEnd({ won: true, detail: `${next}/${t.pins} pins, ${strikes} slip${strikes === 1 ? '' : 's'}` });
      }
    } else {
      const next = strikes + 1;
      setStrikes(next);
      setFlash('slip');
      if (next >= t.strikes) {
        done.current = true;
        onEnd({ won: false, detail: `${set}/${t.pins} pins — the picks broke` });
      }
    }
    setTimeout(() => setFlash(null), 180);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Pins set <span className="text-dnd-gold font-semibold">{set}/{t.pins}</span></span>
        <span>Picks left <span className="text-rose-300 font-semibold">{t.strikes - strikes}</span></span>
      </div>

      <div className={`relative h-16 rounded-xl border overflow-hidden ${
        flash === 'set' ? 'border-emerald-500 bg-emerald-950/40'
          : flash === 'slip' ? 'border-rose-600 bg-rose-950/40'
            : 'border-gray-700 bg-gray-800/60'}`}>
        <div className="absolute inset-y-0 bg-emerald-800/50 border-x border-emerald-500"
             style={{ left: `${(zoneAt - t.zone / 2) * 100}%`, width: `${t.zone * 100}%` }} />
        <div className="absolute inset-y-1 w-1 rounded bg-dnd-gold shadow-[0_0_8px_2px_rgba(212,175,55,0.5)]"
             style={{ left: `calc(${pos * 100}% - 2px)` }} />
      </div>

      {/* Judged on pointerdown, not on click: the moment the finger lands is
          the moment the player meant. */}
      <button type="button"
        onPointerDown={(e) => { e.preventDefault(); tap(); }}
        className="w-full py-5 rounded-2xl bg-gray-800 border border-gray-600 text-lg font-semibold active:bg-gray-700 touch-none select-none">
        Set the pin
      </button>
    </div>
  );
}

// ── Disarm the trap ──────────────────────────────────────────────────────────
//
// Hold the wire. The collar wanders; stay inside it. Being outside is survivable
// for a moment — a trap that fires on a twitch would be a coin flip, not a check.
function Steady({ t, onEnd }) {
  const [collar, setCollar] = useState(0.5);
  const [hand, setHand] = useState(0.5);
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0);
  const [slip, setSlip] = useState(0);
  // Which way the collar is about to go, for the tell. 0 while it is mid-leg.
  const [tell, setTell] = useState(0);
  const done = useRef(false);
  const trackRef = useRef(null);

  // Drawn from state, judged from refs — the same correction the lock needed.
  // Here it is worse than a tap: the collar moved every frame while the test
  // compared it against the position React last rendered, so a finger sitting
  // dead centre could be scored as having slipped out.
  const collarRef = useRef(0.5);
  const handRef = useRef(0.5);
  const heldRef = useRef(false);

  // THE COLLAR TELEGRAPHS ITS MOVE BEFORE IT MAKES IT.
  //
  // It used to travel at a flat speed and reverse on a coin toss every few
  // frames, which was unreadable by design — and unreadable is not the same as
  // hard. A hand on a live trap should be beatable by watching the mechanism,
  // not by reacting after the fact, so each move is now a leg with three parts:
  //
  //   wind  — the collar settles, leans a hair the WRONG way, and the tell
  //           arrow shows where it is going. This is the hint.
  //   move  — an ease-in-out run to the new spot: slow off the mark, quick
  //           through the middle, slow into the stop.
  //   rest  — a beat at the end before the next leg is chosen.
  //
  // Anticipation (the lean) and ease-in-out are the two animation tricks that
  // make motion legible; together they turn "it jumped" into "it is about to
  // go left". Difficulty is unchanged where it counts: `t.drift` still sets how
  // fast the collar covers ground, and a long leg still crosses the track at
  // the same rate it always did. What proficiency buys is what it bought
  // before — a wider collar and a slower drift.
  const legRef = useRef(null);

  const speed = Math.max(0.12, t.drift * 0.35);   // track-widths per second
  const WIND = 0.26;                              // seconds of wind-up
  const REST = 0.12;                              // seconds of stillness after
  const LEAN = 0.018;                             // how far the lean goes back

  const newLeg = (from) => {
    // Somewhere else on the track, never so close that the leg is a twitch.
    const room = { lo: 0.15, hi: 0.85 };
    let to;
    let tries = 0;
    do {
      to = room.lo + Math.random() * (room.hi - room.lo);
      tries += 1;
    } while (Math.abs(to - from) < 0.14 && tries < 8);
    const dist = Math.abs(to - from);
    return {
      from, to,
      dir: to > from ? 1 : -1,
      // Time for the run itself. Ease-in-out averages out to this, so the
      // ground covered per second is what `speed` says.
      dur: Math.max(0.3, dist / speed),
      elapsed: 0,
      phase: 'wind',
    };
  };

  // Slow at both ends, quick through the middle.
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - ((-2 * p + 2) ** 3) / 2);

  useRaf((dt) => {
    if (!legRef.current) legRef.current = newLeg(collarRef.current);
    const leg = legRef.current;
    leg.elapsed += dt;

    let next = collarRef.current;
    if (leg.phase === 'wind') {
      // The lean: a small move AWAY from where it is about to go. Clamped to
      // the track so a collar already at the end leans into the room it has.
      const p = Math.min(1, leg.elapsed / WIND);
      const lean = LEAN * Math.sin(p * Math.PI);     // out and back
      next = Math.max(0.1, Math.min(0.9, leg.from - leg.dir * lean));
      if (p >= 1) { leg.phase = 'move'; leg.elapsed = 0; }
    } else if (leg.phase === 'move') {
      const p = Math.min(1, leg.elapsed / leg.dur);
      next = leg.from + (leg.to - leg.from) * easeInOut(p);
      if (p >= 1) { leg.phase = 'rest'; leg.elapsed = 0; }
    } else {
      next = leg.to;
      // A beat of stillness, then the next leg — and its wind-up — begins.
      if (leg.elapsed >= REST) legRef.current = newLeg(leg.to);
    }

    collarRef.current = next;
    setCollar(next);
    // The arrow belongs to the wind-up and nothing else: once the collar is
    // moving, the movement itself says which way it is going, and a stale
    // arrow during the rest would point back the way it came.
    const shown = legRef.current;
    setTell(shown.phase === 'wind' ? shown.dir : 0);

    const inside = Math.abs(handRef.current - collarRef.current) <= t.collar / 2;
    if (heldRef.current && inside) {
      setProgress((p) => {
        const next = p + (dt / t.seconds) * 100;
        if (next >= 100 && !done.current) {
          done.current = true;
          onEnd({ won: true, detail: `cut clean with ${t.slips - slip} nerve to spare` });
        }
        return Math.min(100, next);
      });
    } else if (heldRef.current) {
      setSlip((s) => {
        const next = s + dt * 2;
        if (next >= t.slips && !done.current) {
          done.current = true;
          onEnd({ won: false, detail: 'the wire snapped' });
        }
        return next;
      });
    }
  }, !done.current);

  const track = (clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (clientX - b.left) / b.width));
    handRef.current = v;
    setHand(v);
  };

  const grab = (on) => { heldRef.current = on; setHeld(on); };

  const inside = Math.abs(hand - collar) <= t.collar / 2;

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Cut <span className="text-dnd-gold font-semibold">{Math.round(progress)}%</span></span>
        <span>Nerve <span className={slip > t.slips * 0.6 ? 'text-rose-300' : 'text-gray-300'}>
          {Math.max(0, Math.round((1 - slip / t.slips) * 100))}%</span></span>
      </div>
      <Bar value={progress} tone="bg-emerald-500" />

      <div
        ref={trackRef}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); track(e.clientX); grab(true); }}
        onPointerMove={(e) => { if (heldRef.current) track(e.clientX); }}
        onPointerUp={() => grab(false)}
        onPointerCancel={() => grab(false)}
        className={`relative h-24 rounded-xl border touch-none ${
          held && !inside ? 'border-rose-600 bg-rose-950/40' : 'border-gray-700 bg-gray-800/60'}`}
      >
        <div className={`absolute inset-y-0 bg-sky-800/40 border-x ${
          tell ? 'border-sky-300' : 'border-sky-500'}`}
             style={{ left: `${(collar - t.collar / 2) * 100}%`, width: `${t.collar * 100}%` }}>
          {/* THE TELL. A chevron on the edge the collar is about to leave by,
              shown for the quarter-second it spends winding up. Inside the
              collar rather than beside it, so a player watching their own hand
              sees it without looking away. */}
          {tell !== 0 && (
            <span
              className="absolute top-1/2 -translate-y-1/2 text-sky-200 text-lg leading-none
                         animate-pulse pointer-events-none"
              style={tell > 0 ? { right: '2px' } : { left: '2px' }}
              aria-hidden="true"
            >{tell > 0 ? '›' : '‹'}</span>
          )}
        </div>
        <div className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 ${
          held ? (inside ? 'bg-emerald-500 border-emerald-200' : 'bg-rose-600 border-rose-200')
            : 'bg-gray-600 border-gray-400'}`}
             style={{ left: `calc(${hand * 100}% - 1rem)` }} />
        {!held && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">
            Hold the wire and follow the collar — it leans before it moves
          </span>
        )}
      </div>
    </div>
  );
}

// ── Spot what is wrong ───────────────────────────────────────────────────────
//
// One tile differs. A keen eye gets longer AND a subtler difference, because
// "easy" here should mean "you notice the thing", not "the thing is obvious".
function Spot({ t, onEnd }) {
  const done = useRef(false);
  const [left, setLeft] = useState(t.seconds);
  const puzzle = useMemo(() => {
    const total = t.size * t.size;
    const odd = Math.floor(Math.random() * total);
    const hue = Math.floor(Math.random() * 360);
    return { total, odd, hue };
  }, [t.size]);

  useRaf((dt) => {
    setLeft((v) => {
      const next = v - dt;
      if (next <= 0 && !done.current) {
        done.current = true;
        onEnd({ won: false, detail: 'never spotted it' });
      }
      return Math.max(0, next);
    });
  }, !done.current);

  const pick = (i) => {
    if (done.current) return;
    done.current = true;
    onEnd(i === puzzle.odd
      ? { won: true, detail: `spotted it with ${left.toFixed(1)}s left` }
      : { won: false, detail: 'looked straight past it' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Find the one that does not match</span>
        <span className={left < 3 ? 'text-rose-300' : ''}>{left.toFixed(1)}s</span>
      </div>
      <Bar value={(left / t.seconds) * 100} tone={left < 3 ? 'bg-rose-500' : 'bg-dnd-gold'} />
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${t.size}, minmax(0, 1fr))` }}>
        {Array.from({ length: puzzle.total }).map((_, i) => (
          <button key={i} type="button" onClick={() => pick(i)}
            aria-label={`tile ${i + 1}`}
            className="aspect-square rounded-md border border-gray-700/60"
            style={{
              background: `hsl(${puzzle.hue} 45% ${i === puzzle.odd ? 46 + t.subtlety * 26 : 46}%)`,
            }} />
        ))}
      </div>
    </div>
  );
}

// ── Recall the lore ──────────────────────────────────────────────────────────
const SIGILS = ['✦', '✧', '❂', '☽', '✸', '⚶', '⟡', '❄', '✹'];

function Recall({ t, onEnd }) {
  const seq = useMemo(
    () => Array.from({ length: t.length }, () => Math.floor(Math.random() * t.tiles)),
    [t.length, t.tiles],
  );
  const [phase, setPhase] = useState('show');     // show | answer
  const [lit, setLit] = useState(-1);
  const [at, setAt] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (phase !== 'show') return undefined;
    let i = 0;
    let timer;
    const step = () => {
      if (i >= seq.length) { setLit(-1); setPhase('answer'); return; }
      setLit(seq[i]);
      timer = setTimeout(() => {
        setLit(-1);
        i += 1;
        timer = setTimeout(step, Math.max(120, t.showMs * 0.35));
      }, t.showMs);
    };
    step();
    return () => clearTimeout(timer);
  }, [phase, seq, t.showMs]);

  const pick = (i) => {
    if (phase !== 'answer' || done.current) return;
    if (seq[at] === i) {
      const next = at + 1;
      setAt(next);
      if (next >= seq.length) {
        done.current = true;
        onEnd({ won: true, detail: `recalled all ${seq.length}` });
      }
    } else {
      done.current = true;
      onEnd({ won: false, detail: `lost it after ${at} of ${seq.length}` });
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 text-center">
        {phase === 'show' ? 'Watch…' : `Repeat it — ${at}/${seq.length}`}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: t.tiles }).map((_, i) => (
          <button key={i} type="button" onClick={() => pick(i)}
            disabled={phase === 'show'}
            className={`aspect-square rounded-xl border text-2xl flex items-center justify-center transition-colors ${
              lit === i
                ? 'bg-dnd-gold/80 border-dnd-gold text-gray-900'
                : 'bg-gray-800 border-gray-700 text-gray-300 active:bg-gray-700'}`}>
            {SIGILS[i % SIGILS.length]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Stay unseen ──────────────────────────────────────────────────────────────
//
// Hold to move while the guard's back is turned. They telegraph the turn, and
// a stealthy character gets a longer warning as well as longer cover.
function Sneak({ t, onEnd }) {
  const [at, setAt] = useState(0);
  const [state, setState] = useState('away');     // away | turning | watching
  const [held, setHeld] = useState(false);
  const [caught, setCaught] = useState(0);
  const timer = useRef(0);
  const done = useRef(false);
  // Judged from refs for the same reason the others are: letting go as they
  // turn is the whole skill, and a frame of rendering lag is the difference
  // between getting away with it and being caught.
  const stateRef = useRef('away');
  const heldRef = useRef(false);
  const atRef = useRef(0);

  useRaf((dt) => {
    timer.current -= dt;
    if (timer.current <= 0) {
      if (stateRef.current === 'away') { stateRef.current = 'turning'; setState('turning'); timer.current = t.warning; }
      else if (stateRef.current === 'turning') { stateRef.current = 'watching'; setState('watching'); timer.current = 0.7 + Math.random() * 0.9; }
      else { stateRef.current = 'away'; setState('away'); timer.current = t.lookAway * (0.7 + Math.random() * 0.6); }
    }
    if (heldRef.current) {
      if (stateRef.current === 'watching') {
        const next = caught + 1;
        setCaught(next);
        heldRef.current = false;
        setHeld(false);
        if (next >= t.caught && !done.current) {
          done.current = true;
          onEnd({ won: false, detail: `seen at ${Math.round(atRef.current)}%` });
        }
        return;
      }
      const next = Math.min(t.distance, atRef.current + t.speed * dt);
      atRef.current = next;
      setAt(next);
      if (next >= t.distance && !done.current) {
        done.current = true;
        onEnd({ won: true, detail: `across unseen, ${caught} close call${caught === 1 ? '' : 's'}` });
      }
    }
  }, !done.current);

  const tone = state === 'away' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-100'
    : state === 'turning' ? 'bg-amber-900/50 border-amber-600 text-amber-100'
      : 'bg-rose-950/60 border-rose-700 text-rose-100';

  return (
    <div className="space-y-4 select-none">
      <div className={`rounded-xl border px-3 py-4 text-center font-semibold ${tone}`}>
        {state === 'away' ? 'Their back is turned' : state === 'turning' ? 'They are turning…' : 'They are looking right at you'}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Across <span className="text-dnd-gold font-semibold">{Math.round(at)}%</span></span>
        <span>Close calls <span className="text-rose-300">{caught}/{t.caught}</span></span>
      </div>
      <Bar value={at} tone="bg-sky-500" />
      <button type="button"
        onPointerDown={(e) => { e.preventDefault(); heldRef.current = true; setHeld(true); }}
        onPointerUp={() => { heldRef.current = false; setHeld(false); }}
        onPointerLeave={() => { heldRef.current = false; setHeld(false); }}
        onPointerCancel={() => { heldRef.current = false; setHeld(false); }}
        className={`w-full py-6 rounded-2xl border text-lg font-semibold touch-none ${
          held ? 'bg-sky-900/60 border-sky-500 text-sky-100' : 'bg-gray-800 border-gray-600 text-gray-200'}`}>
        {held ? 'Moving…' : 'Hold to move'}
      </button>
    </div>
  );
}

// ── Force it open ────────────────────────────────────────────────────────────
function Force({ t, onEnd }) {
  const [pos, setPos] = useState(0);
  const [heaves, setHeaves] = useState(0);
  const [bar, setBar] = useState(40);
  const [flash, setFlash] = useState(null);
  const done = useRef(false);
  const zoneAt = 0.5;
  // Same as the lock: drawn from state, judged from the ref. See Lockpick.
  const posRef = useRef(0);
  const dirRef = useRef(1);

  useRaf((dt) => {
    let next = posRef.current + dirRef.current * t.speed * dt;
    if (next > 1) { dirRef.current = -1; next = 1; }
    if (next < 0) { dirRef.current = 1; next = 0; }
    posRef.current = next;
    setPos(next);
    setBar((b) => {
      const next = b - t.drain * dt;
      if (next <= 0 && !done.current) {
        done.current = true;
        onEnd({ won: false, detail: `${heaves}/${t.needed} heaves — strength gave out` });
      }
      return Math.max(0, next);
    });
  }, !done.current);

  const tap = () => {
    if (done.current) return;
    const hit = Math.abs(posRef.current - zoneAt) <= t.zone / 2;
    if (hit) {
      const next = heaves + 1;
      setHeaves(next);
      setBar((b) => Math.min(100, b + 14));
      setFlash('good');
      if (next >= t.needed) {
        done.current = true;
        onEnd({ won: true, detail: `forced in ${next} heaves` });
      }
    } else {
      setBar((b) => Math.max(0, b - 12));
      setFlash('bad');
    }
    setTimeout(() => setFlash(null), 150);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Heaves <span className="text-dnd-gold font-semibold">{heaves}/{t.needed}</span></span>
        <span>Strength</span>
      </div>
      <Bar value={bar} tone={bar < 30 ? 'bg-rose-500' : 'bg-amber-500'} />
      <div className={`relative h-16 rounded-xl border overflow-hidden ${
        flash === 'good' ? 'border-emerald-500 bg-emerald-950/40'
          : flash === 'bad' ? 'border-rose-600 bg-rose-950/40'
            : 'border-gray-700 bg-gray-800/60'}`}>
        <div className="absolute inset-y-0 bg-amber-800/50 border-x border-amber-500"
             style={{ left: `${(zoneAt - t.zone / 2) * 100}%`, width: `${t.zone * 100}%` }} />
        <div className="absolute inset-y-1 w-1.5 rounded bg-gray-100"
             style={{ left: `calc(${pos * 100}% - 3px)` }} />
      </div>
      <button type="button"
        onPointerDown={(e) => { e.preventDefault(); tap(); }}
        className="w-full py-5 rounded-2xl bg-gray-800 border border-gray-600 text-lg font-semibold active:bg-gray-700 touch-none select-none">
        Heave
      </button>
    </div>
  );
}

// ── Win them over ────────────────────────────────────────────────────────────
//
// A conversation, not a quiz. Each exchange shows how they are taking it, and
// three kinds of line are on offer:
//
//   right — reads the mood and answers it. Trust up.
//   soft  — not wrong, not much. A small gain, and a round spent.
//   wrong — misreads them. Trust down, and one of your few misreads spent.
//
// The old version ended the whole check on one bad line, which made a social
// encounter the most brittle game here and nothing like how talking someone
// round actually goes. Now it is a meter: fill their trust and you have them,
// run it to nothing — or misread them once too often — and they walk. One bad
// line is recoverable, three in a row is not.
const MOODS = [
  { mood: 'Suspicious',
    right: 'Show your hands and keep it plain',
    soft: ['Answer the question they actually asked', 'Let them check your story'],
    wrong: ['Lean in and lower your voice', 'Name-drop someone important', 'Make a joke of it', 'Offer coin'] },
  { mood: 'Proud',
    right: 'Let them tell you how it was done',
    soft: ['Ask who taught them', 'Admire the work without gushing'],
    wrong: ['Correct a small detail', 'Hurry them along', 'Match the story with your own', 'Offer coin'] },
  { mood: 'Frightened',
    right: 'Slow down and promise nothing you cannot keep',
    soft: ['Sit down so you are not standing over them', 'Ask what would make this easier'],
    wrong: ['Press for the answer', 'Tell them there is nothing to fear', 'Raise your voice to be heard', 'Block the door'] },
  { mood: 'Greedy',
    right: 'Name a number and stop talking',
    soft: ['Ask what it would take', 'Mention who else is bidding'],
    wrong: ['Appeal to their better nature', 'Hint at consequences', 'Flatter them first', 'Change the subject'] },
  { mood: 'Grieving',
    right: 'Say nothing for a moment, then ask gently',
    soft: ['Ask what they were like', 'Offer to come back tomorrow'],
    wrong: ['Get to the point', 'Compare it to your own loss', 'Offer a distraction', 'Offer coin'] },
  { mood: 'Bored',
    right: 'Give them the one detail nobody else has',
    soft: ['Cut it to a sentence', 'Ask them something only they can answer'],
    wrong: ['Start at the beginning', 'Repeat yourself louder', 'Ask how their day is going', 'Apologise'] },
  { mood: 'Angry',
    right: 'Let them finish, then agree with the part that is true',
    soft: ['Lower your voice until they lower theirs', 'Ask what would settle it'],
    wrong: ['Tell them to calm down', 'Match their volume', 'Point out where they are wrong', 'Walk away mid-sentence'] },
  { mood: 'Drunk',
    right: 'Keep it short and say it twice',
    soft: ['Buy the next round', 'Steer them outside for air'],
    wrong: ['Reason it through step by step', 'Ask them to sign something', 'Take their cup away', 'Quote the law at them'] },
  { mood: 'Exhausted',
    right: 'Ask for one thing and let them go',
    soft: ['Offer to do the walking yourself', 'Say it can wait until morning'],
    wrong: ['Run through the whole list', 'Tell them this is urgent', 'Ask them to repeat it', 'Suggest they push on'] },
  { mood: 'Superior',
    right: 'Ask their opinion as though it settles the matter',
    soft: ['Use their title', 'Defer on something small'],
    wrong: ['Treat them as an equal', 'Hurry past the pleasantries', 'Mention your own credentials', 'Bargain openly'] },
  { mood: 'Lonely',
    right: 'Stay longer than the errand needs',
    soft: ['Ask about the picture on the wall', 'Accept the tea'],
    wrong: ['Get straight to business', 'Check the door', 'Keep your cloak on', 'Promise to visit and leave'] },
  { mood: 'Guilty',
    right: 'Make it easy to tell you',
    soft: ['Say you are not here to judge', 'Talk about something else first'],
    wrong: ['Name what they did', 'Threaten to tell', 'Say it was not their fault', 'Demand the truth'] },
  { mood: 'Zealous',
    right: 'Frame your request as their cause',
    soft: ['Quote something they would know', 'Ask what their order would do'],
    wrong: ['Argue the doctrine', 'Treat it as superstition', 'Offer coin', 'Change the subject'] },
  { mood: 'Cautious',
    right: 'Put the risk in plain numbers',
    soft: ['Offer to go first', 'Write the terms down'],
    wrong: ['Tell them not to worry', 'Rush the decision', 'Gloss over the cost', 'Dare them'] },
  { mood: 'Amused',
    right: 'Play along, then slip the real question in',
    soft: ['Laugh with them', 'Admit how it looks'],
    wrong: ['Insist on being taken seriously', 'Explain the joke', 'Scold them', 'Talk over the laughter'] },
  { mood: 'Desperate',
    right: 'Offer the one thing you can actually deliver',
    soft: ['Ask what they need first', 'Promise to carry a message'],
    wrong: ['Haggle', 'List your conditions', 'Tell them to be patient', 'Offer sympathy and nothing else'] },
];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sample = (arr, n) => shuffle(arr).slice(0, Math.max(0, n));

// One exchange: a mood, and the lines offered for it.
//
// Always exactly one right line. One soft line is offered where there is room
// for it, so most rounds have a cushion — a player who cannot read the mood is
// choosing between a small gain and a real loss rather than between right and
// ruin. Never the same mood twice running.
function makeExchange(prevMood, options) {
  const pool = MOODS.filter((m) => m.mood !== prevMood);
  const m = pool[Math.floor(Math.random() * pool.length)];
  const want = Math.max(2, options);
  const softs = want >= 3 ? sample(m.soft, 1) : [];
  const wrongs = sample(m.wrong, want - 1 - softs.length);
  return {
    mood: m.mood,
    right: m.right,
    soft: new Set(softs),
    choices: shuffle([m.right, ...softs, ...wrongs]),
  };
}

function Persuade({ t, onEnd }) {
  const [trust, setTrust] = useState(() => Math.round(t.start));
  const [missed, setMissed] = useState(0);
  const [exchange, setExchange] = useState(() => makeExchange(null, t.options));
  const [count, setCount] = useState(1);
  const [showMood, setShowMood] = useState(true);
  const [flash, setFlash] = useState(null);     // { tone, text }
  const done = useRef(false);
  const busy = useRef(false);                   // one answer per exchange

  // The mood is readable for a moment and then goes guarded again, so the
  // player is reading a person rather than matching a label on screen. A
  // proficient talker gets longer to look.
  useEffect(() => {
    setShowMood(true);
    const id = setTimeout(() => setShowMood(false), t.showMs);
    return () => clearTimeout(id);
  }, [count, t.showMs]);

  // The timers below outlive a click, so an unmount has to stop them firing
  // into a dead component. Cleared on the way IN as well as set on the way
  // out: React mounts, unmounts and remounts a component in development, and
  // a flag only ever set to true left the remounted game refusing every tap —
  // the meter sat at its opening value and no line did anything.
  useEffect(() => {
    done.current = false;
    return () => { done.current = true; };
  }, []);

  const pick = (line) => {
    if (done.current || busy.current) return;
    busy.current = true;

    const right = line === exchange.right;
    const soft = !right && exchange.soft.has(line);
    const delta = right ? t.gain : soft ? t.softGain : -t.loss;
    const nextTrust = Math.max(0, Math.min(100, trust + delta));
    const nextMissed = right || soft ? missed : missed + 1;

    setTrust(nextTrust);
    setMissed(nextMissed);
    setFlash({
      tone: right ? 'good' : soft ? 'soft' : 'bad',
      text: right ? 'That lands. They open up a little.'
        : soft ? 'Harmless. They are still listening.'
          : 'Wrong note — you feel them close off.',
    });

    const finish = (won, detail) => {
      done.current = true;
      setTimeout(() => onEnd({ won, detail }), 650);
    };

    if (nextTrust >= 100) {
      finish(true, nextMissed ? `won them round after ${nextMissed} misstep${nextMissed === 1 ? '' : 's'}` : 'read them perfectly');
      return;
    }
    // FAILURE IS A TALLY OF MISREADS, NOT AN EMPTY METER.
    //
    // An empty meter used to end it too, which put the whole check back on one
    // bad line: trust opens low, so the first misread could take it to nothing
    // and the game was over before the conversation started. Now a bottomed-out
    // meter is ground to make up, and the only thing that ends it badly is
    // misreading them once more than they will stand — or talking so long they
    // lose interest.
    if (nextMissed > t.patience) { finish(false, `lost them after ${count} exchange${count === 1 ? '' : 's'}`); return; }
    if (count >= t.exchanges) { finish(false, 'they heard you out and left it there'); return; }

    // A beat on the result before the next exchange, so a player sees which
    // way that line went rather than watching the screen change under them.
    setTimeout(() => {
      if (done.current) return;
      setFlash(null);
      setExchange(makeExchange(exchange.mood, t.options));
      setCount((c) => c + 1);
      busy.current = false;
    }, 620);
  };

  const patienceLeft = Math.max(0, t.patience - missed + 1);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Exchange {count}</span>
        <span>
          Patience{' '}
          <span className={patienceLeft <= 1 ? 'text-rose-300' : 'text-gray-300'}>
            {'●'.repeat(patienceLeft)}{'○'.repeat(Math.max(0, t.patience + 1 - patienceLeft))}
          </span>
        </span>
      </div>

      {/* The meter is the game: everything else is how it moves. */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
          <span>Trust</span>
          <span className={trust >= 70 ? 'text-emerald-300' : trust <= 25 ? 'text-rose-300' : 'text-gray-300'}>
            {Math.round(trust)}%
          </span>
        </div>
        <Bar value={trust} tone={trust >= 70 ? 'bg-emerald-500' : trust <= 25 ? 'bg-rose-500' : 'bg-indigo-400'} />
      </div>

      <div className={`rounded-xl border px-3 py-6 text-center transition-opacity ${
        showMood ? 'opacity-100 bg-indigo-950/50 border-indigo-700' : 'opacity-40 bg-gray-800/60 border-gray-700'}`}>
        <div className="text-[10px] uppercase tracking-wide text-gray-500">They seem</div>
        <div className="text-xl font-semibold text-indigo-100">{showMood ? exchange.mood : '…'}</div>
      </div>

      {flash && (
        <div className={`rounded-lg px-3 py-2 text-xs text-center border ${
          flash.tone === 'good' ? 'border-emerald-700 bg-emerald-950/50 text-emerald-200'
            : flash.tone === 'soft' ? 'border-gray-600 bg-gray-800/70 text-gray-300'
              : 'border-rose-700 bg-rose-950/50 text-rose-200'}`}>
          {flash.text}
        </div>
      )}

      <div className="space-y-2">
        {exchange.choices.map((line) => (
          <button key={line} type="button" onClick={() => pick(line)}
            disabled={!!flash}
            className="w-full text-left px-3 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm
                       text-gray-200 active:bg-gray-700 disabled:opacity-50">
            {line}
          </button>
        ))}
      </div>
    </div>
  );
}

const GAMES = {
  lockpick: Lockpick, steady: Steady, spot: Spot, recall: Recall,
  sneak: Sneak, force: Force, persuade: Persuade,
};

// ── The host ─────────────────────────────────────────────────────────────────
//
// Brief, play, result. The brief exists so the player can see WHY this is as
// hard as it is: a game that is quietly easier for a proficient character is a
// game that never tells them their character is good at this.
export default function MiniGameHost({ challenge, creature, onResult, onClose }) {
  const game = MINIGAME_BY_ID[challenge?.gameId];
  const [phase, setPhase] = useState('brief');     // brief | play | done
  const [outcome, setOutcome] = useState(null);
  const startedAt = useRef(0);

  const score = useMemo(() => (game ? skillScoreFor(creature, game) : null), [creature, game]);
  const tuning = useMemo(() => (game ? tuningFor(game, score, challenge?.dc) : null), [game, score, challenge?.dc]);
  const credits = useMemo(() => (game && score ? skillCredits(score, game) : []), [game, score]);

  const finish = useCallback((result) => {
    const seconds = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
    const full = {
      gameId: challenge.gameId,
      dc: challenge.dc,
      won: !!result.won,
      detail: result.detail || '',
      seconds: Math.round(seconds * 10) / 10,
      skillTotal: score?.total ?? 0,
    };
    setOutcome(full);
    setPhase('done');
    onResult?.(full);
  }, [challenge, onResult, score]);

  if (!game) return null;
  const Game = GAMES[game.id];

  return (
    <div className="fixed inset-0 z-[210] bg-gray-900 text-gray-100 flex flex-col">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-gray-700"
           style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <span className="text-2xl">{game.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{game.name}</div>
          <div className="text-[11px] text-gray-500 truncate">
            {ABILITY_WORDS[game.ability]}{game.skillName ? ` (${game.skillName})` : ''} · DC {challenge.dc}
          </div>
        </div>
        {/* A WAY OUT, ALWAYS.
            Mid-game there was none: the phone rang, the GM sent the wrong
            lock, the player put it down — and the screen stayed, with every
            later challenge dropped because one was still open. Giving up is
            reported as a failure rather than silence, because the GM asked a
            question and is owed an answer either way. */}
        <button type="button"
          onClick={() => {
            if (phase === 'play') finish({ won: false, detail: 'walked away from it' });
            else onClose?.();
          }}
          className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm active:bg-gray-700">
          {phase === 'play' ? 'Give up' : 'Close'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 max-w-md w-full mx-auto">
        {phase === 'brief' && (
          <div className="space-y-4">
            {challenge.note && (
              <div className="rounded-xl bg-indigo-950/50 border border-indigo-800 px-3 py-2 text-sm text-indigo-100">
                {challenge.note}
              </div>
            )}
            <p className="text-sm text-gray-300">{game.blurb}</p>
            <p className="text-[13px] text-gray-400">{game.how}</p>

            <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                What your character brings
              </div>
              {credits.length === 0 && (
                <p className="text-[12px] text-gray-500">
                  Nothing in particular — you are doing this on nerve alone.
                </p>
              )}
              {credits.map((c) => (
                <div key={c.label} className="flex items-baseline justify-between text-[12px]">
                  <span className="text-gray-300">{c.label}</span>
                  <span className={c.value >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {c.value >= 0 ? '+' : ''}{c.value}
                  </span>
                </div>
              ))}
              <div className="mt-1 pt-1 border-t border-gray-700 flex items-baseline justify-between text-[12px]">
                <span className="text-gray-400">That makes this</span>
                <span className="text-dnd-gold">
                  {score.total - (challenge.dc - 10) >= 4 ? 'much easier'
                    : score.total - (challenge.dc - 10) >= 1 ? 'easier'
                      : score.total - (challenge.dc - 10) >= -2 ? 'a fair fight' : 'a long shot'}
                </span>
              </div>
            </div>

            <button type="button"
              onClick={() => { startedAt.current = Date.now(); setPhase('play'); }}
              className="w-full py-3.5 rounded-2xl bg-dnd-red text-white font-semibold active:bg-red-700">
              Begin
            </button>
            <button type="button" onClick={onClose}
              className="w-full py-2 text-sm text-gray-500 active:text-gray-300">Not now</button>
          </div>
        )}

        {phase === 'play' && <Game t={tuning} onEnd={finish} />}

        {phase === 'done' && outcome && (
          <div className="space-y-4 text-center pt-6">
            <div className={`text-5xl`}>{outcome.won ? '✅' : '❌'}</div>
            <div className={`text-xl font-semibold ${outcome.won ? 'text-emerald-300' : 'text-rose-300'}`}>
              {outcome.won ? 'Success' : 'Failed'}
            </div>
            <p className="text-sm text-gray-400">{outcome.detail}</p>
            <p className="text-[11px] text-gray-600">
              {game.name} · DC {outcome.dc} · {outcome.seconds}s · your table has been told
            </p>
            <button type="button" onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gray-800 border border-gray-700 font-semibold active:bg-gray-700">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

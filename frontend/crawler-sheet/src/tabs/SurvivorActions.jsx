import React from 'react';
import { useRoller } from '../roller.jsx';

export default function SurvivorActions({ st, d, update }) {
  const roll = useRoller();
  const wtl = d.level >= 8 ? 2 : 1;
  return (
      <div className="card">
        <h2 className="sec">Survivor actions</h2>
        <div className="list">
          <div className="li">
            <div className="grow"><b>Will to Live</b><div className="small muted">Bonus action: heal 1d8 + {d.level}. {wtl - (st.willToLiveUsed || 0)}/{wtl} left.</div></div>
            <button className="roll alt" disabled={(st.willToLiveUsed || 0) >= wtl} onClick={() => {
              const r = roll.damage('Will to Live', `1d8+${d.level}`);
              update((s) => { s.willToLiveUsed = (s.willToLiveUsed || 0) + 1; s.hp.current = Math.min(d.hpMax, (s.hp.current ?? d.hpMax) + r.total);
                if (s.inclination === 'Bulwark' && d.level >= 3) s.hp.temp = Math.max(s.hp.temp || 0, d.level); return s; });
            }}>Heal</button>
          </div>
          {d.level >= 2 && <div className="li"><div className="grow"><b>Run Away!</b><div className="small muted">Bonus action: Dash or Disengage{st.inclination === 'Skulker' && d.level >= 6 ? ' or Hide' : ''}.</div></div></div>}
          {d.level >= 4 && (
            <div className="li"><div className="grow"><b>Hard to Kill</b><div className="small muted">Drop to 1 HP instead of 0, once per long rest.</div></div>
              <button className="btn sm" onClick={() => update((s) => { s.hardToKillUsed = !s.hardToKillUsed; if (!st.hardToKillUsed && (s.hp.current ?? 1) === 0) s.hp.current = 1; return s; })}>
                {st.hardToKillUsed ? 'Used' : 'Use'}</button></div>)}
          {d.level >= 7 && <div className="li"><div className="grow"><b>Danger Sense</b><div className="small muted">Advantage on Dex saves against effects you can see.</div></div></div>}
          <div className="li"><div className="grow"><b>Inspect</b><div className="small muted">Bonus action, 60 ft: learn a creature's name, level and a rude description.</div></div></div>
        </div>
      </div>
  );
}

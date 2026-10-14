import React from 'react';
import { classResources } from '../ttf.js';

// Class feature uses (Second Wind, Action Surge, Wild Shape, Rage, Ki, Channel Divinity…)
// from Tabletop Forge's resource catalogue. Short and long rests on the Main tab reset them.
export default function ClassFeatures({ st, d, update }) {
  const list = classResources(st, d);
  if (!list.length) return null;
  const used = (id) => (st.resources || {})[id] || 0;
  const setUsed = (id, n, total) => update((s) => { s.resources = { ...(s.resources || {}), [id]: Math.max(0, Math.min(total, n)) }; return s; });
  return (
    <div className="card">
      <h2 className="sec">Class features</h2>
      <p className="small muted">Tap to spend a use. Short and long rests (Main tab) restore them.</p>
      {list.map(({ def, total }) => {
        const u = used(def.id);
        const left = total - u;
        return (
          <div key={def.id} style={{ borderBottom: '1px solid var(--rule)', padding: '9px 0' }}>
            <div className="row between">
              <div style={{ minWidth: 0 }}><b>{def.label}</b> <span className="chip">{def.rest === 'short' ? 'Short rest' : 'Long rest'}</span></div>
              <b style={{ fontFamily: 'var(--display)', fontSize: 20 }}>{left}/{total}</b>
            </div>
            {def.note && <div className="small muted">{def.note}</div>}
            {total <= 12 ? (
              <div className="pips">{Array.from({ length: total }, (_, i) => (
                <button key={i} className={i < u ? 'used' : ''} aria-label={`use ${i + 1}`} onClick={() => setUsed(def.id, i < u ? i : i + 1, total)} />))}</div>
            ) : (
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn sm" onClick={() => setUsed(def.id, u + 1, total)}>Spend 1</button>
                <button className="btn sm" onClick={() => setUsed(def.id, u + 5, total)}>Spend 5</button>
                <button className="btn sm" onClick={() => setUsed(def.id, u - 1, total)}>Restore 1</button>
              </div>
            )}
          </div>);
      })}
    </div>
  );
}

import React, { useState } from 'react';
import { BOX_TYPES, RARITIES } from '../character.js';

const RCOL = { Bronze: '#c58a5a', Silver: '#aab2bd', Gold: '#e3b33a', Legendary: '#9b5de5', Celestial: '#4fd1c5' };

export default function LootTab({ st, update }) {
  const [ach, setAch] = useState('');
  const [log, setLog] = useState('');
  const box = (t, r) => st.boxes?.[`${t}|${r}`] || { earned: 0, opened: 0 };
  const waiting = BOX_TYPES.flatMap((t) => RARITIES.map((r) => ({ t, r, n: box(t, r).earned - box(t, r).opened }))).filter((x) => x.n > 0);

  const earn = (t, r) => update((s) => { const k = `${t}|${r}`; const b = { ...(s.boxes?.[k] || { earned: 0, opened: 0 }) }; b.earned += 1; s.boxes = { ...(s.boxes || {}), [k]: b }; s.boxLog = [{ text: `Earned a ${r} ${t} Box`, floor: s.floor, at: Date.now() }, ...(s.boxLog || [])]; return s; });
  const openBox = (t, r) => update((s) => { const k = `${t}|${r}`; const b = { ...(s.boxes?.[k] || { earned: 0, opened: 0 }) }; if (b.opened >= b.earned) return s; b.opened += 1; s.boxes = { ...(s.boxes || {}), [k]: b }; s.boxLog = [{ text: `Opened a ${r} ${t} Box`, floor: s.floor, at: Date.now() }, ...(s.boxLog || [])]; return s; });
  const undo = (t, r) => update((s) => { const k = `${t}|${r}`; const b = { ...(s.boxes?.[k] || { earned: 0, opened: 0 }) }; if (b.earned > b.opened) b.earned -= 1; else if (b.opened > 0) { b.opened -= 1; } s.boxes = { ...(s.boxes || {}), [k]: b }; return s; });

  return (
    <>
      <div className="card dark">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Audience Meter</h2><span className="chip pink">{st.audience || 0} / 10</span></div>
        <div className="row" style={{ gap: 6, marginTop: 10 }}>{Array.from({ length: 10 }, (_, i) => (
          <button key={i} onClick={() => update({ audience: st.audience === i + 1 ? i : i + 1 })}
            style={{ flex: 1, height: 26, borderRadius: 13, border: '1.5px solid #72f0dc', background: i < (st.audience || 0) ? '#72f0dc' : 'transparent' }} />))}</div>
        <p className="small" style={{ color: '#bdb8cc', marginBottom: 0 }}>At 10 you get a Fan Box: mark it below and reset the meter.</p>
        <label className="small" style={{ display: 'block', marginTop: 8, color: '#ffb36b' }}><input type="checkbox" checked={!!st.pk} onChange={(e) => update({ pk: e.target.checked })} /> Player Killer mark</label>
      </div>

      {!!waiting.length && (
        <div className="card">
          <h2 className="sec">Waiting to open ({waiting.reduce((t, x) => t + x.n, 0)})</h2>
          <p className="small muted">Open boxes in a safe room. Unopened boxes are lost if you die.</p>
          <div className="list">{waiting.map((x) => (
            <div className="li" key={x.t + x.r}>
              <span className="chip" style={{ background: RCOL[x.r], color: '#111' }}>{x.r}</span>
              <div className="grow"><b>{x.t} Box</b>{x.n > 1 && <span className="muted"> ×{x.n}</span>}</div>
              <button className="btn sm primary" onClick={() => openBox(x.t, x.r)}>Open</button>
            </div>))}</div>
        </div>
      )}

      <div className="card">
        <h2 className="sec">Loot boxes</h2>
        <p className="small muted">Tap a count when the System gives you a box. The small line shows how many you've opened; tap it to undo.</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="boxgrid">
            <thead><tr><th style={{ textAlign: 'left' }}>Box</th>{RARITIES.map((r) => <th key={r} style={{ background: RCOL[r] }}>{r.slice(0, 4)}</th>)}</tr></thead>
            <tbody>{BOX_TYPES.map((t) => (
              <tr key={t}><td className="n">{t}</td>{RARITIES.map((r) => {
                const b = box(t, r);
                return <td key={r}><div className="cnt">
                  <button className={b.earned - b.opened > 0 ? 'has' : ''} onClick={() => earn(t, r)}>{b.earned}</button>
                  <small onClick={() => undo(t, r)}>{b.opened} open · −</small></div></td>;
              })}</tr>))}</tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="sec">Achievements and titles</h2>
        <div className="row"><input className="f" value={ach} onChange={(e) => setAch(e.target.value)} placeholder="e.g. Boom: first explosive kill" />
          <button className="btn dark" onClick={() => { if (ach.trim()) { update((s) => { s.achievements = [{ text: ach.trim(), floor: s.floor, at: Date.now() }, ...(s.achievements || [])]; return s; }); setAch(''); } }}>Add</button></div>
        <div className="list" style={{ marginTop: 8 }}>{(st.achievements || []).map((a, i) => (
          <div className="li" key={a.at + '-' + i}><div className="grow">{a.text}<div className="small muted">Floor {a.floor}</div></div>
            <button className="btn sm" onClick={() => update((s) => { s.achievements.splice(i, 1); return s; })}>×</button></div>))}</div>
      </div>

      <div className="card">
        <h2 className="sec">Box log</h2>
        <div className="row"><input className="f" value={log} onChange={(e) => setLog(e.target.value)} placeholder="What was in it?" />
          <button className="btn dark" onClick={() => { if (log.trim()) { update((s) => { s.boxLog = [{ text: log.trim(), floor: s.floor, at: Date.now() }, ...(s.boxLog || [])]; return s; }); setLog(''); } }}>Add</button></div>
        <div className="list" style={{ marginTop: 8 }}>{(st.boxLog || []).slice(0, 60).map((e, i) => (
          <div className="li" key={e.at + '-' + i}><div className="grow">{e.text}<div className="small muted">Floor {e.floor}</div></div></div>))}</div>
      </div>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { wildShapeCrCap, wildShapeTempHp, classResources } from '../ttf.js';
import { wildShapeOnMap, revertOnMap } from '../session.js';
import { useRoller } from '../roller.jsx';
import { Modal } from '../bits.jsx';
import { mod, sign } from '../rules.js';

const crValue = (cr) => {
  const s = String(cr ?? '').trim();
  if (s.includes('/')) { const [a, b] = s.split('/').map(Number); return b ? a / b : 0; }
  return Number(s) || 0;
};
// 2024 Wild Shape: CR 1/4 (level 2), 1/2 (4), 1 (8). Circle of the Moon: druid level ÷ 3.
function crCap(level, sub) {
  const moon = wildShapeCrCap(level, sub);
  const base = level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25;
  return moon != null ? Math.max(base, moon) : base;
}
const formsKnown = (level) => (level >= 8 ? 8 : level >= 4 ? 6 : 4);

// Attack bonus and damage read from a stat block action's text.
export function parseAction(a) {
  const t = String(a.desc || a.description || '');
  const hit = t.match(/([+-]\d+)\s*to hit/i) || t.match(/Attack Roll:\s*([+-]\d+)/i);
  const dmg = t.match(/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*(\w+)\s*damage/i) || t.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(\w+)\s*damage/i);
  return { hit: hit ? Number(hit[1]) : null, expr: dmg ? dmg[1].replace(/\s+/g, '') : '', type: dmg ? dmg[2] : '' };
}

export default function WildShape({ st, d, update, conn, charId }) {
  const roll = useRoller();
  const level = d.classes.Druid?.level || 0;
  const sub = d.classes.Druid?.subclass || '';
  const [forms, setForms] = useState([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const ids = (st.wildForms || []).map((f) => f.id);
  const use = classResources(st, d).find((r) => r.def.id === 'wild-shape');
  const usesLeft = use ? use.total - ((st.resources || {})['wild-shape'] || 0) : 0;

  useEffect(() => {
    let gone = false;
    Promise.all(ids.map((id) => api.get(conn.server, id).catch(() => null))).then((rows) => { if (!gone) setForms(rows.filter(Boolean)); });
    return () => { gone = true; };
  }, [ids.join(','), conn.server]); // eslint-disable-line react-hooks/exhaustive-deps

  if (level < 2) return null;
  const shape = st.shape;
  const current = shape ? forms.find((f) => f.id === shape.id) : null;

  async function transform(f) {
    if (usesLeft < 1) { alert('No Wild Shape uses left.'); return; }
    const temp = Math.min(9999, wildShapeTempHp(level, sub) || level);
    update((s) => {
      s.resources = { ...(s.resources || {}), 'wild-shape': ((s.resources || {})['wild-shape'] || 0) + 1 };
      s.shape = { id: f.id, name: f.name, since: Date.now() };
      s.hp.temp = Math.max(s.hp.temp || 0, temp);
      return s;
    });
    if (conn.session && charId) {
      setBusy('Transforming on the map…');
      try { await wildShapeOnMap(conn, charId, f.id); setBusy(''); } catch (e) { setBusy(`Sheet updated, but the map token was not: ${e.message}`); }
    }
  }
  async function revert() {
    update((s) => { s.shape = null; return s; });
    if (conn.session && charId) { try { await revertOnMap(conn, charId); } catch { /* token not on map */ } }
  }

  return (
    <div className="card">
      <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Wild Shape</h2>
        <span className="chip teal">{usesLeft}/{use?.total || 0} uses</span></div>
      <p className="small muted">Forms known: {ids.length}/{formsKnown(level)} · max CR {crCap(level, sub) < 1 ? `1/${Math.round(1 / crCap(level, sub))}` : crCap(level, sub)}{level < 8 ? ' · no fly speed' : ''}. Temp HP on transforming: {wildShapeTempHp(level, sub) || level}.{!conn.session ? ' Connect with a session code to change your token on the map too.' : ''}</p>
      {busy && <div className="warn">{busy}</div>}
      {shape && (
        <div className="sys">
          You are a <b>{shape.name}</b>. You keep your Int, Wis, Cha, skills and saves; use the form's other stats and attacks.
          <div style={{ marginTop: 8 }}><button className="btn sm primary" onClick={revert}>Revert to your own form</button></div>
        </div>)}
      {forms.map((f) => {
        const on = shape?.id === f.id;
        const acts = (Array.isArray(f.actions) ? f.actions : []).map((a) => ({ a, p: parseAction(a) }));
        return (
          <details key={f.id} className="feat" open={on}>
            <summary><span>{f.name}{on ? ' (current)' : ''}</span><span className="small muted">CR {f.challenge_rating} · AC {f.armor_class} · HP {f.hit_points}</span></summary>
            <div className="small muted">Speed {f.speed_walk || 0} ft{f.speed_fly ? `, fly ${f.speed_fly}` : ''}{f.speed_swim ? `, swim ${f.speed_swim}` : ''}{f.speed_climb ? `, climb ${f.speed_climb}` : ''}
              {' · '}STR {f.strength} ({sign(mod(f.strength))}) DEX {f.dexterity} ({sign(mod(f.dexterity))}) CON {f.constitution} ({sign(mod(f.constitution))})</div>
            {acts.map(({ a, p }, i) => (
              <div className="row" key={i} style={{ margin: '6px 0' }}>
                <div style={{ flex: 1 }} className="small"><b>{a.name}.</b> {String(a.desc || '').slice(0, 160)}</div>
                {p.hit != null && <button className="roll" onClick={() => roll.test(`${f.name} ${a.name}`, p.hit, { damage: p.expr ? { label: `${a.name} damage`, expr: p.expr, type: p.type } : null })}>{sign(p.hit)}</button>}
                {p.expr && <button className="roll alt" onClick={() => roll.damage(`${f.name} ${a.name}`, p.expr, { type: p.type })}>Dmg</button>}
              </div>))}
            <div className="row" style={{ marginTop: 6 }}>
              {!on && <button className="btn sm primary" disabled={usesLeft < 1} onClick={() => transform(f)}>Transform</button>}
              <button className="btn sm" onClick={() => update((s) => { s.wildForms = (s.wildForms || []).filter((x) => x.id !== f.id); return s; })}>Forget form</button>
            </div>
          </details>);
      })}
      <button className="btn sm dark" style={{ marginTop: 8 }} disabled={ids.length >= formsKnown(level)} onClick={() => setAdding(true)}>+ Learn a form</button>
      {adding && <FormPicker conn={conn} cap={crCap(level, sub)} fly={level >= 8} known={ids} onClose={() => setAdding(false)}
        onPick={(c) => { update((s) => { s.wildForms = [...(s.wildForms || []), { id: c.id, name: c.name }]; return s; }); setAdding(false); }} />}
    </div>
  );
}

function FormPicker({ conn, cap, fly, known, onClose, onPick }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);   // compendium results
  const [lib, setLib] = useState([]);       // creatures already in the TTF library
  const [any, setAny] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setRows(null); return undefined; }
    const t = setTimeout(() => {
      setErr('');
      api.compendiumSearch(conn.server, q.trim()).then((r) => setRows(r.results || [])).catch((e) => { setErr(e.message); setRows([]); });
      api.creatures(conn.server, { filter: 'monsters', search: q.trim() }).then(setLib).catch(() => setLib([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, conn.server]);

  const typeOk = (t) => any || /beast/i.test(t || '');
  // One row per name: prefer the 2025 Monster Manual (XMM), then the 2014 Monster Manual.
  const best = new Map();
  for (const r of rows || []) {
    if (!typeOk(r.type) || crValue(r.cr) > cap) continue;
    const k = r.name.toLowerCase(); const held = best.get(k);
    const rank = (x) => (x.source === 'XMM' ? 0 : x.source === 'MM' ? 1 : 2);
    if (!held || rank(r) < rank(held)) best.set(k, r);
  }
  const list = [...best.values()].sort((a, b) => crValue(a.cr) - crValue(b.cr) || a.name.localeCompare(b.name)).slice(0, 80);
  const libList = lib.filter((c) => (any || /beast/i.test(c.creature_type || '')) && crValue(c.challenge_rating) <= cap && (fly || !(Number(c.speed_fly) > 0)) && !known.includes(c.id));

  async function pickCompendium(r) {
    setBusy(`Fetching ${r.name}…`); setErr('');
    try {
      const got = await api.compendiumGet(conn.server, r.source, r.name);
      const c = got.creature || got;
      if (!fly && Number(c.speed_fly) > 0) { setErr(`${c.name} has a fly speed. Druids can take forms with a fly speed from level 8.`); setBusy(''); return; }
      // Reuse the library copy if the GM already has one, otherwise add it (as Tabletop Forge does).
      const existing = (await api.creatures(conn.server, { filter: 'monsters', search: c.name })).find((x) => x.name === c.name);
      const row = existing || await api.create(conn.server, { ...c, is_player_character: false, wildshape_eligible: true });
      setBusy(''); onPick(row);
    } catch (e) { setErr(e.message); setBusy(''); }
  }

  return (
    <Modal title="Learn a Wild Shape form" onClose={onClose}>
      <p className="small muted">Search the 5eTools bestiary through Tabletop Forge. Shown: beasts of CR {cap < 1 ? `1/${Math.round(1 / cap)}` : cap} or lower{fly ? '' : ' (no fly speed until level 8)'}.</p>
      <input className="f search-in" placeholder="Search beasts (e.g. wolf, bear, spider)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <label className="small"><input type="checkbox" checked={any} onChange={(e) => setAny(e.target.checked)} /> Show non-beasts too (GM allows)</label>
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      {busy && <div className="warn" style={{ marginTop: 8 }}>{busy}</div>}
      {libList.length > 0 && <><h3 className="it" style={{ marginTop: 12 }}>In your GM's library</h3>
        {libList.map((c) => (
          <button key={c.id} className="optcard" onClick={() => onPick(c)}>
            <b>{c.name}</b><span className="small muted">CR {c.challenge_rating} · AC {c.armor_class} · HP {c.hit_points}</span>
          </button>))}</>}
      {q.trim().length < 2 && <p className="small muted">Type at least 2 letters to search.</p>}
      {rows && <h3 className="it" style={{ marginTop: 12 }}>5eTools bestiary</h3>}
      {rows && !list.length && <p className="small muted">No beasts match within your CR limit.</p>}
      {list.map((r) => (
        <button key={r.source + r.name} className="optcard" onClick={() => pickCompendium(r)}>
          <b>{r.name}</b><span className="small muted">CR {r.cr} · {r.type} · {r.size} · {r.source}</span>
        </button>))}
    </Modal>
  );
}

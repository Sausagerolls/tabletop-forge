import React, { useEffect, useMemo, useState } from 'react';
import { ABILITIES, ABILITY_NAME } from './rules.js';
import { Modal, Pick } from './bits.jsx';
import { featChoices, featDone, resolveCount, resolveList, syncFeatSpells } from './featRules.js';
import { loadSpells, onList, isRitual, snapSpell } from './spells.js';

const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const toggle = (list, x, max) => (list.includes(x) ? list.filter((y) => y !== x) : list.length < max ? [...list, x] : list);

// Make the choices a feat asks for (Magic Initiate's list, ability and spells,
// Skilled's three skills, an Ability Score Increase...). Spells a feat teaches
// go straight into the tome, ignoring the tome spell level limit.
export default function FeatEditor({ feat, st, d, conn, update, onClose }) {
  const choices = featChoices(feat);
  const [v, setV] = useState(() => ({ ...(feat.choices || {}) }));
  const [picked, setPicked] = useState(() => {
    const out = {};
    st.spells.filter((x) => x.featUid === feat.uid).forEach((x) => { (out[x.featKey] = out[x.featKey] || []).push(x); });
    return out;
  });
  const [lib, setLib] = useState(null);
  const [err, setErr] = useState('');
  const needsSpells = choices.some((c) => c.kind === 'spells');
  useEffect(() => {
    if (!needsSpells) return;
    loadSpells(conn).then(setLib).catch((e) => { setErr(e.message); setLib([]); });
  }, [needsSpells, conn]);

  // Fixed spells (Misty Step, Invisibility, Mage Hand) come with the feat.
  useEffect(() => {
    if (!lib) return;
    setPicked((p) => {
      const next = { ...p };
      for (const c of choices.filter((x) => x.kind === 'spells' && (x.fixed || []).length)) {
        const fixed = c.fixed.map((n) => lib.find((sp) => sp.name.toLowerCase() === n.toLowerCase())).filter(Boolean);
        const rest = (next[c.key] || []).filter((sp) => !c.fixed.includes(sp.name));
        next[c.key] = [...fixed, ...rest];
      }
      return next;
    });
  }, [lib]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, x) => setV((o) => ({ ...o, [k]: x }));
  const proficient = d.skillRows.filter((r) => r.prof).map((r) => r.name);
  const done = featDone({ ...feat, choices: v }, d, picked);

  const save = () => {
    update((s) => {
      const f = s.feats.find((x) => x.uid === feat.uid);
      if (!f) return s;
      f.choices = v;
      syncFeatSpells(s, f, picked, snapSpell);
      if (v.tools && !String(s.tools || '').includes(v.tools)) s.tools = [s.tools, v.tools].filter(Boolean).join(', ');
      return s;
    });
    onClose();
  };

  return (
    <Modal title={feat.name} onClose={onClose}>
      <div className="small muted" style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>{feat.desc}</div>
      {!choices.length && <p className="small">This feat has no choices to make.</p>}
      {err && <div className="err">{err}</div>}
      {choices.map((c) => {
        const x = v[c.key];
        let body = null;
        if (c.kind === 'ability') {
          const cur = Array.isArray(x) ? x : [];
          body = <div className="chips">{c.options.filter((a) => !c.save || !d.saves.includes(a) || cur.includes(a)).map((a) => <Pick key={a} on={cur.includes(a)} onClick={() => set(c.key, toggle(cur, a, c.count))}>{ABILITY_NAME[a]}</Pick>)}</div>;
        } else if (c.kind === 'asi') {
          const cur = Array.isArray(x) ? x : [];
          const two = cur.length === 1 && cur[0].endsWith('+2');
          body = <>
            <div className="chips">{ABILITIES.map((a) => <Pick key={a} on={cur.includes(`${a}+2`)} onClick={() => set(c.key, [`${a}+2`])}>{a} +2</Pick>)}</div>
            <div className="chips">{ABILITIES.map((a) => <Pick key={a} on={cur.includes(`${a}+1`)} onClick={() => set(c.key, toggle(two ? [] : cur, `${a}+1`, 2))}>{a} +1</Pick>)}</div>
          </>;
        } else if (c.kind === 'pick') {
          body = <div className="chips">{c.options.map((o) => <Pick key={o} on={x === o} onClick={() => { set(c.key, o); if (c.key === 'list') setPicked({}); }}>{ABILITY_NAME[o] || o}</Pick>)}</div>;
        } else if (c.kind === 'multi') {
          const cur = Array.isArray(x) ? x : [];
          body = <div className="chips">{c.options.map((o) => <Pick key={o} on={cur.includes(o)} onClick={() => set(c.key, toggle(cur, o, c.count))}>{o}</Pick>)}</div>;
        } else if (c.kind === 'skills') {
          const cur = Array.isArray(x) ? x : [];
          const from = c.from === '@proficient' ? [...new Set([...proficient, ...(v.skill || [])])] : c.from;
          body = <div className="chips">{from.filter((s) => c.expertise || c.upgrade || !proficient.includes(s) || cur.includes(s)).map((s) => (
            <Pick key={s} on={cur.includes(s)} onClick={() => set(c.key, toggle(cur, s, c.count))}>{s}{c.upgrade && proficient.includes(s) ? ' (Expertise)' : ''}</Pick>))}</div>;
        } else if (c.kind === 'text') {
          body = <input className="f" value={x || ''} onChange={(e) => set(c.key, e.target.value)} />;
        } else if (c.kind === 'spells') {
          body = <SpellPicks c={c} v={v} d={d} lib={lib} picked={picked[c.key] || []} onChange={(rows) => setPicked((p) => ({ ...p, [c.key]: rows }))} />;
        }
        return (
          <div key={c.key} className="choice">
            <span className="lab">{c.label}</span>
            {body}
          </div>);
      })}
      <button className="btn primary block" disabled={!done} onClick={save}>Save choices</button>
    </Modal>
  );
}

function SpellPicks({ c, v, d, lib, picked, onChange }) {
  const [q, setQ] = useState('');
  const list = resolveList(c, v);
  const count = resolveCount(c, d);
  const fixed = picked.filter((sp) => (c.fixed || []).includes(sp.name));
  const own = picked.filter((sp) => !(c.fixed || []).includes(sp.name));
  const pool = useMemo(() => (lib || []).filter((sp) => sp.level === c.level
    && (!c.list || (list && onList(sp, list)))
    && (!c.school || c.school.test(sp.school || ''))
    && (!c.ritual || isRitual(sp))
    && sp.name.toLowerCase().includes(q.toLowerCase())), [lib, c, list, q]);
  if (c.list && !list) return <p className="small muted">Choose the spell list first.</p>;
  if (!lib) return <p className="small muted">Loading spells…</p>;
  return (
    <>
      {fixed.length > 0 && <div className="chips">{fixed.map((sp) => <span key={sp.id} className="chip teal">{sp.name}</span>)}</div>}
      {count > 0 && <>
        <div className="small muted">{own.length}/{count} chosen{own.length ? `: ${own.map((sp) => sp.name).join(', ')}` : ''} · {ORD[c.level]}{list ? ` · ${list} list` : ''}</div>
        <input className="f search-in" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" style={{ maxHeight: 220, overflowY: 'auto' }}>{pool.slice(0, 200).map((sp) => {
          const on = own.some((x) => x.id === sp.id);
          return <Pick key={sp.id} on={on} onClick={() => onChange([...fixed, ...(on ? own.filter((x) => x.id !== sp.id) : own.length < count ? [...own, sp] : own)])}>{sp.name}</Pick>;
        })}</div>
      </>}
    </>
  );
}

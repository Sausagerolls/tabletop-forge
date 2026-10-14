import React from 'react';
import { SKILLS } from './rules.js';
import { WEAPONS, FEATS } from './ttf.js';
import { classChoicesFor, choiceIsExpertise, skillName, speciesChoices } from './choices.js';
import { Pick } from './bits.jsx';

const ALL_SKILLS = SKILLS.map(([s]) => s);
const toggle = (list, x, max) => (list.includes(x) ? list.filter((y) => y !== x) : list.length < max ? [...list, x] : list);

// The choices a class asks for between two class levels, e.g. the Druid's
// Primal Order (Magician or Warden) and two skills at level 1.
export function ClassChoiceFields({ cls, level, fromLevel = 1, skip = [], value = {}, onChange, have = [] }) {
  const list = classChoicesFor(cls, level).filter((c) => c.kind !== 'auto' && (c.at_level || 1) >= fromLevel && !skip.includes(c.id));
  if (!list.length) return null;
  const set = (id, v) => onChange({ ...value, [id]: v });
  const classSkills = Array.isArray(value['class-skills']) ? value['class-skills'] : [];
  return list.map((c) => {
    const v = value[c.id];
    const n = c.pick_count || 1;
    let body = null;
    if (c.kind === 'single') {
      body = (c.options || []).map((o) => (
        <button key={o.id} type="button" className={`optcard${v === o.id ? ' on' : ''}`} onClick={() => set(c.id, o.id)}>
          <b>{o.name}</b><span className="small muted">{o.desc}</span></button>));
    } else if (c.kind === 'multi-skills') {
      let pool;
      if (choiceIsExpertise(c)) {
        // Expertise needs proficiency first. Wizard Scholar names its own list.
        const named = (String(c.desc).match(/from ([A-Z][^.]+?)\. /) || [])[1];
        const owned = [...new Set([...have, ...classSkills])];
        pool = named ? owned.filter((s) => named.includes(s)) : owned;
        if (named && !pool.length) pool = ALL_SKILLS.filter((s) => named.includes(s));
      } else {
        pool = (c.from ? c.from.map(skillName) : ALL_SKILLS).filter((s) => !have.includes(s));
      }
      const cur = Array.isArray(v) ? v : [];
      body = <div className="chips">{pool.map((s) => <Pick key={s} on={cur.includes(s)} onClick={() => set(c.id, toggle(cur, s, n))}>{s}</Pick>)}
        {!pool.length && <span className="small muted">No skills qualify yet.</span>}</div>;
    } else if (c.kind === 'multi-weapons') {
      const cur = Array.isArray(v) ? v : [];
      body = <div className="chips">{WEAPONS.map((w) => <Pick key={w.name} on={cur.includes(w.name)} onClick={() => set(c.id, toggle(cur, w.name, n))}>{w.name}{w.mastery ? ` · ${w.mastery}` : ''}</Pick>)}</div>;
    }
    const count = c.kind === 'single' ? (v ? 1 : 0) : (Array.isArray(v) ? v.length : 0);
    return (
      <div key={c.id} className="choice">
        <span className="lab">{cls} {c.at_level > 1 ? `level ${c.at_level}: ` : ''}{c.label}{c.kind !== 'single' ? ` (${count}/${n})` : ''}</span>
        <p className="small muted" style={{ margin: '2px 0 6px' }}>{c.desc}</p>
        {body}
      </div>);
  });
}

// What a species asks for: size, a skill (Human Skillful), an Origin feat
// (Human Versatile), a spellcasting ability, a damage resistance.
export function SpeciesChoiceFields({ id, subId, value = {}, onChange, have = [] }) {
  const list = speciesChoices(id, subId);
  if (!list.length) return null;
  const set = (k, v) => onChange({ ...value, [k]: v });
  return list.map((c) => {
    const v = value[c.id];
    let body;
    if (c.kind === 'single') body = <div className="chips">{c.options.map((o) => <Pick key={o} on={v === o} onClick={() => set(c.id, o)}>{o}</Pick>)}</div>;
    else if (c.kind === 'skills') {
      const cur = Array.isArray(v) ? v : [];
      body = <div className="chips">{c.from.filter((s) => !have.includes(s) || cur.includes(s)).map((s) => <Pick key={s} on={cur.includes(s)} onClick={() => set(c.id, toggle(cur, s, c.count))}>{s}</Pick>)}</div>;
    } else if (c.kind === 'feat') {
      body = <select className="f" value={v || ''} onChange={(e) => set(c.id, e.target.value)}>
        <option value="">Choose an Origin feat…</option>
        {FEATS.filter((f) => f.category === 'origin').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>;
    }
    return (
      <div key={c.id} className="choice">
        <span className="lab">{c.label}{c.kind === 'skills' ? ` (${(Array.isArray(v) ? v.length : 0)}/${c.count})` : ''}</span>
        {body}
      </div>);
  });
}

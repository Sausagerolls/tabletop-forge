import React, { useState } from 'react';
import { ABILITIES, ABILITY_NAME, sign } from '../rules.js';
import { useRoller, AdvBar } from '../roller.jsx';
import { SKILL_DATA, findSkill } from '../character.js';
import { SkillCard, Pick, Modal } from '../bits.jsx';

const DRILLS = ['Martial weapons', 'Firearms', 'Medium armor', 'Heavy armor', 'Shields'];

export default function SkillsTab({ st, d, update }) {
  const roll = useRoller();
  const [checksOpen, setChecksOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState(null); // 'montage' | 'drill'
  const [cat, setCat] = useState('All');
  const [montage, setMontage] = useState(['', '']);

  const setLevel = (name, level) => update((s) => {
    const sk = s.crawlerSkills.find((x) => x.name === name);
    sk.level = Math.max(1, Math.min(sk.limitBreaker ? 20 : 15, level));
    return s;
  });
  const usePick = (fn) => update((s) => { if (s.skillPicksUnspent < 1) return s; s.skillPicksUnspent -= 1; fn(s); return s; });
  const known = new Set(st.crawlerSkills.map((s) => s.name));

  return (
    <>
      <div className="card">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Abilities</h2>
          {st.statPointsUnspent > 0 && <span className="chip pink">{st.statPointsUnspent} Stat Point{st.statPointsUnspent > 1 ? 's' : ''} to spend</span>}</div>
        <p className="small muted">Tap the modifier for a check, or Save for a saving throw (● = proficient).</p>
        <AdvBar />
        <div className="grid6" style={{ marginTop: 10 }}>{ABILITIES.map((a) => (
          <div className="abil" key={a}>
            <div className="n">{ABILITY_NAME[a]}</div>
            <div className="s">{d.scores[a]}</div>
            <button className="m" onClick={() => roll.test(`${ABILITY_NAME[a]} check`, d.m[a])}>{sign(d.m[a])}</button>
            <button className={`savebtn${d.saves.includes(a) ? ' prof' : ''}`} onClick={() => roll.test(`${ABILITY_NAME[a]} save`, d.m[a] + (d.saves.includes(a) ? d.pb : 0))}>
              Save {sign(d.m[a] + (d.saves.includes(a) ? d.pb : 0))}</button>
            {st.statPointsUnspent > 0 && (
              <div><button className="btn sm primary" style={{ marginTop: 6 }} onClick={() => update((s) => { s.scores[a] += 1; s.statPointsUnspent -= 1; return s; })}>+1</button></div>
            )}
          </div>))}</div>
      </div>

      <details className="card skillbox" open={checksOpen} onToggle={(e) => setChecksOpen(e.currentTarget.open)}>
        <summary><h2 className="sec" style={{ margin: 0 }}>Skill checks</h2><span className="small muted" style={{ marginLeft: 'auto', marginRight: 8 }}>Passive Perception {d.passive}</span></summary>
        <p className="small muted" style={{ margin: '8px 0 4px' }}>Tap a skill to roll it. ● proficient · ◆ expertise.</p>
        {d.skillRows.map((r) => (
          <button key={r.name} type="button" className="skillrow" onClick={() => roll.test(r.name, r.bonus)}>
            <span style={{ width: 14, color: 'var(--pink)' }}>{r.exp ? '◆' : r.prof ? '●' : ''}</span>
            <span><b>{r.name}</b> <span className="small muted">{r.ab}</span></span>
            <span className="b">{sign(r.bonus)}</span>
          </button>))}
      </details>

      <div className="card dark">
        <h2 className="sec">Skill Picks: {st.skillPicksUnspent}</h2>
        <p className="small" style={{ color: '#bdb8cc' }}>You get a Skill Pick at every odd level. The GM can also award Skill Levels when you use a Crawler Skill well: use + on the skill.</p>
        <div className="row wrap">
          <button className="btn primary sm" disabled={st.skillPicksUnspent < 1} onClick={() => setAdding(true)}>Learn a skill</button>
          <button className="btn sm" disabled={st.skillPicksUnspent < 1} onClick={() => setMode('montage')}>Training Montage</button>
          <button className="btn sm" disabled={st.skillPicksUnspent < 1} onClick={() => setMode('drill')}>Drill</button>
        </div>
        <p className="small" style={{ color: '#bdb8cc', marginBottom: 0 }}>To Train a skill with a pick, use "Train" on its card.</p>
      </div>

      {!st.crawlerSkills.length && <div className="sys">No Crawler Skills yet. Spend a Skill Pick to learn one.</div>}
      {st.crawlerSkills.map((k) => {
        const sk = findSkill(k.name);
        if (!sk) return null;
        const cap = k.limitBreaker ? 20 : 15;
        return (
          <SkillCard key={k.name} skill={sk} level={k.level} limitBreaker={k.limitBreaker}>
            <div style={{ textAlign: 'right' }}>
              <div className="lvbadge">{k.level}</div>
              <div className="row" style={{ marginTop: 6, gap: 4 }}>
                <button className="btn sm" onClick={() => setLevel(k.name, k.level - 1)}>−</button>
                <button className="btn sm dark" disabled={k.level >= cap} onClick={() => setLevel(k.name, k.level + 1)}>+</button>
              </div>
              <button className="btn sm primary" style={{ marginTop: 4 }} disabled={st.skillPicksUnspent < 1 || k.level >= cap}
                onClick={() => usePick((s) => { const x = s.crawlerSkills.find((y) => y.name === k.name); x.level = Math.min(cap, x.level + 1); })}>Train</button>
              {k.level >= 15 && (
                <label className="small" style={{ display: 'block', marginTop: 6 }}>
                  <input type="checkbox" checked={!!k.limitBreaker} onChange={(e) => update((s) => { const x = s.crawlerSkills.find((y) => y.name === k.name); x.limitBreaker = e.target.checked; if (!e.target.checked) x.level = Math.min(15, x.level); return s; })} /> Limit Breaker
                </label>)}
            </div>
          </SkillCard>
        );
      })}
      {st.drills.length > 0 && <div className="card"><h2 className="sec">Drills</h2><div className="chips">{st.drills.map((d) => <span className="chip" key={d}>{d}</span>)}</div></div>}

      {adding && (
        <Modal title="Learn a Crawler Skill" onClose={() => setAdding(false)}>
          <div className="chips">{['All', 'Combat', 'Survival', 'Utility', 'Showmanship', 'Magic'].map((c) => <Pick key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Pick>)}</div>
          {SKILL_DATA.filter((s) => !known.has(s.name) && (cat === 'All' || s.cat === cat)).map((s) => (
            <details key={s.name} className="feat">
              <summary><span>{s.name}</span><span className="small muted">{s.cat}</span></summary>
              <SkillCard skill={s} level={1} />
              <button className="btn primary sm" onClick={() => { usePick((x) => { x.crawlerSkills.push({ name: s.name, level: 1 }); }); setAdding(false); }}>Learn {s.name}</button>
            </details>))}
        </Modal>
      )}
      {mode === 'montage' && (
        <Modal title="Training Montage" onClose={() => setMode(null)}>
          <p>Gain 2 Stat Points, placed now.</p>
          {[0, 1].map((i) => <div className="chips" key={i}>{ABILITIES.map((a) => <Pick key={a} on={montage[i] === a} onClick={() => { const m = [...montage]; m[i] = a; setMontage(m); }}>{a}</Pick>)}</div>)}
          <button className="btn primary" disabled={!montage[0] || !montage[1]} onClick={() => { usePick((s) => { montage.forEach((a) => { s.scores[a] += 1; }); }); setMode(null); setMontage(['', '']); }}>Train</button>
        </Modal>
      )}
      {mode === 'drill' && (
        <Modal title="Drill" onClose={() => setMode(null)}>
          <p>Gain proficiency with one category.</p>
          {DRILLS.filter((d) => !st.drills.includes(d)).map((d) => (
            <button key={d} className="optcard" onClick={() => { usePick((s) => { s.drills.push(d); }); setMode(null); }}><b>{d}</b></button>))}
        </Modal>
      )}
    </>
  );
}

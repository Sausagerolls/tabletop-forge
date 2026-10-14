import React, { useState } from 'react';
import { ABILITIES, ABILITY_NAME, SKILLS, mod, sign, HEAL_SELF } from './rules.js';
import { BACKGROUNDS, findBackground, skillLabel } from './ttf.js';
import { SKILL_DATA, findSkill, derive } from './character.js';
import { Pick, SkillCard } from './bits.jsx';

const STEPS = ['Who you were', 'Ability scores', 'Proficiencies', 'First Skill Pick', 'Ready'];
const DRILLS = ['Martial weapons', 'Firearms', 'Medium armor', 'Shields'];

export default function Builder({ st: initial, onDone, onCancel }) {
  const [st, setSt] = useState(() => ({ ...initial, base: initial.base || { ...initial.scores } }));
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState({ type: 'learn', skill: '', cat: 'All', montage: ['', ''], drill: '' });
  const [statPoint, setStatPoint] = useState('');
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));

  const base = (a) => (st.lowered === a ? 8 : 10);
  const pool = 6 + (st.lowered ? 2 : 0);
  const spent = ABILITIES.reduce((t, a) => t + (st.base[a] - base(a)), 0);
  const left = pool - spent;
  const bg = findBackground(st.backgroundId);
  const bgSkills = (bg?.skills || []).map(skillLabel);

  function finish() {
    const scores = { ...st.base };
    if (statPoint) scores[statPoint] += 1;
    let skillPicksUnspent = 0;
    const crawlerSkills = [...st.crawlerSkills];
    const drills = [...st.drills];
    if (pick.type === 'learn' && pick.skill) crawlerSkills.push({ name: pick.skill, level: 1 });
    else if (pick.type === 'montage') pick.montage.forEach((a) => { if (a) scores[a] += 1; });
    else if (pick.type === 'drill' && pick.drill) drills.push(pick.drill);
    else skillPicksUnspent = 1;
    const feats = bg?.feat ? [{ name: bg.feat.name, desc: bg.feat.desc, source: `Background: ${bg.name}` }] : [];
    const out = { ...st, scores, crawlerSkills, drills, skillPicksUnspent, statPointsUnspent: statPoint ? 0 : 1,
      bgSkills, tools: [bg?.tool, st.tools].filter(Boolean).join(', '), feats: [...feats, ...st.feats.filter((f) => !String(f.source).startsWith('Background'))],
      spells: st.spells?.length ? st.spells : [{ ...HEAL_SELF }], gold: st.gold || 0 };
    const d = derive(out);
    out.hp = { current: d.hpMax, temp: 0 };
    out.mana = { current: d.manaMax, pact: d.pact.mana, big: [] };
    onDone(out);
  }

  const warn = [];
  if (left > 0) warn.push(`${left} ability points left to spend.`);
  if (!statPoint) warn.push('Your 1st-level Stat Point is not placed (it will be saved for later).');
  if (!st.saveChoice) warn.push('Choose a second saving throw.');
  if (st.skills.length < 2) warn.push('Choose two proficiency skills.');
  if (pick.type === 'learn' && !pick.skill) warn.push('No Crawler Skill chosen (your Skill Pick will be saved for later).');

  return (
    <div>
      <div className="top">
        <div className="t"><div className="k">Create a crawler</div><h1>{st.name || 'New crawler'}</h1></div>
        <button className="iconbtn" onClick={onCancel}>Cancel</button>
      </div>
      <div className="page">
        <div className="steps">{STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : ''} onClick={() => setStep(i)}>{i + 1}. {s}</span>)}</div>

        {step === 0 && (
          <div className="card">
            <h2 className="sec">Who were you?</h2>
            <p className="muted">Crawlers start as ordinary people, in whatever they were wearing when the world ended.</p>
            <Field label="Crawler name"><input className="f" value={st.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Background (2024)">
              <select className="f" value={st.backgroundId} onChange={(e) => { const b = findBackground(e.target.value); set({ backgroundId: e.target.value, background: b?.name || '' }); }}>
                <option value="">Choose a background…</option>
                {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            {bg && (
              <div className="sys" style={{ fontSize: 13 }}>
                {bg.description}<br /><br />
                Skills: {bgSkills.join(', ')} · Tool: {bg.tool}<br />Origin feat: {bg.feat?.name}<br />
                <span style={{ color: '#ffb36b' }}>In the dungeon your Stat Points replace the background's ability increases.</span>
              </div>
            )}
            <Field label="Where were you when the world ended?"><textarea className="f" value={st.where} onChange={(e) => set({ where: e.target.value })} /></Field>
            <Field label="What were you wearing?"><input className="f" value={st.wearing} onChange={(e) => set({ wearing: e.target.value })} /></Field>
            <Field label="Your one pocket item"><input className="f" value={st.pocket} onChange={(e) => set({ pocket: e.target.value })} placeholder="Phone, keys, multitool, a cat…" /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <h2 className="sec">Ability scores</h2>
            <p className="muted">Every score starts at 10. Spend 6 points, none above 14 here.</p>
            <div className="sys">POINTS LEFT: {left} / {pool}</div>
            <span className="lab">Optional: lower one score to 8 for 2 more points</span>
            <div className="chips">{['None', ...ABILITIES].map((a) => (
              <Pick key={a} on={(st.lowered || 'None') === a} onClick={() => {
                const nv = a === 'None' ? '' : a;
                const b = { ...st.base }; if (st.lowered && b[st.lowered] < 10) b[st.lowered] = 10; if (nv) b[nv] = 8;
                const ok = ABILITIES.reduce((t, x) => t + (b[x] - (x === nv ? 8 : 10)), 0) <= 6 + (nv ? 2 : 0);
                set({ lowered: nv, base: ok ? b : Object.fromEntries(ABILITIES.map((x) => [x, x === nv ? 8 : 10])) });
              }}>{a}</Pick>))}</div>
            <div className="grid6">{ABILITIES.map((a) => (
              <div className="abil" key={a}>
                <div className="n">{ABILITY_NAME[a]}</div><div className="s">{st.base[a] + (statPoint === a ? 1 : 0)}</div>
                <div className="m">{sign(mod(st.base[a] + (statPoint === a ? 1 : 0)))}</div>
                <div className="row" style={{ justifyContent: 'center', marginTop: 6 }}>
                  <button className="btn sm" disabled={st.base[a] <= base(a)} onClick={() => set({ base: { ...st.base, [a]: st.base[a] - 1 } })}>−</button>
                  <button className="btn sm" disabled={left <= 0 || st.base[a] >= 14} onClick={() => set({ base: { ...st.base, [a]: st.base[a] + 1 } })}>+</button>
                </div>
              </div>))}</div>
            <h3 className="it" style={{ marginTop: 14 }}>Your 1st-level Stat Point</h3>
            <p className="small muted">+1 to any ability. Every level gives another. There is no cap.</p>
            <div className="chips">{ABILITIES.map((a) => <Pick key={a} on={statPoint === a} onClick={() => setStatPoint(statPoint === a ? '' : a)}>{a}</Pick>)}</div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2 className="sec">Proficiencies</h2>
            <span className="lab">Saving throws: Constitution, plus one</span>
            <div className="chips">{ABILITIES.map((a) => <Pick key={a} lock={a === 'CON'} on={st.saveChoice === a} onClick={() => a !== 'CON' && set({ saveChoice: st.saveChoice === a ? '' : a })}>{a}</Pick>)}</div>
            {!!bgSkills.length && <><span className="lab">From your background</span><div className="chips">{bgSkills.map((s) => <Pick key={s} lock>{s}</Pick>)}</div></>}
            <span className="lab">Choose two skills</span>
            <div className="chips">{SKILLS.map(([n]) => n).filter((n) => !bgSkills.includes(n)).map((n) => (
              <Pick key={n} on={st.skills.includes(n)} onClick={() => {
                const has = st.skills.includes(n);
                if (has) set({ skills: st.skills.filter((x) => x !== n) }); else if (st.skills.length < 2) set({ skills: [...st.skills, n], extraSkill: st.extraSkill === n ? '' : st.extraSkill });
              }}>{n}</Pick>))}</div>
            <span className="lab">Ordinary person: one extra skill</span>
            <div className="chips">{SKILLS.map(([n]) => n).filter((n) => !st.skills.includes(n) && !bgSkills.includes(n)).map((n) => (
              <Pick key={n} on={st.extraSkill === n} onClick={() => set({ extraSkill: st.extraSkill === n ? '' : n })}>{n}</Pick>))}</div>
            <Field label="Tool proficiency (Crawler)"><input className="f" value={st.tools} onChange={(e) => set({ tools: e.target.value })} /></Field>
            <Field label="Languages (Common + one from your old life)"><input className="f" value={st.languages} onChange={(e) => set({ languages: e.target.value })} /></Field>
            <p className="small muted">You can use any armor or weapon. Armor never gives penalties; unfamiliar weapons add half your proficiency bonus (Learning by Doing).</p>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2 className="sec">Your first Skill Pick</h2>
            <div className="chips">{[['learn', 'Learn a Crawler Skill'], ['montage', 'Training Montage'], ['drill', 'Drill']].map(([k, l]) => (
              <Pick key={k} on={pick.type === k} onClick={() => setPick({ ...pick, type: k })}>{l}</Pick>))}</div>
            {pick.type === 'learn' && <>
              <div className="chips">{['All', 'Combat', 'Survival', 'Utility', 'Showmanship', 'Magic'].map((c) => (
                <Pick key={c} on={pick.cat === c} onClick={() => setPick({ ...pick, cat: c })}>{c}</Pick>))}</div>
              {SKILL_DATA.filter((s) => pick.cat === 'All' || s.cat === pick.cat).map((s) => (
                <button key={s.name} className={`optcard${pick.skill === s.name ? ' on' : ''}`} onClick={() => setPick({ ...pick, skill: s.name })}>
                  <b>{s.name}</b><span className="small muted">{s.cat} · {s.key}</span>
                </button>))}
              {findSkill(pick.skill) && <SkillCard skill={findSkill(pick.skill)} level={1} />}
            </>}
            {pick.type === 'montage' && <>
              <p>Gain 2 Stat Points.</p>
              {[0, 1].map((i) => <div className="chips" key={i}>{ABILITIES.map((a) => (
                <Pick key={a} on={pick.montage[i] === a} onClick={() => { const m = [...pick.montage]; m[i] = a; setPick({ ...pick, montage: m }); }}>{a}</Pick>))}</div>)}
            </>}
            {pick.type === 'drill' && <div className="chips">{DRILLS.map((d) => <Pick key={d} on={pick.drill === d} onClick={() => setPick({ ...pick, drill: d })}>{d}</Pick>)}</div>}
          </div>
        )}

        {step === 4 && (
          <div className="card">
            <h2 className="sec">Ready to drop in</h2>
            {warn.length > 0 && <div className="warn">{warn.map((w) => <div key={w}>{w}</div>)}</div>}
            <p>You start with your clothes, your pocket item, 1 day of rations, a waterskin and a potion of healing. You know <b>Heal Self</b>, and you have <b>Scrappy</b> and <b>Will to Live</b>.</p>
            <p className="muted small">You pick a species and a class on Floor 3, from the sheet's Level tab.</p>
            <button className="btn primary block" onClick={finish}>Create {st.name || 'crawler'}</button>
          </div>
        )}

        <div className="row between">
          <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          {step < STEPS.length - 1 && <button className="btn dark" onClick={() => setStep(step + 1)}>Next</button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="field"><span className="lab">{label}</span>{children}</div>;
}

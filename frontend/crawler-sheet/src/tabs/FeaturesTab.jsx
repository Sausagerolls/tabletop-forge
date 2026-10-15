import React, { useState } from 'react';
import { CORE_FEATURES, INCLINATIONS, survivorFeatures } from '../rules.js';
import { classFeatures, subclassFeatures, speciesTraits, FEATS, subclassBlurb } from '../ttf.js';
import { PRESTIGE } from '../character.js';
import { Html, Modal, Pick } from '../bits.jsx';
import { RulesLink } from '../rulesLinks.jsx';
import FeatEditor from '../FeatEditor.jsx';
import { featChoices, featDone, newFeat, featBase } from '../featRules.js';
import { classChoicesFor, choiceDone, speciesChoices, speciesChoiceDone } from '../choices.js';
import { ClassChoiceFields, SpeciesChoiceFields } from '../ChoiceFields.jsx';
import FaithCard from '../FaithCard.jsx';

function Feat({ name, text, tag, html, rules }) {
  return (
    <details className="feat">
      <summary><span>{name}</span>{tag && <span className="chip">{tag}</span>}</summary>
      <div className="body">{html ? <Html html={text} /> : text}{rules && <div style={{ marginTop: 6 }}><RulesLink page={rules[0]} anchor={rules[1]}>Full rules</RulesLink></div>}</div>
    </details>
  );
}

export default function FeaturesTab({ st, d, update, conn }) {
  const [addFeat, setAddFeat] = useState(false);
  const [editFeat, setEditFeat] = useState(null); // feat uid
  const [cat, setCat] = useState('general');
  const traits = speciesTraits(st.speciesId, st.subraceId);

  return (
    <>
      {d.level >= 3 && !st.inclination && (
        <div className="card"><h2 className="sec">Choose your Inclination</h2>
          {Object.entries(INCLINATIONS).map(([k, v]) => (
            <button key={k} className="optcard" onClick={() => update({ inclination: k })}><b>{k}</b><span className="small">{v[0]}</span></button>))}</div>)}
      {d.level >= 5 && !st.hardened && (
        <div className="card"><h2 className="sec">Choose Hardened</h2>
          <button className="optcard" onClick={() => update({ hardened: 'Extra Attack' })}><b>Extra Attack</b><span className="small">Attack twice when you take the Attack action.</span></button>
          <button className="optcard" onClick={() => update({ hardened: 'Arcane Edge' })}><b>Arcane Edge</b><span className="small">Add your Intelligence modifier to cantrip damage.</span></button></div>)}

      <div className="card"><h2 className="sec">Crawler Core</h2>
        {CORE_FEATURES.map((f) => <Feat key={f.name} name={f.name} text={f.text} rules={['crawler', f.name]} />)}</div>

      <div className="card"><h2 className="sec">Survivor features</h2>
        <p className="small muted">Kept for good, even after you choose a class.</p>
        {survivorFeatures(d.level, st).map((f) => <Feat key={f.name} name={f.name} text={f.text} tag={`Lv ${f.lv}`} rules={['crawler', f.name.includes(':') ? f.name.split(':')[1].trim() : f.name]} />)}</div>

      <FaithCard st={st} update={update} />

      {st.speciesId && (
        <div className="card"><h2 className="sec">{st.speciesName || 'Species'} traits</h2>
          {traits.map((t) => <Feat key={t.name} name={t.name} text={t.desc} />)}</div>)}

      {d.classNames.map((c) => {
        const L = d.classes[c].level;
        const sub = d.classes[c].subclass;
        const P = Math.max(0, L - 20);
        const pres = PRESTIGE[c];
        return (
          <div className="card" key={c}>
            <h2 className="sec">{c} {Math.min(20, L)}{P ? ` · Prestige ${P}` : ''}</h2>
            {classFeatures(c, Math.min(20, L)).map((f, i) => <Feat key={c + f.name + i} name={f.name} text={f.desc} tag={`Lv ${f.level}`} />)}
            {sub && <>
              <h3 className="it" style={{ marginTop: 12 }}>{sub}</h3>
              {subclassBlurb(c, sub) && <p className="small muted">{subclassBlurb(c, sub)}</p>}
              {subclassFeatures(c, sub, Math.min(20, L)).map((f, i) => <Feat key={sub + f.name + i} name={f.name} text={f.desc} tag={`Lv ${f.level}`} />)}
            </>}
            {P > 0 && pres && <>
              <h3 className="it" style={{ marginTop: 12 }}>Prestige <RulesLink page="prestige-levels" anchor={c} /></h3>
              <p className="small"><span className="lab" style={{ color: 'var(--teal)' }}>Scaling </span><Html html={pres.scaling} /></p>
              {pres.features.slice(0, Math.min(5, Math.ceil(P / 2))).map((f) => <Feat key={f.name} name={`${f.rank} — ${f.name}`} text={f.text} html />)}
              <p className="small muted">Even prestige levels: an Epic Boon or 2 Stat Points.</p>
            </>}
          </div>);
      })}

      {(d.classNames.length > 0 || st.speciesId) && (() => {
        const open = d.classNames.some((c) => classChoicesFor(c, d.classes[c].level).some((x) => !choiceDone(x, ((st.classChoices || {})[c] || {})[x.id])))
          || speciesChoices(st.speciesId, st.subraceId).some((x) => !speciesChoiceDone(x, (st.speciesChoices || {})[x.id]));
        const have = d.skillRows.filter((r) => r.prof).map((r) => r.name);
        return (
          <details className="card skillbox" open={open}>
            <summary><h2 className="sec" style={{ margin: 0 }}>Class and species choices</h2>{open && <span className="chip pink" style={{ marginLeft: 'auto', marginRight: 8 }}>Choices to make</span>}</summary>
            {st.speciesId && <SpeciesChoiceFields id={st.speciesId} subId={st.subraceId} value={st.speciesChoices || {}} have={have}
              onChange={(v) => update((s) => { s.speciesChoices = v; return s; })} />}
            {d.classNames.map((c) => (
              <ClassChoiceFields key={c} cls={c} level={d.classes[c].level} value={(st.classChoices || {})[c] || {}} have={have}
                onChange={(v) => update((s) => { s.classChoices = { ...(s.classChoices || {}), [c]: v }; return s; })} />))}
            {d.choiceFx.traits.map((t) => <Feat key={t.name} name={t.name} text={t.desc} tag={t.cls} />)}
            {d.choiceFx.mastery.length > 0 && <p className="small"><b>Weapon Mastery:</b> {d.choiceFx.mastery.join(', ')}</p>}
          </details>);
      })()}

      <div className="card">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Feats</h2><button className="btn sm dark" onClick={() => setAddFeat(true)}>+ Add feat</button></div>
        {!st.feats.length && <p className="small muted">Origin feats from your background, and feats from class Ability Score Improvements, show here.</p>}
        {st.feats.map((f, i) => {
          const todo = featChoices(f).length > 0 && !featDone(f, d, st.spells);
          const spells = st.spells.filter((x) => x.featUid === f.uid).map((x) => x.name);
          return (
            <details className="feat" key={f.uid || f.name + i} open={todo}><summary><span>{f.name}</span>{todo ? <span className="chip pink">Choose</span> : <span className="chip">{f.source}</span>}</summary>
              <div className="body">{f.desc}</div>
              {spells.length > 0 && <p className="small"><b>Spells in your tome:</b> {spells.join(', ')}</p>}
              <div className="row wrap" style={{ marginTop: 6 }}>
                {featChoices(f).length > 0 && <button className={`btn sm${todo ? ' primary' : ''}`} onClick={() => setEditFeat(f.uid)}>{todo ? 'Make choices' : 'Change choices'}</button>}
                <button className="btn sm" onClick={() => update((s) => { s.feats = s.feats.filter((x) => x.uid !== f.uid); s.spells = s.spells.filter((x) => !x.featUid || x.featUid !== f.uid); return s; })}>Remove</button>
              </div></details>);
        })}
      </div>

      <div className="card"><h2 className="sec">Proficiencies</h2>
        <p><b>Armor:</b> {[...d.armorProf].join(', ') || '—'}</p>
        <p><b>Weapons:</b> {[...d.weaponProf].join(', ')}</p>
        <div className="field"><span className="lab">Tools</span><input className="f" value={st.tools || ''} onChange={(e) => update({ tools: e.target.value })} /></div>
        <div className="field"><span className="lab">Languages</span><input className="f" value={st.languages || ''} onChange={(e) => update({ languages: e.target.value })} /></div>
      </div>

      <div className="card"><h2 className="sec">Notes</h2>
        <textarea className="f" style={{ minHeight: 140 }} value={st.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder="Allies, sponsors, grudges, quest items…" /></div>

      {editFeat && st.feats.find((f) => f.uid === editFeat) && <FeatEditor feat={st.feats.find((f) => f.uid === editFeat)} st={st} d={d} conn={conn} update={update} onClose={() => setEditFeat(null)} />}
      {addFeat && (
        <Modal title="Add a feat" onClose={() => setAddFeat(false)}>
          <div className="chips">{['origin', 'general', 'fighting-style', 'epic'].map((c) => <Pick key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Pick>)}</div>
          {FEATS.filter((f) => f.category === cat).map((f) => (
            <details className="feat" key={f.id}><summary><span>{f.name}</span><span className="small muted">{f.prereq || (f.minLevel > 1 ? `Level ${f.minLevel}+` : '')}</span></summary>
              <div className="body">{f.desc}</div>
              <button className="btn sm primary" style={{ marginTop: 6 }} onClick={() => { const nf = newFeat(f, cat === 'epic' ? 'Epic Boon' : 'Feat'); update((s) => { s.feats.push(nf); return s; }); setAddFeat(false); if (featChoices(nf).length) setEditFeat(nf.uid); }}>Take {f.name}</button>
            </details>))}
          <p className="small muted">Limit Breaker is a Crawler feat: tick it on a Skill Level 15 Crawler Skill in the Skills tab.</p>
        </Modal>)}
    </>
  );
}

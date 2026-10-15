// Faith (optional Gods module): the crawler's god, Favor, Lapses, Devotions and Boons.
import React, { useState } from 'react';
import { Pick, Stepper } from './bits.jsx';
import { RulesLink } from './rulesLinks.jsx';
import {
  GODS, findGod, shortName, rankOf, RANKS, LAPSE_STAGES, SMITE_DICE, SMITE_LASTS, faithOf, boonsFor, addLapse,
} from './faith.js';

const GAIN = { Rite: 1, Offering: 3, 'Great Deed': 5 };
const DONE_KEY = { Rite: 'riteDone', Offering: 'offeringDone', 'Great Deed': 'greatDeedDone' };
const WHEN = { Rite: 'today', Offering: 'this floor', 'Great Deed': 'this floor' };

export default function FaithCard({ st, update }) {
  const f = faithOf(st);
  const god = findGod(f.god);
  const [pick, setPick] = useState('');
  const [leaving, setLeaving] = useState(false);
  const setF = (fn) => update((s) => { const x = faithOf(s); fn(x); s.faith = x; return s; });

  if (!god) {
    const chosen = findGod(pick);
    return (
      <details className="card skillbox">
        <summary><h2 className="sec" style={{ margin: 0 }}>Faith</h2><span className="chip" style={{ marginLeft: 'auto', marginRight: 8 }}>Optional</span></summary>
        <p className="small muted">Only if your GM uses the Gods module. Take a god's vow at a shrine, then keep its Rites. <RulesLink page="gods">Gods and worship</RulesLink> · <RulesLink page="pantheon">The Pantheon</RulesLink></p>
        {f.apostate.length > 0 && <p className="small"><b>Apostate of:</b> {f.apostate.map(shortName).join(', ')}. Their worshippers are hostile to you.</p>}
        <div className="chips">{GODS.map((g) => (
          <Pick key={g.name} on={pick === g.name} lock={f.apostate.includes(g.name)} onClick={() => !f.apostate.includes(g.name) && setPick(g.name)}>{shortName(g.name)}</Pick>))}</div>
        {chosen && (
          <div style={{ marginTop: 8 }}>
            <p className="small"><b>{chosen.name}</b> · {chosen.domains} · rival: {chosen.rival}</p>
            <p className="small muted">"{chosen.pitch}"</p>
            <p className="small"><b>Rite:</b> {chosen.devotions.Rite}<br /><b>Taboos:</b> {chosen.taboos}</p>
            <div className="chips">{['WIS', 'CHA'].map((a) => <Pick key={a} on={(f.ability || 'WIS') === a} onClick={() => setF((x) => { x.ability = a; })}>{a === 'WIS' ? 'Wisdom' : 'Charisma'} for spell boons</Pick>)}</div>
            <button className="btn primary block" onClick={() => setF((x) => {
              Object.assign(x, { god: chosen.name, favor: 0, lapses: 0, riteDone: false, offeringDone: false, lapsedThisFloor: false, greatDeedDone: false,
                log: [{ text: `Took the vow of ${shortName(chosen.name)}.`, at: Date.now() }] });
            })}>Take the vow: "{chosen.vow}"</button>
          </div>)}
      </details>);
  }

  const rank = rankOf(f.favor);
  const stage = LAPSE_STAGES[f.lapses];
  const next = RANKS.find(([, at]) => at > f.favor);
  const boons = boonsFor(f);
  const smiteDice = SMITE_DICE[rank];
  return (
    <div className="card">
      <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Faith: {shortName(god.name)}</h2><span className={`chip ${f.lapses >= 3 ? 'pink' : 'teal'}`}>{rank}</span></div>
      <p className="small muted" style={{ marginTop: 4 }}>{god.domains} · rival {god.rival} · symbol: {god.symbol} · <RulesLink page="pantheon" anchor={god.name}>Rules</RulesLink></p>

      <div className="grid3" style={{ alignItems: 'center', marginTop: 6 }}>
        <div><div className="lab">Favor</div><Stepper value={f.favor} min={0} max={999} onChange={(v) => setF((x) => { x.favor = v; })} /></div>
        <div style={{ gridColumn: 'span 2' }}><div className="lab">Lapses</div>
          <div className="row" style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`pick${f.lapses >= n ? ' on' : ''}`} style={{ minWidth: 34 }}
                onClick={() => setF((x) => { x.lapses = x.lapses >= n ? n - 1 : n; })}>{n}</button>))}
          </div></div>
      </div>
      <p className="small" style={{ marginTop: 6 }}>{next ? `${next[1] - f.favor} more Favor to ${next[0]}.` : 'Chosen: the top rank.'}</p>
      <div className={f.lapses ? 'warn' : 'sys'} style={{ fontSize: 13 }}>
        <b>{stage.name}.</b> {stage.text}
        {f.lapses >= 3 && <><br /><b>Displeasure:</b> {god.displeasure}</>}
        {f.lapses >= 4 && <><br /><b>Wrath:</b> {god.wrath}</>}
        {f.lapses >= 5 && <><br /><b>Forsaken:</b> take the Apostate's Smite below ({smiteDice}d10, and it can kill), then leave the religion.</>}
      </div>

      <h3 className="it">Devotions</h3>
      {['Rite', 'Offering', 'Great Deed'].map((k) => {
        const done = f[DONE_KEY[k]];
        const blocked = f.lapses >= 4;
        return (
          <div key={k} style={{ borderBottom: '1px solid var(--rule)', padding: '6px 0' }}>
            <div className="row between"><b>{k}</b>
              <button className={`btn sm ${done ? '' : 'primary'}`} disabled={done || blocked} onClick={() => setF((x) => { x[DONE_KEY[k]] = true; x.favor += GAIN[k]; })}>
                {done ? `Done ${WHEN[k]}` : blocked ? 'Wrath: no Favor' : `Done (+${GAIN[k]} Favor)`}</button></div>
            <div className="small">{god.devotions[k]}</div>
          </div>);
      })}
      <p className="small muted">Long rests and the Floor stepper (Level tab) check the Rite and the Offering for you: a missed one adds a Lapse. A floor with no new Lapse removes one when you take the stairs.</p>
      <p className="small"><b>Taboos:</b> {god.taboos}</p>
      <div className="row wrap">
        <button className="btn sm" onClick={() => update((s) => addLapse(s, 'broke a Taboo'))}>Broke a Taboo (+1 Lapse)</button>
        <button className="btn sm" disabled={!f.lapses} onClick={() => setF((x) => { x.lapses = Math.max(0, x.lapses - 1); })}>Atoned (−1 Lapse)</button>
        <button className="btn sm" disabled={!f.lapses} onClick={() => setF((x) => { x.lapses = Math.max(0, x.lapses - 1); })}>Indulgence Coupon (−1)</button>
      </div>
      <p className="small muted"><b>Atonement:</b> {god.atonement}</p>

      <h3 className="it">Boons</h3>
      {boons.map((b) => (
        <div key={b.rank} className="small" style={{ opacity: b.earned ? 1 : 0.45, padding: '4px 0', borderBottom: '1px solid var(--rule)' }}>
          <span className={`chip ${b.active ? 'teal' : ''}`} style={{ padding: '1px 6px', fontSize: 10 }}>{b.rank}</span>{' '}
          <b>{b.name}.</b> {b.text}{b.earned && !b.active ? ' (switched off by Lapses)' : ''}
        </div>))}
      {god.gags && rank !== 'Initiate' && (
        <details className="feat"><summary><span>Gag table (d6)</span></summary>
          <ol className="small">{god.gags.map((g) => <li key={g}>{g}</li>)}</ol></details>)}

      <h3 className="it">Leaving</h3>
      <p className="small"><b>Apostate's Smite: {god.smite?.name}.</b> {SMITE_DICE[rank]}d10 at your rank, no save (it can't drop you below 1 hit point unless you are Forsaken). {god.smite?.text} The lasting effect lasts {SMITE_LASTS[rank]}.</p>
      {!leaving
        ? <button className="btn sm" onClick={() => setLeaving(true)}>Leave {shortName(god.name)}…</button>
        : <div className="row wrap">
          <button className="btn sm primary" onClick={() => { setLeaving(false); setF((x) => {
            x.apostate = [...new Set([...(x.apostate || []), x.god])];
            x.leftRank = rankOf(x.favor);
            x.log = [{ text: `Left ${shortName(x.god)} as ${x.leftRank}: smitten (${god.smite?.name}).`, at: Date.now() }, ...(x.log || [])];
            Object.assign(x, { god: '', favor: 0, lapses: 0, riteDone: false, offeringDone: false, greatDeedDone: false, lapsedThisFloor: false });
          }); }}>Renounce and take the smite</button>
          <button className="btn sm" onClick={() => setLeaving(false)}>Stay</button></div>}

      {(f.log || []).length > 0 && (
        <details className="feat"><summary><span>Faith log</span></summary>
          {f.log.slice(0, 12).map((l) => <div key={l.at + l.text} className="small muted">{l.text}</div>)}</details>)}
    </div>
  );
}

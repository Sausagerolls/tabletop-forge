import React, { useState } from 'react';
import { sign } from '../rules.js';
import { faithLongRest } from '../faith.js';
import { classResources } from '../ttf.js';
import ClassFeatures from './ClassFeatures.jsx';
import WildShape from './WildShape.jsx';
import SurvivorActions from './SurvivorActions.jsx';
import { useRoller, RollLog } from '../roller.jsx';

export default function MainTab({ st, d, update, conn, charId }) {
  const roll = useRoller();
  const [amt, setAmt] = useState('');
  const hp = st.hp.current ?? d.hpMax;
  const mana = st.mana.current ?? d.manaMax;

  const changeHp = (delta) => update((s) => {
    const cur = s.hp.current ?? d.hpMax;
    if (delta < 0) {
      let dmg = -delta;
      const fromTemp = Math.min(s.hp.temp || 0, dmg);
      s.hp.temp = (s.hp.temp || 0) - fromTemp; dmg -= fromTemp;
      s.hp.current = Math.max(0, cur - dmg);
    } else {
      s.hp.current = Math.min(d.hpMax, cur + delta);
      if (s.hp.current > 0) s.deathSaves = { s: 0, f: 0 };
    }
    return s;
  });

  const shortRest = () => update((s) => {
    s.mana.current = Math.min(d.manaMax, (s.mana.current ?? d.manaMax) + Math.floor(d.tomeMana / 2));
    s.mana.pact = d.pact.mana;
    s.willToLiveUsed = 0;
    const res = { ...(s.resources || {}) };
    classResources(s, d).forEach(({ def }) => { if (def.rest === 'short') res[def.id] = 0; });
    s.resources = res;
    return s;
  });
  const longRest = () => update((s) => {
    s.hp.current = d.hpMax; s.hp.temp = 0; s.deathSaves = { s: 0, f: 0 };
    s.mana.current = d.manaMax; s.mana.pact = d.pact.mana; s.mana.big = [];
    s.willToLiveUsed = 0; s.hardToKillUsed = false; s.resources = {};
    s.spells.forEach((x) => { delete x.freeUsed; });
    s.exhaustion = Math.max(0, (s.exhaustion || 0) - 1);
    // regain half your Hit Dice (at least one), largest first
    let back = Math.max(1, Math.floor(d.level / 2));
    const used = { ...(s.hitDiceUsed || {}) };
    for (const die of ['d12', 'd10', 'd8', 'd6']) {
      const take = Math.min(back, used[die] || 0); used[die] = (used[die] || 0) - take; back -= take;
    }
    s.hitDiceUsed = used;
    faithLongRest(s); // a day without your god's Rite is a Lapse (Gods module)
    return s;
  });

  const spendHitDie = (die) => {
    const used = st.hitDiceUsed?.[die] || 0;
    if (used >= (d.hitDice[die] || 0)) return;
    const r = roll.damage(`Hit Die (${die})`, `1${die}+${d.m.CON}`);
    if (!r) return;
    update((s) => { s.hitDiceUsed = { ...(s.hitDiceUsed || {}), [die]: used + 1 }; s.hp.current = Math.min(d.hpMax, (s.hp.current ?? d.hpMax) + r.total); return s; });
  };

  return (
    <>
      <div className="tiles">
        <div className="tile"><span className="lab">Armor Class</span><b>{d.ac}</b></div>
        <button className="tile press" onClick={() => roll.test('Initiative', d.initiative)}><span className="lab">Initiative</span><b>{sign(d.initiative)}</b></button>
        <div className="tile"><span className="lab">Speed</span><b>{d.speed}</b></div>
        <div className="tile"><span className="lab">Prof. bonus</span><b>{sign(d.pb)}</b></div>
        <div className="tile"><span className="lab">Passive Perc.</span><b>{d.passive}</b></div>
        <button className={`tile press`} onClick={() => update({ inspiration: !st.inspiration })}><span className="lab">Inspiration</span><b>{st.inspiration ? '★' : '☆'}</b></button>
      </div>

      <div className="card">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Hit points</h2><span className="lab">Max {d.hpMax}</span></div>
        <div className="row between" style={{ marginTop: 6 }}>
          <div><span className="big">{hp}</span><span className="muted"> / {d.hpMax}</span>{st.hp.temp > 0 && <span className="chip teal" style={{ marginLeft: 8 }}>+{st.hp.temp} temp</span>}</div>
        </div>
        <div className="hpbar"><i style={{ width: `${Math.min(100, (hp / d.hpMax) * 100)}%` }} /></div>
        <div className="row">
          <input className="num" style={{ flex: 1 }} value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Amount" />
          <button className="btn primary" onClick={() => { if (amt) { changeHp(-Number(amt)); setAmt(''); } }}>Damage</button>
          <button className="btn teal" onClick={() => { if (amt) { changeHp(Number(amt)); setAmt(''); } }}>Heal</button>
          <button className="btn" onClick={() => { if (amt) { update((s) => { s.hp.temp = Number(amt); return s; }); setAmt(''); } }}>Temp</button>
        </div>
        {hp === 0 && (
          <div style={{ marginTop: 10 }}>
            <span className="lab">Death saves</span>
            <div className="row" style={{ marginTop: 4 }}>
              <button className="btn sm dark" onClick={() => {
                const r = roll.test('Death save', 0, { mode: null });
                update((s) => {
                  if (r.natural === 20) { s.hp.current = 1; s.deathSaves = { s: 0, f: 0 }; }
                  else if (r.natural === 1) s.deathSaves.f = Math.min(3, s.deathSaves.f + 2);
                  else if (r.total >= 10) s.deathSaves.s = Math.min(3, s.deathSaves.s + 1);
                  else s.deathSaves.f = Math.min(3, s.deathSaves.f + 1);
                  return s;
                });
              }}>Roll death save</button>
              <span>Successes {'●'.repeat(st.deathSaves.s)}{'○'.repeat(3 - st.deathSaves.s)}</span>
              <span>Failures {'●'.repeat(st.deathSaves.f)}{'○'.repeat(3 - st.deathSaves.f)}</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <span className="lab">Hit Dice (tap to spend)</span>
          <div className="row wrap" style={{ marginTop: 4 }}>
            {Object.entries(d.hitDice).map(([die, n]) => (
              <button key={die} className="btn sm" onClick={() => spendHitDie(die)}>{die}: {n - (st.hitDiceUsed?.[die] || 0)}/{n}</button>
            ))}
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn block" onClick={shortRest}>Short rest</button>
          <button className="btn dark block" onClick={longRest}>Long rest</button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Long rests only in a safe room. A short rest outside one risks an Ambush Check.</p>
      </div>

      <div className="card dark">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Mana</h2><span className="lab" style={{ color: '#bdb8cc' }}>Tome {d.tomeMana} + Class {d.clsMana}</span></div>
        <div className="row between" style={{ marginTop: 6 }}>
          <div><span className="big">{mana}</span><span style={{ color: '#bdb8cc' }}> / {d.manaMax}</span></div>
          <div className="stepper">
            <button onClick={() => update((s) => { s.mana.current = Math.max(0, mana - 1); return s; })}>−</button>
            <button onClick={() => update((s) => { s.mana.current = Math.min(d.manaMax, mana + 1); return s; })}>+</button>
          </div>
        </div>
        <div className="hpbar manabar" style={{ background: '#2a2836' }}><i style={{ width: `${Math.min(100, (mana / Math.max(1, d.manaMax)) * 100)}%` }} /></div>
        {d.pact.mana > 0 && (
          <div className="row between"><span>Pact Mana (level {d.pact.level})</span>
            <div className="stepper">
              <button onClick={() => update((s) => { s.mana.pact = Math.max(0, (s.mana.pact ?? d.pact.mana) - 1); return s; })}>−</button>
              <b style={{ minWidth: 50, textAlign: 'center' }}>{st.mana.pact ?? d.pact.mana} / {d.pact.mana}</b>
              <button onClick={() => update((s) => { s.mana.pact = Math.min(d.pact.mana, (s.mana.pact ?? d.pact.mana) + 1); return s; })}>+</button>
            </div></div>
        )}
      </div>

      <ClassFeatures st={st} d={d} update={update} />
      <WildShape st={st} d={d} update={update} conn={conn} charId={charId} />

      <SurvivorActions st={st} d={d} update={update} />

      <RollLog />
    </>
  );
}


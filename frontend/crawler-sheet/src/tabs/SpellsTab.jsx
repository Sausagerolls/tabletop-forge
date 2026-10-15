import React, { useEffect, useMemo, useState } from 'react';
import { MANA_COST, sign, ABILITY_NAME } from '../rules.js';
import { spellAbilityFor } from '../character.js';
import {
  loadSpells, loadLibrary, onList, snapSpell, withData, classSpellAllowance, effRank, ROMAN, RANK_GATE,
  grantedSpells, addGranted, grantDone, wdFor,
} from '../spells.js';
import { useRoller } from '../roller.jsx';
import { Modal, Pick } from '../bits.jsx';
import { RulesLink } from '../rulesLinks.jsx';

const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
// "The damage increases by 1d6 for each spell slot level above 1." (spells from other books)
export function upcastDice(sp, lvl) {
  if (sp.wd) return null;
  const m = String(sp.description || '').match(/increases by (\d+)d(\d+) for each (?:spell )?(?:slot )?level above (\d+)/i);
  if (!m || lvl <= Number(m[3])) return null;
  return { n: Number(m[1]) * (lvl - Number(m[3])), sides: Number(m[2]) };
}
const higherText = (sp) => (String(sp.description || '').match(/(Using a Higher-Level Spell Slot|At Higher Levels)[.:]?\s*([^\n]+)/i) || [])[2] || '';
const isAttack = (sp) => /attack/i.test(sp.attack_save || '');
const isSave = (sp) => /save/i.test(sp.attack_save || '') || !!sp.save_ability;
const damageIn = (text) => {
  const m = String(text || '').match(/(\d+d\d+(?:\s*[+]\s*\d+)?)\s+(\w+)(?:\s+or\s+\w+)?\s+damage/i);
  return m ? { damage: m[1].replace(/\s+/g, ''), damage_type: m[2] } : null;
};
// The damage to roll: a World Dungeon spell's current rank row first, then its text.
const firstDamage = (sp, rank) => {
  if (sp.wd) {
    for (let r = rank || 1; r >= 1; r -= 1) { const hit = damageIn(sp.ranks?.[r - 1]); if (hit) return hit; }
    return damageIn(sp.description);
  }
  const e = (sp.damage_entries || []).find((x) => x && x.damage);
  return e || damageIn(sp.description);
};
// Where a spell came from, as the player reads it.
export const sourceLabel = (sp) => (sp.source === 'Class' ? sp.cls : sp.source === 'Feat' || sp.source === 'Feature' ? sp.sourceName || sp.source : sp.source || 'Tome');
const keyOf = (sp) => `${sp.source}-${sp.cls || sp.featUid || sp.sourceName || ''}-${sp.id}`;

export default function SpellsTab({ st, d, update, conn }) {
  const roll = useRoller();
  const [lib, setLib] = useState(null); // { mode: 'tome' | 'class' | 'feature', ... }
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('All');
  const [castFor, setCastFor] = useState(null);
  const mana = st.mana.current ?? d.manaMax;
  const scholar = d.sl('Tome Scholar');
  const allowance = classSpellAllowance(st, d);
  const grants = grantedSpells(st, d);
  const missing = grants.filter((g) => g.spell && !grantDone(st, g));

  const rankOf = (sp) => effRank(sp, d.level);
  // Other-book spells: ranks cast a spell higher for free (the old rule).
  const effLevel = (sp) => (sp.wd || sp.level === 0 ? sp.level : Math.min(9, Math.max(sp.level, Math.min(d.maxCast || sp.level, sp.level + (sp.rank || 1) - 1))));
  function cost(sp, lvl) {
    if (sp.fixedCost) return sp.fixedCost;
    let c = MANA_COST[sp.wd || lvl <= effLevel(sp) ? sp.level : lvl] || 0;
    if (scholar >= 5 && c > 0) c = Math.max(1, c - 1);
    if (scholar >= 20) c = Math.ceil(c / 2);
    return c;
  }
  // World Dungeon spells never cast at a higher level: ranks do that.
  const castLevels = (sp) => {
    if (sp.level === 0 || sp.fixedCost || sp.wd) return [sp.level];
    const out = []; for (let l = effLevel(sp); l <= Math.max(effLevel(sp), d.maxCast); l += 1) out.push(l); return out;
  };
  // Pact Mana casts a World Dungeon spell one rank higher per level of difference.
  const pactRank = (sp) => Math.min(5, rankOf(sp) + Math.max(0, d.pact.level - sp.level));

  function cast(sp, lvl, how) { // how: 'mana' | 'pact' | 'free'
    const ab = spellAbilityFor(sp, d);
    if (how !== 'free' && sp.level > 0) {
      const c = how === 'pact' ? MANA_COST[d.pact.level] : cost(sp, lvl);
      const pool = how === 'pact' ? (st.mana.pact ?? d.pact.mana) : mana;
      if (c > pool) { alert(`Not enough ${how === 'pact' ? 'Pact ' : ''}mana (${c} needed).`); return; }
      const big = how === 'pact' ? d.pact.level : lvl;
      if (big >= 6 && (st.mana.big || []).includes(big)) { alert(`You have already cast a ${ORD[big]}-level spell with mana since your last long rest.`); return; }
      update((s) => {
        if (how === 'pact') s.mana.pact = pool - c; else s.mana.current = pool - c;
        if (big >= 6) s.mana.big = [...new Set([...(s.mana.big || []), big])];
        return s;
      });
    }
    if (how === 'free') update((s) => { const x = s.spells.find((y) => keyOf(y) === keyOf(sp)); if (x) x.freeUsed = true; return s; });
    if (sp.id === 'heal-self') {
      const r = roll.damage(`Heal Self (Rank ${sp.rank || 1})`, `${sp.rank || 1}d8`);
      update((s) => { s.hp.current = Math.min(d.hpMax, (s.hp.current ?? d.hpMax) + r.total); return s; });
      return;
    }
    const rank = how === 'pact' && sp.wd ? pactRank(sp) : rankOf(sp);
    const base = firstDamage(sp, rank);
    const up = base ? upcastDice(sp, lvl) : null;
    const dmg = base && up ? { ...base, damage: `${base.damage}+${up.n}d${up.sides}` } : base;
    const label = `${sp.name}${sp.wd ? (sp.level === 0 || rank > 1 ? ` (Rank ${ROMAN[rank]})` : '') : sp.level ? ` (${ORD[lvl]})` : ''}`;
    if (isAttack(sp)) roll.test(`${label} attack`, d.atkFor(ab), { damage: dmg ? { label: `${sp.name} damage`, expr: dmg.damage, type: dmg.damage_type } : null });
    else if (dmg) roll.damage(`${label}${isSave(sp) ? `, DC ${d.dcFor(ab)}` : ''}`, dmg.damage, { type: dmg.damage_type });
  }
  const startCast = (sp, how) => {
    if (how === 'pact') cast(sp, d.pact.level, 'pact');
    else if (how === 'free') cast(sp, sp.level, 'free');
    else if (castLevels(sp).length < 2) cast(sp, castLevels(sp)[0], 'mana');
    else setCastFor(sp);
  };

  const tome = st.spells.map(withData);
  const abilities = [...new Set(['INT', ...tome.map((sp) => spellAbilityFor(sp, d))])];
  const sources = ['All', ...new Set(tome.map(sourceLabel))];
  const shown = tome.filter((sp) => filter === 'All' || sourceLabel(sp) === filter)
    .sort((a, b) => a.name.localeCompare(b.name)); // A to Z, like the spell books
  const setSpell = (sp, fn) => update((s) => { const x = s.spells.find((y) => keyOf(y) === keyOf(sp)); if (x) fn(x, s); return s; });
  const rankUpsLeft = (cls) => { const a = allowance.find((x) => x.cls === cls); return a ? a.rankUps - a.rankUpsSpent : 0; };

  // A spell learned from another book before World Dungeon spells existed.
  const swapToWd = (sp) => {
    const r = wdFor(sp.name);
    if (!r) return;
    setSpell(sp, (x, s) => {
      if (s.spells.some((y) => y !== x && y.name === r.spell.name)) { s.spells = s.spells.filter((y) => y !== x); return; }
      const keep = { source: x.source, cls: x.cls, sourceName: x.sourceName, ability: x.ability, featUid: x.featUid, featKey: x.featKey, free: x.free, granted: x.granted };
      Object.keys(x).forEach((k) => delete x[k]);
      Object.assign(x, snapSpell(r.spell), { tome: true, rank: Math.max(r.rank, sp.rank || 1), ...(r.rank > 1 ? { minRank: r.rank } : {}), replaces: sp.name },
        Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)));
    });
  };

  return (
    <>
      {castFor && <CastModal sp={castFor} st={st} mana={mana} cost={cost} levels={castLevels(castFor)}
        onCast={(lvl) => { setCastFor(null); cast(castFor, lvl, 'mana'); }} onClose={() => setCastFor(null)} />}
      <div className="card dark">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Mana {mana} / {d.manaMax}</h2>
          {d.pact.mana > 0 && <span className="chip teal">Pact {st.mana.pact ?? d.pact.mana}/{d.pact.mana}</span>}</div>
        <div className="grid3" style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 13 }}>
          <div>Max level <b>{ORD[d.maxCast] || '—'}</b></div><div>Tome limit <b>{ORD[d.tomeLimit]}</b></div><div>Class max <b>{ORD[d.maxSpell] || '—'}</b></div>
          {abilities.map((a) => <div key={a} style={{ gridColumn: 'span 3' }}>{ABILITY_NAME[a]}: DC <b>{d.dcFor(a)}</b> · attack <b>{sign(d.atkFor(a))}</b></div>)}
        </div>
        <div className="small" style={{ color: '#bdb8cc', marginTop: 8 }}>Costs: {MANA_COST.slice(1).map((c, i) => `${ORD[i + 1]} ${c}`).join(' · ')}. A spell always costs its own level. One each of 6th–9th per long rest: {[6, 7, 8, 9].map((l) => ((st.mana.big || []).includes(l) ? `${l}✓` : l)).join(' ')}</div>
        <div className="small" style={{ color: '#bdb8cc', marginTop: 4 }}>Rank gates: {[2, 3, 4, 5].map((r) => `${ROMAN[r]} at level ${RANK_GATE[r]}`).join(' · ')}</div>
        <div className="small" style={{ marginTop: 6 }}><RulesLink page="tome-magic" anchor="Spell Ranks" light>Spell ranks</RulesLink> · <RulesLink page="spell-lists" light>Spell lists</RulesLink> · <RulesLink page="mana" light>Mana</RulesLink></div>
      </div>

      {missing.length > 0 && (
        <div className="warn" onClick={() => update((s) => addGranted(s, missing))}>
          Your class and species grant {missing.length === 1 ? 'a spell' : `${missing.length} spells`}: {missing.map((g) => `${g.spell.name}${g.rank > 1 ? ` (Rank ${ROMAN[g.rank]})` : ''}${g.orig !== g.spell.name ? `, for ${g.orig}` : ''}`).join('; ')}. Tap to add {missing.length === 1 ? 'it' : 'them'}. They don't count against what you learn.
        </div>)}
      {allowance.map((a) => {
        const c = a.cantrips - a.cantripsKnown; const s = a.spells - a.spellsKnown;
        if (c <= 0 && s <= 0) return null;
        return (
          <div className="warn" key={a.cls} onClick={() => setLib({ mode: 'class', cls: a.cls })}>
            {a.cls} {a.level}: learn {[c > 0 && `${c} cantrip${c > 1 ? 's' : ''}`, s > 0 && `${s} spell${s > 1 ? 's' : ''}`].filter(Boolean).join(' and ')} from the World Dungeon {a.lists.join(', ')} list{a.lists.length > 1 ? 's' : ''} (up to {ORD[a.maxLevel]}). Tap to choose.
          </div>);
      })}
      {allowance.filter((a) => a.rankUps > a.rankUpsSpent).map((a) => (
        <div className="warn" key={`ru-${a.cls}`}>
          {a.cls}: {a.rankUps - a.rankUpsSpent} Rank Up{a.rankUps - a.rankUpsSpent > 1 ? 's' : ''} to spend (one per class level). Open a {a.cls} spell below and tap <b>Rank Up</b>.
        </div>))}

      <div className="card">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Your tome</h2><span className="small muted">{tome.length} spells</span></div>
        <p className="small muted">Every spell you know lives here, whatever taught it. Nothing needs preparing. Tap a spell for its ranks.</p>
        {sources.length > 2 && <div className="chips">{sources.map((x) => <Pick key={x} on={filter === x} onClick={() => setFilter(x)}>{x}</Pick>)}</div>}
        {shown.map((sp) => {
          const key = keyOf(sp);
          const ab = spellAbilityFor(sp, d);
          const eff = effLevel(sp);
          const levels = castLevels(sp);
          const rank = rankOf(sp);
          const waiting = sp.wd && (sp.rank || 1) > rank;
          const swap = !sp.wd && sp.id !== 'heal-self' ? wdFor(sp.name) : null;
          const ups = sp.wd && sp.source === 'Class' ? rankUpsLeft(sp.cls) : 0;
          const rankTag = sp.id === 'heal-self' ? ` · Rank ${sp.rank || 1}`
            : sp.wd ? ` · Rank ${ROMAN[rank]}${waiting ? ` (${ROMAN[sp.rank]} at level ${RANK_GATE[sp.rank]})` : ''}`
              : sp.level > 0 ? ` · Rank ${sp.rank || 1}${eff !== sp.level ? ` (casts as ${ORD[eff]})` : ''}` : '';
          return (
            <div key={key} style={{ borderBottom: '1px solid var(--rule)', padding: '9px 0' }}>
              <div className="row">
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setOpen(open === key ? null : key)}>
                  <b>{sp.name}</b> <span className="small muted">{ORD[sp.level]}{rankTag}</span>
                  <div className="small muted"><span className="chip" style={{ padding: '1px 6px', fontSize: 10 }}>{sourceLabel(sp)}</span> {ab} · {sp.casting_time} · {sp.range_area}{isSave(sp) && sp.save_ability ? ` · ${sp.save_ability} save` : ''}{!sp.wd && sp.id !== 'heal-self' ? ' · other book' : ''}</div>
                </div>
                {sp.level > 0 && <span className="chip">{cost(sp, levels[0])}{levels.length > 1 ? '+' : ''} mana</span>}
                <button className="roll" onClick={() => startCast(sp, 'mana')}>Cast</button>
              </div>
              {sp.free && <button className="btn sm teal" style={{ marginTop: 6 }} disabled={sp.freeUsed} onClick={() => startCast(sp, 'free')}>{sp.freeUsed ? 'Free cast used (long rest)' : 'Free cast (once per long rest)'}</button>}
              {open === key && (
                <div style={{ marginTop: 8 }}>
                  {sp.replaces && <div className="small muted">Replaces {sp.replaces}.</div>}
                  <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{sp.description}</div>
                  {sp.wd && <RankTable sp={sp} rank={rank} level={d.level} />}
                  {sp.wd && sp.note && <div className="sys" style={{ fontSize: 13, marginTop: 8 }}>{sp.note}</div>}
                  {swap && <button className="btn sm primary" style={{ marginTop: 8 }} onClick={() => swapToWd(sp)}>Swap for the World Dungeon version: {swap.spell.name}</button>}
                  <div className="row wrap" style={{ marginTop: 8 }}>
                    {d.pact.mana > 0 && sp.level > 0 && sp.level <= d.pact.level && <button className="btn sm teal" onClick={() => startCast(sp, 'pact')}>Cast with Pact Mana ({ORD[d.pact.level]}{sp.wd ? `, Rank ${ROMAN[pactRank(sp)]}` : ''})</button>}
                    {sp.wd && <>
                      <button className="btn sm" disabled={(sp.rank || 1) >= 5} onClick={() => setSpell(sp, (x) => { x.rank = Math.min(5, (x.rank || 1) + 1); })}>Duplicate tome (+1 rank)</button>
                      {sp.source === 'Class' && <button className="btn sm primary" disabled={ups <= 0 || (sp.rank || 1) >= 5} onClick={() => setSpell(sp, (x, s) => {
                        x.rank = Math.min(5, (x.rank || 1) + 1); x.practiced = (x.practiced || 0) + 1;
                        s.rankUpsSpent = { ...(s.rankUpsSpent || {}), [x.cls]: ((s.rankUpsSpent || {})[x.cls] || 0) + 1 };
                      })}>Rank Up ({Math.max(0, ups)} left)</button>}
                      <button className="btn sm" disabled={(sp.rank || 1) <= (sp.minRank || 1)} onClick={() => setSpell(sp, (x, s) => {
                        x.rank = Math.max(x.minRank || 1, (x.rank || 1) - 1);
                        if (x.practiced > 0) { x.practiced -= 1; s.rankUpsSpent = { ...(s.rankUpsSpent || {}), [x.cls]: Math.max(0, ((s.rankUpsSpent || {})[x.cls] || 0) - 1) }; }
                      })}>Rank −</button>
                    </>}
                    {!sp.wd && sp.level > 0 && <><button className="btn sm" onClick={() => setSpell(sp, (x) => { x.rank = Math.max(1, (x.rank || 1) - 1); })}>Rank −</button>
                      <button className="btn sm" onClick={() => setSpell(sp, (x) => { x.rank = Math.min(5, (x.rank || 1) + 1); })}>Rank +</button></>}
                    {sp.source !== 'Crawler' && sp.source !== 'Feat' && <button className="btn sm" onClick={() => update((s) => { s.spells = s.spells.filter((x) => keyOf(x) !== key); return s; })}>{sp.source === 'Class' && !sp.granted ? 'Forget (swap on level up)' : 'Remove'}</button>}
                    {sp.source === 'Feat' && <span className="small muted">Change it from the feat in Features.</span>}
                  </div>
                  {sp.wd && (sp.rank || 1) >= 5 && <p className="small muted">At Rank V, a duplicate tome gives 1 Stat Point (Intelligence) instead.</p>}
                </div>)}
            </div>);
        })}
      </div>

      <button className="btn primary block" style={{ marginBottom: 8 }} onClick={() => setLib({ mode: 'tome' })}>+ Read a spell tome</button>
      {allowance.map((a) => <button key={a.cls} className="btn dark block" style={{ marginBottom: 8 }} onClick={() => setLib({ mode: 'class', cls: a.cls })}>+ Learn a {a.cls} spell ({a.cantripsKnown}/{a.cantrips} cantrips · {a.spellsKnown}/{a.spells} spells)</button>)}
      <button className="btn block" style={{ marginBottom: 12 }} onClick={() => setLib({ mode: 'feature' })}>+ Spell from an item or other feature</button>
      <p className="small muted">Class, subclass and species spells are added for you, as their World Dungeon replacements. Feats such as Magic Initiate add their spells when you make the feat's choices in Features.</p>

      {lib && <SpellLibrary {...lib} st={st} d={d} conn={conn} onClose={() => setLib(null)} update={update} />}
    </>
  );
}

function RankTable({ sp, rank, level }) {
  return (
    <div className="ranks">
      {sp.ranks.map((txt, i) => {
        const r = i + 1;
        const locked = r > rank;
        return (
          <div key={r} className={`rk${r === rank ? ' on' : ''}${locked ? ' locked' : ''}`}>
            <b>{ROMAN[r]}</b><span>{txt}{locked && r > 1 && level < RANK_GATE[r] ? ` (level ${RANK_GATE[r]})` : ''}</span>
          </div>);
      })}
    </div>
  );
}

function SpellLibrary({ mode, cls, st, d, conn, onClose, update }) {
  // Recounted on every change, so the numbers fall as spells are learned.
  const a = mode === 'class' ? classSpellAllowance(st, d).find((x) => x.cls === cls) : null;
  const [other, setOther] = useState(false); // other-book spells from Tabletop Forge (GM permission)
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [lvl, setLvl] = useState('all');
  const [open, setOpen] = useState(null);
  const [granted, setGranted] = useState(false);
  const [from, setFrom] = useState('');
  const [ability, setAbility] = useState('INT');
  const [free, setFree] = useState(false);
  useEffect(() => {
    setRows(null); setErr('');
    (other ? loadLibrary(conn) : loadSpells()).then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  }, [conn, other]);

  const wizard = d.classes.Wizard;
  const max = mode === 'tome' ? d.tomeLimit : mode === 'class' ? a.maxLevel : 9;
  const filtered = useMemo(() => [...(rows || [])].sort((x, y) => x.name.localeCompare(y.name)).filter((sp) => (lvl === 'all' || String(sp.level) === lvl)
    && (mode !== 'class' || a.lists.some((l) => onList(sp, l)))
    && sp.name.toLowerCase().includes(q.toLowerCase())), [rows, q, lvl, mode, a]);
  const known = (sp) => st.spells.find((s) => s.id === sp.id || s.name === sp.name);
  const left = mode === 'class' ? { c: a.cantrips - a.cantripsKnown, s: a.spells - a.spellsKnown } : null;

  function learn(sp) {
    update((s) => {
      const have = s.spells.find((x) => x.id === sp.id || x.name === sp.name);
      // Reading a tome for a spell you know, from any source, raises its rank.
      // Cantrips rank up too, but only World Dungeon ones.
      if (have && mode === 'tome') { if (sp.level > 0 || sp.wd) have.rank = Math.min(5, (have.rank || 1) + 1); return s; }
      if (have) return s;
      const base = { ...snapSpell(sp), tome: true, rank: 1 };
      if (mode === 'tome') s.spells.push({ ...base, source: 'Tome' });
      else if (mode === 'class') s.spells.push({ ...base, source: 'Class', cls: a.cls, ...(granted ? { granted: true } : {}) });
      else s.spells.push({ ...base, source: 'Feature', sourceName: from.trim() || 'Feature', ability, ...(free && sp.level > 0 ? { free: true } : {}) });
      return s;
    });
  }

  const title = mode === 'tome' ? 'Read a spell tome' : mode === 'class' ? `Learn a ${a.cls} spell` : 'Spell from a feature';
  return (
    <Modal title={title} onClose={onClose}>
      {mode === 'tome' && <p className="small muted">Any World Dungeon list. Level limit {ORD[max]}; you need Intelligence 10 + the spell's level. Reading a spell you already know raises its rank.{wizard ? ` As a wizard you can learn wizard spells up to ${ORD[d.maxSpell]} from a tome.` : ''}</p>}
      {mode === 'class' && <>
        <p className="small muted">From the World Dungeon {a.lists.join(', ')} list{a.lists.length > 1 ? 's' : ''}, up to {ORD[max]}. Left to learn: {Math.max(0, left.c)} cantrips, {Math.max(0, left.s)} spells. No Intelligence requirement.</p>
        <label className="small"><input type="checkbox" checked={granted} onChange={(e) => setGranted(e.target.checked)} /> Granted by a class or subclass feature the sheet doesn't know about (does not count)</label>
      </>}
      {mode === 'feature' && <>
        <p className="small muted">For an item, the Dabbler Inclination, or a feature that names a spell. No level limit or Intelligence requirement. Species and class spells are added for you on the Spells tab.</p>
        <div className="field"><span className="lab">Where it comes from</span><input className="f" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="High Elf cantrip, Dabbler, Ring of…" /></div>
        <div className="chips">{['INT', 'WIS', 'CHA'].map((x) => <Pick key={x} on={ability === x} onClick={() => setAbility(x)}>{ABILITY_NAME[x]}</Pick>)}</div>
        <label className="small"><input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> Once per long rest without mana</label>
      </>}
      {mode !== 'class' && <label className="small" style={{ display: 'block', marginTop: 6 }}><input type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} /> Spells from other books (Tabletop Forge library, only with your GM's permission)</label>}
      {err && <div className="err">{err}</div>}
      <input className="f search-in" placeholder="Search spells" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{['all', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((l) => <Pick key={l} on={lvl === l} onClick={() => setLvl(l)}>{l === 'all' ? 'All' : ORD[Number(l)]}</Pick>)}</div>
      {rows === null && <p className="muted">{other ? 'Loading the spell library from Tabletop Forge…' : 'Loading spells…'}</p>}
      {filtered.slice(0, 400).map((sp) => {
        const lim = mode === 'tome' && wizard && onList(sp, 'Wizard') ? Math.max(max, d.maxSpell) : max;
        const tooHigh = sp.level > lim;
        const intLow = mode === 'tome' && sp.level > 0 && d.scores.INT < 10 + sp.level;
        const have = known(sp);
        const ranks = sp.level > 0 || sp.wd;
        const full = mode === 'class' && !granted && (sp.level === 0 ? left.c <= 0 : left.s <= 0);
        const label = have ? (mode === 'tome' && ranks ? `Read again (rank ${Math.min(5, (have.rank || 1) + 1)})` : 'Known')
          : mode === 'tome' ? (intLow ? `Needs Intelligence ${10 + sp.level}` : 'Read tome') : full ? 'No picks left' : 'Learn';
        return (
          <details key={sp.id} className="feat" open={open === sp.id} onToggle={(e) => e.target.open && setOpen(sp.id)}>
            <summary><span>{sp.name}</span><span className="small muted">{ORD[sp.level]} · {sp.school}</span></summary>
            <div className="small muted">{sp.casting_time} · {sp.range_area} · {sp.duration}{sp.replaces?.length ? ` · replaces ${sp.replaces.map((r) => r.name).join(', ')}` : ''}</div>
            <div className="body">{sp.description}</div>
            {sp.wd && <RankTable sp={sp} rank={1} level={99} />}
            <button className="btn sm primary" style={{ marginTop: 6 }} disabled={tooHigh || (intLow && !have) || (have && (mode !== 'tome' || !ranks)) || (!have && full)} onClick={() => learn(sp)}>{label}</button>
            {tooHigh && <span className="small muted"> Above your level limit.</span>}
          </details>);
      })}
      {rows && filtered.length > 400 && <p className="small muted">Showing 400 of {filtered.length}. Search to narrow it down.</p>}
    </Modal>
  );
}

function CastModal({ sp, st, mana, cost, levels, onCast, onClose }) {
  const base = firstDamage(sp);
  const more = higherText(sp);
  return (
    <Modal title={`Cast ${sp.name}`} onClose={onClose}>
      <p className="small muted">A spell from another book. Choose the level to cast at. Ranks give free levels; above that you pay the higher level's cost.</p>
      {more && <div className="sys" style={{ fontSize: 13 }}>At higher levels: {more}</div>}
      {levels.map((l) => {
        const c = cost(sp, l);
        const big = l >= 6 && (st.mana.big || []).includes(l);
        const up = base ? upcastDice(sp, l) : null;
        const ok = c <= mana && !big;
        return (
          <button key={l} className="optcard" disabled={!ok} style={{ opacity: ok ? 1 : 0.45 }} onClick={() => onCast(l)}>
            <div className="row between"><b>{ORD[l]} level</b><span className="chip pink">{c} mana</span></div>
            <span className="small muted">{base ? `${base.damage}${up ? ` + ${up.n}d${up.sides}` : ''} ${base.damage_type || ''}` : ''}{big ? ' · already used this long rest' : c > mana ? ' · not enough mana' : ''}</span>
          </button>);
      })}
    </Modal>
  );
}

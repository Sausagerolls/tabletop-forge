import React from 'react';
import { sign, CONDITIONS } from '../rules.js';
import { weaponCategory } from '../ttf.js';
import { useRoller, AdvBar } from '../roller.jsx';
import { RulesLink } from '../rulesLinks.jsx';
import { weaponDamageModes, formatDamageWithMod } from '@ttf/utils/damage.js';
import { gateRank, ROMAN, RANK_GATE } from '../spells.js';

import { RANK_BONUS, RANK_DICE, TRAIT_SLOTS, TRAITS, heavyDice, addDice } from '../weaponRanks.js';

const isExplosive = (i) => i.item_type === 'explosive';
const isAmmo = (i) => i.item_type === 'ammo' || !isExplosive(i) && i.item_type !== 'weapon' && /\b(rounds?|bullets?|shells?|cartridges?|ammo|ammunition|rockets?)\b/i.test(i.name || '');
const isWeapon = (i) => !isExplosive(i) && !isAmmo(i) && ((i.item_type === 'weapon')
  || (Array.isArray(i.damage_entries) && i.damage_entries.some((e) => e && e.damage && !e.condition)));

// Special rounds (items/firearms.md), matched by the ammo item's name.
const SPECIAL_ROUNDS = [
  [/incendiary/i, { parts: [{ expr: '1d6', type: 'Fire' }], note: 'Flammable objects ignite.' }],
  [/explosive/i, { parts: [{ expr: '1d10', type: 'Thunder' }], note: 'Creatures within 5 ft of the target take 1d6 fire.' }],
  [/holy/i, { parts: [{ expr: '1d8', type: 'Radiant', note: 'undead and fiends only' }] }],
  [/silver/i, { parts: [{ expr: '1d6', type: 'Piercing', note: 'shapechangers only' }], note: 'Counts as silvered.' }],
  [/hollow/i, { parts: [{ expr: '1d6', type: 'Piercing', note: 'targets without armor' }] }],
  [/armou?r[- ]?piercing/i, { hit: 2, note: '+2 to hit against armored targets (included).' }],
  [/tracer/i, { note: 'On a hit, the next attack against the target before your next turn has advantage.' }],
  [/rubber/i, { note: 'Nonlethal: drops the target to 0 unconscious, not dying.' }],
];
const roundSpecial = (name) => (SPECIAL_ROUNDS.find(([re]) => re.test(name || '')) || [])[1] || null;

export const isFirearm = (it) => weaponCategory(it) === 'Firearms' || /\breload\b/i.test(`${it.properties || ''} ${it.description || ''}`);
// Shots per magazine. Library guns often say only "Reload", so the DMG figures fill in.
const KNOWN_RELOAD = [[/automatic pistol/i, 15], [/automatic rifle/i, 30], [/laser pistol/i, 50], [/laser rifle/i, 30], [/antimatter rifle/i, 2],
  [/revolver/i, 6], [/hunting rifle/i, 5], [/shotgun/i, 2], [/musket|pistol/i, 1]];
export const magazine = (it) => Number(it.reload) || Number((`${it.properties || ''} ${it.description || ''}`.match(/reload\s*\(?(\d+)/i) || [])[1])
  || (KNOWN_RELOAD.find(([re]) => re.test(it.name || '')) || [])[1] || 1;
export const roundsIn = (am) => (am.rounds != null ? Number(am.rounds) : (Number((String(am.name).match(/\((\d+)\)/) || [])[1]) || 1) * (Number(am.qty) || 1));

export function weaponLine(item, d, st, ammo) {
  const props = String(item.properties || '').toLowerCase();
  const firearm = isFirearm(item);
  const ranged = firearm || /ammunition|range|thrown/.test(props) || /ranged/i.test(item.weapon_kind || '');
  const finesse = /finesse/.test(props);
  const stat = item.attack_stat && item.attack_stat !== 'auto' && !finesse ? item.attack_stat
    : finesse ? (d.m.DEX >= d.m.STR ? 'DEX' : 'STR') : ranged && !/thrown/.test(props) ? 'DEX' : 'STR';
  const cat = weaponCategory(item);
  const prof = item.proficient === true || d.weaponProf.has(cat) || (cat === 'Firearms' && d.sl('Gunslinger') > 0)
    || st.drills.includes(item.name) || (st.learning || []).some((l) => l.name === item.name && l.done);
  const pbPart = prof ? d.pb : Math.floor(d.pb / 2);
  const special = ammo ? roundSpecial(ammo.name) : null;
  // Rank bonus doesn't stack with a magic weapon's own +N: use the higher.
  const rank = Math.min(Number(item.rank) || 1, gateRank(d.level));
  const magic = Number(item.attack_bonus_misc) || Number((String(item.name).match(/\+(\d)\b/) || [])[1]) || 0;
  const rankExtra = Math.max(0, RANK_BONUS[rank] - magic);
  const extraDice = RANK_DICE[rank] + heavyDice(d.m[stat]);
  const traits = item.traits || [];
  const toHit = d.m[stat] + pbPart + (Number(item.attack_bonus_misc) || 0) + rankExtra + (special?.hit || 0);
  const dmgMod = d.m[stat] + (Number(item.damage_bonus_misc) || 0) + rankExtra;
  // Attack modes as Tabletop Forge splits them (One-Handed, Two-Handed, Thrown...).
  // An entry of another damage type, such as a Flame Tongue's Ablaze fire, is not
  // a way of swinging: it is rolled as a second damage roll on every hit.
  let modes = [];
  try { modes = weaponDamageModes(item); } catch { modes = []; }
  // "Versatile (1d10)" with no stored two-handed entry still gets its two-handed line.
  const vers = String(item.properties || '').match(/versatile\s*\((\d+d\d+)\)/i);
  if (vers && modes.length && !modes.some((m) => /two.?hand/i.test(m.label || ''))) {
    modes[0] = { ...modes[0], label: 'One-Handed' };
    modes.splice(1, 0, { ...modes[0], key: 'dmg-versatile', label: 'Two-Handed', damage: vers[1] });
  }
  const baseType = String(modes[0]?.damage_type || '').toLowerCase();
  const isExtra = (m, i) => i > 0 && m.damage_type && String(m.damage_type).toLowerCase() !== baseType
    && !/versatile|hand|thrown|melee|ranged/i.test(m.label || '');
  const extras = modes.filter(isExtra).map((m) => ({ expr: m.damage, type: m.damage_type || '', note: m.label }));
  traits.filter((t) => t.startsWith('Elemental')).forEach((t) => extras.push({ expr: '1d6', type: (t.match(/\((\w+)\)/) || [])[1] || '', note: 'Elemental' }));
  if (ammo) {
    const ammoEntries = (ammo.damage_entries || []).filter((e) => e && e.damage && !e.condition).map((e) => ({ expr: e.damage, type: e.damage_type || '', note: ammo.name }));
    extras.push(...(ammoEntries.length ? ammoEntries : (special?.parts || []).map((x) => ({ ...x, note: x.note || ammo.name }))));
  }
  const lines = modes.filter((m, i) => !isExtra(m, i)).map((m) => ({
    label: m.label, range: m.range || '',
    parts: [{ expr: formatDamageWithMod(addDice(m.damage, extraDice), dmgMod).replace(/\s+/g, ''), type: m.damage_type || '' }, ...extras],
  }));
  const riders = (item.damage_entries || []).filter((e) => e && e.damage && e.condition);
  return { toHit, lines, parts: lines[0]?.parts || [], stat, prof, cat, range: item.weapon_range || '', firearm, special, riders,
    rank, storedRank: Number(item.rank) || 1, traits, heavy: heavyDice(d.m[stat]) };
}

export default function CombatTab({ st, d, update }) {
  const roll = useRoller();
  const fist = d.sl('Iron Fist');
  const fistDie = fist >= 15 ? '1d12' : fist >= 10 ? '1d10' : fist >= 5 ? '1d8' : fist >= 1 ? '1d6' : '1d4';
  const unarmedStat = d.m.DEX > d.m.STR ? 'DEX' : 'STR';
  const builtIn = [
    { name: 'Unarmed strike', toHit: d.m[unarmedStat] + d.pb, parts: [{ expr: `${addDice(fistDie, heavyDice(d.m[unarmedStat]))}+${d.m[unarmedStat]}`, type: 'Bludgeoning' }], note: (fist ? `Iron Fist ${fist}` : 'Scrappy') + (heavyDice(d.m[unarmedStat]) ? ' · Heavy Hands' : '') },
    { name: 'Improvised weapon', toHit: d.m.STR + d.pb, parts: [{ expr: `${addDice('1d6', heavyDice(d.m.STR))}+${d.m.STR}`, type: 'Bludgeoning' }], note: '1d8 two-handed · thrown 20/60 · breaks on a 1 (d6)' + (heavyDice(d.m.STR) ? ' · Heavy Hands' : '') },
  ];
  const weapons = st.inventory.map((it, idx) => ({ it, idx })).filter(({ it }) => isWeapon(it));
  const ammoItems = st.inventory.filter(isAmmo);
  const bombs = st.inventory.filter(isExplosive);
  const demo = d.sl('Demolitionist');

  const attack = (name, line) => roll.test(`${name} to hit`, line.toHit, {
    damage: line.parts.length ? { label: `${name} damage`, expr: line.parts[0].expr, type: line.parts[0].type, parts: line.parts } : null,
  });
  const dmgOnly = (name, line) => roll.damage(`${name} damage`, line.parts[0]?.expr, { parts: line.parts });

  function fire(idx, it, ln, w) {
    const shots = it.loaded?.shots ?? 0;
    if (shots < 1) { alert(`${it.name} is empty. Load or reload it first.`); return; }
    update((s) => { s.inventory[idx] = { ...s.inventory[idx], loaded: { ...it.loaded, shots: shots - 1 } }; return s; });
    attack(it.name, { toHit: w.toHit, parts: ln.parts });
  }
  function reload(idx, ammoName) {
    update((s) => {
      const gun = s.inventory[idx];
      const cap = magazine(gun);
      const have = gun.loaded?.ammo === ammoName ? gun.loaded.shots || 0 : 0;
      // Switching ammo puts the unfired rounds back in their box.
      if (gun.loaded?.ammo && gun.loaded.ammo !== ammoName && gun.loaded.ammo !== 'Untracked' && gun.loaded.shots) {
        const back = s.inventory.find((x) => x.name === gun.loaded.ammo);
        if (back) back.rounds = roundsIn(back) + gun.loaded.shots;
        else s.inventory.push({ name: gun.loaded.ammo, item_type: 'ammo', qty: 1, rounds: gun.loaded.shots, damage_entries: gun.loaded.damage_entries || [] });
      }
      let add = cap - have;
      if (ammoName !== 'Untracked') {
        const am = s.inventory.find((x) => x.name === ammoName);
        if (!am) return s;
        const left = roundsIn(am);
        add = Math.min(add, left);
        am.rounds = left - add; am.qty = 1;
        var ammoDamage = am.damage_entries || [];
      }
      // The loaded round's damage travels with the gun, so an emptied box can go.
      s.inventory[idx] = { ...gun, loaded: { ammo: ammoName, shots: have + add, ...(ammoName !== 'Untracked' ? { damage_entries: ammoDamage } : {}) } };
      s.inventory = s.inventory.filter((x) => !(isAmmo(x) && x.rounds === 0));
      return s;
    });
  }

  const bombLine = (it) => {
    const e = (it.damage_entries || []).find((x) => x && x.damage) || {};
    const m = String(e.damage || '').match(/^(\d+)d(\d+)(.*)$/);
    const extra = Math.floor(demo / 5);
    const expr = m ? `${Number(m[1]) + extra}d${m[2]}${m[3] || ''}` : e.damage || '';
    const baseDC = Number(it.save_dc) || Number((String(it.description || '').match(/DC (\d+)/) || [])[1]) || 12;
    return { expr, type: e.damage_type || '', dc: baseDC + Math.floor(demo / 5) };
  };

  return (
    <>
      <div className="card">
        <h2 className="sec">Conditions</h2>
        <div className="chips">{CONDITIONS.map(([c, txt]) => {
          const on = (st.condList || []).includes(c);
          return <button key={c} type="button" className={`pick${on ? ' cond' : ''}`} title={txt}
            onClick={() => update((s) => { const l = new Set(s.condList || []); if (l.has(c)) l.delete(c); else l.add(c); s.condList = [...l]; return s; })}>{c}</button>;
        })}</div>
        {(st.condList || []).map((c) => <p key={c} className="small" style={{ margin: '0 0 6px' }}><b>{c}:</b> {CONDITIONS.find((x) => x[0] === c)[1]}</p>)}
        <div className="row between" style={{ marginTop: 6 }}><span>Exhaustion</span>
          <div className="stepper"><button onClick={() => update({ exhaustion: Math.max(0, (st.exhaustion || 0) - 1) })}>−</button>
            <b style={{ minWidth: 30, textAlign: 'center' }}>{st.exhaustion || 0}</b>
            <button onClick={() => update({ exhaustion: Math.min(6, (st.exhaustion || 0) + 1) })}>+</button></div></div>
        <div className="field" style={{ marginTop: 10 }}><span className="lab">Other effects (free text)</span>
          <input className="f" value={st.conditions || ''} onChange={(e) => update({ conditions: e.target.value })} placeholder="Hallucinating, covered in glue…" /></div>
      </div>

      <AdvBar />
      <div className="card" style={{ marginTop: 12 }}>
        <h2 className="sec">Attacks</h2>
        <p className="small muted">Tap the bonus to roll to hit; the result card rolls damage. Each damage type is its own roll, and crits double the dice.</p>
        {weapons.map(({ it, idx }) => {
          const loadedName = it.loaded?.ammo && it.loaded.ammo !== 'Untracked' ? it.loaded.ammo : null;
          const ammo = loadedName ? { name: loadedName, damage_entries: it.loaded.damage_entries || [], ...(st.inventory.find((x) => x.name === loadedName) || {}) } : null;
          const w = weaponLine(it, d, st, ammo);
          const cap = w.firearm ? magazine(it) : 0;
          const shots = it.loaded?.shots ?? 0;
          return (
            <div key={it.name + idx} style={{ borderBottom: '1px solid var(--rule)', padding: '9px 0' }}>
              <div className="row between"><div><b>{it.name}</b>{it.equipped && <span className="chip teal" style={{ marginLeft: 6 }}>Held</span>}</div>
                <span className="small muted">{w.stat}{!w.prof ? ' · not proficient (half PB)' : ''}</span></div>
              {w.lines.map((ln) => (
                <div className="row" key={ln.label} style={{ marginTop: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }} className="small">
                    {w.lines.length > 1 && <b>{ln.label}: </b>}{ln.parts.map((p) => `${p.expr} ${p.type}${p.note ? ` (${p.note})` : ''}`).join(' + ')}{ln.range ? <span className="muted"> · {ln.range}</span> : ''}
                  </div>
                  <button className="roll" onClick={() => (w.firearm ? fire(idx, it, ln, w) : attack(`${it.name}${w.lines.length > 1 ? ` (${ln.label})` : ''}`, { toHit: w.toHit, parts: ln.parts }))}>{w.firearm ? 'Fire ' : ''}{sign(w.toHit)}</button>
                  <button className="roll alt" onClick={() => dmgOnly(it.name, ln)}>Dmg</button>
                </div>))}
              {w.riders.map((r, i) => <div key={i} className="small muted">+ {r.damage} {r.damage_type} {r.condition}</div>)}
              <WeaponRank it={it} idx={idx} w={w} d={d} update={update} />
              {w.firearm && (
                <div className="gunbar">
                  <div className="row between">
                    <span className="small"><b>{shots}/{cap}</b> loaded · {it.loaded?.ammo === 'Untracked' ? 'standard rounds' : it.loaded?.ammo || 'empty'}</span>
                    <span className="shots">{Array.from({ length: Math.min(cap, 30) }, (_, i) => <i key={i} className={i < shots ? 'on' : ''} />)}</span>
                  </div>
                  {w.special?.note && <div className="small muted">{w.special.note}</div>}
                  <RulesLink page="firearms" anchor="Firearm Rules">Firearm rules</RulesLink>
                  <div className="row" style={{ marginTop: 6 }}>
                    <select className="f" style={{ flex: 1, minWidth: 0, padding: '6px 8px' }} value="" onChange={(e) => e.target.value && reload(idx, e.target.value)}>
                      <option value="">Load ammo…</option>
                      {ammoItems.map((am) => <option key={am.name} value={am.name}>{am.name} ({roundsIn(am)} left)</option>)}
                      <option value="Untracked">Standard rounds (untracked)</option>
                    </select>
                    <button className="btn sm dark" disabled={!it.loaded?.ammo || shots >= cap} onClick={() => reload(idx, it.loaded.ammo)}>Reload</button>
                  </div>
                </div>)}
            </div>);
        })}
        <div className="list">{builtIn.map((w) => (
          <div className="li" key={w.name}>
            <div className="grow"><b>{w.name}</b><div className="small muted">{w.parts[0].expr} {w.parts[0].type} · {w.note}</div></div>
            <button className="roll" onClick={() => attack(w.name, w)}>{sign(w.toHit)}</button>
            <button className="roll alt" onClick={() => dmgOnly(w.name, w)}>Dmg</button>
          </div>))}</div>
        {!weapons.length && <p className="small muted">No weapons yet. Add one in the Gear tab; it appears here with its to-hit and damage worked out.</p>}
      </div>

      {bombs.length > 0 && (
        <div className="card">
          <h2 className="sec">Explosives <RulesLink page="explosives" anchor="Explosive Rules" /></h2>
          <p className="small muted">Throwing one replaces an attack (range 30/90). Everyone in the area saves; you just roll damage.{demo ? ` Demolitionist ${demo}: +${Math.floor(demo / 5)} die and DC.` : ''}</p>
          <div className="list">{bombs.map((it, i) => {
            const b = bombLine(it);
            return (
              <div className="li" key={it.name + i}>
                <div className="grow"><b>{it.name}</b>{it.qty > 1 && <span className="muted"> ×{it.qty}</span>}<div className="small muted">{b.expr} {b.type} · save DC {b.dc}</div></div>
                <button className="roll alt" disabled={!it.qty} onClick={() => {
                  roll.damage(`${it.name} (DC ${b.dc})`, b.expr, { type: b.type });
                  update((s) => { const x = s.inventory.find((y) => y.name === it.name && y.item_type === 'explosive'); if (x) { x.qty = (Number(x.qty) || 1) - 1; if (x.qty <= 0) s.inventory.splice(s.inventory.indexOf(x), 1); } return s; });
                }}>Throw</button>
              </div>);
          })}</div>
        </div>)}
    </>
  );
}

// Rank I–V and traits for one weapon (rules/weapon-ranks.md).
function WeaponRank({ it, idx, w, d, update }) {
  const set = (fn) => update((s) => { const x = { ...s.inventory[idx] }; fn(x); s.inventory[idx] = x; return s; });
  const slots = TRAIT_SLOTS[w.storedRank];
  const traits = w.traits;
  return (
    <div className="small" style={{ marginTop: 4 }}>
      <span className="muted">Rank </span>
      {[1, 2, 3, 4, 5].map((r) => (
        <button key={r} type="button" className={`pick${w.storedRank === r ? ' on' : ''}`} style={{ padding: '2px 8px', fontSize: 12 }}
          onClick={() => set((x) => { x.rank = r; x.traits = (x.traits || []).slice(0, TRAIT_SLOTS[r]); })}>{ROMAN[r]}</button>))}
      {w.storedRank > w.rank && <span className="muted"> (works as {ROMAN[w.rank]} until level {RANK_GATE[w.storedRank]})</span>}
      {w.heavy > 0 && <span className="chip" style={{ marginLeft: 6 }}>Heavy Hands +{w.heavy} {w.heavy > 1 ? 'dice' : 'die'}</span>}
      {slots > 0 && (
        <div style={{ marginTop: 4 }}>
          {traits.map((t) => <span key={t} className="chip teal" style={{ marginRight: 4 }} onClick={() => set((x) => { x.traits = (x.traits || []).filter((y) => y !== t); })}>{t} ×</span>)}
          {traits.length < slots && (
            <select className="f" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value="" onChange={(e) => e.target.value && set((x) => { x.traits = [...(x.traits || []), e.target.value]; })}>
              <option value="">+ trait ({traits.length}/{slots})</option>
              {TRAITS.filter((t) => !traits.includes(t) && !(t === 'Sundering' && w.storedRank < 4)).map((t) => <option key={t}>{t}</option>)}
            </select>)}
          {traits.includes('Keen') && <span className="muted"> · crits on 19–20</span>}
        </div>)}
    </div>);
}

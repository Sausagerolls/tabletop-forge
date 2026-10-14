import React, { useEffect, useMemo, useState } from 'react';
import { MANA_COST, sign, casterKind } from '../rules.js';
import { api } from '../api.js';
import { useRoller } from '../roller.jsx';
import { Modal, Pick } from '../bits.jsx';

const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
// "The damage increases by 1d6 for each spell slot level above 1."
export function upcastDice(sp, lvl) {
  const m = String(sp.description || '').match(/increases by (\d+)d(\d+) for each (?:spell )?(?:slot )?level above (\d+)/i);
  if (!m || lvl <= Number(m[3])) return null;
  return { n: Number(m[1]) * (lvl - Number(m[3])), sides: Number(m[2]) };
}
const higherText = (sp) => (String(sp.description || '').match(/(Using a Higher-Level Spell Slot|At Higher Levels)[.:]?\s*([^\n]+)/i) || [])[2] || '';

const isAttack = (sp) => /attack/i.test(sp.attack_save || '');
const isSave = (sp) => /save/i.test(sp.attack_save || '') || !!sp.save_ability;
const firstDamage = (sp) => {
  const e = (sp.damage_entries || []).find((x) => x && x.damage);
  if (e) return e;
  // Some library spells only have dice in their text ("A dart deals 1d4 + 1 Force damage").
  const m = String(sp.description || '').match(/(\d+d\d+(?:\s*[+]\s*\d+)?)\s+(\w+)\s+damage/i);
  return m ? { damage: m[1].replace(/\s+/g, ''), damage_type: m[2] } : null;
};

export default function SpellsTab({ st, d, update, conn }) {
  const roll = useRoller();
  const [lib, setLib] = useState(null); // 'tome' | class name
  const [open, setOpen] = useState(null);
  const mana = st.mana.current ?? d.manaMax;
  const tome = st.spells.filter((s) => s.tome);
  const cls = st.spells.filter((s) => !s.tome);
  const scholar = d.sl('Tome Scholar');

  function cost(sp, lvl) {
    if (sp.fixedCost) return sp.fixedCost;
    let c = MANA_COST[lvl] || 0;
    if (sp.tome && scholar >= 5 && c > 0) c = Math.max(1, c - 1);
    if (sp.tome && d.sl('Grand Archmage') >= 20) c = Math.ceil(c / 2);
    return c;
  }

  function cast(sp, lvl, usePact) {
    const c = usePact ? MANA_COST[d.pact.level] : cost(sp, sp.tome ? sp.level : lvl);
    const pool = usePact ? (st.mana.pact ?? d.pact.mana) : mana;
    if (sp.level > 0 && c > pool) { alert(`Not enough ${usePact ? 'Pact ' : ''}mana (${c} needed).`); return; }
    if (lvl >= 6 && !sp.tome && st.mana.big.includes(lvl)) { alert(`You have already cast a ${ORD[lvl]}-level spell with mana since your last long rest.`); return; }
    update((s) => {
      if (sp.level > 0) { if (usePact) s.mana.pact = pool - c; else s.mana.current = pool - c; }
      if (lvl >= 6) s.mana.big = [...new Set([...(s.mana.big || []), lvl])];
      return s;
    });
    const eff = sp.tome ? Math.min(9, sp.level + (sp.rank || 1) - 1) : lvl;
    if (sp.id === 'heal-self') {
      const r = roll.damage(`Heal Self (Rank ${sp.rank || 1})`, `${sp.rank || 1}d8`);
      update((s) => { s.hp.current = Math.min(d.hpMax, (s.hp.current ?? d.hpMax) + r.total); return s; });
      return;
    }
    const base = firstDamage(sp);
    const up = base && !sp.tome ? upcastDice(sp, lvl) : null;
    const dmg = base && up ? { ...base, damage: `${base.damage}+${up.n}d${up.sides}` } : base;
    const atk = sp.tome ? d.tomeAtk : d.spellAtk ?? d.tomeAtk;
    if (isAttack(sp)) roll.test(`${sp.name} (${ORD[eff]}) attack`, atk, { damage: dmg ? { label: `${sp.name} damage`, expr: dmg.damage, type: dmg.damage_type } : null });
    else if (dmg) roll.damage(`${sp.name} (${ORD[eff]}, DC ${sp.tome ? d.tomeDC : d.spellDC ?? d.tomeDC})`, dmg.damage, { type: dmg.damage_type });
  }

  const castLevels = (sp) => {
    if (sp.level === 0 || sp.tome) return [sp.level];
    const out = []; for (let l = sp.level; l <= Math.max(sp.level, d.maxSpell); l += 1) out.push(l); return out;
  };

  const [castFor, setCastFor] = useState(null);
  const startCast = (sp, lvl, usePact) => {
    if (usePact || sp.tome || sp.level === 0 || castLevels(sp).length < 2) cast(sp, lvl, usePact);
    else setCastFor(sp);
  };

  return (
    <>
      {castFor && <CastModal sp={castFor} st={st} d={d} mana={mana} cost={cost} levels={castLevels(castFor)}
        onCast={(lvl, pact) => { setCastFor(null); cast(castFor, lvl, pact); }} onClose={() => setCastFor(null)} />}
      <div className="card dark">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Mana {mana} / {d.manaMax}</h2>
          {d.pact.mana > 0 && <span className="chip teal">Pact {st.mana.pact ?? d.pact.mana}/{d.pact.mana}</span>}</div>
        <div className="grid3" style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 13 }}>
          <div>Tome DC <b>{d.tomeDC}</b></div><div>Tome atk <b>{sign(d.tomeAtk)}</b></div><div>Tome limit <b>{ORD[d.tomeLimit]}</b></div>
          {d.spellDC !== null && <><div>{d.spellAbility} DC <b>{d.spellDC}</b></div><div>Spell atk <b>{sign(d.spellAtk)}</b></div><div>Max <b>{ORD[d.maxSpell] || '—'}</b></div></>}
        </div>
        <div className="small" style={{ color: '#bdb8cc', marginTop: 8 }}>Costs: {MANA_COST.slice(1).map((c, i) => `${ORD[i + 1]} ${c}`).join(' · ')}. One each of 6th–9th per long rest: {[6, 7, 8, 9].map((l) => (st.mana.big || []).includes(l) ? `${l}✓` : l).join(' ')}</div>
      </div>

      <SpellList title="Tome spells" spells={tome} d={d} cost={cost} castLevels={castLevels} onCast={startCast} open={open} setOpen={setOpen}
        onRemove={(sp) => update((s) => { s.spells = s.spells.filter((x) => !(x.id === sp.id && x.tome)); return s; })}
        onRank={(sp, delta) => update((s) => { const x = s.spells.find((y) => y.id === sp.id && y.tome); x.rank = Math.max(1, Math.min(5, (x.rank || 1) + delta)); return s; })} />
      <button className="btn primary block" style={{ marginBottom: 12 }} onClick={() => setLib('tome')}>+ Read a spell tome</button>

      {d.classNames.filter((c) => casterKind(c, d.classes[c].subclass) !== 'none').map((c) => (
        <React.Fragment key={c}>
          <SpellList title={`${c} spells`} spells={cls.filter((s) => s.cls === c)} d={d} cost={cost} castLevels={castLevels} onCast={startCast} open={open} setOpen={setOpen}
            pact={c === 'Warlock' && d.pact.mana > 0}
            onRemove={(sp) => update((s) => { s.spells = s.spells.filter((x) => !(x.id === sp.id && x.cls === c && !x.tome)); return s; })}
            onPrepare={(sp) => update((s) => { const x = s.spells.find((y) => y.id === sp.id && y.cls === c); x.prepared = !x.prepared; return s; })} />
          <button className="btn dark block" style={{ marginBottom: 12 }} onClick={() => setLib(c)}>+ Add {c} spell</button>
        </React.Fragment>
      ))}
      {!d.classNames.length && <p className="small muted">Class spells appear here once you choose a spellcasting class on Floor 3.</p>}

      {lib && <SpellLibrary which={lib} st={st} d={d} conn={conn} onClose={() => setLib(null)} update={update} />}
    </>
  );
}

function SpellList({ title, spells, d, cost, castLevels, onCast, onRemove, onRank, onPrepare, open, setOpen, pact }) {
  const [lvlPick, setLvlPick] = useState({});
  if (!spells.length) return <div className="card"><h2 className="sec">{title}</h2><p className="small muted">None yet.</p></div>;
  const sorted = [...spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return (
    <div className="card">
      <h2 className="sec">{title}</h2>
      {sorted.map((sp) => {
        const key = `${sp.tome ? 't' : sp.cls}-${sp.id}`;
        const levels = castLevels(sp);
        const lvl = lvlPick[key] ?? levels[0];
        const eff = sp.tome ? Math.min(9, sp.level + (sp.rank || 1) - 1) : lvl;
        return (
          <div key={key} style={{ borderBottom: '1px solid var(--rule)', padding: '9px 0' }}>
            <div className="row">
              <div className="grow" style={{ flex: 1, minWidth: 0 }} onClick={() => setOpen(open === key ? null : key)}>
                <b>{sp.name}</b> <span className="small muted">{ORD[sp.level]}{sp.tome ? ` · Rank ${sp.rank || 1}${eff !== sp.level ? ` (casts as ${ORD[eff]})` : ''}` : ''}{sp.prepared === false ? ' · not prepared' : ''}</span>
                <div className="small muted">{sp.casting_time} · {sp.range_area}{isSave(sp) && sp.save_ability ? ` · ${sp.save_ability} save` : ''}</div>
              </div>
              {sp.level > 0 && <span className="chip">{cost(sp, lvl)}{levels.length > 1 ? '+' : ''} mana</span>}
              <button className="roll" onClick={() => onCast(sp, lvl, false)}>Cast</button>
            </div>
            {open === key && (
              <div style={{ marginTop: 8 }}>
                <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{sp.description}</div>
                <div className="row wrap" style={{ marginTop: 8 }}>
                  {pact && <button className="btn sm teal" onClick={() => onCast(sp, d.pact.level, true)}>Cast with Pact Mana ({ORD[d.pact.level]})</button>}
                  {onRank && <><button className="btn sm" onClick={() => onRank(sp, -1)}>Rank −</button><button className="btn sm" onClick={() => onRank(sp, 1)}>Rank +</button></>}
                  {onPrepare && <button className="btn sm" onClick={() => onPrepare(sp)}>{sp.prepared === false ? 'Prepare' : 'Unprepare'}</button>}
                  {sp.id !== 'heal-self' && <button className="btn sm" onClick={() => onRemove(sp)}>Remove</button>}
                </div>
              </div>)}
          </div>);
      })}
    </div>
  );
}

function SpellLibrary({ which, st, d, conn, onClose, update }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [lvl, setLvl] = useState('all');
  const [open, setOpen] = useState(null);
  const isTome = which === 'tome';
  useEffect(() => {
    const params = { role: 'player', ...(conn.session ? { sessionCode: conn.session } : {}), ...(isTome ? {} : { klass: which }) };
    api.spells(conn.server, params).then((list) => {
      // 2024 rules: keep the 2024 printing of a spell when both editions exist.
      const best = new Map();
      for (const sp of list) { const k = sp.name.toLowerCase(); const held = best.get(k); if (!held || (sp.edition === '2024' && held.edition !== '2024')) best.set(k, sp); }
      setRows([...best.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)));
    }).catch((e) => { setErr(e.message); setRows([]); });
  }, [which, conn, isTome]);
  const max = isTome ? d.tomeLimit : Math.max(d.maxSpell, 0);
  const filtered = useMemo(() => (rows || []).filter((sp) => (lvl === 'all' || String(sp.level) === lvl)
    && sp.name.toLowerCase().includes(q.toLowerCase())), [rows, q, lvl]);
  const known = (sp) => st.spells.find((s) => s.id === sp.id && (isTome ? s.tome : s.cls === which));

  function learn(sp) {
    update((s) => {
      const have = s.spells.find((x) => x.id === sp.id && (isTome ? x.tome : x.cls === which));
      if (have && isTome) { have.rank = Math.min(5, (have.rank || 1) + 1); return s; }
      if (have) return s;
      const keep = ['id', 'name', 'level', 'school', 'casting_time', 'range_area', 'duration', 'attack_save', 'save_ability', 'damage_entries', 'description', 'comp_v', 'comp_s', 'comp_m', 'comp_m_text'];
      const snap = Object.fromEntries(keep.map((k) => [k, sp[k]]));
      s.spells.push(isTome ? { ...snap, tome: true, rank: 1 } : { ...snap, cls: which, prepared: true });
      return s;
    });
  }

  return (
    <Modal title={isTome ? 'Spell tomes' : `${which} spells`} onClose={onClose}>
      {isTome
        ? <p className="small muted">Read a tome to learn its spell as a tome spell (any class list). Level limit: {ORD[max]}. You need Intelligence 10 + the spell's level. Reading a spell you know raises its rank.</p>
        : <p className="small muted">Spells from the {which} list, up to {ORD[max] || 'cantrips'}.</p>}
      {err && <div className="err">{err}</div>}
      <input className="f search-in" placeholder="Search spells" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{['all', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((l) => <Pick key={l} on={lvl === l} onClick={() => setLvl(l)}>{l === 'all' ? 'All' : ORD[Number(l)]}</Pick>)}</div>
      {rows === null && <p className="muted">Loading the spell library from Tabletop Forge…</p>}
      {filtered.slice(0, 400).map((sp) => {
        const tooHigh = sp.level > max;
        const intLow = isTome && st.scores.INT < 10 + sp.level;
        const have = known(sp);
        return (
          <details key={sp.id} className="feat" open={open === sp.id} onToggle={(e) => e.target.open && setOpen(sp.id)}>
            <summary><span>{sp.name}</span><span className="small muted">{ORD[sp.level]} · {sp.school}</span></summary>
            <div className="small muted">{sp.casting_time} · {sp.range_area} · {sp.duration}</div>
            <div className="body">{sp.description}</div>
            <button className="btn sm primary" style={{ marginTop: 6 }} disabled={tooHigh || (intLow && !have) || (have && !isTome)} onClick={() => learn(sp)}>
              {have ? (isTome ? `Read again (rank ${(have.rank || 1) + 1})` : 'Known') : isTome ? (intLow ? `Needs Intelligence ${10 + sp.level}` : 'Read tome') : 'Add spell'}
            </button>
            {tooHigh && <span className="small muted"> Above your level limit.</span>}
          </details>);
      })}
      {rows && filtered.length > 400 && <p className="small muted">Showing 400 of {filtered.length}. Search to narrow it down.</p>}
    </Modal>
  );
}

function CastModal({ sp, st, d, mana, cost, levels, onCast, onClose }) {
  const base = firstDamage(sp);
  const more = higherText(sp);
  return (
    <Modal title={`Cast ${sp.name}`} onClose={onClose}>
      <p className="small muted">Choose the level to cast at. Higher levels cost more mana; you can cast up to {ORD[d.maxSpell]} level from your class.</p>
      {more && <div className="sys" style={{ fontSize: 13 }}>At higher levels: {more}</div>}
      {levels.map((l) => {
        const c = cost(sp, l);
        const big = l >= 6 && (st.mana.big || []).includes(l);
        const up = base ? upcastDice(sp, l) : null;
        const ok = c <= mana && !big;
        return (
          <button key={l} className="optcard" disabled={!ok} style={{ opacity: ok ? 1 : 0.45 }} onClick={() => onCast(l, false)}>
            <div className="row between"><b>{ORD[l]} level</b><span className="chip pink">{c} mana</span></div>
            <span className="small muted">{base ? `${base.damage}${up ? ` + ${up.n}d${up.sides}` : ''} ${base.damage_type || ''}` : ''}{big ? ' · already used this long rest' : c > mana ? ' · not enough mana' : ''}</span>
          </button>);
      })}
    </Modal>
  );
}

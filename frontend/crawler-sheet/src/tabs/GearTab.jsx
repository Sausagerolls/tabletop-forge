import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, Pick, Stepper } from '../bits.jsx';
import LootTab from './LootTab.jsx';
import SETTING from '../generated/setting.json';
import { gateRank, ROMAN, RANK_GATE } from '../spells.js';
import { UPGRADE, matsText, payUpgrade } from '../weaponRanks.js';
import { RulesLink } from '../rulesLinks.jsx';

const WD_ITEMS = SETTING.items || [];
const isRankable = (it) => it.item_type === 'weapon' || /\b(wraps|knuckles|gauntlet)\b/i.test(it.name || '');

const MATS = ['Monster Part', 'Scrap', 'Essence', 'Trophy Part'];
const blankItem = { name: '', item_type: 'gear', qty: 1, description: '', damage: '', damage_type: '', properties: '', weapon_range: '', ac_base: '', armor_category: '', weapon_category: '', reload: '', rounds: '' };

export default function GearTab({ st, d, update, conn }) {
  const [lib, setLib] = useState(false);
  const [custom, setCustom] = useState(null);
  const [open, setOpen] = useState(null);
  const [view, setView] = useState('gear');
  const waiting = Object.values(st.boxes || {}).reduce((t, b) => t + Math.max(0, b.earned - b.opened), 0);

  const setItem = (i, patch) => update((s) => { s.inventory[i] = { ...s.inventory[i], ...patch }; return s; });

  const toggle = (
    <div className="row" style={{ marginBottom: 12 }}>
      <button className={`btn block${view === 'gear' ? ' dark' : ''}`} onClick={() => setView('gear')}>Gear</button>
      <button className={`btn block${view === 'loot' ? ' primary' : ''}`} onClick={() => setView('loot')}>Loot boxes{waiting ? ` (${waiting})` : ''}</button>
    </div>);
  if (view === 'loot') return <>{toggle}<LootTab st={st} update={update} /></>;
  return (
    <>
      {toggle}
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="tile"><span className="lab">Gold (gp only)</span>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}><Stepper value={Number(st.gold) || 0} onChange={(v) => update({ gold: v })} max={9999999} /></div></div>
        <div className="tile"><span className="lab">Inventory slots</span><b style={{ color: d.slotsUsed > d.slots ? 'var(--pink)' : undefined }}>{d.slotsUsed} / {d.slots}</b>
          <div className="small muted">20 + level + expanders · equipped items use no slot</div></div>
      </div>

      <div className="card">
        <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Inventory</h2>
          <div className="row"><button className="btn sm dark" onClick={() => setLib(true)}>+ Library</button><button className="btn sm" onClick={() => setCustom({ ...blankItem })}>+ Custom</button></div></div>
        <div className="list" style={{ marginTop: 8 }}>
          {!st.inventory.length && <p className="small muted">Your clothes, your pocket item, rations, a waterskin and a potion of healing. Add them, and everything you loot.</p>}
          {st.inventory.map((it, i) => (
            <div key={i}>
              <div className="li">
                <div className="grow" onClick={() => setOpen(open === i ? null : i)}>
                  <b>{it.name}</b>{it.qty > 1 && <span className="muted"> ×{it.qty}</span>}
                  <div className="small muted">{[it.item_type, it.rarity, it.damage_entries?.[0]?.damage && `${it.damage_entries[0].damage} ${it.damage_entries[0].damage_type || ''}`, Number(it.ac_base) > 0 && `AC ${it.ac_base}`, it.rounds != null && `${it.rounds} rounds`, it.loaded && `${it.loaded.shots} loaded`].filter(Boolean).join(' · ')}</div>
                </div>
                <button className={`btn sm${it.equipped ? ' teal' : ''}`} onClick={() => setItem(i, { equipped: !it.equipped })}>{it.equipped ? 'Equipped' : 'Equip'}</button>
              </div>
              {open === i && (
                <div style={{ padding: '0 0 10px' }}>
                  {it.description && <div className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{it.description}</div>}
                  <div className="row wrap">
                    <span className="lab">Qty</span><Stepper value={Number(it.qty) || 1} min={1} onChange={(v) => setItem(i, { qty: v })} />
                    {/reload/i.test(`${it.properties || ''} ${it.description || ''}`) || it.reload ? <><span className="lab">Reload</span><Stepper value={Number(it.reload) || 0} min={0} max={200} onChange={(v) => setItem(i, { reload: v })} /></> : null}
                    {it.rounds != null && <><span className="lab">Rounds</span><Stepper value={Number(it.rounds) || 0} min={0} max={9999} onChange={(v) => setItem(i, { rounds: v })} /></>}
                    <label className="small"><input type="checkbox" checked={it.proficient === true} onChange={(e) => setItem(i, { proficient: e.target.checked })} /> Proficient</label>
                    <button className="btn sm" onClick={() => update((s) => { s.inventory.splice(i, 1); return s; })}>Remove</button>
                  </div>
                  {isRankable(it) && <WeaponUpgrade it={it} i={i} st={st} d={d} update={update} />}
                  {it.kit_rank && <UseKit kit={it} i={i} st={st} d={d} update={update} />}
                </div>)}
            </div>))}
        </div>
      </div>

      <div className="card">
        <h2 className="sec">Crafting materials</h2>
        <table className="boxgrid"><thead><tr><th style={{ textAlign: 'left' }}>Material</th>{[1, 2, 3, 4].map((t) => <th key={t}>T{t}</th>)}</tr></thead>
          <tbody>{MATS.map((m) => (
            <tr key={m}><td className="n">{m}</td>{[1, 2, 3, 4].map((t) => {
              const k = `${m}|${t}`; const v = st.materials?.[k] || 0;
              return <td key={t}><div className="cnt">
                <button className={v ? 'has' : ''} onClick={() => update((s) => { s.materials = { ...(s.materials || {}), [k]: v + 1 }; return s; })}>{v}</button>
                <small onClick={() => v && update((s) => { s.materials = { ...(s.materials || {}), [k]: v - 1 }; return s; })}>−</small></div></td>;
            })}</tr>))}
            <tr><td className="n">Boss trophies</td><td colSpan={4}><input className="f" value={st.materials?.trophies || ''} onChange={(e) => update((s) => { s.materials = { ...(s.materials || {}), trophies: e.target.value }; return s; })} /></td></tr>
          </tbody></table>
        <div className="field" style={{ marginTop: 10 }}><span className="lab">Flavors (fire Essence, dragon Trophy…)</span>
          <input className="f" value={st.materials?.flavors || ''} onChange={(e) => update((s) => { s.materials = { ...(s.materials || {}), flavors: e.target.value }; return s; })} /></div>
        <div className="field"><span className="lab">Inventory expanders (extra slots)</span><Stepper value={Number(st.slotBonus) || 0} onChange={(v) => update({ slotBonus: v })} /></div>
        <div className="field"><span className="lab">Misc AC bonus</span><Stepper value={Number(st.acMisc) || 0} min={-10} onChange={(v) => update({ acMisc: v })} /></div>
      </div>

      {lib && <ItemLibrary conn={conn} onClose={() => setLib(false)} onAdd={(it) => update((s) => { s.inventory.push({ ...it, qty: 1, equipped: false }); return s; })} />}
      {custom && (
        <Modal title="Custom item" onClose={() => setCustom(null)}>
          <div className="chips">{['gear', 'weapon', 'ammo', 'armor', 'potion', 'explosive', 'treasure'].map((t) => <Pick key={t} on={custom.item_type === t} onClick={() => setCustom({ ...custom, item_type: t })}>{t}</Pick>)}</div>
          {[['name', 'Name'], ['description', 'Description']].map(([k, l]) => (
            <div className="field" key={k}><span className="lab">{l}</span><input className="f" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} /></div>))}
          {(custom.item_type === 'weapon' || custom.item_type === 'explosive') && <div className="grid2">
            <div className="field"><span className="lab">Damage (e.g. 1d8)</span><input className="f" value={custom.damage} onChange={(e) => setCustom({ ...custom, damage: e.target.value })} /></div>
            <div className="field"><span className="lab">Damage type</span><input className="f" value={custom.damage_type} onChange={(e) => setCustom({ ...custom, damage_type: e.target.value })} /></div>
            <div className="field"><span className="lab">Properties (finesse, thrown…)</span><input className="f" value={custom.properties} onChange={(e) => setCustom({ ...custom, properties: e.target.value })} /></div>
            <div className="field"><span className="lab">Range</span><input className="f" value={custom.weapon_range} onChange={(e) => setCustom({ ...custom, weapon_range: e.target.value })} /></div>
            <div className="field"><span className="lab">Category</span><select className="f" value={custom.weapon_category} onChange={(e) => setCustom({ ...custom, weapon_category: e.target.value })}>
              <option value="">Auto</option><option>Simple</option><option>Martial</option><option>Firearms</option><option>Improvised</option></select></div>
            {custom.item_type === 'weapon' && <div className="field"><span className="lab">Reload (shots per magazine, guns)</span><input className="f" value={custom.reload} inputMode="numeric" onChange={(e) => setCustom({ ...custom, reload: e.target.value })} /></div>}
          </div>}
          {custom.item_type === 'ammo' && <div className="grid2">
            <div className="field"><span className="lab">Rounds</span><input className="f" value={custom.rounds} inputMode="numeric" onChange={(e) => setCustom({ ...custom, rounds: e.target.value })} placeholder="20" /></div>
            <div className="field"><span className="lab">Extra damage on a hit</span><input className="f" value={custom.damage} onChange={(e) => setCustom({ ...custom, damage: e.target.value })} placeholder="1d6 (blank for standard)" /></div>
            <div className="field"><span className="lab">Extra damage type</span><input className="f" value={custom.damage_type} onChange={(e) => setCustom({ ...custom, damage_type: e.target.value })} /></div>
            <p className="small muted">Name special rounds as in Firearms (Incendiary, Explosive, Holy, Silver, Hollow Point, Armor-Piercing...) and their effect is added for you.</p>
          </div>}
          {custom.item_type === 'armor' && <div className="grid2">
            <div className="field"><span className="lab">Base AC</span><input className="f" value={custom.ac_base} inputMode="numeric" onChange={(e) => setCustom({ ...custom, ac_base: e.target.value })} /></div>
            <div className="field"><span className="lab">Category</span><select className="f" value={custom.armor_category} onChange={(e) => setCustom({ ...custom, armor_category: e.target.value })}>
              <option value="">—</option><option>Light</option><option>Medium</option><option>Heavy</option><option>Shield</option></select></div>
          </div>}
          <button className="btn primary block" disabled={!custom.name.trim()} onClick={() => {
            const it = { ...custom, damage_entries: custom.damage ? [{ damage: custom.damage, damage_type: custom.damage_type }] : [] };
            delete it.damage; delete it.damage_type;
            if (it.item_type === 'ammo') it.rounds = Number(it.rounds) || 20; else delete it.rounds;
            if (it.reload) it.reload = Number(it.reload) || ''; else delete it.reload;
            update((s) => { s.inventory.push({ ...it, qty: 1, equipped: false }); return s; });
            setCustom(null);
          }}>Add item</button>
        </Modal>
      )}
    </>
  );
}

function ItemLibrary({ conn, onClose, onAdd }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [src, setSrc] = useState('wd'); // 'wd' = World Dungeon items, 'ttf' = the Tabletop Forge library
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (src === 'wd') {
      const kind = (it) => (it.item_type === 'weapon' ? 'weapon' : it.item_type === 'armor' ? 'armor' : it.item_type === 'explosive' ? 'explosive' : 'item');
      setRows(WD_ITEMS.filter((it) => (!type || kind(it) === type) && `${it.name} ${it.source}`.toLowerCase().includes(q.toLowerCase())));
      return undefined;
    }
    const t = setTimeout(() => {
      api.items(conn.server, { role: 'player', ...(q ? { search: q } : {}), ...(type ? { type } : {}), ...(conn.session ? { sessionCode: conn.session } : {}) })
        .then(setRows).catch((e) => { setErr(e.message); setRows([]); });
    }, 250);
    return () => clearTimeout(t);
  }, [q, type, conn, src]);
  return (
    <Modal title="Item library" onClose={onClose}>
      {err && <div className="err">{err}</div>}
      <div className="chips">{[['wd', 'World Dungeon'], ['ttf', 'Tabletop Forge library']].map(([k, l]) => <Pick key={k} on={src === k} onClick={() => { setRows(null); setSrc(k); }}>{l}</Pick>)}</div>
      <input className="f search-in" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{[['', 'All'], ['weapon', 'Weapons'], ['armor', 'Armor'], ...(src === 'wd' ? [['explosive', 'Explosives']] : []), ['item', 'Gear']].map(([k, l]) => <Pick key={k} on={type === k} onClick={() => setType(k)}>{l}</Pick>)}</div>
      {src === 'wd' && <p className="small muted">Setting items: firearms, explosives, dungeon items, divine gear and Weapon Upgrade Kits. Every weapon has a rank (I–V): raise it from the item in your inventory.</p>}
      {rows === null && <p className="muted">Loading…</p>}
      {(rows || []).slice(0, 250).map((it) => (
        <details key={it.id} className="feat">
          <summary><span>{it.name}</span><span className="small muted">{it.item_type}{it.rarity ? ` · ${it.rarity}` : ''}{it.source ? ` · ${it.source}` : ''}</span></summary>
          <div className="small muted">{[it.damage_entries?.[0]?.damage && `${it.damage_entries[0].damage} ${it.damage_entries[0].damage_type || ''}`, it.properties, it.weapon_range, Number(it.ac_base) > 0 && `AC ${it.ac_base} ${it.armor_category}`, it.cost].filter(Boolean).join(' · ')}</div>
          {it.description && <div className="body">{it.description}</div>}
          <button className="btn sm primary" style={{ marginTop: 6 }} onClick={() => onAdd(it.item_type === 'weapon' ? { ...it, rank: it.rank || 1 } : it)}>Add to inventory</button>
        </details>))}
    </Modal>
  );
}

// Raise a weapon's rank at the workbench, the Armory, or as a System award (rules/weapon-ranks.md).
function WeaponUpgrade({ it, i, st, d, update }) {
  const [err, setErr] = useState('');
  const rank = Number(it.rank) || 1;
  const next = rank + 1;
  const u = UPGRADE[next];
  const raise = (how) => update((s) => {
    if (how !== 'award') { const e = payUpgrade(s, next, how === 'armory'); if (e) { setErr(e); return s; } }
    setErr('');
    s.inventory[i] = { ...s.inventory[i], rank: next };
    s.boxLog = [{ text: `${it.name} raised to Rank ${ROMAN[next]} (${how === 'award' ? 'System award' : how === 'armory' ? 'Armory' : 'workbench'}).`, floor: s.floor, at: Date.now() }, ...(s.boxLog || [])];
    return s;
  });
  return (
    <div className="sys" style={{ fontSize: 13, marginTop: 8 }}>
      <b>Rank {ROMAN[rank]}</b>{rank > gateRank(d.level) ? ` (works as ${ROMAN[gateRank(d.level)]} until level ${RANK_GATE[rank]})` : ''}. Set traits in the Combat tab. <RulesLink page="weapon-ranks" light>Weapon ranks</RulesLink>
      {u ? <>
        <div style={{ marginTop: 4 }}>To Rank {ROMAN[next]}: {u.gold.toLocaleString()} gp, {matsText(u)}, {u.turns} floor turns at a workbench{d.level < RANK_GATE[next] ? ` (works from level ${RANK_GATE[next]})` : ''}.</div>
        <div className="row wrap" style={{ marginTop: 6 }}>
          <button className="btn sm primary" onClick={() => raise('workbench')}>Workbench ({u.gold.toLocaleString()} gp)</button>
          <button className="btn sm" onClick={() => raise('armory')}>Armory ({Math.ceil(u.gold * 1.5).toLocaleString()} gp)</button>
          <button className="btn sm" onClick={() => raise('award')}>System award (free)</button>
        </div>
        {err && <div className="small" style={{ color: 'var(--pink)', marginTop: 4 }}>{err}</div>}
      </> : <div style={{ marginTop: 4 }}>Rank V: the top rank.</div>}
    </div>);
}

// Use a Weapon Upgrade Kit on a weapon in the inventory.
function UseKit({ kit, i, st, d, update }) {
  const targets = st.inventory.map((x, j) => ({ x, j })).filter(({ x }) => isRankable(x) && (Number(x.rank) || 1) < kit.kit_rank);
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <select className="f" style={{ flex: 1 }} value="" onChange={(e) => {
        const j = Number(e.target.value);
        if (Number.isNaN(j) || e.target.value === '') return;
        update((s) => {
          const w = s.inventory[j];
          s.inventory[j] = { ...w, rank: (Number(w.rank) || 1) + 1 };
          const k = s.inventory[i];
          if ((Number(k.qty) || 1) > 1) k.qty -= 1; else s.inventory.splice(i, 1);
          s.boxLog = [{ text: `Used ${kit.name} on ${w.name}: Rank ${ROMAN[(Number(w.rank) || 1) + 1]}.`, floor: s.floor, at: Date.now() }, ...(s.boxLog || [])];
          return s;
        });
      }}>
        <option value="">Use on a weapon (up to Rank {ROMAN[kit.kit_rank]})…</option>
        {targets.map(({ x, j }) => <option key={j} value={j}>{x.name} (Rank {ROMAN[Number(x.rank) || 1]})</option>)}
      </select>
    </div>);
}

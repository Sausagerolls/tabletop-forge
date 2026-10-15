import React, { useMemo, useState } from 'react';
import { derive } from './character.js';
import MainTab from './tabs/MainTab.jsx';
import CombatTab from './tabs/CombatTab.jsx';
import SkillsTab from './tabs/SkillsTab.jsx';
import SpellsTab from './tabs/SpellsTab.jsx';
import GearTab from './tabs/GearTab.jsx';
import FeaturesTab from './tabs/FeaturesTab.jsx';
import LevelTab from './tabs/LevelTab.jsx';
import FaithCard from './FaithCard.jsx';
import { faithOf, isSlain, shortName } from './faith.js';
import { featChoices, featDone } from './featRules.js';
import { classSpellAllowance, grantedSpells, grantDone } from './spells.js';
import { rulesHref } from './rulesLinks.jsx';

const TABS = [
  ['main', 'Main', '♥'], ['combat', 'Combat', '⚔'], ['skills', 'Skills', '★'], ['spells', 'Spells', '✦'],
  ['gear', 'Gear', '⛁'], ['features', 'Features', '❖'], ['faith', 'Faith', '☥'], ['level', 'Level', '▲'],
];

export default function Sheet({ st, update, conn, status, error, onBack, charId }) {
  const [tab, setTab] = useState('main');
  const d = useMemo(() => derive(st), [st]);
  const props = { st, d, update, conn, charId };
  const cls = d.classNames.length ? d.classNames.map((c) => `${c} ${d.classes[c].level}`).join(' / ') : 'Crawler';
  const featTodo = st.feats.filter((f) => featChoices(f).length && !featDone(f, d, st.spells)).map((f) => f.name);
  const allowance = classSpellAllowance(st, d);
  const spellTodo = allowance.filter((a) => a.cantripsKnown < a.cantrips || a.spellsKnown < a.spells).map((a) => a.cls);
  const grantTodo = grantedSpells(st, d).filter((g) => g.spell && !grantDone(st, g)).length;
  const rankTodo = allowance.reduce((t, a) => t + Math.max(0, a.rankUps - a.rankUpsSpent), 0);
  const fth = faithOf(st);
  const riteTodo = fth.god && !isSlain(fth, fth.god) && !fth.riteDone ? shortName(fth.god) : '';
  const go = (t) => { setTab(t); window.scrollTo(0, 0); };
  return (
    <div>
      <div className="top">
        <button className="iconbtn" onClick={onBack}>‹</button>
        <div className="t">
          <div className="k">Floor {st.floor} · Level {d.level}</div>
          <h1>{st.name || 'Crawler'}</h1>
          <div className="sub">{cls}{st.speciesName ? ` · ${st.speciesName}` : ''}</div>
          {((st.condList || []).length > 0 || st.exhaustion > 0) && <div className="condbar">{(st.condList || []).map((c) => <span key={c}>{c}</span>)}{st.exhaustion > 0 && <span>Exhaustion {st.exhaustion}</span>}</div>}
        </div>
        <a className="iconbtn rules" href={rulesHref()} target="_blank" rel="noopener" title="World Dungeon rules">Rules</a>
        <span className={`save-dot ${status}`} title={status === 'error' ? error : status} />
      </div>
      {status === 'error' && <div className="err" style={{ margin: 10 }}>Not saved to Tabletop Forge: {error}</div>}
      <div className="page">
        {tab === 'main' && (st.statPointsUnspent > 0 || st.skillPicksUnspent > 0 || featTodo.length > 0 || spellTodo.length > 0 || grantTodo > 0 || rankTodo > 0 || riteTodo) && (
          <div className="warn">
            {st.statPointsUnspent > 0 && <div onClick={() => go('skills')}>You have {st.statPointsUnspent} unspent Stat Point{st.statPointsUnspent > 1 ? 's' : ''} (Skills tab, tap +1 on an ability).</div>}
            {st.skillPicksUnspent > 0 && <div onClick={() => go('skills')}>You have {st.skillPicksUnspent} unspent Skill Pick{st.skillPicksUnspent > 1 ? 's' : ''} (Skills tab).</div>}
            {featTodo.length > 0 && <div onClick={() => go('features')}>Feat choices to make: {featTodo.join(', ')} (Features tab).</div>}
            {spellTodo.length > 0 && <div onClick={() => go('spells')}>{spellTodo.join(', ')} spells to learn (Spells tab).</div>}
            {grantTodo > 0 && <div onClick={() => go('spells')}>{grantTodo} granted spell{grantTodo > 1 ? 's' : ''} to add (Spells tab).</div>}
            {riteTodo && <div onClick={() => go('faith')}>{riteTodo}'s Rite not done today: a long rest without it is a Lapse (Faith tab).</div>}
            {rankTodo > 0 && <div onClick={() => go('spells')}>{rankTodo} spell Rank Up{rankTodo > 1 ? 's' : ''} to spend (Spells tab).</div>}
          </div>
        )}
        {tab === 'main' && <MainTab {...props} />}
        {tab === 'combat' && <CombatTab {...props} />}
        {tab === 'skills' && <SkillsTab {...props} />}
        {tab === 'spells' && <SpellsTab {...props} />}
        {tab === 'gear' && <GearTab {...props} />}
        {tab === 'features' && <FeaturesTab {...props} />}
        {tab === 'faith' && <FaithCard st={st} update={update} />}
        {tab === 'level' && <LevelTab {...props} />}
      </div>
      <nav className="tabs">{TABS.map(([k, l, ic]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}><b>{ic}</b>{l}</button>
      ))}</nav>
    </div>
  );
}

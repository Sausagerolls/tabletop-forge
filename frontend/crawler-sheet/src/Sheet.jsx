import React, { useMemo, useState } from 'react';
import { derive } from './character.js';
import MainTab from './tabs/MainTab.jsx';
import CombatTab from './tabs/CombatTab.jsx';
import SkillsTab from './tabs/SkillsTab.jsx';
import SpellsTab from './tabs/SpellsTab.jsx';
import GearTab from './tabs/GearTab.jsx';
import FeaturesTab from './tabs/FeaturesTab.jsx';
import LevelTab from './tabs/LevelTab.jsx';

const TABS = [
  ['main', 'Main', '♥'], ['combat', 'Combat', '⚔'], ['skills', 'Skills', '★'], ['spells', 'Spells', '✦'],
  ['gear', 'Gear', '⛁'], ['features', 'Features', '❖'], ['level', 'Level', '▲'],
];

export default function Sheet({ st, update, conn, status, error, onBack, charId }) {
  const [tab, setTab] = useState('main');
  const d = useMemo(() => derive(st), [st]);
  const props = { st, d, update, conn, charId };
  const cls = d.classNames.length ? d.classNames.map((c) => `${c} ${d.classes[c].level}`).join(' / ') : 'Crawler';
  const alerts = (st.statPointsUnspent > 0 ? 1 : 0) + (st.skillPicksUnspent > 0 ? 1 : 0);
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
        <span className={`save-dot ${status}`} title={status === 'error' ? error : status} />
      </div>
      {status === 'error' && <div className="err" style={{ margin: 10 }}>Not saved to Tabletop Forge: {error}</div>}
      <div className="page">
        {alerts > 0 && tab !== 'level' && tab !== 'skills' && (
          <div className="warn" onClick={() => setTab('skills')}>
            {st.statPointsUnspent > 0 && <div>You have {st.statPointsUnspent} unspent Stat Point{st.statPointsUnspent > 1 ? 's' : ''} (Skills tab, tap +1 on an ability).</div>}
            {st.skillPicksUnspent > 0 && <div>You have {st.skillPicksUnspent} unspent Skill Pick{st.skillPicksUnspent > 1 ? 's' : ''} (Skills tab).</div>}
          </div>
        )}
        {tab === 'main' && <MainTab {...props} />}
        {tab === 'combat' && <CombatTab {...props} />}
        {tab === 'skills' && <SkillsTab {...props} />}
        {tab === 'spells' && <SpellsTab {...props} />}
        {tab === 'gear' && <GearTab {...props} />}
        {tab === 'features' && <FeaturesTab {...props} />}
        {tab === 'level' && <LevelTab {...props} />}
      </div>
      <nav className="tabs">{TABS.map(([k, l, ic]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); window.scrollTo(0, 0); }}><b>{ic}</b>{l}</button>
      ))}</nav>
    </div>
  );
}

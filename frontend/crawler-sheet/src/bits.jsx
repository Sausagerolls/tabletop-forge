import React from 'react';

export function Pick({ on, lock, onClick, children }) {
  return <button type="button" className={`pick${lock ? ' lock' : on ? ' on' : ''}`} onClick={onClick}>{children}</button>;
}

// Text from the World Dungeon markdown (already converted to safe inline HTML at build time).
export const Html = ({ html, className = '' }) => <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

export function SkillCard({ skill, level, children, limitBreaker }) {
  const shown = skill.ms.filter((m) => m.lv !== '20' || limitBreaker || level >= 20);
  return (
    <div className={`sk${limitBreaker ? ' lb' : ''}`}>
      <div className="row between">
        <div style={{ minWidth: 0 }}>
          <h3 className="it">{skill.name}</h3>
          <span className="chip">{skill.cat}</span> <span className="chip">{skill.key}</span>
          {limitBreaker && <> <span className="chip gold">Limit Breaker</span></>}
        </div>
        {children}
      </div>
      {skill.intro && <p className="small"><Html html={skill.intro} /></p>}
      <p className="small" style={{ margin: '8px 0 2px' }}><span className="lab" style={{ color: 'var(--teal)' }}>Scaling </span><Html html={skill.scaling} /></p>
      {shown.map((m) => {
        const got = level >= Number(m.lv);
        return (
          <div key={m.lv} className={`ms${got ? ' got' : ' locked'}`}>
            <div className={`b${m.lv === '20' ? ' l20' : ''}`}>{m.lv}</div>
            <div><b><Html html={m.name} /></b> <Html html={m.text} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999 }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input className="num" value={value} inputMode="numeric" onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mh"><h2>{title}</h2><button className="btn sm" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

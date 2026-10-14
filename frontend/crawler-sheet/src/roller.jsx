import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { rollD20, rollDamage } from './dice.js';

const Ctx = createContext(null);
export const useRoller = () => useContext(Ctx);
const LOG_KEY = 'wd_roll_log';

export function RollerProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState(null); // null | 'adv' | 'dis'
  const [log, setLog] = useState(() => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } });
  const timer = useRef(null);

  const push = useCallback((entry) => {
    setToast(entry);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 6000);
    setLog((l) => {
      const next = [{ ...entry, at: Date.now() }, ...l].slice(0, 60);
      try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  // A d20 test (check, save, attack). An attack can carry its damage, rolled on a hit button.
  const test = useCallback((label, modifier, opts = {}) => {
    const r = rollD20(modifier, opts.mode !== undefined ? opts.mode : mode);
    push({ kind: 'd20', label, total: r.total, detail: r.detail, crit: r.crit, fumble: r.fumble, damage: opts.damage || null });
    setMode(null);
    return r;
  }, [mode, push]);

  // Damage: one expression, or several parts rolled separately (Flame Tongue's slashing
  // and fire, a gun's piercing plus its special round), each with its own type.
  const damage = useCallback((label, expr, opts = {}) => {
    const parts = Array.isArray(opts.parts) && opts.parts.length ? opts.parts : [{ expr, type: opts.type || '' }];
    const rolled = parts.map((p) => ({ p, r: rollDamage(p.expr, { crit: opts.crit }) })).filter((x) => x.r);
    if (!rolled.length) return null;
    const total = rolled.reduce((t, x) => t + x.r.total, 0);
    const lines = rolled.map((x) => `${x.r.total} ${x.p.type || ''}${x.p.note ? ` (${x.p.note})` : ''}: ${x.r.detail}`);
    push({ kind: 'dmg', label: `${label}${opts.crit ? ' (crit)' : ''}`, total, detail: lines.join(' · '), lines });
    return { total, parts: rolled.map((x) => ({ type: x.p.type, total: x.r.total })) };
  }, [push]);

  const value = { test, damage, mode, setMode, log, clear: () => { setLog([]); try { localStorage.removeItem(LOG_KEY); } catch { /* */ } } };
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className={`toast${toast.crit ? ' crit' : ''}${toast.fumble ? ' fumble' : ''}`} onClick={() => setToast(null)}>
          <div className="row between">
            <div style={{ minWidth: 0 }}>
              <div className="lab">{toast.label}</div>
              {toast.lines && toast.lines.length > 1
                ? toast.lines.map((l, i) => <div key={i} className="small" style={{ color: '#bdb8cc' }}>{l}</div>)
                : <div className="small" style={{ color: '#bdb8cc' }}>{toast.detail}</div>}
              {toast.crit && <div className="chip gold" style={{ marginTop: 4 }}>Critical!</div>}
              {toast.fumble && <div className="chip pink" style={{ marginTop: 4 }}>Natural 1</div>}
            </div>
            <div className="tot">{toast.total}</div>
          </div>
          {toast.damage && (
            <div className="row" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
              <button className="btn sm primary" onClick={() => damage(toast.damage.label, toast.damage.expr, { crit: toast.crit, type: toast.damage.type, parts: toast.damage.parts })}>
                Roll damage {toast.damage.parts?.length > 1 ? toast.damage.parts.map((p) => p.expr).join(' + ') : toast.damage.expr}{toast.crit ? ' ×2 dice' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function AdvBar() {
  const { mode, setMode } = useRoller();
  return (
    <div className="advbar">
      <button className={mode === 'dis' ? 'on' : ''} onClick={() => setMode(mode === 'dis' ? null : 'dis')}>Disadvantage</button>
      <button className={!mode ? 'on' : ''} onClick={() => setMode(null)}>Normal</button>
      <button className={mode === 'adv' ? 'on' : ''} onClick={() => setMode(mode === 'adv' ? null : 'adv')}>Advantage</button>
    </div>
  );
}

export function RollLog() {
  const { log, clear } = useRoller();
  return (
    <div className="card">
      <div className="row between"><h2 className="sec" style={{ margin: 0 }}>Roll log</h2><button className="btn sm" onClick={clear}>Clear</button></div>
      <div className="list">
        {!log.length && <p className="muted">No rolls yet. Tap any bonus on the sheet to roll it.</p>}
        {log.map((r, i) => (
          <div className="li" key={r.at + '-' + i}>
            <div className="grow"><b>{r.label}</b><div className="small muted">{r.detail}</div></div>
            <div className="big" style={{ fontSize: 24, color: r.crit ? 'var(--gold)' : undefined }}>{r.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

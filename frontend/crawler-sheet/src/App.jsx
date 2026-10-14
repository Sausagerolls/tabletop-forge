import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api, loadConnection, saveConnection, recentCharacters, rememberCharacter, normaliseServer } from './api.js';
import { newCrawler, fromCreature, toCreature, derive } from './character.js';
import Builder from './Builder.jsx';
import Sheet from './Sheet.jsx';

export default function App() {
  const [conn, setConn] = useState(() => loadConnection());
  const [screen, setScreen] = useState(conn ? 'list' : 'connect');
  const [open, setOpen] = useState(null); // { id, st }

  const openCharacter = async (id) => {
    const row = await api.get(conn.server, id);
    const st = fromCreature(row, conn.player);
    rememberCharacter({ server: conn.server, id, name: row.name, player: conn.player, session: conn.session });
    setOpen({ id, st });
    setScreen(st.created ? 'sheet' : 'builder');
  };

  if (screen === 'connect' || !conn) {
    return <Connect initial={conn} onConnected={(c) => { saveConnection(c); setConn(c); setScreen('list'); }} />;
  }
  if (screen === 'list') {
    return <CharacterList conn={conn} onOpen={openCharacter} onNew={() => { setOpen({ id: null, st: newCrawler(conn.player) }); setScreen('builder'); }}
      onDisconnect={() => setScreen('connect')} />;
  }
  return <Editor conn={conn} open={open} screen={screen} setScreen={setScreen} setOpen={setOpen} />;
}

// Holds the open character, and saves it to Tabletop Forge as it changes.
function Editor({ conn, open, screen, setScreen, setOpen }) {
  const [st, setSt] = useState(open.st);
  const [id, setId] = useState(open.id);
  const [status, setStatus] = useState('saved');
  const [error, setError] = useState('');
  const timer = useRef(null);
  const latest = useRef(st);
  latest.current = st;

  const persist = useCallback(async (next, currentId) => {
    setStatus('saving');
    try {
      const row = toCreature(next, derive(next));
      if (currentId) {
        await api.update(conn.server, currentId, row);
      } else {
        const created = await api.create(conn.server, row);
        setId(created.id);
        rememberCharacter({ server: conn.server, id: created.id, name: row.name, player: conn.player, session: conn.session });
        currentId = created.id;
      }
      setStatus('saved'); setError('');
      return currentId;
    } catch (e) {
      setStatus('error'); setError(e.message);
      return currentId;
    }
  }, [conn]);

  const update = useCallback((fn) => {
    setSt((prev) => {
      const next = typeof fn === 'function' ? fn(structuredClone(prev)) || prev : { ...prev, ...fn };
      if (next.created) {
        clearTimeout(timer.current);
        setStatus('saving');
        timer.current = setTimeout(() => { persist(latest.current, idRef.current); }, 900);
      }
      return next;
    });
  }, [persist]);
  const idRef = useRef(id);
  idRef.current = id;

  // Pick up changes the GM made in Tabletop Forge when the player comes back to the app.
  useEffect(() => {
    const onFocus = async () => {
      if (!idRef.current || status === 'saving') return;
      try {
        const row = await api.get(conn.server, idRef.current);
        const fresh = fromCreature(row, conn.player);
        if (fresh.created) setSt((prev) => ({ ...fresh, hp: fresh.hp || prev.hp }));
      } catch { /* offline: keep what we have */ }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [conn, status]);

  if (screen === 'builder') {
    return <Builder st={st} conn={conn} onCancel={() => { setOpen(null); setScreen('list'); }}
      onDone={async (finished) => {
        const done = { ...finished, created: true };
        setSt(done);
        const newId = await persist(done, id);
        if (newId) setId(newId);
        setScreen('sheet');
      }} />;
  }
  return <Sheet st={st} update={update} conn={conn} status={status} error={error} charId={id}
    onBack={() => { clearTimeout(timer.current); persist(latest.current, idRef.current); setOpen(null); setScreen('list'); }} />;
}

function Connect({ initial, onConnected }) {
  // Served from a Tabletop Forge server (its /crawler/ page), the default is that same server.
  const [server, setServer] = useState(initial?.server || import.meta.env.VITE_DEFAULT_SERVER || (import.meta.env.VITE_SAME_ORIGIN ? location.origin : ''));
  const [session, setSession] = useState(initial?.session || '');
  const [player, setPlayer] = useState(initial?.player || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setErr(''); setBusy(true);
    const s = normaliseServer(server);
    try {
      await api.health(s);
      let sessionName = '';
      if (session.trim()) sessionName = (await api.session(s, session.trim())).name;
      onConnected({ server: s, session: session.trim().toUpperCase(), sessionName, player: player.trim() });
    } catch (e) {
      const mixed = location.protocol === 'https:' && s.startsWith('http:');
      setErr(mixed ? 'This page is on https but the Tabletop Forge server is http. Browsers block that. Serve the sheet over http, or put Tabletop Forge behind https.'
        : `Could not reach Tabletop Forge at ${s}: ${e.message}`);
    }
    setBusy(false);
  };
  const recent = recentCharacters();
  return (
    <div>
      <div className="hero">
        <div className="k">WORLD DUNGEON · CRAWLER SHEET</div>
        <h1>Welcome,<br /><span>Crawler.</span></h1>
        <div style={{ color: '#d8d4e4', fontFamily: 'var(--display)', fontSize: 18 }}>Connect to your GM's Tabletop Forge to build and play your crawler.</div>
      </div>
      <div className="page">
        {err && <div className="err">{err}</div>}
        <div className="card">
          <div className="field"><span className="lab">Tabletop Forge server</span>
            <input className="f" value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://192.168.1.20" inputMode="url" autoCapitalize="none" /></div>
          <div className="field"><span className="lab">Session code (optional)</span>
            <input className="f" value={session} onChange={(e) => setSession(e.target.value.toUpperCase())} placeholder="ABC123" autoCapitalize="characters" /></div>
          <div className="field"><span className="lab">Your player name</span>
            <input className="f" value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="The name you use in Tabletop Forge" /></div>
          <button className="btn primary block" disabled={busy || !player.trim()} onClick={go}>{busy ? 'Connecting…' : 'Connect'}</button>
          <p className="small muted">Your crawler is saved on the Tabletop Forge server under your player name. Use the same name next session to carry on where you left off.</p>
        </div>
        {!!recent.length && (
          <div className="card">
            <h2 className="sec">Recent crawlers</h2>
            <div className="list">{recent.map((r) => (
              <div className="li" key={r.server + r.id}>
                <div className="grow"><b>{r.name}</b><div className="small muted">{r.player} · {r.server}</div></div>
                <button className="btn sm dark" onClick={() => onConnected({ server: r.server, session: r.session || '', player: r.player, sessionName: '' })}>Use</button>
              </div>))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterList({ conn, onOpen, onNew, onDisconnect }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.characters(conn.server, conn.player).then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  }, [conn]);
  return (
    <div>
      <div className="top">
        <div className="t"><div className="k">{conn.sessionName || conn.server}</div><h1>{conn.player}'s crawlers</h1></div>
        <button className="iconbtn" onClick={onDisconnect}>Switch</button>
      </div>
      <div className="page">
        {err && <div className="err">{err}</div>}
        <button className="btn primary block" onClick={onNew} style={{ marginBottom: 12 }}>+ Create a new crawler</button>
        {rows === null && <p className="muted">Loading…</p>}
        {rows && !rows.length && <div className="sys">No crawlers saved under "{conn.player}" on {conn.server} yet. Create one, or tap Switch to check the server and player name.</div>}
        {rows && rows.map((r) => {
          let st = r.crawler_state; if (typeof st === 'string') { try { st = JSON.parse(st); } catch { st = null; } }
          return (
            <button key={r.id} className="optcard" onClick={() => onOpen(r.id)}>
              <b>{r.name}</b>
              <span className="small muted">Level {r.char_level || 1} {r.char_class || 'Crawler'}{st?.floor ? ` · Floor ${st.floor}` : ''}{st && !st.created ? ' · unfinished' : ''}</span>
            </button>
          );
        })}
        <p className="small muted">Characters made in Tabletop Forge show here too. Opening one that is not a crawler yet starts the crawler builder with its ability scores.</p>
      </div>
    </div>
  );
}

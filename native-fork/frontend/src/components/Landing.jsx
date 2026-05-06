import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatureForm from './CreatureForm.jsx';
import {
  listPlayerSessions,
  listGmSessions,
  rememberPlayerSession,
  rememberGmSession,
  forgetSession,
} from '../utils/knownSessions.js';

// Real app icon — loads from /public/icons/ which already mirrors
// the website + native-app icon set. Falling back to an inline SVG
// here drifts every time the icon is updated, so reference the
// canonical PNG instead.
const ForgeIcon = () => (
  <img src="/icons/icon-192.png" alt="TableTop Forge"
       className="w-16 h-16 rounded-2xl" />
);
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline mr-1.5">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const DiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline mr-1.5">
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 inline mr-1.5">
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
    <path d="M5 17l.7 2.3 2.3.7-2.3.7L5 23l-.7-2.3L2 20l2.3-.7L5 17z" />
  </svg>
);

// Host-mode detection for the native (Tauri) build. The shell
// navigates the in-app webview to `?host=1` after the backend
// is up — that flag means "this browser is the GM's own native
// app, so only show GM-relevant entry points (no Join as Player,
// no Spectate)". Players hitting the same backend from their
// phones over LAN never carry the param so they get the full
// landing page unchanged. We persist into sessionStorage on
// first read so client-side router pushes that strip the query
// string don't lose host-mode mid-session.
function detectHostMode() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('host') === '1') {
      sessionStorage.setItem('dndvtt_host_mode', '1');
      return true;
    }
  } catch {}
  try {
    return sessionStorage.getItem('dndvtt_host_mode') === '1';
  } catch { return false; }
}

export default function Landing() {
  const navigate = useNavigate();
  const isHostMode = detectHostMode();
  const [playerCode, setPlayerCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [dmCode, setDmCode] = useState('');
  const [dmPass, setDmPass] = useState('');
  const [newSession, setNewSession] = useState({ name: '', password: '' });
  // In host mode start on the GM Login tab — Join as Player and
  // Spectate are hidden, so defaulting to 'player' would land on
  // an empty pane.
  const [tab, setTab] = useState(isHostMode ? 'dm' : 'player');
  const [spectatorCode, setSpectatorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Player flow
  const [playerStep, setPlayerStep] = useState(1);
  const [playerCharacters, setPlayerCharacters] = useState([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Session switcher — shown by default when the user has previous
  // player or GM logins on this device. The "+ Add Another Session"
  // button flips this to false and reveals the original tabbed form
  // so a brand-new session can still be joined / created.
  // In host mode we deliberately hide remembered player rows —
  // the GM's native app shouldn't offer "rejoin as player" since
  // the only way they'd want to use it is to GM. Player-side
  // entries can stay in storage so a later non-host browser
  // session on the same device still surfaces them; we just
  // filter the switcher view here.
  const [knownPlayer, setKnownPlayer] = useState(
    () => (isHostMode ? [] : listPlayerSessions())
  );
  const [knownGm, setKnownGm]         = useState(() => listGmSessions());
  const hasKnown = knownPlayer.length > 0 || knownGm.length > 0;
  const [showSwitcher, setShowSwitcher] = useState(hasKnown);

  function refreshKnown() {
    const p = isHostMode ? [] : listPlayerSessions();
    const g = listGmSessions();
    setKnownPlayer(p);
    setKnownGm(g);
    // If the user just forgot the last entry, drop back to the tabs
    // so they aren't staring at an empty switcher with nowhere to go.
    if (p.length === 0 && g.length === 0) setShowSwitcher(false);
  }

  function rejoinPlayer(entry) {
    rememberPlayerSession(entry); // refresh lastUsedAt
    navigate(
      `/play?code=${encodeURIComponent(entry.code)}` +
      `&name=${encodeURIComponent(entry.playerName)}` +
      `&creatureId=${entry.creatureId}`,
    );
  }

  async function rejoinGm(entry) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${entry.code}/verify-dm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPassword: entry.pass }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError('GM password no longer works for this session — log in again to refresh it.');
        return;
      }
      rememberGmSession(entry); // refresh lastUsedAt
      navigate(`/dm?code=${entry.code}&pass=${encodeURIComponent(entry.pass)}`);
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }

  function handleForget(id) {
    forgetSession(id);
    refreshKnown();
  }

  // Load existing characters when entering step 2
  useEffect(() => {
    if (playerStep !== 2) return;
    setCharsLoading(true);
    setShowCreateForm(false);
    fetch(`/api/creatures?filter=characters&player_owner=${encodeURIComponent(playerName.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        setPlayerCharacters(data);
        if (data.length === 0) setShowCreateForm(true);
      })
      .catch(() => setShowCreateForm(true))
      .finally(() => setCharsLoading(false));
  }, [playerStep]);

  function enterGame(creature) {
    const code = playerCode.trim().toUpperCase();
    const name = playerName.trim();
    rememberPlayerSession({
      code,
      playerName: name,
      creatureId: creature.id,
      creatureName: creature.name,
      creatureImagePath: creature.image_path,
    });
    navigate(`/play?code=${code}&name=${encodeURIComponent(name)}&creatureId=${creature.id}`);
  }

  function handleCharacterSaved(creature) {
    enterGame(creature);
  }

  function handleCharacterSelected(creature) {
    enterGame(creature);
  }

  async function joinAsPlayer(e) {
    e.preventDefault();
    if (!playerCode.trim() || !playerName.trim()) return;
    setPlayerStep(2);
  }

  async function joinAsDM(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${dmCode.trim().toUpperCase()}/verify-dm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPassword: dmPass }),
      });
      const data = await res.json();
      if (!data.valid) { setError('Invalid code or password'); return; }
      const code = dmCode.trim().toUpperCase();
      // Best-effort fetch of the session name so the switcher row
      // can show "The Lost Mines" instead of just the code. The
      // /api/sessions/:code endpoint is public, so no auth needed.
      let sessionName = null;
      try {
        const info = await fetch(`/api/sessions/${code}`).then((r) => r.ok ? r.json() : null);
        sessionName = info?.name || null;
      } catch {}
      rememberGmSession({ code, pass: dmPass, sessionName });
      navigate(`/dm?code=${code}&pass=${encodeURIComponent(dmPass)}`);
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }

  async function createSession(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSession.name, dmPassword: newSession.password }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      rememberGmSession({
        code: data.session_code,
        pass: newSession.password,
        sessionName: data.name || newSession.name,
      });
      navigate(`/dm?code=${data.session_code}&pass=${encodeURIComponent(newSession.password)}`);
    } catch {
      setError('Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (t) =>
    `flex-1 py-3 text-sm font-semibold transition-colors ${
      tab === t
        ? 'bg-dnd-red text-white border-b-2 border-dnd-gold'
        : 'text-gray-400 hover:text-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-dnd-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center"><ForgeIcon /></div>
          <h1 className="text-3xl font-bold text-dnd-gold font-serif">TableTop Forge</h1>
          <p className="text-gray-400 mt-1 text-sm">Dungeons & Dragons 5.5e Virtual Table Top</p>
        </div>

        <div className="bg-dnd-panel rounded-xl overflow-hidden shadow-2xl border border-gray-700">
          {showSwitcher ? (
            <SessionSwitcher
              players={knownPlayer}
              gms={knownGm}
              loading={loading}
              error={error}
              onRejoinPlayer={rejoinPlayer}
              onRejoinGm={rejoinGm}
              onForget={handleForget}
              onAddNew={() => { setShowSwitcher(false); setError(''); setTab(isHostMode ? 'dm' : 'player'); setPlayerStep(1); }}
            />
          ) : (<>
          <div className="flex border-b border-gray-700">
            {!isHostMode && (
              <button className={tabClass('player')} onClick={() => { setTab('player'); setPlayerStep(1); }}><PersonIcon />Join as Player</button>
            )}
            <button className={tabClass('dm')} onClick={() => setTab('dm')}><DiceIcon />GM Login</button>
            <button className={tabClass('create')} onClick={() => setTab('create')}><SparkleIcon />New Session</button>
            {!isHostMode && (
              <button className={tabClass('spectate')} onClick={() => setTab('spectate')} title="Audience-facing TV view">📺 Spectate</button>
            )}
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* ── PLAYER STEP 1 ── */}
            {tab === 'player' && playerStep === 1 && (
              <form onSubmit={joinAsPlayer} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="Thorin Oakenshield"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Code</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white uppercase font-mono tracking-widest focus:outline-none focus:border-dnd-gold"
                    placeholder="ABC123"
                    value={playerCode}
                    onChange={(e) => setPlayerCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-dnd-red hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Next →
                </button>
              </form>
            )}

            {/* ── PLAYER STEP 2 ── */}
            {tab === 'player' && playerStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mb-1 flex justify-center"><PersonIcon /></div>
                  <h2 className="text-dnd-gold font-semibold">Choose Your Character</h2>
                  <p className="text-xs text-gray-400 mt-1">{playerName}</p>
                </div>

                {charsLoading && (
                  <div className="text-center text-gray-500 py-4">Loading characters...</div>
                )}

                {/* Existing characters list */}
                {!charsLoading && !showCreateForm && playerCharacters.length > 0 && (
                  <div className="space-y-3">
                    {playerCharacters.map((c) => {
                      const imgUrl = c.image_path ? `/uploads/${c.image_path}` : '/uploads/creatures/default_player.png';
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-dnd-gold/50 cursor-pointer transition-colors"
                          onClick={() => handleCharacterSelected(c)}
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {imgUrl ? (
                              <img src={imgUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">🧙</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white text-sm truncate">{c.name}</div>
                            <div className="text-xs text-gray-400">{c.creature_type} • HP {c.hit_points} • AC {c.armor_class}</div>
                          </div>
                          <div className="text-dnd-gold text-sm shrink-0">Play →</div>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full py-2 text-sm text-dnd-gold border border-dnd-gold/40 rounded-lg hover:bg-dnd-gold/10 transition-colors"
                    >
                      + Create New Character
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerStep(1)}
                      className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {/* Full creation form */}
                {!charsLoading && showCreateForm && (
                  <div className="space-y-3">
                    <div className="border border-gray-700 rounded-xl overflow-hidden" style={{ height: '460px' }}>
                      <CreatureForm
                        creature={null}
                        onSave={handleCharacterSaved}
                        onCancel={playerCharacters.length > 0 ? () => setShowCreateForm(false) : () => setPlayerStep(1)}
                        extraFields={{ is_player_character: 'true', player_owner: playerName.trim() }}
                        submitLabel="Enter the Adventure"
                        isPlayerCharacter
                      />
                    </div>
                    {playerCharacters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                      >
                        ← Back to Characters
                      </button>
                    )}
                    {playerCharacters.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setPlayerStep(1)}
                        className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── GM LOGIN ── */}
            {tab === 'dm' && (
              <form onSubmit={joinAsDM} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Code</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white uppercase font-mono tracking-widest focus:outline-none focus:border-dnd-gold"
                    placeholder="ABC123"
                    value={dmCode}
                    onChange={(e) => setDmCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">GM Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="••••••••"
                    value={dmPass}
                    onChange={(e) => setDmPass(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Enter as Game Master'}
                </button>
              </form>
            )}

            {/* ── CREATE SESSION ── */}
            {tab === 'create' && (
              <form onSubmit={createSession} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Name</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="The Lost Mines of Phandelver"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">GM Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="Choose a strong password"
                    value={newSession.password}
                    onChange={(e) => setNewSession({ ...newSession, password: e.target.value })}
                    required
                    minLength={4}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
              </form>
            )}

            {tab === 'spectate' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const c = spectatorCode.trim().toUpperCase();
                  if (!c) return;
                  navigate(`/spectate?code=${c}`);
                }}
                className="space-y-4"
              >
                <p className="text-xs text-gray-400 leading-snug">
                  Read-only audience view for a TV at the table. Combines the line-of-sight of every player on the current map and follows whichever map the GM is showing. No password, no controls — just the map.
                </p>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Code</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold uppercase tracking-widest font-mono"
                    placeholder="ABC123"
                    value={spectatorCode}
                    onChange={(e) => setSpectatorCode(e.target.value.toUpperCase())}
                    maxLength={12}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-lg font-semibold transition-colors"
                >
                  Open Spectator View
                </button>
              </form>
            )}
            {hasKnown && (
              <button
                type="button"
                onClick={() => { setShowSwitcher(true); setError(''); }}
                className="mt-4 w-full text-sm text-gray-400 hover:text-gray-200 py-1"
              >
                ← Back to remembered sessions
              </button>
            )}
          </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

function SessionSwitcher({ players, gms, loading, error, onRejoinPlayer, onRejoinGm, onForget, onAddNew }) {
  return (
    <div className="p-6 space-y-5">
      <div className="text-center">
        <h2 className="text-dnd-gold font-semibold text-lg">Welcome Back</h2>
        <p className="text-xs text-gray-400 mt-1">Pick a session to rejoin, or add a new one.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {players.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Player Characters</h3>
          <div className="space-y-2">
            {players.map((p) => (
              <SessionRow
                key={p.id}
                avatar={p.creatureImagePath ? `/uploads/${p.creatureImagePath}` : '/uploads/creatures/default_player.png'}
                title={p.creatureName || p.playerName}
                subtitle={`${p.playerName} • Session ${p.code}`}
                cta={loading ? '…' : 'Play →'}
                onClick={() => onRejoinPlayer(p)}
                onForget={() => onForget(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {gms.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">GM Logins</h3>
          <div className="space-y-2">
            {gms.map((g) => (
              <SessionRow
                key={g.id}
                emoji="🎲"
                title={g.sessionName || `Session ${g.code}`}
                subtitle={`GM • ${g.code}`}
                cta={loading ? '…' : 'Resume →'}
                onClick={() => onRejoinGm(g)}
                onForget={() => onForget(g.id)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAddNew}
        className="w-full py-2 text-sm text-dnd-gold border border-dnd-gold/40 rounded-lg hover:bg-dnd-gold/10 transition-colors"
      >
        + Add Another Session
      </button>
    </div>
  );
}

function SessionRow({ avatar, emoji, title, subtitle, cta, onClick, onForget }) {
  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-dnd-gold/50 transition-colors">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{emoji || '🧙'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{title}</div>
          <div className="text-xs text-gray-400 truncate">{subtitle}</div>
        </div>
        <div className="text-dnd-gold text-sm shrink-0">{cta}</div>
      </button>
      <button
        type="button"
        onClick={onForget}
        title="Forget this session"
        className="shrink-0 text-gray-500 hover:text-red-400 px-2 py-1 text-xs"
      >
        Forget
      </button>
    </div>
  );
}

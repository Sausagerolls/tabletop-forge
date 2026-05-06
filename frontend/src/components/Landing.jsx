import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatureForm from './CreatureForm.jsx';

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

export default function Landing() {
  const navigate = useNavigate();
  const [playerCode, setPlayerCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [dmCode, setDmCode] = useState('');
  const [dmPass, setDmPass] = useState('');
  const [newSession, setNewSession] = useState({ name: '', password: '' });
  const [tab, setTab] = useState('player');
  const [spectatorCode, setSpectatorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Player flow
  const [playerStep, setPlayerStep] = useState(1);
  const [playerCharacters, setPlayerCharacters] = useState([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    navigate(`/play?code=${playerCode.trim().toUpperCase()}&name=${encodeURIComponent(playerName.trim())}&creatureId=${creature.id}`);
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
      navigate(`/dm?code=${dmCode.trim().toUpperCase()}&pass=${encodeURIComponent(dmPass)}`);
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
          <div className="flex border-b border-gray-700">
            <button className={tabClass('player')} onClick={() => { setTab('player'); setPlayerStep(1); }}><PersonIcon />Join as Player</button>
            <button className={tabClass('dm')} onClick={() => setTab('dm')}><DiceIcon />GM Login</button>
            <button className={tabClass('create')} onClick={() => setTab('create')}><SparkleIcon />New Session</button>
            <button className={tabClass('spectate')} onClick={() => setTab('spectate')} title="Audience-facing TV view">📺 Spectate</button>
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
          </div>
        </div>
      </div>
    </div>
  );
}

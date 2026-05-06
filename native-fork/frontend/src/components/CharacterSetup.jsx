import React, { useState, useEffect } from 'react';
import CreatureForm from './CreatureForm.jsx';

// CharacterSetup — the first screen a player sees when they follow the
// join link. Mirrors the player flow on the Landing page (steps 1-2 of
// the "Join as Player" tab) so a deep-linked join is the same UX as
// entering through the front door:
//   1. Player name (deep links skip Landing's name+code form so we
//      need to collect this ourselves).
//   2. Pick from existing characters owned by that name, or
//   3. Open the full CreatureForm to build a brand-new character with
//      every stat block field the host supports.
//
// We use the same `CreatureForm` component the Library + Landing use
// — the user explicitly asked for the regular character creator to
// show up here too, instead of a minimal stub.

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export default function CharacterSetup({ sessionCode, initial, onComplete }) {
  const [playerName, setPlayerName] = useState(initial.name || '');
  const [step, setStep] = useState('name');     // 'name' | 'pick'
  const [characters, setCharacters] = useState([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState(null);

  // Match Landing's step-2 effect: load every character owned by this
  // player name. Empty list jumps straight to the creation form.
  useEffect(() => {
    if (step !== 'pick') return;
    setCharsLoading(true);
    setShowCreateForm(false);
    fetch(`/api/creatures?filter=characters&player_owner=${encodeURIComponent(playerName.trim())}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setCharacters(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) || data.length === 0) setShowCreateForm(true);
      })
      .catch(() => { setCharacters([]); setShowCreateForm(true); })
      .finally(() => setCharsLoading(false));
  }, [step, playerName]);

  function commitName(e) {
    e?.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) { setError('Please enter your player name.'); return; }
    setError(null);
    setPlayerName(trimmed);
    setStep('pick');
  }

  function pickCharacter(c) {
    onComplete({
      name: playerName,
      creatureId: c.id,
      maxHp: c.hit_points || c.max_hp || 20,
      size: c.size || 'medium',
    });
  }

  // CreatureForm calls onSave with the full saved row — pull out the
  // fields create_player_token cares about and let the connection
  // effect take it from there.
  function handleCharacterSaved(creature) {
    onComplete({
      name: playerName,
      creatureId: creature.id,
      maxHp: creature.hit_points || 20,
      size: creature.size || 'medium',
    });
  }

  return (
    <div className="min-h-screen bg-dnd-dark flex items-center justify-center p-4">
      <div className={step === 'pick' && showCreateForm ? 'w-full max-w-3xl' : 'w-full max-w-md'}>
        <div className="text-center mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Joining session</div>
          <div className="text-xl font-bold font-mono text-dnd-gold tracking-widest mt-0.5">{sessionCode}</div>
        </div>

        <div className="bg-dnd-panel rounded-xl shadow-2xl border border-gray-700 p-6">
          {step === 'name' && (
            <form onSubmit={commitName} className="space-y-4">
              <h2 className="text-lg text-parchment text-center font-semibold">Who's playing?</h2>
              <p className="text-xs text-gray-400 text-center leading-snug">
                Use the same name every session — your characters are saved against this name so you can pick one up again next time.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                <input
                  autoFocus
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Thorin Oakenshield"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                  required
                />
              </div>
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-dnd-red hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >Next →</button>
            </form>
          )}

          {step === 'pick' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-1 flex justify-center text-dnd-gold"><PersonIcon /></div>
                <h2 className="text-dnd-gold font-semibold">Choose Your Character</h2>
                <p className="text-xs text-gray-400 mt-1">{playerName}</p>
              </div>

              {charsLoading && (
                <div className="text-center text-gray-500 py-4">Loading characters...</div>
              )}

              {/* Existing characters list — matches the Landing layout */}
              {!charsLoading && !showCreateForm && characters.length > 0 && (
                <div className="space-y-3">
                  {characters.map((c) => {
                    const imgUrl = c.image_path ? `/uploads/${c.image_path}` : '/uploads/creatures/default_player.png';
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-dnd-gold/50 cursor-pointer transition-colors"
                        onClick={() => pickCharacter(c)}
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {imgUrl
                            ? <img src={imgUrl} alt={c.name} className="w-full h-full object-cover" />
                            : <span className="text-2xl">🧙</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{c.name}</div>
                          <div className="text-xs text-gray-400">
                            {c.creature_type || 'Humanoid'} • HP {c.hit_points} • AC {c.armor_class}
                          </div>
                        </div>
                        <div className="text-dnd-gold text-sm shrink-0">Play →</div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-2 text-sm text-dnd-gold border border-dnd-gold/40 rounded-lg hover:bg-dnd-gold/10 transition-colors"
                  >+ Create New Character</button>
                  <button
                    type="button"
                    onClick={() => setStep('name')}
                    className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                  >← Change name</button>
                </div>
              )}

              {/* Full creator — same component the GM Library and the
                  Landing page's player flow use, so the experience is
                  identical regardless of how the player got here. */}
              {!charsLoading && showCreateForm && (
                <div className="space-y-3">
                  <div className="border border-gray-700 rounded-xl overflow-hidden" style={{ height: '460px' }}>
                    <CreatureForm
                      creature={null}
                      onSave={handleCharacterSaved}
                      onCancel={characters.length > 0 ? () => setShowCreateForm(false) : () => setStep('name')}
                      extraFields={{ is_player_character: 'true', player_owner: playerName.trim() }}
                      submitLabel="Enter the Adventure"
                      isPlayerCharacter
                    />
                  </div>
                  {characters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                    >← Back to Characters</button>
                  )}
                  {characters.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setStep('name')}
                      className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                    >← Change name</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

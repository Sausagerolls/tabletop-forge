import React, { useState, useEffect } from 'react';

// CharacterSetup — the first screen a player sees when they follow the
// join link. Replaces the old "thrown into the session as 'Adventurer'
// with no token" experience.
//
// Two paths:
//   1. The player has previously played in this game (or someone else
//      using the same name has) — their existing character creatures
//      show up as picker chips and they can hop straight in.
//   2. New player — fill out a minimal stat block (name, class, level,
//      HP/AC, six ability scores). We POST it to /api/creatures with
//      `is_player_character=true` and `player_owner=<player name>` so
//      the DM can find and edit it later in the Library.
//
// The `is_player_character` + `player_owner` fields are how the host
// already filters "characters" vs "monsters" in the library.

const CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
];

const SIZES = [
  { value: 'small',  label: 'Small'  },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large'  },
];

export default function CharacterSetup({ sessionCode, initial, onComplete }) {
  const [playerName, setPlayerName] = useState(initial.name || '');
  const [step, setStep] = useState('name');     // 'name' | 'pick' | 'create'
  const [characters, setCharacters] = useState([]);
  const [loadingChars, setLoadingChars] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    char_class: 'Fighter',
    char_level: 1,
    armor_class: 12,
    max_hp: 10,
    size: 'medium',
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Once the player commits a name, fetch every character they've
  // already created (matched by player_owner). The host's
  // GET /api/creatures supports filter=characters + player_owner.
  useEffect(() => {
    if (step !== 'pick') return;
    setLoadingChars(true);
    fetch(`/api/creatures?filter=characters&player_owner=${encodeURIComponent(playerName)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setCharacters(Array.isArray(rows) ? rows : []))
      .catch(() => setCharacters([]))
      .finally(() => setLoadingChars(false));
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

  async function createAndJoin() {
    const f = createForm;
    if (!f.name.trim()) { setError('Character name is required.'); return; }
    setSubmitting(true); setError(null);
    try {
      // The creatures endpoint expects multipart form-data and JSONB
      // fields stringified — same shape the SRD packs and encounter
      // builder use. Player-character flag + owner are how the DM's
      // library filters this row in the Characters tab.
      const fd = new FormData();
      fd.append('name', f.name.trim());
      fd.append('size', f.size);
      fd.append('creature_type', 'Humanoid');
      fd.append('alignment', 'True Neutral');
      fd.append('armor_class', String(f.armor_class));
      fd.append('hit_points', String(f.max_hp));
      fd.append('speed_walk', '30');
      fd.append('strength',     String(f.strength));
      fd.append('dexterity',    String(f.dexterity));
      fd.append('constitution', String(f.constitution));
      fd.append('intelligence', String(f.intelligence));
      fd.append('wisdom',       String(f.wisdom));
      fd.append('charisma',     String(f.charisma));
      fd.append('challenge_rating', '0');
      fd.append('proficiency_bonus', String(2 + Math.floor((Math.max(1, f.char_level) - 1) / 4)));
      fd.append('is_player_character', 'true');
      fd.append('player_owner', playerName);
      fd.append('char_class', f.char_class);
      fd.append('char_level', String(f.char_level));
      const res = await fetch('/api/creatures', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${text.slice(0, 200)}`);
      }
      const inserted = await res.json();
      onComplete({
        name: playerName,
        creatureId: inserted.id,
        maxHp: f.max_hp,
        size: f.size,
      });
    } catch (err) {
      setError(`Could not save character: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  function ScoreRow({ field, label }) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 w-24 shrink-0">{label}</label>
        <input
          type="number" min={1} max={30}
          value={createForm[field]}
          onChange={(e) => setCreateForm({ ...createForm, [field]: Number(e.target.value) || 10 })}
          className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
        />
        <span className="text-[10px] text-gray-500">
          mod {Math.floor((createForm[field] - 10) / 2) >= 0 ? '+' : ''}{Math.floor((createForm[field] - 10) / 2)}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dnd-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-dnd-panel border border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="text-center mb-5">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Joining session</div>
          <div className="text-xl font-bold font-mono text-dnd-gold tracking-widest mt-0.5">{sessionCode}</div>
        </div>

        {step === 'name' && (
          <form onSubmit={commitName} className="space-y-3">
            <h2 className="text-lg text-parchment text-center font-semibold">Who's playing?</h2>
            <p className="text-xs text-gray-400 text-center leading-snug">
              Use the same name every session — your characters are saved against this name so you can pick them up next time.
            </p>
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-center text-lg"
            />
            {error && <div className="text-xs text-red-300 text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg"
            >Continue</button>
          </form>
        )}

        {step === 'pick' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-parchment font-semibold">Choose your character</h2>
              <button
                onClick={() => setStep('name')}
                className="text-[11px] text-gray-500 hover:text-gray-300"
              >← Change name</button>
            </div>
            <p className="text-xs text-gray-400 leading-snug">
              Hi <span className="text-dnd-gold">{playerName}</span>. Pick an existing character below, or build a new one from scratch.
            </p>

            {loadingChars && (
              <div className="text-xs text-gray-500 italic text-center py-3">Loading your characters…</div>
            )}

            {!loadingChars && characters.length > 0 && (
              <div className="space-y-1.5">
                {characters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickCharacter(c)}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-semibold truncate">{c.name}</span>
                      <span className="text-[10px] text-dnd-gold uppercase tracking-wider shrink-0">
                        {c.char_class || 'class?'} {c.char_level ? `· lvl ${c.char_level}` : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      AC {c.armor_class || '?'} · HP {c.hit_points || '?'} · {c.size || 'medium'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loadingChars && characters.length === 0 && (
              <div className="text-xs text-gray-500 italic text-center py-3">
                No characters saved under this name yet — build one below.
              </div>
            )}

            <button
              onClick={() => { setStep('create'); setCreateForm((f) => ({ ...f, name: f.name || '' })); }}
              className="w-full bg-emerald-800/60 hover:bg-emerald-700/70 border border-emerald-700/60 text-emerald-100 font-semibold py-2 rounded-lg"
            >+ Build a new character</button>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-parchment font-semibold">New character</h2>
              <button
                onClick={() => setStep('pick')}
                className="text-[11px] text-gray-500 hover:text-gray-300"
              >← Back</button>
            </div>

            <input
              autoFocus
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Character name"
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={createForm.char_class}
                onChange={(e) => setCreateForm({ ...createForm, char_class: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white"
              >
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number" min={1} max={20}
                value={createForm.char_level}
                onChange={(e) => setCreateForm({ ...createForm, char_level: Number(e.target.value) || 1 })}
                placeholder="Level"
                className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">AC</label>
                <input
                  type="number" min={5} max={30}
                  value={createForm.armor_class}
                  onChange={(e) => setCreateForm({ ...createForm, armor_class: Number(e.target.value) || 10 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Max HP</label>
                <input
                  type="number" min={1} max={999}
                  value={createForm.max_hp}
                  onChange={(e) => setCreateForm({ ...createForm, max_hp: Number(e.target.value) || 1 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Size</label>
                <select
                  value={createForm.size}
                  onChange={(e) => setCreateForm({ ...createForm, size: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                >
                  {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 bg-gray-800/40 border border-gray-700 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Ability scores</div>
              <ScoreRow field="strength"     label="Strength" />
              <ScoreRow field="dexterity"    label="Dexterity" />
              <ScoreRow field="constitution" label="Constitution" />
              <ScoreRow field="intelligence" label="Intelligence" />
              <ScoreRow field="wisdom"       label="Wisdom" />
              <ScoreRow field="charisma"     label="Charisma" />
            </div>

            {error && (
              <div className="text-[11px] text-red-300 bg-red-950/40 border border-red-900/40 rounded px-2 py-1">
                {error}
              </div>
            )}

            <button
              onClick={createAndJoin}
              disabled={submitting || !createForm.name.trim()}
              className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg disabled:opacity-50"
            >{submitting ? 'Saving…' : 'Save & enter session'}</button>
            <p className="text-[10px] text-gray-500 leading-snug text-center">
              The DM can flesh this out later in the Library — name and the basic numbers are all you need to start.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

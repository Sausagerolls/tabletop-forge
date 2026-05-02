// ClassChoicesPicker — inline section on the character form's Basic
// tab that asks the player to make any class-level "build choices"
// the chosen class requires (Cleric Divine Order, Fighter Weapon
// Mastery, Rogue Expertise, etc.). Wires three input shapes:
//
//   • single        — radio cards, one per option in the choice's list
//   • multi-skills  — checkbox grid of all skills, capped at pick_count
//   • multi-weapons — comma-separated weapon names, free-form text
//
// Applies via the parent's `onApply(picks)` callback. Picks shape:
//   { [choiceId]: { kind, option_id?, picks?: string[] } }

import React, { useEffect, useMemo, useState } from 'react';

const SKILL_LABELS = {
  skill_acrobatics: 'Acrobatics (DEX)',
  skill_animal_handling: 'Animal Handling (WIS)',
  skill_arcana: 'Arcana (INT)',
  skill_athletics: 'Athletics (STR)',
  skill_deception: 'Deception (CHA)',
  skill_history: 'History (INT)',
  skill_insight: 'Insight (WIS)',
  skill_intimidation: 'Intimidation (CHA)',
  skill_investigation: 'Investigation (INT)',
  skill_medicine: 'Medicine (WIS)',
  skill_nature: 'Nature (INT)',
  skill_perception: 'Perception (WIS)',
  skill_performance: 'Performance (CHA)',
  skill_persuasion: 'Persuasion (CHA)',
  skill_religion: 'Religion (INT)',
  skill_sleight_of_hand: 'Sleight of Hand (DEX)',
  skill_stealth: 'Stealth (DEX)',
  skill_survival: 'Survival (WIS)',
};

export default function ClassChoicesPicker({
  charClass,
  charLevel,
  choices,                // ClassChoice[] for the active class
  classState,             // current creature.class_state
  onApply,                // (picks) => void
  onRemove,               // () => void
}) {
  // Local working copy of picks. Seeded from class_state if its
  // class_id matches the current class, else from defaults.
  const seedPicks = useMemo(() => {
    if (!classState || classState.class_id !== charClass) return {};
    return classState.choices || {};
  }, [classState, charClass]);

  const [picks, setPicks] = useState(seedPicks);
  useEffect(() => { setPicks(seedPicks); }, [seedPicks]);

  if (!charClass || !choices || choices.length === 0) return null;

  // Filter choices by char level so a Bard L1 doesn't see Expertise (L2)
  // until they level up.
  const dueChoices = choices.filter((c) => (c.at_level || 1) <= (charLevel || 1));
  if (dueChoices.length === 0) return null;

  function setPick(choiceId, payload) {
    setPicks((p) => ({ ...p, [choiceId]: payload }));
  }

  const allValid = dueChoices.every((c) => isValid(c, picks[c.id]));

  return (
    <div className="bg-gray-800/40 border border-purple-700/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-purple-300">{charClass} Choices</div>
          <div className="text-[11px] text-gray-500">
            Decisions every {charClass} makes when they take the class.
          </div>
        </div>
        {classState?.class_id === charClass && (
          <button type="button" onClick={onRemove}
            className="text-[10px] bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-200 px-2 py-1 rounded">
            Clear
          </button>
        )}
      </div>

      {dueChoices.map((c) => (
        <div key={c.id} className="space-y-1.5">
          <div className="text-sm text-amber-200 font-semibold">{c.label}</div>
          <div className="text-xs text-gray-300">{c.desc}</div>
          {c.kind === 'single' && (
            <div className="space-y-1">
              {(c.options || []).map((opt) => {
                const checked = picks[c.id]?.option_id === opt.id;
                return (
                  <label key={opt.id}
                    className={`flex gap-2 items-start p-2 rounded cursor-pointer border ${
                      checked ? 'bg-purple-900/30 border-purple-500' : 'bg-gray-900/40 border-gray-700 hover:border-gray-500'
                    }`}>
                    <input type="radio" checked={checked}
                      onChange={() => setPick(c.id, { kind: 'single', option_id: opt.id })}
                      className="accent-purple-500 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-100">{opt.name}</div>
                      <div className="text-xs text-gray-400">{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {c.kind === 'multi-skills' && (
            <SkillMultiPick
              picks={picks[c.id]?.picks || []}
              max={c.pick_count || 2}
              onChange={(arr) => setPick(c.id, { kind: 'multi-skills', picks: arr })}
            />
          )}
          {c.kind === 'multi-weapons' && (
            <WeaponMultiPick
              picks={picks[c.id]?.picks || []}
              max={c.pick_count || 3}
              onChange={(arr) => setPick(c.id, { kind: 'multi-weapons', picks: arr })}
            />
          )}
        </div>
      ))}

      <div className="flex justify-end pt-1">
        <button type="button"
          disabled={!allValid}
          onClick={() => onApply(picks)}
          className="text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1.5 rounded">
          Apply Class Choices
        </button>
      </div>
    </div>
  );
}

function isValid(choice, pick) {
  if (!pick) return false;
  if (choice.kind === 'single') return !!pick.option_id;
  if (choice.kind === 'multi-skills' || choice.kind === 'multi-weapons') {
    return Array.isArray(pick.picks) && pick.picks.filter(Boolean).length === (choice.pick_count || 2);
  }
  return false;
}

function SkillMultiPick({ picks, max, onChange }) {
  const set = new Set(picks);
  function toggle(skill) {
    if (set.has(skill)) {
      onChange(picks.filter((s) => s !== skill));
    } else if (set.size < max) {
      onChange([...picks, skill]);
    }
  }
  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-1">Pick {max} (currently {set.size}/{max})</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
        {Object.entries(SKILL_LABELS).map(([k, label]) => {
          const checked = set.has(k);
          const disabled = !checked && set.size >= max;
          return (
            <label key={k}
              className={`flex items-center gap-1.5 text-xs cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <input type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(k)}
                className="accent-purple-500" />
              <span className="text-gray-200">{label.split(' (')[0]}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function WeaponMultiPick({ picks, max, onChange }) {
  // Free-form: a row per pick, each a text input. Lets the player
  // type any weapon name (handy for plugin-added or homebrew weapons).
  const slots = Array.from({ length: max }, (_, i) => picks[i] || '');
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-gray-500">Pick {max} weapons</div>
      {slots.map((v, i) => (
        <input key={i}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          placeholder={`Weapon ${i + 1}`}
          value={v}
          onChange={(e) => {
            const next = [...slots];
            next[i] = e.target.value;
            onChange(next.filter((s) => s));
          }} />
      ))}
    </div>
  );
}

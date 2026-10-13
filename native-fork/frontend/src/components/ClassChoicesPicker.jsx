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
import { WEAPONS } from '../data/weapons.js';

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

// A pool of class options — invocations, metamagic, manoeuvres.
//
// Prerequisites are checked where they can be: character level, and the Pact
// Boon a 2014 Warlock has taken (several invocations require one). Anything
// the app cannot evaluate — "you must know eldritch blast", "you must have a
// pact weapon" — is shown as a note rather than enforced, because guessing
// wrong would either hide a legal option or silently allow an illegal one,
// and the player reading the line can judge it themselves.
function OptionPoolPick({ choice, picks, charLevel, allPicks, onChange }) {
  const max = choice.pick_count || 1;
  const level = Math.max(1, Number(charLevel) || 1);

  // Which pact this character has taken, if any. In 2014 that is its own
  // choice; in 2024 the pacts live in the invocation list, so a pick in this
  // very pool can satisfy another option's prerequisite.
  const pactTaken = (() => {
    const fromPactChoice = allPicks?.['warlock-pact']?.picks?.[0];
    const own = (picks || []).find((p) => String(p).startsWith('pact-of-the-'));
    const raw = fromPactChoice || own;
    if (!raw) return null;
    const m = String(raw).match(/pact-of-the-(\w+)/);
    return m ? m[1].toLowerCase() : null;
  })();

  const blocked = (opt) => {
    const pre = opt.prereq;
    if (!pre) return null;
    if (pre.level && level < pre.level) return `Level ${pre.level}`;
    if (pre.pact && String(pre.pact).toLowerCase() !== pactTaken) {
      return `Pact of the ${pre.pact}`;
    }
    return null;
  };

  const toggle = (id) => {
    const has = picks.includes(id);
    if (has) return onChange(picks.filter((p) => p !== id));
    if (picks.length >= max) return;          // at the ceiling
    onChange([...picks, id]);
  };

  return (
    <div className="space-y-1">
      <div className="text-[11px] text-gray-400">
        {picks.length} of {max} chosen
        {choice.optionEdition === 'srd2014' ? ' · 2014 rules' : ' · 2024 rules'}
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {(choice.options || []).map((opt) => {
          const checked = picks.includes(opt.id);
          const why = blocked(opt);
          const full = !checked && picks.length >= max;
          const disabled = !!why || full;
          return (
            <label
              key={opt.id}
              title={opt.desc}
              className={`flex gap-2 items-start p-2 rounded border ${
                checked ? 'bg-purple-900/30 border-purple-500'
                  : disabled ? 'bg-gray-900/30 border-gray-800 opacity-50 cursor-not-allowed'
                  : 'bg-gray-900/40 border-gray-700 hover:border-gray-500 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt.id)}
                className="accent-purple-500 mt-0.5"
              />
              <div className="min-w-0">
                <div className="text-sm text-gray-100 flex items-center gap-1.5">
                  <span>{opt.name}</span>
                  {why && <span className="text-[10px] text-amber-300">needs {why}</span>}
                </div>
                <div className="text-xs text-gray-400 line-clamp-3">{opt.desc}</div>
                {opt.prereq?.note && (
                  <div className="text-[10px] text-amber-300/80 mt-0.5">
                    Prerequisite: {opt.prereq.note}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function ClassChoicesPicker({
  charClass,
  charLevel,
  choices,                // ClassChoice[] for the active class
  classState,             // current creature.class_state
  proficientSkills,       // string[] of skill keys the character is already proficient in
  weaponProficiencies,    // string[] of weapon names the character has proficiency with
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
  // until they level up. Auto-kind choices are hidden — they apply via
  // a useEffect in CreatureForm and have no picker UI.
  const dueChoices = choices.filter((c) =>
    c.kind !== 'auto' && !c.synthetic && (c.at_level || 1) <= (charLevel || 1)
  );
  if (dueChoices.length === 0) return null;

  function setPick(choiceId, payload) {
    setPicks((p) => ({ ...p, [choiceId]: payload }));
  }

  // APPLY WHAT IS PICKED, NOT ONLY A COMPLETE SET.
  //
  // This used to require every due choice to be valid before the button
  // would enable. That locks the whole panel for any character whose class
  // choices were never fully recorded — and that is every character created
  // before a new choice was added to their class. A level-1 Druid built
  // before Primal Order existed has no skill picks stored, so `class-skills`
  // is incomplete, so Apply stayed disabled and Primal Order could never be
  // chosen at all: you select Magician, press a dead button, and nothing
  // happens.
  //
  // Only the choices that ARE valid are sent. An incomplete one was never
  // applied in the first place, so skipping it takes nothing away.
  const validChoices = dueChoices.filter((c) => isValid(c, picks[c.id]));
  const anyValid = validChoices.length > 0;
  const pending = dueChoices.filter((c) => !isValid(c, picks[c.id]));
  const validPicks = Object.fromEntries(validChoices.map((c) => [c.id, picks[c.id]]));

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
          {c.kind === 'multi-options' && (
            <OptionPoolPick
              choice={c}
              picks={picks[c.id]?.picks || []}
              charLevel={charLevel}
              allPicks={picks}
              onChange={(arr) => setPick(c.id, { kind: 'multi-options', picks: arr })}
            />
          )}
          {c.kind === 'multi-skills' && (
            <SkillMultiPick
              picks={picks[c.id]?.picks || []}
              max={c.pick_count || 2}
              // Expertise upgrades what you already have, so it offers only
              // proficient skills. A class's STARTING proficiencies come from
              // the class's own list (or any skill, for the Bard), which is
              // what `from` carries.
              available={c.grant === 'proficient' ? (c.from || null) : proficientSkills}
              grant={c.grant || 'expertise'}
              onChange={(arr) => setPick(c.id, { kind: 'multi-skills', picks: arr })}
            />
          )}
          {c.kind === 'multi-weapons' && (
            <WeaponMultiPick
              picks={picks[c.id]?.picks || []}
              max={c.pick_count || 3}
              available={weaponProficiencies}
              onChange={(arr) => setPick(c.id, { kind: 'multi-weapons', picks: arr })}
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-end gap-2 pt-1">
        {pending.length > 0 && (
          <span className="text-[10px] text-gray-500 text-right leading-snug">
            Still to choose: {pending.map((c) => c.label).join(', ')}
          </span>
        )}
        <button type="button"
          disabled={!anyValid}
          onClick={() => onApply(validPicks)}
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
  // A pool is valid at or under its ceiling. Deliberately not "exactly" —
  // a character mid-build should not be blocked from saving, and the class
  // table is a maximum you know, not a quota you must spend.
  if (choice.kind === 'multi-options') {
    return (pick.picks || []).length <= (choice.pick_count || 99);
  }
  if (choice.kind === 'multi-skills' || choice.kind === 'multi-weapons') {
    return Array.isArray(pick.picks) && pick.picks.filter(Boolean).length === (choice.pick_count || 2);
  }
  return false;
}

function SkillMultiPick({ picks, max, onChange, available, grant = 'expertise' }) {
  // Restrict to skills the character is already proficient with —
  // Expertise upgrades existing proficiency, it doesn't grant new
  // proficiency. Falls back to ALL skills only when the caller didn't
  // supply a list (homebrew flexibility).
  const pool = Array.isArray(available) && available.length > 0
    ? Object.entries(SKILL_LABELS).filter(([k]) => available.includes(k))
    : Object.entries(SKILL_LABELS);
  const set = new Set(picks);
  function toggle(skill) {
    if (set.has(skill)) {
      onChange(picks.filter((s) => s !== skill));
    } else if (set.size < max) {
      onChange([...picks, skill]);
    }
  }
  if (pool.length === 0) {
    return (
      <div className="text-[11px] text-amber-300 italic bg-amber-900/20 border border-amber-800 rounded px-2 py-1">
        {grant === 'proficient'
          ? 'No skills listed for this choice.'
          : 'No skill proficiencies on this character yet. Add proficiencies on the Saves & Skills tab first, then Expertise will be selectable here.'}
      </div>
    );
  }
  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-1">
        Pick {max} from skills you're already proficient in ({set.size}/{max})
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
        {pool.map(([k, label]) => {
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

function WeaponMultiPick({ picks, max, onChange, available }) {
  // Restrict to weapons the character is already proficient with —
  // Weapon Mastery only works on weapons you have proficiency with.
  // The `available` array now carries CONCRETE weapon names (e.g.
  // Greatsword, Longbow) — category profs like "Simple" / "Martial"
  // get expanded by the parent before this picker is rendered.
  // Falls back to a free-form text input when the pool is empty so
  // a fresh character can still record picks.
  const slots = Array.from({ length: max }, (_, i) => picks[i] || '');
  const updateSlot = (i, v) => {
    const next = [...slots];
    next[i] = v;
    onChange(next.filter((s) => s));
  };
  const havePool = Array.isArray(available) && available.length > 0;
  // Sorted + annotated dropdown options. Group by Simple-Melee /
  // Simple-Ranged / Martial-Melee / Martial-Ranged via <optgroup>
  // so a Fighter scanning the list can find their weapon fast.
  const annotated = havePool
    ? available
        .map((name) => {
          const w = WEAPONS.find((x) => x.name === name);
          return {
            name,
            category: w?.category || '',
            kind: w?.kind || '',
            mastery: w?.mastery || '',
            label: w?.mastery ? `${name} — ${w.mastery}` : name,
          };
        })
    : [];
  const groups = [
    { key: 'sm', label: 'Simple Melee',   filter: (w) => w.category === 'Simple'  && w.kind === 'Melee'  },
    { key: 'sr', label: 'Simple Ranged',  filter: (w) => w.category === 'Simple'  && w.kind === 'Ranged' },
    { key: 'mm', label: 'Martial Melee',  filter: (w) => w.category === 'Martial' && w.kind === 'Melee'  },
    { key: 'mr', label: 'Martial Ranged', filter: (w) => w.category === 'Martial' && w.kind === 'Ranged' },
    { key: 'other', label: 'Other',       filter: (w) => !w.category },
  ];
  const grouped = groups
    .map((g) => ({ ...g, items: annotated.filter(g.filter).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-gray-500">
        Pick {max} weapons {havePool
          ? 'from those you have proficiency with'
          : '(set Weapon Proficiencies field below to see a list)'}
      </div>
      {!havePool && (
        <div className="text-[11px] text-amber-300 italic bg-amber-900/20 border border-amber-800 rounded px-2 py-1">
          No Weapon Proficiencies recorded — falling back to free-form input.
          Set them on this tab once you've picked them.
        </div>
      )}
      {slots.map((v, i) => havePool ? (
        <select key={i} value={v}
          onChange={(e) => updateSlot(i, e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white">
          <option value="">— Pick weapon {i + 1} —</option>
          {grouped.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.items.map((w) => (
                <option key={w.name} value={w.name}
                  disabled={picks.includes(w.name) && picks[i] !== w.name}>
                  {w.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : (
        <input key={i}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          placeholder={`Weapon ${i + 1}`}
          value={v}
          onChange={(e) => updateSlot(i, e.target.value)} />
      ))}
    </div>
  );
}

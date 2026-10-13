import { registries } from '../plugins/pluginRegistry.js';
import { itemSpellResources } from '../utils/itemSpells.js';

// Class resource counters — Bardic Inspiration, Ki, Sorcery Points,
// Channel Divinity, Action Surge, Lay on Hands, Wild Shape, etc.
//
// Each definition computes its `total` from the character's level and
// stat block. The mutable `used` count lives on the creature row in
// `resource_state` JSONB so it round-trips through the same save path
// as everything else and stays in sync between web and mobile.
//
// Mirror of the Android catalogue at
// android/app/src/main/java/com/tabletopforge/data/Resources.kt —
// keep them aligned when fields move.

export const REST_KIND = {
  SHORT: 'short',
  LONG:  'long',
};

const cha = (c) => Math.floor(((c?.charisma     ?? 10) - 10) / 2);
const wis = (c) => Math.floor(((c?.wisdom       ?? 10) - 10) / 2);
const int = (c) => Math.floor(((c?.intelligence ?? 10) - 10) / 2);

// A Blood Hunter picks Intelligence or Wisdom for hemocraft at level 1, and
// the sheet has no field for which. The better of the two is the right guess:
// nobody picks the stat they dumped, and a counter that is one too small is
// worse than one that matches the character the player actually built.
const hemocraft = (c) => Math.max(int(c), wis(c));

// Bardic Inspiration die size scales with bard level (d6 → d8 → d10 → d12).
function biDie(level) {
  if (level >= 15) return 'd12';
  if (level >= 10) return 'd10';
  if (level >= 5)  return 'd8';
  return 'd6';
}

// Returns `[{ def, total }]` for the character. Custom-classes plugin
// classes don't appear here (they'd need their own resource definitions
// uploaded — follow-up).
// Every class a character has levels in earns its own counters.
//
// This read `char_class` alone, so a Fighter 5 / Warlock 2 got Second Wind and
// Action Surge and no Pact Magic at all — the multiclassed half of a party had
// nothing to tick for the class they had just taken. The primary class and
// every entry in `multiclasses` now each contribute, at their own level.
export function resourcesForCreature(creature) {
  const classes = [];
  const primary = (creature?.char_class || '').trim();
  if (primary) {
    classes.push({
      cls: primary,
      sub: (creature?.char_subclass || '').trim(),
      level: Math.max(1, Number(creature?.char_level) || 1),
    });
  }
  for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
    const cls = String(mc?.class || '').trim();
    if (!cls) continue;
    classes.push({
      cls,
      sub: String(mc?.subclass || '').trim(),
      level: Math.max(1, Number(mc?.level) || 1),
    });
  }
  if (!classes.length) return [];

  const defs = [];
  for (const entry of classes) defs.push(...classResourceDefs(creature, entry));

  // Limited-use magic items — a Bell of the Unseen Servant's one ring a day.
  // Derived from the inventory rather than stored on the character, so the
  // counter appears when the item is picked up and leaves with it.
  for (const r of itemSpellResources(creature)) defs.push(r);

  // `used` counts are stored by id, so two classes offering the same id would
  // share one counter. Keep the first and drop the duplicate rather than
  // render two boxes that fight over the same number.
  const seen = new Set();
  return defs
    .filter((def) => def && !seen.has(def.id) && (seen.add(def.id), true))
    .map((def) => ({ def, total: def.total }));
}

// The counters one class at one level grants. Split out of the function above
// so it can be called once per class a multiclassed character carries.
function classResourceDefs(creature, { cls, sub, level }) {
  const defs = [];
  switch (cls) {
    case 'Barbarian':
      if (sub === 'Path of the Zealot' && level >= 3) {
        defs.push({
          id: 'warrior-of-the-gods',
          label: 'Warrior of the Gods (d12s)',
          die: 'd12',
          pool: true,
          total: level >= 17 ? 7 : level >= 12 ? 6 : level >= 6 ? 5 : 4,
          rest: REST_KIND.LONG,
          note: 'Bonus Action: expend dice, roll, regain that many Hit Points.',
        });
      }
      defs.push({
        id: 'rages',
        label: 'Rages',
        total: (lvl => lvl >= 17 ? 6 : lvl >= 12 ? 5 : lvl >= 6 ? 4 : lvl >= 3 ? 3 : 2)(level),
        rest: REST_KIND.LONG,
      });
      break;

    case 'Bard':
      defs.push({
        id: 'bardic-inspiration',
        label: `Bardic Inspiration (${biDie(level)})`,
        // Exposed separately so the "Grant" UI can PATCH the
        // recipient's `inspiration_die` field with the right size.
        die: biDie(level),
        total: Math.max(1, cha(creature)),
        // Long rest until Font of Inspiration kicks in at level 5.
        rest: level >= 5 ? REST_KIND.SHORT : REST_KIND.LONG,
        note: level < 5
          ? 'Recharges on a long rest. (Short rest from level 5.)'
          : 'Recharges on a short or long rest.',
      });
      break;

    // ── Blood Hunter ─────────────────────────────────────────────────────
    //
    // Not an SRD class (Matt Mercer / Critical Role, 2020 revision). Only
    // things that are actually spent get a counter; the hemocraft die is not
    // one, so it rides in the Blood Maledict label where a player looks for
    // it rather than taking a box of its own.
    case 'Blood Hunter': {
      const hemo = level >= 17 ? 'd10' : level >= 11 ? 'd8' : level >= 5 ? 'd6' : 'd4';
      defs.push({
        id: 'blood-maledict',
        label: `Blood Maledict (${hemo})`,
        die: hemo,
        total: level >= 17 ? 4 : level >= 13 ? 3 : level >= 6 ? 2 : 1,
        rest: REST_KIND.SHORT,
        note: `Bonus Action. Amplifying costs one ${hemo} of Necrotic damage you cannot prevent. All uses return on a Short or Long Rest.`,
      });
      if (level >= 6) {
        defs.push({
          id: 'brand-of-castigation',
          label: 'Brand of Castigation',
          total: 1,
          rest: REST_KIND.SHORT,
          note: 'Brand a creature you damage with a rite weapon. Returns on a Short or Long Rest.',
        });
      }
      if (sub === 'Order of the Lycan' && level >= 3) {
        defs.push({
          id: 'hybrid-transformation',
          label: 'Hybrid Transformation',
          // At 18 the order transforms at will, so the counter stops being
          // the limit — left in place with a note rather than removed, since
          // a player still wants to see the feature listed.
          total: level >= 18 ? 99 : 2,
          rest: REST_KIND.SHORT,
          note: level >= 18
            ? 'Mastery: transform at will. The counter is here for habit, not for a limit.'
            : 'Up to 1 hour. Both uses return on a Short or Long Rest.',
        });
      }
      if (sub === 'Order of the Ghostslayer' && level >= 7) {
        defs.push({
          id: 'ethereal-step',
          label: 'Ethereal Step',
          total: 1,
          rest: REST_KIND.SHORT,
          note: 'Bonus Action: step into the Ethereal Plane for rounds equal to your hemocraft modifier.',
        });
      }
      if (sub === 'Order of the Ghostslayer' && level >= 18) {
        defs.push({
          id: 'rite-revival',
          label: 'Rite Revival',
          total: 1,
          rest: REST_KIND.LONG,
          note: 'Drop to 1 hit point instead of 0 by ending every active rite.',
        });
      }
      if (sub === 'Order of the Mutant' && level >= 7) {
        defs.push({
          id: 'strange-metabolism',
          label: 'Strange Metabolism',
          total: 1,
          rest: REST_KIND.LONG,
          note: 'Ignore one mutagen side effect for 1 minute and gain Advantage on a Charisma save.',
        });
      }
      if (sub === 'Order of the Mutant' && level >= 18) {
        defs.push({
          id: 'exalted-mutation',
          label: 'Exalted Mutation',
          total: Math.max(1, hemocraft(creature)),
          rest: REST_KIND.LONG,
          note: 'Bonus Action: swap one mutagen affecting you for another you have brewed.',
        });
      }
      if (sub === 'Order of the Profane Soul' && level >= 11) {
        defs.push({
          id: 'revealed-arcana',
          label: 'Revealed Arcana',
          total: 1,
          rest: REST_KIND.LONG,
          note: 'Cast your patron spell once without expending a slot.',
        });
      }
      break;
    }

    case 'Cleric':
      // 2024 table: 2 uses from level 2, 3 at level 6, 4 at level 18. One use
      // comes back on a Short Rest, all of them on a Long Rest.
      defs.push({
        id: 'channel-divinity',
        label: 'Channel Divinity',
        total: level >= 18 ? 4 : level >= 6 ? 3 : 2,
        rest: REST_KIND.SHORT,
        note: 'Regain one use on a Short Rest, all on a Long Rest.',
      });
      if (level >= 10) {
        defs.push({
          id: 'divine-intervention',
          label: 'Divine Intervention',
          total: 1,
          rest: REST_KIND.LONG,
          note: level >= 20
            ? 'Level 20: choosing Wish costs 2d4 Long Rests before reuse.'
            : 'Cast any Cleric spell of level 5 or lower, no slot or materials.',
        });
      }
      break;

    case 'Druid':
      // 2024 table: 2 uses from level 2, 3 at level 6, 4 at level 17 — not a
      // flat 2 with unlimited at 20. Archdruid instead refunds one use on
      // Initiative. "Channel Nature" isn't a 2024 Druid feature and has been
      // dropped; Wild Resurgence covers slot/use conversion.
      if (level >= 2) {
        defs.push({
          id: 'wild-shape',
          label: 'Wild Shape',
          total: level >= 17 ? 4 : level >= 6 ? 3 : 2,
          rest: REST_KIND.SHORT,
          note: level >= 20
            ? 'Archdruid: regain one use whenever you roll Initiative with none left.'
            : 'Regain one on a Short Rest, all on a Long Rest.',
        });
      }
      if (level >= 5) {
        defs.push({
          id: 'wild-resurgence',
          label: 'Wild Resurgence (slot → use)',
          total: 1,
          rest: REST_KIND.LONG,
          note: 'Trade a Wild Shape use for a level 1 slot once per Long Rest; the reverse costs only a slot.',
        });
      }
      break;

    case 'Fighter':
      // Grit, for Matt Mercer's Gunslinger archetype. Not SRD, which is why it
      // sits above the printed counters rather than among them.
      if (sub === 'Gunslinger' && level >= 3) {
        defs.push({
          id: 'grit',
          label: 'Grit',
          total: Math.max(1, wis(creature)),
          rest: REST_KIND.SHORT,
          note: 'Spent on trick shots. Regain one on a natural 20 with a firearm, or on a killing blow against a real threat; all of it on a Short or Long Rest.',
        });
      }
      // 2024 table: Action Surge from level 2 (twice from 17); Second Wind
      // 2 / 3 (level 4) / 4 (level 10); Indomitable from level 9, rising at
      // 13 and 17. The old numbers had Second Wind a tier late and showed
      // Indomitable from level 1.
      if (level >= 2) {
        defs.push({
          id: 'action-surge',
          label: 'Action Surge',
          total: level >= 17 ? 2 : 1,
          rest: REST_KIND.SHORT,
          note: level >= 17 ? 'Twice per rest, but only once on a turn.' : undefined,
        });
      }
      defs.push({
        id: 'second-wind',
        label: 'Second Wind',
        total: level >= 10 ? 4 : level >= 4 ? 3 : 2,
        rest: REST_KIND.SHORT,
        note: 'Regain one on a Short Rest, all on a Long Rest. Also fuels Tactical Mind.',
      });
      if (level >= 9) {
        defs.push({
          id: 'indomitable',
          label: 'Indomitable',
          total: level >= 17 ? 3 : level >= 13 ? 2 : 1,
          rest: REST_KIND.LONG,
        });
      }
      // Battle Master's Superiority Dice and Psi Warrior's Psionic Energy
      // Dice are subclass pools, but they behave exactly like a class
      // resource — surfaced here so they live with everything else.
      if (sub === 'Battle Master' && level >= 3) {
        const die = level >= 18 ? 'd12' : level >= 10 ? 'd10' : 'd8';
        defs.push({
          id: 'superiority-dice',
          label: `Superiority Dice (${die})`,
          die,
          total: level >= 15 ? 6 : level >= 7 ? 5 : 4,
          rest: REST_KIND.SHORT,
        });
      }
      if (sub === 'Psi Warrior' && level >= 3) {
        const die = level >= 17 ? 'd12' : level >= 11 ? 'd10' : level >= 5 ? 'd8' : 'd6';
        const count = level >= 17 ? 12 : level >= 13 ? 10 : level >= 9 ? 8 : level >= 5 ? 6 : 4;
        defs.push({
          id: 'psionic-energy-dice',
          label: `Psionic Energy Dice (${die})`,
          die,
          total: count,
          rest: REST_KIND.SHORT,
          note: 'Regain one on a Short Rest, all on a Long Rest.',
        });
      }
      break;

    case 'Monk':
      defs.push({
        id: 'focus-points',
        label: 'Focus Points',
        total: level >= 2 ? level : 0,
        rest: REST_KIND.SHORT,
        note: 'Equal to your monk level (2nd level+).',
      });
      if (level >= 2) {
        defs.push({
          id: 'uncanny-metabolism',
          label: 'Uncanny Metabolism',
          total: 1,
          rest: REST_KIND.LONG,
          note: 'When you roll Initiative: regain all Focus Points and roll a martial arts die to regain that many + your Monk level in Hit Points.',
        });
      }
      break;

    case 'Paladin':
      defs.push({
        id: 'lay-on-hands',
        label: 'Lay on Hands (HP pool)',
        pool: true,
        total: 5 * level,
        rest: REST_KIND.LONG,
        note: 'Spend 5 points to remove Poisoned; from level 14 also to remove other conditions.',
      });
      // 2024 table: two uses from level 3, three from level 11. The old
      // numbers gave a single use until level 7.
      if (level >= 3) {
        defs.push({
          id: 'channel-divinity',
          label: 'Channel Divinity',
          total: level >= 11 ? 3 : 2,
          rest: REST_KIND.SHORT,
          note: 'Regain one on a Short Rest, all on a Long Rest.',
        });
      }
      break;

    case 'Ranger':
      // 2024 Favored Enemy is a fixed table (2/3/4/5/6), not the Wisdom
      // modifier the old code used.
      defs.push({
        id: 'hunters-mark-uses',
        label: "Favored Enemy (Hunter's Mark)",
        total: level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : 2,
        rest: REST_KIND.LONG,
        note: "Free casts of Hunter's Mark, no spell slot needed.",
      });
      if (level >= 10) {
        defs.push({
          id: 'tireless',
          label: 'Tireless (temp HP)',
          total: Math.max(1, wis(creature)),
          rest: REST_KIND.LONG,
          note: 'Magic action: 1d8 + WIS Temporary Hit Points.',
        });
      }
      if (level >= 14) {
        defs.push({
          id: 'natures-veil',
          label: "Nature's Veil",
          total: Math.max(1, wis(creature)),
          rest: REST_KIND.LONG,
          note: 'Bonus Action: Invisible until the end of your next turn.',
        });
      }
      break;

    case 'Rogue':
      // The Rogue's own limited-use feature arrives very late — everything
      // before it (Sneak Attack, Cunning Action, Cunning Strike) is unlimited
      // or paid for out of Sneak Attack dice, which are not a pool. The class
      // had no entry here at all, so a Soulknife's dice were untracked too.
      if (level >= 20) {
        defs.push({
          id: 'stroke-of-luck',
          label: 'Stroke of Luck',
          total: 1,
          rest: REST_KIND.SHORT,
          note: 'Turn a miss into a hit, or a failed ability check into a 20.',
        });
      }
      if (sub === 'Soulknife' && level >= 3) {
        defs.push({
          id: 'psionic-energy-dice',
          label: 'Psionic Energy Dice',
          die: level >= 17 ? 'd12' : level >= 13 ? 'd10' : level >= 9 ? 'd8' : 'd6',
          pool: true,
          total: level * 2,
          rest: REST_KIND.LONG,
          note: 'Regain one as a Bonus Action on a Short Rest; all on a Long Rest.',
        });
      }
      break;

    case 'Sorcerer':
      defs.push({
        id: 'sorcery-points',
        label: 'Sorcery Points',
        pool: true,
        total: level >= 2 ? level : 0,
        rest: REST_KIND.LONG,
        note: 'Convert slots to points freely; points to slots as a Bonus Action.',
      });
      defs.push({
        id: 'innate-sorcery',
        label: 'Innate Sorcery',
        total: 2,
        rest: REST_KIND.LONG,
        note: level >= 7
          ? 'Out of uses? Spend 2 Sorcery Points to activate it anyway.'
          : '+1 spell save DC and Advantage on Sorcerer spell attacks for 1 minute.',
      });
      break;

    case 'Warlock':
      // Pact Magic slots are NOT a resource counter here. They are a row in the
      // spell-slot grid (`spell_slots.pact`), which every sheet renders — a
      // second counter in this panel read from `resource_state` instead, so a
      // Warlock had two boxes for one pool and spending from one left the other
      // full. The grid wins because that is where a player looks for slots.
      if (level >= 2) {
        defs.push({
          id: 'magical-cunning',
          label: 'Magical Cunning',
          total: 1,
          rest: REST_KIND.LONG,
          note: level >= 20
            ? 'Eldritch Master: regain ALL Pact Magic slots.'
            : 'A 1-minute rite: regain up to half your Pact Magic slots (round up).',
        });
      }
      if (level >= 11) {
        defs.push({
          id: 'mystic-arcanum',
          label: 'Mystic Arcanum',
          total: level >= 17 ? 4 : level >= 15 ? 3 : level >= 13 ? 2 : 1,
          rest: REST_KIND.LONG,
          note: 'One casting each of your level 6+ arcanum spells.',
        });
      }
      if (sub === 'Celestial Patron' && level >= 3) {
        defs.push({
          id: 'healing-light',
          label: 'Healing Light (d6s)',
          die: 'd6',
          pool: true,
          total: 1 + level,
          rest: REST_KIND.LONG,
          note: 'Bonus Action: spend up to your Charisma modifier in dice to heal.',
        });
      }
      break;

    case 'Wizard':
      defs.push({
        id: 'arcane-recovery',
        label: 'Arcane Recovery',
        total: 1,
        rest: REST_KIND.LONG,
        note: 'Once per long rest, on a short rest.',
      });
      // Abjurer's Arcane Ward is a damage POOL rather than a use counter:
      // `used` is damage the ward has soaked, so the readout is ward HP left.
      // Marked `pool` so the sheet renders a number box instead of asking for
      // one click per point of damage.
      if (sub === 'Abjurer' && level >= 3) {
        defs.push({
          id: 'arcane-ward',
          label: 'Arcane Ward',
          pool: true,
          total: Math.max(0, level * 2 + int(creature)),
          rest: REST_KIND.LONG,
          note: 'Absorbs damage before your HP. Regains 2 HP per slot level when you cast an Abjuration spell (or expend a slot as a Bonus Action).',
        });
      }
      break;

    case 'Artificer':
      defs.push({
        id: 'infusions-known',
        label: 'Infusions known',
        total: level >= 18 ? 6 : level >= 14 ? 5 : level >= 10 ? 4 : level >= 6 ? 3 : 2,
        rest: REST_KIND.LONG,
      });
      break;
  }

  // GM-authored custom-class resources from registries.customClassResources
  // (loaded by CustomClassesProvider). Total formula is a tiny
  // expression: a number, an ability code (STR/DEX/CON/INT/WIS/CHA
  // — uses the modifier), `level`, `level/2`, or `level + N`.
  for (const map of (registries?.customClassResources?.values?.() || [])) {
    if (!map || typeof map !== 'object') continue;
    const list = map[cls];
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      const total = evaluateFormula(r.total_formula, creature, level);
      defs.push({
        id:    r.id || (r.label || 'res').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: r.label || 'Resource',
        total,
        rest:  r.rest === 'short' ? REST_KIND.SHORT : REST_KIND.LONG,
        note:  r.note || undefined,
        action: r.action,         // 'spend' | 'grant' — read by Resources card
        die:    r.die || undefined,
        custom: true,             // marker for the UI to render a Grant button
      });
    }
  }

  return defs;
}

// Tiny evaluator for custom-class total formulas. Keeps the surface
// area small on purpose — formulas come from GM input and we'd
// rather refuse a malformed one than surface arbitrary JS.
function evaluateFormula(formula, creature, level) {
  const raw = String(formula || '').trim();
  if (!raw) return 1;
  const n = Number(raw);
  if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  const abilityMod = (k) => Math.floor(((creature?.[k] ?? 10) - 10) / 2);
  // Substitute tokens.
  const subbed = raw
    .replace(/\bSTR\b/g, abilityMod('strength'))
    .replace(/\bDEX\b/g, abilityMod('dexterity'))
    .replace(/\bCON\b/g, abilityMod('constitution'))
    .replace(/\bINT\b/g, abilityMod('intelligence'))
    .replace(/\bWIS\b/g, abilityMod('wisdom'))
    .replace(/\bCHA\b/g, abilityMod('charisma'))
    .replace(/\blevel\b/gi, String(level));
  // Allow only digits, whitespace, parens, + - * / and the
  // resolved numbers above. Anything else → fallback.
  if (!/^[\d+\-*/().\s]+$/.test(subbed)) return 1;
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict"; return (${subbed});`)();
    if (!Number.isFinite(v)) return 1;
    return Math.max(0, Math.floor(v));
  } catch {
    return 1;
  }
}

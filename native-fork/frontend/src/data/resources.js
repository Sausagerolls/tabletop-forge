import { registries } from '../plugins/pluginRegistry.js';

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
export function resourcesForCreature(creature) {
  const cls = (creature?.char_class || '').trim();
  if (!cls) return [];
  const level = Math.max(1, Number(creature?.char_level) || 1);

  const defs = [];
  switch (cls) {
    case 'Barbarian':
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

    case 'Cleric':
      defs.push({
        id: 'channel-divinity',
        label: 'Channel Divinity',
        total: level >= 18 ? 3 : level >= 6 ? 2 : 1,
        rest: REST_KIND.SHORT,
      });
      break;

    case 'Druid':
      defs.push({
        id: 'wild-shape',
        label: 'Wild Shape',
        total: level >= 20 ? Infinity : 2,
        rest: REST_KIND.SHORT,
        note: '2/short rest until level 20 (then unlimited).',
      });
      defs.push({
        id: 'channel-nature',
        label: 'Channel Nature',
        total: level >= 18 ? 3 : level >= 6 ? 2 : 1,
        rest: REST_KIND.SHORT,
      });
      break;

    case 'Fighter':
      defs.push({
        id: 'action-surge',
        label: 'Action Surge',
        total: level >= 17 ? 2 : 1,
        rest: REST_KIND.SHORT,
      });
      defs.push({
        id: 'second-wind',
        label: 'Second Wind',
        total: level >= 17 ? 4 : level >= 10 ? 3 : 2,
        rest: REST_KIND.SHORT,
      });
      defs.push({
        id: 'indomitable',
        label: 'Indomitable',
        total: level >= 17 ? 3 : level >= 13 ? 2 : 1,
        rest: REST_KIND.LONG,
        note: 'Available from level 9.',
      });
      break;

    case 'Monk':
      defs.push({
        id: 'focus-points',
        label: 'Focus Points',
        total: level >= 2 ? level : 0,
        rest: REST_KIND.SHORT,
        note: 'Equal to your monk level (2nd level+).',
      });
      break;

    case 'Paladin':
      defs.push({
        id: 'lay-on-hands',
        label: 'Lay on Hands (HP pool)',
        total: 5 * level,
        rest: REST_KIND.LONG,
      });
      defs.push({
        id: 'channel-divinity',
        label: 'Channel Divinity',
        total: level >= 11 ? 3 : level >= 7 ? 2 : 1,
        rest: REST_KIND.SHORT,
        note: 'Available from level 3.',
      });
      break;

    case 'Ranger':
      defs.push({
        id: 'hunters-mark-uses',
        label: "Hunter's Mark uses",
        total: Math.max(1, wis(creature)),
        rest: REST_KIND.LONG,
        note: 'Free casts equal to your WIS modifier.',
      });
      break;

    case 'Sorcerer':
      defs.push({
        id: 'sorcery-points',
        label: 'Sorcery Points',
        total: level >= 2 ? level : 0,
        rest: REST_KIND.LONG,
      });
      break;

    case 'Wizard':
      defs.push({
        id: 'arcane-recovery',
        label: 'Arcane Recovery',
        total: 1,
        rest: REST_KIND.LONG,
        note: 'Once per long rest, on a short rest.',
      });
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

  return defs.map((def) => ({ def, total: def.total }));
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

// Skill checks the player actually plays.
//
// A d20 roll is one tap and a number. These are the same check with the dice
// replaced by something to do: pick the pins, hold the wire steady, pick the
// odd sigil out of a grid. The GM sends one to a phone, the player plays it,
// and the table gets an outcome with a bit of theatre attached.
//
// THE CHARACTER STILL MATTERS, which is the whole point. Nothing here is a
// test of the player's reflexes alone: every game reads the character's
// ability modifier and their proficiency, and spends it on making the game
// easier — a wider sweet spot, a slower drift, a longer look at the sigils.
// A rogue with Expertise in Sleight of Hand should feel like a rogue with
// Expertise, and a wizard who has never held a lockpick should feel that too.
//
// The mapping from "how good is this character" to "how forgiving is the game"
// is in `tuningFor` at the bottom, in one place, so a game that plays too hard
// is tuned by changing a number rather than by rewriting the game.

export const MINIGAMES = [
  {
    id: 'lockpick',
    name: 'Pick the lock',
    icon: '🗝️',
    ability: 'dexterity',
    skill: 'skill_sleight_of_hand',
    skillName: 'Sleight of Hand',
    tool: "Thieves' Tools",
    blurb: 'Feel for each pin and set it while the tension holds.',
    how: 'Tap when the pick is inside the sweet spot. Set every pin before you break your picks.',
  },
  {
    id: 'steady',
    name: 'Disarm the trap',
    icon: '✂️',
    ability: 'dexterity',
    skill: 'skill_sleight_of_hand',
    skillName: 'Sleight of Hand',
    tool: "Thieves' Tools",
    blurb: 'The mechanism is live. Keep your hand still and the wire taut.',
    how: 'Hold your finger on the wire and keep it inside the moving collar until the cut is done. The collar leans and shows an arrow just before it moves — go with it.',
  },
  {
    id: 'spot',
    name: 'Spot what is wrong',
    icon: '👁️',
    ability: 'wisdom',
    skill: 'skill_perception',
    skillName: 'Perception',
    blurb: 'Something here does not belong. Find it before you are noticed looking.',
    how: 'One mark in the grid is not like the others. Tap it before the time runs out.',
  },
  {
    id: 'recall',
    name: 'Recall the lore',
    icon: '📖',
    ability: 'intelligence',
    skill: 'skill_arcana',
    skillName: 'Arcana',
    blurb: 'You have read this somewhere. Hold the sequence in your head.',
    how: 'Watch the sigils light, then tap them back in the same order.',
  },
  {
    id: 'sneak',
    name: 'Stay unseen',
    icon: '🌙',
    ability: 'dexterity',
    skill: 'skill_stealth',
    skillName: 'Stealth',
    blurb: 'Cross the room while their back is turned.',
    how: 'Hold to move while the guard looks away. Let go before they turn around.',
  },
  {
    id: 'force',
    name: 'Force it open',
    icon: '💪',
    ability: 'strength',
    skill: 'skill_athletics',
    skillName: 'Athletics',
    blurb: 'Set your shoulder to it and time the heaves.',
    how: 'Tap as the marker crosses the band. Fill the bar before your strength gives out.',
  },
  {
    id: 'persuade',
    name: 'Win them over',
    icon: '💬',
    ability: 'charisma',
    skill: 'skill_persuasion',
    skillName: 'Persuasion',
    blurb: 'Read the room and say the right thing.',
    how: 'Their mood shows for a moment. Pick the line that answers it. Good lines build trust, weak ones hold it, and misreads cost it — fill the meter before their patience runs out.',
  },
];

export const MINIGAME_BY_ID = Object.fromEntries(MINIGAMES.map((g) => [g.id, g]));

// The difficulties a GM picks from, in the words the rules use.
export const MINIGAME_DCS = [
  { dc: 10, label: 'Easy' },
  { dc: 13, label: 'Moderate' },
  { dc: 15, label: 'Hard' },
  { dc: 18, label: 'Very hard' },
  { dc: 20, label: 'Nearly impossible' },
];

const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);

/**
 * How good this character is at this game's check: the ability modifier, plus
 * proficiency if they have it, plus proficiency again for Expertise.
 *
 * Read off the same columns the sheet rolls from, so a bonus that shows on the
 * skill list shows up here too.
 */
export function skillScoreFor(creature, game) {
  const c = creature || {};
  const mod = abilityMod(c[game.ability]);
  const pb = Math.max(2, Number(c.proficiency_bonus) || 2);

  // `skill_<name>` holds the trained total on this app's sheets; null means
  // untrained. Expertise is its own map.
  const trained = game.skill ? c[game.skill] != null : false;
  const expert = !!(c.skill_expertise && c.skill_expertise[game.skill]);

  // Thieves' Tools are their own proficiency and the books ask for them on
  // locks and traps. Treated as a half-step rather than a second proficiency:
  // having the right tools helps, but it is not the same as being good.
  const tools = game.tool
    && String(c.tool_proficiencies || '').toLowerCase().includes('thieves');

  return {
    mod,
    pb,
    trained,
    expert,
    tools: !!tools,
    total: mod + (trained ? pb : 0) + (expert ? pb : 0) + (tools ? 1 : 0),
  };
}

// A description of where the help came from, for the card the player sees
// before they start. Saying so matters: a game that is quietly easier is a
// game the player cannot tell is rewarding their character sheet.
export function skillCredits(score, game) {
  const out = [];
  if (score.mod) out.push({ label: game.abilityName || ABILITY_WORDS[game.ability], value: score.mod });
  if (score.trained) out.push({ label: `${game.skillName} proficiency`, value: score.pb });
  if (score.expert) out.push({ label: `${game.skillName} expertise`, value: score.pb });
  if (score.tools) out.push({ label: game.tool, value: 1 });
  return out;
}

export const ABILITY_WORDS = {
  strength: 'Strength', dexterity: 'Dexterity', constitution: 'Constitution',
  intelligence: 'Intelligence', wisdom: 'Wisdom', charisma: 'Charisma',
};

// ── Tuning ───────────────────────────────────────────────────────────────────
//
// One function so the games stay dumb. `dc` is what the GM asked for and `score`
// is what the character brings; everything a game needs to know about either is
// worked out here and handed over as plain numbers.
//
// The shape of it: a DC of 10 is near enough a gift and 20 is meant to hurt,
// and a character's score moves the dial back the other way. `ease` lands
// around 0 for someone unremarkable facing a moderate task, goes positive when
// they are good at this, and negative when they are out of their depth.
export function tuningFor(game, score, dc) {
  const ease = (score?.total ?? 0) - ((Number(dc) || 15) - 10);
  // Kept inside a range so neither end becomes unplayable: a legendary rogue
  // still has to tap, and a wizard with a crowbar still has a chance.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (lo, hi, t) => lo + (hi - lo) * t;
  // 0 at hopeless, 1 at overwhelming.
  const t = clamp((ease + 6) / 18, 0, 1);

  switch (game.id) {
    case 'lockpick':
      return {
        pins: Math.round(lerp(5, 3, t)),          // fewer pins when you are good
        zone: clamp(lerp(0.10, 0.34, t), 0.08, 0.4), // share of the bar that counts
        speed: lerp(1.45, 0.75, t),               // sweeps per second
        strikes: Math.round(lerp(2, 4, t)),
      };
    case 'steady':
      return {
        seconds: Math.round(lerp(6, 3.5, t)),
        collar: clamp(lerp(0.11, 0.26, t), 0.09, 0.3),
        drift: lerp(1.6, 0.6, t),                 // how fast the collar wanders
        slips: Math.round(lerp(2, 4, t)),         // how long you may be outside it
      };
    case 'spot':
      return {
        size: Math.round(lerp(7, 4, t)),          // grid is size × size
        seconds: Math.round(lerp(6, 14, t)),
        // How different the odd one looks: a sharp eye notices a subtler flaw,
        // so a GOOD character gets a harder-to-see difference and more time.
        subtlety: clamp(lerp(0.5, 0.14, t), 0.1, 0.6),
      };
    case 'recall':
      return {
        length: Math.round(lerp(6, 3, t)),
        showMs: Math.round(lerp(420, 900, t)),
        tiles: Math.round(lerp(9, 6, t)),
      };
    case 'sneak':
      return {
        distance: 100,
        speed: lerp(18, 34, t),                   // units per second while moving
        lookAway: lerp(1.0, 2.2, t),              // seconds of cover each turn
        warning: lerp(0.25, 0.7, t),              // seconds of "about to turn"
        caught: Math.round(lerp(1, 3, t)),        // glances you can survive
      };
    case 'force':
      return {
        needed: Math.round(lerp(8, 5, t)),
        zone: clamp(lerp(0.12, 0.3, t), 0.1, 0.36),
        speed: lerp(1.5, 0.85, t),
        drain: lerp(9, 4.5, t),                   // bar lost per second
      };
    case 'persuade':
      // A meter rather than a quiz: trust climbs on lines that land and falls
      // on lines that misread them. It ends well when the meter fills, and
      // badly when they have been misread once too often or have stood there
      // long enough. An empty meter is ground to make up, not a loss. A talker
      // who knows what they are doing gains more ground per good line, loses
      // less per bad one, gets longer to read the mood, is given fewer lines to
      // choose between, and is granted more rope before either patience or
      // interest runs out.
      return {
        options: Math.round(lerp(5, 4, t)),
        showMs: Math.round(lerp(900, 2200, t)),   // how long the mood is visible
        start: lerp(25, 40, t),                   // trust they open with
        gain: lerp(16, 26, t),                    // a line that reads them right
        softGain: lerp(4, 6, t),                  // a line that is merely harmless
        loss: lerp(18, 10, t),                    // a line that misreads them
        patience: Math.round(lerp(2, 5, t)),      // misreads before they walk
        exchanges: Math.round(lerp(10, 14, t)),   // how long they will stand there
      };
    default:
      return {};
  }
}

// Subclass feature tables (2024 rules).
//
// The subclass NAMES live in utils/classes.js (BASE_SUBCLASSES) and are what
// the dropdown offers. This file is the level-by-level content behind a name:
// what the character actually gains, and any spells the subclass always keeps
// prepared. A subclass with no entry here still selects fine — the sheet just
// has nothing extra to offer, which is how every subclass behaved before.
//
// Shape:
//   SUBCLASS_FEATURES[class][subclass] = {
//     blurb:    one-line flavour for the panel header,
//     features: [{ level, name, desc }]        — ordered by level,
//     spells:   [{ level, names: [...] }]      — always-prepared, by level,
//     notes:    [string]                       — mechanics wired into the app,
//                                                called out so it's clear what
//                                                is automated and what isn't.
//   }
//
// Descriptions are kept close to the printed wording: this text is what a
// player reads mid-session to answer "what does this do again?", and
// paraphrasing invites arguments at the table.

import { IMPORTED_SUBCLASS_FEATURES, IMPORTED_CLASS_FEATURES } from './classes_imported.js';

// The curated table below is authoritative. Anything it does not define falls
// back to the bulk import — see lookupSubclass.
export const SUBCLASS_FEATURES = {
  Fighter: {
    Gunslinger: {
      blurb: "Powder, fire and metal — a martial archetype for the Fighter, by Matt Mercer. A distant kind of death, when the weapon holds together.",
      features: [
        { level: 3, name: 'Firearm Proficiency', desc: 'You gain proficiency with firearms, and add your Proficiency Bonus to attacks made with them.' },
        { level: 3, name: 'Gunsmith', desc: "You gain proficiency with Tinker's Tools. With them you craft ammunition at half cost, repair damaged firearms, and — at your GM's discretion — draft and build new ones. The strangest firearms exist only as something somebody built." },
        {
          level: 3,
          name: 'Adept Marksman',
          desc:
            'Trick Shots. You learn two trick shots, and another at levels 7, 10, 15 and 18; each time you learn one you may swap one you know. A trick shot is declared before the attack roll, and only one may be used per attack.\n\n'
            + 'Grit. You have grit points equal to your Wisdom modifier (minimum 1). You regain one when you roll a 20 on a d20 firearm attack, or when you deal a killing blow with a firearm to a creature of significant threat. All spent grit returns on a Short or Long Rest.\n\n'
            + 'Trick Shot save DC. 8 + your Proficiency Bonus + your Dexterity modifier.',
        },
        {
          level: 3,
          name: 'Firearm properties',
          desc:
            'Reload. The weapon fires a number of times equal to its reload score before you spend one attack or one action reloading it, with a free hand.\n\n'
            + 'Misfire. If the d20 rolls at or under the weapon\'s misfire score the attack misses and the weapon jams: an action and a Tinker\'s Tools check (DC 8 + misfire score) clears it, and a failure breaks it until it is mended out of combat for a quarter of its cost. Firing one without proficiency raises its misfire score by 1.\n\n'
            + 'Explosive. On a hit, everything within 5 feet of the target makes a Dexterity save (DC 8 + Proficiency Bonus + Dexterity modifier) or takes 1d8 Fire damage.\n\n'
            + 'Ammunition. Every firearm takes its own, rare enough that it is usually crafted rather than bought.',
        },
        { level: 7, name: 'Quickdraw', desc: 'You add your Proficiency Bonus to Initiative, and can stow a firearm and draw another as a single object interaction on your turn.' },
        { level: 10, name: 'Rapid Repair', desc: 'You can spend a grit point to repair a misfired — but not broken — firearm as a Bonus Action.' },
        { level: 15, name: 'Lightning Reload', desc: 'You can reload any firearm as a Bonus Action.' },
        { level: 18, name: 'Vicious Intent', desc: 'Your firearm attacks score a critical hit on a 19 or 20, and you regain a grit point whenever you roll a 19 or 20 on a d20 firearm attack roll.' },
        { level: 18, name: 'Hemorrhaging Critical', desc: "When you score a critical hit with a firearm, the target takes half the attack's damage again at the end of its next turn." },
      ],
      notes: [
        'Grit is tracked in the Resources panel; trick shots are picked under class choices.',
        'Firearms are not in the SRD weapon list — add the ones your table uses to the item library, or ask your GM to.',
      ],
    },
  },

  // ── Blood Hunter Orders ───────────────────────────────────────────────────
  //
  // Each order grants features at levels 3, 7, 11, 15 and 18. Summarised from
  // the 2020 revision; see the class entry in CLASS_FEATURES for why this is
  // hand-written rather than imported.
  'Blood Hunter': {
    'Order of the Ghostslayer': {
      blurb: 'The oldest order — hunters of the undead, and of anything that walks where it should not.',
      features: [
        {
          level: 3,
          name: 'Rite of the Dawn',
          desc:
            'You learn this rite, which does not count against the number of rites you know. Its damage is Radiant.\n\n'
            + 'While it is active you have Resistance to Necrotic damage, and against undead the rite deals two hemocraft dice instead of one.',
        },
        { level: 3, name: 'Curse Specialist', desc: 'You gain one extra use of Blood Maledict, and can invoke your curses at a range of 30 feet while a rite is active.' },
        { level: 7, name: 'Ethereal Step', desc: 'As a Bonus Action, step into the Ethereal Plane for a number of rounds equal to your hemocraft modifier (minimum 1), or until you end it. Recharges on a Short or Long Rest.' },
        { level: 11, name: 'Brand of Sundering', desc: 'A creature branded by your Brand of Castigation takes an extra hemocraft die of damage from your rite weapon, and cannot move through objects or creatures while branded.' },
        { level: 15, name: 'Blood Curse of the Exorcist', desc: 'You learn this curse, and it does not count against the curses you know. It ends a Charmed, Frightened or possessed condition on an ally you can see. Amplified, the source takes 3d6 Psychic damage and must save or be Stunned until the end of your next turn.' },
        { level: 18, name: 'Rite Revival', desc: 'When you drop to 0 hit points with a rite active, you can end every active rite to drop to 1 hit point instead. Recharges on a Long Rest.' },
      ],
    },

    'Order of the Lycan': {
      blurb: 'Hunters who carry the curse they hunt, and let it off the leash on purpose.',
      features: [
        { level: 3, name: 'Heightened Senses', desc: 'You have Advantage on Perception checks that rely on hearing or smell.' },
        {
          level: 3,
          name: 'Hybrid Transformation',
          desc:
            'As a Bonus Action, transform for up to 1 hour. Twice per Short or Long Rest to begin with.\n\n'
            + 'While transformed: Advantage on Strength checks and saves; claws that count as simple melee weapons dealing 1d6 Slashing (your choice of Strength or Dexterity for the attack), and an extra claw attack as a Bonus Action; a Climb Speed equal to your Speed; Resistance to Bludgeoning, Piercing and Slashing damage from nonmagical, non-silvered sources.\n\n'
            + 'Bloodlust. If you start your turn with fewer than half your hit points, make a DC 8 + your hemocraft modifier Wisdom save or be forced to attack the nearest creature, including allies.',
        },
        { level: 7, name: "Stalker's Prowess", desc: 'Your Speed increases by 10 feet, and your jump distance doubles. While transformed, your claws score a critical hit on a 19 or 20.' },
        { level: 11, name: 'Advanced Transformation', desc: 'While transformed, your claws deal 1d8 Slashing damage and you regain hit points equal to your hemocraft modifier at the start of each of your turns, provided you have at least 1 hit point.' },
        { level: 15, name: 'Brand of the Voracious', desc: 'While transformed, you have Advantage on attack rolls against a creature carrying your Brand of Castigation.' },
        { level: 18, name: 'Hybrid Transformation Mastery', desc: 'You can transform at will, and your claws deal 1d10 Slashing damage. You learn Blood Curse of the Howl, which does not count against the curses you know: every creature within 30 feet makes a Wisdom save or is Frightened of you for 1 minute. Amplified, the range becomes 60 feet and a creature failing by 5 or more is Stunned while Frightened this way.' },
      ],
      notes: ['Hybrid Transformation uses are tracked in the Resources panel.'],
    },

    'Order of the Mutant': {
      blurb: 'Alchemists of their own body — brewing what they become before the fight starts.',
      features: [
        {
          level: 3,
          name: 'Formulas',
          desc: 'You learn four mutagen formulas, with another at levels 7, 11, 15 and 18. Whenever you finish a Long Rest you can swap one formula for another.',
        },
        {
          level: 3,
          name: 'Mutagencraft',
          desc:
            'As part of a Short or Long Rest you can brew mutagens from formulas you know. Drinking one is a Bonus Action; its effects last 1 hour unless the formula says otherwise, and its side effect lasts until you finish a Short or Long Rest.\n\n'
            + 'You can hold the effects of more than one mutagen at a time, and any you have brewed and not drunk lose their potency when you next finish a rest.',
        },
        { level: 7, name: 'Strange Metabolism', desc: 'You are immune to Poison damage and the Poisoned condition. Once per Long Rest you can ignore one mutagen side effect for 1 minute and gain Advantage on a Charisma save.' },
        { level: 11, name: 'Brand of Axiom', desc: 'A creature you brand has any Invisibility or illusion-shaping magic ended, and is forced back into its true form if it is a shapechanger. While branded it has Disadvantage on attacks against you and must save or be unable to change shape.' },
        { level: 15, name: 'Blood Curse of Corrosion', desc: 'You learn this curse, and it does not count against the curses you know. The target is Poisoned for 1 minute, saving at the end of each of its turns. Amplified, it also takes 4d6 Necrotic damage each time it fails.' },
        { level: 18, name: 'Exalted Mutation', desc: 'As a Bonus Action you can trade one mutagen currently affecting you for another you have brewed, a number of times per Long Rest equal to your hemocraft modifier (minimum 1).' },
      ],
    },

    'Order of the Profane Soul': {
      blurb: 'Hunters who struck a bargain with something worse than what they hunt.',
      features: [
        {
          level: 3,
          name: 'Otherworldly Patron',
          desc: 'Choose a patron — Archfey, Celestial, Fiend, Great Old One, Hexblade or Undying. You gain its level-1 feature, and its expanded spell list is added to your Profane Soul spells.',
        },
        {
          level: 3,
          name: 'Pact Magic',
          desc:
            'You cast Warlock spells, using Charisma, and your slots come back on a Short or Long Rest.\n\n'
            + 'Blood Hunter level 3: two cantrips, two spells known, one level 1 slot. Spells known rise to 3 at level 5, 4 at 7, 5 at 9, 6 at 11, 7 at 13, 8 at 15, 9 at 17, 10 at 19 and 11 at 20. A second slot arrives at level 6.\n\n'
            + 'Slot level: 1 at Blood Hunter level 3, 2 at level 7, 3 at level 13 and 4 at level 19. A third cantrip arrives at level 10.',
        },
        { level: 3, name: 'Rite Focus', desc: 'While a rite is active, your rite weapon is your spellcasting focus, and your patron grants it an extra benefit — more damage, a harder save, or a push, depending on the pact.' },
        { level: 7, name: 'Mystic Frenzy', desc: 'When you take the Attack action and have an active rite, you can cast one cantrip you know as part of that action.' },
        { level: 11, name: 'Revealed Arcana', desc: 'Once per Long Rest you can cast a spell drawn from your patron — Blindness/Deafness, Blur, Darkness or similar, depending on the pact — without expending a slot.' },
        { level: 15, name: 'Brand of the Sapping Scar', desc: 'A creature carrying your brand has Disadvantage on saving throws against your spells, and takes an extra hemocraft die of damage from them.' },
        { level: 18, name: 'Blood Curse of the Souleater', desc: 'You learn this curse, and it does not count against the curses you know. When a creature you can see within 30 feet dies, you gain Advantage on attack rolls and saving throws until the end of your next turn. Amplified, you also regain one expended Pact Magic slot.' },
      ],
      notes: [
        'Pact Magic slots show in the Resources panel; set your known spells on the Spells tab as usual.',
      ],
    },
  },

  Ranger: {
    'Beast Master': {
      blurb: 'Bond with a primal beast — a companion drawn from the natural world.',
      features: [
        {
          level: 3,
          name: 'Primal Companion',
          desc:
            'You summon a primal beast — Beast of the Land, Sea, or Sky — Friendly to you and your allies, obeying your commands and vanishing if you die.\n\n' +
            'In Combat. It acts on your turn: it moves and uses its Reaction freely, but only takes the Dodge action unless you use a Bonus Action to command another action, or sacrifice one of your attacks to command Beast\'s Strike. If you are Incapacitated it acts on its own.\n\n' +
            'Restoring or Replacing. If it died within the last hour, a Magic action and a spell slot revive it after 1 minute at full Hit Points. After a Long Rest you can summon a different beast, replacing the old one.',
        },
        {
          level: 3,
          name: 'Beast stat blocks',
          desc:
            'All three: AC 13 + your Wisdom modifier, Darkvision, understands your languages, PB equals yours, and Primal Bond (add your Proficiency Bonus to its checks and saves). Beast\'s Strike uses your spell attack modifier.\n\n' +
            'BEAST OF THE LAND. Medium. HP 5 + 5 × your Ranger level. Speed 40 ft., Climb 40 ft. Darkvision 60 ft. STR 14 DEX 14 CON 15 INT 8 WIS 14 CHA 11. Strike: reach 5 ft, 1d8 + 2 plus your Wisdom modifier Bludgeoning/Piercing/Slashing; if it moved 20+ feet straight at the target, +1d6 and Large-or-smaller targets are knocked Prone.\n\n' +
            'BEAST OF THE SEA. Medium. HP 5 + 5 × your Ranger level. Speed 5 ft., Swim 60 ft. Darkvision 90 ft. Amphibious. Same ability scores. Strike: reach 5 ft, 1d6 + 2 plus your Wisdom modifier Bludgeoning/Piercing, and the target is Grappled (escape DC equals your spell save DC).\n\n' +
            'BEAST OF THE SKY. Small. HP 4 + 4 × your Ranger level. Speed 10 ft., Fly 60 ft. Darkvision 60 ft. Flyby. STR 6 DEX 16 CON 13 INT 8 WIS 14 CHA 11. Strike: reach 5 ft, 1d4 + 3 plus your Wisdom modifier Slashing.',
        },
        { level: 7, name: 'Exceptional Training', desc: 'When you command the beast to take an action, it can also Dash, Disengage, Dodge or Help with its Bonus Action. Its damage can be Force instead of its normal type.' },
        { level: 11, name: 'Bestial Fury', desc: "When you command Beast's Strike, the beast uses it twice. The first time each turn it hits a creature under your Hunter's Mark, it deals extra Force damage equal to that spell's bonus damage." },
        { level: 15, name: 'Share Spells', desc: 'When you cast a spell targeting yourself, you can also affect the beast if it is within 30 feet of you.' },
      ],
      notes: [
        'Ask your GM to place your beast as a token and bind it to you as a companion — you then share its vision and can open its stat block from the Companions panel.',
      ],
    },
    'Fey Wanderer': {
      blurb: 'Wield fey mirth and fury — laughter that heartens, and terror that scars.',
      features: [
        { level: 3, name: 'Dreadful Strikes', desc: 'When you hit a creature with a weapon, you can deal an extra 1d4 Psychic damage, once per turn per target. This becomes 1d6 at Ranger level 11.' },
        { level: 3, name: 'Otherworldly Glamour', desc: 'You add your Wisdom modifier (minimum +1) to Charisma checks, and gain proficiency in Deception, Performance, or Persuasion.\n\nFeywild Gift (1d6): 1 illusory butterflies during rests; 2 flowers bloom in your hair each dawn; 3 you smell faintly of a comforting spice; 4 your shadow dances unobserved; 5 horns or antlers; 6 your skin and hair change colour each dawn.' },
        { level: 7, name: 'Beguiling Twist', desc: 'Advantage on saves to avoid or end Charmed or Frightened.\n\nWhen you or a creature within 120 feet succeeds on such a save, you can take a Reaction to force another creature within 120 feet to make a Wisdom save against your spell save DC or be Charmed or Frightened (your choice) for 1 minute, repeating the save at the end of each of its turns.' },
        { level: 11, name: 'Fey Reinforcements', desc: 'You can cast Summon Fey without a Material component, and once per Long Rest without a spell slot. You can also drop its Concentration requirement, making that casting last 1 minute.' },
        { level: 15, name: 'Misty Wanderer', desc: 'You can cast Misty Step without a spell slot a number of times equal to your Wisdom modifier (minimum once), regained on a Long Rest. You can bring one willing creature within 5 feet along, landing within 5 feet of you.' },
      ],
      spells: [
        { level: 3, names: ['Charm Person'] },
        { level: 5, names: ['Misty Step'] },
        { level: 9, names: ['Summon Fey'] },
        { level: 13, names: ['Dimension Door'] },
        { level: 17, names: ['Mislead'] },
      ],
    },
    'Gloom Stalker': {
      blurb: 'Draw on shadow magic to fight your foes — at home in the darkest places.',
      features: [
        { level: 3, name: 'Dread Ambusher', desc: "Ambusher's Leap. At the start of your first turn of each combat, your Speed increases by 10 feet until the end of that turn.\n\nDreadful Strike. When you hit with a weapon, deal an extra 2d6 Psychic damage — once per turn, with uses equal to your Wisdom modifier (minimum once), regained on a Long Rest.\n\nInitiative Bonus. Add your Wisdom modifier to Initiative rolls." },
        { level: 3, name: 'Umbral Sight', desc: 'You gain Darkvision 60 feet, or +60 feet if you already have it.\n\nWhile entirely in Darkness, you have the Invisible condition to any creature relying on Darkvision to see you there.' },
        { level: 7, name: 'Iron Mind', desc: 'You gain proficiency in Wisdom saving throws — or, if you already have it, in Intelligence or Charisma saves (your choice).' },
        { level: 11, name: "Stalker's Flurry", desc: 'Dreadful Strike becomes 2d8 Psychic. When you use it you can also cause one of:\n\nSudden Strike. Another attack with the same weapon against a different creature within 5 feet of the original target.\n\nMass Fear. The target and creatures within 10 feet make a Wisdom save against your spell save DC or are Frightened until the start of your next turn.' },
        { level: 15, name: 'Shadowy Dodge', desc: 'When a creature makes an attack roll against you, you can take a Reaction to impose Disadvantage on it, then teleport up to 30 feet to an unoccupied space you can see.' },
      ],
      spells: [
        { level: 3, names: ['Disguise Self'] },
        { level: 5, names: ['Rope Trick'] },
        { level: 9, names: ['Fear'] },
        { level: 13, names: ['Greater Invisibility'] },
        { level: 17, names: ['Seeming'] },
      ],
      notes: ['Umbral Sight is a real vision change — set the Darkvision from the My Token panel.'],
    },
    Hunter: {
      blurb: 'Protect nature and people from destruction — the prey-stalker\'s discipline.',
      features: [
        { level: 3, name: "Hunter's Lore", desc: "While a creature is marked by your Hunter's Mark, you know whether it has any Immunities, Resistances, or Vulnerabilities — and what they are." },
        { level: 3, name: "Hunter's Prey", desc: 'Choose one, swappable after a Short or Long Rest:\n\nColossus Slayer. Once per turn, your weapon deals an extra 1d8 damage to a target missing any of its Hit Points.\n\nHorde Breaker. Once on each of your turns, make another attack with the same weapon against a different creature within 5 feet of the original target that you haven\'t attacked this turn.' },
        { level: 7, name: 'Defensive Tactics', desc: 'Choose one, swappable after a Short or Long Rest:\n\nEscape the Horde. Opportunity Attacks have Disadvantage against you.\n\nMultiattack Defense. When a creature hits you with an attack roll, it has Disadvantage on all other attack rolls against you this turn.' },
        { level: 11, name: "Superior Hunter's Prey", desc: "Once per turn when you damage a creature marked by your Hunter's Mark, you can deal that spell's extra damage to another creature you can see within 30 feet of it." },
        { level: 15, name: "Superior Hunter's Defense", desc: 'When you take damage, you can take a Reaction to gain Resistance to that damage and any other damage of the same type until the end of the turn.' },
      ],
    },
  },

  Rogue: {
    'Arcane Trickster': {
      blurb: 'Enhance stealth with arcane spells — a third-caster drawing on the Wizard list.',
      features: [
        {
          level: 3,
          name: 'Spellcasting',
          desc:
            'Cantrips. Mage Hand plus two other Wizard cantrips (Mind Sliver and Minor Illusion recommended), and a third at Rogue level 10. You can swap any but Mage Hand when you gain a level.\n\n' +
            'Prepared Spells. Three level 1 Wizard spells to start (Charm Person, Disguise Self and Fog Cloud recommended): 4 at Rogue 4, 5 at 7, 6 at 8, 7 at 10, 8 at 11, 9 at 13, 10 at 14, 11 at 16, 12 at 19, 13 at 20.\n\n' +
            'Spell Slots. Level 1 slots from Rogue 3 (2, then 3 from level 4, 4 from level 7); level 2 from Rogue 7; level 3 from Rogue 10; level 4 from Rogue 19.\n\n' +
            'Spellcasting Ability. Intelligence.  Spellcasting Focus. An Arcane Focus.',
        },
        { level: 3, name: 'Mage Hand Legerdemain', desc: 'You can cast Mage Hand as a Bonus Action and make the hand Invisible. You can control it as a Bonus Action, and make Dexterity (Sleight of Hand) checks through it.' },
        { level: 9, name: 'Magical Ambush', desc: 'If you have the Invisible condition when you cast a spell on a creature, it has Disadvantage on saves against that spell on the same turn.' },
        { level: 13, name: 'Versatile Trickster', desc: 'When you use the Trip option of Cunning Strike, you can also apply it to another creature within 5 feet of your Mage Hand.' },
        { level: 17, name: 'Spell Thief', desc: 'After a creature casts a spell targeting you or including you in its area, you can take a Reaction to force an Intelligence save against your spell save DC. On a failure you negate the spell against you and steal it: you have it prepared for 8 hours and the creature can\'t cast it in that time.\n\nOnce per Long Rest.' },
      ],
      notes: ['Third-caster slots are not derived automatically — set your spell slots to match the Arcane Trickster table.'],
    },
    Assassin: {
      blurb: 'Practice the grim art of death — stealth, poison and disguise.',
      features: [
        { level: 3, name: 'Assassinate', desc: 'Initiative. You have Advantage on Initiative rolls.\n\nSurprising Strikes. During the first round of each combat you have Advantage on attack rolls against any creature that hasn\'t taken a turn. If your Sneak Attack hits during that round, the target takes extra damage of the weapon\'s type equal to your Rogue level.' },
        { level: 3, name: "Assassin's Tools", desc: 'You gain a Disguise Kit and a Poisoner\'s Kit, and proficiency with both.' },
        { level: 9, name: 'Infiltration Expertise', desc: 'Masterful Mimicry. You can unerringly mimic another person\'s speech, handwriting, or both after an hour of study.\n\nRoving Aim. Steady Aim no longer reduces your Speed to 0.' },
        { level: 13, name: 'Envenom Weapons', desc: 'When you use the Poison option of Cunning Strike, the target also takes 2d6 Poison damage whenever it fails the save. This damage ignores Resistance to Poison.' },
        { level: 17, name: 'Death Strike', desc: 'When you hit with Sneak Attack in the first round of combat, the target makes a Constitution save (DC 8 + Dexterity modifier + Proficiency Bonus) or the attack\'s damage is doubled.' },
      ],
    },
    Soulknife: {
      blurb: 'Strike foes with psionic blades — cutting through barriers physical and psychic.',
      features: [
        {
          level: 3,
          name: 'Psionic Power',
          desc:
            'Psionic Energy Dice: four d6s at level 3, six d8s at 5, eight d8s at 9, eight d10s at 11, ten d10s at 13, twelve d12s at 17. Regain one on a Short Rest, all on a Long Rest.\n\n' +
            'Psi-Bolstered Knack. If you fail an ability check using a skill or tool you\'re proficient with, roll a die and add it; the die is expended only if the roll then succeeds.\n\n' +
            'Psychic Whispers. As a Magic action, choose creatures up to your Proficiency Bonus and roll a die: for that many hours you can speak telepathically with them within 1 mile. The first use after each Long Rest doesn\'t expend the die.',
        },
        {
          level: 3,
          name: 'Psychic Blades',
          desc:
            'When you take the Attack action or make an Opportunity Attack, you can manifest a Psychic Blade in a free hand:\n\n' +
            'Simple Melee weapon · 1d6 Psychic plus the ability modifier used · Finesse, Thrown (60/120) · Mastery: Vex (free, not counted against Weapon Mastery).\n\n' +
            'The blade vanishes after it hits or misses. After attacking with it on your turn, you can make a second blade attack as a Bonus Action if your other hand is free; that one deals 1d4.',
        },
        { level: 9, name: 'Soul Blades', desc: 'Homing Strikes. If you miss with a Psychic Blade, roll a Psionic Energy Die and add it to the attack roll; the die is expended if it hits.\n\nPsychic Teleportation. As a Bonus Action, expend and roll a die, throw a blade up to 10 × the roll in feet, and teleport to that space.' },
        { level: 13, name: 'Psychic Veil', desc: 'As a Magic action, gain the Invisible condition for 1 hour or until you dismiss it. It ends early immediately after you deal damage or force a saving throw.\n\nOnce per Long Rest, or by expending a Psionic Energy Die.' },
        { level: 17, name: 'Rend Mind', desc: 'When you deal Sneak Attack damage with your Psychic Blades, the target makes a Wisdom save (DC 8 + Dexterity modifier + Proficiency Bonus) or is Stunned for 1 minute, repeating the save at the end of each of its turns.\n\nOnce per Long Rest, or by expending three Psionic Energy Dice.' },
      ],
      notes: ['Psionic Energy Dice are tracked in the Resources panel with the die size for your level.'],
    },
    Thief: {
      blurb: 'Hunt for treasure as a classic adventurer — burglar, explorer, opportunist.',
      features: [
        { level: 3, name: 'Fast Hands', desc: 'As a Bonus Action, you can either make a Dexterity (Sleight of Hand) check to pick a lock, disarm a trap or pick a pocket, or take the Utilize action (or the Magic action to use a magic item that needs it).' },
        { level: 3, name: 'Second-Story Work', desc: 'Climber. You gain a Climb Speed equal to your Speed.\n\nJumper. You can determine jump distance using Dexterity rather than Strength.' },
        { level: 9, name: 'Supreme Sneak', desc: 'New Cunning Strike option — Stealth Attack (1d6). If you have the Hide action\'s Invisible condition, the attack doesn\'t end it as long as you end the turn behind Three-Quarters or Total Cover.' },
        { level: 13, name: 'Use Magic Device', desc: 'Attunement. You can attune to up to four magic items.\n\nCharges. When you use a magic item property that expends charges, roll 1d6; on a 6 no charge is spent.\n\nScrolls. You can use any Spell Scroll with Intelligence as your ability; cantrips and level 1 spells work reliably, higher levels need an Intelligence (Arcana) check (DC 10 + spell level) or the scroll disintegrates.' },
        { level: 17, name: "Thief's Reflexes", desc: 'You can take two turns during the first round of any combat: one at your Initiative, and one at your Initiative minus 10.' },
      ],
      notes: ["Thief's Reflexes needs a second slot in the initiative order — ask your GM to add one at your Initiative minus 10."],
    },
  },

  Warlock: {
    'Archfey Patron': {
      blurb: 'Bargain with whimsical fey — the Feywild\'s boundaries, yours to step through.',
      features: [
        { level: 3, name: 'Steps of the Fey', desc: 'You can cast Misty Step without a spell slot a number of times equal to your Charisma modifier (minimum once), regained on a Long Rest.\n\nWhenever you cast it you can choose an effect:\n\nRefreshing Step. You or a creature within 10 feet gains 1d10 Temporary Hit Points.\n\nTaunting Step. Creatures within 5 feet of the space you left make a Wisdom save or have Disadvantage on attacks against anyone but you until the start of your next turn.' },
        { level: 6, name: 'Misty Escape', desc: 'You can cast Misty Step as a Reaction when you take damage.\n\nTwo more Steps of the Fey options:\n\nDisappearing Step. You have the Invisible condition until the start of your next turn or until you attack, deal damage, or cast a spell.\n\nDreadful Step. Creatures within 5 feet of the space you left or arrived in (your choice) make a Wisdom save or take 2d10 Psychic damage.' },
        { level: 10, name: 'Beguiling Defenses', desc: 'You are immune to the Charmed condition.\n\nImmediately after a creature you can see hits you, you can take a Reaction to halve the damage (round down) and force a Wisdom save; on a failure the attacker takes Psychic damage equal to the damage you took.\n\nOnce per Long Rest, or by expending a Pact Magic slot (no action required).' },
        { level: 14, name: 'Bewitching Magic', desc: 'Immediately after you cast an Enchantment or Illusion spell using an action and a spell slot, you can cast Misty Step as part of the same action without expending a slot.' },
      ],
      spells: [
        { level: 3, names: ['Calm Emotions', 'Faerie Fire', 'Misty Step', 'Phantasmal Force', 'Sleep'] },
        { level: 5, names: ['Blink', 'Plant Growth'] },
        { level: 7, names: ['Dominate Beast', 'Greater Invisibility'] },
        { level: 9, names: ['Dominate Person', 'Seeming'] },
      ],
    },
    'Celestial Patron': {
      blurb: 'Call on the power of the heavens — a hint of the holy light of the Upper Planes.',
      features: [
        { level: 3, name: 'Healing Light', desc: 'You have a pool of d6s equal to 1 plus your Warlock level. As a Bonus Action, heal yourself or a creature within 60 feet by expending dice, up to your Charisma modifier at once (minimum one), restoring Hit Points equal to the total. The pool refills on a Long Rest.' },
        { level: 6, name: 'Radiant Soul', desc: 'You have Resistance to Radiant damage. Once per turn, when a spell you cast deals Radiant or Fire damage, you can add your Charisma modifier to that damage against one target.' },
        { level: 10, name: 'Celestial Resilience', desc: 'Whenever you use Magical Cunning or finish a Short or Long Rest, you gain Temporary Hit Points equal to your Warlock level plus your Charisma modifier. Up to five creatures you can see each gain half your Warlock level plus your Charisma modifier.' },
        { level: 14, name: 'Searing Vengeance', desc: 'When you or an ally within 60 feet is about to make a Death Saving Throw, that creature instead regains half its Hit Point maximum and can stand up. Creatures of your choice within 30 feet of it take 2d8 plus your Charisma modifier Radiant damage and are Blinded until the end of the turn.\n\nOnce per Long Rest.' },
      ],
      spells: [
        { level: 3, names: ['Aid', 'Cure Wounds', 'Guiding Bolt', 'Lesser Restoration', 'Light', 'Sacred Flame'] },
        { level: 5, names: ['Daylight', 'Revivify'] },
        { level: 7, names: ['Guardian of Faith', 'Wall of Fire'] },
        { level: 9, names: ['Greater Restoration', 'Summon Celestial'] },
      ],
      notes: ['Healing Light is tracked in the Resources panel as a pool of d6s.'],
    },
    'Fiend Patron': {
      blurb: 'Make a deal with the Lower Planes — power bought at a price.',
      features: [
        { level: 3, name: "Dark One's Blessing", desc: 'When you reduce an enemy to 0 Hit Points — or someone else reduces an enemy within 10 feet of you — you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum 1).' },
        { level: 6, name: "Dark One's Own Luck", desc: 'When you make an ability check or saving throw, you can add 1d10 after seeing the roll but before its effects.\n\nUses equal your Charisma modifier (minimum once), no more than once per roll, regained on a Long Rest.' },
        { level: 10, name: 'Fiendish Resilience', desc: 'Whenever you finish a Short or Long Rest, choose one damage type other than Force. You have Resistance to it until you choose another.' },
        { level: 14, name: 'Hurl Through Hell', desc: 'Once per turn when you hit a creature, it makes a Charisma save or vanishes through the Lower Planes: 8d10 Psychic damage if it isn\'t a Fiend, and it is Incapacitated until the end of your next turn, when it returns.\n\nOnce per Long Rest, or by expending a Pact Magic slot (no action required).' },
      ],
      spells: [
        { level: 3, names: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'] },
        { level: 5, names: ['Fireball', 'Stinking Cloud'] },
        { level: 7, names: ['Fire Shield', 'Wall of Fire'] },
        { level: 9, names: ['Geas', 'Insect Plague'] },
      ],
    },
    'Great Old One Patron': {
      blurb: 'Unearth forbidden lore of ineffable beings — strange magic from an indifferent mind.',
      features: [
        { level: 3, name: 'Awakened Mind', desc: 'As a Bonus Action, choose a creature within 30 feet: you can communicate telepathically while within a number of miles equal to your Charisma modifier (minimum 1). Each of you must mentally use a language the other knows.\n\nThe bond lasts a number of minutes equal to your Warlock level, ending early if you bond with someone else.' },
        { level: 3, name: 'Psychic Spells', desc: 'When you cast a Warlock spell that deals damage, you can change its damage type to Psychic. When you cast a Warlock Enchantment or Illusion spell, you can do so without Verbal or Somatic components.' },
        { level: 6, name: 'Clairvoyant Combatant', desc: 'When you form an Awakened Mind bond, you can force a Wisdom save: on a failure the creature has Disadvantage on attacks against you and you have Advantage against it for the bond\'s duration.\n\nOnce per Short or Long Rest, or by expending a Pact Magic slot (no action required).' },
        { level: 10, name: 'Eldritch Hex', desc: 'You always have Hex prepared. When you cast it and choose an ability, the target also has Disadvantage on saving throws of that ability for the duration.' },
        { level: 10, name: 'Thought Shield', desc: 'Your thoughts can\'t be read unless you allow it. You have Resistance to Psychic damage, and a creature dealing you Psychic damage takes the same amount.' },
        { level: 14, name: 'Create Thrall', desc: 'You can cast Summon Aberration without Concentration; its duration becomes 1 minute, and the Aberration gains Temporary Hit Points equal to your Warlock level plus your Charisma modifier.\n\nThe first time each turn it hits a creature under your Hex, it deals extra Psychic damage equal to that spell\'s bonus damage.' },
      ],
      spells: [
        { level: 3, names: ['Detect Thoughts', 'Dissonant Whispers', 'Phantasmal Force', "Hideous Laughter"] },
        { level: 5, names: ['Clairvoyance', 'Hunger of Hadar'] },
        { level: 7, names: ['Confusion', 'Summon Aberration'] },
        { level: 9, names: ['Modify Memory', 'Telekinesis'] },
      ],
      notes: ['Create Thrall summons an Aberration your GM can bind to you as a companion token.'],
    },
  },

  Monk: {
    'Warrior of Mercy': {
      blurb: 'Manipulate forces of life and death — a physician who brings a swift end.',
      features: [
        { level: 3, name: 'Hand of Harm', desc: 'Once per turn when you hit with an Unarmed Strike and deal damage, spend 1 Focus Point to deal extra Necrotic damage equal to one roll of your Martial Arts die plus your Wisdom modifier.' },
        { level: 3, name: 'Hand of Healing', desc: 'As a Magic action, spend 1 Focus Point to touch a creature and restore Hit Points equal to a roll of your Martial Arts die plus your Wisdom modifier.\n\nWhen you use Flurry of Blows, you can replace one Unarmed Strike with this without spending a point for the healing.' },
        { level: 3, name: 'Implements of Mercy', desc: 'You gain proficiency in Insight and Medicine, and with the Herbalism Kit.' },
        { level: 6, name: "Physician's Touch", desc: 'Hand of Harm. You can also give the target the Poisoned condition until the end of your next turn.\n\nHand of Healing. You can also end one of Blinded, Deafened, Paralyzed, Poisoned, or Stunned on the creature you heal.' },
        { level: 11, name: 'Flurry of Healing and Harm', desc: 'You can replace each Unarmed Strike of a Flurry of Blows with Hand of Healing, without spending points for the healing. You can also use Hand of Harm with a Flurry strike without spending a point (still once per turn).\n\nUses equal your Wisdom modifier (minimum once), regained on a Long Rest.' },
        { level: 17, name: 'Hand of Ultimate Mercy', desc: 'As a Magic action, touch the corpse of a creature dead no more than 24 hours and spend 5 Focus Points: it returns to life with 4d10 plus your Wisdom modifier Hit Points, free of Blinded, Deafened, Paralyzed, Poisoned and Stunned.\n\nOnce per Long Rest.' },
      ],
    },
    'Warrior of Shadow': {
      blurb: 'Harness shadow power for stealth and subterfuge — at home in the dark.',
      features: [
        { level: 3, name: 'Shadow Arts', desc: 'Darkness. Spend 1 Focus Point to cast Darkness without components. You can see within its area, and while it persists you can move the area to a space within 60 feet at the start of each of your turns.\n\nDarkvision. You gain Darkvision 60 feet, or +60 feet if you already have it.\n\nShadowy Figments. You know Minor Illusion; Wisdom is your spellcasting ability for it.' },
        { level: 6, name: 'Shadow Step', desc: 'While entirely in Dim Light or Darkness, you can use a Bonus Action to teleport up to 60 feet to an unoccupied space you can see that is also in Dim Light or Darkness. You then have Advantage on your next melee attack this turn.' },
        { level: 11, name: 'Improved Shadow Step', desc: 'You can spend 1 Focus Point when you Shadow Step to remove the light requirement for that use, and make an Unarmed Strike immediately after teleporting as part of the same Bonus Action.' },
        { level: 17, name: 'Cloak of Shadows', desc: 'As a Magic action while entirely in Dim Light or Darkness, spend 3 Focus Points to shroud yourself for 1 minute, until Incapacitated, or until you end your turn in Bright Light:\n\nInvisibility. You have the Invisible condition.\n\nPartially Incorporeal. You can move through occupied spaces as Difficult Terrain, being shunted back if you end your turn in one.\n\nShadow Flurry. You can use Flurry of Blows without spending Focus Points.' },
      ],
      notes: [
        "Shadow Arts' Darkvision is a real vision change — set it from the My Token panel, and ask your GM to place the Darkness area as a magical-darkness zone.",
      ],
    },
    'Warrior of the Elements': {
      blurb: 'Wield strikes and bursts of elemental power — the Elemental Chaos, briefly tamed.',
      features: [
        { level: 3, name: 'Elemental Attunement', desc: 'At the start of your turn, spend 1 Focus Point to imbue yourself with elemental energy for 10 minutes or until Incapacitated:\n\nReach. Your Unarmed Strike reach is 10 feet greater.\n\nElemental Strikes. Your Unarmed Strike can deal Acid, Cold, Fire, Lightning, or Thunder damage; when it does, the target makes a Strength save or you move it up to 10 feet toward or away from you.' },
        { level: 3, name: 'Manipulate Elements', desc: 'You know the Elementalism spell. Wisdom is your spellcasting ability for it.' },
        { level: 6, name: 'Elemental Burst', desc: 'As a Magic action, spend 2 Focus Points to burst elemental energy in a 20-foot-radius Sphere within 120 feet. Choose Acid, Cold, Fire, Lightning, or Thunder. Each creature makes a Dexterity save, taking three rolls of your Martial Arts die on a failure, or half on a success.' },
        { level: 11, name: 'Stride of the Elements', desc: 'While Elemental Attunement is active, you also have a Fly Speed and a Swim Speed equal to your Speed.' },
        { level: 17, name: 'Elemental Epitome', desc: 'While Elemental Attunement is active:\n\nDamage Resistance. Resistance to one of Acid, Cold, Fire, Lightning, or Thunder, changeable at the start of each of your turns.\n\nDestructive Stride. Step of the Wind increases your Speed by 20 feet for the turn, and creatures of your choice take one Martial Arts die of elemental damage when you enter a space within 5 feet of them (once per turn each).\n\nEmpowered Strikes. Once on each of your turns, deal an extra Martial Arts die of damage with an Unarmed Strike.' },
      ],
      notes: ['Stride of the Elements grants flight — toggle it in the My Token panel while attuned.'],
    },
    'Warrior of the Open Hand': {
      blurb: 'Master unarmed combat techniques — push, trip and protect.',
      features: [
        { level: 3, name: 'Open Hand Technique', desc: 'When you hit with an attack from Flurry of Blows, impose one of:\n\nAddle. The target can\'t make Opportunity Attacks until the start of its next turn.\n\nPush. Strength save or pushed up to 15 feet away.\n\nTopple. Dexterity save or Prone.' },
        { level: 6, name: 'Wholeness of Body', desc: 'As a Bonus Action, roll your Martial Arts die and regain Hit Points equal to the roll plus your Wisdom modifier (minimum 1).\n\nUses equal your Wisdom modifier (minimum once), regained on a Long Rest.' },
        { level: 11, name: 'Fleet Step', desc: 'When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after it.' },
        { level: 17, name: 'Quivering Palm', desc: 'When you hit a creature with an Unarmed Strike, spend 4 Focus Points to start lethal vibrations lasting a number of days equal to your Monk level. Ending them (an action, or forgoing one attack of the Attack action) forces a Constitution save for 10d12 Force damage, or half on a success.\n\nOnly one creature at a time; you can end them harmlessly with no action.' },
      ],
    },
  },

  Paladin: {
    'Oath of Devotion': {
      blurb: 'Uphold the ideals of justice and order — the knight in shining armour.',
      features: [
        { level: 3, name: 'Sacred Weapon', desc: 'When you take the Attack action, expend a use of Channel Divinity to imbue a Melee weapon you hold for 10 minutes or until you use this again. You add your Charisma modifier to attack rolls with it (minimum +1), and it can deal Radiant damage instead of its normal type.\n\nIt also emits Bright Light in a 20-foot radius and Dim Light 20 feet beyond. Ends early if you stop carrying it, or at will.' },
        { level: 7, name: 'Aura of Devotion', desc: 'You and your allies have Immunity to the Charmed condition while in your Aura of Protection.' },
        { level: 15, name: 'Smite of Protection', desc: 'Whenever you cast Divine Smite, you and your allies have Half Cover while in your Aura of Protection, until the start of your next turn.' },
        { level: 20, name: 'Holy Nimbus', desc: 'As a Bonus Action, imbue your aura for 10 minutes:\n\nHoly Ward. Advantage on saving throws forced by Fiends or Undead.\n\nRadiant Damage. Enemies starting their turn in the aura take Radiant damage equal to your Charisma modifier plus Proficiency Bonus.\n\nSunlight. The aura is filled with Bright Light that is sunlight.\n\nOnce per Long Rest, or by expending a level 5 spell slot.' },
      ],
      spells: [
        { level: 3, names: ['Protection from Evil and Good', 'Shield of Faith'] },
        { level: 5, names: ['Aid', 'Zone of Truth'] },
        { level: 9, names: ['Beacon of Hope', 'Dispel Magic'] },
        { level: 13, names: ['Freedom of Movement', 'Guardian of Faith'] },
        { level: 17, names: ['Commune', 'Flame Strike'] },
      ],
      notes: ["Sacred Weapon's light (20 ft bright / 20 ft dim) can be set from your token's light button."],
    },
    'Oath of Glory': {
      blurb: 'Strive for the heights of heroism — destiny earned through deeds.',
      features: [
        { level: 3, name: 'Inspiring Smite', desc: 'Immediately after you cast Divine Smite, expend a use of Channel Divinity to distribute Temporary Hit Points totalling 2d8 plus your Paladin level among creatures of your choice within 30 feet, including yourself.' },
        { level: 3, name: 'Peerless Athlete', desc: 'As a Bonus Action, expend a use of Channel Divinity: for 1 hour you have Advantage on Strength (Athletics) and Dexterity (Acrobatics) checks, and your Long and High Jumps increase by 10 feet.' },
        { level: 7, name: 'Aura of Alacrity', desc: 'Your Speed increases by 10 feet. Allies entering your Aura of Protection for the first time on a turn, or starting their turn there, gain +10 feet of Speed until the end of their next turn.' },
        { level: 15, name: 'Glorious Defense', desc: 'When you or a creature within 10 feet is hit by an attack roll, you can take a Reaction to add your Charisma modifier (minimum +1) to the target\'s AC against it, potentially causing a miss. If it misses, you can make one weapon attack against the attacker as part of the Reaction.\n\nUses equal your Charisma modifier (minimum once), regained on a Long Rest.' },
        { level: 20, name: 'Living Legend', desc: 'As a Bonus Action, for 10 minutes:\n\nCharismatic. Advantage on all Charisma checks.\n\nSaving Throw Reroll. Reroll a failed save as a Reaction, using the new roll.\n\nUnerring Strike. Once on each of your turns, turn a missed weapon attack into a hit.\n\nOnce per Long Rest, or by expending a level 5 spell slot.' },
      ],
      spells: [
        { level: 3, names: ['Guiding Bolt', 'Heroism'] },
        { level: 5, names: ['Enhance Ability', 'Magic Weapon'] },
        { level: 9, names: ['Haste', 'Protection from Energy'] },
        { level: 13, names: ['Compulsion', 'Freedom of Movement'] },
        { level: 17, names: ['Legend Lore', "Yolande's Regal Presence"] },
      ],
    },
    'Oath of the Ancients': {
      blurb: 'Preserve life and light in the world — the oldest oath, sworn to beauty.',
      features: [
        { level: 3, name: "Nature's Wrath", desc: 'As a Magic action, expend a use of Channel Divinity: each creature of your choice within 15 feet makes a Strength save or is Restrained for 1 minute, repeating the save at the end of each of its turns.' },
        { level: 7, name: 'Aura of Warding', desc: 'You and your allies have Resistance to Necrotic, Psychic, and Radiant damage while in your Aura of Protection.' },
        { level: 15, name: 'Undying Sentinel', desc: 'When reduced to 0 Hit Points and not killed outright, you can drop to 1 Hit Point instead and regain Hit Points equal to three times your Paladin level. Once per Long Rest.\n\nYou also can\'t be aged magically and cease visibly ageing.' },
        { level: 20, name: 'Elder Champion', desc: 'As a Bonus Action, for 1 minute:\n\nDiminish Defiance. Enemies in your aura have Disadvantage on saves against your spells and Channel Divinity.\n\nRegeneration. You regain 10 Hit Points at the start of each of your turns.\n\nSwift Spells. Cast action-time spells as a Bonus Action.\n\nOnce per Long Rest, or by expending a level 5 spell slot.' },
      ],
      spells: [
        { level: 3, names: ['Ensnaring Strike', 'Speak with Animals'] },
        { level: 5, names: ['Misty Step', 'Moonbeam'] },
        { level: 9, names: ['Plant Growth', 'Protection from Energy'] },
        { level: 13, names: ['Ice Storm', 'Stoneskin'] },
        { level: 17, names: ['Commune with Nature', 'Tree Stride'] },
      ],
    },
    'Oath of Vengeance': {
      blurb: 'Punish evildoers at any cost — a solemn commitment to retribution.',
      features: [
        { level: 3, name: 'Vow of Enmity', desc: 'When you take the Attack action, expend a use of Channel Divinity to vow enmity against a creature within 30 feet: you have Advantage on attack rolls against it for 1 minute or until you use this again.\n\nIf it drops to 0 Hit Points first, you can transfer the vow to another creature within 30 feet (no action required).' },
        { level: 7, name: 'Relentless Avenger', desc: 'When you hit a creature with an Opportunity Attack, you can reduce its Speed to 0 until the end of the turn, then move up to half your Speed as part of the same Reaction without provoking.' },
        { level: 15, name: 'Soul of Vengeance', desc: 'Immediately after a creature under your Vow of Enmity hits or misses with an attack roll, you can take a Reaction to make a melee attack against it if it is in range.' },
        { level: 20, name: 'Avenging Angel', desc: 'As a Bonus Action, for 10 minutes:\n\nFlight. Spectral wings give you a Fly Speed of 60 feet and you can hover.\n\nFrightful Aura. Enemies starting their turn in your Aura of Protection make a Wisdom save or are Frightened for 1 minute or until they take damage; attacks against them have Advantage.\n\nOnce per Long Rest, or by expending a level 5 spell slot.' },
      ],
      spells: [
        { level: 3, names: ['Bane', "Hunter's Mark"] },
        { level: 5, names: ['Hold Person', 'Misty Step'] },
        { level: 9, names: ['Haste', 'Protection from Energy'] },
        { level: 13, names: ['Banishment', 'Dimension Door'] },
        { level: 17, names: ['Hold Monster', 'Scrying'] },
      ],
      notes: ["Avenging Angel grants flight — toggle it in the My Token panel while it lasts."],
    },
  },

  Barbarian: {
    'Path of the Berserker': {
      blurb: 'Channel Rage into violent fury — untrammelled ferocity in the chaos of battle.',
      features: [
        { level: 3, name: 'Frenzy', desc: 'If you use Reckless Attack while raging, you deal extra damage to the first target you hit on your turn with a Strength-based attack: roll a number of d6s equal to your Rage Damage bonus. The damage is the same type as the weapon or Unarmed Strike used.' },
        { level: 6, name: 'Mindless Rage', desc: 'You have Immunity to the Charmed and Frightened conditions while raging. If you are Charmed or Frightened when you enter your Rage, the condition ends.' },
        { level: 10, name: 'Retaliation', desc: 'When you take damage from a creature within 5 feet of you, you can take a Reaction to make one melee attack against it with a weapon or an Unarmed Strike.' },
        { level: 14, name: 'Intimidating Presence', desc: 'As a Bonus Action, each creature of your choice in a 30-foot Emanation makes a Wisdom save (DC 8 + Strength modifier + Proficiency Bonus) or is Frightened for 1 minute, repeating the save at the end of each of its turns.\n\nOnce per Long Rest, or by expending a use of your Rage (no action required).' },
      ],
    },
    'Path of the Wild Heart': {
      blurb: 'Walk in community with the animal world — Rage as kinship with beasts.',
      features: [
        { level: 3, name: 'Animal Speaker', desc: 'You can cast Beast Sense and Speak with Animals, but only as Rituals. Wisdom is your spellcasting ability for them.' },
        { level: 3, name: 'Rage of the Wilds', desc: 'Whenever you activate your Rage, choose one:\n\nBear. Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.\n\nEagle. Take Disengage and Dash as part of that Bonus Action; while raging you can take a Bonus Action to do both again.\n\nWolf. Your allies have Advantage on attack rolls against enemies within 5 feet of you.' },
        { level: 6, name: 'Aspect of the Wilds', desc: 'Choose one, changeable after each Long Rest:\n\nOwl. Darkvision 60 feet (or +60 feet if you already have it).\n\nPanther. Climb Speed equal to your Speed.\n\nSalmon. Swim Speed equal to your Speed.' },
        { level: 10, name: 'Nature Speaker', desc: 'You can cast Commune with Nature, but only as a Ritual. Wisdom is your spellcasting ability for it.' },
        { level: 14, name: 'Power of the Wilds', desc: 'Whenever you activate your Rage, choose one:\n\nFalcon. Fly Speed equal to your Speed while you wear no armor.\n\nLion. Enemies within 5 feet have Disadvantage on attacks against anyone but you (or another Barbarian using this option).\n\nRam. You can knock a Large or smaller creature Prone when you hit it with a melee attack.' },
      ],
      notes: [
        "Owl's Darkvision and Falcon's flight are real map changes — set them from the My Token panel while raging.",
      ],
    },
    'Path of the World Tree': {
      blurb: 'Trace the roots and branches of the multiverse — Yggdrasil as vitality and doorway.',
      features: [
        { level: 3, name: 'Vitality of the Tree', desc: 'Vitality Surge. When you activate your Rage, you gain Temporary Hit Points equal to your Barbarian level.\n\nLife-Giving Force. At the start of each of your turns while raging, one creature within 10 feet gains Temporary Hit Points equal to a roll of d6s equal to your Rage Damage bonus. They vanish when your Rage ends.' },
        { level: 6, name: 'Branches of the Tree', desc: 'When a creature you can see starts its turn within 30 feet while you rage, you can take a Reaction to force a Strength save (DC 8 + Strength modifier + Proficiency Bonus). On a failure it is teleported to an unoccupied space within 5 feet of you (or the nearest one you can see), and you can reduce its Speed to 0 until the end of the turn.' },
        { level: 10, name: 'Battering Roots', desc: 'During your turn, your reach is 10 feet greater with any Melee weapon that has the Heavy or Versatile property. When you hit with such a weapon, you can activate Push or Topple in addition to a different mastery property.' },
        { level: 14, name: 'Travel along the Tree', desc: 'When you activate your Rage, and as a Bonus Action while raging, you can teleport up to 60 feet to an unoccupied space you can see.\n\nOnce per Rage you can extend that to 150 feet and bring up to six willing creatures within 10 feet of you, each landing within 10 feet of your destination.' },
      ],
      notes: [
        'Vitality Surge sets Temporary Hit Points equal to your level — enter it on your sheet when you rage.',
      ],
    },
    'Path of the Zealot': {
      blurb: 'Rage in ecstatic union with a god — divine fury that refuses to fall.',
      features: [
        { level: 3, name: 'Divine Fury', desc: 'On each of your turns while raging, the first creature you hit with a weapon or Unarmed Strike takes extra damage equal to 1d6 plus half your Barbarian level (round down). The damage is Necrotic or Radiant, your choice each time.' },
        { level: 3, name: 'Warrior of the Gods', desc: 'You have a pool of four d12s. As a Bonus Action, expend any number of them, roll, and regain that many Hit Points. The pool refills on a Long Rest, and grows to 5 dice at level 6, 6 at level 12, and 7 at level 17.' },
        { level: 6, name: 'Fanatical Focus', desc: 'Once per active Rage, if you fail a saving throw, you can reroll it with a bonus equal to your Rage Damage bonus, and must use the new roll.' },
        { level: 10, name: 'Zealous Presence', desc: 'As a Bonus Action, up to ten other creatures of your choice within 60 feet gain Advantage on attack rolls and saving throws until the start of your next turn.\n\nOnce per Long Rest, or by expending a use of your Rage (no action required).' },
        { level: 14, name: 'Rage of the Gods', desc: 'When you activate your Rage, you can assume a divine warrior form for 1 minute or until you drop to 0 Hit Points (once per Long Rest). While in it:\n\nFlight. Fly Speed equal to your Speed, and you can hover.\n\nResistance. Resistance to Necrotic, Psychic, and Radiant damage.\n\nRevivification. When a creature within 30 feet would drop to 0 Hit Points, you can take a Reaction and expend a use of your Rage to set its Hit Points to your Barbarian level instead.' },
      ],
      notes: [
        "Warrior of the Gods' healing pool is tracked in the Resources panel.",
      ],
    },
  },

  Bard: {
    'College of Dance': {
      blurb: 'Move in harmony with the cosmos — agility, speed and grace as magic.',
      features: [
        { level: 3, name: 'Dazzling Footwork', desc: 'While you wear no armor and wield no Shield:\n\nDance Virtuoso. Advantage on Charisma (Performance) checks involving dancing.\n\nUnarmored Defense. Base Armor Class equals 10 plus your Dexterity and Charisma modifiers.\n\nAgile Strikes. When you expend a use of Bardic Inspiration as part of an action, Bonus Action or Reaction, you can make one Unarmed Strike as part of it.\n\nBardic Damage. Use Dexterity for Unarmed Strike attack rolls, and deal Bludgeoning damage equal to a roll of your Bardic Inspiration die plus your Dexterity modifier instead of normal damage. This roll doesn\'t expend the die.' },
        { level: 6, name: 'Inspiring Movement', desc: 'When an enemy you can see ends its turn within 5 feet of you, you can take a Reaction and expend a use of Bardic Inspiration to move up to half your Speed. One ally within 30 feet can then use their Reaction to move up to half their Speed. Neither movement provokes Opportunity Attacks.' },
        { level: 6, name: 'Tandem Footwork', desc: 'When you roll Initiative, you can expend a use of Bardic Inspiration (unless Incapacitated): roll the die, and you and each ally within 30 feet who can see or hear you gains that bonus to Initiative.' },
        { level: 14, name: 'Leading Evasion', desc: 'When subjected to an effect allowing a Dexterity save for half damage, you take no damage on a success and half on a failure. You can share this with creatures within 5 feet making the same save. Not usable while Incapacitated.' },
      ],
      notes: ['Unarmored Defense changes your AC — set it on your sheet.'],
    },
    'College of Glamour': {
      blurb: 'Weave beguiling fey magic — beauty and terror threaded through performance.',
      features: [
        { level: 3, name: 'Beguiling Magic', desc: 'You always have Charm Person and Mirror Image prepared.\n\nImmediately after you cast an Enchantment or Illusion spell using a spell slot, a creature you can see within 60 feet makes a Wisdom save against your spell save DC or is Charmed or Frightened (your choice) for 1 minute, repeating the save at the end of each of its turns.\n\nOnce per Long Rest, or by expending a use of Bardic Inspiration (no action required).' },
        { level: 3, name: 'Mantle of Inspiration', desc: 'As a Bonus Action, expend a use of Bardic Inspiration and roll the die. Choose creatures within 60 feet up to your Charisma modifier (minimum one); each gains Temporary Hit Points equal to twice the roll, then can use its Reaction to move up to its Speed without provoking.' },
        { level: 6, name: 'Mantle of Majesty', desc: 'You always have Command prepared.\n\nAs a Bonus Action, cast Command without a slot and take on an unearthly appearance for 1 minute or until your Concentration ends; during it you can cast Command as a Bonus Action without a slot. Any creature Charmed by you automatically fails its save against these castings.\n\nOnce per Long Rest, or by expending a level 3+ spell slot (no action required).' },
        { level: 14, name: 'Unbreakable Majesty', desc: 'As a Bonus Action, assume a majestic presence for 1 minute or until Incapacitated. The first time a creature hits you with an attack roll on a turn, it must succeed on a Charisma save against your spell save DC or the attack misses.\n\nOnce per Short or Long Rest.' },
      ],
      spells: [
        { level: 3, names: ['Charm Person', 'Mirror Image'] },
        { level: 6, names: ['Command'] },
      ],
    },
    'College of Lore': {
      blurb: 'Plumb the depths of magical knowledge — secrets gathered from every tradition.',
      features: [
        { level: 3, name: 'Bonus Proficiencies', desc: 'You gain proficiency with three skills of your choice.' },
        { level: 3, name: 'Cutting Words', desc: 'When a creature you can see within 60 feet makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction and expend a use of Bardic Inspiration: roll the die and subtract it from the creature\'s roll, reducing the damage or potentially turning the success into a failure.' },
        { level: 6, name: 'Magical Discoveries', desc: 'You learn two spells from the Cleric, Druid, or Wizard lists, in any combination. Each must be a cantrip or of a level for which you have spell slots. You always have them prepared, and can replace one whenever you gain a Bard level.' },
        { level: 14, name: 'Peerless Skill', desc: 'When you make an ability check or attack roll and fail, you can expend a use of Bardic Inspiration and add the die to the d20, potentially turning failure into success. On a failure, the inspiration isn\'t expended.' },
      ],
    },
    'College of Valor': {
      blurb: 'Sing the deeds of ancient heroes — a bard who stands in the battle line.',
      features: [
        { level: 3, name: 'Combat Inspiration', desc: 'A creature holding a Bardic Inspiration die from you can use it for one of:\n\nDefense. When hit by an attack roll, use its Reaction to roll the die and add it to its AC against that attack.\n\nOffense. Immediately after hitting with an attack roll, roll the die and add it to the damage.' },
        { level: 3, name: 'Martial Training', desc: 'You gain proficiency with Martial weapons and training with Medium armor and Shields. You can also use a Simple or Martial weapon as a Spellcasting Focus for your Bard spells.' },
        { level: 6, name: 'Extra Attack', desc: 'You can attack twice instead of once whenever you take the Attack action. You can also cast one of your cantrips that has a casting time of an action in place of one of those attacks.' },
        { level: 14, name: 'Battle Magic', desc: 'After you cast a spell that has a casting time of an action, you can make one attack with a weapon as a Bonus Action.' },
      ],
      notes: ['Martial Training changes your armour and weapon proficiencies — update them on your sheet.'],
    },
  },

  Fighter: {
    'Battle Master': {
      blurb: 'Master sophisticated battle maneuvers, fuelled by Superiority Dice.',
      features: [
        {
          level: 3,
          name: 'Combat Superiority',
          desc:
            'You learn three maneuvers of your choice, and two more at levels 7, 10 and 15 (swapping one each time if you wish). Only one maneuver per attack.\n\n' +
            'Superiority Dice. Four d8s, expended on use, all regained on a Short or Long Rest. A fifth at level 7 and a sixth at level 15.\n\n' +
            'Saving Throws. Maneuver DC = 8 + your Strength or Dexterity modifier (your choice) + Proficiency Bonus.',
        },
        {
          level: 3,
          name: 'Maneuver Options',
          desc:
            'Ambush. Add the die to a Dexterity (Stealth) check or Initiative roll.\n\n' +
            'Bait and Switch. Swap places with a willing creature within 5 feet (5+ feet of movement, no Opportunity Attacks); one of you gains a bonus to AC equal to the roll until your next turn.\n\n' +
            "Commander's Strike. Replace one attack to let a willing creature use its Reaction to attack, adding the die to its damage.\n\n" +
            'Commanding Presence. Add the die to a Charisma (Intimidation, Performance, or Persuasion) check.\n\n' +
            'Disarming Attack. Add the die to damage; target makes a Strength save or drops one held object into its space.\n\n' +
            'Distracting Strike. Add the die to damage; the next attack against the target by someone else has Advantage.\n\n' +
            'Evasive Footwork. Bonus Action Disengage, adding the die to your AC until your next turn.\n\n' +
            'Feinting Attack. Bonus Action feint against a creature within 5 feet: Advantage on your next attack against it this turn, adding the die to damage on a hit.\n\n' +
            'Goading Attack. Add the die to damage; target makes a Wisdom save or has Disadvantage attacking anyone but you until the end of your next turn.\n\n' +
            'Lunging Attack. Bonus Action Dash; if you move 5+ feet in a straight line before hitting with a melee attack this turn, add the die to damage.\n\n' +
            'Maneuvering Attack. Add the die to damage; a willing creature uses its Reaction to move half its Speed without provoking from your target.\n\n' +
            'Menacing Attack. Add the die to damage; target makes a Wisdom save or is Frightened until the end of your next turn.\n\n' +
            'Parry. Reaction when damaged by a melee attack: reduce the damage by the die plus your Strength or Dexterity modifier.\n\n' +
            'Precision Attack. Add the die to a missed attack roll, potentially turning it into a hit.\n\n' +
            'Pushing Attack. Add the die to damage; if Large or smaller, the target makes a Strength save or is pushed up to 15 feet away.\n\n' +
            'Rally. Bonus Action: an ally within 30 feet gains Temporary Hit Points equal to the die plus half your Fighter level (round down).\n\n' +
            'Riposte. Reaction when a creature misses you with a melee attack: attack it, adding the die to damage on a hit.\n\n' +
            'Sweeping Attack. On a melee hit, another creature within 5 feet of the target and in your reach takes damage equal to the die, of the same type, if the roll would have hit it.\n\n' +
            'Tactical Assessment. Add the die to an Intelligence (History or Investigation) or Wisdom (Insight) check.\n\n' +
            'Trip Attack. Add the die to damage; if Large or smaller, the target makes a Strength save or is knocked Prone.',
        },
        {
          level: 3,
          name: 'Student of War',
          desc: "You gain proficiency with one type of Artisan's Tools of your choice, and proficiency in one skill from the Fighter's level 1 list.",
        },
        {
          level: 7,
          name: 'Know Your Enemy',
          desc: 'As a Bonus Action, discern whether a creature you can see within 30 feet has any Immunities, Resistances, or Vulnerabilities — and what they are.\n\nOnce per Long Rest, or by expending one Superiority Die (no action required).',
        },
        { level: 10, name: 'Improved Combat Superiority', desc: 'Your Superiority Die becomes a d10.' },
        { level: 15, name: 'Relentless', desc: 'Once per turn, when you use a maneuver, you can roll 1d8 and use that number instead of expending a Superiority Die.' },
        { level: 18, name: 'Ultimate Combat Superiority', desc: 'Your Superiority Die becomes a d12.' },
      ],
      notes: [
        'Superiority Dice are tracked in the Resources panel, including the die size as it grows (d8 → d10 → d12).',
      ],
    },

    Champion: {
      blurb: 'Pursue physical excellence in combat — devastating blows and sheer resilience.',
      features: [
        { level: 3, name: 'Improved Critical', desc: 'Your attack rolls with weapons and Unarmed Strikes score a Critical Hit on a roll of 19 or 20.' },
        { level: 3, name: 'Remarkable Athlete', desc: 'You have Advantage on Initiative rolls and Strength (Athletics) checks.\n\nImmediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks.' },
        { level: 7, name: 'Additional Fighting Style', desc: 'You gain another Fighting Style feat of your choice.' },
        { level: 10, name: 'Heroic Warrior', desc: 'During combat, you can give yourself Heroic Inspiration whenever you start your turn without it.' },
        { level: 15, name: 'Superior Critical', desc: 'Your attack rolls with weapons and Unarmed Strikes score a Critical Hit on a roll of 18–20.' },
        {
          level: 18,
          name: 'Survivor',
          desc:
            'Defy Death. You have Advantage on Death Saving Throws, and a roll of 18–20 on one counts as a 20.\n\n' +
            'Heroic Rally. At the start of each of your turns, you regain Hit Points equal to 5 plus your Constitution modifier if you are Bloodied and have at least 1 Hit Point.',
        },
      ],
      notes: [
        'Heroic Inspiration has a toggle on your sheet — tick it at the start of your turn when Heroic Warrior applies.',
      ],
    },

    'Eldritch Knight': {
      blurb: 'Support combat skills with arcane magic — a third-caster drawing on the Wizard list.',
      features: [
        {
          level: 3,
          name: 'Spellcasting',
          desc:
            'Cantrips. You know two cantrips from the Wizard spell list — Ray of Frost and Shocking Grasp are recommended — and a third at Fighter level 10. You can swap one whenever you gain a Fighter level.\n\n' +
            'Prepared Spells. Start with three level 1 Wizard spells (Burning Hands, Jump and Shield are recommended), rising with level: 4 at Fighter 4, 5 at 7, 6 at 8, 7 at 10, 8 at 11, 9 at 13, 10 at 14, 11 at 16, 12 at 19, 13 at 20.\n\n' +
            'Spell Slots. Level 1 slots from Fighter 3 (2, then 3 from level 4, 4 from level 7); level 2 from Fighter 7; level 3 from Fighter 10; level 4 from Fighter 19.\n\n' +
            'Spellcasting Ability. Intelligence.  Spellcasting Focus. An Arcane Focus.',
        },
        {
          level: 3,
          name: 'War Bond',
          desc: 'A 1-hour ritual (possible during a Short Rest) bonds you to a weapon within reach. You can\'t be disarmed of a bonded weapon unless Incapacitated, and can summon it to your hand as a Bonus Action from anywhere on the same plane.\n\nYou can have up to two bonded weapons but summon only one at a time; bonding a third breaks one of the others.',
        },
        { level: 7, name: 'War Magic', desc: 'When you take the Attack action, you can replace one attack with a casting of one of your Wizard cantrips that has a casting time of an action.' },
        { level: 10, name: 'Eldritch Strike', desc: 'When you hit a creature with a weapon attack, it has Disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn.' },
        { level: 15, name: 'Arcane Charge', desc: 'When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see, before or after the additional action.' },
        { level: 18, name: 'Improved War Magic', desc: 'When you take the Attack action, you can replace two attacks with a casting of one of your level 1 or 2 Wizard spells that has a casting time of an action.' },
      ],
      notes: [
        'Third-caster slots are not derived automatically — set your spell slots on the sheet to match the Eldritch Knight table.',
        'Arcane Charge is a teleport: ask your GM for the blink effect, or just move the token.',
      ],
    },

    'Psi Warrior': {
      blurb: 'Augment physical might with psionic power — telekinetic force at the point of a blade.',
      features: [
        {
          level: 3,
          name: 'Psionic Power',
          desc:
            'You have Psionic Energy Dice: four d6s at level 3, six d8s at 5, eight d8s at 9, eight d10s at 11, ten d10s at 13, twelve d12s at 17. You regain one on a Short Rest and all of them on a Long Rest.\n\n' +
            'Protective Field. Reaction when you or a creature within 30 feet takes damage: expend a die and reduce the damage by the roll plus your Intelligence modifier (minimum 1).\n\n' +
            'Psionic Strike. Once on each of your turns, after you hit a target within 30 feet with a weapon, expend a die to deal extra Force damage equal to the roll plus your Intelligence modifier.\n\n' +
            'Telekinetic Movement. As a Magic action, move one loose Large-or-smaller object, or one willing creature other than you, up to 30 feet to a space you can see. Once per Short or Long Rest, or by expending a die.',
        },
        {
          level: 7,
          name: 'Telekinetic Adept',
          desc:
            'Psi-Powered Leap. As a Bonus Action, gain a Fly Speed equal to twice your Speed until the end of the turn. Once per Short or Long Rest, or by expending a die.\n\n' +
            'Telekinetic Thrust. When you damage a target with Psionic Strike, it makes a Strength save (DC 8 + Intelligence modifier + Proficiency Bonus) or is knocked Prone or moved up to 10 feet horizontally.',
        },
        { level: 10, name: 'Guarded Mind', desc: 'You have Resistance to Psychic damage. If you start your turn Charmed or Frightened, you can expend a die (no action required) to end every effect causing those conditions on you.' },
        { level: 15, name: 'Bulwark of Force', desc: 'As a Bonus Action, choose creatures within 30 feet up to your Intelligence modifier (minimum one), including yourself. Each has Half Cover for 1 minute or until you are Incapacitated.\n\nOnce per Long Rest, or by expending a die.' },
        { level: 18, name: 'Telekinetic Master', desc: 'You always have Telekinesis prepared and can cast it without a spell slot or components, using Intelligence. While you concentrate on it, you can make one weapon attack as a Bonus Action each turn.\n\nOnce per Long Rest, or by expending a die.' },
      ],
      notes: [
        'Psionic Energy Dice are tracked in the Resources panel, with the die size for your level.',
        'Psi-Powered Leap grants a Fly Speed — toggle flying in the My Token panel for the turn.',
      ],
    },
  },

  Sorcerer: {
    'Aberrant Sorcery': {
      blurb: 'Wield unnatural psionic power — an alien influence wrapped around your mind.',
      features: [
        { level: 3, name: 'Telepathic Speech', desc: 'As a Bonus Action, choose one creature you can see within 30 feet. You and it can communicate telepathically while within a number of miles of each other equal to your Charisma modifier (minimum 1 mile); you each must mentally use a language the other knows.\n\nThe connection lasts a number of minutes equal to your Sorcerer level, and ends early if you form a connection with a different creature.' },
        { level: 6, name: 'Psionic Sorcery', desc: 'When you cast any level 1+ spell from your Psionic Spells feature, you can cast it by expending a spell slot as normal or by spending Sorcery Points equal to the spell\'s level. Cast with points, it requires no Verbal or Somatic components, and no Material components unless consumed or costed.' },
        { level: 6, name: 'Psychic Defenses', desc: 'You have Resistance to Psychic damage, and Advantage on saving throws to avoid or end the Charmed or Frightened condition.' },
        { level: 14, name: 'Revelation in Flesh', desc: 'As a Bonus Action, spend 1 or more Sorcery Points to alter your body for 10 minutes. Each point spent grants one benefit:\n\nAquatic Adaptation. Swim Speed equal to twice your Speed, and you can breathe underwater.\n\nGlistening Flight. Fly Speed equal to your Speed, and you can hover.\n\nSee the Invisible. You can see any Invisible creature within 60 feet that isn\'t behind Total Cover.\n\nWormlike Movement. You can move through any space as narrow as 1 inch, and spend 5 feet of movement to escape nonmagical restraints or the Grappled condition.' },
        { level: 18, name: 'Warping Implosion', desc: 'As a Magic action, teleport to an unoccupied space you can see within 120 feet. Each creature within 30 feet of the space you left makes a Strength saving throw against your spell save DC, taking 3d10 Force damage and being pulled toward your former space on a failure, or half damage only on a success.\n\nOnce you use this feature, you can\'t do so again until you finish a Long Rest unless you spend 5 Sorcery Points (no action required).' },
      ],
      spells: [
        { level: 3, names: ['Arms of Hadar', 'Calm Emotions', 'Detect Thoughts', 'Dissonant Whispers', 'Mind Sliver'] },
        { level: 5, names: ['Hunger of Hadar', 'Sending'] },
        { level: 7, names: ["Evard's Black Tentacles", 'Summon Aberration'] },
        { level: 9, names: ["Telepathic Bond", 'Telekinesis'] },
      ],
      notes: [
        "Revelation in Flesh's flight and See the Invisible are real map changes — use the My Token panel to set flying and swap your senses while it lasts.",
      ],
    },

    'Clockwork Sorcery': {
      blurb: 'Channel cosmic forces of order — magic drawn from Mechanus.',
      features: [
        { level: 3, name: 'Manifestations of Order', desc: 'Choose or roll 1d6 for how your connection to order shows while you cast:\n1. Spectral cogwheels hover behind you.\n2. The hands of a clock spin in your eyes.\n3. Your skin glows with a brassy sheen.\n4. Floating equations and geometric objects overlay your body.\n5. Your Spellcasting Focus takes the form of a Tiny clockwork mechanism.\n6. The ticking of gears or ringing of a clock is heard by you and those affected by your magic.' },
        { level: 3, name: 'Restore Balance', desc: 'When a creature you can see within 60 feet is about to roll a d20 with Advantage or Disadvantage, you can take a Reaction to prevent the roll from being affected by either.\n\nYou can use this a number of times equal to your Charisma modifier (minimum of once), regaining all uses on a Long Rest.' },
        { level: 6, name: 'Bastion of Law', desc: 'As a Magic action, expend 1 to 5 Sorcery Points to create a ward around yourself or a creature you can see within 30 feet. The ward is a number of d8s equal to the points spent. When the warded creature takes damage, it can expend any number of those dice, roll them, and reduce the damage by the total.\n\nThe ward lasts until you finish a Long Rest or use this feature again.' },
        { level: 14, name: 'Trance of Order', desc: 'As a Bonus Action, enter this state for 1 minute. Attack rolls against you can\'t benefit from Advantage, and whenever you make a D20 Test you can treat a roll of 9 or lower as a 10.\n\nOnce per Long Rest, unless you spend 5 Sorcery Points (no action required).' },
        { level: 18, name: 'Clockwork Cavalcade', desc: 'As a Magic action, summon spirits of order in a 30-foot Cube originating from you. They restore up to 100 Hit Points divided as you choose among creatures in the Cube, repair damaged objects entirely within it, and end every spell of level 6 and lower on creatures and objects of your choice in it.\n\nOnce per Long Rest, unless you spend 7 Sorcery Points (no action required).' },
      ],
      spells: [
        { level: 3, names: ['Aid', 'Alarm', 'Lesser Restoration', 'Protection from Evil and Good'] },
        { level: 5, names: ['Dispel Magic', 'Protection from Energy'] },
        { level: 7, names: ['Freedom of Movement', 'Summon Construct'] },
        { level: 9, names: ['Greater Restoration', 'Wall of Force'] },
      ],
      notes: [
        'Bastion of Law is a dice-pool ward rather than a flat pool — track the remaining d8s in your notes.',
      ],
    },

    'Draconic Sorcery': {
      blurb: 'Breathe the magic of dragons — draconic gift written into your body.',
      features: [
        { level: 3, name: 'Draconic Resilience', desc: 'Your Hit Point maximum increases by 3, and by 1 whenever you gain another Sorcerer level.\n\nParts of you are covered by dragon-like scales. While you aren\'t wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.' },
        { level: 6, name: 'Elemental Affinity', desc: 'Choose Acid, Cold, Fire, Lightning, or Poison. You have Resistance to that damage type, and when you cast a spell that deals it, you can add your Charisma modifier to one damage roll of that spell.' },
        { level: 14, name: 'Dragon Wings', desc: 'As a Bonus Action, draconic wings appear on your back for 1 hour or until you dismiss them (no action required). For the duration, you have a Fly Speed of 60 feet.\n\nOnce per Long Rest, unless you spend 3 Sorcery Points (no action required).' },
        { level: 18, name: 'Dragon Companion', desc: 'You can cast Summon Dragon without a Material component, and once without a spell slot (regained on a Long Rest).\n\nWhenever you start casting it, you can modify it so it doesn\'t require Concentration; if you do, its duration becomes 1 minute for that casting.' },
      ],
      spells: [
        { level: 3, names: ['Alter Self', 'Chromatic Orb', 'Command', "Dragon's Breath"] },
        { level: 5, names: ['Fear', 'Fly'] },
        { level: 7, names: ['Arcane Eye', 'Charm Monster'] },
        { level: 9, names: ['Legend Lore', 'Summon Dragon'] },
      ],
      notes: [
        'Draconic Resilience changes your HP maximum and unarmoured AC — set both on your sheet; the app does not derive them.',
        'Dragon Wings gives a Fly Speed: toggle flying from the My Token panel while they last.',
        'Dragon Companion summons a creature the GM can bind to you as a companion token.',
      ],
    },

    'Wild Magic Sorcery': {
      blurb: 'Unleash chaotic magic — the forces of chaos beneath the order of creation.',
      features: [
        { level: 3, name: 'Wild Magic Surge', desc: 'Once per turn, you can roll 1d20 immediately after you cast a Sorcerer spell with a spell slot. If you roll a 20, roll on the Wild Magic Surge table to create a magical effect.\n\nIf the magical effect is a spell, it is too wild to be affected by your Metamagic.' },
        { level: 3, name: 'Tides of Chaos', desc: 'You can give yourself Advantage on one D20 Test before you roll. Once you do, you must cast a Sorcerer spell with a spell slot or finish a Long Rest before you can use this again.\n\nIf you do cast a Sorcerer spell with a spell slot before finishing a Long Rest, you automatically roll on the Wild Magic Surge table.' },
        { level: 6, name: 'Bend Luck', desc: 'Immediately after another creature you can see rolls the d20 for a D20 Test, you can take a Reaction and spend 1 Sorcery Point to roll 1d4 and apply it as a bonus or penalty (your choice) to the roll.' },
        { level: 14, name: 'Controlled Chaos', desc: 'Whenever you roll on the Wild Magic Surge table, you can roll twice and use either number.' },
        { level: 18, name: 'Tamed Surge', desc: 'Immediately after you cast a Sorcerer spell with a spell slot, you can choose an effect from the Wild Magic Surge table instead of rolling — any effect except the final row. If the chosen effect involves a roll, you must make it.\n\nOnce per Long Rest.' },
      ],
      notes: [
        'The lightning-bolt button in your quick controls rolls the surge: the server rolls the d100, the result pops up with the effect text, and it lands in the shared dice log so the GM sees it too.',
        'At level 14 Controlled Chaos rolls two d100s and the popup lets you keep either. Several results change the map (size, invisibility, teleport, bright light) — the My Token panel covers size, senses and flight.',
      ],
    },
  },

  Wizard: {
    Abjurer: {
      blurb: 'Shield companions and banish foes — magic that blocks, banishes and protects.',
      features: [
        {
          level: 3,
          name: 'Abjuration Savant',
          desc: 'Choose two Wizard spells from the Abjuration school, each no higher than level 2, and add them to your spellbook for free.\n\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Abjuration school to your spellbook for free. The chosen spell must be of a level for which you have spell slots.',
        },
        {
          level: 3,
          name: 'Arcane Ward',
          desc:
            'When you cast an Abjuration spell with a spell slot, you can simultaneously use a strand of the spell\'s magic to create a magical ward on yourself that lasts until you finish a Long Rest. The ward has a Hit Point maximum equal to twice your Wizard level plus your Intelligence modifier.\n\n' +
            'Whenever you take damage, the ward takes the damage instead; apply any Resistances or Vulnerabilities before reducing the ward\'s Hit Points. If the damage reduces the ward to 0 Hit Points, you take any remaining damage. While the ward has 0 Hit Points it can\'t absorb damage, but its magic remains.\n\n' +
            'Whenever you cast an Abjuration spell with a spell slot, the ward regains Hit Points equal to twice the slot\'s level. Alternatively, as a Bonus Action, you can expend a spell slot to restore twice that slot\'s level in Hit Points.\n\n' +
            'Once you create the ward, you can\'t create it again until you finish a Long Rest.',
        },
        {
          level: 6,
          name: 'Projected Ward',
          desc: 'When a creature that you can see within 30 feet of yourself takes damage, you can take a Reaction to cause your Arcane Ward to absorb that damage. If this reduces the ward to 0 Hit Points, the warded creature takes any remaining damage. Apply that creature\'s Resistances or Vulnerabilities before reducing the ward\'s Hit Points.',
        },
        {
          level: 10,
          name: 'Spell Breaker',
          desc: 'You always have the Counterspell and Dispel Magic spells prepared. In addition, you can cast Dispel Magic as a Bonus Action, and you can add your Proficiency Bonus to its ability check.\n\nWhen you cast either spell with a spell slot, that slot isn\'t expended if the spell fails to stop a spell.',
        },
        {
          level: 14,
          name: 'Spell Resistance',
          desc: 'You have Advantage on saving throws against spells, and you have Resistance to the damage of spells.',
        },
      ],
      spells: [
        { level: 10, names: ['Counterspell', 'Dispel Magic'] },
      ],
      notes: [
        'Arcane Ward is tracked in the Resources panel as its own pool (2 × Wizard level + Intelligence modifier) — type the points remaining as it soaks damage.',
      ],
    },

    Diviner: {
      blurb: 'Learn the secrets of the multiverse — part the veils of space, time and consciousness.',
      features: [
        {
          level: 3,
          name: 'Divination Savant',
          desc: 'Choose two Wizard spells from the Divination school, each no higher than level 2, and add them to your spellbook for free.\n\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Divination school to your spellbook for free.',
        },
        {
          level: 3,
          name: 'Portent',
          desc:
            'Whenever you finish a Long Rest, roll two d20s and record the numbers rolled. You can replace any D20 Test made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll, and you can replace a roll in this way only once per turn.\n\n' +
            'Each foretelling roll can be used only once. When you finish a Long Rest, you lose any unused foretelling rolls.',
        },
        {
          level: 6,
          name: 'Expert Divination',
          desc: 'When you cast a Divination spell using a level 2+ spell slot, you regain one expended spell slot. The slot you regain must be of a level lower than the slot you expended and can\'t be higher than level 5.',
        },
        {
          level: 10,
          name: 'The Third Eye',
          desc:
            'As a Bonus Action, choose one of the following benefits, which lasts until you start a Short or Long Rest. You can\'t use this feature again until you finish a Short or Long Rest.\n\n' +
            'Darkvision. You gain Darkvision with a range of 120 feet.\n\n' +
            'Greater Comprehension. You can read any language.\n\n' +
            'See Invisibility. You can cast See Invisibility without expending a spell slot.',
        },
        {
          level: 14,
          name: 'Greater Portent',
          desc: 'Roll three d20s for your Portent feature rather than two.',
        },
      ],
      notes: [
        'Portent rolls are best kept in your notes — roll two d20s after each Long Rest and record them.',
        "The Third Eye's Darkvision 120 ft is a real vision change — apply it yourself from the Senses button, and restore your own senses when it ends.",
      ],
    },

    Evoker: {
      blurb: 'Create explosive elemental effects — cold, flame, thunder, lightning and acid.',
      features: [
        {
          level: 3,
          name: 'Evocation Savant',
          desc: 'Choose two Wizard spells from the Evocation school, each no higher than level 2, and add them to your spellbook for free.\n\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Evocation school to your spellbook for free.',
        },
        {
          level: 3,
          name: 'Potent Cantrip',
          desc: 'When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw against the cantrip, the target takes half the cantrip\'s damage (if any) but suffers no additional effect from the cantrip.',
        },
        {
          level: 6,
          name: 'Sculpt Spells',
          desc: 'When you cast an Evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 plus the spell\'s level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.',
        },
        {
          level: 10,
          name: 'Empowered Evocation',
          desc: 'Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell.',
        },
        {
          level: 14,
          name: 'Overchannel',
          desc:
            'When you cast a Wizard spell with a spell slot of levels 1–5 that deals damage, you can deal maximum damage with that spell on the turn you cast it.\n\n' +
            'The first time you do so, you suffer no adverse effect. If you use this feature again before you finish a Long Rest, you take 2d12 Necrotic damage for each level of the spell slot immediately after you cast it. This damage ignores Resistance and Immunity. Each further use before a Long Rest increases the Necrotic damage per spell level by 1d12.',
        },
      ],
    },

    Illusionist: {
      blurb: 'Weave subtle spells of deception — make the impossible seem real.',
      features: [
        {
          level: 3,
          name: 'Illusion Savant',
          desc: 'Choose two Wizard spells from the Illusion school, each no higher than level 2, and add them to your spellbook for free.\n\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Illusion school to your spellbook for free.',
        },
        {
          level: 3,
          name: 'Improved Illusions',
          desc:
            'You can cast Illusion spells without providing Verbal components, and if an Illusion spell you cast has a range of 10+ feet, the range increases by 60 feet.\n\n' +
            'You also know the Minor Illusion cantrip. If you already know it, you learn a different Wizard cantrip of your choice; it doesn\'t count against your number of cantrips known. You can create both a sound and an image with a single casting of Minor Illusion, and you can cast it as a Bonus Action.',
        },
        {
          level: 6,
          name: 'Phantasmal Creatures',
          desc: 'You always have the Summon Beast and Summon Fey spells prepared. Whenever you cast either spell, you can change its school to Illusion, which causes the summoned creature to appear spectral. You can cast the Illusion version of each spell without expending a spell slot, but casting it without a slot halves the creature\'s Hit Points. Once you cast either spell without a spell slot, you must finish a Long Rest before you can cast that spell in that way again.',
        },
        {
          level: 10,
          name: 'Illusory Self',
          desc: 'When a creature hits you with an attack roll, you can take a Reaction to interpose an illusory duplicate of yourself between the attacker and yourself. The attack automatically misses you, then the illusion dissipates.\n\nOnce you use this feature, you can\'t use it again until you finish a Short or Long Rest. You can also restore your use of it by expending a level 2+ spell slot (no action required).',
        },
        {
          level: 14,
          name: 'Illusory Reality',
          desc: 'When you cast an Illusion spell with a spell slot, you can choose one inanimate, nonmagical object that is part of the illusion and make that object real. You can do this on your turn as a Bonus Action while the spell is ongoing. The object remains real for 1 minute, during which it can\'t deal damage or give any conditions.',
        },
      ],
      spells: [
        { level: 6, names: ['Summon Beast', 'Summon Fey'] },
      ],
    },
  },

  Cleric: {
    'Life Domain': {
      blurb: 'Soothe the hurts of the world — mastery of the positive energy that sustains life.',
      features: [
        {
          level: 3,
          name: 'Disciple of Life',
          desc: 'When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot\'s level.',
        },
        {
          level: 3,
          name: 'Preserve Life',
          desc: 'As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum.',
        },
        {
          level: 6,
          name: 'Blessed Healer',
          desc: 'The healing spells you cast on others heal you as well. Immediately after you cast a spell with a spell slot that restores Hit Points to one or more creatures other than yourself, you regain Hit Points equal to 2 plus the spell slot\'s level.',
        },
        {
          level: 17,
          name: 'Supreme Healing',
          desc: 'When you would normally roll one or more dice to restore Hit Points to a creature with a spell or Channel Divinity, don\'t roll those dice for the healing; instead use the highest number possible for each die. For example, instead of restoring 2d6 Hit Points to a creature with a spell, you restore 12.',
        },
      ],
      spells: [
        { level: 3, names: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'] },
        { level: 5, names: ['Mass Healing Word', 'Revivify'] },
        { level: 7, names: ['Aura of Life', 'Death Ward'] },
        { level: 9, names: ['Greater Restoration', 'Mass Cure Wounds'] },
      ],
    },

    'Light Domain': {
      blurb: 'Bring light to banish darkness — blazing fire and revelation.',
      features: [
        {
          level: 3,
          name: 'Radiance of the Dawn',
          desc: 'As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to emit a flash of light in a 30-foot Emanation originating from yourself. Any magical Darkness — such as that created by the Darkness spell — in that area is dispelled. Additionally, each creature of your choice in that area must make a Constitution saving throw, taking Radiant damage equal to 2d10 plus your Cleric level on a failed save or half as much damage on a successful one.',
        },
        {
          level: 3,
          name: 'Warding Flare',
          desc:
            'When a creature that you can see within 30 feet of yourself makes an attack roll, you can take a Reaction to impose Disadvantage on the attack roll, causing light to flare before it hits or misses.\n\n' +
            'You can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Long Rest.',
        },
        {
          level: 6,
          name: 'Improved Warding Flare',
          desc:
            'You regain all expended uses of your Warding Flare when you finish a Short or Long Rest.\n\n' +
            'In addition, whenever you use Warding Flare, you can give the target of the triggering attack a number of Temporary Hit Points equal to 2d6 plus your Wisdom modifier.',
        },
        {
          level: 17,
          name: 'Corona of Light',
          desc:
            'As a Magic action, you cause yourself to emit an aura of sunlight that lasts for 1 minute or until you dismiss it (no action required). You emit Bright Light in a 60-foot radius and Dim Light for an additional 30 feet. Your enemies in the Bright Light have Disadvantage on saving throws against your Radiance of the Dawn and any spell that deals Fire or Radiant damage.\n\n' +
            'You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.',
        },
      ],
      spells: [
        { level: 3, names: ['Burning Hands', 'Faerie Fire', 'Scorching Ray', 'See Invisibility'] },
        { level: 5, names: ['Daylight', 'Fireball'] },
        { level: 7, names: ['Arcane Eye', 'Wall of Fire'] },
        { level: 9, names: ['Flame Strike', 'Scrying'] },
      ],
      notes: [
        "Corona of Light's radius (60 ft bright / 30 ft dim) can be set on your token from the light-source button so the map shows it.",
      ],
    },

    'Trickery Domain': {
      blurb: 'Make mischief and challenge authority — deception, illusion and stealth.',
      features: [
        {
          level: 3,
          name: 'Blessing of the Trickster',
          desc: 'As a Magic action, you can choose yourself or a willing creature within 30 feet of yourself to have Advantage on Dexterity (Stealth) checks. This blessing lasts until you finish a Long Rest or you use this feature again.',
        },
        {
          level: 3,
          name: 'Invoke Duplicity',
          desc:
            'As a Bonus Action, you can expend one use of your Channel Divinity to create a perfect visual illusion of yourself in an unoccupied space you can see within 30 feet of yourself. The illusion is intangible and doesn\'t occupy its space. It lasts for 1 minute, but it ends early if you dismiss it (no action required) or have the Incapacitated condition. The illusion is animated and mimics your expressions and gestures. While it persists, you gain the following benefits.\n\n' +
            'Cast Spells. You can cast spells as though you were in the illusion\'s space, but you must use your own senses.\n\n' +
            'Distract. When both you and your illusion are within 5 feet of a creature that can see the illusion, you have Advantage on attack rolls against that creature.\n\n' +
            'Move. As a Bonus Action, you can move the illusion up to 30 feet to an unoccupied space you can see that is within 120 feet of yourself.',
        },
        {
          level: 6,
          name: "Trickster's Transposition",
          desc: 'Whenever you take the Bonus Action to create or move the illusion of your Invoke Duplicity, you can teleport, swapping places with the illusion.',
        },
        {
          level: 17,
          name: 'Improved Duplicity',
          desc:
            'The illusion of your Invoke Duplicity has grown more powerful in the following ways.\n\n' +
            'Shared Distraction. When you and your allies make attack rolls against a creature within 5 feet of the illusion, the attack rolls have Advantage.\n\n' +
            'Healing Illusion. When the illusion ends, you or a creature of your choice within 5 feet of it regains a number of Hit Points equal to your Cleric level.',
        },
      ],
      spells: [
        { level: 3, names: ['Charm Person', 'Disguise Self', 'Invisibility', 'Pass without Trace'] },
        { level: 5, names: ['Hypnotic Pattern', 'Nondetection'] },
        { level: 7, names: ['Confusion', 'Dimension Door'] },
        { level: 9, names: ['Dominate Person', 'Modify Memory'] },
      ],
      notes: [
        'Invoke Duplicity\'s illusion is easiest to run as a second token — drop one from the library and move it with the GM, or ask for a duplicate of your own token.',
      ],
    },

    'War Domain': {
      blurb: 'Inspire valour and smite foes — divine magic that excels in battle.',
      features: [
        {
          level: 3,
          name: 'Guided Strike',
          desc: 'When you or a creature within 30 feet of you misses with an attack roll, you can expend one use of your Channel Divinity and give that roll a +10 bonus, potentially causing it to hit. When you use this feature to benefit another creature\'s attack roll, you must take a Reaction to do so.',
        },
        {
          level: 3,
          name: 'War Priest',
          desc: 'As a Bonus Action, you can make one attack with a weapon or an Unarmed Strike. You can use this Bonus Action a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Short or Long Rest.',
        },
        {
          level: 6,
          name: "War God's Blessing",
          desc: 'You can expend a use of your Channel Divinity to cast Shield of Faith or Spiritual Weapon rather than expending a spell slot. When you cast either spell in this way, the spell doesn\'t require Concentration. Instead the spell lasts for 1 minute, but it ends early if you cast that spell again, have the Incapacitated condition, or die.',
        },
        {
          level: 17,
          name: 'Avatar of Battle',
          desc: 'You gain Resistance to Bludgeoning, Piercing, and Slashing damage.',
        },
      ],
      spells: [
        { level: 3, names: ['Guiding Bolt', 'Magic Weapon', 'Shield of Faith', 'Spiritual Weapon'] },
        { level: 5, names: ["Crusader's Mantle", 'Spirit Guardians'] },
        { level: 7, names: ['Fire Shield', 'Freedom of Movement'] },
        { level: 9, names: ['Hold Monster', 'Steel Wind Strike'] },
      ],
    },

    // ── Forge Domain ───────────────────────────────────────────────
    'Forge Domain': {
      blurb: 'Gods of the forge — patrons of smiths, and of the armour and weapons made in fire.',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc: 'You gain proficiency with heavy armor and with smith\'s tools.',
        },
        {
          level: 1,
          name: 'Blessing of the Forge',
          desc:
            'At the end of a Long Rest you can touch one nonmagical object — a suit of armor, or a simple or ' +
            'martial weapon — and it becomes a magic item until the end of your next Long Rest or until you die.\n\n' +
            'Armor treated this way grants +1 AC. A weapon grants +1 to attack and damage rolls.\n\n' +
            'Once you use this feature, you can\'t use it again until you finish a Long Rest.',
        },
        {
          level: 2,
          name: "Channel Divinity: Artisan's Blessing",
          desc:
            'You conduct an hour-long ritual, expending a use of Channel Divinity, to create a simple nonmagical ' +
            'item that includes some metal: a weapon, armor, ten pieces of ammunition, a set of tools, or similar ' +
            'metal gear.\n\n' +
            'The finished item can be worth no more than 100 gp. You must lay out metal, which can include coins, ' +
            'with a value equal to the creation; it irretrievably transforms into the item, magically forming even ' +
            'its nonmetal parts. The item appears in an unoccupied space of your choice on a surface within 5 feet ' +
            'of you when the ritual ends.\n\n' +
            'The ritual can create a duplicate of a nonmagical item that contains metal, such as a key, if you ' +
            'possess the original during the ritual.',
        },
        {
          level: 6,
          name: 'Soul of the Forge',
          desc:
            'You gain Resistance to Fire damage.\n\nWhile wearing heavy armor, you gain +1 AC.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'Once on each of your turns when you hit a creature with a weapon attack, you can deal an extra 1d8 ' +
            'Fire damage. This increases to 2d8 at 14th level.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc: 'Your Divine Strike now deals an extra 2d8 Fire damage.',
        },
        {
          level: 17,
          name: 'Saint of Forge and Fire',
          desc:
            'You gain Immunity to Fire damage.\n\n' +
            'While wearing heavy armor, you also gain Resistance to Bludgeoning, Piercing and Slashing damage ' +
            'from nonmagical attacks.',
        },
      ],
      spells: [
        { level: 1, names: ['Identify', 'Searing Smite'] },
        { level: 3, names: ['Heat Metal', 'Magic Weapon'] },
        { level: 5, names: ['Elemental Weapon', 'Protection from Energy'] },
        { level: 7, names: ['Fabricate', 'Wall of Fire'] },
        { level: 9, names: ['Animate Objects', 'Creation'] },
      ],
    },


    // ── Divergent Domains ──────────────────────────────────────────
    // Twenty homebrew domains from 'Divergent Domains: New Paths to
    // Faith' by Yorviing, free Fan Content under the OGL. Transcribed
    // from the supplement and kept in its wording for the same reason
    // the SRD entries above are: this is what a player reads mid-session.
    'Aegis Domain': {
      blurb: 'Those gods that preside over the domain of aegis include gods whose spheres are defense, fortitude, protection, and shelter. For to these gods, to protect and…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            '• Starting at 1st level, you gain proficiency with heavy armor and martial weapons.\n• In addition, ' +
            'you also gain proficiency in your choice of either carpenter\'s tools or mason\'s tools.',
        },
        {
          level: 1,
          name: 'Shielding Aura',
          desc:
            '• Also at 1st level, on your turn, you can use a bonus action to gain temporary hit points equal to ' +
            'twice your cleric level, which last until the start of your next turn. If you are wielding a shield ' +
            'when you use this feature, you instead gain temporary hit points equal to three times your cleric ' +
            'level.\n• You can use this feature a number of times equal to your Wisdom modifier (a minimum of ' +
            'once). You regain all expended uses when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Impenetrable Shield',
          desc:
            'At 2nd level, you can call forth divine power to shield a creature from harm. When a creature within ' +
            '30 feet of you makes an attack roll against you or a friendly creature that you can see, you can use ' +
            'your reaction to grant that creature a +5 bonus to its AC until the start of its next turn, using ' +
            'your Channel Divinity. You make this choice after you see the roll, but before the GM says whether ' +
            'the attack hits or misses.',
        },
        {
          level: 6,
          name: 'Elite Defender',
          desc:
            'By 6th level, you gain the following benefits:\n\n• Wielding a shield increases your AC by 3, instead ' +
            'of 2.\n• While you have temporary hit points and you hit a creature with an attack, you can expend a ' +
            'number of temporary hit points equal to half your cleric level (rounded down). When you do so, the ' +
            'target of the attack takes additional damage equal to the number of temporary hit points spent.\n• ' +
            'Whenever you make an Intelligence check pertaining to the defensive qualities of a structure, your ' +
            'proficiency bonus is doubled if it applies to the check.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Bulwark',
          desc:
            'By 17th level, all damage you take is reduced by 5.',
        },
      ],
      spells: [
        { level: 1, names: ['Sanctuary', 'Shield'] },
        { level: 3, names: ['Arcane Lock', 'Warding Bond'] },
        { level: 5, names: ['Protection from Energy', 'Tiny Hut'] },
        { level: 7, names: ['Guardian of Faith', 'Resilient Sphere'] },
        { level: 9, names: ['Antilife Shell', 'Wall of Stone'] },
      ],
    },
    'Alchemy Domain': {
      blurb: 'Gods whose spheres include alchemy govern over change, creation, immortality, nature, and transmutation. They include gods of astrology, crafting, the…',
      features: [
        {
          level: 1,
          name: 'Alchemical Training',
          desc:
            'At 1st level, you gain proficiency with alchemist\'s supplies. Additionally, you can use alchemist\'s ' +
            'supplies as a spellcasting focus for your cleric spells.',
        },
        {
          level: 1,
          name: 'Sacred Science',
          desc:
            'Also at 1st level, you can identify one potion or other object created by alchemical processes as if ' +
            'you had tasted it. You also have advantage on Intelligence checks related to identifying the ' +
            'ingredients and components used to make the object as well as to recall information regarding what ' +
            'the object could be used for based on the ingredients used to create it. You must be able to see the ' +
            'object in order to gain these benefits. Additionally, over the course of a short or long rest, you ' +
            'can temporarily improve the quality and potency of a number of potions equal to your cleric level ' +
            '(minimum of 1). The potions that you improve can be of any rarity. In order to use this benefit, you ' +
            'must have a set of alchemist\'s supplies with you, and the potion must be within reach of you. A ' +
            'potion that is improved in this way maintains the additional effect until you finish a long rest. ' +
            'When you temporarily improve the quality of a potion in this way, choose one of the following ' +
            'options: Concentrated. The potion can be used twice, instead of once, before it is depleted or ' +
            'before you finish a long rest. Enduring. If the potion grants an effect that lasts for a specific ' +
            'duration (such as 10 minutes or 1 hour), this duration is doubled. Potent. If the potion\'s effect ' +
            'involves a die roll (such as rolling 1d6), the creature using the potion can add your Intelligence ' +
            'modifier (minimum of 1) to the result of one roll.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Transmuter\'s Magic',
          desc:
            'At 2nd level, as an action while holding your alchemist\'s supplies, you can use your Channel ' +
            'Divinity to cast one spell of your choice at its base level without expending a spell slot or ' +
            'requiring material components. The spell you cast can be from any spell list, though the spell must ' +
            'be of a level no greater than one fourth your character level, and the spell must belong to the ' +
            'school of transmutation. Wisdom is your spellcasting ability for the spell when you use this ' +
            'feature.',
        },
        {
          level: 6,
          name: 'Occult Alchemist',
          desc:
            'By 6th level, you gain the following benefits:\n\n• You can use one potion on your turn (no action ' +
            'required).\n• When you use your Alchemical Insights feature, you can improve a potion with two ' +
            'temporary improvements instead of one, and potions improved in this way last indefinitely or until ' +
            'the potion is used.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Magnum Opus',
          desc:
            'By 17th level, you gain the following benefits:\n\n• You no longer age, and can\'t be magically aged.\n• ' +
            'You are immune to disease.\n• Your Intelligence and Wisdom scores both increase by 2.\n• Your maximum ' +
            'for each of these scores is now 24.',
        },
      ],
      spells: [
        { level: 1, names: ['Create or Destroy Water', 'Identify'] },
        { level: 2, names: ['Acid Arrow', 'Alter Self'] },
        { level: 3, names: ['Haste', 'Stinking Cloud'] },
        { level: 4, names: ['Fabricate', 'Polymorph'] },
        { level: 5, names: ['Animate Objects', 'Creation'] },
      ],
    },
    'Archery Domain': {
      blurb: 'The gods of archery embody precision, self reliance, and patience. Some of these gods are also gods of hunting and survival, and value perseverance and…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            'At 1st level, you gain proficiency in martial ranged weapons, and you gain proficiency in the ' +
            'Perception skill. Additionally, you can use a ranged weapon as a spellcasting focus for your cleric ' +
            'spells.',
        },
        {
          level: 1,
          name: 'Archer\'s Luck',
          desc:
            'Also at 1st level, you can test your sharpshooting skills. Once per turn when you miss with a ranged ' +
            'weapon attack, you can repeat the attack roll against the same target. You can use this feature a ' +
            'number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when ' +
            'you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Crackshot',
          desc:
            'Starting at 2nd level, if you hit a creature with a ranged weapon attack, you can use your Channel ' +
            'Divinity as part of the attack to make the hit a critical hit.',
        },
        {
          level: 6,
          name: 'Steady Eye',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• Attacking prone creatures or at long ' +
            'range doesn\'t impose disadvantage on your ranged weapon attack rolls.\n• An area being lightly ' +
            'obscured doesn\'t impose disadvantage on Wisdom (Perception) checks that rely on sight.\n• When you ' +
            'use your Channel Divinity: Crackshot, the target of the attack takes additional damage equal to your ' +
            'cleric level.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Mastery of Bow & Arrow',
          desc:
            'Starting at 17th level, you have advantage on all ranged weapon attack rolls.',
        },
      ],
      spells: [
        { level: 1, names: ['Hunter\'s Mark', 'Zephyr Strike'] },
        { level: 3, names: ['Cordon of Arrows', 'Magic Weapon'] },
        { level: 5, names: ['Conjure Barrage', 'Elemental Weapon'] },
        { level: 7, names: ['Freedom of Movement', 'Locate Creature'] },
        { level: 9, names: ['Conjure Volley', 'Swift Quiver'] },
      ],
    },
    'Blood Domain': {
      blurb: 'Gods of blood preside over vitality and violence. They can embody sacrifice, slaughter, life, purity, or pacts made in blood. They teach that blood is…',
      features: [
        {
          level: 1,
          name: 'Acolyte of Blood',
          desc:
            'At 1st level, you gain proficiency with martial weapons. In addition, your hit point maximum ' +
            'increases by 1, and it increases by 1 every time you gain a level in this class.',
        },
        {
          level: 1,
          name: 'Vital Strike',
          desc:
            'Also at 1st level, when you hit a creature with a melee attack, you can force the target to make a ' +
            'Constitution saving throw against your cleric spell save DC. On a failure, the attack deals an extra ' +
            '1d8 necrotic damage to that creature, and you regain a number of hit points equal to half the ' +
            'necrotic damage dealt by this attack. You can use this feature a number of times equal to your ' +
            'Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Grievous Wound',
          desc:
            'Starting at 2nd level, you can use your Channel Divinity to deeply wound your foe. When you make a ' +
            'damage roll with a weapon attack, you can use your Channel Divinity to deal maximum damage, instead ' +
            'of rolling. You make this choice after you see the roll.',
        },
        {
          level: 6,
          name: 'Sanctum Vitae',
          desc:
            'By 6th level, your holy blood grants you special abilities:\n\n• You stabilize whenever you are dying ' +
            'at the start of your turn.\n• You gain proficiency in Constitution saving throws. If you already have ' +
            'this proficiency, you instead gain proficiency in Strength or Dexterity saving throws (your ' +
            'choice).\n• Your Vital Strike increases to 2d8.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with the power to draw forth more ' +
            'blood. Once on each of your turns when you hit a creature with a weapon attack, you can cause the ' +
            'attack to deal an extra 1d8 necrotic damage to the target. When you reach 14th level, the extra ' +
            'damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with the power to draw forth more ' +
            'blood. Once on each of your turns when you hit a creature with a weapon attack, you can cause the ' +
            'attack to deal an extra 1d8 necrotic damage to the target. When you reach 14th level, the extra ' +
            'damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Sanguine Soul',
          desc:
            'By 17th level, at the start of each of your turns, you regain hit points equal to half your cleric ' +
            'level if you have no more than half of your hit points left. You don\'t gain this benefit if you have ' +
            '0 hit points. Additionally, if a spell, such as revivify, has the sole effect of restoring you to ' +
            'life, the caster doesn\'t need any material components to cast the spell on you provided they possess ' +
            'one vial\'s worth of your blood.',
        },
      ],
      spells: [
        { level: 1, names: ['False Life', 'Inflict Wounds'] },
        { level: 3, names: ['Aid', 'Hold Person'] },
        { level: 5, names: ['Haste', 'Vampiric Touch'] },
        { level: 7, names: ['Blight', 'Death Ward'] },
        { level: 9, names: ['Dominate Person', 'Reincarnate'] },
      ],
    },
    'Chivalry Domain': {
      blurb: 'Gods of chivalry include deities whose spheres are of bravery, dignity, heraldry, honor, etiquette, purity, and strength. Many of these gods are considered by…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            'At 1st level, you gain proficiency with martial weapons and heavy armor.',
        },
        {
          level: 1,
          name: 'Gallantry',
          desc:
            'Also at 1st level, the strength of your heart never fails you. You have advantage on saving throws ' +
            'against being frightened. Additionally, when you succeed on a saving throw against being frightened, ' +
            'you have advantage on attack rolls until the start of your next turn.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Stir The Heart',
          desc:
            'At 2nd level, your words can inspire others to action. As an action, you can utter a call, command, ' +
            'or phrase, using your Channel Divinity. Each creature of your choice within 30 feet of you that can ' +
            'hear and understand you can add a d4 to one ability check, attack roll, or saving throw that it ' +
            'makes within the next minute. A creature can benefit from only one use of this Channel Divinity at a ' +
            'time.',
        },
        {
          level: 6,
          name: 'Chevalier\'s Reputation',
          desc:
            'By 6th level, you gain the following benefits:\n\n• Whenever you make a Charisma check when ' +
            'interacting with nobility, common folk, or a knight, your proficiency bonus is doubled if it applies ' +
            'to the check, provided that you have not shown yourself to be a danger to them.\n• A creature under ' +
            'the effects of your Channel Divinity: Stir The Heart can now add 2d4, instead of a d4.\n• Whenever ' +
            'you make an Intelligence (History) check when recalling information about heraldry, lines of ' +
            'nobility, tales of romantic epics or adventures, or etiquette, your proficiency bonus is doubled if ' +
            'it applies to the check.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'True Champion',
          desc:
            'By 17th level, you rarely ever falter in the face of danger. You have advantage on all saving throws.',
        },
      ],
      spells: [
        { level: 1, names: ['Compelled Duel', 'Heroism'] },
        { level: 3, names: ['Aid', 'Find Steed'] },
        { level: 5, names: ['Beacon of Hope', 'Crusader\'s Mantle'] },
        { level: 7, names: ['Aura of Purity', 'Find Greater Steed'] },
        { level: 9, names: ['Legend Lore', 'Virtuous Guardians'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Virtuous Guardians.',
      ],
    },
    'Damnation Domain': {
      blurb: 'Clerics of this domain revere and worship fiendish lords who possess great power and dark gifts. Such fiends are often strong enough to rule over a dominion of…',
      features: [
        {
          level: 1,
          name: 'Blessings of Hell',
          desc:
            'Beginning at 1st level, you can speak, read, and write Abyssal and Infernal. You also gain ' +
            'proficiency with martial weapons.',
        },
        {
          level: 1,
          name: 'Deceitful Arts',
          desc:
            'Also at 1st level, you have learned how to use the deceitful ways of fiends. As a bonus action, you ' +
            'make a Charisma (Deception) check against a creature you can see that isn\'t incapacitated, contested ' +
            'by the target\'s Wisdom (Insight) check. If you succeed, you can use one of the following options ' +
            'against that target: Betrayal. The target must immediately use its reaction to move its speed in a ' +
            'straight line toward its nearest ally and make a melee attack against that ally. Scheme. The next ' +
            'time you deal damage to the target before you finish a long rest, the target takes an additional 2d6 ' +
            'damage. Terrorize. The target becomes frightened of you and has a speed of 0 until the end of your ' +
            'next turn. You can use this feature a number of times equal to your Wisdom modifier (a minimum of ' +
            'once). You regain all expended uses when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Collector of Souls',
          desc:
            'Starting at 2nd level, you have been entrusted to procure the souls of mortals for your diabolic ' +
            'lords. When a creature that is hostile you is reduced to 0 hit points or dies, you can use your ' +
            'Channel Divinity to present your holy symbol as a reaction to absorb its soul into your holy symbol, ' +
            'where it remains until you finish a long rest. Creatures without souls are immune to this effect. ' +
            'Once while the soul resides in your holy symbol, you can ask the soul three questions (no action ' +
            'required) and receive a brief telepathic answer for each question. You can understand these answers ' +
            'regardless of the language used. The soul knows only what it knew in life, but it must answer you ' +
            'truthfully. Each answer that the soul provides is no more than a sentence or two at most, and may be ' +
            'cryptic or metaphorical. Once you question a soul this way, it vanishes from your holy symbol, ' +
            'though its soul is not considered free and willing for 7 days after you use this effect.',
        },
        {
          level: 6,
          name: 'Hellwalker',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• You have advantage on Charisma saving ' +
            'throws.\n• When you roll initiative and have no more uses of your Deceitful Arts feature left, you ' +
            'regain one use.\n• You gain darkvision out to a range of 60 feet. If you already have darkvision ' +
            '(such as from your race), its range increases by 30 feet. Additionally, magical darkness doesn\'t ' +
            'impede your darkvision.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with damning power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 fire damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with damning power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 fire damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Profane Soul',
          desc:
            'By 17th level, you gain resistance to bludgeoning, piercing, and slashing damage from nonmagical ' +
            'weapons. In addition, you gain resistance to your choice of either cold, fire, or lightning damage.',
        },
      ],
      spells: [
        { level: 1, names: ['Command', 'Hellish Rebuke'] },
        { level: 3, names: ['Demon\'s Feast', 'Scorching Ray'] },
        { level: 5, names: ['Fireball', 'Tongues'] },
        { level: 7, names: ['Locate Creature', 'Wall of Fire'] },
        { level: 9, names: ['Dominate Person', 'Infernal Calling'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Demon\'s Feast.',
      ],
    },
    'Dream Domain': {
      blurb: 'Gods of dreams preside over visions, nightmares, desires, madness, and portents. They teach that all dreams contain prophecies, omens, desires, and truth.…',
      features: [
        {
          level: 1,
          name: 'Dream Teachings',
          desc:
            'At 1st level, you know how to divine threads of fate and portray your dreams. You learn the guidance ' +
            'and minor illusion cantrips.',
        },
        {
          level: 1,
          name: 'Oneiric',
          desc:
            'Also at 1st level, your dreams have granted you greater insight and intuition. You gain proficiency ' +
            'in the Insight skill, and your proficiency bonus is doubled for any ability check you make that uses ' +
            'this skill.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Dreamscape',
          desc:
            'At 2nd level, you can use your Channel Divinity to link minds with another in a mutual dream. As an ' +
            'action, you present your holy symbol and force a creature you can see within 60 feet of you to make ' +
            'a Wisdom saving throw. On a failed save, both you and the creature are incapacitated and have your ' +
            'speed become 0 for 1 minute, or until you choose to end the effect (no action required). During this ' +
            'time, the creature is unaware of its surroundings, existing in a shared dreamscape with you. You can ' +
            'harmlessly manipulate the dreamscape, and both of you can communicate with each other as if you ' +
            'shared a language. Time in the dreamscape moves slower, with 1 minute passing for each round spent ' +
            'within it. The creature can repeat its saving throw each time it takes damage, ending the effect on ' +
            'a success.',
        },
        {
          level: 6,
          name: 'Divine Dreamer',
          desc:
            'At 6th level, your understanding of oneiromancy has granted you the following benefits:\n\n• You have ' +
            'resistance to psychic damage.\n• You have advantage on saving throws against being charmed or ' +
            'frightened.\n• You can perfectly recall any dream, vision, epiphany, or nightmare that you have had ' +
            'in vivid detail.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, once per turn, you can add your Wisdom modifier to the damage you deal with ' +
            'any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Dreamwalker',
          desc:
            'By 17th level, you can cast the dream spell at will, without expending a spell slot. When you cast ' +
            'dream, you can contact a creature on any plane of existence, and any time you spend in the spell\'s ' +
            'trance counts as sleep for the purposes of completing a short or long rest.',
        },
      ],
      spells: [
        { level: 1, names: ['Alarm', 'Sleep'] },
        { level: 3, names: ['Moonbeam', 'Silence'] },
        { level: 5, names: ['Fear', 'Hypnotic Pattern'] },
        { level: 7, names: ['Phantasmal Killer', 'Private Sanctum'] },
        { level: 9, names: ['Dream', 'Modify Memory'] },
      ],
    },
    'Eldritch Domain': {
      blurb: 'Gods of eldritch origin are aberrant and ancient deities whose motives, knowledge, and true nature are incomprehensible to mortals. They exist in strange…',
      features: [
        {
          level: 1,
          name: 'Elder Mind',
          desc:
            'At 1st level, your devotion and studies to the beings from the farthest realms of the cosmos has ' +
            'trained you to know their tongue. You learn how to speak, read, and write Deep Speech. In addition, ' +
            'your knowledge of the aberrant tongue allows you to alter magic through their language. When you ' +
            'cast a cleric spell with a verbal component that deals damage, you can choose to speak in Deep ' +
            'Speech, speaking the spell\'s verbal component in Deep Speech or adding a phrase in Deep Speech if ' +
            'the spell doesn\'t normally have a verbal component. When you do so, the spell\'s damage type changes ' +
            'to psychic. If it deals more than one damage type, only one of those damage types changes.',
        },
        {
          level: 1,
          name: 'Unearthly Conduit',
          desc:
            'At 1st level, you can wield a sliver of the power held by the aberrant beings of reality, but at the ' +
            'price of your own sanity. When you fail a saving throw you make to maintain concentration on a ' +
            'spell, you can instead choose to succeed. If you do, your mind opens to visions of strange ' +
            'phenomena, accursed visions, horrifying omens, maddening whispers and voices, and eldritch horrors. ' +
            'You take psychic damage equal to the spell\'s level, and until the spell ends, psychic damage can\'t ' +
            'cause you to lose concentration on the spell. Additionally, for the spell\'s duration, you take the ' +
            'same psychic damage at the end of each of your turns. Psychic damage dealt by this feature can\'t be ' +
            'reduced in any way. Once you use this feature, you can\'t use it again until you complete a short or ' +
            'long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Doors of Oblivion',
          desc:
            'Starting at 2nd level, you can use your Channel Divinity to call forth a fraction of your deity\'s ' +
            'power. As an action, you can present your holy symbol, choosing a point that you can see within 60 ' +
            'feet of you. A bizarre phenomena that rattles mortal minds occurs in the point you chose, such as a ' +
            'strange door appearing, a warp in space, a rift in time, a tentacled and toothy maw, or a coterie of ' +
            'spirits, which lasts until the end of your next turn. Each creature within 10 feet of the chosen ' +
            'point must make an Intelligence saving throw. On a failure, a creature takes psychic damage equal to ' +
            '2d8 + your cleric level and it becomes frightened of the phenomena until the end of your next turn. ' +
            'While frightened, a creature can\'t understand what other creatures say, can\'t read, and speaks only ' +
            'in gibberish. On a successful save, a creature takes half damage and suffers no other ill effect.',
        },
        {
          level: 6,
          name: 'Ancient Rite',
          desc:
            'Starting at 6th level, you can perform a ritualistic ceremony, beseeching an Old God for power. You ' +
            'can perform this ceremony over the course of 10 minutes. At the end of this ceremony, roll a d6 on ' +
            'the table listed on the following table, gaining the effect until you complete a long rest.\n\nd6 Rite ' +
            'Effect Knowledge. Choose two skills that you are proficient 1 in. Your proficiency bonus is doubled ' +
            'for any ability check you make that uses either of those skills. Magic. Choose one spell from any ' +
            'class, including this one. A spell you choose must be of a level you can cast, between 1st and 5th ' +
            'level. The chosen spell counts as a cleric spell for you, is considered prepared, and does not count ' +
            'towards the total number of spells you have prepared. Speech. You are considered to be under the ' +
            'effects of a tongues spell. Omen. When you make an ability check, attack roll, or saving throw, you ' +
            'can choose to do so at 4 advantage. You can choose to use this effect after you roll, but before the ' +
            'outcome is determined. You can only use this effect once. Might. When you deal damage with a weapon ' +
            'attack or a cleric spell of 1st level or higher, the weapon or spell deals an extra 1d6 damage to ' +
            'one target of the attack or spell. Protection. A creature within 5 feet of you takes 1d6 6 psychic ' +
            'damage whenever it hits you with a melee attack.\n\nOnce you perform this rite, you can\'t do so again ' +
            'until you finish a long rest.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Chosen of the Old Gods',
          desc:
            'By 17th level, when you use your Ancient Rite feature, you roll twice on the table. If the results ' +
            'of both rolls are the same, you can choose the second effect or reroll the second die. In addition, ' +
            'when you use your Unearthly Conduit feature to maintain concentration on a spell, until the spell ' +
            'ends, you gain truesight out to a range of 60 feet, and creatures of your choice hear everything you ' +
            'say as garbled speech and eerie gibberish, such as the speaking backwards, sounds of aberrations, or ' +
            'the sounds of insects and deep sea creatures.',
        },
      ],
      spells: [
        { level: 1, names: ['Bane', 'Otherworldly Perception'] },
        { level: 3, names: ['Enthrall', 'Suggestion'] },
        { level: 5, names: ['Bestow Curse', 'Fear'] },
        { level: 7, names: ['Black Tentacles', 'Phantasmal Killer'] },
        { level: 9, names: ['Contact Other Plane', 'Dominate Person'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Otherworldly Perception.',
      ],
    },
    'Foul Domain': {
      blurb: 'Gods that preside over foul spheres include within their dominions that which is often considered grotesque and unclean. Disease, malformations, pestilence,…',
      features: [
        {
          level: 1,
          name: 'Fetid Flesh',
          desc:
            'Starting at 1st level, you are immune to disease. However, your body shows signs of disease, albeit ' +
            'harmless to you. Additionally, your sickly skin has granted you minor magical powers. You learn the ' +
            'infestation and poison spray cantrips, and they don\'t count towards the total number of cantrips you ' +
            'know.',
        },
        {
          level: 1,
          name: 'Pied Piper',
          desc:
            'Also at 1st level, vermin treat you as kin. You gain the ability to comprehend and verbally ' +
            'communicate with vermin. Vermin can include but is not limited to: centipedes, cockroaches, ferrets, ' +
            'rats, rodents, and stoats. The awareness and knowledge of such vermin is generally limited by their ' +
            'own intelligence. The vermin\'s speech sounds grotesque and incomprehensible to any other creature ' +
            'that is either not a cleric of this domain or is not afflicted with a disease, is currently ' +
            'poisoned, or is a wererat. Additionally, you can consume rotten food and foul water without ' +
            'suffering any penalty.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Plaguebringer',
          desc:
            'At 2nd level, you can use an action to cause plague to infect a creature of your choice that you can ' +
            'see within 30 feet of you, using your Channel Divinity. The target must succeed on a Constitution ' +
            'saving throw against your cleric spell save DC. On a failed save, the target takes poison damage ' +
            'equal to 2d10 plus your cleric level, and for 1 minute, the target can take either an action or a ' +
            'bonus action on its turn, not both, and can\'t take reactions.',
        },
        {
          level: 6,
          name: 'Living Disease',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• You are always under the effects of a ' +
            'detect poison and disease spell.\n• You gain resistance to poison damage.\n• Other creatures have ' +
            'disadvantage on Constitution saving throws made against cleric spells you cast.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, once per turn, you can add your Wisdom modifier to the damage you deal with ' +
            'any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Rotwalker',
          desc:
            'By 17th level, foul magic follows your every fetid footstep. A creature that hits you with a melee ' +
            'attack while within 10 feet of you takes 2d10 acid or poison damage (your choice each time this ' +
            'effect triggers).',
        },
      ],
      spells: [
        { level: 1, names: ['Ray of Sickness', 'Viraal\'s Horrid Vessel'] },
        { level: 3, names: ['Guttertongue', 'Swarm Breath'] },
        { level: 5, names: ['Plaguefeather', 'Stinking Cloud'] },
        { level: 7, names: ['Blight', 'Sickening Radiance'] },
        { level: 9, names: ['Cloudkill', 'Insect Plague'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Guttertongue, Plaguefeather, Swarm Breath, Viraal\'s Horrid Vessel.',
      ],
    },
    'Fury Domain': {
      blurb: 'Gods of fury preside over the spheres of anger, desolation, fire, retribution, vengeance, and wrath. To these gods, there is no greater fury than that of the…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            'Beginning at 1st level, you gain proficiency with martial weapons and heavy armor.',
        },
        {
          level: 1,
          name: 'Quick Revenge',
          desc:
            'Also at 1st level, your fury is swift with retribution. When a creature hits you with a melee attack ' +
            'while within your weapon\'s reach, you can use your reaction to make one melee weapon attack with ' +
            'advantage against the target. If you reduce the attacker to 0 hit points with this attack, you only ' +
            'take half of the damage dealt to you by the attacker. You can use this feature a number of times ' +
            'equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a ' +
            'long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Onslaught',
          desc:
            'At 2nd level, when you hit a creature with a melee attack, you can make one additional melee attack ' +
            'against the same target, using your Channel Divinity (no action required). If this second attack is ' +
            'a critical hit, you can then make one more melee attack against the same target as part of the same ' +
            'action.',
        },
        {
          level: 6,
          name: 'Wrathmonger',
          desc:
            'At 6th level, you gain the following benefits:\n\n• You have advantage on saving throws against being ' +
            'frightened.\n• When you roll initiative and have no more uses of your Quick Revenge feature left, you ' +
            'regain one use.\n• Your furious retribution knows no bounds. In combat, you get a special reaction ' +
            'that you can take once on every creature\'s turn, except your turn. You can use this special reaction ' +
            'only to use your Quick Revenge feature.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with burning power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 fire damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with burning power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 fire damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Saint Anger',
          desc:
            'By 17th level, anger is always with you, as if hanging from your neck. You have advantage on all ' +
            'melee attack rolls.',
        },
      ],
      spells: [
        { level: 1, names: ['Inflict Wounds', 'Wrathful Smite'] },
        { level: 3, names: ['Crown of Madness', 'Scorching Ray'] },
        { level: 5, names: ['Haste', 'Enemies Abound'] },
        { level: 7, names: ['Compulsion', 'Wall of Fire Destructive Wave'] },
        { level: 9, names: ['Destructive Wave', 'Steel Wind Strike'] },
      ],
    },
    'Grim Domain': {
      blurb: 'Gods of this domain preside over the grim realities of the world: bloodshed, cruelty, death, dread, famine, ferocity, martyrdom, and sacrifice. Though many of…',
      features: [
        {
          level: 1,
          name: 'Dour Blessings',
          desc:
            'At 1st level, you gain proficiency with martial weapons. You also become proficient in your choice ' +
            'of one of the following skills: Insight, Intimidation, or Survival.',
        },
        {
          level: 1,
          name: 'Grim Determination',
          desc:
            'Also at 1st level, whenever you make an ability check, attack roll, or saving throw, you can choose ' +
            'to roll a d6 and add the result to the d20 roll. You can choose to use this feature after you roll ' +
            'the d20, but before the result is announced. If the roll had disadvantage, or if you made the roll ' +
            'while at or below half your hit point maximum, you can use this feature after the result is ' +
            'announced. You can use this feature a number of times equal to your Wisdom modifier (a minimum of ' +
            'once). You regain all expended uses when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Foul Foretelling',
          desc:
            'At 2nd level, you can use your Channel Divinity to bring about grim portents. As an action, you can ' +
            'present your holy symbol, and utter a creature\'s name. If the named creature is within 30 feet of ' +
            'you, you can curse it for 1 minute. At any time while it is cursed, you can replace any attack roll, ' +
            'ability check, or saving throw the creature makes with a 1. You must choose to do so before the ' +
            'roll. The curse then ends.',
        },
        {
          level: 6,
          name: 'Back Against the Wall',
          desc:
            'By 6th level, you can muster your will to press on during trying times. You gain the following ' +
            'benefits:\n\n• While you are frightened, you can willingly move closer to the source of your fear.\n• ' +
            'While you are at or below half your hit point maximum and you use your action to cast a spell, you ' +
            'can make one weapon attack as a bonus action.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with darker power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 necrotic damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with darker power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 necrotic damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Vicious Cycle',
          desc:
            'By 17th level, when a creature within 30 feet of you that you can see misses an attack, or fails an ' +
            'ability check or saving throw, you can use your reaction to curse it until the end of its next turn. ' +
            'The next time the cursed creature makes an attack roll, ability check, or saving throw, it does so ' +
            'with disadvantage, and the curse ends.\n\n.',
        },
      ],
      spells: [
        { level: 1, names: ['Bane', 'Omen'] },
        { level: 3, names: ['Gentle Repose', 'Grim Hunter'] },
        { level: 5, names: ['Bestow Curse', 'Fear'] },
        { level: 7, names: ['Blight', 'Death Ward'] },
        { level: 9, names: ['Antilife Shell', 'Hold Monster'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Grim Hunter, Omen.',
      ],
    },
    'Heavens Domain': {
      blurb: 'Gods of the heavens preside over celestial bodies, stars, the skies, and the infinite expanse of space and time. To these deities, the cosmos and all within it…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            'At 1st level, you gain proficiency with navigator\'s tools, and you can speak, read, and write Celestial.',
        },
        {
          level: 1,
          name: 'Chart The Heavens',
          desc:
            'Also at 1st level, over the course of 10 minutes, you can chart the stars to gain power. When you do ' +
            'so, roll a d6, the result of which determines which class this feature references. Choose one spell ' +
            'from the class you rolled. The spell you choose must be of a level you can cast, as shown on the ' +
            'Cleric table, and is considered a cleric spell for you until you finish a long rest. The chosen ' +
            'spell doesn\'t count toward the total number of cleric spells that you can prepare, and is considered ' +
            'prepared for you. d6 Class 1 Bard 2 Cleric 3 Druid 4 Sorcerer 5 Warlock 6 Wizard',
        },
        {
          level: 2,
          name: 'Channel Divinity: Brilliance',
          desc:
            'At 2nd level, as a bonus action, you can surround yourself with starlight, using your Channel ' +
            'Divinity. Creatures of your choice that are within 20 feet of you that can see you must make a ' +
            'Constitution saving throw against your cleric spell save DC. On a failed save, a creature takes 2d10 ' +
            '+ your cleric level in radiant damage and is blinded until the start of your next turn.',
        },
        {
          level: 6,
          name: 'Cosmic Blessings',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• While you have an unobstructed view of ' +
            'the sky, you are considered to be under the effects of a find the path spell.\n• When you deal damage ' +
            'with a spell, you can choose to deal cold, fire, or radiant damage instead of the normal damage. If ' +
            'the spell would deal more than one damage type, you can change each damage type to the same type.\n• ' +
            'When you use your Chart The Heavens feature, you can roll twice, instead of once, gaining both ' +
            'spells.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Heavenly Body',
          desc:
            'Starting at 17th level, your body is one with the stars. You gain immunity to cold, fire, and radiant damage.',
        },
      ],
      spells: [
        { level: 1, names: ['Faerie Fire', 'Guiding Bolt'] },
        { level: 3, names: ['Flaming Sphere', 'Moonbeam'] },
        { level: 5, names: ['Daylight', 'Fly'] },
        { level: 7, names: ['Dimension Door', 'Fire Shield'] },
        { level: 9, names: ['Cone of Cold', 'Flame Strike'] },
      ],
    },
    'Hex Domain': {
      blurb: 'Gods who preside over curses are often gods of envy, malice, or revenge, though any god can call upon the power of curses should it benefit them. Gods can have…',
      features: [
        {
          level: 1,
          name: 'Curse Sight',
          desc:
            'Starting at 1st level, as an action, you can rely on your familiarity with curses to detect the ' +
            'presence of malisons, hexes, and other maledictions. Until the end of your next turn, you know the ' +
            'location of any cursed creature or object within 30 feet of you. You know that the creature or ' +
            'object whose presence you sense is cursed, but not its specific effects or properties. However, you ' +
            'have advantage on any Intelligence check pertaining to the nature, origin, and effects of any curse ' +
            'whose presence you detect in this way. You can use this feature a number of times equal to your ' +
            'Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest.',
        },
        {
          level: 1,
          name: 'Hex Maker',
          desc:
            'Also at 1st level, you have learned how to weave maledictions into your own spells. When you finish ' +
            'a long rest, choose a number of spells that you have prepared equal to your proficiency bonus. The ' +
            'spells you choose must have durations greater than instantaneous (such as 1 round or 1 minute). A ' +
            'target affected by these spells is considered cursed for the duration or until the spell ends. ' +
            'Additionally, while a target is cursed by a spell that you cast, the target has disadvantage on ' +
            'saving throws it makes to end the spell\'s effects, and you immediately learn of one desire, fear, or ' +
            'hope that the target has (if any). Finally, weaving accursed energy into the chosen spells can ' +
            'influence how you cast them. For example, you might say their vocal components backwards, add a new ' +
            'material component (such as an eye or a piece of rotten food), or you might light a black candle or ' +
            'burn a lock of a creature\'s hair.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Curse Be Upon Ye',
          desc:
            'At 2nd level, when a creature that you can see becomes affected by an effect that has a duration ' +
            'that is greater than instantaneous (such as a spell or a class feature), you can use your reaction ' +
            'to infuse the effects with hexing powers, using your Channel Divinity. The target then becomes ' +
            'cursed for the duration of the effect, and is considered to be under the effects of your Hex Maker ' +
            'feature.',
        },
        {
          level: 6,
          name: 'Accursed One',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• You can end your attunement to a cursed ' +
            'item voluntarily without having the curse broken first.\n• When you detect the presence of a cursed ' +
            'creature or object using your Curse Sight feature, you can immediately identify one effect or ' +
            'property of the curse.\n• You can use this benefit only once per creature or object whose presence ' +
            'you detect.\n• When you cast a spell that would curse a target or force a target to make either an ' +
            'Intelligence, Wisdom, or Charisma saving throw, you can have it target one additional creature of ' +
            'your choice.\n• You have advantage on saving throws you make against being cursed.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Grand Hexer',
          desc:
            'By 17th level, your curses know no bounds. When you cast a spell that would curse a target, the ' +
            'range is tripled. If you possess a piece of the target\'s body (such as a fingernail, a lock of hair, ' +
            'or a few drops of its blood), you can target that creature with the spell from anywhere, provided ' +
            'that the target is alive and you are both on the same plane of existence.',
        },
      ],
      spells: [
        { level: 1, names: ['Hex', 'Omen'] },
        { level: 3, names: ['Blindness/deafness', 'Crown of Madness'] },
        { level: 5, names: ['Bestow Curse', 'Remove Curse'] },
        { level: 7, names: ['Compulsion', 'Dominate Beast'] },
        { level: 9, names: ['Dominate Person', 'Geas'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Omen.',
      ],
    },
    'Martyrdom Domain': {
      blurb: 'To die in the name of faith or a god is considered by many to be one of the highest signs of devotion and a testament to how far some are willing to go for…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiency',
          desc:
            'At 1st level, you gain proficiency with martial weapons.',
        },
        {
          level: 1,
          name: 'Blood Of The Devout',
          desc:
            'Also at 1st level, you can even sacrifice your own blood for your faith. As a bonus action, you can ' +
            'roll a d6. Your current hit points are reduced by an amount equal to the result, and until the end ' +
            'of your next turn, all melee attacks you make deal extra radiant damage equal to the result. You can ' +
            'use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all ' +
            'expended uses when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Martyr\'s Price',
          desc:
            'At 2nd level, when one friendly creature within 30 feet of you is reduced to 0 hit points or is ' +
            'killed outright, you can use your reaction to take its death upon yourself, using your Channel ' +
            'Divinity. That creature instead drops to 1 hit point and is not killed outright, and it has ' +
            'advantage on attack rolls and saving throws until the end of its next turn. You then immediately ' +
            'drop to 0 hit points.',
        },
        {
          level: 6,
          name: 'Faithful\'s Rewards',
          desc:
            'At 6th level, you gain the following benefits:\n\n• When you use your Blood Of The Devout feature, you ' +
            'can choose to roll 2d6, instead of a d6.\n• When you roll initiative and have no more uses of your ' +
            'Blood Of The Devout feature left, you regain one use.\n• When you use your Channel Divinity: Martyr\'s ' +
            'Price feature, you can affect a number of friendly creatures equal to your Wisdom modifier (minimum ' +
            'of 1).',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with divine power. Once on each of ' +
            'your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra ' +
            '1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'True Martyrdom',
          desc:
            'By 17th level, when you use your Channel Divinity: Martyr\'s Price feature, you can choose to instead ' +
            'make it the ultimate sacrifice. When you do so, creatures of your choice drop to a number of hit ' +
            'points equal to your hit point maximum. You then immediately die, and you return to life 1d6 weeks ' +
            'later. If your body is destroyed, you reform within 1 mile of the place of your death at a spot ' +
            'determined by the GM. If your equipment was also destroyed, you don\'t regain it.',
        },
      ],
      spells: [
        { level: 1, names: ['Divine Favor', 'Heroism'] },
        { level: 3, names: ['Prayer of Healing', 'Warding Bond'] },
        { level: 5, names: ['Crusader\'s Mantle', 'Speak with Dead'] },
        { level: 7, names: ['Divination', 'Guardian of Faith'] },
        { level: 9, names: ['Circle of Power', 'Hallow'] },
      ],
    },
    'Pain Domain': {
      blurb: 'To understand pain is to know it in all of its forms, such as cruelty, loss, penance, redemption, regret, sorrow, and war. The gods of pain teach that pain and…',
      features: [
        {
          level: 1,
          name: 'Adept of Pain',
          desc:
            'Beginning at 1st level, you gain proficiency with martial weapons and while you are wearing no armor ' +
            'and not wielding a shield, your AC equals 10 + your Constitution modifier + your Wisdom modifier.',
        },
        {
          level: 1,
          name: 'Suffering',
          desc:
            'At 1st level, you can alter the effects of pain. You have a pool of d6\'s that you spend to alter ' +
            'pain. The number of dice in the pool equals 2 + your cleric level, and are called your suffering ' +
            'dice. When you take damage, or when you deal damage with a weapon attack, you can spend dice from ' +
            'this pool to increase or decrease the damage dealt. The maximum number of dice you can spend at once ' +
            'equals your Wisdom modifier (minimum of one die). Roll the dice you spend and add them together; the ' +
            'damage roll has a penalty or bonus equal to the total (your choice each time you use this feature). ' +
            'Your pool regains all expended dice when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Self Sacrifice',
          desc:
            'Starting at 2nd level, you can use your Channel Divinity to take on the pain meant for others. When ' +
            'a creature within 30 feet of you takes damage, you can use your reaction to magically take that ' +
            'damage instead; this damage can\'t be reduced in any way. This feature also transfers any other ' +
            'effects that might accompany the damage, treating you as if you were the original target of the ' +
            'attack or effect. If the damage you take from using this feature would reduce you to 0 hit points, ' +
            'you are instead reduced to a number of hit points equal to your cleric level.',
        },
        {
          level: 6,
          name: 'Tribulation',
          desc:
            'At 6th level, when a creature within 30 feet of you takes damage or deals damage with a weapon ' +
            'attack, you can use your reaction to spend suffering dice to affect the roll as if you were the ' +
            'target or dealing the damage. Additionally, when you roll initiative and have no suffering dice ' +
            'remaining, you gain 1 suffering die.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with the power to draw forth more ' +
            'blood. Once on each of your turns when you hit a creature with a weapon attack, you can cause the ' +
            'attack to deal an extra 1d8 necrotic damage to the target. When you reach 14th level, the extra ' +
            'damage increases to 2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with the power to draw forth more ' +
            'blood. Once on each of your turns when you hit a creature with a weapon attack, you can cause the ' +
            'attack to deal an extra 1d8 necrotic damage to the target. When you reach 14th level, the extra ' +
            'damage increases to 2d8.',
        },
        {
          level: 17,
          name: 'Revel in Agony',
          desc:
            'Beginning at 17th level, you gain the following benefits:\n\n• While you are concentrating on a spell, ' +
            'your concentration can\'t be broken as a result of taking damage.\n• You don\'t fall unconscious as a ' +
            'result of having 0 hit points. You still must make death saving throws, and you suffer the normal ' +
            'effects of taking damage while at 0 hit points.\n• When you use your Suffering feature, you can ' +
            'choose to expend a number of suffering dice up to the number remaining in your pool. Once you expend ' +
            'dice this way, you can\'t do so again until you finish a long rest.',
        },
      ],
      spells: [
        { level: 1, names: ['Cure Wounds', 'Inflict Wounds'] },
        { level: 3, names: ['Suffering Lash', 'Warding Bond'] },
        { level: 5, names: ['Feign Death', 'Ring of Pain'] },
        { level: 7, names: ['Blight', 'Resilient Sphere'] },
        { level: 9, names: ['Hold Monster', 'Mass Cure Wounds'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Ring of Pain, Suffering Lash.',
      ],
    },
    'Ruin Domain': {
      blurb: 'Gods of ruin preside over calamities, decay, desolation, and destruction. They include gods of entropy, abandoned structures, madness, and plagues. Clerics of…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            'Beginning at 1st level, you gain proficiency with martial weapons and heavy armor.',
        },
        {
          level: 1,
          name: 'Lay Waste',
          desc:
            'Starting at 1st level, destructive power fuels your might and magic. Your attacks and spells deal ' +
            'double damage to objects and structures.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Aura of Ruin',
          desc:
            'At 2nd level, as an action, you can use your Channel Divinity to conjure an aura of devastating ' +
            'energy around you. The aura extends 10 feet from you in every direction, but not through total ' +
            'cover. For 1 minute, all nonmagical objects of your choice that are not worn or carried within the ' +
            'aura deteriorate: metal rusts, crops wither, cloth becomes threadbare, and wood rots. Additionally, ' +
            'when a creature enters the area for the first time on a turn or starts its turn there, it must make ' +
            'a Constitution saving throw. Constructs and plants have disadvantage on this saving throw. On a ' +
            'failed save, the creature takes necrotic damage equal to your Wisdom modifier.',
        },
        {
          level: 6,
          name: 'Ruinous Adept',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• Moving through nonmagical difficult ' +
            'terrain costs you no extra movement.\n• As a bonus action when you deal a normal hit, or as a ' +
            'reaction when a creature you can see within 30 feet of you deals a normal hit, you can turn that hit ' +
            'into a critical hit.\n• This effect triggers any effects that would activate on a critical hit. Once ' +
            'you use this feature, you can\'t use it again until you finish a long rest.\n\n.',
        },
        {
          level: 8,
          name: 'Divine Strike (1d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with ruinous energy. Once on each ' +
            'of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an ' +
            'extra 1d8 necrotic damage to the target. When you reach 14th level, the extra damage increases to ' +
            '2d8.',
        },
        {
          level: 14,
          name: 'Divine Strike (2d8)',
          desc:
            'At 8th level, you gain the ability to infuse your weapon strikes with ruinous energy. Once on each ' +
            'of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an ' +
            'extra 1d8 necrotic damage to the target. When you reach 14th level, the extra damage increases to ' +
            '2d8.',
        },
        {
          level: 17,
          name: 'Improved Aura of Ruin',
          desc:
            'Beginning at 17th level, the range of your Aura of Ruin increases to 30 feet, and creatures of your ' +
            'choice can\'t regain hit points while within the aura.',
        },
      ],
      spells: [
        { level: 1, names: ['Bane', 'Inflict Wounds'] },
        { level: 3, names: ['Ray of Enfeeblement', 'Shatter'] },
        { level: 5, names: ['Glyph of Warding', 'Lightning Bolt'] },
        { level: 7, names: ['Blight', 'Confusion'] },
        { level: 9, names: ['Flame Strike', 'Insect Plague'] },
      ],
    },
    'Secrets Domain': {
      blurb: 'Gods of secrets preside over hidden knowledge, gossip, mystery, and that which is forgotten, unseen, and unheard. They can also be gods of darkness, deception,…',
      features: [
        {
          level: 1,
          name: 'Bonus Proficiencies',
          desc:
            'At 1st level, you become proficient in your choice of two of the following skills: Deception, ' +
            'History, Insight, or Investigation.',
        },
        {
          level: 1,
          name: 'Secretsense',
          desc:
            'Even at 1st level, you can pick up on that which others have attempted to put beneath your notice. ' +
            'As an action, you instantaneously sense the presence of creatures hidden from you, any objects that ' +
            'are concealed (such as doors or traps), and secret codes or hidden messages within 30 feet of you, ' +
            'provided you aren\'t blinded or deafened. You know which of the three you detect, as well as if each ' +
            'is within 15 feet of you, but you don\'t gain any insight as to its direction from you. You can use ' +
            'this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain ' +
            'all\n\nexpended uses when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Uncover',
          desc:
            'At 2nd level, you can use your Channel Divinity as an action to uncover one\'s deepest secrets. One ' +
            'creature of your choice that you can see within 30 feet of you must make a Charisma saving throw. A ' +
            'creature immune to being charmed automatically succeeds on its save. On a failed save, you magically ' +
            'learn one fact or secret about the target, choosing one of the following:\n\n• Something that angers ' +
            'or frightens it.\n• You sense if the target is not in their original form or is using a spell or ' +
            'effect designed to deceive the senses.\n• The target\'s greatest desire.\n• The GM provides you with ' +
            'one secret about the target, or one that the target knows, related to a recent event that looms ' +
            'large in your mind.\n\nRegardless of whether it succeeds or fails, the creature is unaware of your ' +
            'attempt to unveil one of its secrets. Once you learn one of the creature\'s secrets, or if the ' +
            'creature succeeds in its initial saving throw against this effect, you can\'t use this feature on ' +
            'that creature again until you finish a long rest.',
        },
        {
          level: 6,
          name: 'Clandestine',
          desc:
            'By 6th level, you leave no tracks to indicate where you have been or where you\'re headed. Also, even ' +
            'your magic can be done in secret. When you cast a spell, you can use your bonus action to attempt to ' +
            'pass the casting off unnoticed. Make a Dexterity (Stealth) check opposed by the passive Wisdom ' +
            '(Perception) score of each creature that can see or hear you. A creature can use its reaction to ' +
            'instead oppose your check with its own Wisdom (Perception) check. Each creature you succeed against ' +
            'doesn\'t notice you performing the spell\'s components. If you are hidden from a creature and succeed ' +
            'against it, you remain hidden from it after casting the spell.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Sub Rosa',
          desc:
            'By 17th level, you gain truesight out to a range of 30 feet, and your thoughts can\'t be read by ' +
            'telepathy, unless you allow it. You also can\'t be targeted by divination magic, perceived through ' +
            'magical scrying sensors, or detected by abilities that can sense creatures. In addition, no matter ' +
            'what you say, magic or other effects that would determine if you are telling the truth indicate that ' +
            'you are being truthful if you so choose, and you can\'t be compelled to tell the truth by magic.',
        },
      ],
      spells: [
        { level: 1, names: ['Disguise Self', 'Illusory Script'] },
        { level: 3, names: ['Arcanist\'s Magic Aura', 'Invisibility'] },
        { level: 5, names: ['Nondetection', 'Tongues'] },
        { level: 7, names: ['Greater Invisibility', 'Secret Chest'] },
        { level: 9, names: ['Modify Memory', 'Seeming'] },
      ],
    },
    'Spirits Domain': {
      blurb: 'Many gods oversee the transition that a soul takes from the land of the living to the realms of the dead. Gods of this domain protect these spirits, and in…',
      features: [
        {
          level: 1,
          name: 'Grave Warnings',
          desc:
            'Starting at 1st level, the spirits of the dead whisper warnings to protect you. While you are not ' +
            'wearing any armor, your AC equals 10 + your Dexterity modifier + your Wisdom modifier. You can use a ' +
            'shield and still gain this benefit.',
        },
        {
          level: 1,
          name: 'Spirit Caller',
          desc:
            'Starting at 1st level, you have a pool of d6\'s that you spend to aid you, each d6 representing a ' +
            'spirit assisting in your actions. The number of dice in the pool equals 2 + your cleric level, and ' +
            'are called your spirit dice. You can spend spirit dice in the following ways:\n\n• When you deal ' +
            'damage to a target with a spell, you can spend dice from this pool to increase the damage dealt.\n• ' +
            'As a bonus action, you can spend dice from this pool to gain temporary hit points.\n\nThe maximum ' +
            'number of dice you can spend at once equals your Wisdom modifier (minimum of one die). Roll the dice ' +
            'you spend and add them together; you deal additional damage or gain temporary hit points equal to ' +
            'the total. Your pool regains all expended dice when you finish a long rest.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Beckon Soul',
          desc:
            'Beginning at 2nd level, you can call forth the spirits of the dead to aid you, using your Channel ' +
            'Divinity. As an action, you can target a beast, humanoid, or monstrosity within 30 feet of you that ' +
            'has been dead for no longer than 1 minute. The target\'s spirit rises in the space of its corpse or ' +
            'in the nearest unoccupied space. The spirit assumes the statistics of a specter (PHB, 346), though ' +
            'it aesthetically resembles a ghostly version of its form when it was living. The spirit is under ' +
            'your control, and it vanishes after it is reduced to 0 hit points or 1 minute, whichever is shorter.',
        },
        {
          level: 6,
          name: 'Augur\'s Gifts',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• You have advantage on saving throws you ' +
            'make against spells or other effects that would cause you to become possessed or remove your soul ' +
            'against your will.\n• When you roll initiative and have no spirit dice remaining, you gain 1 spirit ' +
            'die.\n• When you use your Channel Divinity: Beckon Soul or cast a spell that allows you to summon one ' +
            'creature, spirit, or force (such as by way of a find familiar or unseen servant spell), you can ' +
            'summon one additional creature, spirit, or force.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Holy Medium',
          desc:
            '• By 17th level, you have become one with the spirit realm. You are always under the effects of both ' +
            'a protection from evil and good spell and a see invisibility spell.\n• Additionally, you ' +
            'automatically learn whether or not a creature within 30 feet of you is currently possessed.',
        },
      ],
      spells: [
        { level: 1, names: ['Find Familiar', 'Unseen Servant'] },
        { level: 3, names: ['Coterie of Souls', 'Find Steed'] },
        { level: 5, names: ['Speak with Dead', 'Spirit Guardians'] },
        { level: 7, names: ['Banishment', 'Faithful Hound'] },
        { level: 9, names: ['Contact Other Plane', 'Planar Binding'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Coterie of Souls.',
      ],
    },
    'Time Domain': {
      blurb: 'Gods who claim time as one of their many domains are also gods of history, magic, and divining the future. They watch over the flow of time, and might even…',
      features: [
        {
          level: 1,
          name: 'Temporal Awareness',
          desc:
            'Beginning when you choose this domain at 1st level, you start to perceive time differently, allowing ' +
            'you to more adeptly evade harm. While you are not wearing any armor, your AC equals 10 + your ' +
            'Dexterity modifier + your Wisdom modifier. You can use a shield and still gain this benefit.',
        },
        {
          level: 1,
          name: 'Time Keeper',
          desc:
            'Also at 1st level, you gain a bonus to initiative rolls equal to your Wisdom modifier (minimum of ' +
            '1). Additionally, you can more easily weave time in your favor. You learn the guidance cantrip, and ' +
            'it doesn\'t count toward the total number of cantrips you know. When you cast guidance and target ' +
            'yourself, you can cast the spell as a bonus action, instead of as an action.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Borrow Time',
          desc:
            'At 2nd level, as a bonus action, you can use your Channel Divinity to gain more time for yourself. ' +
            'You can take one additional turn immediately following your current turn.',
        },
        {
          level: 6,
          name: 'Like Clockwork',
          desc:
            'Starting at 6th level, you gain the following benefits:\n\n• You can\'t be surprised.\n• You can now ' +
            'take two reactions, instead of one, before the start of your next turn.\n• When you use your Channel ' +
            'Divinity: Borrow Time, you can take two additional turns, instead of one.',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Time Is On My Side',
          desc:
            'At 17th level, you can cast the foresight and time stop spells without expending a spell slot. Once ' +
            'you cast one of these spells in this way, you can\'t cast either spell in this way again until you ' +
            'finish a long rest.',
        },
      ],
      spells: [
        { level: 1, names: ['Feather Fall', 'Longstrider'] },
        { level: 3, names: ['Blur', 'Misty Step'] },
        { level: 5, names: ['Haste', 'Slow'] },
        { level: 7, names: ['Dimension Door', 'Divination'] },
        { level: 9, names: ['Hold Monster', 'Legend Lore'] },
      ],
    },
    'Wealth Domain': {
      blurb: 'Gods of wealth preside over abundance, acquisition, gold, greed, success, and prosperity. Some of these gods focus on communal virtues such as charity and…',
      features: [
        {
          level: 1,
          name: 'Appraise',
          desc:
            'Also at 1st level, you can accurately ascertain a target\'s value. As an action, you can designate a ' +
            'person, a place, such as a farmstead, shop, or manufacturing center, or a nonmagical item that you ' +
            'can see as your appraisal for 10 minutes. You gain the following benefits for the duration:\n\n• You ' +
            'add your Wisdom modifier to Intelligence or Charisma checks made to assess or influence the target ' +
            '(GM\'s discretion).\n• You know the target\'s value, such as its market cost, lifestyle, or average ' +
            'daily production, and you know if that value changes.\n• Your appraisal can\'t be hidden from you, ' +
            'except by magical means.\n• If the target is an item, you are proficient with any artisan\'s tools ' +
            'used to create or modify the item for the purposes of appraising the item.\n\nOnce you have appraised ' +
            'a person, place, or item with this feature, you can\'t appraise that same target until you complete a ' +
            'long rest.',
        },
        {
          level: 1,
          name: 'Spending Money',
          desc:
            'Also at 1st level, when you gain a level in this class, you immediately gain a number of gold pieces ' +
            'equal to 100 times your cleric level. The amount of gold pieces you acquire in this way increases as ' +
            'you gain higher levels in this class; 200 times your cleric level at 5th level, 500 times your ' +
            'cleric level at 11th level, and 1000 times your cleric level at 17th level.',
        },
        {
          level: 2,
          name: 'Channel Divinity: Treasury',
          desc:
            'Starting at 2nd level, you can use your Channel Divinity to access a pocket dimension wherein you ' +
            'can store wealth. As an action, you can manifest a magical treasury that takes the form of a chest, ' +
            'container, door, safe, satchel, vault, or any other object made for the primary purpose of storage, ' +
            'or temporarily transform an existing mundane object for storage into a magical one, such as the ' +
            'pouch on a satchel you are wearing or a pocket in your trousers or waistcoat. Whichever option you ' +
            'choose, the object can have a mouth no larger than 5 feet in diameter and the conjuring or ' +
            'transformation lasts for up to 1 minute or until you dismiss it (no action required). The treasury ' +
            'can hold any weight of objects that fit into it and its volume in cubic feet is equal to 5 x your ' +
            'cleric level. Any creature besides you that opens the compartment will find only an empty space, ' +
            'unless you explicitly allow them to access the contents of the pocket dimension itself.',
        },
        {
          level: 6,
          name: 'Investment Capital',
          desc:
            'At 6th level, you gain the following benefits:\n\n• When you cast a cleric spell of 6th level or ' +
            'lower, you regain an expended spell slot of your choice that is of a level that is lower than the ' +
            'expended spell slot. Once you have used this feature, you can\'t do so again until you finish a long ' +
            'rest.\n• When you cast a spell with a costly material component, you immediately get 50% back in gold ' +
            'pieces.\n• When you spend wealth (such as copper or gold pieces), you regain a quarter of the amount ' +
            'you spent at the end of the week (resetting at the start of the week).',
        },
        {
          level: 8,
          name: 'Potent Spellcasting',
          desc:
            'Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip.',
        },
        {
          level: 17,
          name: 'Pay Day',
          desc:
            'At 17th level, whenever you receive wealth as a result of selling or having it gifted to you, the ' +
            'amount you receive is doubled, and it only costs you half as much wealth to maintain your current ' +
            'lifestyle.',
        },
      ],
      spells: [
        { level: 1, names: ['Alarm', 'Identify'] },
        { level: 3, names: ['Arcane Lock', 'Locate Object'] },
        { level: 5, names: ['Create Food and Water', 'Storefront'] },
        { level: 7, names: ['Fabricate', 'Secret Chest'] },
        { level: 9, names: ['Greater Restoration', 'Legend Lore'] },
      ],
      notes: [
        'New in Divergent Domains, so not in the SRD spell library: Storefront.',
      ],
    },
  },

  Druid: {
    'Circle of Stars': {
      blurb: 'Harness secrets hidden in constellations — a star map, and a body lit like one.',
      features: [
        {
          level: 3,
          name: 'Star Map',
          desc:
            "You've created a star chart as part of your heavenly studies. It is a Tiny object, and you can use it as a Spellcasting Focus for your Druid spells. You determine its form by rolling on the Star Map table or by choosing one.\n\n" +
            'While holding the map, you have the Guidance and Guiding Bolt spells prepared, and you can cast Guiding Bolt without expending a spell slot. You can cast it in that way a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\n\n' +
            'If you lose the map, you can perform a 1-hour ceremony to magically create a replacement. This ceremony can be performed during a Short or Long Rest, and it destroys the previous map.\n\n' +
            'Star Map (1d6)\n' +
            '1. A scroll bearing depictions of constellations\n' +
            '2. A stone tablet with fine holes drilled through it\n' +
            '3. An owlbear hide tooled with stellar symbols\n' +
            '4. A collection of maps bound in an ebony cover\n' +
            '5. A crystal engraved with starry patterns\n' +
            '6. A glass disk etched with constellations',
        },
        {
          level: 3,
          name: 'Starry Form',
          desc:
            'As a Bonus Action, you can expend a use of your Wild Shape feature to take on a starry form rather than shape-shifting.\n\n' +
            'While in your starry form, you retain your game statistics, but your body becomes luminous, your joints glimmer like stars, and glowing lines connect them as on a star chart. This form sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. The form lasts for 10 minutes. It ends early if you dismiss it (no action required), have the Incapacitated condition, or use this feature again.\n\n' +
            'Whenever you assume your starry form, choose which of the following constellations glimmers on your body; your choice gives you certain benefits while in the form.\n\n' +
            'Archer. When you activate this form and as a Bonus Action on your subsequent turns while it lasts, you can make a ranged spell attack, hurling a luminous arrow that targets one creature within 60 feet of yourself. On a hit, the attack deals Radiant damage equal to 1d8 plus your Wisdom modifier.\n\n' +
            'Chalice. Whenever you cast a spell using a spell slot that restores Hit Points to a creature, you or another creature within 30 feet of you can regain Hit Points equal to 1d8 plus your Wisdom modifier.\n\n' +
            'Dragon. When you make an Intelligence or a Wisdom check or a Constitution saving throw to maintain Concentration, you can treat a roll of 9 or lower on the d20 as a 10.',
        },
        {
          level: 6,
          name: 'Cosmic Omen',
          desc:
            'Whenever you finish a Long Rest, you can consult your Star Map for omens and roll a die. Until you finish your next Long Rest, you gain access to a special Reaction based on whether you rolled an even or an odd number on the die:\n\n' +
            'Weal (Even). Whenever a creature you can see within 30 feet of you is about to make a D20 Test, you can take a Reaction to roll 1d6 and add the number rolled to the total.\n\n' +
            'Woe (Odd). Whenever a creature you can see within 30 feet of you is about to make a D20 Test, you can take a Reaction to roll 1d6 and subtract the number rolled from the total.\n\n' +
            'You can use this Reaction a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.',
        },
        {
          level: 10,
          name: 'Twinkling Constellations',
          desc:
            'The constellations of your Starry Form improve. The 1d8 of the Archer and the Chalice becomes 2d8, and while the Dragon is active, you have a Fly Speed of 20 feet and can hover.\n\n' +
            'Moreover, at the start of each of your turns while in your Starry Form, you can change which constellation glimmers on your body.',
        },
        {
          level: 14,
          name: 'Full of Stars',
          desc:
            'While in your Starry Form, you become partially incorporeal, giving you Resistance to Bludgeoning, Piercing, and Slashing damage.',
        },
      ],
      spells: [
        { level: 3, names: ['Guidance', 'Guiding Bolt'] },
      ],
      notes: [
        'Guidance and Guiding Bolt are prepared only while you hold your Star Map.',
        'Starry Form spends a Wild Shape use without transforming, so this circle needs no curated forms.',
        "The form's light (10 ft bright / 10 ft dim) can be set on your token from the light-source button so the map shows it.",
      ],
    },

    'Circle of the Land': {
      blurb: 'Celebrate connection to the natural world — spells that change with the land you walk.',
      // Filter-only list: the union of all four land options, so the spell
      // picker can offer any of them. Deliberately NOT `spells`, which is the
      // always-prepared field — only one land's set is prepared at a time, and
      // which one changes every Long Rest, so auto-granting all four would be
      // wrong on the sheet.
      learnableSpells: [
        { level: 3, names: [
          'Blur', 'Burning Hands', 'Fire Bolt',            // arid
          'Fog Cloud', 'Hold Person', 'Ray of Frost',       // polar
          'Misty Step', 'Shocking Grasp', 'Sleep',          // temperate
          'Acid Splash', 'Ray of Sickness', 'Web',          // tropical
        ] },
        { level: 5, names: ['Fireball', 'Sleet Storm', 'Lightning Bolt', 'Stinking Cloud'] },
        { level: 7, names: ['Blight', 'Ice Storm', 'Freedom of Movement', 'Polymorph'] },
        { level: 9, names: ['Wall of Stone', 'Cone of Cold', 'Tree Stride', 'Insect Plague'] },
      ],
      features: [
        {
          level: 3,
          name: 'Circle of the Land Spells',
          desc:
            'Whenever you finish a Long Rest, choose one type of land: arid, polar, temperate, or tropical. You have the spells listed for your Druid level and lower prepared.\n\n' +
            'ARID — 3: Blur, Burning Hands, Fire Bolt | 5: Fireball | 7: Blight | 9: Wall of Stone\n\n' +
            'POLAR — 3: Fog Cloud, Hold Person, Ray of Frost | 5: Sleet Storm | 7: Ice Storm | 9: Cone of Cold\n\n' +
            'TEMPERATE — 3: Misty Step, Shocking Grasp, Sleep | 5: Lightning Bolt | 7: Freedom of Movement | 9: Tree Stride\n\n' +
            'TROPICAL — 3: Acid Splash, Ray of Sickness, Web | 5: Stinking Cloud | 7: Polymorph | 9: Insect Plague',
        },
        {
          level: 3,
          name: "Land's Aid",
          desc:
            'As a Magic action, you can expend a use of your Wild Shape and choose a point within 60 feet of yourself. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in the Sphere must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much damage on a successful one. One creature of your choice in that area regains 2d6 Hit Points.\n\n' +
            'The damage and healing increase by 1d6 when you reach Druid levels 10 (3d6) and 14 (4d6).',
        },
        {
          level: 6,
          name: 'Natural Recovery',
          desc:
            'You can cast one of the level 1+ spells that you have prepared from your Circle Spells feature without expending a spell slot, and you must finish a Long Rest before you do so again.\n\n' +
            'In addition, when you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your Druid level (round up), and none of them can be level 6+. For example, if you\'re a level 6 Druid, you can recover up to three levels\' worth of spell slots. Once you recover spell slots with this feature, you can\'t do so again until you finish a Long Rest.',
        },
        {
          level: 10,
          name: "Nature's Ward",
          desc:
            'You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature.\n\n' +
            'Arid — Fire | Polar — Cold | Temperate — Lightning | Tropical — Poison',
        },
        {
          level: 14,
          name: "Nature's Sanctuary",
          desc:
            'As a Magic action, you can expend a use of your Wild Shape and cause spectral trees and vines to appear in a 15-foot Cube on the ground within 120 feet of yourself. They last there for 1 minute or until you have the Incapacitated condition or die. You and your allies have Half Cover while in that area, and your allies gain the current Resistance of your Nature\'s Ward while there.\n\n' +
            'As a Bonus Action, you can move the Cube up to 60 feet to ground within 120 feet of yourself.',
        },
      ],
      notes: [
        'Prepared spells depend on the land you choose after each Long Rest, so no fixed always-prepared list is shown — see the tables in the level 3 feature.',
        "Land's Aid and Nature's Sanctuary spend Wild Shape uses without transforming, so this circle needs no curated forms.",
        "Nature's Sanctuary's 15-foot Cube isn't drawn automatically — a square template or terrain piece is the nearest tool.",
      ],
    },

    'Circle of the Moon': {
      blurb: 'Adopt animal forms to guard the wilds — lunar magic poured into Wild Shape.',
      features: [
        {
          level: 3,
          name: 'Circle Forms',
          desc:
            'You can channel lunar magic when you assume a Wild Shape form, granting you the benefits below.\n\n' +
            'Challenge Rating. The maximum Challenge Rating for the form equals your Druid level divided by 3 (round down).\n\n' +
            'Armor Class. Until you leave the form, your AC equals 13 plus your Wisdom modifier if that total is higher than the Beast\'s AC.\n\n' +
            'Temporary Hit Points. You gain a number of Temporary Hit Points equal to three times your Druid level.',
        },
        {
          level: 3,
          name: 'Circle of the Moon Spells',
          desc:
            'When you reach a Druid level specified in the Circle of the Moon Spells table, you thereafter always have the listed spells prepared.\n\n' +
            'In addition, you can cast the spells from this feature while you\'re in a Wild Shape form.\n\n' +
            'Level 3: Cure Wounds, Moonbeam, Starry Wisp\n' +
            'Level 5: Conjure Animals\n' +
            'Level 7: Fount of Moonlight\n' +
            'Level 9: Mass Cure Wounds',
        },
        {
          level: 6,
          name: 'Improved Circle Forms',
          desc:
            'While in a Wild Shape form, you gain the following benefits.\n\n' +
            'Lunar Radiance. Each of your attacks in a Wild Shape form can deal its normal damage type or Radiant damage. You make this choice each time you hit with those attacks.\n\n' +
            'Increased Toughness. You can add your Wisdom modifier to your Constitution saving throws.',
        },
        {
          level: 10,
          name: 'Moonlight Step',
          desc:
            'You magically transport yourself, reappearing amid a burst of moonlight. As a Bonus Action, you teleport up to 30 feet to an unoccupied space you can see, and you have Advantage on the next attack roll you make before the end of this turn.\n\n' +
            'You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest. You can also regain uses by expending a level 2+ spell slot for each use you want to restore (no action required).',
        },
        {
          level: 14,
          name: 'Lunar Form',
          desc:
            'The power of the moon suffuses you, granting you the following benefits.\n\n' +
            'Improved Lunar Radiance. Once per turn, you can deal an extra 2d10 Radiant damage to a target you hit with a Wild Shape form\'s attack.\n\n' +
            'Shared Moonlight. Whenever you use Moonlight Step, you can also teleport one willing creature. That creature must be within 10 feet of you, and you teleport it to an unoccupied space you can see within 10 feet of your destination space.',
        },
      ],
      spells: [
        { level: 3, names: ['Cure Wounds', 'Moonbeam', 'Starry Wisp'] },
        { level: 5, names: ['Conjure Animals'] },
        { level: 7, names: ['Fount of Moonlight'] },
        { level: 9, names: ['Mass Cure Wounds'] },
      ],
      notes: [
        'Wild Shape grants 3× your Druid level in temporary hit points — applied automatically when you shift.',
        'The Challenge Rating cap (Druid level ÷ 3) is shown against each form you curate; it is advisory, not enforced.',
        'Armour Class in form (13 + Wisdom modifier, if higher) is not tracked on tokens — apply it at the table.',
      ],
    },

    'Circle of the Sea': {
      blurb: 'Become one with tides and storms — ocean spray that answers to your wrath.',
      features: [
        {
          level: 3,
          name: 'Circle of the Sea Spells',
          desc:
            'When you reach a Druid level specified in the Circle of the Sea Spells table, you thereafter always have the listed spells prepared.\n\n' +
            'Level 3: Fog Cloud, Gust of Wind, Ray of Frost, Shatter, Thunderwave\n' +
            'Level 5: Lightning Bolt, Water Breathing\n' +
            'Level 7: Control Water, Ice Storm\n' +
            'Level 9: Conjure Elemental, Hold Monster',
        },
        {
          level: 3,
          name: 'Wrath of the Sea',
          desc:
            'As a Bonus Action, you can expend a use of your Wild Shape to manifest a 5-foot Emanation that takes the form of ocean spray that surrounds you for 10 minutes. It ends early if you dismiss it (no action required), manifest it again, or have the Incapacitated condition.\n\n' +
            'When you manifest the Emanation and as a Bonus Action on your subsequent turns, you can choose another creature you can see in the Emanation. The target must succeed on a Constitution saving throw against your spell save DC or take Cold damage and, if the creature is Large or smaller, be pushed up to 15 feet away from you. To determine this damage, roll a number of d6s equal to your Wisdom modifier (minimum of one die).',
        },
        {
          level: 6,
          name: 'Aquatic Affinity',
          desc:
            'The size of the Emanation created by your Wrath of the Sea increases to 10 feet.\n\n' +
            'In addition, you gain a Swim Speed equal to your Speed.',
        },
        {
          level: 10,
          name: 'Stormborn',
          desc:
            'Your Wrath of the Sea confers two more benefits while active, as detailed below.\n\n' +
            'Flight. You gain a Fly Speed equal to your Speed.\n\n' +
            'Resistance. You have Resistance to Cold, Lightning, and Thunder damage.',
        },
        {
          level: 14,
          name: 'Oceanic Gift',
          desc:
            'Instead of manifesting the Emanation of Wrath of the Sea around yourself, you can manifest it around one willing creature within 60 feet of yourself. That creature gains all the benefits of the Emanation and uses your spell save DC and Wisdom modifier for it.\n\n' +
            'In addition, you can manifest the Emanation around both the other creature and yourself if you expend two uses of your Wild Shape instead of one when manifesting it.',
        },
      ],
      spells: [
        { level: 3, names: ['Fog Cloud', 'Gust of Wind', 'Ray of Frost', 'Shatter', 'Thunderwave'] },
        { level: 5, names: ['Lightning Bolt', 'Water Breathing'] },
        { level: 7, names: ['Control Water', 'Ice Storm'] },
        { level: 9, names: ['Conjure Elemental', 'Hold Monster'] },
      ],
      notes: [
        'This circle spends Wild Shape uses on Wrath of the Sea rather than transforming, so it needs no curated forms — the Wild Shape panel stays empty unless you give it beasts anyway.',
        'The Emanation is not drawn on the map. Nearest tools: a circle template centred on the token, or the token\'s own light radius set to match (5 ft, 10 ft from level 6).',
        'Wrath of the Sea damage is [your Wisdom modifier]d6 Cold — roll it from the dice tray; the app does not compute it.',
      ],
    },

    'Circle of the Titan': {
      blurb: 'Wild Shape into a kaiju of the primal world — Behemoth, Leviathan or Insectoid.',
      features: [
        {
          level: 3,
          name: 'Circle of the Titan Spells',
          desc:
            'When you reach a Druid level specified in the Circle of the Titan Spells table, you thereafter always have the listed spells prepared.\n\n' +
            "In addition, you can cast the spells from this feature while you're in your Titan Form.\n\n" +
            'Level 3: Thaumaturgy, Thunderwave, Enlarge/Reduce\n' +
            'Level 5: Fear\n' +
            'Level 7: Stoneskin\n' +
            'Level 9: Destructive Wave\n\n' +
            'Enlarge/Reduce is how a Titan Form grows: cast it to go from Large to Huge, and at higher levels from Huge to Gargantuan.',
        },
        {
          level: 3,
          name: 'Titan Form',
          desc:
            'As a Bonus Action, you can Wild Shape into a Titan Form, choosing from the Behemoth, Leviathan, and Insectoid stat blocks.\n\n' +
            'A Titan Form is Large, and lasts 10 minutes.\n\n' +
            "You determine what your Titan Form looks like. Roll on or choose from the Titan Appearance table to inspire aspects of your form's appearance.\n\n" +
            'Titan Appearance (1d4) — Behemoth / Leviathan / Insectoid\n' +
            '1. Reflective scales / Many-tentacled / Iridescent wings\n' +
            '2. Multiple heads / Translucent and bloblike / Compound eyes\n' +
            '3. Reptilian tail / Lamprey-like mouth / Chitinous horns\n' +
            '4. Wooly and simian / Serpentine body / Bioluminescent exoskeleton',
        },
        {
          level: 6,
          name: 'Dire Impact',
          desc:
            'Your Titan Form brings greater devastation. You gain the following benefits.\n\n' +
            "Elemental Rend. Whenever you hit with your Titan Form's Rend attack, you can cause it to deal your choice of Acid, Cold, Fire, Lightning, or Thunder damage rather than its normal damage type.\n\n" +
            'Shock Wave. Whenever you move at least half your Speed while in your Titan Form, you can create a shock wave in a 10-foot Emanation originating from you. Each creature in the Emanation must succeed on a Constitution saving throw against your spell save DC or have the Prone condition.',
        },
        {
          level: 10,
          name: 'Primal Havoc',
          desc:
            'The unbridled power of nature surges within you.\n\n' +
            'Toughened Hide. While in your Titan Form, you can expend a level 1+ spell slot to thicken your hide, gaining a bonus to your Armor Class equal to half the level of the slot expended.',
        },
        {
          level: 14,
          name: 'Monstrous Appetite',
          desc:
            "Your transformation embodies the vast size and terror of nature's titans.\n\n" +
            'Grappling Rend. Once per turn when you hit a creature with your Titan Form\'s Rend attack, you can give the target the Grappled condition (escape DC equals your spell save DC). You can have only one target grappled in this way at a time.\n\n' +
            'Swallow. As a Bonus Action, choose one creature Grappled by you that is at least two sizes smaller than you. The target makes a Strength saving throw against your spell save DC. On a failure, you swallow the target, and the Grappled condition ends on it. A swallowed creature has the Blinded and Restrained conditions, has Total Cover against attacks and other effects outside of your stomach, and takes acid damage equal to [your Wisdom modifier]d12 at the start of each of your turns.\n\n' +
            'The number of creatures you can have swallowed at a time equals your Wisdom modifier (minimum of one creature). You must maintain Concentration to hold swallowed creatures in your stomach. If you lose Concentration or leave your Titan Form, you regurgitate all swallowed creatures, each of which falls in a space within 10 feet of you and has the Prone condition.',
        },
      ],
      spells: [
        { level: 3, names: ['Thaumaturgy', 'Thunderwave', 'Enlarge/Reduce'] },
        { level: 5, names: ['Fear'] },
        { level: 7, names: ['Stoneskin'] },
        { level: 9, names: ['Destructive Wave'] },
      ],
      notes: [
        'Titan Form grants 4× your Druid level in temporary hit points — applied automatically when you shift.',
        'All three forms are AC 13 + your Wisdom modifier and Large. Growing beyond Large is done with Enlarge/Reduce, then resize the token from the Tokens panel.',
        'Titan Forms keep YOUR hit points rather than taking the form\'s, so the three stat blocks are flagged "keeps character HP" in the library.',
        'Shifting is a Bonus Action and the form lasts 10 minutes — not tracked by the app.',
        'Attack bonus, save DCs and Rend damage scale off your Wisdom and spell save DC; the stat blocks carry the formulas, not fixed numbers.',
      ],
    },
  },
};

// Every feature for a class/subclass pair, or [] when the subclass has no
// table here. `level` filters to what has actually been unlocked; pass null
// for the whole progression.
// Curated first, imported second.
//
// The hand-written entries carry blurbs, always-prepared spell lists and notes
// about what the app automates — detail the bulk import has no way to produce.
// So a curated subclass keeps its entry untouched, and the import only fills
// in the several hundred subclasses that had nothing at all.
function lookupSubclass(className, subclassName) {
  const c = String(className || '').trim();
  const s = String(subclassName || '').trim();
  if (!c || !s) return null;
  return SUBCLASS_FEATURES[c]?.[s]
    || IMPORTED_SUBCLASS_FEATURES[c]?.[s]
    || null;
}

export function subclassFeaturesFor(className, subclassName, level = null) {
  const entry = lookupSubclass(className, subclassName);
  if (!entry) return [];
  const all = entry.features || [];
  return level == null ? all : all.filter((f) => f.level <= level);
}

export function subclassEntry(className, subclassName) {
  return lookupSubclass(className, subclassName);
}

// Always-prepared spells unlocked at or below `level`, flattened and deduped.
export function subclassPreparedSpells(className, subclassName, level) {
  const entry = subclassEntry(className, subclassName);
  if (!entry?.spells) return [];
  const out = [];
  for (const row of entry.spells) {
    if (level != null && row.level > level) continue;
    for (const n of row.names) if (!out.includes(n)) out.push(n);
  }
  return out;
}

// Spells a subclass puts within reach without always preparing them — the
// `learnableSpells` field. Same level-gated row shape as `spells`, but read only
// by the spell picker's filter, never auto-granted onto a sheet.
export function subclassLearnableSpells(className, subclassName, level) {
  const rows = subclassEntry(className, subclassName)?.learnableSpells;
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    if (level != null && row.level > level) continue;
    for (const n of row.names) if (!out.includes(n)) out.push(n);
  }
  return out;
}

// Wild Shape temporary hit points by subclass. Mirrored server-side in
// index.js — keep the two in step.
//   Circle of the Moon  — Circle Forms: 3× druid level
//   Circle of the Titan — Titan Form:   2× druid level
//   anything else       — the base 2024 rule: 1× druid level
const TEMP_HP_MULTIPLIER = {
  'Circle of the Moon': 3,
  'Circle of the Titan': 4,
};

export function wildShapeTempHp(druidLevel, subclassName) {
  const lvl = Math.max(0, Number(druidLevel) || 0);
  return lvl * (TEMP_HP_MULTIPLIER[String(subclassName || '').trim()] || 1);
}

// Circle Forms caps the form's CR at druid level ÷ 3 (round down). Returns
// null for subclasses with no such cap, so callers can skip the hint.
export function wildShapeCrCap(druidLevel, subclassName) {
  if (String(subclassName || '').trim() !== 'Circle of the Moon') return null;
  return Math.floor((Math.max(0, Number(druidLevel) || 0)) / 3);
}

// ── Class features ───────────────────────────────────────────────────────────
//
// The class-level progression, same shape as SUBCLASS_FEATURES minus the
// spells table. A class with no entry here behaves as every class did before:
// the sheet simply shows nothing extra. Kept in this file so a character sheet
// has one import for "what do I get, and when".
export const CLASS_FEATURES = {
  // ── Blood Hunter ──────────────────────────────────────────────────────────
  //
  // Matt Mercer's class, published free by Critical Role, not part of the SRD —
  // which is why it is written here by hand rather than imported from the
  // 5eTools mirror like the rest (that mirror carries no Blood Hunter data).
  // The rules below are the 2020 revision, summarised in our own words: the
  // mechanics a sheet needs, not the published prose.
  //
  // THE TWO THINGS THIS CLASS SPENDS ARE HIT POINTS AND A DIE.
  //
  // Hemocraft die: d4 at level 1, d6 at 5, d8 at 11, d10 at 17. Nearly every
  // feature either rolls it or costs its roll in unpreventable damage, so it
  // is stated on each feature rather than left in a table the sheet does not
  // draw.
  'Blood Hunter': {
    blurb: 'A monster hunter who pays for their power in blood — rites that set a blade alight, and curses worked on an enemy\'s own flesh.',
    features: [
      {
        level: 1,
        name: "Hunter's Bane",
        desc:
          'You have Advantage on Survival checks to track fey, fiends and undead, and on Intelligence checks to recall what you know about them.\n\n'
          + 'Hemocraft Ability. Choose Intelligence or Wisdom at level 1. That modifier is used by your blood curses, brands and several later features.\n\n'
          + 'Save DC. 8 + your Proficiency Bonus + your hemocraft modifier.\n\n'
          + 'Hemocraft Die. d4, rising to d6 at level 5, d8 at level 11 and d10 at level 17.',
      },
      {
        level: 1,
        name: 'Blood Maledict',
        desc:
          'As a Bonus Action, invoke a blood curse you know on a creature you can see within 30 feet. A creature with no blood is immune unless the curse is amplified.\n\n'
          + 'Amplifying. You may amplify a curse as you invoke it, which costs you one roll of your hemocraft die in Necrotic damage that cannot be reduced in any way. An amplified curse has an extra effect, listed with the curse.\n\n'
          + 'Uses. Once, rising to twice at level 6, three times at 13 and four times at 17. Expended uses come back on a Short or Long Rest.\n\n'
          + 'Curses Known. One, with another at levels 6, 10, 14 and 18.',
      },
      {
        level: 2,
        name: 'Fighting Style',
        desc: 'Choose Archery, Dueling, Great Weapon Fighting or Two-Weapon Fighting. The choice is made on your sheet under class choices.',
      },
      {
        level: 2,
        name: 'Crimson Rite',
        desc:
          'As a Bonus Action, invoke a rite you know on one weapon you are holding. Doing so costs you one roll of your hemocraft die in Necrotic damage that cannot be reduced in any way.\n\n'
          + 'While the rite holds, that weapon deals an extra hemocraft die of the rite\'s damage type on a hit, and counts as magical. The rite lasts until you finish a Short or Long Rest, and only one weapon can carry a rite at a time.\n\n'
          + 'Primal Rites. Rite of the Flame (Fire), Rite of the Frozen (Cold), Rite of the Storm (Lightning). You know one to begin with and learn another at levels 7 and 14.\n\n'
          + 'Esoteric Rites. From level 14 your choices also include Rite of the Dead (Necrotic), Rite of the Oracle (Psychic) and Rite of the Roar (Thunder).',
      },
      {
        level: 3,
        name: 'Blood Hunter Order',
        desc: 'You join an order — Ghostslayer, Lycan, Mutant or Profane Soul — and gain its features at levels 3, 7, 11, 15 and 18.',
      },
      { level: 4, name: 'Ability Score Improvement', desc: 'Raise one ability score by 2, or two by 1, to a maximum of 20 — or take a feat. Again at levels 8, 12, 16 and 19.' },
      { level: 5, name: 'Extra Attack', desc: 'You attack twice whenever you take the Attack action.' },
      {
        level: 6,
        name: 'Brand of Castigation',
        desc:
          'When you damage a creature with a weapon carrying an active rite, you can brand it. You always know the direction of a branded creature on the same plane as you.\n\n'
          + 'Whenever it deals damage to you or to a creature within 5 feet of you, it takes Psychic damage equal to your hemocraft modifier.\n\n'
          + 'The brand lasts until you end it, you brand something else, or it is dispelled. Once used, it recharges on a Short or Long Rest.',
      },
      { level: 9, name: 'Grim Psychometry', desc: 'You have Advantage on Intelligence (History) checks to dig up the darker history of an object you handle or a place you stand in. A good enough roll may bring visions with it, at your GM\'s discretion.' },
      {
        level: 10,
        name: 'Dark Augmentation',
        desc: 'Your Speed increases by 5 feet, and you add your hemocraft modifier (minimum +1) to your Strength, Dexterity and Constitution saving throws.',
      },
      {
        level: 13,
        name: 'Brand of Tethering',
        desc:
          'The Psychic damage from your Brand of Castigation becomes twice your hemocraft modifier (minimum 2).\n\n'
          + 'A branded creature cannot take the Dash action, and if it tries to teleport or leave the plane it takes 4d6 Psychic damage and must succeed on a Wisdom saving throw against your save DC or the attempt fails.',
      },
      { level: 14, name: 'Hardened Soul', desc: 'You have Advantage on saving throws against being Charmed or Frightened.' },
      { level: 19, name: 'Ability Score Improvement', desc: 'Raise one ability score by 2, or two by 1, to a maximum of 20 — or take a feat.' },
      {
        level: 20,
        name: 'Sanguine Mastery',
        desc:
          'Once per turn you can reroll a hemocraft die and choose which result to use.\n\n'
          + 'When you score a critical hit with a weapon carrying an active rite, you regain one use of Blood Maledict.',
      },
    ],
    notes: [
      'Blood Maledict uses and your hemocraft die size are tracked in the Resources panel.',
      'A rite and the hit points it costs are yours to spend: the die roll is damage you take, and nothing reduces it.',
      'Not an SRD class — this is the free Blood Hunter (2020 revision) by Matt Mercer / Critical Role, written up here for play rather than reproduced.',
    ],
  },

  Druid: {
    blurb: 'A nature priest of primal power — animals, plants and the four elements.',
    features: [
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'Cantrips. Two from the Druid list (Druidcraft and Produce Flame recommended), with another at levels 4 and 10; you can swap one whenever you gain a level.\n\n' +
          'Prepared Spells. Four level 1 spells to start — Animal Friendship, Cure Wounds, Faerie Fire and Thunderwave are recommended — rising with level.\n\n' +
          'Changing Your Prepared Spells. Whenever you finish a Long Rest, you can replace any prepared spells with other Druid spells for which you have slots.\n\n' +
          'Spellcasting Ability. Wisdom.  Spellcasting Focus. A Druidic Focus.',
      },
      { level: 1, name: 'Druidic', desc: 'You know Druidic, the secret language of Druids, and always have Speak with Animals prepared.\n\nYou can leave hidden messages in Druidic. Others spot the message with a DC 15 Intelligence (Investigation) check but can\'t decipher it without magic.' },
      { level: 1, name: 'Primal Order', desc: 'Magician. You know one extra Druid cantrip, and add your Wisdom modifier (minimum +1) to Intelligence (Arcana or Nature) checks.\n\nWarden. You gain proficiency with Martial weapons and training with Medium armor.' },
      {
        level: 2,
        name: 'Wild Shape',
        desc:
          'As a Bonus Action, shape-shift into a Beast form you know. It lasts a number of hours equal to half your Druid level, or until you use Wild Shape again, are Incapacitated, die, or leave early as a Bonus Action.\n\n' +
          'Uses. Twice, rising to 3 at level 6 and 4 at level 17. Regain one on a Short Rest, all on a Long Rest.\n\n' +
          'Known Forms. Four to start, max CR 1/4 and no Fly Speed. At level 4: six forms, max CR 1/2. At level 8: eight forms, max CR 1, Fly Speed allowed. Swap one after each Long Rest.\n\n' +
          'While Shape-Shifted. You gain Temporary Hit Points equal to your Druid level. Your statistics are replaced by the Beast\'s, but you keep your creature type, Hit Points, Hit Dice, INT/WIS/CHA, class features, languages and feats, and your own proficiencies (using the Beast\'s if higher). You can\'t cast spells, though Concentration continues. Equipment falls, merges, or is worn as the form allows.',
      },
      { level: 2, name: 'Wild Companion', desc: 'As a Magic action, expend a spell slot or a use of Wild Shape to cast Find Familiar without Material components. The familiar is Fey and disappears when you finish a Long Rest.' },
      { level: 5, name: 'Wild Resurgence', desc: 'Once on each of your turns, if you have no Wild Shape uses left, you can expend a spell slot to regain one (no action required).\n\nYou can also expend a use of Wild Shape to gain a level 1 spell slot, once per Long Rest.' },
      { level: 7, name: 'Elemental Fury', desc: 'Choose one:\n\nPotent Spellcasting. Add your Wisdom modifier to the damage of your Druid cantrips.\n\nPrimal Strike. Once on each of your turns when you hit with a weapon or a Beast form\'s attack, deal an extra 1d8 Cold, Fire, Lightning or Thunder damage.' },
      { level: 15, name: 'Improved Elemental Fury', desc: 'Potent Spellcasting. Druid cantrips with a range of 10+ feet gain 300 feet of range.\n\nPrimal Strike. The extra damage increases to 2d8.' },
      { level: 18, name: 'Beast Spells', desc: 'While using Wild Shape, you can cast spells in Beast form — except spells with a costed or consumed Material component.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Dimensional Travel is recommended.' },
      { level: 20, name: 'Archdruid', desc: 'Evergreen Wild Shape. When you roll Initiative with no uses left, you regain one.\n\nNature Magician. Convert unexpended Wild Shape uses into one spell slot, each use worth 2 spell levels. Once per Long Rest.\n\nLongevity. You age one year for every ten that pass.' },
    ],
    notes: [
      'Wild Shape uses are tracked in the Resources panel (2 → 3 at level 6 → 4 at 17).',
      'Shifting is built in: your GM curates your forms on your sheet, and the leaf button in your quick controls transforms you, applying the temporary hit points and the form\'s senses.',
      'Wild Companion familiars can be bound to you as a companion token, sharing their vision with you.',
    ],
  },

  Ranger: {
    blurb: 'A wandering warrior imbued with primal magic — the wilderness\'s unending watch.',
    features: [
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'Prepared Spells. Two level 1 Ranger spells to start (Cure Wounds and Ensnaring Strike recommended), rising with level.\n\n' +
          'Changing Your Prepared Spells. Whenever you finish a Long Rest, you can replace one spell with another Ranger spell for which you have slots.\n\n' +
          'Spellcasting Ability. Wisdom.  Spellcasting Focus. A Druidic Focus.',
      },
      { level: 1, name: 'Favored Enemy', desc: "You always have Hunter's Mark prepared, and can cast it twice without expending a spell slot, regaining the uses on a Long Rest. The number rises to 3 at level 5, 4 at 9, 5 at 13, and 6 at 17." },
      { level: 1, name: 'Weapon Mastery', desc: 'You can use the mastery properties of two kinds of weapons you are proficient with, changing them after each Long Rest.' },
      { level: 2, name: 'Deft Explorer', desc: 'Expertise. Choose one skill proficiency you lack Expertise in; you gain Expertise in it.\n\nLanguages. You know two languages of your choice.' },
      { level: 2, name: 'Fighting Style', desc: 'You gain a Fighting Style feat of your choice, or this option:\n\nDruidic Warrior. You learn two Druid cantrips (Guidance and Starry Wisp recommended). They count as Ranger spells and use Wisdom. You can swap one whenever you gain a Ranger level.' },
      { level: 5, name: 'Extra Attack', desc: 'You can attack twice instead of once whenever you take the Attack action on your turn.' },
      { level: 6, name: 'Roving', desc: "Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed." },
      { level: 9, name: 'Expertise', desc: 'Choose two more skill proficiencies you lack Expertise in; you gain Expertise in them.' },
      { level: 10, name: 'Tireless', desc: 'Temporary Hit Points. As a Magic action, give yourself 1d8 plus your Wisdom modifier Temporary Hit Points (minimum 1). Uses equal your Wisdom modifier (minimum once), regained on a Long Rest.\n\nDecrease Exhaustion. Your Exhaustion level drops by 1 whenever you finish a Short Rest.' },
      { level: 13, name: 'Relentless Hunter', desc: "Taking damage can't break your Concentration on Hunter's Mark." },
      { level: 14, name: "Nature's Veil", desc: 'As a Bonus Action, give yourself the Invisible condition until the end of your next turn.\n\nUses equal your Wisdom modifier (minimum once), regained on a Long Rest.' },
      { level: 17, name: 'Precise Hunter', desc: "You have Advantage on attack rolls against the creature currently marked by your Hunter's Mark." },
      { level: 18, name: 'Feral Senses', desc: 'You gain Blindsight with a range of 30 feet.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Dimensional Travel is recommended.' },
      { level: 20, name: 'Foe Slayer', desc: "The damage die of your Hunter's Mark is a d10 rather than a d6." },
    ],
    notes: [
      "Favored Enemy casts, Tireless and Nature's Veil are tracked in the Resources panel.",
      'Feral Senses grants Blindsight 30 ft — set it from the My Token panel so fog of war matches.',
      'Roving changes your Speed and gives Climb and Swim Speeds: set them on your sheet.',
    ],
  },

  Rogue: {
    blurb: 'A dexterous expert in stealth and subterfuge — one precise strike over a barrage.',
    features: [
      { level: 1, name: 'Expertise', desc: 'You gain Expertise in two of your skill proficiencies — Sleight of Hand and Stealth are recommended. Two more at level 6.' },
      {
        level: 1,
        name: 'Sneak Attack',
        desc:
          'Once per turn, deal an extra 1d6 damage to one creature you hit with an attack roll if you have Advantage and the attack uses a Finesse or Ranged weapon. The damage type matches the weapon.\n\n' +
          "You don't need Advantage if an ally is within 5 feet of the target, that ally isn't Incapacitated, and you don't have Disadvantage.\n\n" +
          'The damage rises by 1d6 at every odd level: 2d6 at 3, 3d6 at 5, up to 10d6 at 19.',
      },
      { level: 1, name: "Thieves' Cant", desc: 'You know Thieves\' Cant and one other language of your choice.' },
      { level: 1, name: 'Weapon Mastery', desc: 'You can use the mastery properties of two kinds of weapons you are proficient with, changing them after each Long Rest.' },
      { level: 2, name: 'Cunning Action', desc: 'On your turn, you can take Dash, Disengage, or Hide as a Bonus Action.' },
      { level: 3, name: 'Steady Aim', desc: 'As a Bonus Action, give yourself Advantage on your next attack roll this turn. Usable only if you haven\'t moved this turn; afterwards your Speed is 0 until the end of the turn.' },
      {
        level: 5,
        name: 'Cunning Strike',
        desc:
          'When you deal Sneak Attack damage, you can add an effect by forgoing Sneak Attack dice. Save DC = 8 + Dexterity modifier + Proficiency Bonus.\n\n' +
          'Poison (1d6). Constitution save or Poisoned for 1 minute, repeating the save at the end of each of its turns. Requires a Poisoner\'s Kit on your person.\n\n' +
          'Trip (1d6). If Large or smaller, Dexterity save or Prone.\n\n' +
          'Withdraw (1d6). Move up to half your Speed without provoking.',
      },
      { level: 5, name: 'Uncanny Dodge', desc: 'When an attacker you can see hits you, you can take a Reaction to halve the damage (round down).' },
      { level: 7, name: 'Evasion', desc: 'When subjected to an effect allowing a Dexterity save for half damage, you take no damage on a success and half on a failure. Not while Incapacitated.' },
      { level: 7, name: 'Reliable Talent', desc: 'When you make an ability check using a skill or tool proficiency, treat a d20 roll of 9 or lower as a 10.' },
      { level: 11, name: 'Improved Cunning Strike', desc: 'You can use up to two Cunning Strike effects on one Sneak Attack, paying the die cost for each.' },
      {
        level: 14,
        name: 'Devious Strikes',
        desc:
          'Three more Cunning Strike options:\n\n' +
          'Daze (2d6). Constitution save, or on its next turn the target can only move, or take an action, or take a Bonus Action.\n\n' +
          'Knock Out (6d6). Constitution save or Unconscious for 1 minute or until it takes damage, repeating the save at the end of each of its turns.\n\n' +
          'Obscure (3d6). Dexterity save or Blinded until the end of its next turn.',
      },
      { level: 15, name: 'Slippery Mind', desc: 'You gain proficiency in Wisdom and Charisma saving throws.' },
      { level: 18, name: 'Elusive', desc: 'No attack roll can have Advantage against you unless you have the Incapacitated condition.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of the Night Spirit is recommended.' },
      { level: 20, name: 'Stroke of Luck', desc: 'If you fail a D20 Test, you can turn the roll into a 20. Once per Short or Long Rest.' },
    ],
    notes: [
      'Expertise picks are made in the class-choices panel and double your Proficiency Bonus on the chosen skills.',
      'Sneak Attack dice are not rolled automatically — the dice tray has a d6 pool for them.',
      'Ability Score Improvements come at levels 4, 8, 10, 12 and 16 — taken as feats on the sheet.',
    ],
  },

  Warlock: {
    blurb: 'An occultist empowered by otherworldly pacts — forbidden knowledge made power.',
    features: [
      {
        level: 1,
        name: 'Eldritch Invocations',
        desc:
          'You gain one invocation at level 1, rising to 3 at level 2, 5 at 5, 6 at 7, 7 at 9, 8 at 12, 9 at 15, and 10 at 18.\n\n' +
          'Whenever you gain a Warlock level you can replace one invocation with another you qualify for — unless it is a prerequisite for another invocation you have. You must meet any prerequisite to learn an invocation.',
      },
      {
        level: 1,
        name: 'Pact Magic',
        desc:
          'Cantrips. Two Warlock cantrips (Eldritch Blast and Prestidigitation recommended), with another at levels 4 and 10; you can swap one whenever you gain a level.\n\n' +
          'Spell Slots. Few slots, all of the SAME level, and they return on a Short or Long Rest. Slot level rises to 2 at Warlock 3, 3 at 5, 4 at 7, and 5 at 9; you have 1 slot at level 1, 2 from level 2, 3 from 11, and 4 from 17. A spell cast with a slot is cast at that slot\'s level.\n\n' +
          'Prepared Spells. Two level 1 Warlock spells to start (Charm Person and Hex recommended), rising with level; each must be of a level no higher than your slot level.\n\n' +
          'Spellcasting Ability. Charisma.  Spellcasting Focus. An Arcane Focus.',
      },
      { level: 2, name: 'Magical Cunning', desc: 'A 1-minute esoteric rite lets you regain expended Pact Magic slots, up to half your maximum (round up). Once per Long Rest.' },
      { level: 9, name: 'Contact Patron', desc: 'You always have Contact Other Plane prepared. You can cast it without a spell slot to contact your patron, automatically succeeding on the save. Once per Long Rest.' },
      {
        level: 11,
        name: 'Mystic Arcanum',
        desc:
          'Choose one level 6 Warlock spell as an arcanum: you can cast it once without expending a spell slot, regaining the use on a Long Rest.\n\n' +
          'You gain another at levels 13 (level 7), 15 (level 8) and 17 (level 9). Whenever you gain a Warlock level you can replace one arcanum with another Warlock spell of the same level.',
      },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Fate is recommended.' },
      { level: 20, name: 'Eldritch Master', desc: 'When you use Magical Cunning, you regain ALL your expended Pact Magic spell slots.' },
      {
        level: 1,
        name: 'Eldritch Invocation Options',
        desc:
          'Agonizing Blast (level 2+, damaging cantrip). Add your Charisma modifier to that cantrip\'s damage. Repeatable.\n\n' +
          'Armor of Shadows. Cast Mage Armor on yourself without a slot.\n\n' +
          'Ascendant Step (level 5+). Cast Levitate on yourself without a slot.\n\n' +
          "Devil's Sight (level 2+). See normally in Dim Light and Darkness — magical or not — within 120 feet.\n\n" +
          'Devouring Blade (level 12+, Thirsting Blade). Thirsting Blade grants two extra attacks rather than one.\n\n' +
          'Eldritch Mind. Advantage on Constitution saves to maintain Concentration.\n\n' +
          'Eldritch Smite (level 5+, Pact of the Blade). Once per turn, expend a Pact slot on a pact-weapon hit for an extra 1d8 Force damage per slot level plus 1d8, and knock a Huge or smaller target Prone.\n\n' +
          'Eldritch Spear (level 2+, damaging cantrip with 10+ ft range). That cantrip\'s range increases by 30 × your Warlock level. Repeatable.\n\n' +
          'Fiendish Vigor (level 2+). Cast False Life on yourself without a slot, always at the die\'s maximum.\n\n' +
          'Gaze of Two Minds (level 5+). Bonus Action to perceive through a willing creature\'s senses until the end of your next turn, extendable; you gain its special senses and can cast as if in its space within 60 feet.\n\n' +
          'Gift of the Depths (level 5+). Breathe underwater and gain a Swim Speed equal to your Speed; cast Water Breathing once per Long Rest without a slot.\n\n' +
          'Gift of the Protectors (level 9+, Pact of the Tome). Creatures named on a page of your book drop to 1 Hit Point instead of 0; once triggered, not again until a Long Rest.\n\n' +
          'Investment of the Chain Master (level 5+, Pact of the Chain). Your familiar gains a 40-foot Fly or Swim Speed, attacks on your Bonus Action, can deal Necrotic or Radiant damage, uses your save DC, and can be granted Resistance with your Reaction.\n\n' +
          'Lessons of the First Ones (level 2+). Gain an Origin feat. Repeatable.\n\n' +
          'Lifedrinker (level 9+, Pact of the Blade). Once per turn, extra 1d6 Necrotic, Psychic or Radiant damage on a pact-weapon hit, and you can spend a Hit Point Die to heal.\n\n' +
          'Mask of Many Faces (level 2+). Cast Disguise Self without a slot.\n\n' +
          'Master of Myriad Forms (level 5+). Cast Alter Self without a slot.\n\n' +
          'Misty Visions (level 2+). Cast Silent Image without a slot.\n\n' +
          'One with Shadows (level 5+). In Dim Light or Darkness, cast Invisibility on yourself without a slot.\n\n' +
          'Otherworldly Leap (level 2+). Cast Jump on yourself without a slot.\n\n' +
          'Pact of the Blade. Bonus Action to conjure or bond a Melee weapon: proficiency with it, use it as a Focus, attack and damage with Charisma, and deal Necrotic, Psychic or Radiant damage.\n\n' +
          'Pact of the Chain. Learn Find Familiar and cast it as a Magic action without a slot; special forms include Imp, Pseudodragon, Quasit, Skeleton, Slaad Tadpole, Sphinx of Wonder, Sprite and Venomous Snake. You can forgo one attack to let the familiar attack with its Reaction.\n\n' +
          'Pact of the Tome. Conjure a Book of Shadows after a rest with three cantrips and two level 1 Ritual spells from any list, prepared while you carry it; it is also a Spellcasting Focus.\n\n' +
          'Repelling Blast (level 2+, attack-roll cantrip). Push a Large or smaller target 10 feet on a hit. Repeatable.\n\n' +
          'Thirsting Blade (level 5+, Pact of the Blade). Extra Attack with your pact weapon only.\n\n' +
          'Visions of Distant Realms (level 9+). Cast Arcane Eye without a slot.\n\n' +
          'Whispers of the Grave (level 7+). Cast Speak with Dead without a slot.\n\n' +
          'Witch Sight (level 15+). Truesight 30 feet.',
      },
    ],
    notes: [
      'Pact Magic slots, Magical Cunning and Mystic Arcanum are tracked in the Resources panel — the slots refresh on a Short Rest.',
      "Devil's Sight, Witch Sight and Gift of the Depths change what you perceive: set them from the My Token panel (senses, and flight or swimming).",
      'Pact of the Chain familiars can be bound to you as a companion token by your GM, sharing their vision with you.',
    ],
  },

  Monk: {
    blurb: 'A martial artist of supernatural focus — a living weapon of body and mind.',
    features: [
      {
        level: 1,
        name: 'Martial Arts',
        desc:
          'Monk weapons are Simple Melee weapons and Martial Melee weapons with the Light property. While unarmed or wielding only Monk weapons, wearing no armor and no Shield:\n\n' +
          'Bonus Unarmed Strike. You can make an Unarmed Strike as a Bonus Action.\n\n' +
          'Martial Arts Die. Roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. It becomes a d8 at level 5, d10 at 11, and d12 at 17.\n\n' +
          'Dexterous Attacks. Use Dexterity instead of Strength for attack and damage rolls with Unarmed Strikes and Monk weapons, and for the Grapple/Shove save DC.',
      },
      { level: 1, name: 'Unarmored Defense', desc: 'While you wear no armor and wield no Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers.' },
      {
        level: 2,
        name: "Monk's Focus",
        desc:
          'You have Focus Points equal to your Monk level. Spent points return on a Short or Long Rest. Save DC for Focus features = 8 + Wisdom modifier + Proficiency Bonus.\n\n' +
          'Flurry of Blows. Spend 1 point to make two Unarmed Strikes as a Bonus Action.\n\n' +
          'Patient Defense. Disengage as a Bonus Action; or spend 1 point to Disengage and Dodge as a Bonus Action.\n\n' +
          'Step of the Wind. Dash as a Bonus Action; or spend 1 point to Disengage and Dash as a Bonus Action with your jump distance doubled.',
      },
      { level: 2, name: 'Unarmored Movement', desc: 'Your Speed increases by 10 feet while you wear no armor and wield no Shield, rising to +15 at level 6, +20 at 10, +25 at 14, and +30 at 18.' },
      { level: 2, name: 'Uncanny Metabolism', desc: 'When you roll Initiative, you can regain all expended Focus Points and roll your Martial Arts die to regain Hit Points equal to your Monk level plus the roll.\n\nOnce per Long Rest.' },
      {
        level: 3,
        name: 'Deflect Attacks',
        desc:
          'When an attack hits you and its damage includes Bludgeoning, Piercing, or Slashing, you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier and Monk level.\n\n' +
          'If you reduce the damage to 0, you can spend 1 Focus Point to redirect it: a creature within 5 feet (melee) or 60 feet not behind Total Cover (ranged) makes a Dexterity save or takes damage equal to two rolls of your Martial Arts die plus your Dexterity modifier, of the attack\'s type.',
      },
      { level: 4, name: 'Slow Fall', desc: 'You can take a Reaction when you fall to reduce the fall damage by five times your Monk level.' },
      { level: 5, name: 'Extra Attack', desc: 'You can attack twice instead of once whenever you take the Attack action on your turn.' },
      { level: 5, name: 'Stunning Strike', desc: 'Once per turn when you hit with a Monk weapon or Unarmed Strike, you can spend 1 Focus Point: the target makes a Constitution save or is Stunned until the start of your next turn. On a success its Speed is halved until then, and the next attack against it has Advantage.' },
      { level: 6, name: 'Empowered Strikes', desc: 'Whenever you deal damage with your Unarmed Strike, it can deal Force damage or its normal type, your choice.' },
      { level: 7, name: 'Evasion', desc: 'When subjected to an effect allowing a Dexterity save for half damage, you take no damage on a success and half on a failure. Not while Incapacitated.' },
      { level: 9, name: 'Acrobatic Movement', desc: 'While you wear no armor and wield no Shield, you can move along vertical surfaces and across liquids on your turn without falling during the movement.' },
      {
        level: 10,
        name: 'Heightened Focus',
        desc:
          'Flurry of Blows. Three Unarmed Strikes instead of two for the same point.\n\n' +
          'Patient Defense. You also gain Temporary Hit Points equal to two rolls of your Martial Arts die.\n\n' +
          'Step of the Wind. You can bring a willing Large-or-smaller creature within 5 feet along with you until the end of your turn, without provoking.',
      },
      { level: 10, name: 'Self-Restoration', desc: 'At the end of each of your turns you can remove one of Charmed, Frightened, or Poisoned from yourself. Forgoing food and drink no longer gives you Exhaustion.' },
      { level: 13, name: 'Deflect Energy', desc: 'Deflect Attacks now works against attacks that deal any damage type.' },
      { level: 14, name: 'Disciplined Survivor', desc: 'You gain proficiency in all saving throws. When you fail a save, you can spend 1 Focus Point to reroll it and must use the new roll.' },
      { level: 15, name: 'Perfect Focus', desc: 'When you roll Initiative and don\'t use Uncanny Metabolism, you regain Focus Points until you have 4, if you have 3 or fewer.' },
      { level: 18, name: 'Superior Defense', desc: 'At the start of your turn, you can spend 3 Focus Points to gain Resistance to all damage except Force for 1 minute or until Incapacitated.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Irresistible Offense is recommended.' },
      { level: 20, name: 'Body and Mind', desc: 'Your Dexterity and Wisdom scores increase by 4, to a maximum of 25.' },
    ],
    notes: [
      'Focus Points are tracked in the Resources panel and refresh on a Short Rest.',
      'Unarmored Defense and Unarmored Movement change your AC and Speed — set both on your sheet.',
    ],
  },

  Paladin: {
    blurb: 'A devout warrior of sacred oaths — a blessed champion against annihilation.',
    features: [
      { level: 1, name: 'Lay On Hands', desc: 'You have a pool of healing equal to five times your Paladin level, refreshed on a Long Rest.\n\nAs a Bonus Action, touch a creature (including yourself) and restore Hit Points from the pool. You can also spend 5 points to remove the Poisoned condition instead of healing.' },
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'Prepared Spells. Two level 1 Paladin spells to start — Heroism and Searing Smite are recommended — rising with level.\n\n' +
          'Changing Your Prepared Spells. Whenever you finish a Long Rest, you can replace one spell with another Paladin spell for which you have slots.\n\n' +
          'Spellcasting Ability. Charisma.  Spellcasting Focus. A Holy Symbol.',
      },
      { level: 1, name: 'Weapon Mastery', desc: 'You can use the mastery properties of two kinds of weapons you are proficient with, changing them after each Long Rest.' },
      { level: 2, name: 'Fighting Style', desc: 'You gain a Fighting Style feat of your choice, or this option:\n\nBlessed Warrior. You learn two Cleric cantrips (Guidance and Sacred Flame recommended). They count as Paladin spells and use Charisma. You can swap one whenever you gain a Paladin level.' },
      { level: 2, name: "Paladin's Smite", desc: 'You always have Divine Smite prepared, and can cast it once without expending a spell slot. You must finish a Long Rest before doing so again.' },
      {
        level: 3,
        name: 'Channel Divinity',
        desc:
          'Two uses, one regained on a Short Rest and all on a Long Rest; a third use from level 11. Save DC equals your spell save DC.\n\n' +
          'Divine Sense. As a Bonus Action, for 10 minutes or until Incapacitated, you know the location and type of any Celestial, Fiend, or Undead within 60 feet, and detect consecrated or desecrated places and objects in that radius.',
      },
      { level: 5, name: 'Extra Attack', desc: 'You can attack twice instead of once whenever you take the Attack action on your turn.' },
      { level: 5, name: 'Faithful Steed', desc: 'You always have Find Steed prepared, and can cast it once without a spell slot, regaining that use on a Long Rest.' },
      { level: 6, name: 'Aura of Protection', desc: 'A 10-foot Emanation from you, inactive while you are Incapacitated. You and your allies in it gain a bonus to saving throws equal to your Charisma modifier (minimum +1).\n\nA creature can benefit from only one Aura of Protection at a time.' },
      { level: 9, name: 'Abjure Foes', desc: 'As a Magic action, expend a use of Channel Divinity: creatures up to your Charisma modifier (minimum one) within 60 feet make a Wisdom save or are Frightened for 1 minute or until they take damage. While Frightened this way, a target can only move, take an action, or take a Bonus Action on its turn — not all three.' },
      { level: 10, name: 'Aura of Courage', desc: 'You and your allies have Immunity to the Frightened condition while in your Aura of Protection.' },
      { level: 11, name: 'Radiant Strikes', desc: 'When you hit with a Melee weapon or an Unarmed Strike, the target takes an extra 1d8 Radiant damage.' },
      { level: 14, name: 'Restoring Touch', desc: 'When you use Lay On Hands, you can also remove Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned — 5 points from the pool per condition, which don\'t also heal.' },
      { level: 18, name: 'Aura Expansion', desc: 'Your Aura of Protection becomes a 30-foot Emanation.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Truesight is recommended.' },
    ],
    notes: [
      'Lay On Hands is tracked in the Resources panel as a points pool; Channel Divinity uses sit beside it.',
      'Aura of Protection is a 10-foot Emanation (30 at level 18) that follows you — the app does not draw it; a circle template centred on your token is the nearest tool.',
    ],
  },

  Barbarian: {
    blurb: 'A fierce warrior of primal rage — ferocity, fury and turmoil made flesh.',
    features: [
      {
        level: 1,
        name: 'Rage',
        desc:
          'As a Bonus Action, you can enter a Rage if you aren\'t wearing Heavy armor. You regain one expended use on a Short Rest and all of them on a Long Rest.\n\n' +
          'Damage Resistance. Resistance to Bludgeoning, Piercing, and Slashing damage.\n\n' +
          'Rage Damage. A bonus to damage when you attack using Strength: +2, rising to +3 at level 9 and +4 at level 16.\n\n' +
          'Strength Advantage. Advantage on Strength checks and Strength saving throws.\n\n' +
          'No Concentration or Spells. You can\'t maintain Concentration or cast spells.\n\n' +
          'Duration. Lasts until the end of your next turn, extended each round by attacking, forcing a save, or a Bonus Action; up to 10 minutes. Ends early if you don Heavy armor or are Incapacitated.',
      },
      { level: 1, name: 'Unarmored Defense', desc: 'While you aren\'t wearing armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit.' },
      { level: 1, name: 'Weapon Mastery', desc: 'You can use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, changing one after each Long Rest. This rises to 3 at level 4 and 4 at level 10.' },
      { level: 2, name: 'Danger Sense', desc: 'You have Advantage on Dexterity saving throws unless you have the Incapacitated condition.' },
      { level: 2, name: 'Reckless Attack', desc: 'When you make your first attack roll on your turn, you can attack recklessly: Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time.' },
      { level: 3, name: 'Primal Knowledge', desc: 'You gain proficiency in another skill from the Barbarian list.\n\nWhile your Rage is active, you can make Acrobatics, Intimidation, Perception, Stealth, or Survival checks as Strength checks.' },
      { level: 5, name: 'Extra Attack', desc: 'You can attack twice instead of once whenever you take the Attack action on your turn.' },
      { level: 5, name: 'Fast Movement', desc: 'Your Speed increases by 10 feet while you aren\'t wearing Heavy armor.' },
      { level: 7, name: 'Feral Instinct', desc: 'You have Advantage on Initiative rolls.' },
      { level: 7, name: 'Instinctive Pounce', desc: 'As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.' },
      {
        level: 9,
        name: 'Brutal Strike',
        desc:
          'If you use Reckless Attack, you can forgo Advantage on one Strength-based attack roll (it mustn\'t have Disadvantage). On a hit, the target takes an extra 1d10 damage of the weapon\'s type and you cause one effect:\n\n' +
          'Forceful Blow. The target is pushed 15 feet straight away; you can then move up to half your Speed straight toward it without provoking.\n\n' +
          'Hamstring Blow. The target\'s Speed is reduced by 15 feet until the start of your next turn (only one Hamstring Blow at a time).',
      },
      { level: 11, name: 'Relentless Rage', desc: 'If you drop to 0 Hit Points while raging and don\'t die outright, make a DC 10 Constitution save; on a success your Hit Points become twice your Barbarian level.\n\nThe DC rises by 5 with each use, resetting to 10 after a Short or Long Rest.' },
      {
        level: 13,
        name: 'Improved Brutal Strike',
        desc:
          'Two more Brutal Strike options:\n\n' +
          'Staggering Blow. The target has Disadvantage on its next saving throw and can\'t make Opportunity Attacks until the start of your next turn.\n\n' +
          'Sundering Blow. The next attack roll against the target by another creature gains +5 (one Sundering Blow bonus per attack).',
      },
      { level: 15, name: 'Persistent Rage', desc: 'When you roll Initiative, you can regain all expended uses of Rage (once per Long Rest).\n\nYour Rage now lasts 10 minutes without needing to be extended, ending early only if you fall Unconscious or don Heavy armor.' },
      { level: 17, name: 'Improved Brutal Strike (2d10)', desc: 'Brutal Strike\'s extra damage increases to 2d10, and you can use two different Brutal Strike effects each time you use the feature.' },
      { level: 18, name: 'Indomitable Might', desc: 'If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score instead.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Irresistible Offense is recommended.' },
      { level: 20, name: 'Primal Champion', desc: 'Your Strength and Constitution scores increase by 4, to a maximum of 25.' },
    ],
    notes: [
      'Rage uses are tracked in the Resources panel (2 → 3 at level 3 → 4 at 6 → 5 at 12 → 6 at 17).',
      'Rage Damage is not applied automatically — add +2/+3/+4 to Strength-based damage yourself.',
      'Unarmored Defense and Fast Movement change AC and Speed: set both on your sheet.',
    ],
  },

  Bard: {
    blurb: 'An inspiring performer of music, dance and magic — words of creation made song.',
    features: [
      {
        level: 1,
        name: 'Bardic Inspiration',
        desc:
          'As a Bonus Action, inspire another creature within 60 feet who can see or hear you; it gains a Bardic Inspiration die (d6). A creature can hold only one at a time.\n\n' +
          'Once within the next hour, when that creature fails a D20 Test, it can roll the die and add it, potentially turning failure into success. The die is expended when rolled.\n\n' +
          'Uses equal your Charisma modifier (minimum once), regained on a Long Rest. The die becomes a d8 at level 5, a d10 at 10, and a d12 at 15.',
      },
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'Cantrips. Two from the Bard list — Dancing Lights and Vicious Mockery are recommended — with another at levels 4 and 10.\n\n' +
          'Prepared Spells. Four level 1 spells to start (Charm Person, Color Spray, Dissonant Whispers and Healing Word are recommended), rising with level.\n\n' +
          'Changing Your Prepared Spells. Whenever you gain a Bard level, you can replace one spell with another Bard spell for which you have slots.\n\n' +
          'Spellcasting Ability. Charisma.  Spellcasting Focus. A Musical Instrument.',
      },
      { level: 2, name: 'Expertise', desc: 'You gain Expertise in two of your skill proficiencies — Performance and Persuasion are recommended. You gain Expertise in two more at level 9.' },
      { level: 2, name: 'Jack of All Trades', desc: 'You can add half your Proficiency Bonus (round down) to any ability check you make that uses a skill proficiency you lack and doesn\'t otherwise use your Proficiency Bonus.' },
      { level: 5, name: 'Font of Inspiration', desc: 'You regain all expended uses of Bardic Inspiration on a Short or Long Rest.\n\nYou can also expend a spell slot (no action required) to regain one use.' },
      { level: 7, name: 'Countercharm', desc: 'If you or a creature within 30 feet fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to make the save be rerolled with Advantage.' },
      { level: 10, name: 'Magical Secrets', desc: 'Whenever your Prepared Spells number increases, you can choose new prepared spells from the Bard, Cleric, Druid, and Wizard spell lists; they count as Bard spells for you. The same applies whenever you replace a prepared spell.' },
      { level: 18, name: 'Superior Inspiration', desc: 'When you roll Initiative, you regain expended uses of Bardic Inspiration until you have two, if you have fewer.' },
      { level: 19, name: 'Epic Boon', desc: 'You gain an Epic Boon feat or another feat of your choice. Boon of Spell Recall is recommended.' },
      { level: 20, name: 'Words of Creation', desc: 'You always have Power Word Heal and Power Word Kill prepared. When you cast either, you can target a second creature within 10 feet of the first.' },
    ],
    notes: [
      'Bardic Inspiration is tracked in the Resources panel, with the die size for your level and a Grant button that hands the die to another character.',
      'Expertise picks are made in the class-choices panel and double your Proficiency Bonus on the chosen skills.',
      'Ability Score Improvements come at levels 4, 8, 12 and 16 — taken as feats on the sheet.',
    ],
  },

  Fighter: {
    blurb: 'A master of all arms and armor — unparalleled prowess with weapons and armour.',
    features: [
      {
        level: 1,
        name: 'Fighting Style',
        desc: 'You gain a Fighting Style feat of your choice. Defense is recommended.\n\nWhenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat.',
      },
      {
        level: 1,
        name: 'Second Wind',
        desc: 'As a Bonus Action, you can regain Hit Points equal to 1d10 plus your Fighter level.\n\nYou can use this twice. You regain one expended use on a Short Rest, and all of them on a Long Rest. You gain a third use at level 4 and a fourth at level 10.',
      },
      {
        level: 1,
        name: 'Weapon Mastery',
        desc: 'You can use the mastery properties of three kinds of Simple or Martial weapons of your choice. Whenever you finish a Long Rest, you can change one of those choices.\n\nThe number rises to 4 at level 4, 5 at level 10, and 6 at level 16.',
      },
      {
        level: 2,
        name: 'Action Surge',
        desc: 'On your turn, you can take one additional action, except the Magic action.\n\nOnce per Short or Long Rest. From level 17 you can use it twice per rest, but only once on a turn.',
      },
      {
        level: 2,
        name: 'Tactical Mind',
        desc: 'When you fail an ability check, you can expend a use of Second Wind to push toward success: rather than regaining Hit Points, roll 1d10 and add it to the check. If the check still fails, the use isn\'t expended.',
      },
      {
        level: 5,
        name: 'Extra Attack',
        desc: 'You can attack twice instead of once whenever you take the Attack action on your turn. This becomes three attacks at level 11 and four at level 20.',
      },
      {
        level: 5,
        name: 'Tactical Shift',
        desc: 'Whenever you activate Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks.',
      },
      {
        level: 9,
        name: 'Indomitable',
        desc: 'If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll.\n\nOnce per Long Rest, twice from level 13, three times from level 17.',
      },
      {
        level: 9,
        name: 'Tactical Master',
        desc: 'When you attack with a weapon whose mastery property you can use, you can replace that property with Push, Sap, or Slow for that attack.',
      },
      {
        level: 13,
        name: 'Studied Attacks',
        desc: 'If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn.',
      },
      {
        level: 19,
        name: 'Epic Boon',
        desc: 'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended.',
      },
    ],
    notes: [
      'Second Wind, Action Surge and Indomitable are all tracked in the Resources panel.',
      'Weapon Mastery is picked at level 1 in the class-choices panel; the app asks for three and does not yet grow the count at levels 4, 10 and 16 — add the extra picks by hand.',
      'The 2024 starting equipment offers three options; the app models two (the chain-mail kit and the 155 GP). For the studded leather / scimitar / longbow kit, take the gold option and buy it.',
      'Ability Score Improvements come at levels 4, 6, 8, 12, 14 and 16 — taken as feats on the sheet.',
    ],
  },

  Sorcerer: {
    blurb: 'A dazzling mage filled with innate magic — power stamped into your being.',
    features: [
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'Cantrips. You know four Sorcerer cantrips of your choice. Light, Prestidigitation, Shocking Grasp, and Sorcerous Burst are recommended. You learn another at Sorcerer levels 4 and 10, and can swap one whenever you gain a level.\n\n' +
          'Prepared Spells of Level 1+. Start with two level 1 Sorcerer spells — Burning Hands and Detect Magic are recommended — and add more as you level.\n\n' +
          'Changing Your Prepared Spells. Whenever you gain a Sorcerer level, you can replace one spell on your list with another Sorcerer spell for which you have spell slots.\n\n' +
          'Spellcasting Ability. Charisma.  Spellcasting Focus. An Arcane Focus.',
      },
      {
        level: 1,
        name: 'Innate Sorcery',
        desc:
          'As a Bonus Action, you can unleash your simmering magic for 1 minute, during which:\n\n' +
          '• The spell save DC of your Sorcerer spells increases by 1.\n' +
          '• You have Advantage on the attack rolls of Sorcerer spells you cast.\n\n' +
          'You can use this feature twice, and you regain all expended uses when you finish a Long Rest.',
      },
      {
        level: 2,
        name: 'Font of Magic',
        desc:
          'You have Sorcery Points equal to your Sorcerer level (from level 2), and you can\'t exceed that maximum. You regain all expended points on a Long Rest.\n\n' +
          'Converting Spell Slots to Sorcery Points. Expend a spell slot to gain points equal to the slot\'s level (no action required).\n\n' +
          'Creating Spell Slots. As a Bonus Action, transform points into one spell slot (level 5 maximum). Any slot created this way vanishes when you finish a Long Rest.\n\n' +
          'Cost — Slot 1: 2 points (min. level 2) · Slot 2: 3 (level 3) · Slot 3: 5 (level 5) · Slot 4: 6 (level 7) · Slot 5: 7 (level 9)',
      },
      {
        level: 2,
        name: 'Metamagic',
        desc:
          'You gain two Metamagic options, and two more at levels 10 and 17. You can swap one whenever you gain a Sorcerer level. Only one option per spell unless an option says otherwise.\n\n' +
          'Cost in Sorcery Points is shown in brackets.\n\n' +
          '• Careful Spell (1) — Choose creatures up to your Charisma modifier; they automatically succeed on the save and take no damage where they would take half.\n' +
          '• Distant Spell (1) — Double a spell\'s range, or make a Touch spell 30 feet.\n' +
          '• Empowered Spell (1) — Reroll damage dice up to your Charisma modifier. Stacks with another option.\n' +
          '• Extended Spell (1) — Double a duration of 1 minute or longer, to a maximum of 24 hours; Advantage on Concentration saves for it.\n' +
          '• Heightened Spell (2) — One target has Disadvantage on saves against the spell.\n' +
          '• Quickened Spell (2) — Change a casting time of an action to a Bonus Action.\n' +
          '• Seeking Spell (1) — Reroll a missed spell attack d20. Stacks with another option.\n' +
          '• Subtle Spell (1) — Cast without Verbal, Somatic, or Material components (except consumed or costed materials).\n' +
          '• Transmuted Spell (1) — Change the damage type among Acid, Cold, Fire, Lightning, Poison, Thunder.\n' +
          '• Twinned Spell (1) — Increase the spell\'s effective level by 1 to target an additional creature.',
      },
      {
        level: 5,
        name: 'Sorcerous Restoration',
        desc: 'When you finish a Short Rest, you can regain expended Sorcery Points, up to half your Sorcerer level (round down). Once you use this feature, you can\'t do so again until you finish a Long Rest.',
      },
      {
        level: 7,
        name: 'Sorcery Incarnate',
        desc: 'If you have no uses of Innate Sorcery left, you can use it by spending 2 Sorcery Points when you take the Bonus Action to activate it.\n\nIn addition, while Innate Sorcery is active, you can use up to two Metamagic options on each spell you cast.',
      },
      {
        level: 19,
        name: 'Epic Boon',
        desc: 'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended.',
      },
      {
        level: 20,
        name: 'Arcane Apotheosis',
        desc: 'While your Innate Sorcery feature is active, you can use one Metamagic option on each of your turns without spending Sorcery Points on it.',
      },
    ],
    notes: [
      'Sorcery Points and Innate Sorcery uses are both tracked in the Resources panel.',
      'Slots created with Font of Magic vanish on a Long Rest — adjust your slots by hand when you make one.',
      'Ability Score Improvements come at levels 4, 8, 12 and 16 — taken as feats on the sheet.',
    ],
  },

  Wizard: {
    blurb: 'A scholarly magic-user, defined by exhaustive study of magic\'s inner workings.',
    features: [
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'Cantrips. You know three Wizard cantrips of your choice. Light, Mage Hand, and Ray of Frost are recommended. Whenever you finish a Long Rest, you can replace one of them with another Wizard cantrip. You learn another cantrip at Wizard levels 4 and 10.\n\n' +
          'Spellbook. Your spellbook is a Tiny object weighing 3 pounds, containing 100 pages, readable only by you or someone casting Identify. It starts with six level 1 Wizard spells of your choice — Detect Magic, Feather Fall, Mage Armor, Magic Missile, Sleep, and Thunderwave are recommended. Whenever you gain a Wizard level after 1, add two Wizard spells of your choice to it.\n\n' +
          'Prepared Spells of Level 1+. Choose four spells from your spellbook to start; the number grows with your level. The chosen spells must be of a level for which you have spell slots.\n\n' +
          'Changing Your Prepared Spells. Whenever you finish a Long Rest, you can replace any prepared spell with another from your spellbook.\n\n' +
          'Spellcasting Ability. Intelligence.  Spellcasting Focus. An Arcane Focus or your spellbook.\n\n' +
          'Copying spells into the book: 2 hours and 50 GP per spell level. Copying your own book into another: 1 hour and 10 GP per level.',
      },
      {
        level: 1,
        name: 'Ritual Adept',
        desc: 'You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn\'t have the spell prepared, but you must read from the book to cast a spell in this way.',
      },
      {
        level: 1,
        name: 'Arcane Recovery',
        desc:
          'When you finish a Short Rest, you can choose expended spell slots to recover. The slots can have a combined level equal to no more than half your Wizard level (round up), and none can be level 6 or higher. For example, at level 4 you can recover two levels\' worth: one level 2 slot, or two level 1 slots.\n\n' +
          'Once you use this feature, you can\'t do so again until you finish a Long Rest.',
      },
      {
        level: 2,
        name: 'Scholar',
        desc: 'While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill.',
      },
      {
        level: 5,
        name: 'Memorize Spell',
        desc: 'Whenever you finish a Short Rest, you can study your spellbook and replace one of the level 1+ Wizard spells you have prepared with another level 1+ spell from the book.',
      },
      {
        level: 18,
        name: 'Spell Mastery',
        desc:
          'Choose a level 1 and a level 2 spell in your spellbook that have a casting time of an action. You always have those spells prepared, and you can cast them at their lowest level without expending a spell slot. To cast either at a higher level, you must expend a spell slot.\n\n' +
          'Whenever you finish a Long Rest, you can study your spellbook and replace one of those spells with an eligible spell of the same level from the book.',
      },
      {
        level: 19,
        name: 'Epic Boon',
        desc: 'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.',
      },
      {
        level: 20,
        name: 'Signature Spells',
        desc: 'Choose two level 3 spells in your spellbook as your signature spells. You always have these spells prepared, and you can cast each of them once at level 3 without expending a spell slot. Once you do, you can\'t cast that spell in this way again until you finish a Short or Long Rest. To cast either at a higher level, you must expend a spell slot.',
      },
    ],
    notes: [
      'Arcane Recovery is tracked in the Quick Reference panel: once per Long Rest, taken on a Short Rest.',
      'Ability Score Improvements come at levels 4, 8, 12 and 16 — taken as feats on the sheet.',
      'Your spell list is your spellbook: tick a spell\'s Prepared box for the ones you have prepared today, and leave the rest as book-only.',
    ],
  },

  Cleric: {
    blurb: 'A miraculous priest of divine power, channelling the Outer Planes.',
    features: [
      {
        level: 1,
        name: 'Spellcasting',
        desc:
          'You have learned to cast spells through prayer and meditation.\n\n' +
          'Cantrips. You know three cantrips of your choice from the Cleric spell list. Guidance, Sacred Flame, and Thaumaturgy are recommended. You learn another cantrip at Cleric levels 4 and 10.\n\n' +
          'Prepared Spells of Level 1+. You prepare the list of level 1+ spells available for you to cast. To start, choose four level 1 spells — Bless, Cure Wounds, Guiding Bolt, and Shield of Faith are recommended. The number grows with your level; the chosen spells must be of a level for which you have spell slots.\n\n' +
          'Changing Your Prepared Spells. Whenever you finish a Long Rest, you can replace any of your prepared spells with other Cleric spells for which you have spell slots.\n\n' +
          'Spellcasting Ability. Wisdom.  Spellcasting Focus. A Holy Symbol.',
      },
      {
        level: 1,
        name: 'Divine Order',
        desc:
          'You have dedicated yourself to one of the following sacred roles of your choice.\n\n' +
          'Protector. Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor.\n\n' +
          'Thaumaturge. You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).',
      },
      {
        level: 2,
        name: 'Channel Divinity',
        desc:
          'You can channel divine energy directly from the Outer Planes to fuel magical effects. You start with two such effects: Divine Spark and Turn Undead.\n\n' +
          'You can use this class\'s Channel Divinity twice. You regain one expended use when you finish a Short Rest, and all expended uses when you finish a Long Rest. You gain more uses at Cleric levels 6 (3) and 18 (4).\n\n' +
          'If a Channel Divinity effect requires a saving throw, the DC equals your spell save DC.\n\n' +
          'Divine Spark. As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total, or force the creature to make a Constitution saving throw, taking Necrotic or Radiant damage (your choice) equal to that total on a failure, or half as much on a success. You roll an additional d8 at Cleric levels 7 (2d8), 13 (3d8), and 18 (4d8).\n\n' +
          'Turn Undead. As a Magic action, you present your Holy Symbol and censure Undead creatures. Each Undead of your choice within 30 feet must make a Wisdom saving throw. On a failure, it has the Frightened and Incapacitated conditions for 1 minute, and tries to move as far from you as it can on its turns. The effect ends early if the creature takes any damage, if you have the Incapacitated condition, or if you die.',
      },
      {
        level: 5,
        name: 'Sear Undead',
        desc:
          'Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum of 1d8) and add the rolls together. Each Undead that fails its saving throw against that use of Turn Undead takes Radiant damage equal to the total. This damage doesn\'t end the turn effect.',
      },
      {
        level: 7,
        name: 'Blessed Strikes',
        desc:
          'Divine power infuses you in battle. You gain one of the following options of your choice.\n\n' +
          'Divine Strike. Once on each of your turns when you hit a creature with an attack roll using a weapon, you can cause the target to take an extra 1d8 Necrotic or Radiant damage (your choice).\n\n' +
          'Potent Spellcasting. Add your Wisdom modifier to the damage you deal with any Cleric cantrip.',
      },
      {
        level: 10,
        name: 'Divine Intervention',
        desc:
          'You can call on your deity or pantheon to intervene on your behalf. As a Magic action, choose any Cleric spell of level 5 or lower that doesn\'t require a Reaction to cast. As part of the same action, you cast that spell without expending a spell slot or needing Material components. You can\'t use this feature again until you finish a Long Rest.',
      },
      {
        level: 14,
        name: 'Improved Blessed Strikes',
        desc:
          'The option you chose for Blessed Strikes grows more powerful.\n\n' +
          'Divine Strike. The extra damage of your Divine Strike increases to 2d8.\n\n' +
          'Potent Spellcasting. When you cast a Cleric cantrip and deal damage to a creature with it, you can give vitality to yourself or another creature within 60 feet, granting Temporary Hit Points equal to twice your Wisdom modifier.',
      },
      {
        level: 19,
        name: 'Epic Boon',
        desc: 'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended.',
      },
      {
        level: 20,
        name: 'Greater Divine Intervention',
        desc:
          'When you use your Divine Intervention feature, you can choose Wish when you select a spell. If you do so, you can\'t use Divine Intervention again until you finish 2d4 Long Rests.',
      },
    ],
    notes: [
      'Channel Divinity uses are tracked in the Quick Reference panel: 2 from level 2, 3 at level 6, 4 at level 18.',
      'Ability Score Improvements come at levels 4, 8, 12 and 16 — taken as feats on the sheet.',
    ],
  },
};

export function classFeaturesFor(className, level = null) {
  const entry = classEntry(className);
  if (!entry) return [];
  const all = entry.features || [];
  return level == null ? all : all.filter((f) => f.level <= level);
}

// THE HAND-WRITTEN CATALOGUE, THEN THE IMPORTED ONE.
//
// CLASS_FEATURES above covers the twelve classes of the 2024 PHB, which is
// every class in that book and not every class a character can be. An
// Artificer — printed in Eberron: Forge of the Artificer, not the PHB — had no
// entry, so the Features tab showed the species and the background and nothing
// for the class itself. The imported progression stands in wherever the
// hand-written one has nothing to say; it never overrides it, so the curated
// wording still wins for the classes that have it.
export function classEntry(className) {
  const name = String(className || '').trim();
  return CLASS_FEATURES[name] || IMPORTED_CLASS_FEATURES[name] || null;
}

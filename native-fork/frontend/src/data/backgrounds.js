// SRD 5.2.1 (2024) backgrounds. Only the four WotC released as open
// content live here; homebrew or PHB-only backgrounds aren't included.
//
// Each background grants:
//   • Three listed ability scores. Player chooses +2/+1 across two of
//     them OR +1/+1/+1 across all three (no score may exceed 20).
//   • One Origin feat.
//   • Two skill proficiencies.
//   • One tool proficiency.
//   • A starting equipment package OR 50 GP.
//
// The shape mirrors the race catalog so the apply/revert logic looks
// the same: `applyBackground` writes into form fields and tags the
// added entries with __source = 'background:<id>' so a future swap
// can strip just those again.

export const BACKGROUNDS_2024 = [
  {
    id: 'acolyte-2024',
    name: 'Acolyte',
    edition: 'srd2024',
    description:
      "You devoted yourself to service in a temple, either nestled in a town or hidden in a sacred grove. There you performed sacred rites in honor of a god or pantheon. You served under a priest and studied religion. Thanks to your priestly experience, you have established contacts with other temples and can find a warm welcome at one whose faith aligns with yours.",
    abilities: ['intelligence', 'wisdom', 'charisma'],
    feat: { name: 'Magic Initiate (Cleric)', desc: 'Origin feat granted by the Acolyte background. You learn two cleric cantrips of your choice and one 1st-level cleric spell, and gain a small pool of spell uses. (See "Feats" in the SRD for the full text.)' },
    skills: ['skill_insight', 'skill_religion'],
    tool: "Calligrapher's Supplies",
    equipment_a_items: [
      { name: "Calligrapher's Supplies", qty: 1 },
      { name: 'Book (prayers)',          qty: 1 },
      { name: 'Holy Symbol',              qty: 1 },
      { name: 'Parchment',                qty: 10 },
      { name: 'Robe',                      qty: 1 },
    ],
    equipment_a_gp: 8,
    equipment_b_gp: 50,
  },
  {
    id: 'criminal-2024',
    name: 'Criminal',
    edition: 'srd2024',
    description:
      "You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld. You're far closer than most people to the world of murder, theft, and violence that pervades the underbelly of civilization, and you have survived up to this point by flouting the rules and bending the law.",
    abilities: ['dexterity', 'constitution', 'intelligence'],
    feat: { name: 'Alert', desc: 'Origin feat granted by the Criminal background. Adds your Proficiency Bonus to Initiative rolls and lets you swap initiative with a willing ally. (See "Feats" in the SRD for the full text.)' },
    skills: ['skill_sleight_of_hand', 'skill_stealth'],
    tool: "Thieves' Tools",
    equipment_a_items: [
      { name: 'Dagger',           qty: 2 },
      { name: "Thieves' Tools",   qty: 1 },
      { name: 'Crowbar',           qty: 1 },
      { name: 'Pouch',             qty: 2 },
      { name: "Traveler's Clothes", qty: 1 },
    ],
    equipment_a_gp: 16,
    equipment_b_gp: 50,
  },
  {
    id: 'sage-2024',
    name: 'Sage',
    edition: 'srd2024',
    description:
      "You spent your formative years studying the ways of magic or some other body of esoteric lore. You might have been a tutor, a sage, an assistant in a magical college, or an apprentice to a wizard. Whatever the case, study and the pursuit of knowledge define you. You see the world as a thing to be analyzed, and your reflexive response to a problem is to research it.",
    abilities: ['constitution', 'intelligence', 'wisdom'],
    feat: { name: 'Magic Initiate (Wizard)', desc: 'Origin feat granted by the Sage background. You learn two wizard cantrips of your choice and one 1st-level wizard spell, and gain a small pool of spell uses. (See "Feats" in the SRD for the full text.)' },
    skills: ['skill_arcana', 'skill_history'],
    tool: "Calligrapher's Supplies",
    equipment_a_items: [
      { name: 'Quarterstaff',             qty: 1 },
      { name: "Calligrapher's Supplies", qty: 1 },
      { name: 'Book (history)',           qty: 1 },
      { name: 'Parchment',                qty: 8 },
      { name: 'Robe',                      qty: 1 },
    ],
    equipment_a_gp: 8,
    equipment_b_gp: 50,
  },
  {
    id: 'soldier-2024',
    name: 'Soldier',
    edition: 'srd2024',
    description:
      "Your formative years were spent on a battlefield, either as a member of an army or as a freelance combatant. You may have been a foot soldier, a cavalry officer, a quartermaster, or a scout. Whatever your role, you learned the realities of life in a fighting force and gained the discipline that comes from training and combat.",
    abilities: ['strength', 'dexterity', 'constitution'],
    feat: { name: 'Savage Attacker', desc: 'Origin feat granted by the Soldier background. Once per turn, when you roll damage for a melee weapon attack, you can roll the damage dice again and use either total. (See "Feats" in the SRD for the full text.)' },
    skills: ['skill_athletics', 'skill_intimidation'],
    tool: 'Gaming Set (player\'s choice)',
    equipment_a_items: [
      { name: 'Spear',                     qty: 1 },
      { name: 'Shortbow',                  qty: 1 },
      { name: 'Arrows',                    qty: 20 },
      { name: 'Gaming Set',                qty: 1 },
      { name: "Healer's Kit",              qty: 1 },
      { name: 'Quiver',                     qty: 1 },
      { name: "Traveler's Clothes",        qty: 1 },
    ],
    equipment_a_gp: 14,
    equipment_b_gp: 50,
  },
];

export function findBackground(id) {
  return BACKGROUNDS_2024.find((b) => b.id === id) || null;
}

// Friendly skill labels for the modal — keys mirror the form field
// names (skill_insight, skill_religion, …) so wiring a checkbox is
// trivial.
export const SKILL_LABELS = {
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

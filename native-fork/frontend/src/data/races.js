// Race catalogue — REGENERATED FROM CSV. Edit the source CSVs in
// race-data/ and re-run `python3 race-data/build_races_js.py`.

export const RACE_EDITIONS = [
  { id: 'all', label: 'All editions' },
  { id: 'srd2024', label: 'D&D 2024 SRD' },
  { id: 'srd2014', label: 'D&D 5e (2014 SRD)' },
];

// Short tag for a race's edition, used where both are listed together.
export function editionLabel(edition) {
  if (edition === 'srd2024') return '2024';
  if (edition === 'srd2014') return '2014';
  return edition || '';
}

export const RACE_CATALOG = [
  {
    "id": "aarakocra-2014",
    "name": "Aarakocra",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Flight",
        "desc": "Because of your wings, you have a flying speed equal to your walking speed. You can't use this flying speed if you're wearing medium or heavy armor.",
        "category": "specialAbility"
      },
      {
        "name": "Talons",
        "desc": "You have talons that you can use to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier slashing damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Wind Caller",
        "desc": "Starting at 3rd level, you can cast the Gust Of Wind spell with this trait, without requiring a material component. Once you cast the spell with this trait, you can't do so again until you finish a long rest. You can also cast the spell using any spell slots you have of 2nd level or higher.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for when you cast Gust Of Wind with this trait (choose when you select this race).",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "aasimar-2014",
    "name": "Aasimar",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to necrotic and radiant damage.",
        "category": "specialAbility"
      },
      {
        "name": "Celestial Resistance",
        "desc": "You have resistance to necrotic damage and radiant damage.",
        "category": "specialAbility"
      },
      {
        "name": "Healing Hands",
        "desc": "As an action, you can touch a creature and roll a number of d4s equal to your proficiency bonus. The creature regains a number of hit points equal to the total rolled. Once you use this trait, you can't use it again until you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Light Bearer",
        "desc": "You know the Light cantrip. Charisma is your spellcasting ability for it.",
        "category": "specialAbility"
      },
      {
        "name": "Celestial Revelation",
        "desc": "When you reach 3rd level, choose one of the revelation options below. Thereafter, you can use a bonus action to unleash the celestial energy within yourself, gaining the benefits of that revelation. Your transformation lasts for 1 minute or until you end it as a bonus action. Once you transform using your revelation below, you can't use it again until you finish a long rest.\n• Necrotic Shroud: \n• Radiant Consumption: \n• Radiant Soul:",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "necrotic",
      "radiant"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "aasimar-fallen-2014",
        "name": "Aasimar Fallen",
        "traits": [
          {
            "name": "Necrotic Shroud",
            "desc": "Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing your eyes to turn into pools of darkness and two skeletal, ghostly, flightless wings to sprout from your back. The instant you transform, other creatures within 10 feet of you that can see you must succeed on a Charisma saving throw (DC 8 + your proficiency bonus + your Charisma modifier) or become frightened of you until the end of your next turn.\nYour transformation lasts for 1 minute or until you end it as a bonus action. During it, once on each of your turns, you can deal extra necrotic damage to one target when you deal damage to it with an attack or a spell. The extra necrotic damage equals your level.\nOnce you use this trait, you can't use it again until you finish a long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "aasimar-protector-2014",
        "name": "Aasimar Protector",
        "traits": [
          {
            "name": "Radiant Soul",
            "desc": "Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing your eyes to glimmer and two luminous, incorporeal wings to sprout from your back.\nYour transformation lasts for 1 minute or until you end it as a bonus action. During it, you have a flying speed of 30 feet, and once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level.\nOnce you use this trait, you can't use it again until you finish a long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "aasimar-scourge-2014",
        "name": "Aasimar Scourge",
        "traits": [
          {
            "name": "Radiant Consumption",
            "desc": "Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing a searing light to radiate from you, pour out of your eyes and mouth, and threaten to char you.\nYour transformation lasts for 1 minute or until you end it as a bonus action. During it, you shed bright light in a 10-foot radius and dim light for an additional 10 feet, and at the end of each of your turns, you and each creature within 10 feet of you take radiant damage equal to half your level (rounded up). In addition, once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level.\nOnce you use this trait, you can't use it again until you finish a long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "aetherborn-2014",
    "name": "Aetherborn",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Thanks to your heritage, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Intimidation.",
        "category": "specialAbility"
      },
      {
        "name": "Born of Aether",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Menacing",
        "desc": "You have proficiency in the Intimidation skill.",
        "category": "specialAbility"
      },
      {
        "name": "Gift of the Aetherborn",
        "desc": "An unknown aetherborn, desperately seeking a means to extend their short life, discovered a process of transformation that prolonged their existence—by giving them the ability to feed on the life essence of other beings. Since then, other aetherborn have learned and carried out this monstrous transformation, and aetherborn with this \"gift\" have become a small minority among an already small population.\nA gifted aetherborn has the ability to drain the life essence of other beings. Similar to the way heat is transferred from a warm object to a cold one, a gifted aetherborn need only touch another living being with a clawed hand to draw life essence out, fueling their own continued existence while draining strength and vitality from their victim.\nFor many aetherborn, living as they do for indulgence and instant gratification, the concepts of \"want\" and \"need\" are virtually synonymous. But Aetherborn with this gift understand what it is to truly need, for they develop a hunger for life essence that far exceeds any desires they might have felt before their transformation. A gifted aetherborn who abstains from this feeding deteriorates even more rapidly than other aetherborn, while enduring unspeakable agony caused by the deprivation of life energy.\nAt the DM's option, an aetherborn character can research methods of achieving this dark \"gift.\" The process is similar to inventing and manufacturing a rare magic item (see \"1\" earlier in this document). But rather than aether, the process requires a variety of rare unguents and unusual ingredients that make up the cost of researching and undergoing the transformation.\nAn aetherborn with this gift gains the Drain Life ability: a natural attack that deals 1d6 necrotic damage and restores the same number of hit points to the aetherborn. However, if the aetherborn goes for 7 days without dealing this damage, their hit point maximum is reduced by 1d6 per week. This reduction can't be removed until the aetherborn has used their Drain Life ability and completed a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "necrotic"
    ],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_intimidation",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "astral-elf-2014",
    "name": "Astral Elf",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of yourself as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered an elf for any prerequisite or effect that requires you to be an elf.",
        "category": "specialAbility"
      },
      {
        "name": "Astral Fire",
        "desc": "You know one of the following cantrips of your choice: Dancing Lights, Light, or Sacred Flame. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Starlight Step",
        "desc": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Astral Trance",
        "desc": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you remain conscious.\nWhenever you finish this trance, you gain proficiency in one skill of your choice and with one weapon or tool of your choice, selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory and the experiences of entities on the Astral Plane, and you retain them until you finish your next long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "autognome-2014",
    "name": "Autognome",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Construct.",
        "category": "specialAbility"
      },
      {
        "name": "Armored Casing",
        "desc": "You are encased in thin metal or some other durable material. While you aren't wearing armor, your base Armor Class is 13 + your Dexterity modifier.",
        "category": "specialAbility"
      },
      {
        "name": "Built for Success",
        "desc": "You can add a d4 to one attack roll, ability check, or saving throw you make, and you can do so after seeing the d20 roll but before the effects of the roll are resolved. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Healing Machine",
        "desc": "If the Mending spell is cast on you, you can spend a Hit Die, roll it, and regain a number of hit points equal to the roll plus your Constitution modifier (minimum of 1 hit point).\nIn addition, your creator designed you to benefit from several spells that preserve life but that normally don't affect Constructs: Cure Wounds, Healing Word, Mass Cure Wounds, Mass Healing Word, and Spare The Dying.",
        "category": "specialAbility"
      },
      {
        "name": "Mechanical Nature",
        "desc": "You have resistance to poison damage and immunity to disease, and you have advantage on saving throws against being paralyzed or poisoned. You don't need to eat, drink, or breathe.",
        "category": "specialAbility"
      },
      {
        "name": "Sentry's Rest",
        "desc": "When you take a long rest, you spend at least 6 hours in an inactive, motionless state, instead of sleeping. In this state, you appear inert, but you remain conscious.",
        "category": "specialAbility"
      },
      {
        "name": "Specialized Design",
        "desc": "You gain two tool proficiencies of your choice, selected from the Player's Handbook.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "aven-2014",
    "name": "Aven",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Flight",
        "desc": "You have a flying speed of 30 feet. You can't use your flying speed while you wear medium or heavy armor. (If your campaign uses the variant rule for encumbrance, you can't use your flying speed if you are encumbered.)",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 25,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "aven-hawk-headed-2014",
        "name": "Aven Hawk Headed",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Perception.",
            "category": "specialAbility"
          },
          {
            "name": "Hawkeyed",
            "desc": "You have proficiency in the Perception skill. In addition, attacking at long range doesn't impose disadvantage on your ranged weapon attack rolls.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_perception",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "aven-ibis-headed-2014",
        "name": "Aven Ibis Headed",
        "traits": [
          {
            "name": "Kefnet's Blessing",
            "desc": "You can add half your proficiency bonus, rounded down, to any Intelligence check you make that doesn't already include your proficiency bonus.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "boggart-2014",
    "name": "Boggart",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were in dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a goblinoid for any prerequisite or effect that requires you to be a goblinoid.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Fury of the Small",
        "desc": "When you damage a creature with an attack or a spell and the creature's size is larger than yours, you can cause the attack or spell to deal extra damage to the creature. The extra damage equals your proficiency bonus.\nYou can use this trait a number of times equal to your proficiency bonus, regaining all expended uses when you finish a long rest, and you can use it no more than once per turn.",
        "category": "specialAbility"
      },
      {
        "name": "Nimble Escape",
        "desc": "You can take the Disengage or Hide action as a bonus action on each of your turns.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "bugbear-2014",
    "name": "Bugbear",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Stealth.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a goblinoid for any prerequisite or effect that requires you to be a goblinoid.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Long-Limbed",
        "desc": "When you make a melee attack on your turn, your reach for it is 5 feet greater than normal.",
        "category": "specialAbility"
      },
      {
        "name": "Powerful Build",
        "desc": "You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      },
      {
        "name": "Sneaky",
        "desc": "You are proficient in the Stealth skill. In addition, without squeezing, you can move through and stop in a space large enough for a Small creature.",
        "category": "specialAbility"
      },
      {
        "name": "Surprise Attack",
        "desc": "If you hit a creature with an attack roll, the creature takes an extra 2d6 damage if it hasn't taken a turn yet in the current combat.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_stealth",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "bullywug-2014",
    "name": "Bullywug",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Amphibious",
        "desc": "You can breathe air and water.",
        "category": "specialAbility"
      },
      {
        "name": "Speak with Frogs and Toads",
        "desc": "You can communicate simple concepts to frogs and toads when you speak in Bullywug.",
        "category": "specialAbility"
      },
      {
        "name": "Swamp Camouflage",
        "desc": "You have advantage on Dexterity (Stealth) checks made to hide in swampy terrain.",
        "category": "specialAbility"
      },
      {
        "name": "Standing Leap",
        "desc": "Your long jump is up to 20 feet and your high jump is up to 10 feet, with or without a running start.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 20,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 40,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "centaur-2014",
    "name": "Centaur",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Fey.",
        "category": "specialAbility"
      },
      {
        "name": "Charge",
        "desc": "If you move at least 30 feet straight toward a target and then hit it with a melee weapon attack on the same turn, you can immediately follow that attack with a bonus action, making one attack against the target with your hooves.",
        "category": "specialAbility"
      },
      {
        "name": "Equine Build",
        "desc": "You count as one size larger when determining your carrying capacity and the weight you can push or drag.\nIn addition, any climb that requires hands and feet is especially difficult for you because of your equine legs. When you make such a climb, each foot of movement costs you 4 extra feet instead of the normal 1 extra foot.",
        "category": "specialAbility"
      },
      {
        "name": "Hooves",
        "desc": "You have hooves that you can use to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier bludgeoning damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Affinity",
        "desc": "Your fey connection to nature gives you an intuitive connection to the natural world and the animals within it. You therefore have proficiency in one of the following skills of your choice: Animal Handling, Medicine, Nature, or Survival.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 40,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "changeling-2014",
    "name": "Changeling",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Fey.",
        "category": "specialAbility"
      },
      {
        "name": "Changeling Instincts",
        "desc": "Thanks to your connection to the fey realm, you gain proficiency with two of the following skills of your choice: Deception, Insight, Intimidation, Performance, or Persuasion.",
        "category": "specialAbility"
      },
      {
        "name": "Shapechanger",
        "desc": "As an action, you change your appearance and your voice. You determine the specifics of the changes, including your coloration, hair length, and sex. You can also adjust your height between Medium and Small. You can make yourself appear as a member of another race, though none of your game statistics change. You can't duplicate the appearance of an individual you've never seen, and you must adopt a form that has the same basic arrangement of limbs that you have. Your clothing and equipment aren't changed by this trait.\nYou stay in the new form until you use an action to revert to your true form or until you die.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "custom-lineage-2014",
    "name": "Custom Lineage",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a humanoid. You determine your appearance and whether you resemble any of your kin.",
        "category": "specialAbility"
      },
      {
        "name": "Feat",
        "desc": "You gain one feat of your choice for which you qualify.",
        "category": "specialAbility"
      },
      {
        "name": "Variable Trait",
        "desc": "You gain one of the following options of your choice: (a) darkvision with a range of 60 feet or (b) proficiency in one skill of your choice.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "deep-gnome-2014",
    "name": "Deep Gnome",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 120 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a gnome for any prerequisite or effect that requires you to be a gnome.",
        "category": "specialAbility"
      },
      {
        "name": "Gift of the Svirfneblin",
        "desc": "Starting at 3rd level, you can cast the Disguise Self spell with this trait. Starting at 5th level, you can also cast the Nondetection spell with it, without requiring a material component. Once you cast either of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these using spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Gnomish Magic Resistance",
        "desc": "You have advantage on Intelligence, Wisdom, and Charisma saving throws against spells.",
        "category": "specialAbility"
      },
      {
        "name": "Svirfneblin Camouflage",
        "desc": "When you make a Dexterity (Stealth) check, you can make the check with advantage. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "dhampir-2014",
    "name": "Dhampir",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Spider Climb",
        "desc": "You have a Climb Speed equal to your Speed. When you reach character level 3, you can move up, down, and across vertical surfaces and along ceilings while leaving your hands free.",
        "category": "specialAbility"
      },
      {
        "name": "Trace of Undeath",
        "desc": "You have Resistance to Necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Vampiric Bite",
        "desc": "When you use your Unarmed Strike and deal damage, you can choose to bite with your fangs. You deal Piercing damage equal to 1d4 plus your Constitution modifier instead of the normal damage of an Unarmed Strike.\nIn addition, when you deal this damage to a creature that isn't a Construct or an Undead, you can empower yourself in one of the following ways:\n• Drain: You regain Hit Points equal to the Piercing damage dealt.\n• Strengthen: You gain a bonus to the next ability check or attack roll you make within the next minute; the bonus is equal to the Piercing damage dealt.\nYou can empower yourself with this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 35,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "necrotic"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 35,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "dragonborn-2014",
    "name": "Dragonborn",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Draconic Ancestry",
        "desc": "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type, as shown in the table.",
        "category": "specialAbility"
      },
      {
        "name": "Breath Weapon",
        "desc": "You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation.\nWhen you use your breath weapon, each creature in the area of the exhalation must make a saving throw, the type of which is determined by your draconic ancestry. The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level.\nAfter you use your breath weapon, you can't use it again until you complete a short or long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to the damage type associated with your draconic ancestry.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Draconic"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "dragonborn-chromatic-2014",
        "name": "Chromatic Dragonborn (FTD)",
        "traits": [
          {
            "name": "Chromatic Ancestry",
            "desc": "You have a chromatic dragon ancestor, granting you a special magical affinity. Choose one kind of dragon from the Chromatic Ancestry table. This determines the damage type for your other traits, as shown in the table.\nDragon | Damage Type\nBlack — Acid\nBlue — Lightning\nGreen — Poison\nRed — Fire\nWhite — Cold",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon",
            "desc": "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in a 30-foot line that is 5 feet wide. Each creature in that area must make a Dexterity saving throw (DC = 8 + your Constitution modifier + your proficiency bonus). On a failed save, the creature takes 1d10 damage of the type associated with your Chromatic Ancestry. On a successful save, it takes half as much damage. This damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).\nYou can use your Breath Weapon a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Draconic Resistance",
            "desc": "You have resistance to the damage type associated with your Chromatic Ancestry.",
            "category": "specialAbility"
          },
          {
            "name": "Chromatic Warding",
            "desc": "Starting at 5th level, as an action, you can channel your draconic energy to protect yourself. For 1 minute, you become immune to the damage type associated with your Chromatic Ancestry. Once you use this trait, you can't do so again until you finish a long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-draconblood-2014",
        "name": "Dragonborn Draconblood",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Forceful Presence",
            "desc": "You can use your understanding of creative diplomacy or intimidation to guide a conversation in your favor. When you make a Charisma (Intimidation or Persuasion) check, you can do so with advantage. Once you use this trait, you can't do so again until you finish a short or long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Draconic Ancestry",
            "desc": "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon is determined by the dragon type, as shown in the table.\nDragon | Damage Type | Breath Weapon\nBlack — Acid — 5 by 30 ft. line (Dex. save)\nBlue — Lightning — 5 by 30 ft. line (Dex. save)\nBrass — Fire — 5 by 30 ft. line (Dex. save)\nBronze — Lightning — 5 by 30 ft. line (Dex. save)\nCopper — Acid — 5 by 30 ft. line (Dex. save)\nGold — Fire — 15 ft. cone (Dex. save)\nGreen — Poison — 15 ft. cone (Con. save)\nRed — Fire — 15 ft. cone (Dex. save)\nSilver — Cold — 15 ft. cone (Con. save)\nWhite — Cold — 15 ft. cone (Con. save)",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-gem-2014",
        "name": "Gem Dragonborn (FTD)",
        "traits": [
          {
            "name": "Gem Ancestry",
            "desc": "You have a gem dragon ancestor, granting you a special magical affinity. Choose one kind of dragon from the Gem Ancestry table. This determines the damage type for your other traits, as shown in the table.\nDragon | Damage Type\nAmethyst — Force\nCrystal — Radiant\nEmerald — Psychic\nSapphire — Thunder\nTopaz — Necrotic",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon",
            "desc": "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in a 15-foot cone. Each creature in that area must make a Dexterity saving throw (DC = 8 + your Constitution modifier + your proficiency bonus). On a failed save, the creature takes 1d10 damage of the type associated with your Gem Ancestry. On a successful save, it takes half as much damage. This damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).\nYou can use your Breath Weapon a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Draconic Resistance",
            "desc": "You have resistance to the damage type associated with your Gem Ancestry.",
            "category": "specialAbility"
          },
          {
            "name": "Psionic Mind",
            "desc": "You can send telepathic messages to any creature you can see within 30 feet of you. You don't need to share a language with the creature for it to understand these messages, but it must be able to understand at least one language to comprehend them.",
            "category": "specialAbility"
          },
          {
            "name": "Gem Flight",
            "desc": "Starting at 5th level, you can use a bonus action to manifest spectral wings on your body. These wings last for 1 minute. For the duration, you gain a flying speed equal to your walking speed and can hover. Once you use this trait, you can't do so again until you finish a long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-metallic-2014",
        "name": "Metallic Dragonborn (FTD)",
        "traits": [
          {
            "name": "Metallic Ancestry",
            "desc": "You have a metallic dragon ancestor, granting you a special magical affinity. Choose one kind of dragon from the Metallic Ancestry table. This determines the damage type for your other traits, as shown in the table.\nDragon | Damage Type\nBrass — Fire\nBronze — Lightning\nCopper — Acid\nGold — Fire\nSilver — Cold",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon",
            "desc": "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in a 15-foot cone. Each creature in that area must make a Dexterity saving throw (DC = 8 + your Constitution modifier + your proficiency bonus). On a failed save, the creature takes 1d10 damage of the type associated with your Metallic Ancestry. On a successful save, it takes half as much damage. This damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).\nYou can use your Breath Weapon a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Draconic Resistance",
            "desc": "You have resistance to the damage type associated with your Metallic Ancestry.",
            "category": "specialAbility"
          },
          {
            "name": "Metallic Breath Weapon",
            "desc": "At 5th level, you gain a second breath weapon. When you take the Attack action on your turn, you can replace one of your attacks with an exhalation in a 15-foot cone. The save DC for this breath is 8 + your Constitution modifier + your proficiency bonus. Whenever you use this trait, choose one:\n• Enervating Breath: Each creature in the cone must succeed on a Constitution saving throw or become incapacitated until the start of your next turn.\n• Repulsion Breath: Each creature in the cone must succeed on a Strength saving throw or be pushed 20 feet away from you and be knocked prone.\nOnce you use your Metallic Breath Weapon, you can't do so again until you finish a long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-ravenite-2014",
        "name": "Dragonborn Ravenite",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Vengeful Assault",
            "desc": "When you take damage from a creature in range of a weapon you are wielding, you can use your reaction to make an attack with the weapon against that creature. Once you use this trait, you can't do so again until you finish a short or long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Draconic Ancestry",
            "desc": "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon is determined by the dragon type, as shown in the table.\nDragon | Damage Type | Breath Weapon\nBlack — Acid — 5 by 30 ft. line (Dex. save)\nBlue — Lightning — 5 by 30 ft. line (Dex. save)\nBrass — Fire — 5 by 30 ft. line (Dex. save)\nBronze — Lightning — 5 by 30 ft. line (Dex. save)\nCopper — Acid — 5 by 30 ft. line (Dex. save)\nGold — Fire — 15 ft. cone (Dex. save)\nGreen — Poison — 15 ft. cone (Con. save)\nRed — Fire — 15 ft. cone (Dex. save)\nSilver — Cold — 15 ft. cone (Con. save)\nWhite — Cold — 15 ft. cone (Con. save)",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "duergar-2014",
    "name": "Duergar",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 120 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a dwarf for any prerequisite or effect that requires you to be a dwarf.",
        "category": "specialAbility"
      },
      {
        "name": "Duergar Magic",
        "desc": "Starting at 3rd level, you can cast the Enlarge/Reduce spell on yourself with this trait, without requiring a material component. Starting at 5th level, you can also cast the Invisibility spell on yourself with this trait, without requiring a material component. Once you cast either of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these spells using spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Dwarven Resilience",
        "desc": "You have advantage on saving throws you make to avoid or end the poisoned condition on yourself. You also have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Psionic Fortitude",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed or stunned condition on yourself.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "dwarf-2014",
    "name": "Dwarf",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Dwarven Resilience",
        "desc": "You have advantage on saving throws against poison, and you have resistance against poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Dwarven Combat Training",
        "desc": "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.",
        "category": "specialAbility"
      },
      {
        "name": "Tool Proficiency",
        "desc": "You gain proficiency with the artisan's tools of your choice: smith's tools, brewer's supplies, or mason's tools.",
        "category": "specialAbility"
      },
      {
        "name": "Stonecunning",
        "desc": "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check, instead of your normal proficiency bonus.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 25,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Dwarvish"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "dwarf-duergar-2014",
        "name": "Dwarf Duergar",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
            "category": "specialAbility"
          },
          {
            "name": "Superior Darkvision",
            "desc": "Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Duergar Resilience",
            "desc": "You have advantage on saving throws against poison, and you have resistance against poison damage. You also have advantage on saving throws against illusions and against being charmed or paralyzed.",
            "category": "specialAbility"
          },
          {
            "name": "Duergar Magic",
            "desc": "When you reach 3rd level, you can cast the Enlarge/Reduce spell on yourself once with this trait, using only the spell's enlarge option. When you reach 5th level, you can cast the Invisibility spell on yourself once with this trait. You don't need material components for either spell, and you can't cast them while you're in direct sunlight, although sunlight has no effect on them once cast. You regain the ability to cast these spells with this trait when you finish a long rest. Intelligence is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Sunlight Sensitivity",
            "desc": "You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 120
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Dwarvish",
          "Undercommon"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dwarf-hill-2014",
        "name": "Dwarf Hill",
        "traits": [
          {
            "name": "Dwarven Toughness",
            "desc": "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dwarf-kaladesh-2014",
        "name": "Kaladesh Dwarf",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "Accustomed to life underground in your race's ancient past, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Damage Resistance",
            "desc": "You have resistance to poison damage.",
            "category": "specialAbility"
          },
          {
            "name": "Dwarven Resilience",
            "desc": "You have advantage on saving throws against poison, and you have resistance against poison damage.",
            "category": "specialAbility"
          },
          {
            "name": "Dwarven Toughness",
            "desc": "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
            "category": "specialAbility"
          },
          {
            "name": "Artisan's Expertise",
            "desc": "You gain proficiency with two kinds of source=phb of your choice. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies. In addition, whenever you make an Intelligence (History) check related to the origin of any architectural construction (including buildings, public works such as canals and aqueducts, and the massive cogwork that underlies much of the construction of Ghirapur), you are considered proficient in the History skill and add double your proficiency bonus to the check, instead of your normal proficiency bonus.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 25,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [
          "poison"
        ],
        "addsLanguages": [
          "Common",
          "Dwarvish"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dwarf-mark-of-warding-2014",
        "name": "Dwarf Mark Of Warding",
        "traits": [
          {
            "name": "Warder's Intuition",
            "desc": "When you make an Intelligence (Investigation) check or an ability check using thieves' tools, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Wards and Seals",
            "desc": "You can cast the Alarm and Mage Armor spells with this trait. Starting at 3rd level, you can also cast the Arcane Lock spell with it. Once you cast any of these spells with this trait, you can't cast that spell with it again until you finish a long rest. Intelligence is your spellcasting ability for these spells, and you don't need material components for them when you cast them with this trait.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Warding Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Alarm, Armor Of Agathys\n2nd — Arcane Lock, Knock\n3rd — Glyph Of Warding, Magic Circle\n4th — Leomund'S Secret Chest, Mordenkainen'S Faithful Hound\n5th — Antilife Shell",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dwarf-mountain-2014",
        "name": "Dwarf Mountain",
        "traits": [
          {
            "name": "Dwarven Armor Training",
            "desc": "You have proficiency with light and medium armor.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "hill-dwarf-2014",
        "name": "Hill Dwarf",
        "traits": [
          {
            "name": "Dwarven Toughness",
            "desc": "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "eladrin-2014",
    "name": "Eladrin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered an elf for any prerequisite or effect that requires you to be an elf.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Step",
        "desc": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nWhen you reach 3rd level, your Fey Step gain an additional effect based on your season; if the effect requires a saving throw, the DC equals 8 + your proficiency bonus + your Intelligence, Wisdom, or Charisma modifier (choose when you select this race):\n• Autumn: \n• Winter: \n• Spring: \n• Summer:",
        "category": "specialAbility"
      },
      {
        "name": "Keen Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Trance",
        "desc": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.\nWhenever you finish this trance, you can change your season, and you can gain two proficiencies that you don't have, each one with a 5 or a 5 of your choice selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory, and you retain them until you finish your next long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "elf-2014",
    "name": "Elf",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Accustomed to twilit forests and the night sky, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        "category": "specialAbility"
      },
      {
        "name": "Trance",
        "desc": "Elves don't need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. (The Common word for such meditation is “trance.”) While meditating, you can dream after a fashion; such dreams are actually mental exercises that have become reflexive through years of practice.\nAfter resting in this way, you gain the same benefit that a human does from 8 hours of sleep.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Elvish"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "elf-bishatar-and-tirahar-2014",
        "name": "Elf Bishatar And Tirahar",
        "traits": [
          {
            "name": "Fleet of Foot",
            "desc": "Your ground speed increases to 35 feet.",
            "category": "specialAbility"
          },
          {
            "name": "Mask of the Wild",
            "desc": "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 35,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-drow-2014",
        "name": "Drow",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
            "category": "specialAbility"
          },
          {
            "name": "Superior Darkvision",
            "desc": "Accustomed to the depths of the Underdark, you have superior vision in dark and dim conditions. You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Sunlight Sensitivity",
            "desc": "You have disadvantage on attack rolls and on Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight.",
            "category": "specialAbility"
          },
          {
            "name": "Drow Magic",
            "desc": "You know the Dancing Lights cantrip. When you reach 3rd level, you can cast the Faerie Fire spell once with this trait; you regain the ability to cast it when you finish a long rest. When you reach 5th level, you can also cast the Darkness spell once per day with this trait; you regain the ability to cast it when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Drow Weapon Training",
            "desc": "You have proficiency with rapiers, shortswords, and hand crossbows.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 120
          }
        ],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-eladrin-2014",
        "name": "Elf Eladrin",
        "traits": [
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          },
          {
            "name": "Fey Step",
            "desc": "You can cast the Misty Step spell once using this trait. You regain the ability to do so when you finish a short or long rest.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-high-2014",
        "name": "High Elf",
        "traits": [
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip",
            "desc": "You know one level=0. Intelligence is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Extra Language",
            "desc": "You can speak, read, and write one extra language of your choosing.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Elvish"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-joraga-nation-2014",
        "name": "Elf Joraga Nation",
        "traits": [
          {
            "name": "Mask of the Wild",
            "desc": "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.",
            "category": "specialAbility"
          },
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          },
          {
            "name": "Fleet of Foot",
            "desc": "Your ground speed increases to 35 feet.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 35,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-kaladesh-2014",
        "name": "Kaladesh Elf",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "Accustomed to twilit forests and the night sky, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Skills",
            "desc": "You have proficiency in Perception.",
            "category": "specialAbility"
          },
          {
            "name": "Keen Senses",
            "desc": "You have proficiency in the Perception skill.",
            "category": "specialAbility"
          },
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          },
          {
            "name": "Fey Ancestry",
            "desc": "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
            "category": "specialAbility"
          },
          {
            "name": "Trance",
            "desc": "Elves don't need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. (The Common word for such meditation is \"trance.\") While meditating, you can dream after a fashion; such dreams are actually mental exercises that have become reflexive through years of practice. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep.\nIf you meditate during a long rest, you finish the rest after only 4 hours. You otherwise obey all the rules for a long rest; only the duration is changed.",
            "category": "specialAbility"
          },
          {
            "name": "Elf Culture",
            "desc": "The elves of Kaladesh don't organize themselves into nations or tribes. Still, they recognize three distinct cultural groups among their kind—though in truth these groupings are more like attitudes or alignments with regard to the rest of society and the use of technology. Choose one of these cultures.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Elvish"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_perception",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-mark-of-shadow-2014",
        "name": "Elf Mark Of Shadow",
        "traits": [
          {
            "name": "Cunning Intuition",
            "desc": "When you make a Charisma (Performance) or Dexterity (Stealth) check, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Shape Shadows",
            "desc": "You know the Minor Illusion cantrip. Starting at 3rd level, you can cast the Invisibility spell once with this trait, and you regain the ability to cast it when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Shadow Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Disguise Self, Silent Image\n2nd — Darkness, Pass Without Trace\n3rd — Clairvoyance, Major Image\n4th — Greater Invisibility, Hallucinatory Terrain\n5th — Mislead",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-mul-daya-nation-2014",
        "name": "Elf Mul Daya Nation",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
            "category": "specialAbility"
          },
          {
            "name": "Mul Daya Magic",
            "desc": "You know the Chill Touch cantrip. When you reach 3rd level, you can cast the Hex spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Darkness spell once with this trait and regain the ability to do so when you finish a long rest. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Superior Darkvision",
            "desc": "Your Darkvision has a radius of 120 feet.",
            "category": "specialAbility"
          },
          {
            "name": "Sunlight Sensitivity",
            "desc": "You have disadvantage on attack rolls and on Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight.",
            "category": "specialAbility"
          },
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 120
          }
        ],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-pallid-2014",
        "name": "Elf Pallid",
        "traits": [
          {
            "name": "Incisive Sense",
            "desc": "You have advantage on Intelligence (Investigation) and Wisdom (Insight) checks.",
            "category": "specialAbility"
          },
          {
            "name": "Blessing of the Moon Weaver",
            "desc": "You know the Light cantrip. When you reach 3rd level, you can cast the Sleep spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Invisibility spell (targeting yourself only) once with this trait and regain the ability to do so when you finish a long rest. Casting these spells with this trait doesn't require material components. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-sea-2014",
        "name": "Elf Sea",
        "traits": [
          {
            "name": "Sea Elf Training",
            "desc": "You have proficiency with the spear, trident, light crossbow, and net.",
            "category": "specialAbility"
          },
          {
            "name": "Child of the Sea",
            "desc": "You have a swimming speed of 30 feet, and you can breathe air and water.",
            "category": "specialAbility"
          },
          {
            "name": "Friend of the Sea",
            "desc": "Using gestures and sounds, you can communicate simple ideas with any beast that has an innate swimming speed.",
            "category": "specialAbility"
          },
          {
            "name": "Extra Language",
            "desc": "You can speak, read, and write Aquan.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Elvish",
          "Aquan"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 30,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-shadar-kai-2014",
        "name": "Elf Shadar Kai",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have resistance to necrotic damage.",
            "category": "specialAbility"
          },
          {
            "name": "Necrotic Resistance",
            "desc": "You have resistance to necrotic damage.",
            "category": "specialAbility"
          },
          {
            "name": "Blessing of the Raven Queen",
            "desc": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. Once you use this trait, you can't do so again until you finish a long rest.\nStarting at 3rd level, you also gain resistance to all damage when you teleport using this trait. The resistance lasts until the start of your next turn. During that time, you appear ghostly and translucent.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [
          "necrotic"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-tajuru-nation-2014",
        "name": "Elf Tajuru Nation",
        "traits": [
          {
            "name": "Skill Versatility",
            "desc": "You have proficiency with any combination of two other skills or 5 of your choice.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-vahadar-2014",
        "name": "Elf Vahadar",
        "traits": [
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the class=druid. Wisdom is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Extra Language",
            "desc": "You can speak, read, and write one extra language of your choosing.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-wood-2014",
        "name": "Wood Elf",
        "traits": [
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          },
          {
            "name": "Fleet of Foot",
            "desc": "Your base walking speed increases to 35 feet.",
            "category": "specialAbility"
          },
          {
            "name": "Mask of the Wild",
            "desc": "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 35,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-zendikar-2014",
        "name": "Zendikar Elf",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "Accustomed to twilit forests and the night sky, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Skills",
            "desc": "You have proficiency in Perception.",
            "category": "specialAbility"
          },
          {
            "name": "Keen Senses",
            "desc": "You have proficiency in the Perception skill.",
            "category": "specialAbility"
          },
          {
            "name": "Fey Ancestry",
            "desc": "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Elvish"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_perception",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "high-elf-2014",
        "name": "High Elf",
        "traits": [
          {
            "name": "Elf Weapon Training",
            "desc": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Extra Language",
            "desc": "You can speak, read, and write one extra language of your choice.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "faerie-2014",
    "name": "Faerie",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Fey.",
        "category": "specialAbility"
      },
      {
        "name": "Fairy Magic",
        "desc": "You know the Druidcraft cantrip. Starting at 3rd level, you can cast the Faerie Fire spell with this trait. Starting at 5th level, you can also cast the Enlarge/Reduce spell with this trait. Once you cast Faerie Fire or Enlarge/Reduce with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Flight",
        "desc": "Because of your wings, you have a flying speed equal to your walking speed. You can't use this flying speed if you're wearing medium or heavy armor.",
        "category": "specialAbility"
      },
      {
        "name": "Faerie Lineage",
        "desc": "As a native of either Lorwyn and Shadowmoor, you may gain additional traits.\n• Lorwyn: You do not gain any additional traits.\n• Shadowmoor: You have Darkvision with a range of 120 feet.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "fairy-2014",
    "name": "Fairy",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Fey.",
        "category": "specialAbility"
      },
      {
        "name": "Fairy Magic",
        "desc": "You know the Druidcraft cantrip. Starting at 3rd level, you can cast the Faerie Fire spell with this trait. Starting at 5th level, you can also cast the Enlarge/Reduce spell with this trait. Once you cast Faerie Fire or Enlarge/Reduce with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Flight",
        "desc": "Because of your wings, you have a flying speed equal to your walking speed. You can't use this flying speed if you're wearing medium or heavy armor.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "firbolg-2014",
    "name": "Firbolg",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Firbolg Magic",
        "desc": "You can cast Detect Magic and Disguise Self spells with this trait. When you use this version of Disguise Self, you can seem up to 3 feet shorter or taller. Once you cast either of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these spells using any spell slots you have.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Hidden Step",
        "desc": "As a bonus action, you can magically turn invisible until the start of your next turn or until you attack, make a damage roll, or force someone to make a saving throw. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Powerful Build",
        "desc": "You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      },
      {
        "name": "Speech of Beast and Leaf",
        "desc": "You have the ability to communicate in a limited manner with Beasts, Plants, and vegetation. They can understand the meaning of your words, though you have no special ability to understand them in return. You have advantage on all Charisma checks you make to influence them.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "flamekin-2014",
    "name": "Flamekin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to fire damage.",
        "category": "specialAbility"
      },
      {
        "name": "Fire Resistance",
        "desc": "You have resistance to fire damage.",
        "category": "specialAbility"
      },
      {
        "name": "Reach to the Blaze",
        "desc": "You know the Produce Flame cantrip. Starting at 3rd level, you can cast the Burning Hands spell with this trait. Starting at 5th level, you can also cast the Flame Blade spell with this trait, without a material component. Once you cast Burning Hands or Flame Blade with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "fire"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "genasi-2014",
    "name": "Genasi",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "genasi-air-2014",
        "name": "Genasi Air",
        "traits": [
          {
            "name": "Unending Breath",
            "desc": "You can hold your breath indefinitely while you're not incapacitated.",
            "category": "specialAbility"
          },
          {
            "name": "Mingle with the Wind",
            "desc": "You can cast the Levitate spell once with this trait, requiring no material components, and you regain the ability to cast it this way when you finish a long rest. Constitution is your spellcasting ability for this spell.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "genasi-earth-2014",
        "name": "Genasi Earth",
        "traits": [
          {
            "name": "Earth Walk",
            "desc": "You can move across 3 made of earth or stone without expending extra movement.",
            "category": "specialAbility"
          },
          {
            "name": "Merge with Stone",
            "desc": "You can cast the Pass Without Trace spell once with this trait, requiring no material components, and you regain the ability to cast it this way when you finish a long rest. Constitution is your spellcasting ability for this spell.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "genasi-fire-2014",
        "name": "Genasi Fire",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. Your ties to the Elemental Plane of Fire make your darkvision unusual: everything you see in darkness is in a shade of red.",
            "category": "specialAbility"
          },
          {
            "name": "Damage Resistance",
            "desc": "You have resistance to fire damage.",
            "category": "specialAbility"
          },
          {
            "name": "Fire Resistance",
            "desc": "You have resistance to fire damage.",
            "category": "specialAbility"
          },
          {
            "name": "Reach to the Blaze",
            "desc": "You know the Produce Flame cantrip. Once you reach 3rd level, you can cast the Burning Hands spell once with this trait as a 1st-level spell, and you regain the ability to cast it this way when you finish a long rest. Constitution is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [
          "fire"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "genasi-water-2014",
        "name": "Genasi Water",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have resistance to acid damage.",
            "category": "specialAbility"
          },
          {
            "name": "Acid Resistance",
            "desc": "You have resistance to acid damage.",
            "category": "specialAbility"
          },
          {
            "name": "Amphibious",
            "desc": "You can breathe air and water.",
            "category": "specialAbility"
          },
          {
            "name": "Swim",
            "desc": "You have a swimming speed of 30 feet.",
            "category": "specialAbility"
          },
          {
            "name": "Call to the Wave",
            "desc": "You know the Shape Water cantrip. When you reach 3rd level, you can cast the Create Or Destroy Water spell as a 2nd-level spell once with this trait, and you regain the ability to cast it this way when you finish a long rest. Constitution is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [
          "acid"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 30,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "giff-2014",
    "name": "Giff",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Astral Spark",
        "desc": "Your psychic connection to the Astral Plane enables you to mystically access a spark of divine power, which you can channel through your weapons. When you hit a target with a source=phb, you can cause the target to take extra force damage equal to your proficiency bonus.\nYou can use this trait a number of times equal to your proficiency bonus, but you can use it no more than once per turn. You regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Firearms Mastery",
        "desc": "You have a mystical connection to firearms that traces back to the gods of the giff, who delighted in such weapons. You have proficiency with all firearms and ignore the loading property of any firearm. In addition, attacking at long range with a firearm doesn't impose disadvantage on your attack roll.",
        "category": "specialAbility"
      },
      {
        "name": "Hippo Build",
        "desc": "You have advantage on Strength-based ability checks and Strength saving throws. In addition, you count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 30,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "gith-2014",
    "name": "Gith",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "gith-githyanki-2014",
        "name": "Gith Githyanki",
        "traits": [
          {
            "name": "Decadent Mastery",
            "desc": "You learn one language of your choice, and you are proficient with one skill or 5 of your choice. In the timeless city of Tu'narath, githyanki have bountiful time to master odd bits of knowledge.",
            "category": "specialAbility"
          },
          {
            "name": "Martial Prodigy",
            "desc": "You are proficient with light and medium armor and with shortswords, longswords, and greatswords.",
            "category": "specialAbility"
          },
          {
            "name": "Githyanki Psionics",
            "desc": "You know the Mage Hand cantrip, and the hand is invisible when you cast the cantrip with this trait.\nWhen you reach 3rd level, you can cast Jump once with this trait, and you regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Misty Step spell once with this trait, and you regain the ability to do so when you finish a long rest.\nIntelligence is your spellcasting ability for these spells. When you cast them with this trait, they don't require components.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "gith-githzerai-2014",
        "name": "Gith Githzerai",
        "traits": [
          {
            "name": "Mental Discipline",
            "desc": "You have advantage on saving throws against the charmed and frightened conditions. Under the tutelage of monastic masters, githzerai learn to govern their own minds.",
            "category": "specialAbility"
          },
          {
            "name": "Githzerai Psionics",
            "desc": "You know the Mage Hand cantrip, and the hand is invisible when you cast the cantrip with this trait.\nWhen you reach 3rd level, you can cast Shield once with this trait, and you regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Detect Thoughts spell once with this trait, and you regain the ability to do so when you finish a long rest.\nWisdom is your spellcasting ability for these spells. When you cast them with this trait, they don't require components.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "githyanki-2014",
    "name": "Githyanki",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Astral Knowledge",
        "desc": "You can mystically access a reservoir of experiences of entities connected to the Astral Plane. Whenever you finish a long rest, you gain proficiency in one skill of your choice and with one weapon or tool of your choice, selected from the Player's Handbook, as you momentarily project your consciousness into the Astral Plane. These proficiencies last until the end of your next long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Githyanki Psionics",
        "desc": "You know the Mage Hand cantrip, and the hand is invisible when you cast the cantrip with this trait.\nStarting at 3rd level, you can cast the Jump spell with this trait. Starting at 5th level, you can also cast Misty Step with it. Once you cast Jump or Misty Step with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race). None of these spells require spell components when you cast them with this trait.",
        "category": "specialAbility"
      },
      {
        "name": "Psychic Resilience",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "psychic"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "githzerai-2014",
    "name": "Githzerai",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Githzerai Psionics",
        "desc": "You know the Mage Hand cantrip, and the hand is invisible when you cast the cantrip with this trait.\nStarting at 3rd level, you can cast the Shield spell with this trait. Starting at 5th level, you can also cast the Detect Thoughts spell with it. Once you cast Shield or Detect Thoughts spell with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race). None of these spells require spell components when you cast them with this trait.",
        "category": "specialAbility"
      },
      {
        "name": "Mental Discipline",
        "desc": "Your innate psychic defenses grant you advantage on saving throws you make to avoid or end the charmed and frightened conditions on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Psychic Resilience",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "psychic"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "gnoll-2014",
    "name": "Gnoll",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Bite",
        "desc": "Your fanged maw is a natural weapon, which you can use to make unarmed strikes. If you hit with it, you deal piercing damage equal to 1d4 + your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Rampage",
        "desc": "When you reduce a creature to 0 hit points with a melee attack on your turn, you can take a bonus action to move up to half your speed and make a bite attack.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "gnome-2014",
    "name": "Gnome",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Gnome Cunning",
        "desc": "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 25,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Gnomish"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "gnome-deep-svirfneblin-2014",
        "name": "Gnome Deep Svirfneblin",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
            "category": "specialAbility"
          },
          {
            "name": "Superior Darkvision",
            "desc": "Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Stone Camouflage",
            "desc": "You have advantage on Dexterity (Stealth) checks to hide in rocky terrain.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 120
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Gnomish",
          "Undercommon"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "gnome-deep-2014",
        "name": "Gnome Deep",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
            "category": "specialAbility"
          },
          {
            "name": "Superior Darkvision",
            "desc": "Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Stone Camouflage",
            "desc": "You have advantage on Dexterity (Stealth) checks to hide in rocky terrain.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 120
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Gnomish",
          "Undercommon"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "gnome-forest-2014",
        "name": "Forest Gnome",
        "traits": [
          {
            "name": "Natural Illusionist",
            "desc": "You know the Minor Illusion cantrip. Intelligence is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Speak with Small Beasts",
            "desc": "Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts. Forest gnomes love animals and often keep squirrels, badgers, rabbits, moles, woodpeckers, and other creatures as beloved pets.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "gnome-mark-of-scribing-2014",
        "name": "Gnome Mark Of Scribing",
        "traits": [
          {
            "name": "Gifted Scribe",
            "desc": "When you make an Intelligence (History) check or an ability check using calligrapher's supplies, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Scribe's Insight",
            "desc": "You know the Message cantrip. You can also cast Comprehend Languages once with this trait, and you regain the ability to cast it when you finish a short or long rest. Starting at 3rd level, you can cast the Magic Mouth spell with this trait, and you regain the ability to cast it when you finish a long rest. Intelligence is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Scribing Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Comprehend Languages, Illusory Script\n2nd — Animal Messenger, Silence\n3rd — Sending, Tongues\n4th — Arcane Eye, Confusion\n5th — Dream",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "gnome-rock-2014",
        "name": "Rock Gnome",
        "traits": [
          {
            "name": "Artificer's Lore",
            "desc": "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus, instead of any proficiency bonus you normally apply.",
            "category": "specialAbility"
          },
          {
            "name": "Tinker",
            "desc": "You have proficiency with artisan's tools (tinker's tools). Using those tools, you can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device (AC 5, 1 hp). The device ceases to function after 24 hours (unless you spend 1 hour repairing it to keep the device functioning), or when you use your action to dismantle it; at that time, you can reclaim the materials used to create it. You can have up to three such devices active at a time.\nWhen you create a device, choose one of the following options:\nClockwork Toy: This toy is a clockwork animal, monster, or person, such as a frog, mouse, bird, dragon, or soldier. When placed on the ground, the toy moves 5 feet across the ground on each of your turns in a random direction. It makes noises as appropriate to the creature it represents.\nFire Starter: The device produces a miniature flame, which you can use to light a candle, torch, or campfire. Using the device requires your action.\nMusic Box: When opened, this music box plays a single song at a moderate volume. The box stops playing when it reaches the song's end or when it is closed.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "rock-gnome-2014",
        "name": "Rock Gnome",
        "traits": [
          {
            "name": "Artificer's Lore",
            "desc": "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus, instead of any proficiency bonus you normally apply.",
            "category": "specialAbility"
          },
          {
            "name": "Tinker",
            "desc": "You have proficiency with artisan's tools (tinker's tools). Using those tools, you can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device (AC 5, 1 hp). The device ceases to function after 24 hours (unless you spend 1 hour repairing it to keep the device functioning), or when you use your action to dismantle it; at that time, you can reclaim the materials used to create it. You can have up to three such devices active at a time.\nWhen you create a device, choose one of the following options:\n* _Clockwork Toy._ This toy is a clockwork animal, monster, or person, such as a frog, mouse, bird, dragon, or soldier. When placed on the ground, the toy moves 5 feet across the ground on each of your turns in a random direction. It makes noises as appropriate to the creature it represents.\n* _Fire Starter._ The device produces a miniature flame, which you can use to light a candle, torch, or campfire. Using the device requires your action.\n* _Music Box._ When opened, this music box plays a single song at a moderate volume. The box stops playing when it reaches the song's end or when it is closed.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "goblin-2014",
    "name": "Goblin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were in dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a goblinoid for any prerequisite or effect that requires you to be a goblinoid.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Fury of the Small",
        "desc": "When you damage a creature with an attack or a spell and the creature's size is larger than yours, you can cause the attack or spell to deal extra damage to the creature. The extra damage equals your proficiency bonus.\nYou can use this trait a number of times equal to your proficiency bonus, regaining all expended uses when you finish a long rest, and you can use it no more than once per turn.",
        "category": "specialAbility"
      },
      {
        "name": "Nimble Escape",
        "desc": "You can take the Disengage or Hide action as a bonus action on each of your turns.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "goblin-dankwood-2014",
        "name": "Dankwood Goblin",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Speak with Small Beasts",
            "desc": "Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts. Dankwood goblins love animals and often keep squirrels, badgers, rabbits, moles, woodpeckers, and other creatures as beloved pets.",
            "category": "specialAbility"
          },
          {
            "name": "Nimble Escape",
            "desc": "You can take the Disengage or Hide action as a bonus action on each of your turns.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Small",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Goblin"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goblin-ixalan-2014",
        "name": "Goblin Ixalan",
        "traits": [
          {
            "name": "Agile Climber",
            "desc": "You have a climbing speed of 25 feet. You can't use your climbing speed while you wear medium or heavy armor. (If your campaign uses the variant rule for encumbrance, you can't use your climbing speed if you are encumbered.)",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goblin-zendikar-grotag-tribe-2014",
        "name": "Goblin Zendikar Grotag Tribe",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Animal Handling.",
            "category": "specialAbility"
          },
          {
            "name": "Grotag Tamer",
            "desc": "You have proficiency in the Animal Handling skill.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_animal_handling",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goblin-zendikar-lavastep-tribe-2014",
        "name": "Goblin Zendikar Lavastep Tribe",
        "traits": [
          {
            "name": "Lavastep Grit",
            "desc": "You have advantage on Dexterity (Stealth) checks made to hide in rocky or subterranean environments.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goblin-zendikar-tuktuk-tribe-2014",
        "name": "Goblin Zendikar Tuktuk Tribe",
        "traits": [
          {
            "name": "Tuktuk Cunning",
            "desc": "You have proficiency with thieves' tools.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "goliath-2014",
    "name": "Goliath",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to cold damage.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Athletics.",
        "category": "specialAbility"
      },
      {
        "name": "Little Giant",
        "desc": "You have proficiency in the Athletics skill, and you count as one size larger when determining your carrying weight and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      },
      {
        "name": "Mountain Born",
        "desc": "You have resistance to cold damage. You also naturally acclimate to high altitudes, even if you've never been to one. This includes elevations above 20,000 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Stone's Endurance",
        "desc": "You can supernaturally draw on unyielding stone to shrug off harm. When you take damage, you can use your reaction to roll a d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.\nYou can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "cold"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_athletics",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "grimlock-2014",
    "name": "Grimlock",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Blindsight",
        "desc": "You have no eyes, and cannot be blinded. You can perceive your surroundings within 30 ft., or 10 ft. while deafened. You are considered blind beyond this radius.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Hearing and Smell",
        "desc": "You have advantage on Wisdom (Perception) checks that rely on hearing or smell.",
        "category": "specialAbility"
      },
      {
        "name": "Stone Camouflage",
        "desc": "You have advantage on Dexterity (Stealth) checks made to hide in rocky terrain.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Undercommon"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "grung-2014",
    "name": "Grung",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Arboreal Alertness",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Amphibious",
        "desc": "You can breathe air and water.",
        "category": "specialAbility"
      },
      {
        "name": "Poison Immunity",
        "desc": "You're immune to poison damage and the poisoned condition.",
        "category": "specialAbility"
      },
      {
        "name": "Poisonous Skin",
        "desc": "Any creature that grapples you or otherwise comes into direct contact with your skin must succeed on a DC 12 Constitution saving throw or become poisoned for 1 minute. A poisoned creature no longer in direct contact with you can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.\nYou can also apply this poison to any piercing weapon as part of an attack with that weapon, though when you hit the poison reacts differently. The target must succeed on a DC 12 Constitution saving throw or take 2d4 poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Standing Leap",
        "desc": "Your long jump is up to 25 feet and your high jump is up to 15 feet, with or without a running start.",
        "category": "specialAbility"
      },
      {
        "name": "Water Dependency",
        "desc": "If you fail to immerse yourself in water for at least 1 hour during a day, you suffer one level of exhaustion at the end of that day. You can only recover from this exhaustion through magic or by immersing yourself in water for at least 1 hour.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 25,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 25,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "hadozee-2014",
    "name": "Hadozee",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Dexterous Feet",
        "desc": "As a bonus action, you can use your feet to manipulate an object, open or close a door or container, or pick up or set down a Tiny object.",
        "category": "specialAbility"
      },
      {
        "name": "Glide",
        "desc": "When you fall at least 10 feet above the ground, you can use your reaction to extend your skin membranes to glide horizontally a number of feet equal to your walking speed, and you take 0 damage from the fall. You determine the direction of the glide.",
        "category": "specialAbility"
      },
      {
        "name": "Hadozee Dodge",
        "desc": "The magic that runs in your veins heightens your natural defenses. When you take damage, you can use your reaction to roll a d6. Add your proficiency bonus to the number rolled, and reduce the damage you take by an amount equal to that total (minimum of 0 damage).\nYou can use this trait a number of times equal to your proficiency bonus. You regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 30,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "half-elf-2014",
    "name": "Half Elf",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Thanks to your elf blood, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        "category": "specialAbility"
      },
      {
        "name": "Skill Versatility",
        "desc": "You gain proficiency in two skills of your choice.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Elvish",
      "and one extra language of your choice"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "half-elf-variant-aquatic-elf-descent-2014",
        "name": "Half Elf Variant Aquatic Elf Descent",
        "traits": [
          {
            "name": "Variant Feature (Choose 1)",
            "desc": "Skill Versatility: You gain proficiency in two skills of your choice.\nSwim: You gain a swimming speed of 30 ft.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "half-elf-variant-drow-descent-2014",
        "name": "Half Elf Variant Drow Descent",
        "traits": [
          {
            "name": "Variant Feature (Choose 1)",
            "desc": "Skill Versatility: You gain proficiency in two skills of your choice.\nDrow Magic: You know the Dancing Lights cantrip. When you reach 3rd level, you can cast the Faerie Fire spell once per day; you must finish a long rest in order to cast the spell again using this trait. When you reach 5th level, you can also cast the Darkness spell once per day; you must finish a long rest in order to cast the spell again using this trait. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "half-elf-variant-mark-of-detection-2014",
        "name": "Half Elf Variant Mark Of Detection",
        "traits": [
          {
            "name": "Deductive Intuition",
            "desc": "When you make an Intelligence (Investigation) or a Wisdom (Insight) check, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Magical Detection",
            "desc": "You can cast the Detect Magic and Detect Poison And Disease spells with this trait. Starting at 3rd level, you can also cast the See Invisibility spell with it. Once you cast any of these spells with this trait, you can't cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells, and you don't require material components for them.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Detection Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Detect Evil And Good, Detect Poison And Disease\n2nd — Detect Thoughts, Find Traps\n3rd — Clairvoyance, Nondetection\n4th — Arcane Eye, Divination\n5th — Legend Lore",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "half-elf-variant-mark-of-storm-2014",
        "name": "Half Elf Variant Mark Of Storm",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have resistance to lightning damage.",
            "category": "specialAbility"
          },
          {
            "name": "Windwright's Intuition",
            "desc": "When you make a Dexterity (Acrobatics) check or any ability check involving navigator's tools, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Storm's Boon",
            "desc": "You have resistance to lightning damage.",
            "category": "specialAbility"
          },
          {
            "name": "Headwinds",
            "desc": "You know the Gust cantrip. Starting at 3rd level, you can cast the Gust Of Wind spell once with this trait, and you regain the ability to cast it when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Storm Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Feather Fall, Fog Cloud\n2nd — Gust Of Wind, Levitate\n3rd — Sleet Storm, Wind Wall\n4th — Conjure Minor Elementals, Control Water\n5th — Conjure Elemental",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [
          "lightning"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "half-elf-variant-moon-elf-or-sun-elf-descent-2014",
        "name": "Half Elf Variant Moon Elf Or Sun Elf Descent",
        "traits": [
          {
            "name": "Variant Feature (Choose 1)",
            "desc": "Skill Versatility: You gain proficiency in two skills of your choice.\nElf Weapon Training: You have proficiency with the longsword, shortsword, shortbow, and longbow.\nCantrip: You know one cantrip of your choice from the class=wizard. Intelligence is your spellcasting ability for it.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "half-elf-variant-wood-elf-descent-2014",
        "name": "Half Elf Variant Wood Elf Descent",
        "traits": [
          {
            "name": "Variant Feature (Choose 1)",
            "desc": "Skill Versatility: You gain proficiency in two skills of your choice.\nElf Weapon Training: You have proficiency with the longsword, shortsword, shortbow, and longbow.\nFleet of Foot: Your base walking speed increases to 35 feet.\nMask of the Wild: You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "half-orc-2014",
    "name": "Half Orc",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Thanks to your orc blood, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Menacing",
        "desc": "You gain proficiency in the Intimidation skill.",
        "category": "specialAbility"
      },
      {
        "name": "Relentless Endurance",
        "desc": "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Savage Attacks",
        "desc": "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Orc"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "half-orc-variant-mark-of-finding-2014",
        "name": "Half Orc Variant Mark Of Finding",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Hunter's Intuition",
            "desc": "When you make a Wisdom (Perception) or Wisdom (Survival) check, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Finder's Magic",
            "desc": "You can cast the Hunter'S Mark spell with this trait. Starting at 3rd level, you can also cast the Locate Object spell with it. Once you cast either spell with this trait, you can't cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Finding Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Faerie Fire, Longstrider\n2nd — Locate Animals Or Plants, Locate Object\n3rd — Clairvoyance, Speak With Plants\n4th — Divination, Locate Creature\n5th — Commune With Nature",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Goblin"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "halfling-2014",
    "name": "Halfling",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Lucky",
        "desc": "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
        "category": "specialAbility"
      },
      {
        "name": "Brave",
        "desc": "You have advantage on saving throws against being frightened.",
        "category": "specialAbility"
      },
      {
        "name": "Halfling Nimbleness",
        "desc": "You can move through the space of any creature that is of a size larger than yours.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 25,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Halfling"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "halfling-ghostwise-2014",
        "name": "Halfling Ghostwise",
        "traits": [
          {
            "name": "Silent Speech",
            "desc": "You can speak telepathically to any creature within 30 feet of you. The creature understands you only if the two of you share a language. You can speak telepathically in this way to one creature at a time.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "halfling-lightfoot-2014",
        "name": "Halfling Lightfoot",
        "traits": [
          {
            "name": "Naturally Stealthy",
            "desc": "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "halfling-lotusden-2014",
        "name": "Halfling Lotusden",
        "traits": [
          {
            "name": "Child of the Wood",
            "desc": "You know the Druidcraft cantrip. When you reach 3rd level, you can cast the Entangle spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Spike Growth spell once with this trait and regain the ability to do so when you finish a long rest. Casting these spells with this trait doesn't require material components. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Timberwalk",
            "desc": "Ability checks made to track you have disadvantage, and you can move across 3 made of nonmagical plants and undergrowth without expending extra movement.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "halfling-mark-of-healing-2014",
        "name": "Halfling Mark Of Healing",
        "traits": [
          {
            "name": "Medical Intuition",
            "desc": "When you make a Wisdom (Medicine) check or an ability check using an herbalism kit, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Healing Touch",
            "desc": "You can cast the Cure Wounds spell with this trait. Starting at 3rd level, you can also cast Lesser Restoration with it. Once you cast either spell with this trait, you can't cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Healing Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Cure Wounds, Healing Word\n2nd — Lesser Restoration, Prayer Of Healing\n3rd — Aura Of Vitality, Mass Healing Word\n4th — Aura Of Purity, Aura Of Life\n5th — Greater Restoration",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "halfling-mark-of-hospitality-2014",
        "name": "Halfling Mark Of Hospitality",
        "traits": [
          {
            "name": "Ever Hospitable",
            "desc": "When you make a Charisma (Persuasion) check or an ability check involving brewer's supplies or cook's utensils, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Innkeeper's Magic",
            "desc": "You know the Prestidigitation cantrip. You can also cast the Purify Food And Drink and Unseen Servant spells with this trait. Once you cast either spell with this trait, you can't cast that spell with it again until you finish long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Goodberry, Sleep\n2nd — Aid, Calm Emotions\n3rd — Create Food And Water, Leomund'S Tiny Hut\n4th — Aura Of Purity, Mordenkainen'S Private Sanctum\n5th — Hallow",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "halfling-stout-2014",
        "name": "Halfling Stout",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have resistance to poison damage.",
            "category": "specialAbility"
          },
          {
            "name": "Stout Resilience",
            "desc": "You have advantage on saving throws against poison, and you have resistance against poison damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [
          "poison"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "lightfoot-2014",
        "name": "Lightfoot Halfling",
        "traits": [
          {
            "name": "Naturally Stealthy",
            "desc": "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "stoor-halfling-2014",
        "name": "Stoor Halfling",
        "traits": [
          {
            "name": "Stoor Hardiness",
            "desc": "You gain resistance to poison damage, and you make saving throws against poison with advantage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "poison"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "harengon-2014",
    "name": "Harengon",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Hare-Trigger",
        "desc": "You can add your proficiency bonus to your initiative rolls.",
        "category": "specialAbility"
      },
      {
        "name": "Leporine Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Lucky Footwork",
        "desc": "When you fail a Dexterity saving throw, you can use your reaction to roll a d4 and add it to the save, potentially turning the failure into a success. You can't use this reaction if you're prone or your speed is 0.",
        "category": "specialAbility"
      },
      {
        "name": "Rabbit Hop",
        "desc": "As a bonus action, you can jump a number of feet equal to five times your proficiency bonus, without provoking opportunity attacks. You can use this trait only if your speed is greater than 0. You can use it a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "hexblood-2014",
    "name": "Hexblood",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Fey.",
        "category": "specialAbility"
      },
      {
        "name": "Ancestral Legacy",
        "desc": "If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it.\nIf you don't keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice.",
        "category": "specialAbility"
      },
      {
        "name": "Eerie Token",
        "desc": "As a bonus action, you can harmlessly remove a lock of your hair, one of your nails, or one of your teeth. This token is imbued with magic until you finish a long rest. While the token is imbued in this way, you can take these actions:\n• Telepathic Message: \n• Remote Viewing: \nOnce you create a token using this feature, you can't do so again until you finish a long rest, at which point your missing part regrows.",
        "category": "specialAbility"
      },
      {
        "name": "Hex Magic",
        "desc": "You can cast the Disguise Self and Hex spells with this trait. Once you cast either of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these spells using any spell slots you have.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose the ability when you gain this lineage).\nBecoming a Hag: Hags can undertake a ritual to irreversibly transform a hexblood they created into a new hag, either one of their own kind or that embodies the hexblood's nature. This requires that both the hag and hexblood be in the same place and consent to the lengthy ritual—circumstances most hexbloods shun but might come to accept over the course of centuries. Once a hexblood undergoes this irreversible ritual, they emerge as a hag NPC no longer under the control of the hexblood's player, unless the DM rules otherwise.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "hobgoblin-2014",
    "name": "Hobgoblin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a goblinoid for any prerequisite or effect that requires you to be a goblinoid.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Gift",
        "desc": "You can use this trait to take the Help action as a bonus action, and you can do so a number of times equal to your proficiency bonus. You regain all expended uses when you finish a long rest.\nStarting at 3rd level, choose one of the options below each time you take the Help action with this trait:\n• Hospitality: \n• Passage: \n• Spite:",
        "category": "specialAbility"
      },
      {
        "name": "Fortune from the Many",
        "desc": "If you miss with an attack roll or fail an ability check or a saving throw, you can draw on your bonds of reciprocity to gain a bonus to the roll equal to the number of allies you can see within 30 feet of you (maximum bonus of +3). You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "human-2014",
    "name": "Human",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "one extra language of your choice"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "human-amonkhet-2014",
        "name": "Human Amonkhet",
        "traits": [
          {
            "name": "Skills",
            "desc": "You gain proficiency in one skill of your choice.",
            "category": "specialAbility"
          },
          {
            "name": "Feat",
            "desc": "You gain one feat of your choice.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-innistrad-2014",
        "name": "Innistrad Human",
        "traits": [],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-ixalan-2014",
        "name": "Ixalan Human",
        "traits": [],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Common",
          "Other"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-kaladesh-2014",
        "name": "Kaladesh Human",
        "traits": [],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-keldon-2014",
        "name": "Human Keldon",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Athletics.",
            "category": "specialAbility"
          },
          {
            "name": "Natural Athlete",
            "desc": "You have proficiency in the Athletics skill.",
            "category": "specialAbility"
          },
          {
            "name": "Keldon Resilience",
            "desc": "You have proficiency in Strength saving throws.",
            "category": "specialAbility"
          },
          {
            "name": "Icehaven Born",
            "desc": "You are naturally adapted to cold climates, as described in chapter 5 of the Dungeon Master's Guide.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Other"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_athletics",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-kessig-2014",
        "name": "Human Kessig",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Survival.",
            "category": "specialAbility"
          },
          {
            "name": "Forest Folk",
            "desc": "You have proficiency in the Survival skill.",
            "category": "specialAbility"
          },
          {
            "name": "Fleet of Foot",
            "desc": "Your base walking speed is 40 feet.",
            "category": "specialAbility"
          },
          {
            "name": "Sure-footed",
            "desc": "When you use the Dash action, 3 doesn't cost you extra movement on that turn.",
            "category": "specialAbility"
          },
          {
            "name": "Spring Attack",
            "desc": "When you make a melee attack against a creature, you don't provoke opportunity attacks from that creature for the rest of your turn, whether you hit or not.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 40,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_survival",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-mark-of-handling-2014",
        "name": "Human Mark Of Handling",
        "traits": [
          {
            "name": "Wild Intuition",
            "desc": "When you make a Wisdom (Animal Handling) or Intelligence (Nature) check, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Primal Connection",
            "desc": "You can cast the Animal Friendship and Speak With Animals spells with this trait, requiring no material component. Once you cast either spell with this trait, you can't cast that spell with it again until you finish a short or long rest. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "The Bigger They Are",
            "desc": "Starting at 3rd level, you can target a beast or monstrosity when you cast Animal Friendship or Speak With Animals, provided the creature's Intelligence score is 3 or lower.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Handling Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Animal Friendship, Speak With Animals\n2nd — Beast Sense, Calm Emotions\n3rd — Beacon Of Hope, Conjure Animals\n4th — Aura Of Life, Dominate Beast\n5th — Awaken",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-mark-of-making-2014",
        "name": "Human Mark Of Making",
        "traits": [
          {
            "name": "Artisan's Intuition",
            "desc": "When you make an Arcana check or an ability check involving source=phb, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Maker's Gift",
            "desc": "You gain proficiency with one type of artisan's tools of your choice.",
            "category": "specialAbility"
          },
          {
            "name": "Spellsmith",
            "desc": "You know the Mending cantrip. You can also cast the Magic Weapon spell with this trait. When you do so, the spell lasts for 1 hour and doesn't require concentration. Once you cast the spell with this trait, you can't do so again until you finish a long rest. Intelligence is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Making Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Identify, Tenser'S Floating Disk\n2nd — Continual Flame, Magic Weapon\n3rd — Conjure Barrage, Elemental Weapon\n4th — Fabricate, Stone Shape\n5th — Creation",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-mark-of-passage-2014",
        "name": "Human Mark Of Passage",
        "traits": [
          {
            "name": "Courier's Speed",
            "desc": "Your base walking speed increases to 35 feet.",
            "category": "specialAbility"
          },
          {
            "name": "Intuitive Motion",
            "desc": "When you make a Dexterity (Acrobatics) check or any ability check to operate or maintain a source=phb;dmg, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Magical Passage",
            "desc": "You can cast the Misty Step spell once with this trait, and you regain the ability to cast it when you finish a long rest. Dexterity is your spellcasting ability for this spell.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Passage Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Expeditious Retreat, Jump\n2nd — Misty Step, Pass Without Trace\n3rd — Blink, Phantom Steed\n4th — Dimension Door, Freedom Of Movement\n5th — Teleportation Circle",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 35,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-mark-of-sentinel-2014",
        "name": "Human Mark Of Sentinel",
        "traits": [
          {
            "name": "Sentinel's Intuition",
            "desc": "When you make a Wisdom (Insight) or Wisdom (Perception) check, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Guardian's Shield",
            "desc": "You can cast the Shield spell once with this trait, and you regain the ability to cast it after you finish a long rest. Wisdom is your spellcasting ability for this spell.",
            "category": "specialAbility"
          },
          {
            "name": "Vigilant Guardian",
            "desc": "When a creature you can see within 5 feet of you is hit by an attack roll, you can use your reaction to swap places with that creature, and you are hit by the attack instead. Once you use this trait, you can't do so again until you finish a long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Sentinel Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Compelled Duel, Shield Of Faith\n2nd — Warding Bond, Zone Of Truth\n3rd — Counterspell, Protection From Energy\n4th — Death Ward, Guardian Of Faith\n5th — Bigby'S Hand",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-nephalia-2014",
        "name": "Human Nephalia",
        "traits": [
          {
            "name": "Breadth of Knowledge",
            "desc": "You gain proficiency in any combination of four skills or with four 5 of your choice.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-stensia-2014",
        "name": "Human Stensia",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Intimidation.",
            "category": "specialAbility"
          },
          {
            "name": "Daunting",
            "desc": "You have proficiency in the Intimidation skill.",
            "category": "specialAbility"
          },
          {
            "name": "Tough",
            "desc": "Your hit point maximum increases by 2, and it increases by 2 every time you gain a level.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_intimidation",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-variant-mark-of-finding-2014",
        "name": "Human Variant Mark Of Finding",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Hunter's Intuition",
            "desc": "When you make a Wisdom (Perception) or Wisdom (Survival) check, you can roll a d4 and add the number rolled to the ability check.",
            "category": "specialAbility"
          },
          {
            "name": "Finder's Magic",
            "desc": "You can cast the Hunter'S Mark spell with this trait. Starting at 3rd level, you can also cast the Locate Object spell with it. Once you cast either spell with this trait, you can't cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Spells of the Mark",
            "desc": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Finding Spells table are added to the spell list of your spellcasting class.\nSpell Level | Spells\n1st — Faerie Fire, Longstrider\n2nd — Locate Animals Or Plants, Locate Object\n3rd — Clairvoyance, Speak With Plants\n4th — Divination, Locate Creature\n5th — Commune With Nature",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Goblin"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-variant-2014",
        "name": "Human Variant",
        "traits": [
          {
            "name": "Skills",
            "desc": "You gain proficiency in one skill of your choice.",
            "category": "specialAbility"
          },
          {
            "name": "Feat",
            "desc": "You gain one feat of your choice.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "human-zendikar-2014",
        "name": "Zendikar Human",
        "traits": [],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "kalashtar-2014",
    "name": "Kalashtar",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Dual Mind",
        "desc": "You have advantage on all Wisdom saving throws.",
        "category": "specialAbility"
      },
      {
        "name": "Mental Discipline",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Mind Link",
        "desc": "You can speak telepathically to any creature you can see, provided the creature is within a number of feet of you equal to 10 times your level. You don't need to share a language with the creature for it to understand your telepathic utterances, but the creature must be able to understand at least one language.\nWhen you're using this trait to speak telepathically to a creature, you can use your action to give that creature the ability to speak telepathically with you for 1 hour or until you end this effect as an action. To use this ability, the creature must be able to see you and must be within this trait's range. You can give this ability to only one creature at a time; giving it to a creature takes it away from another creature who has it.",
        "category": "specialAbility"
      },
      {
        "name": "Severed from Dreams",
        "desc": "Kalashtar sleep, but they don't connect to the plane of dreams as other creatures do. Instead, their minds draw from the memories of their otherworldly spirit while they sleep. As such, you are immune to spells and other magical effects that require you to dream, like Dream, but not to spells and other magical effects that put you to sleep, like Sleep.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "psychic"
    ],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kender-2014",
    "name": "Kender",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Fearless",
        "desc": "You have advantage on saving throws you make to avoid or end the frightened condition on yourself. When you fail a saving throw to avoid or end the frightened condition on yourself, you can choose to succeed instead. Once you succeed on a saving throw in this way, you can't do so again until you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Kender Curiosity",
        "desc": "Thanks to the mystical origin of your people, you gain proficiency with one of the following skills of your choice: Insight, Investigation, Sleight of Hand, Stealth, or Survival.",
        "category": "specialAbility"
      },
      {
        "name": "Taunt",
        "desc": "You have an extraordinary ability to fluster creatures. As a bonus action, you can unleash a string of provoking words at a creature within 60 feet of yourself that can hear and understand you. The target must succeed on a Wisdom saving throw, or it has disadvantage on attack rolls against targets other than you until the start of your next turn. The DC equals 8 + your proficiency bonus + your Intelligence, Wisdom, or Charisma modifier (choose when you select this race).\nYou can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kenku-2014",
    "name": "Kenku",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Expert Duplication",
        "desc": "When you copy writing or craftwork produced by yourself or someone else, you have advantage on any ability checks you make to produce an exact duplicate.",
        "category": "specialAbility"
      },
      {
        "name": "Kenku Recall",
        "desc": "Thanks to your supernaturally good memory, you have proficiency in two skills of your choice.\nMoreover, when you make an ability check using any skill in which you have proficiency, you can give yourself advantage on the check before rolling the d20. You can give yourself advantage in this way a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Mimicry",
        "desc": "You can accurately mimic sounds you have heard, including voices. A creature that hears the sounds you make can tell they are imitations only with a successful Wisdom (Insight) check against a DC of 8 + your proficiency bonus + your Charisma modifier.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "khenra-2014",
    "name": "Khenra",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Khenra Weapon Training",
        "desc": "You have proficiency with the khopesh (longsword), spear, and javelin.",
        "category": "specialAbility"
      },
      {
        "name": "Khenra Twins",
        "desc": "If your twin is alive and you can see your twin, whenever you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll. If your twin is dead (or if you were born without a twin), you can't be frightened.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 35,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kobold-2014",
    "name": "Kobold",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were in dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Draconic Cry",
        "desc": "As a bonus action, you let out a cry at your enemies within 10 feet of you. Until the start of your next turn, you and your allies have advantage on attack rolls against any of those enemies who could hear you. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Kobold Legacy",
        "desc": "Kobold's connections to dragons can manifest in unpredictable ways in an individual kobold. Choose one of the following legacy options for your kobold.\n• Craftiness: \n• Defiance: \n• Draconic Sorcery:",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kor-2014",
    "name": "Kor",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Skills",
        "desc": "You have proficiency in Athletics, Acrobatics.",
        "category": "specialAbility"
      },
      {
        "name": "Brave",
        "desc": "You have advantage on saving throws against being frightened.",
        "category": "specialAbility"
      },
      {
        "name": "Climbing",
        "desc": "You also have a climbing speed of 30 feet as long as you are not encumbered or wearing heavy armor.",
        "category": "specialAbility"
      },
      {
        "name": "Kor Climbing",
        "desc": "You have proficiency in the Athletics and Acrobatics skills.",
        "category": "specialAbility"
      },
      {
        "name": "Lucky",
        "desc": "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 30,
    "addsSkills": [
      {
        "skill": "skill_athletics",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kuo-toa-2014",
    "name": "Kuo Toa",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
        "category": "specialAbility"
      },
      {
        "name": "Amphibious",
        "desc": "You can breathe air and water.",
        "category": "specialAbility"
      },
      {
        "name": "Otherworldly Perception",
        "desc": "You can sense the presence of any creature within 30 feet of you that is invisible or on the Ethereal Plane. You can pinpoint such a creature that is moving.",
        "category": "specialAbility"
      },
      {
        "name": "Slippery",
        "desc": "You have advantage on ability checks and saving throws made to escape a grapple.",
        "category": "specialAbility"
      },
      {
        "name": "Sunlight Sensitivity",
        "desc": "While in sunlight, you have disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
        "category": "specialAbility"
      },
      {
        "name": "Superior Darkvision",
        "desc": "You have superior vision in dark and dim conditions. You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Undercommon"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 30,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "leonin-2014",
    "name": "Leonin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Claws",
        "desc": "Your claws are natural weapons, which you can use to make unarmed strikes. If you hit with them, you can deal slashing damage equal to 1d4 + your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Hunter's Instincts",
        "desc": "You have proficiency in one of the following skills of your choice: Athletics, Intimidation, Perception, or Survival.",
        "category": "specialAbility"
      },
      {
        "name": "Daunting Roar",
        "desc": "As a bonus action, you can let out an especially menacing roar. Creatures of your choice within 10 feet of you that can hear you must succeed on a Wisdom saving throw or become frightened of you until the end of your next turn. The DC of the save equals 8 + your proficiency bonus + your Constitution modifier. Once you use this trait, you can't use it again until you finish a short or long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 35,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "lizardfolk-2014",
    "name": "Lizardfolk",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Bite",
        "desc": "You have a fanged maw that you can use to make unarmed strikes. When you hit with it, the strike deals 1d6 + your Strength modifier slashing damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Hold Breath",
        "desc": "You can hold your breath for up to 15 minutes at a time.",
        "category": "specialAbility"
      },
      {
        "name": "Hungry Jaws",
        "desc": "You can throw yourself into a feeding frenzy. As a bonus action, you can make a special attack with your Bite. If the attack hits, it deals its normal damage, and you gain temporary hit points equal to your proficiency bonus. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Armor",
        "desc": "You have tough, scaly skin. When you aren't wearing armor, your base AC is 13 + Dexterity modifier. You can use your natural armor to determine your AC if the armor you wear would leave you with a lower AC. A shield's benefits apply as normal while you use your natural armor.",
        "category": "specialAbility"
      },
      {
        "name": "Nature's Intuition",
        "desc": "Thanks to your mystical connection to nature, you gain proficiency with two of the following skills of your choice: Animal Handling, Medicine, Nature, Perception, Stealth, or Survival.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 30,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": {
      "base": 13,
      "ability": "dexterity",
      "blocksArmor": false,
      "allowsShield": true
    },
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "locathah-2014",
    "name": "Locathah",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Skills",
        "desc": "You have proficiency in Athletics, Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Armor",
        "desc": "You have tough, scaly skin. When you aren't wearing armor, your AC is 12 + your Dexterity modifier. You can use your natural armor to determine your AC if the armor you wear would leave you with a lower AC. A shield's benefits apply as normal while you use your natural armor.",
        "category": "specialAbility"
      },
      {
        "name": "Observant & Athletic",
        "desc": "You have proficiency in the Athletics and Perception skills.",
        "category": "specialAbility"
      },
      {
        "name": "Leviathan Will",
        "desc": "You have advantage on saving throws against being charmed, frightened, paralyzed, poisoned, stunned, or put to sleep.",
        "category": "specialAbility"
      },
      {
        "name": "Limited Amphibiousness",
        "desc": "You can breathe air and water, but you need to be submerged at least once every 4 hours to avoid suffocating.",
        "category": "specialAbility"
      },
      {
        "name": "Language",
        "desc": "You can speak, read, and write Aquan and Common.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Aquan",
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 30,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_athletics",
        "level": "proficient"
      }
    ],
    "naturalArmor": {
      "base": 12,
      "ability": "dexterity",
      "blocksArmor": false,
      "allowsShield": true
    },
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "lorwyn-changeling-2014",
    "name": "Lorwyn Changeling",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 120 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Shape Self",
        "desc": "As an action, you can reshape your body to a two-legged Humanoid shape or to a four-legged Beast shape. While you have a Humanoid shape, you can wear clothing and armor made for a Humanoid of your size.",
        "category": "specialAbility"
      },
      {
        "name": "Delightful Imitator",
        "desc": "You have proficiency in the Deception or Performance skill.",
        "category": "specialAbility"
      },
      {
        "name": "Unpredictable Movement",
        "desc": "When you roll Initiative, you can immediately move up to half your Speed, provided you don't have Disadvantage on the Initiative roll.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "loxodon-2014",
    "name": "Loxodon",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Powerful Build",
        "desc": "You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      },
      {
        "name": "Loxodon Serenity",
        "desc": "You have advantage on saving throws against being charmed or frightened.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Armor",
        "desc": "You have thick, leathery skin. When you aren't wearing armor, your AC is 12 + your Constitution modifier. You can use your natural armor to determine your AC if the armor you wear would leave you with a lower AC. A shield's benefits apply as normal while you use your natural armor.\nTip: AC Calculations Don't Stack: When the game gives you more than one way to calculate your Armor Class, you can use only one of them. You choose the one to use. For example, if you have the loxodon's Natural Armor trait and the monk's Unarmored Defense feature, you don't mix them together. Instead, you choose which one determines your AC.",
        "category": "specialAbility"
      },
      {
        "name": "Trunk",
        "desc": "You can grasp things with your trunk, and you can use it as a snorkel. It has a reach of 5 feet, and it can lift a number of pounds equal to five times your Strength score. You can use it to do the following simple tasks: lift, drop, hold, push, or pull an object or a creature; open or close a door or a container; grapple someone; or make an unarmed strike. Your DM might allow other simple tasks to be added to that list of options.\nYour trunk can't wield weapons or shields or do anything that requires manual precision, such as using tools or magic items or performing the somatic components of a spell.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Smell",
        "desc": "Thanks to your sensitive trunk, you have advantage on Wisdom (Perception), Wisdom (Survival), and Intelligence (Investigation) checks that involve smell.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": {
      "base": 12,
      "ability": "constitution",
      "blocksArmor": false,
      "allowsShield": true
    },
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "merfolk-2014",
    "name": "Merfolk",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Amphibious",
        "desc": "You can breathe air and water.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 10,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Aquan"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 40,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "merfolk-ixalan-blue-2014",
        "name": "Merfolk Ixalan Blue",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in History, Nature.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the class=wizard. Intelligence is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Lore of the Waters",
            "desc": "You gain proficiency in the History and Nature skills.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Other"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_history",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "merfolk-ixalan-green-2014",
        "name": "Merfolk Ixalan Green",
        "traits": [
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the class=Druid. Wisdom is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Mask of the Wild",
            "desc": "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Other"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "merfolk-zendikar-cosi-creed-2014",
        "name": "Merfolk Zendikar Cosi Creed",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Sleight Of Hand, Stealth.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the class=bard. Charisma is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Creed of the Trickster",
            "desc": "You have proficiency in the Sleight of Hand and Stealth skills.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_sleight_of_hand",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "merfolk-zendikar-emeria-creed-2014",
        "name": "Merfolk Zendikar Emeria Creed",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Deception, Persuasion.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the class=druid. Wisdom is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Wind Creed Manipulation",
            "desc": "You have proficiency in the Deception and Persuasion skills.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_deception",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "merfolk-zendikar-ula-creed-2014",
        "name": "Merfolk Zendikar Ula Creed",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Survival.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip",
            "desc": "You know one cantrip of your choice from the class=wizard. Intelligence is your spellcasting ability for it.",
            "category": "specialAbility"
          },
          {
            "name": "Water Creed Navigation",
            "desc": "You have proficiency with navigator's tools and in the Survival skill.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_survival",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "minotaur-2014",
    "name": "Minotaur",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Horns",
        "desc": "You have horns that you can use to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier piercing damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Goring Rush",
        "desc": "Immediately after you take the Dash action on your turn and move at least 20 feet, you can make one melee attack with your Horns as a bonus action.",
        "category": "specialAbility"
      },
      {
        "name": "Hammering Horns",
        "desc": "Immediately after you hit a creature with a melee attack as part of the Attack action on your turn, you can use a bonus action to attempt to push that target with your horns. The target must be within 5 feet of you and no more than one size larger than you. Unless it succeeds on a Strength saving throw against a DC equal to 8 + your proficiency bonus + your Strength modifier, you can push it up to 10 feet away from you.",
        "category": "specialAbility"
      },
      {
        "name": "Labyrinthine Recall",
        "desc": "You always know which direction is north, and you have advantage on any Wisdom (Survival) check you make to navigate or track.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "minotaur-amonkhet-2014",
        "name": "Amonkhet Minotaur",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Intimidation.",
            "category": "specialAbility"
          },
          {
            "name": "Natural Weapon",
            "desc": "You can use your horns as a natural weapon to make unarmed strikes. If you hit with your horns, you deal bludgeoning damage equal to 1d6 + your Strength modifier.",
            "category": "specialAbility"
          },
          {
            "name": "Menacing",
            "desc": "You gain proficiency in the Intimidation skill.",
            "category": "specialAbility"
          },
          {
            "name": "Relentless Endurance",
            "desc": "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Savage Attacks",
            "desc": "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Other"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_intimidation",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "naga-2014",
    "name": "Naga",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Speed Burst",
        "desc": "By lowering your body to the ground and propelling yourself with your arms, you can move more quickly for a time. As a bonus action on your turn, if you have both hands free, you can increase your walking speed by 5 feet until the end of your turn.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Weapons",
        "desc": "Your fanged maw and constricting serpentine body are natural weapons, which you can use to make unarmed strikes.\nIf you hit with your bite, you deal piercing damage equal to 1d4 + your Strength modifier, and your target must make a Constitution saving throw (DC 8 + your proficiency bonus + your Constitution modifier). On a failed save, the target takes 1d4 poison damage.\nIf you hit with your constrict attack, you deal bludgeoning damage equal to 1d6 + your Strength modifier, and the target is grappled (escape DC 8 + your proficiency bonus + your Strength modifier). Until this grapple ends, the target is restrained, and you can't constrict another target.",
        "category": "specialAbility"
      },
      {
        "name": "Poison Immunity",
        "desc": "You are immune to poison damage and can't be poisoned.",
        "category": "specialAbility"
      },
      {
        "name": "Poison Affinity",
        "desc": "You gain proficiency with the poisoner's kit.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "orc-2014",
    "name": "Orc",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Adrenaline Rush",
        "desc": "You can take the Dash action as a bonus action. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nWhenever you use this trait, you gain a number of temporary hit points equal to your proficiency bonus.",
        "category": "specialAbility"
      },
      {
        "name": "Powerful Build",
        "desc": "You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      },
      {
        "name": "Relentless Endurance",
        "desc": "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. Once you use this trait, you can't do so again until you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "orc-ixalan-2014",
        "name": "Ixalan Orc",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Skills",
            "desc": "You have proficiency in Intimidation.",
            "category": "specialAbility"
          },
          {
            "name": "Menacing",
            "desc": "You gain proficiency in the Intimidation skill.",
            "category": "specialAbility"
          },
          {
            "name": "Relentless Endurance",
            "desc": "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest.",
            "category": "specialAbility"
          },
          {
            "name": "Savage Attacks",
            "desc": "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Orc"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_intimidation",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "owlin-2014",
    "name": "Owlin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 120 feet of yourself as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Flight",
        "desc": "Thanks to your wings, you have a flying speed equal to your walking speed. You can't use this flying speed if you're wearing medium or heavy armor.",
        "category": "specialAbility"
      },
      {
        "name": "Silent Feathers",
        "desc": "You have proficiency in the Stealth skill.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_stealth",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "plasmoid-2014",
    "name": "Plasmoid",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of yourself as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to acid and poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are an Ooze.",
        "category": "specialAbility"
      },
      {
        "name": "Amorphous",
        "desc": "You can squeeze through a space as narrow as 1 inch wide, provided you are wearing and carrying nothing. You have advantage on ability checks you make to initiate or escape a grapple.",
        "category": "specialAbility"
      },
      {
        "name": "Hold Breath",
        "desc": "You can hold your breath for 1 hour.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Resilience",
        "desc": "You have resistance to acid and poison damage, and you have advantage on saving throws against being poisoned.",
        "category": "specialAbility"
      },
      {
        "name": "Shape Self",
        "desc": "As an action, you can reshape your body to give yourself a head, one or two arms, one or two legs, and makeshift hands and feet, or you can revert to a limbless blob. While you have a humanlike shape, you can wear clothing and armor made for a Humanoid of your size.\nAs a bonus action, you can extrude a pseudopod that is up to 6 inches wide and 10 feet long or reabsorb it into your body. As part of the same bonus action, you can use this pseudopod to manipulate an object, open or close a door or container, or pick up or set down a Tiny object. The pseudopod contains no sensory organs and can't attack, activate magic items, or lift more than 10 pounds.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "acid",
      "poison"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "reborn-2014",
    "name": "Reborn",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Ancestral Legacy",
        "desc": "If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it.\nIf you don't keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice.",
        "category": "specialAbility"
      },
      {
        "name": "Deathless Nature",
        "desc": "You have escaped death, a fact represented by the following benefits:\n• You have advantage on saving throws against disease and being poisoned, and you have resistance to poison damage.\n• You have advantage on death saving throws.\n• You don't need to eat, drink, or breathe.\n• You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in an inactive, motionless state, during which you retain consciousness.",
        "category": "specialAbility"
      },
      {
        "name": "Knowledge from a Past Life",
        "desc": "You temporarily remember glimpses of the past, perhaps faded memories from ages ago or a previous life. When you make an ability check that uses a skill, you can roll a d6 immediately after seeing the number on the d20 and add the number on the d6 to the check. You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "rimekin-2014",
    "name": "Rimekin",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to cold damage.",
        "category": "specialAbility"
      },
      {
        "name": "Cold Fire Magic",
        "desc": "You know the Ray Of Frost cantrip. When you reach character levels 3 and 5, you learn the Ice Knife spell and the Flame Blade spell, respectively. You always have those spells prepared. You can cast each once without a spell slot, and you regain the ability to cast these spells in this way when you finish a Long Rest. You can also cast the spells using any spell slots you have of the appropriate level. When you cast Flame Blade using this trait, the spell deals Cold damage instead of Fire damage.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose the ability when you select this species).",
        "category": "specialAbility"
      },
      {
        "name": "Cold Resistance",
        "desc": "You have Resistance to Cold damage.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "cold"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "satyr-2014",
    "name": "Satyr",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Skills",
        "desc": "You have proficiency in Performance, Persuasion.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Fey.",
        "category": "specialAbility"
      },
      {
        "name": "Ram",
        "desc": "You can use your head and horns to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier bludgeoning damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Magic Resistance",
        "desc": "You have advantage on saving throws against spells.",
        "category": "specialAbility"
      },
      {
        "name": "Mirthful Leaps",
        "desc": "Whenever you make a long jump or a high jump, you can roll a d8 and add the number rolled to the number of feet you cover, even when making a standing jump. This extra distance costs movement as usual.",
        "category": "specialAbility"
      },
      {
        "name": "Reveler",
        "desc": "As an embodiment of revelry, you have proficiency in the Performance and Persuasion skills, and you have proficiency with one musical instrument of your choice.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 35,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_performance",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "sea-elf-2014",
    "name": "Sea Elf",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to cold damage.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered an elf for any prerequisite or effect that requires you to be an elf.",
        "category": "specialAbility"
      },
      {
        "name": "Child of the Sea",
        "desc": "You can breathe air and water, and you have resistance to cold damage.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Friend of the Sea",
        "desc": "Aquatic animals have an extraordinary affinity with your people. You can communicate simple ideas to any Beast that has a swimming speed. It can understand your words, though you have no special ability to understand it in return.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Trance",
        "desc": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.\nWhenever you finish this trance, you can gain two proficiencies that you don't have, each one with a 5 or a 5 of your choice selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory, and you retain them until you finish your next long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "cold"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 30,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "shadar-kai-2014",
    "name": "Shadar Kai",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered an elf for any prerequisite or effect that requires you to be an elf.",
        "category": "specialAbility"
      },
      {
        "name": "Blessing of the Raven Queen",
        "desc": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nStarting at 3rd level, you also gain resistance to all damage when you teleport using this trait. The resistance lasts until the start of your next turn. During that time, you appear ghostly and translucent.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Necrotic Resistance",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Trance",
        "desc": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.\nWhenever you finish this trance, you can gain two proficiencies that you don't have, each one with a 5 or a 5 of your choice selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory, and you retain them until you finish your next long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "necrotic"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "shifter-2014",
    "name": "Shifter",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were in dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Bestial Instincts",
        "desc": "Channeling the beast within, you have proficiency in one of the following skills of your choice: Acrobatics, Athletics, Intimidation, or Survival.",
        "category": "specialAbility"
      },
      {
        "name": "Shifting",
        "desc": "As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to 2 × your proficiency bonus. You can shift a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nWhenever you shift, you gain an additional benefit based on one of the following options (choose when you select this race):\n• Beasthide: \n• Longtooth: \n• Swiftstride: \n• Wildhunt:",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "shifter-beasthide-2014",
        "name": "Shifter Beasthide",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Athletics.",
            "category": "specialAbility"
          },
          {
            "name": "Natural Athlete",
            "desc": "You have proficiency in the Athletics skill.",
            "category": "specialAbility"
          },
          {
            "name": "Shifting Feature",
            "desc": "Whenever you shift, you gain 1d6 additional temporary hit points. While shifted, you have a +1 bonus to your Armor Class.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_athletics",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "shifter-longtooth-2014",
        "name": "Shifter Longtooth",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Intimidation.",
            "category": "specialAbility"
          },
          {
            "name": "Fierce",
            "desc": "You have proficiency in the Intimidation skill.",
            "category": "specialAbility"
          },
          {
            "name": "Shifting Feature",
            "desc": "While shifted, you can use your elongated fangs to make an unarmed strike as a bonus action. If you hit with your fangs, you can deal piercing damage equal to 1d6 + your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_intimidation",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "shifter-swiftstride-2014",
        "name": "Shifter Swiftstride",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Acrobatics.",
            "category": "specialAbility"
          },
          {
            "name": "Graceful",
            "desc": "You have proficiency in the Acrobatics skill.",
            "category": "specialAbility"
          },
          {
            "name": "Shifting Feature",
            "desc": "While shifted, your walking speed increases by 10 feet. Additionally, you can move up to 10 feet as a reaction when a creature ends its turn within 5 feet of you. This reactive movement doesn't provoke opportunity attacks.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_acrobatics",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "shifter-wildhunt-2014",
        "name": "Shifter Wildhunt",
        "traits": [
          {
            "name": "Skills",
            "desc": "You have proficiency in Survival.",
            "category": "specialAbility"
          },
          {
            "name": "Natural Tracker",
            "desc": "You have proficiency in the Survival skill.",
            "category": "specialAbility"
          },
          {
            "name": "Shifting Feature",
            "desc": "While shifted, you have advantage on Wisdom checks, and no creature within 30 feet of you can make an attack roll with advantage against you, unless you're incapacitated.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [
          {
            "skill": "skill_survival",
            "level": "proficient"
          }
        ],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "simic-hybrid-2014",
    "name": "Simic Hybrid",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Animal Enhancement",
        "desc": "Your body has been altered to incorporate certain animal characteristics. You choose one animal enhancement now and a second enhancement at 5th level.\nAt 1st level, choose one of the following options:\n• Manta Glide: \n• Nimble Climber: \n• Underwater Adaptation: \nAt 5th level, your body evolves further, developing new characteristics. Choose one of the options you didn't take at 1st level, or one of the following options:\n• Grappling Appendage: \n• Carapace: \n• Acid Spit:",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "siren-2014",
    "name": "Siren",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Siren's Song",
        "desc": "You know the Friends cantrip and can cast it without material components.",
        "category": "specialAbility"
      },
      {
        "name": "Flight",
        "desc": "You have a flying speed of 30 feet. You can't use your flying speed while you wear medium or heavy armor. (If your campaign uses the variant rule for encumbrance, you can't use your flying speed if you are encumbered.)",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 25,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "skeleton-2014",
    "name": "Skeleton",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are Undead.",
        "category": "specialAbility"
      },
      {
        "name": "Brittle Bones",
        "desc": "You are vulnerable to bludgeoning damage.",
        "category": "specialAbility"
      },
      {
        "name": "Undead Nature",
        "desc": "You are immune to poison damage and exhaustion, and you can't be poisoned. You don't require air, food, drink, or sleep.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "tabaxi-2014",
    "name": "Tabaxi",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Skills",
        "desc": "You have proficiency in Perception, Stealth.",
        "category": "specialAbility"
      },
      {
        "name": "Cat's Claws",
        "desc": "You can use your claws to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier slashing damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Cat's Talent",
        "desc": "You have proficiency in the Perception and Stealth skills.",
        "category": "specialAbility"
      },
      {
        "name": "Feline Agility",
        "desc": "Your reflexes and agility allow you to move with a burst of speed. When you move on your turn in combat, you can double your speed until the end of the turn. Once you use this trait, you can't use it again until you move 0 feet on one of your turns.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 30,
    "addsSkills": [
      {
        "skill": "skill_perception",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "thri-kreen-2014",
    "name": "Thri Kreen",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of yourself as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are a Monstrosity.",
        "category": "specialAbility"
      },
      {
        "name": "Chameleon Carapace",
        "desc": "While you aren't wearing armor, your carapace gives you a base Armor Class of 13 + your Dexterity modifier.\nAs an action, you can change the color of your carapace to match the color and texture of your surroundings, giving you advantage on Dexterity (Stealth) checks made to hide in those surroundings.",
        "category": "specialAbility"
      },
      {
        "name": "Secondary Arms",
        "desc": "You have two slightly smaller secondary arms below your primary pair of arms. The secondary arms can manipulate an object, open or close a door or container, pick up or set down a Tiny object, or wield a weapon that has the light property.",
        "category": "specialAbility"
      },
      {
        "name": "Sleepless",
        "desc": "You do not require sleep and can remain conscious during a long rest, though you must still refrain from strenuous activity to gain the benefit of the rest.",
        "category": "specialAbility"
      },
      {
        "name": "Thri-kreen Telepathy",
        "desc": "Without the assistance of magic, you can't speak the non-thri-kreen languages you know. Instead you use telepathy to convey your thoughts. You have the magical ability to transmit your thoughts mentally to willing creatures within 120 feet of yourself. A contacted creature doesn't need to share a language with you to understand your thoughts, but it must be able to understand at least one language. Your telepathic link to a creature is broken if you and the creature move more than 120 feet apart, if either of you is incapacitated, or if either of you mentally breaks the contact (no action required).",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "tiefling-2014",
    "name": "Tiefling",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Thanks to your infernal heritage, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Hellish Resistance",
        "desc": "You have resistance to fire damage.",
        "category": "specialAbility"
      },
      {
        "name": "Infernal Legacy",
        "desc": "You know the *thaumaturgy* cantrip. When you reach 3rd level, you can cast the *hellish rebuke* spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the *darkness* spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "fire"
    ],
    "addsLanguages": [
      "Common",
      "Infernal"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "tiefling-baalzebul-2014",
        "name": "Tiefling Baalzebul",
        "traits": [
          {
            "name": "Legacy of Maladomini",
            "desc": "You know the Thaumaturgy cantrip. When you reach 3rd level, you can cast the Ray Of Sickness spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Crown Of Madness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-dispater-2014",
        "name": "Tiefling Dispater",
        "traits": [
          {
            "name": "Legacy of Dis",
            "desc": "You know the Thaumaturgy cantrip. When you reach 3rd level, you can cast the Disguise Self spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Detect Thoughts spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-fierna-2014",
        "name": "Tiefling Fierna",
        "traits": [
          {
            "name": "Legacy of Phlegethos",
            "desc": "You know the Friends cantrip. When you reach 3rd level, you can cast the Charm Person spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Suggestion spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-glasya-2014",
        "name": "Tiefling Glasya",
        "traits": [
          {
            "name": "Legacy of Malbolge",
            "desc": "You know the Minor Illusion cantrip. When you reach 3rd level, you can cast the Disguise Self spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Invisibility spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-levistus-2014",
        "name": "Tiefling Levistus",
        "traits": [
          {
            "name": "Legacy of Stygia",
            "desc": "You know the Ray Of Frost cantrip. When you reach 3rd level, you can cast the Armor Of Agathys spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-mammon-2014",
        "name": "Tiefling Mammon",
        "traits": [
          {
            "name": "Legacy of Minauros",
            "desc": "You know the Mage Hand cantrip. When you reach 3rd level, you can cast the Tenser'S Floating Disk spell once with this trait and regain the ability to do so when you finish a short or long rest. When you reach 5th level, you can cast the Arcane Lock spell once with this trait, requiring no material component, and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-mephistopheles-2014",
        "name": "Tiefling Mephistopheles",
        "traits": [
          {
            "name": "Legacy of Cania",
            "desc": "You know the Mage Hand cantrip. When you reach 3rd level, you can cast the Burning Hands spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Flame Blade spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-variant-devil-s-tongue-2014",
        "name": "Tiefling Variant Devil S Tongue",
        "traits": [
          {
            "name": "Appearance",
            "desc": "Your tiefling might not look like other tieflings. Rather than having the physical characteristics described in the Player's Handbook, choose 1d4+1 of the following features: small horns; fangs or sharp teeth; a forked tongue; catlike eyes; six fingers on each hand; goatlike legs; cloven hoofs; a forked tail; leathery or scaly skin; red or dark blue skin; cast no shadow or reflection; exude a smell of brimstone.",
            "category": "specialAbility"
          },
          {
            "name": "Devil's Tongue",
            "desc": "You know the Vicious Mockery cantrip. When you reach 3rd level, you can cast the Charm Person spell as a 2nd-level spell once with this trait. When you reach 5th level, you can cast the Enthrall spell once with this trait. You must finish a long rest to cast these spells once again with this trait. Charisma is your spellcasting ability for them. This trait replaces the Infernal Legacy trait.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-variant-hellfire-2014",
        "name": "Tiefling Variant Hellfire",
        "traits": [
          {
            "name": "Appearance",
            "desc": "Your tiefling might not look like other tieflings. Rather than having the physical characteristics described in the Player's Handbook, choose 1d4+1 of the following features: small horns; fangs or sharp teeth; a forked tongue; catlike eyes; six fingers on each hand; goatlike legs; cloven hoofs; a forked tail; leathery or scaly skin; red or dark blue skin; cast no shadow or reflection; exude a smell of brimstone.",
            "category": "specialAbility"
          },
          {
            "name": "Hellfire",
            "desc": "You know the Thaumaturgy cantrip. Once you reach 3rd level, you can cast the Burning Hands spell once per day as a 2nd-level spell; you must finish a long rest in order to cast the spell again using this trait. Once you reach 5th level, you can also cast the Darkness spell; you must finish a long rest in order to cast the spell again using this trait. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-variant-infernal-legacy-2014",
        "name": "Tiefling Variant Infernal Legacy",
        "traits": [
          {
            "name": "Appearance",
            "desc": "Your tiefling might not look like other tieflings. Rather than having the physical characteristics described in the Player's Handbook, choose 1d4+1 of the following features: small horns; fangs or sharp teeth; a forked tongue; catlike eyes; six fingers on each hand; goatlike legs; cloven hoofs; a forked tail; leathery or scaly skin; red or dark blue skin; cast no shadow or reflection; exude a smell of brimstone.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-variant-winged-2014",
        "name": "Tiefling Variant Winged",
        "traits": [
          {
            "name": "Appearance",
            "desc": "Your tiefling might not look like other tieflings. Rather than having the physical characteristics described in the Player's Handbook, choose 1d4+1 of the following features: small horns; fangs or sharp teeth; a forked tongue; catlike eyes; six fingers on each hand; goatlike legs; cloven hoofs; a forked tail; leathery or scaly skin; red or dark blue skin; cast no shadow or reflection; exude a smell of brimstone.",
            "category": "specialAbility"
          },
          {
            "name": "Winged",
            "desc": "You have bat-like wings sprouting from your shoulder blades. You have a flying speed of 30 feet while you aren't wearing heavy armor.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 30,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-zariel-2014",
        "name": "Tiefling Zariel",
        "traits": [
          {
            "name": "Legacy of Avernus",
            "desc": "You know the Thaumaturgy cantrip. When you reach 3rd level, you can cast the Searing Smite spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Branding Smite spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "tortle-2014",
    "name": "Tortle",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Claws",
        "desc": "You have claws that you can use to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier slashing damage, instead of the bludgeoning damage normal for an unarmed strike.",
        "category": "specialAbility"
      },
      {
        "name": "Hold Breath",
        "desc": "You can hold your breath for up to 1 hour.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Armor",
        "desc": "Your shell provides you a base AC of 17 (your Dexterity modifier doesn't affect this number). You can't wear light, medium, or heavy armor, but if you are using a shield, you can apply the shield's bonus as normal.",
        "category": "specialAbility"
      },
      {
        "name": "Nature's Intuition",
        "desc": "Thanks to your mystical connection to nature, you gain proficiency with one of the following skills of your choice: Animal Handling, Medicine, Nature, Perception, Stealth, or Survival.",
        "category": "specialAbility"
      },
      {
        "name": "Shell Defense",
        "desc": "You can withdraw into your shell as an action. Until you emerge, you gain a +4 bonus to your AC, and you have advantage on Strength and Constitution saving throws. While in your shell, you are prone, your speed is 0 and can't increase, you have disadvantage on Dexterity saving throws, you can't take reactions, and the only action you can take is a bonus action to emerge from your shell.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": {
      "base": 17,
      "ability": null,
      "blocksArmor": true,
      "allowsShield": true
    },
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "triton-2014",
    "name": "Triton",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to cold damage.",
        "category": "specialAbility"
      },
      {
        "name": "Amphibious",
        "desc": "You can breathe air and water.",
        "category": "specialAbility"
      },
      {
        "name": "Control Air and Water",
        "desc": "You can cast Fog Cloud with this trait. Starting at 3rd level, you can cast the Gust Of Wind spell with this trait. Starting at 5th level, you can also cast the Water Walk spell with it. Once you cast any of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these spells using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      },
      {
        "name": "Emissary of the Sea",
        "desc": "You can communicate simple ideas to any Beast, Elemental, or Monstrosity that has a swimming speed. It can understand your words, though you have no special ability to understand it in return.",
        "category": "specialAbility"
      },
      {
        "name": "Guardian of the Depths",
        "desc": "Adapted to the frigid ocean depths, you have resistance to cold damage.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "cold"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 30,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "troglodyte-2014",
    "name": "Troglodyte",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Chameleon Skin",
        "desc": "You have advantage on Dexterity (Stealth) checks made to hide.",
        "category": "specialAbility"
      },
      {
        "name": "Stench",
        "desc": "Any creature other than a troglodyte that starts its turn within 5 ft. of you must succeed on a DC 12 Constitution saving throw or be poisoned until the start of the creature's next turn. On a successful saving throw, the creature is immune to the stench of all troglodytes for 1 hour.",
        "category": "specialAbility"
      },
      {
        "name": "Sunlight Sensitivity",
        "desc": "While in sunlight, you have disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
        "category": "specialAbility"
      },
      {
        "name": "Natural Armor",
        "desc": "Your thick hide grants you a +1 bonus to Armor Class.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 1,
    "subraces": []
  },
  {
    "id": "vampire-2014",
    "name": "Vampire",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "Thanks to your heritage, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Blood Thirst",
        "desc": "You can drain blood and life energy from a willing creature, or one that is grappled by you, incapacitated, or restrained. Make a melee attack against the target. If you hit, you deal 1 piercing damage and 1d6 necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken, and you regain hit points equal to that amount. The reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.",
        "category": "specialAbility"
      },
      {
        "name": "Vampiric Resistance",
        "desc": "You have resistance to necrotic damage.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "necrotic"
    ],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "vampire-ixalan-2014",
        "name": "Vampire Ixalan",
        "traits": [
          {
            "name": "Feast of Blood",
            "desc": "When you drain blood with your Bloodthirst ability, you experience a surge of vitality. Your speed increases by 10 feet, and you gain advantage on Strength and Dexterity checks and saving throws for 1 minute.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "vampire-zendikar-2014",
        "name": "Vampire Zendikar",
        "traits": [
          {
            "name": "Null Transformation",
            "desc": "A humanoid killed with your Bloodthirst ability becomes a null.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "vedalken-2014",
    "name": "Vedalken",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Vedalken Dispassion",
        "desc": "You have advantage on all Intelligence, Wisdom, and Charisma saving throws.",
        "category": "specialAbility"
      },
      {
        "name": "Tireless Precision",
        "desc": "You are proficient in one of the following skills of your choice: Arcana, History, Investigation, Medicine, Performance, or Sleight of Hand. You are also proficient with one 5 of your choice.\nWhenever you make an ability check with the chosen skill or tool, roll a d4 and add the number rolled to the check's total.",
        "category": "specialAbility"
      },
      {
        "name": "Partially Amphibious",
        "desc": "By absorbing oxygen through your skin, you can breathe underwater for up to 1 hour. Once you've reached that limit, you can't use this trait again until you finish a long rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Other"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "verdan-2014",
    "name": "Verdan",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Skills",
        "desc": "You have proficiency in Persuasion.",
        "category": "specialAbility"
      },
      {
        "name": "Black Blood Healing",
        "desc": "The black blood that is a sign of your people's connection to That-Which-Endures boosts your natural healing. When you roll a 1 or 2 on any Hit Die you spend at the end of a short rest, you can reroll the die and must use the new roll.",
        "category": "specialAbility"
      },
      {
        "name": "Limited Telepathy",
        "desc": "You can telepathically speak to any creature you can see within 30 feet of you. You don't need to share a language with the creature for it to understand your telepathy, but it must be able to understand at least one language. This process of communication is slow and limited, allowing you to transmit and receive only simple ideas and straightforward concepts.",
        "category": "specialAbility"
      },
      {
        "name": "Persuasive",
        "desc": "Your people's lack of history makes you trustworthy and humble. You have proficiency in the Persuasion skill.",
        "category": "specialAbility"
      },
      {
        "name": "Telepathic Insight",
        "desc": "Your mind's connection to the world around you strengthens your will. You have advantage on all Wisdom and Charisma saving throws.",
        "category": "specialAbility"
      },
      {
        "name": "Language",
        "desc": "You speak, read, and write Common, Goblin, and one additional language of your choice. This language typically has some connection to one of the areas or cultures that has been part of your life.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Varies",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Goblin"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_persuasion",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "warforged-2014",
    "name": "Warforged",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Constructed Resilience",
        "desc": "You were created to have remarkable fortitude, represented by the following benefits:\n• You have advantage on saving throws against being poisoned, and you have resistance to poison damage.\n• You don't need to eat, drink, or breathe.\n• You are immune to disease.\n• You don't need to sleep, and magic can't put you to sleep.",
        "category": "specialAbility"
      },
      {
        "name": "Sentry's Rest",
        "desc": "When you take a long rest, you must spend at least six hours in an inactive, motionless state, rather than sleeping. In this state, you appear inert, but it doesn't render you unconscious, and you can see and hear as normal.",
        "category": "specialAbility"
      },
      {
        "name": "Integrated Protection",
        "desc": "Your body has built-in defensive layers, which can be enhanced with armor:\n• You gain a +1 bonus to Armor Class.\n• You can don only armor with which you have proficiency. To don armor other than a shield, you must incorporate it into your body over the course of 1 hour, during which you remain in contact with the armor. To doff armor, you must spend 1 hour removing it. You can rest while donning or doffing armor in this way.\n• While you live, the armor incorporated into your body can't be removed against your will.",
        "category": "specialAbility"
      },
      {
        "name": "Specialized Design",
        "desc": "You gain one skill proficiency and one tool proficiency of your choice.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "yuan-ti-2014",
    "name": "Yuan Ti",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Magic Resistance",
        "desc": "You have advantage on saving throws against spells.",
        "category": "specialAbility"
      },
      {
        "name": "Poison Resilience",
        "desc": "You have advantage on saving throws you make to avoid or end the poisoned condition on yourself. You also have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Serpentine Spellcasting",
        "desc": "You know the Poison Spray cantrip. You can cast Animal Friendship an unlimited number of times with this trait, but you can target only snakes with it. Starting at 3rd level, you can also cast Suggestion with this trait. Once you cast it, you can't do so again until you finish a long rest. You can also cast it using any spell slots you have of 2nd level or higher.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "yuan-ti-pureblood-2014",
        "name": "Yuan Ti Pureblood",
        "traits": [
          {
            "name": "Darkvision",
            "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
            "category": "specialAbility"
          },
          {
            "name": "Innate Spellcasting",
            "desc": "You know the Poison Spray cantrip. You can cast Animal Friendship an unlimited number of times with this trait, but you can target only snakes with it. Starting at 3rd level, you can also cast Suggestion with this trait. Once you cast it, you can't do so again until you finish a long rest. Charisma is your spellcasting ability for these spells.",
            "category": "specialAbility"
          },
          {
            "name": "Magic Resistance",
            "desc": "You have advantage on saving throws against spells and other magical effects.",
            "category": "specialAbility"
          },
          {
            "name": "Poison Immunity",
            "desc": "You are immune to poison damage and the poisoned condition.",
            "category": "specialAbility"
          }
        ],
        "setsSize": "Medium",
        "sizeChoices": null,
        "setsSpeed": 30,
        "setsSenses": [
          {
            "type": "darkvision",
            "range": 60
          }
        ],
        "addsResistances": [],
        "addsLanguages": [
          "Common",
          "Abyssal",
          "Draconic"
        ],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ]
  },
  {
    "id": "zombie-2014",
    "name": "Zombie",
    "creature_type": "Humanoid",
    "edition": "srd2014",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Creature Type",
        "desc": "You are Undead.",
        "category": "specialAbility"
      },
      {
        "name": "Undead Fortitude",
        "desc": "If damage reduces you to 0 hit points, you must make a Constitution saving throw with a DC of 5+the damage taken, unless the damage is radiant or from a critical hit. On a success, you drop to 1 hit point instead.",
        "category": "specialAbility"
      },
      {
        "name": "Undead Nature",
        "desc": "You are immune to poison damage, and you can't be poisoned. You don't require air, food, drink, or sleep.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "aasimar-2024",
    "name": "Aasimar",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a Celestial for any effect that relates to creature type.",
        "category": "specialAbility"
      },
      {
        "name": "Celestial Resistance",
        "desc": "You have Resistance to Necrotic damage and Radiant damage.",
        "category": "specialAbility"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Healing Hands",
        "desc": "As a Magic action, you touch a creature and cause it to regain a number of Hit Points equal to your Proficiency Bonus × your character level. Once you use this trait, you can't use it again until you finish a Long Rest.",
        "category": "action"
      },
      {
        "name": "Light Bearer",
        "desc": "You know the Light cantrip. Charisma is your spellcasting ability for it.",
        "category": "specialAbility"
      },
      {
        "name": "Celestial Revelation",
        "desc": "When you reach character level 3, you can transform as a Bonus Action using one of the revelation options below. You stay transformed for 1 minute or until you end the transformation as a Bonus Action. You then can't use this trait again until you finish a Long Rest. When you transform, choose Heavenly Wings, Inner Radiance, or Necrotic Shroud.",
        "category": "bonusAction"
      },
      {
        "name": "Heavenly Wings (Revelation)",
        "desc": "Two spectral wings sprout from your back. Until the transformation ends, you have a Fly Speed equal to your Speed.",
        "category": "specialAbility"
      },
      {
        "name": "Inner Radiance (Revelation)",
        "desc": "Searing light radiates from your eyes and mouth. For the transformation's duration, you shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet, and at the end of each of your turns, each creature within 10 feet of you takes Radiant damage equal to your Proficiency Bonus.",
        "category": "specialAbility"
      },
      {
        "name": "Necrotic Shroud (Revelation)",
        "desc": "Your eyes turn into pools of darkness, and ghostly, flightless wings sprout from your back. Creatures other than your allies within 10 feet of you that can see you must succeed on a Charisma saving throw (DC 8 + your Charisma modifier + your Proficiency Bonus) or have the Frightened condition until the end of your next turn. Until the transformation ends, once on each of your turns, you can deal extra Necrotic damage to one target when you deal damage to it with an attack or a spell. The extra damage equals your Proficiency Bonus.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Medium",
      "Small"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [
      "necrotic",
      "radiant"
    ],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "changeling-2024",
    "name": "Changeling",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Changeling Instincts",
        "desc": "Thanks to your connection to the fey realm, you gain proficiency in two of the following skills of your choice: Deception, Insight, Intimidation, Performance, or Persuasion.",
        "category": "specialAbility"
      },
      {
        "name": "Shape-Shifter",
        "desc": "As an action, you can shape-shift to change your appearance and your voice. You determine the specifics of the changes, including your coloration, hair length, and sex. You can also adjust your height and weight and can change your size between Medium and Small. You can make yourself appear as a member of another playable species, though none of your game statistics change. You can't duplicate the appearance of an individual you've never seen, and you must adopt a form that has the same basic arrangement of limbs that you have. This trait doesn't change your clothing and equipment.\nWhile shape-shifted with this trait, you have Advantage on Charisma checks.\nYou stay in the new form until you take an action to revert to your true form.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "dragonborn-2024",
    "name": "Dragonborn",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Draconic Ancestry",
        "desc": "Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestry table — Black/Copper (Acid), Blue/Bronze (Lightning), Brass/Gold/Red (Fire), Green (Poison), Silver/White (Cold). Your choice affects your Breath Weapon and Damage Resistance traits.",
        "category": "specialAbility"
      },
      {
        "name": "Breath Weapon",
        "desc": "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (your choice). Each creature in that area must make a Dexterity saving throw (DC = 8 + your Constitution modifier + your Proficiency Bonus). On a failed save, the target takes 1d10 damage of the type associated with your Draconic Ancestry. On a successful save, it takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10). You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        "category": "action"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Draconic Flight",
        "desc": "When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your Breath Weapon. Once you use this trait, you can't use it again until you finish a Long Rest.",
        "category": "bonusAction"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Draconic"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "dragonborn-black-2024",
        "name": "Black Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Acid damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Acid damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "acid"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Acid",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-blue-2024",
        "name": "Blue Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Lightning damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Lightning damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "lightning"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Lightning",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-brass-2024",
        "name": "Brass Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Fire damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Fire damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "fire"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Fire",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-bronze-2024",
        "name": "Bronze Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Lightning damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Lightning damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "lightning"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Lightning",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-copper-2024",
        "name": "Copper Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Acid damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Acid damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "acid"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Acid",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-gold-2024",
        "name": "Gold Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Fire damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Fire damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "fire"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Fire",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-green-2024",
        "name": "Green Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Poison damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Poison damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "poison"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Poison",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-red-2024",
        "name": "Red Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Fire damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Fire damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "fire"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Fire",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-silver-2024",
        "name": "Silver Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Cold damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Cold damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "cold"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Cold",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "dragonborn-white-2024",
        "name": "White Dragonborn",
        "traits": [
          {
            "name": "Damage Resistance",
            "desc": "You have Resistance to Cold damage.",
            "category": "specialAbility"
          },
          {
            "name": "Breath Weapon Type",
            "desc": "Your Breath Weapon deals Cold damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "cold"
        ],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": "Cold",
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ],
    "subraceLabel": "Ancestry"
  },
  {
    "id": "dwarf-2024",
    "name": "Dwarf",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 120 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Dwarven Resilience",
        "desc": "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.",
        "category": "specialAbility"
      },
      {
        "name": "Dwarven Toughness",
        "desc": "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.",
        "category": "specialAbility"
      },
      {
        "name": "Stonecunning",
        "desc": "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching such a surface to use this Tremorsense. The stone can be natural or worked. You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        "category": "bonusAction"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      },
      {
        "type": "tremorsense",
        "range": 60
      }
    ],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [
      "Common",
      "Dwarvish"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "elf-2024",
    "name": "Elf",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Elven Lineage",
        "desc": "You are part of an elven lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table: Drow, High Elf, or Wood Elf. You gain the level 1 benefit of that lineage. When you reach character levels 3 and 5, you learn a higher-level spell as listed in the table. You always have the listed spell prepared. Once you cast a spell with this trait without expending a spell slot, you can't cast that spell with this trait again until you finish a Long Rest. You can also cast the spell using any spell slots you have. Your spellcasting ability for these spells is the one you chose for the Elven Lineage.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have Advantage on saving throws you make to avoid or end the Charmed condition.",
        "category": "specialAbility"
      },
      {
        "name": "Keen Senses",
        "desc": "You have proficiency in the Perception skill.",
        "category": "specialAbility"
      },
      {
        "name": "Trance",
        "desc": "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Elvish"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "elf-drow-2024",
        "name": "Drow",
        "traits": [
          {
            "name": "Lineage Spells",
            "desc": "Level 1: Dancing Lights cantrip. Level 3: Faerie Fire (Charisma, Wisdom, or Intelligence — chosen at lineage selection). Level 5: Darkness.",
            "category": "specialAbility"
          },
          {
            "name": "Superior Darkvision",
            "desc": "Your Darkvision has a range of 120 feet.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [
          {
            "name": "Dancing Lights",
            "minLevel": 1
          },
          {
            "name": "Darkness",
            "minLevel": 5
          }
        ],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-high-2024",
        "name": "High Elf",
        "traits": [
          {
            "name": "Lineage Spells",
            "desc": "Level 1: Prestidigitation cantrip. Level 3: Detect Magic. Level 5: Misty Step.",
            "category": "specialAbility"
          },
          {
            "name": "Cantrip Choice",
            "desc": "You know one cantrip of your choice from the Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (one ability of your choice when you select this lineage).",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [
          {
            "name": "Prestidigitation",
            "minLevel": 1
          },
          {
            "name": "Detect Magic",
            "minLevel": 3
          },
          {
            "name": "Misty Step",
            "minLevel": 5
          }
        ],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "elf-wood-2024",
        "name": "Wood Elf",
        "traits": [
          {
            "name": "Lineage Spells",
            "desc": "Level 1: Druidcraft cantrip. Level 3: Longstrider. Level 5: Pass Without Trace.",
            "category": "specialAbility"
          },
          {
            "name": "Fleet of Foot",
            "desc": "Your Speed increases to 35 feet.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": 35,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [
          {
            "name": "Druidcraft",
            "minLevel": 1
          },
          {
            "name": "Longstrider",
            "minLevel": 3
          },
          {
            "name": "Pass Without Trace",
            "minLevel": 5
          }
        ],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ],
    "subraceLabel": "Lineage"
  },
  {
    "id": "gnome-2024",
    "name": "Gnome",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Gnomish Cunning",
        "desc": "You have Advantage on Intelligence, Wisdom, and Charisma saving throws.",
        "category": "specialAbility"
      },
      {
        "name": "Gnomish Lineage",
        "desc": "You are part of a gnomish lineage that grants you supernatural abilities. Choose Forest Gnome or Rock Gnome.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Gnomish"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "gnome-forest-2024",
        "name": "Forest Gnome",
        "traits": [
          {
            "name": "Minor Illusion (Cantrip)",
            "desc": "You know the Minor Illusion cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (one ability of your choice when you select this lineage).",
            "category": "specialAbility"
          },
          {
            "name": "Speak with Small Beasts",
            "desc": "Through sounds and gestures, you can communicate simple ideas with any Beast that has an Intelligence of 3 or less.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "gnome-rock-2024",
        "name": "Rock Gnome",
        "traits": [
          {
            "name": "Artificer's Lore",
            "desc": "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your Proficiency Bonus instead of any Proficiency Bonus you normally apply.",
            "category": "specialAbility"
          },
          {
            "name": "Tinker",
            "desc": "Using tinker's tools, you can spend 1 hour and 10 GP worth of materials to construct a Tiny clockwork device (AC 5, 1 HP). When you create the device, choose its function: Clockwork Toy, Fire Starter, or Music Box. The device ceases to function after 24 hours (unless you spend 1 hour repairing it to keep it functioning) or when you use an action to dismantle it; at that time, you can reclaim the materials used to create it. You can have only three such devices functional at a time. Requires proficiency with tinker's tools, gained automatically with this race.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ],
    "subraceLabel": "Lineage"
  },
  {
    "id": "goliath-2024",
    "name": "Goliath",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Giant Ancestry",
        "desc": "You are descended from giants. Choose one of the supernatural boons from the Giant Ancestries table — Cloud's Jaunt, Fire's Burn, Frost's Chill, Hill's Tumble, Stone's Endurance, Storm's Thunder. You can use the chosen boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        "category": "specialAbility"
      },
      {
        "name": "Large Form",
        "desc": "Starting at character level 5, you can change your size to Large as a Bonus Action if you're Medium and your space has room to make you Large. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest.",
        "category": "bonusAction"
      },
      {
        "name": "Powerful Build",
        "desc": "You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 35,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Giant"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "goliath-cloud-2024",
        "name": "Cloud Giant",
        "traits": [
          {
            "name": "Cloud's Jaunt",
            "desc": "As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.",
            "category": "bonusAction"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goliath-fire-2024",
        "name": "Fire Giant",
        "traits": [
          {
            "name": "Fire's Burn",
            "desc": "When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goliath-frost-2024",
        "name": "Frost Giant",
        "traits": [
          {
            "name": "Frost's Chill",
            "desc": "When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target. In addition, the target's Speed is reduced by 10 feet until the start of your next turn.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goliath-hill-2024",
        "name": "Hill Giant",
        "traits": [
          {
            "name": "Hill's Tumble",
            "desc": "When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goliath-stone-2024",
        "name": "Stone Giant",
        "traits": [
          {
            "name": "Stone's Endurance",
            "desc": "When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.",
            "category": "reaction"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "goliath-storm-2024",
        "name": "Storm Giant",
        "traits": [
          {
            "name": "Storm's Thunder",
            "desc": "When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.",
            "category": "reaction"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ],
    "subraceLabel": "Ancestry"
  },
  {
    "id": "halfling-2024",
    "name": "Halfling",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Brave",
        "desc": "You have Advantage on saving throws you make to avoid or end the Frightened condition.",
        "category": "specialAbility"
      },
      {
        "name": "Halfling Nimbleness",
        "desc": "You can move through the space of any creature that is a size larger than you, but you can't stop in the same space.",
        "category": "specialAbility"
      },
      {
        "name": "Luck",
        "desc": "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.",
        "category": "specialAbility"
      },
      {
        "name": "Naturally Stealthy",
        "desc": "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Halfling"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "hexblood-2024",
    "name": "Hexblood",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Eerie Token",
        "desc": "As a Bonus Action, you can create a magical token by harmlessly removing a lock of hair, detaching a nail, or using some other method. While the token exists, you gain the following benefits:\n• Distant Message: As a Magic action, you can send a telepathic message of 25 words or fewer to a creature holding or carrying the token, as long as you are within 10 miles of it.\n• Remote Viewing: If you are within 10 miles of the token, you can take a Magic action to extend your senses through the token for 1 minute, until you have the Incapacitated condition, or until you end this state (no action required). During this state, you can see and hear from the token as if you were located where it is. When this state ends, the token is harmlessly destroyed. Unless the token is destroyed early, it lasts until you finish a Long Rest. Once you create a token using this feature, you can't do so again until you finish a Long Rest.\n• Hex Magic: You always have the Disguise Self and Hex spells prepared. You can cast each spell once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select this species).",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "human-2024",
    "name": "Human",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Resourceful",
        "desc": "You gain Heroic Inspiration whenever you finish a Long Rest.",
        "category": "specialAbility"
      },
      {
        "name": "Skillful",
        "desc": "You gain proficiency in one skill of your choice.",
        "category": "specialAbility"
      },
      {
        "name": "Versatile",
        "desc": "You gain an Origin feat of your choice (see chapter 5).",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Medium",
      "Small"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kalashtar-2024",
    "name": "Kalashtar",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to psychic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Dual Mind",
        "desc": "You have Advantage on Wisdom and Charisma saving throws.",
        "category": "specialAbility"
      },
      {
        "name": "Mental Discipline",
        "desc": "You have Resistance to Psychic damage.",
        "category": "specialAbility"
      },
      {
        "name": "Mind Link",
        "desc": "You have telepathy with a range in feet equal to 10 times your level. When you're using this trait to speak telepathically to a creature, you can take a Magic action to give that creature the ability to speak telepathically with you for 1 hour or until you take another Magic action to end this effect.",
        "category": "specialAbility"
      },
      {
        "name": "Severed from Dreams",
        "desc": "You can't be the target of the Dream spell. In addition, when you finish a Long Rest, you gain proficiency in one skill of your choice. This proficiency lasts until you finish another Long Rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "psychic"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "khoravar-2024",
    "name": "Khoravar",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Ancestry",
        "desc": "You have Advantage on saving throws you make to avoid or end the Charmed condition.",
        "category": "specialAbility"
      },
      {
        "name": "Fey Gift",
        "desc": "You know the Friends cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (choose the ability when you select this species).",
        "category": "specialAbility"
      },
      {
        "name": "Lethargy Resilience",
        "desc": "When you fail a saving throw to avoid or end the Unconscious condition, you can succeed instead. Once you use this trait, you can't do so again until you finish 1d4 Long Rests.",
        "category": "specialAbility"
      },
      {
        "name": "Skill Versatility",
        "desc": "You gain proficiency in one skill or with one tool of your choice. Whenever you finish a Long Rest, you can replace it with another skill or tool proficiency.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "kithkin-2024",
    "name": "Kithkin",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern colour in darkness, only shades of grey.",
        "category": "specialAbility"
      },
      {
        "name": "Brave",
        "desc": "You have Advantage on saving throws you make to avoid or end the Frightened condition.",
        "category": "specialAbility"
      },
      {
        "name": "Halfling Nimbleness",
        "desc": "You can move through the space of any creature that is a size larger than you, but you can't stop in the same space.",
        "category": "specialAbility"
      },
      {
        "name": "Luck",
        "desc": "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.",
        "category": "specialAbility"
      },
      {
        "name": "Naturally Stealthy",
        "desc": "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.",
        "category": "specialAbility"
      },
      {
        "name": "Kithkin Lineage",
        "desc": "As a native of either Lorwyn and Shadowmoor, you may gain additional traits.\n• Lorwyn: You do not gain any additional traits.\n• Shadowmoor: You have Darkvision with a range of 120 feet.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Small",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "lupin-2024",
    "name": "Lupin",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Feral Pounce",
        "desc": "Your Unarmed Strikes deal Slashing damage instead of Bludgeoning damage. In addition, when you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and the Shove options. You can use this benefit only once per turn.",
        "category": "specialAbility"
      },
      {
        "name": "Howl",
        "desc": "As a Bonus Action, you let out an unearthly howl. Each creature of your choice within 15 feet of you must succeed on a Wisdom saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus) or have Disadvantage on attack rolls and saving throws until the start of your next turn.\nYou can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        "category": "specialAbility"
      },
      {
        "name": "Werewolf Instincts",
        "desc": "You have proficiency in the Perception, Stealth, or Survival skill.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "orc-2024",
    "name": "Orc",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid.",
        "category": "specialAbility"
      },
      {
        "name": "Adrenaline Rush",
        "desc": "You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.",
        "category": "bonusAction"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 120 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Relentless Endurance",
        "desc": "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can't use it again until you finish a Long Rest.",
        "category": "specialAbility"
      }
    ],
    "setsSize": "Medium",
    "sizeChoices": null,
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common",
      "Orc"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "owlin-2024",
    "name": "Owlin",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You can see in dim light within 120 feet of yourself as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray.",
        "category": "specialAbility"
      },
      {
        "name": "Flight",
        "desc": "Thanks to your wings, you have a flying speed equal to your walking speed. You can't use this flying speed if you're wearing medium or heavy armor.",
        "category": "specialAbility"
      },
      {
        "name": "Silent Feathers",
        "desc": "You have proficiency in the Stealth skill.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 120
      }
    ],
    "addsResistances": [],
    "addsLanguages": [
      "Common"
    ],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 30,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [
      {
        "skill": "skill_stealth",
        "level": "proficient"
      }
    ],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "reborn-2024",
    "name": "Reborn",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Escaped Death",
        "desc": "You have Advantage on Death Saving Throws.",
        "category": "specialAbility"
      },
      {
        "name": "Everlasting",
        "desc": "You don't gain Exhaustion levels from dehydration, malnutrition, or suffocation. You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in an inactive, motionless state, during which you retain consciousness.",
        "category": "specialAbility"
      },
      {
        "name": "Knowledge from a Past Life",
        "desc": "You gain proficiency in one skill of your choice.\nIn addition, you can temporarily peer into the past to aid you in the present. When you fail an ability check, you can roll 1d6 and add the number rolled to the d20, potentially turning the failure into a success. You can do this a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        "category": "specialAbility"
      },
      {
        "name": "Strange Endurance",
        "desc": "You have Resistance to one of the following damage types of your choice: Cold, Necrotic, or Poison.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "shifter-2024",
    "name": "Shifter",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Bestial Instincts",
        "desc": "Channeling the beast within, you gain proficiency in one of the following skills of your choice: Acrobatics, Athletics, Intimidation, or Survival.",
        "category": "specialAbility"
      },
      {
        "name": "Shifting",
        "desc": "As a Bonus Action, you can shape-shift to assume a more bestial appearance. This transformation lasts for 1 minute or until you revert to your normal appearance as a Bonus Action. When you shift, you gain Temporary Hit Points equal to 2 times your Proficiency Bonus. You can shift a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.\nWhenever you shift, you gain the benefit of one of the following options (choose when you select this species)\n• Beasthide: You gain 1d6 additional Temporary Hit Points. While shifted, you have a +1 bonus to your Armor Class.\n• Longtooth: When you shift and as a Bonus Action on your other turns while shifted, you can use your elongated fangs to make an Unarmed Strike. If you hit with this Unarmed Strike and deal damage, you can deal Piercing damage equal to 1d6 plus your Strength modifier, instead of the normal damage of an Unarmed Strike.\n• Swiftstride: While you are shifted, your Speed increases by 10 feet. Additionally, you can move up to 10 feet as a Reaction when a creature ends its turn within 5 feet of you. This reactive movement doesn't provoke Opportunity Attacks.\n• Wildhunt: While shifted, you have Advantage on Wisdom checks. Additionally, no creature within 30 feet of you can have Advantage on an attack roll against you unless you have the Incapacitated condition.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  },
  {
    "id": "tiefling-2024",
    "name": "Tiefling",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Creature Type",
        "desc": "You are a Humanoid. You are also considered a Fiend for any effect that relates to creature type.",
        "category": "specialAbility"
      },
      {
        "name": "Darkvision",
        "desc": "You have Darkvision with a range of 60 feet.",
        "category": "specialAbility"
      },
      {
        "name": "Fiendish Legacy",
        "desc": "You are linked to a fiendish realm and gain abilities tied to that realm. Choose Abyssal, Chthonic, or Infernal from the Fiendish Legacies table. You gain the cantrip listed for your legacy at level 1, and additional spells become available at character levels 3 and 5. You always have the listed spells prepared. Once you cast a spell with this trait without expending a spell slot, you can't cast that spell with this trait again until you finish a Long Rest. Your spellcasting ability for these spells is the one you chose for the legacy (Intelligence, Wisdom, or Charisma).",
        "category": "specialAbility"
      },
      {
        "name": "Otherworldly Presence",
        "desc": "You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you chose for the Fiendish Legacy trait.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": null,
    "setsSpeed": null,
    "setsSenses": [
      {
        "type": "darkvision",
        "range": 60
      }
    ],
    "addsResistances": [],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": [
      {
        "id": "tiefling-abyssal-2024",
        "name": "Abyssal Legacy",
        "traits": [
          {
            "name": "Legacy Spells",
            "desc": "Level 1: Poison Spray cantrip. Level 3: Ray of Sickness. Level 5: Hold Person.",
            "category": "specialAbility"
          },
          {
            "name": "Damage Resistance",
            "desc": "Resistance to Poison damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "poison"
        ],
        "addsLanguages": [],
        "addsSpells": [
          {
            "name": "Poison Spray",
            "minLevel": 1
          },
          {
            "name": "Ray of Sickness",
            "minLevel": 3
          },
          {
            "name": "Hold Person",
            "minLevel": 5
          }
        ],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-chthonic-2024",
        "name": "Chthonic Legacy",
        "traits": [
          {
            "name": "Legacy Spells",
            "desc": "Level 1: Chill Touch cantrip. Level 3: False Life. Level 5: Ray of Enfeeblement.",
            "category": "specialAbility"
          },
          {
            "name": "Damage Resistance",
            "desc": "Resistance to Necrotic damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [
          "necrotic"
        ],
        "addsLanguages": [],
        "addsSpells": [
          {
            "name": "Chill Touch",
            "minLevel": 1
          },
          {
            "name": "False Life",
            "minLevel": 3
          },
          {
            "name": "Ray of Enfeeblement",
            "minLevel": 5
          }
        ],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      },
      {
        "id": "tiefling-infernal-2024",
        "name": "Infernal Legacy",
        "traits": [
          {
            "name": "Legacy Spells",
            "desc": "Level 1: Fire Bolt cantrip. Level 3: Hellish Rebuke. Level 5: Darkness.",
            "category": "specialAbility"
          },
          {
            "name": "Damage Resistance",
            "desc": "Resistance to Fire damage.",
            "category": "specialAbility"
          }
        ],
        "setsSize": null,
        "sizeChoices": null,
        "setsSpeed": null,
        "setsSenses": [],
        "addsResistances": [],
        "addsLanguages": [],
        "addsSpells": [
          {
            "name": "Fire Bolt",
            "minLevel": 1
          },
          {
            "name": "Hellish Rebuke",
            "minLevel": 3
          },
          {
            "name": "Darkness",
            "minLevel": 5
          }
        ],
        "breathWeaponType": null,
        "speed_fly": 0,
        "speed_swim": 0,
        "speed_climb": 0,
        "addsSkills": [],
        "naturalArmor": null,
        "acBonus": 0
      }
    ],
    "subraceLabel": "Legacy"
  },
  {
    "id": "warforged-2024",
    "name": "Warforged",
    "creature_type": "Humanoid",
    "edition": "srd2024",
    "traits": [
      {
        "name": "Damage Resistance",
        "desc": "You have resistance to poison damage.",
        "category": "specialAbility"
      },
      {
        "name": "Construct Resilience",
        "desc": "You have Resistance to Poison damage. You also have Advantage on saving throws to avoid or end the Poisoned condition.",
        "category": "specialAbility"
      },
      {
        "name": "Integrated Protection",
        "desc": "You gain a +1 bonus to your Armor Class. In addition, armor you have donned can't be removed against your will while you're alive.",
        "category": "specialAbility"
      },
      {
        "name": "Sentry's Rest",
        "desc": "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 6 hours if you spend those hours in an inactive, motionless state. During this time, you appear inert but remain conscious.",
        "category": "specialAbility"
      },
      {
        "name": "Specialized Design",
        "desc": "You gain one skill proficiency and one tool proficiency of your choice.",
        "category": "specialAbility"
      },
      {
        "name": "Tireless",
        "desc": "You don't gain Exhaustion levels from dehydration, malnutrition, or suffocation.",
        "category": "specialAbility"
      }
    ],
    "setsSize": null,
    "sizeChoices": [
      "Small",
      "Medium"
    ],
    "setsSpeed": 30,
    "setsSenses": [],
    "addsResistances": [
      "poison"
    ],
    "addsLanguages": [],
    "addsSpells": [],
    "breathWeaponType": null,
    "speed_fly": 0,
    "speed_swim": 0,
    "speed_climb": 0,
    "addsSkills": [],
    "naturalArmor": null,
    "acBonus": 0,
    "subraces": []
  }
];

// 'all' spans both editions. A race that only ever existed in one of them —
// the Tortle is 2014-only — was invisible to anyone who left the picker on its
// default edition, which reads as the race being missing from the app.
export function raceTypesForEdition(edition) {
  const types = new Set(
    RACE_CATALOG
      .filter((r) => edition === 'all' || r.edition === edition)
      .map((r) => r.creature_type)
  );
  return Array.from(types).sort();
}

// The Type dropdown on the sheet used to gate this list. Every race in the
// catalogue is a Humanoid, so picking any other Type emptied the picker
// entirely and read as "the races have disappeared". The race now sets the
// Type when it is applied, rather than the Type deciding which races exist.
export function racesForEdition(edition) {
  return RACE_CATALOG
    .filter((r) => edition === 'all' || r.edition === edition)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function racesForType(type, edition) {
  return RACE_CATALOG
    .filter((r) => (edition === 'all' || r.edition === edition) && r.creature_type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findRace(raceId) {
  return RACE_CATALOG.find((r) => r.id === raceId) || null;
}

export function combinedRaceTraits(race, subrace) {
  if (!race) return [];
  // The sub-race's version of a trait REPLACES the parent's.
  //
  // Concatenating the two listed the same trait twice wherever a lineage
  // restates something its parent already grants — a Drow has Darkvision
  // because it is an Elf, and again, further, because it is a Drow. Both rows
  // landed on the sheet.
  //
  // Replacing is also the right reading of the rules: the sub-race entry is
  // the more specific one (a Drow's Darkvision reaches 120 feet, not 60), so
  // it is the one to keep.
  const out = [];
  const at = new Map(); // lowercase name → index in `out`
  for (const t of [...(race.traits || []), ...((subrace && subrace.traits) || [])]) {
    if (!t || !t.category || t.category === 'property') continue;
    const key = String(t.name || '').trim().toLowerCase();
    if (!key) { out.push(t); continue; }
    const seen = at.get(key);
    if (seen === undefined) {
      at.set(key, out.length);
      out.push(t);
    } else {
      out[seen] = t;   // later wins, and the sub-race comes later
    }
  }
  return out;
}

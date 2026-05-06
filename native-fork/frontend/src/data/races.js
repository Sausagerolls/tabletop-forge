// Race catalogue — REGENERATED FROM CSV. Edit the source CSVs in
// race-data/ and re-run `python3 race-data/build_races_js.py`.

export const RACE_EDITIONS = [
  { id: 'srd2024', label: 'D&D 2024 SRD' },
  { id: 'srd2014', label: 'D&D 5e (2014 SRD)' },
];

export const RACE_CATALOG = [
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
    "subraces": [
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
        "breathWeaponType": null
      }
    ]
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
    "subraces": [
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
        "breathWeaponType": null
      }
    ]
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
    "subraces": [
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
        "breathWeaponType": null
      }
    ]
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
    "subraces": []
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
    "subraces": []
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
    "subraces": [
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
        "breathWeaponType": null
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
        "breathWeaponType": null
      }
    ]
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
        "breathWeaponType": "Acid"
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
        "breathWeaponType": "Lightning"
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
        "breathWeaponType": "Fire"
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
        "breathWeaponType": "Lightning"
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
        "breathWeaponType": "Acid"
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
        "breathWeaponType": "Fire"
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
        "breathWeaponType": "Poison"
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
        "breathWeaponType": "Fire"
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
        "breathWeaponType": "Cold"
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
        "breathWeaponType": "Cold"
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
            "minLevel": 1,
            "prepared": true
          },
          {
            "name": "Darkness",
            "minLevel": 5,
            "prepared": true
          }
        ],
        "breathWeaponType": null
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
            "minLevel": 1,
            "prepared": true
          },
          {
            "name": "Detect Magic",
            "minLevel": 3,
            "prepared": true
          },
          {
            "name": "Misty Step",
            "minLevel": 5,
            "prepared": true
          }
        ],
        "breathWeaponType": null
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
            "minLevel": 1,
            "prepared": true
          },
          {
            "name": "Longstrider",
            "minLevel": 3,
            "prepared": true
          },
          {
            "name": "Pass Without Trace",
            "minLevel": 5,
            "prepared": true
          }
        ],
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
        "breathWeaponType": null
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
            "minLevel": 1,
            "prepared": true
          },
          {
            "name": "Ray of Sickness",
            "minLevel": 3,
            "prepared": true
          },
          {
            "name": "Hold Person",
            "minLevel": 5,
            "prepared": true
          }
        ],
        "breathWeaponType": null
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
            "minLevel": 1,
            "prepared": true
          },
          {
            "name": "False Life",
            "minLevel": 3,
            "prepared": true
          },
          {
            "name": "Ray of Enfeeblement",
            "minLevel": 5,
            "prepared": true
          }
        ],
        "breathWeaponType": null
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
            "minLevel": 1,
            "prepared": true
          },
          {
            "name": "Hellish Rebuke",
            "minLevel": 3,
            "prepared": true
          },
          {
            "name": "Darkness",
            "minLevel": 5,
            "prepared": true
          }
        ],
        "breathWeaponType": null
      }
    ],
    "subraceLabel": "Legacy"
  }
];

export function raceTypesForEdition(edition) {
  const types = new Set(
    RACE_CATALOG.filter((r) => r.edition === edition).map((r) => r.creature_type)
  );
  return Array.from(types).sort();
}

export function racesForType(type, edition) {
  return RACE_CATALOG
    .filter((r) => r.edition === edition && r.creature_type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findRace(raceId) {
  return RACE_CATALOG.find((r) => r.id === raceId) || null;
}

export function combinedRaceTraits(race, subrace) {
  if (!race) return [];
  const all = [...(race.traits || []), ...((subrace && subrace.traits) || [])];
  return all.filter((t) => t.category && t.category !== 'property');
}

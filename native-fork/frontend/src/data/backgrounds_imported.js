// GENERATED — do not edit by hand.
//
// Written by class-data/import_5etools_backgrounds.py. Re-run it to refresh.
//
// Merged with the curated BACKGROUNDS_2024, which wins on any id it already
// defines.
//
// `abilityChoice` is the field that matters:
//
//   'listed' — a 2024 background. It names three ability scores and the
//              player spends +2/+1 across two of them, or +1/+1/+1 across
//              all three.
//
//   'free'   — a 2014 background. Those grant no ability bonuses at all under
//              their own rules, because in 2014 the bonuses came from the
//              race. A 2024 race grants none either, so pairing the two would
//              leave a character with nothing from anywhere. These therefore
//              offer the same +2/+1 spend, but across ALL SIX scores, and the
//              player chooses.

export const IMPORTED_BACKGROUNDS = [
  {
    "id": "aberrant-heir-2024",
    "name": "Aberrant Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_history",
      "skill_intimidation"
    ],
    "tool": "Disguise Kit",
    "feat": {
      "name": "Aberrant Dragonmark",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Dagger, Disguise Kit, Costume, Traveler's Clothes, 16 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Disguise Kit",
            "qty": 1
          },
          {
            "name": "Costume",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 16,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "acolyte-2014",
    "name": "Acolyte",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Shelter of the Faithful: As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle. You might also have ties to a specific temple dedicated to your chosen deity or pantheon, and you have a residence there. This could be the temple where you used to serve, if you remain on good terms with it, or a temple where you have found a new home. While near your temple, you can call upon the priests for assistance, provided the assistance you ask for is not hazardous and you remain in good standing with your temple.\nSuggested Characteristics: Acolytes are shaped by their experience in temples or other religious communities. Their study of the history and tenets of their faith and their relationships to temples, shrines, or hierarchies affect their mannerisms and ideal",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Holy symbol (a gift to you when you entered the priesthood)",
          "qty": 1
        },
        {
          "name": "Sticks of incense",
          "qty": 5
        },
        {
          "name": "Vestments",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Prayer book",
        "items": [
          {
            "name": "Prayer book",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Prayer wheel",
        "items": [
          {
            "name": "Prayer wheel",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "acolyte-2024",
    "name": "Acolyte",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "intelligence",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "tool": "Calligrapher's Supplies",
    "feat": {
      "name": "Magic Initiate (Cleric)",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Book (Prayers), Calligrapher's Supplies, Holy Symbol, Parchment \u00d710, Robe, 8 GP",
        "items": [
          {
            "name": "Book (Prayers)",
            "qty": 1
          },
          {
            "name": "Calligrapher's Supplies",
            "qty": 1
          },
          {
            "name": "Holy Symbol",
            "qty": 1
          },
          {
            "name": "Parchment",
            "qty": 10
          },
          {
            "name": "Robe",
            "qty": 1
          }
        ],
        "gp": 8,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "anthropologist-2014",
    "name": "Anthropologist",
    "edition": "srd2014",
    "source": "ToA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nCultural Chameleon: Before becoming an adventurer, you spent much of your adult life away from your homeland, living among people different from your kin. You came to understand these foreign cultures and the ways of their people, who eventually treated you as one of their own. One culture had more of an influence on you than any other, shaping your beliefs and customs. Choose a race whose culture you've adopted, or roll on the Adopted Culture table. d8 | Culture 1 \u2014 Aarakocra 2 \u2014 Dwarf 3 \u2014 Elf 4 \u2014 Goblin 5 \u2014 Halfling 6 \u2014 Human 7 \u2014 Lizardfolk 8 \u2014 Orc\nFeature: Adept Linguist: You can communicate with humanoids who don't speak any language you know. You must observe the humanoids interacting with one another for at least 1 day, after which you learn a handful of important words, expressions, and gestures - enough to communicate on a rudimentary level.\nSuggested Characteristics: Anthropologists leave behind the societies into which they were born to discover what life is like in other parts of the world. They seek to see how other races and civilizations survive - or why they did not. Some anthropologists are driven by intellectua",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Leather-bound diary",
          "qty": 1
        },
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Trinket of special significance",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "archaeologist-2014",
    "name": "Archaeologist",
    "edition": "srd2014",
    "source": "ToA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nDust Digger: Prior to becoming an adventurer, you spent most of your young life crawling around in the dust, pilfering relics of questionable value from crypts and ruins. Though you managed to sell a few of your discoveries and earn enough coin to buy proper adventuring gear, you have held onto an item that has great emotional value to you. Roll on the Signature Item table to see what you have, or choose an item from the table. d8 | Item 1 \u2014 10-foot pole 2 \u2014 Crowbar 3 \u2014 Hat 4 \u2014 Hooded lantern 5 \u2014 Medallion 6 \u2014 Shovel 7 \u2014 Sledgehammer 8 \u2014 Whip\nFeature: Historical Knowledge: When you enter a ruin or dungeon, you can correctly ascertain its original purpose and determine its builders, whether those were dwarves, elves, humans, yuan-ti, or some other known race. In addition, you can determine the monetary value of art objects more than a century old.\nSuggested Characteristics: Few archaeologists can resist the lure of an unexplored ruin or dungeon, particularly if such a site is the source of legends or is rumored to contain the treasures and relics of wizards, warlords, or royalty. Some archaeologists plund",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Wooden case containing a map to a ruin or dungeon",
          "qty": 1
        },
        {
          "name": "Bullseye Lantern",
          "qty": 1
        },
        {
          "name": "Miner's Pick",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Shovel",
          "qty": 1
        },
        {
          "name": "Two-Person Tent",
          "qty": 1
        },
        {
          "name": "Trinket recovered from a dig site",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "archaeologist-2024",
    "name": "Archaeologist",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_history",
      "skill_survival"
    ],
    "tool": "Cartographer's Tools",
    "feat": {
      "name": "Skilled",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Cartographer's Tools, Bullseye Lantern, Map, Map Or Scroll Case, Shovel, Tent, Traveler's Clothes, 17 GP",
        "items": [
          {
            "name": "Cartographer's Tools",
            "qty": 1
          },
          {
            "name": "Bullseye Lantern",
            "qty": 1
          },
          {
            "name": "Map",
            "qty": 1
          },
          {
            "name": "Map Or Scroll Case",
            "qty": 1
          },
          {
            "name": "Shovel",
            "qty": 1
          },
          {
            "name": "Tent",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 17,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "artisan-2024",
    "name": "Artisan",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_investigation",
      "skill_persuasion"
    ],
    "feat": {
      "name": "Crafter",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Artisan's Tools, Pouch \u00d72, Traveler's Clothes, 32 GP",
        "items": [
          {
            "name": "Artisan's Tools",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 2
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 32,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "astral-drifter-2014",
    "name": "Astral Drifter",
    "edition": "srd2014",
    "source": "AAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nLongevity: You are 20d6 years older than you look, because you have spent that much time in the Astral Sea without aging.\nFeature: Divine Contact: You gain the Magic Initiate feat from the Player's Handbook and must choose cleric for the feat. In the Astral Sea, you crossed paths with a wandering deity. The encounter was brief and nonviolent, yet it made a lasting impression on you. This deity saw fit to share one secret or obscure bit of cosmic lore with you. Work with your DM to determine the details of this knowledge and its impact on the campaign. Roll on the Divine Contact table to determine which deity you encountered, or work with your DM to identify a more suitable choice. d10 | Wandering Deity 1 \u2014 Corellon, god of art and magic (chaotic good) 2 \u2014 Tymora, god of good fortune (chaotic good) 3 \u2014 Fharlanghn, god of horizons and travel (neutral good) 4 \u2014 Istus, god of fate and destiny (neutral) 5 \u2014 Nuada, god of war and warriors (neutral) 6 \u2014 Zivilyn, god of wisdom (neutral) 7 \u2014 Arawn, god of life and death (neutral evil) 8 \u2014 Hecate, god of magic and moons (chaotic evil) 9 \u2014 Celestian, god of stars and wanderers (neutral) 1",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "feat": {
      "name": "Magic Initiate",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Diary",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "athlete-2014",
    "name": "Athlete",
    "edition": "srd2014",
    "source": "MOT",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Echoes of Victory: You have attracted admiration among spectators, fellow athletes, and trainers in the region that hosted your past athletic victories. When visiting any settlement within 100 miles of where you grew up, there is a 50 percent chance you can find someone there who admires you and is willing to provide information or temporary shelter. Between adventures, you might compete in athletic events sufficient enough to maintain a comfortable lifestyle, as per the \"8\" downtime activity in chapter 8 of the Player's Handbook.\nFavored Event: While many athletes practice various games and events, most excel at a single form of competition. Roll or choose from the options in the Favored Event table to determine the athletic event in which you excel. d8 | Favored Event 1 \u2014 Marathon 2 \u2014 Long-distance running 3 \u2014 Wrestling 4 \u2014 Boxing 5 \u2014 Chariot or horse race 6 \u2014 Pankration (mixed unarmed combat) 7 \u2014 Hoplite race (racing in full armor with a unit) 8 \u2014 Pentathlon (running, long jump, discus, javelin, wrestling)\nSuggested Characteristics: Competition can forge strong bonds between teammates and riv",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_acrobatics",
      "skill_athletics"
    ],
    "tool": "Vehicles (Land)",
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Bronze discus",
        "items": [
          {
            "name": "Bronze discus",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Leather ball",
        "items": [
          {
            "name": "Leather ball",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ],
    "equipment_note": "This background offers a further equipment choice beyond the one shown."
  },
  {
    "id": "augen-trust-spy-2014",
    "name": "Augen Trust (Spy)",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Spy Contact: You have a reliable and trustworthy contact who acts as your liaison to a network of other spies. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.\nSpecialty: There are many kinds of criminals, and within a thieves' guild or similar criminal organization, individual members have particular specialties. Even criminals who operate outside of such organizations have strong preferences for certain kinds of crimes over others. Choose the role you played in your criminal life, or roll on the table below. d8 | Specialty 1 \u2014 Blackmailer 2 \u2014 Burglar 3 \u2014 Enforcer 4 \u2014 Fence 5 \u2014 Highway robber 6 \u2014 Hired killer 7 \u2014 Pickpocket 8 \u2014 Smuggler\nSuggested Characteristics: Criminals might seem like villains on the surface, and many of them are villainous to the core. But some have an abundance of endearing, if not redeeming, characteristics. There might be honor among thieves, but criminals rarely show any respect for law or authority. d8 | Personality Trait 1 \u2014 I al",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Crowbar",
          "qty": 1
        },
        {
          "name": "Dark common clothes including a hood",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "azorius-functionary-2014",
    "name": "Azorius Functionary",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Legal Authority: You have the authority to enforce the laws of Ravnica, and that status inspires a certain amount of respect and even fear in the populace. People mind their manners in your presence and avoid drawing your attention; they assume you have the right to be wherever you are. Showing your Azorius insignia gets you an audience with anyone you want to talk to (though it might cause more problems than it solves when you're dealing with incorrigible lawbreakers). If you abuse this privilege, though, you can get in serious trouble with your superiors and even be stripped of your position.\nAzorius Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Azorius Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells Cantrip \u2014 Friends, Message 1st \u2014 Command, Ensnaring Strike 2nd \u2014 Arcane Lock, Calm Emotions, Hold Person 3rd \u2014 Clairvoyance, Counterspell 4th \u2014 Compulsion, Divination 5th \u2014 Dominate Person Your magic often takes the form of ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_intimidation"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Azorius insignia",
          "qty": 1
        },
        {
          "name": "Scroll containing the text of a law important to you",
          "qty": 1
        },
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-acolyte-2014",
    "name": "Baldur's Gate Acolyte",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Shelter of the Faithful: As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle. You might also have ties to a specific temple dedicated to your chosen deity or pantheon, and you have a residence there. This could be the temple where you used to serve, if you remain on good terms with it, or a temple where you have found a new home. While near your temple, you can call upon the priests for assistance, provided the assistance you ask for is not hazardous and you remain in good standing with your temple.\nBaldur's Gate Feature: Religious Community: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Holy symbol (a gift to you when you entered the priesthood)",
          "qty": 1
        },
        {
          "name": "Sticks of incense",
          "qty": 5
        },
        {
          "name": "Vestments",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Prayer book",
        "items": [
          {
            "name": "Prayer book",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Prayer wheel",
        "items": [
          {
            "name": "Prayer wheel",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "baldur-s-gate-charlatan-2014",
    "name": "Baldur's Gate Charlatan",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: False Identity: You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.\nBaldur's Gate Feature: Long-Lost Heir: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. You're well-versed in the mannerisms and idiosyncrasies of Baldurian patriars and other nobles, imitating them smoothly enough to convince even the snootiest family heads of your authenticity. You're skilled at posing as the long-lost heir to some imaginary or extinguished patriar lineage. Because of your skill in passing yourself off as a patriar, you have a Watch token that allows you alone into the Upper City of Baldur's Gate. You might be able to bluff others through with you, or even convince members of the Watch tha",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_sleight_of_hand"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Disguise Kit",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Stoppered bottles filled with colored liquid \u00d710",
        "items": [
          {
            "name": "Stoppered bottles filled with colored liquid",
            "qty": 10
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Set of weighted dice",
        "items": [
          {
            "name": "Set of weighted dice",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "c",
        "label": "Deck of marked cards",
        "items": [
          {
            "name": "Deck of marked cards",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "d",
        "label": "Signet ring of an imaginary duke",
        "items": [
          {
            "name": "Signet ring of an imaginary duke",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "baldur-s-gate-criminal-2014",
    "name": "Baldur's Gate Criminal",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Criminal Contact: You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.\nBaldur's Gate Feature: Criminal Connections: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. In Baldur's Gate, crime is just another business. As a result, you can arrange a meeting with a low-ranking operative of nearly any business, patriar family, crew, government institution, or\u2014certainly\u2014the Guild. This operative will hear you out and, at their discretion, take your information or request up their chain of command. These meetings almost always occur in shady venues.\nCriminal Origins: Criminals are pervasive in Baldur's Gate. If you wish, you may roll on the Criminal Origins table for an event that began your life of crime. d8 ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Crowbar",
          "qty": 1
        },
        {
          "name": "Dark common clothes including a hood",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-entertainer-2014",
    "name": "Baldur's Gate Entertainer",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: By Popular Demand: You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble's court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.\nBaldur's Gate Feature: Backstage Pass: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. You've learned that most of the real business of entertainment (or any other venture) happens behind the scenes. It's easy for you to case what sorts of audiences attend what venue\u2014like how toughs gather at the Blushing Mermaid or how brash patriars congregate at the Helm and Cloak. After a successful performance, you may meet an enthusiastic member of the crowd\u2014someone of a",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_acrobatics",
      "skill_performance"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "InstrumentMusical",
          "qty": 1
        },
        {
          "name": "The favor of an admirer (love letter, lock of hair, or trinket)",
          "qty": 1
        },
        {
          "name": "Costume Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-folk-hero-2014",
    "name": "Baldur's Gate Folk Hero",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Rustic Hospitality: Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.\nBaldur's Gate Feature: Social Vengeance: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. You've lived your entire life in the Lower or Outer City of Baldur's Gate. You grew up seeing arrogant patriars flaunt their wealth while your hardworking neighbors struggled. As a result, you know how eager commoners in Baldur's Gate are to see any patriar get what they deserve. While in a busy part of the Lower City or Outer City of Baldur's Gate, you can spend 2d10 minutes to convince 1d6 commoners to perform a non-illegal act that inconveniences a member of the Watch or Flaming Fist, a patriar, or some other wealthy lo",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_animal_handling",
      "skill_survival"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Shovel",
          "qty": 1
        },
        {
          "name": "Iron Pot",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-guild-artisan-2014",
    "name": "Baldur's Gate Guild Artisan",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Guild Membership: As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession, which can be a good place to meet potential patrons, allies, or hirelings. Guilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing. Such connections might require the donation of money or magic items to the guild's coffers. You must pay dues of 5 gp per month to the guild. If you miss payments, you must make up back dues to remain in the guild's good graces.\nBaldur's Gate Feature: Professional Courtesy: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discret",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Letter of introduction from your guild",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-hermit-2014",
    "name": "Baldur's Gate Hermit",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Discovery: The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history. It might be information that would be damaging to the people who or consigned you to exile, and hence the reason for your return to society. Work with your DM to determine the details of your discovery and its impact on the campaign.\nBaldur's Gate Feature: The Real City: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. You know the Baldur's Gate most Baldurians ignore, the dog-eat-dog world of the homeless and unfortunate. You know where to go in the Lower C",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_medicine",
      "skill_religion"
    ],
    "tool": "Herbalism Kit",
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Scroll case stuffed full of notes from your studies or prayers",
          "qty": 1
        },
        {
          "name": "Winter blanket",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Herbalism Kit",
          "qty": 1
        }
      ],
      "gp": 5,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-noble-2014",
    "name": "Baldur's Gate Noble",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nBaldur's Gate Feature: Patriar: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. As a member of one of the elite families of Baldur's Gate, you may pass through city gates without paying tolls, mingle among the Gate's nobility unquestioned, and impress those on the lookout for wealthy patrons. You are welcome in the Upper City and may stay there after dark without being harassed or evicted. Your word is accepted over others' without question, and any corruption among guards or government officials tends to work in your favor, not against you\u2014at least until you make some effort to expose it.\nSuggested Characteristics: Nobles are born and raised to a very different lifestyle than most people ever experience, and their personalities reflect that upbringing. A noble title comes with a plethora of bonds\u2014responsibilities to family, to other nobles (including the sovereign), to the people entrusted to the family's care, or even to the title itself. Bu",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Signet Ring",
          "qty": 1
        },
        {
          "name": "Scroll of pedigree",
          "qty": 1
        },
        {
          "name": "Purse",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-outlander-2014",
    "name": "Baldur's Gate Outlander",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Wanderer: You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.\nBaldur's Gate Feature: Immigrant Experience: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. Even after your short time in Baldur's Gate, you've learned the city holds more walls and gates than those the Watch and Flaming Fist patrols. You are known within the city's immigrant communities. Should you ever need to learn about a foreign land, people, tradition, or history, you know where to find someone with firsthand experience\u2014likely somewhere in the Outer City.\nOutlander Origins: Foreigners of all kinds come to Baldur's Gate daily, drawn by countless reasons from countless lands. The Outlander Origins tabl",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Staff",
          "qty": 1
        },
        {
          "name": "Hunting Trap",
          "qty": 1
        },
        {
          "name": "Trophy from an animal you killed",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-sage-2014",
    "name": "Baldur's Gate Sage",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Researcher: When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.\nBaldur's Gate Feature: Rumor Monger: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. Via your personal rumor mill and articles published in Baldur's Mouth, you can surmise a great deal about Baldurians' secrets\u2014who's practicing necromancy, who's involved in spying or smuggling, who would purchase or craft dangerous magical wares without batting an eyelash. Whenever a noteworthy crime or mysterious happening occurs in the city, you immediately have a list of 1d",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_history"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Quill",
          "qty": 1
        },
        {
          "name": "Small knife",
          "qty": 1
        },
        {
          "name": "Letter from a dead colleague posing a question you have not yet been able to answer",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-sailor-2014",
    "name": "Baldur's Gate Sailor",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Ship's Passage: When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you're calling in a favor, you can't be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.\nBaldur's Gate Feature: Smuggler's Sense: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. You're familiar with the docks of Baldur's Gate, the movement of inspectors and tax collectors, the way cargo and coin flows. As a result, it's easy for you to hustle a load of cargo ashore or see such a cargo onto a cooperative ship without attracting suspicion or taxation. You also know the movements of the Gra",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_perception"
    ],
    "tool": "Navigator's Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Belaying pin",
          "qty": 1
        },
        {
          "name": "Silk Rope (50 Feet)",
          "qty": 1
        },
        {
          "name": "Lucky charm",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "baldur-s-gate-soldier-2014",
    "name": "Baldur's Gate Soldier",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Military Rank: You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use. You can also usually gain access to friendly military encampments and fortresses where your rank is recognized.\nBaldur's Gate Feature: City Guard: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. You may choose to currently serve in either the Flaming Fist or the Watch. If you do, you have responsibilities related to your post. For as long as you perform these responsibilities, you gain benefits. If you stop performing your responsibilities, though, you lose access to the benefits and might suffer further fallout. Should you lose these benefits, you may regain them by having an unpleasant conversation with your",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_intimidation"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Insignia of rank",
          "qty": 1
        },
        {
          "name": "Trophy taken from a fallen enemy (a dagger, broken blade, or piece of a banner)",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Bone dice set",
        "items": [
          {
            "name": "Bone dice set",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Playing Card Set",
        "items": [
          {
            "name": "Playing Card Set",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "baldur-s-gate-urchin-2014",
    "name": "Baldur's Gate Urchin",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: City Secrets: You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.\nBaldur's Gate Feature: Gateguide Connection: The effects of a Baldur's Gate feature can be used only while the character is in Baldur's Gate\u2014though, at the DM's discretion, they might have applicable effects in situations similar to those in Baldur's Gate. Even though you might not be a member of the Gateguides crew, you've associated with enough of them that you know their torch-based code. From the lighting, placement, and type of torch arranged on or near a structure, you can gather a great deal of information about those who live or do business there, particularly if they deal fairly with strangers, have Guild or government connections, or have either helped or denied the Gateguides in the past.\nSuggested Characteristics: Urchins are shaped by lives of desperate poverty, for good and for ill. They tend to be driven either",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_sleight_of_hand",
      "skill_stealth"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Small knife",
          "qty": 1
        },
        {
          "name": "Map of the city you grew up in",
          "qty": 1
        },
        {
          "name": "Pet mouse",
          "qty": 1
        },
        {
          "name": "Token to remember your parents by",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "boros-legionnaire-2014",
    "name": "Boros Legionnaire",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Legion Station: You have an established place in the hierarchy of the Boros Legion. You can requisition simple equipment for temporary use, and you can gain access to any Boros garrison in Ravnica, where you can rest in safety and receive the attention of medics. You are also paid a salary of 1 gp (a Boros-minted 1-zino coin) per week, which (combined with free lodging in your garrison) enables you to maintain a poor lifestyle between adventures.\nBoros Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Boros Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells Cantrip \u2014 Fire Bolt, Sacred Flame 1st \u2014 Guiding Bolt, Heroism 2nd \u2014 Aid, Scorching Ray 3rd \u2014 Beacon Of Hope, Blinding Smite 4th \u2014 Death Ward, Wall Of Fire 5th \u2014 Flame Strike Your magic often features dramatic bursts of flame or radiance. When you cast beneficial spells on your allies, they appear momentarily surrounded with halos of bright fire.\nSuggest",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_intimidation"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Boros insignia",
          "qty": 1
        },
        {
          "name": "Feather from an angel's wing",
          "qty": 1
        },
        {
          "name": "Tattered piece of a Boros banner (a souvenir from a famous battle)",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 2,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "carouser-2024",
    "name": "Carouser",
    "edition": "srd2024",
    "source": "ABH",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_deception",
      "skill_persuasion"
    ],
    "tool": "Gaming Set",
    "feat": {
      "name": "Tireless Reveler",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Dagger, Gaming Set (same as chosen proficiency), Fine Clothes, Glass Bottle, Mirror, Perfume, Pouch, Tinderbox, 19 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Gaming Set (same as chosen proficiency)",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Glass Bottle",
            "qty": 1
          },
          {
            "name": "Mirror",
            "qty": 1
          },
          {
            "name": "Perfume",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          }
        ],
        "gp": 19,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "celebrity-adventurer-s-scion-2014",
    "name": "Celebrity Adventurer's Scion",
    "edition": "srd2014",
    "source": "AI",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Name Dropping: You know and have met any number of powerful people across the land\u2014and some of them might even remember you. You might be able to wrangle minor assistance from a major figure in the campaign, at the DM's discretion. Additionally, the common folk treat you with deference, and your heritage and the stories you tell might be good for a free meal or a place to sleep.\nSuggested Characteristics: Scions of celebrity adventurers must deal with fame that's not theirs, wealth they didn't earn, and expectations they can never hope to meet. These hardships can have adverse effects, but those who cope with them can arrive at a decent attitude and a grounded worldview. Those who fail become bitter\u2014or worse. d8 | Personality Trait 1 \u2014 I will never get out of my famous parent's shadow, and no one else will ever understand this burden. 2 \u2014 I've seen enough of the adventuring life to have realistic expectations and empathy for my peers. 3 \u2014 Living up to my legacy will be difficult, but I'm going to do it. 4 \u2014 I'm used to the very best in life, and that's a hard habit to break. 5 \u2014 My parent taught",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_perception",
      "skill_performance"
    ],
    "tool": "Disguise Kit",
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Disguise Kit",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 30,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "charlatan-2014",
    "name": "Charlatan",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: False Identity: You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.\nFavorite Schemes: Every charlatan has an angle he or she uses in preference to other schemes. Choose a favorite scam or roll on the table below. d6 | Scam 1 \u2014 I cheat at games of chance. 2 \u2014 I shave coins or forge documents. 3 \u2014 I insinuate myself into people's lives to prey on their weakness and secure their fortunes. 4 \u2014 I put on new identities like clothes. 5 \u2014 I run sleight-of-hand cons on street corners. 6 \u2014 I convince people that worthless junk is worth their hard-earned money.\nSuggested Characteristics: Charlatans are colorful characters who conceal their true selves behind the masks they construct. They reflect what people want to see, what they want to believe, and how they see the world. But their true selves are sometimes plagued by an uneasy conscience, an",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_sleight_of_hand"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Disguise Kit",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Stoppered bottles filled with colored liquid \u00d710",
        "items": [
          {
            "name": "Stoppered bottles filled with colored liquid",
            "qty": 10
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Set of weighted dice",
        "items": [
          {
            "name": "Set of weighted dice",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "c",
        "label": "Deck of marked cards",
        "items": [
          {
            "name": "Deck of marked cards",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "d",
        "label": "Signet ring of an imaginary duke",
        "items": [
          {
            "name": "Signet ring of an imaginary duke",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "charlatan-2024",
    "name": "Charlatan",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_deception",
      "skill_sleight_of_hand"
    ],
    "tool": "Forgery Kit",
    "feat": {
      "name": "Skilled",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Forgery Kit, Costume, Fine Clothes, 15 GP",
        "items": [
          {
            "name": "Forgery Kit",
            "qty": 1
          },
          {
            "name": "Costume",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 15,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "chondathan-freebooter-2024",
    "name": "Chondathan Freebooter",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_athletics",
      "skill_sleight_of_hand"
    ],
    "tool": "Weaver's Tools",
    "feat": {
      "name": "Skilled",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Dagger, Weaver's Tools, Backpack, Ball Bearings, Basket, Bedroll, Bucket, Rations (3 days' worth) \u00d73, Rope, Signal Whistle, Traveler's Clothes, 38 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Weaver's Tools",
            "qty": 1
          },
          {
            "name": "Backpack",
            "qty": 1
          },
          {
            "name": "Ball Bearings",
            "qty": 1
          },
          {
            "name": "Basket",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Bucket",
            "qty": 1
          },
          {
            "name": "Rations (3 days' worth)",
            "qty": 3
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Signal Whistle",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 38,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "city-watch-2014",
    "name": "City Watch",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Watcher's Eye: Your experience in enforcing the law, and dealing with lawbreakers, gives you a feel for local laws and criminals. You can easily find the local outpost of the watch or a similar organization, and just as easily pick out the dens of criminal activity in a community, although you're more likely to be welcome in the former locations rather than the latter.\nSuggested Characteristics: Use the tables for the soldier background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a member of the city watch. Your bond is likely associated with your fellow watch members or the watch organization itself and almost certainly concerns your community. Your ideal probably involves the fostering of peace and safety. An investigator is likely to have an ideal connected to achieving justice by successfully solving crimes.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_insight"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Uniform in the style of your unit and indicative of your rank",
          "qty": 1
        },
        {
          "name": "Horn with which to summon help",
          "qty": 1
        },
        {
          "name": "Set of manacles",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "clan-crafter-2014",
    "name": "Clan Crafter",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Respect of the Stout Folk: As well respected as clan crafters are among outsiders, no one esteems them quite so highly as dwarves do. You always have free room and board in any place where shield dwarves or gold dwarves dwell, and the individuals in such a settlement might vie among themselves to determine who can offer you (and possibly your companions) the finest accommodations and assistance.\nSuggested Characteristics: Use the tables for the guild artisan background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a clan crafter. (For instance, consider the words \"guild\" and \"clan\" to be interchangeable.) Your bond is almost certainly related to the master or the clan that taught you, or else to the work that you produce. Your ideal might have to do with maintaining the high quality of your work or preserving the dwarven traditions of craftsmanship.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_insight"
    ],
    "languages": [
      "Dwarvish"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Maker's mark chisel used to mark your handiwork with the symbol of the clan of crafters you learned your skill from",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "cloistered-scholar-2014",
    "name": "Cloistered Scholar",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Library Access: Though others must often endure extensive interviews and significant fees to gain access to even the most common archives in your library, you have free and easy access to the majority of the library, though it might also have repositories of lore that are too valuable, magical, or secret to permit anyone immediate access. You have a working knowledge of your cloister's personnel and bureaucracy, and you know how to navigate those connections with some ease. Additionally, you are likely to gain preferential treatment at other libraries across the Realms, as professional courtesy to a fellow scholar.\nSuggested Characteristics: Use the tables for the sage background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a cloistered scholar. Your bond is almost certainly associated either with the place where you grew up or with the knowledge you hope to acquire through adventuring. Your ideal is no doubt related to how you view the quest for knowledge and truth - perhaps as a worthy goal in itself, or maybe as a means to a de",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "The scholar's robes of your cloister",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        },
        {
          "name": "Quill",
          "qty": 1
        },
        {
          "name": "Ink",
          "qty": 1
        },
        {
          "name": "Folded parchment",
          "qty": 1
        },
        {
          "name": "Small penknife",
          "qty": 1
        },
        {
          "name": "Borrowed book on the subject of your current study",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "cobalt-scholar-sage-2014",
    "name": "Cobalt Scholar (Sage)",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Researcher: When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.\nSpecialty: To determine the nature of your scholarly training, roll a d8 or choose from the options in the table below. d8 | Field of Study 1 \u2014 Alchemist 2 \u2014 Astronomer 3 \u2014 Discredited academic 4 \u2014 Librarian 5 \u2014 Professor 6 \u2014 Researcher 7 \u2014 Wizard's apprentice 8 \u2014 Scribe\nSuggested Characteristics: Sages are defined by their extensive studies, and their characteristics reflect this life of study. Devoted to scholarly pursuits, a sage values knowledge highly\u2014sometimes in its own right, sometimes as a means toward other ideals. d8 | Personality Trait 1 \u2014 I use polysyllabic words that convey the impression of great erudition",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_history"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Quill",
          "qty": 1
        },
        {
          "name": "Small knife",
          "qty": 1
        },
        {
          "name": "Letter from a dead colleague posing a question you have not yet been able to answer",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "courtier-2014",
    "name": "Courtier",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Court Functionary: Your knowledge of how bureaucracies function lets you gain access to the records and inner workings of any noble court or government you encounter. You know who the movers and shakers are, whom to go to for the favors you seek, and what the current intrigues of interest in the group are.\nSuggested Characteristics: Use the tables for the guild artisan background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a courtier. The noble court or bureaucratic organization where you got your start is directly or indirectly associated with your bond (which could pertain to certain individuals in the group, such as your sponsor or mentor). Your ideal might be concerned with the prevailing philosophy of your court or organization.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 5,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "criminal-2014",
    "name": "Criminal",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Criminal Contact: You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.\nSpecialty: There are many kinds of criminals, and within a thieves' guild or similar criminal organization, individual members have particular specialties. Even criminals who operate outside of such organizations have strong preferences for certain kinds of crimes over others. Choose the role you played in your criminal life, or roll on the table below. d8 | Specialty 1 \u2014 Blackmailer 2 \u2014 Burglar 3 \u2014 Enforcer 4 \u2014 Fence 5 \u2014 Highway robber 6 \u2014 Hired killer 7 \u2014 Pickpocket 8 \u2014 Smuggler\nSuggested Characteristics: Criminals might seem like villains on the surface, and many of them are villainous to the core. But some have an abundance of endearing, if not redeeming, characteristics. There might be honor among thieves, but criminals rarely show any respect for law or authority. d8 | Personality Trait",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Crowbar",
          "qty": 1
        },
        {
          "name": "Dark common clothes including a hood",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "criminal-2024",
    "name": "Criminal",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_sleight_of_hand",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "feat": {
      "name": "Alert",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Dagger \u00d72, Thieves' Tools, Crowbar, Pouch \u00d72, Traveler's Clothes, 16 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 2
          },
          {
            "name": "Thieves' Tools",
            "qty": 1
          },
          {
            "name": "Crowbar",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 2
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 16,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "custom-background-2014",
    "name": "Custom Background",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages and Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Choose a Feature: Choose a feature from any background.\nSuggested Characteristics: Use the suggested characteristics from any background.\nSee the section on 4 in the Player's Handbook for more information.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [],
    "anyLanguages": 2
  },
  {
    "id": "dead-magic-dweller-2024",
    "name": "Dead Magic Dweller",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_medicine",
      "skill_survival"
    ],
    "tool": "Leatherworker's Tools",
    "feat": {
      "name": "Healer",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Greatclub, Leatherworker's Tools, Bedroll, Blanket, Healer's Kit, Pole, Rations (3 days' worth) \u00d73, Tent, Tinderbox, Torches \u00d75, Traveler's Clothes, Waterskin, 32 GP",
        "items": [
          {
            "name": "Greatclub",
            "qty": 1
          },
          {
            "name": "Leatherworker's Tools",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Blanket",
            "qty": 1
          },
          {
            "name": "Healer's Kit",
            "qty": 1
          },
          {
            "name": "Pole",
            "qty": 1
          },
          {
            "name": "Rations (3 days' worth)",
            "qty": 3
          },
          {
            "name": "Tent",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Torches",
            "qty": 5
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 32,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "dimir-operative-2014",
    "name": "Dimir Operative",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: False Identity: You have more than one identity. The one you wear most of the time makes you appear to be a member of a guild other than House Dimir. You have documentation, established acquaintances, and disguises that allow you to assume that persona and fit into the secondary guild. Whenever you choose, you can drop this identity and blend into the guildless masses of the city. Consider why you're embedded in the secondary guild. Create a story with your DM, inspired by rolling on the following table or choosing a reason that suits you. d8 | Reason for Infiltration 1 \u2014 My parents belong to this guild, and I let them think I'm following in their footsteps. 2 \u2014 I've been assigned to track this guild's activities. 3 \u2014 I've been assigned to get close to an individual in this guild and learn their secrets. 4 \u2014 I've been assigned to recruit a new Dimir spy from the ranks of this guild. 5 \u2014 I was a member of this guild before the Dimir recruited me. 6 \u2014 I don't like what this guild stands for and want to destroy it from within. 7 \u2014 I secretly wish I could leave the Dimir and join this guild, but the",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Disguise Kit",
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Dimir insignia",
          "qty": 1
        },
        {
          "name": "Small knives",
          "qty": 3
        },
        {
          "name": "Dark-colored common clothes",
          "qty": 1
        },
        {
          "name": "The starting equipment of the background described in this chapter for your secondary guild",
          "qty": 1
        }
      ],
      "gp": 0,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "dragon-cultist-2024",
    "name": "Dragon Cultist",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Calligrapher's Supplies",
    "feat": {
      "name": "Cult Of The Dragon Initiate",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Calligrapher's Supplies, Dagger, Glass Bottle, Lamp, Manacles, Oil (5 flasks), Pouches \u00d72, Robe, Rope, 30 GP",
        "items": [
          {
            "name": "Calligrapher's Supplies",
            "qty": 1
          },
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Glass Bottle",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Manacles",
            "qty": 1
          },
          {
            "name": "Oil (5 flasks)",
            "qty": 1
          },
          {
            "name": "Pouches",
            "qty": 2
          },
          {
            "name": "Robe",
            "qty": 1
          },
          {
            "name": "Rope",
            "qty": 1
          }
        ],
        "gp": 30,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "emerald-enclave-caretaker-2024",
    "name": "Emerald Enclave Caretaker",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_nature",
      "skill_survival"
    ],
    "tool": "Herbalism Kit",
    "feat": {
      "name": "Emerald Enclave Fledgling",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Shortbow, Arrows (20), Herbalism Kit, Bedroll, Blanket, Pouch, Tent, Traveler's Clothes, 13 GP",
        "items": [
          {
            "name": "Shortbow",
            "qty": 1
          },
          {
            "name": "Arrows (20)",
            "qty": 1
          },
          {
            "name": "Herbalism Kit",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Blanket",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 1
          },
          {
            "name": "Tent",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 13,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "entertainer-2014",
    "name": "Entertainer",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: By Popular Demand: You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble's court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.\nSpecialty: A good entertainer is versatile, spicing up every performance with a variety of different routines. Choose one to three routines or roll on the table below to define your expertise as an entertainer. d10 | Routines 1 \u2014 Actor 2 \u2014 Dancer 3 \u2014 Fire-eater 4 \u2014 Jester 5 \u2014 Juggler 6 \u2014 Instrumentalist 7 \u2014 Poet 8 \u2014 Singer 9 \u2014 Storyteller 10 \u2014 Tumbler\nSuggested Characteristics: Successful entertainers have to be able to capture and hold an audience's attention, so they tend to have flamboyant or forceful personalities. They're inclined toward the romantic and often cling to high-minded ideals about the practice of art an",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_acrobatics",
      "skill_performance"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "InstrumentMusical",
          "qty": 1
        },
        {
          "name": "The favor of an admirer (love letter, lock of hair, or trinket)",
          "qty": 1
        },
        {
          "name": "Costume Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "entertainer-2024",
    "name": "Entertainer",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_acrobatics",
      "skill_performance"
    ],
    "feat": {
      "name": "Musician",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "InstrumentMusical, Costume \u00d72, Mirror, Perfume, Traveler's Clothes, 11 GP",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          },
          {
            "name": "Costume",
            "qty": 2
          },
          {
            "name": "Mirror",
            "qty": 1
          },
          {
            "name": "Perfume",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 11,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "faceless-2014",
    "name": "Faceless",
    "edition": "srd2014",
    "source": "BGDIA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFaceless Persona: A faceless character adventures behind the mask of a public persona. This persona is as natural to them as their hidden, true face, but it disguises their identity. Roll on the Faceless Persona table to determine your persona, or work with the DM to create a persona that's unique to your character and suits the tone of your game. d10 | Faceless Persona A flamboyant spy or brigand The incarnation of a nation or people A scoundrel with a masked guise A vengeful spirit The manifestation of a deity or your faith One whose beauty is greatly accented using makeup An impersonation of another hero The embodiment of a school of magic A warrior with distinctive armor A disguise with animalistic or monstrous characteristics, meant to inspire fear\nFeature: Dual Personalities: Most of your fellow adventurers and the world know you as your persona. Those who seek to learn more about you\u2014your weaknesses, your origins, your purpose\u2014find themselves stymied by your disguise. Upon donning a disguise and behaving as your persona, you are unidentifiable as your true self. By removing your disguise and revea",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_intimidation"
    ],
    "tool": "Disguise Kit",
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Disguise Kit",
          "qty": 1
        },
        {
          "name": "Costume Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "faction-agent-2014",
    "name": "Faction Agent",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Safe Haven: As a faction agent, you have access to a secret network of supporters and operatives who can provide assistance on your adventures. You know a set of secret signs and passwords you can use to identify such operatives, who can provide you with access to a hidden safe house, free room and board, or assistance in finding information. These agents never risk their lives for you or risk revealing their true identities.\nSuggested Characteristics: Use the tables for the acolyte background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a faction agent. (For instance, consider the words \"faith\" and \"faction\" to be interchangeable.) Your bond might be associated with other members of your faction, or a location or an object that is important to your faction. The ideal you strive for is probably in keeping with the tenets and principles of your faction, but might be more personal in nature.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Badge or emblem of your faction",
          "qty": 1
        },
        {
          "name": "Copy of a seminal faction text (or code-book for a covert faction)",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "failed-merchant-2014",
    "name": "Failed Merchant",
    "edition": "srd2014",
    "source": "AI",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Supply Chain: From your time as a merchant, you retain connections with wholesalers, suppliers, and other merchants and entrepreneurs. You can call upon these connections when looking for items or information.\nSuggested Characteristics: Being a merchant involved having a head for numbers, a strong personality, the ability to make deals with hostile adversaries, a strong sword arm to fight off bandits, and the intuition for knowing what people want and need. The art of business is the art of finding the best path to profit, and that path might be different with each transaction. It takes a strong mind and a stronger stomach to succeed. So why did you fail? d8 | Personality Trait 1 \u2014 I didn't have the cutthroat attitude necessary to succeed. I won't make that mistake again. 2 \u2014 Even my competitors said I was affable and talented. Those traits should serve me well. 3 \u2014 To prosper, you have to be in control. 4 \u2014 The customer is always right. 5 \u2014 I was cutting corners and breaking deals to maximize profit. That's why I failed. 6 \u2014 When I get an idea, I am single-minded in its execution\u2014even if it's a",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_investigation",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Merchant's Scale",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "far-traveler-2014",
    "name": "Far Traveler",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: All Eyes on You: Your accent, mannerisms, figures of speech, and perhaps even your appearance all mark you as foreign. Curious glances are directed your way wherever you go, which can be a nuisance, but you also gain the friendly interest of scholars and others intrigued by far-off lands, to say nothing of everyday folk who are eager to hear stories of your homeland. You can parley this attention into access to people and places you might not otherwise have, for you and your traveling companions. Noble lords, scholars, and merchant princes, to name a few, might be interested in hearing about your distant homeland and people.\nWhy Are You Here?: A far traveler might have set out on a journey for one of a number of reasons, and the departure from his or her homeland could have been voluntary or involuntary. To determine why you are so far from home, roll on the table below or choose from the options provided. The following section, discussing possible homelands, includes some suggested reasons that are appropriate for each location. d6 | Reason 1 \u2014 Emissary 2 \u2014 Exile 3 \u2014 Fugitive 4 \u2014 Pilgrim 5 \u2014 Si",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_perception"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Poorly wrought maps from your homeland that depict where you are in Faer\u00fbn",
          "qty": 1
        },
        {
          "name": "Small piece of jewelry in the style of your homeland's craftsmanship",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "InstrumentMusical",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Gaming Set",
        "items": [
          {
            "name": "Gaming Set",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "farmer-2024",
    "name": "Farmer",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_animal_handling",
      "skill_nature"
    ],
    "tool": "Carpenter's Tools",
    "feat": {
      "name": "Tough",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Sickle, Carpenter's Tools, Healer's Kit, Iron Pot, Shovel, Traveler's Clothes, 30 GP",
        "items": [
          {
            "name": "Sickle",
            "qty": 1
          },
          {
            "name": "Carpenter's Tools",
            "qty": 1
          },
          {
            "name": "Healer's Kit",
            "qty": 1
          },
          {
            "name": "Iron Pot",
            "qty": 1
          },
          {
            "name": "Shovel",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 30,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "feylost-2014",
    "name": "Feylost",
    "edition": "srd2014",
    "source": "WBtW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Feywild Connection: Your mannerisms and knowledge of fey customs are recognized by natives of the Feywild, who see you as one of their own. Because of this, friendly Fey creatures are inclined to come to your aid if you are lost or need help in the Feywild.\nFey Mark: You were transformed in some small way by your stay in the Feywild and gained a fey mark, determined by rolling on the Fey Mark table. d8 | Fey Mark 1 \u2014 Your eyes swirl with iridescent colors. 2 \u2014 You have a sweet scent, like that of nectar or honey. 3 \u2014 You have long whiskers like those of a cat. 4 \u2014 Your ears are covered with soft tufts of fur. 5 \u2014 Your skin sparkles in moonlight. 6 \u2014 Flowers either bloom or wilt (your choice) in your presence. 7 \u2014 Your hair is made of vines or brambles and grows back to normal length within 1 hour of being cut. 8 \u2014 You have a tail like that of a dog or another animal.\nFeywild Visitor: Whenever you're sound asleep or in a deep trance during a long rest, a spirit of the Feywild might pay you a visit, if the DM wishes it. Determine the spirit's form by rolling on the Feywild Visitor table. No harm e",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "InstrumentMusical",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Feywild Trinket",
          "qty": 3
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 8,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "fisher-2014",
    "name": "Fisher",
    "edition": "srd2014",
    "source": "GoS",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Harvest the Water: You gain advantage on ability checks made using fishing tackle. If you have access to a body of water that sustains marine life, you can maintain a moderate lifestyle while working as a fisher, and you can catch enough food to feed yourself and up to ten other people each day.\nFishing Tale: You can tell a compelling tale, whether tall or true, to impress and entertain others. Once a day, you can tell your story to willing listeners. At the DM's discretion, a number of those listeners become friendly toward you; this is not a magical effect, and continued amicability on their part depends on your actions. You can roll on the following table to help determine the theme of your tale or choose one that best fits your character. Alternatively, work with your DM to create your own fishing tale. d8 | Tale 1 \u2014 Lobster Wrestling. You fought in hand-to-hand combat with an immense lobster. 2 \u2014 It Dragged the Boat. You nearly caught a fish of monstrous size that pulled your boat for miles. 3 \u2014 Fins of Pure Gold. You caught a sea animal whose fins were made of pure gold, but another fisher stole it. 4 \u2014 Ghost Fis",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Fishing Tackle",
          "qty": 1
        },
        {
          "name": "Net",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Favorite fishing lure",
        "items": [
          {
            "name": "Favorite fishing lure",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Oiled leather wading boots",
        "items": [
          {
            "name": "Oiled leather wading boots",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "flaming-fist-mercenary-2024",
    "name": "Flaming Fist Mercenary",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_intimidation",
      "skill_perception"
    ],
    "tool": "Smith's Tools",
    "feat": {
      "name": "Tough",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Mace, Smith's Tools, Fine Clothes, Manacles, Portable Ram, 4 GP",
        "items": [
          {
            "name": "Mace",
            "qty": 1
          },
          {
            "name": "Smith's Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Manacles",
            "qty": 1
          },
          {
            "name": "Portable Ram",
            "qty": 1
          }
        ],
        "gp": 4,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "folk-hero-2014",
    "name": "Folk Hero",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Rustic Hospitality: Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.\nSpecialty: You previously pursued a simple profession among the peasantry, perhaps as a farmer, miner, servant, shepherd, woodcutter, or gravedigger. But something happened that set you on a different path and marked you for greater things. Choose or randomly determine a defining event that marked you as a hero of the people. d10 | Defining Event 1 \u2014 I stood up to a tyrant's agents. 2 \u2014 I saved people during a natural disaster. 3 \u2014 I stood alone against a terrible monster. 4 \u2014 I stole from a corrupt merchant to help the poor. 5 \u2014 I led a militia to fight off an invading army. 6 \u2014 I broke into a tyrant's castle and stole weapons to arm the people. 7 \u2014 I trained the peasantry to use farming implements as weapons against a tyrant's soldiers. 8 \u2014 A lord rescinded an unpopula",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_animal_handling",
      "skill_survival"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Shovel",
          "qty": 1
        },
        {
          "name": "Iron Pot",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "gambler-2014",
    "name": "Gambler",
    "edition": "srd2014",
    "source": "AI",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Never Tell Me the Odds: Odds and probability are your bread and butter. During downtime activities that involve games of chance or figuring odds on the best plan, you can get a solid sense of which choice is likely the best one and which opportunities seem too good to be true, at the DM's determination.\nSuggested Characteristics: Some gamble out of necessity. Others do so out of boredom. Still others become addicted to the thrill of winning or losing everything on a turn of fortune. For some, gambling is less a matter of chance and more a matter of seeking every advantage to ensure the outcome. The best gamblers can lose everything, and the worst gamblers sometimes win. Regardless, you can always tell gamblers by the look in their eyes. Lady Luck haunts them. d8 | Personality Trait 1 \u2014 I plan for every contingency. Leave nothing to chance! 2 \u2014 Every copper wants to be a silver. Each bet is an opportunity. 3 \u2014 I'm one of Lady Luck's favored. Anything I try is destined to succeed. 4 \u2014 I've lost so much to gambling that I refuse to spend money on anything anymore. 5 \u2014 Nothing is certain. Planning i",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_insight"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Gaming Set",
          "qty": 1
        },
        {
          "name": "Lucky charm",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "gate-warden-2014",
    "name": "Gate Warden",
    "edition": "srd2014",
    "source": "SatO",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Planar Infusion: Living in a gate-town or a similar location steeped you in planar energy. You gain the Scion of the Outer Planes feat. In addition, you know where to find free, modest lodging and food in the community you grew up in.\nSuggested Characteristics: The influence of an Outer Plane shapes your perspective. The Gate Warden Personality Traits table suggests traits you might adopt for your character. d6 | Personality Trait 1 \u2014 Strange events and otherworldly creatures don't faze me. 2 \u2014 I think in terms of exchange: something for something, nothing for nothing. 3 \u2014 I speak with an unusual cadence. 4 \u2014 I pepper my speech with words or curses borrowed from planar languages. 5 \u2014 I've seen enough to know that you can't take anyone at face value, so I scrutinize everyone. 6 \u2014 I have a superstitious habit I picked up from my gate-town, such as touching iron when I'm nervous or arranging objects in a specific order.\nBuilding a Gate Warden Character: Those who dwell for an extended time near a permanent portal to another plane absorb the essence radiating from the realm beyond. Those influenced by the same plane share ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_persuasion",
      "skill_survival"
    ],
    "feat": {
      "name": "Scion Of The Outer Planes",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ring of keys to unknown locks",
          "qty": 1
        },
        {
          "name": "Blank book",
          "qty": 1
        },
        {
          "name": "Bottle of black ink",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Ink Pen",
        "items": [
          {
            "name": "Ink Pen",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Quill",
        "items": [
          {
            "name": "Quill",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "genie-touched-2024",
    "name": "Genie Touched",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_perception",
      "skill_persuasion"
    ],
    "tool": "Glassblower's Tools",
    "equipment_options": [
      {
        "id": "A",
        "label": "Light Hammer, Glassblower's Tools, Fine Clothes, Lamp, Oil (3 flasks), Waterskin, 2 GP",
        "items": [
          {
            "name": "Light Hammer",
            "qty": 1
          },
          {
            "name": "Glassblower's Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil (3 flasks)",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 2,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "giant-foundling-2014",
    "name": "Giant Foundling",
    "edition": "srd2014",
    "source": "BGG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nOrigin Stories: How you came to live among colossal creatures is up to you to determine, but the Foundling Origin table suggests a variety of possibilities. d6 | Origin 1 \u2014 You were found as a baby by a family of nomadic giants who raised you as one of their own. 2 \u2014 A family of stone giants rescued you when you fell into a mountain chasm, and you have lived with them underground ever since. 3 \u2014 You were lost or abandoned as a child in a jungle that teemed with ravenous dinosaurs. There, you found an equally lost frost giant; together, you survived. 4 \u2014 Your farm was crushed and your family killed in a battle between warring groups of giants. Racked with guilt over the destruction, a sympathetic giant soldier promised to care for you. 5 \u2014 After you had a series of strange dreams as a child, your superstitious parents sent you to study with a powerful but aloof storm giant oracle. 6 \u2014 While playing hide-and-seek with your friends, you stumbled into the castle of a cloud giant, who immediately adopted you.\nBuilding a Giant Foundling Character: Your life among giants has given you a unique perspective. Though you are unusually lar",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_intimidation",
      "skill_survival"
    ],
    "feat": {
      "name": "Strike Of The Giants",
      "desc": "Origin feat granted by this background."
    },
    "languages": [
      "Giant"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Backpack",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Small stone that reminds you of home",
        "items": [
          {
            "name": "Small stone that reminds you of home",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Sprig that reminds you of home",
        "items": [
          {
            "name": "Sprig that reminds you of home",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "golgari-agent-2014",
    "name": "Golgari Agent",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Undercity Paths: You know hidden, underground pathways that you can use to bypass crowds, obstacles, and observation as you move through the city. When you aren't in combat, you and companions you lead can travel between any two locations in the city twice as fast as your speed would normally allow. The paths of the undercity are haunted by dangers that rarely brave the light of the surface world, so your journey isn't guaranteed to be safe.\nGolgari Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Golgari Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells Cantrip \u2014 Dancing Lights, Spare The Dying 1st \u2014 Entangle, Ray Of Sickness 2nd \u2014 Protection From Poison, Ray Of Enfeeblement, Spider Climb 3rd \u2014 Animate Dead, Plant Growth 4th \u2014 Giant Insect, Grasping Vine 5th \u2014 Cloudkill, Insect Plague Golgari magic is often accompanied by a sickly green glow and a rotting stench.\nSuggested Characteristics: Members of th",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_nature",
      "skill_survival"
    ],
    "tool": "Poisoner's Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Golgari insignia",
          "qty": 1
        },
        {
          "name": "Poisoner's Kit",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Pet beetle",
        "items": [
          {
            "name": "Pet beetle",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Pet spider",
        "items": [
          {
            "name": "Pet spider",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "grinner-2014",
    "name": "Grinner",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Ballad of the Grinning Fool: Like every Grinner, you know how to find a hideout. In any city of 10,000 people or more on the Menagerie Coast or in the lands of the Dwendalian Empire, you can play the \"Ballad of the Grinning Fool\" in a major tavern or inn. A member of the Golden Grin will find you and give shelter to you and any companions you vouch for. This shelter might be discontinued if it becomes too dangerous to hide you, at the DM's discretion. This feature must be used with caution, for not all who know the ballad are your friends. Some are traitors, counterspies, or agents of tyranny.\nSuggested Characteristics: Grinners are trained in the art of secrecy and innuendo, and are skilled at hiding in plain sight by being the loudest and brightest person in the room. Their skills in subterfuge and combat lend themselves well to an adventuring lifestyle, and traveling with mercenaries and treasure hunters creates a convenient excuse to journey through lands bent under tyranny. d8 | Personality Trait 1 \u2014 I love the spotlight. Everyone, look at me! 2 \u2014 Give me a drink and I'm your friend. 3 \u2014 Talk to me about ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_performance"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Disguise Kit",
          "qty": 1
        },
        {
          "name": "InstrumentMusical",
          "qty": 1
        },
        {
          "name": "Gold-plated ring depicting a smiling face",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "gruul-anarch-2014",
    "name": "Gruul Anarch",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Rubblebelt Refuge: You are intimately familiar with areas of the city that most people shun: ruined neighborhoods where wurms rampaged, overgrown parks that no hand has tended in decades, and the vast, sprawling rubblebelts of broken terrain that civilized folk have long abandoned. You can find a suitable place for you and your allies to hide or rest in these areas. In addition, you can find food and fresh water in these areas for yourself and up to five other people each day.\nGruul Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Gruul Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells Cantrip \u2014 Fire Bolt, Produce Flame 1st \u2014 Compelled Duel, Speak With Animals, Thunderwave 2nd \u2014 Beast Sense, Shatter 3rd \u2014 Conjure Animals, Conjure Barrage 4th \u2014 Dominate Beast, Stoneskin 5th \u2014 Destructive Wave Fueled by the fire of rage burning in your heart, your magic is almost always accompanied by fiery effects, such a",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_animal_handling",
      "skill_athletics"
    ],
    "tool": "Herbalism Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Gruul insignia",
          "qty": 1
        },
        {
          "name": "Hunting Trap",
          "qty": 1
        },
        {
          "name": "Herbalism Kit",
          "qty": 1
        },
        {
          "name": "The skull of a boar",
          "qty": 1
        },
        {
          "name": "Beast-hide cloak",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "guard-2024",
    "name": "Guard",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_athletics",
      "skill_perception"
    ],
    "feat": {
      "name": "Alert",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Spear, Light Crossbow, Bolts (20), Gaming Set, Hooded Lantern, Manacles, Quiver, Traveler's Clothes, 12 GP",
        "items": [
          {
            "name": "Spear",
            "qty": 1
          },
          {
            "name": "Light Crossbow",
            "qty": 1
          },
          {
            "name": "Bolts (20)",
            "qty": 1
          },
          {
            "name": "Gaming Set",
            "qty": 1
          },
          {
            "name": "Hooded Lantern",
            "qty": 1
          },
          {
            "name": "Manacles",
            "qty": 1
          },
          {
            "name": "Quiver",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 12,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "guide-2024",
    "name": "Guide",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_stealth",
      "skill_survival"
    ],
    "tool": "Cartographer's Tools",
    "feat": {
      "name": "Magic Initiate (Druid)",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Shortbow, Arrows (20), Cartographer's Tools, Bedroll, Quiver, Tent, Traveler's Clothes, 3 GP",
        "items": [
          {
            "name": "Shortbow",
            "qty": 1
          },
          {
            "name": "Arrows (20)",
            "qty": 1
          },
          {
            "name": "Cartographer's Tools",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Quiver",
            "qty": 1
          },
          {
            "name": "Tent",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 3,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "guild-artisan-2014",
    "name": "Guild Artisan",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Guild Membership: As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession, which can be a good place to meet potential patrons, allies, or hirelings. Guilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing. Such connections might require the donation of money or magic items to the guild's coffers. You must pay dues of 5 gp per month to the guild. If you miss payments, you must make up back dues to remain in the guild's good graces.\nSpecialty: Guilds are generally found in cities large enough to support several artisans practicing the same trade. However, your guild might instead be a loose network ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Letter of introduction from your guild",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "harper-2024",
    "name": "Harper",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_performance",
      "skill_sleight_of_hand"
    ],
    "tool": "Disguise Kit",
    "feat": {
      "name": "Harper Agent",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Disguise Kit, Bedroll, Costume, Grappling Hook, Rope, Traveler's Clothes, 14 GP",
        "items": [
          {
            "name": "Disguise Kit",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Costume",
            "qty": 1
          },
          {
            "name": "Grappling Hook",
            "qty": 1
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 14,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "haunted-one-2014",
    "name": "Haunted One",
    "edition": "srd2014",
    "source": "VRGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Heart of Darkness: Those who look into your eyes can see that you have faced unimaginable horror and that you are no stranger to darkness. Though they might fear you, commoners will extend you every courtesy and do their utmost to help you. Unless you have shown yourself to be a danger to them, they will even take up arms to fight alongside you, should you find yourself facing an enemy alone.\nHarrowing Event: Prior to becoming an adventurer, your path in life was defined by one dark moment, one fateful decision, or one tragedy. Now you feel a darkness threatening to consume you, and you fear there may be no hope of escape. Choose a harrowing event that haunts you, or roll one on the Harrowing Events table. d10 | Event 1 \u2014 A monster that slaughtered dozens of innocent people spared your life, and you don't know why. 2 \u2014 You were born under a dark star. You can feel it watching you, coldly and distantly. Sometimes it beckons you in the dead of night. 3 \u2014 An apparition that has haunted your family for generations now haunts you. You don't know what it wants, and it won't leave you alone. 4 \u2014 Your family has a history of p",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Monster Hunter's Pack",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Trinket of special significance (choose one or roll on the Horror Trinkets table)",
          "qty": 1
        }
      ],
      "gp": 0,
      "sp": 1,
      "cp": 0
    }
  },
  {
    "id": "haunted-one-2024",
    "name": "Haunted One",
    "edition": "srd2024",
    "source": "RHW",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_arcana",
      "skill_survival"
    ],
    "feat": {
      "name": "Survivor",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Gaming Set (same as above), Crowbar, Holy Water (1 flask), Mirror, Oil (2 flasks), Signal Whistle, Tinderbox, Traveler's Clothes, Torches \u00d75, Waterskin, 14 GP",
        "items": [
          {
            "name": "Gaming Set (same as above)",
            "qty": 1
          },
          {
            "name": "Crowbar",
            "qty": 1
          },
          {
            "name": "Holy Water (1 flask)",
            "qty": 1
          },
          {
            "name": "Mirror",
            "qty": 1
          },
          {
            "name": "Oil (2 flasks)",
            "qty": 1
          },
          {
            "name": "Signal Whistle",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Torches",
            "qty": 5
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 14,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "hermit-2014",
    "name": "Hermit",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Discovery: The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history. It might be information that would be damaging to the people who or consigned you to exile, and hence the reason for your return to society. Work with your DM to determine the details of your discovery and its impact on the campaign.\nSpecialty: What was the reason for your isolation, and what changed to allow you to end your solitude? You can work with your DM to determine the exact nature of your seclusion, or you can choose or roll on the table below to determine the reason behind your seclusion. d8 | Life of Seclusion 1 \u2014 I was searching for spiritual enlightenment. 2 \u2014 I was partaking of communal living in accorda",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_medicine",
      "skill_religion"
    ],
    "tool": "Herbalism Kit",
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Scroll case stuffed full of notes from your studies or prayers",
          "qty": 1
        },
        {
          "name": "Winter blanket",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Herbalism Kit",
          "qty": 1
        }
      ],
      "gp": 5,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "hermit-2024",
    "name": "Hermit",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_medicine",
      "skill_religion"
    ],
    "tool": "Herbalism Kit",
    "feat": {
      "name": "Healer",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Quarterstaff, Herbalism Kit, Bedroll, Book, Lamp, Oil \u00d73, Traveler's Clothes, 16 GP",
        "items": [
          {
            "name": "Quarterstaff",
            "qty": 1
          },
          {
            "name": "Herbalism Kit",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Book",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil",
            "qty": 3
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 16,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-agent-2014",
    "name": "House Agent",
    "edition": "srd2014",
    "source": "ERLW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: Two proficiencies from the House Tool Proficiencies table\n\u2022 Equipment:: \nYour House | Proficiencies\nCannith \u2014 Alchemist's supplies and tinker's tools\nDeneith \u2014 One source=phb and source=phb;dmg\nGhallanda \u2014 Brewer's supplies and cook's utensils\nJorasco \u2014 Alchemist's supplies and herbalism kit\nKundarak \u2014 Thieves' tools and tinker's tools\nLyrandar \u2014 Navigator's tools and source=phb;dmg\nMedani \u2014 Disguise kit and thieves' tools\nOrien \u2014 One source=phb and source=phb;dmg\nPhiarlan \u2014 Disguise kit and one source=phb\nSivis \u2014 Calligrapher's supplies and forgery kit\nTharashk \u2014 One source=phb and thieves' tools\nThuranni \u2014 One source=phb and poisoner's kit\nVadalis \u2014 herbalism kit and source=phb;dmg\nRole: You always gather information for your house, but when a baron give you a specific mission, what sort of work do you do? The House Agent Role table gives possibilities. d8 | Role 1 \u2014 Acquisition 2 \u2014 Investigation 3 \u2014 Research & Development 4 \u2014 Security 5 \u2014 Intimidation 6 \u2014 Exploration 7 \u2014 Negotiation 8 \u2014 Covert Operations\nFeature: House Connections: As an agent of your house, you can always get food and lodging for yourself and your friends at a hou",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_investigation",
      "skill_persuasion"
    ],
    "tool": "Alchemist's Supplies",
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "House signet ring",
          "qty": 1
        },
        {
          "name": "Identification papers",
          "qty": 1
        },
        {
          "name": "Purse",
          "qty": 1
        }
      ],
      "gp": 20,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "house-agent-2024",
    "name": "House Agent",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_investigation",
      "skill_persuasion"
    ],
    "feat": {
      "name": "Lucky",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Artisan's Tools, Fine Clothes, 20 GP",
        "items": [
          {
            "name": "Artisan's Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 20,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-cannith-heir-2024",
    "name": "House Cannith Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_investigation",
      "skill_sleight_of_hand"
    ],
    "feat": {
      "name": "Mark Of Making",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Artisan's Tools, Crowbar, Fine Clothes, Pouches \u00d72, 17 GP",
        "items": [
          {
            "name": "Artisan's Tools",
            "qty": 1
          },
          {
            "name": "Crowbar",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Pouches",
            "qty": 2
          }
        ],
        "gp": 17,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-deneith-heir-2024",
    "name": "House Deneith Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_perception"
    ],
    "feat": {
      "name": "Mark Of Sentinel",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Spear, Shortbow, Arrows (20), Gaming Set, Fine Clothes, Healer's Kit, Quiver, 1 GP",
        "items": [
          {
            "name": "Spear",
            "qty": 1
          },
          {
            "name": "Shortbow",
            "qty": 1
          },
          {
            "name": "Arrows (20)",
            "qty": 1
          },
          {
            "name": "Gaming Set",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Healer's Kit",
            "qty": 1
          },
          {
            "name": "Quiver",
            "qty": 1
          }
        ],
        "gp": 1,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-ghallanda-heir-2024",
    "name": "House Ghallanda Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "tool": "Cook's Utensils",
    "feat": {
      "name": "Mark Of Hospitality",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Cook's Utensils, Fine Clothes, Iron Pot, Lamp, Oil \u00d75, Perfume, 26 GP",
        "items": [
          {
            "name": "Cook's Utensils",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Iron Pot",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil",
            "qty": 5
          },
          {
            "name": "Perfume",
            "qty": 1
          }
        ],
        "gp": 26,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-jorasco-heir-2024",
    "name": "House Jorasco Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_medicine",
      "skill_stealth"
    ],
    "tool": "Herbalism Kit",
    "feat": {
      "name": "Mark Of Healing",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Herbalism Kit, Fine Clothes, Healer's Kit, 25 GP",
        "items": [
          {
            "name": "Herbalism Kit",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Healer's Kit",
            "qty": 1
          }
        ],
        "gp": 25,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-kundarak-heir-2024",
    "name": "House Kundarak Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_arcana",
      "skill_investigation"
    ],
    "tool": "Thieves' Tools",
    "feat": {
      "name": "Mark Of Warding",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Thieves' Tools, Fine Clothes, 10 GP",
        "items": [
          {
            "name": "Thieves' Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 10,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-lyrandar-heir-2024",
    "name": "House Lyrandar Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_acrobatics",
      "skill_nature"
    ],
    "tool": "Navigator's Tools",
    "feat": {
      "name": "Mark Of Storm",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Navigator's Tools, Fine Clothes, 10 GP",
        "items": [
          {
            "name": "Navigator's Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 10,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-medani-heir-2024",
    "name": "House Medani Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_investigation"
    ],
    "tool": "Disguise Kit",
    "feat": {
      "name": "Mark Of Detection",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Disguise Kit, Fine Clothes, 10 GP",
        "items": [
          {
            "name": "Disguise Kit",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 10,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-orien-heir-2024",
    "name": "House Orien Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_acrobatics",
      "skill_athletics"
    ],
    "tool": "Cartographer's Tools",
    "feat": {
      "name": "Mark Of Passage",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Cartographer's Tools, Fine Clothes, Map, Map Or Scroll Case, 18 GP",
        "items": [
          {
            "name": "Cartographer's Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Map",
            "qty": 1
          },
          {
            "name": "Map Or Scroll Case",
            "qty": 1
          }
        ],
        "gp": 18,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-phiarlan-heir-2024",
    "name": "House Phiarlan Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Disguise Kit",
    "feat": {
      "name": "Mark Of Shadow",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Disguise Kit, Fine Clothes, 10 GP",
        "items": [
          {
            "name": "Disguise Kit",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 10,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-sivis-heir-2024",
    "name": "House Sivis Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "intelligence",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_history",
      "skill_perception"
    ],
    "tool": "Calligrapher's Supplies",
    "feat": {
      "name": "Mark Of Scribing",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Calligrapher's Supplies, Fine Clothes, Ink, Ink Pen \u00d75, Paper \u00d730, Parchment \u00d79, 8 GP",
        "items": [
          {
            "name": "Calligrapher's Supplies",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Ink",
            "qty": 1
          },
          {
            "name": "Ink Pen",
            "qty": 5
          },
          {
            "name": "Paper",
            "qty": 30
          },
          {
            "name": "Parchment",
            "qty": 9
          }
        ],
        "gp": 8,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-tharashk-heir-2024",
    "name": "House Tharashk Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_perception",
      "skill_survival"
    ],
    "feat": {
      "name": "Mark Of Finding",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Gaming Set, Climber's Kit, Fine Clothes, Hunting Trap, Manacles, 2 GP",
        "items": [
          {
            "name": "Gaming Set",
            "qty": 1
          },
          {
            "name": "Climber's Kit",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Hunting Trap",
            "qty": 1
          },
          {
            "name": "Manacles",
            "qty": 1
          }
        ],
        "gp": 2,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-thuranni-heir-2024",
    "name": "House Thuranni Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_performance",
      "skill_stealth"
    ],
    "feat": {
      "name": "Mark Of Shadow",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Musical Instrument, Costume, Fine Clothes, 13 GP",
        "items": [
          {
            "name": "Musical Instrument",
            "qty": 1
          },
          {
            "name": "Costume",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 13,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "house-vadalis-heir-2024",
    "name": "House Vadalis Heir",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_animal_handling",
      "skill_nature"
    ],
    "tool": "Herbalism Kit",
    "feat": {
      "name": "Mark Of Handling",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Herbalism Kit, Fine Clothes, Net, 29 GP",
        "items": [
          {
            "name": "Herbalism Kit",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Net",
            "qty": 1
          }
        ],
        "gp": 29,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "ice-fisher-2024",
    "name": "Ice Fisher",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "constitution"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_animal_handling",
      "skill_athletics"
    ],
    "tool": "Woodcarver's Tools",
    "feat": {
      "name": "Alert",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Woodcarver's Tools, Basket, Block And Tackle, Chain, Hunting Trap, Net, Pole, Rations (3 days' worth) \u00d73, Traveler's Clothes, 32 GP",
        "items": [
          {
            "name": "Woodcarver's Tools",
            "qty": 1
          },
          {
            "name": "Basket",
            "qty": 1
          },
          {
            "name": "Block And Tackle",
            "qty": 1
          },
          {
            "name": "Chain",
            "qty": 1
          },
          {
            "name": "Hunting Trap",
            "qty": 1
          },
          {
            "name": "Net",
            "qty": 1
          },
          {
            "name": "Pole",
            "qty": 1
          },
          {
            "name": "Rations (3 days' worth)",
            "qty": 3
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 32,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "inheritor-2014",
    "name": "Inheritor",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Inheritance: Choose or randomly determine your inheritance from the possibilities in the table below. Work with your Dungeon Master to come up with details: Why is your inheritance so important, and what is its full story? You might prefer for the DM to invent these details as part of the game, allowing you to learn more about your inheritance as your character does. The Dungeon Master is free to use your inheritance as a story hook, sending you on quests to learn more about its history or true nature, or confronting you with foes who want to claim it for themselves or prevent you from learning what you seek. The DM also determines the properties of your inheritance and how they figure into the item's history and importance. For instance, the object might be a minor magic item, or one that begins with a modest ability and increases in potency with the passage of time. Or, the true nature of your inheritance might not be apparent at first and is revealed only when certain conditions are met. When you begin your adventuring career, you can decide whether to tell your companions about your inherita",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Your inheritance",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Gaming Set",
        "items": [
          {
            "name": "Gaming Set",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "InstrumentMusical",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "initiate-2014",
    "name": "Initiate",
    "edition": "srd2014",
    "source": "PSA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Trials of the Five Gods: Your life is oriented around your participation in the five trials that will determine your worthiness in the afterlife. While you prepare for and undergo those trials, you have constant access to training. A comfortable place to live and regular meals are provided to you by servitor mummies (the anointed) under the supervision of viziers. You can enjoy these benefits only as long as you obey the societal norms of Naktamun\u2014training for the trials (with or without your crop), obeying the orders of the gods, and following the instructions of their viziers. If you violate these norms, you risk being treated as a dissenter. See \"3\" for more information about undertaking the trials and their rewards.\nSuggested Characteristics: An initiate's life is focused on the trials, but it doesn't need to be all about the trials. Though some initiates are highly focused on their training, most undergo that training while also experiencing joy, sorrow, love, loss, anger, jealousy, hope, faith, delight\u2014the whole range of mortal emotions and experience. The afterlife might be a constant presence in every ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_intimidation"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Simple puzzle box",
          "qty": 1
        },
        {
          "name": "Scroll containing the basic teachings of the five gods",
          "qty": 1
        },
        {
          "name": "Gaming Set",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        },
        {
          "name": "Any cartouches you have earned",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "initiate-dissenter-2014",
    "name": "Initiate (Dissenter)",
    "edition": "srd2014",
    "source": "PSA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Shelter of Dissenters: If they wish to have any hope of survival, whether hiding within the city or cast out into the desert, dissenters must help each other. You can find a place to hide, rest, or recuperate among other dissenters. They will help shield you from those who hunt you, possibly even risking their lives for you.\nSuggested Characteristics: An initiate's life is focused on the trials, but it doesn't need to be all about the trials. Though some initiates are highly focused on their training, most undergo that training while also experiencing joy, sorrow, love, loss, anger, jealousy, hope, faith, delight\u2014the whole range of mortal emotions and experience. The afterlife might be a constant presence in every initiate's mind, but it is the culmination of a life well-lived\u2014not a replacement for it. d8 | Personality Trait 1 \u2014 I always have a joke on hand when the mood gets too serious. 2 \u2014 I use sarcasm and insults to keep a distance between myself and my crop-mates, because I don't want to get attached to them. 3 \u2014 I'll settle for nothing less than perfection\u2014in myself, in my cropmates, in everything. 4 \u2014 ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_intimidation"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Simple puzzle box",
          "qty": 1
        },
        {
          "name": "Scroll containing the basic teachings of the five gods",
          "qty": 1
        },
        {
          "name": "Gaming Set",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        },
        {
          "name": "Any cartouches you have earned",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "inquisitive-2024",
    "name": "Inquisitive",
    "edition": "srd2024",
    "source": "EFA",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_investigation"
    ],
    "tool": "Thieves' Tools",
    "feat": {
      "name": "Alert",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Thieves' Tools, Bullseye Lantern, Crowbar, Oil \u00d710, Traveler's Clothes, 10 GP",
        "items": [
          {
            "name": "Thieves' Tools",
            "qty": 1
          },
          {
            "name": "Bullseye Lantern",
            "qty": 1
          },
          {
            "name": "Crowbar",
            "qty": 1
          },
          {
            "name": "Oil",
            "qty": 10
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 10,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "inquisitor-2014",
    "name": "Inquisitor",
    "edition": "srd2014",
    "source": "PSI",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Legal Authority: As an inquisitor of the church, you have the authority to arrest criminals. In the absence of other authorities, you are authorized to pass judgement and even carry out sentencing. If you abuse this power, however, your superiors in the church might strip it from you.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_investigation",
      "skill_religion"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Holy Symbol",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "investigator-2014",
    "name": "Investigator",
    "edition": "srd2014",
    "source": "VRGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Official Inquiry: You're experienced at gaining access to people and places to get the information you need. Through a combination of fast-talking, determination, and official-looking documentation, you can gain access to a place or an individual related to a crime you're investigating. Those who aren't involved in your investigation avoid impeding you or pass along your requests. Additionally, local law enforcement has firm opinions about you, viewing you as either a nuisance or one of their own.\nPath to Mystery: Your first case influenced the types of mysteries you're interested in. Why was this case so impactful, personal, or traumatic? Whom did it affect besides you? Why and how did you get involved? Was it solved? How did it set you on the path to investigating other mysteries? Roll on or choose details from the First Case table to develop the mystery that started your career as an investigator. d8 | Case 1 \u2014 A friend was wrongfully accused of murder. You tracked down the actual killer, proving your friend's innocence and starting your career as a detective. 2 \u2014 You're told you went missing for weeks. Whe",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Magnifying Glass",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Evidence from a past case (choose one or roll for a trinket from the Horror Trinkets)",
          "qty": 1
        }
      ],
      "gp": 0,
      "sp": 1,
      "cp": 0
    }
  },
  {
    "id": "investigator-2024",
    "name": "Investigator",
    "edition": "srd2024",
    "source": "RHW",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "intelligence",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_investigation"
    ],
    "tool": "Disguise Kit",
    "feat": {
      "name": "Sharp Eye",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Disguise Kit, Manacles, Shovel, Traveler's Clothes, Vials \u00d73, 16 GP",
        "items": [
          {
            "name": "Disguise Kit",
            "qty": 1
          },
          {
            "name": "Manacles",
            "qty": 1
          },
          {
            "name": "Shovel",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Vials",
            "qty": 3
          }
        ],
        "gp": 16,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "izzet-engineer-2014",
    "name": "Izzet Engineer",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Urban Infrastructure: The popular conception of the Izzet League is based on mad inventions, dangerous experiments, and explosive blasts. Much of that perception is accurate, but the league is also involved with mundane tasks of construction and architecture\u2014primarily in crafting the infrastructure that allows Ravnicans to enjoy running water, levitating platforms, and other magical and technological wonders. You have a basic knowledge of the structure of buildings, including the stuff behind the walls. You can also find blueprints of a specific building in order to learn the details of its construction. Such blueprints might provide knowledge of entry points, structural weaknesses, or secret spaces. Your access to such information isn't unlimited. If obtaining or using the information gets you in trouble with the law, the guild can't shield you from the repercussions.\nIzzet Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Izzet Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multipl",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_investigation"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Izzet insignia",
          "qty": 1
        },
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "The charred and twisted remains of a failed experiment",
          "qty": 1
        },
        {
          "name": "Hammer",
          "qty": 1
        },
        {
          "name": "Block And Tackle",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 5,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "knight-of-solamnia-2014",
    "name": "Knight of Solamnia",
    "edition": "srd2014",
    "source": "DSotDQ",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Squire of Solamnia: You gain the Squire of Solamnia feat. In addition, the Knights of Solamnia provide you free, modest lodging and food at any of their fortresses or encampments.\nBuilding a Knight of Solamnia Character: Any class that has martial prowess can be a good fit in the Knights of Solamnia. Fighters and paladins make up the bulk of the knighthood's forces. Clerics (often with the War domain) can also be found among the knights' ranks. For a more unusual take on a Knight of Solamnia character, consider playing a bard of the College of Valor (or the College of Swords from Xanathar's Guide to Everything) or a barbarian devoted to the ideals of the nature god Habbakuk (perhaps adopting the Path of the Zealot from Xanathar's Guide to Everything). Knight of Solamnia Trinkets: When you make your character, roll once on the Knight of Solamnia Trinkets table instead of on the Trinkets table in the Player's Handbook for your starting trinket. d6 | Trinket 1 \u2014 A flat silver disk you record your heroics upon 2 \u2014 A piece of a fallen knight's armor 3 \u2014 A pendant featuring a crown, a rose, or a sword 4 \u2014 The pommel of your ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_survival"
    ],
    "feat": {
      "name": "Squire Of Solamnia",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Insignia of rank",
          "qty": 1
        },
        {
          "name": "Playing Card Set",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "knight-of-the-gauntlet-2024",
    "name": "Knight of the Gauntlet",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_athletics",
      "skill_medicine"
    ],
    "tool": "Smith's Tools",
    "feat": {
      "name": "Tyro Of The Gauntlet",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Spear, Smith's Tools, Bullseye Lantern, Holy Symbol, Manacles, Oil (5 flasks), Tinderbox, Traveler's Clothes, 9 GP",
        "items": [
          {
            "name": "Spear",
            "qty": 1
          },
          {
            "name": "Smith's Tools",
            "qty": 1
          },
          {
            "name": "Bullseye Lantern",
            "qty": 1
          },
          {
            "name": "Holy Symbol",
            "qty": 1
          },
          {
            "name": "Manacles",
            "qty": 1
          },
          {
            "name": "Oil (5 flasks)",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 9,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "knight-of-the-order-2014",
    "name": "Knight of the Order",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Knightly Regard: You receive shelter and succor from members of your knightly order and those who are sympathetic to its aims. If your order is a religious one, you can gain aid from temples and other religious communities of your deity. Knights of civic orders can get help from the community\u2014whether a lone settlement or a great nation\u2014that they serve, and knights of philosophical orders can find help from those they have aided in pursuit of their ideals, and those who share their ideals. This help comes in the form of shelter and meals, and healing when appropriate, as well as occasionally risky assistance, such as a band of local citizens rallying to aid a sorely pressed knight, or those who support the order helping to smuggle a knight out of town when he or she is being hunted unjustly.\nSuggested Characteristics: Use the tables for the soldier background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a knight of your order. Your bond almost always involves the order to which you belong (or at least key me",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Signet, banner, or seal representing your place or rank in the order",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "lords-alliance-vassal-2024",
    "name": "Lords' Alliance Vassal",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "tool": "Calligrapher's Supplies",
    "feat": {
      "name": "Lords' Alliance Agent",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Javelins \u00d72, Calligrapher's Supplies, Fine Clothes, Ink, Ink Pen \u00d75, Parchment (9 sheets), 13 GP",
        "items": [
          {
            "name": "Javelins",
            "qty": 2
          },
          {
            "name": "Calligrapher's Supplies",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Ink",
            "qty": 1
          },
          {
            "name": "Ink Pen",
            "qty": 5
          },
          {
            "name": "Parchment (9 sheets)",
            "qty": 1
          }
        ],
        "gp": 13,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "lorehold-student-2014",
    "name": "Lorehold Student",
    "edition": "srd2014",
    "source": "SCC",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Lorehold Initiate: You gain the Strixhaven Initiate feat and must choose Lorehold within it. In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Lorehold Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells 1st \u2014 Comprehend Languages, Identify 2nd \u2014 Borrowed Knowledge, Locate Object 3rd \u2014 Speak With Dead, Spirit Guardians 4th \u2014 Arcane Eye, Stone Shape 5th \u2014 Flame Strike, Legend Lore Consider customizing how your spells look when you cast them. Your Lorehold spells might create displays of golden light. You might use a tome or a scroll as a spellcasting focus, and your spell effects might reflect the appearance of the reference books you study.\nBuilding a Lorehold Character: Any class or subclass that deals with knowledge of the past can be a good fit in Lorehold. Bards thrive in Lorehold, and wizards (particularly those of the School of Divination) are numerous among its students. Clerics (often with the Knowledge or Light domains) are also quite commo",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_religion"
    ],
    "feat": {
      "name": "Strixhaven Initiate",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Hammer",
          "qty": 1
        },
        {
          "name": "Hooded Lantern",
          "qty": 1
        },
        {
          "name": "Tinderbox",
          "qty": 1
        },
        {
          "name": "Tome of history",
          "qty": 1
        },
        {
          "name": "School uniform",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "lorwyn-expert-2024",
    "name": "Lorwyn Expert",
    "edition": "srd2024",
    "source": "LFL",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_athletics",
      "skill_nature"
    ],
    "tool": "Cartographer's Tools",
    "feat": {
      "name": "Child Of The Sun",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Quarterstaff, Cartographer's Tools, Backpack, Basket, Parchment (4 sheets) \u00d74, Rope, Traveler's Clothes, 29 GP",
        "items": [
          {
            "name": "Quarterstaff",
            "qty": 1
          },
          {
            "name": "Cartographer's Tools",
            "qty": 1
          },
          {
            "name": "Backpack",
            "qty": 1
          },
          {
            "name": "Basket",
            "qty": 1
          },
          {
            "name": "Parchment (4 sheets)",
            "qty": 4
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 29,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "luxonborn-acolyte-2014",
    "name": "Luxonborn (Acolyte)",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Shelter of the Faithful: As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle. You might also have ties to a specific temple dedicated to your chosen deity or pantheon, and you have a residence there. This could be the temple where you used to serve, if you remain on good terms with it, or a temple where you have found a new home. While near your temple, you can call upon the priests for assistance, provided the assistance you ask for is not hazardous and you remain in good standing with your temple.\nSuggested Characteristics: Acolytes are shaped by their experience in temples or other religious communities. Their study of the history and tenets of their faith and their relationships to temples, shrines, or hierarchies affect their mannerisms and ideal",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Holy symbol (a gift to you when you entered the priesthood)",
          "qty": 1
        },
        {
          "name": "Sticks of incense",
          "qty": 5
        },
        {
          "name": "Vestments",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Prayer book",
        "items": [
          {
            "name": "Prayer book",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Prayer wheel",
        "items": [
          {
            "name": "Prayer wheel",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "mage-of-high-sorcery-2014",
    "name": "Mage of High Sorcery",
    "edition": "srd2014",
    "source": "DSotDQ",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Initiate of High Sorcery: You gain the Initiate of High Sorcery feat. In addition, the Mages of High Sorcery provide you with free, modest lodging and food indefinitely at any occupied Tower of High Sorcery and for one night at the home of an organization member.\nBuilding a Mage of High Sorcery Character: Mages of High Sorcery are typically sorcerers, warlocks, or wizards and might have any subclass. Spellcasters who gain their magic through devotion are less likely to be welcomed among the traditionalist mages. Nevertheless, the Mages of High Sorcery are shrewd, and they rarely let unique opportunities or individuals pass them by. Even members of martial classes who train in magic might find a rare place among the group's three orders. Mage of High Sorcery Trinkets: When you make your character, roll once on the Mage of High Sorcery Trinkets table instead of on the Trinkets table in the Player's Handbook for your starting trinket. d6 | Trinket 1 \u2014 An unopened letter from your first teacher 2 \u2014 A broken wand made of black, red, or white wood 3 \u2014 A scroll bearing an incomprehensible formula 4 \u2014 A purposeless device cove",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_history"
    ],
    "feat": {
      "name": "Initiate Of High Sorcery",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "marine-2014",
    "name": "Marine",
    "edition": "srd2014",
    "source": "GoS",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Steady: You can move twice the normal amount of time (up to 16 hours) each day before being subject to the effect of a forced march (see \"Travel Pace\" in chapter 8 of the Player's Handbook). Additionally, you can automatically find a safe route to land a boat on shore, provided such a route exists.\nHardship Endured: Hardship in your past has forged you into an unstoppable living weapon. This hardship is essential to you and is at the heart of a personal philosophy or ethos that often guides your actions. You can roll on the following table to determine this hardship or choose one that best fits your character. d6 | Hardship 1 \u2014 Nearly Drowned. You hid underwater to avoid detection by enemies and held your breath for an extremely long time. Just before you would have died, you had a revelation about your existence. 2 \u2014 Captured. You spent months enduring thirst, starvation, and torture at the hands of your enemy, but you never broke. 3 \u2014 Sacrifice. You enabled the escape of your fellow soldiers, but at great cost to yourself. Some of your past comrades may think you're dead. 4 \u2014 Juggernaut. No reasonable explan",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_survival"
    ],
    "tool": "Vehicles (Water)",
    "equipment_base": {
      "items": [
        {
          "name": "Dagger that belonged to a fallen comrade",
          "qty": 1
        },
        {
          "name": "Folded flag emblazoned with the symbol of your ship or company",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "mercenary-veteran-2014",
    "name": "Mercenary Veteran",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Mercenary Life: You know the mercenary life as only someone who has experienced it can. You are able to identify mercenary companies by their emblems, and you know a little about any such company, including who has hired them recently. You can find the taverns and festhalls where mercenaries abide in any area, as long as you speak the language. You can find mercenary work between adventures sufficient to maintain a comfortable lifestyle (see \"8\" under \"Downtime Activities\" in chapter 8 of the Player's Handbook).\nSuggested Characteristics: Use the tables for the soldier background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a mercenary. Your bond could be associated with the company you traveled with previously, or with some of the comrades you served with. The ideal you embrace largely depends on your worldview and your motivation for fighting.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_persuasion"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Uniform of your company",
          "qty": 1
        },
        {
          "name": "Insignia of your rank",
          "qty": 1
        },
        {
          "name": "Gaming Set",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "merchant-2024",
    "name": "Merchant",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_animal_handling",
      "skill_persuasion"
    ],
    "tool": "Navigator's Tools",
    "feat": {
      "name": "Lucky",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Navigator's Tools, Pouch \u00d72, Traveler's Clothes, 22 GP",
        "items": [
          {
            "name": "Navigator's Tools",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 2
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 22,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "mist-wanderer-2024",
    "name": "Mist Wanderer",
    "edition": "srd2024",
    "source": "RHW",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_survival",
      "skill_stealth"
    ],
    "equipment_options": [
      {
        "id": "a",
        "label": "Artisan's Tools (same as above), Lamp, Oil (5 flasks), Pouch, Rope, Tinderbox, Traveler's Clothes, 30 GP",
        "items": [
          {
            "name": "Artisan's Tools (same as above)",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil (5 flasks)",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 1
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 30,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "moonwell-pilgrim-2024",
    "name": "Moonwell Pilgrim",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_nature",
      "skill_performance"
    ],
    "tool": "Painter's Supplies",
    "feat": {
      "name": "Magic Initiate (Druid)",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Quarterstaff, Painter's Supplies, Bedroll, Bell, Pouch, Robe, String, Traveler's Clothes, Waterskin, 38 GP",
        "items": [
          {
            "name": "Quarterstaff",
            "qty": 1
          },
          {
            "name": "Painter's Supplies",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Bell",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 1
          },
          {
            "name": "Robe",
            "qty": 1
          },
          {
            "name": "String",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 38,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "mulhorandi-tomb-raider-2024",
    "name": "Mulhorandi Tomb Raider",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "intelligence"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_investigation",
      "skill_religion"
    ],
    "tool": "Mason's Tools",
    "feat": {
      "name": "Lucky",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Dagger, Light Hammer, Mason's Tools, Backpack, Bedroll, Crowbar, Ladder, Pole, Pouches \u00d72, Rope, String, Tinderbox, Torches \u00d75, Traveler's Clothes, Waterskin 26 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Light Hammer",
            "qty": 1
          },
          {
            "name": "Mason's Tools",
            "qty": 1
          },
          {
            "name": "Backpack",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Crowbar",
            "qty": 1
          },
          {
            "name": "Ladder",
            "qty": 1
          },
          {
            "name": "Pole",
            "qty": 1
          },
          {
            "name": "Pouches",
            "qty": 2
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "String",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Torches",
            "qty": 5
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Waterskin 26 GP",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "myriad-operative-criminal-2014",
    "name": "Myriad Operative (Criminal)",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Criminal Contact: You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.\nSpecialty: There are many kinds of criminals, and within a thieves' guild or similar criminal organization, individual members have particular specialties. Even criminals who operate outside of such organizations have strong preferences for certain kinds of crimes over others. Choose the role you played in your criminal life, or roll on the table below. d8 | Specialty 1 \u2014 Blackmailer 2 \u2014 Burglar 3 \u2014 Enforcer 4 \u2014 Fence 5 \u2014 Highway robber 6 \u2014 Hired killer 7 \u2014 Pickpocket 8 \u2014 Smuggler\nSuggested Characteristics: Criminals might seem like villains on the surface, and many of them are villainous to the core. But some have an abundance of endearing, if not redeeming, characteristics. There might be honor among thieves, but criminals rarely show any respect for law or authority. d8 | Personality Trait",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Crowbar",
          "qty": 1
        },
        {
          "name": "Dark common clothes including a hood",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "mythalkeeper-2024",
    "name": "Mythalkeeper",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "intelligence",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_arcana",
      "skill_history"
    ],
    "tool": "Jeweler's Tools",
    "feat": {
      "name": "Crafter",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Quarterstaff, Jeweler's Tools, Perfume, Pouch, Robe, Shovel, String, Waterskin, 16 GP",
        "items": [
          {
            "name": "Quarterstaff",
            "qty": 1
          },
          {
            "name": "Jeweler's Tools",
            "qty": 1
          },
          {
            "name": "Perfume",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 1
          },
          {
            "name": "Robe",
            "qty": 1
          },
          {
            "name": "Shovel",
            "qty": 1
          },
          {
            "name": "String",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 16,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "noble-2014",
    "name": "Noble",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Position of Privilege: Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere. You can secure an audience with a local noble if you need to.\nSuggested Characteristics: Nobles are born and raised to a very different lifestyle than most people ever experience, and their personalities reflect that upbringing. A noble title comes with a plethora of bonds\u2014responsibilities to family, to other nobles (including the sovereign), to the people entrusted to the family's care, or even to the title itself. But this responsibility is often a good way to undermine a noble. d8 | Personality Trait 1 \u2014 My eloquent flattery makes everyone I talk to feel like the most wonderful and important person in the world. 2 \u2014 The common folk love me for my kindness and generosity. 3 \u2014 No one could doubt by looking at my regal bearing that I am a cut above t",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Signet Ring",
          "qty": 1
        },
        {
          "name": "Scroll of pedigree",
          "qty": 1
        },
        {
          "name": "Purse",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "noble-2024",
    "name": "Noble",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_history",
      "skill_persuasion"
    ],
    "feat": {
      "name": "Skilled",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Gaming Set, Fine Clothes, Perfume, 29 GP",
        "items": [
          {
            "name": "Gaming Set",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Perfume",
            "qty": 1
          }
        ],
        "gp": 29,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "orzhov-representative-2014",
    "name": "Orzhov Representative",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Leverage: You can exert leverage over one or more individuals below you in the guild's hierarchy and demand their help as needs warrant. For example, you can have a message carried across a neighborhood, procure a short carriage ride without paying, or have others clean up a bloody mess you left in an alley. The DM decides if your demands are reasonable and if there are subordinates available to fulfill them. As your status in the guild improves, you gain influence over more people, including ones in greater positions of power.\nOrzhov Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Orzhov Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells Cantrip \u2014 Friends, Guidance 1st \u2014 Command, Illusory Script 2nd \u2014 Enthrall, Ray Of Enfeeblement, Zone Of Truth 3rd \u2014 Bestow Curse, Speak With Dead, Spirit Guardians 4th \u2014 Blight, Death Ward, Leomund'S Secret Chest 5th \u2014 Geas Your magic tends to manifest as swirling shadows, brilliant light, or ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_intimidation",
      "skill_religion"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Orzhov insignia",
          "qty": 1
        },
        {
          "name": "Foot-long chain made of ten gold coins",
          "qty": 1
        },
        {
          "name": "Vestments",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "outlander-2014",
    "name": "Outlander",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Wanderer: You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.\nSpecialty: You've been to strange places and seen things that others cannot begin to fathom. Consider some of the distant lands you have visited, and how they impacted you. You can roll on the following table to determine your occupation during your time in the wild, or choose one that best fits your character. d10 | Origin 1 \u2014 Forester 2 \u2014 Trapper 3 \u2014 Homesteader 4 \u2014 Guide 5 \u2014 Exile or outcast 6 \u2014 Bounty hunter 7 \u2014 Pilgrim 8 \u2014 Tribal nomad 9 \u2014 Hunter-gatherer 10 \u2014 Tribal marauder\nSuggested Characteristics: Often considered rude and uncouth among civilized folk, outlanders have little respect for the niceties of life in the cities. The ties of tribe, clan, family, and the natural world of which they are a part are the most important bonds to most outlanders. d8 | Pers",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Staff",
          "qty": 1
        },
        {
          "name": "Hunting Trap",
          "qty": 1
        },
        {
          "name": "Trophy from an animal you killed",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "plaintiff-2014",
    "name": "Plaintiff",
    "edition": "srd2014",
    "source": "AI",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Legalese: Your experience with your local legal system has given you a firm knowledge of the ins and outs of that system. Even when the law is not on your side, you can use complex terms like ex injuria jus non oritur and cogitationis poenam nemo patitur to frighten people into thinking you know what you're talking about. With common folks who don't know any better, you might be able to intimidate or deceive to get favors or special treatment.\nSuggested Characteristics: Plaintiffs come in many varieties. Some are innocent bystanders who want only fair compensation for their injuries. Others are professional courtroom operatives, going to extreme lengths to appear wronged in pursuit of a large payout. d8 | Personality Trait 1 \u2014 I can't believe I have a chance to join Acquisitions Incorporated! The fun I'm going to have! 2 \u2014 I've been wronged my entire life, and the world owes me. 3 \u2014 I have always tried to make the best of a bad situation. 4 \u2014 The law doesn't protect the honest and the hard working. I'm going to do whatever needs to be done to make things right. 5 \u2014 I'm always in the wrong place ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_medicine",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        }
      ],
      "gp": 20,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "planar-philosopher-2014",
    "name": "Planar Philosopher",
    "edition": "srd2014",
    "source": "SatO",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFaction | Skill\nAthar \u2014 Religion\nBleak Cabal \u2014 Insight\nDoomguard \u2014 Nature\nFated \u2014 Intimidation\nFraternity of Order \u2014 History\nHands of Havoc \u2014 Stealth\nHarmonium \u2014 Perception\nHeralds of Dust \u2014 Medicine\nMercykillers \u2014 Survival\nMind's Eye \u2014 Persuasion\nSociety of Sensation \u2014 Performance\nTranscendent Order \u2014 Athletics\nFactions of Sigil: Twelve factions have risen to prominence in the City of Doors, though many more exist. Your character might belong to one of these groups or another ideological faction, perhaps one of your own creation. The primary factions of Sigil, which are further detailed in chapter 2, adhere to the following philosophies: \u2022 Athar: Deities are frauds and merely channel the might of a true, higher power. \u2022 Bleak Cabal: There is no greater truth to the multiverse. Each being must discover their own meaning. \u2022 Doomguard: Nothing lasts forever. The purpose of everything is to crumble and decay. \u2022 Fated: Everyone makes their own fate and is entitled to whatever they can take and hold. \u2022 Fraternity of Order: All of existence is governed by laws, and power comes from understanding and exploiting them. \u2022 Hands of Havoc:",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana"
    ],
    "feat": {
      "name": "Scion Of The Outer Planes",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Portal key (such as a bag of golden tea leaves or the tooth of a planar beast)",
          "qty": 1
        },
        {
          "name": "Manifesto of your guiding philosophy",
          "qty": 1
        },
        {
          "name": "Common clothes in your faction's style",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "prismari-student-2014",
    "name": "Prismari Student",
    "edition": "srd2014",
    "source": "SCC",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Prismari Initiate: You gain the Strixhaven Initiate feat and must choose Prismari within it. In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Prismari Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells 1st \u2014 Chromatic Orb, Thunderwave 2nd \u2014 Flaming Sphere, Kinetic Jaunt 3rd \u2014 Haste, Water Walk 4th \u2014 Freedom Of Movement, Wall Of Fire 5th \u2014 Cone Of Cold, Conjure Elemental Consider customizing how your spells look when you cast them. You might wield your Prismari spells with dynamic, gestural movement\u2014as much dance as somatic component. Even a blast of fire in your hands is a sculpted work of art; elemental forces make grand designs as you hurl spells. These forces might linger on your body or in your clothes as decorative elements after your spells are dissipated, as sparks dance in your hair and your touch leaves tracings of frost on whatever you touch.\nBuilding a Prismari Character: Any class or subclass that wields element",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_acrobatics",
      "skill_performance"
    ],
    "feat": {
      "name": "Strixhaven Initiate",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "School uniform",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Artisan's Tools",
        "items": [
          {
            "name": "Artisan's Tools",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "InstrumentMusical",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "purple-dragon-squire-2024",
    "name": "Purple Dragon Squire",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_animal_handling",
      "skill_insight"
    ],
    "tool": "Navigator's Tools",
    "feat": {
      "name": "Purple Dragon Rook",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Spear, Navigator's Tools, Fine Clothes, 9 GP",
        "items": [
          {
            "name": "Spear",
            "qty": 1
          },
          {
            "name": "Navigator's Tools",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          }
        ],
        "gp": 9,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "quandrix-student-2014",
    "name": "Quandrix Student",
    "edition": "srd2014",
    "source": "SCC",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Quandrix Initiate: You gain the Strixhaven Initiate feat and must choose Quandrix within it. In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Quandrix Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells 1st \u2014 Entangle, Guiding Bolt 2nd \u2014 Enlarge/Reduce, Vortex Warp 3rd \u2014 Aura Of Vitality, Haste 4th \u2014 Control Water, Freedom Of Movement 5th \u2014 Circle Of Power, Passwall Consider customizing how your spells look when you cast them. Your Quandrix spells might manifest amid kaleidoscopic swirls of fractal patterns, amplifying the tiniest movements of your somatic components. When your magic creates or alters creatures, it might briefly surround the targets with shimmering fractal designs or tessellated patterns.\nBuilding a Quandrix Character: Any spellcasting class or subclass can work well for a Quandrix character. Both the scholarly focus of wizards (especially those who study the Schools of Abjuration, Illusion, or Transmutation",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_nature"
    ],
    "feat": {
      "name": "Strixhaven Initiate",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Abacus",
          "qty": 1
        },
        {
          "name": "Book of arcane theory",
          "qty": 1
        },
        {
          "name": "School uniform",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "rakdos-cultist-2014",
    "name": "Rakdos Cultist",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nA Flair for the Dramatic: Rakdos performance styles typically fuse standard circus-style acrobatics with fire, wrought-iron spikes and hooks, and monsters. You can roll a d8 or choose from the options in the Performance Options table to determine your preferred style of performance. d8 | Type of Performer 1 \u2014 Spikewheel acrobat 2 \u2014 Lampooning satirist 3 \u2014 Fire juggler 4 \u2014 Marionette puppeteer 5 \u2014 Pain artist 6 \u2014 Noise musician 7 \u2014 Nightmare clown 8 \u2014 Master of ceremonies\nFeature: Fearsome Reputation: People recognize you as a member of the Cult of Rakdos, and they're careful not to draw your anger or ridicule. You can get away with minor criminal offenses, such as refusing to pay for food at a restaurant or breaking down a door at a local shop, if no legal authorities witness the crime. Most people are too daunted by you to report your wrongdoing to the Azorius.\nRakdos Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Rakdos Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists,",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_acrobatics",
      "skill_performance"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Rakdos insignia",
          "qty": 1
        },
        {
          "name": "InstrumentMusical",
          "qty": 1
        },
        {
          "name": "Costume Clothes",
          "qty": 1
        },
        {
          "name": "Hooded lantern made of wrought iron",
          "qty": 1
        },
        {
          "name": "10-foot length of chain with sharply spiked links",
          "qty": 1
        },
        {
          "name": "Tinderbox",
          "qty": 1
        },
        {
          "name": "Torch",
          "qty": 10
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        },
        {
          "name": "Bottle of sweet, red juice",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "rashemi-wanderer-2024",
    "name": "Rashemi Wanderer",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_intimidation",
      "skill_perception"
    ],
    "tool": "Cartographer's Tools",
    "feat": {
      "name": "Tough",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Cartographer's Tools, Backpack, Bedroll, Hooded Lantern, Oil (3 flasks), Rope, Tinderbox, Traveler's Clothes, Waterskin, 23 GP",
        "items": [
          {
            "name": "Cartographer's Tools",
            "qty": 1
          },
          {
            "name": "Backpack",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Hooded Lantern",
            "qty": 1
          },
          {
            "name": "Oil (3 flasks)",
            "qty": 1
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 23,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "revelry-pirate-sailor-2014",
    "name": "Revelry Pirate (Sailor)",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Ship's Passage: When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you're calling in a favor, you can't be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.\nSuggested Characteristics: Sailors can be a rough lot, but the responsibilities of life on a ship make them generally reliable as well. Life aboard a ship shapes their outlook and forms their most important attachments. d8 | Personality Trait 1 \u2014 My friends know they can rely on me, no matter what. 2 \u2014 I work hard so that I can play hard when the work is done. 3 \u2014 I enjoy sailing into new ports and making new friends over a flagon of ale. 4 \u2014 I stretch the truth for the sake of a good story. 5 \u2014 To me, a tavern brawl is a nice way to get to know a new city. 6 \u2014",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_perception"
    ],
    "tool": "Navigator's Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Belaying pin",
          "qty": 1
        },
        {
          "name": "Silk Rope (50 Feet)",
          "qty": 1
        },
        {
          "name": "Lucky charm",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "rewarded-2014",
    "name": "Rewarded",
    "edition": "srd2014",
    "source": "BMT",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \n\u2022 Tool Proficiencies:: One source=phb of your choice (such as playing cards or three-dragon ante cards)\nFeature: Fortune's Favor: Your unexpected good fortune is reflected by a minor boon. You gain the Lucky, Magic Initiate, or Skilled feat (your choice). Your choice of feat reflects the transformation that changed your life. An encounter with a genie who gave you three wishes might have resulted in magical powers represented by Magic Initiate. If you paid off all your family debts with a fortuitous round of three-dragon ante, you might be Lucky instead. Alternatively, you could use the Skilled feat to reflect whatever trial you endured to secure your new destiny and to model the knowledge and abilities imparted to you by whatever force transformed your life.\nSuggested Characteristics: Your character's perspective on life has changed thanks to their new destiny. The Rewarded Personality Traits table suggests traits you might adopt for your character and cards from the Deck of Many Things that might have prompted this trait. d6 | Personality Trait 1 \u2014 A safe home is a foundation on which anything else can be built. (Key, Throne)",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "feat": {
      "name": "Lucky",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Bottle of black ink",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Sheets of paper",
          "qty": 5
        },
        {
          "name": "Gaming set matching your chosen proficiency",
          "qty": 1
        },
        {
          "name": "Signet Ring",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 18,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "rival-intern-2014",
    "name": "Rival Intern",
    "edition": "srd2014",
    "source": "AI",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Inside Informant: You have connections to your previous employer or other groups you dealt with during your previous employment. You can communicate with your contacts, gaining information at the DM's discretion.\nSuggested Characteristics: If you were happy with your previous internship, the parting of ways might have been amicable. If not, it might have involved armed guards removing you from the premises. If you were passed over at your previous position, it might have left you a blend of seething rage, practiced nonchalance, and keen knowledge of where the bodies are buried (perhaps literally). d8 | Personality Trait 1 \u2014 My previous employer didn't respect me, and now I'll do whatever I can to gain respect. 2 \u2014 The job is important, but the relationships I forge with my coworkers are even more so. 3 \u2014 The job is everything to me. Who needs relaxation, hobbies, and a social life? 4 \u2014 I know I'm not the best and brightest, but if I put my best self forward, I can overcome anything. 5 \u2014 My former boss was an idiot. So was my boss before that. And before that. I'm sure those were all coincidences",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_investigation"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Ledger from your previous employer containing a small piece of useful information",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "ruined-2014",
    "name": "Ruined",
    "edition": "srd2014",
    "source": "BMT",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \n\u2022 Tool Proficiencies:: One source=phb of your choice (such as playing cards or three-dragon ante cards)\nFeature: Still Standing: You have weathered ruinous misfortune, and you possess hidden reserves others don't expect. You gain the Alert, Skilled, or Tough feat (your choice). Your choice of feat reflects how you've dealt with the terrible loss that changed your life forever. If you've kept your senses sharp for every opportunity and climbed your way out of misery by seizing the tiniest scrap of hope, choose Alert. If you've redoubled your efforts to reclaim what was once yours, choose Skilled. If you've stoically persevered through your misfortune, select Tough.\nSuggested Characteristics: Rising above misfortune shapes one's perspective. The Ruined Personality Traits table suggests traits you might adopt for your character (and ruinous cards that might have prompted this trait). d6 | Personality Trait 1 \u2014 I've changed from my past, and I work to live up to my new path. (Balance, Throne) 2 \u2014 Every moment is a gift I refuse to squander. (Euryale, Skull) 3 \u2014 Now that I've overcome having nothing, I can survive anything. (Fool, R",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_stealth",
      "skill_survival"
    ],
    "feat": {
      "name": "Alert",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Cracked hourglass",
          "qty": 1
        },
        {
          "name": "Set of rusty manacles",
          "qty": 1
        },
        {
          "name": "Half-empty bottle",
          "qty": 1
        },
        {
          "name": "Hunting Trap",
          "qty": 1
        },
        {
          "name": "Gaming set matching your chosen proficiency",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 13,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "rune-carver-2014",
    "name": "Rune Carver",
    "edition": "srd2014",
    "source": "BGG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nRune Styles: Each rune carver has a unique style and preferred medium. To determine how you make your runes, you can roll on the Rune Style table. d6 | Style 1 \u2014 You inscribe runes in wax or clay with a fine metal needle. 2 \u2014 You whittle pieces of wood into small figurines you mark with runes. 3 \u2014 You engrave runes onto glass beads and thread them onto necklaces and bracelets. 4 \u2014 You stitch runes into the hems of clothing. 5 \u2014 You carve runes on a set of animal bones you can throw in different formations. 6 \u2014 You draw runes into candles, melting the wax to smooth over the engravings.\nBuilding a Rune Carver Character: Scholarly pursuits, ancient mysteries, or a fateful encounter might inspire a character to pursue the secrets of a rune carver.\nFeature: Rune Shaper: You gain the Rune Shaper feat.\nSuggested Characteristics: The Rune Carver Personality Traits table suggests a variety of traits you might adopt for your character. d6 | Personality Trait 1 \u2014 Is it practical to learn an ancient language that is rarely spoken? No. But is it fun? Very. 2 \u2014 I learned one of my ancestors was a lauded rune carver wh",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_perception"
    ],
    "feat": {
      "name": "Rune Shaper",
      "desc": "Origin feat granted by this background."
    },
    "languages": [
      "Giant"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Small knife",
          "qty": 1
        },
        {
          "name": "Whetstone",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "sage-2014",
    "name": "Sage",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Researcher: When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.\nSpecialty: To determine the nature of your scholarly training, roll a d8 or choose from the options in the table below. d8 | Field of Study 1 \u2014 Alchemist 2 \u2014 Astronomer 3 \u2014 Discredited academic 4 \u2014 Librarian 5 \u2014 Professor 6 \u2014 Researcher 7 \u2014 Wizard's apprentice 8 \u2014 Scribe\nSuggested Characteristics: Sages are defined by their extensive studies, and their characteristics reflect this life of study. Devoted to scholarly pursuits, a sage values knowledge highly\u2014sometimes in its own right, sometimes as a means toward other ideals. d8 | Personality Trait 1 \u2014 I use polysyllabic words that convey the impression of great erudition",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_history"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Quill",
          "qty": 1
        },
        {
          "name": "Small knife",
          "qty": 1
        },
        {
          "name": "Letter from a dead colleague posing a question you have not yet been able to answer",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "sage-2024",
    "name": "Sage",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_arcana",
      "skill_history"
    ],
    "tool": "Calligrapher's Supplies",
    "feat": {
      "name": "Magic Initiate (Wizard)",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Quarterstaff, Calligrapher's Supplies, Book, Parchment \u00d78, Robe, 8 GP",
        "items": [
          {
            "name": "Quarterstaff",
            "qty": 1
          },
          {
            "name": "Calligrapher's Supplies",
            "qty": 1
          },
          {
            "name": "Book",
            "qty": 1
          },
          {
            "name": "Parchment",
            "qty": 8
          },
          {
            "name": "Robe",
            "qty": 1
          }
        ],
        "gp": 8,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "sailor-2014",
    "name": "Sailor",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Ship's Passage: When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you're calling in a favor, you can't be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.\nSuggested Characteristics: Sailors can be a rough lot, but the responsibilities of life on a ship make them generally reliable as well. Life aboard a ship shapes their outlook and forms their most important attachments. d8 | Personality Trait 1 \u2014 My friends know they can rely on me, no matter what. 2 \u2014 I work hard so that I can play hard when the work is done. 3 \u2014 I enjoy sailing into new ports and making new friends over a flagon of ale. 4 \u2014 I stretch the truth for the sake of a good story. 5 \u2014 To me, a tavern brawl is a nice way to get to know a new city. 6 \u2014",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_perception"
    ],
    "tool": "Navigator's Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Belaying pin",
          "qty": 1
        },
        {
          "name": "Silk Rope (50 Feet)",
          "qty": 1
        },
        {
          "name": "Lucky charm",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "sailor-2024",
    "name": "Sailor",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_acrobatics",
      "skill_perception"
    ],
    "tool": "Navigator's Tools",
    "feat": {
      "name": "Tavern Brawler",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Dagger, Navigator's Tools, Rope, Traveler's Clothes, 20 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Navigator's Tools",
            "qty": 1
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 20,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "scribe-2024",
    "name": "Scribe",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_investigation",
      "skill_perception"
    ],
    "tool": "Calligrapher's Supplies",
    "feat": {
      "name": "Skilled",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Calligrapher's Supplies, Fine Clothes, Lamp, Oil, Parchment, 23 GP",
        "items": [
          {
            "name": "Calligrapher's Supplies",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil",
            "qty": 1
          },
          {
            "name": "Parchment",
            "qty": 1
          }
        ],
        "gp": 23,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "selesnya-initiate-2014",
    "name": "Selesnya Initiate",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Conclave's Shelter: As a member of the Selesnya Conclave, you can count on your guild mates to provide shelter and aid. You and your companions can find a place to hide or rest in any Selesnya enclave in the city, unless you have proven to be a danger to them. The members of the enclave will shield you from the law or anyone else searching for you, though they will not risk their lives in this effort. In addition, as a guild member you can receive free healing and care at a Selesnya enclave, though you must provide any material components needed for spells.\nSelesnya Guild Spells: Prerequisite: Spellcasting or Pact Magic class feature For you, the spells on the Selesnya Guild Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells Cantrip \u2014 Druidcraft, Friends 1st \u2014 Animal Friendship, Charm Person 2nd \u2014 Aid, Animal Messenger, Calm Emotions, Warding Bond 3rd \u2014 Plant Growth, Speak With Plants 4th \u2014 Aura Of Life, Conjure Minor Elementals 5th \u2014 Awaken, Commune With N",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_nature",
      "skill_persuasion"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Selesnya insignia",
          "qty": 1
        },
        {
          "name": "Healer's Kit",
          "qty": 1
        },
        {
          "name": "Robes",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 5,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "shadowmasters-exile-2024",
    "name": "Shadowmasters Exile",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_acrobatics",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "feat": {
      "name": "Savage Attacker",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Daggers \u00d72, Thieves' Tools, Caltrops, Costume, Grappling Hook, Iron Spikes, Mirror, Pouches \u00d72, Rope, Traveler's Clothes, 3 GP",
        "items": [
          {
            "name": "Daggers",
            "qty": 2
          },
          {
            "name": "Thieves' Tools",
            "qty": 1
          },
          {
            "name": "Caltrops",
            "qty": 1
          },
          {
            "name": "Costume",
            "qty": 1
          },
          {
            "name": "Grappling Hook",
            "qty": 1
          },
          {
            "name": "Iron Spikes",
            "qty": 1
          },
          {
            "name": "Mirror",
            "qty": 1
          },
          {
            "name": "Pouches",
            "qty": 2
          },
          {
            "name": "Rope",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 3,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "shadowmoor-expert-2024",
    "name": "Shadowmoor Expert",
    "edition": "srd2024",
    "source": "LFL",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_acrobatics",
      "skill_deception"
    ],
    "tool": "Glassblower's Tools",
    "feat": {
      "name": "Shadowmoor Hexer",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Dagger, Glassblower's Tools, Backpack, Hunting Trap, Lamp, Oil (3 flasks) \u00d73, Traveler's Clothes, Waterskin, 8 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Glassblower's Tools",
            "qty": 1
          },
          {
            "name": "Backpack",
            "qty": 1
          },
          {
            "name": "Hunting Trap",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil (3 flasks)",
            "qty": 3
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 8,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "shipwright-2014",
    "name": "Shipwright",
    "edition": "srd2014",
    "source": "GoS",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: I'll Patch It!: Provided you have carpenter's tools and wood, you can perform repairs on a water vehicle. When you use this ability, you restore a number of hit points to the hull of a water vehicle equal to 5 \u00d7 your proficiency modifier. A vehicle cannot be patched by you in this way again until after it has been pulled ashore and fully repaired.\nLife at Sea: Your life at sea and in port has shaped you; you can roll on the following table to determine its impact or choose an element that best fits your character. d6 | Sea's Influence 1 \u2014 Grand Designs. You are working on plans and schematics for a new, very fast ship. You must examine as many different kinds of vessels as possible to help ensure the success of your design. 2 \u2014 Solid and Sound. You patched up a war galley and prevented it from sinking. The local navy regards you as a friend. 3 \u2014 Favored. You insisted on thicker planking for a merchant vessel's hull, which saved it from sinking when it smashed against a reef. You have a standing invitation to visit the merchant's distant mansion. 4 \u2014 Master of Armaments. You specialized in designing and mountin",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_perception"
    ],
    "tool": "Carpenter's Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Set of well-loved carpenter's tools",
          "qty": 1
        },
        {
          "name": "Blank book",
          "qty": 1
        },
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "silverquill-student-2014",
    "name": "Silverquill Student",
    "edition": "srd2014",
    "source": "SCC",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Silverquill Initiate: You gain the Strixhaven Initiate feat and must choose Silverquill within it. In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Silverquill Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells 1st \u2014 Dissonant Whispers, Silvery Barbs 2nd \u2014 Calm Emotions, Darkness 3rd \u2014 Beacon Of Hope, Daylight 4th \u2014 Compulsion, Confusion 5th \u2014 Dominate Person, Rary'S Telepathic Bond Consider customizing how your spells look when you cast them. Your Silverquill spells might be accompanied by visual effects resembling splotches of ink or radiating ripples of golden light. Any auditory effects of your spells often sound like amplified echoes of your own voice speaking the spells' verbal components\u2014even amid the crash of lightning or a fiery eruption.\nBuilding a Silverquill Character: Many bards find a home in Silverquill, putting the power of their voices to use with Silverquill magic. Wizards (especially those who study the Schools of Illusion and E",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_intimidation",
      "skill_persuasion"
    ],
    "feat": {
      "name": "Strixhaven Initiate",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Book of poetry",
          "qty": 1
        },
        {
          "name": "School uniform",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "simic-scientist-2014",
    "name": "Simic Scientist",
    "edition": "srd2014",
    "source": "GGR",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nClades and Projects: As a Simic researcher, you are part of a clade\u2014a diverse group of individuals combining disparate talents in pursuit of a common goal\u2014or a researcher on a specialized, short-term project focused on addressing an immediate need. You can roll a d6 or choose from the options in the Research Options table to determine your area of research. d6 | Clade/Project 1 \u2014 Hull Clade, focused on protection and durability 2 \u2014 Fin Clade, focused on movement 3 \u2014 Gyre Clade, focused on cyclical patterns and metamagic 4 \u2014 Guardian Project, focused on creating guard monsters and super soldiers 5 \u2014 Crypsis Project, focused on intelligence and counterintelligence 6 \u2014 Independent research in a new area\nFeature: Researcher: When you attempt to learn or recall a magical or scientific fact, if you don't know that information, you know where and from whom you can obtain it. Usually, this information comes from a Simic laboratory, or sometimes from an Izzet facility, a library, a university, or an independent scholar or other learned person or creature. Knowing where the information can be found doesn't automatically enable you to lea",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_arcana",
      "skill_medicine"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Simic insignia",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Book of research notes",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Flask of oil (made from blubber)",
          "qty": 1
        },
        {
          "name": "Vial of acid (derived from digestive juices)",
          "qty": 1
        },
        {
          "name": "Vial of fish scales",
          "qty": 1
        },
        {
          "name": "Vial of seaweed",
          "qty": 1
        },
        {
          "name": "Vial of jellyfish stingers",
          "qty": 1
        },
        {
          "name": "Glass bottle of unidentified slime",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "smuggler-2014",
    "name": "Smuggler",
    "edition": "srd2014",
    "source": "GoS",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Down Low: You are acquainted with a network of smugglers who are willing to help you out of tight situations. While in a particular town, city, or other similarly sized community (DM's discretion), you and your companions can stay for free in safe houses. Safe houses provide a poor lifestyle. While staying at a safe house, you can choose to keep your presence (and that of your companions) a secret.\nClaim to Fame: Every smuggler has that one tale that sets them apart from common criminals. By wits, sailing skill, or a silver tongue, you lived to tell the story\u2014and you tell it often. You can roll on the following table to determine your claim or choose one that best fits your character. d6 | Accomplishment 1 \u2014 Spirit of the Whale. You smuggled stolen dwarven spirits in the body of a dead whale being pulled behind a fishing boat. When you delivered the goods, the corpse suddenly exploded, sending whale meat and whiskey bottles for half a mile. 2 \u2014 Cart and Sword. You drove a cart filled with stolen art through the middle of a battlefield while singing sea shanties to confuse the combatants. 3 \u2014 The Recruit. You e",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_deception"
    ],
    "tool": "Vehicles (Water)",
    "equipment_base": {
      "items": [
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Fancy leather vest",
        "items": [
          {
            "name": "Fancy leather vest",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Pair of leather boots",
        "items": [
          {
            "name": "Pair of leather boots",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "soldier-2014",
    "name": "Soldier",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Military Rank: You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use. You can also usually gain access to friendly military encampments and fortresses where your rank is recognized.\nSpecialty: During your time as a soldier, you had a specific role to play in your unit or army. Roll a d8 or choose from the options in the table below to determine your role: d8 | Role 1 \u2014 Officer 2 \u2014 Scout 3 \u2014 Infantry 4 \u2014 Cavalry 5 \u2014 Healer 6 \u2014 Quartermaster 7 \u2014 Standard-bearer 8 \u2014 Support staff (cook, blacksmith, or the like)\nSuggested Characteristics: The horrors of war combined with the rigid discipline of military service leave their mark on all soldiers, shaping their ideals, creating strong bonds, and often leaving them scarred and vulnerable to fear, shame, and hatred. d8 | Personality Trait 1 \u2014 I'm always polite and respectful. 2 \u2014 I'm haunted by mem",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_intimidation"
    ],
    "tool": "Vehicles (Land)",
    "equipment_base": {
      "items": [
        {
          "name": "Insignia of rank",
          "qty": 1
        },
        {
          "name": "Trophy taken from a fallen enemy (a dagger, broken blade, or piece of a banner)",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Bone dice set",
        "items": [
          {
            "name": "Bone dice set",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Playing Card Set",
        "items": [
          {
            "name": "Playing Card Set",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "soldier-2024",
    "name": "Soldier",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "constitution"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_athletics",
      "skill_intimidation"
    ],
    "feat": {
      "name": "Savage Attacker",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Spear, Shortbow, Arrows (20), Gaming Set, Healer's Kit, Quiver, Traveler's Clothes, 14 GP",
        "items": [
          {
            "name": "Spear",
            "qty": 1
          },
          {
            "name": "Shortbow",
            "qty": 1
          },
          {
            "name": "Arrows (20)",
            "qty": 1
          },
          {
            "name": "Gaming Set",
            "qty": 1
          },
          {
            "name": "Healer's Kit",
            "qty": 1
          },
          {
            "name": "Quiver",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 14,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "spellfire-initiate-2024",
    "name": "Spellfire Initiate",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_arcana",
      "skill_perception"
    ],
    "feat": {
      "name": "Spellfire Spark",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Gaming Set (same as above), Arcane Focus (Crystal or Wand), Pouches \u00d72, Traveler's Clothes, 36 GP",
        "items": [
          {
            "name": "Gaming Set (same as above)",
            "qty": 1
          },
          {
            "name": "Arcane Focus (Crystal or Wand)",
            "qty": 1
          },
          {
            "name": "Pouches",
            "qty": 2
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 36,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "spirit-medium-2024",
    "name": "Spirit Medium",
    "edition": "srd2024",
    "source": "RHW",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "constitution",
      "intelligence",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "equipment_options": [
      {
        "id": "a",
        "label": "Dagger, Gaming Set (same as above), Basket, Bell, Candles \u00d78, Ink, Ink Pen, Paper (5 sheets), Tinderbox, Traveler's Clothes, 32 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Gaming Set (same as above)",
            "qty": 1
          },
          {
            "name": "Basket",
            "qty": 1
          },
          {
            "name": "Bell",
            "qty": 1
          },
          {
            "name": "Candles",
            "qty": 8
          },
          {
            "name": "Ink",
            "qty": 1
          },
          {
            "name": "Ink Pen",
            "qty": 1
          },
          {
            "name": "Paper (5 sheets)",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 32,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "urban-bounty-hunter-2014",
    "name": "Urban Bounty Hunter",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Ear to the Ground: You are in frequent contact with people in the segment of society that your chosen quarries move through. These people might be associated with the criminal underworld, the rough-and-tumble folk of the streets, or members of high society. This connection comes in the form of a contact in any city you visit, a person who provides information about the people and places of the local area.\nSuggested Characteristics: Use the tables for the criminal background in the Player's Handbook as the basis for your bounty hunter's traits and motivations, modifying the entries when appropriate to suit your identity as a bounty hunter. For instance, your bond might involve other bounty hunters or the organizations or individuals that employ you. Your ideal could be associated with your determination always to catch your quarry or your desire to maintain your reputation for being dependable.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [],
    "equipment_base": {
      "items": [
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 20,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "urchin-2014",
    "name": "Urchin",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: City Secrets: You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.\nSuggested Characteristics: Urchins are shaped by lives of desperate poverty, for good and for ill. They tend to be driven either by a commitment to the people with whom they shared life on the street or by a burning desire to find a better life\u2014and maybe get some payback on all the rich people who treated them badly. d8 | Personality Trait 1 \u2014 I hide scraps of food and trinkets away in my pockets. 2 \u2014 I ask a lot of questions. 3 \u2014 I like to squeeze into small places where no one else can get to me. 4 \u2014 I sleep with my back to a wall or tree, with everything I own wrapped in a bundle in my arms. 5 \u2014 I eat like a pig and have bad manners. 6 \u2014 I think anyone who's nice to me is hiding evil intent. 7 \u2014 I don't like to bathe. 8 \u2014 I bluntly say what others are hinting at or hiding. d6 | Ideal 1 \u2014 Respect. All people, rich or poor, ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_sleight_of_hand",
      "skill_stealth"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "Small knife",
          "qty": 1
        },
        {
          "name": "Map of the city you grew up in",
          "qty": 1
        },
        {
          "name": "Pet mouse",
          "qty": 1
        },
        {
          "name": "Token to remember your parents by",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "uthgardt-tribe-member-2014",
    "name": "Uthgardt Tribe Member",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Uthgardt Heritage: You have an excellent knowledge of not only your tribe's territory, but also the terrain and natural resources of the rest of the North. You are familiar enough with any wilderness area that you can find twice as much food and water as you normally would when you forage there. Additionally, you can call upon the hospitality of your people, and those allied with your tribe, often including members of the druid circles, tribes of nomadic elves, the Harpers, and the priesthoods devoted to the gods of the First Circle.\nSuggested Characteristics: Use the tables for the outlander background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a member of an Uthgardt tribe. Even if you have left your tribe behind (at least for now), you hold to the traditions of your people. You will never cut down a still-living tree, and you may not countenance such an act being done in your presence. The Uthgardt ancestral mounds - great hills where the totem spirits were defeated by Uthgar and where the heroes of th",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_survival"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Hunting Trap",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Totemic token",
        "items": [
          {
            "name": "Totemic token",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Set of tattoos marking your loyalty to Uthgar and your tribal totem",
        "items": [
          {
            "name": "Set of tattoos marking your loyalty to Uthgar and your tribal totem",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "vampire-devotee-2024",
    "name": "Vampire Devotee",
    "edition": "srd2024",
    "source": "ABH",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "constitution",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_persuasion",
      "skill_stealth"
    ],
    "tool": "Cook's Utensils",
    "feat": {
      "name": "Vampire's Plaything",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Cook's Utensils, Fine Clothes, Glass Bottles \u00d72, Healer's Kit, Perfume, Lamp, Oil (3 flasks), Waterskin, 19 GP",
        "items": [
          {
            "name": "Cook's Utensils",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Glass Bottles",
            "qty": 2
          },
          {
            "name": "Healer's Kit",
            "qty": 1
          },
          {
            "name": "Perfume",
            "qty": 1
          },
          {
            "name": "Lamp",
            "qty": 1
          },
          {
            "name": "Oil (3 flasks)",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 19,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "vampire-survivor-2024",
    "name": "Vampire Survivor",
    "edition": "srd2024",
    "source": "ABH",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "constitution",
      "wisdom"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_religion"
    ],
    "tool": "Woodcarver's Tools",
    "feat": {
      "name": "Vampire Hunter",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Woodcarver's Tools, Crowbar, Hooded Lantern, Holy Symbol (reliquary), Holy Water, Mirror, Oil (3 flasks), Tinderbox, Traveler's Clothes, Waterskin, 4 GP",
        "items": [
          {
            "name": "Woodcarver's Tools",
            "qty": 1
          },
          {
            "name": "Crowbar",
            "qty": 1
          },
          {
            "name": "Hooded Lantern",
            "qty": 1
          },
          {
            "name": "Holy Symbol (reliquary)",
            "qty": 1
          },
          {
            "name": "Holy Water",
            "qty": 1
          },
          {
            "name": "Mirror",
            "qty": 1
          },
          {
            "name": "Oil (3 flasks)",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          },
          {
            "name": "Waterskin",
            "qty": 1
          }
        ],
        "gp": 4,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "variant-city-watch-investigator-2014",
    "name": "Variant City Watch (Investigator)",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Watcher's Eye: Your experience in enforcing the law, and dealing with lawbreakers, gives you a feel for local laws and criminals. You can easily find the local outpost of the watch or a similar organization, and just as easily pick out the dens of criminal activity in a community, although you're more likely to be welcome in the former locations rather than the latter.\nSuggested Characteristics: Use the tables for the soldier background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a member of the city watch. Your bond is likely associated with your fellow watch members or the watch organization itself and almost certainly concerns your community. Your ideal probably involves the fostering of peace and safety. An investigator is likely to have an ideal connected to achieving justice by successfully solving crimes.",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_investigation"
    ],
    "anyLanguages": 2,
    "equipment_base": {
      "items": [
        {
          "name": "Uniform in the style of your unit and indicative of your rank",
          "qty": 1
        },
        {
          "name": "Horn with which to summon help",
          "qty": 1
        },
        {
          "name": "Set of manacles",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "variant-criminal-spy-2014",
    "name": "Variant Criminal (Spy)",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Spy Contact: You have a reliable and trustworthy contact who acts as your liaison to a network of other spies. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.\nSpecialty: There are many kinds of criminals, and within a thieves' guild or similar criminal organization, individual members have particular specialties. Even criminals who operate outside of such organizations have strong preferences for certain kinds of crimes over others. Choose the role you played in your criminal life, or roll on the table below. d8 | Specialty 1 \u2014 Blackmailer 2 \u2014 Burglar 3 \u2014 Enforcer 4 \u2014 Fence 5 \u2014 Highway robber 6 \u2014 Hired killer 7 \u2014 Pickpocket 8 \u2014 Smuggler\nSuggested Characteristics: Criminals might seem like villains on the surface, and many of them are villainous to the core. But some have an abundance of endearing, if not redeeming, characteristics. There might be honor among thieves, but criminals rarely show any respect for law or authority. d8 | Personality Trait 1 \u2014 I al",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Crowbar",
          "qty": 1
        },
        {
          "name": "Dark common clothes including a hood",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "variant-entertainer-gladiator-2014",
    "name": "Variant Entertainer (Gladiator)",
    "edition": "srd2014",
    "source": "PHB",
    "description": "Feature: By Popular Demand: You can always find a place to perform in any place that features combat for entertainment\u2014perhaps a gladiatorial arena or secret pit fighting club. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.\nFeature: By Popular Demand: You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble's court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.\nSpecialty: A good entertainer is versatile, spicing up every performance with a variety of different routines. Choose one to three routines or roll on the table below to def",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_acrobatics",
      "skill_performance"
    ],
    "tool": "Disguise Kit",
    "equipment_base": {
      "items": [
        {
          "name": "InstrumentMusical",
          "qty": 1
        },
        {
          "name": "The favor of an admirer (love letter, lock of hair, or trinket)",
          "qty": 1
        },
        {
          "name": "Costume Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "variant-guild-artisan-guild-merchant-2014",
    "name": "Variant Guild Artisan (Guild Merchant)",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Guild Membership: As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession, which can be a good place to meet potential patrons, allies, or hirelings. Guilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing. Such connections might require the donation of money or magic items to the guild's coffers. You must pay dues of 5 gp per month to the guild. If you miss payments, you must make up back dues to remain in the guild's good graces.\nSpecialty: Guilds are generally found in cities large enough to support several artisans practicing the same trade. However, your guild might instead be a loose network ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_insight",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Artisan's Tools",
          "qty": 1
        },
        {
          "name": "Letter of introduction from your guild",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "variant-noble-knight-2014",
    "name": "Variant Noble (Knight)",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nVariant Noble (Knight): A knighthood is among the lowest noble titles in most societies, but it can be a path to higher status. If you wish to be a knight, choose the Retainers feature instead of the Position of Privilege feature. As an emblem of chivalry and the ideals of courtly love, you might include among your equipment a banner or other token from a noble lord or lady to whom you have given your heart-in a chaste sort of devotion.\nFeature: Retainers: You have the service of three retainers loyal to your family. These retainers can be attendants or messengers, and one might be a majordomo. One of your retainers is a noble who serves as your squire, aiding you in exchange for training on his or her own path to knighthood (This person could be your bond.). Your two remaining retainers might include a groom to care for your horse and a servant who polishes your armor (and even helps you put it on). Your retainers can perform mundane tasks for you, but they do not fight for you, will not follow you into obviously dangerous areas (such as dungeons), and will leave if they are frequently endangered or abu",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Signet Ring",
          "qty": 1
        },
        {
          "name": "Scroll of pedigree",
          "qty": 1
        },
        {
          "name": "Purse",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "variant-noble-retainers-2014",
    "name": "Variant Noble (Retainers)",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Retainers: You have the service of three retainers loyal to your family. These retainers can be attendants or messengers, and one might be a majordomo. Your retainers are commoners who can perform mundane tasks for you, but they do not fight for you, will not follow you into obviously dangerous areas (such as dungeons), and will leave if they are frequently endangered or abused.\nSuggested Characteristics: Nobles are born and raised to a very different lifestyle than most people ever experience, and their personalities reflect that upbringing. A noble title comes with a plethora of bonds\u2014responsibilities to family, to other nobles (including the sovereign), to the people entrusted to the family's care, or even to the title itself. But this responsibility is often a good way to undermine a noble. d8 | Personality Trait 1 \u2014 My eloquent flattery makes everyone I talk to feel like the most wonderful and important person in the world. 2 \u2014 The common folk love me for my kindness and generosity. 3 \u2014 No one could doubt by looking at my regal bearing that I am a cut above the unwashed masses. 4 \u2014 I take g",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Signet Ring",
          "qty": 1
        },
        {
          "name": "Scroll of pedigree",
          "qty": 1
        },
        {
          "name": "Purse",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "variant-sailor-pirate-2014",
    "name": "Variant Sailor (Pirate)",
    "edition": "srd2014",
    "source": "PHB",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Bad Reputation: No matter where you go, people are afraid of you due to your reputation. When you are in a civilized settlement, you can get away with minor criminal offenses, such as refusing to pay for food at a tavern or breaking down doors at a local shop, since most people will not report your activity to the authorities.\nSuggested Characteristics: Sailors can be a rough lot, but the responsibilities of life on a ship make them generally reliable as well. Life aboard a ship shapes their outlook and forms their most important attachments. d8 | Personality Trait 1 \u2014 My friends know they can rely on me, no matter what. 2 \u2014 I work hard so that I can play hard when the work is done. 3 \u2014 I enjoy sailing into new ports and making new friends over a flagon of ale. 4 \u2014 I stretch the truth for the sake of a good story. 5 \u2014 To me, a tavern brawl is a nice way to get to know a new city. 6 \u2014 I never pass up a friendly wager. 7 \u2014 My language is as foul as an otyugh nest. 8 \u2014 I like a job well done, especially if I can convince someone else to do it. d6 | Ideal 1 \u2014 Respect. The thing that keeps a ship together is mutual",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_perception"
    ],
    "tool": "Navigator's Tools",
    "equipment_base": {
      "items": [
        {
          "name": "Belaying pin",
          "qty": 1
        },
        {
          "name": "Silk Rope (50 Feet)",
          "qty": 1
        },
        {
          "name": "Lucky charm",
          "qty": 1
        },
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "vizier-2014",
    "name": "Vizier",
    "edition": "srd2014",
    "source": "PSA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Voice of Authority: Your voice is the voice of your god, at least in theory. Your job might include training and instructing initiates, and they are required to obey you. In any circumstance, an initiate is expected to defer to your voice and obey your commands. If you abuse this authority, though, your god might personally punish you.\nSuggested Characteristics: A vizier's characteristics strongly reflect the ideals and personality of the god they serve. d10 | Personality Trait 1 \u2014 Everything I do, I do gracefully and deliberately, and with complete confidence. (Oketra) 2 \u2014 Nothing can shake my rock-hard focus. (Oketra) 3 \u2014 When I am at peace, I am an oasis of perfect calm in the world. When I am roused to anger, I am an embodiment of terror. (Kefnet) 4 \u2014 I enjoy teasing acolytes and initiates with juicy tidbits of knowledge wrapped up in fiendishly difficult puzzles. (Kefnet) 5 \u2014 I have the utmost faith in myself and my abilities. (Rhonas) 6 \u2014 I get restless when life in the city feels too tame, too safe. (Rhonas) 7 \u2014 I enjoy solitude as an opportunity to plan my victory. (Bontu) 8 \u2014 I use satire as a way to ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_religion"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Scroll of your god's teachings",
          "qty": 1
        },
        {
          "name": "Vizier's cartouche",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Artisan's Tools",
        "items": [
          {
            "name": "Artisan's Tools",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "InstrumentMusical",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "vizier-dissenter-2014",
    "name": "Vizier (Dissenter)",
    "edition": "srd2014",
    "source": "PSA",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Shelter of Dissenters: If they wish to have any hope of survival, whether hiding within the city or cast out into the desert, dissenters must help each other. You can find a place to hide, rest, or recuperate among other dissenters. They will help shield you from those who hunt you, possibly even risking their lives for you.\nSuggested Characteristics: A vizier's characteristics strongly reflect the ideals and personality of the god they serve. d10 | Personality Trait 1 \u2014 Everything I do, I do gracefully and deliberately, and with complete confidence. (Oketra) 2 \u2014 Nothing can shake my rock-hard focus. (Oketra) 3 \u2014 When I am at peace, I am an oasis of perfect calm in the world. When I am roused to anger, I am an embodiment of terror. (Kefnet) 4 \u2014 I enjoy teasing acolytes and initiates with juicy tidbits of knowledge wrapped up in fiendishly difficult puzzles. (Kefnet) 5 \u2014 I have the utmost faith in myself and my abilities. (Rhonas) 6 \u2014 I get restless when life in the city feels too tame, too safe. (Rhonas) 7 \u2014 I enjoy solitude as an opportunity to plan my victory. (Bontu) 8 \u2014 I use satire as a way to undermine t",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_religion"
    ],
    "equipment_base": {
      "items": [
        {
          "name": "Scroll of your god's teachings",
          "qty": 1
        },
        {
          "name": "Vizier's cartouche",
          "qty": 1
        },
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 25,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Artisan's Tools",
        "items": [
          {
            "name": "Artisan's Tools",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "InstrumentMusical",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "volstrucker-agent-2014",
    "name": "Volstrucker Agent",
    "edition": "srd2014",
    "source": "EGW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Shadow Network: You have access to the Volstrucker shadow network, which allows you to communicate with other members of the order over long distances. If you write a letter in a special arcane ink, address it to a member of the Volstrucker, and cast it into a fire, the letter will burn to cinders and materialize whole again on the person of the agent you addressed it to. The ink used to send a letter across the shadow network is the same as that used by a wizard to scribe spells in a spellbook. Writing a letter in this ink costs 10 gp per page.\nSuggested Characteristics: Agents of the Volstrucker are groomed to follow orders without question and to kill without mercy. The trauma that brings one into the order can fester even more strongly against the darkness of a Volstrucker agent's assignments. Officially, no one ever leaves the order\u2014but those desperate enough do whatever it takes to gain some measure of freedom. d6 | Personality Trait 1 \u2014 I prefer to keep my thoughts to myself. 2 \u2014 I indulge vice in excess to quiet my conscience. 3 \u2014 I've left emotion behind me. I'm now perfectly placid. 4 ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_deception",
      "skill_stealth"
    ],
    "tool": "Poisoner's Kit",
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Common Clothes",
          "qty": 1
        },
        {
          "name": "Black cloak with a hood",
          "qty": 1
        },
        {
          "name": "Poisoner's Kit",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "waterdhavian-noble-2014",
    "name": "Waterdhavian Noble",
    "edition": "srd2014",
    "source": "SCAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Languages:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nFeature: Kept in Style: While you are in Waterdeep or elsewhere in the North, your house sees to your everyday needs. Your name and signet are sufficient to cover most of your expenses; the inns, taverns, and festhalls you frequent are glad to record your debt and send an accounting to your family's estate in Waterdeep to settle what you owe. This advantage enables you to live a comfortable lifestyle without having to pay 2 gp a day for it, or reduces the cost of a wealthy or aristocratic lifestyle by that amount. You may not maintain a less affluent lifestyle and use the difference as income\u2014the benefit is a line of credit, not an actual monetary reward.\nSuggested Characteristics: Use the tables for the noble background in the Player's Handbook as the basis for your traits and motivations, modifying the entries when appropriate to suit your identity as a member of a Waterdhavian family. Like other nobles, you were born and raised in a different world from the one that most folk know - one that grants you privilege but also calls you to fulfill a duty befitting your station. Your bond might be associated",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_history",
      "skill_persuasion"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Fine Clothes",
          "qty": 1
        },
        {
          "name": "Scroll of pedigree",
          "qty": 1
        },
        {
          "name": "Skin of fine zzar or wine",
          "qty": 1
        },
        {
          "name": "Purse",
          "qty": 1
        }
      ],
      "gp": 20,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Signet Ring",
        "items": [
          {
            "name": "Signet Ring",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "Brooch",
        "items": [
          {
            "name": "Brooch",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "wayfarer-2024",
    "name": "Wayfarer",
    "edition": "srd2024",
    "source": "XPHB",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiency:: \n\u2022 Equipment::",
    "abilities": [
      "dexterity",
      "wisdom",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_insight",
      "skill_stealth"
    ],
    "tool": "Thieves' Tools",
    "feat": {
      "name": "Lucky",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Dagger \u00d72, Thieves' Tools, Gaming Set, Bedroll, Pouch \u00d72, Traveler's Clothes, 16 GP",
        "items": [
          {
            "name": "Dagger",
            "qty": 2
          },
          {
            "name": "Thieves' Tools",
            "qty": 1
          },
          {
            "name": "Gaming Set",
            "qty": 1
          },
          {
            "name": "Bedroll",
            "qty": 1
          },
          {
            "name": "Pouch",
            "qty": 2
          },
          {
            "name": "Traveler's Clothes",
            "qty": 1
          }
        ],
        "gp": 16,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "wildspacer-2014",
    "name": "Wildspacer",
    "edition": "srd2014",
    "source": "AAG",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment:: \nClose Encounter: You had a harrowing encounter with one of Wildspace's many terrors. You escaped with your life, but the encounter left you with a scar or two, or perhaps a recurring nightmare. Roll on the Close Encounter table to determine which creature nearly got the best of you. Creatures marked with an asterisk appear in Boo's Astral Menagerie; the others are described in the Monster Manual. d10 | Creature 1 \u2014 Beholder 2 \u2014 Cosmic horror* 3 \u2014 Feyr* 4 \u2014 source=BAM* 5 \u2014 Mind flayer 6 \u2014 Neh-thalggu* 7 \u2014 Neogi* 8 \u2014 Space clown* 9 \u2014 Vampirate* 10 \u2014 Void scavver*\nFeature: Wildspace Adaptation: You gain the Tough feat from the Player's Handbook. In addition, you learned how to adapt to zero gravity. Being weightless doesn't give you disadvantage on any of your melee attack rolls (see \"2\" in 2).",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_athletics",
      "skill_survival"
    ],
    "tool": "Navigator's Tools",
    "feat": {
      "name": "Tough",
      "desc": "Origin feat granted by this background."
    },
    "equipment_base": {
      "items": [
        {
          "name": "Belaying pin",
          "qty": 1
        },
        {
          "name": "Traveler's Clothes",
          "qty": 1
        },
        {
          "name": "Grappling Hook",
          "qty": 1
        },
        {
          "name": "Hempen Rope (50 Feet)",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 10,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "witchlight-hand-2014",
    "name": "Witchlight Hand",
    "edition": "srd2014",
    "source": "WBtW",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Carnival Fixture: The Witchlight Carnival provides you with free, modest lodging and food. In addition, you may wander about the carnival and partake of its many wonders at no cost to you, provided you don't disrupt its shows or cause any other trouble.\nCarnival Companion: Over the years, you have earned the friendship of another carnival fixture. Roll a d8 and consult the Carnival Companion table to determine whom or what you've befriended, or you can choose an option that you like. Work with your DM to flesh out this friendship. This companion hangs around you while you're in the carnival, but it won't voluntarily leave the carnival. The DM can use the Witchlight hand stat block in 1 to represent hands, performers, and animal trainers who serve as carnival companions. Statistics for the other companions appear in the Monster Manual. d8 | Companion 1 \u2014 Old, cantankerous Witchlight hand 2 \u2014 Young, impressionable Witchlight hand 3 \u2014 Performer (such as an acrobat, a clown, or a musician) 4 \u2014 Retired performer 5 \u2014 Seasoned animal trainer 6 \u2014 Old blink dog 7 \u2014 Cheery sprite 8 \u2014 Harmless, magical wis",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_performance",
      "skill_sleight_of_hand"
    ],
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Deck of cards",
          "qty": 1
        },
        {
          "name": "Costume Clothes",
          "qty": 1
        },
        {
          "name": "Feywild Trinket",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 8,
      "sp": 0,
      "cp": 0
    },
    "equipment_options": [
      {
        "id": "a",
        "label": "Disguise Kit",
        "items": [
          {
            "name": "Disguise Kit",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "b",
        "label": "InstrumentMusical",
        "items": [
          {
            "name": "InstrumentMusical",
            "qty": 1
          }
        ],
        "gp": 0,
        "sp": 0,
        "cp": 0
      }
    ]
  },
  {
    "id": "witherbloom-student-2014",
    "name": "Witherbloom Student",
    "edition": "srd2014",
    "source": "SCC",
    "description": "\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Languages:: \n\u2022 Equipment:: \nFeature: Witherbloom Initiate: You gain the Strixhaven Initiate feat and must choose Witherbloom within it. In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Witherbloom Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.) Spell Level | Spells 1st \u2014 Cure Wounds, Inflict Wounds 2nd \u2014 Lesser Restoration, Wither And Bloom 3rd \u2014 Revivify, Vampiric Touch 4th \u2014 Blight, Death Ward 5th \u2014 Antilife Shell, Greater Restoration Consider customizing how your spells look when you cast them. Your Witherbloom spells might rely on material components or a spellcasting focus drawn from the swamp environment of Witherbloom, and your spells might take on an appearance suggesting those natural elements. Spectral shapes of swamp animals or plants might form amid your spell effects.\nBuilding a Witherbloom Character: Druids and warlocks make up most of Witherbloom's student body. A few wizards (mostly those who study the School of Necromancy) and clerics (including those with the ",
    "abilities": [],
    "abilityChoice": "free",
    "skills": [
      "skill_nature",
      "skill_survival"
    ],
    "tool": "Herbalism Kit",
    "feat": {
      "name": "Strixhaven Initiate",
      "desc": "Origin feat granted by this background."
    },
    "anyLanguages": 1,
    "equipment_base": {
      "items": [
        {
          "name": "Ink (1-Ounce Bottle)",
          "qty": 1
        },
        {
          "name": "Ink Pen",
          "qty": 1
        },
        {
          "name": "Book about plant identification",
          "qty": 1
        },
        {
          "name": "Iron Pot",
          "qty": 1
        },
        {
          "name": "Herbalism Kit",
          "qty": 1
        },
        {
          "name": "School uniform",
          "qty": 1
        },
        {
          "name": "Pouch",
          "qty": 1
        }
      ],
      "gp": 15,
      "sp": 0,
      "cp": 0
    }
  },
  {
    "id": "zhentarim-mercenary-2024",
    "name": "Zhentarim Mercenary",
    "edition": "srd2024",
    "source": "FRHoF",
    "description": "\u2022 Ability Scores:: \n\u2022 Feat:: \n\u2022 Skill Proficiencies:: \n\u2022 Tool Proficiencies:: \n\u2022 Equipment::",
    "abilities": [
      "strength",
      "dexterity",
      "charisma"
    ],
    "abilityChoice": "listed",
    "skills": [
      "skill_intimidation",
      "skill_perception"
    ],
    "tool": "Forgery Kit",
    "feat": {
      "name": "Zhentarim Ruffian",
      "desc": "Origin feat granted by this background."
    },
    "equipment_options": [
      {
        "id": "A",
        "label": "Club, Dagger, Forgery Kit, Fine Clothes, Hooded Lantern, Oil (3 flasks), Pouches \u00d72, String, Tinderbox, 11 GP",
        "items": [
          {
            "name": "Club",
            "qty": 1
          },
          {
            "name": "Dagger",
            "qty": 1
          },
          {
            "name": "Forgery Kit",
            "qty": 1
          },
          {
            "name": "Fine Clothes",
            "qty": 1
          },
          {
            "name": "Hooded Lantern",
            "qty": 1
          },
          {
            "name": "Oil (3 flasks)",
            "qty": 1
          },
          {
            "name": "Pouches",
            "qty": 2
          },
          {
            "name": "String",
            "qty": 1
          },
          {
            "name": "Tinderbox",
            "qty": 1
          }
        ],
        "gp": 11,
        "sp": 0,
        "cp": 0
      },
      {
        "id": "B",
        "label": "50 GP",
        "items": [],
        "gp": 50,
        "sp": 0,
        "cp": 0
      }
    ]
  }
];

// The six scores, for a 'free' background's picker.
export const ALL_ABILITY_FIELDS = [
  'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma',
];

// Which scores a background can affect — its own three, or all six when the
// player is free to choose. Used by the picker's stat filter.
export function affectedAbilities(bg) {
  if (!bg) return [];
  if (bg.abilityChoice === 'free') return ALL_ABILITY_FIELDS;
  return bg.abilities || [];
}

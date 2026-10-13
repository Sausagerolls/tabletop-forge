// GENERATED — do not edit by hand.
//
// Written by class-data/import_5etools_options.py. Re-run it to refresh.
//
// The per-class option pools: a Warlock's invocations, a Sorcerer's
// metamagic, a Battle Master's manoeuvres, and so on.
//
// EDITION MATTERS HERE, more than anywhere else in the app. The Warlock's
// list was rewritten for 2024: 54 invocations became 28, only 23 names are
// shared, and the four Pact Boons — a separate pick in 2014 — became ordinary
// invocations. A character built on one edition's rules must be offered that
// edition's pool, which is why every group is keyed by edition rather than
// merged into one list.
//
// `knownByLevel` is the class table: level → how many you know by then. The
// picker treats it as a ceiling, not a quota, so a part-built character is
// never shown as invalid.
//
// `prereq` carries what can be checked — { level, pact, spell, item, feature }
// — plus a `note` for the wording the picker cannot evaluate itself.

export const CLASS_OPTION_GROUPS = [
  {
    "id": "warlock-invocations",
    "class": "Warlock",
    "label": "Eldritch Invocations",
    "editions": {
      "srd2014": [
        {
          "id": "agonizing-blast",
          "name": "Agonizing Blast",
          "desc": "When you cast Eldritch Blast, add your Charisma modifier to the damage it deals on a hit.",
          "source": "PHB",
          "prereq": {
            "spell": [
              "eldritch blast#c"
            ],
            "note": "spell: eldritch blast#c"
          }
        },
        {
          "id": "armor-of-shadows",
          "name": "Armor of Shadows",
          "desc": "You can cast Mage Armor on yourself at will, without expending a spell slot or material components.",
          "source": "PHB",
          "spells": [
            "Mage Armor"
          ]
        },
        {
          "id": "ascendant-step",
          "name": "Ascendant Step",
          "desc": "You can cast Levitate on yourself at will, without expending a spell slot or material components.",
          "source": "PHB",
          "prereq": {
            "level": 9
          },
          "spells": [
            "Levitate"
          ]
        },
        {
          "id": "aspect-of-the-moon",
          "name": "Aspect of the Moon",
          "desc": "You no longer need to sleep and can't be forced to sleep by any means. To gain the benefits of a long rest, you can spend all 8 hours doing light activity, such as reading your Book of Shadows and keeping watch.",
          "source": "XGE",
          "prereq": {
            "pact": "Tome"
          }
        },
        {
          "id": "beast-speech",
          "name": "Beast Speech",
          "desc": "You can cast Speak With Animals at will, without expending a spell slot.",
          "source": "PHB",
          "spells": [
            "Speak With Animals"
          ]
        },
        {
          "id": "beguiling-influence",
          "name": "Beguiling Influence",
          "desc": "You gain proficiency in the Deception and Persuasion skills.",
          "source": "PHB"
        },
        {
          "id": "bewitching-whispers",
          "name": "Bewitching Whispers",
          "desc": "You can cast Compulsion once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB",
          "prereq": {
            "level": 7
          }
        },
        {
          "id": "bond-of-the-talisman",
          "name": "Bond of the Talisman",
          "desc": "While someone else is wearing your talisman, you can use your action to teleport to the unoccupied space closest to them, provided the two of you are on the same plane of existence. The wearer of your talisman can do the same thing, using their action to teleport to you. The teleportation can be used a number of times equal to your proficiency bonus, and all expended uses are restored when you finish a long rest.",
          "source": "TCE",
          "prereq": {
            "level": 12,
            "pact": "Talisman"
          }
        },
        {
          "id": "book-of-ancient-secrets",
          "name": "Book of Ancient Secrets",
          "desc": "You can now inscribe magical rituals in your Book of Shadows. Choose two Components & Miscellaneous=ritual. The spells needn't be from the same spell list. The spells appear in the book and don't count against the number of spells you know. With your Book of Shadows in hand, you can cast the chosen spells as rituals. You can't cast the spells except as rituals, unless you've learned them by some other means. You can also cast a warlock spell you know as a ritual if it has the ritual tag.\nOn your adventures, you can add other ritual spells to your Book of Shadows. When you find such a spell, you can add it to the book if the spell's level is equal to or less than half your warlock level (rounded up) and if you can spare the time to transcribe the spell. For each level of the spell, the transcription process takes 2 hours and costs 50 gp for the rare inks needed to inscribe it.",
          "source": "PHB",
          "prereq": {
            "pact": "Tome"
          }
        },
        {
          "id": "chains-of-carceri",
          "name": "Chains of Carceri",
          "desc": "You can cast Hold Monster at will\u2014targeting a celestial, fiend, or elemental\u2014without expending a spell slot or material components. You must finish a long rest before you can use this invocation on the same creature again.",
          "source": "PHB",
          "prereq": {
            "level": 15,
            "pact": "Chain"
          }
        },
        {
          "id": "cloak-of-flies",
          "name": "Cloak of Flies",
          "desc": "As a bonus action, you can surround yourself with a magical aura that looks like buzzing flies. The aura extends 5 feet from you in every direction, but not through 3. It lasts until you're incapacitated or you dismiss it as a bonus action.\nThe aura grants you advantage on Charisma (Intimidation) checks but disadvantage on all other Charisma checks. Any other creature that starts its turn in the aura takes poison damage equal to your Charisma modifier (minimum of 0 damage).\nOnce you use this invocation, you can't use it again until you finish a short or long rest.",
          "source": "XGE",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "devil-s-sight",
          "name": "Devil's Sight",
          "desc": "You can see normally in darkness, both magical and nonmagical, to a distance of 120 feet.",
          "source": "PHB"
        },
        {
          "id": "dreadful-word",
          "name": "Dreadful Word",
          "desc": "You can cast Confusion once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB",
          "prereq": {
            "level": 7
          }
        },
        {
          "id": "eldritch-mind",
          "name": "Eldritch Mind",
          "desc": "You have advantage on Constitution saving throws that you make to maintain your concentration on a spell.",
          "source": "TCE"
        },
        {
          "id": "eldritch-sight",
          "name": "Eldritch Sight",
          "desc": "You can cast Detect Magic at will, without expending a spell slot.",
          "source": "PHB",
          "spells": [
            "Detect Magic"
          ]
        },
        {
          "id": "eldritch-smite",
          "name": "Eldritch Smite",
          "desc": "Once per turn when you hit a creature with your pact weapon, you can expend a warlock spell slot to deal an extra 1d8 force damage to the target, plus another 1d8 per level of the spell slot, and you can knock the target prone if it is Huge or smaller.",
          "source": "XGE",
          "prereq": {
            "level": 5,
            "pact": "Blade"
          }
        },
        {
          "id": "eldritch-spear",
          "name": "Eldritch Spear",
          "desc": "When you cast Eldritch Blast, its range is 300 feet.",
          "source": "PHB",
          "prereq": {
            "spell": [
              "eldritch blast#c"
            ],
            "note": "spell: eldritch blast#c"
          }
        },
        {
          "id": "eyes-of-the-rune-keeper",
          "name": "Eyes of the Rune Keeper",
          "desc": "You can read all writing.",
          "source": "PHB"
        },
        {
          "id": "far-scribe",
          "name": "Far Scribe",
          "desc": "A new page appears in your Book of Shadows. With your permission, a creature can use its action to write its name on that page, which can contain a number of names equal to your proficiency bonus.\nYou can cast the Sending spell, targeting a creature whose name is on the page, without using a spell slot and without using material components. To do so, you must write the message on the page. The target hears the message in their mind, and if the target replies, their message appears on the page, rather than in your mind. The writing disappears after 1 minute.\nAs an action, you can magically erase a name on the page by touching it.",
          "source": "TCE",
          "prereq": {
            "level": 5,
            "pact": "Tome"
          },
          "spells": [
            "Sending"
          ]
        },
        {
          "id": "fiendish-vigor",
          "name": "Fiendish Vigor",
          "desc": "You can cast False Life on yourself at will as a 1st-level spell, without expending a spell slot or material components.",
          "source": "PHB",
          "spells": [
            "False Life"
          ]
        },
        {
          "id": "gaze-of-two-minds",
          "name": "Gaze of Two Minds",
          "desc": "You can use your action to touch a willing humanoid and perceive through its senses until the end of your next turn. As long as the creature is on the same plane of existence as you, you can use your action on subsequent turns to maintain this connection, extending the duration until the end of your next turn. While perceiving through the other creature's senses, you benefit from any special senses possessed by that creature, and you are blinded and deafened to your own surroundings.",
          "source": "PHB"
        },
        {
          "id": "ghostly-gaze",
          "name": "Ghostly Gaze",
          "desc": "As an action, you gain the ability to see through solid objects to a range of 30 feet. Within that range, you have darkvision if you don't already have it. This special sight lasts for 1 minute or until your concentration ends (as if you were concentrating on a spell). During that time, you perceive objects as ghostly, transparent images.\nOnce you use this invocation, you can't use it again until you finish a short or long rest.",
          "source": "XGE",
          "prereq": {
            "level": 7
          }
        },
        {
          "id": "gift-of-the-depths",
          "name": "Gift of the Depths",
          "desc": "You can breathe underwater, and you gain a swimming speed equal to your walking speed.\nYou can also cast Water Breathing once without expending a spell slot. You regain the ability to do so when you finish a long rest.",
          "source": "XGE",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "gift-of-the-ever-living-ones",
          "name": "Gift of the Ever-Living Ones",
          "desc": "Whenever you regain hit points while your familiar is within 100 feet of you, treat any dice rolled to determine the hit points you regain as having rolled their maximum value for you.",
          "source": "XGE",
          "prereq": {
            "pact": "Chain"
          }
        },
        {
          "id": "gift-of-the-protectors",
          "name": "Gift of the Protectors",
          "desc": "A new page appears in your Book of Shadows. With your permission, a creature can use its action to write its name on that page, which can contain a number of names equal to your proficiency bonus.\nWhen any creature whose name is on the page is reduced to 0 hit points but not killed outright, the creature magically drops to 1 hit point instead. Once this magic is triggered, no creature can benefit from it until you finish a long rest.\nAs an action, you can magically erase a name on the page by touching it.",
          "source": "TCE",
          "prereq": {
            "level": 9,
            "pact": "Tome"
          }
        },
        {
          "id": "grasp-of-hadar",
          "name": "Grasp of Hadar",
          "desc": "Once on each of your turns when you hit a creature with your Eldritch Blast, you can move that creature in a straight line 10 feet closer to you.",
          "source": "XGE",
          "prereq": {
            "spell": [
              "eldritch blast#c"
            ],
            "note": "spell: eldritch blast#c"
          }
        },
        {
          "id": "improved-pact-weapon",
          "name": "Improved Pact Weapon",
          "desc": "You can use any weapon you summon with your Pact of the Blade feature as a spellcasting focus for your warlock spells.\nIn addition, the weapon gains a +1 bonus to its attack and damage rolls, unless it is a magic weapon that already has a bonus to those rolls.\nFinally, the weapon you conjure can be a shortbow, longbow, light crossbow, or heavy crossbow.",
          "source": "XGE",
          "prereq": {
            "pact": "Blade"
          }
        },
        {
          "id": "investment-of-the-chain-master",
          "name": "Investment of the Chain Master",
          "desc": "When you cast Find Familiar, you infuse the summoned familiar with a measure of your eldritch power, granting the creature the following benefits:\n\u2022 The familiar gains either a flying speed or a swimming speed (your choice) of 40 feet.\n\u2022 As a bonus action, you can command the familiar to take the Attack action.\n\u2022 The familiar's weapon attacks are considered magical for the purpose of overcoming immunity and resistance to nonmagical attacks.\n\u2022 If the familiar forces a creature to make a saving throw, it uses your spell save DC.\n\u2022 When the familiar takes damage, you can use your reaction to grant it resistance against that damage.",
          "source": "TCE",
          "prereq": {
            "pact": "Chain"
          }
        },
        {
          "id": "lance-of-lethargy",
          "name": "Lance of Lethargy",
          "desc": "Once on each of your turns when you hit a creature with your Eldritch Blast, you can reduce that creature's speed by 10 feet until the end of your next turn.",
          "source": "XGE",
          "prereq": {
            "spell": [
              "eldritch blast#c"
            ],
            "note": "spell: eldritch blast#c"
          }
        },
        {
          "id": "lifedrinker",
          "name": "Lifedrinker",
          "desc": "When you hit a creature with your pact weapon, the creature takes extra necrotic damage equal to your Charisma modifier (minimum of 1).",
          "source": "PHB",
          "prereq": {
            "level": 12,
            "pact": "Blade"
          }
        },
        {
          "id": "maddening-hex",
          "name": "Maddening Hex",
          "desc": "As a bonus action, you cause a psychic disturbance around the target cursed by your Hex spell or by a warlock feature of yours, such as Hexblade's Curse or Sign of Ill Omen. When you do so, you deal psychic damage to the cursed target and each creature of your choice that you can see within 5 feet of it. The psychic damage equals your Charisma modifier (minimum of 1 damage). To use this invocation, you must be able to see the cursed target, and it must be within 30 feet of you.",
          "source": "XGE",
          "prereq": {
            "level": 5,
            "spell": [
              "hex/curse#x"
            ],
            "note": "spell: hex/curse#x"
          }
        },
        {
          "id": "mask-of-many-faces",
          "name": "Mask of Many Faces",
          "desc": "You can cast Disguise Self at will, without expending a spell slot.",
          "source": "PHB",
          "spells": [
            "Disguise Self"
          ]
        },
        {
          "id": "master-of-myriad-forms",
          "name": "Master of Myriad Forms",
          "desc": "You can cast Alter Self at will, without expending a spell slot.",
          "source": "PHB",
          "prereq": {
            "level": 15
          },
          "spells": [
            "Alter Self"
          ]
        },
        {
          "id": "minions-of-chaos",
          "name": "Minions of Chaos",
          "desc": "You can cast Conjure Elemental once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB",
          "prereq": {
            "level": 9
          }
        },
        {
          "id": "mire-the-mind",
          "name": "Mire the Mind",
          "desc": "You can cast Slow once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "misty-visions",
          "name": "Misty Visions",
          "desc": "You can cast Silent Image at will, without expending a spell slot or material components.",
          "source": "PHB",
          "spells": [
            "Silent Image"
          ]
        },
        {
          "id": "one-with-shadows",
          "name": "One with Shadows",
          "desc": "When you are in an area of dim light or darkness, you can use your action to become invisible until you move or take an action or a reaction.",
          "source": "PHB",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "otherworldly-leap",
          "name": "Otherworldly Leap",
          "desc": "You can cast Jump on yourself at will, without expending a spell slot or material components.",
          "source": "PHB",
          "prereq": {
            "level": 9
          },
          "spells": [
            "Jump"
          ]
        },
        {
          "id": "protection-of-the-talisman",
          "name": "Protection of the Talisman",
          "desc": "When the wearer of your talisman fails a saving throw, they can add a d4 to the roll, potentially turning the save into a success. This benefit can be used a number of times equal to your proficiency bonus, and all expended uses are restored when you finish a long rest.",
          "source": "TCE",
          "prereq": {
            "level": 7,
            "pact": "Talisman"
          }
        },
        {
          "id": "rebuke-of-the-talisman",
          "name": "Rebuke of the Talisman",
          "desc": "When the wearer of your talisman is hit by an attacker you can see within 30 feet of you, you can use your reaction to deal psychic damage to the attacker equal to your proficiency bonus and push it up to 10 feet away from the talisman's wearer.",
          "source": "TCE",
          "prereq": {
            "pact": "Talisman"
          }
        },
        {
          "id": "relentless-hex",
          "name": "Relentless Hex",
          "desc": "Your curse creates a temporary bond between you and your target. As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see within 5 feet of the target cursed by your Hex spell or by a warlock feature of yours, such as Hexblade's Curse or Sign of Ill Omen. To teleport in this way, you must be able to see the cursed target.",
          "source": "XGE",
          "prereq": {
            "level": 7,
            "spell": [
              "hex/curse#x"
            ],
            "note": "spell: hex/curse#x"
          }
        },
        {
          "id": "repelling-blast",
          "name": "Repelling Blast",
          "desc": "When you hit a creature with Eldritch Blast, you can push the creature up to 10 feet away from you in a straight line.",
          "source": "PHB",
          "prereq": {
            "spell": [
              "eldritch blast#c"
            ],
            "note": "spell: eldritch blast#c"
          }
        },
        {
          "id": "sculptor-of-flesh",
          "name": "Sculptor of Flesh",
          "desc": "You can cast Polymorph once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB",
          "prereq": {
            "level": 7
          }
        },
        {
          "id": "shroud-of-shadow",
          "name": "Shroud of Shadow",
          "desc": "You can cast Invisibility at will, without expending a spell slot.",
          "source": "XGE",
          "prereq": {
            "level": 15
          },
          "spells": [
            "Invisibility"
          ]
        },
        {
          "id": "sign-of-ill-omen",
          "name": "Sign of Ill Omen",
          "desc": "You can cast Bestow Curse once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "thief-of-five-fates",
          "name": "Thief of Five Fates",
          "desc": "You can cast Bane once using a warlock spell slot. You can't do so again until you finish a long rest.",
          "source": "PHB"
        },
        {
          "id": "thirsting-blade",
          "name": "Thirsting Blade",
          "desc": "You can attack with your pact weapon twice, instead of once, whenever you take the Attack action on your turn.",
          "source": "PHB",
          "prereq": {
            "level": 5,
            "pact": "Blade"
          }
        },
        {
          "id": "tomb-of-levistus",
          "name": "Tomb of Levistus",
          "desc": "As a reaction when you take damage, you can entomb yourself in ice, which melts away at the end of your next turn. You gain 10 temporary hit points per warlock level, which take as much of the triggering damage as possible. Immediately after you take the damage, you gain vulnerability to fire damage, your speed is reduced to 0, and you are incapacitated. These effects, including any remaining temporary hit points, all end when the ice melts.\nOnce you use this invocation, you can't use it again until you finish a short or long rest.",
          "source": "XGE",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "trickster-s-escape",
          "name": "Trickster's Escape",
          "desc": "You can cast Freedom Of Movement once on yourself without expending a spell slot. You regain the ability to do so when you finish a long rest.",
          "source": "XGE",
          "prereq": {
            "level": 7
          }
        },
        {
          "id": "undying-servitude",
          "name": "Undying Servitude",
          "desc": "You can cast Animate Dead without using a spell slot. Once you do so, you can't cast it in this way again until you finish a long rest.",
          "source": "TCE",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "visions-of-distant-realms",
          "name": "Visions of Distant Realms",
          "desc": "You can cast Arcane Eye at will, without expending a spell slot.",
          "source": "PHB",
          "prereq": {
            "level": 15
          },
          "spells": [
            "Arcane Eye"
          ]
        },
        {
          "id": "voice-of-the-chain-master",
          "name": "Voice of the Chain Master",
          "desc": "You can communicate telepathically with your familiar and perceive through your familiar's senses as long as you are on the same plane of existence. Additionally, while perceiving through your familiar's senses, you can also speak through your familiar in your own voice, even if your familiar is normally incapable of speech.",
          "source": "PHB",
          "prereq": {
            "pact": "Chain"
          }
        },
        {
          "id": "whispers-of-the-grave",
          "name": "Whispers of the Grave",
          "desc": "You can cast Speak With Dead at will, without expending a spell slot.",
          "source": "PHB",
          "prereq": {
            "level": 9
          },
          "spells": [
            "Speak With Dead"
          ]
        },
        {
          "id": "witch-sight",
          "name": "Witch Sight",
          "desc": "You can see the true form of any shapechanger or creature concealed by illusion or transmutation magic while the creature is within 30 feet of you and within line of sight.",
          "source": "PHB",
          "prereq": {
            "level": 15
          }
        }
      ],
      "srd2024": [
        {
          "id": "agonizing-blast",
          "name": "Agonizing Blast",
          "desc": "Choose one of your known level=0 that deals damage. You can add your Charisma modifier to that spell's damage rolls.\nRepeatable: You can gain this invocation more than once. Each time you do so, choose a different eligible cantrip.",
          "source": "XPHB",
          "prereq": {
            "level": 2,
            "spell": [
              "{'choose': 'level=0"
            ],
            "note": "spell: {'choose': 'level=0"
          }
        },
        {
          "id": "armor-of-shadows",
          "name": "Armor of Shadows",
          "desc": "You can cast Mage Armor on yourself without expending a spell slot.",
          "source": "XPHB",
          "spells": [
            "Mage Armor"
          ]
        },
        {
          "id": "ascendant-step",
          "name": "Ascendant Step",
          "desc": "You can cast Levitate on yourself without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 5
          },
          "spells": [
            "Levitate"
          ]
        },
        {
          "id": "devil-s-sight",
          "name": "Devil's Sight",
          "desc": "You can see normally in Dim Light and Darkness\u2014both magical and nonmagical\u2014within 120 feet of yourself.",
          "source": "XPHB",
          "prereq": {
            "level": 2
          }
        },
        {
          "id": "devouring-blade",
          "name": "Devouring Blade",
          "desc": "The Extra Attack of your Thirsting Blade invocation confers two extra attacks rather than one.",
          "source": "XPHB",
          "prereq": {
            "level": 12,
            "feature": [
              "thirsting blade"
            ],
            "note": "feature: thirsting blade"
          }
        },
        {
          "id": "eldritch-mind",
          "name": "Eldritch Mind",
          "desc": "You have Advantage on Constitution saving throws that you make to maintain Concentration.",
          "source": "XPHB"
        },
        {
          "id": "eldritch-smite",
          "name": "Eldritch Smite",
          "desc": "Once per turn when you hit a creature with your pact weapon, you can expend a Pact Magic spell slot to deal an extra 1d8 Force damage to the target, plus another 1d8 per level of the spell slot, and you can give the target the Prone condition if it is Huge or smaller.",
          "source": "XPHB",
          "prereq": {
            "level": 5,
            "feature": [
              "pact of the blade"
            ],
            "note": "feature: pact of the blade"
          }
        },
        {
          "id": "eldritch-spear",
          "name": "Eldritch Spear",
          "desc": "Choose one of your known level=0 that deals damage and has a range of 10+ feet. When you cast that spell, its range increases by a number of feet equal to 30 times your Warlock level.\nRepeatable: You can gain this invocation more than once. Each time you do so, choose a different eligible cantrip.",
          "source": "XPHB",
          "prereq": {
            "level": 2,
            "spell": [
              "{'choose': 'level=0"
            ],
            "note": "spell: {'choose': 'level=0"
          }
        },
        {
          "id": "fiendish-vigor",
          "name": "Fiendish Vigor",
          "desc": "You can cast False Life on yourself without expending a spell slot. When you cast the spell with this feature, you don't roll the die for the Temporary Hit Points; you automatically get the highest number on the die.",
          "source": "XPHB",
          "prereq": {
            "level": 2
          },
          "spells": [
            "False Life"
          ]
        },
        {
          "id": "gaze-of-two-minds",
          "name": "Gaze of Two Minds",
          "desc": "You can use a Bonus Action to touch a willing creature and perceive through its senses until the end of your next turn. As long as the creature is on the same plane of existence as you, you can take a Bonus Action on subsequent turns to maintain this connection, extending the duration until the end of your next turn. The connection ends if you don't maintain it in this way.\nWhile perceiving through the other creature's senses, you benefit from any special senses possessed by that creature, and you can cast spells as if you were in your space or the other creature's space if the two of you are within 60 feet of each other.",
          "source": "XPHB",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "gift-of-the-depths",
          "name": "Gift of the Depths",
          "desc": "You can breathe underwater, and you gain a Swim Speed equal to your Speed.\nYou can also cast Water Breathing once without expending a spell slot. You regain the ability to cast it in this way again when you finish a Long Rest.",
          "source": "XPHB",
          "prereq": {
            "level": 5
          }
        },
        {
          "id": "gift-of-the-protectors",
          "name": "Gift of the Protectors",
          "desc": "A new page appears in your Book of Shadows when you conjure it. With your permission, a creature can take an action to write its name on that page, which can contain a number of names equal to your Charisma modifier (minimum of one name).\nWhen any creature whose name is on the page is reduced to 0 Hit Points but not killed outright, the creature magically drops to 1 Hit Point instead. Once this magic is triggered, no creature can benefit from it until you finish a Long Rest.\nAs a Magic action, you can erase a name on the page by touching it.",
          "source": "XPHB",
          "prereq": {
            "level": 9,
            "feature": [
              "pact of the tome"
            ],
            "note": "feature: pact of the tome"
          }
        },
        {
          "id": "investment-of-the-chain-master",
          "name": "Investment of the Chain Master",
          "desc": "When you cast Find Familiar, you infuse the summoned familiar with a measure of your eldritch power, granting the creature the following benefits.\nAerial or Aquatic: The familiar gains either a Fly Speed or a Swim Speed (your choice) of 40 feet.\nQuick Attack: As a Bonus Action, you can command the familiar to take the Attack action.\nNecrotic or Radiant Damage: Whenever the familiar deals Bludgeoning, Piercing, or Slashing damage, you can make it deal Necrotic or Radiant damage instead.\nYour Save DC: If the familiar forces a creature to make a saving throw, it uses your spell save DC.\nResistance: When the familiar takes damage, you can take a Reaction to grant it Resistance against that damage.",
          "source": "XPHB",
          "prereq": {
            "level": 5,
            "feature": [
              "pact of the chain"
            ],
            "note": "feature: pact of the chain"
          }
        },
        {
          "id": "lessons-of-the-first-ones",
          "name": "Lessons of the First Ones",
          "desc": "You have received knowledge from an elder entity of the multiverse, allowing you to gain one category=o of your choice.\nRepeatable: You can gain this invocation more than once. Each time you do so, choose a different Origin feat.",
          "source": "XPHB",
          "prereq": {
            "level": 2
          }
        },
        {
          "id": "lifedrinker",
          "name": "Lifedrinker",
          "desc": "Once per turn when you hit a creature with your pact weapon, you can deal an extra 1d6 Necrotic, Psychic, or Radiant damage (your choice) to the creature, and you can expend one of your Hit Point Dice to roll it and regain a number of Hit Points equal to the roll plus your Constitution modifier (minimum of 1 Hit Point).",
          "source": "XPHB",
          "prereq": {
            "level": 9,
            "feature": [
              "pact of the blade"
            ],
            "note": "feature: pact of the blade"
          }
        },
        {
          "id": "mask-of-many-faces",
          "name": "Mask of Many Faces",
          "desc": "You can cast Disguise Self without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 2
          },
          "spells": [
            "Disguise Self"
          ]
        },
        {
          "id": "master-of-myriad-forms",
          "name": "Master of Myriad Forms",
          "desc": "You can cast Alter Self without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 5
          },
          "spells": [
            "Alter Self"
          ]
        },
        {
          "id": "misty-visions",
          "name": "Misty Visions",
          "desc": "You can cast Silent Image without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 2
          },
          "spells": [
            "Silent Image"
          ]
        },
        {
          "id": "one-with-shadows",
          "name": "One with Shadows",
          "desc": "While you're in an area of Dim Light or Darkness, you can cast Invisibility on yourself without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 5
          },
          "spells": [
            "Invisibility"
          ]
        },
        {
          "id": "otherworldly-leap",
          "name": "Otherworldly Leap",
          "desc": "You can cast Jump on yourself without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 2
          },
          "spells": [
            "Jump"
          ]
        },
        {
          "id": "pact-of-the-blade",
          "name": "Pact of the Blade",
          "desc": "As a Bonus Action, you can conjure a pact weapon in your hand\u2014a Simple or Martial Melee weapon of your choice with which you bond\u2014or create a bond with a magic weapon you touch; you can't bond with a magic weapon if someone else is attuned to it or another Warlock is bonded with it. Until the bond ends, you have proficiency with the weapon, and you can use it as a Spellcasting Focus.\nWhenever you attack with the bonded weapon, you can use your Charisma modifier for the attack and damage rolls instead of using Strength or Dexterity; and you can cause the weapon to deal Necrotic, Psychic, or Radiant damage or its normal damage type.\nYour bond with the weapon ends if you use this feature's Bonus Action again, if the weapon is more than 5 feet away from you for 1 minute or more, or if you die. A conjured weapon disappears when the bond ends.",
          "source": "XPHB"
        },
        {
          "id": "pact-of-the-chain",
          "name": "Pact of the Chain",
          "desc": "You learn the Find Familiar spell and can cast it as a Magic action without expending a spell slot.\nWhen you cast the spell, you choose one of the normal forms for your familiar or one of the following special forms: Imp, Pseudodragon, Quasit, Skeleton, Slaad Tadpole, Sphinx of Wonder, Sprite, or Venomous Snake (see appendix B for the familiar's stat block).\nAdditionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to make one attack of its own with its Reaction.",
          "source": "XPHB"
        },
        {
          "id": "pact-of-the-tome",
          "name": "Pact of the Tome",
          "desc": "Stitching together strands of shadow, you conjure forth a book in your hand at the end of a Short or Long Rest. This Book of Shadows (you determine its appearance) contains eldritch magic that only you can access, granting you the benefits below. The book disappears if you conjure another book with this feature or if you die.\nCantrips and Rituals: When the book appears, choose three level=0, and choose two level=1 that have the Ritual tag. The spells can be from any class's spell list, and they must be spells you don't already have prepared. While the book is on your person, you have the chosen spells prepared, and they function as Warlock spells for you.\nSpellcasting Focus: You can use the book as a Spellcasting Focus.",
          "source": "XPHB"
        },
        {
          "id": "repelling-blast",
          "name": "Repelling Blast",
          "desc": "Choose one of your known level=0 that requires an attack roll. When you hit a Large or smaller creature with that cantrip, you can push the creature up to 10 feet straight away from you.\nRepeatable: You can gain this invocation more than once. Each time you do so, choose a different eligible cantrip.",
          "source": "XPHB",
          "prereq": {
            "level": 2,
            "spell": [
              "{'choose': 'level=0"
            ],
            "note": "spell: {'choose': 'level=0"
          }
        },
        {
          "id": "thirsting-blade",
          "name": "Thirsting Blade",
          "desc": "You gain the Extra Attack feature for your pact weapon only. With that feature, you can attack twice with the weapon instead of once when you take the Attack action on your turn.",
          "source": "XPHB",
          "prereq": {
            "level": 5,
            "feature": [
              "pact of the blade"
            ],
            "note": "feature: pact of the blade"
          }
        },
        {
          "id": "visions-of-distant-realms",
          "name": "Visions of Distant Realms",
          "desc": "You can cast Arcane Eye without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 9
          },
          "spells": [
            "Arcane Eye"
          ]
        },
        {
          "id": "whispers-of-the-grave",
          "name": "Whispers of the Grave",
          "desc": "You can cast Speak With Dead without expending a spell slot.",
          "source": "XPHB",
          "prereq": {
            "level": 7
          },
          "spells": [
            "Speak With Dead"
          ]
        },
        {
          "id": "witch-sight",
          "name": "Witch Sight",
          "desc": "You have Truesight with a range of 30 feet.",
          "source": "XPHB",
          "prereq": {
            "level": 15
          }
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "2": 2,
        "5": 3,
        "7": 4,
        "9": 5,
        "12": 6,
        "15": 7,
        "18": 8
      },
      "srd2024": {
        "1": 1,
        "2": 3,
        "5": 5,
        "7": 6,
        "9": 7,
        "12": 8,
        "15": 9,
        "18": 10
      }
    }
  },
  {
    "id": "fighter-manoeuvres",
    "class": "Fighter",
    "label": "Battle Master Manoeuvres",
    "subclass": "Battle Master",
    "editions": {
      "srd2014": [
        {
          "id": "ambush",
          "name": "Ambush",
          "desc": "When you make a Dexterity (Stealth) check or an initiative roll, you can expend one superiority die and add the die to the roll, provided you aren't incapacitated.",
          "source": "TCE"
        },
        {
          "id": "bait-and-switch",
          "name": "Bait and Switch",
          "desc": "When you're within 5 feet of a creature on your turn, you can expend one superiority die and switch places with that creature, provided you spend at least 5 feet of movement and the creature is willing and isn't incapacitated. This movement doesn't provoke opportunity attacks.\nRoll the superiority die. Until the start of your next turn, you or the other creature (your choice) gains a bonus to AC equal to the number rolled.",
          "source": "TCE"
        },
        {
          "id": "brace",
          "name": "Brace",
          "desc": "When a creature you can see moves into the reach you have with the melee weapon you're wielding, you can use your reaction to expend one superiority die and make one attack against the creature, using that weapon. If the attack hits, add the superiority die to the weapon's damage roll.",
          "source": "TCE"
        },
        {
          "id": "commander-s-strike",
          "name": "Commander's Strike",
          "desc": "When you take the Attack action on your turn, you can forgo one of your attacks and use a bonus action to direct one of your companions to strike. When you do so, choose a friendly creature who can see or hear you and expend one superiority die. That creature can immediately use its reaction to make one weapon attack, adding the superiority die to the attack's damage roll.",
          "source": "PHB"
        },
        {
          "id": "commanding-presence",
          "name": "Commanding Presence",
          "desc": "When you make a Charisma (Intimidation), a Charisma (Performance), or a Charisma (Persuasion) check, you can expend one superiority die and add the superiority die to the ability check.",
          "source": "TCE"
        },
        {
          "id": "disarming-attack",
          "name": "Disarming Attack",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to attempt to disarm the target, forcing it to drop one item of your choice that it's holding. You add the superiority die to the attack's damage roll, and the target must make a Strength saving throw. On a failed save, it drops the object you choose. The object lands at its feet.",
          "source": "PHB"
        },
        {
          "id": "distracting-strike",
          "name": "Distracting Strike",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to distract the creature, giving your allies an opening. You add the superiority die to the attack's damage roll. The next attack roll against the target by an attacker other than you has advantage if the attack is made before the start of your next turn.",
          "source": "PHB"
        },
        {
          "id": "evasive-footwork",
          "name": "Evasive Footwork",
          "desc": "When you move, you can expend one superiority die, rolling the die and adding the number rolled to your AC until you stop moving.",
          "source": "PHB"
        },
        {
          "id": "feinting-attack",
          "name": "Feinting Attack",
          "desc": "You can expend one superiority die and use a bonus action on your turn to feint, choosing one creature within 5 feet of you as your target. You have advantage on your next attack roll against that creature this turn. If that attack hits, add the superiority die to the attack's damage roll.",
          "source": "PHB"
        },
        {
          "id": "goading-attack",
          "name": "Goading Attack",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to attempt to goad the target into attacking you. You add the superiority die to the attack's damage roll, and the target must make a Wisdom saving throw. On a failed save, the target has disadvantage on all attack rolls against targets other than you until the end of your next turn.",
          "source": "PHB"
        },
        {
          "id": "grappling-strike",
          "name": "Grappling Strike",
          "desc": "Immediately after you hit a creature with a melee attack on your turn, you can expend one superiority die and then try to grapple the target as a bonus action (see the Player's Handbook for rules on grappling). Add the superiority die to your Strength (Athletics) check.",
          "source": "TCE"
        },
        {
          "id": "lunging-attack",
          "name": "Lunging Attack",
          "desc": "When you make a melee weapon attack on your turn, you can expend one superiority die to increase your reach for that attack by 5 feet. If you hit, you add the superiority die to the attack's damage roll.",
          "source": "PHB"
        },
        {
          "id": "maneuvering-attack",
          "name": "Maneuvering Attack",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to maneuver one of your comrades into a more advantageous position. You add the superiority die to the attack's damage roll, and you choose a friendly creature who can see or hear you. That creature can use its reaction to move up to half its speed without provoking opportunity attacks from the target of your attack.",
          "source": "PHB"
        },
        {
          "id": "menacing-attack",
          "name": "Menacing Attack",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to attempt to frighten the target. You add the superiority die to the attack's damage roll, and the target must make a Wisdom saving throw. On a failed save, it is frightened of you until the end of your next turn.",
          "source": "PHB"
        },
        {
          "id": "parry",
          "name": "Parry",
          "desc": "When another creature damages you with a melee attack, you can use your reaction and expend one superiority die to reduce the damage by the number you roll on your superiority die + your Dexterity modifier.",
          "source": "PHB"
        },
        {
          "id": "precision-attack",
          "name": "Precision Attack",
          "desc": "When you make a weapon attack roll against a creature, you can expend one superiority die to add it to the roll. You can use this maneuver before or after making the attack roll, but before any effects of the attack are applied.",
          "source": "PHB"
        },
        {
          "id": "pushing-attack",
          "name": "Pushing Attack",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to attempt to drive the target back. You add the superiority die to the attack's damage roll, and if the target is Large or smaller, it must make a Strength saving throw. On a failed save, you push the target up to 15 feet away from you.",
          "source": "PHB"
        },
        {
          "id": "quick-toss",
          "name": "Quick Toss",
          "desc": "As a bonus action, you can expend one superiority die and make a ranged attack with a weapon that has the thrown property. You can draw the weapon as part of making this attack. If you hit, add the superiority die to the weapon's damage roll.",
          "source": "TCE"
        },
        {
          "id": "rally",
          "name": "Rally",
          "desc": "On your turn, you can use a bonus action and expend one superiority die to bolster the resolve of one of your companions. When you do so, choose a friendly creature who can see or hear you. That creature gains temporary hit points equal to the superiority die roll + your Charisma modifier.",
          "source": "PHB"
        },
        {
          "id": "riposte",
          "name": "Riposte",
          "desc": "When a creature misses you with a melee attack, you can use your reaction and expend one superiority die to make a melee weapon attack against the creature. If you hit, you add the superiority die to the attack's damage roll.",
          "source": "PHB"
        },
        {
          "id": "sweeping-attack",
          "name": "Sweeping Attack",
          "desc": "When you hit a creature with a melee weapon attack, you can expend one superiority die to attempt to damage another creature with the same attack. Choose another creature within 5 feet of the original target and within your reach. If the original attack roll would hit the second creature, it takes damage equal to the number you roll on your superiority die. The damage is of the same type dealt by the original attack.",
          "source": "PHB"
        },
        {
          "id": "tactical-assessment",
          "name": "Tactical Assessment",
          "desc": "When you make an Intelligence (Investigation), an Intelligence (History), or a Wisdom (Insight) check, you can expend one superiority die and add the superiority die to the ability check.",
          "source": "TCE"
        },
        {
          "id": "trip-attack",
          "name": "Trip Attack",
          "desc": "When you hit a creature with a weapon attack, you can expend one superiority die to attempt to knock the target down. You add the superiority die to the attack's damage roll, and if the target is Large or smaller, it must make a Strength saving throw. On a failed save, you knock the target prone.",
          "source": "PHB"
        }
      ],
      "srd2024": [
        {
          "id": "ambush",
          "name": "Ambush",
          "desc": "When you make a Dexterity (Stealth) check or an Initiative roll, you can expend one Superiority Die and add the die to the roll, unless you have the Incapacitated condition.",
          "source": "XPHB"
        },
        {
          "id": "bait-and-switch",
          "name": "Bait and Switch",
          "desc": "When you're within 5 feet of a creature on your turn, you can expend one Superiority Die and switch places with that creature, provided you spend at least 5 feet of movement and the creature is willing and doesn't have the Incapacitated condition. This movement doesn't provoke Opportunity Attacks.\nRoll the Superiority Die. Until the start of your next turn, you or the other creature (your choice) gains a bonus to AC equal to the number rolled.",
          "source": "XPHB"
        },
        {
          "id": "commander-s-strike",
          "name": "Commander's Strike",
          "desc": "When you take the Attack action on your turn, you can replace one of your attacks to direct one of your companions to strike. When you do so, choose a willing creature who can see or hear you and expend one Superiority Die. That creature can immediately use its Reaction to make one attack with a weapon or an Unarmed Strike, adding the Superiority Die to the attack's damage roll on a hit.",
          "source": "XPHB"
        },
        {
          "id": "commanding-presence",
          "name": "Commanding Presence",
          "desc": "When you make a Charisma (Intimidation, Performance, or Persuasion) check, you can expend one Superiority Die and add that die to the roll.",
          "source": "XPHB"
        },
        {
          "id": "disarming-attack",
          "name": "Disarming Attack",
          "desc": "When you hit a creature with an attack roll, you can expend one Superiority Die to attempt to disarm the target. Add the Superiority Die roll to the attack's damage roll. The target must succeed on a Strength saving throw or drop one object of your choice that it's holding, with the object landing in its space.",
          "source": "XPHB"
        },
        {
          "id": "distracting-strike",
          "name": "Distracting Strike",
          "desc": "When you hit a creature with an attack roll, you can expend one Superiority Die to distract the target. Add the Superiority Die roll to the attack's damage roll. The next attack roll against the target by an attacker other than you has Advantage if the attack is made before the start of your next turn.",
          "source": "XPHB"
        },
        {
          "id": "evasive-footwork",
          "name": "Evasive Footwork",
          "desc": "As a Bonus Action, you can expend one Superiority Die and take the Disengage action. You also roll the die and add the number rolled to your AC until the start of your next turn.",
          "source": "XPHB"
        },
        {
          "id": "feinting-attack",
          "name": "Feinting Attack",
          "desc": "As a Bonus Action, you can expend one Superiority Die to feint, choosing one creature within 5 feet of yourself as your target. You have Advantage on your next attack roll against that target this turn. If that attack hits, add the Superiority Die to the attack's damage roll.",
          "source": "XPHB"
        },
        {
          "id": "goading-attack",
          "name": "Goading Attack",
          "desc": "When you hit a creature with an attack roll, you can expend one Superiority Die to attempt to goad the target into attacking you. Add the Superiority Die to the attack's damage roll. The target must succeed on a Wisdom saving throw or have Disadvantage on attack rolls against targets other than you until the end of your next turn.",
          "source": "XPHB"
        },
        {
          "id": "lunging-attack",
          "name": "Lunging Attack",
          "desc": "As a Bonus Action, you can expend one Superiority Die and take the Dash action. If you move at least 5 feet in a straight line immediately before hitting with a melee attack as part of the Attack action on this turn, you can add the Superiority Die to the attack's damage roll.",
          "source": "XPHB"
        },
        {
          "id": "maneuvering-attack",
          "name": "Maneuvering Attack",
          "desc": "When you hit a creature with an attack roll, you can expend one Superiority Die to maneuver one of your comrades into another position. Add the Superiority Die roll to the attack's damage roll, and choose a willing creature who can see or hear you. That creature can use its Reaction to move up to half its Speed without provoking an Opportunity Attack from the target of your attack.",
          "source": "XPHB"
        },
        {
          "id": "menacing-attack",
          "name": "Menacing Attack",
          "desc": "When you hit a creature with an attack roll, you can expend one Superiority Die to attempt to frighten the target. Add the Superiority Die to the attack's damage roll. The target must succeed on a Wisdom saving throw or have the Frightened condition until the end of your next turn.",
          "source": "XPHB"
        },
        {
          "id": "parry",
          "name": "Parry",
          "desc": "When another creature damages you with a melee attack roll, you can take a Reaction and expend one Superiority Die to reduce the damage by the number you roll on your Superiority Die plus your Strength or Dexterity modifier (your choice).",
          "source": "XPHB"
        },
        {
          "id": "precision-attack",
          "name": "Precision Attack",
          "desc": "When you miss with an attack roll, you can expend one Superiority Die, roll that die, and add it to the attack roll, potentially causing the attack to hit.",
          "source": "XPHB"
        },
        {
          "id": "pushing-attack",
          "name": "Pushing Attack",
          "desc": "When you hit a creature with an attack roll using a weapon or an Unarmed Strike, you can expend one Superiority Die to attempt to drive the target back. Add the Superiority Die to the attack's damage roll. If the target is Large or smaller, it must succeed on a Strength saving throw or be pushed up to 15 feet directly away from you.",
          "source": "XPHB"
        },
        {
          "id": "rally",
          "name": "Rally",
          "desc": "As a Bonus Action, you can expend one Superiority Die to bolster the resolve of a companion. Choose an ally of yours within 30 feet of yourself who can see or hear you. That creature gains Temporary Hit Points equal to the Superiority Die roll plus half your Fighter level (round down).",
          "source": "XPHB"
        },
        {
          "id": "riposte",
          "name": "Riposte",
          "desc": "When a creature misses you with a melee attack roll, you can take a Reaction and expend one Superiority Die to make a melee attack roll with a weapon or an Unarmed Strike against the creature. If you hit, add the Superiority Die to the attack's damage.",
          "source": "XPHB"
        },
        {
          "id": "sweeping-attack",
          "name": "Sweeping Attack",
          "desc": "When you hit a creature with a melee attack roll using a weapon or an Unarmed Strike, you can expend one Superiority Die to attempt to damage another creature. Choose another creature within 5 feet of the original target and within your reach. If the original attack roll would hit the second creature, it takes damage equal to the number you roll on your Superiority Die. The damage is of the same type dealt by the original attack.",
          "source": "XPHB"
        },
        {
          "id": "tactical-assessment",
          "name": "Tactical Assessment",
          "desc": "When you make an Intelligence (History or Investigation) check or a Wisdom (Insight) check, you can expend one Superiority Die and add that die to the ability check.",
          "source": "XPHB"
        },
        {
          "id": "trip-attack",
          "name": "Trip Attack",
          "desc": "When you hit a creature with an attack roll using a weapon or an Unarmed Strike, you can expend one Superiority Die and add the die to the attack's damage roll. If the target is Large or smaller, it must succeed on a Strength saving throw or have the Prone condition.",
          "source": "XPHB"
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "3": 3,
        "7": 5,
        "10": 7,
        "15": 9
      },
      "srd2024": {
        "3": 4,
        "7": 6,
        "10": 8,
        "15": 10
      }
    }
  },
  {
    "id": "artificer-infusions",
    "class": "Artificer",
    "label": "Infusions",
    "editions": {
      "srd2014": [
        {
          "id": "arcane-propulsion-armor",
          "name": "Arcane Propulsion Armor",
          "desc": "The wearer of this armor gains these benefits:\n\u2022 The wearer's walking speed increases by 5 feet.\n\u2022 The armor includes gauntlets, each of which is a magic melee weapon that can be wielded only when the hand is holding nothing. The wearer is proficient with the gauntlets, and each one deals 1d8 force damage on a hit and has the thrown property, with a normal range of 20 feet and a long range of 60 feet. When thrown, the gauntlet detaches and flies at the attack's target, then immediately returns to the wearer and reattaches.\n\u2022 The armor can't be removed against the wearer's will.\n\u2022 If the wearer is missing any limbs, the armor replaces those limbs\u2014hands, arms, feet, legs, or similar appendages. The replacements function identically to the body parts they replace.",
          "source": "TCE",
          "prereq": {
            "level": 14,
            "item": [
              "A suit of armor (requires attunement)"
            ],
            "note": "item: A suit of armor (requires attunement)"
          }
        },
        {
          "id": "armor-of-magical-strength",
          "name": "Armor of Magical Strength",
          "desc": "This armor has 6 charges. The wearer can expend the armor's charges in the following ways:\n\u2022 When the wearer makes a Strength check or a Strength saving throw, it can expend 1 charge to add a bonus to the roll equal to its Intelligence modifier.\n\u2022 If the creature would be knocked prone, it can use its reaction to expend 1 charge to avoid being knocked prone.\nThe armor regains 1d6 expended charges daily at dawn.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A suit of armor (requires attunement)"
            ],
            "note": "item: A suit of armor (requires attunement)"
          }
        },
        {
          "id": "boots-of-the-winding-path",
          "name": "Boots of the Winding Path",
          "desc": "While wearing these boots, a creature can teleport up to 15 feet as a bonus action to an unoccupied space the creature can see. The creature must have occupied that space at some point during the current turn.",
          "source": "TCE",
          "prereq": {
            "level": 6,
            "item": [
              "A pair of boots (requires attunement)"
            ],
            "note": "item: A pair of boots (requires attunement)"
          }
        },
        {
          "id": "enhanced-arcane-focus",
          "name": "Enhanced Arcane Focus",
          "desc": "While holding this item, a creature gains a +1 bonus to spell attack rolls. In addition, the creature ignores 3 when making a spell attack.\nThe bonus increases to +2 when you reach 10th level in this class.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A rod, staff, or wand (requires attunement)"
            ],
            "note": "item: A rod, staff, or wand (requires attunement)"
          }
        },
        {
          "id": "enhanced-defense",
          "name": "Enhanced Defense",
          "desc": "A creature gains a +1 bonus to Armor Class while wearing (armor) or wielding (shield) the infused item.\nThe bonus increases to +2 when you reach 10th level in this class.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A suit of armor or a shield"
            ],
            "note": "item: A suit of armor or a shield"
          }
        },
        {
          "id": "enhanced-weapon",
          "name": "Enhanced Weapon",
          "desc": "This magic weapon grants a +1 bonus to attack and damage rolls made with it.\nThe bonus increases to +2 when you reach 10th level in this class.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A simple or martial weapon"
            ],
            "note": "item: A simple or martial weapon"
          }
        },
        {
          "id": "helm-of-awareness",
          "name": "Helm of Awareness",
          "desc": "While wearing this helmet, a creature has advantage on initiative rolls. In addition, the wearer can't be surprised, provided it isn't incapacitated.",
          "source": "TCE",
          "prereq": {
            "level": 10,
            "item": [
              "A helmet (requires attunement)"
            ],
            "note": "item: A helmet (requires attunement)"
          }
        },
        {
          "id": "homunculus-servant",
          "name": "Homunculus Servant",
          "desc": "You learn intricate methods for magically creating a special homunculus that serves you. The item you infuse serves as the creature's heart, around which the creature's body instantly forms.\nYou determine the homunculus's appearance. Some artificers prefer mechanical-looking birds, whereas some like winged vials or miniature, animate cauldrons.\nThe homunculus is friendly to you and your companions, and it obeys your commands. See this creature's game statistics in the Homunculus Servant stat block, which uses your proficiency bonus (PB) in several places.\nIn combat, the homunculus shares your initiative count, but it takes its turn immediately after yours. It can move and use its reaction on its own, but the only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the homunculus can take any action of its choice, not just Dodge.\nThe homunculus regains 2d6 hit points if the Mending spell is cast on it. If you or the homunculus dies, it vanishes, leaving its heart in its space.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A gem or crystal worth at least 100 gp"
            ],
            "note": "item: A gem or crystal worth at least 100 gp"
          }
        },
        {
          "id": "mind-sharpener",
          "name": "Mind Sharpener",
          "desc": "The infused item can send a jolt to the wearer to refocus their mind. The item has 4 charges. When the wearer fails a Constitution saving throw to maintain concentration on a spell, the wearer can use its reaction to expend 1 of the item's charges to succeed instead. The item regains 1d4 expended charges daily at dawn.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A suit of armor or robes"
            ],
            "note": "item: A suit of armor or robes"
          }
        },
        {
          "id": "radiant-weapon",
          "name": "Radiant Weapon",
          "desc": "This magic weapon grants a +1 bonus to attack and damage rolls made with it. While holding it, the wielder can take a bonus action to cause it to shed bright light in a 30-foot radius and dim light for an additional 30 feet. The wielder can extinguish the light as a bonus action.\nThe weapon has 4 charges. As a reaction immediately after being hit by an attack, the wielder can expend 1 charge and cause the attacker to be blinded until the end of the attacker's next turn, unless the attacker succeeds on a Constitution saving throw against your spell save DC. The weapon regains 1d4 expended charges daily at dawn.",
          "source": "TCE",
          "prereq": {
            "level": 6,
            "item": [
              "A simple or martial weapon (requires attunement)"
            ],
            "note": "item: A simple or martial weapon (requires attunement)"
          }
        },
        {
          "id": "repeating-shot",
          "name": "Repeating Shot",
          "desc": "This magic weapon grants a +1 bonus to attack and damage rolls made with it when it's used to make a ranged attack, and it ignores the loading property if it has it.\nIf the weapon lacks ammunition, it produces its own, automatically creating one piece of magic ammunition when the wielder makes a ranged attack with it. The ammunition created by the weapon vanishes the instant after it hits or misses a target.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A simple or martial weapon with the ammunition property (requires attunement)"
            ],
            "note": "item: A simple or martial weapon with the ammunition property (requires attunement)"
          }
        },
        {
          "id": "replicate-magic-item",
          "name": "Replicate Magic Item",
          "desc": "Using this infusion, you replicate a particular magic item. You can learn this infusion multiple times; each time you do so, choose a magic item that you can make with it, picking from the Replicable Items tables below. A table's title tells you the level you must be in the class to choose an item from the table. Alternatively, you can choose the magic item from among the type=!potion;!scroll in the game, not including potions or scrolls.\nIn the tables, an item's entry tells you whether the item requires attunement. See the item's description in the Dungeon Master's Guide for more information about it, including the type of object required for its making.\nMagic Item | Attunement\nAlchemy jug \u2014 No\nBag of holding \u2014 No\nCap of water breathing \u2014 No\nGoggles of night \u2014 No\nRope of climbing \u2014 No\nSending stones \u2014 No\nWand of magic detection \u2014 No\nWand of secrets \u2014 No\nMagic Item | Attunement\nBoots of elvenkind \u2014 No\nCloak of elvenkind \u2014 Yes\nCloak of the manta ray \u2014 No\nEyes of charming \u2014 Yes\nGloves of thievery \u2014 No\nLantern of revealing \u2014 No\nPipes of haunting \u2014 No\nRing of water walking \u2014 No\nMagic Item | Attunement\nBoots of striding and springing \u2014 Yes\nBoots of the Winterlands \u2014 Yes\nBracers of archery \u2014 Yes\nBrooch of shielding \u2014 Yes\nCloak of protection \u2014 Yes\nEyes of the eagle \u2014 Yes\nGauntlets of ogre power \u2014 Yes\nGloves of missile snaring \u2014 Yes\nGloves of swimming and climbing \u2014 Yes\nHat of disguise \u2014 Yes\nHeadband of intellect \u2014 Yes\nHelm of telepathy \u2014 Yes\nMedallion of thoughts \u2014 Yes\nNecklace of adaptation \u2014 Yes\nPeriapt of wound closure \u2014 Yes\nPipes of the sewers \u2014 Yes\nQuiver of Ehlonna \u2014 No\nRing of jumping \u2014 Yes\nRing of mind shielding \u2014 Yes\nSlippers of spider climbing \u2014 Yes\nVentilating lungs (detailed in 13) \u2014 Yes\nWinged boots \u2014 Yes\nMagic Item | Attunement\nAmulet of health \u2014 Yes\nArcane propulsion arm (detailed in 13) \u2014 Yes\nBelt of hill giant strength \u2014 Yes\nBoots of levitation \u2014 Yes\nBoots of speed \u2014 Yes\nBracers of defense \u2014 Yes\nCloak of the bat \u2014 Yes\nDimensional shackles \u2014 No\nGem of seeing \u2014 Yes\nHorn of blasting \u2014 No\nRing of free action \u2014 Yes\nRing of protection \u2014 Yes\nRing of the ram \u2014 Yes",
          "source": "TCE"
        },
        {
          "id": "repulsion-shield",
          "name": "Repulsion Shield",
          "desc": "A creature gains a +1 bonus to Armor Class while wielding this shield.\nThe shield has 4 charges. While holding it, the wielder can use a reaction immediately after being hit by a melee attack to expend 1 of the shield's charges and push the attacker up to 15 feet away. The shield regains 1d4 expended charges daily at dawn.",
          "source": "TCE",
          "prereq": {
            "level": 6,
            "item": [
              "A shield (requires attunement)"
            ],
            "note": "item: A shield (requires attunement)"
          }
        },
        {
          "id": "resistant-armor",
          "name": "Resistant Armor",
          "desc": "While wearing this armor, a creature has resistance to one of the following damage types, which you choose when you infuse the item: acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, or thunder.",
          "source": "TCE",
          "prereq": {
            "level": 6,
            "item": [
              "A suit of armor (requires attunement)"
            ],
            "note": "item: A suit of armor (requires attunement)"
          }
        },
        {
          "id": "returning-weapon",
          "name": "Returning Weapon",
          "desc": "This magic weapon grants a +1 bonus to attack and damage rolls made with it, and it returns to the wielder's hand immediately after it is used to make a ranged attack.",
          "source": "TCE",
          "prereq": {
            "item": [
              "A simple or martial weapon with the thrown property"
            ],
            "note": "item: A simple or martial weapon with the thrown property"
          }
        },
        {
          "id": "spell-refueling-ring",
          "name": "Spell-Refueling Ring",
          "desc": "While wearing this ring, the creature can recover one expended spell slot as an action. The recovered slot can be of 3rd level or lower. Once used, the ring can't be used again until the next dawn.",
          "source": "TCE",
          "prereq": {
            "level": 6,
            "item": [
              "A ring (requires attunement)"
            ],
            "note": "item: A ring (requires attunement)"
          }
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "2": 4,
        "6": 6,
        "10": 8,
        "14": 10,
        "18": 12
      }
    }
  },
  {
    "id": "fighter-fighting-style",
    "class": "Fighter",
    "label": "Fighting Style",
    "single": true,
    "editions": {
      "srd2014": [
        {
          "id": "archery",
          "name": "Archery",
          "desc": "You gain a +2 bonus to attack rolls you make with ranged weapons.",
          "source": "PHB"
        },
        {
          "id": "blind-fighting",
          "name": "Blind Fighting",
          "desc": "You have blindsight with a range of 10 feet. Within that range, you can effectively see anything that isn't behind 3, even if you're blinded or in darkness. Moreover, you can see an invisible creature within that range, unless the creature successfully hides from you.",
          "source": "TCE"
        },
        {
          "id": "defense",
          "name": "Defense",
          "desc": "While you are wearing armor, you gain a +1 bonus to AC.",
          "source": "PHB"
        },
        {
          "id": "dueling",
          "name": "Dueling",
          "desc": "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.",
          "source": "PHB"
        },
        {
          "id": "great-weapon-fighting",
          "name": "Great Weapon Fighting",
          "desc": "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have the two-handed or versatile property for you to gain this benefit.",
          "source": "PHB"
        },
        {
          "id": "interception",
          "name": "Interception",
          "desc": "When a creature you can see hits a target, other than you, within 5 feet of you with an attack, you can use your reaction to reduce the damage the target takes by 1d10 + your proficiency bonus (to a minimum of 0 damage). You must be wielding a shield or a source=phb to use this reaction.",
          "source": "TCE"
        },
        {
          "id": "protection",
          "name": "Protection",
          "desc": "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.",
          "source": "PHB"
        },
        {
          "id": "superior-technique",
          "name": "Superior Technique",
          "desc": "You learn one feature type=MV:B of your choice from among those available to the Battle Master archetype. If a maneuver you use requires your target to make a saving throw to resist the maneuver's effects, the saving throw DC equals 8 + your proficiency bonus + your Strength or Dexterity modifier (your choice).\nYou gain one superiority die, which is a d6 (this die is added to any superiority dice you have from another source). This die is used to fuel your maneuvers. A superiority die is expended when you use it. You regain your expended superiority dice when you finish a short or long rest.",
          "source": "TCE"
        },
        {
          "id": "thrown-weapon-fighting",
          "name": "Thrown Weapon Fighting",
          "desc": "You can draw a weapon that has the thrown property as part of the attack you make with the weapon.\nIn addition, when you hit with a ranged attack using a thrown weapon, you gain a +2 bonus to the damage roll.",
          "source": "TCE"
        },
        {
          "id": "two-weapon-fighting",
          "name": "Two-Weapon Fighting",
          "desc": "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.",
          "source": "PHB"
        },
        {
          "id": "unarmed-fighting",
          "name": "Unarmed Fighting",
          "desc": "Your unarmed strikes can deal bludgeoning damage equal to 1d6 + your Strength modifier on a hit. If you aren't wielding any weapons or a shield when you make the attack roll, the d6 becomes a d8.\nAt the start of each of your turns, you can deal 1d4 bludgeoning damage to one creature grappled by you.",
          "source": "TCE"
        }
      ]
    }
  },
  {
    "id": "ranger-fighting-style",
    "class": "Ranger",
    "label": "Fighting Style",
    "single": true,
    "editions": {
      "srd2014": [
        {
          "id": "archery",
          "name": "Archery",
          "desc": "You gain a +2 bonus to attack rolls you make with ranged weapons.",
          "source": "PHB"
        },
        {
          "id": "blind-fighting",
          "name": "Blind Fighting",
          "desc": "You have blindsight with a range of 10 feet. Within that range, you can effectively see anything that isn't behind 3, even if you're blinded or in darkness. Moreover, you can see an invisible creature within that range, unless the creature successfully hides from you.",
          "source": "TCE"
        },
        {
          "id": "defense",
          "name": "Defense",
          "desc": "While you are wearing armor, you gain a +1 bonus to AC.",
          "source": "PHB"
        },
        {
          "id": "druidic-warrior",
          "name": "Druidic Warrior",
          "desc": "You learn two cantrips of your choice from the level=0. They count as ranger spells for you, and Wisdom is your spellcasting ability for them. Whenever you gain a level in this class, you can replace one of these cantrips with another cantrip from the druid spell list.",
          "source": "TCE"
        },
        {
          "id": "dueling",
          "name": "Dueling",
          "desc": "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.",
          "source": "PHB"
        },
        {
          "id": "thrown-weapon-fighting",
          "name": "Thrown Weapon Fighting",
          "desc": "You can draw a weapon that has the thrown property as part of the attack you make with the weapon.\nIn addition, when you hit with a ranged attack using a thrown weapon, you gain a +2 bonus to the damage roll.",
          "source": "TCE"
        },
        {
          "id": "two-weapon-fighting",
          "name": "Two-Weapon Fighting",
          "desc": "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.",
          "source": "PHB"
        }
      ]
    }
  },
  {
    "id": "fighter-arcane-shot",
    "class": "Fighter",
    "label": "Arcane Shot",
    "subclass": "Arcane Archer",
    "editions": {
      "srd2014": [
        {
          "id": "banishing-arrow",
          "name": "Banishing Arrow",
          "desc": "You use abjuration magic to try to temporarily banish your target to a harmless location in the Feywild. The creature hit by the arrow must also succeed on a Charisma saving throw or be banished. While banished in this way, the target's speed is 0, and it is incapacitated. At the end of its next turn, the target reappears in the space it vacated or in the nearest unoccupied space if that space is occupied.\nAfter you reach 18th level in this class, a target also takes 2d6 force damage when the arrow hits it.",
          "source": "XGE"
        },
        {
          "id": "beguiling-arrow",
          "name": "Beguiling Arrow",
          "desc": "Your enchantment magic causes this arrow to temporarily beguile its target. The creature hit by the arrow takes an extra 2d6 psychic damage, and choose one of your allies within 30 feet of the target. The target must succeed on a Wisdom saving throw, or it is charmed by the chosen ally until the start of your next turn. This effect ends early if the chosen ally attacks the charmed target, deals damage to it, or forces it to make a saving throw.\nThe psychic damage increases to 4d6 when you reach 18th level in this class.",
          "source": "XGE"
        },
        {
          "id": "bursting-arrow",
          "name": "Bursting Arrow",
          "desc": "You imbue your arrow with force energy drawn from the school of evocation. The energy detonates after your attack. Immediately after the arrow hits the creature, the target and all other creatures within 10 feet of it take 2d6 force damage each.\nThe force damage increases to 4d6 when you reach 18th level in this class.",
          "source": "XGE"
        },
        {
          "id": "enfeebling-arrow",
          "name": "Enfeebling Arrow",
          "desc": "You weave necromantic magic into your arrow. The creature hit by the arrow takes an extra 2d6 necrotic damage. The target must also succeed on a Constitution saving throw, or the damage dealt by its weapon attacks is halved until the start of your next turn.\nThe necrotic damage increases to 4d6 when you reach 18th level in this class.",
          "source": "XGE"
        },
        {
          "id": "grasping-arrow",
          "name": "Grasping Arrow",
          "desc": "When this arrow strikes its target, conjuration magic creates grasping, poisonous brambles, which wrap around the target. The creature hit by the arrow takes an extra 2d6 poison damage, its speed is reduced by 10 feet, and it takes 2d6 slashing damage the first time on each turn it moves 1 foot or more without teleporting. The target or any creature that can reach it can use its action to remove the brambles with a successful Strength (Athletics) check against your Arcane Shot save DC. Otherwise, the brambles last for 1 minute or until you use this option again.\nThe poison damage and slashing damage both increase to 4d6 when you reach 18th level in this class.",
          "source": "XGE"
        },
        {
          "id": "piercing-arrow",
          "name": "Piercing Arrow",
          "desc": "You use transmutation magic to give your arrow an ethereal quality. When you use this option, you don't make an attack roll for the attack. Instead, the arrow shoots forward in a line, which is 1 foot wide and 30 feet long, before disappearing. The arrow passes harmlessly through objects, ignoring cover. Each creature in that line must make a Dexterity saving throw. On a failed save, a creature takes damage as if it were hit by the arrow, plus an extra 1d6 piercing damage. On a successful save, a target takes half as much damage.\nThe piercing damage increases to 2d6 when you reach 18th level in this class.",
          "source": "XGE"
        },
        {
          "id": "seeking-arrow",
          "name": "Seeking Arrow",
          "desc": "Using divination magic, you grant your arrow the ability to seek out a target. When you use this option, you don't make an attack roll for the attack. Instead, choose one creature you have seen in the past minute. The arrow flies toward that creature, moving around corners if necessary and ignoring 3 and 3. If the target is within the weapon's range and there is a path large enough for the arrow to travel to the target, the target must make a Dexterity saving throw. Otherwise, the arrow disappears after traveling as far as it can. On a failed save, the target takes damage as if it were hit by the arrow, plus an extra 1d6 force damage, and you learn the target's current location. On a successful save, the target takes half as much damage, and you don't learn its location.\nThe force damage increases to 2d6 when you reach 18th level in this class.",
          "source": "XGE"
        },
        {
          "id": "shadow-arrow",
          "name": "Shadow Arrow",
          "desc": "You weave illusion magic into your arrow, causing it to occlude your foe's vision with shadows. The creature hit by the arrow takes an extra 2d6 psychic damage, and it must succeed on a Wisdom saving throw or be unable to see anything farther than 5 feet away until the start of your next turn.\nThe psychic damage increases to 4d6 when you reach 18th level in this class.",
          "source": "XGE"
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "3": 2,
        "7": 3,
        "10": 4,
        "15": 5,
        "18": 6
      }
    }
  },
  {
    "id": "paladin-fighting-style",
    "class": "Paladin",
    "label": "Fighting Style",
    "single": true,
    "editions": {
      "srd2014": [
        {
          "id": "blessed-warrior",
          "name": "Blessed Warrior",
          "desc": "You learn two cantrips of your choice from the level=0. They count as paladin spells for you, and Charisma is your spellcasting ability for them. Whenever you gain a level in this class, you can replace one of these cantrips with another cantrip from the cleric spell list.",
          "source": "TCE"
        },
        {
          "id": "blind-fighting",
          "name": "Blind Fighting",
          "desc": "You have blindsight with a range of 10 feet. Within that range, you can effectively see anything that isn't behind 3, even if you're blinded or in darkness. Moreover, you can see an invisible creature within that range, unless the creature successfully hides from you.",
          "source": "TCE"
        },
        {
          "id": "defense",
          "name": "Defense",
          "desc": "While you are wearing armor, you gain a +1 bonus to AC.",
          "source": "PHB"
        },
        {
          "id": "dueling",
          "name": "Dueling",
          "desc": "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.",
          "source": "PHB"
        },
        {
          "id": "great-weapon-fighting",
          "name": "Great Weapon Fighting",
          "desc": "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have the two-handed or versatile property for you to gain this benefit.",
          "source": "PHB"
        },
        {
          "id": "interception",
          "name": "Interception",
          "desc": "When a creature you can see hits a target, other than you, within 5 feet of you with an attack, you can use your reaction to reduce the damage the target takes by 1d10 + your proficiency bonus (to a minimum of 0 damage). You must be wielding a shield or a source=phb to use this reaction.",
          "source": "TCE"
        },
        {
          "id": "protection",
          "name": "Protection",
          "desc": "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.",
          "source": "PHB"
        }
      ]
    }
  },
  {
    "id": "monk-disciplines",
    "class": "Monk",
    "label": "Elemental Disciplines",
    "subclass": "Way of the Four Elements",
    "editions": {
      "srd2014": [
        {
          "id": "breath-of-winter",
          "name": "Breath of Winter",
          "desc": "You can spend 6 ki points to cast Cone Of Cold.",
          "source": "PHB",
          "prereq": {
            "level": 17
          }
        },
        {
          "id": "clench-of-the-north-wind",
          "name": "Clench of the North Wind",
          "desc": "You can spend 3 ki points to cast Hold Person.",
          "source": "PHB",
          "prereq": {
            "level": 6
          }
        },
        {
          "id": "elemental-attunement",
          "name": "Elemental Attunement",
          "desc": "You can use your action to briefly control elemental forces within 30 feet of you, causing one of the following effects of your choice:\n\u2022 Create a harmless, instantaneous sensory effect related to air, earth, fire, or water, such as a shower of sparks, a puff of wind, a spray of light mist, or a gentle rumbling of stone.\n\u2022 Instantaneously light or snuff out a candle, a torch, or a small campfire.\n\u2022 Chill or warm up to 1 pound of nonliving material for up to 1 hour.\n\u2022 Cause earth, fire, water, or mist that can fit within a 1-foot cube to shape itself into a crude form you designate for 1 minute.",
          "source": "PHB"
        },
        {
          "id": "eternal-mountain-defense",
          "name": "Eternal Mountain Defense",
          "desc": "You can spend 5 ki points to cast Stoneskin, targeting yourself.",
          "source": "PHB",
          "prereq": {
            "level": 17
          }
        },
        {
          "id": "fangs-of-the-fire-snake",
          "name": "Fangs of the Fire Snake",
          "desc": "When you use the Attack action on your turn, you can spend 1 ki point to cause tendrils of flame to stretch out from your fists and feet. Your reach with your unarmed strikes increases by 10 feet for that action, as well as the rest of the turn. A hit with such an attack deals fire damage instead of bludgeoning damage, and if you spend 1 ki point when the attack hits, it also deals an extra 1d10 fire damage.",
          "source": "PHB"
        },
        {
          "id": "fist-of-four-thunders",
          "name": "Fist of Four Thunders",
          "desc": "You can spend 2 ki points to cast Thunderwave.",
          "source": "PHB"
        },
        {
          "id": "flames-of-the-phoenix",
          "name": "Flames of the Phoenix",
          "desc": "You can spend 4 ki points to cast Fireball.",
          "source": "PHB",
          "prereq": {
            "level": 11
          }
        },
        {
          "id": "gong-of-the-summit",
          "name": "Gong of the Summit",
          "desc": "You can spend 3 ki points to cast Shatter.",
          "source": "PHB",
          "prereq": {
            "level": 6
          }
        },
        {
          "id": "mist-stance",
          "name": "Mist Stance",
          "desc": "You can spend 4 ki points to cast Gaseous Form, targeting yourself.",
          "source": "PHB",
          "prereq": {
            "level": 11
          }
        },
        {
          "id": "ride-the-wind",
          "name": "Ride the Wind",
          "desc": "You can spend 4 ki points to cast Fly, targeting yourself.",
          "source": "PHB",
          "prereq": {
            "level": 11
          }
        },
        {
          "id": "river-of-hungry-flame",
          "name": "River of Hungry Flame",
          "desc": "You can spend 5 ki points to cast Wall Of Fire.",
          "source": "PHB",
          "prereq": {
            "level": 17
          }
        },
        {
          "id": "rush-of-the-gale-spirits",
          "name": "Rush of the Gale Spirits",
          "desc": "You can spend 2 ki points to cast Gust Of Wind.",
          "source": "PHB"
        },
        {
          "id": "shape-the-flowing-river",
          "name": "Shape the Flowing River",
          "desc": "As an action, you can spend 1 ki point to choose an area of ice or water no larger than 30 feet on a side within 120 feet of you. You can change water to ice within the area and vice versa, and you can reshape ice in the area in any manner you choose. You can raise or lower the ice's elevation, create or fill in a trench, erect or flatten a wall, or form a pillar. The extent of any such changes can't exceed half the area's largest dimension. For example, if you affect a 30-foot square, you can create a pillar up to 15 feet high. raise or lower the square's elevation by up to 15 feet, dig a trench up to 15 feet deep, and so on. You can't shape the ice to trap or injure a creature in the area.",
          "source": "PHB"
        },
        {
          "id": "sweeping-cinder-strike",
          "name": "Sweeping Cinder Strike",
          "desc": "You can spend 2 ki points to cast Burning Hands.",
          "source": "PHB"
        },
        {
          "id": "unbroken-air",
          "name": "Unbroken Air",
          "desc": "You can create a blast of compressed air that strikes like a mighty fist. As an action, you can spend 2 ki points and choose a creature within 30 feet of you. That creature must make a Strength saving throw. On a failed save, the creature takes 3d10 bludgeoning damage, plus an extra 1d10 bludgeoning damage for each additional ki point you spend, and you can push the creature up to 20 feet away from you and knock it prone. On a successful save, the creature takes half as much damage, and you don't push it or knock it prone.",
          "source": "PHB"
        },
        {
          "id": "water-whip",
          "name": "Water Whip",
          "desc": "You can spend 2 ki points as an action to create a whip of water that shoves and pulls a creature to unbalance it. A creature that you can see that is within 30 feet of you must make a Dexterity saving throw. On a failed save, the creature takes 3d10 bludgeoning damage, plus an extra 1d10 bludgeoning damage for each additional ki point you spend, and you can either knock it prone or pull it up to 25 feet closer to you. On a successful save, the creature takes half as much damage, and you don't pull it or knock it prone.",
          "source": "PHB"
        },
        {
          "id": "wave-of-rolling-earth",
          "name": "Wave of Rolling Earth",
          "desc": "You can spend 6 ki points to cast Wall Of Stone.",
          "source": "PHB",
          "prereq": {
            "level": 17
          }
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "3": 2,
        "6": 3,
        "11": 4,
        "17": 5
      }
    }
  },
  {
    "id": "sorcerer-metamagic",
    "class": "Sorcerer",
    "label": "Metamagic",
    "editions": {
      "srd2014": [
        {
          "id": "careful-spell",
          "name": "Careful Spell",
          "desc": "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, you spend 1 sorcery point and choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw against the spell.",
          "source": "PHB"
        },
        {
          "id": "distant-spell",
          "name": "Distant Spell",
          "desc": "When you cast a spell that has a range of 5 feet or greater, you can spend 1 sorcery point to double the range of the spell.\nWhen you cast a spell that has a range of touch, you can spend 1 sorcery point to make the range of the spell 30 feet.",
          "source": "PHB"
        },
        {
          "id": "empowered-spell",
          "name": "Empowered Spell",
          "desc": "When you roll damage for a spell, you can spend 1 sorcery point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls.\nYou can use Empowered Spell even if you have already used a different Metamagic option during the casting of the spell.",
          "source": "PHB"
        },
        {
          "id": "extended-spell",
          "name": "Extended Spell",
          "desc": "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 sorcery point to double its duration, to a maximum duration of 24 hours.",
          "source": "PHB"
        },
        {
          "id": "heightened-spell",
          "name": "Heightened Spell",
          "desc": "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 sorcery points to give one target of the spell disadvantage on its first saving throw made against the spell.",
          "source": "PHB"
        },
        {
          "id": "quickened-spell",
          "name": "Quickened Spell",
          "desc": "When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting.",
          "source": "PHB"
        },
        {
          "id": "seeking-spell",
          "name": "Seeking Spell",
          "desc": "If you make an attack roll for a spell and miss, you can spend 2 sorcery points to reroll the d20, and you must use the new roll.\nYou can use Seeking Spell even if you have already used a different Metamagic option during the casting of the spell.",
          "source": "TCE"
        },
        {
          "id": "subtle-spell",
          "name": "Subtle Spell",
          "desc": "When you cast a spell, you can spend 1 sorcery point to cast it without any somatic or verbal components.",
          "source": "PHB"
        },
        {
          "id": "transmuted-spell",
          "name": "Transmuted Spell",
          "desc": "When you cast a spell that deals a type of damage from the following list, you can spend 1 sorcery point to change that damage type to one of the other listed types: acid, cold, fire, lightning, poison, thunder.",
          "source": "TCE"
        },
        {
          "id": "twinned-spell",
          "name": "Twinned Spell",
          "desc": "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of sorcery points equal to the spell's level to target a second creature in range with the same spell (1 sorcery point if the spell is a cantrip).\nTo be eligible, a spell must be incapable of targeting more than one creature at the spell's current level. For example, Magic Missile and Scorching Ray aren't eligible, but Ray Of Frost and Chromatic Orb are.",
          "source": "PHB"
        }
      ],
      "srd2024": [
        {
          "id": "careful-spell",
          "name": "Careful Spell",
          "desc": "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw against the spell, and it takes no damage if it would normally take half damage on a successful save.",
          "source": "XPHB"
        },
        {
          "id": "distant-spell",
          "name": "Distant Spell",
          "desc": "When you cast a spell that has a range of at least 5 feet, you can spend 1 Sorcery Point to double the spell's range. Or when you cast a spell that has a range of Touch, you can spend 1 Sorcery Point to make the spell's range 30 feet.",
          "source": "XPHB"
        },
        {
          "id": "empowered-spell",
          "name": "Empowered Spell",
          "desc": "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one), and you must use the new rolls.\nYou can use Empowered Spell even if you've already used a different Metamagic option during the casting of the spell.",
          "source": "XPHB"
        },
        {
          "id": "extended-spell",
          "name": "Extended Spell",
          "desc": "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration to a maximum duration of 24 hours.\nIf the affected spell requires Concentration, you have Advantage on any saving throw you make to maintain that Concentration.",
          "source": "XPHB"
        },
        {
          "id": "heightened-spell",
          "name": "Heightened Spell",
          "desc": "When you cast a spell that forces a creature to make a saving throw, you can spend 2 Sorcery Points to give one target of the spell Disadvantage on saves against the spell.",
          "source": "XPHB"
        },
        {
          "id": "quickened-spell",
          "name": "Quickened Spell",
          "desc": "When you cast a spell that has a casting time of an action, you can spend 2 Sorcery Points to change the casting time to a Bonus Action for this casting. You can't modify a spell in this way if you've already cast a level 1+ spell on the current turn, nor can you cast a level 1+ spell on this turn after modifying a spell in this way.",
          "source": "XPHB"
        },
        {
          "id": "seeking-spell",
          "name": "Seeking Spell",
          "desc": "If you make an attack roll for a spell and miss, you can spend 1 Sorcery Point to reroll the d20, and you must use the new roll.\nYou can use Seeking Spell even if you've already used a different Metamagic option during the casting of the spell.",
          "source": "XPHB"
        },
        {
          "id": "subtle-spell",
          "name": "Subtle Spell",
          "desc": "When you cast a spell, you can spend 1 Sorcery Point to cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.",
          "source": "XPHB"
        },
        {
          "id": "transmuted-spell",
          "name": "Transmuted Spell",
          "desc": "When you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to one of the other listed types: Acid, Cold, Fire, Lightning, Poison, Thunder.",
          "source": "XPHB"
        },
        {
          "id": "twinned-spell",
          "name": "Twinned Spell",
          "desc": "When you cast a spell, such as Charm Person, that can be cast with a higher-level spell slot to target an additional creature, you can spend 1 Sorcery Point to increase the spell's effective level by 1.",
          "source": "XPHB"
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "3": 2,
        "10": 3,
        "17": 4
      },
      "srd2024": {
        "2": 2,
        "10": 3,
        "17": 4
      }
    }
  },
  {
    "id": "fighter-runes",
    "class": "Fighter",
    "label": "Runes",
    "subclass": "Rune Knight",
    "editions": {
      "srd2014": [
        {
          "id": "cloud-rune",
          "name": "Cloud Rune",
          "desc": "This rune emulates the deceptive magic used by some cloud giants. While wearing or carrying an object inscribed with this rune, you have advantage on Dexterity (Sleight of Hand) checks and Charisma (Deception) checks.\nIn addition, when you or a creature you can see within 30 feet of you is hit by an attack roll, you can use your reaction to invoke the rune and choose a different creature within 30 feet of you, other than the attacker. The chosen creature becomes the target of the attack, using the same roll. This magic can transfer the attack's effects regardless of the attack's range. Once you invoke this rune, you can't do so again until you finish a short or long rest.",
          "source": "TCE"
        },
        {
          "id": "fire-rune",
          "name": "Fire Rune",
          "desc": "This rune's magic channels the masterful craftsmanship of great smiths. While wearing or carrying an object inscribed with this rune, your proficiency bonus is doubled for any ability check you make that uses your proficiency with a tool.\nIn addition, when you hit a creature with an attack using a weapon, you can invoke the rune to summon fiery shackles: the target takes an extra 2d6 fire damage, and it must succeed on a Strength saving throw or be restrained for 1 minute. While restrained by the shackles, the target takes 2d6 fire damage at the start of each of its turns. The target can repeat the saving throw at the end of each of its turns, banishing the shackles on a success. Once you invoke this rune, you can't do so again until you finish a short or long rest.",
          "source": "TCE"
        },
        {
          "id": "frost-rune",
          "name": "Frost Rune",
          "desc": "This rune's magic evokes the might of those who survive in the wintry wilderness, such as frost giants. While wearing or carrying an object inscribed with this rune, you have advantage on Wisdom (Animal Handling) checks and Charisma (Intimidation) checks.\nIn addition, you can invoke the rune as a bonus action to increase your sturdiness. For 10 minutes, you gain a +2 bonus to all ability checks and saving throws that use Strength or Constitution. Once you invoke this rune, you can't do so again until you finish a short or long rest.",
          "source": "TCE"
        },
        {
          "id": "hill-rune",
          "name": "Hill Rune",
          "desc": "This rune's magic bestows a resilience reminiscent of a hill giant. While wearing or carrying an object that bears this rune, you have advantage on saving throws against being poisoned, and you have resistance against poison damage.\nIn addition, you can invoke the rune as a bonus action, gaining resistance to bludgeoning, piercing, and slashing damage for 1 minute. Once you invoke this rune, you can't do so again until you finish a short or long rest.",
          "source": "TCE",
          "prereq": {
            "level": 7
          }
        },
        {
          "id": "stone-rune",
          "name": "Stone Rune",
          "desc": "This rune's magic channels the judiciousness associated with stone giants. While wearing or carrying an object inscribed with this rune, you have advantage on Wisdom (Insight) checks, and you have darkvision out to a range of 120 feet.\nIn addition, when a creature you can see ends its turn within 30 feet of you, you can use your reaction to invoke the rune and force the creature to make a Wisdom saving throw. Unless the save succeeds, the creature is charmed by you for 1 minute. While charmed in this way, the creature has a speed of 0 and is incapacitated, descending into a dreamy stupor. The creature repeats the saving throw at the end of each of its turns, ending the effect on a success. Once you invoke this rune, you can't do so again until you finish a short or long rest.",
          "source": "TCE"
        },
        {
          "id": "storm-rune",
          "name": "Storm Rune",
          "desc": "Using this rune, you can glimpse the future like a storm giant seer. While wearing or carrying an object inscribed with this rune, you have advantage on Intelligence (Arcana) checks, and you can't be surprised as long as you aren't incapacitated.\nIn addition, you can invoke the rune as a bonus action to enter a prophetic state for 1 minute or until you're incapacitated. Until the state ends, when you or another creature you can see within 60 feet of you makes an attack roll, a saving throw, or an ability check, you can use your reaction to cause the roll to have advantage or disadvantage. Once you invoke this rune, you can't do so again until you finish a short or long rest.",
          "source": "TCE",
          "prereq": {
            "level": 7
          }
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "3": 2,
        "7": 3,
        "10": 4,
        "15": 5
      }
    }
  },
  {
    "id": "bard-fighting-style",
    "class": "Bard",
    "label": "Fighting Style",
    "single": true,
    "editions": {
      "srd2014": [
        {
          "id": "dueling",
          "name": "Dueling",
          "desc": "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.",
          "source": "PHB"
        },
        {
          "id": "two-weapon-fighting",
          "name": "Two-Weapon Fighting",
          "desc": "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.",
          "source": "PHB"
        }
      ]
    }
  },
  {
    "id": "warlock-pact",
    "class": "Warlock",
    "label": "Pact Boon",
    "single": true,
    "note": "2014 only \u2014 in the 2024 rules the pacts are invocations.",
    "editions": {
      "srd2014": [
        {
          "id": "pact-of-the-blade",
          "name": "Pact of the Blade",
          "desc": "You can use your action to create a pact weapon in your empty hand. You can choose the form that this melee weapon takes each time you create it (see chapter 5 for weapon options). You are proficient with it while you wield it. This weapon counts as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.\nYour pact weapon disappears if it is more than 5 feet away from you for 1 minute or more. It also disappears if you use this feature again, if you dismiss the weapon (no action required), or if you die.\nYou can transform one magic weapon into your pact weapon by performing a special ritual while you hold the weapon. You perform the ritual over the course of 1 hour, which can be done during a short rest. You can then dismiss the weapon, shunting it into an extradimensional space, and it appears whenever you create your pact weapon thereafter. You can't affect an artifact or a sentient weapon in this way. The weapon ceases being your pact weapon if you die, if you perform the 1-hour ritual on a different weapon, or if you use a 1-hour ritual to break your bond to it. The weapon appears at your feet if it is in the extradimensional space when the bond breaks.",
          "source": "PHB"
        },
        {
          "id": "pact-of-the-chain",
          "name": "Pact of the Chain",
          "desc": "You learn the Find Familiar spell and can cast it as a ritual. The spell doesn't count against your number of spells known.\nWhen you cast the spell, you can choose one of the normal forms for your familiar or one of the following special forms: imp, pseudodragon, quasit, or sprite.\nAdditionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to use its reaction to make one attack of its own.",
          "source": "PHB"
        },
        {
          "id": "pact-of-the-talisman",
          "name": "Pact of the Talisman",
          "desc": "Your patron gives you an amulet, a talisman that can aid the wearer when the need is great. When the wearer fails an ability check, they can add a d4 to the roll, potentially turning the roll into a success. This benefit can be used a number of times equal to your proficiency bonus, and all expended uses are restored when you finish a long rest.\nIf you lose the talisman, you can perform a 1-hour ceremony to receive a replacement from your patron. This ceremony can be performed during a short or long rest, and it destroys the previous amulet. The talisman turns to ash when you die.",
          "source": "TCE"
        },
        {
          "id": "pact-of-the-tome",
          "name": "Pact of the Tome",
          "desc": "Your patron gives you a grimoire called a Book of Shadows. When you gain this feature, choose three level=0 from any class's spell list. The cantrips do not need to be from the same spell list. While the book is on your person, you can cast those cantrips at will. They don't count against your number of cantrips known. Any cantrip you cast with this feature is considered a warlock cantrip for you. If you lose your Book of Shadows, you can perform a 1-hour ceremony to receive a replacement from your patron. This ceremony can be performed during a short or long rest, and it destroys the previous book. The book turns to ash when you die.",
          "source": "PHB"
        }
      ]
    },
    "knownByLevel": {
      "srd2014": {
        "3": 1
      }
    }
  }
];

// Groups a class can offer, ignoring edition and subclass. Callers filter
// further; this is just the cheap first cut.
export function optionGroupsForClass(className) {
  if (!className) return [];
  return CLASS_OPTION_GROUPS.filter((g) => g.class === className);
}

// How many of a group a character of this level knows. Missing table, or a
// level below the first row, means the class does not offer it yet.
export function knownCount(group, edition, level) {
  const table = group?.knownByLevel?.[edition];
  if (!table) return null;
  let best = 0;
  for (const [lv, n] of Object.entries(table)) {
    if (Number(level) >= Number(lv)) best = Math.max(best, Number(n));
  }
  return best || null;
}

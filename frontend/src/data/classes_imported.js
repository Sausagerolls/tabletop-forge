// GENERATED — do not edit by hand.
//
// Written by class-data/import_5etools_classes.py from a self-hosted 5eTools
// mirror. Re-run that script to refresh.
//
// These are MERGED with the hand-curated catalogues, which win on any name
// they already define:
//   * IMPORTED_SUBCLASSES        merges into BASE_SUBCLASSES (utils/classes.js)
//   * IMPORTED_SUBCLASS_FEATURES merges into SUBCLASS_FEATURES (data/subclasses.js)
//   * IMPORTED_CLASS_FEATURES    backs CLASS_FEATURES (data/subclasses.js) for
//                                any class the hand-written catalogue omits
//   * IMPORTED_CLASS_KITS        supplies the starting proficiencies a class
//                                grants, as an `adds` block the sheet applies
//
// A feature carrying `abilities: [{ ability, bonus }]` raises that stat on
// the sheet. Only features that do so automatically, with no choice for the
// player, are marked — see AUTO_ABILITY_GRANTS in the importer for why the
// list is short and hand-checked rather than parsed out of the rules text.

export const IMPORTED_SUBCLASSES = {
  "Artificer": [
    "Alchemist",
    "Armorer",
    "Artillerist",
    "Battle Smith",
    "Cartographer",
    "Reanimator"
  ],
  "Barbarian": [
    "Path of the Ancestral Guardian",
    "Path of the Battlerager",
    "Path of the Beast",
    "Path of the Berserker",
    "Path of the Giant",
    "Path of the Storm Herald",
    "Path of the Totem Warrior",
    "Path of the Wild Heart",
    "Path of the World Tree",
    "Path of the Zealot",
    "Path of Wild Magic"
  ],
  "Bard": [
    "College of Creation",
    "College of Dance",
    "College of Eloquence",
    "College of Glamour",
    "College of Lore",
    "College of Spirits",
    "College of Swords",
    "College of the Moon",
    "College of Valor",
    "College of Whispers"
  ],
  "Cleric": [
    "Ambition Domain (PSA)",
    "Arcana Domain",
    "Death Domain",
    "Forge Domain",
    "Grave Domain",
    "Knowledge Domain",
    "Knowledge Domain (PSA)",
    "Life Domain",
    "Light Domain",
    "Nature Domain",
    "Order Domain",
    "Peace Domain",
    "Solidarity Domain (PSA)",
    "Strength Domain (PSA)",
    "Tempest Domain",
    "Trickery Domain",
    "Twilight Domain",
    "War Domain",
    "Zeal Domain (PSA)"
  ],
  "Druid": [
    "Circle of Dreams",
    "Circle of Spores",
    "Circle of Stars",
    "Circle of the Land",
    "Circle of the Moon",
    "Circle of the Sea",
    "Circle of the Shepherd",
    "Circle of the Stars",
    "Circle of Wildfire"
  ],
  "Fighter": [
    "Arcane Archer",
    "Banneret",
    "Battle Master",
    "Cavalier",
    "Champion",
    "Echo Knight",
    "Eldritch Knight",
    "Psi Warrior",
    "Purple Dragon Knight (Banneret)",
    "Rune Knight",
    "Samurai"
  ],
  "Monk": [
    "Warrior of Mercy",
    "Warrior of Shadow",
    "Warrior of the Elements",
    "Warrior of the Mystic Arts",
    "Warrior of the Open Hand",
    "Way of Mercy",
    "Way of Shadow",
    "Way of the Ascendant Dragon",
    "Way of the Astral Self",
    "Way of the Drunken Master",
    "Way of the Four Elements",
    "Way of the Kensei",
    "Way of the Long Death",
    "Way of the Open Hand",
    "Way of the Sun Soul"
  ],
  "Paladin": [
    "Oath of Conquest",
    "Oath of Devotion",
    "Oath of Glory",
    "Oath of Redemption",
    "Oath of the Ancients",
    "Oath of the Crown",
    "Oath of the Noble Genies",
    "Oath of the Watchers",
    "Oath of Vengeance",
    "Oathbreaker"
  ],
  "Ranger": [
    "Beast Master",
    "Drakewarden",
    "Fey Wanderer",
    "Gloom Stalker",
    "Hollow Warden",
    "Horizon Walker",
    "Hunter",
    "Monster Slayer",
    "Swarmkeeper",
    "Winter Walker"
  ],
  "Rogue": [
    "Arcane Trickster",
    "Assassin",
    "Inquisitive",
    "Mastermind",
    "Phantom",
    "Scion of the Three",
    "Scout",
    "Soulknife",
    "Swashbuckler",
    "Thief"
  ],
  "Sorcerer": [
    "Aberrant Mind",
    "Aberrant Sorcery",
    "Clockwork Sorcery",
    "Clockwork Soul",
    "Divine Soul",
    "Draconic Bloodline",
    "Draconic Sorcery",
    "Lunar Sorcery",
    "Pyromancer (PSK)",
    "Shadow Magic",
    "Shadow Sorcery",
    "Spellfire Sorcery",
    "Storm Sorcery",
    "Wild Magic",
    "Wild Magic Sorcery"
  ],
  "Warlock": [
    "Archfey Patron",
    "Celestial Patron",
    "Fiend Patron",
    "Great Old One Patron",
    "The Archfey",
    "The Celestial",
    "The Fathomless",
    "The Fiend",
    "The Genie",
    "The Great Old One",
    "The Hexblade",
    "The Undead",
    "The Undying",
    "Undead Patron",
    "Vestige Patron"
  ],
  "Wizard": [
    "Abjurer",
    "Bladesinger",
    "Bladesinging",
    "Chronurgy Magic",
    "Conjurer",
    "Diviner",
    "Enchanter",
    "Evoker",
    "Graviturgy Magic",
    "Illusionist",
    "Necromancer",
    "Order of Scribes",
    "School of Abjuration",
    "School of Conjuration",
    "School of Divination",
    "School of Enchantment",
    "School of Evocation",
    "School of Illusion",
    "School of Necromancy",
    "School of Transmutation",
    "Transmuter",
    "War Magic"
  ]
};

export const IMPORTED_SUBCLASS_FEATURES = {
  "Artificer": {
    "Alchemist": {
      "features": [
        {
          "level": 3,
          "name": "Alchemist",
          "desc": "Craft Magic Elixirs and Potions\nAn Alchemist is an expert at combining reagents to produce magical effects. Alchemists use their creations to give life and to leech it away."
        },
        {
          "level": 3,
          "name": "Alchemist",
          "desc": "An Alchemist is an expert at combining reagents to produce mystical effects. Alchemists use their creations to give life and to leech it away. Alchemy is the oldest of artificer traditions, and its versatility has long been valued during times of war and peace."
        },
        {
          "level": 3,
          "name": "Alchemist Spells",
          "desc": "When you reach an Artificer level specified in the Alchemist Spells table, you thereafter always have the listed spells prepared.\nArtificer Level | Spells\n3 \u2014 Healing Word, Ray Of Sickness\n5 \u2014 Flaming Sphere, Melf'S Acid Arrow\n9 \u2014 Gaseous Form, Mass Healing Word\n13 \u2014 Death Ward, Vitriolic Sphere\n17 \u2014 Cloudkill, Raise Dead"
        },
        {
          "level": 3,
          "name": "Alchemist Spells",
          "desc": "Starting at 3rd level, you always have certain spells prepared after you reach particular levels in this class, as shown in the Alchemist Spells table. These spells count as artificer spells for you, but they don't count against the number of artificer spells you prepare.\nArtificer Level | Spell\n3rd \u2014 Healing Word, Ray Of Sickness\n5th \u2014 Flaming Sphere, Melf'S Acid Arrow\n9th \u2014 Gaseous Form, Mass Healing Word\n13th \u2014 Blight, Death Ward\n17th \u2014 Cloudkill, Raise Dead"
        },
        {
          "level": 3,
          "name": "Experimental Elixir",
          "desc": "Whenever you finish a Long Rest while holding Alchemist's Supplies, you can use that tool to magically produce two elixirs. For each elixir, roll on the Experimental Elixir table for the elixir's effect, which is triggered when someone drinks the elixir. The elixir appears in a vial, and the vial vanishes when the elixir is drunk or poured out. If any elixir remains when you finish a Long Rest, the elixir and its vial vanish.\nDrinking an Elixir: As a Bonus Action, a creature can drink the elixir or administer it to another creature within 5 feet of itself.\nCreating Additional Elixirs: As a Magic action while holding Alchemist's Supplies, you can expend one spell slot to create another elixir. When you do so, you choose its effect from the Experimental Elixir table rather than rolling. When you reach certain Artificer levels, you can make an additional elixir at the end of each Long Rest: a total of three at level 5, four at level 9, and five at level 15.\n1d6 | Effect\n1 \u2014 Healing. The drinker regains a number of Hit Points equal to 2d8 plus your Intelligence modifier. The number of Hit Points restored increases by 1d8 when you reach Artificer levels 9 (3d8) and 15 (4d8).\n2 \u2014 Swiftness. The drinker's Speed increases by 10 feet for 1 hour. This bonus increases when you reach Artificer levels 9 (15 feet) and 15 (20 feet).\n3 \u2014 Resilience. The drinker gains a +1 bonus to AC for 10 minutes. The duration increases when you reach Artificer levels 9 (1 hour) and 15 (8 hours).\n4 \u2014 Boldness. The drinker can roll 1d4 and add the number rolled to every attack roll and saving throw they make for the next minute. The duration increases when you reach Artificer levels 9 (10 minutes) and 15 (1 hour).\n5 \u2014 Flight. The drinker gains a Fly Speed of 10 feet for 10 minutes. The Fly Speed increases when you reach Artificer levels 9 (20 feet) and 15 (30 feet).\n6 \u2014 You determine the elixir's effect by choosing one of the other rows in this table."
        },
        {
          "level": 3,
          "name": "Experimental Elixir",
          "desc": "Beginning at 3rd level, whenever you finish a long rest, you can magically produce an experimental elixir in an empty flask you touch. Roll on the Experimental Elixir table for the elixir's effect, which is triggered when someone drinks the elixir. As an action, a creature can drink the elixir or administer it to an incapacitated creature.\nCreating an experimental elixir requires you to have alchemist's supplies on your person, and any elixir you create with this feature lasts until it is drunk or until the end of your next long rest.\nWhen you reach certain levels in this class, you can make more elixirs at the end of a long rest: two at 6th level and three at 15th level. Roll for each elixir's effect separately. Each elixir requires its own flask.\nYou can create additional experimental elixirs by expending a spell slot of 1st level or higher for each one. When you do so, you use your action to create the elixir in an empty flask you touch, and you choose the elixir's effect from the Experimental Elixir table.\nd6 | Effect\n1 \u2014 Healing. The drinker regains a number of hit points equal to 2d4 + your Intelligence modifier.\n2 \u2014 Swiftness. The drinker's walking speed increases by 10 feet for 1 hour.\n3 \u2014 Resilience. The drinker gains a +1 bonus to AC for 10 minutes.\n4 \u2014 Boldness. The drinker can roll a d4 and add the number rolled to every attack roll and saving throw they make for the next minute.\n5 \u2014 Flight. The drinker gains a flying speed of 10 feet for 10 minutes.\n6 \u2014 Transformation. The drinker's body is transformed as if by the Alter Self spell. The drinker determines the transformation caused by the spell, the effects of which last for 10 minutes."
        },
        {
          "level": 3,
          "name": "Tool Proficiency",
          "desc": "When you adopt this specialization at 3rd level, you gain proficiency with alchemist's supplies. If you already have this proficiency, you gain proficiency with one other type of artisan's tools of your choice."
        },
        {
          "level": 3,
          "name": "Tools of the Trade",
          "desc": "You gain the following benefits.\nTool Proficiency: You gain proficiency with Alchemist's Supplies and the Herbalism Kit. If you already have one of these proficiencies, you gain proficiency with one other type of Artisan's Tools of your choice (or with two other types if you have both).\nPotion Crafting: When you brew a potion using the crafting rules in the Dungeon Master's Guide, the amount of time required to craft it is halved."
        },
        {
          "level": 5,
          "name": "Alchemical Savant",
          "desc": "Whenever you cast a spell using your Alchemist's Supplies as the Spellcasting Focus, you gain a bonus to one roll of the spell. That roll must restore Hit Points or be a damage roll that deals Acid, Fire, or Poison damage. The bonus equals your Intelligence modifier (minimum bonus of +1)."
        },
        {
          "level": 5,
          "name": "Alchemical Savant",
          "desc": "At 5th level, you develop masterful command of magical chemicals, enhancing the healing and damage you create through them. Whenever you cast a spell using your alchemist's supplies as the spellcasting focus, you gain a bonus to one roll of the spell. That roll must restore hit points or be a damage roll that deals acid, fire, necrotic, or poison damage, and the bonus equals your Intelligence modifier (minimum of +1)."
        },
        {
          "level": 9,
          "name": "Restorative Reagents",
          "desc": "You can cast Lesser Restoration without expending a spell slot and without preparing the spell, provided you use Alchemist's Supplies as the Spellcasting Focus. You can do so a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 9,
          "name": "Restorative Reagents",
          "desc": "Starting at 9th level, you can incorporate restorative reagents into some of your works:\n\u2022 Whenever a creature drinks an experimental elixir you created, the creature gains temporary hit points equal to 2d6 + your Intelligence modifier (minimum of 1 temporary hit point).\n\u2022 You can cast Lesser Restoration without expending a spell slot and without preparing the spell, provided you use alchemist's supplies as the spellcasting focus. You can do so a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 15,
          "name": "Chemical Mastery",
          "desc": "You gain the following benefits.\nAlchemical Eruption: When you cast an Artificer spell that deals Acid, Fire, or Poison damage to a target, you can also deal 2d8 Force damage to that target. You can use this benefit only once on each of your turns.\nChemical Resistance: You gain Resistance to Acid damage and Poison damage. You also gain Immunity to the Poisoned condition.\nConjured Cauldron: You can cast Tasha'S Bubbling Cauldron without expending a spell slot, without preparing the spell, and without Material components, provided you use Alchemist's Supplies as the Spellcasting Focus. Once you use this feature, you can't use it again until you finish a Long Rest."
        },
        {
          "level": 15,
          "name": "Chemical Mastery",
          "desc": "By 15th level, you have been exposed to so many chemicals that they pose little risk to you, and you can use them to quickly end certain ailments:\n\u2022 You gain resistance to acid damage and poison damage, and you are immune to the poisoned condition.\n\u2022 You can cast Greater Restoration and Heal without expending a spell slot, without preparing the spell, and without material components, provided you use alchemist's supplies as the spellcasting focus. Once you cast either spell with this feature, you can't cast that spell with it again until you finish a long rest."
        }
      ]
    },
    "Armorer": {
      "features": [
        {
          "level": 3,
          "name": "Arcane Armor",
          "desc": "As a Magic action while you have Smith's Tools in hand, you can turn a suit of armor you are wearing into Arcane Armor. The armor continues to be Arcane Armor until you don another suit of armor or you die.\nYou gain the following benefits while wearing your Arcane Armor.\nNo Strength Requirement: If the armor normally has a Strength requirement, the Arcane Armor lacks this requirement for you.\nQuick Don and Doff: You can don or doff the armor as a Utilize action. The armor can't be removed against your will.\nSpellcasting Focus: You can use the Arcane Armor as a Spellcasting Focus for your Artificer spells."
        },
        {
          "level": 3,
          "name": "Arcane Armor",
          "desc": "3rd-level Armorer feature\nYour metallurgical pursuits have led to you making armor a conduit for your magic. As an action, you can turn a suit of armor you are wearing into Arcane Armor, provided you have smith's tools in hand.\nYou gain the following benefits while wearing this armor:\n\u2022 If the armor normally has a Strength requirement, the arcane armor lacks this requirement for you.\n\u2022 You can use the arcane armor as a spellcasting focus for your artificer spells.\n\u2022 The armor attaches to you and can't be removed against your will. It also expands to cover your entire body, although you can retract or deploy the helmet as a bonus action. The armor replaces any missing limbs, functioning identically to a limb it replaces.\n\u2022 You can doff or don the armor as an action. The armor continues to be Arcane Armor until you don another suit of armor or you die."
        },
        {
          "level": 3,
          "name": "Armor Model",
          "desc": "You can customize your Arcane Armor. When you do so, choose one of the following armor models: Dreadnaught, Guardian, or Infiltrator. The model you choose gives you special benefits while you wear it.\nEach model includes a special weapon. When you attack with that weapon, you can add your Intelligence modifier, instead of your Strength or Dexterity modifier, to the attack and damage rolls.\nYou can change the armor's model whenever you finish a Short or Long Rest if you have Smith's Tools in hand."
        },
        {
          "level": 3,
          "name": "Armor Model",
          "desc": "3rd-level Armorer feature\nYou can customize your Arcane Armor. When you do so, choose one of the following armor models: Guardian or Infiltrator. The model you choose gives you special benefits while you wear it.\nEach model includes a special weapon. When you attack with that weapon, you can add your Intelligence modifier, instead of Strength or Dexterity, to the attack and damage rolls.\nYou can change the armor's model whenever you finish a short or long rest, provided you have smith's tools in hand.\nGuardian: You design your armor to be in the front line of conflict. It has the following features:\nInfiltrator: You customize your armor for subtle undertakings. It has the following features:"
        },
        {
          "level": 3,
          "name": "Armorer",
          "desc": "Craft Magic Armor to Enhance Your Abilities\nAn Armorer modifies armor to function almost like a second skin. The armor is enhanced to hone the Armorer's magic, unleash potent attacks, and generate a formidable defense."
        },
        {
          "level": 3,
          "name": "Armorer",
          "desc": "An artificer who specializes as an Armorer modifies armor to function almost like a second skin. The armor is enhanced to hone the artificer's magic, unleash potent attacks, and generate a formidable defense. The artificer bonds with this armor, becoming one with it even as they experiment with it and refine its magical capabilities."
        },
        {
          "level": 3,
          "name": "Armorer Spells",
          "desc": "When you reach an Artificer level specified in the Armorer Spells table, you thereafter always have the listed spells prepared.\nArtificer Level | Spells\n3 \u2014 Magic Missile, Thunderwave\n5 \u2014 Mirror Image, Shatter\n9 \u2014 Hypnotic Pattern, Lightning Bolt\n13 \u2014 Fire Shield, Greater Invisibility\n17 \u2014 Passwall, Wall Of Force"
        },
        {
          "level": 3,
          "name": "Armorer Spells",
          "desc": "3rd-level Armorer feature\nYou always have certain spells prepared after you reach particular levels in this class, as shown in the Armorer Spells table. These spells count as artificer spells for you, but they don't count against the number of artificer spells you prepare.\nArtificer Level | Spell\n3rd \u2014 Magic Missile, Thunderwave\n5th \u2014 Mirror Image, Shatter\n9th \u2014 Hypnotic Pattern, Lightning Bolt\n13th \u2014 Fire Shield, Greater Invisibility\n17th \u2014 Passwall, Wall Of Force"
        },
        {
          "level": 3,
          "name": "Dampening Field",
          "desc": "You have advantage on Dexterity (Stealth) checks. If the armor normally imposes disadvantage on such checks, the advantage and disadvantage cancel each other, as normal."
        },
        {
          "level": 3,
          "name": "Defensive Field",
          "desc": "As a bonus action, you can gain temporary hit points equal to your level in this class, replacing any temporary hit points you already have. You lose these temporary hit points if you doff the armor. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 3,
          "name": "Dreadnaught",
          "desc": "You design your armor to become a towering juggernaut in battle. It has the following features:\n\u2022 Force Demolisher: An arcane wrecking ball or sledgehammer projects from your armor. The demolisher counts as a Simple Melee weapon with the Reach property, and it deals 1d10 Force damage on a hit. If you hit a creature that is at least one size smaller than you with the demolisher, you can push the creature up to 10 feet straight away from yourself or pull the creature up to 10 feet toward yourself.\n\u2022 Giant Stature: As a Bonus Action, you transform and enlarge your armor for 1 minute. For the duration, your reach increases by 5 feet, and if you are smaller than Large, you become Large, along with anything you are wearing. If there isn't enough room for you to increase your size, your size doesn't change. You can use this Bonus Action a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 3,
          "name": "Guardian",
          "desc": "You design your armor to be in the front line of conflict. It has the following features:\nThunder Pulse: You can discharge concussive blasts with strikes from your armor. The pulse counts as a Simple Melee weapon and deals 1d8 Thunder damage on a hit. A creature hit by the pulse has Disadvantage on attack rolls against targets other than you until the start of your next turn.\nDefensive Field: While Bloodied, you can take a Bonus Action to gain Temporary Hit Points equal to your Artificer level. You lose these Temporary Hit Points if you doff the armor."
        },
        {
          "level": 3,
          "name": "Infiltrator",
          "desc": "You customize your armor for subtler undertakings. It has the following features:\n\u2022 Lightning Launcher: A gemlike node appears on your armor, from which you can shoot bolts of lightning. The launcher counts as a Simple Ranged weapon with a normal range of 90 feet and a long range of 300 feet, and it deals 1d6 Lightning damage on a hit. Once on each of your turns when you hit a creature with the launcher, you can deal an extra 1d6 Lightning damage to that target.\n\u2022 Powered Steps: Your Speed increases by 5 feet.\n\u2022 Dampening Field: You have Advantage on Dexterity (Stealth) checks. If the armor imposes Disadvantage on such checks, the Advantage and Disadvantage cancel each other, as normal."
        },
        {
          "level": 3,
          "name": "Lightning Launcher",
          "desc": "A gemlike node appears on one of your armored fists or on the chest (your choice). It counts as a simple ranged weapon, with a normal range of 90 feet and a long range of 300 feet, and it deals 1d6 lightning damage on a hit. Once on each of your turns when you hit a creature with it, you can deal an extra 1d6 lightning damage to that target."
        },
        {
          "level": 3,
          "name": "Powered Steps",
          "desc": "Your walking speed increases by 5 feet."
        },
        {
          "level": 3,
          "name": "Thunder Gauntlets",
          "desc": "Each of the armor's gauntlets counts as a simple melee weapon while you aren't holding anything in it, and it deals 1d8 thunder damage on a hit. A creature hit by the gauntlet has disadvantage on attack rolls against targets other than you until the start of your next turn, as the armor magically emits a distracting pulse when the creature attacks someone else."
        },
        {
          "level": 3,
          "name": "Tools of the Trade",
          "desc": "You gain the following benefits.\nArmor Training: You gain training with Heavy armor.\nTool Proficiency: You gain proficiency with Smith's Tools. If you already have this tool proficiency, you gain proficiency with one other type of Artisan's Tools of your choice.\nArmor Crafting: When you craft nonmagical or magic armor, the amount of time required to craft it is halved."
        },
        {
          "level": 3,
          "name": "Tools of the Trade",
          "desc": "3rd-level Armorer feature\nYou gain proficiency with heavy armor. You also gain proficiency with smith's tools. If you already have this tool proficiency, you gain proficiency with one other type of artisan's tools of your choice."
        },
        {
          "level": 5,
          "name": "Extra Attack",
          "desc": "You can attack twice instead of once whenever you take the Attack action on your turn."
        },
        {
          "level": 5,
          "name": "Extra Attack",
          "desc": "5th-level Armorer feature\nYou can attack twice, rather than once, whenever you take the Attack action on your turn."
        },
        {
          "level": 9,
          "name": "Armor Modifications",
          "desc": "9th-level Armorer feature\nYou learn how to use your artificer infusions to specially modify your Arcane Armor. That armor now counts as separate items for the purposes of your Infuse Items feature: armor (the chest piece), boots, helmet, and the armor's special weapon. Each of those items can bear one of your infusions, and the infusions transfer over if you change your armor's model with the Armor Model feature. In addition, the maximum number of items you can infuse at once increases by 2, but those extra items must be part of your Arcane Armor."
        },
        {
          "level": 9,
          "name": "Improved Armorer",
          "desc": "You gain the following benefits.\nArmor Replication: You learn an additional plan for your Replicate Magic Item feature, and it must be in the Armor category. If you replace that plan, you must replace it with another Armor plan. In addition, you can create an additional item with that feature, and the item must also be in the Armor category.\nImproved Arsenal: You gain a +1 bonus to attack and damage rolls made with the special weapon of your Arcane Armor model."
        },
        {
          "level": 15,
          "name": "Guardian",
          "desc": "When a Huge or smaller creature you can see ends its turn within 30 feet of you, you can use your reaction to magically force it to make a Strength saving throw against your spell save DC. On a failed save, you pull the creature up to 25 feet directly to an unoccupied space. If you pull the target to a space within 5 feet of you, you can make a melee weapon attack against it as part of this reaction.\nYou can use this reaction a number of times equal to your proficiency bonus, and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 15,
          "name": "Infiltrator",
          "desc": "Any creature that takes lightning damage from your Lightning Launcher glimmers with magical light until the start of your next turn. The glimmering creature sheds dim light in a 5-foot radius, and it has disadvantage on attack rolls against you, as the light jolts it if it attacks you. In addition, the next attack roll against it has advantage, and if that attack hits, the target takes an extra 1d6 lightning damage."
        },
        {
          "level": 15,
          "name": "Perfected Armor",
          "desc": "Your Arcane Armor gains additional benefits based on its model, as detailed below.\nDreadnaught: The damage die of your Force Demolisher increases to 2d6 Force damage. In addition, when you use your Giant Stature, your reach increases by 10 feet, your size can increase to Large or Huge (your choice), and you have Advantage on Strength checks and Strength saving throws for the duration.\nGuardian: The damage die of your Thunder Pulse increases to 1d10 Thunder damage. In addition, when a Huge or smaller creature you can see ends its turn within 30 feet of you, you can take a Reaction to magically force that creature to make a Strength saving throw against your spell save DC. On a failed save, you pull the creature up to 25 feet directly toward you to an unoccupied space. If you pull the target to a space within 5 feet of yourself, you can make a melee weapon attack against it as part of this Reaction. You can take this Reaction a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nInfiltrator: The damage die of your Lightning Launcher increases to 2d6 Lightning damage. Any creature that takes Lightning damage from your Lightning Launcher glimmers with magical light until the start of your next turn. The glimmering creature sheds Dim Light in a 5-foot radius, and it has Disadvantage on attack rolls against you, as the light jolts it if it attacks you. Additionally, as a Bonus Action, you can gain a Fly Speed equal to twice your Speed until the end of the current turn. You can take this Bonus Action a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 15,
          "name": "Perfected Armor",
          "desc": "15th-level Armorer feature\nYour Arcane Armor gains additional benefits based on its model, as shown below."
        }
      ]
    },
    "Artillerist": {
      "features": [
        {
          "level": 3,
          "name": "Artillerist",
          "desc": "Wield Destructive Power from Afar\nAn Artillerist specializes in using magic to hurl energy, projectiles, and explosions on a battlefield."
        },
        {
          "level": 3,
          "name": "Artillerist",
          "desc": "An Artillerist specializes in using magic to hurl energy, projectiles, and explosions on a battlefield. This destructive power was valued by all the armies of the Last War. Now that the war is over, some members of this specialization have sought to build a more peaceful world by using their powers to fight the resurgence of strife in Khorvaire.\nThe gnome artificer Vi, an unlikely yet key member of House Cannith's warforged project, has been especially vocal about making things right: \"It's about time we fixed things instead of blowing them all to hell.\""
        },
        {
          "level": 3,
          "name": "Artillerist Spells",
          "desc": "When you reach an Artificer level specified in the Artillerist Spells table, you thereafter always have the listed spells prepared.\nArtificer Level | Spells\n3 \u2014 Shield, Thunderwave\n5 \u2014 Scorching Ray, Shatter\n9 \u2014 Fireball, Wind Wall\n13 \u2014 Ice Storm, Wall Of Fire\n17 \u2014 Cone Of Cold, Wall Of Force"
        },
        {
          "level": 3,
          "name": "Artillerist Spells",
          "desc": "Starting at 3rd level, you always have certain spells prepared after you reach particular levels in this class, as shown in the Artillerist Spells table. These spells count as artificer spells for you, but they don't count against the number of artificer spells you prepare.\nArtificer Level | Spell\n3rd \u2014 Shield, Thunderwave\n5th \u2014 Scorching Ray, Shatter\n9th \u2014 Fireball, Wind Wall\n13th \u2014 Ice Storm, Wall Of Fire\n17th \u2014 Cone Of Cold, Wall Of Force"
        },
        {
          "level": 3,
          "name": "Eldritch Cannon",
          "desc": "Using Smith's Tools or Woodcarver's Tools, you can take a Magic action to create a Small or Tiny Eldritch Cannon in an unoccupied space on a horizontal surface within 5 feet of yourself. You determine its appearance, including whether you carry it or not (and your choice of legs or wheels, for the latter). It disappears if it is reduced to 0 Hit Points or after 1 hour. You can dismiss it early as a Magic action.\nOnce you create a cannon, you can't do so again until you finish a Long Rest or expend a spell slot to create one. You can have only one cannon at a time and can't create one while you already have one."
        },
        {
          "level": 3,
          "name": "Eldritch Cannon",
          "desc": "At 3rd level, you learn how to create a magical cannon. Using woodcarver's tools or smith's tools, you can take an action to magically create a Small or Tiny eldritch cannon in an unoccupied space on a horizontal surface within 5 feet of you. A Small eldritch cannon occupies its space, and a Tiny one can be held in one hand.\nOnce you create a cannon, you can't do so again until you finish a long rest or until you expend a spell slot of 1st level or higher. You can have only one cannon at a time and can't create one while your cannon is present.\nThe cannon is a magical object. Regardless of size, the cannon has an AC of 18 and a number of hit points equal to five times your artificer level. It is immune to poison damage and psychic damage, and all conditions. If it is forced to make an ability check or a saving throw, treat all its ability scores as 10 (+0). If the Mending spell is cast on it, it regains 2d6 hit points. It disappears if it is reduced to 0 hit points or after 1 hour. You can dismiss it early as an action.\nWhen you create the cannon, you determine its appearance and whether it has legs. You also decide which type it is, choosing from the options on the Eldritch Cannons table. On each of your turns, you can take a bonus action to cause the cannon to activate if you are within 60 feet of it. As part of the same bonus action, you can direct the cannon to walk or climb up to 15 feet to an unoccupied space, provided it has legs.\nCannon | Activation\nFlamethrower \u2014 The cannon exhales fire in an adjacent 15-foot cone that you designate. Each creature in that area must make a Dexterity saving throw against your spell save DC, taking 2d8 fire damage on a failed save or half as much damage on a successful one. The fire ignites any flammable objects in the area that aren't being worn or carried.\nForce Ballista \u2014 Make a ranged spell attack, originating from the cannon, at one creature or object within 120 feet of it. On a hit, the target takes 2d8 force damage, and if the target is a creature, it is pushed up to 5 feet away from the cannon.\nProtector \u2014 The cannon emits a burst of positive energy that grants itself and each creature of your choice within 10 feet of it a number of temporary hit points equal to 1d8 + your Intelligence modifier (minimum of +1)."
        },
        {
          "level": 3,
          "name": "Tool Proficiency",
          "desc": "When you adopt this specialization at 3rd level, you gain proficiency with woodcarver's tools. If you already have this proficiency, you gain proficiency with one other type of artisan's tools of your choice."
        },
        {
          "level": 3,
          "name": "Tools of the Trade",
          "desc": "You gain the following benefits.\nRanged Weaponry: You gain proficiency with Martial Ranged weapons.\nTool Proficiency: You gain proficiency with Woodcarver's Tools. If you already have this proficiency, you gain proficiency with one other type of Artisan's Tools of your choice.\nWand Crafting: When you craft a magic Wand, the amount of time required to craft it is halved."
        },
        {
          "level": 5,
          "name": "Arcane Firearm",
          "desc": "When you finish a Long Rest, you can use Woodcarver's Tools to carve special sigils into a Rod, Staff, Wand, or Martial Ranged weapon and thereby turn it into your Arcane Firearm. The sigils disappear from the object if you later carve them on a different item. The sigils otherwise last indefinitely.\nYou can use your Arcane Firearm as a Spellcasting Focus for your Artificer spells. When you cast an Artificer spell through the firearm, roll 1d8, and you gain a bonus to one of the spell's damage rolls equal to the number rolled."
        },
        {
          "level": 5,
          "name": "Arcane Firearm",
          "desc": "At 5th level, you know how to turn a wand, staff, or rod into an arcane firearm, a conduit for your destructive spells. When you finish a long rest, you can use woodcarver's tools to carve special sigils into a wand, staff, or rod and thereby turn it into your arcane firearm. The sigils disappear from the object if you later carve them on a different item. The sigils otherwise last indefinitely.\nYou can use your arcane firearm as a spellcasting focus for your artificer spells. When you cast an artificer spell through the firearm, roll a d8, and you gain a bonus to one of the spell's damage rolls equal to the number rolled."
        },
        {
          "level": 9,
          "name": "Explosive Cannon",
          "desc": "Every Eldritch Cannon you create is now more destructive. You gain the following benefits.\nDetonate: When your cannon takes damage, you can take a Reaction to command the cannon to detonate if you are within 60 feet of it. Doing so destroys the cannon and forces each creature within 20 feet of it to make a Dexterity saving throw against your spell save DC, taking 3d10 Force damage on a failed save or half as much damage on a successful one.\nFirepower: The cannon's damage rolls and the number of Temporary Hit Points granted by Protector increase by 1d8."
        },
        {
          "level": 9,
          "name": "Explosive Cannon",
          "desc": "Starting at 9th level, every eldritch cannon you create is more destructive:\n\u2022 The cannon's damage rolls all increase by 1d8.\n\u2022 As an action, you can command the cannon to detonate if you are within 60 feet of it. Doing so destroys the cannon and forces each creature within 20 feet of it to make a Dexterity saving throw against your spell save DC, taking 3d8 force damage on a failed save or half as much damage on a successful one."
        },
        {
          "level": 15,
          "name": "Fortified Position",
          "desc": "You're a master at forming well-defended emplacements using your Eldritch Cannon. You gain the following benefits.\nDouble Firepower: You can now have two cannons at the same time, and you can create two with the same Magic action. (If you expend a spell slot to create the first cannon, you must expend another spell slot to create the second.) You can activate both of them with the same Bonus Action, ordering them to use the same activation option or different ones. You can't create a third cannon while you have two.\nShimmering Field Projection: You and your allies have Half Cover while within 10 feet of your Eldritch Cannon."
        },
        {
          "level": 15,
          "name": "Fortified Position",
          "desc": "Starting at 15th level, you're a master at forming well-defended emplacements using Eldritch Cannon:\n\u2022 You and your allies have Cover while within 10 feet of a cannon you create with Eldritch Cannon, as a result of a shimmering field of magical protection that the cannon emits.\n\u2022 You can now have two cannons at the same time. You can create two with the same action (but not the same spell slot), and you can activate both of them with the same bonus action. You determine whether the cannons are identical to each other or different. You can't create a third cannon while you have two."
        }
      ]
    },
    "Battle Smith": {
      "features": [
        {
          "level": 3,
          "name": "Battle Ready",
          "desc": "Your combat training and your experiments with magic have paid off in two ways.\nArcane Empowerment: When you attack with a magic weapon, you can use your Intelligence modifier, instead of your Strength or Dexterity modifier, for the attack and damage rolls.\nWeapon Knowledge: You gain proficiency with Martial weapons. You can use a weapon with which you have proficiency as a Spellcasting Focus for your Artificer spells."
        },
        {
          "level": 3,
          "name": "Battle Ready",
          "desc": "When you reach 3rd level, your combat training and your experiments with magic have paid off in two ways:\n\u2022 You gain proficiency with martial weapons.\n\u2022 When you attack with a magic weapon, you can use your Intelligence modifier, instead of Strength or Dexterity modifier, for the attack and damage rolls."
        },
        {
          "level": 3,
          "name": "Battle Smith",
          "desc": "Command a Construct Guardian\nA Battle Smith is a combination of protector and medic, an expert at defending others and repairing both materiel and personnel. To aid in their work, Battle Smiths are accompanied by a Steel Defender, a protective companion of their own creation."
        },
        {
          "level": 3,
          "name": "Battle Smith",
          "desc": "Armies require protection, and someone has to put things back together if defenses fail. A combination of protector and medic, a Battle Smith is an expert at defending others and repairing both material and personnel. To aid in their work, Battle Smiths are usually accompanied by a steel defender, a protective companion of their own creation. Many soldiers tell stories of nearly dying before being saved by a Battle Smith and a steel defender.\nBattle Smiths played a key role in House Cannith's work on battle constructs and the original warforged, and after the Last War, these artificers led efforts to aid those who were injured in the war's horrific battles."
        },
        {
          "level": 3,
          "name": "Battle Smith Spells",
          "desc": "When you reach an Artificer level specified in the Battle Smith Spells table, you thereafter always have the listed spells prepared.\nArtificer Level | Spells\n3 \u2014 Heroism, Shield\n5 \u2014 Shining Smite, Warding Bond\n9 \u2014 Aura Of Vitality, Conjure Barrage\n13 \u2014 Aura Of Purity, Fire Shield\n17 \u2014 Banishing Smite, Mass Cure Wounds"
        },
        {
          "level": 3,
          "name": "Battle Smith Spells",
          "desc": "Starting at 3rd level, you always have certain spells prepared after you reach particular levels in this class, as shown in the Battle Smith Spells table. These spells count as artificer spells for you, but they don't count against the number of artificer spells you prepare.\nArtificer Level | Spell\n3rd \u2014 Heroism, Shield\n5th \u2014 Branding Smite, Warding Bond\n9th \u2014 Aura Of Vitality, Conjure Barrage\n13th \u2014 Aura Of Purity, Fire Shield\n17th \u2014 Banishing Smite, Mass Cure Wounds"
        },
        {
          "level": 3,
          "name": "Steel Defender",
          "desc": "Your tinkering has borne you a companion, a Steel Defender. You determine the defender's appearance and whether it has two legs or four; your choices don't affect the defender's game statistics.\nThe defender is Friendly to you and your allies and obeys you. It vanishes if you die.\nThe Defender in Combat: In combat, the defender acts during your turn. It can move and take its Reaction on its own, but the only action it takes is the Dodge action unless you take a Bonus Action to command it to take an action. If you have the Incapacitated condition, the defender acts on its own and isn't limited to the Dodge action.\nRestoring or Replacing the Defender: If the defender has died within the last hour, you can take a Magic action to touch it and expend a spell slot. The defender returns to life after 1 minute with all its Hit Points restored. Whenever you finish a Long Rest, you can create a new defender if you have Smith's Tools in hand. If you already have a defender from this feature, the first one vanishes."
        },
        {
          "level": 3,
          "name": "Steel Defender",
          "desc": "By 3rd level, your tinkering has borne you a faithful companion, a steel defender. It is friendly to you and your companions, and it obeys your commands. See this creature's game statistics in the steel defender stat block, which uses your proficiency bonus (PB) in several places. You determine the creature's appearance and whether it has two legs or four; your choice has no effect on its game statistics.\nIn combat, the defender shares your initiative count, but it takes its turn immediately after yours. It can move and use its reaction on its own, but the only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the defender can take any action of its choice, not just Dodge.\nIf the Mending spell is cast on it, it regains 2d6 hit points. If it has died within the last hour, you can use your smith's tools as an action to revive it, provided you are within 5 feet of it and you expend a spell slot of 1st level or higher. The steel defender returns to life after 1 minute with all its hit points restored.\nAt the end of a long rest, you can create a new steel defender if you have your smith's tools with you. If you already have a steel defender from this feature, the first one immediately perishes. The defender also perishes if you die."
        },
        {
          "level": 3,
          "name": "Tool Proficiency",
          "desc": "When you adopt this specialization at 3rd level, you gain proficiency with smith's tools. If you already have this proficiency, you gain proficiency with one other type of artisan's tools of your choice."
        },
        {
          "level": 3,
          "name": "Tools of the Trade",
          "desc": "You gain the following benefits.\nTool Proficiency: You gain proficiency with Smith's Tools. If you already have this proficiency, you gain proficiency with one other type of Artisan's Tools of your choice.\nWeapon Crafting: When you craft a nonmagical or magic weapon, the amount of time required to craft it is halved."
        },
        {
          "level": 5,
          "name": "Extra Attack",
          "desc": "You can attack twice instead of once whenever you take the Attack action on your turn. You can forgo one of your attacks when you take the Attack action to command your Steel Defender to take the Force-Empowered Rend action."
        },
        {
          "level": 5,
          "name": "Extra Attack",
          "desc": "Starting at 5th level, you can attack twice, rather than once, whenever you take the Attack action on your turn."
        },
        {
          "level": 9,
          "name": "Arcane Jolt",
          "desc": "When either you hit a target with an attack roll using a magic weapon or your Steel Defender hits a target, you can channel magical energy through the strike to create one of the following effects:\n\u2022 Destructive Energy: The target takes an extra 2d6 Force damage.\n\u2022 Restorative Energy: Choose one creature or object you can see within 30 feet of the target. Healing energy flows into the chosen recipient, restoring 2d6 Hit Points to it.\nYou can use this energy a number of times equal to your Intelligence modifier (minimum of once), but you can do so no more than once per turn. You regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 9,
          "name": "Arcane Jolt",
          "desc": "At 9th level, you learn new ways to channel arcane energy to harm or heal. When either you hit a target with a magic weapon attack or your steel defender hits a target, you can channel magical energy through the strike to create one of the following effects:\n\u2022 The target takes an extra 2d6 force damage.\n\u2022 Choose one creature or object you can see within 30 feet of the target. Healing energy flows into the chosen recipient, restoring 2d6 hit points to it.\nYou can use this energy a number of times equal to your Intelligence modifier (minimum of once), but you can do so no more than once on a turn. You regain all expended uses when you finish a long rest."
        },
        {
          "level": 15,
          "name": "Improved Defender",
          "desc": "Your Arcane Jolt and Steel Defender have become more powerful, granting these benefits.\nImproved Jolt: The extra damage and healing of your Arcane Jolt both increase to 4d6.\nImproved Deflection: Whenever your Steel Defender uses its Deflect Attack, the attacker takes Force damage equal to 1d4 plus your Intelligence modifier."
        },
        {
          "level": 15,
          "name": "Improved Defender",
          "desc": "At 15th level, your Arcane Jolt and steel defender become more powerful:\n\u2022 The extra damage and the healing of your Arcane Jolt both increase to 4d6.\n\u2022 Your steel defender gains a +2 bonus to Armor Class.\n\u2022 Whenever your steel defender uses its Deflect Attack, the attacker takes force damage equal to 1d4 + your Intelligence modifier."
        }
      ]
    },
    "Cartographer": {
      "features": [
        {
          "level": 3,
          "name": "Adventurer's Atlas",
          "desc": "Whenever you finish a Long Rest while holding Cartographer's Tools, you can use that tool to create a set of magical maps by touching at least two creatures (one of whom can be yourself), up to a maximum number of creatures equal to 1 plus your Intelligence modifier (minimum of two creatures). Each target receives a magical map, which constantly updates to show the relative position of all the map holders but is illegible to all others. The maps last until you die or until you use this feature again, at which point any existing maps created by this feature immediately vanish.\nWhile carrying the map, a target gains the following benefits.\nAwareness: The target adds 1d4 to its Initiative rolls.\nPositioning: The target knows the location of all other map holders that are on the same plane of existence as itself. When casting a spell or creating another effect that requires being able to see the effect's target, a map holder can target another map holder regardless of sight or cover, so long as the other map holder is still within the effect's range."
        },
        {
          "level": 3,
          "name": "Cartographer",
          "desc": "Chart Advantageous Courses through Turmoil\nCartographers are the premier navigators and reconnaissance agents. Using their creations, Cartographers can highlight threats, safeguard allies, and carve portals to distant locations."
        },
        {
          "level": 3,
          "name": "Cartographer Spells",
          "desc": "When you reach an Artificer level specified in the Cartographer Spells table, you thereafter always have the listed spells prepared.\nArtificer Level | Spells\n3 \u2014 Faerie Fire, Guiding Bolt, Healing Word\n5 \u2014 Locate Object, Mind Spike\n9 \u2014 Call Lightning, Clairvoyance\n13 \u2014 Banishment, Locate Creature\n17 \u2014 Scrying, Teleportation Circle"
        },
        {
          "level": 3,
          "name": "Mapping Magic",
          "desc": "You gain the following benefits.\nIlluminated Cartography: You can cast Faerie Fire without expending a spell slot, outlining the affected creatures as if in ink. You can do so a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nPortal Jump: On your turn, you can spend an amount of movement equal to half your Speed (round down) to teleport to an unoccupied space you can see within 10 feet of yourself or within 5 feet of a creature that is within 30 feet of you and holding one of your Adventurer's Atlas maps. You can't use this benefit if your Speed is 0."
        },
        {
          "level": 3,
          "name": "Tools of the Trade",
          "desc": "You gain the following benefits.\nTool Proficiency: You gain proficiency with Calligrapher's Supplies and Cartographer's Tools. If you already have one of these proficiencies, you gain proficiency with one other type of Artisan's Tools of your choice (or with two other types if you have both).\nScroll Crafting: When you scribe a Spell Scroll using the crafting rules in the Player's Handbook, the amount of time required to craft it is halved."
        },
        {
          "level": 5,
          "name": "Guided Precision",
          "desc": "Once per turn, whenever you cast a spell from your Cartographer Spells list or hit a creature affected by your Faerie Fire with an attack roll, you can add your Intelligence modifier to one damage roll of the spell or attack.\nIn addition, taking damage can't cause you to lose Concentration on Faerie Fire."
        },
        {
          "level": 9,
          "name": "Ingenious Movement",
          "desc": "When you use your Flash of Genius, you or a willing creature of your choice that you can see within 30 feet of yourself can teleport up to 30 feet to an unoccupied space you can see as part of that same Reaction."
        },
        {
          "level": 15,
          "name": "Superior Atlas",
          "desc": "Your Adventurer's Atlas improves, gaining the following benefits.\nSafe Haven: When a map holder would be reduced to 0 Hit Points but not killed outright, that creature can destroy its map. The creature's Hit Points instead change to a number equal to twice your Artificer level, and the creature is teleported to an unoccupied space within 5 feet of you or another map holder of its choice.\nUnerring Path: If you are one of the map holders for your Adventurer's Atlas, you can cast Find The Path without expending a spell slot, without preparing the spell, and without needing spell components. Once you use this benefit, you can't use it again until you finish a Long Rest."
        }
      ]
    },
    "Reanimator": {
      "features": [
        {
          "level": 3,
          "name": "Reanimated Companion",
          "desc": "Using Tinker's Tools or another type of Artisan's Tools with which you have proficiency, you can take a Magic action to create a Reanimated Companion through the power of necromancy and science. The companion manifests in an unoccupied space within 5 feet of you. You determine the companion's appearance; your choices don't affect the companion's game statistics.\nThe companion is Friendly to you and your allies and obeys you. It lasts until you finish a Long Rest or until you take a Magic action to dismiss it early, at which point it harmlessly collapses into a pile of viscera. It immediately drops to 0 Hit Points and dies (triggering its Death Burst trait) if you die.\nOnce you create a companion, you can't do so again until you finish a Long Rest or expend a spell slot to create one. You can have only one companion at a time and can't create one while your companion is present.\nThe Companion in Combat: In combat, the companion acts during your turn. It can move and take its Reaction on its own, but the only action it takes is the Dodge action unless you take a Bonus Action to command it to take an action. If you have the Incapacitated condition, the companion acts on its own and isn't limited to the Dodge action."
        },
        {
          "level": 3,
          "name": "Reanimator",
          "desc": "Reassemble Corpses and Raise the Dead\nReanimators defy the laws of nature in pursuit of gruesome experiments. These grim Artificers stitch together servants from disparate corpses, use foul magic to strengthen the living, and transform the art of necromancy into a terrifying science."
        },
        {
          "level": 3,
          "name": "Reanimator Spells",
          "desc": "When you reach an Artificer level specified in the Reanimator Spells table, you thereafter always have the listed spells prepared.\nArtificer Level | Spells\n3 \u2014 False Life, Spare The Dying, Witch Bolt\n5 \u2014 Blindness/Deafness, Enhance Ability\n9 \u2014 Animate Dead, Lightning Bolt\n13 \u2014 Blight, Death Ward\n17 \u2014 Antilife Shell, Raise Dead"
        },
        {
          "level": 3,
          "name": "Reanimator's Skill Set",
          "desc": "You gain the following benefits.\nJolt to Life: When you cast Spare The Dying, you can modify the spell so that it sends a jolt of electricity through the target, reviving it. The target regains a number of Hit Points equal to your Artificer level, and each creature of your choice in a 10-foot Emanation originating from the target makes a Dexterity saving throw against your spell save DC, taking 2d4 Lightning damage on a failed save or half as much damage on a successful one. You can modify the spell this way a number of times equal to your Intelligence modifier, and you regain all expended uses when you finish a Long Rest. The Lightning damage of this feature increases by 1d4 when you reach Artificer levels 11 (3d4) and 17 (4d4).\nReanimator's Tools: You gain proficiency with Alchemist's Supplies. If you already have this proficiency, you gain proficiency with one other type of Artisan's Tools of your choice."
        },
        {
          "level": 5,
          "name": "Strange Modifications",
          "desc": "Whenever you create a Reanimated Companion, it gains one of the following options of your choice; choose when you create the companion.\nArcane Conduit: You can cast spells as though you were in the companion's space, but you must use your own senses. Once per turn, when you cast an Artificer spell from the Evocation or Necromancy school and deal damage while your companion is within 120 feet of you, you can add your Intelligence modifier to one damage roll of that spell.\nFerocity: The damage die of the companion's Dreadful Swipe increases to 1d6."
        },
        {
          "level": 9,
          "name": "Improved Reanimation",
          "desc": "The damage of your Reanimated Companion's Death Burst increases to 4d4. Necrotic damage dealt by your companion ignores Resistance."
        },
        {
          "level": 9,
          "name": "Macabre Modifications",
          "desc": "You experiment and alter your companion further. Whenever you create a Reanimated Companion, the companion now gains two options for Strange Modifications, instead of one. Additionally, when picking options for Strange Modifications, you can also choose from the following options.\nBloated: The companion becomes Large. Whenever it hits a Large or smaller creature with its Dreadful Swipe action, that creature is pushed up to 10 feet away from the companion. Additionally, you can add your Intelligence modifier to the damage dealt by the companion's Death Burst.\nGaunt: The companion's Speed increases to 45 feet, and it gains a Climb Speed equal to its Speed. It can climb difficult surfaces, including along ceilings, without needing to make an ability check. In addition, whenever a creature of your choice starts its turn within a 10-foot Emanation originating from your companion, the creature must succeed on a Wisdom saving throw against your spell save DC or have the Frightened condition until the start of its next turn.\nMoist: The companion gains a Swim Speed equal to its Speed, and it can move through a space as narrow as 1 inch without expending extra movement to do so. In addition, whenever the companion is hit by an attack roll from a creature within 10 feet of itself, the attacker takes Acid damage equal to your Intelligence modifier."
        },
        {
          "level": 15,
          "name": "Refined Reanimation",
          "desc": "You have mastered the science of revivification, granting you the following benefits.\nFacilitated Revival: You can cast Raise Dead once without expending a spell slot and without Material components, provided you use Tinker's Tools or another type of Artisan's Tools with which you have proficiency as the Spellcasting Focus. Once you use this feature, you can't use it again until you finish a Long Rest.\nLife Transfer: You can siphon the animating magic of your Reanimated Companion to bolster yourself. When you or your companion takes damage, you can take a Reaction to gain a number of Hit Points equal to your companion's current Hit Points. The companion then immediately drops to 0 Hit Points and dies (triggering its Death Burst trait).\nSuperior Modifications: Whenever you create a Reanimated Companion, the companion now gains three options for Strange Modifications."
        }
      ]
    }
  },
  "Barbarian": {
    "Path of Wild Magic": {
      "features": [
        {
          "level": 3,
          "name": "Magic Awareness",
          "desc": "3rd-level Path of Wild Magic feature\nAs an action, you can open your awareness to the presence of concentrated magic. Until the end of your next turn, you know the location of any spell or magic item within 60 feet of you that isn't behind Cover. When you sense a spell, you learn which school of magic it belongs to.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 3,
          "name": "Path of Wild Magic",
          "desc": "Many places in the multiverse abound with beauty, intense emotion, and rampant magic; the Feywild, the Upper Planes, and other realms of supernatural power radiate with such forces and can profoundly influence people. As folk of deep feeling, barbarians are especially susceptible to these wild influences, with some barbarians being transformed by the magic. These magic-suffused barbarians walk the Path of Wild Magic. Elf, tiefling, aasimar, and genasi barbarians often seek this path, eager to manifest the otherworldly magic of their ancestors."
        },
        {
          "level": 3,
          "name": "Wild Surge",
          "desc": "3rd-level Path of Wild Magic feature\nThe magical energy roiling inside you sometimes erupts from you. When you enter your rage, roll on the Wild Magic table to determine the magical effect produced.\nIf the effect requires a saving throw, the DC equals 8 + your proficiency bonus + your Constitution modifier.\nd8 | Magical Effect\n1 \u2014 Shadowy tendrils lash around you. Each creature of your choice that you can see within 30 feet of you must succeed on a Constitution saving throw or take 1d12 necrotic damage. You also gain 1d12 temporary hit points.\n2 \u2014 You teleport up to 30 feet to an unoccupied space you can see. Until your rage ends, you can use this effect again on each of your turns as a bonus action.\n3 \u2014 An intangible spirit, which looks like a flumph or a pixie (your choice), appears within 5 feet of one creature of your choice that you can see within 30 feet of you. At the end of the current turn, the spirit explodes, and each creature within 5 feet of it must succeed on a Dexterity saving throw or take 1d6 force damage. Until your rage ends, you can use this effect again, summoning another spirit, on each of your turns as a bonus action.\n4 \u2014 Magic infuses one weapon of your choice that you are holding. Until your rage ends, the weapon's damage type changes to force, and it gains the light and thrown properties, with a normal range of 20 feet and a long range of 60 feet. If the weapon leaves your hand, the weapon reappears in your hand at the end of the current turn.\n5 \u2014 Whenever a creature hits you with an attack roll before your rage ends, that creature takes 1d6 force damage, as magic lashes out in retribution.\n6 \u2014 Until your rage ends, you are surrounded by multi colored, protective lights; you gain a +1 bonus to AC, and while within 10 feet of you, your allies gain the same bonus.\n7 \u2014 Flowers and vines temporarily grow around you. Until your rage ends, the ground within 15 feet of you is difficult terrain for your enemies.\n8 \u2014 A bolt of light shoots from your chest. Another creature of your choice that you can see within 30 feet of you must succeed on a Constitution saving throw or take 1d6 radiant damage and be blinded until the start of your next turn. Until your rage ends, you can use this effect again on each of your turns as a bonus action."
        },
        {
          "level": 6,
          "name": "Bolstering Magic",
          "desc": "6th-level Path of Wild Magic feature\nYou can harness your wild magic to bolster yourself or a companion. As an action, you can touch one creature (which can be yourself) and confer one of the following benefits of your choice to that creature:\n\u2022 For 10 minutes, the creature can roll a d3 whenever making an attack roll or an ability check and add the number rolled to the d20 roll.\n\u2022 Roll a d3. The creature regains one expended spell slot, the level of which equals the number rolled or lower (the creature's choice). Once a creature receives this benefit, that creature can't receive it again until after a long rest.\nYou can take this action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 10,
          "name": "Unstable Backlash",
          "desc": "10th-level Path of Wild Magic feature\nWhen you are imperiled during your rage, the magic within you can lash out; immediately after you take damage or fail a saving throw while raging, you can use your reaction to roll on the Wild Magic table and immediately produce the effect rolled. This effect replaces your current Wild Magic effect."
        },
        {
          "level": 14,
          "name": "Controlled Surge",
          "desc": "14th-level Path of Wild Magic feature\nWhenever you roll on the Wild Magic table, you can roll the die twice and choose which of the two effects to unleash. If you roll the same number on both dice, you can ignore the number and choose any effect on the table."
        }
      ]
    },
    "Path of the Ancestral Guardian": {
      "features": [
        {
          "level": 3,
          "name": "Ancestral Protectors",
          "desc": "Starting when you choose this path at 3rd level, spectral warriors appear when you enter your rage. While you're raging, the first creature you hit with an attack on your turn becomes the target of the warriors, which hinder its attacks. Until the start of your next turn, that target has disadvantage on any attack roll that isn't against you, and when the target hits a creature other than you with an attack, that creature has resistance to the damage dealt by the attack. The effect on the target ends early if your rage ends."
        },
        {
          "level": 3,
          "name": "Path of the Ancestral Guardian",
          "desc": "Some barbarians hail from cultures that revere their ancestors. These tribes teach that the warriors of the past linger in the world as mighty spirits, who can guide and protect the living. When a barbarian who follows this path rages, the barbarian contacts the spirit world and calls on these guardian spirits for aid.\nBarbarians who draw on their ancestral guardians can better fight to protect their tribes and their allies. In order to cement ties to their ancestral guardians, barbarians who follow this path cover themselves in elaborate tattoos that celebrate their ancestors' deeds. These tattoos tell sagas of victories against terrible monsters and other fearsome rivals."
        },
        {
          "level": 6,
          "name": "Spirit Shield",
          "desc": "Beginning at 6th level, the guardian spirits that aid you can provide supernatural protection to those you defend. If you are raging and another creature you can see within 30 feet of you takes damage, you can use your reaction to reduce that damage by 2d6.\nWhen you reach certain levels in this class, you can reduce the damage by more: by 3d6 at 10th level and by 4d6 at 14th level."
        },
        {
          "level": 10,
          "name": "Consult the Spirits",
          "desc": "At 10th level, you gain the ability to consult with your ancestral spirits. When you do so, you cast the Augury or Clairvoyance spell, without using a spell slot or material components. Rather than creating a spherical sensor, this use of Clairvoyance invisibly summons one of your ancestral spirits to the chosen location. Wisdom is your spellcasting ability for these spells.\nAfter you cast either spell in this way, you can't use this feature again until you finish a short or long rest."
        },
        {
          "level": 14,
          "name": "Vengeful Ancestors",
          "desc": "At 14th level, your ancestral spirits grow powerful enough to retaliate. When you use your Spirit Shield to reduce the damage of an attack, the attacker takes an amount of force damage equal to the damage that your Spirit Shield prevents."
        }
      ]
    },
    "Path of the Battlerager": {
      "features": [
        {
          "level": 3,
          "name": "Battlerager Armor",
          "desc": "When you choose this path at 3rd level, you gain the ability to use spiked armor as a weapon.\nWhile you are wearing spiked armor and are raging, you can use a bonus action to make one melee weapon attack with your armor spikes at a target within 5 feet of you. If the attack hits, the spikes deal 1d4 piercing damage. You use your Strength modifier for the attack and damage rolls.\nAdditionally, when you use the Attack action to grapple a creature, the target takes 3 piercing damage if your grapple check succeeds."
        },
        {
          "level": 3,
          "name": "Path of the Battlerager",
          "desc": "Known as Kuldjargh (literally \"axe idiot\") in Dwarvish, battleragers are dwarf followers of the gods of war and take the Path of the Battlerager. They specialize in wearing bulky, spiked armor and throwing themselves into combat, striking with their body itself and giving themselves over to the fury of battle."
        },
        {
          "level": 3,
          "name": "Restriction\u2014Dwarves Only",
          "desc": "Only dwarves can follow the Path of the Battlerager. The battlerager fills a particular niche in dwarven society and culture.\nYour DM can lift this restriction to better suit the campaign. The restriction exists for the Forgotten Realms. It might not apply to your DM's setting or your DM's version of the Realms."
        },
        {
          "level": 6,
          "name": "Reckless Abandon",
          "desc": "Beginning at 6th level, when you use Reckless Attack while raging, you also gain temporary hit points equal to your Constitution modifier (minimum of 1). They vanish if any of them are left when your rage ends."
        },
        {
          "level": 10,
          "name": "Battlerager Charge",
          "desc": "Beginning at 10th level, you can take the Dash action as a bonus action while you are raging."
        },
        {
          "level": 14,
          "name": "Spiked Retribution",
          "desc": "Starting at 14th level, when a creature within 5 feet of you hits you with a melee attack, the attacker takes 3 piercing damage if you are raging, aren't incapacitated, and are wearing spiked armor."
        }
      ]
    },
    "Path of the Beast": {
      "features": [
        {
          "level": 3,
          "name": "Form of the Beast",
          "desc": "3rd-level Path of the Beast feature\nWhen you enter your rage, you can transform, revealing the bestial power within you. Until the rage ends, you manifest a natural weapon. It counts as a simple melee weapon for you, and you add your Strength modifier to the attack and damage rolls when you attack with it, as normal.\nYou choose the weapon's form each time you rage:\n\u2022 Bite: \n\u2022 Claws: \n\u2022 Tail:"
        },
        {
          "level": 3,
          "name": "Path of the Beast",
          "desc": "Barbarians who walk the Path of the Beast draw their rage from a bestial spark burning within their souls. That beast bursts forth in the throes of rage, physically transforming the barbarian.\nSuch a barbarian might be inhabited by a primal spirit or be descended from shape-shifters. You can choose the origin of your feral might or determine it by rolling on the Origin of the Beast table.\nd4 | Origin\n1 \u2014 One of your parents is a lycanthrope, and you've inherited some of their curse.\n2 \u2014 You are descended from an archdruid and inherited the ability to partially change shape.\n3 \u2014 A fey spirit gifted you with the ability to adopt different bestial aspects.\n4 \u2014 An ancient animal spirit dwells within you, allowing you to walk this path."
        },
        {
          "level": 6,
          "name": "Bestial Soul",
          "desc": "6th-level Path of the Beast feature\nThe feral power within you increases, causing the natural weapons of your Form of the Beast to count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.\nYou can also alter your form to help you adapt to your surroundings. When you finish a short or long rest, choose one of the following benefits, which lasts until you finish your next short or long rest:\n\u2022 You gain a swimming speed equal to your walking speed, and you can breathe underwater.\n\u2022 You gain a climbing speed equal to your walking speed, and you can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.\n\u2022 When you jump, you can make a Strength (Athletics) check and extend your jump by a number of feet equal to the check's total. You can make this special check only once per turn."
        },
        {
          "level": 10,
          "name": "Infectious Fury",
          "desc": "10th-level Path of the Beast feature\nWhen you hit a creature with your natural weapons while you are raging, the beast within you can curse your target with rabid fury. The target must succeed on a Wisdom saving throw (DC equal to 8 + your Constitution modifier + your proficiency bonus) or suffer one of the following effects (your choice):\n\u2022 The target must use its reaction to make a melee attack against another creature of your choice that you can see.\n\u2022 The target takes 2d12 psychic damage.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 14,
          "name": "Call the Hunt",
          "desc": "14th-level Path of the Beast feature\nThe beast within you grows so powerful that you can spread its ferocity to others and gain resilience from them joining your hunt. When you enter your rage, you can choose a number of other willing creatures you can see within 30 feet of you equal to your Constitution modifier (minimum of one creature).\nYou gain 5 temporary hit points for each creature that accepts this feature. Until the rage ends, the chosen creatures can each use the following benefit once on each of their turns: when the creature hits a target with an attack roll and deals damage to it, the creature can roll a d6 and gain a bonus to the damage equal to the number rolled.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        }
      ]
    },
    "Path of the Berserker": {
      "features": [
        {
          "level": 3,
          "name": "Frenzy",
          "desc": "Starting when you choose this path at 3rd level, you can go into a frenzy when you rage. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion."
        },
        {
          "level": 3,
          "name": "Frenzy",
          "desc": "If you use Reckless Attack while your Rage is active, you deal extra damage to the first target you hit on your turn with a Strength-based attack. To determine the extra damage, roll a number of d6s equal to your Rage Damage bonus, and add them together. The damage has the same type as the weapon or Unarmed Strike used for the attack."
        },
        {
          "level": 3,
          "name": "Path of the Berserker",
          "desc": "For some barbarians, rage is a means to an end\u2014that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood. As you enter the berserker's rage, you thrill in the chaos of battle, heedless of your own health or well-being."
        },
        {
          "level": 3,
          "name": "Path of the Berserker",
          "desc": "Channel Rage into Violent Fury\nBarbarians who walk the Path of the Berserker direct their Rage primarily toward violence. Their path is one of untrammeled fury, and they thrill in the chaos of battle as they allow their Rage to seize and empower them."
        },
        {
          "level": 6,
          "name": "Mindless Rage",
          "desc": "Beginning at 6th level, you can't be charmed or frightened while raging. If you are charmed or frightened when you enter your rage, the effect is suspended for the duration of the rage."
        },
        {
          "level": 6,
          "name": "Mindless Rage",
          "desc": "You have Immunity to the Charmed and Frightened conditions while your Rage is active. If you're Charmed or Frightened when you enter your Rage, the condition ends on you."
        },
        {
          "level": 10,
          "name": "Intimidating Presence",
          "desc": "Beginning at 10th level, you can use your action to frighten someone with your menacing presence. When you do so, choose one creature that you can see within 30 feet of you. If the creature can see or hear you, it must succeed on a Wisdom saving throw (DC equal to 8 + your proficiency bonus + your Charisma modifier) or be frightened of you until the end of your next turn. On subsequent turns, you can use your action to extend the duration of this effect on the frightened creature until the end of your next turn. This effect ends if the creature ends its turn out of line of sight or more than 60 feet away from you.\nIf the creature succeeds on its saving throw, you can't use this feature on that creature again for 24 hours."
        },
        {
          "level": 10,
          "name": "Retaliation",
          "desc": "When you take damage from a creature that is within 5 feet of you, you can take a Reaction to make one melee attack against that creature, using a weapon or an Unarmed Strike."
        },
        {
          "level": 14,
          "name": "Intimidating Presence",
          "desc": "As a Bonus Action, you can strike terror into others with your menacing presence and primal power. When you do so, each creature of your choice in a 30-foot Emanation originating from you must make a Wisdom saving throw (DC 8 plus your Strength modifier and Proficiency Bonus). On a failed save, a creature has the Frightened condition for 1 minute. At the end of each of the Frightened creature's turns, the creature repeats the save, ending the effect on itself on a success.\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you expend a use of your Rage (no action required) to restore your use of it."
        },
        {
          "level": 14,
          "name": "Retaliation",
          "desc": "Starting at 14th level, when you take damage from a creature that is within 5 feet of you, you can use your reaction to make a melee weapon attack against that creature."
        }
      ]
    },
    "Path of the Giant": {
      "features": [
        {
          "level": 3,
          "name": "Giant Power",
          "desc": "3rd-Level Path of the Giant Feature\nWhen you choose this path, you learn to speak, read, and write Giant or one other language of your choice if you already know Giant. Additionally, you learn a cantrip of your choice: either Druidcraft or Thaumaturgy. Wisdom is your spellcasting ability for this spell."
        },
        {
          "level": 3,
          "name": "Giant's Havoc",
          "desc": "3rd-Level Path of the Giant Feature\nYour rages pull strength from the primal might of giants, transforming you into a hulking force of destruction. While raging, you gain the following benefits:\n\u2022 Crushing Throw: \n\u2022 Giant Stature:"
        },
        {
          "level": 3,
          "name": "Path of the Giant",
          "desc": "Barbarians who walk the Path of the Giant draw strength from the same primal forces as giants. As they rage, these barbarians surge with elemental power and grow in size, taking on forms that evoke the glory of giants. Some barbarians look like oversized versions of themselves, perhaps with a hint of elemental energy flaring in their eyes and around their weapons. Others transform more dramatically, taking on the appearance of an actual giant or a form similar to an Elemental, wreathed in fire, frost, or lightning."
        },
        {
          "level": 6,
          "name": "Elemental Cleaver",
          "desc": "6th-Level Path of the Giant Feature\nYour bond with the elemental might of giants grows, and you learn to infuse weapons with primordial energy.\nWhen you enter your rage, you can choose one weapon that you are holding and infuse it with one of the following damage types: acid, cold, fire, thunder, or lightning. While you wield the infused weapon during your rage, the weapon's damage type changes to the chosen type, it deals an extra 1d6 damage of the chosen type when it hits, and it gains the thrown property, with a normal range of 20 feet and a long range of 60 feet. If you throw the weapon, it reappears in your hand the instant after it hits or misses a target. The infused weapon's benefits are suppressed while a creature other than you wields it.\nWhile raging and holding the infused weapon, you can use a bonus action to change the infused weapon's current damage type to another one from the damage type options above."
        },
        {
          "level": 10,
          "name": "Mighty Impel",
          "desc": "10th-Level Path of the Giant Feature\nYour connection to giant strength allows you to hurl both allies and enemies on the battlefield. As a bonus action while raging, you can choose one Medium or smaller creature within your reach and move it to an unoccupied space you can see within 30 feet of yourself. An unwilling creature must succeed on a Strength saving throw (DC equals 8 + your proficiency bonus + your Strength modifier) to avoid the effect.\nIf, at the end of this movement, the thrown creature isn't on a surface or liquid that can support it, the creature falls, taking damage as normal and landing prone."
        },
        {
          "level": 14,
          "name": "Demiurgic Colossus",
          "desc": "14th-Level Path of the Giant Feature\nThe primordial power of your rage intensifies. When you rage, your reach increases by 10 feet, your size can increase to Large or Huge (your choice), and you can use your Mighty Impel to move creatures that are Large or smaller.\nIn addition, the extra damage dealt by your Elemental Cleaver feature increases to 2d6."
        }
      ]
    },
    "Path of the Storm Herald": {
      "features": [
        {
          "level": 3,
          "name": "Desert",
          "desc": "When this effect is activated, all other creatures in your aura take 2 fire damage each. The damage increases when you reach certain levels in this class, increasing to 3 at 5th level, 4 at 10th level, 5 at 15th level, and 6 at 20th level."
        },
        {
          "level": 3,
          "name": "Path of the Storm Herald",
          "desc": "All barbarians harbor a fury within. Their rage grants them superior strength, durability, and speed. Barbarians who follow the Path of the Storm Herald learn to transform that rage into a mantle of primal magic, which swirls around them. When in a fury, a barbarian of this path taps into the forces of nature to create powerful magical effects.\nStorm heralds are typically elite champions who train alongside druids, rangers, and others sworn to protect nature. Other storm heralds hone their craft in lodges in regions wracked by storms, in the frozen reaches at the world's end, or deep in the hottest deserts."
        },
        {
          "level": 3,
          "name": "Sea",
          "desc": "When this effect is activated, you can choose one other creature you can see in your aura. The target must make a Dexterity saving throw. The target takes 1d6 lightning damage on a failed save, or half as much damage on a successful one. The damage increases when you reach certain levels in this class, increasing to 2d6 at 10th level, 3d6 at 15th level, and 4d6 at 20th level."
        },
        {
          "level": 3,
          "name": "Storm Aura",
          "desc": "Starting at 3rd level, you emanate a stormy, magical aura while you rage. The aura extends 10 feet from you in every direction, but not through Cover.\nYour aura has an effect that activates when you enter your rage, and you can activate the effect again on each of your turns as a bonus action. Choose desert, sea, or tundra. Your aura's effect depends on that chosen environment, as detailed below. You can change your environment choice whenever you gain a level in this class.\nIf your aura's effects require a saving throw, the DC equals 8 + your proficiency bonus + your Constitution modifier."
        },
        {
          "level": 3,
          "name": "Tundra",
          "desc": "When this effect is activated, each creature of your choice in your aura gains 2 temporary hit points, as icy spirits inure it to suffering. The temporary hit points increase when you reach certain levels in this class, increasing to 3 at 5th level, 4 at 10th level, 5 at 15th level, and 6 at 20th level."
        },
        {
          "level": 6,
          "name": "Desert",
          "desc": "You gain resistance to fire damage, and you don't suffer the effects of extreme heat, as described in the Dungeon Master's Guide. Moreover, as an action, you can touch a flammable object that isn't being worn or carried by anyone else and set it on fire."
        },
        {
          "level": 6,
          "name": "Sea",
          "desc": "You gain resistance to lightning damage, and you can breathe underwater. You also gain a swimming speed of 30 feet."
        },
        {
          "level": 6,
          "name": "Storm Soul",
          "desc": "At 6th level, the storm grants you benefits even when your aura isn't active. The benefits are based on the environment you chose for your Storm Aura."
        },
        {
          "level": 6,
          "name": "Tundra",
          "desc": "You gain resistance to cold damage, and you don't suffer the effects of extreme cold, as described in the Dungeon Master's Guide. Moreover, as an action, you can touch water and turn a 5-foot cube of it into ice, which melts after 1 minute. This action fails if a creature is in the cube."
        },
        {
          "level": 10,
          "name": "Shielding Storm",
          "desc": "At 10th level, you learn to use your mastery of the storm to protect others. Each creature of your choice has the damage resistance you gained from the Storm Soul feature while the creature is in your Storm Aura."
        },
        {
          "level": 14,
          "name": "Desert",
          "desc": "Immediately after a creature in your aura hits you with an attack, you can use your reaction to force that creature to make a Dexterity saving throw. On a failed save, the creature takes fire damage equal to half your barbarian level."
        },
        {
          "level": 14,
          "name": "Raging Storm",
          "desc": "At 14th level, the power of the storm you channel grows mightier, lashing out at your foes. The effect is based on the environment you chose for your Storm Aura."
        },
        {
          "level": 14,
          "name": "Sea",
          "desc": "When you hit a creature in your aura with an attack, you can use your reaction to force that creature to make a Strength saving throw. On a failed save, the creature is knocked prone, as if struck by a wave."
        },
        {
          "level": 14,
          "name": "Tundra",
          "desc": "Whenever the effect of your Storm Aura is activated, you can choose one creature you can see in the aura. That creature must succeed on a Strength saving throw, or its speed is reduced to 0 until the start of your next turn, as magical frost covers it."
        }
      ]
    },
    "Path of the Totem Warrior": {
      "features": [
        {
          "level": 3,
          "name": "Bear",
          "desc": "While raging, you have resistance to all damage except psychic damage. The spirit of the bear makes you tough enough to stand up to any punishment."
        },
        {
          "level": 3,
          "name": "Eagle",
          "desc": "While you're raging and aren't wearing heavy armor, other creatures have disadvantage on opportunity attack rolls against you, and you can use the Dash action as a bonus action on your turn. The spirit of the eagle makes you into a predator who can weave through the fray with ease."
        },
        {
          "level": 3,
          "name": "Elk",
          "desc": "While you're raging and aren't wearing heavy armor, your walking speed increases by 15 feet. The spirit of the elk makes you extraordinarily swift."
        },
        {
          "level": 3,
          "name": "Path of the Totem Warrior",
          "desc": "The Path of the Totem Warrior is a spiritual journey, as the barbarian accepts a spirit animal as guide, protector, and inspiration. In battle, your totem spirit fills you with supernatural might, adding magical fuel to your barbarian rage.\nMost barbarian tribes consider a totem animal to be kin to a particular clan. In such cases, it is unusual for an individual to have more than one totem animal spirit, though exceptions exist."
        },
        {
          "level": 3,
          "name": "Spirit Seeker",
          "desc": "Yours is a path that seeks attunement with the natural world, giving you a kinship with beasts. At 3rd level when you adopt this path, you gain the ability to cast the Beast Sense and Speak With Animals spells, but only as rituals, as described in chapter 10."
        },
        {
          "level": 3,
          "name": "Tiger",
          "desc": "While raging, you can add 10 feet to your long jump distance and 3 feet to your high jump distance. The spirit of the tiger empowers your leaps."
        },
        {
          "level": 3,
          "name": "Totem Spirit",
          "desc": "At 3rd level, when you adopt this path, you choose a totem spirit and gain its feature. You must make or acquire a physical totem object\u2014an amulet or similar adornment\u2014that incorporates fur or feathers, claws, teeth, or bones of the totem animal. At your option, you also gain minor physical attributes that are reminiscent of your totem spirit. For example, if you have a bear totem spirit, you might be unusually hairy and thick-skinned, or if your totem is the eagle, your eyes turn bright yellow.\nYour totem animal might be an animal related to those listed here but more appropriate to your homeland. For example, you could choose a hawk or vulture in place of an eagle."
        },
        {
          "level": 3,
          "name": "Wolf",
          "desc": "While you're raging, your friends have advantage on melee attack rolls against any creature within 5 feet of you that is hostile to you. The spirit of the wolf makes you a leader of hunters."
        },
        {
          "level": 6,
          "name": "Aspect of the Beast",
          "desc": "At 6th level, you gain a magical benefit based on the totem animal of your choice. You can choose the same animal you selected at 3rd level or a different one."
        },
        {
          "level": 6,
          "name": "Bear",
          "desc": "You gain the might of a bear. Your carrying capacity (including maximum load and maximum lift) is doubled, and you have advantage on Strength checks made to push, pull, lift, or break objects."
        },
        {
          "level": 6,
          "name": "Eagle",
          "desc": "You gain the eyesight of an eagle. You can see up to 1 mile away with no difficulty, able to discern even fine details as though looking at something no more than 100 feet away from you. Additionally, dim light doesn't impose disadvantage on your Wisdom (Perception) checks."
        },
        {
          "level": 6,
          "name": "Elk",
          "desc": "Whether mounted or on foot, your travel pace is doubled, as is the travel pace of up to ten companions while they're within 60 feet of you and you're not incapacitated. The elk spirit helps you roam far and fast."
        },
        {
          "level": 6,
          "name": "Tiger",
          "desc": "You gain proficiency in two skills from the following list: Athletics, Acrobatics, Stealth, and Survival. The cat spirit hones your survival instincts."
        },
        {
          "level": 6,
          "name": "Wolf",
          "desc": "You gain the hunting sensibilities of a wolf. You can track other creatures while traveling at a fast pace, and you can move stealthily while traveling at a normal pace."
        },
        {
          "level": 10,
          "name": "Spirit Walker",
          "desc": "At 10th level, you can cast the Commune With Nature spell, but only as a ritual. When you do so, a spiritual version of one of the animals you chose for Totem Spirit or Aspect of the Beast appears to you to convey the information you seek."
        },
        {
          "level": 14,
          "name": "Bear",
          "desc": "While you're raging, any creature within 5 feet of you that's hostile to you has disadvantage on attack rolls against targets other than you or another character with this feature. An enemy is immune to this effect if it can't see or hear you or if it can't be frightened."
        },
        {
          "level": 14,
          "name": "Eagle",
          "desc": "While raging, you have a flying speed equal to your current walking speed. This benefit works only in short bursts; you fall if you end your turn in the air and nothing else is holding you aloft."
        },
        {
          "level": 14,
          "name": "Elk",
          "desc": "While raging, you can use a bonus action during your move to pass through the space of a Large or smaller creature. That creature must succeed on a Strength saving throw (DC 8 + your Strength bonus + your proficiency bonus) or be knocked prone and take bludgeoning damage equal to 1d12 + your Strength modifier."
        },
        {
          "level": 14,
          "name": "Tiger",
          "desc": "While you're raging, if you move at least 20 feet in a straight line toward a Large or smaller target right before making a melee weapon attack against it, you can use a bonus action to make an additional melee weapon attack against it."
        },
        {
          "level": 14,
          "name": "Totemic Attunement",
          "desc": "At 14th level, you gain a magical benefit based on a totem animal of your choice. You can choose the same animal you selected previously or a different one."
        },
        {
          "level": 14,
          "name": "Wolf",
          "desc": "While you're raging, you can use a bonus action on your turn to knock a Large or smaller creature prone when you hit it with a melee weapon attack."
        }
      ]
    },
    "Path of the Wild Heart": {
      "features": [
        {
          "level": 3,
          "name": "Animal Speaker",
          "desc": "You can cast the Beast Sense and Speak With Animals spells but only as Rituals. Wisdom is your spellcasting ability for them."
        },
        {
          "level": 3,
          "name": "Path of the Wild Heart",
          "desc": "Walk in Community with the Animal World\nBarbarians who follow the Path of the Wild Heart view themselves as kin to animals. These Barbarians learn magical means to communicate with animals, and their Rage heightens their connection to animals as it fills them with supernatural might."
        },
        {
          "level": 3,
          "name": "Rage of the Wilds",
          "desc": "Your Rage taps into the primal power of animals. Whenever you activate your Rage, you gain one of the following options of your choice.\nBear: While your Rage is active, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.\nEagle: When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While your Rage is active, you can take a Bonus Action to take both of those actions.\nWolf: While your Rage is active, your allies have Advantage on attack rolls against any enemy of yours within 5 feet of you."
        },
        {
          "level": 6,
          "name": "Aspect of the Wilds",
          "desc": "You gain one of the following options of your choice. Whenever you finish a Long Rest, you can change your choice.\nOwl: You have Darkvision with a range of 60 feet. If you already have Darkvision, its range increases by 60 feet.\nPanther: You have a Climb Speed equal to your Speed.\nSalmon: You have a Swim Speed equal to your Speed."
        },
        {
          "level": 10,
          "name": "Nature Speaker",
          "desc": "You can cast the Commune With Nature spell but only as a Ritual. Wisdom is your spellcasting ability for it."
        },
        {
          "level": 14,
          "name": "Power of the Wilds",
          "desc": "Whenever you activate your Rage, you gain one of the following options of your choice.\nFalcon: While your Rage is active, you have a Fly Speed equal to your Speed if you aren't wearing any armor.\nLion: While your Rage is active, any of your enemies within 5 feet of you have Disadvantage on attack rolls against targets other than you or another Barbarian who has this option active.\nRam: While your Rage is active, you can cause a Large or smaller creature to have the Prone condition when you hit it with a melee attack."
        }
      ]
    },
    "Path of the World Tree": {
      "features": [
        {
          "level": 3,
          "name": "Path of the World Tree",
          "desc": "Trace the Roots and Branches of the Multiverse\nBarbarians who follow the Path of the World Tree connect with the cosmic tree Yggdrasil through their Rage. This tree grows among the Outer Planes, connecting them to each other and the Material Plane. These Barbarians draw on the tree's magic for vitality and as a means of dimensional travel."
        },
        {
          "level": 3,
          "name": "Vitality of the Tree",
          "desc": "Your Rage taps into the life force of the World Tree. You gain the following benefits.\nVitality Surge: When you activate your Rage, you gain a number of Temporary Hit Points equal to your Barbarian level.\nLife-Giving Force: At the start of each of your turns while your Rage is active, you can choose another creature within 10 feet of yourself to gain Temporary Hit Points. To determine the number of Temporary Hit Points, roll a number of d6s equal to your Rage Damage bonus, and add them together. If any of these Temporary Hit Points remain when your Rage ends, they vanish."
        },
        {
          "level": 6,
          "name": "Branches of the Tree",
          "desc": "Whenever a creature you can see starts its turn within 30 feet of you while your Rage is active, you can take a Reaction to summon spectral branches of the World Tree around it. The target must succeed on a Strength saving throw (DC 8 plus your Strength modifier and Proficiency Bonus) or be teleported to an unoccupied space you can see within 5 feet of yourself or in the nearest unoccupied space you can see. After the target teleports, you can reduce its Speed to 0 until the end of the current turn."
        },
        {
          "level": 10,
          "name": "Battering Roots",
          "desc": "During your turn, your reach is 10 feet greater with any Melee weapon that has the Heavy or Versatile property, as tendrils of the World Tree extend from you. When you hit with such a weapon on your turn, you can activate the Push or Topple mastery property in addition to a different mastery property you're using with that weapon."
        },
        {
          "level": 14,
          "name": "Travel Along the Tree",
          "desc": "When you activate your Rage and as a Bonus Action while your Rage is active, you can teleport up to 60 feet to an unoccupied space you can see.\nIn addition, once per Rage, you can increase the range of that teleport to 150 feet. When you do so, you can also bring up to six willing creatures who are within 10 feet of you. Each creature teleports to an unoccupied space of your choice within 10 feet of your destination space."
        }
      ]
    },
    "Path of the Zealot": {
      "features": [
        {
          "level": 3,
          "name": "Divine Fury",
          "desc": "Starting when you choose this path at 3rd level, you can channel divine fury into your weapon strikes. While you're raging, the first creature you hit on each of your turns with a weapon attack takes extra damage equal to 1d6 + half your barbarian level. The extra damage is necrotic or radiant; you choose the type of damage when you gain this feature."
        },
        {
          "level": 3,
          "name": "Divine Fury",
          "desc": "You can channel divine power into your strikes. On each of your turns while your Rage is active, the first creature you hit with a weapon or an Unarmed Strike takes extra damage equal to 1d6 plus half your Barbarian level (round down). The extra damage is Necrotic or Radiant; you choose the type each time you deal the damage."
        },
        {
          "level": 3,
          "name": "Path of the Zealot",
          "desc": "Some deities inspire their followers to pitch themselves into a ferocious battle fury. These barbarians are zealots\u2014warriors who channel their rage into powerful displays of divine power.\nA variety of gods across the worlds of D&D inspire their followers to embrace this path. Tempus from the Forgotten Realms and Hextor and Erythnul of Greyhawk are all prime examples. In general, the gods who inspire zealots are deities of combat, destruction, and violence. Not all are evil, but few are good."
        },
        {
          "level": 3,
          "name": "Path of the Zealot",
          "desc": "Rage in Ecstatic Union with a God\nBarbarians who walk the Path of the Zealot receive boons from a god or pantheon. These Barbarians experience their Rage as an ecstatic episode of divine union that infuses them with power. They are often allies to the priests and other followers of their god or pantheon."
        },
        {
          "level": 3,
          "name": "Warrior of the Gods",
          "desc": "At 3rd level, your soul is marked for endless battle. If a spell, such as Raise Dead, has the sole effect of restoring you to life (but not undeath), the caster doesn't need material components to cast the spell on you."
        },
        {
          "level": 3,
          "name": "Warrior of the Gods",
          "desc": "A divine entity helps ensure you can continue the fight. You have a pool of four d12s that you can spend to heal yourself. As a Bonus Action, you can expend dice from the pool, roll them, and regain a number of Hit Points equal to the roll's total.\nYour pool regains all expended dice when you finish a Long Rest.\nThe pool's maximum number of dice increases by one when you reach Barbarian levels 6 (5 dice), 12 (6 dice), and 17 (7 dice)."
        },
        {
          "level": 6,
          "name": "Fanatical Focus",
          "desc": "Starting at 6th level, the divine power that fuels your rage can protect you. If you fail a saving throw while you're raging, you can reroll it, and you must use the new roll. You can use this ability only once per rage."
        },
        {
          "level": 6,
          "name": "Fanatical Focus",
          "desc": "Once per active Rage, if you fail a saving throw, you can reroll it with a bonus equal to your Rage Damage bonus, and you must use the new roll."
        },
        {
          "level": 10,
          "name": "Zealous Presence",
          "desc": "At 10th level, you learn to channel divine power to inspire zealotry in others. As a bonus action, you unleash a battle cry infused with divine energy. Up to ten other creatures of your choice within 60 feet of you that can hear you gain advantage on attack rolls and saving throws until the start of your next turn.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 10,
          "name": "Zealous Presence",
          "desc": "As a Bonus Action, you unleash a battle cry infused with divine energy. Up to ten other creatures of your choice within 60 feet of you gain Advantage on attack rolls and saving throws until the start of your next turn.\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you expend a use of your Rage (no action required) to restore your use of it."
        },
        {
          "level": 14,
          "name": "Rage beyond Death",
          "desc": "Beginning at 14th level, the divine power that fuels your rage allows you to shrug off fatal blows.\nWhile you're raging, having 0 hit points doesn't knock you unconscious. You still must make death saving throws, and you suffer the normal effects of taking damage while at 0 hit points. However, if you would die due to failing death saving throws, you don't die until your rage ends, and you die then only if you still have 0 hit points."
        },
        {
          "level": 14,
          "name": "Rage of the Gods",
          "desc": "When you activate your Rage, you can assume the form of a divine warrior. This form lasts for 1 minute or until you drop to 0 Hit Points. Once you use this feature, you can't do so again until you finish a Long Rest.\nWhile in this form, you gain the benefits below.\nFlight: You have a Fly Speed equal to your Speed and can hover.\nResistance: You have Resistance to Necrotic, Psychic, and Radiant damage.\nRevivification: When a creature within 30 feet of you would drop to 0 Hit Points, you can take a Reaction to expend a use of your Rage to instead change the target's Hit Points to a number equal to your Barbarian level."
        }
      ]
    }
  },
  "Bard": {
    "College of Creation": {
      "features": [
        {
          "level": 3,
          "name": "College of Creation",
          "desc": "Bards believe the cosmos is a work of art\u2014the creation of the first dragons and gods. That creative work included harmonies that continue to resound through existence today, a power known as the Song of Creation. The bards of the College of Creation draw on that primeval song through dance, music, and poetry, and their teachers share this lesson:\n\"Before the sun and the moon, there was the Song, and its music awoke the first dawn. Its melodies so delighted the stones and trees that some of them gained a voice of their own. And now they sing too. Learn the Song, students, and you too can teach the mountains to sing and dance.\"\nDwarves and gnomes often encourage their bards to become students of the Song of Creation. And among dragonborn, the Song of Creation is revered, for legends portray Bahamut and Tiamat-the greatest of dragons-as two of the song's first singers."
        },
        {
          "level": 3,
          "name": "Mote of Potential",
          "desc": "3rd-level College of Creation feature\nWhenever you give a creature a Bardic Inspiration die, you can utter a note from the Song of Creation to create a Tiny mote of potential, which orbits within 5 feet of that creature. The mote is intangible and invulnerable, and it lasts until the Bardic Inspiration die is lost. The mote looks like a musical note, a star, a flower, or another symbol of art or life that you choose.\nWhen the creature uses the Bardic Inspiration die, the mote provides an additional effect based on whether the die benefits an ability check, an attack roll, or a saving throw, as detailed below:\n\u2022 Ability Check: \n\u2022 Attack Roll: \n\u2022 Saving Throw:"
        },
        {
          "level": 3,
          "name": "Performance of Creation",
          "desc": "3rd-level College of Creation feature\nAs an action, you can channel the magic of the Song of Creation to create one nonmagical item of your choice in an unoccupied space within 10 feet of you. The item must appear on a surface or in a liquid that can support it. The gp value of the item can't be more than 20 times your bard level, and the item must be Medium or smaller. The item glimmers softly, and a creature can faintly hear music when touching it. The created item disappears after a number of hours equal to your proficiency bonus. For examples of items you can create, see the equipment chapter of the Player's Handbook.\nOnce you create an item with this feature, you can't do so again until you finish a long rest, unless you expend a spell slot of 2nd level or higher to use this feature again. You can have only one item created by this feature at a time; if you use this action and already have an item from this feature, the first one immediately vanishes.\nThe size of the item you can create with this feature increases by one size category when you reach 6th level (Large) and 14th level (Huge)."
        },
        {
          "level": 6,
          "name": "Animating Performance",
          "desc": "6th-level College of Creation feature\nAs an action, you can animate one Large or smaller nonmagical item within 30 feet of you that isn't being worn or carried. The animate item uses the Dancing Item stat block, which uses your proficiency bonus (PB). The item is friendly to you and your companions and obeys your commands. It lives for 1 hour, until it is reduced to 0 hit points, or until you die.\nIn combat, the item shares your initiative count, but it takes its turn immediately after yours. It can move and use its reaction on its own, but the only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the item can take any action of its choice, not just Dodge.\nWhen you use your Bardic Inspiration feature, you can command the item as part of the same bonus action you use for Bardic Inspiration.\nOnce you animate an item with this feature, you can't do so again until you finish a long rest, unless you expend a spell slot of 3rd level or higher to use this feature again. You can have only one item animated by this feature at a time; if you use this action and already have a dancing item from this feature, the first one immediately becomes inanimate."
        },
        {
          "level": 14,
          "name": "Creative Crescendo",
          "desc": "14th-level College of Creation feature\nWhen you use your Performance of Creation feature, you can create more than one item at once. The number of items equals your Charisma modifier (minimum of two items). If you create an item that would exceed that number, you choose which of the previously created items disappears. Only one of these items can be of the maximum size you can create; the rest must be Small or Tiny.\nYou are no longer limited by gp value when creating items with Performance of Creation."
        }
      ]
    },
    "College of Dance": {
      "features": [
        {
          "level": 3,
          "name": "Agile Strikes",
          "desc": "When you expend a use of your Bardic Inspiration as part of an action, a Bonus Action, or a Reaction, you can make one Unarmed Strike as part of that action, Bonus Action, or Reaction."
        },
        {
          "level": 3,
          "name": "Bardic Damage",
          "desc": "You can use Dexterity instead of Strength for the attack rolls of your Unarmed Strikes. When you deal damage with an Unarmed Strike, you can deal Bludgeoning damage equal to a roll of your Bardic Inspiration die plus your Dexterity modifier, instead of the strike's normal damage. This roll doesn't expend the die."
        },
        {
          "level": 3,
          "name": "College of Dance",
          "desc": "Move in Harmony with the Cosmos\nBards of the College of Dance know that the Words of Creation can't be contained within speech or song; the words are uttered by the movements of celestial bodies and flow through the motions of the smallest creatures. These Bards practice a way of being in harmony with the whirling cosmos that emphasizes agility, speed, and grace."
        },
        {
          "level": 3,
          "name": "Dance Virtuoso",
          "desc": "You have Advantage on any Charisma (Performance) check you make that involves you dancing."
        },
        {
          "level": 3,
          "name": "Dazzling Footwork",
          "desc": "While you aren't wearing armor or wielding a Shield, you gain the following benefits."
        },
        {
          "level": 3,
          "name": "Unarmored Defense",
          "desc": "Your base Armor Class equals 10 plus your Dexterity and Charisma modifiers."
        },
        {
          "level": 6,
          "name": "Inspiring Movement",
          "desc": "When an enemy you can see ends its turn within 5 feet of you, you can take a Reaction and expend one use of your Bardic Inspiration to move up to half your Speed. Then one ally of your choice within 30 feet of you can also move up to half their Speed using their Reaction.\nNone of this feature's movement provokes Opportunity Attacks."
        },
        {
          "level": 6,
          "name": "Tandem Footwork",
          "desc": "When you roll Initiative, you can expend one use of your Bardic Inspiration if you don't have the Incapacitated condition. When you do so, roll your Bardic Inspiration die; you and each ally within 30 feet of you who can see or hear you gains a bonus to Initiative equal to the number rolled."
        },
        {
          "level": 14,
          "name": "Leading Evasion",
          "desc": "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. If any creatures within 5 feet of you are making the same Dexterity saving throw, you can share this benefit with them for that save.\nYou can't use this feature if you have the Incapacitated condition."
        }
      ]
    },
    "College of Eloquence": {
      "features": [
        {
          "level": 3,
          "name": "College of Eloquence",
          "desc": "Adherents of the College of Eloquence master the art of oratory. Persuasion is regarded as a high art, and a well-reasoned, well-spoken argument often proves more persuasive than facts. These bards wield a blend of logic and theatrical wordplay, winning over skeptics and detractors with logical arguments and plucking at heartstrings to appeal to the emotions of audiences."
        },
        {
          "level": 3,
          "name": "Silver Tongue",
          "desc": "3rd-level College of Eloquence feature\nYou are a master at saying the right thing at the right time. When you make a Charisma (Persuasion) or Charisma (Deception) check, you can treat a d20 roll of 9 or lower as a 10."
        },
        {
          "level": 3,
          "name": "Unsettling Words",
          "desc": "3rd-level College of Eloquence feature\nYou can spin words laced with magic that unsettle a creature and cause it to doubt itself. As a bonus action, you can expend one use of your Bardic Inspiration and choose one creature you can see within 60 feet of you. Roll the Bardic Inspiration die. The creature must subtract the number rolled from the next saving throw it makes before the start of your next turn."
        },
        {
          "level": 6,
          "name": "Unfailing Inspiration",
          "desc": "6th-level College of Eloquence feature\nYour inspiring words are so persuasive that others feel driven to succeed. When a creature adds one of your Bardic Inspiration dice to its ability check, attack roll, or saving throw and the roll fails, the creature can keep the Bardic Inspiration die."
        },
        {
          "level": 6,
          "name": "Universal Speech",
          "desc": "6th-level College of Eloquence feature\nYou have gained the ability to make your speech intelligible to any creature. As an action, choose one or more creatures within 60 feet of you, up to a number equal to your Charisma modifier (minimum of one creature). The chosen creatures can magically understand you, regardless of the language you speak, for 1 hour.\nOnce you use this feature, you can't use it again until you finish a long rest, unless you expend a spell slot to use it again."
        },
        {
          "level": 14,
          "name": "Infectious Inspiration",
          "desc": "14th-level College of Eloquence feature\nWhen you successfully inspire someone, the power of your eloquence can now spread to someone else. When a creature within 60 feet of you adds one of your Bardic Inspiration dice to its ability check, attack roll, or saving throw and the roll succeeds, you can use your reaction to encourage a different creature (other than yourself) that can hear you within 60 feet of you, giving it a Bardic Inspiration die without expending any of your Bardic Inspiration uses.\nYou can use this reaction a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a long rest."
        }
      ]
    },
    "College of Glamour": {
      "features": [
        {
          "level": 3,
          "name": "Beguiling Magic",
          "desc": "You always have the Charm Person and Mirror Image spells prepared.\nIn addition, immediately after you cast an Enchantment or Illusion spell using a spell slot, you can cause a creature you can see within 60 feet of yourself to make a Wisdom saving throw against your spell save DC. On a failed save, the target has the Charmed or Frightened condition (your choice) for 1 minute. The target repeats the save at the end of each of its turns, ending the effect on itself on a success.\nOnce you use this benefit, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending one use of your Bardic Inspiration (no action required)."
        },
        {
          "level": 3,
          "name": "College of Glamour",
          "desc": "The College of Glamour is the home of bards who mastered their craft in the vibrant realm of the Feywild or under the tutelage of someone who dwelled there. Tutored by satyrs, eladrin, and other fey, these bards learn to use their magic to delight and captivate others.\nThe bards of this college are regarded with a mixture of awe and fear. Their performances are the stuff of legend. These bards are so eloquent that a speech or song that one of them performs can cause captors to release the bard unharmed and can lull a furious dragon into complacency. The same magic that allows them to quell beasts can also bend minds. Villainous bards of this college can leech off a community for weeks, misusing their magic to turn their hosts into thralls. Heroic bards of this college instead use this power to gladden the downtrodden and undermine oppressors."
        },
        {
          "level": 3,
          "name": "College of Glamour",
          "desc": "Weave Beguiling Fey Magic\nThe College of Glamour traces its origins to the beguiling magic of the Feywild. Bards who study this magic weave threads of beauty and terror into their songs and stories, and the mightiest among them can cloak themselves in otherworldly majesty. Their performances stir up wistful longing for forgotten innocence, evoke unconscious memories of long-held fears, and tug at the emotions of even the most hard-hearted listeners."
        },
        {
          "level": 3,
          "name": "Enthralling Performance",
          "desc": "Starting at 3rd level, you can charge your performance with seductive, fey magic.\nIf you perform for at least 1 minute, you can attempt to inspire wonder in your audience by singing, reciting a poem, or dancing. At the end of the performance, choose a number of humanoids within 60 feet of you who watched and listened to all of it, up to a number equal to your Charisma modifier (minimum of one). Each target must succeed on a Wisdom saving throw against your spell save DC or be charmed by you. While charmed in this way, the target idolizes you, it speaks glowingly of you to anyone who talks to it, and it hinders anyone who opposes you, although it avoids violence unless it was already inclined to fight on your behalf. This effect ends on a target after 1 hour, if it takes any damage, if you attack it, or if it witnesses you attacking or damaging any of its allies.\nIf a target succeeds on its saving throw, the target has no hint that you tried to charm it.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 3,
          "name": "Mantle of Inspiration",
          "desc": "When you join the College of Glamour at 3rd level, you gain the ability to weave a song of fey magic that imbues your allies with vigor and speed.\nAs a bonus action, you can expend one use of your Bardic Inspiration to grant yourself a wondrous appearance. When you do so, choose a number of creatures you can see and that can see you within 60 feet of you, up to a number equal to your Charisma modifier (minimum of one). Each of them gains 5 temporary hit points. When a creature gains these temporary hit points, it can immediately use its reaction to move up to its speed, without provoking opportunity attacks.\nThe number of temporary hit points increases when you reach certain levels in this class, increasing to 8 at 5th level, 11 at 10th level, and 14 at 15th level."
        },
        {
          "level": 3,
          "name": "Mantle of Inspiration",
          "desc": "You can weave fey magic into a song or dance to fill others with vigor. As a Bonus Action, you can expend a use of Bardic Inspiration, rolling a Bardic Inspiration die. When you do so, choose a number of other creatures within 60 feet of yourself, up to a number equal to your Charisma modifier (minimum of one creature). Each of those creatures gains a number of Temporary Hit Points equal to two times the number rolled on the Bardic Inspiration die, and then each can use its Reaction to move up to its Speed without provoking Opportunity Attacks."
        },
        {
          "level": 6,
          "name": "Mantle of Majesty",
          "desc": "At 6th level, you gain the ability to cloak yourself in a fey magic that makes others want to serve you. As a bonus action, you cast Command, without expending a spell slot, and you take on an appearance of unearthly beauty for 1 minute or until your concentration ends (as if you were concentrating on a spell). During this time, you can cast Command as a bonus action on each of your turns, without expending a spell slot.\nAny creature charmed by you automatically fails its saving throw against the Command you cast with this feature.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 6,
          "name": "Mantle of Majesty",
          "desc": "You always have the Command spell prepared.\nAs a Bonus Action, you cast Command without expending a spell slot, and you take on an unearthly appearance for 1 minute or until your Concentration ends. During this time, you can cast Command as a Bonus Action without expending a spell slot.\nAny creature Charmed by you automatically fails its saving throw against the Command you cast with this feature.\nOnce you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 3+ spell slot (no action required)."
        },
        {
          "level": 14,
          "name": "Unbreakable Majesty",
          "desc": "At 14th level, your appearance permanently gains an otherworldly aspect that makes you look more lovely and fierce.\nIn addition, as a bonus action, you can assume a magically majestic presence for 1 minute or until you are incapacitated. For the duration, whenever any creature tries to attack you for the first time on a turn, the attacker must make a Charisma saving throw against your spell save DC. On a failed save, it can't attack you on this turn, and it must choose a new target for its attack or the attack is wasted. On a successful save, it can attack you on this turn, but it has disadvantage on any saving throw it makes against your spells on your next turn.\nOnce you assume this majestic presence, you can't do so again until you finish a short or long rest."
        },
        {
          "level": 14,
          "name": "Unbreakable Majesty",
          "desc": "As a Bonus Action, you can assume a magically majestic presence for 1 minute or until you have the Incapacitated condition. For the duration, whenever any creature hits you with an attack roll for the first time on a turn, the attacker must succeed on a Charisma saving throw against your spell save DC, or the attack misses instead, as the creature recoils from your majesty.\nOnce you assume this majestic presence, you can't do so again until you finish a Short or Long Rest."
        }
      ]
    },
    "College of Lore": {
      "features": [
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice."
        },
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "You gain proficiency with three skills of your choice."
        },
        {
          "level": 3,
          "name": "College of Lore",
          "desc": "Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales. Whether singing folk ballads in taverns or elaborate compositions in royal courts, these bards use their gifts to hold audiences spellbound. When the applause dies down, the audience members might find themselves questioning everything they held to be true, from their faith in the priesthood of the local temple to their loyalty to the king.\nThe loyalty of these bards lies in the pursuit of beauty and truth, not in fealty to a monarch or following the tenets of a deity. A noble who keeps such a bard as a herald or advisor knows that the bard would rather be honest than politic.\nThe college's members gather in libraries and sometimes in actual colleges, complete with classrooms and dormitories, to share their lore with one another. They also meet at festivals or affairs of state, where they can expose corruption, unravel lies, and poke fun at self-important figures of authority."
        },
        {
          "level": 3,
          "name": "College of Lore",
          "desc": "Plumb the Depths of Magical Knowledge\nBards of the College of Lore collect spells and secrets from diverse sources, such as scholarly tomes, mystical rites, and peasant tales. The college's members gather in libraries and universities to share their lore with one another. They also meet at festivals or affairs of state, where they can expose corruption, unravel lies, and poke fun at self-important figures of authority."
        },
        {
          "level": 3,
          "name": "Cutting Words",
          "desc": "Also at 3rd level, you learn how to use your wit to distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creature's roll. You can choose to use this feature after the creature makes its roll, but before the DM determines whether the attack roll or ability check succeeds or fails, or before the creature deals its damage. The creature is immune if it can't hear you or if it's immune to being charmed."
        },
        {
          "level": 3,
          "name": "Cutting Words",
          "desc": "You learn to use your wit to supernaturally distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll, reducing the damage or potentially turning the success into a failure."
        },
        {
          "level": 6,
          "name": "Additional Magical Secrets",
          "desc": "At 6th level, you learn two spells of your choice from any class. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you but don't count against the number of bard spells you know."
        },
        {
          "level": 6,
          "name": "Magical Discoveries",
          "desc": "You learn two spells of your choice. These spells can come from the Cleric, Druid, or Wizard spell list or any combination thereof (see a class's section for its spell list). A spell you choose must be a cantrip or a spell for which you have spell slots, as shown in the Bard Features table.\nYou always have the chosen spells prepared, and whenever you gain a Bard level, you can replace one of the spells with another spell that meets these requirements."
        },
        {
          "level": 14,
          "name": "Peerless Skill",
          "desc": "Starting at 14th level, when you make an ability check, you can expend one use of Bardic Inspiration. Roll a Bardic Inspiration die and add the number rolled to your ability check. You can choose to do so after you roll the die for the ability check, but before the DM tells you whether you succeed or fail."
        },
        {
          "level": 14,
          "name": "Peerless Skill",
          "desc": "When you make an ability check or attack roll and fail, you can expend one use of Bardic Inspiration; roll the Bardic Inspiration die, and add the number rolled to the d20, potentially turning a failure into a success. On a failure, the Bardic Inspiration isn't expended."
        }
      ]
    },
    "College of Spirits": {
      "features": [
        {
          "level": 3,
          "name": "Channeler",
          "desc": "You learn how to contact spirits beyond the grave, letting their power and knowledge flow through you. You gain the following benefits.\nGuiding Whispers: You know the Guidance cantrip. It has a range of 60 feet when you cast it.\nSpiritual Focus: You employ tools that aid you in channeling spirits. You gain a Gaming Set (playing cards). You have proficiency with this Gaming Set, and you can use it or one of the following items as a Spellcasting Focus for your Bard spells: Arcane Focus (crystal or orb), Candle, or Ink Pen."
        },
        {
          "level": 3,
          "name": "College of Spirits",
          "desc": "Bards of the College of Spirits seek tales with inherent power\u2014be they legends, histories, or fictions\u2014and bring their subjects to life. Using occult trappings, these bards conjure spiritual embodiments of powerful forces to change the world once more. Such spirits are capricious, though, and what a bard summons isn't always entirely under their control."
        },
        {
          "level": 3,
          "name": "College of Spirits",
          "desc": "Call Forth Spirits from Beyond the Grave\nBards of the College of Spirits conjure legendary spirits to change the world. But such entities are capricious, and what a Bard summons isn't always entirely under their control."
        },
        {
          "level": 3,
          "name": "Guiding Whispers",
          "desc": "3rd-level College of Spirits feature\nYou can reach out to spirits to guide you and others. You learn the Guidance cantrip, which doesn't count against the number of bard cantrips you know. For you, it has a range of 60 feet when you cast it."
        },
        {
          "level": 3,
          "name": "Spirits from Beyond",
          "desc": "You can call forth spirits of the dead to empower you and your allies. When you take a Bonus Action to give a creature a Bardic Inspiration die, you can call forth the powers of a random spirit. To determine the spirit you channel, roll the Bardic Inspiration die and refer to the Spirits from Beyond table. The spirit remains channeled until you unleash it or until you finish a Short or Long Rest.\nControlled Channeling: As a Bonus Action, you can expend a use of your Bardic Inspiration and channel a specific spirit. When you do so, choose the spirit from the Spirits from Beyond table rather than rolling. The chosen spirit's corresponding number must be less than or equal to the highest number on your Bardic Inspiration die; for example, if your Bardic Inspiration die is a d8, you can choose to channel any spirit up to (and including) the Shade.\nUnleashing a Spirit: As a Magic action, you can unleash one of your channeled spirits. Choose one creature you can see within 30 feet of yourself as the spirit's target. The spirit then takes effect; if a spirit's effect requires a saving throw, the DC equals your Bard spell save DC. Bardic Insp. Die | Spirit and Unleash Effect 1 \u2014 Beloved. The target regains Hit Points equal to a roll of your Bardic Inspiration die plus your Charisma modifier. 2 \u2014 Sharpshooter. The target takes Force damage equal to a roll of your Bardic Inspiration die plus your Charisma modifier. 3 \u2014 Avenger. Until the end of your next turn, any creature that hits the target with a melee attack roll takes Force damage equal to a roll of your Bardic Inspiration die. 4 \u2014 Renegade. The target can immediately take a Reaction to teleport up to 30 feet to an unoccupied space it can see. 5 \u2014 Fortune Teller. The target has Advantage on D20 Tests until the start of your next turn. 6 \u2014 Wayfarer. The target gains Temporary Hit Points equal to a roll of your Bardic Inspiration die plus your Bard level. While the target has these Temporary Hit Points, its Speed increases by 10 feet. 7 \u2014 Trickster. The target makes a Wisdom saving throw. On a failed save, the target takes Psychic damage equal to two rolls of your Bardic Inspiration die and has the Charmed condition until the start of your next turn. On a successful save, the target takes half as much damage only. 8 \u2014 Shade. The target has the Invisible condition until the end of its next turn or until the target makes an attack roll, deals damage, or casts a spell. When the invisibility ends, each creature in a 5-foot Emanation originating from the target must succeed on a Constitution saving throw or take Necrotic damage equal to two rolls of your Bardic Inspiration die. 9 \u2014 Arsonist. The target makes a Dexterity saving throw, taking Fire damage equal to four rolls of your Bardic Inspiration die on a failed save or half as much damage on a successful one. 10 \u2014 Coward. The target and each creature of your choice in a 30-foot Emanation originating from the target must succeed on a Wisdom saving throw or have the Frightened condition until the start of your next turn. While a creature is Frightened, its Speed is halved (round down), and it can take either an action or a Bonus Action, not both. 11 \u2014 Brute. Each creature of your choice in a 30-foot Emanation originating from the target makes a Strength saving throw. On a failed save, a creature takes Thunder damage equal to three rolls of your Bardic Inspiration die and has the Prone condition. On a successful save, a creature takes half as much damage only. 12 \u2014 Priest. The target regains Hit Points equal to two rolls of your Bardic Inspiration die, and one of the following conditions of your choice ends on the target: Blinded, Charmed, Deafened, Paralyzed, Poisoned, or Stunned."
        },
        {
          "level": 3,
          "name": "Spiritual Focus",
          "desc": "3rd-level College of Spirits feature\nYou employ tools that aid you in channeling spirits, be they historical figures or fictional archetypes. You can use the following objects as a spellcasting focus for your bard spells: a candle, crystal ball, skull, spirit board, or tarokka deck.\nStarting at 6th level, when you cast a bard spell that deals damage or restores hit points through the Spiritual Focus, roll a d6, and you gain a bonus to one damage or healing roll of the spell equal to the number rolled."
        },
        {
          "level": 3,
          "name": "Tales from Beyond",
          "desc": "3rd-level College of Spirits feature\nYou reach out to spirits who tell their tales through you. While you are holding your Spiritual Focus, you can use a bonus action to expend one use of your Bardic Inspiration and roll on the Spirit Tales table using your Bardic Inspiration die to determine the tale the spirits direct you to tell. You retain the tale in mind until you bestow the tale's effect or you finish a short or long rest.\nYou can use an action to choose one creature you can see within 30 feet of you (this can be you) to be the target of the tale's effect. Once you do so, you can't bestow the tale's effect again until you roll it again.\nYou can retain only one of these tales in mind at a time, and rolling on the Spirit Tales table immediately ends the effect of the previous tale.\nIf the tale requires a saving throw, the DC equals your spell save DC.\nBardic Insp. Die | Tale Told Through You\n1 \u2014 Tale of the Clever Animal. For the next 10 minutes, whenever the target makes an Intelligence, a Wisdom, or a Charisma check, the target can roll an extra die immediately after rolling the d20 and add the extra die's number to the check. The extra die is the same type as your Bardic Inspiration die.\n2 \u2014 Tale of the Renowned Duelist. You make a melee spell attack against the target. On a hit, the target takes force damage equal to two rolls of your Bardic Inspiration die + your Charisma modifier.\n3 \u2014 Tale of the Beloved Friends. The target and another creature of its choice it can see within 5 feet of it gains temporary hit points equal to a roll of your Bardic Inspiration die + your Charisma modifier.\n4 \u2014 Tale of the Runaway. The target can immediately use its reaction to teleport up to 30 feet to an unoccupied space it can see. When the target teleports, it can choose a number of creatures it can see within 30 feet of it up to your Charisma modifier (minimum of 0) to immediately use the same reaction.\n5 \u2014 Tale of the Avenger. For 1 minute, any creature that hits the target with a melee attack takes force damage equal to a roll of your Bardic Inspiration die.\n6 \u2014 Tale of the Traveler. The target gains temporary hit points equal to a roll of your Bardic Inspiration die + your bard level. While it has these temporary hit points, the target's walking speed increases by 10 feet and it gains a +1 bonus to its AC.\n7 \u2014 Tale of the Beguiler. The target must succeed on a Wisdom saving throw or take psychic damage equal to two rolls of your Bardic Inspiration die, and the target is incapacitated until the end of its next turn.\n8 \u2014 Tale of the Phantom. The target becomes invisible until the end of its next turn or until it hits a creature with an attack. If the target hits a creature with an attack during this invisibility, the creature it hits takes necrotic damage equal to a roll of your Bardic Inspiration die and is frightened of the target until the end of the frightened creature's next turn.\n9 \u2014 Tale of the Brute. Each creature of the target's choice it can see within 30 feet of it must make a Strength saving throw. On a failed save, a creature takes thunder damage equal to three rolls of your Bardic Inspiration die and is knocked prone. A creature that succeeds on its saving throw takes half as much damage and isn't knocked prone.\n10 \u2014 Tale of the Dragon. The target spews fire from the mouth in a 30-foot cone. Each creature in that area must make a Dexterity saving throw, taking fire damage equal to four rolls of your Bardic Inspiration die on a failed save, or half as much damage on a successful one.\n11 \u2014 Tale of the Angel. The target regains hit points equal to two rolls of your Bardic Inspiration die + your Charisma modifier, and you end one condition from the following list affecting the target: blinded, deafened, paralyzed, petrified, or poisoned.\n12 \u2014 Tale of the Mind-Bender. You evoke an incomprehensible fable from an otherworldly being. The target must succeed on an Intelligence saving throw or take psychic damage equal to three rolls of your Bardic Inspiration die and be stunned until the end of its next turn."
        },
        {
          "level": 6,
          "name": "Empowered Channeling",
          "desc": "Your ability to channel spirits improves. You gain the following benefits.\nPower from Beyond: Once per turn, when you cast a Bard spell with a spell slot that deals damage or restores Hit Points, roll 1d6. You gain a bonus equal to the number rolled to one of the spell's damage rolls or to the total Hit Points the spell restores.\nSpiritual Manifestation: You always have the Spirit Guardians spell prepared. You can cast the spell once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest. Whenever you cast the spell, you can modify it so the spirits also guard against worldly threats. When you cast the spell in this way, you and allies within the spell's Emanation have Half Cover. Once you modify the spell in this way, you can't do so again until you finish a Short or Long Rest."
        },
        {
          "level": 6,
          "name": "Spirit Session",
          "desc": "6th-level College of Spirits feature\nSpirits provide you with supernatural insights. You can conduct an hour-long ritual channeling spirits (which can be done during a short or long rest) using your Spiritual Focus. You can conduct the ritual with a number of willing creatures equal to your proficiency bonus (including yourself). At the end of the ritual, you temporarily learn one spell of your choice from any class.\nThe spell you choose must be of a level equal to the number of creatures that conducted the ritual or less, the spell must be of a level you can cast, and it must be in the school of divination or necromancy. The chosen spell counts as a bard spell for you but doesn't count against the number of bard spells you know.\nOnce you perform the ritual, you can't do so again until you start a long rest, and you know the chosen spell until you start a long rest."
        },
        {
          "level": 14,
          "name": "Mystical Connection",
          "desc": "14th-level College of Spirits feature\nYou now have the ability to nudge the spirits of Tales from Beyond toward certain tales. Whenever you roll on the Spirit Tales table, you can roll the die twice and choose which of the two effects to bestow. If you roll the same number on both dice, you can ignore the number and choose any effect on the table.\nSpirit Tales: Storytellers, like bards of the College of Spirits, often give voice to tales inspired by some greater theme or body of work. When determining what stories you tell, consider what unites them. Do they all feature characters from a specific group, like archetypes from the tarokka deck, figures from constellations, childhood imaginary friends, or characters in a particular storybook? Or are your inspirations more general, incorporating historic champions, mythological heroes, or urban legends? Use the tales you tell to define your niche as a storytelling adventurer."
        },
        {
          "level": 14,
          "name": "Mystical Connection",
          "desc": "You gain mastery over the spirits you call forth. Whenever you roll on the Spirits from Beyond, you can roll the die twice and choose which of the two effects to bestow. If you roll the same number on both dice, you can instead choose any effect on the table."
        }
      ]
    },
    "College of Swords": {
      "features": [
        {
          "level": 3,
          "name": "Blade Flourish",
          "desc": "At 3rd level, you learn to perform impressive displays of martial prowess and speed.\nWhenever you take the Attack action on your turn, your walking speed increases by 10 feet until the end of the turn, and if a weapon attack that you make as part of this action hits a creature, you can use one of the following Blade Flourish options of your choice. You can use only one Blade Flourish option per turn."
        },
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "When you join the College of Swords at 3rd level, you gain proficiency with medium armor and the scimitar.\nIf you're proficient with a simple or martial melee weapon, you can use it as a spellcasting focus for your bard spells."
        },
        {
          "level": 3,
          "name": "College of Swords",
          "desc": "Bards of the College of Swords are called blades, and they entertain through daring feats of weapon prowess. Blades perform stunts such as sword swallowing, knife throwing and juggling, and mock combats. Though they use their weapons to entertain, they are also highly trained and skilled warriors in their own right.\nTheir talent with weapons inspires many blades to lead double lives. One blade might use a circus troupe as cover for nefarious deeds such as assassination, robbery, and blackmail. Other blades strike at the wicked, bringing justice to bear against the cruel and powerful. Most troupes are happy to accept a blade's talent for the excitement it adds to a performance, but few entertainers fully trust a blade in their ranks.\nBlades who abandon their lives as entertainers have often run into trouble that makes maintaining their secret activities impossible. A blade caught stealing or engaging in vigilante justice is too great a liability for most troupes. With their weapon skills and magic, these blades either take up work as enforcers for thieves' guilds or strike out on their own as adventurers."
        },
        {
          "level": 3,
          "name": "Defensive Flourish",
          "desc": "You can expend one use of your Bardic Inspiration to cause the weapon to deal extra damage to the target you hit. The damage equals the number you roll on the Bardic Inspiration die. You also add the number rolled to your AC until the start of your next turn."
        },
        {
          "level": 3,
          "name": "Fighting Style",
          "desc": "At 3rd level, you adopt a style of fighting as your specialty. Choose one of the following options. You can't take a Fighting Style option more than once, even if something in the game lets you choose again."
        },
        {
          "level": 3,
          "name": "Mobile Flourish",
          "desc": "You can expend one use of your Bardic Inspiration to cause the weapon to deal extra damage to the target you hit. The damage equals the number you roll on the Bardic Inspiration die. You can also push the target up to 5 feet away from you, plus a number of feet equal to the number you roll on that die. You can then immediately use your reaction to move up to your walking speed to an unoccupied space within 5 feet of the target."
        },
        {
          "level": 3,
          "name": "Slashing Flourish",
          "desc": "You can expend one use of your Bardic Inspiration to cause the weapon to deal extra damage to the target you hit and to any other creature of your choice that you can see within 5 feet of you. The damage equals the number you roll on the Bardic Inspiration die."
        },
        {
          "level": 6,
          "name": "Extra Attack",
          "desc": "Starting at 6th level, you can attack twice, instead of once, whenever you take the Attack action on your turn."
        },
        {
          "level": 14,
          "name": "Master's Flourish",
          "desc": "Starting at 14th level, whenever you use a Blade Flourish option, you can roll a d6 and use it instead of expending a Bardic Inspiration die."
        }
      ]
    },
    "College of Valor": {
      "features": [
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "When you join the College of Valor at 3rd level, you gain proficiency with medium armor, shields, and martial weapons."
        },
        {
          "level": 3,
          "name": "College of Valor",
          "desc": "Bards of the College of Valor are daring skalds whose tales keep alive the memory of the great heroes of the past, and thereby inspire a new generation of heroes. These bards gather in mead halls or around great bonfires to sing the deeds of the mighty, both past and present. They travel the land to witness great events firsthand and to ensure that the memory of those events doesn't pass from the world. With their songs, they inspire others to reach the same heights of accomplishment as the heroes of old."
        },
        {
          "level": 3,
          "name": "College of Valor",
          "desc": "Sing the Deeds of Ancient Heroes\nBards of the College of Valor are daring storytellers whose tales preserve the memory of the great heroes of the past. These Bards sing the deeds of the mighty in vaulted halls or to crowds gathered around great bonfires. They travel to witness great events firsthand and to ensure that the memory of these events doesn't pass away. With their songs, they inspire new generations to reach the same heights of accomplishment as the heroes of old."
        },
        {
          "level": 3,
          "name": "Combat Inspiration",
          "desc": "Also at 3rd level, you learn to inspire others in battle. A creature that has a Bardic Inspiration die from you can roll that die and add the number rolled to a weapon damage roll it just made. Alternatively, when an attack roll is made against the creature, it can use its reaction to roll the Bardic Inspiration die and add the number rolled to its AC against that attack, after seeing the roll but before knowing whether it hits or misses."
        },
        {
          "level": 3,
          "name": "Combat Inspiration",
          "desc": "You can use your wit to turn the tide of battle. A creature that has a Bardic Inspiration die from you can use it for one of the following effects.\nDefense: When the creature is hit by an attack roll, that creature can use its Reaction to roll the Bardic Inspiration die and add the number rolled to its AC against that attack, potentially causing the attack to miss.\nOffense: Immediately after the creature hits a target with an attack roll, the creature can roll the Bardic Inspiration die and add the number rolled to the attack's damage against the target."
        },
        {
          "level": 3,
          "name": "Martial Training",
          "desc": "You gain proficiency with Martial weapons and training with Medium armor and Shields.\nIn addition, you can use a Simple or Martial weapon as a Spellcasting Focus to cast spells from your Bard spell list."
        },
        {
          "level": 6,
          "name": "Extra Attack",
          "desc": "Starting at 6th level, you can attack twice, instead of once, whenever you take the Attack action on your turn."
        },
        {
          "level": 6,
          "name": "Extra Attack",
          "desc": "You can attack twice instead of once whenever you take the Attack action on your turn.\nIn addition, you can cast one of your cantrips that has a casting time of an action in place of one of those attacks."
        },
        {
          "level": 14,
          "name": "Battle Magic",
          "desc": "At 14th level, you have mastered the art of weaving spellcasting and weapon use into a single harmonious act. When you use your action to cast a bard spell, you can make one weapon attack as a bonus action."
        },
        {
          "level": 14,
          "name": "Battle Magic",
          "desc": "After you cast a spell that has a casting time of an action, you can make one attack with a weapon as a Bonus Action."
        }
      ]
    },
    "College of Whispers": {
      "features": [
        {
          "level": 3,
          "name": "College of Whispers",
          "desc": "Most folk are happy to welcome a bard into their midst. Bards of the College of Whispers use this to their advantage. They appear to be like other bards, sharing news, singing songs, and telling tales to the audiences they gather. In truth, the College of Whispers teaches its students that they are wolves among sheep. These bards use their knowledge and magic to uncover secrets and turn them against others through extortion and threats.\nMany other bards hate the College of Whispers, viewing it as a parasite that uses a bard's reputation to acquire wealth and power. For this reason, members of this college rarely reveal their true nature. They typically claim to follow some other college, or they keep their actual calling secret in order to infiltrate and exploit royal courts and other settings of power."
        },
        {
          "level": 3,
          "name": "Psychic Blades",
          "desc": "When you join the College of Whispers at 3rd level, you gain the ability to make your weapon attacks magically toxic to a creature's mind.\nWhen you hit a creature with a weapon attack, you can expend one use of your Bardic Inspiration to deal an extra 2d6 psychic damage to that target. You can do so only once per round on your turn.\nThe psychic damage increases when you reach certain levels in this class, increasing to 3d6 at 5th level, 5d6 at 10th level, and 8d6 at 15th level."
        },
        {
          "level": 3,
          "name": "Words of Terror",
          "desc": "At 3rd level, you learn to infuse innocent-seeming words with an insidious magic that can inspire terror.\nIf you speak to a humanoid alone for at least 1 minute, you can attempt to seed paranoia in its mind. At the end of the conversation, the target must succeed on a Wisdom saving throw against your spell save DC or be frightened of you or another creature of your choice. The target is frightened in this way for 1 hour, until it is attacked or damaged, or until it witnesses its allies being attacked or damaged.\nIf the target succeeds on its saving throw, the target has no hint that you tried to frighten it.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 6,
          "name": "Mantle of Whispers",
          "desc": "At 6th level, you gain the ability to adopt a humanoid's persona. When a humanoid dies within 30 feet of you, you can magically capture its shadow using your reaction. You retain this shadow until you use it or you finish a long rest.\nYou can use the shadow as an action. When you do so, it vanishes, magically transforming into a disguise that appears on you. You now look like the dead person, but healthy and alive. This disguise lasts for 1 hour or until you end it as a bonus action.\nWhile you're in the disguise, you gain access to all information that the humanoid would freely share with a casual acquaintance. Such information includes general details on its background and personal life, but doesn't include secrets. The information is enough that you can pass yourself off as the person by drawing on its memories.\nAnother creature can see through this disguise by succeeding on a Wisdom (Insight) check contested by your Charisma (Deception) check. You gain a +5 bonus to your check.\nOnce you capture a shadow with this feature, you can't capture another one with it until you finish a short or long rest."
        },
        {
          "level": 14,
          "name": "Shadow Lore",
          "desc": "At 14th level, you gain the ability to weave dark magic into your words and tap into a creature's deepest fears.\nAs an action, you magically whisper a phrase that only one creature of your choice within 30 feet of you can hear. The target must make a Wisdom saving throw against your spell save DC. It automatically succeeds if it doesn't share a language with you or if it can't hear you. On a successful saving throw, your whisper sounds like unintelligible mumbling and has no effect.\nOn a failed saving throw, the target is charmed by you for the next 8 hours or until you or your allies attack it, damage it, or force it to make a saving throw. It interprets the whispers as a description of its most mortifying secret. You gain no knowledge of this secret, but the target is convinced you know it.\nThe charmed creature obeys your commands for fear that you will reveal its secret. It won't risk its life for you or fight for you, unless it was already inclined to do so. It grants you favors and gifts it would offer to a close friend.\nWhen the effect ends, the creature has no understanding of why it held you in such fear.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    },
    "College of the Moon": {
      "features": [
        {
          "level": 3,
          "name": "College of the Moon",
          "desc": "Inspire Allies with Primal Tales\nThe College of the Moon traces its origins to the ancient druidic circles of the Moonshae Isles, who entrusted the first Bards of this tradition with chronicling the stories of the islands and their people. Bards of this college draw from the isles' fey magic and the primal power of the moonwells to bolster their allies, protect the natural world, and inspire their bardic works."
        },
        {
          "level": 3,
          "name": "Moon's Inspiration",
          "desc": "The primal and ever-changing power of the moon flows through you, granting you the following benefits.\nInspired Eclipse: When you take a Bonus Action to give a creature a Bardic Inspiration die, you can have the Invisible condition and teleport up to 30 feet to an unoccupied space you can see as part of that Bonus Action. This invisibility lasts until the start of your next turn and ends early immediately after you make an attack roll, deal damage, or cast a spell.\nLunar Vitality: Once per turn when you restore Hit Points to a creature with a spell, you can expend a Bardic Inspiration die and increase the amount of Hit Points restored by a number equal to a roll of the Bardic Inspiration die. The creature's Speed also increases by 10 feet until the end of its next turn."
        },
        {
          "level": 3,
          "name": "Primal Lore",
          "desc": "You learn Druidic and one cantrip from the Druid spell list. It counts as a Bard spell for you but doesn't count against the number of cantrips you know. Whenever you gain a Bard level, you can replace this cantrip with another cantrip of your choice from the Druid spell list.\nAdditionally, choose one of the following skills: Animal Handling, Insight, Medicine, Nature, Perception, or Survival. You have proficiency in that skill."
        },
        {
          "level": 6,
          "name": "Blessing of Moonlight",
          "desc": "You always have the Moonbeam spell prepared.\nWhen you cast Moonbeam, you can modify the spell so that you glow faintly while the spell is active. While glowing, you shed Dim Light out to 5 feet, and whenever a creature fails its saving throw against the effects of this Moonbeam, another creature of your choice that you can see within 60 feet of yourself regains 2d4 Hit Points.\nOnce you use this feature to modify a casting of Moonbeam, you can't use it again until you finish a Long Rest."
        },
        {
          "level": 14,
          "name": "Eventide's Splendor",
          "desc": "You become suffused with the might of the moon, improving your Moon's Inspiration in the following ways.\nShadow of the New Moon: When you use Inspired Eclipse, the creature who received the Bardic Inspiration die can also have the Invisible condition and immediately take a Reaction to teleport up to 30 feet to an unoccupied space it can see. The creature remains Invisible until the start of its next turn.\nVibrance of the Full Moon: When you use Lunar Vitality, you can roll 1d6 and use the number rolled in place of expending a Bardic Inspiration die."
        }
      ]
    }
  },
  "Cleric": {
    "Ambition Domain (PSA)": {
      "features": [
        {
          "level": 1,
          "name": "Ambition Domain (PSA)",
          "desc": "The worthy shall strive for greatness\u2014supremacy in life leads to supremacy in the afterlife.\nBontu has fully embraced this dictum, and though she expends little effort in teaching it, she surely leads by example. Her viziers subtly plant the seeds that flower into the ambition the God-Pharaoh desires. Through insinuation, they remind acolytes and initiates alike that achieving one's place in the afterlife at the expense of others is not shameful, but is proof of the initiate's determination and drive. Nothing is more important than that drive, they suggest\u2014not the bonds of a crop, not friendship or love. Not even devotion to a deity.\nAt each indicated cleric level, add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Bane, Disguise Self\n3rd \u2014 Mirror Image, Ray Of Enfeeblement\n5th \u2014 Bestow Curse, Vampiric Touch\n7th \u2014 Death Ward, Dimension Door\n9th \u2014 Dominate Person, Modify Memory"
        },
        {
          "level": 1,
          "name": "Warding Flare",
          "desc": "When you choose this domain at 1st level, you can interpose divine light between yourself and an attacking enemy. When you are attacked by a creature within 30 feet of you that you can see, you can use your reaction to impose disadvantage on the attack roll, causing light to flare before the attacker before it hits or misses. An attacker that can't be blinded is immune to this feature.\nYou can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Invoke Duplicity",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to create an illusory duplicate of yourself.\nAs an action, you create a perfect illusion of yourself that lasts for 1 minute, or until you lose your concentration (as if you were concentrating on a spell). The illusion appears in an unoccupied space that you can see within 30 feet of you. As a bonus action on your turn, you can move the illusion up to 30 feet to a space you can see, but it must remain within 120 feet of you.\nFor the duration, you can cast spells as though you were in the illusion's space, but you must use your own senses. Additionally, when both you and your illusion are within 5 feet of a creature that can see the illusion, you have advantage on attack rolls against that creature, given how distracting the illusion is to the target."
        },
        {
          "level": 6,
          "name": "Channel Divinity: Cloak of Shadows",
          "desc": "Starting at 6th level, you can use your Channel Divinity to vanish. As an action, you become invisible until the end of your next turn. You become visible if you attack or cast a spell."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Potent Spellcasting feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Potent Spellcasting",
          "desc": "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip."
        },
        {
          "level": 17,
          "name": "Improved Duplicity",
          "desc": "At 17th level, you can create up to four duplicates of yourself, instead of one, when you use Invoke Duplicity. As a bonus action on your turn, you can move any number of them up to 30 feet, to a maximum range of 120 feet."
        }
      ]
    },
    "Arcana Domain": {
      "features": [
        {
          "level": 1,
          "name": "Arcana Domain",
          "desc": "Magic is an energy that suffuses the multiverse and that fuels both destruction and creation. Gods of the Arcana domain know the secrets and potential of magic intimately. For some of these gods, magical knowledge is a great responsibility that comes with a special understanding of the nature of reality. Other gods of Arcana see magic as pure power, to be used as its wielder sees fit.\nThe gods of this domain are often associated with knowledge, as learning and arcane power tend to go hand-in-hand. In the Realms, deities of this domain include SCAG and SCAG, as well as SCAG of the elven pantheon. In other worlds, this domain includes Hecate, Math Mathonwy, and Isis; the triple moon gods of Solinari, Lunitari, and Nuitari of Krynn; and Boccob, Vecna, and Wee Jas of Greyhawk.\nAt each indicated cleric level, add the listed spells to your spells prepared. They do not count towards your limit.\nCleric Level | Spells\n1st \u2014 Detect Magic, Magic Missile\n3rd \u2014 Magic Weapon, Nystul'S Magic Aura\n5th \u2014 Dispel Magic, Magic Circle\n7th \u2014 Arcane Eye, Leomund'S Secret Chest\n9th \u2014 Planar Binding, Teleportation Circle"
        },
        {
          "level": 1,
          "name": "Arcane Initiate",
          "desc": "When you choose this domain at 1st level, you gain proficiency in the Arcana skill, and you gain two cantrips of your choice from the wizard spell list. For you, these cantrips count as cleric cantrips."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Arcane Abjuration",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to abjure otherworldly creatures.\nAs an action, you present your holy symbol, and one celestial, elemental, fey, or fiend of your choice that is within 30 feet of you must make a Wisdom saving throw, provided that the creature can see or hear you. If the creature fails its saving throw, it is turned for 1 minute or until it takes any damage.\nA turned creature must spend its turns trying to move as far away from you as it can, and it can't willingly end its move in a space within 30 feet of you. It also can't take reactions. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, then the creature can use the Dodge action.\nAfter you reach 5th level, when a creature fails its saving throw against your Arcane Abjuration feature, the creature is banished for 1 minute (as in the Banishment spell, no concentration required) if it isn't on its plane of origin, and its challenge rating is at or below a certain threshold, as shown below.\nCleric level | Banishes Creatures of CR...\n5th \u2014 1/2 or lower\n8th \u2014 1 or lower\n11th \u2014 2 or lower\n14th \u2014 3 or lower\n17th \u2014 4 or lower"
        },
        {
          "level": 3,
          "name": "Arcana Domain",
          "desc": "Amplify Your Magical Power\nMagic suffuses the multiverse and fuels both destruction and creation. Clerics with the Arcana Domain view magical knowledge not as power to be used in pursuit of personal ends, but as a gift they have the responsibility to share.\nGods associated with the Arcana Domain know the secrets and potential of magic intimately. These gods are often connected to knowledge, secrecy, or power."
        },
        {
          "level": 3,
          "name": "Arcana Domain Spells",
          "desc": "Your connection to this divine domain means you always have certain spells ready. When you reach a Cleric level specified in the Arcana Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Prepared Spells\n3 \u2014 Detect Magic, Magic Missile, Magic Weapon, Nystul'S Magic Aura\n5 \u2014 Counterspell, Dispel Magic\n7 \u2014 Arcane Eye, Leomund'S Secret Chest\n9 \u2014 Bigby'S Hand, Teleportation Circle"
        },
        {
          "level": 3,
          "name": "Fortifying Spell",
          "desc": "One target of the spell gains a number of Temporary Hit Points equal to 2d8 plus your Cleric level."
        },
        {
          "level": 3,
          "name": "Modify Magic",
          "desc": "You can use your Channel Divinity to alter your spells as you cast them. When you cast a spell, you can expend one use of your Channel Divinity and change the spell in one of the following ways (no action required)."
        },
        {
          "level": 3,
          "name": "Student of Arcana",
          "desc": "You gain the following benefits.\nMagical Knowledge: You gain proficiency in the Arcana skill or one skill of your choice from the skills available to Clerics at level 1.\nCantrips: You learn two Wizard cantrips of your choice. Whenever you gain a Cleric level, you can replace one of these cantrips with another Wizard cantrip."
        },
        {
          "level": 3,
          "name": "Tenacious Spell",
          "desc": "When you cast a spell that forces a creature to make a saving throw, and a creature you can see succeeds on that saving throw, roll 1d6 and subtract the number rolled from the target's first saving throw against the spell's effect."
        },
        {
          "level": 6,
          "name": "Dispelling Recovery",
          "desc": "Immediately after you cast a spell with a spell slot that restores Hit Points to a creature or ends a condition on a creature, you can cast Dispel Magic as part of that action, Bonus Action, or Reaction, and without expending a spell slot.\nOnce you use this feature, you can't use it again until you finish a Short or Long Rest. You also restore your use of it by expending one use of Channel Divinity (no action required)."
        },
        {
          "level": 6,
          "name": "Spell Breaker",
          "desc": "Starting at 6th level, when you restore hit points to an ally with a spell of 1st level or higher, you can also end one spell of your choice on that creature. The level of the spell you end must be equal to or lower than the level of the spell slot you use to cast the healing spell."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Potent Spellcasting feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Potent Spellcasting",
          "desc": "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip."
        },
        {
          "level": 17,
          "name": "Arcane Mastery",
          "desc": "At 17th level, you choose four spells from the Wizard spell list, one from each of the following levels: 6th, 7th, 8th, and 9th. You add them to your list of domain spells. Like your other domain spells, they are always prepared and count as cleric spells for you."
        },
        {
          "level": 17,
          "name": "Magical Mastery",
          "desc": "You learn four Wizard spells, one from each of levels 6, 7, 8, and 9. You thereafter always have those spells prepared. Whenever you gain a Cleric level, you can replace one of these spells with another Wizard spell of the same level."
        }
      ]
    },
    "Death Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiency",
          "desc": "When the cleric chooses this domain at 1st level, he or she gains proficiency with martial weapons."
        },
        {
          "level": 1,
          "name": "Death Domain",
          "desc": "The Death domain is concerned with the forces that cause death, as well as the negative energy that gives rise to undead creatures. Deities such as Chemosh, Myrkul, and Wee Jas are patrons of necromancers, death knights, liches, mummy lords, and vampires. Gods of the Death domain also embody murder (Anubis, Bhaal, and Pyremius), pain (Iuz or Loviatar), disease or poison (Incabulos, Talona, or Morgion), and the underworld (Hades and Hel).\nAt each indicated cleric level, add the listed spells to your spells prepared. They do not count towards your limit.\nCleric Level | Spells\n1st \u2014 False Life, Ray Of Sickness\n3rd \u2014 Blindness/Deafness, Ray Of Enfeeblement\n5th \u2014 Animate Dead, Vampiric Touch\n7th \u2014 Blight, Death Ward\n9th \u2014 Antilife Shell, Cloudkill"
        },
        {
          "level": 1,
          "name": "Reaper",
          "desc": "At 1st level, the cleric learns one necromancy cantrip of his or her choice from any spell list. When the cleric casts a necromancy cantrip that normally targets only one creature, the spell can instead target two creatures within range and within 5 feet of each other."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Touch of Death",
          "desc": "Starting at 2nd level, the cleric can use Channel Divinity to destroy another creature's life force by touch.\nWhen the cleric hits a creature with a melee attack, the cleric can use Channel Divinity to deal extra necrotic damage to the target. The damage equals 5 + twice his or her cleric level."
        },
        {
          "level": 6,
          "name": "Inescapable Destruction",
          "desc": "Starting at 6th level, the cleric's ability to channel negative energy becomes more potent. Necrotic damage dealt by the character's cleric spells and Channel Divinity options ignores resistance to necrotic damage."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, the cleric gains the ability to infuse his or her weapon strikes with necrotic energy. Once on each of the cleric's turns when he or she hits a creature with a weapon attack, the cleric can cause the attack to deal an extra 1d8 necrotic damage to the target. When the cleric reaches 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Improved Reaper",
          "desc": "Starting at 17th level, when the cleric casts a Necromancy spell of 1st through 5th-level that targets only one creature, the spell can instead target two creatures within range and within 5 feet of each other. If the spell consumes its material components, the cleric must provide them for each target."
        }
      ]
    },
    "Forge Domain": {
      "features": [
        {
          "level": 1,
          "name": "Blessing of the Forge",
          "desc": "At 1st level, you gain the ability to imbue magic into a weapon or armor. At the end of a long rest, you can touch one nonmagical object that is a suit of armor or a simple or martial weapon. Until the end of your next long rest or until you die, the object becomes a magic item, granting a +1 bonus to AC if it's armor or a +1 bonus to attack and damage rolls if it's a weapon.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 1,
          "name": "Bonus Proficiency",
          "desc": "When you choose this domain at 1st level, you gain proficiency with heavy armor and smith's tools."
        },
        {
          "level": 1,
          "name": "Forge Domain",
          "desc": "The gods of the forge are patrons of artisans who work with metal, from a humble blacksmith who keeps a village in horseshoes and plow blades to the mighty elf artisan whose diamond-tipped arrows of mithral have felled demon lords. The gods of the forge teach that, with patience and hard work, even the most intractable metal can be transformed from a lump of ore to a beautifully wrought object. Clerics of these deities search for objects lost to the forces of darkness, liberate mines overrun by orcs, and uncover rare and wondrous materials necessary to create potent magic items. Followers of these gods take great pride in their work, and they are willing to craft and use heavy armor and powerful weapons to protect them. Deities of this domain include Gond, Reorx, Onatar, Moradin, Hephaestus, and Goibhniu.\nAt each indicated cleric level, add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Identify, Searing Smite\n3rd \u2014 Heat Metal, Magic Weapon\n5th \u2014 Elemental Weapon, Protection From Energy\n7th \u2014 Fabricate, Wall Of Fire\n9th \u2014 Animate Objects, Creation"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Artisan's Blessing",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to create simple items.\nYou conduct an hour-long ritual that crafts a nonmagical item that must include some metal: a simple or martial weapon, a suit of armor, ten pieces of ammunition, a set of tools, or another metal object (see chapter 5, \"Equipment,\" in the Player's Handbook for examples of these items). The creation is completed at the end of the hour, coalescing in an unoccupied space of your choice on a surface within 5 feet of you.\nThe thing you create can be something that is worth no more than 100 gp. As part of this ritual, you must lay out metal, which can include coins, with a value equal to the creation. The metal irretrievably coalesces and transforms into the creation at the ritual's end, magically forming even nonmetal parts of the creation. The ritual can create a duplicate of a nonmagical item that contains metal, such as a key, if you possess the original during the ritual."
        },
        {
          "level": 6,
          "name": "Soul of the Forge",
          "desc": "Starting at 6th level, your mastery of the forge grants you special abilities:\n\u2022 You gain resistance to fire damage.\n\u2022 While wearing heavy armor, you gain a +1 bonus to AC."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with the fiery power of the forge. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 fire damage to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Saint of Forge and Fire",
          "desc": "At 17th level, your blessed affinity with fire and metal becomes more powerful:\n\u2022 You gain immunity to fire damage,\n\u2022 While wearing heavy armor, you have resistance to bludgeoning, piercing, and slashing damage from nonmagical attacks."
        }
      ]
    },
    "Grave Domain": {
      "features": [
        {
          "level": 1,
          "name": "Circle of Mortality",
          "desc": "At 1st level, you gain the ability to manipulate the line between life and death. When you would normally roll one or more dice to restore hit points with a spell to a creature at 0 hit points, you instead use the highest number possible for each die.\nIn addition, you learn the Spare The Dying cantrip, which doesn't count against the number of cleric cantrips you know. For you, it has a range of 30 feet, and you can cast it as a bonus action."
        },
        {
          "level": 1,
          "name": "Eyes of the Grave",
          "desc": "At 1st level, you gain the ability to occasionally sense the presence of the undead, whose existence is an insult to the natural cycle of life. As an action, you can open your awareness to magically detect undead. Until the end of your next turn, you know the location of any undead within 60 feet of you that isn't behind Cover and that isn't protected from divination magic. This sense doesn't tell you anything about a creature's capabilities or identity.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 1,
          "name": "Grave Domain",
          "desc": "Gods of the grave watch over the line between life and death. To these deities, death and the afterlife are a foundational part of the multiverse. To desecrate the peace of the dead is an abomination. Deities of the grave include Kelemvor, Wee Jas, the ancestral spirits of the Undying Court, Hades, Anubis, and Osiris. Followers of these deities seek to put wandering spirits to rest, destroy the undead, and ease the suffering of the dying. Their magic also allows them to stave off death for a time, particularly for a person who still has some great work to accomplish in the world. This is a delay of death, not a denial of it, for death will eventually get its due.\nCleric Level | Spells\n1st \u2014 Bane, False Life\n3rd \u2014 Gentle Repose, Ray Of Enfeeblement\n5th \u2014 Revivify, Vampiric Touch\n7th \u2014 Blight, Death Ward\n9th \u2014 Antilife Shell, Raise Dead"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Path to the Grave",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to mark another creature's life force for termination.\nAs an action, you choose one creature you can see within 30 feet of you, cursing it until the end of your next turn. The next time you or an ally of yours hits the cursed creature with an attack, the creature has vulnerability to all of that attack's damage, and then the curse ends."
        },
        {
          "level": 3,
          "name": "Circle of Mortality",
          "desc": "You can manipulate the balance between life and death, granting you the following benefits.\nPull of Death: Once per turn, when you deal damage to a creature that's missing any Hit Points by casting a spell or by hitting with an attack roll, that creature takes an extra 1d4 Necrotic damage. This extra damage increases to 1d6 when you reach Cleric level 11.\nReturn to Life: You can cast Spare The Dying as a Bonus Action. Additionally, when you would normally roll one or more dice to restore Hit Points to a creature at 0 Hit Points with a spell or Channel Divinity, don't roll those dice for the healing; instead, use the highest number possible for each die. For example, instead of restoring 2d4 Hit Points to a creature at 0 Hit Points with a spell, you restore 8."
        },
        {
          "level": 3,
          "name": "Grave Domain",
          "desc": "Embody Deific Forces of Death\nThe Grave Domain concerns itself with the boundary between life and death. To those who tap into this domain's power, death is a natural and inevitable part of the multiverse. Such Clerics seek to destroy undead and shepherd spirits.\nThe magic of this domain also allows these Clerics to stave off death for a time. But this is merely a delay of death, not a denial of it, for the grave will always claim its due."
        },
        {
          "level": 3,
          "name": "Grave Domain Spells",
          "desc": "Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the Grave Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Spells\n3 \u2014 Detect Evil And Good, False Life, Gentle Repose, Ray Of Enfeeblement, Spare The Dying\n5 \u2014 Revivify, Vampiric Touch\n7 \u2014 Blight, Death Ward\n9 \u2014 Dispel Evil And Good, Raise Dead"
        },
        {
          "level": 3,
          "name": "Path to the Grave",
          "desc": "As a Bonus Action, you present your Holy Symbol and expend a use of Channel Divinity to curse one creature you can see within 30 feet of yourself until the start of your next turn. While cursed, the creature has Disadvantage on attack rolls and saving throws.\nWhen you or an ally you can see hits the cursed target with an attack roll, you can end the curse early (no action required) to make the attack deal extra Necrotic or Radiant damage (your choice) equal to your Cleric level."
        },
        {
          "level": 6,
          "name": "Sentinel at Death's Door",
          "desc": "At 6th level, you gain the ability to impede death's progress. As a reaction when you or a creature you can see within 30 feet of you suffers a critical hit, you can turn that hit into a normal hit. Any effects triggered by a critical hit are canceled.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 6,
          "name": "Sentinel at Death's Door",
          "desc": "When you or a Bloodied creature you can see within 60 feet of yourself is hit with an attack roll, you can take a Reaction to halve that attack's damage (round down). If the triggering attack roll was a Critical Hit, any effects triggered by a Critical Hit are canceled.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Potent Spellcasting feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Potent Spellcasting",
          "desc": "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip."
        },
        {
          "level": 17,
          "name": "Divine Reaper",
          "desc": "Your deep connection to this domain renders you a hallowed harbinger of death, granting you the following benefits.\nEnhanced Necromancy: When you cast a spell of level 5 or lower from the Necromancy school that targets one creature, or when you cast a spell from the Grave Domain Spells, you can expend a use of Channel Divinity to target a second creature within the spell's range. If the spell requires costly or consumed Material components, you must provide Material components for each target.\nKeeper of Souls: When an enemy dies within 60 feet of you, you or one creature you can see within 60 feet of yourself regains Hit Points equal to twice your Cleric level. You can't use this feature if you have the Incapacitated condition. Once you use this feature, you can't use it again until you finish a Short or Long Rest, unless you expend a level 6+ spell slot (no action required) to restore your use of it."
        },
        {
          "level": 17,
          "name": "Keeper of Souls",
          "desc": "Starting at 17th level, you can seize a trace of vitality from a parting soul and use it to heal the living. When an enemy you can see dies within 60 feet of you, you or one creature of your choice that is within 60 feet of you regains hit points equal to the enemy's number of Hit Dice. You can use this feature only if you aren't incapacitated. Once you use it, you can't do so again until the start of your next turn."
        }
      ]
    },
    "Knowledge Domain": {
      "features": [
        {
          "level": 1,
          "name": "Blessings of Knowledge",
          "desc": "At 1st level, you learn two languages of your choice. You also become proficient in your choice of two of the following skills: Arcana, History, Nature, or Religion.\nYour proficiency bonus is doubled for any ability check you make that uses either of those skills."
        },
        {
          "level": 1,
          "name": "Knowledge Domain",
          "desc": "The gods of knowledge\u2014including Oghma, Boccob, Gilean, Aureon, and Thoth\u2014value learning and understanding above all. Some teach that knowledge is to be gathered and shared in libraries and universities, or promote the practical knowledge of craft and invention. Some deities hoard knowledge and keep its secrets to themselves. And some promise their followers that they will gain tremendous power if they unlock the secrets of the multiverse. Followers of these gods study esoteric lore, collect old tomes, delve into the secret places of the earth, and learn all they can. Some gods of knowledge promote the practical knowledge of craft and invention, including smith deities like Gond, Reorx, Onatar, Moradin, Hephaestus, and Goibhniu.\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Command, Identify\n3rd \u2014 Augury, Suggestion\n5th \u2014 Nondetection, Speak With Dead\n7th \u2014 Arcane Eye, Confusion\n9th \u2014 Legend Lore, Scrying"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Knowledge of the Ages",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to tap into a divine well of knowledge. As an action, you choose one skill or tool. For 10 minutes, you have proficiency with the chosen skill or tool."
        },
        {
          "level": 3,
          "name": "Blessings of Knowledge",
          "desc": "You gain proficiency with one type of Artisan's Tools of your choice and in two of the following skills of your choice: Arcana, History, Nature, or Religion. You have Expertise in those two skills."
        },
        {
          "level": 3,
          "name": "Knowledge Domain",
          "desc": "Unearth Secrets and Master the Mind\nThe Knowledge Domain values learning and understanding above all. Clerics who tap into this domain study esoteric lore, collect old tomes, delve into secret places, and examine the processes of the mind. To them, knowledge is more valuable than material wealth, and learning is an act of worship. Libraries, universities, and other educational institutions also draw on the power of the Knowledge Domain.\nGods of knowledge vary from masters of arcane magic to patrons of craft and invention. In Faer\u00fbn, Clerics of the Knowledge Domain worship deities of learning and ingenuity such as FRHoF and FRHoF, among many others."
        },
        {
          "level": 3,
          "name": "Knowledge Domain Spells",
          "desc": "When you reach a Cleric level specified in the Knowledge Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Spells\n3 \u2014 Command, Comprehend Languages*, Detect Magic*, Detect Thoughts*, Identify*, Mind Spike*\n5 \u2014 Dispel Magic, Nondetection, Tongues*\n7 \u2014 Arcane Eye*, Banishment, Confusion\n9 \u2014 Legend Lore*, Scrying*, Synaptic Static"
        },
        {
          "level": 3,
          "name": "Mind Magic",
          "desc": "As a Magic action, you can expend one use of your Channel Divinity to manifest your magical knowledge. Choose one spell from the Divination school on the Knowledge Domain Spells table that you have prepared. As part of that action, you cast that spell without expending a spell slot or needing Material components."
        },
        {
          "level": 6,
          "name": "Channel Divinity: Read Thoughts",
          "desc": "At 6th level, you can use your Channel Divinity to read a creature's thoughts. You can then use your access to the creature's mind to command it.\nAs an action, choose one creature that you can see within 60 feet of you. That creature must make a Wisdom saving throw. If the creature succeeds on the saving throw, you can't use this feature on it again until you finish a long rest.\nIf the creature fails its save, you can read its surface thoughts (those foremost in its mind, reflecting its current emotions and what it is actively thinking about) when it is within 60 feet of you. This effect lasts for 1 minute.\nDuring that time, you can use your action to end this effect and cast the Suggestion spell on the creature without expending a spell slot. The target automatically fails its saving throw against the spell."
        },
        {
          "level": 6,
          "name": "Unfettered Mind",
          "desc": "You gain telepathy out to 60 feet. When you use this telepathy, you can simultaneously contact a number of creatures equal to your Wisdom modifier (minimum of one).\nAdditionally, you gain proficiency in Intelligence saving throws. If you already have this proficiency, you instead gain saving throw proficiency with one ability in which you lack it."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Potent Spellcasting feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Potent Spellcasting",
          "desc": "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip."
        },
        {
          "level": 17,
          "name": "Divine Foreknowledge",
          "desc": "As a Bonus Action, you magically expand your mind to the future. For 1 hour, you have Advantage on D20 Tests. Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of this feature by expending a level 6+ spell slot (no action required)."
        },
        {
          "level": 17,
          "name": "Visions of the Past",
          "desc": "Starting at 17th level, you can call up visions of the past that relate to an object you hold or your immediate surroundings. You spend at least 1 minute in meditation and prayer, then receive dreamlike, shadowy glimpses of recent events. You can meditate in this way for a number of minutes equal to your Wisdom score and must maintain concentration during that time, as if you were casting a spell.\nOnce you use this feature, you can't use it again until you finish a short or long rest.\nObject Reading: Holding an object as you meditate, you can see visions of the object's previous owner. After meditating for 1 minute, you learn how the owner acquired and lost the object, as well as the most recent significant event involving the object and that owner. If the object was owned by another creature in the recent past (within a number of days equal to your Wisdom score), you can spend 1 additional minute for each owner to learn the same information about that creature.\nArea Reading: As you meditate, you see visions of recent events in your immediate vicinity (a room, street, tunnel, clearing, or the like, up to a 50-foot cube), going back a number of days equal to your Wisdom score. For each minute you meditate, you learn about one significant event, beginning with the most recent. Significant events typically involve powerful emotions, such as battles and betrayals, marriages and murders, births and funerals. However, they might also include more mundane events that are nevertheless important in your current situation."
        }
      ]
    },
    "Knowledge Domain (PSA)": {
      "features": [
        {
          "level": 1,
          "name": "Knowledge Domain (PSA)",
          "desc": "The worthy shall cultivate a nimble mind that can perceive the wonders beyond imagination that wait in the afterlife.\nKefnet's task is to pass on this teaching of the God-Pharaoh and elucidate its meaning. He teaches that the afterlife will be inhabited only by those who have proved by their wits that they are worthy of dwelling in the glorious presence of the God-Pharaoh. He trains acolytes and initiates to push their limits and challenge their mental capacity with spells of ever-greater power.\nKefnet's domain is identical to the Knowledge domain in the Player's Handbook."
        }
      ]
    },
    "Life Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiency",
          "desc": "When you choose this domain at 1st level, you gain proficiency with heavy armor."
        },
        {
          "level": 1,
          "name": "Disciple of Life",
          "desc": "Also starting at 1st level, your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore hit points to a creature, the creature regains additional hit points equal to 2 + the spell's level."
        },
        {
          "level": 1,
          "name": "Life Domain",
          "desc": "The Life domain focuses on the vibrant positive energy\u2014one of the fundamental forces of the universe\u2014that sustains all life. The gods of life promote vitality and health through healing the sick and wounded, caring for those in need, and driving away the forces of death and undeath. Almost any non-evil deity can claim influence over this domain, particularly agricultural deities (such as Chauntea, Arawai, and Demeter), sun gods (such as Lathander, Pelor, and Re-Horakhty), gods of healing or endurance (such as Ilmater, Mishakal, Apollo, and Diancecht), and gods of home and community (such as Hestia, Hathor, and Boldrei).\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Bless, Cure Wounds\n3rd \u2014 Lesser Restoration, Spiritual Weapon\n5th \u2014 Beacon Of Hope, Revivify\n7th \u2014 Death Ward, Guardian Of Faith\n9th \u2014 Mass Cure Wounds, Raise Dead"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Preserve Life",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to heal the badly injured.\nAs an action, you present your holy symbol and evoke healing energy that can restore a number of hit points equal to five times your cleric level. Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum. You can't use this feature on an undead or a construct."
        },
        {
          "level": 3,
          "name": "Disciple of Life",
          "desc": "When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level."
        },
        {
          "level": 3,
          "name": "Life Domain",
          "desc": "Soothe the Hurts of the World\nThe Life Domain focuses on the positive energy that helps sustain all life in the multiverse. Clerics who tap into this domain are masters of healing, using that life force to cure many hurts.\nExistence itself relies on the positive energy associated with this domain, so a Cleric of almost any religious tradition might choose it. This domain is particularly associated with agricultural deities, gods of healing or endurance, and gods of home and community. Religious orders of healing also seek the magic of this domain."
        },
        {
          "level": 3,
          "name": "Life Domain Spells",
          "desc": "Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the Life Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Prepared Spells\n3rd \u2014 Aid, Bless, Cure Wounds, Lesser Restoration\n5th \u2014 Mass Healing Word, Revivify\n7th \u2014 Aura Of Life, Death Ward\n9th \u2014 Greater Restoration, Mass Cure Wounds"
        },
        {
          "level": 3,
          "name": "Preserve Life",
          "desc": "As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum."
        },
        {
          "level": 6,
          "name": "Blessed Healer",
          "desc": "Beginning at 6th level, the healing spells you cast on others heal you as well. When you cast a spell of 1st level or higher that restores hit points to a creature other than you, you regain hit points equal to 2 + the spell's level."
        },
        {
          "level": 6,
          "name": "Blessed Healer",
          "desc": "The healing spells you cast on others heal you as well. Immediately after you cast a spell with a spell slot that restores Hit Points to one or more creatures other than yourself, you regain Hit Points equal to 2 plus the spell slot's level."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Supreme Healing",
          "desc": "Starting at 17th level, when you would normally roll one or more dice to restore hit points with a spell, you instead use the highest number possible for each die. For example, instead of restoring 2d6 hit points to a creature, you restore 12."
        },
        {
          "level": 17,
          "name": "Supreme Healing",
          "desc": "When you would normally roll one or more dice to restore Hit Points to a creature with a spell or Channel Divinity, don't roll those dice for the healing; instead use the highest number possible for each die. For example, instead of restoring 2d6 Hit Points to a creature with a spell, you restore 12."
        }
      ]
    },
    "Light Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Cantrip",
          "desc": "When you choose this domain at 1st level, you gain the Light cantrip if you don't already know it. This cantrip doesn't count against the number of cleric cantrips you know."
        },
        {
          "level": 1,
          "name": "Light Domain",
          "desc": "Gods of light\u2014including Helm, Lathander, Pholtus, Branchala, the Silver Flame, Belenus, Apollo, and Re-Horakhty\u2014promote the ideals of rebirth and renewal, truth, vigilance, and beauty, often using the symbol of the sun. Some of these gods are portrayed as the sun itself or as a charioteer who guides the sun across the sky. Others are tireless sentinels whose eyes pierce every shadow and see through every deception. Some are deities of beauty and artistry, who teach that art is a vehicle for the soul's improvement. Clerics of a god of light are enlightened souls infused with radiance and the power of their gods' discerning vision, charged with chasing away lies and burning away darkness.\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Burning Hands, Faerie Fire\n3rd \u2014 Flaming Sphere, Scorching Ray\n5th \u2014 Daylight, Fireball\n7th \u2014 Guardian Of Faith, Wall Of Fire\n9th \u2014 Flame Strike, Scrying"
        },
        {
          "level": 1,
          "name": "Warding Flare",
          "desc": "Also at 1st level, you can interpose divine light between yourself and an attacking enemy. When you are attacked by a creature within 30 feet of you that you can see, you can use your reaction to impose disadvantage on the attack roll, causing light to flare before the attacker before it hits or misses. An attacker that can't be blinded is immune to this feature.\nYou can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Radiance of the Dawn",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to harness sunlight, banishing darkness and dealing radiant damage to your foes.\nAs an action, you present your holy symbol, and any magical darkness within 30 feet of you is dispelled. Additionally, each hostile creature within 30 feet of you must make a Constitution saving throw. A creature takes radiant damage equal to 2d10 + your cleric level on a failed saving throw, and half as much damage on a successful one. A creature that has Cover from you is not affected."
        },
        {
          "level": 3,
          "name": "Light Domain",
          "desc": "Bring Light to Banish Darkness\nThe Light Domain emphasizes the divine power to bring about blazing fire and revelation. Clerics who wield this power are enlightened souls infused with radiance and the power of their deities' discerning vision, charged with chasing away lies and burning away darkness.\nThe Light Domain is associated with gods of truth, vigilance, beauty, insight, and renewal. Some of these gods are identified with the sun or as charioteers who guide the sun across the sky. Others are sentinels who pierce deception. Some are deities of beauty and artistry who teach that art is a vehicle for the soul's improvement."
        },
        {
          "level": 3,
          "name": "Light Domain Spells",
          "desc": "Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the Light Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Prepared Spells\n3rd \u2014 Burning Hands, Faerie Fire, Scorching Ray, See Invisibility\n5th \u2014 Daylight, Fireball\n7th \u2014 Arcane Eye, Wall Of Fire\n9th \u2014 Flame Strike, Scrying"
        },
        {
          "level": 3,
          "name": "Radiance of the Dawn",
          "desc": "As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to emit a flash of light in a 30-foot Emanation originating from yourself. Any magical Darkness\u2014such as that created by the Darkness spell\u2014in that area is dispelled. Additionally, each creature of your choice in that area must make a Constitution saving throw, taking Radiant damage equal to 2d10 plus your Cleric level on a failed save or half as much damage on a successful one."
        },
        {
          "level": 3,
          "name": "Warding Flare",
          "desc": "When a creature that you can see within 30 feet of yourself makes an attack roll, you can take a Reaction to impose Disadvantage on the attack roll, causing light to flare before it hits or misses.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 6,
          "name": "Improved Flare",
          "desc": "Starting at 6th level, you can also use your Warding Flare feature when a creature that you can see within 30 feet of you attacks a creature other than you."
        },
        {
          "level": 6,
          "name": "Improved Warding Flare",
          "desc": "You regain all expended uses of your Warding Flare when you finish a Short or Long Rest.\nIn addition, whenever you use Warding Flare, you can give the target of the triggering attack a number of Temporary Hit Points equal to 2d6 plus your Wisdom modifier."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Potent Spellcasting feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Potent Spellcasting",
          "desc": "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip."
        },
        {
          "level": 17,
          "name": "Corona of Light",
          "desc": "Starting at 17th level, you can use your action to activate an aura of sunlight that lasts for 1 minute or until you dismiss it using another action. You emit bright light in a 60-foot radius and dim light 30 feet beyond that. Your enemies in the bright light have disadvantage on saving throws against any spell that deals fire or radiant damage."
        },
        {
          "level": 17,
          "name": "Corona of Light",
          "desc": "As a Magic action, you cause yourself to emit an aura of sunlight that lasts for 1 minute or until you dismiss it (no action required). You emit Bright Light in a 60-foot radius and Dim Light for an additional 30 feet. Your enemies in the Bright Light have Disadvantage on saving throws against your Radiance of the Dawn and any spell that deals Fire or Radiant damage.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        }
      ]
    },
    "Nature Domain": {
      "features": [
        {
          "level": 1,
          "name": "Acolyte of Nature",
          "desc": "At 1st level, you learn one druid cantrip of your choice. This cantrip doesn't count against the number of cleric cantrips you know. You also gain proficiency in one of the following skills of your choice: Animal Handling, Nature, or Survival."
        },
        {
          "level": 1,
          "name": "Bonus Proficiency",
          "desc": "Also at 1st level, you gain proficiency with heavy armor."
        },
        {
          "level": 1,
          "name": "Nature Domain",
          "desc": "Gods of nature are as varied as the natural world itself, from inscrutable gods of the deep forests (such as Silvanus, Obad-Hai, Chislev, Balinor, and Pan) to friendly deities associated with particular springs and groves (such as Eldath). Druids revere nature as a whole and might serve one of these deities, practicing mysterious rites and reciting all-but-forgotten prayers in their own secret tongue. But many of these gods have clerics as well, champions who take a more active role in advancing the interests of a particular nature god. These clerics might hunt the evil monstrosities that despoil the woodlands, bless the harvest of the faithful, or wither the crops of those who anger their gods.\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Animal Friendship, Speak With Animals\n3rd \u2014 Barkskin, Spike Growth\n5th \u2014 Plant Growth, Wind Wall\n7th \u2014 Dominate Beast, Grasping Vine\n9th \u2014 Insect Plague, Tree Stride"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Charm Animals and Plants",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to charm animals and plants.\nAs an action, you present your holy symbol and invoke the name of your deity. Each beast or plant creature that can see you within 30 feet of you must make a Wisdom saving throw. If the creature fails its saving throw, it is charmed by you for 1 minute or until it takes damage. While it is charmed by you, it is friendly to you and other creatures you designate."
        },
        {
          "level": 6,
          "name": "Dampen Elements",
          "desc": "Starting at 6th level, when you or a creature within 30 feet of you takes acid, cold, fire, lightning, or thunder damage, you can use your reaction to grant resistance to the creature against that instance of the damage."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 cold, fire, or lightning damage (your choice) to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Master of Nature",
          "desc": "At 17th level, you gain the ability to command animals and plant creatures. While creatures are charmed by your Charm Animals and Plants feature, you can take a bonus action on your turn to verbally command what each of those creatures will do on its next turn."
        }
      ]
    },
    "Order Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiencies",
          "desc": "When you choose this domain at 1st level, you gain proficiency with heavy armor. You also gain proficiency in the Intimidation or Persuasion skill (your choice)."
        },
        {
          "level": 1,
          "name": "Order Domain",
          "desc": "The Order Domain represents discipline, as well as devotion to a society or an institution and strict obedience to the laws governing it. On Ravnica, the domain is favored by clerics of the Azorius Senate, who use it to maintain and enforce the law, and of the Orzhov Syndicate, who exploit law and order for their personal gain. On other worlds, gods who grant access to this domain include Bane, Tyr, Majere, DMG, Pholtus, Wee Jas, Aureon, Maglubiyet, Nuada, Athena, Anubis, Forseti, and DMG.\nThe ideal of order is obedience to the law above all else, rather than to a specific individual or the passing influence of emotion or popular rule. Clerics of order are typically concerned with how things are done, rather than whether an action's results are just. Following the law and obeying its edicts is critical, especially when it benefits these clerics and their guilds or deities.\nLaw establishes hierarchies. Those selected by the law to lead must be obeyed. Those who obey must do so to the best of their ability. In this manner, law creates an intricate web of obligations that allows society to forge order and security in a chaotic multiverse.\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Command, Heroism\n3rd \u2014 Hold Person, Zone Of Truth\n5th \u2014 Mass Healing Word, Slow\n7th \u2014 Compulsion, Locate Creature\n9th \u2014 Commune, Dominate Person"
        },
        {
          "level": 1,
          "name": "Voice of Authority",
          "desc": "Starting at 1st level, you can invoke the power of law to drive an ally to attack. If you cast a spell with a spell slot of 1st level or higher and target an ally with the spell, that ally can use their reaction immediately after the spell to make one weapon attack against a creature of your choice that you can see.\nIf the spell targets more than one ally, you choose the ally who can make the attack."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Order's Demand",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to exert an intimidating presence over others.\nAs an action, you present your holy symbol, and each creature of your choice that can see or hear you within 30 feet of you must succeed on a Wisdom saving throw or be charmed by you until the end of your next turn or until the charmed creature takes any damage. You can also cause any of the charmed creatures to drop what they are holding when they fail the saving throw."
        },
        {
          "level": 6,
          "name": "Embodiment of the Law",
          "desc": "At 6th level, you become remarkably adept at channeling magical energy to compel others.\nIf you cast a spell of the enchantment school using a spell slot of 1st level or higher, you can change the spell's casting time to 1 bonus action for this casting, provided the spell's casting time is normally 1 action.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 psychic damage to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Order's Wrath",
          "desc": "Starting at 17th level, enemies you designate for destruction wilt under the combined efforts of you and your allies. If you deal your Divine Strike damage to a creature on your turn, you can curse that creature until the start of your next turn. The next time one of your allies hits the cursed creature with an attack, the target also takes 2d8 psychic damage, and the curse ends. You can curse a creature in this way only once per turn."
        }
      ]
    },
    "Peace Domain": {
      "features": [
        {
          "level": 1,
          "name": "Emboldening Bond",
          "desc": "1st-level Peace Domain feature\nYou can forge an empowering bond among people who are at peace with one another. As an action, you choose a number of willing creatures within 30 feet of you (this can include yourself) equal to your proficiency bonus. You create a magical bond among them for 10 minutes or until you use this feature again. While any bonded creature is within 30 feet of another, the creature can roll a d4 and add the number rolled to an attack roll, an ability check, or a saving throw it makes. Each creature can add the d4 no more than once per turn.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 1,
          "name": "Implement of Peace",
          "desc": "1st-level Peace Domain feature\nYou gain proficiency in the Insight, Performance, or Persuasion skill (your choice)."
        },
        {
          "level": 1,
          "name": "Peace Domain",
          "desc": "The balm of peace thrives at the heart of healthy communities, between friendly nations, and in the souls of the kindhearted. The gods of peace inspire people of all sorts to resolve conflict and to stand up against those forces that try to prevent peace from flourishing. See the Peace Deities table for a list of some of the gods associated with this domain.\nClerics of the Peace Domain preside over the signing of treaties, and they are often asked to arbitrate in disputes. These clerics' blessings draw people together and help them shoulder one another's burdens, and the clerics' magic aids those who are driven to fight for the way of peace.\nExample Deity | Pantheon\nSCAG \u2014 Elven\nSCAG \u2014 Dwarven\nBoldrei \u2014 Eberron\nSCAG \u2014 Halfling\nEldath \u2014 Forgotten Realms\nSCAG \u2014 Gnomish\nPaladine \u2014 Dragonlance\nRao \u2014 Greyhawk\nDomain Spells: 1st-level Peace Domain feature You gain domain spells at the cleric levels listed in the Peace Domain Spells table. See the Divine Domain class feature for how domain spells work. Cleric Level | Spells 1st \u2014 Heroism, Sanctuary 3rd \u2014 Aid, Warding Bond 5th \u2014 Beacon Of Hope, Sending 7th \u2014 Aura Of Purity, Otiluke'S Resilient Sphere 9th \u2014 Greater Restoration, Rary'S Telepathic Bond"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Balm of Peace",
          "desc": "2nd-level Peace Domain feature\nYou can use your Channel Divinity to make your very presence a soothing balm. As an action, you can move up to your speed, without provoking opportunity attacks, and when you move within 5 feet of any other creature during this action, you can restore a number of hit points to that creature equal to 2d6 + your Wisdom modifier (minimum of 1 hit point). A creature can receive this healing only once whenever you take this action."
        },
        {
          "level": 6,
          "name": "Protective Bond",
          "desc": "6th-level Peace Domain feature\nThe bond you forge between people helps them protect each other. When a creature affected by your Emboldening Bond feature is about to take damage, a second bonded creature within 30 feet of the first can use its reaction to teleport to an unoccupied space within 5 feet of the first creature. The second creature then takes all the damage instead."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Potent Spellcasting feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Potent Spellcasting",
          "desc": "8th-level Peace Domain feature\nYou add your Wisdom modifier to the damage you deal with any cleric cantrip."
        },
        {
          "level": 17,
          "name": "Expansive Bond",
          "desc": "17th-level Peace Domain feature\nThe benefits of your Emboldening Bond and Protective Bond features now work when the creatures are within 60 feet of each other. Moreover, when a creature uses Protective Bond to take someone else's damage, the creature has resistance to that damage."
        }
      ]
    },
    "Solidarity Domain (PSA)": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiency",
          "desc": "When you choose this domain at 1st level, you gain proficiency with heavy armor."
        },
        {
          "level": 1,
          "name": "Solidarity Domain (PSA)",
          "desc": "The worthy must know and respect all others whom the God-Pharaoh deems worthy, for in the afterlife, all will be united in purpose and action.\nOketra is charged with expounding upon this teaching of the God-Pharaoh, instilling in every initiate the virtue of solidarity. She forges each group of children into a crop of acolytes with just one purpose: to be judged worthy of a glorious afterlife. And she instills in each crop the ability to unite in a single action in pursuit of that purpose. She is fond of poetic imagery to communicate her ideals.\nAt each indicated cleric level, add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Bless, Guiding Bolt\n3rd \u2014 Aid, Warding Bond\n5th \u2014 Beacon Of Hope, Crusader'S Mantle\n7th \u2014 Aura Of Life, Guardian Of Faith\n9th \u2014 Circle Of Power, Mass Cure Wounds"
        },
        {
          "level": 1,
          "name": "Solidarity's Action",
          "desc": "Also at 1st level, when you take the Help action to aid an ally's attack, you can make one weapon attack as a bonus action. You can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain expended uses when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Preserve Life",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to heal the badly injured.\nAs an action, you present your holy symbol and evoke healing energy that can restore a number of hit points equal to five times your cleric level. Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum. You can't use this feature on an undead or a construct."
        },
        {
          "level": 6,
          "name": "Oketra's Blessing",
          "desc": "At 6th level, when a creature within 30 feet of you makes an attack roll, you can use your reaction to grant that creature a +10 bonus to the roll, using your Channel Divinity. You make this choice after you see the roll, but before the DM says whether the attack hits or misses."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 damage of the same type dealt by the weapon to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Supreme Healing",
          "desc": "Starting at 17th level, when you would normally roll one or more dice to restore hit points with a spell, you instead use the highest number possible for each die. For example, instead of restoring 2d6 hit points to a creature, you restore 12."
        }
      ]
    },
    "Strength Domain (PSA)": {
      "features": [
        {
          "level": 1,
          "name": "Acolyte of Strength",
          "desc": "At 1st level, you learn one druid cantrip of your choice. You also gain proficiency in one of the following skills of your choice: Animal Handling, Athletics, Nature, or Survival."
        },
        {
          "level": 1,
          "name": "Bonus Proficiency",
          "desc": "Also at 1st level, you gain proficiency with heavy armor."
        },
        {
          "level": 1,
          "name": "Strength Domain (PSA)",
          "desc": "The worthy shall hone a strong body that can withstand the boundless energies of the afterlife.\nIt falls to Rhonas to instill this teaching in those who would enter the afterlife\u2014but to his mind, the words themselves don't matter. Strength can't be taught. It must be built through practice and training. Rhonas demonstrates his teachings by his example, rather than by giving his students any kind of academic instruction. He welcomes the people of Naktamun to stand by the Hekma and watch him as he storms into the desert to battle the greatest horrors. He encourages them to observe his indomitable strength, for though they will never equal it, they can aspire to mimicry. He invites them to scrutinize every move and practice what they see.\nAt each indicated cleric level, add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Divine Favor, Shield Of Faith\n3rd \u2014 Enhance Ability, Protection From Poison\n5th \u2014 Haste, Protection From Energy\n7th \u2014 Dominate Beast, Stoneskin\n9th \u2014 Destructive Wave, Insect Plague"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Feat of Strength",
          "desc": "At 2nd level, you can use your Channel Divinity to enhance your physical might. When you make an attack roll, ability check, or saving throw using Strength, you can use your Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether the roll succeeds or fails."
        },
        {
          "level": 6,
          "name": "Rhonas's Blessing",
          "desc": "At 6th level, when a creature within 30 feet of you makes an attack roll, ability check, or saving throw using Strength, you can use your reaction to grant that creature a +10 bonus to the roll, using your Channel Divinity. You make this choice after you see the roll, but before the DM says whether the roll succeeds or fail."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 damage of the same type dealt by the weapon to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Avatar of Battle",
          "desc": "At 17th level, you gain resistance to bludgeoning, piercing, and slashing damage from nonmagical attacks."
        }
      ]
    },
    "Tempest Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiencies",
          "desc": "At 1st level, you gain proficiency with martial weapons and heavy armor."
        },
        {
          "level": 1,
          "name": "Tempest Domain",
          "desc": "Gods whose portfolios include the Tempest domain\u2014including Talos, Umberlee, Kord, Zeboim, the Devourer, Zeus, and Thor\u2014govern storms, sea, and sky. They include gods of lightning and thunder, gods of earthquakes, some fire gods, and certain gods of violence, physical strength, and courage. In some pantheons, a god of this domain rules over other deities and is known for swift justice delivered by thunderbolts. In the pantheons of seafaring people, gods of this domain are ocean deities and the patrons of sailors. Tempest gods send their clerics to inspire fear in the common folk, either to keep those folk on the path of righteousness or to encourage them to offer sacrifices of propitiation to ward off divine wrath.\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Fog Cloud, Thunderwave\n3rd \u2014 Gust Of Wind, Shatter\n5th \u2014 Call Lightning, Sleet Storm\n7th \u2014 Control Water, Ice Storm\n9th \u2014 Destructive Wave, Insect Plague"
        },
        {
          "level": 1,
          "name": "Wrath of the Storm",
          "desc": "Also at 1st level, you can thunderously rebuke attackers. When a creature within 5 feet of you that you can see hits you with an attack, you can use your reaction to cause the creature to make a Dexterity saving throw. The creature takes 2d8 lightning or thunder damage (your choice) on a failed saving throw, and half as much damage on a successful one.\nYou can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Destructive Wrath",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to wield the power of the storm with unchecked ferocity.\nWhen you roll lightning or thunder damage, you can use your Channel Divinity to deal maximum damage, instead of rolling."
        },
        {
          "level": 6,
          "name": "Thunderbolt Strike",
          "desc": "At 6th level, when you deal lightning damage to a Large or smaller creature, you can also push it up to 10 feet away from you."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 thunder damage to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Stormborn",
          "desc": "At 17th level, you have a flying speed equal to your current walking speed whenever you are not underground or indoors."
        }
      ]
    },
    "Trickery Domain": {
      "features": [
        {
          "level": 1,
          "name": "Blessing of the Trickster",
          "desc": "Starting when you choose this domain at 1st level, you can use your action to touch a willing creature other than yourself to give it advantage on Dexterity (Stealth) checks. This blessing lasts for 1 hour or until you use this feature again."
        },
        {
          "level": 1,
          "name": "Trickery Domain",
          "desc": "Gods of trickery\u2014such as Tymora, Beshaba, Olidammara, the Traveler, Garl Glittergold, and Loki\u2014are mischief-makers and instigators who stand as a constant challenge to the accepted order among both gods and mortals. They're patrons of thieves, scoundrels, gamblers, rebels, and liberators. Their clerics are a disruptive force in the world, puncturing pride, mocking tyrants, stealing from the rich, freeing captives, and flouting hollow traditions. They prefer subterfuge, pranks, deception, and theft rather than direct confrontation.\nAt each indicated cleric level, you add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Charm Person, Disguise Self\n3rd \u2014 Mirror Image, Pass Without Trace\n5th \u2014 Blink, Dispel Magic\n7th \u2014 Dimension Door, Polymorph\n9th \u2014 Dominate Person, Modify Memory"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Invoke Duplicity",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to create an illusory duplicate of yourself.\nAs an action, you create a perfect illusion of yourself that lasts for 1 minute, or until you lose your concentration (as if you were concentrating on a spell). The illusion appears in an unoccupied space that you can see within 30 feet of you. As a bonus action on your turn, you can move the illusion up to 30 feet to a space you can see, but it must remain within 120 feet of you.\nFor the duration, you can cast spells as though you were in the illusion's space, but you must use your own senses. Additionally, when both you and your illusion are within 5 feet of a creature that can see the illusion, you have advantage on attack rolls against that creature, given how distracting the illusion is to the target."
        },
        {
          "level": 3,
          "name": "Blessing of the Trickster",
          "desc": "As a Magic action, you can choose yourself or a willing creature within 30 feet of yourself to have Advantage on Dexterity (Stealth) checks. This blessing lasts until you finish a Long Rest or you use this feature again."
        },
        {
          "level": 3,
          "name": "Invoke Duplicity",
          "desc": "As a Bonus Action, you can expend one use of your Channel Divinity to create a perfect visual illusion of yourself in an unoccupied space you can see within 30 feet of yourself. The illusion is intangible and doesn't occupy its space. It lasts for 1 minute, but it ends early if you dismiss it (no action required) or have the Incapacitated condition. The illusion is animated and mimics your expressions and gestures. While it persists, you gain the following benefits.\nCast Spells: You can cast spells as though you were in the illusion's space, but you must use your own senses.\nDistract: When both you and your illusion are within 5 feet of a creature that can see the illusion, you have Advantage on attack rolls against that creature, given how distracting the illusion is to the target.\nMove: As a Bonus Action, you can move the illusion up to 30 feet to an unoccupied space you can see that is within 120 feet of yourself."
        },
        {
          "level": 3,
          "name": "Trickery Domain",
          "desc": "Make Mischief and Challenge Authority\nThe Trickery Domain offers magic of deception, illusion, and stealth. Clerics who wield this magic are a disruptive force in the world, puncturing pride, mocking tyrants, freeing captives, and flouting hollow traditions. They prefer subterfuge and pranks to direct confrontation.\nGods of trickery are mischief-makers and instigators who stand as a constant challenge to the accepted order among both gods and mortals. They embody the forces of change and social upheaval, and they're patrons of thieves, scoundrels, gamblers, rebels, and liberators. Religious orders that operate in secret, especially those that seek to undermine oppressive governments or hierarchies, also draw on the power of the Trickery Domain."
        },
        {
          "level": 3,
          "name": "Trickery Domain Spells",
          "desc": "Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the Trickery Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Prepared Spells\n3rd \u2014 Charm Person, Disguise Self, Invisibility, Pass Without Trace\n5th \u2014 Hypnotic Pattern, Nondetection\n7th \u2014 Confusion, Dimension Door\n9th \u2014 Dominate Person, Modify Memory"
        },
        {
          "level": 6,
          "name": "Channel Divinity: Cloak of Shadows",
          "desc": "Starting at 6th level, you can use your Channel Divinity to vanish.\nAs an action, you become invisible until the end of your next turn. You become visible if you attack or cast a spell."
        },
        {
          "level": 6,
          "name": "Trickster's Transposition",
          "desc": "Whenever you take the Bonus Action to create or move the illusion of your Invoke Duplicity, you can teleport, swapping places with the illusion."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with poison\u2014a gift from your deity. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 poison damage to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Improved Duplicity",
          "desc": "At 17th level, you can create up to four duplicates of yourself, instead of one, when you use Invoke Duplicity. As a bonus action on your turn, you can move any number of them up to 30 feet, to a maximum range of 120 feet."
        },
        {
          "level": 17,
          "name": "Improved Duplicity",
          "desc": "The illusion of your Invoke Duplicity has grown more powerful in the following ways.\nShared Distraction: When you and your allies make attack rolls against a creature within 5 feet of the illusion, the attack rolls have Advantage.\nHealing Illusion: When the illusion ends, you or a creature of your choice within 5 feet of it regains a number of Hit Points equal to your Cleric level."
        }
      ]
    },
    "Twilight Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiencies",
          "desc": "1st-level Twilight Domain feature\nYou gain proficiency with martial weapons and heavy armor."
        },
        {
          "level": 1,
          "name": "Eyes of Night",
          "desc": "1st-level Twilight Domain feature\nYou can see through the deepest gloom. You have darkvision out to a range of 300 feet. In that radius, you can see in dim light as if it were bright light and in darkness as if it were dim light.\nAs an action, you can magically share the darkvision of this feature with willing creatures you can see within 10 feet of you, up to a number of creatures equal to your Wisdom modifier (minimum of one creature). The shared darkvision lasts for 1 hour. Once you share it, you can't do so again until you finish a long rest, unless you expend a spell slot of any level to share it again."
        },
        {
          "level": 1,
          "name": "Twilight Domain",
          "desc": "The twilit transition from light into darkness often brings calm and even joy, as the day's labors end and the hours of rest begin. The darkness can also bring terrors, but the gods of twilight guard against the horrors of the night.\nClerics who serve these deities-examples of which appear on the Twilight Deities table-bring comfort to those who seek rest and protect them by venturing into the encroaching darkness to ensure that the dark is a comfort, not a terror.\nExample Deity | Pantheon\nBoldrei \u2014 Eberron\nCelestian \u2014 Greyhawk\nDol Arrah \u2014 Eberron\nHelm \u2014 Forgotten Realms\nIlmater \u2014 Forgotten Realms\nMishakal \u2014 Dragonlance\nSel\u00fbne \u2014 Forgotten Realms\nYondalla \u2014 Halfling\nDomain Spells: 1st-level Twilight Domain feature You gain domain spells at the cleric levels listed in the Twilight Domain Spells table. See the Divine Domain class feature for how domain spells work. Cleric Level | Spells 1st \u2014 Faerie Fire, Sleep 3rd \u2014 Moonbeam, See Invisibility 5th \u2014 Aura Of Vitality, Leomund'S Tiny Hut 7th \u2014 Aura Of Life, Greater Invisibility 9th \u2014 Circle Of Power, Mislead"
        },
        {
          "level": 1,
          "name": "Vigilant Blessing",
          "desc": "1st-level Twilight Domain feature\nThe night has taught you to be vigilant. As an action, you give one creature you touch (including possibly yourself) advantage on the next initiative roll the creature makes. This benefit ends immediately after the roll or if you use this feature again."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Twilight Sanctuary",
          "desc": "2nd-level Twilight Domain feature\nYou can use your Channel Divinity to refresh your allies with soothing twilight.\nAs an action, you present your holy symbol, and a sphere of twilight emanates from you. The sphere is centered on you, has a 30-foot radius, and is filled with dim light. The sphere moves with you, and it lasts for 1 minute or until you are incapacitated or die. Whenever a creature (including you) ends its turn in the sphere, you can grant that creature one of these benefits:\n\u2022 You grant it temporary hit points equal to 1d6 plus your cleric level.\n\u2022 You end one effect on it causing it to be charmed or frightened."
        },
        {
          "level": 6,
          "name": "Steps of Night",
          "desc": "6th-level Twilight Domain feature\nYou can draw on the mystical power of night to rise into the air. As a bonus action when you are in dim light or darkness, you can magically give yourself a flying speed equal to your walking speed for 1 minute. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "8th-level Twilight Domain feature\nYou gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 radiant damage. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Twilight Shroud",
          "desc": "17th-level Twilight Domain feature\nThe twilight that you summon offers a protective embrace: you and your allies have Cover while in the sphere created by your Twilight Sanctuary."
        }
      ]
    },
    "War Domain": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiencies",
          "desc": "At 1st level, you gain proficiency with martial weapons and heavy armor."
        },
        {
          "level": 1,
          "name": "War Domain",
          "desc": "War has many manifestations. It can make heroes of ordinary people. It can be desperate and horrific, with acts of cruelty and cowardice eclipsing instances of excellence and courage. In either case, the gods of war watch over warriors and reward them for their great deeds. The clerics of such gods excel in battle, inspiring others to fight the good fight or offering acts of violence as prayers. Gods of war include champions of honor and chivalry (such as Torm, Heironeous, and Kiri-Jolith) as well as gods of destruction and pillage (such as Erythnul, the Fury, Gruumsh, and Ares) and gods of conquest and domination (such as Bane, Hextor, and Maglubiyet). Other war gods (such as Tempus, Nike, and Nuada) take a more neutral stance, promoting war in all its manifestations and supporting warriors in any circumstance.\nAt each indicated cleric level, add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Divine Favor, Shield Of Faith\n3rd \u2014 Magic Weapon, Spiritual Weapon\n5th \u2014 Crusader'S Mantle, Spirit Guardians\n7th \u2014 Freedom Of Movement, Stoneskin\n9th \u2014 Flame Strike, Hold Monster"
        },
        {
          "level": 1,
          "name": "War Priest",
          "desc": "From 1st level, your god delivers bolts of inspiration to you while you are engaged in battle. When you use the Attack action, you can make one weapon attack as a bonus action. You can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Channel Divinity: Guided Strike",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to strike with supernatural accuracy. When you make an attack roll, you can use your Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether the attack hits or misses."
        },
        {
          "level": 3,
          "name": "Guided Strike",
          "desc": "When you or a creature within 30 feet of you misses with an attack roll, you can expend one use of your Channel Divinity and give that roll a +10 bonus, potentially causing it to hit. When you use this feature to benefit another creature's attack roll, you must take a Reaction to do so."
        },
        {
          "level": 3,
          "name": "War Domain",
          "desc": "Inspire Valor and Smite Foes\nWar has many manifestations. It can make heroes of ordinary people. It can be desperate and horrific, with acts of cruelty and cowardice eclipsing instances of excellence and courage. Clerics who tap into the magic of the War Domain excel in battle, inspiring others to fight the good fight or offering acts of violence as prayers.\nGods of the War Domain watch over warriors and reward them for their great deeds. They include champions of honor and chivalry as well as gods of destruction and pillage. Other war gods take a more neutral stance, promoting war in all its manifestations and supporting warriors in any circumstance."
        },
        {
          "level": 3,
          "name": "War Domain Spells",
          "desc": "Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the War Domain Spells table, you thereafter always have the listed spells prepared.\nCleric Level | Prepared Spells\n3rd \u2014 Guiding Bolt, Magic Weapon, Shield Of Faith, Spiritual Weapon\n5th \u2014 Crusader'S Mantle, Spirit Guardians\n7th \u2014 Fire Shield, Freedom Of Movement\n9th \u2014 Hold Monster, Steel Wind Strike"
        },
        {
          "level": 3,
          "name": "War Priest",
          "desc": "As a Bonus Action, you can make one attack with a weapon or an Unarmed Strike. You can use this Bonus Action a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Short or Long Rest."
        },
        {
          "level": 6,
          "name": "Channel Divinity: War God's Blessing",
          "desc": "At 6th level, when a creature within 30 feet of you makes an attack roll, you can use your reaction to grant that creature a +10 bonus to the roll, using your Channel Divinity. You make this choice after you see the roll, but before the DM says whether the attack hits or misses."
        },
        {
          "level": 6,
          "name": "War God's Blessing",
          "desc": "You can expend a use of your Channel Divinity to cast Shield Of Faith or Spiritual Weapon rather than expending a spell slot. When you cast either spell in this way, the spell doesn't require Concentration. Instead the spell lasts for 1 minute, but it ends early if you cast that spell again, have the Incapacitated condition, or die."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 damage of the same type dealt by the weapon to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Avatar of Battle",
          "desc": "At 17th level, you gain resistance to bludgeoning, piercing, and slashing damage from nonmagical attacks."
        },
        {
          "level": 17,
          "name": "Avatar of Battle",
          "desc": "You gain Resistance to Bludgeoning, Piercing, and Slashing damage."
        }
      ]
    },
    "Zeal Domain (PSA)": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Proficiencies",
          "desc": "At 1st level, you gain proficiency with martial weapons and heavy armor."
        },
        {
          "level": 1,
          "name": "Priest of Zeal",
          "desc": "From 1st level, Hazoret delivers bolts of inspiration to you while you are engaged in battle. When you use the Attack action, you can make one weapon attack as a bonus action.\nYou can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 1,
          "name": "Zeal Domain (PSA)",
          "desc": "The worthy shall rush to the God-Pharaoh's side with relentless zeal, rising to overcome every obstacle in their way.\nThe God-Pharaoh expects those he welcomes into the afterlife to desire it above all other pleasures and achievements, and for them to show their dedication, passion, and fervor through their actions. Hazoret is charged with cultivating this zeal in the initiates who come under her care, and she has undertaken the task with appropriate enthusiasm. She recognizes, however, that the best way to teach zeal is by demonstrating it.\nAt each indicated cleric level, add the listed spells to your spells prepared.\nCleric Level | Spells\n1st \u2014 Searing Smite, Thunderous Smite\n3rd \u2014 Magic Weapon, Shatter\n5th \u2014 Haste, Fireball\n7th \u2014 Fire Shield (Warm Shield Only), Freedom Of Movement\n9th \u2014 Destructive Wave, Flame Strike"
        },
        {
          "level": 2,
          "name": "Channel Divinity: Consuming Fervor",
          "desc": "Starting at 2nd level, you can use your Channel Divinity to channel your zeal into unchecked ferocity.\nWhen you roll fire or thunder damage, you can use your Channel Divinity to deal maximum damage instead of rolling."
        },
        {
          "level": 6,
          "name": "Resounding Strike",
          "desc": "At 6th level, when you deal thunder damage to a Large or smaller creature, you can also push it up to 10 feet away from you."
        },
        {
          "level": 8,
          "name": "Blessed Strikes",
          "desc": "8th-level cleric optional feature, which replaces the Divine Strike feature\nYou are blessed with divine might in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can't use this feature again until the start of your next turn."
        },
        {
          "level": 8,
          "name": "Divine Strike",
          "desc": "At 8th level, you gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 damage of the same type dealt by the weapon to the target. When you reach 14th level, the extra damage increases to 2d8."
        },
        {
          "level": 17,
          "name": "Blaze of Glory",
          "desc": "Starting at 17th level, you can delay death for an instant to perform a final heroic act.\nWhen you are reduced to 0 hit points by an attacker you can see, even if you would be killed outright, you can use your reaction to move up to your speed toward the attacker and make one melee weapon attack against it, as long as the movement brings it within your reach. You make this attack with advantage. If the attack hits, the creature takes an extra 5d10 fire damage and an extra 5d10 damage of the weapon's type. You then fall unconscious and begin making death saving throws as normal, or you die if the damage you took would have killed you outright.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    }
  },
  "Druid": {
    "Circle of Dreams": {
      "features": [
        {
          "level": 2,
          "name": "Balm of the Summer Court",
          "desc": "At 2nd level, you become imbued with the blessings of the Summer Court. You are a font of energy that offers respite from injuries. You have a pool of fey energy represented by a number of d6s equal to your druid level.\nAs a bonus action, you can choose one creature you can see within 120 feet of you and spend a number of those dice equal to half your druid level or less. Roll the spent dice and add them together. The target regains a number of hit points equal to the total. The target also gains 1 temporary hit point per die spent.\nYou regain all expended dice when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Circle of Dreams",
          "desc": "Druids who are members of the Circle of Dreams hail from regions that have strong ties to the Feywild and its dreamlike realms. The druids' guardianship of the natural world makes for a natural alliance between them and good-aligned fey. These druids seek to fill the world with dreamy wonder. Their magic mends wounds and brings joy to downcast hearts, and the realms they protect are gleaming, fruitful places, where dream and reality blur together and where the weary can find rest."
        },
        {
          "level": 6,
          "name": "Hearth of Moonlight and Shadow",
          "desc": "At 6th level, home can be wherever you are. During a short or long rest, you can invoke the shadowy power of the Gloaming Court to help guard your respite. At the start of the rest, you touch a point in space, and an invisible, 30-foot-radius sphere of magic appears, centered on that point. Cover blocks the sphere.\nWhile within the sphere, you and your allies gain a +5 bonus to Dexterity (Stealth) and Wisdom (Perception) checks, and any light from open flames in the sphere (a campfire, torches, or the like) isn't visible outside it.\nThe sphere vanishes at the end of the rest or when you leave the sphere."
        },
        {
          "level": 10,
          "name": "Hidden Paths",
          "desc": "Starting at 10th level, you can use the hidden, magical pathways that some fey use to traverse space in the blink of an eye. As a bonus action on your turn, you can teleport up to 60 feet to an unoccupied space you can see. Alternatively, you can use your action to teleport one willing creature you touch up to 30 feet to an unoccupied space you can see.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 14,
          "name": "Walker in Dreams",
          "desc": "At 14th level, the magic of the Feywild grants you the ability to travel mentally or physically through dreamlands.\nWhen you finish a short rest, you can cast one of the following spells, without expending a spell slot or requiring material components: Dream (with you as the messenger), Scrying, or Teleportation Circle.\nThis use of Teleportation Circle is special. Rather than opening a portal to a permanent Teleportation Circle, it opens a portal to the last location where you finished a long rest on your current plane of existence. If you haven't taken a long rest on your current plane, the spell fails but isn't wasted.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    },
    "Circle of Spores": {
      "features": [
        {
          "level": 2,
          "name": "Circle Spells",
          "desc": "Your symbiotic link to fungus and your ability to tap into the cycle of life and death grants you access to certain spells. At 2nd level, you learn the Chill Touch cantrip. At 3rd, 5th, 7th, and 9th level you gain access to the spells listed for that level in the Circle of Spores Spells table.\nOnce you gain access to one of these spells, you always have it prepared, and it doesn't count against the number of spells you can prepare each day. If you gain access to a spell that doesn't appear on the druid spell list, the spell is nonetheless a druid spell for you.\nDruid Level | Circle Spells\n3rd \u2014 Blindness/Deafness, Gentle Repose\n5th \u2014 Animate Dead, Gaseous Form\n7th \u2014 Blight, Confusion\n9th \u2014 Cloudkill, Contagion"
        },
        {
          "level": 2,
          "name": "Circle of Spores",
          "desc": "Druids of the Circle of Spores find beauty in decay. They see within mold and other fungi the ability to transform lifeless material into abundant, albeit somewhat strange, life.\nThese druids believe that life and death are parts of a grand cycle, with one leading to the other and then back again. Death isn't the end of life, but instead a change of state that sees life shift into a new form.\nDruids of this circle have a complex relationship with the undead. Unlike most other druids, they see nothing inherently wrong with undeath, which they consider to be a companion to life and death. But these druids believe that the natural cycle is healthiest when each segment of it is vibrant and changing. Undead that seek to replace all life with undeath, or that try to avoid passing to a final rest, violate the cycle and must be thwarted."
        },
        {
          "level": 2,
          "name": "Halo of Spores",
          "desc": "Starting at 2nd level, you are surrounded by invisible, necrotic spores that are harmless until you unleash them on a creature nearby. When a creature you can see moves into a space within 10 feet of you or starts its turn there, you can use your reaction to deal 1d4 necrotic damage to that creature unless it succeeds on a Constitution saving throw against your spell save DC. The necrotic damage increases to 1d6 at 6th level, 1d8 at 10th level, and 1d10 at 14th level."
        },
        {
          "level": 2,
          "name": "Symbiotic Entity",
          "desc": "At 2nd level, you gain the ability to channel magic into your spores. As an action, you can expend a use of your Wild Shape feature to awaken those spores, rather than transforming into a beast form, and you gain 4 temporary hit points for each level you have in this class. While this feature is active, you gain the following benefits:\n\u2022 When you deal your Halo of Spores damage, roll the damage die a second time and add it to the total.\n\u2022 Your melee weapon attacks deal an extra 1d6 necrotic damage to any target they hit.\nThese benefits last for 10 minutes, until you lose all these temporary hit points, or until you use your Wild Shape again."
        },
        {
          "level": 6,
          "name": "Fungal Infestation",
          "desc": "At 6th level, your spores gain the ability to infest a corpse and animate it. If a beast or a humanoid that is Small or Medium dies within 10 feet of you, you can use your reaction to animate it, causing it to stand up immediately with 1 hit point. The creature uses the zombie stat block in the Monster Manual. It remains animate for 1 hour, after which time it collapses and dies.\nIn combat, the zombie's turn comes immediately after yours. It obeys your mental commands, and the only action it can take is the Attack action, making one melee attack.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 10,
          "name": "Spreading Spores",
          "desc": "At 10th level, you gain the ability to seed an area with deadly spores. As a bonus action while your Symbiotic Entity feature is active, you can hurl spores up to 30 feet away, where they swirl in a 10-foot cube for 1 minute. The spores disappear early if you use this feature again, if you dismiss them as a bonus action, or if your Symbiotic Entity feature is no longer active.\nWhenever a creature moves into the cube or starts its turn there, that creature takes your Halo of Spores damage, unless the creature succeeds on a Constitution saving throw against your spell save DC. A creature can take this damage no more than once per turn.\nWhile the cube of spores persists, you can't use your Halo of Spores reaction."
        },
        {
          "level": 14,
          "name": "Fungal Body",
          "desc": "At 14th level, the fungal spores in your body alter you: you can't be blinded, deafened, frightened, or poisoned, and any critical hit against you counts as a normal hit instead, unless you're incapacitated."
        }
      ]
    },
    "Circle of Stars": {
      "features": [
        {
          "level": 2,
          "name": "Archer",
          "desc": "A constellation of an archer appears on you. When you activate this form, and as a bonus action on your subsequent turns while it lasts, you can make a ranged spell attack, hurling a luminous arrow that targets one creature within 60 feet of you. On a hit, the attack deals radiant damage equal to 1d8 + your Wisdom modifier."
        },
        {
          "level": 2,
          "name": "Chalice",
          "desc": "A constellation of a life-giving goblet appears on you. Whenever you cast a spell using a spell slot that restores hit points to a creature, you or another creature within 30 feet of you can regain hit points equal to 1d8 + your Wisdom modifier."
        },
        {
          "level": 2,
          "name": "Circle of Stars",
          "desc": "The Circle of Stars allows druids to draw on the power of starlight. These druids have tracked heavenly patterns since time immemorial, discovering secrets hidden amid the constellations. By revealing and understanding these secrets, the Circle of the Stars seeks to harness the powers of the cosmos.\nMany druids of this circle keep records of the constellations and the stars' effects on the world. Some groups document these observations at megalithic sites, which serve as enigmatic libraries of lore. These repositories might take the form of stone circles, pyramids, petroglyphs, and underground temples-any construction durable enough to protect the circle's sacred knowledge even against a great cataclysm."
        },
        {
          "level": 2,
          "name": "Dragon",
          "desc": "A constellation of a wise dragon appears on you. When you make an Intelligence or a Wisdom check or a Constitution saving throw to maintain concentration on a spell, you can treat a roll of 9 or lower on the d20 as a 10."
        },
        {
          "level": 2,
          "name": "Star Map",
          "desc": "2nd-level Circle of the Stars feature\nYou've created a star chart as part of your heavenly studies. It is a Tiny object and can serve as a spellcasting focus for your druid spells. You determine its form by rolling on the Star Map table or by choosing one.\nd6 | Map Form\n1 \u2014 A scroll covered with depictions of constellations\n2 \u2014 A stone tablet with fine holes drilled through it\n3 \u2014 A speckled owlbear hide, tooled with raised marks\n4 \u2014 A collection of maps bound in an ebony cover\n5 \u2014 A crystal that projects starry patterns when placed before a light\n6 \u2014 Glass disks that depict constellations\nWhile holding this map, you have these benefits:\n\u2022 You know the Guidance cantrip.\n\u2022 You have the Guiding Bolt spell prepared. It counts as a druid spell for you, and it doesn't count against the number of spells you can have prepared.\n\u2022 You can cast Guiding Bolt without expending a spell slot. You can do so a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nIf you lose the map, you can perform a 1-hour ceremony to magically create a replacement. This ceremony can be performed during a short or long rest, and it destroys the previous map."
        },
        {
          "level": 2,
          "name": "Starry Form",
          "desc": "2nd-level Circle of the Stars feature\nAs a bonus action, you can expend a use of your Wild Shape feature to take on a starry form, rather than transforming into a beast.\nWhile in your starry form, you retain your game statistics, but your body becomes luminous; your joints glimmer like stars, and glowing lines connect them as on a star chart. This form sheds bright light in a 10-foot radius and dim light for an additional 10 feet. The form lasts for 10 minutes. It ends early if you dismiss it (no action required), are incapacitated, die, or use this feature again.\nWhenever you assume your starry form, choose which of the following constellations glimmers on your body; your choice gives you certain benefits while in the form:"
        },
        {
          "level": 3,
          "name": "Archer",
          "desc": "A constellation of an archer appears on you. When you activate this form and as a Bonus Action on your subsequent turns while it lasts, you can make a ranged spell attack, hurling a luminous arrow that targets one creature within 60 feet of yourself. On a hit, the attack deals Radiant damage equal to 1d8 plus your Wisdom modifier."
        },
        {
          "level": 3,
          "name": "Chalice",
          "desc": "A constellation of a life-giving goblet appears on you. Whenever you cast a spell using a spell slot that restores Hit Points to a creature, you or another creature within 30 feet of you can regain Hit Points equal to 1d8 plus your Wisdom modifier."
        },
        {
          "level": 3,
          "name": "Circle of the Stars",
          "desc": "Harness Secrets Hidden in Constellations\nThe Circle of the Stars has tracked heavenly patterns since time immemorial, discovering secrets hidden amid the constellations. By understanding these secrets, the Druids of this circle seek to harness the powers of the cosmos."
        },
        {
          "level": 3,
          "name": "Dragon",
          "desc": "A constellation of a wise dragon appears on you. When you make an Intelligence or a Wisdom check or a Constitution saving throw to maintain Concentration, you can treat a roll of 9 or lower on the d20 as a 10."
        },
        {
          "level": 3,
          "name": "Star Map",
          "desc": "You've created a star chart as part of your heavenly studies. It is a Tiny object, and you can use it as a Spellcasting Focus for your Druid spells. You determine its form by rolling on the Star Map table or by choosing one.\nWhile holding the map, you have the Guidance and Guiding Bolt spells prepared, and you can cast Guiding Bolt without expending a spell slot. You can cast it in that way a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nIf you lose the map, you can perform a 1-hour ceremony to magically create a replacement. This ceremony can be performed during a Short or Long Rest, and it destroys the previous map.\n1d6 | Map Form\n1 \u2014 A scroll bearing depictions of constellations\n2 \u2014 A stone tablet with fine holes drilled through it\n3 \u2014 An owlbear hide tooled with stellar symbols\n4 \u2014 A collection of maps bound in an ebony cover\n5 \u2014 A crystal engraved with starry patterns\n6 \u2014 A glass disk etched with constellations"
        },
        {
          "level": 3,
          "name": "Starry Form",
          "desc": "As a Bonus Action, you can expend a use of your Wild Shape feature to take on a starry form rather than shape-shifting.\nWhile in your starry form, you retain your game statistics, but your body becomes luminous, your joints glimmer like stars, and glowing lines connect them as on a star chart. This form sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. The form lasts for 10 minutes. It ends early if you dismiss it (no action required), have the Incapacitated condition, or use this feature again.\nWhenever you assume your starry form, choose which of the following constellations glimmers on your body; your choice gives you certain benefits while in the form."
        },
        {
          "level": 6,
          "name": "Cosmic Omen",
          "desc": "6th-level Circle of the Stars feature\nWhenever you finish a long rest, you can consult your Star Map for omens. When you do so, roll a die. Until you finish your next long rest, you gain access to a special reaction based on whether you rolled an even or an odd number on the die:\n\u2022 Weal (even): \n\u2022 Woe (odd): \nYou can use this reaction a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 6,
          "name": "Cosmic Omen",
          "desc": "Whenever you finish a Long Rest, you can consult your Star Map for omens and roll a die. Until you finish your next Long Rest, you gain access to a special Reaction based on whether you rolled an even or an odd number on the die:\n\u2022 Weal (even): Whenever a creature you can see within 30 feet of you is about to make a D20 Test, you can take a Reaction to roll 1d6 and add the number rolled to the total.\n\u2022 Woe (odd): Whenever a creature you can see within 30 feet of you is about to make a D20 Test, you can take a Reaction to roll 1d6 and subtract the number rolled from the total.\nYou can use this Reaction a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 10,
          "name": "Twinkling Constellations",
          "desc": "10th-level Circle of the Stars feature\nThe constellations of your Starry Form improve. The 1d8 of the Archer and the Chalice becomes 2d8, and while the Dragon is active, you have a flying speed of 20 feet and can hover.\nMoreover, at the start of each of your turns while in your Starry Form, you can change which constellation glimmers on your body."
        },
        {
          "level": 10,
          "name": "Twinkling Constellations",
          "desc": "The constellations of your Starry Form improve. The 1d8 of the Archer and the Chalice becomes 2d8, and while the Dragon is active, you have a Fly Speed of 20 feet and can hover.\nMoreover, at the start of each of your turns while in your Starry Form, you can change which constellation glimmers on your body."
        },
        {
          "level": 14,
          "name": "Full of Stars",
          "desc": "14th-level Circle of the Stars feature\nWhile in your Starry Form, you become partially incorporeal, giving you resistance to bludgeoning, piercing, and slashing damage."
        },
        {
          "level": 14,
          "name": "Full of Stars",
          "desc": "While in your Starry Form, you become partially incorporeal, giving you Resistance to Bludgeoning, Piercing, and Slashing damage."
        }
      ]
    },
    "Circle of Wildfire": {
      "features": [
        {
          "level": 2,
          "name": "Circle Spells",
          "desc": "2nd-level Circle of Wildfire feature\nYou have formed a bond with a wildfire spirit, a primal being of creation and destruction. Your link with this spirit grants you access to some spells when you reach certain levels in this class, as shown on the Circle of Wildfire Spells table.\nOnce you gain access to one of these spells, you always have it prepared, and it doesn't count against the number of spells you can prepare each day. If you gain access to a spell that doesn't appear on the druid spell list, the spell is nonetheless a druid spell for you.\nDruid Level | Circle Spells\n2nd \u2014 Burning Hands, Cure Wounds\n3rd \u2014 Flaming Sphere, Scorching Ray\n5th \u2014 Plant Growth, Revivify\n7th \u2014 Aura Of Life, Fire Shield\n9th \u2014 Flame Strike, Mass Cure Wounds"
        },
        {
          "level": 2,
          "name": "Circle of Wildfire",
          "desc": "Druids within the Circle of Wildfire understand that destruction is sometimes the precursor of creation, such as when a forest fire promotes later growth. These druids bond with a primal spirit that harbors both destructive and creative power, allowing the druids to create controlled flames that burn away one thing but give life to another."
        },
        {
          "level": 2,
          "name": "Summon Wildfire Spirit",
          "desc": "2nd-level Circle of Wildfire feature\nYou can summon the primal spirit bound to your soul. As an action, you can expend one use of your Wild Shape feature to summon your wildfire spirit, rather than assuming a beast form.\nThe spirit appears in an unoccupied space of your choice that you can see within 30 feet of you. Each creature within 10 feet of the spirit (other than you) when it appears must succeed on a Dexterity saving throw against your spell save DC or take 2d6 fire damage.\nThe spirit is friendly to you and your companions and obeys your commands. See this creature's game statistics in the Wildfire Spirit stat block, which uses your proficiency bonus (PB) in several places. You determine the spirit's appearance. Some spirits take the form of a humanoid figure made of gnarled branches covered in flame, while others look like beasts wreathed in fire.\nIn combat, the spirit shares your initiative count, but it takes its turn immediately after yours. The only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the spirit can take any action of its choice, not just Dodge.\nThe spirit manifests for 1 hour, until it is reduced to 0 hit points, until you use this feature to summon the spirit again, or until you die."
        },
        {
          "level": 6,
          "name": "Enhanced Bond",
          "desc": "6th-level Circle of Wildfire feature\nThe bond with your wildfire spirit enhances your destructive and restorative spells. Whenever you cast a spell that deals fire damage or restores hit points while your wildfire spirit is summoned, roll a d8, and you gain a bonus equal to the number rolled to one damage or healing roll of the spell.\nIn addition, when you cast a spell with a range other than self, the spell can originate from you or your wildfire spirit."
        },
        {
          "level": 10,
          "name": "Cauterizing Flames",
          "desc": "10th-level Circle of Wildfire feature\nYou gain the ability to turn death into magical flames that can heal or incinerate. When a Small or larger creature dies within 30 feet of you or your wildfire spirit, a harmless spectral flame springs forth in the dead creature's space and flickers there for 1 minute. When a creature you can see enters that space, you can use your reaction to extinguish the spectral flame there and either heal the creature or deal fire damage to it. The healing or damage equals 2d10 + your Wisdom modifier.\nYou can use this reaction a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 14,
          "name": "Blazing Revival",
          "desc": "14th-level Circle of Wildfire feature\nThe bond with your wildfire spirit can save you from death. If the spirit is within 120 feet of you when you are reduced to 0 hit points and thereby fall unconscious, you can cause the spirit to drop to 0 hit points. You then regain half your hit points and immediately rise to your feet.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    },
    "Circle of the Land": {
      "features": [
        {
          "level": 2,
          "name": "Bonus Cantrip",
          "desc": "You learn one additional druid cantrip of your choice. This cantrip doesn't count against the number of druid cantrips you know."
        },
        {
          "level": 2,
          "name": "Circle Spells",
          "desc": "Your mystical connection to the land infuses you with the ability to cast certain spells. At 3rd, 5th, 7th, and 9th level you gain access to circle spells connected to the land where you became a druid. Choose that land\u2014arctic, coast, desert, forest, grassland, mountain, swamp, or Underdark\u2014and consult the associated list of spells.\nOnce you gain access to a circle spell, you always have it prepared, and it doesn't count against the number of spells you can prepare each day. If you gain access to a spell that doesn't appear on the druid spell list, the spell is nonetheless a druid spell for you.\nDruid Level | Circle Spells\n3rd \u2014 Hold Person, Spike Growth\n5th \u2014 Sleet Storm, Slow\n7th \u2014 Freedom Of Movement, Ice Storm\n9th \u2014 Commune With Nature, Cone Of Cold\nDruid Level | Circle Spells\n3rd \u2014 Mirror Image, Misty Step\n5th \u2014 Water Breathing, Water Walk\n7th \u2014 Control Water, Freedom Of Movement\n9th \u2014 Conjure Elemental, Scrying\nDruid Level | Circle Spells\n3rd \u2014 Blur, Silence\n5th \u2014 Create Food And Water, Protection From Energy\n7th \u2014 Blight, Hallucinatory Terrain\n9th \u2014 Insect Plague, Wall Of Stone\nDruid Level | Circle Spells\n3rd \u2014 Barkskin, Spider Climb\n5th \u2014 Call Lightning, Plant Growth\n7th \u2014 Divination, Freedom Of Movement\n9th \u2014 Commune With Nature, Tree Stride\nDruid Level | Circle Spells\n3rd \u2014 Invisibility, Pass Without Trace\n5th \u2014 Daylight, Haste\n7th \u2014 Divination, Freedom Of Movement\n9th \u2014 Dream, Insect Plague\nDruid Level | Circle Spells\n3rd \u2014 Spider Climb, Spike Growth\n5th \u2014 Lightning Bolt, Meld Into Stone\n7th \u2014 Stone Shape, Stoneskin\n9th \u2014 Passwall, Wall Of Stone\nDruid Level | Circle Spells\n3rd \u2014 Darkness, Melf'S Acid Arrow\n5th \u2014 Water Walk, Stinking Cloud\n7th \u2014 Freedom Of Movement, Locate Creature\n9th \u2014 Insect Plague, Scrying\nDruid Level | Circle Spells\n3rd \u2014 Spider Climb, Web\n5th \u2014 Gaseous Form, Stinking Cloud\n7th \u2014 Greater Invisibility, Stone Shape\n9th \u2014 Cloudkill, Insect Plague"
        },
        {
          "level": 2,
          "name": "Circle of the Land",
          "desc": "The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition. These druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic. The circle's wisest members preside as the chief priests of communities that hold to the Old Faith and serve as advisors to the rulers of those folk. As a member of this circle, your magic is influenced by the land where you were initiated into the circle's mysterious rites."
        },
        {
          "level": 2,
          "name": "Natural Recovery",
          "desc": "Starting at 2nd level, you can regain some of your magical energy by sitting in meditation and communing with nature. During a short rest, you choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your druid level (rounded up), and none of the slots can be 6th level or higher. You can't use this feature again until you finish a long rest.\nFor example, when you are a 4th-level druid, you can recover up to two levels worth of spell slots. You can recover either a 2nd-level slot or two 1st-level slots."
        },
        {
          "level": 3,
          "name": "Circle of the Land",
          "desc": "Celebrate Connection to the Natural World\nThe Circle of the Land comprises mystics and sages who safeguard ancient knowledge and rites. These Druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic. The circle's wisest members preside as the chief priests of their communities."
        },
        {
          "level": 3,
          "name": "Circle of the Land Spells",
          "desc": "Whenever you finish a Long Rest, choose one type of land: arid, polar, temperate, or tropical. Consult the table below that corresponds to the chosen type; you have the spells listed for your Druid level and lower prepared.\nDruid Level | Circle Spells\n3rd \u2014 Blur, Burning Hands, Fire Bolt\n5th \u2014 Fireball\n7th \u2014 Blight\n9th \u2014 Wall Of Stone\nDruid Level | Circle Spells\n3rd \u2014 Fog Cloud, Hold Person, Ray Of Frost\n5th \u2014 Sleet Storm\n7th \u2014 Ice Storm\n9th \u2014 Cone Of Cold\nDruid Level | Circle Spells\n3rd \u2014 Misty Step, Shocking Grasp, Sleep\n5th \u2014 Lightning Bolt\n7th \u2014 Freedom Of Movement\n9th \u2014 Tree Stride\nDruid Level | Circle Spells\n3rd \u2014 Acid Splash, Ray Of Sickness, Web\n5th \u2014 Stinking Cloud\n7th \u2014 Polymorph\n9th \u2014 Insect Plague"
        },
        {
          "level": 3,
          "name": "Land's Aid",
          "desc": "As a Magic action, you can expend a use of your Wild Shape and choose a point within 60 feet of yourself. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in the Sphere must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much damage on a successful one. One creature of your choice in that area regains 2d6 Hit Points.\nThe damage and healing increase by 1d6 when you reach Druid levels 10 (3d6) and 14 (4d6)."
        },
        {
          "level": 6,
          "name": "Land's Stride",
          "desc": "Starting at 6th level, moving through nonmagical difficult terrain costs you no extra movement. You can also pass through nonmagical plants without being slowed by them and without taking damage from them if they have thorns, spines, or a similar hazard.\nIn addition, you have advantage on saving throws against plants that are magically created or manipulated to impede movement, such as those created by the Entangle spell."
        },
        {
          "level": 6,
          "name": "Natural Recovery",
          "desc": "You can cast one of the level 1+ spells that you have prepared from your Circle Spells feature without expending a spell slot, and you must finish a Long Rest before you do so again.\nIn addition, when you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your Druid level (round up), and none of them can be level 6+. For example, if you're a level 6 Druid, you can recover up to three levels' worth of spell slots. You can recover a level 3 spell slot, a level 2 and a level 1 spell slot, or three level 1 spell slots. Once you recover spell slots with this feature, you can't do so again until you finish a Long Rest."
        },
        {
          "level": 10,
          "name": "Nature's Ward",
          "desc": "When you reach 10th level, you can't be charmed or frightened by elementals or fey, and you are immune to poison and disease."
        },
        {
          "level": 10,
          "name": "Nature's Ward",
          "desc": "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.\nLand Type | Resistance\nArid \u2014 Fire\nPolar \u2014 Cold\nTemperate \u2014 Lightning\nTropical \u2014 Poison"
        },
        {
          "level": 14,
          "name": "Nature's Sanctuary",
          "desc": "When you reach 14th level, creatures of the natural world sense your connection to nature and become hesitant to attack you. When a beast or plant creature attacks you, that creature must make a Wisdom saving throw against your druid spell save DC. On a failed save, the creature must choose a different target, or the attack automatically misses. On a successful save, the creature is immune to this effect for 24 hours.\nThe creature is aware of this effect before it makes its attack against you."
        },
        {
          "level": 14,
          "name": "Nature's Sanctuary",
          "desc": "As a Magic action, you can expend a use of your Wild Shape and cause spectral trees and vines to appear in a 15-foot Cube on the ground within 120 feet of yourself. They last there for 1 minute or until you have the Incapacitated condition or die. You and your allies have Half Cover while in that area, and your allies gain the current Resistance of your Nature's Ward while there.\nAs a Bonus Action, you can move the Cube up to 60 feet to ground within 120 feet of yourself."
        }
      ]
    },
    "Circle of the Moon": {
      "features": [
        {
          "level": 2,
          "name": "Circle Forms",
          "desc": "The rites of your circle grant you the ability to transform into more dangerous animal forms. Starting at 2nd level, you can use your Wild Shape to transform into a beast with a challenge rating as high as 1 (you ignore the Max. CR column of the Beast Shapes table, but must abide by the other limitations there).\nStarting at 6th level, you can transform into a beast with a challenge rating as high as your druid level divided by 3, rounded down.\nLevel | Max. CR | Limitations\n2nd \u2014 1 \u2014 No flying or swimming speed\n4th \u2014 1 \u2014 No flying speed\n6th \u2014 2 \u2014 No flying speed\n8th \u2014 2 \u2014 \u2014\n9th \u2014 3 \u2014 \u2014\n12th \u2014 4 \u2014 \u2014\n15th \u2014 5 \u2014 \u2014\n18th \u2014 6 \u2014 \u2014"
        },
        {
          "level": 2,
          "name": "Circle of the Moon",
          "desc": "Druids of the Circle of the Moon are fierce guardians of the wilds. Their order gathers under the full moon to share news and trade warnings. They haunt the deepest parts of the wilderness, where they might go for weeks on end before crossing paths with another humanoid creature, let alone another druid.\nChangeable as the moon, a druid of this circle might prowl as a great cat one night, soar over the treetops as an eagle the next day, and crash through the undergrowth in bear form to drive off a trespassing monster. The wild is in the druid's blood."
        },
        {
          "level": 2,
          "name": "Combat Wild Shape",
          "desc": "You gain the ability to use Wild Shape on your turn as a bonus action, rather than as an action.\nAdditionally, while you are transformed by Wild Shape, you can use a bonus action to expend one spell slot to regain 1d8 hit points per level of the spell slot expended."
        },
        {
          "level": 3,
          "name": "Circle Forms",
          "desc": "You can channel lunar magic when you assume a Wild Shape form, granting you the benefits below.\nChallenge Rating: The maximum Challenge Rating for the form equals your Druid level divided by 3 (round down).\nArmor Class: Until you leave the form, your AC equals 13 plus your Wisdom modifier if that total is higher than the Beast's AC.\nTemporary Hit Points: You gain a number of Temporary Hit Points equal to three times your Druid level."
        },
        {
          "level": 3,
          "name": "Circle of the Moon",
          "desc": "Adopt Animal Forms to Guard the Wilds\nDruids of the Circle of the Moon draw on lunar magic to transform themselves. Their order gathers under the moon to share news and perform rituals.\nChangeable as the moon, a Druid of this circle might prowl as a great cat one night, soar over the treetops as an eagle the next day, and then crash through undergrowth as a bear to drive off a trespassing monster. The wild is in the Druid's blood."
        },
        {
          "level": 3,
          "name": "Circle of the Moon Spells",
          "desc": "When you reach a Druid level specified in the Circle of the Moon Spells table, you thereafter always have the listed spells prepared.\nIn addition, you can cast the spells from this feature while you're in a Wild Shape form.\nDruid Level | Prepared Spells\n3 \u2014 Cure Wounds, Moonbeam, Starry Wisp\n5 \u2014 Conjure Animals\n7 \u2014 Fount Of Moonlight\n9 \u2014 Mass Cure Wounds"
        },
        {
          "level": 6,
          "name": "Improved Circle Forms",
          "desc": "While in a Wild Shape form, you gain the following benefits.\nLunar Radiance: Each of your attacks in a Wild Shape form can deal its normal damage type or Radiant damage. You make this choice each time you hit with those attacks.\nIncreased Toughness: You can add your Wisdom modifier to your Constitution saving throws."
        },
        {
          "level": 6,
          "name": "Primal Strike",
          "desc": "Starting at 6th level, your attacks in beast form count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage."
        },
        {
          "level": 10,
          "name": "Elemental Wild Shape",
          "desc": "At 10th level, you can expend two uses of Wild Shape at the same time to transform into an air elemental, an earth elemental, a fire elemental, or a water elemental."
        },
        {
          "level": 10,
          "name": "Moonlight Step",
          "desc": "You magically transport yourself, reappearing amid a burst of moonlight. As a Bonus Action, you teleport up to 30 feet to an unoccupied space you can see, and you have Advantage on the next attack roll you make before the end of this turn.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest. You can also regain uses by expending a level 2+ spell slot for each use you want to restore (no action required)."
        },
        {
          "level": 14,
          "name": "Lunar Form",
          "desc": "The power of the moon suffuses you, granting you the following benefits.\nImproved Lunar Radiance: Once per turn, you can deal an extra 2d10 Radiant damage to a target you hit with a Wild Shape form's attack.\nShared Moonlight: Whenever you use Moonlight Step, you can also teleport one willing creature. That creature must be within 10 feet of you, and you teleport it to an unoccupied space you can see within 10 feet of your destination space."
        },
        {
          "level": 14,
          "name": "Thousand Forms",
          "desc": "By 14th level, you have learned to use magic to alter your physical form in more subtle ways. You can cast the Alter Self spell at will."
        }
      ]
    },
    "Circle of the Sea": {
      "features": [
        {
          "level": 3,
          "name": "Circle of the Sea",
          "desc": "Become One with Tides and Storms\nDruids of the Circle of the Sea draw on the tempestuous forces of oceans and storms. Some view themselves as embodiments of nature's wrath, seeking vengeance against those who despoil nature. Others seek mystical unity with nature by attuning themselves to the ebb and flow of the tides, following the rush of currents and waves and listening to the inscrutable whispers and roars of the winds."
        },
        {
          "level": 3,
          "name": "Circle of the Sea Spells",
          "desc": "When you reach a Druid level specified in the Circle of the Sea Spells table, you thereafter always have the listed spells prepared.\nDruid Level | Prepared Spells\n3rd \u2014 Fog Cloud, Gust Of Wind, Ray Of Frost, Shatter, Thunderwave\n5th \u2014 Lightning Bolt, Water Breathing\n7th \u2014 Control Water, Ice Storm\n9th \u2014 Conjure Elemental, Hold Monster"
        },
        {
          "level": 3,
          "name": "Wrath of the Sea",
          "desc": "As a Bonus Action, you can expend a use of your Wild Shape to manifest a 5-foot Emanation that takes the form of ocean spray that surrounds you for 10 minutes. It ends early if you dismiss it (no action required), manifest it again, or have the Incapacitated condition.\nWhen you manifest the Emanation and as a Bonus Action on your subsequent turns, you can choose another creature you can see in the Emanation. The target must succeed on a Constitution saving throw against your spell save DC or take Cold damage and, if the creature is Large or smaller, be pushed up to 15 feet away from you. To determine this damage, roll a number of d6s equal to your Wisdom modifier (minimum of one die)."
        },
        {
          "level": 6,
          "name": "Aquatic Affinity",
          "desc": "The size of the Emanation created by your Wrath of the Sea increases to 10 feet.\nIn addition, you gain a Swim Speed equal to your Speed."
        },
        {
          "level": 10,
          "name": "Stormborn",
          "desc": "Your Wrath of the Sea confers two more benefits while active, as detailed below.\nFlight: You gain a Fly Speed equal to your Speed.\nResistance: You have Resistance to Cold, Lightning, and Thunder damage."
        },
        {
          "level": 14,
          "name": "Oceanic Gift",
          "desc": "Instead of manifesting the Emanation of Wrath of the Sea around yourself, you can manifest it around one willing creature within 60 feet of yourself. That creature gains all the benefits of the Emanation and uses your spell save DC and Wisdom modifier for it.\nIn addition, you can manifest the Emanation around both the other creature and yourself if you expend two uses of your Wild Shape instead of one when manifesting it."
        }
      ]
    },
    "Circle of the Shepherd": {
      "features": [
        {
          "level": 2,
          "name": "Circle of the Shepherd",
          "desc": "Druids of the Circle of the Shepherd commune with the spirits of nature, especially the spirits of beasts and the fey, and call to those spirits for aid. These druids recognize that all living things play a role in the natural world, yet they focus on protecting animals and fey creatures that have difficulty defending themselves. Shepherds, as they are known, see such creatures as their charges. They ward off monsters that threaten them, rebuke hunters who kill more prey than necessary, and prevent civilization from encroaching on rare animal habitats and on sites sacred to the fey. Many of these druids are happiest far from cities and towns, content to spend their days in the company of animals and the fey creatures of the wilds.\nMembers of this circle become adventurers to oppose forces that threaten their charges or to seek knowledge and power that will help them safeguard their charges better. Wherever these druids go, the spirits of the wilderness are with them."
        },
        {
          "level": 2,
          "name": "Speech of the Woods",
          "desc": "At 2nd level, you gain the ability to converse with beasts and many fey.\nYou learn to speak, read, and write Sylvan. In addition, beasts can understand your speech, and you gain the ability to decipher their noises and motions. Most beasts lack the intelligence to convey or understand sophisticated concepts, but a friendly beast could relay what it has seen or heard in the recent past. This ability doesn't grant you friendship with beasts, though you can combine this ability with gifts to curry favor with them as you would with any nonplayer character."
        },
        {
          "level": 2,
          "name": "Spirit Totem",
          "desc": "Starting at 2nd level, you can call forth nature spirits to influence the world around you. As a bonus action, you can magically summon an incorporeal spirit to a point you can see within 60 feet of you. The spirit creates an aura in a 30-foot radius around that point. It counts as neither a creature nor an object, though it has the spectral appearance of the creature it represents.\nAs a bonus action, you can move the spirit up to 60 feet to a point you can see.\nThe spirit persists for 1 minute or until you're incapacitated. Once you use this feature, you can't use it again until you finish a short or long rest.\nThe effect of the spirit's aura depends on the type of spirit you summon from the options below.\nBear Spirit: The bear spirit grants you and your allies its might and endurance. Each creature of your choice in the aura when the spirit appears gains temporary hit points equal to 5 + your druid level. In addition, you and your allies gain advantage on Strength checks and Strength saving throws while in the aura.\nHawk Spirit: The hawk spirit is a consummate hunter, aiding you and your allies with its keen sight. When a creature makes an attack roll against a target in the spirit's aura, you can use your reaction to grant advantage to that attack roll. In addition, you and your allies have advantage on Wisdom (Perception) checks while in the aura.\nUnicorn Spirit: The unicorn spirit lends its protection to those nearby. You and your allies gain advantage on all ability checks made to detect creatures in the spirit's aura. In addition, if you cast a spell using a spell slot that restores hit points to any creature inside or outside the aura, each creature of your choice in the aura also regains hit points equal to your druid level."
        },
        {
          "level": 6,
          "name": "Mighty Summoner",
          "desc": "Starting at 6th level, beasts and fey that you conjure are more resilient than normal. Any beast or fey summoned or created by a spell that you cast gains the following benefits:\n\u2022 The creature appears with more hit points than normal: 2 extra hit points per Hit Die it has.\n\u2022 The damage from its natural weapons is considered magical for the purpose of overcoming immunity and resistance to nonmagical attacks and damage."
        },
        {
          "level": 10,
          "name": "Guardian Spirit",
          "desc": "Beginning at 10th level, your Spirit Totem safeguards the beasts and fey that you call forth with your magic. When a beast or fey that you summoned or created with a spell ends its turn in your Spirit Totem aura, that creature regains a number of hit points equal to half your druid level."
        },
        {
          "level": 14,
          "name": "Faithful Summons",
          "desc": "Starting at 14th level, the nature spirits you commune with protect you when you are the most defenseless. If you are reduced to 0 hit points or are incapacitated against your will, you can immediately gain the benefits of Conjure Animals as if it were cast using a 9th-level spell slot. It summons four beasts of your choice that are challenge rating 2 or lower. The conjured beasts appear within 20 feet of you. If they receive no commands from you, they protect you from harm and attack your foes. The spell lasts for 1 hour, requiring no concentration, or until you dismiss it (no action required).\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    }
  },
  "Fighter": {
    "Arcane Archer": {
      "features": [
        {
          "level": 3,
          "name": "Arcane Archer",
          "desc": "An Arcane Archer studies a unique elven method of archery that weaves magic into attacks to produce supernatural effects. Arcane Archers are some of the most elite warriors among the elves. They stand watch over the fringes of elven domains, keeping a keen eye out for trespassers and using magic-infused arrows to defeat monsters and invaders before they can reach elven settlements. Over the centuries, the methods of these elf archers have been learned by members of other races who can also balance arcane aptitude with archery."
        },
        {
          "level": 3,
          "name": "Arcane Archer",
          "desc": "Deploy Magical Effects Through Enchanted Ammunition\nAn Arcane Archer studies a unique elven method of archery that weaves magic into attacks to produce supernatural effects. Over the centuries, other folk have learned this technique and broadened it so it applies to ranged weapons of many kinds and to aspects of adventuring life outside of combat."
        },
        {
          "level": 3,
          "name": "Arcane Archer Lore",
          "desc": "At 3rd level, you learn magical theory or some of the secrets of nature\u2014typical for practitioners of this elven martial tradition. You choose to gain proficiency in either the Arcana or the Nature skill, and you choose to learn either the Prestidigitation or the Druidcraft cantrip."
        },
        {
          "level": 3,
          "name": "Arcane Archer Lore",
          "desc": "You learn magical theory and secrets of nature, granting you the following benefits.\nCantrip: You know either the Druidcraft or the Prestidigitation cantrip. Intelligence is your spellcasting ability for it.\nSkills: You gain proficiency in the Arcana and Nature skills. If you already have one of these proficiencies, you instead gain proficiency in a different skill of your choice from the skills available to Fighters at level 1 (or in two skills available to Fighters at level 1 if you have both)."
        },
        {
          "level": 3,
          "name": "Arcane Shot",
          "desc": "At 3rd level, you learn to unleash special magical effects with some of your shots. When you gain this feature, you learn two Arcane Shot options of your choice (see \"Arcane Shot Options\" below).\nOnce per turn when you fire an arrow from a shortbow or longbow as part of the Attack action, you can apply one of your Arcane Shot options to that arrow. You decide to use the option when the arrow hits a creature, unless the option doesn't involve an attack roll. You have two uses of this ability, and you regain all expended uses of it when you finish a short or long rest.\nYou gain an additional Arcane Shot option of your choice when you reach certain levels in this class: 7th, 10th, 15th, and 18th level. Each option also improves when you become an 18th-level fighter."
        },
        {
          "level": 3,
          "name": "Arcane Shot",
          "desc": "You learn to unleash special magical effects with your shots.\nYou learn two Arcane Shot options of your choice. You learn an additional Arcane Shot option of your choice when you reach Fighter levels 7, 10, 15, and 18. Each time you learn a new Arcane Shot option, you can also replace one option you know with a different one.\nUsing Arcane Shot: Once per turn when you make a ranged attack using a weapon with the Ammunition property, you can apply one of your Arcane Shot options to that attack. You decide to use the option when you hit a creature and deal damage to it unless the option doesn't involve an attack roll. You can use this feature a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a Short or Long Rest.\nArcane Shot Die: Arcane Shot options refer to your Arcane Shot Die. Your Arcane Shot Die is a d6.\nSaving Throws: If an Arcane Shot option requires a saving throw, the DC equals 8 plus your Intelligence modifier and Proficiency Bonus.\nAt Higher Levels: Your Arcane Shot Die changes when you reach certain Fighter levels. The die becomes a d8 at level 10, a d10 at level 15, and a d12 at level 18."
        },
        {
          "level": 3,
          "name": "Arcane Shot Options",
          "desc": "The Arcane Shot feature lets you choose options for it at certain levels. The options are presented here in alphabetical order. They are all magical effects, and each one is associated with one of the schools of magic.\nIf an option requires a saving throw, your Arcane Shot save DC is calculated as follows:\nArcane Shot:"
        },
        {
          "level": 3,
          "name": "Arcane Shot Options",
          "desc": "The Arcane Shot feature lets you choose options for it at certain levels. The options are presented here in alphabetical order."
        },
        {
          "level": 7,
          "name": "Additional Arcane Shot Option",
          "desc": "You gain an additional Arcane Shot option of your choice when you reach 7th level."
        },
        {
          "level": 7,
          "name": "Curving Shot",
          "desc": "At 7th level, you learn how to direct an errant arrow toward a new target. When you make an attack roll with a magic arrow and miss, you can use a bonus action to reroll the attack roll against a different target within 60 feet of the original target."
        },
        {
          "level": 7,
          "name": "Curving Shot",
          "desc": "You learn how to direct an errant shot toward a new target. If you make a ranged attack roll with a weapon with the Ammunition property and miss, you can cause the shot to ricochet toward a new target as a Bonus Action immediately after the attack misses. The new target must be a creature you can see within the weapon's range and within 60 feet of the attack's original target. Make an attack roll against the new target."
        },
        {
          "level": 7,
          "name": "Magic Arrow",
          "desc": "At 7th level, you gain the ability to infuse arrows with magic. Whenever you fire a nonmagical arrow from a shortbow or longbow, you can make it magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage. The magic fades from the arrow immediately after it hits or misses its target."
        },
        {
          "level": 7,
          "name": "Magical Ammunition",
          "desc": "You learn to imbue your ammunition with magical properties. As a Magic action, you can imbue a piece of nonmagical ammunition with one of the following magical properties and fire it at a solid surface you can see within the weapon's range. When the ammunition hits the surface, the ammunition's effect activates, and the ammunition attaches to the surface it hit for the duration of the effect; you can remove an attached piece of ammunition as a Magic action, ending the effect early. When the effect ends, the ammunition is destroyed.\nOnce you use this feature, you can't do so again until you finish a Short or Long Rest. You can also restore your use of this feature by expending a use of your Second Wind (no action required).\nDarkening Ammunition: Magical shadows fill a 15-foot Emanation originating from the ammunition for 1 minute. Nonmagical flames in the Emanation are extinguished, and creatures in the Emanation have a \u22125 penalty to Wisdom (Perception) checks and Passive Perception.\nUnlocking Ammunition: A burst of magic fills a 15-foot Emanation originating from the ammunition. The ammunition also emits a loud knocking sound, audible up to 300 feet away. Any object in the Emanation that is held shut by a nonmagical lock or that is stuck or barred becomes unlocked, unstuck, or unbarred. If such an object has multiple locks, only one of them is unlocked.\nVine Ammunition: A 120-foot-long vine grows from the ammunition. You and other creatures can then climb it. The vine withers away after 10 minutes."
        },
        {
          "level": 10,
          "name": "Additional Arcane Shot Option",
          "desc": "You gain an additional Arcane Shot option of your choice when you reach 10th level."
        },
        {
          "level": 10,
          "name": "Ever-Ready Shot",
          "desc": "When you roll Initiative, you can regain one expended use of Arcane Shot."
        },
        {
          "level": 15,
          "name": "Additional Arcane Shot Option",
          "desc": "You gain an additional Arcane Shot option of your choice when you reach 15th level."
        },
        {
          "level": 15,
          "name": "Ever-Ready Shot",
          "desc": "Starting at 15th level, your magical archery is available whenever battle starts. If you roll initiative and have no uses of Arcane Shot remaining, you regain one use of it."
        },
        {
          "level": 15,
          "name": "Indomitable Teleport",
          "desc": "Your magical mastery lets you escape dire situations. When you use your Indomitable feature and succeed on the saving throw, you can teleport up to 60 feet to an unoccupied space you can see."
        },
        {
          "level": 18,
          "name": "Additional Arcane Shot Option",
          "desc": "You gain an additional Arcane Shot option of your choice when you reach 18th level. Each option also improves when you become an 18th-level fighter."
        },
        {
          "level": 18,
          "name": "Masterful Shots",
          "desc": "You employ agility in your sharpshooting. When a creature you can see misses you with an attack roll, you can take a Reaction to move up to half your Speed away from the attacker without provoking Opportunity Attacks. You can then make a ranged attack roll against the attacker as part of this Reaction if the attacker is within the weapon's range."
        }
      ]
    },
    "Banneret": {
      "features": [
        {
          "level": 3,
          "name": "Banneret",
          "desc": "Rally Fellow Heroes with Inspiring Leadership\nBannerets are paragons of valor and leadership who protect the innocent and rally fellow adventurers to the causes of justice and freedom. Many are knights serving in Cormyr, the Silver Marches, Damara, Chessenta, or other lands across Faer\u00fbn. They wander the realms as knights errant, taking the fight against evil beyond their kingdom's borders.\nA Banneret relies on judgment, bravery, and fidelity to the code of chivalry to guide them in defeating evildoers. A lone Banneret is a skilled warrior, but when leading a band of allies one of these warriors can transform even a poorly equipped militia into a ferocious war band."
        },
        {
          "level": 3,
          "name": "Group Recovery",
          "desc": "When you use your Second Wind to regain Hit Points, you can choose a number of allies within a 30-foot Emanation originating from yourself, up to a number of allies equal to your Charisma modifier (minimum of one). Each of those allies regains Hit Points equal to 1d4 plus your Fighter level. Once you use this ability, you can't use it again until you finish a Short or Long Rest."
        },
        {
          "level": 3,
          "name": "Knightly Envoy",
          "desc": "You know how to conduct yourself with grace as a noble ambassador. You gain the following benefits.\nComprehension: You can cast the Comprehend Languages spell but only as a Ritual. Charisma is your spellcasting ability for it.\nPolyglot: You learn one language from the language tables in the Player's Handbook or chapter 2 of this book. When you finish a Long Rest, you can replace a language learned from this benefit with another language you have heard, seen signed, or read in the past 24 hours.\nWell Spoken: You gain proficiency in one of the following skills of your choice: Insight, Intimidation, Persuasion, or Performance."
        },
        {
          "level": 7,
          "name": "Team Tactics",
          "desc": "When you use Group Recovery, each chosen ally has Advantage on D20 Tests until the start of your next turn."
        },
        {
          "level": 10,
          "name": "Rallying Surge",
          "desc": "When you use your Action Surge, you can choose allies within a 30-foot Emanation originating from yourself, up to a number of allies equal to your Charisma modifier (minimum of one). Each of those allies can immediately take a Reaction to use one of the following options.\nAttack: The ally makes one attack with a weapon or an Unarmed Strike.\nMove: The ally moves up to half its Speed without provoking an Opportunity Attack."
        },
        {
          "level": 15,
          "name": "Shared Resilience",
          "desc": "When an ally you can see within 60 feet of yourself fails a saving throw, you can take a Reaction to expend a use of your Indomitable feature. The ally can immediately reroll the saving throw with a bonus equal to your Fighter level; the ally must use the new roll."
        },
        {
          "level": 18,
          "name": "Inspiring Commander",
          "desc": "You gain the following benefits.\nBolstered Rally: The area of effect for both Group Recovery and Rallying Surge is now a 60-foot Emanation.\nUnshakable Bravery: You have Immunity to the Charmed and Frightened conditions."
        }
      ]
    },
    "Battle Master": {
      "features": [
        {
          "level": 3,
          "name": "Battle Master",
          "desc": "Those who emulate the archetypal Battle Master employ martial techniques passed down through generations. To a Battle Master, combat is an academic field, sometimes including subjects beyond battle such as weaponsmithing and calligraphy. Not every fighter absorbs the lessons of history, theory, and artistry that are reflected in the Battle Master archetype, but those who do are well-rounded fighters of great skill and knowledge."
        },
        {
          "level": 3,
          "name": "Battle Master",
          "desc": "Master Sophisticated Battle Maneuvers\nBattle Masters are students of the art of battle, learning martial techniques passed down through generations. The most accomplished Battle Masters are well-rounded figures who combine their carefully honed combat skills with academic study in the fields of history, theory, and the arts."
        },
        {
          "level": 3,
          "name": "Combat Superiority",
          "desc": "When you choose this archetype at 3rd level, you learn maneuvers that are fueled by special dice called superiority dice.\nManeuvers: You learn three maneuvers of your choice, which are listed under \"Maneuvers\" below. Many maneuvers enhance an attack in some way. You can use only one maneuver per attack. You learn two additional maneuvers of your choice at 7th, 10th, and 15th level. Each time you learn new maneuvers, you can also replace one maneuver you know with a different one.\nSuperiority Dice: You have four superiority dice, which are d8s. A superiority die is expended when you use it. You regain all of your expended superiority dice when you finish a short or long rest. You gain another superiority die at 7th level and one more at 15th level.\nSaving Throws: Some of your maneuvers require your target to make a saving throw to resist the maneuver's effects. The saving throw DC is calculated as follows: Maneuver:"
        },
        {
          "level": 3,
          "name": "Combat Superiority",
          "desc": "Your experience on the battlefield has refined your fighting techniques. You learn maneuvers that are fueled by special dice called Superiority Dice.\nManeuvers: You learn three maneuvers of your choice from the \"Maneuvers Options\" section later in this subclass's description. Many maneuvers enhance an attack in some way. You can use only one maneuver per attack. You learn two additional maneuvers of your choice when you reach Fighter levels 7, 10, and 15. Each time you learn new maneuvers, you can also replace one maneuver you know with a different one.\nSuperiority Dice: You have four Superiority Dice, which are d8. A Superiority Die is expended when you use it. You regain all expended Superiority Dice when you finish a Short or Long Rest. You gain an additional Superiority Die when you reach Fighter levels 7 (five dice total) and 15 (six dice total).\nSaving Throws: If a maneuver requires a saving throw, the DC equals 8 plus your Strength or Dexterity modifier (your choice) and Proficiency Bonus."
        },
        {
          "level": 3,
          "name": "Maneuver Options",
          "desc": "3rd-level fighter optional feature\nIf you have access to maneuvers, the following maneuvers are added to the list of options available to you. Maneuvers are available to Battle Masters but also to characters who have a special feature like the Superior Technique fighting style or the Martial Adept feat."
        },
        {
          "level": 3,
          "name": "Maneuver Options",
          "desc": "The maneuvers are presented here in alphabetical order."
        },
        {
          "level": 3,
          "name": "Maneuvers",
          "desc": "The maneuvers are presented in alphabetical order."
        },
        {
          "level": 3,
          "name": "Student of War",
          "desc": "At 3rd level, you gain proficiency with one type of artisan's tools of your choice."
        },
        {
          "level": 3,
          "name": "Student of War",
          "desc": "You gain proficiency with one type of Artisan's Tools of your choice, and you gain proficiency in one skill of your choice from the skills available to Fighters at level 1."
        },
        {
          "level": 7,
          "name": "Additional Maneuvers",
          "desc": "At 7th level, you learn two additional maneuvers of your choice."
        },
        {
          "level": 7,
          "name": "Additional Superiority Die",
          "desc": "You gain another superiority die at 7th level."
        },
        {
          "level": 7,
          "name": "Know Your Enemy",
          "desc": "If you spend at least 1 minute observing or interacting with another creature outside combat, you can learn certain information about its capabilities compared to your own. The DM tells you if the creature is your equal, superior, or inferior in regard to two of the following characteristics of your choice:\n\u2022 Strength score\n\u2022 Dexterity score\n\u2022 Constitution score\n\u2022 Armor Class\n\u2022 Current hit points\n\u2022 Total class levels (if any)\n\u2022 Fighter class levels (if any)"
        },
        {
          "level": 7,
          "name": "Know Your Enemy",
          "desc": "As a Bonus Action, you can discern certain strengths and weaknesses of a creature you can see within 30 feet of yourself; you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if the creature has any, you know what they are.\nOnce you use this feature, you can't do so again until you finish a Long Rest. You can also restore a use of the feature by expending one Superiority Die (no action required)."
        },
        {
          "level": 10,
          "name": "Additional Maneuvers",
          "desc": "At 10th level, you learn two additional maneuvers of your choice."
        },
        {
          "level": 10,
          "name": "Improved Combat Superiority",
          "desc": "Your Superiority Die becomes a d10."
        },
        {
          "level": 10,
          "name": "Improved Combat Superiority (d10)",
          "desc": "At 10th level, your superiority dice turn into d10s."
        },
        {
          "level": 15,
          "name": "Additional Maneuvers",
          "desc": "At 15th level, you learn two additional maneuvers of your choice."
        },
        {
          "level": 15,
          "name": "Additional Superiority Die",
          "desc": "You gain another superiority die at 15th level."
        },
        {
          "level": 15,
          "name": "Relentless",
          "desc": "Starting at 15th level, when you roll initiative and have no superiority dice remaining, you regain 1 superiority die."
        },
        {
          "level": 15,
          "name": "Relentless",
          "desc": "Once per turn, when you use a maneuver, you can roll 1d8 and use the number rolled instead of expending a Superiority Die."
        },
        {
          "level": 18,
          "name": "Improved Combat Superiority (d12)",
          "desc": "At 18th level, your superiority dice turn into d12s."
        },
        {
          "level": 18,
          "name": "Ultimate Combat Superiority",
          "desc": "Your Superiority Die becomes a d12."
        }
      ]
    },
    "Cavalier": {
      "features": [
        {
          "level": 3,
          "name": "Bonus Proficiency",
          "desc": "When you choose this archetype at 3rd level, you gain proficiency in one of the following skills of your choice: Animal Handling, History, Insight, Performance, or Persuasion. Alternatively, you learn one language of your choice."
        },
        {
          "level": 3,
          "name": "Born to the Saddle",
          "desc": "Starting at 3rd level, your mastery as a rider becomes apparent. You have advantage on saving throws made to avoid falling off your mount. If you fall off your mount and descend no more than 10 feet, you can land on your feet if you're not incapacitated.\nFinally, mounting or dismounting a creature costs you only 5 feet of movement, rather than half your speed."
        },
        {
          "level": 3,
          "name": "Cavalier",
          "desc": "The archetypal Cavalier excels at mounted combat. Usually born among the nobility and raised at court, a Cavalier is equally at home leading a cavalry charge or exchanging repartee at a state dinner. Cavaliers also learn how to guard those in their charge from harm, often serving as the protectors of their superiors and of the weak. Compelled to right wrongs or earn prestige, many of these fighters leave their lives of comfort to embark on glorious adventure."
        },
        {
          "level": 3,
          "name": "Unwavering Mark",
          "desc": "Starting at 3rd level, you can menace your foes, foiling their attacks and punishing them for harming others. When you hit a creature with a melee weapon attack, you can mark the creature until the end of your next turn. This effect ends early if you are incapacitated or you die, or if someone else marks the creature.\nWhile it is within 5 feet of you, a creature marked by you has disadvantage on any attack roll that doesn't target you.\nIn addition, if a creature marked by you deals damage to anyone other than you, you can make a special melee weapon attack against the marked creature as a bonus action on your next turn. You have advantage on the attack roll, and if it hits, the attack's weapon deals extra damage to the target equal to half your fighter level.\nRegardless of the number of creatures you mark, you can make this special attack a number of times equal to your Strength modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 7,
          "name": "Warding Maneuver",
          "desc": "At 7th level, you learn to fend off strikes directed at you, your mount, or other creatures nearby. If you or a creature you can see within 5 feet of you is hit by an attack, you can roll 1d8 as a reaction if you're wielding a melee weapon or a shield. Roll the die, and add the number rolled to the target's AC against that attack. If the attack still hits, the target has resistance against the attack's damage.\nYou can use this feature a number of times equal to your Constitution modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 10,
          "name": "Hold the Line",
          "desc": "At 10th level, you become a master of locking down your enemies. Creatures provoke an opportunity attack from you when they move 5 feet or more while within your reach, and if you hit a creature with an opportunity attack, the target's speed is reduced to 0 until the end of the current turn."
        },
        {
          "level": 15,
          "name": "Ferocious Charger",
          "desc": "Starting at 15th level, you can run down your foes, whether you're mounted or not. If you move at least 10 feet in a straight line right before attacking a creature and you hit it with the attack, that target must succeed on a Strength saving throw (DC 8 + your proficiency bonus + your Strength modifier) or be knocked prone. You can use this feature only once on each of your turns."
        },
        {
          "level": 18,
          "name": "Vigilant Defender",
          "desc": "Starting at 18th level, you respond to danger with extraordinary vigilance. In combat, you get a special reaction that you can take once on every creature's turn, except your turn. You can use this special reaction only to make an opportunity attack, and you can't use it on the same turn that you take your normal reaction."
        }
      ]
    },
    "Champion": {
      "features": [
        {
          "level": 3,
          "name": "Champion",
          "desc": "The archetypal Champion focuses on the development of raw physical power honed to deadly perfection. Those who model themselves on this archetype combine rigorous training with physical excellence to deal devastating blows."
        },
        {
          "level": 3,
          "name": "Champion",
          "desc": "Pursue Physical Excellence in Combat\nA Champion focuses on the development of martial prowess in a relentless pursuit of victory. Champions combine rigorous training with physical excellence to deal devastating blows, withstand peril, and garner glory. Whether in athletic contests or bloody battle, Champions strive for the crown of the victor."
        },
        {
          "level": 3,
          "name": "Improved Critical",
          "desc": "Beginning when you choose this archetype at 3rd level, your weapon attacks score a critical hit on a roll of 19 or 20."
        },
        {
          "level": 3,
          "name": "Improved Critical",
          "desc": "Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20."
        },
        {
          "level": 3,
          "name": "Remarkable Athlete",
          "desc": "Thanks to your athleticism, you have Advantage on Initiative rolls and Strength (Athletics) checks.\nIn addition, immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks."
        },
        {
          "level": 7,
          "name": "Additional Fighting Style",
          "desc": "You gain another Fighting Style feat of your choice."
        },
        {
          "level": 7,
          "name": "Remarkable Athlete",
          "desc": "Starting at 7th level, you can add half your proficiency bonus (round up) to any Strength, Dexterity, or Constitution check you make that doesn't already use your proficiency bonus.\nIn addition, when you make a running long jump, the distance you can cover increases by a number of feet equal to your Strength modifier."
        },
        {
          "level": 10,
          "name": "Additional Fighting Style",
          "desc": "At 10th level, you can choose a second option from the Fighting Style class feature."
        },
        {
          "level": 10,
          "name": "Heroic Warrior",
          "desc": "The thrill of battle drives you toward victory. During combat, you can give yourself Heroic Inspiration whenever you start your turn without it."
        },
        {
          "level": 15,
          "name": "Superior Critical",
          "desc": "Starting at 15th level, your weapon attacks score a critical hit on a roll of 18-20."
        },
        {
          "level": 15,
          "name": "Superior Critical",
          "desc": "Your attack rolls with weapons and Unarmed Strikes can now score a Critical Hit on a roll of 18\u201320 on the d20."
        },
        {
          "level": 18,
          "name": "Survivor",
          "desc": "At 18th level, you attain the pinnacle of resilience in battle. At the start of each of your turns, you regain hit points equal to 5 + your Constitution modifier if you have no more than half of your hit points left. You don't gain this benefit if you have 0 hit points."
        },
        {
          "level": 18,
          "name": "Survivor",
          "desc": "You attain the pinnacle of resilience in battle, giving you these benefits.\nDefy Death: You have Advantage on Death Saving Throws. Moreover, when you roll 18\u201320 on a Death Saving Throw, you gain the benefit of rolling a 20 on it.\nHeroic Rally: At the start of each of your turns, you regain Hit Points equal to 5 plus your Constitution modifier if you are Bloodied and have at least 1 Hit Point."
        }
      ]
    },
    "Echo Knight": {
      "features": [
        {
          "level": 3,
          "name": "Echo Knight",
          "desc": "A mysterious and feared frontline warrior of the Kryn Dynasty, the Echo Knight has mastered the art of using dunamis to summon the fading shades of unrealized timelines to aid them in battle. Surrounded by echoes of their own might, they charge into the fray as a cycling swarm of shadows and strikes."
        },
        {
          "level": 3,
          "name": "Manifest Echo",
          "desc": "3rd-level Echo Knight feature\nYou can use a bonus action to magically manifest an echo of yourself in an unoccupied space you can see within 15 feet of you. This echo is a magical, translucent, gray image of you that lasts until it is destroyed, until you dismiss it as a bonus action, until you manifest another echo, or until you're incapacitated.\nYour echo has AC 14 + your proficiency bonus, 1 hit point, and immunity to all conditions. If it has to make a saving throw, it uses your saving throw bonus for the roll. It is the same size as you, and it occupies its space. On your turn, you can mentally command the echo to move up to 30 feet in any direction (no action required). If your echo is ever more than 30 feet from you at the end of your turn, it is destroyed.\nYou can use the echo in the following ways:\n\u2022 As a bonus action, you can teleport, magically swapping places with your echo at a cost of 15 feet of your movement, regardless of the distance between the two of you.\n\u2022 When you take the Attack action on your turn, any attack you make with that action can originate from your space or the echo's space. You make this choice for each attack.\n\u2022 When a creature that you can see within 5 feet of your echo moves at least 5 feet away from it, you can use your reaction to make an opportunity attack against that creature as if you were in the echo's space."
        },
        {
          "level": 3,
          "name": "Unleash Incarnation",
          "desc": "3rd-level Echo Knight feature\nYou can heighten your echo's fury. Whenever you take the Attack action, you can make one additional melee attack from the echo's position.\nYou can use this feature a number of times equal to your Constitution modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 7,
          "name": "Echo Avatar",
          "desc": "7th-level Echo Knight feature\nYou can temporarily transfer your consciousness to your echo. As an action, you can see through your echo's eyes and hear through its ears. During this time, you are deafened and blinded. You can sustain this effect for up to 10 minutes, and you can end it at any time (requires no action). While your echo is being used in this way, it can be up to 1,000 feet away from you without being destroyed."
        },
        {
          "level": 10,
          "name": "Shadow Martyr",
          "desc": "10th-level Echo Knight feature\nYou can make your echo throw itself in front of an attack directed at another creature that you can see. Before the attack roll is made, you can use your reaction to teleport the echo to an unoccupied space within 5 feet of the targeted creature. The attack roll that triggered the reaction is instead made against your echo.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 15,
          "name": "Reclaim Potential",
          "desc": "15th-level Echo Knight feature\nYou've learned to absorb the fleeting magic of your echo. When an echo of yours is destroyed by taking damage, you can gain a number of temporary hit points equal to 2d6 + your Constitution modifier, provided you don't already have temporary hit points.\nYou can use this feature a number of times equal to your Constitution modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 18,
          "name": "Legion of One",
          "desc": "18th-level Echo Knight feature\nYou can use a bonus action to create two echoes with your Manifest Echo feature, and these echoes can coexist. If you try to create a third echo, the previous two echoes are destroyed. Anything you can do from one echo's position can be done from the other's instead.\nIn addition, when you roll initiative and have no uses of your Unleash Incarnation feature left, you regain one use of that feature."
        }
      ]
    },
    "Eldritch Knight": {
      "features": [
        {
          "level": 3,
          "name": "Eldritch Knight",
          "desc": "The archetypal Eldritch Knight combines the martial mastery common to all fighters with a careful study of magic. Eldritch Knights use magical techniques similar to those practiced by wizards. They focus their study on two of the eight schools of magic\u2014abjuration and evocation. Abjuration spells grant an Eldritch Knight additional protection in battle, and evocation spells deal damage to many foes at once, extending the fighter's reach in combat. These knights learn a comparatively small number of spells, committing them to memory instead of keeping them in a spellbook."
        },
        {
          "level": 3,
          "name": "Eldritch Knight",
          "desc": "Support Combat Skills with Arcane Magic\nEldritch Knights combine the martial mastery common to all Fighters with a careful study of magic. Their spells both complement and extend their combat skills, providing additional protection to shore up their armor and also allowing them to engage many foes at once with explosive magic."
        },
        {
          "level": 3,
          "name": "Spellcasting",
          "desc": "When you reach 3rd level, you augment your martial prowess with the ability to cast spells. See chapter 10 for the general rules of spellcasting and chapter 11 for the wizard spell list.\nCantrips: You learn two cantrips of your choice from the wizard spell list. You learn an additional wizard cantrip of your choice at 10th level.\nSpell Slots: The Eldritch Knight Spellcasting table shows how many spell slots you have to cast your wizard spells of 1st level and higher. To cast one of these spells, you must expend a slot of the spell's level or higher. You regain all expended spell slots when you finish a long rest. For example, if you know the 1st-level spell Shield and have a 1st-level and a 2nd-level spell slot available, you can cast Shield using either slot.\nSpells Known of 1st-Level and Higher: You know three 1st-level wizard spells of your choice, two of which you must choose from the abjuration and evocation spells on the wizard spell list. The Spells Known column of the Eldritch Knight Spellcasting table shows when you learn more wizard spells of 1st level or higher. Each of these spells must be an abjuration or evocation spell of your choice, and must be of a level for which you have spell slots. For instance, when you reach 7th level in this class, you can learn one new spell of 1st or 2nd level. The spells you learn at 8th, 14th, and 20th level can come from any school of magic. Whenever you gain a level in this class, you can replace one of the wizard spells you know with another spell of your choice from the wizard spell list. The new spell must be of a level for which you have spell slots, and it must be an abjuration or evocation spell, unless you're replacing the spell you gained at 3rd, 8th, 14th, or 20th level from any school of magic.\nSpellcasting Ability: Intelligence is your spellcasting ability for your wizard spells, since you learn your spells through study and memorization. You use your Intelligence whenever a spell refers to your spellcasting ability. In addition, you use your Intelligence modifier when setting the saving throw DC for a wizard spell you cast and when making an attack roll with one. Spell:  Spell:"
        },
        {
          "level": 3,
          "name": "Spellcasting",
          "desc": "You have learned to cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules as an Eldritch Knight.\nCantrips: You know two cantrips of your choice from the Wizard spell list (see that class's section for its list). Ray Of Frost and Shocking Grasp are recommended. Whenever you gain a Fighter level, you can replace one of these cantrips with another cantrip of your choice from the Wizard spell list. When you reach Fighter level 10, you learn another Wizard cantrip of your choice.\nSpell Slots: The Eldritch Knight Spellcasting table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose three level 1 spells from the Wizard spell list. Burning Hands, Jump, and Shield are recommended. The number of spells on your list increases as you gain Fighter levels, as shown in the Prepared Spells column of the Eldritch Knight Spellcasting table. Whenever that number increases, choose additional spells from the Wizard spell list until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 7 Fighter, your list of prepared spells can include five Wizard spells of levels 1 and 2 in any combination.\nChanging your Prepared Spells: Whenever you gain a Fighter level, you can replace one spell on your list with another Wizard spell for which you have spell slots.\nSpellcasting Ability: Intelligence is your spellcasting ability for your Wizard spells.\nSpellcasting Focus: You can use an Arcane Focus as a Spellcasting Focus for your Wizard spells."
        },
        {
          "level": 3,
          "name": "War Bond",
          "desc": "You learn a ritual that creates a magical bond between yourself and one weapon. You perform the ritual over the course of 1 hour, which can be done during a Short Rest. The weapon must be within your reach throughout the ritual, at the conclusion of which you touch the weapon and forge the bond. The bond fails if another Fighter is bonded to the weapon or if the weapon is a magic item to which someone else is attuned.\nOnce you have bonded a weapon to yourself, you can't be disarmed of that weapon unless you have the Incapacitated condition. If it is on the same plane of existence, you can summon that weapon as a Bonus Action, causing it to teleport instantly to your hand.\nYou can have up to two bonded weapons, but you can summon only one at a time with a Bonus Action. If you attempt to bond with a third weapon, you must break the bond with one of the other two."
        },
        {
          "level": 3,
          "name": "Weapon Bond",
          "desc": "At 3rd level, you learn a ritual that creates a magical bond between yourself and one weapon. You perform the ritual over the course of 1 hour, which can be done during a short rest. The weapon must be within your reach throughout the ritual, at the conclusion of which you touch the weapon and forge the bond.\nOnce you have bonded a weapon to yourself, you can't be disarmed of that weapon unless you are incapacitated. If it is on the same plane of existence, you can summon that weapon as a bonus action on your turn, causing it to teleport instantly to your hand.\nYou can have up to two bonded weapons, but can summon only one at a time with your bonus action. If you attempt to bond with a third weapon, you must break the bond with one of the other two."
        },
        {
          "level": 7,
          "name": "War Magic",
          "desc": "Beginning at 7th level, when you use your action to cast a cantrip, you can make one weapon attack as a bonus action."
        },
        {
          "level": 7,
          "name": "War Magic",
          "desc": "When you take the Attack action on your turn, you can replace one of the attacks with a casting of one of your Wizard cantrips that has a casting time of an action."
        },
        {
          "level": 10,
          "name": "Eldritch Strike",
          "desc": "At 10th level, you learn how to make your weapon strikes undercut a creature's resistance to your spells. When you hit a creature with a weapon attack, that creature has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn."
        },
        {
          "level": 10,
          "name": "Eldritch Strike",
          "desc": "You learn how to make your weapon strikes undercut a creature's ability to withstand your spells. When you hit a creature with an attack using a weapon, that creature has Disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn."
        },
        {
          "level": 15,
          "name": "Arcane Charge",
          "desc": "At 15th level, you gain the ability to teleport up to 30 feet to an unoccupied space you can see when you use your Action Surge. You can teleport before or after the additional action."
        },
        {
          "level": 15,
          "name": "Arcane Charge",
          "desc": "When you use your Action Surge, you can teleport up to 30 feet to an unoccupied space you can see. You can teleport before or after the additional action."
        },
        {
          "level": 18,
          "name": "Improved War Magic",
          "desc": "Starting at 18th level, when you use your action to cast a spell, you can make one weapon attack as a bonus action."
        },
        {
          "level": 18,
          "name": "Improved War Magic",
          "desc": "When you take the Attack action on your turn, you can replace two of the attacks with a casting of one of your level 1 or level 2 Wizard spells that has a casting time of an action."
        }
      ]
    },
    "Psi Warrior": {
      "features": [
        {
          "level": 3,
          "name": "Protective Field",
          "desc": "When you or another creature you can see within 30 feet of you takes damage, you can use your reaction to expend one Psionic Energy die, roll the die, and reduce the damage taken by the number rolled plus your Intelligence modifier (minimum reduction of 1), as you create a momentary shield of telekinetic force."
        },
        {
          "level": 3,
          "name": "Protective Field",
          "desc": "When you or another creature you can see within 30 feet of you takes damage, you can take a Reaction to expend one Psionic Energy Die, roll the die, and reduce the damage taken by the number rolled plus your Intelligence modifier (minimum reduction of 1), as you create a momentary shield of telekinetic force."
        },
        {
          "level": 3,
          "name": "Psi Warrior",
          "desc": "Awake to the psionic power within, a Psi Warrior is a fighter who augments their physical might with psi-infused weapon strikes, telekinetic lashes, and barriers of mental force. Many githyanki train to become such warriors, as do some of the most disciplined high elves. In the world of Eberron, many young kalashtar dream of becoming Psi Warriors.\nAs a Psi Warrior, you might have honed your psionic abilities through solo discipline, unlocked it under the tutelage of a master, or refined it at an academy dedicated to wielding the mind's power as both weapon and shield."
        },
        {
          "level": 3,
          "name": "Psi Warrior",
          "desc": "Augment Physical Might with Psionic Power\nPsi Warriors awaken the power of their minds to augment their physical might. They harness this psionic power to infuse their weapon strikes, lash out with telekinetic energy, and create barriers of mental force."
        },
        {
          "level": 3,
          "name": "Psionic Power",
          "desc": "3rd-level Psi Warrior feature\nYou harbor a wellspring of psionic energy within yourself. This energy is represented by your Psionic Energy dice, which are each a d6. You have a number of these dice equal to twice your proficiency bonus, and they fuel various psionic powers you have, which are detailed below.\nSome of your powers expend the Psionic Energy die they use, as specified in a power's description, and you can't use a power if it requires you to use a die when your dice are all expended. You regain all your expended Psionic Energy dice when you finish a long rest. In addition, as a bonus action, you can regain one expended Psionic Energy die, but you can't do so again until you finish a short or long rest.\nWhen you reach certain levels in this class, the size of your Psionic Energy dice increases: at 5th level (d8), 11th level (d10), and 17th level (d12).\nThe powers below use your Psionic Energy dice."
        },
        {
          "level": 3,
          "name": "Psionic Power",
          "desc": "You harbor a wellspring of psionic energy within yourself. It is represented by your Psionic Energy Dice, which fuel powers you have from this subclass. The Psi Warrior Energy Dice table shows the die size and number of these dice you have when you reach certain Fighter levels.\nFighter Level | Die Size | Number\n3 \u2014 D6 \u2014 4\n5 \u2014 D8 \u2014 6\n9 \u2014 D8 \u2014 8\n11 \u2014 D10 \u2014 8\n13 \u2014 D10 \u2014 10\n17 \u2014 D12 \u2014 12\nAny features in this subclass that use a Psionic Energy Die use only the dice from this subclass. Some of your powers expend the Psionic Energy Die, as specified in a power's description, and you can't use a power if it requires you to use a die when all your Psionic Energy Dice are expended.\nYou regain one of your expended Psionic Energy Dice when you finish a Short Rest, and you regain all of them when you finish a Long Rest."
        },
        {
          "level": 3,
          "name": "Psionic Strike",
          "desc": "You can propel your weapons with psionic force. Once on each of your turns, immediately after you hit a target within 30 feet of you with an attack and deal damage to it with a weapon, you can expend one Psionic Energy die, rolling it and dealing force damage to the target equal to the number rolled plus your Intelligence modifier."
        },
        {
          "level": 3,
          "name": "Psionic Strike",
          "desc": "You can propel your weapons with psionic force. Once on each of your turns, immediately after you hit a target within 30 feet of yourself with an attack and deal damage to it with a weapon, you can expend one Psionic Energy Die, rolling it and dealing Force damage to the target equal to the number rolled plus your Intelligence modifier."
        },
        {
          "level": 3,
          "name": "Telekinetic Movement",
          "desc": "You can move an object or a creature with your mind. As an action, you target one loose object that is Large or smaller or one willing creature, other than yourself. If you can see the target and it is within 30 feet of you, you can move it up to 30 feet to an unoccupied space you can see. Alternatively, if it is a Tiny object, you can move it to or from your hand. Either way, you can move the target horizontally, vertically, or both. Once you take this action, you can't do so again until you finish a short or long rest, unless you expend a Psionic Energy die to take it again."
        },
        {
          "level": 3,
          "name": "Telekinetic Movement",
          "desc": "You can move an object or a creature with your mind. As a Magic action, choose one target you can see within 30 feet of yourself; the target must be a loose object that is Large or smaller or one willing creature other than you. You transport the target up to 30 feet to an unoccupied space you can see. Alternatively, if the target is a Tiny object, you can transport it to or from your hand.\nOnce you take this action, you can't do so again until you finish a Short or Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."
        },
        {
          "level": 7,
          "name": "Psi-Powered Leap",
          "desc": "As a bonus action, you can propel your body with your mind. You gain a flying speed equal to twice your walking speed until the end of the current turn. Once you take this bonus action, you can't do so again until you finish a short or long rest, unless you expend a Psionic Energy die to take it again."
        },
        {
          "level": 7,
          "name": "Psi-Powered Leap",
          "desc": "As a Bonus Action, you gain a Fly Speed equal to twice your Speed until the end of the current turn. Once you take this Bonus Action, you can't do so again until you finish a Short or Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."
        },
        {
          "level": 7,
          "name": "Telekinetic Adept",
          "desc": "7th-level Psi Warrior feature\nYou have mastered new ways to use your telekinetic abilities, detailed below."
        },
        {
          "level": 7,
          "name": "Telekinetic Adept",
          "desc": "You have mastered new ways to use your telekinetic abilities, detailed below."
        },
        {
          "level": 7,
          "name": "Telekinetic Thrust",
          "desc": "When you deal damage to a target with your Psionic Strike, you can force the target to make a Strength saving throw against a DC equal to 8 + your proficiency bonus + your Intelligence modifier. If the save fails, you can knock the target prone or move it up to 10 feet in any direction horizontally."
        },
        {
          "level": 7,
          "name": "Telekinetic Thrust",
          "desc": "When you deal damage to a target with your Psionic Strike, you can force the target to make a Strength saving throw (DC 8 plus your Intelligence modifier and Proficiency Bonus). On a failed save, you can give the target the Prone condition or transport it up to 10 feet horizontally."
        },
        {
          "level": 10,
          "name": "Guarded Mind",
          "desc": "10th-level Psi Warrior feature\nThe psionic energy flowing through you has bolstered your mind. You have resistance to psychic damage. Moreover, if you start your turn charmed or frightened, you can expend a Psionic Energy die and end every effect on yourself subjecting you to those conditions."
        },
        {
          "level": 10,
          "name": "Guarded Mind",
          "desc": "You have Resistance to Psychic damage. Moreover, if you start your turn with the Charmed or Frightened condition, you can expend a Psionic Energy Die (no action required) and end every effect on yourself giving you those conditions."
        },
        {
          "level": 15,
          "name": "Bulwark of Force",
          "desc": "15th-level Psi Warrior feature\nYou can shield yourself and others with telekinetic force. As a bonus action, you can choose creatures, which can include you, that you can see within 30 feet of you, up to a number of creatures equal to your Intelligence modifier (minimum of one creature). Each of the chosen creatures is protected by Cover for 1 minute or until you're incapacitated.\nOnce you take this bonus action, you can't do so again until you finish a long rest, unless you expend a Psionic Energy die to take it again."
        },
        {
          "level": 15,
          "name": "Bulwark of Force",
          "desc": "You can shield yourself and others with telekinetic force. As a Bonus Action, you can choose creatures, including yourself, within 30 feet of yourself, up to a number of creatures equal to your Intelligence modifier (minimum of one creature). Each of the chosen creatures has Half Cover for 1 minute or until you have the Incapacitated condition.\nOnce you use this feature, you can't do so again until you finish a Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."
        },
        {
          "level": 18,
          "name": "Telekinetic Master",
          "desc": "18th-level Psi Warrior feature\nYour ability to move creatures and objects with your mind is matched by few. You can cast the Telekinesis spell, requiring no components, and your spellcasting ability for the spell is Intelligence. On each of your turns while you concentrate on the spell, including the turn when you cast it, you can make one attack with a weapon as a bonus action.\nOnce you cast the spell with this feature, you can't do so again until you finish a long rest, unless you expend a Psionic Energy die to cast it again."
        },
        {
          "level": 18,
          "name": "Telekinetic Master",
          "desc": "You always have the Telekinesis spell prepared. With this feature, you can cast it without a spell slot or components, and your spellcasting ability for it is Intelligence. On each of your turns while you maintain Concentration on it, including the turn when you cast it, you can make one attack with a weapon as a Bonus Action.\nOnce you cast the spell with this feature, you can't do so in this way again until you finish a Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."
        }
      ]
    },
    "Purple Dragon Knight (Banneret)": {
      "features": [
        {
          "level": 3,
          "name": "Purple Dragon Knight (Banneret)",
          "desc": "Purple Dragon Knights are warriors who hail from the kingdom of Cormyr. Pledged to protect the crown, they take the fight against evil beyond the kingdom's borders. They are tasked with wandering the land as knights errant, relying on their judgment, bravery, and fidelity to guide them in defeating evildoers.\nA Purple Dragon Knight inspires greatness in others by committing brave deeds in battle. The mere presence of a knight in a hamlet is enough to cause some orcs and bandits to seek easier prey. A lone knight is a skilled warrior, but a knight leading a band of allies can transform even the most poorly equipped militia into a ferocious war band.\nA knight prefers to lead through deeds, not words. As a knight spearheads an attack, the knight's actions can awaken reserves of courage and conviction in allies that they never suspected they had."
        },
        {
          "level": 3,
          "name": "Rallying Cry",
          "desc": "When you choose this archetype at 3rd level, you learn how to inspire your allies to fight on past their injuries.\nWhen you use your Second Wind feature, you can choose up to three creatures within 60 feet of you that are allied with you. Each one regains hit points equal to your fighter level, provided that the creature can see or hear you."
        },
        {
          "level": 3,
          "name": "Restriction: Knighthood",
          "desc": "Purple Dragon Knights are tied to a specific order of Cormyrean knighthood.\nBanneret serves as the generic name for this archetype if you use it in other campaign settings or to model warlords other than the Purple Dragon Knights."
        },
        {
          "level": 7,
          "name": "Royal Envoy",
          "desc": "A Purple Dragon Knight serves as an envoy of the Cormyrean crown. Knights of high standing are expected to conduct themselves with grace.\nAt 7th level, you gain proficiency in the Persuasion skill. If you are already proficient in it, you gain proficiency in one of the following skills of your choice: Animal Handling, Insight, Intimidation, or Performance.\nYour proficiency bonus is doubled for any ability check you make that uses Persuasion. You receive this benefit regardless of the skill proficiency you gain from this feature."
        },
        {
          "level": 10,
          "name": "Inspiring Surge",
          "desc": "Starting at 10th level, when you use your Action Surge feature, you can choose one creature within 60 feet of you that is allied with you. That creature can make one melee or ranged weapon attack with its reaction, provided that it can see or hear you.\nStarting at 18th level, you can choose two allies within 60 feet of you, rather than one."
        },
        {
          "level": 15,
          "name": "Bulwark",
          "desc": "Beginning at 15th level, you can extend the benefit of your Indomitable feature to an ally. When you decide to use Indomitable to reroll an Intelligence, a Wisdom, or a Charisma saving throw and you aren't incapacitated, you can choose one ally within 60 feet of you that also failed its saving throw against the same effect. If that creature can see or hear you, it can reroll its saving throw and must use the new roll."
        },
        {
          "level": 18,
          "name": "Inspiring Surge",
          "desc": "Starting at 18th level, you can choose two allies within 60 feet of you, rather than one."
        }
      ]
    },
    "Rune Knight": {
      "features": [
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "3rd-level Rune Knight feature\nYou gain proficiency with smith's tools, and you learn to speak, read, and write Giant."
        },
        {
          "level": 3,
          "name": "Giant's Might",
          "desc": "3rd-level Rune Knight feature\nYou have learned how to imbue yourself with the might of giants. As a bonus action, you magically gain the following benefits, which last for 1 minute:\n\u2022 If you are smaller than Large, you become Large, along with anything you are wearing. If you lack the room to become Large, your size doesn't change.\n\u2022 You have advantage on Strength checks and Strength saving throws.\n\u2022 Once on each of your turns, one of your attacks with a weapon or an unarmed strike can deal an extra 1d6 damage to a target on a hit.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 3,
          "name": "Rune Carver",
          "desc": "3rd-level Rune Knight feature\nYou can use magic runes to enhance your gear. You learn two runes of your choice, from among the runes described below, and each time you gain a level in this class, you can replace one rune you know with a different one from this feature. When you reach certain levels in this class, you learn additional runes, as shown in the Runes Known table.\nWhenever you finish a long rest, you can touch a number of objects equal to the number of runes you know, and you inscribe a different rune onto each of the objects. To be eligible, an object must be a weapon, a suit of armor, a shield, a piece of jewelry, or something else you can wear or hold in a hand. Your rune remains on an object until you finish a long rest, and an object can bear only one of your runes at a time.\nFighter Level | Number of Runes\n3rd \u2014 2\n7th \u2014 3\n10th \u2014 4\n15th \u2014 5\nThe following runes are available to you when you learn a rune. If a rune has a level requirement, you must be at least that level in this class to learn the rune. If a rune requires a saving throw, your Rune Magic save DC equals 8 + your proficiency bonus + your Constitution modifier.\nHill Rune (7th Level or Higher): \nStorm Rune (7th Level or Higher):"
        },
        {
          "level": 3,
          "name": "Rune Knight",
          "desc": "Rune Knights enhance their martial prowess using the supernatural power of runes, an ancient practice that originated with giants. Rune cutters can be found among any family of giants, and you likely learned your methods first or second hand from such a mystical artisan. Whether you found the giant's work carved into a hill or cave, learned of the runes from a sage, or met the giant in person, you studied the giant's craft and learned how to apply magic runes to empower your equipment."
        },
        {
          "level": 7,
          "name": "Additional Rune Known",
          "desc": "7th-level Rune Knight feature\nYou learn an additional Rune."
        },
        {
          "level": 7,
          "name": "Runic Shield",
          "desc": "7th-level Rune Knight feature\nYou learn to invoke your rune magic to protect your allies. When another creature you can see within 60 feet of you is hit by an attack roll, you can use your reaction to force the attacker to reroll the d20 and use the new roll.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 10,
          "name": "Additional Rune Known",
          "desc": "10th-level Rune Knight feature\nYou learn an additional Rune."
        },
        {
          "level": 10,
          "name": "Great Stature",
          "desc": "10th-level Rune Knight feature\nThe magic of your runes permanently alters you. When you gain this feature, roll 3d4. You grow a number of inches in height equal to the roll.\nMoreover, the extra damage you deal with your Giant's Might feature increases to 1d8."
        },
        {
          "level": 15,
          "name": "Additional Rune Known",
          "desc": "15th-level Rune Knight feature\nYou learn an additional Rune."
        },
        {
          "level": 15,
          "name": "Master of Runes",
          "desc": "15th-level Rune Knight feature\nYou can invoke each rune you know from your Rune Carver feature twice, rather than once, and you regain all expended uses when you finish a short or long rest."
        },
        {
          "level": 18,
          "name": "Runic Juggernaut",
          "desc": "18th-level Rune Knight feature\nYou learn how to amplify your rune-powered transformation. As a result, the extra damage you deal with the Giant's Might feature increases to 1d10. Moreover, when you use that feature, your size can increase to Huge, and while you are that size, your reach increases by 5 feet."
        }
      ]
    },
    "Samurai": {
      "features": [
        {
          "level": 3,
          "name": "Bonus Proficiency",
          "desc": "When you choose this archetype at 3rd level, you gain proficiency in one of the following skills of your choice: History, Insight, Performance, or Persuasion. Alternatively, you learn one language of your choice."
        },
        {
          "level": 3,
          "name": "Fighting Spirit",
          "desc": "Starting at 3rd level, your intensity in battle can shield you and help you strike true. As a bonus action on your turn, you can give yourself advantage on weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary hit points. The number of temporary hit points increases when you reach certain levels in this class, increasing to 10 at 10th level and 15 at 15th level.\nYou can use this feature three times, and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 3,
          "name": "Samurai",
          "desc": "The Samurai is a fighter who draws on an implacable fighting spirit to overcome enemies. A Samurai's resolve is nearly unbreakable, and the enemies in a Samurai's path have two choices: yield or die fighting."
        },
        {
          "level": 7,
          "name": "Elegant Courtier",
          "desc": "Starting at 7th level, your discipline and attention to detail allow you to excel in social situations. Whenever you make a Charisma (Persuasion) check, you gain a bonus to the check equal to your Wisdom modifier.\nYour self-control also causes you to gain proficiency in Wisdom saving throws. If you already have this proficiency, you instead gain proficiency in Intelligence or Charisma saving throws (your choice)."
        },
        {
          "level": 10,
          "name": "Tireless Spirit",
          "desc": "Starting at 10th level, when you roll initiative and have no uses of Fighting Spirit remaining, you regain one use."
        },
        {
          "level": 15,
          "name": "Rapid Strike",
          "desc": "Starting at 15th level, you learn to trade accuracy for swift strikes. If you take the Attack action on your turn and have advantage on an attack roll against one of the targets, you can forgo the advantage for that roll to make an additional weapon attack against that target, as part of the same action. You can do so no more than once per turn."
        },
        {
          "level": 18,
          "name": "Strength before Death",
          "desc": "Starting at 18th level, your fighting spirit can delay the grasp of death. If you take damage that reduces you to 0 hit points and doesn't kill you outright, you can use your reaction to delay falling unconscious, and you can immediately take an extra turn, interrupting the current turn. While you have 0 hit points during that extra turn, taking damage causes death saving throw failures as normal, and three death saving throw failures can still kill you. When the extra turn ends, you fall unconscious if you still have 0 hit points.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    }
  },
  "Monk": {
    "Warrior of the Elements": {
      "features": [
        {
          "level": 3,
          "name": "Elemental Attunement",
          "desc": "At the start of your turn, you can expend 1 Focus Point to imbue yourself with elemental energy. The energy lasts for 10 minutes or until you have the Incapacitated condition. You gain the following benefits while this feature is active.\nReach: When you make an Unarmed Strike, your reach is 10 feet greater than normal, as elemental energy extends from you.\nElemental Strikes: Whenever you hit with your Unarmed Strike, you can cause it to deal your choice of Acid, Cold, Fire, Lightning, or Thunder damage rather than its normal damage type. When you deal one of these types with it, you can also force the target to make a Strength saving throw. On a failed save, you can move the target up to 10 feet toward or away from you, as elemental energy swirls around it."
        },
        {
          "level": 3,
          "name": "Manipulate Elements",
          "desc": "You know the Elementalism spell. Wisdom is your spellcasting ability for it."
        },
        {
          "level": 3,
          "name": "Warrior of the Elements",
          "desc": "Wield Strikes and Bursts of Elemental Power\nWarriors of the Elements tap into the power of the Elemental Planes. Harnessing their supernatural focus, these Monks momentarily tame the energy of the Elemental Chaos to empower themselves in and out of battle."
        },
        {
          "level": 6,
          "name": "Elemental Burst",
          "desc": "As a Magic action, you can expend 2 Focus Points to cause elemental energy to burst in a 20-foot-radius Sphere centered on a point within 120 feet of yourself. Choose a damage type: Acid, Cold, Fire, Lightning, or Thunder.\nEach creature in the Sphere must make a Dexterity saving throw. On a failed save, a creature takes damage of the chosen type equal to three rolls of your Martial Arts die. On a successful save, a creature takes half as much damage."
        },
        {
          "level": 11,
          "name": "Stride of the Elements",
          "desc": "While your Elemental Attunement is active, you also have a Fly Speed and a Swim Speed equal to your Speed."
        },
        {
          "level": 17,
          "name": "Elemental Epitome",
          "desc": "While your Elemental Attunement is active, you also gain the following benefits.\nDamage Resistance: You gain Resistance to one of the following damage types of your choice: Acid, Cold, Fire, Lightning, or Thunder. At the start of each of your turns, you can change this choice.\nDestructive Stride: When you use your Step of the Wind, your Speed increases by 20 feet until the end of the turn. For that duration, any creature of your choice takes damage equal to one roll of your Martial Arts die when you enter a space within 5 feet of it. The damage type is your choice of Acid, Cold, Fire, Lightning, or Thunder. A creature can take this damage only once per turn.\nEmpowered Strikes: Once on each of your turns, you can deal extra damage to a target equal to one roll of your Martial Arts die when you hit it with an Unarmed Strike. The extra damage is the same type dealt by that strike."
        }
      ]
    },
    "Warrior of the Mystic Arts": {
      "features": [
        {
          "level": 3,
          "name": "Spellcasting",
          "desc": "You have learned to cast spells. See the Player's Handbook for the rules on spellcasting. The information below details how you use those rules as a Warrior of the Mystic Arts.\nCantrips: You know two cantrips of your choice from the Sorcerer spell list. Blade Ward and Thunderclap are recommended. Whenever you gain a Monk level, you can replace one of these cantrips with another cantrip of your choice from the Sorcerer spell list. When you reach Monk level 10, you learn another Sorcerer cantrip of your choice.\nSpell Slots: The Warrior of the Mystic Arts Spellcasting table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose three level 1 spells from the Sorcerer spell list. Jump, Magic Missile, and Shield are recommended. The number of spells on your list increases as you gain Monk levels, as shown in the Prepared Spells column of the Warrior of the Mystic Arts Spellcasting table. Whenever that number increases, choose additional spells from the Sorcerer spell list until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 7 Monk, your list of prepared spells can include five Sorcerer spells of levels 1 and 2 in any combination.\nChanging Your Prepared Spells: Whenever you gain a Monk level, you can replace one spell on your list with another Sorcerer spell for which you have spell slots.\nSpellcasting Ability: Wisdom is your spellcasting ability for your Sorcerer spells.\nSpellcasting Focus: You can use an Arcane Focus as a Spellcasting Focus for your Sorcerer spells.\nMulticlassing: If you multiclass and have the Spellcasting feature from more than one class, add one third of your Monk levels (round down) to determine your available spell slots."
        },
        {
          "level": 3,
          "name": "Warrior of the Mystic Arts",
          "desc": "Weave Martial and Mystic Arts\nWarriors of the Mystic Arts wield magic to supplement their martial skill. They harness mystical focus to enhance their magical and physical abilities."
        },
        {
          "level": 6,
          "name": "Mystic Fighting Style",
          "desc": "When you take the Attack action on your turn, you can replace one Unarmed Strike with a casting of one of your Sorcerer cantrips that has a casting time of an action."
        },
        {
          "level": 6,
          "name": "Mystic Focus",
          "desc": "You keep your magical power and martial focus in perfect balance, allowing you to convert spell slots into Focus Points, or convert Focus Points into spell slots.\nConverting Spell Slots to Focus Points: You can expend a spell slot to regain a number of expended Focus Points equal to the slot's level (no action required).\nRecovering Spell Slots: When you finish a Short Rest or use Uncanny Metabolism, you can transform unexpended Focus Points to recover one expended spell slot. The Recovering Spell Slots table shows the cost of recovering a spell slot of a given level, and it lists the minimum Monk level you must be to recover a slot. You can recover a spell slot no higher than level 4. Spell Slot Level | Focus Point Cost | Min. Monk Level 1 \u2014 2 \u2014 6 2 \u2014 3 \u2014 7 3 \u2014 5 \u2014 13 4 \u2014 6 \u2014 19"
        },
        {
          "level": 11,
          "name": "Focused Strike",
          "desc": "When you use your Stunning Strike, whether the target succeeds or fails on the saving throw, the target has Disadvantage on saving throws against your spells until the start of your next turn."
        },
        {
          "level": 17,
          "name": "Improved Mystic Fighting Style",
          "desc": "When you use Flurry of Blows, you can replace two of the Unarmed Strikes with a casting of one of your level 1 or 2 Sorcerer spells that has a casting time of an action, and you cast it as part of the same Bonus Action you use to activate Flurry of Blows."
        }
      ]
    },
    "Way of Mercy": {
      "features": [
        {
          "level": 3,
          "name": "Hand of Harm",
          "desc": "3rd-level Way of Mercy feature\nYou use your ki to inflict wounds. When you hit a creature with an unarmed strike, you can spend 1 ki point to deal extra necrotic damage equal to one roll of your Martial Arts die + your Wisdom modifier. You can use this feature only once per turn."
        },
        {
          "level": 3,
          "name": "Hand of Harm",
          "desc": "Once per turn when you hit a creature with an Unarmed Strike and deal damage, you can expend 1 Focus Point to deal extra Necrotic damage equal to one roll of your Martial Arts die plus your Wisdom modifier."
        },
        {
          "level": 3,
          "name": "Hand of Healing",
          "desc": "3rd-level Way of Mercy feature\nYour mystical touch can mend wounds. As an action, you can spend 1 ki point to touch a creature and restore a number of hit points equal to a roll of your Martial Arts die + your Wisdom modifier.\nWhen you use your Flurry of Blows, you can replace one of the unarmed strikes with a use of this feature without spending a ki point for the healing."
        },
        {
          "level": 3,
          "name": "Hand of Healing",
          "desc": "As a Magic action, you can expend 1 Focus Point to touch a creature and restore a number of Hit Points equal to a roll of your Martial Arts die plus your Wisdom modifier. When you use your Flurry of Blows, you can replace one of the Unarmed Strikes with a use of this feature without expending a Focus Point for the healing."
        },
        {
          "level": 3,
          "name": "Implements of Mercy",
          "desc": "3rd-level Way of Mercy feature\nYou gain proficiency in the Insight and Medicine skills, and you gain proficiency with the herbalism kit.\nYou also gain a special mask, which you often wear when using the features of this subclass. You determine its appearance, or generate it randomly by rolling on the Merciful Mask table.\nd6 | Mask Appearance\n1 \u2014 Raven\n2 \u2014 Blank and white\n3 \u2014 Crying visage\n4 \u2014 Laughing visage\n5 \u2014 Skull\n6 \u2014 Butterfly"
        },
        {
          "level": 3,
          "name": "Implements of Mercy",
          "desc": "You gain proficiency in the Insight and Medicine skills and proficiency with the Herbalism Kit."
        },
        {
          "level": 3,
          "name": "Warrior of Mercy",
          "desc": "Manipulate Forces of Life and Death\nWarriors of Mercy manipulate the life force of others. These Monks are wandering physicians, but they bring a swift end to their enemies. They often wear masks, presenting themselves as faceless bringers of life and death."
        },
        {
          "level": 3,
          "name": "Way of Mercy",
          "desc": "Monks of the Way of Mercy learn to manipulate the life force of others to bring aid to those in need. They are wandering physicians to the poor and hurt. However, to those beyond their help, they bring a swift end as an act of mercy.\nThose who follow the Way of Mercy might be members of a religious order, administering to the needy and making grim choices rooted in reality rather than idealism. Some might be gentle-voiced healers, beloved by their communities, while others might be masked bringers of macabre mercies.\nThe walkers of this way usually don robes with deep cowls, and they often conceal their faces with masks, presenting themselves as the faceless bringers of life and death."
        },
        {
          "level": 6,
          "name": "Physician's Touch",
          "desc": "6th-level Way of Mercy feature\nYou can administer even greater cures with a touch, and if you feel it's necessary, you can use your knowledge to cause harm.\nWhen you use Hand of Healing on a creature, you can also end one disease or one of the following conditions affecting the creature: blinded, deafened, paralyzed, poisoned, or stunned.\nWhen you use Hand of Harm on a creature, you can subject that creature to the poisoned condition until the end of your next turn."
        },
        {
          "level": 6,
          "name": "Physician's Touch",
          "desc": "Your Hand of Harm and Hand of Healing improve, as detailed below.\nHand of Harm: When you use Hand of Harm on a creature, you can also give that creature the Poisoned condition until the end of your next turn.\nHand of Healing: When you use Hand of Healing, you can also end one of the following conditions on the creature you heal: Blinded, Deafened, Paralyzed, Poisoned, or Stunned."
        },
        {
          "level": 11,
          "name": "Flurry of Healing and Harm",
          "desc": "11th-level Way of Mercy feature\nYou can now mete out a flurry of comfort and hurt. When you use Flurry of Blows, you can now replace each of the unarmed strikes with a use of your Hand of Healing, without spending ki points for the healing.\nIn addition, when you make an unarmed strike with Flurry of Blows, you can use Hand of Harm with that strike without spending the ki point for Hand of Harm. You can still use Hand of Harm only once per turn."
        },
        {
          "level": 11,
          "name": "Flurry of Healing and Harm",
          "desc": "When you use Flurry of Blows, you can replace each of the Unarmed Strikes with a use of Hand of Healing without expending Focus Points for the healing.\nIn addition, when you make an Unarmed Strike with Flurry of Blows and deal damage, you can use Hand of Harm with that strike without expending a Focus Point for Hand of Harm. You can still use Hand of Harm only once per turn.\nYou can use these benefits a total number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 17,
          "name": "Hand of Ultimate Mercy",
          "desc": "17th-level Way of Mercy feature\nYour mastery of life energy opens the door to the ultimate mercy. As an action, you can touch the corpse of a creature that died within the past 24 hours and expend 5 ki points. The creature then returns to life, regaining a number of hit points equal to 4d10 + your Wisdom modifier. If the creature died while subject to any of the following conditions, it revives with them removed: blinded, deafened, paralyzed, poisoned, and stunned.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 17,
          "name": "Hand of Ultimate Mercy",
          "desc": "Your mastery of life energy opens the door to the ultimate mercy. As a Magic action, you can touch the corpse of a creature that died within the past 24 hours and expend 5 Focus Points. The creature then returns to life with a number of Hit Points equal to 4d10 plus your Wisdom modifier. If the creature died with any of the following conditions, the creature revives with the conditions removed: Blinded, Deafened, Paralyzed, Poisoned, and Stunned.\nOnce you use this feature, you can't use it again until you finish a Long Rest."
        }
      ]
    },
    "Way of Shadow": {
      "features": [
        {
          "level": 3,
          "name": "Darkness",
          "desc": "You can expend 1 Focus Point to cast the Darkness spell without spell components. You can see within the spell's area when you cast it with this feature. While the spell persists, you can move its area of Darkness to a space within 60 feet of yourself at the start of each of your turns."
        },
        {
          "level": 3,
          "name": "Darkvision",
          "desc": "You gain Darkvision with a range of 60 feet. If you already have Darkvision, its range increases by 60 feet."
        },
        {
          "level": 3,
          "name": "Shadow Arts",
          "desc": "You can use your ki to duplicate the effects of certain spells. As an action, you can spend 2 ki points to cast Darkness, Darkvision, Pass Without Trace, or Silence, without providing material components. Additionally, you gain the Minor Illusion cantrip if you don't already know it."
        },
        {
          "level": 3,
          "name": "Shadow Arts",
          "desc": "You have learned to draw on the power of the Shadowfell, gaining the following benefits."
        },
        {
          "level": 3,
          "name": "Shadowy Figments",
          "desc": "You know the Minor Illusion spell. Wisdom is your spellcasting ability for it."
        },
        {
          "level": 3,
          "name": "Warrior of Shadow",
          "desc": "Harness Shadow Power for Stealth and Subterfuge\nWarriors of Shadow practice stealth and subterfuge, harnessing the power of the Shadowfell. They are at home in darkness, able to draw gloom around themselves to hide, leap from shadow to shadow, and take on a wraithlike form."
        },
        {
          "level": 3,
          "name": "Way of Shadow",
          "desc": "Monks of the Way of Shadow follow a tradition that values stealth and subterfuge. These monks might be called ninjas or shadow dancers, and they serve as spies and assassins. Sometimes the members of a ninja monastery are family members, forming a clan sworn to secrecy about their arts and missions. Other monasteries are more like thieves' guilds, hiring out their services to nobles, rich merchants, or anyone else who can pay their fees. Regardless of their methods, the heads of these monasteries expect the unquestioning obedience of their students."
        },
        {
          "level": 6,
          "name": "Shadow Step",
          "desc": "You gain the ability to step from one shadow into another. When you are in dim light or darkness, as a bonus action you can teleport up to 60 feet to an unoccupied space you can see that is also in dim light or darkness. You then have advantage on the first melee attack you make before the end of the turn."
        },
        {
          "level": 6,
          "name": "Shadow Step",
          "desc": "While entirely within Dim Light or Darkness, you can use a Bonus Action to teleport up to 60 feet to an unoccupied space you can see that is also in Dim Light or Darkness. You then have Advantage on the next melee attack you make before the end of the current turn."
        },
        {
          "level": 11,
          "name": "Cloak of Shadows",
          "desc": "By 11th level, you have learned to become one with the shadows. When you are in an area of dim light or darkness, you can use your action to become invisible. You remain invisible until you make an attack, cast a spell, or are in an area of bright light."
        },
        {
          "level": 11,
          "name": "Improved Shadow Step",
          "desc": "You can draw on your Shadowfell connection to empower your teleportation. When you use your Shadow Step, you can expend 1 Focus Point to remove the requirement that you must start and end in Dim Light or Darkness for that use of the feature. As part of this Bonus Action, you can make an Unarmed Strike immediately after you teleport."
        },
        {
          "level": 17,
          "name": "Cloak of Shadows",
          "desc": "As a Magic action while entirely within Dim Light or Darkness, you can expend 3 Focus Points to shroud yourself with shadows for 1 minute, until you have the Incapacitated condition, or until you end your turn in Bright Light. While shrouded by these shadows, you gain the following benefits.\nInvisibility: You have the Invisible condition.\nPartially Incorporeal: You can move through occupied spaces as if they were Difficult Terrain. If you end your turn in such a space, you are shunted to the last unoccupied space you were in.\nShadow Flurry: You can use your Flurry of Blows without expending any Focus Points."
        },
        {
          "level": 17,
          "name": "Opportunist",
          "desc": "At 17th level, you can exploit a creature's momentary distraction when it is hit by an attack. Whenever a creature within 5 feet of you is hit by an attack made by a creature other than you, you can use your reaction to make a melee attack against that creature."
        }
      ]
    },
    "Way of the Ascendant Dragon": {
      "features": [
        {
          "level": 3,
          "name": "Breath of the Dragon",
          "desc": "3rd-level Way of the Ascendant Dragon feature\nYou can channel destructive waves of energy, like those created by the dragons you emulate. When you take the Attack action on your turn, you can replace one of the attacks with an exhalation of draconic energy in either a 20-foot cone or a 30-foot line that is 5 feet wide (your choice). Choose a damage type: acid, cold, fire, lightning, or poison. Each creature in that area must make a Dexterity saving throw against your ki save DC, taking damage of the chosen type equal to two rolls of your Martial Arts die on a failed save, or half as much damage on a successful one.\nAt 11th level, the damage of this feature increases to three rolls of your Martial Arts die.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest. While you have no uses available, you can spend 2 ki points to use this feature again."
        },
        {
          "level": 3,
          "name": "Draconic Disciple",
          "desc": "3rd-level Way of the Ascendant Dragon feature\nYou can channel draconic power to magnify your presence and imbue your unarmed strikes with the essence of a dragon's breath. You gain the following benefits:\n\u2022 Draconic Presence: \n\u2022 Draconic Strike: \n\u2022 Tongue of Dragons:"
        },
        {
          "level": 3,
          "name": "Way of the Ascendant Dragon",
          "desc": "The dragon god Bahamut is known to travel the Material Plane in the guise of a young monk, and legend says that he founded the first monastery of the Way of the Ascendant Dragon in this guise. The fundamental teaching of this tradition holds that by emulating dragons, a monk becomes a more integrated part of the world and its magic. By altering their spirit to resonate with draconic might, monks who follow this tradition augment their prowess in battle, bolster their allies, and can even soar through the air on draconic wings. But all this power is in service of a greater goal: achieving a spiritual unity with the essence of the Material Plane.\nAs a follower of the Way of the Ascendant Dragon, you decide how you unlocked the power of dragons within yourself. The Ascendant Dragon Origin table offers a number of possibilities.\nd6 | Origin\n1 \u2014 You honed your abilities by aligning your spirit with a dragon's world-altering power.\n2 \u2014 A dragon personally took an active role in shaping your inner energy.\n3 \u2014 You studied at a monastery that traces its teachings back centuries or more to a single dragon's instruction, or one that is devoted to a dragon god.\n4 \u2014 You spent long stretches meditating in the region around an ancient dragon's lair, absorbing that lair's ambient magic.\n5 \u2014 You found a scroll written in Draconic that contained inspiring new techniques.\n6 \u2014 After a dream featuring a five-handed dragonborn, you awoke with the mystical breath of dragons."
        },
        {
          "level": 6,
          "name": "Wings Unfurled",
          "desc": "6th-level Way of the Ascendant Dragon feature\nWhen you use your Step of the Wind, you can unfurl spectral draconic wings from your back that vanish at the end of your turn. While the wings exist, you have a flying speed equal to your walking speed.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 11,
          "name": "Aspect of the Wyrm",
          "desc": "11th-level Way of the Ascendant Dragon feature\nThe power of your draconic spirit now radiates from you, warding your allies or inspiring fear in your enemies. As a bonus action, you can create an aura of draconic power that radiates 10 feet from you for 1 minute. For the duration, you gain one of the following effects of your choice:\n\u2022 Frightful Presence: \n\u2022 Resistance: \nOnce you create this aura, you can't create it again until you finish a long rest, unless you expend 3 ki points to create it again."
        },
        {
          "level": 17,
          "name": "Ascendant Aspect",
          "desc": "17th-level Way of the Ascendant Dragon feature\nYour draconic spirit reaches its peak. You gain the following benefits:\n\u2022 Augment Breath: \n\u2022 Blindsight: \n\u2022 Explosive Fury:"
        }
      ]
    },
    "Way of the Astral Self": {
      "features": [
        {
          "level": 3,
          "name": "Arms of the Astral Self",
          "desc": "3rd-level Way of the Astral Self feature\nYour mastery of your ki allows you to summon a portion of your astral self. As a bonus action, you can spend 1 ki point to summon the arms of your astral self. When you do so, each creature of your choice that you can see within 10 feet of you must succeed on a Dexterity saving throw or take force damage equal to two rolls of your Martial Arts die.\nFor 10 minutes, these spectral arms hover near your shoulders or surround your arms (your choice). You determine the arms' appearance, and they vanish early if you are incapacitated or die.\nWhile the spectral arms are present, you gain the following benefits:\n\u2022 You can use your Wisdom modifier in place of your Strength modifier when making Strength checks and Strength saving throws.\n\u2022 You can use the spectral arms to make unarmed strikes.\n\u2022 When you make an unarmed strike with the arms on your turn, your reach for it is 5 feet greater than normal.\n\u2022 The unarmed strikes you make with the arms can use your Wisdom modifier in place of your Strength or Dexterity modifier for the attack and damage rolls, and their damage type is force."
        },
        {
          "level": 3,
          "name": "Forms of Your Astral Self",
          "desc": "The astral self is a translucent embodiment of the monk's soul. As a result, an astral self can reflect aspects of a monk's background, ideals, flaws, and bonds, and an astral self doesn't necessarily look anything like the monk. For example, the astral self of a lanky human might be reminiscent of a minotaur-the strength of which the monk feels within. Similarly, an orc monk might manifest gossamer arms and a delicate visage, representing the gentle beauty of the orc's soul. Each astral self is unique, and some of the monks of this monastic tradition are known more for the appearance of their astral self than for their physical appearance.\nWhen choosing this path, consider the quirks that define your monk. Are you obsessed with something? Are you driven by justice or a selfish desire? Any of these motivations could manifest in the form of your astral self."
        },
        {
          "level": 3,
          "name": "Way of the Astral Self",
          "desc": "A monk who follows the Way of the Astral Self believes their body is an illusion. They see their ki as a representation of their true form, an astral self. This astral self has the capacity to be a force of order or disorder, with some monasteries training students to use their power to protect the weak and other instructing aspirants in how to manifest their true selves in service to the mighty."
        },
        {
          "level": 6,
          "name": "Visage of the Astral Self",
          "desc": "6th-level Way of the Astral Self feature\nYou can summon the visage of your astral self. As a bonus action, or as part of the bonus action you take to activate Arms of the Astral Self, you can spend 1 ki point to summon this visage for 10 minutes. It vanishes early if you are incapacitated or die.\nThe spectral visage covers your face like a helmet or mask. You determine its appearance.\nWhile the spectral visage is present, you gain the following benefits.\nAstral Sight: You can see normally in darkness, both magical and nonmagical, to a distance of 120 feet.\nWisdom of the Spirit: You have advantage on Wisdom (Insight) and Charisma (Intimidation) checks.\nWord of the Spirit: When you speak, you can direct your words to a creature of your choice that you can see within 60 feet of you, making it so only that creature can hear you. Alternatively, you can amplify your voice so that all creatures within 600 feet can hear you."
        },
        {
          "level": 11,
          "name": "Body of the Astral Self",
          "desc": "11th-level Way of the Astral Self feature\nWhen you have both your astral arms and visage summoned, you can cause the body of your astral self to appear (no action required). This spectral body covers your physical form like a suit of armor, connecting with the arms and visage. You determine its appearance.\nWhile the spectral body is present, you gain the following benefits.\nDeflect Energy: When you take acid, cold, fire, force, lightning, or thunder damage, you can use your reaction to deflect it. When you do so, the damage you take is reduced by 1d10 + your Wisdom modifier (minimum reduction of 1).\nEmpowered Arms: Once on each of your turns when you hit a target with the Arms of the Astral Self, you can deal extra damage to the target equal to your Martial Arts die."
        },
        {
          "level": 17,
          "name": "Awakened Astral Self",
          "desc": "17th-level Way of the Astral Self feature\nYour connection to your astral self is complete, allowing you to unleash its full potential. As a bonus action, you can spend 5 ki points to summon the arms, visage, and body of your astral self and awaken it for 10 minutes. This awakening ends early if you are incapacitated or die.\nWhile your astral self is awakened, you gain the following benefits.\nArmor of the Spirit: You gain a +2 bonus to Armor Class.\nAstral Barrage: Whenever you use the Extra Attack feature to attack twice, you can instead attack three times if all the attacks are made with your astral arms."
        }
      ]
    },
    "Way of the Drunken Master": {
      "features": [
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "When you choose this tradition at 3rd level, you gain proficiency in the Performance skill if you don't already have it. Your martial arts technique mixes combat training with the precision of a dancer and the antics of a jester. You also gain proficiency with brewer's supplies if you don't already have it."
        },
        {
          "level": 3,
          "name": "Drunken Technique",
          "desc": "At 3rd level, you learn how to twist and turn quickly as part of your Flurry of Blows. Whenever you use Flurry of Blows, you gain the benefit of the Disengage action, and your walking speed increases by 10 feet until the end of the current turn."
        },
        {
          "level": 3,
          "name": "Way of the Drunken Master",
          "desc": "The Way of the Drunken Master teaches its students to move with the jerky, unpredictable movements of a drunkard. A drunken master sways, tottering on unsteady feet, to present what seems like an incompetent combatant who proves frustrating to engage. The drunken master's erratic stumbles conceal a carefully executed dance of blocks, parries, advances, attacks, and retreats.\nA drunken master often enjoys playing the fool to bring gladness to the despondent or to demonstrate humility to the arrogant, but when battle is joined, the drunken master can be a maddening, masterful foe."
        },
        {
          "level": 6,
          "name": "Leap to Your Feet",
          "desc": "When you're prone, you can stand up by spending 5 feet of movement, rather than half your speed."
        },
        {
          "level": 6,
          "name": "Redirect Attack",
          "desc": "When a creature misses you with a melee attack roll, you can spend 1 ki point as a reaction to cause that attack to hit one creature of your choice, other than the attacker, that you can see within 5 feet of you."
        },
        {
          "level": 6,
          "name": "Tipsy Sway",
          "desc": "Starting at 6th level, you can move in sudden, swaying ways. You gain the following benefits."
        },
        {
          "level": 11,
          "name": "Drunkard's Luck",
          "desc": "Starting at 11th level, you always seem to get a lucky bounce at the right moment. When you make an ability check, an attack roll, or a saving throw and have disadvantage on the roll, you can spend 2 ki points to cancel the disadvantage for that roll."
        },
        {
          "level": 17,
          "name": "Intoxicated Frenzy",
          "desc": "At 17th level, you gain the ability to make an overwhelming number of attacks against a group of enemies. When you use your Flurry of Blows, you can make up to three additional attacks with it (up to a total of five Flurry of Blows attacks), provided that each Flurry of Blows attack targets a different creature this turn."
        }
      ]
    },
    "Way of the Four Elements": {
      "features": [
        {
          "level": 3,
          "name": "Disciple of the Elements",
          "desc": "You learn magical disciplines that harness the power of the four elements. A discipline requires you to spend ki points each time you use it.\nYou know the Elemental Attunement discipline and one other elemental discipline of your choice. You learn one additional elemental discipline of your choice at 6th, 11th, and 17th level.\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline.\nCasting Elemental Spells: Some elemental disciplines allow you to cast spells. See chapter 10 of the Player's Handbook for the general rules of spellcasting. To cast one of these spells, you use its casting time and other rules, but you don't need to provide material components for it. Once you reach 5th level in this class, you can spend additional ki points to increase the level of an elemental discipline spell that you cast, provided that the spell has an enhanced effect at a higher level, as Burning Hands does. The spell's level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast Burning Hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline's base cost of 2 ki points plus 1). The maximum number of ki points you can spend to cast a spell in this way (including its base ki point cost and any additional ki points you spend to increase its level) is determined by your monk level, as shown in the Spells and Ki Points table. At 5th level, you may spend up to 3 ki points; this increases to 4 ki points at 9th level, 5 at 13th level, and 6 at 17th level. Monk Levels | Maximum Ki Points for a Spell 5th-8th 9th-12th 13th-16th 17th-20th"
        },
        {
          "level": 3,
          "name": "Elemental Disciplines",
          "desc": "The elemental disciplines are presented in alphabetical order. If a discipline requires a level, you must be the level in this class to learn the discipline.\nBreath of Winter (17th Level Required): \nClench of the North Wind (6th Level Required): \nEternal Mountain Defense (17th Level Required): \nFlames of the Phoenix (11th Level Required): \nGong of the Summit (6th Level Required): \nMist Stance (11th Level Required): \nRide the Wind (11th Level Required): \nRiver of Hungry Flame (17th Level Required): \nWave of Rolling Earth (17th Level Required):"
        },
        {
          "level": 3,
          "name": "Way of the Four Elements",
          "desc": "You follow a monastic tradition that teaches you to harness the elements. When you focus your ki, you can align yourself with the forces of creation and bend the four elements to your will, using them as an extension of your body. Some members of this tradition dedicate themselves to a single element, but others weave the elements together.\nMany monks of this tradition tattoo their bodies with representations of their ki powers, commonly imagined as coiling dragons, but also as phoenixes, fish, plants, mountains, and cresting waves."
        },
        {
          "level": 6,
          "name": "Extra Elemental Discipline",
          "desc": "You learn one additional elemental discipline of your choice. You should know 2 elemental disciplines, as well as Elemental Attunement.\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline."
        },
        {
          "level": 11,
          "name": "Extra Elemental Discipline",
          "desc": "You learn one additional elemental discipline of your choice. You should know 3 elemental disciplines, as well as Elemental Attunement.\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline."
        },
        {
          "level": 17,
          "name": "Extra Elemental Discipline",
          "desc": "You learn one additional elemental discipline of your choice. You should know 4 elemental disciplines, as well as Elemental Attunement.\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline."
        }
      ]
    },
    "Way of the Kensei": {
      "features": [
        {
          "level": 3,
          "name": "Agile Parry",
          "desc": "If you make an unarmed strike as part of the Attack action on your turn and are holding a kensei weapon, you can use it to defend yourself if it is a melee weapon. You gain a +2 bonus to AC until the start of your next turn, while the weapon is in your hand and you aren't incapacitated."
        },
        {
          "level": 3,
          "name": "Kensei's Shot",
          "desc": "You can use a bonus action on your turn to make your ranged attacks with a kensei weapon more deadly. When you do so, any target you hit with a ranged attack using a kensei weapon takes an extra 1d4 damage of the weapon's type. You retain this benefit until the end of the current turn."
        },
        {
          "level": 3,
          "name": "Path of the Kensei",
          "desc": "When you choose this tradition at 3rd level, your special martial arts training leads you to master the use of certain weapons. This path also includes instruction in the deft strokes of calligraphy or painting. You gain the following benefits.\nKensei Weapons: Choose two types of weapons to be your kensei weapons: one melee weapon and one ranged weapon. Each of these weapons can be any simple or martial weapon that lacks the heavy and special properties. The longbow is also a valid choice. You gain proficiency with these weapons if you don't already have it. Weapons of the chosen types are monk weapons for you. Many of this tradition's features work only with your kensei weapons. When you reach 6th, 11th, and 17th level in this class, you can choose another type of weapon\u2014either melee or ranged\u2014to be a kensei weapon for you, following the criteria above.\nWay of the Brush: You gain proficiency with your choice of calligrapher's supplies or painter's supplies."
        },
        {
          "level": 3,
          "name": "Way of the Kensei",
          "desc": "Monks of the Way of the Kensei train relentlessly with their weapons, to the point where the weapon becomes an extension of the body. Founded on a mastery of sword fighting, the tradition has expanded to include many different weapons.\nA kensei sees a weapon in much the same way a calligrapher or painter regards a pen or brush. Whatever the weapon, the kensei views it as a tool used to express the beauty and precision of the martial arts. That such mastery makes a kensei a peerless warrior is but a side effect of intense devotion, practice, and study."
        },
        {
          "level": 6,
          "name": "One with the Blade",
          "desc": "At 6th level, you extend your ki into your kensei weapons, granting you the following benefits.\nMagic Kensei Weapons: Your attacks with your kensei weapons count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.\nDeft Strike: When you hit a target with a kensei weapon, you can spend 1 ki point to cause the weapon to deal extra damage to the target equal to your Martial Arts die. You can use this feature only once on each of your turns."
        },
        {
          "level": 11,
          "name": "Sharpen the Blade",
          "desc": "At 11th level, you gain the ability to augment your weapons further with your ki. As a bonus action, you can expend up to 3 ki points to grant one kensei weapon you touch a bonus to attack and damage rolls when you attack with it. The bonus equals the number of ki points you spent. This bonus lasts for 1 minute or until you use this feature again. This feature has no effect on a magic weapon that already has a bonus to attack and damage rolls."
        },
        {
          "level": 17,
          "name": "Unerring Accuracy",
          "desc": "At 17th level, your mastery of weapons grants you extraordinary accuracy. If you miss with an attack roll using a monk weapon on your turn, you can reroll it. You can use this feature only once on each of your turns."
        }
      ]
    },
    "Way of the Long Death": {
      "features": [
        {
          "level": 3,
          "name": "Touch of Death",
          "desc": "Starting when you choose this tradition at 3rd level, your study of death allows you to extract vitality from another creature as it nears its demise. When you reduce a creature within 5 feet of you to 0 hit points, you gain temporary hit points equal to your Wisdom modifier + your monk level (minimum of 1 temporary hit point)."
        },
        {
          "level": 3,
          "name": "Way of the Long Death",
          "desc": "Monks of the Way of the Long Death are obsessed with the meaning and mechanics of dying. They capture creatures and prepare elaborate experiments to capture, record, and understand the moments of their demise. They use this knowledge to guide their understanding of martial arts, yielding a deadly fighting style."
        },
        {
          "level": 6,
          "name": "Hour of Reaping",
          "desc": "At 6th level, you gain the ability to unsettle or terrify those around you as an action, for your soul has been touched by the shadow of death. When you take this action, each creature within 30 feet of you that can see you must succeed on a Wisdom saving throw or be frightened of you until the end of your next turn."
        },
        {
          "level": 11,
          "name": "Mastery of Death",
          "desc": "Beginning at 11th level, you use your familiarity with death to escape its grasp. When you are reduced to 0 hit points, you can expend 1 ki point (no action required) to have 1 hit point instead."
        },
        {
          "level": 17,
          "name": "Touch of the Long Death",
          "desc": "Starting at 17th level, your touch can channel the energy of death into a creature. As an action, you touch one creature within 5 feet of you, and you expend 1 to 10 ki points. The target must make a Constitution saving throw, and it takes 2d10 necrotic damage per ki point spent on a failed save, or half as much damage on a successful one."
        }
      ]
    },
    "Way of the Open Hand": {
      "features": [
        {
          "level": 3,
          "name": "Open Hand Technique",
          "desc": "You can manipulate your enemy's ki when you harness your own. Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of the following effects on that target.\n\u2022 It must succeed on a Dexterity saving throw or be knocked prone.\n\u2022 It must make a Strength saving throw. If it fails, you can push it up to 15 feet away from you.\n\u2022 It can't take reactions until the end of your next turn."
        },
        {
          "level": 3,
          "name": "Open Hand Technique",
          "desc": "Whenever you hit a creature with an attack granted by your Flurry of Blows, you can impose one of the following effects on that target.\nAddle: The target can't make Opportunity Attacks until the start of its next turn.\nPush: The target must succeed on a Strength saving throw or be pushed up to 15 feet away from you.\nTopple: The target must succeed on a Dexterity saving throw or have the Prone condition."
        },
        {
          "level": 3,
          "name": "Warrior of the Open Hand",
          "desc": "Master Unarmed Combat Techniques\nWarriors of the Open Hand are masters of unarmed combat. They learn techniques to push and trip their opponents and manipulate their own energy to protect themselves from harm."
        },
        {
          "level": 3,
          "name": "Way of the Open Hand",
          "desc": "Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed. They learn techniques to push and trip their opponents, manipulate ki to heal damage to their bodies, and practice advanced meditation that can protect them from harm."
        },
        {
          "level": 6,
          "name": "Wholeness of Body",
          "desc": "You gain the ability to heal yourself. As an action, you can regain hit points equal to three times your monk level. You must finish a long rest before you can use this feature again."
        },
        {
          "level": 6,
          "name": "Wholeness of Body",
          "desc": "You gain the ability to heal yourself. As a Bonus Action, you can roll your Martial Arts die. You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier (minimum of 1 Hit Point regained).\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 11,
          "name": "Fleet Step",
          "desc": "When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after that Bonus Action."
        },
        {
          "level": 11,
          "name": "Tranquility",
          "desc": "Beginning at 11th level, you can enter a special meditation that surrounds you with an aura of peace. At the end of a long rest, you gain the effect of a Sanctuary spell that lasts until the start of your next long rest (the spell can end early as normal). The saving throw DC for the spell equals 8 + your Wisdom modifier + your proficiency bonus."
        },
        {
          "level": 17,
          "name": "Quivering Palm",
          "desc": "You gain the ability to set up lethal vibrations in someone's body. When you hit a creature with an unarmed strike, you can spend 3 ki points to start these imperceptible vibrations, which last for a number of days equal to your monk level. The vibrations are harmless unless you use your action to end them. To do so, you and the target must be on the same plane of existence. When you use this action, the creature must make a Constitution saving throw. If it fails, it is reduced to 0 hit points. If it succeeds, it takes 10d10 necrotic damage.\nYou can have only one creature under the effect of this feature at a time. You can choose to end the vibrations harmlessly without using an action."
        },
        {
          "level": 17,
          "name": "Quivering Palm",
          "desc": "You gain the ability to set up lethal vibrations in someone's body. When you hit a creature with an Unarmed Strike, you can expend 4 Focus Points to start these imperceptible vibrations, which last for a number of days equal to your Monk level. The vibrations are harmless unless you take an action to end them. Alternatively, when you take the Attack action on your turn, you can forgo one of the attacks to end the vibrations. To end them, you and the target must be on the same plane of existence. When you end them, the target must make a Constitution saving throw, taking 10d12 Force damage on a failed save or half as much damage on a successful one.\nYou can have only one creature under the effect of this feature at a time. You can end the vibrations harmlessly (no action required)."
        }
      ]
    },
    "Way of the Sun Soul": {
      "features": [
        {
          "level": 3,
          "name": "Radiant Sun Bolt",
          "desc": "Starting when you choose this tradition at 3rd level, you can hurl searing bolts of magical radiance.\nYou gain a new attack option that you can use with the Attack action. The special attack is a ranged spell attack with a range of 30 feet. You are proficient with it, and you add your Dexterity modifier to its attack and damage rolls. Its damage is radiant, and its damage die is a d4. This die changes as you gain monk levels, as shown in the Martial Arts column of the Monk table.\nWhen you take the Attack action on your turn and use this special attack as part of it, you can spend 1 ki point to make the special attack twice as a bonus action. When you gain the Extra Attack feature, this special attack can be used for any of the attacks you make as part of the Attack action."
        },
        {
          "level": 3,
          "name": "Way of the Sun Soul",
          "desc": "Monks of the Way of the Sun Soul learn to channel their life energy into searing bolts of light. They teach that meditation can unlock the ability to unleash the indomitable light shed by the soul of every living creature."
        },
        {
          "level": 6,
          "name": "Searing Arc Strike",
          "desc": "At 6th level, you gain the ability to channel your ki into searing waves of energy. Immediately after you take the Attack action on your turn, you can spend 2 ki points to cast the Burning Hands spell as a bonus action.\nYou can spend additional ki points to cast Burning Hands as a higher-level spell. Each additional ki point you spend increases the spell's level by 1. The maximum number of ki points (2 plus any additional points) that you can spend on the spell equals half your monk level."
        },
        {
          "level": 11,
          "name": "Searing Sunburst",
          "desc": "At 11th level, you gain the ability to create an orb of light that erupts into a devastating explosion. As an action, you magically create an orb and hurl it at a point you choose within 150 feet, where it erupts into a sphere of radiant light for a brief but deadly instant.\nEach creature in that 20-foot-radius sphere must succeed on a Constitution saving throw or take 2d6 radiant damage. A creature doesn't need to make the save if the creature is behind Cover that is opaque.\nYou can increase the sphere's damage by spending ki points. Each point you spend, to a maximum of 3, increases the damage by 2d6."
        },
        {
          "level": 17,
          "name": "Sun Shield",
          "desc": "At 17th level, you become wreathed in a luminous, magical aura. You shed bright light in a 30-foot radius and dim light for an additional 30 feet. You can extinguish or restore the light as a bonus action.\nIf a creature hits you with a melee attack while this light shines, you can use your reaction to deal radiant damage to the creature. The radiant damage equals 5 + your Wisdom modifier."
        }
      ]
    }
  },
  "Paladin": {
    "Oath of Conquest": {
      "features": [
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "When you take this oath at 3rd level, you gain the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Conquering Presence",
          "desc": "You can use your Channel Divinity to exude a terrifying presence. As an action, you force each creature of your choice that you can see within 30 feet of you to make a Wisdom saving throw. On a failed save, a creature becomes frightened of you for 1 minute. The frightened creature can repeat this saving throw at the end of each of its turns, ending the effect on itself on a success."
        },
        {
          "level": 3,
          "name": "Guided Strike",
          "desc": "You can use your Channel Divinity to strike with supernatural accuracy. When you make an attack roll, you can use your Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether the attack hits or misses."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "You gain oath spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Armor Of Agathys, Command\n5th \u2014 Hold Person, Spiritual Weapon\n9th \u2014 Bestow Curse, Fear\n13th \u2014 Dominate Beast, Stoneskin\n17th \u2014 Cloudkill, Dominate Person"
        },
        {
          "level": 3,
          "name": "Oath of Conquest",
          "desc": "The Oath of Conquest calls to paladins who seek glory in battle and the subjugation of their enemies. It isn't enough for these paladins to establish order. They must crush the forces of chaos. Sometimes called knight tyrants or iron mongers, those who swear this oath gather into grim orders that serve gods or philosophies of war and well-ordered might.\nSome of these paladins go so far as to consort with the powers of the Nine Hells, valuing the rule of law over the balm of mercy. The archdevil Bel, warlord of Avernus, counts many of these paladins\u2014called hell knights\u2014as his most ardent supporters. Hell knights cover their armor with trophies taken from fallen enemies, a grim warning to any who dare oppose them and the decrees of their lords. These knights are often most fiercely resisted by other paladins of this oath, who believe that the hell knights have wandered too far into darkness."
        },
        {
          "level": 3,
          "name": "Tenets of Conquest",
          "desc": "A paladin who takes this oath has the tenets of conquest seared on the upper arm.\nDouse the Flame of Hope: It is not enough to merely defeat an enemy in battle. Your victory must be so overwhelming that your enemies' will to fight is shattered forever. A blade can end a life. Fear can end an empire.\nRule with an Iron Fist: Once you have conquered, tolerate no dissent. Your word is law. Those who obey it shall be favored. Those who defy it shall be punished as an example to all who might follow.\nStrength Above All: You shall rule until a stronger one arises. Then you must grow mightier and meet the challenge, or fall to your own ruin."
        },
        {
          "level": 7,
          "name": "Aura of Conquest",
          "desc": "Starting at 7th level, you constantly emanate a menacing aura while you're not incapacitated. The aura extends 10 feet from you in every direction, but not through Cover.\nIf a creature is frightened of you, its speed is reduced to 0 while in the aura, and that creature takes psychic damage equal to half your paladin level if it starts its turn there.\nAt 18th level, the range of this aura increases to 30 feet."
        },
        {
          "level": 15,
          "name": "Scornful Rebuke",
          "desc": "Starting at 15th level, those who dare to strike you are psychically punished for their audacity. Whenever a creature hits you with an attack, that creature takes psychic damage equal to your Charisma modifier (minimum of 1) if you're not incapacitated."
        },
        {
          "level": 20,
          "name": "Invincible Conqueror",
          "desc": "At 20th level, you gain the ability to harness extraordinary martial prowess. As an action, you can magically become an avatar of conquest, gaining the following benefits for 1 minute:\n\u2022 You have resistance to all damage.\n\u2022 When you take the Attack action on your turn, you can make one additional attack as part of that action.\n\u2022 Your melee weapon attacks score a critical hit on a roll of 19 or 20 on the d20.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    },
    "Oath of Devotion": {
      "features": [
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "When you take this oath at 3rd level, you gain the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "You gain oath spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Protection From Evil And Good, Sanctuary\n5th \u2014 Lesser Restoration, Zone Of Truth\n9th \u2014 Beacon Of Hope, Dispel Magic\n13th \u2014 Freedom Of Movement, Guardian Of Faith\n17th \u2014 Commune, Flame Strike"
        },
        {
          "level": 3,
          "name": "Oath of Devotion",
          "desc": "The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. Sometimes called cavaliers, white knights, or holy warriors, these paladins meet the ideal of the knight in shining armor, acting with honor in pursuit of justice and the greater good. They hold themselves to the highest standards of conduct, and some, for better or worse, hold the rest of the world to the same standards. Many who swear this oath are devoted to gods of law and good and use their gods' tenets as the measure of their devotion. They hold angels\u2014the perfect servants of good\u2014as their ideals, and incorporate images of angelic wings into their helmets or coats of arms."
        },
        {
          "level": 3,
          "name": "Oath of Devotion",
          "desc": "Uphold the Ideals of Justice and Order\nThe Oath of Devotion binds Paladins to the ideals of justice and order. These Paladins meet the archetype of the knight in shining armor. They hold themselves to the highest standards of conduct, and some\u2014for better or worse\u2014hold the rest of the world to the same standards.\nMany who swear this oath are devoted to gods of law and good and use their gods' tenets as the measure of personal devotion. Others hold angels as their ideals and incorporate images of angelic wings into their helmets or coats of arms.\nThese paladins share the following tenets:\n\u2022 Let your word be your promise.\n\u2022 Protect the weak and never fear to act.\n\u2022 Let your honorable deeds be an example."
        },
        {
          "level": 3,
          "name": "Oath of Devotion Spells",
          "desc": "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of Devotion Spells table, you thereafter always have the listed spells prepared.\nPaladin Level | Spells\n3rd \u2014 Protection From Evil And Good, Shield Of Faith\n5th \u2014 Aid, Zone Of Truth\n9th \u2014 Beacon Of Hope, Dispel Magic\n13th \u2014 Freedom Of Movement, Guardian Of Faith\n17th \u2014 Commune, Flame Strike"
        },
        {
          "level": 3,
          "name": "Sacred Weapon",
          "desc": "As an action, you can imbue one weapon that you are holding with positive energy, using your Channel Divinity. For 1 minute, you add your Charisma modifier to attack rolls made with that weapon (with a minimum bonus of +1). The weapon also emits bright light in a 20-foot radius and dim light 20 feet beyond that. If the weapon is not already magical, it becomes magical for the duration.\nYou can end this effect on your turn as part of any other action. If you are no longer holding or carrying this weapon, or if you fall unconscious, this effect ends."
        },
        {
          "level": 3,
          "name": "Sacred Weapon",
          "desc": "When you take the Attack action, you can expend one use of your Channel Divinity to imbue one Melee weapon that you are holding with positive energy. For 10 minutes or until you use this feature again, you add your Charisma modifier to attack rolls you make with that weapon (minimum bonus of +1), and each time you hit with it, you cause it to deal its normal damage type or Radiant damage.\nThe weapon also emits Bright Light in a 20-foot radius and Dim Light 20 feet beyond that.\nYou can end this effect early (no action required). This effect also ends if you aren't carrying the weapon."
        },
        {
          "level": 3,
          "name": "Tenets of Devotion",
          "desc": "Though the exact words and strictures of the Oath of Devotion vary, paladins of this oath share these tenets.\nHonesty: Don't lie or cheat. Let your word be your promise.\nCourage: Never fear to act, though caution is wise.\nCompassion: Aid others, protect the weak, and punish those who threaten them. Show mercy to your foes, but temper it with wisdom.\nHonor: Treat others with fairness, and let your honorable deeds be an example to them. Do as much good as possible while causing the least amount of harm.\nDuty: Be responsible for your actions and their consequences, protect those entrusted to your care, and obey those who have just authority over you."
        },
        {
          "level": 3,
          "name": "Turn the Unholy",
          "desc": "As an action, you present your holy symbol and speak a prayer censuring fiends and undead, using your Channel Divinity. Each fiend or undead that can see or hear you within 30 feet of you must make a Wisdom saving throw. If the creature fails its saving throw, it is turned for 1 minute or until it takes damage.\nA turned creature must spend its turns trying to move as far away from you as it can, and it can't willingly move to a space within 30 feet of you. It also can't take reactions. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, the creature can use the Dodge action."
        },
        {
          "level": 7,
          "name": "Aura of Devotion",
          "desc": "Starting at 7th level, you and friendly creatures within 10 feet of you can't be charmed while you are conscious.\nAt 18th level, the range of this aura increases to 30 feet."
        },
        {
          "level": 7,
          "name": "Aura of Devotion",
          "desc": "You and your allies have Immunity to the Charmed condition while in your Aura of Protection. If a Charmed ally enters the aura, that condition has no effect on that ally while there."
        },
        {
          "level": 15,
          "name": "Purity of Spirit",
          "desc": "Beginning at 15th level, you are always under the effects of a Protection From Evil And Good spell."
        },
        {
          "level": 15,
          "name": "Smite of Protection",
          "desc": "Your magical smite now radiates protective energy. Whenever you cast Divine Smite, you and your allies have Half Cover while in your Aura of Protection. The aura has this benefit until the start of your next turn."
        },
        {
          "level": 20,
          "name": "Holy Nimbus",
          "desc": "At 20th level, as an action, you can emanate an aura of sunlight. For 1 minute, bright light shines from you in a 30-foot radius, and dim light shines 30 feet beyond that.\nWhenever an enemy creature starts its turn in the bright light, the creature takes 10 radiant damage.\nIn addition, for the duration, you have advantage on saving throws against spells cast by fiends or undead.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 20,
          "name": "Holy Nimbus",
          "desc": "As a Bonus Action, you can imbue your Aura of Protection with holy power, granting the benefits below for 10 minutes or until you end them (no action required). Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required).\nHoly Ward: You have Advantage on any saving throw you are forced to make by a Fiend or an Undead.\nRadiant Damage: Whenever an enemy starts its turn in the aura, that creature takes Radiant damage equal to your Charisma modifier plus your Proficiency Bonus.\nSunlight: The aura is filled with Bright Light that is sunlight."
        }
      ]
    },
    "Oath of Glory": {
      "features": [
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "3rd-level Oath of Glory feature\nYou gain the following two Channel Divinity options. See the Sacred Oath class feature for how Channel Divinity works."
        },
        {
          "level": 3,
          "name": "Inspiring Smite",
          "desc": "Immediately after you deal damage to a creature with your Divine Smite feature, you can use your Channel Divinity as a bonus action and distribute temporary hit points to creatures of your choice within 30 feet of you, which can include you. The total number of temporary hit points equals 2d8 + your level in this class, divided among the chosen creatures however you like."
        },
        {
          "level": 3,
          "name": "Inspiring Smite",
          "desc": "Immediately after you cast Divine Smite, you can expend one use of your Channel Divinity and distribute Temporary Hit Points to creatures of your choice within 30 feet of yourself, which can include you. The total number of Temporary Hit Points equals 2d8 plus your Paladin level, divided among the chosen creatures however you like."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "3rd-level Oath of Glory feature\nYou gain oath spells at the paladin levels listed in the Oath of Glory Spells table. See the Sacred Oath class feature for how oath spells work.\nPaladin Level | Spells\n3rd \u2014 Guiding Bolt, Heroism\n5th \u2014 Enhance Ability, Magic Weapon\n9th \u2014 Haste, Protection From Energy\n13th \u2014 Compulsion, Freedom Of Movement\n17th \u2014 Commune, Flame Strike"
        },
        {
          "level": 3,
          "name": "Oath of Glory",
          "desc": "Paladins who take the Oath of Glory believe they and their companions are destined to achieve glory through deeds of heroism. They train diligently and encourage their companions so they're all ready when destiny calls."
        },
        {
          "level": 3,
          "name": "Oath of Glory",
          "desc": "Strive for the Heights of Heroism\nPaladins who take the Oath of Glory believe they and their companions are destined to achieve glory through deeds of heroism. They train diligently and encourage their companions, so they're all ready when destiny calls.\nThese paladins share the following tenets:\n\u2022 Endeavor to be known by your deeds.\n\u2022 Face hardships with courage.\n\u2022 Inspire others to strive for glory."
        },
        {
          "level": 3,
          "name": "Oath of Glory Spells",
          "desc": "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of Glory Spells table, you thereafter always have the listed spells prepared.\nPaladin Level | Spells\n3rd \u2014 Guiding Bolt, Heroism\n5th \u2014 Enhance Ability, Magic Weapon\n9th \u2014 Haste, Protection From Energy\n13th \u2014 Compulsion, Freedom Of Movement\n17th \u2014 Legend Lore, Yolande'S Regal Presence"
        },
        {
          "level": 3,
          "name": "Peerless Athlete",
          "desc": "As a bonus action, you can use your Channel Divinity to augment your athleticism. For the next 10 minutes, you have advantage on Strength (Athletics) and Dexterity (Acrobatics) checks; you can carry, push, drag, and lift twice as much weight as normal; and the distance of your long and high jumps increases by 10 feet (this extra distance costs movement as normal)."
        },
        {
          "level": 3,
          "name": "Peerless Athlete",
          "desc": "As a Bonus Action, you can expend one use of your Channel Divinity to augment your athleticism. For 1 hour, you have Advantage on Strength (Athletics) and Dexterity (Acrobatics) checks, and the distance of your Long and High Jumps increases by 10 feet (this extra distance costs movement as normal)."
        },
        {
          "level": 3,
          "name": "Tenets of Glory",
          "desc": "The tenets of the Oath of Glory drive a paladin to attempt heroics that might one day shine in legend.\nActions over Words: Strive to be known by glorious deeds, not words.\nChallenges Are but Tests: Face hardships with courage, and encourage your allies to face them with you.\nHone the Body: Like raw stone, your body must be worked so its potential can be realized.\nDiscipline the Soul: You must marshal the discipline to overcome failings within yourself that threaten to dim the glory of you and your friends."
        },
        {
          "level": 7,
          "name": "Aura of Alacrity",
          "desc": "7th-level Oath of Glory feature\nYou emanate an aura that fills you and your companions with supernatural speed, allowing you to race across a battlefield in formation. Your walking speed increases by 10 feet. In addition, if you aren't incapacitated, the walking speed of any ally who starts their turn within 5 feet of you increases by 10 feet until the end of that turn.\nWhen you reach 18th level in this class, the range of the aura increases to 10 feet."
        },
        {
          "level": 7,
          "name": "Aura of Alacrity",
          "desc": "Your Speed increases by 10 feet.\nIn addition, whenever an ally enters your Aura of Protection for the first time on a turn or starts their turn there, the ally's Speed increases by 10 feet until the end of their next turn."
        },
        {
          "level": 15,
          "name": "Glorious Defense",
          "desc": "15th-level Oath of Glory feature\nYou can turn defense into a sudden strike. When you or another creature you can see within 10 feet of you is hit by an attack roll, you can use your reaction to grant a bonus to the target's AC against that attack, potentially causing it to miss. The bonus equals your Charisma modifier (minimum of +1). If the attack misses, you can make one weapon attack against the attacker as part of this reaction, provided the attacker is within your weapon's range.\nYou can use this feature a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 15,
          "name": "Glorious Defense",
          "desc": "You can turn defense into a sudden strike. When you or another creature you can see within 10 feet of you is hit by an attack roll, you can take a Reaction to grant a bonus to the target's AC against that attack, potentially causing it to miss. The bonus equals your Charisma modifier (minimum of +1). If the attack misses, you can make one attack with a weapon against the attacker as part of this Reaction if the attacker is within your weapon's range.\nYou can use this feature a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 20,
          "name": "Living Legend",
          "desc": "20th-level Oath of Glory feature\nYou can empower yourself with the legends\u2014whether true or exaggerated\u2014of your great deeds. As a bonus action, you gain the following benefits for 1 minute:\n\u2022 You are blessed with an otherworldly presence, gaining advantage on all Charisma checks.\n\u2022 Once on each of your turns when you make a weapon attack and miss, you can cause that attack to hit instead.\n\u2022 If you fail a saving throw, you can use your reaction to reroll it. You must use this new roll.\nOnce you use this feature, you can't use it again until you finish a long rest, unless you expend a 5th-level spell slot to use it again."
        },
        {
          "level": 20,
          "name": "Living Legend",
          "desc": "You can empower yourself with the legends\u2014whether true or exaggerated\u2014of your great deeds. As a Bonus Action, you gain the benefits below for 10 minutes. Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required).\nCharismatic: You are blessed with an otherworldly presence and have Advantage on all Charisma checks.\nSaving Throw Reroll: If you fail a saving throw, you can take a Reaction to reroll it. You must use this new roll.\nUnerring Strike: Once on each of your turns when you make an attack roll with a weapon and miss, you can cause that attack to hit instead."
        }
      ]
    },
    "Oath of Redemption": {
      "features": [
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "When you take this oath at 3rd level, you gain the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Emissary of Peace",
          "desc": "You can use your Channel Divinity to augment your presence with divine power. As a bonus action, you grant yourself a +5 bonus to Charisma (Persuasion) checks for the next 10 minutes."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "You gain oath spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Sanctuary, Sleep\n5th \u2014 Calm Emotions, Hold Person\n9th \u2014 Counterspell, Hypnotic Pattern\n13th \u2014 Otiluke'S Resilient Sphere, Stoneskin\n17th \u2014 Hold Monster, Wall Of Force"
        },
        {
          "level": 3,
          "name": "Oath of Redemption",
          "desc": "The Oath of Redemption sets a paladin on a difficult path, one that requires a holy warrior to use violence only as a last resort. Paladins who dedicate themselves to this oath believe that any person can be redeemed and that the path of benevolence and justice is one that anyone can walk. These paladins face evil creatures in the hope of turning their foes to the light, and they slay their enemies only when such a deed will clearly save other lives. Paladins who follow this path are known as redeemers.\nWhile redeemers are idealists, they are no fools. Redeemers know that undead, demons, devils, and other supernatural threats can be inherently evil. Against such foes, paladins who swear this oath bring the full wrath of their weapons and spells to bear. Yet the redeemers still pray that, one day, even creatures of wickedness will invite their own redemption."
        },
        {
          "level": 3,
          "name": "Rebuke the Violent",
          "desc": "You can use your Channel Divinity to rebuke those who use violence. Immediately after an attacker within 30 feet of you deals damage with an attack against a creature other than you, you can use your reaction to force the attacker to make a Wisdom saving throw. On a failed save, the attacker takes radiant damage equal to the damage it just dealt. On a successful save, it takes half as much damage."
        },
        {
          "level": 3,
          "name": "Tenets of Redemption",
          "desc": "The tenets of the Oath of Redemption hold a paladin to a high standard of peace and justice.\nPeace: Violence is a weapon of last resort. Diplomacy and understanding are the paths to long-lasting peace.\nInnocence: All people begin life in an innocent state, and it is their environment or the influence of dark forces that drives them to evil. By setting the proper example, and working to heal the wounds of a deeply flawed world, you can set anyone on a righteous path.\nPatience: Change takes time. Those who have walked the path of the wicked must be given reminders to keep them honest and true. Once you have planted the seed of righteousness in a creature, you must work day after day to allow that seed to survive and flourish.\nWisdom: Your heart and mind must stay clear, for eventually you will be forced to admit defeat. While every creature can be redeemed, some are so far along the path of evil that you have no choice but to end their lives for the greater good. Any such action must be carefully weighed and the consequences fully understood, but once you have made the decision, follow through with it knowing your path is just."
        },
        {
          "level": 7,
          "name": "Aura of the Guardian",
          "desc": "Starting at 7th level, you can shield others from harm at the cost of your own health. When a creature within 10 feet of you takes damage, you can use your reaction to magically take that damage, instead of that creature taking it. This feature doesn't transfer any other effects that might accompany the damage, and this damage can't be reduced in any way.\nAt 18th level, the range of this aura increases to 30 feet."
        },
        {
          "level": 15,
          "name": "Protective Spirit",
          "desc": "Starting at 15th level, a holy presence mends your wounds in battle. You regain hit points equal to 1d6 + half your paladin level if you end your turn in combat with fewer than half of your hit points remaining and you aren't incapacitated."
        },
        {
          "level": 20,
          "name": "Emissary of Redemption",
          "desc": "At 20th level, you become an avatar of peace, which gives you two benefits:\n\u2022 You have resistance to all damage dealt by other creatures (their attacks, spells, and other effects).\n\u2022 Whenever a creature hits you with an attack, it takes radiant damage equal to half the damage you take from the attack.\nIf you attack a creature, cast a spell on it, or deal damage to it by any means but this feature, neither benefit works against that creature until you finish a long rest."
        }
      ]
    },
    "Oath of Vengeance": {
      "features": [
        {
          "level": 3,
          "name": "Abjure Enemy",
          "desc": "As an action, you present your holy symbol and speak a prayer of denunciation, using your Channel Divinity. Choose one creature within 60 feet of you that you can see. That creature must make a Wisdom saving throw, unless it is immune to being frightened. Fiends and undead have disadvantage on this saving throw.\nOn a failed save, the creature is frightened for 1 minute or until it takes any damage. While frightened, the creature's speed is 0, and it can't benefit from any bonus to its speed.\nOn a successful save, the creature's speed is halved for 1 minute or until the creature takes any damage."
        },
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "When you take this oath at 3rd level, you gain the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "You gain oath spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Bane, Hunter'S Mark\n5th \u2014 Hold Person, Misty Step\n9th \u2014 Haste, Protection From Energy\n13th \u2014 Banishment, Dimension Door\n17th \u2014 Hold Monster, Scrying"
        },
        {
          "level": 3,
          "name": "Oath of Vengeance",
          "desc": "The Oath of Vengeance is a solemn commitment to punish those who have committed a grievous sin. When evil forces slaughter helpless villagers, when an entire people turns against the will of the gods, when a thieves' guild grows too violent and powerful, when a dragon rampages through the countryside\u2014at times like these, paladins arise and swear an Oath of Vengeance to set right that which has gone wrong. To these paladins\u2014sometimes called avengers or dark knights\u2014their own purity is not as important as delivering justice."
        },
        {
          "level": 3,
          "name": "Oath of Vengeance",
          "desc": "Punish Evildoers at Any Cost\nThe Oath of Vengeance is a solemn commitment to punish those who have committed grievously evil acts. When evil armies slaughter helpless villagers, when a tyrant defies the will of the gods, when a thieves' guild grows too violent, when a dragon rampages through the countryside\u2014at times like these, paladins arise and swear an Oath of Vengeance to set right what has gone wrong.\nThese paladins share the following tenets:\n\u2022 Show the wicked no mercy.\n\u2022 Fight injustice and its causes.\n\u2022 Aid those harmed by injustice."
        },
        {
          "level": 3,
          "name": "Oath of Vengeance Spells",
          "desc": "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of Vengeance Spells table, you thereafter always have the listed spells prepared.\nPaladin Level | Spells\n3rd \u2014 Bane, Hunter'S Mark\n5th \u2014 Hold Person, Misty Step\n9th \u2014 Haste, Protection From Energy\n13th \u2014 Banishment, Dimension Door\n17th \u2014 Hold Monster, Scrying"
        },
        {
          "level": 3,
          "name": "Tenets of Vengeance",
          "desc": "The tenets of the Oath of Vengeance vary by paladin, but all the tenets revolve around punishing wrongdoers by any means necessary. Paladins who uphold these tenets are willing to sacrifice even their own righteousness to mete out justice upon those who do evil, so the paladins are often neutral or lawful neutral in alignment. The core principles of the tenets are brutally simple.\nFight the Greater Evil: Faced with a choice of fighting my sworn foes or combating a lesser evil, I choose the greater evil.\nNo Mercy for the Wicked: Ordinary foes might win my mercy, but my sworn enemies do not.\nBy Any Means Necessary: My qualms can't get in the way of exterminating my foes.\nRestitution: If my foes wreak ruin on the world, it is because I failed to stop them. I must help those harmed by their misdeeds."
        },
        {
          "level": 3,
          "name": "Vow of Enmity",
          "desc": "As a bonus action, you can utter a vow of enmity against a creature you can see within 10 feet of you, using your Channel Divinity. You gain advantage on attack rolls against the creature for 1 minute or until it drops to 0 hit points or falls unconscious."
        },
        {
          "level": 3,
          "name": "Vow of Enmity",
          "desc": "When you take the Attack action, you can expend one use of your Channel Divinity to utter a vow of enmity against a creature you can see within 30 feet of yourself. You have Advantage on attack rolls against the creature for 1 minute or until you use this feature again.\nIf the creature drops to 0 Hit Points before the vow ends, you can transfer the vow to a different creature within 30 feet of yourself (no action required)."
        },
        {
          "level": 7,
          "name": "Relentless Avenger",
          "desc": "By 7th level, your supernatural focus helps you close off a foe's retreat. When you hit a creature with an opportunity attack, you can move up to half your speed immediately after the attack and as part of the same reaction. This movement doesn't provoke opportunity attacks."
        },
        {
          "level": 7,
          "name": "Relentless Avenger",
          "desc": "Your supernatural focus helps you close off a foe's retreat. When you hit a creature with an Opportunity Attack, you can reduce the creature's Speed to 0 until the end of the current turn. You can then move up to half your Speed as part of the same Reaction. This movement doesn't provoke Opportunity Attacks."
        },
        {
          "level": 15,
          "name": "Soul of Vengeance",
          "desc": "Starting at 15th level, the authority with which you speak your Vow of Enmity gives you greater power over your foe. When a creature under the effect of your Vow of Enmity makes an attack, you can use your reaction to make a melee weapon attack against that creature if it is within range."
        },
        {
          "level": 15,
          "name": "Soul of Vengeance",
          "desc": "Immediately after a creature under the effect of your Vow of Enmity hits or misses with an attack roll, you can take a Reaction to make a melee attack against that creature if it's within range."
        },
        {
          "level": 20,
          "name": "Avenging Angel",
          "desc": "At 20th level, you can assume the form of an angelic avenger. Using your action, you undergo a transformation. For 1 hour, you gain the following benefits:\n\u2022 Wings sprout from your back and grant you a flying speed of 60 feet.\n\u2022 You emanate an aura of menace in a 30-foot radius. The first time any enemy creature enters the aura or starts its turn there during a battle, the creature must succeed on a Wisdom saving throw or become frightened of you for 1 minute or until it takes any damage. Attack rolls against the frightened creature have advantage.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 20,
          "name": "Avenging Angel",
          "desc": "As a Bonus Action, you gain the benefits below for 10 minutes or until you end them (no action required). Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required).\nFlight: You sprout spectral wings on your back, have a Fly Speed of 60 feet, and can hover.\nFrightful Aura: Whenever an enemy starts its turn in your Aura of Protection, that creature must succeed on a Wisdom saving throw or have the Frightened condition for 1 minute or until it takes any damage. Attack rolls against the Frightened creature have Advantage."
        }
      ]
    },
    "Oath of the Ancients": {
      "features": [
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "When you take this oath at 3rd level, you gain the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Nature's Wrath",
          "desc": "You can use your Channel Divinity to invoke primeval forces to ensnare a foe. As an action, you can cause spectral vines to spring up and reach for a creature within 10 feet of you that you can see. The creature must succeed on a Strength or Dexterity saving throw (its choice) or be restrained. While restrained by the vines, the creature repeats the saving throw at the end of each of its turns. On a success, it frees itself and the vines vanish."
        },
        {
          "level": 3,
          "name": "Nature's Wrath",
          "desc": "As a Magic action, you can expend one use of your Channel Divinity to conjure spectral vines around nearby creatures. Each creature of your choice that you can see within 15 feet of yourself must succeed on a Strength saving throw or have the Restrained condition for 1 minute. A Restrained creature repeats the save at the end of each of its turns, ending the effect on itself on a success."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "You gain oath spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Ensnaring Strike, Speak With Animals\n5th \u2014 Moonbeam, Misty Step\n9th \u2014 Plant Growth, Protection From Energy\n13th \u2014 Ice Storm, Stoneskin\n17th \u2014 Commune With Nature, Tree Stride"
        },
        {
          "level": 3,
          "name": "Oath of the Ancients",
          "desc": "The Oath of the Ancients is as old as the race of elves and the rituals of the druids. Sometimes called fey knights, green knights, or horned knights, paladins who swear this oath cast their lot with the side of the light in the cosmic struggle against darkness because they love the beautiful and life-giving things of the world, not necessarily because they believe in principles of honor, courage, and justice. They adorn their armor and clothing with images of growing things\u2014leaves, antlers, or flowers\u2014to reflect their commitment to preserving life and light in the world."
        },
        {
          "level": 3,
          "name": "Oath of the Ancients",
          "desc": "Preserve Life and Light in the World\nThe Oath of the Ancients is as old as the first elves. Paladins who swear this oath cherish the light; they love the beautiful and life-giving things of the world more than any principles of honor, courage, and justice. They often adorn their armor and clothing with images of growing things\u2014leaves, antlers, or flowers\u2014to reflect their commitment to preserving life and light.\nThese paladins share the following tenets:\n\u2022 Kindle the light of hope.\n\u2022 Shelter life.\n\u2022 Delight in art and laughter."
        },
        {
          "level": 3,
          "name": "Oath of the Ancients Spells",
          "desc": "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of the Ancients Spells table, you thereafter always have the listed spells prepared.\nPaladin Level | Spells\n3rd \u2014 Ensnaring Strike, Speak With Animals\n5th \u2014 Misty Step, Moonbeam\n9th \u2014 Plant Growth, Protection From Energy\n13th \u2014 Ice Storm, Stoneskin\n17th \u2014 Commune With Nature, Tree Stride"
        },
        {
          "level": 3,
          "name": "Tenets of the Ancients",
          "desc": "The tenets of the Oath of the Ancients have been preserved for uncounted centuries. This oath emphasizes the principles of good above any concerns of law or chaos. Its four central principles are simple.\nKindle the Light: Through your acts of mercy, kindness, and forgiveness, kindle the light of hope in the world, beating back despair.\nShelter the Light: Where there is good, beauty, love, and laughter in the world, stand against the wickedness that would swallow it. Where life flourishes, stand against the forces that would render it barren.\nPreserve Your Own Light: Delight in song and laughter, in beauty and art. If you allow the light to die in your own heart, you can't preserve it in the world.\nBe the Light: Be a glorious beacon for all who live in despair. Let the light of your joy and courage shine forth in all your deeds."
        },
        {
          "level": 3,
          "name": "Turn the Faithless",
          "desc": "You can use your Channel Divinity to utter ancient words that are painful for fey and fiends to hear. As an action, you present your holy symbol, and each fey or fiend within 30 feet of you that can hear you must make a Wisdom saving throw. On a failed save, the creature is turned for 1 minute or until it takes damage.\nA turned creature must spend its turns trying to move as far away from you as it can, and it can't willingly move to a space within 30 feet of you. It also can't take reactions. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, the creature can use the Dodge action.\nIf the creature's true form is concealed by an illusion, shapeshifting, or other effect, that form is revealed while it is turned."
        },
        {
          "level": 7,
          "name": "Aura of Warding",
          "desc": "Beginning at 7th level, ancient magic lies so heavily upon you that it forms an eldritch ward. You and friendly creatures within 10 feet of you have resistance to damage from spells.\nAt 18th level, the range of this aura increases to 30 feet."
        },
        {
          "level": 7,
          "name": "Aura of Warding",
          "desc": "Ancient magic lies so heavily upon you that it forms an eldritch ward, blunting energy from beyond the Material Plane; you and your allies have Resistance to Necrotic, Psychic, and Radiant damage while in your Aura of Protection."
        },
        {
          "level": 15,
          "name": "Undying Sentinel",
          "desc": "Starting at 15th level, when you are reduced to 0 hit points and are not killed outright, you can choose to drop to 1 hit point instead. Once you use this ability, you can't use it again until you finish a long rest.\nAdditionally, you suffer none of the drawbacks of old age, and you can't be aged magically."
        },
        {
          "level": 15,
          "name": "Undying Sentinel",
          "desc": "When you are reduced to 0 Hit Points and not killed outright, you can drop to 1 Hit Point instead, and you regain a number of Hit Points equal to three times your Paladin level. Once you use this feature, you can't do so again until you finish a Long Rest.\nAdditionally, you can't be aged magically, and you cease visibly aging."
        },
        {
          "level": 20,
          "name": "Elder Champion",
          "desc": "At 20th level, you can assume the form of an ancient force of nature, taking on an appearance you choose. For example, your skin might turn green or take on a bark-like texture, your hair might become leafy or moss-like, or you might sprout antlers or a lion-like mane.\nUsing your action, you undergo a transformation. For 1 minute, you gain the following benefits:\n\u2022 At the start of each of your turns, you regain 10 hit points.\n\u2022 Whenever you cast a paladin spell that has a casting time of 1 action, you can cast it using your bonus action instead.\n\u2022 Enemy creatures within 10 feet of you have disadvantage on saving throws against your paladin spells and Channel Divinity options.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 20,
          "name": "Elder Champion",
          "desc": "As a Bonus Action, you can imbue your Aura of Protection with primal power, granting the benefits below for 1 minute or until you end them (no action required). Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required).\nDiminish Defiance: Enemies in the aura have Disadvantage on saving throws against your spells and Channel Divinity options.\nRegeneration: At the start of each of your turns, you regain 10 Hit Points.\nSwift Spells: Whenever you cast a spell that has a casting time of an action, you can cast it using a Bonus Action instead."
        }
      ]
    },
    "Oath of the Crown": {
      "features": [
        {
          "level": 3,
          "name": "Champion Challenge",
          "desc": "As a bonus action, you issue a challenge that compels other creatures to do battle with you. Each creature of your choice that you can see within 30 feet of you must make a Wisdom saving throw. On a failed save, a creature can't willingly move more than 30 feet away from you. This effect ends on the creature if you are incapacitated or die or if the creature is more than 30 feet away from you."
        },
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "When you take this oath at 3rd level, you gain the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "You gain oath spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Command, Compelled Duel\n5th \u2014 Warding Bond, Zone Of Truth\n9th \u2014 Aura Of Vitality, Spirit Guardians\n13th \u2014 Banishment, Guardian Of Faith\n17th \u2014 Circle Of Power, Geas"
        },
        {
          "level": 3,
          "name": "Oath of the Crown",
          "desc": "The Oath of the Crown is sworn to the ideals of civilization, be it the spirit of a nation, fealty to a sovereign, or service to a deity of law and rulership. The paladins who swear this oath dedicate themselves to serving society and, in particular, the laws that hold society together. These paladins are the watchful guardians on the walls, standing against the chaotic tides of barbarism that threaten to tear down all that civilization has built, and are commonly known as guardians, exemplars, or sentinels. Often, paladins who swear this oath are members of an order of knighthood in service to a nation or sovereign, and undergo their oath as part of their admission to the order's ranks."
        },
        {
          "level": 3,
          "name": "Tenets of the Crown",
          "desc": "The tenets of the Oath of the Crown are often set by the sovereign to which their oath is sworn, but generally emphasize the following tenets.\nLaw: The law is paramount. It is the mortar that holds the stones of civilization together, and it must be respected.\nLoyalty: Your word is your bond. Without loyalty, oaths and laws are meaningless.\nCourage: You must be willing to do what needs to be done for the sake of order, even in the face of overwhelming odds. If you don't act, then who will?\nResponsibility: You must deal with the consequences of your actions, and you are responsible for fulfilling your duties and obligations."
        },
        {
          "level": 3,
          "name": "Turn the Tide",
          "desc": "As a bonus action, you can bolster injured creatures with your Channel Divinity. Each creature of your choice that can hear you within 30 feet of you regains hit points equal to 1d6 + your Charisma modifier (minimum of 1) if it has no more than half of its hit points."
        },
        {
          "level": 7,
          "name": "Divine Allegiance",
          "desc": "Starting at 7th level, when a creature within 5 feet of you takes damage, you can use your reaction to magically substitute your own health for that of the target creature, causing that creature not to take the damage. Instead, you take the damage. This damage to you can't be reduced or prevented in any way."
        },
        {
          "level": 15,
          "name": "Unyielding Spirit",
          "desc": "Starting at 15th level, you have advantage on saving throws to avoid becoming paralyzed or stunned."
        },
        {
          "level": 20,
          "name": "Exalted Champion",
          "desc": "At 20th level, your presence on the field of battle is an inspiration to those dedicated to your cause. You can use your action to gain the following benefits for 1 hour:\n\u2022 You have resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons.\n\u2022 Your allies have advantage on death saving throws while within 30 feet of you.\n\u2022 You have advantage on Wisdom saving throws, as do your allies within 30 feet of you.\nThis effect ends early if you are incapacitated or die. Once you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    },
    "Oath of the Noble Genies": {
      "features": [
        {
          "level": 3,
          "name": "Dao's Crush",
          "desc": "Earth rises up around the target of your Divine Smite. The target has the Grappled condition (escape DC equal to your spell save DC). While Grappled, the target has the Restrained condition."
        },
        {
          "level": 3,
          "name": "Djinni's Escape",
          "desc": "You teleport to an unoccupied space you can see within 30 feet of yourself and take on a semi-incorporeal form, which lasts until the end of your next turn. While in this form, you have Resistance to Bludgeoning, Piercing, and Slashing damage, and you have Immunity to the Grappled, Prone, and Restrained conditions."
        },
        {
          "level": 3,
          "name": "Efreeti's Fury",
          "desc": "The target of your Divine Smite takes an extra 2d4 Fire damage, and fire jumps from the target to another creature you can see within 30 feet of yourself. The second creature also takes 2d4 Fire damage."
        },
        {
          "level": 3,
          "name": "Elemental Smite",
          "desc": "Immediately after you cast Divine Smite, you can expend one use of your Channel Divinity and invoke one of the following effects."
        },
        {
          "level": 3,
          "name": "Genie Spells",
          "desc": "When you reach a Paladin level specified in the Genie Spells table, you thereafter always have the listed spells prepared.\nPaladin Level | Spells\n3 \u2014 Chromatic Orb, Elementalism, Thunderous Smite\n5 \u2014 Mirror Image, Phantasmal Force\n9 \u2014 Fly, Gaseous Form\n13 \u2014 Conjure Minor Elementals, Summon Elemental\n17 \u2014 Banishing Smite, Contact Other Plane"
        },
        {
          "level": 3,
          "name": "Genie's Splendor",
          "desc": "When you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers. You can use a Shield and still gain this benefit.\nYou also gain proficiency in one of the following skills of your choice: Acrobatics, Intimidation, Performance, or Persuasion."
        },
        {
          "level": 3,
          "name": "Marid's Surge",
          "desc": "The target of your Divine Smite and each creature of your choice in a 10-foot Emanation originating from you make a Strength saving throw against your spell save DC. On a failed save, a creature is pushed 15 feet straight away from you and has the Prone condition."
        },
        {
          "level": 3,
          "name": "Oath of the Noble Genies",
          "desc": "Brandish the Elemental Splendor of Genies\nPaladins sworn to the Oath of the Noble Genies revere the forces of the Elemental Planes. Through taking this oath, Paladins draw power from the four different types of genies\u2014dao, masters of earth; djinn, masters of air; efreet, masters of fire; and marids, masters of water. In Faer\u00fbn, many Paladins who swear this oath hail from Calimshan, a land teeming with genies.\nPaladins who swear this oath often undertake quests that take them all over the Realms and across the multiverse\u2014including the Elemental Planes. These paladins share the following tenets:\n\u2022 Sow the seeds of creation amid the ashes of destruction.\n\u2022 Lead with splendor and grace.\n\u2022 Respect the elements, and fear their wrath."
        },
        {
          "level": 7,
          "name": "Aura of Elemental Shielding",
          "desc": "Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder. You and your allies have Resistance to that damage type while in your Aura of Protection.\nAt the start of each of your turns, you can change the damage type affected by this feature to one of the other listed options (no action required)."
        },
        {
          "level": 15,
          "name": "Elemental Rebuke",
          "desc": "When you are hit by an attack roll, you can take a Reaction to halve the attack's damage against yourself (round down) and force the attacker to make a Dexterity saving throw against your spell save DC. On a failed save, the attacker takes damage equal to 2d10 plus your Charisma modifier of one of the following types (your choice): Acid, Cold, Fire, Lightning, or Thunder. On a successful save, the attacker takes half as much damage.\nYou can use this feature a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 20,
          "name": "Noble Scion",
          "desc": "As a Bonus Action, you gain the benefits below for 10 minutes or until you end them (no action required). Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required).\nFlight: You have a Fly Speed of 60 feet and can hover.\nMinor Wish: When you or an ally in your Aura of Protection fails a D20 Test, you can take a Reaction to make the D20 Test succeed instead."
        }
      ]
    },
    "Oath of the Watchers": {
      "features": [
        {
          "level": 3,
          "name": "Abjure the Extraplanar",
          "desc": "You can use your Channel Divinity to castigate unworldly beings. As an action, you present your holy symbol and each aberration, celestial, elemental, fey, or fiend within 30 feet of you that can hear you must make a Wisdom saving throw. On a failed save, the creature is turned for 1 minute or until it takes damage.\nA turned creature must spend its turns trying to move as far away from you as it can, and it can't willingly end its move in a space within 30 feet of you. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, the creature can take the Dodge action."
        },
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "3rd-level Oath of the Watchers feature\nYou gain the following Channel Divinity options. See the Sacred Oath class feature for how Channel Divinity works."
        },
        {
          "level": 3,
          "name": "Oath Spells",
          "desc": "3rd-level Oath of the Watchers feature\nYou gain oath spells at the paladin levels listed in the Oath of the Watchers table. See the Sacred Oath class feature for how oath spells work.\nPaladin Level | Spells\n3rd \u2014 Alarm, Detect Magic\n5th \u2014 Moonbeam, See Invisibility\n9th \u2014 Counterspell, Nondetection\n13th \u2014 Aura Of Purity, Banishment\n17th \u2014 Hold Monster, Scrying"
        },
        {
          "level": 3,
          "name": "Oath of the Watchers",
          "desc": "The Oath of the Watchers binds paladins to protect mortal realms from the predations of extraplanar creatures, many of which can lay waste to mortal soldiers. Thus, the Watchers hone their minds, spirits, and bodies to be the ultimate weapons against such threats.\nPaladins who follow the Watchers' oath are ever vigilant in spotting the influence of extraplanar forces, often establishing a network of spies and informants to gather information on suspected cults. To a Watcher, keeping a healthy suspicion and awareness about one's surroundings is as natural as wearing armor in battle."
        },
        {
          "level": 3,
          "name": "Tenets of the Watchers",
          "desc": "A paladin who assumes the Oath of the Watchers swears to safeguard mortal realms from otherworldly threats.\nVigilance: The threats you face are cunning, powerful, and subversive. Be ever alert for their corruption.\nLoyalty: Never accept gifts or favors from fiends or those who truck with them. Stay true to your order, your comrades, and your duty.\nDiscipline: You are the shield against the endless terrors that lie beyond the stars. Your blade must be forever sharp and your mind keen to survive what lies beyond."
        },
        {
          "level": 3,
          "name": "Watcher's Will",
          "desc": "You can use your Channel Divinity to invest your presence with the warding power of your faith. As an action, you can choose a number of creatures you can see within 30 feet of you, up to a number equal to your Charisma modifier (minimum of one creature). For 1 minute, you and the chosen creatures have advantage on Intelligence, Wisdom, and Charisma saving throws."
        },
        {
          "level": 7,
          "name": "Aura of the Sentinel",
          "desc": "7th-level Oath of the Watchers feature\nYou emit an aura of alertness while you aren't incapacitated. When you and any creatures of your choice within 10 feet of you roll initiative, you all gain a bonus to initiative equal to your proficiency bonus.\nAt 18th level, the range of this aura increases to 30 feet."
        },
        {
          "level": 15,
          "name": "Vigilant Rebuke",
          "desc": "15th-level Oath of the Watchers feature\nYou've learned how to chastise anyone who dares wield beguilements against you and your wards. Whenever you or a creature you can see within 30 feet of you succeeds on an Intelligence, a Wisdom, or a Charisma saving throw, you can use your reaction to deal 2d8 + your Charisma modifier force damage to the creature that forced the saving throw."
        },
        {
          "level": 20,
          "name": "Mortal Bulwark",
          "desc": "20th-level Oath of the Watchers feature\nYou manifest a spark of divine power in defense of the mortal realms. As a bonus action, you gain the following benefits for 1 minute:\n\u2022 You gain truesight with a range of 120 feet.\n\u2022 You have advantage on attack rolls against aberrations, celestials, elementals, fey, and fiends.\n\u2022 When you hit a creature with an attack roll and deal damage to it, you can also force it to make a Charisma saving throw against your spell save DC. On a failed save, the creature is magically banished to its native plane of existence if it's currently not there. On a successful save, the creature can't be banished by this feature for 24 hours.\nOnce you use this bonus action, you can't use it again until you finish a long rest, unless you expend a 5th-level spell slot to use it again."
        }
      ]
    },
    "Oathbreaker": {
      "features": [
        {
          "level": 3,
          "name": "Channel Divinity",
          "desc": "An Oathbreaker paladin of 3rd level or higher gains the following two Channel Divinity options."
        },
        {
          "level": 3,
          "name": "Control Undead",
          "desc": "As an action, the paladin targets one undead creature he or she can see within 30 feet of him or her. The target must make a Wisdom saving throw. On a failed save, the target must obey the paladin's commands for the next 24 hours, or until the paladin uses this Channel Divinity option again. An undead whose challenge rating is equal to or greater than the paladin's level is immune to this effect."
        },
        {
          "level": 3,
          "name": "Dreadful Aspect",
          "desc": "As an action, the paladin channels the darkest emotions and focuses them into a burst of magical menace. Each creature of the paladin's choice within 30 feet of the paladin must make a Wisdom saving throw if it can see the paladin. On a failed save, the target is frightened of the paladin for 1 minute. If a creature frightened by this effect ends its turn more than 30 feet away from the paladin, it can attempt another Wisdom saving throw to end the effect on it."
        },
        {
          "level": 3,
          "name": "Oathbreaker",
          "desc": "An Oathbreaker is a paladin who breaks his or her sacred oaths to pursue some dark ambition or serve an evil power. Whatever light burned in the paladin's heart has been extinguished. Only darkness remains.\nA paladin must be evil and at least 3rd level to become an Oathbreaker. The paladin replaces the features specific to his or her Sacred Oath with Oathbreaker features."
        },
        {
          "level": 3,
          "name": "Oathbreaker Spells",
          "desc": "You gain oathbreaker spells at the paladin levels listed.\nPaladin Level | Spells\n3rd \u2014 Hellish Rebuke, Inflict Wounds\n5th \u2014 Crown Of Madness, Darkness\n9th \u2014 Animate Dead, Bestow Curse\n13th \u2014 Blight, Confusion\n17th \u2014 Contagion, Dominate Person"
        },
        {
          "level": 7,
          "name": "Aura of Hate",
          "desc": "Starting at 7th level, the paladin, as well any fiends and undead within 10 feet of the paladin, gains a bonus to melee weapon damage rolls equal to the paladin's Charisma modifier (minimum of +1). A creature can benefit from this feature from only one paladin at a time.\nAt 18th level, the range of this aura increases to 30 feet."
        },
        {
          "level": 15,
          "name": "Supernatural Resistance",
          "desc": "At 15th level, the paladin gains resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons."
        },
        {
          "level": 20,
          "name": "Dread Lord",
          "desc": "At 20th level, the paladin can, as an action, surround himself or herself with an aura of gloom that lasts for 1 minute. The aura reduces any bright light in a 30-foot radius around the paladin to dim light. Whenever an enemy that is frightened by the paladin starts its turn in the aura, it takes 4d10 psychic damage. Additionally, the paladin and creatures he or she chooses in the aura are draped in deeper shadow. Creatures that rely on sight have disadvantage on attack rolls against creatures draped in this shadow.\nWhile the aura lasts, the paladin can use a bonus action on his or her turn to cause the shadows in the aura to attack one creature. The paladin makes a melee spell attack against the target. If the attack hits, the target takes necrotic damage equal to 3d10 + the paladin's Charisma modifier.\nAfter activating the aura, the paladin can't do so again until he or she finishes a long rest."
        }
      ]
    }
  },
  "Ranger": {
    "Beast Master": {
      "features": [
        {
          "level": 3,
          "name": "Beast Master",
          "desc": "The Beast Master archetype embodies a friendship between the civilized races and the beasts of the world. United in focus, beast and ranger work as one to fight the monstrous foes that threaten civilization and the wilderness alike. Emulating the Beast Master archetype means committing yourself to this ideal, working in partnership with an animal as its companion and friend."
        },
        {
          "level": 3,
          "name": "Beast Master",
          "desc": "Bond with a Primal Beast\nA Beast Master forms a mystical bond with a special animal, drawing on primal magic and a deep connection to the natural world."
        },
        {
          "level": 3,
          "name": "Primal Companion",
          "desc": "3rd-level Beast Master variant feature, which replaces the Ranger's Companion feature\nYou magically summon a primal beast, which draws strength from your bond with nature. The beast is friendly to you and your companions and obeys your commands. Choose its stat block\u2014Beast of the Land, Beast of the Sea, or Beast of the Sky\u2014which uses your proficiency bonus (PB) in several places. You also determine the kind of animal the beast is, choosing a kind appropriate for the stat block. Whatever kind you choose, the beast bears primal markings, indicating its mystical origin.\nIn combat, the beast acts during your turn. It can move and use its reaction on its own, but the only action it takes is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. You can also sacrifice one of your attacks when you take the Attack action to command the beast to take the Attack action. If you are incapacitated, the beast can take any action of its choice, not just Dodge.\nIf the beast has died within the last hour, you can use your action to touch it and expend a spell slot of 1st level or higher. The beast returns to life after 1 minute with all its hit points restored.\nWhen you finish a long rest, you can summon a different primal beast. The new beast appears in an unoccupied space within 5 feet of you, and you choose its stat block and appearance. If you already have a beast from this feature, it vanishes when the new beast appears. The beast also vanishes if you die."
        },
        {
          "level": 3,
          "name": "Primal Companion",
          "desc": "You magically summon a primal beast, which draws strength from your bond with nature. Choose its stat block: Beast of the Land, Beast of the Sea, or Beast of the Sky. You also determine the kind of animal it is, choosing a kind appropriate for the stat block. Whatever beast you choose, it bears primal markings indicating its supernatural origin.\nThe beast is Friendly to you and your allies and obeys your commands. It vanishes if you die.\nThe Beast in Combat: In combat, the beast acts during your turn. It can move and use its Reaction on its own, but the only action it takes is the Dodge action unless you take a Bonus Action to command it to take an action in its stat block or some other action. You can also sacrifice one of your attacks when you take the Attack action to command the beast to take the Beast's Strike action. If you have the Incapacitated condition, the beast acts on its own and isn't limited to the Dodge action.\nRestoring or Replacing the Beast: If the beast has died within the last hour, you can take a Magic action to touch it and expend a spell slot. The beast returns to life after 1 minute with all its Hit Points restored. Whenever you finish a Long Rest, you can summon a different primal beast, which appears in an unoccupied space within 5 feet of you. You choose its stat block and appearance. If you already have a beast from this feature, the old one vanishes when the new one appears."
        },
        {
          "level": 3,
          "name": "Ranger's Companion",
          "desc": "You gain a beast companion that accompanies you on your adventures and is trained to fight alongside you. Choose a beast that is no larger than Medium and that has a challenge rating of 1/4 or lower. Add your proficiency bonus to the beast's AC, attack rolls, and damage rolls, as well as to any saving throws and skills it is proficient in. Its hit point maximum equals its normal maximum or four times your ranger level, whichever is higher. Like any creature, the beast can spend Hit Dice during a short rest.\nThe beast obeys your commands as best as it can. It takes its turn on your initiative. On your turn, you can verbally command the beast where to move (no action required by you). You can use your action to verbally command it to take the Attack, Dash, Disengage, or Help action. If you don't issue a command, the beast takes the Dodge action. Once you have the Extra Attack feature, you can make one weapon attack yourself when you command the beast to take the Attack action.\nIf you are incapacitated or absent, your beast companion acts on its own, focusing on protecting you and itself. It never requires your command to use its reaction, such as when making an opportunity attack.\nWhile traveling through your favored terrain with only the beast, you can move stealthily at a normal pace.\nIf the beast dies, you can obtain a new companion by spending 8 hours magically bonding with a beast that isn't hostile to you and that meets the requirements."
        },
        {
          "level": 7,
          "name": "Exceptional Training",
          "desc": "Beginning at 7th level, on any of your turns when your beast companion doesn't attack, you can use a bonus action to command the beast to take the Dash, Disengage, or Help action on its turn. In addition, the beast's attacks now count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage."
        },
        {
          "level": 7,
          "name": "Exceptional Training",
          "desc": "When you take a Bonus Action to command your Primal Companion beast to take an action, you can also command it to take the Dash, Disengage, Dodge, or Help action using its Bonus Action.\nIn addition, whenever it hits with an attack roll and deals damage, it can deal your choice of Force damage or its normal damage type."
        },
        {
          "level": 11,
          "name": "Bestial Fury",
          "desc": "Starting at 11th level, when you command your beast companion to take the Attack action, the beast can make two attacks, or it can take the Multiattack action if it has that action."
        },
        {
          "level": 11,
          "name": "Bestial Fury",
          "desc": "When you command your Primal Companion beast to take the Beast's Strike action, the beast can use it twice.\nIn addition, the first time each turn it hits a creature under the effect of your Hunter'S Mark spell, the beast deals extra Force damage equal to the bonus damage of that spell."
        },
        {
          "level": 15,
          "name": "Share Spells",
          "desc": "Beginning at 15th level, when you cast a spell targeting yourself, you can also affect your beast companion with the spell if the beast is within 30 feet of you."
        },
        {
          "level": 15,
          "name": "Share Spells",
          "desc": "When you cast a spell targeting yourself, you can also affect your Primal Companion beast with the spell if the beast is within 30 feet of you."
        }
      ]
    },
    "Drakewarden": {
      "features": [
        {
          "level": 3,
          "name": "Draconic Gift",
          "desc": "3rd-level Drakewarden feature\nThe bond you share with your drake creates a connection to dragonkind, granting you understanding and empowering your presence. You gain the following benefits:\n\u2022 Thaumaturgy: \n\u2022 Tongue of Dragons:"
        },
        {
          "level": 3,
          "name": "Drake Companion",
          "desc": "3rd-level Drakewarden feature\nAs an action, you can magically summon the drake that is bound to you. It appears in an unoccupied space of your choice within 30 feet of you.\nThe drake is friendly to you and your companions, and it obeys your commands. See its game statistics in the accompanying Drake Companion stat block, which uses your proficiency bonus (PB) in several places. Whenever you summon the drake, choose a damage type listed in its Draconic Essence trait. You can determine the cosmetic characteristics of the drake, such as its color, its scale texture, or any visible effect of its Draconic Essence; your choice has no effect on its game statistics.\nIn combat, the drake shares your initiative count, but it takes its turn immediately after yours. It can move and use its reaction on its own, but the only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the drake can take any action of its choice, not just Dodge.\nThe drake remains until it is reduced to 0 hit points, until you use this feature to summon the drake again, or until you die. Anything the drake was wearing or carrying is left behind when the drake vanishes.\nOnce you summon the drake, you can't do so again until you finish a long rest, unless you expend a spell slot of 1st level or higher to summon it."
        },
        {
          "level": 3,
          "name": "Drakewarden",
          "desc": "Your connection to the natural world takes the form of a draconic spirit, which can manifest in physical form as a drake. As your powers grow, your drake grows as well, blossoming from a small four-legged companion to a majestic winged creature large and strong enough for you to ride. Along the way, you gain an increasing share of the awe-inspiring power of dragons.\nConsider the source of the draconic spirit you have bonded with. The Drakewarden Origin table offers examples.\nd6 | Origin\n1 \u2014 You studied a dragon's scale or claw, or a trinket from a dragon's hoard, creating your bond through that token's lingering draconic magic.\n2 \u2014 A secret order of rangers who collect and guard draconic lore taught you their ways.\n3 \u2014 A dragon gave you a geode or gemstone to care for. To your surprise, the drake hatched from that stone.\n4 \u2014 You ingested a few drops of dragon blood, forever infusing your nature magic with draconic power.\n5 \u2014 An ancient Draconic inscription on a standing stone empowered you when you read it aloud.\n6 \u2014 You had a vivid dream of a mysterious figure accompanied by seven yellow canaries, who warned you of impending doom. When you awoke, your drake was there, watching you."
        },
        {
          "level": 7,
          "name": "Bond of Fang and Scale",
          "desc": "7th-level Drakewarden feature\nThe bond you share with your drake intensifies, protecting you and stoking the drake's fury. When you summon your drake, it grows wings on its back and gains a flying speed equal to its walking speed.\nIn addition, while your drake is summoned, you and the drake gain the following benefits:\n\u2022 Drake Mount: The drake grows to Medium size. Reflecting your special bond, you can use the drake as a mount if your size is Medium or smaller. While you are riding your drake, it can't use the flying speed of this feature.\n\u2022 Magic Fang: The drake's Bite attack deals an extra 1d6 damage of the type chosen for the drake's Draconic Essence.\n\u2022 Resistance: You gain resistance to the damage type chosen for the drake's Draconic Essence."
        },
        {
          "level": 11,
          "name": "Drake's Breath",
          "desc": "11th-level Drakewarden feature\nAs an action, you can exhale a 30-foot cone of damaging breath or cause your drake to exhale it. Choose acid, cold, fire, lightning, or poison damage (your choice doesn't have to match your drake's Draconic Essence). Each creature in the cone must make a Dexterity saving throw against your spell save DC, taking 8d6 damage on a failed save, or half as much damage on a successful one.\nThis damage increases to 10d6 when you reach 15th level in this class.\nOnce you use this feature, you can't do so again until you finish a long rest, unless you expend a spell slot of 3rd level or higher to use it again."
        },
        {
          "level": 15,
          "name": "Perfected Bond",
          "desc": "15th-level Drakewarden feature\nYour bond to your drake reaches the pinnacle of its power. While your drake is summoned, you and the drake gain the following benefits:\n\u2022 Empowered Bite: The drake's Bite attack deals an extra 1d6 damage of the type chosen for its Draconic Essence (for a total of 2d6 extra damage).\n\u2022 Large Drake: The drake grows to Large size. When you ride your drake, it is no longer prohibited from using the flying speed of Bond of Fang and Scale.\n\u2022 Reflexive Resistance: When either you or the drake takes damage while you're within 30 feet of each other, you can use your reaction to give yourself or the drake resistance to that instance of damage. You can use this reaction a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        }
      ]
    },
    "Fey Wanderer": {
      "features": [
        {
          "level": 3,
          "name": "Dreadful Strikes",
          "desc": "3rd-level Fey Wanderer feature\nYou can augment your weapon strikes with mind-scarring magic, drawn from the gloomy hollows of the Feywild. When you hit a creature with a weapon, you can deal an extra 1d4 psychic damage to the target, which can take this extra damage only once per turn.\nThe extra damage increases to 1d6 when you reach 11th level in this class."
        },
        {
          "level": 3,
          "name": "Dreadful Strikes",
          "desc": "You can augment your weapon strikes with mind-scarring magic drawn from the murky hollows of the Feywild. When you hit a creature with a weapon, you can deal an extra 1d4 Psychic damage to the target, which can take this extra damage only once per turn. The extra damage increases to 1d6 when you reach Ranger level 11."
        },
        {
          "level": 3,
          "name": "Fey Wanderer",
          "desc": "A fey mystique surrounds you, thanks to the boon of an archfey, the shining fruit you ate from a talking tree, the magic spring you swam in, or some other auspicious event. However you acquired your fey magic, you are now a Fey Wanderer, a ranger who represents both the mortal and the fey realms. As you wander the multiverse, your joyful laughter brightens the hearts of the downtrodden, and your martial prowess strikes terror in your foes, for great is the mirth of the fey and dreadful is their fury."
        },
        {
          "level": 3,
          "name": "Fey Wanderer",
          "desc": "Wield Fey Mirth and Fury\nA fey mystique surrounds you, thanks to the boon of an archfey or a location in the Feywild that transformed you. However you gained fey magic, you are now a Fey Wanderer. Your joyful laughter brightens the hearts of the downtrodden, and your martial prowess strikes terror in your foes, for great is the mirth of the fey and dreadful is their fury."
        },
        {
          "level": 3,
          "name": "Fey Wanderer Magic",
          "desc": "3rd-level Fey Wanderer feature\nYou learn an additional spell when you reach certain levels in this class, as shown in the Fey Wanderer Spells table. Each spell counts as a ranger spell for you, but it doesn't count against the number of ranger spells you know.\nRanger Level | Spells\n3rd \u2014 Charm Person\n5th \u2014 Misty Step\n9th \u2014 Dispel Magic\n13th \u2014 Dimension Door\n17th \u2014 Mislead\nYou also possess a preternatural blessing from a fey ally or a place of fey power. Choose your blessing from the Feywild Gifts table or determine it randomly.\nd6 | Gift\n1 \u2014 Illusory butterflies flutter around you while you take a short or long rest.\n2 \u2014 Fresh, seasonal flowers sprout from your hair each dawn.\n3 \u2014 You faintly smell of cinnamon, lavender, nutmeg, or another comforting herb or spice.\n4 \u2014 Your shadow dances while no one is looking directly at it.\n5 \u2014 Horns or antlers sprout from your head.\n6 \u2014 Your skin and hair change color to match the season at each dawn."
        },
        {
          "level": 3,
          "name": "Fey Wanderer Spells",
          "desc": "When you reach a Ranger level specified in the Fey Wanderer Spells table, you thereafter always have the listed spells prepared.\nRanger Level | Spells\n3rd \u2014 Charm Person\n5th \u2014 Misty Step\n9th \u2014 Summon Fey\n13th \u2014 Dimension Door\n17th \u2014 Mislead\nYou also possess a fey blessing. Choose it from the Feywild Gifts table or determine it randomly.\n1d6 | Gift\n1 \u2014 Illusory butterflies flutter around you while you take a Short or Long Rest.\n2 \u2014 Flowers bloom from your hair each dawn.\n3 \u2014 You faintly smell of cinnamon, lavender, nutmeg, or another comforting herb or spice.\n4 \u2014 Your shadow dances while no one is looking directly at it.\n5 \u2014 Horns or antlers sprout from your head.\n6 \u2014 Your skin and hair change color each dawn."
        },
        {
          "level": 3,
          "name": "Otherworldly Glamour",
          "desc": "3rd-level Fey Wanderer feature\nYour fey qualities give you a supernatural charm. As a result, whenever you make a Charisma check, you gain a bonus to the check equal to your Wisdom modifier (minimum of +1).\nIn addition, you gain proficiency in one of the following skills of your choice: Deception, Performance, or Persuasion."
        },
        {
          "level": 3,
          "name": "Otherworldly Glamour",
          "desc": "Whenever you make a Charisma check, you gain a bonus to the check equal to your Wisdom modifier (minimum of +1).\nYou also gain proficiency in one of these skills of your choice: Deception, Performance, or Persuasion."
        },
        {
          "level": 7,
          "name": "Beguiling Twist",
          "desc": "7th-level Fey Wanderer feature\nThe magic of the Feywild guards your mind. You have advantage on saving throws against being charmed or frightened.\nIn addition, whenever you or a creature you can see within 120 feet of you succeeds on a saving throw against being charmed or frightened, you can use your reaction to force a different creature you can see within 120 feet of you to make a Wisdom saving throw against your spell save DC. If the save fails, the target is charmed or frightened by you (your choice) for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a successful save."
        },
        {
          "level": 7,
          "name": "Beguiling Twist",
          "desc": "The magic of the Feywild guards your mind. You have Advantage on saving throws to avoid or end the Charmed or Frightened condition.\nIn addition, whenever you or a creature you can see within 120 feet of you succeeds on a saving throw to avoid or end the Charmed or Frightened condition, you can take a Reaction to force a different creature you can see within 120 feet of yourself to make a Wisdom save against your spell save DC. On a failed save, the target is Charmed or Frightened (your choice) for 1 minute. The target repeats the save at the end of each of its turns, ending the effect on itself on a success."
        },
        {
          "level": 11,
          "name": "Fey Reinforcements",
          "desc": "11th-level Fey Wanderer feature\nThe royal courts of the Feywild have blessed you with the assistance of fey beings: you know Summon Fey. It doesn't count against the number of ranger spells you know, and you can cast it without a material component. You can also cast it once without a spell slot, and you regain the ability to do so when you finish a long rest.\nWhenever you start casting the spell, you can modify it so that it doesn't require concentration. If you do so, the spell's duration becomes 1 minute for that casting."
        },
        {
          "level": 11,
          "name": "Fey Reinforcements",
          "desc": "You can cast Summon Fey without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.\nWhenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting."
        },
        {
          "level": 15,
          "name": "Misty Wanderer",
          "desc": "15th-level Fey Wanderer feature\nYou can slip in and out of the Feywild to move in a blink of an eye: you can cast Misty Step without expending a spell slot. You can do so a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a long rest.\nIn addition, whenever you cast misty step, you can bring along one willing creature you can see within 5 feet of you. That creature teleports to an unoccupied space of your choice within 5 feet of your destination space."
        },
        {
          "level": 15,
          "name": "Misty Wanderer",
          "desc": "You can cast Misty Step without expending a spell slot. You can do so a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nIn addition, whenever you cast Misty Step, you can bring along one willing creature you can see within 5 feet of yourself. That creature teleports to an unoccupied space of your choice within 5 feet of your destination space."
        }
      ]
    },
    "Gloom Stalker": {
      "features": [
        {
          "level": 3,
          "name": "Dread Ambusher",
          "desc": "At 3rd level, you master the art of the ambush. You can give yourself a bonus to your initiative rolls equal to your Wisdom modifier.\nAt the start of your first turn of each combat, your walking speed increases by 10 feet, which lasts until the end of that turn. If you take the Attack action on that turn, you can make one additional weapon attack as part of that action. If that attack hits, the target takes an extra 1d8 damage of the weapon's damage type."
        },
        {
          "level": 3,
          "name": "Dread Ambusher",
          "desc": "You have mastered the art of creating fearsome ambushes, granting you the following benefits.\nAmbusher's Leap: At the start of your first turn of each combat, your Speed increases by 10 feet until the end of that turn.\nDreadful Strike: When you attack a creature and hit it with a weapon, you can deal an extra 2d6 Psychic damage. You can use this benefit only once per turn, you can use it a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nInitiative Bonus: When you roll Initiative, you can add your Wisdom modifier to the roll."
        },
        {
          "level": 3,
          "name": "Gloom Stalker",
          "desc": "Gloom Stalkers are at home in the darkest places: deep under the earth, in gloomy alleyways, in primeval forests, and wherever else the light dims. Most folk enter such places with trepidation, but a Gloom Stalker ventures boldly into the darkness, seeking to ambush threats before they can reach the broader world. Such rangers are often found in the Underdark, but they will go any place where evil lurks in the shadows."
        },
        {
          "level": 3,
          "name": "Gloom Stalker",
          "desc": "Draw on Shadow Magic to Fight Your Foes\nGloom Stalkers are at home in the darkest places, wielding magic drawn from the Shadowfell to combat enemies that lurk in darkness."
        },
        {
          "level": 3,
          "name": "Gloom Stalker Magic",
          "desc": "Starting at 3rd level, you learn an additional spell when you reach certain levels in this class, as shown in the Gloom Stalker Spells table. The spell counts as a ranger spell for you, but it doesn't count against the number of ranger spells you know.\nRanger Level | Spells\n3rd \u2014 Disguise Self\n5th \u2014 Rope Trick\n9th \u2014 Fear\n13th \u2014 Greater Invisibility\n17th \u2014 Seeming"
        },
        {
          "level": 3,
          "name": "Gloom Stalker Spells",
          "desc": "When you reach a Ranger level specified in the Gloom Stalker Spells table, you thereafter always have the listed spells prepared.\nRanger Level | Spells\n3rd \u2014 Disguise Self\n5th \u2014 Rope Trick\n9th \u2014 Fear\n13th \u2014 Greater Invisibility\n17th \u2014 Seeming"
        },
        {
          "level": 3,
          "name": "Umbral Sight",
          "desc": "At 3rd level, you gain darkvision out to a range of 60 feet. If you already have darkvision from your race, its range increases by 30 feet.\nYou are also adept at evading creatures that rely on darkvision. While in darkness, you are invisible to any creature that relies on darkvision to see you in that darkness."
        },
        {
          "level": 3,
          "name": "Umbral Sight",
          "desc": "You gain Darkvision with a range of 60 feet. If you already have Darkvision when you gain this feature, its range increases by 60 feet.\nYou are also adept at evading creatures that rely on Darkvision. While entirely in Darkness, you have the Invisible condition to any creature that relies on Darkvision to see you in that Darkness."
        },
        {
          "level": 7,
          "name": "Iron Mind",
          "desc": "By 7th level, you have honed your ability to resist the mind-altering powers of your prey. You gain proficiency in Wisdom saving throws. If you already have this proficiency, you instead gain proficiency in Intelligence or Charisma saving throws (your choice)."
        },
        {
          "level": 7,
          "name": "Iron Mind",
          "desc": "You have honed your ability to resist mind-altering powers. You gain proficiency in Wisdom saving throws. If you already have this proficiency, you instead gain proficiency in Intelligence or Charisma saving throws (your choice)."
        },
        {
          "level": 11,
          "name": "Stalker's Flurry",
          "desc": "At 11th level, you learn to attack with such unexpected speed that you can turn a miss into another strike. Once on each of your turns when you miss with a weapon attack, you can make another weapon attack as part of the same action."
        },
        {
          "level": 11,
          "name": "Stalker's Flurry",
          "desc": "The Psychic damage of your Dreadful Strike becomes 2d8. In addition, when you use the Dreadful Strike effect of your Dread Ambusher feature, you can cause one of the following additional effects.\nSudden Strike: You can make another attack with the same weapon against a different creature that is within 5 feet of the original target and that is within the weapon's range.\nMass Fear: The target and each creature within 10 feet of it must make a Wisdom saving throw against your spell save DC. On a failed save, a creature has the Frightened condition until the start of your next turn."
        },
        {
          "level": 15,
          "name": "Shadowy Dodge",
          "desc": "Starting at 15th level, you can dodge in unforeseen ways, with wisps of supernatural shadow around you. Whenever a creature makes an attack roll against you and doesn't have advantage on the roll, you can use your reaction to impose disadvantage on it. You must use this feature before you know the outcome of the attack roll."
        },
        {
          "level": 15,
          "name": "Shadowy Dodge",
          "desc": "When a creature makes an attack roll against you, you can take a Reaction to impose Disadvantage on that roll. Whether the attack hits or misses, you can then teleport up to 30 feet to an unoccupied space you can see."
        }
      ]
    },
    "Hollow Warden": {
      "features": [
        {
          "level": 3,
          "name": "Hollow Warden",
          "desc": "Draw on the Might of Ancient Wild Terrors\nLegends tell that the most ancient and bloodthirsty terrors lurk deep within the old places of the earth. Hollow Wardens venerate and draw power from such beings, transforming themselves into merciless and monstrous guardians that stalk jagged coastlines, steep mountain crags, and other dark and wild places."
        },
        {
          "level": 3,
          "name": "Hollow Warden Spells",
          "desc": "When you reach a Ranger level specified in the Hollow Warden Spells table, you thereafter always have the listed spell prepared.\nRanger Level | Spell\n3 \u2014 Wrathful Smite\n5 \u2014 Alter Self\n9 \u2014 Phantom Steed\n13 \u2014 Dominate Beast\n17 \u2014 Steel Wind Strike"
        },
        {
          "level": 3,
          "name": "Wrath of the Wild",
          "desc": "You draw power from the strange and ancient horrors of the land, causing you to sprout unnatural growths, such as bloody antlers or putrid fangs, or causing your shadow to lengthen or twist around you. As a Bonus Action, you can expend a use of Favored Enemy to transform into a ghastly form, gaining the following benefits for 1 minute or until you have the Incapacitated condition, die, or end the transformation (no action required).\nAncient Armor: You gain a +1 bonus to AC, as your body is wreathed in rotten bark and beastly bristles. This bonus increases to +2 when you reach Ranger level 11.\nProwling Retribution: Immediately after a creature you can see within 5 feet of yourself deals damage to you or one of your allies, you can make an Opportunity Attack against that creature.\nUnnerving Aura: When you transform and at the start of each of your subsequent turns, each creature of your choice in a 10-foot Emanation originating from you makes a Wisdom saving throw against your spell save DC. On a failed save, a creature has the Frightened condition until the start of your next turn."
        },
        {
          "level": 7,
          "name": "Hungering Might",
          "desc": "You gain a bonus to Constitution saving throws equal to your Wisdom modifier (minimum of +1).\nIn addition, once per turn when you hit a creature with an attack roll while you are transformed using Wrath of the Wild, you regain a number of Hit Points equal to 1d10 plus your Wisdom modifier, provided you are Bloodied when you hit."
        },
        {
          "level": 11,
          "name": "Rot and Violence",
          "desc": "Your dedication to wild eldritch beings alters you further. When transformed using Wrath of the Wild, you gain the following additional benefits.\nMenacing Aura: When a creature fails its saving throw against your Unnerving Aura, it also can't regain Hit Points or take Reactions until the start of your next turn.\nStrangling Roots: When you hit a creature with an attack roll using a weapon, you can activate the Sap or Slow mastery property in addition to a different mastery property you're using with that weapon."
        },
        {
          "level": 15,
          "name": "Ancient Might",
          "desc": "You become wholly suffused with the wild's ancient and terrible power, granting you the following benefits.\nOminous Strikes: When you hit a creature that has the Frightened condition with an attack roll, that attack deals extra damage equal to your Wisdom modifier.\nPersistent Wrath: If you're reduced to 0 Hit Points but not killed outright while transformed using Wrath of the Wild, you can surge with wild power. Your Hit Points instead change to a number equal to twice your Ranger level. Once you use this feature, you can't do so again until you finish a Long Rest. You can also expend a level 4+ spell slot (no action required) to restore your use of this feature.\nTimeless: You have Immunity to the Exhaustion condition."
        }
      ]
    },
    "Horizon Walker": {
      "features": [
        {
          "level": 3,
          "name": "Detect Portal",
          "desc": "At 3rd level, you gain the ability to magically sense the presence of a planar portal. As an action, you detect the distance and direction to the closest planar portal within 1 mile of you.\nOnce you use this feature, you can't use it again until you finish a short or long rest.\nSee the \"Planar Travel\" section in chapter 2 of the Dungeon Master's Guide for examples of planar portals."
        },
        {
          "level": 3,
          "name": "Horizon Walker",
          "desc": "Horizon Walkers guard the world against threats that originate from other planes or that seek to ravage the mortal realm with otherworldly magic. They seek out planar portals and keep watch over them, venturing to the Inner Planes and the Outer Planes as needed to pursue their foes. These rangers are also friends to any forces in the multiverse\u2014especially benevolent dragons, fey, and elementals\u2014that work to preserve life and the order of the planes."
        },
        {
          "level": 3,
          "name": "Horizon Walker Magic",
          "desc": "Starting at 3rd level, you learn an additional spell when you reach certain levels in this class, as shown in the Horizon Walker Spells table. The spell counts as a ranger spell for you, but it doesn't count against the number of ranger spells you know.\nRanger Level | Spells\n3rd \u2014 Protection From Evil And Good\n5th \u2014 Misty Step\n9th \u2014 Haste\n13th \u2014 Banishment\n17th \u2014 Teleportation Circle"
        },
        {
          "level": 3,
          "name": "Planar Warrior",
          "desc": "At 3rd level, you learn to draw on the energy of the multiverse to augment your attacks.\nAs a bonus action, choose one creature you can see within 30 feet of you. The next time you hit that creature on this turn with a weapon attack, all damage dealt by the attack becomes force damage, and the creature takes an extra 1d8 force damage from the attack. When you reach 11th level in this class, the extra damage increases to 2d8."
        },
        {
          "level": 7,
          "name": "Ethereal Step",
          "desc": "At 7th level, you learn to step through the Ethereal Plane. As a bonus action, you can cast the Etherealness spell with this feature, without expending a spell slot, but the spell ends at the end of the current turn.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 11,
          "name": "Distant Strike",
          "desc": "At 11th level, you gain the ability to pass between the planes in the blink of an eye. When you take the Attack action, you can teleport up to 10 feet before each attack to an unoccupied space you can see.\nIf you attack at least two different creatures with the action, you can make one additional attack with it against a third creature."
        },
        {
          "level": 15,
          "name": "Spectral Defense",
          "desc": "At 15th level, your ability to move between planes enables you to slip through the planar boundaries to lessen the harm done to you during battle. When you take damage from an attack, you can use your reaction to give yourself resistance to all of that attack's damage on this turn."
        }
      ]
    },
    "Hunter": {
      "features": [
        {
          "level": 3,
          "name": "Colossus Slayer",
          "desc": "Your tenacity can wear down the most potent foes. When you hit a creature with a weapon attack, the creature takes an extra 1d8 damage if it's below its hit point maximum. You can deal this extra damage only once per turn."
        },
        {
          "level": 3,
          "name": "Giant Killer",
          "desc": "When a Large or larger creature within 5 feet of you hits or misses you with an attack, you can use your reaction to attack that creature immediately after its attack, provided that you can see the creature."
        },
        {
          "level": 3,
          "name": "Horde Breaker",
          "desc": "Once on each of your turns when you make a weapon attack, you can make another attack with the same weapon against a different creature that is within 5 feet of the original target and within range of your weapon."
        },
        {
          "level": 3,
          "name": "Hunter",
          "desc": "Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness. As you walk the Hunter's path, you learn specialized techniques for fighting the threats you face, from rampaging ogres and hordes of orcs to towering giants and terrifying dragons."
        },
        {
          "level": 3,
          "name": "Hunter",
          "desc": "Protect Nature and People from Destruction\nYou stalk prey in the wilds and elsewhere, using your abilities as a Hunter to protect nature and people everywhere from forces that would destroy them."
        },
        {
          "level": 3,
          "name": "Hunter's Lore",
          "desc": "You can call on the forces of nature to reveal certain strengths and weaknesses of your prey. While a creature is marked by your Hunter's Mark, you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if the creature has any, you know what they are."
        },
        {
          "level": 3,
          "name": "Hunter's Prey",
          "desc": "At 3rd level, you gain one of the following features of your choice."
        },
        {
          "level": 3,
          "name": "Hunter's Prey",
          "desc": "You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.\nColossus Slayer: Your tenacity can wear down even the most resilient foes. When you hit a creature with a weapon, the weapon deals an extra 1d8 damage to the target if it's missing any of its Hit Points. You can deal this extra damage only once per turn.\nHorde Breaker: Once on each of your turns when you make an attack with a weapon, you can make another attack with the same weapon against a different creature that is within 5 feet of the original target, that is within the weapon's range, and that you haven't attacked this turn."
        },
        {
          "level": 7,
          "name": "Defensive Tactics",
          "desc": "At 7th level, you gain one of the following features of your choice."
        },
        {
          "level": 7,
          "name": "Defensive Tactics",
          "desc": "You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.\nEscape the Horde: Opportunity Attacks have Disadvantage against you.\nMultiattack Defense: When a creature hits you with an attack roll, that creature has Disadvantage on all other attack rolls against you this turn."
        },
        {
          "level": 7,
          "name": "Escape the Horde",
          "desc": "Opportunity attacks against you are made with disadvantage."
        },
        {
          "level": 7,
          "name": "Multiattack Defense",
          "desc": "When a creature hits you with an attack, you gain a +4 bonus to AC against all subsequent attacks made by that creature for the rest of the turn."
        },
        {
          "level": 7,
          "name": "Steel Will",
          "desc": "You have advantage on saving throws against being frightened."
        },
        {
          "level": 11,
          "name": "Multiattack",
          "desc": "At 11th level, you gain one of the following features of your choice."
        },
        {
          "level": 11,
          "name": "Superior Hunter's Prey",
          "desc": "Once per turn when you deal damage to a creature marked by your Hunter's Mark, you can also deal that spell's extra damage to a different creature that you can see within 30 feet of the first creature."
        },
        {
          "level": 11,
          "name": "Volley",
          "desc": "You can use your action to make a ranged attack against any number of creatures within 10 feet of a point you can see within your weapon's range. You must have ammunition for each target, as normal, and you make a separate attack roll for each target."
        },
        {
          "level": 11,
          "name": "Whirlwind Attack",
          "desc": "You can use your action to make a melee attack against any number of creatures within 5 feet of you, with a separate attack roll for each target."
        },
        {
          "level": 15,
          "name": "Evasion",
          "desc": "You can nimbly dodge out of the way of certain area effects, such as a red dragon's fiery breath or a Lightning Bolt spell. When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail."
        },
        {
          "level": 15,
          "name": "Stand Against the Tide",
          "desc": "When a hostile creature misses you with a melee attack, you can use your reaction to force that creature to repeat the same attack against another creature (other than itself) of your choice."
        },
        {
          "level": 15,
          "name": "Superior Hunter's Defense",
          "desc": "At 15th level, you gain one of the following features of your choice."
        },
        {
          "level": 15,
          "name": "Superior Hunter's Defense",
          "desc": "When you take damage, you can take a Reaction to give yourself Resistance to that damage and any other damage of the same type until the end of the current turn."
        },
        {
          "level": 15,
          "name": "Uncanny Dodge",
          "desc": "When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack's damage against you."
        }
      ]
    },
    "Monster Slayer": {
      "features": [
        {
          "level": 3,
          "name": "Hunter's Sense",
          "desc": "At 3rd level, you gain the ability to peer at a creature and magically discern how best to hurt it. As an action, choose one creature you can see within 60 feet of you. You immediately learn whether the creature has any damage immunities, resistances, or vulnerabilities and what they are. If the creature is hidden from divination magic, you sense that it has no damage immunities, resistances, or vulnerabilities.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 3,
          "name": "Monster Slayer",
          "desc": "You have dedicated yourself to hunting down creatures of the night and wielders of grim magic. A Monster Slayer seeks out vampires, dragons, evil fey, fiends, and other magical threats. Trained in supernatural techniques to overcome such monsters, slayers are experts at unearthing and defeating mighty, mystical foes."
        },
        {
          "level": 3,
          "name": "Monster Slayer Magic",
          "desc": "Starting at 3rd level, you learn an additional spell when you reach certain levels in this class, as shown in the Monster Slayer Spells table. The spell counts as a ranger spell for you, but it doesn't count against the number of ranger spells you know.\nRanger Level | Spells\n3rd \u2014 Protection From Evil And Good\n5th \u2014 Zone Of Truth\n9th \u2014 Magic Circle\n13th \u2014 Banishment\n17th \u2014 Hold Monster"
        },
        {
          "level": 3,
          "name": "Slayer's Prey",
          "desc": "Starting at 3rd level, you can focus your ire on one foe, increasing the harm you inflict on it. As a bonus action, you designate one creature you can see within 60 feet of you as the target of this feature. The first time each turn that you hit that target with a weapon attack, it takes an extra 1d6 damage from the weapon.\nThis benefit lasts until you finish a short or long rest. It ends early if you designate a different creature."
        },
        {
          "level": 7,
          "name": "Supernatural Defense",
          "desc": "At 7th level, you gain extra resilience against your prey's assaults on your mind and body. Whenever the target of your Slayer's Prey forces you to make a saving throw and whenever you make an ability check to escape that target's grapple, add 1d6 to your roll."
        },
        {
          "level": 11,
          "name": "Magic-User's Nemesis",
          "desc": "At 11th level, you gain the ability to thwart someone else's magic. When you see a creature casting a spell or teleporting within 60 feet of you, you can use your reaction to try to magically foil it. The creature must succeed on a Wisdom saving throw against your spell save DC, or its spell or teleport fails and is wasted.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 15,
          "name": "Slayer's Counter",
          "desc": "At 15th level, you gain the ability to counterattack when your prey tries to sabotage you. If the target of your Slayer's Prey forces you to make a saving throw, you can use your reaction to make one weapon attack against the quarry. You make this attack immediately before making the saving throw. If your attack hits, your save automatically succeeds, in addition to the attack's normal effects."
        }
      ]
    },
    "Swarmkeeper": {
      "features": [
        {
          "level": 3,
          "name": "Gathered Swarm",
          "desc": "3rd-level Swarmkeeper feature\nA swarm of intangible nature spirits has bonded itself to you and can assist you in battle. While you're alive, the swarm remains in your space, crawling on you or flying and skittering around you within your space. You determine its appearance, or you generate its appearance by rolling on the Swarm Appearance table.\nd4 | Appearance\n1 \u2014 Swarming insects\n2 \u2014 Miniature twig blights\n3 \u2014 Fluttering birds\n4 \u2014 Playful pixies\nOnce on each of your turns, you can cause the swarm to assist you in one of the following ways, immediately after you hit a creature with an attack:\n\u2022 The attack's target takes 1d6 piercing damage from the swarm.\n\u2022 The attack's target must succeed on a Strength saving throw against your spell save DC or be moved by the swarm up to 15 feet horizontally in a direction of your choice.\n\u2022 You are moved by the swarm 5 feet horizontally in a direction of your choice.\nIt's Your Swarm: A Swarmkeeper's swarm and spells are reflections of the character's bond with nature spirits. Take the opportunity to describe the swarm and the ranger's magic in play. For example, when your ranger casts gaseous form, they might appear to melt into the swarm, instead of a cloud of mist, or the Arcane Eye spell could create an extension of your swarm that spies for you. Such descriptions don't change the effects of spells, but they are an exciting opportunity to explore your character's narrative through their class abilities. For more guidance on customizing spells, see the \"Personalizing Spells\" section in chapter 3. Also, remember that the swarm's appearance is yours to customize, and don't feel confined to a single appearance. Perhaps the spirits' look changes with the ranger's mood or with the seasons. You decide!"
        },
        {
          "level": 3,
          "name": "Swarmkeeper",
          "desc": "Feeling a deep connection to the environment around them, some rangers reach out through their magical connection to the world and bond with a swarm of nature spirits. The swarm becomes a potent force in battle, as well as helpful company for the ranger. Some Swarmkeepers are outcasts or hermits, keeping to themselves and their attendant swarms rather than dealing with the discomfort of others. Other Swarmkeepers enjoy building vibrant communities that work for the mutual benefit of all those they consider part of their swarm."
        },
        {
          "level": 3,
          "name": "Swarmkeeper Magic",
          "desc": "3rd-level Swarmkeeper feature\nYou learn the Mage Hand cantrip if you don't already know it. When you cast it, the hand takes the form of your swarming nature spirits.\nYou also learn an additional spell of 1st level or higher when you reach certain levels in this class, as shown in the Swarmkeeper Spells table. Each spell counts as a ranger spell for you, but it doesn't count against the number of ranger spells you know.\nRanger Level | Spells\n3rd \u2014 Faerie Fire\n5th \u2014 Web\n9th \u2014 Gaseous Form\n13th \u2014 Arcane Eye\n17th \u2014 Insect Plague"
        },
        {
          "level": 7,
          "name": "Writhing Tide",
          "desc": "7th-level Swarmkeeper feature\nYou can condense part of your swarm into a focused mass that lifts you up. As a bonus action, you gain a flying speed of 10 feet and can hover. This effect lasts for 1 minute or until you are incapacitated.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 11,
          "name": "Mighty Swarm",
          "desc": "11th-level Swarmkeeper feature\nYour Gathered Swarm grows mightier in the following ways:\n\u2022 The damage of Gathered Swarm increases to 1d8.\n\u2022 If a creature fails its saving throw against being moved by Gathered Swarm, you can also cause the swarm to knock the creature prone.\n\u2022 When you are moved by Gathered Swarm, it gives you Cover until the start of your next turn."
        },
        {
          "level": 15,
          "name": "Swarming Dispersal",
          "desc": "15th-level Swarmkeeper feature\nYou can discorporate into your swarm, avoiding danger. When you take damage, you can use your reaction to give yourself resistance to that damage. You vanish into your swarm and then teleport to an unoccupied space that you can see within 30 feet of you, where you reappear with the swarm.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        }
      ]
    },
    "Winter Walker": {
      "features": [
        {
          "level": 3,
          "name": "Frigid Explorer",
          "desc": "You gain the following benefits.\nBiting Cold: Damage from your weapon attacks, Ranger spells, and Ranger features ignores Resistance to Cold damage.\nFrost Resistance: You have Resistance to Cold damage.\nPolar Strikes: When you hit a creature with an attack roll using a weapon, you can deal an extra 1d4 Cold damage to the target, which can take this extra damage only once per turn. When you reach Ranger level 11, this extra damage increases to 1d6."
        },
        {
          "level": 3,
          "name": "Hunter's Rime",
          "desc": "Ice rimes you and your prey, protecting you and slowing them. When you cast Hunter'S Mark, you gain Temporary Hit Points equal to 1d10 plus your Ranger level.\nAdditionally, while a creature is marked by your Hunter'S Mark, it can't take the Disengage action."
        },
        {
          "level": 3,
          "name": "Winter Walker",
          "desc": "Withstand the Horrors of Frigid Wastelands\nWinter Walkers hone their craft in the bleak and frozen wilds of places like Icewind Dale. These ruthless, rimed Rangers hunt monsters that haunt arctic wastelands, eventually becoming frigid terrors themselves. Winter Walkers are well versed in the phenomena of Icewind Dale, including the latent magic of fallen Netherese cities, endemic monsters like yetis and crag cats, and the rising threat of Underdark invaders. Due to their cold pragmatism, terrifying magic, and mastery of the region, Winter Walkers are regarded with equal parts respect and fear. Ten-Towns citizens say that Winter Walkers' frequent exposure to malignant entities gives them their fearsome powers. Many Reghed nomads, on the other hand, believe that nature spirits bestow on Winter Walkers a unique curse."
        },
        {
          "level": 3,
          "name": "Winter Walker Spells",
          "desc": "When you reach a Ranger level specified in the Winter Walker Spells table, you thereafter always have the listed spells prepared.\nRanger Level | Spells\n3 \u2014 Ice Knife\n5 \u2014 Hold Person\n9 \u2014 Remove Curse\n13 \u2014 Ice Storm\n17 \u2014 Cone Of Cold"
        },
        {
          "level": 7,
          "name": "Fortifying Soul",
          "desc": "Your experience surviving harrowing environments allows you to bolster your allies in addition to yourself. As a Magic action, choose a number of creatures you can see equal to your Wisdom modifier (minimum of one). Each chosen creature regains Hit Points equal to 1d10 plus your Ranger level and has Advantage on saving throws to avoid or end the Frightened condition for 1 hour.\nOnce you use this feature, you can't use it again until you finish a Long Rest."
        },
        {
          "level": 11,
          "name": "Chilling Retribution",
          "desc": "When a creature hits you with an attack roll, you can take a Reaction to force the creature to make a Wisdom saving throw against your spell save DC. On a failed save, the target has the Stunned condition until the end of your next turn. While the target is Stunned, its Speed is reduced to 0 feet.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 15,
          "name": "Frozen Haunt",
          "desc": "When you cast Hunter'S Mark, you can adopt a ghostly, snowy form. This form lasts until the spell ends, and while you are in this form, you gain the following benefits. Once you use this feature, you can't use it again until you finish a Long Rest unless you expend a level 4+ spell slot (no action required).\nFrozen Soul: You have Immunity to Cold damage. When you first adopt this form and at the start of each of your subsequent turns, each creature of your choice in a 15-foot Emanation originating from you takes 2d4 Cold damage.\nPartially Incorporeal: You have Immunity to the Grappled, Prone, and Restrained conditions. You can move through creatures and objects as if they were Difficult Terrain, but you take 1d10 Force damage if you end your turn inside a creature or an object. If the form ends while you are inside a creature or an object, you are shunted to the nearest unoccupied space."
        }
      ]
    }
  },
  "Rogue": {
    "Arcane Trickster": {
      "features": [
        {
          "level": 3,
          "name": "Arcane Trickster",
          "desc": "Some rogues enhance their fine-honed skills of stealth and agility with magic, learning tricks of enchantment and illusion. These rogues include pickpockets and burglars, but also pranksters, mischief-makers, and a significant number of adventurers."
        },
        {
          "level": 3,
          "name": "Arcane Trickster",
          "desc": "Enhance Stealth with Arcane Spells\nSome Rogues enhance their fine-honed skills of stealth and agility with spells, learning magical tricks to aid them in their trade. Some Arcane Tricksters use their talents as pickpockets and burglars, while others are pranksters."
        },
        {
          "level": 3,
          "name": "Mage Hand Legerdemain",
          "desc": "Starting at 3rd level, when you cast Mage Hand, you can make the spectral hand invisible, and you can perform the following additional tasks with it:\n\u2022 You can stow one object the hand is holding in a container worn or carried by another creature.\n\u2022 You can retrieve an object in a container worn or carried by another creature.\n\u2022 You can use thieves' tools to pick locks and disarm traps at range.\nYou can perform one of these tasks without being noticed by a creature if you succeed on a Dexterity (Sleight of Hand) check contested by the creature's Wisdom (Perception) check.\nIn addition, you can use the bonus action granted by your Cunning Action to control the hand."
        },
        {
          "level": 3,
          "name": "Mage Hand Legerdemain",
          "desc": "When you cast Mage Hand, you can cast it as a Bonus Action, and you can make the spectral hand Invisible. You can control the hand as a Bonus Action, and through it, you can make Dexterity (Sleight of Hand) checks."
        },
        {
          "level": 3,
          "name": "Spellcasting",
          "desc": "When you reach 3rd level, you gain the ability to cast spells. See chapter 10 for the general rules of spellcasting and chapter 11 for the wizard spell list.\nCantrips: You learn three cantrips: Mage Hand and two other cantrips of your choice from the wizard spell list. You learn another wizard cantrip of your choice at 10th level.\nSpell Slots: The Arcane Trickster Spellcasting table shows how many spell slots you have to cast your wizard spells of 1st level and higher. To cast one of these spells, you must expend a slot of the spell's level or higher. You regain all expended spell slots when you finish a long rest. For example, if you know the 1st-level spell Charm Person and have a 1st-level and a 2nd-level spell slot available, you can cast Charm Person using either slot.\nSpells Known of 1st-Level and Higher: You know three 1st-level wizard spells of your choice, two of which you must choose from the enchantment and illusion spells on the wizard spell list. The Spells Known column of the Arcane Trickster Spellcasting table shows when you learn more wizard spells of 1st level or higher. Each of these spells must be an enchantment or illusion spell of your choice, and must be of a level for which you have spell slots. For instance, when you reach 7th level in this class, you can learn one new spell of 1st or 2nd level. The spells you learn at 8th, 14th, and 20th level can come from any school of magic. Whenever you gain a level in this class, you can replace one of the wizard spells you know with another spell of your choice from the wizard spell list. The new spell must be of a level for which you have spell slots, and it must be an enchantment or illusion spell, unless you're replacing the spell you gained at 3rd, 8th, 14th, or 20th level from any school of magic.\nSpellcasting Ability: Intelligence is your spellcasting ability for your wizard spells, since you learn your spells through dedicated study and memorization. You use your Intelligence whenever a spell refers to your spellcasting ability. In addition, you use your Intelligence modifier when setting the saving throw DC for a wizard spell you cast and when making an attack roll with one. Spell:  Spell:"
        },
        {
          "level": 3,
          "name": "Spellcasting",
          "desc": "You have learned to cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules as an Arcane Trickster.\nCantrips: You know three cantrips: Mage Hand and two other cantrips of your choice from the Wizard spell list (see that class's section for its list). Mind Sliver and Minor Illusion are recommended. Whenever you gain a Rogue level, you can replace one of your cantrips, except Mage Hand, with another Wizard cantrip of your choice. When you reach Rogue level 10, you learn another Wizard cantrip of your choice.\nSpell Slots: The Arcane Trickster Spellcasting table shows how many spell slots you have to cast your level 1+ spells. You regain all expended spell slots when you finish a Long Rest.\nPrepared Spells of 1st+ Level: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose three level 1 Wizard spells. Charm Person, Disguise Self, and Fog Cloud are recommended. The number of spells on your list increases as you gain Rogue levels, as shown in the Prepared Spells column of the Arcane Trickster Spellcasting table. Whenever that number increases, choose additional Wizard spells until the number of spells on your list matches the number in the Arcane Trickster Spellcasting table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 7 Rogue, your list of prepared spells can include five Wizard spells of level 1 or 2 in any combination.\nChanging Your Prepared Spells: Whenever you gain a Rogue level, you can replace one spell on your list with another Wizard spell for which you have spell slots.\nSpellcasting Ability: Intelligence is your spellcasting ability for your Wizard spells.\nSpellcasting Focus: You can use an Arcane Focus as a Spellcasting Focus for your Wizard spells."
        },
        {
          "level": 9,
          "name": "Magical Ambush",
          "desc": "Starting at 9th level, if you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell this turn."
        },
        {
          "level": 9,
          "name": "Magical Ambush",
          "desc": "If you have the Invisible condition when you cast a spell on a creature, it has Disadvantage on any saving throw it makes against the spell on the same turn."
        },
        {
          "level": 13,
          "name": "Versatile Trickster",
          "desc": "At 13th level, you gain the ability to distract targets with your Mage Hand. As a bonus action on your turn, you can designate a creature within 5 feet of the spectral hand created by the spell. Doing so gives you advantage on attack rolls against that creature until the end of the turn."
        },
        {
          "level": 13,
          "name": "Versatile Trickster",
          "desc": "You gain the ability to distract targets with your Mage Hand. When you use the Trip option of your Cunning Strike on a creature, you can also use that option on another creature within 5 feet of the spectral hand."
        },
        {
          "level": 17,
          "name": "Spell Thief",
          "desc": "At 17th level, you gain the ability to magically steal the knowledge of how to cast a spell from another spellcaster.\nImmediately after a creature casts a spell that targets you or includes you in its area of effect, you can use your reaction to force the creature to make a saving throw with its spellcasting ability modifier. The DC equals your spell save DC. On a failed save, you negate the spell's effect against you, and you steal the knowledge of the spell if it is at least 1st level and of a level you can cast (it doesn't need to be a wizard spell). For the next 8 hours, you know the spell and can cast it using your spell slots. The creature can't cast that spell until the 8 hours have passed.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 17,
          "name": "Spell Thief",
          "desc": "You gain the ability to magically steal the knowledge of how to cast a spell from another spellcaster.\nImmediately after a creature casts a spell that targets you or includes you in its area of effect, you can take a Reaction to force the creature to make an Intelligence saving throw. The DC equals your spell save DC. On a failed save, you negate the spell's effect against you, and you steal the knowledge of the spell if it is at least level 1 and of a level you can cast (it doesn't need to be a Wizard spell). For the next 8 hours, you have the spell prepared. The creature can't cast it until the 8 hours have passed.\nOnce you steal a spell with this feature, you can't use this feature again until you finish a Long Rest."
        }
      ]
    },
    "Assassin": {
      "features": [
        {
          "level": 3,
          "name": "Assassin",
          "desc": "You focus your training on the grim art of death. Those who adhere to this archetype are diverse\u2014hired killers, spies, bounty hunters, and even specially anointed priests trained to exterminate the enemies of their deity. Stealth, poison, and disguise help you eliminate your foes with deadly efficiency.\nYour archetype grants you features at 3rd level and then again at 9th, 13th, and 17th level."
        },
        {
          "level": 3,
          "name": "Assassin",
          "desc": "Practice the Grim Art of Death\nAn Assassin's training focuses on using stealth, poison, and disguise to eliminate foes with deadly efficiency. While some Rogues who follow this path are hired killers, spies, or bounty hunters, the capabilities of this subclass are equally useful for adventurers facing a variety of monstrous enemies."
        },
        {
          "level": 3,
          "name": "Assassin's Tools",
          "desc": "You gain a Disguise Kit and a Poisoner's Kit, and you have proficiency with them."
        },
        {
          "level": 3,
          "name": "Assassinate",
          "desc": "Starting at 3rd level, you are at your deadliest when you get the drop on your enemies. You have advantage on attack rolls against any creature that hasn't taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit."
        },
        {
          "level": 3,
          "name": "Assassinate",
          "desc": "You're adept at ambushing a target, granting you the following benefits.\nInitiative: You have Advantage on Initiative rolls.\nSurprising Strikes: During the first round of each combat, you have Advantage on attack rolls against any creature that hasn't taken a turn. If your Sneak Attack hits any target during that round, the target takes extra damage of the weapon's type equal to your Rogue level."
        },
        {
          "level": 3,
          "name": "Bonus Proficiencies",
          "desc": "When you choose this archetype at 3rd level, you gain proficiency with the disguise kit and the poisoner's kit."
        },
        {
          "level": 9,
          "name": "Infiltration Expertise",
          "desc": "Starting at 9th level, you can unfailingly create false identities for yourself. You must spend seven days and 25 gp to establish the history, profession, and affiliations for an identity. You can't establish an identity that belongs to someone else. For example, you might acquire appropriate clothing, letters of introduction, and official-looking certification to establish yourself as a member of a trading house from a remote city so you can insinuate yourself into the company of other wealthy merchants.\nThereafter, if you adopt the new identity as a disguise, other creatures believe you to be that person until given an obvious reason not to."
        },
        {
          "level": 9,
          "name": "Infiltration Expertise",
          "desc": "You are expert at the following techniques that aid your infiltrations.\nMasterful Mimicry: You can unerringly mimic another person's speech, handwriting, or both if you have spent at least 1 hour studying them.\nRoving Aim: Your Speed isn't reduced to 0 by using Steady Aim."
        },
        {
          "level": 13,
          "name": "Envenom Weapons",
          "desc": "When you use the Poison option of your Cunning Strike, the target also takes 2d6 Poison damage whenever it fails the saving throw. This damage ignores Resistance to Poison damage."
        },
        {
          "level": 13,
          "name": "Impostor",
          "desc": "At 13th level, you gain the ability to unerringly mimic another person's speech, writing, and behavior. You must spend at least three hours studying these three components of the person's behavior, listening to speech, examining handwriting, and observing mannerism.\nYour ruse is indiscernible to the casual observer. If a wary creature suspects something is amiss, you have advantage on any Charisma (Deception) check you make to avoid detection."
        },
        {
          "level": 17,
          "name": "Death Strike",
          "desc": "Starting at 17th level, you become a master of instant death. When you attack and hit a creature that is surprised, it must make a Constitution saving throw (DC 8 + your Dexterity modifier + your proficiency bonus). On a failed save, double the damage of your attack against the creature."
        },
        {
          "level": 17,
          "name": "Death Strike",
          "desc": "When you hit with your Sneak Attack on the first round of a combat, the target must succeed on a Constitution saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus), or the attack's damage is doubled against the target."
        }
      ]
    },
    "Inquisitive": {
      "features": [
        {
          "level": 3,
          "name": "Ear for Deceit",
          "desc": "When you choose this archetype at 3rd level, you develop a talent for picking out lies. Whenever you make a Wisdom (Insight) check to determine whether a creature is lying, treat a roll of 7 or lower on the d20 as an 8."
        },
        {
          "level": 3,
          "name": "Eye for Detail",
          "desc": "Starting at 3rd level, you can use a bonus action to make a Wisdom (Perception) check to spot a hidden creature or object or to make an Intelligence (Investigation) check to uncover or decipher clues."
        },
        {
          "level": 3,
          "name": "Inquisitive",
          "desc": "As an archetypal Inquisitive, you excel at rooting out secrets and unraveling mysteries. You rely on your sharp eye for detail, but also on your finely honed ability to read the words and deeds of other creatures to determine their true intent. You excel at defeating creatures that hide among and prey upon ordinary folk, and your mastery of lore and your keen deductions make you well equipped to expose and end hidden evils."
        },
        {
          "level": 3,
          "name": "Insightful Fighting",
          "desc": "At 3rd level, you gain the ability to decipher an opponent's tactics and develop a counter to them. As a bonus action, you can make a Wisdom (Insight) check against a creature you can see that isn't incapacitated, contested by the target's Charisma (Deception) check. If you succeed, you can use your Sneak Attack against that target even if you don't have advantage on the attack roll, but not if you have disadvantage on it.\nThis benefit lasts for 1 minute or until you successfully use this feature against a different target."
        },
        {
          "level": 9,
          "name": "Steady Eye",
          "desc": "Starting at 9th level, you have advantage on any Wisdom (Perception) or Intelligence (Investigation) check if you move no more than half your speed on the same turn."
        },
        {
          "level": 13,
          "name": "Unerring Eye",
          "desc": "Beginning at 13th level, your senses are almost impossible to foil. As an action, you sense the presence of illusions, shapechangers not in their original form, and other magic designed to deceive the senses within 30 feet of you, provided you aren't blinded or deafened. You sense that an effect is attempting to trick you, but you gain no insight into what is hidden or into its true nature.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 17,
          "name": "Eye for Weakness",
          "desc": "At 17th level, you learn to exploit a creature's weaknesses by carefully studying its tactics and movement. While your Insightful Fighting feature applies to a creature, your Sneak Attack damage against that creature increases by 3d6."
        }
      ]
    },
    "Mastermind": {
      "features": [
        {
          "level": 3,
          "name": "Master of Intrigue",
          "desc": "When you choose this archetype at 3rd level, you gain proficiency with the disguise kit, the forgery kit, and one gaming set of your choice. You also learn two languages of your choice.\nAdditionally, you can unerringly mimic the speech patterns and accent of a creature that you hear speak for at least 1 minute, enabling you to pass yourself off as a native speaker of a particular land, provided that you know the language."
        },
        {
          "level": 3,
          "name": "Master of Tactics",
          "desc": "Starting at 3rd level, you can use the Help action as a bonus action. Additionally, when you use the Help action to aid an ally in attacking a creature, the target of that attack can be within 30 feet of you, rather than within 5 feet of you, if the target can see or hear you."
        },
        {
          "level": 3,
          "name": "Mastermind",
          "desc": "Your focus is on people and on the influence and secrets they have. Many spies, courtiers, and schemers follow this archetype, leading lives of intrigue. Words are your weapons as often as knives or poison, and secrets and favors are some of your favorite treasures."
        },
        {
          "level": 9,
          "name": "Insightful Manipulator",
          "desc": "Starting at 9th level, if you spend at least 1 minute observing or interacting with another creature outside combat, you can learn certain information about its capabilities compared to your own. The DM tells you if the creature is your equal, superior, or inferior in regard to two of the following characteristics of your choice:\n\u2022 Intelligence score\n\u2022 Wisdom score\n\u2022 Charisma score\n\u2022 Class levels (if any)\nAt the DM's option, you might also realize you know a piece of the creature's history or one of its personality traits, if it has any."
        },
        {
          "level": 13,
          "name": "Misdirection",
          "desc": "Beginning at 13th level, you can sometimes cause another creature to suffer an attack meant for you. When you are targeted by an attack while a creature within 5 feet of you is granting you cover against that attack, you can use your reaction to have the attack target that creature instead of you."
        },
        {
          "level": 17,
          "name": "Soul of Deceit",
          "desc": "Starting at 17th level, your thoughts can't be read by telepathy or other means, unless you allow it. You can present false thoughts by succeeding on a Charisma (Deception) check contested by the mind reader's Wisdom (Insight) check.\nAdditionally, no matter what you say, magic that would determine if you are telling the truth indicates you are being truthful if you so choose, and you can't be compelled to tell the truth by magic."
        }
      ]
    },
    "Phantom": {
      "features": [
        {
          "level": 3,
          "name": "Phantom",
          "desc": "Many rogues walk a fine line between life and death, risking their own lives and taking the lives of others. While adventuring on that line, some rogues discover a mystical connection to death itself. These rogues take knowledge from the dead and become immersed in negative energy, eventually becoming like ghosts. Thieves' guilds value them as highly effective information gatherers and spies.\nMany shadar-kai of the Shadowfell are masters of these macabre techniques, and some are willing to teach this path. In places like Thay in the Forgotten Realms and Karrnath in Eberron, where many necromancers practice their craft, a Phantom can become a wizard's confidant and right hand. In temples of gods of death, the Phantom might work as an agent to track down those who try to cheat death and to recover knowledge that might otherwise be lost to the grave.\nHow did you discover this grim power? Did you sleep in a graveyard and awaken to your new abilities? Or did you cultivate them in a temple or thieves' guild dedicated to a deity of death?"
        },
        {
          "level": 3,
          "name": "Phantom",
          "desc": "Embrace Death and Wield Ghostly Power\nSome Rogues traverse the veil between life and death, shepherding opponents to the grave and slipping through the world as undetectable as a spirit. In these pursuits, a Rogue might discover a mystical connection to death itself. Such an individual becomes immersed in negative energy, infusing their strikes with deathly energy and stealing knowledge from souls who have passed on. Thieves' guilds value Rogues of this persuasion as highly effective information gatherers and spies."
        },
        {
          "level": 3,
          "name": "Wails from the Grave",
          "desc": "3rd-level Phantom feature\nAs you nudge someone closer to the grave, you can channel the power of death to harm someone else as well. Immediately after you deal your Sneak Attack damage to a creature on your turn, you can target a second creature that you can see within 30 feet of the first creature. Roll half the number of Sneak Attack dice for your level (round up), and the second creature takes necrotic damage equal to the roll's total, as wails of the dead sound around them for a moment.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 3,
          "name": "Wails from the Grave",
          "desc": "Immediately after you deal Sneak Attack damage to a creature on your turn, you can target a second creature that you can see within 30 feet of the first creature. Roll half the number of Sneak Attack damage dice for your level (round up), and the second creature takes Necrotic damage equal to the roll's total as wails of the dead sound around it.\nYou can use this feature a number of times equal to your Dexterity modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 3,
          "name": "Whispers of the Dead",
          "desc": "3rd-level Phantom feature\nEchoes of those who have died cling to you. Whenever you finish a short or long rest, you can choose one skill or tool proficiency that you lack and gain it, as a ghostly presence shares its knowledge with you. You lose this proficiency when you use this feature to choose a different proficiency that you lack."
        },
        {
          "level": 3,
          "name": "Whispers of the Dead",
          "desc": "Whenever you finish a Short or Long Rest, you can choose one skill or tool proficiency that you lack and gain it, as a ghostly presence shares its knowledge with you. You lose this proficiency when you use this benefit again to choose a different proficiency."
        },
        {
          "level": 9,
          "name": "Tokens of the Departed",
          "desc": "9th-level Phantom feature\nWhen a life ends in your presence, you're able to snatch a token from the departing soul, a sliver of its life essence that takes physical form: as a reaction when a creature you can see dies within 30 feet of you, you can open your free hand and cause a Tiny trinket to appear there, a soul trinket. The DM determines the trinket's form or has you roll on the Trinkets table in the Player's Handbook to generate it. You can have a maximum number of soul trinkets equal to your proficiency bonus, and you can't create one while at your maximum.\nYou can use soul trinkets in the following ways:\n\u2022 While a soul trinket is on your person, you have advantage on death saving throws and Constitution saving throws, for your vitality is enhanced by the life essence within the object.\n\u2022 When you deal Sneak Attack damage on your turn, you can destroy one of your soul trinkets that's on your person and then immediately use Wails from the Grave, without expending a use of that feature.\n\u2022 As an action, you can destroy one of your soul trinkets, no matter where it's located. When you do so, you can ask the spirit associated with the trinket one question. The spirit appears to you and answers in a language it knew in life. It's under no obligation to be truthful, and it answers as concisely as possible, eager to be free. The spirit knows only what it knew in life, as determined by the DM."
        },
        {
          "level": 9,
          "name": "Tokens of the Departed",
          "desc": "The spirits of the dead are drawn to you, and echoes of their past lives magically manifest as strange curios with resonant power.\nYou gain two soul trinkets. A soul trinket is a Tiny object (the DM determines the trinket's form or has you roll on the Trinkets table in the Player's Handbook to generate it). If you move more than 30 feet from a trinket, the trinket immediately teleports to you, appearing somewhere on your person.\nUsing Soul Trinkets: You can use soul trinkets in the following ways: \u2022 Death's Knell:  \u2022 Life Essence:  \u2022 Spirit Query:\nGaining Additional Soul Trinkets: When a creature you can see within 30 feet of you dies, you can take a Reaction to gain another soul trinket, claiming a sliver of that creature's departing spirit. The new trinket appears somewhere on your person. You can have a maximum of two soul trinkets at a time. If you try to gain a soul trinket while at your maximum, one of your existing trinkets is immediately destroyed and replaced by the new trinket. The maximum number of soul trinkets you can have increases when you reach Rogue levels 13 (three trinkets) and 17 (four trinkets). Whenever you finish a Long Rest with fewer than two soul trinkets, you gain soul trinkets until you have two."
        },
        {
          "level": 9,
          "name": "Voice of Death",
          "desc": "You can cast Speak With Dead once without a spell slot, requiring no spell components and using Dexterity as the spellcasting modifier. You regain the ability to cast it this way when you finish a Short or Long Rest.\nWhen you cast the spell, you can target one of your soul trinkets from Tokens of the Departed instead of a corpse, allowing the spirit of the creature associated with the trinket to answer."
        },
        {
          "level": 13,
          "name": "Ghost Walk",
          "desc": "13th-level Phantom feature\nYou can phase partially into the realm of the dead, becoming like a ghost. As a bonus action, you assume a spectral form. While in this form, you have a flying speed of 10 feet, you can hover, and attack rolls have disadvantage against you. You can also move through creatures and objects as if they were difficult terrain, but you take 1d10 force damage if you end your turn inside a creature or an object.\nYou stay in this form for 10 minutes or until you end it as a bonus action. To use this feature again, you must finish a long rest or destroy one of your soul trinkets as part of the bonus action you use to activate Ghost Walk."
        },
        {
          "level": 13,
          "name": "Ghost Walk",
          "desc": "As a Bonus Action, you assume a spectral form, gaining the benefits below for 10 minutes or until you end them (no action required). Once you use this feature, you can't use it again until you finish a Long Rest unless you destroy one of your soul trinkets from Tokens of the Departed (no action required) to restore your use of it.\nFlight: You gain a Fly Speed of 10 feet and can hover.\nHazy Form: Attack rolls have Disadvantage against you.\nIncorporeal Movement: You can move through creatures and objects as if they were Difficult Terrain, but you take 1d10 Force damage if you end your turn inside a creature or an object."
        },
        {
          "level": 17,
          "name": "Death's Friend",
          "desc": "17th-level Phantom feature\nYour association with death has become so close that you gain the following benefits:\n\u2022 When you use your Wails from the Grave, you can deal the necrotic damage to both the first and the second creature.\n\u2022 At the end of a long rest, a soul trinket appears in your hand if you don't have any soul trinkets, as the spirits of the dead are drawn to you."
        },
        {
          "level": 17,
          "name": "Death's Friend",
          "desc": "Your association with death has become so close that you gain the following benefits.\nDeath's Lament: When you use Wails from the Grave, you can deal the feature's Necrotic damage to both the first and the second creature.\nDraw of Death: When you roll Initiative, you gain one soul trinket for your Tokens of the Departed if you have none remaining."
        }
      ]
    },
    "Scion of the Three": {
      "features": [
        {
          "level": 3,
          "name": "Bloodthirst",
          "desc": "When an enemy you can see within 30 feet of yourself takes damage and is Bloodied after taking that damage but not killed outright, you can take a Reaction and teleport to an unoccupied space you can see within 5 feet of that enemy. You can then make one melee attack. You can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 3,
          "name": "Dread Allegiance",
          "desc": "Choose one of the Dead Three: FRHoF, FRHoF, or FRHoF. You gain Resistance to one type of damage and the ability to cast a cantrip, as detailed in the table below; Intelligence is your spellcasting ability for this cantrip. When you finish a Long Rest, you can change your choice.\nGod | Damage Resistance | Cantrip\nFRHoF \u2014 Psychic \u2014 Minor Illusion\nFRHoF \u2014 Poison \u2014 Blade Ward\nFRHoF \u2014 Necrotic \u2014 Chill Touch"
        },
        {
          "level": 3,
          "name": "Scion of the Three",
          "desc": "Become a Gruesome Agent of Malice\nA Scion of the Three draws power from a group of malevolent gods known as the Dead Three: FRHoF, deity of tyranny; FRHoF, deity of violence and murder; and FRHoF, deity of death. While some Rogues of this subclass pledge themselves ardently to those three macabre gods, others find themselves thrust on this path by a curse. Either way, a scion's power manifests as various occult gifts, as well as an uncanny talent for striking and terrifying foes.\nScions of the Three are most common in Baldur's Gate, where the Dead Three have long competed for influence over mortal hearts. Underground cults to FRHoF, FRHoF, and FRHoF often count Scions of the Three among their most useful agents. Outside Baldur's Gate, secular thieves' guilds such as the Shadow Thieves of Amn or Xanathar's guild in Waterdeep might cautiously call on a Scion of the Three to undertake an especially violent contract."
        },
        {
          "level": 9,
          "name": "Strike Fear",
          "desc": "You gain the following Cunning Strike option.\nTerrify (Cost: 1d6): The target must succeed on a Wisdom saving throw, or it has the Frightened condition for 1 minute. While the target is Frightened in this way, you have Advantage on attack rolls against the target. The Frightened target repeats the save at the end of each of its turns, ending the effect on itself on a success."
        },
        {
          "level": 13,
          "name": "Aura of Malevolence",
          "desc": "You radiate malignant power associated with one of the Dead Three. When you use Bloodthirst and teleport, each creature of your choice within 10 feet of either the space you left or your destination space (your choice) takes damage equal to your Intelligence modifier; the damage type is the same as the damage Resistance granted by your choice in the Dread Allegiance feature. Damage dealt by this feature ignores Resistance."
        },
        {
          "level": 17,
          "name": "Dread Incarnate",
          "desc": "You gain the following benefits.\nCutthroat: You regain one expended use of Bloodthirst when you finish a Short Rest.\nMurderous Intent: When you roll for your Sneak Attack damage, you can treat a roll of a 1 or 2 on the die as a 3."
        }
      ]
    },
    "Scout": {
      "features": [
        {
          "level": 3,
          "name": "Scout",
          "desc": "You are skilled in stealth and surviving far from the streets of a city, allowing you to scout ahead of your companions during expeditions. Rogues who embrace this archetype are at home in the wilderness and among barbarians and rangers, and many Scouts serve as the eyes and ears of war bands. Ambusher, spy, bounty hunter\u2014these are just a few of the roles that Scouts assume as they range the world."
        },
        {
          "level": 3,
          "name": "Skirmisher",
          "desc": "Starting at 3rd level, you are difficult to pin down during a fight. You can move up to half your speed as a reaction when an enemy ends its turn within 5 feet of you. This movement doesn't provoke opportunity attacks."
        },
        {
          "level": 3,
          "name": "Survivalist",
          "desc": "When you choose this archetype at 3rd level, you gain proficiency in the Nature and Survival skills if you don't already have it. Your proficiency bonus is doubled for any ability check you make that uses either of those proficiencies."
        },
        {
          "level": 9,
          "name": "Superior Mobility",
          "desc": "At 9th level, your walking speed increases by 10 feet. If you have a climbing or swimming speed, this increase applies to that speed as well."
        },
        {
          "level": 13,
          "name": "Ambush Master",
          "desc": "Starting at 13th level, you excel at leading ambushes and acting first in a fight.\nYou have advantage on initiative rolls. In addition, the first creature you hit during the first round of a combat becomes easier for you and others to strike; attack rolls against that target have advantage until the start of your next turn."
        },
        {
          "level": 17,
          "name": "Sudden Strike",
          "desc": "Starting at 17th level, you can strike with deadly speed. If you take the Attack action on your turn, you can make one additional attack as a bonus action. This attack can benefit from your Sneak Attack even if you have already used it this turn, but you can't use your Sneak Attack against the same target more than once in a turn."
        }
      ]
    },
    "Soulknife": {
      "features": [
        {
          "level": 3,
          "name": "Psi-Bolstered Knack",
          "desc": "When your non-psionic training fails you, your psionic power can help: if you fail an ability check using a skill or tool with which you have proficiency, you can roll one Psionic Energy die and add the number rolled to the check, potentially turning failure into success. You expend the die only if the roll succeeds."
        },
        {
          "level": 3,
          "name": "Psi-Bolstered Knack",
          "desc": "If you fail an ability check using a skill or tool with which you have proficiency, you can roll one Psionic Energy Die and add the number rolled to the check, potentially turning failure into success. The die is expended only if the roll then succeeds."
        },
        {
          "level": 3,
          "name": "Psionic Power",
          "desc": "3rd-level Soulknife feature\nYou harbor a wellspring of psionic energy within yourself. This energy is represented by your Psionic Energy dice, which are each a d6. You have a number of these dice equal to twice your proficiency bonus, and they fuel various psionic powers you have, which are detailed below.\nSome of your powers expend the Psionic Energy die they use, as specified in a power's description, and you can't use a power if it requires you to use a die when your dice are all expended. You regain all your expended Psionic Energy dice when you finish a long rest. In addition, as a bonus action, you can regain one expended Psionic Energy die, but you can't do so again until you finish a short or long rest.\nWhen you reach certain levels in this class, the size of your Psionic Energy dice increases: at 5th level (d8), 11th level (d10), and 17th level (d12).\nThe powers below use your Psionic Energy dice."
        },
        {
          "level": 3,
          "name": "Psionic Power",
          "desc": "You harbor a wellspring of psionic energy within yourself. It is represented by your Psionic Energy Dice, which fuel certain powers you have from this subclass. The Soulknife Energy Dice table shows the number of these dice you have when you reach certain Rogue levels, and the table shows the die size.\nRogue Level | Die Size | Number\n3 \u2014 D6 \u2014 4\n5 \u2014 D8 \u2014 6\n9 \u2014 D8 \u2014 8\n11 \u2014 D10 \u2014 8\n13 \u2014 D10 \u2014 10\n17 \u2014 D12 \u2014 12\nAny features in this subclass that use a Psionic Energy Die use only the dice from this subclass. Some of your powers expend a Psionic Energy Die, as specified in a power's description, and you can't use a power if it requires you to use a die when your Psionic Energy Dice are all expended.\nYou regain one of your expended Psionic Energy Dice when you finish a Short Rest, and you regain all of them when you finish a Long Rest.\nThe first time you use this power after each Long Rest, you don't expend the Psionic Energy Die. All other times you use the power, you expend the die."
        },
        {
          "level": 3,
          "name": "Psychic Blades",
          "desc": "3rd-level Soulknife feature\nYou can manifest your psionic power as shimmering blades of psychic energy. Whenever you take the Attack action, you can manifest a psychic blade from your free hand and make the attack with that blade. This magic blade is a simple melee weapon with the finesse and thrown properties. It has a normal range of 60 feet and no long range, and on a hit, it deals psychic damage equal to 1d6 plus the ability modifier you used for the attack roll. The blade vanishes immediately after it hits or misses its target, and it leaves no mark on its target if it deals damage.\nAfter you attack with the blade, you can make a melee or ranged weapon attack with a second psychic blade as a bonus action on the same turn, provided your other hand is free to create it. The damage die of this bonus attack is 1d4, instead of 1d6."
        },
        {
          "level": 3,
          "name": "Psychic Blades",
          "desc": "You can manifest shimmering blades of psychic energy. Whenever you take the Attack action or make an Opportunity Attack, you can manifest a Psychic Blade in your free hand and make the attack with that blade. The magic blade has the following traits:\nPsychic Blade: \nThe blade vanishes immediately after it hits or misses its target, and it leaves no mark if it deals damage.\nAfter you attack with the blade on your turn, you can make a melee or ranged attack with a second psychic blade as a Bonus Action on the same turn if your other hand is free to create it. The damage die of this bonus attack is 1d4 instead of 1d6."
        },
        {
          "level": 3,
          "name": "Psychic Whispers",
          "desc": "You can establish telepathic communication between yourself and others-perfect for quiet infiltration. As an action, choose one or more creatures you can see, up to a number of creatures equal to your proficiency bonus, and then roll one Psionic Energy die. For a number of hours equal to the number rolled, the chosen creatures can speak telepathically with you, and you can speak telepathically with them. To send or receive a message (no action required), you and the other creature must be within 1 mile of each other. A creature can't use this telepathy if it can't speak any languages, and a creature can end the telepathic connection at any time (no action required). You and the creature don't need to speak a common language to understand each other.\nThe first time you use this power after each long rest, you don't expend the Psionic Energy die. All other times you use the power, you expend the die."
        },
        {
          "level": 3,
          "name": "Psychic Whispers",
          "desc": "You can establish telepathic communication between yourself and others. As a Magic action, choose one or more creatures you can see, up to a number of creatures equal to your Proficiency Bonus, and then roll one Psionic Energy Die. For a number of hours equal to the number rolled, the chosen creatures can speak telepathically with you, and you can speak telepathically with them. To send or receive a message (no action required), you and the other creature must be within 1 mile of each other. A creature can end the telepathic connection at any time (no action required)."
        },
        {
          "level": 3,
          "name": "Soulknife",
          "desc": "Most assassins strike with physical weapons, and many burglars and spies use thieves' tools to infiltrate secure locations. In contrast, a Soulknife strikes and infiltrates with the mind, cutting through barriers both physical and psychic. These rogues discover psionic power within themselves and channel it to do their roguish work. They find easy employment as members of thieves' guilds, though they are often mistrusted by rogues who are leery of anyone using strange mind powers to conduct their business. Most governments would also be happy to employ a Soulknife as a spy.\nAmid the trees of ancient forests on the Material Plane and in the Feywild, some wood elves walk the path of the Soulknife, serving as silent, lethal guardians of their woods. In the endless war among the gith, a githzerai is encouraged to become a Soulknife when stealth is required against the githyanki foe.\nAs a Soulknife, your psionic abilities might have haunted you since you were a child, only revealing their full potential as you experienced the stress of adventure. Or you might have sought out a reclusive order of psychic adepts and spent years learning how to manifest your power."
        },
        {
          "level": 3,
          "name": "Soulknife",
          "desc": "Strike Foes with Psionic Blades\nA Soulknife strikes with the mind, cutting through barriers both physical and psychic. These Rogues discover psionic power within themselves and channel it to do their roguish work. As a Soulknife, your psionic abilities might have haunted you since childhood, revealing their full potential only as you experienced the stress of adventure. Or you might have sought out an order of psychic adepts and spent years learning how to manifest your power."
        },
        {
          "level": 9,
          "name": "Homing Strikes",
          "desc": "If you make an attack roll with your Psychic Blades and miss the target, you can roll one Psionic Energy die and add the number rolled to the attack roll. If this causes the attack to hit, you expend the Psionic Energy die."
        },
        {
          "level": 9,
          "name": "Homing Strikes",
          "desc": "If you make an attack roll with your Psychic Blade and miss the target, you can roll one Psionic Energy Die and add the number rolled to the attack roll. If this causes the attack to hit, the die is expended."
        },
        {
          "level": 9,
          "name": "Psychic Teleportation",
          "desc": "As a bonus action, you manifest one of your Psychic Blades, expend one Psionic Energy die and roll it, and throw the blade at an unoccupied space you can see, up to a number of feet away equal to 10 times the number rolled. You then teleport to that space, and the blade vanishes."
        },
        {
          "level": 9,
          "name": "Psychic Teleportation",
          "desc": "As a Bonus Action, you manifest a Psychic Blade, expend one Psionic Energy Die and roll it, and throw the blade at an unoccupied space you can see up to a number of feet away equal to 10 times the number rolled. You then teleport to that space, and the blade vanishes."
        },
        {
          "level": 9,
          "name": "Soul Blades",
          "desc": "9th-level Soulknife feature\nYour Psychic Blades are now an expression of your psi-suffused soul, giving you these powers that use your Psionic Energy dice:"
        },
        {
          "level": 9,
          "name": "Soul Blades",
          "desc": "You can now use the following powers with your Psychic Blades."
        },
        {
          "level": 13,
          "name": "Psychic Veil",
          "desc": "13th-level Soulknife feature\nYou can weave a veil of psychic static to mask yourself. As an action, you can magically become invisible, along with anything you are wearing or carrying, for 1 hour or until you dismiss this effect (no action required). This invisibility ends early immediately after you deal damage to a creature or you force a creature to make a saving throw.\nOnce you use this feature, you can't do so again until you finish a long rest, unless you expend a Psionic Energy die to use this feature again."
        },
        {
          "level": 13,
          "name": "Psychic Veil",
          "desc": "You can weave a veil of psychic static to mask yourself. As a Magic action, you gain the Invisible condition for 1 hour or until you dismiss this effect (no action required). This invisibility ends early immediately after you deal damage to a creature or you force a creature to make a saving throw.\nOnce you use this feature, you can't do so again until you finish a Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."
        },
        {
          "level": 17,
          "name": "Rend Mind",
          "desc": "17th-level Soulknife feature\nYou can sweep your Psychic Blades directly through a creature's mind. When you use your Psychic Blades to deal Sneak Attack damage to a creature, you can force that target to make a Wisdom saving throw (DC equal to 8 + your proficiency bonus + your Dexterity modifier). If the save fails, the target is stunned for 1 minute. The stunned target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.\nOnce you use this feature, you can't do so again until you finish a long rest, unless you expend three Psionic Energy dice to use it again."
        },
        {
          "level": 17,
          "name": "Rend Mind",
          "desc": "You can sweep your Psychic Blades through a creature's mind. When you use your Psychic Blades to deal Sneak Attack damage to a creature, you can force that target to make a Wisdom saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus). If the save fails, the target has the Stunned condition for 1 minute. The Stunned target repeats the save at the end of each of its turns, ending the effect on itself on a success.\nOnce you use this feature, you can't do so again until you finish a Long Rest unless you expend three Psionic Energy Dice (no action required) to restore your use of it."
        }
      ]
    },
    "Swashbuckler": {
      "features": [
        {
          "level": 3,
          "name": "Fancy Footwork",
          "desc": "When you choose this archetype at 3rd level, you learn how to land a strike and then slip away without reprisal. During your turn, if you make a melee attack against a creature, that creature can't make opportunity attacks against you for the rest of your turn."
        },
        {
          "level": 3,
          "name": "Rakish Audacity",
          "desc": "Starting at 3rd level, your confidence propels you into battle. You can give yourself a bonus to your initiative rolls equal to your Charisma modifier.\nYou also gain an additional way to use your Sneak Attack; you don't need advantage on your attack roll to use Sneak Attack against a creature if you are within 5 feet of it, no other creatures are within 5 feet of you, and you don't have disadvantage on the attack roll. All the other rules for Sneak Attack still apply to you."
        },
        {
          "level": 3,
          "name": "Swashbuckler",
          "desc": "You focus your training on the art of the blade, relying on speed, elegance, and charm in equal parts. While some warriors are brutes clad in heavy armor, your method of fighting looks almost like a performance. Duelists and pirates typically belong to this archetype.\nA Swashbuckler excels in single combat, and can fight with two weapons while safely darting away from an opponent."
        },
        {
          "level": 9,
          "name": "Panache",
          "desc": "At 9th level, your charm becomes extraordinarily beguiling. As an action, you can make a Charisma (Persuasion) check contested by a creature's Wisdom (Insight) check. The creature must be able to hear you, and the two of you must share a language.\nIf you succeed on the check and the creature is hostile to you, it has disadvantage on attack rolls against targets other than you and can't make opportunity attacks against targets other than you. This effect lasts for 1 minute, until one of your companions attacks the target or affects it with a spell, or until you and the target are more than 60 feet apart.\nIf you succeed on the check and the creature isn't hostile to you, it is charmed by you for 1 minute. While charmed, it regards you as a friendly acquaintance. This effect ends immediately if you or your companions do anything harmful to it."
        },
        {
          "level": 13,
          "name": "Elegant Maneuver",
          "desc": "Starting at 13th level, you can use a bonus action on your turn to gain advantage on the next Dexterity (Acrobatics) or Strength (Athletics) check you make during the same turn."
        },
        {
          "level": 17,
          "name": "Master Duelist",
          "desc": "Beginning at 17th level, your mastery of the blade lets you turn failure into success in combat. If you miss with an attack roll, you can roll it again with advantage. Once you do so, you can't use this feature again until you finish a short or long rest."
        }
      ]
    },
    "Thief": {
      "features": [
        {
          "level": 3,
          "name": "Fast Hands",
          "desc": "Starting at 3rd level, you can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves' tools to disarm a trap or open a lock, or take the Use an Object action."
        },
        {
          "level": 3,
          "name": "Fast Hands",
          "desc": "As a Bonus Action, you can do one of the following.\nSleight of Hand: Make a Dexterity (Sleight of Hand) check to pick a lock or disarm a trap with Thieves' Tools or to pick a pocket.\nUse an Object: Take the Utilize action, or take the Magic action to use a magic item that requires that action."
        },
        {
          "level": 3,
          "name": "Second-Story Work",
          "desc": "When you choose this archetype at 3rd level, you gain the ability to climb faster than normal; climbing no longer costs you extra movement.\nIn addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier."
        },
        {
          "level": 3,
          "name": "Second-Story Work",
          "desc": "You've trained to get into especially hard-to-reach places, granting you these benefits.\nClimber: You gain a Climb Speed equal to your Speed.\nJumper: You can determine your jump distance using your Dexterity rather than your Strength."
        },
        {
          "level": 3,
          "name": "Thief",
          "desc": "You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, but so do rogues who prefer to think of themselves as professional treasure seekers, explorers, delvers, and investigators. In addition to improving your agility and stealth, you learn skills useful for delving into ancient ruins, reading unfamiliar languages, and using magic items you normally couldn't employ."
        },
        {
          "level": 3,
          "name": "Thief",
          "desc": "Hunt for Treasure as a Classic Adventurer\nA mix of burglar, treasure hunter, and explorer, you are the epitome of an adventurer. In addition to improving your agility and stealth, you gain abilities useful for delving into ruins and getting maximum benefit from the magic items you find there."
        },
        {
          "level": 9,
          "name": "Supreme Sneak",
          "desc": "Starting at 9th level, you have advantage on a Dexterity (Stealth) check if you move no more than half your speed on the same turn."
        },
        {
          "level": 9,
          "name": "Supreme Sneak",
          "desc": "You gain the following Cunning Strike option.\nStealth Attack (Cost: 1d6): If you have the Hide action's Invisible condition, this attack doesn't end that condition on you if you end the turn behind Three-Quarters Cover or Total Cover."
        },
        {
          "level": 13,
          "name": "Use Magic Device",
          "desc": "By 13th level, you have learned enough about the workings of magic that you can improvise the use of items even when they are not intended for you. You ignore all class, race, and level requirements on the use of magic items."
        },
        {
          "level": 13,
          "name": "Use Magic Device",
          "desc": "You've learned how to maximize use of magic items, granting you the following benefits.\nAttunement: You can attune to up to four magic items at once.\nCharges: Whenever you use a magic item property that expends charges, roll 1d6. On a roll of 6, you use the property without expending the charges.\nScrolls: You can use any Spell Scroll, using Intelligence as your spellcasting ability for the spell. If the spell is a cantrip or a level 1 spell, you can cast it reliably. If the scroll contains a higher-level spell, you must first succeed on an Intelligence (Arcana) check (DC 10 plus the spell's level). On a successful check, you cast the spell from the scroll. On a failed check, the scroll disintegrates."
        },
        {
          "level": 17,
          "name": "Thief's Reflexes",
          "desc": "When you reach 17th level, you have become adept at laying ambushes and quickly escaping danger. You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10. You can't use this feature when you are surprised."
        },
        {
          "level": 17,
          "name": "Thief's Reflexes",
          "desc": "You are adept at laying ambushes and quickly escaping danger. You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10."
        }
      ]
    }
  },
  "Sorcerer": {
    "Aberrant Mind": {
      "features": [
        {
          "level": 1,
          "name": "Aberrant Mind",
          "desc": "An alien influence has wrapped its tendrils around your mind, giving you psionic power. You can now touch other minds with that power and alter the world around you by using it to control the magical energy of the multiverse. Will this power shine from you as a hopeful beacon to others? Or will you be a source of terror to those who feel the stab of your mind and witness the strange manifestations of your might?\nAs an Aberrant Mind sorcerer, you decide how you acquired your powers. Were you born with them? Or did an event later in life leave you shining with psionic awareness? Consult the Aberrant Origins table for a possible origin of your power.\nd6 | Origin\n1 \u2014 You were exposed to the Far Realm's warping influence. You are convinced that a tentacle is now growing on you, but no one else can see it.\n2 \u2014 A psychic wind from the Astral Plane carried psionic energy to you. When you use your powers, faint motes of light sparkle around you.\n3 \u2014 You once suffered the dominating powers of an aboleth, leaving a psychic splinter in your mind.\n4 \u2014 You were implanted with a mind flayer tadpole, but the ceremorphosis never completed. And now its psionic power is yours. When you use it, your flesh shines with a strange mucus.\n5 \u2014 As a child, you had an imaginary friend that looked like a flumph or a strange platypus-like creature. One day, it gifted you with psionic powers, which have ended up being not so imaginary.\n6 \u2014 Your nightmares whisper the truth to you: your psionic powers are not your own. You draw them from your parasitic twin!"
        },
        {
          "level": 1,
          "name": "Psionic Spells",
          "desc": "1st-level Aberrant Mind feature\nYou learn additional spells when you reach certain levels in this class, as shown on the Psionic Spells table. Each of these spells counts as a sorcerer spell for you, but it doesn't count against the number of sorcerer spells you know.\nWhenever you gain a sorcerer level, you can replace one spell you gained from this feature with another spell of the same level. The new spell must be a divination or an enchantment spell from the sorcerer, warlock, or wizard spell list.\nSorcerer Level | Spells\n1st \u2014 Arms Of Hadar, Dissonant Whispers, Mind Sliver\n3rd \u2014 Calm Emotions, Detect Thoughts\n5th \u2014 Hunger Of Hadar, Sending\n7th \u2014 Evard'S Black Tentacles, Summon Aberration\n9th \u2014 Rary'S Telepathic Bond, Telekinesis"
        },
        {
          "level": 1,
          "name": "Telepathic Speech",
          "desc": "1st-level Aberrant Mind feature\nYou can form a telepathic connection between your mind and the mind of another. As a bonus action, choose one creature you can see within 30 feet of you. You and the chosen creature can speak telepathically with each other while the two of you are within a number of miles of each other equal to your Charisma modifier (minimum of 1 mile). To understand each other, you each must speak mentally in a language the other knows.\nThe telepathic connection lasts for a number of minutes equal to your sorcerer level. It ends early if you are incapacitated or die or if you use this ability to form a connection with a different creature."
        },
        {
          "level": 6,
          "name": "Psionic Sorcery",
          "desc": "6th-level Aberrant Mind feature\nWhen you cast any spell of 1st level or higher from your Psionic Spells feature, you can cast it by expending a spell slot as normal or by spending a number of sorcery points equal to the spell's level.\nIf you cast the spell using sorcery points, it requires no verbal or somatic components, and it requires no material components, unless they are consumed by the spell."
        },
        {
          "level": 6,
          "name": "Psychic Defenses",
          "desc": "6th-level Aberrant Mind feature\nYou gain resistance to psychic damage, and you have advantage on saving throws against being charmed or frightened."
        },
        {
          "level": 14,
          "name": "Revelation in Flesh",
          "desc": "14th-level Aberrant Mind feature\nYou can unleash the aberrant truth hidden within yourself. As a bonus action, you can spend 1 or more sorcery points to magically transform your body for 10 minutes. For each sorcery point you spend, you can gain one of the following benefits of your choice, the effects of which last until the transformation ends:\n\u2022 You can see any invisible creature within 60 feet of you, provided it isn't behind Cover. Your eyes also turn black or become writhing sensory tendrils.\n\u2022 You gain a flying speed equal to your walking speed, and you can hover. As you fly, your skin glistens with mucus or shines with an otherworldly light.\n\u2022 You gain a swimming speed equal to twice your walking speed, and you can breathe underwater. Moreover, gills grow from your neck or fan out from behind your ears, your fingers become webbed, or you grow writhing cilia that extend through your clothing.\n\u2022 Your body, along with any equipment you are wearing or carrying, becomes slimy and pliable. You can move through any space as narrow as 1 inch without squeezing, and you can spend 5 feet of movement to escape from nonmagical restraints or being grappled."
        },
        {
          "level": 18,
          "name": "Warping Implosion",
          "desc": "18th-level Aberrant Mind feature\nYou can unleash your aberrant power as a space-warping anomaly. As an action, you can teleport to an unoccupied space you can see within 120 feet of you. Immediately after you disappear, each creature within 30 feet of the space you left must make a Strength saving throw against your spell save DC. On a failed save, a creature takes 3d10 force damage and is pulled straight toward the space you left, ending in an unoccupied space as close to your former space as possible. On a successful save, the creature takes half as much damage and isn't pulled.\nOnce you use this feature, you can't do so again until you finish a long rest, unless you spend 5 sorcery points to use it again."
        }
      ]
    },
    "Aberrant Sorcery": {
      "features": [
        {
          "level": 3,
          "name": "Aberrant Sorcery",
          "desc": "Wield Unnatural Psionic Power\nAn alien influence has wrapped its tendrils around your mind, giving you psionic power. You can now touch other minds with that power and alter the world around you. Will this power shine from you as a hopeful beacon to others? Or will you be a terror to those who feel the stab of your mind?\nPerhaps a psychic wind from the Astral Plane carried psionic energy to you, or you were exposed to the Far Realm's warping influence. Alternatively, you were implanted with a mind flayer tadpole, but your transformation into a mind flayer never occurred; now the tadpole's psionic power is yours. However you acquired this power, your mind is aflame with it."
        },
        {
          "level": 3,
          "name": "Psionic Spells",
          "desc": "When you reach a Sorcerer level specified in the Psionic Spells table, you thereafter always have the listed spells prepared.\nSorcerer Level | Spells\n3rd \u2014 Arms Of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, Mind Sliver\n5th \u2014 Hunger Of Hadar, Sending\n7th \u2014 Evard'S Black Tentacles, Summon Aberration\n9th \u2014 Rary'S Telepathic Bond, Telekinesis"
        },
        {
          "level": 3,
          "name": "Telepathic Speech",
          "desc": "You can form a telepathic connection between your mind and the mind of another. As a Bonus Action, choose one creature you can see within 30 feet of yourself. You and the chosen creature can communicate telepathically with each other while the two of you are within a number of miles of each other equal to your Charisma modifier (minimum of 1 mile). To understand each other, you each must mentally use a language the other knows.\nThe telepathic connection lasts for a number of minutes equal to your Sorcerer level. It ends early if you use this ability to form a connection with a different creature."
        },
        {
          "level": 6,
          "name": "Psionic Sorcery",
          "desc": "When you cast any level 1+ spell from your Psionic Spells feature, you can cast it by expending a spell slot as normal or by spending a number of Sorcery Points equal to the spell's level. If you cast the spell using Sorcery Points, it requires no Verbal or Somatic components, and it requires no Material components unless they are consumed by the spell or have a cost specified in it."
        },
        {
          "level": 6,
          "name": "Psychic Defenses",
          "desc": "You have Resistance to Psychic damage, and you have Advantage on saving throws to avoid or end the Charmed or Frightened condition."
        },
        {
          "level": 14,
          "name": "Revelation in Flesh",
          "desc": "You can unleash the aberrant truth hidden within yourself. As a Bonus Action, you can spend 1 Sorcery Point or more to magically alter your body for 10 minutes. For each Sorcery Point you spend, you gain one of the following benefits of your choice, the effects of which last until the alteration ends.\nAquatic Adaptation: You gain a Swim Speed equal to twice your Speed, and you can breathe underwater. Gills grow from your neck or flare behind your ears, and your fingers become webbed or you grow wriggling cilia.\nGlistening Flight: You gain a Fly Speed equal to your Speed, and you can hover. As you fly, your skin glistens with mucus or otherworldly light.\nSee the Invisible: You can see any Invisible creature within 60 feet of yourself that isn't behind Total Cover. Your eyes also turn black or become writhing sensory tendrils.\nWormlike Movement: Your body, along with any equipment you are wearing or carrying, becomes slimy and pliable. You can move through any space as narrow as 1 inch, and you can spend 5 feet of movement to escape from nonmagical restraints or the Grappled condition."
        },
        {
          "level": 18,
          "name": "Warping Implosion",
          "desc": "You can unleash a space-warping anomaly. As a Magic action, you teleport to an unoccupied space you can see within 120 feet of yourself. Immediately after you disappear, each creature within 30 feet of the space you left must make a Strength saving throw against your spell save DC. On a failed save, a creature takes 3d10 Force damage and is pulled straight toward the space you left, ending in an unoccupied space as close to your former space as possible. On a successful save, the creature takes half as much damage only.\nOnce you use this feature, you can't do so again until you finish a Long Rest unless you spend 5 Sorcery Points (no action required) to restore your use of it."
        }
      ]
    },
    "Clockwork Sorcery": {
      "features": [
        {
          "level": 3,
          "name": "Clockwork Sorcery",
          "desc": "Channel Cosmic Forces of Order\nThe cosmic force of order has suffused you with magic. That power arises from Mechanus or a realm like it\u2014a plane of existence shaped entirely by clockwork efficiency. You or someone from your lineage might have become entangled in the machinations of modrons, the orderly beings who inhabit Mechanus. Perhaps your ancestor even took part in the Great Modron March. Whatever its origin within you, the power of order can seem strange to others, but for you, it's part of a vast and glorious system."
        },
        {
          "level": 3,
          "name": "Clockwork Spells",
          "desc": "When you reach a Sorcerer level specified in the Clockwork Spells table, you thereafter always have the listed spells prepared.\nSorcerer Level | Spells\n3rd \u2014 Aid, Alarm, Lesser Restoration, Protection From Evil And Good\n5th \u2014 Dispel Magic, Protection From Energy\n7th \u2014 Freedom Of Movement, Summon Construct\n9th \u2014 Greater Restoration, Wall Of Force\nIn addition, consult the Manifestations of Order table and choose or randomly determine a way your connection to order manifests while you are casting any of your Sorcerer spells.\n1d6 | Manifestation\n1 \u2014 Spectral cogwheels hover behind you.\n2 \u2014 The hands of a clock spin in your eyes.\n3 \u2014 Your skin glows with a brassy sheen.\n4 \u2014 Floating equations and geometric objects overlay your body.\n5 \u2014 Your Spellcasting Focus temporarily takes the form of a Tiny clockwork mechanism.\n6 \u2014 The ticking of gears or ringing of a clock can be heard by you and those affected by your magic."
        },
        {
          "level": 3,
          "name": "Restore Balance",
          "desc": "Your connection to the plane of absolute order allows you to equalize chaotic moments. When a creature you can see within 60 feet of yourself is about to roll a d20 with Advantage or Disadvantage, you can take a Reaction to prevent the roll from being affected by Advantage and Disadvantage.\nYou can use this feature a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 6,
          "name": "Bastion of Law",
          "desc": "You can tap into the grand equation of existence to imbue a creature with a shimmering shield of order. As a Magic action, you can expend 1 to 5 Sorcery Points to create a magical ward around yourself or another creature you can see within 30 feet of yourself. The ward is represented by a number of d8s equal to the number of Sorcery Points spent to create it. When the warded creature takes damage, it can expend a number of those dice, roll them, and reduce the damage taken by the total rolled on those dice.\nThe ward lasts until you finish a Long Rest or until you use this feature again."
        },
        {
          "level": 14,
          "name": "Trance of Order",
          "desc": "You gain the ability to align your consciousness with the endless calculations of Mechanus. As a Bonus Action, you can enter this state for 1 minute. For the duration, attack rolls against you can't benefit from Advantage, and whenever you make a D20 Test, you can treat a roll of 9 or lower on the d20 as a 10.\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you spend 5 Sorcery Points (no action required) to restore your use of it."
        },
        {
          "level": 18,
          "name": "Clockwork Cavalcade",
          "desc": "You momentarily summon spirits of order to expunge disorder around you. As a Magic action, you summon the spirits in a 30-foot Cube originating from you. The spirits look like modrons or other Constructs of your choice. The spirits are intangible and invulnerable, and they create the effects below within the Cube before vanishing. Once you use this action, you can't use it again until you finish a Long Rest unless you spend 7 Sorcery Points (no action required) to restore your use of it.\nHeal: The spirits restore up to 100 Hit Points, divided as you choose among any number of creatures of your choice in the Cube.\nRepair: Any damaged objects entirely in the Cube are repaired instantly.\nDispel: Every spell of level 6 and lower ends on creatures and objects of your choice in the Cube."
        }
      ]
    },
    "Clockwork Soul": {
      "features": [
        {
          "level": 1,
          "name": "Clockwork Magic",
          "desc": "1st-level Clockwork Soul feature\nYou learn additional spells when you reach certain levels in this class, as shown on the Clockwork Spells table. Each of these spells counts as a sorcerer spell for you, but it doesn't count against the number of sorcerer spells you know.\nWhenever you gain a sorcerer level, you can replace one spell you gained from this feature with another spell of the same level. The new spell must be an abjuration or a transmutation spell from the sorcerer, warlock, or wizard spell list.\nSorcerer Level | Spells\n1st \u2014 Alarm, Protection From Evil And Good\n3rd \u2014 Aid, Lesser Restoration\n5th \u2014 Dispel Magic, Protection From Energy\n7th \u2014 Freedom Of Movement, Summon Construct\n9th \u2014 Greater Restoration, Wall Of Force\nIn addition, consult the Manifestations of Order table and choose or randomly determine a way your connection to order manifests while you are casting any of your sorcerer spells.\nd6 | Manifestation\n1 \u2014 Spectral cogwheels hover behind you.\n2 \u2014 The hands of a clock spin in your eyes.\n3 \u2014 Your skin glows with a brassy sheen.\n4 \u2014 Floating equations and geometric objects overlay your body.\n5 \u2014 Your spellcasting focus temporarily takes the form of a Tiny clockwork mechanism.\n6 \u2014 The ticking of gears or ringing of a clock can be heard by you and those affected by your magic."
        },
        {
          "level": 1,
          "name": "Clockwork Soul",
          "desc": "The cosmic force of order has suffused you with magic. That power arises from Mechanus or a realm like it-a plane of existence shaped entirely by clockwork efficiency. You, or someone from your lineage, might have become entangled in the machinations of the modrons, the orderly beings who inhabit Mechanus. Perhaps your ancestor even took part in the Great Modron March. Whatever its origin within you, the power of order can seem strange to others, but for you, it is part of a vast and glorious system."
        },
        {
          "level": 1,
          "name": "Restore Balance",
          "desc": "1st-level Clockwork Soul feature\nYour connection to the plane of absolute order allows you to equalize chaotic moments. When a creature you can see within 60 feet of you is about to roll a d20 with advantage or disadvantage, you can use your reaction to prevent the roll from being affected by advantage and disadvantage.\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 6,
          "name": "Bastion of Law",
          "desc": "6th-level Clockwork Soul feature\nYou can tap into the grand equation of existence to imbue a creature with a shimmering shield of order. As an action, you can expend 1 to 5 sorcery points to create a magical ward around yourself or another creature you can see within 30 feet of you. The ward lasts until you finish a long rest or until you use this feature again.\nThe ward is represented by a number of d8s equal to the number of sorcery points spent to create it. When the warded creature takes damage, it can expend a number of those dice, roll them, and reduce the damage taken by the total rolled on those dice."
        },
        {
          "level": 14,
          "name": "Trance of Order",
          "desc": "14th-level Clockwork Soul feature\nYou gain the ability to align your consciousness to the endless calculations of Mechanus. As a bonus action, you can enter this state for 1 minute. For the duration, attack rolls against you can't benefit from advantage, and whenever you make an attack roll, an ability check, or a saving throw, you can treat a roll of 9 or lower on the d20 as a 10.\nOnce you use this bonus action, you can't use it again until you finish a long rest, unless you spend 5 sorcery points to use it again."
        },
        {
          "level": 18,
          "name": "Clockwork Cavalcade",
          "desc": "18th-level Clockwork Soul feature\nYou summon spirits of order to expunge disorder around you. As an action, you summon the spirits in a 30-foot cube originating from you. The spirits look like modrons or other constructs of your choice. The spirits are intangible and invulnerable, and they create the following effects within the cube before vanishing:\n\u2022 The spirits restore up to 100 hit points, divided as you choose among any number of creatures of your choice in the cube.\n\u2022 Any damaged objects entirely in the cube are repaired instantly.\n\u2022 Every spell of 6th level or lower ends on creatures and objects of your choice in the cube.\nOnce you use this action, you can't use it again until you finish a long rest, unless you spend 7 sorcery points to use it again."
        }
      ]
    },
    "Divine Soul": {
      "features": [
        {
          "level": 1,
          "name": "Divine Magic",
          "desc": "Your link to the divine allows you to learn spells from the cleric class. When your Spellcasting feature lets you learn or replace a sorcerer cantrip or a sorcerer spell of 1st level or higher, you can choose the new spell from the cleric spell list or the sorcerer spell list. You must otherwise obey all the restrictions for selecting the spell, and it becomes a sorcerer spell for you.\nIn addition, choose an affinity for the source of your divine power: good, evil, law, chaos, or neutrality. You learn an additional spell based on that affinity, as shown below. It is a sorcerer spell for you, but it doesn't count against your number of sorcerer spells known. If you later replace this spell, you must replace it with a spell from the cleric spell list.\nAffinity | Spell\nGood \u2014 Cure Wounds\nEvil \u2014 Inflict Wounds\nLaw \u2014 Bless\nChaos \u2014 Bane\nNeutrality \u2014 Protection From Evil And Good"
        },
        {
          "level": 1,
          "name": "Divine Soul",
          "desc": "Sometimes the spark of magic that fuels a sorcerer comes from a divine source that glimmers within the soul. Having such a blessed soul is a sign that your innate magic might come from a distant but powerful familial connection to a divine being. Perhaps your ancestor was an angel, transformed into a mortal and sent to fight in a god's name.\nOr your birth might align with an ancient prophecy, marking you as a servant of the gods or a chosen vessel of divine magic.\nA Divine Soul, with a natural magnetism, is seen as a threat by some religious hierarchies. As an outsider who commands sacred power, a Divine Soul can undermine an existing order by claiming a direct tie to the divine.\nIn some cultures, only those who can claim the power of a Divine Soul may command religious power. In these lands, ecclesiastical positions are dominated by a few bloodlines and preserved over generations."
        },
        {
          "level": 1,
          "name": "Favored by the Gods",
          "desc": "Starting at 1st level, divine power guards your destiny. If you fail a saving throw or miss with an attack roll, you can roll 2d4 and add it to the total, possibly changing the outcome. Once you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 6,
          "name": "Empowered Healing",
          "desc": "Starting at 6th level, the divine energy coursing through you can empower healing spells. Whenever you or an ally within 5 feet of you rolls dice to determine the number of hit points a spell restores, you can spend 1 sorcery point to reroll any number of those dice once, provided you aren't incapacitated. You can use this feature only once per turn."
        },
        {
          "level": 14,
          "name": "Otherworldly Wings",
          "desc": "Starting at 14th level, you can use a bonus action to manifest a pair of spectral wings from your back. While the wings are present, you have a flying speed of 30 feet. The wings last until you're incapacitated, you die, or you dismiss them as a bonus action.\nThe affinity you chose for your Divine Magic feature determines the appearance of the spectral wings: eagle wings for good or law, bat wings for evil or chaos, and dragonfly wings for neutrality."
        },
        {
          "level": 18,
          "name": "Unearthly Recovery",
          "desc": "At 18th level, you gain the ability to overcome grievous injuries. As a bonus action when you have fewer than half of your hit points remaining, you can regain a number of hit points equal to half your hit point maximum.\nOnce you use this feature, you can't use it again until you finish a long rest."
        }
      ]
    },
    "Draconic Bloodline": {
      "features": [
        {
          "level": 1,
          "name": "Draconic Bloodline",
          "desc": "Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times who made a bargain with a dragon or who might even have claimed a dragon parent. Some of these bloodlines are well established in the world, but most are obscure. Any given sorcerer could be the first of a new bloodline, as a result of a pact or some other exceptional circumstance."
        },
        {
          "level": 1,
          "name": "Draconic Resilience",
          "desc": "As magic flows through your body, it causes physical traits of your dragon ancestors to emerge. At 1st level, your hit point maximum increases by 1 and increases by 1 again whenever you gain a level in this class.\nAdditionally, parts of your skin are covered by a thin sheen of dragon-like scales. When you aren't wearing armor, your AC equals 13 + your Dexterity modifier."
        },
        {
          "level": 1,
          "name": "Dragon Ancestor",
          "desc": "At 1st level, you choose one type of dragon as your ancestor. The damage type associated with each dragon is used by features you gain later.\nDragon | Damage Type\nBlack \u2014 Acid\nBlue \u2014 Lightning\nBrass \u2014 Fire\nBronze \u2014 Lightning\nCopper \u2014 Acid\nGold \u2014 Fire\nGreen \u2014 Poison\nRed \u2014 Fire\nSilver \u2014 Cold\nWhite \u2014 Cold\nYou can speak, read, and write Draconic. Additionally, whenever you make a Charisma check when interacting with dragons, your proficiency bonus is doubled if it applies to the check."
        },
        {
          "level": 3,
          "name": "Draconic Resilience",
          "desc": "The magic in your body manifests physical traits of your draconic gift. Your Hit Point maximum increases by 3, and it increases by 1 whenever you gain another Sorcerer level.\nParts of you are also covered by dragon-like scales. While you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers."
        },
        {
          "level": 3,
          "name": "Draconic Sorcery",
          "desc": "Breathe the Magic of Dragons\nYour innate magic comes from the gift of a dragon. Perhaps an ancient dragon facing death bequeathed some of its magical power to you or your ancestor. You might have absorbed magic from a site infused with dragons' power. Or perhaps you handled a treasure taken from a dragon's hoard that was steeped in draconic power. Or you might have a dragon for an ancestor."
        },
        {
          "level": 3,
          "name": "Draconic Spells",
          "desc": "When you reach a Sorcerer level specified in the Draconic Spells table, you thereafter always have the listed spells prepared.\nSorcerer Level | Spells\n3rd \u2014 Alter Self, Chromatic Orb, Command, Dragon'S Breath\n5th \u2014 Fear, Fly\n7th \u2014 Arcane Eye, Charm Monster\n9th \u2014 Legend Lore, Summon Dragon"
        },
        {
          "level": 6,
          "name": "Elemental Affinity",
          "desc": "Starting at 6th level, when you cast a spell that deals damage of the type associated with your draconic ancestry, you can add your Charisma modifier to one damage roll of that spell. At the same time, you can spend 1 sorcery point to gain resistance to that damage type for 1 hour."
        },
        {
          "level": 6,
          "name": "Elemental Affinity",
          "desc": "Your draconic magic has an affinity with a damage type associated with dragons. Choose one of those types: Acid, Cold, Fire, Lightning, or Poison.\nYou have Resistance to that damage type, and when you cast a spell that deals damage of that type, you can add your Charisma modifier to one damage roll of that spell."
        },
        {
          "level": 14,
          "name": "Dragon Wings",
          "desc": "At 14th level, you gain the ability to sprout a pair of dragon wings from your back, gaining a flying speed equal to your current speed. You can create these wings as a bonus action on your turn. They last until you dismiss them as a bonus action on your turn.\nYou can't manifest your wings while wearing armor unless the armor is made to accommodate them, and clothing not made to accommodate your wings might be destroyed when you manifest them."
        },
        {
          "level": 14,
          "name": "Dragon Wings",
          "desc": "As a Bonus Action, you can cause draconic wings to appear on your back. The wings last for 1 hour or until you dismiss them (no action required). For the duration, you have a Fly Speed of 60 feet.\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you spend 3 Sorcery Points (no action required) to restore your use of it."
        },
        {
          "level": 18,
          "name": "Draconic Presence",
          "desc": "Beginning at 18th level, you can channel the dread presence of your dragon ancestor, causing those around you to become awestruck or frightened. As an action, you can spend 5 sorcery points to draw on this power and exude an aura of awe or fear (your choice) to a distance of 60 feet. For 1 minute or until you lose your concentration (as if you were casting a concentration spell), each hostile creature that starts its turn in this aura must succeed on a Wisdom saving throw or be charmed (if you chose awe) or frightened (if you chose fear) until the aura ends. A creature that succeeds on this saving throw is immune to your aura for 24 hours."
        },
        {
          "level": 18,
          "name": "Dragon Companion",
          "desc": "You can cast Summon Dragon without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.\nWhenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting."
        }
      ]
    },
    "Lunar Sorcery": {
      "features": [
        {
          "level": 1,
          "name": "Lunar Embodiment",
          "desc": "1st-Level Lunar Sorcery Feature\nYou learn additional spells when you reach certain levels in this class, as shown on the Lunar Spells table. Each of these spells counts as a sorcerer spell for you, but it doesn't count against the number of sorcerer spells you know.\nSorcerer Level | Full Moon Spell | New Moon Spell | Crescent Moon Spell\n1st \u2014 Shield \u2014 Ray Of Sickness \u2014 Color Spray\n3rd \u2014 Lesser Restoration \u2014 Blindness/Deafness \u2014 Alter Self\n5th \u2014 Dispel Magic \u2014 Vampiric Touch \u2014 Phantom Steed\n7th \u2014 Death Ward \u2014 Confusion \u2014 Hallucinatory Terrain\n9th \u2014 Rary'S Telepathic Bond \u2014 Hold Monster \u2014 Mislead\nWhenever you finish a long rest, you can choose what lunar phase manifests its power through your magic: Full Moon, New Moon, or Crescent Moon. While in the chosen phase, you can cast one 1st-level spell of the associated phase in the Lunar Spells table once without expending a spell slot. Once you cast a spell in this way, you can't do so again until you finish a long rest."
        },
        {
          "level": 1,
          "name": "Lunar Sorcery",
          "desc": "On many worlds, the moon is a revered celestial body with magical properties. On Krynn, the gods of magic are associated with the world's three moons. On the world of Toril, the god Sel\u00fbne uses the light of the moon to battle darkness. On Eberron, scholars of the Draconic Prophecy decipher ancient secrets from the waxing and waning of that world's twelve moons.\nYou or someone from your lineage has been exposed to the concentrated magic of the moon (or moons) of your world, imbuing you with lunar magic. Perhaps your ancestor was involved in a druidic ritual involving an eclipse, or maybe a mystical fragment of a moon crashed near you. However you came to have your magic, your connection to the moon is obvious when you cast sorcerer spells\u2014perhaps making your pupils glow with the color of a moon from your world, causing spectral manifestations of lunar phases to orbit you, or some other effect."
        },
        {
          "level": 1,
          "name": "Moon Fire",
          "desc": "1st-Level Lunar Sorcery Feature\nYou can call down the radiant light of the moon on command. You learn the Sacred Flame spell, which doesn't count against the number of sorcerer cantrips you know. When you cast the spell, you can target one creature as normal or target two creatures within range that are within 5 feet of each other."
        },
        {
          "level": 6,
          "name": "Lunar Boons",
          "desc": "6th-Level Lunar Sorcery Feature\nThe current phase of your Lunar Embodiment can affect your Metamagic feature. Each Lunar Embodiment phase is associated with certain schools of magic, as shown here:\n\u2022 Full Moon: Abjuration and divination spells\n\u2022 New Moon: Enchantment and necromancy spells\n\u2022 Crescent Moon: Illusion and transmutation spells\nWhenever you use Metamagic on a spell of a school of magic associated with your current Lunar Embodiment phase, you can reduce the sorcery points spent by 1 (minimum 0). You can reduce the sorcery points spent for your Metamagic a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 6,
          "name": "Waxing and Waning",
          "desc": "6th-Level Lunar Sorcery Feature\nYou gain greater control over the phases of your lunar magic. As a bonus action, you can spend 1 sorcery point to change your current Lunar Embodiment phase to a different one.\nYou can now cast one 1st-level spell from each lunar phase of the Lunar Spells table once without expending a spell slot, provided your current phase is the same as the lunar phase spell. Once you cast a lunar phase spell in this way, you can't do so again until you finish a long rest."
        },
        {
          "level": 14,
          "name": "Lunar Empowerment",
          "desc": "14th-Level Lunar Sorcery Feature\nThe power of a lunar phase saturates your being. While you are in a Lunar Embodiment phase, you also gain the following benefit associated with that phase:\n\u2022 Full Moon: You can use a bonus action to shed bright light in a 10-foot radius and dim light for an additional 10 feet or to douse the light. In addition, you and creatures of your choice have advantage on Intelligence (Investigation) and Wisdom (Perception) checks while within the bright light you shed.\n\u2022 New Moon: You have advantage on Dexterity (Stealth) checks. In addition, while you are entirely in darkness, attack rolls have disadvantage against you.\n\u2022 Crescent Moon: You have resistance to necrotic and radiant damage."
        },
        {
          "level": 18,
          "name": "Lunar Phenomenon",
          "desc": "18th-Level Lunar Sorcery feature\nAs a bonus action, you can tap into a special power of your current Lunar Embodiment phase. Alternatively, as part of the bonus action you take to change your lunar phase using the Waxing and Waning feature, you can immediately use the power of the lunar phase you are entering:\n\u2022 Full Moon: You radiate moonlight for a moment. Each creature of your choice within 30 feet of you must succeed on a Constitution saving throw against your spell save DC or be blinded until the end of its next turn. In addition, one creature of your choice in that area regains 3d8 hit points.\n\u2022 New Moon: You momentarily emanate gloom. Each creature of your choice within 30 feet of you must succeed on a Dexterity saving throw against your spell save DC or take 3d10 necrotic damage and have its speed reduced to 0 until the end of its next turn. In addition, you become invisible until the end of your next turn, or until immediately after you make an attack roll or cast a spell.\n\u2022 Crescent Moon: You can magically teleport to an unoccupied space you can see within 60 feet of yourself. You can bring along one willing creature you can see within 5 feet of yourself. That creature teleports to an unoccupied space of your choice that you can see within 5 feet of your destination space. In addition, you and that creature gain resistance to all damage until the start of your next turn.\nOnce you use one of these bonus action benefits, you can't use that benefit again until you finish a long rest, unless you spend 5 sorcery points to use it again."
        }
      ]
    },
    "Pyromancer (PSK)": {
      "features": [
        {
          "level": 1,
          "name": "Heart of Fire",
          "desc": "At 1st level, whenever you start casting a spell of 1st level or higher that deals fire damage, fiery magic erupts from you. This eruption causes creatures of your choice that you can see within 10 feet of you to take fire damage equal to half your sorcerer level (minimum of 1)."
        },
        {
          "level": 1,
          "name": "Pyromancer (PSK)",
          "desc": "Your innate magic manifests in fire. You are your fire, and your fire is you."
        },
        {
          "level": 6,
          "name": "Fire in the Veins",
          "desc": "At 6th level, you gain resistance to fire damage. In addition, spells you cast ignore resistance to fire damage."
        },
        {
          "level": 14,
          "name": "Pyromancer's Fury",
          "desc": "Starting at 14th level, when you are hit by a melee attack, you can use your reaction to deal fire damage to the attacker. The damage equals your sorcerer level, and ignores resistance to fire damage."
        },
        {
          "level": 18,
          "name": "Fiery Soul",
          "desc": "At 18th level, you gain immunity to fire damage. In addition, any spell or effect you create ignores resistance to fire damage and treats immunity to fire damage as resistance to fire damage."
        }
      ]
    },
    "Shadow Magic": {
      "features": [
        {
          "level": 1,
          "name": "Eyes of the Dark",
          "desc": "Starting at 1st level, you have darkvision with a range of 120 feet.\nWhen you reach 3rd level in this class, you learn the Darkness spell, which doesn't count against your number of sorcerer spells known. In addition, you can cast it by spending 2 sorcery points or by expending a spell slot. If you cast it with sorcery points, you can see through the Darkness created by the spell."
        },
        {
          "level": 1,
          "name": "Shadow Magic",
          "desc": "You are a creature of shadow, for your innate magic comes from the Shadowfell itself. You might trace your lineage to an entity from that place, or perhaps you were exposed to its fell energy and transformed by it.\nThe power of shadow magic casts a strange pall over your physical presence. The spark of life that sustains you is muffled, as if it struggles to remain viable against the dark energy that imbues your soul. At your option, you can pick from or roll on the Shadow Sorcerer Quirks table to create a quirk for your character.\nd6 | Quirk\n1 \u2014 You are always icy cold to the touch.\n2 \u2014 When you are asleep, you don't appear to breathe (though you must still breathe to survive).\n3 \u2014 You barely bleed, even when badly injured.\n4 \u2014 Your heart beats once per minute. This event sometimes surprises you.\n5 \u2014 You have trouble remembering that living creatures and corpses should be treated differently.\n6 \u2014 You blinked. Once. Last week."
        },
        {
          "level": 1,
          "name": "Strength of the Grave",
          "desc": "Starting at 1st level, your existence in a twilight state between life and death makes you difficult to defeat. When damage reduces you to 0 hit points, you can make a Charisma saving throw (DC 5 + the damage taken). On a success, you instead drop to 1 hit point. You can't use this feature if you are reduced to 0 hit points by radiant damage or by a critical hit.\nAfter the saving throw succeeds, you can't use this feature again until you finish a long rest."
        },
        {
          "level": 3,
          "name": "Power of Shadow",
          "desc": "You gain the following benefits.\nEyes of the Dark: You have Darkvision with a range of 120 feet and Blindsight with a range of 10 feet. In addition, if a spell you cast creates an area of Darkness, you can see normally through that spell's Darkness.\nStrength of the Grave: If you would drop to 0 Hit Points and not die outright, you can make a Charisma saving throw (DC 5 plus the damage taken). On a successful save, your Hit Points instead change to a number equal to your Charisma modifier plus your Sorcerer level. After you succeed on this save, you can't use this benefit again until you finish a Long Rest."
        },
        {
          "level": 3,
          "name": "Shadow Sorcery",
          "desc": "Bend Doom and Darkness to Your Will\nYour innate magic comes from the most nebulous and inscrutable forces of the Shadowfell or from other regions of supernatural darkness. You might trace your lineage to an entity from such a place, or perhaps you were exposed to the sinister energy of a shadow dragon and were transformed by it. Your shadowy magic allows you to command darkness, undeath, and woe."
        },
        {
          "level": 3,
          "name": "Shadow Spells",
          "desc": "When you reach a Sorcerer level specified in the Shadow Spells table, you thereafter always have the listed spells prepared.\nSorcerer Level | Spells\n3 \u2014 Bane, Darkness, Inflict Wounds, Pass Without Trace\n5 \u2014 Hunger Of Hadar, Nondetection\n7 \u2014 Greater Invisibility, Phantasmal Killer\n9 \u2014 Contagion, Creation"
        },
        {
          "level": 6,
          "name": "Beasts of Ill Omen",
          "desc": "You can call forth a howling creature of shadow to hound your foes. You can spend 3 Sorcery Points to cast Summon Beast as a Bonus Action without expending a spell slot, without preparing the spell, and without Material components. The summoned creature appears as a beast made of shadow, and enemies within 5 feet of the summoned creature have Disadvantage on saving throws against spells you cast.\nWhenever you cast the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting, and the spell ends early if you cast the spell again."
        },
        {
          "level": 6,
          "name": "Hound of Ill Omen",
          "desc": "At 6th level, you gain the ability to call forth a howling creature of darkness to harass your foes. As a bonus action, you can spend 3 sorcery points to magically summon a hound of ill omen to target one creature you can see within 120 feet of you. The hound uses the dire wolf's statistics (see the Monster Manual or appendix C in the Player's Handbook), with the following changes:\n\u2022 The hound is size Medium, not Large, and it counts as a monstrosity, not a beast.\n\u2022 It appears with a number of temporary hit points equal to half your sorcerer level.\n\u2022 It can move through other creatures and objects as if they were difficult terrain. The hound takes 5 force damage if it ends its turn inside an object.\n\u2022 At the start of its turn, the hound automatically knows its target's location. If the target was hidden, it is no longer hidden from the hound.\nThe hound appears in an unoccupied space of your choice within 30 feet of the target. Roll initiative for the hound. On its turn, it can move only toward its target by the most direct route, and it can use its action only to attack its target. The hound can make opportunity attacks, but only against its target. Additionally, while the hound is within 5 feet of the target, the target has disadvantage on saving throws against any spell you cast. The hound disappears if it is reduced to 0 hit points, if its target is reduced to 0 hit points, or after 5 minutes."
        },
        {
          "level": 14,
          "name": "Shadow Walk",
          "desc": "At 14th level, you gain the ability to step from one shadow into another. When you are in dim light or darkness, as a bonus action, you can magically teleport up to 120 feet to an unoccupied space you can see that is also in dim light or darkness."
        },
        {
          "level": 14,
          "name": "Shadow Walk",
          "desc": "While you are in Dim Light or Darkness, you can take a Bonus Action to teleport up to 120 feet to an unoccupied space you can see that is also in Dim Light or Darkness."
        },
        {
          "level": 18,
          "name": "Umbral Form",
          "desc": "Starting at 18th level, you can spend 6 sorcery points as a bonus action to magically transform yourself into a shadowy form. In this form, you have resistance to all damage except force and radiant damage, and you can move through other creatures and objects as if they were difficult terrain. You take 5 force damage if you end your turn inside an object.\nYou remain in this form for 1 minute. It ends early if you are incapacitated, if you die, or if you dismiss it as a bonus action."
        },
        {
          "level": 18,
          "name": "Umbral Form",
          "desc": "When you use Innate Sorcery, you can adopt a shadowy form, gaining the benefits below while your Innate Sorcery is active or until you end the form (no action required). Once you use this feature, you can't use it again until you finish a Long Rest unless you spend 6 Sorcery Points (no action required) to restore your use of it.\nIncorporeal Movement: You can move through creatures and objects as if they were Difficult Terrain, but you take 1d10 Force damage if you end your turn inside a creature or an object.\nShadow Resilience: You have Resistance to all damage except Force and Radiant damage."
        }
      ]
    },
    "Spellfire Sorcery": {
      "features": [
        {
          "level": 3,
          "name": "Bolstering Flames",
          "desc": "You or one creature you can see within 30 feet of yourself gains Temporary Hit Points equal to 1d4 plus your Charisma modifier."
        },
        {
          "level": 3,
          "name": "Radiant Fire",
          "desc": "One creature you can see within 30 feet of yourself takes 1d4 Fire or Radiant damage (your choice)."
        },
        {
          "level": 3,
          "name": "Spellfire Burst",
          "desc": "When you spend at least 1 Sorcery Point as part of the Magic action or a Bonus Action on your turn, you can unleash one of the following magical effects of your choice. You can do so only once per turn."
        },
        {
          "level": 3,
          "name": "Spellfire Sorcery",
          "desc": "Wield Raw Magic\nYour innate power stems from the source of magic itself: the Weave. This connection manifests as a rare ability known as spellfire, and you surge with radiant bursts of this raw magic. Your talent with spellfire allows you to heal allies, sear enemies, and absorb powerful spells.\nWielders of spellfire tend to have a penchant for wandering. Many travel between cosmopolitan settlements, such as those along the Sword Coast, and wield their magic in service of the common good. Others realize their own strange powers by roaming equally strange lands, from the magic-blasted wastes of the desert of Anauroch to the god-touched wilds of the Old Empires. Wherever they go in the Realms, spellfire Sorcerers are courted by factions with interests in the arcane arts, such as the Harpers, Cult of the Dragon, and Red Wizards."
        },
        {
          "level": 3,
          "name": "Spellfire Spells",
          "desc": "When you reach a Sorcerer level specified in the Spellfire Spells table, you thereafter always have the listed spells prepared.\nSorcerer Level | Spells\n3 \u2014 Cure Wounds, Guiding Bolt, Lesser Restoration, Scorching Ray\n5 \u2014 Aura Of Vitality, Dispel Magic\n7 \u2014 Fire Shield, Wall Of Fire\n9 \u2014 Greater Restoration, Flame Strike"
        },
        {
          "level": 6,
          "name": "Absorb Spells",
          "desc": "You always have Counterspell prepared.\nAdditionally, whenever a target fails the saving throw against a Counterspell you cast, you regain 1d4 Sorcery Points."
        },
        {
          "level": 14,
          "name": "Honed Spellfire",
          "desc": "Your Spellfire Burst improves. You add your Sorcerer level to the Temporary Hit Points gained from Bolstering Flames, and the damage of Radiant Fire increases to 1d8."
        },
        {
          "level": 18,
          "name": "Crown of Spellfire",
          "desc": "When you use Innate Sorcery, you can alter it and infuse yourself with the essence of spellfire, gaining the following benefits while this use of Innate Sorcery is active. Once you use this feature to alter Innate Sorcery, you can't use it again until you finish a Long Rest unless you spend 5 Sorcery Points (no action required) to restore your use of it.\nBurning Life Force: Once per turn when you are hit by an attack roll, you can expend a number of Hit Point Dice, up to a maximum equal to your Charisma modifier (minimum of one). Roll the expended dice, and reduce the amount of damage from that attack equal to the total rolled.\nFlight: You gain a Fly Speed of 60 feet and can hover.\nSpell Avoidance: When you're subjected to a spell or magical effect that allows you to make a saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You can't use this benefit if you have the Incapacitated condition."
        }
      ]
    },
    "Storm Sorcery": {
      "features": [
        {
          "level": 1,
          "name": "Storm Sorcery",
          "desc": "Your innate magic comes from the power of elemental air. Many with this power can trace their magic back to a near-death experience caused by the Great Rain, but perhaps you were born during a howling gale so powerful that folk still tell stories of it, or your lineage might include the influence of potent air creatures such as djinn. Whatever the case, the magic of the storm permeates your being.\nStorm sorcerers are invaluable members of a ship's crew. Their magic allows them to exert control over wind and weather in their immediate area. Their abilities also prove useful in repelling attacks by sahuagin, pirates, and other waterborne threats."
        },
        {
          "level": 1,
          "name": "Tempestuous Magic",
          "desc": "Starting at 1st level, you can use a bonus action on your turn to cause whirling gusts of elemental air to briefly surround you, immediately before or after you cast a spell of 1st level or higher. Doing so allows you to fly up to 10 feet without provoking opportunity attacks."
        },
        {
          "level": 1,
          "name": "Wind Speaker",
          "desc": "The arcane magic you command is infused with elemental air. You can speak, read, and write Primordial. Knowing this language allows you to understand and be understood by those who speak its dialects: Aquan, Auran, Ignan, and Terran."
        },
        {
          "level": 6,
          "name": "Heart of the Storm",
          "desc": "At 6th level, you gain resistance to lightning and thunder damage. In addition, whenever you start casting a spell of 1st level or higher that deals lightning or thunder damage, stormy magic erupts from you. This eruption causes creatures of your choice that you can see within 10 feet of you to take lightning or thunder damage (choose each time this ability activates) equal to half your sorcerer level."
        },
        {
          "level": 6,
          "name": "Storm Guide",
          "desc": "At 6th level, you gain the ability to subtly control the weather around you.\nIf it is raining, you can use an action to cause the rain to stop falling in a 20-foot-radius sphere centered on you. You can end this effect as a bonus action.\nIf it is windy, you can use a bonus action each round to choose the direction that the wind blows in a 100-foot-radius sphere centered on you. The wind blows in that direction until the end of your next turn. This feature doesn't alter the speed of the wind."
        },
        {
          "level": 14,
          "name": "Storm's Fury",
          "desc": "Starting at 14th level, when you are hit by a melee attack, you can use your reaction to deal lightning damage to the attacker. The damage equals your sorcerer level. The attacker must also make a Strength saving throw against your sorcerer spell save DC. On a failed save, the attacker is pushed in a straight line up to 20 feet away from you."
        },
        {
          "level": 18,
          "name": "Wind Soul",
          "desc": "At 18th level, you gain immunity to lightning and thunder damage.\nYou also gain a magical flying speed of 60 feet. As an action, you can reduce your flying speed to 30 feet for 1 hour and choose a number of creatures within 30 feet of you equal to 3 + your Charisma modifier. The chosen creatures gain a magical flying speed of 30 feet for 1 hour. Once you reduce your flying speed in this way, you can't do so again until you finish a short or long rest."
        }
      ]
    },
    "Wild Magic": {
      "features": [
        {
          "level": 1,
          "name": "Tides of Chaos",
          "desc": "Starting at 1st level, you can manipulate the forces of chance and chaos to gain advantage on one attack roll, ability check, or saving throw. Once you do so, you must finish a long rest before you can use this feature again.\nAny time before you regain the use of this feature, the DM can have you roll on the Wild Magic Surge table immediately after you cast a sorcerer spell of 1st level or higher. You then regain the use of this feature."
        },
        {
          "level": 1,
          "name": "Wild Magic",
          "desc": "Your innate magic comes from the wild forces of chaos that underlie the order of creation. You might have endured exposure to some form of raw magic, perhaps through a planar portal leading to Limbo, the Elemental Planes, or the mysterious Far Realm. Perhaps you were blessed by a powerful fey creature or marked by a demon. Or your magic could be a fluke of your birth, with no apparent cause or reason. However it came to be, this chaotic magic churns within you, waiting for any outlet."
        },
        {
          "level": 1,
          "name": "Wild Magic Surge",
          "desc": "Starting when you choose this origin at 1st level, your spellcasting can unleash surges of untamed magic. Immediately after you cast a sorcerer spell of 1st level or higher, the DM can have you roll a d20. If you roll a 1, roll on the Wild Magic Surge table to create a random magical effect. A Wild Magic Surge can happen once per turn.\nIf a Wild Magic effect is a spell, it's too wild to be affected by Metamagic. If it normally requires concentration, it doesn't require concentration in this case; the spell lasts for its full duration.\nd100 | Effect\n01-02 \u2014 Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.\n03-04 \u2014 For the next minute, you can see any invisible creature if you have line of sight to it.\n05-06 \u2014 A modron chosen and controlled by the DM appears in an unoccupied space within 5 feet of you, then disappears 1 minute later.\n07-08 \u2014 You cast Fireball as a 3rd-level spell centered on yourself.\n09-10 \u2014 You cast Magic Missile as a 5th-level spell.\n11-12 \u2014 Roll a d10. Your height changes by a number of inches equal to the roll. If the roll is odd, you shrink. If the roll is even, you grow.\n13-14 \u2014 You cast Confusion centered on yourself.\n15-16 \u2014 For the next minute, you regain 5 hit points at the start of each of your turns.\n17-18 \u2014 You grow a long beard made of feathers that remains until you sneeze, at which point the feathers explode out from your face.\n19-20 \u2014 You cast Grease centered on yourself.\n21-22 \u2014 Creatures have disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.\n23-24 \u2014 Your skin turns a vibrant shade of blue. A Remove Curse spell can end this effect.\n25-26 \u2014 An eye appears on your forehead for the next minute. During that time, you have advantage on Wisdom (Perception) checks that rely on sight.\n27-28 \u2014 For the next minute, all your spells with a casting time of 1 action have a casting time of 1 bonus action.\n29-30 \u2014 You teleport up to 60 feet to an unoccupied space of your choice that you can see.\n31-32 \u2014 You are transported to the Astral Plane until the end of your next turn, after which time you return to the space you previously occupied or the nearest unoccupied space if that space is occupied.\n33-34 \u2014 Maximize the damage of the next damaging spell you cast within the next minute.\n35-36 \u2014 Roll a d10. Your age changes by a number of years equal to the roll. If the roll is odd, you get younger (minimum 1 year old). If the roll is even, you get older.\n37-38 \u2014 1d6 flumphs controlled by the DM appear in unoccupied spaces within 60 feet of you and are frightened of you. They vanish after 1 minute.\n39-40 \u2014 You regain 2d10 hit points.\n41-42 \u2014 You turn into a potted plant until the start of your next turn. While a plant, you are incapacitated and have vulnerability to all damage. If you drop to 0 hit points, your pot breaks, and your form reverts.\n43-44 \u2014 For the next minute, you can teleport up to 20 feet as a bonus action on each of your turns.\n45-46 \u2014 You cast Levitate on yourself.\n47-48 \u2014 A unicorn controlled by the DM appears in a space within 5 feet of you, then disappears 1 minute later.\n49-50 \u2014 You can't speak for the next minute. Whenever you try, pink bubbles float out of your mouth.\n51-52 \u2014 A spectral shield hovers near you for the next minute, granting you a +2 bonus to AC and immunity to Magic Missile.\n53-54 \u2014 You are immune to being intoxicated by alcohol for the next 5d6 days.\n55-56 \u2014 Your hair falls out but grows back within 24 hours.\n57-58 \u2014 For the next minute, any flammable object you touch that isn't being worn or carried by another creature bursts into flame.\n59-60 \u2014 You regain your lowest-level expended spell slot.\n61-62 \u2014 For the next minute, you must shout when you speak.\n63-64 \u2014 You cast Fog Cloud centered on yourself.\n65-66 \u2014 Up to three creatures you choose within 30 feet of you take 4d10 lightning damage.\n67-68 \u2014 You are frightened by the nearest creature until the end of your next turn.\n69-70 \u2014 Each creature within 30 feet of you becomes invisible for the next minute. The invisibility ends on a creature when it attacks or casts a spell.\n71-72 \u2014 You gain resistance to all damage for the next minute.\n73-74 \u2014 A random creature within 60 feet of you becomes poisoned for 1d4 hours.\n75-76 \u2014 You glow with bright light in a 30-foot radius for the next minute. Any creature that ends its turn within 5 feet of you is blinded until the end of its next turn.\n77-78 \u2014 You cast Polymorph on yourself. If you fail the saving throw, you turn into a sheep for the spell's duration.\n79-80 \u2014 Illusory butterflies and flower petals flutter in the air within 10 feet of you for the next minute.\n81-82 \u2014 You can take one additional action immediately.\n83-84 \u2014 Each creature within 30 feet of you takes 1d10 necrotic damage. You regain hit points equal to the sum of the necrotic damage dealt.\n85-86 \u2014 You cast Mirror Image.\n87-88 \u2014 You cast Fly on a random creature within 60 feet of you.\n89-90 \u2014 You become invisible for the next minute. During that time, other creatures can't hear you. The invisibility ends if you attack or cast a spell.\n91-92 \u2014 If you die within the next minute, you immediately come back to life as if by the Reincarnate spell.\n93-94 \u2014 Your size increases by one size category for the next minute.\n95-96 \u2014 You and all creatures within 30 feet of you gain vulnerability to piercing damage for the next minute.\n97-98 \u2014 You are surrounded by faint, ethereal music for the next minute.\n99-00 \u2014 You regain all expended sorcery points."
        },
        {
          "level": 6,
          "name": "Bend Luck",
          "desc": "Starting at 6th level, you have the ability to twist fate using your wild magic. When another creature you can see makes an attack roll, an ability check, or a saving throw, you can use your reaction and spend 2 sorcery points to roll 1d4 and apply the number rolled as a bonus or penalty (your choice) to the creature's roll. You can do so after the creature rolls but before any effects of the roll occur."
        },
        {
          "level": 14,
          "name": "Controlled Chaos",
          "desc": "At 14th level, you gain a modicum of control over the surges of your wild magic. Whenever you roll on the Wild Magic Surge table, you can roll twice and use either number."
        },
        {
          "level": 18,
          "name": "Spell Bombardment",
          "desc": "Beginning at 18th level, the harmful energy of your spells intensifies. When you roll damage for a spell and roll the highest number possible on any of the dice, choose one of those dice, roll it again and add that roll to the damage. You can use the feature only once per turn."
        }
      ]
    },
    "Wild Magic Sorcery": {
      "features": [
        {
          "level": 3,
          "name": "Tides of Chaos",
          "desc": "You can manipulate chaos itself to give yourself Advantage on one D20 Test before you roll the d20. Once you do so, you must cast a Sorcerer spell with a spell slot or finish a Long Rest before you can use this feature again.\nIf you do cast a Sorcerer spell with a spell slot before you finish a Long Rest, you automatically roll on the Wild Magic Surge table."
        },
        {
          "level": 3,
          "name": "Wild Magic Sorcery",
          "desc": "Unleash Chaotic Magic\nYour innate magic stems from the forces of chaos that underlie the order of creation. You or an ancestor might have endured exposure to raw magic, perhaps through a planar portal leading to Limbo or the Elemental Planes. Perhaps you were blessed by a fey being or marked by a demon. Or your magic could be a fluke with no apparent cause. Whatever its source, this magic churns within you, waiting for any outlet."
        },
        {
          "level": 3,
          "name": "Wild Magic Surge",
          "desc": "Your spellcasting can unleash surges of untamed magic. Once per turn, you can roll 1d20 immediately after you cast a Sorcerer spell with a spell slot. If you roll a 20, roll on the Wild Magic Surge table to create a magical effect.\nIf the magical effect is a spell, it is too wild to be affected by your Metamagic.\n1d100 | Effect\n01\u201304 \u2014 Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.\n05\u201308 \u2014 A creature that is Friendly toward you appears in a random unoccupied space within 60 feet of you. The creature is under the DM's control and disappears 1 minute later. Roll 1d4 to determine the creature: on a 1, a Modron Duodrone appears; on a 2, a Flumph appears; on a 3, a Modron Monodrone appears; on a 4, a Unicorn appears. See the Monster Manual for the creature's stat block.\n09\u201312 \u2014 For the next minute, you regain 5 Hit Points at the start of each of your turns.\n13\u201316 \u2014 Creatures have Disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.\n17\u201320 \u2014 You are subjected to an effect that lasts for 1 minute unless its description says otherwise. Roll 1d8 to determine the effect: on a 1, you're surrounded by faint, ethereal music only you and creatures within 5 feet of you can hear; on a 2, your size increases by one size category; on a 3, you grow a long beard made of feathers that remains until you sneeze, at which point the feathers explode from your face and vanish; on a 4, you must shout when you speak; on a 5, illusory butterflies flutter in the air within 10 feet of you; on a 6, an eye appears on your forehead, granting you Advantage on Wisdom (Perception) checks; on a 7, pink bubbles float out of your mouth whenever you speak; on an 8, your skin turns a vibrant shade of blue for 24 hours or until the effect is ended by a Remove Curse spell.\n21\u201324 \u2014 For the next minute, all your spells with a casting time of an action have a casting time of a Bonus Action.\n25\u201328 \u2014 You are transported to the Astral Plane until the end of your next turn. You then return to the space you previously occupied or the nearest unoccupied space if that space is occupied.\n29\u201332 \u2014 The next time you cast a spell that deals damage within the next minute, don't roll the spell's damage dice for the damage. Instead use the highest number possible for each damage die.\n33\u201336 \u2014 You have Resistance to all damage for the next minute.\n37\u201340 \u2014 You turn into a potted plant until the start of your next turn. While you're a plant, you have the Incapacitated condition and have Vulnerability to all damage. If you drop to 0 Hit Points, your pot breaks, and your form reverts.\n41\u201344 \u2014 For the next minute, you can teleport up to 20 feet as a Bonus Action on each of your turns.\n45\u201348 \u2014 You and up to three creatures you choose within 30 feet of you have the Invisible condition for 1 minute. This invisibility ends on a creature immediately after it makes an attack roll, deals damage, or casts a spell.\n49\u201352 \u2014 A spectral shield hovers near you for the next minute, granting you a +2 bonus to AC and immunity to Magic Missile.\n53\u201356 \u2014 You can take one extra action on this turn.\n57\u201360 \u2014 You cast a random spell. If the spell normally requires Concentration, it doesn't require Concentration in this case; the spell lasts for its full duration. Roll 1d10 to determine the spell: on a 1, Confusion; on a 2, Fireball; on a 3, Fog Cloud; on a 4, Fly (cast on a random creature within 60 feet of you), on a 5, Grease; on a 6, Levitate (cast on yourself); on a 7, Magic Missile (cast as a level 5 spell); on an 8, Mirror Image; on a 9, Polymorph (cast on yourself), and if you fail the saving throw, you turn into a Goat (see appendix B); on a 10, See Invisibility.\n61\u201364 \u2014 For the next minute, any flammable, nonmagical object you touch that isn't being worn or carried by another creature bursts into flame, takes 1d4 Fire damage, and is burning.\n65\u201368 \u2014 If you die within the next hour, you immediately revive as if by the Reincarnate spell.\n69\u201372 \u2014 You have the Frightened condition until the end of your next turn. The DM determines the source of your fear.\n73\u201376 \u2014 You teleport up to 60 feet to an unoccupied space you can see.\n77\u201380 \u2014 A random creature within 60 feet of you has the Poisoned condition for 1d4 hours.\n81\u201384 \u2014 You radiate Bright Light in a 30-foot radius for the next minute. Any creature that ends its turn within 5 feet of you has the Blinded condition until the end of its next turn.\n85\u201388 \u2014 Up to three creatures of your choice that you can see within 30 feet of you take 1d10 Necrotic damage. You regain Hit Points equal to the sum of the Necrotic damage dealt.\n89\u201392 \u2014 Up to three creatures of your choice that you can see within 30 feet of you take 4d10 Lightning damage.\n93\u201396 \u2014 You and all creatures within 30 feet of you have Vulnerability to Piercing damage for the next minute.\n97\u201300 \u2014 Roll 1d6. On a 1, you regain 2d10 Hit Points; on a 2, one ally of your choice within 300 feet of you regains 2d10 Hit Points; on a 3, you regain your lowest-level expended spell slot; on a 4, one ally of your choice within 300 feet of you regains their lowest-level expended spell slot; on a 5, you regain all your expended Sorcery Points; on a 6, all the effects of row 17\u201320 affect you simultaneously."
        },
        {
          "level": 6,
          "name": "Bend Luck",
          "desc": "You have the ability to twist fate using your wild magic. Immediately after another creature you can see rolls the d20 for a D20 Test, you can take a Reaction and spend 1 Sorcery Point to roll 1d4 and apply the number rolled as a bonus or penalty (your choice) to the d20 roll."
        },
        {
          "level": 14,
          "name": "Controlled Chaos",
          "desc": "You gain a modicum of control over the surges of your wild magic. Whenever you roll on the Wild Magic Surge table, you can roll twice and use either number."
        },
        {
          "level": 18,
          "name": "Tamed Surge",
          "desc": "Immediately after you cast a Sorcerer spell with a spell slot, you can create an effect of your choice from the Wild Magic Surge table instead of rolling on that table. You can choose any effect in the table except for the final row, and if the chosen effect involves a roll, you must make it.\nOnce you use this feature, you can't do so again until you finish a Long Rest."
        }
      ]
    }
  },
  "Warlock": {
    "The Archfey": {
      "features": [
        {
          "level": 1,
          "name": "Fey Presence",
          "desc": "Starting at 1st level, your patron bestows upon you the ability to project the beguiling and fearsome presence of the fey. As an action, you can cause each creature in a 10-foot cube originating from you to make a Wisdom saving throw against your warlock spell save DC. The creatures that fail their saving throws are all charmed or frightened by you (your choice) until the end of your next turn.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 1,
          "name": "The Archfey",
          "desc": "Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born. This being's motivations are often inscrutable, and sometimes whimsical, and might involve a striving for greater magical power or the settling of age-old grudges. Beings of this sort include the Prince of Frost; the Queen of Air and Darkness, ruler of the Gloaming Court; Titania of the Summer Court; her consort Oberon, the Green Lord; Hyrsam, the Prince of Fools; and ancient hags.\nExpanded Spell List: The Archfey lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Faerie Fire, Sleep 2nd \u2014 Calm Emotions, Phantasmal Force 3rd \u2014 Blink, Plant Growth 4th \u2014 Dominate Beast, Greater Invisibility 5th \u2014 Dominate Person, Seeming"
        },
        {
          "level": 3,
          "name": "Archfey Patron",
          "desc": "Bargain with Whimsical Fey\nYour pact draws on the power of the Feywild. When you choose this subclass, you might make a deal with an archfey, such as the Prince of Frost; the Queen of Air and Darkness, ruler of the Gloaming Court; Titania of the Summer Court; or an ancient hag. Or you might call on a spectrum of Fey, weaving a web of favors and debts. Whoever they are, your patron is often inscrutable and whimsical."
        },
        {
          "level": 3,
          "name": "Archfey Spells",
          "desc": "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Archfey Spells table, you thereafter always have the listed spells prepared.\nWarlock Level | Spells\n3 \u2014 Calm Emotions, Faerie Fire, Misty Step, Phantasmal Force, Sleep\n5 \u2014 Blink, Plant Growth\n7 \u2014 Dominate Beast, Greater Invisibility\n9 \u2014 Dominate Person, Seeming"
        },
        {
          "level": 3,
          "name": "Steps of the Fey",
          "desc": "Your patron grants you the ability to move between the boundaries of the planes. You can cast Misty Step without expending a spell slot a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nIn addition, whenever you cast that spell, you can choose one of the following additional effects.\nRefreshing Step: Immediately after you teleport, you or one creature you can see within 10 feet of yourself gains 1d10 Temporary Hit Points.\nTaunting Step: Creatures within 5 feet of the space you left must succeed on a Wisdom saving throw against your spell save DC or have Disadvantage on attack rolls against creatures other than you until the start of your next turn."
        },
        {
          "level": 6,
          "name": "Misty Escape",
          "desc": "Starting at 6th level, you can vanish in a puff of mist in response to harm. When you take damage, you can use your reaction to turn invisible and teleport up to 60 feet to an unoccupied space you can see. You remain invisible until the start of your next turn or until you attack or cast a spell.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 6,
          "name": "Misty Escape",
          "desc": "You can cast Misty Step as a Reaction in response to taking damage.\nIn addition, the following effects are now among your Steps of the Fey options.\nDisappearing Step: You have the Invisible condition until the start of your next turn or until immediately after you make an attack roll, deal damage, or cast a spell.\nDreadful Step: Creatures within 5 feet of the space you left or the space you appear in (your choice) must succeed on a Wisdom saving throw against your spell save DC or take 2d10 Psychic damage."
        },
        {
          "level": 10,
          "name": "Beguiling Defenses",
          "desc": "Beginning at 10th level, your patron teaches you how to turn the mind-affecting magic of your enemies against them. You are immune to being charmed, and when another creature attempts to charm you, you can use your reaction to attempt to turn the charm back on that creature. The creature must succeed on a Wisdom saving throw against your warlock spell save DC or be charmed by you for 1 minute or until the creature takes any damage."
        },
        {
          "level": 10,
          "name": "Beguiling Defenses",
          "desc": "Your patron teaches you how to guard your mind and body. You are immune to the Charmed condition.\nIn addition, immediately after a creature you can see hits you with an attack roll, you can take a Reaction to reduce the damage you take by half (round down), and you can force the attacker to make a Wisdom saving throw against your spell save DC. On a failed save, the attacker takes Psychic damage equal to the damage you take. Once you use this Reaction, you can't use it again until you finish a Long Rest unless you expend a Pact Magic spell slot (no action required) to restore your use of it."
        },
        {
          "level": 14,
          "name": "Bewitching Magic",
          "desc": "Your patron grants you the ability to weave your magic with teleportation. Immediately after you cast an Enchantment or Illusion spell using an action and a spell slot, you can cast Misty Step as part of the same action and without expending a spell slot."
        },
        {
          "level": 14,
          "name": "Dark Delirium",
          "desc": "Starting at 14th level, you can plunge a creature into an illusory realm. As an action, choose a creature that you can see within 60 feet of you. It must make a Wisdom saving throw against your warlock spell save DC. On a failed save, it is charmed or frightened by you (your choice) for 1 minute or until your concentration is broken (as if you are concentrating on a spell). This effect ends early if the creature takes any damage.\nUntil this illusion ends, the creature thinks it is lost in a misty realm, the appearance of which you choose. The creature can see and hear only itself, you, and the illusion.\nYou must finish a short or long rest before you can use this feature again."
        }
      ]
    },
    "The Celestial": {
      "features": [
        {
          "level": 1,
          "name": "Bonus Cantrips",
          "desc": "At 1st level, you learn the Sacred Flame and Light cantrips. They count as warlock cantrips for you, but they don't count against your number of cantrips known."
        },
        {
          "level": 1,
          "name": "Healing Light",
          "desc": "At 1st level, you gain the ability to channel celestial energy to heal wounds. You have a pool of d6s that you spend to fuel this healing. The number of dice in the pool equals 1 + your warlock level.\nAs a bonus action, you can heal one creature you can see within 60 feet of you, spending dice from the pool. The maximum number of dice you can spend at once equals your Charisma modifier (minimum of one die). Roll the dice you spend, add them together, and restore a number of hit points equal to the total.\nYour pool regains all expended dice when you finish a long rest."
        },
        {
          "level": 1,
          "name": "The Celestial",
          "desc": "Your patron is a powerful being of the Upper Planes. You have bound yourself to an ancient empyrean, solar, ki-rin, unicorn, or other entity that resides in the planes of everlasting bliss. Your pact with that being allows you to experience the barest touch of the holy light that illuminates the multiverse.\nBeing connected to such power can cause changes in your behavior and beliefs. You might find yourself driven to annihilate the undead, to defeat fiends, and to protect the innocent. At times, your heart might also be filled with a longing for the celestial realm of your patron, and a desire to wander that paradise for the rest of your days. But you know that your mission is among mortals for now, and that your pact binds you to bring light to the dark places of the world.\nExpanded Spell List: The Celestial lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Cure Wounds, Guiding Bolt 2nd \u2014 Flaming Sphere, Lesser Restoration 3rd \u2014 Daylight, Revivify 4th \u2014 Guardian Of Faith, Wall Of Fire 5th \u2014 Flame Strike, Greater Restoration"
        },
        {
          "level": 3,
          "name": "Celestial Patron",
          "desc": "Call on the Power of the Heavens\nYour pact draws on the Upper Planes, the realms of everlasting bliss. You might enter an agreement with an empyrean, a couatl, a sphinx, a unicorn, or another heavenly entity. Or you might call on numerous such beings as you pursue goals aligned with theirs. Your pact allows you to experience a hint of the holy light that illuminates the multiverse."
        },
        {
          "level": 3,
          "name": "Celestial Spells",
          "desc": "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Celestial Spells table, you thereafter always have the listed spells prepared.\nWarlock Level | Spells\n3 \u2014 Aid, Cure Wounds, Guiding Bolt, Lesser Restoration, Light, Sacred Flame\n5 \u2014 Daylight, Revivify\n7 \u2014 Guardian Of Faith, Wall Of Fire\n9 \u2014 Greater Restoration, Summon Celestial"
        },
        {
          "level": 3,
          "name": "Healing Light",
          "desc": "You gain the ability to channel celestial energy to heal wounds. You have a pool of d6s to fuel this healing. The number of dice in the pool equals 1 plus your Warlock level.\nAs a Bonus Action, you can heal yourself or one creature you can see within 60 feet of yourself, expending dice from the pool. The maximum number of dice you can expend at once equals your Charisma modifier (minimum of one die). Roll the dice you expend, and restore a number of Hit Points equal to the roll's total. Your pool regains all expended dice when you finish a Long Rest."
        },
        {
          "level": 6,
          "name": "Radiant Soul",
          "desc": "Starting at 6th level, your link to the Celestial allows you to serve as a conduit for radiant energy. You have resistance to radiant damage, and when you cast a spell that deals radiant or fire damage, you can add your Charisma modifier to one radiant or fire damage roll of that spell against one of its targets."
        },
        {
          "level": 6,
          "name": "Radiant Soul",
          "desc": "Your link to your patron allows you to serve as a conduit for radiant energy. You have Resistance to Radiant damage. Once per turn, when a spell you cast deals Radiant or Fire damage, you can add your Charisma modifier to that spell's damage against one of the spell's targets."
        },
        {
          "level": 10,
          "name": "Celestial Resilience",
          "desc": "Starting at 10th level, you gain temporary hit points whenever you finish a short or long rest. These temporary hit points equal your warlock level + your Charisma modifier. Additionally, choose up to five creatures you can see at the end of the rest. Those creatures each gain temporary hit points equal to half your warlock level + your Charisma modifier."
        },
        {
          "level": 10,
          "name": "Celestial Resilience",
          "desc": "You gain Temporary Hit Points whenever you use your Magical Cunning feature or finish a Short or Long Rest. These Temporary Hit Points equal your Warlock level plus your Charisma modifier. Additionally, choose up to five creatures you can see when you gain the points. Those creatures each gain Temporary Hit Points equal to half your Warlock level plus your Charisma modifier."
        },
        {
          "level": 14,
          "name": "Searing Vengeance",
          "desc": "Starting at 14th level, the radiant energy you channel allows you to resist death. When you have to make a death saving throw at the start of your turn, you can instead spring back to your feet with a burst of radiant energy. You regain hit points equal to half your hit point maximum, and then you stand up if you so choose. Each creature of your choice that is within 30 feet of you takes radiant damage equal to 2d8 + your Charisma modifier, and it is blinded until the end of the current turn.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 14,
          "name": "Searing Vengeance",
          "desc": "When you or an ally within 60 feet of you is about to make a Death Saving Throw, you can unleash radiant energy to save the creature. The creature regains Hit Points equal to half its Hit Point maximum and can end the Prone condition on itself. Each creature of your choice that is within 30 feet of the creature takes Radiant damage equal to 2d8 plus your Charisma modifier, and each has the Blinded condition until the end of the current turn.\nOnce you use this feature, you can't use it again until you finish a Long Rest."
        }
      ]
    },
    "The Fathomless": {
      "features": [
        {
          "level": 1,
          "name": "Gift of the Sea",
          "desc": "1st-level Fathomless feature\nYou gain a swimming speed of 40 feet, and you can breathe underwater."
        },
        {
          "level": 1,
          "name": "Tentacle of the Deeps",
          "desc": "1st-level Fathomless feature\nYou can magically summon a spectral tentacle that strikes at your foes. As a bonus action, you create a 10-foot-long tentacle at a point you can see within 60 feet of you. The tentacle lasts for 1 minute or until you use this feature to create another tentacle.\nWhen you create the tentacle, you can make a melee spell attack against one creature within 10 feet of it. On a hit, the target takes 1d8 cold damage, and its speed is reduced by 10 feet until the start of your next turn. When you reach 10th level in this class, the damage increases to 2d8.\nAs a bonus action on your turn, you can move the tentacle up to 30 feet and repeat the attack.\nYou can summon the tentacle a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 1,
          "name": "The Fathomless",
          "desc": "You have plunged into a pact with the deeps. An entity of the ocean, the Elemental Plane of Water, or another otherworldly sea now allows you to draw on its thalassic power. Is it merely using you to learn about terrestrial realms, or does it want you to open cosmic floodgates and drown the world?\nPerhaps you were born into a generational cult that venerates the Fathomless and its spawn. Or you might have been shipwrecked and on the brink of drowning when your patron's grasp offered you a chance at life. Whatever the reason for your pact, the sea and its unknown depths call to you.\nEntities of the deep that might empower a warlock include krakens, ancient water elementals, godlike hallucinations dreamed into being by kuo-toa, merfolk demigods, and sea hag covens.\nExpanded Spell List: 1st-level Fathomless feature The Fathomless lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Create Or Destroy Water, Thunderwave 2nd \u2014 Gust Of Wind, Silence 3rd \u2014 Lightning Bolt, Sleet Storm 4th \u2014 Control Water, Summon Elemental (water only) 5th \u2014 Bigby'S Hand (appears as a tentacle), Cone Of Cold"
        },
        {
          "level": 6,
          "name": "Guardian Coil",
          "desc": "6th-level Fathomless feature\nYour Tentacle of the Deeps can defend you and others, interposing itself between them and harm. When you or a creature you can see takes damage while within 10 feet of the tentacle, you can use your reaction to choose one of those creatures and reduce the damage to that creature by 1d8. When you reach 10th level in this class, the damage reduced by the tentacle increases to 2d8."
        },
        {
          "level": 6,
          "name": "Oceanic Soul",
          "desc": "6th-level Fathomless feature\nYou are now even more at home in the depths. You gain resistance to cold damage. In addition, when you are fully submerged, any creature that is also fully submerged can understand your speech, and you can understand theirs."
        },
        {
          "level": 10,
          "name": "Grasping Tentacles",
          "desc": "10th-level Fathomless feature\nYou learn the spell Evard'S Black Tentacles. It counts as a warlock spell for you, but it doesn't count against the number of spells you know. You can also cast it once without a spell slot, and you regain the ability to do so when you finish a long rest.\nWhenever you cast this spell, your patron's magic bolsters you, granting you a number of temporary hit points equal to your warlock level. Moreover, damage can't break your concentration on this spell."
        },
        {
          "level": 14,
          "name": "Fathomless Plunge",
          "desc": "14th-level Fathomless feature\nYou can magically open temporary conduits to watery destinations. As an action, you can teleport yourself and up to five other willing creatures that you can see within 30 feet of you. Amid a whirl of tentacles, you all vanish and then reappear up to 1 mile away in a body of water you've seen (pond size or larger) or within 30 feet of it, each of you appearing in an unoccupied space within 30 feet of the others.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        }
      ]
    },
    "The Fiend": {
      "features": [
        {
          "level": 1,
          "name": "Dark One's Blessing",
          "desc": "Starting at 1st level, when you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level (minimum of 1)."
        },
        {
          "level": 1,
          "name": "The Fiend",
          "desc": "You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims. Such beings desire the corruption or destruction of all things, ultimately including you. Fiends powerful enough to forge a pact include demon lords such as Demogorgon, Orcus, Fraz-Urb'luu, and Baphomet; archdevils such as Asmodeus, Dispater, Mephistopheles, and Belial; pit fiends and balors that are especially mighty; and ultroloths and other lords of the yugoloths.\nExpanded Spell List: The Fiend lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Burning Hands, Command 2nd \u2014 Blindness/Deafness, Scorching Ray 3rd \u2014 Fireball, Stinking Cloud 4th \u2014 Fire Shield, Wall Of Fire 5th \u2014 Flame Strike, Hallow"
        },
        {
          "level": 3,
          "name": "Dark One's Blessing",
          "desc": "When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum of 1 Temporary Hit Point). You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points."
        },
        {
          "level": 3,
          "name": "Fiend Patron",
          "desc": "Make a Deal with the Lower Planes\nYour pact draws on the Lower Planes, the realms of perdition. You might forge a bargain with a demon lord such as Demogorgon or Orcus; an archdevil such as Asmodeus; or a pit fiend, balor, yugoloth, or night hag that is especially mighty. That patron's aims are evil\u2014the corruption or destruction of all things, ultimately including you\u2014and your path is defined by the extent to which you strive against those aims."
        },
        {
          "level": 3,
          "name": "Fiend Spells",
          "desc": "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Fiend Spells table, you thereafter always have the listed spells prepared.\nWarlock Level | Spells\n3 \u2014 Burning Hands, Command, Scorching Ray, Suggestion\n5 \u2014 Fireball, Stinking Cloud\n7 \u2014 Fire Shield, Wall Of Fire\n9 \u2014 Geas, Insect Plague"
        },
        {
          "level": 6,
          "name": "Dark One's Own Luck",
          "desc": "Starting at 6th level, you can call on your patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add a d10 to your roll. You can do so after seeing the initial roll but before any of the roll's effects occur.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 6,
          "name": "Dark One's Own Luck",
          "desc": "You can call on your fiendish patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add 1d10 to your roll. You can do so after seeing the roll but before any of the roll's effects occur.\nYou can use this feature a number of times equal to your Charisma modifier (minimum of once), but you can use it no more than once per roll. You regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 10,
          "name": "Fiendish Resilience",
          "desc": "Starting at 10th level, you can choose one damage type when you finish a short or long rest. You gain resistance to that damage type until you choose a different one with this feature. Damage from magical weapons or silver weapons ignores this resistance."
        },
        {
          "level": 10,
          "name": "Fiendish Resilience",
          "desc": "Choose one damage type, other than Force, whenever you finish a Short or Long Rest. You have Resistance to that damage type until you choose a different one with this feature."
        },
        {
          "level": 14,
          "name": "Hurl Through Hell",
          "desc": "Starting at 14th level, when you hit a creature with an attack, you can use this feature to instantly transport the target through the lower planes. The creature disappears and hurtles through a nightmare landscape.\nAt the end of your next turn, the target returns to the space it previously occupied, or the nearest unoccupied space. If the target is not a fiend, it takes 10d10 psychic damage as it reels from its horrific experience.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 14,
          "name": "Hurl Through Hell",
          "desc": "Once per turn when you hit a creature with an attack roll, you can try to instantly transport the target through the Lower Planes. The target must succeed on a Charisma saving throw against your spell save DC, or the target disappears and hurtles through a nightmare landscape. The target takes 8d10 Psychic damage if it isn't a Fiend, and it has the Incapacitated condition until the end of your next turn, when it returns to the space it previously occupied or the nearest unoccupied space.\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you expend a Pact Magic spell slot (no action required) to restore your use of it."
        }
      ]
    },
    "The Genie": {
      "features": [
        {
          "level": 1,
          "name": "Bottled Respite",
          "desc": "As an action, you can magically vanish and enter your vessel, which remains in the space you left. The interior of the vessel is an extradimensional space in the shape of a 20-foot-radius cylinder, 20 feet high, and resembles your vessel. The interior is appointed with cushions and low tables and is a comfortable temperature. While inside, you can hear the area around your vessel as if you were in its space. You can remain inside the vessel up to a number of hours equal to twice your proficiency bonus. You exit the vessel early if you use a bonus action to leave, if you die, or if the vessel is destroyed. When you exit the vessel, you appear in the unoccupied space closest to it. Any objects left in the vessel remain there until carried out, and if the vessel is destroyed, every object stored there harmlessly appears in the unoccupied spaces closest to the vessel's former space. Once you enter the vessel, you can't enter again until you finish a long rest."
        },
        {
          "level": 1,
          "name": "Genie's Vessel",
          "desc": "1st-level Genie feature\nYour patron gifts you a magical vessel that grants you a measure of the genie's power. The vessel is a Tiny object, and you can use it as a spellcasting focus for your warlock spells. You decide what the object is, or you can determine what it is randomly by rolling on the Genie's Vessel table.\nd6 | Vessel\n1 \u2014 Oil lamp\n2 \u2014 Urn\n3 \u2014 Ring with a compartment\n4 \u2014 Stoppered bottle\n5 \u2014 Hollow statuette\n6 \u2014 Ornate lantern\nWhile you are touching the vessel, you can use it in the following ways:\nThe vessel's AC equals your spell save DC. Its hit points equal your warlock level plus your proficiency bonus, and it is immune to poison and psychic damage.\nIf the vessel is destroyed or you lose it, you can perform a 1-hour ceremony to receive a replacement from your patron. This ceremony can be performed during a short or long rest, and the previous vessel is destroyed if it still exists. The vessel vanishes in a flare of elemental power when you die."
        },
        {
          "level": 1,
          "name": "Genie's Wrath",
          "desc": "Once during each of your turns when you hit with an attack roll, you can deal extra damage to the target equal to your proficiency bonus. The type of this damage is determined by your patron: bludgeoning (dao), thunder (djinni), fire (efreeti), or cold (marid)."
        },
        {
          "level": 1,
          "name": "The Genie",
          "desc": "You have made a pact with one of the rarest kinds of genie, a noble genie. Such entities rule vast fiefs on the Elemental Planes and have great influence over lesser genies and elemental creatures. Noble genies are varied in their motivations, but most are arrogant and wield power that rivals that of lesser deities. They delight in turning the table on mortals, who often bind genies into servitude, and readily enter into pacts that expand their reach.\nYou choose your patron's kind or determine it randomly, using the Genie Kind table.\nd4 | Kind | Element\nDao \u2014 Earth\nDjinni \u2014 Air\nEfreeti \u2014 Fire\nMarid \u2014 Water\nExpanded Spell List: 1st-level Genie feature The Genie lets you choose from an expanded list of spells when you learn a warlock spell. The Genie Expanded Spells table shows the genie spells that are added to the warlock spell list for you, along with the spells associated in the table with your patron's kind: dao, djinni, efreeti, or marid. Spell Level | Genie Spells | Dao Spells | Djinni Spells | Efreeti Spells | Marid Spells 1st \u2014 Detect Evil And Good \u2014 Sanctuary \u2014 Thunderwave \u2014 Burning Hands \u2014 Fog Cloud 2nd \u2014 Phantasmal Force \u2014 Spike Growth \u2014 Gust Of Wind \u2014 Scorching Ray \u2014 Blur 3rd \u2014 Create Food And Water \u2014 Meld Into Stone \u2014 Wind Wall \u2014 Fireball \u2014 Sleet Storm 4th \u2014 Phantasmal Killer \u2014 Stone Shape \u2014 Greater Invisibility \u2014 Fire Shield \u2014 Control Water 5th \u2014 Creation \u2014 Wall Of Stone \u2014 Seeming \u2014 Flame Strike \u2014 Cone Of Cold 9th \u2014 Wish \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014"
        },
        {
          "level": 6,
          "name": "Elemental Gift",
          "desc": "6th-level Genie feature\nYou begin to take on characteristics of your patron's kind. You now have resistance to a damage type determined by your patron's kind: bludgeoning (dao), thunder (djinni), fire (efreeti), or cold (marid).\nIn addition, as a bonus action, you can give yourself a flying speed of 30 feet that lasts for 10 minutes, during which you can hover. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
        },
        {
          "level": 10,
          "name": "Sanctuary Vessel",
          "desc": "10th-level Genie feature\nWhen you enter your Genie's Vessel via the Bottled Respite feature, you can now choose up to five willing creatures that you can see within 30 feet of you, and the chosen creatures are drawn into the vessel with you.\nAs a bonus action, you can eject any number of creatures from the vessel, and everyone is ejected if you leave or die or if the vessel is destroyed.\nIn addition, anyone (including you) who remains within the vessel for at least 10 minutes gains the benefit of finishing a short rest, and anyone can add your proficiency bonus to the number of hit points they regain if they spend any Hit Dice as part of a short rest there."
        },
        {
          "level": 14,
          "name": "Limited Wish",
          "desc": "14th-level Genie feature\nYou entreat your patron to grant you a small wish. As an action, you can speak your desire to your Genie's Vessel, requesting the effect of one spell that is 6th level or lower and has a casting time of 1 action. The spell can be from any class's spell list, and you don't need to meet the requirements in that spell, including costly components; the spell simply takes effect as part of this action.\nOnce you use this feature, you can't use it again until you finish 1d4 long rests."
        }
      ]
    },
    "The Great Old One": {
      "features": [
        {
          "level": 1,
          "name": "Awakened Mind",
          "desc": "Starting at 1st level, your alien knowledge gives you the ability to touch the minds of other creatures. You can telepathically speak to any creature you can see within 30 feet of you. You don't need to share a language with the creature for it to understand your telepathic utterances, but the creature must be able to understand at least one language."
        },
        {
          "level": 1,
          "name": "The Great Old One",
          "desc": "Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality. It might come from the Far Realm, the space beyond reality, or it could be one of the elder gods known only in legends. Its motives are incomprehensible to mortals, and its knowledge so immense and ancient that even the greatest libraries pale in comparison to the vast secrets it holds. The Great Old One might be unaware of your existence or entirely indifferent to you, but the secrets you have learned allow you to draw your magic from it. Entities of this type include Ghaunadar, called That Which Lurks; Tharizdun, the Chained God; Dendar, the Night Serpent; Zargon, the Returner; Great Cthulhu; and other unfathomable beings.\nExpanded Spell List: The Great Old One lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Dissonant Whispers, Tasha'S Hideous Laughter 2nd \u2014 Detect Thoughts, Phantasmal Force 3rd \u2014 Clairvoyance, Sending 4th \u2014 Dominate Beast, Evard'S Black Tentacles 5th \u2014 Dominate Person, Telekinesis"
        },
        {
          "level": 3,
          "name": "Awakened Mind",
          "desc": "You can form a telepathic connection between your mind and the mind of another. As a Bonus Action, choose one creature you can see within 30 feet of yourself. You and the chosen creature can communicate telepathically with each other while the two of you are within a number of miles of each other equal to your Charisma modifier (minimum of 1 mile). To understand each other, you each must mentally use a language the other knows.\nThe telepathic connection lasts for a number of minutes equal to your Warlock level. It ends early if you use this feature to connect with a different creature."
        },
        {
          "level": 3,
          "name": "Great Old One Patron",
          "desc": "Unearth Forbidden Lore of Ineffable Beings\nWhen you choose this subclass, you might bind yourself to an unspeakable being from the Far Realm or an elder god\u2014a being such as Tharizdun, the Chained God; Zargon, the Returner; Hadar, the Dark Hunger; or Great Cthulhu. Or you might invoke several entities without yoking yourself to one. The motives of these beings are incomprehensible, and the Great Old One might be indifferent to your existence. But the secrets you've learned nevertheless allow you to draw strange magic from it."
        },
        {
          "level": 3,
          "name": "Great Old One Spells",
          "desc": "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Great Old One Spells table, you thereafter always have the listed spells prepared.\nWarlock Level | Spells\n3 \u2014 Detect Thoughts, Dissonant Whispers, Phantasmal Force, Tasha'S Hideous Laughter\n5 \u2014 Clairvoyance, Hunger Of Hadar\n7 \u2014 Confusion, Summon Aberration\n9 \u2014 Modify Memory, Telekinesis"
        },
        {
          "level": 3,
          "name": "Psychic Spells",
          "desc": "When you cast a Warlock spell that deals damage, you can change its damage type to Psychic. In addition, when you cast a Warlock spell that is an Enchantment or Illusion, you can do so without Verbal or Somatic components."
        },
        {
          "level": 6,
          "name": "Clairvoyant Combatant",
          "desc": "When you form a telepathic bond with a creature using your Awakened Mind, you can force that creature to make a Wisdom saving throw against your spell save DC. On a failed save, the creature has Disadvantage on attack rolls against you, and you have Advantage on attack rolls against that creature for the duration of the bond.\nOnce you use this feature, you can't use it again until you finish a Short or Long Rest unless you expend a Pact Magic spell slot (no action required) to restore your use of it."
        },
        {
          "level": 6,
          "name": "Entropic Ward",
          "desc": "At 6th level, you learn to magically ward yourself against attack and to turn an enemy's failed strike into good luck for yourself. When a creature makes an attack roll against you, you can use your reaction to impose disadvantage on that roll. If the attack misses you, your next attack roll against the creature has advantage if you make it before the end of your next turn.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 10,
          "name": "Eldritch Hex",
          "desc": "Your alien patron grants you a powerful curse. You always have the Hex spell prepared. When you cast Hex and choose an ability, the target also has Disadvantage on saving throws of the chosen ability for the duration of the spell."
        },
        {
          "level": 10,
          "name": "Thought Shield",
          "desc": "Starting at 10th level, your thoughts can't be read by telepathy or other means unless you allow it. You also have resistance to psychic damage, and whenever a creature deals psychic damage to you, that creature takes the same amount of damage that you do."
        },
        {
          "level": 10,
          "name": "Thought Shield",
          "desc": "Your thoughts can't be read by telepathy or other means unless you allow it. You also have Resistance to Psychic damage, and whenever a creature deals Psychic damage to you, that creature takes the same amount of damage that you take."
        },
        {
          "level": 14,
          "name": "Create Thrall",
          "desc": "At 14th level, you gain the ability to infect a humanoid's mind with the alien magic of your patron. You can use your action to touch an incapacitated humanoid. That creature is then charmed by you until a Remove Curse spell is cast on it, the charmed condition is removed from it, or you use this feature again.\nYou can communicate telepathically with the charmed creature as long as the two of you are on the same plane of existence."
        },
        {
          "level": 14,
          "name": "Create Thrall",
          "desc": "When you cast Summon Aberration, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting, and when summoned, the Aberration has a number of Temporary Hit Points equal to your Warlock level plus your Charisma modifier.\nIn addition, the first time each turn the Aberration hits a creature under the effect of your Hex, the Aberration deals extra Psychic damage to the target equal to the bonus damage of that spell."
        }
      ]
    },
    "The Hexblade": {
      "features": [
        {
          "level": 1,
          "name": "Hex Warrior",
          "desc": "At 1st level, you acquire the training necessary to effectively arm yourself for battle. You gain proficiency with medium armor, shields, and martial weapons.\nThe influence of your patron also allows you to mystically channel your will through a particular weapon. Whenever you finish a long rest, you can touch one weapon that you are proficient with and that lacks the two-handed property. When you attack with that weapon, you can use your Charisma modifier, instead of Strength or Dexterity, for the attack and damage rolls. This benefit lasts until you finish a long rest. If you later gain the Pact of the Blade feature, this benefit extends to every pact weapon you conjure with that feature, no matter the weapon's type."
        },
        {
          "level": 1,
          "name": "Hexblade's Curse",
          "desc": "Starting at 1st level, you gain the ability to place a baleful curse on someone. As a bonus action, choose one creature you can see within 30 feet of you. The target is cursed for 1 minute. The curse ends early if the target dies, you die, or you are incapacitated. Until the curse ends, you gain the following benefits:\n\u2022 You gain a bonus to damage rolls against the cursed target. The bonus equals your proficiency bonus.\n\u2022 Any attack roll you make against the cursed target is a critical hit on a roll of 19 or 20 on the d20.\n\u2022 If the cursed target dies, you regain hit points equal to your warlock level + your Charisma modifier (minimum of 1 hit point).\nYou can't use this feature again until you finish a short or long rest."
        },
        {
          "level": 1,
          "name": "The Hexblade",
          "desc": "You have made your pact with a mysterious entity from the Shadowfell\u2014a force that manifests in sentient magic weapons carved from the stuff of shadow. The mighty sword Blackrazor is the most notable of these weapons, which have been spread across the multiverse over the ages. The shadowy force behind these weapons can offer power to warlocks who form pacts with it. Many Hexblade warlocks create weapons that emulate those formed in the Shadowfell. Others forgo such arms, content to weave the dark magic of that plane into their spellcasting.\nBecause the Raven Queen is known to have forged the first of these weapons, many sages speculate that she and the force are one and that the weapons, along with Hexblade warlocks, are tools she uses to manipulate events on the Material Plane to her inscrutable ends.\nExpanded Spell List: The Hexblade lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Shield, Wrathful Smite 2nd \u2014 Blur, Branding Smite 3rd \u2014 Blink, Elemental Weapon 4th \u2014 Phantasmal Killer, Staggering Smite 5th \u2014 Banishing Smite, Cone Of Cold"
        },
        {
          "level": 6,
          "name": "Accursed Specter",
          "desc": "Starting at 6th level, you can curse the soul of a person you slay, temporarily binding it to your service. When you slay a humanoid, you can cause its spirit to rise from its corpse as a specter, the statistics for which are in the Monster Manual. When the specter appears, it gains temporary hit points equal to half your warlock level. Roll initiative for the specter, which has its own turns. It obeys your verbal commands, and it gains a special bonus to its attack rolls equal to your Charisma modifier (minimum of +0).\nThe specter remains in your service until the end of your next long rest, at which point it vanishes to the afterlife.\nOnce you bind a specter with this feature, you can't use the feature again until you finish a long rest."
        },
        {
          "level": 10,
          "name": "Armor of Hexes",
          "desc": "At 10th level, your hex grows more powerful. If the target cursed by your Hexblade's Curse hits you with an attack roll, you can use your reaction to roll a d6. On a 4 or higher, the attack instead misses you, regardless of its roll."
        },
        {
          "level": 14,
          "name": "Master of Hexes",
          "desc": "Starting at 14th level, you can spread your Hexblade's Curse from a slain creature to another creature. When the creature cursed by your Hexblade's Curse dies, you can apply the curse to a different creature you can see within 30 feet of you, provided you aren't incapacitated. When you apply the curse in this way, you don't regain hit points from the death of the previously cursed creature."
        }
      ]
    },
    "The Undead": {
      "features": [
        {
          "level": 1,
          "name": "Form of Dread",
          "desc": "1st-level Undead feature\nYou manifest an aspect of your patron's dreadful power. As a bonus action, you transform for 1 minute. You gain the following benefits while transformed:\n\u2022 You gain temporary hit points equal to 1d10 + your warlock level.\n\u2022 Once during each of your turns, when you hit a creature with an attack roll, you can force it to make a Wisdom saving throw, and if the saving throw fails, the target is frightened of you until the end of your next turn.\n\u2022 You are immune to the frightened condition.\nYou can transform a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nThe appearance of your Form of Dread reflects some aspect of your patron. For example, your form could be a shroud of shadows forming the crown and robes of your lich patron, or your body might glow with glyphs from ancient funerary rites and be surrounded by desert winds, suggesting your mummy patron."
        },
        {
          "level": 1,
          "name": "The Undead",
          "desc": "You've made a pact with a deathless being, a creature that defies the cycle and life and death, forsaking its mortal shell so it might eternally pursue its unfathomable ambitions. For such beings, time and morality are fleeting things, the concerns of those for whom grains of sand still rush through life's hourglass. Having once been mortal themselves, these ancient undead know firsthand the paths of ambition and the routes past the doors of death. They eagerly share this profane knowledge, along with other secrets, with those who work their will among the living.\nBeings of this type include the demilich Acererak, the vampire tyrant Kas the Bloody-Handed, the githyanki lich-queen Vlaakith, the dracolich Dragotha, the undead pharaoh Ankhtepot, and the elusive Darklord, Azalin Rex.\nExpanded Spell List: 1st-level Undead feature The Undead lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 Bane, False Life 2nd \u2014 Blindness/Deafness, Phantasmal Force 3rd \u2014 Phantom Steed, Speak With Dead 4th \u2014 Death Ward, Greater Invisibility 5th \u2014 Antilife Shell, Cloudkill"
        },
        {
          "level": 3,
          "name": "Form of Dread",
          "desc": "As a Bonus Action, you transform into an avatar of your patron's dreadful power, gaining the benefits below for 1 minute, until you have the Incapacitated condition, or until you end the form (no action required). You can transform a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nFacsimile of Life: You gain Temporary Hit Points equal to 1d10 plus your Warlock level.\nFearless Form: You have Immunity to the Frightened condition. If you are Frightened when you transform, the condition immediately ends for you.\nFrightful Avatar: Once per turn, when you hit a creature with an attack roll, you can force it to make a Wisdom saving throw against your spell save DC. On a failed save, the target has the Frightened condition until the end of your next turn."
        },
        {
          "level": 3,
          "name": "Undead Patron",
          "desc": "Defy Death for Profane Power\nYou've made a pact with a creature that defies the cycle of life and death: a powerful lich, a vampire, or another entity of undeath. Having once been mortal, these ancient patrons know firsthand the paths of ambition and the routes past the doors of death. They eagerly share this profane knowledge and other secrets with those who work their will among the living."
        },
        {
          "level": 3,
          "name": "Undead Spells",
          "desc": "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Undead Spells table, you thereafter always have the listed spells prepared.\nWarlock Level | Spells\n3 \u2014 Bane, Blindness/Deafness, Phantasmal Force, Ray Of Sickness\n5 \u2014 Speak With Dead, Summon Undead\n7 \u2014 Greater Invisibility, Phantasmal Killer\n9 \u2014 Antilife Shell, Cloudkill"
        },
        {
          "level": 6,
          "name": "Grave Touched",
          "desc": "6th-level Undead feature\nYour patron's powers have a profound effect on your body and magic. You don't need to eat, drink, or breathe.\nIn addition, once during each of your turns, when you hit a creature with an attack roll and roll damage against the creature, you can replace the damage type with necrotic damage. While you are using your Form of Dread, you can roll one additional damage die when determining the necrotic damage the target takes."
        },
        {
          "level": 6,
          "name": "Grave Touched",
          "desc": "Your patron's powers have a profound effect on your body and magic, granting you the following benefits.\nArcane Necrosis: Necrotic damage from your attacks, Warlock spells, and Warlock features ignores Resistance to Necrotic damage. Once per turn when you cast a spell that deals damage, you can change that spell's damage type to Necrotic.\nDreaded Necrosis: When you hit a creature with an attack roll and deal Necrotic damage while using your Form of Dread, you can roll one additional damage die when determining the Necrotic damage the target takes. You can use this benefit only once per turn.\nUndead Endurance: You don't gain Exhaustion levels from dehydration, malnutrition, or suffocation. In addition, you don't need to sleep, and magic can't put you to sleep."
        },
        {
          "level": 10,
          "name": "Necrotic Husk",
          "desc": "10th-level Undead feature\nYour connection to undeath and necrotic energy now saturates your body. You have resistance to necrotic damage. If you are transformed using your Form of Dread, you instead become immune to necrotic damage.\nIn addition, when you would be reduced to 0 hit points, you can use your reaction to drop to 1 hit point instead and cause your body to erupt with deathly energy. Each creature of your choice that is within 30 feet of you takes necrotic damage equal to 2d10 + your warlock level. You then gain 1 level of exhaustion. Once you use this reaction, you can't do so again until you finish 1d4 long rests."
        },
        {
          "level": 10,
          "name": "Necrotic Husk",
          "desc": "Your connection to undeath saturates your body. You gain the following benefits.\nNecrotic Resilience: You have Resistance to Necrotic damage. While using your Form of Dread, you have Immunity to Necrotic damage.\nUnholy Resuscitation: If you drop to 0 Hit Points and don't die outright, you can cause your body to erupt with deathly energy. Each creature of your choice in a 30-foot Emanation originating from you makes a Constitution saving throw against your spell save DC, taking Necrotic damage equal to 2d10 plus your Charisma modifier on a failed save or half as much damage on a successful one. Your Hit Points then change to twice your Warlock level, and you gain 1 Exhaustion level. Once you use this benefit, you can't use it again until you finish a Short or Long Rest."
        },
        {
          "level": 14,
          "name": "Spirit Projection",
          "desc": "14th-level Undead feature\nYour spirit can become untethered from your physical form. As an action, you can project your spirit from your body. The body you leave behind is unconscious and in a state of suspended animation.\nYour spirit resembles your mortal form in almost every way, replicating your game statistics but not your possessions. Any damage or other effects that apply to your spirit or physical body affects the other. Your spirit can remain outside your body for up to 1 hour or until your concentration is broken (as if concentrating on a spell). When your projection ends, your spirit returns to your body or your body magically teleports to your spirit's space (your choice).\nWhile projecting your spirit, you gain the following benefits:\n\u2022 Your spirit and body gain resistance to bludgeoning, piercing, and slashing damage.\n\u2022 When you cast a spell of the conjuration or necromancy school, the spell doesn't require verbal or somatic components or material components that lack a gold cost.\n\u2022 You have a flying speed equal to your walking speed and can hover. You can move through creatures and objects as if they were difficult terrain, but you take 1d10 force damage if you end your turn inside a creature or an object.\n\u2022 While you are using your Form of Dread, once during each of your turns when you deal necrotic damage to a creature, you regain hit points equal to half the amount of necrotic damage dealt.\nOnce you use this feature, you can't do so again until you finish a long rest."
        },
        {
          "level": 14,
          "name": "Superior Dread",
          "desc": "Your Form of Dread improves, granting you the following benefits while you are using it.\nDread Resistance: You have Resistance to Bludgeoning, Piercing, and Slashing damage.\nGhostly Flight: You have a Fly Speed equal to your Speed and can hover. You can move through creatures and objects as if they were Difficult Terrain, but you take 1d10 Force damage if you end your turn inside a creature or an object.\nProfane Casting: Whenever you cast a Warlock spell from the Conjuration or Necromancy school, you cast it without any Verbal, Somatic, or Material components, except Material components that are costly or consumed."
        }
      ]
    },
    "The Undying": {
      "features": [
        {
          "level": 1,
          "name": "Among the Dead",
          "desc": "Starting at 1st level, you learn the Spare The Dying cantrip, which counts as a warlock cantrip for you. You also have advantage on saving throws against any disease.\nAdditionally, undead have difficulty harming you. If an undead targets you directly with an attack or a harmful spell, that creature must make a Wisdom saving throw against your spell save DC (an undead needn't make the save when it includes you in an area effect, such as the explosion of Fireball). On a failed save, the creature must choose a new target or forfeit targeting someone instead of you, potentially wasting the attack or spell. On a successful save, the creature is immune to this effect for 24 hours. An undead is also immune to this effect for 24 hours if you target it with an attack or a harmful spell."
        },
        {
          "level": 1,
          "name": "The Undying",
          "desc": "Death holds no sway over your patron, who has unlocked the secrets of everlasting life, although such a prize\u2014like all power\u2014comes at a price. Once mortal, the Undying has seen mortal lifetimes pass like the seasons, like the flicker of endless days and nights. It has the secrets of the ages to share, secrets of life and death. Beings of this sort include Vecna, Lord of the Hand and the Eye; the dread Iuz; the lich-queen Vol; the Undying Court of Aerenal; Vlaakith, lich-queen of the githyanki; and the deathless wizard Fistandantilus.\nIn the Realms, Undying patrons include Larloch the Shadow King, legendary master of Warlock's Crypt, and Gilgeam, the God-King of Unther.\nExpanded Spell List: The Undying lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you. Spell Level | Spells 1st \u2014 False Life, Ray Of Sickness 2nd \u2014 Blindness/Deafness, Silence 3rd \u2014 Feign Death, Speak With Dead 4th \u2014 Aura Of Life, Death Ward 5th \u2014 Contagion, Legend Lore"
        },
        {
          "level": 6,
          "name": "Defy Death",
          "desc": "Starting at 6th level, you can give yourself vitality when you cheat death or when you help someone else cheat it. You can regain hit points equal to 1d8 + your Constitution modifier (minimum of 1 hit point) when you succeed on a death saving throw or when you stabilize a creature with Spare The Dying.\nOnce you use this feature, you can't use it again until you finish a long rest."
        },
        {
          "level": 10,
          "name": "Undying Nature",
          "desc": "Beginning at 10th level, you can hold your breath indefinitely, and you don't require food, water, or sleep, although you still require rest to reduce exhaustion and still benefit from finishing short and long rests.\nIn addition, you age at a slower rate. For every 10 years that pass, your body ages only 1 year, and you are immune to being magically aged."
        },
        {
          "level": 14,
          "name": "Indestructible Life",
          "desc": "When you reach 14th level, you partake some of the true secrets of the Undying. On your turn, you can use a bonus action to regain hit points equal to 1d8 + your warlock level. Additionally, if you put a severed body part of yours back in place when you use this feature, the part reattaches.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        }
      ]
    },
    "Vestige Patron": {
      "features": [
        {
          "level": 3,
          "name": "Vestige Companion",
          "desc": "The vestige manifests, drawing strength from your pact. It uses the Vestige Companion stat block and is a Celestial, Fiend, or Undead (choose when you gain this feature). You determine what the vestige looks like, but regardless of its form, the vestige bears features indicating its supernatural origin. For example, you might decide your vestige is an oversize floating skull etched with sigils, a circle of glowing runes, or a constantly shifting abstract shape. The vestige is Friendly to you and your allies and obeys your commands. It vanishes if you die.\nThe Vestige in Combat: In combat, the vestige acts during your turn. It can move and use its Reaction on its own, but the only action it takes is the Dodge action unless you take a Bonus Action to command it to take an action in its stat block or some other action. You can also sacrifice one of your attacks when you take the Attack action to command the vestige to take the Vestige's Strike action. If you have the Incapacitated condition, the vestige acts on its own and isn't limited to the Dodge action.\nDisappearance of the Vestige: When the vestige drops to 0 Hit Points, it disappears. You can spend 1 minute performing a magical ceremony to manifest the vestige again; it reappears with its maximum Hit Points in an unoccupied space within 5 feet of you. As a Magic action, you can temporarily dismiss the vestige to a pocket dimension. As a Magic action while it is temporarily dismissed, you can cause the vestige to reappear in an unoccupied space within 30 feet of you. Whenever the vestige drops to 0 Hit Points or disappears into the pocket dimension, it leaves behind in its space anything it was wearing or carrying. Vestige Companion:  Whenever you finish a Long Rest, you can summon the vestige in a new form, which appears in an unoccupied space within 5 feet of you. You choose its appearance and whether it is a Celestial, Fiend, or Undead. If the vestige is already manifested from this feature, its form changes to the new one."
        },
        {
          "level": 3,
          "name": "Vestige Patron",
          "desc": "Wield the Remnants of a Dying God's Power\nYour pact draws on the power of a dying god, a being once worshipped by countless followers but now abandoned and forgotten. This dying god, known as a vestige, might have been benevolent, evil, or strange and unknowable, but now it is driven to regain its former power. The vestige needs your help, and it is willing to share its remaining strength with you."
        },
        {
          "level": 3,
          "name": "Vestige Spells",
          "desc": "The magic of your Vestige Companion ensures you always have certain spells ready. Select one of the following Cleric domains: Life, Light, Trickery, or War. The Domain Spells of your chosen domain are Warlock spells for you. When you reach a Warlock level equal to a Cleric level listed on the Domain Spells table for the domain you have chosen, you thereafter always have the listed spells prepared.\nFor example, if you chose the War Domain for this feature, when you reach Warlock level 3, you would have the Guiding Bolt, Magic Weapon, Shield Of Faith, and Spiritual Weapon spells prepared."
        },
        {
          "level": 6,
          "name": "Vestige Power",
          "desc": "Your Vestige Companion now regains its use of Divine Power whenever you finish a Short or Long Rest or when you use your Magical Cunning feature. In addition, while within 30 feet of your Vestige Companion, you have Resistance to the same damage types as the vestige."
        },
        {
          "level": 10,
          "name": "Vestige Recovery",
          "desc": "When your Vestige Companion would drop to 0 Hit Points, you can take a Reaction and expend a Pact Magic spell slot to instead change its Hit Points to its Hit Point maximum. The vestige then teleports to an unoccupied space you can see within 30 feet of it. Once you use this feature, you can't do so again until you finish a Long Rest."
        },
        {
          "level": 14,
          "name": "Semblance of Life",
          "desc": "Your Vestige Companion continues to grow in strength, and with your assistance, it can briefly adopt a more powerful form. Depending on the vestige's type, you can take a Magic action while the vestige is within 90 feet of you to shape-shift it for 1 hour into one of the following forms: Celestial Spirit (Celestial vestige; see the Summon Celestial spell in the Player's Handbook), Fiendish Spirit (Fiend vestige; see the Summon Fiend spell in the Player's Handbook), or Undead Spirit (Undead vestige; see the Summon Undead spell in the Player's Handbook). The vestige's game statistics are replaced by the spirit's stat block, and the spell's level is equal to half your Warlock level (round down; maximum level 9), but the vestige retains its personality, Divine Power Bonus Action, Hit Points, and Hit Point Dice.\nThe vestige gains a number of Temporary Hit Points equal to the Hit Points of the spirit form. These Temporary Hit Points vanish if any remain after 1 hour, and the transformation ends early if it has no Temporary Hit Points left.\nOnce you use this feature, you can't do so again until you finish a Long Rest."
        }
      ]
    }
  },
  "Wizard": {
    "Abjurer": {
      "features": [
        {
          "level": 3,
          "name": "Abjuration Savant",
          "desc": "Choose two Wizard spells from the Abjuration school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Abjuration school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Abjurer",
          "desc": "Shield Companions and Banish Foes\nYour study of magic is focused on spells that block, banish, or protect\u2014ending harmful effects, banishing evil influences, and protecting the weak. Abjurers are sought when baleful spirits require exorcism, when locations must be guarded against magical spying, and when portals to other planes of existence must be closed. Adventuring parties value Abjurers for the protection they provide against a variety of hostile magic and other attacks."
        },
        {
          "level": 3,
          "name": "Arcane Ward",
          "desc": "You can weave magic around yourself for protection. When you cast an Abjuration spell with a spell slot, you can simultaneously use a strand of the spell's magic to create a magical ward on yourself that lasts until you finish a Long Rest. The ward has a Hit Point maximum equal to twice your Wizard level plus your Intelligence modifier. Whenever you take damage, the ward takes the damage instead, and if you have any Resistances or Vulnerabilities, apply them before reducing the ward's Hit Points. If the damage reduces the ward to 0 Hit Points, you take any remaining damage. While the ward has 0 Hit Points, it can't absorb damage, but its magic remains.\nWhenever you cast an Abjuration spell with a spell slot, the ward regains a number of Hit Points equal to twice the level of the spell slot. Alternatively, as a Bonus Action, you can expend a spell slot, and the ward regains a number of Hit Points equal to twice the level of the spell slot expended.\nOnce you create the ward, you can't create it again until you finish a Long Rest."
        },
        {
          "level": 6,
          "name": "Projected Ward",
          "desc": "When a creature that you can see within 30 feet of yourself takes damage, you can take a Reaction to cause your Arcane Ward to absorb that damage. If this damage reduces the ward to 0 Hit Points, the warded creature takes any remaining damage. If that creature has any Resistances or Vulnerabilities, apply them before reducing the ward's Hit Points."
        },
        {
          "level": 10,
          "name": "Spell Breaker",
          "desc": "You always have the Counterspell and Dispel Magic spells prepared. In addition, you can cast Dispel Magic as a Bonus Action, and you can add your Proficiency Bonus to its ability check.\nWhen you cast either spell with a spell slot, that slot isn't expended if the spell fails to stop a spell."
        },
        {
          "level": 14,
          "name": "Spell Resistance",
          "desc": "You have Advantage on saving throws against spells, and you have Resistance to the damage of spells."
        }
      ]
    },
    "Bladesinger": {
      "features": [
        {
          "level": 3,
          "name": "Bladesinger",
          "desc": "Wield Weapon and Wizardry in Elegant Tandem\nBladesingers master a tradition of wizardry that incorporates swordplay and dance. In combat, a Bladesinger uses intricate, elegant maneuvers that fend off harm and allow the Bladesinger to channel magic into devastating attacks and a cunning defense. Many who have observed a Bladesinger at work remember the display as one of the more beautiful experiences in their life\u2014a glorious dance accompanied by a singing blade.\nBladesinging is associated with the ancient elven societies that first mastered the art and coined the term. Even today, most Bladesingers still hail from old elven realms, such as Myth Drannor, or from non-elven societies that share land and history with elves, such as the Silver Marches. Wherever they hail from, Bladesingers take their talents all across the Realms to help common people and perform heroic deeds. Most communities greet the arrival of a Bladesinger as a good omen."
        },
        {
          "level": 3,
          "name": "Bladesong",
          "desc": "As a Bonus Action, you invoke an elven magic called the Bladesong, provided you aren't wearing armor or using a Shield.\nThe Bladesong lasts for 1 minute and ends early if you have the Incapacitated condition, if you don armor or a Shield, or if you use two hands to make an attack with a weapon. You can dismiss the Bladesong at any time (no action required).\nWhile the Bladesong is active, you gain the following benefits. You can invoke the Bladesong a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest. You regain one expended use when you use Arcane Recovery.\nAgility: You gain a bonus to your AC equal to your Intelligence modifier (minimum of +1), and your Speed increases by 10 feet. In addition, you have Advantage on Dexterity (Acrobatics) checks.\nBladework: Whenever you attack with a weapon with which you have proficiency, you can use your Intelligence modifier for the attack and damage rolls instead of using Strength or Dexterity.\nFocus: When you make a Constitution saving throw to maintain Concentration, you can add your Intelligence modifier to the total."
        },
        {
          "level": 3,
          "name": "Training in War and Song",
          "desc": "You gain proficiency with all Melee Martial weapons that don't have the Two-Handed or Heavy property. You can use a Melee weapon with which you have proficiency as a Spellcasting Focus for your Wizard spells.\nYou also gain proficiency in one of the following skills of your choice: Acrobatics, Athletics, Performance, or Persuasion."
        },
        {
          "level": 6,
          "name": "Extra Attack",
          "desc": "You can attack twice, instead of once, whenever you take the Attack action on your turn. Moreover, you can cast one of your Wizard cantrips that has a casting time of an action in place of one of those attacks."
        },
        {
          "level": 10,
          "name": "Song of Defense",
          "desc": "When you take damage while your Bladesong is active, you can take a Reaction to expend one spell slot and reduce the damage taken by an amount equal to five times the spell slot's level."
        },
        {
          "level": 14,
          "name": "Song of Victory",
          "desc": "After you cast a spell that has a casting time of an action, you can make one attack with a weapon as a Bonus Action."
        }
      ]
    },
    "Bladesinging": {
      "features": [
        {
          "level": 2,
          "name": "Bladesinger Styles",
          "desc": "From its inception as a martial and magical art, Bladesinging has been tied to the sword, more specifically the longsword. Yet many generations of study gave rise to various styles of Bladesinging based on the melee weapon employed. The techniques of these styles are passed from master to students in small schools, some of which have a building dedicated to instruction. Even the newest styles are hundreds of years old, but are still taught by their original creators due to the long lives of elves. Most schools of Bladesinging are in Evermeet or Evereska. One was started in Myth Drannor, but the city's destruction has scattered those students who survived.\nStyles of Bladesinging are broadly categorized based on the type of weapon employed, and each is associated with a category of animal. Within that style are specializations named after specific animal types, based on the types of spells employed, the techniques of the master, and the particular weapon used. Bladesingers who apprentice to a master typically get a tattoo of their chosen style's animal. Some bladesingers learn multiple styles and bear many tattoos, wearing a warning on their skin of their deadly skills.\nCat: Styles that employ a sword belong to this family. The lion style, the eldest, trains practitioners in the use of the longsword and doesn't favor any particular type of spells. Leopard style focuses on the shortsword and spells of illusion and stealth. Red tiger, a style just three centuries old, has its bladesingers using the scimitar in a whirling dance of defense from which they launch into sudden leaps and attacks.\nBird: Styles that focus on the use of a hafted weapon, such as an axe or hammer, have been grouped together as bird styles, yet they vary wildly. All relatively new styles, they use weapons not typically favored by elves. Eagle-style bladesingers use small handaxes, and many maneuvers in the style focus on fluid ways to throw the weapon and draw a new one. Raven style uses a war pick, and spells associated with it grant the bladesinger more agility in combat.\nSnake: Practitioners of these styles use a flail, chain, or whip. Viper style uses a whip, despite its inelegance as a weapon, and has almost as long a history as the lion style. Its masters punctuate their bladesong with a stunningly rapid rhythm of whip cracks, which can keep many foes at bay and allow the bladesinger space to cast the cruel spells of poison and disease favored by the style."
        },
        {
          "level": 2,
          "name": "Bladesinging",
          "desc": "Bladesingers master a tradition of wizardry that incorporates swordplay and dance. Originally created by elves, this tradition has been adopted by non-elf practitioners, who honor and expand on the elven ways.\nIn combat, a bladesinger uses a series of intricate, elegant maneuvers that fend off harm and allow the bladesinger to channel magic into devastating attacks and a cunning defense. Many who have observed a bladesinger at work remember the display as one of the more beautiful experiences in their life, a glorious dance accompanied by a singing blade."
        },
        {
          "level": 2,
          "name": "Bladesong",
          "desc": "Starting at 2nd level, you can invoke a secret elven magic called the Bladesong, provided you aren't wearing medium or heavy armor or using a shield. It graces you with supernatural speed, agility, and focus.\nYou can use a bonus action to start the Bladesong, which lasts for 1 minute. It ends early if you are incapacitated, if you don medium or heavy armor or a shield, or if you use two hands to make an attack with a weapon. You can also dismiss Bladesong at any time you choose (no action required).\nWhile your bladesong is active, you gain the following benefits:\n\u2022 You gain a bonus to your AC equal to your Intelligence modifier (minimum of +1).\n\u2022 Your walking speed increases by 10 feet.\n\u2022 You have advantage on Dexterity (Acrobatics) checks.\n\u2022 You gain a bonus to any Constitution saving throws you make to maintain concentration on a spell. The bonus equals your Intelligence modifier (minimum of +1).\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses of it when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Training in War and Song (Bladesinging)",
          "desc": "When you adopt this tradition at 2nd level, you gain proficiency with light armor, and you gain proficiency with one type of one-handed melee weapon of your choice.\nYou also gain proficiency in the Performance skill if you don't already have it."
        },
        {
          "level": 6,
          "name": "Extra Attack",
          "desc": "Starting at 6th level, you can attack twice, instead of once, whenever you take the Attack action on your turn. Moreover, you can cast one of your cantrips in place of one of those attacks."
        },
        {
          "level": 10,
          "name": "Song of Defense",
          "desc": "Beginning at 10th level, you can direct your magic to absorb damage while your bladesong is active. When you take damage, you can use your reaction to expend one spell slot and reduce that damage to you by an amount equal to five times the spell's slot level."
        },
        {
          "level": 14,
          "name": "Song of Victory",
          "desc": "Starting at 14th level, you add your Intelligence modifier (minimum of +1) to the damage of your melee weapon attacks while your Bladesong is active."
        }
      ]
    },
    "Chronurgy Magic": {
      "features": [
        {
          "level": 2,
          "name": "Chronal Shift",
          "desc": "2nd-level Chronurgy Magic feature\nYou can magically exert limited control over the flow of time around a creature. As a reaction, after you or a creature you can see within 30 feet of you makes an attack roll, an ability check, or a saving throw, you can force the creature to reroll. You make this decision after you see whether the roll succeeds or fails. The target must use the result of the second roll.\nYou can use this ability twice, and you regain any expended uses when you finish a long rest."
        },
        {
          "level": 2,
          "name": "Chronurgy Magic",
          "desc": "Focusing on the manipulation of time, those who follow the Chronurgy tradition learn to alter the pace of reality to their liking. Using the ramping of anticipatory dunamis energy, these mages can bend the flow of time as adroitly as a skilled musician plays an instrument, lending themselves and their allies an advantage in the blink of an eye.\nNote: This subclass has access to Dunamancy Spells."
        },
        {
          "level": 2,
          "name": "Temporal Awareness",
          "desc": "2nd-level Chronurgy Magic feature\nYou can add your Intelligence modifier to your initiative rolls."
        },
        {
          "level": 6,
          "name": "Momentary Stasis",
          "desc": "6th-level Chronurgy Magic feature\nAs an action, you can magically force a Large or smaller creature you can see within 60 feet of you to make a Constitution saving throw against your spell save DC. Unless the saving throw is a success, the creature is encased in a field of magical energy until the end of your next turn or until the creature takes any damage. While encased in this way, the creature is incapacitated and has a speed of 0.\nYou can use this feature a number of times equal to your Intelligence modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 10,
          "name": "Arcane Abeyance",
          "desc": "10th-level Chronurgy Magic feature\nWhen you cast a spell using a spell slot of 4th level or lower, you can condense the spell's magic into a mote. The spell is frozen in time at the moment of casting and held within a gray bead for 1 hour. This bead is a Tiny object with AC 15 and 1 hit point, and it is immune to poison and psychic damage. When the duration ends, or if the bead is destroyed, it vanishes in a flash of light, and the spell is lost.\nA creature holding the bead can use its action to release the spell within, whereupon the bead disappears. The spell uses your spell attack bonus and save DC, and the spell treats the creature who released it as the caster for all other purposes.\nOnce you create a bead with this feature, you can't do so again until you finish a short or long rest."
        },
        {
          "level": 14,
          "name": "Convergent Future",
          "desc": "14th-level Chronurgy Magic feature\nYou can peer through possible futures and magically pull one of them into events around you, ensuring a particular outcome. When you or a creature you can see within 60 feet of you makes an attack roll, an ability check, or a saving throw, you can use your reaction to ignore the die roll and decide whether the number rolled is the minimum needed to succeed or one less than that number (your choice).\nWhen you use this feature, you gain one level of exhaustion. Only by finishing a long rest can you remove a level of exhaustion gained in this way."
        }
      ]
    },
    "Conjurer": {
      "features": [
        {
          "level": 3,
          "name": "Benign Transposition",
          "desc": "As a Bonus Action, you teleport up to 30 feet to an unoccupied space that you can see. Alternatively, you can choose a space within range that is occupied by a Medium or smaller creature. If that creature is willing, you both teleport, swapping places.\nYou can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 3,
          "name": "Conjuration Savant",
          "desc": "Choose two Wizard spells from the Conjuration school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Conjuration school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Conjurer",
          "desc": "Step Across Space and Call Creatures from Thin Air\nA Conjurer considers distance and matter to be flexible guidelines rather than physical laws. Conjurers master magic that moves creatures instantly through space and summons creatures to fight on their behalf."
        },
        {
          "level": 6,
          "name": "Distant Transposition",
          "desc": "The range of your Benign Transposition feature increases to 60 feet. Additionally, you can restore one use of it by expending a level 3+ spell slot (no action required)."
        },
        {
          "level": 6,
          "name": "Durable Summons",
          "desc": "When you cast a Conjuration spell to summon or create a creature using a spell slot, that creature gains Temporary Hit Points equal to twice your Wizard level when it first appears. While it has these Temporary Hit Points, the creature has Resistance to every damage type except Force, Necrotic, Psychic, and Radiant."
        },
        {
          "level": 10,
          "name": "Focused Conjuration",
          "desc": "Taking damage can't break your Concentration on Conjuration spells."
        },
        {
          "level": 14,
          "name": "Splintered Summons",
          "desc": "When you use a spell slot to cast a Conjuration spell that summons a spirit whose stat block is included in the spell description, such as Summon Aberration, you can modify the spell to summon two creatures with the spell instead of one. Each creature is of the same kind, uses the stat block and rules denoted by the spell, and manifests in a different unoccupied space of your choice within the spell's range, but the summoned creatures' Hit Point maximums and current Hit Points are halved. If you lose Concentration on the spell, both creatures disappear.\nOnce you use this feature to modify a spell in this way, you must finish a Long Rest before you can do so again. You can also restore your use of it by expending a level 5+ spell slot (no action required)."
        }
      ]
    },
    "Diviner": {
      "features": [
        {
          "level": 3,
          "name": "Divination Savant",
          "desc": "Choose two Wizard spells from the Divination school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Divination school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Diviner",
          "desc": "Learn the Secrets of the Multiverse\nThe counsel of a Diviner is sought by those who want a clearer understanding of the past, present, and future. As a Diviner, you strive to part the veils of space, time, and consciousness. You work to master spells of discernment, remote viewing, supernatural knowledge, and foresight."
        },
        {
          "level": 3,
          "name": "Portent",
          "desc": "Glimpses of the future begin to press on your awareness. Whenever you finish a Long Rest, roll two d20s and record the numbers rolled. You can replace any D20 Test made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll, and you can replace a roll in this way only once per turn.\nEach foretelling roll can be used only once. When you finish a Long Rest, you lose any unused foretelling rolls."
        },
        {
          "level": 6,
          "name": "Expert Divination",
          "desc": "Casting Divination spells comes so easily to you that it expends only a fraction of your spellcasting efforts. When you cast a Divination spell using a level 2+ spell slot, you regain one expended spell slot. The slot you regain must be of a level lower than the slot you expended and can't be higher than level 5."
        },
        {
          "level": 10,
          "name": "The Third Eye",
          "desc": "You can increase your powers of perception. As a Bonus Action, choose one of the following benefits, which lasts until you start a Short or Long Rest. You can't use this feature again until you finish a Short or Long Rest.\nDarkvision: You gain Darkvision with a range of 120 feet.\nGreater Comprehension: You can read any language.\nSee Invisibility: You can cast See Invisibility without expending a spell slot."
        },
        {
          "level": 14,
          "name": "Greater Portent",
          "desc": "The visions in your dreams intensify and paint a more accurate picture in your mind of what is to come. Roll three d20s for your Portent feature rather than two."
        }
      ]
    },
    "Enchanter": {
      "features": [
        {
          "level": 3,
          "name": "Enchanter",
          "desc": "Entrance and Beguile Others\nAn Enchanter's magic clouds or captivates minds. Some Enchanters use their abilities to encourage peace and soften cruelty, while others use their mind-altering magic for selfish ends."
        },
        {
          "level": 3,
          "name": "Enchanting Conversationalist",
          "desc": "You gain proficiency in one of the following skills of your choice: Deception, Intimidation, or Persuasion.\nIn addition, when you make an ability check with the chosen skill, you gain a bonus to the check equal to your Intelligence modifier (minimum of +1)."
        },
        {
          "level": 3,
          "name": "Enchantment Savant",
          "desc": "Choose two Wizard spells from the Enchantment school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Enchantment school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Hypnotic Presence",
          "desc": "Your charming words and enchanting gaze can enthrall another creature. As a Magic action, choose one creature that you can see within 10 feet of yourself. If the target can see or hear you, it must succeed on a Wisdom saving throw against your spell save DC or have the Charmed condition for 1 minute or until the target is more than 10 feet away from you, the target can neither see nor hear you, or the target takes damage. While Charmed, the target has the Incapacitated condition and a Speed of 0.\nYou can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 6,
          "name": "Split Enchantment",
          "desc": "When you use a spell slot to cast an Enchantment spell, such as Charm Person, that can be cast with a higher-level spell slot to target an additional creature, you can increase the spell's effective level by 1.\nYou can use this feature a number of times equal to your Intelligence modifier, and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 10,
          "name": "Instinctive Charm",
          "desc": "When a creature within 30 feet of you that you can see hits you with an attack roll, you can take a Reaction to force the attacker to make a Wisdom saving throw against your spell save DC. On a failed save, the attack misses instead, and if there is another creature within range of the attack other than the attacker, the attacker targets that creature with the triggering attack, using the same attack roll. If multiple creatures are within the attack's range, you choose which one to target.\nOnce you take this Reaction, you can't do so again until you finish a Long Rest. You can also restore your use of it by casting an Enchantment spell with a spell slot."
        },
        {
          "level": 14,
          "name": "Alter Memories",
          "desc": "You can make a creature unaware of your magical influence. When you cast an Enchantment spell that imposes the Charmed condition using a spell slot, you can choose one creature targeted by the spell. That creature remains unaware of being Charmed by you.\nIn addition, once before the spell ends, you can take a Magic action to force the chosen creature to make an Intelligence saving throw against your spell save DC. On a failed save, you can make the creature lose a number of hours of its memories equal to 1 plus your Intelligence modifier (minimum of 1 hour lost). You can make the creature forget less time, and the amount of time can't exceed the duration of your Enchantment spell."
        }
      ]
    },
    "Evoker": {
      "features": [
        {
          "level": 3,
          "name": "Evocation Savant",
          "desc": "Choose two Wizard spells from the Evocation school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Evocation school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Evoker",
          "desc": "Create Explosive Elemental Effects\nYour studies focus on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some Evokers find employment in military forces, serving as artillery to blast armies from afar. Others use their power to protect others, while some seek their own gain."
        },
        {
          "level": 3,
          "name": "Potent Cantrip",
          "desc": "Your damaging cantrips affect even creatures that avoid the brunt of the effect. When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw against the cantrip, the target takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip."
        },
        {
          "level": 6,
          "name": "Sculpt Spells",
          "desc": "You can create pockets of relative safety within the effects of your evocations. When you cast an Evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 plus the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save."
        },
        {
          "level": 10,
          "name": "Empowered Evocation",
          "desc": "Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell."
        },
        {
          "level": 14,
          "name": "Overchannel",
          "desc": "You can increase the power of your spells. When you cast a Wizard spell with a spell slot of levels 1\u20135 that deals damage, you can deal maximum damage with that spell on the turn you cast it.\nThe first time you do so, you suffer no adverse effect. If you use this feature again before you finish a Long Rest, you take 2d12 Necrotic damage for each level of the spell slot immediately after you cast it. This damage ignores Resistance and Immunity.\nEach time you use this feature again before finishing a Long Rest, the Necrotic damage per spell level increases by 1d12."
        }
      ]
    },
    "Graviturgy Magic": {
      "features": [
        {
          "level": 2,
          "name": "Adjust Density",
          "desc": "2nd-level Graviturgy Magic feature\nAs an action, you can magically alter the weight of one object or creature you can see within 30 feet of you. The object or creature must be Large or smaller. The target's weight is halved or doubled for up to 1 minute or until your concentration ends (as if you were concentrating on a spell).\nWhile the weight of a creature is halved by this effect, the creature's speed increases by 10 feet, it can jump twice as far as normal, and it has disadvantage on Strength checks and Strength saving throws. While the weight of a creature is doubled by this effect, the creature's speed is reduced by 10 feet, and it has advantage on Strength checks and Strength saving throws.\nUpon reaching 10th level in this class, you can target an object or a creature that is Huge or smaller."
        },
        {
          "level": 2,
          "name": "Graviturgy Magic",
          "desc": "Understanding and mastering the forces that draw bodies of matter together or drive them apart, the students of the Graviturgy arcane tradition learn to further bend and manipulate the violent energy of gravity to their benefit, and the terrible detriment of their enemies.\nNote: This subclass has access to Dunamancy Spells."
        },
        {
          "level": 6,
          "name": "Gravity Well",
          "desc": "6th-level Graviturgy Magic feature\nYou've learned how to manipulate gravity around a living being: whenever you cast a spell on a creature, you can move the target 5 feet to an unoccupied space of your choice if the target is willing to move, the spell hits it with an attack, or it fails a saving throw against the spell."
        },
        {
          "level": 10,
          "name": "Violent Attraction",
          "desc": "10th-level Graviturgy Magic feature\nWhen another creature that you can see within 60 feet of you hits with a weapon attack, you can use your reaction to increase the attack's velocity, causing the attack's target to take an extra 1d10 damage of the weapon's type.\nAlternatively, if a creature within 60 feet of you takes damage from a fall, you can use your reaction to increase the fall's damage by 2d10.\nYou can use this feature a number of times equal to your Intelligence modifier (a minimum of once). You regain all expended uses when you finish a long rest."
        },
        {
          "level": 14,
          "name": "Event Horizon",
          "desc": "14th-level Graviturgy Magic feature\nAs an action, you can magically emit a powerful field of gravitational energy that tugs at other creatures for up to 1 minute or until your concentration ends (as if you were concentrating on a spell). For the duration, whenever a creature hostile to you starts its turn within 30 feet of you, it must make a Strength saving throw against your spell save DC. On a failed save, it takes 2d10 force damage, and its speed is reduced to 0 until the start of its next turn. On a successful save, it takes half as much damage, and every foot it moves this turn costs 2 extra feet of movement.\nOnce you use this feature, you can't do so again until you finish a long rest or until you expend a spell slot of 3rd level or higher on it."
        }
      ]
    },
    "Illusionist": {
      "features": [
        {
          "level": 3,
          "name": "Illusion Savant",
          "desc": "Choose two Wizard spells from the Illusion school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Illusion school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Illusionist",
          "desc": "Weave Subtle Spells of Deception\nYou specialize in magic that dazzles the senses and tricks the mind, and the illusions you craft make the impossible seem real."
        },
        {
          "level": 3,
          "name": "Improved Illusions",
          "desc": "You can cast Illusion spells without providing Verbal components, and if an Illusion spell you cast has a range of 10+ feet, the range increases by 60 feet.\nYou also know the Minor Illusion cantrip. If you already know it, you learn a different Wizard cantrip of your choice. The cantrip doesn't count against your number of cantrips known. You can create both a sound and an image with a single casting of Minor Illusion, and you can cast it as a Bonus Action."
        },
        {
          "level": 6,
          "name": "Phantasmal Creatures",
          "desc": "You always have the Summon Beast and Summon Fey spells prepared. Whenever you cast either spell, you can change its school to Illusion, which causes the summoned creature to appear spectral. You can cast the Illusion version of each spell without expending a spell slot, but casting it without a slot halves the creature's Hit Points. Once you cast either spell without a spell slot, you must finish a Long Rest before you can cast the spell in that way again."
        },
        {
          "level": 10,
          "name": "Illusory Self",
          "desc": "When a creature hits you with an attack roll, you can take a Reaction to interpose an illusory duplicate of yourself between the attacker and yourself. The attack automatically misses you, then the illusion dissipates.\nOnce you use this feature, you can't use it again until you finish a Short or Long Rest. You can also restore your use of it by expending a level 2+ spell slot (no action required)."
        },
        {
          "level": 14,
          "name": "Illusory Reality",
          "desc": "You have learned to weave shadow magic into your illusions to give them a semi-reality. When you cast an Illusion spell with a spell slot, you can choose one inanimate, nonmagical object that is part of the illusion and make that object real. You can do this on your turn as a Bonus Action while the spell is ongoing. The object remains real for 1 minute, during which it can't deal damage or give any conditions. For example, you can create an illusion of a bridge over a chasm and then make it real and cross it."
        }
      ]
    },
    "Necromancer": {
      "features": [
        {
          "level": 3,
          "name": "Necromancer",
          "desc": "Command the Powers of Death and Undeath\nYou explore the forces of life, death, and undeath. As a necromancer, you learn to manipulate the energy that animates all creatures, and you draw increasing power from the forbidden secrets in your spellbook. Though many see Necromancers as menacing or villainous, not all Necromancers are evil."
        },
        {
          "level": 3,
          "name": "Necromancy Savant",
          "desc": "Choose two Wizard spells from the Necromancy school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Necromancy school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Necromancy Spellbook",
          "desc": "Your spellbook's necromantic secrets grant you additional powers. You gain the following benefits.\nNecrotic Resistance: You have Resistance to Necrotic damage.\nUndead Familiar: The Find Familiar spell appears in your spellbook. When you cast the spell, you choose one of the normal forms for your familiar or one of the following special forms: Skeleton or Zombie (see appendix B of the Player's Handbook for the familiar's stat block). When you choose one of the normal forms, you can choose Undead as its creature type. Additionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to make one attack of its own with its Reaction.\nUndead Vitality: When you cast a Necromancy spell using a spell slot, you can choose an Undead creature you can see within 60 feet of yourself to regain a number of Hit Points equal to the level of the spell slot expended plus your Wizard level."
        },
        {
          "level": 6,
          "name": "Grave Power",
          "desc": "You have discovered more necromantic insights and inscribed them in your spellbook. While holding your spellbook, you gain the following benefits.\nGrave Resilience: When you use Arcane Recovery, your Exhaustion level, if any, decreases by 1.\nOverwhelming Necrosis: Damage from your Wizard spells and Wizard features ignores Resistance to Necrotic damage."
        },
        {
          "level": 6,
          "name": "Undead Thralls",
          "desc": "You always have Animate Dead prepared and can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again. Whenever you start casting the spell, you can increase the spell's effective level by 1.\nIn addition, while holding your spellbook, you gain the following benefits.\nUndead Fortitude: Whenever you cast a Necromancy spell that creates or summons an Undead, the Undead's Hit Point maximum and current Hit Points increase by a number equal to your Intelligence modifier plus half your Wizard level (round down).\nWithering Strike: Whenever an Undead you control within 60 feet of you hits a creature with an attack roll, the Undead deals extra Necrotic damage equal to your Intelligence modifier (minimum of 1 Necrotic damage)."
        },
        {
          "level": 10,
          "name": "Harvest Undead",
          "desc": "You have learned more secrets about the nuances of life and death. Immediately after you become Bloodied but aren't reduced to 0 Hit Points from taking damage, you can take a Reaction to reduce an Undead creature under your control that you can see to 0 Hit Points. You then immediately regain a number of Hit Points equal to your Wizard level."
        },
        {
          "level": 14,
          "name": "Death's Master",
          "desc": "Abstruse rituals within your spellbook allow you mastery over undeath. While holding your spellbook, you gain the following benefits.\nBolster Undead: As a Bonus Action, choose any number of Undead you have created or summoned with a Necromancy spell that are within 60 feet of you. Those Undead each gain Temporary Hit Points equal to your Wizard level. Once you use this Bonus Action, you can't do so again until you finish a Long Rest.\nExtinguish Undead: When an Undead creature you can see is reduced to 0 Hit Points, you can cause it to explode with necrotic energy. Roll a number of d6s equal to half the creature's unexpended Hit Dice (round up, minimum of 1d6), and add them together. Each creature in a 10-foot Emanation originating from the Undead makes a Dexterity saving throw. On a failed save, a target takes Necrotic damage equal to the number rolled and can't take Reactions until the start of its next turn. On a successful save, a target takes half as much damage only. When you use this feature to explode an Undead creature you don't control, you must take a Reaction and expend a level 5+ spell slot to do so."
        }
      ]
    },
    "Order of Scribes": {
      "features": [
        {
          "level": 2,
          "name": "Awakened Spellbook",
          "desc": "2nd-level Order of Scribes feature\nUsing specially prepared inks and ancient incantations passed down by your wizardly order, you have awakened an arcane sentience within your spellbook.\nWhile you are holding the book, it grants you the following benefits:\n\u2022 You can use the book as a spellcasting focus for your wizard spells.\n\u2022 When you cast a wizard spell with a spell slot, you can temporarily replace its damage type with a type that appears in another spell in your spellbook, which magically alters the spell's formula for this casting only. The latter spell must be of the same level as the spell slot you expend.\n\u2022 When you cast a wizard spell as a ritual, you can use the spell's normal casting time, rather than adding 10 minutes to it. Once you use this benefit, you can't do so again until you finish a long rest.\nIf necessary, you can replace the book over the course of a short rest by using your Wizardly Quill to write arcane sigils in a blank book or a magic spellbook to which you're attuned. At the end of the rest, your spellbook's consciousness is summoned into the new book, which the consciousness transforms into your spellbook, along with all its spells. If the previous book still existed somewhere, all the spells vanish from its pages."
        },
        {
          "level": 2,
          "name": "Order of Scribes",
          "desc": "Magic of the book-that's what many folk call wizardry. The name is apt, given how much time wizards spend poring over tomes and penning theories about the nature of magic. It's rare to see wizards traveling without books and scrolls sprouting from their bags, and a wizard would go to great lengths to plumb an archive of ancient knowledge.\nAmong wizards, the Order of Scribes is the most bookish. It takes many forms in different worlds, but its primary mission is the same everywhere: recording magical discoveries so that wizardry can flourish. And while all wizards value spellbooks, a wizard in the Order of Scribes magically awakens their book, turning it into a trusted companion. All wizards study books, but a wizardly scribe talks to theirs!"
        },
        {
          "level": 2,
          "name": "Wizardly Quill",
          "desc": "2nd-level Order of Scribes feature\nAs a bonus action, you can magically create a Tiny quill in your free hand. The magic quill has the following properties:\n\u2022 The quill doesn't require ink. When you write with it, it produces ink in a color of your choice on the writing surface.\n\u2022 The time you must spend to copy a spell into your spellbook equals 2 minutes per spell level if you use the quill for the transcription.\n\u2022 You can erase anything you write with the quill if you wave the feather over the text as a bonus action, provided the text is within 5 feet of you.\nThis quill disappears if you create another one or if you die."
        },
        {
          "level": 6,
          "name": "Manifest Mind",
          "desc": "6th-level Order of Scribes feature\nYou can conjure forth the mind of your Awakened Spellbook. As a bonus action while the book is on your person, you can cause the mind to manifest as a Tiny spectral object, hovering in an unoccupied space of your choice within 60 feet of you. The spectral mind is intangible and doesn't occupy its space, and it sheds dim light in a 10-foot radius. It looks like a ghostly tome, a cascade of text, or a scholar from the past (your choice).\nWhile manifested, the spectral mind can hear and see, and it has darkvision with a range of 60 feet. The mind can telepathically share with you what it sees and hears (no action required).\nWhenever you cast a wizard spell on your turn, you can cast it as if you were in the spectral mind's space, instead of your own, using its senses. You can do so a number of times per day equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\nAs a bonus action, you can cause the spectral mind to hover up to 30 feet to an unoccupied space that you or it can see. It can pass through creatures but not objects.\nThe spectral mind stops manifesting if it is ever more than 300 feet away from you, if someone casts Dispel Magic on it, if the Awakened Spellbook is destroyed, if you die, or if you dismiss the spectral mind as a bonus action.\nOnce you conjure the mind, you can't do so again until you finish a long rest, unless you expend a spell slot of any level to conjure it again."
        },
        {
          "level": 10,
          "name": "Master Scrivener",
          "desc": "10th-level Order of Scribes feature\nWhenever you finish a long rest, you can create one magic scroll by touching your Wizardly Quill to a blank piece of paper or parchment and causing one spell from your Awakened Spellbook to be copied onto the scroll. The spellbook must be within 5 feet of you when you make the scroll.\nThe chosen spell must be of 1st or 2nd level and must have a casting time of 1 action. Once in the scroll, the spell's power is enhanced, counting as one level higher than normal. You can cast the spell from the scroll by reading it as an action. The scroll is unintelligible to anyone else, and the spell vanishes from the scroll when you cast it or when you finish your next long rest.\nYou are also adept at crafting spell scrolls, which are described in the treasure chapter of the Dungeon Master's Guide. The gold and time you must spend to make such a scroll are halved if you use your Wizardly Quill."
        },
        {
          "level": 14,
          "name": "One with the Word",
          "desc": "14th-level Order of Scribes feature\nYour connection to your Awakened Spellbook has become so profound that your soul has become entwined with it. While the book is on your person, you have advantage on all Intelligence (Arcana) checks, as the spellbook helps you remember magical lore.\nMoreover, if you take damage while your spellbook's mind is manifested, you can prevent all of that damage to you by using your reaction to dismiss the spectral mind, using its magic to save yourself. Then roll 3d6. The spellbook temporarily loses spells of your choice that have a combined spell level equal to that roll or higher. For example, if the roll's total is 9, spells vanish from the book that have a combined level of at least 9, which could mean one 9th-level spell, three 3rd-level spells, or some other combination. If there aren't enough spells in the book to cover this cost, you drop to 0 hit points.\nUntil you finish 1d6 long rests, you are incapable of casting the lost spells, even if you find them on a scroll or in another spellbook. After you finish the required number of rests, the spells reappear in the spellbook.\nOnce you use this reaction, you can't do so again until you finish a long rest."
        }
      ]
    },
    "School of Abjuration": {
      "features": [
        {
          "level": 2,
          "name": "Abjuration Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy an abjuration spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "Arcane Ward",
          "desc": "Starting at 2nd level, you can weave magic around yourself for protection. When you cast an abjuration spell of 1st level or higher, you can simultaneously use a strand of the spell's magic to create a magical ward on yourself that lasts until you finish a long rest. The ward has a hit point maximum equal to twice your wizard level + your Intelligence modifier. Whenever you take damage, the ward takes the damage instead. If this damage reduces the ward to 0 hit points, you take any remaining damage.\nWhile the ward has 0 hit points, it can't absorb damage, but its magic remains. Whenever you cast an abjuration spell of 1st level or higher, the ward regains a number of hit points equal to twice the level of the spell.\nOnce you create the ward, you can't create it again until you finish a long rest."
        },
        {
          "level": 2,
          "name": "School of Abjuration",
          "desc": "The School of Abjuration emphasizes magic that blocks, banishes, or protects. Detractors of this school say that its tradition is about denial, negation rather than positive assertion. You understand, however, that ending harmful effects, protecting the weak, and banishing evil influences is anything but a philosophical void. It is a proud and respected vocation.\nCalled abjurers, members of this school are sought when baleful spirits require exorcism, when important locations must be guarded against magical spying, and when portals to other planes of existence must be closed."
        },
        {
          "level": 6,
          "name": "Projected Ward",
          "desc": "Starting at 6th level, when a creature that you can see within 30 feet of you takes damage, you can use your reaction to cause your Arcane Ward to absorb that damage. If this damage reduces the ward to 0 hit points, the warded creature takes any remaining damage."
        },
        {
          "level": 10,
          "name": "Improved Abjuration",
          "desc": "Beginning at 10th level, when you cast an abjuration spell that requires you to make an ability check as a part of casting that spell (as in Counterspell and Dispel Magic), you add your proficiency bonus to that ability check."
        },
        {
          "level": 14,
          "name": "Spell Resistance",
          "desc": "Starting at 14th level, you have advantage on saving throws against spells.\nFurthermore, you have resistance against the damage of spells."
        }
      ]
    },
    "School of Conjuration": {
      "features": [
        {
          "level": 2,
          "name": "Conjuration Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a conjuration spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "Minor Conjuration",
          "desc": "Starting at 2nd level when you select this school, you can use your action to conjure up an inanimate object in your hand or on the ground in an unoccupied space that you can see within 10 feet of you. This object can be no larger than 3 feet on a side and weigh no more than 10 pounds, and its form must be that of a nonmagical object that you have seen. The object is visibly magical, radiating dim light out to 5 feet.\nThe object disappears after 1 hour, when you use this feature again, if it takes any damage, or if it deals any damage."
        },
        {
          "level": 2,
          "name": "School of Conjuration",
          "desc": "As a conjurer, you favor spells that produce objects and creatures out of thin air. You can conjure billowing clouds of killing fog or summon creatures from elsewhere to fight on your behalf. As your mastery grows, you learn spells of transportation and can teleport yourself across vast distances, even to other planes of existence, in an instant."
        },
        {
          "level": 6,
          "name": "Benign Transposition",
          "desc": "Starting at 6th level, you can use your action to teleport up to 30 feet to an unoccupied space that you can see. Alternatively, you can choose a space within range that is occupied by a Small or Medium creature. If that creature is willing, you both teleport, swapping places.\nOnce you use this feature, you can't use it again until you finish a long rest or you cast a conjuration spell of 1st level or higher."
        },
        {
          "level": 10,
          "name": "Focused Conjuration",
          "desc": "Beginning at 10th level, while you are concentrating on a conjuration spell, your concentration can't be broken as a result of taking damage."
        },
        {
          "level": 14,
          "name": "Durable Summons",
          "desc": "Starting at 14th level, any creature that you summon or create with a conjuration spell has 30 temporary hit points."
        }
      ]
    },
    "School of Divination": {
      "features": [
        {
          "level": 2,
          "name": "Divination Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a divination spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "Portent",
          "desc": "Starting at 2nd level when you choose this school, glimpses of the future begin to press in on your awareness. When you finish a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll, and you can replace a roll in this way only once per turn.\nEach foretelling roll can be used only once. When you finish a long rest, you lose any unused foretelling rolls."
        },
        {
          "level": 2,
          "name": "School of Divination",
          "desc": "The counsel of a diviner is sought by royalty and commoners alike, for all seek a clearer understanding of the past, present, and future. As a diviner, you strive to part the veils of space, time, and consciousness so that you can see clearly. You work to master spells of discernment, remote viewing, supernatural knowledge, and foresight."
        },
        {
          "level": 6,
          "name": "Expert Divination",
          "desc": "Beginning at 6th level, casting divination spells comes so easily to you that it expends only a fraction of your spellcasting efforts. When you cast a divination spell of 2nd level or higher using a spell slot, you regain one expended spell slot. The slot you regain must be of a level lower than the spell you cast and can't be higher than 5th level."
        },
        {
          "level": 10,
          "name": "The Third Eye",
          "desc": "Starting at 10th level, you can use your action to increase your powers of perception. When you do so, choose one of the following benefits, which lasts until you are incapacitated or you take a short or long rest. You can't use the feature again until you finish a rest.\nDarkvision: You gain darkvision out to a range of 60 feet.\nEthereal Sight: You can see into the Ethereal Plane within 60 feet of you.\nGreater Comprehension: You can read any language.\nSee Invisibility: You can see invisible creatures and objects within 10 feet of you that are within line of sight."
        },
        {
          "level": 14,
          "name": "Greater Portent",
          "desc": "Starting at 14th level, the visions in your dreams intensify and paint a more accurate picture in your mind of what is to come. You roll three d20s for your Portent feature, rather than two."
        }
      ]
    },
    "School of Enchantment": {
      "features": [
        {
          "level": 2,
          "name": "Enchantment Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy an enchantment spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "Hypnotic Gaze",
          "desc": "Starting at 2nd level when you choose this school, your soft words and enchanting gaze can magically enthrall another creature. As an action, choose one creature that you can see within 5 feet of you. If the target can see or hear you, it must succeed on a Wisdom saving throw against your wizard spell save DC or be charmed by you until the end of your next turn. The charmed creature's speed drops to 0, and the creature is incapacitated and visibly dazed.\nOn subsequent turns, you can use your action to maintain this effect, extending its duration until the end of your next turn. However, the effect ends if you move more than 5 feet away from the creature, if the creature can neither see nor hear you, or if the creature takes damage.\nOnce the effect ends, or if the creature succeeds on its initial saving throw against this effect, you can't use this feature on that creature again until you finish a long rest."
        },
        {
          "level": 2,
          "name": "School of Enchantment",
          "desc": "As a member of the School of Enchantment, you have honed your ability to magically entrance and beguile other people and monsters. Some enchanters are peacemakers who bewitch the violent to lay down their arms and charm the cruel into showing mercy. Others are tyrants who magically bind the unwilling into their service. Most enchanters fall somewhere in between."
        },
        {
          "level": 6,
          "name": "Instinctive Charm",
          "desc": "Beginning at 6th level, when a creature you can see within 30 feet of you makes an attack roll against you, you can use your reaction to divert the attack, provided that another creature is within the attack's range. The attacker must make a Wisdom saving throw against your wizard spell save DC. On a failed save, the attacker must target the creature that is closest to it, not including you or itself. If multiple creatures are closest, the attacker chooses which one to target. On a successful save, you can't use this feature on the attacker again until you finish a long rest.\nYou must choose to use this feature before knowing whether the attack hits or misses. Creatures that can't be charmed are immune to this effect."
        },
        {
          "level": 10,
          "name": "Split Enchantment",
          "desc": "Starting at 10th level, when you cast an enchantment spell of 1st level or higher that targets only one creature, you can have it target a second creature."
        },
        {
          "level": 14,
          "name": "Alter Memories",
          "desc": "At 14th level, you gain the ability to make a creature unaware of your magical influence on it. When you cast an enchantment spell to charm one or more creatures, you can alter one creature's understanding so that it remains unaware of being charmed.\nAdditionally, once before the spell expires, you can use your action to try to make the chosen creature forget some of the time it spent charmed. The creature must succeed on an Intelligence saving throw against your wizard spell save DC or lose a number of hours of its memories equal to 1 + your Charisma modifier (minimum of 1). You can make the creature forget less time, and the amount of time can't exceed the duration of your enchantment spell."
        }
      ]
    },
    "School of Evocation": {
      "features": [
        {
          "level": 2,
          "name": "Evocation Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy an evocation spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "School of Evocation",
          "desc": "You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some evokers find employment in military forces, serving as artillery to blast enemy armies from afar. Others use their spectacular power to protect the weak, while some seek their own gain as bandits, adventurers, or aspiring tyrants."
        },
        {
          "level": 2,
          "name": "Sculpt Spells",
          "desc": "Beginning at 2nd level, you can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save."
        },
        {
          "level": 6,
          "name": "Potent Cantrip",
          "desc": "Starting at 6th level, your damaging cantrips affect even creatures that avoid the brunt of the effect. When a creature succeeds on a saving throw against your cantrip, the creature takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip."
        },
        {
          "level": 10,
          "name": "Empowered Evocation",
          "desc": "Beginning at 10th level, you can add your Intelligence modifier to one damage roll of any wizard evocation spell you cast."
        },
        {
          "level": 14,
          "name": "Overchannel",
          "desc": "Starting at 14th level, you can increase the power of your simpler spells. When you cast a wizard spell of 1st through 5th-level that deals damage, you can deal maximum damage with that spell.\nThe first time you do so, you suffer no adverse effect. If you use this feature again before you finish a long rest, you take 2d12 necrotic damage for each level of the spell, immediately after you cast it. Each time you use this feature again before finishing a long rest, the necrotic damage per spell level increases by 1d12. This damage ignores resistance and immunity."
        }
      ]
    },
    "School of Illusion": {
      "features": [
        {
          "level": 2,
          "name": "Illusion Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy an illusion spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "Improved Minor Illusion",
          "desc": "When you choose this school at 2nd level, you learn the Minor Illusion cantrip. If you already know this cantrip, you learn a different wizard cantrip of your choice. The cantrip doesn't count against your number of cantrips known.\nWhen you cast Minor Illusion, you can create both a sound and an image with a single casting of the spell."
        },
        {
          "level": 2,
          "name": "School of Illusion",
          "desc": "You focus your studies on magic that dazzles the senses, befuddles the mind, and tricks even the wisest folk. Your magic is subtle, but the illusions crafted by your keen mind make the impossible seem real. Some illusionists\u2014including many gnome wizards\u2014are benign tricksters who use their spells to entertain. Others are more sinister masters of deception, using their illusions to frighten and fool others for their personal gain."
        },
        {
          "level": 6,
          "name": "Malleable Illusions",
          "desc": "Starting at 6th level, when you cast an illusion spell that has a duration of 1 minute or longer, you can use your action to change the nature of that illusion (using the spell's normal parameters for the illusion), provided that you can see the illusion."
        },
        {
          "level": 10,
          "name": "Illusory Self",
          "desc": "Beginning at 10th level, you can create an illusory duplicate of yourself as an instant, almost instinctual reaction to danger. When a creature makes an attack roll against you, you can use your reaction to interpose the illusory duplicate between the attacker and yourself. The attack automatically misses you, then the illusion dissipates.\nOnce you use this feature, you can't use it again until you finish a short or long rest."
        },
        {
          "level": 14,
          "name": "Illusory Reality",
          "desc": "By 14th level, you have learned the secret of weaving shadow magic into your illusions to give them a semi-reality. When you cast an illusion spell of 1st level or higher, you can choose one inanimate, nonmagical object that is part of the illusion and make that object real. You can do this on your turn as a bonus action while the spell is ongoing. The object remains real for 1 minute. For example, you can create an illusion of a bridge over a chasm and then make it real long enough for your allies to cross.\nThe object can't deal damage or otherwise directly harm anyone."
        }
      ]
    },
    "School of Necromancy": {
      "features": [
        {
          "level": 2,
          "name": "Grim Harvest",
          "desc": "At 2nd level, you gain the ability to reap life energy from creatures you kill with your spells. Once per turn when you kill one or more creatures with a spell of 1st level or higher, you regain hit points equal to twice the spell's level, or three times its level if the spell belongs to the School of Necromancy. You don't gain this benefit for killing constructs or undead."
        },
        {
          "level": 2,
          "name": "Necromancy Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a necromancy spell into your spellbook is halved."
        },
        {
          "level": 2,
          "name": "School of Necromancy",
          "desc": "The School of Necromancy explores the cosmic forces of life, death, and undeath. As you focus your studies in this tradition, you learn to manipulate the energy that animates all living things. As you progress, you learn to sap the life force from a creature as your magic destroys its body, transforming that vital energy into magical power you can manipulate.\nMost people see necromancers as menacing, or even villainous, due to the close association with death. Not all necromancers are evil, but the forces they manipulate are considered taboo by many societies."
        },
        {
          "level": 6,
          "name": "Undead Thralls",
          "desc": "At 6th level, you add the Animate Dead spell to your spellbook if it is not there already. When you cast Animate Dead, you can target one additional corpse or pile of bones, creating another zombie or skeleton, as appropriate.\nWhenever you create an undead using a necromancy spell, it has additional benefits:\n\u2022 The creature's hit point maximum is increased by an amount equal to your wizard level.\n\u2022 The creature adds your proficiency bonus to its weapon damage rolls."
        },
        {
          "level": 10,
          "name": "Inured to Undeath",
          "desc": "Beginning at 10th level, you have resistance to necrotic damage, and your hit point maximum can't be reduced. You have spent so much time dealing with undead and the forces that animate them that you have become inured to some of their worst effects."
        },
        {
          "level": 14,
          "name": "Command Undead",
          "desc": "Starting at 14th level, you can use magic to bring undead under your control, even those created by other wizards. As an action, you can choose one undead that you can see within 60 feet of you. That creature must make a Charisma saving throw against your wizard spell save DC. If it succeeds, you can't use this feature on it again. If it fails, it becomes friendly to you and obeys your commands until you use this feature again.\nIntelligent undead are harder to control in this way. If the target has an Intelligence of 8 or higher, it has advantage on the saving throw. If it fails the saving throw and has an Intelligence of 12 or higher, it can repeat the saving throw at the end of every hour until it succeeds and breaks free."
        }
      ]
    },
    "School of Transmutation": {
      "features": [
        {
          "level": 2,
          "name": "Minor Alchemy",
          "desc": "Starting at 2nd level when you select this school, you can temporarily alter the physical properties of one nonmagical object, changing it from one substance into another. You perform a special alchemical procedure on one object composed entirely of wood, stone (but not a gemstone), iron, copper, or silver, transforming it into a different one of those materials. For each 10 minutes you spend performing the procedure, you can transform up to 1 cubic foot of material. After 1 hour, or until you lose your concentration (as if you were concentrating on a spell), the material reverts to its original substance."
        },
        {
          "level": 2,
          "name": "School of Transmutation",
          "desc": "You are a student of spells that modify energy and matter. To you, the world is not a fixed thing, but eminently mutable, and you delight in being an agent of change. You wield the raw stuff of creation and learn to alter both physical forms and mental qualities. Your magic gives you the tools to become a smith on reality's forge.\nSome transmuters are tinkerers and pranksters, turning people into toads and transforming copper into silver for fun and occasional profit. Others pursue their magical studies with deadly seriousness, seeking the power of the gods to make and destroy worlds."
        },
        {
          "level": 2,
          "name": "Transmutation Savant",
          "desc": "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a transmutation spell into your spellbook is halved."
        },
        {
          "level": 6,
          "name": "Transmuter's Stone",
          "desc": "Starting at 6th level, you can spend 8 hours creating a transmuter's stone that stores transmutation magic. You can benefit from the stone yourself or give it to another creature. A creature gains a benefit of your choice as long as the stone is in the creature's possession. When you create the stone, choose the benefit from the following options:\n\u2022 Darkvision out to a range of 60 feet, as described in chapter 8.\n\u2022 An increase to speed of 10 feet while the creature is unencumbered.\n\u2022 Proficiency in Constitution saving throws.\n\u2022 Resistance to acid, cold, fire, lightning, or thunder damage (your choice whenever you choose this benefit).\nEach time you cast a transmutation spell of 1st level or higher, you can change the effect of your stone if the stone is on your person.\nIf you create a new transmuter's stone, the previous one ceases to function."
        },
        {
          "level": 10,
          "name": "Shapechanger",
          "desc": "At 10th level, you add the Polymorph spell to your spellbook, if it is not there already. You can cast Polymorph without expending a spell slot. When you do so, you can target only yourself and transform into a beast whose challenge rating is 1 or lower.\nOnce you cast Polymorph in this way, you can't do so again until you finish a short or long rest, though you can still cast it normally using an available spell slot."
        },
        {
          "level": 14,
          "name": "Master Transmuter",
          "desc": "Starting at 14th level, you can use your action to consume the reserve of transmutation magic stored within your transmuter's stone in a single burst. When you do so, choose one of the following effects. Your transmuter's stone is destroyed and can't be remade until you finish a long rest.\nMajor Transformation: You can transmute one nonmagical object\u2014no larger than a 5-foot cube\u2014into another nonmagical object of similar size and mass and of equal or lesser value. You must spend 10 minutes handling the object to transform it.\nPanacea: You remove all curses, diseases, and poisons affecting a creature that you touch with the transmuter's stone. The creature also regains all its hit points.\nRestore Life: You cast the Raise Dead spell on a creature you touch with the transmuter's stone, without expending a spell slot or needing to have the spell in your spellbook.\nRestore Youth: You touch the transmuter's stone to a willing creature, and that creature's apparent age is reduced by 3d10 years, to a minimum of 13 years. This effect doesn't extend the creature's lifespan."
        }
      ]
    },
    "Transmuter": {
      "features": [
        {
          "level": 3,
          "name": "Transmutation Savant",
          "desc": "Choose two Wizard spells from the Transmutation school, each of which must be no higher than level 2, and add them to your spellbook for free.\nIn addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Transmutation school to your spellbook for free. The chosen spell must be of a level for which you have spell slots."
        },
        {
          "level": 3,
          "name": "Transmuter",
          "desc": "Transform Energy and Matter\nYou study spells that modify energy and matter\u2014to you, the world is eminently mutable. Using your magic, you become a smith at reality's forge.\nSome Transmuters are tinkerers and pranksters. Others seek the power to make and destroy worlds."
        },
        {
          "level": 3,
          "name": "Transmuter's Stone",
          "desc": "When you finish a Long Rest, you can create a magic stone that lasts until you use this feature again. The stone is a Tiny object, and you can use it as a Spellcasting Focus for your Wizard spells. A creature with the stone in its possession gains proficiency in Constitution saving throws and one of the following benefits, which you choose when you create the stone. You can change the stone's benefit when you cast a Transmutation spell using a spell slot.\nDarkvision: The bearer gains Darkvision with a range of 60 feet or increases the range of its Darkvision by 60 feet.\nResistance: The bearer gains Resistance to Acid, Cold, Fire, Lightning, Poison, or Thunder damage (your choice each time you choose this benefit).\nSpeed: The bearer's Speed increases by 10 feet."
        },
        {
          "level": 3,
          "name": "Wondrous Alteration",
          "desc": "You always have the Alter Self spell prepared and can cast it once without expending a spell slot. You regain the ability to cast it in this way when you finish a Long Rest.\nWhile under the effects of Alter Self, you gain an additional benefit for each of its options.\nAquatic Adaptation: While underwater, you can take the Dash action as a Bonus Action.\nChange Appearance: You have Advantage on Charisma (Deception) checks.\nNatural Weapons: The damage of your new growth increases to 2d6 damage of the type associated with the growth. You also have Advantage on Constitution saving throws to maintain Concentration."
        },
        {
          "level": 6,
          "name": "Empowered Transmutation",
          "desc": "When you use a spell slot to cast a Transmutation spell that doesn't make an attack roll or force a saving throw, such as Fly or Magic Weapon, you can increase the spell's effective level by 1.\nYou can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
        },
        {
          "level": 10,
          "name": "Potent Stone",
          "desc": "Your Transmuter's Stone is more versatile. When you create your Transmuter's Stone, you can choose up to two benefits. You can choose each option other than Resistance only once. If you choose Resistance twice, you must choose different damage types. You can change either or both benefits when you cast a Transmutation spell using a spell slot.\nIn addition, the following are now among your benefit options for Transmuter's Stone.\nMighty Build: The bearer has Advantage on Strength saving throws. The bearer also counts as one size larger when determining its carrying capacity.\nTremorsense: The bearer gains Tremorsense with a range of 30 feet."
        },
        {
          "level": 10,
          "name": "Shape-Shifter",
          "desc": "You always have the Polymorph spell prepared and can cast it once without expending a spell slot. You regain the ability to cast it in this way when you finish a Long Rest.\nIn addition, when you target yourself with the spell, you can modify the spell to gain the benefits below. Once you modify the spell using this feature, you can't do so again until you finish a Long Rest.\nGame Statistics: In addition to retaining the features specified in the spell, you retain your memories and ability to communicate. You also retain your Intelligence, Wisdom, and Charisma scores; proficiencies; class features; and feats.\nTransmute Spells: While shape-shifted, you can cast spells, but only Transmutation spells that don't have a Material component that has a specified cost or that is consumed by the spell."
        },
        {
          "level": 14,
          "name": "Master Transmuter",
          "desc": "While you carry your Transmuter's Stone, you can take a Magic action to consume the reserve of transmutation magic stored inside and choose one of the following benefits. After you use the stone in this way, it crumbles to dust. You can prevent the stone from crumbling by expending a level 7+ spell slot as part of the Magic action you take using this feature.\nMajor Transformation: You can transmute one nonmagical object\u2014no larger than a 10-foot Cube or eight connected 5-foot Cubes\u2014into another nonmagical object of similar size and mass and of equal or lesser value. You must spend 10 minutes handling the object to transform it.\nPanacea: You touch a creature as part of this Magic action, and the target regains a number of Hit Points equal to half its Hit Point maximum (round down). The target is cured of all magical contagions, and any curses affecting the target are lifted, including the target's Attunement to a cursed item. If the target has the Poisoned or Petrified condition, those conditions end.\nRestore Life: You cast the Raise Dead spell without expending a spell slot, using the stone in place of the required Material components.\nRestore Youth: You touch one willing creature as part of this Magic action, and the target's Exhaustion level, if any, decreases to 0, and it permanently appears 3d10 years younger, to a minimum of young adulthood."
        }
      ]
    },
    "War Magic": {
      "features": [
        {
          "level": 2,
          "name": "Arcane Deflection",
          "desc": "At 2nd level, you have learned to weave your magic to fortify yourself against harm. When you are hit by an attack or you fail a saving throw, you can use your reaction to gain a +2 bonus to your AC against that attack or a +4 bonus to that saving throw.\nWhen you use this feature, you can't cast spells other than cantrips until the end of your next turn."
        },
        {
          "level": 2,
          "name": "Tactical Wit",
          "desc": "Starting at 2nd level, your keen ability to assess tactical situations allows you to act quickly in battle. You can give yourself a bonus to your initiative rolls equal to your Intelligence modifier."
        },
        {
          "level": 2,
          "name": "War Magic",
          "desc": "A variety of arcane colleges specialize in training wizards for war. The tradition of War Magic blends principles of evocation and abjuration, rather than specializing in either of those schools. It teaches techniques that empower a caster's spells, while also providing methods for wizards to bolster their own defenses.\nFollowers of this tradition are known as war mages. They see their magic as both a weapon and armor, a resource superior to any piece of steel. War mages act fast in battle, using their spells to seize tactical control of a situation. Their spells strike hard, while their defensive skills foil their opponents' attempts to counterattack. War mages are also adept at turning other spellcasters' magical energy against them.\nIn great battles, a war mage often works with evokers, abjurers, and other types of wizards. Evokers, in particular, sometimes tease war mages for splitting their attention between offense and defense. A war mage's typical response: \"What good is being able to throw a mighty Fireball if I die before I can cast it?\""
        },
        {
          "level": 6,
          "name": "Power Surge",
          "desc": "Starting at 6th level, you can store magical energy within yourself to later empower your damaging spells. In its stored form, this energy is called a power surge.\nYou can store a maximum number of power surges equal to your Intelligence modifier (minimum of one). Whenever you finish a long rest, your number of power surges resets to one. Whenever you successfully end a spell with Dispel Magic or Counterspell, you gain one power surge, as you steal magic from the spell you foiled. If you end a short rest with no power surges, you gain one power surge.\nOnce per turn when you deal damage to a creature or object with a wizard spell, you can spend one power surge to deal extra force damage to that target. The extra damage equals half your wizard level."
        },
        {
          "level": 10,
          "name": "Durable Magic",
          "desc": "Beginning at 10th level, the magic you channel helps ward off harm. While you maintain concentration on a spell, you have a +2 bonus to AC and all saving throws."
        },
        {
          "level": 14,
          "name": "Deflecting Shroud",
          "desc": "At 14th level, your Arcane Deflection becomes infused with deadly magic. When you use your Arcane Deflection feature, you can cause magical energy to arc from you. Up to three creatures of your choice that you can see within 60 feet of you each take force damage equal to half your wizard level."
        }
      ]
    }
  }
};

export const IMPORTED_CLASS_FEATURES = {
  "Artificer": {
    "features": [
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "You have learned how to channel magical energy through objects. See the Player's Handbook for the rules on spellcasting. The information below details how you use those rules with Artificer spells, which appear in the Artificer spell list later in the class's description.\nTools Required: You produce your Artificer spells through tools. You can use Thieves' Tools, Tinker's Tools, or another kind of Artisan's Tools with which you have proficiency as a Spellcasting Focus, and you must have one of those focuses in hand when you cast an Artificer spell (meaning the spell has an M component when you cast it).\nCantrips: You know two Artificer cantrips of your choice. Acid Splash and Prestidigitation are recommended. Whenever you finish a Long Rest, you can replace one of your cantrips from this feature with another Artificer cantrip of your choice. When you reach Artificer levels 10 and 14, you learn another Artificer cantrip of your choice, as shown in the Cantrips column of the Artificer Features table.\nSpell Slots: The Artificer Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Artificer spells. Cure Wounds and Grease are recommended. The number of spells on your list increases as you gain Artificer levels, as shown in the Prepared Spells column of the Artificer Features table. Whenever that number increases, choose additional Artificer spells until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 5 Artificer, your list of prepared spells can include six Artificer spells of levels 1 and 2 in any combination. If another Artificer feature gives you spells that you always have prepared, those don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Artificer spells for you.\nChanging Your Prepared Spells: Whenever you finish a Long Rest, you can change your list of prepared spells, replacing any of the spells there with other Artificer spells for which you have spell slots.\nSpellcasting Ability: Intelligence is your spellcasting ability for your Artificer spells."
      },
      {
        "level": 1,
        "name": "Tinker's Magic",
        "desc": "You know the Mending cantrip.\nAs a Magic action while holding Tinker's Tools, you can create one item in an unoccupied space within 5 feet of yourself, choosing the item from the following list:\n\u2022 Ball Bearings\n\u2022 Basket\n\u2022 Bedroll\n\u2022 Bell\n\u2022 Blanket\n\u2022 Block and Tackle\n\u2022 Bottle, Glass\n\u2022 Bucket\n\u2022 Caltrops\n\u2022 Candle\n\u2022 Crowbar\n\u2022 Flask\n\u2022 Grappling Hook\n\u2022 Hunting Trap\n\u2022 Jug\n\u2022 Lamp\n\u2022 Manacles\n\u2022 Net\n\u2022 Oil\n\u2022 Paper\n\u2022 Parchment\n\u2022 Pole\n\u2022 Pouch\n\u2022 Rope\n\u2022 Sack\n\u2022 Shovel\n\u2022 Spikes, Iron\n\u2022 String\n\u2022 Tinderbox\n\u2022 Torch\n\u2022 Vial\nSee the rules for the item in the Player's Handbook. The item lasts until you finish a Long Rest, at which point it vanishes.\nYou can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
      },
      {
        "level": 2,
        "name": "Replicate Magic Item",
        "desc": "You have learned arcane plans that you use to make magic items.\nPlans Known: When you gain this feature, choose four plans to learn from the Magic Item Plans (Artificer Level 2+) table (see the Dungeon Master's Guide for the items' descriptions). Bag of Holding, Cap of Water Breathing, Sending Stones, and Wand of the War Mage are recommended. Whenever you gain an Artificer level, you can replace one of the plans you know with a new plan for which you qualify. You learn another plan of your choice when you reach certain Artificer levels, as shown in the Plans Known column of the Artificer Features table. When you choose a plan to learn, you choose it from any Magic Item Plans table for which you qualify; your qualification is based on your Artificer level.\nCreating an Item: When you finish a Long Rest, you can create one or two different magic items if you have Tinker's Tools in hand. Each item is based on one of the plans you know for this feature. If a created item requires Attunement, you can attune yourself to it the instant you create it. If you decide to attune to the item later, you must do so using the normal process for Attunement. When you reach certain Artificer levels specified in the Magic Items column of the Artificer Features table, the number of magic items you can create at the end of a Long Rest increases. Each item you create must be based on a different plan you know. You can't have more magic items from this feature than the number shown in the Magic Items column of the Artificer Features table for your level. If you try to exceed your maximum number of magic items for this feature, the oldest item vanishes, and then the new item appears.\nDuration: A magic item created by this feature functions as the normal magic item, except its magic isn't permanent; when you die, the magic item vanishes after 1d4 days. If you replace a plan you know with a new plan, any magic item created with the replaced plan immediately vanishes. If an item that you created with this feature is a container, such as a Bag of Holding, and it vanishes, its contents harmlessly appear in and around its space.\nSpellcasting Focus: You can use any Wand or Weapon created by this feature as a Spellcasting Focus in lieu of using a set of Artisan's Tools.\nCrafting More Magic Items: The Replicate Magic Item feature isn't the only way for an Artificer to make magic items. The Dungeon Master's Guide provides rules for characters\u2014not just Artificers\u2014who want to make magic items of all sorts. Though many different characters can make magic items, Artificers can do it faster than others; each Artificer subclass improves a character's speed at making items of a certain category. When an Artificer crafts a magic item using the normal rules in the Dungeon Master's Guide, the character gains no special connection to that item. Class features that refer to items created by your Replicate Magic Item feature don't apply to items you craft by other means.\nMagic Item Plan | Attunement\nAlchemy Jug \u2014 No\nBag of Holding \u2014 No\nCap of Water Breathing \u2014 No\nCommon magic item that isn't a Potion, a Scroll, or cursed* \u2014 Varies\nGoggles of Night \u2014 No\nManifold Tool \u2014 Yes\nRepeating Shot \u2014 Yes\nReturning Weapon \u2014 No\nRope of Climbing \u2014 No\nSending Stones \u2014 No\nShield +1 \u2014 No\nWand of Magic Detection \u2014 No\nWand of Secrets \u2014 No\nWand of the War Mage +1 \u2014 Yes\nWeapon +1 \u2014 No\nWraps of Unarmed Power, +1 \u2014 No\nMagic Item Plan | Attunement\nArmor +1 \u2014 No\nBoots of Elvenkind \u2014 No\nBoots of the Winding Path \u2014 Yes\nCloak of Elvenkind \u2014 Yes\nCloak of the Manta Ray \u2014 Yes\nDazzling Weapon \u2014 Yes\nEyes of Charming \u2014 Yes\nEyes of Minute Seeing \u2014 No\nGloves of Thievery \u2014 No\nHelm of Awareness \u2014 No\nLantern of Revealing \u2014 No\nMind Sharpener \u2014 Yes\nNecklace of Adaptation \u2014 Yes\nPipes of Haunting \u2014 No\nRepulsion Shield \u2014 No\nRing of Swimming \u2014 No\nRing of Water Walking \u2014 No\nSentinel Shield \u2014 No\nSpell-Refueling Ring \u2014 Yes\nWand of Magic Missiles \u2014 No\nWand of Web \u2014 Yes\nWeapon of Warning \u2014 Yes\nMagic Item Plan | Attunement\nArmor of Resistance \u2014 Yes\nDagger of Venom \u2014 No\nElven Chain \u2014 No\nRing of Feather Falling \u2014 Yes\nRing of Jumping \u2014 Yes\nRing of Mind Shielding \u2014 Yes\nShield, +2 \u2014 No\nUncommon Wondrous Item that isn't cursed* \u2014 Varies\nWand of the War Mage, +2 \u2014 Yes\nWeapon, +2 \u2014 No\nWraps of Unarmed Power, +2 \u2014 No\nMagic Item Plan | Attunement\nArmor, +2 \u2014 No\nArrow-Catching Shield \u2014 Yes\nFlame Tongue \u2014 Yes\nRare Wondrous Item that isn't cursed* \u2014 Varies\nRing of Free Action \u2014 Yes\nRing of Protection \u2014 Yes\nRing of the Ram \u2014 Yes"
      },
      {
        "level": 3,
        "name": "Artificer Subclass",
        "desc": "You gain an Artificer subclass of your choice. The Alchemist, Armorer, Artillerist, Battle Smith, and Cartographer subclasses are detailed after this class's description. A subclass is a specialization that grants you features at certain Artificer levels. For the rest of your career, you gain each of your subclass's features that are of your Artificer level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Artificer levels 8, 12, and 16."
      },
      {
        "level": 6,
        "name": "Magic Item Tinker",
        "desc": "Your Replicate Magic Item feature gains the following options.\nCharge Magic Item: As a Bonus Action, you can touch a magic item within 5 feet of yourself that you created with Replicate Magic Item and that uses charges. You expend a level 1+ spell slot and recharge the item. The number of charges the item regains is equal to the level of spell slot expended.\nDrain Magic Item: As a Bonus Action, you can touch a magic item within 5 feet of yourself that you created with Replicate Magic Item and cause the item to vanish, converting its magical energy into a spell slot. The slot is level 1 if the item is Common or level 2 if the item is Uncommon or Rare. Once you use this feature, you can't do so again until you finish a Long Rest. Any spell slot you create with this feature vanishes when you finish a Long Rest.\nTransmute Magic Item: As a Magic action, you can touch one magic item within 5 feet of yourself that you created with Replicate Magic Item and transform it into a different magic item. The resulting item must be based on a magic item plan you know. Once you use this feature, you can't do so again until you finish a Long Rest."
      },
      {
        "level": 7,
        "name": "Flash of Genius",
        "desc": "When you or a creature you can see within 30 feet of you fails an ability check or a saving throw, you can take a Reaction to add a bonus to the roll, potentially causing it to succeed. The bonus equals your Intelligence modifier (minimum of +1).\nYou can take this Reaction a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a Long Rest."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 10,
        "name": "Magic Item Adept",
        "desc": "You can now attune to up to four magic items at once."
      },
      {
        "level": 11,
        "name": "Spell-Storing Item",
        "desc": "Whenever you finish a Long Rest, you can touch one Simple or Martial weapon or one item that you can use as a Spellcasting Focus, and you store a spell in it, choosing a level 1, 2, or 3 Artificer spell that has a casting time of an action and doesn't require a Material component that is consumed by the spell (you needn't have the spell prepared).\nWhile holding the object, a creature can take a Magic action to produce the spell's effect from it, using your spellcasting ability modifier. If the spell requires Concentration, the creature must concentrate. Once a creature has used the object to produce the spell's effect, the object can't be used this way again until the start of the creature's next turn.\nThe spell stays in the object until it's been used a number of times equal to twice your Intelligence modifier (minimum of twice) or until you use this feature again to store a spell in an object."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 14,
        "name": "Advanced Artifice",
        "desc": "You gain the following benefits.\nMagic Item Savant: You can now attune to up to five magic items at once.\nRefreshed Genius: When you finish a Short Rest, you regain one expended use of your Flash of Genius feature."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Magic Item Master",
        "desc": "You can now attune to up to six magic items at once."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Energy Resistance is recommended."
      },
      {
        "level": 20,
        "name": "Soul of Artifice",
        "desc": "You have developed a mystical connection to your magic items, which you can draw on for aid. You gain the following benefits.\nCheat Death: If you're reduced to 0 Hit Points but not killed outright, you can disintegrate any number of Uncommon or Rare magic items created by your Replicate Magic Item feature. If you do so, your Hit Points instead change to a number equal to 20 times the number of magic items disintegrated.\nMagical Guidance: When you finish a Short Rest, you regain all expended uses of your Flash of Genius if you have Attunement to at least one magic item."
      }
    ]
  },
  "Barbarian": {
    "features": [
      {
        "level": 1,
        "name": "Rage",
        "desc": "You can imbue yourself with a primal power called Rage, a force that grants you extraordinary might and resilience. You can enter it as a Bonus Action if you aren't wearing Heavy armor.\nYou can enter your Rage the number of times shown for your Barbarian level in the Rages column of the Barbarian Features table. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.\nWhile active, your Rage follows the rules below.\nDamage Resistance: You have Resistance to Bludgeoning, Piercing, and Slashing damage.\nRage Damage: When you make an attack using Strength\u2014with either a weapon or an Unarmed Strike\u2014and deal damage to the target, you gain a bonus to the damage that increases as you gain levels as a Barbarian, as shown in the Rage Damage column of the Barbarian Features table.\nStrength Advantage: You have Advantage on Strength checks and Strength saving throws.\nNo Concentration or Spells: You can't maintain Concentration, and you can't cast spells.\nDuration: The Rage lasts until the end of your next turn, and it ends early if you don Heavy armor or have the Incapacitated condition. If your Rage is still active on your next turn, you can extend the Rage for another round by doing one of the following: \u2022 Make an attack roll against an enemy. \u2022 Force an enemy to make a saving throw. \u2022 Take a Bonus Action to extend your Rage.\nEach time the Rage is extended, it lasts until the end of your next turn. You can maintain a Rage for up to 10 minutes."
      },
      {
        "level": 1,
        "name": "Unarmored Defense",
        "desc": "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit."
      },
      {
        "level": 1,
        "name": "Weapon Mastery",
        "desc": "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, such as Greataxes and Handaxes. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices.\nWhen you reach certain Barbarian levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Barbarian Features table."
      },
      {
        "level": 2,
        "name": "Danger Sense",
        "desc": "You gain an uncanny sense of when things aren't as they should be, giving you an edge when you dodge perils. You have Advantage on Dexterity saving throws unless you have the Incapacitated condition."
      },
      {
        "level": 2,
        "name": "Reckless Attack",
        "desc": "You can throw aside all concern for defense to attack with increased ferocity. When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time."
      },
      {
        "level": 3,
        "name": "Barbarian Subclass",
        "desc": "You gain a Barbarian subclass of your choice. A subclass is a specialization that grants you features at certain Barbarian levels. For the rest of your career, you gain each of your subclass's features that are of your Barbarian level or lower."
      },
      {
        "level": 3,
        "name": "Primal Knowledge",
        "desc": "You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1.\nIn addition, while your Rage is active, you can channel primal power when you attempt certain tasks; whenever you make an ability check using one of the following skills, you can make it as a Strength check even if it normally uses a different ability: Acrobatics, Intimidation, Perception, Stealth, or Survival. When you use this ability, your Strength represents primal power coursing through you, honing your agility, bearing, and senses."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Extra Attack",
        "desc": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "level": 5,
        "name": "Fast Movement",
        "desc": "Your speed increases by 10 feet while you aren't wearing Heavy armor."
      },
      {
        "level": 7,
        "name": "Feral Instinct",
        "desc": "Your instincts are so honed that you have Advantage on Initiative rolls."
      },
      {
        "level": 7,
        "name": "Instinctive Pounce",
        "desc": "As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Brutal Strike",
        "desc": "If you use Reckless Attack, you can forgo any Advantage on one Strength-based attack roll of your choice on your turn. The chosen attack roll mustn't have Disadvantage. If the chosen attack roll hits, the target takes an extra 1d10 damage of the same type dealt by the weapon or Unarmed Strike, and you can cause one Brutal Strike effect of your choice. You have the following effect options.\nForceful Blow: The target is pushed 15 feet straight away from you. You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks.\nHamstring Blow: The target's Speed is reduced by 15 feet until the start of your next turn. A target can be affected by only one Hamstring Blow at a time\u2014the most recent one."
      },
      {
        "level": 11,
        "name": "Relentless Rage",
        "desc": "Your Rage can keep you fighting despite grievous wounds. If you drop to 0 Hit Points while your Rage is active and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, your Hit Points instead change to a number equal to twice your Barbarian level.\nEach time you use this feature after the first, the DC increases by 5. When you finish a Short or Long Rest, the DC resets to 10."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 13,
        "name": "Improved Brutal Strike",
        "desc": "You have honed new ways to attack furiously. The following effects are now among your Brutal Strike options.\nStaggering Blow: The target has Disadvantage on the next saving throw it makes, and it can't make Opportunity Attacks until the start of your next turn.\nSundering Blow: Before the start of your next turn, the next attack roll made by another creature against the target gains a +5 bonus to the roll. An attack roll can gain only one Sundering Blow bonus."
      },
      {
        "level": 15,
        "name": "Persistent Rage",
        "desc": "When you roll Initiative, you can regain all expended uses of Rage. After you regain uses of Rage in this way, you can't do so again until you finish a Long Rest.\nIn addition, your Rage is so fierce that it now lasts for 10 minutes without you needing to do anything to extend it from round to round. Your Rage ends early if you have the Unconscious condition (not just the Incapacitated condition) or don Heavy armor."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 17,
        "name": "Improved Brutal Strike",
        "desc": "The extra damage of your Brutal Strike increases to 2d10. In addition, you can use two different Brutal Strike effects whenever you use your Brutal Strike feature."
      },
      {
        "level": 18,
        "name": "Indomitable Might",
        "desc": "If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended."
      },
      {
        "level": 20,
        "name": "Primal Champion",
        "desc": "You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25."
      }
    ]
  },
  "Bard": {
    "features": [
      {
        "level": 1,
        "name": "Bardic Inspiration",
        "desc": "You can supernaturally inspire others through words, music, or dance. This inspiration is represented by your Bardic Inspiration die, which is a d6.\nUsing Bardic Inspiration: As a Bonus Action, you can inspire another creature within 60 feet of yourself who can see or hear you. That creature gains one of your Bardic Inspiration dice. A creature can have only one Bardic Inspiration die at a time. Once within the next hour when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the d20, potentially turning the failure into a success. A Bardic Inspiration die is expended when it's rolled.\nNumber of Uses: You can confer a Bardic Inspiration die a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nAt Higher Levels: Your Bardic Inspiration die changes when you reach certain Bard levels, as shown in the Bardic Die column of the Bard Features table. The die becomes a d8 at level 5, a d10 at level 10, and a d12 at level 15."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "You have learned to cast spells through your bardic arts. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Bard spells, which appear in the Bard spell list later in the class's description.\nCantrips: You know two cantrips of your choice from the Bard spell list. Dancing Lights and Vicious Mockery are recommended. Whenever you gain a Bard level, you can replace one of your cantrips with another cantrip of your choice from the Bard spell list. When you reach Bard levels 4 and 10, you learn another cantrip of your choice from the Bard spell list, as shown in the Cantrips column of the Bard Features table.\nSpell Slots: The Bard Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose four level 1 spells from the Bard spell list. Charm Person, Color Spray, Dissonant Whispers, and Healing Word are recommended. The number of spells on your list increases as you gain Bard levels, as shown in the Prepared Spells column of the Bard Features table. Whenever that number increases, choose additional spells from the Bard spell list until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 3 Bard, your list of prepared spells can include six spells of levels 1 and 2 in any combination. If another Bard feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Bard spells for you.\nChanging Your Prepared Spells: Whenever you gain a Bard level, you can replace one spell on your list with another Bard spell for which you have spell slots.\nSpellcasting Ability: Charisma is your spellcasting ability for your Bard spells.\nSpellcasting Focus: You can use a Musical Instrument as a Spellcasting Focus for your Bard spells."
      },
      {
        "level": 2,
        "name": "Expertise",
        "desc": "You gain Expertise in two of your skill proficiencies of your choice. Performance and Persuasion are recommended if you have proficiency in them.\nAt Bard level 9, you gain Expertise in two more of your skill proficiencies of your choice."
      },
      {
        "level": 2,
        "name": "Jack of All Trades",
        "desc": "You can add half your Proficiency Bonus (round down) to any ability check you make that uses a skill proficiency you lack and that doesn't otherwise use your Proficiency Bonus.\nFor example, if you make a Strength (Athletics) check and lack Athletics proficiency, you can add half your Proficiency Bonus to the check.\nA Bard's Repertoire: Does your Bard beat a drum while chanting the deeds of ancient heroes? Strum a lute while crooning romantic tunes? Perform arias of stirring power? Recite dramatic monologues from classic tragedies? Use the rhythm of a folk dance to coordinate the movement of allies in battle? Compose naughty limericks? When you play a Bard, consider the style of artistic performance you favor, the moods you might invoke, and the themes that inspire your own creations. Are your poems inspired by moments of natural beauty, or are they brooding reflections on loss? Do you prefer lofty hymns or rowdy tavern songs? Are you drawn to laments for the fallen or celebrations of joy? Do you dance merry jigs or perform elaborate interpretive choreography? Do you focus on one style of performance or strive to master them all?"
      },
      {
        "level": 3,
        "name": "Bard Subclass",
        "desc": "You gain a Bard subclass of your choice. A subclass is a specialization that grants you features at certain Bard levels. For the rest of your career, you gain each of your subclass's features that are of your Bard level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Bard levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Font of Inspiration",
        "desc": "You now regain all your expended uses of Bardic Inspiration when you finish a Short or Long Rest.\nIn addition, you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration."
      },
      {
        "level": 7,
        "name": "Countercharm",
        "desc": "You can use musical notes or words of power to disrupt mind-influencing effects. If you or a creature within 30 feet of you fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to cause the save to be rerolled, and the new roll has Advantage."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Expertise",
        "desc": "You gain Expertise in two of your Skill Proficiencies of your choice."
      },
      {
        "level": 10,
        "name": "Magical Secrets",
        "desc": "You've learned secrets from various magical traditions. Whenever you reach a Bard level (including this level) and the Prepared Spells number in the Bard Features table increases, you can choose any of your new prepared spells from the Bard, Cleric, Druid, and Wizard spell lists, and the chosen spells count as Bard spells for you (see a class's section for its spell list). In addition, whenever you replace a spell prepared for this class, you can replace it with a spell from those lists."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Superior Inspiration",
        "desc": "When you roll Initiative, you regain expended uses of Bardic Inspiration until you have two if you have fewer than that."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Spell Recall is recommended."
      },
      {
        "level": 20,
        "name": "Words of Creation",
        "desc": "You have mastered two of the Words of Creation: the words of life and death. You therefore always have the Power Word Heal and Power Word Kill spells prepared. When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target."
      }
    ]
  },
  "Cleric": {
    "features": [
      {
        "level": 1,
        "name": "Divine Order",
        "desc": "You have dedicated yourself to one of the following sacred roles of your choice."
      },
      {
        "level": 1,
        "name": "Protector",
        "desc": "Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "You have learned to cast spells through prayer and meditation. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Cleric spells, which appear on the Cleric spell list later in the class's description.\nCantrips: You know three cantrips of your choice from the Cleric spell list. Guidance, Sacred Flame, and Thaumaturgy are recommended. Whenever you gain a Cleric level, you can replace one of your cantrips with another cantrip of your choice from the Cleric spell list. When you reach Cleric levels 4 and 10, you learn another cantrip of your choice from the Cleric spell list, as shown in the Cantrips column of the Cleric Features table.\nSpell Slots: The Cleric Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose four level 1 spells from the Cleric spell list. Bless, Cure Wounds, Guiding Bolt, and Shield Of Faith are recommended. The number of spells on your list increases as you gain Cleric levels, as shown in the Prepared Spells column of the Cleric Features table. Whenever that number increases, choose additional spells from the Cleric spell list until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 3 Cleric, your list of prepared spells can include six spells of levels 1 and 2 in any combination. If another Cleric feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Cleric spells for you.\nChanging Your Prepared Spells: Whenever you finish a Long Rest, you can change your list of prepared spells, replacing any of the spells there with other Cleric spells for which you have spell slots.\nSpellcasting Ability: Wisdom is your spellcasting ability for your Cleric spells.\nSpellcasting Focus: You can use a Holy Symbol as a Spellcasting Focus for your Cleric spells."
      },
      {
        "level": 1,
        "name": "Thaumaturge",
        "desc": "You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1)."
      },
      {
        "level": 2,
        "name": "Channel Divinity",
        "desc": "You can channel divine energy directly from the Outer Planes to fuel magical effects. You start with two such effects: Divine Spark and Turn Undead, each of which is described below. Each time you use this class's Channel Divinity, choose which Channel Divinity effect from this class to create. You gain additional effect options at higher Cleric levels.\nYou can use this class's Channel Divinity twice. You regain one of its expended uses when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest. You gain additional uses when you reach certain Cleric levels, as shown in the Channel Divinity column of the Cleric Features table.\nIf a Channel Divinity effect requires a saving throw, the DC equals the spell save DC from this class's Spellcasting feature."
      },
      {
        "level": 2,
        "name": "Divine Spark",
        "desc": "As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw. On a failed save, the creature takes Necrotic or Radiant damage (your choice) equal to that total. On a successful save, the creature takes half as much damage (round down).\nYou roll an additional d8 when you reach Cleric levels 7 (2d8), 13 (3d8), and 18 (4d8)."
      },
      {
        "level": 2,
        "name": "Turn Undead",
        "desc": "As a Magic action, you present your Holy Symbol and censure Undead creatures. Each Undead of your choice within 30 feet of you must make a Wisdom saving throw. If the creature fails its save, it has the Frightened and Incapacitated conditions for 1 minute. For that duration, it tries to move as far from you as it can on its turns. This effect ends early on the creature if it takes any damage, if you have the Incapacitated condition, or if you die."
      },
      {
        "level": 3,
        "name": "Cleric Subclass",
        "desc": "You gain a Cleric subclass of your choice. A subclass is a specialization that grants you features at certain Cleric levels. For the rest of your career, you gain each of your subclass's features that are of your Cleric level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Cleric levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Sear Undead",
        "desc": "Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum of 1d8) and add the rolls together. Each Undead that fails its saving throw against that use of Turn Undead takes Radiant damage equal to the roll's total. This damage doesn't end the turn effect."
      },
      {
        "level": 7,
        "name": "Blessed Strikes",
        "desc": "Divine power infuses you in battle. You gain one of the following options of your choice (if you get either option from a Cleric subclass in an older book, use only the option you choose for this feature)."
      },
      {
        "level": 7,
        "name": "Divine Strike",
        "desc": "Once on each of your turns when you hit a creature with an attack roll using a weapon, you can cause the target to take an extra 1d8 Necrotic or Radiant damage (your choice)."
      },
      {
        "level": 7,
        "name": "Potent Spellcasting",
        "desc": "Add your Wisdom modifier to the damage you deal with any Cleric cantrip."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 10,
        "name": "Divine Intervention",
        "desc": "You can call on your deity or pantheon to intervene on your behalf. As a Magic action, choose any Cleric spell of level 5 or lower that doesn't require a Reaction to cast. As part of the same action, you cast that spell without expending a spell slot or needing Material components. You can't use this feature again until you finish a Long Rest."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 14,
        "name": "Improved Blessed Strikes",
        "desc": "The option you chose for Blessed Strikes grows more powerful.\nDivine Strike: The extra damage of your Divine Strike increases to 2d8.\nPotent Spellcasting: When you cast a Cleric cantrip and deal damage to a creature with it, you can give vitality to yourself or another creature within 60 feet of yourself, granting a number of Temporary Hit Points equal to twice your Wisdom modifier."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended."
      },
      {
        "level": 20,
        "name": "Greater Divine Intervention",
        "desc": "You can call on even more powerful divine intervention. When you use your Divine Intervention feature, you can choose Wish when you select a spell. If you do so, you can't use Divine Intervention again until you finish 2d4 Long Rests."
      }
    ]
  },
  "Druid": {
    "features": [
      {
        "level": 1,
        "name": "Druidic",
        "desc": "You know Druidic, the secret language of Druids. While learning this ancient tongue, you also unlocked the magic of communicating with animals; you always have the Speak With Animals spell prepared.\nYou can use Druidic to leave hidden messages. You and others who know Druidic automatically spot such a message. Others spot the message's presence with a successful DC 15 Intelligence (Investigation) check but can't decipher it without magic."
      },
      {
        "level": 1,
        "name": "Magician",
        "desc": "You know one extra cantrip from the Druid spell list. In addition, your mystical connection to nature gives you a bonus to your Intelligence (Arcana or Nature) checks. The bonus equals your Wisdom modifier (minimum bonus of +1)."
      },
      {
        "level": 1,
        "name": "Primal Order",
        "desc": "You have dedicated yourself to one of the following sacred roles of your choice."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "You have learned to cast spells through studying the mystical forces of nature. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Druid spells, which appear on the Druid spell list later in the class's description.\nCantrips: You know two cantrips of your choice from the Druid spell list. Druidcraft and Produce Flame are recommended. Whenever you gain a Druid level, you can replace one of your cantrips with another cantrip of your choice from the Druid spell list. When you reach Druid levels 4 and 10, you learn another cantrip of your choice from the Druid spell list, as shown in the Cantrips column of the Druid Features table.\nSpell Slots: The Druid Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose four level 1 spells from the Druid spell list. Animal Friendship, Cure Wounds, Faerie Fire, and Thunderwave are recommended. The number of spells on your list increases as you gain Druid levels, as shown in the Prepared Spells column of the Druid Features table. Whenever that number increases, choose additional spells from the Druid spell list until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 3 Druid, your list of prepared spells can include six spells of levels 1 and 2 in any combination. If another Druid feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Druid spells for you.\nChanging Your Prepared Spells: Whenever you finish a Long Rest, you can change your list of prepared spells, replacing any of the spells with other Druid spells for which you have spell slots.\nSpellcasting Ability: Wisdom is your spellcasting ability for your Druid spells.\nSpellcasting Focus: You can use a Druidic Focus as a Spellcasting Focus for your Druid spells."
      },
      {
        "level": 1,
        "name": "Warden",
        "desc": "Trained for battle, you gain proficiency with Martial weapons and training with Medium armor."
      },
      {
        "level": 2,
        "name": "Wild Companion",
        "desc": "You can summon a nature spirit that assumes an animal form to aid you. As a Magic action, you can expend a spell slot or a use of Wild Shape to cast the Find Familiar spell without Material components.\nWhen you cast the spell in this way, the familiar is Fey and disappears when you finish a Long Rest."
      },
      {
        "level": 2,
        "name": "Wild Shape",
        "desc": "The power of nature allows you to assume the form of an animal. As a Bonus Action, you shape-shift into a Beast form that you have learned for this feature (see \"Known Forms\" below). You stay in that form for a number of hours equal to half your Druid level or until you use Wild Shape again, have the Incapacitated condition, or die. You can also leave the form early as a Bonus Action.\nNumber of Uses: You can use Wild Shape twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest. You gain additional uses when you reach certain Druid levels, as shown in the Wild Shape column of the Druid Features table.\nKnown Forms: You know four Beast forms for this feature, chosen from among Beast stat blocks that have a maximum Challenge Rating of 1/4 and that lack a Fly Speed (see appendix B for stat block options). The Rat, Riding Horse, Spider, and Wolf are recommended. Whenever you finish a Long Rest, you can replace one of your known forms with another eligible form. When you reach certain Druid levels, your number of known forms and the maximum Challenge Rating for those forms increases, as shown in the Beast Shapes table. In addition, starting at level 8, you can adopt a form that has a Fly Speed. When choosing known forms, you may look in the Monster Manual or elsewhere for eligible Beasts if the Dungeon Master permits you to do so.\nDruid Level | Known Forms | Max CR | Fly Speed\n2 \u2014 4 \u2014 1/4 \u2014 No\n4 \u2014 6 \u2014 1/2 \u2014 No\n8 \u2014 8 \u2014 1 \u2014 Yes\nRules While Shape-Shifted: While in a form, you retain your personality, memories, and ability to speak, and the following rules apply: \u2022 Temporary Hit Points: When you assume a Wild Shape form, you gain a number of Temporary Hit Points equal to your Druid level. \u2022 Game Statistics: Your game statistics are replaced by the Beast's stat block, but you retain your creature type; Hit Points; Hit Point Dice; Intelligence, Wisdom, and Charisma scores; class features; languages; and feats. You also retain your skill and saving throw proficiencies and use your Proficiency Bonus for them, in addition to gaining the proficiencies of the creature. If a skill or saving throw modifier in the Beast's stat block is higher than yours, use the one in the stat block. \u2022 No Spellcasting: You can't cast spells, but shape-shifting doesn't break your Concentration or otherwise interfere with a spell you've already cast. \u2022 Objects: Your ability to handle objects is determined by the form's limbs rather than your own. In addition, you choose whether your equipment falls in your space, merges into your new form, or is worn by it. Worn equipment functions as normal, but the DM decides whether it's practical for the new form to wear a piece of equipment based on the creature's size and shape. Your equipment doesn't change size or shape to match the new form, and any equipment that the new form can't wear must either fall to the ground or merge with the form. Equipment that merges with the form has no effect while you're in that form."
      },
      {
        "level": 3,
        "name": "Druid Subclass",
        "desc": "You gain a Druid subclass of your choice. A subclass is a specialization that grants you features at certain Druid levels. For the rest of your career, you gain each of your subclass's features that are of your Druid level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Druid levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Wild Resurgence",
        "desc": "Once on each of your turns, if you have no uses of Wild Shape left, you can give yourself one use by expending a spell slot (no action required).\nIn addition, you can expend one use of Wild Shape (no action required) to give yourself a level 1 spell slot, but you can't do so again until you finish a Long Rest."
      },
      {
        "level": 7,
        "name": "Elemental Fury",
        "desc": "The might of the elements flows through you. You gain one of the following options of your choice."
      },
      {
        "level": 7,
        "name": "Potent Spellcasting",
        "desc": "Add your Wisdom modifier to the damage you deal with any Druid cantrip."
      },
      {
        "level": 7,
        "name": "Primal Strike",
        "desc": "Once on each of your turns when you hit a creature with an attack roll using a weapon or a Beast form's attack in Wild Shape, you can cause the target to take an extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose when you hit)."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 15,
        "name": "Improved Elemental Fury",
        "desc": "The option you chose for Elemental Fury grows more powerful, as detailed below.\nPotent Spellcasting: When you cast a Druid cantrip with a range of 10 feet or greater, the spell's range increases by 300 feet.\nPrimal Strike: The extra damage of your Primal Strike increases to 2d8."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Beast Spells",
        "desc": "While using Wild Shape, you can cast spells in Beast form, except for any spell that has a Material component with a cost specified or that consumes its Material component."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended."
      },
      {
        "level": 20,
        "name": "Archdruid",
        "desc": "The vitality of nature constantly blooms within you, granting you the following benefits.\nEvergreen Wild Shape: Whenever you roll Initiative and have no uses of Wild Shape left, you regain one expended use of it.\nNature Magician: You can convert uses of Wild Shape into a spell slot (no action required). Choose a number of your unexpended uses of Wild Shape and convert them into a single spell slot, with each use contributing 2 spell levels. For example, if you convert two uses of Wild Shape, you produce a level 4 spell slot. Once you use this benefit, you can't do so again until you finish a Long Rest.\nLongevity: The primal magic that you wield causes you to age more slowly. For every ten years that pass, your body ages only one year."
      }
    ]
  },
  "Fighter": {
    "features": [
      {
        "level": 1,
        "name": "Fighting Style",
        "desc": "You have honed your martial prowess and gain a Fighting Style feat of your choice. Defense is recommended.\nWhenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat."
      },
      {
        "level": 1,
        "name": "Second Wind",
        "desc": "You have a limited well of physical and mental stamina that you can draw on. As a Bonus Action, you can use it to regain Hit Points equal to 1d10 plus your Fighter level.\nYou can use this feature twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.\nWhen you reach certain Fighter levels, you gain more uses of this feature, as shown in the Second Wind column of the Fighter Features table."
      },
      {
        "level": 1,
        "name": "Weapon Mastery",
        "desc": "Your training with weapons allows you to use the mastery properties of three kinds of Simple or Martial weapons of your choice. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices.\nWhen you reach certain Fighter levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Fighter Features table."
      },
      {
        "level": 2,
        "name": "Action Surge",
        "desc": "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action.\nOnce you use this feature, you can't do so again until you finish a Short or Long Rest. Starting at level 17, you can use it twice before a rest but only once on a turn."
      },
      {
        "level": 2,
        "name": "Tactical Mind",
        "desc": "You have a mind for tactics on and off the battlefield. When you fail an ability check, you can expend a use of your Second Wind to push yourself toward success. Rather than regaining Hit Points, you roll 1d10 and add the number rolled to the ability check, potentially turning it into a success. If the check still fails, this use of Second Wind isn't expended."
      },
      {
        "level": 3,
        "name": "Fighter Subclass",
        "desc": "You gain a Fighter subclass of your choice. A subclass is a specialization that grants you features at certain Fighter levels. For the rest of your career, you gain each of your subclass's features that are of your Fighter level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16."
      },
      {
        "level": 5,
        "name": "Extra Attack",
        "desc": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "level": 5,
        "name": "Tactical Shift",
        "desc": "Whenever you activate your Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks."
      },
      {
        "level": 6,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Indomitable",
        "desc": "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.\nYou can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17."
      },
      {
        "level": 9,
        "name": "Tactical Master",
        "desc": "When you attack with a weapon whose mastery property you can use, you can replace that property with the Push, Sap, or Slow property for that attack."
      },
      {
        "level": 11,
        "name": "Two Extra Attacks",
        "desc": "You can attack three times instead of once whenever you take the Attack action on your turn."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 13,
        "name": "Indomitable",
        "desc": "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.\nYou can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17."
      },
      {
        "level": 13,
        "name": "Studied Attacks",
        "desc": "You study your opponents and learn from each attack you make. If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "level": 14,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 17,
        "name": "Action Surge",
        "desc": "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action.\nOnce you use this feature, you can't do so again until you finish a Short or Long Rest. Starting at level 17, you can use it twice before a rest but only once on a turn."
      },
      {
        "level": 17,
        "name": "Indomitable",
        "desc": "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.\nYou can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended."
      },
      {
        "level": 20,
        "name": "Three Extra Attacks",
        "desc": "You can attack four times instead of once whenever you take the Attack action on your turn."
      }
    ]
  },
  "Monk": {
    "features": [
      {
        "level": 1,
        "name": "Bonus Unarmed Strike",
        "desc": "You can make an Unarmed Strike as a Bonus Action."
      },
      {
        "level": 1,
        "name": "Dexterous Attacks",
        "desc": "You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons. In addition, when you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."
      },
      {
        "level": 1,
        "name": "Martial Arts",
        "desc": "Your practice of martial arts gives you mastery of combat styles that use your Unarmed Strike and Monk weapons, which are the following:\n\u2022 Simple Melee Weapons\n\u2022 Martial Melee Weapons that have the Light property\nYou gain the following benefits while you are unarmed or wielding only Monk weapons and you aren't wearing armor or wielding a Shield."
      },
      {
        "level": 1,
        "name": "Martial Arts Die",
        "desc": "You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. This die changes as you gain Monk levels, as shown in the Martial Arts column of the Monk Features table."
      },
      {
        "level": 1,
        "name": "Unarmored Defense",
        "desc": "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers."
      },
      {
        "level": 2,
        "name": "Flurry of Blows",
        "desc": "You can expend 1 Focus Point to make two Unarmed Strikes as a Bonus Action."
      },
      {
        "level": 2,
        "name": "Monk's Focus",
        "desc": "Your focus and martial training allow you to harness a well of extraordinary energy within yourself. This energy is represented by Focus Points. Your Monk level determines the number of points you have, as shown in the Focus Points column of the Monk Features table.\nYou can expend these points to enhance or fuel certain Monk features. You start knowing three such features: Flurry of Blows, Patient Defense, and Step of the Wind, each of which is detailed below.\nWhen you expend a Focus Point, it is unavailable until you finish a Short or Long Rest, at the end of which you regain all your expended points.\nSome features that use Focus Points require your target to make a saving throw. The save DC equals 8 plus your Wisdom modifier and Proficiency Bonus."
      },
      {
        "level": 2,
        "name": "Patient Defense",
        "desc": "You can take the Disengage action as a Bonus Action. Alternatively, you can expend 1 Focus Point to take both the Disengage and the Dodge actions as a Bonus Action."
      },
      {
        "level": 2,
        "name": "Step of the Wind",
        "desc": "You can take the Dash action as a Bonus Action. Alternatively, you can expend 1 Focus Point to take both the Disengage and Dash actions as a Bonus Action, and your jump distance is doubled for the turn."
      },
      {
        "level": 2,
        "name": "Unarmored Movement",
        "desc": "Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield. This bonus increases when you reach certain Monk levels, as shown on the Monk Features table."
      },
      {
        "level": 2,
        "name": "Uncanny Metabolism",
        "desc": "When you roll Initiative, you can regain all expended Focus Points. When you do so, roll your Martial Arts die, and regain a number of Hit Points equal to your Monk level plus the number rolled.\nOnce you use this feature, you can't use it again until you finish a Long Rest."
      },
      {
        "level": 3,
        "name": "Deflect Attacks",
        "desc": "When an attack roll hits you and its damage includes Bludgeoning, Piercing, or Slashing damage, you can take a Reaction to reduce the attack's total damage against you. The reduction equals 1d10 plus your Dexterity modifier and Monk level.\nIf you reduce the damage to 0, you can expend 1 Focus Point to redirect some of the attack's force. If you do so, choose a creature you can see within 5 feet of yourself if the attack was a melee attack or a creature you can see within 60 feet of yourself that isn't behind Total Cover if the attack was a ranged attack. That creature must succeed on a Dexterity saving throw or take damage equal to two rolls of your Martial Arts die plus your Dexterity modifier. The damage is the same type dealt by the attack."
      },
      {
        "level": 3,
        "name": "Monk Subclass",
        "desc": "You gain a Monk subclass of your choice. A subclass is a specialization that grants you features at certain Monk levels. For the rest of your career, you gain each of your subclass's features that are of your Monk level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Monk levels 8, 12, and 16."
      },
      {
        "level": 4,
        "name": "Slow Fall",
        "desc": "You can take a Reaction when you fall to reduce any damage you take from the fall by an amount equal to five times your Monk level."
      },
      {
        "level": 5,
        "name": "Extra Attack",
        "desc": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "level": 5,
        "name": "Stunning Strike",
        "desc": "Once per turn when you hit a creature with a Monk weapon or an Unarmed Strike, you can expend 1 Focus Point to attempt a stunning strike. The target must make a Constitution saving throw. On a failed save, the target has the Stunned condition until the start of your next turn. On a successful save, the target's Speed is halved until the start of your next turn, and the next attack roll made against the target before then has Advantage."
      },
      {
        "level": 6,
        "name": "Empowered Strikes",
        "desc": "Whenever you deal damage with your Unarmed Strike, it can deal your choice of Force damage or its normal damage type."
      },
      {
        "level": 7,
        "name": "Evasion",
        "desc": "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail.\nYou don't benefit from this feature if you have the Incapacitated condition."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Acrobatic Movement",
        "desc": "While you aren't wearing armor or wielding a Shield, you gain the ability to move along vertical surfaces and across liquids on your turn without falling during the movement."
      },
      {
        "level": 10,
        "name": "Heightened Focus",
        "desc": "Your Flurry of Blows, Patient Defense, and Step of the Wind gain the following benefits.\nFlurry of Blows: You can expend 1 Focus Point to use Flurry of Blows and make three Unarmed Strikes with it instead of two.\nPatient Defense: When you expend a Focus Point to use Patient Defense, you gain a number of Temporary Hit Points equal to two rolls of your Martial Arts die.\nStep of the Wind: When you expend a Focus Point to use Step of the Wind, you can choose a willing creature within 5 feet of yourself that is Large or smaller. You move the creature with you until the end of your turn. The creature's movement doesn't provoke Opportunity Attacks."
      },
      {
        "level": 10,
        "name": "Self-Restoration",
        "desc": "Through sheer force of will, you can remove one of the following conditions from yourself at the end of each of your turns: Charmed, Frightened, or Poisoned.\nIn addition, forgoing food and drink doesn't give you levels of Exhaustion."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 13,
        "name": "Deflect Energy",
        "desc": "You can now use your Deflect Attacks feature against attacks that deal any damage type, not just Bludgeoning, Piercing, or Slashing."
      },
      {
        "level": 14,
        "name": "Disciplined Survivor",
        "desc": "Your physical and mental discipline grant you proficiency in all saving throws.\nAdditionally, whenever you make a saving throw and fail, you can expend 1 Focus Point to reroll it, and you must use the new roll."
      },
      {
        "level": 15,
        "name": "Perfect Focus",
        "desc": "When you roll Initiative and don't use Uncanny Metabolism, you regain expended Focus Points until you have 4 if you have 3 or fewer."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Superior Defense",
        "desc": "At the start of your turn, you can expend 3 Focus Points to bolster yourself against harm for 1 minute or until you have the Incapacitated condition. During that time, you have Resistance to all damage except Force damage."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended."
      },
      {
        "level": 20,
        "name": "Body and Mind",
        "desc": "You have developed your body and mind to new heights. Your Dexterity and Wisdom scores increase by 4, to a maximum of 25."
      }
    ]
  },
  "Paladin": {
    "features": [
      {
        "level": 1,
        "name": "Lay on Hands",
        "desc": "Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total number of Hit Points equal to five times your Paladin level.\nAs a Bonus Action, you can touch a creature (which could be yourself) and draw power from the pool of healing to restore a number of Hit Points to that creature, up to the maximum amount remaining in the pool.\nYou can also expend 5 Hit Points from the pool of healing power to remove the Poisoned condition from the creature; those points don't also restore Hit Points to the creature."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "You have learned to cast spells through prayer and meditation. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Paladin spells, which appear in the Paladin spell list later in the class's description.\nSpell Slots: The Paladin Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Paladin spells. Heroism and Searing Smite are recommended. The number of spells on your list increases as you gain Paladin levels, as shown in the Prepared Spells column of the Paladin Features table. Whenever that number increases, choose additional Paladin spells until the number of spells on your list matches the number in the Paladin Features table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 5 Paladin, your list of prepared spells can include six Paladin spells of level 1 or 2 in any combination. If another Paladin feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Paladin spells for you.\nChanging Your Prepared Spells: Whenever you finish a Long Rest, you can replace one spell on your list with another Paladin spell for which you have spell slots.\nSpellcasting Ability: Charisma is your spellcasting ability for your Paladin spells.\nSpellcasting Focus: You can use a Holy Symbol as a Spellcasting Focus for your Paladin spells."
      },
      {
        "level": 1,
        "name": "Weapon Mastery",
        "desc": "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Longswords and Javelins.\nWhenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Halberds and Flails."
      },
      {
        "level": 2,
        "name": "Fighting Style",
        "desc": "You gain a Fighting Style feat of your choice. Instead of choosing one of those feats, you can choose the option below."
      },
      {
        "level": 2,
        "name": "Paladin's Smite",
        "desc": "You always have the Divine Smite spell prepared. In addition, you can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again."
      },
      {
        "level": 3,
        "name": "Channel Divinity",
        "desc": "You can channel divine energy directly from the Outer Planes, using it to fuel magical effects. You start with one such effect: Divine Sense, which is described below. Other Paladin features give additional Channel Divinity effect options. Each time you use this class's Channel Divinity, you choose which effect from this class to create.\nYou can use this class's Channel Divinity twice. You regain one of its expended uses when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest. You gain an additional use when you reach Paladin level 11.\nIf a Channel Divinity effect requires a saving throw, the DC equals the spell save DC from this class's Spellcasting feature."
      },
      {
        "level": 3,
        "name": "Divine Sense",
        "desc": "As a Bonus Action, you can open your awareness to detect Celestials, Fiends, and Undead. For the next 10 minutes or until you have the Incapacitated condition, you know the location of any creature of those types within 60 feet of yourself, and you know its creature type. Within the same radius, you also detect the presence of any place or object that has been consecrated or desecrated, as with the Hallow spell."
      },
      {
        "level": 3,
        "name": "Paladin Subclass",
        "desc": "You gain a Paladin subclass of your choice. A subclass is a specialization that grants you features at certain Paladin levels. For the rest of your career, you gain each of your subclass's features that are of your Paladin level or lower.\nBreaking Your Oath: A Paladin tries to hold to the highest standards of conduct, but even the most dedicated are fallible. Sometimes a Paladin transgresses their oath. A Paladin who has broken a vow typically seeks absolution, spending an all-night vigil as a sign of penitence or undertaking a fast. After a rite of forgiveness, the Paladin starts fresh. If your Paladin unrepentantly violates their oath, talk to your DM. Your Paladin should probably take a more appropriate subclass or even abandon the class and adopt another one."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Paladin levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Extra Attack",
        "desc": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "level": 5,
        "name": "Faithful Steed",
        "desc": "You can call on the aid of an otherworldly steed. You always have the Find Steed spell prepared.\nYou can also cast the spell once without expending a spell slot, and you regain the ability to do so when you finish a Long Rest."
      },
      {
        "level": 6,
        "name": "Aura of Protection",
        "desc": "You radiate a protective, unseeable aura in a 10-foot Emanation that originates from you. The aura is inactive while you have the Incapacitated condition.\nYou and your allies in the aura gain a bonus to saving throws equal to your Charisma modifier (minimum bonus of +1).\nIf another Paladin is present, a creature can benefit from only one Aura of Protection at a time; the creature chooses which aura while in them."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Abjure Foes",
        "desc": "As a Magic action, you can expend one use of this class's Channel Divinity to overwhelm foes with awe. As you present your Holy Symbol or weapon, you can target a number of creatures equal to your Charisma modifier (minimum of one creature) that you can see within 60 feet of yourself. Each target must succeed on a Wisdom saving throw or have the Frightened condition for 1 minute or until it takes any damage. While Frightened in this way, a target can do only one of the following on its turns: move, take an action, or take a Bonus Action."
      },
      {
        "level": 10,
        "name": "Aura of Courage",
        "desc": "You and your allies have Immunity to the Frightened condition while in your Aura of Protection. If a Frightened ally enters the aura, that condition has no effect on that ally while there."
      },
      {
        "level": 11,
        "name": "Radiant Strikes",
        "desc": "Your strikes now carry supernatural power. When you hit a target with an attack roll using a Melee weapon or an Unarmed Strike, the target takes an extra 1d8 Radiant damage."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 14,
        "name": "Restoring Touch",
        "desc": "When you use Lay On Hands on a creature, you can also remove one or more of the following conditions from the creature: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned. You must expend 5 Hit Points from the healing pool of Lay On Hands for each of these conditions you remove; those points don't also restore Hit Points to the creature."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Aura Expansion",
        "desc": "Your Aura of Protection is now a 30-foot Emanation."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Truesight is recommended."
      }
    ]
  },
  "Ranger": {
    "features": [
      {
        "level": 1,
        "name": "Favored Enemy",
        "desc": "You always have the Hunter'S Mark spell prepared. You can cast it twice without expending a spell slot, and you regain all expended uses of this ability when you finish a Long Rest.\nThe number of times you can cast the spell without a spell slot increases when you reach certain Ranger levels, as shown in the Favored Enemy column of the Ranger Features table."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "You have learned to channel the magical essence of nature to cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Ranger spells, which appear in the Ranger spell list later in the class's description.\nSpell Slots: The Ranger Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Ranger spells. Cure Wounds and Ensnaring Strike are recommended. The number of spells on your list increases as you gain Ranger levels, as shown in the Prepared Spells column of the Ranger Features table. Whenever that number increases, choose additional Ranger spells until the number of spells on your list matches the number in the Ranger Features table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 5 Ranger, your list of prepared spells can include six Ranger spells of level 1 or 2 in any combination. If another Ranger feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Ranger spells for you.\nChanging Your Prepared Spells: Whenever you finish a Long Rest, you can replace one spell on your list with another Ranger spell for which you have spell slots.\nSpellcasting Ability: Wisdom is your spellcasting ability for your Ranger spells.\nSpellcasting Focus: You can use a Druidic Focus as a Spellcasting Focus for your Ranger spells."
      },
      {
        "level": 1,
        "name": "Weapon Mastery",
        "desc": "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Longbows and Shortswords.\nWhenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Scimitars and Longswords."
      },
      {
        "level": 2,
        "name": "Deft Explorer",
        "desc": "Thanks to your travels, you gain the following benefits.\nExpertise: Choose one of your skill proficiencies with which you lack Expertise. You gain Expertise in that skill.\nLanguages: You know two languages of your choice from the language tables in chapter 2."
      },
      {
        "level": 2,
        "name": "Fighting Style",
        "desc": "You gain a Fighting Style feat of your choice. Instead of choosing one of those feats, you can choose the option below."
      },
      {
        "level": 3,
        "name": "Ranger Subclass",
        "desc": "You gain a Ranger subclass of your choice. A subclass is a specialization that grants you features at certain Ranger levels. For the rest of your career, you gain each of your subclass's features that are of your Ranger level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Ranger levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Extra Attack",
        "desc": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "level": 6,
        "name": "Roving",
        "desc": "Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Expertise",
        "desc": "Choose two of your skill proficiencies with which you lack Expertise. You gain Expertise in those skills."
      },
      {
        "level": 10,
        "name": "Tireless",
        "desc": "Primal forces now help fuel you on your journeys, granting you the following benefits.\nTemporary Hit Points: As a Magic action, you can give yourself a number of Temporary Hit Points equal to 1d8 plus your Wisdom modifier (minimum of 1). You can use this action a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\nDecrease Exhaustion: Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 13,
        "name": "Relentless Hunter",
        "desc": "Taking damage can't break your Concentration on Hunter's Mark."
      },
      {
        "level": 14,
        "name": "Nature's Veil",
        "desc": "You invoke spirits of nature to magically hide yourself. As a Bonus Action, you can give yourself the Invisible condition until the end of your next turn.\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 17,
        "name": "Precise Hunter",
        "desc": "You have Advantage on attack rolls against the creature currently marked by your Hunter's Mark."
      },
      {
        "level": 18,
        "name": "Feral Senses",
        "desc": "Your connection to the forces of nature grants you Blindsight with a range of 30 feet."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended."
      },
      {
        "level": 20,
        "name": "Foe Slayer",
        "desc": "The damage die of your Hunter's Mark is a d10 rather than a d6."
      }
    ]
  },
  "Rogue": {
    "features": [
      {
        "level": 1,
        "name": "Expertise",
        "desc": "You gain Expertise in two of your skill proficiencies of your choice. Sleight of Hand and Stealth are recommended if you have proficiency in them.\nAt Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice."
      },
      {
        "level": 1,
        "name": "Sneak Attack",
        "desc": "You know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll if you have Advantage on the roll and the attack uses a Finesse or a Ranged weapon. The extra damage's type is the same as the weapon's type.\nYou don't need Advantage on the attack roll if at least one of your allies is within 5 feet of the target, the ally doesn't have the Incapacitated condition, and you don't have Disadvantage on the attack roll.\nThe extra damage increases as you gain Rogue levels, as shown in the Sneak Attack column of the Rogue Features table."
      },
      {
        "level": 1,
        "name": "Thieves' Cant",
        "desc": "You picked up various languages in the communities where you plied your roguish talents. You know Thieves' Cant and one other language of your choice, which you choose from the language tables in chapter 2."
      },
      {
        "level": 1,
        "name": "Weapon Mastery",
        "desc": "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows.\nWhenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Scimitars and Shortswords."
      },
      {
        "level": 2,
        "name": "Cunning Action",
        "desc": "Your quick thinking and agility allow you to move and act quickly. On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide."
      },
      {
        "level": 3,
        "name": "Rogue Subclass",
        "desc": "You gain a Rogue subclass of your choice. A subclass is a specialization that grants you features at certain Rogue levels. For the rest of your career, you gain each of your subclass's features that are of your Rogue level or lower."
      },
      {
        "level": 3,
        "name": "Steady Aim",
        "desc": "As a Bonus Action, you give yourself Advantage on your next attack roll on the current turn. You can use this feature only if you haven't moved during this turn, and after you use it, your Speed is 0 until the end of the current turn."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Rogue levels 8, 10, 12, and 16."
      },
      {
        "level": 5,
        "name": "Cunning Strike",
        "desc": "You've developed cunning ways to use your Sneak Attack. When you deal Sneak Attack damage, you can add one of the following Cunning Strike effects. Each effect has a die cost, which is the number of Sneak Attack damage dice you must forgo to add the effect. You remove the die before rolling, and the effect occurs immediately after the attack's damage is dealt. For example, if you add the Poison effect, remove 1d6 from the Sneak Attack's damage before rolling.\nIf a Cunning Strike effect requires a saving throw, the DC equals 8 plus your Dexterity modifier and Proficiency Bonus."
      },
      {
        "level": 5,
        "name": "Poison (Cost: 1d6)",
        "desc": "You add a toxin to your strike, forcing the target to make a Constitution saving throw. On a failed save, the target has the Poisoned condition for 1 minute. At the end of each of its turns, the Poisoned target repeats the save, ending the effect on itself on a success.\nTo use this effect, you must have a Poisoner's Kit on your person."
      },
      {
        "level": 5,
        "name": "Trip (Cost: 1d6)",
        "desc": "If the target is Large or smaller, it must succeed on a Dexterity saving throw or have the Prone condition."
      },
      {
        "level": 5,
        "name": "Uncanny Dodge",
        "desc": "When an attacker that you can see hits you with an attack roll, you can take a Reaction to halve the attack's damage against you (round down)."
      },
      {
        "level": 5,
        "name": "Withdraw (Cost: 1d6)",
        "desc": "Immediately after the attack, you move up to half your Speed without provoking Opportunity Attacks."
      },
      {
        "level": 6,
        "name": "Expertise",
        "desc": "You gain Expertise in two of your Skill Proficiencies of your choice."
      },
      {
        "level": 7,
        "name": "Evasion",
        "desc": "You can nimbly dodge out of the way of certain dangers. When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You can't use this feature if you have the Incapacitated condition."
      },
      {
        "level": 7,
        "name": "Reliable Talent",
        "desc": "Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 10,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 11,
        "name": "Improved Cunning Strike",
        "desc": "You can use up to two Cunning Strike effects when you deal Sneak Attack damage, paying the die cost for each effect."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 14,
        "name": "Daze (Cost: 2d6)",
        "desc": "The target must succeed on a Constitution saving throw, or on its next turn, it can do only one of the following: move or take an action or a Bonus Action."
      },
      {
        "level": 14,
        "name": "Devious Strikes",
        "desc": "You've practiced new ways to use your Sneak Attack deviously. The following effects are now among your Cunning Strike options."
      },
      {
        "level": 14,
        "name": "Knock Out (Cost: 6d6)",
        "desc": "The target must succeed on a Constitution saving throw, or it has the Unconscious condition for 1 minute or until it takes any damage. The Unconscious target repeats the save at the end of each of its turns, ending the effect on itself on a success."
      },
      {
        "level": 14,
        "name": "Obscure (Cost: 3d6)",
        "desc": "The target must succeed on a Dexterity saving throw, or it has the Blinded condition until the end of its next turn."
      },
      {
        "level": 15,
        "name": "Slippery Mind",
        "desc": "Your cunning mind is exceptionally difficult to control. You gain proficiency in Wisdom and Charisma saving throws."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Elusive",
        "desc": "You're so evasive that attackers rarely gain the upper hand against you. No attack roll can have Advantage against you unless you have the Incapacitated condition."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of the Night Spirit is recommended."
      },
      {
        "level": 20,
        "name": "Stroke of Luck",
        "desc": "You have a marvelous knack for succeeding when you need to. If you fail a D20 Test, you can turn the roll into a 20.\nOnce you use this feature, you can't use it again until you finish a Short or Long Rest."
      }
    ]
  },
  "Sorcerer": {
    "features": [
      {
        "level": 1,
        "name": "Innate Sorcery",
        "desc": "An event in your past left an indelible mark on you, infusing you with simmering magic. As a Bonus Action, you can unleash that magic for 1 minute, during which you gain the following benefits:\n\u2022 The spell save DC of your Sorcerer spells increases by 1.\n\u2022 You have Advantage on the attack rolls of Sorcerer spells you cast.\nYou can use this feature twice, and you regain all expended uses of it when you finish a Long Rest."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "Drawing from your innate magic, you can cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Sorcerer spells, which appear in the Sorcerer spell list later in the class's description.\nCantrips: You know four Sorcerer cantrips of your choice. Light, Prestidigitation, Shocking Grasp, and Sorcerous Burst are recommended. Whenever you gain a Sorcerer level, you can replace one of your cantrips from this feature with another Sorcerer cantrip of your choice. When you reach Sorcerer levels 4 and 10, you learn another Sorcerer cantrip of your choice, as shown in the Cantrips column of the Sorcerer Features table.\nSpell Slots: The Sorcerer Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Sorcerer spells. Burning Hands and Detect Magic are recommended. The number of spells on your list increases as you gain Sorcerer levels, as shown in the Prepared Spells column of the Sorcerer Features table. Whenever that number increases, choose additional Sorcerer spells until the number of spells on your list matches the number in the Sorcerer Features table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 3 Sorcerer, your list of prepared spells can include six Sorcerer spells of level 1 or 2 in any combination. If another Sorcerer feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Sorcerer spells for you.\nChanging Your Prepared Spells: Whenever you gain a Sorcerer level, you can replace one spell on your list with another Sorcerer spell for which you have spell slots.\nSpellcasting Ability: Charisma is your spellcasting ability for your Sorcerer spells.\nSpellcasting Focus: You can use an Arcane Focus as a Spellcasting Focus for your Sorcerer spells."
      },
      {
        "level": 2,
        "name": "Font of Magic",
        "desc": "You can tap into the wellspring of magic within yourself. This wellspring is represented by Sorcery Points, which allow you to create a variety of magical effects.\nYou have 2 Sorcery Points, and you gain more as you reach higher levels, as shown in the Sorcery Points column of the Sorcerer Features table. You can't have more Sorcery Points than the number shown in the table for your level. You regain all expended Sorcery Points when you finish a Long Rest.\nYou can use your Sorcery Points to fuel the options below, along with other features, such as Metamagic, that use those points.\nConverting Spell Slots to Sorcery Points: You can expend a spell slot to gain a number of Sorcery Points equal to the slot's level (no action required).\nCreating Spell Slots: As a Bonus Action, you can transform unexpended Sorcery Points into one spell slot. The Creating Spell Slots table shows the cost of creating a spell slot of a given level, and it lists the minimum Sorcerer level you must be to create a slot. You can create a spell slot no higher than level 5. Any spell slot you create with this feature vanishes when you finish a Long Rest. Spell Slot Level | Sorcery Point Cost | Min. Sorcerer Level 1 \u2014 2 \u2014 2 2 \u2014 3 \u2014 3 3 \u2014 5 \u2014 5 4 \u2014 6 \u2014 7 5 \u2014 7 \u2014 9"
      },
      {
        "level": 2,
        "name": "Metamagic",
        "desc": "Because your magic flows from within, you can alter your spells to suit your needs; you gain two Metamagic options of your choice from \"Metamagic Options\" later in this class's description. You use the chosen options to temporarily modify spells you cast. To use an option, you must spend the number of Sorcery Points that it costs.\nYou can use only one Metamagic option on a spell when you cast it unless otherwise noted in one of those options.\nWhenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know. You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17."
      },
      {
        "level": 2,
        "name": "Metamagic Options",
        "desc": "The following options are available to your Metamagic feature. The options are presented in alphabetical order."
      },
      {
        "level": 3,
        "name": "Sorcerer Subclass",
        "desc": "You gain a Sorcerer subclass of your choice. A subclass is a specialization that grants you features at certain Sorcerer levels. For the rest of your career, you gain each of your subclass's features that are of your Sorcerer level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Sorcerous Restoration",
        "desc": "When you finish a Short Rest, you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down). Once you use this feature, you can't do so again until you finish a Long Rest."
      },
      {
        "level": 7,
        "name": "Sorcery Incarnate",
        "desc": "If you have no uses of Innate Sorcery left, you can use it if you spend 2 Sorcery Points when you take the Bonus Action to activate it.\nIn addition, while your Innate Sorcery feature is active, you can use up to two of your Metamagic options on each spell you cast."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 10,
        "name": "Metamagic",
        "desc": "Because your magic flows from within you, you can alter your spells to suit your needs; you gain two Metamagic options of your choice from the \"Metamagic Options\" section later in this class's description.\nYou can use only one Metamagic option on a spell when you cast it, unless otherwise noted in one of those options.\nWhenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
      },
      {
        "level": 17,
        "name": "Metamagic",
        "desc": "Because your magic flows from within you, you can alter your spells to suit your needs; you gain two Metamagic options of your choice from the \"Metamagic Options\" section later in this class's description.\nYou can use only one Metamagic option on a spell when you cast it, unless otherwise noted in one of those options.\nWhenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended."
      },
      {
        "level": 20,
        "name": "Arcane Apotheosis",
        "desc": "While your Innate Sorcery feature is active, you can use one Metamagic option on each of your turns without spending Sorcery Points on it."
      }
    ]
  },
  "Warlock": {
    "features": [
      {
        "level": 1,
        "name": "Eldritch Invocation Options",
        "desc": "Eldritch Invocation options appear in alphabetical order."
      },
      {
        "level": 1,
        "name": "Eldritch Invocations",
        "desc": "You have unearthed Eldritch Invocations, pieces of forbidden knowledge that imbue you with an abiding magical ability or other lessons. You gain one invocation of your choice, such as Pact of the Tome. Invocations are described in the \"Eldritch Invocation Options\" section later in this class's description.\nPrerequisites: If an invocation has a prerequisite, you must meet it to learn that invocation. For example, if an invocation requires you to be a level 5+ Warlock, you can select the invocation once you reach Warlock level 5.\nReplacing and Gaining Invocations: Whenever you gain a Warlock level, you can replace one of your invocations with another one for which you qualify. You can't replace an invocation if it's a prerequisite for another invocation that you have.\nWhen you gain certain Warlock levels, you gain more invocations of your choice, as shown in the Invocations column of the Warlock Features table.\nYou can't pick the same invocation more than once unless its description says otherwise."
      },
      {
        "level": 1,
        "name": "Pact Magic",
        "desc": "Through occult ceremony, you have formed a pact with a mysterious entity to gain magical powers. The entity is a voice in the shadows\u2014its identity unclear\u2014but its boon to you is concrete: the ability to cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Warlock spells, which appear in the Warlock spell list later in the class's description.\nCantrips: You know two Warlock cantrips of your choice. Eldritch Blast and Prestidigitation are recommended. Whenever you gain a Warlock level, you can replace one of your cantrips from this feature with another Warlock cantrip of your choice. When you reach Warlock levels 4 and 10, you learn another Warlock cantrip of your choice, as shown in the Cantrips column of the Warlock Features table.\nSpell Slots: The Warlock Features table shows how many spell slots you have to cast your Warlock spells of levels 1\u20135. The table also shows the level of those slots, all of which are the same level. You regain all expended Pact Magic spell slots when you finish a Short or Long Rest. For example, when you're a level 5 Warlock, you have two level 3 spell slots. To cast the level 1 spell Witch Bolt, you must spend one of those slots, and you cast it as a level 3 spell.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Warlock spells. Charm Person and Hex are recommended.\nThe number of spells on your list increases as you gain Warlock levels, as shown in the Prepared Spells column of the Warlock Features table. Whenever that number increases, choose additional Warlock spells until the number of spells on your list matches the number in the table. The chosen spells must be of a level no higher than what's shown in the table's Slot Level column for your level. When you reach level 6, for example, you learn a new Warlock spell, which can be of levels 1\u20133.\nIf another Warlock feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Warlock spells for you.\nChanging Your Prepared Spells: Whenever you gain a Warlock level, you can replace one spell on your list with another Warlock spell of an eligible level.\nSpellcasting Ability: Charisma is the spellcasting ability for your Warlock spells.\nSpellcasting Focus: You can use an Arcane Focus as a Spellcasting Focus for your Warlock spells."
      },
      {
        "level": 2,
        "name": "Magical Cunning",
        "desc": "You can perform an esoteric rite for 1 minute. At the end of it, you regain expended Pact Magic spell slots but no more than a number equal to half your maximum (round up). Once you use this feature, you can't do so again until you finish a Long Rest."
      },
      {
        "level": 3,
        "name": "Warlock Subclass",
        "desc": "You gain a Warlock subclass of your choice. A subclass is a specialization that grants you features at certain Warlock levels. For the rest of your career, you gain each of your subclass's features that are of your Warlock level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Warlock levels 8, 12, and 16."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 9,
        "name": "Contact Patron",
        "desc": "In the past, you usually contacted your patron through intermediaries. Now you can communicate directly; you always have the Contact Other Plane spell prepared. With this feature, you can cast the spell without expending a spell slot to contact your patron, and you automatically succeed on the spell's saving throw.\nOnce you cast the spell with this feature, you can't do so in this way again until you finish a Long Rest."
      },
      {
        "level": 11,
        "name": "Mystic Arcanum",
        "desc": "Your patron grants you a magical secret called an arcanum. Choose one level 6 Warlock spell as this arcanum.\nYou can cast your arcanum spell once without expending a spell slot, and you must finish a Long Rest before you can cast it in this way again.\nAs shown in the Warlock Features table, you gain another Warlock spell of your choice that can be cast in this way when you reach Warlock levels 13 (level 7 spell), 15 (level 8 spell), and 17 (level 9 spell). You regain all uses of your Mystic Arcanum when you finish a Long Rest.\nWhenever you gain a Warlock level, you can replace one of your arcanum spells with another Warlock spell of the same level."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 13,
        "name": "Mystic Arcanum",
        "desc": "You gain a level 7 Warlock Spell of your choice."
      },
      {
        "level": 15,
        "name": "Mystic Arcanum",
        "desc": "You gain a level 8 Warlock Spell of your choice."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 17,
        "name": "Mystic Arcanum",
        "desc": "You gain a level 9 Warlock Spell of your choice."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended."
      },
      {
        "level": 20,
        "name": "Eldritch Master",
        "desc": "When you use your Magical Cunning feature, you regain all your expended Pact Magic spell slots."
      }
    ]
  },
  "Wizard": {
    "features": [
      {
        "level": 1,
        "name": "Arcane Recovery",
        "desc": "You can regain some of your magical energy by studying your spellbook. When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher. For example, if you're a level 4 Wizard, you can recover up to two levels' worth of spell slots, regaining either one level 2 spell slot or two level 1 spell slots.\nOnce you use this feature, you can't do so again until you finish a Long Rest."
      },
      {
        "level": 1,
        "name": "Ritual Adept",
        "desc": "You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast a spell in this way."
      },
      {
        "level": 1,
        "name": "Spellcasting",
        "desc": "As a student of arcane magic, you have learned to cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Wizard spells, which appear in the Wizard spell list later in the class's description.\nCantrips: You know three Wizard cantrips of your choice. Light, Mage Hand, and Ray Of Frost are recommended. Whenever you finish a Long Rest, you can replace one of your cantrips from this feature with another Wizard cantrip of your choice. When you reach Wizard levels 4 and 10, you learn another Wizard cantrip of your choice, as shown in the Cantrips column of the Wizard Features table.\nSpellbook: Your wizardly apprenticeship culminated in the creation of a unique book: your spellbook. It is a Tiny object that weighs 3 pounds, contains 100 pages, and can be read only by you or someone casting Identify. You determine the book's appearance and materials, such as a gilt-edged tome or a collection of vellum bound with twine. The book contains the level 1+ spells you know. It starts with six level 1 Wizard spells of your choice. Detect Magic, Feather Fall, Mage Armor, Magic Missile, Sleep, and Thunderwave are recommended. Whenever you gain a Wizard level after 1, add two Wizard spells of your choice to your spellbook. Each of these spells must be of a level for which you have spell slots, as shown in the Wizard Features table. The spells are the culmination of arcane research you do regularly.\nSpell Slots: The Wizard Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\nPrepared Spells of Level 1+: You prepare the list of level 1+ spells that are available for you to cast with this feature. To do so, choose four spells from your spellbook. The chosen spells must be of a level for which you have spell slots. The number of spells on your list increases as you gain Wizard levels, as shown in the Prepared Spells column of the Wizard Features table. Whenever that number increases, choose additional Wizard spells until the number of spells on your list matches the number in the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 3 Wizard, your list of prepared spells can include six spells of levels 1 and 2 in any combination, chosen from your spellbook. If another Wizard feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Wizard spells for you.\nChanging Your Prepared Spells: Whenever you finish a Long Rest, you can change your list of prepared spells, replacing any of the spells there with spells from your spellbook.\nSpellcasting Ability: Intelligence is your spellcasting ability for your Wizard spells.\nSpellcasting Focus: You can use an Arcane Focus or your spellbook as a Spellcasting Focus for your Wizard spells.\nExpanding and Replacing a Spellbook: The spells you add to your spellbook as you gain levels reflect your ongoing magical research, but you might find other spells during your adventures that you can add to the book. You could discover a Wizard spell on a Spell Scroll, for example, and then copy it into your spellbook. Copying a Spell into the Book: When you find a level 1+ Wizard spell, you can copy it into your spellbook if it's of a level you can prepare and if you have time to copy it. For each level of the spell, the transcription takes 2 hours and costs 50 GP. Afterward you can prepare the spell like the other spells in your spellbook. Copying the Book: You can copy a spell from your spellbook into another book. This is like copying a new spell into your spellbook but faster, since you already know how to cast the spell. You need spend only 1 hour and 10 GP for each level of the copied spell. If you lose your spellbook, you can use the same procedure to transcribe the Wizard spells that you have prepared into a new spellbook. Filling out the remainder of the new book requires you to find new spells to do so. For this reason, many wizards keep a backup spellbook."
      },
      {
        "level": 2,
        "name": "Scholar",
        "desc": "While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill."
      },
      {
        "level": 3,
        "name": "Wizard Subclass",
        "desc": "You gain a Wizard subclass of your choice. A subclass is a specialization that grants you features at certain Wizard levels. For the rest of your career, you gain each of your subclass's features that are of your Wizard level or lower."
      },
      {
        "level": 4,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Wizard levels 8, 12, and 16."
      },
      {
        "level": 5,
        "name": "Memorize Spell",
        "desc": "Whenever you finish a Short Rest, you can study your spellbook and replace one of the level 1+ Wizard spells you have prepared for your Spellcasting feature with another level 1+ spell from the book."
      },
      {
        "level": 8,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 12,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 16,
        "name": "Ability Score Improvement",
        "desc": "You gain the Ability Score Improvement Feat or another feat of your choice for which you qualify."
      },
      {
        "level": 18,
        "name": "Spell Mastery",
        "desc": "You have achieved such mastery over certain spells that you can cast them at will. Choose a level 1 and a level 2 spell in your spellbook that have a casting time of an action. You always have those spells prepared, and you can cast them at their lowest level without expending a spell slot. To cast either spell at a higher level, you must expend a spell slot.\nWhenever you finish a Long Rest, you can study your spellbook and replace one of those spells with an eligible spell of the same level from the book."
      },
      {
        "level": 19,
        "name": "Epic Boon",
        "desc": "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Spell Recall is recommended."
      },
      {
        "level": 20,
        "name": "Signature Spells",
        "desc": "Choose two level 3 spells in your spellbook as your signature spells. You always have these spells prepared, and you can cast each of them once at level 3 without expending a spell slot. When you do so, you can't cast them in this way again until you finish a Short or Long Rest. To cast either spell at a higher level, you must expend a spell slot."
      }
    ]
  }
};

export const IMPORTED_CLASS_KITS = {
  "Artificer": {
    "adds": {
      "saves": [
        "CON",
        "INT"
      ],
      "armor": [
        "light",
        "medium",
        "shields"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_arcana",
        "skill_history",
        "skill_investigation",
        "skill_medicine",
        "skill_nature",
        "skill_perception",
        "skill_sleight_of_hand"
      ]
    },
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Barbarian": {
    "adds": {
      "saves": [
        "STR",
        "CON"
      ],
      "armor": [
        "light",
        "medium",
        "shields"
      ],
      "weapons": [
        "Simple weapons",
        "Martial weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_animal_handling",
        "skill_athletics",
        "skill_intimidation",
        "skill_nature",
        "skill_perception",
        "skill_survival"
      ]
    },
    "hitDie": "d12",
    "editions": [
      "classic",
      "one"
    ],
    "autoFeatures": [
      {
        "level": 20,
        "name": "Primal Champion",
        "desc": "At 20th level, you embody the power of the wilds. Your Strength and Constitution scores increase by 4. Your maximum for those scores is now 24.",
        "abilities": [
          {
            "ability": "STR",
            "bonus": 4
          },
          {
            "ability": "CON",
            "bonus": 4
          }
        ]
      },
      {
        "level": 20,
        "name": "Primal Champion",
        "desc": "You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25.",
        "abilities": [
          {
            "ability": "STR",
            "bonus": 4
          },
          {
            "ability": "CON",
            "bonus": 4
          }
        ]
      }
    ]
  },
  "Bard": {
    "adds": {
      "saves": [
        "DEX",
        "CHA"
      ],
      "armor": [
        "light"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": null,
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Cleric": {
    "adds": {
      "saves": [
        "WIS",
        "CHA"
      ],
      "armor": [
        "light",
        "medium",
        "shields"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_history",
        "skill_insight",
        "skill_medicine",
        "skill_persuasion",
        "skill_religion"
      ]
    },
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Druid": {
    "adds": {
      "saves": [
        "INT",
        "WIS"
      ],
      "armor": [
        "light",
        "shields"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_arcana",
        "skill_animal_handling",
        "skill_insight",
        "skill_medicine",
        "skill_nature",
        "skill_perception",
        "skill_religion",
        "skill_survival"
      ]
    },
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Fighter": {
    "adds": {
      "saves": [
        "STR",
        "CON"
      ],
      "armor": [
        "light",
        "medium",
        "heavy",
        "shields"
      ],
      "weapons": [
        "Simple weapons",
        "Martial weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_acrobatics",
        "skill_animal_handling",
        "skill_athletics",
        "skill_history",
        "skill_insight",
        "skill_intimidation",
        "skill_persuasion",
        "skill_perception",
        "skill_survival"
      ]
    },
    "hitDie": "d10",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Monk": {
    "adds": {
      "saves": [
        "STR",
        "DEX"
      ],
      "weapons": [
        "Simple weapons",
        "Martial weapons that have the Light property"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_acrobatics",
        "skill_athletics",
        "skill_history",
        "skill_insight",
        "skill_religion",
        "skill_stealth"
      ]
    },
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Paladin": {
    "adds": {
      "saves": [
        "WIS",
        "CHA"
      ],
      "armor": [
        "light",
        "medium",
        "heavy",
        "shields"
      ],
      "weapons": [
        "Simple weapons",
        "Martial weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_athletics",
        "skill_insight",
        "skill_intimidation",
        "skill_medicine",
        "skill_persuasion",
        "skill_religion"
      ]
    },
    "hitDie": "d10",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Ranger": {
    "adds": {
      "saves": [
        "STR",
        "DEX"
      ],
      "armor": [
        "light",
        "medium",
        "shields"
      ],
      "weapons": [
        "Simple weapons",
        "Martial weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 3,
      "from": [
        "skill_animal_handling",
        "skill_athletics",
        "skill_insight",
        "skill_investigation",
        "skill_nature",
        "skill_perception",
        "skill_stealth",
        "skill_survival"
      ]
    },
    "hitDie": "d10",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Rogue": {
    "adds": {
      "saves": [
        "DEX",
        "INT"
      ],
      "armor": [
        "light"
      ],
      "weapons": [
        "Simple weapons",
        "Martial weapons that have the Finesse or Light property"
      ]
    },
    "skillChoice": {
      "pick_count": 4,
      "from": [
        "skill_acrobatics",
        "skill_athletics",
        "skill_deception",
        "skill_insight",
        "skill_intimidation",
        "skill_investigation",
        "skill_perception",
        "skill_persuasion",
        "skill_sleight_of_hand",
        "skill_stealth"
      ]
    },
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Sorcerer": {
    "adds": {
      "saves": [
        "CON",
        "CHA"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_arcana",
        "skill_deception",
        "skill_insight",
        "skill_intimidation",
        "skill_persuasion",
        "skill_religion"
      ]
    },
    "hitDie": "d6",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Warlock": {
    "adds": {
      "saves": [
        "WIS",
        "CHA"
      ],
      "armor": [
        "light"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_arcana",
        "skill_deception",
        "skill_history",
        "skill_intimidation",
        "skill_investigation",
        "skill_nature",
        "skill_religion"
      ]
    },
    "hitDie": "d8",
    "editions": [
      "classic",
      "one"
    ]
  },
  "Wizard": {
    "adds": {
      "saves": [
        "INT",
        "WIS"
      ],
      "weapons": [
        "Simple weapons"
      ]
    },
    "skillChoice": {
      "pick_count": 2,
      "from": [
        "skill_arcana",
        "skill_history",
        "skill_insight",
        "skill_investigation",
        "skill_medicine",
        "skill_nature",
        "skill_religion"
      ]
    },
    "hitDie": "d6",
    "editions": [
      "classic",
      "one"
    ]
  }
};

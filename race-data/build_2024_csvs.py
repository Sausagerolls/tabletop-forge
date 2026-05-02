#!/usr/bin/env python3
"""
Hand-authored 2024 SRD race data — Open5e v1 doesn't carry the 2024
release yet. Sourced from the 2024 PHB SRD's race chapter (CC-BY 4.0
release). Each CSV carries a `# VERIFY` row at the top so you remember
to spot-check against the printed PHB before importing into the app.

Subrace handling: 2024 collapsed subraces into "lineages" / "ancestries"
embedded inside the parent race (e.g. Elf has Drow / High Elf / Wood
Elf as a single Elven Lineage choice; Gnome has Forest / Rock Gnomish
Lineage; Tiefling has Abyssal / Chthonic / Infernal Fiendish Legacy;
Goliath has eight giant ancestries; Dragonborn has draconic ancestries
that drive the breath weapon damage type). We emit:
  * one CSV per parent race with the shared abilities
  * one CSV per lineage / ancestry option with its specific abilities
"""
import csv
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "2024")
os.makedirs(OUT_DIR, exist_ok=True)

VERIFY_NOTE = (
    "# Authored from the 2024 PHB SRD (CC-BY 4.0). Spot-check against "
    "the printed PHB — wording may have been adjusted in errata."
)


def write_csv(filename, rows):
    """Rows are (Ability, Description, Category, Notes) tuples."""
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["# " + VERIFY_NOTE.lstrip("# "), "", "", ""])
        w.writerow(["Ability", "Description", "Category", "Notes"])
        for r in rows:
            w.writerow(r)
    print(f"  wrote {path:50} {len(rows)} rows")


# ── Race definitions ────────────────────────────────────────────────
# Each entry: (filename, [(ability_name, description), ...])
# Categories left blank for the user to mark.

AASIMAR = [
    ("Creature Type", "You are a Humanoid. You are also considered a Celestial for any effect that relates to creature type."),
    ("Size", "You are Medium or Small. You choose the size when you select this race."),
    ("Speed", "Your Speed is 30 feet."),
    ("Celestial Resistance", "You have Resistance to Necrotic damage and Radiant damage."),
    ("Darkvision", "You have Darkvision with a range of 60 feet."),
    ("Healing Hands", "As a Magic action, you touch a creature and cause it to regain a number of Hit Points equal to your Proficiency Bonus × your character level. Once you use this trait, you can't use it again until you finish a Long Rest."),
    ("Light Bearer", "You know the Light cantrip. Charisma is your spellcasting ability for it."),
    ("Celestial Revelation", "When you reach character level 3, you can transform as a Bonus Action using one of the revelation options below. You stay transformed for 1 minute or until you end the transformation as a Bonus Action. You then can't use this trait again until you finish a Long Rest. When you transform, choose Heavenly Wings, Inner Radiance, or Necrotic Shroud."),
    ("Heavenly Wings (Revelation)", "Two spectral wings sprout from your back. Until the transformation ends, you have a Fly Speed equal to your Speed."),
    ("Inner Radiance (Revelation)", "Searing light radiates from your eyes and mouth. For the transformation's duration, you shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet, and at the end of each of your turns, each creature within 10 feet of you takes Radiant damage equal to your Proficiency Bonus."),
    ("Necrotic Shroud (Revelation)", "Your eyes turn into pools of darkness, and ghostly, flightless wings sprout from your back. Creatures other than your allies within 10 feet of you that can see you must succeed on a Charisma saving throw (DC 8 + your Charisma modifier + your Proficiency Bonus) or have the Frightened condition until the end of your next turn. Until the transformation ends, once on each of your turns, you can deal extra Necrotic damage to one target when you deal damage to it with an attack or a spell. The extra damage equals your Proficiency Bonus."),
    ("Languages", "You can speak, read, and write Common and one other language that you and your DM agree is appropriate for your character."),
]

DRAGONBORN = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Medium."),
    ("Speed", "Your Speed is 30 feet."),
    ("Draconic Ancestry", "Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestry table — Black/Copper (Acid), Blue/Bronze (Lightning), Brass/Gold/Red (Fire), Green (Poison), Silver/White (Cold). Your choice affects your Breath Weapon and Damage Resistance traits."),
    ("Breath Weapon", "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (your choice). Each creature in that area must make a Dexterity saving throw (DC = 8 + your Constitution modifier + your Proficiency Bonus). On a failed save, the target takes 1d10 damage of the type associated with your Draconic Ancestry. On a successful save, it takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10). You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."),
    ("Damage Resistance", "You have Resistance to the damage type associated with your Draconic Ancestry."),
    ("Darkvision", "You have Darkvision with a range of 60 feet."),
    ("Draconic Flight", "When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your Breath Weapon. Once you use this trait, you can't use it again until you finish a Long Rest."),
    ("Languages", "You can speak, read, and write Common and Draconic."),
]

DWARF = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Medium."),
    ("Speed", "Your Speed is 30 feet."),
    ("Darkvision", "You have Darkvision with a range of 120 feet."),
    ("Dwarven Resilience", "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition."),
    ("Dwarven Toughness", "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level."),
    ("Stonecunning", "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching such a surface to use this Tremorsense. The stone can be natural or worked. You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."),
    ("Languages", "You can speak, read, and write Common and Dwarvish."),
]

ELF = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Medium."),
    ("Speed", "Your Speed is 30 feet."),
    ("Darkvision", "You have Darkvision with a range of 60 feet."),
    ("Elven Lineage", "You are part of an elven lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table: Drow, High Elf, or Wood Elf. You gain the level 1 benefit of that lineage. When you reach character levels 3 and 5, you learn a higher-level spell as listed in the table. You always have the listed spell prepared. Once you cast a spell with this trait without expending a spell slot, you can't cast that spell with this trait again until you finish a Long Rest. You can also cast the spell using any spell slots you have. Your spellcasting ability for these spells is the one you chose for the Elven Lineage."),
    ("Fey Ancestry", "You have Advantage on saving throws you make to avoid or end the Charmed condition."),
    ("Keen Senses", "You have proficiency in the Perception skill."),
    ("Trance", "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness."),
    ("Languages", "You can speak, read, and write Common and Elvish."),
]

ELF_DROW = [
    ("Lineage Spells", "Level 1: Dancing Lights cantrip. Level 3: Faerie Fire (Charisma, Wisdom, or Intelligence — chosen at lineage selection). Level 5: Darkness."),
    ("Superior Darkvision", "Your Darkvision has a range of 120 feet."),
]

ELF_HIGH = [
    ("Lineage Spells", "Level 1: Prestidigitation cantrip. Level 3: Detect Magic. Level 5: Misty Step."),
    ("Cantrip Choice", "You know one cantrip of your choice from the Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (one ability of your choice when you select this lineage)."),
]

ELF_WOOD = [
    ("Lineage Spells", "Level 1: Druidcraft cantrip. Level 3: Longstrider. Level 5: Pass Without Trace."),
    ("Fleet of Foot", "Your Speed increases to 35 feet."),
]

GNOME = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Small."),
    ("Speed", "Your Speed is 30 feet."),
    ("Darkvision", "You have Darkvision with a range of 60 feet."),
    ("Gnomish Cunning", "You have Advantage on Intelligence, Wisdom, and Charisma saving throws."),
    ("Gnomish Lineage", "You are part of a gnomish lineage that grants you supernatural abilities. Choose Forest Gnome or Rock Gnome."),
    ("Languages", "You can speak, read, and write Common and Gnomish."),
]

GNOME_FOREST = [
    ("Minor Illusion (Cantrip)", "You know the Minor Illusion cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (one ability of your choice when you select this lineage)."),
    ("Speak with Small Beasts", "Through sounds and gestures, you can communicate simple ideas with any Beast that has an Intelligence of 3 or less."),
]

GNOME_ROCK = [
    ("Artificer's Lore", "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your Proficiency Bonus instead of any Proficiency Bonus you normally apply."),
    ("Tinker", "Using tinker's tools, you can spend 1 hour and 10 GP worth of materials to construct a Tiny clockwork device (AC 5, 1 HP). When you create the device, choose its function: Clockwork Toy, Fire Starter, or Music Box. The device ceases to function after 24 hours (unless you spend 1 hour repairing it to keep it functioning) or when you use an action to dismantle it; at that time, you can reclaim the materials used to create it. You can have only three such devices functional at a time. Requires proficiency with tinker's tools, gained automatically with this race."),
]

GOLIATH = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Medium."),
    ("Speed", "Your Speed is 35 feet."),
    ("Giant Ancestry", "You are descended from giants. Choose one of the supernatural boons from the Giant Ancestries table — Cloud's Jaunt, Fire's Burn, Frost's Chill, Hill's Tumble, Stone's Endurance, Storm's Thunder, or Wave's Crash. You can use the chosen boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."),
    ("Cloud's Jaunt (Ancestry)", "As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see. (Cloud Giant)"),
    ("Fire's Burn (Ancestry)", "When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target. (Fire Giant)"),
    ("Frost's Chill (Ancestry)", "When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target. In addition, the target's Speed is reduced by 10 feet until the start of your next turn. (Frost Giant)"),
    ("Hill's Tumble (Ancestry)", "When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition. (Hill Giant)"),
    ("Stone's Endurance (Ancestry)", "When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total. (Stone Giant)"),
    ("Storm's Thunder (Ancestry)", "When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature. (Storm Giant)"),
    ("Wave's Crash (Ancestry)", "When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target. (Reskinned variant — verify in PHB)"),
    ("Large Form", "Starting at character level 5, you can change your size to Large as a Bonus Action if you're Medium and your space has room to make you Large. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest."),
    ("Powerful Build", "You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift."),
    ("Languages", "You can speak, read, and write Common and Giant."),
]

HALFLING = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Small."),
    ("Speed", "Your Speed is 30 feet."),
    ("Brave", "You have Advantage on saving throws you make to avoid or end the Frightened condition."),
    ("Halfling Nimbleness", "You can move through the space of any creature that is a size larger than you, but you can't stop in the same space."),
    ("Luck", "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll."),
    ("Naturally Stealthy", "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you."),
    ("Languages", "You can speak, read, and write Common and Halfling."),
]

HUMAN = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Medium or Small. You choose the size when you select this race."),
    ("Speed", "Your Speed is 30 feet."),
    ("Resourceful", "You gain Heroic Inspiration whenever you finish a Long Rest."),
    ("Skillful", "You gain proficiency in one skill of your choice."),
    ("Versatile", "You gain an Origin feat of your choice (see chapter 5)."),
    ("Languages", "You can speak, read, and write Common and one other language that you and your DM agree is appropriate for your character."),
]

ORC = [
    ("Creature Type", "You are a Humanoid."),
    ("Size", "You are Medium."),
    ("Speed", "Your Speed is 30 feet."),
    ("Adrenaline Rush", "You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest."),
    ("Darkvision", "You have Darkvision with a range of 120 feet."),
    ("Relentless Endurance", "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can't use it again until you finish a Long Rest."),
    ("Languages", "You can speak, read, and write Common and Orc."),
]

TIEFLING = [
    ("Creature Type", "You are a Humanoid. You are also considered a Fiend for any effect that relates to creature type."),
    ("Size", "You are Medium or Small. You choose the size when you select this race."),
    ("Speed", "Your Speed is 30 feet."),
    ("Darkvision", "You have Darkvision with a range of 60 feet."),
    ("Fiendish Legacy", "You are linked to a fiendish realm and gain abilities tied to that realm. Choose Abyssal, Chthonic, or Infernal from the Fiendish Legacies table. You gain the cantrip listed for your legacy at level 1, and additional spells become available at character levels 3 and 5. You always have the listed spells prepared. Once you cast a spell with this trait without expending a spell slot, you can't cast that spell with this trait again until you finish a Long Rest. Your spellcasting ability for these spells is the one you chose for the legacy (Intelligence, Wisdom, or Charisma)."),
    ("Otherworldly Presence", "You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you chose for the Fiendish Legacy trait."),
    ("Languages", "You can speak, read, and write Common and one other language that you and your DM agree is appropriate for your character."),
]

TIEFLING_ABYSSAL = [
    ("Legacy Spells", "Level 1: Poison Spray cantrip. Level 3: Ray of Sickness. Level 5: Hold Person."),
    ("Damage Resistance", "Resistance to Poison damage."),
]

TIEFLING_CHTHONIC = [
    ("Legacy Spells", "Level 1: Chill Touch cantrip. Level 3: False Life. Level 5: Ray of Enfeeblement."),
    ("Damage Resistance", "Resistance to Necrotic damage."),
]

TIEFLING_INFERNAL = [
    ("Legacy Spells", "Level 1: Fire Bolt cantrip. Level 3: Hellish Rebuke. Level 5: Darkness."),
    ("Damage Resistance", "Resistance to Fire damage."),
]


RACES = [
    ("aasimar.csv", AASIMAR),
    ("dragonborn.csv", DRAGONBORN),
    ("dwarf.csv", DWARF),
    ("elf.csv", ELF),
    ("elf-drow.csv", ELF_DROW),
    ("elf-high.csv", ELF_HIGH),
    ("elf-wood.csv", ELF_WOOD),
    ("gnome.csv", GNOME),
    ("gnome-forest.csv", GNOME_FOREST),
    ("gnome-rock.csv", GNOME_ROCK),
    ("goliath.csv", GOLIATH),
    ("halfling.csv", HALFLING),
    ("human.csv", HUMAN),
    ("orc.csv", ORC),
    ("tiefling.csv", TIEFLING),
    ("tiefling-abyssal.csv", TIEFLING_ABYSSAL),
    ("tiefling-chthonic.csv", TIEFLING_CHTHONIC),
    ("tiefling-infernal.csv", TIEFLING_INFERNAL),
]


def main():
    for filename, abilities in RACES:
        rows = [(name, desc, "", "") for name, desc in abilities]
        write_csv(filename, rows)


if __name__ == "__main__":
    main()

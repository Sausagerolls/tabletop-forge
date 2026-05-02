#!/usr/bin/env python3
"""
Heuristic Category + Notes filler for the race CSVs. Reads each row's
description, decides which stat-block bucket it belongs in (Special
Abilities / Bonus Action / Action / Reaction / —), and proposes a
Notes string that mirrors the pattern the user established on the
Tiefling sheets:

    Darkvision         | Special Abilities | Set Darkvision to 60ft
    Fey Ancestry       | Special Abilities | Auto adds advantage on saves vs Charmed
    Damage Resistance  | Special Abilities | Auto adds resistance to fire damage
    Stonecunning       | Bonus Action      | Auto adds Tremorsense 60ft via Bonus Action
    Breath Weapon      | Action            | Auto adds Breath Weapon attack option
    Stone's Endurance  | Reaction          | Auto adds reaction reducing damage by 1d12+CON

The script is conservative — base properties (Size, Speed, Languages,
ASI) are tagged "—" so they don't accidentally end up in
special_abilities. Run from race-data/:

    python3 auto_categorise.py

Idempotent: rows that ALREADY have a Category set are left untouched
so a hand-edited CSV survives a re-run.
"""
import csv
import os
import re
import sys

ROOT = os.path.dirname(__file__)
DIRS = ['2014', '2024']

PROPERTY_NAMES = {
    'size', 'speed', 'languages', 'alignment', 'age',
    'ability score increase',
}

ACTION_KEYWORDS = [
    r"\bas a (?:magic )?action\b",
    r"\bwhen you take the attack action\b",
    r"\b1 action\b",
]
BONUS_ACTION_KEYWORDS = [
    r"\bas a bonus action\b",
    r"\b1 bonus action\b",
]
REACTION_KEYWORDS = [
    r"\bas a reaction\b",
    r"\btake a reaction\b",
]


def classify_category(name: str, desc: str) -> str:
    """Return Special Abilities / Bonus Action / Action / Reaction /
    "—" / "Property" depending on the description's wording.
    """
    n = name.strip().lower()
    if n in PROPERTY_NAMES:
        return ''      # leave blank — user marks "—" or fills in a note
    d = desc.lower()
    if any(re.search(p, d) for p in REACTION_KEYWORDS):
        return 'Reaction'
    if any(re.search(p, d) for p in BONUS_ACTION_KEYWORDS):
        return 'Bonus Action'
    if any(re.search(p, d) for p in ACTION_KEYWORDS):
        return 'Action'
    # Default for racial traits is Special Abilities.
    return 'Special Abilities'


def note_for(name: str, desc: str) -> str:
    """Emit a one-line Note describing the auto-import behaviour we
    expect the picker to apply. Pattern-matches a handful of common
    racial-trait shapes; falls back to '' when nothing recognisable.
    """
    n = name.strip().lower()
    d = desc

    if n == 'darkvision':
        m = re.search(r"range of (\d+)\s*feet|within (\d+) feet", d)
        ft = m.group(1) or m.group(2) if m else '60'
        return f"Set Darkvision to {ft}ft"

    # Vision: blindsight / tremorsense / truesight in racial traits
    if 'tremorsense' in d.lower():
        m = re.search(r"tremorsense.*?(\d+)\s*feet", d, re.I)
        ft = m.group(1) if m else '60'
        return f"Set Tremorsense to {ft}ft (active for 10 minutes; uses Bonus Action)"

    # Damage resistance / immunity — handle "X and Y" forms (Aasimar
    # Celestial Resistance) so we don't drop the second type.
    rm_pair = re.search(r"resistance to ([A-Za-z]+) damage and ([A-Za-z]+) damage", d, re.I)
    if rm_pair:
        return f"Auto adds resistance to {rm_pair.group(1)} and {rm_pair.group(2)} damage"
    rm = re.search(r"resistance to ([A-Za-z]+) damage", d, re.I)
    if rm:
        return f"Auto adds resistance to {rm.group(1).lower()} damage"

    # Save-condition advantages (e.g. Fey Ancestry, Brave)
    cm = re.search(r"avoid or end the (\w+) condition|advantage on saving throws.*?being (\w+)", d, re.I)
    if cm:
        cond = cm.group(1) or cm.group(2)
        return f"Adds advantage on saves vs the {cond.capitalize()} condition"

    # Skill proficiency grants
    sm = re.search(r"proficiency in the (\w+) skill", d, re.I)
    if sm:
        return f"Adds proficiency in {sm.group(1)} skill"

    # Speed bumps (e.g. Wood Elf "Speed increases to 35 feet")
    sp = re.search(r"speed (?:increases to|is) (\d+) feet", d, re.I)
    if sp and n != 'speed':
        return f"Set walking speed to {sp.group(1)}ft"

    # Cantrips / spell grants
    if 'cantrip' in d.lower() and 'know' in d.lower():
        m = re.search(r"know the ([A-Z][A-Za-z' ]+?) cantrip", d)
        if m:
            return f"Auto adds the {m.group(1).strip()} cantrip"
        return "Auto adds the listed cantrip to known spells"

    if 'lineage spells' in n or 'legacy spells' in n:
        return "Auto adds the listed spells to known spells at the matching character level"

    # HP bumps — Dwarven Toughness
    if 'hit point maximum' in d.lower() and 'increases by 1' in d.lower():
        return "Auto increases max HP by 1, plus another +1 per character level"

    # Languages — only auto-add the languages the SRD explicitly
    # names (e.g. "Common and Dwarvish" → both). The "one other
    # language that you and your DM agree" pattern is left blank
    # because the player chooses it themselves.
    if n == 'languages':
        # Catch "Common and X[, Y]" — explicit list — but skip the
        # "and one other language that you and your DM agree" form.
        if 'one other language' in d.lower() or 'agree is appropriate' in d.lower():
            return "Auto adds Common to languages (player + DM pick the second)"
        m = re.match(
            r"^You can speak, read, and write\s+([A-Za-z, ]+?)(?:\.|$)",
            d.strip()
        )
        if m:
            langs = re.split(r"\s*,\s*|\s+and\s+", m.group(1).strip())
            langs = [l.strip() for l in langs if l.strip()]
            if langs:
                return f"Auto adds {', '.join(langs)} to languages"
        return ''

    # Speed — when the row sets a base walking speed, emit a setter
    # note so the picker can write speed_walk. ("35 feet" / "30 feet".)
    if n == 'speed':
        m = re.search(r"(\d+)\s*feet", d)
        if m:
            return f"Set walking speed to {m.group(1)}ft"
        return ''

    # Size — the picker handles size restriction itself, but flag
    # which value(s) are offered so a reviewer can sanity-check.
    if n == 'size':
        if re.search(r"medium or small", d, re.I):
            return "Restrict size choices to Medium or Small"
        m = re.match(r"^You are (Medium|Small|Tiny|Large|Huge|Gargantuan)\b", d.strip(), re.I)
        if m:
            return f"Set size to {m.group(1).capitalize()}"
        return ''

    # Heroic inspiration grant (Human Resourceful)
    if 'heroic inspiration' in d.lower():
        return "Auto grants Heroic Inspiration on each Long Rest"

    # Carrying-capacity / size-up effects (Powerful Build)
    if 'count as one size larger' in d.lower():
        return "Counts as one size larger for carrying capacity / push / drag / lift"

    # Movement-through-creature (Halfling Nimbleness)
    if 'move through the space of any creature' in d.lower():
        return "Adds 'move through larger creatures' movement option"

    # Luck reroll (Halfling Luck)
    if 'reroll the die' in d.lower():
        return "Adds Halfling Luck reroll on natural 1s on D20 Tests"

    # Hide while obscured (Naturally Stealthy)
    if 'hide action even when' in d.lower():
        return "Adds Hide-while-obscured option (Naturally Stealthy)"

    # Trance / no sleep
    if 'meditate' in d.lower() and 'long rest in' in d.lower():
        return "Sets Long Rest to 4 hours of trance instead of 8 hours of sleep"

    # Saves with Advantage on Int / Wis / Cha (Gnomish Cunning)
    if re.search(r"advantage on intelligence, wisdom, and charisma saving throws", d, re.I):
        return "Adds advantage on INT, WIS, CHA saving throws"

    # Fall-through: leave Notes blank for the user to fill in.
    return ''


def process_csv(path: str, reset: bool = False) -> int:
    is_2024 = '/2024/' in path
    rows = []
    with open(path, newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            rows.append(row)
    if not rows:
        return 0

    out = []
    touched = 0
    seen_revelation_header = False
    for row in rows:
        while len(row) < 4:
            row.append('')
        ability, desc, category, notes = row[0], row[1], row[2], row[3]

        if ability.startswith('#') or ability == 'Ability':
            out.append(row)
            continue

        # In reset mode, blank the existing Category and Notes so
        # the heuristics can overwrite them. Hand-edited values
        # that landed via .numbers files won't reach this code path
        # — main() short-circuits when a sibling .numbers exists.
        if reset:
            row[2] = ''
            row[3] = ''
            category, notes = '', ''

        # Wave's Crash isn't in the SRD — drop the row entirely.
        if ability.strip().lower().startswith("wave's crash"):
            continue

        # 2024 races: drop ASI rows. The 2024 SRD doesn't grant
        # racial ASIs — they come from backgrounds — so leaving the
        # row in just clutters the picker preview.
        if is_2024 and ability.strip().lower() == 'ability score increase':
            continue

        # Aasimar's Celestial Revelation triggers a Bonus-Action
        # transformation that activates ONE of the three revelation
        # options below it. The options themselves take effect WHILE
        # transformed — house them under the same Bonus Action
        # bucket so the picker imports them as a coherent set.
        if 'Celestial Revelation' in ability and '(Revelation)' not in ability:
            seen_revelation_header = True
        elif '(Revelation)' in ability and seen_revelation_header:
            if category.strip() == '' or category.strip().lower() == 'special abilities':
                row[2] = 'Bonus Action'
                touched += 1

        if category.strip() == '':
            new_cat = classify_category(ability, desc)
            if new_cat:
                row[2] = new_cat
                touched += 1
        if notes.strip() == '':
            new_notes = note_for(ability, desc)
            if new_notes:
                row[3] = new_notes
        out.append(row)

    with open(path, 'w', newline='') as f:
        writer = csv.writer(f)
        for row in out:
            writer.writerow(row[:4])
    return touched


def main():
    reset_mode = '--reset' in sys.argv
    total = 0
    files = 0
    skipped = 0
    for d in DIRS:
        full = os.path.join(ROOT, d)
        if not os.path.isdir(full):
            continue
        existing_numbers = {
            fn[:-len('.numbers')] for fn in os.listdir(full) if fn.endswith('.numbers')
        }
        for fn in sorted(os.listdir(full)):
            if not fn.endswith('.csv'):
                continue
            base = fn[:-len('.csv')]
            # Skip any CSV whose corresponding .numbers exists — that
            # means the user has hand-edited it and we don't want to
            # clobber their canonical version.
            if base in existing_numbers:
                skipped += 1
                print(f"  {os.path.join(full, fn)}: SKIPPED (.numbers exists)")
                continue
            path = os.path.join(full, fn)
            touched = process_csv(path, reset=reset_mode)
            total += touched
            files += 1
            print(f"  {path}: filled {touched} categories")
    print(f"\n{total} category cells filled across {files} files. {skipped} skipped.")


if __name__ == '__main__':
    main()

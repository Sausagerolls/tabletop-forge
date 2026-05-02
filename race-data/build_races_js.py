#!/usr/bin/env python3
"""
Compile every race-data CSV (and the user-edited .numbers files
where they exist) into ../frontend/src/data/races.js. Picks up
side-effects from the Notes column so the picker can mechanically
apply them — Set Darkvision, Set walking speed, Auto adds resistance
to X, Auto adds X to languages, Restrict size choices, Auto adds the
listed spells, etc.

Spell extraction reads two patterns out of the Description text:
  1. "Level <N>: <Spell>" (one or more, space-separated sentences)
  2. "You know the <Spell> cantrip"
…both treated as min-level-gated additions to creature.spells.

Run from race-data/:
    python3 build_races_js.py

Output: frontend/src/data/races.js, replacing the previous catalogue
in full.
"""
import csv
import json
import os
import re
import sys

ROOT = os.path.dirname(__file__)
OUT = os.path.abspath(os.path.join(ROOT, '..', 'frontend', 'src', 'data', 'races.js'))

# Pretty names for sub-races whose filename slug isn't directly
# presentable. Falls back to title-casing the slug otherwise.
SUBRACE_DISPLAY = {
    'hill-dwarf':     'Hill Dwarf',
    'high-elf':       'High Elf',
    'rock-gnome':     'Rock Gnome',
    'lightfoot':      'Lightfoot Halfling',
    'stoor-halfling': 'Stoor Halfling',
    'elf-drow':       'Drow',
    'elf-high':       'High Elf',
    'elf-wood':       'Wood Elf',
    'gnome-forest':   'Forest Gnome',
    'gnome-rock':     'Rock Gnome',
    'goliath-cloud':  'Cloud Giant',
    'goliath-fire':   'Fire Giant',
    'goliath-frost':  'Frost Giant',
    'goliath-hill':   'Hill Giant',
    'goliath-stone':  'Stone Giant',
    'goliath-storm':  'Storm Giant',
    'tiefling-abyssal':  'Abyssal Legacy',
    'tiefling-chthonic': 'Chthonic Legacy',
    'tiefling-infernal': 'Infernal Legacy',
    # Dragonborn — "<Color> Dragonborn"
    **{f'dragonborn-{c}': f'{c.capitalize()} Dragonborn'
       for c in ['black','blue','brass','bronze','copper','gold','green','red','silver','white']},
}

# Sub-race dropdown label per parent race.
SUBRACE_LABEL_OVERRIDE = {
    'tiefling-2024':   'Legacy',
    'goliath-2024':    'Ancestry',
    'dragonborn-2024': 'Ancestry',
    'elf-2024':        'Lineage',
    'gnome-2024':      'Lineage',
}

# Explicit 2014 sub-race → parent map. The 2014 SRD only has a small
# number of subraces, so an exhaustive list is cleaner than a prefix-
# detection rule (which would mis-classify e.g. half-elf as an Elf
# sub-race when it's actually its own race entry).
PARENT_2014 = {
    'hill-dwarf':     'dwarf',
    'high-elf':       'elf',
    'rock-gnome':     'gnome',
    'lightfoot':      'halfling',
    'stoor-halfling': 'halfling',
}

# Category → enum mapping in races.js.
CAT_MAP = {
    'special abilities': 'specialAbility',
    'special ability':   'specialAbility',
    'action':            'action',
    'actions':           'action',
    'bonus action':      'bonusAction',
    'bonus actions':     'bonusAction',
    'reaction':          'reaction',
    'reactions':         'reaction',
}


def read_rows(path):
    """Read a CSV's body rows. If a sibling .numbers file exists,
    prefer that (the user edits the Numbers copy)."""
    base, _ = os.path.splitext(path)
    numbers_path = base + '.numbers'
    if os.path.exists(numbers_path):
        try:
            from numbers_parser import Document
        except ImportError:
            sys.stderr.write('numbers-parser not installed — falling back to CSV\n')
        else:
            doc = Document(numbers_path)
            rows = []
            for sheet in doc.sheets:
                for table in sheet.tables:
                    for r in table.rows():
                        rows.append([(str(c.value) if c.value is not None else '') for c in r])
            return _strip_headers(rows)
    with open(path, newline='') as f:
        return _strip_headers(list(csv.reader(f)))


def _strip_headers(rows):
    out = []
    for r in rows:
        while len(r) < 4:
            r.append('')
        if r[0].startswith('#') or r[0] == 'Ability':
            continue
        # Skip totally-empty rows
        if not any(c.strip() for c in r):
            continue
        out.append(r[:4])
    return out


# ── Side-effect detectors (read Description + Notes columns) ────────

DARKVISION_RE = re.compile(r'(\d+)\s*ft', re.I)
SPEED_RE      = re.compile(r'(\d+)\s*ft', re.I)
RESIST_RE     = re.compile(r'resistance to ([A-Za-z, ]+?)(?: damage|$)', re.I)
LANGS_RE      = re.compile(r'auto adds (.+?) to languages', re.I)
SIZE_FIXED    = re.compile(r'set size to (\w+)', re.I)
SIZE_CHOICES  = re.compile(r'restrict size choices to (.+)', re.I)
TREMOR_RE     = re.compile(r'tremorsense\s*(\d+)\s*ft', re.I)
LIGHT_BREATH  = re.compile(r'parent breath weapon damage type to (\w+)', re.I)


def parse_side_effects(rows):
    # Use the camelCase keys the React picker already consumes.
    eff = {
        'setsSize': None,
        'sizeChoices': None,
        'setsSpeed': None,
        'setsSenses': [],
        'addsResistances': [],
        'addsLanguages': [],
        'addsSpells': [],
        'breathWeaponType': None,
    }
    seen_lang = False
    for ability, desc, _cat, notes in rows:
        n = notes.strip()
        a_lower = ability.strip().lower()

        # Vision: Darkvision (active by default), Tremorsense (bonus).
        m = re.search(r'set darkvision to (\d+)\s*ft', n, re.I)
        if m:
            eff['setsSenses'].append({'type': 'darkvision', 'range': int(m.group(1))})
        m = re.search(r'set tremorsense to (\d+)\s*ft', n, re.I)
        if m:
            eff['setsSenses'].append({'type': 'tremorsense', 'range': int(m.group(1))})

        # Resistances — drop comma list "Necrotic and Radiant".
        # Restrict to known 5e damage types so spurious matches like
        # "the damage type associated with..." (Dragonborn 2014) get
        # filtered out — only the per-ancestry sub-race grants the
        # actual resistance.
        DAMAGE_TYPES = {
            'acid','bludgeoning','cold','fire','force','lightning',
            'necrotic','piercing','poison','psychic','radiant',
            'slashing','thunder',
        }
        m = re.search(r'auto adds resistance to (.+?) damage', n, re.I)
        if m:
            chunk = m.group(1)
            parts = re.split(r'\s*,\s*|\s+and\s+', chunk)
            for p in parts:
                p = p.strip().lower()
                if p in DAMAGE_TYPES:
                    eff['addsResistances'].append(p)

        # Languages
        m = LANGS_RE.search(n)
        if m and not seen_lang:
            txt = m.group(1)
            # "Common, Giant" / "Common to languages (player + DM pick…)"
            if 'pick' in txt.lower():
                eff['addsLanguages'] = ['Common']
            else:
                parts = [p.strip() for p in re.split(r'\s*,\s*|\s+and\s+', txt) if p.strip()]
                eff['addsLanguages'] = parts
            seen_lang = True

        # Size
        m = SIZE_FIXED.search(n)
        if m:
            eff['setsSize'] = m.group(1).capitalize()
        m = SIZE_CHOICES.search(n)
        if m:
            choices = re.split(r'\s*or\s*|\s*,\s*', m.group(1))
            eff['sizeChoices'] = [c.strip().capitalize() for c in choices if c.strip()]

        # Speed
        m = re.search(r'set walking speed to (\d+)\s*ft', n, re.I)
        if m:
            eff['setsSpeed'] = int(m.group(1))

        # Breath-weapon damage type (per dragonborn sub-race)
        m = LIGHT_BREATH.search(n)
        if m:
            eff['breathWeaponType'] = m.group(1).capitalize()

        # Spells — read out of Description.
        for s in extract_spells(desc):
            eff['addsSpells'].append(s)
        # "You know the X cantrip" form
        m = re.search(r"you know the ([A-Z][\w' ]+?) cantrip", desc)
        if m:
            eff['addsSpells'].append({'name': m.group(1).strip(), 'minLevel': 1})

    # Dedupe spells by (name, minLevel).
    seen = set()
    deduped = []
    for s in eff['addsSpells']:
        key = (s['name'].lower(), s.get('minLevel', 1))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(s)
    eff['addsSpells'] = deduped
    return eff


SPELL_LINE_RE = re.compile(
    r'Level\s+(\d+):\s*([A-Z][A-Za-z\' ]+?)(?:\s+cantrip)?\s*(?=\s*(?:Level\s+\d+|$|[.\)]\s*Level\s+\d+))'
)
# Friendlier per-sentence parser since the regex above mis-bites on
# adjacent sentences.
def extract_spells(desc):
    out = []
    # Replace newlines with spaces so the regex sees one line.
    text = re.sub(r'\s+', ' ', desc)
    # Capture each "Level N: <SpellName> [cantrip]" up to the next
    # "Level N:" or a sentence-ending punctuation.
    for m in re.finditer(r'Level\s+(\d+)\s*:\s*([A-Z][\w\' ]+?)(?:\s+cantrip)?\s*(?=Level\s+\d+:|\.|$)', text):
        out.append({'name': m.group(2).strip(), 'minLevel': int(m.group(1))})
    return out


# ── Build per-race objects ──────────────────────────────────────────

def parse_csv_to_def(path, edition):
    rows = read_rows(path)
    traits = []
    for ability, desc, cat, notes in rows:
        clean_cat = (cat or '').strip().lower()
        bucket = CAT_MAP.get(clean_cat)
        if not bucket:
            continue
        # Avoid stuffing the size / speed / language descriptions in
        # as 'specialAbility' rows when they're already captured
        # structurally as side-effects.
        if ability.strip().lower() in {'size', 'speed', 'languages', 'ability score increase'}:
            continue
        traits.append({
            'name': ability,
            'desc': desc,
            'category': bucket,
        })
    eff = parse_side_effects(rows)
    return {'traits': traits, **eff}


def race_id(slug, edition):
    return f'{slug}-{edition.replace("srd", "")}'  # tiefling-2024 etc.


def main():
    catalog = []
    for ed_dir in ('2014', '2024'):
        ed_full = os.path.join(ROOT, ed_dir)
        if not os.path.isdir(ed_full):
            continue
        edition_id = 'srd' + ed_dir
        files = sorted(f for f in os.listdir(ed_full) if f.endswith('.csv'))
        # Group sub-races under their parent race file.
        bases = [f[:-4] for f in files]
        parents = []
        children = {}  # parent_slug → [(child_slug, path)]
        for slug in bases:
            if ed_dir == '2014':
                if slug in PARENT_2014:
                    children.setdefault(PARENT_2014[slug], []).append(slug)
                    continue
            else:
                # 2024 sub-races follow the convention <parent>-<sub>.
                if '-' in slug and slug.split('-', 1)[0] in bases:
                    parent = slug.split('-', 1)[0]
                    children.setdefault(parent, []).append(slug)
                    continue
            parents.append(slug)

        for parent_slug in parents:
            parent_path = os.path.join(ed_full, parent_slug + '.csv')
            parent_def = parse_csv_to_def(parent_path, edition_id)
            sub_defs = []
            for child_slug in children.get(parent_slug, []):
                child_path = os.path.join(ed_full, child_slug + '.csv')
                child_def = parse_csv_to_def(child_path, edition_id)
                sub_defs.append({
                    'id': f'{child_slug}-{ed_dir}',
                    'name': SUBRACE_DISPLAY.get(child_slug, child_slug.replace('-', ' ').title()),
                    **child_def,
                })
            rid = f'{parent_slug}-{ed_dir}'
            entry = {
                'id': rid,
                'name': parent_slug.replace('-', ' ').title(),
                'creature_type': 'Humanoid',
                'edition': edition_id,
                **parent_def,
                'subraces': sub_defs,
            }
            label_override = SUBRACE_LABEL_OVERRIDE.get(rid)
            if label_override:
                entry['subraceLabel'] = label_override
            catalog.append(entry)

    write_js(catalog)


def write_js(catalog):
    """Hand-format the JS file so it stays readable and the diff
    against the previous version is sensible. We embed the catalogue
    as a literal `const RACE_CATALOG = [...]` plus the same helper
    functions the consumers use today."""
    payload = json.dumps(catalog, indent=2, ensure_ascii=False)
    body = f"""// Race catalogue — REGENERATED FROM CSV. Edit the source CSVs in
// race-data/ and re-run `python3 race-data/build_races_js.py`.

export const RACE_EDITIONS = [
  {{ id: 'srd2024', label: 'D&D 2024 SRD' }},
  {{ id: 'srd2014', label: 'D&D 5e (2014 SRD)' }},
];

export const RACE_CATALOG = {payload};

export function raceTypesForEdition(edition) {{
  const types = new Set(
    RACE_CATALOG.filter((r) => r.edition === edition).map((r) => r.creature_type)
  );
  return Array.from(types).sort();
}}

export function racesForType(type, edition) {{
  return RACE_CATALOG
    .filter((r) => r.edition === edition && r.creature_type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}}

export function findRace(raceId) {{
  return RACE_CATALOG.find((r) => r.id === raceId) || null;
}}

export function combinedRaceTraits(race, subrace) {{
  if (!race) return [];
  const all = [...(race.traits || []), ...((subrace && subrace.traits) || [])];
  return all.filter((t) => t.category && t.category !== 'property');
}}
"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        f.write(body)
    print(f'wrote {OUT}  ({len(catalog)} races)')


if __name__ == '__main__':
    main()

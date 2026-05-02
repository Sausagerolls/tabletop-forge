#!/usr/bin/env python3
"""
Pulls every 2014 SRD core race + subrace from Open5e and emits a CSV
per entry into race-data/2014/. Each CSV lists the race's named
abilities (parsed from the `traits` field) plus its base properties
(speed, size, languages, vision, ability-score increases) so the user
can tag every row with a destination — Special Abilities, Bonus
Action, Action, Reaction, or "—" for non-ability properties — before
we wire them into the iOS app's race picker.
"""
import csv
import json
import os
import re
import sys
import urllib.request

OUT_DIR = os.path.join(os.path.dirname(__file__), "2014")
os.makedirs(OUT_DIR, exist_ok=True)

CORE_RACES = [
    "dragonborn", "dwarf", "elf", "gnome",
    "half-elf", "half-orc", "halfling", "human", "tiefling",
]

# Splits a "**_Name._** description …" block into individual entries.
# Allows for trailing _ or . variations the SRD text uses inconsistently.
TRAIT_RE = re.compile(r"\*\*_([^_*]+?)\._?\*\*\s*([\s\S]*?)(?=\n\s*\*\*_|\Z)", re.MULTILINE)


def fetch(slug):
    # Open5e returns 403 to the default urllib User-Agent. A regular
    # browser-style UA gets through fine.
    url = f"https://api.open5e.com/v1/races/{slug}/"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 race-importer"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def parse_traits(blob):
    """Split a multi-trait blob into [(name, desc), ...]."""
    if not blob:
        return []
    out = []
    for m in TRAIT_RE.finditer(blob):
        name = m.group(1).strip()
        desc = m.group(2).strip()
        # Trim trailing newlines / whitespace and collapse double blanks.
        desc = re.sub(r"\n{2,}", "\n", desc).strip()
        out.append((name, desc))
    # Open5e occasionally puts a single trait without the regex anchor.
    if not out and blob.strip():
        out.append(("(unparsed)", blob.strip()))
    return out


def asi_summary(asi_list):
    if not asi_list:
        return ""
    parts = []
    for entry in asi_list:
        attrs = entry.get("attributes") or []
        v = entry.get("value")
        for a in attrs:
            parts.append(f"{a} +{v}")
    return ", ".join(parts)


def write_csv(path, rows):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Ability", "Description", "Category", "Notes"])
        for r in rows:
            w.writerow(r)


def race_to_rows(race):
    """Produce CSV rows from a race or subrace dict."""
    rows = []
    # Property-style entries first (size, speed, languages, vision, ASI).
    asi = asi_summary(race.get("asi"))
    if asi:
        rows.append(["Ability Score Increase", asi, "", ""])
    if race.get("size"):
        rows.append(["Size", race["size"].split("**_Size._**")[-1].strip(), "", ""])
    if race.get("speed_desc"):
        rows.append(["Speed", race["speed_desc"].split("**_Speed._**")[-1].strip(), "", ""])
    if race.get("languages"):
        rows.append(["Languages", race["languages"].split("**_Languages._**")[-1].strip(), "", ""])
    if race.get("vision"):
        # Vision usually has its own header (e.g. "**_Darkvision._** …")
        traits = parse_traits(race["vision"])
        for name, desc in traits:
            rows.append([name, desc, "", ""])
    # Now the meat — named traits.
    for name, desc in parse_traits(race.get("traits", "")):
        rows.append([name, desc, "", ""])
    return rows


def main():
    for slug in CORE_RACES:
        race = fetch(slug)
        name = race.get("name") or slug
        rows = race_to_rows(race)
        out_path = os.path.join(OUT_DIR, f"{slug}.csv")
        write_csv(out_path, rows)
        print(f"  wrote {out_path:40} {len(rows)} rows")
        # Subraces — Open5e nests them on the parent.
        for sub in (race.get("subraces") or []):
            sub_slug = sub.get("slug") or sub.get("name", "").lower().replace(" ", "-")
            sub_rows = race_to_rows(sub)
            sub_path = os.path.join(OUT_DIR, f"{sub_slug}.csv")
            write_csv(sub_path, sub_rows)
            print(f"    sub {sub_path:38} {len(sub_rows)} rows")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
parseSrd2024.py — extracts the 2024 SRD spell descriptions from the
official SRD 5.2.1 PDF and emits them as a JSON array on stdout.

The PDF's Spell Descriptions section runs from p.107 to p.203 (1-indexed).
Every spell follows the same regular header pattern:

    <Spell Name>            ← line by itself
    Level <N> <School> (<class list>)   OR   <School> Cantrip (<class list>)
    Casting Time: <…>
    Range: <…>
    Components: V, S, M (<material>)    ← M optional
    Duration: <…>

    <description paragraphs>

    [ Using a Higher-Level Spell Slot. <…> ]
    [ Cantrip Upgrade. <…> ]

The PDF uses small-caps for some spell names which pypdf renders as
random-case ("Acid  SplASh" instead of "Acid Splash"). We normalise
those by detecting names that follow the small-cap signature
(multiple uppercase letters mid-word) and re-titlecasing them.

Usage: python3 parseSrd2024.py /path/to/SRD_CC_v5.2.1.pdf
"""
import json
import re
import sys

import pypdf

START_PAGE = 106  # 0-indexed (p.107 in the PDF)
END_PAGE   = 204  # 0-indexed (parse up to and including p.204)

HEADER_RE = re.compile(
    r"^(?:Level\s+(?P<level>\d+)\s+(?P<schoolL>[A-Za-z]+)|(?P<schoolC>[A-Za-z]+)\s+Cantrip)"
    r"(?:\s*\((?P<classes>[^)]+)\))?$"
)
KEY_RE = re.compile(r"^(Casting Time|Range|Components|Duration)\s*:\s*(.+)$")
HIGHER_RE = re.compile(r"^\s*Using a Higher-Level Spell Slot\.\s*(.*)$")
CANTRIP_UP_RE = re.compile(r"^\s*Cantrip Upgrade\.\s*(.*)$")
PAGE_HEADER_RE = re.compile(r"System Reference Document 5\.\d+(?:\.\d+)?")
PAGE_NUMBER_RE = re.compile(r"^\s*\d{1,3}\s*$")


def normalise_name(s: str) -> str:
    """Re-titlecase a name where pypdf has produced random capitals
    from the original small-caps formatting (e.g. 'Acid  SplASh').
    Strategy: collapse whitespace, then if the line has any word with
    a non-leading capital, lowercase the whole thing and Title Case
    each word."""
    s = re.sub(r"\s+", " ", s).strip()
    # Only normalise when we see the small-cap signature.
    has_oddcaps = any(re.search(r"[a-z][A-Z]", w) for w in s.split())
    if has_oddcaps:
        s = " ".join(w.capitalize() for w in s.lower().split())
    return s


def is_header(line: str) -> bool:
    return bool(HEADER_RE.match(line.strip()))


def extract_pages(reader, start, end):
    """Return cleaned line list for the spell-descriptions range."""
    out = []
    for i in range(start, min(end + 1, len(reader.pages))):
        text = reader.pages[i].extract_text() or ""
        for line in text.split("\n"):
            stripped = line.strip()
            if not stripped:
                continue
            # Drop running headers / page numbers — they appear
            # mid-content otherwise and confuse the parser.
            if PAGE_HEADER_RE.search(stripped):
                continue
            if PAGE_NUMBER_RE.match(stripped):
                continue
            out.append(stripped)
    # The PDF wraps class lists across lines:
    #   "Level 2 Abjuration (Bard, Cleric, Druid, Paladin,"
    #   "Ranger)"
    # Merge continuation lines so the header regex matches the full
    # combined line. A line is a continuation when the previous line
    # has unbalanced open parens OR ends in a comma.
    merged = []
    for line in out:
        if merged and (
            merged[-1].count("(") > merged[-1].count(")")
            or merged[-1].rstrip().endswith(",")
        ):
            merged[-1] = merged[-1].rstrip(", ") + ", " + line if merged[-1].rstrip().endswith(",") \
                else merged[-1] + " " + line
        else:
            merged.append(line)
    return merged


def parse(reader):
    lines = extract_pages(reader, START_PAGE, END_PAGE)
    n = len(lines)

    # Two-pass parse:
    #   1. Find every header-line index (Level X / X Cantrip).
    #   2. For each header at lines[j], the spell name is exactly
    #      lines[j-1]; the description spans from after the metadata
    #      block up to lines[next_header - 2] (the line BEFORE the
    #      next spell's name). This avoids the previous reach-back
    #      heuristic that was greedily swallowing description text
    #      into the name.
    header_idx = [j for j in range(n) if is_header(lines[j])]
    if not header_idx:
        return []

    spells = []
    for i, j in enumerate(header_idx):
        if j == 0:
            continue
        name = normalise_name(lines[j - 1])
        # Section headings ("Spell Descriptions") accidentally land
        # one line before a header occasionally — skip those.
        if not name or "Spell List" in name or "Descriptions" in name:
            continue
        # Skip if the "name" still looks like a sentence fragment,
        # which means the prior spell's description ran right into
        # the new header without a clean break.
        if len(name) > 60 or name.endswith(".") or name.endswith(","):
            # Fallback: try the line two above (rare).
            if j >= 2:
                alt = normalise_name(lines[j - 2])
                if alt and len(alt) <= 60 and not alt.endswith("."):
                    name = alt
                else:
                    continue
            else:
                continue

        header = HEADER_RE.match(lines[j].strip())
        level = int(header.group("level")) if header.group("level") else 0
        school = header.group("schoolL") or header.group("schoolC") or ""
        classes_raw = header.group("classes") or ""
        classes = [c.strip() for c in classes_raw.split(",") if c.strip()]

        # Metadata immediately after the header.
        meta = {}
        k = j + 1
        while k < n and KEY_RE.match(lines[k]):
            m = KEY_RE.match(lines[k])
            meta[m.group(1)] = m.group(2).strip()
            k += 1

        # Description span: from k up to (but excluding) the line
        # before the NEXT spell's header. The line right before the
        # next header is the next spell's name — we drop that too.
        next_j = header_idx[i + 1] if i + 1 < len(header_idx) else n
        desc_end = max(k, next_j - 1)  # exclude name of next spell

        desc_parts = []
        higher_parts = []
        in_higher = False
        for ln in lines[k:desc_end]:
            higher_match = HIGHER_RE.match(ln) or CANTRIP_UP_RE.match(ln)
            if higher_match:
                in_higher = True
                rest = higher_match.group(1).strip()
                if rest:
                    higher_parts.append(rest)
                continue
            if in_higher:
                higher_parts.append(ln)
            else:
                desc_parts.append(ln)

        comps = meta.get("Components", "")
        material_match = re.search(r"\((.+?)\)\s*$", comps)
        material = material_match.group(1) if material_match else ""
        comp_letters = re.sub(r"\(.+?\)", "", comps)

        spell = {
            "name": name,
            "level": level,
            "school": school,
            "classes": classes,
            "casting_time": meta.get("Casting Time", ""),
            "range": meta.get("Range", ""),
            "components": "".join(c for c in comp_letters if c in "VSM"),
            "material": material,
            "duration": meta.get("Duration", ""),
            "description": " ".join(desc_parts).strip(),
            "higher_level": " ".join(higher_parts).strip(),
        }
        if spell["casting_time"] and spell["range"]:
            spells.append(spell)

    # De-duplicate by name (rare PDF edge cases).
    seen = {}
    for s in spells:
        seen[s["name"]] = s
    return list(seen.values())


def main():
    if len(sys.argv) < 2:
        print("usage: parseSrd2024.py <pdf>", file=sys.stderr)
        sys.exit(1)
    reader = pypdf.PdfReader(sys.argv[1])
    out = parse(reader)
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()

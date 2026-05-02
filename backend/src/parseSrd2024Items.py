#!/usr/bin/env python3
"""
parseSrd2024Items.py — extracts the 2024 SRD magic items from the
official SRD 5.2.1 PDF. Emits a JSON array on stdout.

The Magic Items chapter runs p.204-253 (1-indexed). Each item has a
predictable two-line header followed by description text:

    <Item Name>                        ← line by itself
    <Type[, qualifier]>, <Rarity>[ (Requires Attunement[ by ...])]
    <description paragraphs...>

Where Type is one of: Armor, Weapon, Wand, Wondrous Item, Potion,
Ring, Rod, Scroll, Staff. Rarity is Common / Uncommon / Rare /
Very Rare / Legendary / Artifact (or a comma-separated parenthetical
range like "Uncommon (+1), Rare (+2), or Very Rare (+3)").

Usage: python3 parseSrd2024Items.py /path/to/SRD_CC_v5.2.1.pdf
"""
import json
import re
import sys

import pypdf

START_PAGE = 203   # 0-indexed (p.204 chapter start)
END_PAGE   = 254   # 0-indexed exclusive (chapter ends p.253)

PAGE_HEADER_RE = re.compile(r"System Reference Document 5\.\d+(?:\.\d+)?")
PAGE_NUMBER_RE = re.compile(r"^\s*\d{1,3}\s*$")

# Type/rarity classifier line — matches the second line of every entry.
TYPE_TOKENS = (
    r"Armor|Weapon|Wand|Wondrous Item|Potion|Ring|Rod|Scroll|Staff"
)
RARITY_TOKENS = (
    r"Common|Uncommon|Rare|Very Rare|Legendary|Artifact"
)
# `Wondrous Item, Common`  /  `Armor (Plate), Very Rare (Requires Attunement)`
# /  `Weapon (Any), Uncommon (+1), Rare (+2), or Very Rare (+3)`
# Strict: must START with one of the type tokens.
TYPE_LINE_RE = re.compile(
    rf"^\s*({TYPE_TOKENS})(?:\s*\([^)]+\))?,\s*({RARITY_TOKENS})\b.*$"
)

ATTUNEMENT_RE = re.compile(r"\(Requires\s+Attunement[^)]*\)", re.IGNORECASE)


def normalise_name(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    has_oddcaps = any(re.search(r"[a-z][A-Z]", w) for w in s.split())
    if has_oddcaps:
        s = " ".join(w.capitalize() for w in s.lower().split())
    return s


def collect_lines(reader, start, end):
    lines = []
    for i in range(start, end):
        text = reader.pages[i].extract_text() or ""
        for raw in text.split("\n"):
            ln = raw.rstrip()
            if not ln.strip():
                lines.append("")
                continue
            if PAGE_HEADER_RE.search(ln) and len(ln) < 60:
                continue
            if PAGE_NUMBER_RE.match(ln):
                continue
            lines.append(ln)
    return lines


def split_items(lines):
    """Walk the line list; whenever a TYPE_LINE matches, the line
    *before* it (skipping blanks) is the item name and lines until
    the next TYPE_LINE form the description. Two-line names are
    rare in this chapter — the only case is when the title wraps a
    line break, which we detect by the line above the name being
    a continuation rather than a blank."""
    items = []
    n = len(lines)
    headers = []  # (name_start_idx, type_idx, name, type_line)
    for i, ln in enumerate(lines):
        m = TYPE_LINE_RE.match(ln)
        if not m:
            continue
        # Walk back across non-blank lines until we hit a blank or a
        # line that looks like end-of-paragraph (sentence-final period).
        # That gives us the full multi-line name. The first non-blank
        # line above is the trailing fragment.
        j = i - 1
        while j >= 0 and not lines[j].strip():
            j -= 1
        if j < 0:
            continue
        # j is the last name line. Magic item names in this PDF wrap
        # to at most two lines, and the second line ALWAYS starts with
        # a lowercase continuation word ("and Location"). Joining only
        # when the trailing fragment starts lowercase is the safe rule:
        # uppercase-starts are always complete on one line, and lower-
        # case-starts are always genuine continuations. This avoids the
        # table-row false positives ("Copper Acid White Cold Dragon
        # Slayer", "Defender") that a more lenient rule allowed.
        k = j
        tail = lines[j].strip()
        if tail and tail[0].islower() and k - 1 >= 0 and lines[k - 1].strip():
            prev = lines[k - 1].strip()
            if (
                len(prev) < 50
                and not re.search(r"\d", prev)
                and not re.search(r"[.\?!:;]$", prev)
            ):
                k -= 1
        name = " ".join(lines[idx].strip() for idx in range(k, j + 1))
        # Defend against false positives. Names that ARE a type-line
        # themselves are subsection headings ("Wondrous Item, Common"
        # is the rarity row, never an item name). But "Weapon, +1, +2,
        # or +3" is a valid item name even though it starts with a type
        # token. Reject only when the line is itself a type-line.
        if not name or TYPE_LINE_RE.match(name):
            continue
        headers.append((k, i, normalise_name(name), ln))

    for k, (name_idx, type_idx, name, type_line) in enumerate(headers):
        body_start = type_idx + 1
        # body ends at next entry's name line.
        body_end = headers[k + 1][0] if k + 1 < len(headers) else n
        body = "\n".join(lines[body_start:body_end]).strip()
        # 1) Squash hyphenated word-breaks. The PDF emits "ar -\nmor"
        #    with a SPACE between "ar" and the dash; eat any whitespace
        #    surrounding the dash + newline.
        body = re.sub(r"\s*-\s*\n\s*", "", body)
        # 2) Re-flow paragraphs. PDF text is wrapped column-by-column
        #    so most "newlines" are mid-paragraph wraps, not paragraph
        #    breaks. Mark blank-line gaps as paragraphs, fold the rest.
        body = re.sub(r"\n[ \t]*\n+", "␟", body)
        body = re.sub(r"\s*\n\s*", " ", body)
        body = body.replace("␟", "\n\n")
        body = re.sub(r"[ \t]+", " ", body).strip()

        # Parse type + rarity + attunement from the type_line.
        m = TYPE_LINE_RE.match(type_line)
        item_type_raw = m.group(1)
        rarity = m.group(2).lower()
        attunement_match = ATTUNEMENT_RE.search(type_line)
        attunement_req = attunement_match.group(0).strip("()") if attunement_match else ""

        # Map to our internal item_type. Most entries come in as
        # "magic_item" — but Armor/Weapon/Shield specific magic items
        # we still classify as 'magic_item' here so the inventory editor
        # treats them like flavor text rather than a stat-bearing armor.
        item_type = "magic_item"

        items.append({
            "name": name,
            "item_type": item_type,
            "rarity": rarity,
            "attunement": bool(attunement_match),
            "attunement_req": attunement_req,
            "description": body,
            "source": "SRD 5.2.1 (2024)",
            "edition": "2024",
        })
    return items


def main():
    if len(sys.argv) < 2:
        print("usage: parseSrd2024Items.py <pdf>", file=sys.stderr)
        sys.exit(1)
    reader = pypdf.PdfReader(sys.argv[1])
    end = min(END_PAGE, len(reader.pages))
    lines = collect_lines(reader, START_PAGE, end)
    items = split_items(lines)
    json.dump(items, sys.stdout)


if __name__ == "__main__":
    main()

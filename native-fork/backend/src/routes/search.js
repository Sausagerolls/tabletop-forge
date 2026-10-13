// /api/search — one box, everything in the rules.
//
// Two places hold reference material and a player should not have to know
// which: the GM's own libraries in this database (the spells and items they
// have imported or written, the stat blocks they have built) and the 5etools
// mirror behind compendium.js / reference.js. This route asks both and merges
// the answers.
//
// WHAT A PLAYER MAY SEE
//
// The mirror is published rulebooks — a player looking up Fireball or the
// Grappled condition is reading what they could read at the table, so every
// kind of it is open to everyone.
//
// The GM's own rows are not that. Two rules, both enforced here rather than in
// the client, because anything sent to a browser is readable in that browser:
//
//   1. `gm_secret` on a library item is stripped for anyone who is not the GM,
//      exactly as /api/item-library does it, and removed rather than blanked so
//      its absence is not itself a clue (see itemSecrets.js).
//   2. The GM's creature library is GM-only. Those rows are the campaign's
//      NPCs and its monsters-with-changes, and which of them exist is itself a
//      spoiler. A player searching for a monster still finds the published one
//      from the mirror.
//
// "Is this the GM asking" is `?role=dm`, the same query parameter the rest of
// the app uses. The caveat in itemSecrets.js applies here too: it keeps secrets
// out of players' clients in normal use; it is not a wall against a crafted
// request.

const express = require('express');
const db = require('../db');
const reference = require('../reference');
const compendium = require('../compendium');
const { asksAsDm, SECRET } = require('../itemSecrets');

const router = express.Router();

// Kinds the client may ask for, and where each is answered from. `local` names
// the table; `mirror` names the reference.js kind.
const LOCAL_KINDS = {
  spell:    { table: 'spell_library', gm_only: false },
  item:     { table: 'item_library',  gm_only: false },
  creature: { table: 'creatures',     gm_only: true  },
};

// Which ruleset a book belongs to. 5etools does not stamp an edition on a
// spell or an item — the source is the edition — so this is the mapping, and
// anything unlisted is 2014, which is where the long tail of older books sits.
const SOURCES_2024 = new Set(['XPHB', 'XDMG', 'XMM', 'EFA', 'RHW']);
const editionOf = (source) => (SOURCES_2024.has(String(source || '').toUpperCase()) ? '2024' : '2014');

// Where the mirror keeps a creature's token: by source, then by name.
function tokenUrl(name, source) {
  if (!name || !source) return null;
  const path = `img/bestiary/tokens/${encodeURIComponent(source)}/${encodeURIComponent(name)}.webp`;
  return `/api/compendium/img?path=${encodeURIComponent(path)}`;
}

const signed = (n) => {
  const v = Number(n) || 0;
  return v > 0 ? `+${v}` : String(v);
};

const titleWord = (s) => {
  const t = String(s || '');
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};

const clampLimit = (v, def, max) => Math.max(1, Math.min(max, Number(v) || def));

// A library row reduced to the three fields every result needs.
function localRow(kind, row) {
  if (kind === 'spell') {
    const lvl = Number(row.level) || 0;
    return {
      kind: 'spell',
      origin: 'library',
      id: row.id,
      edition: row.edition || '',
      school: row.school || '',
      name: row.name,
      // The edition alone. It used to read "SRD 2014", which stopped being
      // true the moment the library held the whole catalogue rather than the
      // SRD — Jim's Magic Missile is many things, but it is not SRD.
      subtitle: lvl === 0 ? `${row.school || ''} cantrip`.trim() : `Level ${lvl} ${row.school || ''}`.trim(),
    };
  }
  if (kind === 'item') {
    return {
      kind: 'item',
      origin: 'library',
      id: row.id,
      edition: row.edition || '',
      // "rare", "very rare", "legendary" — anything but none or common means a
      // magic item, which is the distinction worth drawing.
      magic: !!(row.rarity && !['none', 'common', ''].includes(String(row.rarity).toLowerCase()))
        || String(row.item_type || '').toLowerCase() === 'magic_item',
      name: row.name,
      subtitle: [row.rarity && row.rarity !== 'none' ? row.rarity : '', row.item_type || '']
        .filter(Boolean).join(' · ') || 'Item',
    };
  }
  return {
    kind: 'creature',
    origin: 'library',
    id: row.id,
    // The token face, for the row's own icon. The GM gave this creature a
    // picture; a generic silhouette beside it would be a waste of it.
    thumb: row.image_path ? `/uploads/${row.image_path}` : null,
    name: row.name,
    subtitle: [titleWord(row.size), row.creature_type, row.challenge_rating ? `CR ${row.challenge_rating}` : '']
      .filter(Boolean).join(' · ') || 'Creature',
  };
}

async function searchLocal(kind, q, limit, isDm) {
  const def = LOCAL_KINDS[kind];
  if (!def || (def.gm_only && !isDm)) return [];
  const like = `%${q}%`;
  const extra = kind === 'creature' ? 'AND is_player_character = false' : '';
  const rows = (await db.query(
    `SELECT * FROM ${def.table}
      WHERE name ILIKE $1 ${extra}
      ORDER BY (LOWER(name) = LOWER($2)) DESC,
               (LOWER(name) LIKE LOWER($3)) DESC,
               length(name), name
      LIMIT $4`,
    [like, q, `${q}%`, limit]
  )).rows;
  return rows.map((r) => localRow(kind, r));
}

// GET /api/search?q=fireball&kinds=spell,item&limit=40&role=dm
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = clampLimit(req.query.limit, 40, 100);
  const isDm = asksAsDm(req);
  const wanted = String(req.query.kinds || '').split(',').map((k) => k.trim()).filter(Boolean);
  const want = (k) => !wanted.length || wanted.includes(k);

  if (!q) return res.json({ results: [], kinds: kindList(isDm) });

  // The libraries and the mirror are asked at the same time: the mirror's first
  // call of the hour builds an index and the database should not wait for it.
  const [local, mirror, creatures] = await Promise.all([
    Promise.all(Object.keys(LOCAL_KINDS).filter(want).map((k) =>
      searchLocal(k, q, 12, isDm).catch((err) => {
        console.error(`search: local ${k} failed:`, err.message);
        return [];
      })
    )).then((lists) => lists.flat()),

    reference.searchAll(q, {
      limit: 60,
      kinds: Object.keys(reference.KINDS).filter(want),
    }).catch((err) => {
      console.error('search: mirror failed:', err.message);
      return [];
    }),

    want('creature')
      ? compendium.searchCreatures(q, 12).catch((err) => {
        console.error('search: bestiary failed:', err.message);
        return [];
      })
      : [],
  ]);

  const results = [
    ...local,
    ...creatures.map((c) => ({
      kind: 'creature',
      origin: 'compendium',
      key: `${c.name}|${c.source}|`,
      name: c.name,
      source: c.source,
      edition: editionOf(c.source),
      // Guessed, not looked up: the mirror names tokens by source and name, so
      // this costs nothing per result, and the client falls back to its drawn
      // icon for the creatures that have none.
      thumb: tokenUrl(c.name, c.source),
      subtitle: [titleWord(c.size), c.type, c.cr ? `CR ${c.cr}` : ''].filter(Boolean).join(' · '),
    })),
    ...mirror.map((m) => ({
      kind: m.kind,
      origin: 'compendium',
      key: m.key,
      name: m.name,
      source: m.source,
      edition: m.edition || editionOf(m.source),
      school: m.school || undefined,
      magic: m.magic || undefined,
      subtitle: m.subtitle,
    })),
  ];

  // The GM's own copy wins over the published one — but only for the SAME
  // EDITION.
  //
  // Suppressing by name alone hid real spells. A library holding a scanned
  // 2014 Fireball and no 2024 row answered a search for Fireball with the 2014
  // text only: the 2024 one from the rulebooks was dropped as a duplicate of a
  // spell it is not. So the edition is part of the identity, and a name the
  // library has in one edition still shows the other from the mirror.
  // A creature row carries no edition at all, so an empty one is a wildcard:
  // the GM's own Goblin still stands in for the published Goblin, the way it
  // always did, while their 2014 Fireball no longer hides the 2024 one.
  const seen = new Map();                 // 'kind:name' -> Set(editions held)
  const merged = [];
  for (const r of results) {
    if (r.origin !== 'library') continue;
    const id = `${r.kind}:${r.name.toLowerCase()}`;
    if (!seen.has(id)) seen.set(id, new Set());
    seen.get(id).add(r.edition || '');
  }
  const shadowed = (r) => {
    const held = seen.get(`${r.kind}:${r.name.toLowerCase()}`);
    return !!held && (held.has('') || held.has(r.edition || ''));
  };
  const taken = new Set();
  for (const r of results) {
    const id = `${r.kind}:${r.name.toLowerCase()}`;
    if (r.origin === 'compendium' && shadowed(r)) continue;
    const dedup = `${id}:${r.origin}:${r.key || r.id || ''}`;
    if (taken.has(dedup)) continue;
    taken.add(dedup);
    merged.push(r);
  }

  const lower = q.toLowerCase();
  const score = (r) => {
    const n = r.name.toLowerCase();
    if (n === lower) return 0;
    if (n.startsWith(lower)) return 1;
    if (n.includes(` ${lower}`)) return 2;
    return 3;
  };
  merged.sort((a, b) => score(a) - score(b)
    || (a.origin === b.origin ? 0 : a.origin === 'library' ? -1 : 1)
    || a.name.length - b.name.length
    || a.name.localeCompare(b.name));

  res.json({ results: merged.slice(0, limit), kinds: kindList(isDm) });
});

function kindList(isDm) {
  const out = [
    { kind: 'spell', label: 'Spells' },
    { kind: 'item', label: 'Items' },
    { kind: 'creature', label: isDm ? 'Creatures' : 'Monsters' },
    { kind: 'class', label: 'Classes' },
    { kind: 'subclass', label: 'Subclasses' },
    { kind: 'classFeature', label: 'Class features' },
    { kind: 'subclassFeature', label: 'Subclass features' },
    { kind: 'option', label: 'Class options' },
    { kind: 'feat', label: 'Feats' },
    { kind: 'species', label: 'Species' },
    { kind: 'background', label: 'Backgrounds' },
    { kind: 'condition', label: 'Conditions' },
    { kind: 'action', label: 'Actions' },
    { kind: 'rule', label: 'Rules' },
  ];
  return out;
}

// GET /api/search/entry?origin=&kind=&key=   (the mirror)
// GET /api/search/entry?origin=library&kind=&id=
router.get('/entry', async (req, res) => {
  const kind = String(req.query.kind || '');
  const origin = String(req.query.origin || 'compendium');
  const isDm = asksAsDm(req);

  try {
    if (origin === 'library') {
      const def = LOCAL_KINDS[kind];
      if (!def) return res.status(400).json({ error: 'Unknown kind' });
      if (def.gm_only && !isDm) return res.status(403).json({ error: 'GM only' });
      const row = (await db.query(
        `SELECT * FROM ${def.table} WHERE id = $1`, [req.query.id]
      )).rows[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      const entry = libraryDetail(kind, row, isDm);
      // An item the GM wrote can lend spells too — a Bell of the Unseen
      // Servant, a Staff of Defence. Same chips as a published item's, so the
      // spell it casts is one tap away wherever the item came from.
      if (kind === 'item') {
        const granted = Array.isArray(row.grants_spells) ? row.grants_spells : [];
        if (granted.length) {
          entry.spells = await reference.resolveSpellNames(granted.map((g) => g?.name).filter(Boolean));
        }
        // The charge pool, which the library stores as a small object.
        const ch = row.charges && typeof row.charges === 'object' ? row.charges : null;
        if (ch?.max) {
          entry.meta.push({
            label: 'Charges',
            value: `${ch.max}${ch.regain ? ` · regains ${ch.regain}` : ''}${ch.recharge ? ` at ${ch.recharge}` : ''}`,
          });
        }
      }
      // A creature is not prose. The row IS a stat block, and the app already
      // has a component that draws one, so it travels whole and the client
      // renders it the way every other stat block in the app is rendered.
      if (kind === 'creature') {
        entry.creature = row;
        // The artwork the GM gave it. `display_image_path` is the "show the
        // players" picture and the better one to read a stat block beside;
        // `image_path` is the token face and stands in when there is no other.
        const art = row.display_image_path || row.image_path;
        if (art) entry.image = `/uploads/${art}`;
      }
      return res.json({ entry });
    }

    if (kind === 'creature') {
      const [name, source] = String(req.query.key || '').split('|');
      const found = await compendium.getMonster(name, source);
      if (!found) return res.status(404).json({ error: 'Not found' });
      // The same converter the import path uses, so what a player reads and
      // what the GM would place on the map are one stat block, not two.
      const creature = compendium.monsterToCreature(found.monster);
      const entry = creatureDetail(creature, found.indexRow, found.approximated);
      // The same converted row the import path would store, so what a player
      // reads here and what the GM would place on the map are one stat block.
      entry.creature = creature;

      // The picture, as a URL through the image proxy — the mirror sends no
      // CORS headers, so the browser cannot fetch one directly. Paths only:
      // a 40 MB illustration never passes through this process on its way to
      // one client. The full art is preferred over the token because this is
      // something to look at, not something to put on a map; no picture at all
      // is a perfectly ordinary outcome and simply leaves the card as it was.
      try {
        const art = await compendium.artPaths(found.monster, found.indexRow);
        const pick = art.art || art.token;
        if (pick) entry.image = `/api/compendium/img?path=${encodeURIComponent(pick)}`;
      } catch (err) {
        console.error('search: art lookup failed:', err.message);
      }
      return res.json({ entry });
    }

    const entry = await reference.getEntry(kind, req.query.key || req.query.name, req.query.source);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    // A mirror path becomes a URL here, through the same proxy a creature's
    // art uses: the mirror sends no CORS headers, so the browser cannot fetch
    // one for itself.
    if (entry.imagePath) {
      // A path already rooted at this server — a locally-written class whose
      // art lives in uploads/ — is served as it stands. Only a MIRROR path
      // goes through the proxy, which is what the proxy is for.
      entry.image = entry.imagePath.startsWith('/')
        ? entry.imagePath
        : `/api/compendium/img?path=${encodeURIComponent(entry.imagePath)}`;
      delete entry.imagePath;
    }
    res.json({ entry });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

function libraryDetail(kind, row, isDm) {
  const meta = [];
  const add = (label, value) => { if (value) meta.push({ label, value: String(value) }); };
  const body = [];

  if (kind === 'spell') {
    add('Casting time', row.casting_time);
    add('Range', row.range_area);
    add('Duration', row.duration);
    const comps = [row.comp_v && 'V', row.comp_s && 'S',
      row.comp_m && (row.comp_m_text ? `M (${row.comp_m_text})` : 'M')].filter(Boolean);
    add('Components', comps.join(', '));
    add('Classes', (Array.isArray(row.allowed_classes) ? row.allowed_classes : []).join(', '));
    body.push(row.description || '');
    if (row.extra_effects) body.push(row.extra_effects);
  } else if (kind === 'item') {
    // The library row carries the same facts the rulebooks do, in its own
    // columns — damage, properties, armour class, charges. They were going
    // unread: the card showed four chips and then the description, so a GM's
    // own copy of a weapon told you less than the published one it shadows.
    add('Type', row.item_type);
    add('Rarity', row.rarity);
    add('Attunement', row.attunement_req || (row.attunement ? 'Required' : ''));
    const dmg = (Array.isArray(row.damage_entries) ? row.damage_entries : [])
      .filter((d) => d && d.damage)
      .map((d) => [d.damage, d.damage_type, d.label ? `(${d.label})` : '', d.condition ? `— ${d.condition}` : '']
        .filter(Boolean).join(' '))
      .join(', ');
    add('Damage', dmg);
    add('Attack bonus', row.attack_bonus_misc ? signed(row.attack_bonus_misc) : '');
    add('Damage bonus', row.damage_bonus_misc ? signed(row.damage_bonus_misc) : '');
    add('Attacks with', row.attack_stat);
    add('Range', row.weapon_range);
    add('Properties', row.properties);
    add('Mastery', row.mastery);
    add('Armour class', row.ac_base ? String(row.ac_base) : (row.ac_bonus ? signed(row.ac_bonus) : ''));
    add('Armour', row.armor_category);
    add('Strength needed', row.str_req ? `Str ${row.str_req}` : '');
    add('Stealth', row.stealth_disadvantage ? 'Disadvantage' : '');
    add('Charges', row.charges ? String(row.charges) : '');
    add('Weight', row.weight ? `${row.weight} lb.` : '');
    add('Cost', row.cost);
    body.push(row.description || '');
    // The whole point of the gate: a player's client never receives this.
    if (isDm && row[SECRET]) body.push(`GM only — ${row[SECRET]}`);
  } else {
    add('Size', row.size);
    add('Type', row.creature_type);
    add('AC', row.armor_class);
    add('HP', row.hit_points);
    add('CR', row.challenge_rating);
    body.push(row.description || '');
  }

  return {
    kind,
    origin: 'library',
    label: kind === 'spell' ? 'Spell' : kind === 'item' ? 'Item' : 'Creature',
    name: row.name,
    source: row.source || 'Your library',
    edition: row.edition || '',
    subtitle: localRow(kind, row).subtitle,
    meta,
    body: body.filter(Boolean).join('\n\n'),
    secret: isDm && kind === 'item' ? (row[SECRET] || '') : '',
  };
}

function creatureDetail(c, indexRow, approximated) {
  const meta = [
    { label: 'AC', value: String(c.armor_class ?? '') },
    { label: 'HP', value: String(c.hit_points ?? '') },
    { label: 'Speed', value: String(c.speed_walk ?? '') + ' ft.' },
    { label: 'CR', value: String(c.challenge_rating ?? '') },
  ].filter((m) => m.value && m.value !== 'null' && m.value !== ' ft.');

  const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    .map((k) => `${k.slice(0, 3).toUpperCase()} ${c[k] ?? 10}`).join('  ');

  const named = (title, list) => {
    const rows = Array.isArray(list) ? list : [];
    return rows.length ? `${title}\n${rows.map((a) => `${a.name}. ${a.desc}`).join('\n')}` : '';
  };

  return {
    kind: 'creature',
    origin: 'compendium',
    label: 'Monster',
    name: c.name,
    source: indexRow?.source || '',
    edition: editionOf(indexRow?.source),
    subtitle: [titleWord(c.size), c.creature_type, c.challenge_rating ? `CR ${c.challenge_rating}` : '']
      .filter(Boolean).join(' · '),
    meta,
    body: [
      stats,
      named('Traits', c.special_abilities),
      named('Actions', c.actions),
      named('Bonus actions', c.bonus_actions),
      named('Reactions', c.reactions),
      named('Legendary actions', c.legendary_actions),
      approximated ? 'This entry is written as a variant of another and is shown approximately.' : '',
    ].filter(Boolean).join('\n\n'),
    importable: true,
  };
}

// GET /api/search/class-spells?class=Wizard
//
// Every spell on a class's list, which is a different question from "what does
// this character know" — it is the whole pool they may ever learn or prepare,
// and it is the one thing a class page cannot answer from its own record.
router.get('/class-spells', async (req, res) => {
  try {
    const spells = await reference.spellsForClass(req.query.class);
    res.json({ class: String(req.query.class || ''), spells });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;

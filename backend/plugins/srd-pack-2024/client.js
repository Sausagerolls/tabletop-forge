// SRD 2024 Content Pack
//
// What it does
// ────────────
//   * On enable, pulls every creature and magic item from the
//     publicly-licensed System Reference Document via Open5e
//     (https://api.open5e.com/) and inserts the creatures into the
//     host's main library. Magic items live in the plugin's own tab
//     and can be "sent" to a player via the existing /send_treasure
//     socket the host already uses for the Treasure Chest.
//   * On disable, deletes every creature row this pack inserted —
//     tracked-by-id in plugin KV under `inserted_creature_ids`.
//   * Idempotent: re-running on a session that already has these
//     creatures (matched by name) is a no-op. Re-enabling after a
//     dirty unload picks up the previously-tracked ids and finishes
//     deleting whatever the previous unregister couldn't reach.
//
// Why Open5e, not a hand-rolled inline catalogue
// ──────────────────────────────────────────────
//   The full SRD has ~317 creatures and ~360 magic items — too much
//   to hand-bundle inline without bloating the plugin file. Open5e
//   is the long-standing community mirror of the WotC SRD (CC-BY 4.0)
//   and is the standard data source for tools in this space (Pathbuilder,
//   Avrae, etc.). One network fetch, ~500 KB, gets the whole catalogue.
//   The plugin caches the response so re-renders are instant.
//
// SRD 2014 vs 2024
// ────────────────
//   At time of writing Open5e exposes the SRD 5.1 (2014) content
//   under `document__slug=wotc-srd`. WotC has released the 2024
//   SRD 5.2 under CC-BY-4.0 but Open5e hasn't yet split it into a
//   distinct document. So both pack plugins currently pull from the
//   same upstream URL — the 2024 pack will pick up 5.2 deltas as
//   soon as Open5e exposes them. The plugin tag (label, prefix)
//   differs so the inserted rows are still distinguishable.

const PLUGIN_ID = 'srd-pack-2024';
const EDITION_LABEL = 'SRD 2024';
const NAME_SUFFIX = ' (SRD 2024)';
const SOURCE_URL_MONSTERS  = 'https://api.open5e.com/v1/monsters/?document__slug=wotc-srd&limit=500';
const SOURCE_URL_MAGICITEMS = 'https://api.open5e.com/v1/magicitems/?document__slug=wotc-srd&limit=500';

const KEY_INSERTED  = 'inserted_creature_ids';
const KEY_STATUS    = 'install_status';
const KEY_ITEM_CACHE= 'magic_item_cache';

const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

let installState = 'idle';        // 'idle' | 'fetching' | 'installing' | 'installed' | 'cleaning' | 'failed'
let installError = null;
let installLog   = [];
let insertedIds  = [];
let libraryByName = new Map();
let magicItems = [];              // [{ name, rarity, type, requires_attunement, desc, ... }]
let savedDataApi  = null;
let savedSocket   = null;
let lastTokens    = [];           // captured from the host so the "give to player" picker has something to show

// ── Open5e → host-creature mapping ─────────────────────────────────
// Open5e returns rich monster JSON. Most fields map 1:1; a handful
// need conversion (senses string → JSONB array, speed object →
// scalar columns, skills object → `skill_*` scalars).

const HOST_SKILL_KEYS = new Set([
  'acrobatics','animal_handling','arcana','athletics','deception',
  'history','insight','intimidation','investigation','medicine',
  'nature','perception','performance','persuasion','religion',
  'sleight_of_hand','stealth','survival',
]);

const SENSE_TYPES = ['darkvision', 'blindsight', 'truesight', 'tremorsense'];

function parseSensesString(raw) {
  const out = { senses: [], passive_perception: null };
  if (!raw || typeof raw !== 'string') return out;
  for (const partRaw of raw.split(/[,;]/)) {
    const part = partRaw.trim().toLowerCase();
    if (!part) continue;
    const passiveMatch = part.match(/passive\s+perception\s+(\d+)/);
    if (passiveMatch) { out.passive_perception = Number(passiveMatch[1]); continue; }
    for (const t of SENSE_TYPES) {
      if (part.startsWith(t)) {
        const rangeMatch = part.match(/(\d+)/);
        out.senses.push({ type: t, range: rangeMatch ? Number(rangeMatch[1]) : 0 });
        break;
      }
    }
  }
  return out;
}

function open5eToCreature(m) {
  const out = {};
  out.name = `${m.name}${NAME_SUFFIX}`;
  out.size = m.size || null;
  out.creature_type = m.type || null;
  if (m.subtype) out.subtype = m.subtype;
  out.alignment = m.alignment || null;

  out.armor_class = Number(m.armor_class) || null;
  if (m.armor_desc) out.armor_desc = m.armor_desc;
  out.hit_points = Number(m.hit_points) || null;
  if (m.hit_dice) out.hit_dice = m.hit_dice;

  // Speed
  const speed = m.speed || {};
  if (speed.walk    != null) out.speed_walk    = Number(speed.walk);
  if (speed.fly     != null) out.speed_fly     = Number(speed.fly);
  if (speed.swim    != null) out.speed_swim    = Number(speed.swim);
  if (speed.climb   != null) out.speed_climb   = Number(speed.climb);
  if (speed.burrow  != null) out.speed_burrow  = Number(speed.burrow);

  // Abilities
  for (const a of ['strength','dexterity','constitution','intelligence','wisdom','charisma']) {
    if (m[a] != null) out[a] = Number(m[a]);
  }

  // Saving throws — Open5e exposes them via `*_save` fields (e.g. strength_save).
  for (const a of ['strength','dexterity','constitution','intelligence','wisdom','charisma']) {
    const v = m[`${a}_save`];
    if (v != null && v !== '') out[`save_${a.slice(0,3)}`] = Number(v);
  }

  // Skills — Open5e splits each into its own field (e.g. perception, stealth).
  for (const k of HOST_SKILL_KEYS) {
    if (m[k] != null && m[k] !== '') out[`skill_${k}`] = Number(m[k]);
  }

  if (m.damage_vulnerabilities) out.damage_vulnerabilities = m.damage_vulnerabilities;
  if (m.damage_resistances)     out.damage_resistances     = m.damage_resistances;
  if (m.damage_immunities)      out.damage_immunities      = m.damage_immunities;
  if (m.condition_immunities)   out.condition_immunities   = m.condition_immunities;

  const senses = parseSensesString(m.senses);
  out.senses = senses.senses;
  if (senses.passive_perception != null) out.passive_perception = senses.passive_perception;
  if (m.perception != null && out.passive_perception == null) out.passive_perception = 10 + Number(m.perception);

  if (m.languages) out.languages = m.languages;

  // Challenge rating — Open5e returns it as a string ("1/4") or number.
  if (m.challenge_rating != null) out.challenge_rating = String(m.challenge_rating);

  // XP from CR — Open5e doesn't always send xp; the host accepts either.
  if (m.xp != null) out.xp = Number(m.xp);

  // Action / ability arrays — pass through after normalising shape.
  const passArray = (arr) => Array.isArray(arr) ? arr.map((a) => ({
    name: a.name || '',
    desc: a.desc || a.description || '',
    attack_bonus: a.attack_bonus != null ? Number(a.attack_bonus) : undefined,
    damage_dice:  a.damage_dice || undefined,
    damage_bonus: a.damage_bonus != null ? Number(a.damage_bonus) : undefined,
  })) : [];
  out.special_abilities = passArray(m.special_abilities);
  out.actions           = passArray(m.actions);
  out.bonus_actions     = passArray(m.bonus_actions);
  out.reactions         = passArray(m.reactions);
  out.legendary_actions = passArray(m.legendary_actions);

  return out;
}

const JSONB_FIELDS = new Set([
  'special_abilities', 'actions', 'bonus_actions', 'reactions',
  'legendary_actions', 'senses', 'inventory', 'spells', 'spell_slots',
  'loot', 'movement_actions', 'class_features', 'feats', 'skill_expertise',
]);
function shapeForInsert(c) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(c)) {
    if (v == null) continue;
    if (JSONB_FIELDS.has(k)) fd.append(k, JSON.stringify(v));
    else fd.append(k, String(v));
  }
  return fd;
}

async function refreshLibrary() {
  try {
    const res = await fetch('/api/creatures');
    if (!res.ok) return;
    const list = await res.json();
    libraryByName = new Map();
    for (const c of list) libraryByName.set((c.name || '').toLowerCase(), c);
  } catch (err) {
    console.warn(`${PLUGIN_ID}: /api/creatures failed`, err);
  }
}

// Fetch every monster page from Open5e. Each page is up to 50 rows,
// `next` URL chains until exhausted. We follow it manually so we can
// surface progress to the DM tab.
async function fetchAllOpen5e(url) {
  const out = [];
  let page = 0;
  while (url) {
    page += 1;
    installLog.push(`Fetching page ${page}…`);
    pingTab();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open5e ${res.status} on ${url}`);
    const data = await res.json();
    if (Array.isArray(data.results)) out.push(...data.results);
    else if (Array.isArray(data)) out.push(...data);
    url = data.next || null;
  }
  return out;
}

async function installPack() {
  installState = 'fetching';
  installError = null;
  installLog = [];
  pingTab();

  let monsters = [];
  let items = [];
  try {
    monsters = await fetchAllOpen5e(SOURCE_URL_MONSTERS);
    installLog.push(`Got ${monsters.length} monsters from Open5e.`);
    items = await fetchAllOpen5e(SOURCE_URL_MAGICITEMS);
    installLog.push(`Got ${items.length} magic items from Open5e.`);
  } catch (err) {
    installError = `Fetch failed: ${err.message || err}`;
    installState = 'failed';
    pingTab();
    return;
  }

  magicItems = items.map((it) => ({
    name: it.name,
    rarity: it.rarity || 'unknown',
    type: it.type || '',
    requires_attunement: !!it.requires_attunement || /attunement/i.test(it.requires_attunement || ''),
    desc: it.desc || '',
  })).sort((a, b) => a.name.localeCompare(b.name));

  installState = 'installing';
  pingTab();
  await refreshLibrary();
  let inserts = 0;
  for (const m of monsters) {
    const c = open5eToCreature(m);
    const lc = c.name.toLowerCase();
    if (libraryByName.has(lc)) continue;
    try {
      const res = await fetch('/api/creatures', { method: 'POST', body: shapeForInsert(c) });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`${c.name}: ${res.status} ${txt.slice(0, 160)}`);
      }
      const inserted = await res.json();
      insertedIds.push(inserted.id);
      libraryByName.set(lc, inserted);
      inserts += 1;
      // Persist after every 25 inserts so a crash mid-install doesn't
      // orphan rows in the DB.
      if (inserts % 25 === 0 && savedDataApi) {
        savedDataApi.write(KEY_INSERTED, insertedIds).catch(() => {});
        installLog.push(`${inserts} creatures inserted…`);
        pingTab();
      }
    } catch (err) {
      console.warn(`${PLUGIN_ID}: insert failed`, err);
      installError = err.message || String(err);
    }
  }
  installLog.push(`Done. ${inserts} inserted, ${monsters.length - inserts} skipped (already in library or duplicates).`);
  installState = installError ? 'failed' : 'installed';
  pingTab();

  if (savedDataApi) {
    try {
      await savedDataApi.write(KEY_INSERTED, insertedIds);
      await savedDataApi.write(KEY_STATUS, { state: installState, error: installError, inserted: inserts });
      await savedDataApi.write(KEY_ITEM_CACHE, magicItems);
    } catch {}
  }
}

async function cleanupCreatures() {
  installState = 'cleaning';
  pingTab();
  const toDelete = [...insertedIds];
  insertedIds = [];
  let removed = 0;
  for (const id of toDelete) {
    try {
      const res = await fetch(`/api/creatures/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      removed += 1;
    } catch (err) {
      console.warn(`${PLUGIN_ID}: delete failed for ${id}`, err);
      insertedIds.push(id);
    }
  }
  return removed;
}

// Convert one Open5e magic item into the shape the host's Treasure
// Chest "Load" button expects (`{ loot: [{ name, description, ... }] }`).
function itemToLoot(item, qty = 1) {
  return {
    name: item.name,
    description: item.desc,
    type: 'item',
    quantity: qty,
    rarity: item.rarity,
  };
}

// Send one item directly to a creature's inventory via the host's
// existing /send_treasure socket — same protocol the host's Treasure
// Chest tab uses. The DM picks a player creature, the plugin emits.
function sendItemToCreature(item, creatureId) {
  if (!savedSocket || !creatureId) return false;
  try {
    savedSocket.emit('send_treasure', {
      creatureId,
      items: [{ ...itemToLoot(item, 1) }],
    });
    return true;
  } catch { return false; }
}

// Download the items as a JSON file the DM can paste into the
// Treasure Chest tab's "Load" button. Format matches what the host's
// import handler expects (`{ loot: [...] }`).
function downloadAsTreasureJson(items, filename) {
  const blob = new Blob([JSON.stringify({ loot: items.map((it) => itemToLoot(it)) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default {
  register({ React, registries, context }) {
    const { data, role, socket } = context;
    savedDataApi = data;
    savedSocket = socket;

    // Capture the host's token list so the "send to player" picker
    // can show real character names. mapDecorations runs every render
    // — we just sniff the ctx, return null, do nothing visual.
    registries.mapDecorations.set(PLUGIN_ID, (ctx) => {
      lastTokens = ctx.tokens || [];
      return null;
    });

    (async () => {
      try {
        const stored = await data.read(KEY_INSERTED);
        if (Array.isArray(stored)) insertedIds = stored.map(Number).filter(Number.isFinite);
        const cached = await data.read(KEY_ITEM_CACHE);
        if (Array.isArray(cached)) magicItems = cached;
      } catch { /* network blip */ }

      // Skip the install if we already have a populated set of inserted
      // ids (means a previous enable already finished). Saves the
      // 30-second Open5e crawl when the DM toggles around.
      if (insertedIds.length === 0 || magicItems.length === 0) {
        await installPack();
      } else {
        installState = 'installed';
        installLog = [`Re-enabled — ${insertedIds.length} creatures already in library, ${magicItems.length} items cached.`];
      }
      pingTab();
    })();

    if (role !== 'dm') return;

    function PackTab() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);
      const [section, setSection] = React.useState('status');
      const [search, setSearch] = React.useState('');
      const [picking, setPicking] = React.useState(null);   // item awaiting player pick

      const playerTokens = (lastTokens || []).filter((t) => t.is_player && !t.is_hidden);

      function rerunInstall() {
        installLog = [];
        installError = null;
        installState = 'fetching';
        pingTab();
        installPack();
      }

      const sectionBtn = (id, label, count) => React.createElement('button', {
        onClick: () => { setSection(id); setSearch(''); },
        className: `flex-1 text-xs py-1.5 rounded ${section === id
          ? 'bg-dnd-gold text-gray-900 font-semibold'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-200'}`,
      }, `${label}${count != null ? ` (${count})` : ''}`);

      const lc = (s) => (s || '').toLowerCase();
      const visibleItems = magicItems.filter((it) => !search || lc(it.name).includes(lc(search)) || lc(it.rarity).includes(lc(search)));

      return React.createElement('div',
        { className: 'p-4 space-y-3' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, EDITION_LABEL),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug' },
          'Pulls every creature and magic item from the SRD via Open5e. Creatures land in the host library on enable; magic items live in this tab and can be sent to a player\'s inventory or downloaded as a Treasure-Chest JSON.'),

        React.createElement('div', { className: 'flex gap-1.5' },
          sectionBtn('status', 'Status'),
          sectionBtn('items',  'Magic items', magicItems.length)),

        section === 'status' && React.createElement('div',
          { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-xs text-gray-300' },
            `State: `, React.createElement('span', { className: 'font-mono text-dnd-gold' }, installState)),
          React.createElement('div', { className: 'text-xs text-gray-300' },
            `Inserted creatures: ${insertedIds.length}`),
          React.createElement('div', { className: 'text-xs text-gray-300' },
            `Magic items cached: ${magicItems.length}`),
          installError && React.createElement('div',
            { className: 'text-[11px] text-red-300 bg-red-950/40 border border-red-900/40 rounded px-2 py-1 break-words' },
            installError),
          installLog.length > 0 && React.createElement('div',
            { className: 'text-[10px] text-gray-400 font-mono leading-snug max-h-40 overflow-y-auto bg-gray-950 border border-gray-800 rounded p-2' },
            installLog.slice(-12).map((line, i) => React.createElement('div', { key: i }, line))),
          React.createElement('button', {
            onClick: rerunInstall,
            disabled: installState === 'fetching' || installState === 'installing',
            className: 'w-full bg-gray-700 hover:bg-gray-600 text-gray-200 py-1.5 rounded text-xs disabled:opacity-50',
          }, installState === 'fetching' || installState === 'installing' ? 'Working…' : 'Re-fetch from Open5e'),
          React.createElement('div', { className: 'text-[11px] text-gray-500 leading-snug border-t border-gray-700 pt-2' },
            'Disable this plugin from the Plugin Manager (Session tab) to remove every creature it added. Magic items live in the plugin KV — they vanish with the tab.')
        ),

        section === 'items' && React.createElement('div',
          { className: 'space-y-2' },
          React.createElement('div', { className: 'flex gap-1.5' },
            React.createElement('input', {
              type: 'search', value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: 'Filter by name or rarity…',
              className: 'flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
            }),
            React.createElement('button', {
              onClick: () => downloadAsTreasureJson(visibleItems, `${PLUGIN_ID}-treasure.json`),
              disabled: visibleItems.length === 0,
              title: 'Download as Treasure-Chest JSON. Open the Treasure tab → click Load → pick this file.',
              className: 'text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded disabled:opacity-50',
            }, `Treasure JSON (${visibleItems.length})`)
          ),
          React.createElement('div', { className: 'space-y-1.5 max-h-[60vh] overflow-y-auto' },
            visibleItems.length === 0
              ? React.createElement('div', { className: 'text-xs text-gray-500 italic px-2 py-2' },
                  magicItems.length === 0 ? 'Loading…' : 'No matches.')
              : visibleItems.slice(0, 200).map((it) => React.createElement('div',
                  { key: it.name, className: 'bg-gray-800 border border-gray-700 rounded p-2' },
                  React.createElement('div', { className: 'flex items-center justify-between gap-2' },
                    React.createElement('span', { className: 'text-sm text-white font-semibold' }, it.name),
                    React.createElement('span', { className: 'text-[10px] text-dnd-gold uppercase tracking-wider shrink-0' },
                      it.rarity)),
                  React.createElement('div', { className: 'text-[11px] text-gray-400 leading-snug mt-0.5' },
                    `${it.type}${it.requires_attunement ? ' · attunement' : ''}`),
                  React.createElement('div', { className: 'text-xs text-gray-300 leading-snug mt-1 line-clamp-3' }, it.desc),
                  React.createElement('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
                    React.createElement('button', {
                      onClick: () => setPicking(picking === it.name ? null : it.name),
                      className: 'text-[10px] bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-2 py-0.5 rounded',
                    }, 'Send to player'),
                    React.createElement('button', {
                      onClick: () => downloadAsTreasureJson([it], `${it.name.replace(/[^a-z0-9]+/gi, '-')}.json`),
                      className: 'text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-0.5 rounded',
                      title: 'Download as a Treasure JSON file you can Load into the Treasure tab.',
                    }, 'Treasure JSON')
                  ),
                  picking === it.name && React.createElement('div',
                    { className: 'mt-2 grid grid-cols-2 gap-1' },
                    playerTokens.length === 0
                      ? React.createElement('div', { className: 'col-span-2 text-[10px] text-gray-500 italic' },
                          'No player tokens on the map.')
                      : playerTokens.map((t) => {
                          const cid = t.creature_id;
                          if (!cid) return null;
                          return React.createElement('button', {
                            key: t.id,
                            onClick: () => {
                              const ok = sendItemToCreature(it, cid);
                              setPicking(null);
                              if (!ok) alert('Could not send — socket unavailable.');
                            },
                            className: 'text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-0.5 rounded text-left truncate',
                          }, t.nickname || t.name);
                        })
                  )
                )),
            magicItems.length > 200 && visibleItems.length > 200 && React.createElement('div',
              { className: 'text-[10px] text-gray-500 italic px-2' },
              `(showing first 200 of ${visibleItems.length} — narrow your search)`)
          )
        )
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: `📜 ${EDITION_LABEL}`,
      render: () => React.createElement(PackTab, null),
    });
  },

  async unregister() {
    if (insertedIds.length === 0) return;
    try {
      await cleanupCreatures();
      if (savedDataApi) {
        await savedDataApi.write(KEY_INSERTED, insertedIds);
        if (insertedIds.length === 0) await savedDataApi.delete(KEY_STATUS);
      }
    } catch (err) {
      console.warn(`${PLUGIN_ID}: cleanup failed`, err);
    }
    installState = 'idle';
    installError = null;
    installLog = [];
  },
};

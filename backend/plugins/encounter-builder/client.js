// Random Encounter Builder — uses the creature library + auto-generates
// missing creatures via AI.
//
// What it does
// ────────────
//   * Pick biome / party size / party level → roll → get a random
//     encounter description.
//   * Each rolled creature is matched against the existing creature
//     library (GET /api/creatures). Matches show "✓ in library".
//   * If a creature isn't in the library AND the DM has configured AI
//     under Session → AI Integration, the plugin asks the host's
//     /api/ai/generate endpoint to produce a stat block, then POSTs it
//     to /api/creatures so the new monster lives in the library and can
//     be dragged onto the map from the existing Token Library tab.
//   * Recent rolls saved per session, capped at 12.
//
// Architecture notes (host endpoints used)
// ────────────────────────────────────────
//   This plugin demonstrates that plugins can call ANY same-origin
//   host endpoint, not just the plugin-scoped /api/plugins/<id>/data
//   API. We use:
//     GET  /api/creatures           → list existing creatures
//     POST /api/ai/generate         → generate a stat block
//     POST /api/creatures           → insert into the library
//   Authentication isn't an issue because the host runs the same
//   session cookie/auth flow for these endpoints; nothing extra to do.

const PLUGIN_ID = 'encounter-builder';
const HISTORY_KEY_PREFIX = 'history_';
const HISTORY_LIMIT = 12;

// Encounter table per biome. `singular` is the canonical creature
// name we match against the library — it stays consistent even when
// the display name is plural / descriptive (e.g. "Goblin scouts" →
// match "Goblin").
const TABLES = {
  forest: {
    label: 'Forest',
    flavour: [
      'A clearing opens between the moss-thick trunks.',
      'The undergrowth rustles up ahead.',
      'You smell wet fur and wood-smoke on the wind.',
      'A dead tree creaks ominously overhead.',
    ],
    creatures: [
      { name: 'Wolves',            singular: 'Wolf',      cr: 0.25, weight: 4 },
      { name: 'Goblin scouts',     singular: 'Goblin',    cr: 0.25, weight: 4 },
      { name: 'Bandit ambush',     singular: 'Bandit',    cr: 0.5,  weight: 3 },
      { name: 'Black bear',        singular: 'Black Bear',cr: 0.5,  weight: 2 },
      { name: 'Owlbear',           singular: 'Owlbear',   cr: 3,    weight: 1 },
      { name: 'Dryad and friends', singular: 'Dryad',     cr: 1,    weight: 1 },
    ],
  },
  cave: {
    label: 'Cave / Underdark',
    flavour: [
      'The torchlight catches eyes in the dark — too many eyes.',
      'A drip echoes for far too long before it lands.',
      'Bones crunch underfoot.',
      'The wall is too smooth to be natural here.',
    ],
    creatures: [
      { name: 'Giant rats',  singular: 'Giant Rat',  cr: 0.125, weight: 4 },
      { name: 'Kobolds',     singular: 'Kobold',     cr: 0.125, weight: 4 },
      { name: 'Skeletons',   singular: 'Skeleton',   cr: 0.25,  weight: 3 },
      { name: 'Grimlocks',   singular: 'Grimlock',   cr: 1,     weight: 2 },
      { name: 'Drow patrol', singular: 'Drow',       cr: 1,     weight: 1 },
      { name: 'Cave troll',  singular: 'Troll',      cr: 5,     weight: 1 },
    ],
  },
  road: {
    label: 'Road / Travel',
    flavour: [
      'A rickety wagon sits abandoned by the road.',
      'Hoofbeats approach over the next rise.',
      'The signpost has been broken — recently.',
      'A crow watches you a little too closely.',
    ],
    creatures: [
      { name: 'Highwaymen',      singular: 'Bandit',         cr: 0.25, weight: 4 },
      { name: 'Lost merchants',  singular: 'Commoner',       cr: 0,    weight: 3 },
      { name: 'Wild hounds',     singular: 'Mastiff',        cr: 0.25, weight: 3 },
      { name: 'Hobgoblin scout', singular: 'Hobgoblin',      cr: 0.5,  weight: 2 },
      { name: 'Travelling bard', singular: 'Bard',           cr: 0,    weight: 1 },
      { name: 'Werewolf',        singular: 'Werewolf',       cr: 3,    weight: 1 },
    ],
  },
  city: {
    label: 'City / Urban',
    flavour: [
      'A cloaked figure ducks down a side alley as you pass.',
      'Distant shouting — a brawl, or a fire?',
      'A pickpocket makes their move.',
      'The smell of incense pulls you toward a doorway.',
    ],
    creatures: [
      { name: 'Cutpurses',         singular: 'Thief',          cr: 0,     weight: 4 },
      { name: 'Drunk thugs',       singular: 'Thug',           cr: 0.125, weight: 3 },
      { name: 'City guard patrol', singular: 'Guard',          cr: 0,     weight: 3 },
      { name: 'Cult recruiters',   singular: 'Cultist',        cr: 0.5,   weight: 2 },
      { name: 'Doppelganger',      singular: 'Doppelganger',   cr: 3,     weight: 1 },
    ],
  },
  swamp: {
    label: 'Swamp / Marsh',
    flavour: [
      'Mosquitoes the size of thumbprints rise in clouds.',
      'A bubble breaks the surface of the brackish water.',
      'You hear humming from the trees — it has no source.',
      'The path ends in a sucking bog you don\'t remember.',
    ],
    creatures: [
      { name: 'Giant frogs',           singular: 'Giant Frog',        cr: 0.25, weight: 4 },
      { name: 'Lizardfolk',            singular: 'Lizardfolk',        cr: 0.5,  weight: 3 },
      { name: 'Will-o-wisp',           singular: 'Will-o-Wisp',       cr: 2,    weight: 2 },
      { name: 'Hag',                   singular: 'Green Hag',         cr: 5,    weight: 1 },
      { name: 'Black dragon wyrmling', singular: 'Black Dragon Wyrmling', cr: 2, weight: 1 },
    ],
  },
};
const BIOMES = Object.keys(TABLES);

// Module state: roll history + library cache + per-creature
// generation status so the UI shows what the plugin is doing.
let history = [];
let creatureCache = null;             // null = not yet loaded
const pendingGenerations = new Map(); // singular → Promise — dedupe in-flight
const generationStatus = new Map();   // singular → 'in-library' | 'generating' | 'added' | 'failed' | 'no-ai'
const generationErrors = new Map();   // singular → last error message (for inline display)

const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// Match a creature name against the cached library. Case-insensitive,
// allows the library entry to be a substring of the rolled singular
// (so "Black Dragon Wyrmling" matches a library "Black Dragon Wyrmling"
// even if the table says it differently).
function findInLibrary(singular) {
  if (!creatureCache) return null;
  if (!singular || typeof singular !== 'string') return null;   // legacy rows have no `creatureSingular`
  const lc = singular.trim().toLowerCase();
  if (!lc) return null;
  // Exact match first.
  let hit = creatureCache.find((c) => (c.name || '').toLowerCase() === lc);
  if (hit) return hit;
  // Then "library name is contained in / contains" the rolled name.
  hit = creatureCache.find((c) => {
    const cn = (c.name || '').toLowerCase();
    return cn && (cn.includes(lc) || lc.includes(cn));
  });
  return hit || null;
}

function weightedPick(items) {
  const total = items.reduce((s, it) => s + (it.weight || 1), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= (it.weight || 1);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function scaleCount(creatureCr, partySize, partyLevel) {
  if (creatureCr <= 0) return 1;
  const partyCr = partySize * Math.max(0.5, partyLevel * 0.5);
  const target = partyCr / Math.max(0.25, creatureCr);
  return Math.max(1, Math.min(12, Math.round(target)));
}

function rollEncounter(biomeId, partySize, partyLevel) {
  const table = TABLES[biomeId] || TABLES.forest;
  const pick = weightedPick(table.creatures);
  return {
    id: `e-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    biome: table.label,
    flavour: table.flavour[Math.floor(Math.random() * table.flavour.length)],
    creatureName: pick.name,
    creatureSingular: pick.singular,
    creatureCr: pick.cr,
    count: scaleCount(pick.cr, partySize, partyLevel),
    partySize,
    partyLevel,
  };
}

// Refresh the library cache from the host. Called once on plugin
// load and again after every successful insert so the next match
// can find the freshly-added creature.
async function refreshLibrary() {
  try {
    const res = await fetch('/api/creatures');
    if (!res.ok) return;
    creatureCache = await res.json();
    // Update statuses for everything we know about — anything in the
    // library now counts as 'in-library' regardless of prior state.
    for (const status of Array.from(generationStatus.entries())) {
      const [name] = status;
      if (findInLibrary(name)) generationStatus.set(name, 'in-library');
    }
  } catch (err) {
    console.warn('Encounter Builder: failed to load /api/creatures', err);
  }
}

// The host stores `senses` as a JSONB array of {type, range}, but the
// AI prompt asks for a freeform string ("Darkvision 60 ft., passive
// Perception 12"). Convert it so the POST doesn't trip the server's
// JSON.parse. Also pulls passive Perception out into its own field.
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
        const rangeMatch = part.match(/(\d+)\s*(?:ft|feet)?/);
        out.senses.push({ type: t, range: rangeMatch ? Number(rangeMatch[1]) : 0 });
        break;
      }
    }
  }
  return out;
}

// Convert the AI's normalised creature into a payload the host's
// POST /api/creatures will accept. The server treats certain fields
// as JSONB and runs JSON.parse on them, so anything not already in
// JSON-array shape (notably `senses`) needs converting first.
function shapeForLibraryInsert(generated) {
  const out = { ...generated };
  const sensesShape = parseSensesString(out.senses);
  out.senses = sensesShape.senses;
  if (sensesShape.passive_perception != null && out.passive_perception == null) {
    out.passive_perception = sensesShape.passive_perception;
  }
  return out;
}

// Generate a creature via the host's AI endpoint, then insert it
// into the library. Dedupes — if a generation for the same name is
// already in flight we just wait for it.
async function generateCreature(singular, getAiSettings) {
  if (!singular || typeof singular !== 'string') return null;
  if (pendingGenerations.has(singular)) return pendingGenerations.get(singular);
  const aiSettings = getAiSettings ? getAiSettings() : null;
  if (!aiSettings || !aiSettings.baseUrl) {
    generationStatus.set(singular, 'no-ai');
    pingTab();
    return null;
  }
  generationStatus.set(singular, 'generating');
  pingTab();

  const promise = (async () => {
    try {
      // 1) Ask the host's AI proxy to generate a stat block. The host
      // route normalises the LLM output into the creature schema.
      const genRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.provider,
          baseUrl:  aiSettings.baseUrl,
          apiKey:   aiSettings.apiKey,
          model:    aiSettings.model,
          // Random encounters are never boss-tier — explicitly disable
          // legendary actions so the host doesn't even ask the model
          // for them.
          promptData: { name: singular, has_legendary_actions: false },
        }),
      });
      if (!genRes.ok) {
        const txt = await genRes.text().catch(() => '');
        let parsed = null; try { parsed = JSON.parse(txt); } catch {}
        throw new Error(`AI generate ${genRes.status}: ${parsed?.error || txt.slice(0, 300) || '(no body)'}`);
      }
      const generated = await genRes.json();
      const payload = shapeForLibraryInsert(generated);

      // 1b) Optional: ask SwarmUI for a portrait. Failure here doesn't
      // block creature insert — we just skip the image.
      let imageBlob = null;
      if (aiSettings.imageEnabled && aiSettings.imageBaseUrl) {
        try {
          const imgRes = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider:       aiSettings.imageProvider || 'swarmui',
              baseUrl:        aiSettings.imageBaseUrl,
              model:          aiSettings.imageModel || '',
              name:           generated.name || singular,
              promptTemplate: aiSettings.imagePromptTemplate || '',
              negativePrompt: aiSettings.imageNegativePrompt || '',
              allowNsfw:      !!aiSettings.imageAllowNsfw,
              width:          aiSettings.imageWidth,
              height:         aiSettings.imageHeight,
              steps:          aiSettings.imageSteps,
              cfgScale:       aiSettings.imageCfgScale,
            }),
          });
          if (!imgRes.ok) {
            const txt = await imgRes.text().catch(() => '');
            let parsed = null; try { parsed = JSON.parse(txt); } catch {}
            console.warn(`Encounter Builder: image gen failed for "${singular}":`, parsed?.error || txt.slice(0, 200));
          } else {
            const imgData = await imgRes.json();
            const m = (imgData.image || '').match(/^data:([^;]+);base64,(.+)$/);
            if (m) {
              const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
              const ext = m[1].split('/')[1] || 'png';
              imageBlob = new File([bytes], `${singular}.${ext}`, { type: m[1] });
            }
          }
        } catch (imgErr) {
          console.warn(`Encounter Builder: image gen errored for "${singular}":`, imgErr);
        }
      }

      // 2) Insert into the library. POST /api/creatures expects
      // multipart form data so JSON fields get JSON-stringified, and
      // accepts an `image` file under multer.
      const fd = new FormData();
      for (const [k, v] of Object.entries(payload)) {
        if (v == null) continue;
        if (typeof v === 'object') fd.append(k, JSON.stringify(v));
        else fd.append(k, String(v));
      }
      if (imageBlob) fd.append('image', imageBlob);
      const insRes = await fetch('/api/creatures', { method: 'POST', body: fd });
      if (!insRes.ok) {
        const txt = await insRes.text().catch(() => '');
        let parsed = null; try { parsed = JSON.parse(txt); } catch {}
        throw new Error(`Insert ${insRes.status}: ${parsed?.error || txt.slice(0, 300) || '(no body)'}`);
      }
      const inserted = await insRes.json();

      // 3) Update local cache so the next match finds it without
      // a full /api/creatures refetch.
      creatureCache = [inserted, ...(creatureCache || [])];
      generationStatus.set(singular, 'added');
      generationErrors.delete(singular);
      pingTab();
      return inserted;
    } catch (err) {
      console.warn(`Encounter Builder: failed to generate "${singular}"`, err);
      generationStatus.set(singular, 'failed');
      generationErrors.set(singular, err && err.message ? err.message : String(err));
      pingTab();
      return null;
    } finally {
      pendingGenerations.delete(singular);
    }
  })();

  pendingGenerations.set(singular, promise);
  return promise;
}

export default {
  register({ React, registries, context }) {
    const { data, sessionId, getAiSettings } = context;
    const HISTORY_KEY = `${HISTORY_KEY_PREFIX}${sessionId != null ? sessionId : 'global'}`;

    // Hydrate history.
    data.read(HISTORY_KEY).then((row) => {
      if (Array.isArray(row)) history = row;
      pingTab();
    }).catch(() => {});

    // Hydrate the creature library cache once.
    refreshLibrary().then(pingTab);

    function EncounterTab() {
      const [biome, setBiome] = React.useState('forest');
      const [partySize, setPartySize] = React.useState(4);
      const [partyLevel, setPartyLevel] = React.useState(3);
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const fn = () => setTick((x) => x + 1);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      // Read AI settings every render so a fresh "Save" in the AI
      // panel takes effect without reloading the plugin.
      const aiSettings = getAiSettings ? getAiSettings() : null;
      const aiAvailable = !!(aiSettings && aiSettings.baseUrl);

      function statusFor(singular) {
        // Prioritise the live library check so an entry we matched
        // moments ago still shows correctly even if generationStatus
        // never recorded it (e.g. matched on first roll).
        if (findInLibrary(singular)) return 'in-library';
        return generationStatus.get(singular) || (aiAvailable ? 'pending' : 'no-ai');
      }

      function maybeGenerate(singular) {
        if (!singular || typeof singular !== 'string') return;
        if (!aiAvailable) return;
        if (findInLibrary(singular)) return;
        if (pendingGenerations.has(singular)) return;
        const last = generationStatus.get(singular);
        if (last === 'failed' || last === 'added' || last === 'in-library') return;
        generateCreature(singular, getAiSettings);
      }

      function roll() {
        const result = rollEncounter(biome, partySize, partyLevel);
        history = [result, ...history].slice(0, HISTORY_LIMIT);
        pingTab();
        data.write(HISTORY_KEY, history);
        // Note: generation is opt-in. The DM clicks "Generate now" on a
        // history row to fire the AI. Auto-gen would burn tokens on
        // creatures the DM never plans to actually use.
      }
      function clearHistory() {
        if (!confirm('Clear encounter history?')) return;
        history = [];
        pingTab();
        data.delete(HISTORY_KEY);
      }
      function manualGenerate(singular) {
        maybeGenerate(singular);
      }

      function statusBadge(status) {
        if (status === 'in-library') {
          return React.createElement('span', { className: 'text-[10px] bg-emerald-900/50 border border-emerald-700/40 text-emerald-200 px-1.5 py-0.5 rounded' }, '✓ in library');
        }
        if (status === 'generating') {
          return React.createElement('span', { className: 'text-[10px] bg-yellow-900/50 border border-yellow-700/40 text-yellow-200 px-1.5 py-0.5 rounded' }, '⏳ generating…');
        }
        if (status === 'added') {
          return React.createElement('span', { className: 'text-[10px] bg-emerald-900/50 border border-emerald-700/40 text-emerald-200 px-1.5 py-0.5 rounded' }, '+ added to library');
        }
        if (status === 'failed') {
          return React.createElement('span', { className: 'text-[10px] bg-red-900/50 border border-red-700/40 text-red-200 px-1.5 py-0.5 rounded' }, '⚠ generation failed');
        }
        if (status === 'no-ai') {
          return React.createElement('span', { className: 'text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded' }, 'configure AI to generate');
        }
        // 'pending' — AI is available but we haven't kicked off yet
        return React.createElement('span', { className: 'text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded' }, 'not in library');
      }

      return React.createElement(
        'div',
        { className: 'p-4 space-y-3' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Random Encounter'),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug mb-2' },
          aiAvailable
            ? 'Pick a biome and party stats, then roll. Creatures already in your library are linked; missing ones get a "Generate now" button that asks the AI for a stat block and adds it to your library.'
            : 'Pick a biome and party stats, then roll. Set up AI in Session → AI Integration to enable per-encounter creature generation.'),

        // Form
        React.createElement(
          'div',
          { className: 'space-y-2' },
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' }, 'Biome'),
            React.createElement(
              'select',
              {
                value: biome,
                onChange: (e) => setBiome(e.target.value),
                className: 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
              },
              BIOMES.map((b) => React.createElement('option', { key: b, value: b }, TABLES[b].label))
            )
          ),
          React.createElement(
            'div',
            { className: 'grid grid-cols-2 gap-2' },
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' }, 'Party size'),
              React.createElement('input', {
                type: 'number', min: 1, max: 8,
                value: partySize,
                onChange: (e) => setPartySize(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1))),
                className: 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' }, 'Party level'),
              React.createElement('input', {
                type: 'number', min: 1, max: 20,
                value: partyLevel,
                onChange: (e) => setPartyLevel(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1))),
                className: 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
              })
            )
          ),
          React.createElement('button', {
            onClick: roll,
            className: 'w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-2 rounded-lg text-sm font-semibold',
          }, 'Roll Encounter')
        ),

        // History — each row shows library-link status and a manual
        // "Try again" button when generation failed or AI was off
        // when the roll happened.
        history.length > 0 && React.createElement(
          'div',
          { className: 'space-y-1.5 pt-2 border-t border-gray-800' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between' },
            React.createElement('span', { className: 'text-xs text-gray-400 uppercase tracking-wider' },
              `Recent (${history.length})`),
            React.createElement('button', {
              onClick: clearHistory,
              className: 'text-[10px] text-gray-500 hover:text-red-300',
            }, 'Clear')
          ),
          history.map((h) => {
            // Legacy entries (rolled before creatureSingular existed)
            // fall back to the display name so the row still renders.
            const singular = h.creatureSingular || h.creatureName || '';
            const status = statusFor(singular);
            const showRetry = !!singular && aiAvailable && (status === 'failed' || status === 'no-ai' || status === 'pending');
            const errMsg = status === 'failed' ? generationErrors.get(singular) : null;
            return React.createElement(
              'div',
              { key: h.id, className: 'bg-gray-800 border border-gray-700 rounded p-2 space-y-1' },
              React.createElement('div', { className: 'flex items-center justify-between gap-2' },
                React.createElement('span', { className: 'text-sm text-white font-semibold' },
                  `${h.count}× ${h.creatureName}`),
                React.createElement('span', { className: 'text-[10px] text-gray-500 shrink-0' },
                  `${h.biome} · CR ${h.creatureCr}`)),
              React.createElement('div', { className: 'text-xs text-gray-300 italic leading-snug' }, h.flavour),
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 flex-wrap' },
                statusBadge(status),
                showRetry && React.createElement('button', {
                  onClick: () => manualGenerate(singular),
                  className: 'text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-0.5 rounded',
                }, status === 'failed' ? 'Try again' : 'Generate now'),
                React.createElement('span', { className: 'text-[10px] text-gray-500 ml-auto' },
                  `Party of ${h.partySize}, level ${h.partyLevel}`)
              ),
              errMsg && React.createElement('div', {
                className: 'text-[10px] text-red-300 bg-red-950/40 border border-red-900/40 rounded px-2 py-1 leading-snug break-all',
                title: errMsg,
              }, errMsg)
            );
          })
        )
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '🎲 Encounter',
      render: () => React.createElement(EncounterTab, null),
    });
  },
};

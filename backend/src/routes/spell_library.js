const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Single-PDF upload to a tmp dir; cleaned up after rasterisation.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /\.pdf$/i.test(file.originalname));
  },
});

const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
// Canonical class list — used to title-case whatever the model returns so
// later case-insensitive @> filters can do exact matches against a known set.
const CLASSES = ['Artificer','Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'];
const CLASSES_LC = new Set(CLASSES.map(c => c.toLowerCase()));
function canonClass(s) {
  if (!s) return null;
  const k = String(s).trim().toLowerCase();
  if (!CLASSES_LC.has(k)) return null;
  return CLASSES.find(c => c.toLowerCase() === k);
}

function execFileP(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${cmd} failed: ${stderr || err.message}`));
      resolve({ stdout, stderr });
    });
  });
}

// Render every page of a PDF to a separate PNG in `outDir`. Returns a sorted
// list of PNG file paths. Uses pdftoppm (poppler-utils) installed in the
// container Dockerfile.
async function rasterisePdf(pdfPath, outDir, dpi = 144) {
  await execFileP('pdftoppm', ['-png', '-r', String(dpi), pdfPath, path.join(outDir, 'page')]);
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.png')).sort();
  return files.map(f => path.join(outDir, f));
}

// Extract a single page's text via pdftotext. Returns '' if the page has no
// extractable text layer (image-only / scanned PDFs).
async function extractPageText(pdfPath, pageNum) {
  try {
    const { stdout } = await execFileP('pdftotext', [
      '-layout', '-f', String(pageNum), '-l', String(pageNum), pdfPath, '-',
    ]);
    return fixApostropheSpacing(rejoinBrokenHeaders(stdout || '')).trim();
  } catch {
    return '';
  }
}

// Some D&D PDFs encode apostrophes such that pdftotext emits "Tasha' s" /
// "Otiluke' s" / "Mordenkainen' s" with a stray space after the quote. Heal
// that so spell names like "Tasha's Bubbling Cauldron" round-trip through
// the validator instead of being dropped as "name not in page text".
function fixApostropheSpacing(text) {
  return String(text || '')
    // "Tasha 's" / "Tasha 'S" (space before apostrophe) → "Tasha's"
    .replace(/([A-Za-z])\s+(['’])\s*([sS])\b/g, "$1$2$3")
    // "Tasha 'sbubbling" — space-apostrophe-s glued to next word (no space)
    .replace(/([A-Za-z])\s+(['’])([sS])([a-z])/g, "$1$2$3 $4")
    // "Tasha' s" / "Tasha' S" (space after apostrophe) → "Tasha's"
    .replace(/([A-Za-z])(['’])\s+([sS])\b/g, "$1$2$3")
    // "Otiluke' Sresilien" — apostrophe, space, S, lowercase letter
    .replace(/([A-Za-z])(['’])\s+([sS])(?=[a-z])/g, "$1$2$3 ")
    // "Tasha'Sbubbling" — apostrophe, S, lowercase (no space)
    .replace(/([A-Za-z])(['’])([sS])([a-z])/g, "$1$2$3 $4");
}

// Some D&D PDFs render spell-name headings with decorative letter-spacing
// (e.g. "A C I D  S P L A S H", "A N T I M A G I C  F I E L D").
// pdftotext faithfully preserves those spaces. Without intervention the
// model copies the broken form ("Alar M") or, worse, the upstream collapse
// destroys legitimate connector words ("CIRCLE OF DEATH" → "CIRCLEOFDEATH").
//
// Strategy: walk each all-caps run left-to-right. Treat any 1-letter token as
// a broken-letter fragment and glue it to the previous accumulated word.
// Treat 2-3 letter tokens that are NOT canonical English connectors the same
// way; canonical connectors stay as their own token.
const KEEP_SEPARATE = new Set(['OF','AND','THE','FOR','FROM','ON','IN','TO','AS','OR','BY','WITH','A','AT']);
function rejoinBrokenHeaders(text) {
  return String(text || '')
    .split('\n')
    .map(line => {
      const parts = line.split(/(\s{3,})/);
      return parts.map(part => {
        if (/^\s*$/.test(part)) return part;
        const lead = (part.match(/^\s*/) || [''])[0];
        const stripped = part.trim();
        if (!/^[A-Z][A-Z\s'\-]*$/.test(stripped)) return part;
        const tokens = stripped.split(/\s+/);
        if (tokens.length <= 1) return part;
        // Forward-attach pass: a short non-connector token glues to the NEXT
        // token. "F IELD" → "FIELD"; "BAR RIER" → "BARRIER"; "OF DAGGERS"
        // stays "OF DAGGERS". Then a final backward pass mops up any short
        // trailing fragment that had no successor.
        // Exception: a token starting with an apostrophe (e.g. "'S") is a
        // possessive suffix and ALWAYS glues to the PREVIOUS word, never
        // forward — otherwise "EVARD 'S BLACK" becomes "EVARD 'SBLACK".
        const work = tokens.slice();
        const out = [];
        for (let i = 0; i < work.length; i++) {
          const tok = work[i];
          if (/^['’]/.test(tok) && out.length > 0) {
            out[out.length - 1] += tok;
            continue;
          }
          // Lone "S" / "s" after a word ending in apostrophe is the
          // possessive marker — always belongs to the previous word.
          const prevTok = out[out.length - 1] || '';
          if ((tok === 'S' || tok === 's') && /['’]$/.test(prevTok)) {
            out[out.length - 1] = prevTok + tok;
            continue;
          }
          const isShort = tok.length === 1 || (tok.length <= 3 && !KEEP_SEPARATE.has(tok));
          if (isShort && i + 1 < work.length) {
            work[i + 1] = tok + work[i + 1];   // glue forward
            continue;
          }
          if (isShort && out.length > 0) {
            out[out.length - 1] += tok;        // trailing fragment, glue backward
            continue;
          }
          out.push(tok);
        }
        return lead + out.join(' ');
      }).join('');
    })
    .join('\n');
}

// ── LLM client (mirrors backend/src/routes/ai.js helpers) ───────────────────
// Wrap node:fetch so the underlying cause (ECONNREFUSED, ENOTFOUND, socket
// hangup, etc.) is surfaced. Otherwise the user just sees "fetch failed".
async function fetchWithDetail(url, opts, timeoutMs = 300000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (err) {
    const cause = err?.cause;
    let detail = err?.message || 'fetch failed';
    if (err?.name === 'AbortError') detail = `timeout after ${Math.round(timeoutMs / 1000)}s`;
    if (cause) {
      if (cause.code) detail += ` (${cause.code})`;
      if (cause.message && cause.message !== err.message) detail += `: ${cause.message}`;
    }
    detail += ` — url=${url}`;
    throw new Error(detail);
  } finally {
    clearTimeout(timer);
  }
}

function normaliseBaseUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/+$/, '');
}

async function callOpenAICompatVision(baseUrl, apiKey, model, messages) {
  const url = `${normaliseBaseUrl(baseUrl)}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'local-model',
      messages,
      temperature: 0.2,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision API ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOllamaVision(baseUrl, model, prompt, imageB64) {
  const url = `${normaliseBaseUrl(baseUrl)}/api/chat`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llava',
      stream: false,
      messages: [{ role: 'user', content: prompt, images: [imageB64] }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama vision ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.message?.content || '';
}

const SPELL_PROMPT = `You are extracting D&D 5e spells from a page of a rulebook or homebrew PDF.

Look at the page and return a JSON array of every distinct spell it shows. Return ONLY the JSON array — no markdown, no commentary. If the page has no spells, return [].

Each spell object MUST match this exact schema:

[
  {
    "name": "string — the spell's title",
    "level": "0-9 integer (0 for cantrip)",
    "type": "combat | utility (combat = does damage or directly attacks; utility = everything else)",
    "school": "Abjuration | Conjuration | Divination | Enchantment | Evocation | Illusion | Necromancy | Transmutation",
    "casting_time": "string (e.g. '1 action', '1 bonus action', '10 minutes')",
    "range_area": "string (e.g. '60 feet', 'Self (15-foot cone)', 'Touch')",
    "duration": "string (e.g. 'Instantaneous', 'Concentration, up to 1 minute', '24 hours')",
    "comp_v": "boolean — verbal component present",
    "comp_s": "boolean — somatic component present",
    "comp_m": "boolean — material component present",
    "comp_m_text": "string — the material component description, empty if none",
    "attack_save": "melee | ranged | save | (empty string if neither)",
    "save_ability": "STR | DEX | CON | INT | WIS | CHA | (empty string if not a save spell)",
    "damage_entries": [{ "damage": "string e.g. '8d6'", "damage_type": "Fire | Cold | etc." }],
    "extra_effects": "string — optional extra effects beyond core damage",
    "description": "string — full spell description",
    "allowed_classes": ["string — D&D class names that can prepare/learn this spell"]
  }
]

Rules:
- Always return a valid JSON array, even if empty.
- damage_entries: empty array if the spell does no damage. Each entry's "damage" is dice notation (e.g. "1d4+2", "8d6") without the type baked in.
- Trim whitespace and unwrap line breaks within description, but preserve paragraph breaks as \\n\\n.
- school must be one of the eight listed values; pick the closest match if the PDF labels it differently.
- allowed_classes: copy ONLY the classes literally printed on the page for that spell. Look for a comma-separated list in parentheses near the spell's school/level header (e.g. "Evocation Cantrip (Sorcerer, Wizard)" → ["Sorcerer","Wizard"]; "Level 2 Abjuration (Bard, Cleric, Druid, Paladin, Ranger)" → ["Bard","Cleric","Druid","Paladin","Ranger"]). Do NOT invent or pad the list. Do NOT include classes that are not printed for that spell. Return an empty array [] if the page does not show a class list. The valid values you may emit are restricted to: Artificer, Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard — but only emit ones literally printed on the page.

CRITICAL ANTI-HALLUCINATION RULE:
- Only emit spells whose NAME appears literally as a heading on the page (typically all-caps or large bold above a "Level N School (Classes)" line).
- If you "remember" a spell from your training data but cannot SEE its name as a heading on this page, do NOT include it.
- It is correct and expected to return [] if the page contains rules text, tables of contents, indexes, or no spells.`;

// Plain-text variant: same prompt + extracted page text, no image. Used when
// the PDF has a real text layer — far more accurate than vision OCR.
async function callOpenAICompatText(baseUrl, apiKey, model, messages, temperature = 0.1) {
  const url = `${normaliseBaseUrl(baseUrl)}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'local-model',
      messages,
      temperature,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Text API ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOllamaText(baseUrl, model, prompt, temperature = 0.1) {
  const url = `${normaliseBaseUrl(baseUrl)}/api/chat`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3',
      stream: false,
      options: { temperature },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama text ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.message?.content || '';
}

// Pick a different temperature per pass to give the model a chance to surface
// spells it missed at lower temperature. The first pass stays near-deterministic.
function temperatureForPass(passIdx) {
  const ladder = [0.1, 0.4, 0.7, 0.9, 1.0];
  return ladder[Math.min(passIdx, ladder.length - 1)];
}

// ── Deterministic header detection ───────────────────────────────────────
// D&D spell entries always pair a name line with a "Level N <School> (<Classes>)"
// or "<School> Cantrip (<Classes>)" header. The header is rigidly structured,
// so a regex finds every entry on a text-based PDF — guaranteed 100% recall
// without depending on the model's attention to find names. Once we have the
// (name, level, school, allowed_classes) deterministically, we only need the
// LLM to extract the remaining body fields (casting time, range, components,
// damage, description).
// Permissive header prefix — matches "Level N <something> (" or
// "<something> Cantrip (". The "<something>" is fuzzy-matched against the
// canonical school list afterwards, so OCR noise like "Necrnmancy",
// "Evoca tion", "TI-ansmutation", "Level 1Enchantment" all still match.
// Bullet/punctuation prefixes ("• Level 2 …") are tolerated via [^A-Za-z]*.
// Two cantrip orderings exist in the wild: "<School> Cantrip" (most books)
// and "Cantrip <School>" (occasional 5e printings). Both are accepted.
const HEADER_PREFIX_RE = /^[^A-Za-z]*(?:Level\s*(\d)\s*([A-Za-z][A-Za-z\s\-]*?)|([A-Za-z][A-Za-z\s\-]*?)\s*Cantrip|Cantrip\s+([A-Za-z][A-Za-z\s\-]*?))\s*\(/i;

function fuzzySchoolMatch(token) {
  if (!token) return null;
  const cleaned = String(token).toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return null;
  for (const s of SCHOOLS) if (s.toLowerCase() === cleaned) return s;
  for (const s of SCHOOLS) {
    if (Math.abs(s.length - cleaned.length) > 3) continue;
    if (levenshtein(s.toLowerCase(), cleaned) <= 2) return s;
  }
  return null;
}

// Fuzzy class matcher — strips whitespace, common OCR-noise punctuation, and
// compares lowercase. Catches "W izard" / "Warlocl<" / "Sorcerer~" etc.
function fuzzyClassMatch(token) {
  if (!token) return null;
  let cleaned = String(token)
    .toLowerCase()
    .replace(/[^a-z]/g, '');         // strip everything except letters
  if (!cleaned) return null;
  // Common OCR substitutions seen in this PDF.
  const substitutions = [
    [/l(?=k$)/g, 'l'],   // no-op, placeholder
  ];
  // Direct equality first.
  for (const c of CLASSES) {
    if (c.toLowerCase() === cleaned) return c;
  }
  // Otherwise: small edit-distance (≤2) match against canonical list.
  for (const c of CLASSES) {
    if (Math.abs(c.length - cleaned.length) > 2) continue;
    if (levenshtein(c.toLowerCase(), cleaned) <= 2) return c;
  }
  return null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i-1] === b[j-1]
        ? prev
        : 1 + Math.min(prev, row[j], row[j-1]);
      prev = tmp;
    }
  }
  return row[n];
}

// ── Canonical 5e spell name list ────────────────────────────────────────────
// Used by GET /review to detect broken names imported from the PDF scanner
// and suggest a clean canonical fix. Coverage targets the standard 5e books
// (PHB / XGtE / TCoE / FtoD / SCAG) — the same ones the user is feeding in.
// If a scanner output exists in this list (case-insensitive, letters-only),
// no fix is suggested. Otherwise we look for a near-neighbour by Levenshtein
// distance on the letters-only key.
const CANONICAL_SPELLS = [
  // Cantrips
  "Acid Splash","Blade Ward","Booming Blade","Chill Touch","Control Flames","Create Bonfire",
  "Dancing Lights","Decompose","Druidcraft","Eldritch Blast","Encode Thoughts","Fire Bolt",
  "Friends","Frostbite","Green-Flame Blade","Guidance","Gust","Hand of Radiance","Infestation",
  "Light","Lightning Lure","Mage Hand","Magic Stone","Mending","Message","Mind Sliver",
  "Minor Illusion","Mold Earth","On/Off","Poison Spray","Prestidigitation","Primal Savagery",
  "Produce Flame","Ray of Frost","Resistance","Sacred Flame","Sapping Sting","Shape Water",
  "Shillelagh","Shocking Grasp","Sorcerous Burst","Spare the Dying","Starry Wisp","Sword Burst",
  "Thaumaturgy","Thorn Whip","Thunderclap","Toll the Dead","True Strike","Vicious Mockery",
  "Virtue","Word of Radiance",
  // Level 1
  "Absorb Elements","Alarm","Animal Friendship","Armor of Agathys","Arms of Hadar","Bane",
  "Beast Bond","Bless","Burning Hands","Cause Fear","Ceremony","Chaos Bolt","Charm Person",
  "Chromatic Orb","Color Spray","Command","Compelled Duel","Comprehend Languages",
  "Create or Destroy Water","Cure Wounds","Detect Evil and Good","Detect Magic",
  "Detect Poison and Disease","Disguise Self","Dissonant Whispers","Divine Favor",
  "Earth Tremor","Ensnaring Strike","Entangle","Expeditious Retreat","Faerie Fire","False Life",
  "Feather Fall","Find Familiar","Fizban's Platinum Shield","Floating Disk","Fog Cloud",
  "Frost Fingers","Gift of Alacrity","Goodberry","Grease","Guiding Bolt","Guiding Hand",
  "Hail of Thorns","Healing Word","Hellish Rebuke","Heroism","Hex","Hunter's Mark","Ice Knife",
  "Identify","Illusory Script","Inflict Wounds","Jim's Magic Missile","Jump","Longstrider",
  "Mage Armor","Magic Missile","Magnify Gravity","Power Word Pain","Protection from Evil and Good",
  "Puppet","Purify Food and Drink","Ray of Sickness","Sanctuary","Searing Smite","Shield",
  "Shield of Faith","Silent Image","Silvery Barbs","Sleep","Snare","Speak with Animals",
  "Tasha's Caustic Brew","Tasha's Hideous Laughter","Tenser's Floating Disk","Thunderous Smite",
  "Thunderwave","Unseen Servant","Wild Cyclone","Witch Bolt","Wrathful Smite","Zephyr Strike",
  // Level 2
  "Aganazzar's Scorcher","Aid","Air Bubble","Alter Self","Animal Messenger","Arcane Lock",
  "Arcanist's Magic Aura","Augury","Barkskin","Beast Sense","Blindness/Deafness","Blur",
  "Borrowed Knowledge","Branding Smite","Calm Emotions","Cloud of Daggers","Continual Flame",
  "Cordon of Arrows","Crown of Madness","Darkness","Darkvision","Detect Thoughts",
  "Dragon's Breath","Dust Devil","Earthbind","Enhance Ability","Enlarge/Reduce","Enthrall",
  "Find Steed","Find Traps","Flame Blade","Flaming Sphere","Flock of Familiars","Fortune's Favor",
  "Gentle Repose","Gust of Wind","Healing Spirit","Heat Metal","Hold Person","Invisibility",
  "Kinetic Jaunt","Knock","Lesser Restoration","Levitate","Locate Animals or Plants",
  "Locate Object","Magic Mouth","Magic Weapon","Maximilian's Earthen Grasp","Melf's Acid Arrow",
  "Mind Spike","Mirror Image","Misty Step","Moonbeam","Nathair's Mischief","Nystul's Magic Aura",
  "Pass without Trace","Phantasmal Force","Prayer of Healing","Protection from Poison",
  "Pyrotechnics","Ray of Enfeeblement","Rime's Binding Ice","Rope Trick","Scorching Ray",
  "See Invisibility","Shadow Blade","Shatter","Silence","Skywrite","Snilloc's Snowball Swarm",
  "Spider Climb","Spike Growth","Spiritual Weapon","Spray of Cards","Suggestion","Summon Beast",
  "Tasha's Mind Whip","Vortex Warp","Warding Bond","Warding Wind","Web","Wither and Bloom",
  "Wristpocket","Zone of Truth",
  // Level 3
  "Animate Dead","Antagonize","Aura of Vitality","Ashardalon's Stride","Beacon of Hope",
  "Bestow Curse","Blinding Smite","Blink","Call Lightning","Catnap","Clairvoyance",
  "Conjure Animals","Conjure Barrage","Counterspell","Create Food and Water","Crusader's Mantle",
  "Daylight","Dispel Magic","Elemental Weapon","Enemies Abound","Erupting Earth","Fast Friends",
  "Fear","Feign Death","Fireball","Flame Arrows","Fly","Galder's Tower","Gaseous Form",
  "Glyph of Warding","Haste","Hunger of Hadar","Hypnotic Pattern","Incite Greed",
  "Intellect Fortress","Leomund's Tiny Hut","Life Transference","Lightning Arrow","Lightning Bolt",
  "Magic Circle","Major Image","Mass Healing Word","Meld into Stone","Melf's Minute Meteors",
  "Motivational Speech","Nondetection","Phantom Steed","Plant Growth","Protection from Energy",
  "Pulse Wave","Remove Curse","Revivify","Sending","Sleet Storm","Slow","Speak with Dead",
  "Speak with Plants","Spirit Guardians","Spirit Shroud","Stinking Cloud","Summon Fey",
  "Summon Lesser Demons","Summon Shadowspawn","Summon Undead","Thunder Step","Tidal Wave",
  "Tiny Hut","Tiny Servant","Tongues","Vampiric Touch","Wall of Sand","Wall of Water",
  "Water Breathing","Water Walk","Wind Wall",
  // Level 4
  "Arcane Eye","Aura of Life","Aura of Purity","Banishment","Black Tentacles","Blight",
  "Charm Monster","Compulsion","Confusion","Conjure Minor Elementals","Conjure Woodland Beings",
  "Control Water","Death Ward","Dimension Door","Divination","Dominate Beast","Elemental Bane",
  "Evard's Black Tentacles","Fabricate","Faithful Hound","Fire Shield","Find Greater Steed",
  "Fount of Moonlight","Freedom of Movement","Galder's Speedy Courier","Giant Insect",
  "Gravity Sinkhole","Greater Invisibility","Guardian of Faith","Guardian of Nature",
  "Hallucinatory Terrain","Ice Storm","Leomund's Secret Chest","Locate Creature",
  "Mordenkainen's Faithful Hound","Mordenkainen's Private Sanctum","Otiluke's Resilient Sphere",
  "Phantasmal Killer","Polymorph","Raulothim's Psychic Lance","Resilient Sphere","Secret Chest",
  "Shadow of Moil","Shining Smite","Sickening Radiance","Spirit of Death","Staggering Smite","Stone Shape",
  "Stoneskin","Storm Sphere","Summon Aberration","Summon Construct","Summon Elemental",
  "Summon Greater Demon","Vitriolic Sphere","Wall of Fire","Watery Sphere",
  // Level 5
  "Animate Objects","Antilife Shell","Awaken","Banishing Smite","Bigby's Hand","Circle of Power",
  "Cloudkill","Commune","Commune with Nature","Cone of Cold","Conjure Elemental","Conjure Volley",
  "Contact Other Plane","Contagion","Control Winds","Creation","Danse Macabre","Dawn",
  "Destructive Wave","Dispel Evil and Good","Dominate Person","Dream","Enervation","Far Step",
  "Flame Strike","Geas","Greater Restoration","Hallow","Hold Monster","Holy Weapon","Immolation",
  "Infernal Calling","Insect Plague","Legend Lore","Maelstrom","Mass Cure Wounds","Mislead",
  "Modify Memory","Negative Energy Flood","Passwall","Planar Binding","Rary's Telepathic Bond",
  "Raise Dead","Reincarnate","Scrying","Seeming","Skill Empowerment","Steel Wind Strike",
  "Summon Celestial","Swift Quiver","Synaptic Static","Telekinesis","Teleportation Circle",
  "Temple of the Gods","Transmute Rock","Tree Stride","Wall of Force","Wall of Light",
  "Wall of Stone","Wrath of Nature","Yolande's Regal Presence",
  // Level 6
  "Arcane Gate","Blade Barrier","Bones of the Earth","Chain Lightning","Circle of Death",
  "Conjure Fey","Contingency","Create Homunculus","Create Undead","Disintegrate",
  "Drawmij's Instant Summons","Druid Grove","Eyebite","Find the Path","Flesh to Stone",
  "Forbiddance","Globe of Invulnerability","Guards and Wards","Harm","Heal","Heroes' Feast",
  "Instant Summons","Investiture of Flame","Investiture of Ice","Investiture of Stone",
  "Investiture of Wind","Magic Jar","Mass Suggestion","Mental Prison",
  "Mordenkainen's Magnificent Mansion","Move Earth","Otiluke's Freezing Sphere",
  "Otto's Irresistible Dance","Planar Ally","Primordial Ward","Programmed Illusion","Scatter",
  "Soul Cage","Sunbeam","Summon Draconic Spirit","Summon Fiend","Tasha's Otherworldly Guise",
  "Tenser's Transformation","Transport via Plants","True Seeing","Wall of Ice","Wall of Thorns",
  "Wind Walk","Word of Recall",
  // Level 7
  "Conjure Celestial","Crown of Stars","Delayed Blast Fireball","Divine Word",
  "Dream of the Blue Veil","Etherealness","Finger of Death","Fire Storm","Forcecage",
  "Mirage Arcane","Mordenkainen's Sword","Plane Shift","Power Word Pain","Prismatic Spray",
  "Project Image","Regenerate","Resurrection","Reverse Gravity","Sequester","Simulacrum",
  "Symbol","Teleport","Whirlwind",
  // Level 8
  "Abi-Dalzim's Horrid Wilting","Animal Shapes","Antimagic Field","Antipathy/Sympathy","Clone",
  "Control Weather","Demiplane","Dominate Monster","Earthquake","Feeblemind","Glibness",
  "Holy Aura","Illusory Dragon","Incendiary Cloud","Maddening Darkness","Maze","Mighty Fortress",
  "Mind Blank","Power Word Stun","Reality Break","Sunburst","Telepathy","Tsunami",
  // Level 9
  "Astral Projection","Blade of Disaster","Foresight","Gate","Imprisonment","Invulnerability",
  "Mass Heal","Mass Polymorph","Meteor Swarm","Power Word Heal","Power Word Kill",
  "Prismatic Wall","Psychic Scream","Ravenous Void","Shapechange","Storm of Vengeance",
  "Time Ravage","Time Stop","True Polymorph","True Resurrection","Weird","Wish",
];

function letterKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

const CANONICAL_BY_KEY = (() => {
  const m = new Map();
  for (const n of CANONICAL_SPELLS) m.set(letterKey(n), n);
  return m;
})();

// Returns { suggested, distance } or null. If the scanned name's letter key
// matches a canonical letter key exactly but the names differ (e.g.
// "Wallofice" → "Wall of Ice"), distance is 0. Otherwise the closest
// canonical within Levenshtein distance ≤ 3 on the letter key.
function suggestCanonical(name) {
  const key = letterKey(name);
  if (!key) return null;
  const exact = CANONICAL_BY_KEY.get(key);
  if (exact) {
    if (exact === name) return null;            // already correct
    return { suggested: exact, distance: 0 };
  }
  let best = null;
  for (const cand of CANONICAL_SPELLS) {
    const ck = letterKey(cand);
    if (Math.abs(ck.length - key.length) > 3) continue;
    const d = levenshtein(ck, key);
    // Cap distance at 3 absolute, but also at 25% of the longer string so
    // short scanner outputs ("Modsave", 7 chars) don't fuzzy-snap to a
    // completely different spell ("Message") just because the absolute
    // distance is small.
    const maxRel = Math.floor(Math.max(ck.length, key.length) * 0.25);
    if (d <= Math.min(3, Math.max(1, maxRel)) && (!best || d < best.distance)) {
      best = { suggested: cand, distance: d };
    }
  }
  return best;
}

// Split a line into column "pieces" at 3+ space gaps, retaining each piece's
// starting character offset so we can locate the spell name in the same
// column as the header on a previous line.
function splitIntoColumns(line) {
  const out = [];
  const gapRe = /\s{3,}/g;
  let pos = 0, m;
  while ((m = gapRe.exec(line)) !== null) {
    if (m.index > pos) out.push({ text: line.slice(pos, m.index), start: pos });
    pos = m.index + m[0].length;
  }
  if (pos < line.length) out.push({ text: line.slice(pos), start: pos });
  return out;
}

function findSpellHeadersInText(pageText) {
  const lines = String(pageText || '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    // Find a header *prefix* (Level/Cantrip + School + open paren) anywhere
    // on this line — works for two-column layouts because we test each chunk.
    const pieces = splitIntoColumns(lines[i]);
    let hdrMatch = null, hdrCol = 0, hdrPiece = null;
    for (const p of pieces) {
      const trimmed = p.text.trim();
      const m = trimmed.match(HEADER_PREFIX_RE);
      if (m) { hdrMatch = m; hdrCol = p.start; hdrPiece = p; break; }
    }
    if (!hdrMatch) continue;
    let level, schoolRaw;
    if (hdrMatch[1] !== undefined) {
      level = parseInt(hdrMatch[1], 10);
      schoolRaw = hdrMatch[2];
    } else {
      level = 0;
      schoolRaw = hdrMatch[3] || hdrMatch[4]; // "<School> Cantrip" or "Cantrip <School>"
    }
    const school = fuzzySchoolMatch(schoolRaw);
    if (!school) continue; // school text didn't fuzzy-match — likely body text, not a header

    // Collect the parenthesised class list. Start from the first '(' in the
    // header piece and read forward (potentially wrapping across the next
    // few lines) until we hit a matching ')'.
    const startInPiece = hdrPiece.text.indexOf('(');
    let parens = hdrPiece.text.slice(startInPiece + 1);
    let closed = parens.includes(')');
    let lookahead = i;
    while (!closed && lookahead - i < 4) {
      lookahead += 1;
      if (lookahead >= lines.length) break;
      // For the wrap, prefer the column piece nearest the header column.
      const next = splitIntoColumns(lines[lookahead])
        .find(p => Math.abs(p.start - hdrCol) <= 15);
      if (!next) continue;
      parens += ' ' + next.text;
      if (parens.includes(')')) closed = true;
    }
    const closeIdx = parens.indexOf(')');
    const classBlob = closeIdx >= 0 ? parens.slice(0, closeIdx) : parens;
    const classList = classBlob
      .split(/\s*,\s*/)
      .map(t => fuzzyClassMatch(t))
      .filter(Boolean);
    // De-dup while preserving order.
    const seen = new Set();
    const dedup = [];
    for (const c of classList) { if (!seen.has(c)) { seen.add(c); dedup.push(c); } }
    if (dedup.length === 0) continue; // a real spell header always has at least one class

    // Walk back up to ~10 lines looking for a name in the same column as the
    // header. Lines where the column has no piece (the body wraps differently
    // in the other column) are skipped, not treated as "no name".
    let name = '';
    const COL_TOL = 15;
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      const prevPieces = splitIntoColumns(lines[j]);
      const sameCol = prevPieces.find(p => Math.abs(p.start - hdrCol) <= COL_TOL);
      if (!sameCol) continue; // empty column on this line, keep walking
      const t = sameCol.text.trim();
      if (!t) continue;
      // Body-text indicators — give up rather than walk into the previous spell.
      if (/[:0-9]/.test(t.slice(0, 12))) break;
      if (/^[A-Za-z][A-Za-z'’\s\-]{1,60}$/.test(t)) {
        name = t;
        break;
      }
      break;
    }
    if (!name) continue;
    out.push({
      name: titleCaseName(rejoinFragmentedName(name)),
      level,
      school,
      allowed_classes: dedup,
      headerLineIdx: i,
    });
  }
  return out;
}

const FIELD_PROMPT_TEMPLATE = (name, body) => `Extract structured fields for the D&D 5e spell named "${name}" from the text below. Return ONLY a JSON object — no markdown, no commentary, no explanation.

Schema:
{
  "type": "combat | utility (combat = directly attacks or deals damage; utility = everything else)",
  "casting_time": "string (e.g. '1 action', '1 bonus action', '10 minutes')",
  "range_area": "string (e.g. '60 feet', 'Self (15-foot cone)')",
  "duration": "string (e.g. 'Instantaneous', 'Concentration, up to 1 minute')",
  "comp_v": "boolean — Verbal component present",
  "comp_s": "boolean — Somatic component present",
  "comp_m": "boolean — Material component present",
  "comp_m_text": "string — material component description, empty if no M",
  "attack_save": "melee | ranged | save | (empty string)",
  "save_ability": "STR | DEX | CON | INT | WIS | CHA | (empty string)",
  "damage_entries": [{"damage": "string e.g. '8d6'", "damage_type": "Fire | Cold | …"}],
  "extra_effects": "string",
  "description": "string — full spell description"
}

Rules:
- damage_entries empty array if no damage.
- Trim whitespace; preserve paragraph breaks in description as \\n\\n.
- Return only fields you can find in the text; do not fabricate.

PAGE TEXT (the spell may share a page with neighbours — extract only fields for "${name}"):

${body}`;

// ── Open5e fallback ────────────────────────────────────────────────────────
// When the LLM mis-extracts a spell's body fields, fall back to the open5e
// public API. Two rulesets are supported (configurable per-call):
//   '2014' — original 5e SRD 5.1 via open5e v1, document `wotc-srd`
//   '2024' — 5e 2024 SRD 5.2 via open5e v2,  document `srd-2024`
// The v2 API returns a richer, structured payload (typed damage rolls,
// saving-throw ability, attack-roll boolean, etc.) so the v2 mapper fills
// more fields than v1. Cached in-memory keyed by `<ruleset>:<letter-key>`,
// including misses, to keep big PDF scans from hammering the upstream API.
const open5eCache = new Map();       // `${ruleset}:${letterKey(name)}` → mapped spell | null
const OPEN5E_FETCH_TIMEOUT_MS = 8000;
const OPEN5E_V1 = 'https://api.open5e.com/v1/spells/';
const OPEN5E_V2 = 'https://api.open5e.com/v2/spells/';

function normaliseRuleset(r) {
  const s = String(r || '').trim();
  return s === '2024' ? '2024' : '2014';
}

function pickPreferredV1Result(results) {
  if (!Array.isArray(results) || !results.length) return null;
  const wotc = results.find(r => r.document__slug === 'wotc-srd');
  return wotc || results[0];
}

async function fetchOpen5eSpell(name, ruleset = '2014') {
  const rs = normaliseRuleset(ruleset);
  const k = letterKey(name);
  if (!k) return null;
  const cacheKey = `${rs}:${k}`;
  if (open5eCache.has(cacheKey)) return open5eCache.get(cacheKey);
  const url = rs === '2024'
    ? `${OPEN5E_V2}?name__iexact=${encodeURIComponent(name)}&document__key=srd-2024`
    : `${OPEN5E_V1}?name__iexact=${encodeURIComponent(name)}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OPEN5E_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'dnd-vtt-spell-importer' } });
    clearTimeout(timer);
    if (!res.ok) { open5eCache.set(cacheKey, null); return null; }
    const data = await res.json();
    let mapped = null;
    if (rs === '2024') {
      const hit = Array.isArray(data.results) ? data.results[0] : null;
      mapped = hit ? open5eV2ToSpell(hit) : null;
    } else {
      const hit = pickPreferredV1Result(data.results);
      mapped = hit ? open5eV1ToSpell(hit) : null;
    }
    open5eCache.set(cacheKey, mapped);
    return mapped;
  } catch (err) {
    open5eCache.set(cacheKey, null);
    return null;
  }
}

// v1 (2014 SRD) response → internal spell shape. v1 is mostly free-text:
// "components" is "V, S, M", "school" is a string, classes come as
// comma-joined "Sorcerer, Wizard". Damage and attack/save aren't structured.
function open5eV1ToSpell(o) {
  const components = String(o.components || '');
  const dndClass = String(o.dnd_class || '');
  const allowed_classes = dndClass
    .split(/\s*,\s*/)
    .map(s => canonClass(s))
    .filter(Boolean);
  const descParts = [];
  if (o.desc) descParts.push(String(o.desc));
  if (o.higher_level) descParts.push(`\n\nAt Higher Levels. ${o.higher_level}`);
  return {
    name: String(o.name || ''),
    level: typeof o.level_int === 'number' ? o.level_int : 0,
    school: String(o.school || ''),
    casting_time: String(o.casting_time || ''),
    range_area: String(o.range || ''),
    duration: String(o.duration || ''),
    comp_v: /\bV\b/.test(components),
    comp_s: /\bS\b/.test(components),
    comp_m: /\bM\b/.test(components),
    comp_m_text: String(o.material || '').trim(),
    allowed_classes,
    description: descParts.join(''),
    // v1 doesn't structure these — leave undefined so the refresh route
    // preserves whatever the row already had (likely from AI extraction).
    type: undefined,
    attack_save: undefined,
    save_ability: undefined,
    damage_entries: undefined,
    extra_effects: '',
  };
}

// v2 (2024 SRD 5.2) response → internal spell shape. v2 is properly
// structured: discrete booleans for components, `damage_roll` + `damage_types`
// arrays for damage, `attack_roll` boolean and `saving_throw_ability` string
// for the attack/save split. We can therefore populate more fields than v1.
function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

function open5eV2ToSpell(o) {
  const allowed_classes = Array.isArray(o.classes)
    ? o.classes.map(c => canonClass(c?.name)).filter(Boolean)
    : [];
  const descParts = [];
  if (o.desc) descParts.push(String(o.desc));
  if (o.higher_level) descParts.push(`\n\nUsing a Higher-Level Spell Slot. ${o.higher_level}`);
  // Damage: build one entry per damage type using the base damage_roll. The
  // 2024 SRD splits upcasting into casting_options, but for the editor's
  // damage list we just want the base entry — upcasting goes in description.
  const damage_entries = [];
  if (o.damage_roll && Array.isArray(o.damage_types) && o.damage_types.length) {
    for (const dt of o.damage_types) {
      damage_entries.push({ damage: String(o.damage_roll), damage_type: titleCase(dt) });
    }
  } else if (o.damage_roll) {
    damage_entries.push({ damage: String(o.damage_roll), damage_type: '' });
  }
  // Attack/save: explicit fields in v2.
  let attack_save = '';
  let save_ability = '';
  if (o.attack_roll) {
    // v2 doesn't distinguish melee/ranged — default to ranged (the common case
    // for spells with attack rolls); DM can flip in the editor if needed.
    attack_save = 'ranged';
  } else if (o.saving_throw_ability) {
    attack_save = 'save';
    save_ability = String(o.saving_throw_ability).slice(0, 3).toUpperCase();
  }
  return {
    name: String(o.name || ''),
    level: typeof o.level === 'number' ? o.level : 0,
    school: titleCase(o.school?.name || o.school || ''),
    casting_time: titleCase(o.casting_time || ''),
    range_area: String(o.range_text || (o.range != null ? `${o.range} ${o.range_unit || ''}`.trim() : '')),
    duration: titleCase(o.duration || ''),
    comp_v: !!o.verbal,
    comp_s: !!o.somatic,
    comp_m: !!o.material,
    comp_m_text: String(o.material_specified || '').trim(),
    allowed_classes,
    description: descParts.join(''),
    type: damage_entries.length > 0 || attack_save ? 'combat' : 'utility',
    attack_save,
    save_ability,
    damage_entries,
    extra_effects: '',
  };
}

async function extractSpellFields(provider, baseUrl, apiKey, model, name, body, passIdx = 0) {
  const prompt = FIELD_PROMPT_TEMPLATE(name, body);
  const temperature = temperatureForPass(passIdx);
  let content;
  if (provider === 'ollama') {
    content = await callOllamaText(baseUrl, model, prompt, temperature);
  } else {
    content = await callOpenAICompatText(baseUrl, apiKey, model, [{ role: 'user', content: prompt }], temperature);
  }
  // Parse a single JSON object instead of an array.
  let cleaned = String(content || '').trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function extractSpellsFromText(provider, baseUrl, apiKey, model, pageText, passIdx = 0) {
  const userMessage = `${SPELL_PROMPT}\n\nPAGE TEXT:\n\n${pageText}\n\nReturn only the JSON array.`;
  const temperature = temperatureForPass(passIdx);
  let content;
  if (provider === 'ollama') {
    content = await callOllamaText(baseUrl, model, userMessage, temperature);
  } else {
    content = await callOpenAICompatText(baseUrl, apiKey, model, [{ role: 'user', content: userMessage }], temperature);
  }
  return parseSpellArray(content);
}

async function extractSpellsFromImage(provider, baseUrl, apiKey, model, imageB64, passIdx = 0) {
  // Vision API path doesn't currently expose temperature — we only retry with
  // the same call, relying on any non-zero sampling the server applies.
  let content;
  if (provider === 'ollama') {
    content = await callOllamaVision(baseUrl, model, SPELL_PROMPT, imageB64);
  } else {
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: SPELL_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageB64}` } },
      ],
    }];
    content = await callOpenAICompatVision(baseUrl, apiKey, model, messages);
  }
  return parseSpellArray(content);
}

function parseSpellArray(content) {

  // Strip markdown fences if the model wrapped the JSON.
  let cleaned = (content || '').trim();
  console.log(`[spell-library] raw model output (first 600 chars): ${cleaned.slice(0, 600)}`);
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    console.log('[spell-library] no JSON array found in response');
    return [];
  }
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch (parseErr) {
    console.log(`[spell-library] JSON parse failed: ${parseErr.message}`);
    return [];
  }
}

// Loose, whitespace-insensitive comparison key — strips ALL whitespace and
// punctuation. PDF headers often render with decorative letter-spacing
// (pdftotext -layout outputs "ANIMAL FRI ENDSHIP" or "ALA R M"), so a key
// that preserves spaces would fail to match the model's clean output.
function nameKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function nameAppearsInText(name, pageText) {
  const haystack = nameKey(pageText);
  const needle  = nameKey(name);
  if (!needle || needle.length < 3) return false;
  return haystack.includes(needle);
}

// Confirm the name appears with spell-block structure nearby — either a
// "Level N" / "Cantrip" header OR a class-list parenthetical with at least
// one canonical class. The class-list pattern catches spells whose layout
// puts "Level N" past the 800-char window but still has the "(Cleric, Wizard)"
// line within reach.
const _classListPattern = '\\(\\s*(?:Artificer|Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard)';
function spellHeaderConfirmed(name, pageText) {
  const letters = String(name).replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) return false;
  const namePattern = letters.split('').join('\\s*');
  // Wider window (800 chars). Header trigger OR class-list trigger.
  const re = new RegExp(
    namePattern + '[\\s\\S]{0,800}?(?:Level\\s*\\d|Cantrip|' + _classListPattern + ')',
    'i'
  );
  return re.test(pageText);
}

// Title-case "ACID SPLASH" / "acid splash" → "Acid Splash". Only capitalises
// after start-of-string, whitespace, hyphen, or slash — apostrophe-s suffixes
// stay lowercase as in canonical D&D names ("Bigby's Hand", "Otiluke's…").
function titleCaseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/(^|[\s\-/])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

// Drop-cap / fragmented-name fixer. Handles names where pdftotext split a
// drop-cap or otherwise broke a spell name into 1-2 letter fragments
// ("FIRE S T O R M", "Go Odberry", "Locate O Eje Ct"). Case-insensitive
// version of rejoinBrokenHeaders' forward-attach algorithm. Connector
// words like "of"/"and"/"the" are preserved as boundaries.
const KEEP_SEPARATE_LC = new Set(['of','and','the','for','from','on','in','to','as','or','by','with','a','at']);
function rejoinFragmentedName(s) {
  if (!s) return s;
  // First normalise apostrophe spacing — "Tasha 'S" / "Tasha' s" → "Tasha's".
  let cleaned = String(s)
    .replace(/\s+(['’])\s*([sS])\b/g, "$1$2")    // " 'S" / " 's" → "'S"
    .replace(/(['’])\s+([sS])\b/g, "$1$2")        // "' s" → "'s"
    .trim();
  const tokens = cleaned.split(/\s+/);
  if (tokens.length <= 1) return cleaned;
  const work = tokens.slice();
  const out = [];
  for (let i = 0; i < work.length; i++) {
    const tok = work[i];
    // Possessive suffix glues backward, never forward.
    if (/^['’]/.test(tok) && out.length > 0) {
      out[out.length - 1] += tok;
      continue;
    }
    // Lone "S" / "s" after an apostrophe-ending word is the possessive marker.
    const prevTok = out[out.length - 1] || '';
    if ((tok === 'S' || tok === 's') && /['’]$/.test(prevTok)) {
      out[out.length - 1] = prevTok + tok;
      continue;
    }
    const lettersOnly = tok.replace(/[^a-zA-Z]/g, '');
    const lc = lettersOnly.toLowerCase();
    const isShort = lettersOnly.length === 1
                  || (lettersOnly.length <= 3 && !KEEP_SEPARATE_LC.has(lc));
    if (isShort && i + 1 < work.length) {
      work[i + 1] = tok + work[i + 1];
      continue;
    }
    if (isShort && out.length > 0) {
      out[out.length - 1] += tok;
      continue;
    }
    out.push(tok);
  }
  return out.join(' ');
}

function normaliseSpell(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = titleCaseName(String(raw.name || '').trim());
  if (!name) return null;
  const level = Math.max(0, Math.min(9, Number(raw.level) || 0));
  const typeStr = String(raw.type || '').toLowerCase();
  const type = typeStr === 'combat' ? 'combat' : 'utility';
  const school = SCHOOLS.includes(raw.school) ? raw.school : '';
  const damage_entries = Array.isArray(raw.damage_entries)
    ? raw.damage_entries
        .filter(e => e && typeof e === 'object' && e.damage)
        .map(e => ({ damage: String(e.damage), damage_type: String(e.damage_type || '') }))
    : [];
  const attack = String(raw.attack_save || '').toLowerCase();
  const attack_save = ['melee','ranged','save'].includes(attack) ? attack : '';
  const save = String(raw.save_ability || '').toUpperCase();
  const save_ability = ['STR','DEX','CON','INT','WIS','CHA'].includes(save) ? save : '';
  const allowed_classes = Array.isArray(raw.allowed_classes)
    ? Array.from(new Set(raw.allowed_classes.map(canonClass).filter(Boolean)))
    : [];
  return {
    name,
    level,
    type,
    school,
    casting_time: String(raw.casting_time || ''),
    range_area: String(raw.range_area || ''),
    duration: String(raw.duration || ''),
    comp_v: !!raw.comp_v,
    comp_s: !!raw.comp_s,
    comp_m: !!raw.comp_m,
    comp_m_text: String(raw.comp_m_text || ''),
    attack_save,
    save_ability,
    damage_entries,
    extra_effects: String(raw.extra_effects || ''),
    description: String(raw.description || ''),
    allowed_classes,
  };
}

// ── CRUD ───────────────────────────────────────────────────────────────────

// GET /review — list spells whose names look broken (OCR artefacts from the
// PDF scanner) along with a suggested canonical replacement. Surfaced by the
// frontend as a post-scan review modal so the DM can apply fixes per-row.
router.get('/review', async (req, res) => {
  try {
    const rows = (await db.query('SELECT id, name, level, school FROM spell_library ORDER BY name')).rows;
    const existingNames = new Set(rows.map(r => r.name));
    const items = [];
    for (const r of rows) {
      const sug = suggestCanonical(r.name);
      if (!sug) continue;
      const reasons = sug.distance === 0 ? ['spacing/punctuation'] : [`fuzzy match (Lev=${sug.distance})`];
      items.push({
        id: r.id,
        currentName: r.name,
        suggestedName: sug.suggested,
        distance: sug.distance,
        level: r.level,
        school: r.school,
        // If the suggested name already exists in the library, applying would
        // collide — UI should surface this so the DM can merge/delete instead.
        conflict: existingNames.has(sug.suggested) && sug.suggested !== r.name,
        reasons,
      });
    }
    items.sort((a, b) => a.distance - b.distance || a.currentName.localeCompare(b.currentName));
    res.json({ total: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, level, klass } = req.query;
    const params = [];
    const conds = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`name ILIKE $${params.length}`);
    }
    if (level !== undefined && level !== '') {
      params.push(parseInt(level, 10));
      conds.push(`level = $${params.length}`);
    }
    if (klass) {
      // Case-insensitive match against any element of the allowed_classes JSONB array.
      params.push(String(klass));
      conds.push(`EXISTS (SELECT 1 FROM jsonb_array_elements_text(allowed_classes) AS c WHERE LOWER(c) = LOWER($${params.length}))`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = (await db.query(`SELECT * FROM spell_library ${where} ORDER BY name`, params)).rows;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const s = normaliseSpell(req.body);
    if (!s) return res.status(400).json({ error: 'Invalid spell' });
    const row = (await db.query(
      `INSERT INTO spell_library (id, name, level, type, school, casting_time, range_area, duration,
       comp_v, comp_s, comp_m, comp_m_text, attack_save, save_ability, damage_entries, extra_effects, description, source, allowed_classes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (name) DO UPDATE SET
         level=EXCLUDED.level, type=EXCLUDED.type, school=EXCLUDED.school,
         casting_time=EXCLUDED.casting_time, range_area=EXCLUDED.range_area, duration=EXCLUDED.duration,
         comp_v=EXCLUDED.comp_v, comp_s=EXCLUDED.comp_s, comp_m=EXCLUDED.comp_m, comp_m_text=EXCLUDED.comp_m_text,
         attack_save=EXCLUDED.attack_save, save_ability=EXCLUDED.save_ability,
         damage_entries=EXCLUDED.damage_entries, extra_effects=EXCLUDED.extra_effects, description=EXCLUDED.description,
         allowed_classes=EXCLUDED.allowed_classes
       RETURNING *`,
      [
        uuidv4(), s.name, s.level, s.type, s.school, s.casting_time, s.range_area, s.duration,
        s.comp_v, s.comp_s, s.comp_m, s.comp_m_text, s.attack_save, s.save_ability,
        JSON.stringify(s.damage_entries), s.extra_effects, s.description,
        String(req.body.source || 'manual'),
        JSON.stringify(s.allowed_classes),
      ]
    )).rows[0];
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const s = normaliseSpell(req.body);
    if (!s) return res.status(400).json({ error: 'Invalid spell' });
    const row = (await db.query(
      `UPDATE spell_library SET
         name=$1, level=$2, type=$3, school=$4, casting_time=$5, range_area=$6, duration=$7,
         comp_v=$8, comp_s=$9, comp_m=$10, comp_m_text=$11, attack_save=$12, save_ability=$13,
         damage_entries=$14, extra_effects=$15, description=$16, allowed_classes=$17
       WHERE id=$18 RETURNING *`,
      [
        s.name, s.level, s.type, s.school, s.casting_time, s.range_area, s.duration,
        s.comp_v, s.comp_s, s.comp_m, s.comp_m_text, s.attack_save, s.save_ability,
        JSON.stringify(s.damage_entries), s.extra_effects, s.description,
        JSON.stringify(s.allowed_classes),
        req.params.id,
      ]
    )).rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/rename — rename-only update used by the post-scan review modal.
// Avoids requiring the client to round-trip the whole spell row just to fix
// an OCR artefact. Returns 409 if the new name collides with an existing
// row so the UI can offer a merge/delete instead.
router.patch('/:id/rename', async (req, res) => {
  try {
    const newName = String(req.body?.name || '').trim();
    if (!newName) return res.status(400).json({ error: 'Name is required' });
    const collision = (await db.query(
      'SELECT id FROM spell_library WHERE LOWER(name) = LOWER($1) AND id != $2',
      [newName, req.params.id]
    )).rows[0];
    if (collision) return res.status(409).json({ error: 'A spell with that name already exists', collisionId: collision.id });
    const row = (await db.query(
      'UPDATE spell_library SET name=$1 WHERE id=$2 RETURNING *',
      [newName, req.params.id]
    )).rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM spell_library WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/refresh-from-open5e — overwrites every body field with data
// fetched from open5e using the spell's current name. The name itself stays
// untouched (use PATCH /:id/rename first if it needs fixing). Accepts
// `{ ruleset: '2014' | '2024' }` in the body or as a query param to choose
// which SRD to pull from. Returns 404 if open5e doesn't have the spell so
// the UI can tell the DM to fill fields manually. v2 (2024) responses fill
// extra fields (damage_entries, attack_save, save_ability, type) that v1
// can't structure — preserve the row's existing values for those when
// pulling from v1.
router.post('/:id/refresh-from-open5e', async (req, res) => {
  try {
    const ruleset = normaliseRuleset(req.body?.ruleset || req.query?.ruleset);
    const row = (await db.query('SELECT * FROM spell_library WHERE id=$1', [req.params.id])).rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    const o5e = await fetchOpen5eSpell(row.name, ruleset);
    if (!o5e) return res.status(404).json({ error: `open5e (${ruleset}) has no entry for "${row.name}"` });
    // For v1 the structured fields aren't available — keep what we had.
    // For v2 the response is rich enough to fill them, so prefer the
    // canonical data unless it's explicitly empty.
    const damage_entries = (Array.isArray(o5e.damage_entries) && o5e.damage_entries.length)
      ? o5e.damage_entries
      : (Array.isArray(row.damage_entries) ? row.damage_entries : []);
    const attack_save = o5e.attack_save || row.attack_save || '';
    const save_ability = o5e.save_ability || row.save_ability || '';
    const type = o5e.type || row.type || 'utility';
    const updated = (await db.query(
      `UPDATE spell_library SET
         level=$1, school=$2, casting_time=$3, range_area=$4, duration=$5,
         comp_v=$6, comp_s=$7, comp_m=$8, comp_m_text=$9, description=$10,
         allowed_classes=$11, damage_entries=$12, attack_save=$13,
         save_ability=$14, type=$15
       WHERE id=$16 RETURNING *`,
      [
        o5e.level, o5e.school, o5e.casting_time, o5e.range_area, o5e.duration,
        o5e.comp_v, o5e.comp_s, o5e.comp_m, o5e.comp_m_text, o5e.description,
        JSON.stringify(o5e.allowed_classes),
        JSON.stringify(damage_entries), attack_save, save_ability, type,
        req.params.id,
      ]
    )).rows[0];
    res.json({ ...updated, _ruleset: ruleset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/spell-library  — wipe the whole library. Requires
// ?confirm=yes to avoid accidental nukes from a wrong path call.
router.delete('/', async (req, res) => {
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ error: 'Refusing to delete all without ?confirm=yes' });
  }
  try {
    const result = await db.query('DELETE FROM spell_library');
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Scan PDF ────────────────────────────────────────────────────────────────
// POST /api/spell-library/scan-pdf  (multipart: file + ai settings as fields)
//
// Streams NDJSON progress events to the client so the UI can show a per-page
// progress bar and ETA. Each line is one JSON event:
//   { kind:'start',    pages, filename }
//   { kind:'page',     page, total, mode, durationMs, spellsThisPage,
//                      spellsFound, spellsImported, spellsSkippedDuplicates,
//                      newSpells:[{ id,name,level }], error? }
//   { kind:'done',     pages, spellsFound, spellsImported,
//                      spellsSkippedDuplicates, pageErrors }
router.post('/scan-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const { provider = 'lmstudio', baseUrl, apiKey, model, dpi } = req.body;
  // 2014 (5.1) vs 2024 (5.2) SRD selection for the open5e fallback.
  const ruleset = normaliseRuleset(req.body.ruleset);
  if (!baseUrl) return res.status(400).json({ error: 'AI baseUrl required' });
  // Per-page passes — running the same page through the model multiple times
  // with rising temperature surfaces spells the first deterministic pass
  // missed. Consensus voting then drops any spell that doesn't appear in
  // at least `minConsensus` passes (default ~60% of passes).
  const passes = Math.max(1, Math.min(12, parseInt(req.body.passes) || 5));
  const minConsensusRaw = parseInt(req.body.minConsensus);
  // Default ~40% — the validators (name-in-text + header-pattern) are strong
  // enough that we don't need a very high consensus to filter hallucinations,
  // and a 2/5 default recovers spells the model only catches inconsistently.
  const minConsensus = Math.max(1, Math.min(passes,
    Number.isFinite(minConsensusRaw) ? minConsensusRaw : Math.max(2, Math.ceil(passes * 0.4))
  ));
  // Optional: limit how many pages to process. Useful for previewing scans
  // on a long PDF before committing to the full run.
  const maxPagesRaw = parseInt(req.body.maxPages);
  const maxPages = Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? maxPagesRaw : Infinity;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spellpdf-'));
  const pdfPath = path.join(tmpDir, 'in.pdf');
  fs.writeFileSync(pdfPath, req.file.buffer);

  // Stream NDJSON one event per line.
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  function emit(event) {
    res.write(JSON.stringify(event) + '\n');
  }

  const result = {
    pages: 0,
    spellsFound: 0,
    spellsImported: 0,
    spellsSkippedDuplicates: 0,
    pageErrors: [],
  };

  try {
    const useDpi = Math.max(72, Math.min(300, parseInt(dpi) || 110));
    const allPages = await rasterisePdf(pdfPath, tmpDir, useDpi);
    const pages = Number.isFinite(maxPages) ? allPages.slice(0, maxPages) : allPages;
    result.pages = pages.length;
    console.log(`[spell-library] Scanning "${req.file.originalname}" — ${pages.length}/${allPages.length} pages, ${passes} passes, consensus ${minConsensus}/${passes}, via ${provider} ${baseUrl} (${model || 'default'})`);
    emit({ kind: 'start', pages: pages.length, filename: req.file.originalname, passes, minConsensus });

    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      const t0 = Date.now();
      const newSpells = [];
      let mode = 'text';
      let pageError = null;
      let spellsThisPage = 0;
      let hallucinations = 0;
      try {
        const pageText = await extractPageText(pdfPath, pageNum);
        const useText = pageText && pageText.length >= 200;
        if (!useText) mode = 'vision';

        // ── Deterministic header detection (text-only PDFs) ───────────────
        // Regex-find every spell header on this page. Recall is 100% on
        // anything with a text layer. We only call the model to fill the
        // remaining body fields per spell — a much easier task than "find
        // all spells on this page".
        if (useText) {
          const headers = findSpellHeadersInText(pageText);
          if (headers.length > 0) {
            mode = 'deterministic';
            console.log(`[spell-library] Page ${pageNum}/${pages.length} — deterministic mode: found ${headers.length} header(s)`);
            const lines = pageText.split('\n');
            for (let h = 0; h < headers.length; h++) {
              const hdr = headers[h];
              const next = headers[h + 1];
              let body;
              if (next) {
                // Body ends at the next header on the same page.
                body = lines.slice(Math.max(0, hdr.headerLineIdx - 1), next.headerLineIdx).join('\n');
              } else {
                // Last header on this page — take everything to end-of-page,
                // then peek at the next page in case the description spills
                // across the break (very common in two-column 5e books).
                // Cut the next-page slice at the first header we find there
                // (so we don't drag the next spell's body into this one), or
                // at a 40-line cap if no header turns up.
                body = lines.slice(Math.max(0, hdr.headerLineIdx - 1)).join('\n');
                if (i + 1 < pages.length) {
                  try {
                    const nextPageText = await extractPageText(pdfPath, pageNum + 1);
                    if (nextPageText) {
                      const nextLines = nextPageText.split('\n');
                      const nextHeaders = findSpellHeadersInText(nextPageText);
                      const cutoff = nextHeaders.length > 0
                        ? nextHeaders[0].headerLineIdx
                        : Math.min(40, nextLines.length);
                      const continuation = nextLines.slice(0, cutoff).join('\n');
                      if (continuation.trim()) body += '\n' + continuation;
                    }
                  } catch (e) { /* next-page extract failed — degrade gracefully */ }
                }
              }
              // Single-pass LLM fill (consensus voting unnecessary — name and
              // class list are already deterministic).
              let fields = null;
              try {
                fields = await extractSpellFields(provider, baseUrl, apiKey, model, hdr.name, body, 0);
              } catch (fillErr) {
                console.error(`[spell-library] Page ${pageNum} ${hdr.name} field-fill error:`, fillErr.message);
              }
              // Open5e fallback: query in parallel with the LLM call's already
              // returned. Use it to fill any field the LLM left empty / botched.
              // SRD spells are authoritative — for non-SRD content open5e
              // returns null and we fall back to whatever the LLM gave us.
              let canonical = null;
              try { canonical = await fetchOpen5eSpell(hdr.name, ruleset); }
              catch (e) { /* network failure — silently degrade */ }
              const llm = fields || {};
              // For each body field: prefer LLM if it gave a non-empty value,
              // otherwise fall back to open5e. Header-derived fields
              // (name/level/school/allowed_classes) are overwritten below.
              const pick = (k) => {
                const v = llm[k];
                if (v === undefined || v === null) return canonical?.[k];
                if (typeof v === 'string' && !v.trim()) return canonical?.[k];
                if (Array.isArray(v) && v.length === 0) return canonical?.[k];
                return v;
              };
              const merged = {
                name: hdr.name,
                level: hdr.level,
                school: hdr.school,
                allowed_classes: hdr.allowed_classes,
                type: pick('type') || 'utility',
                casting_time: pick('casting_time') || '',
                range_area: pick('range_area') || '',
                duration: pick('duration') || '',
                // Booleans need a different rule: only fall back when the LLM
                // result was missing entirely (not when it explicitly said false).
                comp_v: typeof llm.comp_v === 'boolean' ? llm.comp_v : !!canonical?.comp_v,
                comp_s: typeof llm.comp_s === 'boolean' ? llm.comp_s : !!canonical?.comp_s,
                comp_m: typeof llm.comp_m === 'boolean' ? llm.comp_m : !!canonical?.comp_m,
                comp_m_text: pick('comp_m_text') || '',
                attack_save: pick('attack_save') || '',
                save_ability: pick('save_ability') || '',
                damage_entries: pick('damage_entries') || [],
                extra_effects: pick('extra_effects') || '',
                description: pick('description') || '',
              };
              const s = normaliseSpell(merged);
              if (!s) continue;
              // Preserve deterministic header values over anything the model returned.
              s.name = hdr.name;
              s.level = hdr.level;
              s.school = hdr.school;
              s.allowed_classes = hdr.allowed_classes;
              result.spellsFound += 1;
              spellsThisPage += 1;
              try {
                const row = (await db.query(
                  `INSERT INTO spell_library (id, name, level, type, school, casting_time, range_area, duration,
                   comp_v, comp_s, comp_m, comp_m_text, attack_save, save_ability, damage_entries, extra_effects, description, source, allowed_classes)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
                   ON CONFLICT (name) DO NOTHING RETURNING *`,
                  [
                    uuidv4(), s.name, s.level, s.type, s.school, s.casting_time, s.range_area, s.duration,
                    s.comp_v, s.comp_s, s.comp_m, s.comp_m_text, s.attack_save, s.save_ability,
                    JSON.stringify(s.damage_entries), s.extra_effects, s.description,
                    req.file.originalname.slice(0, 200),
                    JSON.stringify(s.allowed_classes),
                  ]
                )).rows[0];
                if (row) {
                  result.spellsImported += 1;
                  newSpells.push({ id: row.id, name: row.name, level: row.level });
                } else {
                  result.spellsSkippedDuplicates += 1;
                }
              } catch (dbErr) {
                console.error('Insert error for spell', s.name, dbErr.message);
              }
            }
            // Done with this page via deterministic path — emit and continue.
            emit({
              kind: 'page',
              page: pageNum,
              total: pages.length,
              mode,
              durationMs: Date.now() - t0,
              spellsThisPage,
              hallucinationsDropped: result.hallucinationsDropped || 0,
              spellsFound: result.spellsFound,
              spellsImported: result.spellsImported,
              spellsSkippedDuplicates: result.spellsSkippedDuplicates,
              newSpells,
              error: pageError,
            });
            continue;
          }
        }

        // ── Fallback: image-only pages or pages with no detectable headers ──
        // Run N passes with rising temperatures and CONSENSUS-vote: only keep
        // spells whose name appears in at least `minConsensus` passes. This
        // catches the major hallucination class — the model occasionally
        // invents a plausible-sounding spell, but it's unlikely to invent the
        // same name across multiple independent samples.
        const passVotes = new Map(); // nameKey → { count, samples: [normalised payload] }
        let successfulPasses = 0;
        for (let p = 0; p < passes; p++) {
          let pageRaw = [];
          try {
            if (useText) {
              console.log(`[spell-library] Page ${pageNum}/${pages.length} — text pass ${p + 1}/${passes}, ${pageText.length} chars`);
              pageRaw = await extractSpellsFromText(provider, baseUrl, apiKey, model, pageText, p);
            } else {
              const buf = fs.readFileSync(pages[i]);
              const b64 = buf.toString('base64');
              console.log(`[spell-library] Page ${pageNum}/${pages.length} — vision pass ${p + 1}/${passes}, image ${(buf.length / 1024).toFixed(0)} KB`);
              pageRaw = await extractSpellsFromImage(provider, baseUrl, apiKey, model, b64, p);
            }
            successfulPasses += 1;
          } catch (passErr) {
            console.error(`[spell-library] Page ${pageNum} pass ${p + 1} error:`, passErr.message);
            // Don't abort the whole page on one bad pass.
          }
          // Tally each unique name once per pass (in case a single pass duplicates).
          const seenInPass = new Set();
          for (const r of pageRaw) {
            const k = nameKey(r && r.name);
            if (!k || seenInPass.has(k)) continue;
            seenInPass.add(k);
            const slot = passVotes.get(k) || { count: 0, samples: [] };
            slot.count += 1;
            slot.samples.push(r);
            passVotes.set(k, slot);
          }
          console.log(`[spell-library] Page ${pageNum} pass ${p + 1}: returned ${pageRaw.length}, ${seenInPass.size} unique`);
        }

        // Effective threshold — if many passes failed, lower the bar so we
        // don't drop everything just because the server flaked.
        const effectiveThreshold = Math.max(1, Math.min(minConsensus, Math.ceil(successfulPasses * 0.6)));
        const survived = [];
        let votedOut = 0;
        for (const [k, slot] of passVotes.entries()) {
          if (slot.count >= effectiveThreshold) {
            // Pick the most-detailed sample (longest description) as the winner.
            const winner = slot.samples
              .slice()
              .sort((a, b) => (String(b?.description || '').length) - (String(a?.description || '').length))[0];
            survived.push({ ...winner, _votes: slot.count });
          } else {
            votedOut += 1;
            console.log(`[spell-library] Page ${pageNum}: voted out "${slot.samples[0]?.name}" (${slot.count}/${successfulPasses} passes, threshold ${effectiveThreshold})`);
          }
        }
        const raw = survived;
        console.log(`[spell-library] Page ${pageNum}: ${raw.length} consensus survivor(s) of ${passVotes.size} candidates across ${successfulPasses}/${passes} successful passes`);
        // Track consensus rejections separately so the UI can show them.
        hallucinations += votedOut;
        for (const r of raw) {
          const s = normaliseSpell(r);
          if (!s) continue;
          // Hallucination guard: drop any spell whose name doesn't actually
          // appear in the source page text or doesn't have a spell-header
          // pattern (Level N / Cantrip) near its occurrence. Only enforced
          // when we have a real text layer — image-only pages must trust the
          // vision model.
          if (pageText && pageText.length >= 50) {
            if (!nameAppearsInText(s.name, pageText)) {
              hallucinations += 1;
              console.log(`[spell-library] Page ${pageNum}: dropped hallucinated "${s.name}" (not in page text)`);
              continue;
            }
            if (!spellHeaderConfirmed(s.name, pageText)) {
              hallucinations += 1;
              console.log(`[spell-library] Page ${pageNum}: dropped hallucinated "${s.name}" (no Level/Cantrip header near name)`);
              continue;
            }
          }
          // Open5e fallback: backfill any body field the consensus winner
          // left empty. Only fills gaps — anything the LLM gave us wins.
          try {
            const canonical = await fetchOpen5eSpell(s.name, ruleset);
            if (canonical) {
              if (!s.casting_time) s.casting_time = canonical.casting_time;
              if (!s.range_area) s.range_area = canonical.range_area;
              if (!s.duration) s.duration = canonical.duration;
              if (!s.comp_m_text) s.comp_m_text = canonical.comp_m_text;
              if (!s.description) s.description = canonical.description;
              if (!s.school) s.school = canonical.school;
              if (!Array.isArray(s.allowed_classes) || s.allowed_classes.length === 0) {
                s.allowed_classes = canonical.allowed_classes;
              }
            }
          } catch (e) { /* network failure — keep LLM-only data */ }
          result.spellsFound += 1;
          spellsThisPage += 1;
          try {
            const row = (await db.query(
              `INSERT INTO spell_library (id, name, level, type, school, casting_time, range_area, duration,
               comp_v, comp_s, comp_m, comp_m_text, attack_save, save_ability, damage_entries, extra_effects, description, source, allowed_classes)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
               ON CONFLICT (name) DO NOTHING RETURNING *`,
              [
                uuidv4(), s.name, s.level, s.type, s.school, s.casting_time, s.range_area, s.duration,
                s.comp_v, s.comp_s, s.comp_m, s.comp_m_text, s.attack_save, s.save_ability,
                JSON.stringify(s.damage_entries), s.extra_effects, s.description,
                req.file.originalname.slice(0, 200),
                JSON.stringify(s.allowed_classes),
              ]
            )).rows[0];
            if (row) {
              result.spellsImported += 1;
              newSpells.push({ id: row.id, name: row.name, level: row.level });
            } else {
              result.spellsSkippedDuplicates += 1;
            }
          } catch (dbErr) {
            console.error('Insert error for spell', s.name, dbErr.message);
          }
        }
      } catch (pageErr) {
        console.error(`[spell-library] Page ${pageNum} error:`, pageErr.message);
        result.pageErrors.push({ page: pageNum, error: pageErr.message });
        pageError = pageErr.message;
      }

      result.hallucinationsDropped = (result.hallucinationsDropped || 0) + hallucinations;
      emit({
        kind: 'page',
        page: pageNum,
        total: pages.length,
        mode,
        durationMs: Date.now() - t0,
        spellsThisPage,
        hallucinationsDropped: result.hallucinationsDropped,
        spellsFound: result.spellsFound,
        spellsImported: result.spellsImported,
        spellsSkippedDuplicates: result.spellsSkippedDuplicates,
        newSpells,
        error: pageError,
      });
    }

    emit({
      kind: 'done',
      pages: pages.length,
      spellsFound: result.spellsFound,
      spellsImported: result.spellsImported,
      spellsSkippedDuplicates: result.spellsSkippedDuplicates,
      hallucinationsDropped: result.hallucinationsDropped || 0,
      pageErrors: result.pageErrors,
    });
  } catch (err) {
    console.error('[spell-library] fatal error:', err.message);
    emit({ kind: 'error', error: err.message, ...result });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    res.end();
  }
});

module.exports = router;

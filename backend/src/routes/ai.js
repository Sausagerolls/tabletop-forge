const express = require('express');
const db = require('../db');
const router = express.Router();

// Pull the canonical language list at request time and embed it into
// the system prompt. The host stores languages in a first-class table
// (see backend/src/routes/languages.js); this keeps AI output in sync
// with whatever languages the DM has registered, including custom
// ones — without burning a token-budget on the entire creature schema
// repeated per request, we just inject the names.
async function fetchLanguageNames() {
  try {
    const rows = (await db.query('SELECT name FROM languages ORDER BY name')).rows;
    return rows.map((r) => r.name);
  } catch (err) {
    // If the DB blip out (rare — this runs after the migration
    // succeeded), fall back to the SRD core 16 so the AI still
    // produces sensible output instead of bailing.
    console.warn('AI prompt: failed to read languages, falling back to SRD core', err.message);
    return [
      'Common','Dwarvish','Elvish','Giant','Gnomish','Goblin','Halfling','Orc',
      'Abyssal','Celestial','Deep Speech','Draconic','Infernal','Primordial',
      'Sylvan','Undercommon',
    ];
  }
}

function buildSystemPrompt(languageNames) {
  const langList = languageNames.join(', ');
  return `You are a D&D 5e monster designer. Generate a complete, balanced D&D 5e stat block in JSON format.

Return ONLY valid JSON — no markdown, no explanation, no code fences. The JSON must match this exact schema:

{
  "name": "string",
  "size": "tiny|small|medium|large|huge|gargantuan",
  "creature_type": "Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|Humanoid|Monstrosity|Ooze|Plant|Undead",
  "subtype": "string (empty string if none)",
  "alignment": "Lawful Good|Neutral Good|Chaotic Good|Lawful Neutral|True Neutral|Chaotic Neutral|Lawful Evil|Neutral Evil|Chaotic Evil|Unaligned",
  "armor_class": number,
  "armor_desc": "string (e.g. natural armor, chain mail, or empty)",
  "hit_points": number,
  "hit_dice": "string (e.g. 5d8+10)",
  "speed_walk": number,
  "speed_fly": number,
  "speed_swim": number,
  "speed_burrow": number,
  "speed_climb": number,
  "strength": number,
  "dexterity": number,
  "constitution": number,
  "intelligence": number,
  "wisdom": number,
  "charisma": number,
  "save_str": number or null,
  "save_dex": number or null,
  "save_con": number or null,
  "save_int": number or null,
  "save_wis": number or null,
  "save_cha": number or null,
  "skill_acrobatics": number or null,
  "skill_animal_handling": number or null,
  "skill_arcana": number or null,
  "skill_athletics": number or null,
  "skill_deception": number or null,
  "skill_history": number or null,
  "skill_insight": number or null,
  "skill_intimidation": number or null,
  "skill_investigation": number or null,
  "skill_medicine": number or null,
  "skill_nature": number or null,
  "skill_perception": number or null,
  "skill_performance": number or null,
  "skill_persuasion": number or null,
  "skill_religion": number or null,
  "skill_sleight_of_hand": number or null,
  "skill_stealth": number or null,
  "skill_survival": number or null,
  "damage_vulnerabilities": "string (comma-separated types, or empty)",
  "damage_resistances": "string (comma-separated types, or empty)",
  "damage_immunities": "string (comma-separated types, or empty)",
  "condition_immunities": "string (comma-separated conditions, or empty)",
  "senses": "string (e.g. Darkvision 60 ft., passive Perception 12)",
  "languages": "string — comma-separated names from the canonical list below",
  "challenge_rating": "one of: 0,1/8,1/4,1/2,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
  "xp": number,
  "proficiency_bonus": number,
  "special_abilities": [{"name": "string", "desc": "string"}],
  "actions": [{"name": "string", "desc": "string"}],
  "bonus_actions": [{"name": "string", "desc": "string"}],
  "reactions": [{"name": "string", "desc": "string"}],
  "legendary_actions": [{"name": "string", "desc": "string"}],
  "legendary_action_count": number,
  "loot": [{"name": "string", "qty": "string (e.g. '1', '2d6', '1d4+2 gp')", "chance": number, "desc": "string"}]
}

Rules:
- All numeric stats must be actual numbers, never strings.
- Save throws: MUST be null for saves the creature isn't proficient in. Most creatures have 0–2 proficient saves; never assign every save. Common patterns: a fighter-type might be proficient in STR + CON; a mage in INT + WIS; a rogue in DEX + INT. Set every other save_* field to null. Assigning all six saves is WRONG and forbidden.
- Skills: MUST be null for skills the creature isn't trained in. A typical creature has only 1–4 skill proficiencies — never assign every skill. Pick skills that fit the creature's flavor (e.g. wolves: Perception + Stealth; sages: Arcana + History; brutes: Athletics + Intimidation). Set every other skill_* field to null.
- Legendary actions: by default a creature has NONE. Set legendary_actions to [] and legendary_action_count to 0 unless explicitly told this is a legendary creature. Only iconic boss-tier monsters (ancient dragons, liches, archdevils, etc.) should have legendary actions, and only when the user requests them.
- XP must match the standard D&D 5e CR table: CR0=0, CR1/8=25, CR1/4=50, CR1/2=100, CR1=200, CR2=450, CR3=700, CR4=1100, CR5=1800, CR6=2300, CR7=2900, CR8=3900, CR9=5000, CR10=5900, etc.
- Proficiency bonus: CR0-4=+2, CR5-8=+3, CR9-12=+4, CR13-16=+5, CR17-20=+6, CR21-24=+7, CR25-28=+8, CR29-30=+9.
- Include at least one action.
- loot: 2–5 items appropriate to the creature. chance is 0–100 (integer percent). Include coin, equipment, and thematic drops. Common items 75–100%, rare items 10–30%.
- Languages: the value of "languages" MUST be a comma-separated list of names drawn ONLY from this canonical list (case-insensitive match): ${langList}. Do NOT invent new language names. If a creature can understand but not speak a language, append " (understands but cannot speak)" — e.g. "Common, Goblin (understands but cannot speak)". If the creature speaks no language, return "" (empty string).`;
}

const SYSTEM_PROMPT_FALLBACK = buildSystemPrompt([
  'Common','Dwarvish','Elvish','Giant','Gnomish','Goblin','Halfling','Orc',
  'Abyssal','Celestial','Deep Speech','Draconic','Infernal','Primordial',
  'Sylvan','Undercommon',
]);

function buildUserPrompt(promptData) {
  const lines = [];
  if (promptData.name) lines.push(`Name: ${promptData.name}`);
  if (promptData.cr) lines.push(`Challenge Rating: ${promptData.cr}`);
  if (promptData.creature_type) lines.push(`Creature Type: ${promptData.creature_type}`);
  if (promptData.size) lines.push(`Size: ${promptData.size}`);
  if (promptData.appearance) lines.push(`Appearance: ${promptData.appearance}`);
  if (promptData.personality) lines.push(`Personality / Behaviour: ${promptData.personality}`);
  if (promptData.environment) lines.push(`Environment / Habitat: ${promptData.environment}`);
  if (promptData.special_notes) lines.push(`Special Notes: ${promptData.special_notes}`);

  // Hard directives that override the system prompt's defaults.
  if (promptData.has_legendary_actions) {
    lines.push('Legendary creature: provide 3–4 legendary action entries and set legendary_action_count to 3.');
  } else {
    lines.push('NOT a legendary creature: legendary_actions MUST be [] and legendary_action_count MUST be 0.');
  }
  return `Generate a complete D&D 5e stat block for the following creature. Return only JSON.\n\n${lines.join('\n')}`;
}

// Normalise a baseUrl that the user typed (e.g. add scheme if missing) and
// surface the underlying network cause when fetch throws.
function normaliseBaseUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/+$/, '');
}

async function fetchWithDetail(url, opts) {
  try {
    return await fetch(url, opts);
  } catch (err) {
    const cause = err?.cause;
    let detail = err?.message || 'fetch failed';
    if (cause) {
      if (cause.code) detail += ` (${cause.code})`;
      if (cause.message && cause.message !== err.message) detail += `: ${cause.message}`;
    }
    detail += ` — url=${url}`;
    throw new Error(detail);
  }
}

// A full 5e stat block in JSON regularly runs 2–4k tokens. Many local
// servers (LM Studio, vLLM) default to 512 or 1024 max-tokens, which
// truncates the JSON mid-property and we get a parse error around that
// position. Generation calls override the cap; the test ping doesn't
// need it.
const STATBLOCK_MAX_TOKENS = 4096;

async function callOpenAICompat(baseUrl, apiKey, model, messages, opts = {}) {
  const url = `${normaliseBaseUrl(baseUrl)}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const body = {
    model: model || 'local-model',
    messages,
    temperature: opts.temperature ?? 0.3,
    stream: false,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return content;
}

async function callOllama(baseUrl, model, messages, opts = {}) {
  const url = `${normaliseBaseUrl(baseUrl)}/api/chat`;
  const body = {
    model: model || 'llama3',
    messages,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.maxTokens ? { num_predict: opts.maxTokens } : {}),
    },
  };
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data.message?.content;
  if (!content) throw new Error('Empty response from Ollama');
  return content;
}

async function callLLM(provider, baseUrl, apiKey, model, messages, opts) {
  if (provider === 'ollama') return callOllama(baseUrl, model, messages, opts);
  return callOpenAICompat(baseUrl, apiKey, model, messages, opts);
}

// Cheap structural fixes for the JSON forms LLMs most often emit
// incorrectly. Trailing commas + smart-quotes are the usual culprits;
// the missing-comma cases ("Expected ',' or '}' after property value")
// can't be regex-fixed reliably, so those fall through to the LLM
// repair retry in /generate.
function repairJsonText(text) {
  return text
    // Smart quotes → straight quotes
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1');
}

function extractJSON(text) {
  // Strip markdown code fences if the model wrapped the JSON
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response');

  const slice = cleaned.slice(start, end + 1);
  try { return JSON.parse(slice); }
  catch (firstErr) {
    try { return JSON.parse(repairJsonText(slice)); }
    catch { throw firstErr; }
  }
}

function normaliseCreature(raw) {
  const numericFields = [
    'armor_class', 'hit_points',
    'speed_walk', 'speed_fly', 'speed_swim', 'speed_burrow', 'speed_climb',
    'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
    'xp', 'proficiency_bonus', 'legendary_action_count',
  ];
  for (const f of numericFields) {
    if (raw[f] !== undefined) raw[f] = Number(raw[f]) || 0;
  }

  const arrayFields = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions', 'loot'];
  for (const f of arrayFields) {
    if (!Array.isArray(raw[f])) raw[f] = [];
  }
  // Normalise loot entries
  raw.loot = raw.loot.map((item) => ({
    name: item.name || '',
    qty: String(item.qty ?? '1'),
    chance: Math.min(100, Math.max(0, Number(item.chance) || 100)),
    desc: item.desc || '',
  }));

  const stringFields = [
    'subtype', 'armor_desc', 'hit_dice', 'senses', 'languages',
    'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities',
  ];
  for (const f of stringFields) {
    if (raw[f] == null) raw[f] = '';
  }

  return raw;
}

// Match each comma-separated entry in `creature.languages` against the
// canonical language list and rewrite to the canonical casing. Trailing
// qualifiers like " (understands but cannot speak)" are preserved.
// Unknown entries fall through unchanged so a deliberately exotic
// custom language doesn't get stripped.
function canonicaliseLanguages(text, languageNames) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const canonByLower = new Map(languageNames.map((n) => [n.toLowerCase(), n]));
  const parts = raw.split(/\s*,\s*/).filter(Boolean);
  const out = [];
  for (const part of parts) {
    const m = part.match(/^([^()]+?)(\s*\(.+\))?$/);
    const base = (m ? m[1] : part).trim();
    const tail = (m && m[2]) ? m[2] : '';
    const canon = canonByLower.get(base.toLowerCase());
    out.push((canon || base) + tail);
  }
  return out.join(', ');
}

// POST /api/ai/test  — verify the AI connection works
router.post('/test', async (req, res) => {
  const { provider, baseUrl, apiKey, model } = req.body;
  if (!baseUrl) return res.status(400).json({ error: 'baseUrl is required' });

  try {
    const messages = [{ role: 'user', content: 'Reply with only the word OK.' }];
    const content = await callLLM(provider, baseUrl, apiKey, model, messages);
    res.json({ ok: true, preview: content.slice(0, 100) });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/ai/generate  — generate a stat block
router.post('/generate', async (req, res) => {
  const { provider, baseUrl, apiKey, model, promptData } = req.body;
  if (!baseUrl) return res.status(400).json({ error: 'baseUrl is required' });
  if (!promptData?.name) return res.status(400).json({ error: 'promptData.name is required' });

  // Build the system prompt fresh each request so the canonical
  // language list reflects whatever the DM has registered (including
  // custom additions). Falls back to the SRD core 16 if the DB read
  // fails — see buildSystemPrompt() at the top of the file.
  let languageNames;
  try { languageNames = await fetchLanguageNames(); }
  catch { languageNames = null; }
  const systemPrompt = languageNames ? buildSystemPrompt(languageNames) : SYSTEM_PROMPT_FALLBACK;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildUserPrompt(promptData) },
  ];

  try {
    const content = await callLLM(provider, baseUrl, apiKey, model, messages, {
      maxTokens: STATBLOCK_MAX_TOKENS,
      temperature: 0.3,
    });
    let raw;
    try {
      raw = extractJSON(content);
    } catch (parseErr) {
      // Ask the LLM to repair its own JSON. This is cheap and rescues
      // most truncations / missing-comma errors that regex can't fix.
      console.warn('AI generate: first parse failed, attempting repair:', parseErr.message);
      const repairMessages = [
        { role: 'system', content: 'You are a JSON repair tool. The user will give you a possibly broken JSON object. Output ONLY the corrected, complete JSON object — no markdown, no explanation, no code fences. Preserve all field values. If the input is truncated, complete it sensibly.' },
        { role: 'user', content: `The parser said: ${parseErr.message}\n\nFix this JSON:\n\n${content}` },
      ];
      const repaired = await callLLM(provider, baseUrl, apiKey, model, repairMessages, {
        maxTokens: STATBLOCK_MAX_TOKENS,
        temperature: 0,
      });
      try {
        raw = extractJSON(repaired);
      } catch (repairErr) {
        throw new Error(`Model returned invalid JSON and repair failed: ${parseErr.message}`);
      }
    }
    const creature = normaliseCreature(raw);

    // Map AI-output languages to the canonical casing so the frontend
    // picker recognises them as known entries instead of treating each
    // as a custom one-off.
    if (languageNames && creature.languages) {
      creature.languages = canonicaliseLanguages(creature.languages, languageNames);
    }

    // Belt-and-braces: even if the model ignored the directive, strip
    // legendary actions when the user didn't ask for them.
    if (!promptData.has_legendary_actions) {
      creature.legendary_actions = [];
      creature.legendary_action_count = 0;
    }

    // Sanity nets for over-eager save / skill assignment. When the
    // model fills nearly every slot it's almost always the lazy
    // "everything proficient" failure mode rather than an
    // intentionally specialised creature, so we reset the lot and let
    // the DM hand-pick.
    const SAVE_FIELDS = ['save_str','save_dex','save_con','save_int','save_wis','save_cha'];
    const proficientSaves = SAVE_FIELDS.filter((f) => creature[f] != null).length;
    if (proficientSaves >= 5) {
      console.warn(`AI generate: model assigned ${proficientSaves}/6 saves — clearing as lazy fill`);
      for (const f of SAVE_FIELDS) creature[f] = null;
    }
    const SKILL_FIELDS = [
      'skill_acrobatics','skill_animal_handling','skill_arcana','skill_athletics',
      'skill_deception','skill_history','skill_insight','skill_intimidation',
      'skill_investigation','skill_medicine','skill_nature','skill_perception',
      'skill_performance','skill_persuasion','skill_religion','skill_sleight_of_hand',
      'skill_stealth','skill_survival',
    ];
    const proficientSkills = SKILL_FIELDS.filter((f) => creature[f] != null).length;
    if (proficientSkills >= 10) {
      console.warn(`AI generate: model assigned ${proficientSkills}/18 skills — clearing as lazy fill`);
      for (const f of SKILL_FIELDS) creature[f] = null;
    }

    res.json(creature);
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────────
// Image generation
// ───────────────────────────────────────────────────────────────────
// Provider-adapter shape:
//   { needsBaseUrl, needsApiKey, supportsNegativePrompt, supportsCfg,
//     supportsSteps, supportsModelList, defaultModel,
//     test({ baseUrl, apiKey })  → { preview, models }
//     generate({ baseUrl, apiKey, model, prompt, negativePrompt,
//                width, height, steps, cfgScale, seed })  → 'data:image/...'  }
// `generate` returns a single data: URI so the caller doesn't have to
// distinguish base64-from-API vs URL-fetched-and-converted.

const DEFAULT_IMAGE_PROMPT = 'fantasy portrait of a {name}, detailed digital painting, dramatic lighting, painterly';
const DEFAULT_NEG_SFW = 'low quality, blurry, distorted, watermark, text, signature, nsfw, nude, explicit, sexual, gore';
const DEFAULT_NEG_NSFW = 'low quality, blurry, distorted, watermark, text, signature';
// Backwards-compat aliases — the SwarmUI-only code used these names.
const SWARMUI_DEFAULT_PROMPT = DEFAULT_IMAGE_PROMPT;
const SWARMUI_DEFAULT_NEG_SFW = DEFAULT_NEG_SFW;
const SWARMUI_DEFAULT_NEG_NSFW = DEFAULT_NEG_NSFW;

// ── AUTO1111 (Stable Diffusion WebUI) ─────────────────────────────
// Local server, typically http://localhost:7860 or host.docker.internal.
// Auth-less by default; some setups front it with a reverse-proxy token,
// in which case the user pastes that into the API Key field and we
// forward as Bearer. Endpoint pattern:
//   GET  <base>/sdapi/v1/sd-models  → list checkpoints
//   POST <base>/sdapi/v1/options    → set "sd_model_checkpoint"
//   POST <base>/sdapi/v1/txt2img    → returns base64 images
async function auto1111Headers(apiKey) {
  const h = { 'Content-Type': 'application/json' };
  if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
  return h;
}
async function auto1111ListModels(baseUrl, apiKey) {
  const res = await fetchWithDetail(
    `${normaliseBaseUrl(baseUrl)}/sdapi/v1/sd-models`,
    { headers: await auto1111Headers(apiKey) }
  );
  if (!res.ok) throw new Error(`AUTO1111 list models ${res.status}`);
  const list = await res.json();
  return Array.isArray(list)
    ? list.map(m => m.title || m.model_name).filter(Boolean)
    : [];
}
async function auto1111SetModel(baseUrl, apiKey, model) {
  if (!model) return;
  await fetchWithDetail(`${normaliseBaseUrl(baseUrl)}/sdapi/v1/options`, {
    method: 'POST',
    headers: await auto1111Headers(apiKey),
    body: JSON.stringify({ sd_model_checkpoint: model }),
  });
}
async function auto1111Generate(opts) {
  const { baseUrl, apiKey, model, prompt, negativePrompt, width, height, steps, cfgScale, seed } = opts;
  if (model) await auto1111SetModel(baseUrl, apiKey, model);
  const res = await fetchWithDetail(
    `${normaliseBaseUrl(baseUrl)}/sdapi/v1/txt2img`,
    {
      method: 'POST',
      headers: await auto1111Headers(apiKey),
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt || '',
        width: width || 768,
        height: height || 768,
        steps: steps || 25,
        cfg_scale: cfgScale || 6,
        seed: seed != null ? seed : -1,
        batch_size: 1,
        n_iter: 1,
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`AUTO1111 txt2img ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64 = Array.isArray(data.images) && data.images[0];
  if (!b64) throw new Error('AUTO1111 returned no images');
  // AUTO1111 emits raw base64 (no data: prefix). Always PNG.
  return `data:image/png;base64,${b64}`;
}

// ── OpenAI Images (DALL·E 3 / gpt-image-1) ────────────────────────
// Hosted, paid, API-key auth. The legacy DALL·E 3 endpoint and the
// newer gpt-image-1 share the /v1/images/generations URL but accept
// a different `size` set. We pass through whatever the user picked
// in the UI; OpenAI rejects unsupported pairs with a clear 400.
const OPENAI_IMAGE_MODELS = ['dall-e-3', 'gpt-image-1', 'dall-e-2'];
function openaiImageBaseUrl(baseUrl) {
  return baseUrl ? normaliseBaseUrl(baseUrl) : 'https://api.openai.com';
}
async function openaiImageGenerate(opts) {
  const { baseUrl, apiKey, model, prompt, width, height } = opts;
  if (!apiKey) throw new Error('OpenAI image gen requires an API key.');
  const url = `${openaiImageBaseUrl(baseUrl)}/v1/images/generations`;
  const m = model || 'dall-e-3';
  const w = width || 1024;
  const h = height || 1024;
  const body = {
    model: m,
    prompt,
    size: `${w}x${h}`,
    n: 1,
    // dall-e-3 supports response_format; gpt-image-1 always returns
    // base64 by default. Asking for b64_json on dall-e-3 gives us a
    // consistent payload across both.
    response_format: m === 'gpt-image-1' ? undefined : 'b64_json',
  };
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI image ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  const item = Array.isArray(data.data) && data.data[0];
  if (!item) throw new Error('OpenAI returned no image data');
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item.url) {
    // Fetch and inline the URL so the client doesn't need cross-origin
    // access to OpenAI's CDN. URLs from /v1/images/generations are
    // signed and typically expire after an hour.
    const r2 = await fetchWithDetail(item.url, { method: 'GET' });
    if (!r2.ok) throw new Error(`OpenAI image fetch ${r2.status}`);
    const buf = Buffer.from(await r2.arrayBuffer());
    const ct = r2.headers.get('content-type') || 'image/png';
    return `data:${ct};base64,${buf.toString('base64')}`;
  }
  throw new Error('OpenAI image response had neither b64_json nor url');
}
async function openaiImageTest({ apiKey }) {
  if (!apiKey) throw new Error('API key is required.');
  // Cheapest verification: hit /v1/models with the key. Avoids spending
  // image-gen credits during a connection test.
  const res = await fetchWithDetail('https://api.openai.com/v1/models', {
    method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI auth ${res.status}: ${txt.slice(0, 200)}`);
  }
  return { preview: 'API key validated', models: OPENAI_IMAGE_MODELS };
}

// ── Stability AI ──────────────────────────────────────────────────
// Hosted, paid, API-key auth. Three quality tiers under
//   /v2beta/stable-image/generate/{core,sd3,ultra}
// "Core" = SDXL-class (cheapest), "SD3" = SD3 / SD3.5 family,
// "Ultra" = highest fidelity. SD3 takes a `model` form field
// (sd3-large, sd3-medium, sd3.5-large, sd3.5-large-turbo, sd3.5-medium);
// Core/Ultra do not. We accept the model id as the "model" field in the
// generic adapter; if it starts with "sd3" we route to /sd3, else
// "ultra"/"core" picks the right endpoint.
const STABILITY_MODELS = [
  'core',
  'ultra',
  'sd3.5-large',
  'sd3.5-large-turbo',
  'sd3.5-medium',
  'sd3-large',
  'sd3-medium',
];
function stabilityEndpoint(model) {
  const m = String(model || '').toLowerCase();
  if (m === 'ultra') return 'ultra';
  if (m === 'core' || m === '') return 'core';
  // Anything starting with sd3 routes to /sd3 with the model name as a form field.
  return 'sd3';
}
function stabilityAspectRatio(width, height) {
  const w = Math.max(1, Number(width) || 1024);
  const h = Math.max(1, Number(height) || 1024);
  // Stability accepts an enum, not freeform dims. Pick the closest match
  // by ratio so the user's width/height controls map sensibly.
  const ratios = [
    [16, 9], [1, 1], [21, 9], [2, 3], [3, 2], [4, 5], [5, 4], [9, 16], [9, 21],
  ];
  const want = w / h;
  let best = '1:1', bestErr = Infinity;
  for (const [a, b] of ratios) {
    const err = Math.abs((a / b) - want);
    if (err < bestErr) { best = `${a}:${b}`; bestErr = err; }
  }
  return best;
}
async function stabilityGenerate(opts) {
  const { apiKey, model, prompt, negativePrompt, width, height, seed } = opts;
  if (!apiKey) throw new Error('Stability AI requires an API key.');
  const tier = stabilityEndpoint(model);
  const url = `https://api.stability.ai/v2beta/stable-image/generate/${tier}`;
  // multipart/form-data — Stability expects FormData even for plain
  // text fields. Use the global FormData (Node 20+) and Blob.
  const fd = new FormData();
  fd.append('prompt', prompt);
  if (negativePrompt) fd.append('negative_prompt', negativePrompt);
  fd.append('aspect_ratio', stabilityAspectRatio(width, height));
  fd.append('output_format', 'png');
  if (seed != null && seed !== -1) fd.append('seed', String(seed));
  if (tier === 'sd3') {
    // model is the SD3 variant id. Default to the cheapest one if the
    // caller picked 'sd3' generically.
    const sd3Model = String(model || '').toLowerCase().startsWith('sd3') ? model : 'sd3.5-medium';
    fd.append('model', sd3Model);
  }
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      // Accept JSON so we can parse error messages cleanly. The body
      // contains { image: "base64...", finish_reason, seed }.
      'Accept': 'application/json',
    },
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Stability ${tier} ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  if (data.errors && data.errors.length) throw new Error(`Stability: ${data.errors.join(', ')}`);
  if (!data.image) throw new Error('Stability returned no image');
  return `data:image/png;base64,${data.image}`;
}
async function stabilityTest({ apiKey }) {
  if (!apiKey) throw new Error('API key is required.');
  // Stability's /v1/user/account is the simplest auth check that
  // doesn't burn generation credits.
  const res = await fetchWithDetail('https://api.stability.ai/v1/user/account', {
    method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Stability auth ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  return {
    preview: data.email ? `Authenticated as ${data.email}` : 'API key validated',
    models: STABILITY_MODELS,
  };
}

async function swarmuiGetSession(baseUrl) {
  const url = `${normaliseBaseUrl(baseUrl)}/API/GetNewSession`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`SwarmUI session ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.session_id) throw new Error('SwarmUI did not return a session_id');
  return data.session_id;
}

// SwarmUI API: list models in the Stable-Diffusion folder. Returns
// names without the path prefix or extension — the form SwarmUI's
// generate endpoint actually expects.
async function swarmuiListModels(baseUrl, sessionId) {
  const url = `${normaliseBaseUrl(baseUrl)}/API/ListModels`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, path: '', depth: 4, subtype: 'Stable-Diffusion' }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`SwarmUI list models ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`SwarmUI: ${data.error}`);
  // Response shape: { folders: [...], files: [{ name, title, ... }, ...] }
  const files = Array.isArray(data.files) ? data.files : [];
  return files.map((f) => f.name || f.title).filter(Boolean);
}

// SwarmUI returns images either as relative paths under /Output/... or
// as raw base64. Normalise both into a data: URI so the caller doesn't
// have to care.
async function swarmuiResolveImage(baseUrl, item) {
  if (!item) throw new Error('Empty image entry from SwarmUI');
  if (typeof item === 'string') {
    if (item.startsWith('data:')) return item;
    // Treat anything else as a path on the SwarmUI server.
    const url = item.startsWith('http')
      ? item
      : `${normaliseBaseUrl(baseUrl)}${item.startsWith('/') ? '' : '/'}${item}`;
    console.log(`SwarmUI: fetching image at ${url}`);
    const res = await fetchWithDetail(url, { method: 'GET' });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Image fetch ${res.status} for ${url} — ${body.slice(0, 200)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error(`Image fetch returned 0 bytes for ${url}`);
    const ct = res.headers.get('content-type') || 'image/png';
    return `data:${ct};base64,${buf.toString('base64')}`;
  }
  if (typeof item === 'object') {
    // SwarmUI variants: { image: 'path' }, { url: 'path' }, { src: 'path' }
    const candidate = item.image || item.url || item.src || item.path;
    if (candidate) return swarmuiResolveImage(baseUrl, candidate);
  }
  throw new Error(`Unrecognised image entry shape from SwarmUI: ${JSON.stringify(item).slice(0, 200)}`);
}

async function swarmuiGenerate({ baseUrl, model, prompt, negativePrompt, width, height, steps, cfgScale, seed }) {
  const sessionId = await swarmuiGetSession(baseUrl);

  // SwarmUI requires an explicit model — there's no "use whatever's
  // loaded" mode in the API. If the caller didn't supply one, list
  // the available models and pick the first.
  let resolvedModel = model;
  if (!resolvedModel) {
    const list = await swarmuiListModels(baseUrl, sessionId);
    if (!list.length) throw new Error('SwarmUI has no Stable-Diffusion models installed');
    resolvedModel = list[0];
  }

  const url = `${normaliseBaseUrl(baseUrl)}/API/GenerateText2Image`;
  const payload = {
    session_id: sessionId,
    images: 1,
    prompt,
    negativeprompt: negativePrompt || '',
    width: width || 768,
    height: height || 768,
    steps: steps || 25,
    cfgscale: cfgScale || 6,
    seed: seed != null ? seed : -1,
    model: resolvedModel,
  };

  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`SwarmUI generate ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  // Dump the full response shape so we can see exactly what SwarmUI
  // sent — invaluable when versions diverge.
  console.log('SwarmUI generate response keys:', Object.keys(data));
  console.log('SwarmUI generate response (truncated):', JSON.stringify(data).slice(0, 800));

  if (data.error) throw new Error(`SwarmUI: ${data.error}`);
  // Try several known response shapes.
  let list = [];
  if (Array.isArray(data.images)) list = data.images;
  else if (Array.isArray(data.image)) list = data.image;
  else if (typeof data.image === 'string') list = [data.image];
  else if (Array.isArray(data.results)) list = data.results;
  else if (Array.isArray(data.outputs)) list = data.outputs;

  if (!list.length) {
    throw new Error(`SwarmUI returned no images. Response keys: ${Object.keys(data).join(',')} — body: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return swarmuiResolveImage(baseUrl, list[0]);
}

function buildImagePrompt(template, name, appearance) {
  let t = (template && template.includes('{name}'))
    ? template
    : (template ? `${template}, {name}` : SWARMUI_DEFAULT_PROMPT);
  // Substitute placeholders. If {appearance} isn't in the template
  // but we have an appearance string, append it so the user benefits
  // from extra detail without having to update their template.
  const hasAppearancePlaceholder = t.includes('{appearance}');
  t = t.replace(/\{name\}/g, name || '');
  t = t.replace(/\{appearance\}/g, appearance ? appearance.trim() : '');
  if (!hasAppearancePlaceholder && appearance && appearance.trim()) {
    t = `${t}, ${appearance.trim()}`;
  }
  // Tidy up: collapse runs of whitespace/commas left behind by empty
  // substitutions.
  return t.replace(/,\s*,/g, ',').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim().replace(/^,\s*|,\s*$/g, '');
}

// ── Provider registry ─────────────────────────────────────────────
// Each entry advertises which fields the UI should ask for + holds the
// adapter functions. The route handlers pick from this map by `provider`
// id. Every adapter returns a data: URI so callers don't have to know
// whether the source was URL or base64.
const IMAGE_PROVIDERS = {
  swarmui: {
    label: 'SwarmUI',
    needsBaseUrl: true,
    needsApiKey: false,
    supportsNegativePrompt: true,
    supportsCfg: true,
    supportsSteps: true,
    supportsCustomSize: true,
    supportsSeed: true,
    listsModels: true,
    async test({ baseUrl }) {
      if (!baseUrl) throw new Error('baseUrl is required');
      const sid = await swarmuiGetSession(baseUrl);
      let models = [];
      try { models = await swarmuiListModels(baseUrl, sid); } catch { /* non-fatal */ }
      return { preview: `Session ${sid.slice(0, 8)}…`, models };
    },
    async generate(opts) {
      if (!opts.baseUrl) throw new Error('baseUrl is required');
      return swarmuiGenerate(opts);
    },
  },
  auto1111: {
    label: 'Stable Diffusion WebUI (AUTO1111)',
    needsBaseUrl: true,
    needsApiKey: false,            // auth-less by default; key is optional
    supportsNegativePrompt: true,
    supportsCfg: true,
    supportsSteps: true,
    supportsCustomSize: true,
    supportsSeed: true,
    listsModels: true,
    async test({ baseUrl, apiKey }) {
      if (!baseUrl) throw new Error('baseUrl is required');
      let models = [];
      try { models = await auto1111ListModels(baseUrl, apiKey); } catch { /* may be empty */ }
      return { preview: `Found ${models.length} checkpoint(s)`, models };
    },
    async generate(opts) {
      if (!opts.baseUrl) throw new Error('baseUrl is required');
      return auto1111Generate(opts);
    },
  },
  openai: {
    label: 'OpenAI Images (DALL·E / gpt-image)',
    needsBaseUrl: false,
    needsApiKey: true,
    supportsNegativePrompt: false, // OpenAI Images has no negative-prompt field
    supportsCfg: false,
    supportsSteps: false,
    supportsCustomSize: true,      // limited to per-model whitelisted sizes
    supportsSeed: false,
    listsModels: true,             // we hand back a fixed list
    async test(opts) { return openaiImageTest(opts); },
    async generate(opts) { return openaiImageGenerate(opts); },
  },
  stability: {
    label: 'Stability AI',
    needsBaseUrl: false,
    needsApiKey: true,
    supportsNegativePrompt: true,
    supportsCfg: false,            // tier auto-handles guidance
    supportsSteps: false,
    supportsCustomSize: true,      // mapped to closest aspect_ratio enum
    supportsSeed: true,
    listsModels: true,
    async test(opts) { return stabilityTest(opts); },
    async generate(opts) { return stabilityGenerate(opts); },
  },
};

// GET /api/ai/image-providers — UI lookup so the frontend stays
// in sync with whatever this backend supports.
router.get('/image-providers', (req, res) => {
  const out = {};
  for (const [id, p] of Object.entries(IMAGE_PROVIDERS)) {
    out[id] = {
      label: p.label,
      needsBaseUrl: !!p.needsBaseUrl,
      needsApiKey: !!p.needsApiKey,
      supportsNegativePrompt: !!p.supportsNegativePrompt,
      supportsCfg: !!p.supportsCfg,
      supportsSteps: !!p.supportsSteps,
      supportsCustomSize: !!p.supportsCustomSize,
      supportsSeed: !!p.supportsSeed,
      listsModels: !!p.listsModels,
    };
  }
  res.json(out);
});

// POST /api/ai/test-image — verify the configured provider is reachable
// and return its model list (when supported) so the UI can offer a picker.
router.post('/test-image', async (req, res) => {
  const { provider = 'swarmui', baseUrl, apiKey } = req.body;
  const adapter = IMAGE_PROVIDERS[provider];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown image provider: ${provider}` });
  }
  if (adapter.needsBaseUrl && !baseUrl) {
    return res.status(400).json({ error: `${adapter.label} requires a Base URL.` });
  }
  if (adapter.needsApiKey && !apiKey) {
    return res.status(400).json({ error: `${adapter.label} requires an API key.` });
  }
  try {
    const out = await adapter.test({ baseUrl, apiKey });
    res.json({ ok: true, preview: out.preview, models: out.models || [] });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/ai/generate-image — generate one image via the chosen provider.
// Body: { provider, baseUrl, apiKey, model, name, appearance,
//         promptTemplate, rawPrompt, negativePrompt, allowNsfw,
//         width, height, steps, cfgScale, seed }
// Response: { image: 'data:image/...;base64,...', prompt }
router.post('/generate-image', async (req, res) => {
  const {
    provider = 'swarmui',
    baseUrl,
    apiKey,
    model,
    name,
    appearance,
    promptTemplate,
    rawPrompt,
    negativePrompt,
    allowNsfw = false,
    width, height, steps, cfgScale, seed,
  } = req.body;

  const adapter = IMAGE_PROVIDERS[provider];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown image provider: ${provider}` });
  }
  if (adapter.needsBaseUrl && !baseUrl) {
    return res.status(400).json({ error: `${adapter.label} requires a Base URL.` });
  }
  if (adapter.needsApiKey && !apiKey) {
    return res.status(400).json({ error: `${adapter.label} requires an API key.` });
  }
  if (!rawPrompt && !name) {
    return res.status(400).json({ error: 'name or rawPrompt is required' });
  }

  // rawPrompt skips template substitution entirely — used by the
  // "edit prompt before regenerating" flow. Otherwise build from the
  // saved template + creature name + appearance.
  const prompt = (rawPrompt && rawPrompt.trim())
    ? rawPrompt.trim()
    : buildImagePrompt(promptTemplate, name, appearance);

  // Negative prompt is only meaningful for providers that support one.
  // For OpenAI / providers without negative-prompt support we silently
  // drop it; the safety guarantee shifts to the upstream policy filter.
  let finalNeg = '';
  if (adapter.supportsNegativePrompt) {
    finalNeg = allowNsfw
      ? (negativePrompt || DEFAULT_NEG_NSFW)
      : `${negativePrompt ? negativePrompt + ', ' : ''}${DEFAULT_NEG_SFW}`;
  }

  try {
    const image = await adapter.generate({
      baseUrl, apiKey, model, prompt,
      negativePrompt: finalNeg,
      width, height, steps, cfgScale, seed,
    });
    res.json({ image, prompt });
  } catch (err) {
    console.error(`AI generate-image (${provider}) error:`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

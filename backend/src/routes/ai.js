const express = require('express');
const router = express.Router();

const SYSTEM_PROMPT = `You are a D&D 5e monster designer. Generate a complete, balanced D&D 5e stat block in JSON format.

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
  "languages": "string (e.g. Common, Goblin)",
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
- Save throws and skills: null if not proficient, or the total bonus (ability modifier + proficiency bonus) if proficient.
- legendary_action_count is 0 if no legendary actions.
- XP must match the standard D&D 5e CR table: CR0=0, CR1/8=25, CR1/4=50, CR1/2=100, CR1=200, CR2=450, CR3=700, CR4=1100, CR5=1800, CR6=2300, CR7=2900, CR8=3900, CR9=5000, CR10=5900, etc.
- Proficiency bonus: CR0-4=+2, CR5-8=+3, CR9-12=+4, CR13-16=+5, CR17-20=+6, CR21-24=+7, CR25-28=+8, CR29-30=+9.
- Include at least one action.
- loot: 2–5 items appropriate to the creature. chance is 0–100 (integer percent). Include coin, equipment, and thematic drops. Common items 75–100%, rare items 10–30%.`;

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

async function callOpenAICompat(baseUrl, apiKey, model, messages) {
  const url = `${normaliseBaseUrl(baseUrl)}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: model || 'local-model', messages, temperature: 0.7, stream: false }),
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

async function callOllama(baseUrl, model, messages) {
  const url = `${normaliseBaseUrl(baseUrl)}/api/chat`;
  const res = await fetchWithDetail(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'llama3', messages, stream: false }),
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

async function callLLM(provider, baseUrl, apiKey, model, messages) {
  if (provider === 'ollama') return callOllama(baseUrl, model, messages);
  return callOpenAICompat(baseUrl, apiKey, model, messages);
}

function extractJSON(text) {
  // Strip markdown code fences if the model wrapped the JSON
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response');

  return JSON.parse(cleaned.slice(start, end + 1));
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

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(promptData) },
  ];

  try {
    const content = await callLLM(provider, baseUrl, apiKey, model, messages);
    const raw = extractJSON(content);
    const creature = normaliseCreature(raw);
    res.json(creature);
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

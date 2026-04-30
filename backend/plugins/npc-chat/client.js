// NPC Chat — one-way DM-to-player speech with per-language scrambling.
//
// What it does
// ────────────
//   * DM tab: pick a language (from the host's canonical list at
//     /api/languages — same source the creature editor uses) and an
//     NPC name, type a line, hit Speak.
//   * Every player in the session receives the line via emitEvent.
//   * A player sees plaintext if their character's creature has the
//     spoken language listed in `creature.languages`; otherwise they
//     see deterministic gibberish keyed off the language's slug, so
//     two players who don't speak Draconic see matching nonsense.
//   * Per-token language knowledge IS sourced from the creature
//     itself — no separate "assign languages" step. Edit a creature's
//     Languages field in the Library and the plugin picks it up
//     automatically. (Languages are now a first-class app concept;
//     see `frontend/src/components/LanguagePicker.jsx`.)
//
// Why DOM-modal instead of dmTabs
// ───────────────────────────────
//   The plugin contract has no `playerTabs` registry — the player
//   view never gets a side-panel slot. We render a vanilla-DOM modal
//   appended to document.body for player popups; the host's React +
//   our plugin module are kept independent so a stale modal can't
//   leak past unregister().

const PLUGIN_ID = 'npc-chat';
const HISTORY_LIMIT = 30;

// ── Flavour table for the scrambler ────────────────────────────────
// Keyed by language slug — same slugs the host's /api/languages
// returns. Entries cover the SRD core; everything else (custom
// languages) falls through to `generateFlavour()` below, which derives
// a deterministic alphabet from the slug name so each custom language
// still has a recognisable cadence.
const FLAVOUR = {
  common:        { chars: 'abcdefghijklmnopqrstuvwxyz', avgWord: 5 },
  dwarvish:      { chars: 'bdgkrtvzhcdmnp',              avgWord: 6, joiner: '-' },
  elvish:        { chars: 'aeilmnorsuyãë',               avgWord: 7, joiner: "'" },
  giant:         { chars: 'aoughrtkmnj',                 avgWord: 5 },
  gnomish:       { chars: 'iaezvksrhlu',                 avgWord: 6 },
  goblin:        { chars: 'ksgrtzbhix',                  avgWord: 4 },
  halfling:      { chars: 'aeiouhlrwbnmt',               avgWord: 5 },
  orc:           { chars: 'kgthrzbmnu',                  avgWord: 5, joiner: '-' },
  abyssal:       { chars: 'kxszvqthrum',                 avgWord: 6 },
  celestial:     { chars: 'aeiouhlmsrntw',               avgWord: 7, joiner: "'" },
  draconic:      { chars: 'sshrxkthazvi',                avgWord: 6, joiner: '-' },
  'deep-speech': { chars: "qzxk'h…rnv",                  avgWord: 5, joiner: '·' },
  infernal:      { chars: 'kzthrxvqsbm',                 avgWord: 6 },
  primordial:    { chars: 'aelourwhsv',                  avgWord: 6 },
  sylvan:        { chars: 'aeilmnorsywp',                avgWord: 7, joiner: "'" },
  undercommon:   { chars: 'kszthrxqvm',                  avgWord: 5 },
  druidic:       { chars: 'oacisthlmrne',                avgWord: 6, joiner: '-' },
  'thieves-cant':{ chars: 'gestkmnrhloi',                avgWord: 4 },
};

// ── Module-level state ─────────────────────────────────────────────
let canonicalLanguages = [];      // [{ slug, name, category, ... }] from /api/languages
let creatureCache = new Map();    // creatureId → creature row (lazy populated)
let history   = [];               // [{ id, speaker, langSlug, text, ts }]
let lastCtx   = null;             // captured from mapDecorations
let modalQueue = [];              // [{ id, speaker, langSlug, text, ts, target }]
let modalContainer = null;
let tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// ── Helpers ────────────────────────────────────────────────────────

// mulberry32 PRNG seeded with a stable hash of (text + slug) — same
// gibberish every time so cross-checking players see matching nonsense.
function hashSeed(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a deterministic flavour for an unknown / custom slug. Uses the
// slug's own characters to seed the alphabet, so two custom languages
// with names like "githyanki" and "ignan" get visually distinct
// cadences instead of all collapsing to the same generic alphabet.
function generateFlavour(slug) {
  const baseLetters = 'aeiouybcdfghjklmnprstvwxz';
  const rng = mulberry32(hashSeed(slug || 'custom'));
  const len = 10 + Math.floor(rng() * 6);
  let chars = '';
  for (let i = 0; i < len; i++) chars += baseLetters[Math.floor(rng() * baseLetters.length)];
  const avgWord = 4 + Math.floor(rng() * 5);
  const joiner = rng() < 0.3 ? "'" : (rng() < 0.5 ? '-' : '');
  return { chars, avgWord, joiner };
}

function flavourFor(slug) {
  return FLAVOUR[slug] || generateFlavour(slug);
}

function scramble(text, slug) {
  const flav = flavourFor(slug);
  const rng = mulberry32(hashSeed(`${slug}::${text}`));
  const chars = flav.chars;
  const joiner = flav.joiner || '';
  const desiredAvg = flav.avgWord || 5;
  return text.replace(/\b[\w']+\b/g, (word) => {
    const wordLen = Math.max(2, Math.round(word.length * (0.85 + rng() * 0.4)));
    let out = '';
    for (let i = 0; i < wordLen; i++) {
      if (joiner && i > 1 && i < wordLen - 1 && rng() < 1 / desiredAvg) {
        out += joiner;
      } else {
        out += chars[Math.floor(rng() * chars.length)];
      }
    }
    if (/^[A-Z]/.test(word)) out = out[0].toUpperCase() + out.slice(1);
    return out;
  });
}

// Lookup helpers for the canonical list. Slug ↔ name maps so the
// dropdown can render names while events carry slugs (stable across
// renames).
function languageBySlug(slug) {
  return canonicalLanguages.find((l) => l.slug === slug) || null;
}
function nameForSlug(slug) {
  const row = languageBySlug(slug);
  return row ? row.name : slug;
}
function slugForName(name) {
  const lc = String(name || '').trim().toLowerCase();
  if (!lc) return '';
  // Direct slug match (callers occasionally pass slugs).
  const bySlug = canonicalLanguages.find((l) => l.slug.toLowerCase() === lc);
  if (bySlug) return bySlug.slug;
  // Then by display name.
  const byName = canonicalLanguages.find((l) => l.name.toLowerCase() === lc);
  if (byName) return byName.slug;
  // Fallback: kebab-case the input so unknown languages still produce
  // a stable slug for scramble seeding.
  return lc.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Pull the creature attached to a token and cache it. Used to derive
// "what languages does this character know" without keeping a parallel
// per-token KV. We intentionally do NOT subscribe to creature edits
// here — re-opening the chat tab or re-rendering the modal will
// re-fetch fresh, which is plenty for this UX.
async function getCreatureFor(token) {
  if (!token || !token.creature_id) return null;
  if (creatureCache.has(token.creature_id)) return creatureCache.get(token.creature_id);
  try {
    const res = await fetch(`/api/creatures/${token.creature_id}`);
    if (!res.ok) return null;
    const row = await res.json();
    creatureCache.set(token.creature_id, row);
    return row;
  } catch { return null; }
}

// Parse "Common, Goblin (understands but cannot speak), Custom Tongue"
// into [{ name: 'Common', slug: 'common', tail: '' }, ...]. Slug
// lookup falls back to a canonicalised name for unknown entries.
function parseLanguagesString(raw) {
  return String(raw || '')
    .split(/\s*,\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([^()]+?)(\s*\(.+\))?$/);
      const name = (m ? m[1] : part).trim();
      return { name, slug: slugForName(name), tail: (m && m[2]) ? m[2] : '' };
    });
}

async function tokenKnowsLanguage(token, langSlug) {
  if (!token) return false;
  const creature = await getCreatureFor(token);
  if (!creature) return false;
  const known = parseLanguagesString(creature.languages);
  return known.some((k) => k.slug === langSlug);
}

// ── Modal renderer (player view) ───────────────────────────────────

function ensureModalRoot() {
  if (modalContainer && document.body.contains(modalContainer)) return modalContainer;
  modalContainer = document.createElement('div');
  modalContainer.id = 'plugin-npc-chat-modal-root';
  Object.assign(modalContainer.style, {
    position: 'fixed', inset: '0', zIndex: '99999',
    pointerEvents: 'none',
  });
  document.body.appendChild(modalContainer);
  return modalContainer;
}

async function paintModal() {
  if (!modalContainer) return;
  modalContainer.innerHTML = '';
  if (modalQueue.length === 0) return;

  const top = modalQueue[0];
  const myTokenId = lastCtx?.playerTokenId;
  const myToken = (lastCtx?.tokens || []).find((t) => t.id === myTokenId) || null;
  const understands = myToken ? await tokenKnowsLanguage(myToken, top.langSlug) : false;
  const langName = nameForSlug(top.langSlug);

  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'absolute', inset: '0',
    background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { modalQueue.shift(); paintModal(); }
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    maxWidth: '560px', width: '100%',
    background: '#16213e', color: '#f4e4bc',
    border: '1px solid #c9a84c',
    borderRadius: '12px', padding: '20px 22px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    fontFamily: '"Crimson Pro", Georgia, serif',
  });

  const speakerEl = document.createElement('div');
  speakerEl.textContent = top.speaker;
  Object.assign(speakerEl.style, {
    fontWeight: '600', color: '#c9a84c',
    fontSize: '1.05rem', marginBottom: '4px',
  });

  const langEl = document.createElement('div');
  // Hide the language name when the player doesn't understand it —
  // a player shouldn't be able to deduce "ah, it must be Draconic"
  // just from the modal header. They only learn the language ID when
  // their character would actually recognise it.
  langEl.textContent = understands
    ? `Speaking ${langName}`
    : 'Speaks in a tongue you do not know';
  Object.assign(langEl.style, {
    fontSize: '0.7rem', textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: understands ? '#9eb7d6' : '#c97a7a',
    marginBottom: '12px',
  });

  const textEl = document.createElement('div');
  textEl.textContent = understands ? top.text : scramble(top.text, top.langSlug);
  Object.assign(textEl.style, {
    fontSize: '1.15rem', lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    fontStyle: understands ? 'normal' : 'italic',
    opacity: understands ? '1' : '0.85',
  });

  const dismissEl = document.createElement('button');
  dismissEl.textContent = modalQueue.length > 1
    ? `Continue (${modalQueue.length - 1} more)`
    : 'Dismiss';
  Object.assign(dismissEl.style, {
    marginTop: '16px', width: '100%',
    background: '#c9a84c', color: '#1a1a2e',
    border: 'none', borderRadius: '8px',
    padding: '8px 12px', cursor: 'pointer',
    fontWeight: '600', fontSize: '0.9rem',
  });
  dismissEl.addEventListener('click', () => { modalQueue.shift(); paintModal(); });

  card.appendChild(speakerEl);
  card.appendChild(langEl);
  card.appendChild(textEl);
  card.appendChild(dismissEl);
  backdrop.appendChild(card);
  modalContainer.appendChild(backdrop);
}

// ── Plugin entry ───────────────────────────────────────────────────

export default {
  register({ React, ReactKonva, registries, context }) {
    const { role, subscribe, emitEvent } = context;

    // Pull the canonical language list. Failure isn't fatal — the
    // dropdown will just be empty and the DM can retry via the refresh
    // button on the tab.
    fetch('/api/languages')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { canonicalLanguages = Array.isArray(rows) ? rows : []; pingTab(); })
      .catch((err) => console.warn('npc-chat: /api/languages fetch failed', err));

    // Capture map ctx for player popup + DM token list.
    registries.mapDecorations.set(PLUGIN_ID, (ctx) => {
      lastCtx = ctx;
      return React.createElement(ReactKonva.Group, { listening: false });
    });

    subscribe(({ type, payload }) => {
      if (type !== 'say' || !payload || !payload.text) return;
      const entry = {
        id: payload.msgId || `${performance.now()}-${Math.random()}`,
        speaker: payload.speaker || 'NPC',
        langSlug: payload.langSlug || slugForName(payload.langName || 'common') || 'common',
        text: payload.text,
        ts: payload.ts || Date.now(),
        target: payload.target ?? null,
      };
      if (role === 'dm') {
        history = [entry, ...history].slice(0, HISTORY_LIMIT);
        pingTab();
      }
      if (role === 'player') {
        const myTokenId = lastCtx?.playerTokenId;
        if (entry.target != null && String(entry.target) !== String(myTokenId)) return;
        modalQueue.push(entry);
        ensureModalRoot();
        paintModal();
      }
    });

    if (role !== 'dm') return;

    function ChatTab() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      const [speaker,  setSpeaker]  = React.useState('NPC');
      const [langSlug, setLangSlug] = React.useState('common');
      const [text,     setText]     = React.useState('');
      const [target,   setTarget]   = React.useState('');     // tokenId or '' for everyone
      const [knownByToken, setKnownByToken] = React.useState({});  // tokenId → string[] of slugs

      const playerTokens = (lastCtx?.tokens || []).filter((t) => t.is_player && !t.is_hidden);

      // Lazily resolve each player's known languages so the "Player
      // languages" panel shows the truth from the creature record.
      // We do this with a one-shot effect per token id list change —
      // not on every render — so the Library API isn't pounded.
      React.useEffect(() => {
        let cancelled = false;
        async function load() {
          const out = {};
          for (const t of playerTokens) {
            const c = await getCreatureFor(t);
            const langs = parseLanguagesString(c?.languages || '');
            out[t.id] = langs.map((l) => l.slug);
          }
          if (!cancelled) setKnownByToken(out);
        }
        load();
        return () => { cancelled = true; };
      }, [playerTokens.map((t) => `${t.id}:${t.creature_id}`).join('|')]);

      function speak() {
        const trimmed = text.trim();
        if (!trimmed) return;
        emitEvent('say', {
          msgId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          speaker: speaker.trim() || 'NPC',
          langSlug,
          text: trimmed,
          ts: Date.now(),
          target: target ? Number(target) : null,
        });
        setText('');
      }

      function clearHistory() {
        if (!confirm('Clear NPC chat history?')) return;
        history = [];
        pingTab();
      }

      // Group canonical languages by category for the dropdown so
      // standard / exotic / rare / custom render in clear sections.
      const grouped = (() => {
        const out = { standard: [], exotic: [], rare: [], custom: [] };
        for (const row of canonicalLanguages) {
          const cat = (row.category && out[row.category]) ? row.category : 'custom';
          out[cat].push(row);
        }
        return out;
      })();
      const categoryOrder = ['standard', 'exotic', 'rare', 'custom'];
      const categoryLabel = { standard: 'Standard', exotic: 'Exotic', rare: 'Rare', custom: 'Custom' };

      const targetToken = playerTokens.find((t) => String(t.id) === target);

      return React.createElement('div',
        { className: 'p-4 space-y-3' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'NPC Chat'),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug' },
          'Pick a language and an NPC name, type a line, hit Speak. Players whose character knows that language see plain text; everyone else gets gibberish. Manage the language list in the creature editor (Library tab) — anything you add there shows up here automatically.'),

        // ── Compose ──
        React.createElement('div',
          { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'Compose'),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('input', {
              type: 'text', value: speaker,
              onChange: (e) => setSpeaker(e.target.value),
              placeholder: 'Speaker name',
              className: 'bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
            }),
            React.createElement('select', {
              value: langSlug,
              onChange: (e) => setLangSlug(e.target.value),
              className: 'bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
            },
              canonicalLanguages.length === 0
                ? React.createElement('option', { value: 'common' }, 'Common (loading…)')
                : categoryOrder.flatMap((cat) => {
                    if (!grouped[cat] || grouped[cat].length === 0) return [];
                    return [
                      React.createElement('optgroup',
                        { key: cat, label: categoryLabel[cat] },
                        grouped[cat].map((row) =>
                          React.createElement('option', { key: row.slug, value: row.slug }, row.name)
                        )),
                    ];
                  })
            )
          ),
          React.createElement('select', {
            value: target,
            onChange: (e) => setTarget(e.target.value),
            className: 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
          },
            React.createElement('option', { value: '' }, '→ Everyone in session'),
            playerTokens.map((t) =>
              React.createElement('option', { key: t.id, value: String(t.id) }, `→ Just ${t.nickname || t.name}`))
          ),
          React.createElement('textarea', {
            value: text,
            onChange: (e) => setText(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) speak(); },
            placeholder: 'What does the NPC say? (Ctrl/Cmd-Enter to send)',
            rows: 3,
            className: 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white resize-none',
          }),
          React.createElement('button', {
            onClick: speak,
            disabled: !text.trim(),
            className: 'w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-1.5 rounded font-semibold text-sm disabled:opacity-50',
          }, target
            ? `Speak ${nameForSlug(langSlug)} → ${targetToken?.nickname || targetToken?.name || 'player'}`
            : `Speak ${nameForSlug(langSlug)} → everyone`)
        ),

        // ── Player languages (read-only summary) ──
        React.createElement('div',
          { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'Player languages'),
          React.createElement('p', { className: 'text-[11px] text-gray-500 leading-snug -mt-1' },
            'Pulled from each character\'s Languages field in the Library. Edit there to change.'),
          playerTokens.length === 0
            ? React.createElement('div', { className: 'text-xs text-gray-500 italic' },
                'Drop a player token onto the map first.')
            : playerTokens.map((t) => {
                const slugs = knownByToken[t.id] || [];
                const understands = slugs.includes(langSlug);
                return React.createElement('div',
                  { key: t.id, className: 'bg-gray-900 border border-gray-700 rounded px-2 py-1.5' },
                  React.createElement('div', { className: 'flex items-center justify-between gap-2' },
                    React.createElement('span', { className: 'text-xs text-white font-semibold truncate' },
                      t.nickname || t.name),
                    React.createElement('span', {
                      className: `text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        understands
                          ? 'bg-emerald-900/50 border border-emerald-700/40 text-emerald-200'
                          : 'bg-red-900/40 border border-red-700/30 text-red-200'
                      }`,
                    }, understands
                        ? `understands ${nameForSlug(langSlug)}`
                        : `would not understand ${nameForSlug(langSlug)}`)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-gray-400 mt-0.5 truncate' },
                    slugs.length === 0 ? 'No languages on character record' :
                      slugs.map(nameForSlug).join(', '))
                );
              })
        ),

        // ── Transcript ──
        history.length > 0 && React.createElement('div',
          { className: 'space-y-1.5 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('span', { className: 'text-[11px] uppercase tracking-wider text-gray-500' },
              `Transcript (${history.length})`),
            React.createElement('button', {
              onClick: clearHistory,
              className: 'text-[10px] text-gray-500 hover:text-red-300',
            }, 'Clear')),
          history.map((h) => React.createElement('div',
            { key: h.id, className: 'border-l-2 border-dnd-gold pl-2' },
            React.createElement('div', { className: 'text-[10px] text-gray-500' },
              `${h.speaker} · ${nameForSlug(h.langSlug)}` +
              (h.target
                ? ` · → ${(playerTokens.find((t) => t.id === h.target)?.nickname || playerTokens.find((t) => t.id === h.target)?.name) || `token ${h.target}`}`
                : ' · everyone')
            ),
            React.createElement('div', { className: 'text-xs text-white' }, h.text))))
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '💬 NPC Chat',
      render: () => React.createElement(ChatTab, null),
    });

    // ── Top-bar flyout button ────────────────────────────────────────
    // Lets the DM open NPC Chat from anywhere without losing the
    // currently-open tab. Same content as the dmTab, just rendered
    // inside a flyout positioned next to the existing Dice button.
    function NPCChatTopBarButton() {
      const [open, setOpen] = React.useState(false);
      const ref = React.useRef(null);
      React.useEffect(() => {
        if (!open) return;
        function onDown(e) {
          if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
      }, [open]);
      return React.createElement(React.Fragment, null,
        React.createElement('button', {
          onClick: () => setOpen((o) => !o),
          className: open
            ? 'bg-dnd-gold text-gray-900 px-3 py-1.5 rounded-lg text-sm border border-yellow-400 transition-colors'
            : 'bg-dnd-panel/90 text-white px-3 py-1.5 rounded-lg text-sm border border-gray-600 hover:border-yellow-400 transition-colors',
          title: 'NPC Chat',
        }, '💬 NPC Chat'),
        open && React.createElement('div', {
          ref: ref,
          className: 'absolute top-14 right-4 z-40 bg-dnd-panel border border-gray-600 rounded-xl w-96 max-h-[80vh] overflow-y-auto shadow-2xl',
        }, React.createElement(ChatTab, null))
      );
    }
    registries.dmTopBarButtons.set(PLUGIN_ID, {
      render: () => React.createElement(NPCChatTopBarButton, null),
    });
  },

  unregister() {
    if (modalContainer && modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
    }
    modalContainer = null;
    modalQueue = [];
    history = [];
    creatureCache = new Map();
    canonicalLanguages = [];
    lastCtx = null;
  },
};

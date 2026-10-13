import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import { loadPlugins } from '../plugins/pluginRegistry.js';
import CreatureForm from './CreatureForm.jsx';
import ReferenceSearch from './ReferenceSearch.jsx';
import MiniGameHost from './MiniGames.jsx';
import ShopView from './ShopView.jsx';
import { CustomClassesProvider } from '../plugins/customClassesProvider.js';
import StatBlock, { SpellBox } from './StatBlock.jsx';
import { spellType } from '../utils/spellTypes.js';
import ActionsReference from './ActionsReference.jsx';
import { formatSizeType } from '../utils/creature.js';
import { resourcesForCreature } from '../data/resources.js';
import { TRICK_SHOTS } from '../data/class_options_extra.js';
import { rollWildMagic } from '../data/wildmagic.js';
import { computeHitDicePool } from '../utils/classes.js';
import { classEntry, subclassEntry } from '../data/subclasses.js';
import { spellSlotsForCreature, pactMagicForCreature, spellcastingAbilityFor } from '../data/classes.js';
import { availableLightPresets } from '../utils/lightPresets.js';
import { computeAcFromGear, wornArmorBlocked, naturalArmorOf } from '../utils/armorClass.js';
import { attachSessionKeepalive } from '../utils/sessionSocket.js';
import {
  formatDamageWithMod, formatDamageType, weaponDamageModes, weaponDamageRiders,
  damageParts, bestWeaponStat, weaponDamageMod,
} from '../utils/damage.js';
import { masteryText } from '../data/weapons.js';
import { skillRows, saveRows, signedMod, passiveScore } from '../utils/skills.js';
import { itemGrantedSpells, spellsOnItem } from '../utils/itemSpells.js';

// The player's phone: their character, their controls, and their companions.
//
// The counterpart to the GM's /blocks. A player at the table is holding a phone
// already, and the things they reach for most — how many hit points am I on, am
// I still concentrating, what does my familiar have — all live behind buttons on
// the map view, on whatever screen the map happens to be on.
//
// So this is those things without the map. It is not a second map view and
// deliberately cannot move anything: there is no board here to move it on.
//
// ── Why it joins as a spectator ────────────────────────────────────────────
//
// Not as a player, though it carries the player's name. Joining as a player
// would take a second lobby seat, and the GM's roster would show everyone
// twice. Spectator takes no seat and needs no password.
//
// The controls still work, because the server grants a token to whoever carries
// its `player_name` — ownership is by name, not by role. That is the existing
// rule for every player device; this is simply another one.

// The dice a damage string actually asks for.
//
// Real sheets carry "1d8", "2d6", "1d8+3", "1d6 + 3" — and "1d4 + STR or DEX",
// where the tail is a NOTE telling the reader to add their ability modifier, not
// a number to add twice. So the flat bonus is only taken when the string ends in
// digits, and the dice are read from the front. A string with no dice at all
// (the library has a plain "1") yields null and simply gets no roll button,
// rather than a d1.
// One damage entry's dice and type, whichever spelling it uses.
//
// Spell entries on a character sheet come in two shapes depending on how they
// were imported: {damage, damage_type} for most, {dice, type} for some. Reading
// only the first spelling is why Hunger of Hadar offered no damage button while
// plainly dealing 2d6 — its entries were the other shape. Weapons only ever use
// the first, but reading both costs nothing and stops the next import doing
// this again.
// Dice mentioned in a spell's own words.
//
// Not every spell records its dice as a damage entry. Divine Smite's 2d8, Witch
// Bolt's 1d12 and Cure Wounds' healing live only in the prose, so a sheet built
// from that text has nothing structured to offer — and the player is left doing
// the one thing this screen exists to save them.
//
// So these are read from the text, and presented as exactly that: dice found in
// the description, with the words that followed them as a hint. Deliberately NOT
// called damage — "1d4" in Bless is a bonus to a roll, not damage, and claiming
// otherwise would be worse than saying nothing.
function diceInText(text) {
  const str = String(text || '');
  const out = [];
  const re = /(\d+)\s*d\s*(\d+)(?:\s*\+\s*(\d+))?/gi;
  let m;
  while ((m = re.exec(str)) !== null) {
    const count = Number(m[1]);
    const sides = Number(m[2]);
    if (!count || !sides || sides < 2 || count > 40) continue;
    const flat = m[3] ? Number(m[3]) : 0;
    // The couple of words after the dice, which is usually the damage type or
    // "healing" — enough to tell two entries apart.
    const after = str.slice(m.index + m[0].length, m.index + m[0].length + 48);
    const hint = ((after.match(/^\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/) || [])[1] || '').trim().toLowerCase();
    const key = `${count}d${sides}+${flat}|${hint}`;
    if (!out.some((x) => x.key === key)) out.push({ key, count, sides, flat, hint });
    if (out.length >= 6) break;
  }
  return out;
}

const entryDice = (e) => (e && (e.damage ?? e.dice)) || '';
const entryType = (e) => (e && (e.damage_type ?? e.type)) || '';

function parseDamageDice(damage) {
  const str = String(damage == null ? '' : damage);
  const dice = str.match(/^\s*(\d*)\s*d\s*(\d+)/i);
  if (!dice) return null;
  const count = Math.max(1, Number(dice[1] || 1));
  const sides = Number(dice[2]);
  if (!Number.isFinite(sides) || sides < 2) return null;
  const tail = str.match(/([+-])\s*(\d+)\s*$/);
  const flat = tail ? (tail[1] === '-' ? -1 : 1) * Number(tail[2]) : 0;
  return { count, sides, flat };
}

// Items that resolve into "a random spell of that level" earn a roller in their
// modal — the Wand of Wonderful Miscast turns a failed 3rd-level spell into some
// other 3rd-level spell, and somebody has to decide which one.
//
// Matched on the item's own words rather than a hard-coded name, so a GM who
// writes their own wild-magic item gets the button simply by saying what it does.
//
// Both ideas have to appear in the SAME sentence: randomness, and the level
// being preserved. A looser test caught the Hat of Many Spells, which rolls a
// random spell from a fixed list of ten — offering "any spell of this level"
// there would be the wrong tool, confidently presented.
function rollsARandomSpell(it) {
  if (!it) return false;
  const text = `${it.properties || ''}. ${it.desc || it.description || ''}`;
  return text.split(/(?<=[.!?])\s+|\n+/).some((sentence) =>
    /\brandom(?:ly)?\b/i.test(sentence) && /\bsame\s+level\b/i.test(sentence));
}

const SELF_CONDITIONS = ['invisible', 'prone', 'grappled', 'restrained', 'poisoned', 'unconscious'];

// Shown under the counter so the number means something without looking it up.
const EXHAUSTION_EFFECT = {
  1: 'Disadvantage on ability checks.',
  2: 'Speed halved.',
  3: 'Disadvantage on attack rolls and saving throws.',
  4: 'Hit point maximum halved.',
  5: 'Speed reduced to 0.',
  6: 'Death.',
};

// The answer to a d20 button, shown next to the button that asked.
//
// One component for every attack roll on this screen — the weapon cards and the
// spell modal both had their own copy, and a copy is how the two come to disagree
// about what a 20 means.
//
// `kept` is the die that counted after advantage or disadvantage; it is absent on
// an ordinary roll, where the single die is the one that counted. Crit and miss
// are read off THAT die, never off the first one thrown, because with advantage
// the first die is frequently the one being discarded.
function D20Result({ r }) {
  if (!r) return null;
  if (r.pending) return <span className="shrink-0 text-[11px] text-gray-500">rolling…</span>;
  const die = r.kept ?? r.rolls?.[0];
  const tone = die === 20 ? 'text-amber-300' : die === 1 ? 'text-red-400' : 'text-gray-100';
  return (
    <span className="shrink-0 text-right leading-tight">
      <span className={`block text-2xl font-bold ${tone}`}>{r.total}</span>
      <span className="block text-[10px] text-gray-500">
        d20 {die}
        {r.mode === 'advantage' ? ' adv' : r.mode === 'disadvantage' ? ' dis' : ''}
        {r.dropped != null ? ` (dropped ${r.dropped})` : ''}
        {die === 20 ? ' · crit!' : die === 1 ? ' · miss' : ''}
      </span>
    </span>
  );
}

// Advantage and disadvantage, under the button they modify. Their own row, so
// they are big enough to hit with a thumb and impossible to press by accident
// when reaching for the plain roll.
function AdvPair({ onRoll, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <button type="button" disabled={disabled} onClick={() => onRoll('advantage')}
        className="h-9 rounded-lg bg-emerald-950/40 border border-emerald-800/70 active:bg-emerald-900/50 text-[11px] text-emerald-200 font-semibold">
        Advantage
      </button>
      <button type="button" disabled={disabled} onClick={() => onRoll('disadvantage')}
        className="h-9 rounded-lg bg-rose-950/40 border border-rose-900/70 active:bg-rose-900/50 text-[11px] text-rose-200 font-semibold">
        Disadvantage
      </button>
    </div>
  );
}

function Gate({ onSubmit }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-gray-900 text-gray-100 flex items-center justify-center p-5">
      <form
        onSubmit={(e) => { e.preventDefault(); if (code.trim() && name.trim()) onSubmit(code.trim().toUpperCase(), name.trim()); }}
        className="w-full max-w-sm space-y-4"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dnd-gold">My Character</h1>
          <p className="text-sm text-gray-400 mt-1">Your sheet and controls, without the map.</p>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Session code</label>
          <input
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            maxLength={12} required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-lg text-white uppercase tracking-widest font-mono focus:outline-none focus:border-dnd-gold"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Your player name</label>
          <p className="text-[11px] text-gray-500 mb-1">Exactly as you joined the game — that is how your character is found.</p>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            autoCapitalize="words" autoCorrect="off" required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-lg text-white focus:outline-none focus:border-dnd-gold"
          />
        </div>
        <button type="submit" className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-xl font-semibold text-lg">
          Open my sheet
        </button>
      </form>
    </div>
  );
}

// A big stepper. On a phone the common actions are "took 7" and "healed 4", and
// both want to be one thumb away rather than a keyboard.
function Stepper({ label, value, onChange, min = 0, max = 999, tone = 'gray' }) {
  const step = (d) => onChange(Math.max(min, Math.min(max, (Number(value) || 0) + d)));
  const ring = tone === 'red' ? 'border-red-800' : tone === 'blue' ? 'border-sky-800' : 'border-gray-700';
  return (
    <div className={`rounded-2xl border ${ring} bg-gray-900/60 p-3`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => step(-5)} className="w-12 h-12 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">−5</button>
        <button type="button" onClick={() => step(-1)} className="w-12 h-12 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">−1</button>
        <input
          type="number" value={value ?? ''} inputMode="numeric"
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(min, Math.min(max, Number(e.target.value))))}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-xl px-2 py-3 text-2xl text-center text-white"
        />
        <button type="button" onClick={() => step(1)} className="w-12 h-12 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">+1</button>
        <button type="button" onClick={() => step(5)} className="w-12 h-12 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">+5</button>
      </div>
    </div>
  );
}

export default function PlayerSheetView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get('code') || '';
  const name = params.get('name') || '';
  // The GM looking over a player's shoulder from /blocks.
  //
  // Fully interactive: a GM previewing a phone is usually there to HELP —
  // spending a hit die for a player who cannot find the button, clearing a
  // condition, marking a death save. Making it read-only meant walking the
  // player through it verbally instead, which is slower than doing it.
  //
  // So the flag only changes what the banner says. It is deliberately loud,
  // because the one real hazard is a GM forgetting whose sheet this is: every
  // tap here changes a real character, immediately, on that player's device.
  const previewing = params.get('preview') === '1';

  const [connected, setConnected] = useState(false);
  // A one-line "the table didn't hear that" notice, cleared on its own.
  const [linkNote, setLinkNote] = useState('');
  const [error, setError] = useState('');
  // Private lines from the GM. Kept newest-first and capped — this is a phone,
  // and a session's worth of scrollback is not what anybody wants on it.
  // The full editor, shown over the sheet rather than on another route: the
  // socket stays up, so HP the GM changes while you are editing still lands,
  // and Done puts you back where you were instead of on a blank page.
  //   null            — closed
  //   { mode:'edit' } — editing the character this sheet is bound to
  //   { mode:'new' }  — building one from scratch
  const [editing, setEditing] = useState(null);
  // Characters this player already owns, for the pick list. Loaded only when
  // there is nothing bound yet.
  const [myChars, setMyChars] = useState(null);   // null = not loaded yet
  const [whispers, setWhispers] = useState([]);
  const [myTokenId, setMyTokenId] = useState(null);
  const [token, setToken] = useState(null);          // live HP, conditions, flying
  const [creature, setCreature] = useState(null);    // the sheet
  // Read inside socket handlers, which are bound once per join — a ref rather
  // than the state so they always see the character currently loaded.
  const creatureIdRef = useRef(null);
  const [companions, setCompanions] = useState([]);  // tokens attached to me
  const [compCreatures, setCompCreatures] = useState({});
  // Companions BOUND to the character, on the map or not. The wizard has the owl
  // between fights; a token is only what happens when it is called for.
  const [bound, setBound] = useState([]);
  const [summoning, setSummoning] = useState(null);   // row id, while it lands
  // A shop the GM has put on the table. Pushed, not navigated to: the party is
  // standing in the shop, so it arrives on whatever screen they are holding.
  const [shop, setShop] = useState(null);
  const [shopOffer, setShopOffer] = useState(null);
  useEffect(() => { creatureIdRef.current = creature?.id ?? null; }, [creature?.id]);

  const [tab, setTab] = useState('me');
  const [showActions, setShowActions] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  // A challenge the GM has sent to this phone, waiting to be played.
  const [challenge, setChallenge] = useState(null);
  const [showBlock, setShowBlock] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  // Which check — a skill or a saving throw — is waiting on an answer to
  // "how are you rolling this?".
  const [askingSkill, setAskingSkill] = useState(null);
  const [openComp, setOpenComp] = useState(null);
  const [openForm, setOpenForm] = useState(null);
  const [viewSpell, setViewSpell] = useState(null);
  // The spell behind the item currently open, looked up from the library.
  // { status: 'loading' | 'ok' | 'missing', name, spell }
  const [itemSpell, setItemSpell] = useState(null);
  // Full library rows for the spells the character's GEAR grants, keyed by
  // lowercase name. Without these a granted spell opens as a blank card.
  const [grantedSpellRows, setGrantedSpellRows] = useState({});
  const [viewItem, setViewItem] = useState(null);   // index into inventory
  const [dropping, setDropping] = useState(null);   // { index } while confirming a drop
  // The random-spell roller in the item modal: which level was being cast, and
  // what the wand decided instead.
  const [wandLevel, setWandLevel] = useState(3);
  const [wandSpell, setWandSpell] = useState(null);
  const [wandBusy, setWandBusy] = useState(false);
  const [wandError, setWandError] = useState('');
  const [acNote, setAcNote] = useState('');
  const [showLight, setShowLight] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [showTricks, setShowTricks] = useState(false);
  const [showConds, setShowConds] = useState(false);
  const [showElev, setShowElev] = useState(false);
  const [shifting, setShifting] = useState(false);   // true while the vines play
  // Loose dice: how many, what to add, and how it is thrown. Held here rather
  // than inside the card so the choice survives a re-render when a roll lands.
  const [dieCount, setDieCount] = useState(1);
  const [dieMod, setDieMod] = useState(0);
  const [dieMode, setDieMode] = useState(null);
  // The last to-hit rolled for each weapon, so the answer appears on the weapon
  // you pressed rather than only in the dice log.
  // Every roll this screen asked for, by the button that asked.
  //
  // Matched on the exact LABEL sent, held in a ref from the moment of asking.
  // The first version matched by comparing the label to the start of the key,
  // which worked for weapons ("+1 Flail|0" vs "+1 Flail — ...") and silently
  // failed for spells, whose keys start with "spell|" — so a spell's damage and
  // attack totals never appeared on the button and had to be read in the main
  // app. Exact lookup cannot drift like that.
  const [rolls, setRolls] = useState({});       // { [buttonKey]: entry | {pending} }
  const awaiting = useRef(new Map());           // label -> buttonKey

  // Anything this screen sends to the table goes through here.
  //
  // A socket that is down swallows emits without a word, which is how a player
  // ends up tapping a d20 and watching nothing happen for the rest of the
  // evening. Saying so — and kicking the reconnect while we are at it — turns a
  // silent failure into one the player can act on.
  function sendToTable(event, payload) {
    if (!socket.connected) {
      setConnected(false);
      setLinkNote('Not connected to the table. Reconnecting — try that again in a moment.');
      socket.connect();
      return false;
    }
    socket.emit(event, payload);
    return true;
  }

  function ask(key, payload) {
    if (!sendToTable('roll_dice', payload)) return;
    awaiting.current.set(payload.label, key);
    setRolls((p) => ({ ...p, [key]: { pending: true, at: Date.now() } }));
  }
  const [diceRolls, setDiceRolls] = useState([]);
  const rollId = useRef(0);
  // Which light this character is carrying. Local: the token stores the radius,
  // not which lamp it came from, so the choice is remembered here and the token
  // is told the numbers.
  const [light, setLight] = useState(0);
  const [wild, setWild] = useState(null);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [ownMapId, setOwnMapId] = useState(null);
  // Who else is on the board with me, for handing something over. Taken from
  // the token list rather than from the map, because there is no map here —
  // which is also the only way to pick a target on a screen like this.
  const [roster, setRoster] = useState([]);
  const [forms, setForms] = useState([]);          // wild shape sheets
  const [giving, setGiving] = useState(null);      // { index } while choosing
  const [giveQty, setGiveQty] = useState(1);
  const [giveBusy, setGiveBusy] = useState(false);
  const [giveNote, setGiveNote] = useState('');
  const tokenIdRef = useRef(null);
  const tokenCreatureRef = useRef(null);
  // Read inside socket handlers, which are registered once — a dependency on the
  // roster itself would tear down and rebuild every listener on each new token.
  const rosterRef = useRef([]);
  useEffect(() => { tokenIdRef.current = myTokenId; }, [myTokenId]);

  // What this player already owns, so the setup card can offer a pick rather
  // than forcing a rebuild every session. Only fetched when there is nothing
  // bound — a player with a character never pays for this.
  useEffect(() => {
    // Keyed on the missing SHEET, not the missing token. A player standing on
    // a token whose creature_id never landed needs this list most of all —
    // that is the state that used to offer nothing but "build another one".
    if (creature || !connected || !name.trim() || myChars !== null) return undefined;
    let gone = false;
    fetch(`/api/creatures?filter=characters&player_owner=${encodeURIComponent(name.trim())}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (!gone) setMyChars(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!gone) setMyChars([]); });
    return () => { gone = true; };
  }, [creature, connected, name, myChars]);

  // Tell the table which character this is. The GM's lobby roster is how they
  // learn what to spawn, and a phone-only player has no other way to say it.
  const announceCharacter = useCallback((c) => {
    if (!c) return;
    socket.emit('lobby_set_character', { characterName: c.name, creatureId: c.id });
    setCreature(c);
    setMyTokenId((prev) => prev);   // leave binding to the server's spawn
  }, []);

  // Live handle on this phone's own character, for plugins that need to know
  // whose screen they are on. A getter rather than the value: plugins capture
  // their context once at load, and the token arrives afterwards.
  const tokenRef = useRef(null);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // PLUGINS ON THE PHONE
  //
  // Loaded with role 'player', not the 'spectator' this view joins the socket
  // as. The role the socket uses is about seats at the table; the role a plugin
  // wants is "whose screen is this", and this is a player's own. Without it
  // NPC Chat took the GM branch — a tab that cannot render here — and the
  // player branch that shows the spoken line never ran at all.
  //
  // `getPlayerToken` stands in for the map context plugins normally read the
  // viewer's character out of. There is no map on a phone.
  useEffect(() => {
    if (!sessionId) return;
    loadPlugins({
      context: {
        sessionId,
        role: 'player',
        socket,
        getPlayerToken: () => tokenRef.current,
      },
    });
  }, [sessionId]);
  useEffect(() => { tokenCreatureRef.current = token?.creature_id ?? null; }, [token?.creature_id]);
  useEffect(() => { rosterRef.current = roster; }, [roster]);

  // ── Connection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code || !name) return undefined;
    socket.connect();
    // `companion` marks this as the player's own phone rather than a TV.
    // Spectator is still the right role — it must not take a player slot, claim
    // a token or count as somebody watching the map — but the server needs to
    // know that anything addressed to this NAME belongs here too.
    const join = () => socket.emit(
      'join_session',
      { sessionCode: code, role: 'spectator', name, companion: true },
    );
    // A phone is left on all evening, and it sleeps. The server binds the
    // session to the socket, so a reconnect that does not re-join is a phone
    // that looks connected while every roll it sends is discarded. The
    // keepalive re-joins on each connect and, on every wake, checks the
    // connection is really there before trusting it.
    const detachKeepalive = attachSessionKeepalive({
      join,
      onStatus: (state) => { if (state === 'offline') setConnected(false); },
    });

    const onJoined = ({ state }) => {
      setConnected(true);
      setError('');
      setLinkNote('');
      const own = state?.ownToken?.id ?? null;
      setMyTokenId(own);
      setSessionId(state?.session?.id ?? null);
      setOwnMapId(state?.ownToken?.mapId ?? null);
      const all = Array.isArray(state?.tokens) ? state.tokens : [];
      const mine = all.find((t) => t.id === own)
        || all.find((t) => t.is_player && t.player_name === name) || null;
      if (mine) setToken(mine);
      // Anything the GM has tied to this player: familiars, companions, pets.
      setCompanions(all.filter((t) => t.familiar_of === name));
      setRoster(all);
    };
    const onErr = ({ message }) => setError(message || 'Could not join');

    // The doll crumbled under you. The server has already put you back in your
    // body; this is the part the rules leave to the player — the saving throw,
    // and what it costs to fail it.
    const onPossessionBroken = (d) => {
      if (d?.tokenId !== tokenIdRef.current) return;
      setCrumbled({
        itemName: d.itemName || 'The doll',
        dc: d.dc ?? 15,
        ability: d.ability || 'DEX',
        damage: d.damage || '2d6',
        damageType: d.damageType || 'psychic',
      });
    };

    // Only this player's own token needs watching closely; the companions are
    // refreshed from the same events.
    const patch = (fn) => ({ tokenId, ...rest }) => {
      setToken((t) => (t && t.id === tokenId ? fn(t, rest) : t));
      setCompanions((p) => p.map((c) => (c.id === tokenId ? fn(c, rest) : c)));
    };
    const onHp = patch((t, d) => ({ ...t, current_hp: d.currentHp }));
    const onMaxHp = patch((t, d) => ({ ...t, max_hp: d.maxHp }));
    const onTemp = patch((t, d) => ({ ...t, temp_hp: d.tempHp }));
    const onConds = patch((t, d) => ({ ...t, conditions: d.conditions }));
    const onFly = patch((t, d) => ({ ...t, is_flying: d.isFlying }));
    const onExh = patch((t, d) => ({ ...t, exhaustion: d.exhaustion }));
    const onInit = patch((t, d) => ({ ...t, initiative: d.initiative }));
    // The GM can lift or drop a token from the map, so the sheet follows the
    // board rather than only what was last tapped here.
    const onElev = patch((t, d) => ({ ...t, elevation: d.elevation, is_flying: d.isFlying }));
    const onAdded = ({ token: tk }) => {
      if (tk?.id === tokenIdRef.current) setToken(tk);
      // CLAIM A TOKEN THAT ARRIVES LATER.
      //
      // A player who sets up on their phone has no token when the sheet opens —
      // the GM spawns them afterwards. Matching only on an id we already hold
      // meant that token never bound, so the sheet sat on the setup card
      // forever while the character was demonstrably on the map.
      else if (tk?.is_player && tk.player_name === name && tokenIdRef.current == null) {
        tokenIdRef.current = tk.id;
        setMyTokenId(tk.id);
        setToken(tk);
        if (tk.map_id != null) setOwnMapId(tk.map_id);
      }
      if (tk?.familiar_of === name) setCompanions((p) => (p.some((c) => c.id === tk.id) ? p : [...p, tk]));
      // The board, kept current: it backs the give-item target list, and it is
      // where a companion's full row is found when only an id is announced.
      setRoster((p) => (tk && !p.some((t) => t.id === tk.id) ? [...p, tk] : p));
    };
    const onRemoved = ({ tokenId }) => {
      setCompanions((p) => p.filter((c) => c.id !== tokenId));
      setRoster((p) => p.filter((t) => t.id !== tokenId));
    };
    // `familiarOf` and `companionKind` — the names the server actually sends.
    //
    // This read `playerName` and `kind`, which are always undefined, so the
    // handler took its "not mine any more" branch on every event and dropped the
    // token from the list. Harmless while nothing fired it near a token being
    // added; fatal once Summon did both at once — `token_added` put the familiar
    // in the list and this pulled it straight back out, so the sheet showed the
    // Summon button again until it was reloaded.
    //
    // It also merges rather than replacing. The event carries an id and a kind,
    // not a token, so building a stub from it would throw away the hit points
    // and the art the row needs to draw itself.
    const onFamiliar = ({ tokenId, familiarOf, companionKind }) => {
      setCompanions((p) => {
        const known = p.find((c) => c.id === tokenId) || rosterRef.current.find((t) => t.id === tokenId);
        const without = p.filter((c) => c.id !== tokenId);
        if (familiarOf !== name) return without;
        return [...without, { ...(known || {}), id: tokenId, familiar_of: familiarOf, companion_kind: companionKind }];
      });
    };

    // Every roll in the session, ours and everyone else's — the same feed the
    // map view shows. Trimmed, because a phone left open all evening should not
    // accumulate a thousand of them.
    const onRolled = (data) => {
      const id = ++rollId.current;
      setDiceRolls((prev) => [...prev.slice(-40), { ...data, id }]);
      // Ours, and an attack? Put it on the weapon that asked. Matched on the
      // label we sent and the roller's name, so another player's attack with
      // the same weapon name does not appear on our card.
      // Ours, and something we asked for? Put it on the button that asked.
      if (data?.userName === name && data?.label) {
        const key = awaiting.current.get(data.label);
        if (key) {
          awaiting.current.delete(data.label);
          setRolls((p) => ({ ...p, [key]: { ...data, pending: false } }));
          // Initiative goes straight onto the token. The whole point of the
          // button is that nobody has to read the number out and wait for the
          // GM to type it in, so the roll writes itself into the order.
          if (key === 'initiative' && tokenIdRef.current != null) {
            socket.emit('update_token_initiative', {
              tokenId: tokenIdRef.current,
              initiative: Number(data.total),
            });
          }
        }
      }
    };

    // The GM has just told the party what an item does. Re-read the sheet
    // rather than patching it locally: the secret's text was never sent to this
    // client before now, so there is nothing here to reveal — it has to be
    // fetched.
    const onSecret = ({ creatureId }) => {
      if (!creatureId || creatureId !== tokenCreatureRef.current) return;
      fetch(`/api/creatures/${creatureId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => { if (c && !c.error) setCreature(c); })
        .catch(() => {});
    };

    const onWhisper = ({ message, ts }) => {
      setWhispers((prev) => [{ id: `${ts || Date.now()}-${Math.random()}`, message, ts: ts || Date.now() },
                             ...prev].slice(0, 30));
    };

    // The GM opening a shop, and the haggling that follows. Same four events the
    // desktop listens for — the phone is a full seat at the table, not a
    // read-only sheet, so a shop has to reach it too.
    const onShopOpened = (payload) => {
      setShop(payload || null);
      if (!payload) setShopOffer(null);
      // What have we got outstanding? A counter sent while this phone was
      // asleep or reloading matched nothing locally and was dropped, which is
      // how a player ends up waiting on an answer that already came.
      else socket.emit('shop_my_offer', { creatureId: creatureIdRef.current });
    };
    // Stock changing mid-visit updates a shop already on screen, but never
    // opens one that was closed.
    const onShopChanged = (payload) => setShop((prev) => (prev ? payload : prev));
    const onOfferSent = ({ offer }) => setShopOffer(offer);
    const onOfferUpdated = ({ offer }) => setShopOffer((prev) => (
      prev && prev.id === offer.id
        ? (['accepted', 'declined', 'withdrawn'].includes(offer.status) ? null : offer)
        : prev));

    // A lock to pick, a trap to disarm. One at a time: a second challenge
    // arriving mid-game replaces nothing — the GM is told it was delivered and
    // the player finishes what they are doing.
    const onChallenge = (c) => setChallenge((prev) => prev || c);

    socket.on('minigame_received', onChallenge);
    socket.on('whisper_received', onWhisper);
    socket.on('session_joined', onJoined);
    socket.on('item_secret_revealed', onSecret);
    socket.on('dice_rolled', onRolled);
    socket.on('error', onErr);
    socket.on('token_hp_changed', onHp);
    socket.on('token_max_hp_changed', onMaxHp);
    socket.on('token_temp_hp_changed', onTemp);
    socket.on('token_conditions_changed', onConds);
    socket.on('token_flying_changed', onFly);
    socket.on('token_exhaustion_changed', onExh);
    socket.on('token_initiative_changed', onInit);
    socket.on('token_elevation_changed', onElev);
    socket.on('token_added', onAdded);
    socket.on('token_refreshed', onAdded);
    socket.on('token_removed', onRemoved);
    socket.on('token_familiar_changed', onFamiliar);
    socket.on('possession_broken', onPossessionBroken);
    socket.emit('shop_my_offer', { creatureId: creatureIdRef.current });
    socket.on('shop_opened', onShopOpened);
    socket.on('shop_changed', onShopChanged);
    socket.on('shop_offer_sent', onOfferSent);
    socket.on('shop_offer_updated', onOfferUpdated);
    return () => {
      detachKeepalive();
      socket.off('minigame_received', onChallenge);
      socket.off('whisper_received', onWhisper);
      socket.off('session_joined', onJoined);
      socket.off('item_secret_revealed', onSecret);
      socket.off('dice_rolled', onRolled);
      socket.off('error', onErr);
      socket.off('token_hp_changed', onHp);
      socket.off('token_max_hp_changed', onMaxHp);
      socket.off('token_temp_hp_changed', onTemp);
      socket.off('token_conditions_changed', onConds);
      socket.off('token_flying_changed', onFly);
      socket.off('token_exhaustion_changed', onExh);
      socket.off('token_initiative_changed', onInit);
      socket.off('token_elevation_changed', onElev);
      socket.off('token_added', onAdded);
      socket.off('token_refreshed', onAdded);
      socket.off('token_removed', onRemoved);
      socket.off('token_familiar_changed', onFamiliar);
      socket.off('possession_broken', onPossessionBroken);
      socket.off('shop_opened', onShopOpened);
      socket.off('shop_changed', onShopChanged);
      socket.off('shop_offer_sent', onOfferSent);
      socket.off('shop_offer_updated', onOfferUpdated);
    };
  }, [code, name]);

  // My token may be on a board the session isn't showing, in which case it was
  // never in the joined token list — that array only carries the session map.
  // Ask the board the join said my token is on. (There is no single-token
  // endpoint; this is the route the map views use for the same job.)
  useEffect(() => {
    if (token || !myTokenId || !ownMapId || !sessionId) return undefined;
    let gone = false;
    fetch(`/api/maps/${ownMapId}/state?session_id=${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (gone || !d) return;
        const mine = (d.tokens || []).find((t) => t.id === myTokenId);
        if (mine) setToken(mine);
        // These are the characters standing near me, so they are the ones worth
        // offering as recipients.
        if (Array.isArray(d.tokens) && d.tokens.length) setRoster(d.tokens);
      })
      .catch(() => {});
    return () => { gone = true; };
  }, [myTokenId, token, ownMapId, sessionId]);

  // The sheets.
  useEffect(() => {
    if (!token?.creature_id) return;
    fetch(`/api/creatures/${token.creature_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => { if (c && !c.error) { setCreature(c); setNotes(c.player_notes || ''); } })
      .catch(() => {});
  }, [token?.creature_id]);

  // The bound roster. Re-read on `companions_changed` rather than patched: the GM
  // may have added, renamed or unbound one, and the row carries the companion's
  // own sheet fields with it.
  const loadBound = useCallback(() => {
    const id = token?.creature_id;
    if (!id) { setBound([]); return; }
    fetch(`/api/creatures/${id}/companions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setBound(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [token?.creature_id]);
  useEffect(() => { loadBound(); }, [loadBound]);
  useEffect(() => {
    const onChanged = ({ ownerCreatureId }) => {
      if (!ownerCreatureId || ownerCreatureId === tokenCreatureRef.current) loadBound();
    };
    socket.on('companions_changed', onChanged);
    return () => socket.off('companions_changed', onChanged);
  }, [loadBound]);

  useEffect(() => {
    for (const c of companions) {
      if (!c.creature_id || compCreatures[c.creature_id]) continue;
      fetch(`/api/creatures/${c.creature_id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((row) => { if (row && !row.error) setCompCreatures((p) => ({ ...p, [row.id]: row })); })
        .catch(() => {});
    }
  }, [companions, compCreatures]);

  // The forms this druid has learned. `wildshape_forms` is a list of creature
  // ids on the character, so each is a real stat block to be read.
  // Shifted or not, the wild-shape list belongs to the DRUID.
  //
  // `creature` follows the token, so the moment someone turns into a bear this
  // view is looking at the bear's sheet — which has no forms of its own. Reading
  // the list from there would empty it, hide the tab, and leave no way back: the
  // same trap the server guards against by reading `pretransform.creature_id`.
  // So the original is fetched alongside whenever the token is transformed.
  const shifted = !!token?.pretransform;
  // Possession is a Wild Shape as far as the token is concerned, but the sheet
  // has to tell them apart: a possessor is risking the DOLL's two hit points
  // while their own body lies elsewhere, and the buttons have to say so.
  const possessing = !!token?.pretransform?.possession;
  const ownCreatureId = token?.pretransform?.creature_id ?? token?.creature_id ?? null;
  const [ownSheet, setOwnSheet] = useState(null);
  // Set when a possessed item is destroyed under the player; drives the prompt.
  const [crumbled, setCrumbled] = useState(null);
  useEffect(() => {
    if (!shifted || !ownCreatureId) { setOwnSheet(null); return undefined; }
    let gone = false;
    fetch(`/api/creatures/${ownCreatureId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => { if (!gone && row && !row.error) setOwnSheet(row); })
      .catch(() => {});
    return () => { gone = true; };
  }, [shifted, ownCreatureId]);
  // The sheet the character's own abilities live on: theirs when shifted, the
  // token's otherwise.
  const druidSheet = shifted ? (ownSheet || creature) : creature;
  // THE BODY THE SHEET SHOULD READ FROM WHILE POSSESSING.
  //
  // The Twinkle Doll's card gives it fixed Strength, Dexterity, Constitution
  // and Charisma but says it uses YOUR Intelligence and Wisdom — so the stat
  // block on the creature row cannot be the whole answer for any character
  // that picks it up. It also grants Expertise in Stealth, which is the
  // possessor's proficiency bonus doubled, and the doll's row has no way to
  // know what that is.
  //
  // Both are resolved here, against the character behind the possession, and
  // everything that reads abilities or skills is handed this instead of the
  // raw form.
  const activeBody = useMemo(() => {
    if (!possessing || !creature) return creature;
    const own = ownSheet || null;
    if (!own) return creature;
    const pb = Number(own.proficiency_bonus) || 2;
    const dexMod = Math.floor(((Number(creature.dexterity) || 10) - 10) / 2);
    return {
      ...creature,
      intelligence: own.intelligence,
      wisdom: own.wisdom,
      proficiency_bonus: pb,
      // Expertise in Stealth: ability modifier plus twice the proficiency
      // bonus, which is what the doubled-proficiency rule comes to.
      skill_stealth: dexMod + pb * 2,
      skill_expertise: { ...(creature.skill_expertise || {}), skill_stealth: true },
    };
  }, [possessing, creature, ownSheet]);

  const possessables = useMemo(() => {
    const inv = Array.isArray(druidSheet?.inventory) ? druidSheet.inventory : [];
    return inv.filter((it) => {
      if (!String(it?.possession_form || '').trim()) return false;
      const needsAttunement = !!(it.attunement_required || it.attunement || it.attunement_req);
      return needsAttunement ? !!it.attuned : true;
    });
  }, [druidSheet?.inventory]);

  const formIds = useMemo(() => {
    const raw = druidSheet?.wildshape_forms;
    const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? (() => {
      try { return JSON.parse(raw) || []; } catch { return []; }
    })() : []);
    return arr.map(Number).filter(Boolean);
  }, [druidSheet?.wildshape_forms]);

  useEffect(() => {
    if (!formIds.length) { setForms([]); return undefined; }
    let gone = false;
    Promise.all(formIds.map((id) => fetch(`/api/creatures/${id}`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((rows) => { if (!gone) setForms(rows.filter((x) => x && !x.error)); });
    return () => { gone = true; };
  }, [formIds]);

  // What the shape can DO.
  //
  // While shifted, `creature` is the beast's own stat block, so its traits and
  // actions are already to hand — they were simply never shown, and a player in
  // a panther had no way to read Pounce without leaving the sheet. These lists
  // arrive as arrays or as JSON text depending on where the row came from.
  const formAbilities = useMemo(() => {
    if (!shifted || !creature) return [];
    const read = (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string' && v.trim().startsWith('[')) {
        try { return JSON.parse(v) || []; } catch { return []; }
      }
      return [];
    };
    return [
      { label: 'Traits', rows: read(creature.special_abilities) },
      { label: 'Actions', rows: read(creature.actions) },
      { label: 'Bonus actions', rows: read(creature.bonus_actions) },
      { label: 'Reactions', rows: read(creature.reactions) },
    ].filter((g) => g.rows.length > 0);
  }, [shifted, creature]);

  // How the shape MOVES and what it can SEE.
  //
  // A panther's fifty feet and a bat's blindsight are the two things that
  // change what a player can do the moment they shift, and neither was on the
  // sheet anywhere — the map knew (the server copies the form's senses onto the
  // token), but the person deciding whether to climb the wall did not.
  const SENSE_LABELS = {
    darkvision: 'Darkvision', blindsight: 'Blindsight', tremorsense: 'Tremorsense',
    truesight: 'Truesight', devilssight: "Devil's Sight", normal: 'Normal vision',
  };
  const formMovement = useMemo(() => {
    if (!shifted || !creature) return [];
    return [
      ['Walk', creature.speed_walk],
      ['Fly', creature.speed_fly],
      ['Swim', creature.speed_swim],
      ['Climb', creature.speed_climb],
      ['Burrow', creature.speed_burrow],
    ]
      .filter(([, ft]) => Number(ft) > 0)
      .map(([label, ft]) => ({ label, detail: `${Number(ft)} ft` }));
  }, [shifted, creature]);

  const formSenses = useMemo(() => {
    if (!shifted || !creature) return [];
    let arr = creature.senses;
    if (typeof arr === 'string') {
      try { arr = JSON.parse(arr); } catch { arr = []; }
    }
    const out = (Array.isArray(arr) ? arr : [])
      .filter((x) => x && x.type && x.type !== 'normal')
      .map((x) => ({
        label: SENSE_LABELS[x.type] || x.type,
        detail: Number(x.range) > 0 ? `${Number(x.range)} ft` : '',
      }));
    if (creature.passive_perception != null) {
      out.push({ label: 'Passive Perception', detail: String(creature.passive_perception) });
    }
    return out;
  }, [shifted, creature]);

  // Spell attack bonus and save DC.
  //
  // The ability is taken from the spell when it says (a multiclass caster's
  // spells are tagged individually), and from the class when it does not —
  // several sheets here carry spells with no casting_ability at all, so relying
  // on the field alone would leave those spells with no bonus to offer.
  const ABILITY_KEY = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };
  const abilityMod = (abbr) => {
    const key = ABILITY_KEY[String(abbr || '').toUpperCase()];
    if (!key || !creature) return null;
    return Math.floor(((Number(creature[key]) || 10) - 10) / 2);
  };
  const spellcasting = (sp) => {
    const abbr = String(sp?.casting_ability || '').toUpperCase()
      || spellcastingAbilityFor(creature?.char_class, creature?.char_subclass)
      || '';
    const mod = abilityMod(abbr);
    if (mod == null) return null;
    const prof = Number(creature?.proficiency_bonus) || 2;
    return { abbr, mod, attack: prof + mod, dc: 8 + prof + mod };
  };

  // Everyone with a sheet to receive into, except me.
  const recipients = useMemo(() => roster
    .filter((t) => t.is_player && t.creature_id && t.id !== myTokenId)
    .map((t) => ({
      id: t.id,
      label: t.player_name && t.player_name !== t.name ? `${t.name} (${t.player_name})` : (t.name || 'Someone'),
    })), [roster, myTokenId]);

  // Known spells, grouped by level. Read from the sheet the same way the map
  // view's quick reference reads them, including the JSON-in-a-string case.
  const spellLevels = useMemo(() => {
    const raw = druidSheet?.spells;
    let arr = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === 'string' && raw.startsWith('[')) {
      try { arr = JSON.parse(raw) || []; } catch { arr = []; }
    }
    const byLevel = new Map();
    for (const sp of arr) {
      if (!sp?.name) continue;
      const lvl = sp.level ?? 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl).push(sp);
    }
    // Spells granted by gear — the Bell of the Unseen Servant's Unseen
    // Servant. Merged in here rather than written onto the character, so the
    // spell arrives with the item and leaves when it is handed on. A spell the
    // character already knows is not duplicated; the item just makes it free.
    for (const g of itemGrantedSpells(druidSheet)) {
      const lvl = g.level ?? 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      const already = byLevel.get(lvl).some(
        (sp) => String(sp.name || '').toLowerCase() === g.name.toLowerCase()
      );
      if (already) continue;
      // The library row first, so the card has casting time, range, components,
      // damage and description — then the grant's own facts on top, because the
      // item decides what it costs and who lent it, not the library.
      const row = grantedSpellRows[g.name.toLowerCase()];
      const base = (row && !row.__missing) ? row : {};
      byLevel.get(lvl).push({
        ...base,
        name: g.name,
        level: base.level ?? lvl,
        prepared: true,
        from_item: g.itemName,
        item_uses: g.uses,
        item_recharge: g.recharge,
        item_cost: g.cost,
      });
    }
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([lvl, list]) => [lvl, list.sort((a, b) => a.name.localeCompare(b.name))]);
  }, [druidSheet?.spells, druidSheet?.inventory, grantedSpellRows]);

  // Only a character that can actually leave the ground gets the switch. The
  // map view offers it to everyone because it sits inside a panel full of
  // context; a lone button on a phone reads as "you can fly", which for most
  // characters is a lie.
  const canFly = Number(creature?.speed_fly) > 0;
  // Height off the board in feet. Negative is below it — a pit, or underwater.
  const elevationFt = Math.round(Number(token?.elevation) || 0);
  const flySpeed = Math.max(0, Number(creature?.speed_fly) || 0);

  // Wild magic belongs to one subclass. Same test the map view uses.
  const isWildMagic = String(creature?.char_subclass || '') === 'Wild Magic Sorcery';

  // WHOSE THINGS ARE THESE?
  //
  // A bear has no rucksack and no spell list, and while the token wears one
  // `creature` IS the bear — so the spells, the slots, the pack and the hit
  // dice all vanished the moment a druid shifted, and with them any way to
  // check what was prepared or hand over a potion. They belong to the person,
  // not to the body they are currently walking around in, so they are read
  // from the character's own sheet whichever shape is on the board.
  const inventory = useMemo(() => {
    const inv = druidSheet?.inventory;
    if (Array.isArray(inv)) return inv;
    if (typeof inv === 'string') { try { return JSON.parse(inv) || []; } catch { return []; } }
    return [];
  }, [druidSheet]);

  // The hit dice this character has, from its class and any multiclasses. The
  // same helper the map view uses, so the two always agree on the pool.
  const hitDice = useMemo(() => computeHitDicePool(druidSheet) || [], [druidSheet]);

  // CLASS RESOURCES — Wild Shape uses, Bardic Inspiration, Rages, Ki, and the
  // rest of the things a character spends between rests.
  //
  // The catalogue is the same one the GM's sheet editor reads, so a phone and
  // the panel agree on how many uses a level 6 Moon druid has. Only `used`
  // round-trips; the totals come from the class table.
  const resourceDefs = useMemo(
    () => (druidSheet ? (resourcesForCreature(druidSheet) || []) : []),
    // `inventory` belongs here: a magic item's charge pool is a resource, so
    // picking the staff up has to add its counter and handing it on has to
    // take the counter away.
    [druidSheet?.char_class, druidSheet?.char_subclass, druidSheet?.char_level,
      druidSheet?.inventory], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // ── Gunslinger: grit and trick shots ────────────────────────────────────
  //
  // Offered to anyone who has the archetype, however they came by it: the
  // primary class or any multiclass row. A Fighter 1 / Gunslinger-less
  // character sees none of this, and a Rogue 5 / Fighter 3 (Gunslinger) sees
  // all of it — which is the point of checking every row rather than
  // `char_class` alone.
  const gunslinger = useMemo(() => {
    const rows = [];
    if (druidSheet?.char_class) {
      rows.push({
        cls: String(druidSheet.char_class).trim(),
        sub: String(druidSheet.char_subclass || '').trim(),
        level: Math.max(1, Number(druidSheet.char_level) || 1),
      });
    }
    for (const mc of (Array.isArray(druidSheet?.multiclasses) ? druidSheet.multiclasses : [])) {
      rows.push({
        cls: String(mc?.class || '').trim(),
        sub: String(mc?.subclass || '').trim(),
        level: Math.max(1, Number(mc?.level) || 1),
      });
    }
    const hit = rows.find((r) => r.cls === 'Fighter' && r.sub === 'Gunslinger' && r.level >= 3);
    if (!hit) return null;
    // Which shots this character actually knows. The picker writes each one
    // onto the sheet as a trait, so the sheet is the authority; a character
    // whose shots were never recorded gets the whole list with a note rather
    // than an empty panel.
    const traits = Array.isArray(druidSheet?.special_abilities)
      ? druidSheet.special_abilities
      : (() => { try { return JSON.parse(druidSheet?.special_abilities || '[]') || []; } catch { return []; } })();
    const names = new Set(traits.map((t) => String(t?.name || '').toLowerCase()));
    const known = TRICK_SHOTS.filter((t) => names.has(t.name.toLowerCase()));
    // Trick shot save DC = 8 + proficiency bonus + Dexterity modifier. Worked
    // out here so the panel can state the number rather than the formula: at
    // the table nobody wants to do the arithmetic twice.
    const pb = Math.max(2, Number(druidSheet?.proficiency_bonus) || 2);
    const dex = Math.floor(((Number(druidSheet?.dexterity) || 10) - 10) / 2);
    return {
      level: hit.level,
      known: known.length ? known : TRICK_SHOTS,
      recorded: known.length > 0,
      saveDc: 8 + pb + dex,
    };
  }, [druidSheet?.char_class, druidSheet?.char_subclass, druidSheet?.char_level,
    druidSheet?.multiclasses, druidSheet?.special_abilities,
    druidSheet?.proficiency_bonus, druidSheet?.dexterity]);

  const resourceState = useMemo(() => {
    const raw = druidSheet?.resource_state;
    if (typeof raw === 'string') { try { return JSON.parse(raw) || {}; } catch { return {}; } }
    return raw || {};
  }, [druidSheet?.resource_state]);

  // Grit, read off the same catalogue the resources list ticks — so the tile,
  // the panel and the counter can never disagree about how much is left.
  const gritDef = useMemo(
    () => resourceDefs.find((r) => r.def?.id === 'grit') || null,
    [resourceDefs]
  );
  const gritTotal = Math.max(0, Number(gritDef?.total ?? gritDef?.def?.total) || 0);
  const gritUsed = Math.max(0, Math.min(gritTotal, Number(resourceState?.grit?.used) || 0));
  const gritLeft = Math.max(0, gritTotal - gritUsed);

  // Spending and regaining from the trick-shot panel writes the same field the
  // counter does, so a shot fired here shows as a spent pip there.
  const spendGrit = (n = 1) => saveCreature({
    resource_state: {
      ...(resourceState || {}),
      grit: { used: Math.max(0, Math.min(gritTotal, gritUsed + n)) },
    },
  });

  // Spell slots: the class table gives the totals, the sheet overrides them if
  // it carries its own, and `used` is the part that gets written back.
  const slotState = useMemo(() => {
    const raw = druidSheet?.spell_slots;
    if (typeof raw === 'string') { try { return JSON.parse(raw) || {}; } catch { return {}; } }
    return raw || {};
  }, [druidSheet?.spell_slots]);

  // Pact Magic reads the whole character, not the primary class: a Fighter who
  // takes a level of Warlock has Pact Magic, and asking `char_class` said no.
  const pact = useMemo(
    () => pactMagicForCreature(druidSheet) || null,
    [druidSheet?.char_class, druidSheet?.char_level, druidSheet?.multiclasses]
  );

  const slotRows = useMemo(() => {
    if (!druidSheet) return [];
    const derived = spellSlotsForCreature(druidSheet) || {};
    const rows = [];
    for (let level = 1; level <= 9; level++) {
      const total = Number(slotState?.[level]?.total) || Number(derived[level]) || 0;
      if (!total) continue;
      rows.push({ level, total, used: Math.max(0, Math.min(total, Number(slotState?.[level]?.used) || 0)) });
    }
    // Pact Magic is its own row, keyed 'pact' rather than by level, because it
    // is its own pool: spending a Warlock slot must not tick a slot off the
    // shared table, and a short rest brings only this row back. The phone
    // sheet previously named Pact Magic in the heading and gave the player
    // nothing to tap.
    if (pact) {
      const total = Number(slotState?.pact?.total) || pact.slots;
      rows.push({
        level: 'pact',
        slotLevel: pact.slotLevel,
        total,
        used: Math.max(0, Math.min(total, Number(slotState?.pact?.used) || 0)),
      });
    }
    return rows;
  }, [druidSheet, slotState, pact]);

  // A caster is anyone with a spell to cast or a slot to spend — including a
  // spell lent by an item, which is why this reads the assembled list rather
  // than the character's own `spells` column.
  //
  // Declared HERE, not beside the tab list further down: the tab-fallback
  // effect below names it in its dependency array, and that array is built
  // during render — so a later `const` is still in its dead zone and every
  // sheet rendered as a blank page.
  const hasSpellcasting = spellLevels.length > 0 || slotRows.length > 0;

  // GRANTED SPELLS NEED THEIR TEXT.
  //
  // A spell that comes from an item is not on the character's row, so there is
  // nothing to read: the entry the sheet builds carries a name, a level and
  // which item lent it, and tapping it opened a card with a title and nothing
  // under it. The library rows are fetched once per distinct spell and cached,
  // then merged into the list below.
  const grantedSpellNames = useMemo(
    () => Array.from(new Set(itemGrantedSpells(druidSheet).map((g) => g.name))).sort(),
    [druidSheet?.inventory],
  );
  useEffect(() => {
    const missing = grantedSpellNames.filter((n) => !grantedSpellRows[n.toLowerCase()]);
    if (!missing.length) return undefined;
    let gone = false;
    Promise.all(missing.map((n) =>
      fetch(`/api/spell-library?search=${encodeURIComponent(n)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          const exact = list.filter(
            (sp) => String(sp.name || '').toLowerCase() === n.toLowerCase()
          );
          const pool = exact.length ? exact : [];
          // 2024 text where a spell exists in both printings.
          return [n.toLowerCase(), pool.find((sp) => String(sp.edition) === '2024') || pool[0] || null];
        })
        .catch(() => [n.toLowerCase(), null])
    )).then((pairs) => {
      if (gone) return;
      setGrantedSpellRows((prev) => {
        const next = { ...prev };
        for (const [k, v] of pairs) next[k] = v || { __missing: true };
        return next;
      });
    });
    return () => { gone = true; };
  }, [grantedSpellNames, grantedSpellRows]);

  // A SCROLL IS ITS SPELL.
  //
  // "Spell Scroll (Fireball)" plus four lines about crumbling to dust tells a
  // player nothing they need mid-fight: they want Fireball's range, its save
  // and its damage. The spell is fetched from the library when the item is
  // opened — not held on the item — so a scroll written before the library was
  // corrected still shows the corrected text.
  useEffect(() => {
    const it = viewItem != null ? inventory[viewItem] : null;
    const wanted = it ? spellsOnItem(it) : [];
    if (!wanted.length) { setItemSpell(null); return undefined; }
    let gone = false;
    setItemSpell(wanted.map((w) => ({ status: 'loading', name: w.name, cost: w.cost, spell: null })));
    Promise.all(wanted.map((w) =>
      fetch(`/api/spell-library?search=${encodeURIComponent(w.name)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          // Exact name first — searching "Fireball" also returns "Delayed
          // Blast Fireball", and the scroll is for the one it names.
          const exact = list.filter(
            (sp) => String(sp.name || '').toLowerCase() === w.name.toLowerCase()
          );
          const pool = exact.length ? exact : list;
          // Prefer the 2024 text where a spell exists in both printings.
          const pick = pool.find((sp) => String(sp.edition) === '2024') || pool[0] || null;
          return pick
            ? { status: 'ok', name: w.name, cost: w.cost, spell: pick }
            : { status: 'missing', name: w.name, cost: w.cost, spell: null };
        })
        .catch(() => ({ status: 'missing', name: w.name, cost: w.cost, spell: null }))
    )).then((resolved) => { if (!gone) setItemSpell(resolved); });
    return () => { gone = true; };
  }, [viewItem, inventory]);

  // A weapon's numbers, worked out the way the character sheet works them out.
  // Used by both the equipped-weapons list and the item modal, so the two can
  // never print different figures for the same flail.
  const weaponMaths = useMemo(() => (it) => {
    // Normalised to the {damage, damage_type} spelling the shared damage utils
    // expect, so an entry written the other way still draws and rolls.
    const entries = (Array.isArray(it.damage_entries) && it.damage_entries.length)
      ? it.damage_entries.map((e) => ({ ...e, damage: entryDice(e), damage_type: entryType(e) }))
      : (it.damage ? [{ damage: it.damage, damage_type: it.damage_type || '' }] : []);
    const modes = weaponDamageModes({ ...it, damage_entries: entries });
    const prof = Number(creature?.proficiency_bonus) ?? 2;
    const toHit = bestWeaponStat(it, creature, '').mod + (Number(prof) || 0) + (Number(it.attack_bonus_misc) || 0);
    const lines = modes.map((m) => {
      // weaponDamageMod, not bestWeaponStat: `pick.total` is the ability
      // modifier plus the weapon's flat damage bonus, which a +1 weapon adds to
      // damage as well as to the attack roll.
      const pick = weaponDamageMod(it, creature, m.stat);
      const bd = damageParts(m.damage, pick.mod, pick.abbr, pick.misc);
      // What pressing "roll" should actually throw: the weapon's own dice, its
      // baked-in enchantment, the bonus box, and the ability modifier. Built
      // from the same numbers the card prints, so the button cannot disagree
      // with the line it sits under.
      const spec = parseDamageDice(m.damage);
      return {
        key: m.key,
        label: m.label,
        text: `${formatDamageWithMod(m.damage, pick.total)}${m.damage_type ? ` ${formatDamageType(m.damage_type)}` : ''}`,
        breakdown: bd.parts.length ? `${bd.dice} + ${bd.parts.join(' + ')}` : '',
        range: m.range || '',
        damageType: m.damage_type || '',
        roll: spec ? { count: spec.count, sides: spec.sides, modifier: spec.flat + (Number(pick.total) || 0) } : null,
      };
    });
    return { entries, modes, toHit, lines, riders: weaponDamageRiders({ ...it, damage_entries: entries }) };
  }, [creature]);

  const equippedWeapons = useMemo(
    () => inventory.map((it, i) => ({ it, i })).filter(({ it }) => it.item_type === 'weapon' && it.equipped),
    [inventory]
  );

  // The pack, worn things first.
  //
  // What is in your hands right now is what you reach for mid-fight, and it was
  // scattered through the stored order — which is the order things were picked
  // up in, not the order they matter in. Sorted for display only: each row keeps
  // its index into `inventory`, because that index is what equipping, giving and
  // the item modal all address, and re-numbering the list would have them act on
  // the wrong item.
  const packRows = useMemo(() => {
    const rows = inventory.map((it, i) => ({ it, i }));
    return {
      worn: rows.filter(({ it }) => it.equipped),
      carried: rows.filter(({ it }) => !it.equipped),
    };
  }, [inventory]);

  // ── THE BACK BUTTON CLOSES ONE LAYER ─────────────────────────────────────
  //
  // Every screen on this sheet is React state, not a route, so Android's back
  // gesture left the page entirely — a player who opened their spell list and
  // swiped back was thrown out of the sheet and had to re-join. What they mean
  // by back is "close this and show me what was underneath".
  //
  // So the open layers are mirrored into history: opening one pushes an entry,
  // and a pop closes the innermost. `layers` is ordered innermost-first, which
  // is the order they are stacked on screen — a spell opened from an item sits
  // above that item, and closing it must reveal the item rather than both.
  //
  // Closing a layer with its own × leaves a spare history entry behind, so the
  // effect below winds the history back by the difference. `pendingPops`
  // counts the pops that came from us, so they are not mistaken for the
  // player pressing back again.
  const layers = [
    askingSkill && (() => setAskingSkill(null)),
    crumbled && (() => setCrumbled(null)),
    giving && (() => setGiving(null)),
    viewSpell && (() => setViewSpell(null)),
    viewItem != null && (() => setViewItem(null)),
    showDice && (() => setShowDice(false)),
    showLight && (() => setShowLight(false)),
    showElev && (() => setShowElev(false)),
    showConds && (() => setShowConds(false)),
    openComp && (() => setOpenComp(null)),
    showBlock && (() => setShowBlock(false)),
    showSkills && (() => setShowSkills(false)),
    showFeatures && (() => setShowFeatures(false)),
    showActions && (() => setShowActions(false)),
    showSearch && (() => setShowSearch(false)),
    challenge && (() => setChallenge(null)),
    editing && (() => setEditing(null)),
    // A tab other than Me is the outermost layer: back from Spells or
    // Companions lands on Me, and only then does back leave the sheet.
    tab !== 'me' && (() => setTab('me')),
  ].filter(Boolean);

  const layersRef = useRef(layers);
  useEffect(() => { layersRef.current = layers; });
  const histDepth = useRef(0);
  const pendingPops = useRef(0);

  useEffect(() => {
    const onPop = () => {
      if (pendingPops.current > 0) { pendingPops.current -= 1; return; }
      const top = layersRef.current[0];
      if (!top) return;               // nothing open: let the browser leave
      histDepth.current = Math.max(0, histDepth.current - 1);
      top();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const depth = layers.length;
  useEffect(() => {
    if (depth > histDepth.current) {
      for (let i = histDepth.current; i < depth; i++) {
        try { window.history.pushState({ ttfSheetLayer: i + 1 }, ''); } catch { /* fine */ }
      }
      histDepth.current = depth;
    } else if (depth < histDepth.current) {
      const spare = histDepth.current - depth;
      histDepth.current = depth;
      pendingPops.current += spare;
      try { window.history.go(-spare); } catch { pendingPops.current -= spare; }
    }
  }, [depth]);

  // A familiar dismissed, or a form removed, while its tab is open would leave
  // the view on a tab that no longer exists.
  //
  // Up here with the other hooks, deliberately: the render below returns early
  // for the stat-block screens, so a hook placed after those returns would run
  // on some renders and not others — which is the "rendered fewer hooks than
  // expected" crash, triggered by the simple act of opening a stat block.
  useEffect(() => {
    if (tab === 'companions' && companions.length === 0 && bound.length === 0) setTab('me');
    if (tab === 'shapes' && forms.length === 0) setTab('me');
    if (tab === 'spells' && !hasSpellcasting) setTab('me');
    if (viewItem == null && dropping) setDropping(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, companions.length, forms.length, hasSpellcasting, viewItem, dropping]);

  const emit = (ev, payload) => {
    if (myTokenId) socket.emit(ev, { tokenId: myTokenId, ...payload });
  };

  // Attack roll for one weapon.
  //
  // Rolled by the SERVER through the ordinary dice channel, not locally: the
  // table should see an attack the same way it sees any other roll, in the same
  // log, and a number a phone made up privately is not a roll anyone can trust.
  // The bonus is the one already shown on the weapon, so the button cannot
  // disagree with the card it sits on.
  // Damage for one mode of one weapon. Same channel as the attack roll, so the
  // table sees the die that was thrown and the arithmetic behind the total.
  function rollDamage(item, key, line) {
    if (!line.roll) return;
    const { count, sides, modifier } = line.roll;
    const mode = line.label && line.label !== 'Melee' ? ` ${line.label}` : '';
    ask(key, {
      dice: `d${sides}`,
      count,
      modifier,
      label: `${item.name || 'Weapon'}${mode} — ${line.damageType || 'damage'}`,
    });
  }

  // A spell's attack roll, and its damage.
  //
  // Damage deliberately does NOT add the spellcasting modifier. A weapon adds
  // your ability modifier to damage; a spell does not — only the flat bonus the
  // spell itself writes into its dice, as Magic Missile's "1d4 + 1" does.
  // Adding the modifier here would inflate every cantrip in the game.
  // A skill check or a saving throw. Same shared dice channel as everything else,
  // so the table sees it: a check nobody else can see is one the GM has to take
  // on trust.
  //
  // The row says which it is, so the log reads "Dexterity saving throw" rather
  // than "Dexterity check" — at a table those are different things being asked
  // for, and the log is what gets re-read when someone disputes a result.
  function rollSkill(row, mode = null) {
    const suffix = mode === 'advantage' ? ' (advantage)' : mode === 'disadvantage' ? ' (disadvantage)' : '';
    const what = row.kind === 'save' ? 'saving throw' : 'check';
    ask(`${row.kind === 'save' ? 'save' : 'skill'}|${row.key}`, {
      dice: 'd20',
      count: 1,
      modifier: row.mod,
      mode,
      label: `${row.label} ${what}${suffix}`,
    });
  }

  // A plain die, thrown into the table's shared log.
  //
  // No label and no awaiting entry: this roll is not answering a question some
  // button asked, so it belongs in the feed and nowhere else. Advantage is passed
  // through and the server ignores it for a multi-die roll, which is why the card
  // says so when you have both set.
  function rollLoose(dice) {
    sendToTable('roll_dice', {
      dice,
      count: dieCount,
      modifier: dieMod,
      mode: dieCount === 1 ? dieMode : null,
    });
  }

  function rollSpellAttack(sp, mode = null) {
    const sc = spellcasting(sp);
    if (!sc) return;
    const suffix = mode === 'advantage' ? ' (advantage)' : mode === 'disadvantage' ? ' (disadvantage)' : '';
    ask(`spellhit|${sp.name}`, {
      dice: 'd20', count: 1, modifier: sc.attack, mode,
      label: `${sp.name} — spell attack${suffix}`,
    });
  }

  function rollSpellDamage(sp, entry, idx) {
    const spec = parseDamageDice(entryDice(entry));
    if (!spec) return;
    ask(`spelldmg|${sp.name}|${idx}`, {
      dice: `d${spec.sides}`, count: spec.count, modifier: spec.flat,
      // The index keeps two entries of the same type apart, so Hunger of Hadar's
      // two 2d6 land on their own buttons.
      label: `${sp.name} — ${entryType(entry) || 'damage'}${idx ? ` (${idx + 1})` : ''}`,
    });
  }

  function rollTextDice(sp, d) {
    ask(`text|${sp.name}|${d.key}`, {
      dice: `d${d.sides}`, count: d.count, modifier: d.flat,
      label: `${sp.name} — ${d.count}d${d.sides}${d.hint ? ` ${d.hint}` : ''}`,
    });
  }

  // The mode goes into the LABEL as well as the payload: the label is how a
  // result finds its way back to the button that asked for it, and it is what the
  // table reads in the shared log.
  function rollToHit(item, key, toHit, mode = null) {
    const suffix = mode === 'advantage' ? ' (advantage)' : mode === 'disadvantage' ? ' (disadvantage)' : '';
    ask(key, {
      dice: 'd20',
      count: 1,
      modifier: toHit,
      mode,
      label: `${item.name || 'Weapon'} — to hit${suffix}`,
    });
  }
  const conds = useMemo(() => (Array.isArray(token?.conditions) ? token.conditions : []), [token]);
  // The table's last few throws, newest first.
  const recentRolls = useMemo(() => diceRolls.slice(-4).reverse(), [diceRolls]);
  const exhaustion = Math.max(0, Math.min(6, Number(token?.exhaustion) || 0));

  // Exactly what the map view's light button offers this character: gear in the
  // pack, light spells they know, and any inventory item flagged as shedding
  // light. One shared implementation, so the two menus cannot disagree.
  const lights = useMemo(() => availableLightPresets(creature), [creature]);

  // What the token is actually shedding right now, so the buttons reflect the
  // board rather than only what was last tapped here.
  const litIndex = useMemo(() => {
    const b = Number(token?.token_light_bright) || 0;
    const d = Number(token?.token_light_dim) || 0;
    if (!b && !d) return 0;
    const hit = lights.findIndex((l, i) => i > 0 && l.brightFt === b && l.dimFt === d);
    return hit > 0 ? hit : -1;   // -1: something else is lighting it
  }, [token?.token_light_bright, token?.token_light_dim, lights]);
  useEffect(() => { if (litIndex >= 0) setLight(litIndex); }, [litIndex]);

  // Anything that lives on the character rather than on the token — hit dice,
  // spell slots, death saves — is written the same way the map view writes it,
  // and the returned row becomes the new truth so the pips can't drift from it.
  // Saves go to the CHARACTER's row, not to whatever the token is wearing.
  // Spending a spell slot or a hit die while shifted would otherwise write it
  // onto the bear — a library stat block shared by every druid at the table.
  async function saveCreature(patch) {
    const target = druidSheet;
    if (!target) return;
    const applyLocal = (row) => ({ ...row, ...patch });
    if (shifted && ownSheet && target.id === ownSheet.id) setOwnSheet(applyLocal);
    else setCreature(applyLocal);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(patch)) {
        fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
      }
      const r = await fetch(`/api/creatures/${target.id}`, { method: 'PUT', body: fd });
      const updated = await r.json();
      if (updated && !updated.error) {
        if (shifted && ownSheet && target.id === ownSheet.id) setOwnSheet(updated);
        else setCreature(updated);
      }
    } catch { /* the pips keep the optimistic value; a reload resyncs */ }
  }

  // Equip or take off one item.
  //
  // armor_class is a STORED field — nothing on the server derives it — so
  // whoever flips `equipped` has to recompute it. But only when the sheet is
  // already in step with its gear: if the stored AC disagrees with what the
  // gear implies (a number set by hand, or one predating a rules fix), then
  // silently rewriting it because someone sheathed a dagger would overwrite a
  // deliberate choice. In that case the item still equips and the AC is left
  // alone, and we say so rather than leaving it a mystery.
  async function toggleEquip(index) {
    const it = inventory[index];
    if (!it || !creature) return;
    // A Tortle's shell replaces armour rather than sitting under it: no chain
    // mail, no leather, nothing in the light / medium / heavy categories. A
    // shield, helm, cloak or gauntlets are all still fair game.
    const isBodyArmor = it.item_type === 'armor' && (it.armor_category || '') !== 'shield';
    if (isBodyArmor && !it.equipped && wornArmorBlocked(creature)) {
      const nat = naturalArmorOf(creature);
      setAcNote(`Your natural armor (AC ${nat?.base ?? ''}) means you can't wear body armor. Shields and worn magic items still work.`);
      return;
    }
    const nextInv = inventory.map((row, i) => (i === index ? { ...row, equipped: !row.equipped } : row));
    const patch = { inventory: nextInv };

    // A shield is tracked twice: as an inventory item AND as the older
    // `shield_equipped` boolean, and the AC maths honours either. So taking the
    // shield item off while the flag stays set leaves the +2 in place and the
    // button looks broken. Move both together.
    const isShield = (it.item_type === 'armor' && (it.armor_category || '') === 'shield');
    if (isShield) patch.shield_equipped = !it.equipped;
    const forAc = isShield
      ? { ...creature, inventory: nextInv, shield_equipped: !it.equipped }
      : { ...creature, inventory: nextInv };

    const before = computeAcFromGear(creature, true);
    const inStep = before && Number(before.total) === Number(creature.armor_class);
    if (inStep) {
      const after = computeAcFromGear(forAc, true);
      if (after && Number(after.total) !== Number(creature.armor_class)) {
        patch.armor_class = after.total;
        setAcNote(`AC ${creature.armor_class} → ${after.total} · ${after.parts.join(' ')}`);
      } else setAcNote('');
    } else {
      const after = computeAcFromGear(forAc, true);
      setAcNote(after
        ? `AC left at ${creature.armor_class}. Your sheet's AC doesn't match its gear (that would give ${after.total}), so it wasn't changed — ask your GM.`
        : '');
    }
    await saveCreature(patch);
  }

  // Drop an item, or part of a stack.
  //
  // The AC has to be recomputed the same way taking a thing off does: dropping
  // a worn shield is an un-equip that also removes the row, and leaving the +2
  // behind would be the same bug toggleEquip guards against. Same caution too
  // — an AC the sheet set by hand is left alone and said so.
  async function dropItem(index, howMany) {
    const it = inventory[index];
    if (!it || !creature) return;
    const have = Math.max(1, Number(it.qty) || 1);
    const going = Math.max(1, Math.min(have, Number(howMany) || have));
    const left = have - going;

    const nextInv = left > 0
      ? inventory.map((row, i) => (i === index ? { ...row, qty: left } : row))
      : inventory.filter((_, i) => i !== index);

    const patch = { inventory: nextInv };
    // Only a full drop can un-equip something; one potion out of six changes
    // nothing about what is worn.
    const goneEntirely = left === 0;
    const isShield = (it.item_type === 'armor' && (it.armor_category || '') === 'shield');
    if (goneEntirely && isShield && it.equipped) patch.shield_equipped = false;

    if (goneEntirely && it.equipped) {
      const forAc = { ...creature, inventory: nextInv,
        ...(isShield ? { shield_equipped: false } : {}) };
      const before = computeAcFromGear(creature, true);
      const inStep = before && Number(before.total) === Number(creature.armor_class);
      const after = computeAcFromGear(forAc, true);
      if (inStep && after && Number(after.total) !== Number(creature.armor_class)) {
        patch.armor_class = after.total;
        setAcNote(`AC ${creature.armor_class} → ${after.total} · ${after.parts.join(' ')}`);
      } else if (!inStep && after) {
        setAcNote(`AC left at ${creature.armor_class}. Your sheet's AC doesn't match its gear (that would give ${after.total}), so it wasn't changed — ask your GM.`);
      } else setAcNote('');
    }

    setViewItem(null);
    setDropping(null);
    await saveCreature(patch);
    setGiveNote(going > 1
      ? `Dropped ${going} × ${it.name || 'item'}.`
      : `Dropped ${it.name || 'item'}.`);
  }

  // Coins.
  //
  // Held locally while being changed and written a moment later, because a purse
  // is adjusted in flurries — three taps on +1 is one purse, not three saves —
  // and each save is a full creature PUT.
  const coinTimer = useRef(null);
  const [coinDraft, setCoinDraft] = useState(null);   // { gp, sp, cp } while editing
  const coins = coinDraft || {
    gp: Number(druidSheet?.currency_gp) || 0,
    sp: Number(druidSheet?.currency_sp) || 0,
    cp: Number(druidSheet?.currency_cp) || 0,
  };

  function setCoins(next) {
    const clean = {
      gp: Math.max(0, Math.min(999999, Math.round(Number(next.gp) || 0))),
      sp: Math.max(0, Math.min(999999, Math.round(Number(next.sp) || 0))),
      cp: Math.max(0, Math.min(999999, Math.round(Number(next.cp) || 0))),
    };
    setCoinDraft(clean);
    clearTimeout(coinTimer.current);
    coinTimer.current = setTimeout(() => {
      saveCreature({ currency_gp: clean.gp, currency_sp: clean.sp, currency_cp: clean.cp })
        // Let the server's row take over again once it has landed, so the purse
        // cannot sit on a stale local number.
        .finally(() => setCoinDraft(null));
    }, 700);
  }
  useEffect(() => () => clearTimeout(coinTimer.current), []);

  // The wand's decision.
  //
  // Any spell of the level that was being cast, drawn from the session's own
  // spell library. Picked here on the device that pressed the button and NOT
  // broadcast: the GM leaning over a player's screen wants to know what happened
  // before the table does, and can narrate it — or quietly roll again if the
  // library throws up something that makes no sense in a cellar.
  //
  // Editions are deduplicated by name, preferring the 2024 text, so a library
  // holding both printings of Fireball does not make Fireball twice as likely.
  async function rollWandSpell(level) {
    // 0 is a cantrip, and a cantrip that fizzles wants a replacement as much as
    // a levelled spell does — so the floor is 0, not 1. `Number(level) || 1`
    // would have quietly turned a cantrip into a 1st-level spell.
    const raw = Number(level);
    const lvl = Math.max(0, Math.min(9, Number.isFinite(raw) ? Math.round(raw) : 1));
    setWandBusy(true);
    setWandError('');
    try {
      const r = await fetch(`/api/spell-library?level=${lvl}`);
      const rows = r.ok ? await r.json() : [];
      const byName = new Map();
      for (const sp of Array.isArray(rows) ? rows : []) {
        const key = String(sp.name || '').toLowerCase();
        if (!key) continue;
        const seen = byName.get(key);
        if (!seen || (String(sp.edition) === '2024' && String(seen.edition) !== '2024')) byName.set(key, sp);
      }
      const pool = [...byName.values()];
      if (!pool.length) {
        setWandSpell(null);
        setWandError(lvl === 0
          ? 'No cantrips in the library to draw from.'
          : `No level ${lvl} spells in the library to draw from.`);
        return;
      }
      setWandSpell({ ...pool[Math.floor(Math.random() * pool.length)], _level: lvl, _pool: pool.length });
    } catch {
      setWandError('Could not reach the spell library.');
    } finally {
      setWandBusy(false);
    }
  }

  // Changing shape.
  //
  // The server owns every rule here — whether the form is on this character's
  // list, what the temp HP is, whose hit points are used — so the client sends an
  // intent and nothing more. It also plays the vines effect before applying the
  // swap, which is why this shows a short busy state rather than waiting on a
  // reply: the answer arrives as `token_refreshed`, about a second later.
  function shiftInto(formId) {
    if (!myTokenId) return;
    setShifting(true);
    socket.emit('player_wildshape', { tokenId: myTokenId, creatureId: formId });
    setTimeout(() => setShifting(false), 2500);
  }
  // Initiative: a d20 plus Dexterity and whatever the sheet adds.
  //
  // Read off the character, not the form — a wild-shaped druid still rolls
  // their own initiative — except that a beast's Dexterity is the body doing
  // the moving, so the active body wins where it differs.
  const initiativeMod = useMemo(() => {
    const body = activeBody || creature;
    const dex = Math.floor(((Number(body?.dexterity) || 10) - 10) / 2);
    return dex + (Number(druidSheet?.initiative_bonus) || 0);
  }, [activeBody, creature, druidSheet?.initiative_bonus]);

  // One equipped weapon, with its attack and damage buttons.
  //
  // A render function rather than a component: it closes over the roll
  // state and helpers, and returning JSX directly avoids remounting the
  // card (and dropping the roll showing on it) every render.
  const weaponCard = ({ it, i }) => {
                  const w = weaponMaths(it);
                  // Keyed by name so a returning roll can find its card, and by
                  // index so two of the same weapon stay separate.
                  const key = `${it.name || 'Weapon'}|${i}`;
                  const hit = rolls[key];
                  return (
                    <div key={it.id ?? i}
                      className="rounded-xl bg-gray-800/50 border border-gray-700/60 p-3">
                      {/* The card opens the item; the roll button must not, so
                          they are separate controls rather than nested ones. */}
                      <button type="button"
                        onClick={() => { setViewItem(i); setAcNote(''); }}
                        className="w-full text-left">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base text-gray-100 min-w-0 truncate">{it.name || 'Weapon'}</span>
                        <span className="font-mono text-green-400">{w.toHit >= 0 ? '+' : ''}{w.toHit}</span>
                        <span className="text-[11px] text-gray-500">to hit</span>
                        {it.mastery && <span className="ml-auto text-[10px] text-amber-300 shrink-0">{it.mastery}</span>}
                      </div>
                      {w.lines.map((l) => (
                        <div key={l.key} className="mt-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {w.lines.length > 1 && (
                              <span className="text-[11px] text-gray-500 w-24 shrink-0">{l.label}</span>
                            )}
                            <span className="font-mono text-sm text-gray-200">{l.text}</span>
                            {l.range && <span className="text-[11px] text-gray-500">· {l.range}</span>}
                          </div>
                          {l.breakdown && (
                            <div className={`text-[11px] text-gray-500 ${w.lines.length > 1 ? 'pl-[6.5rem]' : ''}`}>
                              {l.breakdown}
                            </div>
                          )}
                        </div>
                      ))}
                      {w.lines.length === 0 && (
                        <div className="text-[11px] text-gray-500 mt-1">No damage recorded on this weapon.</div>
                      )}
                      {/* Conditional damage, stated on the card but never given
                          a roll button: a Sword of Sharpness's 14 Slashing
                          lands on a natural 20 and nowhere else, so a button
                          for it would be a button for cheating. */}
                      {w.riders.map((r) => (
                        <div key={r.key} className="mt-1 flex items-baseline gap-2 flex-wrap">
                          <span className="font-mono text-sm text-amber-200">
                            +{r.damage}{r.damage_type ? ` ${formatDamageType(r.damage_type)}` : ''}
                          </span>
                          <span className="text-[11px] text-gray-400 min-w-0">{r.condition}</span>
                        </div>
                      ))}
                      </button>

                      {/* One damage button per mode, so a versatile weapon
                          offers both its dice rather than making the player
                          work out which one applies. */}
                      {w.lines.some((l) => l.roll) && (
                        <div className={`grid gap-2 mt-2 ${w.lines.filter((l) => l.roll).length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {w.lines.filter((l) => l.roll).map((l) => {
                            const dkey = `${it.name || 'Weapon'}|${i}|${l.key}`;
                            const d = rolls[dkey];
                            const { count, sides, modifier } = l.roll;
                            return (
                              <button
                                key={l.key}
                                type="button"
                                onClick={() => rollDamage(it, dkey, l)}
                                className="h-11 rounded-xl bg-red-950/50 border border-red-800 active:bg-red-900/60 text-left px-3"
                              >
                                <span className="block text-[10px] text-red-200/70 leading-none">
                                  {w.lines.filter((x) => x.roll).length > 1 ? l.label : 'Damage'}
                                </span>
                                <span className="flex items-baseline gap-1.5">
                                  <span className="font-mono text-xs text-red-100">
                                    {count}d{sides}{modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}
                                  </span>
                                  {d && !d.pending && (
                                    <span className="ml-auto text-lg font-bold text-red-50">{d.total}</span>
                                  )}
                                  {d?.pending && <span className="ml-auto text-[10px] text-red-200/60">…</span>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => rollToHit(it, key, w.toHit)}
                            className="h-11 flex-1 rounded-xl bg-green-900/50 border border-green-700 active:bg-green-900/80 text-sm text-green-100 font-semibold"
                          >
                            Roll to hit <span className="font-mono">(d20 {w.toHit >= 0 ? '+' : ''}{w.toHit})</span>
                          </button>
                          <D20Result r={hit} />
                        </div>
                        <AdvPair onRoll={(mode) => rollToHit(it, key, w.toHit, mode)} disabled={!!hit?.pending} />
                      </div>
                    </div>
                  );
                };

  // Passive Perception, worked out the same way the Skills screen works it:
  // 10 + the Perception modifier of the body you are currently in. Derived
  // rather than read from `passive_perception`, so it follows proficiency,
  // expertise and a feature bonus instead of going stale the moment one
  // changes — and a wild-shaped druid gets the beast's senses, which is the
  // whole reason a form has them.
  const passivePerception = useMemo(() => {
    const body = activeBody || creature;
    if (!body) return null;
    const row = skillRows(body).find((r) => r.key === 'skill_perception');
    return row ? passiveScore(row.mod) : null;
  }, [activeBody, creature]);

  function rollInitiative() {
    ask('initiative', {
      dice: 'd20',
      count: 1,
      modifier: initiativeMod,
      label: 'Initiative',
    });
  }

  function returnToOwnForm() {
    if (!myTokenId) return;
    setShifting(true);
    socket.emit('player_wildshape_revert', { tokenId: myTokenId });
    setTimeout(() => setShifting(false), 2500);
  }
  // Step into a possessable item — the Twinkle Doll. Reuses the same revert as
  // Wild Shape, which is why there is no matching "unpossess" here.
  function possessItem(itemName) {
    if (!myTokenId) return;
    setShifting(true);
    socket.emit('player_possess_item', { tokenId: myTokenId, itemName });
    setTimeout(() => setShifting(false), 2500);
  }

  async function saveNotes() {
    if (!creature) return;
    setNotesSaved(true);
    try {
      const fd = new FormData();
      fd.append('player_notes', notes);
      await fetch(`/api/creatures/${creature.id}`, { method: 'PUT', body: fd });
    } catch { setNotesSaved(false); }
  }

  if (!code || !name) {
    return <Gate onSubmit={(c, n) => navigate(`/sheet?code=${c}&name=${encodeURIComponent(n)}`)} />;
  }

  const SCROLL = 'h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]';

  if (showActions) return <ActionsReference onClose={() => setShowActions(false)} />;
  // Look anything up — spells, items, monsters, class features, the rules.
  // A player's role, so the server strips what the GM has not revealed.
  if (showSearch) return <ReferenceSearch role="player" onClose={() => setShowSearch(false)} />;
  // The GM's challenge takes the whole screen: it is the one thing on this
  // phone that somebody at the table is actively waiting on.
  if (challenge) {
    return (
      <MiniGameHost
        challenge={challenge}
        creature={druidSheet}
        onResult={(r) => sendToTable('minigame_result', { id: challenge.id, ...r })}
        onClose={() => setChallenge(null)}
      />
    );
  }

  // ── Features, feats and traits ───────────────────────────────────────────
  //
  // What the class and subclass actually give you, at or below your level.
  // Two sources, and both matter: the CATALOGUE is the printed text of every
  // feature, and the SHEET carries whatever the GM or the player typed on top
  // — a homebrew feature, a boon, a note about how a feature works at this
  // table. Showing only one of them would hide the other.
  //
  // Levelled features above the character's level are left out: a level 3
  // fighter looking for what Action Surge does does not need to scroll past
  // level 20 to find it.
  if (showFeatures && druidSheet) {
    const lvl = Math.max(1, Number(druidSheet.char_level) || 1);
    const cls = classEntry(druidSheet.char_class);
    const sub = subclassEntry(druidSheet.char_class, druidSheet.char_subclass);
    const due = (f) => (Number(f?.level) || 1) <= lvl;
    const readRows = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try { return JSON.parse(raw) || []; } catch { return []; }
      }
      return [];
    };
    // Everything else on the sheet that behaves like a feature: the species
    // traits, the background's, and anything hand-written. They all live in
    // `special_abilities`, tagged with where they came from by the pickers
    // that put them there — so they can be split into groups that read the
    // way the character sheet does rather than one long pile.
    const traits = readRows(druidSheet.special_abilities);
    const from = (prefix) => traits.filter(
      (t) => typeof t?.__source === 'string' && t.__source.startsWith(prefix)
    );
    const speciesTraits = from('race:');
    const backgroundTraits = from('background:');
    // Whatever is left: typed in by hand, or granted by something that does
    // not tag itself. Class grants are excluded — they are already listed
    // above under the class that gave them.
    const otherTraits = traits.filter(
      (t) => !speciesTraits.includes(t)
        && !backgroundTraits.includes(t)
        && !(typeof t?.__source === 'string' && t.__source.startsWith('cls:'))
    );

    const groups = [
      { label: druidSheet.char_class || 'Class', rows: (cls?.features || []).filter(due) },
      { label: druidSheet.char_subclass || '', rows: (sub?.features || []).filter(due) },
      { label: 'Feats', rows: readRows(druidSheet.feats), own: true },
      { label: druidSheet.subtype || 'Species', rows: speciesTraits, own: true },
      { label: druidSheet.background || 'Background', rows: backgroundTraits, own: true },
      { label: 'Other traits', rows: otherTraits, own: true },
      // Anything written onto this character specifically.
      { label: 'On your sheet', rows: readRows(druidSheet.class_features), own: true },
    ].filter((g) => g.label && g.rows.length > 0);

    return (
      <div className={`${SCROLL} bg-gray-900 text-gray-100`}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button onClick={() => setShowFeatures(false)}
            className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-base">‹ Back</button>
          <div className="min-w-0">
            <div className="truncate font-semibold">Features &amp; feats</div>
            <div className="truncate text-[11px] text-gray-500">
              {[druidSheet.subtype, druidSheet.char_class, druidSheet.char_subclass]
                .filter(Boolean).join(' · ') || 'no class set'}
              {` · level ${lvl}`}
            </div>
          </div>
        </div>

        <div className="p-3 pb-24 max-w-3xl mx-auto space-y-4">
          {groups.length === 0 && (
            <p className="text-[13px] text-gray-500 italic">
              Nothing recorded for this class yet. Features you or your GM add to the sheet
              will show up here.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-[11px] uppercase tracking-wide text-dnd-gold mb-1.5 px-1">{g.label}</div>
              <div className="space-y-1.5">
                {g.rows.map((f, i) => (
                  <details key={`${f.name || 'feature'}-${i}`}
                    className="rounded-xl border border-gray-700/60 bg-gray-800/50 overflow-hidden">
                    <summary className="px-3 py-2.5 cursor-pointer list-none flex items-baseline gap-2">
                      <span className="text-sm text-gray-100 flex-1 min-w-0">{f.name || 'Feature'}</span>
                      {!g.own && f.level != null && (
                        <span className="text-[11px] text-gray-500 shrink-0">level {f.level}</span>
                      )}
                      <span className="text-gray-500 text-xs shrink-0">▾</span>
                    </summary>
                    <p className="px-3 pb-3 text-[13px] text-gray-300 whitespace-pre-wrap leading-snug">
                      {f.desc || f.description || 'No description recorded.'}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Skills ───────────────────────────────────────────────────────────────
  //
  // All eighteen, not just the trained ones: an untrained skill is still a skill
  // you are allowed to attempt, and the number to roll is the bare ability
  // modifier. A list of only the proficient ones would be a list of the things
  // the player already knew they were good at.
  if (showSkills && creature) {
    const rows = skillRows(activeBody);
    const saves = saveRows(activeBody);
    return (
      <div className={`${SCROLL} bg-gray-900 text-gray-100`}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button onClick={() => { setShowSkills(false); setAskingSkill(null); }}
            className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-base">‹ Back</button>
          <div className="min-w-0">
            <div className="truncate font-semibold">Skills &amp; stats</div>
            <div className="truncate text-[11px] text-gray-500">
              {creature.name} · proficiency +{Number(creature.proficiency_bonus) || 2}
            </div>
          </div>
        </div>

        {/* The six abilities, and the save for each.
            Tapping a card rolls the SAVE, not an ability check: a save is the
            thing a table asks for out loud and under time pressure, and it is the
            one of the two that has a proficiency attached to get wrong. */}
        <div className="p-3 pb-0 max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2 px-1">
            Abilities — tap to roll a save
          </div>
          <div className="grid grid-cols-3 gap-2">
            {saves.map((sv) => {
              const r = rolls[`save|${sv.key}`];
              const die = r && !r.pending ? (r.kept ?? r.rolls?.[0]) : null;
              return (
                <button
                  key={sv.key}
                  type="button"
                  onClick={() => setAskingSkill(sv)}
                  className={`rounded-xl border px-2 py-2.5 text-center active:bg-gray-800 ${
                    sv.prof === 'proficient'
                      ? 'bg-emerald-950/20 border-emerald-900/60'
                      : 'bg-gray-800/50 border-gray-700/60'}`}
                >
                  <span className="block text-[10px] uppercase tracking-wider text-gray-400">{sv.abbr}</span>
                  <span className="block text-2xl font-bold text-gray-100 leading-tight">{sv.score}</span>
                  <span className="block text-[11px] font-mono text-gray-400">{signedMod(sv.ability)}</span>
                  <span className={`block mt-1 text-[11px] font-mono ${
                    sv.prof === 'proficient' ? 'text-emerald-300' : 'text-gray-500'}`}>
                    save {signedMod(sv.mod)}
                  </span>
                  {r?.pending && <span className="block text-[10px] text-gray-500">rolling…</span>}
                  {die != null && (
                    <span className="block mt-1 border-t border-gray-700/60 pt-1">
                      <span className={`block text-xl font-bold leading-none ${
                        die === 20 ? 'text-amber-300' : die === 1 ? 'text-red-400' : 'text-gray-100'}`}>{r.total}</span>
                      <span className="block text-[10px] text-gray-500">
                        d20 {die}
                        {r.mode === 'advantage' ? ' adv' : r.mode === 'disadvantage' ? ' dis' : ''}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 pb-40 max-w-3xl mx-auto space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 px-1">Skills</div>
          {rows.map((row) => {
            const r = rolls[`skill|${row.key}`];
            const die = r && !r.pending ? (r.kept ?? r.rolls?.[0]) : null;
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => setAskingSkill(row)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left min-h-[56px] active:bg-gray-800 ${
                  row.prof === 'expertise' ? 'bg-amber-950/25 border-amber-800/60'
                    : row.prof === 'proficient' ? 'bg-emerald-950/20 border-emerald-900/60'
                    : 'bg-gray-800/50 border-gray-700/60'}`}
              >
                <span className="font-mono text-xl w-12 shrink-0 text-gray-100">{signedMod(row.mod)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-100 truncate">{row.label}</span>
                  <span className="block text-[10px] text-gray-500">
                    {row.abbr} {signedMod(row.ability)}
                    {row.prof === 'expertise' ? ' · expertise' : row.prof === 'proficient' ? ' · proficient' : ''}
                    {' · passive '}{passiveScore(row.mod)}
                  </span>
                  {/* Where a feature bonus came from. A Magician druid rolling
                      Nature at +9 with a +2 Intelligence needs to see the
                      Primal Order line, or the number looks like a bug. */}
                  {row.bonusSources?.map((src, i) => (
                    <span key={i} className="block text-[10px] text-sky-300/80 truncate">
                      {signedMod(src.bonus)} {src.label}
                    </span>
                  ))}
                </span>
                {r?.pending && <span className="shrink-0 text-[11px] text-gray-500">rolling…</span>}
                {die != null && (
                  <span className="shrink-0 text-right leading-tight">
                    <span className={`block text-2xl font-bold ${
                      die === 20 ? 'text-amber-300' : die === 1 ? 'text-red-400' : 'text-gray-100'}`}>{r.total}</span>
                    <span className="block text-[10px] text-gray-500">
                      d20 {die}
                      {r.mode === 'advantage' ? ' adv' : r.mode === 'disadvantage' ? ' dis' : ''}
                      {r.dropped != null ? ` (${r.dropped})` : ''}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* How are you rolling it? Asked every time rather than assumed, because
            the answer is a table decision — the GM says "with advantage" out loud
            and this is where that lands. */}
        {askingSkill && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70"
               onClick={() => setAskingSkill(null)}>
            <div className="bg-gray-900 border-t border-gray-700 rounded-t-2xl p-4 space-y-2"
                 style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                 onClick={(e) => e.stopPropagation()}>
              <div className="text-center pb-1">
                <div className="text-base font-semibold text-gray-100">
                  {askingSkill.label}{askingSkill.kind === 'save' ? ' saving throw' : ''}
                </div>
                <div className="text-[11px] text-gray-500">
                  d20 {signedMod(askingSkill.mod)}
                  {askingSkill.kind === 'save' ? '' : ` · ${askingSkill.abbr}`}
                  {askingSkill.prof === 'expertise' ? ' · expertise'
                    : askingSkill.prof === 'proficient' ? ' · proficient' : ' · untrained'}
                </div>
              </div>
              <button type="button"
                onClick={() => { rollSkill(askingSkill, 'advantage'); setAskingSkill(null); }}
                className="w-full py-4 rounded-xl bg-emerald-900/60 border border-emerald-700 text-emerald-100 font-semibold">
                With advantage
              </button>
              <button type="button"
                onClick={() => { rollSkill(askingSkill, null); setAskingSkill(null); }}
                className="w-full py-4 rounded-xl bg-gray-800 border border-gray-600 text-gray-100 font-semibold">
                Straight roll
              </button>
              <button type="button"
                onClick={() => { rollSkill(askingSkill, 'disadvantage'); setAskingSkill(null); }}
                className="w-full py-4 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-100 font-semibold">
                With disadvantage
              </button>
              <button type="button" onClick={() => setAskingSkill(null)}
                className="w-full py-3 rounded-xl text-gray-400 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showBlock && creature) {
    return (
      <div className={`${SCROLL} bg-gray-900 text-gray-100`}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button onClick={() => setShowBlock(false)} className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-base">‹ Back</button>
          <div className="truncate font-semibold">{creature.name}</div>
        </div>
        <div className="p-3 pb-16 max-w-3xl mx-auto"><StatBlock creature={creature} /></div>
      </div>
    );
  }

  const openFormCreature = openForm != null ? forms.find((f) => f.id === openForm) : null;
  if (openFormCreature) {
    return (
      <div className={`${SCROLL} bg-gray-900 text-gray-100`}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button onClick={() => setOpenForm(null)} className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-base">‹ Back</button>
          <div className="min-w-0">
            <div className="truncate font-semibold">{openFormCreature.name}</div>
            <div className="truncate text-[11px] text-gray-500">wild shape · {formatSizeType(openFormCreature)}</div>
          </div>
        </div>
        <div className="p-3 pb-16 max-w-3xl mx-auto"><StatBlock creature={openFormCreature} /></div>
      </div>
    );
  }

  const openCompCreature = openComp != null ? compCreatures[openComp] : null;
  if (openCompCreature) {
    return (
      <div className={`${SCROLL} bg-gray-900 text-gray-100`}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button onClick={() => setOpenComp(null)} className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-base">‹ Back</button>
          <div className="min-w-0">
            <div className="truncate font-semibold">{openCompCreature.name}</div>
            <div className="truncate text-[11px] text-gray-500">{formatSizeType(openCompCreature)}</div>
          </div>
        </div>
        <div className="p-3 pb-16 max-w-3xl mx-auto"><StatBlock creature={openCompCreature} /></div>
      </div>
    );
  }

  const tabs = [
    { id: 'me', label: 'Me' },
    ...(hasSpellcasting ? [{ id: 'spells', label: 'Spells' }] : []),
    ...(companions.length || bound.length
      ? [{ id: 'companions', label: `Companions (${Math.max(companions.length, bound.length)})` }]
      : []),
    ...(forms.length ? [{ id: 'shapes', label: `Shapes (${forms.length})` }] : []),
  ];
  const hp = Number(token?.current_hp) || 0;
  const maxHp = Number(token?.max_hp) || 0;
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;

  return (
    <div className={`${SCROLL} bg-gray-900 text-gray-100`}>
      {/* Header: who you are and how you're doing, always visible. */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-3 py-2.5"
           style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          {/* Round, like the token it is. Art drawn for a disc on the map was
              being shown in a rounded square here, which cropped the corners of
              a circular portrait and left the square ones looking like a
              different game. */}
          <span className="w-11 h-11 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
            {creature?.image_path && <img src={`/uploads/${creature.image_path}`} alt="" className="w-full h-full object-cover" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{creature?.name || token?.name || name}</div>
            <div className="text-[11px] text-gray-500 truncate">
              {creature ? `${creature.char_class || formatSizeType(creature)}${creature.char_level ? ` · level ${creature.char_level}` : ''}` : (connected ? 'finding your character…' : 'connecting…')}
            </div>
          </div>
          {/* The same editor the GM uses, over the sheet.
              NOT hidden in preview. This was gated on `!previewing`, which
              contradicts the rule at the top of this file: a preview is fully
              interactive, and the flag changes the BANNER, not the controls. A
              GM looking at a player's phone is usually there to fix exactly the
              kind of thing this button opens. */}
          {/* AC and Passive Perception, up here with Edit and at a size that
              can be read at arm's length. They were 11px grey text tucked
              against the hit-point bar, which is the wrong weight for two
              numbers the GM asks for out loud. */}
          {creature && (
            <div className="flex items-center gap-1.5 shrink-0">
              {passivePerception != null && (
                <span title="Passive Perception"
                      className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 leading-none text-center">
                  <span className="block text-[9px] uppercase tracking-wider text-gray-500">PP</span>
                  <span className="block text-base font-semibold text-gray-100">{passivePerception}</span>
                </span>
              )}
              <span title="Armour Class"
                    className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 leading-none text-center">
                <span className="block text-[9px] uppercase tracking-wider text-gray-500">AC</span>
                <span className="block text-base font-semibold text-gray-100">
                  {creature?.armor_class ?? '—'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditing({ mode: 'edit' })}
                aria-label="Edit character"
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700
                           active:bg-gray-700 text-[12px] text-dnd-gold font-semibold"
              >Edit</button>
            </div>
          )}
          <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-500' : 'bg-gray-600'}`}
                title={connected ? 'Connected to the table' : 'Not connected — reconnecting'} />
        </div>
        {(!connected || linkNote) && (
          <p className="mt-1.5 text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-lg px-2 py-1 leading-snug">
            {linkNote || 'Reconnecting to the table…'}
          </p>
        )}
        {maxHp > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>{hp} / {maxHp}{token?.temp_hp ? ` (+${token.temp_hp})` : ''}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className={`h-full ${pct > 50 ? 'bg-green-600' : pct > 25 ? 'bg-yellow-600' : 'bg-red-600'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {/* Only the tabs that lead somewhere. An empty tab is a dead end that
            reads as a broken feature, and most characters are neither a druid
            nor a warlock with a familiar. */}
        {tabs.length > 1 && (
          <div className="flex gap-1 mt-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-xl text-sm ${tab === t.id ? 'bg-amber-800/70 text-amber-100' : 'bg-gray-800 text-gray-400'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {previewing && (
        <div className="mx-3 mt-3 p-2 rounded-xl bg-amber-950/60 border border-amber-700 text-[11px] text-amber-200 text-center leading-snug">
          You are on <span className="font-semibold">{name}</span>'s sheet — anything you change here
          changes their character.
        </div>
      )}
      {error && (
        <div className="m-3 p-3 rounded-xl bg-red-950/60 border border-red-800 text-sm text-red-200">{error}</div>
      )}

      {/* Private lines from the GM.
          On the SHEET itself rather than inside the dice tray, which is where
          this first went — a whisper the player has to open a panel to discover
          is a whisper they will miss, and the tray is shut by default. It also
          shows before a character has been matched: a whisper is addressed to
          the person, not to their token. */}
      {whispers.length > 0 && (
        <div className="m-3 rounded-xl bg-indigo-950/60 border border-indigo-800/70 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-indigo-800/50">
            <span className="text-[11px] uppercase tracking-wider text-indigo-300/90 font-semibold">
              From the GM
            </span>
            <button
              type="button"
              onClick={() => setWhispers([])}
              className="text-[11px] text-indigo-400/80 active:text-indigo-200 px-2 py-0.5"
            >Clear</button>
          </div>
          <div className="divide-y divide-indigo-900/50">
            {whispers.slice(0, 6).map((w) => (
              <div key={w.id} className="px-3 py-2">
                <p className="text-[14px] text-indigo-100 leading-snug whitespace-pre-wrap break-words">
                  {w.message}
                </p>
                <span className="text-[10px] text-indigo-400/70">
                  {new Date(w.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Chosen, but not yet on the map. The GM spawns the party when they are
          ready, and until then the sheet has nothing to show — saying so beats
          leaving the setup card up as though nothing had happened. */}
      {!error && connected && !token && creature && (
        <div className="m-3 p-3 rounded-xl bg-gray-800 border border-gray-700">
          <p className="text-sm text-gray-200">
            <span className="text-dnd-gold font-semibold">{creature.name}</span> is ready.
          </p>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">
            Waiting for your GM to put you on the map. You can keep editing in the meantime.
          </p>
          <button
            type="button"
            onClick={() => setEditing({ mode: 'edit' })}
            className="mt-2.5 w-full py-2 rounded-xl bg-gray-900 border border-gray-700 text-[13px] text-dnd-gold font-semibold active:bg-gray-700"
          >Edit {creature.name}</button>
        </div>
      )}

      {/* Standing on a token that is not linked to a character sheet.
          The sheet binds to a TOKEN, but everything worth editing lives on the
          creature behind it — so a token the GM placed without one leaves the
          player with a name, a health bar and no way through to anything else.
          Before this there was no Edit button and no setup card either: the
          screen simply had no exit. */}
      {!error && connected && token && !creature && (
        <div className="m-3 rounded-xl bg-amber-950/50 border border-amber-800/70 overflow-hidden">
          <div className="p-3">
            <p className="text-sm text-amber-100">This token has no character sheet attached.</p>
            <p className="text-[11px] text-amber-300/80 mt-1 leading-snug">
              Pick one of yours below to attach it, or build a new one.
            </p>
          </div>

          {/* ATTACHING, NOT ONLY BUILDING.
              This card used to offer a build button and nothing else, so a
              player whose character failed to bind built the same character
              again — and again, because the rebuild bound no better than the
              first one. Their existing sheets are listed here, and choosing
              one re-announces it, which is what binds the token. */}
          {myChars === null && (
            <p className="px-3 pb-3 text-[12px] text-amber-300/70 italic">Looking for your characters…</p>
          )}

          {myChars !== null && myChars.length > 0 && (
            <div className="divide-y divide-amber-800/40 border-t border-amber-800/40">
              {myChars.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => announceCharacter(c)}
                  className="w-full text-left px-3 py-2.5 active:bg-amber-900/40 flex items-center gap-3"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] text-amber-50 truncate">{c.name}</span>
                    <span className="block text-[11px] text-amber-300/70 truncate">
                      {[c.race, c.char_class, c.level ? `level ${c.level}` : null].filter(Boolean).join(' · ') || 'character'}
                    </span>
                  </span>
                  <span className="text-[11px] text-dnd-gold shrink-0">Attach</span>
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-amber-800/40">
            <button
              type="button"
              onClick={() => setEditing({ mode: 'new' })}
              className="w-full py-2.5 rounded-xl bg-dnd-gold/90 active:bg-dnd-gold text-gray-900 font-semibold text-sm"
            >
              {myChars && myChars.length ? 'Build a new character' : 'Build a character sheet'}
            </button>
          </div>
        </div>
      )}

      {!error && connected && !token && !creature && (
        <div className="m-3 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-dnd-gold">Set up your character</h2>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Pick one you already have, or build a new one. Your GM puts you on
              the map once you have chosen.
            </p>
          </div>

          {myChars === null && (
            <p className="px-3 py-3 text-[12px] text-gray-500 italic">Looking for your characters…</p>
          )}

          {myChars !== null && myChars.length > 0 && (
            <div className="divide-y divide-gray-700/70">
              {myChars.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => announceCharacter(c)}
                  className="w-full text-left px-3 py-2.5 active:bg-gray-700/60 flex items-center gap-3"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] text-gray-100 truncate">{c.name}</span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {[c.race, c.char_class, c.level ? `level ${c.level}` : null].filter(Boolean).join(' · ') || 'character'}
                    </span>
                  </span>
                  <span className="text-[11px] text-dnd-gold shrink-0">Use this</span>
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-700/70">
            <button
              type="button"
              onClick={() => setEditing({ mode: 'new' })}
              className="w-full py-2.5 rounded-xl bg-dnd-gold/90 active:bg-dnd-gold text-gray-900 font-semibold text-sm"
            >
              {myChars && myChars.length ? 'Build a new character' : 'Create your character'}
            </button>
            <p className="text-[10px] text-gray-500 mt-2 leading-snug">
              Joined under a different name? The sheet finds your character by the
              name you joined with — “{name}”.
            </p>
          </div>
        </div>
      )}

      {tab === 'me' && token && (
        <div className="p-3 space-y-3 pb-20">
          {/* At 0 hit points this is the only thing being tracked, so it goes
              first and it is impossible to miss. */}
          {hp <= 0 && (
            <div className="rounded-2xl border border-red-700 bg-red-950/50 p-3">
              <div className="text-sm font-semibold text-red-200 mb-2">Death saving throws</div>
              {[['death_save_successes', 'Successes', 'bg-green-500'],
                ['death_save_failures', 'Failures', 'bg-red-500']].map(([field, label, fill]) => {
                const n = Number(creature?.[field]) || 0;
                return (
                  <div key={field} className="flex items-center gap-3 mb-2 last:mb-0">
                    <span className="w-20 text-xs text-gray-300">{label}</span>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((i) => (
                        <button key={i} type="button"
                          // Tapping the pip you are on clears it, so a
                          // mis-tap costs one tap to undo rather than a reset.
                          onClick={() => saveCreature({ [field]: n === i ? i - 1 : i })}
                          className={`w-10 h-10 rounded-full border-2 ${n >= i ? `${fill} border-transparent` : 'border-gray-600'}`}
                          aria-label={`${label} ${i}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {(Number(creature?.death_save_successes) || 0) >= 3 && (
                <p className="text-xs text-green-300 mt-1">Stable.</p>
              )}
              {(Number(creature?.death_save_failures) || 0) >= 3 && (
                <p className="text-xs text-red-300 mt-1">Dead. Speak to your GM.</p>
              )}
              <button onClick={() => saveCreature({ death_save_successes: 0, death_save_failures: 0 })}
                className="mt-2 text-[11px] text-gray-400 underline">Clear both</button>
            </div>
          )}

          {/* Capped at the character's maximum. `Math.max(maxHp, 999)` was
              never a cap at all — it let a 44 hp fighter be healed to 999.
              Excess healing is lost in 5e; the pool that goes above your
              maximum is temporary hit points, and that is the stepper below.
              The 999 fallback is kept only for a token whose maximum is not
              known yet, so the control is not frozen at zero. */}
          <Stepper label="Hit points" value={hp} max={maxHp > 0 ? maxHp : 999}
                   onChange={(v) => { setToken((t) => ({ ...t, current_hp: v })); emit('update_token_hp', { currentHp: v }); }} tone="red" />
          <Stepper label="Temporary hit points" value={Number(token.temp_hp) || 0}
                   onChange={(v) => { setToken((t) => ({ ...t, temp_hp: v })); emit('update_token_temp_hp', { tempHp: v }); }} tone="blue" />

          {/* The action buttons.
              Built as a list rather than written out, so the last one can span
              the full width when there is an odd number of them — two of these
              are conditional (flight only for something that can, wild magic only
              for a sorcerer), so how many there are, and therefore whether the
              grid ends ragged, is only known at runtime. A single button stranded
              in a half-width cell with a hole beside it reads as a missing button.
              Each entry keeps its own tone; the shape is shared. */}
          {(() => {
            const items = [
              {
                key: 'statblock',
                onClick: () => setShowBlock(true),
                disabled: !creature,
                tone: 'bg-gray-800 border-gray-700 disabled:opacity-50',
                body: 'My stat block',
              },
              {
                key: 'skills',
                onClick: () => setShowSkills(true),
                disabled: !creature,
                tone: 'bg-gray-800 border-gray-700 disabled:opacity-50',
                body: 'Skills/Stats',
              },
              {
                key: 'features',
                onClick: () => setShowFeatures(true),
                disabled: !druidSheet,
                tone: 'bg-gray-800 border-gray-700 disabled:opacity-50',
                body: 'Features & feats',
              },
              {
                key: 'actions',
                onClick: () => setShowActions(true),
                tone: 'bg-gray-800 border-gray-700',
                body: 'Actions reference',
              },
              // Giving still lives on the inventory panel's own "Give…" link,
              // which is where you are already looking at what you carry.
              {
                key: 'conditions',
                onClick: () => setShowConds(true),
                tone: conds.length || exhaustion
                  ? 'bg-purple-900/50 border-purple-600 text-purple-100'
                  : 'bg-gray-800 border-gray-700',
                body: (
                  <>
                    In combat
                    <span className="block text-[10px] text-gray-400">
                      {[
                        'initiative',
                        conds.length ? `${conds.length} condition${conds.length === 1 ? '' : 's'}` : '',
                        exhaustion ? `exh ${exhaustion}` : '',
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </>
                ),
              },
              // Trick shots, for a Gunslinger — primary class or multiclassed.
              // Carries the grit count, because that is the question asked
              // before the shot is chosen: how many have I got left?
              gunslinger && {
                key: 'trickshots',
                onClick: () => setShowTricks(true),
                tone: gritLeft > 0
                  ? 'bg-amber-900/50 border-amber-600 text-amber-100'
                  : 'bg-gray-800 border-gray-700',
                body: (
                  <>
                    Trick shots
                    <span className="block text-[10px] text-gray-400">
                      {gunslinger.known.length} known · grit {gritLeft}/{gritTotal}
                    </span>
                  </>
                ),
              },
              // Only for a character that actually has forms. Reads as the shape
              // they are wearing when they are wearing one, so the button doubles
              // as the answer to "what am I right now?".
              forms.length > 0 && {
                key: 'wildshape',
                onClick: () => setTab('shapes'),
                tone: shifted
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-100'
                  : 'bg-gray-800 border-gray-700',
                body: (
                  <>
                    {shifted ? 'Wild shape' : 'Wild shape'}
                    <span className="block text-[10px] text-gray-400">
                      {shifted ? (creature?.name || 'shifted') : `${forms.length} form${forms.length === 1 ? '' : 's'}`}
                    </span>
                  </>
                ),
              },
              // Stepping into a possessable item. Only offered when one is
              // carried and attuned, and never while already in another form —
              // the server refuses both, and a button that always fails is
              // worse than no button.
              !shifted && possessables.length > 0 && {
                key: 'possess',
                onClick: () => possessItem(possessables[0].name),
                disabled: shifting,
                tone: 'bg-violet-900/50 border-violet-600 text-violet-100 disabled:opacity-60',
                body: (
                  <>
                    {shifting ? 'Possessing…' : 'Possess'}
                    <span className="block text-[10px] text-violet-200/70">
                      {possessables[0].name}
                    </span>
                  </>
                ),
              },
              // Getting back out. The Shapes tab has always had this, which is
              // two taps and a screen away from the one a player is looking at
              // when the fight ends.
              shifted && {
                key: 'revert',
                onClick: returnToOwnForm,
                disabled: shifting,
                tone: 'bg-amber-900/50 border-amber-600 text-amber-100 disabled:opacity-60',
                body: (
                  <>
                    {shifting
                      ? 'Changing…'
                      : possessing ? 'Leave the doll' : 'Back to your own shape'}
                    <span className="block text-[10px] text-amber-200/70">
                      {possessing
                        ? `back to ${druidSheet?.name || 'your body'}`
                        : (druidSheet?.name || 'your own form')}
                    </span>
                  </>
                ),
              },
              {
                key: 'light',
                onClick: () => setShowLight(true),
                tone: 'bg-gray-800 border-gray-700',
                body: (
                  <>
                    Light
                    <span className="block text-[10px] text-gray-400">
                      {light > 0 && lights[light] ? lights[light].label : 'none'}
                    </span>
                  </>
                ),
              },
              // Flight is a height, not a switch. The old button could only say
              // airborne or not, which the 3D view then had to guess a height
              // for — and a player hovering ten feet up behind cover and one
              // circling at ninety are in very different trouble. The server
              // treats any height above the ground as flying, so "take off" and
              // "how high" stopped being two things to keep in step.
              (canFly || token.is_flying || elevationFt !== 0) && {
                key: 'elevation',
                onClick: () => setShowElev(true),
                tone: elevationFt > 0 ? 'bg-sky-900/70 border-sky-500 text-sky-100'
                  : elevationFt < 0 ? 'bg-stone-800 border-stone-600 text-stone-200'
                  : 'bg-gray-800 border-gray-700',
                body: elevationFt === 0 ? 'Take flight' : `${elevationFt > 0 ? '▲' : '▼'} ${Math.abs(elevationFt)} ft`,
              },
              isWildMagic && {
                key: 'wildmagic',
                onClick: () => setWild(rollWildMagic()),
                tone: 'bg-gray-800 border-gray-700',
                body: 'Wild magic surge',
              },
            ].filter(Boolean);
            const odd = items.length % 2 === 1;
            return (
              <div className="grid grid-cols-2 gap-2">
                {items.map((b, idx) => (
                  <button
                    key={b.key}
                    onClick={b.onClick}
                    disabled={b.disabled}
                    className={`py-4 rounded-2xl text-base border ${b.tone}${
                      odd && idx === items.length - 1 ? ' col-span-2' : ''}`}
                  >
                    {b.body}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* The doll came apart. The server has already returned the player to
              their body; what is left is the saving throw, which is theirs to
              roll — the sheet offers the roll rather than resolving it, because
              whether a failure costs 2d6 is the GM's call at the table. */}
          {crumbled && (
            <div className="rounded-2xl border border-violet-700 bg-violet-950/50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-violet-100">
                    {crumbled.itemName} crumbles to dust
                  </div>
                  <div className="text-[12px] text-violet-200/80 mt-0.5 leading-snug">
                    You are forced back into your body. Make a DC {crumbled.dc} Dexterity saving
                    throw — on a failure you take {crumbled.damage} {crumbled.damageType} damage.
                  </div>
                </div>
                <button onClick={() => setCrumbled(null)} className="text-violet-300 px-2">×</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sv = saveRows(druidSheet).find((r) => r.key === 'save_dex');
                    rollSkill(sv || { key: 'save_dex', label: 'Dexterity', kind: 'save', mod: 0 }, null);
                  }}
                  className="h-11 rounded-xl bg-violet-900/60 border border-violet-600 text-violet-50 text-sm"
                >Roll DC {crumbled.dc} DEX save</button>
                <button
                  type="button"
                  // Exactly 2d6, not whatever the loose-dice tray is set to.
                  onClick={() => sendToTable('roll_dice', {
                    dice: 'd6', count: 2, modifier: 0, label: 'Doll crumbles — psychic damage',
                  })}
                  className="h-11 rounded-xl bg-red-950/50 border border-red-800 text-red-100 text-sm"
                >Roll {crumbled.damage} psychic</button>
              </div>
            </div>
          )}

          {wild && (
            <div className="rounded-2xl border border-fuchsia-800 bg-fuchsia-950/40 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 text-sm text-fuchsia-100">{wild.effect || 'Nothing happens.'}</div>
                <button onClick={() => setWild(null)} className="text-fuchsia-300 px-2">×</button>
              </div>
              {wild.roll != null && <div className="text-[11px] text-fuchsia-300/70 mt-1">rolled {wild.roll}{wild.band ? ` (${wild.band})` : ''}</div>}
            </div>
          )}

          {/* The shape's own traits and actions, above the weapons.
              A wild-shaped druid fights with the beast, not with the
              quarterstaff still listed below, so what the beast can do belongs
              higher up the screen than what the character was carrying. */}
          {shifted && (formAbilities.length > 0 || formMovement.length > 0 || formSenses.length > 0) && (
            <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-3 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                  {creature?.name || 'Current shape'} — traits &amp; actions
                </span>
                <span className="text-[10px] text-emerald-300/50">while shifted</span>
              </div>
              {(formMovement.length > 0 || formSenses.length > 0) && (
                <div className="space-y-2">
                  {formMovement.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Movement</div>
                      <div className="flex flex-wrap gap-1.5">
                        {formMovement.map((m) => (
                          <span key={m.label}
                            className="rounded-lg bg-gray-900/70 border border-gray-700 px-2 py-1 text-[11px] text-gray-200">
                            {m.label} <span className="font-mono text-gray-400">{m.detail}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {formSenses.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Senses</div>
                      <div className="flex flex-wrap gap-1.5">
                        {formSenses.map((x) => (
                          <span key={x.label}
                            className="rounded-lg bg-gray-900/70 border border-gray-700 px-2 py-1 text-[11px] text-gray-200">
                            {x.label}{x.detail ? <span className="font-mono text-gray-400"> {x.detail}</span> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500">
                    The board is already using these — the form's senses went onto your token when you shifted.
                  </div>
                </div>
              )}
              {formAbilities.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400">{group.label}</div>
                  {group.rows.map((row, i) => (
                    <div key={`${group.label}-${row?.name || i}`} className="rounded-xl bg-gray-900/60 border border-gray-800 p-2">
                      <div className="text-[13px] font-semibold text-gray-100">{row?.name || '—'}</div>
                      {row?.desc && (
                        <div className="text-[11px] text-gray-400 leading-snug whitespace-pre-wrap mt-0.5">{row.desc}</div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Light. Only what is actually in the pack, plus putting it out —
              the same rule the map view applies. */}
          {/* Equipped weapons used to sit here. They live on the In Combat
              panel now, with the rest of what a fight needs — initiative,
              conditions, exhaustion — rather than being spread across two
              screens. `weaponCard` still draws them; only this call site went. */}

          {/* Whatever is out on the board with you.
              A familiar takes hits like anything else, and its owner is the one
              watching it happen — but its hit points lived two taps away on the
              Companions tab, and were read-only when you got there. Same
              steppers as your own, pointed at its token. */}
          {companions.length > 0 && (
            <div className="space-y-2">
              {companions.map((c) => {
                const sheet = c.creature_id ? compCreatures[c.creature_id] : null;
                const cmax = Number(c.max_hp) || 0;
                const chp = Math.max(0, Number(c.current_hp) || 0);
                const pctC = cmax > 0 ? Math.max(0, Math.min(100, (chp / cmax) * 100)) : 0;
                // The token's own name first: a familiar summoned from a
                // binding is called whatever the binding named it ("Bramble"),
                // and falling through to the stat block would call it "Frog".
                const name = c.nickname || c.name || sheet?.name || 'Companion';
                return (
                  <div key={c.id} className="rounded-2xl border border-sky-900/60 bg-sky-950/20 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                        {sheet?.image_path && (
                          <img src={`/uploads/${sheet.image_path}`} alt="" className="w-full h-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold truncate">{name}</span>
                        <span className="block text-[10px] uppercase tracking-wide text-sky-300/70 truncate">
                          {c.companion_kind || 'familiar'}
                          {sheet ? ` · ${formatSizeType(sheet)}` : ''}
                          {sheet?.armor_class ? ` · AC ${sheet.armor_class}` : ''}
                        </span>
                      </span>
                      {sheet && (
                        <button
                          type="button"
                          onClick={() => setOpenComp(c.creature_id)}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-[11px] text-gray-300"
                        >Sheet</button>
                      )}
                    </div>
                    <span className="block h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <span
                        className={`block h-full ${chp <= 0 ? 'bg-red-700' : pctC > 50 ? 'bg-green-600' : pctC > 25 ? 'bg-yellow-600' : 'bg-red-600'}`}
                        style={{ width: `${pctC}%` }}
                      />
                    </span>
                    <Stepper
                      label={`${name} hit points`}
                      value={chp}
                      max={cmax > 0 ? cmax : 999}
                      tone="red"
                      onChange={(v) => {
                        setCompanions((prev) => prev.map((x) => (x.id === c.id ? { ...x, current_hp: v } : x)));
                        socket.emit('update_token_hp', { tokenId: c.id, currentHp: v });
                      }}
                    />
                    <Stepper
                      label="Temporary hit points"
                      value={Number(c.temp_hp) || 0}
                      tone="blue"
                      onChange={(v) => {
                        setCompanions((prev) => prev.map((x) => (x.id === c.id ? { ...x, temp_hp: v } : x)));
                        socket.emit('update_token_temp_hp', { tokenId: c.id, tempHp: v });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Hit dice, for a short rest. */}
          {hitDice.length > 0 && (
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Hit dice</div>
              {hitDice.map(({ type, qty }) => {
                const used = Math.max(0, Math.min(qty, Number(druidSheet?.hit_dice_used_by_type?.[type]) || 0));
                return (
                  <div key={type} className="flex items-center gap-3 mb-2 last:mb-0">
                    <span className="w-12 text-xs text-gray-400">{type}</span>
                    <div className="flex gap-1.5 flex-wrap flex-1">
                      {Array.from({ length: qty }).map((_, i) => {
                        const spent = i < used;
                        return (
                          <button key={i} type="button"
                            onClick={() => {
                              const next = { ...(druidSheet?.hit_dice_used_by_type || {}) };
                              next[type] = spent ? i : i + 1;
                              saveCreature({ hit_dice_used_by_type: next });
                            }}
                            className={`w-8 h-8 rounded-lg border text-[10px] ${
                              spent ? 'bg-gray-700 border-gray-600 text-gray-500' : 'bg-emerald-900/50 border-emerald-600 text-emerald-200'
                            }`}>{spent ? '' : type.replace('d', '')}</button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-gray-500 shrink-0">{qty - used}/{qty}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inspiration and the class's own pools.
              Wild Shape uses were the gap that started this: a druid could see
              their spell slots draining and had to count shifts in their head.
              Everything with a rest attached is here, pips and all, plus the
              one boolean that behaves like a resource — Heroic Inspiration. */}
          {(resourceDefs.length > 0 || druidSheet) && (
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3 space-y-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                Inspiration &amp; class resources
              </div>

              {/* One tap, because it is one thing you either have or you don't. */}
              {druidSheet && (
                <button
                  type="button"
                  onClick={() => saveCreature({ heroic_inspiration: !druidSheet.heroic_inspiration })}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left ${
                    druidSheet.heroic_inspiration
                      ? 'bg-amber-900/40 border-amber-600 text-amber-100'
                      : 'bg-gray-800/60 border-gray-700 text-gray-300'}`}
                >
                  <span className="text-sm font-medium">Heroic Inspiration</span>
                  <span className="text-[11px]">
                    {druidSheet.heroic_inspiration ? 'held — tap to spend' : 'none — tap when granted'}
                  </span>
                </button>
              )}

              {/* The catalogue hands back { def, total } pairs, not the defs
                  themselves — reading `label` off the wrapper gave every pool
                  the same blank heading. */}
              {resourceDefs.map(({ def, total: defTotal }) => {
                const total = Math.max(0, Number(defTotal ?? def.total) || 0);
                if (!total) return null;
                const used = Math.max(0, Math.min(total, Number(resourceState?.[def.id]?.used) || 0));
                return (
                  <div key={def.id} className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] text-gray-200 flex-1 min-w-0 truncate">
                        {def.label}
                        {def.die ? <span className="text-gray-500"> · {def.die}</span> : null}
                      </span>
                      <span className="text-[11px] text-gray-500 shrink-0">
                        {total - used}/{total}
                        {def.rest ? ` · ${def.rest}` : ''}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {Array.from({ length: total }).map((_, i) => {
                        const spent = i < used;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => saveCreature({
                              resource_state: {
                                ...(resourceState || {}),
                                [def.id]: { used: spent ? i : i + 1 },
                              },
                            })}
                            className={`w-8 h-8 rounded-full border ${
                              spent ? 'bg-gray-700 border-gray-600' : 'bg-emerald-800/70 border-emerald-500'
                            }`}
                            aria-label={`${def.label} use ${i + 1}`}
                          />
                        );
                      })}
                    </div>
                    {def.note && (
                      <div className="text-[10px] text-gray-500 leading-snug">{def.note}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">My inventory</div>
              {!!recipients.length && !!inventory.length && (
                <button onClick={() => { setGiving({ index: null }); setGiveNote(''); }}
                  className="text-[11px] px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-amber-300">Give…</button>
              )}
            </div>
            {/* The purse, first: "how much gold have I got" is asked far more
                often than "what is in my pack".

                One coin per card, and the steppers on their own line below the
                amount. Two earlier attempts were too cramped to use: three
                cards abreast gave each button about 28px, and putting label,
                amount and four buttons on ONE row needed 292px of fixed width
                inside the 280px a 320px phone actually has — the outer buttons
                would have been crushed to nothing. On its own line each button
                gets a clean quarter of the width, about 74px on a small phone. */}
            <div className="space-y-2 mb-3">
              {[
                { k: 'gp', label: 'Gold',   ring: 'border-amber-600/70',  text: 'text-amber-300',  dot: 'bg-amber-400' },
                { k: 'sp', label: 'Silver', ring: 'border-slate-400/60',  text: 'text-slate-200',  dot: 'bg-slate-300' },
                { k: 'cp', label: 'Copper', ring: 'border-orange-700/70', text: 'text-orange-300', dot: 'bg-orange-600' },
              ].map(({ k, label, ring, text, dot }) => (
                <div key={k} className={`rounded-xl border ${ring} bg-gray-900/70 p-2.5`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${dot}`} />
                      <span className="text-sm text-gray-300">{label}</span>
                    </span>
                    {/* Typable as well as tappable: setting 250 by hand beats
                        pressing +10 twenty-five times. */}
                    <input
                      type="number"
                      inputMode="numeric"
                      value={coins[k]}
                      onChange={(e) => setCoins({ ...coins, [k]: e.target.value })}
                      aria-label={`${label} amount`}
                      className={`h-11 w-28 shrink-0 bg-gray-800/60 border border-gray-700 rounded-xl text-center text-2xl font-semibold ${text} focus:outline-none focus:border-dnd-gold`}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[[-10, '−10'], [-1, '−1'], [1, '+1'], [10, '+10']].map(([d, lbl]) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCoins({ ...coins, [k]: coins[k] + d })}
                        aria-label={`${label} ${d > 0 ? 'plus' : 'minus'} ${Math.abs(d)}`}
                        className="h-12 rounded-xl bg-gray-800 active:bg-gray-700 text-base text-gray-200"
                      >{lbl}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {inventory.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic">Nothing carried.</p>
            ) : (
              <div className="space-y-1">
                {[
                  { key: 'worn', label: 'Equipped', rows: packRows.worn },
                  { key: 'carried', label: 'Carried', rows: packRows.carried },
                ].map((group) => (
                  group.rows.length === 0 ? null : (
                    <div key={group.key} className="space-y-1">
                      {/* Headed only when there is something in both groups —
                          a single heading over the whole pack says nothing. */}
                      {packRows.worn.length > 0 && packRows.carried.length > 0 && (
                        <div className={`text-[10px] uppercase tracking-wider ${group.key === 'worn' ? 'text-emerald-400/80' : 'text-gray-500'} px-1 ${group.key === 'carried' ? 'pt-2' : ''}`}>
                          {group.label}
                        </div>
                      )}
                      {group.rows.map(({ it, i }) => (
                        <button key={it.id ?? i} type="button"
                          onClick={() => { setViewItem(i); setAcNote(''); setWandSpell(null); setWandError(''); }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border active:bg-gray-800 text-left min-h-[52px] ${
                            it.equipped
                              ? 'bg-emerald-950/25 border-emerald-800/50'
                              : 'bg-gray-800/60 border-gray-700/60'}`}>
                          <span className="text-sm text-gray-200 min-w-0 truncate">
                            {it.name || 'Unnamed item'}
                            {it.equipped && <span className="ml-2 text-[10px] text-emerald-300">equipped</span>}
                            {it.secret_revealed && (it.gm_secret || '').trim() && (
                              <span className="ml-2 text-[10px] text-purple-300">◆ discovered</span>
                            )}
                          </span>
                          <span className="text-[11px] text-gray-500 shrink-0 flex items-center gap-1">
                            {(Number(it.qty) || 1) > 1 ? `×${it.qty}` : ''}
                            {(it.attuned || it.attunement_required || it.attunement_req) ? ' · attune' : ''}
                            <span className="text-gray-600 text-base">›</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}

          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">My notes</div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
              onBlur={saveNotes}
              rows={4}
              placeholder="Anything you want to remember…"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-base text-white"
            />
            <div className="flex justify-end mt-2">
              <button onClick={saveNotes} disabled={notesSaved}
                className="px-4 py-2 rounded-xl bg-dnd-gold disabled:opacity-40 text-gray-900 text-sm font-semibold">
                {notesSaved ? 'Saved' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handing something over. A sheet rather than a page: it is a short
          errand, and coming back to exactly where you were matters. */}
      {giving && (
        <div className="fixed inset-0 z-20 bg-black/70 flex items-end" onClick={() => !giveBusy && setGiving(null)}>
          <div className="w-full bg-gray-900 border-t border-amber-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-dnd-gold">Give an item</span>
              <button onClick={() => setGiving(null)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Two steps, not one long scroll.
                  The first version stacked "what" above "to whom", which reads
                  fine until you carry seventeen things: the item list filled the
                  sheet and the recipients sat below the fold, so choosing an item
                  appeared to do nothing at all. Choosing an item now REPLACES
                  the list, so the next decision is always on screen. */}
              {giving.index == null && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">What</div>
                <div className="space-y-1">
                  {inventory.map((it, i) => {
                    const have = Math.max(1, Number(it.qty) || 1);
                    const on = giving.index === i;
                    return (
                      <button key={it.id ?? i} type="button"
                        onClick={() => { setGiving({ index: i }); setGiveQty(1); }}
                        className={`w-full text-left px-3 py-3 rounded-xl border min-h-[52px] ${on ? 'border-dnd-gold bg-gray-800' : 'border-gray-700 bg-gray-900/60'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base text-gray-200">{it.name || 'Unnamed item'}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {have > 1 ? `×${have}` : ''}{it.equipped ? ' · equipped' : ''}{it.attuned ? ' · attuned' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {giving.index != null && (() => {
                const it = inventory[giving.index] || {};
                const have = Math.max(1, Number(it.qty) || 1);
                return (
                  <>
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-gray-800">
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-gray-500">Giving</span>
                        <span className="block text-base text-gray-100 truncate">{it.name || 'Unnamed item'}</span>
                      </span>
                      <button type="button" onClick={() => setGiving({ index: null })}
                        className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300">
                        Change
                      </button>
                    </div>
                    {have > 1 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">How many</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setGiveQty((q) => Math.max(1, q - 1))} className="w-12 h-12 rounded-xl bg-gray-800 text-lg">−</button>
                          <div className="flex-1 text-center text-2xl">{giveQty}</div>
                          <button onClick={() => setGiveQty((q) => Math.min(have, q + 1))} className="w-12 h-12 rounded-xl bg-gray-800 text-lg">+</button>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">To whom</div>
                      {recipients.length === 0 && (
                        <p className="text-[11px] text-gray-500 italic">
                          Nobody to give to — no other player characters are on your map.
                        </p>
                      )}
                      <div className="space-y-1">
                        {recipients.map((r) => (
                          <button key={r.id} type="button" disabled={giveBusy}
                            onClick={() => {
                              setGiveBusy(true);
                              socket.emit('player_give_item', {
                                fromTokenId: myTokenId, toTokenId: r.id,
                                itemIndex: giving.index, itemName: it.name, qty: giveQty,
                              });
                              // The server broadcasts both inventories; wait for
                              // that to land so the same item can't be given twice.
                              setGiveNote(`Gave ${giveQty > 1 ? `${giveQty} × ` : ''}${it.name || 'item'} to ${r.label}.`);
                              setTimeout(() => { setGiveBusy(false); setGiving(null); }, 600);
                            }}
                            className="w-full text-left px-3 py-3 rounded-xl border border-gray-700 bg-gray-900/60 active:bg-gray-800 min-h-[52px] disabled:opacity-50">
                            <span className="text-base text-gray-200">{r.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Dice. The roller emits `roll_dice` itself and the result comes back on
          `dice_rolled`, so every roll made here lands in the table's shared log
          exactly like one made on the map view — no private rolls by accident. */}
      {/* The dice, always within thumb reach.
          Fixed rather than in the page flow: the sheet is long, and a roll is
          asked for at whatever point of it you happen to be looking at. Bottom
          right, clear of the safe area, and it hides itself while a sheet is
          open so it cannot sit on top of the very modal it opens. */}
      {!showDice && !showTricks && !showConds && !showElev && !showLight && !giving && viewItem == null && !viewSpell && (
        <button
          type="button"
          onClick={() => setShowDice(true)}
          aria-label="Roll dice"
          className="fixed z-40 right-4 w-16 h-16 rounded-full bg-amber-900/90 border border-amber-600 text-amber-100 shadow-xl shadow-black/50 active:bg-amber-800 flex flex-col items-center justify-center leading-none"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <span className="text-2xl">⬣</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Dice</span>
        </button>
      )}

      {/* LOOK UP, ON THE SAME ROW AS THE DICE.
          It was a tile on the Me tab, which meant scrolling back to the top of
          a long sheet to reach it. Both of these are wanted at a moment's
          notice, mid-turn, so both live where the thumb already is. The dice
          keeps the corner; this fills the rest of the row and is drawn as the
          field it opens, because a magnifier alone does not say what it
          searches. It hides with the dice while a sheet is open, for the same
          reason — it must not sit on top of the modal it would cover. */}
      {!showDice && !showTricks && !showConds && !showElev && !showLight && !giving && viewItem == null && !viewSpell && (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          aria-label="Look up a rule, spell, item or monster"
          className="fixed z-40 left-4 right-[5.5rem] h-16 pl-4 pr-4 rounded-2xl bg-gray-800/95 border border-gray-600
                     text-gray-300 shadow-xl shadow-black/50 active:bg-gray-700 flex items-center gap-2.5"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" className="w-5 h-5 shrink-0 text-dnd-gold">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
          <span className="text-sm truncate">Look up a rule, spell, item…</span>
        </button>
      )}

      {/* TRICK SHOTS, WITH THE GRIT IN THE HEADER.
          A trick shot is chosen mid-attack, so the thing being decided is
          "which one, and can I afford it" — the panel answers both in one
          screen and spends the point for you, rather than sending the player
          off to the resources list to tick a pip by hand. */}
      {showTricks && gunslinger && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end" onClick={() => setShowTricks(false)}>
          <div className="w-full bg-gray-900 border-t border-amber-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-dnd-gold">Trick shots</span>
              <div className="flex items-center gap-3">
                <span className={`text-[12px] ${gritLeft > 0 ? 'text-amber-200' : 'text-gray-500'}`}>
                  Grit {gritLeft}/{gritTotal}
                </span>
                <button onClick={() => setShowTricks(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <p className="text-[11px] text-gray-400 leading-snug">
                Declared before the attack roll, one per attack. Save DC {gunslinger.saveDc}
                {' '}(8 + proficiency + Dexterity).
              </p>
              {!gunslinger.recorded && (
                <p className="text-[11px] text-amber-200/80 leading-snug">
                  Your sheet does not say which you know, so all eight are listed. Pick yours under
                  class choices on the character sheet and this list follows.
                </p>
              )}
              {gritTotal === 0 && (
                <p className="text-[11px] text-amber-200/80 leading-snug">
                  No grit on your sheet yet — it comes from your Wisdom modifier, so check that it is set.
                </p>
              )}

              {gunslinger.known.map((shot) => (
                <div key={shot.id} className="rounded-xl bg-gray-800/70 border border-gray-700 p-3">
                  <div className="text-sm font-semibold text-gray-100">{shot.name}</div>
                  <div className="text-[12px] text-gray-400 leading-snug mt-1">{shot.desc}</div>
                  <button
                    type="button"
                    disabled={gritLeft < 1}
                    onClick={() => spendGrit(1)}
                    className="mt-2 w-full py-2 rounded-lg bg-amber-900/70 border border-amber-700 text-amber-100
                               text-[12px] font-semibold active:bg-amber-800 disabled:opacity-40"
                  >
                    {gritLeft < 1 ? 'No grit left' : 'Spend 1 grit'}
                  </button>
                </div>
              ))}

              {/* Getting it back. The two ways that happen at the table are a
                  natural 20 and a killing blow, and both are noticed by the
                  player rather than by the server — so the button is here. */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={gritUsed < 1}
                  onClick={() => spendGrit(-1)}
                  className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-[12px] disabled:opacity-40"
                >Regain 1 grit</button>
                <button
                  type="button"
                  disabled={gritUsed < 1}
                  onClick={() => saveCreature({ resource_state: { ...(resourceState || {}), grit: { used: 0 } } })}
                  className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-[12px] disabled:opacity-40"
                >All back (rest)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDice && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end" onClick={() => setShowDice(false)}>
          <div className="w-full bg-gray-900 border-t border-amber-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-dnd-gold">Dice</span>
              <button onClick={() => setShowDice(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>
            <div className="p-3">
          <div className="p-1">

            {/* How the next die is thrown. A persistent choice rather than a
                per-die prompt: at a table you are told "roll with advantage"
                once and then throw whatever is asked for. */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[[null, 'Normal'], ['advantage', 'Advantage'], ['disadvantage', 'Disadvantage']].map(([m, label]) => (
                <button key={label} type="button" onClick={() => setDieMode(m)}
                  className={`py-2 rounded-lg text-[11px] font-semibold border ${
                    dieMode === m
                      ? (m === 'advantage' ? 'bg-emerald-900/60 border-emerald-600 text-emerald-100'
                        : m === 'disadvantage' ? 'bg-rose-950/60 border-rose-800 text-rose-100'
                        : 'bg-gray-700 border-gray-500 text-gray-100')
                      : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((d) => (
                <button key={d} type="button" onClick={() => rollLoose(d)}
                  className="py-3 rounded-xl bg-gray-800 border border-gray-700 active:bg-gray-700 font-mono text-sm text-gray-100">
                  {dieCount > 1 ? dieCount : ''}{d}
                </button>
              ))}
              {/* Reset sits in the grid's last cell so the row is never ragged. */}
              <button type="button" onClick={() => { setDieCount(1); setDieMod(0); setDieMode(null); }}
                disabled={dieCount === 1 && dieMod === 0 && dieMode === null}
                className="py-3 rounded-xl bg-gray-800/50 border border-gray-700/60 text-[11px] text-gray-500 disabled:opacity-40">
                Reset
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-gray-500 w-12">How many</span>
              <button type="button" onClick={() => setDieCount((n) => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">−</button>
              <span className="w-7 text-center font-mono text-gray-100">{dieCount}</span>
              <button type="button" onClick={() => setDieCount((n) => Math.min(20, n + 1))}
                className="w-10 h-10 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">+</button>
              <span className="text-[11px] text-gray-500 w-8 text-right">mod</span>
              <button type="button" onClick={() => setDieMod((n) => Math.max(-20, n - 1))}
                className="w-10 h-10 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">−</button>
              <span className="w-9 text-center font-mono text-gray-100">{dieMod >= 0 ? `+${dieMod}` : dieMod}</span>
              <button type="button" onClick={() => setDieMod((n) => Math.min(20, n + 1))}
                className="w-10 h-10 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">+</button>
            </div>

            {dieMode && dieCount > 1 && (
              <p className="text-[10px] text-amber-300/80 mt-1.5">
                {dieMode === 'advantage' ? 'Advantage' : 'Disadvantage'} applies to a single die only — {dieCount} dice will roll straight.
              </p>
            )}

            {/* The table's last few throws, so a result does not vanish the
                moment the next person rolls. */}
            {recentRolls.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/70 space-y-1">
                {recentRolls.map((r) => {
                  const die = r.kept ?? (r.rolls?.length === 1 ? r.rolls[0] : null);
                  return (
                    <div key={r.id} className="flex items-baseline gap-2 text-[11px]">
                      <span className={`font-bold text-base ${
                        die === 20 ? 'text-amber-300' : die === 1 ? 'text-red-400' : 'text-gray-100'}`}>{r.total}</span>
                      <span className="text-gray-500 truncate">
                        {r.userName === name ? 'you' : r.userName} · {r.count > 1 ? r.count : ''}{r.dice}
                        {r.modifier ? (r.modifier > 0 ? `+${r.modifier}` : r.modifier) : ''}
                        {r.rolls?.length > 1 ? ` → ${r.rolls.join(', ')}` : ''}
                        {r.mode === 'advantage' ? ' adv' : r.mode === 'disadvantage' ? ' dis' : ''}
                        {r.label ? ` · ${r.label}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      )}

      {/* How high. Steps of 5 ft because the grid is 5 ft and altitude is
          measured in squares like everything else; the presets are the heights
          that actually come up — head height, above the treeline, out of reach.
          A character with a fly speed gets that as a preset too, since one round
          of flying up is the commonest answer to "how high are you?". */}
      {showElev && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end" onClick={() => setShowElev(false)}>
          <div className="w-full bg-gray-900 border-t border-sky-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-sky-200">Elevation</span>
              <button onClick={() => setShowElev(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <div className={`text-5xl font-bold ${
                  elevationFt > 0 ? 'text-sky-200' : elevationFt < 0 ? 'text-stone-300' : 'text-gray-400'}`}>
                  {elevationFt}<span className="text-xl text-gray-500 ml-1">ft</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {elevationFt > 0 ? 'airborne'
                    : elevationFt < 0 ? 'below the board'
                    : 'on the ground'}
                  {flySpeed > 0 ? ` · fly ${flySpeed} ft` : ''}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button type="button" onClick={() => emit('set_token_elevation', { elevation: elevationFt - 5 })}
                  className="w-16 h-14 rounded-xl bg-gray-800 active:bg-gray-700 text-2xl">−5</button>
                <button type="button" onClick={() => emit('set_token_elevation', { elevation: elevationFt - 1 })}
                  className="w-14 h-14 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">−1</button>
                <button type="button" onClick={() => emit('set_token_elevation', { elevation: elevationFt + 1 })}
                  className="w-14 h-14 rounded-xl bg-gray-800 active:bg-gray-700 text-lg">+1</button>
                <button type="button" onClick={() => emit('set_token_elevation', { elevation: elevationFt + 5 })}
                  className="w-16 h-14 rounded-xl bg-sky-900/60 border border-sky-700 active:bg-sky-900 text-2xl text-sky-100">+5</button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ...(flySpeed > 0 ? [[flySpeed, `Fly ${flySpeed} ft`]] : []),
                  [5, '5 ft'], [10, '10 ft'], [20, '20 ft'], [30, '30 ft'], [60, '60 ft'], [120, '120 ft'],
                ].map(([ft, label]) => (
                  <button key={label} type="button"
                    onClick={() => emit('set_token_elevation', { elevation: ft })}
                    className={`py-3 rounded-xl text-sm border ${
                      elevationFt === ft ? 'bg-sky-900/70 border-sky-500 text-sky-100' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <button type="button" onClick={() => emit('set_token_elevation', { elevation: 0 })}
                disabled={elevationFt === 0}
                className="w-full py-4 rounded-xl bg-gray-800 border border-gray-600 text-gray-100 font-semibold disabled:opacity-40">
                Land
              </button>
              <p className="text-[10px] text-gray-500 leading-snug">
                Anything above the ground counts as flying, so the token shows airborne
                on the map and in 3D without a separate switch. The GM can move you too.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conditions, off the main screen now.
          Unchanged in behaviour — the same chips, the same exhaustion counter —
          only somewhere else, because what you are suffering is read once a
          fight and the dice are reached for every turn. */}
      {showConds && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end" onClick={() => setShowConds(false)}>
          <div className="w-full bg-gray-900 border-t border-purple-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-purple-200">In combat</span>
              <button onClick={() => setShowConds(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>
            <div className="p-3 space-y-3">

          {/* INITIATIVE, ROLLED AND FILED.
              The result is written onto this token by the roll handler, so the
              GM's order fills itself in — nobody reads a number across the
              table for someone else to type. */}
          <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-amber-300/90">Initiative</div>
                <div className="text-[11px] text-gray-400">
                  d20 {initiativeMod >= 0 ? '+' : '−'}{Math.abs(initiativeMod)}
                  {token?.initiative != null && token.initiative !== ''
                    ? ` · on the map: ${token.initiative}`
                    : ' · not rolled yet'}
                </div>
              </div>
              {(() => {
                const r = rolls.initiative;
                const die = r && !r.pending ? (r.kept ?? r.rolls?.[0]) : null;
                return (
                  <button
                    type="button"
                    onClick={rollInitiative}
                    disabled={!myTokenId || r?.pending}
                    className="min-w-[7rem] h-12 rounded-xl bg-amber-900/60 border border-amber-600 active:bg-amber-800/70 disabled:opacity-50 px-3 text-left"
                  >
                    {r?.pending ? (
                      <span className="text-sm text-amber-200/70">rolling…</span>
                    ) : die != null ? (
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-amber-100">{r.total}</span>
                        <span className="text-[10px] text-amber-300/70">d20 {die}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-amber-100 font-semibold">Roll initiative</span>
                    )}
                  </button>
                );
              })()}
            </div>
            {!myTokenId && (
              <p className="text-[11px] text-gray-500 mt-1.5">
                You need to be on the map before this can be filed.
              </p>
            )}
          </div>

          {/* What you are holding. Here as well as on the home screen: this is
              the panel a player opens when the fight starts, and "what am I
              swinging and what does it hit for" is the other half of that
              question. */}
          {equippedWeapons.length > 0 && (
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Equipped weapons</div>
              {/* The same card the home screen draws, buttons and all — this is
                  the panel you have open when the fight starts, so the attack
                  and damage rolls have to be here rather than a screen away. */}
              <div className="space-y-3">
                {equippedWeapons.map((row) => weaponCard(row))}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Conditions</div>
            <div className="flex flex-wrap gap-2">
              {SELF_CONDITIONS.map((c) => {
                const on = conds.includes(c);
                return (
                  <button key={c} type="button"
                    onClick={() => {
                      const next = on ? conds.filter((x) => x !== c) : [...conds, c];
                      setToken((t) => ({ ...t, conditions: next }));
                      emit('update_token_conditions', { conditions: next });
                    }}
                    className={`px-3 py-2 rounded-xl text-sm capitalize border ${on ? 'bg-purple-900/70 border-purple-500 text-purple-100' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >{c}</button>
                );
              })}
            </div>
            {conds.filter((c) => !SELF_CONDITIONS.includes(c)).length > 0 && (
              <p className="text-[11px] text-gray-500 mt-2">
                Also on you (the GM's to clear): {conds.filter((c) => !SELF_CONDITIONS.includes(c)).join(', ')}
              </p>
            )}

            {/* Exhaustion belongs here rather than among the action buttons: it
                is a status you are under, not something you do. A counter
                rather than a chip, because it has six levels and each one
                matters — a chip could only say "yes". */}
            <div className="mt-3 pt-3 border-t border-gray-700/70 flex items-center gap-3">
              <span className="text-sm text-gray-300 flex-1">Exhaustion</span>
              <button type="button"
                onClick={() => emit('set_token_exhaustion', { level: Math.max(0, exhaustion - 1) })}
                disabled={exhaustion === 0}
                aria-label="Reduce exhaustion"
                className="w-11 h-11 rounded-xl bg-gray-800 active:bg-gray-700 disabled:opacity-40 text-xl">−</button>
              <span className={`w-10 text-center text-2xl font-semibold ${
                exhaustion === 0 ? 'text-gray-500'
                  : exhaustion >= 5 ? 'text-red-400'
                  : exhaustion >= 3 ? 'text-orange-400' : 'text-amber-300'
              }`}>{exhaustion}</span>
              <button type="button"
                onClick={() => emit('set_token_exhaustion', { level: Math.min(6, exhaustion + 1) })}
                disabled={exhaustion >= 6}
                aria-label="Increase exhaustion"
                className="w-11 h-11 rounded-xl bg-gray-800 active:bg-gray-700 disabled:opacity-40 text-xl">+</button>
            </div>
            {exhaustion > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5">{EXHAUSTION_EFFECT[exhaustion]}</p>
            )}
          </div>
            </div>
          </div>
        </div>
      )}

      {/* Light on its own now rather than inline: it is something you go and
          change, not something you read. The options are whatever the map view's
          light button offers this character — no invented ones. */}
      {showLight && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end" onClick={() => setShowLight(false)}>
          <div className="w-full bg-gray-900 border-t border-amber-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-dnd-gold">Light</span>
              <button onClick={() => setShowLight(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>
              <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {lights.map((l, i) => {
                  const on = light === i;
                  return (
                    <button key={l.key || l.label} type="button"
                      onClick={() => {
                        setLight(i);
                        emit('set_token_light', {
                          brightFt: l.brightFt, dimFt: l.dimFt,
                          // The preset's own colour — a green lantern or a
                          // violet faerie fire lights in its own colour.
                          color: l.color || '#fbbf24',
                          flicker: l.flicker !== false,
                        });
                      }}
                      className={`px-4 py-3 rounded-xl text-sm border min-h-[48px] text-left ${
                        on ? 'bg-amber-900/60 border-amber-500 text-amber-100' : 'bg-gray-800 border-gray-700 text-gray-300'
                      }`}>
                      <span className="flex items-center gap-2">
                        {l.brightFt || l.dimFt ? (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color || '#fbbf24' }} />
                        ) : null}
                        {l.label}
                      </span>
                      {(l.brightFt || l.dimFt) ? (
                        <span className="block text-[10px] text-gray-400">
                          {l.brightFt}/{l.dimFt} ft{l.isSpell ? ' · spell' : ''}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {lights.length === 1 && (
                <p className="text-[10px] text-gray-500 mt-2">
                  You have nothing that sheds light — no torch, lantern or candle, no light spell,
                  and nothing in your pack marked as glowing.
                </p>
              )}
              {litIndex === -1 && (
                <p className="text-[10px] text-gray-500 mt-2">
                  Something else is lighting you — a spell, or the GM. Pick one above to take it over.
                </p>
              )}
              </div>
          </div>
        </div>
      )}

      {/* One item, in full. Sheets carry a lot of optional fields, so every row
          here is conditional — an empty labelled row tells the reader nothing
          and makes a dagger look like a form someone failed to fill in. */}
      {viewItem != null && inventory[viewItem] && (() => {
        const it = inventory[viewItem];
        const type = it.item_type || 'item';
        // Weapon numbers are CALCULATED, the way the character sheet calculates
        // them — the stored fields are only the ingredients. A +1 flail stores
        // "1d8 + 4" and STR is added on top, so printing the stored string gave
        // "1d8 + 4" where the sheet says "1d8 + 7 (1d8 + STR +3 + magic +4)".
        // Same helpers as StatBlock, so the two cannot disagree.
        const entries = (Array.isArray(it.damage_entries) && it.damage_entries.length)
          ? it.damage_entries.map((e) => ({ ...e, damage: entryDice(e), damage_type: entryType(e) }))
          : (it.damage ? [{ damage: it.damage, damage_type: it.damage_type || '' }] : []);
        const modes = it.item_type === 'weapon'
          ? weaponDamageModes({ ...it, damage_entries: entries })
          : [];
        const prof = Number(creature?.proficiency_bonus) ?? 2;
        const pickFor = (stat) => weaponDamageMod(it, creature, stat || '');
        const toHit = it.item_type === 'weapon'
          ? pickFor('').mod + (Number(prof) || 0) + (Number(it.attack_bonus_misc) || 0)
          : null;
        // Worth an equip button: armour and weapons, anything that grants AC,
        // and anything with a body slot. A rope is not.
        const equippable = type === 'armor' || type === 'weapon'
          || Number(it.ac_bonus) > 0 || !!it.slot || type === 'wondrous_item';
        const Row = ({ label, children }) => (
          <div className="flex justify-between gap-3 py-1.5 border-b border-gray-800 last:border-0">
            <span className="text-[11px] text-gray-500 shrink-0">{label}</span>
            <span className="text-sm text-gray-200 text-right">{children}</span>
          </div>
        );
        return (
          <div className="fixed inset-0 z-30 bg-black/80 flex items-end" onClick={() => setViewItem(null)}>
            <div className="w-full bg-gray-900 border-t border-amber-800/70 rounded-t-2xl max-h-[88dvh] overflow-y-auto"
                 style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                 onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gray-900 flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-700">
                <div className="min-w-0">
                  <div className="font-semibold text-dnd-gold truncate">{it.name || 'Unnamed item'}</div>
                  <div className="text-[11px] text-gray-500 capitalize">
                    {String(type).replace(/_/g, ' ')}
                    {(Number(it.qty) || 1) > 1 ? ` · ×${it.qty}` : ''}
                    {it.equipped ? ' · equipped' : ''}
                    {(it.attuned || it.attunement_required || it.attunement_req) ? ' · attunement' : ''}
                    {it.rarity ? ` · ${it.rarity}` : ''}
                  </div>
                </div>
                <button onClick={() => setViewItem(null)} className="text-gray-400 text-2xl leading-none px-2">×</button>
              </div>

              <div className="p-4 space-y-3">
                {/* The headline for a weapon: what you roll to hit, then each
                    way it can be swung, with the arithmetic shown. */}
                {toHit != null && (
                  <div className="flex items-baseline gap-2 pb-2">
                    <span className="text-2xl font-mono text-green-400">{toHit >= 0 ? '+' : ''}{toHit}</span>
                    <span className="text-xs text-gray-500">to hit</span>
                  </div>
                )}

                {modes.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    {modes.map((m) => {
                      const pick = pickFor(m.stat);
                      const bd = damageParts(m.damage, pick.mod, pick.abbr, pick.misc);
                      return (
                        <div key={m.key} className="text-sm">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[11px] text-gray-500 w-20 shrink-0">{m.label}</span>
                            <span className="font-mono text-gray-100">
                              {formatDamageWithMod(m.damage, pick.total)}
                              {m.damage_type ? ` ${formatDamageType(m.damage_type)}` : ''}
                            </span>
                          </div>
                          {bd.parts.length > 0 && (
                            <div className="text-[11px] text-gray-500 pl-[5.5rem]">
                              {bd.dice} + {bd.parts.join(' + ')}
                            </div>
                          )}
                          {m.range && <div className="text-[11px] text-gray-500 pl-[5.5rem]">{m.range}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Conditional extra damage — printed, never rolled into an
                    ordinary hit. A Sword of Sharpness's 14 Slashing applies
                    only on a natural 20, so it gets its own line stating the
                    condition rather than a button that would let it be added
                    to any swing. */}
                {(() => {
                  const riders = weaponDamageRiders({ ...it, damage_entries: entries });
                  if (!riders.length) return null;
                  return (
                    <div className="space-y-1.5 pb-1 border-t border-gray-800 pt-2">
                      {riders.map((r) => (
                        <div key={r.key} className="text-sm">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[11px] text-amber-400/90 w-20 shrink-0">Extra</span>
                            <span className="font-mono text-amber-200">
                              +{r.damage}{r.damage_type ? ` ${formatDamageType(r.damage_type)}` : ''}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 pl-[5.5rem]">{r.condition}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div>
                  {/* Non-weapon damage (a potion, a trap) has no stat to add. */}
                  {modes.length === 0 && entries.length > 0 && (
                    <Row label="Damage">
                      {entries.map((d, i) => (
                        <span key={i}>{i > 0 ? ' + ' : ''}{d.damage}{d.damage_type ? ` ${formatDamageType(d.damage_type)}` : ''}</span>
                      ))}
                    </Row>
                  )}
                  {modes.length === 0 && (it.weapon_range || it.range) && (
                    <Row label="Range">{it.weapon_range || it.range}</Row>
                  )}
                  {Number(it.ac_base) > 0 && (
                    <Row label="Armour">
                      base {it.ac_base}
                      {it.armor_category ? ` · ${it.armor_category}` : ''}
                    </Row>
                  )}
                  {Number(it.ac_bonus) > 0 && <Row label="AC bonus">+{it.ac_bonus}</Row>}
                  {it.stealth_disadvantage ? <Row label="Stealth">Disadvantage</Row> : null}
                  {it.str_req ? <Row label="Strength">{it.str_req} required</Row> : null}
                  {it.mastery ? <Row label="Mastery">{it.mastery}</Row> : null}
                  {it.properties && <Row label="Properties">{it.properties}</Row>}
                  {it.sheds_light ? (
                    <Row label="Sheds light">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.light_color || '#fbbf24' }} />
                        {Number(it.bright_ft) || 0}/{Number(it.dim_ft) || 0} ft
                      </span>
                    </Row>
                  ) : null}
                  {it.weight ? <Row label="Weight">{it.weight}</Row> : null}
                  {it.value ? <Row label="Value">{it.value}</Row> : null}
                  {it.slot ? <Row label="Slot">{it.slot}</Row> : null}
                </div>

                {/* A mastery is a rule, not a label. "Sap" on its own tells a
                    player nothing, and nothing else in the app explains it. */}
                {it.mastery && masteryText(it.mastery) && (
                  <div className="rounded-xl bg-gray-800/60 border border-gray-700/60 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-amber-300 mb-1">
                      {it.mastery} — weapon mastery
                    </div>
                    <p className="text-sm text-gray-300 leading-snug">{masteryText(it.mastery)}</p>
                  </div>
                )}

                {(it.desc || it.description) && (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-snug">{it.desc || it.description}</p>
                )}

                {/* The spell the item casts, in full. A scroll IS its spell,
                    and the item's own prose is only the rules for burning it. */}
                {Array.isArray(itemSpell) && itemSpell.length > 0 && (
                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-700/70 p-3 space-y-3">
                    <div className="text-[11px] uppercase tracking-wide text-indigo-300">
                      {itemSpell.length > 1 ? 'The spells it casts' : 'The spell on it'}
                    </div>

                    {itemSpell.map((entry, ei) => (
                      <div key={`${entry.name}-${ei}`} className={ei > 0 ? 'border-t border-indigo-800/50 pt-3' : ''}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-indigo-100">
                        {entry.name}
                        {entry.cost > 0 && (
                          <span className="ml-1.5 text-[11px] font-normal text-indigo-300/80">
                            {entry.cost} charge{entry.cost === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                      {entry.status === 'ok' && (
                        <button
                          type="button"
                          onClick={() => setViewSpell(entry.spell)}
                          className="text-[11px] text-indigo-200 underline underline-offset-2 shrink-0"
                        >Open for rolls</button>
                      )}
                    </div>

                    {entry.status === 'loading' && (
                      <p className="text-[12px] text-indigo-200/70 italic">Looking up {entry.name}…</p>
                    )}
                    {entry.status === 'missing' && (
                      <p className="text-[12px] text-indigo-200/70">
                        {entry.name} is not in the spell library yet, so there is nothing to show.
                        Ask your GM to import it.
                      </p>
                    )}
                    {entry.status === 'ok' && (() => {
                      const sp = entry.spell;
                      const lvl = Number(sp.level) || 0;
                      // `type` is the app's own combat/healing/utility grouping,
                      // not something a spell entry prints — it reads as a rules
                      // term next to the school and is not one.
                      const bits = [
                        lvl === 0 ? 'Cantrip' : `Level ${lvl}`,
                        sp.school || '',
                      ].filter(Boolean);
                      // Components are three flags and a materials string in
                      // the library, not one field — assembled here the way a
                      // spell entry prints them: "V, S, M (a ball of bat guano)".
                      const comps = [
                        sp.comp_v ? 'V' : '', sp.comp_s ? 'S' : '', sp.comp_m ? 'M' : '',
                      ].filter(Boolean).join(', ');
                      const compText = comps
                        + (sp.comp_m && String(sp.comp_m_text || '').trim()
                          ? ` (${String(sp.comp_m_text).trim()})` : '');
                      const rows = [
                        ['Casting time', sp.casting_time],
                        ['Range', sp.range_area],
                        ['Components', compText],
                        ['Duration', sp.duration],
                      ].filter(([, v]) => String(v || '').trim());
                      return (
                        <>
                          <div className="text-[11px] text-indigo-300/80">{bits.join(' · ')}</div>
                          {rows.length > 0 && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                              {rows.map(([label, v]) => (
                                <div key={label} className="min-w-0">
                                  <span className="block text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
                                  <span className="block text-[12px] text-gray-200 break-words">{v}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {sp.description && (
                            <p className="text-[13px] text-gray-300 whitespace-pre-wrap leading-snug pt-1">
                              {sp.description}
                            </p>
                          )}
                          {sp.extra_effects && (
                            <p className="text-[12px] text-indigo-200/80 whitespace-pre-wrap leading-snug">
                              {sp.extra_effects}
                            </p>
                          )}
                        </>
                      );
                    })()}
                      </div>
                    ))}
                  </div>
                )}

                {/* The wand's roller. Shown only on an item that says it
                    recasts as a random spell of the same level. */}
                {rollsARandomSpell(it) && (
                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-700/70 p-3 space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-indigo-300">
                      What it becomes instead
                    </div>
                    <div className="text-[11px] text-indigo-200/70 leading-snug">
                      Tap the level of the spell that failed.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                        <button key={lvl} type="button"
                          onClick={() => setWandLevel(lvl)}
                          className={`h-9 rounded-lg text-sm border ${lvl === 0 ? 'px-2.5 text-xs' : 'w-9 font-mono'} ${
                            wandLevel === lvl
                              ? 'bg-indigo-600 border-indigo-400 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                          {lvl === 0 ? 'Cantrip' : lvl}
                        </button>
                      ))}
                    </div>
                    <button type="button" disabled={wandBusy}
                      onClick={() => rollWandSpell(wandLevel)}
                      className="w-full py-3 rounded-xl font-semibold bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-400 text-white">
                      {wandBusy
                        ? 'Rolling…'
                        : `Roll ${wandSpell ? 'another' : 'a'} ${wandLevel === 0 ? 'cantrip' : `level ${wandLevel} spell`}`}
                    </button>
                    {wandError && (
                      <p className="text-[11px] text-amber-200 leading-snug">{wandError}</p>
                    )}
                    {wandSpell && !wandError && (
                      <div className="rounded-lg bg-gray-900/70 border border-indigo-800/60 p-2.5 space-y-1">
                        <div className="text-base font-semibold text-indigo-100">{wandSpell.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {wandSpell._level === 0 ? 'Cantrip' : `Level ${wandSpell._level}`}
                          {wandSpell.school ? ` · ${wandSpell.school}` : ''}
                          {wandSpell.casting_time ? ` · ${wandSpell.casting_time}` : ''}
                          {wandSpell.range_area ? ` · ${wandSpell.range_area}` : ''}
                          {wandSpell.duration ? ` · ${wandSpell.duration}` : ''}
                        </div>
                        {wandSpell.description && (
                          <p className="text-xs text-gray-300 whitespace-pre-wrap leading-snug max-h-52 overflow-y-auto overscroll-contain">
                            {wandSpell.description}
                          </p>
                        )}
                        <div className="text-[10px] text-gray-600">
                          1 of {wandSpell._pool} {wandSpell._level === 0 ? 'cantrips' : `level ${wandSpell._level} spells`} in the library · only this screen has seen it
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Something discovered about this item.
                    Only ever present once the GM has revealed it — the server
                    does not send the text at all before that, so there is
                    nothing here to find early. */}
                {it.secret_revealed && (it.gm_secret || '').trim() && (
                  <div className="rounded-xl bg-purple-950/40 border border-purple-700 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-purple-300 mb-1">Discovered</div>
                    <p className="text-sm text-purple-100 whitespace-pre-wrap leading-snug">{it.gm_secret}</p>
                  </div>
                )}

                {acNote && (
                  <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-xl p-2 leading-snug">{acNote}</p>
                )}

                {equippable && (() => {
                  const isBodyArmor = it.item_type === 'armor' && (it.armor_category || '') !== 'shield';
                  if (!isBodyArmor || !wornArmorBlocked(creature)) return null;
                  const nat = naturalArmorOf(creature);
                  return (
                    <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-xl p-2 leading-snug">
                      Your natural armor keeps your AC at {nat?.base ?? '—'}, and body armor can't be worn over it.
                      Shields and worn magic items still count.
                    </p>
                  );
                })()}

                {equippable && (
                  <button type="button" onClick={() => toggleEquip(viewItem)}
                    disabled={it.item_type === 'armor' && (it.armor_category || '') !== 'shield'
                      && !it.equipped && wornArmorBlocked(creature)}
                    className={`w-full py-3 rounded-xl font-semibold disabled:opacity-40 ${
                      it.equipped ? 'bg-gray-800 border border-gray-600 text-gray-200' : 'bg-dnd-gold text-gray-900'
                    }`}>
                    {it.equipped ? 'Take off' : 'Equip'}
                  </button>
                )}
                {!equippable && (
                  <p className="text-[11px] text-gray-500 text-center">Nothing to equip on this one.</p>
                )}

                {/* Getting rid of it. Behind a confirmation because it cannot
                    be undone from here — the GM can hand it back, but the
                    player cannot fish it out of a bin. */}
                {dropping?.index === viewItem ? (
                  <div className="rounded-xl border border-red-800/70 bg-red-950/40 p-3 space-y-2">
                    <p className="text-[13px] text-red-100">
                      Drop {it.name || 'this'}? Your GM would have to give it back.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Number(it.qty) || 1) > 1 && (
                        <button type="button"
                          onClick={() => dropItem(viewItem, 1)}
                          className="h-12 rounded-xl bg-red-900/60 border border-red-700 text-red-50 text-sm font-semibold"
                        >Drop one</button>
                      )}
                      <button type="button"
                        onClick={() => dropItem(viewItem, Number(it.qty) || 1)}
                        className={`h-12 rounded-xl bg-red-900/60 border border-red-700 text-red-50 text-sm font-semibold ${
                          (Number(it.qty) || 1) > 1 ? '' : 'col-span-2'}`}
                      >{(Number(it.qty) || 1) > 1 ? `Drop all ${it.qty}` : 'Drop it'}</button>
                      <button type="button"
                        onClick={() => setDropping(null)}
                        className="h-12 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 text-sm col-span-2"
                      >Keep it</button>
                    </div>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => setDropping({ index: viewItem })}
                    className="w-full py-3 rounded-xl bg-gray-800 border border-red-900/70 text-red-300 text-sm font-semibold"
                  >Drop{(Number(it.qty) || 1) > 1 ? `… (${it.qty})` : ''}</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {viewSpell && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
             onClick={() => setViewSpell(null)}>
          <div className="w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-gray-900 border-t sm:border border-gray-700 sm:rounded-2xl"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-dnd-gold truncate">{viewSpell.name}</span>
              <button onClick={() => setViewSpell(null)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>
            {/* Rolls for this spell, above its text: mid-fight the buttons are
                what you came for, and the description is reference. */}
            {(() => {
              const sc = spellcasting(viewSpell);
              const atk = ['ranged', 'melee'].includes(String(viewSpell.attack_save || '').toLowerCase());
              const saves = String(viewSpell.attack_save || '').toLowerCase() === 'save';
              const entries = (Array.isArray(viewSpell.damage_entries) ? viewSpell.damage_entries : [])
                .map((e, idx) => ({ e, idx, spec: parseDamageDice(entryDice(e)) }))
                .filter((x) => x.spec);
              const anyTextDice = diceInText(`${viewSpell.description || ''} ${viewSpell.extra_effects || ''}`).length > 0;
              if (!atk && !saves && entries.length === 0 && !anyTextDice) return null;
              return (
                <div className="p-3 pb-0 space-y-2">
                  {/* Only spells that actually call for an attack roll get one.
                      A saving-throw spell is not rolled to hit — it is resisted,
                      so it shows the DC the target has to beat instead. */}
                  {atk && sc && (() => {
                    const r = rolls[`spellhit|${viewSpell.name}`];
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => rollSpellAttack(viewSpell)}
                            className="h-11 flex-1 rounded-xl bg-green-900/50 border border-green-700 active:bg-green-900/80 text-sm text-green-100 font-semibold"
                          >
                            Roll {String(viewSpell.attack_save).toLowerCase()} spell attack{' '}
                            <span className="font-mono">(d20 +{sc.attack})</span>
                          </button>
                          {/* The answer belongs next to the button that asked. It
                              used to go only to the shared log, which meant
                              leaving this screen to find out what you rolled. */}
                          <D20Result r={r} />
                        </div>
                        <AdvPair onRoll={(mode) => rollSpellAttack(viewSpell, mode)} disabled={!!r?.pending} />
                      </div>
                    );
                  })()}
                  {saves && sc && (
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-2 text-xs text-gray-300">
                      {viewSpell.save_ability
                        ? `${String(viewSpell.save_ability).toUpperCase()} saving throw`
                        : 'Saving throw'} — DC <span className="font-mono text-gray-100">{sc.dc}</span>
                      <span className="text-gray-500"> · they roll, not you</span>
                    </div>
                  )}
                  {entries.length > 0 && (
                    <div className={`grid gap-2 ${entries.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {entries.map(({ e, idx, spec }) => {
                        const d = rolls[`spelldmg|${viewSpell.name}|${idx}`];
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => rollSpellDamage(viewSpell, e, idx)}
                            className="h-11 rounded-xl bg-red-950/50 border border-red-800 active:bg-red-900/60 text-left px-3"
                          >
                            <span className="block text-[10px] text-red-200/70 leading-none">
                              {entryType(e) ? formatDamageType(entryType(e)) : 'Damage'}
                            </span>
                            <span className="flex items-baseline gap-1.5">
                              <span className="font-mono text-xs text-red-100">
                                {spec.count}d{spec.sides}{spec.flat ? (spec.flat > 0 ? `+${spec.flat}` : spec.flat) : ''}
                              </span>
                              {d && !d.pending && <span className="ml-auto text-lg font-bold text-red-50">{d.total}</span>}
                              {d?.pending && <span className="ml-auto text-[10px] text-red-200/60">…</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {(() => {
                    // Only what the structured entries did not already cover.
                    const taken = new Set(entries.map(({ spec }) => `${spec.count}d${spec.sides}+${spec.flat}`));
                    const extra = diceInText(`${viewSpell.description || ''} ${viewSpell.extra_effects || ''}`)
                      .filter((d) => !taken.has(`${d.count}d${d.sides}+${d.flat}`));
                    if (!extra.length) return null;
                    return (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                          Other dice in this spell
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {extra.map((d) => {
                            const r = rolls[`text|${viewSpell.name}|${d.key}`];
                            return (
                              <button
                                key={d.key}
                                type="button"
                                onClick={() => rollTextDice(viewSpell, d)}
                                className="h-11 rounded-xl bg-gray-800 border border-gray-700 active:bg-gray-700 text-left px-3"
                              >
                                <span className="block text-[10px] text-gray-400 leading-none truncate">
                                  {d.hint || 'dice'}
                                </span>
                                <span className="flex items-baseline gap-1.5">
                                  <span className="font-mono text-xs text-gray-200">
                                    {d.count}d{d.sides}{d.flat ? `+${d.flat}` : ''}
                                  </span>
                                  {r && !r.pending && <span className="ml-auto text-lg font-bold text-gray-50">{r.total}</span>}
                                  {r?.pending && <span className="ml-auto text-[10px] text-gray-500">…</span>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          Read from the spell's text, so check what each is for — some are damage,
                          some are healing, some are a bonus to another roll.
                        </p>
                      </div>
                    );
                  })()}

                  {sc && (atk || entries.length > 0) && (
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Using {sc.abbr} ({sc.mod >= 0 ? '+' : ''}{sc.mod}).
                      {entries.length > 0 ? ' Spell damage adds no ability modifier.' : ''}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="p-3">
              <SpellBox
                spell={viewSpell}
                typeLabel={spellType(viewSpell.type).badge}
                typeColor={spellType(viewSpell.type).dark}
                darkTheme
              />
            </div>
          </div>
        </div>
      )}

      {giveNote && tab === 'me' && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-sm text-emerald-200 flex items-start gap-2">
          <span className="flex-1">{giveNote}</span>
          <button onClick={() => setGiveNote('')} className="text-emerald-300 px-1">×</button>
        </div>
      )}

      {/* Spells and slots, on their own tab. On the Me tab they pushed the
          inventory and everything under it a screen and a half down for any
          caster, and a fighter carried the heading with nothing beneath it.
          The tab only exists when there is something to put on it. */}
      {tab === 'spells' && (
        <div className="p-3 space-y-3 pb-20">
          {/* Spell slots. Total comes from the class table unless the sheet
              overrides it; used is what gets written back. */}
          {slotRows.length > 0 && (
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
                Spell slots
                {pact ? <span className="text-gray-500 normal-case"> · Pact Magic, level {pact.slotLevel} (short rest)</span> : null}
              </div>
              {slotRows.map(({ level, slotLevel, total, used }) => (
                <div key={level} className="flex items-center gap-3 mb-2 last:mb-0">
                  <span className="w-12 text-xs text-gray-400">
                    {level === 'pact' ? `Pact ${slotLevel}` : `Lvl ${level}`}
                  </span>
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {Array.from({ length: total }).map((_, i) => {
                      const spent = i < used;
                      return (
                        <button key={i} type="button"
                          onClick={() => {
                            const slots = { ...(slotState || {}) };
                            slots[level] = { total, used: spent ? i : i + 1 };
                            saveCreature({ spell_slots: slots });
                          }}
                          className={`w-8 h-8 rounded-full border ${
                            spent
                              ? 'bg-gray-700 border-gray-600'
                              : level === 'pact'
                                ? 'bg-purple-800/70 border-purple-400'
                                : 'bg-sky-800/70 border-sky-500'
                          }`} aria-label={level === 'pact'
                            ? `Pact Magic slot ${i + 1}`
                            : `Level ${level} slot ${i + 1}`} />
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-gray-500 shrink-0">{total - used}/{total}</span>
                </div>
              ))}
            </div>
          )}

          {spellLevels.length > 0 && (
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">My spells</div>
              <div className="space-y-3">
                {spellLevels.map(([lvl, list]) => (
                  <div key={lvl}>
                    <div className="text-xs text-dnd-gold mb-1">{lvl === 0 ? 'Cantrips' : `Level ${lvl}`}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((sp, i) => (
                        <button key={`${sp.name}-${i}`} type="button" onClick={() => setViewSpell(sp)}
                          // Prepared ones stand out: at the table that is the
                          // distinction that matters, not the alphabet.
                          className={`px-3 py-2 rounded-xl text-sm border text-left ${
                            sp.from_item
                              ? 'bg-sky-950/50 border-sky-800 text-sky-100'
                              : sp.prepared
                                ? 'bg-amber-900/40 border-amber-700 text-amber-100'
                                : 'bg-gray-800 border-gray-700 text-gray-300'
                          }`}>
                          {sp.name}
                          {sp.concentration ? <span className="text-[10px] text-gray-400"> ·C</span> : null}
                          {/* Which item is lending you this, and how often —
                              without it a free spell looks like one you have
                              always had and can cast at will. */}
                          {sp.from_item && (
                            <span className="block text-[10px] text-sky-300/80 leading-tight">
                              {sp.from_item}
                              {sp.item_cost
                                ? ` · ${sp.item_cost} charge${sp.item_cost === 1 ? '' : 's'}`
                                : sp.item_uses
                                  ? ` · ${sp.item_uses}/${sp.item_recharge || 'dawn'}`
                                  : ''}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Highlighted are prepared; blue ones come from something you are carrying.
                Tap any spell to read it.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'shapes' && (
        <div className="divide-y divide-gray-800 pb-20">
          {forms.length === 0 && (
            <p className="p-5 text-sm text-gray-500 italic text-center">
              No wild shape forms on your sheet. The GM adds the beasts you have learned.
            </p>
          )}
          {/* What you are wearing right now, and the way out of it.
              At the top because when it matters — mid-fight, on one hit point —
              "get me out" is the thing being looked for, not the bear's AC. */}
          {shifted && (
            <div className="p-3 border-b border-gray-800 bg-emerald-950/20">
              <div className="text-[11px] uppercase tracking-wide text-emerald-300 mb-1">Currently shifted</div>
              <div className="text-base text-gray-100">{creature?.name || 'a beast'}</div>
              <div className="text-[11px] text-gray-500 mb-2">
                {hp}/{maxHp} hp{token?.temp_hp ? ` (+${token.temp_hp} temp)` : ''}
                {druidSheet?.name ? ` · you are ${druidSheet.name}` : ''}
              </div>
              <button type="button" disabled={shifting} onClick={returnToOwnForm}
                className="w-full py-3 rounded-xl bg-emerald-900/70 border border-emerald-600 text-emerald-100 font-semibold disabled:opacity-50">
                {shifting ? 'Shifting…' : 'Return to your own form'}
              </button>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
                The form's temporary hit points go with it — they belonged to the beast.
              </p>
            </div>
          )}

          {forms.map((f) => {
            const isCurrent = shifted && creature?.id === f.id;
            return (
              <div key={f.id} className={`px-3 py-3 ${isCurrent ? 'bg-emerald-950/20' : ''}`}>
                <button onClick={() => setOpenForm(f.id)}
                  className="w-full flex items-center gap-3 text-left active:opacity-70 min-h-[56px]">
                  <span className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                    {f.image_path && <img src={`/uploads/${f.image_path}`} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base truncate">
                      {f.name}
                      {isCurrent && <span className="ml-2 text-[10px] text-emerald-300">you are this</span>}
                    </span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {formatSizeType(f)}
                      {f.challenge_rating ? ` · CR ${f.challenge_rating}` : ''}
                      {f.hit_points ? ` · ${f.hit_points} hp` : ''}
                      {f.armor_class ? ` · AC ${f.armor_class}` : ''}
                    </span>
                  </span>
                  <span className="text-gray-600 text-lg shrink-0">›</span>
                </button>
                {!isCurrent && (
                  <button type="button" disabled={shifting} onClick={() => shiftInto(f.id)}
                    className="mt-2 w-full py-2.5 rounded-xl bg-emerald-900/50 border border-emerald-700 text-sm text-emerald-100 font-semibold disabled:opacity-50">
                    {shifting ? 'Shifting…' : (shifted ? `Shift straight into ${f.name}` : `Shift into ${f.name}`)}
                  </button>
                )}
              </div>
            );
          })}
          {forms.length > 0 && (
            <p className="p-4 text-[11px] text-gray-500 leading-snug text-center">
              Shifting swaps your token on the board for everyone. Tap a form's name to read its stat block first.
            </p>
          )}
        </div>
      )}

      {tab === 'companions' && (
        <div className="divide-y divide-gray-800 pb-20">
          {companions.length === 0 && bound.length === 0 && (
            <p className="p-5 text-sm text-gray-500 italic text-center">
              Nothing is bound to you at the moment. Familiars and companions the GM ties to you appear here.
            </p>
          )}

          {/* Bound but not on the board.
              A companion exists on the character sheet whether or not it has been
              placed, so it is listed either way — greyed, with the button that
              calls it in. A token summoned from a binding carries its row id, so
              "is it out?" is answered by the board rather than guessed from names,
              and two identical wolves stay two separate wolves. */}
          {bound.filter((b) => !companions.some((c) => String(c.companion_row_id) === String(b.id))).map((b) => (
            <div key={`bound-${b.id}`} className="flex items-center gap-3 px-3 py-3 min-h-[64px]">
              <span className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0 opacity-60">
                {b.image_path && <img src={`/uploads/${b.image_path}`} alt="" className="w-full h-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base truncate text-gray-300">{b.nickname || b.name}</span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {b.companion_kind || 'familiar'}
                  {b.nickname && b.name !== b.nickname ? ` · ${b.name}` : ''}
                  {b.hit_points ? ` · ${b.hit_points} hp` : ''}
                  {' · not on the map'}
                </span>
              </span>
              <button
                type="button"
                disabled={summoning === b.id}
                onClick={() => {
                  setSummoning(b.id);
                  socket.emit('spawn_companion', { companionId: b.id });
                  // Cleared on a timer rather than on an acknowledgement: the
                  // answer arrives as `token_added`, and a refusal arrives as an
                  // error toast, so there is nothing to wait on here.
                  setTimeout(() => setSummoning((cur) => (cur === b.id ? null : cur)), 2000);
                }}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700 text-sm text-emerald-100 font-semibold disabled:opacity-50"
              >
                {summoning === b.id ? 'Calling…' : 'Summon'}
              </button>
            </div>
          ))}
          {companions.map((c) => {
            const sheet = c.creature_id ? compCreatures[c.creature_id] : null;
            const chp = Number(c.current_hp);
            const cmax = Number(c.max_hp);
            // Hit points out of the subtitle and onto its own column.
            //
            // A familiar's health was one clause of a grey 11px line, which is the
            // wrong weight for the only number on the row that changes — and the
            // one you go looking for when something has just been hit. Same colour
            // thresholds as the character's own bar at the top of the sheet, so a
            // red bar means the same thing wherever it appears.
            const known = Number.isFinite(chp) && Number.isFinite(cmax) && cmax > 0;
            const cpct = known ? Math.max(0, Math.min(100, (chp / cmax) * 100)) : 0;
            const down = known && chp <= 0;
            const tone = !known ? 'text-gray-500'
              : down ? 'text-red-400'
              : cpct > 50 ? 'text-green-300'
              : cpct > 25 ? 'text-yellow-300' : 'text-red-300';
            const fill = down ? 'bg-red-700' : cpct > 50 ? 'bg-green-600' : cpct > 25 ? 'bg-yellow-600' : 'bg-red-600';
            return (
              <button key={c.id} onClick={() => sheet && setOpenComp(c.creature_id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-gray-800 min-h-[64px]">
                <span className={`w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0 ${down ? 'opacity-50' : ''}`}>
                  {sheet?.image_path && <img src={`/uploads/${sheet.image_path}`} alt="" className="w-full h-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base truncate">{c.nickname || sheet?.name || c.name || 'Companion'}</span>
                  <span className="block text-[11px] text-gray-500 truncate">
                    {c.companion_kind || 'familiar'}
                    {sheet ? ` · ${formatSizeType(sheet)}` : ''}
                  </span>
                </span>
                <span className="shrink-0 w-20 text-right">
                  {known ? (
                    <>
                      <span className={`block text-lg font-semibold leading-tight ${tone}`}>
                        {down ? 'down' : `${chp}/${cmax}`}
                      </span>
                      <span className="block h-1.5 rounded-full bg-gray-800 overflow-hidden mt-0.5">
                        <span className={`block h-full ${fill}`} style={{ width: `${cpct}%` }} />
                      </span>
                      {!down && <span className="block text-[10px] text-gray-600 mt-0.5">hp</span>}
                    </>
                  ) : (
                    <span className="block text-[11px] text-gray-600">hp unknown</span>
                  )}
                </span>
                <span className="text-gray-600 text-lg shrink-0">›</span>
              </button>
            );
          })}
        </div>
      )}
      <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />

      {/* The shop, when the GM sends one. Full-bleed rather than a modal:
          a modal inside a phone is a small window inside a small window. */}
      {shop && (
        <div className="fixed inset-0 z-[110] bg-gray-900" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <ShopView
            compact
            shop={shop}
            creature={creature}
            offer={shopOffer}
            onClose={() => setShop(null)}
            onBuy={(lines, price, note) => socket.emit('shop_offer', {
              shopId: shop.id, creatureId: creature?.id, kind: 'buy', lines, offerCp: price, note,
            })}
            onSell={(lines, price, note) => socket.emit('shop_offer', {
              shopId: shop.id, creatureId: creature?.id, kind: 'sell', lines, offerCp: price, note,
            })}
            onCounterRespond={(offerId, accept) => socket.emit('shop_counter_respond', { offerId, accept })}
            onWithdraw={(offerId) => socket.emit('shop_offer_withdraw', { offerId })}
          />
        </div>
      )}

      {/* THE FULL CHARACTER EDITOR, over the sheet.
          The same CreatureForm the GM's library and the /edit-character route
          use — not a cut-down mobile copy, which would be a second definition
          of what a character is and would drift within a month.

          Rendered here rather than by navigating to /edit-character so the
          socket survives: HP the GM changes while you are editing still lands,
          and Done returns you to the sheet instead of a blank page. */}
      {editing && (
        <div className="fixed inset-0 z-[120] bg-gray-900 flex flex-col"
             style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <CustomClassesProvider />
          <div className="px-3 py-2.5 border-b border-gray-700 flex items-center gap-3 shrink-0">
            <h2 className="text-sm font-semibold text-dnd-gold flex-1 truncate">
              {editing.mode === 'new' ? 'New character' : `Editing ${creature?.name || 'character'}`}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-[12px] text-gray-300 active:bg-gray-700"
            >Close</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CreatureForm
              creature={editing.mode === 'edit' ? creature : null}
              // Ownership rides in extraFields, not on the creature prop — the
              // form builds its state from a fixed field list and would drop
              // anything it does not know about, leaving the new character
              // owned by nobody and invisible in this player's pick list next
              // session. Same pair CharacterSetup sends.
              extraFields={editing.mode === 'new'
                ? { is_player_character: 'true', player_owner: name.trim() }
                : undefined}
              isPlayerCharacter
              submitLabel={editing.mode === 'new' ? 'Create character' : 'Save'}
              onSave={(saved) => {
                if (saved && saved.id) {
                  setCreature(saved);
                  // A brand-new character has to be announced, or the GM has
                  // no idea it exists and nothing ever reaches the map.
                  if (editing.mode === 'new') {
                    announceCharacter(saved);
                    setMyChars(null);      // refetch the pick list
                  }
                }
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import { gmToken } from '../utils/gmAccount.js';

// An offer in one of these states is finished with and leaves the GM's list.
const OFFER_SETTLED = ['accepted', 'declined', 'withdrawn'];
import StatBlock from './StatBlock.jsx';
import RollableTables from './RollableTables.jsx';
import ShopPanel from './ShopPanel.jsx';
import ReferenceSearch from './ReferenceSearch.jsx';
import { MINIGAMES, MINIGAME_DCS } from '../data/minigames.js';
import { formatSizeType } from '../utils/creature.js';
import {
  compendiumImgUrl, compendiumStatus, searchCompendium,
  previewCompendiumCreature, importCompendiumCreature,
} from '../utils/compendiumImport.js';
import { attachSessionKeepalive } from '../utils/sessionSocket.js';

// The GM's second screen: every stat block on the current map, and nothing else.
//
// A GM running a fight has one screen and three jobs on it — the board, the
// tokens, and the question "what can this thing actually do". The third keeps
// losing, because reading a stat block means covering the map with a modal on
// the very device the map lives on.
//
// So this is the stat blocks on their own, on a tablet propped beside the
// laptop. It joins the same session with the same GM password and follows
// whichever map the GM is showing.
//
// It also carries the two things a GM does with their eyes on the room rather
// than the screen: whisper one player, and give an NPC a voice. Both send
// through the same events the desktop uses, so the routing, the receipts and
// the per-language scrambling are the ones already in play.
//
// What it still deliberately cannot do is touch the BOARD — no map, no tokens
// to drag, nothing to knock out of place by resting a hand on the glass. That
// is the line: this screen can say things, it cannot move things.
//
// It is also a light page to open: its own chunk is a few KB, and it pulls in
// neither the GM panel nor the 3D renderer. It is not weightless — Konva rides
// along in the shared entry chunk today no matter which route you land on — but
// nothing on this screen builds a scene or a canvas.
//
// Built mobile-first rather than adapted: one column, rows big enough to hit
// with a thumb, and the stat block as a full screen of its own rather than a
// modal, because a modal on a tablet is a small window inside a small window.
//
// Each full-height container scrolls ITSELF rather than letting the page
// scroll. The app pins the document for the map's sake — `body` is
// overflow:hidden and `#root` is exactly 100dvh — so a tall child here is
// clipped at the fold instead of scrolled, which is what happened to the first
// version of this screen: a long stat block simply ended.

// Joined under its own name so it is legible in the GM's connection log and
// cannot be mistaken for the GM's main session. The log is keyed by name, so
// reusing "Game Master" would overwrite the desktop's entry and report the GM
// as disconnected the moment the tablet slept.
const CONNECT_AS = 'GM — Stat Blocks';

function LoginGate({ onSubmit }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-gray-900 text-gray-100 flex items-center justify-center p-5">
      <form
        onSubmit={(e) => { e.preventDefault(); if (code.trim() && pass) onSubmit(code.trim().toUpperCase(), pass); }}
        className="w-full max-w-sm space-y-4"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dnd-gold">Stat Blocks</h1>
          <p className="text-sm text-gray-400 mt-1">
            The creatures on the current map, for a tablet beside you.
          </p>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Session code</label>
          {/* inputMode/autoCapitalize matter more than they look on a tablet:
              without them the soft keyboard opens on letters and helpfully
              corrects the code as it is typed. */}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={12}
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-lg text-white uppercase tracking-widest font-mono focus:outline-none focus:border-dnd-gold"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">GM password</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-lg text-white focus:outline-none focus:border-dnd-gold"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-xl font-semibold text-lg"
        >
          Connect
        </button>
        <p className="text-[11px] text-gray-500 text-center leading-snug">
          Stat blocks, whispers and NPC speech. Nothing here moves the board.
        </p>
      </form>
    </div>
  );
}

export default function StatBlockView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || '';
  const pass = searchParams.get('pass') || '';

  const [session, setSession] = useState(null);
  const [mapName, setMapName] = useState('');
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [openId, setOpenId] = useState(null);      // creature id being read
  const [q, setQ] = useState('');
  // Which player's phone the GM is looking at, if any.
  const [previewOf, setPreviewOf] = useState(null);
  const [showParty, setShowParty] = useState(false);

  // ── Talking to the table ────────────────────────────────────────────────
  //
  // The two things a GM does with their hands full and their eyes on the room:
  // tell one player something privately, and give an NPC a voice. Both already
  // exist as events; what was missing was anywhere to reach them from that is
  // not the desktop.
  const [talk, setTalk] = useState(null);        // null | 'whisper' | 'npc'

  // ── Putting things on the board ─────────────────────────────────────────
  //
  // The GM's own library, and the 5etools mirror behind it. Placement does not
  // ask where — this screen has no map to tap — so the server resolves the spot
  // from the map's own spawn point (see `place_creature`).
  const [adding, setAdding] = useState(null);    // null | 'library' | 'import'
  // The GM's chest and their tables. The chest is session state now, so this is
  // the same pile the desktop is filling rather than a second one.
  const [chest, setChest] = useState([]);
  // How many of a stack the GM is handing over, keyed by chest item id.
  // Absent means the whole stack.
  const [sendQty, setSendQty] = useState({});
  // Narrowing a full hoard down to the thing a player just asked for.
  const [chestSearch, setChestSearch] = useState('');
  const [kit, setKit] = useState(null);          // null | 'chest' | 'tables' | 'shop'
  const [showSearch, setShowSearch] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [shopList, setShopList] = useState([]);
  const [shop, setShop] = useState(null);
  const [shopOffers, setShopOffers] = useState([]);
  // What the GM's own rolls came up with. A secret roll goes only to the
  // roller, so without this the tablet fired the table and showed nothing —
  // the answer landed on the desktop, which is the screen they were not
  // holding.
  const [rolls, setRolls] = useState([]);
  // Dice, the same way the players have them: a tray to throw from and the
  // table's recent throws underneath. A GM running from a tablet was the one
  // person at the table who had to reach for the laptop to roll.
  const [showDice, setShowDice] = useState(false);
  const [dieCount, setDieCount] = useState(1);
  const [dieMod, setDieMod] = useState(0);
  const [dieMode, setDieMode] = useState(null);
  const [diceRolls, setDiceRolls] = useState([]);
  const [libQ, setLibQ] = useState('');
  const [lib, setLib] = useState([]);
  const [libBusy, setLibBusy] = useState(false);
  const [compQ, setCompQ] = useState('');
  const [comp, setComp] = useState([]);
  const [compBusy, setCompBusy] = useState(false);
  const [compStatus, setCompStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busyStep, setBusyStep] = useState('');
  const [whisperTo, setWhisperTo] = useState('');
  // A challenge to send, and what came back from the ones already sent.
  const [gameId, setGameId] = useState('lockpick');
  const [gameDc, setGameDc] = useState(15);
  const [gameNote, setGameNote] = useState('');
  const [gameResults, setGameResults] = useState([]);
  const [whisperText, setWhisperText] = useState('');
  const [sent, setSent] = useState(null);        // { text, ok } — the last receipt
  const [npcSpeaker, setNpcSpeaker] = useState('NPC');
  const [npcText, setNpcText] = useState('');
  const [npcLang, setNpcLang] = useState('common');
  const [npcTarget, setNpcTarget] = useState('');  // '' = the whole table
  const [languages, setLanguages] = useState([]);
  // Who is actually connected, which is not the same as who has a token: a
  // whisper to somebody who has gone home is delivered to nobody, and the GM
  // should be told that rather than left guessing.
  const [users, setUsers] = useState([]);

  // Creature sheets, fetched once each and kept. A map with eight goblins asks
  // for one goblin.
  const [sheets, setSheets] = useState({});
  const wanted = useRef(new Set());

  useEffect(() => {
    // A paired GM account opens this window too, with no password in the URL.
    if (!code || (!pass && !gmToken())) return undefined;
    socket.connect();
    // Same keepalive the player screens use. This window is left open beside
    // the map for a whole session, and it joined exactly once — so once its
    // socket dropped, it was a stat-block window that no longer heard the
    // table and whose own emits the server discarded.
    const join = () => socket.emit(
      'join_session',
      { sessionCode: code, role: 'dm', name: CONNECT_AS, dmPassword: pass, gmToken: gmToken() },
    );
    const detachKeepalive = attachSessionKeepalive({
      join,
      onStatus: (state) => { if (state === 'offline') setConnected(false); },
    });

    const onJoined = ({ state }) => {
      setConnected(true);
      setError('');
      setSession(state?.session || null);
      setChest(Array.isArray(state?.session?.treasure_chest) ? state.session.treasure_chest : []);
      if (state?.session?.id) {
        socket.emit('shop_list', { sessionId: state.session.id });
        socket.emit('shop_offers_pending', { sessionId: state.session.id });
      }
      setTokens(Array.isArray(state?.tokens) ? state.tokens : []);
    };
    // The GM changed board. The event carries the new map's tokens with it, so
    // there is nothing to re-request.
    const onMapChanged = ({ map, tokens: newTokens }) => {
      setMapName(map?.name || '');
      setTokens(Array.isArray(newTokens) ? newTokens : []);
      setOpenId(null);
      setSession((s) => (s ? { ...s, map_id: map?.id ?? s.map_id } : s));
    };
    const onErr = ({ message }) => setError(message || 'Could not join');

    // Enough to keep the list honest without duplicating the GM's whole client.
    const upsert = ({ token }) => setTokens((p) => (p.some((t) => t.id === token.id)
      ? p.map((t) => (t.id === token.id ? token : t)) : [...p, token]));
    const drop = ({ tokenId }) => setTokens((p) => p.filter((t) => t.id !== tokenId));
    const patch = (fn) => (payload) => setTokens((p) => p.map((t) => (t.id === payload.tokenId ? fn(t, payload) : t)));

    const onHp = patch((t, d) => ({ ...t, current_hp: d.currentHp }));
    const onMaxHp = patch((t, d) => ({ ...t, max_hp: d.maxHp }));
    const onConds = patch((t, d) => ({ ...t, conditions: d.conditions }));
    const onNick = patch((t, d) => ({ ...t, nickname: d.nickname }));
    const onName = patch((t, d) => ({ ...t, name: d.name }));
    const onTokenMap = ({ tokenId, toMapId }) => {
      // Left this board, or arrived on it. Arrivals come with token_added too,
      // so this only has to handle departures.
      setSession((s) => {
        if (s && toMapId !== s.map_id) setTokens((p) => p.filter((t) => t.id !== tokenId));
        return s;
      });
    };

    const onUsers = ({ users: u }) => setUsers(Array.isArray(u) ? u : []);
    const onChest = ({ items }) => setChest(Array.isArray(items) ? items : []);
    const onShopList = ({ shops: rows }) => setShopList(Array.isArray(rows) ? rows : []);
    const onShopChanged = (payload) => {
      if (!payload) return;
      setShop(payload);
      setShopList((prev) => [...prev.filter((x) => x.id !== payload.id),
        { id: payload.id, name: payload.name, is_open: payload.is_open, blurb: payload.blurb,
          allow_haggle: payload.allow_haggle, allow_selling: payload.allow_selling }]
        .sort((a, b) => a.id - b.id));
    };
    const onOfferIn = ({ offer }) => setShopOffers((prev) => [...prev.filter((o) => o.id !== offer.id), offer]);
    const onOfferUpd = ({ offer }) => setShopOffers((prev) =>
      (OFFER_SETTLED.includes(offer.status)
        ? prev.filter((o) => o.id !== offer.id)
        : prev.map((o) => (o.id === offer.id ? offer : o))));
    const onOffersPending = ({ offers }) => setShopOffers(Array.isArray(offers) ? offers : []);
    const onTableRolled = (entry) => {
      setRolls((prev) => [{
        id: entry.id || `${Date.now()}-${Math.random()}`,
        tableName: entry.tableName || 'Table',
        result: entry.result || '',
        total: entry.total,
        outOf: entry.outOf,
        secret: !!entry.secret,
        ts: entry.timestamp || Date.now(),
      }, ...prev].slice(0, 12));
    };
    // The server's receipt: how many sockets it actually reached.
    const onWhisperSent = ({ targetName, delivered }) => {
      setSent(delivered > 0
        ? { text: `Sent to ${targetName}`, ok: true }
        : { text: `${targetName} isn't connected — not delivered`, ok: false });
    };

    socket.on('users_updated', onUsers);
    socket.on('treasure_chest_changed', onChest);
    // Every throw at the table, whoever made it. Secret GM rolls arrive here
    // too, because the server sends those to the roller alone.
    const onDiceRolled = (data) => setDiceRolls((prev) => [
      ...prev.slice(-40), { ...data, id: `${Date.now()}-${Math.random()}` },
    ]);

    // What the players made of the challenges sent to them.
    const onMinigameResult = (r) => setGameResults((prev) => [r, ...prev].slice(0, 12));
    const onMinigameSent = ({ targetName, delivered }) => setSent(delivered > 0
      ? { text: `Challenge sent to ${targetName}`, ok: true }
      : { text: `${targetName} isn't connected — not delivered`, ok: false });

    socket.on('minigame_result', onMinigameResult);
    socket.on('minigame_sent', onMinigameSent);
    socket.on('table_rolled', onTableRolled);
    socket.on('dice_rolled', onDiceRolled);
    socket.on('shop_list', onShopList);
    socket.on('shop_changed', onShopChanged);
    socket.on('shop_offer_received', onOfferIn);
    socket.on('shop_offer_updated', onOfferUpd);
    socket.on('shop_offers_pending', onOffersPending);
    socket.on('whisper_sent', onWhisperSent);
    socket.on('session_joined', onJoined);
    socket.on('error', onErr);
    socket.on('map_changed', onMapChanged);
    socket.on('token_added', upsert);
    socket.on('token_refreshed', upsert);
    socket.on('token_removed', drop);
    socket.on('token_hp_changed', onHp);
    socket.on('token_max_hp_changed', onMaxHp);
    socket.on('token_conditions_changed', onConds);
    socket.on('token_nickname_changed', onNick);
    socket.on('token_name_changed', onName);
    socket.on('token_map_changed', onTokenMap);

    return () => {
      detachKeepalive();
      socket.off('users_updated', onUsers);
      socket.off('treasure_chest_changed', onChest);
      socket.off('minigame_result', onMinigameResult);
      socket.off('minigame_sent', onMinigameSent);
      socket.off('table_rolled', onTableRolled);
      socket.off('dice_rolled', onDiceRolled);
      socket.off('shop_list', onShopList);
      socket.off('shop_changed', onShopChanged);
      socket.off('shop_offer_received', onOfferIn);
      socket.off('shop_offer_updated', onOfferUpd);
      socket.off('shop_offers_pending', onOffersPending);
      socket.off('whisper_sent', onWhisperSent);
      socket.off('session_joined', onJoined);
      socket.off('error', onErr);
      socket.off('map_changed', onMapChanged);
      socket.off('token_added', upsert);
      socket.off('token_refreshed', upsert);
      socket.off('token_removed', drop);
      socket.off('token_hp_changed', onHp);
      socket.off('token_max_hp_changed', onMaxHp);
      socket.off('token_conditions_changed', onConds);
      socket.off('token_nickname_changed', onNick);
      socket.off('token_name_changed', onName);
      socket.off('token_map_changed', onTokenMap);
    };
  }, [code, pass]);

  // The map's name, for the header. Cheap enough to ask for once per board.
  useEffect(() => {
    if (!session?.id || !session?.map_id) return;
    let gone = false;
    fetch(`/api/maps?session_id=${session.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (gone) return;
        const m = (rows || []).find((x) => x.id === session.map_id);
        if (m) setMapName(m.name || '');
      })
      .catch(() => {});
    return () => { gone = true; };
  }, [session?.id, session?.map_id]);

  // One row per CREATURE, not per token. Eight goblins is one stat block and a
  // count — the individual hit points belong on the GM's own screen, and this
  // screen exists to answer "what is a goblin".
  const rows = useMemo(() => {
    const mapId = session?.map_id ?? null;
    const here = tokens.filter((t) => t.creature_id != null
      && (mapId == null || t.map_id == null || t.map_id === mapId));
    const byCreature = new Map();
    for (const t of here) {
      const key = t.creature_id;
      if (!byCreature.has(key)) byCreature.set(key, { creatureId: key, tokens: [] });
      byCreature.get(key).tokens.push(t);
    }
    const out = [...byCreature.values()].map((g) => {
      const first = g.tokens[0];
      return {
        ...g,
        label: first.nickname || first.name || 'Creature',
        isPlayer: !!first.is_player,
        count: g.tokens.length,
      };
    });
    const needle = q.trim().toLowerCase();
    const matched = needle
      ? out.filter((r) => r.label.toLowerCase().includes(needle)
        || (sheets[r.creatureId]?.name || '').toLowerCase().includes(needle))
      : out;
    // Monsters first — they are what gets looked up mid-fight — then players,
    // each alphabetically.
    return matched.sort((a, b) => (a.isPlayer - b.isPlayer) || a.label.localeCompare(b.label));
  }, [tokens, session?.map_id, q, sheets]);

  // The players, for previewing their phones. Taken from the token list rather
  // than the lobby roster: a player who has a character on the board is one
  // whose phone has something to show.
  useEffect(() => {
    if (talk !== 'npc' || languages.length) return;
    fetch('/api/languages')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setLanguages(Array.isArray(rows) ? rows : []))
      .catch(() => setLanguages([]));
  }, [talk, languages.length]);

  // The receipt clears itself; a stale "sent" under the next message would
  // read as confirmation of the wrong thing.
  useEffect(() => {
    if (!sent) return undefined;
    const t = setTimeout(() => setSent(null), 3500);
    return () => clearTimeout(t);
  }, [sent]);

  // THE PARTY, AT A GLANCE.
  //
  // A GM running from a phone could see every monster's stat block and none of
  // the party's hit points — the one table-wide question asked between every
  // turn ("who is hurt, who is charmed, who is concentrating?"). All of it is
  // already arriving on this screen through the token events; it simply had
  // nowhere to be shown.
  //
  // Read from the tokens rather than the sheets: hit points, conditions and
  // exhaustion live on the token, which is what the board actually plays.
  const party = useMemo(() => {
    const mapId = session?.map_id ?? null;
    return tokens
      .filter((t) => t.is_player)
      .filter((t) => mapId == null || t.map_id == null || t.map_id === mapId)
      .map((t) => {
        // The body on the board, and the person wearing it. They are the same
        // row unless the token is wild-shaped.
        const wornSheet = t.creature_id ? sheets[t.creature_id] : null;
        const ownId = t?.pretransform?.creature_id ?? t.creature_id;
        const sheet = (ownId ? sheets[ownId] : null) || wornSheet;
        const max = Number(t.max_hp) || 0;
        const cur = Math.max(0, Number(t.current_hp) || 0);
        const conditions = Array.isArray(t.conditions) ? t.conditions : [];
        return {
          token: t,
          sheet,
          name: t.nickname || t.name || sheet?.name || t.player_name || 'Player',
          playerName: t.player_name || '',
          cur,
          max,
          pct: max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0,
          temp: Number(t.temp_hp) || 0,
          conditions,
          exhaustion: Number(t.exhaustion) || 0,
          // A wild-shaped druid is still the player, wearing something else.
          shapedAs: t.pretransform ? (wornSheet?.name || 'another shape') : null,
          concentrating: sheet?.concentrating_on || '',
          down: max > 0 && cur <= 0,
          deathSuccesses: Number(sheet?.death_save_successes) || 0,
          deathFailures: Number(sheet?.death_save_failures) || 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tokens, sheets, session?.map_id]);

  // How many are below half, for the badge on the way in — the number a GM
  // wants without opening anything.
  const partyHurt = party.filter((p) => p.max > 0 && p.pct <= 50).length;

  const players = useMemo(() => {
    const seen = new Map();
    for (const t of tokens) {
      if (!t.is_player || !t.player_name) continue;
      if (!seen.has(t.player_name)) seen.set(t.player_name, t);
    }
    return [...seen.entries()]
      .map(([playerName, t]) => ({ playerName, token: t }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName));
  }, [tokens]);

  // Everyone who could be whispered: connected non-GM sockets first, falling
  // back to whoever holds a player token when the roster has not arrived.
  const whisperTargets = useMemo(() => {
    const live = (users || []).filter((u) => u.role !== 'dm').map((u) => u.name);
    if (live.length) return [...new Set(live)].sort((a, b) => a.localeCompare(b));
    return players.map((p) => p.playerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, tokens]);

  // Pull the sheets the list needs, once each.
  //
  // Plus the character behind any transformed token: a wild-shaped druid's
  // token points at the beast, so the party view would read the panther's
  // (empty) concentration and death saves instead of the druid's.
  useEffect(() => {
    const ids = new Set(rows.map((r) => r.creatureId));
    for (const t of tokens) {
      const own = t?.pretransform?.creature_id;
      if (own) ids.add(Number(own));
    }
    for (const id of ids) {
      if (!id || sheets[id] || wanted.current.has(id)) continue;
      wanted.current.add(id);
      fetch(`/api/creatures/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((c) => { if (c && !c.error) setSheets((p) => ({ ...p, [c.id]: c })); })
        .catch(() => {});
    }
  }, [rows, tokens, sheets]);

  // The GM's own library. Debounced, and an empty query is valid — it returns
  // the head of the list, so there is something to look at before typing.
  useEffect(() => {
    if (adding !== 'library') return undefined;
    let dead = false;
    setLibBusy(true);
    const t = setTimeout(() => {
      fetch(`/api/creatures?role=dm${libQ.trim() ? `&q=${encodeURIComponent(libQ.trim())}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (dead) return;
          const all = Array.isArray(rows) ? rows : [];
          // Filtered here because the endpoint has no q on every deployment.
          const needle = libQ.trim().toLowerCase();
          setLib((needle ? all.filter((c) => (c.name || '').toLowerCase().includes(needle)) : all).slice(0, 60));
        })
        .catch(() => { if (!dead) setLib([]); })
        .finally(() => { if (!dead) setLibBusy(false); });
    }, 220);
    return () => { dead = true; clearTimeout(t); };
  }, [adding, libQ]);

  useEffect(() => {
    if (adding !== 'import' || compStatus) return;
    compendiumStatus().then(setCompStatus).catch(() => setCompStatus({ ok: false, error: 'unreachable' }));
  }, [adding, compStatus]);

  useEffect(() => {
    if (adding !== 'import') return undefined;
    let dead = false;
    setCompBusy(true);
    const t = setTimeout(() => {
      searchCompendium(compQ, 40)
        .then((rows) => { if (!dead) setComp(rows); })
        .catch(() => { if (!dead) setComp([]); })
        .finally(() => { if (!dead) setCompBusy(false); });
    }, 260);
    return () => { dead = true; clearTimeout(t); };
  }, [adding, compQ]);

  // The login gate sits below EVERY hook above, not up with the other guards.
  // An early return before a hook changes how many hooks the component runs
  // between the logged-out and logged-in renders, which is React error #310 and
  // a blank screen — not a missing control.
  // A SIGNED-IN GM ARRIVES WITH NO PASSWORD, AND THAT IS NOT LOGGED OUT.
  //
  // This is the screen the "Mobile" button on a paired table opens, and it was
  // still testing for ?pass= alone — so the one flow the account exists to
  // remove, typing a code and a password, is exactly what it asked for. The
  // token in this browser is the other credential; the socket join already
  // sends it (see above), so the gate has to accept it too.
  if (!code || (!pass && !gmToken())) {
    return <LoginGate onSubmit={(c, p) => navigate(`/blocks?code=${c}&pass=${encodeURIComponent(p)}`)} />;
  }

  // Placing asks the SERVER for the square — see `place_creature`. A screen
  // with no map has no tap to turn into a position, and inventing one here
  // would be a second placement rule to keep in step with the real one.
  function placeCreature(c) {
    if (!session?.id) return;
    socket.emit('place_creature', { sessionId: session.id, creatureId: c.id });
    setSent({ text: `${c.name} placed on the map`, ok: true });
  }

  async function importAndPlace(row, alsoPlace) {
    setBusyStep('reading…');
    try {
      const p = preview && preview.__row === row ? preview : await previewCompendiumCreature(row);
      const created = await importCompendiumCreature(p, { onStep: setBusyStep });
      setSent({ text: `${created.name} added to your library`, ok: true });
      if (alsoPlace) placeCreature(created);
      setPreview(null);
    } catch (err) {
      setSent({ text: err.message, ok: false });
    } finally {
      setBusyStep('');
    }
  }

  // ── Talking to the table ────────────────────────────────────────────────
  //
  // A sheet over the list rather than another screen: the GM is mid-sentence
  // and wants to send a line, not navigate. Everything it sends goes through
  // the same events the desktop uses, so the wording, the language scrambling
  // and the per-player routing are all the ones already in play.
  function sendWhisper() {
    const msg = whisperText.trim();
    const to = whisperTo || whisperTargets[0] || '';
    if (!msg || !to) return;
    socket.emit('dm_whisper', { targetName: to, message: msg });
    setWhisperText('');
  }

  function speakAsNpc() {
    const text = npcText.trim();
    if (!text) return;
    // The same frame the NPC Chat tab sends. `target` is a TOKEN id, so a line
    // aimed at one character reaches that player's screen and nobody else's.
    socket.emit('plugin_event', {
      pluginId: 'npc-chat',
      type: 'say',
      payload: {
        msgId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker: npcSpeaker.trim() || 'NPC',
        langSlug: npcLang || 'common',
        text,
        ts: Date.now(),
        target: npcTarget ? Number(npcTarget) : null,
      },
    });
    setNpcText('');
    setSent({ text: npcTarget ? 'Spoken to one player' : 'Spoken to the table', ok: true });
  }

  // Handing out loot, and rolling on the GM's tables.
  //
  // How many of a stack go over is a choice, not a given: six potions in the
  // chest and one player asking for two meant sending all six and clawing four
  // back by hand. The `sendQty` state lives with the rest, up above the login
  // gate's early return — a hook down here is React error #310 and a blank
  // screen, which is what the comment beside that return is warning about.
  function giveItem(item, creatureId, qtyWanted) {
    if (!creatureId) return;
    const have = Math.max(1, Number(item.qty) || 1);
    const sending = Math.max(1, Math.min(have, Number(qtyWanted) || have));
    const { id, ...rest } = item;
    socket.emit('send_treasure', { creatureId, items: [{ ...rest, qty: sending }] });

    // What was handed over leaves the chest, the same as on the desktop panel.
    // The chest is GM-wide state, so the new list is pushed to the server
    // rather than only changed here — the laptop has to agree with the phone.
    const nextChest = chest.flatMap((row) => {
      if ((row.id ?? null) !== (item.id ?? null)) return [row];
      const left = have - sending;
      return left > 0 ? [{ ...row, qty: left }] : [];
    });
    setChest(nextChest);
    if (session?.id) socket.emit('set_treasure_chest', { sessionId: session.id, items: nextChest });
    setSendQty((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setSent({
      text: `Sent ${sending > 1 ? `${sending}× ` : ''}${item.name || 'item'}`,
      ok: true,
    });
  }
  function giveWholeChest(creatureId) {
    if (!creatureId || !chest.length) return;
    socket.emit('send_treasure', { creatureId, items: chest.map(({ id, ...rest }) => rest) });
    setSent({ text: `Sent ${chest.length} item${chest.length === 1 ? '' : 's'}`, ok: true });
  }

  // Who can receive loot: a player's CHARACTER, since treasure lands on the
  // creature rather than on the token.
  const lootTargets = players.filter((p) => p.token.creature_id);

  const kitPanel = kit && (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setKit(null)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[85dvh] flex flex-col"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900 border-b border-gray-700 px-3 py-2.5 flex items-center gap-2 shrink-0">
          <div className="flex gap-1 flex-1">
            {[['chest', `Chest${chest.length ? ` (${chest.length})` : ''}`], ['tables', 'Tables'],
              ['shop', `Shop${shopOffers.length ? ` (${shopOffers.length})` : ''}`]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setKit(k)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                  kit === k ? 'bg-dnd-gold text-gray-900' : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                }`}
              >{label}</button>
            ))}
          </div>
          <button
            onClick={() => setKit(null)}
            className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm active:bg-gray-700"
          >Close</button>
        </div>

        {sent && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-xl text-[13px] border shrink-0 ${
            sent.ok ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
          }`}>{sent.text}</div>
        )}

        {/* min-h-0: a flex child will not shrink below its content without it,
            so a long chest or a shop being filled grew the sheet instead of
            scrolling inside it. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {kit === 'chest' && (
            <div className="p-3 space-y-2">
              {chest.length === 0 && (
                <p className="text-[13px] text-gray-500 leading-snug">
                  The chest is empty. Fill it from the desktop, or roll a loot
                  table — it is the same chest on every screen you have open.
                </p>
              )}
              {chest.length > 0 && lootTargets.length === 0 && (
                <p className="text-[13px] text-amber-300/80">No player characters on this map to give it to.</p>
              )}

              {/* Find it without scrolling. A hoard rolled off the tables runs
                  to dozens of rows, and on a phone that is a lot of thumb
                  between the GM and the one potion somebody just asked for. */}
              {chest.length > 4 && (
                <div className="relative">
                  <input
                    type="search"
                    value={chestSearch}
                    onChange={(e) => setChestSearch(e.target.value)}
                    placeholder={`Search ${chest.length} items…`}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 pr-9
                               text-[14px] text-gray-100 placeholder-gray-500
                               focus:outline-none focus:border-dnd-gold"
                  />
                  {chestSearch && (
                    <button
                      type="button"
                      onClick={() => setChestSearch('')}
                      aria-label="Clear search"
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-gray-400 text-lg"
                    >×</button>
                  )}
                </div>
              )}

              {chest.length > 0 && lootTargets.length > 0 && (
                <div className="rounded-xl bg-gray-800/70 border border-gray-700 p-2.5 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-gray-400">Give the lot to</span>
                  <div className="flex flex-wrap gap-1.5">
                    {lootTargets.map((p) => (
                      <button
                        key={p.token.id}
                        onClick={() => giveWholeChest(p.token.creature_id)}
                        className="px-3 py-2 rounded-xl bg-dnd-gold text-gray-900 text-[12px] font-semibold active:brightness-110"
                      >{p.token.nickname || p.token.name}</button>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const q = chestSearch.trim().toLowerCase();
                const shown = !q ? chest : chest.filter((it) =>
                  String(it.name || '').toLowerCase().includes(q)
                  || String(it.desc || '').toLowerCase().includes(q)
                  || String(it.properties || '').toLowerCase().includes(q)
                  || String(it.rarity || '').toLowerCase().includes(q)
                );
                if (q && shown.length === 0) {
                  return (
                    <p className="text-[13px] text-gray-500 italic">
                      Nothing in the chest matches “{chestSearch.trim()}”.
                    </p>
                  );
                }
                return shown.map((item, i) => {
                const have = Math.max(1, Number(item.qty) || 1);
                const wanted = Math.max(1, Math.min(have, Number(sendQty[item.id]) || have));
                return (
                <div key={item.id ?? i} className="rounded-xl bg-gray-800/60 border border-gray-700 p-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] text-gray-100 flex-1 min-w-0 truncate">
                      {item.name || 'Unnamed item'}
                    </span>
                    {have > 1 && <span className="text-[11px] text-gray-500">×{have}</span>}
                  </div>
                  {item.desc && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{item.desc}</p>
                  )}
                  {/* How many to hand over. Steppers rather than a number field:
                      this is a phone held in one hand mid-session, and a
                      keyboard over the chest is the wrong tool for "two of the
                      six". Only a stack asks the question. */}
                  {have > 1 && lootTargets.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setSendQty((prev) => ({ ...prev, [item.id]: Math.max(1, wanted - 1) }))}
                        disabled={wanted <= 1}
                        aria-label="Send one fewer"
                        className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-700 text-lg
                                   active:bg-gray-700 disabled:opacity-40"
                      >−</button>
                      <span className="text-[15px] text-gray-100 w-8 text-center font-semibold">{wanted}</span>
                      <button
                        type="button"
                        onClick={() => setSendQty((prev) => ({ ...prev, [item.id]: Math.min(have, wanted + 1) }))}
                        disabled={wanted >= have}
                        aria-label="Send one more"
                        className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-700 text-lg
                                   active:bg-gray-700 disabled:opacity-40"
                      >+</button>
                      <span className="text-[11px] text-gray-500 ml-auto">
                        {have - wanted} left in the chest
                      </span>
                    </div>
                  )}
                  {lootTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {lootTargets.map((p) => (
                        <button
                          key={p.token.id}
                          onClick={() => giveItem(item, p.token.creature_id, wanted)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700
                                     text-[11px] text-gray-200 active:bg-gray-700"
                        >→ {have > 1 ? `${wanted}× ` : ''}{p.token.nickname || p.token.name}</button>
                      ))}
                    </div>
                  )}
                </div>
                );
                });
              })()}
            </div>
          )}

          {/* The same component the desktop Tables tab mounts, so a table
              edited there is the table rolled here. */}
          {kit === 'shop' && (
            <ShopPanel
              compact
              sessionId={session?.id}
              shops={shopList}
              shop={shop}
              offers={shopOffers}
              onSelectShop={(id) => {
                if (!id) { setShop(null); return; }
                const row = shopList.find((x) => x.id === id);
                socket.emit('shop_save', { sessionId: session?.id, shopId: id, name: row?.name,
                  blurb: row?.blurb, allowHaggle: row?.allow_haggle !== false,
                  allowSelling: row?.allow_selling !== false });
              }}
              onSaveShop={(payload) => socket.emit('shop_save', { sessionId: session?.id, ...payload })}
              onDeleteShop={(shopId) => socket.emit('shop_delete', { shopId, sessionId: session?.id })}
              onOpenShop={(shopId, open) => socket.emit('shop_open', { shopId, sessionId: session?.id, open })}
              onSaveItem={(listing, itemId) => socket.emit('shop_item_save', {
                shopId: shop?.id, itemId, item: listing.item, playerName: listing.playerName,
                playerDesc: listing.playerDesc, showStats: listing.showStats,
                priceCp: listing.priceCp, qty: listing.qty,
              })}
              onRemoveItem={(itemId) => socket.emit('shop_item_remove', { shopId: shop?.id, itemId })}
              onRespond={(offerId, action, counterCp, note) =>
                socket.emit('shop_offer_respond', { offerId, action, counterCp, note })}
            />
          )}

          {kit === 'tables' && (
            <>
              {/* What it came up with, on THIS screen. A secret roll is sent
                  only to whoever rolled it, so the tablet firing a wandering-
                  monster check used to put the answer on the desktop — the one
                  device the GM had put down. */}
              {rolls.length > 0 && (
                <div className="mx-3 mt-3 rounded-xl bg-gray-800/70 border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700/70">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Rolled</span>
                    <button
                      type="button"
                      onClick={() => setRolls([])}
                      className="text-[10px] text-gray-500 active:text-gray-300"
                    >Clear</button>
                  </div>
                  <div className="divide-y divide-gray-700/60">
                    {rolls.map((r) => (
                      <div key={r.id} className="px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[11px] text-dnd-gold truncate flex-1 min-w-0">{r.tableName}</span>
                          {Number.isFinite(Number(r.total)) && (
                            <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                              {r.total}{r.outOf ? `/${r.outOf}` : ''}
                            </span>
                          )}
                          {r.secret && <span className="text-[10px] text-amber-400/80 shrink-0">secret</span>}
                        </div>
                        <p className="text-[14px] text-gray-100 leading-snug mt-0.5 whitespace-pre-wrap">{r.result}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <RollableTables onRoll={(tableId, secret) => socket.emit('roll_table', { tableId, secret })} />
            </>
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );

  const addPanel = adding && (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setAdding(null)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[85dvh] flex flex-col"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900 border-b border-gray-700 px-3 py-2.5 flex items-center gap-2 shrink-0">
          <div className="flex gap-1 flex-1">
            {[['library', 'My library'], ['import', '5eTools']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setAdding(k)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                  adding === k ? 'bg-dnd-gold text-gray-900' : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                }`}
              >{label}</button>
            ))}
          </div>
          <button
            onClick={() => setAdding(null)}
            className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm active:bg-gray-700"
          >Close</button>
        </div>

        {sent && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-xl text-[13px] border shrink-0 ${
            sent.ok ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
          }`}>{sent.text}</div>
        )}
        {busyStep && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl text-[13px] bg-gray-800 border border-gray-700 text-gray-300 shrink-0">
            {busyStep}
          </div>
        )}

        <div className="px-3 pt-3 shrink-0">
          <input
            value={adding === 'library' ? libQ : compQ}
            onChange={(e) => (adding === 'library' ? setLibQ(e.target.value) : setCompQ(e.target.value))}
            placeholder={adding === 'library' ? 'Search your library…' : 'Search 5eTools…'}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[15px] text-gray-100
                       placeholder:text-gray-600 focus:outline-none focus:border-dnd-gold"
          />
          {adding === 'import' && compStatus && !compStatus.ok && (
            <p className="text-[11px] text-amber-300/80 mt-1.5 leading-snug">
              Compendium unreachable{compStatus.url ? ` at ${compStatus.url}` : ''}. Your own library still works.
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] mt-2">
          {adding === 'library' && (
            <>
              {libBusy && lib.length === 0 && <p className="px-3 py-3 text-[13px] text-gray-500 italic">Searching…</p>}
              {!libBusy && lib.length === 0 && <p className="px-3 py-3 text-[13px] text-gray-500">Nothing matches.</p>}
              <div className="divide-y divide-gray-800">
                {lib.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-9 h-9 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                      {c.image_path && <img src={`/uploads/${c.image_path}`} alt="" className="w-full h-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] truncate">{c.name}</span>
                      <span className="block text-[11px] text-gray-500 truncate">{formatSizeType(c)}</span>
                    </span>
                    <button
                      onClick={() => placeCreature(c)}
                      className="shrink-0 px-3 py-2 rounded-xl bg-dnd-gold text-gray-900 text-[12px] font-semibold active:brightness-110"
                    >Place</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {adding === 'import' && (
            <>
              {compBusy && comp.length === 0 && <p className="px-3 py-3 text-[13px] text-gray-500 italic">Searching…</p>}
              {!compBusy && comp.length === 0 && <p className="px-3 py-3 text-[13px] text-gray-500">Nothing matches.</p>}
              <div className="divide-y divide-gray-800">
                {comp.map((row) => (
                  <div key={`${row.source}/${row.name}`} className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] truncate">{row.name}</span>
                        <span className="block text-[11px] text-gray-500 truncate">
                          {row.source}{row.cr ? ` · CR ${row.cr}` : ''}
                        </span>
                      </span>
                      {/* Two buttons, because they are genuinely different
                          jobs: stocking the library before a session, and
                          putting a thing on the board mid-fight. */}
                      <button
                        disabled={!!busyStep}
                        onClick={() => importAndPlace(row, false)}
                        className="shrink-0 px-2.5 py-2 rounded-xl bg-gray-800 border border-gray-700 text-[12px]
                                   text-gray-200 active:bg-gray-700 disabled:opacity-40"
                      >Add</button>
                      <button
                        disabled={!!busyStep}
                        onClick={() => importAndPlace(row, true)}
                        className="shrink-0 px-2.5 py-2 rounded-xl bg-dnd-gold text-gray-900 text-[12px]
                                   font-semibold active:brightness-110 disabled:opacity-40"
                      >Add & place</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );

  // The challenge sheet: a lock to pick, sent to one phone. Its own sheet
  // rather than a tab inside Talk — see the button above.
  const challengePanel = showChallenge && (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setShowChallenge(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[85dvh] overflow-y-auto
                   overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-3 py-2.5 flex items-center gap-2">
          <span className="flex-1 font-semibold text-emerald-300">🗝️ Send a challenge</span>
          <button
            onClick={() => setShowChallenge(false)}
            className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm active:bg-gray-700"
          >Close</button>
        </div>

        {sent && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-xl text-[13px] border ${
            sent.ok ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
          }`}>{sent.text}</div>
        )}

<div className="p-3 space-y-3">
            {whisperTargets.length === 0 ? (
              <p className="text-sm text-gray-400">Nobody is connected to send a challenge to yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {whisperTargets.map((n) => {
                    const on = (whisperTo || whisperTargets[0]) === n;
                    return (
                      <button key={n} onClick={() => setWhisperTo(n)}
                        className={`px-3 py-2 rounded-xl text-sm ${
                          on ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-300 active:bg-gray-700'}`}
                      >{n}</button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {MINIGAMES.map((g) => (
                    <button key={g.id} onClick={() => setGameId(g.id)}
                      className={`px-2.5 py-2 rounded-xl text-left border ${
                        gameId === g.id
                          ? 'bg-gray-700 border-dnd-gold text-gray-100'
                          : 'bg-gray-800 border-gray-700 text-gray-300 active:bg-gray-700'}`}>
                      <span className="text-base mr-1">{g.icon}</span>
                      <span className="text-[13px]">{g.name}</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">{g.skillName}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {MINIGAME_DCS.map(({ dc, label }) => (
                    <button key={dc} onClick={() => setGameDc(dc)}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] border ${
                        gameDc === dc
                          ? 'bg-dnd-gold/30 border-dnd-gold/60 text-dnd-gold'
                          : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                      {label} · {dc}
                    </button>
                  ))}
                </div>

                <input
                  value={gameNote}
                  onChange={(e) => setGameNote(e.target.value)}
                  placeholder="A line of setting — optional"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[15px] text-gray-100
                             placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                />

                <button
                  onClick={() => {
                    socket.emit('dm_minigame', {
                      targetName: whisperTo || whisperTargets[0],
                      gameId, dc: gameDc, note: gameNote.trim(),
                    });
                    setGameNote('');
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-700 text-white font-semibold text-sm active:bg-indigo-600"
                >Send the challenge</button>

                <p className="text-[11px] text-gray-500 leading-snug">
                  The game reads that character's ability and proficiency and
                  eases itself accordingly — a rogue with Expertise gets a
                  wider margin than a wizard with none.
                </p>

                {gameResults.length > 0 && (
                  <div className="pt-2 border-t border-gray-700/70 space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">What came back</div>
                    {gameResults.map((r) => (
                      <div key={r.id + r.ts} className="flex items-baseline gap-2 text-[12px]">
                        <span className={r.won ? 'text-emerald-300' : 'text-rose-300'}>{r.won ? '✓' : '✗'}</span>
                        <span className="text-gray-300 truncate">
                          {r.playerName} · DC {r.dc} · {r.detail || (r.won ? 'made it' : 'failed')}
                        </span>
                        <span className="ml-auto shrink-0 text-gray-600">{r.seconds}s</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
      </div>
    </div>
  );

  const talkPanel = talk && (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setTalk(null)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[85dvh] overflow-y-auto
                   overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-3 py-2.5 flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {[['whisper', 'Whisper'], ['npc', 'NPC speech']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTalk(k)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                  talk === k ? 'bg-dnd-gold text-gray-900' : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                }`}
              >{label}</button>
            ))}
          </div>
          <button
            onClick={() => setTalk(null)}
            className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm active:bg-gray-700"
          >Close</button>
        </div>

        {sent && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-xl text-[13px] border ${
            sent.ok ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
          }`}>{sent.text}</div>
        )}

        {talk === 'whisper' && (
          <div className="p-3 space-y-3">
            {whisperTargets.length === 0 ? (
              <p className="text-sm text-gray-400">Nobody is connected to whisper to yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {whisperTargets.map((n) => {
                    const on = (whisperTo || whisperTargets[0]) === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setWhisperTo(n)}
                        className={`px-3 py-2 rounded-xl text-sm ${
                          on ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                        }`}
                      >{n}</button>
                    );
                  })}
                </div>
                <textarea
                  value={whisperText}
                  onChange={(e) => setWhisperText(e.target.value)}
                  rows={3}
                  placeholder={`Private message to ${whisperTo || whisperTargets[0]}…`}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[15px] text-gray-100
                             placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={sendWhisper}
                  disabled={!whisperText.trim()}
                  className="w-full py-3 rounded-xl bg-indigo-700 text-white font-semibold text-sm
                             active:bg-indigo-600 disabled:opacity-40"
                >Send privately</button>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Reaches that player's laptop and their phone. Nobody else sees it.
                </p>
              </>
            )}
          </div>
        )}

        {talk === 'npc' && (
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <input
                value={npcSpeaker}
                onChange={(e) => setNpcSpeaker(e.target.value)}
                placeholder="Who is speaking"
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[15px] text-gray-100
                           placeholder:text-gray-600 focus:outline-none focus:border-dnd-gold"
              />
              <select
                value={npcLang}
                onChange={(e) => setNpcLang(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2.5 text-[13px] text-gray-200 max-w-[8.5rem]"
              >
                <option value="common">Common</option>
                {languages.filter((l) => l.slug !== 'common').map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Who hears it. A language nobody at the table knows comes out as
                gibberish on their screen — that is the plugin's whole point —
                so this is about WHO, not about whether they understand. */}
            <select
              value={npcTarget}
              onChange={(e) => setNpcTarget(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[14px] text-gray-200"
            >
              <option value="">Everyone at the table</option>
              {players.map((p) => (
                <option key={p.token.id} value={p.token.id}>
                  Only {p.token.nickname || p.token.name} ({p.playerName})
                </option>
              ))}
            </select>

            <textarea
              value={npcText}
              onChange={(e) => setNpcText(e.target.value)}
              rows={3}
              placeholder="“Halt. Who goes there?”"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-[15px] text-gray-100
                         placeholder:text-gray-600 focus:outline-none focus:border-dnd-gold"
            />
            <button
              onClick={speakAsNpc}
              disabled={!npcText.trim()}
              className="w-full py-3 rounded-xl bg-dnd-gold text-gray-900 font-semibold text-sm
                         active:brightness-110 disabled:opacity-40"
            >Speak</button>
            <p className="text-[11px] text-gray-500 leading-snug">
              Pops on the players' screens. Anyone whose character does not know
              the language sees it scrambled.
            </p>
          </div>
        )}
      </div>
    </div>
  );


  // ── Looking at a player's phone ─────────────────────────────────────────
  //
  // An iframe of the real /sheet route rather than a reimplementation: a
  // preview that is a copy of the screen drifts from it, and then the GM is
  // being shown something the player is not. Framed at phone proportions so
  // what the GM sees is laid out as the player's device lays it out.
  if (previewOf) {
    const src = `/sheet?code=${encodeURIComponent(code)}&name=${encodeURIComponent(previewOf)}&preview=1`;
    return (
      <div className="h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-gray-900 text-gray-100">
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button onClick={() => setPreviewOf(null)}
            className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-base">‹ Back</button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{previewOf}'s phone</div>
            <div className="truncate text-[11px] text-amber-300/80">as they see it · your changes are real</div>
          </div>
          {players.length > 1 && (
            <select
              value={previewOf}
              onChange={(e) => setPreviewOf(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-200 px-2 py-1.5 max-w-[8rem]"
            >
              {players.map((p) => <option key={p.playerName} value={p.playerName}>{p.playerName}</option>)}
            </select>
          )}
        </div>
        <div className="p-3 flex justify-center">
          {/* A phone-shaped window. 390x780 is an ordinary handset; the frame
              keeps the GM from reading a layout the player never gets. */}
          <div className="rounded-[2rem] border-4 border-gray-700 bg-black overflow-hidden shadow-2xl"
               style={{ width: 390, maxWidth: '100%', height: 780, maxHeight: 'calc(100dvh - 7rem)' }}>
            <iframe
              key={previewOf}
              title={`${previewOf}'s phone`}
              src={src}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  }

  const open = openId != null ? sheets[openId] : null;

  // ── Reading one block ───────────────────────────────────────────────────
  if (open) {
    return (
      <div className="h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-gray-900 text-gray-100">
        {/* Sticky, and thumb-sized: on a tablet the way back is the one control
            that must never require aiming. */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => setOpenId(null)}
            className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-gray-200 text-base"
          >‹ Back</button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{open.name}</div>
            <div className="truncate text-[11px] text-gray-500">{formatSizeType(open)}</div>
          </div>
        </div>
        <div className="p-3 pb-24 max-w-3xl mx-auto">
          <StatBlock creature={open} />
        </div>
        {/* Reading a monster's block is exactly when a GM decides it should
            say something, so the same control is here rather than one Back
            away. Speaker pre-filled with whatever is being read. */}
        <button
          onClick={() => { setNpcSpeaker(open.name || 'NPC'); setTalk('npc'); }}
          aria-label="Speak as this creature"
          className="fixed right-4 z-30 px-5 py-3.5 rounded-2xl bg-dnd-gold text-gray-900 font-semibold
                     shadow-2xl active:brightness-110 text-sm"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >Speak</button>
        {talkPanel}
        {challengePanel}
      </div>
    );
  }

  // ── The party ───────────────────────────────────────────────────────────
  if (showParty) {
    return (
      <div className="h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-gray-900 text-gray-100">
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex items-center gap-3 px-3 py-2.5"
             style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => setShowParty(false)}
            className="px-4 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-gray-200 text-base"
          >‹ Back</button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">The party</div>
            <div className="truncate text-[11px] text-gray-500">
              {party.length} on {mapName || 'this map'} · live
            </div>
          </div>
        </div>

        <div className="p-3 pb-24 max-w-3xl mx-auto space-y-2">
          {party.length === 0 && (
            <p className="p-5 text-sm text-gray-500 italic text-center">
              {connected ? 'No player tokens on this map yet.' : 'Connecting…'}
            </p>
          )}
          {party.map((p) => {
            const tone = p.down ? 'text-red-400'
              : p.pct > 50 ? 'text-green-300'
              : p.pct > 25 ? 'text-yellow-300' : 'text-red-300';
            const fill = p.down ? 'bg-red-700'
              : p.pct > 50 ? 'bg-green-600'
              : p.pct > 25 ? 'bg-yellow-600' : 'bg-red-600';
            return (
              <div key={p.token.id}
                className={`rounded-2xl border p-3 space-y-2 ${
                  p.down ? 'border-red-800/70 bg-red-950/20' : 'border-gray-700 bg-gray-900/60'}`}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold truncate">{p.name}</span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {p.playerName}
                      {p.shapedAs ? ` · wild shaped as ${p.shapedAs}` : ''}
                    </span>
                  </span>
                  <span className={`text-lg font-semibold tabular-nums shrink-0 ${tone}`}>
                    {p.max > 0 ? `${p.cur}/${p.max}` : '—'}
                    {p.temp > 0 && <span className="text-sky-300 text-sm"> +{p.temp}</span>}
                  </span>
                </div>

                <span className="block h-2 rounded-full bg-gray-800 overflow-hidden">
                  <span className={`block h-full ${fill}`} style={{ width: `${p.pct}%` }} />
                </span>

                {/* Everything that changes what they can do on their turn. */}
                <div className="flex flex-wrap gap-1.5">
                  {p.down && (
                    <span className="rounded-lg bg-red-900/60 border border-red-700 px-2 py-1 text-[11px] text-red-100">
                      Down · saves {p.deathSuccesses}✓ {p.deathFailures}✗
                    </span>
                  )}
                  {p.exhaustion > 0 && (
                    <span className="rounded-lg bg-amber-900/50 border border-amber-700 px-2 py-1 text-[11px] text-amber-100">
                      Exhaustion {p.exhaustion}
                    </span>
                  )}
                  {p.concentrating && (
                    <span className="rounded-lg bg-indigo-900/50 border border-indigo-700 px-2 py-1 text-[11px] text-indigo-100">
                      Concentrating · {p.concentrating}
                    </span>
                  )}
                  {p.conditions.map((c) => (
                    <span key={c}
                      className="rounded-lg bg-purple-900/50 border border-purple-700 px-2 py-1 text-[11px] text-purple-100 capitalize">
                      {c}
                    </span>
                  ))}
                  {!p.down && !p.exhaustion && !p.concentrating && p.conditions.length === 0 && (
                    <span className="text-[11px] text-gray-600">nothing on them</span>
                  )}
                </div>

                <div className="flex gap-2 pt-0.5">
                  {p.playerName && (
                    <button
                      onClick={() => { setShowParty(false); setPreviewOf(p.playerName); }}
                      className="flex-1 py-2 rounded-xl bg-gray-800 border border-gray-700 text-[12px] text-gray-300 active:bg-gray-700"
                    >Their phone</button>
                  )}
                  {p.sheet && (
                    <button
                      onClick={() => { setShowParty(false); setOpenId(p.sheet.id); }}
                      className="flex-1 py-2 rounded-xl bg-gray-800 border border-gray-700 text-[12px] text-gray-300 active:bg-gray-700"
                    >Stat block</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {talkPanel}
        {challengePanel}
      </div>
    );
  }

  // ── The list ────────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-gray-900 text-gray-100">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-3 py-2.5 space-y-2"
           style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-dnd-gold">Stat Blocks</h1>
          <span className="text-xs text-gray-500 truncate">
            {mapName || (connected ? 'no map' : 'connecting…')}
          </span>
          <button
            onClick={() => setShowParty(true)}
            className="ml-auto shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700
                       text-[11px] text-gray-200 active:bg-gray-700"
          >
            Party{party.length ? ` · ${party.length} ` : ' '}
            {partyHurt > 0 && <span className="ml-1 text-red-300">{'· '}{partyHurt} hurt</span>}
          </button>
          {/* Talking to the table belongs beside the party you are talking to,
              not in the bottom bar with the chest and the shop — those are
              things you open, this is something you say. */}
          <button
            onClick={() => { setTalk(talk ? null : 'whisper'); setShowChallenge(false); }}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-indigo-700 border border-indigo-500
                       text-[11px] text-white active:bg-indigo-600"
          >Talk</button>
          {/* Sending a lock to pick is not talking to the table — it was
              sitting under Talk because that was the only sheet that routed to
              one named player, which is a reason about plumbing rather than
              about what the GM came here to do. */}
          <button
            onClick={() => { setShowChallenge((v) => !v); setTalk(null); }}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] active:bg-emerald-600 ${
              showChallenge
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-emerald-700 border-emerald-500 text-white'}`}
          >Challenge</button>
          <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-500' : 'bg-gray-600'}`}
                title={connected ? 'Connected' : 'Connecting'} />
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search this map…"
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-base text-white focus:outline-none focus:border-dnd-gold"
          />
          {/* Adding a creature sits with the list it adds to, rather than in
              the bottom bar. A + beside a search box is already understood; the
              long label was spending a third of that bar to say it. */}
          <button
            onClick={() => setAdding(adding ? null : 'library')}
            aria-label="Add a creature from your library or the compendium"
            title="Add a creature"
            className="shrink-0 w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 text-dnd-gold
                       text-2xl leading-none font-semibold active:bg-gray-700"
          >+</button>
        </div>
      </div>

      {error && (
        <div className="m-3 p-3 rounded-xl bg-red-950/60 border border-red-800 text-sm text-red-200">
          {error}
          <div className="text-[11px] text-red-300/70 mt-1">Check the session code and GM password.</div>
        </div>
      )}

      <div className="divide-y divide-gray-800">
        {rows.length === 0 && !error && (
          <p className="p-5 text-sm text-gray-500 italic text-center">
            {connected ? 'Nothing with a stat block on this map yet.' : 'Connecting…'}
          </p>
        )}
        {rows.map((r) => {
          const sheet = sheets[r.creatureId];
          return (
            <button
              key={r.creatureId}
              onClick={() => sheet && setOpenId(r.creatureId)}
              // A generous row: this is read at arm's length, and tapped
              // without looking.
              className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-gray-800 min-h-[64px]"
            >
              <span className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                {sheet?.image_path
                  ? <img src={`/uploads/${sheet.image_path}`} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs text-gray-500">{r.label.slice(0, 2)}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base truncate">
                  {r.label}
                  {r.count > 1 && <span className="text-gray-500 text-sm"> ×{r.count}</span>}
                </span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {sheet
                    ? `${formatSizeType(sheet)}${sheet.challenge_rating ? ` · CR ${sheet.challenge_rating}` : ''}`
                    : 'loading…'}
                  {r.isPlayer && ' · player'}
                </span>
              </span>
              <span className="text-gray-600 text-lg shrink-0">›</span>
            </button>
          );
        })}
      </div>
      {/* Clears both fixed rows — the look-up box and the tools under it. */}
      <div className="h-40" style={{ height: 'max(10rem, calc(env(safe-area-inset-bottom) + 9rem))' }} />

      {/* Reaching the table, from wherever the GM is standing. Bottom-right
          and thumb-sized for the same reason the Back button is. */}
      {/* One bar rather than buttons pinned to opposite corners: a GM reaching
          across a tablet for a control in the far corner is how a tablet gets
          knocked off the table.

          Every tool on the bar is named on the bar. The chest, the tables and
          the shop share one sheet, but they get a button each rather than one
          button listing what is inside it: a label that enumerates its contents
          goes stale the moment a fourth tool arrives, and a GM hunting for the
          shop has no reason to open something called "Chest & tables". Wraps to
          two rows on a phone. */}
      {/* The dice tray, built like the players' so a GM reading this screen and
          a player reading theirs are throwing dice the same way. */}
      {showDice && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-end" onClick={() => setShowDice(false)}>
          <div className="w-full bg-gray-900 border-t border-amber-800/70 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold text-dnd-gold">Dice</span>
              <button onClick={() => setShowDice(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
            </div>
            <div className="p-3 space-y-2">
              {/* How the next die is thrown — set once, then throw whatever is
                  asked for. */}
              <div className="grid grid-cols-3 gap-1.5">
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
                  <button key={d} type="button"
                    onClick={() => socket.emit('roll_dice', {
                      dice: d, count: dieCount, modifier: dieMod,
                      mode: dieCount === 1 ? dieMode : null,
                    })}
                    className="py-3 rounded-xl bg-gray-800 border border-gray-700 active:bg-gray-700 font-mono text-sm text-gray-100">
                    {dieCount > 1 ? dieCount : ''}{d}
                  </button>
                ))}
                <button type="button" onClick={() => { setDieCount(1); setDieMod(0); setDieMode(null); }}
                  disabled={dieCount === 1 && dieMod === 0 && dieMode === null}
                  className="py-3 rounded-xl bg-gray-800/50 border border-gray-700/60 text-[11px] text-gray-500 disabled:opacity-40">
                  Reset
                </button>
              </div>

              <div className="flex items-center gap-2">
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
                <p className="text-[10px] text-amber-300/80">
                  {dieMode === 'advantage' ? 'Advantage' : 'Disadvantage'} applies to a single die only — {dieCount} dice will roll straight.
                </p>
              )}

              {/* THE LOG. Longer than the players' four: the GM is the one
                  person who needs to see what everybody rolled, not just what
                  they threw themselves. */}
              <div className="pt-2 border-t border-gray-700/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Roll log</span>
                  {diceRolls.length > 0 && (
                    <button type="button" onClick={() => setDiceRolls([])}
                      className="text-[11px] text-gray-500 active:text-gray-300">Clear</button>
                  )}
                </div>
                {diceRolls.length === 0 && (
                  <p className="text-[11px] text-gray-600 italic">Nothing thrown yet.</p>
                )}
                <div className="space-y-1">
                  {[...diceRolls].reverse().slice(0, 20).map((r) => {
                    const die = r.kept ?? (r.rolls?.length === 1 ? r.rolls[0] : null);
                    return (
                      <div key={r.id} className="flex items-baseline gap-2 text-[11px]">
                        <span className={`font-bold text-base ${
                          die === 20 ? 'text-amber-300' : die === 1 ? 'text-red-400' : 'text-gray-100'}`}>{r.total}</span>
                        <span className="text-gray-500 truncate">
                          {r.userName || 'someone'} · {r.count > 1 ? r.count : ''}{r.dice}
                          {r.modifier ? (r.modifier > 0 ? `+${r.modifier}` : r.modifier) : ''}
                          {r.rolls?.length > 1 ? ` → ${r.rolls.join(', ')}` : ''}
                          {r.label ? ` · ${r.label}` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOOK UP, DRAWN AS THE FIELD IT OPENS.
          The same control the players have on their own phones, in the same
          place and the same shape — a GM and a player asking "what does this
          do?" are asking the same question, and it should not look like two
          different features depending on which login you used. Full width,
          above the tools, because it is reached for far more often than the
          shop. */}
      {/* The same bottom row the players have, button for button: the search
          box fills the line and the dice keep the corner, round and labelled.
          A GM picking up a phone should not have to learn a second layout for
          the two things everyone reaches for mid-turn. */}
      {!showDice && (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          aria-label="Look up a rule, spell, item or monster"
          className="fixed z-30 left-4 right-[5.5rem] h-16 pl-4 pr-4 rounded-2xl bg-gray-800/95 border border-gray-600
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

      {!showDice && (
        <button
          type="button"
          onClick={() => setShowDice(true)}
          aria-label="Roll dice"
          className="fixed z-30 right-4 w-16 h-16 rounded-full bg-amber-900/90 border border-amber-600 text-amber-100
                     shadow-xl shadow-black/50 active:bg-amber-800 flex flex-col items-center justify-center leading-none"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <span className="text-2xl">⬣</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Dice</span>
        </button>
      )}

      <div
        className="fixed left-0 right-0 z-30 flex flex-wrap gap-2 px-3 justify-center pointer-events-none"
        style={{ bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4.75rem))' }}
      >
        {[['chest', 'Chest', chest.length], ['tables', 'Tables', 0],
          ['shop', 'Shop', shopOffers.length]].map(([k, label, badge]) => (
          <button
            key={k}
            onClick={() => setKit(kit === k ? null : k)}
            aria-label={label}
            className={`pointer-events-auto px-4 py-3.5 rounded-2xl border font-semibold shadow-2xl text-sm
                        ${kit === k ? 'bg-gray-700 border-dnd-gold text-dnd-gold'
                                    : 'bg-gray-800 border-gray-700 text-dnd-gold active:bg-gray-700'}`}
          >
            {label}
            {badge > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-dnd-gold text-gray-900 text-[10px] font-bold">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* role="dm": this is the one search that may show a GM secret. */}
      {showSearch && <ReferenceSearch role="dm" onClose={() => setShowSearch(false)} />}

      {talkPanel}
      {challengePanel}
      {addPanel}
      {kitPanel}
    </div>
  );
}

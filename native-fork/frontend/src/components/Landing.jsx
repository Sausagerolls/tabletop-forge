import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatureForm from './CreatureForm.jsx';
import {
  listPlayerSessions,
  listGmSessions,
  rememberPlayerSession,
  rememberGmSession,
  forgetSession,
} from '../utils/knownSessions.js';
import {
  gmAccount, gmToken, setGmSession, clearGmSession,
  login as gmLogin, register as gmRegister, me as gmMe,
  pairSession as gmPair, unpairSession as gmUnpair, logout as gmLogout,
  rememberSeat, saveSeat as pairSeat, forgetSeat,
} from '../utils/gmAccount.js';

// Real app icon — loads from /public/icons/ which already mirrors
// the website + native-app icon set. Falling back to an inline SVG
// here drifts every time the icon is updated, so reference the
// canonical PNG instead.
const ForgeIcon = () => (
  <img src="/icons/icon-192.png" alt="TableTop Forge"
       className="w-16 h-16 rounded-2xl" />
);
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline mr-1.5">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const DiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline mr-1.5">
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 inline mr-1.5">
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
    <path d="M5 17l.7 2.3 2.3.7-2.3.7L5 23l-.7-2.3L2 20l2.3-.7L5 17z" />
  </svg>
);

// Is this the desktop app or a server?
//
// Both run the same frontend, so the frontend has to ask. Importing a campaign
// belongs on the laptop's first screen and would be an alarming thing to offer on
// a server whose database is the campaign.
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/transfer/where')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setDesktop(!!d.desktop); })
      .catch(() => { /* an older server with no transfer route: stay hidden */ });
    return () => { cancelled = true; };
  }, []);
  return desktop;
}

export default function Landing() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [playerCode, setPlayerCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [dmCode, setDmCode] = useState('');
  const [dmPass, setDmPass] = useState('');
  const [newSession, setNewSession] = useState({ name: '', password: '' });
  const [tab, setTab] = useState('player');
  const [spectatorCode, setSpectatorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── The GM's account ───────────────────────────────────────────────────
  //
  // One login, with the tables paired to it. Held alongside the remembered
  // per-session logins rather than replacing them: a GM running one night on
  // somebody else's laptop still types a code and a password, and nothing
  // about a player's seat changes.
  const [account, setAccount] = useState(() => gmAccount());
  const [accountSessions, setAccountSessions] = useState([]);
  // The player half of the same account: the tables this person plays at, and
  // as whom. A seat is a bookmark — see gmAccounts.js — so it needs no password
  // and is saved automatically the moment they enter a game.
  const [accountSeats, setAccountSeats] = useState([]);
  const [showSeatForm, setShowSeatForm] = useState(false);
  const [seatForm, setSeatForm] = useState({ code: '', name: '' });
  const [accountMode, setAccountMode] = useState('signin');   // signin | register
  const [accountForm, setAccountForm] = useState({ username: '', password: '', displayName: '' });
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [pairForm, setPairForm] = useState({ code: '', pass: '' });
  const [showPair, setShowPair] = useState(false);

  // Player flow
  const [playerStep, setPlayerStep] = useState(1);
  const [playerCharacters, setPlayerCharacters] = useState([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Session switcher — shown by default when the user has previous
  // player or GM logins on this device. The "+ Add Another Session"
  // button flips this to false and reveals the original tabbed form
  // so a brand-new session can still be joined / created.
  const [knownPlayer, setKnownPlayer] = useState(() => listPlayerSessions());
  const [knownGm, setKnownGm]         = useState(() => listGmSessions());
  const hasKnown = knownPlayer.length > 0 || knownGm.length > 0
    || accountSessions.length > 0 || accountSeats.length > 0;
  const [showSwitcher, setShowSwitcher] = useState(() => listPlayerSessions().length > 0 || listGmSessions().length > 0);
  // A GM who has signed in on a machine that has never been used here has no
  // remembered rows, so the switcher starts hidden and their tables arrive a
  // moment later. Shown once, when they do — and only on first load, so it
  // cannot snatch the form away from somebody mid-type.
  const switcherSettled = useRef(false);
  useEffect(() => {
    if (switcherSettled.current) return;
    if (accountSessions.length > 0 || accountSeats.length > 0) {
      setShowSwitcher(true);
      switcherSettled.current = true;
    }
  }, [accountSessions.length, accountSeats.length]);

  function refreshKnown() {
    const p = listPlayerSessions();
    const g = listGmSessions();
    setKnownPlayer(p);
    setKnownGm(g);
    // If the user just forgot the last entry, drop back to the tabs
    // so they aren't staring at an empty switcher with nowhere to go.
    if (p.length === 0 && g.length === 0) setShowSwitcher(false);
  }

  // `where` is the screen to come back on. A remembered session is one
  // person's seat at one table, and which device they are holding changes from
  // night to night — the row offered only the laptop, so resuming on a phone
  // meant typing the code and name in again on the other tab.
  function rejoinPlayer(entry, where = 'vtt') {
    rememberPlayerSession(entry); // refresh lastUsedAt
    if (where === 'mobile') {
      navigate(
        `/sheet?code=${encodeURIComponent(entry.code)}` +
        `&name=${encodeURIComponent(entry.playerName)}`,
      );
      return;
    }
    navigate(
      `/play?code=${encodeURIComponent(entry.code)}` +
      `&name=${encodeURIComponent(entry.playerName)}` +
      `&creatureId=${entry.creatureId}`,
    );
  }

  async function rejoinGm(entry, where = 'vtt') {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${entry.code}/verify-dm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPassword: entry.pass }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError('GM password no longer works for this session — log in again to refresh it.');
        return;
      }
      rememberGmSession(entry); // refresh lastUsedAt
      navigate(where === 'mobile'
        ? `/blocks?code=${entry.code}&pass=${encodeURIComponent(entry.pass)}`
        : `/dm?code=${entry.code}&pass=${encodeURIComponent(entry.pass)}`);
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }

  // The paired list, re-read whenever the token might mean something new.
  useEffect(() => {
    if (!gmToken()) { setAccountSessions([]); return; }
    let cancelled = false;
    gmMe().then((data) => {
      if (cancelled) return;
      if (data.signedOut) { setAccount(null); setAccountSessions([]); return; }
      if (data.error) return;
      setAccount(data.account);
      setGmSession(null, data.account);
      setAccountSessions(data.sessions || []);
      setAccountSeats(data.seats || []);
    });
    return () => { cancelled = true; };
  }, [account?.id]);

  async function submitAccount(e) {
    e?.preventDefault?.();
    setAccountError('');
    const { username, password, displayName } = accountForm;
    if (!username.trim() || !password) { setAccountError('Username and password, please.'); return; }
    setAccountBusy(true);
    try {
      const data = accountMode === 'register'
        ? await gmRegister(username.trim(), password, displayName.trim())
        : await gmLogin(username.trim(), password);
      if (data.error) { setAccountError(data.error); return; }
      setGmSession(data.token, data.account);
      setAccount(data.account);
      setAccountForm({ username: '', password: '', displayName: '' });
      const mine = await gmMe();
      if (!mine.error) { setAccountSessions(mine.sessions || []); setAccountSeats(mine.seats || []); }
    } finally {
      setAccountBusy(false);
    }
  }

  async function signOutAccount() {
    await gmLogout();
    clearGmSession();
    setAccount(null);
    setAccountSessions([]);
    setAccountSeats([]);
  }

  // ── Seats ──────────────────────────────────────────────────────────────
  //
  // Pairing a seat by hand, for a table this person is not sitting at right
  // now. No password: a player login never had one (see gmAccounts.js).
  async function submitSeat(e) {
    e?.preventDefault?.();
    setAccountError('');
    const code = seatForm.code.trim().toUpperCase();
    const name = seatForm.name.trim();
    if (!code || !name) { setAccountError('The session code and the name you play under, please.'); return; }
    setAccountBusy(true);
    try {
      const data = await pairSeat(code, name, null);
      if (data.error) { setAccountError(data.error); return; }
      setAccountSeats(data.seats || []);
      setSeatForm({ code: '', name: '' });
      setShowSeatForm(false);
    } finally {
      setAccountBusy(false);
    }
  }

  async function dropSeat(id) {
    setAccountError('');
    const data = await forgetSeat(id);
    if (data.error) { setAccountError(data.error); return; }
    setAccountSeats(data.seats || []);
  }

  // Open a remembered seat. The same two screens a player has always had, with
  // nothing to type: the character rides along when the seat knows it.
  function openSeat(seat, where = 'vtt') {
    const base = `code=${encodeURIComponent(seat.session_code)}&name=${encodeURIComponent(seat.player_name)}`;
    if (where === 'mobile') { navigate(`/sheet?${base}`); return; }
    navigate(seat.creature_id
      ? `/play?${base}&creatureId=${seat.creature_id}`
      : `/sheet?${base}`);
  }

  // Pairing is the GM proving once that they know a session's own password.
  async function submitPair(e) {
    e?.preventDefault?.();
    setAccountError('');
    const code = pairForm.code.trim().toUpperCase();
    if (!code) { setAccountError('Which session? Its code, please.'); return; }
    setAccountBusy(true);
    try {
      const data = await gmPair(code, pairForm.pass);
      if (data.error) { setAccountError(data.error); return; }
      setAccountSessions(data.sessions || []);
      setPairForm({ code: '', pass: '' });
      setShowPair(false);
    } finally {
      setAccountBusy(false);
    }
  }

  async function unpair(code) {
    setAccountError('');
    const data = await gmUnpair(code);
    if (data.error) { setAccountError(data.error); return; }
    setAccountSessions(data.sessions || []);
  }

  // No password in the URL: the account token in this browser is the
  // credential, and the GM screens send it on join.
  function openPaired(code, where = 'vtt') {
    navigate(where === 'mobile' ? `/blocks?code=${code}` : `/dm?code=${code}`);
  }

  function handleForget(id) {
    forgetSession(id);
    refreshKnown();
  }

  // Load existing characters when entering step 2
  useEffect(() => {
    if (playerStep !== 2) return;
    setCharsLoading(true);
    setShowCreateForm(false);
    fetch(`/api/creatures?filter=characters&player_owner=${encodeURIComponent(playerName.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        setPlayerCharacters(data);
        if (data.length === 0) setShowCreateForm(true);
      })
      .catch(() => setShowCreateForm(true))
      .finally(() => setCharsLoading(false));
  }, [playerStep]);

  function enterGame(creature) {
    const code = playerCode.trim().toUpperCase();
    const name = playerName.trim();
    // Signed in? Then this seat is theirs on every device from now on. Saved
    // here rather than behind a button because this is the moment the three
    // facts — table, name, character — are all known and all correct.
    rememberSeat(code, name, creature.id);
    rememberPlayerSession({
      code,
      playerName: name,
      creatureId: creature.id,
      creatureName: creature.name,
      creatureImagePath: creature.image_path,
    });
    navigate(`/play?code=${code}&name=${encodeURIComponent(name)}&creatureId=${creature.id}`);
  }

  function handleCharacterSaved(creature) {
    enterGame(creature);
  }

  function handleCharacterSelected(creature) {
    enterGame(creature);
  }

  async function joinAsPlayer(e) {
    e.preventDefault();
    if (!playerCode.trim() || !playerName.trim()) return;
    setPlayerStep(2);
  }

  // The same code and name, on a phone. No character step: the sheet finds
  // what this player owns itself, and binds a seat if the GM has not made one.
  function openMySheet() {
    const code = playerCode.trim().toUpperCase();
    const name = playerName.trim();
    if (!code || !name) { setError('Your name and the session code, please.'); return; }
    // The phone route knows the table and the name but not the character — the
    // sheet finds that itself. Saved without one; the next entry through the
    // character picker fills it in.
    rememberSeat(code, name, null);
    navigate(`/sheet?code=${code}&name=${encodeURIComponent(name)}`);
  }

  // `where` is which GM screen to open once the password checks out. Both go
  // through the same verification — the stat-block view used to take the
  // password on trust and only find out it was wrong after navigating.
  async function joinAsDM(e, where = 'dm') {
    e?.preventDefault?.();
    setError('');
    if (!dmCode.trim() || !dmPass) { setError('Session code and GM password, please.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${dmCode.trim().toUpperCase()}/verify-dm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPassword: dmPass }),
      });
      const data = await res.json();
      if (!data.valid) { setError('Invalid code or password'); return; }
      const code = dmCode.trim().toUpperCase();
      // Best-effort fetch of the session name so the switcher row
      // can show "The Lost Mines" instead of just the code. The
      // /api/sessions/:code endpoint is public, so no auth needed.
      let sessionName = null;
      try {
        const info = await fetch(`/api/sessions/${code}`).then((r) => r.ok ? r.json() : null);
        sessionName = info?.name || null;
      } catch {}
      rememberGmSession({ code, pass: dmPass, sessionName });
      navigate(where === 'blocks'
        ? `/blocks?code=${code}&pass=${encodeURIComponent(dmPass)}`
        : `/dm?code=${code}&pass=${encodeURIComponent(dmPass)}`);
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }

  async function createSession(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = gmToken();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newSession.name, dmPassword: newSession.password || undefined }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      // A session made while signed in is already paired, so the account is the
      // way back into it and there is no password to carry in the URL. The one
      // the server generated is remembered here all the same: it is the only
      // copy, and it is what a co-GM on an unsigned-in browser would need.
      const pass = newSession.password || data.generated_dm_password || '';
      rememberGmSession({
        code: data.session_code,
        pass,
        sessionName: data.name || newSession.name,
      });
      if (data.paired) {
        const mine = await gmMe();
        if (!mine.error) setAccountSessions(mine.sessions || []);
        navigate(`/dm?code=${data.session_code}`);
        return;
      }
      navigate(`/dm?code=${data.session_code}&pass=${encodeURIComponent(pass)}`);
    } catch {
      setError('Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (t) =>
    `flex-1 py-3 text-sm font-semibold transition-colors ${
      tab === t
        ? 'bg-dnd-red text-white border-b-2 border-dnd-gold'
        : 'text-gray-400 hover:text-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-dnd-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center"><ForgeIcon /></div>
          <h1 className="text-3xl font-bold text-dnd-gold font-serif">TableTop Forge</h1>
          <p className="text-gray-400 mt-1 text-sm">Self-hosted virtual tabletop for 5e TTRPGs</p>
        </div>

        <div className="bg-dnd-panel rounded-xl overflow-hidden shadow-2xl border border-gray-700">
          {showSwitcher ? (
            <SessionSwitcher
              players={knownPlayer}
              gms={knownGm}
              account={account}
              accountSessions={accountSessions}
              accountSeats={accountSeats}
              onOpenPaired={openPaired}
              onOpenSeat={openSeat}
              loading={loading}
              error={error}
              onRejoinPlayer={rejoinPlayer}
              onRejoinGm={rejoinGm}
              onForget={handleForget}
              onAddNew={() => { setShowSwitcher(false); setError(''); setTab('player'); setPlayerStep(1); }}
            />
          ) : (<>
          {/* THREE TABS, NOT SIX.
              This asked twice for the same thing. "Join as Player" and "My
              Character" are one person with one code and one name, choosing
              between a laptop and a phone; "GM Login" and "Stat Blocks" are one
              GM with one password doing the same. Six tabs across a phone-width
              card truncated to initials and made the two halves of each pair
              look like different accounts. So the tabs ask WHO you are, and the
              device is a choice inside, where the difference can be spelled
              out. Spectate is a TV, set up once — it sits under the card. */}
          <div className="flex border-b border-gray-700">
            <button className={tabClass('player')} onClick={() => { setTab('player'); setPlayerStep(1); }}><PersonIcon />Player</button>
            <button className={tabClass('dm')} onClick={() => setTab('dm')}><DiceIcon />Game Master</button>
            <button className={tabClass('create')} onClick={() => setTab('create')}><SparkleIcon />New Session</button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* ── PLAYER STEP 1 ── */}
            {tab === 'player' && playerStep === 1 && (
              <PlayerAccountPanel
                account={account}
                seats={accountSeats}
                mode={accountMode}
                setMode={setAccountMode}
                form={accountForm}
                setForm={setAccountForm}
                busy={accountBusy}
                error={accountError}
                onSubmit={submitAccount}
                onSignOut={signOutAccount}
                onOpen={openSeat}
                onForgetSeat={dropSeat}
                showSeatForm={showSeatForm}
                setShowSeatForm={setShowSeatForm}
                seatForm={seatForm}
                setSeatForm={setSeatForm}
                onPairSeat={submitSeat}
              />
            )}

            {tab === 'player' && playerStep === 1 && (
              <form onSubmit={joinAsPlayer} className="space-y-4">
                <div className="text-[11px] uppercase tracking-wider text-gray-500">
                  {account ? 'Or join a table you have not played at yet' : 'Join with your name and the code'}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="Thorin Oakenshield"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Code</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white uppercase font-mono tracking-widest focus:outline-none focus:border-dnd-gold"
                    placeholder="ABC123"
                    value={playerCode}
                    onChange={(e) => setPlayerCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                  />
                </div>
                {/* The device, as the thing you press. Two submit buttons
                    rather than a mode switch above the fields: the choice IS
                    the action, and naming what each one gives you is the whole
                    point of merging the two old tabs. */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded-xl bg-dnd-red hover:bg-red-700 text-white px-3 py-3 text-left transition-colors"
                  >
                    <span className="block text-base">🖥️</span>
                    <span className="block font-semibold text-sm mt-1">VTT</span>
                    <span className="block text-[11px] text-red-100/80 leading-snug mt-0.5">
                      Map, tokens and dice. For a laptop or tablet.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openMySheet}
                    className="rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-100 px-3 py-3 text-left transition-colors"
                  >
                    <span className="block text-base">📱</span>
                    <span className="block font-semibold text-sm mt-1">Mobile login</span>
                    <span className="block text-[11px] text-gray-400 leading-snug mt-0.5">
                      Sheet, hit points and spells. For your phone.
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* ── PLAYER STEP 2 ── */}
            {tab === 'player' && playerStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mb-1 flex justify-center"><PersonIcon /></div>
                  <h2 className="text-dnd-gold font-semibold">Choose Your Character</h2>
                  <p className="text-xs text-gray-400 mt-1">{playerName}</p>
                </div>

                {charsLoading && (
                  <div className="text-center text-gray-500 py-4">Loading characters...</div>
                )}

                {/* Existing characters list */}
                {!charsLoading && !showCreateForm && playerCharacters.length > 0 && (
                  <div className="space-y-3">
                    {playerCharacters.map((c) => {
                      const imgUrl = c.image_path ? `/uploads/${c.image_path}` : '/uploads/creatures/default_player.png';
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-dnd-gold/50 cursor-pointer transition-colors"
                          onClick={() => handleCharacterSelected(c)}
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {imgUrl ? (
                              <img src={imgUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">🧙</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white text-sm truncate">{c.name}</div>
                            <div className="text-xs text-gray-400">{c.creature_type} • HP {c.hit_points} • AC {c.armor_class}</div>
                          </div>
                          <div className="text-dnd-gold text-sm shrink-0">Play →</div>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full py-2 text-sm text-dnd-gold border border-dnd-gold/40 rounded-lg hover:bg-dnd-gold/10 transition-colors"
                    >
                      + Create New Character
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerStep(1)}
                      className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {/* Full creation form */}
                {!charsLoading && showCreateForm && (
                  <div className="space-y-3">
                    <div className="border border-gray-700 rounded-xl overflow-hidden" style={{ height: '460px' }}>
                      <CreatureForm
                        creature={null}
                        onSave={handleCharacterSaved}
                        onCancel={playerCharacters.length > 0 ? () => setShowCreateForm(false) : () => setPlayerStep(1)}
                        extraFields={{ is_player_character: 'true', player_owner: playerName.trim() }}
                        submitLabel="Enter the Adventure"
                        isPlayerCharacter
                      />
                    </div>
                    {playerCharacters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                      >
                        ← Back to Characters
                      </button>
                    )}
                    {playerCharacters.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setPlayerStep(1)}
                        className="w-full text-sm text-gray-400 hover:text-gray-200 py-1"
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── GM LOGIN ── */}
            {tab === 'dm' && (
              <GmAccountPanel
                account={account}
                sessions={accountSessions}
                mode={accountMode}
                setMode={setAccountMode}
                form={accountForm}
                setForm={setAccountForm}
                busy={accountBusy}
                error={accountError}
                onSubmit={submitAccount}
                onSignOut={signOutAccount}
                onOpen={openPaired}
                onUnpair={unpair}
                showPair={showPair}
                setShowPair={setShowPair}
                pairForm={pairForm}
                setPairForm={setPairForm}
                onPair={submitPair}
              />
            )}

            {tab === 'dm' && (
              <form onSubmit={joinAsDM} className="space-y-4">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 pt-1">
                  {account ? 'Or open a session that is not paired' : 'Or use this session\u2019s own password'}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Code</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white uppercase font-mono tracking-widest focus:outline-none focus:border-dnd-gold"
                    placeholder="ABC123"
                    value={dmCode}
                    onChange={(e) => setDmCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">GM Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="••••••••"
                    value={dmPass}
                    onChange={(e) => setDmPass(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-3 py-3 text-left transition-colors disabled:opacity-50"
                  >
                    <span className="block text-base">🖥️</span>
                    <span className="block font-semibold text-sm mt-1">
                      {loading ? 'Verifying…' : 'VTT'}
                    </span>
                    <span className="block text-[11px] text-yellow-900/80 leading-snug mt-0.5">
                      The whole table: maps, tokens, every panel.
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => joinAsDM(null, 'blocks')}
                    className="rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-100 px-3 py-3 text-left transition-colors disabled:opacity-50"
                  >
                    <span className="block text-base">📱</span>
                    <span className="block font-semibold text-sm mt-1">Mobile login</span>
                    <span className="block text-[11px] text-gray-400 leading-snug mt-0.5">
                      Second screen: stat blocks, chest, whispers. Nothing moves the board.
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* ── CREATE SESSION ── */}
            {tab === 'create' && (
              <form onSubmit={createSession} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Name</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="The Lost Mines of Phandelver"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    GM Password {account && <span className="text-gray-500">(optional)</span>}
                  </label>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold"
                    placeholder={account ? 'Leave blank — your account opens it' : 'Choose a strong password'}
                    value={newSession.password}
                    onChange={(e) => setNewSession({ ...newSession, password: e.target.value })}
                    required={!account}
                    minLength={account ? 0 : 4}
                  />
                  {account && (
                    <p className="text-[11px] text-gray-500 leading-snug mt-1">
                      Signed in as <span className="text-gray-300">{account.username}</span>, so this session
                      pairs to your account and opens without one. A password is only needed to let somebody
                      else GM it from a browser that is not signed in.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
              </form>
            )}

            {tab === 'spectate' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const c = spectatorCode.trim().toUpperCase();
                  if (!c) return;
                  navigate(`/spectate?code=${c}`);
                }}
                className="space-y-4"
              >
                <p className="text-xs text-gray-400 leading-snug">
                  Read-only audience view for a TV at the table. Combines the line-of-sight of every player on the current map and follows whichever map the GM is showing. No password, no controls — just the map.
                </p>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Code</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold uppercase tracking-widest font-mono"
                    placeholder="ABC123"
                    value={spectatorCode}
                    onChange={(e) => setSpectatorCode(e.target.value.toUpperCase())}
                    maxLength={12}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-3 rounded-lg font-semibold transition-colors"
                >
                  Open Spectator View
                </button>
              </form>
            )}
            {hasKnown && (
              <button
                type="button"
                onClick={() => { setShowSwitcher(true); setError(''); }}
                className="mt-4 w-full text-sm text-gray-400 hover:text-gray-200 py-1"
              >
                ← Back to remembered sessions
              </button>
            )}
          </div>
          </>)}
        </div>

        {/* The TV. Set up once, at the start of an evening, by whoever is
            nearest the screen — not a role anybody logs in as, so it reads as a
            line of text under the card rather than a third of the tab bar. */}
        {!showSwitcher && tab !== 'spectate' && (
          <button
            type="button"
            onClick={() => { setTab('spectate'); setError(''); }}
            className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1"
          >
            📺 Showing the map on a TV? Open the spectator view
          </button>
        )}
        {!showSwitcher && tab === 'spectate' && (
          <button
            type="button"
            onClick={() => { setTab('player'); setPlayerStep(1); setError(''); }}
            className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1"
          >
            ← Back to logging in
          </button>
        )}

        {isDesktop && <ImportPack />}
      </div>
    </div>
  );
}

// Loading a session pack exported from the server the campaign lives on.
//
// On the first screen deliberately: on a fresh laptop there is nothing to log in
// to yet, so "import the campaign" is the first thing that needs doing, and it
// cannot be behind a session picker that is empty until it has been done.
function ImportPack() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function send(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const body = new FormData();
      body.append('pack', file);
      const res = await fetch('/api/transfer/import', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="mt-4 bg-dnd-panel/70 rounded-xl border border-gray-700 p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-dnd-gold">Import a session</h2>
        <span className="text-[10px] text-gray-500">desktop only</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-snug mb-3">
        Load a <span className="font-mono">.ttfpack</span> exported from your server — every
        session, every library, every piece of art. It all works offline.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".ttfpack,.zip"
        disabled={busy}
        onChange={(e) => send(e.target.files?.[0])}
        className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0
                   file:text-sm file:font-semibold file:bg-dnd-gold file:text-gray-900
                   hover:file:bg-yellow-400 disabled:opacity-50"
      />

      {busy && (
        <p className="text-[11px] text-amber-300 mt-3 leading-snug">
          Loading — a full campaign takes a minute or two. Don't close the app.
        </p>
      )}
      {error && <p className="text-[11px] text-red-300 mt-3 leading-snug">{error}</p>}

      {result && (
        <div className="mt-3 rounded-lg bg-gray-800 border border-gray-700 p-3 space-y-1">
          <p className="text-sm text-emerald-300 font-semibold">
            Imported.
          </p>
          <p className="text-[11px] text-gray-400">
            {result.written} rows, {result.files} files
            {result.packedAt ? ` · packed ${String(result.packedAt).slice(0, 16).replace('T', ' ')}` : ''}
          </p>
          {/* Every session came over, so list them rather than naming one. */}
          {Array.isArray(result.sessions) && result.sessions.length > 0 ? (
            <div className="text-[11px] text-gray-300">
              <div className="mb-1">Log in as GM with any of these, using the password you use on the server:</div>
              <ul className="space-y-0.5">
                {result.sessions.map((s) => (
                  <li key={s.code}>
                    <span className="font-mono text-dnd-gold">{s.code}</span>
                    <span className="text-gray-400"> — {s.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-gray-300">
              Log in as GM with code <span className="font-mono text-dnd-gold">{result.session?.code}</span>
              {' '}and the password you use on the server.
            </p>
          )}
          {/* A pack from a newer server carries columns this build has never heard
              of. They are dropped rather than failing the import, but the GM needs
              to know the app is behind, not the data. */}
          {result.droppedColumns && Object.keys(result.droppedColumns).length > 0 && (
            <p className="text-[11px] text-amber-300 leading-snug">
              This app is older than the pack — {Object.keys(result.droppedColumns).length} table(s)
              had fields it does not know about, and those were left out. Update the app.
            </p>
          )}
          {result.failureCount > 0 && (
            <details className="text-[11px] text-amber-300">
              <summary className="cursor-pointer">{result.failureCount} row(s) did not load</summary>
              <ul className="mt-1 space-y-0.5 text-gray-400 max-h-40 overflow-y-auto">
                {result.failures.map((f, i) => <li key={i} className="font-mono text-[10px]">{f}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function SessionSwitcher({ players, gms, account, accountSessions = [], accountSeats = [], onOpenPaired, onOpenSeat, loading, error, onRejoinPlayer, onRejoinGm, onForget, onAddNew }) {
  return (
    <div className="p-6 space-y-5">
      <div className="text-center">
        <h2 className="text-dnd-gold font-semibold text-lg">Welcome Back</h2>
        <p className="text-xs text-gray-400 mt-1">Pick a session to rejoin, or add a new one.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {players.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Player Characters</h3>
          <div className="space-y-2">
            {players.map((p) => (
              <SessionRow
                key={p.id}
                avatar={p.creatureImagePath ? `/uploads/${p.creatureImagePath}` : '/uploads/creatures/default_player.png'}
                title={p.creatureName || p.playerName}
                subtitle={`${p.playerName} • Session ${p.code}`}
                loading={loading}
                onVtt={() => onRejoinPlayer(p, 'vtt')}
                onMobile={() => onRejoinPlayer(p, 'mobile')}
                onForget={() => onForget(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {account && accountSeats.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Your characters · {account.displayName || account.username}
          </h3>
          <div className="space-y-2">
            {accountSeats.filter((seat) => !seat.session_missing).map((seat) => (
              <SessionRow
                key={`seat-${seat.id}`}
                avatar={seat.creature_image ? `/uploads/${seat.creature_image}` : null}
                emoji="🧝"
                title={seat.creature_name || seat.player_name}
                subtitle={`${seat.session_name || 'Unknown table'} • ${seat.session_code}`}
                loading={loading}
                onVtt={() => onOpenSeat(seat, 'vtt')}
                onMobile={() => onOpenSeat(seat, 'mobile')}
              />
            ))}
          </div>
        </div>
      )}

      {account && accountSessions.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Your tables · {account.displayName || account.username}
          </h3>
          <div className="space-y-2">
            {accountSessions.map((s) => (
              <SessionRow
                key={`acct-${s.id}`}
                emoji="🗝️"
                title={s.name || `Session ${s.session_code}`}
                subtitle={`GM account • ${s.session_code}`}
                loading={loading}
                onVtt={() => onOpenPaired(s.session_code, 'vtt')}
                onMobile={() => onOpenPaired(s.session_code, 'mobile')}
              />
            ))}
          </div>
        </div>
      )}

      {gms.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">GM Logins</h3>
          <div className="space-y-2">
            {gms.map((g) => (
              <SessionRow
                key={g.id}
                emoji="🎲"
                title={g.sessionName || `Session ${g.code}`}
                subtitle={`GM • ${g.code}`}
                loading={loading}
                onVtt={() => onRejoinGm(g, 'vtt')}
                onMobile={() => onRejoinGm(g, 'mobile')}
                onForget={() => onForget(g.id)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAddNew}
        className="w-full py-2 text-sm text-dnd-gold border border-dnd-gold/40 rounded-lg hover:bg-dnd-gold/10 transition-colors"
      >
        + Add Another Session
      </button>
    </div>
  );
}

// ── A player's account ───────────────────────────────────────────────────────
//
// The same account the GM panel signs into, seen from the player's side. A
// player has no password to prove — their login has always been a name and a
// code — so there is nothing to claim and nothing to verify. What the account
// buys them is that the name and the code stop being something to carry from
// device to device: sit down once, and the seat is on every screen they sign
// in on.
//
// Joining by hand still sits underneath, untouched, for a guest at somebody
// else's table or a player who wants no account at all.
function PlayerAccountPanel({
  account, seats, mode, setMode, form, setForm, busy, error,
  onSubmit, onSignOut, onOpen, onForgetSeat,
  showSeatForm, setShowSeatForm, seatForm, setSeatForm, onPairSeat,
}) {
  const input = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold';

  if (!account) {
    return (
      <div className="mb-5 rounded-xl border border-dnd-red/40 bg-dnd-red/5 p-3 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-red-200">
            {mode === 'register' ? 'Create an account' : 'Sign in'}
          </h3>
          <button
            type="button"
            onClick={() => setMode(mode === 'register' ? 'signin' : 'register')}
            className="text-[11px] text-gray-400 hover:text-gray-200 underline decoration-dotted"
          >
            {mode === 'register' ? 'I already have one' : 'I need an account'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 leading-snug">
          Optional. An account remembers which tables you play at and who you play — so a new
          phone or a borrowed laptop is one sign-in rather than a code and a name typed again.
        </p>
        <form onSubmit={onSubmit} className="space-y-2">
          <input
            className={input}
            placeholder="Username"
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            className={input}
            type="password"
            placeholder="Password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {mode === 'register' && (
            <input
              className={input}
              placeholder="Display name (optional)"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          )}
          {error && <div className="text-xs text-red-300">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-dnd-red hover:bg-red-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {busy ? '…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-dnd-red/40 bg-dnd-red/5 p-3 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-red-200 truncate">
          {account.displayName || account.username}
        </h3>
        <button
          type="button"
          onClick={onSignOut}
          className="text-[11px] text-gray-400 hover:text-gray-200 underline decoration-dotted shrink-0"
        >
          Sign out
        </button>
      </div>

      {seats.length === 0 ? (
        <p className="text-[11px] text-gray-400 leading-snug">
          No tables yet. Join one below and it is saved here automatically — on this device and
          every other one you sign in on.
        </p>
      ) : (
        <div className="space-y-2">
          {seats.map((seat) => (
            <div key={seat.id} className="rounded-lg bg-gray-800/80 border border-gray-700 p-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {seat.creature_image
                    ? <img src={`/uploads/${seat.creature_image}`} alt="" className="w-full h-full object-cover" />
                    : <span className="text-base">🧝</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-semibold truncate">
                    {seat.creature_name || seat.player_name}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {seat.session_name || 'Unknown table'} · <span className="font-mono tracking-widest">{seat.session_code}</span>
                    {seat.creature_name ? ` · as ${seat.player_name}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onForgetSeat(seat.id)}
                  title="Forget this seat. Your character and the game are untouched."
                  className="shrink-0 text-[11px] text-gray-500 hover:text-red-300"
                >
                  Forget
                </button>
              </div>
              {seat.session_missing ? (
                <p className="text-[11px] text-amber-300/80 mt-2 leading-snug">
                  That session is gone from the server — the GM has deleted it. Forget the seat to tidy the list.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => onOpen(seat, 'vtt')}
                    className="py-1.5 rounded-lg bg-dnd-red/90 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                  >🖥️ VTT</button>
                  <button
                    type="button"
                    onClick={() => onOpen(seat, 'mobile')}
                    className="py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-100 text-xs font-semibold transition-colors"
                  >📱 Mobile</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-xs text-red-300">{error}</div>}

      {showSeatForm ? (
        <form onSubmit={onPairSeat} className="space-y-2 pt-1 border-t border-gray-700">
          <p className="text-[11px] text-gray-400 leading-snug pt-2">
            A table you are not at this minute. Your character is picked up the first time you
            enter the game.
          </p>
          <input
            className={`${input} uppercase font-mono tracking-widest`}
            placeholder="ABC123"
            maxLength={10}
            value={seatForm.code}
            onChange={(e) => setSeatForm({ ...seatForm, code: e.target.value.toUpperCase() })}
          />
          <input
            className={input}
            placeholder="The name you play under"
            value={seatForm.name}
            onChange={(e) => setSeatForm({ ...seatForm, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={busy}
              className="py-2 rounded-lg bg-dnd-red hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
            >{busy ? '…' : 'Add it'}</button>
            <button
              type="button"
              onClick={() => setShowSeatForm(false)}
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm"
            >Cancel</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowSeatForm(true)}
          className="w-full py-1.5 text-xs text-red-200 border border-dnd-red/40 rounded-lg hover:bg-dnd-red/10 transition-colors"
        >
          + Add a table by code
        </button>
      )}
    </div>
  );
}

// ── The GM's account ─────────────────────────────────────────────────────────
//
// Signed out, this is a sign-in box. Signed in, it is the list of tables that
// belong to this GM — which is the whole point of the feature: one login, and
// the codes stop being something to remember.
//
// The per-session code-and-password form still sits underneath. A session that
// has never been paired, a co-GM running one night, a browser nobody wants to
// sign in on: all still work exactly as before.
function GmAccountPanel({
  account, sessions, mode, setMode, form, setForm, busy, error,
  onSubmit, onSignOut, onOpen, onUnpair,
  showPair, setShowPair, pairForm, setPairForm, onPair,
}) {
  const input = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dnd-gold';

  if (!account) {
    return (
      <div className="mb-5 rounded-xl border border-dnd-gold/40 bg-dnd-gold/5 p-3 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-dnd-gold">
            {mode === 'register' ? 'Create a GM account' : 'Sign in as GM'}
          </h3>
          <button
            type="button"
            onClick={() => setMode(mode === 'register' ? 'signin' : 'register')}
            className="text-[11px] text-gray-400 hover:text-gray-200 underline decoration-dotted"
          >
            {mode === 'register' ? 'I already have one' : 'I need an account'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 leading-snug">
          One login for every table you run. Pair your sessions to it once and they are listed
          here on any machine you sign in on — no codes, no password per game.
        </p>
        <form onSubmit={onSubmit} className="space-y-2">
          <input
            className={input}
            placeholder="Username"
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            className={input}
            type="password"
            placeholder="Password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {mode === 'register' && (
            <input
              className={input}
              placeholder="Display name (optional)"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          )}
          {error && <div className="text-xs text-red-300">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {busy ? '…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-dnd-gold/40 bg-dnd-gold/5 p-3 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-dnd-gold truncate">
          {account.displayName || account.username}
        </h3>
        <button
          type="button"
          onClick={onSignOut}
          className="text-[11px] text-gray-400 hover:text-gray-200 underline decoration-dotted shrink-0"
        >
          Sign out
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-[11px] text-gray-400 leading-snug">
          No tables paired yet. Pair one with its code and GM password and it will be here
          every time you sign in.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-lg bg-gray-800/80 border border-gray-700 p-2">
              <div className="flex items-baseline gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-semibold truncate">{s.name || 'Untitled table'}</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    <span className="font-mono tracking-widest">{s.session_code}</span>
                    {s.map_name ? ` · ${s.map_name}` : ''}
                    {s.token_count ? ` · ${s.token_count} token${s.token_count === 1 ? '' : 's'}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUnpair(s.session_code)}
                  title="Stop listing this table here. The session, its maps and its tokens are untouched."
                  className="shrink-0 text-[11px] text-gray-500 hover:text-red-300"
                >
                  Unpair
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onOpen(s.session_code, 'vtt')}
                  className="py-1.5 rounded-lg bg-dnd-red/90 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >🖥️ VTT</button>
                <button
                  type="button"
                  onClick={() => onOpen(s.session_code, 'mobile')}
                  className="py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-100 text-xs font-semibold transition-colors"
                >📱 Mobile</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-xs text-red-300">{error}</div>}

      {showPair ? (
        <form onSubmit={onPair} className="space-y-2 pt-1 border-t border-gray-700">
          <p className="text-[11px] text-gray-400 leading-snug pt-2">
            Its code, and the GM password that session was made with — proof it is yours. You will
            not need either again once it is paired.
          </p>
          <input
            className={`${input} uppercase font-mono tracking-widest`}
            placeholder="ABC123"
            maxLength={10}
            value={pairForm.code}
            onChange={(e) => setPairForm({ ...pairForm, code: e.target.value.toUpperCase() })}
          />
          <input
            className={input}
            type="password"
            placeholder="That session's GM password"
            value={pairForm.pass}
            onChange={(e) => setPairForm({ ...pairForm, pass: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={busy}
              className="py-2 rounded-lg bg-dnd-gold hover:bg-yellow-500 text-gray-900 text-sm font-semibold disabled:opacity-50"
            >{busy ? '…' : 'Pair it'}</button>
            <button
              type="button"
              onClick={() => setShowPair(false)}
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm"
            >Cancel</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowPair(true)}
          className="w-full py-1.5 text-xs text-dnd-gold border border-dnd-gold/40 rounded-lg hover:bg-dnd-gold/10 transition-colors"
        >
          + Pair an existing session
        </button>
      )}
    </div>
  );
}

// A remembered seat, and the two screens it can be taken on.
//
// The row used to be one big button, which is why it could only ever resume on
// one device. The identity is now a label and the devices are the buttons —
// same two words as the login tabs, so "VTT" and "Mobile login" mean the same
// thing wherever they are read.
function SessionRow({ avatar, emoji, title, subtitle, loading, onVtt, onMobile, onForget }) {
  // No Forget on an account row: that pairing lives on the server, not in this
  // browser, and unpairing is done from the GM tab where the consequence can be
  // spelled out.
  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-dnd-gold/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{emoji || '🧙'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{title}</div>
          <div className="text-xs text-gray-400 truncate">{subtitle}</div>
        </div>
        {onForget && (
          <button
            type="button"
            onClick={onForget}
            title="Forget this session"
            className="shrink-0 text-gray-500 hover:text-red-400 px-2 py-1 text-xs"
          >
            Forget
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <button
          type="button"
          onClick={onVtt}
          disabled={loading}
          className="py-2 rounded-lg bg-dnd-red/90 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? '…' : '🖥️ VTT'}
        </button>
        <button
          type="button"
          onClick={onMobile}
          disabled={loading}
          className="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-100 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? '…' : '📱 Mobile'}
        </button>
      </div>
    </div>
  );
}

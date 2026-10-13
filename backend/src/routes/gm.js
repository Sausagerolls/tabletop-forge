// The account API: sign up, sign in, and which tables are mine.
//
// Two kinds of pairing hang off one account. A GM OWNS a session, proved once
// with that session's GM password. A PLAYER keeps a SEAT: a session code, the
// name they play under and their character — a bookmark, not a claim, because
// a player login has never had a secret to prove (see gmAccounts.js).
//
// Mounted twice: /api/gm for the GM screens that already call it, and
// /api/account, which is what this is and what new code should use.
//
// Nothing here can read or change what happens inside a session — that is the
// socket layer's job, and it checks ownership for itself (see join_session).

const express = require('express');
const db = require('../db');
const gm = require('../gmAccounts');

const router = express.Router();

// Pulls the account off the request, or answers 401. Used by everything below
// that is not sign-up or sign-in.
async function requireAccount(req, res, next) {
  try {
    const account = await gm.accountForToken(db, gm.tokenFrom(req));
    if (!account) return res.status(401).json({ error: 'Sign in again.' });
    req.gmAccount = account;
    req.gmToken = gm.tokenFrom(req);
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const publicAccount = (a) => ({ id: a.id, username: a.username, displayName: a.display_name || null });

// POST /api/gm/register — make an account and sign straight in.
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body || {};
    const made = await gm.createAccount(db, { username, password, displayName });
    if (made.error) return res.status(400).json({ error: made.error });
    const token = await gm.issueToken(db, made.account.id, req.headers['user-agent']);
    res.status(201).json({ token, account: publicAccount(made.account) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gm/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const account = await gm.verifyPassword(db, { username, password });
    if (!account) return res.status(401).json({ error: 'Wrong username or password.' });
    const token = await gm.issueToken(db, account.id, req.headers['user-agent']);
    res.json({ token, account: publicAccount(account) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gm/logout — this browser only.
router.post('/logout', requireAccount, async (req, res) => {
  try {
    await gm.revokeToken(db, req.gmToken);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gm/logout-everywhere — every browser this account has signed in on.
router.post('/logout-everywhere', requireAccount, async (req, res) => {
  try {
    await gm.revokeAllTokens(db, req.gmAccount.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gm/me — who this token belongs to, and their tables.
router.get('/me', requireAccount, async (req, res) => {
  try {
    res.json({
      account: publicAccount(req.gmAccount),
      sessions: await gm.sessionsForAccount(db, req.gmAccount.id),
      seats: await gm.seatsForAccount(db, req.gmAccount.id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gm/sessions — the same list on its own, for refreshing.
router.get('/sessions', requireAccount, async (req, res) => {
  try {
    res.json(await gm.sessionsForAccount(db, req.gmAccount.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gm/sessions/:code/pair — claim a session with its GM password.
router.post('/sessions/:code/pair', requireAccount, async (req, res) => {
  try {
    const out = await gm.pairSession(db, req.gmAccount.id, req.params.code, req.body?.dmPassword);
    if (out.error) return res.status(400).json({ error: out.error });
    res.json({ ok: true, already: !!out.already, sessions: await gm.sessionsForAccount(db, req.gmAccount.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gm/sessions/:code/pair — let go of it. The session itself, its
// map and its tokens are untouched; it simply stops being listed, and its GM
// password still opens it.
router.delete('/sessions/:code/pair', requireAccount, async (req, res) => {
  try {
    const ok = await gm.unpairSession(db, req.gmAccount.id, req.params.code);
    if (!ok) return res.status(404).json({ error: 'That session is not paired to this account.' });
    res.json({ ok: true, sessions: await gm.sessionsForAccount(db, req.gmAccount.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gm/sessions/:code/verify — does this account open that session?
// The account-shaped answer to /api/sessions/:code/verify-dm, used by the
// screens that still check before navigating.
router.post('/sessions/:code/verify', requireAccount, async (req, res) => {
  try {
    const owns = await gm.ownsSession(db, req.gmAccount.id, { sessionCode: req.params.code });
    res.json({ valid: owns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── A player's seats ────────────────────────────────────────────────────────

// GET /api/account/seats — the tables this account plays at.
router.get('/seats', requireAccount, async (req, res) => {
  try {
    res.json(await gm.seatsForAccount(db, req.gmAccount.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/account/seats — remember a seat, or refresh the one already there.
// Called when a player enters a game while signed in, and by the "pair a seat"
// form for a table they are not sitting at this minute.
router.post('/seats', requireAccount, async (req, res) => {
  try {
    const { sessionCode, playerName, creatureId } = req.body || {};
    const out = await gm.saveSeat(db, req.gmAccount.id, { sessionCode, playerName, creatureId });
    if (out.error) return res.status(400).json({ error: out.error });
    res.json({ ok: true, seats: await gm.seatsForAccount(db, req.gmAccount.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/account/seats/:id — forget one. The character and the session are
// untouched; only this account's bookmark goes.
router.delete('/seats/:id', requireAccount, async (req, res) => {
  try {
    const ok = await gm.removeSeat(db, req.gmAccount.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'No such seat on this account.' });
    res.json({ ok: true, seats: await gm.seatsForAccount(db, req.gmAccount.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

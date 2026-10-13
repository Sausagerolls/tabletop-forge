// One login for every table — the GM's, and now the players' too.
//
// WHY THIS EXISTS
//
// A session's only credential used to be its own GM password, typed per
// session and remembered per browser. Four tables meant four codes and four
// passwords, and the browser that remembered them was the only one that knew
// them — a GM on a different machine was locked out of their own game unless
// they could recall "PAJT82" and whatever they had typed in September.
//
// An account is a second way in, not a replacement. Everything that took a GM
// password still takes one, and a session that has never been paired is
// untouched. Pairing is the GM proving, once, that they know that session's
// password; from then on their account token opens it.
//
// PLAYERS TOO, AND WITHOUT A PASSWORD TO PROVE
//
// A player's login was never a secret: a name and a session code, typed in,
// with nothing to verify. So a player's pairing is a BOOKMARK, not a claim —
// the session code, the name they play under and the character they play. It
// grants nothing that typing the same two things would not, which is why it
// asks for no password: inventing one would be security theatre over a door
// that has always been open, and would lock players out of their own seats.
//
// One account table serves both. A player who also runs a game signs in once;
// `sessions.owner_account_id` is the GM side and `account_player_seats` is the
// player side, and an account may have either, both or neither.
//
// WHAT A TOKEN IS
//
// An opaque 32-byte random string, stored hashed, handed to the browser and
// sent back on each request. Not a JWT: there is nothing to encode, no second
// service to verify it, and a row that can be deleted is how "sign out
// everywhere" stays a one-line DELETE. The browser keeps it in localStorage,
// never in a URL — a URL ends up in history, in screenshots and in the log of
// whatever is in front of it.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// How long a token is good for without being used. Long, because the thing it
// guards is a tabletop and the cost of being logged out mid-session is worse
// than the cost of a stale token on a home server.
const TOKEN_TTL_DAYS = 180;

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;

const normaliseUsername = (s) => String(s || '').trim().toLowerCase();
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

async function migrate(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS gm_accounts (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      display_name  TEXT,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW(),
      last_seen_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  // Tokens are rows so they can be revoked. `token_hash` rather than the token:
  // a database dump should not be a pile of working credentials.
  await db.query(`
    CREATE TABLE IF NOT EXISTS gm_account_tokens (
      token_hash   TEXT PRIMARY KEY,
      account_id   INTEGER NOT NULL REFERENCES gm_accounts(id) ON DELETE CASCADE,
      label        TEXT,
      created_at   TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_gm_tokens_account ON gm_account_tokens(account_id)`);
  // Nullable on purpose: every session that existed before this feature is
  // unowned, works exactly as it did, and can be paired later.
  await db.query(`
    ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS owner_account_id INTEGER REFERENCES gm_accounts(id) ON DELETE SET NULL
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_account_id)`);

  // A player's seat at a table: which session, under what name, as whom.
  // Keyed by (account, session, name) so re-entering the same game updates the
  // row rather than stacking duplicates, and a player with two characters at
  // one table — a second name — gets two rows, as they should.
  await db.query(`
    CREATE TABLE IF NOT EXISTS account_player_seats (
      id           SERIAL PRIMARY KEY,
      account_id   INTEGER NOT NULL REFERENCES gm_accounts(id) ON DELETE CASCADE,
      session_code TEXT NOT NULL,
      player_name  TEXT NOT NULL,
      creature_id  INTEGER REFERENCES creatures(id) ON DELETE SET NULL,
      created_at   TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (account_id, session_code, player_name)
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_seats_account ON account_player_seats(account_id)`);
}

// ── A player's seats ────────────────────────────────────────────────────────

async function seatsForAccount(db, accountId) {
  const rows = (await db.query(
    `SELECT ps.id, ps.session_code, ps.player_name, ps.creature_id, ps.last_used_at,
            s.name AS session_name, s.id AS session_id,
            c.name AS creature_name, c.image_path AS creature_image
       FROM account_player_seats ps
       LEFT JOIN sessions s ON s.session_code = ps.session_code
       LEFT JOIN creatures c ON c.id = ps.creature_id
      WHERE ps.account_id = $1
      ORDER BY ps.last_used_at DESC`,
    [accountId]
  )).rows;
  // A session the GM has since deleted leaves its seat behind. Reported rather
  // than hidden, so the row can say so and be cleared, instead of a button
  // that silently goes nowhere.
  return rows.map((r) => ({ ...r, session_missing: r.session_id == null }));
}

/**
 * Remember a seat, or refresh the one already there.
 *
 * No password and no check against the session: see the note at the top. The
 * one thing enforced is that the session exists, so a typo cannot fill the
 * list with codes that lead nowhere.
 */
async function saveSeat(db, accountId, { sessionCode, playerName, creatureId }) {
  const code = String(sessionCode || '').trim().toUpperCase();
  const name = String(playerName || '').trim();
  if (!code || !name) return { error: 'A session code and the name you play under, please.' };

  const session = (await db.query('SELECT id FROM sessions WHERE session_code=$1', [code])).rows[0];
  if (!session) return { error: 'No session with that code.' };

  const creature = creatureId != null && creatureId !== ''
    ? (await db.query('SELECT id FROM creatures WHERE id=$1', [Number(creatureId)])).rows[0]
    : null;

  await db.query(
    `INSERT INTO account_player_seats (account_id, session_code, player_name, creature_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (account_id, session_code, player_name)
     DO UPDATE SET creature_id = COALESCE(EXCLUDED.creature_id, account_player_seats.creature_id),
                   last_used_at = NOW()`,
    [accountId, code, name, creature ? creature.id : null]
  );
  return { ok: true };
}

async function removeSeat(db, accountId, seatId) {
  const r = await db.query(
    'DELETE FROM account_player_seats WHERE id=$1 AND account_id=$2 RETURNING id',
    [Number(seatId), accountId]
  );
  return r.rows.length > 0;
}

// ── Accounts ────────────────────────────────────────────────────────────────

async function createAccount(db, { username, password, displayName }) {
  const name = normaliseUsername(username);
  if (!USERNAME_RE.test(name)) {
    return { error: 'Pick a username of 2–31 characters: letters, numbers, dot, dash or underscore.' };
  }
  if (String(password || '').length < 6) {
    return { error: 'A password of at least 6 characters, please.' };
  }
  const taken = await db.query('SELECT id FROM gm_accounts WHERE username=$1', [name]);
  if (taken.rows.length) return { error: 'That username is taken.' };

  const hash = await bcrypt.hash(String(password), 10);
  const row = (await db.query(
    `INSERT INTO gm_accounts (username, display_name, password_hash)
     VALUES ($1,$2,$3) RETURNING id, username, display_name, created_at`,
    [name, String(displayName || '').trim() || null, hash]
  )).rows[0];
  return { account: row };
}

async function verifyPassword(db, { username, password }) {
  const name = normaliseUsername(username);
  const row = (await db.query(
    'SELECT id, username, display_name, password_hash FROM gm_accounts WHERE username=$1', [name]
  )).rows[0];
  // Compared even when there is no such account, so a wrong username and a
  // wrong password take the same time to answer.
  const ok = await bcrypt.compare(String(password || ''), row?.password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!row || !ok) return null;
  return { id: row.id, username: row.username, display_name: row.display_name };
}

async function issueToken(db, accountId, label) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.query(
    'INSERT INTO gm_account_tokens (token_hash, account_id, label) VALUES ($1,$2,$3)',
    [hashToken(token), accountId, String(label || '').slice(0, 80) || null]
  );
  return token;
}

async function revokeToken(db, token) {
  if (!token) return;
  await db.query('DELETE FROM gm_account_tokens WHERE token_hash=$1', [hashToken(token)]);
}

async function revokeAllTokens(db, accountId) {
  await db.query('DELETE FROM gm_account_tokens WHERE account_id=$1', [accountId]);
}

/**
 * The account a token belongs to, or null.
 *
 * Touches last_used_at so an account in weekly use never expires, and drops
 * tokens that have gone quiet for longer than the TTL.
 */
async function accountForToken(db, token) {
  if (!token) return null;
  const row = (await db.query(
    `SELECT a.id, a.username, a.display_name, t.last_used_at
       FROM gm_account_tokens t
       JOIN gm_accounts a ON a.id = t.account_id
      WHERE t.token_hash = $1`,
    [hashToken(token)]
  )).rows[0];
  if (!row) return null;

  const age = Date.now() - new Date(row.last_used_at).getTime();
  if (age > TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000) {
    await db.query('DELETE FROM gm_account_tokens WHERE token_hash=$1', [hashToken(token)]);
    return null;
  }
  await db.query('UPDATE gm_account_tokens SET last_used_at=NOW() WHERE token_hash=$1', [hashToken(token)]);
  await db.query('UPDATE gm_accounts SET last_seen_at=NOW() WHERE id=$1', [row.id]);
  return { id: row.id, username: row.username, display_name: row.display_name };
}

// The token on a request, from the Authorization header or, for the socket
// handshake and the odd form post, the body.
function tokenFrom(req) {
  const auth = String(req?.headers?.authorization || '');
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  if (bearer) return bearer[1].trim();
  return String(req?.body?.gmToken || req?.query?.gmToken || '').trim() || null;
}

// ── Sessions an account owns ────────────────────────────────────────────────

async function ownsSession(db, accountId, { sessionId, sessionCode }) {
  if (!accountId) return false;
  const where = sessionId != null ? 'id=$2' : 'session_code=$2';
  const value = sessionId != null ? sessionId : String(sessionCode || '').toUpperCase();
  const row = (await db.query(
    `SELECT 1 FROM sessions WHERE ${where} AND owner_account_id=$1`, [accountId, value]
  )).rows[0];
  return !!row;
}

async function sessionsForAccount(db, accountId) {
  const rows = (await db.query(
    `SELECT s.id, s.name, s.session_code, s.created_at, s.session_started, s.map_id,
            m.name AS map_name,
            (SELECT COUNT(*) FROM session_tokens st WHERE st.session_id = s.id AND st.is_player) AS player_count,
            (SELECT COUNT(*) FROM session_tokens st WHERE st.session_id = s.id) AS token_count
       FROM sessions s
       LEFT JOIN maps m ON m.id = s.map_id
      WHERE s.owner_account_id = $1
      ORDER BY s.created_at DESC`,
    [accountId]
  )).rows;
  return rows.map((r) => ({
    ...r,
    player_count: Number(r.player_count) || 0,
    token_count: Number(r.token_count) || 0,
  }));
}

/**
 * Pair a session to an account.
 *
 * The session's own GM password is the proof: knowing it is what made someone
 * the GM of that table before accounts existed, so it is what lets them claim
 * it now. An already-paired session is refused rather than stolen — a second
 * GM typing the shared password should not quietly take the first one's game.
 */
async function pairSession(db, accountId, sessionCode, dmPassword) {
  const code = String(sessionCode || '').trim().toUpperCase();
  const row = (await db.query(
    'SELECT id, name, session_code, dm_password_hash, owner_account_id FROM sessions WHERE session_code=$1', [code]
  )).rows[0];
  if (!row) return { error: 'No session with that code.' };
  if (row.owner_account_id && row.owner_account_id !== accountId) {
    return { error: 'That session is already paired to another GM account.' };
  }
  if (row.owner_account_id === accountId) return { ok: true, already: true, session: row };

  const valid = await bcrypt.compare(String(dmPassword || ''), row.dm_password_hash || '');
  if (!valid) return { error: 'That is not this session\'s GM password.' };

  await db.query('UPDATE sessions SET owner_account_id=$1 WHERE id=$2', [accountId, row.id]);
  return { ok: true, session: row };
}

async function unpairSession(db, accountId, sessionCode) {
  const code = String(sessionCode || '').trim().toUpperCase();
  const r = await db.query(
    'UPDATE sessions SET owner_account_id=NULL WHERE session_code=$1 AND owner_account_id=$2 RETURNING id',
    [code, accountId]
  );
  return r.rows.length > 0;
}

module.exports = {
  TOKEN_TTL_DAYS,
  migrate,
  createAccount,
  verifyPassword,
  issueToken,
  revokeToken,
  revokeAllTokens,
  accountForToken,
  tokenFrom,
  ownsSession,
  sessionsForAccount,
  pairSession,
  unpairSession,
  seatsForAccount,
  saveSeat,
  removeSeat,
  normaliseUsername,
};

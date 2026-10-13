// The next session: when it is, how long until it, and a calendar invite.
//
// Shared by the players' lobby and the GM's Lobby tab so the two can never
// disagree about the same date — the GM's preview is the players' countdown,
// computed by the same code rather than by a second implementation that
// happens to round the same way today.

// How long the session is assumed to run when nothing says otherwise. Three
// hours is a normal table's evening, and it exists only to give the calendar
// event an end — a zero-length VEVENT imports as a blip most calendars draw as
// a hairline and some hide entirely.
export const DEFAULT_SESSION_MINUTES = 180;

// Parse whatever the server sent into a Date, or null.
//
// Tolerant on purpose: the column is TIMESTAMPTZ, but it reaches the client as
// an ISO string through Socket.IO and as a Date through some code paths, and a
// cleared schedule arrives as null. Anything unparseable is treated as "not
// scheduled" rather than thrown — a bad date must not take the lobby down.
export function parseSessionDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The countdown, broken into parts so the caller decides how to draw it.
//
// `past` rather than clamping to zero: "started 20 minutes ago" is useful
// information on a lobby screen — it tells a late player the table is already
// running, where a frozen 00:00:00 would just look broken.
export function countdownParts(target, now = Date.now()) {
  const t = parseSessionDate(target);
  if (!t) return null;
  const deltaMs = t.getTime() - now;
  const past = deltaMs < 0;
  const total = Math.floor(Math.abs(deltaMs) / 1000);
  return {
    past,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    totalSeconds: total,
  };
}

// A short human sentence for the countdown.
//
// Seconds only appear inside the last hour. Watching a seconds column tick for
// four days is noise, and re-rendering it every second for four days is worse;
// under an hour it is the part that actually feels like a countdown.
export function countdownText(target, now = Date.now()) {
  const c = countdownParts(target, now);
  if (!c) return '';
  const bits = [];
  if (c.days) bits.push(`${c.days}d`);
  if (c.days || c.hours) bits.push(`${c.hours}h`);
  bits.push(`${c.minutes}m`);
  if (!c.days && !c.hours) bits.push(`${c.seconds}s`);
  const body = bits.join(' ');
  return c.past ? `started ${body} ago` : body;
}

// The date itself, in the READER's local time — never the GM's.
//
// The stored instant is absolute; each client formats it for wherever it is
// sitting. A player an hour ahead sees their own 9pm, not the GM's 8pm.
export function formatSessionDate(target) {
  const d = parseSessionDate(target);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: 'numeric', minute: '2-digit',
    }).format(d);
  } catch {
    // Intl is present everywhere this app runs, but a formatting throw must
    // not cost the lobby its countdown.
    return d.toLocaleString();
  }
}

// ── <input type="datetime-local"> ↔ stored instant ──────────────────────────
//
// The input speaks LOCAL wall-clock with no zone ("2026-09-10T19:00"); the
// column stores an absolute instant. Converting between them is the one place
// this feature can silently go wrong by a whole timezone offset, so both
// directions live here rather than being written out at each call site.

// Instant → the input's value, in the GM's own local time.
//
// Built from the local getters, NOT from toISOString().slice(0,16): that gives
// UTC digits, so a GM in BST would open the editor and find their 8pm session
// showing as 7pm, and re-saving would walk it back an hour every time.
export function toLocalInputValue(value) {
  const d = parseSessionDate(value);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
       + `T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// The input's value → an ISO instant to send.
//
// `new Date('2026-09-10T19:00')` is parsed as local time per the spec — which
// is exactly right, because that is what the GM typed and what they meant.
export function fromLocalInputValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Calendar invite ─────────────────────────────────────────────────────────

// RFC 5545 escaping for TEXT values: backslash, semicolon and comma are
// delimiters in the format and a raw newline ends the property.
function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// UTC basic format: 20260910T190000Z. The spec's other forms need a VTIMEZONE
// block to be unambiguous; the Z form needs nothing and every calendar reads
// it, which is what makes this safe to hand to an unknown client.
function icsStamp(date) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}`
       + `T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}

// Content lines are limited to 75 octets, continued by CRLF + one space.
// Folded on BYTES, not characters: the limit is octets, and an emoji in a
// session name is four of them, so counting characters would sail past the
// limit on exactly the names most likely to have one.
function foldIcsLine(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character: continuation bytes are 10xxxxxx.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
    limit = 74; // continuation lines carry a leading space
  }
  return out.join('\r\n ');
}

/**
 * Build the .ics text for the next session.
 *
 * @param {object} opts
 * @param {Date|string} opts.at        when it starts
 * @param {number} [opts.minutes]      how long it runs
 * @param {string} [opts.sessionName]  the campaign/session name
 * @param {string} [opts.note]         what this one is called
 * @param {string} [opts.uid]          stable id, so re-adding UPDATES the
 *                                     existing entry instead of duplicating it
 * @returns {string|null} the file contents, or null if there is no valid date
 */
export function buildSessionIcs({ at, minutes, sessionName, note, uid } = {}) {
  const start = parseSessionDate(at);
  if (!start) return null;
  const mins = Math.max(15, Math.min(24 * 60, Math.round(Number(minutes) || DEFAULT_SESSION_MINUTES)));
  const end = new Date(start.getTime() + mins * 60000);

  const title = [sessionName, note].filter(Boolean).join(' — ') || 'D&D Session';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TableTop Forge//Session Schedule//EN',
    'CALSCALE:GREGORIAN',
    // PUBLISH, not REQUEST: this is an invite the player adds to their own
    // calendar, not one the GM's server is organising with attendees and RSVP
    // tracking. REQUEST would make some clients look for an organiser to reply
    // to and show accept/decline buttons that lead nowhere.
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // Stable per session+time, so a player who taps the button twice updates
    // one entry rather than collecting duplicates.
    `UID:${escapeIcsText(uid || `ttf-${icsStamp(start)}@tabletopforge`)}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // CRLF throughout — the spec requires it, and the lenient parsers are not
  // the ones that matter here.
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

// Hand the .ics to the browser as a download.
//
// A Blob URL rather than a data: URI — iOS Safari refuses to download long
// data: URIs, and this app has an iOS wrapper. The object URL is revoked on a
// timer rather than immediately: revoking in the same tick can cancel the
// download before the browser has finished reading it.
export function downloadSessionIcs(opts = {}) {
  const ics = buildSessionIcs(opts);
  if (!ics) return false;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'next-session.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

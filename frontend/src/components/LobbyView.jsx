import React, { useEffect, useState } from 'react';
import BackdropLayer from './BackdropLayer.jsx';
import {
  parseSessionDate, countdownParts, countdownText, formatSessionDate, downloadSessionIcs,
} from '../utils/nextSession.js';

// LobbyView — where players sit while they aren't on a map.
//
// The backdrop is the point of this screen, so it runs full-bleed and undimmed
// and everything else is a narrow rail down one side. Deliberately a dumb
// component: it takes the roster and the player's own state as props and emits
// nothing itself. PlayerView owns the socket.

const DotIcon = ({ className = '' }) => (
  <svg viewBox="0 0 8 8" className={`w-2 h-2 ${className}`} aria-hidden="true">
    <circle cx="4" cy="4" r="4" fill="currentColor" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
       strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

// ── Next-session countdown ──────────────────────────────────────────────────
//
// The lobby is where players sit when there is nothing to do, which makes it
// the one screen where "when are we next playing?" is worth answering.
//
// Renders nothing at all when no date is set. A campaign between arcs has no
// next date, and an empty card saying so would be worse than no card.
function NextSessionCard({ at, note, minutes, sessionName }) {
  const when = parseSessionDate(at);

  // The tick drives the countdown. Its RATE depends on how far away the date
  // is: inside the last hour the seconds are the point, and beyond that they
  // are a re-render every second for days on end to redraw a number nobody is
  // watching. A minute is plenty once the answer is "3 days".
  const [, setTick] = useState(0);
  const soon = !!when && Math.abs(when.getTime() - Date.now()) < 3600_000;
  useEffect(() => {
    if (!when) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), soon ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [when?.getTime(), soon]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!when) return null;

  const c = countdownParts(when);

  return (
    <div className="mt-2 bg-dnd-panel/90 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-3 py-1.5 bg-gray-900/70 border-b border-gray-700">
        <span className="text-[11px] uppercase tracking-wider text-gray-400">
          {c.past ? 'Session started' : 'Next session'}
        </span>
      </div>
      <div className="px-3 py-2.5">
        {/* The countdown is the headline — it is the thing being asked. The
            date underneath is the answer in full, in the reader's own zone. */}
        <div className={`font-mono font-semibold tabular-nums leading-none ${
          c.past ? 'text-lg text-amber-300' : 'text-2xl text-dnd-gold'
        }`}>
          {countdownText(when)}
        </div>
        <div className="text-xs text-gray-300 mt-1.5 leading-snug">
          {formatSessionDate(when)}
        </div>
        {note && (
          <div className="text-[11px] text-gray-400 mt-1 italic leading-snug break-words">{note}</div>
        )}

        {/* Offered even once the session has started: a player reading this
            late still wants it on their calendar. */}
        <button
          type="button"
          onClick={() => downloadSessionIcs({ at: when, minutes, sessionName, note })}
          title="Download a calendar invite for this session"
          className="mt-2.5 w-full rounded-lg py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1.5
                     bg-gray-800/90 hover:bg-gray-700 border border-gray-600 text-gray-200 transition-colors"
        >
          <CalendarIcon />
          Add to calendar
        </button>
      </div>
    </div>
  );
}

export default function LobbyView({
  sessionName,
  roster = [],
  myName,
  myCharacterName,
  onChangeCharacter,
  onEditCharacter,
  canEditCharacter = false,
  backdrop = null,
  combatBanner = null,
  combatRound = 0,
  nextSessionAt = null,
  nextSessionNote = '',
  nextSessionMinutes = 180,
}) {
  return (
    <div className="w-screen h-screen bg-dnd-bg text-gray-200 overflow-hidden relative">
      {/* Full strength — no scrim. The art is what this screen is for. */}
      <BackdropLayer backdrop={backdrop} />

      {/* Side rail. Narrow, and only as tall as its contents, so it covers as
          little of the artwork as possible. The panel carries its own contrast
          rather than darkening the image behind it. */}
      <div className="absolute inset-y-0 left-0 z-10 p-4 flex items-center pointer-events-none">
        <div className="w-64 max-w-[78vw] pointer-events-auto">
          <h1 className="text-xl font-serif font-semibold text-dnd-gold mb-2 px-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {sessionName || 'Lobby'}
          </h1>

          <div className="bg-dnd-panel/90 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-3 py-1.5 bg-gray-900/70 border-b border-gray-700 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-gray-400">Here</span>
              <span className="text-[11px] text-gray-500">
                {roster.length} {roster.length === 1 ? 'player' : 'players'}
              </span>
            </div>

            <ul className="divide-y divide-gray-800 max-h-[50vh] overflow-y-auto">
              {roster.length === 0 && (
                <li className="px-3 py-2.5 text-xs text-gray-500">Nobody here yet.</li>
              )}
              {roster.map((r) => {
                const isMe = r.name === myName;
                return (
                  <li key={r.socketId} className="px-3 py-2 flex items-center gap-2">
                    <DotIcon className="text-green-400 shrink-0" />
                    <span className={`text-sm truncate ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                      {r.name}
                    </span>
                    <span className="text-[11px] text-gray-500 truncate ml-auto">
                      {r.characterName || '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Above the character buttons rather than below them: it is read,
              not used, and the two buttons under it are the things a player
              actually came here to press. */}
          <NextSessionCard
            at={nextSessionAt}
            note={nextSessionNote}
            minutes={nextSessionMinutes}
            sessionName={sessionName}
          />

          {/* Character swaps have to be possible from here: players routinely
              pick the wrong sheet, and this is the only moment where changing
              it costs nothing. */}
          <button
            type="button"
            onClick={onChangeCharacter}
            className="mt-2 w-full rounded-xl py-2 text-xs bg-gray-900/85 hover:bg-gray-800 backdrop-blur-sm border border-gray-700 text-gray-300 shadow-lg"
          >
            {myCharacterName ? `Playing as ${myCharacterName} — change` : 'Choose character'}
          </button>

          {/* Editing the sheet is the other thing players want here: the
              waiting room is the last quiet moment before the session, and
              this opens the same editor they get in game. Only offered once a
              character is actually bound — there's nothing to edit before. */}
          {canEditCharacter && (
            <button
              type="button"
              onClick={onEditCharacter}
              className="mt-1.5 w-full rounded-xl py-2 text-xs bg-dnd-red/85 hover:bg-dnd-red backdrop-blur-sm border border-red-900/60 text-white shadow-lg"
            >
              Edit character sheet
            </button>
          )}

        </div>
      </div>

      {/* Combat with no battlemap. Same banner as the map screen, sat at the
          bottom of the lobby: there's no map here competing for attention, so
          it runs large and the portraits carry the view. Inset from the very
          edge so it reads as a banner over the art rather than a browser
          chrome bar welded to the bottom. */}
      {combatBanner && (
        <div className="absolute inset-x-0 bottom-6 z-20 px-6">
          <div className="mx-auto max-w-5xl rounded-xl overflow-hidden border border-yellow-600/40 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-1 bg-gray-900/90 border-b border-yellow-600/20">
              <span className="text-[11px] uppercase tracking-wider text-yellow-400">In combat</span>
              {combatRound > 0 && <span className="text-[11px] text-gray-400">Round {combatRound}</span>}
            </div>
            {combatBanner}
          </div>
        </div>
      )}
    </div>
  );
}

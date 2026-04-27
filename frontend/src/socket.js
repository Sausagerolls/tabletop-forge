import { io } from 'socket.io-client';

// Socket configuration tuned for mobile + reverse-proxy reliability.
//
// — `transports` is left at the default `['polling', 'websocket']` so
//   socket.io probes with HTTP polling first, then upgrades to WS.
//   The previous explicit `['websocket', 'polling']` skipped polling
//   entirely; on iOS WebKit (Safari and Brave) and on cellular
//   networks behind transparent proxies, the upfront WS handshake can
//   silently fail and force a slow fallback. Polling-first probes
//   succeed on practically every transport and the upgrade to WS is
//   typically <1 s after the first poll lands.
//
// — `reconnection*` knobs make recovery aggressive: reconnect forever,
//   start at 500 ms, cap at 5 s, jittered by 50 % so a population of
//   mobile clients doesn't hammer the server in lockstep after a
//   network blip.
//
// — `timeout` (20 s) is the per-attempt connect timeout. Long enough
//   to ride out one slow handshake; short enough that the
//   reconnect_attempt fires regularly so the UI banner stays current.
const socket = io(window.location.origin, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 20000,
});

export default socket;

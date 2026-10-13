import socket from '../socket.js';

// Keeping a device in its session for a whole evening.
//
// THE BUG THIS EXISTS FOR
//
// `join_session` binds the session to the SOCKET — the server writes
// `socket.data.sessionCode` and every write handler starts with
//
//     const sessionCode = socket.data.sessionCode;
//     if (!sessionCode) return;
//
// A reconnect is a NEW server socket with none of that data. So a client that
// joins once, at mount, and then loses its connection — a phone going to sleep
// in somebody's pocket, a lock screen, a cell-tower handover, a server
// restart — comes back connected but no longer in the session. It looks fine.
// Its rolls are dropped on the floor, silently, for the rest of the night.
//
// The desktop player view already re-joined on every `connect`. The phone did
// not, which is why the phone was the screen that "lost the server".
//
// THE OTHER HALF: ZOMBIE SOCKETS
//
// iOS suspends a backgrounded tab. A WebSocket that was open when the screen
// locked can come back with the client still believing it is connected while
// the server evicted it minutes ago (pingTimeout is 60 s). No `disconnect`
// fires, so reconnection logic never runs. The cure is to distrust the flag on
// every return to the foreground and ask the server directly, with a timeout:
// no answer means the connection is dead however healthy it claims to be.
//
// `session_heartbeat` answers `{ inSession }`, which also catches the case
// where the socket is genuinely alive but its session binding is gone (the
// server restarted underneath it) — that needs a re-join, not a reconnect.

// How long the server gets to answer a heartbeat before we treat the
// connection as dead. Generous: a phone waking on a bad cell connection can
// take a couple of seconds to get a packet out.
const HEARTBEAT_TIMEOUT_MS = 6000;

// Re-check while the screen is on. socket.io's own ping/pong covers a live
// connection; this covers "connected to a server that has forgotten me",
// which no amount of pinging detects.
const VERIFY_INTERVAL_MS = 30000;

// A transport that has carried a packet this recently is alive: the server
// pings every 25 s, so anything inside this window has heard from it.
const LIVE_TRANSPORT_MS = 40000;

/**
 * Keep this socket joined to its session across reconnects and sleeps.
 *
 * @param {object}   opts
 * @param {function} opts.join      Emits the view's own join_session payload.
 * @param {function} [opts.onStatus] 'live' | 'joining' | 'offline'
 * @returns {function} cleanup
 */
export function attachSessionKeepalive({ join, onStatus = () => {} }) {
  let disposed = false;
  let probing = false;

  // When the engine last heard ANYTHING from the server — including its own
  // ping/pong. A socket that is receiving packets is demonstrably alive, which
  // is what tells an unanswered heartbeat ("this server predates the
  // handler") apart from a dead transport ("the phone's connection is gone").
  // Without that distinction, a client running ahead of its server would tear
  // down a perfectly good connection every few seconds.
  let lastPacketAt = Date.now();
  const markPacket = () => { lastPacketAt = Date.now(); };
  const engine = socket.io?.engine;
  if (engine) engine.on('packet', markPacket);
  const onEngineOpen = () => {
    markPacket();
    const eng = socket.io?.engine;
    if (eng) eng.on('packet', markPacket);
  };
  socket.io?.on?.('open', onEngineOpen);

  const status = (s) => { if (!disposed) onStatus(s); };

  const doJoin = () => {
    if (disposed) return;
    status('joining');
    join();
  };

  const onConnect = () => doJoin();

  const onDisconnect = (reason) => {
    status('offline');
    // 'io server disconnect' means the server hung up deliberately; socket.io
    // does NOT retry that one on its own, so nothing would ever bring the
    // phone back without this.
    if (reason === 'io server disconnect' && !disposed) socket.connect();
  };

  // Is this connection actually alive, and does the server still know us?
  const verify = () => {
    if (disposed) return;
    if (!socket.connected) { socket.connect(); return; }
    if (probing) return;
    probing = true;
    let answered = false;

    const dead = setTimeout(() => {
      probing = false;
      if (answered || disposed) return;
      if (Date.now() - lastPacketAt < LIVE_TRANSPORT_MS) {
        // The transport is carrying traffic, so the silence is the server's:
        // it is an older build with no heartbeat handler. Re-join instead —
        // idempotent, and it is the thing that old server actually needs.
        doJoin();
        return;
      }
      // Connected in name only. Tear it down so socket.io builds a fresh
      // transport instead of sitting on a socket nothing is listening to.
      status('offline');
      try { socket.disconnect(); } catch { /* already gone */ }
      socket.connect();
    }, HEARTBEAT_TIMEOUT_MS);

    socket.emit('session_heartbeat', {}, (reply) => {
      answered = true;
      probing = false;
      clearTimeout(dead);
      if (disposed) return;
      // Alive, but the server has no session for this socket — it restarted,
      // or the join never landed. Re-join rather than reconnect.
      if (!reply || !reply.inSession) doJoin();
      else status('live');
    });
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') verify();
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  document.addEventListener('visibilitychange', onVisibility);
  // `pageshow` fires when Safari restores the page from its back/forward
  // cache, where no visibilitychange is guaranteed.
  window.addEventListener('pageshow', onVisibility);
  window.addEventListener('focus', onVisibility);
  window.addEventListener('online', verify);

  const timer = setInterval(() => {
    // Nothing to check while the tab is hidden: a backgrounded phone gets its
    // check the moment it comes back, and probing there just wakes the radio.
    if (document.visibilityState === 'visible') verify();
  }, VERIFY_INTERVAL_MS);

  // The socket may already be connected (a remount, or another view got here
  // first), in which case no 'connect' event is coming.
  if (socket.connected) doJoin();

  return () => {
    disposed = true;
    clearInterval(timer);
    socket.io?.off?.('open', onEngineOpen);
    socket.io?.engine?.off?.('packet', markPacket);
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onVisibility);
    window.removeEventListener('focus', onVisibility);
    window.removeEventListener('online', verify);
  };
}

export default attachSessionKeepalive;

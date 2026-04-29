// Split the Party — per-player map override.
//
// What it does
// ────────────
//   * DM tab section (in the Session tab) lists every connected
//     player and lets the DM pick which map each player should be
//     viewing. Assignments persist in plugin KV (one row per player
//     name) so they survive reloads.
//   * On the player side, the plugin reads its own assignment and
//     registers a `playerMapOverride` getter with the host. The host's
//     PlayerView fetches that map's full slice via /api/maps/:id/state
//     and renders it instead of the session's current map_id. Real-
//     time events for the override map are mirrored into the rendered
//     snapshot; events for any other map are ignored.
//   * Any plugin_event broadcast from the DM's UI propagates to every
//     player so a re-route shows up live, without a reload.
//
// What this plugin does NOT do
// ────────────────────────────
//   * Move tokens between maps. The DM still does that via the host's
//     existing token / map controls.
//   * Warp points. Phase 2 will add right-click → Send to → warp list,
//     which will both move the token AND re-route the player's view.
//
// Architecture notes
// ──────────────────
//   * Hooks the host's playerMapOverride registry — the only contract
//     the host exposes for swapping a player's effective map.
//   * Reads DM-side state (maps, users, spawn map) via
//     window.__tabletopForge.dm.subscribe — we never reach into React.
//   * The player bridge (window.__tabletopForge.player) appears AFTER
//     PlayerView mounts; the plugin loads earlier (during session_joined),
//     so we poll briefly until the bridge is available and re-apply.

const PLUGIN_ID = 'split-the-party';
// One row per player: assignment_<playerName> → mapId (number) or null.
// readPrefix is the only way to enumerate every key under a plugin's
// namespace, so we keep the prefix short and stable.
const KEY_PREFIX = 'assignment_';

let assignments = {};        // { [playerName]: mapId }

const sectionSubs = new Set();
function pingSection() { for (const fn of sectionSubs) try { fn(); } catch {} }

export default {
  async register({ React, registries, context }) {
    const { data, role, subscribe, notifyChange } = context;

    // ── Hydrate from KV ──────────────────────────────────────────────
    try {
      const rows = await data.readPrefix(KEY_PREFIX);
      assignments = {};
      for (const row of rows || []) {
        if (typeof row.key !== 'string' || !row.key.startsWith(KEY_PREFIX)) continue;
        const name = row.key.slice(KEY_PREFIX.length);
        if (!name) continue;
        const v = row.value;
        if (v === null || v === undefined) continue;
        const n = Number(v);
        if (Number.isFinite(n)) assignments[name] = n;
      }
    } catch { /* offline — fall back to empty */ }

    // ── Cross-client sync ───────────────────────────────────────────
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload || typeof payload.key !== 'string') return;
        if (!payload.key.startsWith(KEY_PREFIX)) return;
        const name = payload.key.slice(KEY_PREFIX.length);
        if (!name) return;
        if (payload.op === 'delete' || payload.value == null) {
          delete assignments[name];
        } else {
          const n = Number(payload.value);
          if (Number.isFinite(n)) assignments[name] = n;
        }
        applyPlayerOverride();
        notifyChange();
        pingSection();
      });
    }

    // ── Player: maintain registry override based on own assignment ──
    function applyPlayerOverride() {
      if (role !== 'player') return;
      const myName = window.__tabletopForge && window.__tabletopForge.player
        && window.__tabletopForge.player.getName && window.__tabletopForge.player.getName();
      if (!myName) return false;
      const myMap = assignments[myName];
      if (myMap == null) {
        registries.playerMapOverride.delete(PLUGIN_ID);
      } else {
        registries.playerMapOverride.set(PLUGIN_ID, () => Number(myMap));
      }
      return true;
    }

    // Try once now; if the player bridge isn't up yet (PlayerView
    // mounts after loadPlugins on first session_joined), poll briefly
    // until it appears, then apply once and stop. 30-second cap.
    if (!applyPlayerOverride() && role === 'player') {
      let tries = 0;
      const t = setInterval(() => {
        tries += 1;
        if (applyPlayerOverride()) {
          notifyChange();
          clearInterval(t);
        } else if (tries > 60) {
          clearInterval(t);
        }
      }, 500);
    }
    notifyChange();

    // ── DM-only UI ──────────────────────────────────────────────────
    if (role !== 'dm') return;

    function PartyAssignmentSection() {
      // Local rerender pump — synced from sectionSubs (KV mutations,
      // cross-client broadcasts) plus the DM bridge's subscribe so we
      // re-render on connect/disconnect / map upload.
      const [, force] = React.useState(0);
      const [host, setHost] = React.useState(() => {
        const dm = window.__tabletopForge && window.__tabletopForge.dm;
        return dm ? dm.get() : { maps: [], users: [], session: null, spawnMapId: null };
      });
      const [open, setOpen] = React.useState(true);

      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        sectionSubs.add(fn);
        return () => sectionSubs.delete(fn);
      }, []);

      React.useEffect(() => {
        const dm = window.__tabletopForge && window.__tabletopForge.dm;
        if (!dm || typeof dm.subscribe !== 'function') return;
        return dm.subscribe(setHost);
      }, []);

      const players = (host.users || []).filter((u) => u.role === 'player');
      const maps = host.maps || [];
      const sessionMapId = host.session ? host.session.map_id : null;

      function setAssignment(playerName, mapId) {
        const key = KEY_PREFIX + playerName;
        if (mapId == null || mapId === '') {
          delete assignments[playerName];
          data.delete(key);
        } else {
          const n = Number(mapId);
          assignments[playerName] = n;
          data.write(key, n);
        }
        pingSection();
      }
      function clearAll() {
        for (const name of Object.keys(assignments)) {
          data.delete(KEY_PREFIX + name);
        }
        assignments = {};
        pingSection();
      }

      const assignedCount = Object.values(assignments).filter((v) => v != null).length;

      return React.createElement('div',
        null,
        React.createElement('button', {
          type: 'button',
          onClick: () => setOpen((v) => !v),
          className: 'w-full flex items-center justify-between text-sm font-semibold text-dnd-gold mb-2 hover:text-yellow-200 transition-colors',
          title: open ? 'Collapse section' : 'Expand section',
        },
          React.createElement('span', null,
            'Split the Party',
            assignedCount > 0 && React.createElement('span',
              { className: 'ml-2 text-[10px] uppercase tracking-wider bg-dnd-gold/20 border border-dnd-gold/50 text-dnd-gold px-1.5 py-0.5 rounded' },
              `${assignedCount} routed`)
          ),
          React.createElement('span', { className: 'text-xs text-gray-500 select-none' }, open ? '▼' : '▶')
        ),
        !open ? null : React.createElement(
          React.Fragment,
          null,
          React.createElement('p', { className: 'text-xs text-gray-400 mb-2 leading-snug' },
            "Route each player to a specific map. Their view follows the assignment regardless of which map you're looking at. \"Follow DM\" reverts to the session's current map."),
          React.createElement('div',
            { className: 'bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-2' },
            players.length === 0
              ? React.createElement('p', { className: 'text-[11px] text-gray-500 italic text-center py-2' }, 'No players connected.')
              : players.map((u) => {
                  const current = assignments[u.name];
                  const onSessionMap = current == null;
                  return React.createElement('div',
                    { key: u.name, className: 'flex items-center gap-2' },
                    React.createElement('span',
                      { className: 'text-xs text-gray-200 flex-1 truncate', title: u.name },
                      u.name),
                    React.createElement('select', {
                      className: 'flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold',
                      value: current == null ? '' : String(current),
                      onChange: (e) => setAssignment(u.name, e.target.value === '' ? null : e.target.value),
                    },
                      React.createElement('option', { value: '' }, '— Follow DM —'),
                      maps.map((m) => React.createElement('option',
                        { key: m.id, value: String(m.id) },
                        m.name || `Map #${m.id}`,
                        m.id === sessionMapId ? '  (DM viewing)' : ''
                      ))
                    )
                  );
                }),
            assignedCount > 0 && React.createElement('button', {
              type: 'button',
              onClick: clearAll,
              className: 'w-full text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 rounded mt-1',
            }, `Clear all (${assignedCount})`)
          )
        )
      );
    }

    registries.panelTabExtensions.set(PLUGIN_ID, {
      tabId: 'session',
      render: () => React.createElement(PartyAssignmentSection, null),
    });
  },
  unregister({ registries }) {
    // Drop our override getter so the host's playerMapOverride memo
    // resolves to null on next read and the player snaps back to the
    // session's current map. Local state is reset so a re-enable
    // hydrates fresh from KV.
    registries.playerMapOverride.delete(PLUGIN_ID);
    assignments = {};
    sectionSubs.clear();
  },
};

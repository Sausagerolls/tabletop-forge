// Tab Controller — declutter the DM panel tab bar.
//
// What it does
// ────────────
//   Adds a "Tab Visibility" section inside the Session tab. The DM
//   ticks the built-in tabs they want hidden from the bar. Hidden
//   tabs disappear from the tab strip but stay reachable: each row
//   has an "Open" button that jumps the panel to that tab even
//   though it's hidden, so you keep access to its controls without
//   the visual clutter.
//
// Architecture
// ────────────
//   * State: a Set of tab ids the DM has chosen to hide. Persisted
//     under `hidden_<sessionId>` in the plugin KV (per-session, so
//     two campaigns on one backend get independent layouts).
//   * Hide mechanism: registries.panelTabHidden[pluginId] is a Set;
//     the host filters the tab bar by the union of every plugin's
//     set, so we just keep ours in sync.
//   * Tab switching: context.setPanelTab is forwarded by the host
//     so plugin code can change the active panel from anywhere.
//   * UI placement: a `panelTabExtensions` entry targets the
//     'session' tab — the host renders our React node inside the
//     Session tab body just above the Plugin Manager.
//
// Protected tabs
// ──────────────
//   The user explicitly wanted Map, Token Library, Token List, and
//   Session itself excluded from the hideable list. Those four
//   never appear as toggleable rows here. Plugin-supplied tabs
//   (added via `dmTabs`) are also excluded — this plugin only
//   manages the host's built-in tab bar.

const PLUGIN_ID = 'tab-controller';

// Mirror of the host's PANEL_TABS. The plugin can't introspect the
// host's array directly (nothing exposes it via the contract), so we
// duplicate the BUILT-IN tabs here. Plugin-supplied tabs are
// discovered dynamically from the dmTabs registry at render time.
const BUILTIN_TABS = [
  { id: 'map',      label: 'Map',           protected: true  },
  { id: 'library',  label: 'Token Library', protected: true  },
  { id: 'spells',   label: 'Spells',        protected: false },
  { id: 'tokens',   label: 'Token List',    protected: true  },
  { id: 'markers',  label: 'Markers',       protected: false },
  { id: 'treasure', label: 'Treasure',      protected: false },
  { id: 'handouts', label: 'Handouts',      protected: false },
  { id: 'session',  label: 'Session',       protected: true  },
];

// Module-level state — Set of hidden tab ids.
let hidden = new Set();

// Local notify pump so the section re-renders without re-rendering
// the whole map (per docs §7 finer-grained pattern).
const sectionSubs = new Set();
function pingSection() { for (const fn of sectionSubs) try { fn(); } catch {} }

export default {
  register({ React, registries, context }) {
    const { data, notifyChange, subscribe, subscribeRegistry, sessionId, setPanelTab } = context;
    const STATE_KEY = sessionId != null ? `hidden_${sessionId}` : 'hidden';

    // Sync our hidden set into the registry the host actually reads.
    // Called any time the local state changes; the host's tab bar
    // re-renders via useRegistryVersion when notifyChange fires.
    function syncRegistry() {
      registries.panelTabHidden.set(PLUGIN_ID, new Set(hidden));
    }

    // ── Hydrate from KV ──────────────────────────────────────────────
    data.read(STATE_KEY).then((row) => {
      if (Array.isArray(row)) hidden = new Set(row);
      syncRegistry();
      notifyChange();
      pingSection();
    }).catch(() => { /* network blip — leave defaults */ });

    // ── Cross-client sync ───────────────────────────────────────────
    // If the DM has two browser tabs open into the same session,
    // changes made in one tab should propagate to the other. The
    // auto-broadcast already echoes our own writes back to us, which
    // is fine — applying the same Set is idempotent.
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload || payload.key !== STATE_KEY) return;
        if (payload.op === 'delete') hidden = new Set();
        else if (payload.op === 'write') hidden = new Set(Array.isArray(payload.value) ? payload.value : []);
        syncRegistry();
        notifyChange();
        pingSection();
      });
    }

    // ── React section component ──────────────────────────────────────
    function TabControllerSection() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        sectionSubs.add(fn);
        return () => sectionSubs.delete(fn);
      }, []);
      // Re-render when ANY plugin's registry contributions change so
      // newly-installed plugins' dmTabs show up live in our list and
      // disabled plugins drop out cleanly.
      React.useEffect(() => {
        if (typeof subscribeRegistry !== 'function') return;
        return subscribeRegistry(() => force((x) => (x + 1) | 0));
      }, []);

      function setHidden(tabId, hide) {
        if (hide) hidden.add(tabId); else hidden.delete(tabId);
        syncRegistry();
        notifyChange();
        pingSection();
        // Persist as an array (Sets aren't JSON-serialisable).
        data.write(STATE_KEY, Array.from(hidden));
      }
      function showAll() {
        hidden = new Set();
        syncRegistry();
        notifyChange();
        pingSection();
        data.write(STATE_KEY, []);
      }
      function openTab(tabId) {
        if (typeof setPanelTab === 'function') setPanelTab(tabId);
      }

      // Plugin-supplied tabs from the dmTabs registry. The host shows
      // them with id `plugin:<pluginId>` so we use the same key for
      // panelTabHidden — the host's PluginDmTabs filter looks under
      // exactly that prefix.
      const pluginTabs = Array.from(registries.dmTabs.entries()).map(
        ([pid, def]) => ({
          id: `plugin:${pid}`,
          label: def.label || pid,
          protected: false,
          source: 'plugin',
        })
      );

      const builtin = BUILTIN_TABS.map((t) => ({ ...t, source: 'builtin' }));
      const allTabs = [...builtin, ...pluginTabs];
      const hideable = allTabs.filter((t) => !t.protected);
      const hiddenCount = hideable.filter((t) => hidden.has(t.id)).length;

      return React.createElement(
        'div',
        null,
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Tab Visibility'),
        React.createElement('p', { className: 'text-xs text-gray-400 mb-2 leading-snug' },
          'Hide rarely-used tabs from the bar to declutter the panel. Hidden tabs are still reachable here via the Open button — you can jump into them without bringing them back to the bar.'),
        React.createElement(
          'div',
          { className: 'bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-2' },
          hideable.map((t) => {
            const isHidden = hidden.has(t.id);
            return React.createElement(
              'div',
              {
                key: t.id,
                className: 'flex items-center gap-2 bg-gray-900/40 border border-gray-700 rounded-lg px-2 py-1.5',
              },
              React.createElement(
                'label',
                { className: 'flex items-center gap-2 cursor-pointer flex-1 min-w-0' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: !isHidden,
                  onChange: (e) => setHidden(t.id, !e.target.checked),
                  className: 'accent-dnd-gold w-4 h-4',
                }),
                React.createElement(
                  'span',
                  { className: `text-xs truncate ${isHidden ? 'text-gray-500 line-through' : 'text-gray-200'}` },
                  t.label
                ),
                t.source === 'plugin' && React.createElement(
                  'span',
                  { className: 'text-[9px] uppercase tracking-wider bg-purple-900/50 border border-purple-700/40 text-purple-200 px-1 rounded shrink-0' },
                  'plugin'
                )
              ),
              isHidden && React.createElement(
                'button',
                {
                  onClick: () => openTab(t.id),
                  className: 'text-[11px] bg-yellow-900/40 hover:bg-yellow-800/60 border border-yellow-700/60 text-yellow-200 px-2 py-0.5 rounded',
                  title: 'Switch to this tab without making it visible in the bar',
                },
                'Open'
              )
            );
          }),
          hiddenCount > 0 && React.createElement(
            'button',
            {
              onClick: showAll,
              className: 'w-full text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 rounded mt-1',
            },
            `Show all (${hiddenCount} hidden)`
          )
        )
      );
    }

    // ── Register the panel-tab extension ─────────────────────────────
    registries.panelTabExtensions.set(PLUGIN_ID, {
      tabId: 'session',
      render: () => React.createElement(TabControllerSection, null),
    });
  },
};

// Tab Controller — declutter the DM panel.
//
// What it does
// ────────────
//   Adds a "Tab Visibility" section inside the Session tab. The DM
//   ticks two kinds of things:
//
//     * Built-in / plugin-supplied panel TABS, hidden from the tab
//       strip but still reachable via the Open button.
//     * Built-in collapsible SUB-SECTIONS inside the Session tab
//       itself (Session Info, Connected Players, Quick Dice
//       Reference, AI Integration). Hiding a sub-section removes
//       it entirely — it's no longer just collapsible, it's gone
//       until re-enabled here.
//
// Architecture
// ────────────
//   * State: two Sets (tabs / sub-sections) of ids the DM has chosen
//     to hide. Persisted under `hidden_<sessionId>` and
//     `sections_hidden_<sessionId>` in the plugin KV (per-session,
//     so two campaigns on one backend get independent layouts).
//   * Hide mechanisms:
//       - registries.panelTabHidden[pluginId]       — Set of tab ids
//       - registries.sessionSectionHidden[pluginId] — Set of sub-section ids
//     The host filters each by the union across plugins.
//   * Tab switching: context.setPanelTab is forwarded by the host so
//     plugin code can change the active panel from anywhere.
//   * UI placement: a `panelTabExtensions` entry targets the
//     'session' tab. The whole plugin panel is itself collapsible
//     (chevron header) so the DM can fold it away when not needed.
//
// Protected items
// ───────────────
//   Map, Token Library, Token List and Session itself are protected
//   from being hidden so the DM can always reach them. Plugin-supplied
//   tabs are exposed; sub-sections inside the Session tab are all
//   hideable except where doing so would lock the DM out (the plugin
//   manager + Leave Session button live OUTSIDE the collapsible
//   sections, so they remain reachable regardless).

const PLUGIN_ID = 'tab-controller';

// Mirror of the host's PANEL_TABS. The plugin can't introspect the host's
// array directly (nothing exposes it via the contract), so we duplicate the
// BUILT-IN tabs here. Plugin-supplied tabs come from the dmTabs registry
// at render time.
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

// Built-in collapsible sub-sections inside the Session tab. Ids must
// match the ones the host passes to <CollapsibleSection id=… /> in
// DMView.jsx — keep these aligned if the host ever adds a new one.
const BUILTIN_SECTIONS = [
  { id: 'session_info',      label: 'Session Info' },
  { id: 'connected_players', label: 'Connected Players' },
  { id: 'dice_reference',    label: 'Quick Dice Reference' },
  { id: 'ai_integration',    label: 'AI Integration' },
];

// Module-level state.
let hiddenTabs = new Set();
let hiddenSections = new Set();

// Local notify pump so the section re-renders on internal state changes.
const sectionSubs = new Set();
function pingSection() { for (const fn of sectionSubs) try { fn(); } catch {} }

// Persisted collapse state for the plugin's own panel (separate from the
// host's section-collapse state to avoid colliding key spaces).
const COLLAPSE_KEY = 'tab-controller_session_collapsed_v1';
const SECTION_ID = 'tab_visibility_panel';
function readCollapse() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); }
  catch { return {}; }
}

export default {
  register({ React, registries, context }) {
    const { data, notifyChange, subscribe, subscribeRegistry, sessionId, setPanelTab } = context;
    const TABS_KEY     = sessionId != null ? `hidden_${sessionId}`           : 'hidden';
    const SECTIONS_KEY = sessionId != null ? `sections_hidden_${sessionId}`  : 'sections_hidden';

    function syncRegistry() {
      registries.panelTabHidden.set(PLUGIN_ID, new Set(hiddenTabs));
      registries.sessionSectionHidden.set(PLUGIN_ID, new Set(hiddenSections));
    }

    // ── Hydrate from KV ──────────────────────────────────────────────
    Promise.all([
      data.read(TABS_KEY).catch(() => null),
      data.read(SECTIONS_KEY).catch(() => null),
    ]).then(([rawTabs, rawSecs]) => {
      if (Array.isArray(rawTabs)) hiddenTabs = new Set(rawTabs);
      if (Array.isArray(rawSecs)) hiddenSections = new Set(rawSecs);
      syncRegistry();
      notifyChange();
      pingSection();
    });

    // ── Cross-client sync ───────────────────────────────────────────
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload) return;
        if (payload.key === TABS_KEY) {
          hiddenTabs = payload.op === 'delete' ? new Set() : new Set(Array.isArray(payload.value) ? payload.value : []);
        } else if (payload.key === SECTIONS_KEY) {
          hiddenSections = payload.op === 'delete' ? new Set() : new Set(Array.isArray(payload.value) ? payload.value : []);
        } else {
          return;
        }
        syncRegistry();
        notifyChange();
        pingSection();
      });
    }

    // ── React section component ──────────────────────────────────────
    function TabControllerSection() {
      const [, force] = React.useState(0);
      const [open, setOpen] = React.useState(() => {
        const stored = readCollapse();
        return SECTION_ID in stored ? !stored[SECTION_ID] : true;
      });
      function toggleOpen() {
        setOpen((prev) => {
          const next = !prev;
          try {
            const stored = readCollapse();
            stored[SECTION_ID] = !next;
            localStorage.setItem(COLLAPSE_KEY, JSON.stringify(stored));
          } catch {}
          return next;
        });
      }
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

      function setTabHidden(tabId, hide) {
        if (hide) hiddenTabs.add(tabId); else hiddenTabs.delete(tabId);
        syncRegistry();
        notifyChange();
        pingSection();
        data.write(TABS_KEY, Array.from(hiddenTabs));
      }
      function setSectionHidden(secId, hide) {
        if (hide) hiddenSections.add(secId); else hiddenSections.delete(secId);
        syncRegistry();
        notifyChange();
        pingSection();
        data.write(SECTIONS_KEY, Array.from(hiddenSections));
      }
      function showAll() {
        hiddenTabs = new Set();
        hiddenSections = new Set();
        syncRegistry();
        notifyChange();
        pingSection();
        data.write(TABS_KEY, []);
        data.write(SECTIONS_KEY, []);
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

      const builtinTabs = BUILTIN_TABS.map((t) => ({ ...t, source: 'builtin' }));
      const allTabs = [...builtinTabs, ...pluginTabs];
      const hideableTabs = allTabs.filter((t) => !t.protected);
      const hiddenTabCount = hideableTabs.filter((t) => hiddenTabs.has(t.id)).length;
      const hiddenSecCount = BUILTIN_SECTIONS.filter((s) => hiddenSections.has(s.id)).length;
      const totalHidden = hiddenTabCount + hiddenSecCount;

      // ── Tab row renderer ─────────────────────────────────────────
      function TabRow({ t }) {
        const isHidden = hiddenTabs.has(t.id);
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
              onChange: (e) => setTabHidden(t.id, !e.target.checked),
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
      }

      // ── Section row renderer (no Open button — sub-sections aren't
      //     directly addressable; toggling the checkbox is the only
      //     way to show them again).
      function SectionRow({ s }) {
        const isHidden = hiddenSections.has(s.id);
        return React.createElement(
          'div',
          {
            key: s.id,
            className: 'flex items-center gap-2 bg-gray-900/40 border border-gray-700 rounded-lg px-2 py-1.5',
          },
          React.createElement(
            'label',
            { className: 'flex items-center gap-2 cursor-pointer flex-1 min-w-0' },
            React.createElement('input', {
              type: 'checkbox',
              checked: !isHidden,
              onChange: (e) => setSectionHidden(s.id, !e.target.checked),
              className: 'accent-dnd-gold w-4 h-4',
            }),
            React.createElement(
              'span',
              { className: `text-xs truncate ${isHidden ? 'text-gray-500 line-through' : 'text-gray-200'}` },
              s.label
            )
          )
        );
      }

      return React.createElement(
        'div',
        null,
        // Collapsible outer header — folds the whole Tab Visibility panel.
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: toggleOpen,
            className: 'w-full flex items-center justify-between text-sm font-semibold text-dnd-gold mb-2 hover:text-yellow-200 transition-colors',
            title: open ? 'Collapse section' : 'Expand section',
          },
          React.createElement('span', null, 'Tab Visibility'),
          React.createElement('span', { className: 'text-xs text-gray-500 select-none' }, open ? '▼' : '▶')
        ),
        !open ? null : React.createElement(
          React.Fragment,
          null,
          React.createElement('p', { className: 'text-xs text-gray-400 mb-2 leading-snug' },
            'Hide rarely-used tabs and sub-sections to declutter the panel. Hidden tabs are still reachable via the Open button. Hidden sub-sections only re-appear by re-ticking them here.'),
          React.createElement(
            'div',
            { className: 'bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-3' },

            // ── Tabs group ──
            React.createElement('div', { className: 'text-xs font-semibold text-gray-200 uppercase tracking-wide' }, 'Panel Tabs'),
            React.createElement('div', { className: 'space-y-2' },
              hideableTabs.map((t) => React.createElement(TabRow, { key: t.id, t }))
            ),

            // ── Sections group ──
            React.createElement('div', { className: 'pt-2 border-t border-gray-700 text-xs font-semibold text-gray-200 uppercase tracking-wide' }, 'Session Tab Sections'),
            React.createElement('p', { className: 'text-[11px] text-gray-500 leading-snug' },
              'Hide individual collapsible sub-sections inside this Session tab. Removed from view entirely until re-ticked here — Plugins / Plugin Manager / Leave Session always remain accessible.'),
            React.createElement('div', { className: 'space-y-2' },
              BUILTIN_SECTIONS.map((s) => React.createElement(SectionRow, { key: s.id, s }))
            ),

            // ── Reset all ──
            totalHidden > 0 && React.createElement(
              'button',
              {
                onClick: showAll,
                className: 'w-full text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 rounded mt-1',
              },
              `Show all (${totalHidden} hidden)`
            )
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
  unregister() {
    hiddenTabs = new Set();
    hiddenSections = new Set();
    sectionSubs.clear();
  },
};

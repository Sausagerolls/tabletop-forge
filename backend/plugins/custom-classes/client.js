// Custom Classes — extend the host's character class and subclass lists.
//
// What it does
// ────────────
//   Lets the DM add custom class names (e.g. "Blood Hunter") and custom
//   subclasses scoped to a specific class. Both lists feed the host's
//   class-related dropdowns:
//     * Spell Library — top class filter
//     * Spell Library — Allowed-classes checkboxes per spell
//     * Spell Library — Export modal class filter
//     * Character sheet — Class dropdown on player characters
//     * Character sheet — Subclass dropdown (filtered by selected class)
//     * Character sheet — Spell Library picker (Learn From Library)
//
// Architecture
// ────────────
//   * State (two KV keys, both global so the lists feel system-wide):
//     - `classes`: Array<string> of custom class names
//     - `subclasses`: { [className]: string[] }
//       Keys can be base SRD classes ("Cleric") or custom-added ones —
//       both are valid since the user may want extra options for either.
//   * Host hooks:
//     - registries.customClasses[pluginId]    = string[]
//     - registries.customSubclasses[pluginId] = { [className]: string[] }
//     The host's `getAllClasses()` / `getAllSubclasses(cls)` helpers
//     merge each plugin's contribution with the SRD base lists.
//   * UI: rendered as a panel-tab extension on the Session tab. DM only
//     (player view has no panel-tab surface). Players still receive the
//     data via the plugin load + cross-client broadcast, so their
//     subclass dropdowns reflect DM additions live.
//   * Cross-client sync: data.write() broadcasts plugin_event to every
//     client in the session. Subscribers rehydrate their cache, re-sync
//     the registry, notifyChange() so dropdowns refresh without a reload.

const PLUGIN_ID = 'custom-classes';
const CLASSES_KEY = 'classes';
const SUBCLASSES_KEY = 'subclasses';

// SRD base class list. Mirrors frontend/src/utils/classes.js so the plugin
// can validate input + offer the right "pick a class to manage" dropdown
// without poking host internals (no API exposes the base list).
const BASE_CLASSES = [
  'Artificer','Barbarian','Bard','Cleric','Druid','Fighter',
  'Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard',
];
const BASE_CLASSES_LOWER = new Set(BASE_CLASSES.map(c => c.toLowerCase()));

// Module-level state.
let classes = [];                // Array<string>
let subclassesByClass = {};      // { [className]: string[] }

// Local notify pump — re-renders the panel-tab extension component
// without forcing the whole DM panel to re-render.
const sectionSubs = new Set();
function pingSection() { for (const fn of sectionSubs) try { fn(); } catch {} }

function normaliseList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Map();
  for (const raw of list) {
    const name = String(raw || '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    if (!seen.has(k)) seen.set(k, name);
  }
  return Array.from(seen.values());
}
function normaliseSubclassMap(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const name = String(k || '').trim();
    if (!name) continue;
    const list = normaliseList(v);
    if (list.length) out[name] = list;
  }
  return out;
}

export default {
  register({ React, registries, context }) {
    const { data, notifyChange, subscribe, role } = context;

    function syncRegistries() {
      registries.customClasses.set(PLUGIN_ID, classes.slice());
      // Shallow clone so the host's dedupe sees fresh references.
      const cloned = {};
      for (const [k, v] of Object.entries(subclassesByClass)) cloned[k] = v.slice();
      registries.customSubclasses.set(PLUGIN_ID, cloned);
    }

    // ── Hydrate from KV ──────────────────────────────────────────────
    Promise.all([
      data.read(CLASSES_KEY).catch(() => null),
      data.read(SUBCLASSES_KEY).catch(() => null),
    ]).then(([rawClasses, rawSubs]) => {
      classes = normaliseList(rawClasses);
      subclassesByClass = normaliseSubclassMap(rawSubs);
      syncRegistries();
      notifyChange();
      pingSection();
    });

    // ── Cross-client sync ───────────────────────────────────────────
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload) return;
        if (payload.key === CLASSES_KEY) {
          classes = payload.op === 'delete' ? [] : normaliseList(payload.value);
        } else if (payload.key === SUBCLASSES_KEY) {
          subclassesByClass = payload.op === 'delete' ? {} : normaliseSubclassMap(payload.value);
        } else {
          return;
        }
        syncRegistries();
        notifyChange();
        pingSection();
      });
    }

    // Players don't see the DM panel — registry hydration is enough.
    if (role !== 'dm') return;

    // ── DM-only React section ────────────────────────────────────────
    // Storage key for the section's open/closed state. Mirrors the
    // host's `dndvtt_session_section_collapsed_v1` shape (an object
    // map of id → boolean) but uses a plugin-specific key so it doesn't
    // collide with host-side collapse state.
    const COLLAPSE_KEY = 'custom-classes_session_collapsed_v1';
    const SECTION_ID = 'custom_classes_panel';
    function readCollapse() {
      try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); }
      catch { return {}; }
    }

    function CustomClassesSection() {
      const [, force] = React.useState(0);
      const [classDraft, setClassDraft] = React.useState('');
      const [classError, setClassError] = React.useState('');
      const [subDraft, setSubDraft] = React.useState('');
      const [subError, setSubError] = React.useState('');
      const [subClassPicked, setSubClassPicked] = React.useState('');
      const [open, setOpen] = React.useState(() => {
        const stored = readCollapse();
        // stored[id] = true means COLLAPSED; defaults to open.
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

      // Default the subclass picker to the first available class once
      // the lists have hydrated. Re-runs only when the option set changes
      // shape so the user's manual pick isn't yanked back to the default.
      const classOptions = React.useMemo(
        () => [...BASE_CLASSES, ...classes],
        [classes.length]   // identity-stable enough for a UI hint
      );
      React.useEffect(() => {
        if (!subClassPicked && classOptions.length) setSubClassPicked(classOptions[0]);
        // If the previously-picked class was removed, fall back to the first.
        if (subClassPicked && !classOptions.some(c => c.toLowerCase() === subClassPicked.toLowerCase())) {
          setSubClassPicked(classOptions[0] || '');
        }
      }, [classOptions.join('|')]);

      function addClass(e) {
        if (e && e.preventDefault) e.preventDefault();
        const name = classDraft.trim();
        if (!name) return;
        if (name.length > 40) { setClassError('Class name is too long (40 chars max).'); return; }
        const k = name.toLowerCase();
        if (BASE_CLASSES_LOWER.has(k)) { setClassError(`"${name}" is already a built-in class.`); return; }
        if (classes.some(c => c.toLowerCase() === k)) { setClassError(`"${name}" is already in the list.`); return; }
        classes = normaliseList([...classes, name]);
        syncRegistries();
        notifyChange();
        pingSection();
        data.write(CLASSES_KEY, classes);
        setClassDraft('');
        setClassError('');
      }
      function removeClass(name) {
        const k = String(name).toLowerCase();
        classes = classes.filter(c => c.toLowerCase() !== k);
        // Drop any subclasses scoped to a class the user just removed.
        const trimmed = {};
        for (const [cls, list] of Object.entries(subclassesByClass)) {
          if (cls.toLowerCase() !== k) trimmed[cls] = list;
        }
        const subsChanged = Object.keys(trimmed).length !== Object.keys(subclassesByClass).length;
        subclassesByClass = trimmed;
        syncRegistries();
        notifyChange();
        pingSection();
        data.write(CLASSES_KEY, classes);
        if (subsChanged) data.write(SUBCLASSES_KEY, subclassesByClass);
      }

      function addSubclass(e) {
        if (e && e.preventDefault) e.preventDefault();
        const cls = subClassPicked;
        const name = subDraft.trim();
        if (!cls || !name) return;
        if (name.length > 60) { setSubError('Subclass name is too long (60 chars max).'); return; }
        const list = subclassesByClass[cls] || [];
        const k = name.toLowerCase();
        if (list.some(s => s.toLowerCase() === k)) {
          setSubError(`"${name}" is already a custom subclass for ${cls}.`);
          return;
        }
        // Don't duplicate something the SRD already supplies for this
        // class — the host will dedupe at render time anyway, but warning
        // here gives the DM a clearer signal about which is which.
        // (This list is a best-effort mirror; if it drifts from the host
        // base list, the host still de-dupes.)
        subclassesByClass = {
          ...subclassesByClass,
          [cls]: normaliseList([...list, name]),
        };
        syncRegistries();
        notifyChange();
        pingSection();
        data.write(SUBCLASSES_KEY, subclassesByClass);
        setSubDraft('');
        setSubError('');
      }
      function removeSubclass(cls, name) {
        const list = subclassesByClass[cls] || [];
        const next = list.filter(s => s.toLowerCase() !== String(name).toLowerCase());
        const trimmed = { ...subclassesByClass };
        if (next.length) trimmed[cls] = next; else delete trimmed[cls];
        subclassesByClass = trimmed;
        syncRegistries();
        notifyChange();
        pingSection();
        data.write(SUBCLASSES_KEY, subclassesByClass);
      }

      const customSubsForPicked = subclassesByClass[subClassPicked] || [];

      return React.createElement(
        'div',
        null,
        // Collapsible header — same look as the host's CollapsibleSection
        // so the plugin's panel feels native in the Session tab.
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: toggleOpen,
            className: 'w-full flex items-center justify-between text-sm font-semibold text-dnd-gold mb-2 hover:text-yellow-200 transition-colors',
            title: open ? 'Collapse section' : 'Expand section',
          },
          React.createElement('span', null, 'Custom Classes'),
          React.createElement('span', { className: 'text-xs text-gray-500 select-none' }, open ? '▼' : '▶')
        ),
        // Hide the body when collapsed. Returning null short-circuits all
        // the inner createElement calls cleanly.
        !open ? null : React.createElement(
          React.Fragment,
          null,
        React.createElement('p', { className: 'text-xs text-gray-400 mb-2 leading-snug' },
          'Add character class names beyond the SRD set, plus extra subclasses for any class. Both lists appear in every dropdown the app renders. Synced live to all players in the session.'),
        React.createElement(
          'div',
          { className: 'bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-3' },

          // ── Custom classes section ──
          React.createElement('div', { className: 'text-xs font-semibold text-gray-200 uppercase tracking-wide' }, 'Classes'),
          React.createElement(
            'form',
            { onSubmit: addClass, className: 'flex gap-2' },
            React.createElement('input', {
              type: 'text',
              value: classDraft,
              onChange: (e) => { setClassDraft(e.target.value); if (classError) setClassError(''); },
              placeholder: 'e.g. Blood Hunter',
              maxLength: 40,
              className: 'flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-dnd-gold',
            }),
            React.createElement('button', {
              type: 'submit',
              disabled: !classDraft.trim(),
              className: 'text-xs bg-dnd-gold/20 hover:bg-dnd-gold/30 disabled:opacity-40 disabled:cursor-not-allowed border border-dnd-gold/60 text-dnd-gold px-3 py-1.5 rounded font-semibold shrink-0',
            }, 'Add')
          ),
          classError && React.createElement('div', {
            className: 'text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1',
          }, classError),
          classes.length === 0
            ? React.createElement('p', { className: 'text-[11px] text-gray-500 italic' },
                'No custom classes yet. The base SRD classes are always available.')
            : React.createElement(
                'div',
                { className: 'space-y-1' },
                classes.map((name) => React.createElement(
                  'div',
                  { key: name, className: 'flex items-center justify-between bg-gray-900/40 border border-gray-700 rounded px-2 py-1' },
                  React.createElement('span', { className: 'text-xs text-gray-200 truncate' }, name),
                  React.createElement('button', {
                    onClick: () => removeClass(name),
                    className: 'text-[10px] text-red-300 hover:text-red-200 hover:bg-red-900/30 px-1.5 py-0.5 rounded shrink-0',
                    title: `Remove ${name}`,
                  }, 'Remove')
                ))
              ),

          // ── Subclasses section ──
          React.createElement('div', { className: 'pt-2 border-t border-gray-700 text-xs font-semibold text-gray-200 uppercase tracking-wide' }, 'Subclasses'),
          React.createElement('p', { className: 'text-[11px] text-gray-500 leading-snug' },
            'Pick a class, then add subclasses to its list. Subclasses defined here appear alongside the SRD ones in the player Subclass dropdown when that class is selected.'),
          React.createElement('div', { className: 'flex gap-2 items-center' },
            React.createElement('label', { className: 'text-[11px] text-gray-400 shrink-0' }, 'Class:'),
            React.createElement(
              'select',
              {
                value: subClassPicked,
                onChange: (e) => { setSubClassPicked(e.target.value); setSubError(''); },
                className: 'flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-dnd-gold',
              },
              classOptions.map(c => React.createElement('option', { key: c, value: c }, c))
            )
          ),
          React.createElement(
            'form',
            { onSubmit: addSubclass, className: 'flex gap-2' },
            React.createElement('input', {
              type: 'text',
              value: subDraft,
              onChange: (e) => { setSubDraft(e.target.value); if (subError) setSubError(''); },
              placeholder: subClassPicked ? `e.g. Way of the Cobalt Soul (${subClassPicked})` : 'Pick a class first',
              maxLength: 60,
              disabled: !subClassPicked,
              className: 'flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-dnd-gold disabled:opacity-50',
            }),
            React.createElement('button', {
              type: 'submit',
              disabled: !subClassPicked || !subDraft.trim(),
              className: 'text-xs bg-dnd-gold/20 hover:bg-dnd-gold/30 disabled:opacity-40 disabled:cursor-not-allowed border border-dnd-gold/60 text-dnd-gold px-3 py-1.5 rounded font-semibold shrink-0',
            }, 'Add')
          ),
          subError && React.createElement('div', {
            className: 'text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1',
          }, subError),
          customSubsForPicked.length === 0
            ? React.createElement('p', { className: 'text-[11px] text-gray-500 italic' },
                subClassPicked
                  ? `No custom subclasses for ${subClassPicked} yet. The SRD ones still appear in the dropdown.`
                  : 'Pick a class above to manage its subclasses.')
            : React.createElement(
                'div',
                { className: 'space-y-1' },
                customSubsForPicked.map((name) => React.createElement(
                  'div',
                  { key: name, className: 'flex items-center justify-between bg-gray-900/40 border border-gray-700 rounded px-2 py-1' },
                  React.createElement('span', { className: 'text-xs text-gray-200 truncate' }, name),
                  React.createElement('button', {
                    onClick: () => removeSubclass(subClassPicked, name),
                    className: 'text-[10px] text-red-300 hover:text-red-200 hover:bg-red-900/30 px-1.5 py-0.5 rounded shrink-0',
                    title: `Remove ${name} from ${subClassPicked}`,
                  }, 'Remove')
                ))
              )
        ) // closes bg-gray-800 body container
        ) // closes the Fragment opened above by `!open ? null : React.createElement(React.Fragment, ...)`
      );
    }

    registries.panelTabExtensions.set(PLUGIN_ID, {
      tabId: 'session',
      render: () => React.createElement(CustomClassesSection, null),
    });
  },
  unregister() {
    classes = [];
    subclassesByClass = {};
    sectionSubs.clear();
  },
};

// Plugin extension-point registries.
//
// Plugins are dynamically imported at runtime (see loadPlugins below) and
// register their contributions by calling `register(...)` on the maps in
// this module. Each registry is a Map<pluginId, contribution> so we can
// surgically tear down a single plugin's hooks at unload time without
// touching anyone else's.
//
// Why Maps instead of arrays:
//   - O(1) per-plugin removal (the user can disable a plugin live).
//   - Idempotent reload: re-running a plugin's register() simply overwrites
//     the prior entry instead of appending duplicates.
//
// What plugins receive when they call register({ ... }):
//   React, Konva, ReactKonva — host versions of the three rendering libs.
//   Plugins MUST NOT bundle their own React; passing the host's instance
//   is what keeps hooks/contexts compatible.
//
//   registries — the maps below.
//
//   context — runtime helpers and identity:
//     { sessionId, role: 'dm'|'player', socket, fetchPluginData,
//       writePluginData, deletePluginData, on, off, emit }
//
// What plugins MUST NOT do (enforced by convention + the architecture):
//   - Mutate core React components or DOM outside their own returned nodes.
//   - Bypass the data API to write to core tables. (Plugins have no direct
//     SQL access — they go through plugin_data, which never gets purged
//     even if the plugin is later removed.)
//
// The login screen (Landing.jsx) intentionally never calls loadPlugins() so
// a misbehaving plugin can never break DM auth.

import React from 'react';
import * as ReactKonva from 'react-konva';

// Each registry is a Map<pluginId, contribution>. Empty by default; plugins
// fill them in when their register() runs.
export const registries = {
  // Map<pluginId, (template, baseShape) => ReactNode>
  // Returned node is overlaid on top of the base spell-template shape.
  spellTemplateDecorators: new Map(),
  // Map<pluginId, (template, onChange) => ReactNode>
  // Rendered inside the spell-template-edit popup, after built-in fields.
  templateEditorExtensions: new Map(),
  // Map<pluginId, { id, label, icon, render: (ctx) => ReactNode }>
  // Adds a new tab to the DM right-hand panel.
  dmTabs: new Map(),
  // Map<templateId, { kind, pluginId }>
  // Lets a plugin tag a spell template with a "kind" that the host renders
  // natively (using core canvas effects the plugin couldn't otherwise touch
  // — e.g. the rippling water canvas). Currently supported kinds:
  //   'water' — included in the host's water-canvas slice-distortion pass.
  // Populated by the plugin alongside its own cache; cleared on unload.
  templateOverlays: new Map(),
  // Map<pluginId, (ctx) => ReactNode>
  // General-purpose "draw stuff on the map" hook. The host renders all
  // returned nodes in a single non-interactive Konva Layer that sits ABOVE
  // the token layer (so trees/clouds/etc. can occlude tokens visually).
  // Players see the same nodes the DM sees by default — plugins can
  // branch on `ctx.isPlayer` for split visibility/behaviour. Listening is
  // disabled at the layer level, so plugin nodes never intercept clicks;
  // use mapClickHandlers below for click handling.
  mapDecorations: new Map(),
  // Map<pluginId, { handler: ({ x, y, tool, isPlayer }) => boolean, role? }>
  // Lets a plugin intercept map clicks. handler returns true to consume
  // the click (skipping the host's built-in tool handling). `role` is
  // optional and gates the handler to one side: 'dm' | 'player'. Without
  // a role the handler runs for both. Use this when a plugin needs
  // map-pick behaviour (e.g. "click to place a tree").
  mapClickHandlers: new Map(),
  // Map<pluginId, Set<tabId>>
  // Plugins can hide built-in DM panel tabs by adding their ids here.
  // The host filters the tab bar by the UNION of all sets. Hiding only
  // affects the bar — the tab's body still renders if it's the active
  // tab (so plugins can call context.setPanelTab to a hidden tab and
  // the user lands inside its UI).
  panelTabHidden: new Map(),
  // Map<pluginId, { tabId, render }>
  // Plugins can append content to a specific built-in DM panel tab.
  // The host renders the extension at the end of that tab's content,
  // just before any host-defined trailing UI like "Leave Session".
  // One extension per plugin per tab — return a Fragment if you need
  // multiple chunks.
  panelTabExtensions: new Map(),
};

// Snapshot helpers — components subscribe via React state to a snapshot
// each time the registry changes so existing renders flush correctly.
let registryVersion = 0;
const subs = new Set();
export function bumpRegistry() {
  registryVersion += 1;
  for (const fn of subs) fn(registryVersion);
}
export function subscribeRegistry(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function useRegistryVersion() {
  // Lightweight subscription so consumers re-render on register/unregister.
  const [v, setV] = React.useState(registryVersion);
  React.useEffect(() => subscribeRegistry(setV), []);
  return v;
}

// Track which plugins are currently loaded so unloadPlugin can clean up.
const loaded = new Map(); // id → { mod, manifest }

// Per-plugin event-bus subscription tables. Indexed by pluginId so the
// global socket-relay in setupPluginEventBus() can dispatch incoming events
// to the right plugin. A plugin's subscribe() returns an unsubscribe fn.
const pluginEventSubs = new Map();   // pluginId → Set<handler>
function dispatchPluginEvent(pluginId, type, payload) {
  const set = pluginEventSubs.get(pluginId);
  if (!set) return;
  for (const fn of set) {
    try { fn({ type, payload }); }
    catch (err) { console.warn(`Plugin "${pluginId}" event handler threw:`, err); }
  }
}

// Wire up a single global socket listener that fans incoming plugin_event
// frames out to every subscribed plugin. Called once per session-bound
// loadPlugins(); idempotent across calls because we reuse the same socket
// and `off + on` cycles cleanly. The handler signature was chosen so
// plugins can use `subscribe(fn)` without knowing about sockets at all.
let busSocket = null;
function setupPluginEventBus(socket) {
  if (busSocket === socket) return;
  if (busSocket) busSocket.off('plugin_event', onPluginEventFrame);
  busSocket = socket;
  if (socket) socket.on('plugin_event', onPluginEventFrame);
}
function onPluginEventFrame({ pluginId, type, payload }) {
  if (!pluginId) return;
  dispatchPluginEvent(pluginId, type || 'data', payload);
}

// Plugin-data helpers wrapped per-plugin so each plugin's calls implicitly
// scope to its own KV namespace. We hand these to the plugin's register()
// so plugins never have to remember to thread their own id around.
//
// write() and delete() additionally broadcast a `plugin_event` over the
// socket so the same plugin running on every other client in the session
// can update its local cache. This is the mechanism that lets a plugin
// modify things visible to BOTH the DM and the players: each client only
// has to react to the broadcast, not poll the API.
function makeDataApi(pluginId, socket) {
  function broadcast(type, payload) {
    if (!socket) return;
    try { socket.emit('plugin_event', { pluginId, type, payload }); }
    catch { /* socket may not be connected yet — non-fatal */ }
  }
  return {
    async read(key) {
      const url = `/api/plugins/${pluginId}/data?key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const rows = await res.json();
      return rows[0] ? rows[0].value : null;
    },
    async readPrefix(prefix) {
      const url = `/api/plugins/${pluginId}/data?prefix=${encodeURIComponent(prefix)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    },
    async write(key, value) {
      const res = await fetch(`/api/plugins/${pluginId}/data/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (res.ok) broadcast('data', { op: 'write', key, value });
      return res.ok;
    },
    async delete(key) {
      const res = await fetch(`/api/plugins/${pluginId}/data/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) broadcast('data', { op: 'delete', key });
      return res.ok;
    },
  };
}

// Subscribe / unsubscribe helpers used both internally and exposed to
// plugins via context.subscribe. Returns an unsubscribe function.
function subscribePluginEvents(pluginId, handler) {
  let set = pluginEventSubs.get(pluginId);
  if (!set) { set = new Set(); pluginEventSubs.set(pluginId, set); }
  set.add(handler);
  return () => set.delete(handler);
}

// Load the enabled plugins matching the given role. Each plugin's client.js
// is dynamically imported via the asset route so the browser respects ES
// module semantics (and we never need to ship plugin code in the host
// bundle). Errors per plugin are isolated so one broken plugin can't stop
// the rest from loading.
//
// Caller-provided context fields are passed through to each plugin's
// register() — typically { socket, role, sessionId } from the host view.
export async function loadPlugins({ context = {} } = {}) {
  // Set up the cross-client event relay before any plugin registers, so
  // events that arrive during register() (rare, but possible if multiple
  // clients connect at once) get dispatched correctly.
  if (context.socket) setupPluginEventBus(context.socket);
  let list;
  try {
    const res = await fetch('/api/plugins');
    list = await res.json();
  } catch (err) {
    console.warn('Plugin loader: failed to fetch plugin list:', err.message);
    return { loaded: [], errors: [{ id: '-', error: err.message }] };
  }
  const errors = [];
  const ok = [];
  const enabled = (list || []).filter(p => p.enabled);
  for (const row of enabled) {
    if (loaded.has(row.id)) continue;     // already loaded
    try {
      const url = `/api/plugins/${row.id}/asset/${row.manifest.frontend_entry || 'client.js'}?v=${row.installed_at || ''}`;
      // eslint-disable-next-line no-await-in-loop
      const mod = await import(/* @vite-ignore */ url);
      const reg = mod.default || mod;
      if (!reg || typeof reg.register !== 'function') {
        errors.push({ id: row.id, error: 'client.js has no default export with a register() function' });
        continue;
      }
      const data = makeDataApi(row.id, context.socket);
      const subscribe = (handler) => subscribePluginEvents(row.id, handler);
      const emitEvent = (type, payload) => {
        if (!context.socket) return;
        try { context.socket.emit('plugin_event', { pluginId: row.id, type, payload }); } catch {}
      };
      reg.register({
        React,
        ReactKonva,
        registries,
        // notifyChange bumps the global registry version so every host
        // component subscribed via useRegistryVersion re-renders. Plugins
        // call this after async data loads or user-triggered state
        // changes so decorators get re-invoked and stale UI flushes.
        // subscribe/emitEvent provide cross-client coordination so a
        // plugin can mirror state from DM to players (or vice-versa)
        // without each client polling the data API.
        // subscribeRegistry lets a plugin's UI re-render when *any*
        // plugin's registry contributions change — useful for plugins
        // that introspect other plugins' contributions (e.g. a tab-
        // management plugin listing dmTabs entries from every plugin).
        context: {
          ...context,
          manifest: row.manifest,
          pluginId: row.id,
          data,
          notifyChange: bumpRegistry,
          subscribe,
          emitEvent,
          subscribeRegistry,
        },
      });
      loaded.set(row.id, { mod: reg, manifest: row.manifest });
      ok.push(row.id);
    } catch (err) {
      console.warn(`Plugin "${row.id}" failed to load:`, err);
      errors.push({ id: row.id, error: err.message || String(err) });
    }
  }
  if (ok.length || errors.length) bumpRegistry();
  return { loaded: ok, errors };
}

// Tear down a single plugin's contributions across every registry. Used by
// the manager when a plugin is disabled mid-session, so the DM doesn't have
// to refresh to see effects vanish.
export function unloadPlugin(pluginId) {
  const entry = loaded.get(pluginId);
  if (entry?.mod && typeof entry.mod.unregister === 'function') {
    try { entry.mod.unregister({ registries }); }
    catch (err) { console.warn(`Plugin "${pluginId}" unregister threw:`, err); }
  }
  for (const reg of Object.values(registries)) {
    // Per-plugin contributions: Map<pluginId, contribution>. templateOverlays
    // is keyed by templateId, not pluginId — strip its entries by matching
    // the pluginId field instead.
    if (reg === registries.templateOverlays) {
      for (const [k, v] of Array.from(reg.entries())) {
        if (v && v.pluginId === pluginId) reg.delete(k);
      }
    } else {
      reg.delete(pluginId);
    }
  }
  // Drop the plugin's event-bus subscriptions too so a stale handler
  // doesn't keep responding to broadcasts after the plugin is unloaded.
  pluginEventSubs.delete(pluginId);
  loaded.delete(pluginId);
  bumpRegistry();
}

// Reload a plugin (used after enable+upload). Disable+enable in quick
// succession is also handled by this — unloadPlugin first wipes the prior
// state so the import picks up any new client.js content.
export async function reloadPlugin(pluginId, ctx = {}) {
  unloadPlugin(pluginId);
  // Clear module cache by appending a unique cache-bust to the import URL.
  try {
    const res = await fetch('/api/plugins');
    const list = await res.json();
    const row = (list || []).find(p => p.id === pluginId && p.enabled);
    if (!row) return { ok: false, reason: 'Not enabled' };
    const url = `/api/plugins/${row.id}/asset/${row.manifest.frontend_entry || 'client.js'}?v=${Date.now()}`;
    const mod = await import(/* @vite-ignore */ url);
    const reg = mod.default || mod;
    if (!reg || typeof reg.register !== 'function') return { ok: false, reason: 'No register()' };
    const data = makeDataApi(row.id, ctx.socket);
    const subscribe = (handler) => subscribePluginEvents(row.id, handler);
    const emitEvent = (type, payload) => {
      if (!ctx.socket) return;
      try { ctx.socket.emit('plugin_event', { pluginId: row.id, type, payload }); } catch {}
    };
    if (ctx.socket) setupPluginEventBus(ctx.socket);
    reg.register({
      React,
      ReactKonva,
      registries,
      context: { ...ctx, manifest: row.manifest, pluginId: row.id, data, notifyChange: bumpRegistry, subscribe, emitEvent, subscribeRegistry },
    });
    loaded.set(row.id, { mod: reg, manifest: row.manifest });
    bumpRegistry();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

import React, { useEffect, useState } from 'react';

// RollableTables — the GM's random tables.
//
// Rows are WEIGHTED rather than numbered ranges: "1-3 nothing, 4-5 goblins,
// 6 dragon" is weights 3/2/1, and adding a row doesn't force a renumber of
// everything below it. The weight column doubles as the odds display.
//
// Rolling goes over the socket, not this component's fetches, so the result
// reaches every client and lands in the shared roll log.
export default function RollableTables({ onRoll }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // table object being edited, or null
  const [err, setErr] = useState('');
  const [importing, setImporting] = useState(false);
  // Which kind is on screen. Loot tables are numerous and rarely edited, so the
  // GM's own tables get the default view rather than being buried among 29
  // imported treasure tables.
  const [view, setView] = useState('general');
  const [note, setNote] = useState('');

  async function importTreasure() {
    setImporting(true);
    setErr('');
    setNote('');
    try {
      const res = await fetch('/api/tables/import-treasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      const made = (d.created || []).length;
      const had = (d.skipped || []).length;
      setNote(made
        ? `Imported ${made} table${made === 1 ? '' : 's'}${had ? `, ${had} already here` : ''}.`
        : `Nothing new — all ${had} are already here.`);
      await load();
    } catch (e) {
      setErr(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tables?full=1');
      setTables(res.ok ? await res.json() : []);
    } catch { setTables([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(t) {
    setErr('');
    const body = {
      name: t.name,
      description: t.description || '',
      rows: t.rows || [],
      // Carried through, or editing a loot table would quietly file it back
      // under the general tables.
      kind: t.kind === 'loot' ? 'loot' : 'general',
    };
    const res = await fetch(t.id ? `/api/tables/${t.id}` : '/api/tables', {
      method: t.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || 'Save failed'); return; }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!window.confirm('Delete this table?')) return;
    await fetch(`/api/tables/${id}`, { method: 'DELETE' });
    load();
  }

  if (editing) {
    return <TableEditor table={editing} onCancel={() => setEditing(null)} onSave={save} error={err} />;
  }

  const shown = view === 'all'
    ? tables
    : tables.filter((t) => (t.kind || 'general') === view);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      <div className="flex items-center gap-1">
        {[['general', 'Tables'], ['loot', 'Loot'], ['all', 'All']].map(([k, label]) => {
          const n = k === 'all' ? tables.length : tables.filter((t) => (t.kind || 'general') === k).length;
          return (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`text-xs px-2 py-1 rounded ${
                view === k ? 'bg-amber-800/70 text-amber-100' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >{label}{n ? ` (${n})` : ''}</button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Weighted random tables. Rolling shows the result to everyone.</p>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Safe to press twice: the import matches on table NAME, so a second
              run creates nothing rather than a duplicate of every table. */}
          <button
            onClick={importTreasure}
            disabled={importing}
            title="Bring in the DMG's treasure, gem, art and magic item tables"
            className="text-xs bg-amber-900/50 hover:bg-amber-800/60 border border-amber-800 px-2 py-1 rounded text-amber-200 disabled:opacity-60"
          >{importing ? 'Importing…' : 'Import DMG treasure'}</button>
          <button
            // A table made while looking at Loot is a loot table. Guessing from
            // the current view beats another dropdown in the new-table form.
            onClick={() => setEditing({
              name: '', description: '', rows: [{ text: '', weight: 1 }],
              kind: view === 'loot' ? 'loot' : 'general',
            })}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200"
          >+ New</button>
        </div>
      </div>

      {note && (
        <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded p-2">{note}</p>
      )}
      {loading && <p className="text-xs text-gray-500">Loading…</p>}
      {!loading && tables.length === 0 && (
        <p className="text-xs text-gray-500 italic py-4 text-center">
          No tables yet. Build one for wandering monsters, loot, or what the derelict holds.
        </p>
      )}

      <div className="space-y-2">
        {shown.length === 0 && !loading && (
          <p className="text-xs text-gray-500 italic py-4 text-center">
            {view === 'loot'
              ? 'No loot tables yet — use “Import DMG treasure” above.'
              : 'No tables here yet.'}
          </p>
        )}
        {shown.map((t) => (
          <div key={t.id} className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-3 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-100 truncate">{t.name}</div>
                <div className="text-[11px] text-gray-500">
                  {t.row_count} {t.row_count === 1 ? 'entry' : 'entries'}
                  {t.description ? ` · ${t.description}` : ''}
                </div>
              </div>
              <button
                onClick={() => onRoll(t.id, false)}
                disabled={!t.row_count}
                className="text-xs bg-dnd-gold hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 px-2 py-1 rounded font-semibold shrink-0"
                title="Roll and show everyone"
              >Roll</button>
              <button
                onClick={() => onRoll(t.id, true)}
                disabled={!t.row_count}
                className="text-xs bg-purple-800 hover:bg-purple-700 disabled:opacity-40 text-purple-100 px-2 py-1 rounded shrink-0"
                title="Roll privately — players never see it"
              >Secret</button>
              <button
                onClick={() => setEditing({ ...t, rows: t.rows || [] })}
                className="text-xs text-gray-400 hover:text-white px-1 shrink-0"
              >Edit</button>
              <button
                onClick={() => remove(t.id)}
                className="text-xs text-red-400 hover:text-red-300 px-1 shrink-0"
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableEditor({ table, onCancel, onSave, error }) {
  const [draft, setDraft] = useState({
    ...table,
    rows: table.rows?.length ? table.rows.map(r => ({ ...r })) : [{ text: '', weight: 1 }],
  });
  const total = draft.rows.reduce((a, r) => a + (parseInt(r.weight, 10) || 1), 0);

  const patchRow = (i, k, v) =>
    setDraft(d => ({ ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      <input
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
        placeholder="Table name"
        value={draft.name}
        onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
      />
      <input
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300"
        placeholder="Description (optional)"
        value={draft.description || ''}
        onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
      />

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] uppercase tracking-wider text-gray-500">Entries</span>
        <span className="text-[11px] text-gray-500">total weight {total}</span>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {draft.rows.map((r, i) => {
          const w = parseInt(r.weight, 10) || 1;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={r.weight ?? 1}
                onChange={(e) => patchRow(i, 'weight', e.target.value)}
                className="w-12 bg-gray-800 border border-gray-600 rounded px-1 py-1 text-xs text-white text-center"
                title="Weight — how many times more likely than a weight-1 row"
              />
              <span className="text-[10px] text-gray-600 w-10 shrink-0 text-right">
                {total ? Math.round((w / total) * 100) : 0}%
              </span>
              <input
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                placeholder="Result"
                value={r.text || ''}
                onChange={(e) => patchRow(i, 'text', e.target.value)}
              />
              <button
                onClick={() => setDraft(d => ({ ...d, rows: d.rows.filter((_, j) => j !== i) }))}
                className="text-red-400 hover:text-red-300 text-xs px-1 shrink-0"
              >✕</button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setDraft(d => ({ ...d, rows: [...d.rows, { text: '', weight: 1 }] }))}
        className="text-xs text-indigo-400 hover:text-indigo-300"
      >+ Add entry</button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(draft)}
          disabled={!draft.name.trim()}
          className="flex-1 text-sm bg-dnd-gold hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 rounded py-1.5 font-semibold"
        >Save</button>
        <button onClick={onCancel} className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-3 py-1.5">Cancel</button>
      </div>
    </div>
  );
}

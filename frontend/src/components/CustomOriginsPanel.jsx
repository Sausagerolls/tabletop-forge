// CustomOriginsPanel — GM-only list of custom races + backgrounds.
// Lives as a panel tab in DMView. Provides create / edit / delete /
// JSON-export. The view filters down to just the GM-authored rows so
// the SRD content the app already knows isn't repeated here.

import React, { useEffect, useState, useMemo } from 'react';
import CustomRaceEditor from './CustomRaceEditor.jsx';
import CustomBackgroundEditor from './CustomBackgroundEditor.jsx';

export default function CustomOriginsPanel() {
  const [tab, setTab] = useState('races');   // 'races' | 'backgrounds'
  const [races, setRaces]     = useState([]);
  const [backgrounds, setBgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor]   = useState(null); // {kind, initial?, parentRace?}
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSelected, setExportSelected] = useState(new Set());

  async function loadAll() {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([
        fetch('/api/custom/races').then((r) => r.json()),
        fetch('/api/custom/backgrounds').then((r) => r.json()),
      ]);
      setRaces(Array.isArray(r) ? r : []);
      setBgs(Array.isArray(b) ? b : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  const racesByParent = useMemo(() => {
    const out = { roots: [], byParent: new Map() };
    for (const r of races) {
      if (r.parent_id) {
        const arr = out.byParent.get(r.parent_id) || [];
        arr.push(r);
        out.byParent.set(r.parent_id, arr);
      } else {
        out.roots.push(r);
      }
    }
    return out;
  }, [races]);

  async function deleteRow(kind, id) {
    if (!window.confirm('Delete this entry?')) return;
    await fetch(`/api/custom/${kind}/${id}`, { method: 'DELETE' });
    loadAll();
  }

  function doExport() {
    const ids = [...exportSelected].join(',');
    if (!ids) return;
    const url = `/api/custom/${tab}/export?ids=${encodeURIComponent(ids)}`;
    // Trigger a download via anchor click.
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-${tab}.json`;
    a.click();
    setExportOpen(false);
    setExportSelected(new Set());
  }

  const list = tab === 'races' ? races : backgrounds;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['races', 'backgrounds'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded border ${
                tab === t
                  ? 'bg-purple-800 border-purple-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
              }`}>{t === 'races' ? 'Custom Races' : 'Custom Backgrounds'}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            setExportSelected(new Set(list.map((r) => r.id)));
            setExportOpen(true);
          }}
            className="text-xs bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-200 px-2 py-1 rounded">
            Export JSON
          </button>
          <button onClick={() => setEditor({ kind: tab })}
            className="text-xs bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700 text-purple-200 px-2 py-1 rounded">
            + New {tab === 'races' ? 'Race' : 'Background'}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 italic">
        This view shows only GM-authored content — the SRD races and backgrounds
        the app ships with are not listed here.
      </div>

      {tab === 'races' ? (
        <div className="space-y-2">
          {loading && <p className="text-xs text-gray-500 italic">Loading…</p>}
          {!loading && races.length === 0 && (
            <p className="text-xs text-gray-500 italic">No custom races yet.</p>
          )}
          {racesByParent.roots.map((r) => (
            <div key={r.id} className="bg-gray-800/40 border border-gray-700 rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-purple-200 font-semibold">{r.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {r.edition} · {r.data?.creature_type || 'Humanoid'}
                    {(racesByParent.byParent.get(r.id) || []).length > 0 &&
                      ` · ${(racesByParent.byParent.get(r.id) || []).length} sub-races`}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditor({ kind: 'races', parentRace: r })}
                    className="text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1 rounded">+ sub-race</button>
                  <button onClick={() => setEditor({ kind: 'races', initial: { ...r.data, id: r.id, name: r.name, edition: r.edition, parent_id: r.parent_id } })}
                    className="text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1 rounded">edit</button>
                  <button onClick={() => deleteRow('races', r.id)}
                    className="text-[10px] bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-200 px-2 py-1 rounded">delete</button>
                </div>
              </div>
              {(racesByParent.byParent.get(r.id) || []).map((s) => (
                <div key={s.id} className="ml-4 mt-1 bg-gray-900/40 border border-gray-700 rounded p-1.5 flex items-center justify-between">
                  <div className="text-xs text-purple-100">↳ {s.name}</div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditor({ kind: 'races', initial: { ...s.data, id: s.id, name: s.name, edition: s.edition, parent_id: s.parent_id } })}
                      className="text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-0.5 rounded">edit</button>
                    <button onClick={() => deleteRow('races', s.id)}
                      className="text-[10px] bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-200 px-2 py-0.5 rounded">delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {loading && <p className="text-xs text-gray-500 italic">Loading…</p>}
          {!loading && backgrounds.length === 0 && (
            <p className="text-xs text-gray-500 italic">No custom backgrounds yet.</p>
          )}
          {backgrounds.map((b) => (
            <div key={b.id} className="bg-gray-800/40 border border-gray-700 rounded p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm text-amber-200 font-semibold">{b.name}</div>
                <div className="text-[11px] text-gray-500">
                  feat: {b.data?.feat?.name || '—'}
                  {b.data?.skills?.length ? ` · ${b.data.skills.length} skill(s)` : ''}
                  {b.data?.tool ? ` · tool: ${b.data.tool}` : ''}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditor({ kind: 'backgrounds', initial: { ...b.data, id: b.id, name: b.name } })}
                  className="text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1 rounded">edit</button>
                <button onClick={() => deleteRow('backgrounds', b.id)}
                  className="text-[10px] bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-200 px-2 py-1 rounded">delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editor?.kind === 'races' && (
        <CustomRaceEditor
          initial={editor.initial}
          parentRace={editor.parentRace}
          onClose={() => setEditor(null)}
          onSaved={loadAll}
        />
      )}
      {editor?.kind === 'backgrounds' && (
        <CustomBackgroundEditor
          initial={editor.initial}
          onClose={() => setEditor(null)}
          onSaved={loadAll}
        />
      )}

      {exportOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setExportOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-emerald-300 font-semibold text-sm">Export {tab}</h3>
              <button onClick={() => setExportOpen(false)}
                className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-xs text-gray-500 px-2 pb-2">
                Tick the rows to include in the export bundle.
              </div>
              <div className="px-2 pb-2 flex gap-2">
                <button onClick={() => setExportSelected(new Set(list.map((r) => r.id)))}
                  className="text-[10px] text-emerald-300 hover:text-emerald-100 underline">all</button>
                <button onClick={() => setExportSelected(new Set())}
                  className="text-[10px] text-gray-400 hover:text-gray-200 underline">none</button>
              </div>
              {list.map((r) => {
                const checked = exportSelected.has(r.id);
                return (
                  <label key={r.id} className={`flex items-center gap-2 p-2 rounded ${
                    checked ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-gray-800 border border-gray-700'
                  }`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => {
                        const next = new Set(exportSelected);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        setExportSelected(next);
                      }} />
                    <span className="text-sm text-white">{r.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-gray-700 flex justify-end gap-2">
              <button onClick={() => setExportOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
              <button onClick={doExport} disabled={exportSelected.size === 0}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 text-white px-3 py-1.5 rounded">
                Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

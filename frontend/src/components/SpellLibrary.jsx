import React, { useEffect, useState } from 'react';
import { useAllClasses } from '../utils/classes.js';

const LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

export default function SpellLibrary({ aiSettings, activeSrdEdition = 'both', onChangeActiveSrdEdition }) {
  const CLASSES = useAllClasses();
  const [spells, setSpells] = useState([]);
  // Scan-PDF panel collapse state. Persisted under the same key shape as
  // the host's CollapsibleSection in DMView so DMs reading the storage
  // see a consistent layout. Defaults to OPEN — most DMs reach the
  // panel to import a book, then forget it.
  const [scanOpen, setScanOpen] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dndvtt_spell_panel_collapsed_v1') || '{}');
      if ('scan_pdf' in stored) return !stored.scan_pdf;
    } catch {}
    return true;
  });
  function toggleScan() {
    setScanOpen((prev) => {
      const next = !prev;
      try {
        const stored = JSON.parse(localStorage.getItem('dndvtt_spell_panel_collapsed_v1') || '{}');
        stored.scan_pdf = !next;
        localStorage.setItem('dndvtt_spell_panel_collapsed_v1', JSON.stringify(stored));
      } catch {}
      return next;
    });
  }
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [scanPasses, setScanPasses] = useState(5);
  const [scanMinConsensus, setScanMinConsensus] = useState(2);
  const [scanMaxPages, setScanMaxPages] = useState('');
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [editing, setEditing] = useState(null); // spell row being edited or null
  const [creating, setCreating] = useState(null); // blank-spell draft when adding manually, or null
  const [createError, setCreateError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [bulkRefreshState, setBulkRefreshState] = useState(null); // null | 'loading' | summary
  const [bulkRefreshErr, setBulkRefreshErr] = useState('');
  // Export modal state. Pulls a fresh list from /api with the modal's own
  // filters so the DM can pick a subset (e.g. just Wizard L3 spells) without
  // changing what the main library list is showing.
  const [exportOpen, setExportOpen] = useState(false);
  const [exportRows, setExportRows] = useState([]);
  const [exportSelected, setExportSelected] = useState(new Set());
  const [exportClass, setExportClass] = useState('');
  const [exportLevel, setExportLevel] = useState('');
  const [exportSearch, setExportSearch] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  // Open5e SRD ruleset — '2014' (5.1) or '2024' (5.2). Affects both the scan
  // fallback and the per-spell "Refresh from open5e" action. Persisted across
  // reloads so the DM doesn't have to re-pick after every refresh.
  const [ruleset, setRuleset] = useState(() => {
    try { return localStorage.getItem('spellRuleset') === '2024' ? '2024' : '2014'; }
    catch { return '2014'; }
  });
  useEffect(() => {
    try { localStorage.setItem('spellRuleset', ruleset); } catch {}
  }, [ruleset]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (levelFilter !== '') params.set('level', levelFilter);
      if (classFilter) params.set('klass', classFilter);
      const res = await fetch(`/api/spell-library?${params}`);
      const data = await res.json();
      setSpells(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Visible-spell derivation: applies the DM's active-SRD filter
  // client-side. Anything whose `source` doesn't start with "SRD " is
  // treated as a manually-added spell and stays visible regardless
  // of the toggle — that's how a DM keeps their homebrew always in
  // view even when they're filtering the SRD set.
  function isManualSpell(s) {
    return !s.source || !String(s.source).startsWith('SRD ');
  }
  const visibleSpells = (() => {
    if (activeSrdEdition === '2014') {
      return spells.filter((s) => isManualSpell(s) || s.edition === '2014');
    }
    if (activeSrdEdition === '2024') {
      return spells.filter((s) => isManualSpell(s) || s.edition === '2024');
    }
    return spells;
  })();
  // Counts driving the toggle's pip badges so the DM can see how
  // many spells are in each edition before flipping.
  const editionCounts = spells.reduce((acc, s) => {
    if (s.edition === '2014') acc.c2014 += 1;
    else if (s.edition === '2024') acc.c2024 += 1;
    if (isManualSpell(s)) acc.manual += 1;
    return acc;
  }, { c2014: 0, c2024: 0, manual: 0 });

  useEffect(() => { load(); }, []);
  // Debounce search input
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, levelFilter, classFilter]);

  // Force a re-render once a second while a scan is active so the elapsed
  // and ETA counters update between page events.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!scanProgress) return;
    const t = setInterval(() => forceTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [scanProgress?.startedAt]);

  async function handleScan() {
    if (!scanFile) return;
    if (!aiSettings?.baseUrl) {
      setScanError('Configure the AI provider in the Session tab first.');
      return;
    }
    setScanError('');
    setScanResult(null);
    const startedAt = Date.now();
    setScanProgress({
      pages: 0,
      total: 0,
      spellsFound: 0,
      spellsImported: 0,
      spellsSkippedDuplicates: 0,
      pageDurations: [],
      lastMode: '',
      startedAt,
    });
    try {
      const fd = new FormData();
      fd.append('file', scanFile);
      fd.append('provider', aiSettings.provider || 'lmstudio');
      fd.append('baseUrl', aiSettings.baseUrl);
      fd.append('passes', String(scanPasses));
      fd.append('minConsensus', String(scanMinConsensus));
      fd.append('ruleset', ruleset);
      if (scanMaxPages) fd.append('maxPages', String(scanMaxPages));
      if (aiSettings.apiKey) fd.append('apiKey', aiSettings.apiKey);
      if (aiSettings.model) fd.append('model', aiSettings.model);

      const res = await fetch('/api/spell-library/scan-pdf', { method: 'POST', body: fd });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let final = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let event;
          try { event = JSON.parse(line); } catch { continue; }
          if (event.kind === 'start') {
            setScanProgress(prev => ({ ...prev, total: event.pages }));
          } else if (event.kind === 'page') {
            setScanProgress(prev => {
              const pageDurations = [...(prev?.pageDurations || []), event.durationMs];
              return {
                ...prev,
                pages: event.page,
                total: event.total,
                spellsFound: event.spellsFound,
                spellsImported: event.spellsImported,
                spellsSkippedDuplicates: event.spellsSkippedDuplicates,
                hallucinationsDropped: event.hallucinationsDropped || 0,
                pageDurations,
                lastMode: event.mode,
                lastError: event.error || null,
              };
            });
            if (event.newSpells?.length) await load();
          } else if (event.kind === 'done') {
            final = event;
          } else if (event.kind === 'error') {
            throw new Error(event.error || 'Scan failed');
          }
        }
      }
      setScanResult(final || { pages: 0, spellsFound: 0, spellsImported: 0, spellsSkippedDuplicates: 0, pageErrors: [] });
      await load();
      // After the scan, surface any spells whose names look broken so the DM
      // can apply suggested fixes from the canonical 5e list.
      await openReview(true);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanProgress(null);
    }
  }

  async function openReview(autoOpen = false) {
    setReviewLoading(true);
    try {
      const res = await fetch('/api/spell-library/review');
      const data = await res.json();
      const items = (data.items || []).map(it => ({ ...it, editedName: it.suggestedName, status: 'pending' }));
      setReviewItems(items);
      // Auto-open only when called from the scan flow — manual button always opens.
      if (!autoOpen || items.length > 0) setReviewOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewLoading(false);
    }
  }

  async function applyReviewItem(idx) {
    const it = reviewItems[idx];
    if (!it || it.status !== 'pending') return;
    try {
      const res = await fetch(`/api/spell-library/${it.id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: it.editedName }),
      });
      let data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Once renamed to its canonical form, try to backfill body fields from
      // open5e — fixes any AI-mangled description / casting time / range etc.
      // along with the name. Silently ignore non-SRD content (404).
      let refreshed = false;
      try {
        const r2 = await fetch(`/api/spell-library/${it.id}/refresh-from-open5e`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ruleset }),
        });
        if (r2.ok) { data = await r2.json(); refreshed = true; }
      } catch (e) { /* ignore */ }
      setReviewItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'applied', refreshed } : x));
      setSpells(prev => prev.map(s => s.id === it.id ? data : s));
    } catch (err) {
      setReviewItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'error', error: err.message } : x));
    }
  }

  async function applyAllReview() {
    for (let i = 0; i < reviewItems.length; i++) {
      if (reviewItems[i].status === 'pending' && !reviewItems[i].conflict) {
        // eslint-disable-next-line no-await-in-loop
        await applyReviewItem(i);
      }
    }
  }

  async function handleBulkRefresh() {
    if (!confirm(`Re-fetch every spell's body fields from open5e (${ruleset} SRD)? Empty/short descriptions get replaced with the full canonical text. AI-extracted damage/components are preserved.`)) return;
    setBulkRefreshState('loading');
    setBulkRefreshErr('');
    try {
      const res = await fetch('/api/spell-library/refresh-all-from-open5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBulkRefreshState(data);
      await load();
    } catch (err) {
      setBulkRefreshState(null);
      setBulkRefreshErr(err.message);
    }
  }

  // ── Export / import ────────────────────────────────────────────────────
  async function loadExportList() {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (exportSearch) params.set('search', exportSearch);
      if (exportLevel !== '') params.set('level', exportLevel);
      if (exportClass) params.set('klass', exportClass);
      const res = await fetch(`/api/spell-library?${params}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setExportRows(rows);
      // Pre-select everything that currently matches — most common case is
      // "export this whole filtered subset", and the DM can untick outliers.
      setExportSelected(new Set(rows.map(r => r.id)));
    } catch (e) { console.error(e); }
    finally { setExportLoading(false); }
  }
  function openExport() {
    // Seed the modal's filters with whatever the main list is showing so the
    // first visible result matches the DM's mental model.
    setExportSearch(search);
    setExportLevel(levelFilter);
    setExportClass(classFilter);
    setExportOpen(true);
  }
  useEffect(() => { if (exportOpen) loadExportList(); }, [exportOpen, exportSearch, exportLevel, exportClass]);

  async function doExport() {
    if (exportSelected.size === 0) return;
    setExportSubmitting(true);
    try {
      const ids = [...exportSelected].join(',');
      const res = await fetch(`/api/spell-library/export?ids=${encodeURIComponent(ids)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spells-export-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (err) { alert('Export failed: ' + err.message); }
    finally { setExportSubmitting(false); }
  }

  async function handleImportFile(file) {
    if (!file) return;
    setImportStatus('Importing…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/spell-library/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setImportStatus(`Imported ${data.imported} of ${data.total} (${data.skipped} skipped — duplicates or invalid).`);
      await load();
    } catch (err) { setImportStatus('Import failed: ' + err.message); }
  }

  function skipReviewItem(idx) {
    setReviewItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'skipped' } : x));
  }

  async function deleteReviewItem(idx) {
    const it = reviewItems[idx];
    if (!it) return;
    if (!confirm(`Delete "${it.currentName}"?`)) return;
    try {
      await fetch(`/api/spell-library/${it.id}`, { method: 'DELETE' });
      setReviewItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'deleted' } : x));
      setSpells(prev => prev.filter(s => s.id !== it.id));
    } catch (err) {
      setReviewItems(prev => prev.map((x, i) => i === idx ? { ...x, status: 'error', error: err.message } : x));
    }
  }

  function fmtSeconds(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}m ${r}s`;
  }

  async function handleDelete(id) {
    if (!confirm('Delete this spell from the library?')) return;
    await fetch(`/api/spell-library/${id}`, { method: 'DELETE' });
    setSpells(prev => prev.filter(s => s.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  async function handleDeleteAll() {
    if (!spells.length) return;
    const total = spells.length;
    if (!confirm(`Delete ALL ${total} spell${total === 1 ? '' : 's'} from the shared library? This cannot be undone.`)) return;
    if (!confirm('Really wipe the entire library? Type Cancel to abort, OK to proceed.')) return;
    try {
      const res = await fetch('/api/spell-library?confirm=yes', { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSpells([]);
      setEditing(null);
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  async function handleSaveEdit(updated) {
    const res = await fetch(`/api/spell-library/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const row = await res.json();
    if (row && !row.error) {
      setSpells(prev => prev.map(s => s.id === row.id ? row : s));
      setEditing(null);
    }
  }

  function startCreate() {
    setCreateError('');
    setCreating({
      name: '', level: 0, type: 'utility', school: '',
      casting_time: '', range_area: '', duration: '',
      comp_v: false, comp_s: false, comp_m: false, comp_m_text: '',
      attack_save: '', save_ability: '',
      damage_entries: [], extra_effects: '', description: '',
      allowed_classes: [],
    });
  }

  async function handleSaveNew(draft) {
    setCreateError('');
    if (!draft.name?.trim()) {
      setCreateError('Name is required.');
      return;
    }
    try {
      const res = await fetch('/api/spell-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, source: 'manual' }),
      });
      const row = await res.json();
      if (!res.ok || row.error) throw new Error(row.error || `HTTP ${res.status}`);
      // POST upserts on name conflict — _created (from xmax=0) tells us
      // whether this was a fresh row or an overwrite of an existing entry.
      setImportStatus(row._created
        ? `Added "${row.name}" to the library.`
        : `"${row.name}" already existed — overwrote it with the new fields.`);
      setCreating(null);
      await load();
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* PDF scan — Open5e ruleset toggle moved INSIDE this box (it's
          only relevant to scanning + per-spell Refresh anyway). The
          whole panel is collapsible so it doesn't crowd the library
          list when not in use. */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl">
        <button
          type="button"
          onClick={toggleScan}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-dnd-gold hover:text-yellow-200 transition-colors"
          title={scanOpen ? 'Collapse Scan PDF' : 'Expand Scan PDF'}
        >
          <span>Scan PDF</span>
          <span className="text-xs text-gray-500 select-none">{scanOpen ? '▼' : '▶'}</span>
        </button>
        {scanOpen && (
        <div className="px-3 pb-3 space-y-2">
        <p className="text-xs text-gray-400">
          Upload a PDF — every page is rasterised and sent to the configured vision model.
          Each spell extracted is added to the shared library. Requires a vision-capable
          model loaded in LM Studio / Ollama / your custom endpoint.
        </p>
        {/* Open5e ruleset — used as canonical source for scan fallbacks
            and the per-spell Refresh action. Lives here because it's
            only relevant when interacting with the scanner / open5e. */}
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-dnd-gold">Open5e ruleset</div>
            <p className="text-[10px] text-gray-400 leading-tight">
              Used as a canonical source when the AI fails or for the per-spell Refresh button. Match this to the edition of the PDF you're importing.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 bg-gray-800 border border-gray-700 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setRuleset('2014')}
              className={`text-xs px-3 py-0.5 rounded-full transition ${ruleset === '2014' ? 'bg-dnd-gold text-gray-900 font-semibold' : 'text-gray-300 hover:text-white'}`}
              title="5e SRD 5.1 (2014 ruleset, OGL)"
            >
              2014
            </button>
            <button
              type="button"
              onClick={() => setRuleset('2024')}
              className={`text-xs px-3 py-0.5 rounded-full transition ${ruleset === '2024' ? 'bg-dnd-gold text-gray-900 font-semibold' : 'text-gray-300 hover:text-white'}`}
              title="5e SRD 5.2 (2024 ruleset, CC-BY 4.0)"
            >
              2024
            </button>
          </div>
        </div>
        <div className="text-[11px] text-amber-200 bg-amber-900/30 border border-amber-700/60 rounded-lg px-2.5 py-2 leading-snug">
          <strong className="text-amber-300">⚠ Expect AI mistakes.</strong> The scanner reads your PDF
          with a language model, so misspelled names, wrong damage dice, missing components, or
          occasional hallucinated spells <em>will</em> happen. Mitigations in place: multi-pass
          consensus voting, canonical 5e name validation, and an open5e SRD fallback for any
          field the AI flubs. After the scan finishes, a <strong>Review names</strong> panel
          opens automatically to surface broken entries with one-click fixes — but always
          spot-check the spells you actually plan to use.
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => { setScanFile(e.target.files?.[0] || null); setScanResult(null); setScanError(''); }}
          className="w-full text-xs text-gray-300 file:bg-gray-700 file:hover:bg-gray-600 file:text-gray-200 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2"
        />
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col text-[11px] text-gray-400">
            <span>Passes per page</span>
            <input
              type="number"
              min={1}
              max={12}
              value={scanPasses}
              disabled={!!scanProgress}
              onChange={(e) => {
                const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                setScanPasses(v);
                if (scanMinConsensus > v) setScanMinConsensus(v);
              }}
              className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white text-center"
            />
          </label>
          <label className="flex flex-col text-[11px] text-gray-400">
            <span>Min consensus</span>
            <input
              type="number"
              min={1}
              max={scanPasses}
              value={scanMinConsensus}
              disabled={!!scanProgress}
              onChange={(e) => setScanMinConsensus(Math.max(1, Math.min(scanPasses, parseInt(e.target.value) || 1)))}
              className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white text-center"
            />
          </label>
          <label className="flex flex-col text-[11px] text-gray-400">
            <span>Max pages</span>
            <input
              type="number"
              min={1}
              placeholder="all"
              value={scanMaxPages}
              disabled={!!scanProgress}
              onChange={(e) => setScanMaxPages(e.target.value.replace(/[^0-9]/g, ''))}
              className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white text-center"
            />
          </label>
        </div>
        <p className="text-[10px] text-gray-500">
          Spells must appear in at least <strong>{scanMinConsensus}/{scanPasses}</strong> passes to import. Higher consensus = fewer hallucinations.
        </p>
        <button
          onClick={handleScan}
          disabled={!scanFile || !!scanProgress}
          className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white py-1.5 rounded-lg text-sm font-semibold"
        >
          {scanProgress ? 'Scanning…' : 'Scan'}
        </button>
        {scanProgress && (() => {
          const { pages, total, spellsImported, spellsSkippedDuplicates, pageDurations = [], lastMode, startedAt } = scanProgress;
          const pct = total > 0 ? Math.round((pages / total) * 100) : 0;
          const elapsed = Date.now() - (startedAt || Date.now());
          // Use the running average of completed pages to extrapolate ETA.
          const avg = pageDurations.length ? pageDurations.reduce((a, b) => a + b, 0) / pageDurations.length : 0;
          const remaining = total > pages ? avg * (total - pages) : 0;
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span>{total > 0 ? `Page ${pages}/${total}` : 'Rasterising…'} {lastMode && total > 0 ? `· ${lastMode}` : ''}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 w-full bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  Imported: <span className="text-green-300 font-mono">{spellsImported}</span>
                  {' · Dupes: '}<span className="font-mono">{spellsSkippedDuplicates}</span>
                  {scanProgress.hallucinationsDropped > 0 && (
                    <> {' · Hallucinations dropped: '}<span className="text-amber-300 font-mono">{scanProgress.hallucinationsDropped}</span></>
                  )}
                </span>
                <span>Elapsed {fmtSeconds(elapsed)} · ETA {fmtSeconds(remaining)}</span>
              </div>
            </div>
          );
        })()}
        {scanError && <p className="text-xs text-red-400">{scanError}</p>}
        {scanResult && (
          <div className="text-xs text-gray-300 space-y-0.5">
            <div>Pages processed: <span className="text-white font-mono">{scanResult.pages}</span></div>
            <div>Spells found: <span className="text-white font-mono">{scanResult.spellsFound}</span></div>
            <div>Imported: <span className="text-green-300 font-mono">{scanResult.spellsImported}</span></div>
            <div>Skipped (already in library): <span className="text-gray-400 font-mono">{scanResult.spellsSkippedDuplicates}</span></div>
            {scanResult.pageErrors?.length > 0 && (
              <details className="mt-1">
                <summary className="text-red-400 cursor-pointer">Errors on {scanResult.pageErrors.length} page(s)</summary>
                <ul className="pl-4 mt-1">
                  {scanResult.pageErrors.map(p => <li key={p.page}>p.{p.page}: {p.error}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
        </div>
        )}
      </div>

      {/* Browse */}
      <div className="space-y-2">
        {/* SRD edition filter — applies to BOTH the DM's view and the
            players' view via the same active_srd_edition session
            field. Manual / homebrew spells (source not starting with
            "SRD ") stay visible regardless so the DM never loses
            sight of their custom entries. */}
        {onChangeActiveSrdEdition && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">SRD Edition</span>
              <span className="text-[10px] text-gray-500">
                Manual entries always shown · {editionCounts.manual} custom
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 'both', label: 'All',  count: editionCounts.c2014 + editionCounts.c2024 },
                { val: '2014', label: '2014', count: editionCounts.c2014 },
                { val: '2024', label: '2024', count: editionCounts.c2024 },
              ].map(({ val, label, count }) => (
                <button
                  key={val}
                  onClick={() => onChangeActiveSrdEdition(val)}
                  title={
                    val === 'both' ? 'Show every SRD edition.'
                    : val === '2014' ? 'Show only 2014 SRD 5.1 spells (and your manual entries).'
                    : 'Show only 2024 SRD 5.2 spells (and your manual entries).'
                  }
                  className={`py-1.5 px-1 rounded border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    activeSrdEdition === val
                      ? 'bg-dnd-gold/20 border-dnd-gold text-dnd-gold'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  {label}
                  <span className="text-[10px] font-mono opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-dnd-gold">Library {spells.length > 0 && <span className="text-xs text-gray-500 font-normal">({visibleSpells.length}{visibleSpells.length !== spells.length ? ` of ${spells.length}` : ''})</span>}</h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={startCreate}
              disabled={!!creating}
              className="text-xs bg-dnd-gold hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-semibold px-2 py-1 rounded"
              title="Manually add a spell to the shared library"
            >
              + New spell
            </button>
            {spells.length > 0 && (
              <button
                onClick={openExport}
                className="text-xs bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-200 px-2 py-1 rounded"
                title="Export selected (or all) spells as a JSON file"
              >
                Export
              </button>
            )}
            <label className="text-xs bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-200 px-2 py-1 rounded cursor-pointer" title="Import a previously exported spells JSON file">
              Import
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => { handleImportFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
            {spells.length > 0 && (
              <button
                onClick={handleBulkRefresh}
                disabled={bulkRefreshState === 'loading'}
                className="text-xs bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-700 text-indigo-200 px-2 py-1 rounded disabled:opacity-50"
                title="Backfill missing or truncated spell descriptions from open5e for every row in the library"
              >
                {bulkRefreshState === 'loading' ? 'Refreshing…' : 'Refresh all from open5e'}
              </button>
            )}
            {spells.length > 0 && (
              <button
                onClick={() => openReview(false)}
                disabled={reviewLoading}
                className="text-xs bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700 text-amber-200 px-2 py-1 rounded disabled:opacity-50"
                title="Scan the library for broken spell names and suggest fixes"
              >
                {reviewLoading ? 'Checking…' : 'Review names'}
              </button>
            )}
            {spells.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs bg-red-900/50 hover:bg-red-800/60 border border-red-700 text-red-300 px-2 py-1 rounded"
                title="Delete every spell in the shared library"
              >
                Delete all
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search by name…"
            className="flex-1 min-w-[140px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="">All levels</option>
            {LEVEL_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
          <select
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All classes</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {importStatus && (
          <div className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>{importStatus}</span>
            <button onClick={() => setImportStatus('')} className="text-[11px] text-gray-400 hover:text-white">dismiss</button>
          </div>
        )}
        {bulkRefreshErr && (
          <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            Refresh failed: {bulkRefreshErr}
          </div>
        )}
        {bulkRefreshState && bulkRefreshState !== 'loading' && (
          <div className="text-xs text-indigo-200 bg-indigo-900/30 border border-indigo-800 rounded-lg px-3 py-2 space-y-1">
            <div>
              <strong>Refresh complete</strong> — {bulkRefreshState.updated} updated · {bulkRefreshState.unchanged} already complete · {bulkRefreshState.missing} not in open5e ({bulkRefreshState.ruleset} SRD)
              {bulkRefreshState.failed > 0 && <> · <span className="text-red-300">{bulkRefreshState.failed} failed</span></>}
            </div>
            {Array.isArray(bulkRefreshState.examples) && bulkRefreshState.examples.length > 0 && (
              <details>
                <summary className="cursor-pointer text-indigo-300">Sample fixes ({bulkRefreshState.examples.length})</summary>
                <ul className="mt-1 pl-4 space-y-0.5 text-[11px] text-gray-300">
                  {bulkRefreshState.examples.map((ex, i) => (
                    <li key={i}>{ex.name}: {ex.oldLen} → {ex.newLen} chars</li>
                  ))}
                </ul>
              </details>
            )}
            <button onClick={() => setBulkRefreshState(null)} className="text-[11px] text-gray-400 hover:text-white underline">
              dismiss
            </button>
          </div>
        )}
        {creating && (
          <div className="bg-gray-800 border border-dnd-gold/60 rounded-lg p-2">
            <div className="text-xs text-dnd-gold font-semibold mb-1">New spell</div>
            {createError && <div className="text-[11px] text-red-400 mb-1">{createError}</div>}
            <SpellEditor
              initial={creating}
              ruleset={ruleset}
              onCancel={() => { setCreating(null); setCreateError(''); }}
              onSave={handleSaveNew}
            />
          </div>
        )}
        {loading && <p className="text-xs text-gray-500 italic">Loading…</p>}
        {!loading && spells.length === 0 && (
          <p className="text-xs text-gray-500 italic">No spells in the library yet.</p>
        )}
        {!loading && spells.length > 0 && visibleSpells.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            {spells.length} spell{spells.length === 1 ? '' : 's'} hidden by the SRD edition filter. Switch to <em>All</em> above to see them.
          </p>
        )}
        <div className="space-y-1">
          {visibleSpells.map(s => (
            <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">{s.name}</div>
                  <div className="text-xs text-gray-400">
                    {LEVEL_LABELS[s.level] || `lvl ${s.level}`}
                    {s.school ? ` · ${s.school}` : ''}
                    {s.type ? ` · ${s.type}` : ''}
                  </div>
                  {Array.isArray(s.allowed_classes) && s.allowed_classes.length > 0 && (
                    <div className="text-[10px] text-purple-300 truncate" title={s.allowed_classes.join(', ')}>
                      {s.allowed_classes.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(prev => prev?.id === s.id ? null : s)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
                  >
                    {editing?.id === s.id ? 'Close' : 'View / Edit'}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs bg-red-900/50 hover:bg-red-800/60 border border-red-700 text-red-300 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editing?.id === s.id && (
                <SpellEditor
                  initial={s}
                  ruleset={ruleset}
                  onCancel={() => setEditing(null)}
                  onSave={handleSaveEdit}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {exportOpen && (
        <ExportModal
          rows={exportRows}
          selected={exportSelected}
          search={exportSearch}
          level={exportLevel}
          klass={exportClass}
          loading={exportLoading}
          submitting={exportSubmitting}
          onSearch={setExportSearch}
          onLevel={setExportLevel}
          onKlass={setExportClass}
          onToggle={(id) => setExportSelected(prev => {
            const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
          })}
          onSelectAll={() => setExportSelected(new Set(exportRows.map(r => r.id)))}
          onSelectNone={() => setExportSelected(new Set())}
          onClose={() => setExportOpen(false)}
          onExport={doExport}
        />
      )}

      {reviewOpen && (
        <ReviewModal
          items={reviewItems}
          onClose={() => setReviewOpen(false)}
          onEditName={(idx, val) => setReviewItems(prev => prev.map((x, i) => i === idx ? { ...x, editedName: val } : x))}
          onApply={applyReviewItem}
          onSkip={skipReviewItem}
          onDelete={deleteReviewItem}
          onApplyAll={applyAllReview}
        />
      )}
    </div>
  );
}

function ExportModal({ rows, selected, search, level, klass, loading, submitting,
  onSearch, onLevel, onKlass, onToggle, onSelectAll, onSelectNone, onClose, onExport }) {
  const CLASSES = useAllClasses();
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-dnd-gold">Export spells</h3>
            <p className="text-[11px] text-gray-400">Filter to narrow the list, tick the spells you want, then download.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm px-2">✕</button>
        </div>
        <div className="px-4 py-2 border-b border-gray-700 grid grid-cols-3 gap-2">
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          />
          <select
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={level}
            onChange={(e) => onLevel(e.target.value)}
          >
            <option value="">All levels</option>
            {LEVEL_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
          <select
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={klass}
            onChange={(e) => onKlass(e.target.value)}
          >
            <option value="">All classes</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between text-xs text-gray-300">
          <span>{loading ? 'Loading…' : `${selected.size} of ${rows.length} selected`}</span>
          <div className="flex gap-2">
            <button onClick={onSelectAll} className="text-[11px] text-emerald-300 hover:text-emerald-200 underline">Select all</button>
            <button onClick={onSelectNone} className="text-[11px] text-gray-400 hover:text-white underline">Select none</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!loading && rows.length === 0 && (
            <p className="text-xs text-gray-500 italic text-center py-8">No spells match these filters.</p>
          )}
          {rows.map(s => {
            const checked = selected.has(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                  checked ? 'bg-emerald-900/30 border border-emerald-700/40' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(s.id)}
                  className="w-4 h-4 accent-emerald-400 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{s.name}</div>
                  <div className="text-[11px] text-gray-400">
                    {LEVEL_LABELS[s.level] || `lvl ${s.level}`}
                    {s.school ? ` · ${s.school}` : ''}
                    {Array.isArray(s.allowed_classes) && s.allowed_classes.length > 0 ? ` · ${s.allowed_classes.join(', ')}` : ''}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded">Cancel</button>
          <button
            onClick={onExport}
            disabled={selected.size === 0 || submitting}
            className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded"
          >
            {submitting ? 'Exporting…' : `Export ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ items, onClose, onEditName, onApply, onSkip, onDelete, onApplyAll }) {
  const pending = items.filter(x => x.status === 'pending').length;
  const applied = items.filter(x => x.status === 'applied').length;
  const skipped = items.filter(x => x.status === 'skipped').length;
  const deleted = items.filter(x => x.status === 'deleted').length;
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-dnd-gold">Review spell names</h3>
            <p className="text-[11px] text-gray-400">
              These names look like OCR artefacts. Edit a suggestion if needed, then Apply, Skip, or Delete the row.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm px-2">✕</button>
        </div>
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between text-xs text-gray-300">
          <div>
            <span className="text-amber-300">{pending}</span> pending ·{' '}
            <span className="text-green-400">{applied}</span> applied ·{' '}
            <span className="text-gray-400">{skipped}</span> skipped
            {deleted > 0 && <> ·{' '}<span className="text-red-400">{deleted}</span> deleted</>}
          </div>
          <button
            onClick={onApplyAll}
            disabled={pending === 0}
            className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1 rounded"
          >
            Apply all ({pending})
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-8">
              No broken names detected — every spell matches the canonical 5e list.
            </p>
          )}
          {items.map((it, idx) => {
            const statusBadge = {
              applied: it.refreshed
                ? <span className="text-[10px] bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded" title="Renamed and details refreshed from open5e">applied + open5e</span>
                : <span className="text-[10px] bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded" title="Renamed (open5e had no entry, fields preserved)">applied</span>,
              skipped: <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">skipped</span>,
              deleted: <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded">deleted</span>,
              error: <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded">error</span>,
              pending: it.conflict
                ? <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded" title="A spell with the suggested name already exists">conflict</span>
                : null,
            }[it.status] || null;
            return (
              <div key={it.id} className={`bg-gray-800 border rounded-lg p-2 ${it.status === 'pending' ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[11px] text-gray-400 flex items-center gap-2">
                    <span className="font-mono text-red-300">{it.currentName}</span>
                    <span>→</span>
                    <span className="text-[10px] text-gray-500">{it.reasons?.join(', ')}</span>
                  </div>
                  {statusBadge}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={it.editedName}
                    disabled={it.status !== 'pending'}
                    onChange={(e) => onEditName(idx, e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  />
                  <button
                    onClick={() => onApply(idx)}
                    disabled={it.status !== 'pending' || it.conflict || !it.editedName.trim()}
                    className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white px-2 py-1 rounded"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => onSkip(idx)}
                    disabled={it.status !== 'pending'}
                    className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 px-2 py-1 rounded"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => onDelete(idx)}
                    disabled={it.status !== 'pending'}
                    className="text-xs bg-red-900/50 hover:bg-red-800/60 disabled:opacity-40 border border-red-700 text-red-300 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
                {it.error && <div className="mt-1 text-[10px] text-red-400">{it.error}</div>}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-gray-700 flex justify-end">
          <button onClick={onClose} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
const SAVE_ABILITIES = ['STR','DEX','CON','INT','WIS','CHA'];

function SpellEditor({ initial, ruleset = '2014', onCancel, onSave }) {
  const CLASSES = useAllClasses();
  const [s, setS] = useState({
    ...initial,
    damage_entries: Array.isArray(initial.damage_entries) ? initial.damage_entries : [],
    allowed_classes: Array.isArray(initial.allowed_classes) ? initial.allowed_classes : [],
  });
  const [refreshState, setRefreshState] = useState(null); // 'loading' | 'ok' | 'missing' | 'error'
  const [refreshErr, setRefreshErr] = useState('');
  function field(k, v) { setS(prev => ({ ...prev, [k]: v })); }
  async function handleRefreshFromOpen5e() {
    setRefreshState('loading');
    setRefreshErr('');
    try {
      const res = await fetch(`/api/spell-library/${initial.id}/refresh-from-open5e`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleset }),
      });
      const data = await res.json();
      if (res.status === 404) {
        setRefreshState('missing');
        setRefreshErr(data.error || 'Not in open5e');
        return;
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setS({
        ...data,
        damage_entries: Array.isArray(data.damage_entries) ? data.damage_entries : [],
        allowed_classes: Array.isArray(data.allowed_classes) ? data.allowed_classes : [],
      });
      setRefreshState('ok');
    } catch (err) {
      setRefreshState('error');
      setRefreshErr(err.message);
    }
  }
  function dmgField(i, k, v) {
    setS(prev => ({ ...prev, damage_entries: prev.damage_entries.map((d, idx) => idx === i ? { ...d, [k]: v } : d) }));
  }
  function addDmg() { setS(prev => ({ ...prev, damage_entries: [...prev.damage_entries, { damage: '', damage_type: '' }] })); }
  function removeDmg(i) { setS(prev => ({ ...prev, damage_entries: prev.damage_entries.filter((_, idx) => idx !== i) })); }
  const inp = 'w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white';
  return (
    <div className="mt-2 pt-2 border-t border-gray-700 space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <input className={inp} placeholder="Name" value={s.name} onChange={e => field('name', e.target.value)} />
        <select className={inp} value={s.level} onChange={e => field('level', parseInt(e.target.value) || 0)}>
          {LEVEL_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
        </select>
        <select className={inp} value={s.school || ''} onChange={e => field('school', e.target.value)}>
          <option value="">School —</option>
          {SCHOOLS.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={inp} value={s.type || 'utility'} onChange={e => field('type', e.target.value)}>
          <option value="utility">Utility</option>
          <option value="combat">Combat</option>
        </select>
        <input className={inp} placeholder="Casting Time" value={s.casting_time || ''} onChange={e => field('casting_time', e.target.value)} />
        <input className={inp} placeholder="Range/Area" value={s.range_area || ''} onChange={e => field('range_area', e.target.value)} />
        <input className={inp} placeholder="Duration" value={s.duration || ''} onChange={e => field('duration', e.target.value)} />
        <div className="flex gap-1">
          <select className={inp} value={s.attack_save || ''} onChange={e => field('attack_save', e.target.value)}>
            <option value="">Attack/Save —</option>
            <option value="melee">Melee</option>
            <option value="ranged">Ranged</option>
            <option value="save">Save</option>
          </select>
          {s.attack_save === 'save' && (
            <select className={inp} value={s.save_ability || ''} onChange={e => field('save_ability', e.target.value)}>
              <option value="">—</option>
              {SAVE_ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-400">Components:</span>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!s.comp_v} onChange={e => field('comp_v', e.target.checked)} /> V</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!s.comp_s} onChange={e => field('comp_s', e.target.checked)} /> S</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!s.comp_m} onChange={e => field('comp_m', e.target.checked)} /> M</label>
        {s.comp_m && <input className={`${inp} flex-1`} placeholder="Material component" value={s.comp_m_text || ''} onChange={e => field('comp_m_text', e.target.value)} />}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Damage entries</span>
          <button onClick={addDmg} className="text-xs text-indigo-400">+ Add</button>
        </div>
        {s.damage_entries.map((d, i) => (
          <div key={i} className="flex gap-1 items-center">
            <input className={`${inp} w-20`} placeholder="2d6" value={d.damage} onChange={e => dmgField(i, 'damage', e.target.value)} />
            <input className={`${inp} flex-1`} placeholder="Fire" value={d.damage_type} onChange={e => dmgField(i, 'damage_type', e.target.value)} />
            <button onClick={() => removeDmg(i)} className="text-xs text-red-400 px-1">✕</button>
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs text-gray-400 mb-1">Allowed classes</div>
        <div className="flex flex-wrap gap-2">
          {CLASSES.map(c => {
            const checked = s.allowed_classes.includes(c);
            return (
              <label key={c} className="flex items-center gap-1 text-[11px] text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setS(prev => ({
                      ...prev,
                      allowed_classes: e.target.checked
                        ? Array.from(new Set([...prev.allowed_classes, c]))
                        : prev.allowed_classes.filter(x => x !== c),
                    }));
                  }}
                />
                {c}
              </label>
            );
          })}
        </div>
      </div>
      <textarea className={`${inp} resize-none`} rows={2} placeholder="Extra Effects" value={s.extra_effects || ''} onChange={e => field('extra_effects', e.target.value)} />
      <textarea className={`${inp} resize-none`} rows={4} placeholder="Description" value={s.description || ''} onChange={e => field('description', e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {initial.id && (
          <>
            <button
              type="button"
              onClick={handleRefreshFromOpen5e}
              disabled={refreshState === 'loading'}
              className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white py-1 px-2 rounded text-xs"
              title="Overwrite body fields with canonical data from open5e (SRD)"
            >
              {refreshState === 'loading' ? 'Fetching…' : 'Refresh from open5e'}
            </button>
            <span className="text-[10px] text-gray-500">SRD {ruleset}</span>
            {refreshState === 'ok' && <span className="text-[10px] text-green-400">Refreshed.</span>}
            {refreshState === 'missing' && <span className="text-[10px] text-amber-400" title={refreshErr}>Not in open5e</span>}
            {refreshState === 'error' && <span className="text-[10px] text-red-400" title={refreshErr}>Error: {refreshErr}</span>}
          </>
        )}
        <div className="flex-1" />
        <button onClick={() => onSave(s)} className="bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-1 px-3 rounded text-xs font-semibold">Save</button>
        <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-xs">Cancel</button>
      </div>
    </div>
  );
}

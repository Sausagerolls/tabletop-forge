// Bringing a creature across from the self-hosted 5etools mirror.
//
// Extracted from CreatureLibrary's import modal so the GM's tablet can do the
// same thing without a second copy of it. There are four network steps and two
// of them are allowed to fail quietly, which is exactly the kind of sequence
// that drifts when it exists twice: one copy learns that a missing portrait is
// survivable and the other does not.
//
// Creation goes through the ordinary POST /api/creatures, the same path the
// manual form uses, so an imported creature is not a second class of thing.

// Artwork comes back as paths relative to the mirror and is pulled through the
// backend proxy: the mirror sends no CORS headers, so the browser cannot read
// an image directly even to draw it, let alone re-upload it as a file.
//
// The stored path already has its spaces percent-encoded, and encoding it again
// is correct — Express decodes exactly one layer before handing it back.
export function compendiumImgUrl(path) {
  return path ? `/api/compendium/img?path=${encodeURIComponent(path)}` : null;
}

/** Is the mirror reachable, and where is it? */
export async function compendiumStatus() {
  const r = await fetch('/api/compendium/status');
  return r.ok ? r.json() : { ok: false, error: `HTTP ${r.status}` };
}

/** Search the mirror. Returns index rows — name, source, CR — not stat blocks. */
export async function searchCompendium(query, limit = 40) {
  const r = await fetch(`/api/compendium/creatures?q=${encodeURIComponent(query)}&limit=${limit}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `Search failed (${r.status})`);
  return Array.isArray(d.results) ? d.results : [];
}

/**
 * The converted stat block for one index row, before anything is written.
 *
 * Fetched separately from the import so a caller can show the GM what they are
 * about to add — the mirror holds several versions of most creatures, and a
 * 2014 Goblin Boss differs from the 2024 one in type, AC and wording. Picking
 * the wrong source is the easy mistake here.
 */
export async function previewCompendiumCreature(row) {
  const r = await fetch(
    `/api/compendium/creatures/${encodeURIComponent(row.source)}/${encodeURIComponent(row.name)}`
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `Load failed (${r.status})`);
  return d;   // { creature, images, approximated, source }
}

/**
 * Create the creature, with its artwork when the mirror has any.
 *
 * `onStep` is called with a short label so a caller can say what is happening;
 * the art steps are slow enough on a phone to be worth narrating.
 *
 * A missing or unreachable picture must never cost the import: the stat block
 * is the thing being asked for, and a creature with no portrait is a working
 * creature.
 */
export async function importCompendiumCreature(preview, { onStep = () => {} } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(preview.creature)) {
    if (v === null || v === undefined) continue;
    fd.append(k, (typeof v === 'object') ? JSON.stringify(v) : String(v));
  }

  // The mirror's token art is already round, already cropped and already sized
  // for a map — exactly what this app's token face wants — so it rides along in
  // the same create call and goes through the ordinary multer handling.
  if (preview.images?.token) {
    onStep('token art…');
    try {
      const ir = await fetch(compendiumImgUrl(preview.images.token));
      if (ir.ok) fd.append('image', await ir.blob(), 'token.webp');
    } catch { /* the stat block still imports */ }
  }

  onStep('creating…');
  const r = await fetch('/api/creatures', { method: 'POST', body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || `Import failed (${r.status})`);

  // The full illustration is a separate slot — it is what "show image to
  // players" pushes — and a separate endpoint, so it follows the create.
  if (preview.images?.art && d.id) {
    onStep('artwork…');
    try {
      const ar = await fetch(compendiumImgUrl(preview.images.art));
      if (ar.ok) {
        const afd = new FormData();
        afd.append('image', await ar.blob(), 'art.webp');
        await fetch(`/api/creatures/${d.id}/display-image`, { method: 'PUT', body: afd });
      }
    } catch { /* the creature is saved; the picture is a bonus */ }
  }
  return d;
}

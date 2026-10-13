const express = require('express');
const compendium = require('../compendium');

// /api/compendium — a read-only window onto the self-hosted 5etools mirror.
//
// Read-only on purpose. Nothing here writes to the database: the search and
// convert steps live on the server (the mirror sends no CORS headers, and the
// conversion should exist once), but CREATING the creature is left to the
// ordinary POST /api/creatures path, so an imported creature goes through the
// same validation, the same broadcast and the same image handling as one typed
// in by hand.
//
// Shaped for more kinds than creatures. Items and spells are the same three
// steps against different files on the same mirror, so they slot in beside
// /creatures rather than needing anything here to change.
module.exports = function makeCompendiumRouter() {
  const router = express.Router();

  // Where the mirror is, and whether it is actually answering. The client shows
  // this when a search fails, so "no results" and "your server is down" are
  // never the same message to a GM.
  router.get('/status', async (_req, res) => {
    const url = compendium.baseUrl();
    try {
      await compendium.getJson('/data/bestiary/index.json');
      res.json({ ok: true, url, kinds: ['creatures'] });
    } catch (err) {
      res.json({ ok: false, url, kinds: ['creatures'], error: err.message });
    }
  });

  // GET /api/compendium/creatures?q=goblin
  //
  // The first call builds the name index, which reads every bestiary file and
  // can take a few seconds. Every call after that is served from memory.
  router.get('/creatures', async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
      const results = await compendium.searchCreatures(req.query.q, limit);
      res.json({ results });
    } catch (err) {
      res.status(502).json({ error: `Compendium unreachable at ${compendium.baseUrl()} — ${err.message}` });
    }
  });

  // GET /api/compendium/creatures/:source/:name
  //
  // The converted stat block, ready to be posted to /api/creatures. Returned
  // rather than inserted so the client can show the GM what they are about to
  // add, and so the creature is created through the one path that already
  // exists for it.
  router.get('/creatures/:source/:name', async (req, res) => {
    try {
      const found = await compendium.getMonster(
        decodeURIComponent(req.params.name),
        decodeURIComponent(req.params.source)
      );
      if (!found) return res.status(404).json({ error: 'Not found in the compendium' });
      // Artwork paths, not the artwork itself. The browser pulls these through
      // the proxy below, so a full-size illustration never passes through this
      // process on its way to one client.
      let images = { token: null, art: null };
      try {
        images = await compendium.artPaths(found.monster, found.indexRow);
      } catch (err) {
        // No picture is a fine outcome; a failed import is not.
        console.error('compendium art lookup:', err.message);
      }
      res.json({
        creature: compendium.monsterToCreature(found.monster),
        images,
        // True when the entry is a variant defined by difference from another
        // and carries modifications this importer does not apply. The client
        // warns rather than hiding it — a half-applied stat block that looks
        // complete is the worst outcome here.
        approximated: found.approximated,
        source: found.monster.source || req.params.source,
      });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  // GET /api/compendium/img?path=img/bestiary/tokens/MM/Goblin.webp
  //
  // The mirror serves no CORS headers on images either, so the browser cannot
  // read one directly even to draw it — let alone re-upload it as a file. This
  // streams it through.
  //
  // The path is caller-supplied, so it is checked rather than trusted: it must
  // sit under img/, may not climb out with "..", and may not carry a scheme.
  // Without that this is an open proxy for anything the server can reach.
  router.get('/img', async (req, res) => {
    const path = String(req.query.path || '');
    if (!/^img\/[A-Za-z0-9._~%\-\/()' ]+$/.test(path) || path.includes('..')) {
      return res.status(400).json({ error: 'Bad image path' });
    }
    try {
      const upstream = await fetch(`${compendium.baseUrl()}/${path}`);
      if (!upstream.ok) return res.status(upstream.status).end();
      res.set('Content-Type', upstream.headers.get('content-type') || 'image/webp');
      // The mirror's files are immutable in practice — a picture at a given
      // path is that picture forever — so let the browser keep it.
      res.set('Cache-Control', 'public, max-age=86400');
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  return router;
};

// /api/transfer — carry a session between installs.
//
// Export from the server the campaign lives on, import into the desktop app on the
// laptop that is going away. One .ttfpack file (a zip: manifest.json, rows.json,
// uploads/) and no command line at either end.
//
// Auth is the same as the rest of /api/* — a role=dm query parameter — with one
// addition: export asks for the session's GM password, because a pack contains
// every character sheet, every GM secret and every map in the campaign. That is a
// higher bar than reading one creature, and the password is already how the GM
// proves who they are when joining.

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AdmZip = require('adm-zip');
const multer = require('multer');
const db = require('../db');
const { buildPack, applyPack, applyFiles, PACK_KIND } = require('../sessionPack');

// Where a server keeps the rows it is about to overwrite. Inside uploads/ because
// that is the directory guaranteed to be on a persisted volume — a sibling would
// vanish on the next image rebuild — and because the existing static mount then
// makes each backup downloadable without a new route.
const BACKUP_DIR_NAME = '_backups';

// Packs are big — a real campaign is a couple of hundred megabytes of maps — so
// uploads go to disk, never into memory.
const upload = multer({
  dest: os.tmpdir(),
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `ttfpack-${crypto.randomBytes(6).toString('hex')}.zip`),
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
});

module.exports = function makeTransferRouter(uploadsDir) {
  const router = express.Router();

  const isDesktop = !!(process.env.VTT_DATA_DIR && process.env.VTT_DATA_DIR.trim());

  // GET /api/transfer/where — which end of the wire is this?
  //
  // The import control belongs on the desktop app's landing screen and nowhere
  // else; the export button belongs on a server the campaign actually lives on.
  // Both builds run the same frontend, so the frontend has to ask.
  router.get('/where', (req, res) => {
    res.json({ desktop: isDesktop, canExport: true, canImport: true });
  });

  // GET /api/transfer/sessions?role=dm — what there is to export.
  router.get('/sessions', async (req, res) => {
    if (String(req.query.role || '').toLowerCase() !== 'dm') return res.status(403).json({ error: 'GM only' });
    try {
      const r = await db.query(`
        SELECT s.id, s.name, s.session_code, s.created_at,
               (SELECT count(*)::int FROM maps m WHERE m.session_id = s.id) AS maps,
               (SELECT count(*)::int FROM session_tokens t WHERE t.session_id = s.id) AS tokens
          FROM sessions s ORDER BY s.id DESC`);
      res.json(r.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/transfer/export  { code, dmPassword }
  //
  // A POST rather than a GET because it carries a password and because it is not
  // a cheap idempotent read — it builds a file. Responds with the .ttfpack as a
  // download.
  router.post('/export', async (req, res) => {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const password = String(req.body?.dmPassword || '');
    if (!code) return res.status(400).json({ error: 'Which session?' });

    let tmpFile = null;
    try {
      const sess = (await db.query(
        'SELECT id, name, session_code, dm_password_hash FROM sessions WHERE session_code = $1', [code])).rows[0];
      if (!sess) return res.status(404).json({ error: 'No session with that code' });

      // A pack is now the WHOLE install, so the key has to open the whole install:
      // the server's master password, or the GM password of the session being
      // exported from. Not "any session's password" — a guest GM with one session's
      // password should not be able to walk off with every other campaign on the
      // server.
      const master = process.env.DM_MASTER_PASSWORD || '';
      const ok = (master && password === master)
        || (sess.dm_password_hash && bcrypt.compareSync(password, sess.dm_password_hash));
      if (!ok) return res.status(401).json({ error: 'Wrong GM password for that session' });

      const { manifest, rows } = await buildPack(db, code);

      const zip = new AdmZip();
      zip.addFile('rows.json', Buffer.from(JSON.stringify(rows)));

      // The ENTIRE uploads tree, not the files the rows happen to mention.
      //
      // Matching paths out of columns missed things — art referenced only from
      // inside JSONB, sound sets, anything a future feature stores a path for — and
      // every miss is a blank square on a map hundreds of miles from the server.
      // Half a gigabyte copied wholesale is the cheaper mistake.
      let added = 0;
      if (fs.existsSync(uploadsDir)) {
        // Everything except the pre-import backups. They live under uploads/ so
        // that they land in the persisted volume and can be downloaded, but a
        // pack that contained previous packs would double in size every time one
        // was taken.
        // The filter is handed the path INSIDE the zip — `uploads/_backups/x` —
        // not the name relative to uploadsDir, so a startsWith on the directory
        // name alone silently matched nothing and the backups went in anyway.
        zip.addLocalFolder(uploadsDir, 'uploads',
          (entry) => !new RegExp(`(^|[\\/])${BACKUP_DIR_NAME}([\\/]|$)`).test(String(entry)));
        added = zip.getEntries().filter((e) => !e.isDirectory && e.entryName.startsWith('uploads/')).length;
      }
      manifest.files = { included: added, whole: true };
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

      // Written to disk and streamed, rather than held as one buffer: a campaign
      // pack is hundreds of megabytes and this process is also running the game.
      tmpFile = path.join(os.tmpdir(), `ttfpack-out-${crypto.randomBytes(6).toString('hex')}.zip`);
      zip.writeZip(tmpFile);
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `tabletopforge-everything-${stamp}.ttfpack`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.setHeader('X-Pack-Rows', String(Object.values(manifest.counts).reduce((a, b) => a + b, 0)));
      res.setHeader('X-Pack-Files', String(added));
      res.setHeader('X-Pack-Tables', String(Object.keys(manifest.counts).length));
      res.setHeader('X-Pack-Sessions', String((manifest.sessions || []).length));
      const stream = fs.createReadStream(tmpFile);
      stream.pipe(res);
      stream.on('close', () => { try { fs.rmSync(tmpFile); } catch { /* tmp will be swept */ } });
    } catch (err) {
      if (tmpFile) { try { fs.rmSync(tmpFile); } catch { /* ignore */ } }
      console.error('transfer export error:', err);
      if (!res.headersSent) res.status(err.status || 500).json({ error: err.message });
    }
  });

  // POST /api/transfer/import   (multipart: pack=<file.ttfpack>)
  //
  // Both directions now: out to the laptop before a holiday, and back again after.
  // The two ends are not the same risk, so they are not gated the same way.
  //
  //  * On the DESKTOP app, the pack is the credential — whoever holds the file
  //    already has every row in it, and the machine exists to run what it is given.
  //
  //  * On a SERVER, an import overwrites the campaign everyone else plays on. So it
  //    wants the GM password AND an explicit confirmation, and it takes a backup of
  //    the rows it is about to write over first.
  //
  // What an import does NOT do, either way, is delete. Rows are upserted, so a
  // creature deleted on the laptop still exists on the server afterwards. This is a
  // merge where the incoming side wins, not a replacement — which is the safe
  // behaviour to default to, and the one worth saying out loud in the UI.
  router.post('/import', upload.single('pack'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No pack uploaded' });

    if (!isDesktop) {
      const password = String(req.body?.dmPassword || '');
      const confirm = String(req.body?.confirm || '');
      const fail = (code, error) => {
        try { fs.rmSync(req.file.path); } catch { /* ignore */ }
        return res.status(code).json({ error });
      };
      if (confirm !== 'overwrite') {
        return fail(400, 'Importing into a server overwrites its data. Type "overwrite" to confirm.');
      }
      const master = process.env.DM_MASTER_PASSWORD || '';
      let ok = !!master && password === master;
      if (!ok) {
        // Any session's GM password. On the way IN the pack is whole-server, so
        // there is no single session to check against — and anyone holding a GM
        // password for this server can already change everything through the UI.
        const hashes = (await db.query(
          `SELECT dm_password_hash FROM sessions WHERE COALESCE(dm_password_hash,'') <> ''`)).rows;
        ok = hashes.some((r) => bcrypt.compareSync(password, r.dm_password_hash));
      }
      if (!ok) return fail(401, 'Wrong GM password.');
    }

    const workDir = path.join(os.tmpdir(), `ttfpack-in-${crypto.randomBytes(6).toString('hex')}`);
    try {
      let zip;
      try {
        zip = new AdmZip(req.file.path);
        zip.extractAllTo(workDir, true);
      } catch (err) {
        // Anything that is not a zip lands here — a truncated upload, or the wrong
        // file picked entirely. "Invalid or unsupported zip format" as a 500 reads
        // as a broken server rather than a wrong file.
        return res.status(400).json({
          error: 'That file could not be opened as a session pack. If the download was interrupted, export it again.',
        });
      }
      const manifestPath = path.join(workDir, 'manifest.json');
      const rowsPath = path.join(workDir, 'rows.json');
      if (!fs.existsSync(manifestPath) || !fs.existsSync(rowsPath)) {
        return res.status(400).json({ error: 'That file is not a session pack (no manifest.json / rows.json inside).' });
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.kind !== PACK_KIND) {
        return res.status(400).json({ error: 'That file is not a TableTop Forge session pack.' });
      }
      const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));

      // The rows about to be written over, kept.
      //
      // Only the rows: uploads are added to and never deleted by an import, so
      // there is nothing to lose there. A rows-only backup is a few megabytes,
      // which is cheap enough to take every single time rather than asking.
      let backup = null;
      if (!isDesktop) {
        try {
          const before = await buildPack(db, null);
          const dir = path.join(uploadsDir, BACKUP_DIR_NAME);
          fs.mkdirSync(dir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const file = `before-import-${stamp}.ttfpack`;
          const bz = new AdmZip();
          bz.addFile('rows.json', Buffer.from(JSON.stringify(before.rows)));
          bz.addFile('manifest.json', Buffer.from(JSON.stringify({
            ...before.manifest,
            note: 'Rows as they were immediately before an import. Uploads are not included — an import only adds files.',
          }, null, 2)));
          bz.writeZip(path.join(dir, file));
          // Served by the existing /uploads static mount, so it can be downloaded
          // without any new route.
          backup = { file, url: `/uploads/${BACKUP_DIR_NAME}/${file}`,
                     rows: Object.values(before.manifest.counts).reduce((a, b) => a + b, 0) };
        } catch (err) {
          // Worth refusing over: an import with no way back is the one thing this
          // endpoint must not do quietly.
          console.error('transfer backup failed:', err);
          return res.status(500).json({ error: `Could not back up the current data, so nothing was imported: ${err.message}` });
        }
      }

      const result = await applyPack(db, manifest, rows);
      const copied = applyFiles(path.join(workDir, 'uploads'), uploadsDir);

      res.json({
        backup,
        session: manifest.session,
        sessions: manifest.sessions || [],
        scope: manifest.scope || 'session',
        packedAt: manifest.packedAt,
        written: result.written,
        perTable: result.perTable,
        files: copied,
        droppedColumns: result.droppedColumns,
        passes: result.passes,
        failures: result.failures.slice(0, 50),
        failureCount: result.failures.length,
      });
    } catch (err) {
      console.error('transfer import error:', err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    } finally {
      try { fs.rmSync(req.file.path); } catch { /* ignore */ }
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  return router;
};

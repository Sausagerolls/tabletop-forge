import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// World Dungeon Crawler Sheet, served at /crawler/.
// Source of truth is the World Dungeon setting repo (app/); copy changes in
// with its tools/sync_sheet_to_ttf.sh. Built by the frontend Dockerfile after
// the main app, reading Tabletop Forge's class, species and feat data from
// ../src at build time.
export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react()],
  resolve: { alias: { '@ttf': path.resolve(__dirname, '../src') } },
  define: { 'import.meta.env.VITE_SAME_ORIGIN': JSON.stringify('1') },
  build: { outDir: path.resolve(__dirname, '../dist/crawler'), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});

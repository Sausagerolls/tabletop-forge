import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/uploads': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    // TEMPORARY — sourcemaps so a runtime error names the original file, line
    // and variable instead of a minified letter. Remove once the character
    // builder fault is found.
    sourcemap: true,
  },
});

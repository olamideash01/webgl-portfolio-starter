import { defineConfig } from 'vite';

export default defineConfig({
  // Keep the preview portable by default; GitHub Pages builds set a project path.
  base: process.env.VITE_BASE_PATH || './',
});

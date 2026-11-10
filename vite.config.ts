import path from 'path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const visionVersion = JSON.parse(readFileSync('node_modules/@mediapipe/tasks-vision/package.json', 'utf8')).version;

export default defineConfig({
  define: { __VISION_VERSION__: JSON.stringify(visionVersion) },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The game is served from yourdomain.com/game/ on Firebase Hosting,
// so every asset URL and the router basename are rooted at /game/.
export default defineConfig({
  base: '/game/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5173 },
  build: { target: 'es2019', chunkSizeWarningLimit: 1200 },
});

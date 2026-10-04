import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@party/codenames': path.resolve(__dirname, '../../packages/games/codenames/src/index.ts'),
      '@party/rock-paper-scissors': path.resolve(__dirname, '../../packages/games/rock-paper-scissors/src/index.ts'),
      '@party/number-grid': path.resolve(__dirname, '../../packages/games/number-grid/src/index.ts'),
      '@party/werewolf': path.resolve(__dirname, '../../packages/games/werewolf/src/index.ts'),
      '@party/salem': path.resolve(__dirname, '../../packages/games/salem/src/index.ts'),
      '@party/spyfall': path.resolve(__dirname, '../../packages/games/spyfall/src/index.ts'),
      '@party/jigsaw': path.resolve(__dirname, '../../packages/games/jigsaw/src/index.ts'),
    },
  },
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0)
    port: 3000,
    proxy: {
      // 127.0.0.1 rather than localhost: Node resolves the name to both ::1 and
      // 127.0.0.1 and connect() fails on the pair with ENOBUFS, which hangs every
      // proxied request instead of erroring.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
});

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
    },
  },
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0)
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});

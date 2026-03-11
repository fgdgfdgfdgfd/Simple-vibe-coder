import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  publicDir: '../assets',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: '../dist'
  }
});

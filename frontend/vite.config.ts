import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 4270,
    host: '0.0.0.0',
  },
  build: {
    chunkSizeWarningLimit: 32 * 1024 * 1024,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(api|db)\//],
      },
      includeAssets: ['**/*.{js,css,html,ico,png,svg,ttf}'],
      manifest: {
        name: 'Moneeey',
        short_name: 'Moneeey',
        description: 'Moneeey - Personal Finance Software',
        id: '/',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '64x64',
            type: 'image/svg',
            purpose: 'any',
          },
          {
            src: '/favicon.144x144.svg',
            sizes: '144x144',
            type: 'image/svg',
            purpose: 'any',
          },
          {
            src: '/favicon.192x192.svg',
            sizes: '192x192',
            type: 'image/svg',
            purpose: 'any',
          },
          {
            src: '/favicon.512x512.svg',
            sizes: '512x512',
            type: 'image/svg',
            purpose: 'any',
          },
        ],
        background_color: '#696969',
        theme_color: '#696969',
      },
    }),
    react(),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        additionalData: '@root-entry-name: default;',
      },
    },
  },
});

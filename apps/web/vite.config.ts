import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'ParcelGuard',
        short_name: 'ParcelGuard',
        description: 'Multi-camera security system for monitoring parcel theft',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache app shell and static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache API responses for events list (stale-while-revalidate)
            urlPattern: /\/api\/events(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'events-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache event thumbnails (cache first)
            urlPattern: /\/api\/events\/[^/]+\/thumbnail$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'thumbnails-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache camera list (stale-while-revalidate)
            urlPattern: /\/api\/cameras$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cameras-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache settings (stale-while-revalidate)
            urlPattern: /\/api\/settings$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'settings-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Network-only for auth endpoints (never cache)
            urlPattern: /\/api\/auth\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

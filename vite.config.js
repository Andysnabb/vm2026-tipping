import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy target for development: read from VITE_API_BASE or fallback to the last known Apps Script URL
const API_TARGET = process.env.VITE_API_BASE || 'https://script.google.com/macros/s/AKfycbzNahiIV0vwNCgoMDRU1Qexs1JwIqgj85tZsAaRpS8GFvK8pIPYnYmBB-I5j94kKzzi/exec';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // dev plugin to short-circuit OPTIONS preflight for /api
    {
      name: 'dev-api-options-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          try {
            if (req.method === 'OPTIONS' && req.url && req.url.startsWith('/api')) {
              res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              });
              res.end();
              return;
            }
          } catch (err) {
            // ignore and continue
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})

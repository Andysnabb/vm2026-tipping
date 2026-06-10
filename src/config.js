// Use the Vite dev proxy in development. The proxy forwards /api to your Apps Script URL.
// API_BASE switches automatically: in development use the local proxy (/api), in production use the deployed exec URL.
export const API_BASE = import.meta.env.DEV
  ? '/api'
    : (import.meta.env.VITE_API_BASE || 'https://script.google.com/macros/s/AKfycbzNahiIV0vwNCgoMDRU1Qexs1JwIqgj85tZsAaRpS8GFvK8pIPYnYmBB-I5j94kKzzi/exec');

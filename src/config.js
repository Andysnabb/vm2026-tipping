// Use the Vite dev proxy in development. The proxy forwards /api to your Apps Script URL.
// API_BASE switches automatically: in development use the local proxy (/api), in production use the deployed exec URL.
export const API_BASE = import.meta.env.DEV
  ? '/api'
    : (import.meta.env.VITE_API_BASE || 'https://script.google.com/macros/s/AKfycbyVSPhkCYuF2tdhG9Q5efrYnf0Mm40BaSOw5DVaHd7j97XAaREfCtSHJ7SmwoL6Ht7h/exec');

// src/api/index.js
// Single source of truth for the backend URL.
// Override at build time with:  VITE_API_URL=https://your-server.com npm run build
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

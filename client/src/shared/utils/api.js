// Base URL for API calls.
// In development, Vite proxy handles /api/* → localhost backend.
// In production, set VITE_API_URL to your deployed backend (e.g. https://api.ecoloop.in)
const BASE = import.meta.env.VITE_API_URL || '';

export const apiUrl = (path) => `${BASE}${path}`;

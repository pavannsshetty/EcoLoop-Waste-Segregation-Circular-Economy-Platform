const raw = import.meta.env.VITE_API_URL || "";
export const API = raw.replace(/\/+$/, "");

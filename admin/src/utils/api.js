export const API = import.meta.env.VITE_API_URL || '';

export const apiUrl = (path) => `${API}${path}`;

export const getToken = () => localStorage.getItem('token');

export const authHeaders = (headers = {}) => ({
  ...headers,
  Authorization: `Bearer ${getToken()}`,
});

export const fetchWithAuth = (url, options = {}) => {
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${getToken()}`,
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  return fetch(apiUrl(url), { ...options, headers });
};

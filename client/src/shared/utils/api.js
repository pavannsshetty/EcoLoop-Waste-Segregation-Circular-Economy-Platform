import { API } from '../constants';

export const apiUrl = (path) => `${API}${path}`;

const getToken = () => localStorage.getItem('token');

export const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
});

export const fetchWithAuth = (url, options = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  return fetch(apiUrl(url), { ...options, headers });
};

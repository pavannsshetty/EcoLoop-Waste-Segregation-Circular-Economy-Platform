import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { API } from '../constants';

const UserContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  updateUser: () => {},
  clearUser: () => {},
});

const parseStoredUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
    return null;
  } catch (err) {
    console.warn('Invalid stored user data in localStorage:', err);
    return null;
  }
};

export const useUser = () => useContext(UserContext);
export { parseStoredUser };

export const UserProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    const stored = parseStoredUser();
    const token  = localStorage.getItem('token');
    return stored && token ? stored : null;
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('token');
    const storedUser = parseStoredUser();
    if (token && storedUser) return false;
    if (token && !storedUser) return true;
    return false;
  });

  const refreshUser = useCallback(async (options = {}) => {
    const { background = false } = options;
    const token = localStorage.getItem('token');
    const storedUser = parseStoredUser();
    if (!token) {
      console.debug('refreshUser: no token found');
      setUser(null);
      setLoading(false);
      return;
    }

    if (!background) setLoading(true);

    const role = storedUser?.role?.toString().toLowerCase().replace(/[_\s]+/g, '');
    let url;
    if (role === 'citizen') url = `${API}/api/citizen/profile`;
    else if (role === 'collector') url = `${API}/api/collector/profile`;
    else url = `${API}/api/user/profile`;

    console.debug('refreshUser', { background, tokenExists: !!token, storedUserRole: storedUser?.role, role, url });

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } else if (res.status === 401) {
        console.warn('refreshUser: token invalid or expired');
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        console.warn('refreshUser: unexpected status', res.status, await res.text());
      }
    } catch (err) {
      console.error('Refresh User Error:', err);
      if (!background) {
        const stored = parseStoredUser();
        if (stored) setUser(stored);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const token = localStorage.getItem('token');
    if (token) {
      refreshUser({ background: true });
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};
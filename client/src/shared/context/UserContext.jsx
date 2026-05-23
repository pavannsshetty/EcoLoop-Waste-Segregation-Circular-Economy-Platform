import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API } from '../constants';

const UserContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  updateUser: () => {},
  clearUser: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setUser(null); setLoading(false); return; }

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const role = storedUser.role;
      const r = role?.toLowerCase().replace('_', '');
      let url;
      if (r === 'citizen') url = `${API}/api/citizen/profile`;
      else if (r === 'collector') url = `${API}/api/collector/profile`;
      else if (r === 'greenchampion') url = `${API}/api/citizen/profile`; 
      else url = `${API}/api/user/profile`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } else {
        if (res.status === 401 || res.status === 404) {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    } catch (err) {
      console.error('Refresh User Error:', err);
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) refreshUser();
    else setLoading(false);
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

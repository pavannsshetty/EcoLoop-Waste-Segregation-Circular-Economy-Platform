/* eslint-disable react-refresh/only-export-components -- context module exports hook + provider */
import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect } from 'react';

const STORAGE_KEY = 'theme';
const LEGACY_KEY = 'ecoloop-dark';

const ThemeContext = createContext({
  dark: false,
  theme: 'light',
  toggleDark: () => {},
  setDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function readInitialDark() {
  if (typeof window === 'undefined') return false;
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'dark') return true;
    if (t === 'light') return false;
    if (localStorage.getItem(LEGACY_KEY) === 'true') {
      localStorage.setItem(STORAGE_KEY, 'dark');
      localStorage.removeItem(LEGACY_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function applyDocumentTheme(isDark) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
}

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(readInitialDark);

  useLayoutEffect(() => {
    applyDocumentTheme(dark);
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
      if (localStorage.getItem(LEGACY_KEY) != null) localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }, [dark]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
        setDark(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleDark = useCallback(() => setDark((d) => !d), []);
  const setDarkMode = useCallback((next) => setDark(!!next), []);

  return (
    <ThemeContext.Provider value={{ dark, theme: dark ? 'dark' : 'light', toggleDark, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

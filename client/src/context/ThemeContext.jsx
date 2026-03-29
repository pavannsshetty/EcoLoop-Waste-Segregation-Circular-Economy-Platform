import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggleDark: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => localStorage.getItem('ecoloop-dark') === 'true');

  const toggleDark = () => {
    setDark(d => {
      const next = !d;
      localStorage.setItem('ecoloop-dark', String(next));
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

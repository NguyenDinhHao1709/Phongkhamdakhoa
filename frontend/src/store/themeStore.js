import { create } from 'zustand';

const STORAGE_KEY = 'medicare_theme_mode';

function getInitialDarkMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // ignore storage errors
  }
  return false;
}

function applyDomTheme(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const initialDark = getInitialDarkMode();
applyDomTheme(initialDark);

const useThemeStore = create((set) => ({
  darkMode: initialDark,
  setDarkMode: (val) =>
    set(() => {
      const next = Boolean(val);
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      applyDomTheme(next);
      return { darkMode: next };
    }),
  toggleTheme: () =>
    set((state) => {
      const next = !state.darkMode;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      applyDomTheme(next);
      return { darkMode: next };
    }),
}));

export default useThemeStore;


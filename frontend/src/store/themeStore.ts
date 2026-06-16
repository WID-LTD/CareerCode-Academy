import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

function applyDarkMode(value: boolean) {
  if (value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = JSON.parse(localStorage.getItem('careercode-theme') || '{}');
    return stored?.state?.darkMode ?? false;
  } catch {
    return false;
  }
}

const initialDarkMode = getInitialDarkMode();
applyDarkMode(initialDarkMode);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      darkMode: initialDarkMode,

      toggleDarkMode: () => {
        const newDarkMode = !get().darkMode;
        set({ darkMode: newDarkMode });
        applyDarkMode(newDarkMode);
      },

      setDarkMode: (value) => {
        set({ darkMode: value });
        applyDarkMode(value);
      },
    }),
    {
      name: 'careercode-theme',
    }
  )
);

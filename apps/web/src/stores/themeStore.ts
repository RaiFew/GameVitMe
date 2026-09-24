import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;
  
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  return resolved;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('party_theme') as Theme | null;
  return saved || 'dark';
};

const initialTheme = getInitialTheme();
const initialResolved = typeof window !== 'undefined' ? applyTheme(initialTheme) : 'dark';

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  resolvedTheme: initialResolved,
  setTheme: (theme: Theme) => {
    localStorage.setItem('party_theme', theme);
    const resolved = applyTheme(theme);
    set({ theme, resolvedTheme: resolved });
  },
  toggleTheme: () => {
    const current = get().resolvedTheme;
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') {
      const resolved = applyTheme('system');
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  });
}

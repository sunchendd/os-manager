import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeId = 'midnight' | 'solar' | 'tokyo' | 'paper' | 'arctic';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
  isDark: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'midnight',
    name: 'Midnight Operator',
    description: 'Deep navy industrial terminal with warm electric accents',
    emoji: '🌑',
    isDark: true,
  },
  {
    id: 'solar',
    name: 'Solar Architect',
    description: 'Warm daylight studio — ochre, forest, and paper',
    emoji: '☀️',
    isDark: false,
  },
  {
    id: 'tokyo',
    name: 'Neon Tokyo',
    description: 'Cyberpunk maximalist — magenta + electric cyan',
    emoji: '🗼',
    isDark: true,
  },
  {
    id: 'paper',
    name: 'Paper & Ink',
    description: 'Eastern editorial — rice paper + cinnabar + ink',
    emoji: '📜',
    isDark: false,
  },
  {
    id: 'arctic',
    name: 'Arctic Frost',
    description: 'Cold minimal — ice mint + glacier blue on deep navy',
    emoji: '❄️',
    isDark: true,
  },
];

const STORAGE_KEY = 'os-manager-theme';
const AUTO_KEY = 'os-manager-theme-auto';

interface ThemeContextType {
  theme: ThemeId;
  isAuto: boolean;
  setTheme: (theme: ThemeId) => void;
  setAuto: (auto: boolean) => void;
  cycleTheme: () => void;
  themes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'midnight',
  isAuto: false,
  setTheme: () => {},
  setAuto: () => {},
  cycleTheme: () => {},
  themes: THEMES,
});

function getSystemTheme(): ThemeId {
  if (typeof window === 'undefined') return 'midnight';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'solar';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isAuto, setIsAutoState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTO_KEY);
      // 从未设置过，默认跟随系统
      if (saved === null) return true;
      return saved === 'true';
    } catch { return true; }
  });

  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId;
      if (saved && THEMES.find(t => t.id === saved)) return saved;
    } catch { /* ignore */ }
    // 首次加载，跟随系统偏好
    return getSystemTheme();
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-detect system preference
  useEffect(() => {
    if (!isAuto) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applySystemTheme = () => {
      const prefersDark = mediaQuery.matches;
      // Pick a dark or light theme based on preference
      const target = prefersDark ? 'midnight' : 'solar';
      setThemeState(target);
    };

    applySystemTheme();
    mediaQuery.addEventListener('change', applySystemTheme);
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, [isAuto]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    setIsAutoState(false); // 手动选择主题时，自动关闭跟随系统
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      localStorage.setItem(AUTO_KEY, 'false');
    } catch { /* ignore */ }
  }, []);

  const setAuto = useCallback((auto: boolean) => {
    setIsAutoState(auto);
    try {
      localStorage.setItem(AUTO_KEY, auto ? 'true' : 'false');
    } catch { /* ignore */ }
    if (auto) {
      setThemeState(getSystemTheme());
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEMES.findIndex(t => t.id === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.id);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isAuto, setTheme, setAuto, cycleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

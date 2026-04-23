import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Monitor, Check, ChevronDown } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { theme, isAuto, setTheme, setAuto, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = themes.find(t => t.id === theme)!;

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                   bg-[var(--color-surface)] border border-[var(--color-border)]
                   text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                   hover:border-[var(--color-border-hover)] transition-all"
        title="切换主题"
      >
        <span className="text-base">{current.emoji}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--color-border)]
                        bg-[var(--color-surface)] shadow-2xl shadow-black/20 z-50 overflow-hidden
                        animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-bold text-sm">
              <Palette className="w-4 h-4 text-[var(--color-accent)]" />
              选择主题
            </div>
          </div>

          {/* Auto toggle */}
          <button
            onClick={() => setAuto(!isAuto)}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                        ${isAuto ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
          >
            <span className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              跟随系统
            </span>
            {isAuto && <Check className="w-4 h-4" />}
          </button>

          {/* Divider */}
          <div className="border-t border-[var(--color-border)]" />

          {/* Theme list */}
          <div className="py-1">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setAuto(false);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                            ${theme === t.id && !isAuto
                              ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]'
                              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                            }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.name}</div>
                  <div className="text-[11px] opacity-70 truncate">{t.description}</div>
                </div>
                {theme === t.id && !isAuto && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  function changeTheme() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('studio-north-theme', next ? 'dark' : 'light'); } catch { /* Theme still works when storage is unavailable. */ }
    setDark(next);
  }
  return (
    <button type="button" className="theme-toggle" onClick={changeTheme}
      aria-pressed={dark} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />}
      </svg>
      <span className="theme-toggle-label">{dark ? 'Light appearance' : 'Dark appearance'}</span>
    </button>
  );
}

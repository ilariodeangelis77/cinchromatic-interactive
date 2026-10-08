export const THEME_KEY = 'cinchromatic-theme-v1';
const validTheme = value => value === 'light' || value === 'dark';

// Independent from editor state: choosing a theme never writes game progress.
export function createThemeController({ getStorage, media, apply }) {
  let storage, explicit = false, current;
  try {
    storage = getStorage();
    const saved = storage.getItem(THEME_KEY);
    if (validTheme(saved)) { current = saved; explicit = true; }
  } catch { /* Theme selection still works for this session. */ }
  current ??= media?.matches ? 'dark' : 'light';
  const update = theme => { current = theme; apply(theme); };
  update(current);
  const systemChanged = event => { if (!explicit) update(event.matches ? 'dark' : 'light'); };
  media?.addEventListener?.('change', systemChanged);
  return {
    get current() { return current; },
    choose(theme) {
      if (!validTheme(theme)) throw new Error('Theme must be light or dark.');
      explicit = true;
      update(theme);
      try { storage?.setItem(THEME_KEY, theme); } catch { /* Keep the explicit choice in memory. */ }
    },
    dispose() { media?.removeEventListener?.('change', systemChanged); },
  };
}

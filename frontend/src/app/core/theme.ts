export type Theme = 'light' | 'dark' | 'auto';

const KEY = 'app-theme';

function load(): Theme {
  const raw = localStorage.getItem(KEY);
  return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'auto';
}

export function resolvedTheme(): 'light' | 'dark' {
  const t = load();
  if (t !== 'auto') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setThemeColor(color: string) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = color;
}

function apply() {
  const resolved = resolvedTheme();
  const el = document.documentElement;
  if (resolved === 'dark') el.setAttribute('data-theme', 'dark');
  else el.removeAttribute('data-theme');
  setThemeColor(resolved === 'dark' ? '#0e1116' : '#ffffff');
}

export function initTheme() {
  apply();
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (load() === 'auto') apply();
    });
}

export function getTheme(): Theme {
  return load();
}

export function setTheme(t: Theme) {
  localStorage.setItem(KEY, t);
  apply();
}
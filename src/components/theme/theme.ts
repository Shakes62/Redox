export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'redox-theme';
export const THEME_COLORS: Record<Theme, string> = { light: '#f6f5f1', dark: '#0b0b0c' };

/**
 * Runs in <head> while the HTML is parsed: the visitor's saved choice wins,
 * otherwise the device setting. Kept tiny and dependency-free on purpose.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.setAttribute("data-theme",t)}catch(e){}})()`;

export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function deviceTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // The browser's own chrome (address bar, status bar) follows the choice too.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', THEME_COLORS[theme]);
  });
}

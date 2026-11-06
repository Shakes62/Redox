'use client';

import { useLayoutEffect, type MouseEvent } from 'react';
import { MoonIcon, SunIcon } from '@/components/ui/Icons';
import { applyTheme, deviceTheme, storedTheme, THEME_STORAGE_KEY, type Theme } from './theme';
import styles from './ThemeToggle.module.css';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * One tap between light and dark. Until someone taps it, the site follows the
 * device setting — including when the device switches at sunset.
 *
 * Both icons are always rendered and CSS shows the right one, so the server
 * HTML never disagrees with the browser.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  useLayoutEffect(() => {
    // Re-applies after React's dev-mode remount, and syncs the browser chrome colour.
    applyTheme(storedTheme() ?? deviceTheme());

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const followDevice = () => {
      if (!storedTheme()) applyTheme(deviceTheme());
    };
    const followOtherTabs = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) applyTheme(storedTheme() ?? deviceTheme());
    };
    media.addEventListener('change', followDevice);
    window.addEventListener('storage', followOtherTabs);
    return () => {
      media.removeEventListener('change', followDevice);
      window.removeEventListener('storage', followOtherTabs);
    };
  }, []);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    const commit = () => {
      applyTheme(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* The choice still applies for this visit. */
      }
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      commit();
      return;
    }

    if (typeof document.startViewTransition !== 'function') {
      const root = document.documentElement;
      root.classList.add('theme-fade');
      commit();
      window.setTimeout(() => root.classList.remove('theme-fade'), 360);
      return;
    }

    // The new theme grows out of the button in a circle.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(commit);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      })
      .catch(() => undefined);
  };

  return (
    <button
      aria-label="Switch between light and dark mode"
      className={`${styles.toggle} ${className}`}
      onClick={toggle}
      title="Light / dark mode"
      type="button"
    >
      <SunIcon className={styles.sun} />
      <MoonIcon className={styles.moon} />
    </button>
  );
}

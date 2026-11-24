// The store's chrome at true phone scale, built from the site's own markup and CSS modules
// (src/components/layout/Navbar.tsx + Navbar.module.css, ThemeToggle, Button). Only the state
// comes from the film: what is open, typed, pressed or scrolled at each frame.
import React from 'react';
import { Img, staticFile } from 'remotion';

import { BagIcon, LockIcon, MenuIcon, MoonIcon, SunIcon, XIcon } from '@/components/ui/Icons';
import buttonStyles from '@/components/ui/Button.module.css';
import navStyles from '@/components/layout/Navbar.module.css';
import themeStyles from '@/components/theme/ThemeToggle.module.css';

import { RdIcon } from '../components/Logo';
import { StatusBar } from '../components/Phone';

/** Height of the phone's status bar and the browser's address bar above the page (points). */
export const TOP = 46 + 44;
/** The page's viewport under them: 390 x 754pt. */
export const VIEW_H = 844 - TOP;

/**
 * A phone screen showing the store in a browser, in the store's light theme. The page sits in
 * its own viewport (a transformed box, so the site's position: fixed navbar and drawer stay
 * inside it). Everything inside uses the site's classes.
 */
export const AppScreen: React.FC<{ children: React.ReactNode; time?: string; overlay?: React.ReactNode; url?: string }> = ({ children, time, overlay, url = 'redoxdesignx.com' }) => (
  <div className="app" data-theme="light">
    <div style={{ position: 'absolute', left: 0, right: 0, top: 46, height: 44, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--bg)' }}>
      <div style={{ flex: 1, height: 34, borderRadius: 999, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--fg-2)', fontSize: 14, fontWeight: 550 }}>
        <LockIcon size={12} weight="fill" />
        {url}
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: TOP, bottom: 0, overflow: 'hidden', transform: 'translateZ(0)' }}>{children}</div>
    {overlay}
    <StatusBar time={time} />
  </div>
);

/** A page that scrolls under the fixed navbar: `scroll` in points. */
export const Page: React.FC<{ scroll?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ scroll = 0, children, style }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${-scroll}px)`, ...style }}>{children}</div>
);

/** next/image with `fill`: an absolutely positioned photo; the CSS module sets object-fit. */
export const Fill: React.FC<{ src: string; className?: string; style?: React.CSSProperties }> = ({ src, className, style }) =>
  src ? (
    <Img
      className={className}
      src={src.startsWith('http') ? src : staticFile(src)}
      style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent', ...style }}
    />
  ) : null;

/** Navbar.tsx on a phone: the round monogram, the theme switch, the bag with its count, the menu. */
export const SiteNav: React.FC<{ bag?: number; bagPop?: number; scrolled?: boolean }> = ({ bag = 0, bagPop = 0, scrolled = true }) => (
  <nav className={`${navStyles.nav} ${scrolled ? navStyles.navScrolled : ''}`}>
    <div className={navStyles.bar}>
      <div className={navStyles.brand}>
        <span className={navStyles.logo}>
          <RdIcon size={40} className={navStyles.logoImg} />
        </span>
      </div>
      <div className={navStyles.actions}>
        <button className={themeStyles.toggle} type="button">
          <SunIcon className={themeStyles.sun} />
          <MoonIcon className={themeStyles.moon} />
        </button>
        <button className={navStyles.bagButton} type="button" style={{ transform: `scale(${1 + bagPop * 0.12})` }}>
          <BagIcon size={19} weight="bold" />
          <span className={navStyles.bagLabel}>Bag</span>
          <span className={`${navStyles.bagCount} ${bag > 0 ? navStyles.bagCountFull : ''}`}>{bag}</span>
        </button>
        <button className={navStyles.menuButton} type="button">
          <span className={navStyles.menuIcon}>
            <MenuIcon size={24} />
            <XIcon size={24} />
          </span>
        </button>
      </div>
    </div>
  </nav>
);

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost';

/** The site's Button (src/components/ui/Button.tsx), with the film's press scale. */
export const Button: React.FC<{ children: React.ReactNode; variant?: Variant; size?: 'sm' | 'md' | 'lg'; full?: boolean; loading?: boolean; press?: number; className?: string; style?: React.CSSProperties; m?: string }> = ({
  children,
  variant = 'primary',
  size = 'md',
  full,
  loading,
  press = 1,
  className,
  style,
  m,
}) => (
  <button
    data-m={m}
    className={[buttonStyles.button, buttonStyles[variant], buttonStyles[size], full ? buttonStyles.fullWidth : '', loading ? buttonStyles.loading : '', className || ''].filter(Boolean).join(' ')}
    style={{ transform: `scale(${press})`, ...style }}
    type="button"
  >
    {loading ? <span className={buttonStyles.spinner} /> : null}
    {children}
  </button>
);

/** Characters of `text` typed by design frame `t` (starting at `start`, `cps` chars per frame). */
export const typed = (text: string, t: number, start: number, cps = 0.9) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((t - start) * cps))));
export const typeEnd = (text: string, start: number, cps = 0.9) => start + Math.ceil(text.length / cps);

/** The blinking caret inside a focused field (points). */
export const Caret: React.FC<{ t: number; on: boolean; h?: number }> = ({ t, on, h = 20 }) =>
  on ? <span style={{ display: 'inline-block', width: 1.5, height: h, marginLeft: 1, verticalAlign: 'middle', background: 'var(--accent)', opacity: Math.floor(t / 14) % 2 === 0 ? 1 : 0 }} /> : null;

// REDOXDESIGNX film design system.
// Colours, radii and shadows are the store's own tokens (src/app/globals.css in the app, light
// theme, as the owner asked for the film). Type is the store's: Archivo (wide, heavy, uppercase) for
// headlines, Geist for everything people read, Geist Mono for labels and order numbers.
// The font files are the ones the site self-hosts (src/app/fonts), copied to public/fonts.
//
// The store's real stylesheet is loaded too, so app screens can use the site's own classes.
import '@/app/globals.css';
import './film.css';

import { loadFont } from '@remotion/fonts';
import { Easing, staticFile } from 'remotion';

loadFont({ family: 'Archivo', url: staticFile('fonts/Archivo-Variable.woff2'), weight: '100 900', stretch: '62% 125%', format: 'woff2' });
loadFont({ family: 'Geist', url: staticFile('fonts/Geist-Variable.woff2'), weight: '100 900', format: 'woff2' });
loadFont({ family: 'Geist Mono', url: staticFile('fonts/GeistMono-Variable.woff2'), weight: '100 900', format: 'woff2' });

export const DISPLAY = "'Archivo', 'Arial Narrow', sans-serif";
export const BODY = "'Geist', system-ui, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, monospace";
/** The headline width the site uses ('wdth' 112 on the hero, 118 on section titles). */
export const WIDE = "'wdth' 112";

export const C = {
  // light theme (src/app/globals.css [data-theme='light'])
  bg: '#f6f5f1',
  surface: '#ffffff',
  surface2: '#f1f0eb',
  surface3: '#e8e6e0',
  border: '#e3e1da',
  borderStrong: '#cbc8bf',
  fg: '#121213',
  fg2: '#4d4b46',
  fg3: '#75726a',
  // the brand red
  accent: '#d72638',
  accentHover: '#b81d2e',
  accentText: '#c01f30',
  accentSoft: 'rgba(215, 38, 56, 0.09)',
  accentRing: 'rgba(215, 38, 56, 0.35)',
  // dark surfaces (the inverse card, the app icon)
  inverse: '#121213',
  onInverse: '#ffffff',
  white: '#ffffff',
  ink: '#111111',
  inkSoft: '#55524c',
  photoBg: '#e9e9ec',
  // status
  success: '#13874a',
  successSoft: 'rgba(19, 135, 74, 0.1)',
  whatsapp: '#25d366',
  whatsappInk: '#062b14',
  // the RD mark's orange (public/assets/icons/redoxlogo.png)
  logoOrange: '#ff5f00',
} as const;

export const SHADOW = {
  md: '0 10px 30px rgba(20, 20, 20, 0.08)',
  lg: '0 24px 70px rgba(20, 20, 20, 0.16)',
  pill: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
  // film-scale versions for big floating cards
  filmCard: '0 40px 90px -30px rgba(20, 20, 20, 0.35), 0 0 0 1px rgba(20, 20, 20, 0.05)',
  phone: '0 70px 120px -40px rgba(20, 20, 20, 0.55)',
} as const;

/** The site's radii (globals.css). */
export const R = { md: 12, lg: 16, xl: 22, x2: 28, x3: 36, full: 9999 } as const;

// One easing family for the whole film: fast out, soft landing (the site's --ease-out is the same shape).
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);

export const SPRING = { damping: 18, stiffness: 170, mass: 0.8 };
export const SPRING_POP = { damping: 11, stiffness: 240, mass: 0.6 };
/** Cards land like paper dropped on a table: quick, a little settle. */
export const SPRING_CARD = { damping: 15, stiffness: 120, mass: 0.9 };
/** The phone rising into the frame. */
export const SPRING_PHONE = { damping: 18, stiffness: 90, mass: 1 };

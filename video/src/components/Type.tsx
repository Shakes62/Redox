import React from 'react';
import { interpolate } from 'remotion';

import { BODY, C, DISPLAY, MONO, WIDE } from '../brand';
import { ease, useT } from './anim';

const clean = (w: string) => w.replace(/[.,!?'’]/g, '').toLowerCase();

/**
 * The store's headline: Archivo 900, wide, uppercase, tight (the hero's "WEAR IT PLAIN.
 * PRINT IT LOUD."). Each word rises out of its own mask (16-frame ease, 2-frame stagger, as in
 * the kit). One word can get the hero's highlighter: a block of colour that sweeps in behind
 * it, tilted -2deg, with the text flipping to black or white so it stays readable.
 */
export const Display: React.FC<{
  text: string;
  size: number;
  color?: string;
  delay?: number;
  stagger?: number;
  mark?: string;
  markColor?: string;
  markInk?: string;
  lineHeight?: number;
  align?: 'left' | 'center';
  exitAt?: number;
  /** Shrink so the longest line fits this many pixels. */
  fit?: number;
  style?: React.CSSProperties;
}> = ({ text, size: wanted, color = C.fg, delay = 0, stagger = 2, mark, markColor = C.accent, markInk = '#ffffff', lineHeight = 0.88, align = 'left', exitAt, fit, style }) => {
  const t = useT();
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = fit ? Math.min(wanted, fit / (longest * 0.72 + (mark ? 0.32 : 0))) : wanted;
  const total = text.split(/\s+/).length;
  const exit = exitAt === undefined ? 0 : ease(t, exitAt, 10);
  const m = ease(t, delay + total * stagger + 6, 14);
  let wi = 0;
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontVariationSettings: WIDE,
        fontWeight: 900,
        fontSize: size,
        lineHeight,
        letterSpacing: '-0.025em',
        textTransform: 'uppercase',
        color,
        opacity: 1 - exit,
        transform: `translateY(${-exit * size * 0.3}px)`,
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', flexWrap: 'nowrap', columnGap: '0.22em', justifyContent: align === 'center' ? 'center' : 'flex-start', whiteSpace: 'nowrap' }}>
          {line.split(' ').map((w) => {
            const i = wi++;
            const p = ease(t, delay + i * stagger, 16);
            const marked = mark !== undefined && clean(w) === clean(mark);
            return marked ? <Marked key={i} w={w} p={p} m={m} bg={markColor} ink={markInk} /> : <Word key={i} w={w} p={p} />;
          })}
        </div>
      ))}
    </div>
  );
};

const Mask: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em', paddingTop: '0.04em', marginTop: '-0.04em' }}>{children}</span>
);

const Word: React.FC<{ w: string; p: number; color?: string }> = ({ w, p, color }) => (
  <Mask>
    <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 112}%)`, color }}>{w}</span>
  </Mask>
);

/** The hero's highlighter (.heroMark): the colour sweeps in from the left, the word flips to stay readable. */
const Marked: React.FC<{ w: string; p: number; m: number; bg: string; ink: string }> = ({ w, p, m, bg, ink }) => (
  <span style={{ position: 'relative', display: 'inline-block', marginTop: '0.06em', transform: `rotate(${-2 * m}deg)`, transformOrigin: 'left center' }}>
    <span
      style={{
        position: 'absolute',
        inset: '0 -0.14em -0.02em -0.14em',
        borderRadius: '0.14em',
        background: bg,
        boxShadow: `0 0.12em 0.5em -0.2em ${bg}`,
        transform: `scaleX(${m})`,
        transformOrigin: 'left center',
      }}
    />
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <Word w={w} p={p} color={m > 0.45 ? ink : undefined} />
    </span>
  </span>
);

/** The hero's kicker: a mono pill with a coloured dot (".kicker"). */
export const Kicker: React.FC<{ children: React.ReactNode; size?: number; dot?: string; delay?: number; style?: React.CSSProperties }> = ({ children, size = 26, dot = C.accent, delay = 0, style }) => {
  const t = useT();
  const p = ease(t, delay, 12);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        border: `1.5px solid ${C.border}`,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.7)',
        padding: `${size * 0.42}px ${size * 0.8}px ${size * 0.42}px ${size * 0.56}px`,
        fontFamily: MONO,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: C.fg2,
        whiteSpace: 'nowrap',
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        ...style,
      }}
    >
      <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: 999, background: dot, boxShadow: `0 0 0 ${size * 0.16}px ${dot}4d` }} />
      {children}
    </div>
  );
};

/** Mono label: order numbers, GSM, "LIGHTER — HEAVIER". */
export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; tracking?: number; delay?: number; style?: React.CSSProperties }> = ({ children, size = 24, color = C.fg3, tracking = 0.1, delay = 0, style }) => {
  const t = useT();
  const p = ease(t, delay, 12);
  return (
    <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: size, letterSpacing: `${tracking}em`, textTransform: 'uppercase', color, whiteSpace: 'nowrap', opacity: p, transform: `translateY(${(1 - p) * 10}px)`, ...style }}>
      {children}
    </div>
  );
};

export const Body: React.FC<{ children: React.ReactNode; size?: number; color?: string; delay?: number; weight?: number; style?: React.CSSProperties }> = ({ children, size = 38, color = C.fg2, delay = 0, weight = 500, style }) => {
  const t = useT();
  const p = ease(t, delay, 14);
  return (
    <div style={{ fontFamily: BODY, fontWeight: weight, fontSize: size, lineHeight: 1.35, color, textWrap: 'balance', opacity: p, transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`, ...style }}>
      {children}
    </div>
  );
};

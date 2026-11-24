// Scene pieces the film shares: floating cards, film-scale chips and pills, the search box.
import React from 'react';
import { interpolate } from 'remotion';

import { SearchIcon } from '@/components/ui/Icons';

import { BODY, C, DISPLAY, EASE_INOUT, MONO, SHADOW, SPRING_CARD, SPRING_POP, WIDE } from '../brand';
import { ease, useSpringAt, useT } from '../components/anim';

/** A card dropped onto the frame: springs in from below (or a side), settles to a slight tilt. */
export const Float: React.FC<{
  x: number;
  y: number;
  delay: number;
  rotate?: number;
  from?: 'below' | 'left' | 'right' | 'pop';
  out?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  z?: number;
}> = ({ x, y, delay, rotate = 0, from = 'below', out, children, style, z = 50 }) => {
  const t = useT();
  const s = useSpringAt(delay, from === 'pop' ? SPRING_POP : SPRING_CARD);
  const gone = out === undefined ? 0 : ease(t, out, 12, EASE_INOUT);
  if (t < delay - 1 || gone >= 1) return null;
  const tx = from === 'left' ? interpolate(s, [0, 1], [-360, 0]) : from === 'right' ? interpolate(s, [0, 1], [360, 0]) : 0;
  const ty = from === 'below' ? interpolate(s, [0, 1], [220, 0]) : from === 'pop' ? 0 : interpolate(s, [0, 1], [40, 0]);
  const sc = from === 'pop' ? interpolate(s, [0, 1], [0.6, 1]) : 1;
  const rot = rotate + (1 - s) * (from === 'left' ? -8 : 8);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: z,
        opacity: interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }) * (1 - gone),
        transform: `translate(${tx}px, ${ty - gone * 40}px) rotate(${rot}deg) scale(${sc * (1 - gone * 0.05)})`,
        transformOrigin: '50% 50%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A white film-scale card with the site's border and a soft shadow. */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; dark?: boolean; r?: number }> = ({ children, style, dark, r = 36 }) => (
  <div style={{ borderRadius: r, background: dark ? C.inverse : C.surface, color: dark ? C.onInverse : C.fg, border: dark ? 'none' : `1.5px solid ${C.border}`, boxShadow: SHADOW.filmCard, boxSizing: 'border-box', ...style }}>{children}</div>
);

/** A film-scale pill: icon tile + text, like the site's chips (size = font px). */
export const Pill: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; size?: number; tone?: string; ink?: string; bg?: string; style?: React.CSSProperties }> = ({ icon, children, size = 32, tone = C.accent, ink = '#fff', bg = C.surface, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.5, borderRadius: 999, background: bg, border: `1.5px solid ${C.border}`, boxShadow: SHADOW.filmCard, padding: icon ? `${size * 0.32}px ${size * 0.9}px ${size * 0.32}px ${size * 0.32}px` : `${size * 0.5}px ${size * 0.9}px`, fontFamily: BODY, fontWeight: 700, fontSize: size, color: C.fg, whiteSpace: 'nowrap', ...style }}>
    {icon ? <span style={{ width: size * 1.7, height: size * 1.7, borderRadius: 999, background: tone, color: ink, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</span> : null}
    {children}
  </div>
);

/** A big number or word in the headline face. */
export const Big: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }> = ({ children, size, color = C.fg, style }) => (
  <span style={{ fontFamily: DISPLAY, fontVariationSettings: WIDE, fontWeight: 900, fontSize: size, lineHeight: 0.86, letterSpacing: '-0.02em', textTransform: 'uppercase', color, ...style }}>{children}</span>
);

export const Label: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 22, color = C.fg3, style }) => (
  <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: size, letterSpacing: '0.1em', textTransform: 'uppercase', color, whiteSpace: 'nowrap', ...style }}>{children}</span>
);

/** The search box on the end card, typing the address. */
export const SearchPill: React.FC<{ text: string; w: number; h: number; caret?: boolean; press?: number; placeholder?: string }> = ({ text, w, h, caret, press = 1, placeholder = 'Search' }) => {
  const t = useT();
  return (
    <div style={{ width: w, height: h, borderRadius: 999, border: `2px solid ${C.border}`, background: C.surface, boxShadow: SHADOW.filmCard, display: 'flex', alignItems: 'center', gap: h * 0.22, padding: `0 ${h * 0.14}px 0 ${h * 0.36}px`, boxSizing: 'border-box', transform: `scale(${press})` }}>
      <SearchIcon size={h * 0.36} color={C.fg3} />
      <span style={{ flex: 1, fontFamily: BODY, fontWeight: 600, fontSize: h * 0.34, color: text ? C.fg : C.fg3, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        {text || placeholder}
        {caret ? <span style={{ width: 3, height: h * 0.4, marginLeft: 3, background: C.accent, opacity: Math.floor(t / 10) % 2 ? 0 : 1 }} /> : null}
      </span>
      <span style={{ width: h * 0.72, height: h * 0.72, borderRadius: 999, background: C.accent, display: 'grid', placeItems: 'center', color: C.white }}>
        <SearchIcon size={h * 0.32} weight="bold" />
      </span>
    </div>
  );
};

/** The three ordering steps as a strip of numbered pills (end card). */
export const StepStrip: React.FC<{ steps: string[]; delay: number; size?: number }> = ({ steps, delay, size = 1 }) => {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 * size }}>
      {steps.map((s, i) => {
        const p = ease(t, delay + i * 5, 14);
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 * size, height: 72 * size, padding: `0 ${28 * size}px 0 ${12 * size}px`, borderRadius: 999, background: C.surface, border: `1.5px solid ${C.border}`, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
            <span style={{ width: 50 * size, height: 50 * size, borderRadius: 999, background: C.accent, display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 24 * size, color: '#fff' }}>{i + 1}</span>
            <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 30 * size, color: C.fg, whiteSpace: 'nowrap' }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Pop-in progress for small things (0..1). */
export const usePop = (at: number) => useSpringAt(at, SPRING_POP);

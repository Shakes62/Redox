// One layout for every step of the film, in both formats (the kit's ChapterFrame):
//   9:16  monogram · step badge · headline · one line, then the live phone on a big rounded
//         panel in the lower band (key content between y 260 and 1500, left of x 960)
//   16:9  copy in the left column, the panel and phone on the right
// The store's light theme, with the hero's soft colour glow behind everything.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';

import { inkOn } from '@/lib/product-display';

import { BODY, C, EASE_INOUT, MONO, SPRING_PHONE } from '../brand';
import type { Chapter } from '../script';
import { ease, useLayout, useSpringAt, useT } from './anim';
import { RdIcon } from './Logo';
import { Phone, phoneMetrics } from './Phone';
import { Body, Display } from './Type';

export type Box = { x: number; y: number; w: number; h: number };

/** Where things go in this format. */
export const useStage = () => {
  const { vertical, width, height, gutter } = useLayout();
  const panel: Box = vertical ? { x: 40, y: 610, w: width - 80, h: height - 610 + 80 } : { x: 860, y: 40, w: width - 900, h: height - 80 };
  const pw = vertical ? 540 : 446;
  const ph = phoneMetrics(pw).h;
  const phoneX = panel.x + (panel.w - pw) / 2;
  const phoneY = vertical ? 650 : (height - ph) / 2;
  return { vertical, width, height, gutter, panel, phone: { w: pw, h: ph, x: phoneX, y: phoneY, k: phoneMetrics(pw).k }, headline: vertical ? 116 : 104, sub: vertical ? 36 : 32 };
};

/** Soft light in a colour, like the hero's glow behind the shirt. */
export const Glow: React.FC<{ tint?: string; strength?: number }> = ({ tint = C.accent, strength = 1 }) => {
  const t = useT();
  const { vertical, width, height } = useLayout();
  const drift = Math.sin(t / 90) * 22;
  return (
    <>
      {/* soft light as radial gradients: the same look as a blurred circle, but cheap to draw */}
      <div style={{ position: 'absolute', right: -220 + drift, top: vertical ? 520 : -160, width: 900, height: 900, background: `radial-gradient(closest-side, ${tint}, transparent)`, opacity: 0.2 * strength }} />
      <div style={{ position: 'absolute', left: -260, top: vertical ? height - 620 : height - 420, width: 620, height: 620, background: `radial-gradient(closest-side, ${tint}, transparent)`, opacity: 0.1 * strength, transform: `translateX(${-drift}px)` }} />
      {/* the site's faint grid lines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: `${width / 12}px ${width / 12}px` }} />
    </>
  );
};

export const TopBar: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const t = useT();
  const { vertical, gutter } = useLayout();
  const p = ease(t, delay, 14);
  return (
    <div style={{ position: 'absolute', left: gutter, top: vertical ? 118 : 58, opacity: p, transform: `translateY(${(1 - p) * -10}px)` }}>
      <RdIcon size={vertical ? 92 : 76} />
    </div>
  );
};

/** The step badge: a red number dot and a label (the product page's "1 Colour"). */
export const Badge: React.FC<{ n?: number; children: React.ReactNode; delay?: number }> = ({ n, children, delay = 0 }) => {
  const t = useT();
  const { vertical } = useLayout();
  const p = ease(t, delay, 14);
  const s = vertical ? 1 : 0.86;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 16 * s,
        height: 68 * s,
        padding: `0 ${28 * s}px 0 ${n ? 10 * s : 28 * s}px`,
        borderRadius: 999,
        background: C.surface,
        border: `1.5px solid ${C.border}`,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: 29 * s,
        color: C.fg,
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {n ? (
        <span style={{ width: 50 * s, height: 50 * s, borderRadius: 999, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 24 * s, boxShadow: `0 0 0 ${5 * s}px ${C.accentSoft}` }}>{n}</span>
      ) : null}
      {children}
    </div>
  );
};

/** The panel the demo sits on: the store's surface, a hairline border, a glow of the scene's colour. */
export const Panel: React.FC<{ tint?: string; delay?: number; children?: React.ReactNode }> = ({ tint = C.accent, delay = 0, children }) => {
  const { vertical, panel } = useStage();
  const s = useSpringAt(delay, { damping: 20, stiffness: 110, mass: 1 });
  return (
    <div
      style={{
        position: 'absolute',
        left: panel.x,
        top: panel.y,
        width: panel.w,
        height: panel.h,
        borderRadius: vertical ? 72 : 60,
        background: `radial-gradient(70% 60% at 50% 35%, ${tint}2e, transparent 70%), ${C.surface2}`,
        border: `1.5px solid ${C.border}`,
        overflow: 'hidden',
        transform: vertical ? `translateY(${(1 - s) * 500}px)` : `translateX(${(1 - s) * 700}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** A phone that rises into its place on the panel, holding the store at 390 x 844pt. */
export const RisingPhone: React.FC<{ delay?: number; children: React.ReactNode; dx?: number; dy?: number; scale?: number; rotate?: number }> = ({ delay = 4, children, dx = 0, dy = 0, scale = 1, rotate = 0 }) => {
  const { phone, height } = useStage();
  const rise = useSpringAt(delay, SPRING_PHONE);
  const y = interpolate(rise, [0, 1], [height + 60, phone.y + dy]);
  return (
    <div style={{ position: 'absolute', left: phone.x + dx, top: y, transform: `scale(${scale}) rotate(${(1 - rise) * 4 + rotate}deg)`, transformOrigin: '50% 0%' }}>
      <Phone w={phone.w}>{children}</Phone>
    </div>
  );
};

/** Film pixels of a point on the phone screen (for floats that point at the app). */
export const usePt = () => {
  const { phone } = useStage();
  const { bezel, k } = phoneMetrics(phone.w);
  return (x: number, y: number, dy = 0) => ({ x: phone.x + bezel + x * k, y: phone.y + dy + bezel + y * k });
};

/**
 * 9:16 only: how far the phone glides up so a bottom button (Continue, Pay) sits in the safe
 * zone, eased between `from` and `to` (design frames). 0 in 16:9, where the phone fits.
 */
export const useLift = (from?: number, to?: number, px = 400) => {
  const t = useT();
  const { vertical } = useLayout();
  if (!vertical || from === undefined) return 0;
  const up = interpolate(t, [from, from + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_INOUT });
  const down = to === undefined ? 0 : interpolate(t, [to, to + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_INOUT });
  return -px * (up - down);
};

/** Layout of a step scene. `demo` renders over the panel, in film pixels. */
export const ChapterFrame: React.FC<{
  ch: Chapter;
  tint?: string;
  demo: React.ReactNode;
  extra?: React.ReactNode;
  headlineSize?: number;
  /** 9:16: the copy steps aside while the phone lifts (see useLift), and returns at `copyBack`. */
  copyAway?: number;
  copyBack?: number;
}> = ({ ch, tint = C.accent, demo, extra, headlineSize, copyAway, copyBack }) => {
  const st = useStage();
  const t = useT();
  const { vertical, width, gutter } = st;
  const away = vertical && copyAway !== undefined ? ease(t, copyAway - 4, 14, EASE_INOUT) * (1 - (copyBack === undefined ? 0 : ease(t, copyBack, 16, EASE_INOUT))) : 0;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Glow tint={tint} />
      <TopBar />
      <div
        style={{
          position: 'absolute',
          left: gutter,
          top: vertical ? 236 : 200,
          width: vertical ? width - gutter * 2 : 860 - gutter - 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          opacity: 1 - away,
          transform: `translateY(${-away * 60}px)`,
        }}
      >
        <Badge n={ch.n} delay={2}>
          {ch.badge}
        </Badge>
        <Display text={ch.headline} size={headlineSize ?? st.headline} fit={vertical ? width - gutter * 2 : 860 - gutter - 40} delay={6} mark={ch.mark} markColor={tint} markInk={inkFor(tint)} style={{ marginTop: vertical ? 24 : 30 }} />
        {ch.sub ? (
          <Body size={vertical ? 30 : st.sub} delay={20} style={{ marginTop: vertical ? 14 : 26, maxWidth: vertical ? 900 : 640 }}>
            {ch.sub}
          </Body>
        ) : null}
        {extra}
      </div>
      <Panel tint={tint} delay={0} />
      {demo}
    </AbsoluteFill>
  );
};

/** Black or white text on a colour: the store's own inkOn(). */
export const inkFor = inkOn;

// A generic phone (no brand's hardware) and the store screen inside it. The screen is exactly
// 390 x 844 points, the phone size the site is built and tested for, scaled to the phone, so
// the site's full-height checkout drawer fits exactly as it does on a real phone.
import React from 'react';
import { interpolate } from 'remotion';

import { BODY, C, SHADOW } from '../brand';
import { ease, useT } from './anim';

export const PT_W = 390;
export const PT_H = 844;

export const phoneMetrics = (w: number) => {
  const bezel = Math.max(9, w * 0.028);
  const inner = w - 2 * bezel;
  const k = inner / PT_W;
  return { bezel, inner, k, r: w * 0.14, h: inner * (PT_H / PT_W) + 2 * bezel };
};

export const PhoneFrame: React.FC<{ w: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, children, style }) => {
  const { bezel, r, h } = phoneMetrics(w);
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        borderRadius: r,
        background: '#050506',
        padding: bezel,
        boxSizing: 'border-box',
        boxShadow: `${SHADOW.phone}, inset 0 0 0 2px #2b2b30, 0 0 0 1.5px rgba(255,255,255,0.06)`,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: r - bezel, overflow: 'hidden', background: C.bg }}>
        {children}
        <div style={{ position: 'absolute', top: h * 0.011, left: '50%', width: w * 0.3, height: w * 0.08, marginLeft: -w * 0.15, borderRadius: 999, background: '#050506', zIndex: 3000 }} />
      </div>
    </div>
  );
};

/** Scales a 390pt-wide design to fill the phone. Children are laid out in points. */
export const Screen: React.FC<{ w: number; children: React.ReactNode }> = ({ w, children }) => {
  const k = w / PT_W;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* The transform makes this the containing block for the site's position: fixed bars and drawers. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: PT_W, height: PT_H, transform: `scale(${k})`, transformOrigin: '0 0', overflow: 'hidden' }}>{children}</div>
    </div>
  );
};

/** A phone holding a 390 x 844pt screen. Width in px; the height follows. */
export const Phone: React.FC<{ w: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, children, style }) => {
  const { inner } = phoneMetrics(w);
  return (
    <PhoneFrame w={w} style={style}>
      <Screen w={inner}>{children}</Screen>
    </PhoneFrame>
  );
};

/** The phone's status bar (points). Dark text on the store's light theme. */
export const StatusBar: React.FC<{ time?: string; dark?: boolean }> = ({ time = '10:24', dark }) => {
  const col = dark ? '#FFFFFF' : C.ink;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 46, zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 30px 0 36px', fontFamily: BODY, fontWeight: 650, fontSize: 15.5, color: col, pointerEvents: 'none' }}>
      <span>{time}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="12" viewBox="0 0 18 12">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="1" fill={col} />
          ))}
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round">
          <path d="M1.5 4.2a9.5 9.5 0 0 1 13 0M4 7a6 6 0 0 1 8 0" />
          <circle cx="8" cy="10" r="1" fill={col} stroke="none" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.75" y="0.75" width="21.5" height="10.5" rx="3" stroke={col} strokeOpacity="0.45" strokeWidth="1.5" />
          <rect x="2.5" y="2.5" width="15" height="7" rx="1.6" fill={col} />
          <rect x="23.5" y="4" width="1.8" height="4" rx="0.9" fill={col} fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
};

/** A finger tap: a soft ring that grows and fades where the screen is pressed (points). */
export const Tap: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const t = useT();
  if (t < at - 2 || t > at + 22) return null;
  const p = ease(t, at - 2, 20);
  const press = interpolate(t, [at - 2, at + 2, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 2600, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: 999, background: 'rgba(18,18,19,0.16)', transform: `scale(${0.6 + press * 0.4})`, opacity: press }} />
      <div style={{ position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: 999, border: '2.5px solid #121213', transform: `scale(${0.7 + p * 1.1})`, opacity: (1 - p) * 0.6 }} />
    </div>
  );
};

/** Press feedback for a button pressed at `at` (the site's :active scale). */
export const usePress = (at: number) => {
  const t = useT();
  return interpolate(t, [at - 2, at + 1, at + 7], [1, 0.96, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

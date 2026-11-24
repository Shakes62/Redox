// The real REDOXDESIGNX marks, cut from the store's own logo file (public/assets/icons/
// redoxlogo.png in the app, 757 x 473): the RD monogram, the round icon the navbar and the
// installed app use (same crop as src/lib/pwa-icon.tsx), the "Design- Print- Brand" pill, and
// the footer's wall-to-wall wordmark with the red X.
import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';

import { C, DISPLAY, SPRING_POP } from '../brand';
import { ease, useSpringAt, useT } from './anim';

const SRC = staticFile('brand/redoxlogo.png');
const PNG_W = 757;
const PNG_H = 473;

/** A window onto part of the logo file (x, y, w, h in the PNG's pixels), drawn `height` px tall. */
const Crop: React.FC<{ x: number; y: number; w: number; h: number; height: number; style?: React.CSSProperties }> = ({ x, y, w, h, height, style }) => {
  const s = height / h;
  return (
    <div style={{ position: 'relative', width: w * s, height, overflow: 'hidden', flexShrink: 0, ...style }}>
      <Img src={SRC} style={{ position: 'absolute', left: -x * s, top: -y * s, width: PNG_W * s, height: PNG_H * s, maxWidth: 'none' }} />
    </div>
  );
};

export const MARK_RATIO = 366 / 288;

/** The RD monogram (white R, orange D) on a dark background. */
export const RdMark: React.FC<{ height: number; style?: React.CSSProperties }> = ({ height, style }) => <Crop x={196} y={0} w={366} h={288} height={height} style={style} />;

/** The "Design- Print- Brand" pill from the logo. */
export const TaglinePill: React.FC<{ height: number; style?: React.CSSProperties }> = ({ height, style }) => <Crop x={180} y={428} w={394} h={45} height={height} style={style} />;

/** The round icon in the navbar and on the home screen (/icon1, src/lib/pwa-icon.tsx). */
export const RdIcon: React.FC<{ size: number; style?: React.CSSProperties; className?: string }> = ({ size, style, className }) => (
  <span className={className} style={{ position: 'relative', display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#080808', flexShrink: 0, ...style }}>
    <span style={{ position: 'relative', width: size, height: size * 0.57, overflow: 'hidden' }}>
      <Img src={SRC} style={{ position: 'absolute', top: 0, left: -size * 0.25, width: size * 1.5, height: (size * 1.5 * PNG_H) / PNG_W, maxWidth: 'none' }} />
    </span>
  </span>
);

const NAME = 'REDOXDESIGNX';

/** The footer's wordmark: Archivo 900, wide, the last letter in the brand red. Letters rise one by one. */
export const Wordmark: React.FC<{ size: number; delay?: number; stagger?: number; style?: React.CSSProperties; justify?: 'space-between' | 'center' | 'flex-start' }> = ({
  size,
  delay = 0,
  stagger = 1.4,
  style,
  justify = 'flex-start',
}) => {
  const t = useT();
  return (
    <div style={{ display: 'flex', justifyContent: justify, fontFamily: DISPLAY, fontVariationSettings: "'wdth' 112", fontWeight: 900, fontSize: size, letterSpacing: '-0.02em', lineHeight: 0.8, color: C.fg, ...style }}>
      {NAME.split('').map((l, i) => {
        const p = ease(t, delay + i * stagger, 14);
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingTop: '0.06em', paddingBottom: '0.04em' }}>
            <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`, color: i === NAME.length - 1 ? C.accent : undefined }}>{l}</span>
          </span>
        );
      })}
    </div>
  );
};

/** The monogram arriving: it punches in from slightly big, with a quick light sweep across it. */
export const MarkBuild: React.FC<{ height: number; delay?: number }> = ({ height, delay = 0 }) => {
  const t = useT();
  const s = useSpringAt(delay, SPRING_POP);
  const wipe = ease(t, delay, 12);
  const sweep = interpolate(t, [delay + 8, delay + 26], [-0.4, 1.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'relative', transform: `scale(${interpolate(s, [0, 1], [1.35, 1])}) rotate(${(1 - s) * -6}deg)`, opacity: Math.min(1, s * 1.6), clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
      <RdMark height={height} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${sweep * 100 - 18}%, rgba(255,255,255,0.55) ${sweep * 100}%, transparent ${sweep * 100 + 18}%)`, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
    </div>
  );
};

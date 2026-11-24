import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { EASE, SPRING } from '../brand';
import TIMING from '../timing.json';

/** Design frames per design-second. Animations are written in these units. */
export const DESIGN_FPS = 30;

/**
 * The frame in design units. Every animation reads this instead of useCurrentFrame(),
 * so the global SPEED (src/timing.json) speeds the whole film up evenly while the
 * video still renders at 30 fps and the audio stays in sync.
 */
export const useT = () => useCurrentFrame() * TIMING.speed;

/** 0→1 eased over `dur` frames starting at `start`. */
export const ease = (frame: number, start: number, dur: number, easing = EASE) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const useSpringAt = (delay = 0, config: { damping: number; stiffness: number; mass: number } = SPRING) => {
  const t = useT();
  return spring({ frame: t - delay, fps: DESIGN_FPS, config });
};

/**
 * Layout for 9:16 and 16:9.
 * Vertical keeps key content between y≈260 and y≈1500 (TikTok/Reels UI safe zone)
 * and left of x≈960 (the right-hand button rail).
 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return {
    vertical,
    width,
    height,
    gutter: vertical ? 76 : 110,
    cardW: vertical ? 880 : 720,
    headline: vertical ? 100 : 86,
  };
};

/** 486 → "486", 2140 → "2.1k" */
export const fmt = (n: number) => {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  const k = v / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
};

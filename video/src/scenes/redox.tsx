// The REDOXDESIGNX film: the brand, the weights, every product, then how to order, step by
// step, on the store's real screens. Every key moment lands on a word of the narration
// (cue() reads src/films/redox/vo.json), so re-voicing keeps it in sync. Tap positions are the
// real buttons' positions (npx remotion still Measure ... --log=verbose).
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile } from 'remotion';

import { BankIcon } from '@phosphor-icons/react/dist/ssr/Bank';
import { ChatTextIcon } from '@phosphor-icons/react/dist/ssr/ChatText';
import { CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { PhoneCallIcon } from '@phosphor-icons/react/dist/ssr/PhoneCall';
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { ArrowUpRightIcon, CheckIcon, LockIcon, MapPinIcon, MobilePayIcon, PaletteIcon, TruckIcon, TShirtIcon, WhatsappIcon } from '@/components/ui/Icons';
import { formatCurrency } from '@/lib/format';
import { displayColorName, inkOn } from '@/lib/product-display';

import { BODY, C, DISPLAY, EASE_INOUT, MONO, SHADOW, SPRING_POP, WIDE } from '../brand';
import { ease, useLayout, useSpringAt, useT } from '../components/anim';
import { ChapterFrame, Glow, RisingPhone, TopBar, useLift, useStage } from '../components/Frame';
import { MarkBuild, RdIcon, TaglinePill, Wordmark } from '../components/Logo';
import { Tap, usePress } from '../components/Phone';
import { Body, Display, Kicker } from '../components/Type';
import { KINDS, PIECES, PLACES, REGIONS, WEIGHTS, piece, type Piece } from '../catalog';
import { cue, DUR } from '../films/redox/timeline';
import { FILM, HERO, SMS, STORY } from '../script';
import { AppScreen, typeEnd, typed } from '../ui/app';
import { DeliveryStep, DetailsStep, Drawer, Receipt, ReviewStep } from '../ui/Checkout';
import { ProductScreen, ShopScreen, type Qty } from '../ui/Shop';
import { SmsCard } from '../ui/Sms';
import { TrackScreen } from '../ui/Track';
import { Big, Card, Float, Label, Pill, SearchPill, StepStrip } from './common';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const k = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ch = FILM.chapters;
const smooth = (t: number, a: number, b: number, from: number, to: number) => interpolate(t, [a, b], [from, to], { ...clamp, easing: EASE_INOUT });
/** A value that steps through keyframes [frame, value][], easing between them. */
const path = (t: number, keys: [number, number][]) => {
  let out = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f0, v0] = keys[i - 1];
    const [f1, v1] = keys[i];
    if (t < f0) break;
    out = t >= f1 ? v1 : smooth(t, f0, f1, v0, v1);
  }
  return out;
};
const CAPS = piece('trackercaps');

/* =============================================================== 1 intro */
// "Meet Redox Design X" the icon and the name build · "Heavy cotton tees" the hero lands
// "in every colour" the shirt cycles through its colours · "delivered across Ghana" the pill
const I_GLIDE = k(cue('intro', 'heavy', 85) - 14, 62, 100);
const I_HEAD = I_GLIDE + 8;
const I_LEAD = k(cue('intro', 'heavy', 85) + 10, I_HEAD + 10, 130);
const I_STAGE = k(cue('intro', 'tees', 108) - 4, I_HEAD + 14, 150);
const I_FAST = k(cue('intro', 'colour', 227) - 10, I_STAGE + 40, 250);
const I_PILL = k(cue('intro', 'delivered', 251) - 4, I_FAST + 10, DUR.intro - 40);
const HERO_COLORS = ['BLACK', 'WINE', 'SEA BLUE', 'CREAM', 'PINK', 'Green', 'DARK GREY', 'WHITE'].filter((c) => HERO.colors.includes(c));
/** Which colour the hero shows, and how far the crossfade into it has gone. */
const heroLook = (t: number) => {
  const slow = 26;
  const fast = 12;
  const steps = t < I_FAST ? Math.floor((t - I_STAGE) / slow) : Math.floor((I_FAST - I_STAGE) / slow) + Math.floor((t - I_FAST) / fast) + 1;
  const j = Math.max(0, steps);
  const start = t < I_FAST ? I_STAGE + j * slow : I_FAST + (j - Math.floor((I_FAST - I_STAGE) / slow) - 1) * fast;
  const n = HERO_COLORS.length;
  return { color: HERO_COLORS[j % n], prev: HERO_COLORS[(j + n - 1) % n], mix: j === 0 ? 1 : ease(t, start, 8) };
};
export const INTRO_T = { glide: I_GLIDE, head: I_HEAD, stage: I_STAGE, pill: I_PILL, changes: [] as number[] };
for (let f = I_STAGE + 26; f < I_FAST; f += 26) INTRO_T.changes.push(f);

/** The home page hero's stage at film scale: the shirt, its GSM sticker, the price pill, the swatches. */
const HeroStage: React.FC<{ w: number; t: number }> = ({ w, t }) => {
  const look = heroLook(t);
  const h = w * 1.25;
  const tint = HERO.tint(look.color);
  const s = useSpringAt(I_STAGE, { damping: 16, stiffness: 120, mass: 0.9 });
  const sticker = useSpringAt(I_STAGE + 10, SPRING_POP);
  const sw = w * 0.07;
  return (
    <div style={{ width: w, opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 160}px) rotate(${(1 - s) * 4}deg)` }}>
      <div style={{ position: 'relative', width: w, height: h, borderRadius: w * 0.07, boxShadow: `0 ${w * 0.09}px ${w * 0.16}px -${w * 0.09}px ${tint}, 0 0 0 1px rgba(0,0,0,0.05)` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', background: C.photoBg }}>
          <PhotoImg src={HERO.photo(look.prev)} />
          <PhotoImg src={HERO.photo(look.color)} style={{ opacity: look.mix, transform: `scale(${1.04 - 0.04 * look.mix})` }} />
        </div>
        {/* the spinning weight sticker */}
        <div style={{ position: 'absolute', top: -w * 0.06, right: -w * 0.05, width: w * 0.26, height: w * 0.26, borderRadius: '50%', background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: `0 16px 34px -14px ${C.accentRing}`, transform: `rotate(8deg) scale(${sticker})` }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${t * 1.4}deg)` }}>
            <defs>
              <path id="ring" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
            </defs>
            <text style={{ fill: 'currentColor', fontFamily: MONO, fontSize: 8.4, fontWeight: 700, letterSpacing: '0.12em' }}>
              <textPath href="#ring">HEAVY COTTON · {HERO.gsm} GSM · HEAVY COTTON · {HERO.gsm} GSM ·</textPath>
            </text>
          </svg>
          <span style={{ fontFamily: DISPLAY, fontVariationSettings: WIDE, fontWeight: 900, fontSize: w * 0.075, lineHeight: 1 }}>{HERO.gsm}</span>
        </div>
        {/* price pill */}
        <div style={{ position: 'absolute', left: w * 0.036, bottom: w * 0.036, display: 'inline-flex', alignItems: 'center', gap: w * 0.022, borderRadius: 999, background: 'rgba(255,255,255,0.94)', boxShadow: SHADOW.pill, color: C.ink, padding: `${w * 0.013}px ${w * 0.013}px ${w * 0.013}px ${w * 0.036}px`, fontFamily: BODY }}>
          <strong style={{ fontSize: w * 0.042, fontWeight: 800 }}>{formatCurrency(HERO.price)}</strong>
          <span style={{ fontSize: w * 0.034, fontWeight: 600, color: C.inkSoft }}>{displayColorName(look.color)}</span>
          <span style={{ width: w * 0.075, height: w * 0.075, borderRadius: 999, background: C.ink, color: '#fff', display: 'grid', placeItems: 'center' }}>
            <ArrowUpRightIcon size={w * 0.036} />
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: sw * 0.4, marginTop: w * 0.05 }}>
        {HERO_COLORS.map((c, i) => {
          const on = c === look.color;
          const p = ease(t, I_STAGE + 12 + i * 2, 10);
          return <span key={c} style={{ width: sw, height: sw, borderRadius: 999, background: HERO.swatch(c), opacity: p, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.14), 0 0 0 ${sw * 0.1}px ${C.bg}, 0 0 0 ${on ? sw * 0.17 : sw * 0.13}px ${on ? C.fg : C.borderStrong}`, transform: `scale(${on ? 1.12 : 1})` }} />;
        })}
      </div>
      <div style={{ marginTop: w * 0.03, textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: w * 0.032, color: C.fg3 }}>{HERO.name}</div>
    </div>
  );
};

const PhotoImg: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={src.startsWith('http') ? src : staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />
);

/** The opening lockup: the round icon builds, the name rises under it, then the icon glides into the corner. */
const LogoOpening: React.FC = () => {
  const t = useT();
  const { vertical, width, height, gutter } = useLayout();
  const move = ease(t, I_GLIDE, 22, EASE_INOUT);
  const icon = useSpringAt(1, SPRING_POP);
  const size0 = vertical ? 300 : 230;
  const size1 = vertical ? 92 : 76;
  const cx0 = width / 2;
  const cy0 = vertical ? height * 0.38 : height * 0.36;
  const x = interpolate(move, [0, 1], [cx0 - size0 / 2, gutter]);
  const y = interpolate(move, [0, 1], [cy0 - size0 / 2, vertical ? 118 : 58]);
  const size = interpolate(move, [0, 1], [size0, size1]);
  const nameOut = ease(t, I_GLIDE - 4, 12);
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, zIndex: 5, transform: `scale(${move > 0 ? 1 : icon})` }}>
        <div style={{ width: size, height: size, borderRadius: '50%', background: '#080808', display: 'grid', placeItems: 'center', overflow: 'hidden', boxShadow: move < 1 ? SHADOW.filmCard : undefined }}>
          <MarkBuild height={size * 0.57} delay={4} />
        </div>
      </div>
      {nameOut < 1 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: cy0 + size0 / 2 + (vertical ? 60 : 44), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: vertical ? 34 : 26, opacity: 1 - nameOut, transform: `translateY(${-nameOut * 40}px)` }}>
          <Wordmark size={vertical ? 104 : 128} delay={12} stagger={3.6} />
          <div style={{ opacity: ease(t, 48, 12), transform: `translateY(${(1 - ease(t, 48, 12)) * 14}px)` }}>
            <TaglinePill height={vertical ? 58 : 52} />
          </div>
        </div>
      ) : null}
    </>
  );
};

export const Intro: React.FC = () => {
  const t = useT();
  const { vertical, width, gutter } = useLayout();
  const look = heroLook(t);
  const tint = t >= I_STAGE ? HERO.tint(look.color) : C.accent;
  const pill = useSpringAt(I_PILL, SPRING_POP);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Glow tint={tint} strength={1.4} />
      <LogoOpening />
      <div style={{ position: 'absolute', left: gutter, top: vertical ? 250 : 190, width: vertical ? width - gutter * 2 : 900 }}>
        {t >= I_HEAD - 6 ? (
          <Kicker size={vertical ? 26 : 22} dot={tint} delay={I_HEAD - 4}>
            {FILM.intro.kicker}
          </Kicker>
        ) : null}
        {t >= I_HEAD - 2 ? <Display text={FILM.intro.headline} size={vertical ? 146 : 118} fit={vertical ? width - gutter * 2 : 900} delay={I_HEAD} mark={FILM.intro.mark} markColor={tint} markInk={inkOn(tint)} lineHeight={0.86} style={{ marginTop: vertical ? 30 : 26 }} /> : null}
        {t >= I_LEAD - 2 ? (
          <Body size={vertical ? 40 : 34} delay={I_LEAD} style={{ marginTop: vertical ? 30 : 28 }}>
            {FILM.intro.lead}
          </Body>
        ) : null}
        {t >= I_PILL ? (
          <div style={{ marginTop: vertical ? 26 : 24, opacity: Math.min(1, pill * 1.4), transform: `scale(${interpolate(pill, [0, 1], [0.8, 1])})`, transformOrigin: '0 50%' }}>
            <Pill icon={<TruckIcon size={vertical ? 30 : 26} weight="bold" />} size={vertical ? 32 : 28}>
              {FILM.intro.pill}
            </Pill>
          </div>
        ) : null}
      </div>
      {t >= I_STAGE - 1 ? (
        <div style={{ position: 'absolute', left: vertical ? 320 : 1170, top: vertical ? 1000 : 110 }}>
          <HeroStage w={vertical ? 600 : 600} t={t} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* =============================================================== 2 weights */
// "Pick your weight" rows rise · "230 GSM for every day" the first lights up · "320 GSM heavyweight"
// the last · "Higher number, thicker cotton" the lighter-to-heavier scale draws under them
const W_FROM = k(cue('weights', 'from', 45) - 6, 20, 80);
const W_LOW = k(cue('weights', '230', 54) - 2, W_FROM + 6, 110);
const W_DAY = k(cue('weights', 'every', 126) - 4, W_LOW + 20, 170);
const W_HIGH = k(cue('weights', '320', 171) - 2, W_DAY + 10, 230);
const W_HEAVY = k(cue('weights', 'heavyweight', 242) - 4, W_HIGH + 16, 280);
const W_LEGEND = k(cue('weights', 'thicker', 310) - 8, W_HEAVY + 16, DUR.weights - 30);
export const WEIGHTS_T = { rows: WEIGHTS.map((_, i) => W_FROM + i * 5), low: W_LOW, high: W_HIGH, legend: W_LEGEND };

export const Weights: React.FC = () => {
  const t = useT();
  const st = useStage();
  const { vertical, panel } = st;
  const dayPop = useSpringAt(W_DAY, SPRING_POP);
  const heavyPop = useSpringAt(W_HEAVY, SPRING_POP);
  const lo = WEIGHTS[0].gsm ?? 230;
  const hi = WEIGHTS[WEIGHTS.length - 1].gsm ?? 320;
  const x0 = panel.x + (vertical ? 36 : 40);
  const w = panel.w - (vertical ? 72 : 80);
  const top = vertical ? panel.y + 40 : panel.y + 60;
  const rowH = vertical ? 100 : 112;
  const gap = vertical ? 12 : 14;
  return (
    <ChapterFrame
      ch={{ badge: FILM.weights.badge, headline: FILM.weights.headline, mark: FILM.weights.mark }}
      demo={
        <>
          {WEIGHTS.map((p, i) => {
            const at = W_FROM + i * 5;
            const s = useSpringAt(at, { damping: 17, stiffness: 140, mass: 0.8 });
            if (t < at - 1) return null;
            const fill = 0.3 + (((p.gsm ?? lo) - lo) / Math.max(1, hi - lo)) * 0.7;
            const grow = ease(t, at + 4, 22);
            const isLow = i === 0;
            const isHigh = i === WEIGHTS.length - 1;
            const lit = (isLow && t >= W_LOW) || (isHigh && t >= W_HIGH) ? 1 : 0;
            const litP = isLow ? ease(t, W_LOW, 10) : isHigh ? ease(t, W_HIGH, 10) : 0;
            const tag = isLow && t >= W_DAY ? 'Everyday' : isHigh && t >= W_HEAVY ? 'Heavyweight' : null;
            const tagP = isLow ? dayPop : isHigh ? heavyPop : 0;
            return (
              <div
                key={p.slug}
                style={{
                  position: 'absolute',
                  left: x0,
                  top: top + i * (rowH + gap),
                  width: w,
                  height: rowH,
                  borderRadius: 24,
                  background: C.surface,
                  border: `1.5px solid ${lit ? C.accent : C.border}`,
                  boxShadow: litP ? `0 0 0 ${6 * litP}px ${C.accentSoft}, ${SHADOW.filmCard}` : '0 8px 24px -16px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: vertical ? 20 : 22,
                  padding: `0 ${vertical ? 16 : 18}px 0 ${vertical ? 26 : 28}px`,
                  boxSizing: 'border-box',
                  opacity: Math.min(1, s * 1.6),
                  transform: `translateX(${(1 - s) * 140}px)`,
                  overflow: 'hidden',
                }}
              >
                {/* the rising fill, as on the home page's weight cards */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * grow * 100}%`, borderRight: `3px solid ${C.accent}`, background: `linear-gradient(to right, ${C.accent}08, ${C.accent}30)` }} />
                <div style={{ position: 'relative', width: vertical ? 158 : 170, flexShrink: 0 }}>
                  <Big size={vertical ? 66 : 72}>{p.gsm}</Big>
                </div>
                <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label size={vertical ? 20 : 21} color={C.fg2}>
                    GSM · {p.kindLabel}
                  </Label>
                  <span style={{ fontFamily: BODY, fontWeight: 650, fontSize: vertical ? 24 : 26, color: C.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                </div>
                {tag ? (
                  <span style={{ position: 'relative', borderRadius: 999, background: C.accent, color: '#fff', padding: '8px 18px', fontFamily: BODY, fontWeight: 800, fontSize: vertical ? 22 : 24, transform: `scale(${tagP})` }}>{tag}</span>
                ) : null}
                <span style={{ position: 'relative', fontFamily: BODY, fontWeight: 750, fontSize: vertical ? 26 : 28, color: C.fg, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.price)}</span>
                <span style={{ position: 'relative', width: rowH - 24, height: rowH - 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: C.photoBg, boxShadow: `0 0 0 3px ${C.surface}` }}>
                  <PhotoImg src={p.photo()} />
                </span>
              </div>
            );
          })}
          {/* LIGHTER ——— HEAVIER */}
          {t >= W_LEGEND ? (
            <div style={{ position: 'absolute', left: x0, top: top + WEIGHTS.length * (rowH + gap) + (vertical ? 10 : 6), width: w, display: 'flex', alignItems: 'center', gap: 18, opacity: ease(t, W_LEGEND, 10) }}>
              <Label size={vertical ? 24 : 24}>Lighter</Label>
              <div style={{ flex: 1, height: 4, borderRadius: 4, background: `linear-gradient(90deg, ${C.borderStrong}, ${C.accent})`, transform: `scaleX(${ease(t, W_LEGEND, 18)})`, transformOrigin: 'left' }} />
              <Label size={vertical ? 24 : 24} color={C.accentText}>
                Heavier
              </Label>
            </div>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 3 range */
// "Plain tees" · "two tone raglans" · "long sleeves" · "the summer patch tee" · "tracker caps in 19 colours"
const R_AT = {
  tees: k(cue('range', 'tees', 20) - 6, 8, 40),
  raglans: k(cue('range', 'raglans', 71) - 8, 40, 100),
  long: k(cue('range', 'long', 102) - 6, 70, 130),
  summer: k(cue('range', 'summer', 150) - 4, 120, 190),
  caps: k(cue('range', 'tracker', 200) - 6, 160, 230),
  nineteen: k(cue('range', '19', 234) - 4, 200, DUR.range - 30),
};
export const RANGE_T = R_AT;
const SUMMER = piece('summertee');

type Tile = { kind: string; label: string; from: number; at: number; looks: { p: Piece; color?: string }[]; gsm: string };
const kindOf = (kind: string) => KINDS.find((x) => x.kind === kind)!;
const gsmRange = (ps: Piece[]) => {
  const g = [...new Set(ps.map((p) => p.gsm).filter(Boolean) as number[])].sort((a, b) => a - b);
  return g.length ? `${g.join(' · ')} GSM` : '';
};
const TILES: Tile[] = [
  { kind: 'tees', at: R_AT.tees, looks: kindOf('tees').pieces.filter((p) => p.slug !== 'summertee').sort((a, b) => (a.gsm ?? 0) - (b.gsm ?? 0)).map((p) => ({ p, color: p.slug === '230gsmplaintshirt' ? 'BLACK' : undefined })) },
  { kind: 'raglans', at: R_AT.raglans, looks: kindOf('raglans').pieces.map((p) => ({ p, color: p.colors.find((c) => /RED|GREEN|BLUE/.test(c)) })) },
  { kind: 'long-sleeve', at: R_AT.long, looks: kindOf('long-sleeve').pieces.map((p) => ({ p, color: p.colors.find((c) => /WINE|GREEN/.test(c)) })) },
  { kind: 'caps', at: R_AT.caps, looks: [{ p: CAPS }] },
].map((x) => {
  const kd = kindOf(x.kind);
  return { ...x, label: kd.label, from: kd.from, gsm: x.kind === 'caps' ? `${CAPS.colors.length} colours` : gsmRange(kd.pieces) };
});

export const Range: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const summerPop = useSpringAt(R_AT.summer, SPRING_POP);
  const tw = vertical ? 420 : 372;
  const th = tw * 1.22;
  const gap = vertical ? 24 : 22;
  const gx = panel.x + (panel.w - (tw * 2 + gap)) / 2;
  const gy = vertical ? panel.y + 36 : panel.y + (panel.h - (th * 2 + gap)) / 2;
  return (
    <ChapterFrame
      ch={{ badge: FILM.range.badge, headline: FILM.range.headline, mark: 'colour.' }}
      demo={
        <>
          {TILES.map((tile, i) => {
            const s = useSpringAt(tile.at, { damping: 15, stiffness: 120, mass: 0.9 });
            if (t < tile.at - 1) return null;
            const isTees = tile.kind === 'tees';
            const summer = isTees && t >= R_AT.summer;
            const looks = tile.looks;
            const period = 22;
            const j = Math.max(0, Math.floor((t - tile.at - 10) / period));
            const look = summer ? { p: SUMMER, color: 'BLACK/WHITE' } : looks[j % looks.length];
            const prev = summer ? looks[j % looks.length] : looks[(j + looks.length - 1) % looks.length];
            const mix = summer ? ease(t, R_AT.summer, 10) : j === 0 ? 1 : ease(t, tile.at + 10 + j * period, 8);
            const x = gx + (i % 2) * (tw + gap);
            const y = gy + Math.floor(i / 2) * (th + gap);
            return (
              <div key={tile.kind} style={{ position: 'absolute', left: x, top: y, width: tw, height: th, borderRadius: 32, overflow: 'hidden', background: C.photoBg, boxShadow: SHADOW.filmCard, opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 200}px) rotate(${(1 - s) * (i % 2 ? 6 : -6)}deg)` }}>
                <PhotoImg src={prev.p.photo(prev.color)} />
                <PhotoImg src={look.p.photo(look.color)} style={{ opacity: mix, transform: `scale(${1.05 - 0.05 * mix})` }} />
                <span style={{ position: 'absolute', left: 14, top: 14, borderRadius: 999, background: C.accent, color: '#fff', padding: '7px 16px', fontFamily: MONO, fontWeight: 700, fontSize: vertical ? 19 : 17, letterSpacing: '0.04em', boxShadow: SHADOW.pill }}>{tile.gsm}</span>
                {summer ? (
                  <span style={{ position: 'absolute', right: 14, top: 14, borderRadius: 999, background: C.ink, color: '#fff', padding: '7px 16px', fontFamily: BODY, fontWeight: 700, fontSize: vertical ? 20 : 18, transform: `scale(${summerPop})` }}>{SUMMER.name}</span>
                ) : null}
                {/* the frosted label (.typeBar) */}
                <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 22, background: 'rgba(255,255,255,0.92)', boxShadow: SHADOW.pill, color: C.ink, padding: '14px 12px 14px 20px' }}>
                  <span style={{ display: 'grid', gap: 4 }}>
                    <Big size={vertical ? 34 : 30} color={C.ink}>
                      {tile.label}
                    </Big>
                    <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: vertical ? 22 : 20, color: '#5d5a54' }}>from {formatCurrency(tile.from)}</span>
                  </span>
                  <span style={{ width: 48, height: 48, borderRadius: 999, background: C.ink, color: '#fff', display: 'grid', placeItems: 'center' }}>
                    <ArrowUpRightIcon size={22} />
                  </span>
                </div>
              </div>
            );
          })}
          {/* nineteen cap colours */}
          {t >= R_AT.nineteen ? (
            <Float x={vertical ? gx + tw + gap - 40 : gx + tw - 40} y={vertical ? gy + th * 2 + gap - 40 : gy + th * 2 + gap - 110} delay={R_AT.nineteen} from="pop" rotate={-3} z={60}>
              <Card style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 9, width: vertical ? 470 : 430 }} r={28}>
                {CAPS.colors.map((c, i) => (
                  <span key={c} style={{ width: vertical ? 34 : 31, height: vertical ? 34 : 31, borderRadius: 999, background: CAPS.swatch(c), boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14)', transform: `scale(${ease(t, R_AT.nineteen + 2 + i * 0.8, 8)})` }} />
                ))}
                <span style={{ gridColumn: 'span 1', display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 700, fontSize: vertical ? 20 : 18, color: C.fg }}>{CAPS.colors.length}</span>
              </Card>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 4 quality */
// "one hundred percent cotton" · "boxy" · "true to size" the facts · "Buy ten or more ... wholesale price"
// the bulk meter fills · "And we print your designs too" the print card
const Q_FACTS = [
  k(cue('quality', 'cotton', 73) - 6, 20, 100),
  k(cue('quality', 'boxy', 103) - 6, 60, 130),
  k(cue('quality', 'true', 135) - 6, 90, 160),
  k(cue('quality', 'size', 154) + 6, 110, 180),
];
const Q_BULK = k(cue('quality', 'buy', 194) - 6, Q_FACTS[3] + 10, 230);
const Q_FILL = k(cue('quality', 'wholesale', 265) - 6, Q_BULK + 30, 290);
const Q_PRINT = k(cue('quality', 'print', 323) - 8, Q_FILL + 20, DUR.quality - 50);
export const QUALITY_T = { facts: Q_FACTS, bulk: Q_BULK, fill: Q_FILL, print: Q_PRINT };
const HEAVY = piece('320gsmheavytshirt');

export const Quality: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const rule = HERO.bulk!;
  const n = Math.round(interpolate(t, [Q_BULK + 10, Q_FILL], [3, rule.minQuantity], { ...clamp, easing: EASE_INOUT }));
  const on = n >= rule.minQuantity;
  const onP = ease(t, Q_FILL, 10);
  const cw = vertical ? 430 : 400;
  const cx = panel.x + (vertical ? 40 : 40);
  const cy = vertical ? panel.y + 40 : panel.y + 100;
  return (
    <ChapterFrame
      ch={{ badge: FILM.quality.badge, headline: FILM.quality.headline, mark: FILM.quality.mark }}
      demo={
        <>
          {/* the heaviest tee, with the facts from its product page */}
          <Float x={cx} y={cy} delay={8} rotate={-3} out={Q_BULK - 6}>
            <div style={{ position: 'relative', width: cw, height: cw * 1.25, borderRadius: 32, overflow: 'hidden', background: C.photoBg, boxShadow: SHADOW.filmCard }}>
              <PhotoImg src={HEAVY.photo('BLACK')} />
              <span style={{ position: 'absolute', left: 16, top: 16, borderRadius: 999, background: C.accent, color: '#fff', padding: '8px 18px', fontFamily: MONO, fontWeight: 700, fontSize: 22 }}>{HEAVY.gsm} GSM</span>
            </div>
          </Float>
          {FILM.quality.facts.map((fact, i) => (
            <Float key={fact} x={vertical ? cx + cw + 30 : cx + cw + 40} y={cy + 40 + i * (vertical ? 128 : 118)} delay={Q_FACTS[i]} from="right" out={Q_BULK - 8 + i * 2}>
              <Pill icon={<CheckIcon size={vertical ? 26 : 24} />} tone={C.success} size={vertical ? 30 : 30}>
                {fact}
              </Pill>
            </Float>
          ))}
          {/* bulk pricing: the product page's bulk meter at film scale */}
          <Float x={panel.x + (vertical ? 40 : 50)} y={vertical ? panel.y + 200 : panel.y + 180} delay={Q_BULK} out={Q_PRINT - 8}>
            <Card style={{ width: panel.w - (vertical ? 80 : 100), padding: vertical ? '34px 36px' : '34px 40px', border: `2px solid ${on ? C.success : C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
                <span style={{ position: 'relative', width: 120, height: 150, borderRadius: 20, overflow: 'hidden', flexShrink: 0, background: C.photoBg }}>
                  <PhotoImg src={HERO.photo('WINE')} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BODY, fontWeight: 650, fontSize: vertical ? 28 : 28, color: C.fg2 }}>{HERO.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 6 }}>
                    <Big size={vertical ? 70 : 68} color={on ? C.success : C.fg}>
                      {formatCurrency(on ? rule.unitPrice : HERO.price)}
                    </Big>
                    {on ? <s style={{ fontFamily: BODY, fontWeight: 600, fontSize: 32, color: C.fg3 }}>{formatCurrency(HERO.price)}</s> : null}
                  </div>
                  <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24, color: C.fg3, marginTop: 4 }}>each</div>
                </div>
              </div>
              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontWeight: 750, fontSize: vertical ? 29 : 28, color: on ? C.success : C.fg }}>
                <span>{on ? `Wholesale price on · ${formatCurrency(rule.unitPrice)} each` : `Buy ${rule.minQuantity}+, pay ${formatCurrency(rule.unitPrice)} each`}</span>
                <span style={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                  {n}/{rule.minQuantity}
                </span>
              </div>
              <div style={{ marginTop: 16, height: 14, borderRadius: 99, background: C.surface3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(n / rule.minQuantity) * 100}%`, borderRadius: 99, background: on ? C.success : C.accent }} />
              </div>
              <div style={{ marginTop: 16, fontFamily: BODY, fontWeight: 600, fontSize: vertical ? 26 : 25, color: C.fg3 }}>{on ? `You save ${formatCurrency((HERO.price - rule.unitPrice) * n)} · mix any size and colour` : 'Mix any size and colour'}</div>
              {onP > 0 ? <div style={{ marginTop: 10, transform: `scale(${0.9 + 0.1 * onP})`, opacity: onP }} /> : null}
            </Card>
          </Float>
          {/* custom print: the home page's print card at film scale */}
          <Float x={panel.x + (vertical ? 40 : 50)} y={vertical ? panel.y + 50 : panel.y + 120} delay={Q_PRINT} from="below" rotate={-1.5}>
            <PrintCard w={panel.w - (vertical ? 80 : 100)} t={t} />
          </Float>
        </>
      }
    />
  );
};

const PrintCard: React.FC<{ w: number; t: number }> = ({ w, t }) => {
  const shots = ['BLACK', 'WINE', 'WHITE'];
  const { vertical } = useLayout();
  return (
    <div style={{ position: 'relative', width: w, borderRadius: 40, background: C.inverse, color: C.onInverse, padding: vertical ? '44px 44px 48px' : '40px 44px', boxSizing: 'border-box', overflow: 'hidden', boxShadow: SHADOW.filmCard }}>
      <div style={{ position: 'absolute', right: -120, bottom: -260, width: 640, height: 640, background: `radial-gradient(closest-side, ${C.accent}, transparent)`, opacity: 0.5 }} />
      <div style={{ position: 'relative', height: vertical ? 330 : 280 }}>
        {shots.map((c, i) => {
          const p = ease(t, Q_PRINT + 6 + i * 4, 14);
          const rot = [-9, 2, 10][i];
          return (
            <span key={c} style={{ position: 'absolute', left: `${[2, 30, 58][i]}%`, top: [26, 0, 36][i], width: '40%', aspectRatio: '4 / 5', borderRadius: 22, overflow: 'hidden', background: C.photoBg, boxShadow: '0 30px 50px -24px rgba(0,0,0,0.6)', transform: `rotate(${rot * p}deg) translateY(${(1 - p) * 60}px)`, opacity: p, zIndex: i === 1 ? 2 : 1 }}>
              <PhotoImg src={HERO.photo(c)} />
              <span style={{ position: 'absolute', top: '31%', left: '50%', width: '36%', aspectRatio: '1.3', display: 'grid', placeItems: 'center', border: '2px dashed #fff', borderRadius: 6, color: '#fff', mixBlendMode: 'difference', fontFamily: DISPLAY, fontVariationSettings: WIDE, fontWeight: 900, fontSize: vertical ? 17 : 14, lineHeight: 1, textAlign: 'center', textTransform: 'uppercase', transform: 'translateX(-50%)' }}>
                Your
                <br />
                logo
              </span>
            </span>
          );
        })}
      </div>
      <div style={{ position: 'relative', marginTop: vertical ? 30 : 20 }}>
        <Display text={FILM.quality.print.title} size={vertical ? 86 : 68} color={C.onInverse} delay={Q_PRINT + 4} lineHeight={0.88} />
        <div style={{ marginTop: 18, fontFamily: BODY, fontWeight: 500, fontSize: vertical ? 30 : 27, color: 'rgba(255,255,255,0.66)' }}>{FILM.quality.print.text}</div>
        <div style={{ marginTop: 26, display: 'inline-flex', alignItems: 'center', gap: 14, height: 84, borderRadius: 999, background: C.whatsapp, color: C.whatsappInk, padding: '0 36px 0 26px', fontFamily: BODY, fontWeight: 800, fontSize: 30, transform: `scale(${useSpringAt(Q_PRINT + 18, SPRING_POP)})`, transformOrigin: '0 50%' }}>
          <WhatsappIcon size={36} />
          {FILM.quality.print.cta}
        </div>
      </div>
    </div>
  );
};

/* =============================================================== 5 how to order */
// "Ordering takes a minute" the headline · "Here's exactly how" the three steps from the home page
const H_STEPS = k(cue('howto', 'exactly', 69) - 10, 30, DUR.howto - 50);
export const HOWTO_T = { steps: [0, 1, 2].map((i) => H_STEPS + i * 7) };
const STEP_ICONS = [PaletteIcon, TShirtIcon, MobilePayIcon];

export const HowTo: React.FC = () => {
  const t = useT();
  const { vertical, width, gutter } = useLayout();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Glow />
      <TopBar />
      <div style={{ position: 'absolute', left: gutter, top: vertical ? 280 : 250, width: vertical ? width - gutter * 2 : 760 }}>
        <Kicker size={vertical ? 28 : 24} delay={2}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <TimerIcon size={vertical ? 30 : 26} weight="bold" /> {FILM.howto.time}
          </span>
        </Kicker>
        <Display text={FILM.howto.headline} size={vertical ? 190 : 170} fit={vertical ? width - gutter * 2 : 760} delay={4} mark={FILM.howto.mark} style={{ marginTop: 34 }} />
      </div>
      <div style={{ position: 'absolute', left: vertical ? gutter : 900, top: vertical ? 860 : 250, width: vertical ? width - gutter * 2 : 900 }}>
        <div style={{ borderRadius: 36, background: C.surface, border: `1.5px solid ${C.border}`, boxShadow: SHADOW.filmCard, overflow: 'hidden' }}>
          {FILM.howto.steps.map(([title, text], i) => {
            const Icon = STEP_ICONS[i];
            const s = useSpringAt(HOWTO_T.steps[i], { damping: 16, stiffness: 150, mass: 0.8 });
            return (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 30, padding: vertical ? '34px 36px' : '30px 34px', borderTop: i ? `1.5px solid ${C.border}` : 'none', opacity: Math.min(1, s * 1.6), transform: `translateX(${(1 - s) * 120}px)` }}>
                <span style={{ position: 'relative', width: 104, height: 104, borderRadius: 30, background: C.surface2, display: 'grid', placeItems: 'center', color: C.fg, flexShrink: 0 }}>
                  <Icon size={50} weight="duotone" />
                  <span style={{ position: 'absolute', top: -10, right: -10, width: 42, height: 42, borderRadius: 999, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 22, boxShadow: `0 0 0 5px ${C.surface}` }}>{i + 1}</span>
                </span>
                <span style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ fontFamily: BODY, fontWeight: 750, fontSize: vertical ? 44 : 40, color: C.fg }}>{title}</strong>
                  <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: vertical ? 30 : 28, color: C.fg3 }}>{text}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* =============================================================== 6 colour */
// "Open any piece" a tap on the 230 GSM tee in the shop · "Step one, tap a colour" Wine
// "the photo shows it" the page scrolls back to the photo, now in wine
const SHOP_SCROLL = 680;
const CARD = { x: 201 + 86, y: 954 + 140 };
const C_OPEN = k(cue('colour', 'piece', 17) - 2, 8, 30);
const C_PAGE = C_OPEN + 6;
const C_DOWN = k(cue('colour', 'step', 53) - 6, C_PAGE + 10, 70);
const C_TAP = k(cue('colour', 'tap', 85) + 4, C_DOWN + 18, 110);
const C_PHOTO = k(cue('colour', 'photo', 131) - 10, C_TAP + 14, DUR.colour - 30);
const PDP_SW = { WINE: { x: 42, y: 932 }, BLACK: { x: 42, y: 858 } };
export const COLOUR_T = { open: C_OPEN, tap: C_TAP };

export const Colour: React.FC = () => {
  const t = useT();
  const { vertical } = useStage();
  const shopScroll = smooth(t, 0, 14, 520, SHOP_SCROLL);
  const page = ease(t, C_PAGE, 12, EASE_INOUT);
  const scroll = path(t, [
    [C_DOWN, 0],
    [C_DOWN + 16, 330],
    [C_PHOTO, 330],
    [C_PHOTO + 14, 150],
  ]);
  const color = t >= C_TAP + 2 ? 'WINE' : 'BLACK';
  const mix = t >= C_TAP + 2 ? ease(t, C_TAP + 2, 12) : 1;
  const cardPress = usePress(C_OPEN);
  const swPress = usePress(C_TAP);
  return (
    <ChapterFrame
      ch={ch.colour}
      tint={t >= C_TAP ? HERO.tint('WINE') : C.accent}
      demo={
        <>
          <RisingPhone delay={2}>
            <AppScreen time="10:12">
              {page < 1 ? <ShopScreen scroll={shopScroll} pressSlug={HERO.slug} press={cardPress} /> : null}
              {t >= C_PAGE ? (
                <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - page) * 100}%)`, background: 'var(--bg)' }}>
                  <ProductScreen p={HERO} color={color} prevColor="BLACK" photoMix={mix} qty={{}} scroll={scroll} swatchPress={['WINE', swPress]} />
                </div>
              ) : null}
            </AppScreen>
            <Tap x={CARD.x} y={CARD.y - SHOP_SCROLL} at={C_OPEN} />
            <Tap x={PDP_SW.WINE.x} y={PDP_SW.WINE.y - 330} at={C_TAP} />
          </RisingPhone>
          {t >= C_TAP + 4 ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1240 : 640} delay={C_TAP + 4} from="left" rotate={-3} z={60}>
              <Pill icon={<span style={{ width: '62%', height: '62%', borderRadius: 999, background: HERO.swatch('WINE'), boxShadow: '0 0 0 3px #fff' }} />} tone={C.surface2} size={vertical ? 34 : 30}>
                Colour: Wine
              </Pill>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 7 sizes */
// "tap your sizes" L, then L again · "Mix sizes and colours" Black, XL · "your total updates" the
// summary · "Then tap buy now" the button, and checkout slides in
const SZ = { L: { x: 195, y: 1085 }, Lplus: { x: 232, y: 1104 }, XL: { x: 317, y: 1085 }, buy: { x: 195, y: 1651 } };
const S_TAP1 = k(cue('size', 'tap', 40), 22, 60);
const S_TAP2 = k(cue('size', 'sizes', 52) + 6, S_TAP1 + 10, 80);
const S_MIX = k(cue('size', 'mix', 91) - 4, S_TAP2 + 12, 110);
const S_BLACK = S_MIX + 16;
const S_BACK = S_BLACK + 8;
const S_XL = k(cue('size', 'colours', 126) + 2, S_BACK + 16, 150);
const S_TOTAL = k(cue('size', 'total', 164) - 8, S_XL + 10, 190);
const S_THEN = k(cue('size', 'then', 213) - 4, S_TOTAL + 20, 230);
const S_BUY = k(cue('size', 'buy', 226) + 2, S_THEN + 14, DUR.size - 30);
export const SIZE_T = { taps: [S_TAP1, S_TAP2, S_BLACK, S_XL], total: S_TOTAL, buy: S_BUY };
const SIZES_SCROLL = 600;
const qtyAt = (t: number): Qty => {
  const q: Qty = {};
  if (t >= S_TAP1 + 1) q.WINE = { L: t >= S_TAP2 + 1 ? 2 : 1 };
  if (t >= S_XL + 1) q.BLACK = { XL: 1 };
  return q;
};
export const productAt = (t: number) => ({
  color: t >= S_BLACK + 2 ? 'BLACK' : 'WINE',
  scroll: path(t, [
    [0, 330],
    [S_TAP1 - 16, 330],
    [S_TAP1 - 2, SIZES_SCROLL],
    [S_MIX, SIZES_SCROLL],
    [S_MIX + 12, 330],
    [S_BACK, 330],
    [S_BACK + 12, SIZES_SCROLL],
    [S_TOTAL, SIZES_SCROLL],
    [S_TOTAL + 14, 860],
    [S_THEN, 860],
    [S_THEN + 12, 1000],
  ]),
});

export const Sizes: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const { color, scroll } = productAt(t);
  const p1 = usePress(S_TAP1);
  const p2 = usePress(S_TAP2);
  const pXL = usePress(S_XL);
  const pBlack = usePress(S_BLACK);
  const buyPress = usePress(S_BUY);
  const drawer = ease(t, S_BUY + 6, 14, EASE_INOUT);
  const sizePress: [string, number] = t < S_TAP2 + 8 ? ['L', Math.min(p1, p2)] : ['XL', pXL];
  return (
    <ChapterFrame
      ch={ch.size}
      demo={
        <>
          <RisingPhone delay={0}>
            <AppScreen time="10:13">
              <ProductScreen p={HERO} color={color} qty={qtyAt(t)} scroll={scroll} sizePress={sizePress} swatchPress={['BLACK', pBlack]} buyPress={buyPress} />
              {drawer > 0 ? (
                <Drawer open={drawer} title="Checkout">
                  <DetailsStep t={t} name="" phone="" email="" focus={null} />
                </Drawer>
              ) : null}
            </AppScreen>
            <Tap x={SZ.L.x} y={SZ.L.y - SIZES_SCROLL} at={S_TAP1} />
            <Tap x={SZ.Lplus.x} y={SZ.Lplus.y - SIZES_SCROLL} at={S_TAP2} />
            <Tap x={PDP_SW.BLACK.x} y={PDP_SW.BLACK.y - 330} at={S_BLACK} />
            <Tap x={SZ.XL.x} y={SZ.XL.y - SIZES_SCROLL} at={S_XL} />
            <Tap x={SZ.buy.x} y={SZ.buy.y - 1000} at={S_BUY} />
          </RisingPhone>
          {t >= S_TOTAL + 6 ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1300 : 640} delay={S_TOTAL + 6} from="left" rotate={-2.5} out={S_BUY - 4} z={60}>
              <Card style={{ padding: vertical ? '26px 34px' : '24px 30px' }}>
                <Label size={vertical ? 22 : 20}>3 pieces · service fee 2%</Label>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <span style={{ fontFamily: BODY, fontWeight: 650, fontSize: vertical ? 32 : 28, color: C.fg2 }}>Total</span>
                  <Big size={vertical ? 64 : 56}>{formatCurrency(STORY.orderTotal)}</Big>
                </div>
              </Card>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 8 your details */
// "three quick steps" the steps · "your name" typed · "your phone number for SMS updates" typed, and
// the SMS line lights up · "your email for the receipt" typed, the receipt hint · Continue
const D_STEPS = k(cue('details', 'three', 43) - 4, 20, 70);
const D_NAME = k(cue('details', 'name', 111) - 8, D_STEPS + 30, 130);
const D_PHONE = k(cue('details', 'phone', 142) - 6, typeEnd(STORY.buyer.name, D_NAME, 1) + 4, 170);
const D_SMS = k(cue('details', 'sms', 170) - 4, typeEnd(STORY.buyer.phone, D_PHONE, 1.1) + 2, 200);
const D_EMAIL = k(cue('details', 'email', 232) - 10, D_SMS + 20, 245);
const D_RECEIPT = k(cue('details', 'receipt', 255) - 6, typeEnd(STORY.buyer.email, D_EMAIL, 1.7) + 2, 265);
const D_GO = k(DUR.details - 20, D_RECEIPT + 14, DUR.details - 10);
export const DETAILS_T = { steps: D_STEPS, name: D_NAME, phone: D_PHONE, email: D_EMAIL, sms: D_SMS, go: D_GO, cps: [1, 1.1, 1.7] };
const FIELD_Y = { name: 355, phone: 452, email: 548, cta: 723 };

export const Details: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const name = typed(STORY.buyer.name, t, D_NAME, 1);
  const phone = typed(STORY.buyer.phone, t, D_PHONE, 1.1);
  const email = typed(STORY.buyer.email, t, D_EMAIL, 1.7);
  const focus = t < D_NAME - 2 ? null : t < D_PHONE - 2 ? 'fullName' : t < D_EMAIL - 2 ? 'phone' : t < D_GO - 10 ? 'email' : null;
  const lift = useLift(D_GO - 10, undefined, 150);
  return (
    <ChapterFrame
      ch={ch.details}
      demo={
        <>
          <RisingPhone delay={0} dy={lift}>
            <AppScreen time="10:14">
              <ProductScreen p={HERO} color="BLACK" qty={qtyAt(1e9)} scroll={1000} />
              <Drawer open={1} title="Checkout">
                <DetailsStep t={t} name={name} phone={phone} email={email} focus={focus} press={usePress(D_GO)} leadGlow={ease(t, D_SMS, 10) * (1 - ease(t, D_EMAIL, 10))} hintGlow={ease(t, D_RECEIPT, 10)} />
              </Drawer>
            </AppScreen>
            <Tap x={195} y={FIELD_Y.name} at={D_NAME - 2} />
            <Tap x={195} y={FIELD_Y.phone} at={D_PHONE - 2} />
            <Tap x={195} y={FIELD_Y.email} at={D_EMAIL - 2} />
            <Tap x={195} y={FIELD_Y.cta} at={D_GO} />
          </RisingPhone>
          {t >= D_STEPS ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1290 : 640} delay={D_STEPS} from="pop" out={D_NAME + 4} z={60}>
              <StepStrip steps={['Details', 'Delivery', 'Pay']} delay={D_STEPS} size={vertical ? 1 : 0.9} />
            </Float>
          ) : null}
          {t >= D_SMS ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1300 : 640} delay={D_SMS} from="left" rotate={-2} out={D_EMAIL} z={60}>
              <Pill icon={<ChatTextIcon size={vertical ? 30 : 26} weight="fill" />} tone={C.success} size={vertical ? 32 : 28}>
                Order updates by SMS
              </Pill>
            </Float>
          ) : null}
          {t >= D_RECEIPT ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1300 : 640} delay={D_RECEIPT} from="left" rotate={-2} z={60}>
              <Pill icon={<CheckIcon size={vertical ? 28 : 24} />} size={vertical ? 32 : 28}>
                Payment receipt by email
              </Pill>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 9 delivery */
// "pick your town" search, Madina typed · "over one hundred and sixty places across Ghana" the
// places card · Madina picked · "the delivery price shows right away" the price · address · Continue
const V_SEARCH = k(cue('delivery', 'pick', 23) - 8, 8, 40);
const V_TYPE = V_SEARCH + 6;
const V_PLACES = k(cue('delivery', 'one', 81) - 6, typeEnd(STORY.search, V_TYPE, 0.45) + 4, 110);
const V_PICK = k(cue('delivery', 'ghana', 146) + 6, V_PLACES + 30, 175);
const V_PRICE = k(cue('delivery', 'price', 192) - 6, V_PICK + 12, 210);
const V_ADDR = V_PRICE + 10;
const V_GO = k(DUR.delivery - 20, typeEnd(STORY.address, V_ADDR + 4, 1.5) + 10, DUR.delivery - 10);
export const DELIVERY_T = { search: V_SEARCH, type: V_TYPE, places: V_PLACES, pick: V_PICK, price: V_PRICE, addr: V_ADDR, go: V_GO };
const MADINA_Y = 640;

export const Delivery: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const chosen = t >= V_PICK + 4;
  const focus = t < V_SEARCH ? null : !chosen ? 'search' : t >= V_ADDR && t < V_GO - 10 ? 'address' : null;
  const lift = useLift(V_GO - 10, undefined, 150);
  return (
    <ChapterFrame
      ch={ch.delivery}
      demo={
        <>
          <RisingPhone delay={0} dy={lift}>
            <AppScreen time="10:15">
              <ProductScreen p={HERO} color="BLACK" qty={qtyAt(1e9)} scroll={1000} />
              <Drawer open={1} title="Checkout">
                <DeliveryStep t={t} search={typed(STORY.search, t, V_TYPE, 0.45)} chosen={chosen} address={typed(STORY.address, t, V_ADDR + 4, 1.5)} focus={focus} pickPress={usePress(V_PICK)} press={usePress(V_GO)} priceGlow={ease(t, V_PRICE, 10)} />
              </Drawer>
            </AppScreen>
            <Tap x={195} y={496} at={V_SEARCH} />
            <Tap x={195} y={MADINA_Y} at={V_PICK} />
            <Tap x={195} y={483} at={V_ADDR} />
            <Tap x={195} y={750} at={V_GO} />
          </RisingPhone>
          {t >= V_PLACES ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1150 : 640} delay={V_PLACES} from="left" rotate={-2} out={V_PICK - 4} z={60}>
              <Card style={{ width: vertical ? 620 : 560, padding: vertical ? '30px 34px' : '26px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <Big size={vertical ? 96 : 84} color={C.accent}>
                    {PLACES.length}
                  </Big>
                  <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: vertical ? 34 : 30 }}>places</span>
                </div>
                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {REGIONS.map((r, i) => (
                    <span key={r} style={{ borderRadius: 999, background: C.surface2, border: `1px solid ${C.border}`, padding: '8px 16px', fontFamily: BODY, fontWeight: 600, fontSize: vertical ? 22 : 20, color: C.fg2, opacity: ease(t, V_PLACES + 6 + i * 2, 8) }}>
                      {r}
                    </span>
                  ))}
                </div>
              </Card>
            </Float>
          ) : null}
          {t >= V_PRICE ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1300 : 640} delay={V_PRICE} from="pop" rotate={-2} z={60}>
              <Pill icon={<MapPinIcon size={vertical ? 30 : 26} weight="fill" />} size={vertical ? 32 : 28}>
                {STORY.place.name} · {formatCurrency(STORY.delivery)} · today or tomorrow
              </Pill>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 10 review & pay */
// "Review, and tap pay" the real review screen, the Pay button and its real "Opening secure
// payment" state. Paystack's own window is NOT recreated (owner's request): the film only says
// what happens there. "Paystack opens" · "mobile money" · "card" · "bank" · "approve with your PIN"
const P_REVIEW = 8;
const P_TAP = k(cue('pay', 'pay', 46) - 2, 30, 60);
const P_SHEET = k(cue('pay', 'paystack', 73) - 6, P_TAP + 10, 90);
const P_OPT = [k(cue('pay', 'mobile', 149) - 4, P_SHEET + 30, 160), k(cue('pay', 'card', 183) - 4, P_SHEET + 40, 200), k(cue('pay', 'bank', 203) - 4, P_SHEET + 50, 220)];
const P_PIN = k(cue('pay', 'approve', 238) - 4, P_OPT[2] + 10, DUR.pay - 40);
export const PAY_T = { tap: P_TAP, sheet: P_SHEET, options: P_OPT, pin: P_PIN };
const PAY_OPTS = ['Mobile money', 'Card', 'Bank'];

export const Pay: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const reviewScroll = path(t, [
    [P_REVIEW, 0],
    [P_REVIEW + 16, 120],
    [P_TAP - 10, 120],
    [P_TAP - 2, 0],
  ]);
  const paying = t >= P_TAP + 2;
  const lift = useLift(P_TAP - 14, P_SHEET - 4, 150);
  const optP = [useSpringAt(P_OPT[0], SPRING_POP), useSpringAt(P_OPT[1], SPRING_POP), useSpringAt(P_OPT[2], SPRING_POP)];
  return (
    <ChapterFrame
      ch={ch.pay}
      demo={
        <>
          <RisingPhone delay={0} dy={lift}>
            <AppScreen time="10:16">
              <ProductScreen p={HERO} color="BLACK" qty={qtyAt(1e9)} scroll={1000} />
              <Drawer open={1} title="Checkout">
                <ReviewStep scroll={reviewScroll} press={usePress(P_TAP)} paying={paying} />
              </Drawer>
            </AppScreen>
            <Tap x={195} y={750} at={P_TAP} />
          </RisingPhone>
          {t >= P_SHEET ? (
            <Float x={vertical ? 60 : 110} y={vertical ? 1010 : 600} delay={P_SHEET} from="below" rotate={-1.5} z={60}>
              <Card style={{ width: vertical ? 960 : 640, padding: vertical ? '38px 40px' : '32px 34px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <span style={{ width: 72, height: 72, borderRadius: 22, background: C.inverse, color: '#fff', display: 'grid', placeItems: 'center' }}>
                    <LockIcon size={34} weight="fill" />
                  </span>
                  <div>
                    <Label size={vertical ? 22 : 19}>Secure payment</Label>
                    <div style={{ fontFamily: DISPLAY, fontVariationSettings: WIDE, fontWeight: 900, fontSize: vertical ? 50 : 42, textTransform: 'uppercase', lineHeight: 1, marginTop: 6 }}>Paystack opens</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 28, minHeight: vertical ? 84 : 72 }}>
                  {PAY_OPTS.map((label, i) =>
                    t >= P_OPT[i] ? (
                      <span key={label} style={{ transform: `scale(${optP[i]})`, transformOrigin: '0 50%' }}>
                        <Pill icon={i === 0 ? <MobilePayIcon size={vertical ? 32 : 28} weight="fill" /> : i === 1 ? <CreditCardIcon size={vertical ? 32 : 28} weight="fill" /> : <BankIcon size={vertical ? 32 : 28} weight="fill" />} tone={i === 0 ? C.accent : C.inverse} size={vertical ? 32 : 27}>
                          {label}
                        </Pill>
                      </span>
                    ) : null,
                  )}
                </div>
                {t >= P_PIN ? (
                  <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 14, fontFamily: BODY, fontWeight: 650, fontSize: vertical ? 32 : 28, color: C.fg2, opacity: ease(t, P_PIN, 10) }}>
                    <CheckIcon size={vertical ? 30 : 26} color={C.success} /> Approve with your PIN on your phone
                  </div>
                ) : null}
              </Card>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 11 order placed */
// "Done" the receipt · "your order number shows on screen" it lights up · "an SMS confirms every
// item, your total and a tracking link" the text arrives, word for word what the store sends
const O_REF = k(cue('placed', 'number', 49) - 6, 20, 70);
const O_SMS = k(cue('placed', 'sms', 121) - 8, O_REF + 30, 140);
export const PLACED_T = { done: 4, ref: O_REF, sms: O_SMS };

export const Placed: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const pop = useSpringAt(4, SPRING_POP);
  const move = ease(t, O_SMS - 6, 18, EASE_INOUT);
  return (
    <ChapterFrame
      ch={ch.placed}
      tint={C.success}
      demo={
        <>
          <RisingPhone delay={0} dy={vertical ? move * 430 : 0} dx={vertical ? 0 : move * 230}>
            <AppScreen time="10:17">
              <ProductScreen p={HERO} color="BLACK" qty={{}} scroll={1000} />
              <Drawer open={1} title="Order confirmed">
                <Receipt pop={pop} refGlow={ease(t, O_REF, 10)} />
              </Drawer>
            </AppScreen>
          </RisingPhone>
          {t >= O_SMS + 4 ? (
            <Float x={vertical ? 50 : panel.x + 10} y={vertical ? 640 : 150} delay={O_SMS + 4} from="below" rotate={-1.5} z={60}>
              <SmsCard text={SMS.confirmed} width={vertical ? 980 : 600} scale={vertical ? 1.02 : 0.86} />
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 12 shipping */
// "We start packing right away" Processing · "When it ships, you get another SMS" Shipped, the text
// "our team calls to deliver" the call · "today or tomorrow" · "Track it any time" the track page
const X_PACK = k(cue('ship', 'packing', 23) - 6, 6, 40);
const X_SHIP = k(cue('ship', 'ships', 77) - 4, X_PACK + 30, 100);
const X_SMS = k(cue('ship', 'sms', 122) - 10, X_SHIP + 16, 140);
const X_CALL = k(cue('ship', 'calls', 190) - 8, X_SMS + 30, 210);
const X_DAY = k(cue('ship', 'today', 233) - 6, X_CALL + 20, 250);
const X_TRACK = k(cue('ship', 'track', 297) - 6, X_DAY + 30, 310);
const X_TAP = k(cue('ship', 'time', 323) + 4, X_TRACK + 16, 345);
const X_NUM = k(cue('ship', 'number', 358) - 8, X_TAP + 10, DUR.ship - 20);
export const SHIP_T = { pack: X_PACK, ship: X_SHIP, sms: X_SMS, call: X_CALL, day: X_DAY, track: X_TRACK, tap: X_TAP };

export const Ship: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const status = t >= X_SHIP ? 'Shipped' : 'Processing';
  const glow = t >= X_SHIP ? ease(t, X_SHIP, 8) * (1 - ease(t, X_SHIP + 40, 12)) : ease(t, X_PACK, 8) * (1 - ease(t, X_PACK + 40, 12));
  const scroll = path(t, [
    [0, 200],
    [X_TRACK - 4, 200],
    [X_TRACK + 10, 60],
  ]);
  return (
    <ChapterFrame
      ch={ch.ship}
      demo={
        <>
          <RisingPhone delay={0}>
            <AppScreen time={t >= X_SHIP ? '2:40' : '10:31'} url="redoxdesignx.com/track-order">
              <TrackScreen frame={t} refText={STORY.ref} status={status} stepGlow={glow} scroll={scroll} trackPress={usePress(X_TAP)} inputGlow={ease(t, X_TRACK, 8) * (1 - ease(t, X_NUM + 20, 10))} />
            </AppScreen>
            <Tap x={195} y={475 - 60} at={X_TAP} />
          </RisingPhone>
          {t >= X_PACK ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1300 : 640} delay={X_PACK} from="left" rotate={-2} out={X_SMS - 4} z={60}>
              <Pill icon={<PackageIcon size={vertical ? 30 : 26} weight="fill" />} size={vertical ? 32 : 28}>
                Packing your order
              </Pill>
            </Float>
          ) : null}
          {t >= X_SMS ? (
            <Float x={vertical ? 50 : 110} y={vertical ? 1050 : 560} delay={X_SMS} from="below" rotate={-1.5} out={X_CALL - 2} z={60}>
              <SmsCard text={SMS.shipped} width={vertical ? 980 : 620} scale={vertical ? 1.02 : 0.86} time="2:40 PM" />
            </Float>
          ) : null}
          {t >= X_CALL ? (
            <Float x={vertical ? 120 : 110} y={vertical ? 1150 : 640} delay={X_CALL} from="pop" out={X_DAY - 4} z={60}>
              <Pill icon={<PhoneCallIcon size={vertical ? 32 : 28} weight="fill" />} tone={C.success} size={vertical ? 36 : 30}>
                Our team calls you to deliver
              </Pill>
            </Float>
          ) : null}
          {t >= X_DAY ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1330 : 640} delay={X_DAY} from="pop" rotate={-2.5} out={X_TRACK - 2} z={70}>
              <Pill icon={<TruckIcon size={vertical ? 32 : 28} weight="bold" />} size={vertical ? 40 : 34}>
                Today or tomorrow
              </Pill>
            </Float>
          ) : null}
          {t >= X_TRACK ? (
            <Float x={vertical ? 40 : 110} y={vertical ? 1330 : 640} delay={X_TRACK + 4} from="left" rotate={-2} z={60}>
              <Pill icon={<span style={{ fontFamily: MONO, fontWeight: 700, fontSize: vertical ? 22 : 19 }}>#</span>} size={vertical ? 32 : 28}>
                redoxdesignx.com/track-order
              </Pill>
            </Float>
          ) : null}
        </>
      }
    />
  );
};

/* =============================================================== 13 why REDOX */
// "Secure payment" · "an SMS at every step" · (delivery) · "real people on WhatsApp"
const TR_AT = [
  k(cue('trust', 'secure', 10) - 4, 4, 30),
  k(cue('trust', 'sms', 60) - 6, 30, 90),
  k(cue('trust', 'step', 113) - 4, 70, 140),
  k(cue('trust', 'whatsapp', 176) - 10, 120, DUR.trust - 50),
];
export const TRUST_T = { cards: TR_AT };
const TRUST_ICONS: Record<string, React.ReactNode> = {
  lock: <LockIcon size={44} weight="fill" />,
  sms: <ChatTextIcon size={44} weight="fill" />,
  truck: <TruckIcon size={44} weight="bold" />,
  whatsapp: <WhatsappIcon size={46} />,
};
const TRUST_TONE: Record<string, [string, string]> = {
  lock: [C.inverse, '#fff'],
  sms: [C.success, '#fff'],
  truck: [C.accent, '#fff'],
  whatsapp: [C.whatsapp, C.whatsappInk],
};

export const Trust: React.FC = () => {
  const t = useT();
  const { vertical, panel } = useStage();
  const cw = vertical ? (panel.w - 80 - 24) / 2 : (panel.w - 100 - 24) / 2;
  const chh = vertical ? 430 : 330;
  const x0 = panel.x + (vertical ? 40 : 50);
  const y0 = vertical ? panel.y + 50 : panel.y + 130;
  return (
    <ChapterFrame
      ch={{ badge: FILM.trust.badge, headline: FILM.trust.headline, mark: FILM.trust.mark }}
      demo={
        <>
          {FILM.trust.cards.map(([icon, title, text], i) => {
            const s = useSpringAt(TR_AT[i], { damping: 15, stiffness: 130, mass: 0.9 });
            if (t < TR_AT[i] - 1) return null;
            const [bg, ink] = TRUST_TONE[icon];
            return (
              <div key={title} style={{ position: 'absolute', left: x0 + (i % 2) * (cw + 24), top: y0 + Math.floor(i / 2) * (chh + 24), width: cw, height: chh, opacity: Math.min(1, s * 1.6), transform: `translateY(${(1 - s) * 160}px) rotate(${(1 - s) * (i % 2 ? 5 : -5)}deg)` }}>
                <Card style={{ width: '100%', height: '100%', padding: vertical ? '36px 34px' : '32px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ width: 92, height: 92, borderRadius: 28, background: bg, color: ink, display: 'grid', placeItems: 'center' }}>{TRUST_ICONS[icon]}</span>
                  <div>
                    <div style={{ fontFamily: DISPLAY, fontVariationSettings: WIDE, fontWeight: 900, fontSize: vertical ? 46 : 42, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.015em' }}>{title}</div>
                    <div style={{ fontFamily: BODY, fontWeight: 550, fontSize: vertical ? 28 : 26, color: C.fg3, marginTop: 12 }}>{text}</div>
                  </div>
                </Card>
              </div>
            );
          })}
        </>
      }
    />
  );
};

/* =============================================================== 14 end */
// "Redox Design" the name, wall to wall · "Wear it plain. Print it loud." · "Shop now on our
// website" the address typed into the search box, then sent
const E_HEAD = k(cue('end', 'wear', 65) - 6, 30, 90);
const E_TYPE = k(cue('end', 'shop', 138) - 4, E_HEAD + 30, 190);
const E_CPS = 0.55;
const E_GO = Math.min(DUR.end - 40, typeEnd(FILM.end.search, E_TYPE, E_CPS) + 6);
export const END_T = { head: E_HEAD, type: E_TYPE, cps: E_CPS, chars: FILM.end.search.length, go: E_GO };

export const End: React.FC = () => {
  const t = useT();
  const { vertical, width } = useLayout();
  const icon = useSpringAt(2, SPRING_POP);
  const shown = typed(FILM.end.search, t, E_TYPE, E_CPS);
  const press = interpolate(t, [E_GO - 2, E_GO + 1, E_GO + 7], [1, 0.97, 1], clamp);
  const wa = useSpringAt(E_GO + 14, SPRING_POP);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Glow strength={1.3} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: vertical ? 330 : 70, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ transform: `scale(${icon})` }}>
          <RdIcon size={vertical ? 170 : 130} />
        </div>
        <div style={{ marginTop: vertical ? 44 : 30, width: vertical ? width - 100 : 1500 }}>
          <Wordmark size={vertical ? 118 : 168} delay={6} stagger={1.8} justify="space-between" />
        </div>
        <Display text={FILM.end.headline} size={vertical ? 92 : 84} fit={vertical ? width - 120 : 1500} align="center" delay={E_HEAD} mark={FILM.end.mark} lineHeight={0.9} style={{ marginTop: vertical ? 70 : 46, textAlign: 'center' }} />
        <div style={{ marginTop: vertical ? 70 : 44 }}>
          <SearchPill text={shown} w={vertical ? 860 : 820} h={vertical ? 132 : 108} caret={t >= E_TYPE && t < E_GO} press={press} placeholder="Search" />
        </div>
        <div style={{ marginTop: vertical ? 44 : 30, width: vertical ? width - 120 : 1400 }}>
          <StepStrip steps={FILM.end.steps} delay={E_GO + 6} size={vertical ? 0.95 : 0.9} />
        </div>
        {t >= E_GO + 14 ? (
          <div style={{ marginTop: vertical ? 34 : 24, transform: `scale(${wa})`, display: 'inline-flex', alignItems: 'center', gap: 14, height: vertical ? 88 : 76, borderRadius: 999, background: C.whatsapp, color: C.whatsappInk, padding: '0 36px 0 26px', fontFamily: BODY, fontWeight: 800, fontSize: vertical ? 32 : 28 }}>
            <WhatsappIcon size={vertical ? 38 : 32} /> WhatsApp {FILM.end.whatsapp}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const ALL_PIECES = PIECES;

// How the store's SMS look on a phone. Generic messages UI (no phone maker's branding): a
// notification banner and a large card for showing a text in the film. The sender is the
// store's Hubtel sender ID and every text is built by the store's own code (src/script.ts).
import React from 'react';
import { interpolate } from 'remotion';

import { ChatTextIcon } from '@phosphor-icons/react/dist/ssr/ChatText';

import { BODY, C, SPRING_CARD } from '../brand';
import { useSpringAt } from '../components/anim';
import { SMS, SMS_HIGHLIGHT } from '../script';

/** Bold codes and money, links look like links. Line breaks kept, as on the phone. */
export const SmsText: React.FC<{ text: string; linkColor?: string }> = ({ text, linkColor = '#1f62d0' }) => {
  const parts: React.ReactNode[] = [];
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(redoxdesignx\\.com\\S*|${SMS_HIGHLIGHT.map(esc).join('|')})`, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const hit = m[0];
    parts.push(
      hit.startsWith('redoxdesignx') ? (
        <span key={i++} style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all' }}>
          {hit}
        </span>
      ) : (
        <b key={i++} style={{ fontWeight: 800 }}>
          {hit}
        </b>
      ),
    );
    last = m.index + hit.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span style={{ whiteSpace: 'pre-wrap' }}>{parts}</span>;
};

/** A message notification sliding down from the top of the phone (points). */
export const SmsBanner: React.FC<{ text: string; at: number; top?: number; time?: string; clamp?: number; until?: number }> = ({ text, at, top = 50, time = 'now', clamp = 3, until }) => {
  const s = useSpringAt(at, SPRING_CARD);
  const back = useSpringAt(until ?? 1e9, SPRING_CARD);
  if (s <= 0.001 || back >= 0.999) return null;
  return (
    <div style={{ position: 'absolute', left: 10, right: 10, top, zIndex: 2800, transform: `translateY(${interpolate(s - back, [0, 1], [-170, 0])}px)`, opacity: Math.min(1, (s - back) * 2) }}>
      <div style={{ borderRadius: 24, background: 'rgba(255,255,255,0.97)', boxShadow: '0 18px 40px -12px rgba(0,0,0,0.35)', padding: '12px 14px 14px', fontFamily: BODY, color: '#111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, background: '#34c759', display: 'grid', placeItems: 'center', color: '#fff' }}>
            <ChatTextIcon size={15} weight="fill" />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.5)' }}>Messages</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.45)' }}>{time}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>{SMS.sender}</div>
        <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: '20px', marginTop: 2, display: '-webkit-box', WebkitLineClamp: clamp, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text.replace(/\n+/g, ' ')}</div>
      </div>
    </div>
  );
};

/** A big SMS card for the film frame (pixels). */
export const SmsCard: React.FC<{ text: string; width: number; scale?: number; time?: string; style?: React.CSSProperties }> = ({ text, width, scale = 1, time = 'now', style }) => (
  <div style={{ width, boxSizing: 'border-box', borderRadius: 36 * scale, background: '#ffffff', border: `1.5px solid ${C.border}`, boxShadow: '0 40px 90px -30px rgba(20,20,20,0.35)', padding: `${24 * scale}px ${28 * scale}px ${26 * scale}px`, color: C.fg, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 * scale }}>
      <span style={{ width: 44 * scale, height: 44 * scale, borderRadius: 13 * scale, background: '#34c759', display: 'grid', placeItems: 'center', color: '#fff' }}>
        <ChatTextIcon size={26 * scale} weight="fill" />
      </span>
      <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 28 * scale }}>{SMS.sender}</span>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 21 * scale, color: C.fg3 }}>SMS</span>
      <span style={{ marginLeft: 'auto', fontFamily: BODY, fontWeight: 500, fontSize: 21 * scale, color: C.fg3 }}>{time}</span>
    </div>
    <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 28 * scale, lineHeight: 1.4, marginTop: 16 * scale, borderRadius: `${24 * scale}px ${24 * scale}px ${24 * scale}px ${8 * scale}px`, background: '#efeff2', padding: `${18 * scale}px ${22 * scale}px` }}>
      <SmsText text={text} />
    </div>
  </div>
);

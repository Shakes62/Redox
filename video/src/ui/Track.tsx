// The track-order page at true phone scale: TrackOrder.tsx with TrackOrder.module.css and the
// page's own padding (src/app/track-order/page.tsx). Status names, steps and wording are the
// store's; the order is the film's.
import React from 'react';

import t from '@/components/commerce/TrackOrder.module.css';
import { describeDelivery } from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';

import { HERO, PICKS, STORY } from '../script';
import { Caret, SiteNav } from './app';

const STEPS = ['Placed', 'Processing', 'Shipped', 'Delivered'];

export const TrackScreen: React.FC<{ frame: number; refText: string; focus?: boolean; status: string; stepGlow?: number; trackPress?: number; scroll?: number; inputGlow?: number }> = ({
  frame,
  refText,
  focus,
  status,
  stepGlow = 0,
  trackPress = 1,
  scroll = 0,
  inputGlow = 0,
}) => {
  const current = status === 'Pending' ? 0 : STEPS.indexOf(status);
  const delivery = describeDelivery('location', STORY.delivery);
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${-scroll}px)`, padding: 'calc(var(--nav-height) + 40px) var(--section-x) 80px' }}>
        <section className={t.panel}>
          <div className={t.intro}>
            <p className={t.eyebrow}>Your order</p>
            <h1>Track order</h1>
            <p>Enter the reference from your checkout confirmation.</p>
          </div>
          <form className={t.form}>
            <label className={t.label}>Order reference</label>
            <div className={t.formRow}>
              <span
                style={{
                  minWidth: 0,
                  flex: 1,
                  minHeight: 52,
                  padding: '0 16px',
                  border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
                  outline: focus || inputGlow ? `3px solid var(--accent-soft)` : undefined,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1rem',
                  color: refText ? 'var(--fg)' : 'var(--fg-3)',
                  boxShadow: inputGlow ? `0 0 0 ${4 * inputGlow}px var(--accent-ring)` : undefined,
                }}
              >
                {refText || 'RD-1025'}
                <Caret t={frame} on={Boolean(focus)} />
              </span>
              <button data-m="track" type="button" style={{ transform: `scale(${trackPress})` }}>
                Track
              </button>
            </div>
          </form>
          <div className={t.result}>
            <div className={t.summary}>
              <p className={t.eyebrow}>Order {STORY.ref}</p>
              <h2>{status === 'Pending' ? 'Order placed' : status}</h2>
              <p className={t.payment} data-payment="paid">
                Paid
              </p>
            </div>
            <details className={t.details} open>
              <summary>
                Delivery progress <span>+</span>
              </summary>
              <ol data-m="steps" className={t.steps}>
                {STEPS.map((step, i) => (
                  <li key={step} className={i <= current ? t.stepDone : ''} style={i === current && stepGlow ? { color: 'var(--fg)' } : undefined}>
                    <span className={t.stepMark} style={i === current && stepGlow ? { boxShadow: `0 0 0 ${4 * stepGlow}px var(--accent-ring)` } : undefined}>
                      {i < current ? '✓' : i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </details>
            <details className={t.details}>
              <summary>
                Order details <span>+</span>
              </summary>
            </details>
          </div>
        </section>
      </div>
      <SiteNav />
    </>
  );
};

/** Used by the review card in the film: the lines the track page lists under "Order details". */
export const trackLines = () => [
  ...PICKS.map((p) => [`${HERO.rawName}`, `${p.color} · Size ${p.size} · Qty ${p.qty}`, formatCurrency(HERO.price * p.qty)]),
  [describeDelivery('location', STORY.delivery).label, describeDelivery('location', STORY.delivery).detail, formatCurrency(STORY.delivery)],
];

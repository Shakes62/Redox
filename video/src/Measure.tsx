// Dev tool: prints where every tap target sits on each store screen, in points of the
// 390 x 844 phone screen, so the film's taps land exactly on the site's real buttons.
//   npx remotion still Measure out/m.png --log=verbose   (look for "MEASURE")
// Page positions are at scroll 0; a scene subtracts its own scroll.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';

import { HERO, PICKS, STORY } from './script';
import { AppScreen } from './ui/app';
import { DeliveryStep, DetailsStep, Drawer, Receipt, ReviewStep } from './ui/Checkout';
import { ProductScreen, ShopScreen, type Qty } from './ui/Shop';
import { TrackScreen } from './ui/Track';

const qty: Qty = PICKS.reduce<Qty>((q, p) => ({ ...q, [p.color]: { ...(q[p.color] || {}), [p.size]: p.qty } }), {});

const STATES: [string, React.ReactNode][] = [
  ['shop', <ShopScreen key="a" />],
  ['pdp-empty', <ProductScreen key="b" p={HERO} color="WINE" qty={{}} />],
  ['pdp-full', <ProductScreen key="c" p={HERO} color="BLACK" qty={qty} />],
  ['details', <Drawer key="d" open={1} title="Checkout"><DetailsStep t={0} name="" phone="" email="" focus={null} /></Drawer>],
  ['deliv-search', <Drawer key="e" open={1} title="Checkout"><DeliveryStep t={0} search={STORY.search} chosen={false} address="" focus="search" /></Drawer>],
  ['deliv-chosen', <Drawer key="f" open={1} title="Checkout"><DeliveryStep t={0} search="" chosen address="" focus={null} /></Drawer>],
  ['review', <Drawer key="g" open={1} title="Checkout"><ReviewStep /></Drawer>],
  ['receipt', <Drawer key="h" open={1} title="Order confirmed"><Receipt /></Drawer>],
  ['track', <TrackScreen key="i" frame={0} refText={STORY.ref} status="Shipped" />],
];

const One: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => delayRender(`measure ${name}`));
  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      const box = ref.current!.getBoundingClientRect();
      const out: Record<string, number[]> = {};
      ref.current!.querySelectorAll<HTMLElement>('[data-m]').forEach((el) => {
        const r = el.getBoundingClientRect();
        out[el.dataset.m!] = [r.left - box.left, r.top - box.top, r.width, r.height].map((v) => Math.round(v));
      });
      console.log(`MEASURE ${name} ${JSON.stringify(out)}`);
      continueRender(handle);
    });
  }, [handle, name]);
  return (
    <div ref={ref} style={{ position: 'relative', width: 390, height: 844, flexShrink: 0 }}>
      <AppScreen>{children}</AppScreen>
    </div>
  );
};

export const Measure: React.FC = () => (
  <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
    {STATES.map(([name, node]) => (
      <One key={name} name={name}>
        {node}
      </One>
    ))}
  </AbsoluteFill>
);

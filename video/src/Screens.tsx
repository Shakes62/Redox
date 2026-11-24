// Review sheet: every store screen the film uses, side by side at a glance (not rendered as a
// video). `npx remotion still Screens out/screens.png` and compare it with the live site.
import React from 'react';
import { AbsoluteFill } from 'remotion';

import { C } from './brand';
import { Phone } from './components/Phone';
import { HERO, PICKS, STORY } from './script';
import { AppScreen, TOP } from './ui/app';
import { DeliveryStep, DetailsStep, Drawer, Receipt, ReviewStep } from './ui/Checkout';
import { ProductScreen, ShopScreen, type Qty } from './ui/Shop';
import { TrackScreen } from './ui/Track';

const qty: Qty = PICKS.reduce<Qty>((q, p) => ({ ...q, [p.color]: { ...(q[p.color] || {}), [p.size]: p.qty } }), {});

const Grid: React.FC<{ y: number }> = () => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 9000, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.35) 1px, transparent 1px)', backgroundSize: '50px 50px', backgroundPosition: `0 ${TOP}px` }} />
);

export const Screens: React.FC = () => {
  const screens: React.ReactNode[] = [
    <AppScreen key="shop">
      <ShopScreen scroll={0} />
    </AppScreen>,
    <AppScreen key="pdp0">
      <ProductScreen p={HERO} color="WINE" qty={{}} scroll={300} />
    </AppScreen>,
    <AppScreen key="pdp1">
      <ProductScreen p={HERO} color="BLACK" qty={qty} scroll={760} />
    </AppScreen>,
    <AppScreen key="details">
      <Drawer open={1} title="Checkout">
        <DetailsStep t={0} name={STORY.buyer.name} phone={STORY.buyer.phone} email="" focus="email" />
      </Drawer>
    </AppScreen>,
    <AppScreen key="deliv0">
      <Drawer open={1} title="Checkout">
        <DeliveryStep t={0} search="Madina" chosen={false} address="" focus="search" />
      </Drawer>
    </AppScreen>,
    <AppScreen key="deliv1">
      <Drawer open={1} title="Checkout">
        <DeliveryStep t={0} search="" chosen address={STORY.address} focus={null} />
      </Drawer>
    </AppScreen>,
    <AppScreen key="review">
      <Drawer open={1} title="Checkout">
        <ReviewStep />
      </Drawer>
    </AppScreen>,
    <AppScreen key="pay">
      <Drawer open={1} title="Checkout">
        <ReviewStep paying />
      </Drawer>
    </AppScreen>,
    <AppScreen key="receipt">
      <Drawer open={1} title="Order confirmed">
        <Receipt />
      </Drawer>
    </AppScreen>,
    <AppScreen key="track">
      <TrackScreen frame={0} refText={STORY.ref} status="Shipped" />
    </AppScreen>,
  ];
  return (
    <AbsoluteFill style={{ background: C.surface2, display: 'flex', flexWrap: 'wrap', gap: 40, padding: 40, alignContent: 'flex-start' }}>
      {screens.map((sc, i) => (
        <Phone key={i} w={440}>
          {sc}
          <Grid y={0} />
        </Phone>
      ))}
    </AbsoluteFill>
  );
};

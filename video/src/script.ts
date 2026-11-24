// EDIT THIS FILE to change on-screen words, the story order and audio switches.
// The narration lives in scripts/vo.py; running it rewrites the scene lengths
// (src/films/redox/timing.json). 30 design frames = 1 design-second. "\n" breaks a headline.
//
// One order runs through the whole film, so every screen agrees with every SMS:
//   Ama Mensah opens the 230 GSM Plain T-Shirt, picks Wine L x2 and Black XL x1 (3 pieces at
//   GH₵55), checks out with the site's own example number, delivers to Madina (GH₵35, from the
//   real delivery list), pays GH₵203.30 with mobile money and gets order #RD-1250.
// The customer and the order number are fictional. Prices, the 2% service fee, delivery places,
// the SMS texts and the delivery note all come from the live store (src/catalog.json and the
// app's own code), so changing the store and running `npm run photos` keeps the film true.
import { calcOrderTotal, calcServiceCharge } from '@/lib/format';
import { buildOrderSms } from '@/lib/sms';
import { buildShippedSms } from '@/lib/shipping-sms';
import type { Order } from '@/types/product';

import { PLACES, piece } from './catalog';

/* ---------------------------------------------------------------- the order */

export const HERO = piece('230gsmplaintshirt');

export const PICKS: { color: string; size: string; qty: number }[] = [
  { color: 'WINE', size: 'L', qty: 2 },
  { color: 'BLACK', size: 'XL', qty: 1 },
];

const place = PLACES.find((l) => l.name === 'Madina');
if (!place) throw new Error('Madina is no longer a delivery place: pick another one in src/script.ts');

const pieces = PICKS.reduce((n, p) => n + p.qty, 0);
const subtotal = HERO.price * pieces;
const orderTotal = calcOrderTotal(subtotal);

export const STORY = {
  id: 1250,
  ref: 'RD-1250',
  paymentRef: 'RDX-7KQ4MX2P',
  buyer: { name: 'Ama Mensah', phone: '024 123 4567', email: 'ama.mensah@gmail.com' },
  place,
  address: 'House 12, near Zongo Junction',
  search: 'Madina',
  pieces,
  subtotal,
  serviceCharge: calcServiceCharge(subtotal),
  orderTotal,
  delivery: place.fee,
  total: Math.round((orderTotal + place.fee) * 100) / 100,
  network: 'MTN',
};

/** The order as the store records it, so the SMS below is built by the store's own code. */
const ORDER = {
  id: STORY.id,
  items: PICKS.map((p) => ({
    productId: HERO.raw.id,
    productSlug: HERO.slug,
    productName: HERO.rawName,
    color: p.color,
    size: p.size,
    sku: '',
    quantity: p.qty,
    unitPrice: HERO.price,
    lineTotal: HERO.price * p.qty,
  })),
  extras: [],
  totalQuantity: pieces,
  price: STORY.total,
} as unknown as Order;

/** Word for word what Hubtel delivers (src/lib/sms.ts and src/lib/shipping-sms.ts in the app). */
export const SMS = {
  sender: 'RedoxDesign', // HUBTEL_SENDER_ID
  confirmed: buildOrderSms(ORDER),
  shipped: buildShippedSms(ORDER),
};

/** Bits of an SMS set in bold when it is shown big. */
export const SMS_HIGHLIGHT = [`#${STORY.ref}`, STORY.ref, `GHS ${STORY.total.toFixed(2)}`, 'has shipped'];

/* ---------------------------------------------------------------- on-screen words */

export type Chapter = { badge: string; n?: number; headline: string; mark?: string; sub?: string };

export const FILM = {
  intro: {
    kicker: 'Blank apparel · Custom print',
    headline: 'Wear it\nplain.\nPrint it\nloud.',
    mark: 'loud.',
    lead: 'Heavy cotton tees, raglans & caps.',
    pill: 'Delivered across Ghana',
  },
  weights: { badge: 'Pick your weight', headline: 'Higher GSM,\nthicker cotton.', mark: 'thicker' },
  range: { badge: 'The range', headline: 'Every piece,\nevery colour.', mark: 'every' },
  quality: {
    badge: 'Made right',
    headline: '100% cotton.\nTrue to size.',
    mark: 'True',
    facts: ['100% compact cotton', 'Boxy fit', 'True to size', 'Twin needle hem'],
    print: { title: 'Got a design?\nWe print it.', text: 'Logos, teams, events, brands. Send it on WhatsApp.', cta: 'Chat on WhatsApp' },
  },
  howto: {
    headline: 'How to\norder.',
    mark: 'order.',
    // Steps.tsx on the home page, word for word
    steps: [
      ['Pick a colour', 'Tap a dot to see it on the shirt'],
      ['Tap your sizes', '10+ pieces get the wholesale price'],
      ['Pay with MoMo', 'Card or bank too. We deliver to your town'],
    ] as [string, string][],
    time: 'About 1 minute',
  },
  chapters: {
    colour: { n: 1, badge: 'Pick a colour', headline: 'Tap a\ncolour.', mark: 'colour.', sub: 'The photo shows the shirt in it.' },
    size: { n: 2, badge: 'Tap your sizes', headline: 'Tap your\nsizes.', mark: 'sizes.', sub: 'Mix any sizes and colours.' },
    details: { n: 3, badge: 'Your details', headline: 'Name, phone\nand email.', mark: 'phone', sub: 'No account needed.' },
    delivery: { n: 4, badge: 'Delivery', headline: 'Pick your\ntown.', mark: 'town.', sub: 'The price shows right away.' },
    pay: { n: 5, badge: 'Pay', headline: 'MoMo, card\nor bank.', mark: 'MoMo,', sub: 'Secured by Paystack.' },
    placed: { n: 6, badge: 'Order placed', headline: 'Confirmed\nby SMS.', mark: 'SMS.' },
    ship: { n: 7, badge: 'Delivery', headline: 'Today or\ntomorrow.', mark: 'tomorrow.' },
  } as Record<string, Chapter>,
  trust: {
    badge: 'Why REDOX',
    headline: 'Order with\nconfidence.',
    mark: 'confidence.',
    cards: [
      ['lock', 'Secure payment', 'Paystack · MoMo, card or bank'],
      ['sms', 'SMS at every step', 'Confirmed · Shipped'],
      ['truck', 'Fast delivery', 'Today or tomorrow'],
      ['whatsapp', 'Real people', 'WhatsApp us any time'],
    ] as [string, string, string][],
  },
  end: {
    headline: 'Wear it plain.\nPrint it loud.',
    mark: 'loud.',
    search: 'redoxdesignx.com',
    steps: ['Pick a colour', 'Tap your sizes', 'Pay with MoMo'],
    whatsapp: '055 805 8348',
  },
};

// AUDIO: files live in public/audio/redox/ (written by scripts/vo.py) and public/audio/sfx/.
export const AUDIO: {
  vo: boolean; // generated voiceover (python scripts/vo.py -> src/films/redox/vo.json)
  music: boolean; // public/audio/redox/music.mp3, ducked automatically under the voiceover
  musicVolume: number;
  sfx: boolean; // public/audio/sfx/{whoosh,pop,tap,type}.mp3
} = {
  vo: true,
  music: true, // "Happy Times" by Alejandro Magaña (A. M.), Mixkit Stock Music Free License (see CREDITS.md)
  musicVolume: 0.32,
  sfx: true,
};

// The live catalogue (src/catalog.json, from `npm run photos`), read through the store's own
// helpers so every name, GSM figure, product type, colour swatch and bulk price on screen is
// exactly what the site shows.
import { formatCurrency } from '@/lib/format';
import { displayColorName, displayProductName, KIND_LABELS, productGsm, productKind, sizeRank, swatchBackground, colorTones, type ProductKind } from '@/lib/product-display';
import { getWholesaleRule } from '@/lib/wholesale';
import type { DeliveryLocation } from '@/lib/delivery';
import type { WholesaleRule } from '@/types/product';

import CATALOG from './catalog.json';

export type CatalogProduct = (typeof CATALOG.products)[number];

export type Piece = {
  slug: string;
  raw: CatalogProduct;
  /** "230 GSM Plain T-Shirt" */
  name: string;
  /** The name exactly as typed in the admin (orders, and so the SMS, carry this one). */
  rawName: string;
  gsm: number | null;
  kind: ProductKind;
  kindLabel: string;
  price: number;
  bulk: WholesaleRule | null;
  material: string;
  fit: string;
  colors: string[];
  sizes: string[];
  cover: string | null;
  /** Photo for a colour, falling back to the cover. */
  photo: (color?: string) => string;
  swatch: (color: string) => string;
  tint: (color: string) => string;
};

const toPiece = (p: CatalogProduct): Piece => {
  const forHelpers = { name: p.name, category: p.category, description: p.description };
  const kind = productKind(forHelpers);
  const photos = p.photos as unknown as Record<string, string>;
  const hex = p.colorHex as unknown as Record<string, string>;
  return {
    slug: p.slug,
    raw: p,
    name: displayProductName(p.name),
    rawName: p.name,
    gsm: productGsm(forHelpers),
    kind,
    kindLabel: KIND_LABELS[kind].one,
    price: p.price,
    bulk: getWholesaleRule({ price: p.price, wholesale: p.wholesale }),
    material: p.material,
    fit: p.fit,
    colors: p.colors,
    sizes: [...p.sizes].sort((a, b) => sizeRank(a) - sizeRank(b)),
    cover: p.cover,
    photo: (color) => (color && photos[color]) || p.cover || Object.values(photos)[0] || '',
    swatch: (color) => swatchBackground(color, hex[color]),
    tint: (color) => colorTones(color, hex[color])[0] || '#cc2131',
  };
};

export const PIECES: Piece[] = CATALOG.products.map(toPiece);
export const piece = (slug: string): Piece => {
  const p = PIECES.find((x) => x.slug === slug);
  if (!p) throw new Error(`No product "${slug}" in src/catalog.json. Run npm run photos.`);
  return p;
};

/** The site's kinds, in shop order, with the pieces of each. */
export const KINDS = (['tees', 'raglans', 'long-sleeve', 'caps'] as ProductKind[])
  .map((kind) => {
    const of = PIECES.filter((p) => p.kind === kind);
    return { kind, label: KIND_LABELS[kind].many, pieces: of, from: of.length ? Math.min(...of.map((p) => p.price)) : 0 };
  })
  .filter((k) => k.pieces.length > 0);

/** Shirts by fabric weight, lightest first (WeightScale on the home page). Caps sit this one out. */
export const WEIGHTS = PIECES.filter((p) => p.gsm && p.kind !== 'caps').sort((a, b) => (a.gsm ?? 0) - (b.gsm ?? 0) || a.price - b.price);

export const DELIVERY = CATALOG.delivery;
export const PLACES = DELIVERY.locations as unknown as DeliveryLocation[];
export const REGIONS = [...new Set(PLACES.map((l) => l.region))];

export const money = formatCurrency;
export const colorName = displayColorName;

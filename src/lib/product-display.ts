import type { Product } from '@/types/product';

/**
 * Presentation helpers shared by the storefront: tidy names, fabric weight,
 * product type, colour swatches and photo lists. Pure functions, no React,
 * so they run the same on the server and in the browser.
 */

export const STORE_WHATSAPP = '233558058348';

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${STORE_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/* ── Names ───────────────────────────────────────────────── */

/**
 * Products are typed in the admin panel in any case ("230gsm PLAIN TSHIRT").
 * Shown on the site as "230 GSM Plain T-Shirt": shouted words become title
 * case, the weight reads the same everywhere, and the brand stays in capitals.
 */
export function displayProductName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(\d+)\s*gsm\b/gi, '$1 GSM')
    .split(' ')
    .map((word) => {
      if (/^GSM$/i.test(word)) return 'GSM';
      if (/^redox(designs?x)?$/i.test(word)) return word.toUpperCase();
      if (/^t-?shirts?$/i.test(word)) return word.toLowerCase().endsWith('s') ? 'T-Shirts' : 'T-Shirt';
      // Only re-case words typed in capitals; a deliberate "iPhone" stays put.
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word.charAt(0) + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(' ');
}

/** Colour names arrive as "SEA BLUE" or "PINK/ CREAM". Shown as "Sea Blue", "Pink / Cream". */
export function displayColorName(color: string) {
  return color
    .split('/')
    .map((part) => part.trim().toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase()))
    .filter(Boolean)
    .join(' / ');
}

/* ── Fabric weight & type ────────────────────────────────── */

/** Fabric weight in grams per square metre, read from the name or description. */
export function productGsm(product: Pick<Product, 'name' | 'description' | 'category'>): number | null {
  for (const text of [product.name, product.category, product.description]) {
    const match = /(\d{3})\s*-?\s*gsm/i.exec(text || '');
    if (match) return Number(match[1]);
  }
  return null;
}

export type ProductKind = 'tees' | 'raglans' | 'long-sleeve' | 'caps' | 'other';

export const KIND_LABELS: Record<ProductKind, { one: string; many: string }> = {
  tees: { one: 'Tee', many: 'Tees' },
  raglans: { one: 'Raglan', many: 'Raglans' },
  'long-sleeve': { one: 'Long sleeve', many: 'Long sleeve' },
  caps: { one: 'Cap', many: 'Caps' },
  other: { one: 'Piece', many: 'More' }
};

const KIND_ORDER: ProductKind[] = ['tees', 'raglans', 'long-sleeve', 'caps', 'other'];

/**
 * The admin "category" field is free text ("shoot sleeve", "300 gsm"), so the
 * shop groups products by what they are, read from the name first.
 */
export function productKind(product: Pick<Product, 'name' | 'category' | 'description'>): ProductKind {
  const name = `${product.name} ${product.category}`.toLowerCase();
  if (/\bcaps?\b|\bhats?\b|snapback|trucker/.test(name)) return 'caps';
  if (/long\s*-?\s*sleeve/.test(name)) return 'long-sleeve';
  if (/r[ae]glan/.test(name)) return 'raglans';
  if (/t-?\s*shirt|\btees?\b|gsm|blank/.test(name)) return 'tees';
  return 'other';
}

/** Kinds present in a list of products, in shop order. */
export function kindsIn(products: Product[]): ProductKind[] {
  const present = new Set(products.map(productKind));
  return KIND_ORDER.filter((kind) => present.has(kind));
}

export function isKind(value: string | undefined | null): value is ProductKind {
  return Boolean(value && (KIND_ORDER as string[]).includes(value));
}

/* ── Colour swatches ─────────────────────────────────────── */

const COLOR_WORDS: Record<string, string> = {
  black: '#151515',
  white: '#f7f7f4',
  cream: '#eee2c4',
  ivory: '#f2ead6',
  bone: '#ebe5d8',
  beige: '#d8c6a2',
  sand: '#d6c19a',
  khaki: '#bba97a',
  tan: '#c29b6c',
  brown: '#6f4428',
  brwon: '#6f4428',
  chocolate: '#4e2f1e',
  coffee: '#5b3a26',
  red: '#cc2131',
  wine: '#6c1525',
  maroon: '#5d1520',
  burgundy: '#681627',
  pink: '#f2adc4',
  'hot pink': '#e8478f',
  purple: '#6b3fa5',
  lilac: '#c6b4e8',
  lavender: '#bdaee9',
  blue: '#2d63c8',
  'sky blue': '#8ec8ef',
  'baby blue': '#a9d3f2',
  'sea blue': '#8ea7e4',
  'royal blue': '#2447b4',
  navy: '#1c2748',
  'navy blue': '#1c2748',
  'n-blue': '#1c2748',
  teal: '#1f8585',
  green: '#1f6a3e',
  'light green': '#9ed8a8',
  'dark green': '#173f2b',
  'bottle green': '#14402a',
  olive: '#6a6a31',
  mint: '#bfe7d1',
  grey: '#8e9094',
  gray: '#8e9094',
  'light grey': '#cbcdd0',
  'light gray': '#cbcdd0',
  'dark grey': '#46484c',
  'dark gray': '#46484c',
  ash: '#b5b7b9',
  charcoal: '#333438',
  orange: '#f07a25',
  yellow: '#f2d24b',
  gold: '#d3a63b',
  silver: '#c0c2c4'
};

const PLACEHOLDER_HEX = '#555555';

function resolvePart(part: string): string | null {
  const key = part.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return null;
  if (COLOR_WORDS[key]) return COLOR_WORDS[key];
  // "light sea blue" → try progressively shorter endings: "sea blue", "blue".
  const words = key.split(' ');
  for (let start = 1; start < words.length; start += 1) {
    const tail = words.slice(start).join(' ');
    if (COLOR_WORDS[tail]) return COLOR_WORDS[tail];
  }
  return COLOR_WORDS[words[0]] ?? null;
}

/**
 * The colours of one variant, body first. A two-tone raglan ("BLACK/WHITE")
 * gives two. The admin's hex wins when it is a real choice, not the
 * #555555 placeholder every product currently carries.
 */
export function colorTones(color: string, adminHex?: string): string[] {
  if (adminHex && /^#[0-9a-f]{6}$/i.test(adminHex) && adminHex.toLowerCase() !== PLACEHOLDER_HEX) {
    return [adminHex];
  }
  return color
    .split('/')
    .map(resolvePart)
    .filter((tone): tone is string => Boolean(tone))
    .slice(0, 2);
}

/** Black or white text, whichever reads better on a garment colour. */
export function inkOn(hex: string) {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!value) return '#111111';
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(value.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 0.18 is where black and white text have equal contrast.
  return luminance > 0.18 ? '#111111' : '#ffffff';
}

/** A CSS background for a colour dot: solid, or split diagonally for two-tone pieces. */
export function swatchBackground(color: string, adminHex?: string) {
  const tones = colorTones(color, adminHex);
  if (tones.length === 0) return 'var(--surface-3)';
  if (tones.length === 1) return tones[0];
  return `linear-gradient(135deg, ${tones[0]} 0 50%, ${tones[1]} 50% 100%)`;
}

/* ── Sizes ───────────────────────────────────────────────── */

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

/** Sizes are stored in whatever order they were typed. Shown smallest to largest; XXL counts as 2XL. */
export function sizeRank(size: string) {
  const key = size.trim().toUpperCase().replace(/^XXXXL$/, '4XL').replace(/^XXXL$/, '3XL').replace(/^XXL$/, '2XL');
  const index = SIZE_ORDER.indexOf(key);
  if (index >= 0) return index;
  const numeric = Number.parseFloat(key);
  return Number.isFinite(numeric) ? 100 + numeric : 1000;
}

/* ── Photos ──────────────────────────────────────────────── */

function unique(list: (string | undefined | null)[]) {
  return Array.from(new Set(list.filter((item): item is string => Boolean(item))));
}

/** The photo that represents the product as a whole. */
export function coverImage(product: Product) {
  const firstVariantImage = product.colors?.flatMap((color) => product.colorImages?.[color] || []).find(Boolean);
  return product.image || firstVariantImage || product.secondaryImage || '';
}

/** Photos for one colour, then the product's own shots so the gallery is never empty. */
export function photosFor(product: Product, color: string) {
  return unique([...(product.colorImages?.[color] || []), product.image, product.secondaryImage]);
}

/** The first photo of a colour, falling back to the cover. */
export function colorImage(product: Product, color: string) {
  return product.colorImages?.[color]?.find(Boolean) || coverImage(product);
}

/** Colours that have their own photo — the ones worth previewing. */
export function colorsWithPhotos(product: Product) {
  return (product.colors || []).filter((color) => product.colorImages?.[color]?.some(Boolean));
}

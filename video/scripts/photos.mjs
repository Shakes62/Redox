// Snapshot the live catalogue for the film: every product that is visible on the site,
// with its colours, sizes, prices, bulk rule and one photo per colour.
//
//   npm run photos      (reads DATABASE_URL from the app's ../.env; read-only)
//
// Writes src/catalog.json and public/photos/<slug>/<n>.jpg. Photos are the store's own
// Cloudinary images, fetched once at 1000px so a render never waits on the network.
// Run it again after adding or changing products, then re-render.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.resolve(ROOT, '..');
const require = createRequire(path.join(APP, 'package.json'));
const { neon } = require('@neondatabase/serverless');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(APP, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is missing from ../.env');

const sql = neon(env.DATABASE_URL);
const rows = await sql`SELECT * FROM products WHERE COALESCE(visibility, 'visible') <> 'hidden' ORDER BY created_at DESC`;
const json = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};
const sized = (url) => url.replace('/upload/', '/upload/w_1000,c_limit,q_auto:good,f_jpg/');

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  const res = await fetch(sized(url));
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const products = [];
for (const r of rows) {
  const colors = json(r.colors, []);
  const colorImages = json(r.color_images, {});
  const variants = json(r.variants, []);
  const photos = {};
  let n = 0;
  for (const color of colors) {
    const url = (colorImages[color] || []).find(Boolean);
    if (!url) continue;
    const rel = `photos/${r.slug}/${n++}.jpg`;
    await download(url, path.join(ROOT, 'public', rel));
    photos[color] = rel;
  }
  let cover = null;
  if (r.image) {
    cover = `photos/${r.slug}/cover.jpg`;
    await download(r.image, path.join(ROOT, 'public', cover));
  }
  products.push({
    id: String(r.id),
    slug: r.slug,
    name: r.name,
    category: r.category || '',
    description: r.description || '',
    material: r.material || '',
    fit: r.fit || '',
    price: Number(r.price),
    wholesale: r.wholesale_min_quantity && r.wholesale_price ? { minQuantity: Number(r.wholesale_min_quantity), unitPrice: Number(r.wholesale_price) } : null,
    colors,
    colorHex: json(r.color_hex, {}),
    sizes: [...new Set(variants.map((v) => v.size))],
    cover,
    photos,
  });
  console.log(`${r.name.trim()}: ${Object.keys(photos).length} colour photos`);
}

// Delivery places customers can pick at checkout (Admin > Delivery), with their prices and note.
const [settings] = await sql`SELECT * FROM delivery_settings WHERE id = 1`;
const delivery = {
  allowUnlisted: settings ? settings.allow_unlisted !== false : true,
  useLocation: settings ? settings.use_location !== false : true,
  locations: (settings ? json(settings.locations, []) : [])
    .filter((l) => l.active !== false)
    .map(({ id, name, area, region, fee, note, featured }) => ({ id, name, area: area || '', region, fee: Number(fee), note: note || '', featured: featured === true })),
};
console.log(`${delivery.locations.length} delivery places`);

fs.writeFileSync(
  path.join(ROOT, 'src/catalog.json'),
  JSON.stringify({ _note: 'Written by scripts/photos.mjs from the live catalogue (visible products only). Do not edit by hand.', taken: new Date().toISOString().slice(0, 10), products, delivery }, null, 1) + '\n',
);
console.log(`wrote src/catalog.json (${products.length} products)`);

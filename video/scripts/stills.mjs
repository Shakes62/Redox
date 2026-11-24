// Usage: node scripts/stills.mjs <compositionId> <outPrefix> <frame> [frame...]
// Bundles once (with the same webpack setup as the studio), then renders each frame as a PNG.
// SCALE=0.35 renders small previews.
import { createRequire } from 'node:module';
import path from 'node:path';

import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const require = createRequire(import.meta.url);
const webpackOverride = require('./webpack-override.cjs');

const [id, prefix, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), webpackOverride });
const composition = await selectComposition({ serveUrl, id });
for (const f of frames) {
  const output = `${prefix}-${f}.png`;
  await renderStill({ composition, serveUrl, frame: Number(f), output, imageFormat: 'png', scale: Number(process.env.SCALE || 1) });
  console.log('wrote', output);
}

// Shared by remotion.config.ts (studio, render) and scripts/stills.mjs (review stills).
//
// The film draws the store with the store's own code: its CSS modules, its icons and its
// pure helpers (names, GSM, wholesale prices, delivery wording, the SMS text). `@/` points at
// the app's src/ exactly like the app's tsconfig, bare imports resolve from this folder first
// (so the app's files never pull in a second copy of React), and the app's CSS goes through
// scripts/phone-css-loader.cjs so it lays out exactly as on a 390pt phone.
const path = require('node:path');

// Remotion bundles the config, so __dirname is not this folder there: commands run from video/.
const ROOT = process.cwd();

module.exports = function webpackOverride(config) {
  const rules = ((config.module && config.module.rules) || []).map((rule) => {
    if (!rule || typeof rule !== 'object' || !(rule.test instanceof RegExp) || !rule.test.test('x.css')) return rule;
    const use = Array.isArray(rule.use) ? rule.use : [];
    // Loaders run last to first: the phone rewrite runs before css-loader sees the file.
    return { ...rule, use: [...use, { loader: path.join(ROOT, 'scripts/phone-css-loader.cjs') }] };
  });
  return {
    ...config,
    module: { ...config.module, rules },
    resolve: {
      ...config.resolve,
      alias: { ...((config.resolve && config.resolve.alias) || {}), '@': path.resolve(ROOT, '../src') },
      modules: [path.join(ROOT, 'node_modules'), 'node_modules'],
    },
  };
};

// Webpack loader: the store's own CSS, laid out exactly as it is on a 390pt phone.
//
// The film imports the storefront's real stylesheets (src/**/*.module.css and
// src/app/globals.css in the app) so every screen uses the site's real classes. But the
// film renders in a 1080 or 1920 px wide browser, so the site's phone rules
// (@media (max-width: 900px) and so on) would never apply, and clamp(…, 6.9vw, …) would
// size text for a desktop. This loader rewrites the app's CSS as a phone sees it:
//
//   @media blocks   evaluated for a 390 x 844 touch screen: true ones are unwrapped in
//                   place (so the cascade order is unchanged), false ones are removed
//   vw / vh units   replaced with the phone's pixel values (1vw = 3.9px, 1vh = 8.44px)
//
// Only files inside the app's src/ folder are touched; the film's own CSS is left alone.
const path = require('node:path');

const W = 390;
const H = 844;
const APP_SRC = path.resolve(__dirname, '../../src') + path.sep;

const toPx = (value, unit) => {
  const n = parseFloat(value);
  if (unit === 'px') return n;
  if (unit === 'rem' || unit === 'em') return n * 16;
  return NaN;
};

/** One media feature, e.g. "max-width: 900px", "hover: none". */
function feature(text) {
  const m = /^\s*([a-z-]+)\s*(?::\s*(.+?))?\s*$/i.exec(text);
  if (!m) return false;
  const [, name, raw = ''] = m;
  const value = raw.trim().toLowerCase();
  const len = /^([\d.]+)(px|rem|em)$/.exec(value);
  switch (name.toLowerCase()) {
    case 'max-width': return len ? W <= toPx(len[1], len[2]) : false;
    case 'min-width': return len ? W >= toPx(len[1], len[2]) : false;
    case 'max-height': return len ? H <= toPx(len[1], len[2]) : false;
    case 'min-height': return len ? H >= toPx(len[1], len[2]) : false;
    case 'hover':
    case 'any-hover': return value === 'none';
    case 'pointer':
    case 'any-pointer': return value === 'coarse';
    case 'prefers-reduced-motion': return value === 'no-preference';
    case 'prefers-color-scheme': return value === 'dark';
    case 'orientation': return value === 'portrait';
    default: return false;
  }
}

/** A whole media query list: "screen and (max-width: 900px), (hover: none)". */
function matches(query) {
  return query.split(',').some((part) => {
    let q = part.trim().toLowerCase();
    let negate = false;
    if (q.startsWith('not ')) {
      negate = true;
      q = q.slice(4);
    }
    q = q.replace(/^only\s+/, '');
    const pieces = q.split(/\s+and\s+/);
    const ok = pieces.every((p) => {
      p = p.trim();
      if (p === 'screen' || p === 'all') return true;
      if (p === 'print') return false;
      const inner = /^\((.*)\)$/.exec(p);
      return inner ? feature(inner[1]) : false;
    });
    return negate ? !ok : ok;
  });
}

/** Index of the brace that closes the block opened at `open`, skipping strings. */
function closing(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const end = css.indexOf(c, i + 1);
      i = end < 0 ? css.length : end;
    } else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('phone-css-loader: unbalanced braces');
}

function unwrapMedia(css) {
  let out = '';
  let i = 0;
  for (;;) {
    const at = css.indexOf('@media', i);
    if (at < 0) return out + css.slice(i);
    const open = css.indexOf('{', at);
    const close = closing(css, open);
    const query = css.slice(at + 6, open);
    out += css.slice(i, at);
    if (matches(query)) out += unwrapMedia(css.slice(open + 1, close));
    i = close + 1;
  }
}

function phone(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return unwrapMedia(noComments)
    .replace(/(-?\d*\.?\d+)(s|d|l)?vh\b/g, (_, n) => `${+(n * H / 100).toFixed(3)}px`)
    .replace(/(-?\d*\.?\d+)(s|d|l)?vw\b/g, (_, n) => `${+(n * W / 100).toFixed(3)}px`);
}

module.exports = function phoneCssLoader(source) {
  if (!this.resourcePath.startsWith(APP_SRC)) return source;
  return phone(source);
};
module.exports.phone = phone;

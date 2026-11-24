// The shop and the product page at true phone scale: the markup of ShopGrid.tsx,
// ProductCard.tsx, ProductDetail.tsx and ProductGallery.tsx with their own CSS modules, and the
// store's own helpers for every price, name, swatch and the 2% service fee.
import React from 'react';

import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, LockIcon, MinusIcon, PlusIcon, RulerIcon, ShareIcon } from '@/components/ui/Icons';
import cardStyles from '@/components/product/ProductCard.module.css';
import pdp from '@/components/product/ProductDetail.module.css';
import gallery from '@/components/product/ProductGallery.module.css';
import shop from '@/components/commerce/ShopGrid.module.css';
import { calcOrderTotal, calcServiceCharge, formatCurrency } from '@/lib/format';
import { displayColorName } from '@/lib/product-display';
import { effectiveUnitPrice, isWholesaleApplied, savingPerUnit, unitsUntilWholesale } from '@/lib/wholesale';

import { KINDS, PIECES, type Piece } from '../catalog';
import { Button, Fill, SiteNav } from './app';

/* ---------------------------------------------------------------- ProductCard.tsx */

export const ProductCard: React.FC<{ p: Piece; color?: string; press?: number }> = ({ p, color, press = 1 }) => {
  const dots = p.colors.slice(0, 5);
  const more = p.colors.length - dots.length;
  return (
    <article data-m={`card-${p.slug}`} className={cardStyles.card} style={{ transform: `scale(${press})` }}>
      <div className={cardStyles.mediaWrap}>
        <span className={cardStyles.media}>
          <Fill src={p.photo(color)} className={`${cardStyles.image} ${cardStyles.imagePrimary}`} />
          <span className={cardStyles.pricePill}>
            <span>{formatCurrency(p.price)}</span>
          </span>
        </span>
        <button className={cardStyles.save} type="button">
          <HeartIcon size={19} />
        </button>
      </div>
      <div className={cardStyles.meta}>
        <h3 className={cardStyles.name}>
          <span>{p.name}</span>
        </h3>
        <div className={cardStyles.row}>
          <div className={cardStyles.dots}>
            {dots.map((c) => (
              <button key={c} className={`${cardStyles.dot} ${color === c ? cardStyles.dotOn : ''}`} style={{ background: p.swatch(c) }} type="button" />
            ))}
            {more > 0 ? <span className={cardStyles.more}>+{more}</span> : null}
          </div>
          {p.bulk ? (
            <span className={cardStyles.bulk}>
              {p.bulk.minQuantity}+ for {formatCurrency(p.bulk.unitPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
};

/* ---------------------------------------------------------------- ShopGrid.tsx */

export const ShopScreen: React.FC<{ scroll?: number; pressSlug?: string; press?: number; bag?: number }> = ({ scroll = 0, pressSlug, press = 1, bag = 0 }) => (
  <>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${-scroll}px)` }}>
      <section className={shop.shop} style={{ paddingTop: 'calc(var(--nav-height) + 18px)' }}>
        <div className={shop.head}>
          <h2 className={shop.title}>
            Shop all
            <sup className={shop.count}>{PIECES.length}</sup>
          </h2>
          <label className={shop.sort}>
            <select value="featured" onChange={() => undefined}>
              <option value="featured">Featured</option>
            </select>
            <ChevronDownIcon height={16} width={16} />
          </label>
        </div>
        <div className={shop.chips}>
          <button className={`${shop.chip} ${shop.chipOn}`} type="button">
            All <span>{PIECES.length}</span>
          </button>
          {KINDS.map((k) => (
            <button key={k.kind} className={shop.chip} type="button">
              {k.label} <span>{k.pieces.length}</span>
            </button>
          ))}
        </div>
        <div className={shop.grid}>
          {PIECES.map((p) => (
            <ProductCard key={p.slug} p={p} press={p.slug === pressSlug ? press : 1} />
          ))}
        </div>
      </section>
    </div>
    <SiteNav bag={bag} />
  </>
);

/* ---------------------------------------------------------------- ProductDetail.tsx */

export type Qty = Record<string, Record<string, number>>;

export const selection = (q: Qty) =>
  Object.entries(q).flatMap(([color, sizes]) =>
    Object.entries(sizes)
      .filter(([, n]) => n > 0)
      .map(([size, qty]) => ({ color, size, qty })),
  );

export const ProductScreen: React.FC<{
  p: Piece;
  color: string;
  qty: Qty;
  scroll?: number;
  /** 0..1 photo crossfade from `prevColor` to `color`. */
  photoMix?: number;
  prevColor?: string;
  buyPress?: number;
  /** A size tile being pressed: [size, scale]. */
  sizePress?: [string, number];
  swatchPress?: [string, number];
  bag?: number;
  glowBulk?: number;
}> = ({ p, color, qty, scroll = 0, photoMix = 1, prevColor, buyPress = 1, sizePress, swatchPress, bag = 0, glowBulk = 0 }) => {
  const sel = selection(qty);
  const total = sel.reduce((n, l) => n + l.qty, 0);
  const rule = p.bulk;
  const applied = isWholesaleApplied(p, total);
  const unit = effectiveUnitPrice(p, total);
  const away = unitsUntilWholesale(p, total);
  const totalPrice = Math.round(unit * total * 100) / 100;
  const orderTotal = calcOrderTotal(totalPrice);
  const progress = rule ? Math.min(1, total / rule.minQuantity) : 0;
  const photos = [p.photo(color), p.cover || ''].filter(Boolean);
  const buyLabel = total > 0 ? `Buy now · ${formatCurrency(orderTotal)}` : 'Buy now';
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${-scroll}px)` }}>
        <section className={pdp.pdp}>
          <div className={pdp.galleryCol}>
            <div className={gallery.gallery}>
              <div className={gallery.main}>
                <div className={gallery.track} style={{ overflow: 'hidden' }}>
                  <div className={gallery.slide} style={{ position: 'relative' }}>
                    {prevColor && photoMix < 1 ? <Fill src={p.photo(prevColor)} className={gallery.photo} /> : null}
                    <Fill src={photos[0]} className={gallery.photo} style={{ opacity: photoMix, transform: `scale(${1.04 - 0.04 * photoMix})` }} />
                  </div>
                </div>
                <button className={`${gallery.arrow} ${gallery.arrowPrev}`} type="button">
                  <ChevronLeftIcon />
                </button>
                <button className={`${gallery.arrow} ${gallery.arrowNext}`} type="button">
                  <ChevronRightIcon />
                </button>
                <div className={gallery.dots}>
                  {photos.map((s, i) => (
                    <span key={s} className={`${gallery.dot} ${i === 0 ? gallery.dotOn : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={pdp.panel}>
            <span className={pdp.back}>
              <ChevronLeftIcon height={16} width={16} /> Shop
            </span>
            <div className={pdp.tags}>
              {p.gsm ? <span className={pdp.tagStrong}>{p.gsm} GSM</span> : null}
              {p.kind !== 'other' ? <span>{p.kindLabel}</span> : null}
              {p.material ? <span>{p.material}</span> : null}
            </div>
            <h1 className={pdp.name}>{p.name}</h1>
            <div className={pdp.priceRow}>
              <span className={pdp.price}>{formatCurrency(p.price)}</span>
              {rule ? (
                <span className={pdp.bulkChip}>
                  {rule.minQuantity}+ for {formatCurrency(rule.unitPrice)} each
                </span>
              ) : null}
            </div>

            <div data-m="colour" className={pdp.optionGroup}>
              <h2 className={pdp.optionTitle}>
                <span className={pdp.step}>1</span> Colour
                <span className={pdp.optionValue}>{displayColorName(color)}</span>
              </h2>
              <div className={pdp.swatches}>
                {p.colors.map((c) => {
                  const n = Object.values(qty[c] || {}).reduce((a, b) => a + b, 0);
                  return (
                    <button data-m={`sw-${c}`} key={c} className={`${pdp.swatch} ${c === color ? pdp.swatchOn : ''}`} type="button" style={{ transform: swatchPress && swatchPress[0] === c ? `scale(${swatchPress[1]})` : undefined }}>
                      <Fill src={p.photo(c)} className={pdp.swatchPhoto} />
                      <span className={pdp.swatchChip} style={{ background: p.swatch(c) }} />
                      {n > 0 ? <span className={pdp.swatchCount}>{n}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div data-m="sizes" className={pdp.optionGroup}>
              <div className={pdp.optionHeader}>
                <h2 className={pdp.optionTitle}>
                  <span className={pdp.step}>2</span> Size
                  <span className={pdp.optionValue}>Tap to add</span>
                </h2>
                <span className={pdp.sizeGuide}>
                  <RulerIcon height={16} width={16} /> Size guide
                </span>
              </div>
              <div className={pdp.sizeGrid}>
                {p.sizes.map((size) => {
                  const n = qty[color]?.[size] || 0;
                  const name = size.toUpperCase() === 'QTY' ? 'One size' : size;
                  return (
                    <div data-m={`size-${size}`} key={size} className={`${pdp.sizeTile} ${n > 0 ? pdp.sizeTileOn : ''}`} style={{ transform: sizePress && sizePress[0] === size ? `scale(${sizePress[1]})` : undefined }}>
                      <span className={pdp.sizeLabel}>{name}</span>
                      <div className={pdp.stepper}>
                        {n > 0 ? (
                          <>
                            <button type="button">
                              <MinusIcon height={16} width={16} />
                            </button>
                            <output>{n}</output>
                          </>
                        ) : null}
                        <button className={n === 0 ? pdp.addWhole : undefined} type="button">
                          <PlusIcon height={16} width={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {rule ? (
              <div data-m="bulk" className={`${pdp.bulkMeter} ${applied ? pdp.bulkMeterOn : ''}`} style={{ boxShadow: glowBulk ? `0 0 0 ${3 * glowBulk}px var(--accent-ring)` : undefined }}>
                <div className={pdp.bulkTop}>
                  <strong>{applied ? `Wholesale price on · ${formatCurrency(rule.unitPrice)} each` : `Buy ${rule.minQuantity}+, pay ${formatCurrency(rule.unitPrice)} each`}</strong>
                  <span className="tabular">
                    {Math.min(total, rule.minQuantity)}/{rule.minQuantity}
                  </span>
                </div>
                <div className={pdp.bulkTrack}>
                  <span style={{ transform: `scaleX(${progress})` }} />
                </div>
                <p className={pdp.bulkNote}>{applied ? `You save ${formatCurrency(savingPerUnit(p) * total)}` : total > 0 ? `${away} more to unlock · mix any size and colour` : 'Mix any size and colour'}</p>
              </div>
            ) : null}

            {total > 0 ? (
              <div data-m="summary" className={pdp.summary}>
                <ul className={pdp.summaryLines}>
                  {sel.map(({ color: c, size, qty: n }) => (
                    <li key={`${c}-${size}`}>
                      <span className={pdp.summaryDot} style={{ background: p.swatch(c) }} />
                      <span className={pdp.summaryText}>
                        {displayColorName(c)} · {size} <em>×{n}</em>
                      </span>
                      <span className="tabular">{formatCurrency(unit * n)}</span>
                    </li>
                  ))}
                </ul>
                <dl className={pdp.summaryTotals}>
                  <div>
                    <dt>
                      {total} {total === 1 ? 'piece' : 'pieces'}
                    </dt>
                    <dd>{formatCurrency(totalPrice)}</dd>
                  </div>
                  <div>
                    <dt>Service fee (2%)</dt>
                    <dd>{formatCurrency(calcServiceCharge(totalPrice))}</dd>
                  </div>
                  <div className={pdp.summaryTotal}>
                    <dt>Total</dt>
                    <dd>{formatCurrency(orderTotal)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div className={pdp.actions}>
              <h2 className={pdp.optionTitle}>
                <span className={pdp.step}>3</span> Pay
                <span className={pdp.optionValue}>MoMo, card or bank</span>
              </h2>
              <Button m="buy" full size="lg" press={buyPress}>
                {buyLabel}
              </Button>
              <div className={pdp.secondaryRow}>
                <Button className={pdp.addButton} size="lg" variant="secondary">
                  Add to bag
                </Button>
                <button className={pdp.iconAction} type="button">
                  <HeartIcon />
                </button>
                <button className={pdp.iconAction} type="button">
                  <ShareIcon />
                </button>
              </div>
              <p className={pdp.payNote}>
                <LockIcon size={14} weight="fill" /> Secured by Paystack
              </p>
            </div>
          </div>
        </section>
      </div>
      <SiteNav bag={bag} />
    </>
  );
};

export { CheckIcon };

'use client';

import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckIcon, ChevronLeftIcon, HeartIcon, LockIcon, MinusIcon, PlusIcon, RulerIcon, ShareIcon } from '@/components/ui/Icons';
import { calcOrderTotal, calcServiceCharge, formatCurrency } from '@/lib/format';
import { toCartItem, useCartStore, type CartItem } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import type { Product, Variant } from '@/types/product';
import {
  getProductStockSummary,
  getVariantStockLimit,
  hasTrackedInventory,
  isVariantInStock
} from '@/lib/inventory';
import {
  KIND_LABELS,
  colorImage,
  displayColorName,
  displayProductName,
  photosFor,
  productGsm,
  productKind,
  sizeRank,
  swatchBackground
} from '@/lib/product-display';
import {
  effectiveUnitPrice,
  getWholesaleRule,
  isWholesaleApplied,
  savingPerUnit,
  unitsUntilWholesale
} from '@/lib/wholesale';
import { ProductGallery } from './ProductGallery';
import styles from './ProductDetail.module.css';

interface ProductDetailProps {
  product: Product;
}

type Quantities = Record<string, Record<string, number>>;

/** Only worth saying when it is running out. */
function lowStockHint(variant: Variant) {
  if (!isVariantInStock(variant)) return 'Sold out';
  if (!hasTrackedInventory(variant)) return '';
  const left = Math.floor(variant.inventory as number);
  return left <= 3 ? `${left} left` : '';
}

export function ProductDetail({ product }: ProductDetailProps) {
  const safeColors = useMemo(
    () => (Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : ['Default']),
    [product.colors]
  );
  const safeVariants = useMemo(
    () => (Array.isArray(product.variants) ? product.variants : []),
    [product.variants]
  );

  const name = displayProductName(product.name);
  const gsm = productGsm(product);
  const kind = productKind(product);
  // Open on a colour that can actually be bought, not one that is gone in every size.
  const defaultColor = useMemo(
    () => safeColors.find((color) => safeVariants.some((variant) => variant.color === color && isVariantInStock(variant))) || safeColors[0] || '',
    [safeColors, safeVariants]
  );

  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [quantities, setQuantities] = useState<Quantities>({});
  const [restoredProductId, setRestoredProductId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [stickyOpen, setStickyOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const sizesRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted(product.id));
  const addItems = useCartStore((state) => state.addItems);
  const buyNow = useCartStore((state) => state.buyNow);
  const buyNowCompletedAt = useCartStore((state) => state.buyNowCompletedAt);

  /**
   * Whether this piece can be bought at all, decided once so the size list,
   * both buttons and the sticky bar never disagree about it.
   */
  const soldOut = getProductStockSummary(product).isSoldOut;
  const comingSoon = product.badge === 'COMING SOON';
  const canBuy = !soldOut && !comingSoon;

  const smooth = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setError('');
  };

  // ── Saved selection (survives a refresh) ───────────────────
  useEffect(() => {
    try {
      // A colour picked on the home page or a product card (?color=) wins over the saved one.
      const linkedColor = new URLSearchParams(window.location.search).get('color');
      const savedColor = localStorage.getItem(`redox_sel_color_${product.id}`);
      const startColor = [linkedColor, savedColor].find((color) => color && safeColors.includes(color));
      setSelectedColor(startColor || defaultColor);
      const savedQuantities = localStorage.getItem(`redox_sel_qty_${product.id}`);
      if (savedQuantities) setQuantities(JSON.parse(savedQuantities));
    } catch (caught) {
      console.error('Failed to load persisted product choices', caught);
    }
    setRestoredProductId(product.id);
  }, [product.id, safeColors, defaultColor]);

  useEffect(() => {
    if (restoredProductId !== product.id || !selectedColor) return;
    try {
      localStorage.setItem(`redox_sel_color_${product.id}`, selectedColor);
    } catch {
      /* Remembering the choice is a convenience only. */
    }
  }, [selectedColor, product.id, restoredProductId]);

  useEffect(() => {
    if (restoredProductId !== product.id) return;
    try {
      if (Object.keys(quantities).length > 0) {
        localStorage.setItem(`redox_sel_qty_${product.id}`, JSON.stringify(quantities));
      }
    } catch {
      /* Remembering the choice is a convenience only. */
    }
  }, [quantities, product.id, restoredProductId]);

  const clearSelection = () => {
    setQuantities({});
    try {
      localStorage.removeItem(`redox_sel_qty_${product.id}`);
    } catch {
      /* no-op */
    }
  };

  // A Buy-now order finished in the checkout drawer: start fresh.
  const lastCompletion = useRef(buyNowCompletedAt);
  useEffect(() => {
    if (buyNowCompletedAt === lastCompletion.current) return;
    lastCompletion.current = buyNowCompletedAt;
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyNowCompletedAt]);

  // ── Derived selection ──────────────────────────────────────
  const selection = useMemo(
    () => Object.entries(quantities).flatMap(([color, sizes]) =>
      Object.entries(sizes)
        .filter(([, qty]) => qty > 0)
        .map(([size, qty]) => ({ color, size, qty }))
    ),
    [quantities]
  );
  const totalQuantity = selection.reduce((sum, line) => sum + line.qty, 0);

  /**
   * Bulk pricing counts every size and colour of this product together, so the
   * unit price is derived once and every figure on the page quotes it.
   */
  const bulkRule = getWholesaleRule(product);
  const bulkApplied = isWholesaleApplied(product, totalQuantity);
  const unitPrice = effectiveUnitPrice(product, totalQuantity);
  const bulkUnitsAway = unitsUntilWholesale(product, totalQuantity);
  const totalPrice = Math.round(unitPrice * totalQuantity * 100) / 100;
  const orderTotal = calcOrderTotal(totalPrice);

  const activeColorVariants = useMemo(
    () => safeVariants
      .filter((variant) => variant.color === selectedColor)
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
    [safeVariants, selectedColor]
  );
  const photos = useMemo(() => photosFor(product, selectedColor), [product, selectedColor]);

  const setQty = (color: string, size: string, next: number) => {
    setError('');
    setQuantities((current) => ({
      ...current,
      [color]: { ...(current[color] || {}), [size]: next }
    }));
  };

  // ── Sticky bar: shown once the main buttons scroll out of view ──
  useEffect(() => {
    const target = actionsRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyOpen(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const selectionLines = (): CartItem[] | null => {
    if (!canBuy) {
      setError(soldOut ? 'This piece is sold out.' : 'This piece is not on sale yet.');
      return null;
    }
    const lines = selection.flatMap(({ color, size, qty }) => {
      const variant = safeVariants.find((candidate) => candidate.size === size && candidate.color === color && isVariantInStock(candidate));
      return variant ? [toCartItem(product, variant, qty, product.colorImages?.[color]?.[0] || product.image)] : [];
    });
    if (lines.length === 0) {
      setError('Pick a size first.');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 420);
      sizesRef.current?.scrollIntoView({ behavior: smooth(), block: 'center' });
      return null;
    }
    setError('');
    return lines;
  };

  const handleBuyNow = () => {
    const lines = selectionLines();
    if (lines) buyNow(lines);
  };

  const handleAddToCart = () => {
    const lines = selectionLines();
    if (!lines) return;
    addItems(lines);
    clearSelection();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      /* The share sheet was dismissed. */
    }
  };

  const buyLabel = soldOut ? 'Sold out' : comingSoon ? 'Coming soon' : totalQuantity > 0 ? `Buy now · ${formatCurrency(orderTotal)}` : 'Buy now';
  const bulkProgress = bulkRule ? Math.min(1, totalQuantity / bulkRule.minQuantity) : 0;

  return (
    <>
      <section className={styles.pdp}>
        <div className={styles.galleryCol}>
          <ProductGallery alt={`${name} in ${displayColorName(selectedColor)}`} images={photos} key={selectedColor} preloadFirst />
        </div>

        <div className={styles.panel}>
          <Link className={styles.back} href="/shop">
            <ChevronLeftIcon height={16} width={16} /> Shop
          </Link>

          <div className={styles.tags}>
            {gsm ? <span className={styles.tagStrong}>{gsm} GSM</span> : null}
            {kind !== 'other' ? <span>{KIND_LABELS[kind].one}</span> : null}
            {product.material ? <span>{product.material}</span> : null}
          </div>

          <h1 className={styles.name}>{name}</h1>

          <div className={styles.priceRow}>
            <span className={`${styles.price} ${product.compareAtPrice ? styles.salePrice : ''}`}>{formatCurrency(product.price)}</span>
            {product.compareAtPrice ? <s className={styles.comparePrice}>{formatCurrency(product.compareAtPrice)}</s> : null}
            {bulkRule && canBuy ? (
              <span className={styles.bulkChip}>
                {bulkRule.minQuantity}+ for {formatCurrency(bulkRule.unitPrice)} each
              </span>
            ) : null}
          </div>

          {/* ── 1. Colour ───────────────────────────── */}
          <div className={styles.optionGroup}>
            <h2 className={styles.optionTitle}>
              <span className={styles.step}>1</span> Colour
              <span className={styles.optionValue}>{displayColorName(selectedColor)}</span>
            </h2>
            <div aria-label="Colour" className={styles.swatches} role="radiogroup">
              {safeColors.map((color) => {
                const photo = product.colorImages?.[color]?.find(Boolean) ? colorImage(product, color) : '';
                const isSelected = selectedColor === color;
                const colorQty = Object.values(quantities[color] || {}).reduce((sum, qty) => sum + qty, 0);
                const label = displayColorName(color);
                // Every size gone: still pickable (to look at), but dimmed so nobody is surprised at the sizes.
                const colorSoldOut = !safeVariants.some((variant) => variant.color === color && isVariantInStock(variant));
                return (
                  <button
                    aria-checked={isSelected}
                    aria-label={`${label}${colorSoldOut ? ', sold out' : ''}${colorQty > 0 ? `, ${colorQty} picked` : ''}`}
                    className={`${styles.swatch} ${isSelected ? styles.swatchOn : ''} ${colorSoldOut ? styles.swatchOut : ''}`}
                    key={color}
                    onClick={() => selectColor(color)}
                    role="radio"
                    title={label}
                    type="button"
                  >
                    {photo ? (
                      <Image alt="" className={styles.swatchPhoto} fill sizes="64px" src={photo} />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={styles.swatchChip}
                      style={{ background: swatchBackground(color, product.colorHex?.[color]) }}
                    />
                    {colorQty > 0 ? <span className={styles.swatchCount}>{colorQty}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. Size & quantity ──────────────────── */}
          <div className={`${styles.optionGroup} ${shaking ? styles.shaking : ''}`} ref={sizesRef}>
            <div className={styles.optionHeader}>
              <h2 className={styles.optionTitle}>
                <span className={styles.step}>2</span> Size
                <span className={styles.optionValue}>Tap to add</span>
              </h2>
              <Link className={styles.sizeGuide} href="/size-guide">
                <RulerIcon height={16} width={16} /> Size guide
              </Link>
            </div>

            {canBuy && activeColorVariants.length > 0 && !activeColorVariants.some(isVariantInStock) ? (
              <p className={styles.colorSoldOut}>
                {displayColorName(selectedColor)} is sold out. Pick another colour above.
              </p>
            ) : null}

            <div className={styles.sizeGrid}>
              {activeColorVariants.map((variant) => {
                const size = variant.size;
                const qty = quantities[selectedColor]?.[size] || 0;
                const stockLimit = getVariantStockLimit(variant);
                const inStock = isVariantInStock(variant) && !comingSoon;
                const hint = comingSoon ? 'Soon' : lowStockHint(variant);
                const sizeName = size.toUpperCase() === 'QTY' ? 'One size' : size;
                return (
                  <div
                    className={`${styles.sizeTile} ${qty > 0 ? styles.sizeTileOn : ''} ${inStock ? '' : styles.sizeTileOut}`}
                    key={size}
                  >
                    <span className={styles.sizeLabel}>{sizeName}</span>
                    {hint ? <span className={styles.sizeHint}>{hint}</span> : null}
                    {inStock ? (
                      <div aria-label={`Quantity for ${sizeName}`} className={styles.stepper} role="group">
                        {qty > 0 ? (
                          <>
                            <button
                              aria-label={`Remove one ${sizeName}`}
                              onClick={() => setQty(selectedColor, size, Math.max(0, qty - 1))}
                              type="button"
                            >
                              <MinusIcon height={16} width={16} />
                            </button>
                            <output aria-live="polite">{qty}</output>
                          </>
                        ) : null}
                        {/* With nothing picked, this button covers the whole tile: tap anywhere to add one. */}
                        <button
                          aria-label={`Add one ${sizeName}`}
                          className={qty === 0 ? styles.addWhole : undefined}
                          disabled={qty >= stockLimit}
                          onClick={() => setQty(selectedColor, size, Math.min(stockLimit, qty + 1))}
                          type="button"
                        >
                          <PlusIcon height={16} width={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </div>

          {/* ── Bulk meter: a reason to pick more, then a live confirmation ── */}
          {bulkRule && canBuy ? (
            <div className={`${styles.bulkMeter} ${bulkApplied ? styles.bulkMeterOn : ''}`}>
              <div className={styles.bulkTop}>
                <strong>{bulkApplied ? `Wholesale price on · ${formatCurrency(bulkRule.unitPrice)} each` : `Buy ${bulkRule.minQuantity}+, pay ${formatCurrency(bulkRule.unitPrice)} each`}</strong>
                <span className="tabular">{Math.min(totalQuantity, bulkRule.minQuantity)}/{bulkRule.minQuantity}</span>
              </div>
              <div aria-hidden="true" className={styles.bulkTrack}>
                <span style={{ transform: `scaleX(${bulkProgress})` }} />
              </div>
              <p className={styles.bulkNote}>
                {bulkApplied
                  ? `You save ${formatCurrency(savingPerUnit(product) * totalQuantity)}`
                  : totalQuantity > 0
                    ? `${bulkUnitsAway} more to unlock · mix any size and colour`
                    : 'Mix any size and colour'}
              </p>
            </div>
          ) : null}

          {/* What the customer has picked, priced exactly as checkout will price it. */}
          {totalQuantity > 0 && (
            <div className={styles.summary}>
              <ul className={styles.summaryLines}>
                {selection.map(({ color, size, qty }) => (
                  <li key={`${color}-${size}`}>
                    <span className={styles.summaryDot} style={{ background: swatchBackground(color, product.colorHex?.[color]) }} />
                    <span className={styles.summaryText}>
                      {displayColorName(color)} · {size.toUpperCase() === 'QTY' ? 'One size' : size} <em>×{qty}</em>
                    </span>
                    <span className="tabular">{formatCurrency(unitPrice * qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className={styles.summaryTotals}>
                <div><dt>{totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'}</dt><dd>{formatCurrency(totalPrice)}</dd></div>
                <div><dt>Service fee (2%)</dt><dd>{formatCurrency(calcServiceCharge(totalPrice))}</dd></div>
                <div className={styles.summaryTotal}><dt>Total</dt><dd>{formatCurrency(orderTotal)}</dd></div>
              </dl>
            </div>
          )}

          {/* ── 3. Pay ──────────────────────────────── */}
          <div className={styles.actions} ref={actionsRef}>
            <h2 className={styles.optionTitle}>
              <span className={styles.step}>3</span> Pay
              <span className={styles.optionValue}>MoMo, card or bank</span>
            </h2>
            <Button disabled={!canBuy} fullWidth onClick={handleBuyNow} size="lg">
              {buyLabel}
            </Button>
            <div className={styles.secondaryRow}>
              {canBuy && (
                <Button className={styles.addButton} onClick={handleAddToCart} size="lg" variant="secondary">
                  Add to bag
                </Button>
              )}
              <button
                aria-label={isWishlisted ? 'Remove from saved' : 'Save'}
                aria-pressed={isWishlisted}
                className={`${styles.iconAction} ${isWishlisted ? styles.iconActionActive : ''}`}
                onClick={() => toggleWishlist(product)}
                type="button"
              >
                <HeartIcon weight={isWishlisted ? 'fill' : 'regular'} />
              </button>
              <button
                aria-label={shared ? 'Link copied' : 'Share'}
                className={`${styles.iconAction} ${shared ? styles.iconActionDone : ''}`}
                onClick={handleShare}
                type="button"
              >
                {shared ? <CheckIcon /> : <ShareIcon />}
              </button>
            </div>
            <p className={styles.payNote}>
              <LockIcon size={14} weight="fill" /> Secured by Paystack
            </p>
          </div>

          {product.description ? (
            <details className={styles.details}>
              <summary>Details</summary>
              <p>{product.description}</p>
            </details>
          ) : null}
        </div>
      </section>

      <div
        aria-hidden={!stickyOpen}
        className={`${styles.stickyBar} ${stickyOpen ? styles.stickyOpen : ''}`}
        inert={!stickyOpen}
      >
        <div className={styles.stickyText}>
          <p className={styles.stickyName}>{name}</p>
          <p className={styles.stickyMeta}>
            {totalQuantity > 0
              ? `${totalQuantity} ${totalQuantity === 1 ? 'piece' : 'pieces'} · ${formatCurrency(orderTotal)}`
              : `Pick a size · ${formatCurrency(product.price)}`}
          </p>
        </div>
        <Button disabled={!canBuy} onClick={handleBuyNow}>
          {soldOut ? 'Sold out' : comingSoon ? 'Coming soon' : 'Buy now'}
        </Button>
      </div>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
    </>
  );
}

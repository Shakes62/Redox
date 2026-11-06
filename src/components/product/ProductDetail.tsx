'use client';

import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckIcon, HeartIcon, MinusIcon, PlusIcon, RulerIcon, ShareIcon, StarIcon } from '@/components/ui/Icons';
import { calcOrderTotal, calcServiceCharge, formatCurrency } from '@/lib/format';
import { toCartItem, useCartStore, type CartItem } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import type { Product } from '@/types/product';
import {
  getProductStockSummary,
  getVariantStockLabel,
  getVariantStockLimit,
  isVariantInStock
} from '@/lib/inventory';
import {
  effectiveUnitPrice,
  getWholesaleRule,
  isWholesaleApplied,
  savingPerUnit,
  savingPercent,
  unitsUntilWholesale
} from '@/lib/wholesale';
import styles from './ProductDetail.module.css';

interface ProductDetailProps {
  product: Product;
}

type Quantities = Record<string, Record<string, number>>;

export function ProductDetail({ product }: ProductDetailProps) {
  const safeColors = useMemo(
    () => (Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : ['Default']),
    [product.colors]
  );
  const safeVariants = useMemo(
    () => (Array.isArray(product.variants) ? product.variants : []),
    [product.variants]
  );

  const [selectedColor, setSelectedColor] = useState(safeColors[0] || '');
  const [quantities, setQuantities] = useState<Quantities>({});
  const [restoredProductId, setRestoredProductId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [stickyOpen, setStickyOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const colorRailRef = useRef<HTMLDivElement>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const restoredColorScrolledForRef = useRef<string | null>(null);
  const [colorRailState, setColorRailState] = useState({ canScroll: false, atStart: true, atEnd: true, progress: 0 });

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

  // ── Colour rail ────────────────────────────────────────────
  useEffect(() => {
    const rail = colorRailRef.current;
    if (!rail) return;
    let frame = 0;

    const updateRail = () => {
      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const next = {
        canScroll: maxScroll > 1,
        atStart: rail.scrollLeft <= 1,
        atEnd: rail.scrollLeft >= maxScroll - 1,
        progress: maxScroll > 0 ? rail.scrollLeft / maxScroll : 0
      };
      setColorRailState((current) =>
        current.canScroll === next.canScroll && current.atStart === next.atStart &&
        current.atEnd === next.atEnd && current.progress === next.progress ? current : next
      );
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateRail();
      });
    };

    updateRail();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(rail);
    rail.addEventListener('scroll', scheduleUpdate, { passive: true });
    return () => {
      observer.disconnect();
      rail.removeEventListener('scroll', scheduleUpdate);
      cancelAnimationFrame(frame);
    };
  }, [safeColors]);

  const smooth = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  const scrollColors = (direction: -1 | 1) => {
    const rail = colorRailRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.75, 150), behavior: smooth() });
  };

  const centreCard = (card: HTMLElement, behavior: ScrollBehavior) => {
    const rail = colorRailRef.current;
    if (!rail) return;
    const railRect = rail.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    rail.scrollBy({ left: cardRect.left - railRect.left - (railRect.width - cardRect.width) / 2, behavior });
  };

  const selectColor = (color: string, card: HTMLElement) => {
    setSelectedColor(color);
    setError('');
    centreCard(card, smooth());
  };

  // ── Saved selection (survives a refresh) ───────────────────
  useEffect(() => {
    try {
      const savedColor = localStorage.getItem(`redox_sel_color_${product.id}`);
      setSelectedColor(savedColor && safeColors.includes(savedColor) ? savedColor : safeColors[0] || '');
      const savedQuantities = localStorage.getItem(`redox_sel_qty_${product.id}`);
      if (savedQuantities) setQuantities(JSON.parse(savedQuantities));
    } catch (caught) {
      console.error('Failed to load persisted product choices', caught);
    }
    setRestoredProductId(product.id);
  }, [product.id, safeColors]);

  useEffect(() => {
    if (restoredProductId !== product.id || !selectedColor) return;
    try {
      localStorage.setItem(`redox_sel_color_${product.id}`, selectedColor);
    } catch {
      /* Remembering the choice is a convenience only. */
    }
  }, [selectedColor, product.id, restoredProductId]);

  useEffect(() => {
    if (restoredProductId !== product.id || restoredColorScrolledForRef.current === product.id) return;
    const index = safeColors.indexOf(selectedColor);
    const card = colorRailRef.current?.children.item(index) as HTMLElement | null;
    if (!card || index < 0) return;
    centreCard(card, 'auto');
    restoredColorScrolledForRef.current = product.id;
  }, [restoredProductId, product.id, selectedColor, safeColors]);

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

  const activeColorVariants = useMemo(
    () => safeVariants.filter((variant) => variant.color === selectedColor),
    [safeVariants, selectedColor]
  );

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
      setError('Choose at least one size below.');
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
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      /* The share sheet was dismissed. */
    }
  };

  return (
    <>
      <section className={styles.pdp}>
        <div className={styles.panel}>
          <h1 className={styles.name}>{product.name}</h1>
          <div className={styles.rating}>
            <StarIcon height={16} width={16} />
            <span>{product.rating} / {product.reviewCount} reviews</span>
          </div>
          <div className={styles.priceRow}>
            <span className={product.compareAtPrice ? styles.salePrice : ''}>{formatCurrency(product.price)}</span>
            {product.compareAtPrice ? <span className={styles.comparePrice}>{formatCurrency(product.compareAtPrice)}</span> : null}
          </div>
          {product.description && <p className={styles.description}>{product.description}</p>}

          {/* Colour */}
          <div className={styles.optionGroup}>
            <div className={styles.optionHeader}>
              <h2 className={styles.optionTitle}>
                Color <span className={styles.optionValue}>/ {selectedColor || 'Select Product Type'}</span>
              </h2>
              {colorRailState.canScroll && (
                <div aria-label="Browse color variants" className={styles.colorRailControls}>
                  <button aria-label="Previous color variants" disabled={colorRailState.atStart} onClick={() => scrollColors(-1)} type="button">‹</button>
                  <button aria-label="Next color variants" disabled={colorRailState.atEnd} onClick={() => scrollColors(1)} type="button">›</button>
                </div>
              )}
            </div>
            <div aria-label="Color variants" className={styles.colorGrid} ref={colorRailRef} role="group">
              {safeColors.map((color, index) => {
                const imageUrl = product.colorImages?.[color]?.[0] || product.image;
                const isSelected = selectedColor === color;
                const colorQty = Object.values(quantities[color] || {}).reduce((sum, qty) => sum + qty, 0);
                return (
                  <button
                    aria-label={`${color}${colorQty > 0 ? `, ${colorQty} selected` : ''}`}
                    aria-pressed={isSelected}
                    className={`${styles.colorCard} ${isSelected ? styles.colorCardActive : ''}`}
                    key={color}
                    onClick={(event) => selectColor(color, event.currentTarget)}
                    type="button"
                  >
                    <span className={styles.colorCardImageWrapper}>
                      {imageUrl && (
                        <Image
                          alt={color}
                          className={styles.colorCardImage}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 620px) 45vw, 220px"
                          src={imageUrl}
                        />
                      )}
                      {colorQty > 0 && <span className={styles.colorCount}>{colorQty}</span>}
                    </span>
                    <span className={styles.colorCardLabel}>{color}</span>
                  </button>
                );
              })}
            </div>
            {colorRailState.canScroll && (
              <div aria-hidden="true" className={styles.colorRailFooter}>
                <span>Scroll or swipe to see more</span>
                <span className={styles.colorRailTrack}>
                  <span className={styles.colorRailProgress} style={{ transform: `translateX(${colorRailState.progress * 300}%)` }} />
                </span>
              </div>
            )}
          </div>

          {/* Bulk pricing — a reason to pick more, then a live confirmation. */}
          {bulkRule && canBuy && (
            <div className={bulkApplied ? styles.bulkBannerActive : styles.bulkBanner}>
              {bulkApplied ? (
                <>
                  <strong>✓ Wholesale price applied</strong>
                  <span>
                    All {totalQuantity} pieces at {formatCurrency(bulkRule.unitPrice)} each — you&apos;re saving{' '}
                    {formatCurrency(savingPerUnit(product) * totalQuantity)}.
                  </span>
                </>
              ) : (
                <>
                  <strong>Buy {bulkRule.minQuantity}+ and pay {formatCurrency(bulkRule.unitPrice)} each</strong>
                  <span>
                    Save {formatCurrency(savingPerUnit(product))} per piece ({savingPercent(product)}% off). Mix any sizes and colours
                    {totalQuantity > 0 && bulkUnitsAway > 0 ? ` — add ${bulkUnitsAway} more to unlock it.` : '.'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Sizes */}
          <div className={`${styles.optionGroup} ${shaking ? styles.shaking : ''}`} ref={sizesRef}>
            <div className={styles.optionHeader}>
              <h2 className={styles.optionTitle}>Select Sizes &amp; Quantities</h2>
              <Link className={styles.sizeGuide} href="/size-guide">
                <RulerIcon height={16} width={16} /> Size guide
              </Link>
            </div>

            <div className={styles.sizeList}>
              {activeColorVariants.map((variant) => {
                const size = variant.size;
                const qty = quantities[selectedColor]?.[size] || 0;
                const stockLimit = getVariantStockLimit(variant);
                const inStock = isVariantInStock(variant) && !comingSoon;
                return (
                  <div className={`${styles.sizeRow} ${qty > 0 ? styles.sizeRowActive : ''} ${inStock ? '' : styles.sizeRowOut}`} key={size}>
                    <div className={styles.sizeInfo}>
                      <strong>Size {size}</strong>
                      <small>{formatCurrency(product.price)} · {getVariantStockLabel(variant)}</small>
                    </div>
                    {inStock ? (
                      <div aria-label={`Quantity for size ${size}`} className={styles.stepper} role="group">
                        <button
                          aria-label={`Remove one size ${size}`}
                          disabled={qty === 0}
                          onClick={() => setQty(selectedColor, size, Math.max(0, qty - 1))}
                          type="button"
                        >
                          <MinusIcon height={16} width={16} />
                        </button>
                        <output aria-live="polite">{qty}</output>
                        <button
                          aria-label={`Add one size ${size}`}
                          disabled={qty >= stockLimit}
                          onClick={() => setQty(selectedColor, size, Math.min(stockLimit, qty + 1))}
                          type="button"
                        >
                          <PlusIcon height={16} width={16} />
                        </button>
                      </div>
                    ) : (
                      <span className={styles.soldOutTag}>Sold out</span>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </div>

          {/* What the customer has picked, priced exactly as checkout will price it. */}
          {totalQuantity > 0 && (
            <div className={styles.summary}>
              <ul className={styles.summaryLines}>
                {selection.map(({ color, size, qty }) => (
                  <li key={`${color}-${size}`}>
                    <span>{color} · Size {size} <em>×{qty}</em></span>
                    <span>{formatCurrency(unitPrice * qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className={styles.summaryTotals}>
                <div><dt>Subtotal · {totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'}</dt><dd>{formatCurrency(totalPrice)}</dd></div>
                <div><dt>Service fee (2%)</dt><dd>{formatCurrency(calcServiceCharge(totalPrice))}</dd></div>
                <div className={styles.summaryTotal}><dt>Total</dt><dd>{formatCurrency(calcOrderTotal(totalPrice))}</dd></div>
              </dl>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions} ref={actionsRef}>
            <div className={styles.mainButtons}>
              <Button disabled={!canBuy} fullWidth onClick={handleBuyNow} size="lg">
                {soldOut ? 'Sold out' : comingSoon ? 'Coming soon' : totalQuantity > 0 ? `Buy now · ${formatCurrency(calcOrderTotal(totalPrice))}` : 'Buy now'}
              </Button>
              {canBuy && (
                <Button fullWidth onClick={handleAddToCart} size="lg" variant="secondary">
                  Add to cart
                </Button>
              )}
            </div>
            <div className={styles.utilityButtons}>
              <button
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={isWishlisted}
                className={`${styles.iconAction} ${isWishlisted ? styles.iconActionActive : ''}`}
                onClick={() => toggleWishlist(product)}
                type="button"
              >
                <HeartIcon />
              </button>
              <button
                aria-label={shared ? 'Link copied' : 'Share product'}
                className={`${styles.iconAction} ${shared ? styles.iconActionDone : ''}`}
                onClick={handleShare}
                type="button"
              >
                {shared ? <CheckIcon /> : <ShareIcon />}
              </button>
            </div>
          </div>

          {product.material && (
            <div className={styles.details}>
              <div className={styles.detailBlock}>
                <h2>Material</h2>
                <p>{product.material}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div
        aria-hidden={!stickyOpen}
        className={`${styles.stickyBar} ${stickyOpen ? styles.stickyOpen : ''}`}
        inert={!stickyOpen}
      >
        <div className={styles.stickyText}>
          <p className={styles.stickyName}>{product.name}</p>
          <p className={styles.stickyMeta}>
            {totalQuantity > 0
              ? `${totalQuantity} ${totalQuantity === 1 ? 'piece' : 'pieces'} · ${formatCurrency(calcOrderTotal(totalPrice))}`
              : `Select size · ${formatCurrency(product.price)}`}
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

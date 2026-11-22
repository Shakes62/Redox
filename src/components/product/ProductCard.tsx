'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { HeartIcon } from '@/components/ui/Icons';
import { formatCurrency } from '@/lib/format';
import { getProductStockSummary } from '@/lib/inventory';
import {
  colorImage,
  colorsWithPhotos,
  coverImage,
  displayColorName,
  displayProductName,
  swatchBackground
} from '@/lib/product-display';
import { getWholesaleRule } from '@/lib/wholesale';
import { useWishlistStore } from '@/store/wishlist.store';
import type { Product } from '@/types/product';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  /** First cards above the fold load straight away. */
  priority?: boolean;
}

const MAX_DOTS = 5;
const IMAGE_SIZES = '(min-width: 1100px) 300px, (min-width: 700px) 33vw, 50vw';

/**
 * Photo first, price on the photo, colours underneath. Touching a colour dot
 * shows that colour on the card, and the link then opens the product with it
 * already picked.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const name = displayProductName(product.name);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted(product.id));
  const stock = useMemo(() => getProductStockSummary(product), [product]);
  const bulkRule = useMemo(() => getWholesaleRule(product), [product]);
  const previewable = useMemo(() => colorsWithPhotos(product), [product]);
  const [preview, setPreview] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const cover = coverImage(product);
  const image = preview ? colorImage(product, preview) : cover;
  // On hover, the card turns to a second photo — a colour shot if the cover is a group shot.
  const alternate = preview
    ? null
    : [...previewable.map((color) => colorImage(product, color)), product.secondaryImage].find(
        (candidate) => candidate && candidate !== cover
      ) || null;

  const colors = product.colors || [];
  const dots = colors.slice(0, MAX_DOTS);
  const moreColors = colors.length - dots.length;
  const href = `/products/${product.slug}${preview && pinned ? `?color=${encodeURIComponent(preview)}` : ''}`;
  const badge = !stock.isSoldOut && product.badge && product.badge !== 'SOLD OUT' ? product.badge : null;

  const showColor = (color: string, pin: boolean) => {
    if (!previewable.includes(color)) return;
    setPreview(color);
    if (pin) setPinned(true);
  };

  return (
    <article
      className={`${styles.card} ${stock.isSoldOut ? styles.soldOut : ''}`}
      onPointerLeave={() => {
        if (!pinned) setPreview(null);
      }}
    >
      <div className={styles.mediaWrap}>
        <Link
          aria-label={`${name}, ${formatCurrency(product.price)}${stock.isSoldOut ? ', sold out' : ''}`}
          className={`${styles.media} ${alternate ? styles.hasAlternate : ''}`}
          href={href}
        >
          {image ? (
            <Image
              alt=""
              className={`${styles.image} ${styles.imagePrimary}`}
              fetchPriority={priority ? 'high' : undefined}
              fill
              key={image}
              loading={priority ? 'eager' : undefined}
              sizes={IMAGE_SIZES}
              src={image}
            />
          ) : null}
          {alternate ? (
            <Image alt="" className={`${styles.image} ${styles.imageAlternate}`} fill sizes={IMAGE_SIZES} src={alternate} />
          ) : null}

          {stock.isSoldOut ? (
            <span className={styles.soldOutBar}>Sold out</span>
          ) : (
            <span className={styles.pricePill}>
              <span className={product.compareAtPrice ? styles.salePrice : undefined}>{formatCurrency(product.price)}</span>
              {product.compareAtPrice ? <s className={styles.wasPrice}>{formatCurrency(product.compareAtPrice)}</s> : null}
            </span>
          )}
        </Link>

        {badge ? (
          <span className={styles.badge}>
            <Badge label={badge} />
          </span>
        ) : null}

        <button
          aria-label={isWishlisted ? `Remove ${name} from saved` : `Save ${name}`}
          aria-pressed={isWishlisted}
          className={`${styles.save} ${isWishlisted ? styles.saveOn : ''}`}
          onClick={() => toggleWishlist(product)}
          type="button"
        >
          <HeartIcon size={19} weight={isWishlisted ? 'fill' : 'regular'} />
        </button>
      </div>

      <div className={styles.meta}>
        <h3 className={styles.name}>
          <Link href={href} tabIndex={-1}>
            {name}
          </Link>
        </h3>

        <div className={styles.row}>
          {colors.length > 0 ? (
            <div aria-label={`${colors.length} ${colors.length === 1 ? 'colour' : 'colours'}`} className={styles.dots} role="group">
              {dots.map((color) => {
                const label = displayColorName(color);
                const canPreview = previewable.includes(color);
                return (
                  <button
                    aria-label={canPreview ? `Show ${label}` : label}
                    aria-pressed={preview === color}
                    className={`${styles.dot} ${preview === color ? styles.dotOn : ''}`}
                    disabled={!canPreview}
                    key={color}
                    onClick={() => showColor(color, true)}
                    onPointerEnter={(event) => event.pointerType === 'mouse' && showColor(color, false)}
                    style={{ background: swatchBackground(color, product.colorHex?.[color]) }}
                    title={label}
                    type="button"
                  />
                );
              })}
              {moreColors > 0 ? <span className={styles.more}>+{moreColors}</span> : null}
            </div>
          ) : null}

          {bulkRule && !stock.isSoldOut ? (
            <span className={styles.bulk} title={`${bulkRule.minQuantity} or more: ${formatCurrency(bulkRule.unitPrice)} each`}>
              {bulkRule.minQuantity}+ for {formatCurrency(bulkRule.unitPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

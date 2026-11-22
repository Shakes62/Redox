'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronDownIcon } from '@/components/ui/Icons';
import { KIND_LABELS, isKind, kindsIn, productKind, type ProductKind } from '@/lib/product-display';
import type { Product } from '@/types/product';
import styles from './ShopGrid.module.css';

type Sort = 'featured' | 'price-asc' | 'price-desc';

interface ShopGridProps {
  products: Product[];
  /** Heading shown above the chips. */
  title?: string;
  /** Pre-selected type, e.g. from `/shop?kind=caps`. */
  initialKind?: string;
  searchQuery?: string;
  /** Keep `?kind=` in the address bar so a filtered shop can be shared. */
  syncUrl?: boolean;
  id?: string;
}

/**
 * The whole shop in one view: tap a type, everything else stays put. No
 * sidebar, no "apply" button — the grid answers immediately.
 */
export function ShopGrid({ products, title = 'Shop all', initialKind, searchQuery = '', syncUrl = false, id }: ShopGridProps) {
  const [kind, setKind] = useState<ProductKind | 'all'>(isKind(initialKind) ? initialKind : 'all');
  const [sort, setSort] = useState<Sort>('featured');

  // Search first, so the chips count only what matches.
  const matching = useMemo(() => {
    // "320 gsm", "320gsm" and "320 GSM" all mean the same shirt.
    const normalize = (text: string) => text.toLowerCase().replace(/(\d+)\s*gsm/g, '$1gsm').replace(/\s+/g, ' ').trim();
    const words = normalize(searchQuery).split(' ').filter(Boolean);
    if (words.length === 0) return products;
    return products.filter((product) => {
      const haystack = normalize(
        [product.name, product.collectionName, product.category, product.description, ...(product.colors || []), KIND_LABELS[productKind(product)].many].join(' ')
      );
      return words.every((word) => haystack.includes(word));
    });
  }, [products, searchQuery]);

  const kinds = useMemo(() => kindsIn(matching), [matching]);
  const counts = useMemo(() => {
    const map = new Map<ProductKind, number>();
    matching.forEach((product) => {
      const key = productKind(product);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [matching]);

  const shown = useMemo(() => {
    const list = kind === 'all' ? matching : matching.filter((product) => productKind(product) === kind);
    if (sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [kind, matching, sort]);

  const choose = (next: ProductKind | 'all') => {
    setKind(next);
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('kind');
    else url.searchParams.set('kind', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <section aria-labelledby={id ? `${id}-title` : undefined} className={styles.shop} id={id}>
      <div className={styles.head}>
        <h2 className={styles.title} id={id ? `${id}-title` : undefined}>
          {title}
          <sup className={styles.count}>{shown.length}</sup>
        </h2>

        <label className={styles.sort}>
          <span className="srOnly">Sort by</span>
          <select onChange={(event) => setSort(event.target.value as Sort)} value={sort}>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <ChevronDownIcon aria-hidden="true" height={16} width={16} />
        </label>
      </div>

      {kinds.length > 1 ? (
        <div aria-label="Filter by type" className={styles.chips} role="group">
          <button
            aria-pressed={kind === 'all'}
            className={`${styles.chip} ${kind === 'all' ? styles.chipOn : ''}`}
            onClick={() => choose('all')}
            type="button"
          >
            All <span>{matching.length}</span>
          </button>
          {kinds.map((item) => (
            <button
              aria-pressed={kind === item}
              className={`${styles.chip} ${kind === item ? styles.chipOn : ''}`}
              key={item}
              onClick={() => choose(item)}
              type="button"
            >
              {KIND_LABELS[item].many} <span>{counts.get(item) || 0}</span>
            </button>
          ))}
        </div>
      ) : null}

      {shown.length > 0 ? (
        <div className={styles.grid}>
          {shown.map((product, index) => (
            <ProductCard key={product.id} priority={index < 2} product={product} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{products.length === 0 ? 'New pieces coming soon' : 'Nothing here yet'}</p>
          {kind !== 'all' || searchQuery ? (
            <button className={styles.emptyButton} onClick={() => choose('all')} type="button">
              See everything
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

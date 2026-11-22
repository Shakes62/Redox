import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRightIcon } from '@/components/ui/Icons';
import { formatCurrency } from '@/lib/format';
import type { ProductKind } from '@/lib/product-display';
import styles from './Home.module.css';

export interface TypeTile {
  kind: ProductKind;
  label: string;
  count: number;
  /** Lowest price still on sale; null when every piece of this type is sold out. */
  fromPrice: number | null;
  image: string;
}

/** The whole range in four taps: one big photo per type of piece. */
export function TypeTiles({ tiles }: { tiles: TypeTile[] }) {
  if (tiles.length < 2) return null;

  return (
    <section aria-labelledby="types-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle} id="types-title">What do you need?</h2>
      </div>

      <ul className={styles.types} style={{ '--types': tiles.length } as CSSProperties}>
        {tiles.map((tile, index) => (
          <li key={tile.kind}>
            <Link className={styles.type} href={`/shop?kind=${tile.kind}`}>
              <span className={styles.typePhoto}>
                {tile.image ? (
                  <Image
                    alt=""
                    fill
                    loading={index < 2 ? 'eager' : undefined}
                    sizes="(min-width: 900px) 300px, 46vw"
                    src={tile.image}
                  />
                ) : null}
              </span>
              <span className={styles.typeBar}>
                <span className={styles.typeText}>
                  <strong>{tile.label}</strong>
                  <small>{tile.fromPrice === null ? 'Sold out' : `from ${formatCurrency(tile.fromPrice)}`}</small>
                </span>
                <span aria-hidden="true" className={styles.typeArrow}>
                  <ArrowUpRightIcon size={16} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

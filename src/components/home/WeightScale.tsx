import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatCurrency } from '@/lib/format';
import styles from './Home.module.css';

export interface WeightItem {
  slug: string;
  name: string;
  kind: string;
  gsm: number;
  price: number;
  image: string;
}

/**
 * Every shirt laid out by fabric weight, lightest to heaviest. The bars rise
 * with the weight, so "higher number = thicker shirt" needs no explaining.
 */
export function WeightScale({ items }: { items: WeightItem[] }) {
  if (items.length < 2) return null;
  const lightest = items[0].gsm;
  const heaviest = items[items.length - 1].gsm;
  const span = Math.max(1, heaviest - lightest);

  return (
    <section aria-labelledby="weights-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle} id="weights-title">Pick your weight</h2>
          <p className={styles.sectionSub}>Higher GSM, thicker cotton.</p>
        </div>
      </div>

      <ul className={styles.weights}>
        {items.map((item) => {
          // 30% for the lightest up to 62% for the heaviest: always above the price, below the number.
          const fill = `${Math.round(30 + ((item.gsm - lightest) / span) * 32)}%`;
          return (
            <li key={item.slug}>
              <Link
                aria-label={`${item.name}, ${item.gsm} GSM, ${formatCurrency(item.price)}`}
                className={styles.weight}
                href={`/products/${item.slug}`}
                style={{ '--fill': fill } as CSSProperties}
              >
                <span aria-hidden="true" className={styles.weightFill} />
                <span className={styles.weightNum}>
                  {item.gsm}
                  <small>GSM · {item.kind}</small>
                </span>
                <span className={styles.weightBottom}>
                  <span className={styles.weightPrice}>{formatCurrency(item.price)}</span>
                  {item.image ? (
                    <span className={styles.weightThumb}>
                      <Image alt="" fill sizes="40px" src={item.image} />
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p aria-hidden="true" className={styles.legend}>
        <span>Lighter</span>
        <i />
        <span>Heavier</span>
      </p>
    </section>
  );
}

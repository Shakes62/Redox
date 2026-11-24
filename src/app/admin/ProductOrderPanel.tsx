'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '@/types/product';
import { getProductStockSummary, visibleProducts } from '@/lib/inventory';
import { pickHeroProduct } from '@/lib/hero-product';
import { moveItem, sameOrder } from '@/lib/product-order';
import { ArrowDownIcon, ArrowUpIcon, DragHandleIcon, ToTopIcon } from '@/components/ui/Icons';
import styles from './ProductOrderPanel.module.css';

interface ProductOrderPanelProps {
  /** The catalogue in its current shop order. */
  products: Product[];
  saving: boolean;
  onCancel: () => void;
  onSave: (ids: string[]) => void;
}

/** How close to the top or bottom of the screen a drag has to get before the page scrolls. */
const SCROLL_EDGE = 80;

type Control = 'handle' | 'up' | 'down' | 'top';

/**
 * Arrange the shop. Drag a row by its handle (mouse or finger), or use the
 * arrows — the top row shows first on the homepage, the shop and search.
 * Nothing changes on the site until Save.
 */
export function ProductOrderPanel({ products, saving, onCancel, onSave }: ProductOrderPanelProps) {
  const savedIds = useMemo(() => products.map((product) => product.id), [products]);
  const [draftIds, setDraftIds] = useState<string[]>(savedIds);
  const [dragId, setDragId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const pointerY = useRef<number | null>(null);

  // The draft, resolved against the live catalogue: a product deleted meanwhile
  // drops out, one added meanwhile shows at the top, where new products go.
  const ordered = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    const placed = draftIds.flatMap((id) => byId.get(id) ?? []);
    const placedIds = new Set(placed.map((product) => product.id));
    return [...products.filter((product) => !placedIds.has(product.id)), ...placed];
  }, [draftIds, products]);

  const orderedIds = useMemo(() => ordered.map((product) => product.id), [ordered]);
  const changed = !sameOrder(orderedIds, savedIds);
  const heroId = useMemo(() => pickHeroProduct(visibleProducts(ordered))?.id ?? null, [ordered]);

  /** Keeps focus on the control that was used, so repeated taps keep moving the same piece. */
  const focusControl = (id: string, control: Control) => {
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-row="${CSS.escape(id)}"] [data-control="${control}"]`)
        ?.focus();
    });
  };

  const move = (from: number, to: number, control: Control) => {
    if (to < 0 || to >= ordered.length || from === to) return;
    const product = ordered[from];
    setDraftIds(moveItem(orderedIds, from, to));
    setAnnouncement(`${product.name}: position ${to + 1} of ${ordered.length}.`);

    // A control that is about to be disabled (Up on the first row) cannot hold
    // focus, so hand it to the row's drag handle instead.
    const atEdge = (control !== 'down' && to === 0) || (control === 'down' && to === ordered.length - 1);
    focusControl(product.id, atEdge ? 'handle' : control);
  };

  // While a drag is live, follow the pointer anywhere on the page. Listening on
  // window rather than the handle keeps the drag alive while React moves the
  // row's DOM node, which can drop a captured pointer on some phones.
  useEffect(() => {
    if (!dragId) return;

    // Reads the order straight from the DOM: always the order on screen.
    const reorderAt = (clientY: number) => {
      const list = listRef.current;
      if (!list) return;
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-row]'));
      const current = rows.map((row) => row.dataset.row as string);
      let insertAt = 0;
      for (const row of rows) {
        if (row.dataset.row === dragId) continue;
        const box = row.getBoundingClientRect();
        if (clientY > box.top + box.height / 2) insertAt += 1;
      }
      const others = current.filter((id) => id !== dragId);
      const next = [...others.slice(0, insertAt), dragId, ...others.slice(insertAt)];
      if (!sameOrder(next, current)) setDraftIds(next);
    };

    const onMove = (event: PointerEvent) => {
      pointerY.current = event.clientY;
      reorderAt(event.clientY);
    };

    const onEnd = () => {
      const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []);
      const position = rows.findIndex((row) => row.dataset.row === dragId);
      if (position > -1) setAnnouncement(`Dropped at position ${position + 1} of ${rows.length}.`);
      setDragId(null);
    };

    // Scrolls the page while the pointer is held near the top or bottom edge,
    // so a piece can be dragged the length of a long catalogue on a phone.
    let frame = 0;
    const scroll = () => {
      const y = pointerY.current;
      if (y !== null) {
        const bottomEdge = window.innerHeight - SCROLL_EDGE;
        const step = y < SCROLL_EDGE ? -(SCROLL_EDGE - y) / 4 : y > bottomEdge ? (y - bottomEdge) / 4 : 0;
        if (step !== 0) {
          // Instant: the site's smooth scrolling would restart an animation
          // every frame and the page would crawl.
          window.scrollBy({ top: step, behavior: 'instant' });
          reorderAt(y);
        }
      }
      frame = requestAnimationFrame(scroll);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    frame = requestAnimationFrame(scroll);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      cancelAnimationFrame(frame);
      pointerY.current = null;
    };
  }, [dragId]);

  const cancel = () => {
    if (changed && !window.confirm('Discard the new order?')) return;
    onCancel();
  };

  return (
    <section aria-labelledby="shop-order-title" className={styles.panel}>
      <header className={styles.head}>
        <h3 className={styles.title} id="shop-order-title">Shop order</h3>
        <p className={styles.hint}>Top shows first. New products start at the top.</p>
      </header>

      <ol className={`${styles.list} ${dragId ? styles.listDragging : ''}`} ref={listRef}>
        {ordered.map((product, index) => {
          const soldOut = getProductStockSummary(product).isSoldOut;
          const last = index === ordered.length - 1;

          return (
            <li
              className={`${styles.row} ${dragId === product.id ? styles.rowDragging : ''}`}
              data-row={product.id}
              key={product.id}
            >
              <button
                aria-label={`Reorder ${product.name}. Drag it, or use the arrow keys.`}
                className={styles.handle}
                data-control="handle"
                onKeyDown={(event) => {
                  const targets: Record<string, number> = {
                    ArrowUp: index - 1,
                    ArrowDown: index + 1,
                    Home: 0,
                    End: ordered.length - 1
                  };
                  if (!(event.key in targets)) return;
                  event.preventDefault();
                  move(index, targets[event.key], 'handle');
                }}
                onPointerDown={(event) => {
                  if (saving || (event.pointerType === 'mouse' && event.button !== 0)) return;
                  event.preventDefault();
                  pointerY.current = event.clientY;
                  setDragId(product.id);
                }}
                type="button"
              >
                <DragHandleIcon size={18} />
              </button>

              <span aria-hidden="true" className={styles.position}>{index + 1}</span>

              <span className={styles.thumb}>
                {product.image ? <Image alt="" fill sizes="48px" src={product.image} /> : null}
              </span>

              <span className={styles.info}>
                <span className={styles.name}>{product.name}</span>
                {(product.id === heroId || product.visibility === 'hidden' || soldOut) && (
                  <span className={styles.tags}>
                    {product.id === heroId && <span className={styles.tagHero}>Homepage hero</span>}
                    {product.visibility === 'hidden' && <span className={styles.tagHidden}>Hidden</span>}
                    {soldOut && <span className={styles.tagSoldOut}>Sold out</span>}
                  </span>
                )}
              </span>

              <span className={styles.controls}>
                <button
                  aria-label={`Move ${product.name} up`}
                  className={styles.control}
                  data-control="up"
                  disabled={saving || index === 0}
                  onClick={() => move(index, index - 1, 'up')}
                  title="Move up"
                  type="button"
                >
                  <ArrowUpIcon size={16} />
                </button>
                <button
                  aria-label={`Move ${product.name} down`}
                  className={styles.control}
                  data-control="down"
                  disabled={saving || last}
                  onClick={() => move(index, index + 1, 'down')}
                  title="Move down"
                  type="button"
                >
                  <ArrowDownIcon size={16} />
                </button>
                <button
                  aria-label={`Move ${product.name} to the top`}
                  className={`${styles.control} ${styles.controlTop}`}
                  data-control="top"
                  disabled={saving || index === 0}
                  onClick={() => move(index, 0, 'top')}
                  title="Move to top"
                  type="button"
                >
                  <ToTopIcon size={16} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className={styles.bar}>
        <button className={styles.cancel} disabled={saving} onClick={cancel} type="button">
          Cancel
        </button>
        <button
          className={styles.save}
          disabled={!changed || saving}
          onClick={() => onSave(orderedIds)}
          type="button"
        >
          {saving ? 'Saving…' : changed ? 'Save order' : 'No changes'}
        </button>
      </div>

      <p aria-live="polite" className="srOnly">{announcement}</p>
    </section>
  );
}

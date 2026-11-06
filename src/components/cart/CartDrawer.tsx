'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MinusIcon, PlusIcon, TrashIcon, XIcon } from '@/components/ui/Icons';
import { LinkButton } from '@/components/ui/LinkButton';
import { CheckoutFlow } from '@/components/cart/CheckoutFlow';
import { OrderReceipt, PendingNotice } from '@/components/cart/OrderReceipt';
import { formatCurrency } from '@/lib/format';
import { getCartTotals, useCartStore } from '@/store/cart.store';
import {
  effectiveUnitPrice,
  getWholesaleRule,
  isWholesaleApplied,
  savingIfUnlocked,
  unitsUntilWholesale
} from '@/lib/wholesale';
import { claimPendingCheckoutRecovery, confirmPayment, forgetPendingCheckout } from '@/lib/checkout-client';
import type { CustomerReceipt } from '@/lib/order-receipt';
import styles from './CartDrawer.module.css';

export function CartDrawer() {
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const view = useCartStore((state) => state.view);
  const buyNowItems = useCartStore((state) => state.buyNowItems);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const setView = useCartStore((state) => state.setView);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const clearCart = useCartStore((state) => state.clearCart);
  const completeBuyNow = useCartStore((state) => state.completeBuyNow);

  const { subtotal, serviceCharge, orderTotal, wholesaleSaving, quantityByProductSlug } = getCartTotals(items);

  const [receipt, setReceipt] = useState<CustomerReceipt | null>(null);
  /** Paid, but this browser could not get the confirmation back. The order is safe server-side. */
  const [pending, setPending] = useState<{ orderNumber: string; reference: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const buyingNow = Boolean(buyNowItems?.length);
  const checkoutItems = buyingNow ? buyNowItems! : items;
  const showCheckout = view === 'checkout' && checkoutItems.length > 0;

  /**
   * Products in the bag that have a bulk price the customer has not reached yet,
   * nearest first. Capped at two — a helpful nudge, not a wall of upsells.
   */
  const wholesaleNudges = Array.from(
    items
      .reduce((byProduct, item) => {
        if (byProduct.has(item.productSlug)) return byProduct;
        const inBag = quantityByProductSlug.get(item.productSlug) || 0;
        const needed = unitsUntilWholesale(item, inBag);
        if (needed <= 0) return byProduct;
        byProduct.set(item.productSlug, {
          slug: item.productSlug,
          name: item.name,
          needed,
          saving: savingIfUnlocked(item, inBag),
          rule: getWholesaleRule(item)
        });
        return byProduct;
      }, new Map<string, { slug: string; name: string; needed: number; saving: number; rule: ReturnType<typeof getWholesaleRule> }>())
      .values()
  )
    .sort((a, b) => a.needed - b.needed)
    .slice(0, 2);

  // A receipt is shown once; closing the drawer puts it away. The pending
  // notice stays so the customer sees it again next time they open the bag.
  useEffect(() => {
    if (isOpen) return;
    const timer = window.setTimeout(() => setReceipt(null), 400);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  /**
   * Picks up a checkout this browser walked away from — a reload during
   * payment, a crashed tab, a phone that lost signal on the callback. The
   * reference was saved before Paystack opened, so the receipt can still be
   * recovered here rather than leaving the customer in the dark.
   */
  useEffect(() => {
    const recovered = claimPendingCheckoutRecovery();
    if (!recovered) return;
    let cancelled = false;

    (async () => {
      // A single ask on page load; "Check payment status" covers a deliberate retry.
      const result = await confirmPayment(recovered.reference, undefined, 1);
      if (cancelled) return;

      if (result.paid && result.order) {
        forgetPendingCheckout();
        setReceipt(result.order);
        setPending(null);
        if (recovered.fromCart !== false) clearCart();
        openCart();
      } else if (result.settled) {
        forgetPendingCheckout();
      } else {
        setPending({ orderNumber: recovered.orderNumber, reference: recovered.reference });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearCart, openCart]);

  // Scroll lock, Escape to close, and focus kept inside the drawer.
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Focus lands on the panel itself: screen readers announce it, and touch users see no stray ring.
    drawerRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
      )).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, closeCart]);

  const handleSuccess = (order: CustomerReceipt) => {
    setPending(null);
    setReceipt(order);
    if (buyingNow) completeBuyNow();
    else clearCart();
    setView('bag');
  };

  const handlePending = (next: { orderNumber: string; reference: string }) => {
    setPending(next);
    if (buyingNow) completeBuyNow();
    else clearCart();
    setView('bag');
  };

  const checkPendingStatus = async () => {
    if (!pending) return;
    setChecking(true);
    const result = await confirmPayment(pending.reference);
    setChecking(false);
    if (result.paid && result.order) {
      forgetPendingCheckout();
      setPending(null);
      setReceipt(result.order);
    } else if (result.settled) {
      forgetPendingCheckout();
      setPending(null);
    }
  };

  const dismissPending = () => {
    forgetPendingCheckout();
    setPending(null);
    closeCart();
  };

  const title = receipt
    ? 'Order confirmed'
    : pending
      ? 'Order received'
      : showCheckout
        ? 'Checkout'
        : 'Your bag';

  return (
    <>
      <div
        aria-hidden="true"
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={closeCart}
      />

      <aside
        aria-hidden={!isOpen}
        aria-label="Shopping bag"
        aria-modal="true"
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''} ${showCheckout ? styles.drawerCheckout : ''}`}
        inert={!isOpen}
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.header}>
          {/* The bag itself needs no heading on screen; screen readers still get one. */}
          <h2 className={`${styles.title} ${title === 'Your bag' ? 'srOnly' : ''}`}>{title}</h2>
          <button aria-label="Close" className={styles.closeButton} data-close onClick={closeCart} type="button">
            <XIcon />
          </button>
        </header>

        {receipt ? (
          <OrderReceipt onDone={() => { setReceipt(null); closeCart(); }} receipt={receipt} />
        ) : pending ? (
          <PendingNotice
            checking={checking}
            onCheck={checkPendingStatus}
            onDone={dismissPending}
            onTrack={closeCart}
            orderNumber={pending.orderNumber}
            reference={pending.reference}
          />
        ) : showCheckout ? (
          <CheckoutFlow
            exitLabel={buyingNow ? 'Back to product' : 'Back to bag'}
            fromCart={!buyingNow}
            items={checkoutItems}
            key={buyingNow ? 'buy-now' : 'cart'}
            onExit={() => (buyingNow ? closeCart() : setView('bag'))}
            onPending={handlePending}
            onSuccess={handleSuccess}
          />
        ) : (
          <>
            <div className={styles.scroll}>
              {items.length === 0 ? (
                <div className={styles.empty}>
                  <h3>No pieces selected</h3>
                  <p>Limited runs move fast and do not restock. Build the uniform.</p>
                  <LinkButton href="/shop" onClick={closeCart} size="lg">View shop</LinkButton>
                </div>
              ) : (
                <ul className={styles.items}>
                  {items.map((item) => {
                    const inBag = quantityByProductSlug.get(item.productSlug) || 0;
                    const bulk = isWholesaleApplied(item, inBag);
                    const atLimit = Boolean(item.stockLimit && item.quantity >= item.stockLimit);
                    return (
                      <li className={styles.item} key={item.variantId}>
                        <Link className={styles.imageWrap} href={`/products/${item.productSlug}`} onClick={closeCart}>
                          <Image alt={item.name} className={styles.image} fill sizes="88px" src={item.image} />
                        </Link>
                        <div className={styles.itemBody}>
                          <div className={styles.itemTop}>
                            <Link className={styles.itemName} href={`/products/${item.productSlug}`} onClick={closeCart}>
                              {item.name}
                            </Link>
                            <button
                              aria-label={`Remove ${item.name}`}
                              className={styles.removeButton}
                              onClick={() => removeItem(item.variantId)}
                              type="button"
                            >
                              <TrashIcon height={18} width={18} />
                            </button>
                          </div>
                          <p className={styles.meta}>{item.color} · Size {item.size}</p>
                          <div className={styles.itemBottom}>
                            {/* The old price stays visible beside the bulk one, so the change reads as a saving. */}
                            <p className={styles.price}>
                              {bulk && <span className={styles.priceWas}>{formatCurrency(item.price)}</span>}
                              <span className={bulk ? styles.priceBulk : undefined}>{formatCurrency(effectiveUnitPrice(item, inBag))}</span>
                            </p>
                            <div aria-label={`Quantity for ${item.name}`} className={styles.stepper} role="group">
                              <button
                                aria-label="Decrease quantity"
                                disabled={item.quantity <= 1}
                                onClick={() => updateQty(item.variantId, item.quantity - 1)}
                                type="button"
                              >
                                <MinusIcon height={16} width={16} />
                              </button>
                              <output aria-live="polite">{item.quantity}</output>
                              <button
                                aria-label="Increase quantity"
                                disabled={atLimit}
                                onClick={() => updateQty(item.variantId, item.quantity + 1)}
                                type="button"
                              >
                                <PlusIcon height={16} width={16} />
                              </button>
                            </div>
                          </div>
                          {atLimit && <p className={styles.limitNote}>Only {item.stockLimit} available</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className={styles.checkoutFooter}>
                {wholesaleNudges.map((nudge) => (
                  <div className={styles.bulkNudge} key={nudge.slug}>
                    <strong>Add {nudge.needed} more</strong> {nudge.name} to unlock{' '}
                    {formatCurrency(nudge.rule?.unitPrice || 0)} each — save {formatCurrency(nudge.saving)}
                  </div>
                ))}
                {wholesaleSaving > 0 && (
                  <div className={styles.bulkApplied}>
                    ✓ Wholesale price applied — you&apos;re saving {formatCurrency(wholesaleSaving)}
                  </div>
                )}
                <dl className={styles.totals}>
                  <div><dt>Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
                  <div><dt>Service fee (2%)</dt><dd>{formatCurrency(serviceCharge)}</dd></div>
                  <div className={styles.totalRow}><dt>Total</dt><dd>{formatCurrency(orderTotal)}</dd></div>
                </dl>
                <Button fullWidth onClick={() => setView('checkout')} size="lg">
                  Proceed to checkout
                </Button>
                <p className={styles.checkoutNote}>Delivery is added at the next step · Secure payment via Paystack</p>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}

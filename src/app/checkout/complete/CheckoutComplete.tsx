'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LinkButton } from '@/components/ui/LinkButton';
import { formatCurrency } from '@/lib/format';
import { confirmPayment, forgetPendingCheckout, readPendingCheckout } from '@/lib/checkout-client';
import styles from './CheckoutComplete.module.css';

type Phase = 'checking' | 'paid' | 'unsettled' | 'failed' | 'missing';

/**
 * Landing page for Paystack's hosted checkout.
 *
 * Customers only reach this when the inline popup could not be used, but the
 * guarantees are identical: the order was recorded before payment, so this page
 * only has to *report* the outcome. Even if the customer never lands here at
 * all, the webhook and the reconciliation sweep settle the order anyway.
 */
export function CheckoutComplete() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('Confirming your payment with Paystack…');
  const [order, setOrder] = useState<any>(null);
  const [reference, setReference] = useState('');

  useEffect(() => {
    // Paystack appends both `reference` and `trxref` to the callback URL.
    const fromUrl =
      searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('ref') || '';
    const resolved = fromUrl || readPendingCheckout()?.reference || '';

    if (!resolved) {
      setPhase('missing');
      setMessage('We could not find a payment reference to check.');
      return;
    }

    setReference(resolved);
    let cancelled = false;

    (async () => {
      const result = await confirmPayment(resolved, (attempt) => {
        if (!cancelled && attempt > 2) setMessage(`Still confirming with Paystack… (attempt ${attempt})`);
      });

      if (cancelled) return;

      if (result.paid && result.order) {
        forgetPendingCheckout();
        setOrder(result.order);
        setPhase('paid');
        return;
      }

      if (result.outcome === 'failed' || result.outcome === 'abandoned') {
        forgetPendingCheckout();
        setPhase('failed');
        setMessage(result.message || 'That payment did not complete. Nothing was charged.');
        return;
      }

      setPhase('unsettled');
      setMessage(
        'Your order is saved and we are finalising the payment confirmation. ' +
          'You will receive an SMS as soon as it clears.'
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className={styles.card} data-phase={phase}>
      <div className={styles.head}>
        <div aria-hidden="true" className={styles.icon}>
          {phase === 'paid' ? '✓' : phase === 'failed' ? '✕' : phase === 'checking' ? <span className={styles.spinner} /> : '⏱'}
        </div>
        <h1 className={styles.title}>
          {phase === 'paid'
            ? 'Payment confirmed'
            : phase === 'failed'
            ? 'Payment not completed'
            : phase === 'missing'
            ? 'Nothing to check'
            : 'Your order is saved'}
        </h1>
        <p aria-live="polite" className={styles.message}>
          {phase === 'paid'
            ? `Thank you, ${order?.customerName || 'friend'} — your order is confirmed and an SMS is on its way.`
            : message}
        </p>
      </div>

      {order && (
        <div className={styles.details}>
          <div>
            <span className={styles.label}>Order reference</span>
            <strong>#{order.orderNumber}</strong>
          </div>
          <div>
            <span className={styles.label}>Items</span>
            <div className={styles.items}>
              {order.items?.map((item: any, index: number) => (
                <div key={`${item.productSlug}-${item.color}-${item.size}-${index}`}>
                  <strong>{item.productName}</strong>
                  <div className={styles.itemMeta}>
                    {item.color} / {item.size} &times; {item.quantity} — {formatCurrency(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className={styles.label}>Total paid</span>
            <strong>{formatCurrency(order.price)}</strong>
          </div>
        </div>
      )}

      {reference && <p className={styles.reference}>Payment reference: {reference}</p>}

      <div className={styles.actions}>
        <LinkButton href={order ? `/track-order?ref=${order.orderNumber}` : '/track-order'} variant="secondary">
          Track order
        </LinkButton>
        <LinkButton href="/shop">Continue shopping</LinkButton>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/Icons';
import { describeDelivery } from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import type { CustomerReceipt } from '@/lib/order-receipt';
import styles from './CartDrawer.module.css';

export function OrderReceipt({ receipt, onDone }: { receipt: CustomerReceipt; onDone: () => void }) {
  const delivery = describeDelivery(receipt.deliveryMethod, receipt.deliveryFee);

  return (
    <>
      <div className={styles.scroll}>
        <div className={styles.result}>
          <div className={`${styles.resultIcon} ${styles.resultIconSuccess}`}>
            <CheckIcon height={34} width={34} />
          </div>
          <h3 className={styles.resultTitle}>Order placed!</h3>
          <p className={styles.resultText}>
            Thank you, <strong>{receipt.customerName}</strong>. Your order number is{' '}
            <span className={styles.ref}>#RD-{receipt.id}</span>. You&apos;ll receive an SMS confirmation shortly.
          </p>
        </div>

        <div className={styles.reviewCard}>
          <div className={styles.reviewHead}><span>Items ordered</span></div>
          <ul className={styles.receiptLines}>
            {receipt.items.map((item, index) => (
              <li key={`${item.productSlug}-${item.color}-${item.size}-${index}`}>
                <span>
                  <strong>{item.productName}</strong>
                  <small>{item.color} · Size {item.size} · ×{item.quantity}</small>
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div><dt>Subtotal</dt><dd>{formatCurrency(Number(receipt.subtotal) || 0)}</dd></div>
            <div><dt>Service fee (2%)</dt><dd>{formatCurrency(Number(receipt.serviceCharge) || 0)}</dd></div>
            {receipt.deliveryMethod !== 'none' && (
              <div><dt>{delivery.label}</dt><dd>{receipt.deliveryFee > 0 ? formatCurrency(receipt.deliveryFee) : 'Free'}</dd></div>
            )}
            <div className={styles.totalRow}><dt>Total paid</dt><dd>{formatCurrency(Number(receipt.price) || 0)}</dd></div>
          </dl>
        </div>

        <dl className={styles.metaList}>
          <div><dt>Deliver to</dt><dd>{receipt.shippingAddress}, {receipt.shippingCity}</dd></div>
          {receipt.deliveryMethod !== 'none' && <div><dt>Delivery</dt><dd>{delivery.detail}</dd></div>}
          <div>
            <dt>Payment</dt>
            <dd>
              {receipt.paymentStatus === 'paid'
                ? `Paid · Paystack${receipt.paymentChannel ? ` (${receipt.paymentChannel.replace(/_/g, ' ')})` : ''}`
                : 'Awaiting confirmation'}
            </dd>
          </div>
          {receipt.reference && <div><dt>Payment ref</dt><dd className={styles.mono}>{receipt.reference}</dd></div>}
          <div><dt>Contact</dt><dd>{receipt.customerPhone}</dd></div>
        </dl>

        <p className={styles.resultFoot}>
          Our team will reach out on <strong>{receipt.customerPhone}</strong> to confirm dispatch and delivery details.
        </p>
      </div>

      <div className={styles.checkoutFooter}>
        <Button fullWidth onClick={onDone} size="lg">Continue shopping</Button>
      </div>
    </>
  );
}

interface PendingNoticeProps {
  orderNumber: string;
  reference: string;
  checking: boolean;
  onCheck: () => void;
  onDone: () => void;
  onTrack: () => void;
}

/**
 * Payment made, confirmation not received in this browser. The order was saved
 * before Paystack opened and the gateway confirms it to us directly, so this
 * reads as "we've got it", not as an error.
 */
export function PendingNotice({ orderNumber, reference, checking, onCheck, onDone, onTrack }: PendingNoticeProps) {
  return (
    <>
      <div className={styles.scroll}>
        <div className={styles.result}>
          <div className={`${styles.resultIcon} ${styles.resultIconPending}`}>
            <svg aria-hidden="true" fill="none" height="34" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="34">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
          </div>
          <h3 className={styles.resultTitle}>Your order is saved</h3>
          <p className={styles.resultText}>
            Order <span className={styles.ref}>#{orderNumber}</span> is recorded and we&apos;re finalising the payment
            confirmation with Paystack. You&apos;ll get an SMS the moment it clears — there&apos;s nothing more to do,
            and you will not be charged twice.
          </p>
        </div>

        <dl className={styles.metaList}>
          <div><dt>Order</dt><dd>#{orderNumber}</dd></div>
          <div><dt>Payment ref</dt><dd className={styles.mono}>{reference}</dd></div>
        </dl>

        <p className={styles.resultFoot}>
          Keep this reference. You can check the live status any time on the{' '}
          <Link href={`/track-order?ref=${orderNumber}`} onClick={onTrack}>track order</Link> page, or quote it to our team.
        </p>
      </div>

      <div className={styles.checkoutFooter}>
        <Button fullWidth loading={checking} onClick={onCheck} size="lg">
          {checking ? 'Checking…' : 'Check payment status'}
        </Button>
        <div className={styles.footerRow}>
          <button className={styles.backButton} onClick={onDone} type="button">Continue shopping</button>
        </div>
      </div>
    </>
  );
}

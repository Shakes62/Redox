import type { Order } from '@/types/product';

/**
 * Automatic delivery.
 *
 * An order that has been in Processing or Shipped for this long is marked
 * Delivered on its own, so the merchant never has to go back and close it.
 *
 * The clock starts the first time the order enters either state and does not
 * restart when it moves from Processing to Shipped — "in fulfilment" is one
 * 24-hour window, not two. Leaving fulfilment (back to Pending, Cancelled, or
 * Delivered by hand) stops the clock; coming back in starts a fresh one.
 *
 * The database owns the real clock (`set_order_status` / `deliver_due_orders`
 * in catalog-db). These helpers mirror it for the in-memory sandbox and for the
 * countdown shown in the admin panel.
 */
export const AUTO_DELIVER_AFTER_HOURS = 24;

export const AUTO_DELIVER_AFTER_MS = AUTO_DELIVER_AFTER_HOURS * 60 * 60 * 1000;

export function isInFulfilment(status: string | null | undefined): boolean {
  return status === 'Processing' || status === 'Shipped';
}

/** Where the clock stands after a status change. Same rule as `set_order_status`. */
export function nextFulfilmentStartedAt(
  previousStatus: string | null | undefined,
  nextStatus: string,
  previousStartedAt: string | undefined,
  nowIso: string
): string | undefined {
  if (!isInFulfilment(nextStatus)) return undefined;
  if (isInFulfilment(previousStatus) && previousStartedAt) return previousStartedAt;
  return nowIso;
}

/** When the order is (or was) due to be marked Delivered. Null when no clock is running. */
export function autoDeliveryDueAt(order: Pick<Order, 'status' | 'fulfilmentStartedAt'>): Date | null {
  if (!isInFulfilment(order.status) || !order.fulfilmentStartedAt) return null;
  const started = new Date(order.fulfilmentStartedAt).getTime();
  if (!Number.isFinite(started)) return null;
  return new Date(started + AUTO_DELIVER_AFTER_MS);
}

export function isAutoDeliveryDue(
  order: Pick<Order, 'status' | 'fulfilmentStartedAt'>,
  now: Date = new Date()
): boolean {
  const due = autoDeliveryDueAt(order);
  return due !== null && due.getTime() <= now.getTime();
}

/** "5h 20m", "3h", "45m", "under 1m". */
export function formatTimeLeft(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return 'under 1m';
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

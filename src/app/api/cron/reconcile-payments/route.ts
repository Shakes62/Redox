import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAdminSessionValid, getAdminSessionToken } from '@/lib/admin-auth';
import { reconcilePendingPayments } from '@/lib/payment-service';
import { deliverDueDbOrders } from '@/lib/catalog-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Scheduled upkeep: payment reconciliation, then automatic delivery.
 *
 * Point a cron job at this (Vercel Cron, GitHub Actions, cron-job.org, …) every
 * 10–15 minutes with the `CRON_SECRET` in the Authorization header. It is the
 * last of the four settlement paths, and the one that runs even if nobody opens
 * the admin panel for a week.
 *
 * It also marks orders that have been in Processing or Shipped for 24 hours as
 * Delivered. That already happens whenever the admin or a customer looks at an
 * order; this keeps the database right even when nobody does.
 *
 *   vercel.json runs it once a day, which every Vercel plan allows. On Pro, or
 *   with an outside cron service, run it every 10 minutes:
 *   { "crons": [{ "path": "/api/cron/reconcile-payments", "schedule": "*\/10 * * * *" }] }
 */
async function isAuthorized(request: Request): Promise<boolean> {
  // A signed-in admin can always trigger it from the dashboard.
  if (isAdminSessionValid(await getAdminSessionToken())) return true;

  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;

  const header = request.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  // Its own step, ahead of reconciliation, so a Paystack outage can never stop
  // orders from being marked delivered. It does not throw.
  const autoDelivered = await deliverDueDbOrders();

  try {
    const summary = await reconcilePendingPayments({ limit: 50 });
    return NextResponse.json({ success: true, summary, autoDelivered: autoDelivered.length });
  } catch (error: any) {
    console.error('Scheduled payment reconciliation failed:', error);
    return NextResponse.json({ error: 'Reconciliation failed.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

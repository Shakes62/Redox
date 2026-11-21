import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminSessionToken, isAdminSessionTokenValid } from '@/lib/admin-session';

/**
 * Signing key for admin sessions when ADMIN_SESSION_SECRET is not set.
 *
 * It used to be a fixed string in this file, which meant anyone who had seen
 * the source could sign their own admin cookie. It is now derived from a
 * server-only secret the deployment already has, so it is identical on every
 * instance but never public. With none available, a random per-process key is
 * used: admins sign in again after a restart, but nobody can forge a session.
 */
const derivedSessionSecret = (() => {
  const material = [
    process.env.PAYSTACK_SECRET_KEY,
    process.env.DATABASE_URL,
    process.env.CRON_SECRET,
    process.env.ADMIN_PASSWORD
  ].find((value) => typeof value === 'string' && value.trim().length >= 8);
  return material
    ? crypto.createHash('sha256').update(`redox-admin-session:v2:${material}`).digest('hex')
    : crypto.randomBytes(32).toString('hex');
})();

/** The store owner's admin account, used when ADMIN_EMAIL is not set on the host. */
const OWNER_ADMIN_EMAIL = 'redoxdesignx@gmail.com';

/**
 * The one email allowed into the admin console: ADMIN_EMAIL if set, otherwise
 * the owner's account. Exactly one address is ever accepted, and the password
 * is still verified by Firebase, so the fallback grants nothing extra.
 */
export function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || '').trim() || OWNER_ADMIN_EMAIL;
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || derivedSessionSecret;
}

export function createAdminSession(email = getAdminEmail()) {
  return createAdminSessionToken(email, getAdminSessionSecret());
}

export function isAdminSessionValid(token?: string) {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return isAdminSessionTokenValid(token, adminEmail, getAdminSessionSecret());
}

export async function getAdminSessionToken() {
  return (await cookies()).get('admin_session')?.value;
}

export async function requireAdminSession() {
  if (isAdminSessionValid(await getAdminSessionToken())) return null;
  return NextResponse.json({ error: 'Admin session required.' }, { status: 401 });
}

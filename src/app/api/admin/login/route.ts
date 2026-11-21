import { NextResponse } from 'next/server';
import { createAdminSession, getAdminEmail } from '@/lib/admin-auth';
import { ADMIN_SESSION_SECONDS } from '@/lib/admin-session';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { getFirebaseWebApiKey } from '@/lib/firebase-config';

export async function POST(request: Request) {
  const limit = rateLimit(`admin-login:${requestKey(request)}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many sign in attempts. Please wait one minute.' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => null);
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      console.error('ADMIN_EMAIL is not configured; admin sign in is disabled.');
      return NextResponse.json(
        { error: 'Admin sign in is not configured: set ADMIN_EMAIL in the hosting environment variables and redeploy.' },
        { status: 503 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // 1. Strictly verify that the email matches the authorized admin email in .env
    if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Access Denied. Unauthorized admin account.' }, { status: 403 });
    }

    // 2. Perform Server-side Firebase REST authentication
    const apiKey = getFirebaseWebApiKey();
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
    
    const signInRes = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Always the configured address, never the raw input, so case and stray spaces cannot matter.
        email: adminEmail,
        password,
        returnSecureToken: true
      })
    });

    const signInData = await signInRes.json();
    
    if (!signInRes.ok) {
      // Do not echo Firebase's internal error codes back to the caller.
      console.warn('Admin sign in rejected by Firebase:', signInData.error?.message || signInRes.status);
      return NextResponse.json({ error: 'Invalid admin email or password.' }, { status: 401 });
    }

    // Defence in depth: the account Firebase actually authenticated must be the admin.
    if (String(signInData.email || '').trim().toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Access Denied. Unauthorized admin account.' }, { status: 403 });
    }

    // 3. Sign the issue time so the session cannot outlive twelve hours.
    const sessionToken = createAdminSession(adminEmail);
    
    const response = NextResponse.json({ success: true, message: 'Authenticated successfully!' });
    
    // Set secure HTTP-only cookie
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_SECONDS,
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Server-side Admin Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

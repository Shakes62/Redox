import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { dedupePlaces, toPlaceResult, type PlaceResult } from '@/lib/places';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { resolveSiteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

/**
 * Searches OpenStreetMap (Nominatim) for towns, areas and stations in Ghana so
 * the admin can add delivery places without typing coordinates or regions.
 *
 * The public Nominatim service asks for: an identifying User-Agent, at most one
 * request per second, cached results and no search-as-you-type. This route is
 * admin-only, searches only when the admin presses Search, caches for a day and
 * queues requests a second apart. Customers never call it.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;
const MIN_GAP_MS = 1100;

const cache = new Map<string, { at: number; results: PlaceResult[] }>();
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

/** Runs calls one at a time, at least a second apart, across all admin tabs. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      return await task();
    } finally {
      lastCallAt = Date.now();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function GET(request: Request) {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const query = (new URL(request.url).searchParams.get('q') || '').replace(/\s+/g, ' ').trim();
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: 'Type at least 2 letters of a town, area or station.' }, { status: 400 });
  }

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.results, cached: true });
  }

  const limit = rateLimit(`admin-places:${requestKey(request)}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many searches in a minute. Please wait a moment.' }, { status: 429 });
  }

  const siteUrl = resolveSiteUrl(request);
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'gh',
    limit: '10',
    'accept-language': 'en',
    dedupe: '1'
  });

  try {
    const results = await throttled(async () => {
      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': `RedoxDesignx/1.0 (delivery setup; ${siteUrl})`,
          Referer: siteUrl,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(9000),
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
      const data = await response.json();
      return dedupePlaces((Array.isArray(data) ? data : []).map(toPlaceResult).filter((place): place is PlaceResult => Boolean(place)));
    });

    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), results });
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[places] Map search failed:', error);
    return NextResponse.json(
      { error: 'The map search is busy or unreachable right now. Try again in a few seconds, or add the place by hand.' },
      { status: 503 }
    );
  }
}

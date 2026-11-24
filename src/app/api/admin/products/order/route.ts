import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDbConfigured } from '@/lib/db';
import { getDbProducts, saveDbProductOrder } from '@/lib/catalog-db';
import { requireAdminSession } from '@/lib/admin-auth';
import { parseProductOrder } from '@/lib/product-order';

export const dynamic = 'force-dynamic';

/**
 * Saves the shop order.
 *
 * Body: `{ order: string[] }` — product ids, first one shows first on the
 * homepage, the shop and search. Returns the catalogue in its new order so the
 * admin panel shows exactly what the database now holds.
 */
export async function POST(request: Request) {
  const authError = await requireAdminSession();
  if (authError) return authError;

  if (!isDbConfigured) {
    return NextResponse.json(
      { error: 'Database is not configured yet. Set DATABASE_URL in your .env file.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const order = parseProductOrder(body?.order);

  if (!order) {
    return NextResponse.json(
      { error: 'Send the list of product ids in the order they should show, each one once.' },
      { status: 400 }
    );
  }

  try {
    const placed = await saveDbProductOrder(order);

    if (placed === 0) {
      return NextResponse.json(
        { error: 'Those products no longer exist. Refresh the page and try again.' },
        { status: 409 }
      );
    }

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/search');

    const products = await getDbProducts();
    return NextResponse.json({ success: true, message: 'Shop order saved.', products });
  } catch (error: any) {
    console.error('API product order POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Could not save the shop order.' },
      { status: 500 }
    );
  }
}

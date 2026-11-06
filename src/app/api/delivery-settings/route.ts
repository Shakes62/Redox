import { NextResponse } from 'next/server';
import { activeLocations } from '@/lib/delivery';
import { getDeliverySettings } from '@/lib/delivery-settings-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getDeliverySettings();
    // Customers only ever see the towns the merchant has switched on.
    return NextResponse.json({ ...settings, locations: activeLocations(settings) }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Could not load delivery settings:', error);
    return NextResponse.json({ error: 'Delivery options are temporarily unavailable.' }, { status: 503 });
  }
}

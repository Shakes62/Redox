import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/admin-auth';
import { GHANA_REGIONS, MAX_DELIVERY_FEE, MAX_DELIVERY_LOCATIONS } from '@/lib/delivery';
import { getDeliverySettings, saveDeliverySettings } from '@/lib/delivery-settings-db';

export const dynamic = 'force-dynamic';

const locationSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(80),
  region: z.enum(GHANA_REGIONS),
  fee: z.number().finite().min(0).max(MAX_DELIVERY_FEE),
  note: z.string().trim().max(160).optional().default(''),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  area: z.string().trim().max(80).optional().default(''),
  lat: z.number().finite().min(-90).max(90).optional(),
  lon: z.number().finite().min(-180).max(180).optional(),
  osmId: z.string().regex(/^[NWR]\d{1,15}$/).optional()
});

const settingsSchema = z.object({
  eligibleRegions: z.array(z.enum(GHANA_REGIONS)).max(GHANA_REGIONS.length),
  urgentFee: z.number().finite().min(0).max(MAX_DELIVERY_FEE).multipleOf(0.01),
  // Optional so an older admin tab that only knows about regions cannot wipe the list.
  locations: z.array(locationSchema).max(MAX_DELIVERY_LOCATIONS).optional(),
  allowUnlisted: z.boolean().optional(),
  useLocation: z.boolean().optional()
});

export async function GET() {
  const authError = await requireAdminSession();
  if (authError) return authError;
  try {
    return NextResponse.json(await getDeliverySettings());
  } catch {
    return NextResponse.json({ error: 'Could not load delivery settings.' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authError = await requireAdminSession();
  if (authError) return authError;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path[0] === 'locations' ? 'Check each location has a name (2+ letters), a region and a price between GH₵0 and GH₵10,000.' : 'Choose valid regions and an urgent fee between GH₵0 and GH₵10,000.';
    return NextResponse.json({ error: where }, { status: 400 });
  }
  try {
    const current = await getDeliverySettings();
    return NextResponse.json(await saveDeliverySettings({
      eligibleRegions: parsed.data.eligibleRegions,
      urgentFee: parsed.data.urgentFee,
      locations: parsed.data.locations ?? current.locations,
      allowUnlisted: parsed.data.allowUnlisted ?? current.allowUnlisted,
      useLocation: parsed.data.useLocation ?? current.useLocation
    }));
  } catch (error) {
    console.error('Could not save delivery settings:', error);
    return NextResponse.json({ error: 'Could not save delivery settings.' }, { status: 503 });
  }
}

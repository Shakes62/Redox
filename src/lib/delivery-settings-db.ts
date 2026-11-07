import { isDbConfigured, sql } from '@/lib/db';
import { DEFAULT_DELIVERY_SETTINGS, normalizeDeliverySettings, type DeliverySettings } from '@/lib/delivery';

let schemaPromise: Promise<void> | null = null;

async function ensureDeliverySettingsTable() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS delivery_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          eligible_regions JSONB NOT NULL,
          urgent_fee NUMERIC(10, 2) NOT NULL DEFAULT 0
        )
      `;
      // Added with delivery locations. Additive only: existing settings keep working.
      await sql`
        ALTER TABLE delivery_settings
          ADD COLUMN IF NOT EXISTS locations JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS allow_unlisted BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS use_location BOOLEAN NOT NULL DEFAULT TRUE
      `;
    })().catch((error: unknown) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  if (!isDbConfigured) return DEFAULT_DELIVERY_SETTINGS;
  await ensureDeliverySettingsTable();
  const rows = await sql`
    SELECT eligible_regions, urgent_fee, locations, allow_unlisted, use_location
    FROM delivery_settings WHERE id = 1
  `;
  if (!rows[0]) return DEFAULT_DELIVERY_SETTINGS;
  return normalizeDeliverySettings({
    eligibleRegions: parseJson(rows[0].eligible_regions),
    urgentFee: rows[0].urgent_fee,
    locations: parseJson(rows[0].locations),
    allowUnlisted: rows[0].allow_unlisted,
    useLocation: rows[0].use_location
  });
}

export async function saveDeliverySettings(settings: DeliverySettings): Promise<DeliverySettings> {
  if (!isDbConfigured) throw new Error('Database is unavailable. Delivery settings were not saved.');
  await ensureDeliverySettingsTable();
  const clean = normalizeDeliverySettings(settings);
  await sql`
    INSERT INTO delivery_settings (id, eligible_regions, urgent_fee, locations, allow_unlisted, use_location)
    VALUES (
      1, ${JSON.stringify(clean.eligibleRegions)}::jsonb, ${clean.urgentFee},
      ${JSON.stringify(clean.locations)}::jsonb, ${clean.allowUnlisted}, ${clean.useLocation}
    )
    ON CONFLICT (id) DO UPDATE SET
      eligible_regions = EXCLUDED.eligible_regions,
      urgent_fee = EXCLUDED.urgent_fee,
      locations = EXCLUDED.locations,
      allow_unlisted = EXCLUDED.allow_unlisted,
      use_location = EXCLUDED.use_location
  `;
  return clean;
}

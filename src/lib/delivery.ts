export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Volta',
  'Northern', 'Upper East', 'Upper West', 'Savannah', 'North East',
  'Bono', 'Bono East', 'Ahafo', 'Western North', 'Oti'
] as const;

export type GhanaRegion = (typeof GHANA_REGIONS)[number];

/**
 * How an order travels.
 *
 * - `location`  a town the merchant listed, at the price they set for it.
 * - `standard`  free delivery to a bus station (unlisted town, eligible region).
 * - `urgent`    priority station delivery, charged on top.
 * - `none`      no scheduled option; the team calls to arrange delivery.
 */
export type DeliveryMethod = 'none' | 'standard' | 'urgent' | 'location';

export const FREE_STATION_DELIVERY_LABEL = 'Free Delivery to Station';
export const URGENT_STATION_DELIVERY_LABEL = 'Urgent Delivery to Station';
export const FREE_STATION_DELIVERY_DETAILS = 'Station deliveries run on Monday, Wednesday and Friday via VIP, OA and Express Bus.';

export const MAX_DELIVERY_FEE = 10000;
export const MAX_DELIVERY_LOCATIONS = 300;

/** A town or city the merchant delivers to, with its own price. */
export interface DeliveryLocation {
  /** Stable key the checkout sends back. Never shown to customers. */
  id: string;
  /** Town or city, as customers know it: "Kumasi", "East Legon". */
  name: string;
  region: GhanaRegion;
  /** Delivery charge in GH₵. Zero means free. */
  fee: number;
  /** Optional one-liner for customers: "VIP station pickup, Mon/Wed/Fri". */
  note: string;
  /** Hidden from checkout without losing the price the merchant set. */
  active: boolean;
}

export interface DeliverySettings {
  eligibleRegions: string[];
  urgentFee: number;
  locations: DeliveryLocation[];
  /**
   * Whether a customer whose town is not listed can still check out by naming
   * it. They then get the regional rule (free station delivery or a call from
   * the team), exactly as before locations existed.
   */
  allowUnlisted: boolean;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  eligibleRegions: GHANA_REGIONS.filter((region) => region !== 'Greater Accra'),
  urgentFee: 0,
  locations: [],
  allowUnlisted: true
};

const REGION_SET = new Set<string>(GHANA_REGIONS);

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/** A readable, stable id for a new location. */
export function makeLocationId(name: string, region: string): string {
  return `${slugify(name) || 'town'}-${slugify(region) || 'gh'}`.slice(0, 60);
}

export function normalizeDeliveryLocation(value: unknown): DeliveryLocation | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<Record<keyof DeliveryLocation, unknown>>;
  const name = cleanText(input.name, 80);
  const region = cleanText(input.region, 40);
  const fee = Number(input.fee);
  if (name.length < 2 || !REGION_SET.has(region) || !Number.isFinite(fee) || fee < 0 || fee > MAX_DELIVERY_FEE) {
    return null;
  }
  const rawId = typeof input.id === 'string' ? input.id.trim() : '';
  return {
    id: /^[a-z0-9][a-z0-9-]{0,59}$/i.test(rawId) ? rawId : makeLocationId(name, region),
    name,
    region: region as GhanaRegion,
    fee: roundMoney(fee),
    note: cleanText(input.note, 160),
    active: input.active !== false
  };
}

export function normalizeDeliverySettings(value: unknown): DeliverySettings {
  const input = value && typeof value === 'object' ? value as Partial<DeliverySettings> : {};
  const allowed = new Set<string>(DEFAULT_DELIVERY_SETTINGS.eligibleRegions);
  const eligibleRegions = Array.isArray(input.eligibleRegions)
    ? [...new Set(input.eligibleRegions.filter((region): region is string => typeof region === 'string' && allowed.has(region)))]
    : [...DEFAULT_DELIVERY_SETTINGS.eligibleRegions];
  const fee = Number(input.urgentFee);

  const locations: DeliveryLocation[] = [];
  const seenIds = new Set<string>();
  const seenPlaces = new Set<string>();
  for (const raw of Array.isArray(input.locations) ? input.locations : []) {
    const location = normalizeDeliveryLocation(raw);
    if (!location) continue;
    // The same town twice in one region would show customers two prices.
    const place = `${location.name.toLowerCase()}|${location.region}`;
    if (seenPlaces.has(place)) continue;
    let id = location.id;
    for (let n = 2; seenIds.has(id); n += 1) id = `${location.id.slice(0, 55)}-${n}`;
    seenIds.add(id);
    seenPlaces.add(place);
    locations.push({ ...location, id });
    if (locations.length >= MAX_DELIVERY_LOCATIONS) break;
  }

  return {
    eligibleRegions,
    urgentFee: Number.isFinite(fee) && fee > 0 ? roundMoney(Math.min(fee, MAX_DELIVERY_FEE)) : 0,
    locations,
    allowUnlisted: input.allowUnlisted !== false
  };
}

/** What customers may pick from: active locations, alphabetical. */
export function activeLocations(settings: DeliverySettings): DeliveryLocation[] {
  return settings.locations
    .filter((location) => location.active)
    .sort((a, b) => a.name.localeCompare(b.name) || a.region.localeCompare(b.region));
}

/** "Kumasi, Ashanti" — or just "Ashanti" when the merchant named the region itself. */
export function locationLabel(location: Pick<DeliveryLocation, 'name' | 'region'>): string {
  return location.name.toLowerCase() === location.region.toLowerCase()
    ? location.name
    : `${location.name}, ${location.region}`;
}

export function isStationRegion(region: string, settings: DeliverySettings): boolean {
  return region !== 'Greater Accra' && settings.eligibleRegions.includes(region);
}

export function urgentAvailableFor(region: string, settings: DeliverySettings): boolean {
  return isStationRegion(region, settings) && settings.urgentFee > 0;
}

/** The regional rule: free station delivery, urgent station delivery, or a call from the team. */
export function deliveryQuote(
  region: string,
  requested: 'standard' | 'urgent' | undefined,
  settings: DeliverySettings
): { method: DeliveryMethod; fee: number; error?: string } {
  const eligible = isStationRegion(region, settings);
  if (!eligible) {
    return requested === 'urgent'
      ? { method: 'none', fee: 0, error: 'Urgent Delivery to Station is not available for this region.' }
      : { method: 'none', fee: 0 };
  }
  if (requested === 'urgent') {
    return settings.urgentFee > 0
      ? { method: 'urgent', fee: settings.urgentFee }
      : { method: 'standard', fee: 0, error: 'Urgent Delivery to Station is not available right now.' };
  }
  return { method: 'standard', fee: 0 };
}

export interface CheckoutDeliveryRequest {
  /** A listed location, when the customer picked one. */
  locationId?: string;
  /** The region, used only when no location was picked. */
  region: string;
  requested?: 'standard' | 'urgent';
}

export interface CheckoutDeliveryQuote {
  method: DeliveryMethod;
  fee: number;
  error?: string;
  location?: DeliveryLocation;
  /** What to record as the order's city — from the merchant's list, never the browser's text. */
  shippingCity: string;
}

/**
 * Prices delivery for a checkout. The server calls this with its own copy of
 * the settings, so the fee charged is always the one the merchant set.
 */
export function quoteCheckoutDelivery(
  request: CheckoutDeliveryRequest,
  settings: DeliverySettings
): CheckoutDeliveryQuote {
  const listed = activeLocations(settings);

  if (request.locationId) {
    const location = listed.find((candidate) => candidate.id === request.locationId);
    if (!location) {
      return {
        method: 'none',
        fee: 0,
        shippingCity: request.region,
        error: 'That delivery location is no longer available. Please choose another one.'
      };
    }
    const shippingCity = locationLabel(location);
    if (request.requested === 'urgent') {
      return urgentAvailableFor(location.region, settings)
        ? { method: 'urgent', fee: roundMoney(location.fee + settings.urgentFee), location, shippingCity }
        : { method: 'location', fee: location.fee, location, shippingCity, error: 'Urgent delivery is not available for this location.' };
    }
    return { method: 'location', fee: location.fee, location, shippingCity };
  }

  if (listed.length > 0 && !settings.allowUnlisted) {
    return { method: 'none', fee: 0, shippingCity: request.region, error: 'Please choose your delivery location from the list.' };
  }

  return { ...deliveryQuote(request.region, request.requested, settings), shippingCity: request.region };
}

/** Customer- and admin-facing wording for how an order is delivered. */
export function describeDelivery(method: DeliveryMethod | undefined, fee = 0): { label: string; detail: string } {
  switch (method) {
    case 'urgent':
      return { label: URGENT_STATION_DELIVERY_LABEL, detail: 'Priority delivery. Our team will confirm the earliest time.' };
    case 'standard':
      return { label: FREE_STATION_DELIVERY_LABEL, detail: FREE_STATION_DELIVERY_DETAILS };
    case 'location':
      return { label: fee > 0 ? 'Delivery' : 'Free delivery', detail: 'Delivered to your chosen town.' };
    default:
      return { label: 'Delivery', detail: 'Our team will call you to arrange delivery.' };
  }
}

export function normalizeDeliveryMethod(value: unknown): DeliveryMethod {
  return value === 'urgent' || value === 'standard' || value === 'location' ? value : 'none';
}

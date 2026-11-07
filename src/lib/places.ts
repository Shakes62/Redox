import type { GhanaRegion } from './delivery.ts';

/**
 * OpenStreetMap helpers for delivery places.
 *
 * Kept free of network and framework code so the same logic runs on the
 * server (turning map search results into places) and in the customer's
 * browser (finding the closest place to them), and can be unit-tested.
 */

/** ISO 3166-2 codes OpenStreetMap attaches to every Ghanaian address. */
const REGION_BY_ISO: Record<string, GhanaRegion> = {
  'GH-AA': 'Greater Accra',
  'GH-AH': 'Ashanti',
  'GH-AF': 'Ahafo',
  'GH-BO': 'Bono',
  'GH-BE': 'Bono East',
  'GH-CP': 'Central',
  'GH-EP': 'Eastern',
  'GH-NP': 'Northern',
  'GH-NE': 'North East',
  'GH-OT': 'Oti',
  'GH-SV': 'Savannah',
  'GH-UE': 'Upper East',
  'GH-UW': 'Upper West',
  'GH-TV': 'Volta',
  'GH-WP': 'Western',
  'GH-WN': 'Western North'
};

const REGION_BY_NAME = new Map(
  Object.values(REGION_BY_ISO).map((region) => [region.toLowerCase(), region] as const)
);

export type OsmAddress = Record<string, string | undefined>;

/** Works out the region from the ISO code, falling back to the state name. */
export function regionFromOsmAddress(address: OsmAddress | undefined | null): GhanaRegion | null {
  if (!address) return null;
  const iso = address['ISO3166-2-lvl4'] || address['ISO3166-2-lvl3'];
  if (iso && REGION_BY_ISO[iso]) return REGION_BY_ISO[iso];
  for (const key of ['state', 'region', 'state_district']) {
    const value = address[key]?.toLowerCase().replace(/\s+region$/, '').trim();
    if (value && REGION_BY_NAME.has(value)) return REGION_BY_NAME.get(value)!;
  }
  return null;
}

/** A map search result, cleaned up for the admin to pick from. */
export interface PlaceResult {
  /** OpenStreetMap object id, e.g. "N5531053289". */
  osmId: string;
  name: string;
  /** The town or district it sits in, when different from the name: "Kumasi". */
  area: string;
  region: GhanaRegion | null;
  /** Human word for what it is: City, Town, Area, Bus station… */
  kind: string;
  lat: number;
  lon: number;
}

const KIND_LABELS: Record<string, string> = {
  city: 'City',
  town: 'Town',
  village: 'Village',
  hamlet: 'Village',
  suburb: 'Area',
  quarter: 'Area',
  neighbourhood: 'Neighbourhood',
  city_district: 'District',
  municipality: 'Municipality',
  county: 'District',
  isolated_dwelling: 'Settlement',
  locality: 'Locality',
  bus_station: 'Bus station',
  station: 'Station',
  road: 'Street'
};

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Converts one Nominatim `jsonv2` result. Returns null for anything unusable. */
export function toPlaceResult(raw: unknown): PlaceResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, any>;
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const address: OsmAddress = item.address && typeof item.address === 'object' ? item.address : {};
  const addressType = String(item.addresstype || item.type || '');
  const name = String(item.name || address[addressType] || address.city || address.town || address.village || '').trim();
  if (name.length < 2) return null;

  // "Ho Municipal District" → "Ho", trimmed before comparing so a town is never its own area.
  const areaCandidates = [address.city, address.town, address.village, address.municipality, address.county]
    .map((value) => (value || '').replace(/\s+(Metropolitan|Municipal)(\s+District)?$|\s+District$/i, '').trim())
    .filter((value) => value && value.toLowerCase() !== name.toLowerCase());

  const osmType = String(item.osm_type || '').charAt(0).toUpperCase();
  const osmId = /^[NWR]$/.test(osmType) && item.osm_id ? `${osmType}${item.osm_id}` : '';

  return {
    osmId,
    name: name.slice(0, 80),
    area: (areaCandidates[0] || '').slice(0, 80),
    region: regionFromOsmAddress(address),
    kind: KIND_LABELS[addressType] || KIND_LABELS[String(item.type)] || titleCase(addressType || 'Place'),
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6
  };
}

/** Removes repeats of the same place (OSM often has a node and an area for one town). */
export function dedupePlaces(places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.area.toLowerCase()}|${place.region}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** Straight-line distance in kilometres (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function hasCoordinates<T extends { lat?: number; lon?: number }>(place: T): place is T & GeoPoint {
  return typeof place.lat === 'number' && typeof place.lon === 'number' && Number.isFinite(place.lat) && Number.isFinite(place.lon);
}

/** The closest pinned places to a point, nearest first. */
export function nearestPlaces<T extends { lat?: number; lon?: number }>(
  from: GeoPoint,
  places: T[],
  limit = 3
): { place: T; km: number }[] {
  return places
    .filter(hasCoordinates)
    .map((place) => ({ place: place as T, km: distanceKm(from, place) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** "800 m", "4.2 km", "35 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

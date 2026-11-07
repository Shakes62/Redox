'use client';

import { useMemo, useState } from 'react';
import { CheckIcon, MapPinIcon, SearchIcon } from '@/components/ui/Icons';
import {
  activeLocations,
  FREE_STATION_DELIVERY_DETAILS,
  FREE_STATION_DELIVERY_LABEL,
  GHANA_REGIONS,
  isStationRegion,
  URGENT_STATION_DELIVERY_LABEL,
  urgentAvailableFor,
  type CheckoutDeliveryQuote,
  type DeliveryLocation,
  type DeliverySettings
} from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import { formatDistance, hasCoordinates, nearestPlaces } from '@/lib/places';
import styles from './CartDrawer.module.css';

type DeliveryPatch = Partial<{ locationId: string; unlisted: boolean; region: string; address: string; speed: 'standard' | 'urgent' }>;

interface DeliveryPickerProps {
  settings: DeliverySettings;
  loading: boolean;
  regionMode: boolean;
  selectedId: string;
  location?: DeliveryLocation;
  region: string;
  placeRegion: string;
  address: string;
  speed: 'standard' | 'urgent';
  quote?: CheckoutDeliveryQuote;
  errors: Partial<Record<'location' | 'region' | 'address', string>>;
  onChange: (patch: DeliveryPatch) => void;
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; nearest: { place: DeliveryLocation; km: number }[] }
  | { status: 'error'; message: string };

/** Above this, the "closest" place is probably not close; say so plainly. */
const FAR_KM = 60;

function priceText(fee: number) {
  return fee > 0 ? formatCurrency(fee) : 'Free';
}

function subline(location: DeliveryLocation) {
  return [location.area, location.region].filter(Boolean).join(' · ');
}

export function DeliveryPicker({
  settings,
  loading,
  regionMode,
  selectedId,
  location,
  region,
  placeRegion,
  address,
  speed,
  quote,
  errors,
  onChange
}: DeliveryPickerProps) {
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });

  const locations = useMemo(() => activeLocations(settings), [settings]);
  const hasLocations = locations.length > 0;
  const canLocate = settings.useLocation && locations.some(hasCoordinates);

  const popular = useMemo(() => locations.filter((candidate) => candidate.featured), [locations]);
  const byRegion = useMemo(() => {
    const groups = new Map<string, DeliveryLocation[]>();
    for (const candidate of locations) groups.set(candidate.region, [...(groups.get(candidate.region) || []), candidate]);
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [locations]);
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return locations.filter((candidate) => `${candidate.name} ${candidate.area} ${candidate.region}`.toLowerCase().includes(query));
  }, [locations, search]);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading delivery options" className={styles.pickerLoading}>
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );
  }

  const pick = (candidate: DeliveryLocation) => {
    onChange({ locationId: candidate.id, unlisted: false, speed: 'standard' });
    setChoosing(false);
    setSearch('');
  };

  const locate = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeo({ status: 'error', message: 'This browser can’t share your location. Search or pick your place below.' });
      return;
    }
    setGeo({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = nearestPlaces({ lat: position.coords.latitude, lon: position.coords.longitude }, locations, 3);
        setGeo(nearest.length
          ? { status: 'done', nearest }
          : { status: 'error', message: 'We couldn’t match your location to a delivery place. Search or pick below.' });
      },
      (error) => {
        setGeo({
          status: 'error',
          message: error.code === error.PERMISSION_DENIED
            ? 'Location is turned off for this site. No problem — search or pick your place below.'
            : 'We couldn’t get your location just now. Search or pick your place below.'
        });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  };

  const option = (candidate: DeliveryLocation, extra?: string, fieldKey?: string) => {
    const selected = candidate.id === selectedId;
    return (
      <button
        aria-checked={selected}
        className={`${styles.locationOption} ${selected ? styles.locationSelected : ''}`}
        data-field={fieldKey}
        key={candidate.id + (extra || '')}
        onClick={() => pick(candidate)}
        role="radio"
        type="button"
      >
        <span aria-hidden="true" className={styles.radioMark}>{selected && <CheckIcon height={12} width={12} />}</span>
        <span className={styles.locationText}>
          <strong>{candidate.name}</strong>
          <small>{extra ? <><span className={styles.distance}>{extra}</span> · </> : null}{subline(candidate)}</small>
        </span>
        <span className={`${styles.locationPrice} ${candidate.fee === 0 ? styles.free : ''}`}>{priceText(candidate.fee)}</span>
      </button>
    );
  };

  const urgentOffered = Boolean(placeRegion) && urgentAvailableFor(placeRegion, settings);
  const isStation = regionMode && Boolean(region) && isStationRegion(region, settings);
  const showChooser = !regionMode && (!location || choosing);

  const addressLabel = regionMode
    ? isStation ? 'Town or bus station' : 'Delivery address'
    : 'Address or nearest landmark';
  const addressPlaceholder = regionMode
    ? isStation ? 'e.g. Ho, VIP station' : 'House no., street, area'
    : 'e.g. House 12, near the post office';

  return (
    <div className={styles.picker}>
      {/* ── A listed place is chosen: one clear card ─────────────── */}
      {!regionMode && location && !choosing && (
        <div className={styles.chosenCard}>
          <span aria-hidden="true" className={styles.chosenIcon}><MapPinIcon height={20} width={20} /></span>
          <div className={styles.chosenText}>
            <small>Delivering to</small>
            <strong>{location.name}</strong>
            <span>{subline(location)}</span>
          </div>
          <div className={styles.chosenSide}>
            <span className={`${styles.locationPrice} ${location.fee === 0 ? styles.free : ''}`}>{priceText(location.fee)}</span>
            <button className={styles.changeButton} onClick={() => setChoosing(true)} type="button">Change</button>
          </div>
          {location.note && !urgentOffered && <p className={styles.chosenNote}>{location.note}</p>}
        </div>
      )}

      {/* ── Choosing a listed place ──────────────────────────────── */}
      {showChooser && (
        <div
          aria-describedby={errors.location ? 'delivery-location-error' : undefined}
          className={styles.chooser}
          data-field="location"
          tabIndex={-1}
        >
          <p className={styles.chooserLead}>Pick the delivery place closest to you. The price is shown on the right.</p>

          {canLocate && (
            <div className={styles.locateBlock}>
              <button className={styles.locateButton} disabled={geo.status === 'locating'} onClick={locate} type="button">
                <span aria-hidden="true" className={`${styles.locateIcon} ${geo.status === 'locating' ? styles.locatePulse : ''}`}>
                  <MapPinIcon height={20} width={20} />
                </span>
                <span className={styles.locateText}>
                  <strong>{geo.status === 'locating' ? 'Finding you…' : geo.status === 'done' ? 'Search again from my location' : 'Find the closest place to me'}</strong>
                  <small>Uses your location once. It stays on your phone.</small>
                </span>
              </button>

              {geo.status === 'error' && <p className={styles.infoNote} role="status">{geo.message}</p>}

              {geo.status === 'done' && (
                <div className={styles.nearest} role="radiogroup" aria-label="Closest delivery places">
                  <span className={styles.groupLabel}>Closest to you</span>
                  {geo.nearest.map(({ place, km }) => option(place, `≈ ${formatDistance(km)}`))}
                  {geo.nearest[0].km > FAR_KM && (
                    <p className={styles.chooserHint}>
                      These are the nearest we deliver to.{settings.allowUnlisted ? ' If none suits you, tap “My town isn’t listed” below.' : ''}
                    </p>
                  )}
                  <p className={styles.osmNote}>Distances are straight-line, using map data © OpenStreetMap.</p>
                </div>
              )}

              <div className={styles.orDivider}><span>or choose from the list</span></div>
            </div>
          )}

          {locations.length > 6 && (
            <label className={styles.searchBox}>
              <SearchIcon height={18} width={18} />
              <span className="srOnly">Search delivery places</span>
              <input
                autoComplete="off"
                className={styles.searchInput}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your town or area"
                type="search"
                value={search}
              />
            </label>
          )}

          <div
            aria-label="Delivery places"
            className={`${styles.locationList} ${errors.location ? styles.locationListError : ''}`}
            role="radiogroup"
          >
            {search.trim() ? (
              <>
                {matches.map((candidate) => option(candidate))}
                {matches.length === 0 && (
                  <p className={styles.noMatch}>
                    No place matches &ldquo;{search}&rdquo;. Try the nearest big town{settings.allowUnlisted ? ', or tap “My town isn’t listed”' : ''}.
                  </p>
                )}
              </>
            ) : locations.length <= 8 ? (
              // A short list reads best flat, popular first.
              [...popular, ...locations.filter((candidate) => !candidate.featured)].map((candidate) => option(candidate))
            ) : (
              <>
                {popular.length > 0 && (
                  <>
                    <span className={styles.groupLabel}>★ Popular</span>
                    {popular.map((candidate) => option(candidate, undefined))}
                  </>
                )}
                {byRegion.map(([name, places]) => (
                  <div className={styles.regionGroup} key={name}>
                    <span className={styles.groupLabel}>{name}</span>
                    {places.map((candidate) => option(candidate, undefined))}
                  </div>
                ))}
              </>
            )}
          </div>

          {errors.location && <p className={styles.fieldError} id="delivery-location-error">{errors.location}</p>}

          <div className={styles.chooserFoot}>
            {settings.allowUnlisted && (
              <button className={styles.linkButton} onClick={() => { onChange({ unlisted: true, locationId: '', speed: 'standard' }); setChoosing(false); }} type="button">
                My town isn&apos;t listed
              </button>
            )}
            {location && choosing && (
              <button className={styles.linkButton} onClick={() => setChoosing(false)} type="button">
                Keep {location.name}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Town not listed: region rules, as before ──────────────── */}
      {regionMode && (
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="checkout-region">Your region</label>
          <select
            aria-invalid={Boolean(errors.region)}
            className={styles.input}
            data-field="region"
            id="checkout-region"
            onChange={(event) => onChange({ region: event.target.value, speed: 'standard' })}
            value={region}
          >
            <option disabled value="">Select your region</option>
            {GHANA_REGIONS.map((name) => (
              <option key={name} value={name}>{name} Region</option>
            ))}
          </select>
          {errors.region && <p className={styles.fieldError}>{errors.region}</p>}
          {hasLocations && (
            <button className={styles.linkButton} onClick={() => onChange({ unlisted: false })} type="button">
              ← Back to our delivery places
            </button>
          )}
        </div>
      )}

      {/* ── The rest only appears once a place is settled ─────────── */}
      {!showChooser && (urgentOffered || isStation) && (
        <fieldset className={styles.speedGroup}>
          <legend className={styles.fieldLabel}>Delivery speed</legend>
          <label className={`${styles.speedOption} ${speed !== 'urgent' ? styles.speedSelected : ''}`}>
            <input checked={speed !== 'urgent'} name="delivery-speed" onChange={() => onChange({ speed: 'standard' })} type="radio" />
            <span>
              <strong>{regionMode ? FREE_STATION_DELIVERY_LABEL : 'Standard delivery'}</strong>
              <small>{regionMode ? FREE_STATION_DELIVERY_DETAILS : location?.note || 'Delivered to your chosen place.'}</small>
            </span>
            <em>{regionMode ? 'Free' : priceText(location?.fee || 0)}</em>
          </label>
          {urgentOffered && (
            <label className={`${styles.speedOption} ${speed === 'urgent' ? styles.speedSelected : ''}`}>
              <input checked={speed === 'urgent'} name="delivery-speed" onChange={() => onChange({ speed: 'urgent' })} type="radio" />
              <span>
                <strong>{URGENT_STATION_DELIVERY_LABEL}</strong>
                <small>Priority delivery. Our team will confirm the earliest time.</small>
              </span>
              <em>+{formatCurrency(settings.urgentFee)}</em>
            </label>
          )}
        </fieldset>
      )}

      {regionMode && region && !isStation && (
        <p className={styles.infoNote}>Our team will call you to arrange delivery to your address.</p>
      )}

      {!showChooser && (
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="checkout-address">{addressLabel}</label>
          <input
            aria-describedby={errors.address ? 'checkout-address-error' : undefined}
            aria-invalid={Boolean(errors.address)}
            autoComplete="street-address"
            className={styles.input}
            data-field="address"
            id="checkout-address"
            onChange={(event) => onChange({ address: event.target.value })}
            placeholder={addressPlaceholder}
            type="text"
            value={address}
          />
          {errors.address && <p className={styles.fieldError} id="checkout-address-error">{errors.address}</p>}
        </div>
      )}

      {quote?.error && <p className={styles.fieldError}>{quote.error}</p>}
    </div>
  );
}

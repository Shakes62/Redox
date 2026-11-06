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
import styles from './CartDrawer.module.css';

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
  onChange: (patch: Partial<{ locationId: string; unlisted: boolean; region: string; address: string; speed: 'standard' | 'urgent' }>) => void;
}

function priceText(fee: number) {
  return fee > 0 ? formatCurrency(fee) : 'Free';
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
  const locations = useMemo(() => activeLocations(settings), [settings]);
  const hasLocations = locations.length > 0;

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((candidate) =>
      `${candidate.name} ${candidate.region}`.toLowerCase().includes(query)
    );
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

  const urgentOffered = Boolean(placeRegion) && urgentAvailableFor(placeRegion, settings);
  const isStation = regionMode && Boolean(region) && isStationRegion(region, settings);

  const addressLabel = regionMode
    ? isStation ? 'Town or bus station' : 'Delivery address'
    : 'Address or nearest landmark';
  const addressPlaceholder = regionMode
    ? isStation ? 'e.g. Ho, VIP station' : 'House no., street, area'
    : 'e.g. House 12, near the post office';

  return (
    <div className={styles.picker}>
      {!regionMode ? (
        <div className={styles.field}>
          <span className={styles.fieldLabel} id="delivery-location-label">Town or city</span>
          {locations.length > 6 && (
            <label className={styles.searchBox}>
              <SearchIcon height={18} width={18} />
              <span className="srOnly">Search towns</span>
              <input
                autoComplete="off"
                className={styles.searchInput}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your town"
                type="search"
                value={search}
              />
            </label>
          )}
          <div
            aria-describedby={errors.location ? 'delivery-location-error' : undefined}
            aria-labelledby="delivery-location-label"
            className={`${styles.locationList} ${errors.location ? styles.locationListError : ''}`}
            role="radiogroup"
          >
            {matches.map((candidate, index) => {
              const selected = candidate.id === selectedId;
              return (
                <button
                  aria-checked={selected}
                  className={`${styles.locationOption} ${selected ? styles.locationSelected : ''}`}
                  data-field={index === 0 ? 'location' : undefined}
                  key={candidate.id}
                  onClick={() => onChange({ locationId: candidate.id, unlisted: false, speed: 'standard' })}
                  role="radio"
                  type="button"
                >
                  <span className={styles.radioMark} aria-hidden="true">{selected && <CheckIcon height={12} width={12} />}</span>
                  <span className={styles.locationText}>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.region}</small>
                  </span>
                  <span className={`${styles.locationPrice} ${candidate.fee === 0 ? styles.free : ''}`}>{priceText(candidate.fee)}</span>
                </button>
              );
            })}
            {matches.length === 0 && (
              <p className={styles.noMatch}>No town matches &ldquo;{search}&rdquo;. Check the spelling{settings.allowUnlisted ? ' or tap “My town isn’t listed”' : ''}.</p>
            )}
          </div>
          {errors.location && <p className={styles.fieldError} id="delivery-location-error">{errors.location}</p>}
          {location?.note && !urgentOffered && <p className={styles.locationNote}><MapPinIcon height={16} width={16} /> {location.note}</p>}
          {settings.allowUnlisted && (
            <button className={styles.linkButton} onClick={() => onChange({ unlisted: true, locationId: '', speed: 'standard' })} type="button">
              My town isn&apos;t listed
            </button>
          )}
        </div>
      ) : (
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="checkout-region">Region</label>
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
              ← Back to the list of towns
            </button>
          )}
        </div>
      )}

      {(urgentOffered || isStation) && (
        <fieldset className={styles.speedGroup}>
          <legend className={styles.fieldLabel}>Delivery speed</legend>
          <label className={`${styles.speedOption} ${speed !== 'urgent' ? styles.speedSelected : ''}`}>
            <input checked={speed !== 'urgent'} name="delivery-speed" onChange={() => onChange({ speed: 'standard' })} type="radio" />
            <span>
              <strong>{regionMode ? FREE_STATION_DELIVERY_LABEL : 'Standard delivery'}</strong>
              <small>{regionMode ? FREE_STATION_DELIVERY_DETAILS : location?.note || 'Delivered to your chosen town.'}</small>
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

      {quote?.error && <p className={styles.fieldError}>{quote.error}</p>}
    </div>
  );
}

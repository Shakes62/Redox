'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  GHANA_REGIONS,
  locationLabel,
  makeLocationId,
  MAX_DELIVERY_FEE,
  type DeliveryLocation,
  type GhanaRegion
} from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import type { PlaceResult } from '@/lib/places';
import styles from './DeliverySettingsPanel.module.css';

const QUICK_PRICES = [0, 10, 15, 20, 30, 50];

interface PlaceDraft {
  name: string;
  area: string;
  region: GhanaRegion | '';
  fee: string;
  note: string;
  featured: boolean;
  lat?: number;
  lon?: number;
  osmId?: string;
  /** Region came from the map, not typed. */
  regionFromMap: boolean;
}

interface DeliveryPlaceFinderProps {
  locations: DeliveryLocation[];
  /** An existing place the admin is pinning to the map, instead of adding a new one. */
  pinTarget: DeliveryLocation | null;
  onCancelPin: () => void;
  onSave: (location: DeliveryLocation, message: string) => Promise<boolean>;
}

export function parseFee(value: string): number | null {
  if (value.trim() === '') return null;
  const fee = Number(value);
  if (!Number.isFinite(fee) || fee < 0 || fee > MAX_DELIVERY_FEE) return null;
  return Math.round(fee * 100) / 100;
}

/** The price most places in a region already use — a sensible default for the next one. */
export function usualPrice(locations: DeliveryLocation[], region: string): number | null {
  const counts = new Map<number, number>();
  for (const location of locations) {
    if (location.region === region) counts.set(location.fee, (counts.get(location.fee) || 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [fee, count] of counts) {
    if (count > bestCount) {
      best = fee;
      bestCount = count;
    }
  }
  return best;
}

export function PriceChips({ value, onChange, suggested }: { value: string; onChange: (value: string) => void; suggested?: number | null }) {
  const chips = suggested !== null && suggested !== undefined && !QUICK_PRICES.includes(suggested)
    ? [...QUICK_PRICES, suggested].sort((a, b) => a - b)
    : QUICK_PRICES;
  return (
    <div className={styles.priceChips} role="group" aria-label="Quick prices">
      {chips.map((fee) => (
        <button
          aria-pressed={parseFee(value) === fee}
          className={`${styles.chip} ${parseFee(value) === fee ? styles.chipOn : ''}`}
          key={fee}
          onClick={() => onChange(String(fee))}
          type="button"
        >
          {fee === 0 ? 'Free' : `GH₵${fee}`}
          {suggested === fee && <span className={styles.chipHint}>usual</span>}
        </button>
      ))}
    </div>
  );
}

export function DeliveryPlaceFinder({ locations, pinTarget, onCancelPin, onSave }: DeliveryPlaceFinderProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const setupRef = useRef<HTMLDivElement>(null);

  // Pinning an existing place: search for it straight away by name.
  useEffect(() => {
    if (!pinTarget) return;
    setQuery(pinTarget.area ? `${pinTarget.name}, ${pinTarget.area}` : pinTarget.name);
    setDraft({
      name: pinTarget.name,
      area: pinTarget.area,
      region: pinTarget.region,
      fee: String(pinTarget.fee),
      note: pinTarget.note,
      featured: pinTarget.featured,
      regionFromMap: false
    });
    setResults(null);
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [pinTarget]);

  const isAdded = (place: PlaceResult) => locations.some((location) =>
    location.id !== pinTarget?.id && (
      (place.osmId && location.osmId === place.osmId) ||
      (location.name.toLowerCase() === place.name.toLowerCase() && location.region === place.region &&
        (location.area || '').toLowerCase() === place.area.toLowerCase())
    )
  );

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setSearchError('Type at least 2 letters.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const response = await fetch(`/api/admin/places?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Map search failed. Try again.');
      setResults(data.results || []);
    } catch (error) {
      setResults(null);
      setSearchError(error instanceof Error ? error.message : 'Map search failed. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const choose = (place: PlaceResult) => {
    const region = place.region || draft?.region || '';
    const suggested = region ? usualPrice(locations, region) : null;
    setDraft((current) => ({
      name: pinTarget ? current?.name || place.name : place.name,
      area: place.area,
      region,
      fee: pinTarget ? current?.fee ?? '' : suggested !== null ? String(suggested) : '',
      note: current?.note || '',
      featured: current?.featured || false,
      lat: place.lat,
      lon: place.lon,
      osmId: place.osmId || undefined,
      regionFromMap: Boolean(place.region)
    }));
    setFormError('');
    window.requestAnimationFrame(() => setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const addByHand = () => {
    setDraft({ name: query.trim(), area: '', region: '', fee: '', note: '', featured: false, regionFromMap: false });
    setFormError('');
    window.requestAnimationFrame(() => setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const reset = () => {
    setDraft(null);
    setResults(null);
    setQuery('');
    setFormError('');
    if (pinTarget) onCancelPin();
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.replace(/\s+/g, ' ').trim();
    const fee = parseFee(draft.fee);
    if (name.length < 2) return setFormError('Enter the place name.');
    if (!draft.region) return setFormError('Choose the region.');
    if (fee === null) return setFormError('Choose a price, or type one from 0 to 10,000. 0 means free.');
    const region = draft.region;
    if (!pinTarget && locations.some((location) => location.name.toLowerCase() === name.toLowerCase() && location.region === region && (location.area || '').toLowerCase() === draft.area.trim().toLowerCase())) {
      return setFormError(`${name} is already on your list. Change its price in “Your places” below.`);
    }

    let id = pinTarget?.id || makeLocationId(draft.area ? `${name}-${draft.area}` : name, region);
    if (!pinTarget) {
      const base = id;
      for (let n = 2; locations.some((location) => location.id === id); n += 1) id = `${base.slice(0, 55)}-${n}`;
    }

    const location: DeliveryLocation = {
      id,
      name,
      area: draft.area.trim(),
      region,
      fee,
      note: draft.note.trim(),
      active: pinTarget ? pinTarget.active : true,
      featured: draft.featured,
      ...(draft.lat !== undefined && draft.lon !== undefined ? { lat: draft.lat, lon: draft.lon } : {}),
      ...(draft.osmId ? { osmId: draft.osmId } : {})
    };

    setSaving(true);
    const label = locationLabel(location);
    const ok = await onSave(location, pinTarget
      ? `${label} is now pinned on the map.`
      : `${label} added at ${fee > 0 ? formatCurrency(fee) : 'free delivery'}. Customers can choose it now.`);
    setSaving(false);
    if (ok) reset();
  };

  const draftRegion = draft?.region;
  const suggested = draftRegion ? usualPrice(locations.filter((location) => location.id !== pinTarget?.id), draftRegion) : null;

  return (
    <section aria-labelledby="place-finder-title" className={`${styles.panel} ${pinTarget ? styles.panelPinning : ''}`}>
      <div className={styles.cardHead}>
        <span className={styles.stepBadge}>1</span>
        <div>
          <h3 id="place-finder-title">{pinTarget ? `Pin “${pinTarget.name}” on the map` : 'Add a delivery place'}</h3>
          <p>
            {pinTarget
              ? 'Find it below and choose the right result. Its price and settings stay the same.'
              : 'Search any town, area or bus station in Ghana. The region fills in by itself from the map.'}
          </p>
        </div>
      </div>

      <form className={styles.searchRow} onSubmit={search}>
        <input
          aria-label="Search a place in Ghana"
          className={styles.input}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Adum, Tamale, Ho, East Legon"
          ref={searchRef}
          type="search"
          value={query}
        />
        <button className={styles.primary} disabled={searching} type="submit">
          {searching ? 'Searching…' : 'Search map'}
        </button>
      </form>
      {searchError && <p className={styles.errorText} role="alert">{searchError}</p>}

      {results && (
        <div className={styles.results}>
          {results.length === 0 ? (
            <p className={styles.muted}>No places found for “{query}”. Check the spelling, try the bigger town nearby, or add it by hand.</p>
          ) : (
            <ul>
              {results.map((place) => {
                const added = isAdded(place);
                return (
                  <li className={styles.resultRow} key={`${place.osmId}-${place.lat}-${place.lon}`}>
                    <div className={styles.resultText}>
                      <strong>{place.name}</strong>
                      <span>
                        <em className={styles.kind}>{place.kind}</em>
                        {[place.area, place.region].filter(Boolean).join(' · ') || 'Region not detected — you will pick it'}
                      </span>
                    </div>
                    <button className={added ? styles.ghost : styles.secondary} disabled={added} onClick={() => choose(place)} type="button">
                      {added ? 'Already added' : pinTarget ? 'Use this pin' : 'Choose'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={styles.attribution}>
            Map data &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap contributors</a>
          </p>
        </div>
      )}

      {!pinTarget && !draft && (
        <button className={styles.textButton} onClick={addByHand} type="button">Can&apos;t find it? Add it by hand</button>
      )}

      {draft && (!pinTarget || draft.lat !== undefined) && (
        <div className={styles.setup} ref={setupRef}>
          <div className={styles.cardHead}>
            <span className={styles.stepBadge}>2</span>
            <div>
              <h3>{pinTarget ? 'Confirm and save' : 'Set the delivery price'}</h3>
              <p>
                {draft.lat !== undefined
                  ? <>📍 Pinned on the map{draft.regionFromMap ? ' · region detected automatically' : ''}</>
                  : 'No map pin — customers can still pick it from the list.'}
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Place name</span>
              <input className={styles.input} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} value={draft.name} />
            </label>
            <label>
              <span>Town / city it&apos;s in <small>(optional)</small></span>
              <input className={styles.input} maxLength={80} onChange={(event) => setDraft({ ...draft, area: event.target.value })} placeholder="e.g. Kumasi" value={draft.area} />
            </label>
            <label>
              <span>Region {draft.regionFromMap && <small className={styles.okSmall}>✓ from map</small>}</span>
              <select
                className={styles.input}
                onChange={(event) => setDraft({ ...draft, region: event.target.value as GhanaRegion, regionFromMap: false })}
                value={draft.region}
              >
                <option value="">Choose region</option>
                {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.priceBlock}>
            <span className={styles.label}>Delivery price</span>
            <PriceChips onChange={(fee) => setDraft({ ...draft, fee })} suggested={suggested} value={draft.fee} />
            <label className={styles.customPrice}>
              <span>Or type a price (GH₵)</span>
              <input
                className={styles.input}
                inputMode="decimal"
                max={MAX_DELIVERY_FEE}
                min="0"
                onChange={(event) => setDraft({ ...draft, fee: event.target.value })}
                placeholder="e.g. 25"
                step="0.01"
                type="number"
                value={draft.fee}
              />
            </label>
          </div>

          <label className={styles.wide}>
            <span>Note for customers <small>(optional)</small></span>
            <input
              className={styles.input}
              maxLength={160}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              placeholder="e.g. Pick up at VIP station · 1–2 days"
              value={draft.note}
            />
          </label>

          <label className={styles.checkRow}>
            <input checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} type="checkbox" />
            <span><strong>★ Popular</strong> — show it at the top of the customer&apos;s list</span>
          </label>

          {formError && <p className={styles.errorText} role="alert">{formError}</p>}

          <div className={styles.actionsRow}>
            <button className={styles.primary} disabled={saving} onClick={save} type="button">
              {saving ? 'Saving…' : pinTarget ? 'Save pin' : 'Save place'}
            </button>
            <button className={styles.ghost} disabled={saving} onClick={reset} type="button">Cancel</button>
          </div>
        </div>
      )}

      {pinTarget && draft?.lat === undefined && (
        <button className={styles.textButton} onClick={reset} type="button">Cancel pinning</button>
      )}
    </section>
  );
}

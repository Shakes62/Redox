'use client';

import { useMemo, useState } from 'react';
import { GHANA_REGIONS, type DeliveryLocation, type GhanaRegion } from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import { hasCoordinates } from '@/lib/places';
import { parseFee, PriceChips } from './DeliveryPlaceFinder';
import styles from './DeliverySettingsPanel.module.css';

type StatusFilter = 'all' | 'live' | 'hidden' | 'popular' | 'unpinned';

interface DeliveryPlacesListProps {
  locations: DeliveryLocation[];
  busyId: string | null;
  onUpdate: (location: DeliveryLocation, message: string) => Promise<boolean>;
  onReplaceAll: (locations: DeliveryLocation[], message: string, busyKey: string) => Promise<boolean>;
  onRemove: (location: DeliveryLocation) => void;
  onPin: (location: DeliveryLocation) => void;
}

interface EditDraft {
  name: string;
  area: string;
  region: GhanaRegion;
  fee: string;
  note: string;
}

export function DeliveryPlacesList({ locations, busyId, onUpdate, onReplaceAll, onRemove, onPin }: DeliveryPlacesListProps) {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState('');
  const [bulkRegion, setBulkRegion] = useState<string | null>(null);
  const [bulkFee, setBulkFee] = useState('');

  const counts = useMemo(() => ({
    all: locations.length,
    live: locations.filter((location) => location.active).length,
    hidden: locations.filter((location) => !location.active).length,
    popular: locations.filter((location) => location.featured).length,
    unpinned: locations.filter((location) => !hasCoordinates(location)).length
  }), [locations]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = locations.filter((location) => {
      if (regionFilter !== 'all' && location.region !== regionFilter) return false;
      if (status === 'live' && !location.active) return false;
      if (status === 'hidden' && location.active) return false;
      if (status === 'popular' && !location.featured) return false;
      if (status === 'unpinned' && hasCoordinates(location)) return false;
      return !query || `${location.name} ${location.area} ${location.region} ${location.note}`.toLowerCase().includes(query);
    });
    const byRegion = new Map<string, DeliveryLocation[]>();
    for (const location of filtered) {
      byRegion.set(location.region, [...(byRegion.get(location.region) || []), location]);
    }
    return [...byRegion.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, places]) => ({
        region,
        places: places.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
      }));
  }, [locations, search, regionFilter, status]);

  const usedRegions = useMemo(() => GHANA_REGIONS.filter((region) => locations.some((location) => location.region === region)), [locations]);

  const startEdit = (location: DeliveryLocation) => {
    setEditingId(location.id);
    setEdit({ name: location.name, area: location.area, region: location.region, fee: String(location.fee), note: location.note });
    setEditError('');
  };

  const saveEdit = async (location: DeliveryLocation) => {
    if (!edit) return;
    const name = edit.name.replace(/\s+/g, ' ').trim();
    const fee = parseFee(edit.fee);
    if (name.length < 2) return setEditError('Enter the place name.');
    if (fee === null) return setEditError('Enter a price from 0 to 10,000. 0 means free.');
    const ok = await onUpdate({ ...location, name, area: edit.area.trim(), region: edit.region, fee, note: edit.note.trim() }, `${name} updated.`);
    if (ok) {
      setEditingId(null);
      setEdit(null);
    }
  };

  const applyBulk = async (region: string) => {
    const fee = parseFee(bulkFee);
    if (fee === null) return;
    const inRegion = locations.filter((location) => location.region === region).length;
    if (!window.confirm(`Set the delivery price of all ${inRegion} places in ${region} to ${fee > 0 ? formatCurrency(fee) : 'Free'}?`)) return;
    const ok = await onReplaceAll(
      locations.map((location) => (location.region === region ? { ...location, fee } : location)),
      `All ${region} places now cost ${fee > 0 ? formatCurrency(fee) : 'nothing (free delivery)'}.`,
      `bulk-${region}`
    );
    if (ok) {
      setBulkRegion(null);
      setBulkFee('');
    }
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live' },
    { key: 'hidden', label: 'Hidden' },
    { key: 'popular', label: '★ Popular' },
    { key: 'unpinned', label: 'No map pin' }
  ];

  return (
    <section aria-labelledby="places-list-title" className={styles.panel}>
      <div className={styles.cardHead}>
        <span className={styles.stepBadge}>2</span>
        <div>
          <h3 id="places-list-title">Your delivery places</h3>
          <p>Grouped by region. Tap ★ to mark a place popular, use the switch to hide it from checkout, or set one price for a whole region.</p>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className={styles.empty}>
          No places yet. Add your first one above. Until then, checkout works as before: customers choose their region and get the station delivery options.
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <input
              aria-label="Filter your places"
              className={styles.input}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by name, area or note"
              type="search"
              value={search}
            />
            <select aria-label="Region" className={styles.input} onChange={(event) => setRegionFilter(event.target.value)} value={regionFilter}>
              <option value="all">All regions</option>
              {usedRegions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          <div className={styles.filterChips} role="group" aria-label="Show">
            {filters.map((filter) => (
              <button
                aria-pressed={status === filter.key}
                className={`${styles.chip} ${status === filter.key ? styles.chipOn : ''}`}
                key={filter.key}
                onClick={() => setStatus(filter.key)}
                type="button"
              >
                {filter.label} <span className={styles.chipCount}>{counts[filter.key]}</span>
              </button>
            ))}
          </div>

          {groups.length === 0 && <div className={styles.empty}>Nothing matches these filters.</div>}

          {groups.map(({ region, places }) => {
            const prices = places.map((place) => place.fee);
            const low = Math.min(...prices);
            const high = Math.max(...prices);
            return (
              <div className={styles.group} key={region}>
                <div className={styles.groupHead}>
                  <div>
                    <strong>{region}</strong>
                    <span>
                      {places.length} {places.length === 1 ? 'place' : 'places'} ·{' '}
                      {low === high ? (low > 0 ? formatCurrency(low) : 'Free') : `${low > 0 ? formatCurrency(low) : 'Free'} – ${formatCurrency(high)}`}
                    </span>
                  </div>
                  {bulkRegion === region ? (
                    <div className={styles.bulkForm}>
                      <input
                        aria-label={`One price for all ${region} places`}
                        autoFocus
                        className={styles.input}
                        inputMode="decimal"
                        min="0"
                        onChange={(event) => setBulkFee(event.target.value)}
                        placeholder="GH₵"
                        type="number"
                        value={bulkFee}
                      />
                      <button className={styles.primary} disabled={parseFee(bulkFee) === null || busyId === `bulk-${region}`} onClick={() => applyBulk(region)} type="button">Apply</button>
                      <button className={styles.ghost} onClick={() => setBulkRegion(null)} type="button">Cancel</button>
                    </div>
                  ) : (
                    <button className={styles.ghost} onClick={() => { setBulkRegion(region); setBulkFee(''); }} type="button">Set one price for all</button>
                  )}
                </div>

                <ul className={styles.locationList}>
                  {places.map((location) => {
                    const busy = busyId === location.id;
                    const pinned = hasCoordinates(location);

                    if (editingId === location.id && edit) {
                      return (
                        <li className={`${styles.locationRow} ${styles.editing}`} key={location.id}>
                          <div className={styles.formGrid}>
                            <label><span>Place name</span><input className={styles.input} maxLength={80} onChange={(event) => setEdit({ ...edit, name: event.target.value })} value={edit.name} /></label>
                            <label><span>Town / city it&apos;s in</span><input className={styles.input} maxLength={80} onChange={(event) => setEdit({ ...edit, area: event.target.value })} value={edit.area} /></label>
                            <label>
                              <span>Region</span>
                              <select className={styles.input} onChange={(event) => setEdit({ ...edit, region: event.target.value as GhanaRegion })} value={edit.region}>
                                {GHANA_REGIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                              </select>
                            </label>
                          </div>
                          <div className={styles.priceBlock}>
                            <span className={styles.label}>Delivery price</span>
                            <PriceChips onChange={(fee) => setEdit({ ...edit, fee })} value={edit.fee} />
                            <label className={styles.customPrice}>
                              <span>Or type a price (GH₵)</span>
                              <input className={styles.input} inputMode="decimal" min="0" onChange={(event) => setEdit({ ...edit, fee: event.target.value })} step="0.01" type="number" value={edit.fee} />
                            </label>
                          </div>
                          <label className={styles.wide}>
                            <span>Note for customers</span>
                            <input className={styles.input} maxLength={160} onChange={(event) => setEdit({ ...edit, note: event.target.value })} value={edit.note} />
                          </label>
                          {editError && <p className={styles.errorText}>{editError}</p>}
                          <div className={styles.actionsRow}>
                            <button className={styles.primary} disabled={busy} onClick={() => saveEdit(location)} type="button">{busy ? 'Saving…' : 'Save changes'}</button>
                            <button className={styles.ghost} disabled={busy} onClick={() => setEditingId(null)} type="button">Cancel</button>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li className={`${styles.locationRow} ${location.active ? '' : styles.paused}`} key={location.id}>
                        <button
                          aria-label={location.featured ? `Remove ${location.name} from popular` : `Mark ${location.name} as popular`}
                          aria-pressed={location.featured}
                          className={`${styles.star} ${location.featured ? styles.starOn : ''}`}
                          disabled={busy}
                          onClick={() => onUpdate({ ...location, featured: !location.featured }, location.featured ? `${location.name} is no longer marked popular.` : `${location.name} now shows at the top for customers.`)}
                          title={location.featured ? 'Popular — shown first to customers' : 'Mark as popular'}
                          type="button"
                        >
                          ★
                        </button>
                        <div className={styles.locationInfo}>
                          <strong>{location.name}{location.area && <span className={styles.areaText}> · {location.area}</span>}</strong>
                          <span>
                            {pinned ? (
                              <span className={styles.pinOk}>📍 On map</span>
                            ) : (
                              <button className={styles.pinMissing} onClick={() => onPin(location)} type="button">No map pin · Pin it</button>
                            )}
                            {location.note && <> · {location.note}</>}
                          </span>
                        </div>
                        <span className={`${styles.price} ${location.fee === 0 ? styles.freePrice : ''}`}>
                          {location.fee > 0 ? formatCurrency(location.fee) : 'Free'}
                        </span>
                        <div className={styles.rowActions}>
                          <button
                            aria-pressed={location.active}
                            className={`${styles.switch} ${location.active ? styles.switchOn : ''}`}
                            disabled={busy}
                            onClick={() => onUpdate({ ...location, active: !location.active }, location.active ? `${location.name} is hidden from checkout.` : `${location.name} is available at checkout again.`)}
                            title={location.active ? 'Shown at checkout — tap to hide' : 'Hidden — tap to show at checkout'}
                            type="button"
                          >
                            <span className={styles.switchKnob} />
                            <span className={styles.switchLabel}>{location.active ? 'Live' : 'Hidden'}</span>
                          </button>
                          <button className={styles.ghost} disabled={busy || editingId !== null} onClick={() => startEdit(location)} type="button">Edit</button>
                          <button className={styles.danger} disabled={busy} onClick={() => onRemove(location)} type="button">Delete</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

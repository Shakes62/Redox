'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  DEFAULT_DELIVERY_SETTINGS,
  FREE_STATION_DELIVERY_DETAILS,
  FREE_STATION_DELIVERY_LABEL,
  GHANA_REGIONS,
  makeLocationId,
  MAX_DELIVERY_FEE,
  MAX_DELIVERY_LOCATIONS,
  URGENT_STATION_DELIVERY_LABEL,
  type DeliveryLocation,
  type DeliverySettings,
  type GhanaRegion
} from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import styles from './DeliverySettingsPanel.module.css';

const STATION_REGIONS = GHANA_REGIONS.filter((region) => region !== 'Greater Accra');

interface LocationDraft {
  name: string;
  region: GhanaRegion | '';
  fee: string;
  note: string;
}

const EMPTY_DRAFT: LocationDraft = { name: '', region: '', fee: '', note: '' };

function parseFee(value: string): number | null {
  if (value.trim() === '') return null;
  const fee = Number(value);
  if (!Number.isFinite(fee) || fee < 0 || fee > MAX_DELIVERY_FEE) return null;
  return Math.round(fee * 100) / 100;
}

function draftProblem(draft: LocationDraft): string {
  if (draft.name.trim().length < 2) return 'Enter the town or city name.';
  if (!draft.region) return 'Choose the region.';
  if (parseFee(draft.fee) === null) return 'Enter a delivery price from 0 to 10,000. Use 0 for free delivery.';
  return '';
}

export function DeliverySettingsPanel() {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Locations
  const [draft, setDraft] = useState<LocationDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LocationDraft>(EMPTY_DRAFT);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Station delivery
  const [feeInput, setFeeInput] = useState('');
  const [stationRegions, setStationRegions] = useState<string[]>([]);
  const [savingStation, setSavingStation] = useState(false);
  const [stationMessage, setStationMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/delivery-settings', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load delivery settings.');
        return response.json() as Promise<DeliverySettings>;
      })
      .then((saved) => {
        if (cancelled) return;
        setSettings(saved);
        setFeeInput(String(saved.urgentFee));
        setStationRegions(saved.eligibleRegions);
      })
      .catch((error: Error) => { if (!cancelled) setLoadError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** Sends the whole settings document. Returns the saved copy, or null on failure. */
  const persist = async (next: DeliverySettings): Promise<DeliverySettings | null> => {
    const response = await fetch('/api/admin/delivery-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (!response?.ok || !data) {
      throw new Error(data?.error || 'Could not save. Check your connection and try again.');
    }
    setSettings(data);
    return data;
  };

  const saveLocations = async (locations: DeliveryLocation[], success: string, busy: string) => {
    setBusyId(busy);
    setLocationMessage(null);
    try {
      await persist({ ...settings, locations });
      setLocationMessage({ tone: 'ok', text: success });
      return true;
    } catch (error) {
      setLocationMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save.' });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const addLocation = async (event: FormEvent) => {
    event.preventDefault();
    const problem = draftProblem(draft);
    if (problem) {
      setLocationMessage({ tone: 'error', text: problem });
      return;
    }
    const name = draft.name.trim().replace(/\s+/g, ' ');
    const region = draft.region as GhanaRegion;
    if (settings.locations.some((location) => location.name.toLowerCase() === name.toLowerCase() && location.region === region)) {
      setLocationMessage({ tone: 'error', text: `${name} (${region}) is already on the list. Edit its price below instead.` });
      return;
    }
    if (settings.locations.length >= MAX_DELIVERY_LOCATIONS) {
      setLocationMessage({ tone: 'error', text: `You can list up to ${MAX_DELIVERY_LOCATIONS} locations.` });
      return;
    }
    let id = makeLocationId(name, region);
    for (let n = 2; settings.locations.some((location) => location.id === id); n += 1) id = `${makeLocationId(name, region)}-${n}`;
    const fee = parseFee(draft.fee)!;
    const added = await saveLocations(
      [...settings.locations, { id, name, region, fee, note: draft.note.trim(), active: true }],
      `${name} added at ${fee > 0 ? formatCurrency(fee) : 'free delivery'}. Customers can choose it now.`,
      'new'
    );
    if (added) setDraft((current) => ({ ...EMPTY_DRAFT, region: current.region }));
  };

  const startEdit = (location: DeliveryLocation) => {
    setEditingId(location.id);
    setEditDraft({ name: location.name, region: location.region, fee: String(location.fee), note: location.note });
    setLocationMessage(null);
  };

  const saveEdit = async (id: string) => {
    const problem = draftProblem(editDraft);
    if (problem) {
      setLocationMessage({ tone: 'error', text: problem });
      return;
    }
    const name = editDraft.name.trim().replace(/\s+/g, ' ');
    const saved = await saveLocations(
      settings.locations.map((location) => location.id === id
        ? { ...location, name, region: editDraft.region as GhanaRegion, fee: parseFee(editDraft.fee)!, note: editDraft.note.trim() }
        : location),
      `${name} updated.`,
      id
    );
    if (saved) setEditingId(null);
  };

  const toggleActive = (location: DeliveryLocation) => saveLocations(
    settings.locations.map((candidate) => candidate.id === location.id ? { ...candidate, active: !candidate.active } : candidate),
    location.active ? `${location.name} is hidden from checkout.` : `${location.name} is available at checkout again.`,
    location.id
  );

  const removeLocation = (location: DeliveryLocation) => {
    if (!window.confirm(`Remove ${location.name} (${location.region}) from delivery locations?`)) return;
    void saveLocations(
      settings.locations.filter((candidate) => candidate.id !== location.id),
      `${location.name} removed.`,
      location.id
    );
  };

  const visibleLocations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...settings.locations]
      .sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name))
      .filter((location) => !query || `${location.name} ${location.region}`.toLowerCase().includes(query));
  }, [settings.locations, search]);

  const saveStation = async () => {
    const fee = Number(feeInput);
    if (feeInput.trim() === '' || !Number.isFinite(fee) || fee < 0 || fee > MAX_DELIVERY_FEE || Math.abs(Math.round(fee * 100) - fee * 100) > 1e-6) {
      setStationMessage('Enter a valid urgent fee with up to two decimal places.');
      return;
    }
    setSavingStation(true);
    setStationMessage('');
    try {
      const saved = await persist({ ...settings, eligibleRegions: stationRegions, urgentFee: fee });
      if (saved) {
        setFeeInput(String(saved.urgentFee));
        setStationRegions(saved.eligibleRegions);
      }
      setStationMessage('Delivery options saved. Customers will see them at checkout.');
    } catch (error) {
      setStationMessage(error instanceof Error ? error.message : 'Could not save delivery settings.');
    } finally {
      setSavingStation(false);
    }
  };

  if (loading) {
    return <section className={styles.panel}><p>Loading delivery settings…</p></section>;
  }

  if (loadError) {
    return (
      <section className={styles.panel} role="alert">
        <p>{loadError}</p>
        <button className={styles.primary} onClick={() => window.location.reload()} type="button">Retry loading</button>
      </section>
    );
  }

  const activeCount = settings.locations.filter((location) => location.active).length;

  return (
    <div className={styles.wrap}>
      {/* ── Delivery locations ───────────────────────────── */}
      <section aria-labelledby="delivery-locations-title" className={styles.panel}>
        <div className={styles.headRow}>
          <div>
            <h2 id="delivery-locations-title">Delivery locations</h2>
            <p>Add the towns and cities you deliver to and set the delivery price for each. Customers pick their town at checkout and the price is added to their total.</p>
          </div>
          <span className={styles.countPill}>{activeCount} live</span>
        </div>

        <form className={styles.addForm} onSubmit={addLocation}>
          <label>
            <span>Town / city</span>
            <input
              maxLength={80}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="e.g. Kumasi"
              value={draft.name}
            />
          </label>
          <label>
            <span>Region</span>
            <select onChange={(event) => setDraft({ ...draft, region: event.target.value as GhanaRegion })} value={draft.region}>
              <option value="">Choose region</option>
              {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </label>
          <label>
            <span>Price (GH₵)</span>
            <input
              inputMode="decimal"
              max={MAX_DELIVERY_FEE}
              min="0"
              onChange={(event) => setDraft({ ...draft, fee: event.target.value })}
              placeholder="0 = free"
              step="0.01"
              type="number"
              value={draft.fee}
            />
          </label>
          <label className={styles.noteField}>
            <span>Note for customers (optional)</span>
            <input
              maxLength={160}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              placeholder="e.g. Pick up at VIP station, 1–2 days"
              value={draft.note}
            />
          </label>
          <button className={styles.primary} disabled={busyId === 'new'} type="submit">
            {busyId === 'new' ? 'Adding…' : 'Add location'}
          </button>
        </form>

        {locationMessage && (
          <p className={locationMessage.tone === 'ok' ? styles.ok : styles.errorText} role="status">{locationMessage.text}</p>
        )}

        {settings.locations.length === 0 ? (
          <div className={styles.empty}>
            No locations yet. Until you add some, checkout keeps working as before: customers choose their region and get the station delivery options below.
          </div>
        ) : (
          <>
            {settings.locations.length > 8 && (
              <input
                aria-label="Search locations"
                className={styles.search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search locations"
                type="search"
                value={search}
              />
            )}
            <ul className={styles.locationList}>
              {visibleLocations.map((location) => {
                const busy = busyId === location.id;
                if (editingId === location.id) {
                  return (
                    <li className={`${styles.locationRow} ${styles.editing}`} key={location.id}>
                      <div className={styles.editGrid}>
                        <label><span>Town / city</span><input maxLength={80} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} value={editDraft.name} /></label>
                        <label>
                          <span>Region</span>
                          <select onChange={(event) => setEditDraft({ ...editDraft, region: event.target.value as GhanaRegion })} value={editDraft.region}>
                            {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                          </select>
                        </label>
                        <label><span>Price (GH₵)</span><input inputMode="decimal" min="0" onChange={(event) => setEditDraft({ ...editDraft, fee: event.target.value })} step="0.01" type="number" value={editDraft.fee} /></label>
                        <label className={styles.noteField}><span>Note for customers</span><input maxLength={160} onChange={(event) => setEditDraft({ ...editDraft, note: event.target.value })} value={editDraft.note} /></label>
                      </div>
                      <div className={styles.rowActions}>
                        <button className={styles.primary} disabled={busy} onClick={() => saveEdit(location.id)} type="button">{busy ? 'Saving…' : 'Save'}</button>
                        <button className={styles.ghost} disabled={busy} onClick={() => setEditingId(null)} type="button">Cancel</button>
                      </div>
                    </li>
                  );
                }
                return (
                  <li className={`${styles.locationRow} ${location.active ? '' : styles.paused}`} key={location.id}>
                    <div className={styles.locationInfo}>
                      <strong>{location.name}</strong>
                      <span>{location.region}{location.note ? ` · ${location.note}` : ''}</span>
                    </div>
                    <span className={`${styles.price} ${location.fee === 0 ? styles.freePrice : ''}`}>
                      {location.fee > 0 ? formatCurrency(location.fee) : 'Free'}
                    </span>
                    <div className={styles.rowActions}>
                      <button
                        aria-pressed={location.active}
                        className={`${styles.switch} ${location.active ? styles.switchOn : ''}`}
                        disabled={busy}
                        onClick={() => toggleActive(location)}
                        title={location.active ? 'Shown at checkout — click to hide' : 'Hidden — click to show at checkout'}
                        type="button"
                      >
                        <span className={styles.switchKnob} />
                        <span className={styles.switchLabel}>{location.active ? 'Live' : 'Hidden'}</span>
                      </button>
                      <button className={styles.ghost} disabled={busy || editingId !== null} onClick={() => startEdit(location)} type="button">Edit</button>
                      <button className={styles.danger} disabled={busy} onClick={() => removeLocation(location)} type="button">Delete</button>
                    </div>
                  </li>
                );
              })}
              {visibleLocations.length === 0 && <li className={styles.empty}>No location matches &ldquo;{search}&rdquo;.</li>}
            </ul>
          </>
        )}
      </section>

      {/* ── Station delivery (existing options) ──────────── */}
      <section aria-labelledby="delivery-settings-title" className={styles.panel}>
        <h2 id="delivery-settings-title">Station delivery options</h2>
        <p>
          Used for regions customers choose when their town is not on your list
          {settings.locations.length === 0 ? ' (all orders, until you add locations)' : ''}, and for urgent delivery. Greater Accra is always excluded.
        </p>
        <div className={styles.info}>{FREE_STATION_DELIVERY_LABEL}: no delivery fee. {FREE_STATION_DELIVERY_DETAILS}</div>
        <label className={styles.feeLabel} htmlFor="urgent-delivery-fee">{URGENT_STATION_DELIVERY_LABEL} extra fee (GH₵)</label>
        <input
          className={styles.feeInput}
          id="urgent-delivery-fee"
          max={MAX_DELIVERY_FEE}
          min="0"
          onChange={(event) => { setFeeInput(event.target.value); setStationMessage(''); }}
          step="0.01"
          type="number"
          value={feeInput}
        />
        <p className={styles.helper}>
          {Number(feeInput) > 0
            ? `Customers choosing ${URGENT_STATION_DELIVERY_LABEL} pay ${formatCurrency(Number(feeInput))} extra (on top of a location's price).`
            : `Set an amount above zero to offer ${URGENT_STATION_DELIVERY_LABEL}.`}
        </p>
        <div className={styles.regionHeader}>
          <h3>Regions with these options</h3>
          <div>
            <button onClick={() => setStationRegions([...STATION_REGIONS])} type="button">Select all</button>
            <button onClick={() => setStationRegions([])} type="button">Clear</button>
          </div>
        </div>
        <div className={styles.regions}>
          {STATION_REGIONS.map((region) => (
            <label key={region}>
              <input
                checked={stationRegions.includes(region)}
                onChange={() => {
                  setStationRegions((current) => current.includes(region) ? current.filter((item) => item !== region) : [...current, region]);
                  setStationMessage('');
                }}
                type="checkbox"
              />
              {region}
            </label>
          ))}
        </div>
        {stationMessage && <p className={styles.message} role="status">{stationMessage}</p>}
        <button className={styles.primary} disabled={savingStation} onClick={saveStation} type="button">
          {savingStation ? 'Saving…' : 'Save delivery options'}
        </button>
      </section>
    </div>
  );
}

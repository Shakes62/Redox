'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DELIVERY_SETTINGS,
  FREE_STATION_DELIVERY_DETAILS,
  FREE_STATION_DELIVERY_LABEL,
  GHANA_REGIONS,
  locationLabel,
  MAX_DELIVERY_FEE,
  URGENT_STATION_DELIVERY_LABEL,
  type DeliveryLocation,
  type DeliverySettings
} from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import { hasCoordinates } from '@/lib/places';
import { DeliveryPlaceFinder } from './DeliveryPlaceFinder';
import { DeliveryPlacesList } from './DeliveryPlacesList';
import styles from './DeliverySettingsPanel.module.css';

const STATION_REGIONS = GHANA_REGIONS.filter((region) => region !== 'Greater Accra');

type Section = 'places' | 'checkout' | 'station';

export function DeliverySettingsPanel() {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [section, setSection] = useState<Section>('places');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pinTarget, setPinTarget] = useState<DeliveryLocation | null>(null);
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // Station delivery form
  const [feeInput, setFeeInput] = useState('');
  const [stationRegions, setStationRegions] = useState<string[]>([]);
  const [savingStation, setSavingStation] = useState(false);

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
    return () => {
      cancelled = true;
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (tone: 'ok' | 'error', text: string) => {
    setToast({ tone, text });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), tone === 'ok' ? 4500 : 8000);
  };

  /** Saves the whole settings document; every admin action goes through here. */
  const persist = async (next: DeliverySettings, message: string, busyKey: string): Promise<boolean> => {
    setBusyId(busyKey);
    try {
      const response = await fetch('/api/admin/delivery-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (!response?.ok || !data) throw new Error(data?.error || 'Could not save. Check your connection and try again.');
      setSettings(data);
      notify('ok', message);
      return true;
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not save.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const replaceLocations = (locations: DeliveryLocation[], message: string, busyKey: string) =>
    persist({ ...settings, locations }, message, busyKey);

  /** Adds a new place, or replaces the one with the same id. */
  const upsertLocation = (location: DeliveryLocation, message: string) => {
    const exists = settings.locations.some((candidate) => candidate.id === location.id);
    const next = exists
      ? settings.locations.map((candidate) => (candidate.id === location.id ? location : candidate))
      : [...settings.locations, location];
    return replaceLocations(next, message, location.id).then((ok) => {
      if (ok && pinTarget?.id === location.id) setPinTarget(null);
      return ok;
    });
  };

  const removeLocation = (location: DeliveryLocation) => {
    if (!window.confirm(`Remove ${locationLabel(location)} from your delivery places?`)) return;
    void replaceLocations(settings.locations.filter((candidate) => candidate.id !== location.id), `${location.name} removed.`, location.id);
  };

  const saveStation = async () => {
    const fee = Number(feeInput);
    if (feeInput.trim() === '' || !Number.isFinite(fee) || fee < 0 || fee > MAX_DELIVERY_FEE || Math.abs(Math.round(fee * 100) - fee * 100) > 1e-6) {
      notify('error', 'Enter a valid urgent fee with up to two decimal places.');
      return;
    }
    setSavingStation(true);
    const ok = await persist({ ...settings, eligibleRegions: stationRegions, urgentFee: fee }, 'Station delivery options saved.', 'station');
    setSavingStation(false);
    if (ok) setFeeInput(String(fee));
  };

  if (loading) {
    return <section className={styles.panel}><p className={styles.muted}>Loading delivery settings…</p></section>;
  }

  if (loadError) {
    return (
      <section className={styles.panel} role="alert">
        <p>{loadError}</p>
        <button className={styles.primary} onClick={() => window.location.reload()} type="button">Retry loading</button>
      </section>
    );
  }

  const live = settings.locations.filter((location) => location.active);
  const regionsCovered = new Set(live.map((location) => location.region)).size;
  const unpinned = settings.locations.filter((location) => !hasCoordinates(location)).length;
  const fees = live.map((location) => location.fee);

  const sections: { key: Section; label: string }[] = [
    { key: 'places', label: `Delivery places (${settings.locations.length})` },
    { key: 'checkout', label: 'Checkout options' },
    { key: 'station', label: 'Station delivery' }
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <div><strong>{live.length}</strong><span>places live</span></div>
        <div><strong>{regionsCovered}</strong><span>{regionsCovered === 1 ? 'region' : 'regions'} covered</span></div>
        <div>
          <strong>{fees.length ? (Math.min(...fees) === Math.max(...fees) ? (fees[0] > 0 ? formatCurrency(fees[0]) : 'Free') : `${Math.min(...fees) > 0 ? formatCurrency(Math.min(...fees)) : 'Free'}–${formatCurrency(Math.max(...fees))}`) : '—'}</strong>
          <span>delivery prices</span>
        </div>
        <div className={unpinned > 0 ? styles.summaryWarn : ''}>
          <strong>{unpinned}</strong>
          <span>{unpinned === 1 ? 'place needs' : 'places need'} a map pin</span>
        </div>
      </div>

      <nav aria-label="Delivery settings" className={styles.subTabs}>
        {sections.map((item) => (
          <button
            aria-pressed={section === item.key}
            className={`${styles.subTab} ${section === item.key ? styles.subTabOn : ''}`}
            key={item.key}
            onClick={() => setSection(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {toast && (
        <p className={toast.tone === 'ok' ? styles.toastOk : styles.toastError} role="status">
          {toast.tone === 'ok' ? '✓ ' : ''}{toast.text}
        </p>
      )}

      {section === 'places' && (
        <>
          <DeliveryPlaceFinder
            locations={settings.locations}
            onCancelPin={() => setPinTarget(null)}
            onSave={upsertLocation}
            pinTarget={pinTarget}
          />
          <DeliveryPlacesList
            busyId={busyId}
            locations={settings.locations}
            onPin={(location) => setPinTarget(location)}
            onRemove={removeLocation}
            onReplaceAll={replaceLocations}
            onUpdate={upsertLocation}
          />
        </>
      )}

      {section === 'checkout' && (
        <section aria-labelledby="checkout-options-title" className={styles.panel}>
          <div className={styles.cardHead}>
            <div>
              <h3 id="checkout-options-title">What customers can do at checkout</h3>
              <p>Changes apply immediately to every customer.</p>
            </div>
          </div>

          <div className={styles.optionCard}>
            <div>
              <strong>📍 “Find the closest place to me”</strong>
              <p>
                Customers tap once and their phone suggests your nearest delivery places, with the distance and price.
                Their location stays on their phone. Only places with a map pin can be suggested
                {unpinned > 0 ? ` — ${unpinned} of yours ${unpinned === 1 ? 'has' : 'have'} no pin yet.` : '.'}
              </p>
            </div>
            <button
              aria-pressed={settings.useLocation}
              className={`${styles.switch} ${settings.useLocation ? styles.switchOn : ''}`}
              disabled={busyId === 'use-location'}
              onClick={() => persist({ ...settings, useLocation: !settings.useLocation }, settings.useLocation ? 'Customers will no longer be offered location suggestions.' : 'Customers can now find their closest place.', 'use-location')}
              type="button"
            >
              <span className={styles.switchKnob} />
              <span className={styles.switchLabel}>{settings.useLocation ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className={styles.optionCard}>
            <div>
              <strong>“My town isn’t listed”</strong>
              <p>
                Lets customers outside your list still order: they choose their region and get the station delivery
                rules (free station delivery, or a call from your team). Turn it off to accept orders only for your listed places.
              </p>
            </div>
            <button
              aria-pressed={settings.allowUnlisted}
              className={`${styles.switch} ${settings.allowUnlisted ? styles.switchOn : ''}`}
              disabled={busyId === 'allow-unlisted'}
              onClick={() => {
                if (settings.allowUnlisted && live.length === 0 && !window.confirm('You have no live places yet. If you turn this off, customers cannot choose any delivery place. Continue?')) return;
                void persist({ ...settings, allowUnlisted: !settings.allowUnlisted }, settings.allowUnlisted ? 'Only your listed places can be chosen now.' : 'Customers in other towns can order again.', 'allow-unlisted');
              }}
              type="button"
            >
              <span className={styles.switchKnob} />
              <span className={styles.switchLabel}>{settings.allowUnlisted ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className={styles.previewBox}>
            <span className={styles.label}>What customers see on the delivery step</span>
            <ol>
              {settings.useLocation && live.some(hasCoordinates) && <li>📍 Find the closest place to me</li>}
              <li>Search or pick from {live.length} {live.length === 1 ? 'place' : 'places'}{settings.locations.some((location) => location.featured && location.active) ? ' (★ popular ones first)' : ''}</li>
              {settings.allowUnlisted && <li>My town isn’t listed → choose region</li>}
            </ol>
          </div>
        </section>
      )}

      {section === 'station' && (
        <section aria-labelledby="delivery-settings-title" className={styles.panel}>
          <div className={styles.cardHead}>
            <div>
              <h3 id="delivery-settings-title">Station delivery options</h3>
              <p>
                For customers whose town is not listed{settings.locations.length === 0 ? ' (everyone, until you add places)' : ''}, and the
                urgent option on top of a place&apos;s price. Greater Accra is always excluded.
              </p>
            </div>
          </div>
          <div className={styles.info}>{FREE_STATION_DELIVERY_LABEL}: no delivery fee. {FREE_STATION_DELIVERY_DETAILS}</div>
          <label className={styles.label} htmlFor="urgent-delivery-fee">{URGENT_STATION_DELIVERY_LABEL} — extra fee (GH₵)</label>
          <input
            className={`${styles.input} ${styles.feeInput}`}
            id="urgent-delivery-fee"
            max={MAX_DELIVERY_FEE}
            min="0"
            onChange={(event) => setFeeInput(event.target.value)}
            step="0.01"
            type="number"
            value={feeInput}
          />
          <p className={styles.helper}>
            {Number(feeInput) > 0
              ? `Customers choosing ${URGENT_STATION_DELIVERY_LABEL} pay ${formatCurrency(Number(feeInput))} extra (on top of a place's price).`
              : `Set an amount above zero to offer ${URGENT_STATION_DELIVERY_LABEL}.`}
          </p>
          <div className={styles.regionHeader}>
            <span className={styles.label}>Regions with these options</span>
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
                  onChange={() => setStationRegions((current) => current.includes(region) ? current.filter((item) => item !== region) : [...current, region])}
                  type="checkbox"
                />
                {region}
              </label>
            ))}
          </div>
          <button className={styles.primary} disabled={savingStation} onClick={saveStation} type="button">
            {savingStation ? 'Saving…' : 'Save station options'}
          </button>
        </section>
      )}
    </div>
  );
}

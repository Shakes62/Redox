'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckIcon, ChevronLeftIcon, LockIcon } from '@/components/ui/Icons';
import { DeliveryPicker } from '@/components/cart/DeliveryPicker';
import {
  confirmPayment,
  forgetPendingCheckout,
  reportCheckoutClosed,
  runPaystackCheckout,
  startCheckout,
  type CheckoutCustomer,
  type CheckoutSession
} from '@/lib/checkout-client';
import {
  activeLocations,
  describeDelivery,
  GHANA_REGIONS,
  locationLabel,
  quoteCheckoutDelivery
} from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';
import type { CustomerReceipt } from '@/lib/order-receipt';
import { formatGhanaPhone, isValidGhanaPhone } from '@/lib/phone';
import { useDeliverySettings } from '@/lib/use-delivery-settings';
import { effectiveUnitPrice } from '@/lib/wholesale';
import { getCartTotals, type CartItem } from '@/store/cart.store';
import styles from './CartDrawer.module.css';

const STEPS = ['Details', 'Delivery', 'Pay'] as const;
const SAVED_DETAILS_KEY = 'redox_checkout_details';

interface Details {
  fullName: string;
  phone: string;
  email: string;
}

interface DeliveryForm {
  locationId: string;
  /** The customer's town is not on the merchant's list. */
  unlisted: boolean;
  region: string;
  address: string;
  speed: 'standard' | 'urgent';
}

type Errors = Partial<Record<keyof Details | 'location' | 'region' | 'address', string>>;

interface CheckoutFlowProps {
  items: CartItem[];
  /** Buy-now orders leave the customer's bag alone. */
  fromCart: boolean;
  /** Leaves checkout from the first step. */
  onExit: () => void;
  exitLabel: string;
  onSuccess: (receipt: CustomerReceipt) => void;
  onPending: (pending: { orderNumber: string; reference: string }) => void;
}

/** Returning customers should not have to type everything again. */
function readSaved(): { details: Details; delivery: DeliveryForm } {
  const blank = {
    details: { fullName: '', phone: '', email: '' },
    delivery: { locationId: '', unlisted: false, region: '', address: '', speed: 'standard' as const }
  };
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_DETAILS_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return blank;
    const text = (value: unknown) => (typeof value === 'string' ? value.slice(0, 300) : '');
    return {
      details: { fullName: text(saved.fullName), phone: text(saved.phone), email: text(saved.email) },
      delivery: {
        ...blank.delivery,
        locationId: text(saved.locationId),
        unlisted: saved.unlisted === true,
        region: (GHANA_REGIONS as readonly string[]).includes(saved.region) ? saved.region : '',
        address: text(saved.address)
      }
    };
  } catch {
    return blank;
  }
}

function saveDetails(details: Details, delivery: DeliveryForm) {
  try {
    localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify({ ...details, ...delivery, speed: undefined }));
  } catch {
    /* Saving is a convenience only. */
  }
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (isValidGhanaPhone(formatGhanaPhone(value))) return true;
  // International numbers are fine too, written with their + prefix.
  return value.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function CheckoutFlow({ items, fromCart, onExit, exitLabel, onSuccess, onPending }: CheckoutFlowProps) {
  const [initial] = useState(readSaved);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [details, setDetails] = useState<Details>(initial.details);
  const [delivery, setDelivery] = useState<DeliveryForm>(initial.delivery);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [paying, setPaying] = useState(false);
  const [stage, setStage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const { settings, loading: deliveryLoading } = useDeliverySettings();
  const locations = useMemo(() => activeLocations(settings), [settings]);
  const hasLocations = locations.length > 0;
  const regionMode = !hasLocations || (delivery.unlisted && settings.allowUnlisted);
  const location = !regionMode ? locations.find((candidate) => candidate.id === delivery.locationId) : undefined;
  const placeRegion = regionMode ? delivery.region : location?.region || '';

  const quote = useMemo(
    () => quoteCheckoutDelivery(
      { locationId: regionMode ? undefined : location?.id, region: delivery.region, requested: delivery.speed },
      settings
    ),
    [regionMode, location?.id, delivery.region, delivery.speed, settings]
  );
  const placeChosen = regionMode ? Boolean(delivery.region) : Boolean(location);
  const deliveryFee = placeChosen && !quote.error ? quote.fee : 0;

  const { totalItems, subtotal, serviceCharge, orderTotal, quantityByProductSlug } = getCartTotals(items);
  const total = Math.round((orderTotal + deliveryFee) * 100) / 100;

  // A saved town the merchant has since removed must not stay selected.
  useEffect(() => {
    if (deliveryLoading || !delivery.locationId) return;
    if (!locations.some((candidate) => candidate.id === delivery.locationId)) {
      setDelivery((current) => ({ ...current, locationId: '' }));
    }
  }, [deliveryLoading, locations, delivery.locationId]);

  // Each step starts at the top, and screen readers hear its title.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const updateDetails = (key: keyof Details, value: string) => {
    setDetails((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateDelivery = (patch: Partial<DeliveryForm>) => {
    setDelivery((current) => ({ ...current, ...patch }));
    setServerError('');
    setErrors((current) => ({ ...current, location: undefined, region: undefined, ...(patch.address !== undefined ? { address: undefined } : {}) }));
  };

  const validateDetails = (): Errors => {
    const next: Errors = {};
    if (details.fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (!isValidPhone(details.phone)) next.phone = 'Enter a valid phone number, e.g. 024 123 4567.';
    if (!EMAIL_PATTERN.test(details.email.trim())) next.email = 'Enter a valid email, e.g. you@gmail.com.';
    return next;
  };

  const validateDelivery = (): Errors => {
    const next: Errors = {};
    if (regionMode && !delivery.region) next.region = 'Choose your region.';
    if (!regionMode && !location) next.location = 'Choose your town or city.';
    if (delivery.address.trim().length < 5) next.address = 'Add a little more detail (at least 5 characters).';
    return next;
  };

  const goTo = (target: number) => {
    setDirection(target > step ? 'forward' : 'back');
    setServerError('');
    setStep(target);
  };

  const next = () => {
    const found = step === 0 ? validateDetails() : validateDelivery();
    if (step === 1 && quote.error && placeChosen) {
      setServerError(quote.error);
      return;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Take the customer straight to the first thing that needs fixing.
      const firstKey = Object.keys(found)[0];
      window.requestAnimationFrame(() => {
        scrollRef.current?.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus();
      });
      return;
    }
    saveDetails(details, delivery);
    goTo(step + 1);
  };

  const back = () => {
    if (paying) return;
    if (step === 0) onExit();
    else goTo(step - 1);
  };

  const finishPayment = async (session: CheckoutSession, reference: string) => {
    setStage('Confirming your payment…');
    const result = await confirmPayment(reference, (attempt) => {
      if (attempt > 2) setStage(`Still confirming with Paystack… (${attempt})`);
    });
    setPaying(false);
    setStage('');

    if (result.paid && result.order) {
      forgetPendingCheckout();
      onSuccess(result.order);
      return;
    }
    if (result.outcome === 'failed' || result.outcome === 'abandoned') {
      forgetPendingCheckout();
      setServerError(result.message || 'That payment did not go through. Nothing was charged — you can try again.');
      return;
    }
    // Very likely paid, just unconfirmed here. The order is already recorded.
    onPending({ orderNumber: session.orderNumber, reference });
  };

  const pay = async () => {
    if (paying || deliveryLoading) return;
    const problems = { ...validateDetails(), ...validateDelivery() };
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      goTo(problems.fullName || problems.phone || problems.email ? 0 : 1);
      return;
    }
    if (quote.error) {
      setServerError(quote.error);
      return;
    }

    setPaying(true);
    setServerError('');
    setStage('Reserving your items…');
    saveDetails(details, delivery);

    const customer: CheckoutCustomer = {
      fullName: details.fullName.trim(),
      phone: details.phone.trim(),
      email: details.email.trim(),
      address: delivery.address.trim(),
      city: location ? locationLabel(location) : delivery.region,
      deliveryMethod: delivery.speed,
      deliveryLocationId: location?.id,
      expectedDeliveryFee: quote.fee
    };

    let session: CheckoutSession;
    try {
      // The order is recorded here, before any money moves.
      session = await startCheckout(customer, items.map((item) => ({
        productId: item.productId,
        productSlug: item.productSlug,
        variantId: item.variantId,
        color: item.color,
        size: item.size,
        quantity: item.quantity
      })));
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'We could not start your checkout. Please try again.');
      setPaying(false);
      setStage('');
      return;
    }

    setStage('Opening secure payment…');
    await runPaystackCheckout(session, customer, {
      onPaid: (reference) => {
        void finishPayment(session, reference);
      },
      onCancelled: (reference) => {
        reportCheckoutClosed(reference);
        forgetPendingCheckout();
        setPaying(false);
        setStage('');
        setServerError('Payment was cancelled. Nothing was charged — tap Pay to try again.');
      },
      onError: (message) => {
        forgetPendingCheckout();
        setPaying(false);
        setStage('');
        setServerError(message);
      },
      onRedirect: () => setStage('Taking you to Paystack…')
    }, { fromCart });
  };

  const deliveryWords = describeDelivery(placeChosen ? quote.method : undefined, deliveryFee);
  const deliveryPriceText = !placeChosen ? 'Choose location' : deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free';

  const field = (
    key: keyof Details,
    label: string,
    input: { type: string; placeholder: string; autoComplete: string; inputMode?: 'tel' | 'email' | 'text' },
    hint?: ReactNode
  ) => (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`checkout-${key}`}>{label}</label>
      <input
        aria-describedby={errors[key] ? `checkout-${key}-error` : hint ? `checkout-${key}-hint` : undefined}
        aria-invalid={Boolean(errors[key])}
        autoComplete={input.autoComplete}
        className={styles.input}
        data-field={key}
        id={`checkout-${key}`}
        inputMode={input.inputMode}
        onChange={(event) => updateDetails(key, event.target.value)}
        placeholder={input.placeholder}
        type={input.type}
        value={details[key]}
      />
      {errors[key] ? (
        <p className={styles.fieldError} id={`checkout-${key}-error`}>{errors[key]}</p>
      ) : hint ? (
        <p className={styles.fieldHint} id={`checkout-${key}-hint`}>{hint}</p>
      ) : null}
    </div>
  );

  return (
    <>
      <div className={styles.scroll} ref={scrollRef}>
        <ol aria-label="Checkout progress" className={styles.progress}>
          {STEPS.map((label, index) => (
            <li
              aria-current={index === step ? 'step' : undefined}
              className={`${styles.progressStep} ${index < step ? styles.progressDone : ''} ${index === step ? styles.progressActive : ''}`}
              key={label}
            >
              <button
                className={styles.progressButton}
                disabled={index >= step || paying}
                onClick={() => goTo(index)}
                type="button"
              >
                <span className={styles.progressDot}>{index < step ? <CheckIcon height={14} width={14} /> : index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className={`${styles.stepPanel} ${direction === 'back' ? styles.stepBack : ''}`} key={step}>
          {step === 0 && (
            <section aria-labelledby="checkout-step-title">
              <h3 className={styles.stepTitle} id="checkout-step-title" ref={headingRef} tabIndex={-1}>Your details</h3>
              <p className={styles.stepLead}>We&apos;ll text your order updates to this number.</p>
              {field('fullName', 'Full name', { type: 'text', placeholder: 'e.g. Ama Mensah', autoComplete: 'name' })}
              {field('phone', 'Phone number', { type: 'tel', placeholder: 'e.g. 024 123 4567', autoComplete: 'tel', inputMode: 'tel' })}
              {field('email', 'Email', { type: 'email', placeholder: 'you@gmail.com', autoComplete: 'email', inputMode: 'email' }, 'Your payment receipt is sent here.')}
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="checkout-step-title">
              <h3 className={styles.stepTitle} id="checkout-step-title" ref={headingRef} tabIndex={-1}>Where should we deliver?</h3>
              <DeliveryPicker
                address={delivery.address}
                errors={errors}
                loading={deliveryLoading}
                location={location}
                onChange={updateDelivery}
                placeRegion={placeRegion}
                quote={placeChosen ? quote : undefined}
                region={delivery.region}
                regionMode={regionMode}
                selectedId={delivery.locationId}
                settings={settings}
                speed={delivery.speed}
              />
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="checkout-step-title">
              <h3 className={styles.stepTitle} id="checkout-step-title" ref={headingRef} tabIndex={-1}>Review &amp; pay</h3>

              <div className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <span>{totalItems} {totalItems === 1 ? 'piece' : 'pieces'}</span>
                </div>
                <ul className={styles.reviewItems}>
                  {items.map((item) => {
                    const unit = effectiveUnitPrice(item, quantityByProductSlug.get(item.productSlug) || 0);
                    return (
                      <li key={item.variantId}>
                        <span className={styles.reviewThumb}>
                          <Image alt="" fill sizes="48px" src={item.image} />
                        </span>
                        <span className={styles.reviewItemText}>
                          <strong>{item.name}</strong>
                          <small>{item.color} · Size {item.size} · ×{item.quantity}</small>
                        </span>
                        <span className={styles.reviewItemPrice}>{formatCurrency(unit * item.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <span>Contact</span>
                  <button className={styles.editButton} disabled={paying} onClick={() => goTo(0)} type="button">Edit</button>
                </div>
                <p className={styles.reviewText}>
                  {details.fullName}<br />
                  {details.phone} · {details.email}
                </p>
              </div>

              <div className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <span>Delivery</span>
                  <button className={styles.editButton} disabled={paying} onClick={() => goTo(1)} type="button">Edit</button>
                </div>
                <p className={styles.reviewText}>
                  {location ? locationLabel(location) : delivery.region}<br />
                  {delivery.address}
                </p>
                <p className={styles.reviewMuted}>
                  {deliveryWords.label} · {deliveryPriceText}
                  {quote.method === 'location' && location?.note ? ` · ${location.note}` : quote.method !== 'location' ? ` · ${deliveryWords.detail}` : ''}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className={styles.checkoutFooter}>
        {serverError && (
          <div className={styles.alert} role="alert">{serverError}</div>
        )}

        {/* The full breakdown on the last step; a single total before that keeps phones uncluttered. */}
        {step === 2 ? (
          <dl className={styles.totals}>
            <div><dt>Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>Service fee (2%)</dt><dd>{formatCurrency(serviceCharge)}</dd></div>
            <div><dt>Delivery</dt><dd>{deliveryPriceText}</dd></div>
            <div className={styles.totalRow}><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
          </dl>
        ) : (
          <div className={styles.compactTotal}>
            <span>Total{step === 1 && placeChosen ? ' incl. delivery' : ''}</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        )}

        {step < 2 ? (
          <Button disabled={step === 1 && deliveryLoading} fullWidth onClick={next} size="lg">
            Continue
          </Button>
        ) : (
          <Button disabled={deliveryLoading} fullWidth loading={paying} onClick={pay} size="lg">
            {paying ? stage || 'Connecting…' : <><LockIcon height={18} width={18} /> Pay {formatCurrency(total)}</>}
          </Button>
        )}

        <div className={styles.footerRow}>
          <button className={styles.backButton} disabled={paying} onClick={back} type="button">
            <ChevronLeftIcon height={16} width={16} /> {step === 0 ? exitLabel : 'Back'}
          </button>
          <span className={styles.secureNote}>Secured by Paystack · MoMo, card or bank</span>
        </div>
      </div>
    </>
  );
}

// The checkout drawer at true phone scale: CartDrawer.tsx, CheckoutFlow.tsx, DeliveryPicker.tsx
// and OrderReceipt.tsx with CartDrawer.module.css. Delivery places, prices and the note come
// from the live delivery list; totals from the store's own format and delivery helpers.
import React from 'react';
import { interpolate } from 'remotion';

import { CheckIcon, ChevronLeftIcon, LockIcon, MapPinIcon, SearchIcon, XIcon } from '@/components/ui/Icons';
import s from '@/components/cart/CartDrawer.module.css';
import { describeDelivery, locationLabel } from '@/lib/delivery';
import { formatCurrency } from '@/lib/format';

import { BODY, C, MONO, SPRING_CARD } from '../brand';
import { ease, useSpringAt, useT } from '../components/anim';
import { PLACES } from '../catalog';
import { HERO, PICKS, STORY } from '../script';
import { Button, Caret, Fill } from './app';

const STEPS = ['Details', 'Delivery', 'Pay'] as const;

/** The drawer itself: slides in from the right over a dimmed page (`open` 0..1). */
export const Drawer: React.FC<{ open: number; title: string; children: React.ReactNode }> = ({ open, title, children }) => (
  <>
    <div className={`${s.overlay} ${s.overlayOpen}`} style={{ opacity: open }} />
    <aside className={`${s.drawer} ${s.drawerOpen} ${s.drawerCheckout}`} style={{ transform: `translateX(${(1 - open) * 104}%)`, height: '100%' }}>
      <header className={s.header}>
        <h2 className={s.title}>{title}</h2>
        <button className={s.closeButton} type="button">
          <XIcon />
        </button>
      </header>
      {children}
    </aside>
  </>
);

const Progress: React.FC<{ step: number; fill?: number }> = ({ step, fill = 1 }) => (
  <ol className={s.progress}>
    {STEPS.map((label, i) => (
      <li key={label} className={`${s.progressStep} ${i < step ? s.progressDone : ''} ${i === step ? s.progressActive : ''}`} style={i === step ? ({ '--fill': fill } as React.CSSProperties) : undefined}>
        <button className={s.progressButton} type="button">
          <span className={s.progressDot}>{i < step ? <CheckIcon height={14} width={14} /> : i + 1}</span>
          {label}
        </button>
      </li>
    ))}
  </ol>
);

type Focus = 'fullName' | 'phone' | 'email' | 'search' | 'address' | null;

const Field: React.FC<{ label: string; value: string; placeholder: string; focus: boolean; t: number; hint?: string; hintGlow?: number }> = ({ label, value, placeholder, focus, t, hint, hintGlow = 0 }) => (
  <div className={s.field}>
    <label className={s.fieldLabel}>{label}</label>
    <div data-m={`f-${label}`} className={s.input} style={{ display: 'flex', alignItems: 'center', borderColor: focus ? 'var(--accent)' : undefined, outline: focus ? '3px solid var(--accent-soft)' : undefined, color: value ? undefined : 'var(--fg-3)' }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{value || placeholder}</span>
      <Caret t={t} on={focus} />
    </div>
    {hint ? (
      <p className={s.fieldHint} style={{ color: hintGlow ? `color-mix(in srgb, var(--fg) ${hintGlow * 100}%, var(--fg-3))` : undefined }}>
        {hint}
      </p>
    ) : null}
  </div>
);

/** The footer: compact total on steps 1 and 2, the full breakdown on 3. */
const Footer: React.FC<{ step: number; placeChosen: boolean; press?: number; paying?: boolean }> = ({ step, placeChosen, press = 1, paying }) => {
  const delivery = placeChosen ? STORY.delivery : 0;
  const total = Math.round((STORY.orderTotal + delivery) * 100) / 100;
  return (
    <div className={s.checkoutFooter}>
      {step === 2 ? (
        <dl className={s.totals}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(STORY.subtotal)}</dd>
          </div>
          <div>
            <dt>Service fee (2%)</dt>
            <dd>{formatCurrency(STORY.serviceCharge)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>{formatCurrency(STORY.delivery)}</dd>
          </div>
          <div className={s.totalRow}>
            <dt>Total</dt>
            <dd>{formatCurrency(STORY.total)}</dd>
          </div>
        </dl>
      ) : (
        <div className={s.compactTotal}>
          <span>Total{step === 1 && placeChosen ? ' incl. delivery' : ''}</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      )}
      {step < 2 ? (
        <Button m="cta" full size="lg" press={press}>
          Continue
        </Button>
      ) : (
        <Button m="cta" full size="lg" press={press} loading={paying}>
          {paying ? (
            'Opening secure payment…'
          ) : (
            <>
              <LockIcon height={18} width={18} /> Pay {formatCurrency(STORY.total)}
            </>
          )}
        </Button>
      )}
      <div className={s.footerRow}>
        <button className={s.backButton} type="button">
          <ChevronLeftIcon height={16} width={16} /> {step === 0 ? 'Back to product' : 'Back'}
        </button>
        <span className={s.secureNote}>Secured by Paystack · MoMo, card or bank</span>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- step 1: details */

export const DetailsStep: React.FC<{ t: number; name: string; phone: string; email: string; focus: Focus; press?: number; leadGlow?: number; hintGlow?: number }> = ({ t, name, phone, email, focus, press, leadGlow = 0, hintGlow = 0 }) => (
  <>
    <div className={s.scroll}>
      <Progress step={0} />
      <div className={s.stepPanel}>
        <section>
          <h3 className={s.stepTitle}>Your details</h3>
          <p className={s.stepLead} style={{ color: leadGlow ? `color-mix(in srgb, var(--fg) ${leadGlow * 100}%, var(--fg-3))` : undefined }}>
            We&apos;ll text your order updates to this number.
          </p>
          <Field label="Full name" value={name} placeholder="e.g. Ama Mensah" focus={focus === 'fullName'} t={t} />
          <Field label="Phone number" value={phone} placeholder="e.g. 024 123 4567" focus={focus === 'phone'} t={t} />
          <Field label="Email" value={email} placeholder="you@gmail.com" focus={focus === 'email'} t={t} hint="Your payment receipt is sent here." hintGlow={hintGlow} />
        </section>
      </div>
    </div>
    <Footer step={0} placeChosen={false} press={press} />
  </>
);

/* ---------------------------------------------------------------- step 2: delivery */

const subline = (l: { area: string; region: string }) => [l.area, l.region].filter(Boolean).join(' · ');
const priceText = (fee: number) => (fee > 0 ? formatCurrency(fee) : 'Free');

export const DeliveryStep: React.FC<{ t: number; search: string; chosen: boolean; address: string; focus: Focus; pickPress?: number; press?: number; priceGlow?: number; scroll?: number }> = ({
  t,
  search,
  chosen,
  address,
  focus,
  pickPress = 1,
  press,
  priceGlow = 0,
  scroll = 0,
}) => {
  const q = search.trim().toLowerCase();
  const matches = q ? PLACES.filter((l) => `${l.name} ${l.area} ${l.region}`.toLowerCase().includes(q)) : [];
  const popular = PLACES.filter((l) => l.featured);
  const loc = STORY.place;
  const option = (l: (typeof PLACES)[number]) => {
    const isPick = l.id === loc.id;
    return (
      <button data-m={`loc-${l.id}`} key={l.id} className={s.locationOption} type="button" style={isPick ? { transform: `scale(${pickPress})`, boxShadow: priceGlow ? `0 0 0 ${2 * priceGlow}px var(--accent-ring)` : undefined } : undefined}>
        <span className={s.radioMark} />
        <span className={s.locationText}>
          <strong>{l.name}</strong>
          <small>{subline(l)}</small>
        </span>
        <span className={`${s.locationPrice} ${l.fee === 0 ? s.free : ''}`}>{priceText(l.fee)}</span>
      </button>
    );
  };
  return (
    <>
      <div className={s.scroll} style={{ overflow: 'hidden' }}>
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          <Progress step={1} />
          <div className={s.stepPanel}>
            <section>
              <h3 className={s.stepTitle}>Where should we deliver?</h3>
              <div className={s.picker}>
                {chosen ? (
                  <div className={s.chosenCard}>
                    <span className={s.chosenIcon}>
                      <MapPinIcon height={20} width={20} />
                    </span>
                    <div className={s.chosenText}>
                      <small>Delivering to</small>
                      <strong>{loc.name}</strong>
                      <span>{subline(loc)}</span>
                    </div>
                    <div className={s.chosenSide}>
                      <span className={s.locationPrice} style={{ color: priceGlow ? 'var(--accent-text)' : undefined }}>
                        {priceText(loc.fee)}
                      </span>
                      <button className={s.changeButton} type="button">
                        Change
                      </button>
                    </div>
                    {loc.note ? <p className={s.chosenNote}>{loc.note}</p> : null}
                  </div>
                ) : (
                  <div className={s.chooser}>
                    <p className={s.chooserLead}>Pick the delivery place closest to you. The price is shown on the right.</p>
                    <div className={s.locateBlock}>
                      <button className={s.locateButton} type="button">
                        <span className={s.locateIcon}>
                          <MapPinIcon height={20} width={20} />
                        </span>
                        <span className={s.locateText}>
                          <strong>Find the closest place to me</strong>
                          <small>Uses your location once. It stays on your phone.</small>
                        </span>
                      </button>
                      <div className={s.orDivider}>
                        <span>or choose from the list</span>
                      </div>
                    </div>
                    <label data-m="search" className={s.searchBox} style={{ borderColor: focus === 'search' ? 'var(--accent)' : undefined }}>
                      <SearchIcon height={18} width={18} />
                      <span className={s.searchInput} style={{ display: 'flex', alignItems: 'center', color: search ? undefined : 'var(--fg-3)' }}>
                        {search || 'Search your town or area'}
                        <Caret t={t} on={focus === 'search'} />
                      </span>
                    </label>
                    <div className={s.locationList}>
                      {q ? (
                        matches.map(option)
                      ) : (
                        <>
                          {popular.length ? <span className={s.groupLabel}>★ Popular</span> : null}
                          {popular.map(option)}
                          <span className={s.groupLabel}>Ashanti</span>
                          {PLACES.filter((l) => l.region === 'Ashanti').map(option)}
                        </>
                      )}
                    </div>
                    <div className={s.chooserFoot}>
                      <button className={s.linkButton} type="button">
                        My town isn&apos;t listed
                      </button>
                    </div>
                  </div>
                )}
                {chosen ? (
                  <div className={s.field}>
                    <label className={s.fieldLabel}>Address or nearest landmark</label>
                    <div data-m="address" className={s.input} style={{ display: 'flex', alignItems: 'center', borderColor: focus === 'address' ? 'var(--accent)' : undefined, outline: focus === 'address' ? '3px solid var(--accent-soft)' : undefined, color: address ? undefined : 'var(--fg-3)' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{address || 'e.g. House 12, near the post office'}</span>
                      <Caret t={t} on={focus === 'address'} />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer step={1} placeChosen={chosen} press={press} />
    </>
  );
};

/* ---------------------------------------------------------------- step 3: review & pay */

export const ReviewStep: React.FC<{ press?: number; paying?: boolean; scroll?: number }> = ({ press, paying, scroll = 0 }) => {
  const words = describeDelivery('location', STORY.delivery);
  return (
    <>
      <div className={s.scroll} style={{ overflow: 'hidden' }}>
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          <Progress step={2} />
          <div className={s.stepPanel}>
            <section>
              <h3 className={s.stepTitle}>Review &amp; pay</h3>
              <div className={s.reviewCard}>
                <div className={s.reviewHead}>
                  <span>{STORY.pieces} pieces</span>
                </div>
                <ul className={s.reviewItems}>
                  {PICKS.map((p) => (
                    <li key={p.color + p.size}>
                      <span className={s.reviewThumb}>
                        <Fill src={HERO.photo(p.color)} />
                      </span>
                      <span className={s.reviewItemText}>
                        <strong>{HERO.rawName}</strong>
                        <small>
                          {p.color} · Size {p.size} · ×{p.qty}
                        </small>
                      </span>
                      <span className={s.reviewItemPrice}>{formatCurrency(HERO.price * p.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.reviewCard}>
                <div className={s.reviewHead}>
                  <span>Contact</span>
                  <button className={s.editButton} type="button">
                    Edit
                  </button>
                </div>
                <p className={s.reviewText}>
                  {STORY.buyer.name}
                  <br />
                  {STORY.buyer.phone} · {STORY.buyer.email}
                </p>
              </div>
              <div className={s.reviewCard}>
                <div className={s.reviewHead}>
                  <span>Delivery</span>
                  <button className={s.editButton} type="button">
                    Edit
                  </button>
                </div>
                <p className={s.reviewText}>
                  {locationLabel(STORY.place)}
                  <br />
                  {STORY.address}
                </p>
                <p className={s.reviewMuted}>
                  {words.label} · {formatCurrency(STORY.delivery)}
                  {STORY.place.note ? ` · ${STORY.place.note}` : ''}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer step={2} placeChosen press={press} paying={paying} />
    </>
  );
};

/* ---------------------------------------------------------------- OrderReceipt.tsx */

export const Receipt: React.FC<{ refGlow?: number; scroll?: number; pop?: number }> = ({ refGlow = 0, scroll = 0, pop = 1 }) => (
  <>
    <div className={s.scroll} style={{ overflow: 'hidden' }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        <div className={s.result}>
          <div className={`${s.resultIcon} ${s.resultIconSuccess}`} style={{ transform: `scale(${pop})` }}>
            <CheckIcon height={34} width={34} />
          </div>
          <h3 className={s.resultTitle}>Order placed!</h3>
          <p className={s.resultText}>
            Thank you, <strong>{STORY.buyer.name}</strong>. Your order number is{' '}
            <span data-m="ref" className={s.ref} style={{ boxShadow: refGlow ? `0 0 0 ${3 * refGlow}px var(--accent-ring)` : undefined, borderRadius: 6 }}>
              #{STORY.ref}
            </span>
            . You&apos;ll receive an SMS confirmation shortly.
          </p>
        </div>
        <div className={s.reviewCard}>
          <div className={s.reviewHead}>
            <span>Items ordered</span>
          </div>
          <ul className={s.receiptLines}>
            {PICKS.map((p) => (
              <li key={p.color + p.size}>
                <span>
                  <strong>{HERO.rawName}</strong>
                  <small>
                    {p.color} · Size {p.size} · ×{p.qty}
                  </small>
                </span>
                <span>{formatCurrency(HERO.price * p.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className={s.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(STORY.subtotal)}</dd>
            </div>
            <div>
              <dt>Service fee (2%)</dt>
              <dd>{formatCurrency(STORY.serviceCharge)}</dd>
            </div>
            <div>
              <dt>{describeDelivery('location', STORY.delivery).label}</dt>
              <dd>{formatCurrency(STORY.delivery)}</dd>
            </div>
            <div className={s.totalRow}>
              <dt>Total paid</dt>
              <dd>{formatCurrency(STORY.total)}</dd>
            </div>
          </dl>
        </div>
        <dl className={s.metaList}>
          <div>
            <dt>Deliver to</dt>
            <dd>
              {STORY.address}, {locationLabel(STORY.place)}
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>Paid · Paystack (mobile money)</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{STORY.buyer.phone}</dd>
          </div>
        </dl>
        <p className={s.resultFoot}>
          Our team will reach out on <strong>{STORY.buyer.phone}</strong> to confirm dispatch and delivery details.
        </p>
      </div>
    </div>
    <div className={s.checkoutFooter}>
      <Button full size="lg">
        Continue shopping
      </Button>
    </div>
  </>
);

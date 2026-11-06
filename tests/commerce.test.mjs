import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveUnitPrice, quantityByProduct } from '../src/lib/wholesale.ts';
import { adminOrderSchema, resolveDiscount, sumOrderExtras } from '../src/lib/order-schema.ts';
import { adjudicatePayment, buildPaymentReference } from '../src/lib/paystack-server.ts';
import { parsePublicOrderId } from '../src/lib/order-reference.ts';
import { activeLocations, deliveryQuote, normalizeDeliverySettings, quoteCheckoutDelivery } from '../src/lib/delivery.ts';

test('delivery options apply only to selected regions and price urgent delivery', () => {
  const settings = normalizeDeliverySettings({ eligibleRegions: ['Ashanti', 'Greater Accra'], urgentFee: 25 });
  assert.deepEqual(settings.eligibleRegions, ['Ashanti']);
  assert.deepEqual(deliveryQuote('Ashanti', 'standard', settings), { method: 'standard', fee: 0 });
  assert.deepEqual(deliveryQuote('Ashanti', 'urgent', settings), { method: 'urgent', fee: 25 });
  assert.equal(deliveryQuote('Greater Accra', 'urgent', settings).error, 'Urgent Delivery to Station is not available for this region.');
  assert.deepEqual(deliveryQuote('Western', 'standard', settings), { method: 'none', fee: 0 });
  assert.ok(deliveryQuote('Ashanti', 'urgent', { ...settings, urgentFee: 0 }).error);
});

test('listed delivery locations are priced by the merchant, not the browser', () => {
  const settings = normalizeDeliverySettings({
    eligibleRegions: ['Ashanti'],
    urgentFee: 20,
    allowUnlisted: true,
    locations: [
      { id: 'kumasi', name: '  Kumasi ', region: 'Ashanti', fee: 30.005, note: 'VIP station' },
      { id: 'legon', name: 'East Legon', region: 'Greater Accra', fee: 25 },
      { id: 'dup', name: 'kumasi', region: 'Ashanti', fee: 99 },
      { id: 'off', name: 'Ho', region: 'Volta', fee: 15, active: false },
      { id: 'bad', name: 'X', region: 'Nowhere', fee: -4 }
    ]
  });
  assert.equal(settings.locations.length, 3, 'duplicates and invalid rows are dropped');
  assert.equal(settings.locations[0].name, 'Kumasi');
  assert.equal(settings.locations[0].fee, 30.01);

  const kumasi = quoteCheckoutDelivery({ locationId: 'kumasi', region: 'ignored' }, settings);
  assert.equal(kumasi.method, 'location');
  assert.equal(kumasi.fee, 30.01);
  assert.equal(kumasi.shippingCity, 'Kumasi, Ashanti');

  assert.equal(quoteCheckoutDelivery({ locationId: 'kumasi', region: '', requested: 'urgent' }, settings).fee, 50.01);
  assert.ok(quoteCheckoutDelivery({ locationId: 'legon', region: '', requested: 'urgent' }, settings).error, 'no urgent outside station regions');
  assert.ok(quoteCheckoutDelivery({ locationId: 'off', region: 'Volta' }, settings).error, 'inactive towns cannot be bought');
  assert.deepEqual(activeLocations(settings).map((l) => l.id), ['legon', 'kumasi']);

  // Unlisted towns fall back to the regional rule, unless the merchant turned that off.
  assert.deepEqual(quoteCheckoutDelivery({ region: 'Ashanti' }, settings), { method: 'standard', fee: 0, shippingCity: 'Ashanti' });
  assert.ok(quoteCheckoutDelivery({ region: 'Ashanti' }, { ...settings, allowUnlisted: false }).error);
  // With no locations at all, checkout behaves exactly as before.
  assert.deepEqual(quoteCheckoutDelivery({ region: 'Western' }, { ...settings, locations: [], allowUnlisted: false }), { method: 'none', fee: 0, shippingCity: 'Western' });
});

test('bulk pricing combines sizes and colors of one product', () => {
  const counts = quantityByProduct([
    { productSlug: 'tee', quantity: 2 },
    { productSlug: 'tee', quantity: 3 },
    { productSlug: 'hoodie', quantity: 1 }
  ]);
  assert.equal(counts.get('tee'), 5);
  assert.equal(effectiveUnitPrice({ price: 100, wholesale: { minQuantity: 5, unitPrice: 80 } }, counts.get('tee')), 80);
  assert.equal(effectiveUnitPrice({ price: 100, wholesale: { minQuantity: 5, unitPrice: 80 } }, 4), 100);
});

test('manual order charges and discounts cannot make a negative total', () => {
  assert.equal(sumOrderExtras([{ amount: 12.345 }, { amount: 7.65 }]), 20);
  assert.equal(resolveDiscount(120, 'percent', 10), 12);
  assert.equal(resolveDiscount(120, 'amount', 500), 120);
  assert.equal(adminOrderSchema.safeParse({ customerName: 'A', customerPhone: '123' }).success, false);
});

test('in-person orders accept blank details and validate details when supplied', () => {
  const minimum = {
    items: [{ productSlug: 'tee', color: 'Black', size: 'M', quantity: 1 }],
    paidNow: false,
    paymentMethod: 'COD',
    clientRequestId: 'walk-in-test-1'
  };
  const parsed = adminOrderSchema.safeParse(minimum);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.customerEmail, '');
    assert.equal(parsed.data.customerPhone, '');
    assert.equal(parsed.data.note, '');
  }
  assert.equal(adminOrderSchema.safeParse({ ...minimum, customerEmail: 'invalid' }).success, false);
  assert.equal(adminOrderSchema.safeParse({ ...minimum, customerPhone: '123' }).success, false);
});

test('verified payment must match amount and currency', () => {
  assert.equal(adjudicatePayment({ status: 'success', currency: 'GHS', amount: 10200 }, 102).outcome, 'paid');
  assert.equal(adjudicatePayment({ status: 'success', currency: 'GHS', amount: 10199 }, 102).outcome, 'mismatch');
  assert.equal(adjudicatePayment({ status: 'success', currency: 'USD', amount: 10200 }, 102).outcome, 'mismatch');
  assert.equal(adjudicatePayment({ status: 'pending' }, 102).outcome, 'pending');
});

test('order numbers and gateway references stay distinct', () => {
  assert.equal(parsePublicOrderId('#RD-42'), 42);
  assert.equal(parsePublicOrderId('RD-42extra'), null);
  assert.equal(parsePublicOrderId('RDX-42-1234'), null);
  assert.match(buildPaymentReference(42), /^RDX-42-[A-F0-9]{8}$/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import {
  AUTO_DELIVER_AFTER_HOURS,
  autoDeliveryDueAt,
  formatTimeLeft,
  isAutoDeliveryDue,
  nextFulfilmentStartedAt
} from '../src/lib/auto-delivery.ts';

const source = await readFile(new URL('../src/lib/catalog-db.ts', import.meta.url), 'utf8');
const setStatusSql = source.match(/CREATE OR REPLACE FUNCTION set_order_status\([\s\S]*?\$fn\$;/)?.[0];
const deliverSql = source.match(/CREATE OR REPLACE FUNCTION deliver_due_orders\([\s\S]*?\$fn\$;/)?.[0];
const createSql = source.match(/CREATE OR REPLACE FUNCTION create_order_with_reservation\([\s\S]*?\$fn\$;/)?.[0];
const backfillSql = source.match(/sql`\s*(UPDATE orders SET fulfilment_started_at = NOW\(\)[\s\S]*?)`/)?.[1];
assert.ok(setStatusSql && deliverSql && createSql && backfillSql, 'auto-delivery SQL is present in catalog-db');

const HOUR = 60 * 60 * 1000;

test('the 24-hour clock starts on entering fulfilment and survives Processing → Shipped', () => {
  const now = '2026-11-24T10:00:00.000Z';
  const earlier = '2026-11-24T02:00:00.000Z';
  assert.equal(nextFulfilmentStartedAt('Pending', 'Processing', undefined, now), now);
  assert.equal(nextFulfilmentStartedAt('Processing', 'Shipped', earlier, now), earlier, 'one window, not two');
  assert.equal(nextFulfilmentStartedAt('Shipped', 'Shipped', earlier, now), earlier);
  assert.equal(nextFulfilmentStartedAt('Shipped', 'Pending', earlier, now), undefined);
  assert.equal(nextFulfilmentStartedAt('Delivered', 'Shipped', undefined, now), now, 'coming back starts fresh');
  assert.equal(nextFulfilmentStartedAt('Processing', 'Shipped', undefined, now), now, 'a missing clock is started');
});

test('due time and countdown read from the clock', () => {
  const started = '2026-11-24T00:00:00.000Z';
  const order = { status: 'Shipped', fulfilmentStartedAt: started };
  assert.equal(AUTO_DELIVER_AFTER_HOURS, 24);
  assert.equal(autoDeliveryDueAt(order).toISOString(), '2026-11-25T00:00:00.000Z');
  assert.equal(isAutoDeliveryDue(order, new Date('2026-11-24T23:59:00Z')), false);
  assert.equal(isAutoDeliveryDue(order, new Date('2026-11-25T00:00:00Z')), true);
  assert.equal(autoDeliveryDueAt({ status: 'Pending', fulfilmentStartedAt: started }), null);
  assert.equal(autoDeliveryDueAt({ status: 'Shipped' }), null);
  assert.equal(formatTimeLeft(5 * HOUR + 20 * 60_000), '5h 20m');
  assert.equal(formatTimeLeft(3 * HOUR), '3h');
  assert.equal(formatTimeLeft(45 * 60_000 + 30_000), '45m');
  assert.equal(formatTimeLeft(20_000), 'under 1m');
});

test('orders in Processing or Shipped for 24 hours are marked Delivered by the database', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'visible', variants JSONB NOT NULL
      );
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY, product_id TEXT, product_name TEXT, product_slug TEXT,
        selected_color TEXT, selected_size TEXT, price NUMERIC, customer_name TEXT,
        customer_phone TEXT, customer_email TEXT, shipping_address TEXT,
        shipping_city TEXT, payment_method TEXT, momo_network TEXT, momo_number TEXT,
        status TEXT, items JSONB, total_quantity INTEGER, subtotal NUMERIC,
        service_charge NUMERIC, payment_status TEXT, payment_reference TEXT,
        paid_at TIMESTAMPTZ, amount_paid NUMERIC, payment_channel TEXT,
        paystack_transaction_id TEXT, last_verified_at TIMESTAMPTZ,
        payment_verified_by TEXT, gateway_response TEXT, stock_reserved BOOLEAN,
        stock_released BOOLEAN, sms_sent BOOLEAN, sms_deferred BOOLEAN NOT NULL DEFAULT FALSE,
        discount NUMERIC, source TEXT, client_request_id TEXT UNIQUE, payment_note TEXT,
        extras JSONB, delivery_method TEXT NOT NULL DEFAULT 'none',
        delivery_fee NUMERIC NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(),
        fulfilment_started_at TIMESTAMPTZ, auto_delivered_at TIMESTAMPTZ
      );
    `);
    await db.exec(setStatusSql);
    await db.exec(deliverSql);
    await db.exec(createSql);
    await db.query(`INSERT INTO products (id, slug, variants) VALUES ('tee', 'tee', '[{"color":"Black","size":"M","inventory":null,"stockStatus":"in_stock"}]')`);

    const insert = async (status) => {
      const { rows } = await db.query(`INSERT INTO orders (status) VALUES ($1) RETURNING id`, [status]);
      return rows[0].id;
    };
    const row = async (id) => (await db.query(`SELECT * FROM orders WHERE id = $1`, [id])).rows[0];
    const setStatus = (id, status) => db.query(`SELECT * FROM set_order_status($1, $2)`, [id, status]);
    const ageClock = (id, hours) =>
      db.query(`UPDATE orders SET fulfilment_started_at = NOW() - make_interval(hours => $2) WHERE id = $1`, [id, hours]);
    const deliverDue = async () =>
      (await db.query(`SELECT delivered_id FROM deliver_due_orders($1::INTEGER) AS delivered_id`, [AUTO_DELIVER_AFTER_HOURS]))
        .rows.map((r) => r.delivered_id).sort((a, b) => a - b);

    // Entering fulfilment starts the clock; moving to Shipped keeps it.
    const a = await insert('Pending');
    assert.equal((await row(a)).fulfilment_started_at, null);
    await setStatus(a, 'Processing');
    const started = (await row(a)).fulfilment_started_at;
    assert.ok(started instanceof Date);
    await ageClock(a, 10);
    const aged = (await row(a)).fulfilment_started_at;
    await setStatus(a, 'Shipped');
    assert.equal((await row(a)).fulfilment_started_at.getTime(), aged.getTime(), 'Shipped keeps the Processing clock');

    // Leaving fulfilment stops the clock; returning restarts it.
    const b = await insert('Pending');
    await setStatus(b, 'Shipped');
    await ageClock(b, 30);
    await setStatus(b, 'Pending');
    assert.equal((await row(b)).fulfilment_started_at, null);
    await setStatus(b, 'Shipped');
    assert.ok(Date.now() - (await row(b)).fulfilment_started_at.getTime() < 60_000, 'fresh clock on re-entry');

    // Due and not-yet-due orders.
    const due = await insert('Pending');
    await setStatus(due, 'Processing');
    await ageClock(due, 25);
    const notDue = await insert('Pending');
    await setStatus(notDue, 'Shipped');
    await ageClock(notDue, 23);
    const cancelled = await insert('Pending');
    await setStatus(cancelled, 'Cancelled');
    await db.query(`UPDATE orders SET fulfilment_started_at = NOW() - INTERVAL '90 hours' WHERE id = $1`, [cancelled]);

    assert.deepEqual(await deliverDue(), [due], 'only the order past 24 hours is delivered');
    const delivered = await row(due);
    assert.equal(delivered.status, 'Delivered');
    assert.ok(delivered.auto_delivered_at instanceof Date);
    assert.equal(delivered.fulfilment_started_at, null);
    assert.equal((await row(notDue)).status, 'Shipped');
    assert.equal((await row(cancelled)).status, 'Cancelled', 'a stray clock outside fulfilment is ignored');
    assert.deepEqual(await deliverDue(), [], 'running again changes nothing');

    // Exactly at the 24-hour mark it goes.
    await ageClock(notDue, 24);
    assert.deepEqual(await deliverDue(), [notDue]);

    // An admin reopening an auto-delivered order gets a fresh 24 hours.
    await setStatus(due, 'Shipped');
    const reopened = await row(due);
    assert.equal(reopened.auto_delivered_at, null);
    assert.ok(Date.now() - reopened.fulfilment_started_at.getTime() < 60_000);
    assert.deepEqual(await deliverDue(), []);

    // Marked Delivered by hand: no clock, no "auto" stamp.
    await setStatus(b, 'Delivered');
    const manual = await row(b);
    assert.equal(manual.fulfilment_started_at, null);
    assert.equal(manual.auto_delivered_at, null);

    // Orders created straight into Processing (in-person sales) start the clock.
    const line = { productSlug: 'tee', color: 'Black', size: 'M', quantity: 1 };
    const create = async (key, status) => {
      const order = {
        productId: 'tee', productName: 'Tee', productSlug: 'tee', selectedColor: 'Black', selectedSize: 'M',
        price: 100, customerName: 'Test', customerPhone: '0240000000', customerEmail: 'test@example.com',
        shippingAddress: 'Test', shippingCity: 'Accra', paymentMethod: 'CASH', items: [line],
        totalQuantity: 1, subtotal: 100, serviceCharge: 0, clientRequestId: key, paymentStatus: 'paid', status
      };
      const { rows } = await db.query(
        'SELECT id, fulfilment_started_at FROM create_order_with_reservation($1::jsonb, $2::jsonb, FALSE)',
        [JSON.stringify(order), JSON.stringify([line])]
      );
      return rows[0];
    };
    assert.ok((await create('in-person-processing', 'Processing')).fulfilment_started_at instanceof Date);
    assert.equal((await create('in-person-pending', 'Pending')).fulfilment_started_at, null);

    // Rows already in fulfilment before the column existed get a clock that starts now.
    const legacy = await insert('Shipped');
    await db.query(`UPDATE orders SET fulfilment_started_at = NULL WHERE id = $1`, [legacy]);
    await db.exec(backfillSql);
    assert.ok(Date.now() - (await row(legacy)).fulfilment_started_at.getTime() < 60_000);
    assert.equal((await row(a)).fulfilment_started_at.getTime(), aged.getTime(), 'existing clocks are left alone');
  } finally {
    await db.close();
  }
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { moveItem, moveToFront, parseProductOrder, sameOrder } from '../src/lib/product-order.ts';

const source = await readFile(new URL('../src/lib/catalog-db.ts', import.meta.url), 'utf8');
const listOrder = source.match(/SELECT \* FROM products ORDER BY ([^`]+)`/)?.[1];
const saveOrder = source.match(/sql`\s*(UPDATE products AS p SET sort_order[\s\S]*?)`/)?.[1];
const frontPosition = source.match(/\(SELECT COALESCE\(MIN\(sort_order\), 1\) - 1 FROM products\)/)?.[0];
assert.ok(listOrder && saveOrder && frontPosition, 'shop order SQL is present in catalog-db');

test('moving products keeps everything else in place', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 99), ['a', 'c', 'b'], 'targets past the end are clamped');
  assert.deepEqual(moveItem(['a', 'b'], 5, 0), ['a', 'b'], 'an unknown source changes nothing');
  assert.deepEqual(moveToFront(['a', 'b', 'c'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(moveToFront(['a', 'b', 'c'], 'zzz'), ['a', 'b', 'c']);
  assert.ok(sameOrder(['a', 'b'], ['a', 'b']));
  assert.ok(!sameOrder(['a', 'b'], ['b', 'a']));
});

test('the API only accepts a clean list of distinct ids', () => {
  assert.deepEqual(parseProductOrder([' tee ', 'cap']), ['tee', 'cap']);
  assert.equal(parseProductOrder([]), null);
  assert.equal(parseProductOrder('tee,cap'), null);
  assert.equal(parseProductOrder(['tee', 'tee']), null, 'duplicates mean a corrupt client list');
  assert.equal(parseProductOrder(['tee', 4]), null);
  assert.equal(parseProductOrder(['']), null);
  assert.equal(parseProductOrder(['x'.repeat(101)]), null);
});

test('the shop shows products in the order the admin saved, new ones first', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE products (id TEXT PRIMARY KEY, sort_order INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());
      INSERT INTO products (id, created_at) VALUES
        ('old', NOW() - INTERVAL '3 days'),
        ('mid', NOW() - INTERVAL '2 days'),
        ('new', NOW() - INTERVAL '1 day');
    `);
    const shop = async () => (await db.query(`SELECT id FROM products ORDER BY ${listOrder}`)).rows.map((row) => row.id);
    const save = async (ids) => (await db.query(saveOrder.replace(/\$\{[^}]+\}/, '$1'), [JSON.stringify(ids)])).rows.length;
    const create = (id) => db.query(`INSERT INTO products (id, sort_order) VALUES ($1, ${frontPosition})`, [id]);

    assert.deepEqual(await shop(), ['new', 'mid', 'old'], 'never arranged: newest first, as before');

    await create('fresh');
    assert.deepEqual(await shop(), ['fresh', 'new', 'mid', 'old'], 'a new product goes to the front');

    assert.equal(await save(['old', 'fresh', 'mid', 'new']), 4);
    assert.deepEqual(await shop(), ['old', 'fresh', 'mid', 'new']);

    await create('drop');
    assert.deepEqual(await shop(), ['drop', 'old', 'fresh', 'mid', 'new'], 'new products still start at the front');

    // A list loaded before "drop" existed must not push it to the back.
    assert.equal(await save(['mid', 'old', 'fresh', 'new']), 4);
    assert.deepEqual(await shop(), ['drop', 'mid', 'old', 'fresh', 'new']);

    assert.equal(await save(['ghost']), 0, 'unknown ids change nothing');
    assert.deepEqual(await shop(), ['drop', 'mid', 'old', 'fresh', 'new']);
  } finally {
    await db.close();
  }
});

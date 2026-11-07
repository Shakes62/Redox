import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupePlaces, distanceKm, formatDistance, nearestPlaces, regionFromOsmAddress, toPlaceResult } from '../src/lib/places.ts';
import { locationLabel, normalizeDeliverySettings, quoteCheckoutDelivery } from '../src/lib/delivery.ts';

test('regions come from the map, by ISO code first and state name second', () => {
  assert.equal(regionFromOsmAddress({ 'ISO3166-2-lvl4': 'GH-AH', state: 'Something else' }), 'Ashanti');
  assert.equal(regionFromOsmAddress({ state: 'Bono East Region' }), 'Bono East');
  assert.equal(regionFromOsmAddress({ state: 'greater accra region' }), 'Greater Accra');
  assert.equal(regionFromOsmAddress({ state: 'Lagos' }), null);
  assert.equal(regionFromOsmAddress(undefined), null);
});

test('map search results become clean places', () => {
  const adum = toPlaceResult({
    name: 'Adum', addresstype: 'suburb', type: 'suburb', lat: '6.6942926', lon: '-1.6233319', osm_type: 'node', osm_id: 5531053289,
    address: { suburb: 'Adum', city: 'Kumasi', county: 'Kumasi Metropolitan District', state: 'Ashanti Region', 'ISO3166-2-lvl4': 'GH-AH' }
  });
  assert.deepEqual(adum, { osmId: 'N5531053289', name: 'Adum', area: 'Kumasi', region: 'Ashanti', kind: 'Area', lat: 6.694293, lon: -1.623332 });

  const tamale = toPlaceResult({
    name: 'Tamale', addresstype: 'city', lat: '9.4', lon: '-0.85', osm_type: 'node', osm_id: 1,
    address: { city: 'Tamale', county: 'Tamale Metropolitan District', 'ISO3166-2-lvl4': 'GH-NP' }
  });
  assert.equal(tamale.area, '', 'a city is not its own area, even via its district name');
  const ho = toPlaceResult({ name: 'Ho', addresstype: 'town', lat: '6.6', lon: '0.47', osm_type: 'node', osm_id: 2, address: { town: 'Ho', county: 'Ho Municipal District' } });
  assert.equal(ho.area, '');
  const ejisu = toPlaceResult({ name: 'Ejisu', addresstype: 'town', lat: '6.7', lon: '-1.4', osm_type: 'node', osm_id: 3, address: { town: 'Ejisu', county: 'Ejisu Municipal District', state: 'Ashanti Region' } });
  assert.equal(ejisu.region, 'Ashanti');
  assert.equal(tamale.kind, 'City');
  assert.equal(toPlaceResult({ name: 'X', lat: 'nope', lon: 1 }), null);
  assert.equal(dedupePlaces([adum, { ...adum, osmId: 'W2' }]).length, 1);
});

test('the closest pinned places are found on the device', () => {
  const places = [
    { id: 'accra', lat: 5.6037, lon: -0.187 },
    { id: 'kumasi', lat: 6.6885, lon: -1.6244 },
    { id: 'nopin' },
    { id: 'tamale', lat: 9.4008, lon: -0.8393 }
  ];
  const nearEjisu = nearestPlaces({ lat: 6.72, lon: -1.47 }, places, 2);
  assert.deepEqual(nearEjisu.map((entry) => entry.place.id), ['kumasi', 'accra']);
  assert.ok(nearEjisu[0].km > 10 && nearEjisu[0].km < 25);
  assert.ok(Math.abs(distanceKm({ lat: 5.6037, lon: -0.187 }, { lat: 6.6885, lon: -1.6244 }) - 199) < 5, 'Accra–Kumasi is ~200 km');
  assert.equal(formatDistance(0.42), '400 m');
  assert.equal(formatDistance(4.26), '4.3 km');
  assert.equal(formatDistance(57.6), '58 km');
});

test('map pins, areas and popular flags are kept, and junk is dropped', () => {
  const settings = normalizeDeliverySettings({
    useLocation: false,
    locations: [
      { id: 'adum', name: 'Adum', area: 'Kumasi', region: 'Ashanti', fee: 25, lat: 6.69, lon: -1.62, osmId: 'N55', featured: true },
      { id: 'bad-pin', name: 'Ho', area: 'ho', region: 'Volta', fee: 0, lat: 300, lon: 'x', osmId: 'javascript:1' }
    ]
  });
  assert.equal(settings.useLocation, false);
  const [adum, ho] = settings.locations;
  assert.equal(adum.featured, true);
  assert.equal(adum.lat, 6.69);
  assert.equal(adum.osmId, 'N55');
  assert.equal(ho.lat, undefined, 'out-of-range pin is dropped');
  assert.equal(ho.osmId, undefined);
  assert.equal(ho.area, '', 'an area equal to the name is redundant');
  assert.equal(locationLabel(adum), 'Adum, Kumasi, Ashanti');
  assert.equal(quoteCheckoutDelivery({ locationId: 'adum', region: '' }, settings).shippingCity, 'Adum, Kumasi, Ashanti');
  assert.equal(normalizeDeliverySettings({}).useLocation, true, 'on by default');
});

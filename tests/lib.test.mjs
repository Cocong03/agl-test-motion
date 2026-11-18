import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, cityById, routeFor, buildBrief, mailtoHref, distanceKm, formatCoord } from '../lib.js';

test('distanceKm gives the great-circle distance, null for the same city', () => {
  const d = distanceKm('seattle', 'tokyo');
  assert.ok(d >= 7600 && d <= 7800, String(d));
  assert.equal(d % 10, 0);
  assert.equal(distanceKm('tokyo', 'tokyo'), null);
});

test('formatCoord renders hemispheres', () => {
  assert.equal(formatCoord(47.61, -122.33), '47.61°N 122.33°W');
  assert.equal(formatCoord(-1.29, 36.82), '1.29°S 36.82°E');
});

test('CITIES has 8 valid, uniquely-identified cities', () => {
  assert.equal(CITIES.length, 8);
  for (const c of CITIES) {
    assert.ok(c.lon >= -180 && c.lon <= 180, c.id);
    assert.ok(c.lat >= -90 && c.lat <= 90, c.id);
  }
  assert.equal(new Set(CITIES.map(c => c.id)).size, 8);
});

test('routeFor returns a LineString between the two cities', () => {
  const s = cityById('seattle'), t = cityById('tokyo');
  const r = routeFor('seattle', 'tokyo');
  assert.equal(r.type, 'LineString');
  assert.deepEqual(r.coordinates, [[s.lon, s.lat], [t.lon, t.lat]]);
});

test('routeFor rejects same or unknown cities', () => {
  assert.equal(routeFor('tokyo', 'tokyo'), null);
  assert.equal(routeFor('x', 'tokyo'), null);
});

const fields = { origin: 'Seattle', destination: 'Tokyo', mode: 'Air freight', commodity: 'Cherries & berries', readyDate: '2026-12-01' };

test('buildBrief includes every field and omits empty company', () => {
  const brief = buildBrief(fields);
  assert.equal(brief.split('\n')[0], 'AGL shipment brief');
  for (const v of Object.values(fields)) assert.ok(brief.includes(v), v);
  assert.ok(!brief.includes('Company:'));
  assert.ok(buildBrief({ ...fields, company: 'Acme' }).includes('Company: Acme'));
});

test('buildBrief includes details and omits an empty ready date', () => {
  const brief = buildBrief({ ...fields, readyDate: '', details: '12 pallets, 2–4°C' });
  assert.ok(!brief.includes('Cargo-ready date:'));
  assert.ok(brief.includes('Shipment details: 12 pallets, 2–4°C'));
});

test('mailtoHref round-trips special characters', () => {
  const brief = buildBrief({ ...fields, commodity: 'Fish & roe? #1\nCafé' });
  const href = mailtoHref(brief);
  assert.ok(href.startsWith('mailto:?subject='));
  const body = new URLSearchParams(href.slice('mailto:?'.length)).get('body');
  assert.equal(body, brief);
});

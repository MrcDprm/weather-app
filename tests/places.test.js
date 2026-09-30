import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPlace, DEFAULT_CITIES, isPlace, localized, parsePlaces, placeDetail, samePlace, WORLD_CITIES } from '../src/places.js';

test('the four default cities are valid places', () => {
  assert.deepEqual(DEFAULT_CITIES.map((city) => city.name), ['İstanbul', 'Ankara', 'İzmir', 'Bursa']);
  assert.ok(DEFAULT_CITIES.every(isPlace));
});

test('world capitals are valid, unique places', () => {
  assert.equal(WORLD_CITIES.length, 8);
  assert.ok(WORLD_CITIES.every(isPlace));
  const all = [...DEFAULT_CITIES, ...WORLD_CITIES];
  assert.equal(new Set(all.map((city) => city.id)).size, all.length);
});

test('names and details follow the language', () => {
  const london = WORLD_CITIES.find((city) => city.id === 'london');
  assert.equal(localized(london, 'name', 'tr'), 'Londra');
  assert.equal(localized(london, 'name', 'en'), 'London');
  assert.equal(placeDetail(london, 'en'), 'United Kingdom');
  const paris = WORLD_CITIES.find((city) => city.id === 'paris');
  assert.equal(localized(paris, 'name', 'en'), 'Paris'); // karşılığı yoksa aynı ad
  assert.equal(placeDetail(DEFAULT_CITIES[1], 'en'), 'Central Anatolia, Türkiye');
});

test('English names survive saving; unknown fields do not', () => {
  const saved = cleanPlace({ ...WORLD_CITIES[0], evil: 'x', regionEn: 42 });
  assert.equal(saved.nameEn, 'London');
  assert.equal('evil' in saved, false);
  assert.equal('regionEn' in saved, false);
});

test('search results keep only known fields', () => {
  const places = parsePlaces({
    results: [{ id: 750269, name: 'Bursa', latitude: 40.19, longitude: 29.06, admin1: 'Bursa İli', country: 'Türkiye', population: 3000000, postcodes: ['16000'] }],
  });
  assert.deepEqual(places, [{ id: '750269', name: 'Bursa', region: 'Bursa İli', country: 'Türkiye', lat: 40.19, lon: 29.06 }]);
});

test('no results field means an empty list', () => {
  assert.deepEqual(parsePlaces({ generationtime_ms: 0.1 }), []);
  assert.deepEqual(parsePlaces(null), []);
});

test('broken results are dropped', () => {
  const places = parsePlaces({
    results: [
      { id: 1, name: '', latitude: 1, longitude: 1 },
      { id: 2, name: 'Nowhere', latitude: 95, longitude: 1 },
      { id: 3, name: 'Text', latitude: '41', longitude: 29 },
      { name: 'No id', latitude: 1, longitude: 1 },
      null,
      { id: 4, name: 'Ok', latitude: -33.9, longitude: 151.2 },
    ],
  });
  assert.deepEqual(places.map((place) => place.name), ['Ok']);
});

test('long names are cut to 100 characters', () => {
  const [place] = parsePlaces({ results: [{ id: 1, name: 'x'.repeat(500), latitude: 1, longitude: 1 }] });
  assert.equal(place.name.length, 100);
});

test('detail line skips empty parts', () => {
  assert.equal(placeDetail({ region: 'Ege', country: 'Türkiye' }), 'Ege, Türkiye');
  assert.equal(placeDetail({ region: '', country: 'France' }), 'France');
});

test('same place by id or by nearly the same coordinates', () => {
  const bursa = DEFAULT_CITIES[3];
  assert.ok(samePlace(bursa, { id: 'other', lat: 40.19559, lon: 29.06013 }));
  assert.ok(!samePlace(bursa, DEFAULT_CITIES[0]));
});

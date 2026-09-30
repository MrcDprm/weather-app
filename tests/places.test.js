import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPlace,
  DEFAULT_CITIES,
  foldText,
  HERE_ID,
  isPlace,
  localized,
  mergePlaces,
  parseLocation,
  parseOpenMeteo,
  parsePhoton,
  placeDetail,
  samePlace,
  WORLD_CITIES,
} from '../src/places.js';

const openMeteo = (results) => ({ results });
const photon = (features) => ({ type: 'FeatureCollection', features });
const feature = (properties, lon, lat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties });

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

test('folding makes Turkish letters and case match', () => {
  assert.equal(foldText('ŞANLIURFA'), 'sanliurfa');
  assert.equal(foldText('ısparta'), foldText('Isparta'));
  assert.equal(foldText('İzmir'), 'izmir');
  assert.equal(foldText('Kadıköy'), 'kadikoy');
  assert.equal(foldText('München'), 'munchen');
});

test('Open-Meteo: only populated places that start with the query, capitals marked as major', () => {
  const results = parseOpenMeteo(openMeteo([
    { id: 2643743, name: 'Londra', latitude: 51.5, longitude: -0.12, feature_code: 'PPLC', country: 'Birleşik Krallık', admin1: 'İngiltere', population: 8961989 },
    { id: 1, name: 'Londra Havalimanı', latitude: 51.4, longitude: -0.4, feature_code: 'AIRP' },
    { id: 2, name: 'Babadağ', latitude: 37.8, longitude: 28.8, feature_code: 'PPLA2' }, // başka adla eşleşmiş
    { id: 3, name: 'Londrina', latitude: -23.3, longitude: -51.1, feature_code: 'PPL', population: 500000 },
  ]), 'londr');
  assert.deepEqual(results.map((result) => [result.place.name, result.major]), [['Londra', true], ['Londrina', false]]);
  assert.deepEqual(results[0].place, { id: '2643743', name: 'Londra', region: 'İngiltere', country: 'Birleşik Krallık', lat: 51.5, lon: -0.12 });
});

test('Open-Meteo: no results field means an empty list', () => {
  assert.deepEqual(parseOpenMeteo({ generationtime_ms: 0.1 }, 'x'), []);
  assert.deepEqual(parseOpenMeteo(null, 'x'), []);
});

test('Photon: Turkish places match without Turkish letters; other countries and fuzzy matches are dropped', () => {
  const places = parsePhoton(photon([
    feature({ osm_type: 'R', osm_id: 1, name: 'Şanlıurfa', state: 'Şanlıurfa', country: 'Türkiye', countrycode: 'TR' }, 38.79, 37.16),
    feature({ osm_type: 'N', osm_id: 2, name: 'Derebaşı', state: 'Van', country: 'Türkiye', countrycode: 'TR' }, 43.3, 38.5),
    feature({ osm_type: 'N', osm_id: 3, name: 'Sanliurfa Street', country: 'Syria', countrycode: 'SY' }, 36.2, 36.1),
  ]), 'sanliurfa');
  assert.deepEqual(places, [{ id: 'osm-R1', name: 'Şanlıurfa', region: 'Şanlıurfa', country: 'Türkiye', lat: 37.16, lon: 38.79 }]);
});

test('Photon: city and district centres come before neighbourhoods', () => {
  const places = parsePhoton(photon([
    feature({ osm_type: 'N', osm_id: 1, name: 'Kadıköy', state: 'Ankara', countrycode: 'TR', type: 'district' }, 33, 40),
    feature({ osm_type: 'R', osm_id: 2, name: 'Kadıköy', state: 'İstanbul', countrycode: 'TR', type: 'city' }, 29.03, 40.99),
    feature({ osm_type: 'N', osm_id: 3, name: 'Kadıköy', state: 'Edirne', countrycode: 'TR', type: 'district' }, 26.5, 41.7),
  ]), 'kadıköy');
  assert.deepEqual(places.map((place) => place.region), ['İstanbul', 'Ankara', 'Edirne']);
});

test('Photon: a neighbourhood shows its district and province', () => {
  const [place] = parsePhoton(photon([
    feature({ osm_type: 'N', osm_id: 9, name: 'Kadıköy', county: 'Çubuk', state: 'Ankara', country: 'Türkiye', countrycode: 'TR' }, 33.0, 40.2),
  ]), 'kadikoy');
  assert.equal(place.region, 'Çubuk, Ankara');
});

test('Photon: broken features are skipped', () => {
  const places = parsePhoton(photon([
    { properties: { osm_type: 'N', osm_id: 1, name: 'Isparta', countrycode: 'TR' } }, // koordinat yok
    feature({ osm_type: 'N', osm_id: 2, name: 'Isparta', countrycode: 'TR' }, 'x', 37.7),
    null,
  ]), 'isp');
  assert.deepEqual(places, []);
  assert.deepEqual(parsePhoton(null, 'x'), []);
});

test('merge: major cities first, then Turkey, then the rest; duplicates only once', () => {
  const isparta = { id: '1', name: 'Isparta', region: 'Isparta', country: 'Türkiye', lat: 37.76, lon: 30.55 };
  const ispartaOsm = { ...isparta, id: 'osm-R5', lat: 37.8 };
  const rome = { id: '2', name: 'Roma', region: 'Lazio', country: 'İtalya', lat: 41.9, lon: 12.5 };
  const small = { id: '3', name: 'Romania', region: '', country: 'X', lat: 1, lon: 1 };
  const merged = mergePlaces(
    [{ place: small, major: false }, { place: rome, major: true }, { place: isparta, major: false }],
    [ispartaOsm],
  );
  assert.deepEqual(merged.map((place) => place.id), ['2', 'osm-R5', '3']);
});

test('merge: at most six results', () => {
  const many = Array.from({ length: 10 }, (_, index) => ({ id: `c${index}`, name: `City ${index}`, region: '', country: '', lat: index, lon: index }));
  assert.equal(mergePlaces([], many).length, 6);
});

test('location name: district and province, or the city when there is no district', () => {
  const kadikoy = parseLocation({
    city: 'İstanbul', principalSubdivision: 'İstanbul', countryName: 'Türkiye',
    localityInfo: { administrative: [{ adminLevel: 2, name: 'Türkiye' }, { adminLevel: 4, name: 'İstanbul' }, { adminLevel: 6, name: 'Kadıköy' }] },
  }, 40.99, 29.03);
  assert.deepEqual(kadikoy, { id: HERE_ID, name: 'Kadıköy', region: 'İstanbul', country: 'Türkiye', lat: 40.99, lon: 29.03 });

  const isparta = parseLocation({ city: 'Isparta', principalSubdivision: 'Isparta', countryName: 'Türkiye', localityInfo: { administrative: [{ adminLevel: 6, name: 'Isparta' }] } }, 37.7, 30.5);
  assert.equal(isparta.region, ''); // il ile aynı ad tekrar yazılmaz

  const london = parseLocation({ city: 'Londra', principalSubdivision: 'İngiltere', countryName: 'Birleşik Krallık' }, 51.5, -0.1);
  assert.equal(london.name, 'Londra');
});

test('location name: nothing useful means null', () => {
  assert.equal(parseLocation({}, 1, 1), null);
  assert.equal(parseLocation(null, 1, 1), null);
});

test('detail line skips empty parts', () => {
  assert.equal(placeDetail({ region: 'Ege', country: 'Türkiye' }), 'Ege, Türkiye');
  assert.equal(placeDetail({ region: '', country: 'France' }), 'France');
});

test('long names are cut to 100 characters', () => {
  assert.equal(cleanPlace({ id: '1', name: 'x'.repeat(500), lat: 1, lon: 1 }).name.length, 100);
});

test('same place by id or by nearly the same coordinates', () => {
  const bursa = DEFAULT_CITIES[3];
  assert.ok(samePlace(bursa, { id: 'other', lat: 40.19559, lon: 29.06013 }));
  assert.ok(!samePlace(bursa, DEFAULT_CITIES[0]));
});

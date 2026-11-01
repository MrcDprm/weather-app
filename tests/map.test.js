import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP_CITIES, mapPosition, TURKEY_PATH } from '../src/map.js';

test('every station on the map is a real province page', () => {
  assert.equal(MAP_CITIES.length, 14);
  for (const { place, side } of MAP_CITIES) {
    assert.ok(place, 'unknown slug');
    assert.equal(place.country, 'Türkiye');
    assert.ok(['above', 'below', 'left', 'right'].includes(side), side);
  }
});

test('stations fall on the map, with the west and north where they belong', () => {
  for (const { place } of MAP_CITIES) {
    const { x, y } = mapPosition(place.lat, place.lon);
    assert.ok(x > 0 && x < 100 && y > 0 && y < 100, `${place.name}: ${x}, ${y}`);
  }
  const at = (slug) => {
    const { place } = MAP_CITIES.find((city) => city.place.id === slug);
    return mapPosition(place.lat, place.lon);
  };
  assert.ok(at('izmir').x < at('ankara').x && at('ankara').x < at('van').x);
  assert.ok(at('trabzon').y < at('ankara').y && at('ankara').y < at('antalya').y);
});

test('stations stay readable: no two sit on top of each other', () => {
  const points = MAP_CITIES.map(({ place }) => mapPosition(place.lat, place.lon));
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance = Math.hypot(points[i].x - points[j].x, (points[i].y - points[j].y) * 0.45);
      assert.ok(distance > 3, `${MAP_CITIES[i].place.name} / ${MAP_CITIES[j].place.name}: ${distance}`);
    }
  }
});

test('the outline is a closed path', () => {
  assert.match(TURKEY_PATH, /^M[\d. L]+Z/);
});

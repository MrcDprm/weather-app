import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barbPaths, compassPoint, coverPath, pressureCenter, skyQuarters, windFeathers } from '../src/station.js';

const kmh = (knots) => knots * 1.852;

test('sky cover: clear is empty, overcast and precipitation are full, unknown stays unset', () => {
  assert.equal(skyQuarters('clear'), 0);
  assert.equal(skyQuarters('partlyCloudy'), 2);
  assert.equal(skyQuarters('rain'), 4);
  assert.equal(skyQuarters('unknown'), null);
});

test('compass: wind direction wraps around and rounds to the nearest of eight points', () => {
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(359), 'N');
  assert.equal(compassPoint(360), 'N');
  assert.equal(compassPoint(45), 'NE');
  assert.equal(compassPoint(67), 'NE');
  assert.equal(compassPoint(68), 'E');
  assert.equal(compassPoint(180), 'S');
  assert.equal(compassPoint(-90), 'W');
  assert.equal(compassPoint(null), null);
  assert.equal(compassPoint(Number.NaN), null);
});

test('pressure centre: below the standard atmosphere is low, from it upwards high', () => {
  assert.equal(pressureCenter(1012.9), 'low');
  assert.equal(pressureCenter(1013), 'high');
  assert.equal(pressureCenter(1030), 'high');
  assert.equal(pressureCenter(null), null);
});

test('feathers: half 5, full 10, flag 50 knots, rounded to the nearest 5', () => {
  assert.deepEqual(windFeathers(0), { calm: true, flags: 0, full: 0, half: 0 });
  assert.deepEqual(windFeathers(kmh(2.9)), { calm: true, flags: 0, full: 0, half: 0 });
  assert.deepEqual(windFeathers(kmh(3)), { calm: false, flags: 0, full: 0, half: 1 });
  assert.deepEqual(windFeathers(kmh(5)), { calm: false, flags: 0, full: 0, half: 1 });
  assert.deepEqual(windFeathers(kmh(10)), { calm: false, flags: 0, full: 1, half: 0 });
  assert.deepEqual(windFeathers(kmh(12)), { calm: false, flags: 0, full: 1, half: 0 });
  assert.deepEqual(windFeathers(kmh(13)), { calm: false, flags: 0, full: 1, half: 1 });
  assert.deepEqual(windFeathers(kmh(65)), { calm: false, flags: 1, full: 1, half: 1 });
  assert.deepEqual(windFeathers(kmh(100)), { calm: false, flags: 2, full: 0, half: 0 });
});

test('feathers: missing or impossible wind gives nothing', () => {
  assert.equal(windFeathers(null), null);
  assert.equal(windFeathers(-4), null);
  assert.equal(windFeathers(Number.POSITIVE_INFINITY), null);
});

test('barb: one line per feather, a filled shape per flag, nothing when calm', () => {
  const lines = (d) => d.match(/M/g)?.length ?? 0;
  assert.deepEqual(barbPaths(windFeathers(0)), { staff: '', flags: '' });
  assert.deepEqual(barbPaths(null), { staff: '', flags: '' });
  assert.equal(lines(barbPaths(windFeathers(kmh(5))).staff), 2); // gövde + yarım tüy
  assert.equal(lines(barbPaths(windFeathers(kmh(15))).staff), 3); // gövde + tam + yarım
  const strong = barbPaths(windFeathers(kmh(60)));
  assert.equal(lines(strong.staff), 2); // gövde + tam
  assert.equal(lines(strong.flags), 1);
});

test('barb: a lone half feather sits below the tip, so it is not read as a full one', () => {
  const half = barbPaths(windFeathers(kmh(5)), { radius: 8, length: 28, spacing: 5 }).staff;
  assert.match(half, /M0 -31L/); // uç -36, yarım tüy bir adım aşağıda
});

test('cover: quarters fill clockwise from noon', () => {
  assert.equal(coverPath(0), '');
  assert.equal(coverPath(null), '');
  assert.equal(coverPath(2, 10), 'M0 -10A10 10 0 0 1 0 10Z');
  assert.match(coverPath(4), /A8 8 0 0 1 0 -8Z$/);
});

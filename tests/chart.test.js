import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHART, chartGeometry } from '../src/chart.js';

const hour = (temp, rain = 0) => ({ time: '2026-09-30T12:00', temp, rain, code: 0 });

test('the warmest hour is at the top of the line area, the coldest at the bottom', () => {
  const points = chartGeometry([hour(10), hour(20), hour(15)]);
  assert.equal(points[1].y, CHART.lineTop);
  assert.equal(points[0].y, CHART.lineTop + CHART.lineHeight);
  assert.equal(points[2].y, CHART.lineTop + CHART.lineHeight / 2);
});

test('points are spread evenly across the width', () => {
  const points = chartGeometry([hour(1), hour(2), hour(3), hour(4)]);
  assert.deepEqual(points.map((point) => point.x), [90, 270, 450, 630]);
});

test('equal temperatures do not divide by zero', () => {
  const points = chartGeometry([hour(18), hour(18)]);
  assert.ok(points.every((point) => Number.isFinite(point.y)));
});

test('rain bars scale with probability; missing rain draws no bar', () => {
  const points = chartGeometry([hour(10, 100), hour(10, 50), hour(10, null)]);
  assert.deepEqual(points.map((point) => point.bar), [CHART.barHeight, CHART.barHeight / 2, 0]);
});

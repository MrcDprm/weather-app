import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addRecent, loadSettings, MAX_RECENT, MAX_SAVED, saveSettings, STORAGE_KEY, toggleSaved } from '../src/storage.js';

function fakeStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

const city = (id, lat = 1, lon = 1) => ({ id, name: `City ${id}`, region: '', country: '', lat, lon });

test('defaults when nothing is stored', () => {
  assert.deepEqual(loadSettings(fakeStorage(), 'en'), {
    lang: 'en', theme: 'dark', tempUnit: 'c', windUnit: 'kmh', saved: [], recent: [],
  });
});

test('broken JSON and unknown values fall back to defaults', () => {
  assert.equal(loadSettings(fakeStorage('{not json')).tempUnit, 'c');
  const settings = loadSettings(fakeStorage(JSON.stringify({ lang: 'de', theme: 'pink', tempUnit: 'k', windUnit: 5, saved: 'x' })));
  assert.deepEqual(settings, { lang: 'tr', theme: 'dark', tempUnit: 'c', windUnit: 'kmh', saved: [], recent: [] });
});

test('stored cities are validated and cleaned', () => {
  const stored = { saved: [city('a'), { id: 'b', name: 'Bad', lat: 200, lon: 1 }, { ...city('c', 2, 2), evil: '<script>' }] };
  const { saved } = loadSettings(fakeStorage(JSON.stringify(stored)));
  assert.deepEqual(saved.map((place) => place.id), ['a', 'c']);
  assert.equal('evil' in saved[1], false);
});

test('lists are capped when read', () => {
  const many = Array.from({ length: 20 }, (_, index) => city(`c${index}`, index, index));
  const settings = loadSettings(fakeStorage(JSON.stringify({ saved: many, recent: many })));
  assert.equal(settings.saved.length, MAX_SAVED);
  assert.equal(settings.recent.length, MAX_RECENT);
});

test('a closed storage does not crash', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadSettings(broken).lang, 'tr');
  assert.doesNotThrow(() => saveSettings({ lang: 'en' }, broken));
  assert.doesNotThrow(() => saveSettings({ lang: 'en' }, null));
});

test('save and load round trip', () => {
  const storage = fakeStorage();
  const settings = { ...loadSettings(storage), tempUnit: 'f', saved: [city('a')] };
  saveSettings(settings, storage);
  assert.deepEqual(loadSettings(storage), settings);
});

test('toggleSaved adds to the front, removes on second click, drops the oldest when full', () => {
  let list = toggleSaved([], city('a', 1, 1));
  list = toggleSaved(list, city('b', 2, 2));
  assert.deepEqual(list.map((place) => place.id), ['b', 'a']);
  assert.deepEqual(toggleSaved(list, city('a', 1, 1)).map((place) => place.id), ['b']);

  const full = Array.from({ length: MAX_SAVED }, (_, index) => city(`c${index}`, index, index));
  const next = toggleSaved(full, city('new', 50, 50));
  assert.equal(next.length, MAX_SAVED);
  assert.equal(next[0].id, 'new');
  assert.ok(!next.some((place) => place.id === `c${MAX_SAVED - 1}`));
});

test('addRecent moves a repeated city to the front without duplicates', () => {
  let list = [];
  for (const id of ['a', 'b', 'c']) list = addRecent(list, city(id, id.charCodeAt(0), 1));
  list = addRecent(list, city('a', 'a'.charCodeAt(0), 1));
  assert.deepEqual(list.map((place) => place.id), ['a', 'c', 'b']);
});

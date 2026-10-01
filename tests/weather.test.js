import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertTemp, convertWind, describeWeather, localTime, parseDays, parseForecast, parseHours } from '../src/weather.js';

const hourly = {
  time: ['2026-09-30T12:00', '2026-09-30T13:00', '2026-09-30T14:00', '2026-09-30T15:00', '2026-09-30T16:00'],
  temperature_2m: [20, 21, 22, 23, 24],
  precipitation_probability: [0, 5, 10, null, 30],
  weather_code: [0, 1, 2, 3, 61],
};

test('weather codes map to a text key and an icon; night uses the moon', () => {
  assert.deepEqual(describeWeather(0), { key: 'condition_clear', icon: 'sun' });
  assert.deepEqual(describeWeather(0, false), { key: 'condition_clear', icon: 'moon' });
  assert.deepEqual(describeWeather(2, false), { key: 'condition_partlyCloudy', icon: 'cloudMoon' });
  assert.deepEqual(describeWeather(81), { key: 'condition_showers', icon: 'rain' });
  assert.deepEqual(describeWeather(95), { key: 'condition_storm', icon: 'storm' });
});

test('unknown or missing codes do not crash', () => {
  assert.deepEqual(describeWeather(12345), { key: 'condition_unknown', icon: 'cloud' });
  assert.deepEqual(describeWeather(null), { key: 'condition_unknown', icon: 'cloud' });
});

test('temperature conversion rounds and never shows -0', () => {
  assert.equal(convertTemp(21.6, 'c'), 22);
  assert.equal(convertTemp(0, 'f'), 32);
  assert.equal(convertTemp(100, 'f'), 212);
  assert.equal(convertTemp(-40, 'f'), -40);
  assert.ok(Object.is(convertTemp(-0.3, 'c'), 0));
});

test('wind conversion', () => {
  assert.equal(convertWind(10.4, 'kmh'), 10);
  assert.equal(convertWind(100, 'mph'), 62);
});

test('hours start at the current hour, even mid-hour', () => {
  const hours = parseHours(hourly, '2026-09-30T13:45', 3);
  assert.deepEqual(hours.map((hour) => hour.time), ['2026-09-30T13:00', '2026-09-30T14:00', '2026-09-30T15:00']);
  assert.equal(hours[2].rain, null); // eksik yağış verisi null olur, satır atılmaz
});

test('hours: bad data is skipped, missing block gives an empty list', () => {
  const broken = { ...hourly, temperature_2m: [20, 'x', 22, NaN, 24] };
  assert.deepEqual(parseHours(broken, '2026-09-30T12:00').map((hour) => hour.temp), [20, 22, 24]);
  assert.deepEqual(parseHours(undefined, '2026-09-30T12:00'), []);
  assert.deepEqual(parseHours(hourly, '2026-10-05T00:00'), []);
});

test('days keep the first five valid entries', () => {
  const daily = {
    time: ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
    weather_code: [0, 1, 2, 3, 61, 71],
    temperature_2m_max: [25, 24, null, 22, 21, 20],
    temperature_2m_min: [15, 14, 13, 12, 11, 10],
    precipitation_probability_max: [0, 10, 20, 30, 40, 50],
  };
  const days = parseDays(daily);
  assert.equal(days.length, 4); // 5 günden biri bozuk olduğu için atıldı
  assert.deepEqual(days[0], { date: '2026-09-30', code: 0, max: 25, min: 15, rain: 0 });
});

test('forecast needs a current temperature', () => {
  assert.equal(parseForecast(null), null);
  assert.equal(parseForecast({ current: { time: '2026-09-30T13:45' } }), null);
  assert.equal(parseForecast({ current: { time: 5, temperature_2m: 20 } }), null);
});

test('forecast: current values are validated, extras are ignored', () => {
  const forecast = parseForecast({
    current: { time: '2026-09-30T13:45', temperature_2m: 21.3, apparent_temperature: 'hot', relative_humidity_2m: 60, wind_speed_10m: 12, weather_code: 2, is_day: 0, extra: '<b>' },
    hourly,
  });
  assert.deepEqual(forecast.current, { time: '2026-09-30T13:45', temp: 21.3, feels: null, humidity: 60, wind: 12, code: 2, isDay: false });
  assert.equal(forecast.hours.length, 4);
  assert.deepEqual(forecast.days, []);
});

test('forecast: time zone and UTC offset are validated', () => {
  const current = { time: '2026-10-01T22:00', temperature_2m: 14 };
  const good = parseForecast({ current, timezone: 'Europe/Istanbul', utc_offset_seconds: 10800 });
  assert.equal(good.timeZone, 'Europe/Istanbul');
  assert.equal(good.utcOffset, 10800);
  const bad = parseForecast({ current, timezone: '<script>', utc_offset_seconds: 999999 });
  assert.equal(bad.timeZone, null);
  assert.equal(bad.utcOffset, null);
});

test('local time is the current time in the city, not the 15-minute data slot', () => {
  const now = Date.UTC(2026, 9, 1, 19, 13, 40); // 22:13 in Istanbul (UTC+3)
  assert.equal(localTime({ timeZone: 'Europe/Istanbul', utcOffset: 10800 }, now), '22:13');
  assert.equal(localTime({ timeZone: 'Asia/Tokyo', utcOffset: 32400 }, now), '04:13');
  assert.equal(localTime({ timeZone: 'Asia/Kolkata', utcOffset: 19800 }, now), '00:43');
  // Saat dilimi tanınmazsa UTC farkı kullanılır
  assert.equal(localTime({ timeZone: 'Mars/Olympus', utcOffset: 10800 }, now), '22:13');
  assert.equal(localTime({ timeZone: null, utcOffset: -18000 }, now), '14:13');
  assert.equal(localTime({ timeZone: null, utcOffset: null }, now), null);
});

test('local time follows daylight saving time', () => {
  const summer = Date.UTC(2026, 6, 1, 12, 0); // Londra yazın UTC+1
  const winter = Date.UTC(2026, 11, 1, 12, 0); // kışın UTC+0
  assert.equal(localTime({ timeZone: 'Europe/London', utcOffset: 0 }, summer), '13:00');
  assert.equal(localTime({ timeZone: 'Europe/London', utcOffset: 0 }, winter), '12:00');
});

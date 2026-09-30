// Open-Meteo istekleri. Anahtar gerekmez; yanıtlar weather.js ve places.js ile doğrulanır.
import { parseForecast } from './weather.js';
import { parsePlaces } from './places.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 8000;

const CURRENT = 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day';
const HOURLY = 'temperature_2m,precipitation_probability,weather_code';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max';

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const coordinates = (places, key) => places.map((place) => place[key].toFixed(4)).join(',');

/** Birden çok şehrin anlık havası tek istekte. Sonuç dizisi şehirlerle aynı sırada; bozuk yanıt null olur. */
export async function fetchCurrent(places) {
  const params = new URLSearchParams({
    latitude: coordinates(places, 'lat'),
    longitude: coordinates(places, 'lon'),
    current: CURRENT,
    timezone: 'auto',
  });
  const data = await getJson(`${FORECAST_URL}?${params}`);
  const list = Array.isArray(data) ? data : [data]; // tek konumda dizi değil nesne döner
  return places.map((place, index) => parseForecast(list[index]));
}

/** Tek şehrin anlık havası, önümüzdeki 24 saat ve 5 günlük tahmini. */
export async function fetchForecast(place) {
  const params = new URLSearchParams({
    latitude: place.lat.toFixed(4),
    longitude: place.lon.toFixed(4),
    current: CURRENT,
    hourly: HOURLY,
    daily: DAILY,
    timezone: 'auto',
    forecast_days: '5',
  });
  const forecast = parseForecast(await getJson(`${FORECAST_URL}?${params}`));
  if (!forecast) throw new Error('Invalid forecast');
  return forecast;
}

/** Şehir arama; sonuçlar kullanıcının dilinde gelir. */
export async function searchPlaces(query, lang) {
  const params = new URLSearchParams({ name: query, count: '6', language: lang, format: 'json' });
  return parsePlaces(await getJson(`${GEOCODING_URL}?${params}`));
}
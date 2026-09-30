// Şehirler: ana sayfadaki sabit şehirler, arama sonuçlarının doğrulanması ve karşılaştırma.
const MAX_TEXT = 100;

// Sabit şehirlerin İngilizce adları ...En alanlarında; aramadan gelen şehirler zaten seçilen dilde gelir
export const DEFAULT_CITIES = [
  { id: 'istanbul', name: 'İstanbul', region: 'Marmara', country: 'Türkiye', lat: 41.0082, lon: 28.9784 },
  { id: 'ankara', name: 'Ankara', region: 'İç Anadolu', regionEn: 'Central Anatolia', country: 'Türkiye', lat: 39.9334, lon: 32.8597 },
  { id: 'izmir', name: 'İzmir', region: 'Ege', regionEn: 'Aegean', country: 'Türkiye', lat: 38.4237, lon: 27.1428 },
  { id: 'bursa', name: 'Bursa', region: 'Marmara', country: 'Türkiye', lat: 40.1885, lon: 29.061 },
];

export const WORLD_CITIES = [
  { id: 'london', name: 'Londra', nameEn: 'London', country: 'Birleşik Krallık', countryEn: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { id: 'paris', name: 'Paris', country: 'Fransa', countryEn: 'France', lat: 48.8566, lon: 2.3522 },
  { id: 'berlin', name: 'Berlin', country: 'Almanya', countryEn: 'Germany', lat: 52.52, lon: 13.405 },
  { id: 'rome', name: 'Roma', nameEn: 'Rome', country: 'İtalya', countryEn: 'Italy', lat: 41.9028, lon: 12.4964 },
  { id: 'madrid', name: 'Madrid', country: 'İspanya', countryEn: 'Spain', lat: 40.4168, lon: -3.7038 },
  { id: 'washington', name: 'Washington', country: 'ABD', countryEn: 'United States', lat: 38.9072, lon: -77.0369 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japonya', countryEn: 'Japan', lat: 35.6762, lon: 139.6503 },
  { id: 'beijing', name: 'Pekin', nameEn: 'Beijing', country: 'Çin', countryEn: 'China', lat: 39.9042, lon: 116.4074 },
];

const text = (value) => (typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '');
const inRange = (value, limit) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/** Bir nesnenin geçerli bir şehir olup olmadığı (localStorage'dan okunan kayıtlar için de kullanılır). */
export function isPlace(value) {
  return (
    typeof value?.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 40 &&
    text(value.name).length > 0 &&
    inRange(value.lat, 90) &&
    inRange(value.lon, 180)
  );
}

/** Sadece bilinen alanları alır; fazladan gelen alanlar atılır. İngilizce adlar varsa korunur. */
export function cleanPlace(value) {
  const place = {
    id: value.id,
    name: text(value.name),
    region: text(value.region),
    country: text(value.country),
    lat: value.lat,
    lon: value.lon,
  };
  for (const key of ['nameEn', 'regionEn', 'countryEn']) {
    if (text(value[key])) place[key] = text(value[key]);
  }
  return place;
}

/** Alanın seçilen dildeki hâli: İngilizcede nameEn gibi bir karşılık varsa o kullanılır. */
export function localized(place, field, lang) {
  return (lang === 'en' && place[`${field}En`]) || place[field] || '';
}

/** Open-Meteo şehir arama yanıtı. Sonuç yoksa "results" alanı hiç gelmez. */
export function parsePlaces(raw) {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results
    .map((result) => ({
      id: String(result?.id ?? ''),
      name: result?.name,
      region: result?.admin1,
      country: result?.country,
      lat: result?.latitude,
      lon: result?.longitude,
    }))
    .filter(isPlace)
    .map(cleanPlace);
}

/** "Ege, Türkiye" gibi ikinci satır; boş alanlar atlanır. */
export function placeDetail(place, lang = 'tr') {
  return [localized(place, 'region', lang), localized(place, 'country', lang)].filter(Boolean).join(', ');
}

/** İki kayıt aynı yer mi? Kimlik farklı olsa da koordinatı çok yakınsa aynı sayılır. */
export function samePlace(a, b) {
  return a.id === b.id || (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01);
}
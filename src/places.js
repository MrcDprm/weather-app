// Şehirler: ana sayfadaki sabit şehirler, arama sonuçlarının doğrulanması ve karşılaştırma.
const MAX_TEXT = 100;
const MAX_RESULTS = 6;
const MAJOR_POPULATION = 1_000_000;
export const HERE_ID = 'here'; // "Konumumu kullan" ile açılan yer

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

/** Arama karşılaştırması için harfleri sadeleştirir: "Şanlıurfa", "sanliurfa" ve "ŞANLIURFA" aynı olur. */
export function foldText(value) {
  return value
    .toLocaleLowerCase('tr')
    .normalize('NFD') // ş → s + çengel işareti; işaretler bir sonraki satırda silinir
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

const matches = (name, query) => foldText(name).startsWith(foldText(query));

/** Open-Meteo (GeoNames) sonuçları: dünya şehirleri, adları seçilen dilde gelir ("Londra", "Münih").
 *  Sadece yerleşim yerleri alınır (havalimanı, baraj, dağ değil). */
export function parseOpenMeteo(raw, query) {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results
    .filter((result) => String(result?.feature_code ?? '').startsWith('PPL') && matches(text(result.name), query))
    .map((result) => ({
      place: {
        id: String(result.id ?? ''),
        name: result.name,
        region: result.admin1,
        country: result.country,
        lat: result.latitude,
        lon: result.longitude,
      },
      // Başkentler ve büyük şehirler listenin başına alınır
      major: result.feature_code === 'PPLC' || (Number.isFinite(result.population) && result.population >= MAJOR_POPULATION),
    }))
    .filter((result) => isPlace(result.place))
    .map((result) => ({ place: cleanPlace(result.place), major: result.major }));
}

// Photon sonuç türleri: il ve ilçe merkezleri (city, county) mahallelerden (district) önce gelir
const PHOTON_ORDER = { city: 0, county: 1 };
const photonRank = (feature) => PHOTON_ORDER[feature.properties.type] ?? 2;

/** Photon (OpenStreetMap) sonuçları: sadece Türkiye; il ve ilçeleri güncel OSM verisinden bulur. */
export function parsePhoton(raw, query) {
  const features = Array.isArray(raw?.features) ? raw.features : [];
  return features
    .filter((feature) => feature?.properties?.countrycode === 'TR' && matches(text(feature.properties.name), query))
    .sort((a, b) => photonRank(a) - photonRank(b)) // sort sıralamayı korur: aynı türdekiler Photon'un sırasında kalır
    .map((feature) => {
      const { osm_type: type, osm_id: osmId, name, county, state, country } = feature.properties;
      const [lon, lat] = Array.isArray(feature.geometry?.coordinates) ? feature.geometry.coordinates : [];
      // İlçedeki bir mahalleyse "Çubuk, Ankara", ilçe ya da ilse sadece "Ankara"
      const region = county && county !== name && county !== state ? `${county}, ${state ?? ''}` : state;
      return { id: `osm-${type}${osmId}`, name, region, country, lat, lon };
    })
    .filter(isPlace)
    .map(cleanPlace);
}

const sameResult = (a, b) => foldText(a.name) === foldText(b.name) && Math.abs(a.lat - b.lat) < 0.3 && Math.abs(a.lon - b.lon) < 0.3;

/** İki kaynağı birleştirir: önce büyük şehirler, sonra Türkiye'deki yerler, sonra diğerleri; aynı yer bir kez. */
export function mergePlaces(openMeteo, photon, max = MAX_RESULTS) {
  const ordered = [
    ...openMeteo.filter((result) => result.major).map((result) => result.place),
    ...photon,
    ...openMeteo.filter((result) => !result.major).map((result) => result.place),
  ];
  const merged = [];
  for (const place of ordered) {
    if (merged.length === max) break;
    if (!merged.some((other) => sameResult(other, place))) merged.push(place);
  }
  return merged;
}

/** BigDataCloud ters arama yanıtından konumun adı: ilçe varsa ilçe, yoksa şehir. Bulunamazsa null. */
export function parseLocation(raw, lat, lon) {
  const levels = Array.isArray(raw?.localityInfo?.administrative) ? raw.localityInfo.administrative : [];
  const district = levels.find((level) => level?.adminLevel === 6)?.name;
  const name = text(district) || text(raw?.city) || text(raw?.locality);
  if (!name) return null;
  const province = text(raw?.principalSubdivision);
  return cleanPlace({ id: HERE_ID, name, region: province === name ? '' : province, country: raw?.countryName, lat, lon });
}

/** "Ege, Türkiye" gibi ikinci satır; boş alanlar atlanır. */
export function placeDetail(place, lang = 'tr') {
  return [localized(place, 'region', lang), localized(place, 'country', lang)].filter(Boolean).join(', ');
}

/** İki kayıt aynı yer mi? Kimlik farklı olsa da koordinatı çok yakınsa aynı sayılır. */
export function samePlace(a, b) {
  return a.id === b.id || (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01);
}

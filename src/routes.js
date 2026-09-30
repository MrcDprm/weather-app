// Uygulamanın adresleri: her il ve dünya başkenti kendi sayfasına sahip (/istanbul, /londra).
// Hem tarayıcı (main.js) hem sunucu fonksiyonu (api/page.js) kullanır; başlıklar iki tarafta aynı olur.
import { PROVINCES } from './provinces.js';
import { WORLD_CITIES } from './places.js';

export const ORIGIN = 'https://weather.miracdeprem.com';
const NEAR = 0.05; // derece; yaklaşık 5 km

const CAPITAL_SLUGS = {
  london: 'londra',
  paris: 'paris',
  berlin: 'berlin',
  rome: 'roma',
  madrid: 'madrid',
  washington: 'washington',
  tokyo: 'tokyo',
  beijing: 'pekin',
};

/** Adresi olan yerler: 81 il ve 8 başkent. İl kimliği adresiyle aynıdır ("istanbul"). */
export const ROUTES = [
  ...PROVINCES.map(({ slug, name, nameEn, region, regionEn, lat, lon }) => ({
    slug,
    place: { id: slug, name, ...(nameEn && { nameEn }), region, regionEn, country: 'Türkiye', lat, lon },
  })),
  ...WORLD_CITIES.map((city) => ({ slug: CAPITAL_SLUGS[city.id], place: city })),
];

const BY_SLUG = new Map(ROUTES.map((route) => [route.slug, route.place]));

export const placeForSlug = (slug) => BY_SLUG.get(slug) ?? null;

/** "/istanbul" → İstanbul; adresi olmayan yol için null. */
export function placeFromPath(pathname) {
  return placeForSlug(pathname.replace(/^\/+|\/+$/g, '').toLowerCase());
}

/** Bir yerin adresi: kimliği ya da ~5 km yakınlığı eşleşiyorsa ("Isparta" araması → "isparta"). */
export function slugForPlace(place) {
  const route = ROUTES.find(
    (item) => item.place.id === place.id || (Math.abs(item.place.lat - place.lat) < NEAR && Math.abs(item.place.lon - place.lon) < NEAR),
  );
  return route?.slug ?? null;
}

export const pathFor = (slug) => (slug ? `/${slug}` : '/');

export const SITEMAP_PATHS = ['/', ...ROUTES.map((route) => pathFor(route.slug))];

const HOME = {
  tr: {
    title: 'Hava Durumu – İl ve İlçe Arama, Saatlik ve 5 Günlük Tahmin | Miraç Deprem',
    description:
      'Ücretsiz hava durumu: 81 il, ilçeler ve dünya şehirleri için anlık hava, saatlik sıcaklık ve yağış grafiği, 5 günlük tahmin. Konumunla ya da şehir arayarak.',
  },
  en: {
    title: 'Weather App – City Search, Hourly and 5-Day Forecast | Miraç Deprem',
    description:
      'Free weather app: current conditions, an hourly temperature and rain chart and a 5-day forecast for every city in Türkiye and around the world.',
  },
};

/** Sekme başlığı ve açıklama. name boşsa ana sayfa metni döner. */
export function pageMeta(name, lang) {
  if (!name) return HOME[lang];
  return lang === 'en'
    ? {
        title: `${name} Weather – Hourly and 5-Day Forecast`,
        description: `Current weather in ${name}: temperature, feels like, humidity and wind, a 24-hour temperature and rain chart and a 5-day forecast.`,
      }
    : {
        title: `${name} Hava Durumu – Saatlik ve 5 Günlük Tahmin`,
        description: `${name} için anlık hava durumu, hissedilen sıcaklık, nem ve rüzgâr; 24 saatlik sıcaklık ve yağış grafiği ile 5 günlük hava tahmini.`,
      };
}

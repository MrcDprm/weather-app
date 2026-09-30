// Her adres için sayfa HTML'i: şablona o sayfanın başlığı, açıklaması ve yapılandırılmış verisi eklenir.
import { buildHead, buildSitemap, injectHead, localeUrls } from './seo-head.js';
import { localized } from '../src/places.js';
import { ORIGIN, pageMeta, pathFor, placeForSlug, SITEMAP_PATHS } from '../src/routes.js';

const SITE_NAME = { tr: 'Hava Durumu', en: 'Weather App' };
const IMAGE = `${ORIGIN}/og-image.png`;
const APP_ID = `${ORIGIN}/#app`;
const AUTHOR = { '@type': 'Person', name: 'Miraç Deprem', url: 'https://www.miracdeprem.com' };

function appSchema(lang) {
  const { description } = pageMeta(null, lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': APP_ID,
    name: SITE_NAME[lang],
    alternateName: SITE_NAME[lang === 'en' ? 'tr' : 'en'],
    url: `${ORIGIN}/`,
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
    isAccessibleForFree: true,
    inLanguage: ['tr', 'en'],
    screenshot: IMAGE,
    author: AUTHOR,
    sameAs: ['https://github.com/MrcDprm/weather-app', 'https://www.miracdeprem.com/projects/hava-durumu'],
  };
}

function cityPageSchemas(place, path, lang, meta) {
  const url = lang === 'en' ? localeUrls(ORIGIN, path).en : localeUrls(ORIGIN, path).tr;
  const name = localized(place, 'name', lang);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url,
      inLanguage: lang === 'en' ? 'en-US' : 'tr-TR',
      isPartOf: { '@id': APP_ID },
      about: {
        '@type': 'Place',
        name,
        geo: { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lon },
        address: {
          '@type': 'PostalAddress',
          addressRegion: localized(place, 'region', lang) || undefined,
          addressCountry: localized(place, 'country', lang),
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME[lang], item: lang === 'en' ? `${ORIGIN}/?lang=en` : `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name, item: url },
      ],
    },
  ];
}

/**
 * İstenen adresin HTML'i ve durum kodu. slug boşsa ana sayfa; bilinmeyen adreste uygulama yine açılır
 * ama 404 döner ve dizine eklenmez (adres metni sayfaya hiç yazılmaz).
 */
export function renderPage(template, slug, lang) {
  const place = slug ? placeForSlug(slug) : null;
  const known = !slug || Boolean(place);
  const path = place ? pathFor(slug) : '/';
  const meta = pageMeta(place ? localized(place, 'name', lang) : null, lang);
  const head = buildHead({
    origin: ORIGIN,
    path,
    lang,
    ...meta,
    siteName: SITE_NAME[lang],
    image: IMAGE,
    schemas: place ? cityPageSchemas(place, path, lang, meta) : [appSchema(lang)],
    index: known,
  });
  return { status: known ? 200 : 404, html: injectHead(template, head, lang) };
}

export const renderSitemap = () => buildSitemap(ORIGIN, SITEMAP_PATHS);

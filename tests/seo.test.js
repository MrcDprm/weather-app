// Adresler (routes.js), <head> üretimi (seo-head.js) ve sayfa fonksiyonu (api/page.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVINCES } from '../src/provinces.js';
import { isPlace } from '../src/places.js';
import { pageMeta, placeFromPath, ROUTES, SITEMAP_PATHS, slugForPlace } from '../src/routes.js';
import { buildHead, escapeHtml, injectHead } from '../lib/seo-head.js';
import { renderPage } from '../lib/page-seo.js';
import { GET } from '../api/page.js';

const TEMPLATE = '<!doctype html>\n<html lang="tr">\n  <head>\n    <!-- seo -->\n    <title>x</title>\n    <!-- /seo -->\n  </head>\n  <body>gövde</body>\n</html>';

test('81 provinces with unique plates and slugs, all inside Türkiye', () => {
  assert.equal(PROVINCES.length, 81);
  assert.deepEqual(PROVINCES.map((p) => p.plate), Array.from({ length: 81 }, (_, i) => i + 1));
  assert.equal(new Set(PROVINCES.map((p) => p.slug)).size, 81);
  for (const p of PROVINCES) {
    assert.match(p.slug, /^[a-z0-9-]+$/);
    assert.ok(p.lat > 35.8 && p.lat < 42.2 && p.lon > 25.6 && p.lon < 44.9, p.name);
  }
});

test('every route is a valid place with a unique address', () => {
  assert.equal(ROUTES.length, 89);
  assert.equal(new Set(ROUTES.map((r) => r.slug)).size, ROUTES.length);
  assert.ok(ROUTES.every((r) => isPlace(r.place)));
  assert.equal(SITEMAP_PATHS.length, 90);
});

test('paths find their place', () => {
  assert.equal(placeFromPath('/istanbul').name, 'İstanbul');
  assert.equal(placeFromPath('/Londra/').nameEn, 'London');
  assert.equal(placeFromPath('/'), null);
  assert.equal(placeFromPath('/xyz'), null);
});

test('a searched place gets the address of the nearby province', () => {
  assert.equal(slugForPlace({ id: 'osm-R1', lat: 37.77, lon: 30.55 }), 'isparta');
  assert.equal(slugForPlace({ id: 'london', lat: 0, lon: 0 }), 'londra');
  assert.equal(slugForPlace({ id: 'x', lat: 40.99, lon: 29.3 }), null); // İstanbul merkezine uzak bir ilçe
});

test('page titles in both languages', () => {
  assert.equal(pageMeta('Ankara', 'tr').title, 'Ankara Hava Durumu – Saatlik ve 5 Günlük Tahmin');
  assert.equal(pageMeta('Ankara', 'en').title, 'Ankara Weather – Hourly and 5-Day Forecast');
  assert.match(pageMeta(null, 'tr').title, /^Hava Durumu/);
});

test('head values are escaped', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  const head = buildHead({
    origin: 'https://example.com', path: '/', lang: 'tr', title: 'A<b>', description: '"x"', siteName: 's', image: 'i',
    schemas: [{ name: '</script><script>alert(1)</script>' }],
  });
  assert.ok(!head.includes('<b>'));
  assert.ok(!head.includes('</script><script>'));
});

test('head is injected and the page language set', () => {
  const html = injectHead(TEMPLATE, '    <title>Yeni</title>', 'en');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Yeni<\/title>/);
  assert.ok(!html.includes('<title>x</title>'));
  assert.ok(html.includes('<body>gövde</body>'));
  assert.throws(() => injectHead('<html></html>', '', 'tr'));
});

test('city page: canonical, hreflang and structured data', () => {
  const { status, html } = renderPage(TEMPLATE, 'izmir', 'tr');
  assert.equal(status, 200);
  assert.match(html, /<link rel="canonical" href="https:\/\/weather\.miracdeprem\.com\/izmir" \/>/);
  assert.match(html, /hreflang="en" href="https:\/\/weather\.miracdeprem\.com\/izmir\?lang=en"/);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(schemas.map((s) => s['@type']), ['WebPage', 'BreadcrumbList']);
  assert.equal(schemas[0].about.name, 'İzmir');
});

test('unknown address: 404, not indexed, address not written into the page', () => {
  const { status, html } = renderPage(TEMPLATE, 'bilinmeyen', 'tr');
  assert.equal(status, 404);
  assert.match(html, /noindex/);
  assert.ok(!html.includes('rel="canonical"'));
});

test('page function serves pages and the sitemap', async () => {
  const home = await GET(new Request('https://x/api/page'));
  assert.equal(home.status, 200);
  assert.match(await home.text(), /WebApplication/);

  const odd = await GET(new Request('https://x/api/page?slug=%3Cscript%3E'));
  assert.equal(odd.status, 404);
  assert.ok(!(await odd.text()).includes('<script>alert'));

  const sitemap = await (await GET(new Request('https://x/api/page?sitemap=1'))).text();
  assert.equal((sitemap.match(/<url>/g) ?? []).length, 180);
  assert.match(sitemap, /<loc>https:\/\/weather\.miracdeprem\.com\/sanliurfa<\/loc>/);
});

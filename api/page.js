// Sayfa adresleri (/, /istanbul, /londra …) ve sitemap.xml bu fonksiyondan gelir (bkz. vercel.json rewrites).
// Şablon app.html; <head> bölümü her adres için doldurulur, gövde değişmez.
import { readFile } from 'node:fs/promises';
import { renderPage, renderSitemap } from '../lib/page-seo.js';

const CACHE = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
let template;

async function respond(request) {
  const params = new URL(request.url).searchParams;
  if (params.get('sitemap') === '1') {
    return new Response(renderSitemap(), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE },
    });
  }

  template ??= await readFile(new URL('../app.html', import.meta.url), 'utf8');
  const slug = (params.get('slug') ?? '').toLowerCase();
  const lang = params.get('lang') === 'en' ? 'en' : 'tr';
  const { status, html } = renderPage(template, /^[a-z0-9-]{1,40}$/.test(slug) ? slug : slug ? 'bilinmeyen' : '', lang);
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE },
  });
}

/**
 * Sayfa kurulurken beklenmedik bir hata olursa site kapanmasın: şablon okunabildiyse olduğu gibi
 * (SEO eki olmadan, dizine eklenmeyen hâliyle) sunulur, okunamadıysa statik yedeğe (/app.html) gidilir.
 * Hatanın ayrıntısı kullanıcıya değil, sunucu loguna yazılır.
 */
export async function GET(request) {
  try {
    return await respond(request);
  } catch (error) {
    console.error('Page render failed:', error);
    if (template) {
      return new Response(template, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    return Response.redirect(new URL('/app.html', request.url), 302);
  }
}

// Yerel geliştirme sunucusu: proje klasörünü sunar, vercel.json'daki güvenlik başlıklarını (CSP dahil) ekler
// ve "rewrites" kurallarını Vercel gibi uygular (önce dosya, yoksa kural). Kural /api/… adresine giderse
// ilgili fonksiyon dosyası (api/page.js gibi) çağrılır. Böylece canlıdaki davranış yerelde de görülür.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 5174;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const vercel = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
// Yerelde site localhost'tan açıldığı için ACAO başlığı eklenmez
const headers = vercel.headers[0].headers.filter(({ key }) => key !== 'Access-Control-Allow-Origin');

/** "/:slug([a-z0-9-]+)" gibi Vercel kaynak kalıbını düzenli ifadeye çevirir (bu projelerde kullanılan kadarı). */
function toRegExp(source) {
  const pattern = source.replace(/:(\w+)(\(([^)]+)\))?/g, (match, name, group, regex) => `(?<${name}>${regex ?? '[^/]+'})`);
  return new RegExp(`^${pattern}$`);
}
const rewrites = (vercel.rewrites ?? []).map((rule) => ({ ...rule, regex: toRegExp(rule.source) }));

/** Vercel gibi: istek adresindeki sorgu parametreleri hedefe eklenir. */
function rewriteTarget(path, search) {
  for (const rule of rewrites) {
    const match = path.match(rule.regex);
    if (!match) continue;
    const target = new URL(rule.destination.replace(/:(\w+)/g, (m, name) => match.groups?.[name] ?? ''), 'http://localhost');
    for (const [key, value] of new URLSearchParams(search)) if (!target.searchParams.has(key)) target.searchParams.set(key, value);
    return target;
  }
  return null;
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function send(response, status, type, body) {
  for (const { key, value } of headers) response.setHeader(key, value);
  response.writeHead(status, { 'Content-Type': type }).end(body);
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  const file = normalize(join(ROOT, path));
  // Klasör dışına çıkma (../) ve gizli dosyalar (.git, .env) engellenir
  if (!file.startsWith(ROOT) || file.slice(ROOT.length).split(sep).some((part) => part.startsWith('.') && part.length > 1)) {
    response.writeHead(404).end();
    return;
  }
  try {
    if (path !== '/' && (await isFile(file))) {
      await send(response, 200, TYPES[extname(file)] ?? 'application/octet-stream', await readFile(file));
      return;
    }
    const target = rewriteTarget(path, url.search);
    const fnMatch = target?.pathname.match(/^\/api\/([\w-]+)$/);
    if (!fnMatch) {
      response.writeHead(404).end();
      return;
    }
    const fn = await import(pathToFileURL(join(ROOT, 'api', `${fnMatch[1]}.js`)).href);
    const result = await fn.GET(new Request(target));
    await send(response, result.status, result.headers.get('content-type') ?? 'text/plain', Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error(error);
    response.writeHead(500).end();
  }
}).listen(PORT, () => {
  console.log(`Weather App: http://localhost:${PORT}`);
});

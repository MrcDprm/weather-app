// Yerel geliştirme sunucusu: proje klasörünü sunar ve vercel.json'daki güvenlik başlıklarını
// (CSP dahil) aynen ekler; böylece canlıda engellenecek bir şey yerelde de fark edilir.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 5174;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

const vercel = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
// Yerelde site localhost'tan açıldığı için ACAO başlığı eklenmez
const headers = vercel.headers[0].headers.filter(({ key }) => key !== 'Access-Control-Allow-Origin');

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
  // Klasör dışına çıkma (../) ve gizli dosyalar (.git, .env) engellenir
  if (!file.startsWith(ROOT) || file.slice(ROOT.length).split(sep).some((part) => part.startsWith('.') && part.length > 1)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    for (const { key, value } of headers) response.setHeader(key, value);
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(PORT, () => {
  console.log(`Weather App: http://localhost:${PORT}`);
});

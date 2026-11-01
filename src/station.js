// İstasyon işareti: meteoroloji haritalarındaki gibi daire bulutluluğu, tüy rüzgârı gösterir. DOM'a dokunmaz.
const KMH_PER_KNOT = 1.852;
const CALM_KNOTS = 3; // bunun altı haritada "sakin" sayılır, tüy çizilmez
const STANDARD_PRESSURE = 1013;

const SKY_QUARTERS = {
  clear: 0,
  mainlyClear: 1,
  partlyCloudy: 2,
  overcast: 4,
  fog: 4,
  drizzle: 4,
  rain: 4,
  showers: 4,
  snow: 4,
  storm: 4,
};
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Hava durumu anahtarından dairenin kaç çeyreğinin dolacağı (0-4). Bilinmeyen durumda null, daire boş kalır. */
export const skyQuarters = (condition) => SKY_QUARTERS[condition] ?? null;

/** Rüzgârın geldiği yön: 0-360 derece → "N", "NE" … (359° kuzeydir). */
export function compassPoint(degrees) {
  if (typeof degrees !== 'number' || !Number.isFinite(degrees)) return null;
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % COMPASS.length;
  return COMPASS[index];
}

/** Basınç merkezi: standart atmosferin altı alçak, üstü yüksek. Veri yoksa null. */
export function pressureCenter(hectopascal) {
  if (typeof hectopascal !== 'number' || !Number.isFinite(hectopascal)) return null;
  return hectopascal < STANDARD_PRESSURE ? 'low' : 'high';
}

/** Rüzgâr hızının tüyleri: bayrak 50, tam tüy 10, yarım tüy 5 knot; en yakın 5 knot'a yuvarlanır. */
export function windFeathers(kmh) {
  if (typeof kmh !== 'number' || !Number.isFinite(kmh) || kmh < 0) return null;
  const knots = kmh / KMH_PER_KNOT;
  if (knots < CALM_KNOTS) return { calm: true, flags: 0, full: 0, half: 0 };
  let left = Math.max(5, Math.round(knots / 5) * 5);
  const flags = Math.floor(left / 50);
  left -= flags * 50;
  const full = Math.floor(left / 10);
  return { calm: false, flags, full, half: left - full * 10 >= 5 ? 1 : 0 };
}

const num = (value) => Math.round(value * 10) / 10;

/**
 * Yukarı (-y) bakan tüy çizimi; merkez (0,0) dairenin ortası. Yön için dışarıdan döndürülür.
 * Dönen yollar: staff (gövde ve tüyler), flags (dolu üçgenler). Sakin havada ikisi de boştur.
 */
export function barbPaths(feathers, { radius = 8, length = 28, spacing = 5, feather = 11 } = {}) {
  if (!feathers || feathers.calm) return { staff: '', flags: '' };
  const parts = [`M0 ${num(-radius)}V${num(-(radius + length))}`];
  const flags = [];
  let y = -(radius + length);
  for (let i = 0; i < feathers.flags; i += 1) {
    flags.push(`M0 ${num(y)}L${feather} ${num(y - 2)}L0 ${num(y + spacing)}Z`);
    y += spacing + 2;
  }
  for (let i = 0; i < feathers.full; i += 1) {
    parts.push(`M0 ${num(y)}L${feather} ${num(y - 5)}`);
    y += spacing;
  }
  if (feathers.half) {
    // Tek yarım tüy gövdenin ucuna değil biraz içine çizilir; böylece tam tüyle karışmaz
    if (feathers.full === 0 && feathers.flags === 0) y += spacing;
    parts.push(`M0 ${num(y)}L${num(feather / 2)} ${num(y - 2.5)}`);
  }
  return { staff: parts.join(''), flags: flags.join('') };
}

/** Dairenin dolu kısmı: saat 12'den saat yönünde çeyrekler. 0 ya da bilinmeyen için boş, 4 için tam daire. */
export function coverPath(quarters, radius = 8) {
  const r = radius;
  switch (quarters) {
    case 1: return `M0 0V${-r}A${r} ${r} 0 0 1 ${r} 0Z`;
    case 2: return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}Z`;
    case 3: return `M0 0V${-r}A${r} ${r} 0 1 1 ${-r} 0Z`;
    case 4: return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${r} ${r} 0 0 1 0 ${-r}Z`;
    default: return '';
  }
}

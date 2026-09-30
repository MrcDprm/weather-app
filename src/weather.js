// Open-Meteo yanıtını ekranda kullanılacak sade nesnelere çevirir. DOM'a dokunmaz, Node'da test edilir.
// Dışarıdan gelen veriye güvenilmez: eksik ya da bozuk değer null olur, bozuk satır atlanır.
export const HOURS = 24;
export const DAYS = 5;

// WMO hava kodları: https://open-meteo.com/en/docs (sayfanın sonundaki tablo)
const CONDITIONS = {
  0: 'clear',
  1: 'mainlyClear',
  2: 'partlyCloudy',
  3: 'overcast',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
  80: 'showers', 81: 'showers', 82: 'showers',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow', 85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

const ICONS = {
  clear: ['sun', 'moon'],
  mainlyClear: ['cloudSun', 'cloudMoon'],
  partlyCloudy: ['cloudSun', 'cloudMoon'],
  overcast: ['cloud', 'cloud'],
  fog: ['fog', 'fog'],
  drizzle: ['rain', 'rain'],
  rain: ['rain', 'rain'],
  showers: ['rain', 'rain'],
  snow: ['snow', 'snow'],
  storm: ['storm', 'storm'],
  unknown: ['cloud', 'cloud'],
};

/** Hava koduna göre i18n anahtarı (condition_rain gibi) ve simge adı; gece için ay simgesi. */
export function describeWeather(code, isDay = true) {
  const condition = CONDITIONS[code] ?? 'unknown';
  const [dayIcon, nightIcon] = ICONS[condition];
  return { key: `condition_${condition}`, icon: isDay ? dayIcon : nightIcon };
}

export const toFahrenheit = (celsius) => (celsius * 9) / 5 + 32;
export const toMph = (kmh) => kmh / 1.609344;

/** Sıcaklık hep °C gelir; seçilen birime çevrilip yuvarlanır. -0 yerine 0 gösterilir. */
export function convertTemp(celsius, unit) {
  const value = Math.round(unit === 'f' ? toFahrenheit(celsius) : celsius);
  return value === 0 ? 0 : value;
}

export function convertWind(kmh, unit) {
  return Math.round(unit === 'mph' ? toMph(kmh) : kmh);
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const cell = (block, key, index) => (Array.isArray(block?.[key]) ? num(block[key][index]) : null);

/** Şu anki saatten başlayarak sonraki saatler. Saatler "2026-09-30T14:00" biçiminde, şehrin yerel saatiyle gelir. */
export function parseHours(hourly, now, count = HOURS) {
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  const currentHour = now.slice(0, 13); // "2026-09-30T14"
  const start = times.findIndex((time) => typeof time === 'string' && time >= currentHour);
  if (start === -1) return [];

  return times
    .slice(start, start + count)
    .map((time, offset) => ({
      time,
      temp: cell(hourly, 'temperature_2m', start + offset),
      rain: cell(hourly, 'precipitation_probability', start + offset),
      code: cell(hourly, 'weather_code', start + offset),
    }))
    .filter((hour) => typeof hour.time === 'string' && hour.temp !== null);
}

export function parseDays(daily, count = DAYS) {
  const dates = Array.isArray(daily?.time) ? daily.time : [];
  return dates
    .slice(0, count)
    .map((date, index) => ({
      date,
      code: cell(daily, 'weather_code', index),
      max: cell(daily, 'temperature_2m_max', index),
      min: cell(daily, 'temperature_2m_min', index),
      rain: cell(daily, 'precipitation_probability_max', index),
    }))
    .filter((day) => typeof day.date === 'string' && day.max !== null && day.min !== null);
}

/** Tek bir konumun yanıtı. Anlık veri yoksa ya da bozuksa null döner. */
export function parseForecast(raw) {
  const current = raw?.current;
  if (typeof current?.time !== 'string' || num(current.temperature_2m) === null) return null;

  return {
    current: {
      time: current.time,
      temp: current.temperature_2m,
      feels: num(current.apparent_temperature),
      humidity: num(current.relative_humidity_2m),
      wind: num(current.wind_speed_10m),
      code: num(current.weather_code),
      isDay: current.is_day !== 0,
    },
    hours: parseHours(raw.hourly, current.time),
    days: parseDays(raw.daily),
  };
}
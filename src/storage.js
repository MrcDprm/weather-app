// Ayarları, kayıtlı şehirleri ve son aramaları tarayıcıda saklar.
// Okunan veriye güvenilmez: bozuk, eksik ya da beklenmeyen değer varsa varsayılan kullanılır.
import { cleanPlace, isPlace, samePlace } from './places.js';

export const STORAGE_KEY = 'weather-settings';
export const LANGUAGES = ['tr', 'en'];
export const THEMES = ['dark', 'light'];
export const UNITS = ['metric', 'imperial']; // metric: °C ve km/sa, imperial: °F ve mph
export const MAX_SAVED = 8;
export const MAX_RECENT = 5;

/** Gizli sekmede ya da çerezler engelliyken localStorage'a erişmek bile hata fırlatabilir. */
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(storage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const placeList = (value, max) => (Array.isArray(value) ? value.filter(isPlace).map(cleanPlace).slice(0, max) : []);

export function loadSettings(storage = browserStorage(), fallbackLang = 'tr') {
  const saved = storage ? readJson(storage) : {};
  return {
    lang: oneOf(saved.lang, LANGUAGES, fallbackLang),
    theme: oneOf(saved.theme, THEMES, 'dark'),
    units: oneOf(saved.units, UNITS, 'metric'),
    saved: placeList(saved.saved, MAX_SAVED),
    recent: placeList(saved.recent, MAX_RECENT),
  };
}

export function saveSettings(settings, storage = browserStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Depolama doluysa ya da kapalıysa ayarlar sadece bu oturumda geçerli olur
  }
}

/** Şehir kayıtlıysa çıkarır, değilse başa ekler. Liste doluysa en eskisi düşer. */
export function toggleSaved(list, place) {
  if (list.some((item) => samePlace(item, place))) return list.filter((item) => !samePlace(item, place));
  return [cleanPlace(place), ...list].slice(0, MAX_SAVED);
}

/** Aranan şehri son aramaların başına taşır; aynı şehir iki kez görünmez. */
export function addRecent(list, place) {
  return [cleanPlace(place), ...list.filter((item) => !samePlace(item, place))].slice(0, MAX_RECENT);
}
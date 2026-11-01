// Arayüz: ekranlar, arama, konum, birimler. Veri api.js'ten gelir; bütün metinler textContent ile yazılır.
import { fetchCurrent, fetchForecast, findLocationName, searchTurkey, searchWorld } from './api.js';
import { HERE_ID, localized, mergePlaces, placeDetail, placeFromLocation, samePlace, WORLD_CITIES } from './places.js';
import { addRecent, loadSettings, MAX_SAVED, saveSettings, toggleSaved } from './storage.js';
import { convertTemp, convertWind, describeWeather, localTime } from './weather.js';
import { renderChart } from './chart.js';
import { MAP_CITIES, MAP_HEIGHT, MAP_WIDTH, mapPosition, TURKEY_PATH } from './map.js';
import { barbPaths, compassPoint, coverPath, pressureCenter, skyQuarters, windFeathers } from './station.js';
import { setIcon } from './icons.js';
import { translate } from './i18n.js';
import { applyTheme, nextTheme } from './theme.js';
import { initFeedback } from './feedback.js';
import { pageMeta, pathFor, placeFromPath, slugForPlace } from './routes.js';

const SEARCH_DELAY_MS = 300;
const CLOCK_MS = 15_000;
const MIN_QUERY = 2;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SKY_RADIUS = 8;

const browserLang = navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
const settings = loadSettings(undefined, browserLang);
// Adresteki ?lang=en / ?lang=tr kayıtlı tercihten önce gelir (paylaşılan ve Google'dan gelen linkler)
const urlLang = new URLSearchParams(window.location.search).get('lang');
if (urlLang === 'tr' || urlLang === 'en') settings.lang = urlLang;
const t = (key, params) => translate(settings.lang, key, params);

const $ = (id) => document.getElementById(id);
const el = {
  langButtons: document.querySelectorAll('[data-lang]'),
  unitButtons: document.querySelectorAll('[data-units]'),
  themeToggle: $('theme-toggle'),
  searchForm: $('search-form'),
  search: $('search'),
  results: $('search-results'),
  locate: $('locate'),
  notice: $('notice'),
  homeView: $('home-view'),
  savedGroup: $('saved-group'),
  savedGrid: $('saved-grid'),
  cityGrid: $('city-grid'),
  mapLand: $('map-land'),
  mapStations: $('map-stations'),
  centerLetter: $('center-letter'),
  worldGrid: $('world-grid'),
  recentGroup: $('recent-group'),
  recentList: $('recent-list'),
  detailView: $('detail-view'),
  back: $('back'),
  save: $('save'),
  saveLabel: $('save-label'),
  detailStatus: $('detail-status'),
  retry: $('retry'),
  detail: $('detail'),
  placeName: $('place-name'),
  placeMeta: $('place-meta'),
  nowIcon: $('now-icon'),
  nowMark: $('now-mark'),
  nowPressure: $('now-pressure'),
  nowTemp: $('now-temp'),
  nowDesc: $('now-desc'),
  nowFeels: $('now-feels'),
  nowHumidity: $('now-humidity'),
  nowWind: $('now-wind'),
  chart: $('hour-chart'),
  chartSummary: $('chart-summary'),
  days: $('days'),
};

// Ekran durumu. Ağdan gelen cevaplar sırasız dönebilir; sayaçlar eski isteğin cevabını yok saymak için.
const state = {
  place: null, // ayrıntısı açık olan şehir
  forecast: null,
  homeWeather: new Map(), // şehir kimliği → anlık hava
  results: [],
  activeResult: -1,
  searchTimer: 0,
  searchRequest: 0,
  detailRequest: 0,
};

// ---------- Biçimlendirme ----------
const imperial = () => settings.units === 'imperial';
const formatTemp = (celsius) => `${convertTemp(celsius, imperial() ? 'f' : 'c')}°`;
const formatWind = (kmh) => {
  const unit = imperial() ? 'mph' : 'kmh';
  return `${convertWind(kmh, unit)} ${t(`unit_${unit}`)}`;
};
const conditionOf = (look) => look.key.replace('condition_', '');
const formatPercent = (value) => (settings.lang === 'tr' ? `%${value}` : `${value}%`); // Türkçede yüzde işareti önde

function formatDay(date, index) {
  if (index === 0) return t('today');
  // Tarih "2026-09-30" gibi gelir; öğlen UTC alınırsa saat dilimi yüzünden gün kaymaz
  return new Intl.DateTimeFormat(settings.lang, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

// Konumun adı henüz bulunmadıysa (ya da bulunamadıysa) "Konumun" yazar
const placeName = (place) => (place.id === HERE_ID && !place.name ? t('myLocation') : localized(place, 'name', settings.lang));
const detailOf = (place) => placeDetail(place, settings.lang);

function iconSvg(name, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `wx-icon ${className}`);
  svg.setAttribute('aria-hidden', 'true');
  setIcon(svg, name);
  return svg;
}

function textNode(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// ---------- Adres ve sekme başlığı ----------
/**
 * Açık şehrin adresi (/istanbul) ve sekme başlığı güncellenir. replaceState geçmişe kayıt eklemez;
 * geri tuşunun davranışı değişmez. Adresi olmayan yer (ör. bir mahalle) için ana adres kullanılır.
 */
function updateAddress() {
  const slug = state.place && state.place.id !== HERE_ID ? slugForPlace(state.place) : null;
  const query = settings.lang === 'en' ? '?lang=en' : '';
  const target = `${pathFor(slug)}${query}`;
  if (`${window.location.pathname}${window.location.search}` !== target) window.history.replaceState(null, '', target);

  const meta = pageMeta(state.place ? placeName(state.place) : null, settings.lang);
  document.title = meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
}

// ---------- İstasyon işareti ----------
function svgNode(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

/** Daire bulutluluğa göre dolar; tüy rüzgârın geldiği yönü ve gücünü gösterir. Veri yoksa boş daire kalır. */
function drawMark(svg, weather) {
  svg.setAttribute('viewBox', '-40 -40 80 80');
  const look = weather ? describeWeather(weather.code, weather.isDay) : null;
  const feathers = weather ? windFeathers(weather.wind) : null;
  const cover = look ? coverPath(skyQuarters(conditionOf(look)), SKY_RADIUS) : '';
  const children = [];

  if (feathers && !feathers.calm && weather.windFrom !== null) {
    const barb = svgNode('g', { transform: `rotate(${weather.windFrom})` });
    const { staff, flags } = barbPaths(feathers, { radius: SKY_RADIUS, length: 26 });
    barb.append(svgNode('path', { class: 'staff', d: staff }));
    if (flags) barb.append(svgNode('path', { class: 'flag', d: flags }));
    children.push(barb);
  }
  if (feathers?.calm) children.push(svgNode('circle', { class: 'calm-ring', r: SKY_RADIUS + 4 })); // sakin hava: çift daire
  children.push(svgNode('circle', { class: 'sky', r: SKY_RADIUS }));
  if (cover) children.push(svgNode('path', { class: 'cover', d: cover }));
  svg.replaceChildren(...children);
}

function markSvg(weather) {
  const svg = svgNode('svg', { class: 'mark', 'aria-hidden': 'true' });
  drawMark(svg, weather);
  return svg;
}

/** Ekran okuyucu ve fare için tam açıklama: "İstanbul: 16°, parçalı bulutlu, rüzgâr 14 km/sa, kuzeydoğudan". */
function stationLabel(place, weather) {
  const name = placeName(place);
  if (!weather) return name;
  const look = describeWeather(weather.code, weather.isDay);
  const parts = [t('stationLabel', { name, temp: formatTemp(weather.temp), sky: t(look.key) })];
  const point = compassPoint(weather.windFrom);
  if (weather.wind !== null && point) parts.push(t('stationWind', { wind: formatWind(weather.wind), from: t(`from_${point}`) }));
  return parts.join(', ');
}

// ---------- Ana sayfa ----------
/** Haritadaki istasyon: işaret gerçek koordinatta, etiket kıyı çizgisine binmeyecek yanda. */
function mapStation({ place, side }) {
  const weather = state.homeWeather.get(place.id);
  const { x, y } = mapPosition(place.lat, place.lon);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'map-station';
  button.dataset.side = side;
  button.style.setProperty('--x', x);
  button.style.setProperty('--y', y);
  button.setAttribute('aria-label', stationLabel(place, weather));
  button.title = stationLabel(place, weather);
  button.addEventListener('click', () => openPlace(place));

  const label = document.createElement('span');
  label.className = 'map-label';
  label.append(textNode('b', '', weather ? formatTemp(weather.temp) : '—'), textNode('span', '', placeName(place)));
  button.append(markSvg(weather), label);

  const item = document.createElement('li');
  item.append(button);
  return item;
}

/** Liste hâlindeki istasyon: başkentler, kayıtlı şehirler ve dar ekranda Türkiye. */
function stationItem(place) {
  const weather = state.homeWeather.get(place.id);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'station';
  button.setAttribute('aria-label', stationLabel(place, weather));
  button.addEventListener('click', () => openPlace(place));

  const name = textNode('span', 'station-name', placeName(place));
  name.append(textNode('small', '', detailOf(place)));
  button.append(markSvg(weather), textNode('span', 'station-temp', weather ? formatTemp(weather.temp) : '—'), name);

  const item = document.createElement('li');
  item.append(button);
  return item;
}

function renderHome() {
  el.savedGroup.hidden = settings.saved.length === 0;
  el.savedGrid.replaceChildren(...settings.saved.map(stationItem));
  el.mapStations.replaceChildren(...MAP_CITIES.map(mapStation));
  el.cityGrid.replaceChildren(...MAP_CITIES.map(({ place }) => stationItem(place)));
  el.worldGrid.replaceChildren(...WORLD_CITIES.map(stationItem));

  el.recentGroup.hidden = settings.recent.length === 0;
  el.recentList.replaceChildren(
    ...settings.recent.map((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = placeName(place);
      button.title = detailOf(place);
      button.addEventListener('click', () => openPlace(place));
      const item = document.createElement('li');
      item.append(button);
      return item;
    }),
  );
}

/** Ana sayfadaki bütün şehirlerin (büyük şehirler, başkentler, kayıtlılar) anlık havası tek istekte gelir. */
async function loadHome() {
  const places = [...MAP_CITIES.map(({ place }) => place), ...WORLD_CITIES, ...settings.saved];
  renderHome();
  try {
    const results = await fetchCurrent(places);
    places.forEach((place, index) => {
      if (results[index]) state.homeWeather.set(place.id, results[index].current);
    });
  } catch {
    el.notice.textContent = t('loadFailed');
  }
  renderHome();
}

// ---------- Ayrıntı ----------
function showView(name) {
  el.homeView.hidden = name !== 'home';
  el.detailView.hidden = name !== 'detail';
  renderCenterLetter();
}

/** Haritadaki A/Y yalnızca şehir sayfasında ve o şehrin gerçek basıncından gelir; ana sayfada harf yok. */
function renderCenterLetter() {
  const center = !el.detailView.hidden ? pressureCenter(state.forecast?.current.pressure ?? null) : null;
  el.centerLetter.textContent = center ? t(`centerLetter_${center}`) : '';
  el.centerLetter.setAttribute('class', center ? `center-letter ${center}` : 'center-letter');
}

function renderSaveButton() {
  const place = state.place;
  el.save.hidden = !place;
  const isSaved = Boolean(place) && settings.saved.some((item) => samePlace(item, place));
  el.save.setAttribute('aria-pressed', String(isSaved));
  el.saveLabel.textContent = isSaved ? t('saved') : t('save');
}

/** "Tekirdağ, Türkiye · Yerel saat 22:13". Saat ilerlesin diye CLOCK_MS'de bir yeniden yazılır. */
function renderPlaceMeta() {
  const { place, forecast } = state;
  if (!place || !forecast) return;
  const time = localTime(forecast);
  el.placeMeta.textContent = [detailOf(place), time && t('updated', { time })].filter(Boolean).join(' · ');
}

function renderDetail() {
  const { place, forecast } = state;
  if (!place) return;
  renderSaveButton();
  el.placeName.textContent = placeName(place);
  if (!forecast) return;

  const { current, hours, days } = forecast;
  const look = describeWeather(current.code, current.isDay);
  renderPlaceMeta();
  setIcon(el.nowIcon, look.icon);
  el.nowTemp.textContent = formatTemp(current.temp);
  el.nowDesc.textContent = t(look.key);
  el.nowFeels.textContent = current.feels === null ? '—' : formatTemp(current.feels);
  el.nowHumidity.textContent = current.humidity === null ? '—' : formatPercent(current.humidity);
  const point = compassPoint(current.windFrom);
  el.nowWind.textContent = current.wind === null ? '—' : [formatWind(current.wind), point && t(`dir_${point}`)].filter(Boolean).join(' ');
  const center = pressureCenter(current.pressure);
  el.nowPressure.textContent = center
    ? t('pressureValue', { value: Math.round(current.pressure), center: t(`pressure_${center}`) })
    : '—';
  drawMark(el.nowMark, current);
  el.nowMark.setAttribute('viewBox', '-48 -48 96 96');
  renderCenterLetter();

  renderChart(el.chart, hours, formatTemp);
  if (hours.length > 0) {
    const temps = hours.map((hour) => hour.temp);
    el.chartSummary.textContent = t('chartSummary', {
      min: formatTemp(Math.min(...temps)),
      max: formatTemp(Math.max(...temps)),
      rain: Math.max(0, ...hours.map((hour) => hour.rain ?? 0)),
    });
  }

  el.days.replaceChildren(
    ...days.map((day, index) => {
      const dayLook = describeWeather(day.code);
      const item = document.createElement('li');
      item.className = 'day';
      item.title = t(dayLook.key);
      const icon = iconSvg(dayLook.icon, 'day-icon');
      icon.removeAttribute('aria-hidden');
      icon.setAttribute('role', 'img');
      const rain = textNode('span', 'day-rain', day.rain === null ? '' : formatPercent(day.rain));
      if (day.rain !== null) rain.title = t('rainChance', { value: day.rain });
      icon.setAttribute('aria-label', t(dayLook.key));
      const temps = textNode('span', 'day-temps', ` ${formatTemp(day.min)}`);
      temps.prepend(textNode('b', '', formatTemp(day.max)));
      item.append(
        textNode('span', 'day-name', formatDay(day.date, index)),
        icon,
        rain,
        temps,
      );
      return item;
    }),
  );
}

async function openPlace(place) {
  closeResults();
  el.notice.textContent = '';
  state.place = place;
  state.forecast = null;
  showView('detail');
  updateAddress();
  el.detail.hidden = true;
  el.retry.hidden = true;
  el.detailStatus.textContent = t('loading');
  renderDetail();

  const request = ++state.detailRequest;
  try {
    const forecast = await fetchForecast(place);
    if (request !== state.detailRequest) return; // bu arada başka şehir açıldı
    state.forecast = forecast;
    el.detailStatus.textContent = '';
    el.detail.hidden = false;
    renderDetail();
    el.placeName.focus();
  } catch {
    if (request !== state.detailRequest) return;
    el.detailStatus.textContent = t('loadFailed');
    el.retry.hidden = false;
  }
}

function goHome() {
  state.detailRequest++; // yarım kalan istek artık ekranı değiştirmesin
  state.place = null;
  state.forecast = null;
  showView('home');
  updateAddress();
  loadHome();
}

// ---------- Arama ----------
/** Listeyi kapatır ve bekleyen aramayı iptal eder; geç gelen cevap listeyi yeniden açmasın. */
function closeResults() {
  clearTimeout(state.searchTimer);
  state.searchRequest++;
  el.results.hidden = true;
  el.results.replaceChildren();
  el.search.setAttribute('aria-expanded', 'false');
  el.search.removeAttribute('aria-activedescendant');
  state.results = [];
  state.activeResult = -1;
}

function choosePlace(place) {
  settings.recent = addRecent(settings.recent, place);
  saveSettings(settings);
  el.search.value = '';
  openPlace(place);
}

function renderResults(message) {
  el.results.replaceChildren();
  state.results.forEach((place, index) => {
    const item = document.createElement('li');
    item.id = `result-${index}`;
    item.className = 'result';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(index === state.activeResult));
    item.append(textNode('span', 'result-name', place.name), textNode('span', 'result-detail', detailOf(place)));
    // mousedown: tıklama input'un blur olayından önce yakalanır
    item.addEventListener('mousedown', (event) => {
      event.preventDefault();
      choosePlace(place);
    });
    el.results.append(item);
  });
  if (message) el.results.append(textNode('li', 'result-empty', message));
  el.results.hidden = false;
  el.search.setAttribute('aria-expanded', 'true');
  if (state.activeResult >= 0) el.search.setAttribute('aria-activedescendant', `result-${state.activeResult}`);
  else el.search.removeAttribute('aria-activedescendant');
}

/** İki kaynak aynı anda aranır; hızlı gelen sonuçlar hemen gösterilir, diğeri gelince liste güncellenir. */
function runSearch(query) {
  const request = ++state.searchRequest;
  const found = { world: null, turkey: null }; // null: cevap bekleniyor, false: kaynak çalışmadı
  state.results = [];
  renderResults(t('searching'));

  const update = () => {
    if (request !== state.searchRequest) return; // kullanıcı yazmaya devam etti ya da liste kapandı
    const waiting = found.world === null || found.turkey === null;
    state.results = mergePlaces(found.world || [], found.turkey || []);
    state.activeResult = state.results.length > 0 ? 0 : -1;
    let message = '';
    if (waiting) message = t('searching');
    else if (found.world === false && found.turkey === false) message = t('searchFailed');
    else if (state.results.length === 0) message = t('noResults');
    renderResults(message);
  };

  searchWorld(query, settings.lang).then((places) => { found.world = places; }, () => { found.world = false; }).then(update);
  searchTurkey(query).then((places) => { found.turkey = places; }, () => { found.turkey = false; }).then(update);
}

el.search.addEventListener('input', () => {
  clearTimeout(state.searchTimer);
  const query = el.search.value.trim();
  if (query.length < MIN_QUERY) {
    closeResults();
    return;
  }
  state.searchTimer = setTimeout(() => runSearch(query), SEARCH_DELAY_MS);
});

el.search.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeResults();
    return;
  }
  if (state.results.length === 0) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    state.activeResult = (state.activeResult + step + state.results.length) % state.results.length;
    renderResults('');
  }
});

el.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const place = state.results[state.activeResult];
  if (place) choosePlace(place);
});

el.search.addEventListener('blur', closeResults);

// ---------- Konum ----------
function locate() {
  if (!('geolocation' in navigator)) {
    el.notice.textContent = t('locationUnsupported');
    return;
  }
  el.notice.textContent = t('locating');
  el.locate.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      el.locate.disabled = false;
      const { latitude, longitude } = position.coords;
      // Konum bu isteklerde kullanılır; kullanıcı Kaydet demedikçe saklanmaz (bkz. placeFromLocation).
      // Hava durumu ve yer adı aynı anda istenir; ad gelene kadar "Konumun" yazar.
      const here = { id: HERE_ID, name: '', region: '', country: '', lat: latitude, lon: longitude };
      openPlace(here);
      try {
        const named = await findLocationName(latitude, longitude, settings.lang);
        if (named && state.place === here) {
          state.place = named;
          renderDetail();
          updateAddress();
        }
      } catch {
        // Ad bulunamazsa "Konumun" olarak kalır
      }
    },
    (error) => {
      el.locate.disabled = false;
      el.notice.textContent = t(error.code === error.PERMISSION_DENIED ? 'locationDenied' : 'locationFailed');
    },
    { timeout: 10000, maximumAge: 10 * 60 * 1000 },
  );
}

// ---------- Dil, birim, tema ----------
function renderThemeButton() {
  el.themeToggle.textContent = t(settings.theme === 'dark' ? 'themeDay' : 'themeNight');
}

function renderLanguage() {
  document.documentElement.lang = settings.lang;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const button of el.langButtons) button.setAttribute('aria-pressed', String(button.dataset.lang === settings.lang));
  renderThemeButton();
}

function renderUnits() {
  for (const button of el.unitButtons) button.setAttribute('aria-pressed', String(button.dataset.units === settings.units));
}

/** Dil ya da birim değişince her şey yeni ayarla yeniden yazılır (yeni istek atılmaz). */
function renderAll() {
  renderLanguage();
  updateAddress();
  renderUnits();
  renderHome();
  renderDetail();
}

for (const button of el.langButtons) {
  button.addEventListener('click', () => {
    settings.lang = button.dataset.lang;
    saveSettings(settings);
    el.notice.textContent = '';
    closeResults();
    renderAll();
  });
}

for (const button of el.unitButtons) {
  button.addEventListener('click', () => {
    settings.units = button.dataset.units;
    saveSettings(settings);
    renderAll();
  });
}

el.themeToggle.addEventListener('click', () => {
  settings.theme = nextTheme(settings.theme);
  saveSettings(settings);
  applyTheme(settings.theme);
  renderThemeButton();
});

el.save.addEventListener('click', () => {
  const wasFull = settings.saved.length >= MAX_SAVED;
  const before = settings.saved.length;
  const place = state.place.id === HERE_ID ? placeFromLocation(state.place, t('myLocation')) : state.place;
  settings.saved = toggleSaved(settings.saved, place);
  saveSettings(settings);
  // Liste doluyken ekleme yapıldıysa en eski kayıt düştü; kullanıcıya söylenir
  el.detailStatus.textContent = wasFull && settings.saved.length === before ? t('savedFull', { max: MAX_SAVED }) : '';
  renderSaveButton();
});

el.back.addEventListener('click', goHome);
el.retry.addEventListener('click', () => openPlace(state.place));
el.locate.addEventListener('click', locate);

document.getElementById('footer-year').textContent = new Date().getFullYear();
el.mapLand.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
el.mapLand.append(svgNode('path', { d: TURKEY_PATH }));
applyTheme(settings.theme);
renderLanguage();
renderUnits();
loadHome();
// /istanbul, /londra gibi bir adresle gelindiyse o şehir açılır; bilinmeyen adres ana sayfaya döner
const routePlace = placeFromPath(window.location.pathname);
if (routePlace) openPlace(routePlace);
else updateAddress();
initFeedback(t);
setInterval(() => {
  if (!el.detailView.hidden) renderPlaceMeta();
}, CLOCK_MS);

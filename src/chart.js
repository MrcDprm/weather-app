// 24 saatlik grafik: üstte sıcaklık çizgisi, altta yağış olasılığı çubukları. Kütüphane yok, SVG elle çizilir.
const SVG_NS = 'http://www.w3.org/2000/svg';
export const CHART = { width: 720, height: 220, margin: 20, lineTop: 34, lineHeight: 80, barTop: 136, barHeight: 50, labelY: 212 };
const LABEL_EVERY = 3; // her 3 saatte bir etiket

/** Her saat için noktanın ve çubuğun konumu. Saf fonksiyon, test edilir. */
export function chartGeometry(hours) {
  const step = CHART.width / hours.length;
  const temps = hours.map((hour) => hour.temp);
  const max = Math.max(...temps);
  const span = max - Math.min(...temps) || 1; // hepsi aynıysa sıfıra bölme olmasın

  return hours.map((hour, index) => ({
    x: step * index + step / 2,
    y: CHART.lineTop + ((max - hour.temp) / span) * CHART.lineHeight,
    bar: ((hour.rain ?? 0) / 100) * CHART.barHeight,
    barWidth: step * 0.6,
  }));
}

function node(name, attributes, text) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Grafiği çizer. formatTemp sıcaklığı seçilen birimde metne çevirir. */
export function renderChart(svg, hours, formatTemp) {
  svg.replaceChildren();
  if (hours.length < 2) return;
  // Kenarlarda pay bırakılır; ilk ve son etiket kırpılmasın
  svg.setAttribute('viewBox', `${-CHART.margin} 0 ${CHART.width + CHART.margin * 2} ${CHART.height}`);

  const points = chartGeometry(hours);
  const baseline = CHART.barTop + CHART.barHeight;

  svg.append(node('line', { class: 'chart-base', x1: 0, x2: CHART.width, y1: baseline, y2: baseline }));
  points.forEach((point, index) => {
    if (point.bar > 0) {
      svg.append(node('rect', {
        class: 'chart-bar',
        x: point.x - point.barWidth / 2,
        y: baseline - point.bar,
        width: point.barWidth,
        height: point.bar,
        rx: 2,
      }));
    }
    if (index % LABEL_EVERY === 0) {
      svg.append(node('text', { class: 'chart-hour', x: point.x, y: CHART.labelY }, hours[index].time.slice(11, 16)));
    }
  });

  svg.append(node('polyline', { class: 'chart-line', points: points.map((point) => `${point.x},${point.y}`).join(' ') }));
  points.forEach((point, index) => {
    if (index % LABEL_EVERY !== 0) return;
    svg.append(node('circle', { class: 'chart-dot', cx: point.x, cy: point.y, r: 3.5 }));
    svg.append(node('text', { class: 'chart-temp', x: point.x, y: point.y - 10 }, formatTemp(hours[index].temp)));
  });
}
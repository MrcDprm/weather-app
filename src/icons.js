// Hava durumu simgeleri: 24×24 çizgi çizimleri. Her parça [path, ton]; ton CSS'te renge dönüşür
// (sun: amber, drop: mavi, boş: yazı rengi). Harici görsel ya da innerHTML kullanılmaz.
const SVG_NS = 'http://www.w3.org/2000/svg';

const CLOUD = 'M7 19a4 4 0 0 1-.6-7.96A6 6 0 0 1 17.8 10 4.5 4.5 0 0 1 17.5 19Z';
const CLOUD_HIGH = 'M7 15a4 4 0 0 1-.6-7.96A6 6 0 0 1 17.8 6 4.5 4.5 0 0 1 17.5 15Z';
const CLOUD_LOW = 'M9.5 20a3.5 3.5 0 0 1-.5-6.97A5 5 0 0 1 18.6 12.5 3.75 3.75 0 0 1 18.3 20Z';

const ICON_PARTS = {
  sun: [
    ['M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9Z', 'sun'],
    ['M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', 'sun'],
  ],
  moon: [['M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5Z', 'sun']],
  cloud: [[CLOUD, '']],
  cloudSun: [
    ['M8 4.5a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z', 'sun'],
    ['M8 1.5v1M3 7.5H2M4.5 4l-.7-.7M12.2 3.8l-.7.7', 'sun'],
    [CLOUD_LOW, ''],
  ],
  cloudMoon: [
    ['M11 4.2A4 4 0 1 0 13.5 10 3.4 3.4 0 0 1 11 4.2Z', 'sun'],
    [CLOUD_LOW, ''],
  ],
  rain: [
    [CLOUD_HIGH, ''],
    ['M8 18l-1 3M12 18l-1 3M16 18l-1 3', 'drop'],
  ],
  snow: [
    [CLOUD_HIGH, ''],
    ['M8 18.5h.01M12 18.5h.01M16 18.5h.01M10 21.5h.01M14 21.5h.01', 'drop'],
  ],
  storm: [
    [CLOUD_HIGH, ''],
    ['M12.5 15l-2.5 4h4l-2.5 4', 'sun'],
  ],
  fog: [
    [CLOUD_HIGH, ''],
    ['M4 18.5h16M6 21.5h12', ''],
  ],
};

/** svg öğesinin içini verilen simgeyle doldurur. Bilinmeyen ad bulut olarak çizilir. */
export function setIcon(svg, name) {
  const parts = ICON_PARTS[name] ?? ICON_PARTS.cloud;
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.replaceChildren(
    ...parts.map(([d, tone]) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      if (tone) path.setAttribute('class', `tone-${tone}`);
      return path;
    }),
  );
}

export const ICON_NAMES = Object.keys(ICON_PARTS);

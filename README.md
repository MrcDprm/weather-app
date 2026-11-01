# Weather App

**English** | [Türkçe](README.tr.md)

A weather app in plain HTML, CSS and JavaScript. Search any city or district, or use your location, to see the current weather, a 24-hour chart and a 5-day forecast. It needs no API key and no server.

**Live demo:** [weather.miracdeprem.com](https://weather.miracdeprem.com)

![A city's weather in English: current conditions, 24-hour chart and 5-day forecast](docs/screenshot-detail.png)

## Features

- **A weather map on the home screen:** 14 provinces of Türkiye sit on a map at their real coordinates, as station marks like those on meteorologists' charts: the circle fills with cloud cover, and a feathered line shows where the wind comes from and how strong it is. Eight world capitals follow: London, Paris, Berlin, Rome, Madrid, Washington, Tokyo and Beijing. All of them load in a single request.
- **Search that understands Turkish:**
  - Results come from two open sources at the same time:
    - OpenStreetMap for provinces, districts and neighbourhoods in Türkiye.
    - GeoNames for cities around the world.
  - "ısparta", "sanliurfa" and "kadikoy" find the right place.
  - Foreign cities can be searched by their Turkish names, such as "londra" or "moskova".
  - The faster source shows its results immediately, and the list updates when the other one answers.
  - Suggestions can be picked with ↑/↓ and Enter.
- **Use my location (optional):**
  - Shows the weather where you are, with the real place name, such as "Kadıköy · İstanbul, Türkiye".
  - If you deny permission, a short notice explains it and search keeps working.
  - Your location isn't stored unless you save it. A saved location is rounded to about 1 km and stays in your browser.
- **City details:**
  - Current temperature, feels like, humidity and wind.
  - A 24-hour chart of temperature and chance of rain, drawn in SVG without a library.
  - A 5-day forecast.
  - The place's local time.
  - Night-time icons.
- **An address for every city:** each of Türkiye's 81 provinces and the world capitals has its own page, such as [weather.miracdeprem.com/istanbul](https://weather.miracdeprem.com/istanbul), in Turkish and English (`?lang=en`).
- **Saved cities and recent searches**, kept in your browser. Your current location can be saved too.
- **One unit switch:** °C and km/h, or °F and mph. It updates every screen instantly, without a new request.
- **Turkish and English**, with a day map and a night map.
- **Feedback:** a small button opens a form (name optional, email or phone, message) that sends straight to me through my portfolio site.
- **Accessible:** the search box is a proper combobox for screen readers, the chart has a text summary, and it works on phones.

## Screenshots

| Home: the weather map | Search in Turkish | On a phone |
|---|---|---|
| ![Weather map of Türkiye with station marks](docs/screenshot-home.png) | ![Search suggestions for "kadıköy"](docs/screenshot-search.png) | ![The weather map on a phone](docs/screenshot-mobile.png) |

## Tech Stack

- HTML, CSS, JavaScript (ES modules, no framework, no build step)
- [Open-Meteo](https://open-meteo.com): forecasts and world city search (GeoNames)
- [Photon](https://photon.komoot.io) by komoot: search in Türkiye (OpenStreetMap)
- [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api): the name of your location
- `node --test`: 75 unit tests
- Vercel, with a strict Content Security Policy
- **No API keys and no npm dependencies**

## Installation

Open [weather.miracdeprem.com](https://weather.miracdeprem.com), or run it locally (Node.js 20 or newer):

```bash
git clone https://github.com/MrcDprm/weather-app.git
cd weather-app
npm run dev
```

Then open `http://localhost:5174`. The small development server also sends the same security headers as the live site, so anything the CSP would block shows up locally too.

Run the tests with:

```bash
npm test
```

### Project structure

```
app.html, styles.css      Page template and styles
api/page.js               Serves every address (/, /istanbul, /londra …) with its own title, description and structured data
lib/                      <head> builder and sitemap for the page function
src/routes.js             Addresses: 81 provinces and 8 world capitals
src/provinces.js          Coordinates and regions of Türkiye's 81 provinces
src/weather.js            Turns forecast responses into simple objects; weather codes, unit conversion
src/places.js             World capitals, search results from both sources, merging and ranking
src/map.js                Turkey outline, stations on the map and their positions
src/station.js            Station mark rules: cloud cover, wind feathers, compass, pressure centre
src/storage.js            Settings, saved cities and recent searches, validated on every read
src/api.js                Requests to Open-Meteo, Photon and BigDataCloud with timeouts
src/chart.js              The 24-hour SVG chart
src/icons.js              Weather icons drawn as SVG paths
src/main.js               Screens, search, location, language, units and theme
scripts/dev-server.mjs    Local server with the same headers and rewrites as vercel.json
tests/                    Unit tests
```

### Privacy

- There is no server of my own. Your browser talks directly to the weather and search services.
- When you use your location, the coordinates (rounded to about 10 metres) are sent to Open-Meteo for the forecast and to BigDataCloud for the place name. They aren't stored unless you save the place; a saved location is rounded to about 1 km and stays in your browser.
- Settings, saved cities and recent searches stay in your browser's local storage.

## What I Learned

- **Never trusting data from outside.** Every response is checked before it reaches the screen. A missing number becomes "—", a broken row is skipped, and unknown fields are dropped. The same checks run on what I read back from local storage, because it can be edited by hand.
- **Combining two imperfect sources.** One place database lists Kadıköy in İstanbul behind smaller places with the same name, while the other cannot find "London" when typed in Turkish. I query both at once. I fold Turkish letters so "sanliurfa" matches "Şanlıurfa", drop fuzzy matches, rank capitals first and remove duplicates by name and distance.
- **Not letting slow answers win.** Search waits 300 ms after the last key press. Each request carries a number, so an old answer that arrives late cannot overwrite a newer one. The fast source is shown right away instead of waiting for the slow one.
- **Turning meteorological symbols into code.** I learned the rule behind wind feathers: half a feather is 5 knots, a full one 10, a flag 50. Keeping that and the cloud cover fill in a module apart from the screen let me test them.
- **Keeping decoration apart from data.** The pressure lines in the background are decoration, so they carry no numbers; the L/H letter comes only from the city's real pressure.
- **Drawing a chart by hand.** The chart is a few SVG lines and rectangles. The maths is in a separate function, so I could test it: the warmest hour sits at the top, equal temperatures do not divide by zero, and missing rain draws no bar.
- **Time zones.** Forecast times come in the city's local time, and dates like "2026-10-01" can slip to the previous day if parsed as midnight. Reading them at noon UTC keeps the weekday right.
- **Security headers for a static site.** The CSP allows connections only to the services I use, and location access is allowed only for this site. The local development server sends the same headers, so a blocked request shows up before it reaches the live site.

## Credits

- Weather data and world city search: [Open-Meteo](https://open-meteo.com) (CC BY 4.0), which uses [GeoNames](https://www.geonames.org) (CC BY 4.0).
- Search in Türkiye: [Photon](https://photon.komoot.io) by komoot, with data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL).
- Location names: [BigDataCloud](https://www.bigdatacloud.com) free reverse geocoding.

## License

[MIT](LICENSE)

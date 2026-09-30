# Weather App

**English** | [Türkçe](README.tr.md)

A weather app in plain HTML, CSS and JavaScript. Search any city or use your location to see the current weather, the next 24 hours and a 5-day forecast.

> 🚧 Work in progress. This README is the project plan and will be completed at v1.0.0.

## Plan

### MVP
- Home screen with İstanbul, Ankara, İzmir and Bursa: current temperature and conditions at a glance.
- City search with suggestions (Open-Meteo geocoding).
- "Use my location" (optional). If permission is denied, a short notice explains it and search still works.
- Detail view: current weather (feels like, humidity, wind), a 24-hour temperature and rain chart (SVG, no library), and a 5-day forecast.
- Saved cities (star) and recent searches, stored in the browser.
- Units: °C/°F and km/h/mph, remembered.
- Turkish and English, a dark and a light theme matching my portfolio.
- Feedback button that sends to my portfolio.
- Unit tests with `node --test`.

### Future Plans
- Sunrise and sunset, UV index, air quality.
- Hourly details for other days.
- Weather alerts and an installable app (PWA).

## Tech Stack
- HTML, CSS, JavaScript (ES modules, no framework, no build step)
- [Open-Meteo](https://open-meteo.com) weather and geocoding APIs (free, no API key)
- Vercel

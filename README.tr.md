# Hava Durumu (Weather App)

[English](README.md) | **Türkçe**

Sade HTML, CSS ve JavaScript ile yazılmış bir hava durumu uygulaması. Bir şehir arayarak ya da konumunu kullanarak anlık havayı, önümüzdeki 24 saati ve 5 günlük tahmini görebilirsin.

> 🚧 Geliştiriliyor. Bu README şimdilik proje planı; v1.0.0'da tamamlanacak.

## Plan

### MVP
- İstanbul, Ankara, İzmir ve Bursa'nın bulunduğu ana sayfa: anlık sıcaklık ve hava durumu tek bakışta.
- Önerili şehir arama (Open-Meteo geocoding).
- "Konumumu kullan" (isteğe bağlı). İzin verilmezse kısa bir uyarı çıkar, arama çalışmaya devam eder.
- Ayrıntı görünümü: anlık hava (hissedilen, nem, rüzgâr), 24 saatlik sıcaklık ve yağış grafiği (SVG, kütüphanesiz), 5 günlük tahmin.
- Kayıtlı şehirler (yıldız) ve son aramalar, tarayıcıda saklanır.
- Birimler: °C/°F ve km/sa/mph, seçim hatırlanır.
- Türkçe ve İngilizce, portfolyo sitemle uyumlu koyu ve açık tema.
- Portfolyoma mesaj gönderen geri bildirim düğmesi.
- `node --test` ile birim testleri.

### Gelecek Planları
- Gün doğumu ve batımı, UV indeksi, hava kalitesi.
- Diğer günler için saatlik ayrıntı.
- Hava uyarıları ve yüklenebilir uygulama (PWA).

## Kullanılan Teknolojiler
- HTML, CSS, JavaScript (ES modülleri, framework yok, derleme adımı yok)
- [Open-Meteo](https://open-meteo.com) hava durumu ve şehir arama API'leri (ücretsiz, API anahtarı gerekmez)
- Vercel

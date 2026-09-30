# Hava Durumu (Weather App)

[English](README.md) | **Türkçe**

Sade HTML, CSS ve JavaScript ile yazılmış bir hava durumu uygulaması. Bir şehir ya da ilçe arayarak veya konumunu kullanarak anlık havayı, 24 saatlik grafiği ve 5 günlük tahmini görebilirsin. API anahtarı ya da sunucu gerektirmiyor.

**Canlı demo:** [weather.miracdeprem.com](https://weather.miracdeprem.com)

![İngilizce ayrıntı ekranı: anlık hava, 24 saatlik grafik ve 5 günlük tahmin](docs/screenshot-detail.png)

## Özellikler

- **Tek bakışta ana sayfa:** İstanbul, Ankara, İzmir ve Bursa ile sekiz dünya başkenti: Londra, Paris, Berlin, Roma, Madrid, Washington, Tokyo ve Pekin. Her kartta sıcaklık, hava durumu ve rüzgâr var. Bütün şehirler tek istekte yükleniyor.
- **Türkçeyi anlayan arama:**
  - Sonuçlar iki açık kaynaktan aynı anda geliyor:
    - Türkiye'deki il, ilçe ve mahalleler için OpenStreetMap.
    - Dünya şehirleri için GeoNames.
  - "ısparta", "sanliurfa" ve "kadikoy" doğru yeri buluyor.
  - Yabancı şehirler "londra" ya da "moskova" gibi Türkçe adlarıyla aranabiliyor.
  - Hızlı cevap veren kaynağın sonuçları hemen görünüyor, diğeri gelince liste güncelleniyor.
  - Öneriler ↑/↓ ve Enter ile seçilebiliyor.
- **Konumumu kullan (isteğe bağlı):**
  - Bulunduğun yerin havasını gerçek yer adıyla gösteriyor, örneğin "Kadıköy · İstanbul, Türkiye".
  - İzin vermezsen kısa bir uyarı çıkıyor, arama çalışmaya devam ediyor.
  - Konumun hiçbir yere kaydedilmiyor.
- **Şehir ayrıntısı:**
  - Anlık sıcaklık, hissedilen, nem ve rüzgâr.
  - Sıcaklık ve yağış olasılığını gösteren, kütüphanesiz SVG ile çizilmiş 24 saatlik grafik.
  - 5 günlük tahmin.
  - Şehrin yerel saati.
  - Gece için ay simgeleri.
- **Her şehrin kendi adresi:** Türkiye'nin 81 ili ve dünya başkentlerinin her birinin Türkçe ve İngilizce (`?lang=en`) kendi sayfası var. Örnek: [weather.miracdeprem.com/istanbul](https://weather.miracdeprem.com/istanbul).
- **Kayıtlı şehirler ve son aramalar:** Tarayıcında saklanıyor.
- **Tek birim düğmesi:** °C ve km/sa ya da °F ve mph. Yeni istek atmadan bütün ekranları anında güncelliyor.
- **Türkçe ve İngilizce**, [portfolyo sitemle](https://www.miracdeprem.com) uyumlu koyu ve açık tema.
- **Geri bildirim:** Küçük bir düğme; ad (isteğe bağlı), e-posta ya da telefon ve mesaj içeren formu açar. Mesaj portfolyo sitem üzerinden doğrudan bana ulaşır.
- **Erişilebilir:** Arama kutusu ekran okuyucular için doğru bir combobox, grafiğin metin özeti var ve telefonda da çalışıyor.

## Ekran Görüntüleri

| Ana sayfa: büyük şehirler ve dünya başkentleri | Türkçe arama | Telefonda: konumum, açık tema |
|---|---|---|
| ![Şehir kartlarıyla ana sayfa](docs/screenshot-home.png) | ![“kadıköy” için arama önerileri](docs/screenshot-search.png) | ![Telefonda konumun havası](docs/screenshot-mobile.png) |

## Kullanılan Teknolojiler

- HTML, CSS, JavaScript (ES modülleri, framework yok, derleme adımı yok)
- [Open-Meteo](https://open-meteo.com): tahminler ve dünya şehirleri araması (GeoNames)
- komoot'un [Photon](https://photon.komoot.io) servisi: Türkiye içi arama (OpenStreetMap)
- [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api): konumun adı
- `node --test`: 44 birim testi
- Sıkı bir Content Security Policy ile Vercel
- **API anahtarı ve npm bağımlılığı yok**

## Kurulum ve Çalıştırma

[weather.miracdeprem.com](https://weather.miracdeprem.com) adresini aç ya da kendi bilgisayarında çalıştır (Node.js 20 veya üstü):

```bash
git clone https://github.com/MrcDprm/weather-app.git
cd weather-app
npm run dev
```

Sonra `http://localhost:5174` adresini aç. Küçük geliştirme sunucusu canlı sitedeki güvenlik başlıklarının aynısını gönderiyor. Böylece CSP'nin engelleyeceği bir şey yerelde de fark ediliyor.

Testleri çalıştırmak için:

```bash
npm test
```

### Proje yapısı

```
app.html, styles.css      Sayfa şablonu ve stiller
api/page.js               Her adresi (/, /istanbul, /londra …) kendi başlığı, açıklaması ve yapılandırılmış verisiyle sunar
lib/                      Sayfa fonksiyonu için <head> üreticisi ve sitemap
src/routes.js             Adresler: 81 il ve 8 dünya başkenti
src/provinces.js          Türkiye'nin 81 ilinin koordinatı ve bölgesi
src/weather.js            Tahmin yanıtlarını sade nesnelere çevirir; hava kodları, birim dönüşümü
src/places.js             Sabit şehirler, iki kaynaktan gelen arama sonuçları, birleştirme ve sıralama
src/storage.js            Ayarlar, kayıtlı şehirler ve son aramalar; her okumada doğrulanır
src/api.js                Open-Meteo, Photon ve BigDataCloud istekleri (zaman aşımıyla)
src/chart.js              24 saatlik SVG grafik
src/icons.js              SVG çizgileriyle çizilmiş hava simgeleri
src/main.js               Ekranlar, arama, konum, dil, birim ve tema
scripts/dev-server.mjs    vercel.json'daki başlıkları ve yönlendirmeleri uygulayan yerel sunucu
tests/                    Birim testleri
```

### Gizlilik

- Kendi sunucum yok. Tarayıcın hava durumu ve arama servisleriyle doğrudan konuşuyor.
- Konumunu kullandığında koordinatlar (yaklaşık 10 metreye yuvarlanarak) tahmin için Open-Meteo'ya, yer adı için BigDataCloud'a gönderiliyor. Hiçbir yere kaydedilmiyor.
- Ayarlar, kayıtlı şehirler ve son aramalar tarayıcının yerel deposunda kalıyor.

## Öğrendiklerim

- **Dışarıdan gelen veriye asla güvenmemek.** Her yanıt ekrana gelmeden önce kontrol ediliyor. Eksik bir sayı "—" oluyor, bozuk satır atlanıyor, bilinmeyen alanlar atılıyor. Yerel depodan geri okuduklarım da aynı kontrolden geçiyor, çünkü orası elle değiştirilebiliyor.
- **İki kusurlu kaynağı birleştirmek.** Yer veritabanlarından biri Türkçe "ı"yı tanımıyor ve İstanbul'daki Kadıköy'ü bulamıyordu. Diğeri ise Türkçe yazılan "Londra"yı bulamıyordu. İkisini birlikte sorguluyorum. Türkçe harfleri sadeleştirerek "sanliurfa"yı "Şanlıurfa" ile eşleştiriyorum, bulanık eşleşmeleri eliyorum, başkentleri öne alıyorum ve aynı yeri ad ile mesafeye bakarak tekrar göstermiyorum.
- **Yavaş cevabın kazanmasına izin vermemek.** Arama son tuşa basıldıktan 300 ms sonra başlıyor. Her isteğin bir numarası var; geç gelen eski bir cevap yenisinin üstüne yazılamıyor. Hızlı kaynağın sonuçları yavaş olanı beklemeden gösteriliyor.
- **Grafiği elle çizmek.** Grafik birkaç SVG çizgisi ve dikdörtgenden oluşuyor. Hesabı ayrı bir fonksiyona koyduğum için test edebildim: en sıcak saat en üstte, sıcaklıklar eşitse sıfıra bölme olmuyor, yağış verisi yoksa çubuk çizilmiyor.
- **Saat dilimleri.** Tahmin saatleri şehrin yerel saatiyle geliyor. "2026-10-01" gibi bir tarih gece yarısı olarak okunursa bir önceki güne kayabiliyor. Öğlen UTC olarak okumak gün adını doğru tutuyor.
- **Statik bir site için güvenlik başlıkları.** CSP sadece kullandığım servislere bağlantıya izin veriyor, konum izni de sadece bu siteye açık. Yerel geliştirme sunucusu da aynı başlıkları gönderiyor; engellenen bir istek canlı siteye çıkmadan fark ediliyor.

## Gelecek Planları

- Gün doğumu ve batımı, UV indeksi ve hava kalitesi.
- Diğer günler için saatlik ayrıntı.
- Hava uyarıları.
- Son tahminle çevrim dışı da çalışan yüklenebilir uygulama (PWA).

## Kaynaklar

- Hava verisi ve dünya şehirleri araması: [Open-Meteo](https://open-meteo.com) (CC BY 4.0); Open-Meteo [GeoNames](https://www.geonames.org) (CC BY 4.0) verisini kullanıyor.
- Türkiye içi arama: komoot'un [Photon](https://photon.komoot.io) servisi; veriler © [OpenStreetMap katkıcıları](https://www.openstreetmap.org/copyright) (ODbL).
- Konum adları: [BigDataCloud](https://www.bigdatacloud.com) ücretsiz ters coğrafi kodlama.

## Lisans

[MIT](LICENSE)

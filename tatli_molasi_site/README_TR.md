# Tatlı Molası — kurulum

Bu paket, mobil uyumlu bir pastane keşif sitesi için başlangıç sürümüdür.

## Neler var?
- Müşteri sayfası ve açık konum paylaşımı onayı
- Telefon tarayıcısının konum izni
- OpenStreetMap verileri üzerinden yakın pastane/kafe araması
- Yönetici anahtarıyla korunan özel konum paneli
- Konum kayıtlarının 24 saat sonra otomatik temizlenmesi ve elle silme
- Gerçek ödeme/sipariş gönderimi bu ilk sürümde yoktur

## Önemli
Konum izni tarayıcıda genellikle HTTPS üzerinde çalışır (localhost geliştirme istisnası). Siteyi internete yayınlarken HTTPS kullan. Gerçek müşterilerin hassas konumlarını korumak için yönetici anahtarını kimseyle paylaşma; sunucu diskindeki `data/locations.json` dosyasına erişimi sınırla. Bu başlangıç sürümü küçük bir deneme içindir; yoğun/gerçek ticari kullanım öncesinde kalıcı veritabanı, daha güçlü yönetici kimlik doğrulaması, yedekleme ve gizlilik metni eklenmelidir.

## Bilgisayarda çalıştırma
1. Node.js 18 veya üstünü kur.
2. Bu klasörde terminal aç.
3. Bağımlılıkları kur: `npm install`
4. Güçlü bir yönetici anahtarı belirle:
   - macOS/Linux: `export ADMIN_TOKEN='buraya-en-az-20-karakterlik-rastgele-bir-anahtar-yaz'`
   - Windows PowerShell: `$env:ADMIN_TOKEN='buraya-en-az-20-karakterlik-rastgele-bir-anahtar-yaz'`
5. Başlat: `npm start`
6. Müşteri sayfası: `http://localhost:3000`
7. Yönetici paneli: `http://localhost:3000/admin.html`

## İnternete yayınlama
Bu dosyaları Node.js uygulaması çalıştırabilen bir barındırma hizmetine yükle. `ADMIN_TOKEN` ortam değişkenini hizmetin gizli değişken ayarlarından tanımla. HTTPS etkinleştir ve `data/` klasörünün kalıcı diskte saklandığını doğrula; geçici dosya sistemi kullanılıyorsa kayıtlar yeniden başlatmada kaybolabilir. Yayınladıktan sonra çıkan gerçek HTTPS adresini arkadaşınla paylaş.

## Harita verileri
Pastane araması Overpass API ve OpenStreetMap topluluk verilerine bağlıdır. Sonuçlar eksik olabilir ve servis zaman zaman yanıt vermeyebilir. Konum paylaşımını kabul etmek, konumun yönetici paneline kaydedilmesini açıkça belirtir.

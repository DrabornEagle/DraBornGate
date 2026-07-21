# DraBornGate v0.1 — CourierPass Demo

DraBornGate, site/rezidans girişlerinde kurye ile güvenlik görevlisini aynı hızlı geçiş akışında buluşturan Expo tabanlı mobil demo uygulamasıdır.

> Bu sürümde Supabase veya başka bir veritabanı yoktur. Tüm demo verileri cihaz içindeki `AsyncStorage` alanında saklanır.

## v0.1 içinde neler var?

### Kurye deneyimi
- Kurye rolü ve modern kontrol paneli
- Galeriden sipariş ekran görüntüsü seçme
- Animasyonlu demo OCR / sipariş analizi
- Site, kapı, blok, daire ve sipariş numarası doğrulama
- CourierPass geçiş talebi oluşturma
- Onay durumunu ve 6 haneli geçiş kodunu görüntüleme
- Geçmiş teslimat ve hareket kayıtları

### Güvenlik deneyimi
- Canlı yaklaşan kurye kuyruğu
- Bekleyen / onaylı / tümü filtreleri
- Talebi onaylama ve otomatik 6 haneli kod üretme
- Talebi reddetme ve ret nedenini kaydetme
- Girişi tamamlandı olarak işaretleme
- Kapı yoğunluğu, vardiya ve hızlı güvenlik işlemleri

### Site yönetimi deneyimi
- Operasyon skoru
- Saatlik kapı yoğunluğu grafiği
- Kapı bazlı performans görünümü
- Sistem durumu kartları
- Geçiş kural ve politika ekranı

### Teknik özellikler
- Expo SDK 57 + React Native
- TypeScript strict mode
- Tamamen yerel demo veri deposu
- Akıcı mikro animasyonlar ve haptic geri bildirim
- Android için GitHub Actions üzerinden otomatik debug APK üretimi
- Supabase entegrasyonuna hazır katmanlı veri yapısı

## Telefonda Expo Go ile çalıştırma

Termux içinde:

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs-lts git -y
git clone https://github.com/DrabornEagle/DraBornGate.git
cd DraBornGate
npm install
npx expo start --tunnel
```

Expo Go uygulamasından terminalde çıkan QR kodu okut.

## GitHub Actions ile APK

1. GitHub reposunda **Actions** sekmesini aç.
2. **Android Demo APK** iş akışını seç.
3. **Run workflow** düğmesine bas.
4. İşlem tamamlanınca `DraBornGate-v0.1-demo` artifact dosyasını indir.

## Demo akışını test et

1. **Kurye Girişi** → **Yeni Geçiş Talebi** → **Demo Tara** → **Güvenliğe Gönder**.
2. Profil ekranından **Rol değiştir** → **Güvenlik Paneli**.
3. Yeni kurye talebini **Onayla ve Kod Üret**.
4. Tekrar kurye rolüne geç; 6 haneli kod aktif CourierPass kartında görünür.
5. Güvenlik rolünden **Girişi Tamamla** ile akışı bitir.

## Sonraki aşama: gerçek Supabase

Demo onaylandıktan sonra aşağıdaki katmanlar gerçek zamanlı Supabase sistemine taşınabilir:
- Kimlik doğrulama ve roller
- Kurye profilleri ve plaka doğrulama
- CourierPass talepleri
- Realtime güvenlik kuyruğu
- Push bildirimleri
- Site, blok, kapı ve daire yönetimi
- Zaman sınırlı geçiş kodları
- Denetim kayıtları ve raporlar

## Sürüm

`DraBornGate v0.1.0 — local demo / database-free`

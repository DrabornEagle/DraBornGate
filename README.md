# DraBornGate v0.3.7

DraBornGate; kurye geçişi, AirPass, VisitorPass, site sakini, güvenlik, site kuralları, aidat ve site finans işlemlerini aynı güvenli site platformunda birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm bilgileri

- Uygulama sürümü: `0.3.7`
- Demo veri sürümü: `0.3.7`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `1`
- Bildirim kanalı: `draborngate-core`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`
- Özel görseller: private `draborngate-private` Storage bucket

Android `versionCode`, APK çıktısı alınacak sürüme kadar `1` olarak korunur. Uygulama sürümü ve demo veri sürümü birlikte artırılır.

## v0.3.7 güvenlik, harita ve Play hazırlığı

- Kurye Geçiş Merkezi’nde global zil görünmez; bildirim merkezi diğer uygun ekranlarda korunur.
- Site konumu OpenStreetMap üzerinde dokunarak veya pini sürükleyerek seçilir; Google Maps Android anahtarına bağlı değildir.
- Profilde cihaz bazlı zil sesi ve sessiz mod seçimi bulunur.
- Kurye geçiş kartları farklı modern renk tonlarıyla gösterilir ve listeler 5+5 ilerler.
- Yönetim, ad soyad veya plaka aramasıyla tarih/saat ayrıntılı kurye hareketlerini bulabilir.
- Dijital paketler Google Play Billing ile sunulur; uygulama banka transferi veya harici ödeme bağlantısı içermez.
- Geniş fotoğraf/video ve dosya izinleri engellenmiş, sistem seçicisi kullanılmıştır.
- Google Play hazırlık dosyaları `store_assets/google_play` altında tutulur.

## v0.3.7 güvenlik ve bildirim düzeltmeleri

- Güvenlik, yetkili olduğu sitelerde kurye geçiş kodunu kart üzerinde her zaman görebilir.
- “Kodu Eşleştir” düğmesi modern kod doğrulama ve başarı penceresini açar.
- Sipariş ekran görüntüsü dikkat animasyonuyla gösterilir ve tam ekran açılır.
- Bildirim merkezi 5 kayıtla açılır; “Daha Fazla”, “Tümünü Oku” ve “Tümünü Temizle” işlemlerini destekler.
- Kurye Paketleri kartı yalnızca aktif paketi olmayan kullanıcıya hareketli uyarı verir.
- `SafeAreaView` tamamen `react-native-safe-area-context` üzerinden kullanılır.

## Ana modüller

### CourierPass / Kurye geçişi

- Kurye profili, platform ve motosiklet plakası kaydı.
- Sipariş ekran görüntüsü seçme, OCR ile metin okuma ve manuel düzeltme.
- Görselin çekildiği güncel tarih ve saatin kayıtla birlikte saklanması ve görsel üzerinde gösterilmesi.
- Anlaşmalı site, kapı, etap, blok, kat ve daire seçimi.
- Kritik site kurallarını onaylamadan geçiş talebi gönderememe.
- Talep oluşturulduğu anda benzersiz, 6 haneli ve tek kullanımlık geçiş kodu üretimi.
- Kurye `Kapıya Geldim` işlemini yaptıktan sonra güvenliğe kod doğrulama bildirimi gönderilmesi.
- Kullanılmış kodun tekrar kullanılamaması.

### Güvenlik paneli

- Bekleyen, onaylı, kapıda, aktif ve tamamlanan kurye geçişlerini yönetme.
- Kuryenin söylediği 6 haneli kodu aratarak ilgili geçiş kaydını bulma.
- Kod eşleştiğinde geçişi tamamlama; eşleşmeyen veya kullanılmış kodu reddetme.
- Kurye tarafından gönderilen sipariş ekran görüntüsünü tam ekran açma.
- Onay, ret, kod doğrulama ve geçiş işlemlerinden sonra verileri otomatik yenileme.
- Kurye kuyruğunda ilk açılışta 4 kayıt; `Daha Fazla` ile her seferinde 5 yeni kayıt.
- Güvenlik işlem kayıtlarında ilk açılışta 6 kayıt; `Daha Fazla` ile her seferinde 6 yeni kayıt.

### Site yönetimi ve raporlar

- Günlük, haftalık ve aylık ayrıntılı geçiş raporları.
- Kurye adı, platform, plaka, kapı, müşteri, açık adres, blok, kat, daire ve sipariş numarası.
- Talep oluşturma, kapıya varış, geçiş tamamlama ve ret zamanları.
- Site, kapı, etap, GPS, güvenlik, yönetici ve sakin üyelik yönetimi.
- Kurye hareketleri, tamamlanan geçişler, ziyaretçi sayısı, onay oranı ve kapasite özetleri.

### AirPass

- Uygulama açıkken GPS mesafe kontrolü.
- Yakın kapı önerisi ve konum doğrulama etiketi.
- 30 metre yaklaşma bildirimi ve manuel geçiş talebi.

### VisitorPass

- Site sakininin misafir kodu oluşturması.
- Güvenliğin kodla misafir kaydı bulması, giriş vermesi veya reddetmesi.
- Site ve kapı kurallarının ziyaretçi rolüne göre gösterilmesi.

### Site sakini

- Site, blok, kat ve daire profili.
- Yalnızca olumlu adres eşleşmelerinde ilgili kurye geçişlerini görme.
- Aidat geçmişi ve yönetim izin verdiğinde site finans özeti.

### Kurallar, aidat ve finans

- Site veya kapı / etap bazlı, tarih aralıklı, kritik ve sürümlü kurallar.
- Tüm site, blok veya daire bazlı aidat oluşturma.
- Manuel ödendi / ödenmedi işlemi ve ödeme notu.
- Günlük otomatik borç hatırlatma.
- Gelir, gider ve sakin görünürlüğü ayarları.

### Profil ve roller

- Birden fazla role sahip kullanıcıların roller arasında geçiş yapabilmesi.
- Kullanıcının yalnızca tek rolü varsa profilde `Rollerim` bölümünün gösterilmemesi.

### Bildirim sistemi

- Expo Notifications ile Android izin ve kanal yönetimi.
- Firebase Cloud Messaging HTTP v1 cihaz anahtarı kaydı.
- Supabase bildirim kuyruğu, veritabanı tetikleyicisi ve `dkd-gate-push-dispatch` Edge Function.
- Kurye talebi, kapıya varış, onay, ret, kod doğrulama ve tamamlanan geçiş bildirimleri.
- Firebase Admin özel anahtarı APK veya GitHub içinde tutulmaz; yalnızca Supabase Vault üzerinden Edge Function tarafından okunur.
- Expo Go yalnızca uygulama geliştirme arayüz testi için kullanılabilir; uzak FCM bildirimi için development/release APK gerekir.

## Veri ayrımı

- Ortak DraBornGo / DraBornGate kimliği: `auth.users`
- DraBornGate özel şeması: `draborngate`
- DraBornGo ürün tablolarına dokunulmaz.
- İki uygulama yalnızca Supabase Auth kullanıcı kimliğini paylaşır.
- Gerçek kayıtlarla demo kayıtları birbirinden ayrılır.

## Demo verileri

Demo varsayılan olarak yüklenmez. Profil ekranından v0.3.7 demo paketi yüklenebilir, yeniden kurulabilir, güncellenebilir veya yalnızca demo kayıtları silinebilir. Gerçek kayıtlar demo işlemlerinden etkilenmez.

## Doğrulama

```bash
npm install --no-audit --no-fund
npm run typecheck
npx expo export --platform android --output-dir dist --max-workers 2 --no-bytecode
```

GitHub doğrulama akışı TypeScript, Expo Android export, native Android yapılandırması, Firebase Android dosyası, paket adı, uygulama sürümü, demo veri sürümü, Expo Go bildirim güvenliği ve Android `versionCode` politikasını kontrol eder.

Release iş akışları:

- `.github/workflows/dkd_draborngate_release_apk.yml`
- `.github/workflows/dkd_draborngate_release_aab.yml`

## Termux: önce yedek, sonra v0.3.7 ile GitHub main’e eşitle

Tek komut:

```bash
cd /sdcard/Download && curl -L -o DraBornGate-v0.3.7-Termux.sh https://raw.githubusercontent.com/DrabornEagle/DraBornGate/main/scripts/dkd_update_v0_3_7_termux.sh && chmod +x DraBornGate-v0.3.7-Termux.sh && bash DraBornGate-v0.3.7-Termux.sh
```

Komut, mevcut `~/DraBornGate` klasörünü önce `/sdcard/Download` içine ZIP olarak yedekler; ardından yerel `main` dalını GitHub `origin/main` ile birebir eşitler, bağımlılıkları kurar, TypeScript kontrolünü çalıştırır ve Expo Go’yu temiz önbellekle başlatır.

## GitHub yedekleri

- v0.3.3 sürüm yedeği: `backup/v0.3.3-2026-07-25`
- v0.3.4 README düzeltmesi öncesi yedek: `backup/v0.3.4-before-readme-sync-2026-07-25`
- v0.3.5 Expo Go düzeltmesi öncesi yedek: `backup/v0.3.4-before-v0.3.5-expogo-fix-2026-07-25`

## v0.4 öncesi durum

v0.3.7; geçiş güvenliği, görünür güvenlik kodu, karttan kod eşleştirme, bildirim temizleme/sayfalama ve release APK/AAB iş akışlarını birlikte doğrular. Gerçek FCM ve kurye–güvenlik kod eşleşmesi iki ayrı telefonda release APK ile test edilmelidir.

# DraBornGate v0.3.4

DraBornGate; kurye geçişi, AirPass, VisitorPass, site sakini, güvenlik, site kuralları, aidat ve site finans işlemlerini aynı güvenli site platformunda birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm bilgileri

- Uygulama sürümü: `0.3.4`
- Demo veri sürümü: `0.3.4`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `1`
- Bildirim kanalı: `draborngate-core`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`
- Özel görseller: private `draborngate-private` Storage bucket

Android `versionCode`, APK çıktısı alınacak sürüme kadar `1` olarak korunur. Uygulama sürümü ve demo veri sürümü birlikte artırılır.

## v0.3.4 ana modülleri

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

## Veri ayrımı

- Ortak DraBornGo / DraBornGate kimliği: `auth.users`
- DraBornGate özel şeması: `draborngate`
- DraBornGo ürün tablolarına dokunulmaz.
- İki uygulama yalnızca Supabase Auth kullanıcı kimliğini paylaşır.
- Gerçek kayıtlarla demo kayıtları birbirinden ayrılır.

## Demo verileri

Demo varsayılan olarak yüklenmez. Profil ekranından v0.3.4 demo paketi yüklenebilir, yeniden kurulabilir, güncellenebilir veya yalnızca demo kayıtları silinebilir. Gerçek kayıtlar demo işlemlerinden etkilenmez.

## Doğrulama

```bash
npm install --no-audit --no-fund
npm run typecheck
npx expo export --platform android --output-dir dist --max-workers 2 --no-bytecode
```

GitHub doğrulama akışı TypeScript, Expo Android export, native Android yapılandırması, Firebase Android dosyası, paket adı, uygulama sürümü, demo veri sürümü ve Android `versionCode` politikasını kontrol eder.

Release iş akışları:

- `.github/workflows/dkd_draborngate_release_apk.yml`
- `.github/workflows/dkd_draborngate_release_aab.yml`

## Termux: önce yedek, sonra v0.3.4 ile eşitle

```bash
pkg update -y
pkg install git nodejs-lts zip -y
termux-setup-storage
mkdir -p ~/projects
cd ~/projects

if [ ! -d DraBornGate/.git ]; then
  git clone https://github.com/DrabornEagle/DraBornGate.git DraBornGate
fi

cd ~/projects/DraBornGate
git fetch origin --prune

TS="$(date +%Y%m%d_%H%M%S)"
git archive \
  --format=zip \
  --output="/sdcard/Download/DraBornGate_v0.3.3_before_v0.3.4_${TS}.zip" \
  origin/backup/v0.3.3-2026-07-25

git stash push -u -m "DraBornGate_local_before_v0.3.4_${TS}" || true
git checkout main
git reset --hard origin/main
npm install --no-audit --no-fund
npm run typecheck

node -p '"Sürüm: " + require("./package.json").version'
git rev-parse --short HEAD
git status --short
```

## GitHub yedekleri

- v0.3.3 sürüm yedeği: `backup/v0.3.3-2026-07-25`
- v0.3.4 README düzeltmesi öncesi yedek: `backup/v0.3.4-before-readme-sync-2026-07-25`

## v0.4 öncesi durum

v0.3.4; geçiş kodu akışı, güvenlik doğrulaması, zaman damgalı görseller, otomatik veri yenileme, ayrıntılı yönetim raporları, kayıt sayfalaması ve bildirim altyapısındaki eksikleri kapatan sürümdür. v0.4 geliştirmelerine geçmeden önce gerçek cihaz bildirimleri, iki telefonlu kurye–güvenlik senaryosu ve APK / AAB release iş akışları son kez uçtan uca test edilmelidir.

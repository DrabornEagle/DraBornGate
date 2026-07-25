# DraBornGate v0.3.6

DraBornGate; kurye geçişi, AirPass / Akıllı Geçiş, VisitorPass, site sakini, güvenlik, site yönetimi, ayrıntılı raporlama, aidat ve finans işlemlerini aynı güvenli site platformunda birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm bilgileri

- Uygulama sürümü: `0.3.6`
- Demo veri sürümü: `0.3.6`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `1`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`
- Özel sipariş görselleri: private `draborngate-private` Storage bucket
- Özel imzalama kasası: private `draborngate-release-private` Storage bucket

Uygulama sürümü ve demo veri sürümü birlikte artırılır. İlk imzalı APK sürümünde Android `versionCode` değeri `1` olarak korunmuştur.

## v0.3.6 yenilikleri

### Büyük ve açılır rapor kategorileri

Site Yönetimi Raporlar ekranındaki küçük ve sıkışık metinler büyütüldü. Raporlar aşağıdaki açılır / kapanır ana kategorilere ayrıldı:

- Genel performans özeti
- Kurye giriş ve teslimat ayrıntıları
- Gün gün hareket
- Yoğun saatler
- Kapı performansı
- Kurye performansı
- Güvenlik personeli işlemleri
- Paket kullanımı ve rapor dışa aktarma

Günlük, haftalık ve aylık raporlar korunur. Kurye adı, platform, plaka, giriş kapısı, müşteri, açık adres, blok, kat, daire, sipariş numarası, talep saati, kapıya varış ve giriş tamamlama saatleri gösterilir.

### Büyük geçiş ayrıntı ekranları

- `Kurye Giriş ve Teslimat Ayrıntıları` kartına dokunulduğunda büyük modern ayrıntı penceresi açılır.
- Site Yönetimi ana ekranındaki `Günlük Kurye Giriş Kayıtları` kartına dokunulduğunda aynı büyük ayrıntı ekranı açılır.
- Ayrıntı ekranında kurye, plaka, platform, site, kapı, müşteri, adres, sipariş numarası, zaman çizelgesi, konum doğrulaması, kod ve sipariş görseli gösterilir.
- Eski site kurulum, kapı, kural, kullanıcı, aidat ve finans araçları korunur ve `Yönetim Araçları` bölümünden açılır.

### Güvenlik ve tek kullanımlık kod

- Kurye talebi oluşturulduğu anda benzersiz 6 haneli tek kullanımlık kod hazırlanır.
- Güvenlik kuyruğunda kod önceden görünür.
- Kart üzerinde `Güvenlik Doğrulama Kodu` ve `Kodu kuryeden isteyin ve eşleştirin` açıklaması bulunur.
- Kurye `Kapıya Geldim` işlemini yaptıktan sonra güvenlik, kuryenin söylediği kodu sistemde aratır.
- Kod eşleşirse giriş tamamlanır ve kod tekrar kullanılamaz.
- Güvenlik kuyruğundaki kurye, adres, plaka ve durum metinleri büyütüldü.

### Modern Akıllı Geçiş ve Kapıya Geldim

- Akıllı Geçiş paneli daha renkli, açıklayıcı ve hareketli hâle getirildi.
- Talep ve kod, konum kontrolü ve güvenlik doğrulaması adımları görsel ilerleme olarak gösterilir.
- Kapıya kalan mesafe, yakın kapı önerisi ve konum doğrulama durumu daha belirgin gösterilir.
- `Kapıya Geldim` düğmesi renkli ve animasyonlu hâle getirildi.
- İşlemden sonra büyük, modern ve animasyonlu bir başarı penceresi açılır.
- Pencerede görevliye söylenecek kod büyük biçimde gösterilir ve doğrulama adımları açıklanır.

### Kayıt sınırları ve Daha Fazla

- Kurye ana ekranında `Son Hareketler` ilk açılışta en fazla 5 kayıt gösterir.
- `5 Hareket Daha Göster` her dokunuşta 5 yeni kayıt açar.
- `Geçişlerim` ilk açılışta en fazla 4 kayıt gösterir.
- `5 Kayıt Daha Göster` her dokunuşta 5 yeni kayıt açar.
- Güvenlik `Tüm Geçişler` ekranındaki 4 + 5 sayfalama ve Güvenlik İşlemlerindeki 6 + 6 sayfalama korunur.

### Bildirim zili ve bildirim merkezi

- Oturum açılan bütün rol ekranlarına hareketli zil simgesi eklendi.
- Okunmamış bildirim sayısı zil üzerinde gösterilir.
- Bildirim merkezi; kurye, güvenlik, ziyaretçi, aidat, finans ve yönetim bildirimlerini tek yerde toplar.
- Bildirimler tek tek veya topluca okundu olarak işaretlenebilir.
- Bildirim listesi 10 kayıtlık sayfalama kullanır.
- Uygulama içi kayıtlar Supabase bildirim tablosundan gelir; release APK içinde aynı olaylar FCM ile cihaza da gönderilir.

### DraBornGarage tarzı özel bildirim sesleri

Olay türüne göre ayrı Android bildirim kanalları ve yerel sesler bulunur:

- Genel bildirim: `gate_bell.wav`
- Kapıya varış, kod ve Akıllı Geçiş: `gate_chime.wav`
- Onay ve tamamlanan işlem: `gate_digital.wav`
- Ret, iptal ve uyarı: `gate_alert.wav`
- Kritik güvenlik bildirimi: `gate_siren.wav`

Ses dosyaları `npm install` sonrasında `scripts/generate_notification_sounds.mjs` ile otomatik üretilir. Expo Go, Android uzak bildirimlerini desteklemediği için gerçek FCM ve özel ses testi imzalı development / release APK üzerinde yapılır.

### İlk kalıcı imzalı Release APK

- `.github/workflows/dkd_draborngate_release_apk.yml` imzalı release APK üretir.
- İlk çalıştırmada RSA 4096 bit kalıcı DraBornGate imzalama anahtarı oluşturulur.
- Sonraki bütün APK ve AAB sürümleri aynı anahtarla imzalanır.
- Keystore ve parolası GitHub deposuna eklenmez.
- Keystore ve özel metadata yalnızca private Supabase release kasasında saklanır.
- GitHub Actions, kasaya GitHub OIDC kimliğiyle bağlanır.
- APK ve imza raporu GitHub Actions artifact olarak yüklenir; keystore genel artifact alanına konulmaz.

## Ana modüller

### CourierPass / Kurye geçişi

- Kurye profili, platform ve motosiklet plakası kaydı
- Sipariş ekran görüntüsü seçme, OCR ve manuel düzeltme
- Görsel çekim tarih ve saatini kayıtla birlikte saklama
- Anlaşmalı site, kapı, etap, blok, kat ve daire seçimi
- Kritik site kurallarını onaylama
- Otomatik 6 haneli tek kullanımlık kod
- Kapıya varış ve güvenlik kod eşleştirmesi

### AirPass / Akıllı Geçiş

- Uygulama açıkken GPS mesafe kontrolü
- 30 metre yaklaşma uyarısı
- Yakın kapı önerisi
- Konumu güvenliğe gönderme
- Konum doğrulama etiketi

### VisitorPass

- Site sakininin misafir kodu oluşturması
- Güvenliğin kodla misafir bulması
- Giriş verme veya reddetme
- Site ve kapı kurallarını ziyaretçi rolüne göre gösterme

### Site yönetimi, aidat ve finans

- Site, kapı, etap ve GPS yönetimi
- Yönetici, güvenlik ve sakin üyelikleri
- Site / blok / daire bazlı aidat
- Ödendi / ödenmedi işlemi ve ödeme notu
- Günlük borç hatırlatma
- Gelir, gider, bakiye ve sakin görünürlüğü
- Günlük, haftalık ve aylık ayrıntılı raporlar

## Veri ve güvenlik ayrımı

- Ortak DraBornGo / DraBornGate kullanıcı kimliği: `auth.users`
- DraBornGate özel şeması: `draborngate`
- DraBornGo ürün tablolarına dokunulmaz.
- Gerçek kayıtlarla demo kayıtları birbirinden ayrılır.
- Firebase Admin servis hesabı APK veya GitHub içinde tutulmaz; Supabase Vault üzerinden yalnızca Edge Function tarafından okunur.
- Android keystore GitHub deposunda tutulmaz; özel release kasasında korunur.

## Doğrulama

```bash
npm install --no-audit --no-fund
npm run typecheck
npx expo export --platform android --output-dir dist --max-workers 2 --no-bytecode
```

GitHub doğrulama akışı şunları denetler:

- TypeScript
- Expo Android export
- Native Android prebuild
- Firebase Android yapılandırması
- Paket adı ve sürüm alanları
- Android `versionCode: 1`
- Expo Go bildirim güvenliği
- Özel bildirim sesleri
- Açılır rapor kategorileri ve büyük ayrıntı ekranları
- Sayfalama kuralları
- Keystore veya Firebase Admin dosyasının repoya eklenmemesi

Release iş akışları:

- `.github/workflows/dkd_draborngate_release_apk.yml`
- `.github/workflows/dkd_draborngate_release_aab.yml`

## Termux: önce v0.3.5 yedeği, sonra v0.3.6 eşitlemesi

```bash
pkg update -y
pkg install git nodejs-lts zip -y
termux-setup-storage
mkdir -p ~/projects

if [ ! -d ~/projects/DraBornGate/.git ]; then
  git clone https://github.com/DrabornEagle/DraBornGate.git ~/projects/DraBornGate
fi

cd ~/projects/DraBornGate
git fetch origin --prune

TS="$(date +%Y%m%d_%H%M%S)"
git archive \
  --format=zip \
  --output="/sdcard/Download/DraBornGate_v0.3.5_before_v0.3.6_${TS}.zip" \
  origin/backup/v0.3.5-before-v0.3.6-ui-notifications-apk-2026-07-25

git stash push -u -m "DraBornGate_local_before_v0.3.6_${TS}" || true
git checkout main
git reset --hard origin/main
rm -rf node_modules .expo dist
rm -f package-lock.json
npm install --no-audit --no-fund
npm run typecheck

node -p '"Sürüm: " + require("./package.json").version'
echo "Commit: $(git rev-parse --short HEAD)"
git status --short
```

## GitHub sürüm yedekleri

- `backup/v0.3.3-2026-07-25`
- `backup/v0.3.4-before-readme-sync-2026-07-25`
- `backup/v0.3.4-before-v0.3.5-expogo-fix-2026-07-25`
- `backup/v0.3.5-before-v0.3.6-ui-notifications-apk-2026-07-25`

## v0.4 öncesi durum

v0.3.6; büyük ve açılır raporları, modern geçiş ayrıntılarını, görünür güvenlik kodunu, yeni Akıllı Geçiş deneyimini, bildirim zilini, özel bildirim seslerini ve ilk kalıcı imzalı APK altyapısını tamamlayan sürümdür. v0.4 öncesinde imzalı APK ile iki ayrı telefonda kurye–güvenlik geçişi, FCM bildirimi, özel zil sesi ve tek kullanımlık kod doğrulaması uçtan uca test edilmelidir.

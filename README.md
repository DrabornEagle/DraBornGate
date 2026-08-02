# DraBornGate v0.3.17

DraBornGate; kurye geçişi, tek kullanımlık kod, site güvenliği, site sakini, yönetim, paket, abonelik, bildirim ve destek akışlarını birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm

- Uygulama sürümü: `0.3.17`
- Demo veri sürümü: `0.3.17`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `7`
- Android compile/target SDK: `36`
- Supabase şeması: `draborngate`

## v0.3.17 değişiklikleri

- Google Play satın alımı başarılı olduğu hâlde paket ve geçiş hakkının açılmamasına neden olan doğrulama akışı yeniden kuruldu.
- Uygulama açılışında `getAvailablePurchases()` ile mevcut DraBornGate abonelikleri bulunur, sunucuda doğrulanır, hak tanımlanır ve `finishTransaction()` ile Google Play'e teslimat onayı gönderilir.
- Paket ekranına `ABONELİĞİ GERİ YÜKLE` düğmesi eklendi; tamamlanmış fakat önceki sürümde hakka dönüşmemiş satın alımlar yeniden işlenir.
- Edge Function ham JSON, satır sonu kaçışlı JSON ve Base64 servis hesabı biçimlerini destekler; hatalar kullanıcıya yapılandırılmış kod ve açıklamayla döner.
- Satın alma ürünü ve temel planı artık istemci beyanına güvenilmeden Google Play yanıtı ile Supabase paket kataloğundan eşleştirilir.
- İlk abonelik satın alımı güvenli sunucudan Google Play Developer API ile onaylanır; cihaz tarafı onay da yedek olarak korunur.
- Bir kullanıcıda Plus ve Profesyonel gibi birden fazla aktif ürün varsa en yüksek aktif paket hak olarak seçilir.
- Süresi biten, beklemede, duraklatılmış veya ödeme bekleyen planlar geçiş hakkı vermez; iptal edilmiş fakat dönem sonu gelmemiş plan dönem sonuna kadar çalışır.
- Site Yönetimi ekranında site sakinleri ad soyad, daire, blok veya telefon numarasıyla aranabilir.
- Repoda yalnız `DraBornGate Release APK` ve `DraBornGate Release AAB` workflow'ları tutulur.

## Google Play abonelik kataloğu

Kurye ürünleri:

- `draborngate.courier.plus`
- `draborngate.courier.pro`

Site Yönetimi ürünleri:

- `draborngate.site.professional`
- `draborngate.site.corporate`

Temel planlar: `weekly-auto`, `monthly-auto`, `yearly-auto`.

## Otomatik kontroller

```bash
npm install --no-audit --no-fund --package-lock=false
node scripts/dkd_verify_v0317.js
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh
```

Kontroller; sürüm/versionCode, paket adı, target SDK, hassas izinler, gizlilik/koşullar/hesap silme sayfaları, Google Play ürün eşleşmesi, sunucu doğrulaması, satın alma geri yükleme, acknowledgement, sakin araması ve yalnız iki release workflow'unu kapsar.

## Termux: yedekle, kur ve `Projects/DraBornGate` klasörünü GitHub ile eşitle

```bash
if [ -d "$HOME/Projects/DraBornGate/.git" ]; then REPO="$HOME/Projects/DraBornGate"; else REPO="$HOME/projects/DraBornGate"; fi
cd "$REPO" && git fetch origin main --prune && git checkout origin/main -- scripts/dkd_termux_sync_v0317.sh && bash scripts/dkd_termux_sync_v0317.sh "$REPO"
```

Betiğin yaptığı işlemler: mevcut lokal projeyi `/sdcard/Download/DraBornGate_Yedekler` içine ZIP olarak yedekler, `backup/draborngate-v0.3.16-before-v0.3.17-20260802` dalını doğrular, lokal `main` dalını `origin/main` ile birebir eşitler, bağımlılıkları kurar ve tüm kontrolleri çalıştırır.

## Lokal projeyi v0.3.16 sürümüne geri alma

```bash
if [ -d "$HOME/Projects/DraBornGate/.git" ]; then REPO="$HOME/Projects/DraBornGate"; else REPO="$HOME/projects/DraBornGate"; fi
cd "$REPO" && git fetch origin main --prune && git checkout origin/main -- scripts/dkd_termux_rollback_v0316.sh && bash scripts/dkd_termux_rollback_v0316.sh "$REPO"
```

Geri alma yalnız telefondaki projeyi yedek dala döndürür; GitHub `main` dalını değiştirmez ve geri almadan önce ayrıca ZIP yedeği alır.

## Sürüm yükseltme standardı

Her sürümde sırasıyla önceki `main` için tarihli GitHub yedek dalı oluşturulur, lokal ZIP yedeği alınır, uygulama sürümü ve Android `versionCode` birlikte artırılır, Supabase migration ve Edge Function yayınlanır, TypeScript/politika kontrolleri çalıştırılır, yalnız iki release workflow'u korunur, imzalı APK/AAB üretilip GitHub artifact ve Supabase özel release kasasına yüklenir.

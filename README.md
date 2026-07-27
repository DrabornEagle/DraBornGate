# DraBornGate v0.3.15

DraBornGate; kurye geçişi, tek kullanımlık kod, site güvenliği, site sakini, yönetim, paket, abonelik, bildirim ve destek akışlarını birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm

- Uygulama sürümü: `0.3.15`
- Demo veri sürümü: `0.3.15`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `5`
- Android compile/target SDK: `36`
- Bildirim kanalı: `draborngate-core`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`

## v0.3.15 değişiklikleri

- `expo-iap` abonelik sorgusunun sonuçları artık yalnızca `products` listesinden değil, aboneliklere ayrılmış `subscriptions` durumundan da okunur.
- `fetchProducts({ type: 'subs' })` sonucunun `products`, `subscriptions` veya doğrudan dizi biçimlerinin tamamı tek katalogda birleştirilir.
- Kurye Plus, Kurye Profesyonel, Site Profesyonel ve Site Kurumsal paketleri aynı düzeltilmiş Google Play Billing bileşenini kullanır.
- Ürün bulunamadı ekranına abonelik, ürün ve doğrudan sorgu kaynaklarının ayrı kayıt sayıları eklendi.
- Haftalık, aylık ve yıllık temel planlar için kesin temel plan kimliği ve teklif belirteci eşleşmesi korunur.
- Satın alma sonrası Supabase `dkd-gate-play-verify` sunucu doğrulaması korunur.
- Android sürüm kodu Google Play için `5` oldu.

## Google Play abonelik kataloğu

Kurye ürünleri:

- `draborngate.courier.plus`
- `draborngate.courier.pro`

Site Yönetimi ürünleri:

- `draborngate.site.professional`
- `draborngate.site.corporate`

Tüm ücretli ürünlerin temel plan kimlikleri:

- `weekly-auto`
- `monthly-auto`
- `yearly-auto`

## Release workflow’ları

Repoda yalnızca iki GitHub Actions workflow’u tutulur:

- `.github/workflows/dkd_draborngate_release_apk.yml`
- `.github/workflows/dkd_draborngate_release_aab.yml`

## Otomatik Google Play kontrolü

```bash
npm install --no-audit --no-fund --package-lock=false
node scripts/dkd_verify_v0315.js
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh
```

Kontroller; sürüm/kod, paket adı, target/compile SDK 36, `subscriptions` kataloğunun kullanılması, kesin temel plan eşleşmesi, sunucu tarafı satın alma doğrulaması, iki paket ekranının ortak billing bileşeni, UMP/AD_ID, hassas izin engelleri, gizlilik, koşullar ve hesap silme URL’lerini kapsar.

## Termux: önce yedekle, sonra lokal repoyu GitHub ile eşitle

```bash
if [ -d "$HOME/projects/DraBornGate/.git" ]; then REPO="$HOME/projects/DraBornGate"; else REPO="$HOME/Projects/DraBornGate"; fi
cd "$REPO" && git fetch origin main --prune && git checkout origin/main -- scripts/dkd_termux_sync_v0315.sh && bash scripts/dkd_termux_sync_v0315.sh "$REPO"
```

İşlem mevcut yerel kaynağı önce `/sdcard/Download/DraBornGate_Yedekler` içine ZIP olarak yedekler, `backup/draborngate-v0.3.14-before-v0.3.15-billing-state-fix` dalını doğrular, yerel `main` dalını `origin/main` ile birebir eşitler ve tüm kontrolleri çalıştırır.

## Yerel projeyi v0.3.14 sürümüne geri alma

```bash
if [ -d "$HOME/projects/DraBornGate/.git" ]; then REPO="$HOME/projects/DraBornGate"; else REPO="$HOME/Projects/DraBornGate"; fi
cd "$REPO" && git fetch origin main --prune && git checkout origin/main -- scripts/dkd_termux_rollback_v0314.sh && bash scripts/dkd_termux_rollback_v0314.sh "$REPO"
```

Geri alma betiği önce mevcut yerel kaynağı ZIP olarak yedekler ve yalnızca telefondaki projeyi `backup/draborngate-v0.3.14-before-v0.3.15-billing-state-fix` dalına döndürür. GitHub `main` dalını değiştirmez.

## Sürüm yükseltme standardı

Her yeni sürümde sırasıyla güvenlik dalı, yerel ZIP yedeği, merkezi sürüm alanları, Android `versionCode`, doğrulayıcı, politika kapısı, release workflow’ları, Supabase sürüm kaydı, AAB/APK çıktısı ve Termux eşitleme/geri alma komutları birlikte güncellenir.
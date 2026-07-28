# DraBornGate v0.3.16

DraBornGate; kurye geçişi, tek kullanımlık kod, site güvenliği, site sakini, yönetim, paket, abonelik, bildirim ve destek akışlarını birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm

- Uygulama sürümü: `0.3.16`
- Demo veri sürümü: `0.3.16`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `6`
- Android compile/target SDK: `36`
- Bildirim kanalı: `draborngate-core`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`

## v0.3.16 değişiklikleri

- Aboneliklerin çalışan Google Play Billing ve Supabase `dkd-gate-play-verify` doğrulama akışı korundu.
- Kurye ana ekranındaki `paket hakkı` ve `video ödülü kullanılabilir` kırılım metni kaldırıldı; yalnız toplam geçiş hakkı gösteriliyor.
- Site Sakini Merkezi `CANLI` rozeti başlığın yanına taşındı.
- Kurye paket kartına her dokunuşta ekran, tek animasyonla Google Play abonelik alanına kaydırılıyor.
- `GOOGLE PLAY İLE ABONE OL` butonu modern, çok renkli, hareketli ışık geçişli ve daha belirgin hâle getirildi.
- Kayıt ekranındaki dört Hesap Türü kartı modern renkler, seçili durum rozeti ve hafif animasyonla yenilendi.
- `DRABORNGO ORTAK HESAP SİSTEMİ` üst etiketi kaldırıldı.
- Kayıt ekranındaki `DraBornGate verileri ayrı şemada tutulur...` alt açıklaması kaldırıldı.
- Google Play otomatik politika kapısına yeni UI, izin, billing, gizlilik URL’si ve workflow envanteri kontrolleri eklendi.
- Android sürüm kodu Google Play için `6` oldu.

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
node scripts/dkd_verify_v0316.js
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh
```

Kontroller; sürüm/kod, paket adı, target/compile SDK 36, Google Play abonelik kataloğu, kesin temel plan eşleşmesi, sunucu tarafı satın alma doğrulaması, UMP/AD_ID, hassas izin engelleri, gizlilik/koşullar/hesap silme URL’leri, modern abonelik butonu, paket seçim kaydırması ve kaldırılması istenen metinleri kapsar.

## Termux: önce yedekle, sonra lokal repoyu GitHub ile eşitle

```bash
if [ -d "$HOME/projects/DraBornGate/.git" ]; then REPO="$HOME/projects/DraBornGate"; else REPO="$HOME/Projects/DraBornGate"; fi
cd "$REPO" && git fetch origin main --prune && git checkout origin/main -- scripts/dkd_termux_sync_v0316.sh && bash scripts/dkd_termux_sync_v0316.sh "$REPO"
```

İşlem mevcut yerel kaynağı önce `/sdcard/Download/DraBornGate_Yedekler` içine ZIP olarak yedekler, `backup/draborngate-v0.3.15-before-v0.3.16-20260728` dalını doğrular, yerel `main` dalını `origin/main` ile birebir eşitler ve tüm kontrolleri çalıştırır.

## Yerel projeyi v0.3.15 sürümüne geri alma

```bash
if [ -d "$HOME/projects/DraBornGate/.git" ]; then REPO="$HOME/projects/DraBornGate"; else REPO="$HOME/Projects/DraBornGate"; fi
cd "$REPO" && git fetch origin main --prune && git checkout origin/main -- scripts/dkd_termux_rollback_v0315.sh && bash scripts/dkd_termux_rollback_v0315.sh "$REPO"
```

Geri alma betiği önce mevcut yerel kaynağı ZIP olarak yedekler ve yalnızca telefondaki projeyi `backup/draborngate-v0.3.15-before-v0.3.16-20260728` dalına döndürür. GitHub `main` dalını değiştirmez.

## Sürüm yükseltme standardı

Her yeni sürümde sırasıyla güvenlik dalı, yerel ZIP yedeği, merkezi sürüm alanları, Android `versionCode`, doğrulayıcı, politika kapısı, yalnız iki release workflow’u, Supabase release kaydı, AAB/APK çıktısı ve Termux eşitleme/geri alma komutları birlikte güncellenir.

# DraBornGate v0.3.14

DraBornGate; kurye geçişi, tek kullanımlık kod, site güvenliği, site sakini, yönetim, paket, abonelik, bildirim ve destek akışlarını birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm

- Uygulama sürümü: `0.3.14`
- Demo veri sürümü: `0.3.14`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `4`
- Android compile/target SDK: `36`
- Bildirim kanalı: `draborngate-core`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`

## v0.3.14 değişiklikleri

- Google Play abonelik sorgusu ürün ve temel plan düzeyinde kesin eşleşme yapar.
- Yanlış haftalık/aylık/yıllık teklife düşebilen ilk teklif fallback’i kaldırıldı.
- Google Play’den dönen ürün ve temel plan kimlikleri hata ekranında tanı amaçlı gösterilir.
- Kurye Plus, Kurye Pro, Site Professional ve Site Corporate paketleri aynı doğrulanmış Google Play Billing bileşenini kullanır.
- `expo-iap` sürümü tekrar üretilebilir derleme için `4.7.0` olarak sabitlendi.
- Kaynak dosyalarını kurulum sırasında değiştiren eski postinstall akışı kaldırıldı; salt okunur v0.3.14 doğrulayıcısı eklendi.
- AAB workflow’u eski artifacti kopyalamak yerine gerçek, imzalı ve versionCode 4 AAB üretir.
- AAB ve APK kalıcı keystore ile imzalanır, sertifika SHA-256 eşleşmesi doğrulanır ve Supabase özel release kasasına yüklenir.

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
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh
```

Kontroller; sürüm/kod, paket adı, target/compile SDK 36, kesin abonelik temel plan eşleşmesi, sunucu tarafı satın alma doğrulaması, iki paket ekranının ortak billing bileşeni, UMP/AD_ID, hassas izin engelleri, gizlilik, koşullar ve hesap silme URL’lerini kapsar.

## Termux: yedekle ve `Projects/DraBornGate` klasörünü GitHub main ile eşitle

```bash
cd "$HOME" && pkg install -y git nodejs-lts zip unzip ripgrep && mkdir -p "$HOME/projects" && { [ -d "$HOME/projects/DraBornGate/.git" ] || git clone https://github.com/DrabornEagle/DraBornGate.git "$HOME/projects/DraBornGate"; } && cd "$HOME/projects/DraBornGate" && bash scripts/dkd_termux_sync_v0314.sh "$HOME/projects/DraBornGate"
```

Bu işlem mevcut yerel kaynağı önce `/sdcard/Download/DraBornGate_Yedekler` içine ZIP olarak yedekler, `backup/draborngate-v0.3.13-before-v0.3.14` dalını doğrular, yerel `main` dalını `origin/main` ile birebir eşitler ve tüm kontrolleri çalıştırır.

## v0.3.13 yerel geri alma

```bash
cd "$HOME/projects/DraBornGate" && bash scripts/dkd_termux_rollback_v0313.sh "$HOME/projects/DraBornGate"
```

Geri alma betiği önce mevcut v0.3.14 kaynağını ZIP olarak yedekler ve yalnızca yerel projeyi yedek dalına döndürür. GitHub `main` dalını değiştirmez.

## Sürüm yükseltme standardı

Her sürümde sırasıyla mevcut sürüm için GitHub yedek dalı oluşturulur, yerel ZIP yedeği alınır, sürüm/versionCode artırılır, TypeScript ve politika kontrolleri çalıştırılır, yerel repo GitHub main ile eşitlenir, kalıcı keystore ile imzalı APK/AAB üretilir ve çıktılar GitHub artifact ile Supabase özel release kasasına yüklenir.

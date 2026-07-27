# DraBornGate v0.3.13

DraBornGate; kurye geçişi, tek kullanımlık kod, site güvenliği, site sakini, yönetim, paket, abonelik, bildirim ve destek akışlarını birleştiren Expo / React Native uygulamasıdır.

## Güncel sürüm

- Uygulama sürümü: `0.3.13`
- Demo veri sürümü: `0.3.13`
- Android paket adı: `com.draborneagle.draborngate`
- Android `versionCode`: `3`
- Android compile/target SDK: `36`
- Bildirim kanalı: `draborngate-core`
- Supabase şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`

## v0.3.13 değişiklikleri

- `com.google.android.gms.permission.AD_ID` Android manifestine eklendi ve derlenmiş APK üzerinde doğrulandı.
- Google UMP reklam gizlilik onayı ve uygulama içi reklam tercihleri erişimi eklendi.
- Ana sayfa geçiş kartı başlığı `Artık Vakit Kaybetmek YOK` olarak güncellendi.
- Yeni Kurye Geçişi ekranındaki kalan hak kartı modern, renkli ve animasyonlu hale getirildi.
- Profil görselindeki yeşil tik kaldırıldı.
- Profildeki Destek butonu animasyonlu hale getirildi.
- Sürüm, TypeScript, API 36, hassas izin, UMP, AD_ID, politika URL’leri, AAB imzası ve kalıcı keystore otomatik doğrulanır.

## Release workflow’ları

Repoda yalnızca iki GitHub Actions workflow’u tutulur:

- `.github/workflows/dkd_draborngate_release_apk.yml`
- `.github/workflows/dkd_draborngate_release_aab.yml`

v0.3.13 imzalı AAB kaynak run’ı: `30279086956`.

Büyük AAB dosyasının Supabase özel yedeği, proje dosya sınırına uygun şekilde 17 parçaya bölünür. `manifest.json`; orijinal dosya boyutunu, SHA-256 değerini, parça sırasını ve parça SHA-256 değerlerini saklar.

## Google Play kontrolü

```bash
npm install --no-audit --no-fund --package-lock=false
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh
```

Otomatik kapı şunları kontrol eder:

- sürüm `0.3.13` ve Android kodu `3`
- target/compile SDK 36
- `AD_ID` ve AdMob uygulama kimliği
- Google UMP gizlilik akışı
- `allowBackup=false`
- arka plan konumu, geniş depolama, mikrofon ve overlay gibi gereksiz hassas izinlerin bulunmaması
- gizlilik, kullanım koşulları ve hesap silme sayfalarının erişilebilir olması

## Termux: önce yedekle, sonra GitHub main ile birebir eşitle

```bash
cd $HOME && pkg install -y git nodejs-lts zip unzip && [ -d "$HOME/DraBornGate/.git" ] || git clone https://github.com/DrabornEagle/DraBornGate.git "$HOME/DraBornGate"; cd "$HOME/DraBornGate" && bash scripts/dkd_termux_sync_v0313.sh "$HOME/DraBornGate"
```

Bu işlem:

1. Mevcut yerel projeyi `/sdcard/Download` içine ZIP olarak yedekler.
2. GitHub’daki `backup/draborngate-v0.3.12-before-v0.3.13` dalını doğrular.
3. Yerel `main` dalını `origin/main` ile birebir eşitler.
4. Bağımlılık, TypeScript ve Google Play politika kontrollerini çalıştırır.
5. Yerel ve uzak commit SHA değerlerinin eşit olduğunu doğrular.

## v0.3.12 yerel geri alma

```bash
cd "$HOME/DraBornGate" && bash scripts/dkd_termux_rollback_v0312.sh "$HOME/DraBornGate"
```

GitHub `main` dalının da zorunlu olarak eski sürüme döndürülmesi gerektiğinde, geri alma betiğinden sonra:

```bash
git push --force-with-lease origin main
```

## Sürüm yükseltme standardı

Her yeni sürümde sırasıyla:

1. Mevcut sürüm için GitHub yedek dalı oluşturulur.
2. Yerel kaynak ZIP yedeği alınır.
3. Sürüm ve Android `versionCode` artırılır.
4. Kaynak, TypeScript ve Google Play politika kontrolleri çalıştırılır.
5. GitHub `main` ve yerel repo aynı commit SHA’ya eşitlenir.
6. İmzalı APK/AAB üretilir ve kalıcı keystore sertifikasıyla doğrulanır.
7. Release dosyaları GitHub artifact ve Supabase özel release kasasına yedeklenir.

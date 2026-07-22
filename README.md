# DraBornGate v0.2.0

DraBornGate; kurye geçişi, AirPass, VisitorPass, site sakini, site kuralları ve aidat/site finans işlemlerini aynı güvenli site platformunda birleştiren Expo/React Native uygulamasıdır.

## v0.2 ana modülleri

- **CourierPass:** Kurye profili, sipariş ekran görüntüsü, OCR, manuel düzeltme, anlaşmalı site/kapı seçimi, kritik kural onayı, güvenlik onay/ret akışı ve tek kullanımlık 6 haneli yedek kod.
- **AirPass:** Uygulama açıkken GPS mesafe kontrolü, 30 metre bildirimi, manuel gönderme, yakın kapı önerisi ve konum doğrulama etiketi.
- **VisitorPass:** Site sakininin misafir kodu oluşturması ve güvenliğin kodla giriş/ret işlemi yapması.
- **Site sakini:** Site/blok/kat/daire kaydı, yalnızca olumlu adres eşleşmelerinde kurye görünümü ve bildirim, aidat geçmişi ve yönetim izin verirse finans özeti.
- **Kurallar:** Site veya kapı/etap bazlı, tarih aralıklı, kritik ve sürümlü kurallar. Kurye kritik kuralları onaylamadan talep gönderemez; misafir yalnızca genel site kurallarını görür.
- **Aidat/Finans:** Tüm site, blok veya daire bazlı aidat; manuel ödendi/ödenmedi; ödeme notu; günlük otomatik borç hatırlatma; gelir/gider ve sakin görünürlüğü.
- **Site yönetimi:** Site, kapı, GPS, güvenlik/yönetici/sakin üyeliği, günlük kurye kayıtları ve finans dashboard.

## Veri ayrımı

- Ortak DraBornGo/DraBornGate kimliği: `auth.users`
- DraBornGate özel şeması: `draborngate`
- Tablo standardı: `draborngate.dkd_gate_*`
- Mobil RPC standardı: `public.dkd_gate_*`
- Özel görseller: private `draborngate-private` Storage bucket
- Uygulama sürümü: `0.2.0`
- Demo veri sürümü: `0.2.0`
- Android `versionCode`: `1`

DraBornGo ürün tablolarına dokunulmaz. İki uygulama yalnızca Supabase Auth kullanıcı kimliğini paylaşır.

## Demo verileri

Demo varsayılan olarak yüklenmez. Profil ekranından v0.2 demo paketi yüklenebilir, yeniden kurulabilir, yeni sürüme güncellenebilir veya yalnızca demo kayıtları silinebilir. Gerçek kayıtlar bu işlemlerden etkilenmez.

## Doğrulama

```bash
npm install
npm run typecheck
npx expo export --platform android --output-dir dist --max-workers 2 --no-bytecode
```

`.github/workflows/v0-2-validate.yml` her `main` güncellemesinde bağımlılık, Expo uyumu, TypeScript, Android export ve sürüm politikasını kontrol eder. Bu aşamada APK/AAB üretilmez.

## Termux: önce yedek, sonra v0.2 güncellemesi

```bash
pkg install git nodejs-lts zip -y
cd ~
termux-setup-storage
rm -f /sdcard/Download/DraBornGate_v0.0.2_before_v0.2.0.zip
zip -r /sdcard/Download/DraBornGate_v0.0.2_before_v0.2.0.zip DraBornGate \
  -x 'DraBornGate/node_modules/*' \
     'DraBornGate/.expo/*' \
     'DraBornGate/dist/*'
cd ~/DraBornGate
git fetch origin
git reset --hard origin/main
rm -rf node_modules .expo dist
npm install
EXPO_NO_DEV_TOOLS=1 npx expo start -c
```

GitHub yedeği: `backup/draborngate-v0.0.2-before-v0.1-v0.2`

# DraBornGate v0.0.2

DraBornGate, DraBornGo ile aynı Supabase kimliğini (`auth.users`) kullanan; ürün verilerini tamamen ayrı `draborngate` şemasında saklayan Expo/React Native kurye–güvenlik uygulamasıdır.

## Veri ayrımı

- Ortak kimlik: `auth.users`
- DraBornGate şeması: `draborngate`
- Tablo öneki: `dkd_gate_*`
- RPC öneki: `public.dkd_gate_*`
- Uygulama sürümü: `0.0.2`
- Android `versionCode`: `1`
- Demo veri sürümü: `0.0.2`

Demo varsayılan olarak yüklenmez. Profil/Ayarlar ekranından yüklenebilir, yeni sürüme güncellenebilir veya yalnızca demo kayıtları silinebilir.

## Termux: önce yedek, sonra güncelle

```bash
pkg install git nodejs-lts zip -y
cd ~
termux-setup-storage
rm -f /sdcard/Download/DraBornGate_v0.1.0_before_v0.0.2.zip
zip -r /sdcard/Download/DraBornGate_v0.1.0_before_v0.0.2.zip DraBornGate \
  -x 'DraBornGate/node_modules/*' 'DraBornGate/.expo/*' 'DraBornGate/dist/*'
cd ~/DraBornGate
git fetch origin
git reset --hard origin/main
rm -rf node_modules .expo dist
npm install
EXPO_NO_DEV_TOOLS=1 npx expo start -c
```

GitHub yedeği: `backup/draborngate-v0.1.0-before-v0.0.2`

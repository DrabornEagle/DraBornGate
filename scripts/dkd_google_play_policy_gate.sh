#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-}"
EXPECTED_PACKAGE="com.draborneagle.draborngate"
EXPECTED_VERSION="0.3.13"
EXPECTED_VERSION_CODE=3
MIN_TARGET_SDK=36
AD_ID_PERMISSION="com.google.android.gms.permission.AD_ID"
SAMPLE_ADMOB_APP_ID="ca-app-pub-3940256099942544~3347511713"

node <<'NODE'
const fs = require('fs');
const root = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const app = root.expo;
const ads = root['react-native-google-mobile-ads'] || {};
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = fs.readFileSync('src/config/version.ts', 'utf8');
const appSource = fs.readFileSync('App.tsx', 'utf8');
const courierHome = fs.readFileSync('src/screens/CourierHome.tsx', 'utf8');
const createPass = fs.readFileSync('src/screens/CreatePassScreen.tsx', 'utf8');
const profile = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');
const privacyCenter = fs.readFileSync('src/components/PrivacyDataCenter.tsx', 'utf8');
const consentSource = fs.readFileSync('src/lib/dkdAdConsent.ts', 'utf8');
const requiredUrls = ['privacyPolicyUrl', 'accountDeletionUrl', 'termsUrl'];
const blocked = new Set(app.android?.blockedPermissions ?? []);
const requested = new Set(app.android?.permissions ?? []);
const pluginName = (item) => Array.isArray(item) ? item[0] : item;
const pluginOptions = (name) => {
  const item = (app.plugins || []).find((entry) => pluginName(entry) === name);
  return Array.isArray(item) ? (item[1] || {}) : {};
};

function fail(message) {
  console.error(`POLİTİKA HATASI: ${message}`);
  process.exitCode = 1;
}

if (app.android?.package !== 'com.draborneagle.draborngate') fail('Android paket adı değişmiş.');
if (app.version !== '0.3.13' || pkg.version !== '0.3.13') fail('Uygulama sürümü 0.3.13 değil.');
if (!version.includes("APP_VERSION = '0.3.13'")) fail('Merkezi APP_VERSION 0.3.13 değil.');
if (!version.includes('ANDROID_VERSION_CODE = 3')) fail('Merkezi Android sürüm kodu 3 değil.');
if (app.android?.versionCode !== 3) fail('Android versionCode 3 değil.');
if (app.android?.allowBackup !== false) fail('android.allowBackup false olmalı.');
if (app.androidNavigationBar?.backgroundColor !== '#00000000') fail('Android navigasyon arka planı şeffaf değil.');
for (const key of requiredUrls) {
  const value = app.extra?.[key];
  if (typeof value !== 'string' || !value.startsWith('https://')) fail(`${key} geçerli HTTPS adresi değil.`);
}
if (requested.has('ACCESS_BACKGROUND_LOCATION')) fail('Arka plan konum izni talep edilemez.');
if (!requested.has('ACCESS_COARSE_LOCATION') && !requested.has('ACCESS_FINE_LOCATION')) fail('Akıllı geçiş için foreground konum izni eksik.');
if (!requested.has('com.google.android.gms.permission.AD_ID')) fail('Google Mobile Ads için com.google.android.gms.permission.AD_ID izni eksik.');
for (const permission of [
  'android.permission.MANAGE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
]) {
  if (!blocked.has(permission)) fail(`${permission} blockedPermissions listesinde değil.`);
}
if (!pkg.dependencies?.['expo-iap']) fail('Dijital paket ve abonelikler için Google Play Billing entegrasyonu eksik.');
if (pkg.dependencies?.['react-native-google-mobile-ads'] !== '16.3.3') fail('Expo 57 için doğrulanan Google Mobile Ads 16.3.3 sürümü kullanılmalı.');
if (!pkg.dependencies?.['expo-build-properties']) fail('Kotlin ve UMP ProGuard uyumluluğu için expo-build-properties eksik.');
if (!pkg.dependencies?.['expo-splash-screen']) fail('Native splash ekranı paketi eksik.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'expo-iap')) fail('expo-iap config plugin eksik.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'react-native-google-mobile-ads')) fail('Google Mobile Ads config plugin eksik.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'expo-build-properties')) fail('expo-build-properties config plugin eksik.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'expo-splash-screen')) fail('expo-splash-screen config plugin eksik.');
if (!app.plugins?.includes('./scripts/dkd_with_android_security.js')) fail('Android güvenlik config plugin eksik.');
const adsPlugin = pluginOptions('react-native-google-mobile-ads');
const buildPlugin = pluginOptions('expo-build-properties');
if (typeof ads.android_app_id !== 'string' || !ads.android_app_id.startsWith('ca-app-pub-')) fail('AdMob Android uygulama kimliği eksik.');
if (typeof adsPlugin.androidAppId !== 'string' || !adsPlugin.androidAppId.startsWith('ca-app-pub-')) fail('AdMob Expo plugin Android App ID eksik.');
if (buildPlugin.android?.kotlinVersion !== '2.1.20') fail('Expo SDK 57 ve Google Ads 25.0 için Kotlin 2.1.20 kullanılmalı.');
if (buildPlugin.android?.compileSdkVersion !== 36 || buildPlugin.android?.targetSdkVersion !== 36) fail('Android compile/target SDK 36 olmalı.');
if (!String(buildPlugin.android?.extraProguardRules || '').includes('com.google.android.gms.internal.consent_sdk')) fail('Google UMP consent SDK ProGuard kuralı eksik.');
if (ads.delay_app_measurement_init !== true || adsPlugin.delayAppMeasurementInit !== true) fail('Reklam ölçümü kullanıcı gizlilik kararı öncesinde geciktirilmeli.');
if (!consentSource.includes('AdsConsent.gatherConsent') || !consentSource.includes('showPrivacyOptionsForm')) fail('Google UMP onay veya gizlilik tercihleri akışı eksik.');
if (!appSource.includes('dkdRefreshAdConsent')) fail('Uygulama başlangıcında güncel reklam onayı kontrolü eksik.');
if (!privacyCenter.includes('Reklam gizlilik tercihleri')) fail('Gizlilik ve Veri Merkezi reklam tercihleri erişimini içermiyor.');
if (!courierHome.includes('Artık Vakit Kaybetmek YOK')) fail('v0.3.13 ana sayfa başlığı uygulanmamış.');
if (!createPass.includes('DKD_V0313_CREATE_PASS') || !createPass.includes('dkdRightsMotion')) fail('Yeni Kurye Geçişi animasyonlu hak kartı uygulanmamış.');
if (!profile.includes('dkdSupportMotion')) fail('Animasyonlu Destek butonu uygulanmamış.');
if (profile.includes('avatarBadge')) fail('Profil görselindeki eski yeşil tik kaldırılmamış.');

const productionAppId = process.env.ADMOB_ANDROID_APP_ID || '';
const rewardedAdUnitId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || '';
if (process.env.CI === '1') {
  if (!productionAppId.startsWith('ca-app-pub-') || productionAppId === 'ca-app-pub-3940256099942544~3347511713') console.warn('POLİTİKA UYARISI: Production AdMob App ID tanımlı değil; Google test App ID ile güvenli ve gelir üretmeyen yayın hazırlanıyor.');
  if (!rewardedAdUnitId.startsWith('ca-app-pub-') || !rewardedAdUnitId.includes('/')) console.warn('POLİTİKA UYARISI: Production ödüllü reklam birimi tanımlı değil; Google test reklam birimi kullanılacak.');
}
if (process.exitCode) process.exit(process.exitCode);
console.log(`Yapılandırma politika kontrolü geçti: ${app.version} (${app.android.versionCode})`);
NODE

mapfile -t POLICY_URLS < <(node -e "const app=require('./app.json').expo; console.log(app.extra.privacyPolicyUrl); console.log(app.extra.accountDeletionUrl); console.log(app.extra.termsUrl)")
for url in "${POLICY_URLS[@]}"; do
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 30 --retry 2 --retry-delay 2 -A 'DraBornGate-GooglePlay-Policy-Check/0.3.13' "$url")"
  if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 400 ]; then
    echo "POLİTİKA HATASI: Yayın sayfası erişilebilir değil ($HTTP_CODE): $url" >&2
    exit 1
  fi
  echo "Yayın sayfası erişilebilir ($HTTP_CODE): $url"
done

if [ -n "$APK_PATH" ]; then
  test -s "$APK_PATH"
  BUILD_TOOLS_VERSION="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -V | tail -n 1)"
  test -n "$BUILD_TOOLS_VERSION"
  AAPT="$ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION/aapt"
  test -x "$AAPT"
  BADGING="$($AAPT dump badging "$APK_PATH")"
  XMLTREE="$($AAPT dump xmltree "$APK_PATH" AndroidManifest.xml)"

  echo "$BADGING" | grep -F "package: name='$EXPECTED_PACKAGE'" >/dev/null
  echo "$BADGING" | grep -F "versionCode='$EXPECTED_VERSION_CODE'" >/dev/null
  echo "$BADGING" | grep -F "versionName='$EXPECTED_VERSION'" >/dev/null

  TARGET_SDK="$(printf '%s\n' "$BADGING" | sed -n "s/.*targetSdkVersion:'\([0-9][0-9]*\)'.*/\1/p" | head -n 1)"
  test -n "$TARGET_SDK"
  if [ "$TARGET_SDK" -lt "$MIN_TARGET_SDK" ]; then
    echo "POLİTİKA HATASI: targetSdkVersion $TARGET_SDK; yayın hedefi en az API $MIN_TARGET_SDK olmalı." >&2
    exit 1
  fi
  echo "targetSdkVersion $TARGET_SDK: Android 16 / API 36 şartına hazır."

  for permission in \
    android.permission.ACCESS_BACKGROUND_LOCATION \
    android.permission.MANAGE_EXTERNAL_STORAGE \
    android.permission.READ_MEDIA_IMAGES \
    android.permission.READ_MEDIA_VIDEO \
    android.permission.RECORD_AUDIO \
    android.permission.SYSTEM_ALERT_WINDOW; do
    if printf '%s\n' "$BADGING" | grep -F "$permission" >/dev/null; then
      echo "POLİTİKA HATASI: APK gereksiz veya hassas izin içeriyor: $permission" >&2
      exit 1
    fi
  done

  if ! printf '%s\n' "$BADGING" | grep -F "$AD_ID_PERMISSION" >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifestte $AD_ID_PERMISSION izni yok." >&2
    exit 1
  fi

  if ! printf '%s\n' "$XMLTREE" | grep -E 'A: android:allowBackup\(0x01010280\)=\(type 0x12\)0x0' >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifestte android:allowBackup=false doğrulanamadı." >&2
    exit 1
  fi

  if printf '%s\n' "$XMLTREE" | grep -F 'android.permission.SYSTEM_ALERT_WINDOW' >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifest SYSTEM_ALERT_WINDOW içeriyor." >&2
    exit 1
  fi

  if ! printf '%s\n' "$XMLTREE" | grep -F 'com.google.android.gms.ads.APPLICATION_ID' >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifestte AdMob uygulama kimliği yok." >&2
    exit 1
  fi

  if printf '%s\n' "$XMLTREE" | grep -F "$SAMPLE_ADMOB_APP_ID" >/dev/null; then
    echo "POLİTİKA UYARISI: Derlenmiş manifest Google test AdMob App ID içeriyor; reklamlar gelir üretmez ve gerçek kimlik eklenene kadar güvenli test modunda kalır."
  fi

  echo "Derlenmiş manifest: allowBackup=false, AD_ID ve production AdMob App ID mevcut; gereksiz hassas izin yok."
fi

echo "DraBornGate v0.3.13 Google Play otomatik politika kapısı başarıyla geçti."

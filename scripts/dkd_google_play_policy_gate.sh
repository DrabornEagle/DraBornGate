#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-}"
EXPECTED_PACKAGE="com.draborneagle.draborngate"
EXPECTED_VERSION="0.3.14"
EXPECTED_VERSION_CODE=4
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
const billing = fs.readFileSync('src/components/GooglePlaySubscriptionButton.tsx', 'utf8');
const courier = fs.readFileSync('src/screens/CourierCenterV032.tsx', 'utf8');
const site = fs.readFileSync('src/screens/ManagementProCenter.tsx', 'utf8');
const appSource = fs.readFileSync('App.tsx', 'utf8');
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
if (app.version !== '0.3.14' || pkg.version !== '0.3.14') fail('Uygulama sürümü 0.3.14 değil.');
if (!version.includes("APP_VERSION = '0.3.14'")) fail('Merkezi APP_VERSION 0.3.14 değil.');
if (!version.includes('ANDROID_VERSION_CODE = 4')) fail('Merkezi Android sürüm kodu 4 değil.');
if (app.android?.versionCode !== 4) fail('Android versionCode 4 değil.');
if (app.extra?.appVersion !== '0.3.14' || app.extra?.demoDataVersion !== '0.3.14' || app.extra?.androidVersionCode !== 4) fail('Expo extra sürüm alanları eşleşmiyor.');
if (app.android?.allowBackup !== false) fail('android.allowBackup false olmalı.');
if (app.androidNavigationBar?.backgroundColor !== '#00000000') fail('Android navigasyon arka planı şeffaf değil.');
for (const key of requiredUrls) {
  const value = app.extra?.[key];
  if (typeof value !== 'string' || !value.startsWith('https://')) fail(`${key} geçerli HTTPS adresi değil.`);
}
if (requested.has('ACCESS_BACKGROUND_LOCATION')) fail('Arka plan konum izni talep edilemez.');
if (!requested.has('ACCESS_COARSE_LOCATION') && !requested.has('ACCESS_FINE_LOCATION')) fail('Foreground konum izni eksik.');
if (!requested.has('com.google.android.gms.permission.AD_ID')) fail('Google Mobile Ads AD_ID izni eksik.');
for (const permission of [
  'android.permission.MANAGE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
]) if (!blocked.has(permission)) fail(`${permission} blockedPermissions listesinde değil.`);

if (pkg.dependencies?.['expo-iap'] !== '4.7.0') fail('expo-iap 4.7.0 olarak sabitlenmeli.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'expo-iap')) fail('expo-iap config plugin eksik.');
if (!billing.includes('DKD_V0314_PLAY_BILLING')) fail('v0.3.14 Google Play Billing bileşeni uygulanmamış.');
if (!billing.includes('dkdBasePlanId(item) === basePlanId')) fail('Satın alma öncesinde kesin temel plan eşleşmesi zorunlu değil.');
if (billing.includes('|| offers[0]')) fail('Yanlış temel plana düşebilen ilk teklif fallback’i kaldırılmamış.');
if (!billing.includes("supabase.functions.invoke('dkd-gate-play-verify'")) fail('Sunucu tarafı Google Play doğrulaması eksik.');
for (const source of [courier, site]) {
  if (!source.includes('GooglePlaySubscriptionButton')) fail('Abonelik ekranlarından biri ortak güvenli Google Play bileşenini kullanmıyor.');
  for (const field of ['play_product_id', 'play_weekly_base_plan_id', 'play_monthly_base_plan_id', 'play_yearly_base_plan_id']) {
    if (!source.includes(field)) fail(`Abonelik plan alanı kaynakta yok: ${field}`);
  }
}

if (pkg.dependencies?.['react-native-google-mobile-ads'] !== '16.3.3') fail('Google Mobile Ads 16.3.3 sürümü kullanılmalı.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'react-native-google-mobile-ads')) fail('Google Mobile Ads config plugin eksik.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'expo-build-properties')) fail('expo-build-properties config plugin eksik.');
if (!(app.plugins || []).some((item) => pluginName(item) === 'expo-splash-screen')) fail('expo-splash-screen config plugin eksik.');
if (!app.plugins?.includes('./scripts/dkd_with_android_security.js')) fail('Android güvenlik config plugin eksik.');
const adsPlugin = pluginOptions('react-native-google-mobile-ads');
const buildPlugin = pluginOptions('expo-build-properties');
if (typeof ads.android_app_id !== 'string' || !ads.android_app_id.startsWith('ca-app-pub-')) fail('AdMob Android uygulama kimliği eksik.');
if (typeof adsPlugin.androidAppId !== 'string' || !adsPlugin.androidAppId.startsWith('ca-app-pub-')) fail('AdMob Expo plugin Android App ID eksik.');
if (buildPlugin.android?.kotlinVersion !== '2.1.20') fail('Kotlin 2.1.20 kullanılmalı.');
if (buildPlugin.android?.compileSdkVersion !== 36 || buildPlugin.android?.targetSdkVersion !== 36) fail('Android compile/target SDK 36 olmalı.');
if (!String(buildPlugin.android?.extraProguardRules || '').includes('com.google.android.gms.internal.consent_sdk')) fail('Google UMP ProGuard kuralı eksik.');
if (ads.delay_app_measurement_init !== true || adsPlugin.delayAppMeasurementInit !== true) fail('Reklam ölçümü gizlilik kararı öncesinde geciktirilmeli.');
if (!consentSource.includes('AdsConsent.gatherConsent') || !consentSource.includes('showPrivacyOptionsForm')) fail('Google UMP akışı eksik.');
if (!appSource.includes('dkdRefreshAdConsent')) fail('Başlangıç reklam onayı kontrolü eksik.');
if (!privacyCenter.includes('Reklam gizlilik tercihleri')) fail('Gizlilik merkezinde reklam tercihleri erişimi yok.');

const productionAppId = process.env.ADMOB_ANDROID_APP_ID || '';
const rewardedAdUnitId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || '';
if (process.env.CI === '1') {
  if (!productionAppId.startsWith('ca-app-pub-') || productionAppId === 'ca-app-pub-3940256099942544~3347511713') console.warn('POLİTİKA UYARISI: Production AdMob App ID tanımlı değil; test App ID kullanılacak.');
  if (!rewardedAdUnitId.startsWith('ca-app-pub-') || !rewardedAdUnitId.includes('/')) console.warn('POLİTİKA UYARISI: Production ödüllü reklam birimi tanımlı değil.');
}
if (process.exitCode) process.exit(process.exitCode);
console.log(`Yapılandırma politika kontrolü geçti: ${app.version} (${app.android.versionCode})`);
NODE

mapfile -t POLICY_URLS < <(node -e "const app=require('./app.json').expo; console.log(app.extra.privacyPolicyUrl); console.log(app.extra.accountDeletionUrl); console.log(app.extra.termsUrl)")
for url in "${POLICY_URLS[@]}"; do
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 30 --retry 2 --retry-delay 2 -A 'DraBornGate-GooglePlay-Policy-Check/0.3.14' "$url")"
  if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 400 ]; then
    echo "POLİTİKA HATASI: Yayın sayfası erişilebilir değil ($HTTP_CODE): $url" >&2
    exit 1
  fi
  echo "Yayın sayfası erişilebilir ($HTTP_CODE): $url"
done

if [ -n "$APK_PATH" ]; then
  test -s "$APK_PATH"
  BUILD_TOOLS_VERSION="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -V | tail -n 1)"
  AAPT="$ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION/aapt"
  test -x "$AAPT"
  BADGING="$($AAPT dump badging "$APK_PATH")"
  XMLTREE="$($AAPT dump xmltree "$APK_PATH" AndroidManifest.xml)"
  echo "$BADGING" | grep -F "package: name='$EXPECTED_PACKAGE'" >/dev/null
  echo "$BADGING" | grep -F "versionCode='$EXPECTED_VERSION_CODE'" >/dev/null
  echo "$BADGING" | grep -F "versionName='$EXPECTED_VERSION'" >/dev/null
  TARGET_SDK="$(printf '%s\n' "$BADGING" | sed -n "s/.*targetSdkVersion:'\([0-9][0-9]*\)'.*/\1/p" | head -n 1)"
  test -n "$TARGET_SDK" && test "$TARGET_SDK" -ge "$MIN_TARGET_SDK"
  for permission in android.permission.ACCESS_BACKGROUND_LOCATION android.permission.MANAGE_EXTERNAL_STORAGE android.permission.READ_MEDIA_IMAGES android.permission.READ_MEDIA_VIDEO android.permission.RECORD_AUDIO android.permission.SYSTEM_ALERT_WINDOW; do
    if printf '%s\n' "$BADGING" | grep -F "$permission" >/dev/null; then echo "POLİTİKA HATASI: APK hassas izin içeriyor: $permission" >&2; exit 1; fi
  done
  printf '%s\n' "$BADGING" | grep -F "$AD_ID_PERMISSION" >/dev/null
  printf '%s\n' "$XMLTREE" | grep -E 'A: android:allowBackup\(0x01010280\)=\(type 0x12\)0x0' >/dev/null
  printf '%s\n' "$XMLTREE" | grep -F 'com.google.android.gms.ads.APPLICATION_ID' >/dev/null
  if printf '%s\n' "$XMLTREE" | grep -F "$SAMPLE_ADMOB_APP_ID" >/dev/null; then echo 'POLİTİKA UYARISI: Derlenmiş manifest Google test AdMob App ID içeriyor.'; fi
  echo "Derlenmiş APK politika kontrolü geçti: $EXPECTED_VERSION ($EXPECTED_VERSION_CODE), targetSdk $TARGET_SDK."
fi

echo "DraBornGate v0.3.14 Google Play otomatik politika kapısı başarıyla geçti."

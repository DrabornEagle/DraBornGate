#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-}"
EXPECTED_PACKAGE="com.draborneagle.draborngate"
EXPECTED_VERSION="0.3.12"
EXPECTED_VERSION_CODE=2
MIN_TARGET_SDK=36

node <<'NODE'
const fs = require('fs');
const root = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const app = root.expo;
const ads = root['react-native-google-mobile-ads'] || {};
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = fs.readFileSync('src/config/version.ts', 'utf8');
const requiredUrls = ['privacyPolicyUrl', 'accountDeletionUrl', 'termsUrl'];
const blocked = new Set(app.android?.blockedPermissions ?? []);
const requested = new Set(app.android?.permissions ?? []);

function fail(message) {
  console.error(`POLİTİKA HATASI: ${message}`);
  process.exitCode = 1;
}

if (app.android?.package !== 'com.draborneagle.draborngate') fail('Android paket adı değişmiş.');
if (app.version !== '0.3.12' || pkg.version !== '0.3.12') fail('Uygulama sürümü 0.3.12 değil.');
if (!version.includes("APP_VERSION = '0.3.12'")) fail('Merkezi APP_VERSION 0.3.12 değil.');
if (app.android?.versionCode !== 2) fail('Android versionCode 2 değil.');
if (app.android?.allowBackup !== false) fail('android.allowBackup false olmalı.');
if (app.androidNavigationBar?.backgroundColor !== '#00000000') fail('Android navigasyon arka planı şeffaf değil.');
for (const key of requiredUrls) {
  const value = app.extra?.[key];
  if (typeof value !== 'string' || !value.startsWith('https://')) fail(`${key} geçerli HTTPS adresi değil.`);
}
if (requested.has('ACCESS_BACKGROUND_LOCATION')) fail('Arka plan konum izni talep edilemez.');
if (!requested.has('ACCESS_COARSE_LOCATION') && !requested.has('ACCESS_FINE_LOCATION')) fail('Akıllı geçiş için foreground konum izni eksik.');
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
if (!pkg.dependencies?.['react-native-google-mobile-ads']) fail('Ödüllü video için Google Mobile Ads paketi eksik.');
if (!pkg.dependencies?.['expo-splash-screen']) fail('Native splash ekranı paketi eksik.');
if (!app.plugins?.some((item) => item === 'expo-iap')) fail('expo-iap config plugin eksik.');
if (!app.plugins?.some((item) => item === 'react-native-google-mobile-ads')) fail('Google Mobile Ads config plugin eksik.');
if (!app.plugins?.some((item) => Array.isArray(item) && item[0] === 'expo-splash-screen')) fail('expo-splash-screen config plugin eksik.');
if (!app.plugins?.includes('./scripts/dkd_with_android_security.js')) fail('Android güvenlik config plugin eksik.');
if (typeof ads.android_app_id !== 'string' || !ads.android_app_id.startsWith('ca-app-pub-')) fail('AdMob Android uygulama kimliği eksik.');
if (process.exitCode) process.exit(process.exitCode);
console.log(`Yapılandırma politika kontrolü geçti: ${app.version} (${app.android.versionCode})`);
NODE

mapfile -t POLICY_URLS < <(node -e "const app=require('./app.json').expo; console.log(app.extra.privacyPolicyUrl); console.log(app.extra.accountDeletionUrl); console.log(app.extra.termsUrl)")
for url in "${POLICY_URLS[@]}"; do
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 30 --retry 2 --retry-delay 2 -A 'DraBornGate-GooglePlay-Policy-Check/0.3.12' "$url")"
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

  if ! printf '%s\n' "$XMLTREE" | grep -E 'A: android:allowBackup\(0x01010280\)=\(type 0x12\)0x0' >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifestte android:allowBackup=false doğrulanamadı." >&2
    exit 1
  fi

  if printf '%s\n' "$XMLTREE" | grep -F 'android.permission.SYSTEM_ALERT_WINDOW' >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifest SYSTEM_ALERT_WINDOW içeriyor." >&2
    exit 1
  fi

  echo "Derlenmiş manifest: allowBackup=false ve SYSTEM_ALERT_WINDOW yok."
fi

echo "DraBornGate Google Play otomatik politika kapısı başarıyla geçti."

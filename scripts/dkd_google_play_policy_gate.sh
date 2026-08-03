#!/usr/bin/env bash
# DKD_V0318_POLICY_GATE
set -euo pipefail

APK_PATH="${1:-}"
EXPECTED_PACKAGE="com.draborneagle.draborngate"
EXPECTED_VERSION="0.3.18"
EXPECTED_VERSION_CODE=8
MIN_TARGET_SDK=36

node scripts/dkd_verify_v0318.js

mapfile -t POLICY_URLS < <(node -e "const app=require('./app.json').expo; console.log(app.extra.privacyPolicyUrl); console.log(app.extra.accountDeletionUrl); console.log(app.extra.termsUrl)")
for url in "${POLICY_URLS[@]}"; do
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 30 --retry 2 --retry-delay 2 -A 'DraBornGate-GooglePlay-Policy-Check/0.3.18' "$url")"
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
  for permission in android.permission.ACCESS_BACKGROUND_LOCATION android.permission.MANAGE_EXTERNAL_STORAGE android.permission.READ_EXTERNAL_STORAGE android.permission.WRITE_EXTERNAL_STORAGE android.permission.READ_MEDIA_IMAGES android.permission.READ_MEDIA_VIDEO android.permission.RECORD_AUDIO android.permission.SYSTEM_ALERT_WINDOW; do
    if printf '%s\n' "$BADGING" | grep -F "$permission" >/dev/null; then
      echo "POLİTİKA HATASI: APK hassas izin içeriyor: $permission" >&2
      exit 1
    fi
  done
  printf '%s\n' "$BADGING" | grep -F 'com.google.android.gms.permission.AD_ID' >/dev/null
  printf '%s\n' "$XMLTREE" | grep -E 'A: android:allowBackup\(0x01010280\)=\(type 0x12\)0x0' >/dev/null
  printf '%s\n' "$XMLTREE" | grep -F 'com.google.android.gms.ads.APPLICATION_ID' >/dev/null
  echo "Derlenmiş APK politika kontrolü geçti: $EXPECTED_VERSION ($EXPECTED_VERSION_CODE), targetSdk $TARGET_SDK."
fi

echo "DraBornGate v0.3.18 Google Play otomatik politika kapısı başarıyla geçti."

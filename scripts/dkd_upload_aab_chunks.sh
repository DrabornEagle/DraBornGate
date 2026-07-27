#!/usr/bin/env bash
set -euo pipefail

DKD_AAB_PATH="${1:?AAB dosya yolu gerekli}"
DKD_APP_VERSION="${2:?Uygulama sürümü gerekli}"
DKD_RELEASE_VAULT_URL="${3:?Release vault URL gerekli}"
DKD_RELEASE_OIDC_TOKEN="${4:?OIDC token gerekli}"
DKD_ANDROID_VERSION_CODE="$(node -p 'require("./app.json").expo.android.versionCode')"
DKD_PACKAGE_NAME="$(node -p 'require("./app.json").expo.android.package')"
DKD_CONFIG_VERSION="$(node -p 'require("./app.json").expo.version')"
DKD_PART_SIZE_BYTES=4000000
DKD_PARTS_DIR="aab-parts-v${DKD_APP_VERSION}"
DKD_MANIFEST="DraBornGate-v${DKD_APP_VERSION}-release.aab.manifest.json"
DKD_REPORT="dkd_supabase_aab_upload_v${DKD_APP_VERSION}.txt"
DKD_AUTH_HEADER="Authorization: Bearer ${DKD_RELEASE_OIDC_TOKEN}"

test "$DKD_CONFIG_VERSION" = "$DKD_APP_VERSION"
test "$DKD_ANDROID_VERSION_CODE" -gt 0
test -n "$DKD_PACKAGE_NAME"

rm -rf "$DKD_PARTS_DIR"
mkdir -p "$DKD_PARTS_DIR"
test -s "$DKD_AAB_PATH"
split -b "$DKD_PART_SIZE_BYTES" -d -a 3 "$DKD_AAB_PATH" "$DKD_PARTS_DIR/part-"

node - "$DKD_AAB_PATH" "$DKD_PARTS_DIR" "$DKD_MANIFEST" "$DKD_APP_VERSION" "$DKD_ANDROID_VERSION_CODE" "$DKD_PACKAGE_NAME" "$DKD_PART_SIZE_BYTES" <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const [aabPath, partsDir, manifestPath, version, androidVersionCode, packageName, partSize] = process.argv.slice(2);
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const parts = fs.readdirSync(partsDir).sort().map((name) => {
  const file = path.join(partsDir, name);
  return {
    part: name,
    objectName: `DraBornGate-v${version}-release.aab.${name}`,
    size: fs.statSync(file).size,
    sha256: digest(file),
  };
});
const manifest = {
  format: 'dkd-aab-parts-v2',
  version,
  androidVersionCode: Number(androidVersionCode),
  packageName,
  originalFile: `DraBornGate-v${version}-release.aab`,
  originalSize: fs.statSync(aabPath).size,
  originalSha256: digest(aabPath),
  partSizeBytes: Number(partSize),
  partCount: parts.length,
  storageFolder: `releases/v${version}/chunks`,
  parts,
  restore: 'Parçaları part-000 sırasıyla birleştir ve originalSha256 değerini doğrula.',
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
NODE

DKD_UPLOADED=0
for DKD_PART_PATH in "$DKD_PARTS_DIR"/part-*; do
  DKD_PART_NAME="$(basename "$DKD_PART_PATH")"
  DKD_SIGNED_JSON="signed-${DKD_PART_NAME}.json"
  curl --fail --show-error --location --retry 5 --retry-all-errors --retry-delay 2 --max-time 90 \
    -H "$DKD_AUTH_HEADER" \
    "$DKD_RELEASE_VAULT_URL/release/aab-part-upload-url?version=${DKD_APP_VERSION}&part=${DKD_PART_NAME}" \
    -o "$DKD_SIGNED_JSON"
  node scripts/dkd_upload_signed_release_file.js "$DKD_PART_PATH" "$DKD_SIGNED_JSON" application/octet-stream
  DKD_UPLOADED=$((DKD_UPLOADED + 1))
done

curl --fail --show-error --location --retry 5 --retry-all-errors --retry-delay 2 --max-time 90 \
  -H "$DKD_AUTH_HEADER" \
  "$DKD_RELEASE_VAULT_URL/release/aab-manifest-upload-url?version=${DKD_APP_VERSION}" \
  -o signed-manifest-upload.json
node scripts/dkd_upload_signed_release_file.js "$DKD_MANIFEST" signed-manifest-upload.json application/json

curl --fail --show-error --location --retry 5 --retry-all-errors --retry-delay 2 --max-time 90 \
  -H "$DKD_AUTH_HEADER" \
  "$DKD_RELEASE_VAULT_URL/release/aab-chunks?version=${DKD_APP_VERSION}" \
  -o aab-chunks-status.json

DKD_EXPECTED_OBJECTS=$((DKD_UPLOADED + 1))
test "$(jq '.objects | length' aab-chunks-status.json)" -eq "$DKD_EXPECTED_OBJECTS"
test "$(jq '[.objects[] | select(.name == "manifest.json")] | length' aab-chunks-status.json)" -eq 1
test "$(jq -r '.androidVersionCode' "$DKD_MANIFEST")" = "$DKD_ANDROID_VERSION_CODE"
test "$(jq -r '.packageName' "$DKD_MANIFEST")" = "$DKD_PACKAGE_NAME"

{
  echo "status=success"
  echo "version=$DKD_APP_VERSION"
  echo "android_version_code=$DKD_ANDROID_VERSION_CODE"
  echo "package=$DKD_PACKAGE_NAME"
  echo "part_count=$DKD_UPLOADED"
  echo "storage_object_count=$DKD_EXPECTED_OBJECTS"
  echo "storage_folder=releases/v${DKD_APP_VERSION}/chunks"
  jq -r '"original_file=" + .originalFile, "original_size=" + (.originalSize|tostring), "original_sha256=" + .originalSha256' "$DKD_MANIFEST"
  echo "supabase_backup=success"
} | tee "$DKD_REPORT"
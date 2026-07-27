const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function dkdMain() {
  const dkdReleasePath = process.argv[2];
  const dkdSignedJsonPath = process.argv[3];
  if (!dkdReleasePath || !dkdSignedJsonPath) {
    throw new Error('Kullanım: node scripts/dkd_upload_signed_release_aab.js <dosya> <signed-json>');
  }

  const dkdSigned = JSON.parse(fs.readFileSync(dkdSignedJsonPath, 'utf8'));
  const dkdObjectPath = String(dkdSigned.path || '');
  const dkdToken = String(dkdSigned.token || '');
  if (!dkdObjectPath || !dkdToken) throw new Error('Supabase imzalı yükleme yolu veya token eksik.');

  const dkdSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://guuwomvszlwhkmstewfl.supabase.co';
  const dkdPublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bf1URxrlLlvMQ8e1Z7oxkQ_jx9mvy5g';
  const dkdBucket = process.env.DKD_RELEASE_BUCKET || 'draborngate-release-private';
  const dkdSupabase = createClient(dkdSupabaseUrl, dkdPublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const dkdBytes = fs.readFileSync(dkdReleasePath);
  if (dkdBytes.byteLength < 1) throw new Error('Yüklenecek release dosyası boş.');
  const dkdContentType = process.env.DKD_RELEASE_CONTENT_TYPE
    || (dkdReleasePath.endsWith('.json') ? 'application/json' : 'application/octet-stream');

  const { data: dkdData, error: dkdError } = await dkdSupabase.storage
    .from(dkdBucket)
    .uploadToSignedUrl(dkdObjectPath, dkdToken, dkdBytes, {
      contentType: dkdContentType,
      cacheControl: '3600',
    });

  if (dkdError) throw dkdError;
  console.log(JSON.stringify({
    ok: true,
    bucket: dkdBucket,
    path: dkdData?.path || dkdObjectPath,
    size: dkdBytes.byteLength,
    file: path.basename(dkdReleasePath),
    contentType: dkdContentType,
  }));
}

dkdMain().catch((dkdError) => {
  console.error(dkdError instanceof Error ? dkdError.stack || dkdError.message : String(dkdError));
  process.exit(1);
});

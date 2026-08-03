const fs = require('fs');
const path = require('path');

function read(file) { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(`DKD v0.3.18 doğrulama hatası: ${message}`); }

const pkg = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json')).expo;
const version = read('src/config/version.ts');
const billing = read('src/components/GooglePlaySubscriptionButton.tsx');
const courierCenter = read('src/screens/CourierCenterV032.tsx');
const manager = read('src/components/SiteRoleApplicationsManager.tsx');
const edge = read('supabase/functions/dkd-gate-play-verify/index.ts');
const workflows = fs.readdirSync('.github/workflows').filter(name => /\.ya?ml$/i.test(name)).sort();

assert(pkg.version === '0.3.18', 'package.json sürümü 0.3.18 değil');
assert(app.version === '0.3.18', 'app.json sürümü 0.3.18 değil');
assert(app.android.versionCode === 8, 'Android versionCode 8 değil');
assert(app.android.package === 'com.draborneagle.draborngate', 'Android paket adı değişmiş');
assert(app.extra.appVersion === '0.3.18' && app.extra.demoDataVersion === '0.3.18' && app.extra.androidVersionCode === 8, 'Expo extra sürüm alanları eşleşmiyor');
assert(version.includes("APP_VERSION = '0.3.18'") && version.includes('ANDROID_VERSION_CODE = 8'), 'merkezi sürüm alanları eşleşmiyor');
assert(pkg.dependencies['expo-iap'] === '4.7.0', 'expo-iap 4.7.0 sabitlenmemiş');

assert(billing.includes('DKD_V0318_PLAY_BILLING_ENTITLEMENT'), 'v0.3.18 billing bileşeni yok');
assert(billing.includes("item?.productId || item?.productIdAndroid"), 'Purchase.productId işlem kimliğinden önce okunmuyor');
assert(!billing.includes("item?.id || item?.productId"), 'eski hatalı ürün kimliği sırası duruyor');
assert(billing.includes('getAvailablePurchases'), 'abonelik geri yükleme sorgusu yok');
assert(billing.includes('getActiveSubscriptions'), 'aktif abonelik sorgusu yok');
assert(billing.includes("supabase.functions.invoke('dkd-gate-play-verify'"), 'sunucu doğrulaması yok');
assert(billing.includes('finishTransaction({ purchase, isConsumable: false })'), 'Google Play satın alma onayı yok');
assert(billing.includes('obfuscatedAccountIdAndroid'), 'Google Play hesap eşleştirme kimliği yok');
assert(billing.includes('ABONELİĞİ GERİ YÜKLE'), 'manuel geri yükleme düğmesi yok');
assert(billing.includes('SATIN ALMA TAMAMLANDI'), 'satın alma sonrası modern bilgilendirme yok');
assert(billing.includes('<Modal'), 'modern abonelik popup bileşeni yok');
assert(billing.includes('isOfferPersonalized: false'), 'kişiselleştirilmiş fiyat ayarı açıkça belirtilmemiş');
assert(!billing.includes('Edge Function returned a non-2xx status code'), 'ham Edge Function hatası kullanıcıya taşınıyor');
assert(courierCenter.includes('allPlans={center.plans}'), 'geri yükleme tüm kurye paketlerinden bağımsız çalışmıyor');
assert(courierCenter.includes('DKD_V0318_COURIER_CENTER'), 'v0.3.18 kurye merkezi yok');

assert(manager.includes('dkd_gate_search_site_residents'), 'site sakini arama RPC çağrısı yok');
for (const text of ['Ad soyad', 'daire', 'blok', 'telefon']) assert(manager.toLocaleLowerCase('tr-TR').includes(text.toLocaleLowerCase('tr-TR')), `site sakini arama alanı eksik: ${text}`);

assert(edge.includes('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64'), 'base64 servis hesabı desteği yok');
assert(edge.includes('purchases/subscriptionsv2/tokens'), 'SubscriptionPurchaseV2 doğrulaması yok');
assert(edge.includes(':acknowledge'), 'sunucu tarafı abonelik acknowledgement yok');
assert(edge.includes('ENTITLEMENT_WRITE_FAILED'), 'yapılandırılmış entitlement hatası yok');
assert(edge.includes('return reply({ok:false'), 'kullanıcıya yapılandırılmış hata gövdesi dönülmüyor');

assert(workflows.length === 2, `workflow sayısı 2 değil: ${workflows.join(', ')}`);
assert(workflows[0] === 'dkd_draborngate_release_aab.yml' && workflows[1] === 'dkd_draborngate_release_apk.yml', `gereksiz workflow var: ${workflows.join(', ')}`);

for (const key of ['privacyPolicyUrl', 'accountDeletionUrl', 'termsUrl']) assert(String(app.extra[key] || '').startsWith('https://'), `${key} HTTPS değil`);
assert(app.android.allowBackup === false, 'android.allowBackup false değil');
assert(!app.android.permissions.includes('ACCESS_BACKGROUND_LOCATION'), 'arka plan konum izni isteniyor');
for (const permission of ['android.permission.MANAGE_EXTERNAL_STORAGE','android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE','android.permission.READ_MEDIA_IMAGES','android.permission.READ_MEDIA_VIDEO','android.permission.RECORD_AUDIO','android.permission.SYSTEM_ALERT_WINDOW']) assert(app.android.blockedPermissions.includes(permission), `${permission} engellenmemiş`);

console.log('DraBornGate v0.3.18 doğrulaması geçti: versionCode 8, productId düzeltmesi, aktif abonelik geri yükleme, modern popup, sakin arama ve iki workflow.');

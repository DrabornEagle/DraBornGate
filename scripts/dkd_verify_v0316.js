'use strict';

const fs = require('fs');

const dkdExpectedVersion = '0.3.16';
const dkdExpectedVersionCode = 6;
const dkdExpectedPackage = 'com.draborneagle.draborngate';
const dkdApp = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const dkdPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dkdVersionSource = fs.readFileSync('src/config/version.ts', 'utf8');
const dkdBillingSource = fs.readFileSync('src/components/GooglePlaySubscriptionButton.tsx', 'utf8');
const dkdCourierCenterSource = fs.readFileSync('src/screens/CourierCenterV032.tsx', 'utf8');
const dkdCourierHomeSource = fs.readFileSync('src/screens/CourierHome.tsx', 'utf8');
const dkdAuthSource = fs.readFileSync('src/screens/AuthScreen.tsx', 'utf8');
const dkdResidentSource = fs.readFileSync('src/screens/ResidentHome.tsx', 'utf8');

const dkdChecks = [
  [dkdPackage.version === dkdExpectedVersion, `package.json sürümü ${dkdExpectedVersion} değil`],
  [dkdApp.version === dkdExpectedVersion, `app.json sürümü ${dkdExpectedVersion} değil`],
  [dkdApp.extra?.appVersion === dkdExpectedVersion, `extra.appVersion ${dkdExpectedVersion} değil`],
  [dkdApp.extra?.demoDataVersion === dkdExpectedVersion, `demoDataVersion ${dkdExpectedVersion} değil`],
  [dkdApp.android?.versionCode === dkdExpectedVersionCode, `Android versionCode ${dkdExpectedVersionCode} değil`],
  [dkdApp.extra?.androidVersionCode === dkdExpectedVersionCode, `extra.androidVersionCode ${dkdExpectedVersionCode} değil`],
  [dkdApp.android?.package === dkdExpectedPackage, `Android paket adı ${dkdExpectedPackage} değil`],
  [dkdVersionSource.includes(`APP_VERSION = '${dkdExpectedVersion}'`), 'Merkezi APP_VERSION eşleşmiyor'],
  [dkdVersionSource.includes(`ANDROID_VERSION_CODE = ${dkdExpectedVersionCode}`), 'Merkezi ANDROID_VERSION_CODE eşleşmiyor'],
  [dkdPackage.dependencies?.['expo-iap'] === '4.7.0', 'expo-iap sürümü 4.7.0 olarak sabitlenmemiş'],
  [dkdBillingSource.includes('DKD_V0316_PLAY_BILLING'), 'v0.3.16 Google Play Billing görünümü uygulanmamış'],
  [dkdBillingSource.includes('products, subscriptions, fetchProducts'), 'expo-iap subscriptions durumu okunmuyor'],
  [dkdBillingSource.includes('Array.isArray(subscriptions) ? subscriptions : []'), 'Abonelik kataloğu subscriptions dizisini birleştirmiyor'],
  [dkdBillingSource.includes('dkdButtonMotion') && dkdBillingSource.includes('buttonShine'), 'Modern animasyonlu Google Play butonu eksik'],
  [dkdCourierCenterSource.includes('dkdPackagesScrollRef') && dkdCourierCenterSource.includes('scrollToEnd({ animated: true })'), 'Paket seçiminde abonelik alanına otomatik kaydırma eksik'],
  [!dkdCourierHomeSource.includes('paket hakkı ve') && !dkdCourierHomeSource.includes('video ödülü kullanılabilir'), 'Kaldırılması istenen paket/video hak metni hâlâ kaynakta'],
  [!dkdAuthSource.includes('DRABORNGO ORTAK HESAP SİSTEMİ'), 'Ortak hesap üst etiketi kaldırılmamış'],
  [!dkdAuthSource.includes('DraBornGate verileri ayrı şemada tutulur'), 'Kayıt ekranı alt şema açıklaması kaldırılmamış'],
  [dkdAuthSource.includes('DKD_V0316_AUTH_ROLE_CARDS') && dkdAuthSource.includes('dkdRoleMotion'), 'Modern animasyonlu hesap türü kartları eksik'],
  [dkdResidentSource.includes('SİTE SAKİNİ MERKEZİ</Text><LiveBadge label="CANLI" compact'), 'Site sakini CANLI rozeti başlığın yanında değil'],
];

const dkdFailures = dkdChecks.filter(([dkdOk]) => !dkdOk).map(([, dkdMessage]) => dkdMessage);
if (dkdFailures.length) {
  console.error(`DraBornGate v${dkdExpectedVersion} doğrulaması başarısız:\n- ${dkdFailures.join('\n- ')}`);
  process.exit(1);
}

console.log(`DraBornGate v${dkdExpectedVersion} (${dkdExpectedVersionCode}) kurulum doğrulaması geçti.`);

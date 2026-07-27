'use strict';

const fs = require('fs');

const dkdExpectedVersion = '0.3.14';
const dkdExpectedVersionCode = 4;
const dkdExpectedPackage = 'com.draborneagle.draborngate';
const dkdApp = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const dkdPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dkdVersionSource = fs.readFileSync('src/config/version.ts', 'utf8');

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
];

const dkdFailures = dkdChecks.filter(([dkdOk]) => !dkdOk).map(([, dkdMessage]) => dkdMessage);
if (dkdFailures.length) {
  console.error(`DraBornGate v${dkdExpectedVersion} doğrulaması başarısız:\n- ${dkdFailures.join('\n- ')}`);
  process.exit(1);
}

console.log(`DraBornGate v${dkdExpectedVersion} (${dkdExpectedVersionCode}) kurulum doğrulaması geçti.`);

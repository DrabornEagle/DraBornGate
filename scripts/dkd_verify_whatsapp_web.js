const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const dkdRoot = path.resolve(__dirname, '..');
const dkdWebRoot = path.join(dkdRoot, 'web', 'DraBornGate', 'WhatsApp');
const dkdAppPath = path.join(dkdWebRoot, 'app.js');
const dkdIndexPath = path.join(dkdWebRoot, 'index.html');
const dkdStylesPath = path.join(dkdWebRoot, 'styles.css');

for (const dkdFile of [dkdAppPath, dkdIndexPath, dkdStylesPath]) {
  assert.equal(fs.existsSync(dkdFile), true, `Eksik dosya: ${dkdFile}`);
}

const dkdContext = {
  console,
  TextDecoder,
  Uint8Array,
  Date,
  Math,
  crypto: { randomUUID: () => 'dkd-test-id' },
};
dkdContext.globalThis = dkdContext;
vm.createContext(dkdContext);
vm.runInContext(fs.readFileSync(dkdAppPath, 'utf8'), dkdContext);

const dkdUtils = dkdContext.DkdWhatsAppUtils;
assert.ok(dkdUtils, 'DkdWhatsAppUtils yüklenemedi.');
assert.equal(dkdUtils.normalizePhone('0532 123 45 67'), '+905321234567');
assert.equal(dkdUtils.normalizePhone('+90 532 123 45 67'), '+905321234567');
assert.equal(dkdUtils.normalizePhone('5321234567'), '+905321234567');

const dkdContacts = dkdUtils.parseVcf(`BEGIN:VCARD\nVERSION:3.0\nFN:Ahmet Yılmaz\nTEL;TYPE=CELL:05321234567\nNOTE:A Blok Daire 24\nEND:VCARD\nBEGIN:VCARD\nVERSION:3.0\nFN:Ayşe Demir\nTEL:+905551112233\nEND:VCARD`);
assert.equal(dkdContacts.length, 2);
assert.equal(dkdContacts[0].name, 'Ahmet Yılmaz');
assert.equal(dkdContacts[0].phone, '+905321234567');
assert.equal(dkdContacts[0].block, 'A Blok');
assert.equal(dkdContacts[0].flat, '24');
assert.equal(dkdUtils.buildSearchValue('İPEK ŞEN'), 'ipek sen');

const dkdIndex = fs.readFileSync(dkdIndexPath, 'utf8');
for (const dkdRequiredId of ['vcfFile', 'bulkMessage', 'collectorList', 'residentSearch', 'residentList', 'startQueueButton']) {
  assert.match(dkdIndex, new RegExp(`id=["']${dkdRequiredId}["']`), `Eksik HTML kimliği: ${dkdRequiredId}`);
}

console.log('DraBornGate WhatsApp web doğrulaması başarılı.');

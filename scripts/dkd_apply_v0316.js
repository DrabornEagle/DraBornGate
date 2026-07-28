'use strict';

const fs = require('fs');
const path = require('path');

const dkdSafePath = path.join(__dirname, 'dkd_apply_v0316_safe.js');
let dkdSafeSource = fs.readFileSync(dkdSafePath, 'utf8');
const dkdBrokenBillingReplacement = "      `${dkdBillingReturn}\\n}`,\n";
const dkdFixedBillingReplacement = "      dkdBillingReturn,\n";
if (dkdSafeSource.includes(dkdBrokenBillingReplacement)) {
  dkdSafeSource = dkdSafeSource.replace(dkdBrokenBillingReplacement, dkdFixedBillingReplacement);
  fs.writeFileSync(dkdSafePath, dkdSafeSource, 'utf8');
}

require(dkdSafePath);

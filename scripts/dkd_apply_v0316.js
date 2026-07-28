'use strict';

const fs = require('fs');
const path = require('path');

const dkdSafePath = path.join(__dirname, 'dkd_apply_v0316_safe.js');
const dkdOriginalSafeSource = fs.readFileSync(dkdSafePath, 'utf8');
const dkdBrokenBillingReplacement = "      `${dkdBillingReturn}\\n}`,\n";
const dkdFixedBillingReplacement = "      dkdBillingReturn,\n";
const dkdPatchedSafeSource = dkdOriginalSafeSource.includes(dkdBrokenBillingReplacement)
  ? dkdOriginalSafeSource.replace(dkdBrokenBillingReplacement, dkdFixedBillingReplacement)
  : dkdOriginalSafeSource;

try {
  if (dkdPatchedSafeSource !== dkdOriginalSafeSource) fs.writeFileSync(dkdSafePath, dkdPatchedSafeSource, 'utf8');
  require(dkdSafePath);
} finally {
  if (dkdPatchedSafeSource !== dkdOriginalSafeSource) fs.writeFileSync(dkdSafePath, dkdOriginalSafeSource, 'utf8');
}

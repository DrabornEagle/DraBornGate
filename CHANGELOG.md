# Changelog

## 0.2.0

- AirPass foreground GPS distance tracking, 30 metre prompt, manual send, nearest gate suggestion and location verification added.
- Resident profile with site, block, floor, apartment and optional address note added.
- Positive-only resident/courier matching added; no mismatch or unregistered-apartment warning is produced.
- VisitorPass creation, 6-digit guest code, security lookup, entry/rejection and audit records added.
- Site-wide and gate/stage rules, effective dates, critical acknowledgement and immutable version history added.
- Monthly dues periods for site/block/apartment, paid/unpaid/manual marking, payment notes and automatic debt reminders added.
- Income/expense records, finance dashboard and resident summary visibility setting added.
- Real site, gate/GPS and site membership management added.
- v0.2 demo package now includes CourierPass, AirPass, VisitorPass, resident, rules, dues and finance examples.
- App and demo versions changed to 0.2.0; Android versionCode remains 1.

## 0.1.0

- Courier registration/profile, phone, platform, plate and optional private profile photo added.
- Private order screenshot upload and OCR Edge Function added.
- OCR-derived customer/address/block/floor/apartment/order data can be manually corrected.
- Contracted-site search and gate/stage/entry-point selection added.
- Courier/site/gate rules and mandatory critical-rule acknowledgement added.
- Manual CourierPass request, security approval/rejection with required reason and retry flow added.
- Unique single-use 6-digit backup code and code-verification entry completion added.
- Gate-based security queue and daily management courier logs added.

## 0.0.2

- DraBornGo Supabase projesinde izole `draborngate` şeması kuruldu.
- `dkd_gate_*` tabloları, RLS, indeksler, triggerlar ve `dkd_gate_*` RPC'leri eklendi.
- DraBornGo ve DraBornGate ortak `auth.users` hesabına geçirildi.
- Otomatik yerel demo deposu kaldırıldı.
- Ayarlara sürüme bağlı Demo Yükle/Güncelle/Sil işlemleri eklendi.
- Gerçek zamanlı geçiş ve olay yenilemesi eklendi.
- Uygulama sürümü 0.0.2 oldu; Android versionCode 1 olarak korundu.

# DraBornGate v0.2 Veritabanı

## İzolasyon

DraBornGate, DraBornGo ile yalnızca Supabase Auth kimliğini (`auth.users`) paylaşır. Ürün verilerinin tamamı `draborngate` şemasında ve `dkd_gate_*` ad standardında tutulur.

## Ana tablolar

### Kimlik ve üyelik

- `draborngate.dkd_gate_profiles`
- `draborngate.dkd_gate_courier_profiles`
- `draborngate.dkd_gate_resident_profiles`
- `draborngate.dkd_gate_sites`
- `draborngate.dkd_gate_site_gates`
- `draborngate.dkd_gate_site_memberships`
- `draborngate.dkd_gate_user_settings`

### Geçiş sistemi

- `draborngate.dkd_gate_courier_passes`
- `draborngate.dkd_gate_pass_events`
- `draborngate.dkd_gate_ocr_jobs`
- `draborngate.dkd_gate_visitor_passes`
- `draborngate.dkd_gate_notifications`
- `draborngate.dkd_gate_push_tokens`

### Kurallar

- `draborngate.dkd_gate_site_rules`
- `draborngate.dkd_gate_rule_acceptances`

### Aidat ve finans

- `draborngate.dkd_gate_dues_periods`
- `draborngate.dkd_gate_dues_charges`
- `draborngate.dkd_gate_finance_transactions`

### Sürüm takibi

- `draborngate.dkd_gate_app_releases`
- `draborngate.dkd_gate_schema_migrations`

## Mobil erişim

Mobil uygulama tabloya sınırsız doğrudan yazmak yerine `public.dkd_gate_*` RPC fonksiyonlarını kullanır. RLS politikaları kurye, sakin, güvenlik ve yönetim erişimini site üyeliğine göre sınırlar.

Önemli RPC grupları:

- Profil/sakin: `dkd_gate_update_profile`, `dkd_gate_upsert_resident_profile`
- CourierPass: `dkd_gate_create_courier_pass_v2`, `dkd_gate_update_courier_pass_status_v2`, `dkd_gate_retry_courier_pass`
- AirPass: `dkd_gate_update_airpass`
- VisitorPass: `dkd_gate_create_visitor_pass`, `dkd_gate_decide_visitor_pass`
- Kurallar: `dkd_gate_accept_rule`, `dkd_gate_upsert_rule`
- Site kurulumu: `dkd_gate_create_site`, `dkd_gate_upsert_gate`, `dkd_gate_add_site_member`, `dkd_gate_remove_site_member`
- Aidat/finans: `dkd_gate_create_dues_period`, `dkd_gate_mark_due_paid`, `dkd_gate_add_finance_transaction`, `dkd_gate_set_finance_visibility`
- Demo: `dkd_gate_load_demo_data`, `dkd_gate_delete_demo_data`

## Supabase migration geçmişi

Canlı DraBornGo Supabase projesine aşağıdaki izole migrationlar uygulanmıştır:

1. `draborngate_v0_2_full_platform`
2. `draborngate_v0_2_access_and_realtime_fixes`
3. `draborngate_v0_2_site_setup_management`
4. `draborngate_v0_2_automatic_due_reminders`
5. `draborngate_v0_2_courierpass_hardening`

Migrationlar `draborngate.dkd_gate_schema_migrations` tablosunda ayrıca ürün sürümüyle ilişkilendirilir.

## Storage ve OCR

- Private bucket: `draborngate-private`
- Yol standardı: `<auth.uid()>/courier/...` veya `<auth.uid()>/profile/...`
- Edge Function: `dkd-gate-ocr`
- Ham görseller public değildir; kullanıcı kendi dosyasını, yetkili güvenlik/yönetim ise erişebildiği CourierPass görselini imzalı URL ile görüntüler.

## Realtime

CourierPass, olaylar, VisitorPass, bildirimler, aidat, finans, kurallar, sakin profilleri ve kapılar `supabase_realtime` yayınına eklenmiştir.

## Sürüm politikası

- App version: `0.2.0`
- Demo data version: `0.2.0`
- Android versionCode: `1`

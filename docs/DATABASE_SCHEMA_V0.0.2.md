# DraBornGate veritabanı — v0.0.2

DraBornGo üretim projesi kullanılır; DraBornGate verileri fiziksel olarak ayrı `draborngate` şemasındadır.

## Tablolar

- `dkd_gate_schema_migrations`
- `dkd_gate_profiles`
- `dkd_gate_courier_profiles`
- `dkd_gate_sites`
- `dkd_gate_site_memberships`
- `dkd_gate_courier_passes`
- `dkd_gate_pass_events`
- `dkd_gate_user_settings`
- `dkd_gate_app_releases`

## Güvenlik

- Kullanıcı tablolarında RLS etkindir.
- Geçişler kurye, demo sahibi veya yetkili site personeli kapsamıyla görünür.
- Onay/ret/tamamlama site personeli yetkisi gerektirir.
- Demo kayıtları `is_demo` ve `demo_owner_user_id` ile gerçek kayıtlardan ayrılır.
- Mobil uygulamada yalnızca Supabase publishable key bulunur; service-role anahtarı bulunmaz.

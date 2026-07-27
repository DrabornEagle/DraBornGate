insert into draborngate.dkd_gate_app_releases (
  version,
  android_version_code,
  demo_data_version,
  notes,
  released_at
) values (
  '0.3.15',
  5,
  '0.3.15',
  'Google Play abonelik sorgusu expo-iap subscriptions durumundan okunacak şekilde düzeltildi; products, subscriptions ve doğrudan fetchProducts sonuçları tek katalogda birleştirildi; Kurye ve Site Yönetimi paketleri aynı düzeltilmiş billing bileşenini kullanır; kesin temel plan eşleşmesi ve Supabase sunucu doğrulaması korunur.',
  now()
)
on conflict (version) do update set
  android_version_code = excluded.android_version_code,
  demo_data_version = excluded.demo_data_version,
  notes = excluded.notes,
  released_at = excluded.released_at;
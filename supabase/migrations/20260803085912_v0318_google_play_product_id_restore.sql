-- DraBornGate v0.3.18
-- Google Play Purchase.productId düzeltmesi, aktif abonelik geri yükleme ve modern satın alma bilgilendirmesi.

insert into draborngate.dkd_gate_app_releases(version, android_version_code, demo_data_version, notes, released_at)
values(
  '0.3.18',
  8,
  '0.3.18',
  'Google Play satın alma nesnesinde ürün kimliğinin transaction id yerine productId alanından okunması; getAvailablePurchases ve getActiveSubscriptions ile uygulama açılışında ve Play Store dönüşünde otomatik geri yükleme; zaten sahip olunan aboneliğin sunucuda doğrulanarak Kurye Plus veya Kurye Profesyonel geçiş hakkına dönüştürülmesi; satın alma, bekleyen ödeme, geri yükleme ve hata durumları için modern uygulama içi bilgilendirme penceresi.',
  now()
)
on conflict(version) do update set
  android_version_code=excluded.android_version_code,
  demo_data_version=excluded.demo_data_version,
  notes=excluded.notes,
  released_at=excluded.released_at;

insert into draborngate.dkd_gate_schema_migrations(version, description, applied_at)
values('v0.3.18', 'Google Play productId restore and purchase status modal', now())
on conflict(version) do update set description=excluded.description, applied_at=excluded.applied_at;

comment on table draborngate.dkd_gate_google_play_purchases is
  'Sunucu tarafından Google Play Developer API ile doğrulanan DraBornGate site ve kurye abonelikleri. v0.3.18 istemcisi Purchase.productId ve purchaseToken alanlarını kullanır.';

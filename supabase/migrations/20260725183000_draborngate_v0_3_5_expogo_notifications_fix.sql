begin;

insert into draborngate.dkd_gate_app_releases(
  version,
  android_version_code,
  demo_data_version,
  notes
)
values(
  '0.3.5',
  1,
  '0.3.5',
  'Expo Go Android açılışında expo-notifications uzak bildirim modülünün statik yüklenmesinden kaynaklanan hata giderildi. Development ve release APK içinde FCM bildirim sistemi korunur.'
)
on conflict(version) do update set
  android_version_code=excluded.android_version_code,
  demo_data_version=excluded.demo_data_version,
  notes=excluded.notes,
  released_at=now();

commit;

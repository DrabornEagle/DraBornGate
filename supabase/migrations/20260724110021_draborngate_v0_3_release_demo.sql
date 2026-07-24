-- DraBornGate v0.3.0 release metadata.

insert into draborngate.dkd_gate_app_releases(
  version,android_version_code,demo_data_version,notes,released_at
) values(
  '0.3.0',
  1,
  '0.3.0',
  'Profesyonel paket, otomatik deneme, kullanım limitleri, gelişmiş raporlama, CSV paylaşımı, ödeme bildirimi, Admin onayı, fatura ve gelir merkezi.',
  now()
)
on conflict(version) do update set
  android_version_code=excluded.android_version_code,
  demo_data_version=excluded.demo_data_version,
  notes=excluded.notes,
  released_at=excluded.released_at;

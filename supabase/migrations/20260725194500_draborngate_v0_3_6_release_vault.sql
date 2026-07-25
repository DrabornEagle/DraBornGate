begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'draborngate-release-private',
  'draborngate-release-private',
  false,
  268435456,
  array[
    'application/vnd.android.package-archive',
    'application/octet-stream',
    'application/json',
    'text/plain',
    'application/zip'
  ]::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.dkd_gate_get_release_admin_token()
returns text
language sql stable security definer
set search_path=vault,public,pg_catalog as $$
  select secret
  from vault.decrypted_secrets
  where name='dkd_gate_release_admin_token'
  order by updated_at desc
  limit 1
$$;

revoke all on function public.dkd_gate_get_release_admin_token() from public,anon,authenticated;
grant execute on function public.dkd_gate_get_release_admin_token() to service_role;

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes)
values(
  '0.3.6',
  1,
  '0.3.6',
  'Büyük ve açılır rapor kategorileri, günlük kayıt ayrıntı ekranı, modern Akıllı Geçiş ve Kapıya Geldim animasyonu, 5+5 ve 4+5 sayfalama, güvenliğin kodu önceden görmesi, bildirim zili, olay bazlı özel sesler ve kalıcı özel APK/keystore kasası.'
)
on conflict(version) do update set
  android_version_code=1,
  demo_data_version='0.3.6',
  notes=excluded.notes,
  released_at=now();

commit;

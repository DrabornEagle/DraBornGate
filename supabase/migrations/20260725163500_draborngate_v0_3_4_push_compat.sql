begin;

-- v0.3.2 bildirim tabloları zaten üretimde bulunuyor. v0.3.4 mevcut
-- expo_push_token/platform/device_name yapısını korur ve yalnızca eksikleri ekler.
alter table draborngate.dkd_gate_notifications
  add column if not exists push_error text;

alter table draborngate.dkd_gate_push_tokens
  add column if not exists app_version text,
  add column if not exists last_seen_at timestamptz not null default now();

-- v0.3.4 ana geçiş migrationındaki kullanılmayan alternatif imzayı kaldır.
drop function if exists public.dkd_gate_register_push_token(text,text,text,text);

create or replace function public.dkd_gate_register_push_token(
  p_token text,
  p_platform text default 'fcm',
  p_device_name text default null
) returns uuid
language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_id uuid;
  v_platform text:=lower(trim(coalesce(p_platform,'fcm')));
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if coalesce(length(trim(p_token)),0)<20 then raise exception 'Bildirim anahtarı geçersiz'; end if;
  if v_platform not in ('fcm','expo','android','ios') then raise exception 'Geçersiz bildirim platformu'; end if;

  insert into draborngate.dkd_gate_push_tokens(
    user_id,expo_push_token,platform,device_name,app_version,is_active,last_seen_at,updated_at
  ) values(
    v_uid,trim(p_token),v_platform,nullif(trim(coalesce(p_device_name,'')),''),
    nullif(substring(coalesce(p_device_name,'') from 'v([0-9]+(?:\.[0-9]+)*)'),''),true,now(),now()
  )
  on conflict(expo_push_token) do update set
    user_id=excluded.user_id,
    platform=excluded.platform,
    device_name=excluded.device_name,
    app_version=excluded.app_version,
    is_active=true,
    last_seen_at=now(),
    updated_at=now()
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.dkd_gate_register_push_token(text,text,text) to authenticated;

-- Firebase Admin JSON dosyası GitHub'a veya mobil pakete konmaz. Supabase Vault'taki
-- şifreli kayıt yalnızca service_role kullanan Edge Function tarafından okunabilir.
create or replace function public.dkd_gate_get_firebase_service_account_json()
returns text
language sql stable security definer
set search_path=vault,public,pg_catalog as $$
  select secret
  from vault.decrypted_secrets
  where name='dkd_gate_firebase_service_account_json'
  order by updated_at desc
  limit 1
$$;

revoke all on function public.dkd_gate_get_firebase_service_account_json() from public, anon, authenticated;
grant execute on function public.dkd_gate_get_firebase_service_account_json() to service_role;

commit;

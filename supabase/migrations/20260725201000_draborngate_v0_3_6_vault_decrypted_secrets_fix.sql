begin;

create or replace function public.dkd_gate_store_firebase_service_account_base64(p_secret_base64 text)
returns boolean
language plpgsql security definer
set search_path=vault,public,pg_catalog as $$
declare
  v_id uuid;
  v_json text;
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'service_role gerekli';
  end if;
  if coalesce(length(p_secret_base64),0)<1000 then
    raise exception 'Firebase servis hesabı verisi eksik';
  end if;

  v_json:=convert_from(decode(p_secret_base64,'base64'),'utf8');
  if (v_json::jsonb->>'type')<>'service_account'
     or coalesce(v_json::jsonb->>'project_id','')=''
     or coalesce(v_json::jsonb->>'client_email','')=''
     or coalesce(v_json::jsonb->>'private_key','')='' then
    raise exception 'Firebase servis hesabı JSON geçersiz';
  end if;

  select id into v_id
  from vault.secrets
  where name='dkd_gate_firebase_service_account_json'
  order by created_at desc
  limit 1;

  if v_id is null then
    perform vault.create_secret(
      p_secret_base64,
      'dkd_gate_firebase_service_account_json',
      'DraBornGate FCM servis hesabı base64 JSON',
      null
    );
  else
    perform vault.update_secret(
      v_id,
      p_secret_base64,
      'dkd_gate_firebase_service_account_json',
      'DraBornGate FCM servis hesabı base64 JSON',
      null
    );
  end if;

  return true;
end $$;

revoke all on function public.dkd_gate_store_firebase_service_account_base64(text) from public,anon,authenticated;
grant execute on function public.dkd_gate_store_firebase_service_account_base64(text) to service_role;

create or replace function public.dkd_gate_get_firebase_service_account_json()
returns text
language sql stable security definer
set search_path=vault,public,pg_catalog as $$
  select case
    when left(ltrim(decrypted_secret),1)='{' then decrypted_secret
    else convert_from(decode(decrypted_secret,'base64'),'utf8')
  end
  from vault.decrypted_secrets
  where name='dkd_gate_firebase_service_account_json'
  order by updated_at desc
  limit 1
$$;

revoke all on function public.dkd_gate_get_firebase_service_account_json() from public,anon,authenticated;
grant execute on function public.dkd_gate_get_firebase_service_account_json() to service_role;

create or replace function public.dkd_gate_get_push_dispatch_secret()
returns text
language sql stable security definer
set search_path=vault,public,pg_catalog as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='dkd_gate_push_dispatch_secret'
  order by updated_at desc
  limit 1
$$;

revoke all on function public.dkd_gate_get_push_dispatch_secret() from public,anon,authenticated;
grant execute on function public.dkd_gate_get_push_dispatch_secret() to service_role;

create or replace function public.dkd_gate_get_release_admin_token()
returns text
language sql stable security definer
set search_path=vault,public,pg_catalog as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='dkd_gate_release_admin_token'
  order by updated_at desc
  limit 1
$$;

revoke all on function public.dkd_gate_get_release_admin_token() from public,anon,authenticated;
grant execute on function public.dkd_gate_get_release_admin_token() to service_role;

create or replace function draborngate.dkd_gate_enqueue_push_dispatch()
returns trigger
language plpgsql security definer
set search_path=draborngate,vault,net,public,pg_catalog as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='dkd_gate_push_dispatch_secret'
  order by updated_at desc
  limit 1;

  if coalesce(length(v_secret),0)<32 then
    return new;
  end if;

  perform net.http_post(
    url:='https://guuwomvszlwhkmstewfl.supabase.co/functions/v1/dkd-gate-push-dispatch',
    body:=jsonb_build_object('source','database-trigger','notificationId',new.id),
    params:='{}'::jsonb,
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-dkd-dispatch-secret',v_secret
    ),
    timeout_milliseconds:=5000
  );

  return new;
exception when others then
  return new;
end $$;

revoke all on function draborngate.dkd_gate_enqueue_push_dispatch() from public,anon,authenticated;

commit;

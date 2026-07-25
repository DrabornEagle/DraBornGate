begin;

create or replace function public.dkd_gate_get_push_dispatch_secret()
returns text
language sql stable security definer
set search_path=vault,public,pg_catalog as $$
  select secret
  from vault.decrypted_secrets
  where name='dkd_gate_push_dispatch_secret'
  order by updated_at desc
  limit 1
$$;

revoke all on function public.dkd_gate_get_push_dispatch_secret() from public, anon, authenticated;
grant execute on function public.dkd_gate_get_push_dispatch_secret() to service_role;

create or replace function draborngate.dkd_gate_enqueue_push_dispatch()
returns trigger
language plpgsql security definer
set search_path=draborngate,vault,net,public,pg_catalog as $$
declare
  v_secret text;
begin
  select secret into v_secret
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
  -- Bildirim dağıtımı ana geçiş/ödeme işlemini hiçbir zaman bozmaz.
  return new;
end $$;

revoke all on function draborngate.dkd_gate_enqueue_push_dispatch() from public, anon, authenticated;

drop trigger if exists dkd_gate_notifications_push_dispatch_trg on draborngate.dkd_gate_notifications;
create trigger dkd_gate_notifications_push_dispatch_trg
after insert on draborngate.dkd_gate_notifications
for each row execute function draborngate.dkd_gate_enqueue_push_dispatch();

commit;

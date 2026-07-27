-- DraBornGate v0.3.12
-- Production Supabase project: guuwomvszlwhkmstewfl

create table if not exists draborngate.dkd_gate_courier_pass_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bonus_pass_credits integer not null default 0 check (bonus_pass_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_rewarded_ad_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'started' check (status in ('started','rewarded','expired','cancelled')),
  reward_count integer not null default 3 check (reward_count between 1 and 10),
  provider text not null default 'admob',
  ad_unit_id text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dkd_gate_rewarded_ad_sessions_user_created_idx
  on draborngate.dkd_gate_rewarded_ad_sessions(user_id, created_at desc);

create table if not exists draborngate.dkd_gate_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  plate text,
  support_type text not null,
  details text not null,
  app_version text not null default '0.3.12',
  android_version_code integer not null default 2,
  platform text not null default 'android',
  device_info jsonb not null default '{}'::jsonb,
  mail_status text not null default 'pending' check (mail_status in ('pending','sent','failed')),
  mail_error text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dkd_gate_support_requests_user_created_idx
  on draborngate.dkd_gate_support_requests(user_id, created_at desc);

alter table draborngate.dkd_gate_courier_pass_wallets enable row level security;
alter table draborngate.dkd_gate_rewarded_ad_sessions enable row level security;
alter table draborngate.dkd_gate_support_requests enable row level security;

drop policy if exists dkd_gate_wallet_select_own on draborngate.dkd_gate_courier_pass_wallets;
create policy dkd_gate_wallet_select_own on draborngate.dkd_gate_courier_pass_wallets
  for select to authenticated using (user_id=auth.uid());

drop policy if exists dkd_gate_reward_session_select_own on draborngate.dkd_gate_rewarded_ad_sessions;
create policy dkd_gate_reward_session_select_own on draborngate.dkd_gate_rewarded_ad_sessions
  for select to authenticated using (user_id=auth.uid());

drop policy if exists dkd_gate_support_select_own on draborngate.dkd_gate_support_requests;
create policy dkd_gate_support_select_own on draborngate.dkd_gate_support_requests
  for select to authenticated using (user_id=auth.uid());

create or replace function draborngate.dkd_gate_insert_user_notification(
  dkd_param_user_id uuid,
  dkd_param_kind text,
  dkd_param_title text,
  dkd_param_body text,
  dkd_param_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare dkd_notification_id uuid;
begin
  if dkd_param_user_id is null then return null; end if;
  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  values(
    dkd_param_user_id,
    left(coalesce(nullif(trim(dkd_param_kind),''),'operation_success'),80),
    left(coalesce(nullif(trim(dkd_param_title),''),'İşlem tamamlandı'),120),
    left(coalesce(nullif(trim(dkd_param_body),''),'DraBornGate işlemi başarıyla tamamlandı.'),400),
    coalesce(dkd_param_data,'{}'::jsonb)
  ) returning id into dkd_notification_id;
  return dkd_notification_id;
end;
$$;

create or replace function public.dkd_gate_notify_operation(
  dkd_param_operation text,
  dkd_param_title text,
  dkd_param_body text,
  dkd_param_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare dkd_user_id uuid:=auth.uid();
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  return draborngate.dkd_gate_insert_user_notification(
    dkd_user_id,
    'operation_'||regexp_replace(lower(coalesce(dkd_param_operation,'success')),'[^a-z0-9_]+','_','g'),
    dkd_param_title,
    dkd_param_body,
    coalesce(dkd_param_data,'{}'::jsonb)||jsonb_build_object('operation',dkd_param_operation)
  );
end;
$$;

create or replace function public.dkd_gate_get_courier_pass_usage()
returns jsonb
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_user_id uuid:=auth.uid();
  dkd_plan_code text:='courier_starter';
  dkd_plan_limit integer:=100;
  dkd_used integer:=0;
  dkd_bonus integer:=0;
  dkd_unlimited boolean:=false;
  dkd_plan_remaining integer;
  dkd_total_remaining integer;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  insert into draborngate.dkd_gate_courier_subscriptions(user_id,plan_code,status,billing_cycle,source)
  values(dkd_user_id,'courier_starter','free','monthly','system') on conflict(user_id) do nothing;

  select s.plan_code,p.monthly_pass_limit into dkd_plan_code,dkd_plan_limit
  from draborngate.dkd_gate_courier_subscriptions s
  join draborngate.dkd_gate_courier_subscription_plans p on p.code=s.plan_code and p.is_active
  where s.user_id=dkd_user_id
    and (s.status in ('active','trialing','free') or s.current_period_end is null or s.current_period_end>now())
  limit 1;

  if dkd_plan_limit is null then
    select code,monthly_pass_limit into dkd_plan_code,dkd_plan_limit
    from draborngate.dkd_gate_courier_subscription_plans where code='courier_starter' limit 1;
  end if;

  select count(*) into dkd_used from draborngate.dkd_gate_courier_passes
  where courier_user_id=dkd_user_id and not is_demo
    and created_at>=date_trunc('month',now())
    and created_at<date_trunc('month',now())+interval '1 month';

  insert into draborngate.dkd_gate_courier_pass_wallets(user_id)
  values(dkd_user_id) on conflict(user_id) do nothing;
  select bonus_pass_credits into dkd_bonus
  from draborngate.dkd_gate_courier_pass_wallets where user_id=dkd_user_id;

  dkd_unlimited:=coalesce(dkd_plan_limit,100)=0;
  dkd_plan_remaining:=case when dkd_unlimited then null else greatest(coalesce(dkd_plan_limit,100)-dkd_used,0) end;
  dkd_total_remaining:=case when dkd_unlimited then null else coalesce(dkd_plan_remaining,0)+coalesce(dkd_bonus,0) end;

  return jsonb_build_object(
    'plan_code',coalesce(dkd_plan_code,'courier_starter'),
    'used',dkd_used,
    'limit',coalesce(dkd_plan_limit,100),
    'unlimited',dkd_unlimited,
    'plan_remaining',dkd_plan_remaining,
    'bonus',coalesce(dkd_bonus,0),
    'remaining',dkd_total_remaining,
    'total_remaining',dkd_total_remaining
  );
end;
$$;

create or replace function public.dkd_gate_get_courier_package_center()
returns jsonb
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_user_id uuid:=auth.uid();
  dkd_subscription jsonb;
  dkd_plan jsonb;
  dkd_plans jsonb;
  dkd_usage jsonb;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  insert into draborngate.dkd_gate_courier_subscriptions(user_id,plan_code,status,billing_cycle,source)
  values(dkd_user_id,'courier_starter','free','monthly','system') on conflict(user_id) do nothing;
  select to_jsonb(s) into dkd_subscription from draborngate.dkd_gate_courier_subscriptions s where s.user_id=dkd_user_id;
  select to_jsonb(p) into dkd_plan from draborngate.dkd_gate_courier_subscription_plans p where p.code=(dkd_subscription->>'plan_code');
  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order),'[]'::jsonb) into dkd_plans
  from draborngate.dkd_gate_courier_subscription_plans p where p.is_active and p.is_public;
  dkd_usage:=public.dkd_gate_get_courier_pass_usage();
  return jsonb_build_object('subscription',dkd_subscription,'effective_plan',dkd_plan,'plans',dkd_plans,'usage',dkd_usage,'purchase_channel','google_play_billing');
end;
$$;

create or replace function draborngate.dkd_gate_enforce_courier_pass_limit()
returns trigger
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_site_limit integer;
  dkd_site_count integer;
  dkd_courier_limit integer;
  dkd_courier_count integer;
  dkd_remaining_bonus integer;
begin
  if new.is_demo or draborngate.dkd_gate_is_admin_user(auth.uid()) then return new; end if;

  select monthly_courier_pass_limit into dkd_site_limit from draborngate.dkd_gate_effective_plan(new.site_id);
  if coalesce(dkd_site_limit,100)<>0 then
    select count(*) into dkd_site_count from draborngate.dkd_gate_courier_passes
    where site_id=new.site_id and not is_demo
      and created_at>=date_trunc('month',now())
      and created_at<date_trunc('month',now())+interval '1 month';
    if dkd_site_count>=coalesce(dkd_site_limit,100) then
      raise exception 'Bu site aylık % kurye geçişi paket limitine ulaştı',coalesce(dkd_site_limit,100);
    end if;
  end if;

  if new.courier_user_id is null then return new; end if;
  select p.monthly_pass_limit into dkd_courier_limit
  from draborngate.dkd_gate_courier_subscriptions s
  join draborngate.dkd_gate_courier_subscription_plans p on p.code=s.plan_code and p.is_active
  where s.user_id=new.courier_user_id
    and (s.status in ('active','trialing','free') or s.current_period_end is null or s.current_period_end>now())
  limit 1;
  if dkd_courier_limit is null then
    select monthly_pass_limit into dkd_courier_limit from draborngate.dkd_gate_courier_subscription_plans where code='courier_starter';
  end if;
  if coalesce(dkd_courier_limit,100)=0 then return new; end if;

  select count(*) into dkd_courier_count from draborngate.dkd_gate_courier_passes
  where courier_user_id=new.courier_user_id and not is_demo
    and created_at>=date_trunc('month',now())
    and created_at<date_trunc('month',now())+interval '1 month';

  if dkd_courier_count>=coalesce(dkd_courier_limit,100) then
    insert into draborngate.dkd_gate_courier_pass_wallets(user_id)
    values(new.courier_user_id) on conflict(user_id) do nothing;
    update draborngate.dkd_gate_courier_pass_wallets
    set bonus_pass_credits=bonus_pass_credits-1,updated_at=now()
    where user_id=new.courier_user_id and bonus_pass_credits>0
    returning bonus_pass_credits into dkd_remaining_bonus;
    if dkd_remaining_bonus is null then raise exception 'DKD_GATE_NO_PASS_RIGHTS'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.dkd_gate_start_rewarded_ad_session(
  dkd_param_ad_unit_id text default null,
  dkd_param_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_user_id uuid:=auth.uid();
  dkd_usage jsonb;
  dkd_session_id uuid;
  dkd_daily_count integer;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  dkd_usage:=public.dkd_gate_get_courier_pass_usage();
  if coalesce((dkd_usage->>'unlimited')::boolean,false) or coalesce((dkd_usage->>'remaining')::integer,0)>0 then
    raise exception 'Geçiş hakkınız bulunduğu için reklam ödülü şu anda gerekli değil';
  end if;
  update draborngate.dkd_gate_rewarded_ad_sessions set status='expired',updated_at=now()
  where user_id=dkd_user_id and status='started' and expires_at<=now();
  select count(*) into dkd_daily_count from draborngate.dkd_gate_rewarded_ad_sessions
  where user_id=dkd_user_id and status='rewarded' and created_at>=date_trunc('day',now());
  if dkd_daily_count>=10 then raise exception 'Günlük reklam ödülü sınırına ulaşıldı'; end if;
  insert into draborngate.dkd_gate_rewarded_ad_sessions(user_id,reward_count,ad_unit_id,metadata)
  values(dkd_user_id,3,nullif(trim(dkd_param_ad_unit_id),''),coalesce(dkd_param_metadata,'{}'::jsonb))
  returning id into dkd_session_id;
  return jsonb_build_object('session_id',dkd_session_id,'reward_count',3,'expires_at',now()+interval '15 minutes');
end;
$$;

create or replace function public.dkd_gate_complete_rewarded_ad_session(
  dkd_param_session_id uuid,
  dkd_param_reward_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_user_id uuid:=auth.uid();
  dkd_session record;
  dkd_bonus integer;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  select * into dkd_session from draborngate.dkd_gate_rewarded_ad_sessions
  where id=dkd_param_session_id and user_id=dkd_user_id for update;
  if dkd_session.id is null then raise exception 'Reklam ödül oturumu bulunamadı'; end if;
  if dkd_session.status='rewarded' then return public.dkd_gate_get_courier_pass_usage(); end if;
  if dkd_session.status<>'started' or dkd_session.expires_at<=now() then raise exception 'Reklam ödül oturumunun süresi doldu'; end if;
  update draborngate.dkd_gate_rewarded_ad_sessions
  set status='rewarded',completed_at=now(),updated_at=now(),metadata=metadata||coalesce(dkd_param_reward_payload,'{}'::jsonb)
  where id=dkd_session.id;
  insert into draborngate.dkd_gate_courier_pass_wallets(user_id,bonus_pass_credits)
  values(dkd_user_id,dkd_session.reward_count)
  on conflict(user_id) do update
    set bonus_pass_credits=draborngate.dkd_gate_courier_pass_wallets.bonus_pass_credits+excluded.bonus_pass_credits,updated_at=now()
  returning bonus_pass_credits into dkd_bonus;
  perform draborngate.dkd_gate_insert_user_notification(
    dkd_user_id,'rewarded_pass_credit','3 Geçiş Hakkı Kazanıldı',
    'Kısa videoyu tamamladığın için toplam bakiyene 3 geçiş hakkı eklendi.',
    jsonb_build_object('session_id',dkd_session.id,'reward_count',dkd_session.reward_count,'bonus_balance',dkd_bonus)
  );
  return public.dkd_gate_get_courier_pass_usage();
end;
$$;

create or replace function public.dkd_gate_create_support_request(
  dkd_param_full_name text,
  dkd_param_email text,
  dkd_param_plate text,
  dkd_param_support_type text,
  dkd_param_details text,
  dkd_param_app_version text default '0.3.12',
  dkd_param_android_version_code integer default 2,
  dkd_param_device_info jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_user_id uuid:=auth.uid();
  dkd_request_id uuid;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(dkd_param_full_name,'')))<2 then raise exception 'Ad soyad gerekli'; end if;
  if trim(coalesce(dkd_param_email,'')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Geçerli e-posta adresi gerekli'; end if;
  if length(trim(coalesce(dkd_param_details,'')))<10 then raise exception 'Destek açıklaması en az 10 karakter olmalı'; end if;

  insert into draborngate.dkd_gate_support_requests(
    user_id,full_name,email,plate,support_type,details,app_version,android_version_code,device_info
  ) values(
    dkd_user_id,left(trim(dkd_param_full_name),120),left(lower(trim(dkd_param_email)),254),
    nullif(left(upper(trim(coalesce(dkd_param_plate,''))),24),''),
    left(coalesce(nullif(trim(dkd_param_support_type),''),'Uygulama hatası'),80),
    left(trim(dkd_param_details),4000),left(coalesce(nullif(trim(dkd_param_app_version),''),'0.3.12'),24),
    coalesce(dkd_param_android_version_code,2),coalesce(dkd_param_device_info,'{}'::jsonb)
  ) returning id into dkd_request_id;

  perform draborngate.dkd_gate_insert_user_notification(
    dkd_user_id,'support_request_sent','Destek talebin gönderildi',
    'Talebin DraBornGate destek ekibine ulaştı.',jsonb_build_object('support_request_id',dkd_request_id)
  );
  return dkd_request_id;
end;
$$;

grant select on draborngate.dkd_gate_courier_pass_wallets to authenticated;
grant select on draborngate.dkd_gate_rewarded_ad_sessions to authenticated;
grant select on draborngate.dkd_gate_support_requests to authenticated;
grant execute on function public.dkd_gate_notify_operation(text,text,text,jsonb) to authenticated;
grant execute on function public.dkd_gate_get_courier_pass_usage() to authenticated;
grant execute on function public.dkd_gate_get_courier_package_center() to authenticated;
grant execute on function public.dkd_gate_start_rewarded_ad_session(text,jsonb) to authenticated;
grant execute on function public.dkd_gate_complete_rewarded_ad_session(uuid,jsonb) to authenticated;
grant execute on function public.dkd_gate_create_support_request(text,text,text,text,text,text,integer,jsonb) to authenticated;

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes,released_at)
values(
  '0.3.12',2,'0.3.12',
  'Şeffaf Android navigasyon alanı, Google Play kapalı test paket tanılama, profil fotoğrafı başarı rozeti, uygulama içi destek formu, toplam kalan geçiş hakkı, isteğe bağlı ödüllü video ile 3 geçiş hakkı, kalıcı işlem bildirimleri ve yalnızca Release APK/AAB iş akışları.',
  now()
)
on conflict(version) do update set
  android_version_code=excluded.android_version_code,
  demo_data_version=excluded.demo_data_version,
  notes=excluded.notes,
  released_at=excluded.released_at;

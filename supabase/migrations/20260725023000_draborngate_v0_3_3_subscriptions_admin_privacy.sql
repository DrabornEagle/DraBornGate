begin;

alter table draborngate.dkd_gate_subscription_plans
  add column if not exists weekly_price numeric(12,2) not null default 0,
  add column if not exists play_product_id text,
  add column if not exists play_weekly_base_plan_id text,
  add column if not exists play_monthly_base_plan_id text,
  add column if not exists play_yearly_base_plan_id text;

alter table draborngate.dkd_gate_courier_subscription_plans
  add column if not exists weekly_price numeric(12,2) not null default 0,
  add column if not exists play_product_id text,
  add column if not exists play_weekly_base_plan_id text,
  add column if not exists play_monthly_base_plan_id text,
  add column if not exists play_yearly_base_plan_id text;

update draborngate.dkd_gate_subscription_plans set
  weekly_price=case code when 'professional' then 299 when 'corporate' then 649 else 0 end,
  play_product_id=case code when 'professional' then 'draborngate.site.professional' when 'corporate' then 'draborngate.site.corporate' else null end,
  play_weekly_base_plan_id=case when code in ('professional','corporate') then 'weekly-auto' else null end,
  play_monthly_base_plan_id=case when code in ('professional','corporate') then 'monthly-auto' else null end,
  play_yearly_base_plan_id=case when code in ('professional','corporate') then 'yearly-auto' else null end;

update draborngate.dkd_gate_courier_subscription_plans set
  weekly_price=case code when 'courier_plus' then 14.90 when 'courier_pro' then 29.90 else 0 end,
  play_product_id=case code when 'courier_plus' then 'draborngate.courier.plus' when 'courier_pro' then 'draborngate.courier.pro' else null end,
  play_weekly_base_plan_id=case when code in ('courier_plus','courier_pro') then 'weekly-auto' else null end,
  play_monthly_base_plan_id=case when code in ('courier_plus','courier_pro') then 'monthly-auto' else null end,
  play_yearly_base_plan_id=case when code in ('courier_plus','courier_pro') then 'yearly-auto' else null end;

alter table draborngate.dkd_gate_site_subscriptions
  add column if not exists play_product_id text,
  add column if not exists play_base_plan_id text,
  add column if not exists play_purchase_token text,
  add column if not exists play_order_id text,
  add column if not exists auto_renewing boolean not null default false,
  add column if not exists last_verified_at timestamptz;

alter table draborngate.dkd_gate_courier_subscriptions
  add column if not exists play_product_id text,
  add column if not exists play_base_plan_id text,
  add column if not exists play_purchase_token text,
  add column if not exists play_order_id text,
  add column if not exists auto_renewing boolean not null default false,
  add column if not exists last_verified_at timestamptz;

alter table draborngate.dkd_gate_site_subscriptions
  drop constraint if exists dkd_gate_site_subscriptions_billing_cycle_check;
alter table draborngate.dkd_gate_site_subscriptions
  add constraint dkd_gate_site_subscriptions_billing_cycle_check
  check (billing_cycle in ('weekly','monthly','yearly'));

alter table draborngate.dkd_gate_courier_subscriptions
  drop constraint if exists dkd_gate_courier_subscriptions_billing_cycle_check;
alter table draborngate.dkd_gate_courier_subscriptions
  add constraint dkd_gate_courier_subscriptions_billing_cycle_check
  check (billing_cycle in ('weekly','monthly','yearly'));

create unique index if not exists dkd_gate_site_subscriptions_purchase_token_idx
  on draborngate.dkd_gate_site_subscriptions(play_purchase_token)
  where play_purchase_token is not null;
create unique index if not exists dkd_gate_courier_subscriptions_purchase_token_idx
  on draborngate.dkd_gate_courier_subscriptions(play_purchase_token)
  where play_purchase_token is not null;

create table if not exists draborngate.dkd_gate_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  reason text,
  status text not null default 'pending' check (status in ('pending','processing','completed','cancelled')),
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists dkd_gate_account_deletion_pending_user_idx
  on draborngate.dkd_gate_account_deletion_requests(user_id)
  where status in ('pending','processing');
alter table draborngate.dkd_gate_account_deletion_requests enable row level security;
drop policy if exists dkd_gate_account_deletion_own_read on draborngate.dkd_gate_account_deletion_requests;
create policy dkd_gate_account_deletion_own_read
on draborngate.dkd_gate_account_deletion_requests for select to authenticated
using (user_id=(select auth.uid()));

create or replace function public.dkd_gate_request_account_deletion(p_reason text default null)
returns jsonb language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_email text;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  select email into v_email from auth.users where id=v_uid;
  select id into v_id from draborngate.dkd_gate_account_deletion_requests
    where user_id=v_uid and status in ('pending','processing') order by requested_at desc limit 1;
  if v_id is null then
    insert into draborngate.dkd_gate_account_deletion_requests(user_id,email,reason)
    values(v_uid,v_email,nullif(trim(p_reason),'')) returning id into v_id;
  else
    update draborngate.dkd_gate_account_deletion_requests
      set reason=coalesce(nullif(trim(p_reason),''),reason),updated_at=now() where id=v_id;
  end if;
  return jsonb_build_object('id',v_id,'status','pending','support_email','support@draborneagle.com');
end $$;

create or replace function public.dkd_gate_cancel_account_deletion()
returns void language plpgsql security definer
set search_path=draborngate,public,auth as $$
begin
  update draborngate.dkd_gate_account_deletion_requests
  set status='cancelled',cancelled_at=now(),updated_at=now()
  where user_id=auth.uid() and status='pending';
end $$;

create or replace function public.dkd_gate_get_account_deletion_status()
returns jsonb language sql stable security definer
set search_path=draborngate,public,auth as $$
  select coalesce((select to_jsonb(r) from draborngate.dkd_gate_account_deletion_requests r
    where r.user_id=auth.uid() order by r.requested_at desc limit 1),jsonb_build_object('status','none'));
$$;

create or replace function public.dkd_gate_admin_update_site_plan(
  p_code text,p_name text,p_description text,p_weekly_price numeric,p_monthly_price numeric,p_yearly_price numeric,
  p_gate_limit integer,p_staff_limit integer,p_resident_limit integer,p_monthly_courier_pass_limit integer,
  p_report_days_limit integer,p_allow_export boolean,p_play_product_id text,p_play_weekly_base_plan_id text,
  p_play_monthly_base_plan_id text,p_play_yearly_base_plan_id text,p_is_public boolean,p_is_active boolean
) returns jsonb language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare v_row draborngate.dkd_gate_subscription_plans%rowtype;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  update draborngate.dkd_gate_subscription_plans set
    name=trim(p_name),description=coalesce(trim(p_description),''),weekly_price=greatest(coalesce(p_weekly_price,0),0),
    monthly_price=greatest(coalesce(p_monthly_price,0),0),yearly_price=greatest(coalesce(p_yearly_price,0),0),
    gate_limit=greatest(coalesce(p_gate_limit,0),0),staff_limit=greatest(coalesce(p_staff_limit,0),0),
    resident_limit=greatest(coalesce(p_resident_limit,0),0),monthly_courier_pass_limit=greatest(coalesce(p_monthly_courier_pass_limit,0),0),
    report_days_limit=greatest(coalesce(p_report_days_limit,1),1),allow_export=coalesce(p_allow_export,false),
    play_product_id=nullif(trim(p_play_product_id),''),play_weekly_base_plan_id=nullif(trim(p_play_weekly_base_plan_id),''),
    play_monthly_base_plan_id=nullif(trim(p_play_monthly_base_plan_id),''),play_yearly_base_plan_id=nullif(trim(p_play_yearly_base_plan_id),''),
    is_public=coalesce(p_is_public,true),is_active=coalesce(p_is_active,true),updated_at=now()
  where code=p_code returning * into v_row;
  if v_row.code is null then raise exception 'Site paketi bulunamadı'; end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.dkd_gate_admin_update_courier_plan(
  p_code text,p_name text,p_description text,p_weekly_price numeric,p_monthly_price numeric,p_yearly_price numeric,
  p_monthly_pass_limit integer,p_priority_site_search boolean,p_advanced_history boolean,p_priority_support boolean,
  p_play_product_id text,p_play_weekly_base_plan_id text,p_play_monthly_base_plan_id text,p_play_yearly_base_plan_id text,
  p_is_public boolean,p_is_active boolean
) returns jsonb language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare v_row draborngate.dkd_gate_courier_subscription_plans%rowtype;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  update draborngate.dkd_gate_courier_subscription_plans set
    name=trim(p_name),description=coalesce(trim(p_description),''),weekly_price=greatest(coalesce(p_weekly_price,0),0),
    monthly_price=greatest(coalesce(p_monthly_price,0),0),yearly_price=greatest(coalesce(p_yearly_price,0),0),
    monthly_pass_limit=greatest(coalesce(p_monthly_pass_limit,0),0),priority_site_search=coalesce(p_priority_site_search,false),
    advanced_history=coalesce(p_advanced_history,false),priority_support=coalesce(p_priority_support,false),
    play_product_id=nullif(trim(p_play_product_id),''),play_weekly_base_plan_id=nullif(trim(p_play_weekly_base_plan_id),''),
    play_monthly_base_plan_id=nullif(trim(p_play_monthly_base_plan_id),''),play_yearly_base_plan_id=nullif(trim(p_play_yearly_base_plan_id),''),
    is_public=coalesce(p_is_public,true),is_active=coalesce(p_is_active,true),updated_at=now()
  where code=p_code returning * into v_row;
  if v_row.code is null then raise exception 'Kurye paketi bulunamadı'; end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.dkd_gate_admin_get_monetization_center()
returns jsonb language plpgsql stable security definer
set search_path=draborngate,public,auth as $$
declare v_summary jsonb; v_site_plans jsonb; v_courier_plans jsonb; v_site_subscriptions jsonb; v_courier_subscriptions jsonb;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  select jsonb_build_object(
    'active_site_subscriptions',(select count(*) from draborngate.dkd_gate_site_subscriptions where status='active'),
    'active_courier_subscriptions',(select count(*) from draborngate.dkd_gate_courier_subscriptions where status='active'),
    'trials',(select count(*) from draborngate.dkd_gate_site_subscriptions where status='trialing'),
    'past_due',(select count(*) from draborngate.dkd_gate_site_subscriptions where status='past_due')+(select count(*) from draborngate.dkd_gate_courier_subscriptions where status='past_due')
  ) into v_summary;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order),'[]'::jsonb) into v_site_plans from draborngate.dkd_gate_subscription_plans p;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order),'[]'::jsonb) into v_courier_plans from draborngate.dkd_gate_courier_subscription_plans p;
  select coalesce(jsonb_agg(jsonb_build_object('id',sub.id,'site_id',sub.site_id,'site_name',s.name,'owner_email',u.email,
    'plan_code',sub.plan_code,'status',sub.status,'billing_cycle',sub.billing_cycle,'current_period_end',sub.current_period_end,
    'auto_renewing',sub.auto_renewing,'source',sub.source) order by s.name),'[]'::jsonb) into v_site_subscriptions
    from draborngate.dkd_gate_site_subscriptions sub join draborngate.dkd_gate_sites s on s.id=sub.site_id join auth.users u on u.id=s.owner_user_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',sub.id,'user_id',sub.user_id,'email',u.email,'plan_code',sub.plan_code,
    'status',sub.status,'billing_cycle',sub.billing_cycle,'current_period_end',sub.current_period_end,'auto_renewing',sub.auto_renewing,
    'source',sub.source) order by u.email),'[]'::jsonb) into v_courier_subscriptions
    from draborngate.dkd_gate_courier_subscriptions sub join auth.users u on u.id=sub.user_id;
  return jsonb_build_object('summary',v_summary,'site_plans',v_site_plans,'courier_plans',v_courier_plans,
    'site_subscriptions',v_site_subscriptions,'courier_subscriptions',v_courier_subscriptions,'purchase_channel','google_play_billing');
end $$;

create or replace function public.dkd_gate_apply_verified_google_play_subscription(
  p_scope text,p_user_id uuid,p_site_id uuid,p_plan_code text,p_billing_cycle text,p_product_id text,
  p_base_plan_id text,p_purchase_token text,p_order_id text,p_expiry_time timestamptz,p_auto_renewing boolean,p_status text
) returns jsonb language plpgsql security definer
set search_path=draborngate,public,auth as $$
begin
  if auth.role()<>'service_role' then raise exception 'Servis yetkisi gerekli'; end if;
  if p_scope not in ('site','courier') or p_billing_cycle not in ('weekly','monthly','yearly') then raise exception 'Geçersiz abonelik verisi'; end if;
  if p_scope='site' then
    if p_site_id is null or not exists(select 1 from draborngate.dkd_gate_sites where id=p_site_id and owner_user_id=p_user_id) then raise exception 'Site sahipliği doğrulanamadı'; end if;
    insert into draborngate.dkd_gate_site_subscriptions(site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,source,
      play_product_id,play_base_plan_id,play_purchase_token,play_order_id,auto_renewing,last_verified_at)
    values(p_site_id,p_plan_code,p_status,p_billing_cycle,now(),p_expiry_time,'google_play',p_product_id,p_base_plan_id,p_purchase_token,p_order_id,p_auto_renewing,now())
    on conflict(site_id) do update set plan_code=excluded.plan_code,status=excluded.status,billing_cycle=excluded.billing_cycle,
      current_period_end=excluded.current_period_end,source='google_play',play_product_id=excluded.play_product_id,
      play_base_plan_id=excluded.play_base_plan_id,play_purchase_token=excluded.play_purchase_token,play_order_id=excluded.play_order_id,
      auto_renewing=excluded.auto_renewing,last_verified_at=now(),updated_at=now();
  else
    insert into draborngate.dkd_gate_courier_subscriptions(user_id,plan_code,status,billing_cycle,current_period_start,current_period_end,source,
      play_product_id,play_base_plan_id,play_purchase_token,play_order_id,auto_renewing,last_verified_at)
    values(p_user_id,p_plan_code,p_status,p_billing_cycle,now(),p_expiry_time,'google_play',p_product_id,p_base_plan_id,p_purchase_token,p_order_id,p_auto_renewing,now())
    on conflict(user_id) do update set plan_code=excluded.plan_code,status=excluded.status,billing_cycle=excluded.billing_cycle,
      current_period_end=excluded.current_period_end,source='google_play',play_product_id=excluded.play_product_id,
      play_base_plan_id=excluded.play_base_plan_id,play_purchase_token=excluded.play_purchase_token,play_order_id=excluded.play_order_id,
      auto_renewing=excluded.auto_renewing,last_verified_at=now(),updated_at=now();
  end if;
  return jsonb_build_object('scope',p_scope,'plan_code',p_plan_code,'status',p_status,'expires_at',p_expiry_time,'auto_renewing',p_auto_renewing);
end $$;

create or replace function public.dkd_gate_upsert_gate(p_site_id uuid,p_name text,p_stage text default null,p_entry_point text default null,
  p_latitude numeric default null,p_longitude numeric default null,p_airpass_enabled boolean default true,p_gate_id uuid default null)
returns uuid language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_gate_id uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if not (draborngate.dkd_gate_is_site_manager(p_site_id,v_uid) or draborngate.dkd_gate_is_admin_user(v_uid)) then
    raise exception 'Bu siteye kapı eklemek için Site Yönetimi veya Admin yetkisi gerekli';
  end if;
  if coalesce(trim(p_name),'')='' then raise exception 'Kapı adı gerekli'; end if;
  if p_gate_id is null then
    insert into draborngate.dkd_gate_site_gates(site_id,name,stage,entry_point,latitude,longitude,airpass_enabled)
    values(p_site_id,trim(p_name),nullif(trim(p_stage),''),nullif(trim(p_entry_point),''),p_latitude,p_longitude,p_airpass_enabled)
    returning id into v_gate_id;
  else
    update draborngate.dkd_gate_site_gates set name=trim(p_name),stage=nullif(trim(p_stage),''),entry_point=nullif(trim(p_entry_point),''),
      latitude=p_latitude,longitude=p_longitude,airpass_enabled=p_airpass_enabled,updated_at=now()
    where id=p_gate_id and site_id=p_site_id returning id into v_gate_id;
    if v_gate_id is null then raise exception 'Kapı bulunamadı'; end if;
  end if;
  update draborngate.dkd_gate_sites s set gate_names=(select coalesce(array_agg(g.name order by g.name),array[]::text[])
    from draborngate.dkd_gate_site_gates g where g.site_id=s.id and g.is_active),updated_at=now() where s.id=p_site_id;
  return v_gate_id;
end $$;

revoke all on function public.dkd_gate_apply_verified_google_play_subscription(text,uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.dkd_gate_apply_verified_google_play_subscription(text,uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,text) to service_role;
grant execute on function public.dkd_gate_request_account_deletion(text) to authenticated;
grant execute on function public.dkd_gate_cancel_account_deletion() to authenticated;
grant execute on function public.dkd_gate_get_account_deletion_status() to authenticated;
grant execute on function public.dkd_gate_admin_update_site_plan(text,text,text,numeric,numeric,numeric,integer,integer,integer,integer,integer,boolean,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.dkd_gate_admin_update_courier_plan(text,text,text,numeric,numeric,numeric,integer,boolean,boolean,boolean,text,text,text,text,boolean,boolean) to authenticated;

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes,released_at)
values('0.3.3',1,'0.3.3','Admin paket merkezi, haftalık Google Play aboneliği, gizlilik ve veri merkezi, kapı yetki düzeltmesi ve release iş akışları.',now())
on conflict(version) do update set android_version_code=excluded.android_version_code,demo_data_version=excluded.demo_data_version,notes=excluded.notes,released_at=now();
insert into draborngate.dkd_gate_schema_migrations(version,description,applied_at)
values('0.3.3','DraBornGate v0.3.3 Google Play abonelikleri, Admin paket düzenleme, veri silme ve kapı düzeltmesi',now())
on conflict(version) do update set description=excluded.description,applied_at=now();

commit;

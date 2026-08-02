-- DraBornGate v0.3.17
-- Supabase production migration: 20260802111705_v0317_google_play_entitlements_and_resident_search

create table if not exists draborngate.dkd_gate_google_play_purchases (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('courier','site')),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references draborngate.dkd_gate_sites(id) on delete cascade,
  plan_code text not null,
  billing_cycle text not null check (billing_cycle in ('weekly','monthly','yearly')),
  product_id text not null,
  base_plan_id text not null,
  purchase_token text not null unique,
  order_id text,
  status text not null,
  current_period_end timestamptz not null,
  auto_renewing boolean not null default false,
  raw_subscription_state text,
  first_verified_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope='courier' and site_id is null) or (scope='site' and site_id is not null))
);

alter table draborngate.dkd_gate_google_play_purchases enable row level security;
revoke all on draborngate.dkd_gate_google_play_purchases from anon, authenticated;
create index if not exists dkd_gate_play_purchases_user_scope_idx on draborngate.dkd_gate_google_play_purchases(user_id,scope,current_period_end desc);
create index if not exists dkd_gate_play_purchases_site_idx on draborngate.dkd_gate_google_play_purchases(site_id,current_period_end desc) where site_id is not null;

create or replace function public.dkd_gate_apply_verified_google_play_subscription(
  p_scope text,
  p_user_id uuid,
  p_site_id uuid,
  p_plan_code text,
  p_billing_cycle text,
  p_product_id text,
  p_base_plan_id text,
  p_purchase_token text,
  p_order_id text,
  p_expiry_time timestamptz,
  p_auto_renewing boolean,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path='draborngate','public','auth'
as $$
declare
  v_plan_code text;
  v_cycle text;
  v_existing_user uuid;
  v_winner record;
begin
  if auth.role()<>'service_role' then raise exception 'Servis yetkisi gerekli'; end if;
  if p_scope not in ('site','courier') or p_user_id is null or coalesce(p_product_id,'')='' or coalesce(p_base_plan_id,'')='' or coalesce(p_purchase_token,'')='' or p_expiry_time is null then
    raise exception 'Geçersiz abonelik verisi';
  end if;

  select user_id into v_existing_user from draborngate.dkd_gate_google_play_purchases where purchase_token=p_purchase_token;
  if v_existing_user is not null and v_existing_user<>p_user_id then
    raise exception 'Bu Google Play satın alımı başka bir hesaba bağlı';
  end if;

  if p_scope='courier' then
    select code,
      case
        when play_weekly_base_plan_id=p_base_plan_id then 'weekly'
        when play_monthly_base_plan_id=p_base_plan_id then 'monthly'
        when play_yearly_base_plan_id=p_base_plan_id then 'yearly'
      end
    into v_plan_code,v_cycle
    from draborngate.dkd_gate_courier_subscription_plans
    where is_active and play_product_id=p_product_id
      and p_base_plan_id in (play_weekly_base_plan_id,play_monthly_base_plan_id,play_yearly_base_plan_id)
    limit 1;
  else
    if p_site_id is null or not exists(
      select 1 from draborngate.dkd_gate_sites
      where id=p_site_id and (owner_user_id=p_user_id or draborngate.dkd_gate_is_admin_user(p_user_id))
    ) then raise exception 'Site sahipliği doğrulanamadı'; end if;
    select code,
      case
        when play_weekly_base_plan_id=p_base_plan_id then 'weekly'
        when play_monthly_base_plan_id=p_base_plan_id then 'monthly'
        when play_yearly_base_plan_id=p_base_plan_id then 'yearly'
      end
    into v_plan_code,v_cycle
    from draborngate.dkd_gate_subscription_plans
    where is_active and play_product_id=p_product_id
      and p_base_plan_id in (play_weekly_base_plan_id,play_monthly_base_plan_id,play_yearly_base_plan_id)
    limit 1;
  end if;

  if v_plan_code is null or v_cycle is null then raise exception 'Google Play ürünü DraBornGate paket kataloğuyla eşleşmiyor'; end if;

  insert into draborngate.dkd_gate_google_play_purchases(
    scope,user_id,site_id,plan_code,billing_cycle,product_id,base_plan_id,purchase_token,order_id,status,current_period_end,auto_renewing,last_verified_at,updated_at
  ) values (
    p_scope,p_user_id,case when p_scope='site' then p_site_id else null end,v_plan_code,v_cycle,p_product_id,p_base_plan_id,p_purchase_token,nullif(p_order_id,''),p_status,p_expiry_time,coalesce(p_auto_renewing,false),now(),now()
  )
  on conflict(purchase_token) do update set
    plan_code=excluded.plan_code,billing_cycle=excluded.billing_cycle,product_id=excluded.product_id,base_plan_id=excluded.base_plan_id,
    order_id=excluded.order_id,status=excluded.status,current_period_end=excluded.current_period_end,auto_renewing=excluded.auto_renewing,
    last_verified_at=now(),updated_at=now();

  if p_scope='courier' then
    select gp.plan_code,gp.billing_cycle,gp.product_id,gp.base_plan_id,gp.purchase_token,gp.order_id,gp.current_period_end,gp.auto_renewing,gp.status
      into v_winner
    from draborngate.dkd_gate_google_play_purchases gp
    join draborngate.dkd_gate_courier_subscription_plans cp on cp.code=gp.plan_code and cp.is_active
    where gp.scope='courier' and gp.user_id=p_user_id and gp.site_id is null
      and gp.status in ('active','cancelled') and gp.current_period_end>now()
    order by cp.monthly_price desc,gp.current_period_end desc,gp.last_verified_at desc
    limit 1;

    if v_winner.plan_code is not null then
      insert into draborngate.dkd_gate_courier_subscriptions(user_id,plan_code,status,billing_cycle,current_period_start,current_period_end,source,play_product_id,play_base_plan_id,play_purchase_token,play_order_id,auto_renewing,last_verified_at)
      values(p_user_id,v_winner.plan_code,v_winner.status,v_winner.billing_cycle,now(),v_winner.current_period_end,'google_play',v_winner.product_id,v_winner.base_plan_id,v_winner.purchase_token,v_winner.order_id,v_winner.auto_renewing,now())
      on conflict(user_id) do update set plan_code=excluded.plan_code,status=excluded.status,billing_cycle=excluded.billing_cycle,current_period_end=excluded.current_period_end,source='google_play',play_product_id=excluded.play_product_id,play_base_plan_id=excluded.play_base_plan_id,play_purchase_token=excluded.play_purchase_token,play_order_id=excluded.play_order_id,auto_renewing=excluded.auto_renewing,last_verified_at=now(),updated_at=now();
    else
      update draborngate.dkd_gate_courier_subscriptions set plan_code='courier_starter',status='free',billing_cycle='monthly',current_period_start=now(),current_period_end=null,source='system',play_product_id=null,play_base_plan_id=null,play_purchase_token=null,play_order_id=null,auto_renewing=false,last_verified_at=now(),updated_at=now()
      where user_id=p_user_id and source='google_play';
    end if;
  else
    select gp.plan_code,gp.billing_cycle,gp.product_id,gp.base_plan_id,gp.purchase_token,gp.order_id,gp.current_period_end,gp.auto_renewing,gp.status
      into v_winner
    from draborngate.dkd_gate_google_play_purchases gp
    join draborngate.dkd_gate_subscription_plans sp on sp.code=gp.plan_code and sp.is_active
    where gp.scope='site' and gp.user_id=p_user_id and gp.site_id=p_site_id
      and gp.status in ('active','cancelled') and gp.current_period_end>now()
    order by sp.monthly_price desc,gp.current_period_end desc,gp.last_verified_at desc
    limit 1;

    if v_winner.plan_code is not null then
      insert into draborngate.dkd_gate_site_subscriptions(site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,source,play_product_id,play_base_plan_id,play_purchase_token,play_order_id,auto_renewing,last_verified_at)
      values(p_site_id,v_winner.plan_code,v_winner.status,v_winner.billing_cycle,now(),v_winner.current_period_end,'google_play',v_winner.product_id,v_winner.base_plan_id,v_winner.purchase_token,v_winner.order_id,v_winner.auto_renewing,now())
      on conflict(site_id) do update set plan_code=excluded.plan_code,status=excluded.status,billing_cycle=excluded.billing_cycle,current_period_end=excluded.current_period_end,source='google_play',play_product_id=excluded.play_product_id,play_base_plan_id=excluded.play_base_plan_id,play_purchase_token=excluded.play_purchase_token,play_order_id=excluded.play_order_id,auto_renewing=excluded.auto_renewing,last_verified_at=now(),updated_at=now();
    else
      update draborngate.dkd_gate_site_subscriptions set plan_code='starter',status='free',billing_cycle='monthly',current_period_start=now(),current_period_end=null,source='system',play_product_id=null,play_base_plan_id=null,play_purchase_token=null,play_order_id=null,auto_renewing=false,last_verified_at=now(),updated_at=now()
      where site_id=p_site_id and source='google_play';
    end if;
  end if;

  return jsonb_build_object('scope',p_scope,'plan_code',coalesce(v_winner.plan_code,'starter'),'status',coalesce(v_winner.status,'free'),'expires_at',v_winner.current_period_end,'auto_renewing',coalesce(v_winner.auto_renewing,false),'verified_product_id',p_product_id,'verified_base_plan_id',p_base_plan_id);
end;
$$;

revoke all on function public.dkd_gate_apply_verified_google_play_subscription(text,uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.dkd_gate_apply_verified_google_play_subscription(text,uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,text) to service_role;

create or replace function public.dkd_gate_search_site_residents(p_site_id uuid,p_query text default '',p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path='draborngate','public','auth'
as $$
declare
  v_query text := lower(trim(coalesce(p_query,'')));
  v_digits text := regexp_replace(coalesce(p_query,''),'[^0-9]','','g');
  v_limit integer := greatest(1,least(coalesce(p_limit,50),100));
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid()) and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Site sakinlerini görüntülemek için site yönetimi yetkisi gerekli';
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'full_name',row_data->>'block',row_data->>'apartment'),'[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'membership_id',m.id,
      'user_id',m.user_id,
      'full_name',coalesce(nullif(trim(p.full_name),''),'Ad soyad belirtilmedi'),
      'phone',coalesce(p.phone,''),
      'block',coalesce(nullif(trim(r.block),''),nullif(trim(m.block),''),'-'),
      'floor',coalesce(nullif(trim(r.floor),''),nullif(trim(m.floor),''),'-'),
      'apartment',coalesce(nullif(trim(r.apartment),''),nullif(trim(m.apartment),''),'-'),
      'address_note',coalesce(nullif(trim(r.address_note),''),nullif(trim(m.address_note),''),''),
      'is_active',m.is_active
    ) row_data
    from draborngate.dkd_gate_site_memberships m
    left join draborngate.dkd_gate_profiles p on p.user_id=m.user_id
    left join draborngate.dkd_gate_resident_profiles r on r.user_id=m.user_id and r.site_id=m.site_id and r.is_active
    where m.site_id=p_site_id and m.role='resident' and m.is_active
      and (
        v_query='' or lower(coalesce(p.full_name,'')) like '%'||v_query||'%'
        or lower(coalesce(r.block,m.block,'')) like '%'||v_query||'%'
        or lower(coalesce(r.apartment,m.apartment,'')) like '%'||v_query||'%'
        or (v_digits<>'' and regexp_replace(coalesce(p.phone,''),'[^0-9]','','g') like '%'||v_digits||'%')
      )
    order by coalesce(p.full_name,''),coalesce(r.block,m.block,''),coalesce(r.apartment,m.apartment,'')
    limit v_limit
  ) q;
  return v_result;
end;
$$;

grant execute on function public.dkd_gate_search_site_residents(uuid,text,integer) to authenticated;

-- The production migration also replaces dkd_gate_get_courier_pass_usage()
-- and dkd_gate_enforce_courier_pass_limit() so an entitlement is valid only when
-- both its status and period are valid. Their canonical definitions remain in
-- the production schema and are verified by scripts/dkd_verify_v0317.js.

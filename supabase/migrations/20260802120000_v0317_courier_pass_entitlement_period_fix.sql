-- DraBornGate v0.3.17
-- Google Play paketinin geçiş hakkı vermesi için durum ve abonelik dönemi birlikte geçerli olmalıdır.

create or replace function public.dkd_gate_get_courier_pass_usage()
returns jsonb
language plpgsql
security definer
set search_path='draborngate','public','auth'
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_plan_code text := 'courier_starter';
  dkd_plan_limit integer := 3;
  dkd_used integer := 0;
  dkd_bonus integer := 0;
  dkd_unlimited boolean := false;
  dkd_plan_remaining integer;
  dkd_total_remaining integer;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  insert into draborngate.dkd_gate_courier_subscriptions(user_id,plan_code,status,billing_cycle,source)
  values(dkd_user_id,'courier_starter','free','monthly','system') on conflict(user_id) do nothing;
  update draborngate.dkd_gate_courier_subscriptions set plan_code='courier_starter',status='free',billing_cycle='monthly',current_period_start=now(),current_period_end=null,source='system',play_product_id=null,play_base_plan_id=null,play_purchase_token=null,play_order_id=null,auto_renewing=false,updated_at=now()
  where user_id=dkd_user_id and source='google_play' and current_period_end is not null and current_period_end<=now();

  select s.plan_code,p.monthly_pass_limit into dkd_plan_code,dkd_plan_limit
  from draborngate.dkd_gate_courier_subscriptions s
  join draborngate.dkd_gate_courier_subscription_plans p on p.code=s.plan_code and p.is_active
  where s.user_id=dkd_user_id and (
    (s.status='free' and s.plan_code='courier_starter') or
    (s.status in ('active','trialing','cancelled') and (s.current_period_end is null or s.current_period_end>now()))
  ) limit 1;

  if dkd_plan_limit is null then select code,monthly_pass_limit into dkd_plan_code,dkd_plan_limit from draborngate.dkd_gate_courier_subscription_plans where code='courier_starter' limit 1; end if;
  select count(*) into dkd_used from draborngate.dkd_gate_courier_passes where courier_user_id=dkd_user_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month';
  insert into draborngate.dkd_gate_courier_pass_wallets(user_id) values(dkd_user_id) on conflict(user_id) do nothing;
  select bonus_pass_credits into dkd_bonus from draborngate.dkd_gate_courier_pass_wallets where user_id=dkd_user_id;
  dkd_unlimited := coalesce(dkd_plan_limit,3)=0;
  dkd_plan_remaining := case when dkd_unlimited then null else greatest(coalesce(dkd_plan_limit,3)-dkd_used,0) end;
  dkd_total_remaining := case when dkd_unlimited then null else coalesce(dkd_plan_remaining,0)+coalesce(dkd_bonus,0) end;
  return jsonb_build_object('plan_code',coalesce(dkd_plan_code,'courier_starter'),'used',dkd_used,'limit',coalesce(dkd_plan_limit,3),'unlimited',dkd_unlimited,'plan_remaining',dkd_plan_remaining,'bonus',coalesce(dkd_bonus,0),'remaining',dkd_total_remaining,'total_remaining',dkd_total_remaining);
end;
$$;

create or replace function draborngate.dkd_gate_enforce_courier_pass_limit()
returns trigger
language plpgsql
security definer
set search_path='draborngate','public','auth'
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
    select count(*) into dkd_site_count from draborngate.dkd_gate_courier_passes where site_id=new.site_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month';
    if dkd_site_count>=coalesce(dkd_site_limit,100) then raise exception 'Bu site aylık % kurye geçişi paket limitine ulaştı',coalesce(dkd_site_limit,100); end if;
  end if;
  if new.courier_user_id is null then return new; end if;
  select p.monthly_pass_limit into dkd_courier_limit
  from draborngate.dkd_gate_courier_subscriptions s
  join draborngate.dkd_gate_courier_subscription_plans p on p.code=s.plan_code and p.is_active
  where s.user_id=new.courier_user_id and (
    (s.status='free' and s.plan_code='courier_starter') or
    (s.status in ('active','trialing','cancelled') and (s.current_period_end is null or s.current_period_end>now()))
  ) limit 1;
  if dkd_courier_limit is null then select monthly_pass_limit into dkd_courier_limit from draborngate.dkd_gate_courier_subscription_plans where code='courier_starter'; end if;
  if coalesce(dkd_courier_limit,3)=0 then return new; end if;
  select count(*) into dkd_courier_count from draborngate.dkd_gate_courier_passes where courier_user_id=new.courier_user_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month';
  if dkd_courier_count>=coalesce(dkd_courier_limit,3) then
    insert into draborngate.dkd_gate_courier_pass_wallets(user_id) values(new.courier_user_id) on conflict(user_id) do nothing;
    update draborngate.dkd_gate_courier_pass_wallets set bonus_pass_credits=bonus_pass_credits-1,updated_at=now() where user_id=new.courier_user_id and bonus_pass_credits>0 returning bonus_pass_credits into dkd_remaining_bonus;
    if dkd_remaining_bonus is null then raise exception 'DKD_GATE_NO_PASS_RIGHTS'; end if;
  end if;
  return new;
end;
$$;

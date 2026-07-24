
begin;

alter table draborngate.dkd_gate_subscription_plans
  add column if not exists tagline text not null default '';

update draborngate.dkd_gate_subscription_plans set tagline=case code
  when 'starter' then 'Temel geçiş ve site yönetimi'
  when 'professional' then 'Raporlama ve gelişmiş site operasyonu'
  when 'corporate' then 'Çoklu site ve kurumsal ölçek'
  else tagline end
where tagline='';

create or replace function public.dkd_gate_get_subscription_plans()
returns jsonb
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',p.code,'name',p.name,'tagline',p.tagline,'description',p.description,
    'monthly_price',p.monthly_price,'yearly_price',p.yearly_price,'currency',p.currency,
    'site_limit',p.site_limit,'gate_limit',p.gate_limit,'staff_limit',p.staff_limit,
    'resident_limit',p.resident_limit,'monthly_courier_pass_limit',p.monthly_courier_pass_limit,
    'monthly_visitor_pass_limit',p.monthly_visitor_pass_limit,'report_days_limit',p.report_days_limit,
    'allow_export',p.allow_export,'advanced_finance',p.advanced_finance,
    'priority_support',p.priority_support,'custom_branding',p.custom_branding,
    'trial_days',p.trial_days,'is_public',p.is_public,'is_active',p.is_active,'sort_order',p.sort_order
  ) order by p.sort_order),'[]'::jsonb)
  from draborngate.dkd_gate_subscription_plans p
  where (p.is_public and p.is_active) or draborngate.dkd_gate_is_admin_user(auth.uid());
$$;

create or replace function public.dkd_gate_get_site_subscription_dashboard(p_site_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_result jsonb;
  v_month_start timestamptz:=date_trunc('month',now());
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Yönetim yetkisi gerekli';
  end if;
  select jsonb_build_object(
    'site_id',p_site_id,
    'subscription',to_jsonb(s),
    'plan',to_jsonb(p),
    'usage',jsonb_build_object(
      'sites',(select count(*) from draborngate.dkd_gate_sites x where x.owner_user_id=(select owner_user_id from draborngate.dkd_gate_sites where id=p_site_id) and x.is_active and not x.is_demo),
      'gates',(select count(*) from draborngate.dkd_gate_site_gates g where g.site_id=p_site_id and g.is_active and not g.is_demo),
      'staff',(select count(*) from draborngate.dkd_gate_site_memberships m where m.site_id=p_site_id and m.is_active and not m.is_demo and m.role in ('owner','manager','security')),
      'residents',(select count(*) from draborngate.dkd_gate_resident_profiles r where r.site_id=p_site_id and r.is_active and not r.is_demo),
      'monthly_courier_passes',(select count(*) from draborngate.dkd_gate_courier_passes c where c.site_id=p_site_id and c.created_at>=v_month_start and not c.is_demo),
      'monthly_visitor_passes',(select count(*) from draborngate.dkd_gate_visitor_passes v where v.site_id=p_site_id and v.created_at>=v_month_start and not v.is_demo),
      'monthly_report_exports',(select count(*) from draborngate.dkd_gate_report_exports e where e.site_id=p_site_id and e.created_at>=v_month_start)
    )
  ) into v_result
  from draborngate.dkd_gate_effective_plan(p_site_id) p
  left join draborngate.dkd_gate_site_subscriptions s on s.site_id=p_site_id;
  return v_result;
end;
$$;

create or replace function public.dkd_gate_admin_subscription_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = draborngate, public, auth
as $$
declare v_result jsonb;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  select jsonb_build_object(
    'active_subscriptions',(select count(*) from draborngate.dkd_gate_site_subscriptions where status='active' and (current_period_end is null or current_period_end>=now())),
    'trials',(select count(*) from draborngate.dkd_gate_site_subscriptions where status='trialing' and trial_ends_at>=now()),
    'past_due',(select count(*) from draborngate.dkd_gate_site_subscriptions where status='past_due'),
    'sites',(select count(*) from draborngate.dkd_gate_site_subscriptions),
    'plans',(select coalesce(jsonb_agg(jsonb_build_object('code',p.code,'name',p.name,'site_count',(select count(*) from draborngate.dkd_gate_site_subscriptions s where draborngate.dkd_gate_effective_plan_code(s.site_id)=p.code)) order by p.sort_order),'[]'::jsonb) from draborngate.dkd_gate_subscription_plans p)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.dkd_gate_admin_update_subscription_plan(
  p_code text,p_name text,p_tagline text,p_description text,p_monthly_price numeric,p_yearly_price numeric,
  p_site_limit integer,p_gate_limit integer,p_staff_limit integer,p_resident_limit integer,
  p_monthly_courier_pass_limit integer,p_monthly_visitor_pass_limit integer,p_report_days_limit integer,
  p_allow_export boolean,p_advanced_finance boolean,p_priority_support boolean,p_custom_branding boolean,
  p_trial_days integer,p_is_public boolean,p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  update draborngate.dkd_gate_subscription_plans set
    name=trim(p_name),tagline=coalesce(trim(p_tagline),''),description=coalesce(trim(p_description),''),
    monthly_price=greatest(coalesce(p_monthly_price,0),0),yearly_price=greatest(coalesce(p_yearly_price,0),0),
    site_limit=greatest(coalesce(p_site_limit,0),0),gate_limit=greatest(coalesce(p_gate_limit,0),0),
    staff_limit=greatest(coalesce(p_staff_limit,0),0),resident_limit=greatest(coalesce(p_resident_limit,0),0),
    monthly_courier_pass_limit=greatest(coalesce(p_monthly_courier_pass_limit,0),0),
    monthly_visitor_pass_limit=greatest(coalesce(p_monthly_visitor_pass_limit,0),0),
    report_days_limit=greatest(coalesce(p_report_days_limit,1),1),allow_export=p_allow_export,
    advanced_finance=p_advanced_finance,priority_support=p_priority_support,custom_branding=p_custom_branding,
    trial_days=greatest(coalesce(p_trial_days,0),0),is_public=p_is_public,is_active=p_is_active,updated_at=now()
  where code=p_code;
  if not found then raise exception 'Paket bulunamadı'; end if;
end;
$$;

create or replace function public.dkd_gate_log_report_export(
  p_site_id uuid,p_date_from date,p_date_to date,p_report_type text default 'operations',p_row_count integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare v_plan draborngate.dkd_gate_subscription_plans%rowtype; v_id uuid;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Yönetim yetkisi gerekli'; end if;
  select * into v_plan from draborngate.dkd_gate_effective_plan(p_site_id);
  if not v_plan.allow_export and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'CSV dışa aktarma Profesyonel veya Kurumsal pakette kullanılabilir';
  end if;
  insert into draborngate.dkd_gate_report_exports(site_id,requested_by,report_type,date_from,date_to,format,row_count,status)
  values(p_site_id,auth.uid(),coalesce(nullif(trim(p_report_type),''),'operations'),p_date_from,p_date_to,'csv',greatest(coalesce(p_row_count,0),0),'shared')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.dkd_gate_get_subscription_plans() from public,anon;
revoke all on function public.dkd_gate_get_site_subscription_dashboard(uuid) from public,anon;
revoke all on function public.dkd_gate_admin_subscription_dashboard() from public,anon;
revoke all on function public.dkd_gate_admin_update_subscription_plan(text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean) from public,anon;
revoke all on function public.dkd_gate_log_report_export(uuid,date,date,text,integer) from public,anon;

grant execute on function public.dkd_gate_get_subscription_plans() to authenticated;
grant execute on function public.dkd_gate_get_site_subscription_dashboard(uuid) to authenticated;
grant execute on function public.dkd_gate_admin_subscription_dashboard() to authenticated;
grant execute on function public.dkd_gate_admin_update_subscription_plan(text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean) to authenticated;
grant execute on function public.dkd_gate_log_report_export(uuid,date,date,text,integer) to authenticated;

commit;

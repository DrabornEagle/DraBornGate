import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content.trimEnd() + '\n');

const corePath = 'supabase/migrations/20260724120000_draborngate_v0_3_subscription_core.sql';
let core = read(corePath);
core = core.replace(
  /create table if not exists draborngate\.dkd_gate_subscription_payment_requests[\s\S]*?(?=create table if not exists draborngate\.dkd_gate_report_exports)/,
  '',
);
core = core.replace(/^alter table draborngate\.dkd_gate_(?:subscription_payment_requests|subscription_invoices|billing_settings) enable row level security;\n/gm, '');
core = core.replace(/create index if not exists dkd_gate_subscription_payments_status_idx[\s\S]*?;\n/g, '');
core = core.replace(/create index if not exists dkd_gate_subscription_payments_site_idx[\s\S]*?;\n/g, '');
core = core.replace(/insert into draborngate\.dkd_gate_billing_settings[\s\S]*?on conflict \(singleton\) do nothing;\n/g, '');
core = core.replace(/create trigger dkd_gate_subscription_payment_requests_updated_at[\s\S]*?;\n/g, '');
core = core.replace("source text not null default 'system' check (source in ('system','trial','payment','admin','demo'))", "source text not null default 'system' check (source in ('system','trial','google_play','admin','demo'))");
write(corePath, core);

write('supabase/migrations/20260724122000_draborngate_v0_3_billing_admin.sql', `
begin;

create or replace function public.dkd_gate_admin_set_site_subscription(
  p_site_id uuid,
  p_plan_code text,
  p_status text,
  p_days integer,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_row draborngate.dkd_gate_site_subscriptions%rowtype;
  v_end timestamptz;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  if not exists(select 1 from draborngate.dkd_gate_subscription_plans where code=p_plan_code) then raise exception 'Paket bulunamadı'; end if;
  if p_status not in ('free','trialing','active','past_due','cancelled','expired') then raise exception 'Geçersiz durum'; end if;
  v_end:=case when p_days>0 then now()+(p_days||' days')::interval else null end;

  insert into draborngate.dkd_gate_site_subscriptions(
    site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
    trial_started_at,trial_ends_at,source,approved_by,notes
  ) values(
    p_site_id,p_plan_code,p_status,'monthly',now(),case when p_status='active' then v_end else null end,
    case when p_status='trialing' then now() else null end,case when p_status='trialing' then v_end else null end,
    'admin',auth.uid(),nullif(trim(p_notes),'')
  ) on conflict(site_id) do update set
    plan_code=excluded.plan_code,status=excluded.status,current_period_start=now(),
    current_period_end=excluded.current_period_end,trial_started_at=excluded.trial_started_at,
    trial_ends_at=excluded.trial_ends_at,source='admin',approved_by=auth.uid(),
    notes=excluded.notes,updated_at=now()
  returning * into v_row;

  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),p_site_id,'site_subscription_set','site_subscription',v_row.id::text,to_jsonb(v_row));
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text) from public,anon;
grant execute on function public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text) to authenticated;

commit;
`);

write('supabase/migrations/20260724122500_draborngate_v0_3_compatibility_rpcs.sql', `
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
`);

write('supabase/migrations/20260724124100_draborngate_v0_3_subscription_center_refresh.sql', `
begin;
-- Paket merkezinin güncel ve mağaza uyumlu sürümü v0.3.2 geçişinde tanımlanır.
select 1;
commit;
`);

const demoPath = 'supabase/migrations/20260724123000_draborngate_v0_3_release_demo.sql';
let demo = read(demoPath);
demo = demo.replace(
  'finans ve aidat analizi, CSV paylaşımı, Başlangıç/Profesyonel/Kurumsal paketler, kullanım limitleri, ücretsiz deneme, IBAN-dekont ödeme talebi, Admin onayı, tahsilat belgesi, abonelik ve gelir yönetimi.',
  'finans ve aidat analizi, CSV paylaşımı, Başlangıç/Profesyonel/Kurumsal paketler, kullanım limitleri, ücretsiz deneme ve Google Play uyumlu abonelik yönetimi.',
);
write(demoPath, demo);

const cleanupPath = 'supabase/migrations/20260724234500_draborngate_v0_3_2_roles_packages_cleanup.sql';
let cleanup = read(cleanupPath);
cleanup = cleanup.replace(
  /drop function if exists public\.dkd_gate_admin_decide_subscription_payment[\s\S]*?drop table if exists draborngate\.dkd_gate_billing_settings cascade;\n/,
  '',
);
write(cleanupPath, cleanup);

write('supabase/rollbacks/rollback_draborngate_v0_3_0_to_v0_2_1.sql', `
begin;

drop function if exists public.dkd_gate_get_courier_package_center();
drop table if exists draborngate.dkd_gate_courier_subscriptions cascade;
drop table if exists draborngate.dkd_gate_courier_subscription_plans cascade;
drop function if exists public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text);
drop function if exists public.dkd_gate_admin_subscription_dashboard();
drop function if exists public.dkd_gate_admin_update_subscription_plan(text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean);
drop function if exists public.dkd_gate_get_site_subscription_dashboard(uuid);
drop function if exists public.dkd_gate_get_subscription_plans();
drop function if exists public.dkd_gate_log_report_export(uuid,date,date,text,integer);
drop function if exists draborngate.dkd_gate_enforce_visitor_pass_limit();
drop function if exists draborngate.dkd_gate_enforce_courier_pass_limit();
drop function if exists draborngate.dkd_gate_enforce_member_limit();
drop function if exists draborngate.dkd_gate_enforce_gate_limit();
drop function if exists draborngate.dkd_gate_enforce_site_limit();
drop function if exists draborngate.dkd_gate_assign_site_subscription();
drop function if exists draborngate.dkd_gate_effective_plan(uuid);
drop function if exists draborngate.dkd_gate_effective_plan_code(uuid);
drop table if exists draborngate.dkd_gate_report_exports cascade;
drop table if exists draborngate.dkd_gate_trial_claims cascade;
drop table if exists draborngate.dkd_gate_site_subscriptions cascade;
drop table if exists draborngate.dkd_gate_subscription_plans cascade;

commit;
`);

write('supabase/migrations/20260724215500_draborngate_v0_3_2_google_play_source.sql', `
begin;

update draborngate.dkd_gate_site_subscriptions
set source='admin',updated_at=now()
where source='payment';

alter table draborngate.dkd_gate_site_subscriptions
  drop constraint if exists dkd_gate_site_subscriptions_source_check;

alter table draborngate.dkd_gate_site_subscriptions
  add constraint dkd_gate_site_subscriptions_source_check
  check (source in ('system','trial','google_play','admin','demo'));

insert into draborngate.dkd_gate_schema_migrations(version,description,applied_at)
values('0.3.2-google-play-source','Paket kaynağı Google Play uyumlu hale getirildi',now())
on conflict(version) do update set description=excluded.description,applied_at=excluded.applied_at;

commit;
`);

const files = [
  corePath,
  'supabase/migrations/20260724122000_draborngate_v0_3_billing_admin.sql',
  'supabase/migrations/20260724122500_draborngate_v0_3_compatibility_rpcs.sql',
  'supabase/migrations/20260724123000_draborngate_v0_3_release_demo.sql',
  'supabase/migrations/20260724124100_draborngate_v0_3_subscription_center_refresh.sql',
  cleanupPath,
  'supabase/migrations/20260724215500_draborngate_v0_3_2_google_play_source.sql',
  'supabase/rollbacks/rollback_draborngate_v0_3_0_to_v0_2_1.sql',
];
const forbidden = /(^|[^a-z0-9_])(iban|dekont)([^a-z0-9_]|$)|bank_reference|receipt_path|subscription_payment|billing_settings|subscriptionMedia|Havale\/EFT\/FAST/iu;
const dirty = files.filter((file) => forbidden.test(read(file)));
if (dirty.length) throw new Error(`Temizlenemeyen dosyalar: ${dirty.join(', ')}`);
console.log('DraBornGate doğrudan ödeme kalıntıları temizlendi.');

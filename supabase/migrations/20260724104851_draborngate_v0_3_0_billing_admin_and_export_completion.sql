-- DraBornGate v0.3.0 ödeme bildirimi, Admin onayı, paket düzenleme,
-- fatura, gelir paneli, abonelik görünümü ve rapor dışa aktarma kaydı.

alter table draborngate.dkd_gate_subscription_plans
  add column if not exists tagline text not null default '';

update draborngate.dkd_gate_subscription_plans set tagline=case code
  when 'starter' then 'Temel geçiş yönetimi'
  when 'professional' then 'Gelişmiş rapor ve yüksek limit'
  when 'corporate' then 'Çoklu site ve kurumsal ölçek'
  else tagline end
where tagline='';

create sequence if not exists draborngate.dkd_gate_invoice_number_seq start 1000;

create or replace function public.dkd_gate_get_subscription_plans()
returns jsonb
language sql
stable
security definer
set search_path=draborngate,public,auth
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
set search_path=draborngate,public,auth
as $$
declare v_result jsonb; v_month_start timestamptz:=date_trunc('month',now());
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Yönetim yetkisi gerekli'; end if;
  select jsonb_build_object(
    'site_id',p_site_id,'subscription',to_jsonb(s),'plan',to_jsonb(p),
    'pending_request',(select to_jsonb(r) from draborngate.dkd_gate_subscription_payment_requests r where r.site_id=p_site_id and r.status='pending' order by r.created_at desc limit 1),
    'latest_invoice',(select to_jsonb(i) from draborngate.dkd_gate_subscription_invoices i where i.site_id=p_site_id order by i.issued_at desc limit 1),
    'usage',jsonb_build_object(
      'sites',(select count(*) from draborngate.dkd_gate_sites x where x.owner_user_id=(select owner_user_id from draborngate.dkd_gate_sites where id=p_site_id) and x.is_active and not x.is_demo),
      'gates',(select count(*) from draborngate.dkd_gate_site_gates g where g.site_id=p_site_id and g.is_active and not g.is_demo),
      'staff',(select count(*) from draborngate.dkd_gate_site_memberships m where m.site_id=p_site_id and m.is_active and not m.is_demo and m.role in ('owner','manager','security')),
      'residents',(select count(*) from draborngate.dkd_gate_resident_profiles r where r.site_id=p_site_id and r.is_active and not r.is_demo),
      'monthly_courier_passes',(select count(*) from draborngate.dkd_gate_courier_passes c where c.site_id=p_site_id and c.created_at>=v_month_start and not c.is_demo),
      'monthly_visitor_passes',(select count(*) from draborngate.dkd_gate_visitor_passes v where v.site_id=p_site_id and v.created_at>=v_month_start and not v.is_demo),
      'monthly_report_exports',(select count(*) from draborngate.dkd_gate_report_exports e where e.site_id=p_site_id and e.created_at>=v_month_start)
    ),
    'invoices',(select coalesce(jsonb_agg(to_jsonb(i) order by i.issued_at desc),'[]'::jsonb) from draborngate.dkd_gate_subscription_invoices i where i.site_id=p_site_id)
  ) into v_result
  from draborngate.dkd_gate_effective_plan(p_site_id) p
  left join draborngate.dkd_gate_site_subscriptions s on s.site_id=p_site_id;
  return v_result;
end;
$$;

create or replace function public.dkd_gate_create_subscription_payment_request(
  p_site_id uuid,p_plan_code text,p_billing_cycle text,
  p_bank_reference text default null,p_receipt_path text default null
)
returns uuid
language plpgsql
security definer
set search_path=draborngate,public,auth
as $$
declare v_uid uuid:=auth.uid(); v_amount numeric; v_id uuid;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,v_uid) then raise exception 'Yönetim yetkisi gerekli'; end if;
  if p_plan_code='starter' then raise exception 'Başlangıç paketi ücretsizdir'; end if;
  if p_billing_cycle not in ('monthly','yearly') then raise exception 'Geçersiz ödeme dönemi'; end if;
  select case when p_billing_cycle='yearly' then yearly_price else monthly_price end into v_amount
  from draborngate.dkd_gate_subscription_plans where code=p_plan_code and is_active and is_public;
  if v_amount is null then raise exception 'Paket bulunamadı'; end if;
  if exists(select 1 from draborngate.dkd_gate_subscription_payment_requests where site_id=p_site_id and status='pending') then
    raise exception 'Bu site için incelenen bir ödeme bildirimi zaten bulunuyor';
  end if;
  insert into draborngate.dkd_gate_subscription_payment_requests(
    site_id,plan_code,requested_by,billing_cycle,amount,bank_reference,receipt_path,status
  ) values(p_site_id,p_plan_code,v_uid,p_billing_cycle,v_amount,nullif(trim(p_bank_reference),''),nullif(trim(p_receipt_path),''),'pending')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.dkd_gate_cancel_subscription_payment_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path=draborngate,public,auth
as $$
declare v_site_id uuid;
begin
  select site_id into v_site_id from draborngate.dkd_gate_subscription_payment_requests where id=p_request_id and status='pending';
  if v_site_id is null or not draborngate.dkd_gate_is_site_manager(v_site_id,auth.uid()) then raise exception 'Bekleyen ödeme bildirimi bulunamadı'; end if;
  update draborngate.dkd_gate_subscription_payment_requests set status='cancelled',updated_at=now() where id=p_request_id;
end;
$$;

create or replace function public.dkd_gate_admin_list_subscription_payment_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path=draborngate,public,auth
as $$
declare v_result jsonb;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'site_id',r.site_id,'site_name',s.name,'plan_code',r.plan_code,'plan_name',pl.name,
    'requested_by',r.requested_by,'requester_name',coalesce(nullif(p.full_name,''),split_part(u.email,'@',1)),
    'email',u.email,'billing_cycle',r.billing_cycle,'amount',r.amount,'currency',r.currency,
    'bank_reference',r.bank_reference,'receipt_path',r.receipt_path,'status',r.status,
    'admin_note',r.admin_note,'reviewed_at',r.reviewed_at,'created_at',r.created_at
  ) order by case r.status when 'pending' then 0 when 'approved' then 1 else 2 end,r.created_at desc),'[]'::jsonb)
  into v_result
  from draborngate.dkd_gate_subscription_payment_requests r
  join draborngate.dkd_gate_sites s on s.id=r.site_id
  join draborngate.dkd_gate_subscription_plans pl on pl.code=r.plan_code
  join auth.users u on u.id=r.requested_by
  left join draborngate.dkd_gate_profiles p on p.user_id=r.requested_by;
  return v_result;
end;
$$;

create or replace function public.dkd_gate_admin_decide_subscription_payment_request(
  p_request_id uuid,p_status text,p_admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=draborngate,public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_req draborngate.dkd_gate_subscription_payment_requests%rowtype;
  v_subscription_id uuid; v_period_start timestamptz:=now(); v_period_end timestamptz;
  v_existing_end timestamptz; v_existing_plan text; v_invoice_id uuid; v_invoice_number text;
begin
  if not draborngate.dkd_gate_is_admin_user(v_uid) then raise exception 'Admin yetkisi gerekli'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Geçersiz karar'; end if;
  select * into v_req from draborngate.dkd_gate_subscription_payment_requests where id=p_request_id for update;
  if v_req.id is null or v_req.status<>'pending' then raise exception 'Bekleyen ödeme bildirimi bulunamadı'; end if;
  update draborngate.dkd_gate_subscription_payment_requests
  set status=p_status,admin_note=nullif(trim(p_admin_note),''),reviewed_by=v_uid,reviewed_at=now(),updated_at=now()
  where id=p_request_id;
  if p_status='approved' then
    select plan_code,current_period_end into v_existing_plan,v_existing_end
    from draborngate.dkd_gate_site_subscriptions where site_id=v_req.site_id;
    if v_existing_plan=v_req.plan_code and v_existing_end is not null and v_existing_end>now() then v_period_start:=v_existing_end; end if;
    v_period_end:=case when v_req.billing_cycle='yearly' then v_period_start+interval '1 year' else v_period_start+interval '1 month' end;
    insert into draborngate.dkd_gate_site_subscriptions(
      site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
      trial_started_at,trial_ends_at,cancel_at_period_end,source,approved_by,notes
    ) values(v_req.site_id,v_req.plan_code,'active',v_req.billing_cycle,v_period_start,v_period_end,null,null,false,'payment',v_uid,'Ödeme bildirimi Admin tarafından onaylandı.')
    on conflict(site_id) do update set
      plan_code=excluded.plan_code,status='active',billing_cycle=excluded.billing_cycle,
      current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
      trial_started_at=null,trial_ends_at=null,cancel_at_period_end=false,source='payment',approved_by=v_uid,
      notes=excluded.notes,updated_at=now()
    returning id into v_subscription_id;
    v_invoice_number:='DBG-'||to_char(now(),'YYYYMM')||'-'||lpad(nextval('draborngate.dkd_gate_invoice_number_seq')::text,6,'0');
    insert into draborngate.dkd_gate_subscription_invoices(
      invoice_number,payment_request_id,site_id,plan_code,billing_cycle,amount,currency,status,period_start,period_end
    ) values(v_invoice_number,v_req.id,v_req.site_id,v_req.plan_code,v_req.billing_cycle,v_req.amount,v_req.currency,'paid',v_period_start,v_period_end)
    returning id into v_invoice_id;
    insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
    values(v_req.requested_by,'subscription_payment_approved','DraBornGate paketin aktif edildi',
      (select name from draborngate.dkd_gate_subscription_plans where code=v_req.plan_code)||' paketi '||to_char(v_period_end,'DD.MM.YYYY')||' tarihine kadar aktif.',
      jsonb_build_object('site_id',v_req.site_id,'plan_code',v_req.plan_code,'invoice_id',v_invoice_id,'period_end',v_period_end));
    return v_subscription_id;
  end if;
  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  values(v_req.requested_by,'subscription_payment_rejected','Ödeme bildirimin incelendi',
    coalesce(nullif(trim(p_admin_note),''),'Ödeme bildirimi onaylanmadı. Referans bilgisini kontrol ederek yeniden gönderebilirsin.'),
    jsonb_build_object('site_id',v_req.site_id,'plan_code',v_req.plan_code));
  return v_req.id;
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
set search_path=draborngate,public,auth
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

create or replace function public.dkd_gate_admin_subscription_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=draborngate,public,auth
as $$
declare v_result jsonb;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  select jsonb_build_object(
    'total_revenue',coalesce((select sum(amount) from draborngate.dkd_gate_subscription_invoices where status='paid'),0),
    'revenue_this_month',coalesce((select sum(amount) from draborngate.dkd_gate_subscription_invoices where status='paid' and issued_at>=date_trunc('month',now())),0),
    'estimated_monthly_revenue',coalesce((select sum(case when s.billing_cycle='yearly' then p.yearly_price/12 else p.monthly_price end) from draborngate.dkd_gate_site_subscriptions s join draborngate.dkd_gate_subscription_plans p on p.code=draborngate.dkd_gate_effective_plan_code(s.site_id) where s.status in ('active','trialing') and p.code<>'starter'),0),
    'paid_sites',(select count(*) from draborngate.dkd_gate_site_subscriptions s where s.status='active' and s.plan_code<>'starter' and (s.current_period_end is null or s.current_period_end>=now())),
    'trial_sites',(select count(*) from draborngate.dkd_gate_site_subscriptions s where s.status='trialing' and s.trial_ends_at>=now()),
    'starter_sites',(select count(*) from draborngate.dkd_gate_site_subscriptions s where draborngate.dkd_gate_effective_plan_code(s.site_id)='starter'),
    'pending_requests',(select count(*) from draborngate.dkd_gate_subscription_payment_requests where status='pending'),
    'plans',(select coalesce(jsonb_agg(jsonb_build_object('code',p.code,'name',p.name,'site_count',(select count(*) from draborngate.dkd_gate_site_subscriptions s where draborngate.dkd_gate_effective_plan_code(s.site_id)=p.code)) order by p.sort_order),'[]'::jsonb) from draborngate.dkd_gate_subscription_plans p)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.dkd_gate_log_report_export(
  p_site_id uuid,p_date_from date,p_date_to date,p_report_type text default 'operations',p_row_count integer default 0
)
returns uuid
language plpgsql
security definer
set search_path=draborngate,public,auth
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

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes,released_at)
values('0.3.0',1,'0.3.0','Profesyonel paket, otomatik deneme, paket limitleri, gelişmiş site raporları, CSV paylaşımı, ödeme bildirimi, Admin abonelik onayı, fatura ve platform gelir paneli.',now())
on conflict(version) do update set android_version_code=1,demo_data_version='0.3.0',notes=excluded.notes,released_at=excluded.released_at;

revoke all on function public.dkd_gate_get_subscription_plans() from public,anon;
revoke all on function public.dkd_gate_get_site_subscription_dashboard(uuid) from public,anon;
revoke all on function public.dkd_gate_create_subscription_payment_request(uuid,text,text,text,text) from public,anon;
revoke all on function public.dkd_gate_cancel_subscription_payment_request(uuid) from public,anon;
revoke all on function public.dkd_gate_admin_list_subscription_payment_requests() from public,anon;
revoke all on function public.dkd_gate_admin_decide_subscription_payment_request(uuid,text,text) from public,anon;
revoke all on function public.dkd_gate_admin_update_subscription_plan(text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean) from public,anon;
revoke all on function public.dkd_gate_admin_subscription_dashboard() from public,anon;
revoke all on function public.dkd_gate_log_report_export(uuid,date,date,text,integer) from public,anon;

grant execute on function public.dkd_gate_get_subscription_plans() to authenticated;
grant execute on function public.dkd_gate_get_site_subscription_dashboard(uuid) to authenticated;
grant execute on function public.dkd_gate_create_subscription_payment_request(uuid,text,text,text,text) to authenticated;
grant execute on function public.dkd_gate_cancel_subscription_payment_request(uuid) to authenticated;
grant execute on function public.dkd_gate_admin_list_subscription_payment_requests() to authenticated;
grant execute on function public.dkd_gate_admin_decide_subscription_payment_request(uuid,text,text) to authenticated;
grant execute on function public.dkd_gate_admin_update_subscription_plan(text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean) to authenticated;
grant execute on function public.dkd_gate_admin_subscription_dashboard() to authenticated;
grant execute on function public.dkd_gate_log_report_export(uuid,date,date,text,integer) to authenticated;
grant execute on function public.dkd_gate_get_site_report(uuid,date,date) to authenticated;

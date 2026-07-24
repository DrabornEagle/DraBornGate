create or replace function draborngate.dkd_gate_csv_escape(p_value text)
returns text
language sql
immutable
as $$
  select '"' || replace(coalesce(p_value,''),'"','""') || '"';
$$;

create or replace function public.dkd_gate_get_site_report(
  p_site_id uuid,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_plan draborngate.dkd_gate_subscription_plans%rowtype;
  v_subscription draborngate.dkd_gate_site_subscriptions%rowtype;
  v_to date := least(coalesce(p_date_to,current_date),current_date);
  v_requested_from date := coalesce(p_date_from,least(coalesce(p_date_to,current_date),current_date)-29);
  v_from date;
  v_summary jsonb;
  v_daily jsonb;
  v_hourly jsonb;
  v_gates jsonb;
  v_platforms jsonb;
  v_couriers jsonb;
  v_security jsonb;
  v_finance_categories jsonb;
  v_usage jsonb;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Raporları görüntülemek için site yönetimi yetkisi gerekli';
  end if;

  select * into v_plan from draborngate.dkd_gate_effective_plan(p_site_id);
  v_from := greatest(v_requested_from,v_to-(coalesce(v_plan.report_days_limit,30)-1));
  if v_from>v_to then raise exception 'Başlangıç tarihi bitiş tarihinden sonra olamaz'; end if;

  select * into v_subscription
  from draborngate.dkd_gate_site_subscriptions
  where site_id=p_site_id;

  select jsonb_build_object(
    'courier_total',count(*),
    'waiting',count(*) filter(where status='waiting'),
    'approved',count(*) filter(where status='approved'),
    'rejected',count(*) filter(where status='rejected'),
    'arrived',count(*) filter(where status='arrived'),
    'completed',count(*) filter(where status='completed'),
    'cancelled',count(*) filter(where status='cancelled'),
    'expired',count(*) filter(where status='expired'),
    'approval_rate',round(coalesce(100.0*count(*) filter(where status in ('approved','arrived','completed'))/nullif(count(*),0),0),1),
    'rejection_rate',round(coalesce(100.0*count(*) filter(where status='rejected')/nullif(count(*),0),0),1),
    'completion_rate',round(coalesce(100.0*count(*) filter(where status='completed')/nullif(count(*),0),0),1),
    'airpass_rate',round(coalesce(100.0*count(*) filter(where airpass_sent_at is not null or location_verified)/nullif(count(*),0),0),1),
    'average_eta_minutes',round(coalesce(avg(eta_minutes),0),1),
    'average_completion_minutes',round(coalesce(avg(extract(epoch from (completed_at-created_at))/60) filter(where completed_at is not null),0),1)
  ) into v_summary
  from draborngate.dkd_gate_courier_passes
  where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz;

  v_summary := v_summary || (
    select jsonb_build_object('average_approval_minutes',round(coalesce(avg(extract(epoch from (e.created_at-p.created_at))/60),0),1))
    from draborngate.dkd_gate_pass_events e
    join draborngate.dkd_gate_courier_passes p on p.id=e.pass_id
    where p.site_id=p_site_id and e.event_type='approved'
      and p.created_at>=v_from::timestamptz and p.created_at<(v_to+1)::timestamptz
  );

  v_summary := v_summary || (
    select jsonb_build_object(
      'visitor_total',count(*),
      'visitor_waiting',count(*) filter(where status='waiting'),
      'visitor_approved',count(*) filter(where status='approved'),
      'visitor_rejected',count(*) filter(where status='rejected'),
      'visitor_completed',count(*) filter(where status='completed'))
    from draborngate.dkd_gate_visitor_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
  );

  v_summary := v_summary || (
    select jsonb_build_object(
      'income',coalesce(sum(amount) filter(where transaction_type='income'),0),
      'expense',coalesce(sum(amount) filter(where transaction_type='expense'),0),
      'balance',coalesce(sum(case when transaction_type='income' then amount else -amount end),0))
    from draborngate.dkd_gate_finance_transactions
    where site_id=p_site_id and transaction_date between v_from and v_to
  );

  v_summary := v_summary || (
    select jsonb_build_object(
      'dues_total',coalesce(sum(amount),0),
      'dues_paid',coalesce(sum(amount) filter(where status='paid'),0),
      'dues_unpaid',coalesce(sum(amount) filter(where status='unpaid'),0),
      'dues_collection_rate',round(coalesce(100.0*sum(amount) filter(where status='paid')/nullif(sum(amount),0),0),1))
    from draborngate.dkd_gate_dues_charges
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'date',gs.report_date::date,
    'courier',coalesce(cp.total,0),
    'completed',coalesce(cp.completed,0),
    'rejected',coalesce(cp.rejected,0),
    'visitor',coalesce(vp.total,0)
  ) order by gs.report_date),'[]'::jsonb)
  into v_daily
  from generate_series(v_from::timestamp,v_to::timestamp,interval '1 day') gs(report_date)
  left join (
    select created_at::date report_date,count(*) total,
      count(*) filter(where status='completed') completed,
      count(*) filter(where status='rejected') rejected
    from draborngate.dkd_gate_courier_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
    group by created_at::date
  ) cp on cp.report_date=gs.report_date::date
  left join (
    select created_at::date report_date,count(*) total
    from draborngate.dkd_gate_visitor_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
    group by created_at::date
  ) vp on vp.report_date=gs.report_date::date;

  select coalesce(jsonb_agg(jsonb_build_object('hour',hs.report_hour,'total',coalesce(x.total,0)) order by hs.report_hour),'[]'::jsonb)
  into v_hourly
  from generate_series(0,23) hs(report_hour)
  left join (
    select extract(hour from created_at)::int report_hour,count(*) total
    from draborngate.dkd_gate_courier_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
    group by extract(hour from created_at)::int
  ) x on x.report_hour=hs.report_hour;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc,x.gate),'[]'::jsonb)
  into v_gates
  from (
    select coalesce(nullif(gate,''),'Kapı belirtilmedi') gate,count(*) total,
      count(*) filter(where status='completed') completed,
      count(*) filter(where status='rejected') rejected,
      round(coalesce(100.0*count(*) filter(where status='completed')/nullif(count(*),0),0),1) completion_rate,
      round(coalesce(avg(extract(epoch from (completed_at-created_at))/60) filter(where completed_at is not null),0),1) average_minutes
    from draborngate.dkd_gate_courier_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
    group by coalesce(nullif(gate,''),'Kapı belirtilmedi')
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc,x.platform),'[]'::jsonb)
  into v_platforms
  from (
    select coalesce(nullif(platform,''),'Diğer') platform,count(*) total,
      count(*) filter(where status='completed') completed,
      count(*) filter(where status='rejected') rejected
    from draborngate.dkd_gate_courier_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
    group by coalesce(nullif(platform,''),'Diğer')
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc,x.courier_name),'[]'::jsonb)
  into v_couriers
  from (
    select courier_user_id,coalesce(nullif(courier_name,''),'Kurye') courier_name,
      coalesce(nullif(platform,''),'Diğer') platform,count(*) total,
      count(*) filter(where status='completed') completed,
      count(*) filter(where status='rejected') rejected,
      round(coalesce(avg(extract(epoch from (completed_at-created_at))/60) filter(where completed_at is not null),0),1) average_minutes
    from draborngate.dkd_gate_courier_passes
    where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz
    group by courier_user_id,coalesce(nullif(courier_name,''),'Kurye'),coalesce(nullif(platform,''),'Diğer')
    order by count(*) desc
    limit 20
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.total_actions desc,x.full_name),'[]'::jsonb)
  into v_security
  from (
    select e.actor_user_id,coalesce(nullif(pr.full_name,''),'Güvenlik') full_name,
      count(*) filter(where e.event_type='approved') approved,
      count(*) filter(where e.event_type='rejected') rejected,
      count(*) filter(where e.event_type='completed') completed,
      count(*) total_actions,
      round(coalesce(avg(extract(epoch from (e.created_at-p.created_at))/60) filter(where e.event_type in ('approved','rejected')),0),1) average_decision_minutes
    from draborngate.dkd_gate_pass_events e
    join draborngate.dkd_gate_courier_passes p on p.id=e.pass_id
    left join draborngate.dkd_gate_profiles pr on pr.user_id=e.actor_user_id
    where p.site_id=p_site_id and e.event_type in ('approved','rejected','completed')
      and p.created_at>=v_from::timestamptz and p.created_at<(v_to+1)::timestamptz
    group by e.actor_user_id,coalesce(nullif(pr.full_name,''),'Güvenlik')
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by (x.income+x.expense) desc,x.category),'[]'::jsonb)
  into v_finance_categories
  from (
    select category,
      coalesce(sum(amount) filter(where transaction_type='income'),0) income,
      coalesce(sum(amount) filter(where transaction_type='expense'),0) expense,
      coalesce(sum(case when transaction_type='income' then amount else -amount end),0) balance
    from draborngate.dkd_gate_finance_transactions
    where site_id=p_site_id and transaction_date between v_from and v_to
    group by category
  ) x;

  select jsonb_build_object(
    'gates',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_site_gates where site_id=p_site_id and is_active and not is_demo),'limit',v_plan.gate_limit),
    'staff',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_site_memberships where site_id=p_site_id and is_active and not is_demo and role in ('owner','manager','security')),'limit',v_plan.staff_limit),
    'residents',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_site_memberships where site_id=p_site_id and is_active and not is_demo and role='resident'),'limit',v_plan.resident_limit),
    'courier_passes_month',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_courier_passes where site_id=p_site_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month'),'limit',v_plan.monthly_courier_pass_limit),
    'visitor_passes_month',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_visitor_passes where site_id=p_site_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month'),'limit',v_plan.monthly_visitor_pass_limit)
  ) into v_usage;

  return jsonb_build_object(
    'site_id',p_site_id,
    'date_from',v_from,
    'date_to',v_to,
    'requested_date_from',v_requested_from,
    'range_was_limited',v_from<>v_requested_from,
    'plan',to_jsonb(v_plan),
    'subscription',to_jsonb(v_subscription),
    'summary',v_summary,
    'daily',v_daily,
    'hourly',v_hourly,
    'gates',v_gates,
    'platforms',v_platforms,
    'couriers',v_couriers,
    'security',v_security,
    'finance_categories',v_finance_categories,
    'usage',v_usage
  );
end;
$$;

create or replace function public.dkd_gate_prepare_report_export(
  p_site_id uuid,
  p_date_from date,
  p_date_to date
)
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_plan draborngate.dkd_gate_subscription_plans%rowtype;
  v_to date := least(coalesce(p_date_to,current_date),current_date);
  v_from date;
  v_csv text;
  v_rows integer;
  v_export_id uuid;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Rapor dışa aktarma için site yönetimi yetkisi gerekli';
  end if;

  select * into v_plan from draborngate.dkd_gate_effective_plan(p_site_id);
  if not v_plan.allow_export then
    raise exception 'CSV dışa aktarma Profesyonel veya Kurumsal paket gerektirir';
  end if;

  v_from := greatest(coalesce(p_date_from,v_to-29),v_to-(v_plan.report_days_limit-1));
  if v_from>v_to then raise exception 'Geçersiz tarih aralığı'; end if;

  with report_rows as (
    select p.created_at sort_at,
      p.created_at::date::text record_date,
      'Kurye Geçişi' record_type,
      p.courier_name record_name,
      p.status record_status,
      p.gate location_name,
      p.platform category_name,
      '' amount_text
    from draborngate.dkd_gate_courier_passes p
    where p.site_id=p_site_id and p.created_at>=v_from::timestamptz and p.created_at<(v_to+1)::timestamptz
    union all
    select v.created_at,v.created_at::date::text,'Ziyaretçi Geçişi',v.guest_name,v.status,
      coalesce(v.plate,''),'Ziyaretçi',''
    from draborngate.dkd_gate_visitor_passes v
    where v.site_id=p_site_id and v.created_at>=v_from::timestamptz and v.created_at<(v_to+1)::timestamptz
    union all
    select f.created_at,f.transaction_date::text,'Finans',f.description,f.transaction_type,
      f.category,case when f.visible_to_residents then 'Sakin özetinde' else 'Yalnızca yönetim' end,
      f.amount::text
    from draborngate.dkd_gate_finance_transactions f
    where f.site_id=p_site_id and f.transaction_date between v_from and v_to
  ), report_lines as (
    select sort_at,
      draborngate.dkd_gate_csv_escape(record_date)||','||
      draborngate.dkd_gate_csv_escape(record_type)||','||
      draborngate.dkd_gate_csv_escape(record_name)||','||
      draborngate.dkd_gate_csv_escape(record_status)||','||
      draborngate.dkd_gate_csv_escape(location_name)||','||
      draborngate.dkd_gate_csv_escape(category_name)||','||
      draborngate.dkd_gate_csv_escape(amount_text) line
    from report_rows
  )
  select '"Tarih","Kayıt Türü","Ad / Açıklama","Durum","Kapı / Konum","Platform / Kategori","Tutar"'||chr(10)||
         coalesce(string_agg(line,chr(10) order by sort_at),'')
  into v_csv
  from report_lines;

  select
    (select count(*) from draborngate.dkd_gate_courier_passes where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz)
    +(select count(*) from draborngate.dkd_gate_visitor_passes where site_id=p_site_id and created_at>=v_from::timestamptz and created_at<(v_to+1)::timestamptz)
    +(select count(*) from draborngate.dkd_gate_finance_transactions where site_id=p_site_id and transaction_date between v_from and v_to)
  into v_rows;

  insert into draborngate.dkd_gate_report_exports(site_id,requested_by,report_type,date_from,date_to,format,row_count,status)
  values(p_site_id,auth.uid(),'operations',v_from,v_to,'csv',v_rows,'created')
  returning id into v_export_id;

  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),p_site_id,'report_export_created','report_export',v_export_id::text,jsonb_build_object('date_from',v_from,'date_to',v_to,'row_count',v_rows));

  return jsonb_build_object('id',v_export_id,'date_from',v_from,'date_to',v_to,'row_count',v_rows,'csv',v_csv);
end;
$$;

revoke all on function public.dkd_gate_get_site_report(uuid,date,date) from public,anon;
revoke all on function public.dkd_gate_prepare_report_export(uuid,date,date) from public,anon;
grant execute on function public.dkd_gate_get_site_report(uuid,date,date) to authenticated;
grant execute on function public.dkd_gate_prepare_report_export(uuid,date,date) to authenticated;

create sequence if not exists draborngate.dkd_gate_invoice_seq start 1;

create or replace function draborngate.dkd_gate_generate_subscription_reminders_for_user(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_count integer:=0;
  r record;
  v_days integer;
  v_kind text;
begin
  for r in
    select s.id subscription_id,s.site_id,s.plan_code,s.status,
      case when s.status='trialing' then s.trial_ends_at else s.current_period_end end ends_at,
      site.name site_name
    from draborngate.dkd_gate_site_subscriptions s
    join draborngate.dkd_gate_sites site on site.id=s.site_id
    where s.status in ('trialing','active')
      and case when s.status='trialing' then s.trial_ends_at else s.current_period_end end is not null
      and exists(
        select 1 from draborngate.dkd_gate_site_memberships m
        where m.site_id=s.site_id and m.user_id=p_user_id and m.is_active and m.role in ('owner','manager')
      )
  loop
    v_days:=greatest(0,ceil(extract(epoch from (r.ends_at-now()))/86400.0)::int);
    if v_days in (7,3,1,0) then
      v_kind:='subscription_reminder_'||v_days;
      if not exists(
        select 1 from draborngate.dkd_gate_notifications n
        where n.user_id=p_user_id and n.kind=v_kind
          and n.data->>'subscription_id'=r.subscription_id::text
          and n.created_at::date=current_date
      ) then
        insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
        values(
          p_user_id,v_kind,
          case when r.status='trialing' then 'Deneme paketi sona eriyor' else 'Paket yenileme zamanı yaklaşıyor' end,
          case when v_days=0 then r.site_name||' paketi bugün sona eriyor.' else r.site_name||' paketi için '||v_days||' gün kaldı.' end,
          jsonb_build_object('subscription_id',r.subscription_id,'site_id',r.site_id,'days_left',v_days)
        );
        v_count:=v_count+1;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.dkd_gate_get_subscription_center(p_site_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_subscription jsonb;
  v_effective_plan jsonb;
  v_plans jsonb;
  v_payments jsonb;
  v_billing jsonb;
  v_usage jsonb;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Paket merkezini görüntülemek için site yönetimi yetkisi gerekli';
  end if;

  perform draborngate.dkd_gate_generate_subscription_reminders_for_user(auth.uid());

  select to_jsonb(s) into v_subscription
  from draborngate.dkd_gate_site_subscriptions s where s.site_id=p_site_id;

  select to_jsonb(p) into v_effective_plan
  from draborngate.dkd_gate_effective_plan(p_site_id) p;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order,p.monthly_price),'[]'::jsonb)
  into v_plans
  from draborngate.dkd_gate_subscription_plans p
  where p.is_active and p.is_public;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',pr.id,'plan_code',pr.plan_code,'plan_name',pl.name,
    'billing_cycle',pr.billing_cycle,'amount',pr.amount,'currency',pr.currency,
    'bank_reference',pr.bank_reference,'receipt_path',pr.receipt_path,
    'status',pr.status,'admin_note',pr.admin_note,'created_at',pr.created_at,
    'reviewed_at',pr.reviewed_at,'invoice_number',inv.invoice_number,
    'invoice_status',inv.status,'period_start',inv.period_start,'period_end',inv.period_end
  ) order by pr.created_at desc),'[]'::jsonb)
  into v_payments
  from draborngate.dkd_gate_subscription_payment_requests pr
  join draborngate.dkd_gate_subscription_plans pl on pl.code=pr.plan_code
  left join draborngate.dkd_gate_subscription_invoices inv on inv.payment_request_id=pr.id
  where pr.site_id=p_site_id;

  select to_jsonb(b) into v_billing
  from draborngate.dkd_gate_billing_settings b where b.singleton=true;

  select jsonb_build_object(
    'gates',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_site_gates where site_id=p_site_id and is_active and not is_demo),'limit',(v_effective_plan->>'gate_limit')::int),
    'staff',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_site_memberships where site_id=p_site_id and is_active and not is_demo and role in ('owner','manager','security')),'limit',(v_effective_plan->>'staff_limit')::int),
    'residents',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_site_memberships where site_id=p_site_id and is_active and not is_demo and role='resident'),'limit',(v_effective_plan->>'resident_limit')::int),
    'courier_passes_month',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_courier_passes where site_id=p_site_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month'),'limit',(v_effective_plan->>'monthly_courier_pass_limit')::int),
    'visitor_passes_month',jsonb_build_object('used',(select count(*) from draborngate.dkd_gate_visitor_passes where site_id=p_site_id and not is_demo and created_at>=date_trunc('month',now()) and created_at<date_trunc('month',now())+interval '1 month'),'limit',(v_effective_plan->>'monthly_visitor_pass_limit')::int)
  ) into v_usage;

  return jsonb_build_object(
    'site_id',p_site_id,
    'subscription',v_subscription,
    'effective_plan',v_effective_plan,
    'plans',v_plans,
    'payments',v_payments,
    'billing',v_billing,
    'usage',v_usage
  );
end;
$$;

create or replace function public.dkd_gate_start_site_trial(p_site_id uuid,p_plan_code text default 'professional')
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_plan draborngate.dkd_gate_subscription_plans%rowtype;
  v_owner uuid;
  v_subscription draborngate.dkd_gate_site_subscriptions%rowtype;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Deneme başlatmak için site yönetimi yetkisi gerekli';
  end if;

  select * into v_plan from draborngate.dkd_gate_subscription_plans
  where code=p_plan_code and is_active and is_public;
  if v_plan.code is null then raise exception 'Paket bulunamadı'; end if;
  if v_plan.trial_days<=0 then raise exception 'Bu paket için deneme süresi yok'; end if;

  select owner_user_id into v_owner from draborngate.dkd_gate_sites where id=p_site_id;
  if exists(select 1 from draborngate.dkd_gate_trial_claims where user_id=v_owner) then
    raise exception 'Bu yönetim hesabı ücretsiz deneme hakkını daha önce kullandı';
  end if;

  insert into draborngate.dkd_gate_site_subscriptions(
    site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
    trial_started_at,trial_ends_at,source,notes
  ) values(
    p_site_id,v_plan.code,'trialing','monthly',now(),now()+(v_plan.trial_days||' days')::interval,
    now(),now()+(v_plan.trial_days||' days')::interval,'trial','Kullanıcı tarafından başlatılan deneme'
  )
  on conflict(site_id) do update set
    plan_code=excluded.plan_code,status='trialing',billing_cycle='monthly',
    current_period_start=now(),current_period_end=excluded.current_period_end,
    trial_started_at=now(),trial_ends_at=excluded.trial_ends_at,
    cancel_at_period_end=false,source='trial',notes=excluded.notes,updated_at=now()
  returning * into v_subscription;

  insert into draborngate.dkd_gate_trial_claims(user_id,site_id,plan_code)
  values(v_owner,p_site_id,v_plan.code);

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  select m.user_id,'subscription_trial_started','Profesyonel deneme başladı',
    v_plan.name||' paketi '||v_plan.trial_days||' gün boyunca aktif.',
    jsonb_build_object('site_id',p_site_id,'plan_code',v_plan.code,'trial_ends_at',v_subscription.trial_ends_at)
  from draborngate.dkd_gate_site_memberships m
  where m.site_id=p_site_id and m.is_active and m.role in ('owner','manager');

  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),p_site_id,'subscription_trial_started','site_subscription',v_subscription.id::text,jsonb_build_object('plan_code',v_plan.code,'trial_days',v_plan.trial_days));

  return to_jsonb(v_subscription);
end;
$$;

create or replace function public.dkd_gate_submit_subscription_payment(
  p_site_id uuid,
  p_plan_code text,
  p_billing_cycle text,
  p_bank_reference text,
  p_receipt_path text
)
returns uuid
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_plan draborngate.dkd_gate_subscription_plans%rowtype;
  v_billing draborngate.dkd_gate_billing_settings%rowtype;
  v_amount numeric;
  v_id uuid;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid()) then
    raise exception 'Paket ödeme talebi için site yönetimi yetkisi gerekli';
  end if;
  if p_billing_cycle not in ('monthly','yearly') then raise exception 'Geçersiz ödeme dönemi'; end if;

  select * into v_plan from draborngate.dkd_gate_subscription_plans
  where code=p_plan_code and is_active and is_public;
  if v_plan.code is null or v_plan.code='starter' then raise exception 'Ücretli bir paket seçmelisiniz'; end if;

  select * into v_billing from draborngate.dkd_gate_billing_settings where singleton=true;
  if not coalesce(v_billing.is_active,false) then raise exception 'Banka ödeme bilgileri henüz Admin tarafından etkinleştirilmedi'; end if;

  v_amount:=case when p_billing_cycle='yearly' then v_plan.yearly_price else v_plan.monthly_price end;
  if v_amount<=0 then raise exception 'Paket fiyatı geçersiz'; end if;
  if coalesce(trim(p_receipt_path),'')='' then raise exception 'Dekont görseli gerekli'; end if;

  if exists(select 1 from draborngate.dkd_gate_subscription_payment_requests where site_id=p_site_id and status='pending') then
    raise exception 'Bu site için zaten incelenen bir ödeme talebi var';
  end if;

  insert into draborngate.dkd_gate_subscription_payment_requests(
    site_id,plan_code,requested_by,billing_cycle,amount,currency,bank_reference,receipt_path
  ) values(
    p_site_id,v_plan.code,auth.uid(),p_billing_cycle,v_amount,v_plan.currency,
    nullif(trim(p_bank_reference),''),trim(p_receipt_path)
  ) returning id into v_id;

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  select a.user_id,'subscription_payment_pending','Yeni paket ödeme talebi',
    v_plan.name||' • '||v_amount||' '||v_plan.currency,
    jsonb_build_object('payment_request_id',v_id,'site_id',p_site_id)
  from draborngate.dkd_gate_admins a;

  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),p_site_id,'subscription_payment_submitted','subscription_payment',v_id::text,jsonb_build_object('plan_code',v_plan.code,'billing_cycle',p_billing_cycle,'amount',v_amount));

  return v_id;
end;
$$;

create or replace function public.dkd_gate_cancel_subscription_payment(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_request draborngate.dkd_gate_subscription_payment_requests%rowtype;
begin
  select * into v_request from draborngate.dkd_gate_subscription_payment_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Ödeme talebi bulunamadı'; end if;
  if v_request.status<>'pending' then raise exception 'Yalnızca bekleyen ödeme talebi iptal edilebilir'; end if;
  if v_request.requested_by<>auth.uid() and not draborngate.dkd_gate_is_site_manager(v_request.site_id,auth.uid()) then
    raise exception 'Yetki gerekli';
  end if;
  update draborngate.dkd_gate_subscription_payment_requests set status='cancelled',updated_at=now() where id=p_request_id;
  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id)
  values(auth.uid(),v_request.site_id,'subscription_payment_cancelled','subscription_payment',p_request_id::text);
end;
$$;

create or replace function public.dkd_gate_admin_get_monetization_center()
returns jsonb
language plpgsql
stable
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_summary jsonb;
  v_plans jsonb;
  v_payments jsonb;
  v_subscriptions jsonb;
  v_billing jsonb;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;

  select jsonb_build_object(
    'active_subscriptions',count(*) filter(where status='active' and (current_period_end is null or current_period_end>=now())),
    'trials',count(*) filter(where status='trialing' and trial_ends_at>=now()),
    'past_due',count(*) filter(where status='past_due'),
    'pending_payments',(select count(*) from draborngate.dkd_gate_subscription_payment_requests where status='pending'),
    'total_collected',(select coalesce(sum(amount),0) from draborngate.dkd_gate_subscription_invoices where status='paid'),
    'monthly_recurring_revenue',coalesce(sum(case when status='active' and billing_cycle='monthly' then p.monthly_price when status='active' and billing_cycle='yearly' then p.yearly_price/12 else 0 end),0)
  ) into v_summary
  from draborngate.dkd_gate_site_subscriptions s
  join draborngate.dkd_gate_subscription_plans p on p.code=s.plan_code;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order,p.monthly_price),'[]'::jsonb)
  into v_plans from draborngate.dkd_gate_subscription_plans p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',pr.id,'site_id',pr.site_id,'site_name',s.name,'requester_name',coalesce(nullif(pro.full_name,''),u.email),
    'requester_email',u.email,'plan_code',pr.plan_code,'plan_name',pl.name,
    'billing_cycle',pr.billing_cycle,'amount',pr.amount,'currency',pr.currency,
    'bank_reference',pr.bank_reference,'receipt_path',pr.receipt_path,'status',pr.status,
    'admin_note',pr.admin_note,'created_at',pr.created_at,'reviewed_at',pr.reviewed_at,
    'invoice_number',inv.invoice_number
  ) order by case pr.status when 'pending' then 0 else 1 end,pr.created_at desc),'[]'::jsonb)
  into v_payments
  from draborngate.dkd_gate_subscription_payment_requests pr
  join draborngate.dkd_gate_sites s on s.id=pr.site_id
  join draborngate.dkd_gate_subscription_plans pl on pl.code=pr.plan_code
  join auth.users u on u.id=pr.requested_by
  left join draborngate.dkd_gate_profiles pro on pro.user_id=pr.requested_by
  left join draborngate.dkd_gate_subscription_invoices inv on inv.payment_request_id=pr.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sub.id,'site_id',sub.site_id,'site_name',s.name,'owner_email',u.email,
    'plan_code',sub.plan_code,'plan_name',p.name,'status',sub.status,'billing_cycle',sub.billing_cycle,
    'current_period_start',sub.current_period_start,'current_period_end',sub.current_period_end,
    'trial_ends_at',sub.trial_ends_at,'source',sub.source
  ) order by s.name),'[]'::jsonb)
  into v_subscriptions
  from draborngate.dkd_gate_site_subscriptions sub
  join draborngate.dkd_gate_sites s on s.id=sub.site_id
  join auth.users u on u.id=s.owner_user_id
  join draborngate.dkd_gate_subscription_plans p on p.code=sub.plan_code;

  select to_jsonb(b) into v_billing from draborngate.dkd_gate_billing_settings b where singleton=true;

  return jsonb_build_object('summary',v_summary,'plans',v_plans,'payments',v_payments,'subscriptions',v_subscriptions,'billing',v_billing);
end;
$$;

create or replace function public.dkd_gate_admin_update_billing_settings(
  p_bank_name text,p_account_holder text,p_iban text,p_instructions text,p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_row draborngate.dkd_gate_billing_settings%rowtype;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  if p_is_active and (coalesce(trim(p_bank_name),'')='' or coalesce(trim(p_account_holder),'')='' or coalesce(trim(p_iban),'')='') then
    raise exception 'Aktif ödeme için banka, hesap sahibi ve IBAN gerekli';
  end if;
  insert into draborngate.dkd_gate_billing_settings(singleton,bank_name,account_holder,iban,instructions,is_active,updated_by,updated_at)
  values(true,nullif(trim(p_bank_name),''),nullif(trim(p_account_holder),''),nullif(trim(p_iban),''),nullif(trim(p_instructions),''),p_is_active,auth.uid(),now())
  on conflict(singleton) do update set bank_name=excluded.bank_name,account_holder=excluded.account_holder,iban=excluded.iban,
    instructions=excluded.instructions,is_active=excluded.is_active,updated_by=auth.uid(),updated_at=now()
  returning * into v_row;
  insert into draborngate.dkd_gate_audit_logs(actor_user_id,action,entity_type,entity_id,detail)
  values(auth.uid(),'billing_settings_updated','billing_settings','singleton',jsonb_build_object('is_active',p_is_active));
  return to_jsonb(v_row);
end;
$$;

create or replace function public.dkd_gate_admin_upsert_subscription_plan(
  p_code text,p_name text,p_description text,p_monthly_price numeric,p_yearly_price numeric,
  p_site_limit integer,p_gate_limit integer,p_staff_limit integer,p_resident_limit integer,
  p_monthly_courier_pass_limit integer,p_monthly_visitor_pass_limit integer,p_report_days_limit integer,
  p_allow_export boolean,p_advanced_finance boolean,p_priority_support boolean,p_custom_branding boolean,
  p_trial_days integer,p_is_public boolean,p_is_active boolean,p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_plan draborngate.dkd_gate_subscription_plans%rowtype;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  if coalesce(trim(p_code),'')='' or coalesce(trim(p_name),'')='' then raise exception 'Paket kodu ve adı gerekli'; end if;
  insert into draborngate.dkd_gate_subscription_plans(
    code,name,description,monthly_price,yearly_price,currency,site_limit,gate_limit,staff_limit,resident_limit,
    monthly_courier_pass_limit,monthly_visitor_pass_limit,report_days_limit,allow_export,advanced_finance,
    priority_support,custom_branding,trial_days,is_public,is_active,sort_order
  ) values(
    lower(trim(p_code)),trim(p_name),coalesce(trim(p_description),''),greatest(0,p_monthly_price),greatest(0,p_yearly_price),'TRY',
    greatest(0,p_site_limit),greatest(0,p_gate_limit),greatest(0,p_staff_limit),greatest(0,p_resident_limit),
    greatest(0,p_monthly_courier_pass_limit),greatest(0,p_monthly_visitor_pass_limit),greatest(1,p_report_days_limit),
    p_allow_export,p_advanced_finance,p_priority_support,p_custom_branding,greatest(0,p_trial_days),p_is_public,p_is_active,p_sort_order
  )
  on conflict(code) do update set name=excluded.name,description=excluded.description,monthly_price=excluded.monthly_price,
    yearly_price=excluded.yearly_price,site_limit=excluded.site_limit,gate_limit=excluded.gate_limit,
    staff_limit=excluded.staff_limit,resident_limit=excluded.resident_limit,
    monthly_courier_pass_limit=excluded.monthly_courier_pass_limit,monthly_visitor_pass_limit=excluded.monthly_visitor_pass_limit,
    report_days_limit=excluded.report_days_limit,allow_export=excluded.allow_export,advanced_finance=excluded.advanced_finance,
    priority_support=excluded.priority_support,custom_branding=excluded.custom_branding,trial_days=excluded.trial_days,
    is_public=excluded.is_public,is_active=excluded.is_active,sort_order=excluded.sort_order,updated_at=now()
  returning * into v_plan;
  insert into draborngate.dkd_gate_audit_logs(actor_user_id,action,entity_type,entity_id,detail)
  values(auth.uid(),'subscription_plan_upserted','subscription_plan',v_plan.code,to_jsonb(v_plan));
  return to_jsonb(v_plan);
end;
$$;

create or replace function public.dkd_gate_admin_decide_subscription_payment(
  p_request_id uuid,p_status text,p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_request draborngate.dkd_gate_subscription_payment_requests%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_invoice_number text;
  v_subscription draborngate.dkd_gate_site_subscriptions%rowtype;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then raise exception 'Admin yetkisi gerekli'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Geçersiz karar'; end if;

  select * into v_request from draborngate.dkd_gate_subscription_payment_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Ödeme talebi bulunamadı'; end if;
  if v_request.status<>'pending' then raise exception 'Bu ödeme talebi daha önce incelendi'; end if;

  update draborngate.dkd_gate_subscription_payment_requests
  set status=p_status,admin_note=nullif(trim(p_admin_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=p_request_id;

  if p_status='approved' then
    select greatest(now(),coalesce(current_period_end,now())) into v_start
    from draborngate.dkd_gate_site_subscriptions where site_id=v_request.site_id;
    v_start:=coalesce(v_start,now());
    v_end:=case when v_request.billing_cycle='yearly' then v_start+interval '1 year' else v_start+interval '1 month' end;

    insert into draborngate.dkd_gate_site_subscriptions(
      site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
      trial_started_at,trial_ends_at,cancel_at_period_end,source,approved_by,notes
    ) values(
      v_request.site_id,v_request.plan_code,'active',v_request.billing_cycle,v_start,v_end,
      null,null,false,'payment',auth.uid(),nullif(trim(p_admin_note),'')
    )
    on conflict(site_id) do update set plan_code=excluded.plan_code,status='active',billing_cycle=excluded.billing_cycle,
      current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
      trial_started_at=null,trial_ends_at=null,cancel_at_period_end=false,source='payment',approved_by=auth.uid(),
      notes=excluded.notes,updated_at=now()
    returning * into v_subscription;

    v_invoice_number:='DBG-'||to_char(now(),'YYYYMM')||'-'||lpad(nextval('draborngate.dkd_gate_invoice_seq')::text,6,'0');
    insert into draborngate.dkd_gate_subscription_invoices(
      invoice_number,payment_request_id,site_id,plan_code,billing_cycle,amount,currency,status,period_start,period_end
    ) values(
      v_invoice_number,v_request.id,v_request.site_id,v_request.plan_code,v_request.billing_cycle,
      v_request.amount,v_request.currency,'paid',v_start,v_end
    );

    insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
    select m.user_id,'subscription_payment_approved','Paket ödemeniz onaylandı',
      'Paketiniz '||to_char(v_end,'DD.MM.YYYY')||' tarihine kadar aktif. Belge No: '||v_invoice_number,
      jsonb_build_object('payment_request_id',v_request.id,'site_id',v_request.site_id,'invoice_number',v_invoice_number,'period_end',v_end)
    from draborngate.dkd_gate_site_memberships m
    where m.site_id=v_request.site_id and m.is_active and m.role in ('owner','manager');
  else
    insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
    select m.user_id,'subscription_payment_rejected','Paket ödeme talebiniz reddedildi',
      coalesce(nullif(trim(p_admin_note),''),'Dekont veya ödeme bilgileri doğrulanamadı.'),
      jsonb_build_object('payment_request_id',v_request.id,'site_id',v_request.site_id)
    from draborngate.dkd_gate_site_memberships m
    where m.site_id=v_request.site_id and m.is_active and m.role in ('owner','manager');
  end if;

  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),v_request.site_id,'subscription_payment_'||p_status,'subscription_payment',v_request.id::text,jsonb_build_object('admin_note',p_admin_note,'invoice_number',v_invoice_number));

  return jsonb_build_object('status',p_status,'subscription',to_jsonb(v_subscription),'invoice_number',v_invoice_number);
end;
$$;

create or replace function public.dkd_gate_admin_set_site_subscription(
  p_site_id uuid,p_plan_code text,p_status text,p_days integer,p_notes text default null
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
    site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,trial_started_at,trial_ends_at,source,approved_by,notes
  ) values(
    p_site_id,p_plan_code,p_status,'monthly',now(),case when p_status='active' then v_end else null end,
    case when p_status='trialing' then now() else null end,case when p_status='trialing' then v_end else null end,
    'admin',auth.uid(),nullif(trim(p_notes),'')
  ) on conflict(site_id) do update set plan_code=excluded.plan_code,status=excluded.status,
    current_period_start=now(),current_period_end=excluded.current_period_end,
    trial_started_at=excluded.trial_started_at,trial_ends_at=excluded.trial_ends_at,
    source='admin',approved_by=auth.uid(),notes=excluded.notes,updated_at=now()
  returning * into v_row;
  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),p_site_id,'site_subscription_set','site_subscription',v_row.id::text,to_jsonb(v_row));
  return to_jsonb(v_row);
end;
$$;

revoke all on function draborngate.dkd_gate_generate_subscription_reminders_for_user(uuid) from public;
revoke all on function public.dkd_gate_get_subscription_center(uuid) from public,anon;
revoke all on function public.dkd_gate_start_site_trial(uuid,text) from public,anon;
revoke all on function public.dkd_gate_submit_subscription_payment(uuid,text,text,text,text) from public,anon;
revoke all on function public.dkd_gate_cancel_subscription_payment(uuid) from public,anon;
revoke all on function public.dkd_gate_admin_get_monetization_center() from public,anon;
revoke all on function public.dkd_gate_admin_update_billing_settings(text,text,text,text,boolean) from public,anon;
revoke all on function public.dkd_gate_admin_upsert_subscription_plan(text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean,integer) from public,anon;
revoke all on function public.dkd_gate_admin_decide_subscription_payment(uuid,text,text) from public,anon;
revoke all on function public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text) from public,anon;

grant execute on function public.dkd_gate_get_subscription_center(uuid) to authenticated;
grant execute on function public.dkd_gate_start_site_trial(uuid,text) to authenticated;
grant execute on function public.dkd_gate_submit_subscription_payment(uuid,text,text,text,text) to authenticated;
grant execute on function public.dkd_gate_cancel_subscription_payment(uuid) to authenticated;
grant execute on function public.dkd_gate_admin_get_monetization_center() to authenticated;
grant execute on function public.dkd_gate_admin_update_billing_settings(text,text,text,text,boolean) to authenticated;
grant execute on function public.dkd_gate_admin_upsert_subscription_plan(text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean,integer) to authenticated;
grant execute on function public.dkd_gate_admin_decide_subscription_payment(uuid,text,text) to authenticated;
grant execute on function public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text) to authenticated;

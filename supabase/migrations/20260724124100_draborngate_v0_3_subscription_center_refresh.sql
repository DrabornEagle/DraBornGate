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

  perform public.dkd_gate_refresh_site_subscription(p_site_id);
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

revoke all on function public.dkd_gate_get_subscription_center(uuid) from public,anon;
grant execute on function public.dkd_gate_get_subscription_center(uuid) to authenticated;


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

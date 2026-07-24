create or replace function public.dkd_gate_refresh_site_subscription(p_site_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  v_row draborngate.dkd_gate_site_subscriptions%rowtype;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())
     and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Yönetim yetkisi gerekli';
  end if;

  select * into v_row from draborngate.dkd_gate_site_subscriptions where site_id=p_site_id for update;
  if v_row.id is null then
    insert into draborngate.dkd_gate_site_subscriptions(site_id,plan_code,status,billing_cycle,source,notes)
    values(p_site_id,'starter','free','monthly','system','Başlangıç paketi otomatik oluşturuldu.')
    returning * into v_row;
  elsif v_row.status='trialing' and v_row.trial_ends_at is not null and v_row.trial_ends_at<now() then
    update draborngate.dkd_gate_site_subscriptions
    set plan_code='starter',status='free',billing_cycle='monthly',
        current_period_start=now(),current_period_end=null,trial_started_at=null,trial_ends_at=null,
        cancel_at_period_end=false,source='system',notes='Deneme süresi sona erdi; Başlangıç paketine geçildi.',updated_at=now()
    where id=v_row.id returning * into v_row;
  elsif v_row.status='active' and v_row.current_period_end is not null and v_row.current_period_end<now() then
    if v_row.cancel_at_period_end then
      update draborngate.dkd_gate_site_subscriptions
      set plan_code='starter',status='free',billing_cycle='monthly',
          current_period_start=now(),current_period_end=null,cancel_at_period_end=false,
          source='system',notes='Abonelik dönem sonunda iptal edildi; Başlangıç paketine geçildi.',updated_at=now()
      where id=v_row.id returning * into v_row;
    else
      update draborngate.dkd_gate_site_subscriptions
      set status='past_due',updated_at=now()
      where id=v_row.id returning * into v_row;
    end if;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.dkd_gate_set_subscription_cancellation(p_site_id uuid,p_cancel boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  v_row draborngate.dkd_gate_site_subscriptions%rowtype;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid()) then
    raise exception 'Yönetim yetkisi gerekli';
  end if;

  select * into v_row from draborngate.dkd_gate_site_subscriptions where site_id=p_site_id for update;
  if v_row.id is null or v_row.status<>'active' then
    raise exception 'Yalnızca aktif ücretli paket için dönem sonu iptali ayarlanabilir';
  end if;

  update draborngate.dkd_gate_site_subscriptions
  set cancel_at_period_end=p_cancel,
      notes=case when p_cancel then 'Kullanıcı dönem sonunda iptal istedi.' else 'Dönem sonu iptal talebi geri alındı.' end,
      updated_at=now()
  where id=v_row.id returning * into v_row;

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  select m.user_id,
    case when p_cancel then 'subscription_cancellation_scheduled' else 'subscription_cancellation_removed' end,
    case when p_cancel then 'Paket iptali dönem sonuna planlandı' else 'Paket iptal talebi geri alındı' end,
    case when p_cancel then 'Paketiniz '||to_char(v_row.current_period_end,'DD.MM.YYYY')||' tarihine kadar açık kalacak.' else 'Paketiniz mevcut dönemde ve sonraki yenilemede açık kalacak.' end,
    jsonb_build_object('site_id',p_site_id,'cancel_at_period_end',p_cancel,'period_end',v_row.current_period_end)
  from draborngate.dkd_gate_site_memberships m
  where m.site_id=p_site_id and m.is_active and m.role in ('owner','manager');

  insert into draborngate.dkd_gate_audit_logs(actor_user_id,site_id,action,entity_type,entity_id,detail)
  values(auth.uid(),p_site_id,case when p_cancel then 'subscription_cancellation_scheduled' else 'subscription_cancellation_removed' end,
    'site_subscription',v_row.id::text,jsonb_build_object('cancel_at_period_end',p_cancel,'period_end',v_row.current_period_end));

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.dkd_gate_refresh_site_subscription(uuid) from public,anon;
revoke all on function public.dkd_gate_set_subscription_cancellation(uuid,boolean) from public,anon;
grant execute on function public.dkd_gate_refresh_site_subscription(uuid) to authenticated;
grant execute on function public.dkd_gate_set_subscription_cancellation(uuid,boolean) to authenticated;

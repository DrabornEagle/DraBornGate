begin;

-- DraBornGate v0.3.7: güvenlik görevlisi geçiş kodunu kartta her zaman görür.
create or replace function public.dkd_gate_bootstrap()
returns jsonb language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'Oturum gerekli'; end if;
  insert into draborngate.dkd_gate_profiles(user_id,full_name)
    select uid,coalesce((select raw_user_meta_data->>'full_name' from auth.users where id=uid),'') on conflict(user_id) do nothing;
  insert into draborngate.dkd_gate_user_settings(user_id) values(uid) on conflict(user_id) do nothing;
  perform draborngate.dkd_gate_generate_due_reminders(uid);
  select jsonb_build_object(
    'profile',(select to_jsonb(p) from draborngate.dkd_gate_profiles p where p.user_id=uid),
    'courierProfile',(select to_jsonb(c) from draborngate.dkd_gate_courier_profiles c where c.user_id=uid),
    'residentProfiles',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from draborngate.dkd_gate_resident_profiles r where r.user_id=uid or draborngate.dkd_gate_is_site_staff(r.site_id,uid)),'[]'::jsonb),
    'memberships',coalesce((select jsonb_agg(to_jsonb(m)) from draborngate.dkd_gate_site_memberships m where m.user_id=uid or draborngate.dkd_gate_is_site_manager(m.site_id,uid)),'[]'::jsonb),
    'sites',coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from draborngate.dkd_gate_sites s where s.is_active and (not s.is_demo or s.demo_owner_user_id=uid)),'[]'::jsonb),
    'gates',coalesce((select jsonb_agg(to_jsonb(g) order by g.name) from draborngate.dkd_gate_site_gates g where g.is_active and (not g.is_demo or g.demo_owner_user_id=uid)),'[]'::jsonb),
    'passes',coalesce((select jsonb_agg(
      to_jsonb(p) || jsonb_build_object('approval_code',case when p.courier_user_id=uid or draborngate.dkd_gate_is_site_staff(p.site_id,uid) or draborngate.dkd_gate_is_admin_user(uid) then p.approval_code else null end)
      order by p.created_at desc)
      from draborngate.dkd_gate_courier_passes p
      where draborngate.dkd_gate_can_access_pass(p.id,uid) and (not p.is_demo or p.demo_owner_user_id=uid)
      limit 300),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from draborngate.dkd_gate_pass_events e where draborngate.dkd_gate_can_access_pass(e.pass_id,uid) and (not e.is_demo or e.demo_owner_user_id=uid) limit 500),'[]'::jsonb),
    'rules',coalesce((select jsonb_agg(to_jsonb(r) order by r.is_critical desc,r.created_at desc) from draborngate.dkd_gate_site_rules r where (r.is_active and r.starts_at<=now() and (r.ends_at is null or r.ends_at>=now()) or draborngate.dkd_gate_is_site_staff(r.site_id,uid)) and (not r.is_demo or r.demo_owner_user_id=uid)),'[]'::jsonb),
    'ruleAcceptances',coalesce((select jsonb_agg(to_jsonb(a)) from draborngate.dkd_gate_rule_acceptances a where a.user_id=uid),'[]'::jsonb),
    'visitors',coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc) from draborngate.dkd_gate_visitor_passes v where (v.resident_user_id=uid or draborngate.dkd_gate_is_site_staff(v.site_id,uid)) and (not v.is_demo or v.demo_owner_user_id=uid) limit 300),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from draborngate.dkd_gate_notifications n where n.user_id=uid and (not n.is_demo or n.demo_owner_user_id=uid) limit 200),'[]'::jsonb),
    'duesPeriods',coalesce((select jsonb_agg(to_jsonb(d) order by d.period_year desc,d.period_month desc) from draborngate.dkd_gate_dues_periods d where draborngate.dkd_gate_is_site_staff(d.site_id,uid) or exists(select 1 from draborngate.dkd_gate_resident_profiles r where r.user_id=uid and r.site_id=d.site_id and r.is_active)),'[]'::jsonb),
    'duesCharges',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from draborngate.dkd_gate_dues_charges c where c.resident_user_id=uid or draborngate.dkd_gate_is_site_staff(c.site_id,uid)),'[]'::jsonb),
    'financeTransactions',coalesce((select jsonb_agg(to_jsonb(f) order by f.transaction_date desc,f.created_at desc) from draborngate.dkd_gate_finance_transactions f where draborngate.dkd_gate_is_site_staff(f.site_id,uid) or (f.visible_to_residents and exists(select 1 from draborngate.dkd_gate_resident_profiles r where r.user_id=uid and r.site_id=f.site_id and r.is_active) and exists(select 1 from draborngate.dkd_gate_sites s where s.id=f.site_id and s.finance_summary_visible))),'[]'::jsonb),
    'settings',(select to_jsonb(u) from draborngate.dkd_gate_user_settings u where u.user_id=uid),
    'release',(select to_jsonb(a) from draborngate.dkd_gate_app_releases a order by released_at desc limit 1)
  ) into result;
  return result;
end $$;

grant execute on function public.dkd_gate_bootstrap() to authenticated;

create or replace function public.dkd_gate_mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path=draborngate,public,auth
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  update draborngate.dkd_gate_notifications
  set read_at=coalesce(read_at,now())
  where user_id=auth.uid() and read_at is null;
end $$;

grant execute on function public.dkd_gate_mark_all_notifications_read() to authenticated;

create or replace function public.dkd_gate_clear_notifications()
returns void
language plpgsql
security definer
set search_path=draborngate,public,auth
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  delete from draborngate.dkd_gate_notifications where user_id=auth.uid();
end $$;

grant execute on function public.dkd_gate_clear_notifications() to authenticated;

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes)
values(
  '0.3.7',
  1,
  '0.3.7',
  'Güvenlik kartında görünür geçiş kodu ve modern kod eşleştirme, animasyonlu sipariş görseli, bildirim temizleme ve sayfalama, operasyon başlığı yanında canlı rozeti, paket kartı dikkat animasyonu ve SafeAreaView uyumluluğu.'
)
on conflict(version) do update set
  android_version_code=excluded.android_version_code,
  demo_data_version=excluded.demo_data_version,
  notes=excluded.notes,
  released_at=now();

commit;

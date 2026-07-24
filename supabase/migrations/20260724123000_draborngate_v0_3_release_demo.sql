alter function public.dkd_gate_load_demo_data() rename to dkd_gate_load_demo_data_v0_2_1;

create or replace function public.dkd_gate_load_demo_data()
returns text
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_site_id uuid;
  v_result text;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  v_result:=public.dkd_gate_load_demo_data_v0_2_1();

  select id into v_site_id
  from draborngate.dkd_gate_sites
  where is_demo and demo_owner_user_id=v_uid
  order by created_at desc
  limit 1;

  if v_site_id is not null then
    insert into draborngate.dkd_gate_site_subscriptions(
      site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
      trial_started_at,trial_ends_at,cancel_at_period_end,source,notes
    ) values(
      v_site_id,'professional','trialing','monthly',now(),now()+interval '365 days',
      now(),now()+interval '365 days',false,'demo','v0.3 örnek Profesyonel paket: raporlama, CSV ve gelişmiş finans açık.'
    )
    on conflict(site_id) do update set
      plan_code='professional',status='trialing',billing_cycle='monthly',
      current_period_start=now(),current_period_end=now()+interval '365 days',
      trial_started_at=now(),trial_ends_at=now()+interval '365 days',
      cancel_at_period_end=false,source='demo',
      notes='v0.3 örnek Profesyonel paket: raporlama, CSV ve gelişmiş finans açık.',updated_at=now();
  end if;

  update draborngate.dkd_gate_user_settings
  set demo_data_version='0.3.0',demo_loaded_at=now(),updated_at=now()
  where user_id=v_uid;

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data,is_demo,demo_owner_user_id)
  values(
    v_uid,'demo_v0_3_ready','DraBornGate v0.3 örnek verileri hazır',
    'Profesyonel raporlar, paket limitleri, abonelik merkezi ve CSV dışa aktarma örnek site için açıldı.',
    jsonb_build_object('site_id',v_site_id,'version','0.3.0','plan_code','professional'),true,v_uid
  );

  return '0.3.0';
end;
$$;

create or replace function draborngate.dkd_gate_refresh_subscription_statuses()
returns integer
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_changed integer:=0;
  v_rows integer;
begin
  update draborngate.dkd_gate_site_subscriptions
  set plan_code='starter',status='free',billing_cycle='monthly',
      current_period_start=now(),current_period_end=null,
      trial_started_at=null,trial_ends_at=null,
      cancel_at_period_end=false,source='system',
      notes='Deneme süresi sona erdi; Başlangıç paketine geçirildi.',updated_at=now()
  where status='trialing' and trial_ends_at is not null and trial_ends_at<now();
  get diagnostics v_rows=row_count;
  v_changed:=v_changed+v_rows;

  update draborngate.dkd_gate_site_subscriptions
  set status='past_due',updated_at=now()
  where status='active' and current_period_end is not null and current_period_end<now();
  get diagnostics v_rows=row_count;
  v_changed:=v_changed+v_rows;

  return v_changed;
end;
$$;

insert into draborngate.dkd_gate_app_releases(
  version,android_version_code,demo_data_version,notes,released_at
) values(
  '0.3.0',1,'0.3.0',
  'Profesyonel site raporları, günlük/saatlik yoğunluk, kapı-platform-kurye-güvenlik performansı, finans ve aidat analizi, CSV paylaşımı, Başlangıç/Profesyonel/Kurumsal paketler, kullanım limitleri, ücretsiz deneme ve Google Play uyumlu abonelik yönetimi.',
  now()
)
on conflict(version) do update set
  android_version_code=excluded.android_version_code,
  demo_data_version=excluded.demo_data_version,
  notes=excluded.notes,
  released_at=excluded.released_at;

insert into draborngate.dkd_gate_schema_migrations(version,description)
values('0.3.0','Raporlama, profesyonel paket ve para kazanma sistemi')
on conflict(version) do update set description=excluded.description,applied_at=now();

revoke all on function public.dkd_gate_load_demo_data_v0_2_1() from public,anon;
revoke all on function public.dkd_gate_load_demo_data() from public,anon;
revoke all on function draborngate.dkd_gate_refresh_subscription_statuses() from public;
grant execute on function public.dkd_gate_load_demo_data() to authenticated;

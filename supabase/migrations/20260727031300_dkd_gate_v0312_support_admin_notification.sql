-- DraBornGate v0.3.12 support request admin notification
create or replace function public.dkd_gate_create_support_request(
  dkd_param_full_name text,
  dkd_param_email text,
  dkd_param_plate text,
  dkd_param_support_type text,
  dkd_param_details text,
  dkd_param_app_version text default '0.3.12',
  dkd_param_android_version_code integer default 2,
  dkd_param_device_info jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  dkd_user_id uuid:=auth.uid();
  dkd_request_id uuid;
begin
  if dkd_user_id is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(dkd_param_full_name,'')))<2 then raise exception 'Ad soyad gerekli'; end if;
  if trim(coalesce(dkd_param_email,'')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Geçerli e-posta adresi gerekli'; end if;
  if length(trim(coalesce(dkd_param_details,'')))<10 then raise exception 'Destek açıklaması en az 10 karakter olmalı'; end if;

  insert into draborngate.dkd_gate_support_requests(
    user_id,full_name,email,plate,support_type,details,app_version,android_version_code,device_info
  ) values(
    dkd_user_id,left(trim(dkd_param_full_name),120),left(lower(trim(dkd_param_email)),254),
    nullif(left(upper(trim(coalesce(dkd_param_plate,''))),24),''),
    left(coalesce(nullif(trim(dkd_param_support_type),''),'Uygulama hatası'),80),
    left(trim(dkd_param_details),4000),left(coalesce(nullif(trim(dkd_param_app_version),''),'0.3.12'),24),
    coalesce(dkd_param_android_version_code,2),coalesce(dkd_param_device_info,'{}'::jsonb)
  ) returning id into dkd_request_id;

  perform draborngate.dkd_gate_insert_user_notification(
    dkd_user_id,'support_request_sent','Destek talebin gönderildi',
    'Talebin DraBornGate destek ekibine ulaştı.',jsonb_build_object('support_request_id',dkd_request_id)
  );

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  select dkd_profile.user_id,'support_request_received','Yeni destek talebi geldi',
    left(trim(dkd_param_full_name)||' • '||coalesce(nullif(trim(dkd_param_support_type),''),'Uygulama hatası'),400),
    jsonb_build_object('support_request_id',dkd_request_id,'source_user_id',dkd_user_id,'support_type',dkd_param_support_type)
  from draborngate.dkd_gate_profiles dkd_profile
  where dkd_profile.user_id<>dkd_user_id
    and draborngate.dkd_gate_is_admin_user(dkd_profile.user_id);

  return dkd_request_id;
end;
$$;

grant execute on function public.dkd_gate_create_support_request(text,text,text,text,text,text,integer,jsonb) to authenticated;

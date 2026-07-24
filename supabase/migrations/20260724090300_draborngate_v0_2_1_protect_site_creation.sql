create or replace function public.dkd_gate_create_site(
  p_name text,
  p_address text,
  p_city text,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns uuid
language plpgsql
security definer
set search_path to 'draborngate', 'public', 'auth'
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  v_approved boolean;
begin
  if uid is null then raise exception 'Oturum gerekli'; end if;

  select exists(
    select 1
    from draborngate.dkd_gate_management_applications a
    where a.user_id = uid and a.status = 'approved'
  ) into v_approved;

  if not draborngate.dkd_gate_is_admin_user(uid) and not v_approved then
    raise exception 'Site oluşturmak için onaylı Site Yönetimi hesabı gerekli';
  end if;
  if coalesce(trim(p_name),'')='' then raise exception 'Site adı gerekli'; end if;

  insert into draborngate.dkd_gate_sites(
    owner_user_id,name,address,city,gate_names,latitude,longitude
  ) values(
    uid,trim(p_name),nullif(trim(p_address),''),nullif(trim(p_city),''),
    array[]::text[],p_latitude,p_longitude
  ) returning id into sid;

  insert into draborngate.dkd_gate_site_memberships(site_id,user_id,role)
  values(sid,uid,'owner')
  on conflict(site_id,user_id,role) do update set is_active=true,updated_at=now();

  update draborngate.dkd_gate_profiles
  set preferred_role='management',updated_at=now()
  where user_id=uid;

  return sid;
end;
$$;

revoke all on function public.dkd_gate_create_site(text,text,text,numeric,numeric) from public, anon;
grant execute on function public.dkd_gate_create_site(text,text,text,numeric,numeric) to authenticated;

begin;

create or replace function draborngate.dkd_gate_available_roles_for_user(p_user_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
declare
  v_roles text[] := array['courier']::text[];
begin
  if p_user_id is null then
    return array[]::text[];
  end if;

  if draborngate.dkd_gate_is_admin_user(p_user_id) then
    return array['courier','security','management','resident']::text[];
  end if;

  if exists (
    select 1
    from draborngate.dkd_gate_site_memberships m
    join draborngate.dkd_gate_sites s on s.id = m.site_id
    where m.user_id = p_user_id
      and m.is_active
      and s.is_active
      and m.role = 'security'
  ) then
    v_roles := array_append(v_roles, 'security');
  end if;

  if exists (
    select 1
    from draborngate.dkd_gate_site_memberships m
    join draborngate.dkd_gate_sites s on s.id = m.site_id
    where m.user_id = p_user_id
      and m.is_active
      and s.is_active
      and m.role in ('owner','manager')
  ) or exists (
    select 1
    from draborngate.dkd_gate_management_applications a
    where a.user_id = p_user_id
      and a.status = 'approved'
  ) then
    v_roles := array_append(v_roles, 'management');
  end if;

  if exists (
    select 1
    from draborngate.dkd_gate_site_memberships m
    join draborngate.dkd_gate_sites s on s.id = m.site_id
    where m.user_id = p_user_id
      and m.is_active
      and s.is_active
      and m.role = 'resident'
  ) or exists (
    select 1
    from draborngate.dkd_gate_resident_profiles r
    join draborngate.dkd_gate_sites s on s.id = r.site_id
    where r.user_id = p_user_id
      and r.is_active
      and s.is_active
  ) then
    v_roles := array_append(v_roles, 'resident');
  end if;

  return v_roles;
end;
$$;

create or replace function public.dkd_gate_get_my_available_roles()
returns jsonb
language sql
stable
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
  select to_jsonb(draborngate.dkd_gate_available_roles_for_user(auth.uid()));
$$;

create or replace function public.dkd_gate_set_preferred_role(p_role text)
returns void
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_roles text[];
begin
  if v_uid is null then
    raise exception 'Oturum gerekli';
  end if;

  v_roles := draborngate.dkd_gate_available_roles_for_user(v_uid);
  if not (p_role = any(v_roles)) then
    raise exception 'Bu role erişim yetkin yok';
  end if;

  insert into draborngate.dkd_gate_profiles(user_id, full_name, preferred_role)
  values (
    v_uid,
    coalesce(
      (select nullif(trim(raw_user_meta_data->>'full_name'),'') from auth.users where id = v_uid),
      'DraBornGate Kullanıcısı'
    ),
    p_role
  )
  on conflict(user_id) do update set
    preferred_role = excluded.preferred_role,
    updated_at = now();
end;
$$;

create or replace function public.dkd_gate_update_profile(
  p_full_name text,
  p_phone text,
  p_preferred_role text,
  p_platform text default 'DraBornGo',
  p_plate text default '',
  p_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_roles text[];
  v_platform text;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if coalesce(trim(p_full_name),'') = '' then raise exception 'Ad soyad gerekli'; end if;

  v_roles := draborngate.dkd_gate_available_roles_for_user(v_uid);
  if not (p_preferred_role = any(v_roles)) then
    raise exception 'Bu role erişim yetkin yok';
  end if;

  v_platform := case
    when trim(coalesce(p_platform,'')) = 'Trendyol/Uber Eats' then 'Trendyol Go'
    when trim(coalesce(p_platform,'')) in ('DraBornGo','Trendyol Go','Yemeksepeti','Getir','Diğer') then trim(p_platform)
    else 'DraBornGo'
  end;

  insert into draborngate.dkd_gate_profiles(user_id,full_name,phone,preferred_role,avatar_url)
  values(v_uid,trim(p_full_name),nullif(trim(p_phone),''),p_preferred_role,nullif(trim(p_avatar_url),''))
  on conflict(user_id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    preferred_role = excluded.preferred_role,
    avatar_url = coalesce(excluded.avatar_url,draborngate.dkd_gate_profiles.avatar_url),
    updated_at = now();

  if p_preferred_role = 'courier' or coalesce(trim(p_plate),'') <> '' then
    insert into draborngate.dkd_gate_courier_profiles(user_id,platform,plate,avatar_url)
    values(v_uid,v_platform,coalesce(trim(p_plate),''),nullif(trim(p_avatar_url),''))
    on conflict(user_id) do update set
      platform = excluded.platform,
      plate = excluded.plate,
      avatar_url = coalesce(excluded.avatar_url,draborngate.dkd_gate_courier_profiles.avatar_url),
      updated_at = now();
  end if;
end;
$$;

create or replace function public.dkd_gate_set_avatar(p_avatar_url text)
returns void
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if coalesce(trim(p_avatar_url),'') = '' then raise exception 'Profil fotoğrafı yolu gerekli'; end if;

  update draborngate.dkd_gate_profiles
  set avatar_url = trim(p_avatar_url), updated_at = now()
  where user_id = auth.uid();

  update draborngate.dkd_gate_courier_profiles
  set avatar_url = trim(p_avatar_url), updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.dkd_gate_update_site(
  p_site_id uuid,
  p_name text,
  p_address text,
  p_city text,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
declare
  v_site_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not draborngate.dkd_gate_is_admin_user(auth.uid())
     and not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid()) then
    raise exception 'Site düzenleme yetkisi gerekli';
  end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Site adı gerekli'; end if;
  if coalesce(trim(p_address),'') = '' then raise exception 'Site adresi gerekli'; end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'Geçersiz enlem'; end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'Geçersiz boylam'; end if;

  update draborngate.dkd_gate_sites
  set name = trim(p_name),
      address = trim(p_address),
      city = nullif(trim(p_city),''),
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_site_id
  returning id into v_site_id;

  if v_site_id is null then raise exception 'Site bulunamadı'; end if;
  return v_site_id;
end;
$$;

create or replace function public.dkd_gate_admin_delete_management_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Admin yetkisi gerekli';
  end if;
  delete from draborngate.dkd_gate_management_applications
  where id = p_application_id;
end;
$$;

create or replace function public.dkd_gate_admin_clear_reviewed_management_applications()
returns integer
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
declare
  v_count integer;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Admin yetkisi gerekli';
  end if;
  delete from draborngate.dkd_gate_management_applications
  where status in ('approved','rejected');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.dkd_gate_admin_list_sites()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
declare
  v_result jsonb;
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',s.id,
        'name',s.name,
        'address',s.address,
        'city',s.city,
        'latitude',s.latitude,
        'longitude',s.longitude,
        'is_active',s.is_active,
        'is_demo',s.is_demo,
        'owner_user_id',s.owner_user_id,
        'owner_email',u.email,
        'owner_name',coalesce(nullif(p.full_name,''),split_part(coalesce(u.email,''),'@',1)),
        'created_at',s.created_at,
        'updated_at',s.updated_at
      )
      order by s.is_active desc,s.created_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from draborngate.dkd_gate_sites s
  join auth.users u on u.id = s.owner_user_id
  left join draborngate.dkd_gate_profiles p on p.user_id = s.owner_user_id
  where not s.is_demo;

  return v_result;
end;
$$;

create or replace function public.dkd_gate_admin_set_site_active(p_site_id uuid,p_active boolean)
returns void
language plpgsql
security definer
set search_path = 'draborngate', 'public', 'auth'
as $$
begin
  if not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Admin yetkisi gerekli';
  end if;

  update draborngate.dkd_gate_sites
  set is_active = p_active, updated_at = now()
  where id = p_site_id and not is_demo;
  if not found then raise exception 'Site bulunamadı'; end if;

  update draborngate.dkd_gate_site_gates
  set is_active = p_active, updated_at = now()
  where site_id = p_site_id and not is_demo;
end;
$$;

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes)
values(
  '0.3.1',
  1,
  '0.3.1',
  'Kayıt ve profil fotoğrafı, yetkili rol geçişi, otomatik site düzenleme, harita pini, tarih seçici ve Admin temizlik/site yönetimi düzeltmeleri.'
)
on conflict(version) do update set
  android_version_code = excluded.android_version_code,
  demo_data_version = excluded.demo_data_version,
  notes = excluded.notes,
  released_at = now();

insert into draborngate.dkd_gate_schema_migrations(version,description)
values('0.3.1','DraBornGate v0.3.1 rol, site, başvuru ve yönetim düzeltmeleri')
on conflict(version) do update set
  description = excluded.description,
  applied_at = now();

revoke all on function public.dkd_gate_get_my_available_roles() from public;
revoke all on function public.dkd_gate_set_preferred_role(text) from public;
revoke all on function public.dkd_gate_set_avatar(text) from public;
revoke all on function public.dkd_gate_update_site(uuid,text,text,text,numeric,numeric) from public;
revoke all on function public.dkd_gate_admin_delete_management_application(uuid) from public;
revoke all on function public.dkd_gate_admin_clear_reviewed_management_applications() from public;
revoke all on function public.dkd_gate_admin_list_sites() from public;
revoke all on function public.dkd_gate_admin_set_site_active(uuid,boolean) from public;

grant execute on function public.dkd_gate_get_my_available_roles() to authenticated;
grant execute on function public.dkd_gate_set_preferred_role(text) to authenticated;
grant execute on function public.dkd_gate_set_avatar(text) to authenticated;
grant execute on function public.dkd_gate_update_site(uuid,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.dkd_gate_admin_delete_management_application(uuid) to authenticated;
grant execute on function public.dkd_gate_admin_clear_reviewed_management_applications() to authenticated;
grant execute on function public.dkd_gate_admin_list_sites() to authenticated;
grant execute on function public.dkd_gate_admin_set_site_active(uuid,boolean) to authenticated;

commit;

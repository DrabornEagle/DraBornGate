create table if not exists draborngate.dkd_gate_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table draborngate.dkd_gate_admins enable row level security;

create table if not exists draborngate.dkd_gate_management_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  site_name text not null,
  site_address text not null,
  city text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table draborngate.dkd_gate_management_applications enable row level security;

create index if not exists dkd_gate_management_applications_status_idx
  on draborngate.dkd_gate_management_applications(status, created_at desc);

create or replace function draborngate.dkd_gate_is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select p_user_id is not null
    and exists (
      select 1
      from draborngate.dkd_gate_admins a
      where a.user_id = p_user_id
    );
$$;

create or replace function public.dkd_gate_is_admin()
returns boolean
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select draborngate.dkd_gate_is_admin_user(auth.uid());
$$;

insert into draborngate.dkd_gate_admins(user_id)
select id
from auth.users
where lower(email) = 'draborneagle@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.dkd_gate_submit_management_application(
  p_full_name text,
  p_phone text,
  p_site_name text,
  p_site_address text,
  p_city text
)
returns uuid
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_application_id uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Ad soyad gerekli'; end if;
  if coalesce(trim(p_site_name), '') = '' then raise exception 'Site adı gerekli'; end if;
  if coalesce(trim(p_site_address), '') = '' then raise exception 'Site adresi gerekli'; end if;
  if coalesce(trim(p_city), '') = '' then raise exception 'Şehir gerekli'; end if;

  insert into draborngate.dkd_gate_profiles(user_id, full_name, phone, preferred_role)
  values (v_uid, trim(p_full_name), nullif(trim(p_phone), ''), 'management')
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    preferred_role = 'management',
    updated_at = now();

  insert into draborngate.dkd_gate_management_applications(
    user_id, full_name, phone, site_name, site_address, city, status,
    admin_note, reviewed_by, reviewed_at
  )
  values (
    v_uid, trim(p_full_name), nullif(trim(p_phone), ''), trim(p_site_name),
    trim(p_site_address), trim(p_city), 'pending', null, null, null
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    site_name = excluded.site_name,
    site_address = excluded.site_address,
    city = excluded.city,
    status = case
      when draborngate.dkd_gate_management_applications.status = 'approved' then 'approved'
      else 'pending'
    end,
    admin_note = case
      when draborngate.dkd_gate_management_applications.status = 'approved'
        then draborngate.dkd_gate_management_applications.admin_note
      else null
    end,
    reviewed_by = case
      when draborngate.dkd_gate_management_applications.status = 'approved'
        then draborngate.dkd_gate_management_applications.reviewed_by
      else null
    end,
    reviewed_at = case
      when draborngate.dkd_gate_management_applications.status = 'approved'
        then draborngate.dkd_gate_management_applications.reviewed_at
      else null
    end,
    updated_at = now()
  returning id into v_application_id;

  return v_application_id;
end;
$$;

create or replace function public.dkd_gate_get_my_management_application()
returns jsonb
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select (
    select to_jsonb(a)
    from draborngate.dkd_gate_management_applications a
    where a.user_id = auth.uid()
  );
$$;

create or replace function public.dkd_gate_admin_list_management_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path = draborngate, public, auth
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
        'id', a.id,
        'user_id', a.user_id,
        'email', u.email,
        'full_name', a.full_name,
        'phone', a.phone,
        'site_name', a.site_name,
        'site_address', a.site_address,
        'city', a.city,
        'status', a.status,
        'admin_note', a.admin_note,
        'created_at', a.created_at,
        'reviewed_at', a.reviewed_at
      )
      order by case a.status when 'pending' then 0 when 'approved' then 1 else 2 end,
               a.created_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from draborngate.dkd_gate_management_applications a
  join auth.users u on u.id = a.user_id;

  return v_result;
end;
$$;

create or replace function public.dkd_gate_admin_decide_management_application(
  p_application_id uuid,
  p_status text,
  p_admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_admin_uid uuid := auth.uid();
  v_application draborngate.dkd_gate_management_applications%rowtype;
  v_site_id uuid;
begin
  if not draborngate.dkd_gate_is_admin_user(v_admin_uid) then
    raise exception 'Admin yetkisi gerekli';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Geçersiz karar';
  end if;

  select * into v_application
  from draborngate.dkd_gate_management_applications
  where id = p_application_id
  for update;

  if v_application.id is null then raise exception 'Başvuru bulunamadı'; end if;

  update draborngate.dkd_gate_management_applications
  set status = p_status,
      admin_note = nullif(trim(p_admin_note), ''),
      reviewed_by = v_admin_uid,
      reviewed_at = now(),
      updated_at = now()
  where id = p_application_id;

  if p_status = 'approved' then
    update draborngate.dkd_gate_profiles
    set full_name = v_application.full_name,
        phone = v_application.phone,
        preferred_role = 'management',
        updated_at = now()
    where user_id = v_application.user_id;

    select s.id into v_site_id
    from draborngate.dkd_gate_sites s
    where s.owner_user_id = v_application.user_id and not s.is_demo
    order by s.created_at
    limit 1;

    if v_site_id is null then
      insert into draborngate.dkd_gate_sites(
        owner_user_id, name, address, city, gate_names, is_active
      ) values (
        v_application.user_id, v_application.site_name, v_application.site_address,
        v_application.city, array[]::text[], true
      ) returning id into v_site_id;
    else
      update draborngate.dkd_gate_sites
      set name = v_application.site_name,
          address = v_application.site_address,
          city = v_application.city,
          is_active = true,
          updated_at = now()
      where id = v_site_id;
    end if;

    insert into draborngate.dkd_gate_site_memberships(site_id, user_id, role)
    values (v_site_id, v_application.user_id, 'owner')
    on conflict (site_id, user_id, role) do update set is_active = true, updated_at = now();

    insert into draborngate.dkd_gate_notifications(user_id, kind, title, body, data)
    values (
      v_application.user_id,
      'management_application_approved',
      'Site Yönetim Panelin açıldı',
      'Başvurun onaylandı. Güvenlik personelini ve site sakinlerini yönetim panelinden ekleyebilirsin.',
      jsonb_build_object('application_id', p_application_id, 'site_id', v_site_id)
    );
  else
    insert into draborngate.dkd_gate_notifications(user_id, kind, title, body, data)
    values (
      v_application.user_id,
      'management_application_rejected',
      'Site Yönetimi başvurun incelendi',
      coalesce(nullif(trim(p_admin_note), ''), 'Başvurun onaylanmadı. Bilgilerini kontrol ederek yeniden başvurabilirsin.'),
      jsonb_build_object('application_id', p_application_id)
    );
  end if;

  return coalesce(v_site_id, p_application_id);
end;
$$;

create or replace function public.dkd_gate_list_site_members(p_site_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_result jsonb;
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id, auth.uid()) then
    raise exception 'Yönetim yetkisi gerekli';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'site_id', m.site_id,
        'user_id', m.user_id,
        'email', u.email,
        'full_name', coalesce(nullif(p.full_name, ''), split_part(coalesce(u.email, ''), '@', 1)),
        'phone', p.phone,
        'role', m.role,
        'block', m.block,
        'floor', m.floor,
        'apartment', m.apartment,
        'is_active', m.is_active,
        'created_at', m.created_at
      )
      order by case m.role when 'owner' then 0 when 'manager' then 1 when 'security' then 2 else 3 end,
               coalesce(p.full_name, u.email)
    ),
    '[]'::jsonb
  ) into v_result
  from draborngate.dkd_gate_site_memberships m
  join auth.users u on u.id = m.user_id
  left join draborngate.dkd_gate_profiles p on p.user_id = m.user_id
  where m.site_id = p_site_id and m.is_active;

  return v_result;
end;
$$;

create or replace function public.dkd_gate_update_site_member(
  p_membership_id uuid,
  p_role text,
  p_block text default null,
  p_floor text default null,
  p_apartment text default null
)
returns void
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_membership draborngate.dkd_gate_site_memberships%rowtype;
begin
  select * into v_membership
  from draborngate.dkd_gate_site_memberships
  where id = p_membership_id
  for update;

  if v_membership.id is null
     or not draborngate.dkd_gate_is_site_manager(v_membership.site_id, auth.uid()) then
    raise exception 'Yönetim yetkisi gerekli';
  end if;
  if v_membership.role = 'owner' then raise exception 'Site sahibinin rolü değiştirilemez'; end if;
  if p_role not in ('manager', 'security', 'resident') then raise exception 'Geçersiz üyelik rolü'; end if;

  update draborngate.dkd_gate_site_memberships
  set role = p_role,
      block = case when p_role = 'resident' then nullif(trim(p_block), '') else null end,
      floor = case when p_role = 'resident' then nullif(trim(p_floor), '') else null end,
      apartment = case when p_role = 'resident' then nullif(trim(p_apartment), '') else null end,
      is_active = true,
      updated_at = now()
  where id = p_membership_id;

  update draborngate.dkd_gate_profiles
  set preferred_role = case p_role
    when 'manager' then 'management'
    when 'security' then 'security'
    else 'resident'
  end,
  updated_at = now()
  where user_id = v_membership.user_id;

  if p_role = 'resident' then
    if coalesce(trim(p_block), '') = ''
       or coalesce(trim(p_floor), '') = ''
       or coalesce(trim(p_apartment), '') = '' then
      raise exception 'Site sakini için blok, kat ve daire gerekli';
    end if;

    insert into draborngate.dkd_gate_resident_profiles(
      user_id, site_id, block, floor, apartment
    ) values (
      v_membership.user_id, v_membership.site_id,
      trim(p_block), trim(p_floor), trim(p_apartment)
    )
    on conflict (user_id, site_id, block, apartment) do update set
      floor = excluded.floor,
      is_active = true,
      updated_at = now();
  else
    update draborngate.dkd_gate_resident_profiles
    set is_active = false, updated_at = now()
    where user_id = v_membership.user_id and site_id = v_membership.site_id;
  end if;
end;
$$;

create or replace function draborngate.dkd_gate_handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_source text := coalesce(new.raw_user_meta_data->>'source_app', '');
  v_signup_role text := coalesce(new.raw_user_meta_data->>'signup_role', 'courier');
begin
  insert into draborngate.dkd_gate_profiles(user_id, full_name, phone, preferred_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), ''),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    case when v_source = 'DraBornGate' and v_signup_role = 'management' then 'management' else 'courier' end
  )
  on conflict (user_id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), draborngate.dkd_gate_profiles.full_name),
    phone = coalesce(excluded.phone, draborngate.dkd_gate_profiles.phone),
    preferred_role = case
      when v_source = 'DraBornGate' and v_signup_role = 'management' then 'management'
      else draborngate.dkd_gate_profiles.preferred_role
    end,
    updated_at = now();

  insert into draborngate.dkd_gate_courier_profiles(user_id, platform, plate)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'delivery_platform', ''), 'DraBornGo'),
    coalesce(new.raw_user_meta_data->>'motorcycle_plate', '')
  )
  on conflict (user_id) do update set
    platform = case
      when v_source = 'DraBornGate' and v_signup_role = 'courier' then excluded.platform
      else draborngate.dkd_gate_courier_profiles.platform
    end,
    plate = case
      when v_source = 'DraBornGate' and v_signup_role = 'courier' then excluded.plate
      else draborngate.dkd_gate_courier_profiles.plate
    end,
    updated_at = now();

  insert into draborngate.dkd_gate_user_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if v_source = 'DraBornGate' and v_signup_role = 'management' then
    insert into draborngate.dkd_gate_management_applications(
      user_id, full_name, phone, site_name, site_address, city, status
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), 'Site Yöneticisi'),
      nullif(coalesce(new.phone, new.raw_user_meta_data->>'phone'), ''),
      coalesce(nullif(trim(new.raw_user_meta_data->>'site_name'), ''), 'Yeni Site'),
      coalesce(nullif(trim(new.raw_user_meta_data->>'site_address'), ''), 'Adres bilgisi bekleniyor'),
      coalesce(nullif(trim(new.raw_user_meta_data->>'city'), ''), 'Belirtilmedi'),
      'pending'
    )
    on conflict (user_id) do update set
      full_name = excluded.full_name,
      phone = excluded.phone,
      site_name = excluded.site_name,
      site_address = excluded.site_address,
      city = excluded.city,
      status = case
        when draborngate.dkd_gate_management_applications.status = 'approved' then 'approved'
        else 'pending'
      end,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists dkd_gate_management_applications_updated_at
  on draborngate.dkd_gate_management_applications;
create trigger dkd_gate_management_applications_updated_at
before update on draborngate.dkd_gate_management_applications
for each row execute function draborngate.dkd_gate_set_updated_at();

insert into draborngate.dkd_gate_management_applications(
  user_id, full_name, phone, site_name, site_address, city, status,
  admin_note, reviewed_by, reviewed_at
)
select distinct on (s.owner_user_id)
  s.owner_user_id,
  coalesce(nullif(p.full_name, ''), split_part(coalesce(u.email, ''), '@', 1), 'Site Yöneticisi'),
  p.phone,
  s.name,
  coalesce(s.address, 'Adres bilgisi yok'),
  coalesce(s.city, 'Belirtilmedi'),
  'approved',
  'Mevcut site sahibi v0.2.1 geçişinde onaylı olarak aktarıldı.',
  (select a.user_id from draborngate.dkd_gate_admins a order by a.created_at limit 1),
  now()
from draborngate.dkd_gate_sites s
join auth.users u on u.id = s.owner_user_id
left join draborngate.dkd_gate_profiles p on p.user_id = s.owner_user_id
where not s.is_demo
order by s.owner_user_id, s.created_at
on conflict (user_id) do update set
  status = 'approved',
  reviewed_at = coalesce(draborngate.dkd_gate_management_applications.reviewed_at, now()),
  updated_at = now();

insert into draborngate.dkd_gate_app_releases(
  version, android_version_code, demo_data_version, notes, released_at
)
values (
  '0.2.1', 1, '0.2.1',
  'Kayıtta Kurye/Site Yönetimi seçimi, Admin onaylı yönetim paneli, Admin özel araçlar, üye düzenleme ve Türkçe arayüz iyileştirmeleri.',
  now()
)
on conflict (version) do update set
  android_version_code = excluded.android_version_code,
  demo_data_version = excluded.demo_data_version,
  notes = excluded.notes,
  released_at = excluded.released_at;

revoke all on function draborngate.dkd_gate_is_admin_user(uuid) from public;
revoke all on function public.dkd_gate_is_admin() from public, anon;
revoke all on function public.dkd_gate_submit_management_application(text, text, text, text, text) from public, anon;
revoke all on function public.dkd_gate_get_my_management_application() from public, anon;
revoke all on function public.dkd_gate_admin_list_management_applications() from public, anon;
revoke all on function public.dkd_gate_admin_decide_management_application(uuid, text, text) from public, anon;
revoke all on function public.dkd_gate_list_site_members(uuid) from public, anon;
revoke all on function public.dkd_gate_update_site_member(uuid, text, text, text, text) from public, anon;

grant execute on function public.dkd_gate_is_admin() to authenticated;
grant execute on function public.dkd_gate_submit_management_application(text, text, text, text, text) to authenticated;
grant execute on function public.dkd_gate_get_my_management_application() to authenticated;
grant execute on function public.dkd_gate_admin_list_management_applications() to authenticated;
grant execute on function public.dkd_gate_admin_decide_management_application(uuid, text, text) to authenticated;
grant execute on function public.dkd_gate_list_site_members(uuid) to authenticated;
grant execute on function public.dkd_gate_update_site_member(uuid, text, text, text, text) to authenticated;

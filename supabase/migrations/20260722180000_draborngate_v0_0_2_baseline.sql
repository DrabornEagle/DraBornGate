-- DraBornGate v0.0.2 baseline
-- Shared identity: auth.users
-- Isolated product data: draborngate.dkd_gate_*
-- The hardened production RPC/RLS migrations are listed in supabase/README.md.

create schema if not exists draborngate;
comment on schema draborngate is 'DraBornGate isolated application schema';
grant usage on schema draborngate to authenticated, service_role;

create table if not exists draborngate.dkd_gate_schema_migrations (
  version text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  preferred_role text not null default 'courier' check (preferred_role in ('courier','security','management')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_courier_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform text not null default 'DraBornGo',
  plate text not null default '',
  rating numeric(3,2) not null default 5.00 check (rating between 0 and 5),
  completed_today integer not null default 0 check (completed_today >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_sites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  city text,
  gate_names text[] not null default array['A Kapısı']::text[],
  is_active boolean not null default true,
  is_demo boolean not null default false,
  demo_owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_site_memberships (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references draborngate.dkd_gate_sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','security','resident')),
  block text,
  apartment text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  demo_owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, user_id, role)
);
create table if not exists draborngate.dkd_gate_courier_passes (
  id uuid primary key default gen_random_uuid(),
  courier_user_id uuid references auth.users(id) on delete cascade,
  site_id uuid not null references draborngate.dkd_gate_sites(id) on delete cascade,
  courier_name text not null,
  courier_phone text,
  courier_plate text,
  platform text not null default 'DraBornGo',
  gate text not null,
  block text not null,
  apartment text not null,
  order_number text not null,
  note text not null default '',
  screenshot_path text,
  status text not null default 'waiting' check (status in ('waiting','approved','rejected','arrived','completed')),
  eta_minutes integer not null default 6 check (eta_minutes >= 0),
  approval_code text,
  rejection_reason text,
  is_demo boolean not null default false,
  demo_owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_pass_events (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references draborngate.dkd_gate_courier_passes(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  title text not null,
  detail text not null default '',
  tone text not null default 'cyan' check (tone in ('cyan','purple','green','orange','red')),
  icon text not null default 'navigate',
  is_demo boolean not null default false,
  demo_owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  demo_data_version text,
  demo_loaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists draborngate.dkd_gate_app_releases (
  version text primary key,
  android_version_code integer not null default 1,
  demo_data_version text not null,
  notes text not null default '',
  released_at timestamptz not null default now()
);

alter table draborngate.dkd_gate_profiles enable row level security;
alter table draborngate.dkd_gate_courier_profiles enable row level security;
alter table draborngate.dkd_gate_sites enable row level security;
alter table draborngate.dkd_gate_site_memberships enable row level security;
alter table draborngate.dkd_gate_courier_passes enable row level security;
alter table draborngate.dkd_gate_pass_events enable row level security;
alter table draborngate.dkd_gate_user_settings enable row level security;
alter table draborngate.dkd_gate_app_releases enable row level security;

insert into draborngate.dkd_gate_schema_migrations(version, description)
values ('0.0.2', 'Isolated schema baseline; hardened RLS/RPC definitions are applied by production migrations')
on conflict (version) do update set description = excluded.description, applied_at = now();
insert into draborngate.dkd_gate_app_releases(version, android_version_code, demo_data_version, notes)
values ('0.0.2', 1, '0.0.2', 'Shared DraBornGo authentication; isolated Gate data; opt-in versioned demo data.')
on conflict (version) do update set android_version_code = 1, demo_data_version = '0.0.2', notes = excluded.notes, released_at = now();

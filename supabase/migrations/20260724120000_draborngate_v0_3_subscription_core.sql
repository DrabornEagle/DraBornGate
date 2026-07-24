create table if not exists draborngate.dkd_gate_subscription_plans (
  code text primary key,
  name text not null,
  description text not null default '',
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  yearly_price numeric(12,2) not null default 0 check (yearly_price >= 0),
  currency text not null default 'TRY',
  site_limit integer not null default 1 check (site_limit >= 0),
  gate_limit integer not null default 1 check (gate_limit >= 0),
  staff_limit integer not null default 3 check (staff_limit >= 0),
  resident_limit integer not null default 30 check (resident_limit >= 0),
  monthly_courier_pass_limit integer not null default 100 check (monthly_courier_pass_limit >= 0),
  monthly_visitor_pass_limit integer not null default 50 check (monthly_visitor_pass_limit >= 0),
  report_days_limit integer not null default 30 check (report_days_limit >= 1),
  allow_export boolean not null default false,
  advanced_finance boolean not null default false,
  priority_support boolean not null default false,
  custom_branding boolean not null default false,
  trial_days integer not null default 0 check (trial_days >= 0),
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_site_subscriptions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null unique references draborngate.dkd_gate_sites(id) on delete cascade,
  plan_code text not null references draborngate.dkd_gate_subscription_plans(code),
  status text not null default 'free' check (status in ('free','trialing','active','past_due','cancelled','expired')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  source text not null default 'system' check (source in ('system','trial','payment','admin','demo')),
  approved_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_trial_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  site_id uuid references draborngate.dkd_gate_sites(id) on delete set null,
  plan_code text not null references draborngate.dkd_gate_subscription_plans(code),
  claimed_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_subscription_payment_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references draborngate.dkd_gate_sites(id) on delete cascade,
  plan_code text not null references draborngate.dkd_gate_subscription_plans(code),
  requested_by uuid not null references auth.users(id) on delete cascade,
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  bank_reference text,
  receipt_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  payment_request_id uuid not null unique references draborngate.dkd_gate_subscription_payment_requests(id) on delete restrict,
  site_id uuid not null references draborngate.dkd_gate_sites(id) on delete restrict,
  plan_code text not null references draborngate.dkd_gate_subscription_plans(code),
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  status text not null default 'paid' check (status in ('paid','cancelled')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_billing_settings (
  singleton boolean primary key default true check (singleton),
  bank_name text,
  account_holder text,
  iban text,
  instructions text,
  is_active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_report_exports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references draborngate.dkd_gate_sites(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  report_type text not null default 'operations',
  date_from date not null,
  date_to date not null,
  format text not null default 'csv' check (format in ('csv')),
  row_count integer not null default 0,
  status text not null default 'created' check (status in ('created','shared','failed')),
  created_at timestamptz not null default now()
);

create table if not exists draborngate.dkd_gate_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  site_id uuid references draborngate.dkd_gate_sites(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table draborngate.dkd_gate_subscription_plans enable row level security;
alter table draborngate.dkd_gate_site_subscriptions enable row level security;
alter table draborngate.dkd_gate_trial_claims enable row level security;
alter table draborngate.dkd_gate_subscription_payment_requests enable row level security;
alter table draborngate.dkd_gate_subscription_invoices enable row level security;
alter table draborngate.dkd_gate_billing_settings enable row level security;
alter table draborngate.dkd_gate_report_exports enable row level security;
alter table draborngate.dkd_gate_audit_logs enable row level security;

create index if not exists dkd_gate_site_subscriptions_status_idx
  on draborngate.dkd_gate_site_subscriptions(status, current_period_end, trial_ends_at);
create index if not exists dkd_gate_subscription_payments_status_idx
  on draborngate.dkd_gate_subscription_payment_requests(status, created_at desc);
create index if not exists dkd_gate_subscription_payments_site_idx
  on draborngate.dkd_gate_subscription_payment_requests(site_id, created_at desc);
create index if not exists dkd_gate_report_exports_site_idx
  on draborngate.dkd_gate_report_exports(site_id, created_at desc);
create index if not exists dkd_gate_audit_logs_site_idx
  on draborngate.dkd_gate_audit_logs(site_id, created_at desc);

insert into draborngate.dkd_gate_subscription_plans(
  code,name,description,monthly_price,yearly_price,currency,
  site_limit,gate_limit,staff_limit,resident_limit,
  monthly_courier_pass_limit,monthly_visitor_pass_limit,report_days_limit,
  allow_export,advanced_finance,priority_support,custom_branding,trial_days,
  is_public,is_active,sort_order
) values
  ('starter','Başlangıç','Küçük apartmanlar ve sistemi denemek isteyen yönetimler için ücretsiz temel paket.',0,0,'TRY',1,1,3,30,100,50,30,false,false,false,false,0,true,true,10),
  ('professional','Profesyonel','Tek site için gelişmiş raporlama, yüksek kullanım limitleri, finans analizi ve CSV dışa aktarma.',999,9990,'TRY',1,5,20,500,5000,3000,365,true,true,false,false,14,true,true,20),
  ('corporate','Kurumsal','Birden fazla site, geniş ekip, sınırsız geçiş, öncelikli destek ve kurumsal kullanım.',2499,24990,'TRY',5,25,100,3000,0,0,730,true,true,true,true,30,true,true,30)
on conflict (code) do update set
  name=excluded.name,
  description=excluded.description,
  monthly_price=excluded.monthly_price,
  yearly_price=excluded.yearly_price,
  currency=excluded.currency,
  site_limit=excluded.site_limit,
  gate_limit=excluded.gate_limit,
  staff_limit=excluded.staff_limit,
  resident_limit=excluded.resident_limit,
  monthly_courier_pass_limit=excluded.monthly_courier_pass_limit,
  monthly_visitor_pass_limit=excluded.monthly_visitor_pass_limit,
  report_days_limit=excluded.report_days_limit,
  allow_export=excluded.allow_export,
  advanced_finance=excluded.advanced_finance,
  priority_support=excluded.priority_support,
  custom_branding=excluded.custom_branding,
  trial_days=excluded.trial_days,
  is_public=excluded.is_public,
  is_active=excluded.is_active,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into draborngate.dkd_gate_billing_settings(singleton,is_active)
values(true,false)
on conflict (singleton) do nothing;

create or replace function draborngate.dkd_gate_effective_plan_code(p_site_id uuid)
returns text
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select coalesce((
    select s.plan_code
    from draborngate.dkd_gate_site_subscriptions s
    where s.site_id = p_site_id
      and (
        (s.status = 'active' and (s.current_period_end is null or s.current_period_end >= now()))
        or (s.status = 'trialing' and s.trial_ends_at is not null and s.trial_ends_at >= now())
        or s.status = 'free'
      )
    order by case s.status when 'active' then 0 when 'trialing' then 1 else 2 end
    limit 1
  ), 'starter');
$$;

create or replace function draborngate.dkd_gate_effective_plan(p_site_id uuid)
returns draborngate.dkd_gate_subscription_plans
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select p.*
  from draborngate.dkd_gate_subscription_plans p
  where p.code = draborngate.dkd_gate_effective_plan_code(p_site_id);
$$;

create or replace function draborngate.dkd_gate_assign_site_subscription()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_trial_days integer;
  v_claimed boolean;
begin
  if new.is_demo then
    select trial_days into v_trial_days
    from draborngate.dkd_gate_subscription_plans
    where code='professional';

    insert into draborngate.dkd_gate_site_subscriptions(
      site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
      trial_started_at,trial_ends_at,source,notes
    ) values(
      new.id,'professional','trialing','monthly',now(),now()+interval '365 days',
      now(),now()+interval '365 days','demo','v0.3 örnek Profesyonel paket'
    ) on conflict (site_id) do nothing;
    return new;
  end if;

  select exists(
    select 1 from draborngate.dkd_gate_trial_claims where user_id=new.owner_user_id
  ) into v_claimed;

  select trial_days into v_trial_days
  from draborngate.dkd_gate_subscription_plans
  where code='professional' and is_active;

  if not v_claimed and coalesce(v_trial_days,0)>0 then
    insert into draborngate.dkd_gate_site_subscriptions(
      site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
      trial_started_at,trial_ends_at,source,notes
    ) values(
      new.id,'professional','trialing','monthly',now(),now()+(v_trial_days||' days')::interval,
      now(),now()+(v_trial_days||' days')::interval,'trial','Otomatik Profesyonel deneme paketi'
    ) on conflict (site_id) do nothing;

    insert into draborngate.dkd_gate_trial_claims(user_id,site_id,plan_code)
    values(new.owner_user_id,new.id,'professional')
    on conflict (user_id) do nothing;
  else
    insert into draborngate.dkd_gate_site_subscriptions(
      site_id,plan_code,status,billing_cycle,current_period_start,source,notes
    ) values(new.id,'starter','free','monthly',now(),'system','Ücretsiz Başlangıç paketi')
    on conflict (site_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists dkd_gate_sites_assign_subscription on draborngate.dkd_gate_sites;
create trigger dkd_gate_sites_assign_subscription
after insert on draborngate.dkd_gate_sites
for each row execute function draborngate.dkd_gate_assign_site_subscription();

create or replace function draborngate.dkd_gate_enforce_site_limit()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.is_demo or draborngate.dkd_gate_is_admin_user(new.owner_user_id) then return new; end if;

  select coalesce(max(p.site_limit),1) into v_limit
  from draborngate.dkd_gate_sites s
  join draborngate.dkd_gate_subscription_plans p
    on p.code=draborngate.dkd_gate_effective_plan_code(s.id)
  where s.owner_user_id=new.owner_user_id and s.is_active and not s.is_demo;

  select count(*) into v_count
  from draborngate.dkd_gate_sites s
  where s.owner_user_id=new.owner_user_id and s.is_active and not s.is_demo;

  if coalesce(v_limit,1)>0 and v_count>=coalesce(v_limit,1) then
    raise exception 'Mevcut paketiniz en fazla % siteye izin veriyor', coalesce(v_limit,1);
  end if;
  return new;
end;
$$;

drop trigger if exists dkd_gate_sites_plan_limit on draborngate.dkd_gate_sites;
create trigger dkd_gate_sites_plan_limit
before insert on draborngate.dkd_gate_sites
for each row execute function draborngate.dkd_gate_enforce_site_limit();

create or replace function draborngate.dkd_gate_enforce_gate_limit()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.is_demo or draborngate.dkd_gate_is_admin_user(auth.uid()) then return new; end if;
  select gate_limit into v_limit from draborngate.dkd_gate_effective_plan(new.site_id);
  select count(*) into v_count from draborngate.dkd_gate_site_gates
    where site_id=new.site_id and is_active and not is_demo;
  if coalesce(v_limit,1)>0 and v_count>=coalesce(v_limit,1) then
    raise exception 'Mevcut paketiniz en fazla % kapıya izin veriyor', coalesce(v_limit,1);
  end if;
  return new;
end;
$$;

drop trigger if exists dkd_gate_site_gates_plan_limit on draborngate.dkd_gate_site_gates;
create trigger dkd_gate_site_gates_plan_limit
before insert on draborngate.dkd_gate_site_gates
for each row execute function draborngate.dkd_gate_enforce_gate_limit();

create or replace function draborngate.dkd_gate_enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_staff_limit integer;
  v_resident_limit integer;
  v_count integer;
begin
  if new.is_demo or draborngate.dkd_gate_is_admin_user(auth.uid()) then return new; end if;
  select staff_limit,resident_limit into v_staff_limit,v_resident_limit
  from draborngate.dkd_gate_effective_plan(new.site_id);

  if new.role in ('owner','manager','security') then
    select count(*) into v_count from draborngate.dkd_gate_site_memberships
      where site_id=new.site_id and is_active and not is_demo and role in ('owner','manager','security');
    if coalesce(v_staff_limit,3)>0 and v_count>=coalesce(v_staff_limit,3) then
      raise exception 'Mevcut paketiniz en fazla % yönetim ve güvenlik kullanıcısına izin veriyor', coalesce(v_staff_limit,3);
    end if;
  elsif new.role='resident' then
    select count(*) into v_count from draborngate.dkd_gate_site_memberships
      where site_id=new.site_id and is_active and not is_demo and role='resident';
    if coalesce(v_resident_limit,30)>0 and v_count>=coalesce(v_resident_limit,30) then
      raise exception 'Mevcut paketiniz en fazla % site sakinine izin veriyor', coalesce(v_resident_limit,30);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dkd_gate_site_memberships_plan_limit on draborngate.dkd_gate_site_memberships;
create trigger dkd_gate_site_memberships_plan_limit
before insert on draborngate.dkd_gate_site_memberships
for each row execute function draborngate.dkd_gate_enforce_member_limit();

create or replace function draborngate.dkd_gate_enforce_courier_pass_limit()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.is_demo or draborngate.dkd_gate_is_admin_user(auth.uid()) then return new; end if;
  select monthly_courier_pass_limit into v_limit
  from draborngate.dkd_gate_effective_plan(new.site_id);
  if coalesce(v_limit,100)=0 then return new; end if;
  select count(*) into v_count from draborngate.dkd_gate_courier_passes
    where site_id=new.site_id and not is_demo
      and created_at>=date_trunc('month',now())
      and created_at<date_trunc('month',now())+interval '1 month';
  if v_count>=coalesce(v_limit,100) then
    raise exception 'Bu site aylık % kurye geçişi paket limitine ulaştı', coalesce(v_limit,100);
  end if;
  return new;
end;
$$;

drop trigger if exists dkd_gate_courier_passes_plan_limit on draborngate.dkd_gate_courier_passes;
create trigger dkd_gate_courier_passes_plan_limit
before insert on draborngate.dkd_gate_courier_passes
for each row execute function draborngate.dkd_gate_enforce_courier_pass_limit();

create or replace function draborngate.dkd_gate_enforce_visitor_pass_limit()
returns trigger
language plpgsql
security definer
set search_path = draborngate, public, auth
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.is_demo or draborngate.dkd_gate_is_admin_user(auth.uid()) then return new; end if;
  select monthly_visitor_pass_limit into v_limit
  from draborngate.dkd_gate_effective_plan(new.site_id);
  if coalesce(v_limit,50)=0 then return new; end if;
  select count(*) into v_count from draborngate.dkd_gate_visitor_passes
    where site_id=new.site_id and not is_demo
      and created_at>=date_trunc('month',now())
      and created_at<date_trunc('month',now())+interval '1 month';
  if v_count>=coalesce(v_limit,50) then
    raise exception 'Bu site aylık % ziyaretçi geçişi paket limitine ulaştı', coalesce(v_limit,50);
  end if;
  return new;
end;
$$;

drop trigger if exists dkd_gate_visitor_passes_plan_limit on draborngate.dkd_gate_visitor_passes;
create trigger dkd_gate_visitor_passes_plan_limit
before insert on draborngate.dkd_gate_visitor_passes
for each row execute function draborngate.dkd_gate_enforce_visitor_pass_limit();

create trigger dkd_gate_subscription_plans_updated_at
before update on draborngate.dkd_gate_subscription_plans
for each row execute function draborngate.dkd_gate_set_updated_at();

create trigger dkd_gate_site_subscriptions_updated_at
before update on draborngate.dkd_gate_site_subscriptions
for each row execute function draborngate.dkd_gate_set_updated_at();

create trigger dkd_gate_subscription_payment_requests_updated_at
before update on draborngate.dkd_gate_subscription_payment_requests
for each row execute function draborngate.dkd_gate_set_updated_at();

with ranked as (
  select s.id,s.owner_user_id,s.is_demo,
         row_number() over(partition by s.owner_user_id order by s.created_at,s.id) as rn
  from draborngate.dkd_gate_sites s
  where s.is_active
)
insert into draborngate.dkd_gate_site_subscriptions(
  site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
  trial_started_at,trial_ends_at,source,notes
)
select r.id,
       case when r.is_demo or r.rn=1 then 'professional' else 'starter' end,
       case when r.is_demo or r.rn=1 then 'trialing' else 'free' end,
       'monthly',now(),
       case when r.is_demo then now()+interval '365 days' when r.rn=1 then now()+interval '14 days' else null end,
       case when r.is_demo or r.rn=1 then now() else null end,
       case when r.is_demo then now()+interval '365 days' when r.rn=1 then now()+interval '14 days' else null end,
       case when r.is_demo then 'demo' when r.rn=1 then 'trial' else 'system' end,
       case when r.is_demo then 'v0.3 örnek Profesyonel paket' when r.rn=1 then 'v0.3 geçiş Profesyonel deneme paketi' else 'Ücretsiz Başlangıç paketi' end
from ranked r
on conflict (site_id) do nothing;

insert into draborngate.dkd_gate_trial_claims(user_id,site_id,plan_code)
select distinct on (s.owner_user_id) s.owner_user_id,s.id,'professional'
from draborngate.dkd_gate_sites s
join draborngate.dkd_gate_site_subscriptions sub on sub.site_id=s.id and sub.status='trialing' and sub.source='trial'
where not s.is_demo
order by s.owner_user_id,s.created_at
on conflict (user_id) do nothing;

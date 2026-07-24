begin;

create table if not exists draborngate.dkd_gate_site_role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references draborngate.dkd_gate_sites(id) on delete cascade,
  requested_role text not null check (requested_role in ('security','resident')),
  full_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,site_id,requested_role)
);
create index if not exists dkd_gate_site_role_applications_site_status_idx on draborngate.dkd_gate_site_role_applications(site_id,status,created_at desc);
create index if not exists dkd_gate_site_role_applications_user_idx on draborngate.dkd_gate_site_role_applications(user_id,requested_role,updated_at desc);
alter table draborngate.dkd_gate_site_role_applications enable row level security;

drop policy if exists dkd_gate_site_role_applications_own_read on draborngate.dkd_gate_site_role_applications;
create policy dkd_gate_site_role_applications_own_read on draborngate.dkd_gate_site_role_applications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists dkd_gate_site_role_applications_manager_read on draborngate.dkd_gate_site_role_applications;
create policy dkd_gate_site_role_applications_manager_read on draborngate.dkd_gate_site_role_applications for select to authenticated using(draborngate.dkd_gate_is_admin_user((select auth.uid())) or draborngate.dkd_gate_is_site_manager(site_id,(select auth.uid())));

create or replace function public.dkd_gate_search_registration_sites(p_query text default '') returns jsonb language sql stable security definer set search_path=draborngate,public,auth as $$
select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'city',s.city,'address',s.address) order by s.name),'[]'::jsonb)
from (select id,name,city,address from draborngate.dkd_gate_sites where is_active and not is_demo and (coalesce(trim(p_query),'')='' or name ilike '%'||trim(p_query)||'%' or city ilike '%'||trim(p_query)||'%' or address ilike '%'||trim(p_query)||'%') order by name limit 20) s;
$$;
grant execute on function public.dkd_gate_search_registration_sites(text) to anon,authenticated;

create or replace function public.dkd_gate_submit_site_role_application(p_site_id uuid,p_requested_role text,p_full_name text) returns uuid language plpgsql security definer set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
 if v_uid is null then raise exception 'Oturum gerekli'; end if;
 if p_requested_role not in ('security','resident') then raise exception 'Geçersiz rol'; end if;
 if coalesce(trim(p_full_name),'')='' then raise exception 'Ad soyad gerekli'; end if;
 if not exists(select 1 from draborngate.dkd_gate_sites where id=p_site_id and is_active and not is_demo) then raise exception 'Site bulunamadı veya aktif değil'; end if;
 insert into draborngate.dkd_gate_profiles(user_id,full_name,preferred_role) values(v_uid,trim(p_full_name),p_requested_role)
 on conflict(user_id) do update set full_name=excluded.full_name,preferred_role=excluded.preferred_role,updated_at=now();
 insert into draborngate.dkd_gate_site_role_applications(user_id,site_id,requested_role,full_name,status,admin_note,reviewed_by,reviewed_at)
 values(v_uid,p_site_id,p_requested_role,trim(p_full_name),'pending',null,null,null)
 on conflict(user_id,site_id,requested_role) do update set full_name=excluded.full_name,status=case when draborngate.dkd_gate_site_role_applications.status='approved' then 'approved' else 'pending' end,admin_note=null,reviewed_by=null,reviewed_at=null,updated_at=now()
 returning id into v_id;
 return v_id;
end; $$;
grant execute on function public.dkd_gate_submit_site_role_application(uuid,text,text) to authenticated;

create or replace function public.dkd_gate_get_my_role_application_status(p_role text) returns jsonb language plpgsql stable security definer set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_result jsonb;
begin
 if v_uid is null then return jsonb_build_object('status','none'); end if;
 if p_role not in ('security','resident') then raise exception 'Geçersiz rol'; end if;
 select jsonb_build_object('status','approved','site_id',s.id,'site_name',s.name,'role',p_role,'has_membership',true) into v_result
 from draborngate.dkd_gate_site_memberships m join draborngate.dkd_gate_sites s on s.id=m.site_id
 where m.user_id=v_uid and m.is_active and s.is_active and m.role=p_role order by m.updated_at desc limit 1;
 if v_result is not null then return v_result; end if;
 select jsonb_build_object('id',a.id,'status',a.status,'site_id',a.site_id,'site_name',s.name,'role',a.requested_role,'admin_note',a.admin_note,'updated_at',a.updated_at,'has_membership',false) into v_result
 from draborngate.dkd_gate_site_role_applications a join draborngate.dkd_gate_sites s on s.id=a.site_id
 where a.user_id=v_uid and a.requested_role=p_role order by a.updated_at desc limit 1;
 return coalesce(v_result,jsonb_build_object('status','none','role',p_role,'has_membership',false));
end; $$;
grant execute on function public.dkd_gate_get_my_role_application_status(text) to authenticated;

create or replace function public.dkd_gate_list_site_role_applications(p_site_id uuid) returns jsonb language plpgsql stable security definer set search_path=draborngate,public,auth as $$
declare v_result jsonb;
begin
 if not (draborngate.dkd_gate_is_admin_user(auth.uid()) or draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid())) then raise exception 'Site yönetimi yetkisi gerekli'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.user_id,'site_id',a.site_id,'site_name',s.name,'requested_role',a.requested_role,'full_name',a.full_name,'email',u.email,'status',a.status,'admin_note',a.admin_note,'created_at',a.created_at,'updated_at',a.updated_at) order by case a.status when 'pending' then 0 else 1 end,a.created_at desc),'[]'::jsonb) into v_result
 from draborngate.dkd_gate_site_role_applications a join draborngate.dkd_gate_sites s on s.id=a.site_id join auth.users u on u.id=a.user_id where a.site_id=p_site_id;
 return v_result;
end; $$;
grant execute on function public.dkd_gate_list_site_role_applications(uuid) to authenticated;

create or replace function public.dkd_gate_decide_site_role_application(p_application_id uuid,p_status text,p_admin_note text default null) returns jsonb language plpgsql security definer set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_app draborngate.dkd_gate_site_role_applications%rowtype;
begin
 if p_status not in ('approved','rejected') then raise exception 'Geçersiz karar'; end if;
 select * into v_app from draborngate.dkd_gate_site_role_applications where id=p_application_id for update;
 if v_app.id is null then raise exception 'Başvuru bulunamadı'; end if;
 if not (draborngate.dkd_gate_is_admin_user(v_uid) or draborngate.dkd_gate_is_site_manager(v_app.site_id,v_uid)) then raise exception 'Site yönetimi yetkisi gerekli'; end if;
 update draborngate.dkd_gate_site_role_applications set status=p_status,admin_note=nullif(trim(p_admin_note),''),reviewed_by=v_uid,reviewed_at=now(),updated_at=now() where id=p_application_id;
 if p_status='approved' then
  insert into draborngate.dkd_gate_site_memberships(site_id,user_id,role,is_active) values(v_app.site_id,v_app.user_id,v_app.requested_role,true)
  on conflict(site_id,user_id,role) do update set is_active=true,updated_at=now();
  if v_app.requested_role='resident' then
   insert into draborngate.dkd_gate_resident_profiles(user_id,site_id,block,floor,apartment,address_note,is_active) values(v_app.user_id,v_app.site_id,'Belirtilmedi','','Belirtilmedi','Site yönetimi tarafından tamamlanacak',true)
   on conflict(user_id,site_id,block,apartment) do update set is_active=true,updated_at=now();
  end if;
  update draborngate.dkd_gate_profiles set preferred_role=v_app.requested_role,updated_at=now() where user_id=v_app.user_id;
 end if;
 insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data) values(v_app.user_id,'site_role_application_'||p_status,case when p_status='approved' then case when v_app.requested_role='security' then 'Güvenlik Panelin açıldı' else 'Site Sakini Panelin açıldı' end else 'Site başvurun incelendi' end,case when p_status='approved' then 'Site yönetimi başvurunu onayladı.' else coalesce(nullif(trim(p_admin_note),''),'Başvurun onaylanmadı.') end,jsonb_build_object('application_id',v_app.id,'site_id',v_app.site_id,'role',v_app.requested_role));
 return jsonb_build_object('id',v_app.id,'status',p_status,'role',v_app.requested_role,'site_id',v_app.site_id);
end; $$;
grant execute on function public.dkd_gate_decide_site_role_application(uuid,text,text) to authenticated;

create or replace function draborngate.dkd_gate_available_roles_for_user(p_user_id uuid) returns text[] language plpgsql stable security definer set search_path=draborngate,public,auth as $$
declare v_roles text[]:=array[]::text[]; v_security boolean; v_management boolean; v_resident boolean;
begin
 if p_user_id is null then return array[]::text[]; end if;
 if draborngate.dkd_gate_is_admin_user(p_user_id) then return array['courier','security','management','resident']::text[]; end if;
 v_security:=exists(select 1 from draborngate.dkd_gate_site_memberships m join draborngate.dkd_gate_sites s on s.id=m.site_id where m.user_id=p_user_id and m.is_active and s.is_active and m.role='security') or exists(select 1 from draborngate.dkd_gate_site_role_applications a where a.user_id=p_user_id and a.requested_role='security' and a.status in ('pending','approved','rejected'));
 v_management:=exists(select 1 from draborngate.dkd_gate_site_memberships m join draborngate.dkd_gate_sites s on s.id=m.site_id where m.user_id=p_user_id and m.is_active and s.is_active and m.role in ('owner','manager')) or exists(select 1 from draborngate.dkd_gate_management_applications a where a.user_id=p_user_id and a.status in ('pending','approved','rejected'));
 v_resident:=exists(select 1 from draborngate.dkd_gate_site_memberships m join draborngate.dkd_gate_sites s on s.id=m.site_id where m.user_id=p_user_id and m.is_active and s.is_active and m.role='resident') or exists(select 1 from draborngate.dkd_gate_resident_profiles r join draborngate.dkd_gate_sites s on s.id=r.site_id where r.user_id=p_user_id and r.is_active and s.is_active) or exists(select 1 from draborngate.dkd_gate_site_role_applications a where a.user_id=p_user_id and a.requested_role='resident' and a.status in ('pending','approved','rejected'));
 if v_security then v_roles:=array_append(v_roles,'security'); end if;
 if v_management then v_roles:=array_append(v_roles,'management'); end if;
 if v_resident then v_roles:=array_append(v_roles,'resident'); end if;
 if cardinality(v_roles)=0 then v_roles:=array['courier']::text[]; end if;
 return v_roles;
end; $$;

create or replace function draborngate.dkd_gate_handle_auth_user() returns trigger language plpgsql security definer set search_path=draborngate,public,auth as $$
declare v_source text:=coalesce(new.raw_user_meta_data->>'source_app',''); v_signup_role text:=coalesce(new.raw_user_meta_data->>'signup_role','courier'); v_preferred text:=case when v_signup_role in ('courier','management','security','resident') then v_signup_role else 'courier' end; v_site_id uuid;
begin
 insert into draborngate.dkd_gate_profiles(user_id,full_name,phone,preferred_role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,''),'@',1),''),coalesce(new.phone,new.raw_user_meta_data->>'phone'),case when v_source='DraBornGate' then v_preferred else 'courier' end)
 on conflict(user_id) do update set full_name=coalesce(nullif(excluded.full_name,''),draborngate.dkd_gate_profiles.full_name),phone=coalesce(excluded.phone,draborngate.dkd_gate_profiles.phone),preferred_role=case when v_source='DraBornGate' then v_preferred else draborngate.dkd_gate_profiles.preferred_role end,updated_at=now();
 if v_source<>'DraBornGate' or v_signup_role='courier' then
  insert into draborngate.dkd_gate_courier_profiles(user_id,platform,plate) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'delivery_platform',''),'DraBornGo'),coalesce(new.raw_user_meta_data->>'motorcycle_plate',''))
  on conflict(user_id) do update set platform=case when v_source='DraBornGate' and v_signup_role='courier' then excluded.platform else draborngate.dkd_gate_courier_profiles.platform end,plate=case when v_source='DraBornGate' and v_signup_role='courier' then excluded.plate else draborngate.dkd_gate_courier_profiles.plate end,updated_at=now();
 end if;
 insert into draborngate.dkd_gate_user_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 if v_source='DraBornGate' and v_signup_role='management' then
  insert into draborngate.dkd_gate_management_applications(user_id,full_name,phone,site_name,site_address,city,status) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1),'Site Yöneticisi'),nullif(coalesce(new.phone,new.raw_user_meta_data->>'phone'),''),coalesce(nullif(trim(new.raw_user_meta_data->>'site_name'),''),'Yeni Site'),coalesce(nullif(trim(new.raw_user_meta_data->>'site_address'),''),'Adres bilgisi bekleniyor'),coalesce(nullif(trim(new.raw_user_meta_data->>'city'),''),'Belirtilmedi'),'pending')
  on conflict(user_id) do update set full_name=excluded.full_name,phone=excluded.phone,site_name=excluded.site_name,site_address=excluded.site_address,city=excluded.city,status=case when draborngate.dkd_gate_management_applications.status='approved' then 'approved' else 'pending' end,updated_at=now();
 elsif v_source='DraBornGate' and v_signup_role in ('security','resident') then
  begin v_site_id:=nullif(new.raw_user_meta_data->>'selected_site_id','')::uuid; exception when others then v_site_id:=null; end;
  if v_site_id is not null and exists(select 1 from draborngate.dkd_gate_sites where id=v_site_id and is_active and not is_demo) then
   insert into draborngate.dkd_gate_site_role_applications(user_id,site_id,requested_role,full_name,status) values(new.id,v_site_id,v_signup_role,coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1),'DraBornGate Kullanıcısı'),'pending')
   on conflict(user_id,site_id,requested_role) do update set full_name=excluded.full_name,status=case when draborngate.dkd_gate_site_role_applications.status='approved' then 'approved' else 'pending' end,updated_at=now();
  end if;
 end if;
 return new;
end; $$;

drop function if exists public.dkd_gate_admin_decide_subscription_payment(uuid,text,text);
drop function if exists public.dkd_gate_admin_decide_subscription_payment_request(uuid,text,text);
drop function if exists public.dkd_gate_admin_get_billing_settings();
drop function if exists public.dkd_gate_admin_list_subscription_payment_requests();
drop function if exists public.dkd_gate_admin_update_billing_settings(text,text,text,text,boolean);
drop function if exists public.dkd_gate_cancel_subscription_payment(uuid);
drop function if exists public.dkd_gate_cancel_subscription_payment_request(uuid);
drop function if exists public.dkd_gate_create_subscription_payment_request(uuid,text,text,text,text);
drop function if exists public.dkd_gate_submit_subscription_payment(uuid,text,text,text,text);
drop table if exists draborngate.dkd_gate_subscription_invoices cascade;
drop table if exists draborngate.dkd_gate_subscription_payment_requests cascade;
drop table if exists draborngate.dkd_gate_billing_settings cascade;

create table if not exists draborngate.dkd_gate_courier_subscription_plans(code text primary key,name text not null,description text not null,monthly_price numeric(12,2) not null default 0,yearly_price numeric(12,2) not null default 0,currency text not null default 'TRY',monthly_pass_limit integer not null default 0,priority_site_search boolean not null default false,advanced_history boolean not null default false,priority_support boolean not null default false,is_public boolean not null default true,is_active boolean not null default true,sort_order integer not null default 10,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists draborngate.dkd_gate_courier_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,plan_code text not null references draborngate.dkd_gate_courier_subscription_plans(code),status text not null default 'free' check(status in ('free','trialing','active','past_due','cancelled','expired')),billing_cycle text not null default 'monthly' check(billing_cycle in ('monthly','yearly')),current_period_start timestamptz not null default now(),current_period_end timestamptz,source text not null default 'system',notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
insert into draborngate.dkd_gate_courier_subscription_plans(code,name,description,monthly_price,yearly_price,currency,monthly_pass_limit,priority_site_search,advanced_history,priority_support,is_public,is_active,sort_order) values
('courier_starter','Kurye Başlangıç','Temel geçiş talepleri ve standart geçmiş görünümü.',0,0,'TRY',100,false,false,false,true,true,10),
('courier_plus','Kurye Plus','Daha yüksek geçiş limiti, gelişmiş geçmiş ve öncelikli site arama.',49.90,499,'TRY',1000,true,true,false,true,true,20),
('courier_pro','Kurye Profesyonel','Yoğun çalışan kuryeler için sınırsız geçiş, gelişmiş geçmiş ve öncelikli destek.',99.90,999,'TRY',0,true,true,true,true,true,30)
on conflict(code) do update set name=excluded.name,description=excluded.description,monthly_price=excluded.monthly_price,yearly_price=excluded.yearly_price,currency=excluded.currency,monthly_pass_limit=excluded.monthly_pass_limit,priority_site_search=excluded.priority_site_search,advanced_history=excluded.advanced_history,priority_support=excluded.priority_support,is_public=excluded.is_public,is_active=excluded.is_active,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.dkd_gate_get_courier_package_center() returns jsonb language plpgsql security definer set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_subscription jsonb; v_plan jsonb; v_plans jsonb; v_used integer;
begin
 if v_uid is null then raise exception 'Oturum gerekli'; end if;
 insert into draborngate.dkd_gate_courier_subscriptions(user_id,plan_code,status,billing_cycle,source) values(v_uid,'courier_starter','free','monthly','system') on conflict(user_id) do nothing;
 select to_jsonb(s) into v_subscription from draborngate.dkd_gate_courier_subscriptions s where s.user_id=v_uid;
 select to_jsonb(p) into v_plan from draborngate.dkd_gate_courier_subscription_plans p where p.code=(v_subscription->>'plan_code');
 select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order),'[]'::jsonb) into v_plans from draborngate.dkd_gate_courier_subscription_plans p where p.is_active and p.is_public;
 select count(*) into v_used from draborngate.dkd_gate_courier_passes where courier_user_id=v_uid and created_at>=date_trunc('month',now()) and not is_demo;
 return jsonb_build_object('subscription',v_subscription,'effective_plan',v_plan,'plans',v_plans,'usage',jsonb_build_object('used',v_used,'limit',coalesce((v_plan->>'monthly_pass_limit')::int,100)),'purchase_channel','google_play_billing');
end; $$;
grant execute on function public.dkd_gate_get_courier_package_center() to authenticated;

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes,released_at) values('0.3.2',1,'0.3.2','Türkçe arayüz, site rol başvuruları, rol ayrımı, harita ve paket düzeltmeleri',now()) on conflict(version) do update set android_version_code=excluded.android_version_code,demo_data_version=excluded.demo_data_version,notes=excluded.notes,released_at=excluded.released_at;
insert into draborngate.dkd_gate_schema_migrations(version,description,applied_at) values('0.3.2','DraBornGate v0.3.2 rol başvuruları, temiz paket altyapısı ve kurye paketleri',now()) on conflict(version) do update set description=excluded.description,applied_at=excluded.applied_at;

commit;

begin;

alter table draborngate.dkd_gate_courier_passes
  add column if not exists screenshot_captured_at timestamptz,
  add column if not exists code_created_at timestamptz,
  add column if not exists code_shared_at timestamptz;

update draborngate.dkd_gate_courier_passes
set screenshot_captured_at=coalesce(screenshot_captured_at,created_at),
    code_created_at=case when approval_code is not null then coalesce(code_created_at,created_at) else code_created_at end
where screenshot_captured_at is null or (approval_code is not null and code_created_at is null);

alter table draborngate.dkd_gate_notifications
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_error text;

create table if not exists draborngate.dkd_gate_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('fcm','expo')),
  token text not null,
  device_type text not null default 'android',
  app_version text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,token)
);

create index if not exists dkd_gate_push_tokens_user_active_idx
  on draborngate.dkd_gate_push_tokens(user_id,is_active);

alter table draborngate.dkd_gate_push_tokens enable row level security;
drop policy if exists dkd_gate_push_tokens_own_read on draborngate.dkd_gate_push_tokens;
create policy dkd_gate_push_tokens_own_read
on draborngate.dkd_gate_push_tokens for select to authenticated
using (user_id=(select auth.uid()));

create or replace function public.dkd_gate_register_push_token(
  p_provider text,
  p_token text,
  p_device_type text default 'android',
  p_app_version text default null
) returns uuid
language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if p_provider not in ('fcm','expo') then raise exception 'Geçersiz bildirim sağlayıcısı'; end if;
  if coalesce(length(trim(p_token)),0)<20 then raise exception 'Bildirim anahtarı geçersiz'; end if;

  insert into draborngate.dkd_gate_push_tokens(user_id,provider,token,device_type,app_version,is_active,last_seen_at,updated_at)
  values(v_uid,p_provider,trim(p_token),coalesce(nullif(trim(p_device_type),''),'android'),nullif(trim(coalesce(p_app_version,'')),''),true,now(),now())
  on conflict(provider,token) do update set
    user_id=excluded.user_id,
    device_type=excluded.device_type,
    app_version=excluded.app_version,
    is_active=true,
    last_seen_at=now(),
    updated_at=now()
  returning id into v_id;

  update draborngate.dkd_gate_push_tokens
  set is_active=false,updated_at=now()
  where user_id=v_uid and provider=p_provider and token<>trim(p_token) and device_type=coalesce(nullif(trim(p_device_type),''),'android');

  return v_id;
end $$;

grant execute on function public.dkd_gate_register_push_token(text,text,text,text) to authenticated;

create or replace function draborngate.dkd_gate_notify_site_staff(
  p_site_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_is_demo boolean default false,
  p_demo_owner_user_id uuid default null
) returns void
language plpgsql security definer
set search_path=draborngate,public,auth as $$
begin
  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data,is_demo,demo_owner_user_id)
  select distinct target.user_id,p_kind,p_title,p_body,coalesce(p_data,'{}'::jsonb),coalesce(p_is_demo,false),p_demo_owner_user_id
  from (
    select s.owner_user_id as user_id from draborngate.dkd_gate_sites s where s.id=p_site_id
    union
    select m.user_id from draborngate.dkd_gate_site_memberships m
    where m.site_id=p_site_id and m.is_active and m.role in ('owner','manager','security')
  ) target
  where target.user_id is not null;
end $$;

-- Eski imzayı kaldır; v0.3.4 ekran görüntüsü zamanı parametresi ekler.
drop function if exists public.dkd_gate_create_courier_pass_v2(uuid,uuid,text,text,text,text,text,text,text,text,text,text,jsonb,integer,integer,boolean);

create function public.dkd_gate_create_courier_pass_v2(
  p_site_id uuid,
  p_gate_id uuid,
  p_gate text,
  p_customer_name text,
  p_address_text text,
  p_block text,
  p_floor text,
  p_apartment text,
  p_order_number text,
  p_note text default '',
  p_screenshot_url text default null,
  p_ocr_text text default null,
  p_ocr_payload jsonb default '{}'::jsonb,
  p_eta_minutes integer default 6,
  p_rules_version integer default null,
  p_rules_accepted boolean default false,
  p_screenshot_captured_at timestamptz default now()
) returns uuid
language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare
  uid uuid:=auth.uid();
  pid uuid;
  prof record;
  cp record;
  selected_gate record;
  has_critical_rules boolean;
  generated text;
  attempts integer:=0;
begin
  if uid is null then raise exception 'Oturum gerekli'; end if;
  if not exists(select 1 from draborngate.dkd_gate_sites s where s.id=p_site_id and s.is_active) then
    raise exception 'Aktif site bulunamadı';
  end if;

  if p_gate_id is not null then
    select * into selected_gate from draborngate.dkd_gate_site_gates g
    where g.id=p_gate_id and g.site_id=p_site_id and g.is_active;
    if selected_gate.id is null then raise exception 'Seçilen kapı bu siteye ait değil veya aktif değil'; end if;
    if trim(coalesce(p_gate,''))<>trim(selected_gate.name) then raise exception 'Kapı bilgisi eşleşmiyor'; end if;
  end if;

  select exists(
    select 1 from draborngate.dkd_gate_site_rules r
    where r.site_id=p_site_id and r.is_active and r.is_critical and r.audience in ('all','courier')
      and r.starts_at<=now() and (r.ends_at is null or r.ends_at>=now())
      and (r.scope_type='site' or r.gate_id=p_gate_id)
  ) into has_critical_rules;
  if has_critical_rules and not p_rules_accepted then raise exception 'Kritik kuralları okuyup onaylamalısınız'; end if;

  if p_rules_version is not null and not exists(
    select 1 from draborngate.dkd_gate_site_rules r
    where r.site_id=p_site_id and r.version=p_rules_version and r.is_active
      and r.audience in ('all','courier') and (r.scope_type='site' or r.gate_id=p_gate_id)
  ) then raise exception 'Kural sürümü site veya kapı ile eşleşmiyor'; end if;

  select * into prof from draborngate.dkd_gate_profiles where user_id=uid;
  select * into cp from draborngate.dkd_gate_courier_profiles where user_id=uid;
  if coalesce(trim(prof.full_name),'')='' then raise exception 'Kurye profilini tamamlayın'; end if;
  if coalesce(trim(cp.plate),'')='' then raise exception 'Kurye profilinde motosiklet plakası gerekli'; end if;
  if coalesce(trim(p_customer_name),'')='' or coalesce(trim(p_address_text),'')='' or coalesce(trim(p_block),'')='' or coalesce(trim(p_floor),'')='' or coalesce(trim(p_apartment),'')='' then
    raise exception 'Müşteri ve adres bilgileri eksik';
  end if;
  if coalesce(trim(p_screenshot_url),'')='' then raise exception 'Sipariş ekran görüntüsü gerekli'; end if;

  loop
    attempts:=attempts+1;
    generated:=lpad((floor(random()*1000000))::int::text,6,'0');
    exit when not exists(
      select 1 from draborngate.dkd_gate_courier_passes x
      where x.approval_code=generated and x.status in ('waiting','approved','arrived') and x.code_used_at is null
    );
    if attempts>=30 then raise exception 'Benzersiz geçiş kodu üretilemedi'; end if;
  end loop;

  insert into draborngate.dkd_gate_courier_passes(
    courier_user_id,site_id,gate_id,courier_name,courier_phone,courier_plate,platform,gate,
    customer_name,address_text,block,floor,apartment,order_number,note,screenshot_url,screenshot_path,
    screenshot_captured_at,ocr_text,ocr_payload,ocr_status,eta_minutes,rules_version,rules_accepted_at,
    approval_code,code_created_at
  ) values(
    uid,p_site_id,p_gate_id,prof.full_name,prof.phone,cp.plate,coalesce(cp.platform,'DraBornGo'),trim(p_gate),
    trim(p_customer_name),trim(p_address_text),trim(p_block),trim(p_floor),trim(p_apartment),trim(p_order_number),coalesce(trim(p_note),''),p_screenshot_url,p_screenshot_url,
    coalesce(p_screenshot_captured_at,now()),p_ocr_text,coalesce(p_ocr_payload,'{}'::jsonb),case when nullif(trim(coalesce(p_ocr_text,'')),'') is null then 'manual' else 'parsed' end,
    greatest(coalesce(p_eta_minutes,6),0),p_rules_version,case when has_critical_rules or p_rules_accepted then now() end,
    generated,now()
  ) returning id into pid;

  insert into draborngate.dkd_gate_pass_events(pass_id,actor_user_id,event_type,title,detail,tone,icon)
  values(pid,uid,'created','Geçiş talebi gönderildi',trim(p_gate)||' • '||trim(p_block)||' / Kat '||trim(p_floor)||' / Daire '||trim(p_apartment),'cyan','paper-plane');

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data)
  values(uid,'pass_code_ready','Tek kullanımlık geçiş kodun hazır','Kapıya geldiğinde 6 haneli kodu güvenlik görevlisine söyle.',jsonb_build_object('pass_id',pid,'code',generated));

  perform draborngate.dkd_gate_notify_site_staff(
    p_site_id,'pass_created','Yeni kurye geçiş talebi',
    prof.full_name||' • '||coalesce(cp.platform,'DraBornGo')||' • '||trim(p_gate),
    jsonb_build_object('pass_id',pid,'gate_id',p_gate_id,'status','waiting')
  );
  return pid;
end $$;

grant execute on function public.dkd_gate_create_courier_pass_v2(uuid,uuid,text,text,text,text,text,text,text,text,text,text,jsonb,integer,integer,boolean,timestamptz) to authenticated;

create or replace function public.dkd_gate_update_courier_pass_status_v2(
  p_pass_id uuid,
  p_status text,
  p_rejection_reason text default null,
  p_code text default null
) returns text
language plpgsql security definer
set search_path=draborngate,public,auth as $$
declare uid uuid:=auth.uid(); p record;
begin
  if uid is null then raise exception 'Oturum gerekli'; end if;
  select * into p from draborngate.dkd_gate_courier_passes where id=p_pass_id for update;
  if p.id is null then raise exception 'Talep bulunamadı'; end if;

  if p_status in ('arrived','cancelled') then
    if p.courier_user_id<>uid then raise exception 'Kurye yetkisi gerekli'; end if;
  elsif not draborngate.dkd_gate_is_site_staff(p.site_id,uid) then
    raise exception 'Güvenlik yetkisi gerekli';
  end if;

  if p_status='approved' then
    -- Eski uygulama sürümleri için geriye dönük uyumluluk: kod zaten oluşturulmuştur.
    if p.status<>'waiting' then raise exception 'Yalnızca bekleyen talep onaylanabilir'; end if;
    update draborngate.dkd_gate_courier_passes set status='approved',rejection_reason=null,rejected_at=null where id=p_pass_id;
    insert into draborngate.dkd_gate_pass_events(pass_id,actor_user_id,event_type,title,detail,tone,icon,is_demo,demo_owner_user_id)
    values(p_pass_id,uid,'approved','Talep incelendi','Tek kullanımlık kod daha önce oluşturuldu','green','shield-checkmark',p.is_demo,p.demo_owner_user_id);
    return p.approval_code;
  elsif p_status='rejected' then
    if p.status not in ('waiting','approved','arrived') then raise exception 'Bu talep reddedilemez'; end if;
    if coalesce(trim(p_rejection_reason),'')='' then raise exception 'Reddetme sebebi gerekli'; end if;
    update draborngate.dkd_gate_courier_passes set status='rejected',rejection_reason=trim(p_rejection_reason),rejected_at=now() where id=p_pass_id;
    insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data,is_demo,demo_owner_user_id)
    values(p.courier_user_id,'pass_rejected','Geçiş talebiniz reddedildi',trim(p_rejection_reason),jsonb_build_object('pass_id',p_pass_id),p.is_demo,p.demo_owner_user_id);
    insert into draborngate.dkd_gate_pass_events(pass_id,actor_user_id,event_type,title,detail,tone,icon,is_demo,demo_owner_user_id)
    values(p_pass_id,uid,'rejected','Geçiş reddedildi',trim(p_rejection_reason),'red','close-circle',p.is_demo,p.demo_owner_user_id);
  elsif p_status='arrived' then
    if p.status not in ('waiting','approved') then raise exception 'Bu talep kapıya geldi olarak işaretlenemez'; end if;
    if p.approval_code is null or p.code_used_at is not null then raise exception 'Aktif tek kullanımlık kod bulunamadı'; end if;
    update draborngate.dkd_gate_courier_passes set status='arrived',arrived_at=now(),code_shared_at=now() where id=p_pass_id;
    insert into draborngate.dkd_gate_pass_events(pass_id,actor_user_id,event_type,title,detail,tone,icon,is_demo,demo_owner_user_id)
    values(p_pass_id,uid,'arrived','Kurye kapıya geldi',p.gate||' • Kodu kuryeden isteyin','orange','location',p.is_demo,p.demo_owner_user_id);
    insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data,is_demo,demo_owner_user_id)
    values(p.courier_user_id,'pass_arrived','Kapı doğrulaması hazır','6 haneli kodunu güvenlik görevlisine söyle.',jsonb_build_object('pass_id',p_pass_id),p.is_demo,p.demo_owner_user_id);
    perform draborngate.dkd_gate_notify_site_staff(
      p.site_id,'pass_arrived','Kurye kapıya geldi',p.courier_name||' • '||p.gate||' • Kodu kuryeden isteyin',
      jsonb_build_object('pass_id',p_pass_id,'status','arrived'),p.is_demo,p.demo_owner_user_id
    );
  elsif p_status='completed' then
    if p.status<>'arrived' then raise exception 'Kurye önce Kapıya Geldim işlemini yapmalı'; end if;
    if p.approval_code is null or p.code_used_at is not null or trim(coalesce(p_code,''))<>p.approval_code then raise exception 'Geçersiz veya kullanılmış kod'; end if;
    update draborngate.dkd_gate_courier_passes set status='completed',completed_at=now(),code_used_at=now() where id=p_pass_id;
    insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data,is_demo,demo_owner_user_id)
    values(p.courier_user_id,'pass_completed','Geçiş tamamlandı',p.gate||' için tek kullanımlık kod doğrulandı.',jsonb_build_object('pass_id',p_pass_id),p.is_demo,p.demo_owner_user_id);
    insert into draborngate.dkd_gate_pass_events(pass_id,actor_user_id,event_type,title,detail,tone,icon,is_demo,demo_owner_user_id)
    values(p_pass_id,uid,'completed','Giriş tamamlandı','Kod doğrulandı • '||p.block||' / Kat '||coalesce(p.floor,'-')||' / Daire '||p.apartment,'purple','checkmark-done',p.is_demo,p.demo_owner_user_id);
    perform draborngate.dkd_gate_notify_site_staff(
      p.site_id,'pass_completed','Kurye geçişi tamamlandı',p.courier_name||' • '||p.block||' / Kat '||coalesce(p.floor,'-')||' / Daire '||p.apartment,
      jsonb_build_object('pass_id',p_pass_id,'status','completed'),p.is_demo,p.demo_owner_user_id
    );
  elsif p_status='cancelled' then
    if p.status not in ('waiting','approved') then raise exception 'Bu talep iptal edilemez'; end if;
    update draborngate.dkd_gate_courier_passes set status='cancelled' where id=p_pass_id;
    insert into draborngate.dkd_gate_pass_events(pass_id,actor_user_id,event_type,title,detail,tone,icon,is_demo,demo_owner_user_id)
    values(p_pass_id,uid,'cancelled','Talep iptal edildi','Kurye talebi iptal etti','red','trash',p.is_demo,p.demo_owner_user_id);
    perform draborngate.dkd_gate_notify_site_staff(
      p.site_id,'pass_cancelled','Kurye talebi iptal edildi',p.courier_name||' • '||p.gate,
      jsonb_build_object('pass_id',p_pass_id,'status','cancelled'),p.is_demo,p.demo_owner_user_id
    );
  else
    raise exception 'Geçersiz durum';
  end if;
  return null;
end $$;

grant execute on function public.dkd_gate_update_courier_pass_status_v2(uuid,text,text,text) to authenticated;

create or replace function public.dkd_gate_lookup_courier_by_code(p_code text)
returns jsonb
language plpgsql stable security definer
set search_path=draborngate,public,auth as $$
declare v_uid uuid:=auth.uid(); v_pass record;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if trim(coalesce(p_code,'')) !~ '^\d{6}$' then raise exception '6 haneli kod gerekli'; end if;

  select p.* into v_pass
  from draborngate.dkd_gate_courier_passes p
  where p.approval_code=trim(p_code)
    and p.status='arrived'
    and p.code_used_at is null
    and draborngate.dkd_gate_is_site_staff(p.site_id,v_uid)
  order by p.arrived_at desc nulls last
  limit 1;

  if v_pass.id is null then return null; end if;
  return jsonb_build_object(
    'id',v_pass.id,'site_id',v_pass.site_id,'gate_id',v_pass.gate_id,
    'courier_name',v_pass.courier_name,'courier_plate',v_pass.courier_plate,'platform',v_pass.platform,
    'gate',v_pass.gate,'customer_name',v_pass.customer_name,'address_text',v_pass.address_text,
    'block',v_pass.block,'floor',v_pass.floor,'apartment',v_pass.apartment,'order_number',v_pass.order_number,
    'screenshot_url',coalesce(v_pass.screenshot_url,v_pass.screenshot_path),
    'screenshot_captured_at',coalesce(v_pass.screenshot_captured_at,v_pass.created_at),
    'arrived_at',v_pass.arrived_at,'status',v_pass.status
  );
end $$;

grant execute on function public.dkd_gate_lookup_courier_by_code(text) to authenticated;

create or replace function public.dkd_gate_get_site_entry_report(
  p_site_id uuid,
  p_date_from date default current_date,
  p_date_to date default current_date
) returns jsonb
language plpgsql stable security definer
set search_path=draborngate,public,auth as $$
declare v_from date:=coalesce(p_date_from,current_date); v_to date:=least(coalesce(p_date_to,current_date),current_date);
begin
  if not draborngate.dkd_gate_is_site_manager(p_site_id,auth.uid()) and not draborngate.dkd_gate_is_admin_user(auth.uid()) then
    raise exception 'Detaylı rapor için site yönetimi yetkisi gerekli';
  end if;
  if v_from>v_to then raise exception 'Başlangıç tarihi bitiş tarihinden sonra olamaz'; end if;

  return jsonb_build_object(
    'date_from',v_from,
    'date_to',v_to,
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'courier_name',p.courier_name,'courier_plate',p.courier_plate,'platform',p.platform,
        'gate',p.gate,'customer_name',p.customer_name,'address_text',p.address_text,'block',p.block,'floor',p.floor,
        'apartment',p.apartment,'order_number',p.order_number,'status',p.status,'created_at',p.created_at,
        'arrived_at',p.arrived_at,'completed_at',p.completed_at,'rejected_at',p.rejected_at,
        'entry_time',coalesce(p.completed_at,p.arrived_at),'location_verified',p.location_verified,
        'last_distance_m',p.last_distance_m
      ) order by coalesce(p.completed_at,p.arrived_at,p.created_at) desc)
      from draborngate.dkd_gate_courier_passes p
      where p.site_id=p_site_id and p.created_at>=v_from::timestamptz and p.created_at<(v_to+1)::timestamptz
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.dkd_gate_get_site_entry_report(uuid,date,date) to authenticated;

-- Bootstrap: kurye kendi kodunu görür; güvenlik kodu ekrandan göremez, yalnızca arama/doğrulama yapar.
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
      to_jsonb(p) || jsonb_build_object('approval_code',case when p.courier_user_id=uid then p.approval_code else null end)
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

insert into draborngate.dkd_gate_app_releases(version,android_version_code,demo_data_version,notes)
values('0.3.4',1,'0.3.4','Otomatik tek kullanımlık kod, kodla kurye arama, ekran görüntüsü zaman damgası, tam ekran görsel, otomatik yenileme, ayrıntılı raporlar, sayfalama ve FCM bildirim altyapısı.')
on conflict(version) do update set android_version_code=1,demo_data_version='0.3.4',notes=excluded.notes,released_at=now();

commit;

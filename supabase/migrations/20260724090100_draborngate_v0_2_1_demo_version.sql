create or replace function public.dkd_gate_load_demo_data()
returns text
language plpgsql
security definer
set search_path to 'draborngate', 'public', 'auth'
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  gid uuid;
  rid uuid;
  pid uuid;
  periodid uuid;
begin
  if uid is null then raise exception 'Oturum gerekli'; end if;
  perform public.dkd_gate_delete_demo_data();

  insert into draborngate.dkd_gate_sites(
    owner_user_id,name,address,city,gate_names,latitude,longitude,
    finance_summary_visible,is_demo,demo_owner_user_id
  ) values (
    uid,'DraBorn Park Evleri','Lara / Muratpaşa','Antalya',
    array['Ana Kapı','B Kapısı'],36.8522,30.7645,true,true,uid
  ) returning id into sid;

  insert into draborngate.dkd_gate_site_memberships(site_id,user_id,role,is_demo,demo_owner_user_id)
  values(sid,uid,'owner',true,uid);

  insert into draborngate.dkd_gate_site_gates(
    site_id,name,stage,entry_point,latitude,longitude,is_demo,demo_owner_user_id
  ) values(sid,'Ana Kapı','1. Etap','Kuzey giriş',36.85225,30.76455,true,uid)
  returning id into gid;

  insert into draborngate.dkd_gate_site_gates(
    site_id,name,stage,entry_point,latitude,longitude,is_demo,demo_owner_user_id
  ) values(sid,'B Kapısı','2. Etap','Güney giriş',36.8519,30.7647,true,uid);

  insert into draborngate.dkd_gate_resident_profiles(
    user_id,site_id,block,floor,apartment,address_note,is_demo,demo_owner_user_id
  ) values(uid,sid,'B Blok','3','18','Mavi kapı',true,uid)
  returning id into rid;

  insert into draborngate.dkd_gate_site_memberships(
    site_id,user_id,role,block,floor,apartment,address_note,is_demo,demo_owner_user_id
  ) values(sid,uid,'resident','B Blok','3','18','Mavi kapı',true,uid)
  on conflict(site_id,user_id,role) do update set
    block=excluded.block,
    floor=excluded.floor,
    apartment=excluded.apartment,
    address_note=excluded.address_note,
    is_demo=true,
    demo_owner_user_id=uid,
    is_active=true;

  insert into draborngate.dkd_gate_site_rules(
    site_id,audience,scope_type,title,body,is_critical,version,created_by,is_demo,demo_owner_user_id
  ) values(
    sid,'courier','site','Kask ve yelek zorunlu',
    'Kurye site içinde kaskını çıkarmamalı ve hız sınırı 10 km olmalıdır.',
    true,1,uid,true,uid
  );

  insert into draborngate.dkd_gate_site_rules(
    site_id,gate_id,audience,scope_type,title,body,is_critical,version,created_by,is_demo,demo_owner_user_id
  ) values(
    sid,gid,'courier','gate','Ana Kapı teslimat noktası',
    'Teslimatlar güvenlik kulübesinin sağındaki alanda bekletilir.',
    false,1,uid,true,uid
  );

  insert into draborngate.dkd_gate_site_rules(
    site_id,audience,scope_type,title,body,is_critical,version,created_by,is_demo,demo_owner_user_id
  ) values(
    sid,'visitor','site','Misafir site kuralı',
    'Misafir araçları ziyaretçi otoparkını kullanmalıdır.',
    false,1,uid,true,uid
  );

  insert into draborngate.dkd_gate_courier_passes(
    courier_user_id,site_id,gate_id,courier_name,courier_phone,courier_plate,
    platform,gate,customer_name,address_text,block,floor,apartment,order_number,
    note,status,eta_minutes,location_verified,last_distance_m,is_demo,demo_owner_user_id
  )
  select uid,sid,gid,
    coalesce(nullif(p.full_name,''),'Örnek Kurye'),
    p.phone,
    coalesce(c.plate,'07 DBG 021'),
    coalesce(c.platform,'DraBornGo'),
    'Ana Kapı','Ayşe Nur Demir','B Blok Kat 3 Daire 18','B Blok','3','18',
    'DBG-V021-1001','Temassız teslimat','waiting',4,true,24,true,uid
  from draborngate.dkd_gate_profiles p
  left join draborngate.dkd_gate_courier_profiles c on c.user_id=p.user_id
  where p.user_id=uid
  returning id into pid;

  insert into draborngate.dkd_gate_pass_events(
    pass_id,actor_user_id,event_type,title,detail,tone,icon,is_demo,demo_owner_user_id
  ) values(
    pid,uid,'created','Örnek kurye geçişi oluşturuldu',
    'Akıllı geçiş için kapıya 24 metre','cyan','navigate',true,uid
  );

  insert into draborngate.dkd_gate_visitor_passes(
    resident_user_id,site_id,guest_name,guest_phone,plate,note,visitor_code,status,is_demo,demo_owner_user_id
  ) values(
    uid,sid,'Mehmet Kaya','05550000000','07 DEM 21','Aile ziyareti','240621','waiting',true,uid
  );

  insert into draborngate.dkd_gate_dues_periods(
    site_id,title,period_year,period_month,due_date,scope_type,amount,status,created_by,is_demo,demo_owner_user_id
  ) values(
    sid,'Temmuz 2026 Aidatı',2026,7,current_date+7,'site',1500,'active',uid,true,uid
  ) returning id into periodid;

  insert into draborngate.dkd_gate_dues_charges(
    period_id,site_id,resident_profile_id,resident_user_id,block,floor,apartment,amount,is_demo,demo_owner_user_id
  ) values(periodid,sid,rid,uid,'B Blok','3','18',1500,true,uid);

  insert into draborngate.dkd_gate_finance_transactions(
    site_id,transaction_type,category,description,amount,transaction_date,
    visible_to_residents,created_by,is_demo,demo_owner_user_id
  ) values
    (sid,'income','Aidat','Haziran aidat tahsilatları',45000,current_date-15,true,uid,true,uid),
    (sid,'expense','Bakım','Asansör aylık bakımı',8500,current_date-10,true,uid,true,uid);

  insert into draborngate.dkd_gate_notifications(
    user_id,kind,title,body,data,is_demo,demo_owner_user_id
  ) values(
    uid,'demo_ready','DraBornGate v0.2.1 örnek verileri hazır',
    'Kurye geçişi, akıllı geçiş, ziyaretçi, sakin ve finans örnekleri yüklendi.',
    jsonb_build_object('site_id',sid),true,uid
  );

  update draborngate.dkd_gate_user_settings
  set demo_data_version='0.2.1', demo_loaded_at=now()
  where user_id=uid;

  return '0.2.1';
end;
$$;

revoke all on function public.dkd_gate_load_demo_data() from public, anon;
grant execute on function public.dkd_gate_load_demo_data() to authenticated;

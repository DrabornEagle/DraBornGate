-- DraBornGate v0.3.0 kapsamlı örnek raporlama verileri.

create or replace function public.dkd_gate_load_demo_data()
returns text
language plpgsql
security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  gid_main uuid;
  gid_south uuid;
  rid uuid;
  pid uuid;
  period_current uuid;
  period_previous uuid;
  i integer;
  v_status text;
  v_gate_id uuid;
  v_gate_name text;
  v_created_at timestamptz;
begin
  if uid is null then raise exception 'Oturum gerekli'; end if;
  perform public.dkd_gate_delete_demo_data();

  insert into draborngate.dkd_gate_sites(
    owner_user_id,name,address,city,gate_names,latitude,longitude,
    finance_summary_visible,is_demo,demo_owner_user_id
  ) values (
    uid,'DraBorn Park Evleri','Lara / Muratpaşa','Antalya',
    array['Ana Kapı','Güney Kapısı'],36.8522,30.7645,true,true,uid
  ) returning id into sid;

  insert into draborngate.dkd_gate_site_memberships(site_id,user_id,role,is_demo,demo_owner_user_id)
  values(sid,uid,'owner',true,uid);

  insert into draborngate.dkd_gate_site_gates(
    site_id,name,stage,entry_point,latitude,longitude,is_demo,demo_owner_user_id
  ) values(sid,'Ana Kapı','1. Etap','Kuzey giriş',36.85225,30.76455,true,uid)
  returning id into gid_main;

  insert into draborngate.dkd_gate_site_gates(
    site_id,name,stage,entry_point,latitude,longitude,is_demo,demo_owner_user_id
  ) values(sid,'Güney Kapısı','2. Etap','Güney giriş',36.8519,30.7647,true,uid)
  returning id into gid_south;

  insert into draborngate.dkd_gate_resident_profiles(
    user_id,site_id,block,floor,apartment,address_note,is_demo,demo_owner_user_id
  ) values(uid,sid,'B Blok','3','18','Mavi kapı',true,uid)
  returning id into rid;

  insert into draborngate.dkd_gate_site_memberships(
    site_id,user_id,role,block,floor,apartment,address_note,is_demo,demo_owner_user_id
  ) values(sid,uid,'resident','B Blok','3','18','Mavi kapı',true,uid)
  on conflict(site_id,user_id,role) do update set
    block=excluded.block,floor=excluded.floor,apartment=excluded.apartment,
    address_note=excluded.address_note,is_demo=true,demo_owner_user_id=uid,is_active=true;

  insert into draborngate.dkd_gate_site_rules(
    site_id,audience,scope_type,title,body,is_critical,version,created_by,is_demo,demo_owner_user_id
  ) values
    (sid,'courier','site','Kask ve yelek zorunlu','Kurye site içinde kaskını çıkarmamalı ve hız sınırı 10 km olmalıdır.',true,1,uid,true,uid),
    (sid,'visitor','site','Misafir otoparkı','Misafir araçları ziyaretçi otoparkını kullanmalıdır.',false,1,uid,true,uid);

  insert into draborngate.dkd_gate_site_rules(
    site_id,gate_id,audience,scope_type,title,body,is_critical,version,created_by,is_demo,demo_owner_user_id
  ) values(
    sid,gid_main,'courier','gate','Ana Kapı teslimat noktası',
    'Teslimatlar güvenlik kulübesinin sağındaki alanda bekletilir.',false,1,uid,true,uid
  );

  for i in 0..20 loop
    v_created_at := now() - ((i % 14)::text || ' days')::interval - (((i * 37) % 12)::text || ' hours')::interval;
    v_gate_id := case when i % 3 = 0 then gid_south else gid_main end;
    v_gate_name := case when i % 3 = 0 then 'Güney Kapısı' else 'Ana Kapı' end;
    v_status := case
      when i % 10 in (0,1,2,3,4,5) then 'completed'
      when i % 10 = 6 then 'approved'
      when i % 10 = 7 then 'waiting'
      when i % 10 = 8 then 'rejected'
      else 'arrived'
    end;

    insert into draborngate.dkd_gate_courier_passes(
      courier_user_id,site_id,gate_id,courier_name,courier_phone,courier_plate,
      platform,gate,customer_name,address_text,block,floor,apartment,order_number,
      note,status,eta_minutes,location_verified,last_distance_m,airpass_sent_at,
      arrived_at,completed_at,rejection_reason,created_at,is_demo,demo_owner_user_id
    )
    select uid,sid,v_gate_id,
      coalesce(nullif(p.full_name,''),'Örnek Kurye'),p.phone,
      coalesce(nullif(c.plate,''),'07 DBG 030'),
      case i % 4 when 0 then 'DraBornGo' when 1 then 'Trendyol Go' when 2 then 'Yemeksepeti' else 'Getir' end,
      v_gate_name,
      case i % 4 when 0 then 'Ayşe Nur Demir' when 1 then 'Mehmet Kaya' when 2 then 'Selin Yılmaz' else 'Mert Aydın' end,
      'DraBorn Park Evleri teslimat adresi',
      case when i % 2 = 0 then 'B Blok' else 'A Blok' end,
      ((i % 7)+1)::text,
      ((i % 24)+1)::text,
      'DBG-V030-'||lpad((1000+i)::text,4,'0'),
      case when i % 2=0 then 'Temassız teslimat' else 'Güvenliğe bırakılabilir' end,
      v_status,
      4+(i % 8),
      i % 4 <> 3,
      8+(i*7 % 90),
      case when i % 4 <> 3 then v_created_at + interval '3 minutes' end,
      case when v_status in ('arrived','completed') then v_created_at + interval '7 minutes' end,
      case when v_status='completed' then v_created_at + ((12+(i%16))::text || ' minutes')::interval end,
      case when v_status='rejected' then 'Adres bilgisi teyit edilemedi' end,
      v_created_at,true,uid
    from draborngate.dkd_gate_profiles p
    left join draborngate.dkd_gate_courier_profiles c on c.user_id=p.user_id
    where p.user_id=uid
    returning id into pid;

    insert into draborngate.dkd_gate_pass_events(
      pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
    ) values(
      pid,uid,'created','Kurye geçişi oluşturuldu',v_gate_name||' • örnek rapor verisi','cyan','paper-plane',v_created_at,true,uid
    );

    if v_status in ('approved','arrived','completed') then
      insert into draborngate.dkd_gate_pass_events(
        pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
      ) values(pid,uid,'approved','Geçiş onaylandı','Güvenlik tarafından onaylandı','green','shield-checkmark',v_created_at+interval '3 minutes',true,uid);
    elsif v_status='rejected' then
      insert into draborngate.dkd_gate_pass_events(
        pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
      ) values(pid,uid,'rejected','Geçiş reddedildi','Adres bilgisi teyit edilemedi','red','close-circle',v_created_at+interval '4 minutes',true,uid);
    end if;

    if v_status='completed' then
      insert into draborngate.dkd_gate_pass_events(
        pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
      ) values(pid,uid,'completed','Teslimat tamamlandı','Rapor için tamamlanmış örnek geçiş','purple','checkmark-done',v_created_at+((12+(i%16))::text || ' minutes')::interval,true,uid);
    end if;
  end loop;

  for i in 0..10 loop
    insert into draborngate.dkd_gate_visitor_passes(
      resident_user_id,site_id,guest_name,guest_phone,plate,note,visitor_code,status,
      decided_at,completed_at,created_at,is_demo,demo_owner_user_id
    ) values(
      uid,sid,'Örnek Misafir '||(i+1),'0555000'||lpad(i::text,4,'0'),'07 DEM '||lpad(i::text,2,'0'),
      'v0.3 ziyaretçi raporu','V3'||lpad(i::text,4,'0'),
      case when i%5=0 then 'rejected' when i%4=0 then 'waiting' when i%3=0 then 'completed' else 'approved' end,
      case when i%4<>0 then now()-(i||' days')::interval+interval '4 minutes' end,
      case when i%3=0 then now()-(i||' days')::interval+interval '50 minutes' end,
      now()-(i||' days')::interval,true,uid
    );
  end loop;

  insert into draborngate.dkd_gate_dues_periods(
    site_id,title,period_year,period_month,due_date,scope_type,amount,status,created_by,is_demo,demo_owner_user_id
  ) values(sid,'Temmuz 2026 Aidatı',2026,7,current_date+7,'site',1500,'active',uid,true,uid)
  returning id into period_current;

  insert into draborngate.dkd_gate_dues_periods(
    site_id,title,period_year,period_month,due_date,scope_type,amount,status,created_by,is_demo,demo_owner_user_id
  ) values(sid,'Haziran 2026 Aidatı',2026,6,current_date-23,'site',1400,'closed',uid,true,uid)
  returning id into period_previous;

  insert into draborngate.dkd_gate_dues_charges(
    period_id,site_id,resident_profile_id,resident_user_id,block,floor,apartment,amount,status,paid_at,payment_note,is_demo,demo_owner_user_id
  ) values
    (period_current,sid,rid,uid,'B Blok','3','18',1500,'unpaid',null,null,true,uid),
    (period_previous,sid,rid,uid,'B Blok','3','18',1400,'paid',now()-interval '18 days','FAST ile ödendi',true,uid);

  insert into draborngate.dkd_gate_finance_transactions(
    site_id,transaction_type,category,description,amount,transaction_date,
    visible_to_residents,created_by,is_demo,demo_owner_user_id
  ) values
    (sid,'income','Aidat','Haziran aidat tahsilatları',45000,current_date-25,true,uid,true,uid),
    (sid,'income','Otopark','Misafir otopark geliri',3500,current_date-12,true,uid,true,uid),
    (sid,'income','Aidat','Temmuz erken tahsilatlar',28500,current_date-5,true,uid,true,uid),
    (sid,'expense','Bakım','Asansör aylık bakımı',8500,current_date-22,true,uid,true,uid),
    (sid,'expense','Güvenlik','Güvenlik ekipmanı',12750,current_date-9,true,uid,true,uid),
    (sid,'expense','Peyzaj','Bahçe ve peyzaj bakımı',6200,current_date-3,true,uid,true,uid);

  insert into draborngate.dkd_gate_notifications(
    user_id,kind,title,body,data,is_demo,demo_owner_user_id
  ) values(
    uid,'demo_ready','DraBornGate v0.3.0 örnek verileri hazır',
    'Profesyonel paket, 14 günlük operasyon, ziyaretçi, aidat, finans ve raporlama örnekleri yüklendi.',
    jsonb_build_object('site_id',sid,'plan_code','professional'),true,uid
  );

  update draborngate.dkd_gate_user_settings
  set demo_data_version='0.3.0',demo_loaded_at=now()
  where user_id=uid;

  return '0.3.0';
end;
$$;

revoke all on function public.dkd_gate_load_demo_data() from public,anon;
grant execute on function public.dkd_gate_load_demo_data() to authenticated;

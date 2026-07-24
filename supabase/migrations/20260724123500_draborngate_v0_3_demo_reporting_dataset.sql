create or replace function public.dkd_gate_load_demo_data()
returns text
language plpgsql
security definer
set search_path to 'draborngate','public','auth'
as $$
declare
  v_uid uuid:=auth.uid();
  v_site_id uuid;
  v_main_gate_id uuid;
  v_second_gate_id uuid;
  v_resident_id uuid;
  v_pass_id uuid;
  v_previous_period_id uuid;
  v_created_at timestamptz;
  v_status text;
  v_gate_id uuid;
  v_gate_name text;
  i integer;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  perform public.dkd_gate_load_demo_data_v0_2_1();

  select id into v_site_id
  from draborngate.dkd_gate_sites
  where is_demo and demo_owner_user_id=v_uid
  order by created_at desc limit 1;

  select id into v_main_gate_id
  from draborngate.dkd_gate_site_gates
  where site_id=v_site_id and is_demo
  order by created_at limit 1;

  select id into v_second_gate_id
  from draborngate.dkd_gate_site_gates
  where site_id=v_site_id and is_demo and id<>v_main_gate_id
  order by created_at limit 1;

  select id into v_resident_id
  from draborngate.dkd_gate_resident_profiles
  where site_id=v_site_id and is_demo
  order by created_at limit 1;

  update draborngate.dkd_gate_sites
  set name='DraBorn Park Evleri',address='Lara / Muratpaşa',city='Antalya',
      finance_summary_visible=true,updated_at=now()
  where id=v_site_id;

  update draborngate.dkd_gate_site_gates
  set name=case when id=v_main_gate_id then 'Ana Kapı' else 'Güney Kapısı' end,
      stage=case when id=v_main_gate_id then '1. Etap' else '2. Etap' end,
      entry_point=case when id=v_main_gate_id then 'Kuzey giriş' else 'Güney giriş' end,
      updated_at=now()
  where site_id=v_site_id and is_demo;

  for i in 0..20 loop
    v_created_at:=now()-((i%14)::text||' days')::interval-(((i*37)%12)::text||' hours')::interval;
    v_gate_id:=case when i%3=0 then coalesce(v_second_gate_id,v_main_gate_id) else v_main_gate_id end;
    v_gate_name:=case when i%3=0 then 'Güney Kapısı' else 'Ana Kapı' end;
    v_status:=case
      when i%10 in (0,1,2,3,4,5) then 'completed'
      when i%10=6 then 'approved'
      when i%10=7 then 'waiting'
      when i%10=8 then 'rejected'
      else 'arrived'
    end;

    insert into draborngate.dkd_gate_courier_passes(
      courier_user_id,site_id,gate_id,courier_name,courier_phone,courier_plate,
      platform,gate,customer_name,address_text,block,floor,apartment,order_number,
      note,status,eta_minutes,location_verified,last_distance_m,airpass_sent_at,
      arrived_at,completed_at,rejection_reason,created_at,is_demo,demo_owner_user_id
    )
    select v_uid,v_site_id,v_gate_id,
      coalesce(nullif(p.full_name,''),'Örnek Kurye'),p.phone,
      coalesce(nullif(c.plate,''),'07 DBG 030'),
      case i%4 when 0 then 'DraBornGo' when 1 then 'Trendyol Go' when 2 then 'Yemeksepeti' else 'Getir' end,
      v_gate_name,
      case i%4 when 0 then 'Ayşe Nur Demir' when 1 then 'Mehmet Kaya' when 2 then 'Selin Yılmaz' else 'Mert Aydın' end,
      'DraBorn Park Evleri teslimat adresi',
      case when i%2=0 then 'B Blok' else 'A Blok' end,
      ((i%7)+1)::text,((i%24)+1)::text,
      'DBG-V030-'||lpad((1000+i)::text,4,'0'),
      case when i%2=0 then 'Temassız teslimat' else 'Güvenliğe bırakılabilir' end,
      v_status,4+(i%8),i%4<>3,8+(i*7%90),
      case when i%4<>3 then v_created_at+interval '3 minutes' end,
      case when v_status in ('arrived','completed') then v_created_at+interval '7 minutes' end,
      case when v_status='completed' then v_created_at+((12+(i%16))::text||' minutes')::interval end,
      case when v_status='rejected' then 'Adres bilgisi teyit edilemedi' end,
      v_created_at,true,v_uid
    from draborngate.dkd_gate_profiles p
    left join draborngate.dkd_gate_courier_profiles c on c.user_id=p.user_id
    where p.user_id=v_uid
    returning id into v_pass_id;

    insert into draborngate.dkd_gate_pass_events(
      pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
    ) values(
      v_pass_id,v_uid,'created','Kurye geçişi oluşturuldu',v_gate_name||' • v0.3 rapor örneği','cyan','paper-plane',v_created_at,true,v_uid
    );

    if v_status in ('approved','arrived','completed') then
      insert into draborngate.dkd_gate_pass_events(
        pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
      ) values(v_pass_id,v_uid,'approved','Geçiş onaylandı','Güvenlik tarafından onaylandı','green','shield-checkmark',v_created_at+interval '3 minutes',true,v_uid);
    elsif v_status='rejected' then
      insert into draborngate.dkd_gate_pass_events(
        pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
      ) values(v_pass_id,v_uid,'rejected','Geçiş reddedildi','Adres bilgisi teyit edilemedi','red','close-circle',v_created_at+interval '4 minutes',true,v_uid);
    end if;

    if v_status='completed' then
      insert into draborngate.dkd_gate_pass_events(
        pass_id,actor_user_id,event_type,title,detail,tone,icon,created_at,is_demo,demo_owner_user_id
      ) values(v_pass_id,v_uid,'completed','Teslimat tamamlandı','Rapor için tamamlanmış örnek geçiş','purple','checkmark-done',v_created_at+((12+(i%16))::text||' minutes')::interval,true,v_uid);
    end if;
  end loop;

  for i in 0..10 loop
    insert into draborngate.dkd_gate_visitor_passes(
      resident_user_id,site_id,guest_name,guest_phone,plate,note,visitor_code,status,
      decided_at,completed_at,created_at,is_demo,demo_owner_user_id
    ) values(
      v_uid,v_site_id,'Örnek Misafir '||(i+1),'0555000'||lpad(i::text,4,'0'),'07 DEM '||lpad(i::text,2,'0'),
      'v0.3 ziyaretçi raporu','V3'||lpad(i::text,4,'0'),
      case when i%5=0 then 'rejected' when i%4=0 then 'waiting' when i%3=0 then 'completed' else 'approved' end,
      case when i%4<>0 then now()-(i||' days')::interval+interval '4 minutes' end,
      case when i%3=0 then now()-(i||' days')::interval+interval '50 minutes' end,
      now()-(i||' days')::interval,true,v_uid
    );
  end loop;

  insert into draborngate.dkd_gate_dues_periods(
    site_id,title,period_year,period_month,due_date,scope_type,amount,status,created_by,is_demo,demo_owner_user_id
  ) values(
    v_site_id,'Haziran 2026 Aidatı',2026,6,current_date-23,'site',1400,'closed',v_uid,true,v_uid
  ) returning id into v_previous_period_id;

  insert into draborngate.dkd_gate_dues_charges(
    period_id,site_id,resident_profile_id,resident_user_id,block,floor,apartment,amount,status,paid_at,payment_note,is_demo,demo_owner_user_id
  ) values(
    v_previous_period_id,v_site_id,v_resident_id,v_uid,'B Blok','3','18',1400,'paid',now()-interval '18 days','FAST ile ödendi',true,v_uid
  );

  insert into draborngate.dkd_gate_finance_transactions(
    site_id,transaction_type,category,description,amount,transaction_date,
    visible_to_residents,created_by,is_demo,demo_owner_user_id
  ) values
    (v_site_id,'income','Otopark','Misafir otopark geliri',3500,current_date-12,true,v_uid,true,v_uid),
    (v_site_id,'income','Aidat','Temmuz erken tahsilatlar',28500,current_date-5,true,v_uid,true,v_uid),
    (v_site_id,'expense','Güvenlik','Güvenlik ekipmanı',12750,current_date-9,true,v_uid,true,v_uid),
    (v_site_id,'expense','Peyzaj','Bahçe ve peyzaj bakımı',6200,current_date-3,true,v_uid,true,v_uid);

  insert into draborngate.dkd_gate_site_subscriptions(
    site_id,plan_code,status,billing_cycle,current_period_start,current_period_end,
    trial_started_at,trial_ends_at,cancel_at_period_end,source,notes
  ) values(
    v_site_id,'professional','trialing','monthly',now(),now()+interval '365 days',
    now(),now()+interval '365 days',false,'demo','v0.3 Profesyonel raporlama örnek paketi'
  )
  on conflict(site_id) do update set
    plan_code='professional',status='trialing',billing_cycle='monthly',
    current_period_start=now(),current_period_end=now()+interval '365 days',
    trial_started_at=now(),trial_ends_at=now()+interval '365 days',
    cancel_at_period_end=false,source='demo',notes='v0.3 Profesyonel raporlama örnek paketi',updated_at=now();

  update draborngate.dkd_gate_user_settings
  set demo_data_version='0.3.0',demo_loaded_at=now(),updated_at=now()
  where user_id=v_uid;

  insert into draborngate.dkd_gate_notifications(user_id,kind,title,body,data,is_demo,demo_owner_user_id)
  values(
    v_uid,'demo_v0_3_ready','DraBornGate v0.3.0 örnek verileri hazır',
    'Profesyonel paket, 14 günlük operasyon, ziyaretçi, aidat, finans ve raporlama örnekleri yüklendi.',
    jsonb_build_object('site_id',v_site_id,'plan_code','professional','version','0.3.0'),true,v_uid
  );

  return '0.3.0';
end;
$$;

revoke all on function public.dkd_gate_load_demo_data() from public,anon;
grant execute on function public.dkd_gate_load_demo_data() to authenticated;


begin;

update draborngate.dkd_gate_site_subscriptions
set source='admin',updated_at=now()
where source='payment';

alter table draborngate.dkd_gate_site_subscriptions
  drop constraint if exists dkd_gate_site_subscriptions_source_check;

alter table draborngate.dkd_gate_site_subscriptions
  add constraint dkd_gate_site_subscriptions_source_check
  check (source in ('system','trial','google_play','admin','demo'));

insert into draborngate.dkd_gate_schema_migrations(version,description,applied_at)
values('0.3.2-google-play-source','Paket kaynağı Google Play uyumlu hale getirildi',now())
on conflict(version) do update set description=excluded.description,applied_at=excluded.applied_at;

commit;

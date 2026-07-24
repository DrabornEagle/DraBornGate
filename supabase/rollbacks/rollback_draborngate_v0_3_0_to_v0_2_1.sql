
begin;

drop function if exists public.dkd_gate_get_courier_package_center();
drop table if exists draborngate.dkd_gate_courier_subscriptions cascade;
drop table if exists draborngate.dkd_gate_courier_subscription_plans cascade;
drop function if exists public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text);
drop function if exists public.dkd_gate_admin_subscription_dashboard();
drop function if exists public.dkd_gate_admin_update_subscription_plan(text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean);
drop function if exists public.dkd_gate_get_site_subscription_dashboard(uuid);
drop function if exists public.dkd_gate_get_subscription_plans();
drop function if exists public.dkd_gate_log_report_export(uuid,date,date,text,integer);
drop function if exists draborngate.dkd_gate_enforce_visitor_pass_limit();
drop function if exists draborngate.dkd_gate_enforce_courier_pass_limit();
drop function if exists draborngate.dkd_gate_enforce_member_limit();
drop function if exists draborngate.dkd_gate_enforce_gate_limit();
drop function if exists draborngate.dkd_gate_enforce_site_limit();
drop function if exists draborngate.dkd_gate_assign_site_subscription();
drop function if exists draborngate.dkd_gate_effective_plan(uuid);
drop function if exists draborngate.dkd_gate_effective_plan_code(uuid);
drop table if exists draborngate.dkd_gate_report_exports cascade;
drop table if exists draborngate.dkd_gate_trial_claims cascade;
drop table if exists draborngate.dkd_gate_site_subscriptions cascade;
drop table if exists draborngate.dkd_gate_subscription_plans cascade;

commit;

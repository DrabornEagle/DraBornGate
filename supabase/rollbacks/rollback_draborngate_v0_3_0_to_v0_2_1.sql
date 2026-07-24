begin;

-- DraBornGate v0.3 paket limit tetikleyicileri
DROP TRIGGER IF EXISTS dkd_gate_sites_assign_subscription ON draborngate.dkd_gate_sites;
DROP TRIGGER IF EXISTS dkd_gate_sites_plan_limit ON draborngate.dkd_gate_sites;
DROP TRIGGER IF EXISTS dkd_gate_site_gates_plan_limit ON draborngate.dkd_gate_site_gates;
DROP TRIGGER IF EXISTS dkd_gate_site_memberships_plan_limit ON draborngate.dkd_gate_site_memberships;
DROP TRIGGER IF EXISTS dkd_gate_courier_passes_plan_limit ON draborngate.dkd_gate_courier_passes;
DROP TRIGGER IF EXISTS dkd_gate_visitor_passes_plan_limit ON draborngate.dkd_gate_visitor_passes;
DROP TRIGGER IF EXISTS dkd_gate_subscription_plans_updated_at ON draborngate.dkd_gate_subscription_plans;
DROP TRIGGER IF EXISTS dkd_gate_site_subscriptions_updated_at ON draborngate.dkd_gate_site_subscriptions;
DROP TRIGGER IF EXISTS dkd_gate_subscription_payment_requests_updated_at ON draborngate.dkd_gate_subscription_payment_requests;

-- v0.3 public RPC işlevleri
DROP FUNCTION IF EXISTS public.dkd_gate_get_site_report(uuid,date,date);
DROP FUNCTION IF EXISTS public.dkd_gate_prepare_report_export(uuid,date,date);
DROP FUNCTION IF EXISTS public.dkd_gate_get_subscription_center(uuid);
DROP FUNCTION IF EXISTS public.dkd_gate_start_site_trial(uuid,text);
DROP FUNCTION IF EXISTS public.dkd_gate_submit_subscription_payment(uuid,text,text,text,text);
DROP FUNCTION IF EXISTS public.dkd_gate_cancel_subscription_payment(uuid);
DROP FUNCTION IF EXISTS public.dkd_gate_admin_get_monetization_center();
DROP FUNCTION IF EXISTS public.dkd_gate_admin_update_billing_settings(text,text,text,text,boolean);
DROP FUNCTION IF EXISTS public.dkd_gate_admin_upsert_subscription_plan(text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,integer,boolean,boolean,boolean,boolean,integer,boolean,boolean,integer);
DROP FUNCTION IF EXISTS public.dkd_gate_admin_decide_subscription_payment(uuid,text,text);
DROP FUNCTION IF EXISTS public.dkd_gate_admin_set_site_subscription(uuid,text,text,integer,text);

-- v0.3 iç işlevleri
DROP FUNCTION IF EXISTS draborngate.dkd_gate_csv_escape(text);
DROP FUNCTION IF EXISTS draborngate.dkd_gate_refresh_subscription_statuses();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_generate_subscription_reminders_for_user(uuid);
DROP FUNCTION IF EXISTS draborngate.dkd_gate_enforce_site_limit();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_enforce_gate_limit();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_enforce_member_limit();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_enforce_courier_pass_limit();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_enforce_visitor_pass_limit();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_assign_site_subscription();
DROP FUNCTION IF EXISTS draborngate.dkd_gate_effective_plan(uuid);
DROP FUNCTION IF EXISTS draborngate.dkd_gate_effective_plan_code(uuid);

-- v0.3 tabloları
DROP TABLE IF EXISTS draborngate.dkd_gate_subscription_invoices;
DROP TABLE IF EXISTS draborngate.dkd_gate_subscription_payment_requests;
DROP TABLE IF EXISTS draborngate.dkd_gate_report_exports;
DROP TABLE IF EXISTS draborngate.dkd_gate_audit_logs;
DROP TABLE IF EXISTS draborngate.dkd_gate_trial_claims;
DROP TABLE IF EXISTS draborngate.dkd_gate_site_subscriptions;
DROP TABLE IF EXISTS draborngate.dkd_gate_billing_settings;
DROP TABLE IF EXISTS draborngate.dkd_gate_subscription_plans;
DROP SEQUENCE IF EXISTS draborngate.dkd_gate_invoice_seq;

-- v0.2.1 örnek veri yükleyicisini geri getir
DROP FUNCTION IF EXISTS public.dkd_gate_load_demo_data();
ALTER FUNCTION public.dkd_gate_load_demo_data_v0_2_1() RENAME TO dkd_gate_load_demo_data;
REVOKE ALL ON FUNCTION public.dkd_gate_load_demo_data() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.dkd_gate_load_demo_data() TO authenticated;

DELETE FROM draborngate.dkd_gate_app_releases WHERE version='0.3.0';
DELETE FROM draborngate.dkd_gate_schema_migrations WHERE version='0.3.0';

commit;

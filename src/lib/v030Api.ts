import { supabase } from './supabase';

export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SubscriptionPlan {
  code: string;
  name: string;
  tagline: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  site_limit: number;
  gate_limit: number;
  staff_limit: number;
  resident_limit: number;
  monthly_courier_pass_limit: number;
  monthly_visitor_pass_limit: number;
  report_days_limit: number;
  allow_export: boolean;
  advanced_finance: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  trial_days: number;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface SiteSubscription {
  id: string;
  site_id: string;
  plan_code: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  cancel_at_period_end: boolean;
  source: string;
  notes?: string | null;
}

export interface SubscriptionPaymentRequest {
  id: string;
  site_id: string;
  site_name?: string;
  plan_code: string;
  plan_name?: string;
  requested_by: string;
  requester_name?: string;
  email?: string;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  bank_reference?: string | null;
  receipt_path?: string | null;
  status: PaymentRequestStatus;
  admin_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  invoice_number?: string | null;
  invoice_status?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  site_id: string;
  plan_code: string;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  status: 'paid' | 'cancelled';
  period_start: string;
  period_end: string;
  issued_at: string;
}

export interface BillingSettings {
  singleton: boolean;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  instructions?: string | null;
  is_active: boolean;
  updated_at?: string | null;
}

export interface SubscriptionUsage {
  sites: number;
  gates: number;
  staff: number;
  residents: number;
  monthly_courier_passes: number;
  monthly_visitor_passes: number;
  monthly_report_exports: number;
}

export interface SiteSubscriptionDashboard {
  site_id: string;
  subscription: SiteSubscription;
  plan: SubscriptionPlan;
  pending_request?: SubscriptionPaymentRequest | null;
  latest_invoice?: SubscriptionInvoice | null;
  invoices: SubscriptionInvoice[];
  payments: SubscriptionPaymentRequest[];
  billing: BillingSettings;
  usage: SubscriptionUsage;
}

export interface SiteReportSummary {
  courier_total: number;
  waiting: number;
  approved: number;
  rejected: number;
  arrived: number;
  completed: number;
  cancelled: number;
  expired: number;
  approval_rate: number;
  rejection_rate: number;
  completion_rate: number;
  airpass_rate: number;
  average_eta_minutes: number;
  average_completion_minutes: number;
  average_approval_minutes: number;
  visitor_total: number;
  visitor_waiting: number;
  visitor_approved: number;
  visitor_rejected: number;
  visitor_completed: number;
  income: number;
  expense: number;
  balance: number;
  dues_total: number;
  dues_paid: number;
  dues_unpaid: number;
  dues_collection_rate: number;
}

export interface SiteReport {
  site_id: string;
  date_from: string;
  date_to: string;
  requested_date_from: string;
  range_was_limited: boolean;
  plan: SubscriptionPlan;
  subscription: SiteSubscription;
  summary: SiteReportSummary;
  daily: Array<{ date: string; courier: number; completed: number; rejected: number; visitor: number }>;
  hourly: Array<{ hour: number; total: number }>;
  gates: Array<{ gate: string; total: number; completed: number; rejected: number; completion_rate: number; average_minutes: number }>;
  platforms: Array<{ platform: string; total: number; completed: number; rejected: number }>;
  couriers: Array<{ courier_user_id?: string; courier_name: string; platform: string; total: number; completed: number; rejected: number; average_minutes: number }>;
  security: Array<{ actor_user_id?: string; full_name: string; approved: number; rejected: number; completed: number; total_actions: number; average_decision_minutes: number }>;
  finance_categories: Array<{ category: string; income: number; expense: number; balance: number }>;
  usage: Record<string, { used: number; limit: number }>;
}

export interface ReportExport {
  id: string;
  date_from: string;
  date_to: string;
  row_count: number;
  csv: string;
}

export interface AdminSubscriptionDashboard {
  total_revenue: number;
  revenue_this_month: number;
  estimated_monthly_revenue: number;
  paid_sites: number;
  trial_sites: number;
  starter_sites: number;
  pending_requests: number;
  plans: Array<{ code: string; name: string; site_count: number }>;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlan(raw: Record<string, unknown>): SubscriptionPlan {
  return {
    code: String(raw.code ?? ''),
    name: String(raw.name ?? ''),
    tagline: String(raw.tagline ?? ''),
    description: String(raw.description ?? ''),
    monthly_price: numberValue(raw.monthly_price),
    yearly_price: numberValue(raw.yearly_price),
    currency: String(raw.currency ?? 'TRY'),
    site_limit: numberValue(raw.site_limit),
    gate_limit: numberValue(raw.gate_limit),
    staff_limit: numberValue(raw.staff_limit),
    resident_limit: numberValue(raw.resident_limit),
    monthly_courier_pass_limit: numberValue(raw.monthly_courier_pass_limit),
    monthly_visitor_pass_limit: numberValue(raw.monthly_visitor_pass_limit),
    report_days_limit: numberValue(raw.report_days_limit),
    allow_export: raw.allow_export === true,
    advanced_finance: raw.advanced_finance === true,
    priority_support: raw.priority_support === true,
    custom_branding: raw.custom_branding === true,
    trial_days: numberValue(raw.trial_days),
    is_public: raw.is_public !== false,
    is_active: raw.is_active !== false,
    sort_order: numberValue(raw.sort_order),
  };
}

function normalizeBilling(raw: unknown): BillingSettings {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    singleton: value.singleton !== false,
    bank_name: value.bank_name == null ? null : String(value.bank_name),
    account_holder: value.account_holder == null ? null : String(value.account_holder),
    iban: value.iban == null ? null : String(value.iban),
    instructions: value.instructions == null ? null : String(value.instructions),
    is_active: value.is_active === true,
    updated_at: value.updated_at == null ? null : String(value.updated_at),
  };
}

function normalizeUsage(raw: unknown): SubscriptionUsage {
  const value = (raw ?? {}) as Record<string, unknown>;
  const nested = (key: string) => {
    const item = value[key];
    if (typeof item === 'object' && item !== null) return numberValue((item as Record<string, unknown>).used);
    return numberValue(item);
  };
  return {
    sites: nested('sites'),
    gates: nested('gates'),
    staff: nested('staff'),
    residents: nested('residents'),
    monthly_courier_passes: nested('monthly_courier_passes') || nested('courier_passes_month'),
    monthly_visitor_passes: nested('monthly_visitor_passes') || nested('visitor_passes_month'),
    monthly_report_exports: nested('monthly_report_exports'),
  };
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase.rpc('dkd_gate_get_subscription_plans');
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((item) => normalizePlan(item as Record<string, unknown>));
}

export async function getSiteSubscriptionDashboard(siteId: string): Promise<SiteSubscriptionDashboard> {
  const [centerResult, dashboardResult] = await Promise.all([
    supabase.rpc('dkd_gate_get_subscription_center', { p_site_id: siteId }),
    supabase.rpc('dkd_gate_get_site_subscription_dashboard', { p_site_id: siteId }),
  ]);
  if (centerResult.error) throw centerResult.error;
  if (dashboardResult.error) throw dashboardResult.error;
  const center = (centerResult.data ?? {}) as Record<string, unknown>;
  const dashboard = (dashboardResult.data ?? {}) as Record<string, unknown>;
  const payments = Array.isArray(center.payments) ? center.payments as SubscriptionPaymentRequest[] : [];
  const invoices = Array.isArray(dashboard.invoices) ? dashboard.invoices as SubscriptionInvoice[] : [];
  return {
    site_id: String(center.site_id ?? dashboard.site_id ?? siteId),
    subscription: (center.subscription ?? dashboard.subscription ?? {}) as SiteSubscription,
    plan: normalizePlan((center.effective_plan ?? dashboard.plan ?? {}) as Record<string, unknown>),
    pending_request: payments.find((item) => item.status === 'pending') ?? (dashboard.pending_request ?? null) as SubscriptionPaymentRequest | null,
    latest_invoice: (dashboard.latest_invoice ?? invoices[0] ?? null) as SubscriptionInvoice | null,
    invoices,
    payments,
    billing: normalizeBilling(center.billing),
    usage: normalizeUsage(center.usage ?? dashboard.usage),
  };
}

export async function createSubscriptionPaymentRequest(input: {
  siteId: string;
  planCode: string;
  billingCycle: BillingCycle;
  bankReference?: string;
  receiptPath: string;
}) {
  const { data, error } = await supabase.rpc('dkd_gate_submit_subscription_payment', {
    p_site_id: input.siteId,
    p_plan_code: input.planCode,
    p_billing_cycle: input.billingCycle,
    p_bank_reference: input.bankReference?.trim() || null,
    p_receipt_path: input.receiptPath.trim(),
  });
  if (error) throw error;
  return String(data);
}

export async function cancelSubscriptionPaymentRequest(requestId: string) {
  const { error } = await supabase.rpc('dkd_gate_cancel_subscription_payment', { p_request_id: requestId });
  if (error) throw error;
}

export async function setSubscriptionCancellation(siteId: string, cancel: boolean) {
  const { data, error } = await supabase.rpc('dkd_gate_set_subscription_cancellation', {
    p_site_id: siteId,
    p_cancel: cancel,
  });
  if (error) throw error;
  return data as SiteSubscription;
}

export async function startSiteTrial(siteId: string, planCode = 'professional') {
  const { data, error } = await supabase.rpc('dkd_gate_start_site_trial', {
    p_site_id: siteId,
    p_plan_code: planCode,
  });
  if (error) throw error;
  return data as SiteSubscription;
}

export async function getSiteReport(siteId: string, dateFrom: string, dateTo: string): Promise<SiteReport> {
  const { data, error } = await supabase.rpc('dkd_gate_get_site_report', {
    p_site_id: siteId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });
  if (error) throw error;
  const raw = (data ?? {}) as SiteReport;
  raw.plan = normalizePlan((raw.plan ?? {}) as unknown as Record<string, unknown>);
  return raw;
}

export async function prepareReportExport(siteId: string, dateFrom: string, dateTo: string): Promise<ReportExport> {
  const { data, error } = await supabase.rpc('dkd_gate_prepare_report_export', {
    p_site_id: siteId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });
  if (error) throw error;
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ''),
    date_from: String(raw.date_from ?? dateFrom),
    date_to: String(raw.date_to ?? dateTo),
    row_count: numberValue(raw.row_count),
    csv: String(raw.csv ?? ''),
  };
}

export async function getAdminSubscriptionDashboard(): Promise<AdminSubscriptionDashboard> {
  const { data, error } = await supabase.rpc('dkd_gate_admin_subscription_dashboard');
  if (error) throw error;
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    total_revenue: numberValue(raw.total_revenue),
    revenue_this_month: numberValue(raw.revenue_this_month),
    estimated_monthly_revenue: numberValue(raw.estimated_monthly_revenue),
    paid_sites: numberValue(raw.paid_sites),
    trial_sites: numberValue(raw.trial_sites),
    starter_sites: numberValue(raw.starter_sites),
    pending_requests: numberValue(raw.pending_requests),
    plans: Array.isArray(raw.plans) ? raw.plans as AdminSubscriptionDashboard['plans'] : [],
  };
}

export async function getAdminPaymentRequests(): Promise<SubscriptionPaymentRequest[]> {
  const { data, error } = await supabase.rpc('dkd_gate_admin_list_subscription_payment_requests');
  if (error) throw error;
  return Array.isArray(data) ? data as SubscriptionPaymentRequest[] : [];
}

export async function decideSubscriptionPaymentRequest(requestId: string, status: 'approved' | 'rejected', adminNote?: string) {
  const { data, error } = await supabase.rpc('dkd_gate_admin_decide_subscription_payment', {
    p_request_id: requestId,
    p_status: status,
    p_admin_note: adminNote?.trim() || null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function updateSubscriptionPlan(plan: SubscriptionPlan) {
  const { error } = await supabase.rpc('dkd_gate_admin_update_subscription_plan', {
    p_code: plan.code,
    p_name: plan.name,
    p_tagline: plan.tagline,
    p_description: plan.description,
    p_monthly_price: plan.monthly_price,
    p_yearly_price: plan.yearly_price,
    p_site_limit: plan.site_limit,
    p_gate_limit: plan.gate_limit,
    p_staff_limit: plan.staff_limit,
    p_resident_limit: plan.resident_limit,
    p_monthly_courier_pass_limit: plan.monthly_courier_pass_limit,
    p_monthly_visitor_pass_limit: plan.monthly_visitor_pass_limit,
    p_report_days_limit: plan.report_days_limit,
    p_allow_export: plan.allow_export,
    p_advanced_finance: plan.advanced_finance,
    p_priority_support: plan.priority_support,
    p_custom_branding: plan.custom_branding,
    p_trial_days: plan.trial_days,
    p_is_public: plan.is_public,
    p_is_active: plan.is_active,
  });
  if (error) throw error;
}

export async function getAdminBillingSettings(): Promise<BillingSettings> {
  const { data, error } = await supabase.rpc('dkd_gate_admin_get_billing_settings');
  if (error) throw error;
  return normalizeBilling(data);
}

export async function updateBillingSettings(settings: BillingSettings) {
  const { error } = await supabase.rpc('dkd_gate_admin_update_billing_settings', {
    p_bank_name: settings.bank_name?.trim() || null,
    p_account_holder: settings.account_holder?.trim() || null,
    p_iban: settings.iban?.replace(/\s+/g, '').toUpperCase() || null,
    p_instructions: settings.instructions?.trim() || null,
    p_is_active: settings.is_active,
  });
  if (error) throw error;
}

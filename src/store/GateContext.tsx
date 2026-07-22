import type { Session, User } from '@supabase/supabase-js';
import React, { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { prepareGateNotifications, showGateNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import {
  ActivityItem,
  CourierPass,
  CourierProfile,
  CreateDuesInput,
  CreateFinanceInput,
  CreatePassInput,
  CreateVisitorInput,
  DeliveryPlatform,
  DuesCharge,
  DuesPeriod,
  FinanceTransaction,
  GateNotification,
  GateProfile,
  GateRelease,
  GateSettings,
  GateSite,
  PassStatus,
  ResidentProfile,
  RuleAcceptance,
  RuleAudience,
  RuleScope,
  SiteGate,
  SiteRule,
  UserRole,
  VisitorPass,
  VisitorStatus,
} from '../types';

interface BootstrapPayload {
  profile?: Record<string, unknown> | null;
  courierProfile?: Record<string, unknown> | null;
  residentProfiles?: Array<Record<string, unknown>> | null;
  sites?: Array<Record<string, unknown>> | null;
  gates?: Array<Record<string, unknown>> | null;
  passes?: Array<Record<string, unknown>> | null;
  events?: Array<Record<string, unknown>> | null;
  rules?: Array<Record<string, unknown>> | null;
  ruleAcceptances?: Array<Record<string, unknown>> | null;
  visitors?: Array<Record<string, unknown>> | null;
  notifications?: Array<Record<string, unknown>> | null;
  duesPeriods?: Array<Record<string, unknown>> | null;
  duesCharges?: Array<Record<string, unknown>> | null;
  financeTransactions?: Array<Record<string, unknown>> | null;
  settings?: Record<string, unknown> | null;
  release?: Record<string, unknown> | null;
}

interface UpdateRuleInput {
  siteId: string;
  gateId?: string;
  audience: RuleAudience;
  scopeType: RuleScope;
  title: string;
  body: string;
  startsAt?: string;
  endsAt?: string;
  isCritical: boolean;
  existingRuleId?: string;
}

interface GateContextValue {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  loading: boolean;
  refreshing: boolean;
  error?: string;
  profile?: GateProfile;
  courierProfile?: CourierProfile;
  residentProfiles: ResidentProfile[];
  sites: GateSite[];
  gates: SiteGate[];
  passes: CourierPass[];
  activities: ActivityItem[];
  rules: SiteRule[];
  ruleAcceptances: RuleAcceptance[];
  visitors: VisitorPass[];
  notifications: GateNotification[];
  duesPeriods: DuesPeriod[];
  duesCharges: DuesCharge[];
  financeTransactions: FinanceTransaction[];
  settings?: GateSettings;
  release?: GateRelease;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: { fullName: string; phone?: string; preferredRole: UserRole; platform?: DeliveryPlatform; plate?: string; avatarUrl?: string }) => Promise<void>;
  upsertResidentProfile: (input: { siteId: string; block: string; floor: string; apartment: string; addressNote?: string }) => Promise<string>;
  createPass: (input: CreatePassInput) => Promise<string>;
  updatePassStatus: (id: string, status: PassStatus, rejectionReason?: string, code?: string) => Promise<string | undefined>;
  retryPass: (id: string) => Promise<string>;
  updateAirPass: (id: string, latitude: number, longitude: number, distanceM: number, send: boolean) => Promise<void>;
  acceptRule: (ruleId: string, passType: 'courier' | 'visitor', passId?: string) => Promise<string>;
  upsertRule: (input: UpdateRuleInput) => Promise<string>;
  createVisitor: (input: CreateVisitorInput) => Promise<{ id: string; code: string }>;
  decideVisitor: (code: string, status: VisitorStatus, rejectionReason?: string) => Promise<string>;
  createDuesPeriod: (input: CreateDuesInput) => Promise<string>;
  markDuePaid: (chargeId: string, paid: boolean, note?: string) => Promise<void>;
  addFinanceTransaction: (input: CreateFinanceInput) => Promise<string>;
  setFinanceVisibility: (siteId: string, visible: boolean) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  loadDemoData: () => Promise<string>;
  deleteDemoData: () => Promise<void>;
}

const GateContext = createContext<GateContextValue | null>(null);
const stringValue = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const optionalString = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);
const numberValue = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : Number(value ?? fallback) || fallback);
const booleanValue = (value: unknown, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const arrayValue = (value: unknown) => (Array.isArray(value) ? value : []);
const dateValue = (value: unknown) => stringValue(value, new Date().toISOString());

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
}

function mapProfile(row: Record<string, unknown> | null | undefined, user: User): GateProfile {
  const role = stringValue(row?.preferred_role, 'courier');
  return {
    userId: stringValue(row?.user_id, user.id),
    fullName: stringValue(row?.full_name) || stringValue(user.user_metadata?.full_name) || user.email?.split('@')[0] || 'DraBornGate Kullanıcısı',
    phone: optionalString(row?.phone) ?? optionalString(user.phone),
    preferredRole: ['courier', 'security', 'management', 'resident'].includes(role) ? (role as UserRole) : 'courier',
    avatarUrl: optionalString(row?.avatar_url),
  };
}

function mapCourierProfile(row: Record<string, unknown> | null | undefined, userId: string): CourierProfile {
  const platform = stringValue(row?.platform, 'DraBornGo');
  return {
    userId: stringValue(row?.user_id, userId),
    platform: ['Trendyol Go', 'Yemeksepeti', 'Getir', 'DraBornGo', 'Diğer'].includes(platform) ? (platform as DeliveryPlatform) : 'DraBornGo',
    plate: stringValue(row?.plate),
    rating: numberValue(row?.rating, 5),
    completedToday: numberValue(row?.completed_today, 0),
    avatarUrl: optionalString(row?.avatar_url),
  };
}

function mapSite(row: Record<string, unknown>): GateSite {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name, 'İsimsiz site'),
    address: optionalString(row.address),
    city: optionalString(row.city),
    gateNames: arrayValue(row.gate_names).filter((item): item is string => typeof item === 'string'),
    latitude: row.latitude == null ? undefined : numberValue(row.latitude),
    longitude: row.longitude == null ? undefined : numberValue(row.longitude),
    financeSummaryVisible: booleanValue(row.finance_summary_visible),
    isDemo: booleanValue(row.is_demo),
  };
}

function mapGate(row: Record<string, unknown>): SiteGate {
  return {
    id: stringValue(row.id),
    siteId: stringValue(row.site_id),
    name: stringValue(row.name),
    stage: optionalString(row.stage),
    entryPoint: optionalString(row.entry_point),
    latitude: row.latitude == null ? undefined : numberValue(row.latitude),
    longitude: row.longitude == null ? undefined : numberValue(row.longitude),
    airpassEnabled: booleanValue(row.airpass_enabled, true),
    isDemo: booleanValue(row.is_demo),
  };
}

function mapResident(row: Record<string, unknown>): ResidentProfile {
  return {
    id: stringValue(row.id), userId: stringValue(row.user_id), siteId: stringValue(row.site_id), block: stringValue(row.block), floor: stringValue(row.floor), apartment: stringValue(row.apartment),
    addressNote: optionalString(row.address_note), isActive: booleanValue(row.is_active, true), isDemo: booleanValue(row.is_demo),
  };
}

function mapRule(row: Record<string, unknown>): SiteRule {
  return {
    id: stringValue(row.id), siteId: stringValue(row.site_id), gateId: optionalString(row.gate_id), audience: stringValue(row.audience, 'all') as RuleAudience,
    scopeType: stringValue(row.scope_type, 'site') as RuleScope, title: stringValue(row.title), body: stringValue(row.body), startsAt: dateValue(row.starts_at),
    endsAt: optionalString(row.ends_at), isCritical: booleanValue(row.is_critical), version: numberValue(row.version, 1), supersedesRuleId: optionalString(row.supersedes_rule_id),
    isActive: booleanValue(row.is_active, true), createdAt: dateValue(row.created_at), isDemo: booleanValue(row.is_demo),
  };
}

function mapAcceptance(row: Record<string, unknown>): RuleAcceptance {
  return { id: stringValue(row.id), ruleId: stringValue(row.rule_id), userId: stringValue(row.user_id), passType: stringValue(row.pass_type) as 'courier' | 'visitor', passId: optionalString(row.pass_id), ruleVersion: numberValue(row.rule_version, 1), acceptedAt: dateValue(row.accepted_at) };
}

function mapPass(row: Record<string, unknown>, sitesById: Map<string, GateSite>): CourierPass {
  const siteId = stringValue(row.site_id);
  const platform = stringValue(row.platform, 'DraBornGo');
  const status = stringValue(row.status, 'waiting');
  return {
    id: stringValue(row.id), siteId, gateId: optionalString(row.gate_id), courierUserId: optionalString(row.courier_user_id), courierName: stringValue(row.courier_name, 'Kurye'), phone: optionalString(row.courier_phone), plate: stringValue(row.courier_plate),
    platform: ['Trendyol Go', 'Yemeksepeti', 'Getir', 'DraBornGo', 'Diğer'].includes(platform) ? (platform as DeliveryPlatform) : 'Diğer', site: sitesById.get(siteId)?.name ?? 'Site', gate: stringValue(row.gate),
    customerName: optionalString(row.customer_name), addressText: optionalString(row.address_text), block: stringValue(row.block), floor: optionalString(row.floor), apartment: stringValue(row.apartment), orderNumber: stringValue(row.order_number), note: stringValue(row.note),
    screenshotUri: optionalString(row.screenshot_url) ?? optionalString(row.screenshot_path), ocrText: optionalString(row.ocr_text), ocrStatus: stringValue(row.ocr_status, 'manual') as CourierPass['ocrStatus'], createdAt: dateValue(row.created_at), etaMinutes: numberValue(row.eta_minutes),
    status: ['waiting', 'approved', 'rejected', 'arrived', 'completed', 'cancelled', 'expired'].includes(status) ? (status as PassStatus) : 'waiting', approvalCode: optionalString(row.approval_code), rejectionReason: optionalString(row.rejection_reason),
    rulesVersion: row.rules_version == null ? undefined : numberValue(row.rules_version), rulesAcceptedAt: optionalString(row.rules_accepted_at), locationVerified: booleanValue(row.location_verified), latitude: row.latitude == null ? undefined : numberValue(row.latitude), longitude: row.longitude == null ? undefined : numberValue(row.longitude),
    lastDistanceM: row.last_distance_m == null ? undefined : numberValue(row.last_distance_m), airpassSentAt: optionalString(row.airpass_sent_at), arrivedAt: optionalString(row.arrived_at), completedAt: optionalString(row.completed_at), retryOfPassId: optionalString(row.retry_of_pass_id), isDemo: booleanValue(row.is_demo),
  };
}

function mapActivity(row: Record<string, unknown>): ActivityItem {
  const tone = stringValue(row.tone, 'cyan') as ActivityItem['tone'];
  const createdAt = dateValue(row.created_at);
  return { id: stringValue(row.id), passId: stringValue(row.pass_id), title: stringValue(row.title, 'Geçiş hareketi'), detail: stringValue(row.detail), time: relativeTime(createdAt), tone, icon: stringValue(row.icon, 'navigate'), createdAt, isDemo: booleanValue(row.is_demo) };
}

function mapVisitor(row: Record<string, unknown>): VisitorPass {
  return { id: stringValue(row.id), residentUserId: stringValue(row.resident_user_id), siteId: stringValue(row.site_id), guestName: stringValue(row.guest_name), guestPhone: optionalString(row.guest_phone), plate: optionalString(row.plate), note: optionalString(row.note), visitorCode: stringValue(row.visitor_code), status: stringValue(row.status, 'waiting') as VisitorStatus, rejectionReason: optionalString(row.rejection_reason), decidedAt: optionalString(row.decided_at), completedAt: optionalString(row.completed_at), createdAt: dateValue(row.created_at), isDemo: booleanValue(row.is_demo) };
}

function mapNotification(row: Record<string, unknown>): GateNotification {
  return { id: stringValue(row.id), userId: stringValue(row.user_id), kind: stringValue(row.kind), title: stringValue(row.title), body: stringValue(row.body), data: (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>, readAt: optionalString(row.read_at), createdAt: dateValue(row.created_at), isDemo: booleanValue(row.is_demo) };
}

function mapDuesPeriod(row: Record<string, unknown>): DuesPeriod {
  return { id: stringValue(row.id), siteId: stringValue(row.site_id), title: stringValue(row.title), periodYear: numberValue(row.period_year), periodMonth: numberValue(row.period_month), dueDate: stringValue(row.due_date), scopeType: stringValue(row.scope_type, 'site') as DuesPeriod['scopeType'], scopeBlock: optionalString(row.scope_block), scopeApartment: optionalString(row.scope_apartment), amount: numberValue(row.amount), status: stringValue(row.status, 'active') as DuesPeriod['status'], createdAt: dateValue(row.created_at), isDemo: booleanValue(row.is_demo) };
}

function mapDuesCharge(row: Record<string, unknown>): DuesCharge {
  return { id: stringValue(row.id), periodId: stringValue(row.period_id), siteId: stringValue(row.site_id), residentProfileId: optionalString(row.resident_profile_id), residentUserId: optionalString(row.resident_user_id), block: stringValue(row.block), floor: optionalString(row.floor), apartment: stringValue(row.apartment), amount: numberValue(row.amount), status: stringValue(row.status, 'unpaid') as DuesCharge['status'], paidAt: optionalString(row.paid_at), paymentNote: optionalString(row.payment_note), reminderSentAt: optionalString(row.reminder_sent_at), createdAt: dateValue(row.created_at), isDemo: booleanValue(row.is_demo) };
}

function mapFinance(row: Record<string, unknown>): FinanceTransaction {
  return { id: stringValue(row.id), siteId: stringValue(row.site_id), transactionType: stringValue(row.transaction_type, 'income') as FinanceTransaction['transactionType'], category: stringValue(row.category), description: stringValue(row.description), amount: numberValue(row.amount), transactionDate: stringValue(row.transaction_date), visibleToResidents: booleanValue(row.visible_to_residents, true), createdAt: dateValue(row.created_at), isDemo: booleanValue(row.is_demo) };
}

export function GateProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [profile, setProfile] = useState<GateProfile>();
  const [courierProfile, setCourierProfile] = useState<CourierProfile>();
  const [residentProfiles, setResidentProfiles] = useState<ResidentProfile[]>([]);
  const [sites, setSites] = useState<GateSite[]>([]);
  const [gates, setGates] = useState<SiteGate[]>([]);
  const [passes, setPasses] = useState<CourierPass[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [rules, setRules] = useState<SiteRule[]>([]);
  const [ruleAcceptances, setRuleAcceptances] = useState<RuleAcceptance[]>([]);
  const [visitors, setVisitors] = useState<VisitorPass[]>([]);
  const [notifications, setNotifications] = useState<GateNotification[]>([]);
  const [duesPeriods, setDuesPeriods] = useState<DuesPeriod[]>([]);
  const [duesCharges, setDuesCharges] = useState<DuesCharge[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [settings, setSettings] = useState<GateSettings>();
  const [release, setRelease] = useState<GateRelease>();
  const sessionRef = useRef<Session | null>(null);
  const firstNotificationLoad = useRef(true);
  const latestNotificationId = useRef<string>();

  const clearData = useCallback(() => {
    setProfile(undefined); setCourierProfile(undefined); setResidentProfiles([]); setSites([]); setGates([]); setPasses([]); setActivities([]); setRules([]); setRuleAcceptances([]); setVisitors([]); setNotifications([]); setDuesPeriods([]); setDuesCharges([]); setFinanceTransactions([]); setSettings(undefined); setRelease(undefined); setError(undefined);
    firstNotificationLoad.current = true; latestNotificationId.current = undefined;
  }, []);

  const refresh = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    setRefreshing(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('dkd_gate_bootstrap');
      if (rpcError) throw rpcError;
      const payload = (data ?? {}) as BootstrapPayload;
      const mappedSites = (payload.sites ?? []).map(mapSite);
      const sitesById = new Map(mappedSites.map((site) => [site.id, site]));
      setProfile(mapProfile(payload.profile, activeSession.user));
      setCourierProfile(mapCourierProfile(payload.courierProfile, activeSession.user.id));
      setResidentProfiles((payload.residentProfiles ?? []).map(mapResident));
      setSites(mappedSites);
      setGates((payload.gates ?? []).map(mapGate));
      setPasses((payload.passes ?? []).map((row) => mapPass(row, sitesById)));
      setActivities((payload.events ?? []).map(mapActivity));
      setRules((payload.rules ?? []).map(mapRule));
      setRuleAcceptances((payload.ruleAcceptances ?? []).map(mapAcceptance));
      setVisitors((payload.visitors ?? []).map(mapVisitor));
      setNotifications((payload.notifications ?? []).map(mapNotification));
      setDuesPeriods((payload.duesPeriods ?? []).map(mapDuesPeriod));
      setDuesCharges((payload.duesCharges ?? []).map(mapDuesCharge));
      setFinanceTransactions((payload.financeTransactions ?? []).map(mapFinance));
      setSettings(payload.settings ? { demoDataVersion: optionalString(payload.settings.demo_data_version), demoLoadedAt: optionalString(payload.settings.demo_loaded_at), airpassEnabled: booleanValue(payload.settings.airpass_enabled, true), notificationsEnabled: booleanValue(payload.settings.notifications_enabled, true), financeNotificationsEnabled: booleanValue(payload.settings.finance_notifications_enabled, true) } : undefined);
      setRelease(payload.release ? { version: stringValue(payload.release.version, '0.2.0'), androidVersionCode: numberValue(payload.release.android_version_code, 1), demoDataVersion: stringValue(payload.release.demo_data_version, '0.2.0'), notes: stringValue(payload.release.notes) } : undefined);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Supabase verileri alınamadı.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError) setError(authError.message);
      sessionRef.current = data.session; setSession(data.session); setInitialized(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      sessionRef.current = nextSession; setSession(nextSession); if (!nextSession) clearData();
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [clearData]);

  useEffect(() => {
    if (!session) return;
    void prepareGateNotifications().catch(() => undefined);
    void refresh();
    const refreshTables = ['dkd_gate_courier_passes', 'dkd_gate_pass_events', 'dkd_gate_visitor_passes', 'dkd_gate_notifications', 'dkd_gate_dues_charges', 'dkd_gate_dues_periods', 'dkd_gate_finance_transactions', 'dkd_gate_site_rules'];
    let channel = supabase.channel(`dkd-gate-v02-${session.user.id}`);
    refreshTables.forEach((table) => { channel = channel.on('postgres_changes', { event: '*', schema: 'draborngate', table }, () => void refresh()); });
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, session]);

  useEffect(() => {
    const latest = notifications[0];
    if (!latest) return;
    if (firstNotificationLoad.current) { firstNotificationLoad.current = false; latestNotificationId.current = latest.id; return; }
    if (latest.id !== latestNotificationId.current && !latest.readAt && settings?.notificationsEnabled !== false) {
      latestNotificationId.current = latest.id;
      void showGateNotification(latest.title, latest.body, { notificationId: latest.id, kind: latest.kind }).catch(() => undefined);
    }
  }, [notifications, settings?.notificationsEnabled]);

  const run = useCallback(async <T,>(work: () => Promise<T>) => { setLoading(true); setError(undefined); try { return await work(); } finally { setLoading(false); } }, []);
  const rpcRefresh = useCallback(async <T,>(name: string, params?: Record<string, unknown>) => run(async () => { const { data, error: rpcError } = await supabase.rpc(name, params); if (rpcError) throw rpcError; await refresh(); return data as T; }), [refresh, run]);

  const signIn = useCallback((email: string, password: string) => run(async () => { const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); if (authError) throw authError; }), [run]);
  const signUp = useCallback((fullName: string, email: string, password: string) => run(async () => { const { data, error: authError } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: fullName.trim(), source_app: 'DraBornGate' } } }); if (authError) throw authError; return { needsEmailConfirmation: !data.session }; }), [run]);
  const signOut = useCallback(() => run(async () => { const { error: authError } = await supabase.auth.signOut(); if (authError) throw authError; }), [run]);

  const updateProfile = useCallback((input: { fullName: string; phone?: string; preferredRole: UserRole; platform?: DeliveryPlatform; plate?: string; avatarUrl?: string }) => rpcRefresh<void>('dkd_gate_update_profile', { p_full_name: input.fullName, p_phone: input.phone ?? null, p_preferred_role: input.preferredRole, p_platform: input.platform ?? courierProfile?.platform ?? 'DraBornGo', p_plate: input.plate ?? courierProfile?.plate ?? '', p_avatar_url: input.avatarUrl ?? null }), [courierProfile, rpcRefresh]);
  const upsertResidentProfile = useCallback((input: { siteId: string; block: string; floor: string; apartment: string; addressNote?: string }) => rpcRefresh<string>('dkd_gate_upsert_resident_profile', { p_site_id: input.siteId, p_block: input.block, p_floor: input.floor, p_apartment: input.apartment, p_address_note: input.addressNote ?? null }), [rpcRefresh]);
  const createPass = useCallback((input: CreatePassInput) => rpcRefresh<string>('dkd_gate_create_courier_pass_v2', { p_site_id: input.siteId, p_gate_id: input.gateId ?? null, p_gate: input.gate, p_customer_name: input.customerName, p_address_text: input.addressText, p_block: input.block, p_floor: input.floor, p_apartment: input.apartment, p_order_number: input.orderNumber, p_note: input.note, p_screenshot_url: input.screenshotPath ?? null, p_ocr_text: input.ocrText ?? null, p_ocr_payload: input.ocrPayload ?? {}, p_eta_minutes: input.etaMinutes ?? 6, p_rules_version: input.rulesVersion ?? null, p_rules_accepted: input.rulesAccepted }), [rpcRefresh]);
  const updatePassStatus = useCallback(async (id: string, status: PassStatus, rejectionReason?: string, code?: string) => { const data = await rpcRefresh<string | null>('dkd_gate_update_courier_pass_status_v2', { p_pass_id: id, p_status: status, p_rejection_reason: rejectionReason ?? null, p_code: code ?? null }); return optionalString(data); }, [rpcRefresh]);
  const retryPass = useCallback((id: string) => rpcRefresh<string>('dkd_gate_retry_courier_pass', { p_pass_id: id }), [rpcRefresh]);
  const updateAirPass = useCallback((id: string, latitude: number, longitude: number, distanceM: number, send: boolean) => rpcRefresh<void>('dkd_gate_update_airpass', { p_pass_id: id, p_latitude: latitude, p_longitude: longitude, p_distance_m: distanceM, p_send: send }), [rpcRefresh]);
  const acceptRule = useCallback((ruleId: string, passType: 'courier' | 'visitor', passId?: string) => rpcRefresh<string>('dkd_gate_accept_rule', { p_rule_id: ruleId, p_pass_type: passType, p_pass_id: passId ?? null }), [rpcRefresh]);
  const upsertRule = useCallback((input: UpdateRuleInput) => rpcRefresh<string>('dkd_gate_upsert_rule', { p_site_id: input.siteId, p_gate_id: input.gateId ?? null, p_audience: input.audience, p_scope_type: input.scopeType, p_title: input.title, p_body: input.body, p_starts_at: input.startsAt ?? new Date().toISOString(), p_ends_at: input.endsAt ?? null, p_is_critical: input.isCritical, p_existing_rule_id: input.existingRuleId ?? null }), [rpcRefresh]);
  const createVisitor = useCallback(async (input: CreateVisitorInput) => { const data = await rpcRefresh<Record<string, unknown>>('dkd_gate_create_visitor_pass', { p_site_id: input.siteId, p_guest_name: input.guestName, p_guest_phone: input.guestPhone ?? null, p_plate: input.plate ?? null, p_note: input.note ?? null }); return { id: stringValue(data?.id), code: stringValue(data?.code) }; }, [rpcRefresh]);
  const decideVisitor = useCallback((code: string, status: VisitorStatus, rejectionReason?: string) => rpcRefresh<string>('dkd_gate_decide_visitor_pass', { p_code: code, p_status: status, p_rejection_reason: rejectionReason ?? null }), [rpcRefresh]);
  const createDuesPeriod = useCallback((input: CreateDuesInput) => rpcRefresh<string>('dkd_gate_create_dues_period', { p_site_id: input.siteId, p_title: input.title, p_year: input.year, p_month: input.month, p_due_date: input.dueDate, p_scope_type: input.scopeType, p_scope_block: input.scopeBlock ?? null, p_scope_apartment: input.scopeApartment ?? null, p_amount: input.amount }), [rpcRefresh]);
  const markDuePaid = useCallback((chargeId: string, paid: boolean, note?: string) => rpcRefresh<void>('dkd_gate_mark_due_paid', { p_charge_id: chargeId, p_paid: paid, p_note: note ?? null }), [rpcRefresh]);
  const addFinanceTransaction = useCallback((input: CreateFinanceInput) => rpcRefresh<string>('dkd_gate_add_finance_transaction', { p_site_id: input.siteId, p_type: input.type, p_category: input.category, p_description: input.description, p_amount: input.amount, p_date: input.date, p_visible: input.visible }), [rpcRefresh]);
  const setFinanceVisibility = useCallback((siteId: string, visible: boolean) => rpcRefresh<void>('dkd_gate_set_finance_visibility', { p_site_id: siteId, p_visible: visible }), [rpcRefresh]);
  const markNotificationRead = useCallback((id: string) => rpcRefresh<void>('dkd_gate_mark_notification_read', { p_notification_id: id }), [rpcRefresh]);
  const loadDemoData = useCallback(async () => stringValue(await rpcRefresh<string>('dkd_gate_load_demo_data'), '0.2.0'), [rpcRefresh]);
  const deleteDemoData = useCallback(() => rpcRefresh<void>('dkd_gate_delete_demo_data'), [rpcRefresh]);

  const value = useMemo<GateContextValue>(() => ({ session, user: session?.user ?? null, initialized, loading, refreshing, error, profile, courierProfile, residentProfiles, sites, gates, passes, activities, rules, ruleAcceptances, visitors, notifications, duesPeriods, duesCharges, financeTransactions, settings, release, signIn, signUp, signOut, refresh, updateProfile, upsertResidentProfile, createPass, updatePassStatus, retryPass, updateAirPass, acceptRule, upsertRule, createVisitor, decideVisitor, createDuesPeriod, markDuePaid, addFinanceTransaction, setFinanceVisibility, markNotificationRead, loadDemoData, deleteDemoData }), [session, initialized, loading, refreshing, error, profile, courierProfile, residentProfiles, sites, gates, passes, activities, rules, ruleAcceptances, visitors, notifications, duesPeriods, duesCharges, financeTransactions, settings, release, signIn, signUp, signOut, refresh, updateProfile, upsertResidentProfile, createPass, updatePassStatus, retryPass, updateAirPass, acceptRule, upsertRule, createVisitor, decideVisitor, createDuesPeriod, markDuePaid, addFinanceTransaction, setFinanceVisibility, markNotificationRead, loadDemoData, deleteDemoData]);
  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useGate() {
  const context = useContext(GateContext);
  if (!context) throw new Error('useGate must be used inside GateProvider');
  return context;
}

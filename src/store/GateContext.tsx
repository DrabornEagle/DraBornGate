import type { Session, User } from '@supabase/supabase-js';
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  ActivityItem,
  CourierPass,
  CourierProfile,
  CreatePassInput,
  DeliveryPlatform,
  GateProfile,
  GateRelease,
  GateSettings,
  GateSite,
  PassStatus,
  UserRole,
} from '../types';

interface BootstrapPayload {
  profile?: Record<string, unknown> | null;
  courierProfile?: Record<string, unknown> | null;
  sites?: Array<Record<string, unknown>> | null;
  passes?: Array<Record<string, unknown>> | null;
  events?: Array<Record<string, unknown>> | null;
  settings?: Record<string, unknown> | null;
  release?: Record<string, unknown> | null;
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
  sites: GateSite[];
  passes: CourierPass[];
  activities: ActivityItem[];
  settings?: GateSettings;
  release?: GateRelease;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: {
    fullName: string;
    phone?: string;
    preferredRole: UserRole;
    platform?: DeliveryPlatform;
    plate?: string;
  }) => Promise<void>;
  createPass: (input: CreatePassInput) => Promise<string>;
  updatePassStatus: (id: string, status: PassStatus, rejectionReason?: string) => Promise<string | undefined>;
  loadDemoData: () => Promise<string>;
  deleteDemoData: () => Promise<void>;
}

const GateContext = createContext<GateContextValue | null>(null);

const stringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;
const numberValue = (value: unknown, fallback = 0) =>
  typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
const booleanValue = (value: unknown) => value === true;

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
}

function mapProfile(row: Record<string, unknown> | null | undefined, user: User): GateProfile {
  return {
    userId: stringValue(row?.user_id, user.id),
    fullName:
      stringValue(row?.full_name) ||
      stringValue(user.user_metadata?.full_name) ||
      stringValue(user.user_metadata?.name) ||
      user.email?.split('@')[0] ||
      'DraBornGate Kullanıcısı',
    phone: optionalString(row?.phone) ?? optionalString(user.phone),
    preferredRole: ['courier', 'security', 'management'].includes(stringValue(row?.preferred_role))
      ? (stringValue(row?.preferred_role) as UserRole)
      : 'courier',
    avatarUrl: optionalString(row?.avatar_url),
  };
}

function mapCourierProfile(row: Record<string, unknown> | null | undefined, userId: string): CourierProfile {
  const platform = stringValue(row?.platform, 'DraBornGo');
  return {
    userId: stringValue(row?.user_id, userId),
    platform: ['Trendyol Go', 'Yemeksepeti', 'Getir', 'DraBornGo', 'Diğer'].includes(platform)
      ? (platform as DeliveryPlatform)
      : 'DraBornGo',
    plate: stringValue(row?.plate),
    rating: numberValue(row?.rating, 5),
    completedToday: numberValue(row?.completed_today, 0),
  };
}

function mapSite(row: Record<string, unknown>): GateSite {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name, 'İsimsiz site'),
    address: optionalString(row.address),
    city: optionalString(row.city),
    gateNames: Array.isArray(row.gate_names)
      ? row.gate_names.filter((item): item is string => typeof item === 'string')
      : ['A Kapısı'],
    isDemo: booleanValue(row.is_demo),
  };
}

function mapPass(row: Record<string, unknown>, sitesById: Map<string, GateSite>): CourierPass {
  const siteId = stringValue(row.site_id);
  const platform = stringValue(row.platform, 'DraBornGo');
  const status = stringValue(row.status, 'waiting');
  return {
    id: stringValue(row.id),
    siteId,
    courierUserId: optionalString(row.courier_user_id),
    courierName: stringValue(row.courier_name, 'Kurye'),
    phone: optionalString(row.courier_phone),
    plate: stringValue(row.courier_plate),
    platform: ['Trendyol Go', 'Yemeksepeti', 'Getir', 'DraBornGo', 'Diğer'].includes(platform)
      ? (platform as DeliveryPlatform)
      : 'Diğer',
    site: sitesById.get(siteId)?.name ?? 'Site',
    gate: stringValue(row.gate),
    block: stringValue(row.block),
    apartment: stringValue(row.apartment),
    orderNumber: stringValue(row.order_number),
    note: stringValue(row.note),
    screenshotUri: optionalString(row.screenshot_path),
    createdAt: stringValue(row.created_at, new Date().toISOString()),
    etaMinutes: numberValue(row.eta_minutes, 0),
    status: ['waiting', 'approved', 'rejected', 'arrived', 'completed'].includes(status)
      ? (status as PassStatus)
      : 'waiting',
    approvalCode: optionalString(row.approval_code),
    rejectionReason: optionalString(row.rejection_reason),
    isDemo: booleanValue(row.is_demo),
  };
}

function mapActivity(row: Record<string, unknown>): ActivityItem {
  const tone = stringValue(row.tone, 'cyan');
  const createdAt = stringValue(row.created_at, new Date().toISOString());
  return {
    id: stringValue(row.id),
    passId: stringValue(row.pass_id),
    title: stringValue(row.title, 'Geçiş hareketi'),
    detail: stringValue(row.detail),
    time: relativeTime(createdAt),
    tone: ['cyan', 'purple', 'green', 'orange', 'red'].includes(tone)
      ? (tone as ActivityItem['tone'])
      : 'cyan',
    icon: stringValue(row.icon, 'navigate'),
    createdAt,
    isDemo: booleanValue(row.is_demo),
  };
}

export function GateProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [profile, setProfile] = useState<GateProfile>();
  const [courierProfile, setCourierProfile] = useState<CourierProfile>();
  const [sites, setSites] = useState<GateSite[]>([]);
  const [passes, setPasses] = useState<CourierPass[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [settings, setSettings] = useState<GateSettings>();
  const [release, setRelease] = useState<GateRelease>();
  const sessionRef = useRef<Session | null>(null);

  const clearData = useCallback(() => {
    setProfile(undefined);
    setCourierProfile(undefined);
    setSites([]);
    setPasses([]);
    setActivities([]);
    setSettings(undefined);
    setRelease(undefined);
    setError(undefined);
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
      setSites(mappedSites);
      setPasses((payload.passes ?? []).map((row) => mapPass(row, sitesById)));
      setActivities((payload.events ?? []).map(mapActivity));
      setSettings(
        payload.settings
          ? {
            demoDataVersion: optionalString(payload.settings.demo_data_version),
            demoLoadedAt: optionalString(payload.settings.demo_loaded_at),
          }
          : undefined,
      );
      setRelease(
        payload.release
          ? {
            version: stringValue(payload.release.version, '0.0.2'),
            androidVersionCode: numberValue(payload.release.android_version_code, 1),
            demoDataVersion: stringValue(payload.release.demo_data_version, '0.0.2'),
            notes: stringValue(payload.release.notes),
          }
          : undefined,
      );
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Supabase verileri alınamadı.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error: authError }: { data: { session: Session | null }; error: Error | null }) => {
      if (!mounted) return;
      if (authError) setError(authError.message);
      sessionRef.current = data.session;
      setSession(data.session);
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      if (!nextSession) clearData();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [clearData]);

  useEffect(() => {
    if (!session) return;
    void refresh();
    const channel = supabase
      .channel(`dkd-gate-live-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'draborngate', table: 'dkd_gate_courier_passes' },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'draborngate', table: 'dkd_gate_pass_events' },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
    if (authError) throw authError;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim(), source_app: 'DraBornGate' } },
      });
      if (authError) throw authError;
      return { needsEmailConfirmation: !data.session };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (input: {
      fullName: string;
      phone?: string;
      preferredRole: UserRole;
      platform?: DeliveryPlatform;
      plate?: string;
    }) => {
      setLoading(true);
      try {
        const { error: rpcError } = await supabase.rpc('dkd_gate_update_profile', {
          p_full_name: input.fullName,
          p_phone: input.phone ?? null,
          p_preferred_role: input.preferredRole,
          p_platform: input.platform ?? courierProfile?.platform ?? 'DraBornGo',
          p_plate: input.plate ?? courierProfile?.plate ?? '',
        });
        if (rpcError) throw rpcError;
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [courierProfile, refresh],
  );

  const createPass = useCallback(
    async (input: CreatePassInput) => {
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('dkd_gate_create_pass', {
          p_site_id: input.siteId,
          p_gate: input.gate,
          p_block: input.block,
          p_apartment: input.apartment,
          p_order_number: input.orderNumber,
          p_note: input.note,
          p_screenshot_path: input.screenshotPath ?? null,
          p_eta_minutes: input.etaMinutes ?? 6,
        });
        if (rpcError) throw rpcError;
        await refresh();
        return String(data);
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const updatePassStatus = useCallback(
    async (id: string, status: PassStatus, rejectionReason?: string) => {
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('dkd_gate_update_pass_status', {
          p_pass_id: id,
          p_status: status,
          p_rejection_reason: rejectionReason ?? null,
        });
        if (rpcError) throw rpcError;
        await refresh();
        return optionalString(data);
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const loadDemoData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('dkd_gate_load_demo_data');
      if (rpcError) throw rpcError;
      await refresh();
      return stringValue(data, '0.0.2');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const deleteDemoData = useCallback(async () => {
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('dkd_gate_delete_demo_data');
      if (rpcError) throw rpcError;
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const value = useMemo<GateContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
    initialized,
      loading,
      refreshing,
      error,
      profile,
      courierProfile,
      sites,
      passes,
      activities,
      settings,
      release,
      signIn,
      signUp,
      signOut,
      refresh,
      updateProfile,
      createPass,
      updatePassStatus,
      loadDemoData,
      deleteDemoData,
    }),
    [
      session,
      initialized,
      loading,
      refreshing,
      error,
      profile,
      courierProfile,
      sites,
      passes,
      activities,
      settings,
      release,
      signIn,
      signUp,
      signOut,
      refresh,
      updateProfile,
      createPass,
      updatePassStatus,
      loadDemoData,
      deleteDemoData,
    ],
  );

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useGate() {
  const context = useContext(GateContext);
  if (!context) throw new Error('useGate must be used inside GateProvider');
  return context;
}

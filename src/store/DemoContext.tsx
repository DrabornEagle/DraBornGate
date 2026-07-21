import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayoutAnimation } from 'react-native';
import { createInitialDemoState } from '../data/demo';
import {
  CreatePassInput,
  CourierPass,
  DemoState,
  PassStatus,
} from '../types';

const STORAGE_KEY = '@draborngate/demo-state-v0.1';

interface DemoContextValue extends DemoState {
  hydrated: boolean;
  createPass: (input: CreatePassInput) => CourierPass;
  updatePassStatus: (
    id: string,
    status: PassStatus,
    rejectionReason?: string,
  ) => void;
  resetDemo: () => Promise<void>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const makeApprovalCode = () => {
  const value = Math.floor(100000 + Math.random() * 900000).toString();
  return `${value.slice(0, 3)} ${value.slice(3)}`;
};

export function DemoProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DemoState>(createInitialDemoState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setState(JSON.parse(stored) as DemoState);
        }
      } catch {
        setState(createInitialDemoState());
      } finally {
        setHydrated(true);
      }
    };
    void hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const createPass = useCallback(
    (input: CreatePassInput) => {
      const pass: CourierPass = {
        id: `pass-${Date.now()}`,
        courierName: state.courierProfile.name,
        phone: state.courierProfile.phone,
        plate: state.courierProfile.plate,
        platform: input.platform,
        site: input.site,
        gate: input.gate,
        block: input.block,
        apartment: input.apartment,
        orderNumber: input.orderNumber,
        note: input.note,
        screenshotUri: input.screenshotUri,
        createdAt: new Date().toISOString(),
        etaMinutes: 6,
        status: 'waiting',
      };

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setState((current) => ({
        ...current,
        passes: [pass, ...current.passes],
        activities: [
          {
            id: `activity-${Date.now()}`,
            title: 'Geçiş talebi oluşturuldu',
            detail: `${input.block} / ${input.apartment} • ${input.gate}`,
            time: 'şimdi',
            tone: 'cyan',
            icon: 'paper-plane',
          },
          ...current.activities,
        ],
      }));
      return pass;
    },
    [state.courierProfile],
  );

  const updatePassStatus = useCallback(
    (id: string, status: PassStatus, rejectionReason?: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setState((current) => {
        const selected = current.passes.find((pass) => pass.id === id);
        if (!selected) return current;

        const approvalCode =
          status === 'approved'
            ? selected.approvalCode ?? makeApprovalCode()
            : selected.approvalCode;

        const titleByStatus: Record<PassStatus, string> = {
          waiting: 'Talep sıraya alındı',
          approved: 'Geçiş onaylandı',
          rejected: 'Geçiş reddedildi',
          arrived: 'Kurye kapıya ulaştı',
          completed: 'Teslimat tamamlandı',
        };

        const toneByStatus: Record<PassStatus, DemoState['activities'][number]['tone']> = {
          waiting: 'cyan',
          approved: 'green',
          rejected: 'red',
          arrived: 'orange',
          completed: 'purple',
        };

        return {
          ...current,
          passes: current.passes.map((pass) =>
            pass.id === id
              ? {
                  ...pass,
                  status,
                  approvalCode,
                  rejectionReason,
                  etaMinutes:
                    status === 'arrived' || status === 'completed'
                      ? 0
                      : pass.etaMinutes,
                }
              : pass,
          ),
          activities: [
            {
              id: `activity-${Date.now()}`,
              title: titleByStatus[status],
              detail: `${selected.courierName} • ${selected.block} / ${selected.apartment}`,
              time: 'şimdi',
              tone: toneByStatus[status],
              icon:
                status === 'approved'
                  ? 'shield-checkmark'
                  : status === 'rejected'
                    ? 'close-circle'
                    : status === 'completed'
                      ? 'checkmark-done'
                      : 'navigate',
            },
            ...current.activities,
          ],
        };
      });
    },
    [],
  );

  const resetDemo = useCallback(async () => {
    const cleanState = createInitialDemoState();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setState(cleanState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      createPass,
      updatePassStatus,
      resetDemo,
    }),
    [state, hydrated, createPass, updatePassStatus, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used inside DemoProvider');
  return context;
}

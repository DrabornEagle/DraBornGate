import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type DkdCourierPassUsage = {
  plan_code: string;
  used: number;
  limit: number;
  unlimited: boolean;
  plan_remaining: number | null;
  bonus: number;
  remaining: number | null;
  total_remaining: number | null;
};

export function useCourierPassRights() {
  const [dkdUsage, setDkdUsage] = useState<DkdCourierPassUsage>();
  const [dkdLoading, setDkdLoading] = useState(false);
  const [dkdError, setDkdError] = useState<string>();

  const dkdRefresh = useCallback(async () => {
    setDkdLoading(true);
    try {
      const { data: dkdData, error: dkdRpcError } = await supabase.rpc('dkd_gate_get_courier_pass_usage');
      if (dkdRpcError) throw dkdRpcError;
      setDkdUsage(dkdData as DkdCourierPassUsage);
      setDkdError(undefined);
    } catch (dkdCaught) {
      setDkdError(dkdCaught instanceof Error ? dkdCaught.message : 'Geçiş hakları alınamadı.');
    } finally {
      setDkdLoading(false);
    }
  }, []);

  useEffect(() => { void dkdRefresh(); }, [dkdRefresh]);

  return { usage: dkdUsage, loading: dkdLoading, error: dkdError, refresh: dkdRefresh };
}

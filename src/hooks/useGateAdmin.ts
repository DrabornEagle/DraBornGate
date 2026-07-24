import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useGateAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const refreshAdmin = useCallback(async () => {
    setCheckingAdmin(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_is_admin');
      if (error) throw error;
      setIsAdmin(data === true);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    void refreshAdmin();
  }, [refreshAdmin]);

  return { isAdmin, checkingAdmin, refreshAdmin };
}

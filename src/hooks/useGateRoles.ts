import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { UserRole } from '../types';
const validRoles: UserRole[] = ['courier', 'security', 'management', 'resident'];
export function useGateRoles() {
  const gate = useGate();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const refreshRoles = useCallback(async (): Promise<UserRole[]> => {
    if (!gate.session) { setRoles([]); return []; }
    setLoading(true);
    try { const { data, error } = await supabase.rpc('dkd_gate_get_my_available_roles'); if (error) throw error; const next = Array.isArray(data) ? data.filter((item): item is UserRole => typeof item === 'string' && validRoles.includes(item as UserRole)) : []; const normalized = Array.from(new Set<UserRole>(next)); setRoles(normalized); return normalized; }
    finally { setLoading(false); }
  }, [gate.session]);
  useEffect(() => { void refreshRoles().catch(() => setRoles([])); }, [refreshRoles, gate.profile?.preferredRole, gate.residentProfiles.length, gate.sites.length]);
  const selectRole = useCallback(async (role: UserRole) => { const current = roles.length ? roles : await refreshRoles(); if (!current.includes(role)) throw new Error('Bu role erişim yetkin yok.'); const { error } = await supabase.rpc('dkd_gate_set_preferred_role', { p_role: role }); if (error) throw error; await gate.refresh(); }, [gate, refreshRoles, roles]);
  return { roles, loading, refreshRoles, selectRole };
}

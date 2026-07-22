import { supabase } from './supabase';

async function rpc<T>(name: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data as T;
}

export const createGateSite = (input: { name: string; address: string; city: string; latitude?: number; longitude?: number }) => rpc<string>('dkd_gate_create_site', {
  p_name: input.name,
  p_address: input.address,
  p_city: input.city,
  p_latitude: input.latitude ?? null,
  p_longitude: input.longitude ?? null,
});

export const upsertSiteGate = (input: { siteId: string; name: string; stage?: string; entryPoint?: string; latitude?: number; longitude?: number; airpassEnabled: boolean; gateId?: string }) => rpc<string>('dkd_gate_upsert_gate', {
  p_site_id: input.siteId,
  p_name: input.name,
  p_stage: input.stage ?? null,
  p_entry_point: input.entryPoint ?? null,
  p_latitude: input.latitude ?? null,
  p_longitude: input.longitude ?? null,
  p_airpass_enabled: input.airpassEnabled,
  p_gate_id: input.gateId ?? null,
});

export const addSiteMember = (input: { siteId: string; email: string; role: 'manager' | 'security' | 'resident'; block?: string; floor?: string; apartment?: string }) => rpc<string>('dkd_gate_add_site_member', {
  p_site_id: input.siteId,
  p_email: input.email,
  p_role: input.role,
  p_block: input.block ?? null,
  p_floor: input.floor ?? null,
  p_apartment: input.apartment ?? null,
});

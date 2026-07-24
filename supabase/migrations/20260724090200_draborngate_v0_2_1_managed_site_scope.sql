create or replace function public.dkd_gate_list_my_managed_site_ids()
returns jsonb
language sql
stable
security definer
set search_path = draborngate, public, auth
as $$
  select coalesce(
    jsonb_agg(s.id order by s.created_at),
    '[]'::jsonb
  )
  from draborngate.dkd_gate_sites s
  where s.is_active
    and (
      draborngate.dkd_gate_is_site_manager(s.id, auth.uid())
      or draborngate.dkd_gate_is_admin_user(auth.uid())
    );
$$;

revoke all on function public.dkd_gate_list_my_managed_site_ids() from public, anon;
grant execute on function public.dkd_gate_list_my_managed_site_ids() to authenticated;

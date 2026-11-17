-- Harden fillprompt counters: tables are RPC-only.
-- Run in the Supabase SQL editor if applying outside migrations.
-- RLS stays on with no policies; revoke direct table privileges from API roles.

revoke all on table public.mt_copy_counts from anon, authenticated, public;
revoke all on table public.mt_copy_rate from anon, authenticated, public;
revoke all on table public.mt_mcp_usage from anon, authenticated, public;

grant execute on function public.mt_copy_bump(text) to anon, authenticated;
grant execute on function public.mt_copy_get(text) to anon, authenticated;
grant execute on function public.mt_mcp_bump(text, text, boolean) to anon, authenticated;
grant execute on function public.mt_mcp_stats(integer) to anon, authenticated;

-- Empty search_path on MCP helpers (same pattern as mt_copy_*).
create or replace function public.mt_mcp_bump(t text, k text default '', zero boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if t not in ('search_prompts', 'get_prompt', 'list_filters', 'random_prompt') or coalesce(k, '') not in ('', 'image', 'video', 'text') then
    return;
  end if;
  insert into public.mt_mcp_usage (day, tool, kind, calls, empty)
  values (current_date, t, coalesce(k, ''), 1, case when zero then 1 else 0 end)
  on conflict (day, tool, kind) do update
    set calls = public.mt_mcp_usage.calls + 1,
        empty = public.mt_mcp_usage.empty + excluded.empty;
end;
$$;

create or replace function public.mt_mcp_stats(days integer default 30)
returns table (day date, tool text, kind text, calls integer, empty integer)
language sql
stable
security definer
set search_path = ''
as $$
  select u.day, u.tool, u.kind, u.calls, u.empty
  from public.mt_mcp_usage u
  where u.day > current_date - least(greatest(days, 1), 366)
  order by u.day desc, u.tool, u.kind;
$$;

revoke all on function public.mt_mcp_bump(text, text, boolean) from public;
revoke all on function public.mt_mcp_stats(integer) from public;
grant execute on function public.mt_mcp_bump(text, text, boolean) to anon, authenticated;
grant execute on function public.mt_mcp_stats(integer) to anon, authenticated;

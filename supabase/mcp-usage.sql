-- MCP usage counts for fillprompt.com. Run once in the Supabase SQL editor.
-- One row per day, tool and prompt type. No queries, IPs or client details are stored.
-- The table has RLS on and no policies, so it is reached only through the two functions below.

create table if not exists public.mt_mcp_usage (
  day   date    not null default current_date,
  tool  text    not null,
  kind  text    not null default '',
  calls integer not null default 0,
  empty integer not null default 0, -- searches that found nothing
  primary key (day, tool, kind)
);
alter table public.mt_mcp_usage enable row level security;

-- Add one call. Unknown tool or type names are ignored, so the counts cannot be filled with junk keys.
create or replace function public.mt_mcp_bump(t text, k text default '', zero boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if t not in ('search_prompts', 'get_prompt', 'list_filters', 'random_prompt') or coalesce(k, '') not in ('', 'image', 'video', 'text') then
    return;
  end if;
  insert into mt_mcp_usage (day, tool, kind, calls, empty)
  values (current_date, t, coalesce(k, ''), 1, case when zero then 1 else 0 end)
  on conflict (day, tool, kind) do update
    set calls = mt_mcp_usage.calls + 1,
        empty = mt_mcp_usage.empty + excluded.empty;
end;
$$;

-- Daily counts for the last n days (at most a year).
create or replace function public.mt_mcp_stats(days integer default 30)
returns table (day date, tool text, kind text, calls integer, empty integer)
language sql
stable
security definer
set search_path = public
as $$
  select day, tool, kind, calls, empty
  from mt_mcp_usage
  where day > current_date - least(greatest(days, 1), 366)
  order by day desc, tool, kind;
$$;

revoke all on function public.mt_mcp_bump(text, text, boolean) from public;
revoke all on function public.mt_mcp_stats(integer) from public;
grant execute on function public.mt_mcp_bump(text, text, boolean) to anon, authenticated;
grant execute on function public.mt_mcp_stats(integer) to anon, authenticated;

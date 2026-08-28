-- Shared rate limiting.
--
-- The referral endpoint and the admin login both limit by client, but held it
-- in per-instance memory. On a serverless platform that means the limit is per
-- warm instance rather than global: an attacker who spreads requests across
-- cold starts is not limited at all, and the legal desk's queue is exactly the
-- thing worth flooding.
--
-- Moving the counter into Postgres makes it actually shared. The application
-- still falls back to the in-memory limiter when no database is configured, so
-- an unconfigured deploy is rate limited imperfectly rather than not at all.

create table if not exists rate_limit_events (
  id         bigserial primary key,
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_bucket_idx
  on rate_limit_events (bucket, created_at desc);

/**
 * Returns true when the request is allowed, and records it. Returns false when
 * the caller is over the limit, without recording — so being blocked does not
 * itself extend the block.
 */
create or replace function check_rate_limit(
  p_bucket text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
    from rate_limit_events
   where bucket = p_bucket
     and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_max then
    return false;
  end if;

  insert into rate_limit_events (bucket) values (p_bucket);

  -- Housekeeping on roughly one call in a hundred, rather than on every call:
  -- the table would otherwise grow without bound, but paying for a delete on
  -- every request to avoid that is the wrong trade.
  if random() < 0.01 then
    delete from rate_limit_events where created_at < now() - interval '1 day';
  end if;

  return true;
end;
$$;

revoke all on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function check_rate_limit(text, integer, integer) to service_role;

alter table rate_limit_events enable row level security;
revoke all on rate_limit_events from anon, authenticated;

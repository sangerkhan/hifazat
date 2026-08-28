-- Helper functions.

-- Atomically records a cache hit.
--
-- Done in the database rather than as a read-modify-write from the application
-- because several instances serve the same popular situation concurrently, and
-- the hit count is what orders the legal desk's review queue. An undercount
-- there means the most-served guidance is not the guidance that gets reviewed
-- first, which is the one thing this counter exists to prevent.
create or replace function increment_cache_hit(p_cache_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update assessment_cache
     set hit_count = hit_count + 1,
         last_served_at = now()
   where cache_key = p_cache_key;
$$;

revoke all on function increment_cache_hit(text) from public, anon, authenticated;

-- Marks a resource as verified and writes the audit trail in one step, so the
-- log cannot drift from the data it describes.
create or replace function confirm_resource(
  p_resource_id text,
  p_verified_by text,
  p_note text default null,
  p_recheck_months integer default 6
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update resources
     set verification   = 'confirmed',
         verify_note    = null,
         verified_by    = p_verified_by,
         verified_at    = now(),
         recheck_due_at = now() + make_interval(months => p_recheck_months)
   where id = p_resource_id;

  if not found then
    raise exception 'resource % not found', p_resource_id;
  end if;

  insert into verification_log (entity_type, entity_id, action, verified_by, note)
  values ('resource', p_resource_id, 'confirmed', p_verified_by, p_note);
end;
$$;

revoke all on function confirm_resource(text, text, text, integer) from public, anon, authenticated;

comment on function confirm_resource is
  'Use this rather than updating resources directly: it timestamps the check, schedules the next one, and writes the audit trail.';

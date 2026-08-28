-- Restore EXECUTE to service_role on the helper functions.
--
-- The functions migration revoked EXECUTE from public in order to keep anon
-- out. That over-reached: EXECUTE on a function is granted to PUBLIC by
-- default, so revoking from PUBLIC removed it from service_role as well — the
-- one role the application actually calls these with.
--
-- The effect was silent rather than loud. increment_cache_hit is called
-- fire-and-forget, so hit counts would simply never rise, and cache_review_queue
-- would order the legal desk's work by nothing useful. confirm_resource would
-- have failed outright the first time anyone tried to verify a helpline.
--
-- service_role is the server-side key only; it is never exposed to a browser.

grant execute on function increment_cache_hit(text) to service_role;
grant execute on function confirm_resource(text, text, text, integer) to service_role;

-- Unverify a resource, with the reason recorded. Used when a number that was
-- previously confirmed turns out to be dead, which is the case the six-monthly
-- recheck exists to catch.
create or replace function unconfirm_resource(
  p_resource_id text,
  p_verified_by text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update resources
     set verification   = 'unconfirmed',
         verify_note    = coalesce(p_note, verify_note),
         verified_by    = p_verified_by,
         verified_at    = now(),
         recheck_due_at = null
   where id = p_resource_id;

  if not found then
    raise exception 'resource % not found', p_resource_id;
  end if;

  insert into verification_log (entity_type, entity_id, action, verified_by, note)
  values ('resource', p_resource_id, 'unconfirmed', p_verified_by, p_note);
end;
$$;

revoke all on function unconfirm_resource(text, text, text) from public, anon, authenticated;
grant execute on function unconfirm_resource(text, text, text) to service_role;

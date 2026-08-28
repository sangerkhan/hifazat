-- Record who looked at a survivor's phone number.
--
-- The referral queue masks contact details by default and returns the full
-- number only on an explicit request. For that to be more than decoration two
-- things have to be true: the masked list must never contain the real number in
-- the first place (handled in the application), and revealing one must leave a
-- trace (handled here).
--
-- verification_log already exists for exactly this shape of record, so it is
-- widened rather than duplicated.

alter table verification_log drop constraint if exists verification_log_entity_type_check;
alter table verification_log add constraint verification_log_entity_type_check
  check (entity_type in ('resource', 'legal_instrument', 'province', 'assessment_cache', 'referral'));

alter table verification_log drop constraint if exists verification_log_action_check;
alter table verification_log add constraint verification_log_action_check
  check (action in ('confirmed', 'unconfirmed', 'updated', 'created', 'removed', 'viewed', 'assigned'));

comment on table verification_log is
  'Audit trail. Includes who revealed a referral contact number and when — the shared admin password makes the recorded name the only attribution available, so it is asked for explicitly in the UI.';

-- Referrals that have sat unactioned. An emergency referral going cold is the
-- worst failure this system can have, so it gets its own view rather than
-- relying on someone noticing.
create or replace view referrals_going_cold as
select
  reference,
  received_at,
  urgency,
  category_label,
  safe_to_call,
  province,
  status,
  assigned_to,
  round(extract(epoch from (now() - received_at)) / 3600)::int as hours_waiting
from referrals
where status in ('new', 'assigned')
  and (
    (urgency = 'emergency' and received_at < now() - interval '4 hours')
    or (urgency = 'priority'  and received_at < now() - interval '24 hours')
    or (urgency = 'standard'  and received_at < now() - interval '72 hours')
  )
order by
  case urgency when 'emergency' then 0 when 'priority' then 1 else 2 end,
  received_at asc;

alter view referrals_going_cold set (security_invoker = on);
revoke all on referrals_going_cold from anon, authenticated;

comment on view referrals_going_cold is
  'Open referrals past their expected response window. Deliberately excludes name and phone: this is a workload alarm, not a contact list.';

-- The admin queue's source. hours_waiting is computed here rather than in the
-- page: it is a property of the data against the database clock, not something
-- to recompute impurely on every render.
--
-- The phone number is included because the page masks it before it reaches the
-- browser; the unmasked value is read separately, and logged, on an explicit
-- reveal.
create or replace view referral_queue_admin as
select
  reference,
  received_at,
  urgency,
  category_label,
  name,
  phone,
  safe_to_call,
  best_time,
  province,
  city,
  locale,
  status,
  assigned_to,
  desk_notes,
  narrative,
  assessment_severity,
  round(extract(epoch from (now() - received_at)) / 3600)::int as hours_waiting
from referrals
where status in ('new', 'assigned', 'contacted', 'in_progress')
order by
  case urgency when 'emergency' then 0 when 'priority' then 1 else 2 end,
  received_at asc;

alter view referral_queue_admin set (security_invoker = on);
revoke all on referral_queue_admin from anon, authenticated;

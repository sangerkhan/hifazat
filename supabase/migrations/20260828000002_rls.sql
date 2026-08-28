-- Row level security.
--
-- The threat model is simple and worth stating, because it drives every policy
-- below: the anon key ships to the browser and must be assumed public. It may
-- read reference data that is already public anyway (laws, helplines). It must
-- never read or write a referral, because referrals contain the name and phone
-- number of someone who may be in danger from a person who could plausibly be
-- looking for exactly that.
--
-- Everything the application writes goes through server-side route handlers
-- using the service role key, which bypasses RLS. These policies are therefore
-- defence in depth rather than the primary control.

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
--
-- RLS is only consulted *after* table-level privileges pass, so policies alone
-- grant nothing. Supabase's project bootstrap normally issues a blanket
-- "grant select on all tables in schema public to anon", which cuts both ways:
-- it makes the reads below work, and it would also hand anon a SELECT on
-- referrals. Rather than depend on either behaviour, the grants are stated
-- explicitly here and the sensitive tables are revoked outright.

grant usage on schema public to anon, authenticated;

grant select on
  provinces, legal_instruments, ncsw_categories, ncsw_indicators, resources
  to anon, authenticated;

-- Belt and braces. Even with RLS enabled and no policy (which already yields
-- zero rows), the privilege itself is withdrawn.
revoke all on referrals         from anon, authenticated;
revoke all on assessment_cache  from anon, authenticated;
revoke all on assessment_events from anon, authenticated;
revoke all on verification_log  from anon, authenticated;

alter table provinces          enable row level security;
alter table legal_instruments  enable row level security;
alter table ncsw_categories    enable row level security;
alter table ncsw_indicators    enable row level security;
alter table resources          enable row level security;
alter table referrals          enable row level security;
alter table assessment_cache   enable row level security;
alter table assessment_events  enable row level security;
alter table verification_log   enable row level security;

-- ---------------------------------------------------------------------------
-- Public reference data — readable, never writable
-- ---------------------------------------------------------------------------

drop policy if exists provinces_read on provinces;
create policy provinces_read on provinces
  for select to anon, authenticated using (true);

drop policy if exists legal_instruments_read on legal_instruments;
create policy legal_instruments_read on legal_instruments
  for select to anon, authenticated
  -- Drafts and instruments still awaiting legal sign-off stay invisible, so an
  -- unconfirmed statute cannot leak into the client or the prompt.
  using (published = true and confidence = 'confirmed');

drop policy if exists ncsw_categories_read on ncsw_categories;
create policy ncsw_categories_read on ncsw_categories
  for select to anon, authenticated using (true);

drop policy if exists ncsw_indicators_read on ncsw_indicators;
create policy ncsw_indicators_read on ncsw_indicators
  for select to anon, authenticated using (published = true);

drop policy if exists resources_read on resources;
create policy resources_read on resources
  for select to anon, authenticated
  -- Unconfirmed resources are readable so the directory can list them in the
  -- "Also in your area" section, but the application is what decides not to
  -- render them as a tap-to-call link or hand them to the model.
  using (published = true);

-- ---------------------------------------------------------------------------
-- Referrals — service role only
-- ---------------------------------------------------------------------------

-- No policy is created for anon or authenticated, so with RLS enabled every
-- such request returns zero rows and every write is refused. Only the service
-- role, which bypasses RLS, can reach this table.

-- ---------------------------------------------------------------------------
-- Cache, analytics and audit — service role only
-- ---------------------------------------------------------------------------

-- assessment_cache holds generated guidance keyed by a situation. Reading it
-- from the browser would let anyone enumerate the situations other people have
-- described, so it stays server-side.

-- assessment_events is anonymous but still not something to expose for
-- arbitrary querying from a public key.

-- verification_log names the people doing the verification.

-- ---------------------------------------------------------------------------
-- Views for the legal desk
-- ---------------------------------------------------------------------------

-- What still needs checking, ordered so the most consequential comes first: a
-- resource that would appear high in results matters more than one that would
-- appear last.
create or replace view resources_needing_verification as
select
  id,
  name,
  type,
  scope,
  phone,
  website,
  verify_note,
  priority,
  verified_at,
  recheck_due_at
from resources
where published = true
  and (
    verification = 'unconfirmed'
    or (recheck_due_at is not null and recheck_due_at < now())
  )
order by priority asc, name asc;

comment on view resources_needing_verification is
  'The working list for docs/RESOURCE-VERIFICATION.md. Includes confirmed entries whose recheck date has passed.';

-- Coverage per province: how many usable resources a person actually sees.
-- A province with a low confirmed count is one where the app currently has
-- little to offer beyond national helplines.
create or replace view resource_coverage as
select
  p.id as province,
  p.name_en as province_name,
  count(*) filter (
    where r.verification = 'confirmed' and not ('national' = any (r.scope))
  ) as confirmed_local,
  count(*) filter (
    where r.verification = 'unconfirmed' and not ('national' = any (r.scope))
  ) as unconfirmed_local,
  count(*) filter (where r.verification = 'confirmed') as confirmed_total
from provinces p
left join resources r
  on r.published = true
 and (p.id = any (r.scope) or 'national' = any (r.scope))
group by p.id, p.name_en
order by confirmed_local asc;

comment on view resource_coverage is
  'Confirmed resources visible per province. Rows at the top are the coverage gaps.';

-- The cached answers real users hit most, unreviewed first. Reviewing the top
-- of this list is the highest-leverage quality work available: each approved
-- entry improves every future user who lands in the same situation.
create or replace view cache_review_queue as
select
  cache_key,
  locale,
  review_status,
  hit_count,
  context ->> 'province'      as province,
  context ->> 'gender'        as gender,
  context ->> 'relationship'  as relationship,
  response ->> 'severity'     as severity,
  answer_signature,
  last_served_at,
  created_at
from assessment_cache
where review_status = 'unreviewed'
order by hit_count desc, created_at desc;

comment on view cache_review_queue is
  'Review from the top. The first 50 rows typically cover the majority of real traffic.';

-- Open referral workload, most urgent first.
create or replace view referral_queue as
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
  assigned_to
from referrals
where status in ('new', 'assigned', 'contacted', 'in_progress')
order by
  case urgency when 'emergency' then 0 when 'priority' then 1 else 2 end,
  received_at asc;

-- ---------------------------------------------------------------------------
-- View privileges
-- ---------------------------------------------------------------------------
--
-- This block is the one most worth understanding. A Postgres view executes with
-- the privileges of its OWNER, not its caller, so a view over a table protected
-- by RLS punches straight through that protection. referral_queue selects names
-- and phone numbers of people who may be in danger from someone who would very
-- much like to read exactly that list.
--
-- security_invoker makes each view evaluate under the caller's permissions, so
-- RLS applies as intended. It requires PostgreSQL 15+, which every current
-- Supabase project runs. The revokes then make the point twice.

alter view resources_needing_verification set (security_invoker = on);
alter view resource_coverage              set (security_invoker = on);
alter view cache_review_queue             set (security_invoker = on);
alter view referral_queue                 set (security_invoker = on);

revoke all on referral_queue     from anon, authenticated;
revoke all on cache_review_queue from anon, authenticated;

-- These two carry no personal data and are useful to the team, but there is no
-- reason for a public browser key to read them either.
revoke all on resources_needing_verification from anon;
revoke all on resource_coverage              from anon;

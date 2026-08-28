-- Hifazat backend schema
--
-- Design notes
-- ------------
-- The reference data is small: 41 NCSW indicators, ~29 legal instruments and
-- ~33 resources, about 50 KB in total. It is therefore modelled for
-- *editability and auditability*, not for retrieval performance — the whole
-- corpus fits comfortably in memory and is cached in the application layer.
--
-- That is also why there is no pgvector here. Similarity search over 41 rows
-- would add an embedding round trip and a non-deterministic selection step to a
-- filter that a WHERE clause answers exactly. Legal guidance has to be
-- auditable: "why did it cite this statute" needs a reproducible answer. See
-- docs/BACKEND.md for the threshold at which that judgement should be revisited.
--
-- Identifiers are text rather than uuid for reference tables, because they
-- already exist as stable slugs in the application ("dv_punjab_2016",
-- "pcsw_1043") and are cited in commits, docs and the verification checklist.

-- ---------------------------------------------------------------------------
-- Provinces
-- ---------------------------------------------------------------------------

create table if not exists provinces (
  id                    text primary key,
  name_en               text not null,
  name_ur               text not null,
  short_en              text not null,
  short_ur              text not null,
  -- Sindh is 18 for both parties; elsewhere the Child Marriage Restraint Act
  -- 1929 default of 16 for a female still applies.
  min_marriage_age_female        smallint not null,
  min_marriage_age_female_status text not null default 'unconfirmed'
    check (min_marriage_age_female_status in ('confirmed', 'unconfirmed')),
  has_vaw_centres       boolean not null default false,
  women_commission      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table provinces is
  'Provinces and territories. Domestic violence, child protection and property rights are devolved, so this table carries the per-jurisdiction facts the guidance depends on.';

-- ---------------------------------------------------------------------------
-- Legal instruments
-- ---------------------------------------------------------------------------

create table if not exists legal_instruments (
  id            text primary key,
  title         text not null,
  short_title   text not null,
  -- 'federal' applies everywhere; any other value must be a province id.
  jurisdiction  text not null,
  categories    text[] not null default '{}',
  -- NULL means the instrument is gender-neutral and protects everyone. A
  -- populated array restricts it, so PPC 354 is never cited for a male
  -- complainant and the Transgender Persons Act is never omitted for a
  -- transgender one.
  protects      text[],
  summary       text not null,
  remedy        text,
  confidence    text not null default 'unconfirmed'
    check (confidence in ('confirmed', 'unconfirmed')),
  -- Unpublished rows are invisible to the application entirely, which is how a
  -- draft is staged without reaching users.
  published     boolean not null default true,
  source_url    text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint legal_instruments_jurisdiction_valid
    check (jurisdiction = 'federal' or jurisdiction ~ '^[a-z_]+$')
);

create index if not exists legal_instruments_jurisdiction_idx
  on legal_instruments (jurisdiction);
create index if not exists legal_instruments_categories_idx
  on legal_instruments using gin (categories);
create index if not exists legal_instruments_protects_idx
  on legal_instruments using gin (protects);
create index if not exists legal_instruments_lookup_idx
  on legal_instruments (published, confidence);

comment on column legal_instruments.protects is
  'NULL = gender-neutral. Populated = restricted to those genders.';

-- ---------------------------------------------------------------------------
-- NCSW indicator framework
-- ---------------------------------------------------------------------------

create table if not exists ncsw_categories (
  id           text primary key,
  name         text not null,
  name_ur      text,
  description  text not null,
  legal_refs   text[] not null default '{}',
  -- Maps an NCSW category onto the app's case categories, so indicators can be
  -- scoped by the same vocabulary used for law and resources.
  case_categories text[] not null default '{}',
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists ncsw_indicators (
  id              text primary key,
  category_id     text not null references ncsw_categories (id) on delete cascade,
  indicator       text not null,
  indicator_ur    text,
  description     text not null,
  severity        text not null
    check (severity in ('concerning', 'serious', 'critical')),
  examples        text[] not null default '{}',
  legal_ref_extra text,
  published       boolean not null default true,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists ncsw_indicators_category_idx
  on ncsw_indicators (category_id);
create index if not exists ncsw_indicators_published_idx
  on ncsw_indicators (published);

-- ---------------------------------------------------------------------------
-- Support directory
-- ---------------------------------------------------------------------------

create table if not exists resources (
  id             text primary key,
  name           text not null,
  name_ur        text not null,
  type           text not null check (type in (
                   'emergency', 'police', 'government', 'ngo', 'legal_aid',
                   'shelter', 'cyber', 'counselling', 'child')),
  -- 'national' or a province id. A resource may serve several provinces.
  scope          text[] not null default '{}',
  phone          text,
  whatsapp       text,
  email          text,
  website        text,
  hours          text not null,
  hours_ur       text not null,
  description    text not null,
  description_ur text not null,
  -- NULL means it serves everyone.
  serves         text[],
  handles        text[] not null default '{}',
  priority       smallint not null default 3,

  -- The flag that governs everything. Only 'confirmed' rows are given to the
  -- model or rendered as a tap-to-call link, because a survivor who dials a
  -- dead number concludes that help does not exist.
  verification   text not null default 'unconfirmed'
    check (verification in ('confirmed', 'unconfirmed')),
  verify_note    text,
  verified_by    text,
  verified_at    timestamptz,
  -- Numbers rot. This drives the staleness report.
  recheck_due_at timestamptz,

  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists resources_scope_idx on resources using gin (scope);
create index if not exists resources_handles_idx on resources using gin (handles);
create index if not exists resources_serves_idx on resources using gin (serves);
create index if not exists resources_lookup_idx
  on resources (published, verification, priority);

comment on column resources.verification is
  'Only confirmed entries reach the AI or render as tap-to-call. See docs/RESOURCE-VERIFICATION.md.';

-- ---------------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------------

create table if not exists referrals (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,
  received_at          timestamptz not null default now(),

  -- Routing
  category             text not null,
  category_label       text not null,
  urgency              text not null
    check (urgency in ('emergency', 'priority', 'standard')),

  -- Contact. This is the only personal data the system stores anywhere.
  name                 text not null,
  phone                text not null,
  email                text,
  city                 text,
  -- For someone still living with the person who hurt them, an unexpected call
  -- can be what escalates the danger. Treated as binding by the legal desk.
  safe_to_call         boolean not null default false,
  best_time            text not null default 'any'
    check (best_time in ('any', 'morning', 'afternoon', 'evening')),

  -- Case context
  province             text,
  gender               text,
  relationship         text,
  still_married        boolean,
  has_children         boolean,
  information_only     boolean,
  assessment_category  text,
  assessment_severity  text,
  locale               text not null default 'en',
  narrative            text not null,
  source               text not null default 'web_guided',

  -- Desk workflow
  status               text not null default 'new'
    check (status in ('new', 'assigned', 'contacted', 'in_progress', 'closed', 'unreachable')),
  assigned_to          text,
  desk_notes           text,
  first_contact_at     timestamptz,
  closed_at            timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists referrals_status_idx on referrals (status, received_at desc);
create index if not exists referrals_category_idx on referrals (category, status);
create index if not exists referrals_urgency_idx on referrals (urgency, received_at desc)
  where status in ('new', 'assigned');

comment on table referrals is
  'The only table holding personal data. Access is service-role only; the anon key can neither read nor write it.';

-- ---------------------------------------------------------------------------
-- Reviewed answer cache
-- ---------------------------------------------------------------------------

-- The guided flow produces a bounded space of answer combinations. Hashing the
-- structured answers lets a repeat of the same situation be served from here in
-- milliseconds instead of a multi-second model call — and, more importantly,
-- lets the legal desk review and correct the answers real users see most often.
-- A reviewed cached answer is better guidance than a fresh generation.
create table if not exists assessment_cache (
  id             uuid primary key default gen_random_uuid(),
  -- sha256 of the normalised answer set plus locale. Computed in the app.
  cache_key      text not null unique,
  locale         text not null,
  -- Kept human-readable so the desk can see what situation this answers.
  answer_signature jsonb not null,
  context        jsonb not null,
  response       jsonb not null,
  model          text,

  hit_count      integer not null default 0,
  last_served_at timestamptz,

  review_status  text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'approved', 'edited', 'rejected')),
  reviewed_by    text,
  reviewed_at    timestamptz,
  review_note    text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Ordering by hits is how the desk decides what to review first: the top
-- entries cover the bulk of real traffic.
create index if not exists assessment_cache_review_idx
  on assessment_cache (review_status, hit_count desc);

comment on column assessment_cache.review_status is
  'rejected entries are never served and are regenerated on next request.';

-- ---------------------------------------------------------------------------
-- Anonymous analytics
-- ---------------------------------------------------------------------------

-- Deliberately carries no free text, no name, no phone and no narrative — only
-- what is needed to see coverage gaps and answer the partner-org questions.
create table if not exists assessment_events (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  province     text,
  gender       text,
  locale       text not null default 'en',
  categories   text[] not null default '{}',
  severity     text,
  urgent       boolean not null default false,
  source       text not null default 'web_guided',
  cache_hit    boolean not null default false,
  used_fallback boolean not null default false,
  latency_ms   integer
);

create index if not exists assessment_events_created_idx
  on assessment_events (created_at desc);
create index if not exists assessment_events_province_idx
  on assessment_events (province, created_at desc);

comment on table assessment_events is
  'Anonymous. No PII, no narrative text. Safe to aggregate and share with partner organisations.';

-- ---------------------------------------------------------------------------
-- Verification log
-- ---------------------------------------------------------------------------

-- An audit trail for the legal desk: who confirmed what, and when. This is what
-- makes it possible to say publicly how the data is maintained.
create table if not exists verification_log (
  id          bigserial primary key,
  entity_type text not null check (entity_type in ('resource', 'legal_instrument', 'province', 'assessment_cache')),
  entity_id   text not null,
  action      text not null check (action in ('confirmed', 'unconfirmed', 'updated', 'created', 'removed')),
  verified_by text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists verification_log_entity_idx
  on verification_log (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'provinces', 'legal_instruments', 'ncsw_categories', 'ncsw_indicators',
    'resources', 'referrals', 'assessment_cache'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; ' ||
      'create trigger set_updated_at before update on %I ' ||
      'for each row execute function set_updated_at();', t, t);
  end loop;
end;
$$;

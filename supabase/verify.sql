-- Post-setup verification.
--
-- Paste into the Supabase SQL editor after applying the migrations and seed.
-- Every row should read PASS. Anything else tells you exactly what is missing.
--
-- Safe to run at any time; it only reads.

with checks as (

  -- Reference data ---------------------------------------------------------
  select 1 as ord, 'provinces seeded' as description,
         (select count(*) from provinces)::text || ' / 7' as actual,
         (select count(*) from provinces) = 7 as ok
  union all
  select 2, 'legal instruments seeded',
         (select count(*) from legal_instruments)::text || ' / 29',
         (select count(*) from legal_instruments) >= 29
  union all
  select 3, 'NCSW categories seeded',
         (select count(*) from ncsw_categories)::text || ' / 6',
         (select count(*) from ncsw_categories) = 6
  union all
  select 4, 'NCSW indicators seeded',
         (select count(*) from ncsw_indicators)::text || ' / 41',
         (select count(*) from ncsw_indicators) = 41
  union all
  select 5, 'resources seeded',
         (select count(*) from resources)::text || ' / 33',
         (select count(*) from resources) = 33
  union all
  select 6, 'confirmed resources (rest await the legal desk)',
         (select count(*) from resources where verification = 'confirmed')::text || ' of '
           || (select count(*) from resources)::text,
         (select count(*) from resources where verification = 'confirmed') >= 10

  -- Structure --------------------------------------------------------------
  union all
  select 7, 'helper functions present',
         (select count(*)::text from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('increment_cache_hit', 'confirm_resource', 'set_updated_at')) || ' / 3',
         (select count(*) from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('increment_cache_hit', 'confirm_resource', 'set_updated_at')) = 3
  union all
  select 8, 'views present',
         (select count(*)::text from pg_views where schemaname = 'public') || ' / 4',
         (select count(*) from pg_views where schemaname = 'public') = 4

  -- Security ---------------------------------------------------------------
  union all
  select 9, 'RLS enabled on every table',
         (select count(*)::text from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) || ' / 9',
         (select count(*) from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) >= 9
  union all
  -- The one most worth checking. A Postgres view runs as its OWNER unless this
  -- is set, so referral_queue would hand every name and phone number to anyone
  -- holding the public anon key.
  select 10, 'views run as caller (security_invoker) — protects referral_queue',
         (select count(*)::text from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'v'
             and coalesce((select option_value from pg_options_to_table(c.reloptions)
                            where option_name = 'security_invoker'), 'off') = 'on') || ' / 4',
         (select count(*) from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'v'
             and coalesce((select option_value from pg_options_to_table(c.reloptions)
                            where option_name = 'security_invoker'), 'off') = 'on') = 4
  union all
  select 11, 'anon cannot read referrals',
         case when has_table_privilege('anon', 'referrals', 'SELECT')
              then 'privilege granted — relying on RLS alone'
              else 'revoked' end,
         not has_table_privilege('anon', 'referrals', 'SELECT')
  union all
  select 12, 'anon cannot read the answer cache',
         case when has_table_privilege('anon', 'assessment_cache', 'SELECT')
              then 'privilege granted — relying on RLS alone'
              else 'revoked' end,
         not has_table_privilege('anon', 'assessment_cache', 'SELECT')
  union all
  select 13, 'anon can read the support directory',
         case when has_table_privilege('anon', 'resources', 'SELECT')
              then 'yes' else 'NO — the directory will fall back to bundled data' end,
         has_table_privilege('anon', 'resources', 'SELECT')
)
select ord as "#",
       case when ok then 'PASS' else 'FAIL' end as result,
       description,
       actual
from checks
order by ord;

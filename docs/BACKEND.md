# Backend: data, speed and correctness

How the Supabase backend is built, and the reasoning behind the parts that
depart from the original roadmap.

---

## The headline recommendation: do not build the pgvector RAG pipeline yet

ROADMAP.md previously had "Phase 7 — RAG pipeline with pgvector embeddings" as
the path to accuracy. Having measured the actual corpus, that would be the wrong
thing to build next, and it would make the system slower rather than faster.

Here is the whole dataset:

| Corpus | Size |
|---|---|
| NCSW indicators | **41** |
| Legal instruments | **29** |
| Resources | **33** |
| Total serialised | **~50 KB** |

Vector search is what you reach for when the corpus is too large to put in the
prompt and too varied to filter by hand — thousands of chunks, fuzzy queries. At
41 indicators, retrieval is a `WHERE` clause. Introducing embeddings would:

- **Add latency.** Every assessment would need an embedding call before the
  generation call. That is a network round trip added to the critical path in
  order to choose from 41 rows.
- **Add non-determinism.** Two people describing the same situation could be
  shown different law. For legal guidance that is a defect, not a feature.
- **Remove auditability.** "Why did it cite the Sindh DV Act?" currently has an
  exact answer: the person is in Sindh, and it is the statute in force there.
  With similarity search the answer becomes "it scored 0.83". When PNCY's
  lawyers are accountable for what the app tells people, that matters.

**Revisit when the corpus changes shape, not on a date.** The trigger is
retrieving from **full statute texts, case law or judgments** — bodies of
thousands of chunks where the relevant passage genuinely cannot be selected by
metadata. Concretely: more than ~2,000 retrievable chunks, or content where a
person's own words need matching against unstructured legal prose. The schema is
additive, so `alter table ... add column embedding vector(768)` remains available
the day that is true.

Until then, precision comes from **structured scoping**, which is deterministic,
free, and already implemented.

---

## What actually makes it fast

Measured, not estimated. Before this work every assessment carried a **~11,710
token** system prompt, of which about half was two JSON blobs injected whole
regardless of the case.

### Lever 1 — scope the corpus by case (done)

Law and resources were already scoped by province and gender. The NCSW indicators
(~3,600 tokens) and the penalties reference (~2,400 tokens) were not: a
cyber-harassment prompt carried every dowry and honour-crime indicator.

| Case | Before | After | Change |
|---|---|---|---|
| Cyber harassment, Sindh, woman | 11,710 | **5,497** | −53% |
| Domestic violence, Punjab, woman | 11,710 | **9,296** | −21% |
| Workplace harassment, ICT, man | 11,710 | **5,142** | −56% |
| Free text, no context | 11,710 | 12,118 | unchanged |

Free text is unchanged, and that is expected: with no structured answers there
is nothing to scope on. It is an argument for steering people to the guided flow,
not against the scoping.

The domestic case improves least because domestic cases genuinely need more law,
plus the family SOP. That is the correct outcome.

### Lever 2 — the reviewed answer cache (done)

The bigger win, and the reason a database helps speed at all.

The guided flow is a closed set of questions with a closed set of answers, so
situations collapse into a bounded space of combinations. "Woman, Punjab, at
home, husband, still married, children, wants khula, was hit, today" is not one
person's situation; it is thousands of people's situation. Spending a
multi-second model call on each of them, with a fresh chance of being slightly
wrong each time, is waste.

So the structured answers are hashed and the guidance stored against that hash:

```
guided answers → sha256 → assessment_cache → served in ~50ms
```

Anyone who typed free text opts out — their situation is their own and must
neither be served from cache nor stored for anyone else.

### Lever 3 — cache the reference data in memory (done)

The corpus is ~50 KB, so it is loaded once per warm instance and filtered in
memory, with a TTL (`REFERENCE_CACHE_TTL_MS`, default 5 minutes). Supabase
therefore adds effectively nothing to request latency, and a database blip
mid-assessment costs nothing.

### What is deliberately not done

**Streaming.** The assessment is a single JSON object the UI consumes atomically,
so streaming would need the response split into progressively-rendered parts.
That is a real improvement to perceived speed and a real piece of work; it is
listed in ROADMAP.md rather than half-built here.

---

## What actually makes it right

Speed was the easier half. The accuracy problems are data problems:

1. **Only 10 of 33 resources are verified.** Four provinces have no confirmed
   local resource at all.
2. **Verifying a phone number currently requires a code change and a deploy.**
   That is why the backlog does not move: it makes a five-minute phone call into
   an engineering task.
3. **Nothing records who checked what, or when.** Numbers rot silently.

The database fixes the second and third directly, which is what unblocks the
first:

- `resources` is editable in the Supabase table editor. A verified number is live
  everywhere within the cache TTL, with no deploy.
- `confirm_resource(id, who, note)` sets the flag, timestamps the check,
  schedules the next one, and writes `verification_log` in one step, so the audit
  trail cannot drift from the data.
- `resources_needing_verification` is the working list, and re-surfaces confirmed
  entries when `recheck_due_at` passes.
- `resource_coverage` shows confirmed resources per province, worst first — the
  gap report.

And the cache turns quality into something that compounds. `cache_review_queue`
orders cached answers by how many real people received them. Reviewing the top
fifty rows improves the guidance most users actually see, permanently. That is a
far better use of a lawyer's hour than reviewing prompt wording.

---

## Setup

### 1. Create the project

Create a Supabase project, then set in Vercel (and `.env.local` for development):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

The service role key bypasses RLS. It is used only in server-side route
handlers and must never be exposed to the browser or prefixed `NEXT_PUBLIC_`.

### 2. Apply the migrations

With the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste each file into the SQL editor in order:

```
supabase/migrations/20260828000001_schema.sql    tables, indexes, triggers
supabase/migrations/20260828000002_rls.sql       grants, RLS, views
supabase/migrations/20260828000003_functions.sql helper functions
supabase/seed.sql                                reference data
```

### 3. Verify

```sql
select * from resource_coverage;
```

Seven rows, Punjab with the most confirmed local resources. If the reference
tables are empty the application detects it and falls back to the bundled data
rather than serving an assessment with no law in it.

### Regenerating the seed

`supabase/seed.sql` is generated, not hand-written:

```bash
npm run seed:generate
```

Every statement is an upsert, so it is safe to re-apply to a populated database.
Referrals, cached answers and the audit log are untouched. **The verification
verdict on resources is preserved on conflict** — once the legal desk confirms a
number in the database, re-running the seed will not revert it to the
unconfirmed state still recorded in TypeScript.

---

## Schema

| Table | Purpose |
|---|---|
| `provinces` | Devolved facts: which DV act applies, marriage age, VAW centres |
| `legal_instruments` | Statutes, scoped by jurisdiction, category and gender |
| `ncsw_categories` / `ncsw_indicators` | The classification framework |
| `resources` | Support directory with the verification flag |
| `referrals` | The only table holding personal data |
| `assessment_cache` | Reviewed guidance keyed by situation |
| `assessment_events` | Anonymous analytics — no PII, no narrative |
| `verification_log` | Who confirmed what, and when |

| View | Purpose |
|---|---|
| `resources_needing_verification` | The legal desk's working list |
| `resource_coverage` | Confirmed resources per province, gaps first |
| `cache_review_queue` | Unreviewed guidance, most-served first |
| `referral_queue` | Open referrals, most urgent first |

### Security

The anon key ships to browsers and must be assumed public. It may read reference
data, which is public information anyway. It must never reach a referral, which
holds the name and phone number of someone who may be in danger from a person who
would like exactly that list.

Two things are worth knowing because they are easy to get wrong:

- **RLS is consulted only after table privileges pass**, so policies alone grant
  nothing. Supabase's bootstrap usually issues a blanket
  `grant select on all tables in schema public to anon`, which would hand anon a
  SELECT on `referrals`. The migration therefore states its grants explicitly and
  revokes the sensitive tables outright.
- **A Postgres view executes as its owner, not its caller**, so a view over an
  RLS-protected table punches straight through that protection. `referral_queue`
  selects names and phone numbers. Every view is created with
  `security_invoker = on` so RLS applies as intended.

Both were verified against a real PostgreSQL 16 instance, including with the
blanket grant applied: referrals and the referral queue return zero rows to
`anon`, while reference data reads normally.

---

## Cutover

The application works identically with or without the database, which is what
makes this safe to do incrementally. There is no flag day.

1. **Now — no database.** Everything reads the bundled TypeScript. This is the
   current production state.
2. **Set the environment variables.** Reference reads move to Supabase. If it is
   unreachable, slow (>2.5s) or empty, the bundled data serves and the user never
   sees an error. Referrals begin persisting to `referrals` alongside the Sheet
   and email.
3. **The cache starts filling.** Guided assessments without free text are stored
   and served. Review the top of `cache_review_queue`.
4. **The legal desk works the verification list**, in the table editor rather
   than through pull requests.
5. **Later — retire the TypeScript datasets** as the primary source, keeping them
   as the offline fallback. They are what makes step 2 safe, so they should not
   be deleted.

---

## Operations

**Verify a resource:**

```sql
select confirm_resource('sindh_women_helpline', 'Ayesha (PNCY)', 'Dialled 2026-09-01, answered');
```

**See the coverage gaps:**

```sql
select * from resource_coverage;
```

**Review the guidance most people receive:**

```sql
select * from cache_review_queue limit 20;

update assessment_cache
   set review_status = 'approved', reviewed_by = 'PNCY legal desk', reviewed_at = now()
 where cache_key = '...';
```

Setting `review_status = 'rejected'` stops it being served; the next request
regenerates it.

**Invalidate every cached answer** — after a material prompt or legal change,
bump `CACHE_VERSION` in `lib/db/assessment-cache.ts`. Old entries become
unreachable rather than needing deletion.

**Where usage is concentrated:**

```sql
select province, count(*), avg(latency_ms)::int as avg_ms,
       count(*) filter (where cache_hit) as from_cache
from assessment_events
where created_at > now() - interval '30 days'
group by province order by count(*) desc;
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | for the backend | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | for the backend | Server-side key. Never `NEXT_PUBLIC_`. |
| `REFERENCE_CACHE_TTL_MS` | no | Reference cache TTL, default 300000 |
| `GEMINI_API_KEY` | yes | Assessment engine |

Without the Supabase variables the app runs exactly as it does today, on the
bundled data.

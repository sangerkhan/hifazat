# Hifazat — Build Roadmap

Target: **v2 launch, October 2026**, with the PNCY partnership (legal desk of 15
lawyers, hosting, co-branding).

---

## Shipped

### MVP
- [x] Landing page, hero, emergency strip
- [x] Free-text assessment (`/assess`)
- [x] Guided questionnaire (`/guided`)
- [x] Resources directory (`/resources`)
- [x] NCSW indicator knowledge base and Pakistani legal provisions
- [x] Quick exit, discreet tab title

### Urdu and localisation
- [x] EN/UR translation system with a toggle on every screen
- [x] RTL layout, Urdu font loading, locale persisted to localStorage
- [x] AI responds in the interface language regardless of input language

### Live AI
- [x] Gemini 2.5 Flash, falling back to Flash-Lite
- [x] Offline keyword fallback when the model is unreachable
- [x] Structured JSON output with validation and retry across models

### Jurisdiction and questionnaire correctness
- [x] Province registry with per-province devolved legislation
      (`lib/provinces.ts`). Corrects the app's previous assumption that the
      Domestic Violence Act 2012 is national — it applies to Islamabad only,
      and each province has its own act.
- [x] Law and resources scoped **in code** before the prompt is built, rather
      than asking the model to filter. It cannot cite a statute that does not
      operate where the user lives, or a helpline we have not verified.
- [x] Guided flow rebuilt on stable option IDs (`lib/guided-flow.ts`),
      replacing branching that matched on localised display strings
- [x] Relationship- and marital-status-aware goals — khula is no longer offered
      to people who are divorced or were never married
- [x] New questions: safety check, marital status, child ages, recency,
      evidence held, prior reporting, and a review-and-edit step
- [x] Danger interstitial that surfaces emergency numbers immediately and lets
      someone skip the questionnaire entirely
- [x] Answer pruning, so changing an earlier answer cannot carry a stale goal
      into the assessment
- [x] Resource directory covering all 7 provinces and territories, with
      province/type/search filters and a verification flag
- [x] Test suite for the branching, scoping and referral logic (`npm test`)

### Lawyer referral
- [x] Case taxonomy and routing to the PNCY desks (`lib/referral.ts`)
- [x] Pluggable delivery sinks: Google Sheets, email, dev console
      (`lib/referral-sinks.ts`)
- [x] `POST /api/refer` with validation, consent enforcement, rate limiting
- [x] Consent-first intake form with a safe-to-contact question
- [x] Reference codes for follow-up

---

## Next

### Blocked on credentials or the team
- [ ] **Verify the resource directory** — `docs/RESOURCE-VERIFICATION.md`. The
      single highest-value pre-launch task. Unverified entries are currently
      invisible to the AI and not tap-to-call, so this is what switches them on.
- [ ] **Connect referral delivery** — set `GOOGLE_SHEETS_WEBHOOK_URL` or the
      `RESEND_*` variables. See `docs/REFERRALS.md`. Until then `/api/refer`
      returns 503 by design.
- [ ] **Confirm the desk taxonomy** matches how the 15 lawyers are actually
      divided, and adjust `LAWYER_CATEGORY_LABELS`.
- [ ] **Resolve FIA vs NCCIA** for cyber complaint routing — both are currently
      listed and one is likely stale.

### Verified legal data in Supabase — BUILT, awaiting a project
- [x] Schema, RLS and helper functions (`supabase/migrations/`), verified
      against a real PostgreSQL 16 instance
- [x] Generated seed from the TypeScript datasets (`npm run seed:generate`),
      preserving the verification verdict on re-apply
- [x] Data-access layer with in-memory caching and automatic fallback to the
      bundled data, so the cutover is a config change and an outage is invisible
- [x] Anonymised interaction logging — category, severity, province, latency;
      no PII, no narrative
- [x] Supabase referral sink alongside Sheets and email
- [x] Reviewed answer cache, so common situations are served from Postgres and
      the legal desk can correct the guidance most people actually receive
- [ ] Create the project and set `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Work the verification list in the table editor rather than by pull request

### Know Your Rights library — SHIPPED
- [x] `/rights` — the six NCSW categories, what each covers, and the statute
      actually in force where the reader lives
- [x] Province selector shared with the directory, so it is chosen once
- [x] Concrete action steps per category
- [x] Category names, descriptions and all 40 indicator names translated to
      Urdu; indicator descriptions and worked examples remain English and are
      shown as such rather than omitted

### About / methodology — SHIPPED
- [x] `/about` — how the assessment works, why province matters, sources,
      limitations, privacy, and a prominent not-legal-advice disclaimer
- [x] Verification policy published: what "confirmed" means, and the honest
      statement that some provinces show fewer numbers as a result
- [x] Shared `SiteFooter` with navigation — the landing page previously had no
      link to the directory at all

### Branding and v2 identity
- [ ] Refreshed visual identity reflecting the expanded scope
- [ ] PNCY co-branding

### Additional intake channels
- [ ] WhatsApp Business API intake
- [ ] Instagram and Facebook DM intake
- [ ] All three feed the same referral pipeline — `source` is already modelled

### Later
- [ ] Streaming responses — the largest remaining perceived-latency win, and the
      one the prompt scoping does not address
- [ ] ~~RAG with pgvector~~ — **deliberately deferred.** The corpus is 41
      indicators and 29 statutes; similarity search over that would add an
      embedding round trip and non-determinism to a selection a WHERE clause
      makes exactly, and would cost the auditability that legal guidance needs.
      Revisit when retrieving over full statute texts or case law
      (~2,000+ chunks). Reasoning and the trigger in `docs/BACKEND.md`.
- [ ] Shareable/printable assessment result
- [ ] Aggregate trend dashboard for partner organisations
- [ ] Desktop and tablet layouts
- [ ] Native iOS and Android
- [ ] Legal admin portal, once the network reaches 100 lawyers
- [ ] Sandbox / game-style environments for school and college workshops

---

## Performance

Measured system prompt size per assessment, after scoping the corpus by case:

| Case | Before | After |
|---|---|---|
| Cyber harassment, Sindh | 11,710 tok | 5,497 tok |
| Domestic violence, Punjab | 11,710 tok | 9,296 tok |
| Workplace harassment, ICT | 11,710 tok | 5,142 tok |
| Free text, no context | 11,710 tok | 12,118 tok |

Free text cannot be scoped — there is nothing to scope on — which is an argument
for steering people into the guided flow.

---

## Known gaps

- **Rate limiting is per-instance.** Fine for now; move to Supabase or Upstash
  with the backend.
- **`@anthropic-ai/sdk` is an unused dependency.** Nothing imports it since the
  switch to Gemini; safe to remove.
- **No province-specific harassment ombudspersons.** All workplace cases route
  to federal FOSPAH; Punjab, Sindh, KP and Balochistan each have their own.
- **Balochistan, GB and AJK have no confirmed local resource.** Users there see
  national numbers only until the verification pass is done.

---

## Success metrics (6 months post-launch)

| Metric | Target |
|---|---|
| Monthly assessments completed | 5,000+ |
| Referrals sent to the legal desk | Track by `reference` |
| Referral to first contact | < 48 hours |
| Average time to first response | < 8 seconds |
| Urdu usage share | > 40% of assessments |
| Resource entries verified | 100% before launch |

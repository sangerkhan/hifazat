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

### Verified legal data in Supabase
- [ ] Supabase project; tables for `legal_provisions`, `resources`,
      `knowledge_chunks`, `referrals`
- [ ] Migrate the TypeScript datasets, keeping the verification flag as a column
- [ ] Data-access layer so the cutover is a config change
- [ ] Anonymised interaction logging — category and severity only, no PII
- [ ] Add a Supabase referral sink

### Know Your Rights library
- [ ] `/rights` — browsable explainers per NCSW category, filtered by province
- [ ] Legal definition, real examples, relevant law and section, action steps
- [ ] Add to navigation; full EN/UR

### About / methodology
- [ ] `/about` — how the AI works, sources, limitations, disclaimer
- [ ] Publish the verification policy: what "confirmed" means and who checked

### Branding and v2 identity
- [ ] Refreshed visual identity reflecting the expanded scope
- [ ] PNCY co-branding

### Additional intake channels
- [ ] WhatsApp Business API intake
- [ ] Instagram and Facebook DM intake
- [ ] All three feed the same referral pipeline — `source` is already modelled

### Later
- [ ] RAG with pgvector, replacing full knowledge-base injection
- [ ] Shareable/printable assessment result
- [ ] Aggregate trend dashboard for partner organisations
- [ ] Desktop and tablet layouts
- [ ] Native iOS and Android
- [ ] Legal admin portal, once the network reaches 100 lawyers
- [ ] Sandbox / game-style environments for school and college workshops

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

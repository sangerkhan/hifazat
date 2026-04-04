# Hifazat — Build Roadmap

## What's Built (MVP Prototype)
- [x] Landing page with hero, CTAs, emergency strip
- [x] Free text assessment (input + result display)
- [x] Guided input mode (5-step question flow + result display)
- [x] Resources directory (sorted, categorised, tappable phone links)
- [x] Quick Exit (replaces browser history)
- [x] Discreet tab title ("My Resources")
- [x] Bottom navigation (Home, Resources, Exit)
- [x] Hardcoded demo responses (keyword-based)
- [x] NCSW knowledge base encoded in TypeScript
- [x] Claude API route (built, using hardcoded responses for now)

---

## What's Next — Phase by Phase

### Phase 1 — Urdu Translation + Language Toggle ← NEXT
> The spec calls for "full Urdu support with proper right-to-left layout" and "language toggle on every screen"

- [ ] Create i18n system with EN/UR translation files
- [ ] Universal language toggle in header (persistent across pages, saved to localStorage)
- [ ] Translate ALL UI strings: headings, buttons, placeholders, labels, emergency strip, guided flow questions/options, result section headings, bottom nav
- [ ] RTL layout support — when Urdu is active, flip text direction, alignment, and mirrored layouts
- [ ] Add Noto Sans Urdu subset to font loading
- [ ] Urdu page title: "حفاظت" when in Urdu mode
- [ ] Test guided flow options in Urdu (they should be culturally accurate, not just literal translations)

### Phase 2 — Connect Live AI
> Replace hardcoded demo responses with real Claude API

- [ ] Switch API route to real Claude Sonnet calls
- [ ] Test with both English and Urdu inputs (AI already responds in user's language per system prompt)
- [ ] Add streaming for faster perceived response time
- [ ] Graceful error handling and retry logic
- [ ] Test across all guided flow combinations + edge cases

### Phase 3 — Know Your Rights Library
> Spec Feature 3: "A browsable reference section that provides plain-language explainers of each type of violence"

- [ ] New screen: `/rights` — browsable, expandable cards for each NCSW category
- [ ] Each entry: legal definition, real-world examples, relevant law + section, action steps
- [ ] Search/filter by category
- [ ] Add "Your Rights" to bottom navigation (spec says 3 nav items: Home, Your Rights, Resources)
- [ ] EN/UR support for all rights content

### Phase 4 — Province-Aware Resources
> Spec: "Province-filterable directory of helplines, NGOs, legal aid, shelters"

- [ ] Add province filter to resources page
- [ ] Expand resources data with more provincial helplines, shelters, legal aid
- [ ] Province detection or selection (user picks their province once)
- [ ] Show relevant provincial resources in assessment results

### Phase 5 — About / Methodology Page
> Spec: "Transparency page: how the AI works, which sources power it, limitations, disclaimer"

- [ ] New screen: `/about`
- [ ] How the AI works (plain language)
- [ ] Source publications listed
- [ ] Limitations and disclaimer
- [ ] "Not a substitute for legal advice" messaging

### Phase 6 — Supabase + Database
> Spec: "Supabase (PostgreSQL + pgvector)"

- [ ] Set up Supabase project
- [ ] Create tables: `knowledge_chunks`, `resources`, `interaction_logs`
- [ ] Migrate knowledge base from TypeScript to Supabase
- [ ] Migrate resources from TypeScript to Supabase
- [ ] Anonymised interaction logging (category + severity only, NO PII)

### Phase 7 — RAG Pipeline
> Spec: "Retrieval-Augmented Generation pipeline with pgvector embeddings"

- [ ] Generate vector embeddings for all knowledge base chunks
- [ ] Replace full-KB injection in system prompt with vector similarity search
- [ ] Retrieve top-k relevant chunks per user query
- [ ] More efficient, scalable, and accurate AI responses

### Phase 8 — Response Sharing
> Spec: "Allow users to save/share their assessment response as a PDF or shareable link"

- [ ] Generate shareable link (ephemeral, time-limited, no account required)
- [ ] PDF export of assessment results
- [ ] Share button in assessment result UI

### Phase 9 — Trend Dashboard
> Spec: "Aggregated, anonymised data visualisation for partner organisations"

- [ ] Admin dashboard at `/dashboard` (gated access)
- [ ] Visualise: categories, severity distribution, province breakdown, language split
- [ ] No individual data exposed — only aggregates
- [ ] Export capability for partner orgs (NCSW, PCSW, NCHR)

### Phase 10 — Desktop + Responsive Layout
> Spec: "Three breakpoints: 0-640px, 641-1024px, 1025px+"

- [ ] Tablet layout (constrained center column)
- [ ] Desktop layout (860px max-width, top nav instead of bottom nav)
- [ ] Responsive breakpoints throughout

### Phase 11 — WhatsApp Integration
> Spec: "Explore WhatsApp-based interface via WhatsApp Business API"

- [ ] Research WhatsApp Business API / Twilio feasibility
- [ ] Build conversational flow for assessment via WhatsApp
- [ ] Connect to same AI engine

---

## Success Metrics (from spec — 6 months post-launch)
| Metric | Target |
|---|---|
| Monthly assessments completed | 5,000+ |
| Helpline referrals generated | Track via resource card clicks |
| Average time to first response | < 8 seconds |
| Knowledge base coverage | 100% of P0 + P1 sources |
| Urdu usage share | > 40% of assessments |

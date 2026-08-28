# Lawyer referral pipeline

How a case gets from the app to the PNCY legal desk.

## Status

The pipeline is built and tested end to end. It is **not delivering anywhere
yet** because it needs credentials that only the team can supply — see
[Configuration](#configuration). Until at least one destination is configured,
`POST /api/refer` returns `503 referral_unavailable` and the form tells the
person we could not pass their case on.

That refusal is deliberate. A referral that silently goes nowhere is worse than
one that is declined, because the person stops looking for help.

## The flow

```
Guided questionnaire
  → structured case context  (lib/guided-flow.ts → deriveCaseContext)
  → assessment result screen
  → "Ask a lawyer to contact me"  (components/ReferralForm.tsx)
  → POST /api/refer               (validate, rate limit, route)
  → routeToCategory()             (pick the desk)
  → deliverReferral()             (Google Sheet + email, in parallel)
  → reference number shown to the person
```

## What gets sent

One row per referral. Column order is fixed in `REFERRAL_COLUMNS`
(`lib/referral.ts`) because the Sheet appends by position — if you change the
order, change the header row too.

| Column | Notes |
|---|---|
| `reference` | `HFZ-YYMMDD-XXXX`. Quoted by the person when they follow up. |
| `received_at` | ISO timestamp, UTC. |
| `urgency` | `emergency`, `priority` or `standard`. |
| `category` / `category_label` | Which desk. See below. |
| `name` | As given. May be a first name only; the form says that is fine. |
| `phone` | Normalised to `+92XXXXXXXXXX`. |
| `safe_to_call` | `YES` or `NO — MESSAGE FIRST`. **Read this before dialling.** |
| `best_time` | `any`, `morning`, `afternoon`, `evening`. |
| `email`, `city`, `province` | Optional. |
| `gender`, `relationship`, `still_married`, `has_children` | Derived from the questionnaire. |
| `information_only` | `yes` when the person said they are not ready to act. Do not push them. |
| `assessment_category`, `assessment_severity` | What the assessment concluded. |
| `language` | `en` or `ur`. Match it when you make contact. |
| `source` | `web_guided` today; `whatsapp` / `instagram` / `facebook` when DM intake lands. |
| `narrative` | The full account, in English. |

### `safe_to_call` is the field that matters

For someone still living with the person who hurt them, an unexpected call from
an unknown lawyer can be the thing that escalates the danger. The form defaults
this to **no**, and the email puts a red banner at the top when it is set. Treat
it as binding: send a message and wait for a reply before ringing.

## Desks

Defined in `LAWYER_CATEGORY_LABELS` and assigned by `routeToCategory`. Adjust
these to match how the panel of 15 is actually divided.

| Key | Desk |
|---|---|
| `family_matrimonial` | Family & Matrimonial — khula, custody, maintenance, dowry |
| `domestic_violence` | Domestic Violence & Protection Orders |
| `criminal_violence` | Criminal — violence, assault, sexual offences, honour crimes |
| `cyber_harassment` | Cyber & Online Harassment |
| `workplace_harassment` | Workplace & Institutional Harassment |
| `property_inheritance` | Property & Inheritance |
| `child_protection` | Child Protection & Custody |
| `general` | Needs triage |

Routing is most-specific-first. A workplace case that also involves assault goes
to the harassment desk, because the ombudsperson route has a 30-day clock on it.
A domestic case that is really about dissolving the marriage goes to family; one
that is about stopping violence goes to the protection desk.

## Configuration

Set these in Vercel (or `.env.local` for development). Configuring **either**
destination is enough; configuring both gives redundancy, and a referral counts
as delivered if either succeeds.

### Google Sheet

```
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
GOOGLE_SHEETS_SHARED_SECRET=<a long random string>
```

1. Create the Sheet. Add a header row matching `REFERRAL_COLUMNS` exactly.
2. Extensions → Apps Script, and paste the script below.
3. Set `SECRET` in the script to the same value as
   `GOOGLE_SHEETS_SHARED_SECRET`.
4. Deploy → New deployment → Web app. Execute as **Me**, access **Anyone**.
5. Copy the `/exec` URL into `GOOGLE_SHEETS_WEBHOOK_URL`.

An Apps Script web app is public to anyone holding the URL, which is why the
shared secret is not optional — without it, anyone who finds the URL can write
rows into the legal desk's queue.

```javascript
const SECRET = 'PUT_THE_SAME_VALUE_AS_GOOGLE_SHEETS_SHARED_SECRET_HERE';

const COLUMNS = [
  'reference', 'received_at', 'urgency', 'category', 'category_label',
  'name', 'phone', 'safe_to_call', 'best_time', 'email', 'city', 'province',
  'gender', 'relationship', 'still_married', 'has_children',
  'information_only', 'assessment_category', 'assessment_severity',
  'language', 'source', 'narrative',
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SECRET) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const row = body.row || {};
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow(COLUMNS.map(function (key) { return row[key] || ''; }));

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

To notify the team on every new row, add a second Apps Script trigger on the
Sheet, or rely on the email sink below.

### Email

```
RESEND_API_KEY=re_...
REFERRAL_EMAIL_TO=legal@pncy.example,desk@pncy.example
REFERRAL_EMAIL_FROM=Hifazat <referrals@hifazat.app>
```

Uses [Resend](https://resend.com). The sending domain must be verified there, or
delivery fails silently at their end. `REFERRAL_EMAIL_TO` is comma-separated.

Subjects are prefixed `[EMERGENCY]` or `[Priority]` so the desk can filter.

### Development

With neither configured and `NODE_ENV !== 'production'`, referrals print to the
console with the phone number partly redacted, so the flow can be exercised
locally. That console sink **refuses to count as configured in production** — a
missing environment variable on deploy fails loudly instead of dropping real
cases into a log nobody reads.

## Adding a destination

Implement `ReferralSink` in `lib/referral-sinks.ts` and add it to
`PRIMARY_SINKS`:

```ts
const supabaseSink: ReferralSink = {
  name: "supabase",
  isConfigured: () => Boolean(process.env.SUPABASE_SERVICE_KEY),
  async deliver(record) { /* insert into referrals */ },
};
```

Sinks run in parallel and failures are isolated: if the Sheet is unreachable but
the email lands, the referral has still reached a human.

## Rate limiting

`/api/refer` allows 5 submissions per IP per hour, held in per-instance memory.
On a serverless platform that is per warm instance rather than global — enough to
blunt a naive script, and set well above what a person in distress would ever
legitimately send. Move it to Supabase or Upstash when the backend lands.

## Privacy

- Nothing is stored by Hifazat. The record is assembled in memory, delivered, and
  discarded.
- The assessment endpoint stores nothing at all; only an explicit referral, with
  a ticked consent box, sends anything anywhere.
- Sink failures are logged server-side but never returned to the browser, since
  an error body can echo submitted content.
- The console sink redacts most of the phone number.
- The reference code contains no personal information.

## Testing

`npm test` covers routing, phone normalisation, consent enforcement and
reference-code generation. To test delivery itself, set the environment
variables and submit through the UI — there is no mock sink, because the thing
worth testing is whether the real credentials work.

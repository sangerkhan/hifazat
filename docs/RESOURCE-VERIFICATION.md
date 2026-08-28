# Resource verification checklist

This is the single highest-value task the PNCY legal desk can do before the
October launch, and it needs a human with a phone rather than a developer.

## Why it matters

Every other error in this app is recoverable. A wrong helpline number is not:
someone in a crisis dials it once, gets a dead tone or a wrong number, and
concludes that help does not exist. They do not try again.

So `lib/resources.ts` marks each entry `confirmed` or `unconfirmed`, and the code
enforces two rules from that flag:

1. **The AI is only ever shown confirmed resources.** `getResourcesForPrompt`
   filters unconfirmed entries out, so the model physically cannot tell someone
   to call a number we have not stood behind — even if it has seen that number
   in its training data.
2. **The directory does not render an unconfirmed number as a tap-to-call
   link.** Those organisations appear in a separate "Also in your area" section
   with their website, and a note explaining that we are still confirming their
   details.

The consequence is that unverified entries are, for practical purposes, invisible
to users. Working through this list is what switches them on.

## How to verify an entry

For each row below:

1. Dial the number, or visit the office/website.
2. Confirm the organisation still operates, still serves this province, and still
   offers the service described.
3. Confirm the operating hours.
4. In `lib/resources.ts`, set `verification: "confirmed"`, correct any details,
   and delete the `verifyNote`.
5. Add the date and the name of whoever checked, in the commit message.

Re-check the whole list every six months. Numbers rot.

## Priority 1 — inherited from the prototype, currently shown or nearly shown

These were in the original app and may already have reached real users.

| ID | Organisation | Listed contact | What to check |
|---|---|---|---|
| `aghs` | AGHS Legal Aid Cell (Punjab) | `0800-00123` | This number came from the original prototype with no source. AGHS is real and important; the number is unverified. Confirm directly with their Lahore office. |
| `sindh_women_helpline` | Sindh Women's Helpline | `1094` | Confirm the short code is live and staffed, and establish real operating hours. Sindh currently has the thinnest verified coverage of any large province. |
| `rozan` | Rozan Counselling Helpline | `0304-111-1741` | Confirm number and hours. |
| `bedari` | Bedari (Punjab) | `0300-5251717` | Confirm the mobile line is still in service. |
| `nchr` | National Commission for Human Rights | `051-9217340`, `complaints@nchr.gov.pk` | Confirm the direct complaints line and inbox. |
| `madadgaar` | Madadgaar National Helpline | `1098` | Widely published, but dial it and confirm it reaches LHRLA. |
| `cpwb_punjab` | Child Protection & Welfare Bureau, Punjab | `1121` | Confirm the short code. |

## Priority 2 — the FIA to NCCIA transition

Cyber crime reporting has moved from the FIA Cyber Crime Wing to the National
Cyber Crime Investigation Agency. The app currently lists **both**, which means
one of them is probably stale, and cyber cases are a large share of what Hifazat
sees.

| ID | Organisation | Listed contact | What to check |
|---|---|---|---|
| `fia_cybercrime` | FIA Cyber Crime Wing | `1991`, `complaint.fia.gov.pk` | Is this still the correct route, or does it now redirect? |
| `nccia` | NCCIA | `1799`, `nccia.gov.pk` | Confirm the public helpline number and whether complaints should now be filed here instead. |

Once resolved, whichever is correct should be `confirmed` and the other removed
or downgraded. This also affects `primary_action` routing for every cyber case.

## Priority 3 — provincial coverage gaps

Punjab has real depth. Everywhere else is thin, and Balochistan, Gilgit-Baltistan
and Azad Jammu & Kashmir currently have **no confirmed province-specific
resource at all** — users there see only national numbers.

| ID | Province | What to check |
|---|---|---|
| `scsw` | Sindh | Sindh Commission on the Status of Women — contact details and complaint intake. |
| `war_karachi` | Sindh | War Against Rape Karachi office number. |
| `legal_aid_society` | Sindh / national | Intake number and referral process. |
| `kpcsw` | KP | KP Commission on the Status of Women — contact and intake route. |
| `da_hawwa_lur` | KP | Confirm still operating; get intake number. |
| `blue_veins` | KP | Contact details and current programmes. One of very few services working with transgender people. |
| `bcsw` | Balochistan | Contact details; is complaint intake actually operational? |
| `aurat_balochistan` | Balochistan | Quetta office number. |
| `gb_social_welfare` | Gilgit-Baltistan | Which district offices handle violence cases? Is there any shelter capacity at all? |
| `ajk_social_welfare` | AJK | Departmental contacts, and which federal statutes AJK has adopted locally. |
| `war_lahore` | Punjab | Lahore office number. |
| `dastak` | Punjab | Intake number; whether direct approach is accepted or referral is required. |
| `sahil` | National | Current toll-free number for child sexual abuse cases. |
| `aurat_foundation` | National | Provincial office numbers. |
| `shirkat_gah` | National | Lahore and Karachi office numbers. |

## Priority 4 — confirmed entries that could be improved

These are live, but incomplete.

| ID | What would improve it |
|---|---|
| `fospah` | Website is confirmed; a public phone number should be added. |
| `vawc_punjab` | Establish which districts have an operational Violence Against Women Centre and add direct numbers, rather than routing everyone through 1043. |
| `darulaman_route` | Deliberately listed without a number because access is district-level. Adding per-district numbers for Lahore, Karachi, Islamabad, Peshawar and Quetta would materially help. |
| `rescue_1122` | Currently scoped to Punjab and KP. Confirm which other regions have operational Rescue 1122 coverage. |

## Legal points needing sign-off

Held in `lib/provinces.ts`. Instruments marked `unconfirmed` are excluded from
the prompt in the same way unverified resources are.

| Item | What to check |
|---|---|
| ICT minimum marriage age | `PROVINCES.ict.minMarriageAgeFemale` is set to 18 on the basis of the Child Marriage Restraint (Amendment) Act 2025, flagged `unconfirmed`. Confirm it is in force. Until then the app does not rely on it. |
| GB and AJK marriage age | Both assume the 1929 Act default of 16. Confirm what actually applies. |
| GB and AJK domestic violence | No confirmed statute, so the app falls back to Penal Code hurt provisions. Establish whether either has adopted a domestic violence act. |
| Punjab women's property rights | A Punjab equivalent of the KP 2019 and ICT 2020 property acts may exist. If so, add it. |
| Provincial harassment ombudspersons | The app currently routes all workplace cases to federal FOSPAH. Punjab, Sindh, KP and Balochistan each have a provincial ombudsperson; adding them would give better local routing. |

## Things deliberately not in the dataset

Noted so nobody assumes they were forgotten:

- **Private law firms.** The app refers to the PNCY panel through the referral
  flow, not through this directory.
- **Individual district Dar-ul-Aman numbers.** Access is via the district Social
  Welfare Department, so a single national entry explains the route instead.
- **Numbers found only in blog posts or news articles.** If it cannot be traced
  to the organisation itself, it does not go in as `confirmed`.

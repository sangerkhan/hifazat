import { NextResponse } from "next/server";
import {
  buildReferralRecord,
  validateReferral,
  type ReferralSubmission,
} from "@/lib/referral";
import { deliverReferral, getConfiguredSinks } from "@/lib/referral-sinks";
import { allowRequest, clientBucket } from "@/lib/rate-limit";
import {
  PROVINCE_IDS,
  type CaseCategory,
  type Gender,
  type ProvinceId,
} from "@/lib/provinces";

const VALID_GENDERS: Gender[] = ["woman", "man", "transgender", "unspecified"];
const VALID_CATEGORIES: CaseCategory[] = [
  "domestic",
  "sexual",
  "cyber",
  "workplace",
  "harmful_practice",
  "economic",
  "child",
  "family_law",
  "physical",
  "other",
];
const VALID_RELATIONSHIPS = [
  "spousal",
  "family",
  "workplace",
  "online",
  "other",
  "unknown",
];
const VALID_TIMES = ["any", "morning", "afternoon", "evening"];

// ---------------------------------------------------------------------------
// Input shaping
// ---------------------------------------------------------------------------

function sanitiseContext(raw: unknown): ReferralSubmission["context"] {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  const ctx: NonNullable<ReferralSubmission["context"]> = {};

  if (typeof c.gender === "string" && VALID_GENDERS.includes(c.gender as Gender)) {
    ctx.gender = c.gender as Gender;
  }
  if (typeof c.province === "string" && PROVINCE_IDS.includes(c.province as ProvinceId)) {
    ctx.province = c.province as ProvinceId;
  }
  if (Array.isArray(c.categories)) {
    const categories = c.categories.filter(
      (x): x is CaseCategory =>
        typeof x === "string" && VALID_CATEGORIES.includes(x as CaseCategory),
    );
    if (categories.length) ctx.categories = categories;
  }
  if (typeof c.relationship === "string" && VALID_RELATIONSHIPS.includes(c.relationship)) {
    ctx.relationship = c.relationship as typeof ctx.relationship;
  }
  if (typeof c.urgent === "boolean") ctx.urgent = c.urgent;
  if (typeof c.stillMarried === "boolean") ctx.stillMarried = c.stillMarried;
  if (typeof c.hasChildren === "boolean") ctx.hasChildren = c.hasChildren;
  if (typeof c.informationOnly === "boolean") ctx.informationOnly = c.informationOnly;

  return ctx;
}

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

// ---------------------------------------------------------------------------
// GET — is the pipeline actually wired up?
// ---------------------------------------------------------------------------

/**
 * Lets the result screen decide whether to offer a referral at all. Without
 * this the "Ask a lawyer to contact me" button would render in production
 * before the legal desk's Sheet or inbox is connected, and every submission
 * would fail after the person had already handed over their name and number.
 *
 * The CTA appears on its own once a sink is configured — there is no separate
 * feature flag to remember to flip.
 */
export function GET() {
  return NextResponse.json(
    { available: getConfiguredSinks().length > 0 },
    // Cheap to compute, but must not be cached across a deploy that adds the
    // credentials, or the button would stay hidden until the cache expired.
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // A referral that goes nowhere is worse than one that is refused, because the
  // person stops looking for help. So this is checked before anything else, and
  // the response says plainly that we could not pass the case on.
  if (getConfiguredSinks().length === 0) {
    console.error(
      "[referral] rejected: no delivery sink configured. Set GOOGLE_SHEETS_WEBHOOK_URL or the RESEND_* variables — see docs/REFERRALS.md.",
    );
    return NextResponse.json(
      { error: "referral_unavailable" },
      { status: 503 },
    );
  }

  // Five per hour per client. Shared across instances where a database is
  // configured; per-instance otherwise. Set well above what a person in
  // distress would ever legitimately send.
  if (!(await allowRequest(clientBucket(request, "refer"), { max: 5, windowSeconds: 3600 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const bestTime =
    typeof body.bestTime === "string" && VALID_TIMES.includes(body.bestTime)
      ? (body.bestTime as ReferralSubmission["bestTime"])
      : "any";

  const submission: ReferralSubmission = {
    name: str(body.name, 120) ?? "",
    phone: str(body.phone, 40) ?? "",
    email: str(body.email, 160),
    city: str(body.city, 120),
    // Default to the cautious reading: if the flag did not arrive, assume a
    // call is not safe rather than assuming it is.
    safeToCall: body.safeToCall === true,
    bestTime,
    consent: body.consent === true,
    narrative: str(body.narrative, 6000) ?? "",
    context: sanitiseContext(body.context),
    locale: body.locale === "ur" ? "ur" : "en",
    assessmentCategory: str(body.assessmentCategory, 160),
    assessmentSeverity: str(body.assessmentSeverity, 40),
  };

  const validation = validateReferral(submission);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const record = buildReferralRecord(submission, {
    normalisedPhone: validation.normalisedPhone!,
    source: "web_guided",
  });

  const result = await deliverReferral(record);

  if (!result.delivered) {
    // Every sink failed. Do not claim success — the person needs to know their
    // case did not reach anyone so they can use a helpline instead.
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({
    reference: record.reference,
    category: record.category,
    categoryLabel: record.categoryLabel,
    urgency: record.urgency,
  });
}

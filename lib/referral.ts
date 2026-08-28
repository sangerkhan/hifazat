/**
 * Lawyer referral: taxonomy, routing, validation and record shape.
 *
 * The PNCY partnership provides a panel of lawyers split into a small number of
 * broad practice areas. A referral therefore has to answer one question well —
 * which desk does this land on — and carry enough context that the lawyer who
 * picks it up does not have to make the person tell the story a third time.
 *
 * Delivery is deliberately not handled here. See `referral-sinks.ts`.
 */

import type { CaseCategory, Gender, ProvinceId } from "./provinces";
import { PROVINCES } from "./provinces";

/** The desks a case can be routed to. Keep this aligned with the panel. */
export type LawyerCategory =
  | "family_matrimonial"
  | "domestic_violence"
  | "criminal_violence"
  | "cyber_harassment"
  | "workplace_harassment"
  | "property_inheritance"
  | "child_protection"
  | "general";

export const LAWYER_CATEGORY_LABELS: Record<LawyerCategory, string> = {
  family_matrimonial: "Family & Matrimonial",
  domestic_violence: "Domestic Violence & Protection Orders",
  criminal_violence: "Criminal — Violence & Assault",
  cyber_harassment: "Cyber & Online Harassment",
  workplace_harassment: "Workplace & Institutional Harassment",
  property_inheritance: "Property & Inheritance",
  child_protection: "Child Protection & Custody",
  general: "General — needs triage",
};

export type Urgency = "emergency" | "priority" | "standard";

/** Facts about the case, as derived by the guided flow. */
export interface ReferralCaseContext {
  gender?: Gender;
  province?: ProvinceId;
  categories?: CaseCategory[];
  relationship?: "spousal" | "family" | "workplace" | "online" | "other" | "unknown";
  urgent?: boolean;
  stillMarried?: boolean;
  hasChildren?: boolean;
  informationOnly?: boolean;
}

/** What the person fills in on the form. */
export interface ReferralSubmission {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  /**
   * Whether it is safe to ring this number. In a live abuse situation a call
   * from an unknown lawyer can escalate the danger, so this drives how the desk
   * makes first contact and is surfaced prominently in the delivered record.
   */
  safeToCall: boolean;
  bestTime: "any" | "morning" | "afternoon" | "evening";
  consent: boolean;
  /** The account of the situation, as composed by the guided flow. */
  narrative: string;
  context?: ReferralCaseContext;
  locale?: "en" | "ur";
  /** Primary classification from the assessment, where one was produced. */
  assessmentCategory?: string;
  assessmentSeverity?: string;
}

/** What actually gets delivered to the legal desk. */
export interface ReferralRecord extends ReferralSubmission {
  reference: string;
  category: LawyerCategory;
  categoryLabel: string;
  urgency: Urgency;
  provinceLabel?: string;
  receivedAt: string;
  /** Which surface the referral came from, for when DM intake goes live. */
  source: "web_guided" | "web_assess" | "whatsapp" | "instagram" | "facebook";
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/**
 * Picks the desk. Ordered most-specific first: a workplace case that also
 * involves assault still belongs with the harassment desk, because the
 * ombudsperson route is the one with a 30-day clock on it.
 */
export function routeToCategory(ctx: ReferralCaseContext | undefined): LawyerCategory {
  if (!ctx) return "general";

  const categories = new Set(ctx.categories ?? []);
  const has = (c: CaseCategory) => categories.has(c);

  if (ctx.relationship === "workplace" || has("workplace")) {
    return "workplace_harassment";
  }

  if (ctx.relationship === "online" || (has("cyber") && !has("domestic"))) {
    return "cyber_harassment";
  }

  if (has("child")) return "child_protection";

  // Violence that needs a criminal case takes precedence over the family-law
  // remedies, because FIR timing and medico-legal evidence are time-critical.
  if (has("sexual") || has("harmful_practice")) return "criminal_violence";

  if (has("domestic")) {
    // A domestic case that is really about dissolving the marriage belongs with
    // the family desk; one that is about stopping violence belongs with the
    // protection desk.
    if (has("family_law") && !has("physical")) return "family_matrimonial";
    return "domestic_violence";
  }

  if (has("physical")) return "criminal_violence";
  if (has("family_law")) return "family_matrimonial";
  if (has("economic")) return "property_inheritance";
  if (has("cyber")) return "cyber_harassment";

  return "general";
}

export function deriveUrgency(ctx: ReferralCaseContext | undefined): Urgency {
  if (ctx?.urgent) return "emergency";
  const categories = new Set(ctx?.categories ?? []);
  if (categories.has("sexual") || categories.has("physical")) return "priority";
  return "standard";
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  /** Machine-readable reason, so the client can show a translated message. */
  error?:
    | "missing_fields"
    | "invalid_phone"
    | "invalid_email"
    | "consent_required"
    | "narrative_too_long";
  /** Phone normalised to +92XXXXXXXXXX where possible. */
  normalisedPhone?: string;
}

const MAX_NARRATIVE = 6000;

/**
 * Accepts the shapes people actually type: 0300 1234567, 03001234567,
 * +92 300 1234567, 0092-300-1234567, and landlines such as 042-35300551.
 * Normalises to +92 form so the desk sees one consistent format.
 */
export function normalisePakistaniPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  let national: string;

  if (digits.startsWith("0092")) {
    national = digits.slice(4);
  } else if (digits.startsWith("92") && digits.length >= 12) {
    national = digits.slice(2);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  // A Pakistani national number is 10 digits: a mobile begins 3, landlines
  // begin with a 2-digit or 3-digit area code.
  if (national.length !== 10) return null;
  if (!/^[23456789]/.test(national)) return null;

  return `+92${national}`;
}

export function validateReferral(submission: Partial<ReferralSubmission>): ValidationResult {
  const name = submission.name?.trim();
  const phone = submission.phone?.trim();

  if (!name || !phone) return { ok: false, error: "missing_fields" };
  if (name.length > 120) return { ok: false, error: "missing_fields" };

  if (!submission.consent) return { ok: false, error: "consent_required" };

  const normalisedPhone = normalisePakistaniPhone(phone);
  if (!normalisedPhone) return { ok: false, error: "invalid_phone" };

  const email = submission.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  if ((submission.narrative?.length ?? 0) > MAX_NARRATIVE) {
    return { ok: false, error: "narrative_too_long" };
  }

  return { ok: true, normalisedPhone };
}

// ---------------------------------------------------------------------------
// Reference codes
// ---------------------------------------------------------------------------

// Crockford-style alphabet: no I, L, O or U, so a code read out over a bad
// phone line does not come back ambiguous.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/**
 * A short reference the person can quote when they follow up, and the desk can
 * search on. Contains no personal information.
 */
export function generateReference(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `HFZ-${yy}${mm}${dd}-${randomCode(4)}`;
}

// ---------------------------------------------------------------------------
// Record assembly
// ---------------------------------------------------------------------------

export function buildReferralRecord(
  submission: ReferralSubmission,
  options: { normalisedPhone: string; source?: ReferralRecord["source"] },
): ReferralRecord {
  const category = routeToCategory(submission.context);
  const province = submission.context?.province;

  return {
    ...submission,
    phone: options.normalisedPhone,
    name: submission.name.trim(),
    email: submission.email?.trim() || undefined,
    city: submission.city?.trim() || undefined,
    reference: generateReference(),
    category,
    categoryLabel: LAWYER_CATEGORY_LABELS[category],
    urgency: deriveUrgency(submission.context),
    provinceLabel: province ? PROVINCES[province].en : undefined,
    receivedAt: new Date().toISOString(),
    source: options.source ?? "web_guided",
  };
}

/**
 * Flat key/value form for a spreadsheet row or an email body. Column order is
 * fixed, because the Google Sheet the legal desk works from appends by position.
 */
export function toFlatRow(record: ReferralRecord): Record<string, string> {
  return {
    reference: record.reference,
    received_at: record.receivedAt,
    urgency: record.urgency,
    category: record.category,
    category_label: record.categoryLabel,
    name: record.name,
    phone: record.phone,
    safe_to_call: record.safeToCall ? "YES" : "NO — MESSAGE FIRST",
    best_time: record.bestTime,
    email: record.email ?? "",
    city: record.city ?? "",
    province: record.provinceLabel ?? "",
    gender: record.context?.gender ?? "",
    relationship: record.context?.relationship ?? "",
    still_married: record.context?.stillMarried ? "yes" : "",
    has_children: record.context?.hasChildren ? "yes" : "",
    information_only: record.context?.informationOnly ? "yes" : "",
    assessment_category: record.assessmentCategory ?? "",
    assessment_severity: record.assessmentSeverity ?? "",
    language: record.locale ?? "en",
    source: record.source,
    narrative: record.narrative,
  };
}

/** Column order for the spreadsheet, exported so the sink and docs agree. */
export const REFERRAL_COLUMNS = [
  "reference",
  "received_at",
  "urgency",
  "category",
  "category_label",
  "name",
  "phone",
  "safe_to_call",
  "best_time",
  "email",
  "city",
  "province",
  "gender",
  "relationship",
  "still_married",
  "has_children",
  "information_only",
  "assessment_category",
  "assessment_severity",
  "language",
  "source",
  "narrative",
] as const;

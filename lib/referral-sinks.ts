/**
 * Where a referral goes once it is validated.
 *
 * Everything here is behind a small interface so the destinations can be swapped
 * without touching the route or the form. Today that means a Google Sheet and an
 * email to the legal desk; when Supabase lands it becomes another sink in this
 * list, and the WhatsApp and Instagram intake channels reuse the same pipeline.
 *
 * The important rule is at the bottom of the file: if nothing is configured, we
 * do NOT tell the person a lawyer will be in touch. A referral that silently
 * goes nowhere is worse than one that is refused, because the person stops
 * looking for help.
 */

// Holds the delivery credentials — the Resend API key and the Sheets webhook
// secret — and posts referrals containing someone's name and phone number.
import "server-only";

import { toFlatRow, type ReferralRecord } from "./referral";
import { getServiceClient, isDatabaseConfigured } from "./db/client";

export interface DeliveryOutcome {
  sink: string;
  ok: boolean;
  error?: string;
}

export interface ReferralSink {
  name: string;
  /** Whether the environment supplies what this sink needs. */
  isConfigured(): boolean;
  deliver(record: ReferralRecord): Promise<void>;
}

const REQUEST_TIMEOUT_MS = 10_000;

async function postJSON(url: string, body: unknown, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${response.status} ${response.statusText} ${text}`.trim());
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Google Sheets
// ---------------------------------------------------------------------------

/**
 * Posts a flat row to a Google Apps Script Web App, which appends it to the
 * sheet. See docs/REFERRALS.md for the script and deployment steps.
 *
 * An Apps Script endpoint is public by URL, so the shared secret is what stops
 * anyone who finds the URL from writing rows into the legal desk's queue.
 */
const googleSheetsSink: ReferralSink = {
  name: "google_sheets",

  isConfigured() {
    return Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL);
  },

  async deliver(record) {
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL!;
    await postJSON(url, {
      secret: process.env.GOOGLE_SHEETS_SHARED_SECRET ?? "",
      row: toFlatRow(record),
    });
  },
};

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmail(record: ReferralRecord): string {
  const row = toFlatRow(record);

  const safetyBanner = !record.safeToCall
    ? `<p style="background:#fdecea;border:2px solid #cc504c;padding:12px;border-radius:8px;">
         <strong>DO NOT CALL THIS NUMBER FIRST.</strong> They have told us a call
         is not safe. Send a message and wait for a reply before ringing.
       </p>`
    : "";

  const urgencyBanner =
    record.urgency === "emergency"
      ? `<p style="background:#fdecea;border:2px solid #cc504c;padding:12px;border-radius:8px;">
           <strong>EMERGENCY.</strong> This person reported an immediate threat to
           life. Treat this as same-day.
         </p>`
      : "";

  const rows = Object.entries(row)
    .filter(([key]) => key !== "narrative")
    .map(
      ([key, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;">${escapeHtml(key)}</td>
             <td style="padding:4px 0;"><strong>${escapeHtml(value)}</strong></td></tr>`,
    )
    .join("");

  return `<div style="font-family:system-ui,sans-serif;max-width:640px;">
    <h2>New Hifazat referral — ${escapeHtml(record.reference)}</h2>
    <p>Desk: <strong>${escapeHtml(record.categoryLabel)}</strong></p>
    ${urgencyBanner}
    ${safetyBanner}
    <table style="border-collapse:collapse;font-size:14px;">${rows}</table>
    <h3>What they told us</h3>
    <p style="white-space:pre-wrap;background:#faf8f6;padding:12px;border-radius:8px;">${escapeHtml(
      record.narrative,
    )}</p>
  </div>`;
}

/** Sends the referral to the legal desk via Resend. */
const emailSink: ReferralSink = {
  name: "email",

  isConfigured() {
    return Boolean(
      process.env.RESEND_API_KEY &&
        process.env.REFERRAL_EMAIL_TO &&
        process.env.REFERRAL_EMAIL_FROM,
    );
  },

  async deliver(record) {
    const to = process.env
      .REFERRAL_EMAIL_TO!.split(",")
      .map((address) => address.trim())
      .filter(Boolean);

    const subjectPrefix =
      record.urgency === "emergency" ? "[EMERGENCY] " : record.urgency === "priority" ? "[Priority] " : "";

    await postJSON(
      "https://api.resend.com/emails",
      {
        from: process.env.REFERRAL_EMAIL_FROM,
        to,
        subject: `${subjectPrefix}Hifazat referral ${record.reference} — ${record.categoryLabel}`,
        html: renderEmail(record),
      },
      { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    );
  },
};

// ---------------------------------------------------------------------------
// Console (development only)
// ---------------------------------------------------------------------------

/**
 * Lets the flow be exercised end to end locally without wiring up Sheets. It
 * deliberately refuses to count as configured in production, so a missing
 * environment variable on deploy fails loudly instead of dropping referrals into
 * a log nobody reads.
 */
const consoleSink: ReferralSink = {
  name: "console",

  isConfigured() {
    return process.env.NODE_ENV !== "production";
  },

  async deliver(record) {
    const row = toFlatRow(record);
    console.info(
      "[referral:dev] no delivery sink configured — printing instead:\n",
      JSON.stringify({ ...row, phone: `${row.phone.slice(0, 6)}xxxxxx` }, null, 2),
    );
  },
};

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

/**
 * Persists the referral so the legal desk has a queue with state — assigned,
 * contacted, closed — rather than a spreadsheet row and an email thread. The
 * `referral_queue` view orders it by urgency.
 *
 * Deliberately listed alongside the Sheet and the email rather than replacing
 * them: a database row nobody is watching does not get a case picked up, so a
 * notification channel should stay configured too.
 */
const supabaseSink: ReferralSink = {
  name: "supabase",

  isConfigured() {
    return isDatabaseConfigured();
  },

  async deliver(record) {
    const client = getServiceClient();
    if (!client) throw new Error("supabase client unavailable");

    const { error } = await client.from("referrals").insert({
      reference: record.reference,
      received_at: record.receivedAt,
      category: record.category,
      category_label: record.categoryLabel,
      urgency: record.urgency,
      name: record.name,
      phone: record.phone,
      email: record.email ?? null,
      city: record.city ?? null,
      safe_to_call: record.safeToCall,
      best_time: record.bestTime,
      province: record.context?.province ?? null,
      gender: record.context?.gender ?? null,
      relationship: record.context?.relationship ?? null,
      still_married: record.context?.stillMarried ?? null,
      has_children: record.context?.hasChildren ?? null,
      information_only: record.context?.informationOnly ?? null,
      assessment_category: record.assessmentCategory ?? null,
      assessment_severity: record.assessmentSeverity ?? null,
      locale: record.locale ?? "en",
      narrative: record.narrative,
      source: record.source,
    });

    if (error) throw error;
  },
};

/** Real destinations, in the order they are attempted. */
const PRIMARY_SINKS: ReferralSink[] = [supabaseSink, googleSheetsSink, emailSink];

export function getConfiguredSinks(): ReferralSink[] {
  const configured = PRIMARY_SINKS.filter((s) => s.isConfigured());
  if (configured.length) return configured;
  return consoleSink.isConfigured() ? [consoleSink] : [];
}

export interface DeliveryResult {
  /** True when at least one sink accepted the referral. */
  delivered: boolean;
  outcomes: DeliveryOutcome[];
}

/**
 * Delivers to every configured sink. Sinks run in parallel and one failing does
 * not stop the others: if the Sheet is unreachable but the email lands, the
 * referral has still reached a human, and that is what "delivered" means.
 */
export async function deliverReferral(record: ReferralRecord): Promise<DeliveryResult> {
  const sinks = getConfiguredSinks();

  if (sinks.length === 0) {
    return { delivered: false, outcomes: [] };
  }

  const outcomes = await Promise.all(
    sinks.map(async (sink): Promise<DeliveryOutcome> => {
      try {
        await sink.deliver(record);
        return { sink: sink.name, ok: true };
      } catch (error) {
        // The message may echo request contents, so it is logged but never
        // returned to the browser.
        console.error(`[referral] sink "${sink.name}" failed:`, error);
        return {
          sink: sink.name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return { delivered: outcomes.some((o) => o.ok), outcomes };
}

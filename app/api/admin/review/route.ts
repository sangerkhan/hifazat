import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getServiceClient } from "@/lib/db/client";

/**
 * Review actions on cached guidance.
 *
 * What is being edited here is not a document — it is the answer thousands of
 * people in the same situation will be given. So an edit is recorded as
 * "edited" rather than overwriting silently as "approved", and a rejection
 * leaves the entry in place (unserved) rather than deleting it, so the desk can
 * see what was wrong with it later.
 */

const REVIEW_STATUSES = ["approved", "rejected", "edited", "unreviewed"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const cacheKey = str(body.cacheKey, 64);
  const status = body.status as ReviewStatus;
  const reviewedBy = str(body.reviewedBy, 120) ?? "unknown";
  const reviewNote = str(body.reviewNote, 1000);

  if (!cacheKey || !/^[a-f0-9]{64}$/.test(cacheKey)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }
  if (!REVIEW_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  // Input is validated before the database is required, so a malformed request
  // gets a useful error rather than being masked by a configuration problem.
  const client = getServiceClient();
  if (!client) return NextResponse.json({ error: "no_database" }, { status: 503 });

  try {
    const update: Record<string, unknown> = {
      review_status: status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
    };

    // An edit rewrites the guidance people receive, so it is applied field by
    // field onto the stored response rather than accepting a whole replacement
    // object from the browser.
    if (body.edits && typeof body.edits === "object") {
      const { data: existing, error: readError } = await client
        .from("assessment_cache")
        .select("response")
        .eq("cache_key", cacheKey)
        .maybeSingle();

      if (readError) throw readError;
      if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const edits = body.edits as Record<string, unknown>;
      const response = { ...(existing.response as Record<string, unknown>) };

      const validation = str(edits.validation, 2000);
      const note = str(edits.note, 2000);
      const severity = edits.severity;

      if (validation) response.validation = validation;
      if (note !== undefined) response.note = note;
      if (["concerning", "serious", "critical"].includes(severity as string)) {
        response.severity = severity;
      }

      update.response = response;
      update.review_status = "edited";
    }

    const { error } = await client
      .from("assessment_cache")
      .update(update)
      .eq("cache_key", cacheKey);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/review] action failed:", error);
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }
}

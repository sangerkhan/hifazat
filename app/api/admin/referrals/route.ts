import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getServiceClient } from "@/lib/db/client";

/**
 * Referral queue actions.
 *
 * The reveal action is the reason this file is careful. The queue is rendered
 * with masked phone numbers and the real one is never sent to the browser with
 * the list, so masking is a property of the data flow rather than a CSS trick
 * that a "view source" defeats. Revealing one is a deliberate request, and it
 * is recorded.
 */

const STATUSES = [
  "new", "assigned", "contacted", "in_progress", "closed", "unreachable",
] as const;
type Status = (typeof STATUSES)[number];

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

  const reference = str(body.reference, 40);
  const action = body.action;
  const actor = str(body.actor, 120) ?? "unknown";

  if (!reference || !/^[A-Z0-9-]{6,40}$/.test(reference)) {
    return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
  }

  const client = getServiceClient();
  if (!client) return NextResponse.json({ error: "no_database" }, { status: 503 });

  try {
    if (action === "reveal") {
      const { data, error } = await client
        .from("referrals")
        .select("phone,email,name")
        .eq("reference", reference)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

      // Recorded before returning, so a reveal cannot happen without a trace
      // even if the response is lost in transit.
      const { error: logError } = await client.from("verification_log").insert({
        entity_type: "referral",
        entity_id: reference,
        action: "viewed",
        verified_by: actor,
        note: "Revealed contact details",
      });
      if (logError) throw logError;

      return NextResponse.json({
        phone: data.phone,
        email: data.email,
        name: data.name,
      });
    }

    if (action === "status") {
      const status = body.status as Status;
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
      }

      const patch: Record<string, unknown> = { status };
      const notes = str(body.notes, 2000);
      const assignedTo = str(body.assignedTo, 120);

      if (notes !== undefined) patch.desk_notes = notes;
      if (assignedTo !== undefined) patch.assigned_to = assignedTo;
      // These timestamps are what the response-time metric is computed from, so
      // they are set here rather than left to whoever remembers.
      if (status === "contacted") patch.first_contact_at = new Date().toISOString();
      if (status === "closed" || status === "unreachable") {
        patch.closed_at = new Date().toISOString();
      }

      const { error } = await client
        .from("referrals")
        .update(patch)
        .eq("reference", reference);
      if (error) throw error;

      const { error: logError } = await client.from("verification_log").insert({
        entity_type: "referral",
        entity_id: reference,
        action: status === "assigned" ? "assigned" : "updated",
        verified_by: actor,
        note: `status → ${status}`,
      });
      if (logError) throw logError;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (error) {
    // Never echoed to the browser: an error body can carry row contents.
    console.error("[admin/referrals] action failed:", error);
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }
}

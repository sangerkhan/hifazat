import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getServiceClient } from "@/lib/db/client";
import { invalidateReferenceCache } from "@/lib/db/reference";

/**
 * Resource verification actions.
 *
 * Every write goes through the database functions rather than a bare UPDATE, so
 * the timestamp, the recheck date and the audit-log entry cannot drift apart
 * from the verification verdict itself.
 */

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const id = str(body.id, 80);
  const action = body.action;
  // Because the desk shares one password, the audit trail is only meaningful if
  // the person says who they are. The UI remembers this between actions.
  const verifiedBy = str(body.verifiedBy, 120) ?? "unknown";
  const note = str(body.note, 500);

  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  try {
    if (action === "confirm") {
      const { error } = await client.rpc("confirm_resource", {
        p_resource_id: id,
        p_verified_by: verifiedBy,
        p_note: note ?? null,
        p_recheck_months: 6,
      });
      if (error) throw error;
    } else if (action === "unconfirm") {
      const { error } = await client.rpc("unconfirm_resource", {
        p_resource_id: id,
        p_verified_by: verifiedBy,
        p_note: note ?? null,
      });
      if (error) throw error;
    } else if (action === "update") {
      // Correcting the details is usually what happens during a verification
      // call: the organisation is real, the number we held was stale.
      const patch: Record<string, string | null> = {};
      for (const field of ["phone", "whatsapp", "email", "website", "hours"] as const) {
        if (field in body) patch[field] = str(body[field], 300) ?? null;
      }
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
      }

      const { error } = await client.from("resources").update(patch).eq("id", id);
      if (error) throw error;

      const { error: logError } = await client.from("verification_log").insert({
        entity_type: "resource",
        entity_id: id,
        action: "updated",
        verified_by: verifiedBy,
        note: note ?? Object.keys(patch).join(", "),
      });
      if (logError) throw logError;
    } else {
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }

    // The public site caches reference data for minutes at a time. Clearing it
    // here means a number confirmed on this screen is live immediately rather
    // than after the TTL expires.
    invalidateReferenceCache();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/resources] action failed:", error);
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }
}

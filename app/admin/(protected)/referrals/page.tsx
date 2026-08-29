import { getServiceClient, isDatabaseConfigured } from "@/lib/db/client";
import ReferralQueue, { type QueuedReferral } from "@/components/admin/ReferralQueue";

export const dynamic = "force-dynamic";

/**
 * Masks a number to its country code and last two digits: +9230*******67.
 *
 * Done here, on the server, so the full number is never in the HTML. Masking in
 * CSS or with a client-side toggle would look identical and protect nothing —
 * the number would still be one "view source" away, sitting in the browser
 * cache and in any screenshot of the page.
 */
function maskPhone(phone: string | null): string {
  if (!phone) return "no number";
  if (phone.length <= 6) return "•".repeat(phone.length);
  return `${phone.slice(0, 5)}${"•".repeat(Math.max(phone.length - 7, 3))}${phone.slice(-2)}`;
}

export default async function AdminReferralsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="bg-warning-subtle border border-warning/45 rounded-[24px] p-6">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink mb-2">
          No database connected
        </h2>
        <p className="text-base text-hifazat-ink/80 leading-relaxed">
          Referrals are only stored when Supabase is configured. Without it they go
          to the Google Sheet or the email inbox instead, and there is no queue to
          work from here.
        </p>
      </div>
    );
  }

  const client = getServiceClient()!;

  // Reads the view rather than the table: it already filters to open referrals,
  // orders by urgency then age, and computes the waiting time against the
  // database clock instead of the render.
  const { data, error } = await client
    .from("referral_queue_admin")
    .select("*")
    .limit(200);

  if (error) {
    return (
      <div className="bg-destructive-subtle border border-destructive rounded-[24px] p-6">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink mb-2">
          Could not load
        </h2>
        <p className="text-base text-hifazat-ink/80">{error.message}</p>
      </div>
    );
  }

  const referrals: QueuedReferral[] = (data ?? []).map((row) => ({
      reference: row.reference,
      received_at: row.received_at,
      urgency: row.urgency,
      category_label: row.category_label,
      name: row.name,
      phone_masked: maskPhone(row.phone),
      safe_to_call: row.safe_to_call,
      best_time: row.best_time,
      province: row.province,
      city: row.city,
      locale: row.locale,
      status: row.status,
      assigned_to: row.assigned_to,
      desk_notes: row.desk_notes,
      narrative: row.narrative,
      assessment_severity: row.assessment_severity,
      hours_waiting: row.hours_waiting,
  }));

  return <ReferralQueue referrals={referrals} />;
}

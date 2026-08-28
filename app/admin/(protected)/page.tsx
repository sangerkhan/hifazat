import Link from "next/link";
import { getServiceClient, isDatabaseConfigured } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface Counts {
  unverifiedResources: number;
  confirmedResources: number;
  unreviewedAnswers: number;
  openReferrals: number;
  emergencyReferrals: number;
}

async function loadCounts(): Promise<Counts | null> {
  const client = getServiceClient();
  if (!client) return null;

  const [unverified, confirmed, unreviewed, open, emergency] = await Promise.all([
    client.from("resources").select("id", { count: "exact", head: true })
      .eq("published", true).eq("verification", "unconfirmed"),
    client.from("resources").select("id", { count: "exact", head: true })
      .eq("published", true).eq("verification", "confirmed"),
    client.from("assessment_cache").select("cache_key", { count: "exact", head: true })
      .eq("review_status", "unreviewed"),
    client.from("referrals").select("id", { count: "exact", head: true })
      .in("status", ["new", "assigned", "contacted", "in_progress"]),
    client.from("referrals").select("id", { count: "exact", head: true })
      .eq("urgency", "emergency").in("status", ["new", "assigned"]),
  ]);

  return {
    unverifiedResources: unverified.count ?? 0,
    confirmedResources: confirmed.count ?? 0,
    unreviewedAnswers: unreviewed.count ?? 0,
    openReferrals: open.count ?? 0,
    emergencyReferrals: emergency.count ?? 0,
  };
}

function Card({
  href, label, value, hint, urgent = false,
}: {
  href: string; label: string; value: string | number; hint: string; urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-[24px] border p-5 transition-colors ${
        urgent
          ? "bg-hifazat-red-light border-hifazat-red"
          : "bg-white border-hifazat-border hover:border-hifazat-teal"
      }`}
    >
      <span className="text-sm text-hifazat-muted">{label}</span>
      <span className="font-heading font-serif text-[40px] leading-none text-hifazat-ink">
        {value}
      </span>
      <span className="text-sm text-hifazat-muted leading-relaxed">{hint}</span>
    </Link>
  );
}

export default async function AdminOverview() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="bg-hifazat-amber-light border border-hifazat-amber/40 rounded-[24px] p-6 flex flex-col gap-2">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink">
          No database connected
        </h2>
        <p className="text-base text-hifazat-ink/80 leading-relaxed">
          The admin tools read and write Supabase. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>, then redeploy. Until then the app
          runs on the datasets bundled in the repository, which can only be changed
          by a code change and a deploy.
        </p>
        <p className="text-sm text-hifazat-muted">See docs/BACKEND.md for setup.</p>
      </div>
    );
  }

  const counts = await loadCounts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-serif text-[32px] text-hifazat-ink">Overview</h1>
        <p className="text-base text-hifazat-muted mt-1">
          Work from the top: an unverified helpline is invisible to users, and an
          unreviewed answer is what real people are being told right now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts?.emergencyReferrals ? (
          <Card
            href="/admin/referrals"
            label="Emergency referrals waiting"
            value={counts.emergencyReferrals}
            hint="Someone reported an immediate threat to life. Same-day."
            urgent
          />
        ) : null}
        <Card
          href="/admin/resources"
          label="Helplines awaiting verification"
          value={counts?.unverifiedResources ?? "—"}
          hint="Not shown to users and never recommended by the assessment until confirmed."
        />
        <Card
          href="/admin/resources"
          label="Helplines confirmed"
          value={counts?.confirmedResources ?? "—"}
          hint="Live, tap-to-call, and available to the assessment."
        />
        <Card
          href="/admin/review"
          label="Answers awaiting review"
          value={counts?.unreviewedAnswers ?? "—"}
          hint="Guidance already being served. Reviewing the most-served first has the widest effect."
        />
        <Card
          href="/admin/referrals"
          label="Open referrals"
          value={counts?.openReferrals ?? "—"}
          hint="People who asked a lawyer to contact them."
        />
      </div>
    </div>
  );
}

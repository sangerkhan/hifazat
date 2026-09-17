import Link from "next/link";
import { getServiceClient, isDatabaseConfigured } from "@/lib/db/client";
import { HEALTH_REMEDY, checkModelHealth } from "@/lib/model-health";

export const dynamic = "force-dynamic";

/**
 * Whether the assessment is actually being written by the model.
 *
 * This is the first thing on the page because it is the one failure the app
 * hides by design. When Gemini is unreachable every visitor still gets an
 * answer — generic text matched on a few keywords — so nothing looks broken
 * from outside, and the last two times it happened it ran for days before
 * anyone noticed. It costs one eight-token request per page load to stop that
 * being possible again.
 */
async function ModelStatus() {
  const health = await checkModelHealth(8000);

  if (health.ok) {
    return (
      <div className="bg-primary-subtle border border-primary/40 rounded-[24px] px-5 py-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-semibold text-hifazat-ink">
          Assessments are live
        </span>
        <span className="text-sm text-muted-foreground">
          {health.model} answered in {health.latencyMs} ms.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-destructive-subtle border border-destructive rounded-[24px] p-5 flex flex-col gap-2">
      <h2 className="font-heading font-serif text-2xl text-hifazat-ink">
        Every assessment is being keyword-matched
      </h2>
      <p className="text-base text-hifazat-ink/80 leading-relaxed">
        {health.model} did not answer, so nobody using the app right now is
        getting an assessment of what they wrote — they are getting the offline
        fallback, with a notice on screen saying so.
      </p>
      <p className="text-base text-hifazat-ink/80 leading-relaxed">
        {health.reason ? HEALTH_REMEDY[health.reason] : ""}
      </p>
      {health.detail && (
        <p className="text-sm text-muted-foreground font-mono break-words">
          {health.reason}
          {health.status ? ` ${health.status}` : ""}: {health.detail}
        </p>
      )}
    </div>
  );
}

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
          ? "bg-destructive-subtle border-destructive"
          : "bg-white border-border hover:border-primary"
      }`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-heading font-serif text-[40px] leading-none text-hifazat-ink">
        {value}
      </span>
      <span className="text-sm text-muted-foreground leading-relaxed">{hint}</span>
    </Link>
  );
}

export default async function AdminOverview() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <ModelStatus />
        <div className="bg-warning-subtle border border-warning/45 rounded-[24px] p-6 flex flex-col gap-2">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink">
          No database connected
        </h2>
        <p className="text-base text-hifazat-ink/80 leading-relaxed">
          The admin tools read and write Supabase. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>, then redeploy. Until then the app
          runs on the datasets bundled in the repository, which can only be changed
          by a code change and a deploy.
        </p>
          <p className="text-sm text-muted-foreground">See docs/BACKEND.md for setup.</p>
        </div>
      </div>
    );
  }

  const counts = await loadCounts();

  return (
    <div className="flex flex-col gap-6">
      <ModelStatus />

      <div>
        <h1 className="font-heading font-serif text-[32px] text-hifazat-ink">Overview</h1>
        <p className="text-base text-muted-foreground mt-1">
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

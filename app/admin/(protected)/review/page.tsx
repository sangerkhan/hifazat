import { getServiceClient, isDatabaseConfigured } from "@/lib/db/client";
import CacheReview, { type CachedEntry } from "@/components/admin/CacheReview";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="bg-warning-subtle border border-warning/45 rounded-[24px] p-6">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink mb-2">
          No database connected
        </h2>
        <p className="text-base text-hifazat-ink/80 leading-relaxed">
          The answer cache lives in Supabase. Without it every assessment is
          generated fresh, nothing is reviewable, and identical situations can get
          different answers.
        </p>
      </div>
    );
  }

  const client = getServiceClient()!;

  // Unreviewed first, then by how many people received it. That ordering is the
  // whole point: reviewing the most-served answer helps the most people.
  const { data, error } = await client
    .from("assessment_cache")
    .select(
      "cache_key,locale,answer_signature,context,response,hit_count,review_status,reviewed_by,last_served_at",
    )
    .order("review_status", { ascending: true })
    .order("hit_count", { ascending: false })
    .limit(100);

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

  return <CacheReview entries={(data ?? []) as CachedEntry[]} />;
}

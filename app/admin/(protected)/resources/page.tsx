import { getServiceClient, isDatabaseConfigured } from "@/lib/db/client";
import ResourceVerifier, {
  type AdminResource,
  type CoverageRow,
} from "@/components/admin/ResourceVerifier";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="bg-hifazat-amber-light border border-hifazat-amber/40 rounded-[24px] p-6">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink mb-2">
          No database connected
        </h2>
        <p className="text-base text-hifazat-ink/80 leading-relaxed">
          Verifying a helpline writes to Supabase. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> and redeploy. Until then the
          directory comes from the datasets bundled in the repository, and changing
          it needs a code change.
        </p>
      </div>
    );
  }

  const client = getServiceClient()!;

  const [resources, coverage] = await Promise.all([
    client
      .from("resources")
      .select(
        "id,name,type,scope,phone,whatsapp,email,website,hours,verification,verify_note,verified_by,verified_at,recheck_due_at,priority",
      )
      .eq("published", true)
      .order("verification", { ascending: true })
      .order("priority", { ascending: true })
      .order("name", { ascending: true }),
    client.from("resource_coverage").select("*"),
  ]);

  if (resources.error || coverage.error) {
    return (
      <div className="bg-hifazat-red-light border border-hifazat-red rounded-[24px] p-6">
        <h2 className="font-heading font-serif text-2xl text-hifazat-ink mb-2">
          Could not load
        </h2>
        <p className="text-base text-hifazat-ink/80">
          {resources.error?.message ?? coverage.error?.message}
        </p>
      </div>
    );
  }

  return (
    <ResourceVerifier
      resources={(resources.data ?? []) as AdminResource[]}
      coverage={(coverage.data ?? []) as CoverageRow[]}
    />
  );
}

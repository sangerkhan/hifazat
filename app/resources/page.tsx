import ResourcesBrowser from "@/components/ResourcesBrowser";
import { getReferenceData } from "@/lib/db/reference";

/**
 * The directory is rendered on the server so the list comes from the database
 * where one is configured, and from the bundled dataset otherwise. That is the
 * point of the whole backend: when the legal desk confirms a number, it appears
 * here without a code change or a deploy.
 *
 * Filtering stays client-side in ResourcesBrowser, so the province and type
 * chips remain instant.
 */
export const revalidate = 300;

export default async function ResourcesPage() {
  const reference = await getReferenceData();

  return <ResourcesBrowser resources={reference.resources} />;
}

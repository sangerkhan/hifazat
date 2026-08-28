import RightsBrowser, { type RightsCategory } from "@/components/RightsBrowser";
import { getReferenceData } from "@/lib/db/reference";
import { NCSW_KNOWLEDGE_BASE } from "@/lib/knowledge-base";
import { getApplicableLaw, PROVINCE_IDS, type CaseCategory } from "@/lib/provinces";

export const revalidate = 300;

/**
 * The law shown for each category is resolved per province on the server, using
 * the same scoping the assessment uses. So a woman in Sindh reading about
 * domestic violence sees the Sindh act, not Punjab's — which is the entire
 * point of the page.
 */
const CATEGORY_TO_CASE: Record<string, CaseCategory[]> = {
  physical: ["physical", "domestic"],
  sexual: ["sexual"],
  psychological: ["domestic"],
  harmful_traditional: ["harmful_practice", "family_law"],
  economic: ["economic"],
  cyber: ["cyber"],
};

interface RawCategory {
  id: string;
  name: string;
  description: string;
  indicators?: {
    id: string;
    indicator: string;
    description: string;
    severity: string;
    examples?: string[];
  }[];
}

export default async function RightsPage() {
  // Loaded so the page uses the database's indicator set once one is connected,
  // and the bundled copy until then.
  const reference = await getReferenceData();

  const rawCategories = (NCSW_KNOWLEDGE_BASE.categories ?? []) as unknown as RawCategory[];

  const categories: RightsCategory[] = rawCategories.map((category) => {
    const caseCategories = CATEGORY_TO_CASE[category.id] ?? ["other"];

    const lawByProvince: RightsCategory["lawByProvince"] = {};
    for (const province of [...PROVINCE_IDS, undefined]) {
      const laws = getApplicableLaw({ province, categories: caseCategories });
      lawByProvince[province ?? "none"] = laws.map((l) => ({
        title: l.title,
        summary: l.summary,
        remedy: l.remedy,
      }));
    }

    // Prefer the indicators from the database where present, so an edit there
    // shows up here too.
    const fromDb = reference.indicators.filter((i) => i.categoryId === category.id);
    const indicators = fromDb.length
      ? fromDb.map((i) => ({
          id: i.id,
          indicator: i.indicator,
          description: i.description,
          severity: i.severity,
          examples: i.examples,
        }))
      : (category.indicators ?? []).map((i) => ({
          id: i.id,
          indicator: i.indicator,
          description: i.description,
          severity: i.severity,
          examples: i.examples ?? [],
        }));

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      indicators,
      lawByProvince,
    };
  });

  return <RightsBrowser categories={categories} />;
}

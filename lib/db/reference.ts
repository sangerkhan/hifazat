/**
 * Reference data: legal instruments, NCSW indicators and the support directory.
 *
 * Why this is cached in memory rather than queried per request
 * -----------------------------------------------------------
 * The entire corpus is about 50 KB: 29 legal instruments, 41 indicators and 33
 * resources. Fetching it once per warm instance and filtering in memory is
 * faster than three round trips per assessment, and it means a database blip
 * during an assessment costs nothing.
 *
 * The trade is staleness, bounded by REFERENCE_TTL_MS. A number the legal desk
 * confirms is live everywhere within that window with no deploy, which is the
 * whole point of moving this data into a database.
 */

import { withFallback, isDatabaseConfigured } from "./client";
import {
  LEGAL_INSTRUMENTS,
  type CaseCategory,
  type Confidence,
  type Gender,
  type LegalInstrument,
  type ProvinceId,
} from "../provinces";
import { RESOURCES, type Resource, type ResourceType, type ServesGroup } from "../resources";
import { NCSW_KNOWLEDGE_BASE } from "../knowledge-base";

const REFERENCE_TTL_MS = Number(process.env.REFERENCE_CACHE_TTL_MS ?? 5 * 60 * 1000);

export interface NcswIndicator {
  id: string;
  categoryId: string;
  categoryName: string;
  indicator: string;
  description: string;
  severity: string;
  examples: string[];
  legalRefExtra?: string;
  /** Case categories this indicator's parent category maps onto. */
  caseCategories: CaseCategory[];
}

export interface ReferenceData {
  legalInstruments: LegalInstrument[];
  resources: Resource[];
  indicators: NcswIndicator[];
  /** True when the bundled TypeScript data was used instead of the database. */
  usedFallback: boolean;
  loadedAt: number;
}

let cache: ReferenceData | null = null;
let inFlight: Promise<ReferenceData> | null = null;

// ---------------------------------------------------------------------------
// Bundled fallback
// ---------------------------------------------------------------------------

const NCSW_TO_CASE_CATEGORIES: Record<string, CaseCategory[]> = {
  physical: ["physical", "domestic"],
  sexual: ["sexual"],
  psychological: ["domestic", "other"],
  harmful_traditional: ["harmful_practice", "family_law"],
  economic: ["economic", "domestic"],
  cyber: ["cyber"],
};

interface RawCategory {
  id: string;
  name: string;
  indicators?: {
    id: string;
    indicator: string;
    description: string;
    severity: string;
    examples?: string[];
    legal_ref_extra?: string;
  }[];
}

function bundledIndicators(): NcswIndicator[] {
  const categories = (NCSW_KNOWLEDGE_BASE.categories ?? []) as unknown as RawCategory[];
  const out: NcswIndicator[] = [];

  for (const category of categories) {
    for (const ind of category.indicators ?? []) {
      out.push({
        id: ind.id,
        categoryId: category.id,
        categoryName: category.name,
        indicator: ind.indicator,
        description: ind.description,
        severity: ind.severity,
        examples: ind.examples ?? [],
        legalRefExtra: ind.legal_ref_extra,
        caseCategories: NCSW_TO_CASE_CATEGORIES[category.id] ?? ["other"],
      });
    }
  }

  return out;
}

function bundledReference(): ReferenceData {
  return {
    legalInstruments: LEGAL_INSTRUMENTS,
    resources: RESOURCES,
    indicators: bundledIndicators(),
    usedFallback: true,
    loadedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface LegalRow {
  id: string; title: string; short_title: string; jurisdiction: string;
  categories: string[]; protects: string[] | null; summary: string;
  remedy: string | null; confidence: string;
}

interface ResourceRow {
  id: string; name: string; name_ur: string; type: string; scope: string[];
  phone: string | null; whatsapp: string | null; email: string | null;
  website: string | null; hours: string; hours_ur: string;
  description: string; description_ur: string;
  serves: string[] | null; handles: string[]; priority: number;
  verification: string; verify_note: string | null;
}

interface IndicatorRow {
  id: string; category_id: string; indicator: string; description: string;
  severity: string; examples: string[]; legal_ref_extra: string | null;
  ncsw_categories: { name: string; case_categories: string[] } | null;
}

function mapLegal(row: LegalRow): LegalInstrument {
  return {
    id: row.id,
    title: row.title,
    shortTitle: row.short_title,
    jurisdiction: row.jurisdiction as LegalInstrument["jurisdiction"],
    categories: row.categories as CaseCategory[],
    // NULL in the column means gender-neutral, which the type models as "all".
    protects: row.protects === null ? "all" : (row.protects as Gender[]),
    summary: row.summary,
    remedy: row.remedy ?? undefined,
    confidence: row.confidence as Confidence,
  };
}

function mapResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    name: row.name,
    nameUr: row.name_ur,
    type: row.type as ResourceType,
    scope: row.scope as Resource["scope"],
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    hours: row.hours,
    hoursUr: row.hours_ur,
    description: row.description,
    descriptionUr: row.description_ur,
    serves: row.serves === null ? "any" : (row.serves as ServesGroup[]),
    handles: row.handles as CaseCategory[],
    priority: row.priority,
    verification: row.verification as Confidence,
    verifyNote: row.verify_note ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

async function fetchReference(): Promise<ReferenceData> {
  const result = await withFallback(
    "reference data",
    async (client) => {
      const [legal, resources, indicators] = await Promise.all([
        client
          .from("legal_instruments")
          .select("id,title,short_title,jurisdiction,categories,protects,summary,remedy,confidence")
          .eq("published", true),
        client
          .from("resources")
          .select(
            "id,name,name_ur,type,scope,phone,whatsapp,email,website,hours,hours_ur,description,description_ur,serves,handles,priority,verification,verify_note",
          )
          .eq("published", true),
        client
          .from("ncsw_indicators")
          .select(
            "id,category_id,indicator,description,severity,examples,legal_ref_extra,ncsw_categories(name,case_categories)",
          )
          .eq("published", true),
      ]);

      if (legal.error) throw legal.error;
      if (resources.error) throw resources.error;
      if (indicators.error) throw indicators.error;

      // An empty reference table almost certainly means the seed has not been
      // applied. Treat it as a failure so the bundled data serves, rather than
      // shipping an assessment with no law and no helplines in it.
      if (!legal.data?.length || !resources.data?.length) {
        throw new Error("reference tables are empty — has supabase/seed.sql been applied?");
      }

      return {
        legalInstruments: (legal.data as LegalRow[]).map(mapLegal),
        resources: (resources.data as ResourceRow[]).map(mapResource),
        indicators: (indicators.data as unknown as IndicatorRow[]).map((row) => ({
          id: row.id,
          categoryId: row.category_id,
          categoryName: row.ncsw_categories?.name ?? row.category_id,
          indicator: row.indicator,
          description: row.description,
          severity: row.severity,
          examples: row.examples ?? [],
          legalRefExtra: row.legal_ref_extra ?? undefined,
          caseCategories: (row.ncsw_categories?.case_categories ?? ["other"]) as CaseCategory[],
        })),
        usedFallback: false,
        loadedAt: Date.now(),
      } satisfies ReferenceData;
    },
    bundledReference,
  );

  return result.usedFallback ? bundledReference() : result.value;
}

/**
 * The cached reference corpus. Concurrent callers during a cold start share one
 * fetch rather than each opening their own.
 */
export async function getReferenceData(): Promise<ReferenceData> {
  if (!isDatabaseConfigured()) return bundledReference();

  const fresh = cache && Date.now() - cache.loadedAt < REFERENCE_TTL_MS;
  if (fresh) return cache!;

  if (!inFlight) {
    inFlight = fetchReference()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return await inFlight;
  } catch {
    // fetchReference already falls back internally; this is belt and braces.
    return cache ?? bundledReference();
  }
}

/** Drops the cache. Used by tests and by an admin action after an edit. */
export function invalidateReferenceCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Scoped queries
// ---------------------------------------------------------------------------

export interface ScopeQuery {
  province?: ProvinceId;
  gender?: Gender;
  categories?: CaseCategory[];
}

export function scopeLaw(data: ReferenceData, query: ScopeQuery): LegalInstrument[] {
  const { province, gender, categories } = query;

  return data.legalInstruments.filter((law) => {
    if (law.confidence !== "confirmed") return false;

    if (law.jurisdiction !== "federal") {
      if (!province || law.jurisdiction !== province) return false;
    }

    if (law.protects !== "all" && gender && gender !== "unspecified") {
      if (!law.protects.includes(gender)) return false;
    }

    if (categories?.length && !law.categories.some((c) => categories.includes(c))) {
      return false;
    }

    return true;
  });
}

export function scopeResources(data: ReferenceData, query: ScopeQuery): Resource[] {
  const { province, gender, categories } = query;

  return data.resources
    .filter((r) => {
      if (r.verification !== "confirmed") return false;
      if (province && !r.scope.includes("national") && !r.scope.includes(province)) return false;

      if (r.serves !== "any" && gender && gender !== "unspecified") {
        if (!r.serves.includes(gender)) return false;
      }

      if (categories?.length && !r.handles.some((h) => categories.includes(h))) return false;

      return true;
    })
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

/**
 * Indicators relevant to the case categories in play.
 *
 * This is the change that most reduces prompt size. The full set of 41
 * indicators was previously serialised into every request regardless of what
 * the person described, which is roughly 3,600 tokens of a cyber-harassment
 * prompt spent on dowry and honour-crime indicators. Scoping typically cuts it
 * to a third.
 *
 * With no categories known — the free-text route — the full set is returned,
 * because there is nothing yet to narrow on.
 */
export function scopeIndicators(
  data: ReferenceData,
  categories: CaseCategory[] | undefined,
): NcswIndicator[] {
  if (!categories?.length) return data.indicators;

  const matched = data.indicators.filter((i) =>
    i.caseCategories.some((c) => categories.includes(c)),
  );

  // Never hand the model an empty framework: an unusual category combination
  // should degrade to the full set rather than to nothing.
  return matched.length ? matched : data.indicators;
}

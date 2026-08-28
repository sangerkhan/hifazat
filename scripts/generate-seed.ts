/**
 * Generates supabase/seed.sql from the TypeScript datasets.
 *
 * The TypeScript files stay the source of truth until the cutover is complete,
 * and remain the offline fallback afterwards, so the seed has to be
 * regenerable rather than hand-maintained. Run it whenever lib/provinces.ts,
 * lib/knowledge-base.ts or lib/resources.ts changes:
 *
 *   npm run seed:generate
 *
 * Every statement is an upsert keyed on the primary key, so applying the seed
 * to a populated database refreshes the reference rows without touching
 * referrals, cached answers or anything the legal desk has verified in place —
 * with one deliberate exception, noted at the resources block below.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PROVINCES, LEGAL_INSTRUMENTS } from "../lib/provinces";
import { NCSW_KNOWLEDGE_BASE } from "../lib/knowledge-base";
import { RESOURCES } from "../lib/resources";
import type { CaseCategory } from "../lib/provinces";

// ---------------------------------------------------------------------------
// SQL literal helpers
// ---------------------------------------------------------------------------

function sqlText(value: string | undefined | null): string {
  if (value === undefined || value === null) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlArray(values: readonly string[] | undefined | null): string {
  if (values === undefined || values === null) return "null";
  if (values.length === 0) return "'{}'";

  // Two layers of escaping, and both matter. Inside the array literal each
  // element is double-quoted, so backslashes and double quotes are escaped
  // there. The whole literal is then a SQL string, so single quotes must be
  // doubled — several NCSW examples are quoted speech ("'That never happened'")
  // and silently broke the seed before this was handled.
  const inner = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `'${`{${inner.join(",")}}`.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean | undefined): string {
  return value === undefined ? "null" : value ? "true" : "false";
}

function sqlNum(value: number | undefined | null): string {
  return value === undefined || value === null ? "null" : String(value);
}

/** Builds an INSERT ... ON CONFLICT DO UPDATE for a set of rows. */
function upsert(
  table: string,
  columns: string[],
  rows: string[][],
  options: { conflictTarget?: string; preserve?: string[] } = {},
): string {
  if (rows.length === 0) return `-- no rows for ${table}\n`;

  const conflict = options.conflictTarget ?? "id";
  const preserve = new Set(options.preserve ?? []);
  const updatable = columns.filter((c) => c !== conflict && !preserve.has(c));

  const values = rows.map((r) => `  (${r.join(", ")})`).join(",\n");
  const setClause = updatable.map((c) => `  ${c} = excluded.${c}`).join(",\n");

  return (
    `insert into ${table} (${columns.join(", ")}) values\n${values}\n` +
    `on conflict (${conflict}) do update set\n${setClause};\n`
  );
}

// ---------------------------------------------------------------------------
// Provinces
// ---------------------------------------------------------------------------

function provincesSQL(): string {
  const columns = [
    "id", "name_en", "name_ur", "short_en", "short_ur",
    "min_marriage_age_female", "min_marriage_age_female_status",
    "has_vaw_centres", "women_commission",
  ];

  const rows = Object.values(PROVINCES).map((p) => [
    sqlText(p.id),
    sqlText(p.en),
    sqlText(p.ur),
    sqlText(p.shortEn),
    sqlText(p.shortUr),
    sqlNum(p.minMarriageAgeFemale),
    sqlText(p.minMarriageAgeFemaleConfidence),
    sqlBool(p.hasVawCentres),
    sqlText(p.womenCommission),
  ]);

  return upsert("provinces", columns, rows);
}

// ---------------------------------------------------------------------------
// Legal instruments
// ---------------------------------------------------------------------------

function legalInstrumentsSQL(): string {
  const columns = [
    "id", "title", "short_title", "jurisdiction", "categories",
    "protects", "summary", "remedy", "confidence", "published",
  ];

  const rows = LEGAL_INSTRUMENTS.map((l) => [
    sqlText(l.id),
    sqlText(l.title),
    sqlText(l.shortTitle),
    sqlText(l.jurisdiction),
    sqlArray(l.categories),
    // NULL rather than an empty array means gender-neutral, which is what the
    // query layer checks for.
    l.protects === "all" ? "null" : sqlArray(l.protects),
    sqlText(l.summary),
    sqlText(l.remedy),
    sqlText(l.confidence),
    "true",
  ]);

  return upsert("legal_instruments", columns, rows);
}

// ---------------------------------------------------------------------------
// NCSW framework
// ---------------------------------------------------------------------------

/**
 * Maps an NCSW category onto the app's case-category vocabulary, so indicators
 * can be scoped with the same filters used for law and resources. Without this
 * the whole indicator set has to go into every prompt.
 */
const NCSW_TO_CASE_CATEGORIES: Record<string, CaseCategory[]> = {
  physical: ["physical", "domestic"],
  sexual: ["sexual"],
  psychological: ["domestic", "other"],
  harmful_traditional: ["harmful_practice", "family_law"],
  economic: ["economic", "domestic"],
  cyber: ["cyber"],
};

interface RawIndicator {
  id: string;
  indicator: string;
  description: string;
  severity: string;
  examples?: string[];
  legal_ref_extra?: string;
}

interface RawCategory {
  id: string;
  name: string;
  description: string;
  legal_refs?: string[];
  indicators?: RawIndicator[];
}

function ncswSQL(): { categories: string; indicators: string; count: number } {
  const categories = (NCSW_KNOWLEDGE_BASE.categories ?? []) as unknown as RawCategory[];

  const categoryRows = categories.map((c, i) => [
    sqlText(c.id),
    sqlText(c.name),
    "null",
    sqlText(c.description),
    sqlArray(c.legal_refs ?? []),
    sqlArray(NCSW_TO_CASE_CATEGORIES[c.id] ?? ["other"]),
    sqlNum(i),
  ]);

  const indicatorRows: string[][] = [];
  for (const category of categories) {
    (category.indicators ?? []).forEach((ind, i) => {
      indicatorRows.push([
        sqlText(ind.id),
        sqlText(category.id),
        sqlText(ind.indicator),
        "null",
        sqlText(ind.description),
        sqlText(ind.severity),
        sqlArray(ind.examples ?? []),
        sqlText(ind.legal_ref_extra),
        "true",
        sqlNum(i),
      ]);
    });
  }

  return {
    categories: upsert(
      "ncsw_categories",
      ["id", "name", "name_ur", "description", "legal_refs", "case_categories", "sort_order"],
      categoryRows,
    ),
    indicators: upsert(
      "ncsw_indicators",
      [
        "id", "category_id", "indicator", "indicator_ur", "description",
        "severity", "examples", "legal_ref_extra", "published", "sort_order",
      ],
      indicatorRows,
    ),
    count: indicatorRows.length,
  };
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

function resourcesSQL(): string {
  const columns = [
    "id", "name", "name_ur", "type", "scope", "phone", "whatsapp", "email",
    "website", "hours", "hours_ur", "description", "description_ur",
    "serves", "handles", "priority", "verification", "verify_note", "published",
  ];

  const rows = RESOURCES.map((r) => [
    sqlText(r.id),
    sqlText(r.name),
    sqlText(r.nameUr),
    sqlText(r.type),
    sqlArray(r.scope),
    sqlText(r.phone),
    sqlText(r.whatsapp),
    sqlText(r.email),
    sqlText(r.website),
    sqlText(r.hours),
    sqlText(r.hoursUr),
    sqlText(r.description),
    sqlText(r.descriptionUr),
    r.serves === "any" ? "null" : sqlArray(r.serves),
    sqlArray(r.handles),
    sqlNum(r.priority),
    sqlText(r.verification),
    sqlText(r.verifyNote),
    "true",
  ]);

  // verification, verified_by and verified_at are preserved on conflict. Once
  // the legal desk confirms a number in the database, re-running this seed must
  // not silently revert it to the unconfirmed state still recorded in the
  // TypeScript file. Content columns are refreshed; the verification verdict is
  // the database's to keep.
  return upsert("resources", columns, rows, {
    preserve: ["verification", "verify_note"],
  });
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

function main() {
  const ncsw = ncswSQL();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "..", "supabase", "seed.sql");

  const sql = `-- GENERATED FILE — do not edit by hand.
--
-- Regenerate with:  npm run seed:generate
-- Source: lib/provinces.ts, lib/knowledge-base.ts, lib/resources.ts
--
-- Every statement is an upsert, so this is safe to re-apply to a populated
-- database. Referrals, cached answers and the verification log are untouched.
--
-- Note on resources: the verification verdict (verification, verify_note) is
-- PRESERVED on conflict. Once the legal desk confirms a number in the database,
-- re-running this seed will not revert it.

begin;

-- ${Object.keys(PROVINCES).length} provinces and territories
${provincesSQL()}
-- ${LEGAL_INSTRUMENTS.length} legal instruments
${legalInstrumentsSQL()}
-- ${(NCSW_KNOWLEDGE_BASE.categories ?? []).length} NCSW categories
${ncsw.categories}
-- ${ncsw.count} NCSW indicators
${ncsw.indicators}
-- ${RESOURCES.length} resources (${RESOURCES.filter((r) => r.verification === "confirmed").length} confirmed)
${resourcesSQL()}
commit;
`;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, sql);

  console.log(`Wrote ${outPath}`);
  console.log(`  provinces          ${Object.keys(PROVINCES).length}`);
  console.log(`  legal instruments  ${LEGAL_INSTRUMENTS.length}`);
  console.log(`  NCSW categories    ${(NCSW_KNOWLEDGE_BASE.categories ?? []).length}`);
  console.log(`  NCSW indicators    ${ncsw.count}`);
  console.log(`  resources          ${RESOURCES.length}`);
}

main();

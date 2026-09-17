/**
 * Putting an assessment into a fixed order before it leaves the server.
 *
 * The result screen numbers the action steps 1, 2, 3 and fills only the first
 * resource's call button, both of which state plainly that the list is ordered.
 * Nothing made it so. The model returns the array in whatever order it wrote
 * it, so the same situation could come back with the court filing as step 1 and
 * "call the police" as step 3, and two runs of the same answers could disagree.
 * For someone reading it in a crisis that is not cosmetic: the number implies a
 * sequence, and the sequence was arbitrary.
 *
 * So ordering is decided here, once, and applied to every path that returns an
 * assessment — live model, streamed model, reviewed cache and offline fallback
 * alike. The rules are deliberately boring:
 *
 *   - Actions run immediate, then short term, then longer term. Within a band
 *     the model's own order stands, because that is a judgement about this
 *     person's situation and we have no better one.
 *   - Resources lead with whatever the primary action points at — the button
 *     above the list and the first entry in it must not name different
 *     organisations — and otherwise follow the directory's own priority
 *     ordering, which is where emergency lines, partner desks and provincial
 *     helplines are already ranked.
 *   - Duplicates are dropped, and each list is capped. Nine action steps is not
 *     nine times the help.
 */

export type ActionPriority = "immediate" | "short_term" | "longer_term";

/** Lower runs first. An unrecognised priority sorts with "immediate" so that a
    step is never buried by a value we failed to anticipate. */
const PRIORITY_RANK: Record<string, number> = {
  immediate: 0,
  short_term: 1,
  longer_term: 2,
};

export const MAX_ACTIONS = 6;
export const MAX_RESOURCES = 5;
export const MAX_CLASSIFICATIONS = 4;

interface Action {
  step: string;
  details: string;
  priority: ActionPriority;
}

interface ResourceEntry {
  name: string;
  phone?: string;
  website?: string;
  why: string;
}

interface Classification {
  indicator_id?: string;
  indicator_name?: string;
  [key: string]: unknown;
}

/** Name comparison that survives the model echoing a name with different
    spacing, case or a trailing dash and subtitle. */
function nameKey(name: unknown): string {
  return typeof name === "string"
    ? name.toLowerCase().split(/[—(]/)[0].replace(/\s+/g, " ").trim()
    : "";
}

/** Digits only, so "1043" and "1043 " and "+92 1043" compare as one number. */
function phoneKey(phone: unknown): string {
  return typeof phone === "string" ? phone.replace(/\D/g, "") : "";
}

function sortActions(raw: unknown): Action[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (a): a is Action =>
        Boolean(a) && typeof a === "object" && typeof (a as Action).step === "string",
    )
    .map((a, index) => ({ a, index }))
    .sort((x, y) => {
      const rank =
        (PRIORITY_RANK[x.a.priority] ?? 0) - (PRIORITY_RANK[y.a.priority] ?? 0);
      // The index tiebreak keeps the model's ordering inside a band, and makes
      // the result identical on every engine rather than relying on the sort
      // being stable.
      return rank || x.index - y.index;
    })
    .map(({ a }) => a)
    .slice(0, MAX_ACTIONS);
}

/**
 * @param directory the resources handed to the model for this person, in the
 * order the directory ranks them. Anything the model returns that is not in it
 * keeps its own relative position at the end — it should not happen, since the
 * prompt forbids inventing organisations, but dropping a number someone might
 * need is the wrong way to enforce that.
 */
function sortResources(
  raw: unknown,
  directory: { name: string }[],
  leadName: string,
  leadPhone: string,
): ResourceEntry[] {
  if (!Array.isArray(raw)) return [];

  const directoryRank = new Map<string, number>();
  directory.forEach((r, i) => {
    const key = nameKey(r.name);
    if (key && !directoryRank.has(key)) directoryRank.set(key, i);
  });

  const lead = nameKey(leadName);
  const leadDigits = phoneKey(leadPhone);
  const seen = new Set<string>();
  const entries: { r: ResourceEntry; index: number }[] = [];

  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const r = value as ResourceEntry;
    if (typeof r.name !== "string" || !r.name.trim()) continue;

    // A helpline listed twice under two spellings reads as two organisations.
    const key = `${nameKey(r.name)}|${phoneKey(r.phone)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({ r, index: entries.length });
  }

  return entries
    .sort((x, y) => {
      const rank = (r: ResourceEntry) => {
        const key = nameKey(r.name);
        // Matched on either the name in the button's label or the number it
        // dials, because the model writes that label itself and may abbreviate.
        if (lead && key === lead) return -1;
        if (leadDigits && phoneKey(r.phone) === leadDigits) return -1;
        return directoryRank.get(key) ?? directory.length + 1;
      };
      return rank(x.r) - rank(y.r) || x.index - y.index;
    })
    .map(({ r }) => r)
    .slice(0, MAX_RESOURCES);
}

function dedupeClassifications(raw: unknown): Classification[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: Classification[] = [];

  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const c = value as Classification;

    // The prompt asks for one classification per distinct thing that happened,
    // and the first one is the primary finding shown as the page heading. Model
    // order is therefore kept; only repeats of the same indicator are dropped.
    const key = String(c.indicator_id ?? c.indicator_name ?? "").toLowerCase().trim();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    out.push(c);
    if (out.length === MAX_CLASSIFICATIONS) break;
  }

  return out;
}

/**
 * Applies the ordering to a validated assessment. Returns a new object; the
 * input is not modified, because the cache stores what the model returned.
 */
export function normaliseAssessment<T extends Record<string, unknown>>(
  assessment: T,
  directory: { name: string }[] = [],
): T {
  const primary = assessment.primary_action as { label?: string; value?: string } | undefined;

  // The primary action's label carries the organisation name ("Call Madadgaar
  // (1098)"), which is what ties the button to an entry in the list below it.
  const leadName = typeof primary?.label === "string" ? primary.label.replace(/^\s*call\s+/i, "") : "";
  const leadPhone = typeof primary?.value === "string" ? primary.value : "";

  return {
    ...assessment,
    classifications: dedupeClassifications(assessment.classifications),
    actions: sortActions(assessment.actions),
    resources: sortResources(assessment.resources, directory, leadName, leadPhone),
  };
}

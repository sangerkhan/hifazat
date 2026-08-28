/**
 * Reading useful fields out of a half-finished model response.
 *
 * The assessment is a single JSON object and the UI needs all of it, but the
 * person waiting does not need all of it at once. The two fields that matter
 * first — whether they are in danger, and the sentence telling them what
 * happened to them is real — are emitted first by the model, so they can be
 * shown seconds before the action steps and legal citations arrive.
 *
 * This deliberately does not attempt to parse partial JSON in general. A
 * tolerant JSON parser that guesses at unclosed structures is a good way to
 * render something subtly wrong to someone in a crisis. Instead it extracts
 * only complete, unambiguous values: a boolean, and a string whose closing
 * quote has actually arrived.
 */

export interface PartialAssessment {
  is_urgent?: boolean;
  validation?: string;
}

/** Matches `"is_urgent": true` once the value is fully present. */
const URGENT = /"is_urgent"\s*:\s*(true|false)\s*[,}]/;

/**
 * Matches a complete `"validation": "..."` value.
 *
 * The string body allows escaped characters, and requires the closing quote
 * followed by a comma or brace — so a value still being streamed does not match
 * and a half-written sentence is never shown.
 */
const VALIDATION = /"validation"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,}]/;

/** Undoes JSON string escaping for the extracted value. */
function unescapeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

export function parsePartialAssessment(text: string): PartialAssessment {
  const partial: PartialAssessment = {};

  const urgent = text.match(URGENT);
  if (urgent) partial.is_urgent = urgent[1] === "true";

  const validation = text.match(VALIDATION);
  if (validation) {
    const value = unescapeJsonString(validation[1]).trim();
    // A one-word fragment is not worth showing; wait for something readable.
    if (value.length > 20) partial.validation = value;
  }

  return partial;
}

/** True when the newer partial contains something the older one did not. */
export function hasNewInformation(
  previous: PartialAssessment,
  next: PartialAssessment,
): boolean {
  if (next.is_urgent !== undefined && previous.is_urgent === undefined) return true;
  if (next.validation && next.validation !== previous.validation) return true;
  return false;
}

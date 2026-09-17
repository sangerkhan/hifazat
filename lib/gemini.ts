/**
 * Gemini request configuration and failure diagnostics.
 *
 * Lives here rather than in the route so the settings that decide whether an
 * assessment succeeds at all can be asserted in the test suite. They were
 * inline constants when a wrong pair of them silently sent every user the
 * offline fallback instead of an assessment.
 */

/**
 * Gemini 2.5 models think before they answer, thinking is on by default, and
 * the thinking tokens are charged against `maxOutputTokens` — not billed on
 * top of it. The route asked for a long structured answer under a 4096 cap
 * with no thinking budget set, so the model could spend the whole allowance
 * reasoning and return a candidate with no text, or with the JSON cut off
 * mid-object. Both read as "the model gave us nothing", and both sent the
 * person generic keyword-matched text instead.
 *
 * The budget is bounded rather than zero. It was briefly zero, set while the
 * outage that prompted this was wrongly blamed on token starvation; the actual
 * cause turned out to be an expired API key. Turning the model's reasoning off
 * was never the point, and this is legal guidance — the model still has to
 * pick the right indicator and the right section from what it was handed. What
 * matters is that the two budgets cannot compete: 2048 for thinking against a
 * cap of 8192 leaves 6144 guaranteed for the answer, which is roughly twice
 * what the JSON needs.
 *
 * Never set a budget without setting the cap, and never let the difference
 * fall near what the answer costs — that is the failure this pair exists to
 * make impossible, and lib/__tests__/gemini.test.ts asserts the margin.
 */
export const THINKING_BUDGET = 2048;

/** The cap the thinking budget is spent from, not a separate allowance. */
export const MAX_OUTPUT_TOKENS = 8192;

/** Lower, factual answers: this is legal guidance, not prose. */
export const TEMPERATURE = 0.3;

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/**
 * The API key, read at call time and cleaned.
 *
 * Two deliberate details, each of which has taken this app offline:
 *
 * 1. READ AT CALL TIME, not at module load. A module-scope read is evaluated
 *    once, when the serverless function is first loaded, which is before the
 *    platform has necessarily finished resolving the environment for that
 *    invocation. Reading per request costs nothing and means rotating the key
 *    takes effect on the next request rather than the next cold start.
 *
 * 2. TRIMMED, and with surrounding quotes removed. A key pasted into a
 *    dashboard or a .env file routinely arrives as `AIza...\n` or `"AIza..."`.
 *    Google rejects both with a 400 API_KEY_INVALID, which this app used to
 *    turn into "every user silently gets the offline fallback" — the exact
 *    failure reported as "the AI keeps breaking again". A stray newline is not
 *    a reason to stop answering people.
 */
export function getApiKey(): string | undefined {
  const raw = process.env.GEMINI_API_KEY;
  if (typeof raw !== "string") return undefined;

  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  return cleaned.length ? cleaned : undefined;
}

/**
 * The models to try, in order.
 *
 * Overridable by environment because the one failure this app cannot fix in
 * code is Google retiring a model name. When that happens every request 404s
 * and everyone gets the fallback until a deploy lands; with this, it is a
 * config change.
 */
export function getModels(): string[] {
  const configured = process.env.GEMINI_MODELS?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return configured?.length ? configured : ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
}

// ---------------------------------------------------------------------------
// Transient failures
// ---------------------------------------------------------------------------

/** How many times a single model is retried before moving to the next one. */
export const MAX_ATTEMPTS_PER_MODEL = 3;

/**
 * Whether a status is worth trying again with the same model.
 *
 * 429 and the 5xx family are load, not a wrong request: Flash is a shared
 * resource and a busy minute used to be indistinguishable from a broken
 * deployment, because a single 503 dropped the whole request to keyword
 * matching. Anything else — a bad key, a bad model name, a rejected payload —
 * will fail identically however many times it is sent, so it is not retried.
 */
export function isTransientStatus(status: number): boolean {
  return status === 429 || status === 408 || (status >= 500 && status <= 599);
}

/** Exponential backoff with jitter, so retries do not arrive in lockstep. */
export function backoffMs(attempt: number, jitter = Math.random()): number {
  const base = 400 * 2 ** (attempt - 1);
  return Math.round(base + jitter * 250);
}

// ---------------------------------------------------------------------------
// Generation config
// ---------------------------------------------------------------------------

/**
 * The exact shape the route validates and the UI renders.
 *
 * Asking for JSON gets JSON-shaped text; asking for JSON *against a schema*
 * gets an object that parses and validates. Before this, a response that came
 * back with a missing `actions` array or a `severity` of "high" failed
 * validation and the person got the keyword fallback — a full model round trip
 * spent, and generic text shown, over a field name.
 *
 * `propertyOrdering` is load-bearing beyond validation: it guarantees
 * `is_urgent` and `validation` are serialised first, which is what lets the
 * streaming path show someone their safety verdict seconds before the rest of
 * the assessment arrives. That used to be a request in the prompt and a hope.
 */
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_urgent: { type: "BOOLEAN" },
    validation: { type: "STRING" },
    severity: { type: "STRING", enum: ["concerning", "serious", "critical"] },
    severity_explanation: { type: "STRING" },
    classifications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category_id: { type: "STRING" },
          category_name: { type: "STRING" },
          indicator_id: { type: "STRING" },
          indicator_name: { type: "STRING" },
          explanation: { type: "STRING" },
          legal_reference: { type: "STRING" },
        },
        required: [
          "category_id",
          "category_name",
          "indicator_id",
          "indicator_name",
          "explanation",
          "legal_reference",
        ],
      },
    },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          step: { type: "STRING" },
          details: { type: "STRING" },
          priority: {
            type: "STRING",
            enum: ["immediate", "short_term", "longer_term"],
          },
        },
        required: ["step", "details", "priority"],
      },
    },
    resources: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          phone: { type: "STRING" },
          website: { type: "STRING" },
          why: { type: "STRING" },
        },
        required: ["name", "why"],
      },
    },
    note: { type: "STRING" },
    primary_action: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: ["call", "link"] },
        label: { type: "STRING" },
        value: { type: "STRING" },
        description: { type: "STRING" },
      },
      required: ["type", "label", "value"],
    },
  },
  required: [
    "is_urgent",
    "validation",
    "severity",
    "severity_explanation",
    "classifications",
    "actions",
    "resources",
  ],
  propertyOrdering: [
    "is_urgent",
    "validation",
    "severity",
    "severity_explanation",
    "classifications",
    "actions",
    "resources",
    "note",
    "primary_action",
  ],
} as const;

export interface GenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  responseMimeType: string;
  responseSchema?: unknown;
  thinkingConfig?: { thinkingBudget: number };
}

/** Which optional fields a request carries, so a rejection can drop just one. */
export interface ConfigOptions {
  /** False only when a model has rejected the field, so one retry can go out
      without it rather than dropping the person to the fallback. */
  thinking?: boolean;
  /** False when a model has rejected the response schema, same reasoning. */
  schema?: boolean;
}

export function generationConfig({
  thinking = true,
  schema = true,
}: ConfigOptions = {}): GenerationConfig {
  return {
    temperature: TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    responseMimeType: "application/json",
    ...(schema ? { responseSchema: RESPONSE_SCHEMA } : {}),
    ...(thinking ? { thinkingConfig: { thinkingBudget: THINKING_BUDGET } } : {}),
  };
}

interface CandidateResponse {
  candidates?: {
    finishReason?: string;
    content?: { parts?: unknown[] };
    safetyRatings?: { blocked?: boolean; category?: string }[];
  }[];
  usageMetadata?: {
    thoughtsTokenCount?: number;
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
  promptFeedback?: { blockReason?: string };
}

/**
 * Why a response carried no usable text.
 *
 * `finishReason: MAX_TOKENS` next to a large `thinking` count is the signature
 * of thinking having eaten the output budget. Without this the logs said only
 * "returned empty response" — the same line a safety block or a truncated
 * answer produces, so the one failure that took the whole app offline looked
 * identical to every other.
 */
export function describeEmptyResponse(data: unknown): string {
  const d = data as CandidateResponse | null | undefined;
  const candidate = d?.candidates?.[0];
  const usage = d?.usageMetadata;
  const blocked = candidate?.safetyRatings?.filter((r) => r.blocked).map((r) => r.category);

  return [
    `finishReason=${candidate?.finishReason ?? "none"}`,
    `parts=${candidate?.content?.parts?.length ?? 0}`,
    usage
      ? `thinking=${usage.thoughtsTokenCount ?? 0} output=${usage.candidatesTokenCount ?? 0} prompt=${usage.promptTokenCount ?? 0}`
      : "usage=none",
    d?.promptFeedback?.blockReason ? `promptBlocked=${d.promptFeedback.blockReason}` : "",
    blocked?.length ? `safetyBlocked=${blocked.join(",")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A 400 that names the thinking config, which is how this would resurface if a
 * future model stops accepting a zero budget. Worth detecting so the route can
 * retry without it rather than silently falling back for a new reason.
 */
export function isThinkingConfigRejection(status: number, body: string): boolean {
  return status === 400 && /thinking|thought/i.test(body);
}

/**
 * A 400 that names the response schema. Same shape of problem as the thinking
 * config: a field a future model stops accepting must cost one retry without
 * it, not every assessment from then on.
 */
export function isSchemaRejection(status: number, body: string): boolean {
  return status === 400 && /response_?schema|responseSchema|property_?ordering/i.test(body);
}

/**
 * Why the assessment fell back to keyword matching.
 *
 * Carried through to the result screen and the logs so that "the AI is not
 * working" stops being one undifferentiated symptom. Each value names a
 * different fix, and the operator should never again have to guess which.
 */
export type DegradedReason =
  | "no_api_key"
  | "rejected"
  | "quota"
  | "unreachable"
  | "empty_response"
  | "invalid_output";

/** Maps an upstream HTTP status onto the reason an operator needs to act on. */
export function reasonForStatus(status: number): DegradedReason {
  if (status === 429) return "quota";
  if (status === 400 || status === 401 || status === 403 || status === 404) return "rejected";
  return "unreachable";
}

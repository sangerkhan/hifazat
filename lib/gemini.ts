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

export interface GenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  responseMimeType: string;
  thinkingConfig?: { thinkingBudget: number };
}

/**
 * @param withThinkingConfig false only when a model has rejected the field,
 * so one retry can go out without it rather than dropping to the fallback.
 */
export function generationConfig(withThinkingConfig = true): GenerationConfig {
  return {
    temperature: TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    responseMimeType: "application/json",
    ...(withThinkingConfig ? { thinkingConfig: { thinkingBudget: THINKING_BUDGET } } : {}),
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

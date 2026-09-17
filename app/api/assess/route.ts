import { NextResponse, type NextRequest } from "next/server";
import { allowRequest, clientBucket } from "@/lib/rate-limit";
import {
  MAX_ATTEMPTS_PER_MODEL,
  MAX_OUTPUT_TOKENS,
  THINKING_BUDGET,
  backoffMs,
  describeEmptyResponse,
  generationConfig,
  getApiKey,
  getModels,
  isSchemaRejection,
  isThinkingConfigRejection,
  isTransientStatus,
  reasonForStatus,
  type ConfigOptions,
  type DegradedReason,
} from "@/lib/gemini";
import { normaliseAssessment } from "@/lib/assessment-shape";
import { checkModelHealth } from "@/lib/model-health";
import { buildSystemPrompt, type PromptContext } from "@/lib/system-prompt";
import {
  getReferenceData,
  scopeIndicators,
  scopeLaw,
  scopeResources,
} from "@/lib/db/reference";
import {
  computeCacheKey,
  lookupCachedAssessment,
  recordAssessmentEvent,
  recordCacheHit,
  storeAssessment,
} from "@/lib/db/assessment-cache";
import type { Answers, CaseContext } from "@/lib/guided-flow";
import {
  hasNewInformation,
  parsePartialAssessment,
  type PartialAssessment,
} from "@/lib/partial-assessment";
import type { Resource } from "@/lib/resources";
import {
  PROVINCE_IDS,
  type CaseCategory,
  type Gender,
  type ProvinceId,
} from "@/lib/provinces";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Long enough for a thinking model on a cold path, short enough that nobody
    watches a spinner past the point they would have given up. */
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * The key travels in a header, never in the query string.
 *
 * A key in a URL is a key in access logs, in proxy logs, in error reports and
 * in anything that records a request line — and it is the part of the request
 * most likely to be mangled by encoding. The header is what Google documents.
 */
function geminiHeaders(apiKey: string): HeadersInit {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


const VALID_GENDERS: Gender[] = ["woman", "man", "transgender", "unspecified"];
const VALID_CATEGORIES: CaseCategory[] = [
  "domestic",
  "sexual",
  "cyber",
  "workplace",
  "harmful_practice",
  "economic",
  "child",
  "family_law",
  "physical",
  "other",
];
const VALID_RELATIONSHIPS = [
  "spousal",
  "family",
  "workplace",
  "online",
  "other",
  "unknown",
] as const;

// ---------------------------------------------------------------------------
// Parsing and validation
// ---------------------------------------------------------------------------

function parseModelJSON(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to the fenced form
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // fall through
    }
  }

  return null;
}

function isValidAssessment(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (typeof d.is_urgent !== "boolean") return false;
  if (typeof d.validation !== "string") return false;
  if (!["concerning", "serious", "critical"].includes(d.severity as string)) {
    return false;
  }
  if (!Array.isArray(d.classifications) || d.classifications.length === 0) return false;
  if (!Array.isArray(d.actions) || d.actions.length === 0) return false;
  if (!Array.isArray(d.resources) || d.resources.length === 0) return false;

  if (d.primary_action) {
    const pa = d.primary_action as Record<string, unknown>;
    if (!["call", "link"].includes(pa.type as string)) return false;
    if (typeof pa.label !== "string") return false;
    if (typeof pa.value !== "string") return false;
  }

  return true;
}

/**
 * The context arrives from the client, so nothing in it is trusted. Anything
 * unrecognised is dropped rather than passed through — an unknown province
 * would otherwise flow into the prompt as free text.
 */
function sanitiseContext(raw: unknown): PromptContext {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as Record<string, unknown>;
  const ctx: PromptContext = {};

  if (typeof c.gender === "string" && VALID_GENDERS.includes(c.gender as Gender)) {
    ctx.gender = c.gender as Gender;
  }

  if (
    typeof c.province === "string" &&
    PROVINCE_IDS.includes(c.province as ProvinceId)
  ) {
    ctx.province = c.province as ProvinceId;
  }

  if (Array.isArray(c.categories)) {
    const categories = c.categories.filter(
      (x): x is CaseCategory =>
        typeof x === "string" && VALID_CATEGORIES.includes(x as CaseCategory),
    );
    if (categories.length) ctx.categories = categories;
  }

  if (
    typeof c.relationship === "string" &&
    (VALID_RELATIONSHIPS as readonly string[]).includes(c.relationship)
  ) {
    ctx.relationship = c.relationship as PromptContext["relationship"];
  }

  if (typeof c.urgent === "boolean") ctx.urgent = c.urgent;
  if (typeof c.stillMarried === "boolean") ctx.stillMarried = c.stillMarried;
  if (typeof c.hasChildren === "boolean") ctx.hasChildren = c.hasChildren;
  if (typeof c.informationOnly === "boolean") ctx.informationOnly = c.informationOnly;

  return ctx;
}

/**
 * Answers are only ever used to derive a cache key and to store alongside the
 * cached guidance for the legal desk to read, so the shape is all that needs
 * checking: a map of step id to a list of option ids. Anything else is dropped.
 */
function sanitiseAnswers(raw: unknown): Answers | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const out: Answers = {};
  for (const [stepId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-zA-Z]{1,40}$/.test(stepId)) continue;
    if (!Array.isArray(value)) continue;

    const options = value.filter(
      (v): v is string => typeof v === "string" && /^[a-z0-9_]{1,60}$/.test(v),
    );
    if (options.length) out[stepId] = options;
  }

  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Used when every model attempt, on every model, has failed.
 *
 * The wording is canned, but what it is about and who it points at are not.
 * The classification comes from the categories the guided flow established,
 * falling back to keywords only for free text; and the resources are drawn from
 * the directory using the same province and gender scoping as the live path.
 * The original hardcoded fallback told everyone to call the Punjab women's
 * helpline, including people in Sindh and Balochistan where 1043 does not
 * answer.
 *
 * The result still says plainly, on screen, that it is not an assessment of
 * what the person wrote.
 */
function getFallbackResponse(
  input: string,
  ctx: PromptContext,
  availableResources: Resource[],
  reason: DegradedReason = "unreachable",
) {
  const text = input.toLowerCase();

  /**
   * Which of the four canned classifications to use.
   *
   * Keyword matching is the last resort, not the first. The guided flow has
   * already established what happened — from options the person tapped, not
   * from words we went looking for in a sentence — so when those categories are
   * present they decide, and the keywords only run for free text where there is
   * nothing else to go on.
   *
   * This matters because the keyword order was wrong for the commonest case:
   * "he beat me and is threatening to share my photos" matched "photos" before
   * it matched "beat", so a woman being assaulted at home was told her case was
   * cyber harassment. The categories say domestic and physical, in that order.
   */
  const known = ctx.categories ?? [];
  const hasCategory = (...wanted: CaseCategory[]) =>
    wanted.some((c) => known.includes(c));

  const match = (...needles: string[]) =>
    known.length ? false : needles.some((n) => text.includes(n));

  const looksLike = (
    kind: "danger" | "cyber" | "physical",
    ...needles: string[]
  ): boolean => {
    if (known.length) {
      if (kind === "danger") return Boolean(ctx.urgent) || hasCategory("harmful_practice");
      if (kind === "physical") return hasCategory("physical");
      return hasCategory("cyber");
    }
    return match(...needles);
  };

  let categories: CaseCategory[];
  let severity: "concerning" | "serious" | "critical";
  let isUrgent = false;
  let validation: string;
  let categoryName: string;
  let indicator: { id: string; name: string; explanation: string };

  // "threat" on its own used to be in this list, which meant free text saying
  // "he is threatening to share my photos" was classified as an honour crime
  // and answered with the emergency line instead of the cyber complaint route.
  // A threat to life says so; the words here are the ones that mean it.
  if (looksLike("danger", "kill", "honour", "honor", "murder", "acid", "in danger", "death")) {
    categories = ["physical", "harmful_practice"];
    severity = "critical";
    isUrgent = true;
    categoryName = "Harmful Traditional Practices";
    validation =
      "What you are describing sounds extremely dangerous. Threats to your life, especially in the name of so-called honour, are a serious criminal offence in Pakistan. Your safety is the priority right now.";
    indicator = {
      id: "trad_01",
      name: "Honour-based threats",
      explanation:
        "Threats to harm or kill someone in the name of honour are a criminal offence. The 2016 amendment closed the loophole that previously allowed families to forgive the perpetrator, so these threats must be taken seriously.",
    };
  } else if (looksLike("physical", "hit", "slap", "beat", "hurt", "physical", "punch", "kick")) {
    categories = ["physical", "domestic"];
    severity = "serious";
    categoryName = "Physical Violence";
    validation =
      "What you have described is recognised as physical violence under Pakistani law. No one has the right to hit you, whatever the circumstances. This is not a private family matter.";
    indicator = {
      id: "phys_01",
      name: "Hitting, slapping, kicking, punching or beating",
      explanation:
        "Being hit by a spouse, a family member or anyone else is a criminal offence in Pakistan, and the law treats it as violence rather than as a domestic disagreement.",
    };
  } else if (looksLike("cyber", "online", "photo", "blackmail", "cyber", "message", "share", "picture")) {
    categories = ["cyber", "sexual"];
    severity = "serious";
    categoryName = "Cyber Violence";
    validation =
      "What you have described is recognised as cyber violence under Pakistani law. Sharing or threatening to share private images, harassing someone online, and digital blackmail are all criminal offences. You have done nothing wrong.";
    indicator = {
      id: "cyber_01",
      name: "Non-consensual sharing of intimate images, or threats to share them",
      explanation:
        "Sharing or threatening to share private images without consent is a crime under PECA 2016. The person doing this is committing the offence, not you.",
    };
  } else {
    categories = ["domestic", "other"];
    severity = "concerning";
    categoryName = "Psychological / Emotional Violence";
    validation =
      "Thank you for telling us what happened. What you have described may constitute a form of violence or harassment recognised under Pakistani law. Your feelings are valid, and you have every right to seek help.";
    indicator = {
      id: "psych_01",
      name: "Verbal abuse, humiliation and controlling behaviour",
      explanation:
        "Repeated verbal abuse, humiliation and controlling behaviour are recognised as psychological violence, including restrictions on seeing family, using a phone, working or moving freely.",
    };
  }

  // Resources are passed in already scoped to this person's province and
  // gender, from the database where it is configured and from the bundled
  // dataset otherwise. Narrowed once more here to what this classification is
  // actually about.
  const matching = availableResources.filter((r) =>
    r.handles.some((h) => categories.includes(h)),
  );
  const resources = (matching.length ? matching : availableResources).slice(0, 4);

  // Prefer a helpline dedicated to this province over the national one: for a
  // domestic case in Punjab, 1043 is staffed by women and can arrange a VAW
  // centre, which 1099 cannot.
  const withPhone = resources.filter((r) => r.phone);

  // A partner organisation that handles this category is a handover, not a
  // suggestion — someone at the other end is expecting the call. It still
  // yields to the emergency services when the situation is urgent.
  const partner = withPhone.find(
    (r) => r.partner && r.handles.some((h) => categories.includes(h)),
  );
  // Only when we know where they are. With no province the directory is
  // unfiltered, so the highest-priority provincial line wins by accident — and
  // telling a woman in Quetta to call 1043 is telling her to call a number that
  // does not answer for her. The national lines do.
  const provincial = ctx.province
    ? withPhone.find((r) => r.type !== "emergency" && !r.scope.includes("national"))
    : undefined;
  const national = withPhone.find((r) => r.type !== "emergency");
  const emergency = withPhone.find((r) => r.type === "emergency");
  const chosen = isUrgent
    ? (emergency ?? partner ?? provincial ?? national)
    : (partner ?? provincial ?? national ?? emergency);

  return {
    // The person is about to read generic, keyword-matched text rather than an
    // assessment of what they actually wrote. On a legal-rights app that
    // difference matters enough to say out loud, so the result screen shows a
    // notice instead of presenting this as the real thing.
    degraded: true as const,
    // Which of the several very different problems this was. The screen shows
    // the person a plain sentence either way; this is what tells whoever runs
    // the app whether to rotate a key, raise a quota or wait out an outage,
    // without having to reach for the logs of a deploy they may not own.
    degraded_reason: reason,
    is_urgent: isUrgent,
    validation,
    classifications: [
      {
        category_id: categories[0],
        category_name: categoryName,
        indicator_id: indicator.id,
        indicator_name: indicator.name,
        explanation: indicator.explanation,
        legal_reference:
          "Our legal reference service is temporarily unavailable. The helplines below can tell you exactly which provisions apply to your situation.",
      },
    ],
    severity,
    severity_explanation:
      "This is an offline assessment made while our analysis service was unreachable, so it is less precise than usual. Please call one of the numbers below for guidance specific to your case.",
    actions: [
      {
        step: "Write down what happened, while it is fresh",
        details:
          "Record dates, times and details of each incident. Photograph any injuries. Keep this somewhere the other person cannot reach — with a trusted friend, or in a private online account.",
        priority: "immediate" as const,
      },
      {
        step: chosen?.phone ? `Call ${chosen.name} on ${chosen.phone}` : "Call the Ministry of Human Rights helpline on 1099",
        details:
          chosen?.description ??
          "Free, confidential legal advice and referral for any human rights violation, anywhere in Pakistan.",
        priority: "immediate" as const,
      },
      {
        step: "Try the assessment again shortly",
        details:
          "Our analysis service was briefly unavailable. Coming back in a few minutes will give you guidance matched to the specific laws that apply where you live.",
        priority: "short_term" as const,
      },
    ],
    resources: resources
      // A card with no way to make contact is not a resource, so entries whose
      // access route is a district office (Dar-ul-Aman) are left out of the
      // fallback rather than rendered with an empty number.
      .filter((r) => r.phone || r.website)
      .map((r) => ({
        name: r.name,
        phone: r.phone ?? "",
        website: r.website,
        why: r.description,
      })),
    note: "You are not to blame for what happened, and support is available whatever you decide to do next.",
    primary_action: chosen?.phone
      ? {
          type: "call" as const,
          label: `Call ${buttonLabel(chosen.name)} (${chosen.phone})`,
          value: chosen.phone,
          description: chosen.description,
        }
      : undefined,
  };
}

/** Trims a long organisation name so it fits on a button. */
function buttonLabel(name: string): string {
  const cut = name.split(/[—(]/)[0].trim();
  return cut.length > 34 ? `${cut.slice(0, 31)}...` : cut;
}

// ---------------------------------------------------------------------------
// Generating — the whole-response path
// ---------------------------------------------------------------------------

export type GenerationResult =
  | { ok: true; assessment: Record<string, unknown>; model: string }
  | { ok: false; reason: DegradedReason; detail: string };

/**
 * Asks the models for an assessment, and does not give up on the first refusal.
 *
 * What this exists to prevent is the app's worst failure mode, which is also
 * its quietest: one unlucky response and every person who arrives gets generic
 * keyword-matched text that reads exactly like real guidance. The previous
 * version sent one request per model and fell back on anything that was not a
 * clean answer — so a single 503 from a busy Flash instance, or one key with a
 * trailing newline, took the whole app down to keyword matching with nothing
 * user-visible to say so.
 *
 * Four layers now sit between a problem and that outcome:
 *
 *   1. Load is retried. 429 and 5xx are transient by definition; the same model
 *      is asked again with backoff before anything else is tried.
 *   2. A rejected optional field costs one retry without that field, not the
 *      request. Thinking config and response schema are both handled this way,
 *      and the flag persists across models so it is paid for once.
 *   3. Models are tried in order, and the list comes from the environment, so a
 *      retired model name is a config change rather than an outage.
 *   4. Whatever finally went wrong is named, not swallowed.
 */
async function generateAssessment(
  buildBody: (options: ConfigOptions) => string,
): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      reason: "no_api_key",
      detail: "GEMINI_API_KEY is not set, or is empty once trimmed.",
    };
  }

  // Shared across models: once a field has been refused, stop sending it.
  const options: ConfigOptions = { thinking: true, schema: true };
  let last: { reason: DegradedReason; detail: string } = {
    reason: "unreachable",
    detail: "no model was reached",
  };

  for (const model of getModels()) {
    let attempts = 0;
    // Dropping a refused field earns one extra attempt, so the retry that goes
    // out without it is not paid for from the transient-failure budget.
    let allowance = MAX_ATTEMPTS_PER_MODEL;

    while (attempts < allowance) {
      attempts++;

      try {
        const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
          method: "POST",
          headers: geminiHeaders(apiKey),
          body: buildBody(options),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const raw = await response.text();
          // Collapsed to one line. Google's error bodies are pretty-printed
          // JSON, and a multi-line log entry is one a hosted log viewer breaks
          // into fragments — the reason ends up on a line of its own, without
          // the prefix anyone would be searching for.
          const body = raw.replace(/\s+/g, " ").trim();

          if (options.thinking && isThinkingConfigRejection(response.status, body)) {
            console.warn(`[assess] ${model} rejected thinkingConfig, retrying without it`);
            options.thinking = false;
            allowance++;
            continue;
          }

          if (options.schema && isSchemaRejection(response.status, body)) {
            console.warn(`[assess] ${model} rejected responseSchema, retrying without it`);
            options.schema = false;
            allowance++;
            continue;
          }

          last = { reason: reasonForStatus(response.status), detail: `${model} ${response.status}: ${body.slice(0, 300)}` };
          console.warn(`[assess] ${last.detail}`);

          if (isTransientStatus(response.status) && attempts < allowance) {
            await sleep(backoffMs(attempts));
            continue;
          }
          break; // next model
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          const why = describeEmptyResponse(data);
          last = { reason: "empty_response", detail: `${model} returned no text (${why})` };
          console.warn(`[assess] ${last.detail}`);
          break; // a different model is more likely to help than a repeat
        }

        const parsed = parseModelJSON(rawText);
        if (parsed && isValidAssessment(parsed)) {
          return { ok: true, assessment: parsed, model };
        }

        last = {
          reason: "invalid_output",
          detail: `${model} returned output that did not validate: ${rawText.slice(0, 200)}`,
        };
        console.warn(`[assess] ${last.detail}`);
        break;
      } catch (error) {
        // A timeout, a DNS failure, a dropped connection. All worth retrying.
        const detail = error instanceof Error ? error.message : String(error);
        last = { reason: "unreachable", detail: `${model} request failed: ${detail}` };
        console.warn(`[assess] ${last.detail}`);

        if (attempts < allowance) {
          await sleep(backoffMs(attempts));
          continue;
        }
        break;
      }
    }
  }

  return { ok: false, ...last };
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

/**
 * Streams one model, emitting the safety verdict and the opening sentence as
 * soon as they are complete, then the whole assessment.
 *
 * Returns null when the model could not be used at all, so the caller can try
 * the next one or fall back — a stream that has already emitted a partial is
 * committed, which is why only the first model is streamed.
 */
async function streamFromModel(
  model: string,
  apiKey: string,
  requestBody: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<Record<string, unknown> | null> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: geminiHeaders(apiKey),
        body: requestBody,
        signal: abort.signal,
      },
    );

    if (!response.ok || !response.body) {
      const errorBody = response.body ? await response.text() : "(no body)";
      console.warn(`${model} stream returned ${response.status}: ${errorBody}`);
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    let lastPartial: PartialAssessment = {};
    // Kept so that a stream which yields no text can still report the
    // finishReason and token counts that explain why.
    let lastFrame: unknown = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Gemini's SSE frames are separated by blank lines; the last element may
      // be an incomplete frame, so it is kept for the next chunk.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;

        try {
          const payload = JSON.parse(line.slice(6));
          lastFrame = payload;
          const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string") accumulated += text;
        } catch {
          // A frame that does not parse is skipped rather than aborting the
          // stream; the accumulated text is validated in full at the end.
          continue;
        }
      }

      const partial = parsePartialAssessment(accumulated);
      if (hasNewInformation(lastPartial, partial)) {
        controller.enqueue(sse("partial", partial));
        lastPartial = partial;
      }
    }

    const parsed = parseModelJSON(accumulated);
    if (parsed && isValidAssessment(parsed)) return parsed;

    // The single most useful line in the logs when assessments stop working:
    // it separates "the model said nothing" from "the model said something we
    // could not parse", and names the token budget in the first case.
    console.warn(
      accumulated.length === 0
        ? `${model} stream produced no text (${describeEmptyResponse(lastFrame)})`
        : `${model} stream produced ${accumulated.length} chars that did not validate: ` +
          `${accumulated.slice(0, 200)}`,
    );
    return null;
  } catch (error) {
    console.warn(`${model} stream failed:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// GET — is the model actually answering?
// ---------------------------------------------------------------------------

/**
 * A one-request answer to "why is everyone getting the offline fallback?".
 *
 * The failure this route degrades through is deliberately invisible to the
 * person using the app, which also made it invisible to whoever runs it: a
 * missing key, an expired key and a model that stopped accepting the request
 * all look identical from the outside. This says which.
 *
 * It sends a real request, because "the key is set" and "the key works" are
 * different facts and only the second one matters. The probe asks for a single
 * token so it costs effectively nothing, and it is rate limited because it is
 * unauthenticated. It never returns the key, or any part of it.
 */
export async function GET(request: NextRequest) {
  // Rate limited because it is unauthenticated and it spends a model call.
  if (!(await allowRequest(clientBucket(request, "assess-health"), { max: 6, windowSeconds: 300 }))) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const health = await checkModelHealth();

  return NextResponse.json(
    {
      ...health,
      models: getModels(),
      thinkingBudget: THINKING_BUDGET,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    {
      status: health.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const { input, locale } = body;
    const lang: "en" | "ur" = locale === "ur" ? "ur" : "en";
    const ctx = sanitiseContext(body.context);

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Please describe your situation" },
        { status: 400 },
      );
    }

    const trimmedInput = input.trim().slice(0, 8000);

    // The guided flow sends its raw answers so an identical situation can be
    // recognised. The key is derived here rather than accepted from the client:
    // a caller that could choose its own key could read another situation's
    // cached guidance, or poison the entry every future user in that situation
    // receives.
    const answers = sanitiseAnswers(body.answers);
    const cacheable = body.cacheable === true && answers !== undefined;
    const cacheKey = cacheable ? computeCacheKey(answers!, lang) : undefined;

    // -----------------------------------------------------------------------
    // 1. Cache
    // -----------------------------------------------------------------------
    if (cacheKey) {
      const cached = await lookupCachedAssessment(cacheKey);
      if (cached) {
        recordCacheHit(cacheKey);
        void recordAssessmentEvent({
          province: ctx.province,
          gender: ctx.gender,
          locale: lang,
          categories: ctx.categories ?? [],
          severity: (cached.response as { severity?: string }).severity,
          urgent: Boolean((cached.response as { is_urgent?: boolean }).is_urgent),
          cacheHit: true,
          usedFallback: false,
          latencyMs: Date.now() - startedAt,
        });
        // Normalised on the way out as well as on the way in, so an entry
        // stored before the ordering rules existed — or one a reviewer edited
        // in the table — still reaches the screen in the right order.
        return NextResponse.json(normaliseAssessment(cached.response as Record<string, unknown>));
      }
    }

    // -----------------------------------------------------------------------
    // 2. Scoped corpus — from Supabase where configured, bundled data otherwise
    // -----------------------------------------------------------------------
    const reference = await getReferenceData();
    const scope = {
      province: ctx.province,
      gender: ctx.gender,
      categories: ctx.categories,
    };
    const promptData = {
      law: scopeLaw(reference, scope),
      resources: scopeResources(reference, scope),
      indicators: scopeIndicators(reference, ctx.categories),
    };

    const requestPayload = (options: ConfigOptions = {}) =>
      JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(lang, ctx, promptData) }],
        },
        contents: [{ role: "user", parts: [{ text: trimmedInput }] }],
        generationConfig: generationConfig(options),
      });

    // -----------------------------------------------------------------------
    // 3. Answering
    // -----------------------------------------------------------------------
    // Both paths below end in the same three steps — order the assessment,
    // store it if it is cacheable, record the anonymised event — so they share
    // them. Ordering in particular has to happen in one place: the streamed and
    // the whole-response paths returning differently ordered action steps for
    // the same situation is the bug this was written to end.
    const settle = (
      assessment: Record<string, unknown>,
      { model, cache }: { model?: string; cache: boolean },
    ) => {
      const ordered = normaliseAssessment(assessment, promptData.resources);

      if (cache && cacheKey && answers && model) {
        // Not awaited: the answer is ready, and caching is an optimisation
        // rather than a dependency.
        void storeAssessment({
          cacheKey,
          locale: lang,
          answers,
          context: ctx as unknown as CaseContext,
          response: ordered,
          model,
        });
      }

      void recordAssessmentEvent({
        province: ctx.province,
        gender: ctx.gender,
        locale: lang,
        categories: ctx.categories ?? [],
        severity: ordered.severity as string | undefined,
        urgent: Boolean(ordered.is_urgent),
        cacheHit: false,
        usedFallback: !cache || reference.usedFallback,
        latencyMs: Date.now() - startedAt,
      });

      return ordered;
    };

    /**
     * The answer, however it has to be obtained. Model first; the offline
     * keyword fallback only once every model and every retry is spent, and
     * carrying the reason so the screen and the logs can both name it.
     */
    const answerOrFallback = async (): Promise<Record<string, unknown>> => {
      const generated = await generateAssessment(requestPayload);

      if (generated.ok) {
        return settle(generated.assessment, { model: generated.model, cache: true });
      }

      // One line, one prefix, the reason first. This is what someone greps for
      // when the app is "giving generic answers again".
      console.error(
        `[assess] falling back to offline guidance: reason=${generated.reason} ${generated.detail}`,
      );

      // Deliberately not cached. A degraded answer must never become the stored
      // answer that every future person in this situation receives.
      return settle(
        getFallbackResponse(trimmedInput, ctx, promptData.resources, generated.reason),
        { cache: false },
      );
    };

    // -----------------------------------------------------------------------
    // 3a. Streaming
    // -----------------------------------------------------------------------
    // Opt-in. The safety verdict and the opening sentence reach the person
    // seconds before the law and the action steps.
    //
    // A stream that cannot be used finishes on the server rather than asking
    // the browser to start again: the client used to re-POST, which doubled the
    // wait in exactly the situation where the model was already struggling,
    // and made a network blip between the two requests look like a crash. The
    // partial frames already sent are only the safety verdict and the opening
    // sentence, so completing over the top of them is coherent either way.
    const apiKey = getApiKey();

    if (body.stream === true && apiKey) {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const streamed = await streamFromModel(
              getModels()[0],
              apiKey,
              requestPayload(),
              controller,
            );

            const result = streamed
              ? settle(streamed, { model: getModels()[0], cache: true })
              : await answerOrFallback();

            controller.enqueue(sse("complete", result));
          } catch (error) {
            console.error("[assess] streaming failed:", error);
            try {
              controller.enqueue(sse("complete", await answerOrFallback()));
            } catch (fatal) {
              console.error("[assess] recovery after a failed stream also failed:", fatal);
              controller.enqueue(sse("retry", { reason: "stream_failed" }));
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // -----------------------------------------------------------------------
    // 3b. Whole response
    // -----------------------------------------------------------------------
    return NextResponse.json(await answerOrFallback());
  } catch (error) {
    console.error("Assessment error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

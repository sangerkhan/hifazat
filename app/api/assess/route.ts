import { NextResponse, type NextRequest } from "next/server";
import { allowRequest, clientBucket } from "@/lib/rate-limit";
import {
  MAX_OUTPUT_TOKENS,
  THINKING_BUDGET,
  describeEmptyResponse,
  generationConfig,
  isThinkingConfigRejection,
} from "@/lib/gemini";
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";


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
 * Used when every model attempt fails. The classification text is still
 * keyword-driven, but the resources are now drawn from the directory using the
 * same province and gender scoping as the live path — the previous hardcoded
 * fallback told everyone to call the Punjab women's helpline, including people
 * in Sindh and Balochistan where 1043 does not answer.
 */
function getFallbackResponse(
  input: string,
  ctx: PromptContext,
  availableResources: Resource[],
) {
  const text = input.toLowerCase();

  const match = (...needles: string[]) => needles.some((n) => text.includes(n));

  let categories: CaseCategory[];
  let severity: "concerning" | "serious" | "critical";
  let isUrgent = false;
  let validation: string;
  let categoryName: string;
  let indicator: { id: string; name: string; explanation: string };

  if (match("threat", "kill", "honour", "honor", "danger", "murder")) {
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
  } else if (match("online", "photo", "blackmail", "cyber", "message", "share", "picture")) {
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
  } else if (match("hit", "slap", "beat", "hurt", "physical", "punch", "kick")) {
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
  const provincial = withPhone.find(
    (r) => r.type !== "emergency" && !r.scope.includes("national"),
  );
  const national = withPhone.find((r) => r.type !== "emergency");
  const emergency = withPhone.find((r) => r.type === "emergency");
  const chosen = isUrgent
    ? (emergency ?? provincial ?? national)
    : (provincial ?? national ?? emergency);

  return {
    // The person is about to read generic, keyword-matched text rather than an
    // assessment of what they actually wrote. On a legal-rights app that
    // difference matters enough to say out loud, so the result screen shows a
    // notice instead of presenting this as the real thing.
    degraded: true as const,
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
  requestBody: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<Record<string, unknown> | null> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 45_000);

  try {
    const response = await fetch(
      `${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, reason: "no_api_key", detail: "GEMINI_API_KEY is not set." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!(await allowRequest(clientBucket(request, "assess-health"), { max: 6, windowSeconds: 300 }))) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const model = GEMINI_MODELS[0];
  const started = Date.now();

  try {
    const abort = AbortSignal.timeout(15_000);
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: {
          maxOutputTokens: 8,
          thinkingConfig: { thinkingBudget: THINKING_BUDGET },
        },
      }),
      signal: abort,
    });

    const latencyMs = Date.now() - started;

    if (!response.ok) {
      const body = await response.text();
      // Google's own message names the cause (invalid key, model not found,
      // quota). It is about this deploy's configuration, not about any user,
      // so it is safe to return — and it is the whole point of the endpoint.
      return NextResponse.json(
        {
          ok: false,
          reason: response.status === 400 ? "rejected" : "upstream_error",
          model,
          status: response.status,
          detail: body.slice(0, 500),
          latencyMs,
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json(
      {
        ok: typeof text === "string" && text.length > 0,
        model,
        latencyMs,
        thinkingBudget: THINKING_BUDGET,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        ...(typeof text === "string" && text.length > 0
          ? {}
          : { reason: "empty_response", detail: describeEmptyResponse(data) }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: "unreachable",
        model,
        detail: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
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
        return NextResponse.json(cached.response);
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

    const requestPayload = (withThinkingConfig = true) =>
      JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(lang, ctx, promptData) }],
        },
        contents: [{ role: "user", parts: [{ text: trimmedInput }] }],
        generationConfig: generationConfig(withThinkingConfig),
      });

    // -----------------------------------------------------------------------
    // 2b. Streaming
    // -----------------------------------------------------------------------
    // Opt-in and additive. The whole-response path below is untouched and stays
    // the default, so a problem here degrades to the behaviour that already
    // worked rather than breaking assessments.
    if (body.stream === true && GEMINI_API_KEY) {
      const payload = requestPayload();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const result = await streamFromModel(GEMINI_MODELS[0], payload, controller);

            if (result) {
              if (cacheKey && answers) {
                void storeAssessment({
                  cacheKey,
                  locale: lang,
                  answers,
                  context: ctx as unknown as CaseContext,
                  response: result,
                  model: GEMINI_MODELS[0],
                });
              }

              void recordAssessmentEvent({
                province: ctx.province,
                gender: ctx.gender,
                locale: lang,
                categories: ctx.categories ?? [],
                severity: result.severity as string | undefined,
                urgent: Boolean(result.is_urgent),
                cacheHit: false,
                usedFallback: reference.usedFallback,
                latencyMs: Date.now() - startedAt,
              });

              controller.enqueue(sse("complete", result));
            } else {
              // The client retries without streaming, which reaches the
              // non-streaming models and the offline fallback.
              controller.enqueue(sse("retry", { reason: "stream_unusable" }));
            }
          } catch (error) {
            console.error("Streaming assessment failed:", error);
            controller.enqueue(sse("retry", { reason: "stream_failed" }));
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
    // 3. Model
    // -----------------------------------------------------------------------
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      let lastError: Error | null = null;
      let useThinkingConfig = true;

      for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const model = GEMINI_MODELS[i];
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45_000);

          const response = await fetch(
            `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: requestPayload(useThinkingConfig),
              signal: controller.signal,
            },
          );

          clearTimeout(timeout);

          if (!response.ok) {
            const errorBody = await response.text();

            // Retry this same model once without the thinking config rather
            // than moving on: a model that rejects the field would otherwise
            // send everyone to the offline fallback.
            if (useThinkingConfig && isThinkingConfigRejection(response.status, errorBody)) {
              console.warn(`${model} rejected thinkingConfig, retrying without it`);
              useThinkingConfig = false;
              i--; // same model, one more time. The flag stops this recurring.
              continue;
            }

            console.warn(`${model} returned ${response.status}: ${errorBody}`);
            lastError = new Error(`${model} error ${response.status}: ${errorBody}`);
            continue;
          }

          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            const why = describeEmptyResponse(data);
            console.warn(`${model} returned no text (${why}), trying next model...`);
            lastError = new Error(`${model} returned no text: ${why}`);
            continue;
          }

          const parsed = parseModelJSON(rawText);
          if (parsed && isValidAssessment(parsed)) {
            // Store for the next person in the same situation. Not awaited: the
            // answer is ready and caching is an optimisation, not a dependency.
            if (cacheKey && answers) {
              void storeAssessment({
                cacheKey,
                locale: lang,
                answers,
                context: ctx as unknown as CaseContext,
                response: parsed,
                model,
              });
            }

            void recordAssessmentEvent({
              province: ctx.province,
              gender: ctx.gender,
              locale: lang,
              categories: ctx.categories ?? [],
              severity: parsed.severity as string | undefined,
              urgent: Boolean(parsed.is_urgent),
              cacheHit: false,
              usedFallback: reference.usedFallback,
              latencyMs: Date.now() - startedAt,
            });

            return NextResponse.json(parsed);
          }

          console.warn(`${model} returned invalid JSON, trying next model...`);
          lastError = new Error(`${model} returned invalid JSON`);
        } catch (modelError) {
          console.warn(`${model} failed:`, modelError);
          lastError =
            modelError instanceof Error ? modelError : new Error(String(modelError));
        }
      }

      throw lastError || new Error("All models failed");
    } catch (aiError) {
      console.error("Assessment model error, using fallback:", aiError);

      const fallback = getFallbackResponse(trimmedInput, ctx, promptData.resources);

      void recordAssessmentEvent({
        province: ctx.province,
        gender: ctx.gender,
        locale: lang,
        categories: ctx.categories ?? [],
        severity: fallback.severity,
        urgent: fallback.is_urgent,
        cacheHit: false,
        usedFallback: true,
        latencyMs: Date.now() - startedAt,
      });

      // Deliberately not cached. The offline fallback is a degraded answer and
      // must not become the stored answer for that situation.
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error("Assessment error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

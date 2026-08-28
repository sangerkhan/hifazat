import { NextResponse } from "next/server";
import { buildSystemPrompt, type PromptContext } from "@/lib/system-prompt";
import { getResources } from "@/lib/resources";
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
function getFallbackResponse(input: string, ctx: PromptContext) {
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

  const resources = getResources({
    province: ctx.province,
    gender: ctx.gender,
    categories,
  }).slice(0, 4);

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
// POST
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
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

    try {
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const requestBody = JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(lang, ctx) }],
        },
        contents: [{ role: "user", parts: [{ text: trimmedInput }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      let lastError: Error | null = null;

      for (const model of GEMINI_MODELS) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45_000);

          const response = await fetch(
            `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: requestBody,
              signal: controller.signal,
            },
          );

          clearTimeout(timeout);

          if (!response.ok) {
            const errorBody = await response.text();
            console.warn(`${model} returned ${response.status}, trying next model...`);
            lastError = new Error(`${model} error ${response.status}: ${errorBody}`);
            continue;
          }

          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            console.warn(`${model} returned empty response, trying next model...`);
            lastError = new Error(`${model} returned empty response`);
            continue;
          }

          const parsed = parseModelJSON(rawText);
          if (parsed && isValidAssessment(parsed)) {
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
      return NextResponse.json(getFallbackResponse(trimmedInput, ctx));
    }
  } catch (error) {
    console.error("Assessment error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

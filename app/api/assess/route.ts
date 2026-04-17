import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/system-prompt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// JSON parsing helper — handles both raw JSON and markdown-fenced JSON
// ---------------------------------------------------------------------------
function parseClaudeJSON(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();

  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore
  }

  // Try stripping markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // ignore
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Validate the parsed response matches the AssessmentData shape
// ---------------------------------------------------------------------------
function isValidAssessment(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (typeof d.is_urgent !== "boolean") return false;
  if (typeof d.validation !== "string") return false;
  if (!["concerning", "serious", "critical"].includes(d.severity as string))
    return false;
  if (!Array.isArray(d.classifications) || d.classifications.length === 0)
    return false;
  if (!Array.isArray(d.actions) || d.actions.length === 0) return false;
  if (!Array.isArray(d.resources) || d.resources.length === 0) return false;

  // Validate primary_action if present (not required for backward compat)
  if (d.primary_action) {
    const pa = d.primary_action as Record<string, unknown>;
    if (!["call", "link"].includes(pa.type as string)) return false;
    if (typeof pa.label !== "string") return false;
    if (typeof pa.value !== "string") return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Fallback — keyword-based hardcoded responses (used if AI call fails)
// ---------------------------------------------------------------------------
function getFallbackResponse(input: string) {
  const inputLower = input.toLowerCase();

  if (
    inputLower.includes("hit") ||
    inputLower.includes("slap") ||
    inputLower.includes("beat") ||
    inputLower.includes("hurt") ||
    inputLower.includes("physical")
  ) {
    return {
      is_urgent: false,
      validation:
        "What you have described is recognised as physical violence under Pakistani law. No one has the right to hit you, no matter the circumstances. Your feelings are completely valid, and you deserve to be safe.",
      classifications: [
        {
          category_id: "physical",
          category_name: "Physical Violence",
          indicator_id: "phys_01",
          indicator_name: "Hitting, slapping, kicking, punching, or beating",
          explanation:
            "Being hit or slapped by someone — whether a spouse, family member, or anyone else — is a criminal offence in Pakistan. This is not a private family matter; it is violence, and the law recognises it as such.",
          legal_reference:
            "Pakistan Penal Code Sections 332-337 (Hurt); Punjab Protection of Women against Violence Act 2016, Section 2(o)(1)",
        },
        {
          category_id: "psychological",
          category_name: "Psychological / Emotional Violence",
          indicator_id: "psych_02",
          indicator_name: "Threats of violence, harm, or abandonment",
          explanation:
            "Physical violence is almost always accompanied by psychological harm — the fear, the anxiety, the feeling of being trapped. This too is recognised as a form of violence under Pakistani law.",
          legal_reference:
            "Domestic Violence (Prevention and Protection) Act 2012",
        },
      ],
      severity: "serious",
      severity_explanation:
        "Physical violence of any kind is classified as serious. It constitutes a defined criminal offence and formal action is strongly recommended.",
      actions: [
        {
          step: "Document what happened",
          details:
            "Write down dates, times, and details of each incident. If you have any injuries, take photographs. Keep this record somewhere safe — with a trusted friend or in a private online account.",
          priority: "immediate",
        },
        {
          step: "Tell someone you trust",
          details:
            "Confide in a family member, friend, or neighbour you trust. Having someone who knows your situation can be critical for your safety.",
          priority: "immediate",
        },
        {
          step: "Call the Punjab Women's Helpline (1043)",
          details:
            "This helpline has all-women call agents who can provide confidential counseling and guide you on your legal options. Available 24/7.",
          priority: "short_term",
        },
        {
          step: "Consult a legal aid organisation",
          details:
            "Contact AGHS Legal Aid Cell (0800-00123) for free legal advice about your options — including protection orders under the Punjab Protection of Women against Violence Act.",
          priority: "longer_term",
        },
      ],
      resources: [
        {
          name: "Punjab Women's Helpline (PCSW)",
          phone: "1043",
          why: "24/7 helpline with all-women call agents who specialise in violence against women cases.",
        },
        {
          name: "Ministry of Human Rights Helpline",
          phone: "1099",
          why: "Can provide free legal advice and connect you with local support services.",
        },
        {
          name: "AGHS Legal Aid Cell",
          phone: "0800-00123",
          why: "Free legal aid to help you understand your rights and obtain a protection order if needed.",
        },
      ],
      note: "You are not alone, and what happened to you is not your fault. Many women in Pakistan have successfully sought help and protection through these channels.",
      primary_action: {
        type: "call",
        label: "Call Punjab Women's Helpline (1043)",
        value: "1043",
        description:
          "24/7 helpline with all-women call agents who specialise in violence against women cases.",
      },
    };
  }

  if (
    inputLower.includes("threat") ||
    inputLower.includes("kill") ||
    inputLower.includes("honour") ||
    inputLower.includes("honor") ||
    inputLower.includes("danger")
  ) {
    return {
      is_urgent: true,
      validation:
        "What you are describing sounds extremely dangerous. Threats to your life — especially in the name of so-called honour — are a serious criminal offence in Pakistan. Your safety is the absolute priority right now.",
      classifications: [
        {
          category_id: "harmful_traditional",
          category_name: "Harmful Traditional Practices",
          indicator_id: "trad_01",
          indicator_name: "Honour killing (karo-kari) or threats",
          explanation:
            "Threats to harm or kill someone in the name of 'honour' are a criminal offence under Pakistani law. The 2016 amendment specifically closed loopholes that previously allowed families to forgive perpetrators. These threats must be taken seriously.",
          legal_reference:
            "Criminal Law (Amendment) (Offences in the name or pretext of Honour) Act 2016",
        },
      ],
      severity: "critical",
      severity_explanation:
        "Any threat to life, especially honour-based threats, is classified as critical. There is immediate danger and emergency action is required.",
      actions: [
        {
          step: "Get to a safe location immediately",
          details:
            "If you are in immediate danger, leave the environment if you can. Go to a trusted neighbour, friend, or public place.",
          priority: "immediate",
        },
        {
          step: "Call the Police (15)",
          details:
            "Report the threats immediately. Under the 2016 law, honour-based threats are a criminal offence. You can request police protection.",
          priority: "immediate",
        },
        {
          step: "Call the Human Rights helpline (1099)",
          details:
            "They can provide immediate guidance, connect you with shelters, and help coordinate protection.",
          priority: "immediate",
        },
      ],
      resources: [
        {
          name: "Police Emergency",
          phone: "15",
          why: "For immediate police intervention and protection from threats to your life.",
        },
        {
          name: "Ministry of Human Rights Helpline",
          phone: "1099",
          why: "Can coordinate emergency protection, shelter placement, and legal action.",
        },
        {
          name: "Bedari",
          phone: "0300-525-1717",
          why: "Can help with shelter referrals and legal aid for women facing honour-based violence.",
        },
      ],
      note: "Please take these threats seriously. You deserve to live free from fear.",
      primary_action: {
        type: "call",
        label: "Call Police (15)",
        value: "15",
        description:
          "For immediate police intervention and protection from threats to your life.",
      },
    };
  }

  if (
    inputLower.includes("online") ||
    inputLower.includes("photo") ||
    inputLower.includes("blackmail") ||
    inputLower.includes("cyber") ||
    inputLower.includes("message") ||
    inputLower.includes("share")
  ) {
    return {
      is_urgent: false,
      validation:
        "What you have described is recognised as cyber violence under Pakistani law. Sharing or threatening to share someone's private images, harassing them online, or blackmailing them digitally are all criminal offences. You have done nothing wrong.",
      classifications: [
        {
          category_id: "cyber",
          category_name: "Cyber Violence / Technology-Facilitated VAW",
          indicator_id: "cyber_01",
          indicator_name:
            "Non-consensual sharing of intimate images or videos",
          explanation:
            "Sharing or threatening to share private images without consent is a serious crime under Pakistan's cyber crime laws. The person doing this is committing a criminal offence — not you.",
          legal_reference:
            "Prevention of Electronic Crimes Act (PECA) 2016",
        },
        {
          category_id: "cyber",
          category_name: "Cyber Violence / Technology-Facilitated VAW",
          indicator_id: "cyber_03",
          indicator_name: "Digital blackmail or sextortion",
          explanation:
            "Using private information or images to pressure, extort, or control someone is blackmail — a criminal offence that carries serious penalties under Pakistani law.",
          legal_reference:
            "Prevention of Electronic Crimes Act (PECA) 2016, Section 24",
        },
      ],
      severity: "serious",
      severity_explanation:
        "Digital blackmail and non-consensual image sharing are serious criminal offences. Formal action through FIA Cyber Crime is strongly recommended.",
      actions: [
        {
          step: "Do NOT delete evidence",
          details:
            "Take screenshots of all threatening messages, profiles, and shared content. Save them somewhere safe. This will be critical evidence.",
          priority: "immediate",
        },
        {
          step: "Report to FIA Cyber Crime (1991)",
          details:
            "Call the FIA Cyber Crime helpline or visit their nearest office. They handle all online harassment, blackmail, and image-sharing cases. You can also report at ccs.fia.gov.pk.",
          priority: "immediate",
        },
        {
          step: "Contact Digital Rights Foundation",
          details:
            "Call their free helpline at 0800-39393. They specialise in online harassment and can guide you through the reporting process step by step.",
          priority: "short_term",
        },
      ],
      resources: [
        {
          name: "FIA Cyber Crime Reporting",
          phone: "1991",
          why: "The official government body for reporting cyber crimes including blackmail and non-consensual image sharing.",
        },
        {
          name: "Digital Rights Foundation",
          phone: "0800-39393",
          why: "Free helpline specialising in online harassment — they can guide you through the entire process.",
        },
        {
          name: "Ministry of Human Rights Helpline",
          phone: "1099",
          why: "Can provide additional legal guidance and connect you with support services.",
        },
      ],
      note: "You are not to blame for someone else's criminal behaviour. Many women have successfully had content removed and perpetrators prosecuted through these channels.",
      primary_action: {
        type: "link",
        label: "Report to FIA Cyber Crime",
        value: "https://ccs.fia.gov.pk/",
        description:
          "File a complaint with the FIA Cyber Crime Wing for online harassment and blackmail.",
      },
    };
  }

  // Default response
  return {
    is_urgent: false,
    validation:
      "Thank you for sharing what happened. What you have described may constitute a form of violence or harassment recognised under Pakistani law. Your feelings are valid, and you have every right to seek help and support.",
    classifications: [
      {
        category_id: "psychological",
        category_name: "Psychological / Emotional Violence",
        indicator_id: "psych_01",
        indicator_name: "Verbal abuse — insults, humiliation, belittling",
        explanation:
          "Repeated verbal abuse, insults, and humiliation are recognised as psychological violence under Pakistani law. This includes any behaviour designed to undermine your self-worth or make you feel powerless.",
        legal_reference:
          "Punjab Protection of Women against Violence Act 2016, Section 2(o)(2); Domestic Violence (Prevention and Protection) Act 2012",
      },
      {
        category_id: "psychological",
        category_name: "Psychological / Emotional Violence",
        indicator_id: "psych_03",
        indicator_name:
          "Controlling behaviour — isolation from family and friends",
        explanation:
          "Being restricted from seeing family, using a phone, working, or moving freely are all forms of controlling behaviour that constitute psychological violence under the law.",
        legal_reference:
          "Domestic Violence (Prevention and Protection) Act 2012",
      },
    ],
    severity: "concerning",
    severity_explanation:
      "Your situation is not okay. While it may not involve immediate physical danger, the behaviour you described is recognised as harmful and action is recommended.",
    actions: [
      {
        step: "Recognise that this is not normal",
        details:
          "What you are experiencing is recognised by law as a form of violence. You are not overreacting, and you are not alone.",
        priority: "immediate",
      },
      {
        step: "Talk to someone you trust",
        details:
          "Share what you are going through with a trusted friend, family member, or counselor. Breaking the silence is often the first step.",
        priority: "immediate",
      },
      {
        step: "Call a helpline for guidance",
        details:
          "The Ministry of Human Rights helpline (1099) or Punjab Women's Helpline (1043) can provide free, confidential counseling and guide you on next steps.",
        priority: "short_term",
      },
      {
        step: "Learn about your legal rights",
        details:
          "You may be entitled to a protection order under the Domestic Violence Act. A legal aid organisation can explain your options at no cost.",
        priority: "longer_term",
      },
    ],
    resources: [
      {
        name: "Ministry of Human Rights Helpline",
        phone: "1099",
        why: "Free confidential counseling and legal advice for your situation.",
      },
      {
        name: "Punjab Women's Helpline (PCSW)",
        phone: "1043",
        why: "24/7 helpline with trained women counselors who understand what you are going through.",
      },
      {
        name: "Rozan Counseling Helpline",
        phone: "0304-111-1741",
        why: "Confidential counseling to help you process your experience and plan next steps.",
      },
    ],
    note: "You took a brave step by describing your situation. Whatever you decide to do next, know that support is available and you deserve to be treated with dignity.",
    primary_action: {
      type: "call",
      label: "Call Human Rights Helpline (1099)",
      value: "1099",
      description:
        "Free confidential counseling and legal advice for your situation.",
    },
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { input, locale } = await request.json();
    const lang: "en" | "ur" = locale === "ur" ? "ur" : "en";

    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Please describe your situation" },
        { status: 400 }
      );
    }

    const trimmedInput = input.trim();

    // Try Gemini API call — attempt each model in order
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const requestBody = JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(lang) }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: trimmedInput }],
          },
        ],
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
            }
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

          const parsed = parseClaudeJSON(rawText);
          if (parsed && isValidAssessment(parsed)) {
            return NextResponse.json(parsed);
          }

          console.warn(`${model} returned invalid JSON, trying next model...`);
          lastError = new Error(`${model} returned invalid JSON`);
        } catch (modelError) {
          console.warn(`${model} failed:`, modelError);
          lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        }
      }

      // All models failed
      throw lastError || new Error("All Gemini models failed");
    } catch (aiError) {
      console.error("Gemini API error, using fallback:", aiError);
      return NextResponse.json(getFallbackResponse(trimmedInput));
    }
  } catch (error) {
    console.error("Assessment error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

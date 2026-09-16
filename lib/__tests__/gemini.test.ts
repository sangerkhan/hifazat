import { afterEach, describe, it, expect } from "vitest";
import {
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
} from "../gemini";

/**
 * These guard the pair of settings that decide whether an assessment happens
 * at all. Getting them wrong does not throw and does not fail a build — it
 * quietly serves every user the offline keyword fallback while looking exactly
 * like a working app, which is how it went unnoticed in production.
 */
describe("generation config", () => {
  it("caps thinking, because thinking tokens are spent from the output budget", () => {
    const config = generationConfig();
    expect(config.thinkingConfig).toBeDefined();
    expect(config.thinkingConfig!.thinkingBudget).toBe(THINKING_BUDGET);
  });

  it("leaves room for the answer after thinking has taken its share", () => {
    // The assessment JSON — validation, classifications, action steps and
    // resources — runs to well over a thousand tokens. If the two budgets ever
    // sum past the cap again, the model returns a truncated object.
    expect(MAX_OUTPUT_TOKENS - THINKING_BUDGET).toBeGreaterThan(4096);
  });

  it("asks for JSON, which the response parser depends on", () => {
    expect(generationConfig().responseMimeType).toBe("application/json");
  });

  it("can build a payload without the thinking config, for the retry path", () => {
    expect(generationConfig({ thinking: false }).thinkingConfig).toBeUndefined();
    expect(generationConfig({ thinking: false }).maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
  });

  it("can build a payload without the response schema, for the retry path", () => {
    expect(generationConfig({ schema: false }).responseSchema).toBeUndefined();
    // Dropping the schema must not drop the JSON mime type as well; the parser
    // has nothing to work with if it does.
    expect(generationConfig({ schema: false }).responseMimeType).toBe("application/json");
  });

  it("constrains the output to the shape the result screen renders", () => {
    const schema = generationConfig().responseSchema as {
      required: string[];
      properties: { severity: { enum: string[] } };
      propertyOrdering: string[];
    };

    expect(schema.required).toContain("actions");
    expect(schema.required).toContain("resources");
    expect(schema.required).toContain("classifications");
    // The three the UI switches on. A model answering "high" used to fail
    // validation and send the person keyword-matched text instead.
    expect(schema.properties.severity.enum).toEqual(["concerning", "serious", "critical"]);
  });

  it("serialises the safety verdict first, which is what streaming shows first", () => {
    const schema = generationConfig().responseSchema as { propertyOrdering: string[] };
    expect(schema.propertyOrdering.slice(0, 2)).toEqual(["is_urgent", "validation"]);
  });
});

describe("describeEmptyResponse", () => {
  it("names thinking as the cause when it exhausted the budget", () => {
    const described = describeEmptyResponse({
      candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }],
      usageMetadata: {
        thoughtsTokenCount: 4096,
        candidatesTokenCount: 0,
        promptTokenCount: 5500,
      },
    });
    expect(described).toContain("finishReason=MAX_TOKENS");
    expect(described).toContain("thinking=4096");
    expect(described).toContain("output=0");
  });

  it("distinguishes a safety block from an exhausted budget", () => {
    const described = describeEmptyResponse({
      candidates: [
        {
          finishReason: "SAFETY",
          safetyRatings: [{ blocked: true, category: "HARM_CATEGORY_DANGEROUS_CONTENT" }],
        },
      ],
    });
    expect(described).toContain("safetyBlocked=HARM_CATEGORY_DANGEROUS_CONTENT");
    expect(described).not.toContain("thinking=");
  });

  it("reports a prompt-level block", () => {
    expect(describeEmptyResponse({ promptFeedback: { blockReason: "OTHER" } })).toContain(
      "promptBlocked=OTHER",
    );
  });

  it("says something useful rather than throwing on a malformed body", () => {
    expect(describeEmptyResponse(null)).toContain("finishReason=none");
    expect(describeEmptyResponse(undefined)).toContain("usage=none");
    expect(describeEmptyResponse("not an object")).toContain("parts=0");
  });
});

/**
 * The credential handling, which is where this app has actually broken.
 *
 * Both incidents so far were a key problem, not a model problem: one expired,
 * one arrived with characters around it. Neither threw, neither failed a build,
 * and both presented as "the AI has stopped working and we don't know why".
 */
describe("the API key", () => {
  const original = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });

  it("survives the newline a pasted key brings with it", () => {
    process.env.GEMINI_API_KEY = "AIzaSyExample\n";
    expect(getApiKey()).toBe("AIzaSyExample");
  });

  it("survives quotes copied out of a .env file", () => {
    process.env.GEMINI_API_KEY = '"AIzaSyExample"';
    expect(getApiKey()).toBe("AIzaSyExample");

    process.env.GEMINI_API_KEY = "  'AIzaSyExample'  ";
    expect(getApiKey()).toBe("AIzaSyExample");
  });

  it("treats a blank value as unset rather than sending it", () => {
    process.env.GEMINI_API_KEY = "   ";
    expect(getApiKey()).toBeUndefined();
  });

  it("is read per call, so a rotated key does not wait for a cold start", () => {
    process.env.GEMINI_API_KEY = "first";
    expect(getApiKey()).toBe("first");
    process.env.GEMINI_API_KEY = "second";
    expect(getApiKey()).toBe("second");
  });
});

describe("the model list", () => {
  const original = process.env.GEMINI_MODELS;
  afterEach(() => {
    if (original === undefined) delete process.env.GEMINI_MODELS;
    else process.env.GEMINI_MODELS = original;
  });

  it("falls back to a chain, not a single model", () => {
    delete process.env.GEMINI_MODELS;
    expect(getModels().length).toBeGreaterThan(1);
    expect(getModels()[0]).toBe("gemini-2.5-flash");
  });

  it("can be redirected without a deploy, for the day a model is retired", () => {
    process.env.GEMINI_MODELS = " gemini-3-flash , gemini-2.5-flash ";
    expect(getModels()).toEqual(["gemini-3-flash", "gemini-2.5-flash"]);
  });

  it("ignores an empty override rather than sending an empty model name", () => {
    process.env.GEMINI_MODELS = " , ";
    expect(getModels()[0]).toBe("gemini-2.5-flash");
  });
});

describe("transient failures", () => {
  it("retries load, which is what a busy Flash instance returns", () => {
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(500)).toBe(true);
  });

  it("does not retry a request that will fail identically every time", () => {
    // A bad key, a retired model, a malformed payload. Retrying these only
    // makes the person wait longer for the same fallback.
    expect(isTransientStatus(400)).toBe(false);
    expect(isTransientStatus(403)).toBe(false);
    expect(isTransientStatus(404)).toBe(false);
  });

  it("backs off further on each attempt", () => {
    expect(backoffMs(2, 0)).toBeGreaterThan(backoffMs(1, 0));
    expect(backoffMs(3, 0)).toBeGreaterThan(backoffMs(2, 0));
  });

  it("stays within a few seconds, because someone is waiting", () => {
    expect(backoffMs(3, 1)).toBeLessThan(3000);
  });
});

describe("naming the cause for whoever runs the app", () => {
  it("separates a quota problem from a credentials problem", () => {
    expect(reasonForStatus(429)).toBe("quota");
    expect(reasonForStatus(400)).toBe("rejected");
    expect(reasonForStatus(403)).toBe("rejected");
    expect(reasonForStatus(503)).toBe("unreachable");
  });
});

describe("isSchemaRejection", () => {
  it("recognises a model refusing the response schema", () => {
    expect(
      isSchemaRejection(400, '{"error":{"message":"responseSchema is not supported"}}'),
    ).toBe(true);
    expect(isSchemaRejection(400, 'Unknown name "property_ordering"')).toBe(true);
  });

  it("does not mistake an unrelated failure for one", () => {
    expect(isSchemaRejection(400, "API key not valid.")).toBe(false);
    expect(isSchemaRejection(503, "responseSchema")).toBe(false);
  });
});

describe("isThinkingConfigRejection", () => {
  it("recognises a model refusing the thinking field", () => {
    expect(
      isThinkingConfigRejection(400, '{"error":{"message":"thinking_config is not supported"}}'),
    ).toBe(true);
    expect(isThinkingConfigRejection(400, 'Unknown name "thoughtsBudget"')).toBe(true);
  });

  it("does not mistake an unrelated failure for one", () => {
    // A bad key must fall through to the normal path, not trigger a pointless
    // retry of the same request.
    expect(isThinkingConfigRejection(400, "API key not valid.")).toBe(false);
    expect(isThinkingConfigRejection(429, "thinking quota exceeded")).toBe(false);
    expect(isThinkingConfigRejection(500, "internal error")).toBe(false);
  });
});

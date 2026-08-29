import { describe, it, expect } from "vitest";
import {
  MAX_OUTPUT_TOKENS,
  THINKING_BUDGET,
  describeEmptyResponse,
  generationConfig,
  isThinkingConfigRejection,
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
    expect(generationConfig(false).thinkingConfig).toBeUndefined();
    expect(generationConfig(false).maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
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

/**
 * "Is the model actually answering?" — asked once, answered the same way
 * everywhere.
 *
 * The app degrades rather than fails: when Gemini cannot be reached, every
 * assessment falls back to keyword-matched text that looks like a working
 * product. That is the right behaviour for the person in front of it and the
 * worst possible behaviour for whoever runs it, because a missing key, an
 * expired key, an exhausted quota and a retired model all present as "the app
 * is up and the answers have gone vague".
 *
 * So the question gets a real answer, from a real request. "The key is set" and
 * "the key works" are different facts and only the second one matters. The
 * probe asks for a single token, so it costs effectively nothing, and it never
 * returns the key or any part of it.
 */

// Holds the API key, so it must never be reachable from a client component.
import "server-only";

import { THINKING_BUDGET, describeEmptyResponse, getApiKey, getModels } from "./gemini";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface ModelHealth {
  ok: boolean;
  model: string;
  /** Absent when ok. Otherwise names what an operator has to fix. */
  reason?: "no_api_key" | "rejected" | "quota" | "upstream_error" | "empty_response" | "unreachable";
  /** Google's own message, which names the cause. About this deployment's
      configuration, never about any user, so it is safe to show an admin. */
  detail?: string;
  status?: number;
  latencyMs: number;
}

export async function checkModelHealth(timeoutMs = 15_000): Promise<ModelHealth> {
  const model = getModels()[0];
  const apiKey = getApiKey();
  const started = Date.now();

  if (!apiKey) {
    return {
      ok: false,
      model,
      reason: "no_api_key",
      detail: process.env.GEMINI_API_KEY
        ? "GEMINI_API_KEY is set but empty once whitespace and quotes are stripped."
        : "GEMINI_API_KEY is not set.",
      latencyMs: 0,
    };
  }

  try {
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: {
          maxOutputTokens: 8,
          thinkingConfig: { thinkingBudget: THINKING_BUDGET },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Date.now() - started;

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        model,
        reason:
          response.status === 429
            ? "quota"
            : response.status >= 400 && response.status < 500
              ? "rejected"
              : "upstream_error",
        status: response.status,
        detail: body.slice(0, 500),
        latencyMs,
      };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text === "string" && text.length > 0) {
      return { ok: true, model, latencyMs };
    }

    return {
      ok: false,
      model,
      reason: "empty_response",
      detail: describeEmptyResponse(data),
      latencyMs,
    };
  } catch (error) {
    return {
      ok: false,
      model,
      reason: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - started,
    };
  }
}

/** What to do about it, in a sentence, for the admin overview. */
export const HEALTH_REMEDY: Record<NonNullable<ModelHealth["reason"]>, string> = {
  no_api_key:
    "Set GEMINI_API_KEY in the deployment environment and redeploy. Until then every assessment is keyword-matched text.",
  rejected:
    "Google refused the request. Usually an expired or revoked key, or a model name that has been retired — GEMINI_MODELS overrides the model list without a deploy.",
  quota:
    "The key is over its quota. Raise the limit in Google AI Studio, or wait for the window to reset.",
  upstream_error: "Google is having trouble. Requests already retry; this should clear on its own.",
  empty_response:
    "The model answered with no text. The detail names the finish reason and the token counts.",
  unreachable:
    "The request did not complete. Check outbound network access from the deployment.",
};

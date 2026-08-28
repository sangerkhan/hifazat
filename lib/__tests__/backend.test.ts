import { describe, expect, it } from "vitest";
import {
  getReferenceData,
  scopeIndicators,
  scopeLaw,
  scopeResources,
} from "../db/reference";
import { computeCacheKey, isCacheable } from "../db/assessment-cache";
import { buildSystemPrompt } from "../system-prompt";
import { isDatabaseConfigured } from "../db/client";
import type { Answers } from "../guided-flow";

const ref = await getReferenceData();

describe("fallback behaviour", () => {
  // The property that makes the cutover safe: with no database configured the
  // app is fully functional on the bundled datasets.
  it("serves bundled data when Supabase is not configured", () => {
    expect(isDatabaseConfigured()).toBe(false);
    expect(ref.usedFallback).toBe(true);
  });

  it("still loads the whole corpus from the fallback", () => {
    expect(ref.legalInstruments.length).toBeGreaterThan(20);
    expect(ref.resources.length).toBeGreaterThan(30);
    expect(ref.indicators.length).toBe(41);
  });

  it("maps every indicator onto at least one case category", () => {
    expect(ref.indicators.every((i) => i.caseCategories.length > 0)).toBe(true);
  });
});

describe("scoping", () => {
  it("excludes other provinces' domestic violence acts", () => {
    const ids = scopeLaw(ref, { province: "sindh", categories: ["domestic"] }).map((l) => l.id);
    expect(ids).toContain("dv_sindh_2013");
    expect(ids).not.toContain("dv_punjab_2016");
    expect(ids).not.toContain("dv_kp_2021");
  });

  it("excludes women-only statutes for a male complainant", () => {
    const ids = scopeLaw(ref, { province: "punjab", gender: "man" }).map((l) => l.id);
    expect(ids).not.toContain("ppc_354");
    expect(ids).toContain("ppc_hurt");
  });

  it("never returns an unconfirmed resource", () => {
    const all = scopeResources(ref, {});
    expect(all.every((r) => r.verification === "confirmed")).toBe(true);
  });

  it("keeps the Punjab helpline out of other provinces", () => {
    expect(scopeResources(ref, { province: "sindh" }).map((r) => r.id)).not.toContain("pcsw_1043");
    expect(scopeResources(ref, { province: "punjab" }).map((r) => r.id)).toContain("pcsw_1043");
  });

  // The change that most reduces prompt size.
  it("narrows indicators to the categories in play", () => {
    const cyber = scopeIndicators(ref, ["cyber"]);
    expect(cyber.length).toBeGreaterThan(0);
    expect(cyber.length).toBeLessThan(ref.indicators.length);
    expect(cyber.every((i) => i.caseCategories.includes("cyber"))).toBe(true);
  });

  it("returns the full indicator set when nothing is known", () => {
    expect(scopeIndicators(ref, undefined)).toHaveLength(ref.indicators.length);
    expect(scopeIndicators(ref, [])).toHaveLength(ref.indicators.length);
  });

  it("degrades to the full set rather than nothing for an odd combination", () => {
    expect(scopeIndicators(ref, ["other" as never]).length).toBeGreaterThan(0);
  });
});

describe("prompt size", () => {
  const scopedFor = (
    province: "punjab" | "sindh" | "ict",
    gender: "woman" | "man",
    categories: ("cyber" | "domestic" | "physical" | "workplace" | "sexual")[],
  ) => {
    const scope = { province, gender, categories } as never;
    return buildSystemPrompt("en", { province, gender, categories } as never, {
      law: scopeLaw(ref, scope),
      resources: scopeResources(ref, scope),
      indicators: scopeIndicators(ref, categories as never),
    });
  };

  it("is materially smaller for a scoped case than an unscoped one", () => {
    const unscoped = buildSystemPrompt("en", {}, {
      law: scopeLaw(ref, {}),
      resources: scopeResources(ref, {}),
      indicators: scopeIndicators(ref, undefined),
    });
    const cyber = scopedFor("sindh", "woman", ["cyber"]);

    expect(cyber.length).toBeLessThan(unscoped.length * 0.6);
  });

  it("does not leak another province's statute into the prompt", () => {
    expect(scopedFor("sindh", "woman", ["domestic"])).not.toContain("Punjab Protection of Women");
  });

  it("does not leak an unverified helpline into the prompt", () => {
    // 0800-00123 is the AGHS number inherited from the prototype with no
    // traceable source. It must never reach the model.
    expect(scopedFor("punjab", "woman", ["domestic"])).not.toContain("0800-00123");
  });

  it("includes the province's own helpline where one is verified", () => {
    expect(scopedFor("punjab", "woman", ["domestic"])).toContain("1043");
  });
});

describe("cache key", () => {
  const answers: Answers = {
    gender: ["gender_woman"],
    province: ["province_punjab"],
    whatHappened: ["act_hit", "act_verbal"],
  };

  it("is stable across the order options were tapped", () => {
    const reordered: Answers = {
      province: ["province_punjab"],
      whatHappened: ["act_verbal", "act_hit"],
      gender: ["gender_woman"],
    };
    expect(computeCacheKey(answers, "en")).toBe(computeCacheKey(reordered, "en"));
  });

  it("separates locales, since the guidance is written in that language", () => {
    expect(computeCacheKey(answers, "en")).not.toBe(computeCacheKey(answers, "ur"));
  });

  it("changes when an answer changes", () => {
    const different = { ...answers, province: ["province_sindh"] };
    expect(computeCacheKey(answers, "en")).not.toBe(computeCacheKey(different, "en"));
  });

  it("can be invalidated wholesale by bumping the version", () => {
    expect(computeCacheKey(answers, "en", "v1")).not.toBe(computeCacheKey(answers, "en", "v2"));
  });

  it("is a sha256 hex digest", () => {
    expect(computeCacheKey(answers, "en")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("cacheability", () => {
  const answers: Answers = {
    gender: ["gender_woman"],
    province: ["province_punjab"],
    whatHappened: ["act_hit"],
  };

  it("caches a purely structured situation", () => {
    expect(isCacheable(answers, "")).toBe(true);
  });

  // Someone's own words make the situation theirs alone. Serving it to another
  // person, or storing it, would be both wrong and a privacy problem.
  it("never caches when the person wrote their own account", () => {
    expect(isCacheable(answers, "He took my phone and locked the door.")).toBe(false);
    expect(isCacheable(answers, "   x   ")).toBe(false);
  });

  it("does not cache an almost-empty flow", () => {
    expect(isCacheable({ gender: ["gender_woman"] }, "")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildNarrative,
  deriveCaseContext,
  getStepOptions,
  getVisibleSteps,
  isUrgent,
  nextStepIndex,
  pruneAnswers,
  reconcileIndex,
  stepIndexById,
  FLOW_STEPS,
  type Answers,
} from "../guided-flow";
import { getApplicableLaw, getDomesticViolenceAct } from "../provinces";
import { getResources } from "../resources";
import {
  normalisePakistaniPhone,
  routeToCategory,
  validateReferral,
  generateReference,
} from "../referral";

/** Options offered for a step, given the answers so far. */
function optionsFor(stepId: string, answers: Answers): string[] {
  const step = getVisibleSteps(answers).find((s) => s.id === stepId);
  if (!step) return [];
  return getStepOptions(step, answers).map((o) => o.id);
}

function visibleIds(answers: Answers): string[] {
  return getVisibleSteps(answers).map((s) => s.id);
}

describe("conditional branching", () => {
  it("offers khula while the marriage subsists", () => {
    const answers: Answers = {
      who: ["rel_spouse"],
      maritalStatus: ["marital_married"],
      children: ["children_no"],
    };
    expect(optionsFor("intent", answers)).toContain("intent_khula");
  });

  it("still offers khula when separated but not divorced", () => {
    const answers: Answers = {
      who: ["rel_spouse"],
      maritalStatus: ["marital_separated"],
    };
    expect(optionsFor("intent", answers)).toContain("intent_khula");
  });

  // The headline bug: the old flow bucketed "Ex-partner" with spouses and then
  // offered khula and "stay but need protection" to someone already divorced.
  it("does not offer khula to a divorced person", () => {
    const answers: Answers = {
      who: ["rel_ex_spouse"],
      maritalStatus: ["marital_divorced"],
    };
    const intents = optionsFor("intent", answers);
    expect(intents).not.toContain("intent_khula");
    expect(intents).not.toContain("intent_stay_safely");
    expect(intents).toContain("intent_stop_contact");
  });

  it("does not offer khula to someone who was never married", () => {
    const answers: Answers = {
      who: ["rel_ex_partner"],
      maritalStatus: ["marital_never_married"],
    };
    expect(optionsFor("intent", answers)).not.toContain("intent_khula");
  });

  it("asks about marriage status only for a partner or spouse", () => {
    expect(visibleIds({ who: ["rel_spouse"] })).toContain("maritalStatus");
    expect(visibleIds({ who: ["rel_employer"] })).not.toContain("maritalStatus");
    expect(visibleIds({ who: ["rel_parent"] })).not.toContain("maritalStatus");
  });

  it("asks child ages only when a custody-related goal was chosen", () => {
    const base: Answers = {
      who: ["rel_spouse"],
      maritalStatus: ["marital_married"],
      children: ["children_yes"],
    };
    expect(visibleIds(base)).not.toContain("childAges");
    expect(visibleIds({ ...base, intent: ["intent_custody"] })).toContain("childAges");
  });

  it("surfaces workplace-specific acts only at work", () => {
    expect(optionsFor("whatHappened", { who: ["rel_employer"] })).toContain(
      "act_quid_pro_quo",
    );
    expect(optionsFor("whatHappened", { who: ["rel_spouse"] })).not.toContain(
      "act_quid_pro_quo",
    );
  });

  it("surfaces dowry and inheritance acts only in domestic settings", () => {
    expect(optionsFor("whatHappened", { who: ["rel_spouse"] })).toContain("act_dowry");
    expect(optionsFor("whatHappened", { who: ["rel_stranger"] })).not.toContain("act_dowry");
  });

  it("keeps 'something else' last however many contextual acts are added", () => {
    const acts = optionsFor("whatHappened", { who: ["rel_spouse"], where: ["where_online"] });
    expect(acts[acts.length - 1]).toBe("act_other");
  });
});

describe("answer pruning", () => {
  // The old flow only cleared conditional fields on one specific transition,
  // so a khula goal could survive a change of perpetrator and travel to the
  // model as though the person had asked for it.
  it("drops spousal answers when the perpetrator changes to a colleague", () => {
    const before: Answers = {
      who: ["rel_spouse"],
      maritalStatus: ["marital_married"],
      children: ["children_yes"],
      intent: ["intent_khula"],
    };
    const after = pruneAnswers({ ...before, who: ["rel_employer"] });

    expect(after.maritalStatus).toBeUndefined();
    expect(after.children).toBeUndefined();
    expect(after.intent).toBeUndefined();
  });

  it("drops a khula goal when the marriage status changes to divorced", () => {
    const before: Answers = {
      who: ["rel_spouse"],
      maritalStatus: ["marital_married"],
      intent: ["intent_khula", "intent_protection"],
    };
    const after = pruneAnswers({ ...before, maritalStatus: ["marital_divorced"] });

    expect(after.intent).not.toContain("intent_khula");
    expect(after.intent).toContain("intent_protection");
  });

  it("cascades through more than one level of dependency", () => {
    const before: Answers = {
      who: ["rel_spouse"],
      maritalStatus: ["marital_married"],
      children: ["children_yes"],
      intent: ["intent_custody"],
      childAges: ["kids_2_6"],
    };
    // Removing the relationship should remove marital status, children, the
    // goal, and the child ages that depended on the goal.
    const after = pruneAnswers({ ...before, who: ["rel_stranger"] });

    expect(after.childAges).toBeUndefined();
    expect(after.children).toBeUndefined();
    expect(after.maritalStatus).toBeUndefined();
  });

  it("leaves a valid answer set untouched", () => {
    const answers: Answers = {
      gender: ["gender_woman"],
      province: ["province_punjab"],
      who: ["rel_spouse"],
      maritalStatus: ["marital_married"],
    };
    expect(pruneAnswers(answers)).toEqual(answers);
  });
});

describe("navigation", () => {
  it("lands on a newly unlocked conditional step", () => {
    const answers: Answers = { who: ["rel_spouse"] };
    const steps = getVisibleSteps(answers);
    const next = nextStepIndex(steps, "who");
    expect(steps[next].id).toBe("maritalStatus");
  });

  it("skips a step that is not applicable", () => {
    const answers: Answers = { who: ["rel_stranger"] };
    const steps = getVisibleSteps(answers);
    const next = nextStepIndex(steps, "who");
    expect(steps[next].id).toBe("intent");
  });

  // Previously the page tracked a bare index, so editing an earlier answer that
  // removed later questions left the index pointing past the end of the list.
  it("clamps into range when the current step disappears", () => {
    const steps = getVisibleSteps({ who: ["rel_stranger"] });
    expect(reconcileIndex(steps, "maritalStatus", 99)).toBe(steps.length - 1);
    expect(reconcileIndex(steps, "maritalStatus", 3)).toBe(3);
  });

  it("holds position by step ID when the list length changes", () => {
    const shortFlow = getVisibleSteps({ who: ["rel_stranger"] });
    const longFlow = getVisibleSteps({ who: ["rel_spouse"], children: ["children_yes"] });
    const index = reconcileIndex(longFlow, "whatHappened", 0);
    expect(longFlow[index].id).toBe("whatHappened");
    expect(index).not.toBe(stepIndexById(shortFlow, "whatHappened"));
  });

  it("never advances past the last step", () => {
    const steps = getVisibleSteps({});
    expect(nextStepIndex(steps, "review")).toBe(steps.length - 1);
  });

  it("ends on the review step", () => {
    expect(FLOW_STEPS[FLOW_STEPS.length - 1].id).toBe("review");
  });
});

describe("urgency", () => {
  it("flags an immediate danger answer", () => {
    expect(isUrgent({ safety: ["safety_danger_now"] })).toBe(true);
  });

  it("flags a life-threatening act", () => {
    expect(isUrgent({ who: ["rel_spouse"], whatHappened: ["act_threat_kill"] })).toBe(true);
  });

  it("does not flag an ordinary case", () => {
    expect(isUrgent({ safety: ["safety_safe"], whatHappened: ["act_verbal"] })).toBe(false);
  });
});

describe("narrative", () => {
  const answers: Answers = {
    safety: ["safety_afraid"],
    gender: ["gender_woman"],
    province: ["province_sindh"],
    where: ["where_home"],
    who: ["rel_spouse"],
    maritalStatus: ["marital_married"],
    children: ["children_yes"],
    intent: ["intent_khula", "intent_custody"],
    childAges: ["kids_2_6"],
    whatHappened: ["act_hit", "act_dowry"],
    recency: ["when_today"],
    evidence: ["ev_nikahnama"],
  };

  it("is composed in English whatever the interface language", () => {
    const narrative = buildNarrative(answers, "");
    expect(narrative).toContain("I am a woman");
    expect(narrative).toContain("Sindh");
    expect(narrative).toContain("dissolve the marriage through khula");
    // No Urdu should leak into the model input.
    expect(narrative).not.toMatch(/[؀-ۿ]/);
  });

  it("includes the free-text addition", () => {
    expect(buildNarrative(answers, "He took my phone.")).toContain("He took my phone.");
  });

  it("reports the absence of children explicitly", () => {
    const narrative = buildNarrative({ who: ["rel_spouse"], children: ["children_no"] }, "");
    expect(narrative).toContain("no children");
  });

  it("produces nothing from an empty flow rather than throwing", () => {
    expect(buildNarrative({}, "")).toBe("");
  });
});

describe("case context", () => {
  it("derives province, gender and categories", () => {
    const ctx = deriveCaseContext({
      gender: ["gender_woman"],
      province: ["province_punjab"],
      who: ["rel_spouse"],
      whatHappened: ["act_hit"],
    });

    expect(ctx.gender).toBe("woman");
    expect(ctx.province).toBe("punjab");
    expect(ctx.relationship).toBe("spousal");
    expect(ctx.categories).toContain("physical");
    expect(ctx.categories).toContain("domestic");
  });

  it("leaves province undefined when withheld", () => {
    expect(deriveCaseContext({ province: ["province_undisclosed"] }).province).toBeUndefined();
  });

  it("detects that the person only wants information", () => {
    const ctx = deriveCaseContext({ who: ["rel_stranger"], intent: ["intent_understand"] });
    expect(ctx.informationOnly).toBe(true);
  });
});

describe("jurisdiction scoping", () => {
  // Domestic violence is devolved. The app previously treated the 2012 Act as
  // national, which would have sent a woman in Peshawar to a law that does not
  // operate where she lives.
  it("gives each province its own domestic violence act", () => {
    expect(getDomesticViolenceAct("punjab")?.id).toBe("dv_punjab_2016");
    expect(getDomesticViolenceAct("sindh")?.id).toBe("dv_sindh_2013");
    expect(getDomesticViolenceAct("kp")?.id).toBe("dv_kp_2021");
    expect(getDomesticViolenceAct("balochistan")?.id).toBe("dv_balochistan_2014");
    expect(getDomesticViolenceAct("ict")?.id).toBe("dv_ict_2012");
  });

  it("never cites another province's statute", () => {
    const sindhLaw = getApplicableLaw({ province: "sindh", categories: ["domestic"] });
    const ids = sindhLaw.map((l) => l.id);
    expect(ids).toContain("dv_sindh_2013");
    expect(ids).not.toContain("dv_punjab_2016");
    expect(ids).not.toContain("dv_ict_2012");
  });

  it("omits provincial statutes entirely when the province is unknown", () => {
    const law = getApplicableLaw({ categories: ["domestic"] });
    expect(law.every((l) => l.jurisdiction === "federal")).toBe(true);
  });

  it("does not cite women-only statutes for a male complainant", () => {
    const ids = getApplicableLaw({ province: "punjab", gender: "man" }).map((l) => l.id);
    expect(ids).not.toContain("dv_punjab_2016");
    expect(ids).not.toContain("ppc_354");
    expect(ids).toContain("ppc_hurt");
  });

  it("includes the Transgender Persons Act for a transgender complainant", () => {
    const ids = getApplicableLaw({ gender: "transgender" }).map((l) => l.id);
    expect(ids).toContain("transgender_2018");
  });

  it("excludes unconfirmed instruments by default", () => {
    expect(getApplicableLaw({}).every((l) => l.confidence === "confirmed")).toBe(true);
  });
});

describe("resource scoping", () => {
  it("does not offer the Punjab helpline outside Punjab", () => {
    const sindh = getResources({ province: "sindh" }).map((r) => r.id);
    expect(sindh).not.toContain("pcsw_1043");
    expect(getResources({ province: "punjab" }).map((r) => r.id)).toContain("pcsw_1043");
  });

  it("always includes national coverage, even in thinly served provinces", () => {
    for (const province of ["balochistan", "gb", "ajk"] as const) {
      const ids = getResources({ province }).map((r) => r.id);
      expect(ids).toContain("police_15");
      expect(ids).toContain("mohr_1099");
    }
  });

  it("returns something for every province", () => {
    for (const province of [
      "punjab",
      "sindh",
      "kp",
      "balochistan",
      "ict",
      "gb",
      "ajk",
    ] as const) {
      expect(getResources({ province }).length).toBeGreaterThan(0);
    }
  });

  // The guarantee that matters most: the model can never be handed a number we
  // have not stood behind.
  it("never exposes an unverified resource by default", () => {
    expect(getResources({}).every((r) => r.verification === "confirmed")).toBe(true);
  });

  it("filters to services that serve the person's gender", () => {
    const forMen = getResources({ gender: "man" });
    expect(forMen.every((r) => r.serves === "any" || r.serves.includes("man"))).toBe(true);
  });
});

describe("referral routing", () => {
  it("routes workplace harassment to the harassment desk", () => {
    expect(routeToCategory({ relationship: "workplace", categories: ["workplace"] })).toBe(
      "workplace_harassment",
    );
  });

  it("routes online blackmail to the cyber desk", () => {
    expect(routeToCategory({ relationship: "online", categories: ["cyber"] })).toBe(
      "cyber_harassment",
    );
  });

  it("routes a beating by a husband to the domestic violence desk", () => {
    expect(
      routeToCategory({ relationship: "spousal", categories: ["domestic", "physical"] }),
    ).toBe("domestic_violence");
  });

  it("routes a khula-only case to the family desk", () => {
    expect(
      routeToCategory({ relationship: "spousal", categories: ["domestic", "family_law"] }),
    ).toBe("family_matrimonial");
  });

  it("routes sexual violence to the criminal desk", () => {
    expect(routeToCategory({ categories: ["sexual"] })).toBe("criminal_violence");
  });

  it("falls back to triage when nothing is known", () => {
    expect(routeToCategory(undefined)).toBe("general");
  });
});

describe("referral validation", () => {
  it.each([
    ["03001234567", "+923001234567"],
    ["0300 1234567", "+923001234567"],
    ["+92 300 1234567", "+923001234567"],
    ["0092-300-1234567", "+923001234567"],
    ["042-35300551", "+924235300551"],
  ])("normalises %s", (input, expected) => {
    expect(normalisePakistaniPhone(input)).toBe(expected);
  });

  it.each(["12345", "", "abcdefghij", "+1 415 555 0100"])(
    "rejects %s",
    (input) => {
      expect(normalisePakistaniPhone(input)).toBeNull();
    },
  );

  it("requires consent before a case can be passed on", () => {
    const result = validateReferral({
      name: "A",
      phone: "03001234567",
      consent: false,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("consent_required");
  });

  it("requires a name and a number", () => {
    expect(validateReferral({ consent: true }).error).toBe("missing_fields");
  });

  it("accepts a complete submission", () => {
    const result = validateReferral({
      name: "Ayesha",
      phone: "0300 1234567",
      consent: true,
    });
    expect(result.ok).toBe(true);
    expect(result.normalisedPhone).toBe("+923001234567");
  });
});

describe("reference codes", () => {
  it("is dated and shaped for reading over the phone", () => {
    expect(generateReference(new Date("2026-08-28T00:00:00Z"))).toMatch(
      /^HFZ-260828-[0-9A-Z]{4}$/,
    );
  });

  it("omits letters that are ambiguous when spoken", () => {
    const codes = Array.from({ length: 200 }, () => generateReference().split("-")[2]).join("");
    expect(codes).not.toMatch(/[ILOU]/);
  });

  it("does not collide across a realistic batch", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateReference()));
    expect(codes.size).toBeGreaterThan(990);
  });
});

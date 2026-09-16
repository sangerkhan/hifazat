import { describe, expect, it } from "vitest";
import { MAX_ACTIONS, MAX_RESOURCES, normaliseAssessment } from "../assessment-shape";

/**
 * The result screen numbers the steps and fills only the first resource's call
 * button. These tests exist because nothing used to make either claim true: the
 * arrays arrived in whatever order they were written, so the same situation
 * could come back with the court filing as step 1, and the number beside it
 * implied a sequence nobody had chosen.
 */

const DIRECTORY = [
  { name: "Police Emergency" },
  { name: "Madadgaar National Helpline" },
  { name: "Punjab Women's Helpline (1043)" },
  { name: "Digital Rights Foundation" },
];

const base = {
  is_urgent: false,
  validation: "...",
  severity: "serious",
  severity_explanation: "...",
  classifications: [],
  actions: [],
  resources: [],
};

describe("action ordering", () => {
  it("runs immediate steps before short term, and short term before longer term", () => {
    const { actions } = normaliseAssessment({
      ...base,
      actions: [
        { step: "File in the family court", details: "", priority: "longer_term" },
        { step: "Collect your nikah nama", details: "", priority: "short_term" },
        { step: "Call 15", details: "", priority: "immediate" },
      ],
    });

    expect(actions.map((a) => a.priority)).toEqual([
      "immediate",
      "short_term",
      "longer_term",
    ]);
  });

  it("keeps the model's own order within a band", () => {
    // Inside one priority the sequence is a judgement about this person's
    // situation, and we have no better one to substitute.
    const { actions } = normaliseAssessment({
      ...base,
      actions: [
        { step: "first", details: "", priority: "immediate" },
        { step: "second", details: "", priority: "immediate" },
        { step: "third", details: "", priority: "immediate" },
      ],
    });

    expect(actions.map((a) => a.step)).toEqual(["first", "second", "third"]);
  });

  it("is the same on every run, for the same answer", () => {
    const input = {
      ...base,
      actions: [
        { step: "c", details: "", priority: "longer_term" },
        { step: "a", details: "", priority: "immediate" },
        { step: "b", details: "", priority: "short_term" },
      ],
    };

    const once = normaliseAssessment(input).actions.map((a) => a.step);
    const twice = normaliseAssessment(input).actions.map((a) => a.step);
    expect(once).toEqual(twice);
    expect(once).toEqual(["a", "b", "c"]);
  });

  it("does not bury a step whose priority we failed to anticipate", () => {
    const { actions } = normaliseAssessment({
      ...base,
      actions: [
        { step: "unknown priority", details: "", priority: "urgent_now" },
        { step: "later", details: "", priority: "longer_term" },
      ],
    });

    expect(actions[0].step).toBe("unknown priority");
  });

  it("caps the list, because nine steps is not nine times the help", () => {
    const { actions } = normaliseAssessment({
      ...base,
      actions: Array.from({ length: 12 }, (_, i) => ({
        step: `step ${i}`,
        details: "",
        priority: "immediate",
      })),
    });

    expect(actions).toHaveLength(MAX_ACTIONS);
  });

  it("survives a missing or malformed actions array rather than throwing", () => {
    expect(normaliseAssessment({ ...base, actions: undefined }).actions).toEqual([]);
    expect(normaliseAssessment({ ...base, actions: "nope" }).actions).toEqual([]);
    expect(
      normaliseAssessment({ ...base, actions: [null, { step: "kept", details: "", priority: "immediate" }] })
        .actions,
    ).toHaveLength(1);
  });
});

describe("resource ordering", () => {
  it("leads with whatever the button above the list dials", () => {
    // The button and the first entry naming different organisations is the
    // version of this bug someone acts on.
    const { resources } = normaliseAssessment(
      {
        ...base,
        resources: [
          { name: "Police Emergency", phone: "15", why: "" },
          { name: "Digital Rights Foundation", phone: "0308-6544264", why: "" },
        ],
        primary_action: {
          type: "call",
          label: "Call Digital Rights Foundation (0308-6544264)",
          value: "0308-6544264",
        },
      },
      DIRECTORY,
    );

    expect(resources[0].name).toBe("Digital Rights Foundation");
  });

  it("matches the lead on the number when the label was abbreviated", () => {
    const { resources } = normaliseAssessment(
      {
        ...base,
        resources: [
          { name: "Police Emergency", phone: "15", why: "" },
          { name: "Punjab Women's Helpline (1043)", phone: "1043", why: "" },
        ],
        primary_action: { type: "call", label: "Call the women's helpline", value: "1043" },
      },
      DIRECTORY,
    );

    expect(resources[0].phone).toBe("1043");
  });

  it("otherwise follows the directory's own ranking, not the model's", () => {
    const { resources } = normaliseAssessment(
      {
        ...base,
        resources: [
          { name: "Digital Rights Foundation", phone: "0308-6544264", why: "" },
          { name: "Police Emergency", phone: "15", why: "" },
          { name: "Madadgaar National Helpline", phone: "1098", why: "" },
        ],
      },
      DIRECTORY,
    );

    expect(resources.map((r) => r.name)).toEqual([
      "Police Emergency",
      "Madadgaar National Helpline",
      "Digital Rights Foundation",
    ]);
  });

  it("keeps an entry that is not in the directory rather than dropping a number", () => {
    const { resources } = normaliseAssessment(
      {
        ...base,
        resources: [
          { name: "Some Other Organisation", phone: "111", why: "" },
          { name: "Police Emergency", phone: "15", why: "" },
        ],
      },
      DIRECTORY,
    );

    expect(resources.map((r) => r.name)).toEqual([
      "Police Emergency",
      "Some Other Organisation",
    ]);
  });

  it("does not list one helpline twice under two spellings", () => {
    const { resources } = normaliseAssessment(
      {
        ...base,
        resources: [
          { name: "Police Emergency", phone: "15", why: "a" },
          { name: "police emergency ", phone: "15", why: "b" },
        ],
      },
      DIRECTORY,
    );

    expect(resources).toHaveLength(1);
  });

  it("caps the list", () => {
    const { resources } = normaliseAssessment({
      ...base,
      resources: Array.from({ length: 9 }, (_, i) => ({
        name: `Organisation ${i}`,
        phone: `${i}`,
        why: "",
      })),
    });

    expect(resources).toHaveLength(MAX_RESOURCES);
  });
});

describe("classifications", () => {
  it("keeps the primary finding first, because it is the page heading", () => {
    const { classifications } = normaliseAssessment({
      ...base,
      classifications: [
        { indicator_id: "cyber_01", category_name: "Cyber Violence" },
        { indicator_id: "psych_01", category_name: "Psychological Violence" },
      ],
    });

    expect(classifications[0].indicator_id).toBe("cyber_01");
  });

  it("drops a repeat of the same indicator", () => {
    const { classifications } = normaliseAssessment({
      ...base,
      classifications: [
        { indicator_id: "cyber_01" },
        { indicator_id: "CYBER_01" },
        { indicator_id: "psych_01" },
      ],
    });

    expect(classifications).toHaveLength(2);
  });
});

describe("everything else", () => {
  it("passes the rest of the assessment through untouched", () => {
    const result = normaliseAssessment({
      ...base,
      is_urgent: true,
      validation: "what you described is real",
      note: "a note",
      degraded: true,
    });

    expect(result.is_urgent).toBe(true);
    expect(result.validation).toBe("what you described is real");
    expect(result.note).toBe("a note");
    expect(result.degraded).toBe(true);
  });

  it("does not modify the object it was given", () => {
    // The cache stores what the model returned, so ordering must not reach back
    // into it.
    const input = {
      ...base,
      actions: [
        { step: "later", details: "", priority: "longer_term" },
        { step: "now", details: "", priority: "immediate" },
      ],
    };

    normaliseAssessment(input);
    expect(input.actions[0].step).toBe("later");
  });
});

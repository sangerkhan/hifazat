import { describe, expect, it } from "vitest";
import { hasNewInformation, parsePartialAssessment } from "../partial-assessment";

describe("partial assessment parsing", () => {
  it("finds nothing in an empty or opening fragment", () => {
    expect(parsePartialAssessment("")).toEqual({});
    expect(parsePartialAssessment("{")).toEqual({});
    expect(parsePartialAssessment('{ "is_urg')).toEqual({});
  });

  it("reads is_urgent once the value is complete", () => {
    expect(parsePartialAssessment('{"is_urgent": true,').is_urgent).toBe(true);
    expect(parsePartialAssessment('{"is_urgent": false,').is_urgent).toBe(false);
  });

  it("does not guess at a half-written boolean", () => {
    expect(parsePartialAssessment('{"is_urgent": tr').is_urgent).toBeUndefined();
  });

  // The important one. Showing someone half a sentence about the worst thing
  // that has happened to them would be worse than showing them a spinner.
  it("never returns a sentence that is still being written", () => {
    const streaming =
      '{"is_urgent": false, "validation": "What you have described is recognised as';
    expect(parsePartialAssessment(streaming).validation).toBeUndefined();
  });

  it("returns the sentence once its closing quote arrives", () => {
    const complete =
      '{"is_urgent": false, "validation": "What you have described is recognised as physical violence under Pakistani law.", "classifications": [';
    expect(parsePartialAssessment(complete).validation).toBe(
      "What you have described is recognised as physical violence under Pakistani law.",
    );
  });

  it("handles escaped quotes inside the sentence", () => {
    const text =
      '{"validation": "They told you it was a \\"family matter\\". It is not.", "severity"';
    expect(parsePartialAssessment(text).validation).toBe(
      'They told you it was a "family matter". It is not.',
    );
  });

  it("handles escaped newlines without leaking the escape sequence", () => {
    const text = '{"validation": "First line.\\nSecond line, long enough to show.", "x"';
    expect(parsePartialAssessment(text).validation).toContain("\n");
    expect(parsePartialAssessment(text).validation).not.toContain("\\n");
  });

  it("ignores a fragment too short to be worth showing", () => {
    expect(parsePartialAssessment('{"validation": "Hello.", "x"').validation).toBeUndefined();
  });

  it("reads a complete document as well as a partial one", () => {
    const full = JSON.stringify({
      is_urgent: true,
      validation: "This is a complete validation sentence of sufficient length.",
      severity: "critical",
    });
    const parsed = parsePartialAssessment(full);
    expect(parsed.is_urgent).toBe(true);
    expect(parsed.validation).toContain("complete validation sentence");
  });

  it("is not confused by the word appearing inside other prose", () => {
    const text = '{"note": "we set is_urgent when needed", "validation": "x"';
    expect(parsePartialAssessment(text).is_urgent).toBeUndefined();
  });
});

describe("change detection", () => {
  it("reports the first arrival of each field", () => {
    expect(hasNewInformation({}, { is_urgent: false })).toBe(true);
    expect(hasNewInformation({}, { validation: "something long enough here" })).toBe(true);
  });

  it("reports nothing when the partial has not moved on", () => {
    const same = { is_urgent: true, validation: "a sentence long enough to show" };
    expect(hasNewInformation(same, same)).toBe(false);
  });

  it("reports a changed sentence", () => {
    expect(
      hasNewInformation({ validation: "first version of the sentence" }, { validation: "second version of it" }),
    ).toBe(true);
  });
});

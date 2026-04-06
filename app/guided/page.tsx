"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import AssessmentResult, { AssessmentData } from "@/components/AssessmentResult";
import { useLanguage } from "@/lib/language-context";
import { t, tArray, tStep } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Step definition
// ---------------------------------------------------------------------------
interface StepDef {
  id: string;
  question: TranslationKey;
  options?: TranslationKey;
  multiSelect: boolean;
  type: "options" | "text";
}

const SPOUSE_VALUES = ["Husband or partner", "Ex-partner"];
// Urdu equivalents so the conditional works regardless of locale
const SPOUSE_VALUES_UR = ["شوہر یا پارٹنر", "سابق پارٹنر"];

function isSpouse(who: string[] | undefined): boolean {
  if (!who?.length) return false;
  return SPOUSE_VALUES.includes(who[0]) || SPOUSE_VALUES_UR.includes(who[0]);
}

const YES_VALUES = ["Yes", "ہاں"];

function isYes(val: string[] | undefined): boolean {
  if (!val?.length) return false;
  return YES_VALUES.includes(val[0]);
}

// ---------------------------------------------------------------------------
// Compute the dynamic step list based on current answers
// ---------------------------------------------------------------------------
function computeSteps(answers: Record<string, string[]>): StepDef[] {
  const steps: StepDef[] = [
    { id: "gender", question: "guidedGender", options: "guidedGenderOpts", multiSelect: false, type: "options" },
    { id: "province", question: "guidedProvince", options: "guidedProvinceOpts", multiSelect: false, type: "options" },
    { id: "where", question: "guidedQ1", options: "guidedQ1Opts", multiSelect: false, type: "options" },
    { id: "who", question: "guidedQ2", options: "guidedQ2Opts", multiSelect: false, type: "options" },
  ];

  // Conditional spouse/family steps
  if (isSpouse(answers.who)) {
    steps.push({ id: "kidsInvolved", question: "guidedKids", options: "guidedKidsOpts", multiSelect: false, type: "options" });

    if (isYes(answers.kidsInvolved)) {
      steps.push({ id: "kidsCount", question: "guidedKidsCount", options: "guidedKidsCountOpts", multiSelect: false, type: "options" });
    }

    steps.push({ id: "intent", question: "guidedIntent", options: "guidedIntentOpts", multiSelect: true, type: "options" });
  }

  // Always-present remaining steps
  steps.push(
    { id: "whatHappened", question: "guidedQ3", options: "guidedQ3Opts", multiSelect: true, type: "options" },
    { id: "howOften", question: "guidedQ4", options: "guidedQ4Opts", multiSelect: false, type: "options" },
    { id: "additional", question: "guidedQ5", type: "text", multiSelect: false },
  );

  return steps;
}

// ---------------------------------------------------------------------------
// Build the prose description sent to the AI
// ---------------------------------------------------------------------------
function buildDescription(
  answers: Record<string, string[]>,
  additionalText: string
): string {
  const parts: string[] = [];

  if (answers.gender?.length) {
    parts.push(`I am a ${answers.gender[0].toLowerCase()}.`);
  }
  if (answers.province?.length) {
    parts.push(`I am in ${answers.province[0]}.`);
  }
  if (answers.where?.length) {
    parts.push(`This happened ${answers.where[0].toLowerCase()}.`);
  }
  if (answers.who?.length) {
    parts.push(`The person who did this is my ${answers.who[0].toLowerCase()}.`);
  }

  // Conditional spouse fields
  if (answers.kidsInvolved?.length) {
    if (isYes(answers.kidsInvolved)) {
      const count = answers.kidsCount?.[0] || "";
      parts.push(`Children are involved. I have ${count} children.`);
    } else {
      parts.push(`No children are involved.`);
    }
  }
  if (answers.intent?.length) {
    const goals = answers.intent.map((a) => a.toLowerCase()).join(", ");
    parts.push(`My goal: ${goals}.`);
  }

  if (answers.whatHappened?.length) {
    const items = answers.whatHappened.map((a) => a.toLowerCase()).join(", ");
    parts.push(`What happened: ${items}.`);
  }
  if (answers.howOften?.length) {
    parts.push(`${answers.howOften[0]}.`);
  }
  if (additionalText.trim()) {
    parts.push(`Additional context: ${additionalText.trim()}`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GuidedPage() {
  const { locale } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [additionalText, setAdditionalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentData | null>(null);

  const steps = useMemo(() => computeSteps(answers), [answers]);
  const totalSteps = steps.length;
  const currentStepDef = steps[currentStep];
  const isLastStep = currentStepDef?.type === "text";

  const handleSelect = (option: string) => {
    const step = currentStepDef;
    const current = answers[step.id] || [];

    if (step.multiSelect) {
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      setAnswers((prev) => ({ ...prev, [step.id]: updated }));
    } else {
      const newAnswers = { ...answers, [step.id]: [option] };

      // When changing the "who" answer, clear conditional fields if no longer spouse
      if (step.id === "who" && !SPOUSE_VALUES.includes(option) && !SPOUSE_VALUES_UR.includes(option)) {
        delete newAnswers.kidsInvolved;
        delete newAnswers.kidsCount;
        delete newAnswers.intent;
      }

      // When changing kidsInvolved to No, clear kidsCount
      if (step.id === "kidsInvolved" && !YES_VALUES.includes(option)) {
        delete newAnswers.kidsCount;
      }

      setAnswers(newAnswers);
      setTimeout(() => setCurrentStep((s) => s + 1), 200);
    }
  };

  const handleMultiSelectNext = () => {
    const step = currentStepDef;
    if (answers[step.id]?.length > 0) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSubmit = async () => {
    const description = buildDescription(answers, additionalText);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: description, locale }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnswers({});
    setAdditionalText("");
    setCurrentStep(0);
    setError("");
    setLoading(false);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (result) {
    return <AssessmentResult data={result} onReset={handleReset} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex flex-col items-center gap-4 px-5 py-6">
        <Link href="/">
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 px-5 pb-10">
        {/* Back link */}
        {currentStep > 0 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/5 text-base font-semibold text-hifazat-ink mb-4"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="rtl:rotate-180"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t(locale, "goBack")}
          </button>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/5 text-base font-semibold text-hifazat-ink mb-4"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="rtl:rotate-180"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t(locale, "goBack")}
          </Link>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= currentStep ? "bg-hifazat-teal" : "bg-hifazat-border"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-hifazat-muted mb-6">
          {tStep(locale, currentStep + 1, totalSteps)}
        </p>

        {/* Option-based steps */}
        {currentStepDef?.type === "options" && (
          <>
            <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-5">
              {t(locale, currentStepDef.question)}
            </h1>

            <div className="flex flex-col gap-3">
              {tArray(locale, currentStepDef.options!).map((option) => {
                const selected = answers[currentStepDef.id]?.includes(option) || false;
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`w-full text-start px-4 py-3.5 rounded-[16px] text-base border transition-colors ${
                      selected
                        ? "bg-hifazat-teal-light border-hifazat-teal text-hifazat-ink font-medium"
                        : "bg-white border-hifazat-border text-hifazat-ink"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {currentStepDef.multiSelect && (
              <button
                onClick={handleMultiSelectNext}
                disabled={!answers[currentStepDef.id]?.length}
                className="w-full mt-5 h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg disabled:opacity-50"
              >
                {t(locale, "guidedNext")}
              </button>
            )}
          </>
        )}

        {/* Text step (last step) */}
        {isLastStep && (
          <>
            <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-2">
              {t(locale, "guidedQ5")}
            </h1>
            <p className="text-sm text-hifazat-muted mb-5">
              {t(locale, "guidedQ5Sub")}
            </p>

            <textarea
              value={additionalText}
              onChange={(e) => setAdditionalText(e.target.value)}
              placeholder={t(locale, "guidedQ5Placeholder")}
              dir={locale === "ur" ? "rtl" : "ltr"}
              className="w-full min-h-[140px] p-4 text-base text-hifazat-ink bg-white border border-hifazat-border rounded-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60"
              rows={5}
            />

            {error && (
              <p className="text-sm text-hifazat-red mt-3">{error}</p>
            )}

            <div className="flex flex-col gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t(locale, "assessAnalysing")}
                  </>
                ) : (
                  t(locale, "guidedSubmit")
                )}
              </button>
              {!loading && (
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 text-hifazat-muted font-medium text-base"
                >
                  {t(locale, "guidedSkip")}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

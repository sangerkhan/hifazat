"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import AssessmentResult, { AssessmentData } from "@/components/AssessmentResult";
import { useLanguage } from "@/lib/language-context";
import { t, tArray, tStep } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const STEP_KEYS: { question: TranslationKey; options: TranslationKey; multiSelect: boolean }[] = [
  { question: "guidedGender", options: "guidedGenderOpts", multiSelect: false },
  { question: "guidedProvince", options: "guidedProvinceOpts", multiSelect: false },
  { question: "guidedQ1", options: "guidedQ1Opts", multiSelect: false },
  { question: "guidedQ2", options: "guidedQ2Opts", multiSelect: false },
  { question: "guidedQ3", options: "guidedQ3Opts", multiSelect: true },
  { question: "guidedQ4", options: "guidedQ4Opts", multiSelect: false },
];

function buildDescription(
  answers: string[][],
  additionalText: string
): string {
  const parts: string[] = [];

  if (answers[0]?.length) {
    parts.push(`I am a ${answers[0][0].toLowerCase()}.`);
  }
  if (answers[1]?.length) {
    parts.push(`I am in ${answers[1][0]}.`);
  }
  if (answers[2]?.length) {
    parts.push(`This happened ${answers[2][0].toLowerCase()}.`);
  }
  if (answers[3]?.length) {
    parts.push(`The person who did this is my ${answers[3][0].toLowerCase()}.`);
  }
  if (answers[4]?.length) {
    const items = answers[4].map((a) => a.toLowerCase()).join(", ");
    parts.push(`What happened: ${items}.`);
  }
  if (answers[5]?.length) {
    parts.push(`${answers[5][0]}.`);
  }
  if (additionalText.trim()) {
    parts.push(`Additional context: ${additionalText.trim()}`);
  }

  return parts.join(" ");
}

export default function GuidedPage() {
  const { locale } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[][]>([[], [], [], [], [], []]);
  const [additionalText, setAdditionalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentData | null>(null);

  const totalSteps = 7;
  const isLastStep = currentStep === 6;

  const handleSelect = (option: string) => {
    const step = STEP_KEYS[currentStep];
    const current = answers[currentStep] || [];

    if (step.multiSelect) {
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      const newAnswers = [...answers];
      newAnswers[currentStep] = updated;
      setAnswers(newAnswers);
    } else {
      const newAnswers = [...answers];
      newAnswers[currentStep] = [option];
      setAnswers(newAnswers);
      setTimeout(() => setCurrentStep((s) => s + 1), 200);
    }
  };

  const handleMultiSelectNext = () => {
    if (answers[currentStep]?.length > 0) {
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
        body: JSON.stringify({ input: description }),
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
    setAnswers([[], [], [], [], [], []]);
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

        {/* Question Steps 0-5 */}
        {currentStep < 6 && (
          <>
            <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-5">
              {t(locale, STEP_KEYS[currentStep].question)}
            </h1>

            <div className="flex flex-col gap-3">
              {tArray(locale, STEP_KEYS[currentStep].options).map((option) => {
                const selected = answers[currentStep]?.includes(option) || false;
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

            {STEP_KEYS[currentStep].multiSelect && (
              <button
                onClick={handleMultiSelectNext}
                disabled={!answers[currentStep]?.length}
                className="w-full mt-5 h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg disabled:opacity-50"
              >
                {t(locale, "guidedNext")}
              </button>
            )}
          </>
        )}

        {/* Step 7 — Additional text */}
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

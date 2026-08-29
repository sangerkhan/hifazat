"use client";

import { useMemo, useState } from "react";
import AssessmentResult, { AssessmentData } from "@/components/AssessmentResult";
import PageShell from "@/components/ui/PageShell";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ArrowRightIcon, CheckIcon, PhoneIcon } from "@/components/ui/Icon";
import { useLanguage } from "@/lib/language-context";
import { t, tStep } from "@/lib/i18n";
import {
  buildNarrative,
  deriveCaseContext,
  getStepOptions,
  getVisibleSteps,
  isStepAnswered,
  localized,
  nextStepIndex,
  pruneAnswers,
  reconcileIndex,
  stepIndexById,
  summariseAnswers,
  type Answers,
} from "@/lib/guided-flow";

export default function GuidedPage() {
  const { locale } = useLanguage();

  const [answers, setAnswers] = useState<Answers>({});
  const [additionalText, setAdditionalText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDanger, setShowDanger] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentData | null>(null);
  // Arrives seconds before the full assessment, so the person is not looking at
  // a spinner while the law and the action steps are still being written.
  const [preview, setPreview] = useState<{ is_urgent?: boolean; validation?: string }>({});

  const steps = useMemo(() => getVisibleSteps(answers), [answers]);
  const totalSteps = steps.length;
  const step = steps[Math.min(currentIndex, totalSteps - 1)];
  const options = useMemo(
    () => (step ? getStepOptions(step, answers) : []),
    [step, answers],
  );

  const context = useMemo(() => deriveCaseContext(answers), [answers]);
  const narrative = useMemo(
    () => buildNarrative(answers, additionalText),
    [answers, additionalText],
  );

  /**
   * Applies an answer change and repositions. Answers are pruned first, so a
   * change that invalidates later ones (switching the perpetrator from a
   * husband to a colleague) drops the marital status and khula goal rather than
   * carrying them into the narrative. Position is then resolved by step ID, not
   * by index, because the list length may have changed underneath us.
   */
  const applyAnswer = (updated: Answers, advanceFrom?: string) => {
    const pruned = pruneAnswers(updated);
    const nextSteps = getVisibleSteps(pruned);

    setAnswers(pruned);
    setCurrentIndex(
      advanceFrom
        ? nextStepIndex(nextSteps, advanceFrom)
        : reconcileIndex(nextSteps, step?.id, currentIndex),
    );
  };

  const handleSelect = (optionId: string) => {
    if (!step) return;

    if (step.kind === "multi") {
      const current = answers[step.id] ?? [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      const next = { ...answers };
      if (updated.length) next[step.id] = updated;
      else delete next[step.id];

      // Multi-select waits for an explicit Next, so the position is unchanged.
      applyAnswer(next);
      return;
    }

    const next = { ...answers, [step.id]: [optionId] };

    // The safety question is the one place an answer changes the shape of the
    // session rather than just the next question.
    if (step.id === "safety" && optionId === "safety_danger_now") {
      const pruned = pruneAnswers(next);
      setAnswers(pruned);
      setShowDanger(true);
      return;
    }

    applyAnswer(next, step.id);
  };

  const handleNext = () => {
    if (!step) return;
    setCurrentIndex(nextStepIndex(steps, step.id));
  };

  const handleBack = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleEdit = (stepId: string) => {
    const index = stepIndexById(steps, stepId);
    if (index !== -1) setCurrentIndex(index);
  };

  const handleSkip = () => {
    if (!step) return;

    // Skip means skip: clear anything already chosen for this step so a partial
    // selection does not travel to the model as though it were the full answer.
    const next = { ...answers };
    delete next[step.id];
    if (step.kind === "text") setAdditionalText("");

    applyAnswer(next, step.id);
  };

  const submit = async (overrideNarrative?: string) => {
    const body = overrideNarrative ?? narrative;

    setLoading(true);
    setError("");
    setPreview({});

    const payload = {
      input: body || "I need help understanding my rights.",
      locale,
      context,
      // Sent so an identical situation can be served from the reviewed
      // answer cache instead of regenerated. The server derives the key
      // itself; these are never trusted as one.
      answers,
      // Anything the person wrote in their own words makes this situation
      // theirs alone, so it must not be cached or served to anyone else.
      cacheable: !overrideNarrative && additionalText.trim().length === 0,
    };

    const requestWhole = async () => {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
    };

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, stream: true }),
      });

      // A cache hit and the offline fallback both answer as ordinary JSON, so
      // the response type decides how to read it rather than the request.
      if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("event-stream")) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");
        setResult(data);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(7).trim();
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }

          if (event === "partial") {
            setPreview((prev) => ({ ...prev, ...data }));
          } else if (event === "complete") {
            setResult(data as unknown as AssessmentData);
            finished = true;
          } else if (event === "retry") {
            await requestWhole();
            finished = true;
          }
        }
      }

      // The stream ended without an answer — fall back rather than leaving the
      // person on a spinner.
      if (!finished) await requestWhole();
    } catch (err) {
      try {
        await requestWhole();
      } catch {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnswers({});
    setAdditionalText("");
    setCurrentIndex(0);
    setShowDanger(false);
    setError("");
    setLoading(false);
    setPreview({});
  };

  // While the assessment is being written, show what is already known. The
  // safety verdict and the opening sentence arrive seconds ahead of the law and
  // the action steps, and for someone in danger those seconds are the ones that
  // matter.
  if (loading && (preview.validation || preview.is_urgent)) {
    return (
      <PageShell width="form">
        <main className="flex-1 px-5 pb-10 flex flex-col gap-5">
          {preview.is_urgent && (
            <Card tone="danger" elevation="soft" className="border-2 p-5 text-center flex flex-col gap-4">
              <p className="font-heading font-serif text-xl text-hifazat-ink">
                {t(locale, "resultUrgent")}
              </p>
              <div className="flex flex-col gap-3">
                <Button href="tel:15" variant="danger" icon={<PhoneIcon size={18} />}>
                  {t(locale, "resultCallPolice")}
                </Button>
                <Button href="tel:1099" variant="danger" icon={<PhoneIcon size={18} />}>
                  {t(locale, "resultCallHR")}
                </Button>
              </div>
            </Card>
          )}

          {preview.validation && (
            <p className="text-base text-hifazat-ink leading-relaxed">
              {preview.validation}
            </p>
          )}

          <div className="flex items-center gap-3 text-hifazat-muted">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-base">{t(locale, "guidedStillWorking")}</span>
          </div>
        </main>
      </PageShell>
    );
  }

  if (result) {
    return (
      <AssessmentResult
        data={result}
        onReset={handleReset}
        referralContext={context}
        referralNarrative={narrative}
      />
    );
  }

  // --- Danger interstitial -------------------------------------------------
  // Someone in immediate danger should not have to answer a dozen questions to
  // reach a phone number. This shows the emergency lines straight away and lets
  // them skip the rest of the flow entirely.
  if (showDanger) {
    return (
      <PageShell width="form">
        <main className="flex-1 px-5 pb-10 flex flex-col gap-6">
          <Card tone="danger" elevation="soft" className="border-2 p-6 flex flex-col gap-4">
            <h1 className="font-heading font-serif text-2xl text-hifazat-ink">
              {t(locale, "dangerTitle")}
            </h1>
            <p className="text-base text-hifazat-ink leading-relaxed">
              {t(locale, "dangerBody")}
            </p>
            <div className="flex flex-col gap-3">
              <Button href="tel:15" variant="danger" size="lg" icon={<PhoneIcon size={20} />}>
                {t(locale, "resultCallPolice")}
              </Button>
              <Button href="tel:1099" variant="danger" size="lg" icon={<PhoneIcon size={20} />}>
                {t(locale, "resultCallHR")}
              </Button>
            </div>
          </Card>

          {error && <p className="text-base text-hifazat-red">{error}</p>}

          <div className="flex flex-col gap-3">
            <Button onClick={() => submit()} disabled={loading} size="lg">
              {loading ? t(locale, "assessAnalysing") : t(locale, "dangerExpress")}
            </Button>
            <Button
              onClick={() => {
                setShowDanger(false);
                setCurrentIndex(nextStepIndex(steps, "safety"));
              }}
              disabled={loading}
              variant="ghost"
            >
              {t(locale, "dangerContinue")}
            </Button>
          </div>
        </main>
      </PageShell>
    );
  }

  if (!step) return null;

  const answered = isStepAnswered(step, answers);
  const summary = summariseAnswers(answers, additionalText, locale);

  // Single-select steps advance as soon as an option is tapped, so they have no
  // button and should not pay for a docked bar. Everything else does.
  const hasPrimaryAction =
    step.kind === "review" || step.kind === "multi" || step.kind === "text";
  const hasSkip = Boolean(step.optional) && step.kind !== "review";
  const showActionBar = hasPrimaryAction || hasSkip;

  return (
    <PageShell width="form">

      <main className={`flex-1 px-5 ${showActionBar ? "pb-44" : "pb-10"}`}>
        {/* Back */}
        <div className="mb-4">
          {currentIndex > 0 ? (
            <BackButton onClick={handleBack} />
          ) : (
            <BackButton href="/" />
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                i <= currentIndex ? "bg-hifazat-teal" : "bg-hifazat-border"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-hifazat-muted mb-6">
          {tStep(locale, currentIndex + 1, totalSteps)}
        </p>

        <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-2">
          {localized(step.question, locale)}
        </h1>
        {step.help && (
          <p className="text-sm text-hifazat-muted mb-5 leading-relaxed">
            {localized(step.help, locale)}
          </p>
        )}

        {/* Option steps */}
        {(step.kind === "single" || step.kind === "multi") && (
          <div className="flex flex-col gap-3 mt-3">
            {options.map((option) => {
              const selected = answers[step.id]?.includes(option.id) ?? false;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  aria-pressed={step.kind === "multi" ? selected : undefined}
                  className={`tappable w-full text-start min-h-[56px] px-4 py-3.5 rounded-[16px] text-base border flex items-center gap-3 ${
                    selected
                      ? "bg-surface-accent border-hifazat-teal text-hifazat-ink font-medium shadow-[var(--shadow-soft)]"
                      : "bg-surface-raised border-hifazat-border/60 text-hifazat-ink shadow-[var(--shadow-soft)]"
                  }`}
                >
                  {/* Multi-select needs a visible state; single-select advances
                      immediately so a checkbox there would only ever flash. */}
                  {step.kind === "multi" && (
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 ${
                        selected
                          ? "bg-hifazat-teal border-hifazat-teal text-white"
                          : "border-hifazat-border"
                      }`}
                    >
                      {selected && <CheckIcon size={14} />}
                    </span>
                  )}
                  <span className="flex-1">{localized(option.label, locale)}</span>
                  {step.kind !== "multi" && (
                    <span className="text-hifazat-muted/50 shrink-0">
                      <ArrowRightIcon size={18} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Free text step */}
        {step.kind === "text" && (
          <textarea
            value={additionalText}
            onChange={(e) => setAdditionalText(e.target.value)}
            placeholder={t(locale, "guidedTextPlaceholder")}
            dir={locale === "ur" ? "rtl" : "ltr"}
            rows={5}
            className="w-full min-h-[140px] p-4 mt-3 text-base text-hifazat-ink bg-white border border-hifazat-border rounded-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60"
          />
        )}

        {/* Review step */}
        {step.kind === "review" && (
          <div className="flex flex-col gap-3 mt-3">
            {summary.length === 0 && (
              <p className="text-base text-hifazat-muted">{t(locale, "guidedNoAnswers")}</p>
            )}
            {summary.map((row) => (
              <button
                key={row.stepId}
                onClick={() => handleEdit(row.stepId)}
                className="tappable w-full text-start bg-surface-raised border border-hifazat-border/60 shadow-[var(--shadow-soft)] rounded-[16px] min-h-[56px] px-4 py-3 flex items-start justify-between gap-3"
              >
                <span className="flex-1">
                  <span className="block text-sm text-hifazat-muted">{row.question}</span>
                  <span className="block text-base text-hifazat-ink font-medium mt-0.5">
                    {row.answer}
                  </span>
                </span>
                <span className="text-sm font-semibold text-hifazat-teal shrink-0 mt-0.5">
                  {t(locale, "guidedEdit")}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-base text-hifazat-red mt-4">{error}</p>}
      </main>

      {/* Docked action bar.
          The review step is a long list, and so are the multi-select steps, so a
          button at the end of the document means scrolling to the bottom before
          you can move on. Fixing it to the viewport keeps it in reach while the
          answers still scroll underneath.

          The gradient is what stops it reading as a cut-off bar: content fades
          into the page background rather than sliding under a hard edge. It is
          pointer-events-none so the faded region still scrolls the content
          beneath it, while the solid strip below blocks taps that would
          otherwise land on options hidden behind the bar. */}
      {showActionBar && (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <div
            aria-hidden
            className="h-20 bg-gradient-to-t from-hifazat-bg to-transparent pointer-events-none"
          />
          <div className="bg-hifazat-bg pb-6">
            <div className="w-full max-w-[600px] mx-auto px-5 flex flex-col gap-3">
          {step.kind === "review" ? (
            <Button
              onClick={() => submit()}
              disabled={loading}
              size="lg"
              icon={
                loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : undefined
              }
            >
              {loading ? t(locale, "assessAnalysing") : t(locale, "guidedReviewSubmit")}
            </Button>
          ) : (
            (step.kind === "multi" || step.kind === "text") && (
              <Button
                onClick={handleNext}
                disabled={step.kind === "multi" && !answered}
                size="lg"
                trailingIcon={<ArrowRightIcon size={20} />}
              >
                {t(locale, "guidedNext")}
              </Button>
            )
          )}

          {step.optional && step.kind !== "review" && (
            <Button onClick={handleSkip} variant="ghost">
              {t(locale, "guidedSkip")}
            </Button>
          )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

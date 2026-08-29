"use client";

import { useState } from "react";
import AssessmentResult, { AssessmentData } from "@/components/AssessmentResult";
import PageShell from "@/components/ui/PageShell";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/Icon";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";

export default function AssessPage() {
  const { locale } = useLanguage();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentData | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), locale }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setInput("");
    setError("");
  };

  if (result) {
    return <AssessmentResult data={result} onReset={handleReset} />;
  }

  return (
    <PageShell width="form">
      <main className="flex-1 px-5 pb-32 flex flex-col gap-4">
        <BackButton href="/" />

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[28px] font-serif text-hifazat-ink leading-tight">
            {t(locale, "assessHeading")}
          </h1>
          <p className="text-base text-hifazat-muted leading-relaxed">
            {t(locale, "assessSubtext")}
          </p>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(locale, "assessPlaceholder")}
          dir={locale === "ur" ? "rtl" : "ltr"}
          className="w-full min-h-[200px] p-4 text-base text-hifazat-ink bg-surface-raised border border-hifazat-border/60 shadow-[var(--shadow-soft)] rounded-[18px] resize-none focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60"
          rows={7}
        />

        {error && <p className="text-base text-hifazat-red">{error}</p>}

        <p className="text-sm text-hifazat-muted text-center">
          {t(locale, "assessPrivacy")}
        </p>
      </main>

      {/* Docked, matching the guided flow: the submit stays in reach while the
          person is still writing rather than sitting below the fold. */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div
          aria-hidden
          className="h-20 bg-gradient-to-t from-hifazat-bg to-transparent pointer-events-none"
        />
        <div className="bg-hifazat-bg pb-6">
          <div className="w-full max-w-[620px] mx-auto px-5">
            <Button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              size="lg"
              trailingIcon={loading ? undefined : <ArrowRightIcon size={20} />}
              icon={
                loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : undefined
              }
            >
              {loading ? t(locale, "assessAnalysing") : t(locale, "assessSubmit")}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

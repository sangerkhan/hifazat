"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import AssessmentResult, { AssessmentData } from "@/components/AssessmentResult";
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
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex flex-col items-center gap-4 px-5 py-6">
        <Link href="/">
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 px-5 pb-10">
        <div className="flex flex-col">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/5 text-base font-semibold text-hifazat-ink mb-6 w-fit"
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

          <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-2">
            {t(locale, "assessHeading")}
          </h1>
          <p className="text-sm text-hifazat-muted mb-6">
            {t(locale, "assessSubtext")}
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(locale, "assessPlaceholder")}
            dir={locale === "ur" ? "rtl" : "ltr"}
            className="w-full min-h-[160px] p-4 text-base text-hifazat-ink bg-white border border-hifazat-border rounded-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60"
            rows={6}
          />

          {error && (
            <p className="text-sm text-hifazat-red mt-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="w-full mt-5 h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
              t(locale, "assessSubmit")
            )}
          </button>

          <p className="text-sm text-hifazat-muted text-center mt-4">
            {t(locale, "assessPrivacy")}
          </p>
        </div>
      </main>
    </div>
  );
}

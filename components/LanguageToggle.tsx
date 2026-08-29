"use client";

import { useLanguage } from "@/lib/language-context";

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ur" : "en")}
      className="tappable inline-flex items-center gap-2.5 min-h-[44px] px-4 rounded-full border border-border/60 bg-surface-raised shadow-[var(--shadow-soft)] text-base font-semibold"
      aria-label={locale === "en" ? "Switch to Urdu" : "Switch to English"}
    >
      <span className={locale === "en" ? "text-primary-strong" : "text-muted-foreground"}>
        Eng
      </span>
      <span className="text-muted-foreground">/</span>
      <span
        className={`font-urdu ${locale === "ur" ? "text-primary-strong" : "text-muted-foreground"}`}
      >
        اردو
      </span>
    </button>
  );
}

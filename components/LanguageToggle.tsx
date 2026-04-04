"use client";

import { useLanguage } from "@/lib/language-context";

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ur" : "en")}
      className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-hifazat-border bg-white text-base font-semibold"
      aria-label={locale === "en" ? "Switch to Urdu" : "Switch to English"}
    >
      <span className={locale === "en" ? "text-hifazat-teal" : "text-hifazat-muted"}>
        Eng
      </span>
      <span className="text-hifazat-muted">/</span>
      <span
        className={`font-urdu ${locale === "ur" ? "text-hifazat-teal" : "text-hifazat-muted"}`}
      >
        اردو
      </span>
    </button>
  );
}

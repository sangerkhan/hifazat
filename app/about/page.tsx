"use client";

import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import { localized } from "@/lib/guided-flow";
import { ABOUT_INTRO, ABOUT_SECTIONS, type SectionTone } from "@/lib/about-content";

const TONE_STYLES: Record<SectionTone, string> = {
  default: "bg-white border-hifazat-border",
  note: "bg-hifazat-amber-light border-hifazat-amber/40",
  warning: "bg-hifazat-red-light border-hifazat-red",
};

export default function AboutPage() {
  const { locale } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[680px] mx-auto">
      <header className="flex flex-col items-center gap-4 px-5 py-6">
        <Link href="/">
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 px-5 pb-10 flex flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-hifazat-muted w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rtl:rotate-180">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t(locale, "goBack")}
        </Link>

        <div className="flex flex-col gap-3">
          <h1 className="font-heading font-serif text-[40px] leading-[1.2] text-hifazat-ink">
            {t(locale, "aboutTitle")}
          </h1>
          <p className="text-base text-hifazat-muted leading-relaxed">
            {localized(ABOUT_INTRO, locale)}
          </p>
        </div>

        {ABOUT_SECTIONS.map((section) => (
          <section
            key={section.id}
            className={`border rounded-[24px] p-6 flex flex-col gap-3 ${
              TONE_STYLES[section.tone ?? "default"]
            }`}
          >
            <h2 className="font-heading font-serif text-2xl leading-snug text-hifazat-ink">
              {localized(section.heading, locale)}
            </h2>

            {section.body.map((paragraph, i) => (
              <p key={i} className="text-base text-hifazat-ink/80 leading-relaxed">
                {localized(paragraph, locale)}
              </p>
            ))}

            {section.bullets && (
              <ul className="flex flex-col gap-2 ps-5 list-disc marker:text-hifazat-teal">
                {section.bullets.map((bullet, i) => (
                  <li key={i} className="text-base text-hifazat-ink/80 leading-relaxed">
                    {localized(bullet, locale)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="text-sm text-hifazat-muted text-center">
          {t(locale, "aboutLastUpdated")}
        </p>

        <Link
          href="/resources"
          className="w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg flex items-center justify-center"
        >
          {t(locale, "aboutSeeResources")}
        </Link>

        <SiteFooter showNav={false} />
      </main>
    </div>
  );
}

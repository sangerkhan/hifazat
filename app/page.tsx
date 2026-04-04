"use client";

import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";

export default function Home() {
  const { locale } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen px-5 py-10">
      {/* Header — centered logo + toggle */}
      <header className="flex flex-col items-center gap-6">
        <Image
          src="/logo.png"
          alt="Hifazat"
          width={180}
          height={40}
          className="h-8 w-auto"
          priority
        />
        <LanguageToggle />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-10">
        <div className="text-center flex flex-col gap-4">
          <h1 className="font-heading text-[40px] font-normal leading-[1.2] text-hifazat-ink font-serif">
            {t(locale, "heroHeadline")}
          </h1>
          <p className="text-base font-medium text-hifazat-muted leading-[1.4]">
            {t(locale, "heroSubtext")}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 w-full">
          <Link
            href="/assess"
            className="flex items-center justify-center w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg"
          >
            {t(locale, "ctaPrimary")}
          </Link>
          <Link
            href="/guided"
            className="flex items-center justify-center w-full h-[52px] bg-white text-hifazat-teal font-semibold rounded-full text-lg border border-hifazat-teal"
          >
            {t(locale, "ctaSecondary")}
          </Link>
        </div>
      </main>

      {/* Emergency Strip */}
      <div className="bg-hifazat-red-light border-2 border-hifazat-red rounded-[32px] p-6 text-center flex flex-col gap-6">
        <p className="font-heading font-serif text-2xl text-hifazat-ink">
          {t(locale, "emergencyLabel")}
        </p>
        <div className="flex flex-col items-center gap-4 text-hifazat-red font-semibold text-lg">
          <a href="tel:15">{t(locale, "callPolice")}</a>
          <a href="tel:1099">{t(locale, "callHumanRights")}</a>
        </div>
      </div>
    </div>
  );
}

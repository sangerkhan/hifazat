"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import { localized } from "@/lib/guided-flow";
import { PROVINCES, PROVINCE_IDS, type ProvinceId } from "@/lib/provinces";
import { CATEGORY_ACTIONS, CATEGORY_UR, INDICATOR_UR } from "@/lib/rights-content";

export interface RightsCategory {
  id: string;
  name: string;
  description: string;
  indicators: {
    id: string;
    indicator: string;
    description: string;
    severity: string;
    examples: string[];
  }[];
  /** Laws that apply, keyed by province, resolved on the server. */
  lawByProvince: Record<string, { title: string; summary: string; remedy?: string }[]>;
}

const PROVINCE_KEY = "hifazat-province";

const SEVERITY_STYLE: Record<string, string> = {
  concerning: "bg-hifazat-amber-light text-hifazat-amber",
  serious: "bg-hifazat-red-light text-hifazat-red",
  critical: "bg-hifazat-red text-white",
};

export default function RightsBrowser({ categories }: { categories: RightsCategory[] }) {
  const { locale } = useLanguage();
  const isUrdu = locale === "ur";

  const [province, setProvince] = useState<ProvinceId | "">("");
  const [open, setOpen] = useState<string | null>(null);

  // Shares the key the resources directory uses, so the province is chosen once.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROVINCE_KEY);
      if (saved && (PROVINCE_IDS as string[]).includes(saved)) {
        // Reading a stored preference on mount, as in the resources directory.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProvince(saved as ProvinceId);
      }
    } catch {
      // storage blocked
    }
  }, []);

  const choose = (next: ProvinceId | "") => {
    setProvince(next);
    try {
      if (next) localStorage.setItem(PROVINCE_KEY, next);
      else localStorage.removeItem(PROVINCE_KEY);
    } catch {
      // not worth failing over
    }
  };

  const chip = (active: boolean) =>
    `px-4 py-2 rounded-full text-base whitespace-nowrap border transition-colors ${
      active
        ? "bg-hifazat-teal border-hifazat-teal text-white font-medium"
        : "bg-white border-hifazat-border text-hifazat-muted"
    }`;

  const shown = useMemo(() => categories, [categories]);

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[600px] lg:max-w-4xl mx-auto">
      <header className="flex flex-col items-center gap-4 px-5 py-6">
        <Link href="/">
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 px-5 pb-10 flex flex-col gap-5">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-hifazat-muted w-fit">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rtl:rotate-180">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t(locale, "goBack")}
        </Link>

        <div className="flex flex-col gap-2">
          <h1 className="font-heading font-serif text-[40px] leading-[1.2] text-hifazat-ink">
            {t(locale, "rightsTitle")}
          </h1>
          <p className="text-base text-hifazat-muted leading-relaxed">
            {t(locale, "rightsIntro")}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-hifazat-ink mb-2">
            {t(locale, "rightsProvincePrompt")}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
            <button onClick={() => choose("")} className={chip(province === "")}>
              {t(locale, "rightsNoProvince")}
            </button>
            {PROVINCE_IDS.map((id) => (
              <button key={id} onClick={() => choose(id)} className={chip(province === id)}>
                {isUrdu ? PROVINCES[id].shortUr : PROVINCES[id].shortEn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {shown.map((category) => {
            const isOpen = open === category.id;
            const ur = CATEGORY_UR[category.id];
            const name = isUrdu && ur ? ur.name : category.name;
            const description = isUrdu && ur ? ur.description : category.description;
            const laws = category.lawByProvince[province || "none"] ?? [];
            const actions = CATEGORY_ACTIONS[category.id] ?? [];

            return (
              <section
                key={category.id}
                className="bg-white border border-hifazat-border rounded-[24px] overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : category.id)}
                  className="w-full text-start p-5 flex items-start justify-between gap-3"
                >
                  <span className="flex-1">
                    <span className="block font-heading font-serif text-2xl text-hifazat-ink">
                      {name}
                    </span>
                    <span className="block text-base text-hifazat-muted leading-relaxed mt-1">
                      {description}
                    </span>
                    <span className="block text-sm text-hifazat-teal font-semibold mt-2">
                      {category.indicators.length} {t(locale, "rightsThingsCount")}
                    </span>
                  </span>
                  <span className={`text-hifazat-teal shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-5 border-t border-hifazat-border pt-4">
                    <div className="flex flex-col gap-3">
                      <h3 className="text-base font-semibold text-hifazat-ink">
                        {t(locale, "rightsWhatCounts")}
                      </h3>
                      {category.indicators.map((ind) => (
                        <div key={ind.id} className="flex flex-col gap-1">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-base font-medium text-hifazat-ink">
                              {isUrdu ? (INDICATOR_UR[ind.id] ?? ind.indicator) : ind.indicator}
                            </span>
                            <span
                              className={`text-sm px-2 py-0.5 rounded-full shrink-0 ${
                                SEVERITY_STYLE[ind.severity] ?? "bg-hifazat-bg text-hifazat-muted"
                              }`}
                            >
                              {t(
                                locale,
                                ind.severity === "critical"
                                  ? "resultSeverityCritical"
                                  : ind.severity === "serious"
                                    ? "resultSeveritySerious"
                                    : "resultSeverityConcerning",
                              )}
                            </span>
                          </div>
                          {/* Descriptions and examples are not yet translated;
                              shown in English rather than omitted. */}
                          <p className="text-sm text-hifazat-muted leading-relaxed" dir="ltr">
                            {ind.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="text-base font-semibold text-hifazat-ink">
                        {province
                          ? `${t(locale, "rightsLawHere")} ${isUrdu ? PROVINCES[province as ProvinceId].ur : PROVINCES[province as ProvinceId].en}`
                          : t(locale, "rightsLawGeneral")}
                      </h3>
                      {laws.length === 0 ? (
                        <p className="text-sm text-hifazat-muted">{t(locale, "rightsNoLaw")}</p>
                      ) : (
                        laws.map((law) => (
                          <div key={law.title} className="bg-hifazat-teal-light rounded-[12px] px-4 py-3">
                            <p className="text-base font-semibold text-hifazat-dark-teal" dir="ltr">
                              {law.title}
                            </p>
                            <p className="text-sm text-hifazat-ink/80 leading-relaxed mt-1" dir="ltr">
                              {law.summary}
                            </p>
                          </div>
                        ))
                      )}
                      {!province && (
                        <p className="text-sm text-hifazat-muted">
                          {t(locale, "rightsPickProvinceHint")}
                        </p>
                      )}
                    </div>

                    {actions.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold text-hifazat-ink">
                          {t(locale, "rightsWhatYouCanDo")}
                        </h3>
                        <ul className="flex flex-col gap-2 ps-5 list-disc marker:text-hifazat-teal">
                          {actions.map((action, i) => (
                            <li key={i} className="text-base text-hifazat-ink/80 leading-relaxed">
                              {localized(action, locale)
                                .split(/(\*\*[^*]+\*\*)/)
                                .map((part, j) =>
                                  part.startsWith("**") && part.endsWith("**") ? (
                                    <strong key={j}>{part.slice(2, -2)}</strong>
                                  ) : (
                                    <span key={j}>{part}</span>
                                  ),
                                )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/guided"
            className="w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg flex items-center justify-center"
          >
            {t(locale, "rightsCtaAssess")}
          </Link>
          <Link
            href="/resources"
            className="w-full h-[52px] bg-white text-hifazat-teal font-semibold rounded-full text-lg border border-hifazat-teal flex items-center justify-center"
          >
            {t(locale, "aboutSeeResources")}
          </Link>
        </div>

        <SiteFooter showNav={false} />
      </main>
    </div>
  );
}

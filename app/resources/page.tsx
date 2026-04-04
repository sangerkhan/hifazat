"use client";

import { RESOURCES } from "@/lib/resources";
import LanguageToggle from "@/components/LanguageToggle";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";

const TYPE_LABEL_KEYS: Record<string, "resourceTypeEmergency" | "resourceTypeGovernment" | "resourceTypeNgo" | "resourceTypeLegalAid"> = {
  emergency: "resourceTypeEmergency",
  government: "resourceTypeGovernment",
  ngo: "resourceTypeNgo",
  legal_aid: "resourceTypeLegalAid",
};

const TYPE_COLORS: Record<string, string> = {
  emergency: "bg-hifazat-red-light text-hifazat-red",
  government: "bg-hifazat-teal-light text-hifazat-teal",
  ngo: "bg-hifazat-amber-light text-hifazat-amber",
  legal_aid: "bg-purple-100 text-purple-700",
};

export default function ResourcesPage() {
  const { locale } = useLanguage();
  const sorted = [...RESOURCES].sort((a, b) => a.priority - b.priority);

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
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-hifazat-muted mb-6 w-fit"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="rtl:rotate-180"
          >
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

        <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-1">
          {t(locale, "resourcesHeading")}
        </h1>
        <p className="text-sm text-hifazat-muted mb-6">
          {t(locale, "resourcesSubtext")}
        </p>

        <div className="flex flex-col gap-4">
          {sorted.map((r) => {
            const labelKey = TYPE_LABEL_KEYS[r.type];
            return (
              <div
                key={r.phone}
                className="bg-white border border-hifazat-border rounded-[24px] p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-base font-semibold text-hifazat-ink leading-tight pe-2">
                    {r.name}
                  </h2>
                  <span
                    className={`text-sm font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                      TYPE_COLORS[r.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {labelKey ? t(locale, labelKey) : r.type}
                  </span>
                </div>

                <a
                  href={`tel:${r.phone}`}
                  className="inline-block font-heading font-serif text-2xl text-hifazat-teal mb-2"
                >
                  {r.phone}
                </a>

                <p className="text-sm text-hifazat-muted mb-1">{r.hours}</p>
                <p className="text-sm text-hifazat-muted leading-relaxed">
                  {r.description}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

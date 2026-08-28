"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/language-context";
import { t, tCount, type TranslationKey } from "@/lib/i18n";
import { filterResources, type Resource, type ResourceType } from "@/lib/resources";
import { PROVINCES, PROVINCE_IDS, type ProvinceId } from "@/lib/provinces";

const PROVINCE_STORAGE_KEY = "hifazat-province";

const TYPE_LABEL_KEYS: Record<ResourceType, TranslationKey> = {
  emergency: "resourceTypeEmergency",
  police: "resourceTypePolice",
  government: "resourceTypeGovernment",
  ngo: "resourceTypeNgo",
  legal_aid: "resourceTypeLegalAid",
  shelter: "resourceTypeShelter",
  cyber: "resourceTypeCyber",
  counselling: "resourceTypeCounselling",
  child: "resourceTypeChild",
};

const TYPE_COLORS: Record<ResourceType, string> = {
  emergency: "bg-hifazat-red-light text-hifazat-red",
  police: "bg-hifazat-red-light text-hifazat-red",
  government: "bg-hifazat-teal-light text-hifazat-teal",
  ngo: "bg-hifazat-amber-light text-hifazat-amber",
  legal_aid: "bg-purple-100 text-purple-700",
  shelter: "bg-hifazat-teal-light text-hifazat-dark-teal",
  cyber: "bg-blue-100 text-blue-700",
  counselling: "bg-hifazat-amber-light text-hifazat-amber",
  child: "bg-purple-100 text-purple-700",
};

/** Only the types actually present in the directory get a filter chip. */
const FILTER_TYPES: ResourceType[] = [
  "emergency",
  "government",
  "legal_aid",
  "ngo",
  "shelter",
  "cyber",
  "counselling",
  "child",
];

export default function ResourcesBrowser({ resources }: { resources: Resource[] }) {
  const { locale } = useLanguage();
  const isUrdu = locale === "ur";

  const [province, setProvince] = useState<ProvinceId | "all">("all");
  const [type, setType] = useState<ResourceType | "all">("all");
  const [search, setSearch] = useState("");

  // The province someone is in does not change between visits, so remember it
  // rather than making them re-pick every time they open the directory.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROVINCE_STORAGE_KEY);
      if (saved && (PROVINCE_IDS as string[]).includes(saved)) {
        setProvince(saved as ProvinceId);
      }
    } catch {
      // Private browsing or blocked storage — the default is fine.
    }
  }, []);

  const chooseProvince = (next: ProvinceId | "all") => {
    setProvince(next);
    try {
      if (next === "all") localStorage.removeItem(PROVINCE_STORAGE_KEY);
      else localStorage.setItem(PROVINCE_STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
  };

  const query = {
    province: province === "all" ? undefined : province,
    types: type === "all" ? undefined : [type],
    search: search.trim() || undefined,
  };

  const verified = useMemo(
    () => filterResources(resources, query),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resources, province, type, search],
  );

  const unconfirmed = useMemo(
    () =>
      filterResources(resources, { ...query, includeUnconfirmed: true }).filter(
        (r) => r.verification !== "confirmed",
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resources, province, type, search],
  );

  const chipClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-base whitespace-nowrap border transition-colors ${
      active
        ? "bg-hifazat-teal border-hifazat-teal text-white font-medium"
        : "bg-white border-hifazat-border text-hifazat-muted"
    }`;

  return (
    <div className="flex flex-col min-h-screen">
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

        <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-1">
          {t(locale, "resourcesHeading")}
        </h1>
        <p className="text-sm text-hifazat-muted mb-6">{t(locale, "resourcesSubtext")}</p>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, "resourcesSearchPlaceholder")}
          dir={isUrdu ? "rtl" : "ltr"}
          className="w-full px-4 py-3 mb-5 text-base text-hifazat-ink bg-white border border-hifazat-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60"
        />

        {/* Province filter */}
        <p className="text-sm font-semibold text-hifazat-ink mb-2">
          {t(locale, "resourcesFilterProvince")}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-5 px-5">
          <button onClick={() => chooseProvince("all")} className={chipClass(province === "all")}>
            {t(locale, "resourcesFilterAll")}
          </button>
          {PROVINCE_IDS.map((id) => (
            <button
              key={id}
              onClick={() => chooseProvince(id)}
              className={chipClass(province === id)}
            >
              {isUrdu ? PROVINCES[id].shortUr : PROVINCES[id].shortEn}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <p className="text-sm font-semibold text-hifazat-ink mb-2">
          {t(locale, "resourcesFilterType")}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-5 px-5">
          <button onClick={() => setType("all")} className={chipClass(type === "all")}>
            {t(locale, "resourcesFilterAllTypes")}
          </button>
          {FILTER_TYPES.map((value) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={chipClass(type === value)}
            >
              {t(locale, TYPE_LABEL_KEYS[value])}
            </button>
          ))}
        </div>

        <p className="text-sm text-hifazat-muted mb-4">
          {tCount(locale, "resourcesCount", verified.length)}
        </p>

        {verified.length === 0 && unconfirmed.length === 0 && (
          <p className="text-base text-hifazat-muted leading-relaxed">
            {t(locale, "resourcesNoResults")}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {verified.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>

        {/* Organisations we have not been able to verify yet are shown, because
            knowing they exist is useful, but without a tap-to-call link — we
            will not put a number in front of someone in crisis that we have not
            stood behind. */}
        {unconfirmed.length > 0 && (
          <div className="mt-8">
            <h2 className="font-heading font-serif text-2xl text-hifazat-ink mb-2">
              {t(locale, "resourcesUnverifiedHeading")}
            </h2>
            <p className="text-sm text-hifazat-muted leading-relaxed mb-4">
              {t(locale, "resourcesUnverifiedNote")}
            </p>
            <div className="flex flex-col gap-4">
              {unconfirmed.map((r) => (
                <ResourceCard key={r.id} resource={r} unverified />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ResourceCard({
  resource,
  unverified = false,
}: {
  resource: Resource;
  unverified?: boolean;
}) {
  const { locale } = useLanguage();
  const isUrdu = locale === "ur";

  const name = isUrdu ? resource.nameUr : resource.name;
  const description = isUrdu ? resource.descriptionUr : resource.description;
  const hours = isUrdu ? resource.hoursUr : resource.hours;

  const scopeLabel = resource.scope.includes("national")
    ? t(locale, "resourcesNationwide")
    : resource.scope
        .map((s) =>
          s === "national"
            ? t(locale, "resourcesNationwide")
            : isUrdu
              ? PROVINCES[s].shortUr
              : PROVINCES[s].shortEn,
        )
        .join(isUrdu ? "، " : ", ");

  return (
    <div
      className={`bg-white border rounded-[24px] p-5 ${
        unverified ? "border-dashed border-hifazat-border" : "border-hifazat-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-hifazat-ink leading-tight">{name}</h3>
        <span
          className={`text-sm font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
            TYPE_COLORS[resource.type]
          }`}
        >
          {t(locale, TYPE_LABEL_KEYS[resource.type])}
        </span>
      </div>

      {/* An unverified number is deliberately not rendered as a tel: link. */}
      {resource.phone && !unverified && (
        <a
          href={`tel:${resource.phone}`}
          dir="ltr"
          className="inline-block font-heading font-serif text-2xl text-hifazat-teal mb-2"
        >
          {resource.phone}
        </a>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
        {resource.whatsapp && !unverified && (
          <a
            href={`https://wa.me/${resource.whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-hifazat-teal underline"
          >
            {t(locale, "resourcesWhatsapp")}
          </a>
        )}
        {resource.website && (
          <a
            href={resource.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-hifazat-teal underline"
          >
            {t(locale, "resourcesWebsite")}
          </a>
        )}
        {resource.email && !unverified && (
          <a
            href={`mailto:${resource.email}`}
            dir="ltr"
            className="text-sm font-semibold text-hifazat-teal underline"
          >
            {t(locale, "resourcesEmail")}
          </a>
        )}
      </div>

      <p className="text-sm text-hifazat-muted mb-1">
        {hours} · {scopeLabel}
      </p>
      <p className="text-sm text-hifazat-muted leading-relaxed">{description}</p>
    </div>
  );
}

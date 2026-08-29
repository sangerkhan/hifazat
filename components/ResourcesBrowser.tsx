"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/SiteFooter";
import PageShell from "@/components/ui/PageShell";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { GlobeIcon, MailIcon, PhoneIcon } from "@/components/ui/Icon";
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
    `tappable inline-flex items-center min-h-[44px] px-4 rounded-full text-base whitespace-nowrap border ${
      active
        ? "bg-hifazat-teal border-hifazat-teal text-white font-medium shadow-[var(--shadow-soft)]"
        : "bg-surface-raised border-hifazat-border/60 text-hifazat-muted shadow-[var(--shadow-soft)]"
    }`;

  return (
    <PageShell width="wide">

      <main className="flex-1 px-5 pb-10">
        <BackButton href="/" />

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
          enterKeyHint="search"
          className="w-full min-h-[48px] px-4 py-3 mb-5 text-base text-hifazat-ink bg-surface-raised border border-hifazat-border/60 shadow-[var(--shadow-soft)] rounded-[16px] transition-colors focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60"
        />

        {/* Province filter */}
        <p className="text-sm font-semibold text-hifazat-ink mb-2">
          {t(locale, "resourcesFilterProvince")}
        </p>
        <div className="hscroll flex gap-2 overflow-x-auto pb-3 mb-4 -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
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
        <div className="hscroll flex gap-2 overflow-x-auto pb-3 mb-5 -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
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

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
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
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
              {unconfirmed.map((r) => (
                <ResourceCard key={r.id} resource={r} unverified />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <SiteFooter />
        </div>
      </main>
    </PageShell>
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
    <Card
      elevation={unverified ? "none" : "card"}
      className={`p-5 flex flex-col gap-3 ${unverified ? "border-dashed bg-transparent" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-hifazat-ink leading-tight">{name}</h3>
        <span
          className={`text-sm font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
            TYPE_COLORS[resource.type]
          }`}
        >
          {t(locale, TYPE_LABEL_KEYS[resource.type])}
        </span>
      </div>

      <p className="text-sm text-hifazat-muted">
        {hours} · {scopeLabel}
      </p>

      {/* Contact actions are buttons. An unverified number is deliberately not
          offered as one — the website is the only route we will stand behind. */}
      <div className="flex flex-col gap-2">
        {resource.phone && !unverified && (
          <Button href={`tel:${resource.phone}`} icon={<PhoneIcon size={18} />}>
            <span dir="ltr">{resource.phone}</span>
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          {resource.whatsapp && !unverified && (
            <Button
              href={`https://wa.me/${resource.whatsapp.replace(/[^\d]/g, "")}`}
              variant="surface"
              fullWidth={false}
              icon={<PhoneIcon size={18} />}
              className="flex-1 min-w-[8rem]"
            >
              {t(locale, "resourcesWhatsapp")}
            </Button>
          )}
          {resource.website && (
            <Button
              href={resource.website}
              variant="surface"
              fullWidth={false}
              icon={<GlobeIcon size={18} />}
              className="flex-1 min-w-[8rem]"
            >
              {t(locale, "resourcesWebsite")}
            </Button>
          )}
          {resource.email && !unverified && (
            <Button
              href={`mailto:${resource.email}`}
              variant="surface"
              fullWidth={false}
              icon={<MailIcon size={18} />}
              className="flex-1 min-w-[8rem]"
            >
              {t(locale, "resourcesEmail")}
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-hifazat-muted leading-relaxed">{description}</p>
    </Card>
  );
}

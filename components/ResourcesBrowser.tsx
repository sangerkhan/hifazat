"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "@/components/SiteFooter";
import PageShell from "@/components/ui/PageShell";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ChevronDownIcon, GlobeIcon, MailIcon, PhoneIcon } from "@/components/ui/Icon";
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

/**
 * Four families rather than eight one-off pairs: who to call in an emergency,
 * the state, civil society, and the specialist routes. Two of these were raw
 * Tailwind palette colours that belonged to no system at all.
 */
const TYPE_COLORS: Record<ResourceType, string> = {
  emergency: "bg-destructive-subtle text-destructive-strong",
  police: "bg-destructive-subtle text-destructive-strong",
  government: "bg-primary-subtle text-primary-strong",
  shelter: "bg-primary-subtle text-primary-strong",
  ngo: "bg-warning-subtle text-warning-strong",
  counselling: "bg-warning-subtle text-warning-strong",
  legal_aid: "bg-info-subtle text-info-strong",
  cyber: "bg-info-subtle text-info-strong",
  child: "bg-info-subtle text-info-strong",
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

  const chipClass = (active: boolean) =>
    `tappable inline-flex items-center min-h-[44px] px-4 rounded-full text-base whitespace-nowrap border ${
      active
        ? "bg-primary border-primary text-white font-medium shadow-[var(--shadow-soft)]"
        : "bg-surface-raised border-border/60 text-muted-foreground shadow-[var(--shadow-soft)]"
    }`;

  return (
    <PageShell width="wide">

      <main className="flex-1 px-5 pb-10">
        <BackButton href="/" />

        <h1 className="font-heading text-2xl font-serif text-hifazat-ink mb-1">
          {t(locale, "resourcesHeading")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{t(locale, "resourcesSubtext")}</p>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, "resourcesSearchPlaceholder")}
          dir={isUrdu ? "rtl" : "ltr"}
          enterKeyHint="search"
          className="w-full min-h-[48px] px-4 py-3 mb-5 text-base text-hifazat-ink bg-surface-raised border border-border/60 shadow-[var(--shadow-soft)] rounded-[16px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary placeholder:text-muted-foreground/60"
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

        <p className="text-sm text-muted-foreground mb-4">
          {tCount(locale, "resourcesCount", verified.length)}
        </p>

        {verified.length === 0 && (
          <p className="text-base text-muted-foreground leading-relaxed">
            {t(locale, "resourcesNoResults")}
          </p>
        )}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
          {verified.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>

        <div className="mt-8">
          <SiteFooter />
        </div>
      </main>
    </PageShell>
  );
}

/**
 * One organisation.
 *
 * Collapsed by default. The directory is 37 entries and a fully expanded card
 * runs to about 200px, so an unfiltered list was roughly seven screens of
 * scrolling to find out who is nearest — which is not a thing to ask of
 * someone in the state most people open this in. Collapsed, the card answers
 * "is this the one?" (name, what kind of organisation, when it is open, where
 * it covers) and still lets you call without expanding anything.
 *
 * The header is the toggle; the actions sit outside it, because a button
 * inside a button is not a thing.
 */
function ResourceCard({ resource }: { resource: Resource }) {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const isUrdu = locale === "ur";

  const name = isUrdu ? resource.nameUr : resource.name;
  const description = isUrdu ? resource.descriptionUr : resource.description;
  const hours = isUrdu ? resource.hoursUr : resource.hours;

  const scopeLabel = resource.scope.includes("national")
    ? t(locale, "resourcesNationwide")
    : resource.scope
        .map((sc) =>
          sc === "national"
            ? t(locale, "resourcesNationwide")
            : isUrdu
              ? PROVINCES[sc].shortUr
              : PROVINCES[sc].shortEn,
        )
        .join(isUrdu ? "، " : ", ");

  const whatsappHref = resource.whatsapp
    ? `https://wa.me/${resource.whatsapp.replace(/[^\d]/g, "")}`
    : null;

  /** Collapsed: reachable in one tap, with the label carried by aria only. */
  const iconAction = (href: string, label: string, icon: React.ReactNode) => (
    <Button
      href={href}
      variant="surface"
      size="sm"
      fullWidth={false}
      aria-label={label}
      className="w-11 !px-0"
    >
      {icon}
    </Button>
  );

  return (
    <Card elevation={open ? "float" : "card"} className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tappable w-full text-start p-5 flex items-start gap-3"
      >
        <span className="flex-1 flex flex-col gap-2">
          <span className="flex items-start gap-2 flex-wrap">
            <span className="text-base font-semibold text-hifazat-ink leading-tight">
              {name}
            </span>
            <span
              className={`text-sm font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                TYPE_COLORS[resource.type]
              }`}
            >
              {t(locale, TYPE_LABEL_KEYS[resource.type])}
            </span>
            {resource.partner && (
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-full shrink-0 bg-success-subtle text-success-strong">
                {t(locale, "resourcesPartner")}
              </span>
            )}
          </span>
          <span className="block text-sm text-muted-foreground">
            {hours} · {scopeLabel}
          </span>
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-hifazat-ink transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon size={20} />
        </span>
      </button>

      {!open && (
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          {resource.phone &&
            iconAction(`tel:${resource.phone}`, `${t(locale, "resourcesCall")} ${name}`, <PhoneIcon size={18} />)}
          {whatsappHref &&
            iconAction(whatsappHref, `${t(locale, "resourcesWhatsapp")} — ${name}`, <PhoneIcon size={18} />)}
          {resource.website &&
            iconAction(resource.website, `${t(locale, "resourcesWebsite")} — ${name}`, <GlobeIcon size={18} />)}
          {resource.email &&
            iconAction(`mailto:${resource.email}`, `${t(locale, "resourcesEmail")} — ${name}`, <MailIcon size={18} />)}
        </div>
      )}

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          <div className="flex flex-col gap-2">
            {resource.phone && (
              <Button href={`tel:${resource.phone}`} icon={<PhoneIcon size={18} />}>
                <span dir="ltr">{resource.phone}</span>
              </Button>
            )}
            <div className="flex flex-wrap gap-2">
              {whatsappHref && (
                <Button
                  href={whatsappHref}
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
              {resource.email && (
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
        </div>
      )}
    </Card>
  );
}

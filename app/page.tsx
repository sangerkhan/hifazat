"use client";

import Link from "next/link";
import PageShell from "@/components/ui/PageShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import {
  ArrowRightIcon,
  BookIcon,
  ChecklistIcon,
  InfoIcon,
  LifebuoyIcon,
  PencilIcon,
  PhoneIcon,
} from "@/components/ui/Icon";

/**
 * One of the two big choices, as a card rather than a bare button.
 *
 * The landing page previously offered "Describe your situation" and "Analyse my
 * situation", which are hard to tell apart when you are frightened and reading
 * quickly. These say what each one actually is, and each carries a line
 * explaining what happens if you tap it.
 */
function ChoiceCard({
  href,
  icon,
  title,
  body,
  emphasis = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`tappable liftable group flex items-center gap-4 rounded-[20px] border p-4 text-start ${
        emphasis
          ? "bg-hifazat-teal border-transparent text-white shadow-[var(--shadow-primary)]"
          : "bg-surface-raised border-hifazat-border/50 shadow-[var(--shadow-soft)] hover:border-hifazat-teal/40"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${
          emphasis ? "bg-white/15 text-white" : "bg-surface-accent text-hifazat-teal"
        }`}
      >
        {icon}
      </span>

      <span className="flex-1 min-w-0">
        <span
          className={`block text-lg font-semibold leading-tight ${
            emphasis ? "text-white" : "text-hifazat-ink"
          }`}
        >
          {title}
        </span>
        <span
          className={`block text-sm leading-snug mt-0.5 ${
            emphasis ? "text-white/80" : "text-hifazat-muted"
          }`}
        >
          {body}
        </span>
      </span>

      <span className={emphasis ? "text-white/70" : "text-hifazat-teal"}>
        <ArrowRightIcon size={20} />
      </span>
    </Link>
  );
}

/** A secondary destination. Also a card, so it is a real target, not a link. */
function ExploreCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="tappable liftable flex items-center gap-3 rounded-[18px] border border-hifazat-border/50 bg-surface-raised p-4 shadow-[var(--shadow-soft)] hover:border-hifazat-teal/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-surface-accent text-hifazat-teal">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-hifazat-ink leading-tight">
          {title}
        </span>
        <span className="block text-sm text-hifazat-muted leading-snug mt-0.5">{body}</span>
      </span>
      <span className="text-hifazat-muted">
        <ArrowRightIcon size={18} />
      </span>
    </Link>
  );
}

export default function Home() {
  const { locale } = useLanguage();

  return (
    <PageShell width="wide">
      <main className="flex-1 px-5 pb-10 flex flex-col gap-6 lg:gap-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
          {/* Hero */}
          <div className="text-center lg:text-start flex flex-col gap-3 pt-2 lg:pt-8">
            <h1 className="font-heading text-[38px] lg:text-[52px] font-normal leading-[1.15] text-hifazat-ink font-serif">
              {t(locale, "heroHeadline")}
            </h1>
            <p className="text-base lg:text-lg font-medium text-hifazat-muted leading-relaxed">
              {t(locale, "heroSubtext")}
            </p>
          </div>

          {/* The two ways in, grouped so the choice reads as one decision */}
          <Card tone="sunken" elevation="none" className="p-4 mt-6 lg:mt-0 flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-hifazat-muted px-1">
              {t(locale, "ctaChooseHeading")}
            </h2>

            <ChoiceCard
              href="/guided"
              emphasis
              icon={<ChecklistIcon size={24} />}
              title={t(locale, "ctaQuizTitle")}
              body={t(locale, "ctaQuizBody")}
            />
            <ChoiceCard
              href="/assess"
              icon={<PencilIcon size={22} />}
              title={t(locale, "ctaWriteTitle")}
              body={t(locale, "ctaWriteBody")}
            />
          </Card>
        </div>

        {/* Emergency — the one thing that must never be hunted for */}
        <Card tone="danger" elevation="soft" className="border-2 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 justify-center">
            <span className="text-hifazat-red">
              <PhoneIcon size={22} />
            </span>
            <p className="font-heading font-serif text-2xl text-hifazat-ink">
              {t(locale, "emergencyLabel")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="tel:15" variant="danger" size="lg" icon={<PhoneIcon size={20} />}>
              {t(locale, "callPolice")}
            </Button>
            <Button href="tel:1099" variant="danger" size="lg" icon={<PhoneIcon size={20} />}>
              {t(locale, "callHumanRights")}
            </Button>
          </div>

          <p className="text-sm text-hifazat-muted text-center">
            {t(locale, "homeEmergencyBody")}
          </p>
        </Card>

        {/* Everything else, as targets rather than footer links */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-hifazat-muted px-1">
            {t(locale, "homeExploreHeading")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ExploreCard
              href="/rights"
              icon={<BookIcon size={20} />}
              title={t(locale, "navRights")}
              body={t(locale, "navRightsBody")}
            />
            <ExploreCard
              href="/resources"
              icon={<LifebuoyIcon size={20} />}
              title={t(locale, "navResources")}
              body={t(locale, "navResourcesBody")}
            />
            <ExploreCard
              href="/about"
              icon={<InfoIcon size={20} />}
              title={t(locale, "navAbout")}
              body={t(locale, "navAboutBody")}
            />
          </div>
        </div>

        <SiteFooter showNav={false} showEmergency={false} />
      </main>
    </PageShell>
  );
}

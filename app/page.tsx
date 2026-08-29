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
  ChecklistIcon,
  InfoIcon,
  LifebuoyIcon,
  PencilIcon,
  PhoneIcon,
  ScalesIcon,
} from "@/components/ui/Icon";

/**
 * One of the three ways in.
 *
 * No supporting line under any of them. The labels already say what happens,
 * and a sentence under each one turns a three-way choice into six things to
 * read — which is the last thing someone frightened and in a hurry needs.
 *
 * Only the first carries a fill. When every card was solid they competed at
 * the same volume and the eye had nowhere to land; now weight descends down
 * the stack, which is also the order these are worth reading in.
 */
function EntryCard({
  href,
  icon,
  title,
  emphasis = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`tappable liftable flex items-center gap-4 rounded-[20px] border p-5 text-start ${
        emphasis
          ? "bg-primary border-transparent text-primary-foreground shadow-[var(--shadow-primary)]"
          : "bg-surface-raised border-border shadow-[var(--shadow-card)] hover:border-primary/40"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${
          emphasis ? "bg-white/15 text-primary-foreground" : "bg-primary-subtle text-primary-strong"
        }`}
      >
        {icon}
      </span>

      <span
        className={`flex-1 text-xl font-semibold leading-tight ${
          emphasis ? "text-primary-foreground" : "text-hifazat-ink"
        }`}
      >
        {title}
      </span>

      <span className={emphasis ? "text-primary-foreground/70" : "text-primary-strong"}>
        <ArrowRightIcon size={22} />
      </span>
    </Link>
  );
}

/** A secondary destination: icon and label, nothing else. */
function ExploreCard({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="tappable liftable flex flex-col items-center justify-start gap-2.5 rounded-[18px] border border-border bg-surface-raised px-3 py-5 text-center shadow-[var(--shadow-soft)] hover:border-primary/40 lg:flex-row lg:justify-center lg:gap-3 lg:py-6"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary-subtle text-primary-strong">
        {icon}
      </span>
      <span className="text-base font-semibold text-hifazat-ink leading-tight">{title}</span>
    </Link>
  );
}

export default function Home() {
  const { locale } = useLanguage();

  return (
    <PageShell width="wide">
      {/* Spacing carries the hierarchy here, set per boundary rather than by one
          uniform gap: ~12px inside a group, ~30px between groups, ~56px between
          sections. */}
      <main className="flex-1 px-5 pb-14 flex flex-col">
        <div className="lg:grid lg:grid-cols-2 lg:gap-14 lg:items-center">
          <div className="text-center lg:text-start flex flex-col gap-3 pt-6 lg:pt-0">
            <h1 className="font-heading text-[38px] lg:text-[54px] font-normal leading-[1.12] text-hifazat-ink font-serif">
              {t(locale, "heroHeadline")}
            </h1>
            <p className="text-base lg:text-lg font-medium text-muted-foreground">
              {t(locale, "heroSubtext")}
            </p>
          </div>

          {/* The three ways in, and nothing competing with them. Legal help is
              here rather than only after an assessment: someone who already
              knows they need a lawyer should not have to describe what happened
              to an app first. */}
          <div className="flex flex-col gap-3 mt-9 lg:mt-0">
            <EntryCard
              href="/assess"
              emphasis
              icon={<PencilIcon size={24} />}
              title={t(locale, "ctaWriteTitle")}
            />
            <EntryCard
              href="/guided"
              icon={<ChecklistIcon size={26} />}
              title={t(locale, "ctaQuizTitle")}
            />
            <EntryCard
              href="/legal-aid"
              icon={<ScalesIcon size={24} />}
              title={t(locale, "ctaLegalAidTitle")}
            />
          </div>
        </div>

        {/* Secondary destinations. The biggest break on the page sits above
            this row, because it is the one real change in rank. */}
        <div className="grid grid-cols-2 gap-3 mt-14 lg:mt-16">
          <ExploreCard
            href="/resources"
            icon={<LifebuoyIcon size={22} />}
            title={t(locale, "navResources")}
          />
          <ExploreCard
            href="/about"
            icon={<InfoIcon size={22} />}
            title={t(locale, "navAbout")}
          />
        </div>

        {/* Emergency sits below the choices deliberately. It has to be
            unmissable when it is needed, but a red panel above the fold pulls
            attention away from the three things most people are here to do. */}
        <Card tone="danger" elevation="soft" className="border-2 p-5 mt-9 lg:mt-11 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 justify-center">
            <span className="text-destructive-strong">
              <PhoneIcon size={20} />
            </span>
            <p className="font-heading font-serif text-xl text-hifazat-ink">
              {t(locale, "emergencyLabel")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="tel:15" variant="destructive" icon={<PhoneIcon size={18} />}>
              {t(locale, "callPolice")}
            </Button>
            <Button href="tel:1099" variant="destructive" icon={<PhoneIcon size={18} />}>
              {t(locale, "callHumanRights")}
            </Button>
          </div>
        </Card>

        <SiteFooter showNav={false} showEmergency={false} className="mt-14 lg:mt-16" />
      </main>
    </PageShell>
  );
}

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
 * One of the two ways in.
 *
 * No supporting line: the label has to carry it. "Take a quiz" and "Write on
 * your own" already say what happens, and a sentence underneath each only slows
 * down the one decision this screen exists to make.
 */
function ChoiceCard({
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
          ? "bg-hifazat-teal border-transparent text-white shadow-[var(--shadow-primary)]"
          : "bg-surface-raised border-hifazat-border/50 shadow-[var(--shadow-card)] hover:border-hifazat-teal/40"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${
          emphasis ? "bg-white/15 text-white" : "bg-surface-accent text-hifazat-teal"
        }`}
      >
        {icon}
      </span>

      <span
        className={`flex-1 text-xl font-semibold leading-tight ${
          emphasis ? "text-white" : "text-hifazat-ink"
        }`}
      >
        {title}
      </span>

      <span className={emphasis ? "text-white/70" : "text-hifazat-teal"}>
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
      className="tappable liftable flex flex-col items-center justify-center gap-2 rounded-[18px] border border-hifazat-border/50 bg-surface-raised px-3 py-5 text-center shadow-[var(--shadow-soft)] hover:border-hifazat-teal/40"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-surface-accent text-hifazat-teal">
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
      <main className="flex-1 px-5 pb-10 flex flex-col gap-7 lg:gap-9">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div className="text-center lg:text-start flex flex-col gap-2 pt-2 lg:pt-0">
            <h1 className="font-heading text-[38px] lg:text-[54px] font-normal leading-[1.12] text-hifazat-ink font-serif">
              {t(locale, "heroHeadline")}
            </h1>
            <p className="text-base lg:text-lg font-medium text-hifazat-muted">
              {t(locale, "heroSubtext")}
            </p>
          </div>

          {/* The decision, and nothing competing with it */}
          <div className="flex flex-col gap-3 mt-6 lg:mt-0">
            <ChoiceCard
              href="/guided"
              emphasis
              icon={<ChecklistIcon size={26} />}
              title={t(locale, "ctaQuizTitle")}
            />
            <ChoiceCard
              href="/assess"
              icon={<PencilIcon size={24} />}
              title={t(locale, "ctaWriteTitle")}
            />
          </div>
        </div>

        {/* Secondary destinations */}
        <div className="grid grid-cols-3 gap-3">
          <ExploreCard
            href="/rights"
            icon={<BookIcon size={22} />}
            title={t(locale, "navRights")}
          />
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
            attention away from the two things most people are here to do. */}
        <Card tone="danger" elevation="soft" className="border-2 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 justify-center">
            <span className="text-hifazat-red">
              <PhoneIcon size={20} />
            </span>
            <p className="font-heading font-serif text-xl text-hifazat-ink">
              {t(locale, "emergencyLabel")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="tel:15" variant="danger" icon={<PhoneIcon size={18} />}>
              {t(locale, "callPolice")}
            </Button>
            <Button href="tel:1099" variant="danger" icon={<PhoneIcon size={18} />}>
              {t(locale, "callHumanRights")}
            </Button>
          </div>
        </Card>

        <SiteFooter showNav={false} showEmergency={false} />
      </main>
    </PageShell>
  );
}

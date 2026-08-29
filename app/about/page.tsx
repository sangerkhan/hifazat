"use client";

import SiteFooter from "@/components/SiteFooter";
import PageShell from "@/components/ui/PageShell";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LifebuoyIcon } from "@/components/ui/Icon";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import { localized } from "@/lib/guided-flow";
import { ABOUT_INTRO, ABOUT_SECTIONS, type SectionTone } from "@/lib/about-content";

const TONE_CARD: Record<SectionTone, "raised" | "warning" | "danger"> = {
  default: "raised",
  note: "warning",
  warning: "danger",
};

export default function AboutPage() {
  const { locale } = useLanguage();

  return (
    <PageShell width="prose">

      <main className="flex-1 px-5 pb-10 flex flex-col gap-6">
        <BackButton href="/" />

        <div className="flex flex-col gap-3">
          <h1 className="font-heading font-serif text-[40px] leading-[1.2] text-hifazat-ink">
            {t(locale, "aboutTitle")}
          </h1>
          <p className="text-base text-hifazat-muted leading-relaxed">
            {localized(ABOUT_INTRO, locale)}
          </p>
        </div>

        {ABOUT_SECTIONS.map((section) => (
          <Card
            key={section.id}
            as="section"
            tone={TONE_CARD[section.tone ?? "default"]}
            elevation={section.tone === "default" ? "card" : "soft"}
            className={`p-6 flex flex-col gap-3 ${section.tone === "warning" ? "border-2" : ""}`}
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
          </Card>
        ))}

        <p className="text-sm text-hifazat-muted text-center">
          {t(locale, "aboutLastUpdated")}
        </p>

        <Button href="/resources" size="lg" icon={<LifebuoyIcon size={20} />}>
          {t(locale, "aboutSeeResources")}
        </Button>

        <SiteFooter showNav={false} />
      </main>
    </PageShell>
  );
}

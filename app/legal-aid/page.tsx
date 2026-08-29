"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SiteFooter from "@/components/SiteFooter";
import ReferralForm from "@/components/ReferralForm";
import { PhoneIcon, ScalesIcon } from "@/components/ui/Icon";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";

/**
 * Legal help, reachable without an assessment first.
 *
 * The referral form previously existed only at the end of the guided flow, so
 * someone who already knew they needed a lawyer had to answer thirteen
 * questions about what happened to them before the app would offer one. This
 * is the same form, asked for directly.
 *
 * Availability is checked rather than assumed: with no delivery configured,
 * `/api/refer` rejects every submission, and a form that takes someone's name
 * and phone number and then fails is worse than no form at all. When it is
 * unavailable this page says so and gives the helplines instead.
 */
export default function LegalAidPage() {
  const { locale } = useLanguage();
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/refer")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAvailable(Boolean(data?.available));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell width="form">
      <main className="flex-1 px-5 pb-14 flex flex-col gap-8">
        <BackButton href="/" />

        <div className="flex flex-col gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-subtle text-primary-strong">
            <ScalesIcon size={26} />
          </span>
          <h1 className="font-heading text-[30px] font-serif text-hifazat-ink leading-tight">
            {t(locale, "legalAidTitle")}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {t(locale, "legalAidIntro")}
          </p>
        </div>

        {available === null && (
          <p className="text-base text-muted-foreground">{t(locale, "assessAnalysing")}</p>
        )}

        {available === true && <ReferralForm onClose={() => router.push("/")} />}

        {available === false && (
          <Card tone="warning" elevation="soft" className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="font-heading font-serif text-xl text-hifazat-ink">
                {t(locale, "legalAidUnavailableTitle")}
              </h2>
              <p className="text-base text-hifazat-ink leading-relaxed">
                {t(locale, "legalAidUnavailableBody")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button href="tel:1099" variant="destructive" icon={<PhoneIcon size={18} />}>
                {t(locale, "callHumanRights")}
              </Button>
              <Button href="/resources" variant="outline">
                {t(locale, "navResources")}
              </Button>
            </div>
          </Card>
        )}

        <SiteFooter showNav={false} />
      </main>
    </PageShell>
  );
}

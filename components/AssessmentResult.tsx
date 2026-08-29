"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import ReferralForm from "@/components/ReferralForm";
import SiteFooter from "@/components/SiteFooter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  AlertIcon,
  ArrowLeftIcon,
  GlobeIcon,
  PhoneIcon,
  PrinterIcon,
  ScalesIcon,
  ShareIcon,
} from "@/components/ui/Icon";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import type { ReferralCaseContext } from "@/lib/referral";

interface Classification {
  category_id: string;
  category_name: string;
  indicator_id: string;
  indicator_name: string;
  explanation: string;
  legal_reference: string;
}

interface Action {
  step: string;
  details: string;
  priority: "immediate" | "short_term" | "longer_term";
}

interface Resource {
  name: string;
  phone: string;
  website?: string;
  why: string;
}

interface PrimaryAction {
  type: "call" | "link";
  label: string;
  value: string;
  description?: string;
}

export interface AssessmentData {
  is_urgent: boolean;
  validation: string;
  classifications: Classification[];
  severity: "concerning" | "serious" | "critical";
  severity_explanation: string;
  actions: Action[];
  resources: Resource[];
  note?: string;
  primary_action?: PrimaryAction;
  /** Set by the offline fallback: generic guidance, not an analysis of the
      account the person gave. */
  degraded?: boolean;
}

const SEVERITY_KEYS = {
  concerning: "resultSeverityConcerning",
  serious: "resultSeveritySerious",
  critical: "resultSeverityCritical",
} as const;

const SEVERITY_COLORS = {
  concerning: "bg-warning text-warning-foreground",
  serious: "bg-destructive text-destructive-foreground",
  critical: "bg-destructive text-destructive-foreground",
};

/** Urgency is the one thing that differs between steps, so it is the one
    thing that gets colour. */
const PRIORITY_COLORS: Record<string, string> = {
  immediate: "bg-destructive-subtle text-destructive-strong",
  short_term: "bg-warning-subtle text-warning-strong",
  longer_term: "bg-info-subtle text-info-strong",
};

const PRIORITY_KEYS = {
  immediate: "resultPriorityImmediate",
  short_term: "resultPriorityShort",
  longer_term: "resultPriorityLong",
} as const;

export default function AssessmentResult({
  data,
  onReset,
  referralContext,
  referralNarrative,
}: {
  data: AssessmentData;
  onReset: () => void;
  /**
   * Present when the assessment came from the guided flow, which is the only
   * path that produces structured enough facts to route a referral to the right
   * legal desk. The free-text route omits these and the referral card is hidden.
   */
  referralContext?: ReferralCaseContext;
  referralNarrative?: string;
}) {
  const { locale } = useLanguage();
  const [showReferral, setShowReferral] = useState(false);
  const [referralAvailable, setReferralAvailable] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Only offer a referral once the legal desk is actually reachable. Asking
  // someone for their name and phone number and then failing is worse than not
  // offering at all, so this stays false unless the server confirms otherwise.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/refer")
      .then((res) => (res.ok ? res.json() : { available: false }))
      .then((data) => {
        if (!cancelled) setReferralAvailable(Boolean(data?.available));
      })
      .catch(() => {
        if (!cancelled) setReferralAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Availability is the only gate. It used to also require a narrative, which
  // only the guided flow supplied — so the free-text route never offered legal
  // aid at all, and the form now asks for a description itself when it was not
  // given one.
  const canRefer = referralAvailable;
  const severityLabel = t(
    locale,
    SEVERITY_KEYS[data.severity] || SEVERITY_KEYS.concerning
  );
  const severityColor =
    SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.concerning;

  const handleSave = () => {
    window.print();
  };

  /**
   * Shares Hifazat, deliberately not the assessment.
   *
   * A share sheet puts whatever it is given into WhatsApp, a group chat, or
   * wherever the person taps next, and their account of what happened to them
   * is the last thing that should travel that way by accident. So the payload
   * is the app and what it does — useful to pass to someone who needs it,
   * harmless if it lands in the wrong conversation.
   */
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "https://hifazat.app";
    const text = t(locale, "resultShareText");

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Hifazat", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // The person dismissed the share sheet, or the clipboard is unavailable.
      // Neither is worth an error message.
    }
  };

  const primaryCategory =
    data.classifications.length > 0
      ? data.classifications[0].category_name
      : "";

  // One column at every width. The two-column split put the law beside the
  // steps, which reads as two things to do at once, and the sticky left column
  // meant the page moved under you while you were reading it. A result is a
  // single argument — this happened, here is what to do, here is why — so it
  // gets a single reading order and room to breathe.
  return (
    <div className="flex flex-col gap-10 px-5 py-6 w-full max-w-[680px] mx-auto">
      {/* Print header — replaces the on-screen chrome on paper */}
      <div className="print-only mb-4">
        <h1 className="font-heading font-serif text-2xl text-hifazat-ink">
          {t(locale, "resultPrintHeading")}
        </h1>
        <p className="text-sm">
          {t(locale, "resultPrintedOn")}{" "}
          {new Date().toLocaleDateString(locale === "ur" ? "ur-PK" : "en-GB")}
        </p>
        <p className="text-sm mt-2">{t(locale, "resultPrintDisclaimer")}</p>
      </div>

      {/* Header — Logo + Language Toggle */}
      <div className="flex items-center justify-between no-print">
        <Link href="/" className="tappable inline-flex items-center min-h-[44px] pe-3">
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </div>

      {/* Top Bar — Go back + Save */}
      <div className="flex items-center gap-3 no-print">
        <Button
          onClick={onReset}
          variant="quiet"
          fullWidth={false}
          icon={<ArrowLeftIcon size={20} />}
          className="!px-4"
        >
          {t(locale, "goBack")}
        </Button>
        <Button
          onClick={handleSave}
          variant="surface"
          fullWidth={false}
          icon={<PrinterIcon size={18} />}
          className="!px-4 ms-auto"
        >
          {t(locale, "save")}
        </Button>
      </div>

      {/* A printed assessment is a physical object that can be found. Saying so
          is more use than any amount of on-screen privacy assurance. */}
      <details className="no-print">
        <summary className="text-sm text-muted-foreground cursor-pointer">
          {t(locale, "resultSaveOrPrint")}
        </summary>
        <p className="text-sm text-hifazat-ink/80 leading-relaxed mt-2 bg-warning-subtle border border-warning/45 rounded-[12px] p-3">
          {t(locale, "resultPrintWarning")}
        </p>
      </details>

      {/* Urgent Banner */}
      {data.is_urgent && (
        <Card tone="danger" elevation="soft" className="border-2 p-5 text-center flex flex-col gap-4">
          <p className="font-heading font-serif text-xl text-hifazat-ink">
            {t(locale, "resultUrgent")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="tel:15" variant="destructive" icon={<PhoneIcon size={18} />}>
              {t(locale, "resultCallPolice")}
            </Button>
            <Button href="tel:1099" variant="destructive" icon={<PhoneIcon size={18} />}>
              {t(locale, "resultCallHR")}
            </Button>
          </div>
        </Card>
      )}

      {/* Shown when the model was unreachable and this is the keyword fallback.
          Reading canned text believing it was written about your situation is
          worse than knowing it is generic — it is a legal decision made on a
          false premise. */}
      {data.degraded && (
        <Card tone="warning" elevation="soft" className="p-4 flex items-start gap-3">
          <span className="text-warning-strong shrink-0 mt-0.5">
            <AlertIcon size={20} />
          </span>
          <p className="text-sm text-hifazat-ink leading-relaxed">
            {t(locale, "resultDegraded")}
          </p>
        </Card>
      )}

      {/* What this is: the label, the sentence and the severity are one
          statement, so they sit together rather than as three loose blocks. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-base text-muted-foreground font-medium">
            {t(locale, "resultRecognisedAs")}
          </p>
          <h1 className="font-heading font-serif text-[36px] lg:text-[44px] leading-[1.15] text-hifazat-ink">
            {primaryCategory}
          </h1>
        </div>

        <p className="text-base text-hifazat-ink/80 leading-relaxed">{data.validation}</p>

        <div className="flex items-center gap-2.5">
          <span className="text-sm text-muted-foreground font-medium">
            {t(locale, "resultLegalSeverity")}
          </span>
          <span
            className={`inline-flex px-4 py-1 rounded-full text-sm font-semibold ${severityColor}`}
          >
            {severityLabel}
          </span>
        </div>
      </div>

      {/* The one thing to do next.
          This was previously the last control on the page, below the law, the
          steps, the directory and three housekeeping buttons — so the single
          most important action was the least likely to be seen. It belongs
          directly under the finding it follows from. */}
      <div className="flex flex-col gap-2.5 no-print">
        {data.primary_action ? (
          <Button
            href={
              data.primary_action.type === "call"
                ? `tel:${data.primary_action.value}`
                : data.primary_action.value
            }
            size="lg"
            icon={
              data.primary_action.type === "call" ? (
                <PhoneIcon size={20} />
              ) : (
                <GlobeIcon size={20} />
              )
            }
          >
            {data.primary_action.label}
          </Button>
        ) : (
          <Button href="https://complaint.hrs.gov.pk/" size="lg" icon={<GlobeIcon size={20} />}>
            {t(locale, "resultReportComplaint")}
          </Button>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {data.primary_action?.description || t(locale, "resultReportHelper")}
        </p>
      </div>

      {/* What you can do */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading font-serif text-[28px] leading-[1.2] text-hifazat-ink">
          {t(locale, "resultActionsHeading")}
        </h2>
        <div className="flex flex-col gap-3">
        {data.actions.map((a, i) => (
          // Three solid teal blocks in a column was the same colour shouting
          // three times; the steps are a numbered list, not three competing
          // offers. The card is a surface now and only the priority carries
          // colour, which is the part that actually differs between them.
          <Card
            key={i}
            elevation="soft"
            className="p-5 flex flex-col gap-3 print-block"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading font-serif text-lg leading-none">
                {i + 1}
              </span>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  PRIORITY_COLORS[a.priority] ?? PRIORITY_COLORS.immediate
                }`}
              >
                {t(locale, PRIORITY_KEYS[a.priority] || "resultPriorityImmediate")}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-semibold text-hifazat-ink leading-snug">
                {a.step}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {a.details.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j} className="font-semibold text-hifazat-ink">
                      {part.slice(2, -2)}
                    </strong>
                  ) : (
                    <span key={j}>{part}</span>
                  ),
                )}
              </p>
            </div>
          </Card>
        ))}
        </div>
      </section>

      {/* Lawyer referral — offered after the guidance, never before it, so
          nobody has to hand over a phone number to find out their rights. */}
      {/* Referral is an action, not a record — nothing to print. */}
      {canRefer &&
        (showReferral ? (
          <ReferralForm
            context={referralContext}
            narrative={referralNarrative}
            assessmentCategory={primaryCategory}
            assessmentSeverity={data.severity}
            onClose={() => setShowReferral(false)}
          />
        ) : (
          <Card tone="accent" elevation="card" className="p-6 flex flex-col gap-4 no-print">
            <div className="flex flex-col gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-surface-raised text-primary-strong">
                <ScalesIcon size={22} />
              </span>
              <h3 className="font-heading font-serif text-2xl text-hifazat-ink">
                {t(locale, "referralCtaTitle")}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t(locale, "referralCtaBody")}
              </p>
            </div>
            <Button onClick={() => setShowReferral(true)} size="lg">
              {t(locale, "referralCtaButton")}
            </Button>
          </Card>
        ))}

      {/* Legal breakdown */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading font-serif text-[28px] leading-[1.2] text-hifazat-ink">
          {t(locale, "resultClassificationsHeading")}
        </h2>
        <div className="flex flex-col gap-3">
        {data.classifications.map((c, i) => (
          <div
            key={i}
            className="bg-white border border-border rounded-[24px] px-4 py-6 flex flex-col gap-4 print-block"
          >
            <h3 className="text-[18px] font-semibold text-hifazat-ink">
              {c.indicator_name}
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              {c.explanation}
            </p>
            <div className="w-full px-4 py-2 rounded-[8px] bg-primary-subtle text-primary-strong text-base font-semibold text-left">
              <ul className="list-disc list-inside flex flex-col gap-1">
                {c.legal_reference.split(/;\s*/).map((ref, j) => (
                  <li key={j}>{ref.trim()}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        </div>
      </section>

      {/* Resources for you */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading font-serif text-[28px] leading-[1.2] text-hifazat-ink">
          {t(locale, "resultResourcesHeading")}
        </h2>
        <div className="flex flex-col gap-3">
        {data.resources.map((r, i) => (
          <Card key={i} className="px-4 py-5 flex flex-col gap-3 print-block">
            <h3 className="text-base font-semibold text-hifazat-ink">{r.name}</h3>
            <p className="text-base text-muted-foreground leading-relaxed">{r.why}</p>

            <div className="flex flex-col sm:flex-row gap-2">
              {r.phone && (
                // Only the first of these is filled. Four solid buttons in a
                // column read as four equally urgent calls to make, when the
                // list is ordered — the model puts the most relevant first.
                <Button
                  href={`tel:${r.phone}`}
                  variant={i === 0 ? "primary" : "outline"}
                  icon={<PhoneIcon size={18} />}
                >
                  <span dir="ltr">{r.phone}</span>
                </Button>
              )}
              {r.website && (
                <Button
                  href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                  variant="surface"
                  icon={<GlobeIcon size={18} />}
                >
                  {t(locale, "resourcesWebsite")}
                </Button>
              )}
            </div>

          </Card>
        ))}
        </div>
      </section>

      {/* Note — grouped as one block so the heading, the note and the reason
          read as one thought rather than three loose paragraphs. */}
      {data.note && (
        <Card tone="sunken" elevation="none" className="p-5 flex flex-col gap-2">
          <h3 className="text-base font-semibold text-hifazat-ink">
            {t(locale, "resultNote")}
          </h3>
          <p className="text-base font-semibold text-hifazat-ink leading-relaxed">
            {data.note}
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            {data.severity_explanation}
          </p>
        </Card>
      )}

      {/* Housekeeping. None of this is what the page is for, so all three are
          the same quiet weight and none of them competes with the actions
          above. */}
      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <Button onClick={handleShare} variant="quiet" size="sm" icon={<ShareIcon size={18} />}>
          {shareCopied ? t(locale, "resultShareCopied") : t(locale, "resultShare")}
        </Button>
        <Button onClick={onReset} variant="quiet" size="sm">
          {t(locale, "resultNewAssessment")}
        </Button>
        <Button href="/" variant="quiet" size="sm">
          {t(locale, "backHome")}
        </Button>
      </div>


      <div className="no-print">
        <SiteFooter />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";

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
}

const SEVERITY_KEYS = {
  concerning: "resultSeverityConcerning",
  serious: "resultSeveritySerious",
  critical: "resultSeverityCritical",
} as const;

const SEVERITY_COLORS = {
  concerning: "bg-hifazat-amber text-white",
  serious: "bg-hifazat-red text-white",
  critical: "bg-hifazat-red text-white",
};

const PRIORITY_KEYS = {
  immediate: "resultPriorityImmediate",
  short_term: "resultPriorityShort",
  longer_term: "resultPriorityLong",
} as const;

export default function AssessmentResult({
  data,
  onReset,
}: {
  data: AssessmentData;
  onReset: () => void;
}) {
  const { locale } = useLanguage();
  const severityLabel = t(
    locale,
    SEVERITY_KEYS[data.severity] || SEVERITY_KEYS.concerning
  );
  const severityColor =
    SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.concerning;

  const handleSave = () => {
    window.print();
  };

  const primaryCategory =
    data.classifications.length > 0
      ? data.classifications[0].category_name
      : "";

  const allCharges = data.classifications
    .map((c) => c.legal_reference)
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      {/* Header — Logo + Language Toggle */}
      <div className="flex items-center justify-between">
        <Link href="/">
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </div>

      {/* Top Bar — Go back + Save */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/5 text-base font-semibold text-hifazat-ink"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="rtl:rotate-180"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t(locale, "goBack")}
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-hifazat-dark-teal text-base font-semibold text-white"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 3.75v8.75m0 0l3.75-3.75m-3.75 3.75L6.25 8.75M3.75 16.25h12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t(locale, "save")}
        </button>
      </div>

      {/* Urgent Banner */}
      {data.is_urgent && (
        <div className="bg-hifazat-red-light border-2 border-hifazat-red rounded-[24px] p-5 text-center flex flex-col gap-4">
          <p className="font-heading font-serif text-xl text-hifazat-ink">
            {t(locale, "resultUrgent")}
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="tel:15"
              className="flex items-center justify-center w-full py-3.5 bg-hifazat-red text-white font-semibold rounded-full text-base"
            >
              {t(locale, "resultCallPolice")}
            </a>
            <a
              href="tel:1099"
              className="flex items-center justify-center w-full py-3.5 bg-hifazat-red text-white font-semibold rounded-full text-base"
            >
              {t(locale, "resultCallHR")}
            </a>
          </div>
        </div>
      )}

      {/* Validation — "What you describe is recognised as" */}
      <div className="flex flex-col gap-2">
        <p className="text-base text-hifazat-muted">
          {t(locale, "resultRecognisedAs")}
        </p>
        <h1 className="font-heading font-serif text-[32px] leading-[1.3] text-hifazat-ink">
          {primaryCategory}
        </h1>
        <p className="text-sm text-hifazat-muted">
          {t(locale, "resultCredibility")}
        </p>
      </div>

      {/* Validation text */}
      <p className="text-base text-hifazat-muted leading-relaxed">
        {data.validation}
      </p>

      {/* Severity + Charges side by side */}
      <div className="flex gap-2 items-start">
        {/* Severity */}
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-sm text-hifazat-muted font-semibold">
            {t(locale, "resultLegalSeverity")}
          </p>
          <span
            className={`inline-flex self-start px-6 py-1 rounded-full text-base font-semibold ${severityColor}`}
          >
            {severityLabel}
          </span>
        </div>
        {/* Charges */}
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-sm text-hifazat-muted font-semibold">
            {t(locale, "resultCharges")}
          </p>
          {allCharges.length > 0 ? (
            allCharges.map((charge, i) => (
              <p key={i} className="text-base font-semibold text-hifazat-ink">
                {charge}
              </p>
            ))
          ) : (
            <p className="text-base font-semibold text-hifazat-ink">—</p>
          )}
        </div>
      </div>

      {/* Classifications */}
      <div className="flex flex-col gap-4">
        {data.classifications.map((c, i) => (
          <div
            key={i}
            className="bg-white border border-hifazat-border rounded-[24px] px-4 py-6 flex flex-col gap-4"
          >
            <h3 className="text-[18px] font-semibold text-hifazat-ink">
              {c.indicator_name}
            </h3>
            <p className="text-sm text-hifazat-muted leading-relaxed">
              {c.explanation}
            </p>
            <div className="flex w-full justify-center px-4 py-2 rounded-[8px] bg-hifazat-teal-light text-hifazat-teal text-sm font-semibold text-center">
              {c.legal_reference}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <hr className="border-hifazat-border" />

      {/* What you can do */}
      <h2 className="font-heading font-serif text-[32px] leading-[1.3] text-hifazat-ink">
        {t(locale, "resultActionsHeading")}
      </h2>
      <div className="flex flex-col gap-4">
        {data.actions.map((a, i) => (
          <div
            key={i}
            className="bg-hifazat-teal rounded-[24px] pb-6 pt-4 px-6 flex flex-col gap-2"
          >
            {/* Priority pill at top */}
            <span className="inline-flex self-start px-4 py-1 rounded-full bg-white text-hifazat-teal text-sm font-semibold">
              {t(
                locale,
                PRIORITY_KEYS[a.priority] || "resultPriorityImmediate"
              )}
            </span>
            <div className="flex items-start gap-4">
              <span className="font-heading font-serif text-[32px] text-white/60 shrink-0 leading-[1.3] w-[18px] text-center">
                {i + 1}
              </span>
              <div className="flex-1 flex flex-col gap-2">
                <h3 className="text-[18px] font-semibold text-white">
                  {a.step}
                </h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  {a.details}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <hr className="border-hifazat-border" />

      {/* Resources for you */}
      <h2 className="font-heading font-serif text-[32px] leading-[1.3] text-hifazat-ink">
        {t(locale, "resultResourcesHeading")}
      </h2>
      <div className="flex flex-col gap-4">
        {data.resources.map((r, i) => (
          <div
            key={i}
            className="bg-white border border-hifazat-border rounded-[24px] px-4 py-6 flex flex-col gap-2"
          >
            <h3 className="text-base font-semibold text-hifazat-ink">
              {r.name}
            </h3>
            <a
              href={`tel:${r.phone}`}
              className="font-heading font-serif text-[32px] leading-none text-hifazat-teal"
            >
              {r.phone}
            </a>
            {r.website && (
              <a
                href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading font-serif text-[32px] leading-none text-hifazat-teal"
              >
                {r.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            <p className="text-sm text-hifazat-muted leading-relaxed">
              {r.why}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <hr className="border-hifazat-border" />

      {/* Note */}
      {data.note && (
        <>
          <div className="flex flex-col gap-4">
            <h3 className="font-heading font-serif text-[32px] leading-[1.3] text-hifazat-ink">
              {t(locale, "resultNote")}
            </h3>
            <p className="text-base font-bold text-hifazat-ink leading-relaxed">
              {data.note}
            </p>
            <p className="text-base text-hifazat-ink leading-relaxed">
              {data.severity_explanation}
            </p>
          </div>
          <hr className="border-hifazat-border" />
        </>
      )}

      {/* Dynamic CTA */}
      <div className="flex flex-col gap-2 items-center">
        {data.primary_action ? (
          <a
            href={
              data.primary_action.type === "call"
                ? `tel:${data.primary_action.value}`
                : data.primary_action.value
            }
            target={data.primary_action.type === "link" ? "_blank" : undefined}
            rel={data.primary_action.type === "link" ? "noopener noreferrer" : undefined}
            className="w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg flex items-center justify-center"
          >
            {data.primary_action.label}
          </a>
        ) : (
          <a
            href="https://complaint.hrs.gov.pk/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg flex items-center justify-center"
          >
            {t(locale, "resultReportComplaint")}
          </a>
        )}
        <p className="text-sm text-hifazat-muted text-center leading-relaxed">
          {data.primary_action?.description || t(locale, "resultReportHelper")}
        </p>
      </div>

      {/* Back home */}
      <Link
        href="/"
        className="w-full h-[52px] bg-white text-hifazat-teal font-semibold rounded-full text-lg border border-hifazat-teal flex items-center justify-center"
      >
        {t(locale, "backHome")}
      </Link>

      {/* Start new assessment */}
      <button
        onClick={onReset}
        className="text-base font-medium text-hifazat-muted"
      >
        {t(locale, "resultNewAssessment")}
      </button>

      {/* Footer */}
      <div className="bg-hifazat-footer rounded-[24px] p-6 flex flex-col items-center gap-4 text-center">
        <Image
          src="/logo.png"
          alt="Hifazat"
          width={120}
          height={32}
          className="h-6 w-auto"
        />
        <p className="text-sm text-hifazat-muted leading-relaxed">
          {t(locale, "footerDescription")}
        </p>
        <p className="text-sm text-hifazat-muted">
          {t(locale, "footerCredit")}{" "}
          <span className="font-semibold text-hifazat-ink">
            {t(locale, "footerAuthor")}
          </span>
        </p>
      </div>
    </div>
  );
}

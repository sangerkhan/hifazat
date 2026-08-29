"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { CheckIcon, PhoneIcon } from "@/components/ui/Icon";
import type { ReferralCaseContext } from "@/lib/referral";

type BestTime = "any" | "morning" | "afternoon" | "evening";

interface Props {
  /** Structured facts from the guided flow, used to route to the right desk. */
  context?: ReferralCaseContext;
  /** The account of the situation, so the lawyer does not start from nothing. */
  narrative: string;
  assessmentCategory?: string;
  assessmentSeverity?: string;
  onClose: () => void;
}

const TIME_KEYS: Record<BestTime, "referralTimeAny" | "referralTimeMorning" | "referralTimeAfternoon" | "referralTimeEvening"> = {
  any: "referralTimeAny",
  morning: "referralTimeMorning",
  afternoon: "referralTimeAfternoon",
  evening: "referralTimeEvening",
};

export default function ReferralForm({
  context,
  narrative,
  assessmentCategory,
  assessmentSeverity,
  onClose,
}: Props) {
  const { locale } = useLanguage();
  const isUrdu = locale === "ur";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  // Defaults to the cautious answer: for someone whose phone is monitored, a
  // surprise call from a lawyer can be the thing that escalates the danger.
  const [safeToCall, setSafeToCall] = useState(false);
  const [bestTime, setBestTime] = useState<BestTime>("any");
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError("");

    if (!name.trim() || !phone.trim()) {
      setError(t(locale, "referralRequiredFields"));
      return;
    }
    if (!consent) {
      setError(t(locale, "referralConsentRequired"));
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          city,
          safeToCall,
          bestTime,
          consent,
          narrative,
          context,
          locale,
          assessmentCategory,
          assessmentSeverity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error === "invalid_phone"
            ? t(locale, "referralInvalidPhone")
            : t(locale, "referralError"),
        );
        setSubmitting(false);
        return;
      }

      setReference(data.reference);
    } catch {
      setError(t(locale, "referralError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <Card tone="accent" elevation="float" className="p-6 flex flex-col gap-6">
        {/* Confirmation, reference and safety note are one thought, so they sit
            close together and the actions sit apart from them. */}
        <div className="flex flex-col gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hifazat-teal text-white">
            <CheckIcon size={24} />
          </span>
          <h3 className="font-heading font-serif text-2xl text-hifazat-ink">
            {t(locale, "referralSuccessTitle")}
          </h3>
          <p className="text-base text-hifazat-ink leading-relaxed">
            {t(locale, "referralSuccessBody")}
          </p>

          <Card tone="raised" elevation="soft" className="px-4 py-3 flex flex-col gap-0.5">
            <p className="text-sm text-hifazat-muted">{t(locale, "referralReference")}</p>
            <p
              className="font-heading font-serif text-2xl text-hifazat-teal tracking-wide"
              dir="ltr"
            >
              {reference}
            </p>
          </Card>

          <p className="text-sm text-hifazat-ink leading-relaxed font-medium">
            {t(locale, "referralSuccessSafety")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button href="tel:15" variant="danger" size="lg" icon={<PhoneIcon size={20} />}>
            {t(locale, "resultCallPolice")}
          </Button>
          <Button onClick={onClose} variant="ghost">
            {t(locale, "goBack")}
          </Button>
        </div>
      </Card>
    );
  }

  // 16px text is what actually stops iOS zooming the page when a field takes
  // focus, and min-h matches the 48px floor every button uses.
  const inputClass =
    "w-full min-h-[48px] px-4 py-3 text-base text-hifazat-ink bg-surface-raised border border-hifazat-border/60 shadow-[var(--shadow-soft)] rounded-[16px] transition-colors focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60";

  return (
    <Card elevation="float" className="p-6 flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h3 className="font-heading font-serif text-2xl text-hifazat-ink">
          {t(locale, "referralHeading")}
        </h3>
        <p className="text-base text-hifazat-muted leading-relaxed">
          {t(locale, "referralIntro")}
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <label htmlFor="referral-name" className="text-base font-semibold text-hifazat-ink">
          {t(locale, "referralName")}
        </label>
        <input
          id="referral-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(locale, "referralNamePlaceholder")}
          enterKeyHint="next"
          dir={isUrdu ? "rtl" : "ltr"}
          autoComplete="off"
          className={inputClass}
        />
        <p className="text-sm text-hifazat-muted">{t(locale, "referralNameHelp")}</p>
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-2">
        <label htmlFor="referral-phone" className="text-base font-semibold text-hifazat-ink">
          {t(locale, "referralPhone")}
        </label>
        <input
          id="referral-phone"
          type="tel"
          inputMode="tel"
          enterKeyHint="next"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t(locale, "referralPhonePlaceholder")}
          dir="ltr"
          autoComplete="off"
          className={`${inputClass} text-start`}
        />
        <p className="text-sm text-hifazat-muted">{t(locale, "referralPhoneHelp")}</p>
      </div>

      {/* Safe to call — the field that matters most for someone still living
          with the person who hurt them. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-base font-semibold text-hifazat-ink mb-1">
          {t(locale, "referralSafeToCall")}
        </legend>
        {(
          [
            [true, "referralSafeYes"],
            [false, "referralSafeNo"],
          ] as const
        ).map(([value, key]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setSafeToCall(value)}
            aria-pressed={safeToCall === value}
            className={`tappable w-full text-start min-h-[56px] px-4 py-3 rounded-[16px] text-base border flex items-center gap-3 ${
              safeToCall === value
                ? "bg-surface-accent border-hifazat-teal text-hifazat-ink font-medium shadow-[var(--shadow-soft)]"
                : "bg-surface-raised border-hifazat-border/60 text-hifazat-ink shadow-[var(--shadow-soft)]"
            }`}
          >
            {/* Neither answer advances the form, so the choice needs to stay
                visible — this matches the guided flow's multi-select. */}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                safeToCall === value
                  ? "bg-hifazat-teal border-hifazat-teal text-white"
                  : "border-hifazat-border"
              }`}
            >
              {safeToCall === value && <CheckIcon size={14} />}
            </span>
            <span className="flex-1">{t(locale, key)}</span>
          </button>
        ))}
        <p className="text-sm text-hifazat-muted">{t(locale, "referralSafeHelp")}</p>
      </fieldset>

      {/* Best time */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-base font-semibold text-hifazat-ink mb-1">
          {t(locale, "referralBestTime")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIME_KEYS) as BestTime[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setBestTime(value)}
              aria-pressed={bestTime === value}
              className={`tappable inline-flex items-center min-h-[44px] px-4 rounded-full text-base border ${
                bestTime === value
                  ? "bg-hifazat-teal border-hifazat-teal text-white font-medium shadow-[var(--shadow-soft)]"
                  : "bg-surface-raised border-hifazat-border/60 text-hifazat-muted shadow-[var(--shadow-soft)]"
              }`}
            >
              {t(locale, TIME_KEYS[value])}
            </button>
          ))}
        </div>
      </fieldset>

      {/* City */}
      <div className="flex flex-col gap-2">
        <label htmlFor="referral-city" className="text-base font-semibold text-hifazat-ink">
          {t(locale, "referralCity")}
        </label>
        <input
          id="referral-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t(locale, "referralCityPlaceholder")}
          enterKeyHint="done"
          dir={isUrdu ? "rtl" : "ltr"}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      {/* Consent */}
      {/* The checkbox itself is 24px; the whole card is the target, which is
          what makes consent tappable one-handed rather than a pixel hunt. */}
      <label
        className={`tappable flex items-start gap-3 cursor-pointer rounded-[16px] border p-4 ${
          consent
            ? "bg-surface-accent border-hifazat-teal"
            : "bg-surface-sunken border-transparent"
        }`}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-hifazat-teal)]"
        />
        <span className="text-base text-hifazat-ink leading-relaxed">
          {t(locale, "referralConsent")}
        </span>
      </label>

      <p className="text-sm text-hifazat-muted leading-relaxed">
        {t(locale, "referralPrivacy")}
      </p>

      {error && <p className="text-base text-hifazat-red">{error}</p>}

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="lg"
          icon={
            submitting ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : undefined
          }
        >
          {submitting ? t(locale, "referralSubmitting") : t(locale, "referralSubmit")}
        </Button>
        <Button onClick={onClose} disabled={submitting} variant="ghost">
          {t(locale, "referralCancel")}
        </Button>
      </div>
    </Card>
  );
}

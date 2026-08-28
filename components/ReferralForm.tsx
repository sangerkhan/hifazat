"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
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
      <div className="bg-hifazat-teal-light border-2 border-hifazat-teal rounded-[24px] p-6 flex flex-col gap-4">
        <h3 className="font-heading font-serif text-2xl text-hifazat-ink">
          {t(locale, "referralSuccessTitle")}
        </h3>
        <p className="text-base text-hifazat-ink leading-relaxed">
          {t(locale, "referralSuccessBody")}
        </p>

        <div className="bg-white rounded-[16px] px-4 py-3">
          <p className="text-sm text-hifazat-muted">{t(locale, "referralReference")}</p>
          <p className="font-heading font-serif text-2xl text-hifazat-teal tracking-wide" dir="ltr">
            {reference}
          </p>
        </div>

        <p className="text-sm text-hifazat-ink leading-relaxed font-medium">
          {t(locale, "referralSuccessSafety")}
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="tel:15"
            className="w-full h-[52px] bg-hifazat-red text-white font-semibold rounded-full text-lg flex items-center justify-center"
          >
            {t(locale, "resultCallPolice")}
          </a>
          <button
            onClick={onClose}
            className="w-full py-3 text-hifazat-muted font-medium text-base"
          >
            {t(locale, "goBack")}
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 text-base text-hifazat-ink bg-white border border-hifazat-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30 focus:border-hifazat-teal placeholder:text-hifazat-muted/60";

  return (
    <div className="bg-white border border-hifazat-border rounded-[24px] p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="font-heading font-serif text-2xl text-hifazat-ink">
          {t(locale, "referralHeading")}
        </h3>
        <p className="text-base text-hifazat-muted leading-relaxed">
          {t(locale, "referralIntro")}
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="referral-name" className="text-base font-semibold text-hifazat-ink">
          {t(locale, "referralName")}
        </label>
        <input
          id="referral-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(locale, "referralNamePlaceholder")}
          dir={isUrdu ? "rtl" : "ltr"}
          autoComplete="off"
          className={inputClass}
        />
        <p className="text-sm text-hifazat-muted">{t(locale, "referralNameHelp")}</p>
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="referral-phone" className="text-base font-semibold text-hifazat-ink">
          {t(locale, "referralPhone")}
        </label>
        <input
          id="referral-phone"
          type="tel"
          inputMode="tel"
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
            className={`w-full text-start px-4 py-3 rounded-[16px] text-base border transition-colors ${
              safeToCall === value
                ? "bg-hifazat-teal-light border-hifazat-teal text-hifazat-ink font-medium"
                : "bg-white border-hifazat-border text-hifazat-ink"
            }`}
          >
            {t(locale, key)}
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
              className={`px-4 py-2 rounded-full text-base border transition-colors ${
                bestTime === value
                  ? "bg-hifazat-teal-light border-hifazat-teal text-hifazat-ink font-medium"
                  : "bg-white border-hifazat-border text-hifazat-muted"
              }`}
            >
              {t(locale, TIME_KEYS[value])}
            </button>
          ))}
        </div>
      </fieldset>

      {/* City */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="referral-city" className="text-base font-semibold text-hifazat-ink">
          {t(locale, "referralCity")}
        </label>
        <input
          id="referral-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t(locale, "referralCityPlaceholder")}
          dir={isUrdu ? "rtl" : "ltr"}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-hifazat-teal)]"
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
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-[52px] bg-hifazat-teal text-white font-semibold rounded-full text-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t(locale, "referralSubmitting")}
            </>
          ) : (
            t(locale, "referralSubmit")
          )}
        </button>
        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full py-3 text-hifazat-muted font-medium text-base"
        >
          {t(locale, "referralCancel")}
        </button>
      </div>
    </div>
  );
}

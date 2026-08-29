"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface QueuedReferral {
  reference: string;
  received_at: string;
  urgency: "emergency" | "priority" | "standard";
  category_label: string;
  name: string;
  /** Masked on the server. The real number never reaches this list. */
  phone_masked: string;
  safe_to_call: boolean;
  best_time: string;
  province: string | null;
  city: string | null;
  locale: string;
  status: string;
  assigned_to: string | null;
  desk_notes: string | null;
  narrative: string;
  assessment_severity: string | null;
  hours_waiting: number;
}

const ACTOR_KEY = "hifazat-admin-verifier";

const NEXT_STATUSES = [
  { value: "assigned", label: "Assign" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Close" },
  { value: "unreachable", label: "Unreachable" },
];

const URGENCY_STYLES: Record<string, string> = {
  emergency: "bg-destructive text-destructive-foreground",
  priority: "bg-warning text-warning-foreground",
  standard: "bg-hifazat-bg text-muted-foreground",
};

export default function ReferralQueue({ referrals }: { referrals: QueuedReferral[] }) {
  const router = useRouter();
  const [actor, setActor] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Record<string, { phone: string; email: string | null }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTOR_KEY);
      if (saved) setActor(saved);
    } catch {
      // storage blocked
    }
  }, []);

  const remember = (value: string) => {
    setActor(value);
    try {
      localStorage.setItem(ACTOR_KEY, value);
    } catch {
      // not worth failing over
    }
  };

  const call = async (reference: string, payload: Record<string, unknown>) => {
    if (!actor.trim()) {
      setError("Enter your name first — access to contact details is recorded.");
      return null;
    }
    setBusy(reference);
    setError("");
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, actor: actor.trim(), ...payload }),
      });
      if (!res.ok) throw new Error("failed");
      return await res.json();
    } catch {
      setError("That did not work. Please try again.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const reveal = async (reference: string) => {
    const data = await call(reference, { action: "reveal" });
    if (data?.phone) {
      setRevealed((p) => ({ ...p, [reference]: { phone: data.phone, email: data.email } }));
    }
  };

  const setStatus = async (reference: string, status: string) => {
    const result = await call(reference, {
      action: "status",
      status,
      notes: notes[reference],
      assignedTo: status === "assigned" ? actor.trim() : undefined,
    });
    if (result) router.refresh();
  };

  const inputClass =
    "w-full px-3 py-2 text-sm bg-white border border-border rounded-[10px] focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-serif text-[32px] text-hifazat-ink">Referrals</h1>
        <p className="text-base text-muted-foreground mt-1 leading-relaxed">
          People who asked a lawyer to contact them, most urgent first. Contact details
          are hidden until you ask for them, and every reveal is recorded against your
          name.
        </p>
      </div>

      <div className="bg-primary-subtle border border-primary/25 rounded-[16px] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="actor" className="text-base font-semibold text-hifazat-ink shrink-0">
          Your name
        </label>
        <input
          id="actor"
          value={actor}
          onChange={(e) => remember(e.target.value)}
          placeholder="e.g. Ayesha (PNCY legal desk)"
          className={`${inputClass} sm:max-w-sm`}
        />
      </div>

      {error && <p className="text-base text-destructive-strong">{error}</p>}

      {referrals.length === 0 && (
        <div className="bg-white border border-border rounded-[24px] p-6">
          <p className="text-base text-muted-foreground">No open referrals.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {referrals.map((r) => {
          const shown = revealed[r.reference];
          const isBusy = busy === r.reference;

          return (
            <div
              key={r.reference}
              className={`bg-white border rounded-[20px] p-5 flex flex-col gap-3 ${
                r.urgency === "emergency" ? "border-destructive" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-sm font-semibold px-3 py-0.5 rounded-full ${
                        URGENCY_STYLES[r.urgency]
                      }`}
                    >
                      {r.urgency}
                    </span>
                    <span className="text-sm text-muted-foreground">{r.category_label}</span>
                    <span className="text-sm px-2 py-0.5 rounded-full bg-hifazat-bg text-muted-foreground">
                      {r.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      waiting {r.hours_waiting}h
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-hifazat-ink" dir="ltr">
                    {r.reference}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {r.name} · {[r.city, r.province].filter(Boolean).join(", ") || "location not given"}
                    {" · "}speaks {r.locale === "ur" ? "Urdu" : "English"}
                    {r.assigned_to ? ` · with ${r.assigned_to}` : ""}
                  </p>
                </div>
              </div>

              {/* The single most important thing on this screen. For someone still
                  living with the person who hurt them, an unexpected call can be
                  what escalates the danger. */}
              {!r.safe_to_call && (
                <div className="bg-destructive-subtle border-2 border-destructive rounded-[12px] px-4 py-3">
                  <p className="text-base font-semibold text-hifazat-ink">
                    Do not call this number first.
                  </p>
                  <p className="text-sm text-hifazat-ink/80 leading-relaxed">
                    They told us a call is not safe. Send a message and wait for a
                    reply before ringing.
                  </p>
                </div>
              )}
              {r.safe_to_call && (
                <p className="text-sm text-hifazat-ink">
                  Safe to call · best time: <strong>{r.best_time}</strong>
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground" dir="ltr">
                  {shown ? shown.phone : r.phone_masked}
                </span>
                {!shown ? (
                  <button
                    onClick={() => reveal(r.reference)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold border border-border text-hifazat-ink disabled:opacity-50"
                  >
                    Show contact details
                  </button>
                ) : (
                  <>
                    <a
                      href={`tel:${shown.phone}`}
                      className="px-3 py-1.5 rounded-full text-sm font-semibold bg-primary text-white"
                    >
                      Call
                    </a>
                    {shown.email && (
                      <a
                        href={`mailto:${shown.email}`}
                        className="px-3 py-1.5 rounded-full text-sm font-semibold border border-border text-hifazat-ink"
                      >
                        Email
                      </a>
                    )}
                  </>
                )}
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-primary-strong">
                  What they told us
                </summary>
                <p className="mt-2 text-hifazat-ink/80 leading-relaxed whitespace-pre-wrap bg-hifazat-bg rounded-[10px] p-3">
                  {r.narrative}
                </p>
              </details>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Desk notes</span>
                <textarea
                  rows={2}
                  value={notes[r.reference] ?? r.desk_notes ?? ""}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, [r.reference]: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                {NEXT_STATUSES.filter((s) => s.value !== r.status).map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(r.reference, s.value)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border border-border text-hifazat-ink hover:border-primary disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

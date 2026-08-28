"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { summariseAnswers, type Answers } from "@/lib/guided-flow";

export interface CachedEntry {
  cache_key: string;
  locale: string;
  answer_signature: Answers;
  context: Record<string, unknown>;
  response: {
    validation?: string;
    severity?: string;
    note?: string;
    is_urgent?: boolean;
    actions?: { step: string; details: string; priority: string }[];
    resources?: { name: string; phone?: string }[];
    classifications?: { indicator_name: string; legal_reference: string }[];
  };
  hit_count: number;
  review_status: string;
  reviewed_by: string | null;
  last_served_at: string | null;
}

const REVIEWER_KEY = "hifazat-admin-verifier";

const SEVERITIES = ["concerning", "serious", "critical"] as const;

export default function CacheReview({ entries }: { entries: CachedEntry[] }) {
  const router = useRouter();
  const [reviewer, setReviewer] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { validation?: string; note?: string; severity?: string }>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REVIEWER_KEY);
      if (saved) setReviewer(saved);
    } catch {
      // storage blocked
    }
  }, []);

  const remember = (value: string) => {
    setReviewer(value);
    try {
      localStorage.setItem(REVIEWER_KEY, value);
    } catch {
      // not worth failing over
    }
  };

  const act = async (
    cacheKey: string,
    status: string,
    extra: Record<string, unknown> = {},
  ) => {
    if (!reviewer.trim()) {
      setError("Enter your name first — reviews are attributed.");
      return;
    }
    setBusy(cacheKey);
    setError("");

    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cacheKey, status, reviewedBy: reviewer.trim(), ...extra }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      setError("That did not save. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const inputClass =
    "w-full px-3 py-2 text-sm bg-white border border-hifazat-border rounded-[10px] focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-serif text-[32px] text-hifazat-ink">
          Review answers
        </h1>
        <p className="text-base text-hifazat-muted mt-1 leading-relaxed">
          These are the answers real people received, ordered by how many. Correcting
          one here corrects it for everyone who lands in the same situation from now
          on — which makes the top of this list the most valuable hour of legal review
          available anywhere in this project.
        </p>
      </div>

      <div className="bg-hifazat-teal-light border border-hifazat-teal/30 rounded-[16px] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="reviewer" className="text-base font-semibold text-hifazat-ink shrink-0">
          Your name
        </label>
        <input
          id="reviewer"
          value={reviewer}
          onChange={(e) => remember(e.target.value)}
          placeholder="e.g. Ayesha (PNCY legal desk)"
          className={`${inputClass} sm:max-w-sm`}
        />
      </div>

      {error && <p className="text-base text-hifazat-red">{error}</p>}

      {entries.length === 0 && (
        <div className="bg-white border border-hifazat-border rounded-[24px] p-6">
          <p className="text-base text-hifazat-muted leading-relaxed">
            Nothing cached yet. Entries appear here once people complete the guided
            questionnaire without adding free text of their own — anything written in
            someone&apos;s own words is never cached or shown to anyone else.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {entries.map((entry) => {
          const rows = summariseAnswers(entry.answer_signature ?? {}, "", "en");
          const isOpen = open === entry.cache_key;
          const edit = edits[entry.cache_key] ?? {};
          const isBusy = busy === entry.cache_key;

          return (
            <div
              key={entry.cache_key}
              className="bg-white border border-hifazat-border rounded-[20px] p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[16rem]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-hifazat-ink">
                      Served {entry.hit_count} {entry.hit_count === 1 ? "time" : "times"}
                    </span>
                    {entry.response?.is_urgent && (
                      <span className="text-sm px-2 py-0.5 rounded-full bg-hifazat-red text-white">
                        urgent
                      </span>
                    )}
                    <span className="text-sm px-2 py-0.5 rounded-full bg-hifazat-bg text-hifazat-muted">
                      {entry.response?.severity ?? "—"}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded-full bg-hifazat-bg text-hifazat-muted">
                      {entry.locale}
                    </span>
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full ${
                        entry.review_status === "unreviewed"
                          ? "bg-hifazat-amber-light text-hifazat-amber"
                          : entry.review_status === "rejected"
                            ? "bg-hifazat-red-light text-hifazat-red"
                            : "bg-hifazat-teal-light text-hifazat-teal"
                      }`}
                    >
                      {entry.review_status}
                    </span>
                  </div>
                  <p className="text-sm text-hifazat-muted leading-relaxed">
                    {rows.map((r) => r.answer).join(" · ") || "no recorded answers"}
                  </p>
                </div>

                <button
                  onClick={() => setOpen(isOpen ? null : entry.cache_key)}
                  className="text-sm font-semibold text-hifazat-teal shrink-0"
                >
                  {isOpen ? "Hide" : "Read the answer"}
                </button>
              </div>

              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-hifazat-border pt-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rows.map((r) => (
                      <div key={r.stepId} className="text-sm">
                        <span className="text-hifazat-muted">{r.question} </span>
                        <span className="text-hifazat-ink font-medium">{r.answer}</span>
                      </div>
                    ))}
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-hifazat-ink">
                      What the person is told first
                    </span>
                    <textarea
                      rows={4}
                      value={edit.validation ?? entry.response?.validation ?? ""}
                      onChange={(e) =>
                        setEdits((p) => ({
                          ...p,
                          [entry.cache_key]: { ...p[entry.cache_key], validation: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-hifazat-ink">Severity</span>
                    {SEVERITIES.map((s) => {
                      const current = edit.severity ?? entry.response?.severity;
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setEdits((p) => ({
                              ...p,
                              [entry.cache_key]: { ...p[entry.cache_key], severity: s },
                            }))
                          }
                          className={`px-3 py-1 rounded-full text-sm border ${
                            current === s
                              ? "bg-hifazat-teal border-hifazat-teal text-white"
                              : "bg-white border-hifazat-border text-hifazat-muted"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {entry.response?.classifications?.length ? (
                    <div>
                      <span className="text-sm font-semibold text-hifazat-ink">
                        Law cited
                      </span>
                      <ul className="list-disc ps-5 mt-1">
                        {entry.response.classifications.map((c, i) => (
                          <li key={i} className="text-sm text-hifazat-muted">
                            {c.indicator_name} — {c.legal_reference}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {entry.response?.actions?.length ? (
                    <div>
                      <span className="text-sm font-semibold text-hifazat-ink">
                        Steps given
                      </span>
                      <ol className="list-decimal ps-5 mt-1 flex flex-col gap-1">
                        {entry.response.actions.map((a, i) => (
                          <li key={i} className="text-sm text-hifazat-muted">
                            <span className="text-hifazat-ink">{a.step}</span> — {a.details}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {entry.response?.resources?.length ? (
                    <p className="text-sm text-hifazat-muted">
                      <span className="font-semibold text-hifazat-ink">Referred to: </span>
                      {entry.response.resources
                        .map((r) => `${r.name}${r.phone ? ` (${r.phone})` : ""}`)
                        .join(", ")}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      onClick={() => act(entry.cache_key, "approved")}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-hifazat-teal text-white disabled:opacity-50"
                    >
                      Approve as is
                    </button>
                    <button
                      onClick={() => act(entry.cache_key, "edited", { edits: edit })}
                      disabled={isBusy || Object.keys(edit).length === 0}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-hifazat-dark-teal text-white disabled:opacity-50"
                    >
                      Save changes
                    </button>
                    <button
                      onClick={() => act(entry.cache_key, "rejected")}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-full text-sm font-semibold border border-hifazat-red text-hifazat-red disabled:opacity-50"
                    >
                      Reject — stop serving this
                    </button>
                  </div>
                  <p className="text-sm text-hifazat-muted">
                    A rejected answer is never served again; the next person in this
                    situation gets a freshly generated one.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

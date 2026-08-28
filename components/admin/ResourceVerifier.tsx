"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminResource {
  id: string;
  name: string;
  type: string;
  scope: string[];
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hours: string;
  verification: string;
  verify_note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  recheck_due_at: string | null;
  priority: number;
}

export interface CoverageRow {
  province: string;
  province_name: string;
  confirmed_local: number;
  unconfirmed_local: number;
}

const VERIFIER_KEY = "hifazat-admin-verifier";

export default function ResourceVerifier({
  resources,
  coverage,
}: {
  resources: AdminResource[];
  coverage: CoverageRow[];
}) {
  const router = useRouter();
  const [verifier, setVerifier] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"unconfirmed" | "confirmed" | "all">("unconfirmed");
  const [edits, setEdits] = useState<Record<string, Partial<AdminResource>>>({});

  // The desk shares one password, so the audit trail only means anything if the
  // person says who they are. Remembered so it is typed once per browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VERIFIER_KEY);
      if (saved) setVerifier(saved);
    } catch {
      // storage blocked; the field just starts empty
    }
  }, []);

  const rememberVerifier = (value: string) => {
    setVerifier(value);
    try {
      localStorage.setItem(VERIFIER_KEY, value);
    } catch {
      // not worth failing over
    }
  };

  const shown = useMemo(
    () =>
      resources.filter((r) =>
        filter === "all" ? true : r.verification === filter,
      ),
    [resources, filter],
  );

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    if (!verifier.trim()) {
      setError("Enter your name first — it goes in the audit trail.");
      return;
    }

    setBusy(id);
    setError("");

    try {
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, verifiedBy: verifier.trim(), ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "failed");
      }
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      router.refresh();
    } catch {
      setError("That did not save. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const setEdit = (id: string, field: keyof AdminResource, value: string) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const inputClass =
    "w-full px-3 py-2 text-sm bg-white border border-hifazat-border rounded-[10px] focus:outline-none focus:ring-2 focus:ring-hifazat-teal/30";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-serif text-[32px] text-hifazat-ink">
          Verify helplines
        </h1>
        <p className="text-base text-hifazat-muted mt-1 leading-relaxed">
          Dial the number, confirm the organisation still runs the service described,
          then confirm it here. Until you do, it is not shown to users as a
          tap-to-call link and the assessment will never recommend it.
        </p>
      </div>

      {/* Coverage — the gap report, worst first */}
      <div className="bg-white border border-hifazat-border rounded-[24px] p-5">
        <h2 className="text-base font-semibold text-hifazat-ink mb-3">
          Confirmed local helplines by province
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {coverage.map((row) => (
            <div
              key={row.province}
              className={`rounded-[12px] px-3 py-2 border ${
                row.confirmed_local === 0
                  ? "bg-hifazat-red-light border-hifazat-red"
                  : "bg-hifazat-bg border-hifazat-border"
              }`}
            >
              <div className="text-sm text-hifazat-muted">{row.province_name}</div>
              <div className="text-base font-semibold text-hifazat-ink">
                {row.confirmed_local} confirmed
                {row.unconfirmed_local > 0 && (
                  <span className="text-hifazat-muted font-normal">
                    {" "}· {row.unconfirmed_local} waiting
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Who is doing the verifying */}
      <div className="bg-hifazat-teal-light border border-hifazat-teal/30 rounded-[16px] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="verifier" className="text-base font-semibold text-hifazat-ink shrink-0">
          Your name
        </label>
        <input
          id="verifier"
          value={verifier}
          onChange={(e) => rememberVerifier(e.target.value)}
          placeholder="e.g. Ayesha (PNCY legal desk)"
          className={`${inputClass} sm:max-w-sm`}
        />
        <span className="text-sm text-hifazat-muted">
          Recorded against every change you make.
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["unconfirmed", "confirmed", "all"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              filter === value
                ? "bg-hifazat-teal border-hifazat-teal text-white"
                : "bg-white border-hifazat-border text-hifazat-muted"
            }`}
          >
            {value === "unconfirmed" ? "Awaiting verification" : value === "confirmed" ? "Confirmed" : "All"}
            {" "}({resources.filter((r) => value === "all" || r.verification === value).length})
          </button>
        ))}
      </div>

      {error && <p className="text-base text-hifazat-red">{error}</p>}

      <div className="flex flex-col gap-4">
        {shown.length === 0 && (
          <p className="text-base text-hifazat-muted">Nothing here.</p>
        )}

        {shown.map((r) => {
          const edit = edits[r.id] ?? {};
          const isBusy = busy === r.id;
          const dirty = Object.keys(edit).length > 0;

          return (
            <div
              key={r.id}
              className="bg-white border border-hifazat-border rounded-[20px] p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-hifazat-ink">{r.name}</h3>
                  <p className="text-sm text-hifazat-muted">
                    {r.type} · {r.scope.join(", ")} · priority {r.priority}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full shrink-0 ${
                    r.verification === "confirmed"
                      ? "bg-hifazat-teal-light text-hifazat-teal"
                      : "bg-hifazat-amber-light text-hifazat-amber"
                  }`}
                >
                  {r.verification === "confirmed" ? "Confirmed" : "Awaiting"}
                </span>
              </div>

              {r.verify_note && (
                <p className="text-sm text-hifazat-ink/80 bg-hifazat-bg rounded-[10px] px-3 py-2 leading-relaxed">
                  {r.verify_note}
                </p>
              )}

              {r.verified_by && (
                <p className="text-sm text-hifazat-muted">
                  Last touched by {r.verified_by}
                  {r.verified_at ? ` on ${new Date(r.verified_at).toLocaleDateString()}` : ""}
                  {r.recheck_due_at
                    ? ` · recheck due ${new Date(r.recheck_due_at).toLocaleDateString()}`
                    : ""}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {(["phone", "whatsapp", "email", "website"] as const).map((field) => (
                  <label key={field} className="flex flex-col gap-1">
                    <span className="text-sm text-hifazat-muted capitalize">{field}</span>
                    <input
                      value={(edit[field] as string) ?? r[field] ?? ""}
                      onChange={(e) => setEdit(r.id, field, e.target.value)}
                      dir="ltr"
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {dirty && (
                  <button
                    onClick={() => act(r.id, "update", edit)}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-hifazat-dark-teal text-white disabled:opacity-50"
                  >
                    Save details
                  </button>
                )}

                {r.verification === "unconfirmed" ? (
                  <button
                    onClick={() => act(r.id, "confirm")}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-hifazat-teal text-white disabled:opacity-50"
                  >
                    {isBusy ? "Saving..." : "I dialled this — confirm"}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      act(r.id, "unconfirm", {
                        note: "Marked unreachable during a recheck.",
                      })
                    }
                    disabled={isBusy}
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-hifazat-red text-hifazat-red disabled:opacity-50"
                  >
                    {isBusy ? "Saving..." : "Number is dead — unconfirm"}
                  </button>
                )}

                {r.phone && (
                  <a
                    href={`tel:${r.phone}`}
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-hifazat-border text-hifazat-ink"
                  >
                    Call {r.phone}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

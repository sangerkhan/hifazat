"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "rate_limited"
          ? "Too many attempts. Try again in a few minutes."
          : "That password is not correct.",
      );
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white border border-border rounded-[24px] p-6 flex flex-col gap-4"
      >
        <h1 className="font-heading font-serif text-2xl text-hifazat-ink">Hifazat admin</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This area contains personal details of people who have asked for help.
          Do not sign in on a shared or public device.
        </p>

        <label htmlFor="password" className="text-base font-semibold text-hifazat-ink">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 text-base bg-white border border-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
        />

        {error && <p className="text-base text-destructive-strong">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full h-[52px] bg-primary text-white font-semibold rounded-full text-lg disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

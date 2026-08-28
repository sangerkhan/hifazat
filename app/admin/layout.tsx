import { notFound } from "next/navigation";
import { isAdminConfigured } from "@/lib/admin/auth";

/**
 * With no ADMIN_PASSWORD set, the entire admin section returns 404 — not a
 * login page, not a 403. An unconfigured deploy should not advertise that there
 * is a door here at all.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminConfigured()) notFound();

  return (
    <div className="min-h-screen bg-hifazat-bg">
      {children}
    </div>
  );
}

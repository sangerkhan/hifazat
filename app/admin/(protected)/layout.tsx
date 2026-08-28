import { redirect } from "next/navigation";
import Link from "next/link";
import { hasAdminSession } from "@/lib/admin/auth";
import AdminNav from "@/components/admin/AdminNav";

/**
 * Everything in this route group requires a session. The guard sits here rather
 * than in proxy.ts so it runs in the Node runtime next to the data access, and
 * so a new admin page cannot be added without inheriting it.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasAdminSession())) redirect("/admin/login");

  return (
    <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/admin" className="font-heading font-serif text-2xl text-hifazat-ink">
          Hifazat admin
        </Link>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}

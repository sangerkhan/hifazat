"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Extended as each screen is built, so the nav never points at a 404.
const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/resources", label: "Verify helplines" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <nav className="flex items-center gap-1 flex-wrap">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active
                ? "bg-hifazat-teal text-white"
                : "text-hifazat-muted hover:bg-black/5"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="px-3 py-1.5 rounded-full text-sm font-medium text-hifazat-muted hover:bg-black/5"
      >
        Sign out
      </button>
    </nav>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";

/**
 * Shared footer and the app's only persistent navigation.
 *
 * Until now the directory was reachable only if the assessment happened to
 * recommend something from it — the landing page had no link to it at all.
 * Someone who just wants a phone number should not have to describe their
 * situation first.
 */
export default function SiteFooter({ showNav = true }: { showNav?: boolean }) {
  const { locale } = useLanguage();

  // /rights is added here once the library exists — a footer link to a 404 is
  // worse than no link.
  const links = [
    { href: "/resources", label: t(locale, "navResources") },
    { href: "/about", label: t(locale, "navAbout") },
  ];

  return (
    <footer className="bg-hifazat-footer rounded-[24px] p-6 flex flex-col items-center gap-4 text-center">
      <Image src="/logo.png" alt="Hifazat" width={120} height={32} className="h-6 w-auto" />

      {showNav && (
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-semibold text-hifazat-teal underline underline-offset-4"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      <p className="text-sm text-hifazat-muted leading-relaxed">
        {t(locale, "footerDescription")}
      </p>

      {/* The emergency numbers belong on every screen, not only where an
          assessment happens to surface them. */}
      <p className="text-sm text-hifazat-ink font-medium">
        {t(locale, "footerEmergency")}{" "}
        <a href="tel:15" className="font-semibold text-hifazat-red underline" dir="ltr">15</a>
        {" · "}
        <a href="tel:1099" className="font-semibold text-hifazat-red underline" dir="ltr">1099</a>
      </p>

      <p className="text-sm text-hifazat-muted">
        {t(locale, "footerCredit")}{" "}
        <a
          href="https://www.sangerkhan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-hifazat-ink underline"
        >
          {t(locale, "footerAuthor")}
        </a>
      </p>
    </footer>
  );
}

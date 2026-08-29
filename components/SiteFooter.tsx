"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BookIcon, InfoIcon, LifebuoyIcon, PhoneIcon } from "@/components/ui/Icon";

/**
 * Footer and secondary navigation.
 *
 * The emergency numbers used to sit here as 18px inline links, which is the
 * least pressable thing on the page and also the most important. They are
 * buttons now. So is everything else: a text link inside a paragraph is a
 * target you have to aim at.
 */
export default function SiteFooter({
  showNav = true,
  /** Off where the page already carries an emergency panel, so the numbers are
      not repeated twice on one screen. */
  showEmergency = true,
}: {
  showNav?: boolean;
  showEmergency?: boolean;
}) {
  const { locale } = useLanguage();

  const links = [
    { href: "/rights", label: t(locale, "navRights"), icon: <BookIcon size={18} /> },
    { href: "/resources", label: t(locale, "navResources"), icon: <LifebuoyIcon size={18} /> },
    { href: "/about", label: t(locale, "navAbout"), icon: <InfoIcon size={18} /> },
  ];

  return (
    <Card tone="sunken" elevation="none" as="aside" className="p-5 flex flex-col items-center gap-4 text-center">
      <Image src="/logo.png" alt="Hifazat" width={120} height={32} className="h-6 w-auto" />

      {showNav && (
        <nav className="grid gap-2 w-full sm:grid-cols-3">
          {links.map((link) => (
            <Button key={link.href} href={link.href} variant="surface" icon={link.icon}>
              {link.label}
            </Button>
          ))}
        </nav>
      )}

      {showEmergency && (
      <div className="w-full flex flex-col gap-2">
        <p className="text-sm text-hifazat-ink font-medium">{t(locale, "footerEmergency")}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button href="tel:15" variant="danger" icon={<PhoneIcon size={18} />}>
            {t(locale, "callPolice")}
          </Button>
          <Button href="tel:1099" variant="danger" icon={<PhoneIcon size={18} />}>
            {t(locale, "callHumanRights")}
          </Button>
        </div>
      </div>
      )}

      <p className="text-sm text-hifazat-muted leading-relaxed">
        {t(locale, "footerDescription")}
      </p>

      <a
        href="https://www.sangerkhan.com"
        target="_blank"
        rel="noopener noreferrer"
        className="tappable inline-flex items-center min-h-[44px] px-3 text-sm text-hifazat-muted"
      >
        {t(locale, "footerCredit")}{" "}
        <span className="font-semibold text-hifazat-ink underline ms-1">
          {t(locale, "footerAuthor")}
        </span>
      </a>
    </Card>
  );
}

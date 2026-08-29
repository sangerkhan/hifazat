"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import LanguageToggle from "@/components/LanguageToggle";

/**
 * Standard page frame: logo, language toggle, and a width chosen by content
 * type rather than one global cap.
 *
 * "form" stays narrow because a long line is harder to fill in; "prose" sits at
 * the comfortable reading measure; "wide" lets card grids use the screen.
 */
export type ShellWidth = "form" | "prose" | "wide" | "full";

const WIDTHS: Record<ShellWidth, string> = {
  form: "max-w-[620px]",
  prose: "max-w-[720px]",
  wide: "max-w-[1080px]",
  full: "max-w-[1280px]",
};

export default function PageShell({
  children,
  width = "form",
  className = "",
}: {
  children: ReactNode;
  width?: ShellWidth;
  className?: string;
}) {
  return (
    <div className={`flex flex-col min-h-screen w-full ${WIDTHS[width]} mx-auto ${className}`}>
      <header className="flex items-center justify-between gap-4 px-5 pt-6 pb-4">
        <Link
          href="/"
          className="tappable inline-flex items-center shrink-0 min-h-[44px] pe-3"
          aria-label="Hifazat home"
        >
          <Image src="/logo.png" alt="Hifazat" width={140} height={36} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </header>
      {children}
    </div>
  );
}

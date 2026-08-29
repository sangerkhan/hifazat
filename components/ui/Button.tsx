"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The one button.
 *
 * Nine screens were repeating the same long className strings, which is how
 * tap targets drift: some controls ended up 52px tall and some ended up being
 * 14px text pretending to be a control. Everything routes through here now, and
 * every variant is at least 48px tall — comfortably above the 44px both Apple
 * and WCAG treat as the floor, which matters more than usual for an app people
 * use one-handed while distressed.
 *
 * Renders an <a> for tel:/mailto:/external, a Next <Link> for internal routes,
 * and a <button> otherwise — so a control never loses the right semantics just
 * because it needs to look like a button.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "surface";

export type ButtonSize = "md" | "lg";

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon shown before the label. */
  icon?: ReactNode;
  /** Icon shown after the label, typically a chevron. */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

type Props = CommonProps &
  (
    | { href: string; external?: boolean; onClick?: never; type?: never }
    | { href?: never; external?: never; onClick?: () => void; type?: "button" | "submit" }
  );

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-hifazat-teal text-white border border-transparent shadow-[var(--shadow-primary)] hover:bg-hifazat-dark-teal",
  secondary:
    "bg-surface-raised text-hifazat-teal border border-hifazat-teal/30 shadow-[var(--shadow-soft)] hover:border-hifazat-teal",
  surface:
    "bg-surface-raised text-hifazat-ink border border-hifazat-border/60 shadow-[var(--shadow-soft)] hover:border-hifazat-teal/40",
  ghost:
    "bg-black/[0.045] text-hifazat-ink border border-transparent hover:bg-black/[0.075]",
  danger:
    "bg-hifazat-red text-white border border-transparent shadow-[var(--shadow-danger)] hover:brightness-95",
};

const SIZES: Record<ButtonSize, string> = {
  // Never below 48px: this is the floor, not a starting point to trim from.
  md: "min-h-[48px] px-5 text-base gap-2.5",
  lg: "min-h-[56px] px-6 text-lg gap-3",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  fullWidth = true,
  className = "",
  disabled = false,
  href,
  external,
  onClick,
  type = "button",
  ...rest
}: Props) {
  const classes = [
    "tappable liftable inline-flex items-center justify-center rounded-full font-semibold",
    SIZES[size],
    VARIANTS[variant],
    fullWidth ? "w-full" : "",
    disabled ? "opacity-50 pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className={trailingIcon ? "flex-1 text-center" : undefined}>{children}</span>
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </>
  );

  if (href) {
    // tel:, mailto: and off-site links are plain anchors; Link would try to
    // client-navigate them.
    const isPlainAnchor =
      external || /^(tel:|mailto:|https?:)/.test(href);

    if (isPlainAnchor) {
      return (
        <a
          href={href}
          className={classes}
          {...(external || href.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} {...rest}>
      {content}
    </button>
  );
}

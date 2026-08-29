"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The one button.
 *
 * There used to be two weights that mattered — solid teal and solid white —
 * and screens that needed four or five actions had to reach for one of them
 * every time. Six solid cards in a column all shout at the same volume, which
 * is the same as none of them shouting: the eye has nothing to land on.
 *
 * The range below is ordered by how much attention a control is asking for.
 * The rule for using it: **one `primary` per screen.** Everything else steps
 * down — `outline` for a real but secondary action, `subtle` for something on
 * a card, `quiet` for housekeeping like save or share, `link` for the rare
 * inline case. `destructive` is for emergencies and irreversible things, never
 * for emphasis.
 *
 * Renders an <a> for tel:/mailto:/external, a Next <Link> for internal routes,
 * and a <button> otherwise, so a control never loses the right semantics just
 * because of how it needs to look.
 */

const button = cva(
  [
    "tappable inline-flex items-center justify-center rounded-full font-semibold",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        /** The single thing this screen is asking for. */
        primary:
          "liftable bg-primary text-primary-foreground border border-transparent shadow-[var(--shadow-primary)] hover:bg-primary-strong",
        /** An emergency, or something that cannot be undone. */
        destructive:
          "liftable bg-destructive text-destructive-foreground border border-transparent shadow-[var(--shadow-danger)] hover:brightness-95",
        /** A real action, but not the one. Carries weight without a fill. */
        outline:
          "bg-transparent text-primary-strong border border-primary/35 hover:border-primary hover:bg-primary-subtle",
        /** Sits on a card or a tinted panel without competing with it. */
        subtle:
          "bg-primary-subtle text-primary-strong border border-transparent hover:bg-primary-subtle hover:border-primary/30",
        /** Housekeeping: save, share, change language, go back. */
        quiet:
          "bg-muted text-hifazat-ink border border-transparent hover:bg-muted/70",
        /** A raised neutral control, for card grids where a fill would be noise. */
        surface:
          "liftable bg-surface-raised text-hifazat-ink border border-border shadow-[var(--shadow-soft)] hover:border-primary/40",
        /** Genuinely inline, inside a sentence. Still a 44px target. */
        link: "bg-transparent text-primary-strong underline underline-offset-4 hover:text-primary",
      },
      size: {
        // Never below 44px: this is the floor, not a starting point to trim
        // from. `sm` exists for icon rows inside cards, not to shrink actions.
        sm: "min-h-[44px] px-4 text-sm gap-2",
        md: "min-h-[48px] px-5 text-base gap-2.5",
        lg: "min-h-[56px] px-6 text-lg gap-3",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", fullWidth: true },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof button>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof button>["size"]>;

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

export default function Button({
  children,
  variant,
  size,
  icon,
  trailingIcon,
  fullWidth,
  className,
  disabled = false,
  href,
  external,
  onClick,
  type = "button",
  ...rest
}: Props) {
  const classes = cn(button({ variant, size, fullWidth }), className);

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
    const isPlainAnchor = external || /^(tel:|mailto:|https?:)/.test(href);

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

import type { ReactNode } from "react";

/**
 * A surface.
 *
 * `elevation` is what separates a card from the page now, rather than a
 * hairline border on a background almost the same colour as the card. "flat"
 * still exists for dense lists where a stack of shadows would look like
 * corduroy.
 */

export type CardTone = "raised" | "sunken" | "accent" | "danger" | "warning" | "flat";
export type CardElevation = "none" | "soft" | "card" | "float";

const TONES: Record<CardTone, string> = {
  raised: "bg-surface-raised border-hifazat-border/50",
  sunken: "bg-surface-sunken border-transparent",
  accent: "bg-surface-accent border-hifazat-teal/20",
  danger: "bg-hifazat-red-light border-hifazat-red",
  warning: "bg-hifazat-amber-light border-hifazat-amber/40",
  flat: "bg-transparent border-transparent",
};

const ELEVATIONS: Record<CardElevation, string> = {
  none: "",
  soft: "shadow-[var(--shadow-soft)]",
  card: "shadow-[var(--shadow-card)]",
  float: "shadow-[var(--shadow-float)]",
};

export default function Card({
  children,
  tone = "raised",
  elevation = "card",
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  tone?: CardTone;
  elevation?: CardElevation;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={`rounded-[22px] border ${TONES[tone]} ${ELEVATIONS[elevation]} ${className}`}
    >
      {children}
    </Tag>
  );
}

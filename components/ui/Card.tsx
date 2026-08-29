import type { ReactNode } from "react";

/**
 * A surface.
 *
 * `elevation` is what separates a card from the page now, rather than a
 * hairline border on a background almost the same colour as the card. "flat"
 * still exists for dense lists where a stack of shadows would look like
 * corduroy.
 */

export type CardTone =
  | "raised"
  | "sunken"
  | "accent"
  | "danger"
  | "warning"
  | "info"
  | "success"
  | "flat";
export type CardElevation = "none" | "soft" | "card" | "float";

const TONES: Record<CardTone, string> = {
  raised: "bg-surface-raised border-border",
  sunken: "bg-muted border-transparent",
  accent: "bg-primary-subtle border-primary/20",
  danger: "bg-destructive-subtle border-destructive",
  warning: "bg-warning-subtle border-warning/45",
  info: "bg-info-subtle border-info/30",
  success: "bg-success-subtle border-success/30",
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

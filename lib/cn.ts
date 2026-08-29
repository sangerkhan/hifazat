import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type { ClassValue };

/**
 * Joins class names and lets a later Tailwind utility win over an earlier one
 * in the same group.
 *
 * Without this, a caller passing `className="bg-muted"` to a component whose
 * variant already sets `bg-primary` gets both, and which one applies depends
 * on their order in the stylesheet. That is how a design system quietly stops
 * being one.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

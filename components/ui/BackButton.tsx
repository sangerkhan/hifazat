"use client";

import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/i18n";
import Button from "./Button";
import { ArrowLeftIcon } from "./Icon";

/**
 * Going back was a 14px text link with an 16px chevron — under 24px of target
 * on the most-used control in the app. It is a button now, with a real hit area.
 */
export default function BackButton({
  href,
  onClick,
  label,
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
}) {
  const { locale } = useLanguage();
  const text = label ?? t(locale, "goBack");

  return (
    <Button
      variant="quiet"
      fullWidth={false}
      icon={<ArrowLeftIcon size={20} />}
      className="!px-4 self-start"
      {...(href ? { href } : { onClick })}
    >
      {text}
    </Button>
  );
}

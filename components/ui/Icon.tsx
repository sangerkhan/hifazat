/**
 * Inline icon set.
 *
 * Kept as local SVGs rather than an icon package: there are a dozen of them,
 * they need to inherit currentColor and flip under RTL, and a dependency that
 * ships thousands of glyphs to deliver twelve is not a good trade on a phone
 * over a slow connection.
 */

type IconProps = {
  size?: number;
  className?: string;
};

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export const PencilIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const ChecklistIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="m3 7 2 2 4-4" />
    <path d="m3 17 2 2 4-4" />
    <path d="M13 6h8" />
    <path d="M13 16h8" />
  </svg>
);

export const PhoneIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);

export const ShieldIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);

export const BookIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

export const LifebuoyIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
  </svg>
);

export const InfoIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-5M12 8h.01" />
  </svg>
);

export const ArrowLeftIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, `rtl:rotate-180 ${className ?? ""}`)}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const ArrowRightIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, `rtl:rotate-180 ${className ?? ""}`)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const ChevronDownIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const CheckIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

export const GlobeIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
  </svg>
);

export const MailIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const ShareIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 3v13" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);

export const PrinterIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M6 9V3h12v6" />
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <path d="M7 17h10v4H7z" />
  </svg>
);

export const AlertIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

/** Legal help. Scales rather than a gavel: a gavel reads as a court case
    someone has already been dragged into, which is not what this offers. */
export const ScalesIcon = ({ size = 24, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 3v18" />
    <path d="M8 21h8" />
    <path d="M3 7h18" />
    <path d="m6.5 7-3 6a3 3 0 0 0 6 0Z" />
    <path d="m17.5 7-3 6a3 3 0 0 0 6 0Z" />
  </svg>
);

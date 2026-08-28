"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Locale } from "./i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isUrdu: boolean;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  isUrdu: false,
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  // The saved language cannot be read during server rendering, so the first
  // paint is always English and we correct it on mount. That is a deliberate
  // one-time sync from an external store rather than a cascading render, which
  // is why the set-state-in-effect rule is suppressed here rather than obeyed.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hifazat-lang") as Locale | null;
      if (saved === "en" || saved === "ur") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(saved);
      }
    } catch {
      // Private browsing or blocked storage — English is a fine default.
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("hifazat-lang", newLocale);
    } catch {
      // The choice still applies for this session even if it cannot persist.
    }
  };

  const isUrdu = locale === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", locale);
      document.documentElement.setAttribute("data-locale", locale);
    }
  }, [dir, locale, mounted]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, isUrdu, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

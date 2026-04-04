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

  useEffect(() => {
    const saved = localStorage.getItem("hifazat-lang") as Locale | null;
    if (saved === "en" || saved === "ur") {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("hifazat-lang", newLocale);
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

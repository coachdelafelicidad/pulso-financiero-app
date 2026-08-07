"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations";

export type Lang = "es" | "en";

type LanguageCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageCtx>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pulso-lang");
      if (saved === "en" || saved === "es") setLangState(saved);
    } catch {}
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem("pulso-lang", l); } catch {}
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const entry = translations[key];
    if (!entry) return key;
    let str = entry[lang] ?? entry.es ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{{${k}}}`, String(v));
      }
    }
    return str;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

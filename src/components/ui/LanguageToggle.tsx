"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-black/[0.12] bg-white p-0.5 ${className}`}
      role="group"
      aria-label="Language / Idioma"
    >
      <button
        type="button"
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
        className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none transition-all ${
          lang === "es"
            ? "bg-[#06403C] text-white shadow-sm"
            : "text-black/45 hover:text-[#06403C]"
        }`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none transition-all ${
          lang === "en"
            ? "bg-[#06403C] text-white shadow-sm"
            : "text-black/45 hover:text-[#06403C]"
        }`}
      >
        EN
      </button>
    </div>
  );
}

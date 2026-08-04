"use client";

import { useState } from "react";

const APP_URL = "app.pulsofinanciero.okomosfinanzas.com";

type Tab = "iphone" | "android";

type Props = {
  onClose: () => void;
};

const IPHONE_STEPS = [
  `Abre ${APP_URL} en Safari.`,
  'Toca el botón de "Compartir" (el icono del cuadrado con la flecha hacia arriba en la barra inferior).',
  'Desplázate hacia abajo y selecciona "Agregar a la pantalla de inicio" (Add to Home Screen).',
  'Toca "Agregar" arriba a la derecha. ¡Listo! Tendrás el icono de PULSO en tu pantalla.',
];

const ANDROID_STEPS = [
  `Abre ${APP_URL} en Google Chrome.`,
  "Toca los tres puntos verticales arriba a la derecha.",
  'Selecciona "Instalar aplicación" o "Agregar a la pantalla principal".',
  "Confirma la instalación. ¡Listo! Ya aparecerá el icono de PULSO en tu menú.",
];

export function InstallAppModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("iphone");
  const steps = tab === "iphone" ? IPHONE_STEPS : ANDROID_STEPS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-app-title"
      onClick={onClose}
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#06403C]/35 px-5 py-8 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-black/[0.08] bg-[#F7F5F0] shadow-[0_40px_80px_-32px_rgba(6,64,60,0.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] px-7 pb-5 pt-7">
          <div>
            <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7DC242]">
              App en tu celular
            </div>
            <h2 id="install-app-title" className="font-poppins text-[22px] font-semibold -tracking-[0.02em] text-[#06403C]">
              Instalar Pulso Financiero
            </h2>
            <p className="mt-1 text-[13.5px] text-black/55">
              Accede como app nativa, en pantalla completa y con un solo toque.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.12] text-[16px] leading-none text-black/50 transition hover:border-[#06403C]/40 hover:text-[#06403C]"
          >
            ✕
          </button>
        </div>

        <div className="px-7 pt-5">
          <div className="flex rounded-xl bg-white p-1 shadow-[inset_0_0_0_1px_rgba(6,64,60,0.08)]">
            <button
              type="button"
              onClick={() => setTab("iphone")}
              className={`flex-1 rounded-lg py-2.5 text-[13px] font-medium transition ${
                tab === "iphone"
                  ? "bg-[#06403C] text-white shadow-sm"
                  : "text-black/55 hover:text-[#06403C]"
              }`}
            >
              📱 iPhone (Safari)
            </button>
            <button
              type="button"
              onClick={() => setTab("android")}
              className={`flex-1 rounded-lg py-2.5 text-[13px] font-medium transition ${
                tab === "android"
                  ? "bg-[#06403C] text-white shadow-sm"
                  : "text-black/55 hover:text-[#06403C]"
              }`}
            >
              🤖 Android (Chrome)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-7 py-6">
          {steps.map((step, i) => (
            <div key={step} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06403C] font-poppins text-[14px] font-semibold text-[#F7F5F0]">
                {i + 1}
              </span>
              <p className="pt-1 text-[14px] leading-relaxed text-black/70">{step}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.08] px-7 py-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-[#06403C] bg-white px-6 py-3 font-poppins text-[15px] font-medium text-[#06403C] transition hover:bg-[#06403C]/[0.05]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

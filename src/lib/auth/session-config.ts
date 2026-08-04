/** Duración de sesión persistente: 30 días */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Clave de almacenamiento en localStorage para la sesión de Supabase */
export const AUTH_STORAGE_KEY = "pulso-auth";

/** Preferencia local: activar acceso biométrico */
export const BIOMETRIC_PREF_KEY = "pulso-biometric-enabled";

/** Email guardado para login biométrico rápido */
export const BIOMETRIC_EMAIL_KEY = "pulso-biometric-email";

/** Cookie compartida para sincronizar sesión SSR ↔ cliente */
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
  maxAge: SESSION_MAX_AGE_SECONDS,
};

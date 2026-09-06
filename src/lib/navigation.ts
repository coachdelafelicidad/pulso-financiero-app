const FALLBACK = "/dashboard";

/** Only allow same-origin relative paths (blocks open redirects). */
export function safeInternalPath(value: string | null | undefined): string {
  if (!value) return FALLBACK;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return FALLBACK;
  }
  if (trimmed.includes("://")) return FALLBACK;
  return trimmed;
}

-- Límite de intentos de verificación para el OTP de recuperación de contraseña.
-- Sin esto, /api/auth/emergency-reset permitía probar los 1,000,000 de
-- combinaciones de un código de 6 dígitos dentro de su ventana de 15 min.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.password_reset_codes
  ADD COLUMN IF NOT EXISTS verify_attempts INT NOT NULL DEFAULT 0;

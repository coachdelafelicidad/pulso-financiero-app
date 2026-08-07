-- Tabla para almacenar credenciales WebAuthn / Passkeys (Face ID, Touch ID, Windows Hello)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  credential_id TEXT        NOT NULL UNIQUE,
  public_key    BYTEA       NOT NULL,
  counter       BIGINT      NOT NULL DEFAULT 0,
  device_name   TEXT,
  transports    TEXT[],
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS webauthn_credentials_email_idx
  ON public.webauthn_credentials(email);

CREATE INDEX IF NOT EXISTS webauthn_credentials_user_id_idx
  ON public.webauthn_credentials(user_id);

-- RLS: habilitado — el cliente admin (service_role) bypasea las políticas
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden leer sus propias credenciales (para futuras consultas cliente)
CREATE POLICY "users_read_own_credentials"
  ON public.webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

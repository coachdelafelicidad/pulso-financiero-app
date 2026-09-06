INSERT INTO public.vip_emails (email, nota)
VALUES
  ('mario.mojica@gmail.com', 'CEO — Gmail de acceso'),
  ('mario_mojica@hotmail.com', 'CEO — Hotmail'),
  ('anaosorno@hotmail.com', 'Equipo Okomos'),
  ('anaosornopulido@gmail.com', 'Equipo Okomos — Gmail'),
  ('lacoachdelafelicidad@gmail.com', 'Equipo Okomos'),
  ('diego.mojica@gmail.com', 'Diego Mojica'),
  ('diego_mojica@hotmail.com', 'Diego Mojica — Hotmail'),
  ('pulso-test-1783450402@mailinator.com', 'Cuenta de prueba interna'),
  ('pulso-custom-1783450430@mailinator.com', 'Cuenta de prueba interna'),
  ('smtp-test-1783466273@mailinator.com', 'Cuenta de prueba interna')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_vip()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vip_emails v
    WHERE lower(trim(v.email)) = lower(trim(COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      auth.jwt() ->> 'email',
      ''
    )))
  );
$$;

REVOKE ALL ON FUNCTION public.current_auth_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_user_vip() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_auth_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_vip() TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can check if their own email is VIP" ON public.vip_emails;
CREATE POLICY "Users can check if their own email is VIP"
ON public.vip_emails
FOR SELECT
TO authenticated
USING (lower(trim(email)) = lower(trim(COALESCE(public.current_auth_email(), ''))));

NOTIFY pgrst, 'reload schema';

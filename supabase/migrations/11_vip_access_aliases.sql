INSERT INTO public.vip_emails (email, nota)
VALUES
  ('mario.mojica@gmail.com', 'CEO — correo de acceso a la app'),
  ('anaosorno@hotmail.com', 'Equipo Okomos')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_current_user_vip()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vip_emails
    WHERE lower(trim(email)) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_vip() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_vip() TO authenticated, service_role;

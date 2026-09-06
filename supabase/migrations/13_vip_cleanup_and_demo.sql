DELETE FROM public.vip_emails
WHERE lower(email) IN (
  'diego.mojica@gmail.com',
  'diego_mojica@hotmail.com',
  'pulso-test-1783450402@mailinator.com',
  'pulso-custom-1783450430@mailinator.com',
  'smtp-test-1783466273@mailinator.com'
);

INSERT INTO public.vip_emails (email, nota)
VALUES ('demo.panaderia@okomosfinanzas.com', 'Demo interno — Panadería El Trigo')
ON CONFLICT (email) DO NOTHING;

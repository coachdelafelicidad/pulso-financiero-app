# Pulso Financiero — App

Sistema de seguimiento financiero para PyMEs mexicanas.  
Plan Mensual: $499 MXN/mes.

---

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New project.
2. Nombrar el proyecto `pulso-financiero` (o cualquier nombre).
3. Guardar la contraseña de la base de datos.
4. Una vez creado, ir a **Settings → API** y copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. SQL para crear las tablas y RLS

Ejecutar en **SQL Editor** de Supabase:

```sql
-- Tabla de perfiles de usuario
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada usuario solo ve su propio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Tabla de scores del plan mensual
CREATE TABLE pulso_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ventas NUMERIC NOT NULL,
  gastos NUMERIC NOT NULL,
  efectivo NUMERIC NOT NULL,
  cobranza NUMERIC NOT NULL,
  score_liquidez INT NOT NULL,
  score_rentabilidad INT NOT NULL,
  score_planeacion INT NOT NULL,
  score_general INT NOT NULL,
  dias_cobertura NUMERIC NOT NULL,
  margen_real NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada usuario solo ve sus propios scores
ALTER TABLE pulso_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scores"
  ON pulso_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores"
  ON pulso_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tabla para quiz gratuito (sin login)
CREATE TABLE registros_pulso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  negocio TEXT,
  respuestas JSONB NOT NULL,
  score_liquidez INT NOT NULL,
  score_rentabilidad INT NOT NULL,
  score_planeacion INT NOT NULL,
  score_general INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo INSERT público, sin login
ALTER TABLE registros_pulso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert registro"
  ON registros_pulso FOR INSERT
  WITH CHECK (true);
```

---

## 3. Variables de entorno

Copiar `.env.example` a `.env.local` y llenar los valores:

```bash
cp .env.example .env.local
```

---

## 4. Correr localmente

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## 5. Desplegar en Vercel

1. Push del repo a GitHub.
2. En [vercel.com](https://vercel.com): Import Project → seleccionar el repo.
3. En **Environment Variables**, agregar las mismas variables de `.env.example` con sus valores reales.
4. Deploy.

---

## Flujo de conversión (quiz gratuito → plan mensual)

- Primera vez que el usuario completa el quiz → resultado gratuito, sin upgrade CTA.
- Segunda vez en adelante → aparece CTA de Plan Mensual ($499/mes).
- El cobro con Stripe/MercadoPago está preparado como hook en `/dashboard` pero no implementado en MVP — se activa en fase 2.

---

## Roadmap

| Fase | Qué incluye |
|------|-------------|
| MVP (actual) | Landing, auth, quiz con historial, dashboard con semáforo + calculadoras + gráfica |
| Fase 2 | Panel de Mario (cartera de clientes), tareas asignadas, reporte PDF automático, cobro con Stripe/MercadoPago |
| Fase 3 | Benchmarking por industria, chat con IA, conexión bancaria (Belvo) |

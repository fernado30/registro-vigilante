CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vigilante TEXT NOT NULL,
  fecha DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  puesto TEXT NOT NULL DEFAULT 'Porteria principal',
  observaciones TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'programado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT turnos_horas_validas CHECK (hora_fin > hora_inicio),
  CONSTRAINT turnos_fecha_rango CHECK (fecha_fin >= fecha)
);

ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS vigilante TEXT NOT NULL DEFAULT 'Sin asignar',
  ADD COLUMN IF NOT EXISTS fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS hora_inicio TIME NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS hora_fin TIME NOT NULL DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS puesto TEXT NOT NULL DEFAULT 'Porteria principal',
  ADD COLUMN IF NOT EXISTS observaciones TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'programado',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.turnos
SET vigilante = 'Sin asignar'
WHERE vigilante IS NULL OR trim(vigilante) = '';

UPDATE public.turnos
SET puesto = 'Porteria principal'
WHERE puesto IS NULL OR trim(puesto) = '';

UPDATE public.turnos
SET observaciones = ''
WHERE observaciones IS NULL;

UPDATE public.turnos
SET status = 'programado'
WHERE status IS NULL OR trim(status) = '';

UPDATE public.turnos
SET fecha_fin = fecha;

ALTER TABLE public.turnos
  DROP CONSTRAINT IF EXISTS turnos_fecha_rango;

ALTER TABLE public.turnos
  ADD CONSTRAINT turnos_fecha_rango CHECK (fecha_fin >= fecha);

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.turnos TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir lectura turnos" ON public.turnos;
DROP POLICY IF EXISTS "Permitir insercion turnos" ON public.turnos;
DROP POLICY IF EXISTS "Permitir actualizacion turnos" ON public.turnos;
DROP POLICY IF EXISTS "Permitir borrado turnos" ON public.turnos;

CREATE POLICY "Permitir lectura turnos" ON public.turnos
FOR SELECT
USING (true);

CREATE POLICY "Permitir insercion turnos" ON public.turnos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir actualizacion turnos" ON public.turnos
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir borrado turnos" ON public.turnos
FOR DELETE
USING (true);

CREATE OR REPLACE FUNCTION public.set_turnos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_turnos_updated_at ON public.turnos;
CREATE TRIGGER trigger_set_turnos_updated_at
BEFORE UPDATE ON public.turnos
FOR EACH ROW
EXECUTE FUNCTION public.set_turnos_updated_at();

NOTIFY pgrst, 'reload schema';

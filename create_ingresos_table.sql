-- Crear tabla ingresos si no existe
CREATE TABLE IF NOT EXISTS public.ingresos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  documento TEXT NOT NULL,
  apartamento_destino TEXT NOT NULL,
  tipo_visita TEXT NOT NULL,
  vigilante TEXT NOT NULL DEFAULT 'Sin asignar',
  tiene_vehiculo BOOLEAN NOT NULL DEFAULT FALSE,
  placa_vehiculo TEXT,
  tipo_vehiculo TEXT,
  estado TEXT NOT NULL DEFAULT 'adentro',
  hora_salida TIMESTAMPTZ,
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la tabla ya existia, agregar las columnas nuevas
ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS vigilante TEXT NOT NULL DEFAULT 'Sin asignar',
  ADD COLUMN IF NOT EXISTS tiene_vehiculo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placa_vehiculo TEXT,
  ADD COLUMN IF NOT EXISTS tipo_vehiculo TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'adentro',
  ADD COLUMN IF NOT EXISTS hora_salida TIMESTAMPTZ;

-- Asegurar que los registros antiguos queden marcados como adentro
UPDATE public.ingresos
SET estado = 'adentro'
WHERE estado IS NULL;

UPDATE public.ingresos
SET vigilante = 'Sin asignar'
WHERE vigilante IS NULL OR trim(vigilante) = '';

-- Habilitar RLS
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;

-- Asegurar permisos para la API de Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ingresos TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ingresos_id_seq TO anon, authenticated, service_role;

-- Politicas para lecturas e inserciones
DROP POLICY IF EXISTS "Permitir inserciones" ON public.ingresos;
DROP POLICY IF EXISTS "Permitir lecturas" ON public.ingresos;

CREATE POLICY "Permitir inserciones" ON public.ingresos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir lecturas" ON public.ingresos
FOR SELECT
USING (true);

-- Refrescar la cache de PostgREST para que reconozca la tabla y las columnas nuevas
NOTIFY pgrst, 'reload schema';

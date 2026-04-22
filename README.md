# Sistema de Vigilancia

Proyecto fullstack con:

- `frontend/`: React + Vite
- `backend/api/`: funciones serverless para Vercel
- `Supabase`: autenticacion y base de datos

## Despliegue unico en Vercel

El repo ya esta preparado para desplegarse como un solo proyecto en Vercel:

- el build sale desde la raiz con `npm run build`
- el frontend se publica desde `frontend/dist`
- las funciones backend quedan expuestas en `/api/*`

### Variables de entorno en Vercel

Configura estas variables en el proyecto:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Comandos utiles

```bash
npm install
npm run build
```

Luego puedes desplegar con:

```bash
vercel
vercel --prod
```

## Arreglo de `ingresos`

Si aparece un error de schema en `ingresos`, aplica [create_ingresos_table.sql](./create_ingresos_table.sql) en el SQL Editor de Supabase.

Ese script:

- crea `public.ingresos`
- agrega columnas nuevas como `vigilante`
- habilita RLS
- refresca la cache de PostgREST con `NOTIFY pgrst, 'reload schema';`

# Supabase Setup for Despensa Familiar

## 1. Crear el proyecto Supabase
1. Abrir supabase.com y crear un nuevo proyecto.
2. Configurar Auth:
   - Email/contraseña.
   - Google OAuth como proveedor adicional.

## 2. Variables de entorno
Crear `.env.local` copiando `.env.example` y completando:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo para server-side; no usar en el navegador)

## 3. Crear bucket de Storage
1. Ir a `Storage` en el proyecto Supabase.
2. Crear un bucket llamado `product-photos`.
3. Recomiendo mantenerlo privado y servir fotos con URLs firmadas.
   - Si quieres un acceso más rápido ahora, puedes crear el bucket como público.
4. Desde el frontend, sube las fotos con `supabase.storage.from('product-photos').upload(...)`.

## 4. Ejecutar el SQL
1. Abrir `supabase.sql` y ejecutarlo en el SQL editor.
2. Esto creará las tablas `categorias` y `productos` y activará RLS.

## 5. Tablas principales
- `categorias`: categorías editables por cada usuario.
- `productos`: inventario + lista con estado y foto.

## 6. Flujo preparado para el futuro
- La tabla `productos` incluye `metadata jsonb` para guardar datos adicionales.
- Esto permite añadir un escáner de tickets / OCR más tarde sin rehacer la tabla.

## 7. Conexión desde el proyecto
- El cliente Supabase ya está configurado en `src/lib/supabaseClient.ts`.
- Usa `supabase.auth` y la tabla `productos` para construir la app.

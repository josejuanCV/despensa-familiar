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

## 3. Crear bucket de Storage (OBLIGATORIO para las fotos)
La despensa exige una foto por producto, así que sin el bucket la subida falla.

**Opción A (recomendada, automática):** abre el SQL editor y ejecuta `supabase-storage.sql`.
Crea el bucket `product-photos` (público) y las políticas para que cada usuario
suba/borre solo en su propia carpeta (`<uid>/<archivo>`).

**Opción B (manual desde el panel):**
1. Ir a `Storage` → `New bucket`.
2. Nombre: `product-photos`. Marca **Public bucket**.
3. Aun así, añade las políticas de `insert/update/delete` de `supabase-storage.sql`
   para que los usuarios autenticados puedan subir (un bucket público solo abre la lectura).

La app sube las fotos con `supabase.storage.from('product-photos').upload(...)`
y guarda la URL pública en `productos.foto_url`.

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

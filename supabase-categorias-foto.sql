-- Foto opcional para las categorías de Despensa Familiar.
-- Ejecuta esto en el SQL editor de Supabase.
-- Añade la columna foto_url a la tabla categorias (la foto es opcional).

alter table categorias
  add column if not exists foto_url text;

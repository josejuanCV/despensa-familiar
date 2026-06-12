-- Storage para las fotos de producto de Despensa Familiar.
-- Ejecuta esto en el SQL editor de Supabase (después de supabase.sql).
-- Crea el bucket "product-photos" y sus políticas de acceso.

-- 1) Bucket público (las URLs de las fotos se pueden leer directamente).
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

-- 2) Políticas sobre storage.objects.
--    Las fotos se suben en una carpeta por usuario: "<uid>/<archivo>".
--    Cada usuario solo puede escribir/borrar en su propia carpeta.

-- Lectura pública (el bucket es público).
create policy "product_photos_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-photos');

-- Subir solo a tu propia carpeta.
create policy "product_photos_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Actualizar solo tus propias fotos.
create policy "product_photos_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Borrar solo tus propias fotos.
create policy "product_photos_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

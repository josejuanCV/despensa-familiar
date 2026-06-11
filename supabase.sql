-- Supabase schema for Despensa Familiar
-- Run this in the Supabase SQL editor after creating your project.
-- This includes both table definitions and RLS policies.

create extension if not exists "pgcrypto";

-- Categorías de producto por usuario
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  nombre text not null,
  orden int not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table categorias enable row level security;

create policy categorias_select
  on categorias
  for select
  using (user_id = auth.uid());

create policy categorias_insert
  on categorias
  for insert
  with check (user_id = auth.uid());

create policy categorias_update
  on categorias
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy categorias_delete
  on categorias
  for delete
  using (user_id = auth.uid());

-- Productos de despensa / lista de la compra
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  nombre text not null,
  categoria_id uuid references categorias(id) on delete set null,
  cantidad text,
  foto_url text,
  estado text not null default 'falta' check (estado in ('hay','falta','comprado')),
  en_lista boolean not null default false,
  metadata jsonb not null default '{}' ,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table productos enable row level security;

create policy productos_select
  on productos
  for select
  using (user_id = auth.uid());

create policy productos_insert
  on productos
  for insert
  with check (user_id = auth.uid());

create policy productos_update
  on productos
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy productos_delete
  on productos
  for delete
  using (user_id = auth.uid());

-- Future-ready note:
-- The `metadata` jsonb field can store OCR/import hints, receipt item data,
-- or other enrichment later, so adding a ticket scanner feature won't require a
-- major schema change.

-- Tabela para páginas de documentação (HTML/Markdown) com suporte a página principal
create extension if not exists "pgcrypto";

create table if not exists public.documentation_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null,
  is_main boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Permitir somente uma página marcada como principal
create unique index if not exists documentation_pages_main_idx
  on public.documentation_pages (is_main)
  where is_main = true;

-- Atualiza updated_at automaticamente
create or replace function public.set_documentation_pages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_documentation_pages_updated_at
before update on public.documentation_pages
for each row
execute function public.set_documentation_pages_updated_at();

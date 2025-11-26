-- =====================================================
-- Migration: Módulo de Boas Práticas (Kaizen)
-- Aplicação: Supabase/PostgreSQL
-- Obs.: Campo contrato mantido como varchar sem FK
--       para evitar acoplamento a coluna inexistente.
-- =====================================================

-- Extensões necessárias
create extension if not exists pgcrypto;

-- Enum de status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'boaspraticas_status') then
    create type boaspraticas_status as enum (
      'Aguardando avaliacao do sesmt',
      'Aguardando avaliacao da gestao',
      'Aguardando votacao trimestral',
      'Aguardando votacao anual',
      'Concluído'
    );
  end if;
end $$;

-- Tabelas catálogo (domínios)
create table if not exists boaspraticas_area_aplicada (
  id serial primary key,
  nome text not null,
  created_at timestamptz default now()
);

create table if not exists boaspraticas_pilar (
  id serial primary key,
  nome text not null,
  created_at timestamptz default now()
);

create table if not exists boaspraticas_elimina_desperdicio (
  id serial primary key,
  nome text not null,
  created_at timestamptz default now()
);

create table if not exists boaspraticas_tags_catalogo (
  id serial primary key,
  nome text not null,
  created_at timestamptz default now()
);

create table if not exists boaspraticas_categoria (
  id serial primary key,
  nome text not null,
  created_at timestamptz default now()
);

-- Itens de avaliacao (questionario futuro)
create table if not exists boaspraticas_itens_avaliacao (
  id serial primary key,
  item text not null,
  created_at timestamptz default now()
);

-- Respostas de avaliacao
create table if not exists boaspraticas_respostas_avaliacao (
  id bigserial primary key,
  pratica_id uuid not null references boaspraticas_praticas(id) on delete cascade,
  item_id int not null references boaspraticas_itens_avaliacao(id) on delete cascade,
  resposta boolean not null,
  avaliador_matricula int not null references usuarios(matricula),
  created_at timestamptz default now()
);

-- Responsaveis por contrato
create table if not exists boaspraticas_responsaveis_contratos (
  id serial primary key,
  codigo_contrato varchar(50) not null references contratos(codigo),
  responsavel_sesmt int not null references usuarios(matricula),
  responsavel_gestor int not null references usuarios(matricula),
  created_at timestamptz default now()
);

-- Principal: boas práticas
create table if not exists boaspraticas_praticas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  descricao_problema text,
  objetivo text,
  area_aplicada int references boaspraticas_area_aplicada(id),
  data_implantacao date,
  pilar int references boaspraticas_pilar(id),
  elimina_desperdicio int references boaspraticas_elimina_desperdicio(id),
  contrato varchar(50),
  status boaspraticas_status not null default 'Aguardando avaliacao do sesmt',
  relevancia int,
  resultados text,
  geral boolean not null default false,
  responsavel_etapa int references usuarios(matricula),
  categoria int references boaspraticas_categoria(id),
  fabricou_dispositivo boolean not null default false,
  projeto text,
  matricula_cadastrante int not null references usuarios(matricula),
  tags int[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Envolvidos
create table if not exists boaspraticas_envolvidos (
  id bigserial primary key,
  pratica_id uuid not null references boaspraticas_praticas(id) on delete cascade,
  matricula_envolvido int not null references usuarios(matricula),
  created_at timestamptz default now()
);

-- Evidências
create table if not exists boaspraticas_evidencias (
  id uuid primary key default gen_random_uuid(),
  pratica_id uuid not null references boaspraticas_praticas(id) on delete cascade,
  url text not null,
  categoria varchar(20) not null check (categoria in ('antes','depois')),
  descricao text,
  is_video boolean not null default false,
  created_at timestamptz default now()
);

-- Relacionamento n:n de tags (opcional)
create table if not exists boaspraticas_praticas_tags (
  pratica_id uuid not null references boaspraticas_praticas(id) on delete cascade,
  tag_id int not null references boaspraticas_tags_catalogo(id),
  created_at timestamptz default now(),
  primary key (pratica_id, tag_id)
);

-- Índices
create index if not exists idx_bpp_matricula_cadastrante on boaspraticas_praticas (matricula_cadastrante);
create index if not exists idx_bpp_contrato on boaspraticas_praticas (contrato);
create index if not exists idx_bpp_categoria on boaspraticas_praticas (categoria);
create index if not exists idx_bpp_status on boaspraticas_praticas (status);
create index if not exists idx_bpp_created_at on boaspraticas_praticas (created_at desc);

-- Trigger de updated_at
create or replace function boaspraticas_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'boaspraticas_praticas_touch_updated_at'
  ) then
    create trigger boaspraticas_praticas_touch_updated_at
    before update on boaspraticas_praticas
    for each row
    execute procedure boaspraticas_touch_updated_at();
  end if;
end $$;

-- RLS
alter table boaspraticas_praticas enable row level security;
alter table boaspraticas_envolvidos enable row level security;
alter table boaspraticas_evidencias enable row level security;
alter table boaspraticas_praticas_tags enable row level security;

-- Políticas em boaspraticas_praticas
drop policy if exists bpp_select on boaspraticas_praticas;
create policy bpp_select on boaspraticas_praticas
for select
to authenticated
using (
  contrato = (current_setting('request.jwt.claims', true)::jsonb ->> 'contrato_raiz')
  or geral = true
  or (matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
);

drop policy if exists bpp_insert on boaspraticas_praticas;
create policy bpp_insert on boaspraticas_praticas
for insert
to authenticated
with check (
  (matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
  and contrato = (current_setting('request.jwt.claims', true)::jsonb ->> 'contrato_raiz')
);

drop policy if exists bpp_update on boaspraticas_praticas;
create policy bpp_update on boaspraticas_praticas
for update
to authenticated
using (
  (matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
  or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
)
with check (
  (matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
  or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
);

drop policy if exists bpp_delete on boaspraticas_praticas;
create policy bpp_delete on boaspraticas_praticas
for delete
to authenticated
using (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'Admin'
);

-- Políticas em evidências
drop policy if exists bpe_select on boaspraticas_evidencias;
create policy bpe_select on boaspraticas_evidencias
for select
to authenticated
using (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        p.contrato = (current_setting('request.jwt.claims', true)::jsonb ->> 'contrato_raiz')
        or p.geral = true
        or (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
      )
  )
);

drop policy if exists bpe_insert on boaspraticas_evidencias;
create policy bpe_insert on boaspraticas_evidencias
for insert
to authenticated
with check (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
        or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
      )
  )
);

drop policy if exists bpe_delete on boaspraticas_evidencias;
create policy bpe_delete on boaspraticas_evidencias
for delete
to authenticated
using (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
        or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
      )
  )
);

-- Políticas em envolvidos
drop policy if exists bpi_select on boaspraticas_envolvidos;
create policy bpi_select on boaspraticas_envolvidos
for select
to authenticated
using (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        p.contrato = (current_setting('request.jwt.claims', true)::jsonb ->> 'contrato_raiz')
        or p.geral = true
        or (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
      )
  )
);

drop policy if exists bpi_insert on boaspraticas_envolvidos;
create policy bpi_insert on boaspraticas_envolvidos
for insert
to authenticated
with check (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
        or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
      )
  )
);

drop policy if exists bpi_delete on boaspraticas_envolvidos;
create policy bpi_delete on boaspraticas_envolvidos
for delete
to authenticated
using (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
        or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
      )
  )
);

-- Políticas em n:n tags
drop policy if exists bppt_select on boaspraticas_praticas_tags;
create policy bppt_select on boaspraticas_praticas_tags
for select
to authenticated
using (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        p.contrato = (current_setting('request.jwt.claims', true)::jsonb ->> 'contrato_raiz')
        or p.geral = true
        or (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
      )
  )
);

drop policy if exists bppt_insert on boaspraticas_praticas_tags;
create policy bppt_insert on boaspraticas_praticas_tags
for insert
to authenticated
with check (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
        or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
      )
  )
);

drop policy if exists bppt_delete on boaspraticas_praticas_tags;
create policy bppt_delete on boaspraticas_praticas_tags
for delete
to authenticated
using (
  exists (
    select 1 from boaspraticas_praticas p
    where p.id = pratica_id
      and (
        (p.matricula_cadastrante::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula'))
        or ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'))
      )
  )
);

-- Catálogos: RLS com leitura livre e escrita Admin/Editor
alter table boaspraticas_area_aplicada enable row level security;
alter table boaspraticas_pilar enable row level security;
alter table boaspraticas_elimina_desperdicio enable row level security;
alter table boaspraticas_tags_catalogo enable row level security;

drop policy if exists cat_select_aa on boaspraticas_area_aplicada;
create policy cat_select_aa on boaspraticas_area_aplicada for select to authenticated using (true);
drop policy if exists cat_write_aa on boaspraticas_area_aplicada;
create policy cat_write_aa on boaspraticas_area_aplicada for all to authenticated using ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')) with check ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'));

drop policy if exists cat_select_pilar on boaspraticas_pilar;
create policy cat_select_pilar on boaspraticas_pilar for select to authenticated using (true);
drop policy if exists cat_write_pilar on boaspraticas_pilar;
create policy cat_write_pilar on boaspraticas_pilar for all to authenticated using ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')) with check ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'));

drop policy if exists cat_select_ed on boaspraticas_elimina_desperdicio;
create policy cat_select_ed on boaspraticas_elimina_desperdicio for select to authenticated using (true);
drop policy if exists cat_write_ed on boaspraticas_elimina_desperdicio;
create policy cat_write_ed on boaspraticas_elimina_desperdicio for all to authenticated using ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')) with check ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'));

drop policy if exists cat_select_tags on boaspraticas_tags_catalogo;
create policy cat_select_tags on boaspraticas_tags_catalogo for select to authenticated using (true);
drop policy if exists cat_write_tags on boaspraticas_tags_catalogo;
create policy cat_write_tags on boaspraticas_tags_catalogo for all to authenticated using ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')) with check ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor'));

-- Fim da migration

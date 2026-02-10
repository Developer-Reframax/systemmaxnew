-- Módulo de Prontidão Cognitiva
create extension if not exists "pgcrypto";

-- Tabelas principais
create table if not exists public.readiness_sessions (
  id uuid primary key default gen_random_uuid(),
  matricula varchar(50) not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_duration_ms integer,
  reaction_time_avg numeric,
  omission_rate numeric,
  commission_rate numeric,
  stroop_error_rate numeric,
  fatigue_index numeric,
  readiness_score numeric,
  risk_level varchar(20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_readiness_sessions_matricula on public.readiness_sessions (matricula);
create index if not exists idx_readiness_sessions_started_at on public.readiness_sessions (started_at desc);

create table if not exists public.readiness_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.readiness_sessions(id) on delete cascade,
  block_type varchar(32) not null,
  timestamp timestamptz not null,
  stimulus_type text,
  stimulus_value text,
  stimulus_color text,
  expected_response text,
  user_response text,
  reaction_time_ms integer,
  is_correct boolean not null default false,
  error_type varchar(20) not null default 'NENHUM',
  created_at timestamptz not null default now()
);

create index if not exists idx_readiness_events_session on public.readiness_events (session_id);
create index if not exists idx_readiness_events_block on public.readiness_events (block_type);

create table if not exists public.readiness_deviations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.readiness_sessions(id) on delete set null,
  matricula varchar(50) not null,
  risk_level varchar(20) not null,
  description text not null,
  status varchar(20) not null default 'ABERTO',
  immediate_action text,
  root_cause text,
  action_plan text,
  responsible_matricula varchar(50),
  due_date date,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_readiness_deviations_status on public.readiness_deviations (status);
create index if not exists idx_readiness_deviations_matricula on public.readiness_deviations (matricula);

-- Trigger de updated_at
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'readiness_sessions_touch_updated_at') then
    create trigger readiness_sessions_touch_updated_at
    before update on public.readiness_sessions
    for each row
    execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'readiness_deviations_touch_updated_at') then
    create trigger readiness_deviations_touch_updated_at
    before update on public.readiness_deviations
    for each row
    execute function public.touch_updated_at();
  end if;
end $$;

-- RLS e policies alinhados ao padrão existente
alter table public.readiness_sessions enable row level security;
alter table public.readiness_events enable row level security;
alter table public.readiness_deviations enable row level security;

-- Policies para readiness_sessions
drop policy if exists readiness_sessions_select on public.readiness_sessions;
create policy readiness_sessions_select on public.readiness_sessions
for select
to authenticated
using (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
);

drop policy if exists readiness_sessions_insert on public.readiness_sessions;
create policy readiness_sessions_insert on public.readiness_sessions
for insert
to authenticated
with check (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
);

drop policy if exists readiness_sessions_update on public.readiness_sessions;
create policy readiness_sessions_update on public.readiness_sessions
for update
to authenticated
using (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
)
with check (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
);

-- Policies para readiness_events
drop policy if exists readiness_events_select on public.readiness_events;
create policy readiness_events_select on public.readiness_events
for select
to authenticated
using (
  exists (
    select 1 from public.readiness_sessions s
    where s.id = session_id
      and (
        s.matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
        or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
      )
  )
);

drop policy if exists readiness_events_insert on public.readiness_events;
create policy readiness_events_insert on public.readiness_events
for insert
to authenticated
with check (
  exists (
    select 1 from public.readiness_sessions s
    where s.id = session_id
      and (
        s.matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
        or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
      )
  )
);

-- Policies para readiness_deviations
drop policy if exists readiness_deviations_select on public.readiness_deviations;
create policy readiness_deviations_select on public.readiness_deviations
for select
to authenticated
using (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or responsible_matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
);

drop policy if exists readiness_deviations_insert on public.readiness_deviations;
create policy readiness_deviations_insert on public.readiness_deviations
for insert
to authenticated
with check (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
);

drop policy if exists readiness_deviations_update on public.readiness_deviations;
create policy readiness_deviations_update on public.readiness_deviations
for update
to authenticated
using (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or responsible_matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
)
with check (
  matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or responsible_matricula = (current_setting('request.jwt.claims', true)::jsonb ->> 'matricula')
  or (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('Admin','Editor')
);

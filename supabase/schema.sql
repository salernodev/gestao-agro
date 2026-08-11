-- Gestão Agro — schema inicial (Fase 0)
-- Rodar no SQL Editor do painel do Supabase (Project > SQL Editor > New query).

-- ============================================================
-- clientes
-- ============================================================
create table if not exists public.clientes (
  id uuid primary key,                          -- gerado no cliente (crypto.randomUUID()), nunca aqui
  user_id uuid not null references auth.users(id) default auth.uid(),
  nome text not null,
  fazenda text,
  culturas text[] default '{}',
  contato text,
  status text not null default 'prospeccao'
    check (status in ('prospeccao', 'ativo', 'manutencao')),
  updated_at timestamptz not null default now(),  -- setado pelo app a cada gravação local, não por trigger do servidor
  deleted boolean not null default false          -- tombstone: exclusão vira soft delete p/ propagar no sync
);

create index if not exists clientes_user_id_idx on public.clientes(user_id);
create index if not exists clientes_updated_at_idx on public.clientes(updated_at);

-- ============================================================
-- visitas
-- ============================================================
create table if not exists public.visitas (
  id uuid primary key,
  user_id uuid not null references auth.users(id) default auth.uid(),
  cliente_id uuid not null references public.clientes(id),
  data date not null,
  tipo text not null
    check (tipo in ('abertura', 'tecnica', 'manutencao')),
  resumo text,
  observacoes text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists visitas_user_id_idx on public.visitas(user_id);
create index if not exists visitas_cliente_id_idx on public.visitas(cliente_id);
create index if not exists visitas_updated_at_idx on public.visitas(updated_at);

-- ============================================================
-- lembretes
-- ============================================================
create table if not exists public.lembretes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) default auth.uid(),
  cliente_id uuid references public.clientes(id),
  visita_id uuid references public.visitas(id),
  data_hora timestamptz not null,
  texto text not null,
  google_event_id text,                          -- preenchido depois que o mirror no Google Agenda roda (Fase 6)
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists lembretes_user_id_idx on public.lembretes(user_id);
create index if not exists lembretes_cliente_id_idx on public.lembretes(cliente_id);
create index if not exists lembretes_updated_at_idx on public.lembretes(updated_at);

-- ============================================================
-- RLS — cada usuário só enxerga/altera suas próprias linhas.
-- Mesmo sendo 1 usuário hoje, isso já deixa o schema pronto
-- para virar produto multiusuário sem migração de dados depois.
-- ============================================================
alter table public.clientes enable row level security;
alter table public.visitas enable row level security;
alter table public.lembretes enable row level security;

create policy "clientes: dono only" on public.clientes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "visitas: dono only" on public.visitas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lembretes: dono only" on public.lembretes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

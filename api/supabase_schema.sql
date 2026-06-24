-- ══════════════════════════════════════════════════════════
--  BUCALY — Schema PostgreSQL para Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────
--  PATIENTS
-- ──────────────────────────────────────────────────────────
create table if not exists patients (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text not null,
  email         text not null unique,
  password_hash text not null,
  rut           text,
  telefono      text,
  role          text not null default 'patient' check (role in ('patient', 'dentist', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index on patients (email);
create index on patients (role);
create index on patients (created_at desc);

-- ──────────────────────────────────────────────────────────
--  TRIAGES
-- ──────────────────────────────────────────────────────────
create table if not exists triages (
  id             uuid primary key default uuid_generate_v4(),
  patient_id     uuid references patients(id) on delete set null,
  symptom        text not null,
  answers        jsonb not null default '{}',
  pain_level     smallint check (pain_level between 0 and 10),
  urgency_level  text not null check (urgency_level in ('emergency', 'urgent', 'soon', 'routine')),
  specialist     text,
  diagnoses      jsonb not null default '[]',
  description    text,
  created_at     timestamptz not null default now()
);

create index on triages (patient_id);
create index on triages (urgency_level);
create index on triages (created_at desc);

-- ──────────────────────────────────────────────────────────
--  APPOINTMENTS
-- ──────────────────────────────────────────────────────────
create table if not exists appointments (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid not null references patients(id) on delete cascade,
  triage_id     uuid references triages(id) on delete set null,
  dentist_name  text not null,
  specialty     text not null,
  address       text,
  price         integer,
  scheduled_at  timestamptz,
  status        text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index on appointments (patient_id);
create index on appointments (status);
create index on appointments (created_at desc);

-- ──────────────────────────────────────────────────────────
--  ROW LEVEL SECURITY (RLS)
--  Los pacientes solo ven sus propios datos.
--  La API usa service_role key → bypassa RLS.
-- ──────────────────────────────────────────────────────────
alter table patients     enable row level security;
alter table triages      enable row level security;
alter table appointments enable row level security;

-- Política básica: la API (service_role) puede todo.
-- Añade políticas granulares si expones Supabase directamente al frontend.

-- ──────────────────────────────────────────────────────────
--  VISTA RESUMEN para el panel de gestión
-- ──────────────────────────────────────────────────────────
create or replace view patient_summary as
select
  p.id,
  p.nombre,
  p.email,
  p.rut,
  p.telefono,
  p.created_at,
  count(distinct t.id)  as total_triages,
  count(distinct a.id)  as total_appointments,
  max(t.urgency_level)  as last_urgency,
  max(t.created_at)     as last_triage_at
from patients p
left join triages      t on t.patient_id = p.id
left join appointments a on a.patient_id = p.id
where p.role = 'patient'
group by p.id;

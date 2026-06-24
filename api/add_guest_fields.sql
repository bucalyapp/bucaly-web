-- Ejecutar en Supabase → SQL Editor
alter table triages
  add column if not exists guest_nombre   text,
  add column if not exists guest_rut      text,
  add column if not exists guest_telefono text,
  add column if not exists guest_email    text;

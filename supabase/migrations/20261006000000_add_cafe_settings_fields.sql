alter table public.cafes
  add column if not exists address text,
  add column if not exists location_url text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists instagram_url text,
  add column if not exists tagline text,
  add column if not exists description text,
  add column if not exists opening_hours text;

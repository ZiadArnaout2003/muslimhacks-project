alter table public.courses
  add column if not exists color text not null default '#0F766E';

alter table public.courses
  drop constraint if exists courses_color_hex_check;

alter table public.courses
  add constraint courses_color_hex_check
  check (color ~ '^#[0-9A-Fa-f]{6}$');
-- Registo do aceite dos Termos/Privacidade no momento da criação da conta
alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

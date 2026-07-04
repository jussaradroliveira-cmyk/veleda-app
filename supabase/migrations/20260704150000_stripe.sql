-- Fase 2: colunas para a subscrição Stripe
alter table public.profiles
  add column stripe_customer_id text,
  add column stripe_subscription_id text;

create index profiles_stripe_customer_idx on public.profiles (stripe_customer_id);

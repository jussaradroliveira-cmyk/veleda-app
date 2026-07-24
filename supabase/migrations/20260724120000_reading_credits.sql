-- Consulta avulsa: pacote de 5 leituras por R$ 49,90, válido 30 dias.
-- Créditos e validade vivem no perfil; a validação é sempre no servidor.
alter table public.profiles
  add column if not exists reading_credits int not null default 0,
  add column if not exists reading_credits_expire_at timestamptz;

-- Consome 1 crédito de forma atómica: só se houver crédito não expirado.
-- Devolve os créditos restantes, ou NULL se não havia crédito válido.
create or replace function public.consume_reading_credit(uid uuid)
returns int
language plpgsql
security definer set search_path = public
as $$
declare remaining int;
begin
  update public.profiles
     set reading_credits = reading_credits - 1
   where id = uid
     and reading_credits > 0
     and reading_credits_expire_at is not null
     and reading_credits_expire_at > now()
  returning reading_credits into remaining;
  return remaining;
end;
$$;

-- Devolve 1 crédito (refund quando a geração da leitura falha após reservar).
create or replace function public.refund_reading_credit(uid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set reading_credits = reading_credits + 1 where id = uid;
end;
$$;

-- Concede um pacote (chamado só pelo webhook Stripe após pagamento confirmado).
-- Acumula créditos e estende a validade para qty*dias a partir de agora.
create or replace function public.grant_reading_pack(uid uuid, qty int, valid_days int)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
     set reading_credits = greatest(reading_credits, 0) + qty,
         reading_credits_expire_at = now() + make_interval(days => valid_days)
   where id = uid;
end;
$$;

-- Estas funções manipulam créditos pagos: NENHUM utilizador as pode chamar.
-- Só o service_role (Edge Functions no servidor) tem execute.
revoke execute on function public.consume_reading_credit(uuid) from public, anon, authenticated;
revoke execute on function public.refund_reading_credit(uuid) from public, anon, authenticated;
revoke execute on function public.grant_reading_pack(uuid, int, int) from public, anon, authenticated;
grant execute on function public.consume_reading_credit(uuid) to service_role;
grant execute on function public.refund_reading_credit(uuid) to service_role;
grant execute on function public.grant_reading_pack(uuid, int, int) to service_role;

-- Idempotência de eventos Stripe (evita conceder o pacote duas vezes se o
-- webhook for reentregue). Só o service_role acede; RLS liga por precaução.
create table if not exists public.processed_stripe_events (
  id text primary key,
  kind text,
  processed_at timestamptz not null default now()
);
alter table public.processed_stripe_events enable row level security;

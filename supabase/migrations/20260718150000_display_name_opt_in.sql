-- O nome de exibição é escolhido pela pessoa no primeiro ritual; o trigger
-- não deve inventar um a partir do email (causava saudações com o prefixo do email)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

-- limpa nomes auto-gerados (iguais ao prefixo do email) de contas existentes
update public.profiles p
set display_name = null
from auth.users u
where u.id = p.id
  and p.display_name = split_part(u.email, '@', 1);

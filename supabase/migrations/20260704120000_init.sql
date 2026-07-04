-- Veleda — schema inicial
-- Tabelas: cards, profiles, readings, journal_entries

-- ============ CARDS ============
create table public.cards (
  id serial primary key,
  slug text unique not null,
  name text not null,
  arcana text not null check (arcana in ('maior', 'menor')),
  suit text check (suit in ('copas', 'espadas', 'paus', 'ouros')),
  number int,
  keywords_upright text[] not null default '{}',
  keywords_reversed text[] not null default '{}',
  image_path text
);

alter table public.cards enable row level security;

create policy "cartas visiveis para todos"
  on public.cards for select
  to anon, authenticated
  using (true);

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "ver o proprio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "atualizar o proprio perfil (sem tocar em is_premium)"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and is_premium = (select p.is_premium from public.profiles p where p.id = auth.uid()));

-- cria perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ READINGS ============
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  cards jsonb not null, -- [{card_id, slug, name, position, reversed}]
  reading_text text not null,
  model text,
  created_at timestamptz not null default now()
);

create index readings_user_created_idx on public.readings (user_id, created_at desc);

alter table public.readings enable row level security;

-- leituras são criadas apenas pela Edge Function (service role, ignora RLS);
-- o utilizador só lê as suas
create policy "ver as proprias leituras"
  on public.readings for select
  to authenticated
  using (auth.uid() = user_id);

-- ============ JOURNAL ============
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid references public.readings(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_user_idx on public.journal_entries (user_id, created_at desc);
create unique index journal_one_per_reading_idx on public.journal_entries (user_id, reading_id) where reading_id is not null;

alter table public.journal_entries enable row level security;

create policy "diario proprio - select" on public.journal_entries for select to authenticated using (auth.uid() = user_id);
create policy "diario proprio - insert" on public.journal_entries for insert to authenticated with check (auth.uid() = user_id);
create policy "diario proprio - update" on public.journal_entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diario proprio - delete" on public.journal_entries for delete to authenticated using (auth.uid() = user_id);

-- ============ SEED: 22 ARCANOS MAIORES ============
insert into public.cards (slug, name, arcana, suit, number, keywords_upright, keywords_reversed, image_path) values
('o-louco', 'O Louco', 'maior', null, 0, '{liberdade,espontaneidade,"novos começos"}', '{imprudência,hesitação,"risco desnecessário"}', '/cards/o-louco.jpg'),
('o-mago', 'O Mago', 'maior', null, 1, '{vontade,manifestação,"poder pessoal"}', '{manipulação,dispersão,ilusão}', '/cards/o-mago.jpg'),
('a-sacerdotisa', 'A Sacerdotisa', 'maior', null, 2, '{intuição,mistério,"sabedoria interior"}', '{segredos,desconexão,superficialidade}', '/cards/a-sacerdotisa.jpg'),
('a-imperatriz', 'A Imperatriz', 'maior', null, 3, '{abundância,criatividade,acolhimento}', '{"bloqueio criativo",dependência,excesso}', '/cards/a-imperatriz.jpg'),
('o-imperador', 'O Imperador', 'maior', null, 4, '{estrutura,autoridade,estabilidade}', '{rigidez,"controlo excessivo",inflexibilidade}', '/cards/o-imperador.jpg'),
('o-hierofante', 'O Hierofante', 'maior', null, 5, '{tradição,ensinamento,espiritualidade}', '{dogma,conformismo,rebeldia}', '/cards/o-hierofante.jpg'),
('os-enamorados', 'Os Enamorados', 'maior', null, 6, '{amor,escolha,união}', '{indecisão,desalinhamento,"conflito de valores"}', '/cards/os-enamorados.jpg'),
('o-carro', 'O Carro', 'maior', null, 7, '{determinação,vitória,direção}', '{"falta de rumo",obstáculos,impulsividade}', '/cards/o-carro.jpg'),
('a-forca', 'A Força', 'maior', null, 8, '{coragem,compaixão,"domínio interior"}', '{insegurança,dúvida,"força bruta"}', '/cards/a-forca.jpg'),
('o-eremita', 'O Eremita', 'maior', null, 9, '{introspeção,"busca interior",orientação}', '{isolamento,solidão,retraimento}', '/cards/o-eremita.jpg'),
('a-roda-da-fortuna', 'A Roda da Fortuna', 'maior', null, 10, '{ciclos,destino,"mudança de sorte"}', '{"resistência à mudança",repetição,imprevistos}', '/cards/a-roda-da-fortuna.jpg'),
('a-justica', 'A Justiça', 'maior', null, 11, '{equilíbrio,verdade,"causa e efeito"}', '{injustiça,desonestidade,desequilíbrio}', '/cards/a-justica.jpg'),
('o-enforcado', 'O Enforcado', 'maior', null, 12, '{pausa,entrega,"nova perspetiva"}', '{estagnação,"sacrifício inútil",resistência}', '/cards/o-enforcado.jpg'),
('a-morte', 'A Morte', 'maior', null, 13, '{transformação,"fim de ciclo",renascimento}', '{"medo da mudança",apego,estagnação}', '/cards/a-morte.jpg'),
('a-temperanca', 'A Temperança', 'maior', null, 14, '{equilíbrio,moderação,paciência}', '{excesso,impaciência,desarmonia}', '/cards/a-temperanca.jpg'),
('o-diabo', 'O Diabo', 'maior', null, 15, '{apego,desejo,sombra}', '{libertação,consciência,"quebra de correntes"}', '/cards/o-diabo.jpg'),
('a-torre', 'A Torre', 'maior', null, 16, '{rutura,revelação,"mudança súbita"}', '{"desastre evitado","medo da rutura",adiamento}', '/cards/a-torre.jpg'),
('a-estrela', 'A Estrela', 'maior', null, 17, '{esperança,fé,inspiração}', '{desânimo,"falta de fé",desconexão}', '/cards/a-estrela.jpg'),
('a-lua', 'A Lua', 'maior', null, 18, '{intuição,sonhos,subconsciente}', '{confusão,medo,"engano revelado"}', '/cards/a-lua.jpg'),
('o-sol', 'O Sol', 'maior', null, 19, '{alegria,sucesso,vitalidade}', '{"pessimismo passageiro","excesso de confiança",atraso}', '/cards/o-sol.jpg'),
('o-julgamento', 'O Julgamento', 'maior', null, 20, '{despertar,renovação,chamado}', '{autocrítica,dúvida,"recusa do chamado"}', '/cards/o-julgamento.jpg'),
('o-mundo', 'O Mundo', 'maior', null, 21, '{realização,integração,conclusão}', '{incompletude,atrasos,"falta de encerramento"}', '/cards/o-mundo.jpg');

-- ============ SEED: 56 ARCANOS MENORES ============
do $$
declare
  suits text[] := array['copas','espadas','paus','ouros'];
  suit_names text[] := array['Copas','Espadas','Paus','Ouros'];
  rank_names text[] := array['Ás','Dois','Três','Quatro','Cinco','Seis','Sete','Oito','Nove','Dez','Valete','Cavaleiro','Rainha','Rei'];
  rank_slugs text[] := array['as','dois','tres','quatro','cinco','seis','sete','oito','nove','dez','valete','cavaleiro','rainha','rei'];
  rank_up text[] := array[
    'começo|potencial|dom',
    'dualidade|escolha|equilíbrio',
    'crescimento|colaboração|expansão',
    'estabilidade|pausa|consolidação',
    'desafio|perda|conflito',
    'harmonia|generosidade|transição',
    'avaliação|perseverança|estratégia',
    'movimento|mestria|mudança rápida',
    'resiliência|quase lá|plenitude',
    'conclusão|realização|legado',
    'mensagem|curiosidade|aprendizagem',
    'ação|impulso|avanço',
    'maturidade|cuidado|domínio interior',
    'mestria|liderança|autoridade'
  ];
  rank_rev text[] := array[
    'oportunidade adiada|potencial bloqueado|hesitação',
    'indecisão|desequilíbrio|impasse',
    'atraso|falta de apoio|dispersão',
    'estagnação|rigidez|apego',
    'recuperação|fim do conflito|lição aprendida',
    'desarmonia|egoísmo|nostalgia',
    'impaciência|desistência|má avaliação',
    'bloqueio|pressa|resistência',
    'exaustão|ansiedade|quase desistir',
    'fardo|fim adiado|sobrecarga',
    'má notícia|imaturidade|distração',
    'precipitação|freio|energia dispersa',
    'insegurança|dependência emocional|frieza',
    'abuso de poder|teimosia|descontrolo'
  ];
  s int; r int; slug text; cname text;
begin
  for s in 1..4 loop
    for r in 1..14 loop
      slug := rank_slugs[r] || '-de-' || suits[s];
      cname := rank_names[r] || ' de ' || suit_names[s];
      insert into public.cards (slug, name, arcana, suit, number, keywords_upright, keywords_reversed, image_path)
      values (slug, cname, 'menor', suits[s], r, string_to_array(rank_up[r], '|'), string_to_array(rank_rev[r], '|'), '/cards/' || slug || '.jpg');
    end loop;
  end loop;
end $$;

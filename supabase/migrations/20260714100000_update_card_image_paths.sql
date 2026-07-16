-- Atualiza as cartas para a nova organização de imagens em public/cards/.
update public.cards
set image_path = case
  when arcana = 'maior' then '/cards/maiores/' || slug || '.png'
  else '/cards/' || suit || '/' || slug || '.png'
end;

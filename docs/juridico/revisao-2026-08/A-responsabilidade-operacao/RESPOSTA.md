# A) Responsabilidade pela operação (nome pessoal)

## Situação verificada (13/08/2026)

- Os documentos publicados (Termos §1, Privacidade §1) identificam a operadora
  como **Jussara Derly Rodrigues de Oliveira Grota, pessoa singular com
  atividade aberta em Portugal, NIF 302020250**, Rua Comandante Manuel Freire,
  8, 2655-443 Ericeira. Declaração de atividade arquivada em
  `docs/juridico/Comprovativo-Declaração de Atividade-9996N02009537-2.pdf`.
- Toda a responsabilidade contratual, de consumo, de proteção de dados e
  fiscal recai hoje sobre a pessoa singular.
- O sistema **suporta tecnicamente** a mudança de entidade: os documentos
  legais são versionados (tabela `legal_documents`); publicar nova versão
  bloqueia os utilizadores até reaceitarem, e o novo aceite fica provado
  (versão + hash + hora do servidor).

## Minuta para revisão da advogada

Opções a avaliar (decisão da titular com apoio jurídico/fiscal):

1. **Manter pessoa singular** enquanto o volume é de piloto — risco patrimonial
   direto; simplicidade fiscal (regime simplificado PT).
2. **Constituir sociedade unipessoal por quotas (PT)** e transferir/licenciar
   os ativos — limita responsabilidade; exige instrumento escrito de
   transferência/licença dos ativos (já previsto na cláusula 8 da minuta de PI,
   pasta H) e atualização de: Termos/Privacidade (nova entidade), conta Stripe,
   faturação, contratos com fornecedores.
3. Calendário sugerido: decidir antes da divulgação pública em escala; a troca
   depois do lançamento obriga a reaceite de toda a base de utilizadores
   (suportado, mas com atrito).

## Ações

| Ação | Responsável |
|---|---|
| Parecer sobre forma societária e momento | Advogada + contabilista |
| Se mudar: instrumento de transferência de ativos | Advogada |
| Se mudar: republicar legais + Stripe + fornecedores | Técnico (processo pronto) |

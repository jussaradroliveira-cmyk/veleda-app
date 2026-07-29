// VLT2-001 / VLT2-002 — decisão de Premium na raiz.
//
// Uma assinatura só concede Premium se corresponder EXATAMENTE a um item do
// catálogo (Price ID no catálogo + moeda + valor + recorrência/intervalo) e
// tiver status elegível. A decisão do estado de um customer considera TODAS as
// suas assinaturas (não só a mais recente), de forma determinística, e remove
// Premium quando não há assinatura de catálogo elegível. Falha fechada.
//
// Funções puras (recebem objetos Stripe simples) → testáveis contra Stripe test
// real sem deploy nem Deno.
import { findCatalogItemByPriceId } from "./billing-config.js";
import { subscriptionEntitled } from "./stripe-state.js";

// current_period_end vive no item na API v17.
function periodEnd(subscription) {
  return subscription?.items?.data?.[0]?.current_period_end ?? 0;
}

// Devolve o catalogItem se a assinatura corresponder ao catálogo; senão null.
export function catalogMatchForSubscription(subscription, catalog) {
  const items = subscription?.items?.data ?? [];
  if (items.length !== 1) return null;            // Premium é um único item
  const price = items[0]?.price;
  if (!price || typeof price === "string" || !price.id) return null;
  const catalogItem = findCatalogItemByPriceId(catalog, price.id);
  if (!catalogItem) return null;                  // Price ID fora do catálogo
  if (price.currency !== catalogItem.currency) return null;
  if (price.unit_amount !== catalogItem.unitAmount) return null;
  if (!price.recurring) return null;              // tem de ser recorrente
  if (catalogItem.interval && price.recurring.interval !== catalogItem.interval) return null;
  return catalogItem;
}

export function subscriptionIsEligible(subscription) {
  return subscriptionEntitled(subscription?.status, subscription?.pause_collection);
}

// Ordena por: maior current_period_end, depois maior created, depois id (asc)
// — totalmente determinístico.
function chooseDeterministic(pairs) {
  return pairs.slice().sort((a, b) =>
    (periodEnd(b.sub) - periodEnd(a.sub)) ||
    ((b.sub.created ?? 0) - (a.sub.created ?? 0)) ||
    String(a.sub.id).localeCompare(String(b.sub.id))
  )[0];
}

// Estado de Premium do customer a partir de TODAS as suas assinaturas.
export function customerEntitlement(subscriptions, catalog) {
  const matched = (subscriptions ?? [])
    .map((sub) => ({ sub, item: catalogMatchForSubscription(sub, catalog) }))
    .filter((x) => x.item);
  const eligible = matched.filter((x) => subscriptionIsEligible(x.sub));
  const is_premium = eligible.length > 0;
  // Para referência guardamos: se há elegível, a melhor elegível; senão, a
  // melhor de catálogo (ex.: cancelada) para registar o último estado; senão nada.
  const chosen = chooseDeterministic(eligible.length ? eligible : matched);
  if (!chosen) {
    return {
      is_premium: false,
      subscription_id: null,
      status: null,
      price_id: null,
      currency: null,
      unit_amount: null,
      market: null,
      current_period_end: null,
    };
  }
  const price = chosen.sub.items.data[0].price;
  return {
    is_premium,
    subscription_id: chosen.sub.id,
    status: chosen.sub.status,
    price_id: price.id,
    currency: price.currency,
    unit_amount: price.unit_amount,
    market: chosen.item.market,
    current_period_end: periodEnd(chosen.sub) || null,
  };
}

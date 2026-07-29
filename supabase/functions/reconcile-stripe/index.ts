// Job administrativo Stripe -> Supabase.
// Não foi implantado nem executado nesta fase. Quando ativado, deve ser
// invocado por scheduler privado com RECONCILIATION_SECRET e Stripe no modo
// correspondente ao ambiente.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { assertStripeMode, loadBillingCatalog } from "../_shared/billing-config.js";
import { customerEntitlement } from "../_shared/entitlement.js";
import { listAllSubscriptions } from "../_shared/deletion-core.js";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const configuredSecret = Deno.env.get("RECONCILIATION_SECRET");
  const suppliedSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || suppliedSecret !== configuredSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return new Response("not configured", { status: 501 });
  try { assertStripeMode(stripeKey); } catch { return new Response("mode mismatch", { status: 501 }); }
  const stripe = new Stripe(stripeKey);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const catalog = loadBillingCatalog();
  const body = await req.json().catch(() => ({}));
  const offset = Number.isInteger(body.offset) && body.offset >= 0 ? body.offset : 0;
  const limit = Number.isInteger(body.limit) ? Math.min(Math.max(body.limit, 1), 50) : 25;
  const { data: profiles, error } = await admin.from("profiles")
    .select("stripe_customer_id")
    .not("stripe_customer_id", "is", null)
    .order("stripe_customer_id")
    .range(offset, offset + limit - 1);
  if (error) return new Response("database failed", { status: 500 });

  const results = [];
  for (const profile of profiles ?? []) {
    try {
      // VLT2-002: percorre TODAS as assinaturas do customer, filtra pelo catálogo,
      // regra determinística, e remove Premium quando não há assinatura válida.
      const all = await listAllSubscriptions(stripe, profile.stripe_customer_id, {
        expand: ["data.items.data.price"],
      });
      const ent = customerEntitlement(all, catalog);
      const reconciledAt = Math.floor(Date.now() / 1000);
      const { data, error: rpcError } = await admin.rpc("reconcile_stripe_subscription", {
        customer_id_value: profile.stripe_customer_id,
        subscription_id_value: ent.subscription_id,
        status_value: ent.status,
        premium_value: ent.is_premium,
        price_id_value: ent.price_id,
        currency_value: ent.currency,
        unit_amount_value: ent.unit_amount,
        market_value: ent.market,
        current_period_end_value: ent.current_period_end
          ? new Date(ent.current_period_end * 1000).toISOString()
          : null,
        reconciled_at_value: reconciledAt,
      });
      if (rpcError) throw rpcError;
      results.push({ customer: "pseudonymized", result: data });
    } catch {
      results.push({ customer: "pseudonymized", result: "failed" });
    }
  }
  const failed = results.filter((result) => result.result === "failed").length;
  return new Response(JSON.stringify({
    processed: results.length,
    failed,
    next_offset: results.length === limit ? offset + limit : null,
  }), {
    status: failed ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});

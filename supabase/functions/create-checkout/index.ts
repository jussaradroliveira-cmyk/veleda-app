import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import {
  assertStripePriceMatches,
  assertStripeMode,
  getCatalogItem,
  loadBillingCatalog,
  publicBillingCatalog,
} from "../_shared/billing-config.js";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://veledataro.com",
  "https://www.veledataro.com",
  "https://veleda-app.vercel.app",
]);

function requestOrigin(req: Request) {
  const value = req.headers.get("origin") ?? "";
  try {
    const origin = new URL(value).origin;
    return ALLOWED_ORIGINS.has(origin) ? origin : null;
  } catch {
    return null;
  }
}

function responseHeaders(origin: string | null) {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

Deno.serve(async (req) => {
  const origin = requestOrigin(req);
  if (req.headers.has("origin") && !origin) return json({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(origin) });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405, origin);

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "unauthorized" }, 401, origin);

    const catalog = loadBillingCatalog();
    if (req.method === "GET") return json(publicBillingCatalog(catalog), 200, origin);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "stripe_not_configured" }, 501, origin);
    assertStripeMode(stripeKey);
    const raw = await req.text();
    if (raw.length > 4096) return json({ error: "payload_too_large" }, 413, origin);
    const body = JSON.parse(raw || "{}");
    const plan = body?.plan;
    const market = body?.market;
    const item = getCatalogItem(catalog, market, plan);
    if (!item) return json({ error: "market_or_plan_unavailable" }, 400, origin);

    const stripe = new Stripe(stripeKey);
    await assertStripePriceMatches(stripe, item);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id, is_premium")
      .eq("id", user.id)
      .single();
    if (profileError) throw new Error("profile_lookup_failed");
    if (profile.is_premium && plan !== "avulso") {
      return json({ error: "already_premium" }, 400, origin);
    }

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { supabase_user_id: user.id } },
        { idempotencyKey: `veleda-customer-${user.id}` },
      );
      customerId = customer.id;
      const { error } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (error) throw new Error("customer_mapping_failed");
    }

    const base = origin ?? "https://veledataro.com";
    const isOneTime = plan === "avulso";
    const metadata = {
      supabase_user_id: user.id,
      plan,
      market,
      currency: item.currency,
      catalog_version: catalog.version,
    };
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isOneTime ? "payment" : "subscription",
      line_items: [{ price: item.priceId, quantity: 1 }],
      success_url: `${base}/leitura?${isOneTime ? "avulso" : "premium"}=1`,
      cancel_url: `${base}/assinatura`,
      metadata,
      subscription_data: isOneTime ? undefined : { metadata },
      payment_intent_data: isOneTime ? { metadata } : undefined,
    });

    return json({ url: session.url }, 200, origin);
  } catch (error) {
    const code = error?.code === "stripe_catalog_mismatch"
      ? "stripe_catalog_mismatch"
      : "checkout_failed";
    console.error(JSON.stringify({ request_id: requestId, code, at: new Date().toISOString() }));
    return json({ error: code }, 500, origin);
  }
});

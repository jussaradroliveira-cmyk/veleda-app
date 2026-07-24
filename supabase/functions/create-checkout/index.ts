// Veleda — cria uma sessão de checkout Stripe (subscrição Premium).
// Sem STRIPE_SECRET_KEY configurada, responde stripe_not_configured e o
// frontend mostra "em breve" — o app continua a funcionar sem pagamento real.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://veledataro.com",
  "https://www.veledataro.com",
  "https://veleda-app.vercel.app",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    // assinatura mensal/anual + consulta avulsa (pagamento único, 5 leituras)
    const priceMonthly = Deno.env.get("STRIPE_PRICE_ID_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_ID");
    const priceAnnual = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
    const priceAvulso = Deno.env.get("STRIPE_PRICE_ID_AVULSO");
    const body = await req.json().catch(() => ({}));
    const plan = ["anual", "mensal", "avulso"].includes(body?.plan) ? body.plan : "mensal";
    const priceId = plan === "avulso" ? priceAvulso : plan === "anual" ? (priceAnnual ?? priceMonthly) : priceMonthly;
    if (!stripeKey || !priceId) return json({ error: "stripe_not_configured" }, 501);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const stripe = new Stripe(stripeKey);
    const admin = createClient(supabaseUrl, serviceKey);

    // cliente Stripe: reutiliza ou cria
    const { data: profile } = await admin
      .from("profiles").select("stripe_customer_id, is_premium").eq("id", user.id).single();
    // premium só bloqueia a assinatura; a consulta avulsa continua disponível para todos
    if (profile?.is_premium && plan !== "avulso") return json({ error: "already_premium" }, 400);

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const reqOrigin = req.headers.get("origin") ?? "";
    const base = ALLOWED_ORIGINS.find((o) => reqOrigin.startsWith(o)) ?? ALLOWED_ORIGINS[1];
    const appPath = "";

    const isAvulso = plan === "avulso";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isAvulso ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${appPath}/leitura?${isAvulso ? "avulso" : "premium"}=1`,
      cancel_url: `${base}${appPath}/leitura`,
      metadata: { supabase_user_id: user.id, plan },
      // o pagamento único também precisa do user_id no PaymentIntent p/ o webhook
      ...(isAvulso ? { payment_intent_data: { metadata: { supabase_user_id: user.id, plan } } } : {}),
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("checkout error", e);
    return json({ error: "checkout_failed" }, 500);
  }
});

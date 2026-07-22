// Veleda — abre o Stripe Billing Portal para a pessoa gerir ou cancelar
// a assinatura. Sem chaves Stripe, responde stripe_not_configured.

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
    if (!stripeKey) return json({ error: "stripe_not_configured" }, 501);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    if (!profile?.stripe_customer_id) return json({ error: "no_subscription" }, 400);

    const reqOrigin = req.headers.get("origin") ?? "";
    const base = ALLOWED_ORIGINS.find((o) => reqOrigin.startsWith(o)) ?? ALLOWED_ORIGINS[1];
    const appPath = "";

    const stripe = new Stripe(stripeKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${base}${appPath}/assinatura`,
    });

    return json({ url: portal.url });
  } catch (e) {
    console.error("portal error", e);
    return json({ error: "portal_failed" }, 500);
  }
});

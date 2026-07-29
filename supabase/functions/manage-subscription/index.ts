// Veleda — abre o Stripe Billing Portal para a pessoa gerir ou cancelar
// a assinatura. Sem chaves Stripe, responde stripe_not_configured.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

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

function corsHeaders(origin: string | null) {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const DEFAULT_ORIGIN = "https://veledataro.com";

Deno.serve(async (req) => {
  const origin = requestOrigin(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });

  if (req.headers.has("origin") && !origin) return json({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
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
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    if (profileError) throw new Error("profile_lookup_failed");
    if (!profile?.stripe_customer_id) return json({ error: "no_subscription" }, 400);

    const base = origin ?? DEFAULT_ORIGIN;

    const stripe = new Stripe(stripeKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${base}/assinatura`,
    });

    return json({ url: portal.url });
  } catch (e) {
    console.error(JSON.stringify({
      code: "portal_failed",
      technical_error: typeof e === "object" && e && "code" in e ? String(e.code).slice(0, 80) : "technical_failure",
      at: new Date().toISOString(),
    }));
    return json({ error: "portal_failed" }, 500);
  }
});

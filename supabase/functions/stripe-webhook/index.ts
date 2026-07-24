// Veleda — webhook do Stripe: liga/desliga o Premium no perfil.
// Deploy com --no-verify-jwt (o Stripe não envia JWT); a segurança é a
// verificação de assinatura com STRIPE_WEBHOOK_SECRET.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("not configured", { status: 501 });

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      webhookSecret,
    );
  } catch (e) {
    console.error("assinatura inválida", e);
    return new Response("invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  async function setPremiumByCustomer(customerId: string, premium: boolean, subscriptionId?: string | null) {
    const { error } = await admin
      .from("profiles")
      .update({ is_premium: premium, stripe_subscription_id: subscriptionId ?? null })
      .eq("stripe_customer_id", customerId);
    if (error) console.error("update profile", error);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && typeof session.customer === "string") {
        await setPremiumByCustomer(session.customer, true, session.subscription as string);
      } else if (
        session.mode === "payment" &&
        session.payment_status === "paid" &&
        session.metadata?.plan === "avulso"
      ) {
        // consulta avulsa paga: concede 5 leituras válidas 30 dias.
        // idempotência: o event.id fica registado; um webhook repetido não concede de novo.
        const uid = session.metadata?.supabase_user_id;
        if (uid) {
          const { data: already } = await admin
            .from("processed_stripe_events").select("id").eq("id", event.id).maybeSingle();
          if (!already) {
            const { error: grantErr } = await admin.rpc("grant_reading_pack", { uid, qty: 5, valid_days: 30 });
            if (grantErr) { console.error("grant_reading_pack", grantErr); return new Response("grant failed", { status: 500 }); }
            await admin.from("processed_stripe_events").insert({ id: event.id, kind: "avulso_grant" });
          }
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      if (typeof sub.customer === "string") {
        await setPremiumByCustomer(sub.customer, active, sub.id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (typeof sub.customer === "string") {
        await setPremiumByCustomer(sub.customer, false, null);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

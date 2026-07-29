import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import {
  findCatalogItemByPriceId,
  assertStripeMode,
  loadBillingCatalog,
} from "../_shared/billing-config.js";
import {
  subscriptionSnapshot,
  validatePackPurchase,
} from "../_shared/stripe-state.js";

function technicalCode(error: unknown) {
  return (typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "technical_failure").replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("not configured", { status: 501 });
  try {
    assertStripeMode(stripeKey);
  } catch {
    return new Response("mode mismatch", { status: 501 });
  }

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, webhookSecret);
  } catch {
    console.error(JSON.stringify({
      request_id: requestId,
      code: "invalid_stripe_signature",
      at: new Date().toISOString(),
    }));
    return new Response("invalid signature", { status: 400 });
  }
  const expectedMode = Deno.env.get("STRIPE_MODE");
  if (expectedMode && event.livemode !== (expectedMode === "live")) {
    return new Response("event mode mismatch", { status: 400 });
  }

  const log = (code: string, technicalError?: string) => console.log(JSON.stringify({
    request_id: requestId,
    event_id: event.id,
    code,
    ...(technicalError ? { technical_error: technicalError } : {}),
    at: new Date().toISOString(),
  }));

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const catalog = loadBillingCatalog();

  async function record(kind: string, objectId: string | null, result: string) {
    const { data, error } = await admin.rpc("record_stripe_event", {
      event_id: event.id,
      event_created: event.created,
      kind_value: kind,
      object_id_value: objectId,
      result_value: result,
      livemode_value: event.livemode,
    });
    if (error) throw error;
    return data;
  }

  async function syncSubscription(subscriptionId: string) {
    // Fonte de verdade: estado atual na Stripe, não o payload potencialmente atrasado.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const snapshot = subscriptionSnapshot(subscription, event);
    if (!snapshot.customer_id) throw Object.assign(new Error("customer_missing"), { code: "customer_missing" });
    const catalogItem = findCatalogItemByPriceId(catalog, snapshot.price_id);
    const { data, error } = await admin.rpc("process_stripe_subscription_event", {
      event_id: event.id,
      event_created: event.created,
      customer_id_value: snapshot.customer_id,
      subscription_id_value: snapshot.subscription_id,
      status_value: snapshot.status,
      premium_value: snapshot.is_premium,
      price_id_value: snapshot.price_id,
      currency_value: snapshot.currency,
      unit_amount_value: snapshot.unit_amount,
      market_value: catalogItem?.market ?? null,
      current_period_end_value: snapshot.current_period_end
        ? new Date(snapshot.current_period_end * 1000).toISOString()
        : null,
      livemode_value: event.livemode,
    });
    if (error) throw error;
    return data?.result ?? "processed";
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const incoming = event.data.object as Stripe.Checkout.Session;
        const session = await stripe.checkout.sessions.retrieve(incoming.id, {
          expand: ["line_items.data.price"],
        });
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          log(await syncSubscription(session.subscription));
          break;
        }
        if (session.mode !== "payment" || session.payment_status !== "paid") {
          log(await record("checkout_completed", session.id, "payment_not_confirmed"));
          break;
        }

        const line = session.line_items?.data?.[0];
        const price = line?.price;
        const priceId = typeof price === "string" ? price : price?.id;
        const catalogItem = findCatalogItemByPriceId(catalog, priceId);
        const validation = validatePackPurchase({
          priceId,
          currency: typeof price === "string" ? null : price?.currency,
          amount: typeof price === "string" ? null : price?.unit_amount,
          quantity: line?.quantity,
        }, catalogItem);
        if (!validation.ok ||
            session.metadata?.plan !== "avulso" ||
            session.metadata?.market !== catalogItem?.market ||
            session.metadata?.currency !== catalogItem?.currency ||
            typeof session.customer !== "string" ||
            typeof session.payment_intent !== "string") {
          log(await record("pack_grant", session.id, "metadata_or_product_rejected"));
          break;
        }
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
          expand: ["latest_charge"],
        });
        const latestCharge = typeof paymentIntent.latest_charge === "string"
          ? await stripe.charges.retrieve(paymentIntent.latest_charge)
          : paymentIntent.latest_charge;
        if (paymentIntent.status !== "succeeded" ||
            paymentIntent.currency !== catalogItem.currency ||
            paymentIntent.amount_received !== catalogItem.unitAmount ||
            latestCharge?.refunded ||
            latestCharge?.disputed ||
            (latestCharge?.amount_refunded ?? 0) > 0) {
          log(await record("pack_grant", session.id, "payment_state_rejected"));
          break;
        }

        const { data: profile, error: profileError } = await admin.from("profiles")
          .select("id").eq("stripe_customer_id", session.customer).maybeSingle();
        if (profileError) throw profileError;
        if (!profile || profile.id !== session.metadata?.supabase_user_id) {
          log(await record("pack_grant", session.id, "customer_user_mismatch"));
          break;
        }

        const { data, error } = await admin.rpc("process_stripe_pack_event", {
          event_id: event.id,
          event_created: event.created,
          payment_intent_value: session.payment_intent,
          uid: profile.id,
          qty: catalogItem.quantity,
          valid_days: catalogItem.validDays,
          currency_value: catalogItem.currency,
          unit_amount_value: catalogItem.unitAmount,
          price_id_value: catalogItem.priceId,
          market_value: catalogItem.market,
          livemode_value: event.livemode,
        });
        if (error) throw error;
        log(data?.result ?? "processed");
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        log(await syncSubscription(subscription.id));
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.parent?.subscription_details?.subscription;
        if (typeof subscriptionId === "string") log(await syncSubscription(subscriptionId));
        else log(await record("invoice", invoice.id, "no_subscription"));
        break;
      }

      case "charge.refunded":
      case "charge.dispute.created": {
        const isDispute = event.type === "charge.dispute.created";
        let charge: Stripe.Charge;
        if (isDispute) {
          const dispute = event.data.object as Stripe.Dispute;
          const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
          charge = await stripe.charges.retrieve(chargeId);
        } else {
          charge = event.data.object as Stripe.Charge;
        }
        const paymentIntent = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!paymentIntent) {
          log(await record(isDispute ? "chargeback" : "refund", charge.id, "no_payment_intent"));
          break;
        }
        if (!isDispute && charge.amount_refunded < charge.amount) {
          log(await record("refund", charge.id, "partial_refund_requires_review"));
          break;
        }
        const { data, error } = await admin.rpc("reverse_stripe_pack_event", {
          event_id: event.id,
          event_created: event.created,
          payment_intent_value: paymentIntent,
          reason_value: isDispute ? "disputed" : "refunded",
          livemode_value: event.livemode,
        });
        if (error) throw error;
        log(data?.result ?? "processed");
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        log(await record("checkout_expired", session.id, "recorded"));
        break;
      }

      default:
        log(await record("ignored", event.data.object.id ?? null, "unsupported_event"));
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Não reconhecer como processado: 500 instrui a Stripe a reenviar.
    log("persistence_or_sync_failed", technicalCode(error));
    return new Response("processing failed", { status: 500 });
  }
});

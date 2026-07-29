import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { stopCustomerBilling } from "../_shared/deletion-core.js";
import { assertStripeMode } from "../_shared/billing-config.js";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function pseudonymize(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function technicalError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "technical_failure";
  return code.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
}

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

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  let actor = "unknown";
  const audit = (code: string, extra: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({
      request_id: requestId,
      actor,
      code,
      at: new Date().toISOString(),
      ...extra,
    }));
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user?.email) return json({ error: "unauthorized" }, 401);
    actor = await pseudonymize(user.id);

    const raw = await req.text();
    if (raw.length > 4096) return json({ error: "payload_too_large" }, 413);
    const body = JSON.parse(raw || "{}");
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return json({ error: "password_required" }, 400);

    // Revalidação da ação sensível com o mecanismo de senha já existente.
    const verifyClient = createClient(supabaseUrl, anonKey);
    const { error: passwordError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (passwordError) {
      audit("reauth_failed");
      return json({ error: "invalid_password" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw Object.assign(new Error("profile_lookup_failed"), { code: "profile_lookup_failed" });

    // A Stripe é consultada diretamente. Nenhum dado local é apagado antes de
    // todas as assinaturas capazes de manter cobrança estarem canceladas.
    if (profile?.stripe_customer_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        audit("stripe_not_configured");
        return json({ error: "billing_cancellation_unavailable" }, 503);
      }
      try {
        assertStripeMode(stripeKey);
        const result = await stopCustomerBilling(
          new Stripe(stripeKey),
          profile.stripe_customer_id,
          requestId,
        );
        audit(result.code, { canceled_count: result.canceled });
      } catch (error) {
        audit("stripe_cancel_failed", { technical_error: technicalError(error) });
        return json({ error: "billing_cancellation_failed", retryable: true }, 503);
      }
    } else {
      audit("no_stripe_customer");
    }

    // Exclusões idempotentes. O perfil (e, portanto, IDs Stripe) é o último
    // registro de aplicação removido, somente após a confirmação acima.
    const steps: Array<[string, () => Promise<{ error: unknown }>]> = [
      ["journal_entries", () => admin.from("journal_entries").delete().eq("user_id", user.id)],
      ["readings", () => admin.from("readings").delete().eq("user_id", user.id)],
      ["user_consents", () => admin.from("user_consents").delete().eq("user_id", user.id)],
      ["profiles", () => admin.from("profiles").delete().eq("id", user.id)],
    ];
    for (const [table, run] of steps) {
      const { error } = await run();
      if (error) {
        audit("data_delete_failed", { step: table, technical_error: technicalError(error) });
        return json({ error: "delete_failed", retryable: true }, 500);
      }
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      audit("auth_delete_failed", { technical_error: technicalError(authDeleteError) });
      return json({ error: "auth_delete_failed", retryable: true }, 500);
    }

    audit("account_deleted");
    return json({ deleted: true });
  } catch (error) {
    audit("internal_error", { technical_error: technicalError(error) });
    return json({ error: "internal", retryable: true }, 500);
  }
});

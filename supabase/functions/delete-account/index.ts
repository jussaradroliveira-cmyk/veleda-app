// Veleda — exclusão definitiva da conta e dos dados (LGPD).
//
// Segurança:
// - O usuário é SEMPRE derivado do JWT (nunca de input do cliente) —
//   ninguém consegue excluir outra conta que não a própria.
// - Exige re-autenticação real: a senha enviada é verificada no Supabase
//   Auth antes de qualquer exclusão.
// - Ordem segura: dados da aplicação primeiro (diário → leituras → perfil),
//   o usuário do Auth por ÚLTIMO. Idempotente: apagar o que já não existe
//   é um no-op; uma segunda chamada após a exclusão falha na autenticação.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. quem pede: derivado do JWT, nunca do body
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user?.email) return json({ error: "unauthorized" }, 401);

    // 2. re-autenticação: a senha tem de estar certa AGORA
    const body = await req.json().catch(() => ({}));
    const password = (body?.password ?? "").toString();
    if (!password) return json({ error: "password_required" }, 400);

    const verifyClient = createClient(supabaseUrl, anonKey);
    const { error: pwError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (pwError) return json({ error: "invalid_password" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);

    // 3. gancho Stripe (inativo): quando a assinatura estiver integrada,
    // cancelar a renovação ANTES de apagar os dados, para garantir que não
    // haverá nova cobrança.
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.stripe_subscription_id) {
      // TODO(stripe): const stripe = new Stripe(STRIPE_SECRET_KEY);
      // await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      // Confirmar o cancelamento antes de prosseguir com a exclusão.
      console.log("aviso: conta com assinatura ativa excluída sem cancelamento Stripe (Stripe inativo)");
    }

    // 4. exclusão ordenada dos dados da aplicação (idempotente)
    const steps: Array<[string, () => Promise<{ error: unknown }>]> = [
      ["journal_entries", () => admin.from("journal_entries").delete().eq("user_id", user.id)],
      ["readings", () => admin.from("readings").delete().eq("user_id", user.id)],
      ["profiles", () => admin.from("profiles").delete().eq("id", user.id)],
    ];
    for (const [table, run] of steps) {
      const { error } = await run();
      if (error) {
        console.error(`falha ao apagar ${table}`, error);
        return json({ error: "delete_failed", table }, 500);
      }
    }

    // 5. por último, o usuário do Auth
    const userEmail = user.email;
    const { error: delError } = await admin.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error("falha ao apagar usuário do Auth", delError);
      return json({ error: "auth_delete_failed" }, 500);
    }

    // TODO(email): enviar confirmação de exclusão para userEmail quando
    // houver serviço de email transacional configurado.
    console.log(`conta excluída: ${userEmail}`);

    return json({ deleted: true });
  } catch (e) {
    console.error("delete-account", e);
    return json({ error: "internal" }, 500);
  }
});

// VLT-008: exportação de dados server-side, completa e FALHA-FECHADA.
// Reúne todos os dados do titular (conta + 6 tabelas) com a service role. Se
// QUALQUER consulta falhar, devolve erro e NÃO produz ficheiro parcial. O
// cliente antigo era client-side, omitia categorias e falhava-aberto.
import { createClient } from "npm:@supabase/supabase-js@2";

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
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeCode(error: unknown) {
  return (typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "technical_failure").replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80);
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
  const log = (code: string, extra: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ request_id: requestId, actor, code, at: new Date().toISOString(), ...extra }));

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "unauthorized" }, 401);
    actor = await pseudonymize(user.id);

    const admin = createClient(supabaseUrl, serviceKey);

    // Falha-fechada: cada consulta é verificada; erro em qualquer uma aborta tudo.
    async function take<T>(label: string, query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
      const { data, error } = await query;
      if (error) throw Object.assign(new Error(label), { code: `export_${label}_failed` });
      return data;
    }

    const [profile, readings, journal, consents, reservations, purchases] = await Promise.all([
      take("profile", admin.from("profiles").select("*").eq("id", user.id).maybeSingle()),
      take("readings", admin.from("readings").select("*").eq("user_id", user.id).order("created_at")),
      take("journal", admin.from("journal_entries").select("*").eq("user_id", user.id).order("created_at")),
      take("consents", admin.from("user_consents").select("*").eq("user_id", user.id).order("recorded_at")),
      take("reservations", admin.from("reading_reservations").select("*").eq("user_id", user.id).order("created_at")),
      take("purchases", admin.from("stripe_payment_purchases").select("*").eq("user_id", user.id).order("created_at")),
    ]);

    const dump = {
      export_version: "1",
      exportado_em: new Date().toISOString(),
      conta: {
        id: user.id,
        email: user.email ?? null,
        criada_em: user.created_at ?? null,
      },
      perfil: profile ?? null,
      leituras: readings ?? [],
      diario: journal ?? [],
      consentimentos: consents ?? [],
      reservas_de_leitura: reservations ?? [],
      compras_stripe: purchases ?? [],
      inventario: {
        perfil: profile ? 1 : 0,
        leituras: readings?.length ?? 0,
        diario: journal?.length ?? 0,
        consentimentos: consents?.length ?? 0,
        reservas_de_leitura: reservations?.length ?? 0,
        compras_stripe: purchases?.length ?? 0,
        nao_incluido:
          "Este arquivo contém os dados guardados no aplicativo. Registos técnicos de " +
          "infraestrutura (Supabase, Vercel), dados retidos pela Stripe e cópias de segurança " +
          "não fazem parte deste ficheiro; consulte a Política de Privacidade.",
      },
    };

    log("export_ok", {
      leituras: readings?.length ?? 0,
      diario: journal?.length ?? 0,
      consentimentos: consents?.length ?? 0,
    });
    return json(dump);
  } catch (error) {
    log("export_failed", { technical_error: safeCode(error) });
    return json({ error: "export_failed", retryable: true }, 500);
  }
});

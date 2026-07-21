// Veleda — Edge Function: gera a leitura de tarot com Claude.
// A ANTHROPIC_API_KEY vive apenas nos secrets do Supabase, nunca no cliente.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_READINGS_PER_WEEK = 2;
const MODEL = "claude-sonnet-5";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// início da semana (segunda-feira, hora de São Paulo — o público é brasileiro)
function startOfWeekSaoPaulo(): Date {
  const now = new Date();
  const sp = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = (sp.getDay() + 6) % 7; // 0 = segunda
  sp.setDate(sp.getDate() - day);
  sp.setHours(0, 0, 0, 0);
  // margem de fuso aceitável para uma quota semanal
  return sp;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // marcas de tempo por etapa: se o worker morrer, o último log diz onde
  const t0 = Date.now();
  const marca = (etapa: string) => console.log(`[leitura] ${etapa} +${Date.now() - t0}ms`);

  try {
    marca("inicio");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "server_misconfigured" }, 500);

    // 1. autenticação
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "unauthorized" }, 401);
    marca("auth ok");

    // 2. input
    const body = await req.json().catch(() => null);
    const question = (body?.question ?? "").toString().trim();
    const chosen = body?.cards;
    if (!question || question.length > 500) return json({ error: "invalid_question" }, 400);
    if (!Array.isArray(chosen) || chosen.length !== 3) return json({ error: "invalid_cards" }, 400);
    const positions = ["passado", "presente", "futuro"];
    for (let i = 0; i < 3; i++) {
      if (typeof chosen[i]?.card_id !== "number" || typeof chosen[i]?.reversed !== "boolean") {
        return json({ error: "invalid_cards" }, 400);
      }
    }
    const ids = chosen.map((c: { card_id: number }) => c.card_id);
    if (new Set(ids).size !== 3) return json({ error: "invalid_cards" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // 3. quota semanal (premium = ilimitado)
    const { data: profile } = await admin
      .from("profiles").select("is_premium").eq("id", user.id).single();
    if (!profile?.is_premium) {
      const weekStart = startOfWeekSaoPaulo().toISOString();
      const { count } = await admin
        .from("readings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekStart);
      if ((count ?? 0) >= FREE_READINGS_PER_WEEK) {
        return json({ error: "quota_exceeded", free_per_week: FREE_READINGS_PER_WEEK }, 402);
      }
    }
    marca("quota ok");

    // 4. dados das cartas
    const { data: cards, error: cardsError } = await admin
      .from("cards")
      .select("id, slug, name, arcana, suit, keywords_upright, keywords_reversed")
      .in("id", ids);
    if (cardsError || !cards || cards.length !== 3) return json({ error: "invalid_cards" }, 400);

    const drawn = chosen.map((c: { card_id: number; reversed: boolean }, i: number) => {
      const card = cards.find((k) => k.id === c.card_id)!;
      return { ...card, reversed: c.reversed, position: positions[i] };
    });

    // 5. leitura com Claude
    const cardLines = drawn.map((d) =>
      `- ${d.position.toUpperCase()}: ${d.name}${d.reversed ? " (invertida)" : ""} — palavras-chave: ${
        (d.reversed ? d.keywords_reversed : d.keywords_upright).join(", ")
      }`
    ).join("\n");

    const systemPrompt =
      `Você é a Veleda, uma taróloga experiente, acolhedora e sábia. Fala português do Brasil, tratando a pessoa ` +
      `sempre por "você", num tom caloroso, místico mas responsável — nunca faz previsões médicas, legais ou ` +
      `financeiras absolutas, nem alimenta medo. ` +
      `Interpreta tiragens de 3 cartas (passado, presente, futuro) à luz da pergunta da pessoa. ` +
      `Estrutura da resposta em markdown: um parágrafo breve de abertura que acolhe a pergunta; ` +
      `uma seção por carta (### nome da carta — posição) com 1-2 parágrafos densos, direto ao essencial; ` +
      `e uma seção final "### Síntese da Veleda" com um parágrafo que une as três cartas numa orientação prática e esperançosa. ` +
      `Entre 280 e 380 palavras no total. Profundidade sem prolixidade.`;

    // com várias pessoas a ler ao mesmo tempo, a API pode devolver 429/529
    // transitórios — retentar 2x com espera resolve a maioria dos casos
    const anthropicBody = JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Pergunta do consulente: "${question}"\n\nCartas tiradas:\n${cardLines}\n\nFaça a leitura.`,
      }],
    });

    let anthropicResp: Response | null = null;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      marca(`anthropic tentativa ${tentativa}`);
      const controlo = new AbortController();
      const timer = setTimeout(() => controlo.abort(), 45000);
      try {
        anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: anthropicBody,
          signal: controlo.signal,
        });
      } catch (e) {
        console.warn(`anthropic tentativa ${tentativa} abortada/failed:`, String(e).slice(0, 120));
        anthropicResp = null;
        if (tentativa < 3) continue;
        break;
      } finally {
        clearTimeout(timer);
      }
      if (anthropicResp.ok) break;
      const status = anthropicResp.status;
      const retryable = status === 429 || status === 529 || status >= 500;
      if (!retryable || tentativa === 3) break;
      const retryAfter = Number(anthropicResp.headers.get("retry-after")) || 0;
      const espera = Math.min(retryAfter * 1000 || tentativa * 2500, 10000);
      console.warn(`anthropic ${status}, tentativa ${tentativa}/3 — a esperar ${espera}ms`);
      await anthropicResp.body?.cancel();
      await new Promise((r) => setTimeout(r, espera));
    }

    if (!anthropicResp || !anthropicResp.ok) {
      const errText = anthropicResp ? await anthropicResp.text() : "sem resposta";
      console.error("anthropic error", anthropicResp?.status, errText.slice(0, 400));
      return json({ error: "reading_failed" }, 502);
    }
    marca(`anthropic ok (${anthropicResp.status})`);
    const anthropicData = await anthropicResp.json();
    const readingText = anthropicData.content?.[0]?.text ?? "";
    if (!readingText) return json({ error: "reading_failed" }, 502);

    // 6. guardar no histórico
    const cardsJson = drawn.map((d) => ({
      card_id: d.id, slug: d.slug, name: d.name, position: d.position, reversed: d.reversed,
    }));
    const { data: reading, error: insertError } = await admin
      .from("readings")
      .insert({
        user_id: user.id,
        question,
        cards: cardsJson,
        reading_text: readingText,
        model: MODEL,
      })
      .select()
      .single();
    if (insertError) {
      console.error("insert error", insertError);
      return json({ error: "save_failed" }, 500);
    }

    marca("gravado");
    return json({ reading });
  } catch (e) {
    console.error("unexpected", e);
    return json({ error: "internal" }, 500);
  }
});

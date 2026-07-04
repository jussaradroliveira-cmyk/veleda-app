// Veleda — Edge Function: gera a leitura de tarot com Claude.
// A ANTHROPIC_API_KEY vive apenas nos secrets do Supabase, nunca no cliente.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_READINGS_PER_WEEK = 1;
const MODEL = "claude-sonnet-5";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// início da semana (segunda-feira, hora de Lisboa)
function startOfWeekLisbon(): Date {
  const now = new Date();
  const lisbon = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
  const day = (lisbon.getDay() + 6) % 7; // 0 = segunda
  lisbon.setDate(lisbon.getDate() - day);
  lisbon.setHours(0, 0, 0, 0);
  // converte de volta para UTC aproximado (diferença Lisboa/UTC é 0 ou 1h — margem aceitável para quota semanal)
  return lisbon;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
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
      const weekStart = startOfWeekLisbon().toISOString();
      const { count } = await admin
        .from("readings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekStart);
      if ((count ?? 0) >= FREE_READINGS_PER_WEEK) {
        return json({ error: "quota_exceeded", free_per_week: FREE_READINGS_PER_WEEK }, 402);
      }
    }

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
      `És a Veleda, uma tarologa experiente, acolhedora e sábia. Falas em português europeu, num tom caloroso, ` +
      `místico mas responsável — nunca fazes previsões médicas, legais ou financeiras absolutas, nem alimentas medo. ` +
      `Interpretas tiragens de 3 cartas (passado, presente, futuro) à luz da pergunta da pessoa. ` +
      `Estrutura da resposta em markdown: um parágrafo breve de abertura que acolhe a pergunta; ` +
      `uma secção por carta (### nome da carta — posição) com 2-3 parágrafos curtos; ` +
      `e uma secção final "### Síntese da Veleda" que une as três cartas numa orientação prática e esperançosa. ` +
      `Entre 350 e 550 palavras no total.`;

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Pergunta do consulente: "${question}"\n\nCartas tiradas:\n${cardLines}\n\nFaz a leitura.`,
        }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error("anthropic error", anthropicResp.status, errText);
      return json({ error: "reading_failed" }, 502);
    }
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

    return json({ reading });
  } catch (e) {
    console.error("unexpected", e);
    return json({ error: "internal" }, 500);
  }
});

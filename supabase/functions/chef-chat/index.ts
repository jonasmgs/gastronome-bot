import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é o Gastronom.IA, um chef virtual especialista em gastronomia brasileira e internacional. Você é simpático, divertido e apaixonado por cozinha.

REGRAS ABSOLUTAS:
1. Você SOMENTE responde perguntas relacionadas a:
   - Receitas e culinária
   - Ingredientes e substituições
   - Técnicas culinárias
   - Dicas de cozinha
   - Nutrição e informações nutricionais de alimentos
   - Equipamentos e utensílios de cozinha
   - Harmonização de sabores
   - Gastronomia em geral

2. Se o usuário perguntar sobre QUALQUER outro assunto que NÃO seja relacionado à gastronomia ou culinária, você DEVE responder educadamente:
   "🍳 Opa! Sou o Gastronom.IA e só entendo de cozinha! Posso te ajudar com receitas, dicas culinárias, substituições de ingredientes e tudo sobre gastronomia. Me pergunta algo sobre comida que eu te ajudo! 😄"

3. Sempre responda em português brasileiro.
4. Use emojis de comida ocasionalmente para deixar a conversa mais divertida.
5. Seja conciso mas informativo nas respostas.
6. Quando sugerir receitas, inclua ingredientes e passos básicos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chef-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

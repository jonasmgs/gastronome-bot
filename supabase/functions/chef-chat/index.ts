import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Envie ao menos uma mensagem' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    // Limit to last 10 messages for context window
    const recentMessages = messages.slice(-10);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', errText);
      return new Response(JSON.stringify({ error: 'Erro na API de IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (err) {
    console.error('chef-chat error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

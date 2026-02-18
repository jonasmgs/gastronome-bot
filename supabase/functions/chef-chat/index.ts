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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { messages, recipe_context } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Envie ao menos uma mensagem' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!recipe_context || !recipe_context.name) {
      return new Response(JSON.stringify({ error: 'Contexto da receita é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `Você é o Gastronom.IA, um chef virtual especialista em gastronomia. Você está ajudando o usuário com uma receita específica.

RECEITA ATUAL:
- Nome: ${recipe_context.name}
- Ingredientes: ${recipe_context.ingredients || 'não informados'}
- Modo de Preparo: ${recipe_context.preparation || 'não informado'}
- Calorias: ${recipe_context.calories || 'não informado'} kcal

REGRAS ABSOLUTAS:
1. Você SOMENTE pode responder perguntas relacionadas a:
   - Esta receita específica (${recipe_context.name})
   - Substituições de ingredientes DESTA receita
   - Técnicas culinárias usadas NESTA receita
   - Dicas para melhorar ESTA receita
   - Informações nutricionais DESTA receita
   - Variações e adaptações DESTA receita
   - Perguntas gerais sobre gastronomia e culinária

2. Se o usuário perguntar sobre QUALQUER assunto que NÃO seja relacionado a esta receita ou gastronomia (por exemplo: fazer papel, programação, matemática, história não-culinária, etc.), você DEVE responder EXATAMENTE:
   "🍳 Opa! Sou o Gastronom.IA e só posso te ajudar com assuntos relacionados à receita de ${recipe_context.name} e gastronomia em geral! Me pergunta algo sobre o prato ou culinária que eu te ajudo! 😄"

3. NÃO tente interpretar palavras ambíguas como receitas ou alimentos. Se alguém pedir "papel", "caneta", "carro", ou qualquer coisa claramente não-culinária, recuse educadamente.

4. Sempre responda em português brasileiro.
5. Use emojis de comida ocasionalmente.
6. Seja conciso mas informativo.`;

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

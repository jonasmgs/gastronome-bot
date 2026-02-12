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
    const { ingredients } = await req.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Envie pelo menos 2 ingredientes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Você é um chef profissional renomado e nutricionista certificado.

Com base nos seguintes ingredientes:
${ingredients.join(', ')}

Crie apenas UMA receita completa e MUITO detalhada.

Retorne exclusivamente em JSON válido, sem texto adicional.

Formato obrigatório:

{
  "recipe_name": "",
  "difficulty": "Fácil" | "Médio" | "Difícil",
  "prep_time": "",
  "cook_time": "",
  "servings": 0,
  "ingredients": [
    {
      "name": "",
      "quantity": "",
      "calories": 0,
      "tip": ""
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "title": "",
      "description": "",
      "duration": "",
      "tip": ""
    }
  ],
  "calories_total": 0,
  "nutrition_info": "",
  "chef_tips": ""
}

Regras:
- Criar nome criativo e atraente
- Estimar calorias realistas por ingrediente
- Calcular total corretamente
- O campo "steps" deve ter pelo menos 4-6 passos detalhados
- Cada passo deve ter título curto, descrição detalhada com técnicas culinárias, duração estimada e uma dica opcional
- Cada ingrediente pode ter uma dica de preparo opcional (ex: "corte em cubos pequenos")
- Incluir tempo de preparo e cozimento
- Incluir número de porções
- Incluir dificuldade (Fácil, Médio ou Difícil)
- O campo "chef_tips" deve conter 2-3 dicas profissionais para melhorar o resultado
- O campo "nutrition_info" deve detalhar macronutrientes (proteínas, carboidratos, gorduras, fibras)
- Não escrever nada fora do JSON`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', errText);
      return new Response(
        JSON.stringify({ error: 'Erro na API de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipe = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(recipe),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const body = await req.json();
    const { ingredients, mode, filters, existing_recipe } = body;

    // mode: "generate" (default) | "transform"
    const isTransform = mode === 'transform';

    if (!isTransform && (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2)) {
      return new Response(
        JSON.stringify({ error: 'Envie pelo menos 2 ingredientes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isTransform && !existing_recipe) {
      return new Response(
        JSON.stringify({ error: 'Envie a receita para transformar' }),
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

    // Build dietary filter instructions
    const activeFilters: string[] = [];
    if (filters?.vegan) activeFilters.push('VEGANA (sem nenhum ingrediente de origem animal)');
    if (filters?.glutenFree) activeFilters.push('SEM GLÚTEN (substitua qualquer ingrediente com glúten por alternativas sem glúten)');
    if (filters?.lactoseFree) activeFilters.push('SEM LACTOSE (substitua qualquer ingrediente com lactose por alternativas sem lactose)');

    const filterInstructions = activeFilters.length > 0
      ? `\n\nFILTROS OBRIGATÓRIOS - A receita DEVE ser:\n${activeFilters.map(f => `- ${f}`).join('\n')}\n\nSubstitua ingredientes incompatíveis por alternativas adequadas. Mencione as substituições feitas.`
      : '';

    let prompt: string;

    if (isTransform) {
      prompt = `Você é um chef profissional renomado e nutricionista certificado.

Transforme a seguinte receita aplicando os filtros dietéticos:

RECEITA ORIGINAL:
${existing_recipe}
${filterInstructions}

Crie a versão transformada da receita mantendo o sabor o mais próximo possível do original.

Retorne exclusivamente em JSON válido, sem texto adicional.`;
    } else {
      prompt = `Você é um chef profissional renomado e nutricionista certificado.

Com base nos seguintes ingredientes:
${ingredients.join(', ')}
${filterInstructions}

Crie apenas UMA receita completa e MUITO detalhada.

Retorne exclusivamente em JSON válido, sem texto adicional.`;
    }

    prompt += `

Formato obrigatório:

{
  "recipe_name": "",
  "difficulty": "Fácil" | "Médio" | "Difícil",
  "prep_time": "",
  "cook_time": "",
  "servings": 0,
  "dietary_tags": [],
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
  "chef_tips": "",
  "substitutions_made": ""
}

Regras:
- Criar nome criativo e atraente
- Estimar calorias realistas por ingrediente
- Calcular total corretamente
- O campo "steps" deve ter pelo menos 4-6 passos detalhados
- Cada passo deve ter título curto, descrição detalhada com técnicas culinárias, duração estimada e uma dica opcional
- Cada ingrediente pode ter uma dica de preparo opcional
- Incluir tempo de preparo e cozimento
- Incluir número de porções
- Incluir dificuldade (Fácil, Médio ou Difícil)
- O campo "dietary_tags" deve listar os filtros aplicados (ex: ["Vegana", "Sem Glúten"])
- O campo "chef_tips" deve conter 2-3 dicas profissionais
- O campo "nutrition_info" deve detalhar macronutrientes
- O campo "substitutions_made" deve listar as substituições feitas (se houver filtros aplicados), ou string vazia
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

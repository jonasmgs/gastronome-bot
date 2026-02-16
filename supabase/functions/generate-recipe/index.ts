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

    const body = await req.json();
    const { ingredients, mode, filters, existing_recipe, category, complexity } = body;

    // mode: "generate" (default) | "transform"
    const isTransform = mode === 'transform';

    let sanitizedIngredients: string[] = [];

    if (!isTransform) {
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
        return new Response(
          JSON.stringify({ error: 'Envie pelo menos 2 ingredientes' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate and sanitize each ingredient
      sanitizedIngredients = ingredients
        .filter((ing: unknown) => typeof ing === 'string')
        .map((ing: string) => ing.trim().replace(/[^\p{L}\p{N}\s\-,.'()áàâãéèêíïóôõúüçñ]/gu, ''))
        .filter((ing: string) => ing.length > 0 && ing.length <= 100)
        .slice(0, 20);

      if (sanitizedIngredients.length < 2) {
        return new Response(
          JSON.stringify({ error: 'Ingredientes inválidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (isTransform) {
      if (!existing_recipe || typeof existing_recipe !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Envie a receita para transformar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (existing_recipe.length > 5000) {
        return new Response(
          JSON.stringify({ error: 'Receita muito longa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate category and complexity against allowed values
    const allowedCategories = ['salada', 'sobremesa', 'salgado', 'lanche'];
    const allowedComplexities = ['simples', 'media', 'elaborada'];
    const safeCategory = (typeof category === 'string' && allowedCategories.includes(category)) ? category : null;
    const safeComplexity = (typeof complexity === 'string' && allowedComplexities.includes(complexity)) ? complexity : null;

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

    const categoryMap: Record<string, string> = {
      salada: 'SALADA GOURMET — Prato fresco e sofisticado com base em folhas nobres, vegetais grelhados ou crus, proteínas leves (frango desfiado, camarão, ovo pochê), molhos autorais (vinagrete de maracujá, tahine, mostarda e mel). Deve ser visualmente bonita, com texturas contrastantes (crocante + macio) e temperos frescos.',
      sobremesa: 'SOBREMESA/DOCE DE CONFEITARIA — Receita doce elaborada como bolo, torta, mousse, pudim, cheesecake, brownie, pavê, sorvete caseiro, crème brûlée ou similar. Deve ter camadas de sabor, boa apresentação e técnicas de confeitaria (banho-maria, chantilly, calda, cobertura, etc).',
      salgado: 'PRATO PRINCIPAL SALGADO — Refeição completa e substanciosa como risoto, massa, carne assada, estrogonofe, moqueca, escondidinho, lasanha, frango recheado, etc. Deve ser um prato quente, reconfortante e digno de restaurante.',
      lanche: 'LANCHE ELABORADO — Sanduíche gourmet, hambúrguer artesanal, wrap recheado, bruschetta, croissant recheado, panini, taco, quesadilla ou similar. NÃO pode ser apenas ingredientes simples empilhados. Deve ter molho especial, combinação criativa de sabores e montagem caprichada.',
    };

    const categoryInstruction = safeCategory && categoryMap[safeCategory]
      ? `\n\nCATEGORIA OBRIGATÓRIA: A receita DEVE ser do tipo ${categoryMap[safeCategory]}. Não crie uma receita de outra categoria.`
      : '';

    const complexityMap: Record<string, string> = {
      simples: 'RECEITA SIMPLES — Poucos ingredientes, preparo rápido (até 20 min), técnicas básicas do dia a dia, ideal para quem tem pouca experiência na cozinha. Máximo 4-5 passos.',
      media: 'RECEITA DE COMPLEXIDADE MÉDIA — Ingredientes variados, preparo moderado (20-45 min), algumas técnicas intermediárias (refogar, gratinar, montar camadas). Entre 5-7 passos.',
      elaborada: 'RECEITA ELABORADA — Ingredientes sofisticados, preparo demorado (45+ min), técnicas avançadas de alta gastronomia (selar, flambar, reduzir, confitar, sous vide). Apresentação refinada, molhos autorais, 7-10 passos detalhados.',
    };

    const complexityInstruction = safeComplexity && complexityMap[safeComplexity]
      ? `\n\nCOMPLEXIDADE OBRIGATÓRIA: ${complexityMap[safeComplexity]}`
      : '';

    const filterInstructions = activeFilters.length > 0
      ? `\n\nFILTROS OBRIGATÓRIOS - A receita DEVE ser:\n${activeFilters.map(f => `- ${f}`).join('\n')}\n\nSubstitua ingredientes incompatíveis por alternativas adequadas. Mencione as substituições feitas.`
      : '';

    let prompt: string;

    const chefPersona = `Você é um chef profissional com formação em gastronomia clássica francesa e brasileira, com 20 anos de experiência em restaurantes estrelados. Você NUNCA sugere técnicas incorretas. Você domina todas as técnicas culinárias: sauté, braise, roasting, grilling, poaching, blanching, flambar, gratinar, confitar, defumar, sous vide, etc.

REGRAS TÉCNICAS OBRIGATÓRIAS:
- NUNCA sugira ferver carnes ou almôndegas em água pura — use técnicas corretas como selar/dourar em frigideira com óleo quente, assar no forno, ou cozinhar em molho (braise)
- Almôndegas devem ser SELADAS em frigideira com azeite/óleo em fogo alto para criar crosta (reação de Maillard), depois finalizadas no forno ou no molho
- Carnes devem ser temperadas com antecedência, seladas em alta temperatura para caramelização
- Use terminologia gastronômica correta: selar, saltear, refogar, brasear, glasear, reduzir, deglacear, emulsificar, etc.
- Cada passo deve explicar o PORQUÊ da técnica (ex: "sele em fogo alto para criar a crosta via reação de Maillard, preservando os sucos internos")
- Indique temperaturas específicas do forno e tempos precisos
- Sugira pontos de cocção corretos para cada proteína
- Use combinações de sabor sofisticadas e equilibradas (ácido, doce, salgado, umami, amargo)
- Seja criativo nos nomes e nas combinações, evitando receitas genéricas`;

    if (isTransform) {
      prompt = `${chefPersona}

Transforme a seguinte receita aplicando os filtros dietéticos:

RECEITA ORIGINAL:
${existing_recipe}
${filterInstructions}

REGRAS IMPORTANTES:
- Crie um NOVO NOME criativo para a receita transformada que reflita as mudanças (ex: se virou vegana, o nome deve indicar isso)
- O nome NÃO pode ser igual ao original
- MANTENHA A MESMA CATEGORIA da receita original: se é um prato salgado, a versão transformada DEVE continuar sendo salgada. Se é uma sobremesa/doce, DEVE continuar sendo sobremesa/doce. NUNCA transforme um prato salgado em doce ou vice-versa.
- Mantenha o sabor e a essência o mais próximo possível do original, apenas substituindo os ingredientes incompatíveis

Retorne exclusivamente em JSON válido, sem texto adicional.`;
    } else {
      prompt = `${chefPersona}

Com base nos seguintes ingredientes:
${sanitizedIngredients.join(', ')}
${categoryInstruction}${complexityInstruction}${filterInstructions}

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
- Criar nome criativo e atraente, digno de cardápio de restaurante
- A receita deve ser ELABORADA e SABOROSA, nunca simplista ou amadora
- Use combinações de ingredientes que façam sentido gastronômico
- Inclua molhos, temperos e técnicas que elevem o prato
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

    // Robust JSON extraction from AI response
    function extractJsonFromResponse(raw: string): Record<string, unknown> {
      let cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('No JSON found in AI response:', cleaned.substring(0, 300));
        throw new Error('No JSON object found');
      }

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

      try {
        return JSON.parse(cleaned);
      } catch (_e) {
        // Repair common issues
        cleaned = cleaned
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '')
          .replace(/\n/g, ' ')
          .replace(/\t/g, ' ');

        try {
          return JSON.parse(cleaned);
        } catch (repairErr) {
          console.error('JSON repair failed:', repairErr, 'Raw:', cleaned.substring(0, 500));
          throw repairErr;
        }
      }
    }

    let recipe: Record<string, unknown>;
    try {
      recipe = extractJsonFromResponse(content);
    } catch (_parseErr) {
      return new Response(
        JSON.stringify({ error: 'A IA retornou dados inválidos. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

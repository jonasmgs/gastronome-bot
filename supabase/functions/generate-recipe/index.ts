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

    const body = await req.json();
    const { ingredients, mode, filters, existing_recipe, category, complexity, servings, nutritionMode, nutritionProfile, description, dishType } = body;

    const isTransform = mode === 'transform';
    const isNutritionMode = nutritionMode === true;

    let sanitizedIngredients: string[] = [];

    if (!isTransform && !isNutritionMode) {
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
        return new Response(
          JSON.stringify({ error: 'Envie pelo menos 2 ingredientes' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

    const allowedCategories = ['salada', 'sobremesa', 'salgado', 'lanche', 'sopa', 'molho'];
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

    const activeFilters: string[] = [];
    if (filters?.vegan) activeFilters.push('VEGANA (sem nenhum ingrediente de origem animal)');
    if (filters?.glutenFree) activeFilters.push('SEM GLÚTEN (substitua qualquer ingrediente com glúten por alternativas sem glúten)');
    if (filters?.lactoseFree) activeFilters.push('SEM LACTOSE (substitua qualquer ingrediente com lactose por alternativas sem lactose)');

    const categoryMap: Record<string, string> = {
      salada: 'SALADA GOURMET — Prato fresco e sofisticado com base em folhas nobres, vegetais grelhados ou crus, proteínas leves, molhos autorais.',
      sobremesa: 'SOBREMESA/DOCE DE CONFEITARIA — Receita doce elaborada como bolo, torta, mousse, pudim, cheesecake, brownie.',
      salgado: 'PRATO PRINCIPAL SALGADO — Refeição completa e substanciosa como risoto, massa, carne assada, estrogonofe, moqueca.',
      lanche: 'LANCHE ELABORADO — Sanduíche gourmet, hambúrguer artesanal, wrap recheado, bruschetta, panini.',
      sopa: 'SOPA OU CALDO — Sopa cremosa, caldo nutritivo, consomê, velouté, minestrone ou similar.',
      molho: 'MOLHO GOURMET — Molho sofisticado como pesto, chimichurri, beurre blanc, redução de vinho, molho de ervas, vinagrete especial, aioli, etc.',
    };

    const categoryInstruction = safeCategory && categoryMap[safeCategory]
      ? `\n\nCATEGORIA OBRIGATÓRIA: A receita DEVE ser do tipo ${categoryMap[safeCategory]}. Não crie uma receita de outra categoria.`
      : '';

    const complexityMap: Record<string, string> = {
      simples: 'RECEITA SIMPLES — Poucos ingredientes, preparo rápido (até 20 min), técnicas básicas.',
      media: 'RECEITA DE COMPLEXIDADE MÉDIA — Ingredientes variados, preparo moderado (20-45 min).',
      elaborada: 'RECEITA ELABORADA — Ingredientes sofisticados, preparo demorado (45+ min), técnicas avançadas.',
    };

    const complexityInstruction = safeComplexity && complexityMap[safeComplexity]
      ? `\n\nCOMPLEXIDADE OBRIGATÓRIA: ${complexityMap[safeComplexity]}`
      : '';

    const filterInstructions = activeFilters.length > 0
      ? `\n\nFILTROS OBRIGATÓRIOS - A receita DEVE ser:\n${activeFilters.map(f => `- ${f}`).join('\n')}\nSubstitua ingredientes incompatíveis por alternativas adequadas.`
      : '';

    let prompt: string;

    // Handle optional description for normal mode
    const safeDescriptionNormal = typeof description === 'string' && description.trim().length > 0
      ? description.trim().substring(0, 200)
      : null;

    const chefPersona = `Você é um chef profissional com formação em gastronomia clássica brasileira e internacional. Gere receitas tecnicamente corretas seguindo estas regras obrigatórias:

ORDEM LÓGICA DOS PASSOS (sempre nesta sequência):
1. Mise en place (lavar, cortar, separar ingredientes)
2. Base aromática (alho, cebola — refogar na gordura)
3. Proteínas e carnes curadas (dourar antes dos vegetais)
4. Vegetais por tempo de cozimento (duros primeiro, macios depois)
5. Líquidos e caldos (adicionar na própria panela, nunca separado)
6. Finalização (creme de leite, requeijão, iogurte — sempre fora do fogo)
7. Ervas frescas (coentro, salsinha, manjericão, cebolinha — sempre no final)
8. Ajuste de sal e pimenta (sempre por último)

REGRAS POR TIPO DE PRATO:

SALADA:
- Molho sempre separado, adicionado na hora de servir
- Ingredientes quentes devem esfriar antes de montar
- Nunca cozinhar folhas verdes

DOCE:
- Indicar ponto correto (fio, bala, caramelo)
- Manteiga em temperatura ambiente quando necessário
- Chocolate sempre derretido em banho-maria ou micro-ondas em pulsos
- Nunca ferver creme de leite fresco em fogo alto

SALGADO:
- Seguir a ordem lógica completa acima
- Carnes sempre seladas antes de adicionar outros ingredientes

LANCHE:
- Indicar temperatura correta de grelha/chapa/forno
- Queijo sempre adicionado no final para derreter com calor residual
- Pão sempre na chapa ou forno antes de montar

SOPA:
- Dourar proteína/bacon primeiro, reservar
- Refogar base aromática na gordura resultante
- Adicionar vegetais do mais duro ao mais macio
- Caldo direto na panela, nunca aquecido separadamente
- Creme de leite sempre no final, fogo desligado
- Ervas frescas só na hora de servir

MOLHO:
- Indicar o tipo base (bechamel, tomate, redução, vinagrete)
- Nunca ferver molhos com creme de leite — reduzir em fogo baixo
- Acertar sal e acidez sempre no final
- Especificar consistência esperada

PROIBIDO EM QUALQUER RECEITA:
- Ervas frescas no meio do cozimento
- Creme de leite ou requeijão em fogo alto
- Ingrediente nos passos que não está na lista de ingredientes
- Ingrediente na lista que não aparece nos passos
- Etapas desnecessárias em panelas separadas
- Passos fora de ordem culinária lógica
- Tempo de preparo irreal para a técnica descrita

INFORMAÇÕES NUTRICIONAIS:
- Calcular com base nas quantidades reais listadas
- Dividir corretamente pelo número de porções
- Informar por porção: calorias, proteínas, carboidratos, gorduras, fibras
- Considerar o perfil do usuário e alergias quando disponível para ajustar ingredientes e porções`;

    if (isTransform) {
      prompt = `${chefPersona}

Transforme a seguinte receita aplicando os filtros dietéticos:

RECEITA ORIGINAL:
${existing_recipe}
${filterInstructions}

REGRAS IMPORTANTES:
- Crie um NOVO NOME criativo para a receita transformada
- MANTENHA A MESMA CATEGORIA da receita original

Retorne exclusivamente em JSON válido, sem texto adicional.`;
    } else if (isNutritionMode && nutritionProfile) {
      const np = nutritionProfile;
      const allergiesText = np.allergies?.length > 0
        ? `\n\nALERGIAS E RESTRIÇÕES OBRIGATÓRIAS — A receita NÃO PODE conter nenhum dos seguintes alérgenos:\n${np.allergies.map((a: string) => `- ${a}`).join('\n')}`
        : '';
      const goalMap: Record<string, string> = {
        weight_loss: 'PERDA DE PESO — receita com baixo teor calórico, rica em fibras e proteínas magras',
        muscle_gain: 'GANHO DE MASSA MUSCULAR — receita hiperproteica com carboidratos complexos',
        maintenance: 'MANUTENÇÃO — receita balanceada em macronutrientes',
        general_health: 'SAÚDE GERAL — receita nutritiva, variada e equilibrada',
      };
      const goalText = goalMap[np.goal] || goalMap['general_health'];

      // Handle optional user ingredients
      const userIngredients = Array.isArray(ingredients) && ingredients.length > 0
        ? ingredients.filter((i: unknown) => typeof i === 'string' && (i as string).trim().length > 0)
        : [];
      const ingredientsInstruction = userIngredients.length > 0
        ? `\n\nINGREDIENTES SOLICITADOS PELO USUÁRIO (use obrigatoriamente estes ingredientes na receita, adicionando outros conforme necessário):\n${userIngredients.join(', ')}`
        : '';

      // Handle optional description
      const safeDescription = typeof description === 'string' && description.trim().length > 0
        ? description.trim().substring(0, 200)
        : null;
      const descriptionInstruction = safeDescription
        ? `\n\nDESCRIÇÃO DO PRATO DESEJADO PELO USUÁRIO: "${safeDescription}"\nCrie a receita inspirada nesta descrição, adaptando-a ao perfil nutricional do usuário.`
        : '';

      // Handle dish type in nutrition mode
      const safeDishType = typeof dishType === 'string' && allowedCategories.includes(dishType) ? dishType : null;
      const dishTypeInstruction = safeDishType && categoryMap[safeDishType]
        ? `\n\nTIPO DE PRATO OBRIGATÓRIO: ${categoryMap[safeDishType]}`
        : '';

      prompt = `${chefPersona}

Crie uma receita PERSONALIZADA para o seguinte perfil nutricional:
- Sexo: ${np.sex === 'male' ? 'Masculino' : 'Feminino'}
- Idade: ${np.age} anos
- Peso: ${np.weight_kg} kg
- Altura: ${np.height_cm} cm
- TDEE (calorias diárias): ${Math.round(np.tdee)} kcal
- Objetivo: ${goalText}
${allergiesText}${ingredientsInstruction}${descriptionInstruction}${dishTypeInstruction}

A receita deve ter calorias proporcionais ao TDEE do usuário (aproximadamente 1/3 do TDEE para uma refeição principal).
Deve ser uma refeição completa, saborosa e que atenda ao objetivo nutricional do usuário.

Retorne exclusivamente em JSON válido, sem texto adicional.`;
    } else {
      const safeServings = (typeof servings === 'number' && servings >= 1 && servings <= 20) ? servings : 2;
      const descInstructionNormal = safeDescriptionNormal
        ? `\n\nDESCRIÇÃO DO PRATO DESEJADO PELO USUÁRIO: "${safeDescriptionNormal}"\nCrie a receita inspirada nesta descrição usando os ingredientes fornecidos.`
        : '';
      prompt = `${chefPersona}

Com base nos seguintes ingredientes:
${sanitizedIngredients.join(', ')}
${categoryInstruction}${complexityInstruction}${filterInstructions}${descInstructionNormal}

NÚMERO DE PORÇÕES OBRIGATÓRIO: A receita DEVE render exatamente ${safeServings} porção(ões).

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
    { "name": "", "quantity": "", "calories": 0, "tip": "" }
  ],
  "steps": [
    { "step_number": 1, "title": "", "description": "", "duration": "", "tip": "" }
  ],
  "calories_total": 0,
  "nutrition_info": "",
  "chef_tips": "",
  "substitutions_made": ""
}

Regras:
- Criar nome criativo e atraente
- A receita deve ser ELABORADA e SABOROSA
- Estimar calorias realistas por ingrediente
- O campo "steps" deve ter pelo menos 4-6 passos detalhados
- Incluir tempo de preparo e cozimento
- O campo "nutrition_info" deve detalhar macronutrientes
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
        max_tokens: 3000,
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

    function extractJsonFromResponse(raw: string): Record<string, unknown> {
      let cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('No JSON found:', cleaned.substring(0, 300));
        throw new Error('No JSON object found');
      }

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

      try {
        return JSON.parse(cleaned);
      } catch (_e) {
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

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, Share2, Check, Clock, ChefHat, Users, Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import BottomNav from '@/components/BottomNav';
import bgUtensils from '@/assets/bg-utensils.jpg';

interface Ingredient {
  name: string;
  quantity: string;
  calories: number;
  tip?: string;
}

interface Step {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
  tip?: string;
}

interface RecipeMeta {
  nutrition_info?: string;
  chef_tips?: string;
  difficulty?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
  steps?: Step[];
}

const RecipeResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Tables<'recipes'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error('Receita não encontrada');
          navigate('/');
        } else {
          setRecipe(data);
        }
        setLoading(false);
      });
  }, [id, navigate]);

  const handleShare = async () => {
    if (!recipe) return;
    const text = `🍽️ ${recipe.recipe_name}\n🔥 ${recipe.calories_total} kcal\n\nFeito com NutriChef AI`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-14 space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-muted mt-4" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!recipe) return null;

  const ingredients = (recipe.ingredients as unknown as Ingredient[]) || [];

  // Parse meta from nutrition_info (new format stores JSON)
  let meta: RecipeMeta = {};
  try {
    const parsed = JSON.parse(recipe.nutrition_info || '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      meta = parsed;
    }
  } catch {
    meta = { nutrition_info: recipe.nutrition_info || '' };
  }

  const steps = meta.steps || [];
  const hasDetailedFormat = steps.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img src={bgUtensils} alt="" className="h-52 w-full object-cover opacity-15" />
        <div className="absolute inset-0 h-52 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-14 pb-4">
          <button
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-foreground truncate">{recipe.recipe_name}</h1>
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"
            >
              <Flame className="h-4 w-4" />
              {recipe.calories_total} kcal
            </motion.div>

            {meta.difficulty && (
              <div className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                <Gauge className="h-3 w-3" />
                {meta.difficulty}
              </div>
            )}

            {meta.prep_time && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <Clock className="h-3 w-3" />
                Preparo: {meta.prep_time}
              </div>
            )}

            {meta.cook_time && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <Clock className="h-3 w-3" />
                Cozimento: {meta.cook_time}
              </div>
            )}

            {meta.servings && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <Users className="h-3 w-3" />
                {meta.servings} porções
              </div>
            )}

            <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <Check className="h-3 w-3" /> Salvo
            </div>
          </div>

          {/* Ingredients */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-card-foreground">🧑‍🍳 Ingredientes</h2>
            <div className="space-y-2.5">
              {ingredients.map((ing, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-card-foreground font-medium">
                      {ing.name} — <span className="text-muted-foreground font-normal">{ing.quantity}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{ing.calories} kcal</span>
                  </div>
                  {ing.tip && (
                    <p className="text-xs text-muted-foreground italic pl-2">💡 {ing.tip}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-step */}
          {hasDetailedFormat ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-4 text-sm font-semibold text-card-foreground">📝 Passo a Passo</h2>
              <div className="space-y-4">
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative pl-8"
                  >
                    {/* Step number circle */}
                    <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step.step_number}
                    </div>
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className="absolute left-[11px] top-7 h-[calc(100%)] w-0.5 bg-border" />
                    )}
                    <div className="pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-card-foreground">{step.title}</h3>
                        {step.duration && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {step.duration}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                      {step.tip && (
                        <p className="mt-1.5 text-xs text-primary/80 italic">💡 Dica: {step.tip}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">📝 Modo de Preparo</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {recipe.preparation}
              </p>
            </div>
          )}

          {/* Chef Tips */}
          {meta.chef_tips && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h2 className="mb-2 text-sm font-semibold text-primary flex items-center gap-1.5">
                <ChefHat className="h-4 w-4" /> Dicas do Chef
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                {meta.chef_tips}
              </p>
            </div>
          )}

          {/* Nutrition */}
          {(meta.nutrition_info || (!hasDetailedFormat && recipe.nutrition_info)) && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">📊 Informações Nutricionais</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {meta.nutrition_info || recipe.nutrition_info}
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RecipeResult;

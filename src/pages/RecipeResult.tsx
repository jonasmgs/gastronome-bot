import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, Share2, Check, Clock, ChefHat, Users, Gauge, Leaf, WheatOff, MilkOff, Loader2, Wand2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';
import BottomNav from '@/components/BottomNav';
import RecipeChat from '@/components/RecipeChat';
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
  dietary_tags?: string[];
  substitutions_made?: string;
}

interface DietaryFilters {
  vegan: boolean;
  glutenFree: boolean;
  lactoseFree: boolean;
}

const RecipeResult = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Tables<'recipes'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [transforming, setTransforming] = useState(false);
  const [filters, setFilters] = useState<DietaryFilters>({ vegan: false, glutenFree: false, lactoseFree: false });
  const [chatOpen, setChatOpen] = useState(false);

  usePageTitle(recipe?.recipe_name);

  const fetchRecipe = () => {
    if (!id) return;
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error(t('recipes.notFound'));
          navigate('/');
        } else {
          setRecipe(data);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecipe();
  }, [id, navigate]);

  const handleShare = async () => {
    if (!recipe) return;
    const text = `🍽️ ${recipe.recipe_name}\n🔥 ${recipe.calories_total} kcal\n\nFeito com Gastronom.IA`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copied'));
    }
  };

  const toggleFilter = (key: keyof DietaryFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasActiveFilters = filters.vegan || filters.glutenFree || filters.lactoseFree;

  const transformRecipe = async () => {
    if (!recipe || !hasActiveFilters || !user) return;
    setTransforming(true);
    try {
      const ingredients = (recipe.ingredients as unknown as Ingredient[]) || [];
      const existingText = `Nome: ${recipe.recipe_name}\nIngredientes: ${ingredients.map(i => `${i.name} (${i.quantity})`).join(', ')}\nPreparo: ${recipe.preparation}`;

      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: { mode: 'transform', existing_recipe: existingText, filters },
      });
      if (error) throw error;

      const transformed = data;
      const preparation = transformed.steps
        ? transformed.steps.map((s: any) => `${s.step_number}. ${s.title}: ${s.description}`).join('\n\n')
        : transformed.preparation || '';

      const { data: saved, error: saveErr } = await supabase.from('recipes').insert({
        user_id: user.id,
        recipe_name: transformed.recipe_name,
        ingredients: transformed.ingredients,
        preparation,
        calories_total: transformed.calories_total,
        nutrition_info: JSON.stringify({
          nutrition_info: transformed.nutrition_info || '',
          chef_tips: transformed.chef_tips || '',
          difficulty: transformed.difficulty || '',
          prep_time: transformed.prep_time || '',
          cook_time: transformed.cook_time || '',
          servings: transformed.servings || 0,
          steps: transformed.steps || [],
          dietary_tags: transformed.dietary_tags || [],
          substitutions_made: transformed.substitutions_made || '',
        }),
      }).select().single();

      if (saveErr) throw saveErr;
      toast.success(t('recipe.transformed'));
      navigate(`/recipe/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || t('recipe.transformError'));
    } finally {
      setTransforming(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background pb-24" role="main">
        <div className="px-5 pt-14 space-y-4" role="status" aria-label={t('common.loading')}>
          <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <span className="sr-only">{t('common.loading')}</span>
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!recipe) return null;

  const ingredients = (recipe.ingredients as unknown as Ingredient[]) || [];

  let meta: RecipeMeta = {};
  try {
    const parsed = JSON.parse(recipe.nutrition_info || '{}');
    if (typeof parsed === 'object' && parsed !== null) meta = parsed;
  } catch {
    meta = { nutrition_info: recipe.nutrition_info || '' };
  }

  const steps = meta.steps || [];
  const hasDetailedFormat = steps.length > 0;

  return (
    <main className="min-h-screen bg-background pb-24 relative" role="main">
      {/* Background */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img src={bgUtensils} alt="" className="h-52 w-full object-cover opacity-15" />
        <div className="absolute inset-0 h-52 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 pt-14 pb-4">
          <button onClick={() => navigate('/')} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground" aria-label={t('common.cancel')}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-base font-bold text-foreground line-clamp-2 leading-tight">{recipe.recipe_name}</h1>
          <button onClick={handleShare} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2" role="list" aria-label="Recipe info">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary" role="listitem">
              <Flame className="h-4 w-4" />
              {recipe.calories_total} {t('common.kcal')}
            </motion.div>
            {meta.difficulty && (
              <div className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground" role="listitem">
                <Gauge className="h-3 w-3" /> {meta.difficulty}
              </div>
            )}
            {meta.prep_time && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
                <Clock className="h-3 w-3" /> {t('common.prep')}: {meta.prep_time}
              </div>
            )}
            {meta.cook_time && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
                <Clock className="h-3 w-3" /> {t('common.cooking')}: {meta.cook_time}
              </div>
            )}
            {meta.servings && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
                <Users className="h-3 w-3" /> {meta.servings} {t('common.portions')}
              </div>
            )}
            {meta.dietary_tags && meta.dietary_tags.length > 0 && meta.dietary_tags.map((tag, i) => (
              <div key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary" role="listitem">
                <Leaf className="h-3 w-3" /> {tag}
              </div>
            ))}
            <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
              <Check className="h-3 w-3" /> {t('common.saved')}
            </div>
          </div>

          {/* Substitutions made */}
          {meta.substitutions_made && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h2 className="mb-2 text-sm font-semibold text-primary flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" /> {t('recipe.substitutionsMade')}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{meta.substitutions_made}</p>
            </section>
          )}

          {/* Dietary Filter Transform */}
          <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.transformRecipe')}>
            <h2 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-1.5">
              <Wand2 className="h-4 w-4" /> {t('recipe.transformRecipe')}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">{t('recipe.transformDescription')}</p>
            <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={t('recipe.transformRecipe')}>
              <button onClick={() => toggleFilter('vegan')} aria-pressed={filters.vegan} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${filters.vegan ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <Leaf className="h-3.5 w-3.5" /> {t('recipe.vegan')}
              </button>
              <button onClick={() => toggleFilter('glutenFree')} aria-pressed={filters.glutenFree} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${filters.glutenFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <WheatOff className="h-3.5 w-3.5" /> {t('recipe.glutenFree')}
              </button>
              <button onClick={() => toggleFilter('lactoseFree')} aria-pressed={filters.lactoseFree} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${filters.lactoseFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <MilkOff className="h-3.5 w-3.5" /> {t('recipe.lactoseFree')}
              </button>
            </div>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={transformRecipe}
                disabled={transforming}
                aria-busy={transforming}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {transforming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {transforming ? t('recipe.transforming') : t('recipe.transform')}
              </motion.button>
            )}
          </section>

          {/* Ingredients */}
          <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.ingredients')}>
            <h2 className="mb-3 text-sm font-semibold text-card-foreground">{t('recipe.ingredients')}</h2>
            <ul className="space-y-2.5" role="list">
              {ingredients.map((ing, i) => (
                <li key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-card-foreground font-medium">
                      {ing.name} — <span className="text-muted-foreground font-normal">{ing.quantity}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{ing.calories} {t('common.kcal')}</span>
                  </div>
                  {ing.tip && <p className="text-xs text-muted-foreground italic pl-2">💡 {ing.tip}</p>}
                </li>
              ))}
            </ul>
          </section>

          {/* Step-by-step */}
          {hasDetailedFormat ? (
            <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.stepByStep')}>
              <h2 className="mb-4 text-sm font-semibold text-card-foreground">{t('recipe.stepByStep')}</h2>
              <ol className="space-y-4" role="list">
                {steps.map((step, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-8">
                    <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">{step.step_number}</div>
                    {i < steps.length - 1 && <div className="absolute left-[11px] top-7 h-[calc(100%)] w-0.5 bg-border" aria-hidden="true" />}
                    <div className="pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-card-foreground">{step.title}</h3>
                        {step.duration && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {step.duration}</span>}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                      {step.tip && <p className="mt-1.5 text-xs text-primary/80 italic">💡 {t('recipe.tip')}: {step.tip}</p>}
                    </div>
                  </motion.li>
                ))}
              </ol>
            </section>
          ) : (
            <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.preparation')}>
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">{t('recipe.preparation')}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{recipe.preparation}</p>
            </section>
          )}

          {/* Chef Tips */}
          {meta.chef_tips && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h2 className="mb-2 text-sm font-semibold text-primary flex items-center gap-1.5"><ChefHat className="h-4 w-4" /> {t('recipe.chefTips')}</h2>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{meta.chef_tips}</p>
            </section>
          )}

          {/* Nutrition */}
          {(meta.nutrition_info || (!hasDetailedFormat && recipe.nutrition_info)) && (
            <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.nutritionInfo')}>
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">{t('recipe.nutritionInfo')}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{meta.nutrition_info || recipe.nutrition_info}</p>
            </section>
          )}
        </div>
      </div>

      {/* Chat FAB */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95 hover:shadow-xl"
        aria-label={t('recipe.askChef')}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {chatOpen && (
          <RecipeChat
            recipe={{
              name: recipe.recipe_name,
              ingredients: ingredients.map(i => `${i.name} (${i.quantity})`).join(', '),
              preparation: recipe.preparation,
              calories: recipe.calories_total,
            }}
            recipeId={recipe.id}
            rawIngredients={ingredients}
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            onRecipeUpdated={fetchRecipe}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
};

export default RecipeResult;

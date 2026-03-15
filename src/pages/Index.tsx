import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePageTitle } from '@/hooks/usePageTitle';
import BottomNav from '@/components/BottomNav';
import IngredientCard from '@/components/IngredientCard';
import LanguageSelector from '@/components/LanguageSelector';
import RecipeFilters from '@/components/RecipeFilters';
import bgIngredients from '@/assets/bg-ingredients.jpg';
import bgIngredients2 from '@/assets/bg-ingredients-2.jpg';
import bgIngredients3 from '@/assets/bg-ingredients-3.jpg';
import bgIngredients4 from '@/assets/bg-ingredients-4.jpg';
import bgUtensils from '@/assets/bg-utensils.jpg';

const bgImages = [bgIngredients, bgIngredients2, bgIngredients3, bgIngredients4, bgUtensils];

const Index = () => {
  const { t } = useTranslation();
  usePageTitle();
  const { user } = useAuth();
  const { name } = useProfile();
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [currentBg, setCurrentBg] = useState(0);
  const [servings, setServings] = useState<number>(2);
  const [showServingsModal, setShowServingsModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateClick = () => {
    if (ingredients.length < 2) {
      toast.error(t('home.minIngredients'));
      return;
    }
    setShowServingsModal(true);
  };

  const generateRecipe = async () => {
    setShowServingsModal(false);
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: { ingredients, category, complexity, servings },
      });
      if (error) throw error;

      const recipe = data;
      const preparation = recipe.steps
        ? recipe.steps.map((s: any) => `${s.step_number}. ${s.title}: ${s.description}`).join('\n\n')
        : recipe.preparation || '';

      const { data: saved, error: saveErr } = await supabase.from('recipes').insert({
        user_id: user!.id,
        recipe_name: recipe.recipe_name,
        ingredients: recipe.ingredients,
        preparation,
        calories_total: recipe.calories_total,
        nutrition_info: JSON.stringify({
          nutrition_info: recipe.nutrition_info || '',
          chef_tips: recipe.chef_tips || '',
          difficulty: recipe.difficulty || '',
          prep_time: recipe.prep_time || '',
          cook_time: recipe.cook_time || '',
          servings: recipe.servings || servings,
          steps: recipe.steps || [],
        }),
      }).select().single();

      if (saveErr) throw saveErr;
      navigate(`/recipe/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || t('home.errorGenerating'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24 relative overflow-hidden" role="main">
      {/* Rotating Background Images */}
      <div className="absolute inset-0 z-0 h-80" aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentBg}
            src={bgImages[currentBg]}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 h-80 w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 h-80 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      <div className="relative z-10">
        <header className="px-5 pt-14 pb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('home.hello')}</p>
            <h1 className="text-2xl font-bold text-foreground">{name || t('home.chef')} 👋</h1>
          </div>
          <div className="pt-1">
            <LanguageSelector />
          </div>
        </header>

        {/* Badge */}
        <div className="px-5 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3 w-3" /> {t('common.testMode')}
          </span>
        </div>

        {/* Shared Filters */}
        <div className="px-5 mb-4">
          <RecipeFilters
            category={category}
            onCategoryChange={setCategory}
            complexity={complexity}
            onComplexityChange={setComplexity}
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
          />
        </div>

        {/* Ingredients List (visual cards) */}
        <section className="px-5 mb-6" aria-label={t('recipe.ingredients')}>
          {ingredients.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2" role="list">
              {ingredients.map((ing) => (
                <IngredientCard key={ing} name={ing} onRemove={() => setIngredients((prev) => prev.filter((i) => i !== ing))} />
              ))}
            </motion.div>
          ) : (
            <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
              <UtensilsCrossed className="mb-3 h-12 w-12 opacity-30" aria-hidden="true" />
              <p className="text-sm">{t('home.addIngredients')}</p>
              <p className="text-xs mt-1 opacity-70" aria-hidden="true">🍳 🥘 🔪 🥄</p>
            </div>
          )}
        </section>

        {/* Generate Button */}
        {ingredients.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-5">
            <button
              onClick={handleGenerateClick}
              disabled={generating}
              aria-busy={generating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generating ? t('home.generating') : t('home.generate')}
            </button>
          </motion.div>
        )}

        {/* Servings Modal */}
        <AnimatePresence>
          {showServingsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
              onClick={() => setShowServingsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
              >
                <h3 className="text-lg font-semibold text-card-foreground mb-1">{t('home.servingsTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-5">{t('home.servingsDescription')}</p>
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground text-lg font-bold transition-colors hover:bg-accent"
                  >−</button>
                  <span className="text-3xl font-bold text-foreground w-12 text-center">{servings}</span>
                  <button
                    onClick={() => setServings(Math.min(20, servings + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground text-lg font-bold transition-colors hover:bg-accent"
                  >+</button>
                </div>
                <button
                  onClick={generateRecipe}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('home.generate')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </main>
  );
};

export default Index;

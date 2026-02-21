import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Loader2, UtensilsCrossed, Salad, Cake, Beef, Sandwich, Zap, ChefHat, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePageTitle } from '@/hooks/usePageTitle';
import BottomNav from '@/components/BottomNav';
import IngredientCard from '@/components/IngredientCard';
import LanguageSelector from '@/components/LanguageSelector';
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
  const [ingredient, setIngredient] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<string | null>(null);
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addIngredient = () => {
    const trimmed = ingredient.trim();
    if (!trimmed) return;
    if (ingredients.includes(trimmed)) {
      toast.error(t('home.alreadyAdded'));
      return;
    }
    setIngredients((prev) => [...prev, trimmed]);
    setIngredient('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  const generateRecipe = async () => {
    if (ingredients.length < 2) {
      toast.error(t('home.minIngredients'));
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: { ingredients, category, complexity },
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
          servings: recipe.servings || 0,
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

  const categories = [
    { id: 'salada', label: t('home.salad'), icon: Salad },
    { id: 'sobremesa', label: t('home.dessert'), icon: Cake },
    { id: 'salgado', label: t('home.savory'), icon: Beef },
    { id: 'lanche', label: t('home.snack'), icon: Sandwich },
  ];

  const complexities = [
    { id: 'simples', label: t('home.simple'), icon: Zap },
    { id: 'media', label: t('home.medium'), icon: ChefHat },
    { id: 'elaborada', label: t('home.elaborate'), icon: Crown },
  ];

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

        {/* Category Selector */}
        <section className="px-5 mb-4" aria-label={t('home.dishType')}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('home.dishType')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(category === cat.id ? null : cat.id)}
                aria-pressed={category === cat.id}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  category === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card/80 backdrop-blur-sm border border-input text-muted-foreground'
                }`}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Complexity Selector */}
        <section className="px-5 mb-4" aria-label={t('home.complexity')}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('home.complexity')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group">
            {complexities.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setComplexity(complexity === opt.id ? null : opt.id)}
                aria-pressed={complexity === opt.id}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  complexity === opt.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card/80 backdrop-blur-sm border border-input text-muted-foreground'
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <div className="px-5 mb-4">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="ingredient-input">{t('home.ingredientPlaceholder')}</label>
            <input
              id="ingredient-input"
              type="text"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('home.ingredientPlaceholder')}
              className="flex-1 rounded-xl border border-input bg-card/90 backdrop-blur-sm py-3 px-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addIngredient}
              aria-label={t('home.ingredientPlaceholder')}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Ingredients List */}
        <section className="px-5 mb-6" aria-label={t('recipe.ingredients')}>
          <AnimatePresence>
            {ingredients.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2" role="list">
                {ingredients.map((ing) => (
                  <IngredientCard key={ing} name={ing} onRemove={() => setIngredients((prev) => prev.filter((i) => i !== ing))} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {ingredients.length === 0 && (
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
              onClick={generateRecipe}
              disabled={generating}
              aria-busy={generating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generating ? t('home.generating') : t('home.generate')}
            </button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </main>
  );
};

export default Index;

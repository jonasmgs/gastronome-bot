import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, WheatOff, MilkOff, Loader2, Wand2, ClipboardPaste, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import BottomNav from '@/components/BottomNav';
import bgIngredients3 from '@/assets/bg-ingredients-3.jpg';

interface DietaryFilters {
  vegan: boolean;
  glutenFree: boolean;
  lactoseFree: boolean;
}

const EditRecipe = () => {
  const { t } = useTranslation();
  usePageTitle(t('edit.title').replace(' ✨', ''));
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipeText, setRecipeText] = useState('');
  const [filters, setFilters] = useState<DietaryFilters>({ vegan: false, glutenFree: false, lactoseFree: false });
  const [transforming, setTransforming] = useState(false);
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState('');

  useUnsavedChanges(touched && recipeText.trim().length > 0);

  const toggleFilter = (key: keyof DietaryFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    setTouched(true);
  };

  const hasActiveFilters = filters.vegan || filters.glutenFree || filters.lactoseFree;
  const canSubmit = recipeText.trim().length > 10 && hasActiveFilters;

  const validate = (): boolean => {
    if (recipeText.trim().length <= 10) {
      setValidationError(t('edit.validationMin'));
      return false;
    }
    if (!hasActiveFilters) {
      setValidationError(t('edit.validationFilter'));
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleTransform = async () => {
    if (!validate() || !user) return;
    setTransforming(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: { mode: 'transform', existing_recipe: recipeText, filters },
      });
      if (error) throw error;

      const recipe = data;
      const preparation = recipe.steps
        ? recipe.steps.map((s: any) => `${s.step_number}. ${s.title}: ${s.description}`).join('\n\n')
        : recipe.preparation || '';

      const { data: saved, error: saveErr } = await supabase.from('recipes').insert({
        user_id: user.id,
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
          dietary_tags: recipe.dietary_tags || [],
          substitutions_made: recipe.substitutions_made || '',
        }),
      }).select().single();

      if (saveErr) throw saveErr;
      setTouched(false);
      toast.success(t('edit.transformed'));
      navigate(`/recipe/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || t('edit.transformError'));
    } finally {
      setTransforming(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipeText(text);
      setTouched(true);
      setValidationError('');
      toast.success(t('edit.pasted'));
    } catch {
      toast.error(t('edit.pasteError'));
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24 relative overflow-hidden" role="main">
      <div className="absolute inset-0 z-0 h-64" aria-hidden="true">
        <img src={bgIngredients3} alt="" className="h-64 w-full object-cover opacity-20" />
        <div className="absolute inset-0 h-64 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10">
        <header className="px-5 pt-14 pb-4">
          <h1 className="text-2xl font-bold text-foreground">{t('edit.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('edit.subtitle')}</p>
        </header>

        <div className="px-5 space-y-4">
          {/* Recipe textarea */}
          <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('edit.yourRecipe')}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-card-foreground">{t('edit.yourRecipe')}</h2>
              <button onClick={handlePaste} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent" aria-label={t('edit.paste')}>
                <ClipboardPaste className="h-3 w-3" /> {t('edit.paste')}
              </button>
            </div>
            <textarea
              value={recipeText}
              onChange={(e) => { setRecipeText(e.target.value); setTouched(true); setValidationError(''); }}
              placeholder={t('edit.placeholder')}
              rows={8}
              aria-label={t('edit.yourRecipe')}
              aria-invalid={!!validationError && recipeText.trim().length <= 10}
              className={`w-full rounded-xl border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors ${
                validationError && recipeText.trim().length <= 10 ? 'border-destructive' : 'border-input'
              }`}
            />
            {validationError && recipeText.trim().length <= 10 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="h-3 w-3" /> {validationError}
              </p>
            )}
          </section>

          {/* Dietary filters */}
          <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('edit.dietaryFilters')}>
            <h2 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-1.5">
              <Wand2 className="h-4 w-4" /> {t('edit.dietaryFilters')}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">{t('edit.filterDescription')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('edit.dietaryFilters')}>
              <button onClick={() => toggleFilter('vegan')} aria-pressed={filters.vegan} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${filters.vegan ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <Leaf className="h-4 w-4" /> {t('recipe.vegan')}
              </button>
              <button onClick={() => toggleFilter('glutenFree')} aria-pressed={filters.glutenFree} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${filters.glutenFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <WheatOff className="h-4 w-4" /> {t('recipe.glutenFree')}
              </button>
              <button onClick={() => toggleFilter('lactoseFree')} aria-pressed={filters.lactoseFree} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${filters.lactoseFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <MilkOff className="h-4 w-4" /> {t('recipe.lactoseFree')}
              </button>
            </div>
            {validationError && !hasActiveFilters && recipeText.trim().length > 10 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="h-3 w-3" /> {validationError}
              </p>
            )}
          </section>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: canSubmit ? 1 : 0.5, y: 0 }}
            onClick={handleTransform}
            disabled={transforming}
            aria-busy={transforming}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {transforming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {transforming ? t('edit.transforming') : t('edit.transform')}
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
};

export default EditRecipe;

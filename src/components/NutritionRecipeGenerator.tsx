import { useState } from 'react';
import { Sparkles, Loader2, Save, Share2, Plus, X, Salad, Cake, Beef, Sandwich, Soup, Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface NutritionData {
  height_cm: number | '';
  weight_kg: number | '';
  sex: 'male' | 'female' | '';
  age: number | '';
  goal: string;
  allergies: string[];
  tdee: number;
}

interface Step {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
}

interface GeneratedRecipe {
  recipe_name: string;
  ingredients: { name: string; quantity: string; calories: number }[];
  steps: Step[];
  calories_total: number;
  nutrition_info?: string;
  chef_tips?: string;
  difficulty?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
}

interface Props {
  nutritionData: NutritionData;
}

const NutritionRecipeGenerator = ({ nutritionData }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  // New fields
  const [description, setDescription] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [dishType, setDishType] = useState<string | null>(null);

  const dishTypes = [
    { id: 'salada', label: t('home.salad'), icon: Salad },
    { id: 'sobremesa', label: t('home.dessert'), icon: Cake },
    { id: 'salgado', label: t('home.savory'), icon: Beef },
    { id: 'lanche', label: t('home.snack'), icon: Sandwich },
    { id: 'sopa', label: t('nutrition.soup'), icon: Soup },
    { id: 'molho', label: t('nutrition.sauce'), icon: Droplets },
  ];

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (!trimmed) return;
    if (ingredients.includes(trimmed)) {
      toast.error(t('home.alreadyAdded'));
      return;
    }
    setIngredients(prev => [...prev, trimmed]);
    setIngredientInput('');
  };

  const generate = async () => {
    setGenerating(true);
    setRecipe(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: {
          ingredients: ingredients.length > 0 ? ingredients : [],
          category: null,
          complexity: null,
          servings: 2,
          nutritionMode: true,
          nutritionProfile: {
            tdee: nutritionData.tdee,
            goal: nutritionData.goal,
            allergies: nutritionData.allergies,
            sex: nutritionData.sex,
            age: nutritionData.age,
            weight_kg: nutritionData.weight_kg,
            height_cm: nutritionData.height_cm,
          },
          description: description.trim() || null,
          dishType: dishType,
        },
      });
      if (error) throw error;
      setRecipe(data as GeneratedRecipe);
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!recipe || !user) return;
    setSaving(true);
    try {
      const preparation = recipe.steps
        ? recipe.steps.map(s => `${s.step_number}. ${s.title}: ${s.description}`).join('\n\n')
        : '';
      const { data: saved, error } = await supabase.from('recipes').insert({
        user_id: user.id,
        recipe_name: recipe.recipe_name,
        ingredients: recipe.ingredients as any,
        preparation,
        calories_total: recipe.calories_total,
        nutrition_info: JSON.stringify({
          nutrition_info: recipe.nutrition_info || '',
          chef_tips: recipe.chef_tips || '',
          difficulty: recipe.difficulty || '',
          prep_time: recipe.prep_time || '',
          cook_time: recipe.cook_time || '',
          servings: recipe.servings || 2,
          steps: recipe.steps || [],
        }),
      }).select().single();
      if (error) throw error;
      toast.success(t('recipe.saved'));
      navigate(`/recipe/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!recipe) return;
    let text = `🍽️ ${recipe.recipe_name}\n🔥 ${recipe.calories_total} kcal\n`;
    if (recipe.servings) text += `👥 ${recipe.servings} ${t('common.portions')}\n`;
    text += `\n${t('recipe.ingredients')}\n`;
    recipe.ingredients.forEach(i => { text += `• ${i.name} — ${i.quantity}\n`; });
    if (recipe.steps?.length) {
      text += `\n${t('recipe.stepByStep')}\n`;
      recipe.steps.forEach(s => { text += `${s.step_number}. ${s.title}: ${s.description}\n`; });
    }
    if (recipe.nutrition_info) text += `\n📊 ${recipe.nutrition_info}\n`;
    text += `\nFeito com Gastronom.IA`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copied'));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> {t('nutrition.personalizedRecipes')}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{t('nutrition.personalizedDesc')}</p>

      {/* Description input */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{t('nutrition.descriptionLabel')}</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('nutrition.descriptionPlaceholder')}
          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Dish type selector */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">{t('nutrition.dishTypeLabel')}</label>
        <div className="flex flex-wrap gap-2">
          {dishTypes.map(dt => (
            <button
              key={dt.id}
              onClick={() => setDishType(dishType === dt.id ? null : dt.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                dishType === dt.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'border border-input bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              <dt.icon className="h-3.5 w-3.5" />
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredient input */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{t('nutrition.ingredientsLabel')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ingredientInput}
            onChange={e => setIngredientInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
            placeholder={t('nutrition.ingredientPlaceholder')}
            className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addIngredient}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <AnimatePresence>
          {ingredients.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1.5 mt-2">
              {ingredients.map(ing => (
                <span key={ing} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {ing}
                  <button onClick={() => setIngredients(prev => prev.filter(i => i !== ing))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={generate}
        disabled={generating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? t('home.generating') : t('nutrition.generateRecipe')}
      </button>

      {recipe && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-base font-bold text-card-foreground">{recipe.recipe_name}</h3>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>🔥 {recipe.calories_total} kcal</span>
            {recipe.difficulty && <span>📊 {recipe.difficulty}</span>}
            {recipe.prep_time && <span>⏱️ {recipe.prep_time}</span>}
            {recipe.servings && <span>👥 {recipe.servings} {t('common.portions')}</span>}
          </div>

          <div>
            <p className="text-xs font-semibold text-card-foreground mb-1">{t('recipe.ingredients')}</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>• {ing.name} — {ing.quantity} ({ing.calories} kcal)</li>
              ))}
            </ul>
          </div>

          {recipe.steps && recipe.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-card-foreground mb-1">{t('recipe.stepByStep')}</p>
              <ol className="text-xs text-muted-foreground space-y-1">
                {recipe.steps.map((step, i) => (
                  <li key={i}>
                    <span className="font-medium">{step.step_number}. {step.title}:</span> {step.description}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {recipe.nutrition_info && (
            <div>
              <p className="text-xs font-semibold text-card-foreground mb-1">{t('recipe.nutritionInfo')}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{recipe.nutrition_info}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('common.save')}
            </button>
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-card-foreground transition-all active:scale-[0.98]"
            >
              <Share2 className="h-3.5 w-3.5" />
              {t('nutrition.share')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default NutritionRecipeGenerator;

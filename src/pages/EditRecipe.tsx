import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, WheatOff, MilkOff, Loader2, Wand2, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BottomNav from '@/components/BottomNav';
import bgIngredients3 from '@/assets/bg-ingredients-3.jpg';

interface DietaryFilters {
  vegan: boolean;
  glutenFree: boolean;
  lactoseFree: boolean;
}

const EditRecipe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipeText, setRecipeText] = useState('');
  const [filters, setFilters] = useState<DietaryFilters>({ vegan: false, glutenFree: false, lactoseFree: false });
  const [transforming, setTransforming] = useState(false);

  const toggleFilter = (key: keyof DietaryFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasActiveFilters = filters.vegan || filters.glutenFree || filters.lactoseFree;
  const canSubmit = recipeText.trim().length > 10 && hasActiveFilters;

  const handleTransform = async () => {
    if (!canSubmit || !user) return;
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
      toast.success('Receita transformada!');
      navigate(`/recipe/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao transformar receita');
    } finally {
      setTransforming(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipeText(text);
      toast.success('Receita colada!');
    } catch {
      toast.error('Não foi possível acessar a área de transferência');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 h-64">
        <img src={bgIngredients3} alt="" className="h-64 w-full object-cover opacity-20" />
        <div className="absolute inset-0 h-64 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10">
        <div className="px-5 pt-14 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Editar Receita ✨</h1>
          <p className="text-sm text-muted-foreground mt-1">Cole uma receita e aplique filtros dietéticos</p>
        </div>

        <div className="px-5 space-y-4">
          {/* Recipe text input */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-card-foreground">📋 Sua Receita</h2>
              <button onClick={handlePaste} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent">
                <ClipboardPaste className="h-3 w-3" /> Colar
              </button>
            </div>
            <textarea
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              placeholder="Cole ou digite a receita aqui...&#10;&#10;Ex: Bolo de chocolate&#10;Ingredientes: 2 ovos, 1 xícara de farinha de trigo, 1/2 xícara de chocolate em pó...&#10;Modo de preparo: Misture os ingredientes secos..."
              rows={8}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Dietary Filters */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-1.5">
              <Wand2 className="h-4 w-4" /> Filtros Dietéticos
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Escolha os filtros para transformar a receita</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleFilter('vegan')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${filters.vegan ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}
              >
                <Leaf className="h-4 w-4" /> Vegana
              </button>
              <button
                onClick={() => toggleFilter('glutenFree')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${filters.glutenFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}
              >
                <WheatOff className="h-4 w-4" /> Sem Glúten
              </button>
              <button
                onClick={() => toggleFilter('lactoseFree')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${filters.lactoseFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}
              >
                <MilkOff className="h-4 w-4" /> Sem Lactose
              </button>
            </div>
          </div>

          {/* Transform Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: canSubmit ? 1 : 0.5, y: 0 }}
            onClick={handleTransform}
            disabled={!canSubmit || transforming}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {transforming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {transforming ? 'Transformando...' : 'Transformar Receita'}
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EditRecipe;

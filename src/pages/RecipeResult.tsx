import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, Share2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import BottomNav from '@/components/BottomNav';

interface Ingredient {
  name: string;
  quantity: string;
  calories: number;
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

  return (
    <div className="min-h-screen bg-background pb-24">
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
        {/* Calories Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
        >
          <Flame className="h-4 w-4" />
          {recipe.calories_total} kcal
        </motion.div>

        {/* Saved badge */}
        <div className="inline-flex items-center gap-1 ml-3 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
          <Check className="h-3 w-3" /> Salvo automaticamente
        </div>

        {/* Ingredients */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-card-foreground">Ingredientes</h2>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-card-foreground">
                  {ing.name} — <span className="text-muted-foreground">{ing.quantity}</span>
                </span>
                <span className="text-xs text-muted-foreground">{ing.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preparation */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-card-foreground">Modo de Preparo</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {recipe.preparation}
          </p>
        </div>

        {/* Nutrition */}
        {recipe.nutrition_info && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-card-foreground">Informações Nutricionais</h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {recipe.nutrition_info}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RecipeResult;

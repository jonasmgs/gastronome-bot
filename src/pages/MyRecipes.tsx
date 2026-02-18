import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';
import BottomNav from '@/components/BottomNav';

const MyRecipes = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Tables<'recipes'>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRecipes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, [user]);

  const deleteRecipe = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      toast.error(t('recipes.deleteError'));
    } else {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast.success(t('recipes.deleted'));
    }
  };

  const dateLocale = i18n.language?.startsWith('pt') ? 'pt-BR' : i18n.language?.startsWith('es') ? 'es-ES' : i18n.language?.startsWith('de') ? 'de-DE' : i18n.language?.startsWith('it') ? 'it-IT' : i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-foreground">{t('recipes.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('recipes.count', { count: recipes.length })}</p>
      </div>

      <div className="px-5 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))
        ) : recipes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
            <BookOpen className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">{t('recipes.noRecipes')}</p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <button onClick={() => navigate(`/recipe/${recipe.id}`)} className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-card-foreground">{recipe.recipe_name}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3" />
                  {recipe.calories_total} {t('common.kcal')}
                  <span>•</span>
                  {new Date(recipe.created_at).toLocaleDateString(dateLocale)}
                </div>
              </button>
              <button
                onClick={() => deleteRecipe(recipe.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyRecipes;

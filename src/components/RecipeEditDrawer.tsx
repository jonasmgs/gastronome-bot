import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Save, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Ingredient {
  name: string;
  quantity: string;
  calories: number;
  tip?: string;
}

interface RecipeEditDrawerProps {
  open: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
  ingredients: Ingredient[];
  preparation: string;
  onRecipeUpdated: () => void;
  onOpenChat: () => void;
}

const RecipeEditDrawer = ({
  open,
  onClose,
  recipeId,
  recipeName,
  ingredients,
  preparation,
  onRecipeUpdated,
  onOpenChat,
}: RecipeEditDrawerProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(recipeName);
  const [ings, setIngs] = useState<Ingredient[]>(ingredients);
  const [prep, setPrep] = useState(preparation);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(recipeName);
      setIngs(ingredients);
      setPrep(preparation);
    }
  }, [open, recipeName, ingredients, preparation]);

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setIngs(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  };

  const removeIngredient = (index: number) => {
    setIngs(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngs(prev => [...prev, { name: '', quantity: '', calories: 0 }]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const totalCalories = ings.reduce((sum, ing) => sum + (ing.calories || 0), 0);
      const { error } = await supabase
        .from('recipes')
        .update({
          recipe_name: name.trim(),
          ingredients: ings.filter(i => i.name.trim()) as any,
          preparation: prep,
          calories_total: totalCalories,
        })
        .eq('id', recipeId);

      if (error) throw error;
      toast.success(t('recipe.saved'));
      onRecipeUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t('recipe.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAIEdit = () => {
    onClose();
    setTimeout(() => onOpenChat(), 300);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[60] flex flex-col bg-background"
    >
      {/* Header */}
      <div className="border-b border-border bg-card/80 px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-base font-semibold text-foreground">{t('recipe.editRecipe')}</h1>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-md space-y-4">
          {/* AI Edit CTA */}
          <button
            onClick={handleAIEdit}
            className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t('recipe.editWithAI')}</p>
              <p className="text-xs text-muted-foreground">{t('recipe.editDescription')}</p>
            </div>
          </button>

          {/* Manual Edit */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-card-foreground">{t('recipe.editManual')}</h2>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('recipe.recipeName')}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Ingredients */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">{t('recipe.ingredients')}</label>
              <div className="space-y-2">
                {ings.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={ing.name}
                      onChange={e => updateIngredient(i, 'name', e.target.value)}
                      placeholder={t('recipe.ingredientName')}
                      className="flex-1 rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      value={ing.quantity}
                      onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                      placeholder={t('recipe.ingredientQty')}
                      className="w-20 rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={ing.calories || ''}
                      onChange={e => updateIngredient(i, 'calories', parseInt(e.target.value) || 0)}
                      placeholder={t('recipe.ingredientCal')}
                      className="w-16 rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => removeIngredient(i)}
                      className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={t('recipe.removeIngredient')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addIngredient}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <Plus className="h-3 w-3" /> {t('recipe.addIngredient')}
              </button>
            </div>

            {/* Preparation */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('recipe.preparation')}</label>
              <textarea
                value={prep}
                onChange={e => setPrep(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="border-t border-border bg-card/80 px-4 py-3 safe-area-bottom">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('recipe.saving') : t('recipe.saveChanges')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RecipeEditDrawer;

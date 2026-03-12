import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';

interface Ingredient {
  name: string;
  quantity: string;
  calories: number;
}

interface Step {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
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

const CATEGORIES = [
  { key: 'salads', emoji: '🥗' },
  { key: 'meats', emoji: '🥩' },
  { key: 'fish', emoji: '🐟' },
  { key: 'vegetarian', emoji: '🌱' },
  { key: 'pasta', emoji: '🍝' },
  { key: 'soups', emoji: '🍲' },
  { key: 'sides', emoji: '🥦' },
  { key: 'sweets', emoji: '🍰' },
  { key: 'drinks', emoji: '🥤' },
  { key: 'breakfast', emoji: '🍳' },
];

const CAT_KEYWORDS: Record<string, string[]> = {
  salads: ['salad', 'salada', 'ensalada'],
  meats: ['carne', 'meat', 'frango', 'chicken', 'beef', 'pork', 'porco'],
  fish: ['peixe', 'fish', 'salmão', 'salmon', 'camarão', 'shrimp', 'seafood'],
  vegetarian: ['vegano', 'vegan', 'vegetarian', 'vegetariano', 'tofu'],
  pasta: ['massa', 'pasta', 'macarrão', 'arroz', 'rice'],
  soups: ['sopa', 'soup', 'caldo', 'broth'],
  sides: ['acompanhamento', 'side', 'purê'],
  sweets: ['doce', 'sweet', 'bolo', 'cake', 'torta', 'mousse', 'pudim', 'cookie'],
  drinks: ['bebida', 'drink', 'smoothie', 'suco', 'juice'],
  breakfast: ['café da manhã', 'breakfast', 'panqueca', 'omelete'],
};

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return key;
  }
  return 'other';
}

interface BookPage {
  type: 'cover' | 'index' | 'recipe';
  recipe?: Tables<'recipes'>;
  catKey?: string;
}

interface Props {
  recipes: Tables<'recipes'>[];
  userName?: string;
  open: boolean;
  onClose: () => void;
}

const RecipeBookViewer = ({ recipes, userName, open, onClose }: Props) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  // Build pages
  const buildPages = useCallback((): BookPage[] => {
    const pages: BookPage[] = [{ type: 'cover' }, { type: 'index' }];
    const grouped: Record<string, Tables<'recipes'>[]> = {};
    for (const r of recipes) {
      const cat = categorize(r.recipe_name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }
    for (const [catKey, catRecipes] of Object.entries(grouped)) {
      for (const recipe of catRecipes) {
        pages.push({ type: 'recipe', recipe, catKey });
      }
    }
    return pages;
  }, [recipes]);

  const pages = buildPages();

  const goTo = (delta: number) => {
    const next = currentPage + delta;
    if (next < 0 || next >= pages.length) return;
    setDirection(delta);
    setCurrentPage(next);
  };

  const getCatLabel = (key: string) => {
    const cat = CATEGORIES.find(c => c.key === key);
    if (cat) return `${cat.emoji} ${t(`book.cat_${cat.key}`)}`;
    return `📋 ${t('book.cat_other')}`;
  };

  const pageVariants = {
    enter: (d: number) => ({
      rotateY: d > 0 ? 90 : -90,
      opacity: 0,
      transformOrigin: d > 0 ? 'left center' : 'right center',
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      transformOrigin: 'center center',
    },
    exit: (d: number) => ({
      rotateY: d > 0 ? -90 : 90,
      opacity: 0,
      transformOrigin: d > 0 ? 'right center' : 'left center',
    }),
  };

  const renderPage = (page: BookPage) => {
    if (page.type === 'cover') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gradient-to-br from-primary/20 via-primary/5 to-primary/15">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2 font-serif">{t('book.title')}</h2>
          <p className="text-lg text-muted-foreground mb-1">{userName || t('home.chef')}</p>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground mt-8 italic">Gastronom.IA</p>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="h-1 w-16 rounded-full bg-primary/30" />
          </div>
        </div>
      );
    }

    if (page.type === 'index') {
      const grouped: Record<string, Tables<'recipes'>[]> = {};
      for (const r of recipes) {
        const cat = categorize(r.recipe_name);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(r);
      }
      return (
        <div className="p-5 h-full overflow-y-auto">
          <h3 className="text-xl font-bold text-foreground mb-4 font-serif border-b border-border pb-2">{t('book.index')}</h3>
          <div className="space-y-3">
            {Object.entries(grouped).map(([catKey, catRecipes]) => (
              <div key={catKey}>
                <p className="text-sm font-bold text-primary mb-1">{getCatLabel(catKey)}</p>
                {catRecipes.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground ml-4 py-0.5">• {r.recipe_name}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (page.type === 'recipe' && page.recipe) {
      const recipe = page.recipe;
      let meta: RecipeMeta = {};
      try { meta = JSON.parse(recipe.nutrition_info || '{}'); } catch { /* */ }
      const ingredients = (recipe.ingredients as unknown as Ingredient[]) || [];
      const steps = meta.steps || [];

      return (
        <div className="p-5 h-full overflow-y-auto">
          {/* Category badge */}
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
            {getCatLabel(page.catKey || 'other')}
          </span>

          {/* Title */}
          <h3 className="text-lg font-bold text-foreground mt-1 mb-2 font-serif leading-tight">
            {recipe.recipe_name}
          </h3>

          {/* Meta */}
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-3">
            {recipe.calories_total > 0 && <span>🔥 {recipe.calories_total} kcal</span>}
            {meta.difficulty && <span>📊 {meta.difficulty}</span>}
            {meta.prep_time && <span>⏱️ {meta.prep_time}</span>}
            {meta.cook_time && <span>🕐 {meta.cook_time}</span>}
            {meta.servings && <span>👥 {meta.servings}</span>}
          </div>

          {/* Ingredients */}
          <div className="mb-3">
            <p className="text-xs font-bold text-foreground mb-1">{t('recipe.ingredients')}</p>
            <div className="space-y-0.5">
              {ingredients.map((ing, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">
                  • {ing.name} — {ing.quantity} <span className="text-primary/70">({ing.calories} kcal)</span>
                </p>
              ))}
            </div>
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-foreground mb-1">{t('recipe.stepByStep')}</p>
              <div className="space-y-1.5">
                {steps.map((step, i) => (
                  <div key={i}>
                    <p className="text-[11px] text-foreground">
                      <span className="font-semibold text-primary">{step.step_number}.</span>{' '}
                      <span className="font-medium">{step.title}:</span>{' '}
                      <span className="text-muted-foreground">{step.description}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If no steps, show preparation text */}
          {steps.length === 0 && recipe.preparation && (
            <div className="mb-3">
              <p className="text-xs font-bold text-foreground mb-1">{t('recipe.preparation')}</p>
              <p className="text-[11px] text-muted-foreground whitespace-pre-line">{recipe.preparation}</p>
            </div>
          )}

          {/* Nutrition info */}
          {meta.nutrition_info && (
            <div className="mb-2">
              <p className="text-xs font-bold text-foreground mb-1">{t('recipe.nutritionInfo')}</p>
              <p className="text-[11px] text-muted-foreground">{meta.nutrition_info}</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-sm mx-auto"
          style={{ perspective: '1200px' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 z-10 rounded-full bg-card/80 p-2 text-foreground shadow-lg backdrop-blur-sm"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Book container */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-border"
            style={{ minHeight: '70vh', maxHeight: '80vh' }}
          >
            {/* Paper texture background */}
            <div className="absolute inset-0 bg-card" />
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />

            {/* Book spine shadow */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/10 to-transparent z-10" />

            {/* Page content with flip animation */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="relative h-full"
                style={{ minHeight: '70vh', maxHeight: '80vh' }}
              >
                {renderPage(pages[currentPage])}

                {/* Page number */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                  <span className="text-[10px] text-muted-foreground/50">
                    {currentPage + 1} / {pages.length}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => goTo(-1)}
              disabled={currentPage === 0}
              className="flex items-center gap-1 rounded-xl bg-card border border-border px-4 py-2.5 text-xs font-medium text-foreground transition-all disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('book.prevPage')}
            </button>
            <button
              onClick={() => goTo(1)}
              disabled={currentPage >= pages.length - 1}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-all disabled:opacity-30"
            >
              {t('book.nextPage')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RecipeBookViewer;

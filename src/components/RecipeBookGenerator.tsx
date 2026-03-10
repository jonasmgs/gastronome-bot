import { useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
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
  { key: 'salads', emoji: '🥗', keywords: ['salad', 'salada', 'ensalada'] },
  { key: 'meats', emoji: '🥩', keywords: ['carne', 'meat', 'frango', 'chicken', 'beef', 'pork', 'porco'] },
  { key: 'fish', emoji: '🐟', keywords: ['peixe', 'fish', 'salmão', 'salmon', 'camarão', 'shrimp', 'seafood', 'frutos do mar'] },
  { key: 'vegetarian', emoji: '🌱', keywords: ['vegano', 'vegan', 'vegetarian', 'vegetariano', 'tofu'] },
  { key: 'pasta', emoji: '🍝', keywords: ['massa', 'pasta', 'macarrão', 'arroz', 'rice', 'grão', 'grain'] },
  { key: 'soups', emoji: '🍲', keywords: ['sopa', 'soup', 'caldo', 'broth'] },
  { key: 'sides', emoji: '🥦', keywords: ['acompanhamento', 'side', 'purê', 'puree'] },
  { key: 'sweets', emoji: '🍰', keywords: ['doce', 'sweet', 'bolo', 'cake', 'torta', 'pie', 'mousse', 'pudim', 'cookie', 'biscoito'] },
  { key: 'drinks', emoji: '🥤', keywords: ['bebida', 'drink', 'smoothie', 'suco', 'juice'] },
  { key: 'breakfast', emoji: '🍳', keywords: ['café da manhã', 'breakfast', 'panqueca', 'pancake', 'omelete', 'omelet'] },
];

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) return cat.key;
  }
  return 'other';
}

interface Props {
  recipes: Tables<'recipes'>[];
  userName?: string;
}

const RecipeBookGenerator = ({ recipes, userName }: Props) => {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (recipes.length === 0) {
      toast.error(t('book.noRecipes'));
      return;
    }
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentW = pageW - margin * 2;

      // Cover page
      doc.setFillColor(34, 120, 70);
      doc.rect(0, 0, pageW, pageH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.text(t('book.title'), pageW / 2, pageH / 2 - 20, { align: 'center' });
      doc.setFontSize(16);
      doc.text(userName || t('home.chef'), pageW / 2, pageH / 2 + 5, { align: 'center' });
      doc.setFontSize(12);
      doc.text(new Date().toLocaleDateString(), pageW / 2, pageH / 2 + 18, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Gastronom.IA', pageW / 2, pageH - 20, { align: 'center' });

      // Organize by category
      const grouped: Record<string, Tables<'recipes'>[]> = {};
      for (const r of recipes) {
        const cat = categorize(r.recipe_name);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(r);
      }

      // Index page
      doc.addPage();
      doc.setTextColor(34, 34, 34);
      doc.setFontSize(22);
      doc.text(t('book.index'), margin, 30);
      let indexY = 45;
      doc.setFontSize(12);
      const catLabels: Record<string, string> = {};
      for (const cat of CATEGORIES) {
        catLabels[cat.key] = `${cat.emoji} ${t(`book.cat_${cat.key}`)}`;
      }
      catLabels['other'] = `📋 ${t('book.cat_other')}`;

      for (const [catKey, catRecipes] of Object.entries(grouped)) {
        doc.setFont('helvetica', 'bold');
        doc.text(catLabels[catKey] || catKey, margin, indexY);
        indexY += 7;
        doc.setFont('helvetica', 'normal');
        for (const r of catRecipes) {
          doc.text(`  • ${r.recipe_name}`, margin, indexY);
          indexY += 6;
          if (indexY > pageH - 30) {
            doc.addPage();
            indexY = 30;
          }
        }
        indexY += 4;
      }

      // Recipe pages
      for (const [catKey, catRecipes] of Object.entries(grouped)) {
        for (const recipe of catRecipes) {
          doc.addPage();
          let y = 25;

          // Category badge
          doc.setFontSize(10);
          doc.setTextColor(34, 120, 70);
          doc.text(catLabels[catKey] || catKey, margin, y);
          y += 10;

          // Title
          doc.setTextColor(34, 34, 34);
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          const titleLines = doc.splitTextToSize(recipe.recipe_name, contentW);
          doc.text(titleLines, margin, y);
          y += titleLines.length * 8 + 4;

          // Meta
          let meta: RecipeMeta = {};
          try { meta = JSON.parse(recipe.nutrition_info || '{}'); } catch { /* */ }

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          const metaParts: string[] = [];
          if (recipe.calories_total) metaParts.push(`🔥 ${recipe.calories_total} kcal`);
          if (meta.difficulty) metaParts.push(`📊 ${meta.difficulty}`);
          if (meta.prep_time) metaParts.push(`⏱️ ${meta.prep_time}`);
          if (meta.cook_time) metaParts.push(`🕐 ${meta.cook_time}`);
          if (meta.servings) metaParts.push(`👥 ${meta.servings} porções`);
          if (metaParts.length) {
            doc.text(metaParts.join('  |  '), margin, y);
            y += 8;
          }

          // Ingredients
          doc.setTextColor(34, 34, 34);
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(t('recipe.ingredients'), margin, y);
          y += 7;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const ingredients = (recipe.ingredients as unknown as Ingredient[]) || [];
          for (const ing of ingredients) {
            const line = `• ${ing.name} — ${ing.quantity} (${ing.calories} kcal)`;
            doc.text(line, margin + 2, y);
            y += 5.5;
            if (y > pageH - 30) { doc.addPage(); y = 25; }
          }
          y += 4;

          // Steps
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(t('recipe.stepByStep'), margin, y);
          y += 7;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const steps = meta.steps || [];
          if (steps.length > 0) {
            for (const step of steps) {
              const stepText = `${step.step_number}. ${step.title}: ${step.description}`;
              const wrapped = doc.splitTextToSize(stepText, contentW - 4);
              for (const wl of wrapped) {
                if (y > pageH - 30) { doc.addPage(); y = 25; }
                doc.text(wl, margin + 2, y);
                y += 5.5;
              }
              y += 2;
            }
          } else {
            const prepLines = doc.splitTextToSize(recipe.preparation, contentW - 4);
            for (const pl of prepLines) {
              if (y > pageH - 30) { doc.addPage(); y = 25; }
              doc.text(pl, margin + 2, y);
              y += 5.5;
            }
          }

          // Nutrition info
          if (meta.nutrition_info) {
            y += 4;
            if (y > pageH - 40) { doc.addPage(); y = 25; }
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(t('recipe.nutritionInfo'), margin, y);
            y += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const nutLines = doc.splitTextToSize(meta.nutrition_info, contentW - 4);
            for (const nl of nutLines) {
              if (y > pageH - 30) { doc.addPage(); y = 25; }
              doc.text(nl, margin + 2, y);
              y += 5.5;
            }
          }

          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('Gastronom.IA', pageW / 2, pageH - 10, { align: 'center' });
        }
      }

      doc.save(`receitas-${userName || 'chef'}.pdf`);
      toast.success(t('book.generated'));
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={generating || recipes.length === 0}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
      {generating ? t('book.generating') : t('book.generate')}
    </button>
  );
};

export default RecipeBookGenerator;

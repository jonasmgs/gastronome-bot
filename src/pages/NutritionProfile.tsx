import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Heart, Activity, Scale, Ruler, User, Target, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import BottomNav from '@/components/BottomNav';
import NutritionRecipeGenerator from '@/components/NutritionRecipeGenerator';

const ALLERGY_OPTIONS = [
  'gluten', 'lactose', 'seafood', 'peanut', 'eggs', 'soy', 'nuts',
] as const;

type Goal = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health';

interface NutritionData {
  height_cm: number | '';
  weight_kg: number | '';
  sex: 'male' | 'female' | '';
  age: number | '';
  goal: Goal | '';
  allergies: string[];
  other_allergy: string;
}

function calcBMI(weight: number, heightCm: number) {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

function calcTMB(weight: number, heightCm: number, age: number, sex: 'male' | 'female') {
  if (sex === 'male') return 88.362 + 13.397 * weight + 4.799 * heightCm - 5.677 * age;
  return 447.593 + 9.247 * weight + 3.098 * heightCm - 4.330 * age;
}

function calcTDEE(tmb: number, goal: Goal) {
  const activityFactor = 1.55; // moderately active
  const tdee = tmb * activityFactor;
  switch (goal) {
    case 'weight_loss': return tdee - 500;
    case 'muscle_gain': return tdee + 300;
    default: return tdee;
  }
}

function bmiCategory(bmi: number, t: (key: string) => string) {
  if (bmi < 18.5) return { label: t('nutrition.underweight'), color: 'text-blue-500' };
  if (bmi < 25) return { label: t('nutrition.normal'), color: 'text-green-500' };
  if (bmi < 30) return { label: t('nutrition.overweight'), color: 'text-yellow-500' };
  return { label: t('nutrition.obese'), color: 'text-red-500' };
}

const NutritionProfile = () => {
  const { t } = useTranslation();
  usePageTitle(t('nutrition.title'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<NutritionData>({
    height_cm: '', weight_kg: '', sex: '', age: '', goal: '', allergies: [], other_allergy: '',
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (profile) {
          const allergies = (profile.allergies as string[]) || [];
          const knownAllergies = allergies.filter(a => (ALLERGY_OPTIONS as readonly string[]).includes(a));
          const otherAllergies = allergies.filter(a => !(ALLERGY_OPTIONS as readonly string[]).includes(a));
          setData({
            height_cm: profile.height_cm ?? '',
            weight_kg: profile.weight_kg ?? '',
            sex: (profile.sex as 'male' | 'female') || '',
            age: profile.age ?? '',
            goal: (profile.goal as Goal) || '',
            allergies: knownAllergies,
            other_allergy: otherAllergies.join(', '),
          });
        }
        setLoading(false);
      });
  }, [user]);

  const toggleAllergy = (allergy: string) => {
    setData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!data.height_cm || !data.weight_kg || !data.sex || !data.age || !data.goal) {
      toast.error(t('nutrition.fillRequired'));
      return;
    }
    setSaving(true);
    try {
      const allAllergies = [
        ...data.allergies,
        ...data.other_allergy.split(',').map(s => s.trim()).filter(Boolean),
      ];
      const payload = {
        user_id: user.id,
        height_cm: Number(data.height_cm),
        weight_kg: Number(data.weight_kg),
        sex: data.sex,
        age: Number(data.age),
        goal: data.goal,
        allergies: allAllergies,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('nutrition_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success(t('nutrition.saved'));
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const canCalc = data.height_cm && data.weight_kg && data.sex && data.age && data.goal;
  const bmi = canCalc ? calcBMI(Number(data.weight_kg), Number(data.height_cm)) : null;
  const tmb = canCalc ? calcTMB(Number(data.weight_kg), Number(data.height_cm), Number(data.age), data.sex as 'male' | 'female') : null;
  const tdee = canCalc && tmb ? calcTDEE(tmb, data.goal as Goal) : null;
  const bmiInfo = bmi ? bmiCategory(bmi, t) : null;

  const goals: { value: Goal; label: string; icon: React.ReactNode }[] = [
    { value: 'weight_loss', label: t('nutrition.weightLoss'), icon: <Scale className="h-4 w-4" /> },
    { value: 'muscle_gain', label: t('nutrition.muscleGain'), icon: <Activity className="h-4 w-4" /> },
    { value: 'maintenance', label: t('nutrition.maintenance'), icon: <Target className="h-4 w-4" /> },
    { value: 'general_health', label: t('nutrition.generalHealth'), icon: <Heart className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24" role="main">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 ios-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('nutrition.title')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-6 px-4 py-6">
        {/* Body measurements */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Ruler className="h-4 w-4" /> {t('nutrition.measurements')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('nutrition.height')}</label>
              <input
                type="number"
                value={data.height_cm}
                onChange={e => setData(prev => ({ ...prev, height_cm: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="170"
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('nutrition.weight')}</label>
              <input
                type="number"
                value={data.weight_kg}
                onChange={e => setData(prev => ({ ...prev, weight_kg: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="70"
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('nutrition.age')}</label>
              <input
                type="number"
                value={data.age}
                onChange={e => setData(prev => ({ ...prev, age: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="30"
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('nutrition.sex')}</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setData(prev => ({ ...prev, sex: s }))}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                      data.sex === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-card-foreground hover:bg-accent'
                    }`}
                  >
                    {t(`nutrition.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Goal */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" /> {t('nutrition.goal')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {goals.map(g => (
              <button
                key={g.value}
                onClick={() => setData(prev => ({ ...prev, goal: g.value }))}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                  data.goal === g.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                {g.icon}
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {/* Allergies */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {t('nutrition.allergies')}
          </p>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map(a => (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  data.allergies.includes(a)
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                {t(`nutrition.allergy_${a}`)}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={data.other_allergy}
            onChange={e => setData(prev => ({ ...prev, other_allergy: e.target.value }))}
            placeholder={t('nutrition.otherAllergies')}
            className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Results */}
        {canCalc && bmi && tmb && tdee && bmiInfo && (
          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> {t('nutrition.results')}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{bmi.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">IMC</p>
                <p className={`text-xs font-medium ${bmiInfo.color}`}>{bmiInfo.label}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{Math.round(tmb)}</p>
                <p className="text-xs text-muted-foreground">TMB</p>
                <p className="text-xs text-muted-foreground">kcal/dia</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{Math.round(tdee)}</p>
                <p className="text-xs text-muted-foreground">TDEE</p>
                <p className="text-xs text-muted-foreground">kcal/dia</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t('nutrition.tdeeExplanation')}
            </p>
          </section>
        )}

        {/* Personalized Recipe Generator */}
        {canCalc && tdee && (
          <NutritionRecipeGenerator
            nutritionData={{
              height_cm: Number(data.height_cm),
              weight_kg: Number(data.weight_kg),
              sex: data.sex as 'male' | 'female',
              age: Number(data.age),
              goal: data.goal as string,
              allergies: [
                ...data.allergies,
                ...data.other_allergy.split(',').map(s => s.trim()).filter(Boolean),
              ],
              tdee,
            }}
          />
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>

      <BottomNav />
    </main>
  );
};

export default NutritionProfile;

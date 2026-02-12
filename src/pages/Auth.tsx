import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import bgIngredients from '@/assets/bg-ingredients.jpg';
import bgIngredients2 from '@/assets/bg-ingredients-2.jpg';
import bgIngredients3 from '@/assets/bg-ingredients-3.jpg';
import bgIngredients4 from '@/assets/bg-ingredients-4.jpg';
import bgUtensils from '@/assets/bg-utensils.jpg';

const bgImages = [bgIngredients, bgIngredients2, bgIngredients3, bgIngredients4, bgUtensils];

type Mode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Verifique seu email para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success('Email de recuperação enviado!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar Conta' : 'Recuperar Senha';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Rotating Background */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentBg}
            src={bgImages[currentBg]}
            alt=""
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 0.55, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/70" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ChefHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">NutriChef AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receitas inteligentes com IA</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-6 shadow-lg">
          <h2 className="mb-6 text-center text-lg font-semibold text-card-foreground">{title}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" required minLength={6} />
              </div>
            )}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {title}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-xs text-muted-foreground">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('forgot')} className="block w-full hover:text-foreground transition-colors">Esqueceu a senha?</button>
                <button onClick={() => setMode('signup')} className="block w-full hover:text-foreground transition-colors">Criar uma conta</button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => setMode('login')} className="block w-full hover:text-foreground transition-colors">Já tenho uma conta</button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => setMode('login')} className="block w-full hover:text-foreground transition-colors">Voltar ao login</button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;

import { Home, BookOpen, LogOut, Wand2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const items = [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: Wand2, label: t('nav.edit'), path: '/edit-recipe' },
    { icon: BookOpen, label: t('nav.recipes'), path: '/recipes' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 ios-blur safe-area-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={signOut}
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;

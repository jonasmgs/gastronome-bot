import { Home, BookOpen, LogOut, Wand2, Settings, Heart } from 'lucide-react';
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
    { icon: Heart, label: t('nutrition.navLabel'), path: '/nutrition' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ];

  const allItems = [
    ...items,
    { icon: LogOut, label: t('nav.logout'), path: '__logout__' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 ios-blur overflow-hidden">
      <div className="flex w-full items-center py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {allItems.map((item) => {
          const isLogout = item.path === '__logout__';
          const active = !isLogout && location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => isLogout ? signOut() : navigate(item.path)}
              className={`flex flex-1 min-w-0 flex-col items-center gap-0.5 py-1 text-[10px] transition-colors ${
                isLogout
                  ? 'text-muted-foreground hover:text-destructive'
                  : active
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

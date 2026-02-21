import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Sun, Moon, Monitor, Type, ALargeSmall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supportedLanguages } from '@/i18n';
import { getTheme, setTheme, getFontSize, setFontSize, getFontFamily, setFontFamily, type ThemeMode, type FontSize, type FontFamily } from '@/lib/theme';
import { useState } from 'react';
import BottomNav from '@/components/BottomNav';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getTheme());
  const [currentSize, setCurrentSize] = useState<FontSize>(getFontSize());
  const [currentFont, setCurrentFont] = useState<FontFamily>(getFontFamily());

  const handleTheme = (mode: ThemeMode) => {
    setTheme(mode);
    setCurrentTheme(mode);
  };

  const handleSize = (size: FontSize) => {
    setFontSize(size);
    setCurrentSize(size);
  };

  const handleFont = (font: FontFamily) => {
    setFontFamily(font);
    setCurrentFont(font);
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('settings.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('settings.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: t('settings.system'), icon: <Monitor className="h-4 w-4" /> },
  ];

  const sizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: t('settings.small') },
    { value: 'medium', label: t('settings.mediumSize') },
    { value: 'large', label: t('settings.largeSize') },
  ];

  const fontOptions: { value: FontFamily; label: string; sample: string }[] = [
    { value: 'inter', label: 'Inter', sample: 'Aa' },
    { value: 'serif', label: 'Serif', sample: 'Aa' },
    { value: 'mono', label: 'Mono', sample: 'Aa' },
    { value: 'rounded', label: 'Rounded', sample: 'Aa' },
  ];

  const fontFamilyStyle = (font: FontFamily) => {
    const map: Record<FontFamily, string> = {
      inter: 'Inter, sans-serif',
      serif: 'Georgia, serif',
      mono: 'SF Mono, monospace',
      rounded: 'Nunito, sans-serif',
    };
    return map[font];
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 ios-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('settings.title')}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-6 px-4 py-6">
        {/* Language */}
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Globe className="h-4 w-4" />
            {t('settings.language')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  i18n.language?.startsWith(lang.code)
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sun className="h-4 w-4" />
            {t('settings.theme')}
          </div>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTheme(opt.value)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition-colors ${
                  currentTheme === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Font Size */}
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ALargeSmall className="h-4 w-4" />
            {t('settings.fontSize')}
          </div>
          <div className="flex gap-2">
            {sizeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSize(opt.value)}
                className={`flex flex-1 items-center justify-center rounded-xl border px-3 py-3 transition-colors ${
                  currentSize === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
                style={{ fontSize: opt.value === 'small' ? '12px' : opt.value === 'large' ? '16px' : '14px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Font Family */}
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Type className="h-4 w-4" />
            {t('settings.fontFamily')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFont(opt.value)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors ${
                  currentFont === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                <span className="text-lg" style={{ fontFamily: fontFamilyStyle(opt.value) }}>{opt.sample}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;

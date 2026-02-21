export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'inter' | 'serif' | 'mono' | 'rounded';

const FONT_MAP: Record<FontFamily, string> = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
  serif: "'Georgia', 'Times New Roman', serif",
  mono: "'SF Mono', 'Fira Code', 'Courier New', monospace",
  rounded: "'Nunito', 'Varela Round', -apple-system, sans-serif",
};

const SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export function getTheme(): ThemeMode {
  return (localStorage.getItem('theme') as ThemeMode) || 'system';
}

export function getFontSize(): FontSize {
  return (localStorage.getItem('fontSize') as FontSize) || 'medium';
}

export function getFontFamily(): FontFamily {
  return (localStorage.getItem('fontFamily') as FontFamily) || 'inter';
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem('theme', mode);
  applyTheme(mode);
}

export function setFontSize(size: FontSize) {
  localStorage.setItem('fontSize', size);
  applyFontSize(size);
}

export function setFontFamily(family: FontFamily) {
  localStorage.setItem('fontFamily', family);
  applyFontFamily(family);
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = SIZE_MAP[size];
}

function applyFontFamily(family: FontFamily) {
  document.body.style.fontFamily = FONT_MAP[family];
}

export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);
  applyFontSize(getFontSize());
  applyFontFamily(getFontFamily());

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (getTheme() === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}

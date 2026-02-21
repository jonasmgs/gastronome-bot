import { useEffect } from 'react';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Gastronom.IA` : 'Gastronom.IA';
    return () => { document.title = 'Gastronom.IA'; };
  }, [title]);
}

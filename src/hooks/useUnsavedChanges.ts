import { useEffect } from 'react';

export function useUnsavedChanges(hasChanges: boolean, message = 'Você tem alterações não salvas. Deseja sair?') {
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges, message]);
}

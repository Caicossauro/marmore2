import { useState, useEffect } from 'react';

/**
 * Hook para uma altura compartilhada entre múltiplos componentes na mesma página
 * e persistida em localStorage entre sessões.
 *
 * Uso:
 *   const [altura, setAltura] = useSharedHeight('chave', 340);
 *
 * Quando qualquer componente chama setAltura, todos os outros que usam a mesma
 * `key` recebem o novo valor instantaneamente (via CustomEvent), e o valor
 * persiste em localStorage para a próxima sessão.
 */
const EVENT_NAME = 'shared-height-change';

export function useSharedHeight(key, defaultValue) {
  const [valor, setValor] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      const num = stored != null ? Number(stored) : NaN;
      return Number.isFinite(num) ? num : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.key === key) setValor(e.detail.value);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [key]);

  const setSharedValor = (novo) => {
    setValor(prev => {
      const v = typeof novo === 'function' ? novo(prev) : novo;
      try { localStorage.setItem(key, String(v)); } catch { /* ignora quota / privacy mode */ }
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key, value: v } }));
      return v;
    });
  };

  return [valor, setSharedValor];
}

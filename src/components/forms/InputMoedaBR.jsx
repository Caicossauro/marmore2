import { useState, useEffect, useRef } from 'react';

const formatar = (centavos) => {
  const reais = (centavos / 100).toFixed(2);
  const [int, dec] = reais.split('.');
  const intFormatado = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intFormatado},${dec}`;
};

const numeroParaCentavos = (valor) => {
  if (valor == null || valor === '') return 0;
  return Math.round(Number(valor) * 100);
};

export const InputMoedaBR = ({ value, onChange, className = '', ariaLabel, ...rest }) => {
  const [centavos, setCentavos] = useState(() => numeroParaCentavos(value));
  const inputRef = useRef(null);

  useEffect(() => {
    const externos = numeroParaCentavos(value);
    if (externos !== centavos) {
      setCentavos(externos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleKeyDown = (e) => {
    if (['Tab', 'Escape', 'Enter'].includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase())) return;

    e.preventDefault();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const novo = Math.floor(centavos / 10);
      setCentavos(novo);
      onChange(novo / 100);
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      const digito = parseInt(e.key, 10);
      const novo = centavos * 10 + digito;
      if (novo > 9999999999) return;
      setCentavos(novo);
      onChange(novo / 100);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const texto = (e.clipboardData?.getData('text') || '').replace(/[^\d]/g, '');
    if (!texto) return;
    const novo = parseInt(texto.slice(0, 10), 10);
    setCentavos(novo);
    onChange(novo / 100);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none select-none">R$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={formatar(centavos)}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        onPaste={handlePaste}
        onDragStart={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        draggable={false}
        aria-label={ariaLabel}
        className="w-full border border-slate-300 rounded-md pl-9 pr-2 py-1 text-sm text-right font-mono tabular-nums focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
        {...rest}
      />
    </div>
  );
};

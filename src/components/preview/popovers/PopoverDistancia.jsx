import { useState, useRef, useEffect } from 'react';
import { Button } from '../../ui/Button';

export function PopoverDistancia({ valorInicial, label, cor, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const aplicar = () => {
    const mm = parseFloat(valor);
    if (!isNaN(mm) && mm >= 0) onConfirmar(mm);
    else onCancelar();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-slate-900/30"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 min-w-[240px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: cor }}>{label}</p>
        <p className="text-xs text-slate-500 mb-2">Distância em mm a partir da borda</p>
        <input
          ref={inputRef}
          type="number"
          step="1"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') aplicar();
            if (e.key === 'Escape') onCancelar();
          }}
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={aplicar}>Aplicar</Button>
        </div>
      </div>
    </div>
  );
}

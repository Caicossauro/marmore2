import { useState } from 'react';
import { Button } from '../../ui/Button';

export function PopoverRecorteMedidas({ recorte, label, onConfirmar, onCancelar }) {
  const [largura, setLargura] = useState(recorte.largura ?? '');
  const [altura, setAltura]   = useState(recorte.altura ?? '');
  const [raio, setRaio]       = useState(recorte.raio ?? '');

  const isCirculo = recorte.shape === 'circulo';

  const aplicar = () => {
    if (isCirculo) {
      const r = parseFloat(raio);
      if (!isNaN(r) && r > 0) onConfirmar({ raio: r });
      else onCancelar();
    } else {
      const w = parseFloat(largura);
      const h = parseFloat(altura);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) onConfirmar({ largura: w, altura: h });
      else onCancelar();
    }
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-slate-900/30"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 min-w-[260px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-slate-600 mb-3">Editar dimensões — {label}</p>
        {isCirculo ? (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Diâmetro (mm)</label>
            <input
              autoFocus
              type="number"
              step="1"
              min="5"
              value={raio === '' ? '' : raio * 2}
              onChange={(e) => {
                const d = parseFloat(e.target.value);
                setRaio(isNaN(d) ? '' : d / 2);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') aplicar();
                if (e.key === 'Escape') onCancelar();
              }}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Largura (mm)</label>
              <input
                autoFocus
                type="number" step="1" min="10"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') aplicar();
                  if (e.key === 'Escape') onCancelar();
                }}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Altura (mm)</label>
              <input
                type="number" step="1" min="10"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') aplicar();
                  if (e.key === 'Escape') onCancelar();
                }}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={aplicar}>Aplicar</Button>
        </div>
      </div>
    </div>
  );
}

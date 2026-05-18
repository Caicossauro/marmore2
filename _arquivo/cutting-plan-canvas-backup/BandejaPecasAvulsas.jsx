import { useEffect, useRef, useState } from 'react';
import { temaDoAmbiente } from '../../constants/colors';

/**
 * Área de peças ainda não alocadas em nenhuma chapa (chapaId=null).
 * As peças podem ser arrastadas daqui para uma chapa (drop em `[data-chapa-id]`)
 * e do lado da chapa podem voltar aqui (drop em `[data-destino-avulsas]`).
 */
export const BandejaPecasAvulsas = ({
  pecasAvulsas,
  ambientes,
  materiais,
  onMoverParaChapa,
  onDragPreviewChange,
}) => {
  const [pecaArrastando, setPecaArrastando] = useState(null);
  const pecaArrastandoRef = useRef(null);

  // Mapa peça → índice do ambiente (pra cor)
  const ambienteIdxPorPecaId = {};
  (ambientes || []).forEach((amb, idx) => {
    (amb.pecas || []).forEach((p) => {
      ambienteIdxPorPecaId[p.id] = idx;
    });
  });

  useEffect(() => {
    pecaArrastandoRef.current = pecaArrastando;
  }, [pecaArrastando]);

  // Drag: mousemove atualiza preview; mouseup detecta destino
  useEffect(() => {
    if (!pecaArrastando) return;

    const detectarDestino = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const chapa = el?.closest('[data-chapa-id]');
      if (chapa) return { tipo: 'chapa', id: chapa.getAttribute('data-chapa-id') };
      const avulsa = el?.closest('[data-destino-avulsas]');
      if (avulsa) return { tipo: 'avulsa' };
      return null;
    };

    const handleMove = (e) => {
      onDragPreviewChange?.({
        peca: pecaArrastando,
        chapaOrigemId: null,
        escala: 0.15,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };

    const handleUp = (e) => {
      const destino = detectarDestino(e);
      if (destino?.tipo === 'chapa') {
        onMoverParaChapa(pecaArrastando.id, destino.id);
      }
      setPecaArrastando(null);
      onDragPreviewChange?.(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [pecaArrastando, onMoverParaChapa, onDragPreviewChange]);

  if (!pecasAvulsas || pecasAvulsas.length === 0) return null;

  return (
    <div
      data-destino-avulsas="true"
      className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg p-3 flex flex-col h-full min-h-[300px]"
    >
      <div className="mb-3 flex-shrink-0">
        <h3 className="font-bold text-amber-900 text-sm">
          Peças Avulsas <span className="font-normal text-amber-700">({pecasAvulsas.length})</span>
        </h3>
        <p className="text-[10px] text-amber-700 leading-tight mt-1">
          Arraste para uma chapa. Para devolver, arraste uma peça da chapa de volta aqui.
        </p>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        {pecasAvulsas.map((peca) => {
          const ambIdx = ambienteIdxPorPecaId[peca.id] ?? 0;
          const tema = temaDoAmbiente(ambIdx);
          const material = (materiais || []).find((m) => m.id === peca.materialId);

          return (
            <div
              key={peca.id}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                setPecaArrastando(peca);
              }}
              className="cursor-grab active:cursor-grabbing select-none rounded border px-3 py-2 hover:shadow-md transition-shadow"
              style={{
                backgroundColor: 'white',
                borderLeft: `4px solid ${tema.base}`,
                borderColor: tema.border,
              }}
              title={`${peca.nome || 'Sem nome'} — ${peca.largura}×${peca.altura}mm`}
            >
              <div className="text-sm font-semibold text-slate-800 truncate">
                {peca.nome || 'Sem nome'}
              </div>
              <div className="text-xs text-slate-500">
                {peca.largura} × {peca.altura} mm
              </div>
              {material && (
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {material.nome}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

import { useState, useRef, useMemo } from 'react';
import { hidratarPecaParaEdicao } from '../../utils/cutting/colisaoChapa';
import { ChapaCardHeader } from './ChapaCardHeader';
import { ChapaMenuContexto } from './ChapaMenuContexto';
import { useChapaCanvas } from './hooks/useChapaCanvas';
import { useDragPecaChapa } from './hooks/useDragPecaChapa';

export const PlanoCorteChapa = ({
  chapa,
  numero,
  ambientes,
  onMoverPeca,
  onMoverPecaNaChapa,
  onGirarPeca,
  onMoverParaAvulsas,
  onExcluirChapa,
  todasChapas,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  setPecaEditada,
  espessuraDisco = 4,
  margemLaterais = 25,
  onDragPreviewChange,
}) => {
  const escala = 0.3;
  const canvasRef = useRef(null);
  const [menuContexto, setMenuContexto] = useState(null);
  const [expandido, setExpandido] = useState(true);

  // Mapa peca.id → índice + nome do ambiente ao qual ela pertence
  const { ambienteIdxPorPecaId, ambienteNomePorPecaId } = useMemo(() => {
    const idx = {};
    const nome = {};
    (ambientes || []).forEach((amb, i) => {
      (amb.pecas || []).forEach((p) => {
        idx[p.id] = i;
        nome[p.id] = amb.nome;
      });
    });
    return { ambienteIdxPorPecaId: idx, ambienteNomePorPecaId: nome };
  }, [ambientes]);

  const {
    arrastandoPeca,
    pecaSelecionada,
    pecaHover,
    mouseForaDoCanvas,
    handlers,
  } = useDragPecaChapa({
    chapa,
    canvasRef,
    todasChapas,
    escala,
    espessuraDisco,
    margemLaterais,
    onMoverPeca,
    onMoverPecaNaChapa,
    onMoverParaAvulsas,
    onDragPreviewChange,
  });

  useChapaCanvas(canvasRef, {
    chapa,
    escala,
    ambienteIdxPorPecaId,
    ambienteNomePorPecaId,
    arrastandoPeca,
    pecaSelecionada,
    pecaHover,
    mouseForaDoCanvas,
    expandido,
  });

  const abrirEdicaoPeca = (peca) => {
    if (!(setMostrandoDetalhePeca && setModoEdicaoPeca && setPecaEditada)) return;
    const copia = hidratarPecaParaEdicao(peca);
    setMostrandoDetalhePeca(peca);
    setPecaEditada(copia);
    setModoEdicaoPeca(true);
  };

  const chapasDestino = (todasChapas || []).filter(
    (c) => c.materialId === chapa.materialId && c.id !== chapa.id
  );

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white min-w-0" data-chapa-id={chapa.id}>
      <ChapaCardHeader
        chapa={chapa}
        numero={numero}
        expandido={expandido}
        onToggleExpandir={() => setExpandido((v) => !v)}
        onExcluir={onExcluirChapa}
      />

      {expandido && (
        <div className="overflow-auto bg-gray-100 border border-slate-200 rounded max-w-full">
          <canvas
            ref={canvasRef}
            data-chapa-id={chapa.id}
            onMouseDown={handlers.onMouseDown}
            onMouseMove={handlers.onMouseMove}
            onMouseUp={handlers.onMouseUp}
            onMouseLeave={handlers.onMouseLeave}
            onMouseEnter={handlers.onMouseEnter}
            onContextMenu={(e) => handlers.onContextMenu(e, setMenuContexto)}
            className="cursor-move block mx-auto"
          />
        </div>
      )}

      <ChapaMenuContexto
        menuContexto={menuContexto}
        onFechar={() => setMenuContexto(null)}
        onGirar={(pecaId) => onGirarPeca(pecaId, chapa.id)}
        onEditar={abrirEdicaoPeca}
        onMover={onMoverPeca}
        chapasDestino={chapasDestino}
        todasChapas={todasChapas}
      />
    </div>
  );
};

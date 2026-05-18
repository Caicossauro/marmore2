import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ChapaCardHeader } from './ChapaCardHeader';
import { ChapaMenuContexto } from './ChapaMenuContexto';
import { CORES_AMBIENTES } from '../../constants/colors';
import { calcularSnap } from '../../utils/cutting/snapMagnetismo';
import { temColisao as calcTemColisao, foraDosLimites as calcForaDosLimites, hidratarPecaParaEdicao } from '../../utils/cutting/colisaoChapa';

/**
 * Versão SVG do PlanoCorteChapa — substitui o canvas 2D pelo paradigma
 * SVG + viewBox usado no editor de peça (PreviewAcabamentosInterativo).
 *
 * Fase 1 (atual): renderização read-only + pan/zoom + hover tooltip.
 * Fases seguintes: drag/drop, menu de contexto, integração com colisão e magnetismo.
 *
 * Mantém a mesma API externa do PlanoCorteChapa para permitir troca via toggle.
 */

const ESCALA = 0.3;         // mm → px (igual ao canvas, mantém fontes consistentes)
const OFFSET = 50;          // espaço para réguas/cotas em volta da chapa
const PADDING_FIT = 80;     // folga ao dar "fit" na chapa
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;

function corDaPeca(pecaId, ambienteIdxPorPecaId) {
  const idx = ambienteIdxPorPecaId[pecaId] ?? 0;
  return CORES_AMBIENTES[idx % CORES_AMBIENTES.length];
}

function clarear(hex, fator) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * fator);
  const ng = Math.round(g + (255 - g) * fator);
  const nb = Math.round(b + (255 - b) * fator);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function escurecer(hex, delta = 40) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - delta)}, ${Math.max(0, g - delta)}, ${Math.max(0, b - delta)})`;
}

export const PlanoCorteChapaSvg = ({
  chapa,
  numero,
  ambientes,
  onExcluirChapa,
  onMoverPecaNaChapa,
  onMoverPeca,
  onMoverParaAvulsas,
  onDragPreviewChange,
  onGirarPeca,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  setPecaEditada,
  todasChapas,
  espessuraDisco = 4,
  margemLaterais = 25,
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [expandido, setExpandido] = useState(true);

  // Mapas peca.id → índice + nome do ambiente
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

  // Dimensões em pixels (escala fixa, igual canvas)
  const chapaWPx = chapa.material.comprimento * ESCALA;
  const chapaHPx = chapa.material.altura * ESCALA;
  const totalWPx = chapaWPx + OFFSET * 2;
  const totalHPx = chapaHPx + OFFSET * 2;

  // Zoom inicial: desktop começa com 1× do botão + aplicado (1.25); mobile, ainda mais.
  const ZOOM_INICIAL_DESKTOP = 1.25;
  const ZOOM_INICIAL_MOBILE = 1.75;
  const [zoomInicial, setZoomInicial] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
      ? ZOOM_INICIAL_MOBILE
      : ZOOM_INICIAL_DESKTOP
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (ev) => setZoomInicial(ev.matches ? ZOOM_INICIAL_MOBILE : ZOOM_INICIAL_DESKTOP);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // viewBox controlado para pan/zoom. Inicial = ajustar com folga,
  // aplicando zoom maior no mobile e mantendo a chapa centralizada.
  const initialViewBox = useMemo(() => {
    const baseW = totalWPx + PADDING_FIT * 2;
    const baseH = totalHPx + PADDING_FIT * 2;
    const w = baseW / zoomInicial;
    const h = baseH / zoomInicial;
    const cx = totalWPx / 2;
    const cy = totalHPx / 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }, [totalWPx, totalHPx, zoomInicial]);

  const [viewBox, setViewBox] = useState(initialViewBox);
  useEffect(() => { setViewBox(initialViewBox); }, [initialViewBox]);

  // Estado de pan (não precisa de re-render durante o arrasto — usa ref)
  const panRef = useRef(null);
  const [panAtivo, setPanAtivo] = useState(false);

  // Hover state (para tooltip)
  const [hover, setHover] = useState(null); // { pecaId, mouseX, mouseY }

  // Drag state — peça sendo arrastada (dentro da chapa)
  const dragRef = useRef(null); // { pecaId, peca, offsetXMm, offsetYMm }
  const [arrastando, setArrastando] = useState(null); // { peca, novaX, novaY, colisao }

  // Menu de contexto (botão direito)
  const [menuContexto, setMenuContexto] = useState(null); // { x, y, peca }

  // Chapas do mesmo material (para o submenu "Mover para...")
  const chapasDestino = useMemo(
    () => (todasChapas || []).filter((c) => c.materialId === chapa.materialId && c.id !== chapa.id),
    [todasChapas, chapa.materialId, chapa.id]
  );

  // Abre o editor da peça (modal de detalhes em modo edição)
  const abrirEdicaoPeca = (peca) => {
    if (!(setMostrandoDetalhePeca && setModoEdicaoPeca && setPecaEditada)) return;
    const copia = hidratarPecaParaEdicao(peca);
    setMostrandoDetalhePeca(peca);
    setPecaEditada(copia);
    setModoEdicaoPeca(true);
  };

  // Botão direito sobre uma peça abre o menu de contexto.
  // No SVG o hit-test é nativo (cada peça é um <g>), basta usar e.preventDefault().
  const handlePecaContextMenu = (peca, e) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(null);
    setMenuContexto({ x: e.clientX, y: e.clientY, peca });
  };

  // Converte coordenadas de tela → coordenadas SVG (viewBox)
  const telaParaSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sxNorm = (clientX - rect.left) / rect.width;
    const syNorm = (clientY - rect.top) / rect.height;
    return {
      x: viewBox.x + sxNorm * viewBox.w,
      y: viewBox.y + syNorm * viewBox.h,
    };
  }, [viewBox]);

  // Zoom no scroll, centrado no cursor
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const ponto = telaParaSvg(e.clientX, e.clientY);
    if (!ponto) return;
    setViewBox((prev) => {
      const newW = prev.w / factor;
      const newH = prev.h / factor;
      // Limita o zoom (compara escala equivalente: maior = mais zoom)
      const escalaNova = totalWPx / newW;
      if (escalaNova < ZOOM_MIN || escalaNova > ZOOM_MAX) return prev;
      // Mantém o ponto sob o cursor fixo
      const fracX = (ponto.x - prev.x) / prev.w;
      const fracY = (ponto.y - prev.y) / prev.h;
      return {
        x: ponto.x - fracX * newW,
        y: ponto.y - fracY * newH,
        w: newW,
        h: newH,
      };
    });
  }, [telaParaSvg, totalWPx]);

  // Wheel listener manual (React's onWheel é passive — não dá pra preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !expandido) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel, expandido]);

  // Pan via pointer events (arrastar SVG vazio)
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return; // só botão esquerdo ou meio
    panRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startVbX: viewBox.x,
      startVbY: viewBox.y,
    };
    setPanAtivo(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    const pan = panRef.current;
    if (!pan) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dxScreen = e.clientX - pan.startClientX;
    const dyScreen = e.clientY - pan.startClientY;
    const dxWorld = (dxScreen / rect.width) * viewBox.w;
    const dyWorld = (dyScreen / rect.height) * viewBox.h;
    setViewBox((prev) => ({
      ...prev,
      x: pan.startVbX - dxWorld,
      y: pan.startVbY - dyWorld,
    }));
  };
  const handlePointerUp = (e) => {
    panRef.current = null;
    setPanAtivo(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  // Zoom controls
  const zoomFator = (fator) => {
    setViewBox((prev) => {
      const newW = prev.w / fator;
      const newH = prev.h / fator;
      const escalaNova = totalWPx / newW;
      if (escalaNova < ZOOM_MIN || escalaNova > ZOOM_MAX) return prev;
      // Zoom centrado no centro do viewBox atual
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return {
        x: cx - newW / 2,
        y: cy - newH / 2,
        w: newW,
        h: newH,
      };
    });
  };
  const handleZoomIn = () => zoomFator(1.25);
  const handleZoomOut = () => zoomFator(1 / 1.25);
  const handleFit = () => setViewBox(initialViewBox);

  // Hover do peça
  const handlePecaEnter = (peca, e) => {
    if (arrastando || dragRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      pecaId: peca.id,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
    });
  };
  const handlePecaHoverMove = (peca, e) => {
    if (dragRef.current) return; // durante drag, não atualiza hover
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      pecaId: peca.id,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
    });
  };
  const handlePecaLeave = () => {
    if (dragRef.current) return; // durante drag, mantém estado
    setHover(null);
  };

  // Drag de peça dentro da chapa.
  // Distingue de pan: pointerdown em <g> de peça chama stopPropagation,
  // então o handler de pan no SVG pai não dispara.
  const handlePecaPointerDown = (peca, e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const ponto = telaParaSvg(e.clientX, e.clientY);
    if (!ponto) return;
    const pecaX = OFFSET + peca.posX * ESCALA;
    const pecaY = OFFSET + peca.posY * ESCALA;
    const offsetXMm = (ponto.x - pecaX) / ESCALA;
    const offsetYMm = (ponto.y - pecaY) / ESCALA;
    dragRef.current = { pecaId: peca.id, peca, offsetXMm, offsetYMm };
    setArrastando({ peca, novaX: peca.posX, novaY: peca.posY, colisao: false });
    setHover(null);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const handlePecaPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.stopPropagation();

    // Detecta se o mouse saiu do container da chapa de origem.
    const containerRect = containerRef.current?.getBoundingClientRect();
    const dentro = containerRect &&
      e.clientX >= containerRect.left && e.clientX <= containerRect.right &&
      e.clientY >= containerRect.top && e.clientY <= containerRect.bottom;

    if (!dentro) {
      // Fora do container — esconde fantasma local, mostra overlay flutuante global.
      setArrastando({ peca: drag.peca, fora: true });
      onDragPreviewChange?.({
        peca: drag.peca,
        chapaOrigemId: chapa.id,
        escala: ESCALA,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      return;
    }

    // Dentro — comportamento Fase 2: calcula snap, mostra fantasma com colisão.
    onDragPreviewChange?.(null);
    const ponto = telaParaSvg(e.clientX, e.clientY);
    if (!ponto) return;
    const mouseXMm = (ponto.x - OFFSET) / ESCALA;
    const mouseYMm = (ponto.y - OFFSET) / ESCALA;
    let novaX = Math.max(0, mouseXMm - drag.offsetXMm);
    let novaY = Math.max(0, mouseYMm - drag.offsetYMm);

    const snap = calcularSnap({
      origX: novaX,
      origY: novaY,
      peca: drag.peca,
      outrasPecas: chapa.pecas,
      chapa,
      espessuraDisco,
      margemLaterais,
    });
    novaX = snap.novaX;
    novaY = snap.novaY;

    const colisao = calcTemColisao({
      peca: drag.peca,
      outras: chapa.pecas,
      espacamento: espessuraDisco,
      novaX,
      novaY,
    });
    const fora = calcForaDosLimites({
      peca: drag.peca,
      chapa,
      margemLaterais,
      novaX,
      novaY,
    });

    setArrastando({ peca: drag.peca, novaX, novaY, colisao: colisao || fora, fora: false });
  };

  const handlePecaPointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.stopPropagation();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    const arr = arrastando;
    dragRef.current = null;
    onDragPreviewChange?.(null);
    if (!arr) { setArrastando(null); return; }

    // Detecta o que está sob o cursor no momento do drop.
    const elementoAlvo = document.elementFromPoint(e.clientX, e.clientY);
    const cardAlvo = elementoAlvo?.closest('[data-chapa-id]');
    const chapaAlvoId = cardAlvo?.getAttribute('data-chapa-id') || null;
    const bandejaAlvo = elementoAlvo?.closest('[data-destino-avulsas]');

    // Drop em avulsas → volta peça pra bandeja
    if (bandejaAlvo && onMoverParaAvulsas) {
      onMoverParaAvulsas(drag.peca.id);
      setArrastando(null);
      return;
    }

    // Drop em outra chapa → valida material e move
    if (chapaAlvoId && chapaAlvoId !== String(chapa.id)) {
      const chapaAlvo = (todasChapas || []).find((c) => String(c.id) === chapaAlvoId);
      if (chapaAlvo && chapaAlvo.materialId === chapa.materialId) {
        onMoverPeca?.(drag.peca.id, chapaAlvo.id);
      } else if (chapaAlvo) {
        alert('⚠️ Só é possível mover peças entre chapas do mesmo material.');
      }
      setArrastando(null);
      return;
    }

    // Drop fora de qualquer alvo (ou em modo "fora") → cancela o drag
    if (arr.fora || !chapaAlvoId) {
      setArrastando(null);
      return;
    }

    // Drop na mesma chapa → comportamento Fase 2 (snap + validação)
    const novaX = Math.round(arr.novaX);
    const novaY = Math.round(arr.novaY);

    if (calcForaDosLimites({ peca: drag.peca, chapa, margemLaterais, novaX, novaY })) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastando(null);
      return;
    }
    if (calcTemColisao({ peca: drag.peca, outras: chapa.pecas, espacamento: espessuraDisco, novaX, novaY })) {
      alert(
        `Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos ${espessuraDisco}mm de distância das outras peças (espessura do disco de corte).`
      );
      setArrastando(null);
      return;
    }

    if (novaX !== drag.peca.posX || novaY !== drag.peca.posY) {
      onMoverPecaNaChapa?.(drag.peca.id, chapa.id, novaX, novaY);
    }
    setArrastando(null);
  };

  // Linhas auxiliares dentro da chapa (a cada 500mm)
  const linhasInternas = useMemo(() => {
    const lines = [];
    for (let i = 500; i < chapa.material.comprimento; i += 500) {
      const x = OFFSET + i * ESCALA;
      lines.push({ x1: x, y1: OFFSET, x2: x, y2: OFFSET + chapaHPx, key: `v-${i}` });
    }
    for (let i = 500; i < chapa.material.altura; i += 500) {
      const y = OFFSET + i * ESCALA;
      lines.push({ x1: OFFSET, y1: y, x2: OFFSET + chapaWPx, y2: y, key: `h-${i}` });
    }
    return lines;
  }, [chapa.material.comprimento, chapa.material.altura, chapaWPx, chapaHPx]);

  const patternIdFino = `grid-fino-${String(chapa.id).replace(/\./g, '-')}`;
  const patternIdGrosso = `grid-grosso-${String(chapa.id).replace(/\./g, '-')}`;

  // Peça em hover (para o tooltip)
  const pecaHoverInfo = hover && chapa.pecas.find((p) => p.id === hover.pecaId);

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
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded border border-slate-400"
          style={{ height: 600, backgroundColor: '#e2e8f0' }}
        >
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            width="100%"
            height="100%"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              cursor: panAtivo ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
              display: 'block',
            }}
          >
            <defs>
              <pattern id={patternIdFino} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0, 0, 0, 0.10)" strokeWidth="1" />
              </pattern>
              <pattern id={patternIdGrosso} width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(0, 0, 0, 0.25)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Fundo cinza com grid CAD-style — área grande para cobrir pan */}
            <rect x={-10000} y={-10000} width={30000} height={30000} fill={`url(#${patternIdFino})`} />
            <rect x={-10000} y={-10000} width={30000} height={30000} fill={`url(#${patternIdGrosso})`} />

            {/* Retângulo da chapa */}
            <rect
              x={OFFSET}
              y={OFFSET}
              width={chapaWPx}
              height={chapaHPx}
              fill="#f9fafb"
              stroke="#374151"
              strokeWidth="2"
            />

            {/* Linhas internas (a cada 500mm) */}
            {linhasInternas.map((l) => (
              <line
                key={l.key}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="#e5e7eb" strokeWidth="0.5"
              />
            ))}

            {/* Peças */}
            {chapa.pecas.map((peca, idx) => {
              const x = OFFSET + peca.posX * ESCALA;
              const y = OFFSET + peca.posY * ESCALA;
              const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
              const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
              const cor = corDaPeca(peca.id, ambienteIdxPorPecaId);
              const ehHover = hover?.pecaId === peca.id && !arrastando;
              const sendoArrastada = arrastando?.peca.id === peca.id;
              const fillCor = clarear(cor, ehHover ? 0.5 : 0.7);
              const textCor = escurecer(cor, 40);

              return (
                <g
                  key={peca.id}
                  onPointerEnter={(e) => handlePecaEnter(peca, e)}
                  onPointerMove={(e) => (dragRef.current ? handlePecaPointerMove(e) : handlePecaHoverMove(peca, e))}
                  onPointerLeave={handlePecaLeave}
                  onPointerDown={(e) => handlePecaPointerDown(peca, e)}
                  onPointerUp={handlePecaPointerUp}
                  onPointerCancel={handlePecaPointerUp}
                  onContextMenu={(e) => handlePecaContextMenu(peca, e)}
                  style={{
                    cursor: sendoArrastada ? 'grabbing' : 'grab',
                    opacity: sendoArrastada ? 0.25 : 1,
                  }}
                >
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={fillCor}
                    stroke={cor}
                    strokeWidth={ehHover ? 2.5 : 1.5}
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="14"
                    fontWeight="bold"
                    fill={textCor}
                    fontFamily="Arial, sans-serif"
                    pointerEvents="none"
                  >
                    #{idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Fantasma da peça sendo arrastada (com snap aplicado).
                Esconde quando mouse saiu do container — overlay global assume. */}
            {arrastando && !arrastando.fora && (() => {
              const { peca, novaX, novaY, colisao } = arrastando;
              const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
              const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
              const gx = OFFSET + novaX * ESCALA;
              const gy = OFFSET + novaY * ESCALA;
              const fill = colisao ? 'rgba(239, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.45)';
              const stroke = colisao ? '#dc2626' : '#1e40af';
              return (
                <g pointerEvents="none">
                  <rect
                    x={gx} y={gy} width={w} height={h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                  {colisao && (
                    <text
                      x={gx + w / 2}
                      y={gy + h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#ffffff"
                      fontFamily="Arial, sans-serif"
                    >
                      COLISÃO!
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Cotas */}
            <text
              x={OFFSET + chapaWPx / 2} y={OFFSET - 15}
              textAnchor="middle" fontSize="14" fontWeight="bold"
              fill="#374151" fontFamily="Arial, sans-serif" pointerEvents="none"
            >
              {chapa.material.comprimento} mm
            </text>
            <text
              x={0} y={0}
              textAnchor="middle" fontSize="14" fontWeight="bold"
              fill="#374151" fontFamily="Arial, sans-serif" pointerEvents="none"
              transform={`translate(${OFFSET - 15}, ${OFFSET + chapaHPx / 2}) rotate(-90)`}
            >
              {chapa.material.altura} mm
            </text>
          </svg>

          {/* Tooltip (DOM overlay) */}
          {hover && pecaHoverInfo && (() => {
            const nomePeca = pecaHoverInfo.nome || `Peça #${chapa.pecas.findIndex((p) => p.id === pecaHoverInfo.id) + 1}`;
            const dimensoes = pecaHoverInfo.rotacao === 90
              ? `${pecaHoverInfo.altura} × ${pecaHoverInfo.largura} mm  ↻ 90°`
              : `${pecaHoverInfo.largura} × ${pecaHoverInfo.altura} mm`;
            const nomeAmbiente = ambienteNomePorPecaId?.[pecaHoverInfo.id];
            return (
              <div
                className="absolute pointer-events-none rounded shadow-lg"
                style={{
                  left: hover.mouseX + 15,
                  top: hover.mouseY - 10,
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.8)',
                  padding: '6px 10px',
                  minWidth: 120,
                  zIndex: 10,
                }}
              >
                <div className="text-xs font-bold text-white leading-tight">{nomePeca}</div>
                <div className="text-[11px] text-slate-300 leading-tight mt-0.5">{dimensoes}</div>
                {nomeAmbiente && (
                  <div className="text-[11px] italic text-slate-400 leading-tight mt-0.5">{nomeAmbiente}</div>
                )}
              </div>
            );
          })()}

          {/* Controles de zoom */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-8 bg-white/95 hover:bg-white border border-slate-300 rounded shadow text-slate-700 font-bold text-base flex items-center justify-center transition-colors"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-8 bg-white/95 hover:bg-white border border-slate-300 rounded shadow text-slate-700 font-bold text-base flex items-center justify-center transition-colors"
              title="Diminuir zoom"
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="w-8 h-8 bg-white/95 hover:bg-white border border-slate-300 rounded shadow text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
              title="Ajustar à tela"
              aria-label="Ajustar à tela"
            >
              ⇆
            </button>
          </div>

          {/* Hint */}
          <div className="absolute bottom-2 left-2 text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded pointer-events-none">
            Scroll: zoom · Arrastar: mover
          </div>

          {/* Aviso de fase */}
          <div className="absolute bottom-2 right-2 text-[10px] text-emerald-700 bg-emerald-50/90 border border-emerald-200 px-2 py-0.5 rounded pointer-events-none">
            SVG · paridade completa
          </div>
        </div>
      )}

      {/* Menu de contexto (botão direito sobre uma peça) */}
      <ChapaMenuContexto
        menuContexto={menuContexto}
        onFechar={() => setMenuContexto(null)}
        onGirar={(pecaId) => onGirarPeca?.(pecaId, chapa.id)}
        onEditar={abrirEdicaoPeca}
        onMover={onMoverPeca}
        chapasDestino={chapasDestino}
        todasChapas={todasChapas}
      />
    </div>
  );
};

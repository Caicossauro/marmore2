import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ChapaMenuContexto } from './ChapaMenuContexto';
import { calcularSnap } from '../../utils/cutting/snapMagnetismo';
import { temColisao as calcTemColisao, foraDosLimites as calcForaDosLimites, hidratarPecaParaEdicao } from '../../utils/cutting/colisaoChapa';
import { layoutStagingMigracao, bboxStaging, STAGING_LARGURA_MM } from '../../utils/cutting/stagingLayout';
import { paresAdjacentesDoGrupo, bboxGrupo } from '../../utils/cutting/linkPecas';
import { Button } from '../ui/Button';
import {
  ESCALA, OFFSET, PADDING_FIT, ZOOM_MIN, ZOOM_MAX,
  corDaPeca, clarear, escurecer, sanitizarIdSvg,
} from '../../utils/cutting/svgHelpers';

// Quebra o nome da peça em linhas de no máximo `max` caracteres, respeitando
// os espaços como pontos de quebra.
function splitLabel(text, max = 12) {
  if (!text) return [''];
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= max) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * PlanoCorteGrupoSvg — renderiza TODAS as chapas de um material num único SVG.
 *
 * Substituiu o `PlanoCorteChapaSvg` (separado). Ganho de UX:
 *  - Pan/zoom unificado: o usuário enxerga e navega o "plano de corte" do material como um todo
 *  - Drag entre chapas dentro do grupo é natural (cursor cruza a fronteira de uma chapa pra outra
 *    no mesmo SVG, sem precisar acionar overlay flutuante)
 *  - Cada chapa fica com um `data-chapa-id` no <g>, então:
 *      • drag cross-grupo (entre materiais diferentes) usa elementFromPoint como antes
 *      • drag pra bandeja de avulsas também
 *
 * Layout: vertical stack, gap de 200mm em coords mundo entre chapas. Cada chapa tem o
 * mesmo "viewport" interno (OFFSET pra réguas), apenas com offset vertical acumulado.
 *
 * Numeração das chapas: respeita o índice GLOBAL recebido em `grupo.itens[].numero`
 * (passado pela TelaPlanoCorte). Garante consistência com PDFs/etiquetas.
 */

const GAP_ENTRE_CHAPAS = 200; // mm em coords mundo
const GAP_STAGING_CHAPAS = 300; // mm — gap horizontal entre staging (à esquerda) e chapas
const STAGING_ALTURA_MIN = 3000; // mm — altura mínima da staging (mesmo sem peças/chapas)

export const PlanoCorteGrupoSvg = ({
  grupo, // { nome, itens: [{ chapa, numero }, ...], avulsas: [...] }
  ambientes,
  onExcluirChapa,
  onMoverPecaNaChapa,
  onMoverPeca,
  onMoverParaAvulsas,
  onDragPreviewChange,
  onGirarPeca,
  onLinkarPecas,
  onDesfazerLink,
  onMoverGrupoLinkado,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  setPecaEditada,
  espessuraDisco = 4,
  margemLaterais = 25,
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

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

  // Layout da staging à ESQUERDA das chapas.
  // - Staging começa em x=OFFSET, y=OFFSET (top-left do desenho)
  // - Chapas começam em x=OFFSET + (STAGING_LARGURA_MM + GAP) * ESCALA, empilhadas verticalmente
  // - Staging tem altura = max(altura total das chapas, peças bbox + folga, mínimo)
  //
  // DOIS sistemas de coords da staging:
  //  • `x/y/w/h`: retângulo visual e zona de hit-test
  //  • `frameX/frameY`: origem das coords (outsideX=0) das peças
  // No layout atual eles coincidem, mas o componente já está preparado pra divergirem.

  const stagingOffsetXMm = 0; // staging começa no canto (em coords mm relativas ao OFFSET mundo)
  const chapasOffsetXMm = STAGING_LARGURA_MM + GAP_STAGING_CHAPAS;

  const { layouts, chapasMaxWPx, chapasSomaHPx } = useMemo(() => {
    let yAcc = 0;
    let wMax = 0;
    const xChapas = OFFSET + chapasOffsetXMm * ESCALA;
    const list = grupo.itens.map(({ chapa, numero }) => {
      const wPx = chapa.material.comprimento * ESCALA;
      const hPx = chapa.material.altura * ESCALA;
      if (wPx > wMax) wMax = wPx;
      const layout = {
        chapa,
        numero,
        x: xChapas,
        y: OFFSET + yAcc,
        w: wPx,
        h: hPx,
      };
      yAcc += hPx + GAP_ENTRE_CHAPAS;
      return layout;
    });
    return {
      layouts: list,
      chapasMaxWPx: wMax,
      chapasSomaHPx: Math.max(0, yAcc - GAP_ENTRE_CHAPAS),
    };
  }, [grupo.itens, chapasOffsetXMm]);

  // Layout das peças avulsas — wrap dentro da largura da staging.
  // Migração suave: peças com outsideX/Y existentes mantêm posição.
  const avulsasComLayout = useMemo(
    () => layoutStagingMigracao(grupo.avulsas || [], { larguraMaxMm: STAGING_LARGURA_MM }),
    [grupo.avulsas]
  );

  // Layout da staging (na esquerda)
  const stagingLayout = useMemo(() => {
    const bbox = bboxStaging(avulsasComLayout);
    const frameX = OFFSET + stagingOffsetXMm * ESCALA;
    const frameY = OFFSET;
    // Altura: cobre as chapas, com folga inferior. Mínimo garante área usável mesmo sem chapas.
    const alturaMm = Math.max(
      STAGING_ALTURA_MIN,
      chapasSomaHPx / ESCALA,
      bbox.h + 200, // folga inferior pra peças
    );
    return {
      x: frameX,
      y: frameY,
      w: STAGING_LARGURA_MM * ESCALA,
      h: alturaMm * ESCALA,
      frameX,
      frameY,
      temPecas: avulsasComLayout.length > 0,
    };
  }, [avulsasComLayout, chapasSomaHPx, stagingOffsetXMm]);

  // Dimensões totais do desenho (staging + gap + chapas) em viewBox units.
  const totalWPx = (chapasOffsetXMm + (chapasMaxWPx / ESCALA)) * ESCALA + OFFSET * 2;
  const totalHPx = Math.max(chapasSomaHPx, stagingLayout.h) + OFFSET * 2;

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

  // viewBox = fit do grupo inteiro com folga, escalado pelo zoom inicial.
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

  // Pan
  const panRef = useRef(null);
  const [panAtivo, setPanAtivo] = useState(false);

  // Hover
  const [hover, setHover] = useState(null); // { pecaId, mouseX, mouseY }

  // Drag
  const dragRef = useRef(null); // { peca, chapaOrigemId, offsetXMm, offsetYMm }
  const [arrastando, setArrastando] = useState(null);
  // arrastando = { peca, chapaTargetId, novaX, novaY, colisao, fora, semAlvo }

  // Menu de contexto
  const [menuContexto, setMenuContexto] = useState(null); // { x, y, peca, chapaId }

  // Converte coords de tela → coords SVG (viewBox).
  // Usa getScreenCTM porque o SVG é renderizado com preserveAspectRatio="xMidYMid meet"
  // (padrão) — quando o container tem aspect ratio diferente do viewBox, há letterboxing
  // e dividir uniformemente por rect.width / rect.height ignora isso. getScreenCTM já
  // sabe lidar com viewBox + letterbox + qualquer transform aplicado ao SVG.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const telaParaSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    return {
      x: clientX * inv.a + clientY * inv.c + inv.e,
      y: clientX * inv.b + clientY * inv.d + inv.f,
    };
  }, []);

  // Dado um ponto em coords SVG, encontra a chapa que o contém (ou null).
  const chapaEm = useCallback((worldX, worldY) => {
    for (const l of layouts) {
      if (worldX >= l.x && worldX <= l.x + l.w &&
          worldY >= l.y && worldY <= l.y + l.h) {
        return l;
      }
    }
    return null;
  }, [layouts]);

  // Dado um ponto em coords SVG, retorna a staging se o ponto cair nela (ou null).
  const stagingEm = useCallback((worldX, worldY) => {
    if (!stagingLayout) return null;
    if (worldX >= stagingLayout.x && worldX <= stagingLayout.x + stagingLayout.w &&
        worldY >= stagingLayout.y && worldY <= stagingLayout.y + stagingLayout.h) {
      return stagingLayout;
    }
    return null;
  }, [stagingLayout]);

  // Zoom no scroll, centrado no cursor.
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const ponto = telaParaSvg(e.clientX, e.clientY);
    if (!ponto) return;
    setViewBox((prev) => {
      const newW = prev.w / factor;
      const newH = prev.h / factor;
      const escalaNova = totalWPx / newW;
      if (escalaNova < ZOOM_MIN || escalaNova > ZOOM_MAX) return prev;
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

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan via pointer events no fundo do SVG.
  const handleSvgPointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    panRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startVbX: viewBox.x,
      startVbY: viewBox.y,
    };
    setPanAtivo(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const handleSvgPointerMove = (e) => {
    const pan = panRef.current;
    if (!pan) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // preserveAspectRatio="xMidYMid meet" → scale uniforme = min(sx, sy).
    // Quando viewBox tem aspect ratio diferente do container, um eixo é letterboxed
    // e usar rect.width/viewBox.w pra X dava conversão errada quando o limitante era Y.
    const scale = Math.min(rect.width / viewBox.w, rect.height / viewBox.h);
    const dxScreen = e.clientX - pan.startClientX;
    const dyScreen = e.clientY - pan.startClientY;
    const dxWorld = dxScreen / scale;
    const dyWorld = dyScreen / scale;
    setViewBox((prev) => ({ ...prev, x: pan.startVbX - dxWorld, y: pan.startVbY - dyWorld }));
  };
  const handleSvgPointerUp = (e) => {
    panRef.current = null;
    setPanAtivo(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  // Zoom buttons
  const zoomFator = (fator) => {
    setViewBox((prev) => {
      const newW = prev.w / fator;
      const newH = prev.h / fator;
      const escalaNova = totalWPx / newW;
      if (escalaNova < ZOOM_MIN || escalaNova > ZOOM_MAX) return prev;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  };
  const handleZoomIn = () => zoomFator(1.25);
  const handleZoomOut = () => zoomFator(1 / 1.25);
  const handleFit = () => setViewBox(initialViewBox);

  // Hover de peça
  const handlePecaEnter = (peca, e) => {
    if (dragRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ pecaId: peca.id, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
  };
  const handlePecaHoverMove = (peca, e) => {
    if (dragRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ pecaId: peca.id, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
  };
  const handlePecaLeave = () => {
    if (dragRef.current) return;
    setHover(null);
  };

  // Drag de peça.
  // Origem pode ser uma chapa (chapaOrigemId !== null) ou a staging (chapaOrigemId === null).
  const handlePecaPointerDown = (peca, chapaOrigemId, e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const ponto = telaParaSvg(e.clientX, e.clientY);
    if (!ponto) return;

    // World coords da origem da peça
    let pecaXWorld;
    let pecaYWorld;
    if (chapaOrigemId === null) {
      // Vem da staging — usa frame (não o retângulo visual)
      pecaXWorld = stagingLayout.frameX + (peca.outsideX || 0) * ESCALA;
      pecaYWorld = stagingLayout.frameY + (peca.outsideY || 0) * ESCALA;
    } else {
      const layout = layouts.find(l => String(l.chapa.id) === String(chapaOrigemId));
      if (!layout) return;
      pecaXWorld = layout.x + peca.posX * ESCALA;
      pecaYWorld = layout.y + peca.posY * ESCALA;
    }
    const offsetXMm = (ponto.x - pecaXWorld) / ESCALA;
    const offsetYMm = (ponto.y - pecaYWorld) / ESCALA;

    // Se a peça está em um grupo linkado, capturar TODAS as peças do grupo no mesmo escopo
    // (mesma chapa ou mesma staging por material) + bbox combinado + posições originais.
    let grupoPecas = null;
    let bboxOrig = null;
    if (peca.linkId) {
      if (chapaOrigemId === null) {
        grupoPecas = avulsasComLayout.filter(p => p.linkId === peca.linkId);
      } else {
        const layout = layouts.find(l => String(l.chapa.id) === String(chapaOrigemId));
        grupoPecas = layout?.chapa.pecas.filter(p => p.linkId === peca.linkId) || null;
      }
      if (grupoPecas && grupoPecas.length > 1) {
        bboxOrig = bboxGrupo(grupoPecas);
      } else {
        grupoPecas = null; // só uma peça no "grupo" — trata como individual
      }
    }

    dragRef.current = { peca, chapaOrigemId, offsetXMm, offsetYMm, grupoPecas, bboxOrig };
    setArrastando({
      peca,
      chapaTargetId: chapaOrigemId,
      novaX: chapaOrigemId === null ? (peca.outsideX || 0) : peca.posX,
      novaY: chapaOrigemId === null ? (peca.outsideY || 0) : peca.posY,
      colisao: false,
      stagingTarget: chapaOrigemId === null,
      isGrupo: !!grupoPecas,
    });
    setHover(null);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const handlePecaPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.stopPropagation();

    // Mouse fora do container do grupo → mostra overlay flutuante global (drag cross-grupo).
    const containerRect = containerRef.current?.getBoundingClientRect();
    const dentro = containerRect &&
      e.clientX >= containerRect.left && e.clientX <= containerRect.right &&
      e.clientY >= containerRect.top && e.clientY <= containerRect.bottom;
    if (!dentro) {
      setArrastando({ peca: drag.peca, fora: true });
      onDragPreviewChange?.({
        peca: drag.peca,
        chapaOrigemId: drag.chapaOrigemId,
        escala: ESCALA,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      return;
    }

    onDragPreviewChange?.(null);
    const ponto = telaParaSvg(e.clientX, e.clientY);
    if (!ponto) return;

    // Cursor em world coords; subtrai offset do clique pra obter origem da peça.
    const worldPecaX = ponto.x - drag.offsetXMm * ESCALA;
    const worldPecaY = ponto.y - drag.offsetYMm * ESCALA;

    // === BRANCH GRUPO LINKADO ===
    // Move o grupo inteiro preservando o arranjo relativo. Cross-escopo (chapa↔chapa,
    // chapa↔staging, staging↔chapa) LIBERADO desde que dentro do mesmo material
    // (mesmo PlanoCorteGrupoSvg). Cross-material bloqueado por construção.
    if (drag.grupoPecas) {
      const ancora = drag.peca;
      const ancoraOrigX = drag.chapaOrigemId === null ? (ancora.outsideX || 0) : ancora.posX;
      const ancoraOrigY = drag.chapaOrigemId === null ? (ancora.outsideY || 0) : ancora.posY;
      const idsGrupo = new Set(drag.grupoPecas.map(p => p.id));
      const pecaVirtual = { largura: drag.bboxOrig.w, altura: drag.bboxOrig.h, rotacao: 0 };
      const posOriginalDe = (p) => drag.chapaOrigemId === null
        ? { x: p.outsideX || 0, y: p.outsideY || 0 }
        : { x: p.posX, y: p.posY };

      // Tenta chapa primeiro (qualquer chapa do material — mesma ou outra)
      const chapaAlvo = chapaEm(ponto.x, ponto.y) ?? chapaEm(worldPecaX, worldPecaY);
      if (chapaAlvo) {
        const novaAncoraX = (worldPecaX - chapaAlvo.x) / ESCALA;
        const novaAncoraY = (worldPecaY - chapaAlvo.y) / ESCALA;
        let dx = novaAncoraX - ancoraOrigX;
        let dy = novaAncoraY - ancoraOrigY;

        const outrasPecas = chapaAlvo.chapa.pecas.filter(p => !idsGrupo.has(p.id));
        const novoBboxX = drag.bboxOrig.x + dx;
        const novoBboxY = drag.bboxOrig.y + dy;
        const snap = calcularSnap({
          origX: novoBboxX, origY: novoBboxY,
          peca: pecaVirtual, outrasPecas, chapa: chapaAlvo.chapa,
          espessuraDisco, margemLaterais,
        });
        dx += snap.novaX - novoBboxX;
        dy += snap.novaY - novoBboxY;

        const posFinais = drag.grupoPecas.map(p => {
          const o = posOriginalDe(p);
          return { pecaId: p.id, peca: p, novaX: o.x + dx, novaY: o.y + dy };
        });

        const colisaoOuFora = posFinais.some(({ peca: pp, novaX, novaY }) =>
          calcTemColisao({ peca: pp, outras: outrasPecas, espacamento: espessuraDisco, novaX, novaY }) ||
          calcForaDosLimites({ peca: pp, chapa: chapaAlvo.chapa, margemLaterais, novaX, novaY })
        );

        setArrastando({
          peca: ancora,
          chapaTargetId: chapaAlvo.chapa.id,
          novaX: posFinais.find(pf => pf.pecaId === ancora.id)?.novaX ?? ancoraOrigX,
          novaY: posFinais.find(pf => pf.pecaId === ancora.id)?.novaY ?? ancoraOrigY,
          colisao: colisaoOuFora,
          stagingTarget: false,
          isGrupo: true,
          posFinais,
        });
        return;
      }

      // Tenta staging (mesmo material — o PlanoCorteGrupoSvg é por material)
      const stagingAlvo = stagingEm(ponto.x, ponto.y) ?? stagingEm(worldPecaX, worldPecaY);
      if (stagingAlvo) {
        const novaAncoraX = (worldPecaX - stagingAlvo.frameX) / ESCALA;
        const novaAncoraY = (worldPecaY - stagingAlvo.frameY) / ESCALA;
        let dx = novaAncoraX - ancoraOrigX;
        let dy = novaAncoraY - ancoraOrigY;

        const outrasAvulsas = avulsasComLayout
          .filter(p => !idsGrupo.has(p.id))
          .map(p => ({ ...p, posX: p.outsideX || 0, posY: p.outsideY || 0 }));
        const novoBboxX = drag.bboxOrig.x + dx;
        const novoBboxY = drag.bboxOrig.y + dy;
        const snap = calcularSnap({
          origX: novoBboxX, origY: novoBboxY,
          peca: pecaVirtual, outrasPecas: outrasAvulsas,
          chapa: { material: { comprimento: 1e9, altura: 1e9 } },
          espessuraDisco, margemLaterais: -1e9,
        });
        dx += snap.novaX - novoBboxX;
        dy += snap.novaY - novoBboxY;

        const posFinais = drag.grupoPecas.map(p => {
          const o = posOriginalDe(p);
          return { pecaId: p.id, peca: p, novaX: o.x + dx, novaY: o.y + dy };
        });

        setArrastando({
          peca: ancora,
          stagingTarget: true,
          novaX: posFinais.find(pf => pf.pecaId === ancora.id)?.novaX ?? ancoraOrigX,
          novaY: posFinais.find(pf => pf.pecaId === ancora.id)?.novaY ?? ancoraOrigY,
          colisao: false, // staging permite sobreposição
          isGrupo: true,
          posFinais,
        });
        return;
      }

      // Sem alvo (cursor no gap entre chapas ou na margem do SVG) — fantasma cinza
      setArrastando({
        peca: ancora, isGrupo: true, semAlvo: true, fora: false,
        worldX: worldPecaX, worldY: worldPecaY,
      });
      return;
    }
    // === FIM BRANCH GRUPO ===

    // Detecta alvo. Prioridade: chapa onde o cursor está → chapa onde o centro caiu → staging.
    const peca = drag.peca;
    const wPx = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
    const hPx = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
    const centroX = worldPecaX + wPx / 2;
    const centroY = worldPecaY + hPx / 2;
    const chapaAlvo = chapaEm(ponto.x, ponto.y) ?? chapaEm(centroX, centroY);

    // Se não tem chapa, tenta staging.
    if (!chapaAlvo) {
      const stagingAlvo = stagingEm(ponto.x, ponto.y) ?? stagingEm(centroX, centroY);
      if (stagingAlvo) {
        // Posição em mm na staging — relativa ao FRAME (não ao retângulo visual).
        // outsideX/Y podem ser negativos se a peça cair na expansão lateral.
        let novaX = (worldPecaX - stagingAlvo.frameX) / ESCALA;
        let novaY = (worldPecaY - stagingAlvo.frameY) / ESCALA;

        // Magnetismo entre peças da staging (gap mínimo = espessura do disco).
        // SEM snap de borda — staging não tem bordas reais. Usa uma "chapa virtual"
        // com dimensões enormes pra que os snaps de borda nunca sejam atingidos.
        const outrasAvulsas = avulsasComLayout
          .filter(p => p.id !== peca.id)
          .map(p => ({ ...p, posX: p.outsideX || 0, posY: p.outsideY || 0 }));
        const snap = calcularSnap({
          origX: novaX,
          origY: novaY,
          peca,
          outrasPecas: outrasAvulsas,
          chapa: { material: { comprimento: 1e9, altura: 1e9 } },
          espessuraDisco,
          margemLaterais: -1e9,
        });
        novaX = snap.novaX;
        novaY = snap.novaY;

        setArrastando({
          peca,
          stagingTarget: true,
          novaX,
          novaY,
          colisao: false,
        });
        return;
      }

      // Sem alvo — mostra fantasma cinza.
      setArrastando({
        peca: drag.peca,
        semAlvo: true,
        worldX: worldPecaX,
        worldY: worldPecaY,
      });
      return;
    }

    // Alvo é uma chapa — comportamento original (snap, colisão).
    let novaX = (worldPecaX - chapaAlvo.x) / ESCALA;
    let novaY = (worldPecaY - chapaAlvo.y) / ESCALA;

    const outrasPecas = chapaAlvo.chapa.pecas.filter(p => p.id !== peca.id);
    const snap = calcularSnap({
      origX: novaX,
      origY: novaY,
      peca,
      outrasPecas,
      chapa: chapaAlvo.chapa,
      espessuraDisco,
      margemLaterais,
    });
    novaX = snap.novaX;
    novaY = snap.novaY;

    const colisao = calcTemColisao({
      peca, outras: outrasPecas, espacamento: espessuraDisco, novaX, novaY,
    });
    const fora = calcForaDosLimites({
      peca, chapa: chapaAlvo.chapa, margemLaterais, novaX, novaY,
    });

    setArrastando({
      peca,
      chapaTargetId: chapaAlvo.chapa.id,
      novaX,
      novaY,
      colisao: colisao || fora,
      stagingTarget: false,
    });
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

    // === GRUPO LINKADO ===
    if (drag.grupoPecas) {
      // Drop fora do container ou sem alvo → cancela (cross-escopo bloqueado)
      if (arr.fora || arr.semAlvo) {
        setArrastando(null);
        return;
      }
      if (arr.colisao) {
        // Não aplica — peça do grupo colide com peça fora dele ou sai da chapa.
        setArrastando(null);
        return;
      }
      if (!arr.posFinais || arr.posFinais.length === 0) {
        setArrastando(null);
        return;
      }

      // Aplica updates ATÔMICOS no grupo via callback dedicada.
      // Cross-escopo permitido: chapa↔chapa, chapa↔staging, staging↔chapa.
      if (arr.stagingTarget) {
        // Drop na staging — limpa chapaId/posX/Y e seta outsideX/Y
        const updates = arr.posFinais.map(({ pecaId, novaX, novaY }) => ({
          pecaId,
          chapaId: null,
          posX: null,
          posY: null,
          outsideX: Math.round(novaX),
          outsideY: Math.round(novaY),
        }));
        onMoverGrupoLinkado?.(updates);
      } else if (arr.chapaTargetId) {
        // Drop em chapa (mesma ou outra do mesmo material)
        const updates = arr.posFinais.map(({ pecaId, novaX, novaY }) => ({
          pecaId,
          chapaId: arr.chapaTargetId,
          posX: Math.round(novaX),
          posY: Math.round(novaY),
        }));
        onMoverGrupoLinkado?.(updates);
      }
      setArrastando(null);
      return;
    }
    // === FIM GRUPO ===

    // Drop fora do container — segue o fluxo cross-grupo via elementFromPoint
    if (arr.fora) {
      const elementoAlvo = document.elementFromPoint(e.clientX, e.clientY);
      const cardAlvo = elementoAlvo?.closest('[data-chapa-id]');
      const chapaAlvoId = cardAlvo?.getAttribute('data-chapa-id') || null;
      const bandejaAlvo = elementoAlvo?.closest('[data-destino-avulsas]');

      if (bandejaAlvo && onMoverParaAvulsas) {
        onMoverParaAvulsas(drag.peca.id);
        setArrastando(null);
        return;
      }
      if (chapaAlvoId && chapaAlvoId !== String(drag.chapaOrigemId)) {
        // moverPeca valida material e encontra melhor posição.
        onMoverPeca?.(drag.peca.id, chapaAlvoId);
      }
      setArrastando(null);
      return;
    }

    // Drop dentro do container mas sem alvo (gap entre chapas, margem) → cancela
    if (arr.semAlvo) {
      setArrastando(null);
      return;
    }

    // Drop na STAGING (área livre, sem snap, sem colisão).
    if (arr.stagingTarget) {
      const novaX = Math.round(arr.novaX);
      const novaY = Math.round(arr.novaY);
      const naStagingAntes = drag.chapaOrigemId === null;
      const mesmaPosicao = naStagingAntes &&
        novaX === (drag.peca.outsideX || 0) &&
        novaY === (drag.peca.outsideY || 0);
      if (!mesmaPosicao) {
        onMoverParaAvulsas?.(drag.peca.id, novaX, novaY);
      }
      setArrastando(null);
      return;
    }

    if (!arr.chapaTargetId) {
      setArrastando(null);
      return;
    }

    // Drop em uma CHAPA — validação e mover.
    const chapaTarget = layouts.find(l => String(l.chapa.id) === String(arr.chapaTargetId))?.chapa;
    if (!chapaTarget) {
      setArrastando(null);
      return;
    }

    const novaX = Math.round(arr.novaX);
    const novaY = Math.round(arr.novaY);

    if (calcForaDosLimites({ peca: drag.peca, chapa: chapaTarget, margemLaterais, novaX, novaY })) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastando(null);
      return;
    }
    const outras = chapaTarget.pecas.filter(p => p.id !== drag.peca.id);
    if (calcTemColisao({ peca: drag.peca, outras, espacamento: espessuraDisco, novaX, novaY })) {
      alert(
        `Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos ${espessuraDisco}mm de distância das outras peças (espessura do disco de corte).`
      );
      setArrastando(null);
      return;
    }

    // moverPecaNaChapa já suporta cross-chapa e staging→chapa (set chapaId + posX + posY).
    const mesmaChapa = drag.chapaOrigemId !== null && String(arr.chapaTargetId) === String(drag.chapaOrigemId);
    const mesmaPosicao = mesmaChapa && novaX === drag.peca.posX && novaY === drag.peca.posY;
    if (!mesmaPosicao) {
      onMoverPecaNaChapa?.(drag.peca.id, arr.chapaTargetId, novaX, novaY);
    }
    setArrastando(null);
  };

  // Menu de contexto
  const handlePecaContextMenu = (peca, chapaId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(null);
    setMenuContexto({ x: e.clientX, y: e.clientY, peca, chapaId });
  };

  const abrirEdicaoPeca = (peca) => {
    if (!(setMostrandoDetalhePeca && setModoEdicaoPeca && setPecaEditada)) return;
    const copia = hidratarPecaParaEdicao(peca);
    setMostrandoDetalhePeca(peca);
    setPecaEditada(copia);
    setModoEdicaoPeca(true);
  };

  // X de exclusão por chapa (só ativa se a chapa estiver vazia, como no comportamento atual)
  const tentarExcluirChapa = (chapa) => {
    if (chapa.pecas && chapa.pecas.length > 0) {
      alert('❌ Esta chapa não pode ser excluída pois contém peças.');
      return;
    }
    onExcluirChapa?.(chapa.id);
  };

  // IDs únicos pros patterns desse grupo (evita colisão se houver múltiplos grupos)
  const grupoIdSafe = sanitizarIdSvg(grupo.itens[0]?.chapa.id || grupo.nome);
  const patternIdFino = `grid-fino-${grupoIdSafe}`;
  const patternIdGrosso = `grid-grosso-${grupoIdSafe}`;

  // Peça em hover (lookup em chapas e na staging)
  const pecaHoverInfo = hover && (() => {
    for (const l of layouts) {
      const p = l.chapa.pecas.find(p => p.id === hover.pecaId);
      if (p) return p;
    }
    return avulsasComLayout.find(p => p.id === hover.pecaId) || null;
  })();

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border-2 shadow-md hover:shadow-lg transition-all"
      style={{
        height: 600,
        backgroundColor: '#e2e8f0',
        borderColor: '#cbd5e1',
        borderLeft: '6px solid #475569',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        width="100%"
        height="100%"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerUp}
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

        {/* Fundo cinza com grid CAD-style. Cobre área grande pra suportar pan. */}
        <rect x={-10000} y={-10000} width={30000} height={30000} fill={`url(#${patternIdFino})`} />
        <rect x={-10000} y={-10000} width={30000} height={30000} fill={`url(#${patternIdGrosso})`} />

        {/* Renderiza cada chapa do grupo */}
        {layouts.map((layout) => {
          const { chapa, numero, x, y, w, h } = layout;
          const chapaIdSafe = sanitizarIdSvg(chapa.id);

          return (
            <g key={chapa.id} data-chapa-id={chapa.id}>
              {/* Retângulo da chapa */}
              <rect
                x={x} y={y} width={w} height={h}
                fill="#f9fafb" stroke="#374151" strokeWidth="2"
              />

              {/* Linhas internas (a cada 500mm) */}
              {(() => {
                const lines = [];
                for (let i = 500; i < chapa.material.comprimento; i += 500) {
                  const lx = x + i * ESCALA;
                  lines.push(<line key={`v-${chapaIdSafe}-${i}`} x1={lx} y1={y} x2={lx} y2={y + h} stroke="#e5e7eb" strokeWidth="0.5" />);
                }
                for (let i = 500; i < chapa.material.altura; i += 500) {
                  const ly = y + i * ESCALA;
                  lines.push(<line key={`h-${chapaIdSafe}-${i}`} x1={x} y1={ly} x2={x + w} y2={ly} stroke="#e5e7eb" strokeWidth="0.5" />);
                }
                return lines;
              })()}

              {/* Peças desta chapa */}
              {chapa.pecas.map((peca, idx) => {
                const px = x + peca.posX * ESCALA;
                const py = y + peca.posY * ESCALA;
                const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
                const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
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
                    onPointerDown={(e) => handlePecaPointerDown(peca, chapa.id, e)}
                    onPointerUp={handlePecaPointerUp}
                    onPointerCancel={handlePecaPointerUp}
                    onContextMenu={(e) => handlePecaContextMenu(peca, chapa.id, e)}
                    style={{
                      cursor: sendoArrastada ? 'grabbing' : 'grab',
                      opacity: sendoArrastada ? 0.25 : 1,
                    }}
                  >
                    <rect
                      x={px} y={py} width={pw} height={ph}
                      fill={fillCor} stroke={cor} strokeWidth={ehHover ? 2.5 : 1.5}
                    />
                    {(() => {
                      const label = peca.nome?.trim() || `#${idx + 1}`;
                      const cx = px + pw / 2;
                      const cy = py + ph / 2;
                      const rot = peca.rotacao === 90 ? -90 : 0;
                      const lines = splitLabel(label);
                      const lh = 16;
                      const totalH = (lines.length - 1) * lh;
                      return (
                        <text
                          textAnchor="middle" fontSize="14" fontWeight="bold"
                          fill={textCor} fontFamily="Arial, sans-serif"
                          pointerEvents="none"
                          transform={rot !== 0 ? `rotate(${rot} ${cx} ${cy})` : undefined}
                        >
                          {lines.map((line, i) => (
                            <tspan
                              key={i}
                              x={cx}
                              y={cy - totalH / 2 + i * lh}
                              dominantBaseline="central"
                            >
                              {line}
                            </tspan>
                          ))}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Cota de comprimento (acima da chapa) */}
              <text
                x={x + w / 2} y={y - 15}
                textAnchor="middle" fontSize="14" fontWeight="bold"
                fill="#374151" fontFamily="Arial, sans-serif" pointerEvents="none"
              >
                {chapa.material.comprimento} mm
              </text>

              {/* Cota de altura (à esquerda da chapa, rotacionada) */}
              <text
                x={0} y={0}
                textAnchor="middle" fontSize="14" fontWeight="bold"
                fill="#374151" fontFamily="Arial, sans-serif" pointerEvents="none"
                transform={`translate(${x - 15}, ${y + h / 2}) rotate(-90)`}
              >
                {chapa.material.altura} mm
              </text>

              {/* Label "Chapa #N" + botão de excluir (só funciona se chapa estiver vazia) */}
              <foreignObject x={x} y={y - 42} width={w} height={36} style={{ overflow: 'visible' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded text-xs">
                    Chapa #{numero}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); tentarExcluirChapa(chapa); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title={chapa.pecas.length > 0 ? `Não é possível excluir: chapa tem ${chapa.pecas.length} ${chapa.pecas.length === 1 ? 'peça' : 'peças'}` : 'Excluir chapa vazia'}
                    className="shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                      <path d="M6 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V3h3a.5.5 0 0 1 0 1h-.564l-.737 9.583A2 2 0 0 1 9.703 15.5H6.297a2 2 0 0 1-1.996-1.917L3.564 4H3a.5.5 0 0 1 0-1h3v-.5zM4.566 4l.73 9.503a1 1 0 0 0 .998.958h3.412a1 1 0 0 0 .998-.958L11.434 4H4.566zM7 6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6A.5.5 0 0 1 7 6zm2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6A.5.5 0 0 1 9 6z" />
                    </svg>
                    Excluir
                  </Button>
                </div>
              </foreignObject>

              {/* Ícones de corrente entre peças linkadas (paginação com veio) */}
              {(() => {
                // Agrupa peças desta chapa por linkId
                const grupos = new Map();
                for (const p of chapa.pecas) {
                  if (!p.linkId) continue;
                  if (!grupos.has(p.linkId)) grupos.set(p.linkId, []);
                  grupos.get(p.linkId).push(p);
                }
                const correntes = [];
                grupos.forEach((pecasGrupo, linkId) => {
                  if (pecasGrupo.length < 2) return;
                  const pares = paresAdjacentesDoGrupo(pecasGrupo, espessuraDisco);
                  pares.forEach((par, idx) => {
                    const a = par.pecaA;
                    const b = par.pecaB;
                    const aw = (a.rotacao === 90 ? a.altura : a.largura);
                    const ah = (a.rotacao === 90 ? a.largura : a.altura);
                    const bw = (b.rotacao === 90 ? b.altura : b.largura);
                    const bh = (b.rotacao === 90 ? b.largura : b.altura);
                    // Edge compartilhada (em coords mundo do SVG): vertical pra adjacência
                    // horizontal entre peças; horizontal pra adjacência vertical.
                    let edge;
                    if (par.lado === 'horizontal-right') {
                      const eX = x + (a.posX + aw) * ESCALA + (b.posX - (a.posX + aw)) * ESCALA / 2;
                      const overlapTop = Math.max(a.posY, b.posY);
                      const overlapBot = Math.min(a.posY + ah, b.posY + bh);
                      edge = { tipo: 'vert', x: eX, start: y + overlapTop * ESCALA, end: y + overlapBot * ESCALA };
                    } else if (par.lado === 'horizontal-left') {
                      const eX = x + (b.posX + bw) * ESCALA + (a.posX - (b.posX + bw)) * ESCALA / 2;
                      const overlapTop = Math.max(a.posY, b.posY);
                      const overlapBot = Math.min(a.posY + ah, b.posY + bh);
                      edge = { tipo: 'vert', x: eX, start: y + overlapTop * ESCALA, end: y + overlapBot * ESCALA };
                    } else if (par.lado === 'vertical-bottom') {
                      const overlapL = Math.max(a.posX, b.posX);
                      const overlapR = Math.min(a.posX + aw, b.posX + bw);
                      const eY = y + (a.posY + ah) * ESCALA + (b.posY - (a.posY + ah)) * ESCALA / 2;
                      edge = { tipo: 'horiz', y: eY, start: x + overlapL * ESCALA, end: x + overlapR * ESCALA };
                    } else { // vertical-top
                      const overlapL = Math.max(a.posX, b.posX);
                      const overlapR = Math.min(a.posX + aw, b.posX + bw);
                      const eY = y + (b.posY + bh) * ESCALA + (a.posY - (b.posY + bh)) * ESCALA / 2;
                      edge = { tipo: 'horiz', y: eY, start: x + overlapL * ESCALA, end: x + overlapR * ESCALA };
                    }
                    correntes.push({ edge, key: `${linkId}-${idx}` });
                  });
                });
                return correntes.map((c) => {
                  const { edge } = c;
                  // Distribui N X's uniformemente ao longo da edge.
                  const len = edge.end - edge.start;
                  const SPACING = 12;       // espaço entre centros de X
                  const MARGIN = 4;         // recuo das pontas da edge
                  const usavel = Math.max(0, len - MARGIN * 2);
                  const n = usavel < SPACING ? 1 : Math.floor(usavel / SPACING) + 1;
                  const passos = n === 1
                    ? [edge.start + len / 2]
                    : Array.from({ length: n }, (_, i) => edge.start + MARGIN + i * (usavel / (n - 1)));
                  return (
                    <g key={c.key} pointerEvents="none">
                      {passos.map((p, i) => {
                        const cx = edge.tipo === 'vert' ? edge.x : p;
                        const cy = edge.tipo === 'vert' ? p : edge.y;
                        return (
                          <g key={i} transform={`translate(${cx}, ${cy})`} stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
                            <line x1="-3" y1="-3" x2="3" y2="3" />
                            <line x1="-3" y1="3" x2="3" y2="-3" />
                          </g>
                        );
                      })}
                    </g>
                  );
                });
              })()}
            </g>
          );
        })}

        {/* Staging area — peças avulsas do material, abaixo das chapas */}
        <g data-staging="true">
          {/* Fundo levemente destacado pra demarcar a zona */}
          <rect
            x={stagingLayout.x}
            y={stagingLayout.y}
            width={stagingLayout.w}
            height={stagingLayout.h}
            fill="rgba(255, 255, 255, 0.25)"
            stroke="rgba(100, 116, 139, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="10 6"
          />

          {/* Label da staging (acima dela) */}
          <foreignObject x={stagingLayout.x} y={stagingLayout.y - 30} width={stagingLayout.w} height={24} style={{ overflow: 'visible' }}>
            <div className="text-xs">
              <span className="font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded uppercase tracking-wide">
                Peças avulsas
                {avulsasComLayout.length > 0 && (
                  <span className="font-normal text-slate-500 ml-1">· {avulsasComLayout.length}</span>
                )}
              </span>
            </div>
          </foreignObject>

          {/* Peças posicionadas na staging (relativas ao FRAME) */}
          {avulsasComLayout.map((peca) => {
            const px = stagingLayout.frameX + (peca.outsideX || 0) * ESCALA;
            const py = stagingLayout.frameY + (peca.outsideY || 0) * ESCALA;
            const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
            const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
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
                onPointerDown={(e) => handlePecaPointerDown(peca, null, e)}
                onPointerUp={handlePecaPointerUp}
                onPointerCancel={handlePecaPointerUp}
                onContextMenu={(e) => handlePecaContextMenu(peca, null, e)}
                style={{
                  cursor: sendoArrastada ? 'grabbing' : 'grab',
                  opacity: sendoArrastada ? 0.25 : 1,
                }}
              >
                <rect
                  x={px} y={py} width={pw} height={ph}
                  fill={fillCor} stroke={cor} strokeWidth={ehHover ? 2.5 : 1.5}
                />
                {(() => {
                  const cx = px + pw / 2;
                  const cy = py + ph / 2;
                  const rot = peca.rotacao === 90 ? -90 : 0;
                  const lines = splitLabel(peca.nome?.trim() || '–');
                  const lh = 16;
                  const totalH = (lines.length - 1) * lh;
                  return (
                    <text
                      textAnchor="middle" fontSize="14" fontWeight="bold"
                      fill={textCor} fontFamily="Arial, sans-serif"
                      pointerEvents="none"
                      transform={rot !== 0 ? `rotate(${rot} ${cx} ${cy})` : undefined}
                    >
                      {lines.map((line, i) => (
                        <tspan
                          key={i}
                          x={cx}
                          y={cy - totalH / 2 + i * lh}
                          dominantBaseline="central"
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Ícones de corrente entre peças linkadas na STAGING */}
          {(() => {
            const grupos = new Map();
            for (const p of avulsasComLayout) {
              if (!p.linkId) continue;
              if (!grupos.has(p.linkId)) grupos.set(p.linkId, []);
              grupos.get(p.linkId).push(p);
            }
            const correntes = [];
            grupos.forEach((pecasGrupo, linkId) => {
              if (pecasGrupo.length < 2) return;
              const pares = paresAdjacentesDoGrupo(pecasGrupo, espessuraDisco);
              pares.forEach((par, idx) => {
                const a = par.pecaA;
                const b = par.pecaB;
                const aw = (a.rotacao === 90 ? a.altura : a.largura);
                const ah = (a.rotacao === 90 ? a.largura : a.altura);
                const bw = (b.rotacao === 90 ? b.altura : b.largura);
                const bh = (b.rotacao === 90 ? b.largura : b.altura);
                const ax = a.outsideX || 0;
                const ay = a.outsideY || 0;
                const bx = b.outsideX || 0;
                const by = b.outsideY || 0;
                let edge;
                if (par.lado === 'horizontal-right') {
                  const eX = stagingLayout.frameX + (ax + aw) * ESCALA + (bx - (ax + aw)) * ESCALA / 2;
                  const overlapTop = Math.max(ay, by);
                  const overlapBot = Math.min(ay + ah, by + bh);
                  edge = { tipo: 'vert', x: eX, start: stagingLayout.frameY + overlapTop * ESCALA, end: stagingLayout.frameY + overlapBot * ESCALA };
                } else if (par.lado === 'horizontal-left') {
                  const eX = stagingLayout.frameX + (bx + bw) * ESCALA + (ax - (bx + bw)) * ESCALA / 2;
                  const overlapTop = Math.max(ay, by);
                  const overlapBot = Math.min(ay + ah, by + bh);
                  edge = { tipo: 'vert', x: eX, start: stagingLayout.frameY + overlapTop * ESCALA, end: stagingLayout.frameY + overlapBot * ESCALA };
                } else if (par.lado === 'vertical-bottom') {
                  const overlapL = Math.max(ax, bx);
                  const overlapR = Math.min(ax + aw, bx + bw);
                  const eY = stagingLayout.frameY + (ay + ah) * ESCALA + (by - (ay + ah)) * ESCALA / 2;
                  edge = { tipo: 'horiz', y: eY, start: stagingLayout.frameX + overlapL * ESCALA, end: stagingLayout.frameX + overlapR * ESCALA };
                } else {
                  const overlapL = Math.max(ax, bx);
                  const overlapR = Math.min(ax + aw, bx + bw);
                  const eY = stagingLayout.frameY + (by + bh) * ESCALA + (ay - (by + bh)) * ESCALA / 2;
                  edge = { tipo: 'horiz', y: eY, start: stagingLayout.frameX + overlapL * ESCALA, end: stagingLayout.frameX + overlapR * ESCALA };
                }
                correntes.push({ edge, key: `staging-${linkId}-${idx}` });
              });
            });
            return correntes.map((c) => {
              const { edge } = c;
              const len = edge.end - edge.start;
              const SPACING = 12;
              const MARGIN = 4;
              const usavel = Math.max(0, len - MARGIN * 2);
              const n = usavel < SPACING ? 1 : Math.floor(usavel / SPACING) + 1;
              const passos = n === 1
                ? [edge.start + len / 2]
                : Array.from({ length: n }, (_, i) => edge.start + MARGIN + i * (usavel / (n - 1)));
              return (
                <g key={c.key} pointerEvents="none">
                  {passos.map((p, i) => {
                    const cx = edge.tipo === 'vert' ? edge.x : p;
                    const cy = edge.tipo === 'vert' ? p : edge.y;
                    return (
                      <g key={i} transform={`translate(${cx}, ${cy})`} stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
                        <line x1="-3" y1="-3" x2="3" y2="3" />
                        <line x1="-3" y1="3" x2="3" y2="-3" />
                      </g>
                    );
                  })}
                </g>
              );
            });
          })()}
        </g>

        {/* Fantasma da peça (ou GRUPO de peças linkadas) sendo arrastada(s) */}
        {arrastando && !arrastando.fora && (() => {
          const { peca, novaX, novaY, colisao, semAlvo, worldX, worldY, chapaTargetId, stagingTarget, isGrupo, posFinais, mensagem } = arrastando;

          // Cores do fantasma
          const fill = colisao
            ? 'rgba(239, 68, 68, 0.45)'
            : semAlvo
            ? 'rgba(148, 163, 184, 0.35)'
            : stagingTarget
            ? 'rgba(245, 158, 11, 0.35)'
            : 'rgba(59, 130, 246, 0.45)';
          const stroke = colisao
            ? '#dc2626'
            : semAlvo
            ? '#64748b'
            : stagingTarget
            ? '#b45309'
            : '#1e40af';

          // Função auxiliar: world coords da posição em mm da peça
          const worldCoords = (pX, pY) => {
            if (stagingTarget) {
              return { x: stagingLayout.frameX + pX * ESCALA, y: stagingLayout.frameY + pY * ESCALA };
            }
            const layout = layouts.find(l => String(l.chapa.id) === String(chapaTargetId));
            if (!layout) return null;
            return { x: layout.x + pX * ESCALA, y: layout.y + pY * ESCALA };
          };

          // Caso 1: GRUPO linkado — renderiza retângulo pra cada peça do grupo + COLISÃO! no centro.
          if (isGrupo && posFinais && !semAlvo) {
            return (
              <g pointerEvents="none">
                {posFinais.map(({ peca: pp, novaX: pX, novaY: pY }) => {
                  const wc = worldCoords(pX, pY);
                  if (!wc) return null;
                  const pw = (pp.rotacao === 90 ? pp.altura : pp.largura) * ESCALA;
                  const ph = (pp.rotacao === 90 ? pp.largura : pp.altura) * ESCALA;
                  return (
                    <rect
                      key={pp.id}
                      x={wc.x} y={wc.y} width={pw} height={ph}
                      fill={fill} stroke={stroke} strokeWidth="2" strokeDasharray="5 5"
                    />
                  );
                })}
                {colisao && posFinais[0] && (() => {
                  const wc = worldCoords(posFinais[0].novaX, posFinais[0].novaY);
                  const pw = (posFinais[0].peca.rotacao === 90 ? posFinais[0].peca.altura : posFinais[0].peca.largura) * ESCALA;
                  const ph = (posFinais[0].peca.rotacao === 90 ? posFinais[0].peca.largura : posFinais[0].peca.altura) * ESCALA;
                  return wc ? (
                    <text
                      x={wc.x + pw / 2} y={wc.y + ph / 2}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize="11" fontWeight="bold" fill="#ffffff"
                      fontFamily="Arial, sans-serif"
                    >
                      COLISÃO!
                    </text>
                  ) : null;
                })()}
              </g>
            );
          }

          // Caso 2: grupo sem alvo (cursor fora do escopo) — mostra mensagem
          if (isGrupo && semAlvo) {
            const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
            const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
            return (
              <g pointerEvents="none">
                <rect
                  x={worldX} y={worldY} width={w} height={h}
                  fill="rgba(148, 163, 184, 0.35)" stroke="#64748b" strokeWidth="2" strokeDasharray="5 5"
                />
                {mensagem && (
                  <foreignObject x={worldX - 60} y={worldY - 36} width={Math.max(w + 120, 280)} height={28} style={{ overflow: 'visible' }}>
                    <div className="text-[11px] font-medium text-slate-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded text-center">
                      {mensagem}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          }

          // Caso 3 (padrão): peça única
          const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * ESCALA;
          const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * ESCALA;
          let gx, gy;
          if (semAlvo) {
            gx = worldX; gy = worldY;
          } else {
            const wc = worldCoords(novaX, novaY);
            if (!wc) return null;
            gx = wc.x; gy = wc.y;
          }
          return (
            <g pointerEvents="none">
              <rect
                x={gx} y={gy} width={w} height={h}
                fill={fill} stroke={stroke} strokeWidth="2" strokeDasharray="5 5"
              />
              {colisao && (
                <text
                  x={gx + w / 2} y={gy + h / 2}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="11" fontWeight="bold" fill="#ffffff"
                  fontFamily="Arial, sans-serif"
                >
                  COLISÃO!
                </text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* Tooltip DOM overlay */}
      {hover && pecaHoverInfo && (() => {
        const nomePeca = pecaHoverInfo.nome || 'Peça';
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
          type="button" onClick={handleZoomIn}
          className="w-8 h-8 bg-white/95 hover:bg-white border border-slate-300 rounded shadow text-slate-700 font-bold text-base flex items-center justify-center transition-colors"
          title="Aumentar zoom" aria-label="Aumentar zoom"
        >+</button>
        <button
          type="button" onClick={handleZoomOut}
          className="w-8 h-8 bg-white/95 hover:bg-white border border-slate-300 rounded shadow text-slate-700 font-bold text-base flex items-center justify-center transition-colors"
          title="Diminuir zoom" aria-label="Diminuir zoom"
        >−</button>
        <button
          type="button" onClick={handleFit}
          className="w-8 h-8 bg-white/95 hover:bg-white border border-slate-300 rounded shadow text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
          title="Ajustar à tela" aria-label="Ajustar à tela"
        >⇆</button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded pointer-events-none">
        Scroll: zoom · Arrastar fundo: mover · Arrastar peça: reposicionar
      </div>

      {/* Menu de contexto */}
      <ChapaMenuContexto
        menuContexto={menuContexto}
        onFechar={() => setMenuContexto(null)}
        onGirar={(pecaId) => onGirarPeca?.(pecaId, menuContexto?.chapaId)}
        onEditar={abrirEdicaoPeca}
        onLinkar={onLinkarPecas}
        onDesfazerLink={onDesfazerLink}
        tamanhoGrupoLink={(() => {
          if (!menuContexto?.peca?.linkId) return 0;
          const todasPecas = (ambientes || []).flatMap(amb => amb.pecas || []);
          return todasPecas.filter(p => p.linkId === menuContexto.peca.linkId).length;
        })()}
      />
    </div>
  );
};

export { GAP_ENTRE_CHAPAS };

import { useState, useEffect } from 'react';
import {
  TIPOS,
  LADOS,
  CANAL_OFFSET_PADRAO,
  getExtensao,
  dimensaoDoLado,
  recalcularPersonalizados,
} from '../../utils/preview/acabamentosGeometry';

export function AcabamentosLayer({
  peca,
  onChange,
  pecaX,
  pecaY,
  pecaW,
  pecaH,
  largura,
  altura,
  tipoSelecionado,
  abrirPopoverDistancia,
  abrirPopoverMedida,
  svgRef,
}) {
  const [drag, setDrag] = useState(null);
  const [canalDrag, setCanalDrag] = useState(null);

  const svgPointFromEvent = (evt) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  const aplicarExtensao = (tipo, lado, novaExtensao) => {
    const acabAtual = peca.acabamentos?.[tipo];
    if (!acabAtual) return;
    const novoAcabamentos = {
      ...peca.acabamentos,
      [tipo]: { ...acabAtual, extensoes: { ...(acabAtual.extensoes || {}), [lado]: novaExtensao } },
    };
    const novaPeca = { ...peca, acabamentos: novoAcabamentos };
    onChange({ ...novaPeca, acabamentosPersonalizados: recalcularPersonalizados(novaPeca) });
  };

  const iniciarDrag = (evt, tipo, lado, ponta) => {
    evt.stopPropagation();
    evt.preventDefault();
    setDrag({ tipo, lado, ponta });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (evt) => {
      const pt = svgPointFromEvent(evt);
      if (!pt) return;
      let prop;
      if (drag.lado === 'superior' || drag.lado === 'inferior') {
        prop = (pt.x - pecaX) / pecaW;
      } else {
        prop = (pt.y - pecaY) / pecaH;
      }
      prop = Math.min(1, Math.max(0, prop));
      const acab = peca.acabamentos?.[drag.tipo];
      if (!acab) return;
      const ext = getExtensao(acab, drag.lado);
      let novaExt;
      if (drag.ponta === 'inicio') novaExt = { inicio: Math.min(prop, ext.fim - 0.02), fim: ext.fim };
      else                          novaExt = { inicio: ext.inicio, fim: Math.max(prop, ext.inicio + 0.02) };
      aplicarExtensao(drag.tipo, drag.lado, novaExt);
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, peca, pecaX, pecaY, pecaW, pecaH]);

  const iniciarCanalDrag = (evt, lado) => {
    evt.stopPropagation();
    evt.preventDefault();
    setCanalDrag({ lado });
  };

  useEffect(() => {
    if (!canalDrag) return;
    const onMove = (evt) => {
      const pt = svgPointFromEvent(evt);
      if (!pt) return;
      let novoOffset;
      if (canalDrag.lado === 'superior')      novoOffset = (pt.y - pecaY) / pecaH;
      else if (canalDrag.lado === 'inferior') novoOffset = (pecaY + pecaH - pt.y) / pecaH;
      else if (canalDrag.lado === 'esquerda') novoOffset = (pt.x - pecaX) / pecaW;
      else                                     novoOffset = (pecaX + pecaW - pt.x) / pecaW;
      novoOffset = Math.min(0.95, Math.max(0, novoOffset));

      const acabAtual = peca.acabamentos?.canal;
      if (!acabAtual) return;
      const novosOffsets = { ...(acabAtual.offsets || {}), [canalDrag.lado]: novoOffset };
      onChange({
        ...peca,
        acabamentos: { ...peca.acabamentos, canal: { ...acabAtual, offsets: novosOffsets } },
      });
    };
    const onUp = () => setCanalDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canalDrag, peca, pecaX, pecaY, pecaW, pecaH]);

  const HIT_PAD = 22;

  const ladoSegmento = (lado, inicio, fim) => {
    if (lado === 'superior') return { x1: pecaX + pecaW * inicio, y1: pecaY,         x2: pecaX + pecaW * fim, y2: pecaY };
    if (lado === 'inferior') return { x1: pecaX + pecaW * inicio, y1: pecaY + pecaH, x2: pecaX + pecaW * fim, y2: pecaY + pecaH };
    if (lado === 'esquerda') return { x1: pecaX,         y1: pecaY + pecaH * inicio, x2: pecaX,         y2: pecaY + pecaH * fim };
    return                      { x1: pecaX + pecaW, y1: pecaY + pecaH * inicio, x2: pecaX + pecaW, y2: pecaY + pecaH * fim };
  };

  // Hit-area de toggle fica ENCOSTADA na borda externa (não sobrepõe nada interno).
  // Assim a linha do canal (deslocada pra dentro) não é coberta e seu drag funciona.
  const ladoHitRect = (lado) => {
    if (lado === 'superior') return { x: pecaX, y: pecaY - HIT_PAD, width: pecaW, height: HIT_PAD };
    if (lado === 'inferior') return { x: pecaX, y: pecaY + pecaH, width: pecaW, height: HIT_PAD };
    if (lado === 'esquerda') return { x: pecaX - HIT_PAD, y: pecaY, width: HIT_PAD, height: pecaH };
    return { x: pecaX + pecaW, y: pecaY, width: HIT_PAD, height: pecaH };
  };

  const toggleLado = (lado) => {
    if (!tipoSelecionado) return;
    const acabAtual = peca.acabamentos?.[tipoSelecionado] || { ativo: false, lados: {}, extensoes: {} };
    const ladoAtivoAgora = !!acabAtual.lados?.[lado];
    const novoLadoAtivo = !ladoAtivoAgora;

    const novosLados = { ...(acabAtual.lados || {}), [lado]: novoLadoAtivo };
    const novasExtensoes = { ...(acabAtual.extensoes || {}) };
    if (novoLadoAtivo) {
      novasExtensoes[lado] = novasExtensoes[lado] || { inicio: 0, fim: 1 };
    } else {
      delete novasExtensoes[lado];
    }
    const algumLadoAtivo = LADOS.some(l => novosLados[l]);
    const novoAcabamentos = {
      ...(peca.acabamentos || {}),
      [tipoSelecionado]: { ...acabAtual, ativo: algumLadoAtivo, lados: novosLados, extensoes: novasExtensoes },
    };
    const novaPeca = { ...peca, acabamentos: novoAcabamentos };
    onChange({ ...novaPeca, acabamentosPersonalizados: recalcularPersonalizados(novaPeca) });
  };

  const abrirPopover = (tipo, lado) => {
    const ext = getExtensao(peca.acabamentos?.[tipo], lado);
    const dim = dimensaoDoLado(lado, peca) / 1000;
    const valorAtual = (dim * (ext.fim - ext.inicio)).toFixed(2);
    abrirPopoverMedida({ tipo, lado, valorAtual });
  };

  return (
    <>
      {/* Linhas de acabamentos ativos */}
      {TIPOS.flatMap(({ tipo, cor }) => {
        const acab = peca.acabamentos?.[tipo];
        if (!acab?.ativo) return [];
        return LADOS.filter(l => acab.lados?.[l]).map(lado => {
          const ext = getExtensao(acab, lado);
          const seg = ladoSegmento(lado, ext.inicio, ext.fim);
          const isCanal = tipo === 'canal';
          // Canal: deslocamento perpendicular pra dentro da peça (arrastável).
          // offset em proporção 0..1 da dimensão perpendicular.
          let dx = 0, dy = 0;
          if (isCanal) {
            const offset = acab.offsets?.[lado] ?? CANAL_OFFSET_PADRAO;
            if (lado === 'superior')      dy = offset * pecaH;
            else if (lado === 'inferior') dy = -offset * pecaH;
            else if (lado === 'esquerda') dx = offset * pecaW;
            else                          dx = -offset * pecaW;
          }
          const linhaSelecionada = tipoSelecionado === tipo;
          const cursorLinha = isCanal
            ? (lado === 'superior' || lado === 'inferior' ? 'ns-resize' : 'ew-resize')
            : 'pointer';

          // Distância do canal à borda inicial da peça, em mm
          let canalLabel = null;
          if (isCanal) {
            const offsetProp = acab.offsets?.[lado] ?? CANAL_OFFSET_PADRAO;
            const dimMm = (lado === 'superior' || lado === 'inferior') ? altura : largura;
            const distMm = Math.round(offsetProp * dimMm);
            let lx, ly;
            if (lado === 'superior')      { lx = (seg.x1 + seg.x2) / 2;     ly = pecaY + dy / 2; }
            else if (lado === 'inferior') { lx = (seg.x1 + seg.x2) / 2;     ly = pecaY + pecaH + dy / 2; }
            else if (lado === 'esquerda') { lx = pecaX + dx / 2;            ly = (seg.y1 + seg.y2) / 2 + dy / 2; }
            else                          { lx = pecaX + pecaW + dx / 2;    ly = (seg.y1 + seg.y2) / 2 + dy / 2; }
            canalLabel = { lx, ly, texto: `${distMm} mm` };
          }

          return (
            <g key={`${tipo}-${lado}`}>
              {/* Linha de cota tracejada: da borda inicial até a linha do canal */}
              {isCanal && (
                <line
                  x1={lado === 'esquerda' ? pecaX : (lado === 'direita' ? pecaX + pecaW : (seg.x1 + seg.x2) / 2)}
                  y1={lado === 'superior' ? pecaY : (lado === 'inferior' ? pecaY + pecaH : (seg.y1 + seg.y2) / 2)}
                  x2={lado === 'esquerda' ? pecaX + dx : (lado === 'direita' ? pecaX + pecaW + dx : (seg.x1 + seg.x2) / 2)}
                  y2={lado === 'superior' ? pecaY + dy : (lado === 'inferior' ? pecaY + pecaH + dy : (seg.y1 + seg.y2) / 2 + dy)}
                  stroke={cor}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.5"
                  pointerEvents="none"
                />
              )}
              <line
                x1={seg.x1 + dx} y1={seg.y1 + dy}
                x2={seg.x2 + dx} y2={seg.y2 + dy}
                stroke={cor}
                strokeWidth={linhaSelecionada ? 4 : 3}
                strokeDasharray="6 4"
                strokeLinecap="round"
                onDoubleClick={(e) => { e.stopPropagation(); abrirPopover(tipo, lado); }}
                onMouseDown={isCanal ? (e) => iniciarCanalDrag(e, lado) : undefined}
                style={{ cursor: cursorLinha }}
              />
              {/* Label da distância do canal à borda inicial — clicável pra editar */}
              {canalLabel && (
                <g
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    const dimMm = (lado === 'superior' || lado === 'inferior') ? altura : largura;
                    const valorInicial = Math.round((acab.offsets?.[lado] ?? CANAL_OFFSET_PADRAO) * dimMm);
                    abrirPopoverDistancia({
                      valorInicial: String(valorInicial),
                      label: `Canal — ${lado} (mm)`,
                      cor,
                      onAplicar: (mm) => {
                        const dim = (lado === 'superior' || lado === 'inferior') ? altura : largura;
                        if (!Number.isFinite(mm) || dim <= 0) return;
                        const offset = Math.max(0, Math.min(0.95, mm / dim));
                        const acabAtual = peca.acabamentos?.canal;
                        if (!acabAtual) return;
                        onChange({
                          ...peca,
                          acabamentos: {
                            ...peca.acabamentos,
                            canal: { ...acabAtual, offsets: { ...(acabAtual.offsets || {}), [lado]: offset } },
                          },
                        });
                      },
                    });
                  }}
                >
                  <rect
                    x={canalLabel.lx - 22} y={canalLabel.ly - 8}
                    width="44" height="16"
                    fill="#fff" stroke={cor} strokeWidth="1" rx="3"
                  />
                  <text
                    x={canalLabel.lx} y={canalLabel.ly + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill={cor}
                    fontFamily="Arial, sans-serif"
                    pointerEvents="none"
                  >
                    {canalLabel.texto}
                  </text>
                </g>
              )}
              {linhaSelecionada && (
                <>
                  <circle
                    cx={seg.x1 + dx} cy={seg.y1 + dy} r="6"
                    fill="#fff" stroke={cor} strokeWidth="2"
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => iniciarDrag(e, tipo, lado, 'inicio')}
                  />
                  <circle
                    cx={seg.x2 + dx} cy={seg.y2 + dy} r="6"
                    fill="#fff" stroke={cor} strokeWidth="2"
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => iniciarDrag(e, tipo, lado, 'fim')}
                  />
                </>
              )}
            </g>
          );
        });
      })}

      {/* Hit areas das laterais (clique pra toggle quando há tipo selecionado) */}
      {tipoSelecionado && LADOS.map(lado => {
        const r = ladoHitRect(lado);
        const ladoAtivo = !!peca.acabamentos?.[tipoSelecionado]?.lados?.[lado];
        return (
          <rect
            key={`hit-${lado}`}
            x={r.x} y={r.y} width={r.width} height={r.height}
            fill={TIPOS.find(t => t.tipo === tipoSelecionado).cor}
            fillOpacity={ladoAtivo ? 0 : 0.06}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => toggleLado(lado)}
            onMouseEnter={(e) => { if (!ladoAtivo) e.currentTarget.setAttribute('fill-opacity', '0.18'); }}
            onMouseLeave={(e) => { if (!ladoAtivo) e.currentTarget.setAttribute('fill-opacity', '0.06'); }}
            style={{ cursor: 'pointer' }}
          />
        );
      })}
    </>
  );
}

import { useState, useRef } from 'react';
import { usePreviewViewport } from './hooks/usePreviewViewport';
import { PreviewToolbar } from './PreviewToolbar';
import { AcabamentosLayer } from './AcabamentosLayer';
import { RecortesLayer } from './RecortesLayer';
import { PopoverMedida } from './popovers/PopoverMedida';
import { PopoverRecorteMedidas } from './popovers/PopoverRecorteMedidas';
import { PopoverDistancia } from './popovers/PopoverDistancia';
import {
  TIPOS,
  RECORTE_TIPOS_LIST,
  RECORTE_TIPOS,
  dimensaoDoLado,
  recalcularPersonalizados,
  clampMm,
  sincronizarQuantidadesRecortes,
} from '../../utils/preview/acabamentosGeometry';
import { calcularFixacaoPeca, calcularColagemPeca } from '../../utils/maoDeObra';

/**
 * Preview interativo de acabamentos com zoom + pan.
 *
 * Substitui os 3 blocos antigos (botões de tipo + grade de lados + canvas estático).
 *
 * Interações:
 * - Botões de tipo (topo): seleciona um tipo pra aplicar.
 * - Clique numa lateral da peça: toggle (liga/desliga) do tipo selecionado nesse lado.
 * - Duplo clique numa linha ativa: popover pra editar o tamanho da linha em metros.
 * - Arrastar uma das pontas (handles): muda o tamanho/posição da linha.
 * - Arrastar a área cinza: pan (move o conteúdo).
 * - Botões +/−/Reset (canto superior direito) ou roda do mouse: zoom in/out.
 *
 * Modelo de dados:
 * - peca.acabamentos[tipo].lados.{superior|inferior|esquerda|direita} (boolean) — compatível com hoje.
 * - peca.acabamentos[tipo].extensoes[lado] = { inicio, fim } em proporção 0..1 — opcional.
 *   Default { inicio:0, fim:1 } (lateral inteira) quando lado=true e não há extensoes.
 * - peca.acabamentosPersonalizados[tipo] (string em metros) — recalculado automaticamente após
 *   cada mudança visual. calculations.js já lê esse campo, então o cálculo de custos não muda.
 */

// Padding interno (em pixels do viewBox quando zoom=1) — distância da peça pra borda
const PAD = 70;

export const PreviewAcabamentosInterativo = ({ peca, precos, onChange, height }) => {
  // Se `height` for omitido, o canvas ocupa 100% do container (flex-1 do pai).
  const alturaResponsiva = height == null;
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [popover, setPopover] = useState(null);
  const [popoverDistancia, setPopoverDistancia] = useState(null); // { valorInicial, label, cor, onAplicar }
  const [recortePopover, setRecortePopover] = useState(null); // { id }
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const { containerSize, zoom, viewBox, iniciarPan: _iniciarPan, panDrag, zoomControls } =
    usePreviewViewport(containerRef, svgRef, height);

  const iniciarPan = (evt) => _iniciarPan(evt);

  const largura = parseFloat(peca.largura) || 0;
  const altura = parseFloat(peca.altura) || 0;
  const valido = largura > 0 && altura > 0;

  // Geometria da peça (em pixels do viewBox quando zoom=1) — centralizada no container
  const areaW = Math.max(0, containerSize.w - PAD * 2);
  const areaH = Math.max(0, containerSize.h - PAD * 2);
  let pecaX = 0, pecaY = 0, pecaW = 0, pecaH = 0;
  if (valido && areaW > 0 && areaH > 0) {
    const escala = Math.min(areaW / largura, areaH / altura) * 0.9;
    pecaW = largura * escala;
    pecaH = altura * escala;
    pecaX = containerSize.w / 2 - pecaW / 2;
    pecaY = containerSize.h / 2 - pecaH / 2;
  }

  // ----- Recortes: adicionar -----
  const adicionarRecorte = (tipo) => {
    if (!valido) return;
    const cfg = RECORTE_TIPOS[tipo];
    if (!cfg) return;
    if (cfg.shape === 'toggle') {
      // Pé: toggle único por peça
      onChange({ ...peca, pes: peca.pes ? 0 : 1 });
      return;
    }
    const existentes = (peca.recortesPosicionados || []).filter(r => r.tipo === tipo);
    const offsetIdx = existentes.length;
    const offsetMm = 30 * offsetIdx;
    let novo;
    if (cfg.shape === 'retangulo') {
      const w = cfg.defaults.largura, h = cfg.defaults.altura;
      novo = {
        id: Date.now() + Math.random(),
        tipo,
        shape: 'retangulo',
        x: clampMm(largura / 2 - w / 2 + offsetMm, 0, largura - w),
        y: clampMm(altura / 2 - h / 2 + offsetMm, 0, altura - h),
        largura: w,
        altura: h,
      };
    } else {
      const r = cfg.defaults.raio;
      novo = {
        id: Date.now() + Math.random(),
        tipo,
        shape: 'circulo',
        x: clampMm(largura / 2 + offsetMm, r, largura - r),
        y: clampMm(altura / 2 + offsetMm, r, altura - r),
        raio: r,
      };
    }
    const novaPeca = sincronizarQuantidadesRecortes({
      ...peca,
      recortesPosicionados: [...(peca.recortesPosicionados || []), novo],
    });
    onChange(novaPeca);
  };

  const aplicarPopover = (valorStr) => {
    if (!popover) return;
    const valor = parseFloat(valorStr);
    if (isNaN(valor) || valor <= 0) { setPopover(null); return; }
    const dim = dimensaoDoLado(popover.lado, peca) / 1000;
    if (dim <= 0) { setPopover(null); return; }
    let prop = valor / dim;
    prop = Math.min(1, Math.max(0.02, prop));
    const meio = 0.5;
    const novaExt = { inicio: meio - prop / 2, fim: meio + prop / 2 };
    const acabAtual = peca.acabamentos?.[popover.tipo];
    if (!acabAtual) { setPopover(null); return; }
    const novoAcabamentos = {
      ...peca.acabamentos,
      [popover.tipo]: { ...acabAtual, extensoes: { ...(acabAtual.extensoes || {}), [popover.lado]: novaExt } },
    };
    const novaPeca = { ...peca, acabamentos: novoAcabamentos };
    onChange({ ...novaPeca, acabamentosPersonalizados: recalcularPersonalizados(novaPeca) });
    setPopover(null);
  };

  return (
    <div className={alturaResponsiva
      ? 'flex flex-col h-full'
      : 'border-2 border-slate-300 rounded-lg p-4 bg-white'
    }>

      {/* Container do canvas — fundo cinza claro; o grid CAD-style fica dentro do SVG (segue pan/zoom). */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${alturaResponsiva ? 'flex-1 min-h-0' : 'rounded-md border border-slate-400'}`}
        style={{
          ...(alturaResponsiva ? {} : { height }),
          backgroundColor: '#e2e8f0',
        }}
      >
        <PreviewToolbar
          peca={peca}
          precos={precos}
          tipoSelecionado={tipoSelecionado}
          setTipoSelecionado={setTipoSelecionado}
          onAdicionarRecorte={adicionarRecorte}
          zoom={zoom}
          zoomControls={zoomControls}
          valido={valido}
        />

        <svg
          ref={svgRef}
          viewBox={viewBox}
          width="100%"
          height="100%"
          style={{
            cursor: panDrag ? 'grabbing' : (tipoSelecionado && valido ? 'crosshair' : 'grab'),
            userSelect: 'none',
            display: 'block',
          }}
        >
          {/* Grid CAD-style — em coordenadas do viewBox, segue pan e zoom */}
          <defs>
            <pattern id="grid-fino" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0, 0, 0, 0.10)" strokeWidth="1" />
            </pattern>
            <pattern id="grid-grosso" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(0, 0, 0, 0.25)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect
            x={-99999} y={-99999} width={199998} height={199998}
            fill="url(#grid-fino)"
            pointerEvents="none"
          />
          <rect
            x={-99999} y={-99999} width={199998} height={199998}
            fill="url(#grid-grosso)"
            pointerEvents="none"
          />

          {/* Hit-area gigante: captura cliques pra pan */}
          <rect
            x={-99999} y={-99999} width={199998} height={199998}
            fill="transparent"
            onMouseDown={iniciarPan}
          />

          {valido && (
            <>
              {/* Peça */}
              <rect
                x={pecaX} y={pecaY} width={pecaW} height={pecaH}
                fill="#ffffff" stroke="#94a3b8" strokeWidth="2"
                onMouseDown={iniciarPan}
              />

              {/* Labels de medida — clicáveis pra editar */}
              <g
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverDistancia({
                    valorInicial: String(Math.round(largura)),
                    label: 'Largura (mm)',
                    cor: '#1e293b',
                    onAplicar: (mm) => {
                      if (Number.isFinite(mm) && mm > 0) onChange({ ...peca, largura: mm });
                    },
                  });
                }}
              >
                <rect x={pecaX + pecaW/2 - 36} y={pecaY - 26} width="72" height="18" fill="#fff" stroke="#cbd5e1" strokeWidth="1" rx="2" />
                <text x={pecaX + pecaW/2} y={pecaY - 13} textAnchor="middle" fontSize="12" fill="#1e293b" fontFamily="Arial, sans-serif" pointerEvents="none">{largura} mm</text>
              </g>
              <g
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverDistancia({
                    valorInicial: String(Math.round(altura)),
                    label: 'Altura (mm)',
                    cor: '#1e293b',
                    onAplicar: (mm) => {
                      if (Number.isFinite(mm) && mm > 0) onChange({ ...peca, altura: mm });
                    },
                  });
                }}
                transform={`translate(${pecaX - 26}, ${pecaY + pecaH/2}) rotate(-90)`}
              >
                <rect x="-36" y="-10" width="72" height="20" fill="#fff" stroke="#cbd5e1" strokeWidth="1" rx="2" />
                <text x="0" y="4" textAnchor="middle" fontSize="12" fill="#1e293b" fontFamily="Arial, sans-serif" pointerEvents="none">{altura} mm</text>
              </g>

              {/* Nome da peça */}
              {peca.nome && (
                <g pointerEvents="none">
                  <text x={pecaX + pecaW/2} y={pecaY + pecaH/2 + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#64748b" fontFamily="Arial, sans-serif">
                    {peca.nome.length > 28 ? peca.nome.substring(0, 28) + '…' : peca.nome}
                  </text>
                </g>
              )}

              <AcabamentosLayer
                peca={peca}
                onChange={onChange}
                pecaX={pecaX}
                pecaY={pecaY}
                pecaW={pecaW}
                pecaH={pecaH}
                largura={largura}
                altura={altura}
                tipoSelecionado={tipoSelecionado}
                abrirPopoverDistancia={setPopoverDistancia}
                abrirPopoverMedida={setPopover}
                svgRef={svgRef}
              />

              <RecortesLayer
                peca={peca}
                onChange={onChange}
                pecaX={pecaX}
                pecaY={pecaY}
                pecaW={pecaW}
                pecaH={pecaH}
                largura={largura}
                altura={altura}
                abrirPopoverDistancia={setPopoverDistancia}
                abrirPopoverRecorte={setRecortePopover}
                zoom={zoom}
              />

              {/* Resumo textual abaixo da peça — substitui o antigo "Fixação: N grapas".
                  Linhas separadas: acabamentos, recortes, mão de obra. */}
              {(() => {
                const acabAtivos = TIPOS.filter(({ tipo }) => peca.acabamentos?.[tipo]?.ativo);
                const recAtivos = RECORTE_TIPOS_LIST.filter(({ tipo, shape }) =>
                  shape === 'toggle' ? !!peca.pes : (peca[tipo] || 0) > 0
                );
                const fixData = calcularFixacaoPeca(peca, precos);
                const colData = calcularColagemPeca(peca, precos);
                const temFix = peca.cobrarFixacao === true && fixData.total > 0;
                const temCol = peca.cobrarColagem === true && colData.total > 0;

                const linhas = [];
                // Cada acabamento ativo vira uma linha
                acabAtivos.forEach(({ tipo, label }) => {
                  const m = parseFloat(peca.acabamentosPersonalizados?.[tipo] || '0') || 0;
                  const valor = m * (precos?.[tipo] || 0);
                  linhas.push({ label, texto: `${m.toFixed(2)}m  R$${valor.toFixed(2)}` });
                });
                // Cada recorte ativo vira uma linha
                recAtivos.forEach(({ tipo, label, shape }) => {
                  const isPes = shape === 'toggle';
                  const qtd = isPes ? (peca.pes || 0) : (peca[tipo] || 0);
                  const precoKey = tipo === 'cuba' ? 'pia' : tipo;
                  const preco = precos?.[precoKey] || 0;
                  const valor = qtd * preco;
                  linhas.push({ label, texto: `×${qtd}  R$${valor.toFixed(2)}` });
                });
                // Mão de obra — fixação em 3 linhas (largura, grapas, p.u.) + colagem em 1 linha
                if (temFix) {
                  linhas.push({ label: 'Fixação', texto: `${fixData.larguraM.toFixed(2)}m  R$${fixData.valorMao.toFixed(2)}` });
                  linhas.push({ label: 'Grapas', texto: `×${fixData.qtdGrapas}  R$${fixData.valorGrapas.toFixed(2)}` });
                  linhas.push({ label: 'P.U.', texto: `×${fixData.qtdPus}  R$${fixData.valorPus.toFixed(2)}` });
                }
                if (temCol) {
                  linhas.push({ label: 'Colagem', texto: `${colData.areaM2.toFixed(2)}m²  R$${colData.total.toFixed(2)}` });
                }

                if (linhas.length === 0) return null;
                return (
                  <g pointerEvents="none">
                    {linhas.map((linha, i) => (
                      <text
                        key={i}
                        x={pecaX}
                        y={pecaY + pecaH + 18 + i * 16}
                        fontSize="11"
                        fontFamily="Arial, sans-serif"
                      >
                        <tspan fill="#64748b" fontWeight="bold">{linha.label}: </tspan>
                        <tspan fill="#1e293b">{linha.texto}</tspan>
                      </text>
                    ))}
                  </g>
                );
              })()}

              {/* Grapas de fixação — retângulos cinza verticais distribuídos na borda superior */}
              {peca.cobrarFixacao === true && (() => {
                const qtdGrapas = Math.ceil((largura / 1000) / 0.6);
                if (qtdGrapas <= 0) return null;
                const grapaW = 18;
                const grapaH = 32;
                return (
                  <g pointerEvents="none">
                    {Array.from({ length: qtdGrapas }).map((_, i) => {
                      const cx = pecaX + (pecaW * (i + 1)) / (qtdGrapas + 1);
                      const cy = pecaY + 20;
                      return (
                        <g key={i}>
                          <rect
                            x={cx - grapaW / 2 + 1.2}
                            y={cy - grapaH / 2 + 1.2}
                            width={grapaW}
                            height={grapaH}
                            fill="rgba(0,0,0,0.35)"
                            rx="1.5"
                          />
                          <rect
                            x={cx - grapaW / 2}
                            y={cy - grapaH / 2}
                            width={grapaW}
                            height={grapaH}
                            fill="#475569"
                            stroke="#1e293b"
                            strokeWidth="1"
                            rx="1.5"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            </>
          )}
        </svg>

        {/* Popover de medida — overlay sobre o canvas */}
        {popover && (
          <PopoverMedida
            valorInicial={popover.valorAtual}
            label={`${TIPOS.find(t => t.tipo === popover.tipo).label} — ${popover.lado}`}
            onConfirmar={aplicarPopover}
            onCancelar={() => setPopover(null)}
          />
        )}

        {/* Popover de medidas do recorte */}
        {recortePopover && (() => {
          const rec = (peca.recortesPosicionados || []).find(r => r.id === recortePopover.id);
          if (!rec) return null;
          const cfg = RECORTE_TIPOS[rec.tipo];
          return (
            <PopoverRecorteMedidas
              recorte={rec}
              label={cfg?.label || rec.tipo}
              onConfirmar={(patch) => {
                // Clamp pra não sair da peça
                const merged = { ...rec, ...patch };
                if (merged.shape === 'retangulo') {
                  merged.largura = clampMm(merged.largura, 10, largura);
                  merged.altura  = clampMm(merged.altura,  10, altura);
                  merged.x = clampMm(merged.x, 0, largura - merged.largura);
                  merged.y = clampMm(merged.y, 0, altura - merged.altura);
                } else {
                  merged.raio = clampMm(merged.raio, 5, Math.min(largura, altura) / 2);
                  merged.x = clampMm(merged.x, merged.raio, largura - merged.raio);
                  merged.y = clampMm(merged.y, merged.raio, altura - merged.raio);
                }
                onChange(sincronizarQuantidadesRecortes({
                  ...peca,
                  recortesPosicionados: (peca.recortesPosicionados || []).map(r =>
                    r.id === rec.id ? { ...r, ...merged } : r
                  ),
                }));
                setRecortePopover(null);
              }}
              onCancelar={() => setRecortePopover(null)}
            />
          );
        })()}

        {/* Popover pra digitar distância (canal ou recorte) */}
        {popoverDistancia && (
          <PopoverDistancia
            valorInicial={popoverDistancia.valorInicial}
            label={popoverDistancia.label}
            cor={popoverDistancia.cor}
            onConfirmar={(mm) => {
              popoverDistancia.onAplicar(mm);
              setPopoverDistancia(null);
            }}
            onCancelar={() => setPopoverDistancia(null)}
          />
        )}
      </div>

    </div>
  );
};

/**
 * Resumo de acabamentos + recortes ativos numa peça (chips horizontais).
 * Renderiza sempre — mostra placeholder quando vazio.
 */
export function ResumoAcabamentosRecortes({ peca, precos }) {
  const acabAtivos = TIPOS.filter(({ tipo }) => peca.acabamentos?.[tipo]?.ativo);
  const recAtivos = RECORTE_TIPOS_LIST.filter(({ tipo, shape }) =>
    shape === 'toggle' ? !!peca.pes : (peca[tipo] || 0) > 0
  );
  const fixacao = calcularFixacaoPeca(peca, precos);
  const colagem = calcularColagemPeca(peca, precos);
  const cobrarFix = peca.cobrarFixacao === true && fixacao.total > 0;
  const cobrarCol = peca.cobrarColagem === true && colagem.total > 0;
  const temAcabRec = acabAtivos.length > 0 || recAtivos.length > 0;

  return (
    <div className="space-y-1.5">
      {/* Linha 1 — Acabamentos + Recortes (sempre visível, mesmo vazia) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 shrink-0">Acab. + Recortes</span>
        {!temAcabRec && (
          <span className="text-xs text-slate-400 italic">nenhum</span>
        )}
        {acabAtivos.map(({ tipo, label, cor }) => {
          const m = parseFloat(peca.acabamentosPersonalizados?.[tipo] || '0') || 0;
          const valor = m * (precos?.[tipo] || 0);
          return (
            <div key={`acab-${tipo}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200 text-sm">
              <svg width="18" height="5" className="shrink-0">
                <line x1="0" y1="2.5" x2="18" y2="2.5" stroke={cor} strokeWidth="3" strokeDasharray="4 2" strokeLinecap="round" />
              </svg>
              <span className="font-medium text-slate-700">{label}</span>
              <span className="text-slate-500">{m.toFixed(2)}m</span>
              <span className="text-slate-400">·</span>
              <span className="font-semibold text-slate-700">R$ {valor.toFixed(2)}</span>
            </div>
          );
        })}
        {recAtivos.map(({ tipo, label, cor, shape }) => {
          const isPes = shape === 'toggle';
          const qtd = isPes ? (peca.pes || 0) : (peca[tipo] || 0);
          const precoKey = tipo === 'cuba' ? 'pia' : tipo;
          const preco = precos?.[precoKey] || 0;
          const valor = qtd * preco;
          return (
            <div key={`rec-${tipo}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200 text-sm">
              {shape === 'circulo' ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: cor }} />
              ) : (
                <div className="w-3.5 h-2.5 border-2 rounded-sm shrink-0" style={{ borderColor: cor }} />
              )}
              <span className="font-medium text-slate-700">{label}</span>
              <span className="text-slate-500">×{qtd}</span>
              <span className="text-slate-400">·</span>
              <span className="font-semibold text-slate-700">R$ {valor.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Linha 2 — Mão de Obra (sempre visível). Cada modalidade só renderiza chip se ativa. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 shrink-0">Mão de obra</span>
        {!cobrarFix && !cobrarCol && (
          <span className="text-xs text-slate-400 italic">nenhuma cobrança marcada</span>
        )}

        {/* Fixação — chip 1: largura × R$/m */}
        {cobrarFix && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-sm">
            <span className="text-base leading-none" aria-hidden="true">📏</span>
            <span className="font-medium text-slate-700">Fixação</span>
            <span className="text-slate-500">{fixacao.larguraM.toFixed(2)}m</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-700">R$ {fixacao.valorMao.toFixed(2)}</span>
          </div>
        )}

        {/* Fixação — chip 2: grapas */}
        {cobrarFix && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-sm">
            <div className="flex gap-0.5 shrink-0 items-center">
              {Array.from({ length: Math.min(fixacao.qtdGrapas, 6) }).map((_, i) => (
                <div key={i} className="w-2.5 h-1 bg-slate-600 border border-slate-800 rounded-sm" />
              ))}
            </div>
            <span className="font-medium text-slate-700">Grapas</span>
            <span className="text-slate-500">×{fixacao.qtdGrapas}</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-700">R$ {fixacao.valorGrapas.toFixed(2)}</span>
          </div>
        )}

        {/* Fixação — chip 3: P.U. */}
        {cobrarFix && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-sm">
            <span className="text-base leading-none" aria-hidden="true">🔩</span>
            <span className="font-medium text-slate-700">P.U.</span>
            <span className="text-slate-500">×{fixacao.qtdPus}</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-700">R$ {fixacao.valorPus.toFixed(2)}</span>
          </div>
        )}

        {/* Colagem */}
        {cobrarCol && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-sm">
            <div className="w-3 h-3 bg-amber-200 border border-amber-700 shrink-0" title="Colagem na parede" />
            <span className="font-medium text-slate-700">Colagem</span>
            <span className="text-slate-500">{colagem.areaM2.toFixed(2)}m²</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-700">R$ {colagem.total.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}


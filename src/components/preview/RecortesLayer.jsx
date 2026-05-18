import { useState, useEffect } from 'react';
import {
  RECORTE_TIPOS,
  clampMm,
  sincronizarQuantidadesRecortes,
  cantoRecorte,
} from '../../utils/preview/acabamentosGeometry';

export function RecortesLayer({
  peca,
  onChange,
  pecaX,
  pecaY,
  pecaW,
  pecaH,
  largura,
  altura,
  abrirPopoverDistancia,
  abrirPopoverRecorte,
  zoom,
}) {
  const [recorteSelecionadoId, setRecorteSelecionadoId] = useState(null);
  const [recorteDrag, setRecorteDrag] = useState(null);

  const atualizarRecorte = (id, patch) => {
    const novaPeca = sincronizarQuantidadesRecortes({
      ...peca,
      recortesPosicionados: (peca.recortesPosicionados || []).map(r =>
        r.id === id ? { ...r, ...patch } : r
      ),
    });
    onChange(novaPeca);
  };

  const excluirRecorte = (id) => {
    const novaPeca = sincronizarQuantidadesRecortes({
      ...peca,
      recortesPosicionados: (peca.recortesPosicionados || []).filter(r => r.id !== id),
    });
    onChange(novaPeca);
    if (recorteSelecionadoId === id) setRecorteSelecionadoId(null);
  };

  const aplicarDistanciaRecorte = (recorteId, qualLado, novoMm) => {
    const rec = (peca.recortesPosicionados || []).find(r => r.id === recorteId);
    if (!rec || !Number.isFinite(novoMm) || novoMm < 0) return;
    const c = cantoRecorte(rec);
    let novoCantoX = c.x, novoCantoY = c.y;
    if      (qualLado === 'top')    novoCantoY = clampMm(novoMm, 0, altura - c.h);
    else if (qualLado === 'bottom') novoCantoY = clampMm(altura - novoMm - c.h, 0, altura - c.h);
    else if (qualLado === 'left')   novoCantoX = clampMm(novoMm, 0, largura - c.w);
    else if (qualLado === 'right')  novoCantoX = clampMm(largura - novoMm - c.w, 0, largura - c.w);
    const novoX = rec.shape === 'circulo' ? novoCantoX + rec.raio : novoCantoX;
    const novoY = rec.shape === 'circulo' ? novoCantoY + rec.raio : novoCantoY;
    atualizarRecorte(recorteId, { x: novoX, y: novoY });
  };

  const iniciarRecorteDrag = (evt, recorte) => {
    evt.stopPropagation();
    evt.preventDefault();
    setRecorteSelecionadoId(recorte.id);
    setRecorteDrag({
      id: recorte.id,
      startClientX: evt.clientX,
      startClientY: evt.clientY,
      startX: recorte.x,
      startY: recorte.y,
    });
  };

  // Click fora de qualquer recorte → deseleciona (esconde linhas de cota e botão X).
  // Usa capture phase pra rodar antes do stopPropagation do iniciarRecorteDrag —
  // se clicar em outro recorte, este efeito desmarca e o iniciarRecorteDrag remarca.
  useEffect(() => {
    if (!recorteSelecionadoId) return;
    const handle = (e) => {
      if (!e.target.closest?.('[data-recorte-id]')) {
        setRecorteSelecionadoId(null);
      }
    };
    document.addEventListener('mousedown', handle, true);
    return () => document.removeEventListener('mousedown', handle, true);
  }, [recorteSelecionadoId]);

  useEffect(() => {
    if (!recorteDrag) return;
    const onMove = (evt) => {
      const escala = pecaW / largura;
      if (escala <= 0) return;
      const dxMm = (evt.clientX - recorteDrag.startClientX) / (escala * zoom);
      const dyMm = (evt.clientY - recorteDrag.startClientY) / (escala * zoom);
      const rec = (peca.recortesPosicionados || []).find(r => r.id === recorteDrag.id);
      if (!rec) return;
      let novoX = recorteDrag.startX + dxMm;
      let novoY = recorteDrag.startY + dyMm;
      if (rec.shape === 'retangulo') {
        novoX = clampMm(novoX, 0, largura - rec.largura);
        novoY = clampMm(novoY, 0, altura - rec.altura);
      } else {
        novoX = clampMm(novoX, rec.raio, largura - rec.raio);
        novoY = clampMm(novoY, rec.raio, altura - rec.raio);
      }
      atualizarRecorte(recorteDrag.id, { x: novoX, y: novoY });
    };
    const onUp = () => setRecorteDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorteDrag, peca, pecaW, largura, altura, zoom]);

  const escala = pecaW / largura;
  if (!Number.isFinite(escala) || escala <= 0) return null;

  return (
    <>
      {(peca.recortesPosicionados || []).map(rec => {
        const cfg = RECORTE_TIPOS[rec.tipo];
        if (!cfg) return null;
        const selecionado = recorteSelecionadoId === rec.id;
        const sw = selecionado ? 3 : 2;

        if (rec.shape === 'retangulo') {
          const x = pecaX + rec.x * escala;
          const y = pecaY + rec.y * escala;
          const w = rec.largura * escala;
          const h = rec.altura * escala;
          return (
            <g key={rec.id} data-recorte-id={rec.id}>
              {/* Linhas de cota até as 4 bordas (só quando selecionado) — labels clicáveis */}
              {selecionado && (
                <g>
                  {[
                    { x1: x + w/2, y1: pecaY,            x2: x + w/2, y2: y,             dist: rec.y,                                  qualLado: 'top'    },
                    { x1: x + w/2, y1: y + h,            x2: x + w/2, y2: pecaY + pecaH, dist: altura - (rec.y + rec.altura),         qualLado: 'bottom' },
                    { x1: pecaX,   y1: y + h/2,          x2: x,        y2: y + h/2,       dist: rec.x,                                  qualLado: 'left'   },
                    { x1: x + w,   y1: y + h/2,          x2: pecaX + pecaW, y2: y + h/2,  dist: largura - (rec.x + rec.largura),       qualLado: 'right'  },
                  ].map((c, i) => (
                    <g key={i}>
                      <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                        stroke={cfg.cor} strokeWidth="1" strokeDasharray="2 2" opacity="0.6"
                        pointerEvents="none" />
                      <g
                        style={{ cursor: 'pointer' }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirPopoverDistancia({
                            valorInicial: String(Math.round(c.dist)),
                            label: `${cfg.label} — distância ${c.qualLado} (mm)`,
                            cor: cfg.cor,
                            onAplicar: (mm) => aplicarDistanciaRecorte(rec.id, c.qualLado, mm),
                          });
                        }}
                      >
                        <rect
                          x={(c.x1 + c.x2) / 2 - 22}
                          y={(c.y1 + c.y2) / 2 - 8}
                          width="44" height="16"
                          fill="#fff" stroke={cfg.cor} strokeWidth="1" rx="3"
                        />
                        <text
                          x={(c.x1 + c.x2) / 2}
                          y={(c.y1 + c.y2) / 2 + 4}
                          textAnchor="middle"
                          fontSize="10" fontWeight="bold"
                          fill={cfg.cor}
                          fontFamily="Arial, sans-serif"
                          pointerEvents="none"
                        >
                          {Math.round(c.dist)} mm
                        </text>
                      </g>
                    </g>
                  ))}
                </g>
              )}
              <rect
                x={x} y={y} width={w} height={h}
                fill={cfg.cor}
                fillOpacity={selecionado ? 0.18 : 0.10}
                stroke={cfg.cor}
                strokeWidth={sw}
                strokeDasharray="6 4"
                onMouseDown={(e) => iniciarRecorteDrag(e, rec)}
                onDoubleClick={(e) => { e.stopPropagation(); abrirPopoverRecorte({ id: rec.id }); }}
                style={{ cursor: 'move' }}
              />
              {/* Label dimensões no centro */}
              <g pointerEvents="none">
                <rect
                  x={x + w/2 - 38} y={y + h/2 - 9}
                  width="76" height="18"
                  fill="#fff" stroke={cfg.cor} strokeWidth="1" rx="3"
                />
                <text
                  x={x + w/2} y={y + h/2 + 4}
                  textAnchor="middle"
                  fontSize="10" fontWeight="bold"
                  fill={cfg.cor}
                  fontFamily="Arial, sans-serif"
                >
                  {rec.largura}×{rec.altura}
                </text>
              </g>
              {/* Botão excluir (X) quando selecionado */}
              {selecionado && (
                <g
                  transform={`translate(${x + w + 4}, ${y - 4})`}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); excluirRecorte(rec.id); }}
                >
                  <circle cx="0" cy="0" r="9" fill="#fff" stroke="#dc2626" strokeWidth="1.5" />
                  <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#dc2626">×</text>
                </g>
              )}
            </g>
          );
        } else {
          // Círculo
          const cx = pecaX + rec.x * escala;
          const cy = pecaY + rec.y * escala;
          const r = rec.raio * escala;
          return (
            <g key={rec.id} data-recorte-id={rec.id}>
              {selecionado && (
                <g>
                  {[
                    { x1: cx,        y1: pecaY,         x2: cx,        y2: cy - r,        dist: rec.y - rec.raio,                qualLado: 'top'    },
                    { x1: cx,        y1: cy + r,        x2: cx,        y2: pecaY + pecaH, dist: altura - (rec.y + rec.raio),      qualLado: 'bottom' },
                    { x1: pecaX,     y1: cy,            x2: cx - r,    y2: cy,            dist: rec.x - rec.raio,                qualLado: 'left'   },
                    { x1: cx + r,    y1: cy,            x2: pecaX + pecaW, y2: cy,        dist: largura - (rec.x + rec.raio),     qualLado: 'right'  },
                  ].map((c, i) => (
                    <g key={i}>
                      <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                        stroke={cfg.cor} strokeWidth="1" strokeDasharray="2 2" opacity="0.6"
                        pointerEvents="none" />
                      <g
                        style={{ cursor: 'pointer' }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirPopoverDistancia({
                            valorInicial: String(Math.round(c.dist)),
                            label: `${cfg.label} — distância ${c.qualLado} (mm)`,
                            cor: cfg.cor,
                            onAplicar: (mm) => aplicarDistanciaRecorte(rec.id, c.qualLado, mm),
                          });
                        }}
                      >
                        <rect
                          x={(c.x1 + c.x2) / 2 - 22}
                          y={(c.y1 + c.y2) / 2 - 8}
                          width="44" height="16"
                          fill="#fff" stroke={cfg.cor} strokeWidth="1" rx="3"
                        />
                        <text
                          x={(c.x1 + c.x2) / 2}
                          y={(c.y1 + c.y2) / 2 + 4}
                          textAnchor="middle"
                          fontSize="10" fontWeight="bold"
                          fill={cfg.cor}
                          fontFamily="Arial, sans-serif"
                          pointerEvents="none"
                        >
                          {Math.round(c.dist)} mm
                        </text>
                      </g>
                    </g>
                  ))}
                </g>
              )}
              <circle
                cx={cx} cy={cy} r={r}
                fill={cfg.cor}
                fillOpacity={selecionado ? 0.18 : 0.10}
                stroke={cfg.cor}
                strokeWidth={sw}
                strokeDasharray="6 4"
                onMouseDown={(e) => iniciarRecorteDrag(e, rec)}
                onDoubleClick={(e) => { e.stopPropagation(); abrirPopoverRecorte({ id: rec.id }); }}
                style={{ cursor: 'move' }}
              />
              {/* Label diâmetro no centro */}
              <g pointerEvents="none">
                <rect
                  x={cx - 22} y={cy - 8}
                  width="44" height="16"
                  fill="#fff" stroke={cfg.cor} strokeWidth="1" rx="3"
                />
                <text
                  x={cx} y={cy + 4}
                  textAnchor="middle"
                  fontSize="10" fontWeight="bold"
                  fill={cfg.cor}
                  fontFamily="Arial, sans-serif"
                >
                  ⌀{rec.raio * 2}
                </text>
              </g>
              {selecionado && (
                <g
                  transform={`translate(${cx + r + 4}, ${cy - r - 4})`}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); excluirRecorte(rec.id); }}
                >
                  <circle cx="0" cy="0" r="9" fill="#fff" stroke="#dc2626" strokeWidth="1.5" />
                  <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#dc2626">×</text>
                </g>
              )}
            </g>
          );
        }
      })}

      {/* Etiqueta "Pé" sobreposta na peça quando ativo */}
      {peca.pes > 0 && (
        <g pointerEvents="none">
          <rect
            x={pecaX + pecaW - 56} y={pecaY + pecaH - 22}
            width="48" height="16"
            fill={RECORTE_TIPOS.pes.cor}
            stroke={RECORTE_TIPOS.pes.cor}
            strokeWidth="1" rx="3"
          />
          <text
            x={pecaX + pecaW - 32} y={pecaY + pecaH - 10}
            textAnchor="middle"
            fontSize="10" fontWeight="bold" fill="#064e3b"
            fontFamily="Arial, sans-serif"
          >
            PÉ
          </text>
        </g>
      )}
    </>
  );
}

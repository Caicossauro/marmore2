import { useRef, useEffect } from 'react';

const CORES_ACABAMENTOS = {
  esquadria: '#ef4444',
  boleado:   '#eab308',
  polimento: '#3b82f6',
  canal:     '#f59e0b',
};

const CORES_RECORTES = {
  cuba:          '#15803d',
  cubaEsculpida: '#9333ea',
  cooktop:       '#475569',
  recorte:       '#15803d',
};

const desenharGrid = (ctx, w, h) => {
  // Fundo cinza médio
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, w, h);

  // Subgrid fino (a cada 10px)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Grid grosso (a cada 50px)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
};

export const PreviewAcabamentos = ({ peca, mostrarSempre = false, mini = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    desenharPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peca]);

  const desenharPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !peca.largura || !peca.altura) return;

    const ctx = canvas.getContext('2d');
    const largura = parseFloat(peca.largura) || 600;
    const altura = parseFloat(peca.altura) || 400;

    const canvasWidth = mini ? 120 : 260;
    const canvasHeight = mini ? 90 : 200;

    const margemTop = mini ? 10 : 28;
    const margemLeft = mini ? 10 : 30;
    const margemRight = mini ? 10 : 12;
    const margemBottom = mini ? 10 : 12;

    const areaW = canvasWidth - margemLeft - margemRight;
    const areaH = canvasHeight - margemTop - margemBottom;

    const escalaX = areaW / largura;
    const escalaY = areaH / altura;
    const escala = Math.min(escalaX, escalaY, mini ? 0.5 : 0.55);

    const w = largura * escala;
    const h = altura * escala;
    const offsetX = margemLeft + (areaW - w) / 2;
    const offsetY = margemTop + (areaH - h) / 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fundo escuro com grid
    desenharGrid(ctx, canvasWidth, canvasHeight);

    // Peça branca com leve sombra
    if (!mini) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offsetX, offsetY, w, h);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Borda da peça
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = mini ? 1 : 2;
    ctx.strokeRect(offsetX, offsetY, w, h);

    // ===== Recortes posicionados (cuba, cooktop, etc) =====
    if (Array.isArray(peca.recortesPosicionados)) {
      const escalaRec = w / largura; // mesma escala da peça (px por mm)
      peca.recortesPosicionados.forEach(rec => {
        const cor = CORES_RECORTES[rec.tipo];
        if (!cor) return;

        ctx.strokeStyle = cor;
        ctx.lineWidth = mini ? 1.5 : 2;
        ctx.setLineDash(mini ? [4, 2] : [6, 3]);
        // Fill semi-transparente
        ctx.fillStyle = cor + '22'; // alpha ~13%

        if (rec.shape === 'retangulo') {
          const rx = offsetX + rec.x * escalaRec;
          const ry = offsetY + rec.y * escalaRec;
          const rw = rec.largura * escalaRec;
          const rh = rec.altura * escalaRec;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
        } else if (rec.shape === 'circulo') {
          const cx = offsetX + rec.x * escalaRec;
          const cy = offsetY + rec.y * escalaRec;
          const r = rec.raio * escalaRec;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);
    }

    // Marcador "PÉ" quando ativo
    if (peca.pes > 0) {
      const badgeW = mini ? 18 : 24;
      const badgeH = mini ? 10 : 14;
      const bx = offsetX + w - badgeW - 2;
      const by = offsetY + h - badgeH - 2;
      ctx.fillStyle = '#86efac';
      ctx.fillRect(bx, by, badgeW, badgeH);
      ctx.fillStyle = '#064e3b';
      ctx.font = `bold ${mini ? 7 : 9}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PÉ', bx + badgeW / 2, by + badgeH / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }

    // ===== Linhas de acabamentos =====
    const offsetCanal = mini ? 3 : 10;
    if (peca.acabamentos) {
      Object.keys(peca.acabamentos).forEach(tipoAcab => {
        const acab = peca.acabamentos[tipoAcab];
        if (!acab.ativo) return;

        const cor = CORES_ACABAMENTOS[tipoAcab];
        if (!cor) return;
        const isCanal = tipoAcab === 'canal';
        const offset = isCanal ? offsetCanal : 0;

        ctx.strokeStyle = cor;
        ctx.lineWidth = mini ? 2 : 4;
        ctx.lineCap = 'round';
        ctx.setLineDash(mini ? [5, 2] : [10, 5]);

        if (acab.lados?.superior) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + offset);
          ctx.lineTo(offsetX + w - offset, offsetY + offset);
          ctx.stroke();
        }
        if (acab.lados?.inferior) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + h - offset);
          ctx.lineTo(offsetX + w - offset, offsetY + h - offset);
          ctx.stroke();
        }
        if (acab.lados?.esquerda) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + offset);
          ctx.lineTo(offsetX + offset, offsetY + h - offset);
          ctx.stroke();
        }
        if (acab.lados?.direita) {
          ctx.beginPath();
          ctx.moveTo(offsetX + w - offset, offsetY + offset);
          ctx.lineTo(offsetX + w - offset, offsetY + h - offset);
          ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
      });
    }

    // ===== Grapas de fixação (quando peça marcada como "Cobrar fixação") =====
    // 1 grapa a cada ~60cm, distribuídas uniformemente na borda superior.
    // Representadas como retângulos cinza escuro.
    if (peca.cobrarFixacao === true && largura > 0) {
      const larguraMetros = largura / 1000;
      const qtdGrapas = Math.ceil(larguraMetros / 0.6);
      if (qtdGrapas > 0) {
        const grapaW = mini ? 6 : 12;
        const grapaH = mini ? 3 : 5;
        for (let i = 1; i <= qtdGrapas; i++) {
          const cx = offsetX + (w * i) / (qtdGrapas + 1);
          const cy = offsetY + (mini ? 5 : 8);
          const rx = cx - grapaW / 2;
          const ry = cy - grapaH / 2;
          // Sombra suave
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(rx + 0.6, ry + 0.6, grapaW, grapaH);
          // Corpo cinza
          ctx.fillStyle = '#475569';
          ctx.fillRect(rx, ry, grapaW, grapaH);
          // Borda escura
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.strokeRect(rx, ry, grapaW, grapaH);
        }
        if (!mini) {
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 9px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`Fixação: ${qtdGrapas} grapas`, offsetX + 2, offsetY + h + 10);
        }
      }
    }

    // Labels de medida (apenas no modo grande)
    if (!mini) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offsetX + w / 2 - 35, offsetY - 22, 70, 16);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + w / 2 - 35, offsetY - 22, 70, 16);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${largura} mm`, offsetX + w / 2, offsetY - 11);

      ctx.save();
      ctx.translate(offsetX - 22, offsetY + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-35, -9, 70, 18);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(-35, -9, 70, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(`${altura} mm`, 0, 3);
      ctx.restore();

      if (peca.nome) {
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const nomeExibir = peca.nome.length > 20 ? peca.nome.substring(0, 20) + '...' : peca.nome;
        const textWidth = ctx.measureText(nomeExibir).width;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.fillRect(offsetX + w / 2 - textWidth / 2 - 6, offsetY + h / 2 - 9, textWidth + 12, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(nomeExibir, offsetX + w / 2, offsetY + h / 2 + 3);
      }
    }
  };

  // Usa mostrarSempre só pra evitar warning de prop não usada (mantém compatibilidade de API)
  void mostrarSempre;

  return (
    <div
      className={`${mini ? 'border border-slate-400 rounded' : 'border-2 border-slate-400 rounded-lg shadow-md'} overflow-hidden`}
      style={{ ...(mini ? {} : { maxWidth: '260px' }), backgroundColor: '#e2e8f0' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full"
        style={mini ? {} : { maxWidth: '260px' }}
      />
      {!mini && peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
        <div className="p-2 bg-slate-100 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-1">Acabamentos:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(peca.acabamentos).map(tipo => {
              const acab = peca.acabamentos[tipo];
              if (!acab.ativo) return null;
              const cor = CORES_ACABAMENTOS[tipo];
              return (
                <div key={tipo} className="flex items-center gap-1">
                  <div className="w-3 h-0.5" style={{ backgroundColor: cor }}></div>
                  <span className="text-xs text-slate-700">{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

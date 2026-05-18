import { useEffect } from 'react';
import { CORES_AMBIENTES } from '../../../constants/colors';

const CANVAS_OFFSET = 50;

function corDaPeca(pecaId, ambienteIdxPorPecaId) {
  const idx = ambienteIdxPorPecaId[pecaId] ?? 0;
  return CORES_AMBIENTES[idx % CORES_AMBIENTES.length];
}

function desenharChapa(canvasRef, { chapa, escala, arrastandoPeca, pecaSelecionada, pecaHover, mouseForaDoCanvas, ambienteIdxPorPecaId, ambienteNomePorPecaId }) {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const largura = chapa.material.comprimento * escala;
  const altura = chapa.material.altura * escala;

  canvas.width = largura + 100;
  canvas.height = altura + 100;

  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(CANVAS_OFFSET, CANVAS_OFFSET, largura, altura);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.strokeRect(CANVAS_OFFSET, CANVAS_OFFSET, largura, altura);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= chapa.material.comprimento; i += 500) {
    const x = CANVAS_OFFSET + i * escala;
    ctx.beginPath();
    ctx.moveTo(x, CANVAS_OFFSET);
    ctx.lineTo(x, CANVAS_OFFSET + altura);
    ctx.stroke();
  }
  for (let i = 0; i <= chapa.material.altura; i += 500) {
    const y = CANVAS_OFFSET + i * escala;
    ctx.beginPath();
    ctx.moveTo(CANVAS_OFFSET, y);
    ctx.lineTo(CANVAS_OFFSET + largura, y);
    ctx.stroke();
  }

  chapa.pecas.forEach((peca, idx) => {
    if (arrastandoPeca?.id === peca.id) return;

    const x = CANVAS_OFFSET + peca.posX * escala;
    const y = CANVAS_OFFSET + peca.posY * escala;
    const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
    const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;

    const cor = corDaPeca(peca.id, ambienteIdxPorPecaId);
    const ehSelecionada = pecaSelecionada === peca.id;

    const r = parseInt(cor.slice(1, 3), 16);
    const g = parseInt(cor.slice(3, 5), 16);
    const b = parseInt(cor.slice(5, 7), 16);

    // Preenchimento: mais escuro se selecionada
    const fatorClareamento = ehSelecionada ? 0.35 : 0.7;
    ctx.fillStyle = `rgb(${r + (255 - r) * fatorClareamento}, ${g + (255 - g) * fatorClareamento}, ${b + (255 - b) * fatorClareamento})`;
    ctx.fillRect(x, y, w, h);

    // Borda: mais espessa se selecionada
    const bw = ehSelecionada ? 3 : 1.5;
    ctx.strokeStyle = cor;
    ctx.lineWidth = bw;
    ctx.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);

    // Número da peça centralizado
    ctx.fillStyle = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${idx + 1}`, x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  });

  // Tooltip no hover — nome + dimensões (+ indicação de rotação) + ambiente
  if (pecaHover) {
    const pecaIdx = chapa.pecas.findIndex((p) => p.id === pecaHover.id);
    if (pecaIdx !== -1) {
      const peca = chapa.pecas[pecaIdx];
      const nomePeca = peca.nome || `Peça #${pecaIdx + 1}`;
      const dimensoes =
        peca.rotacao === 90
          ? `${peca.altura} × ${peca.largura} mm  ↻ 90°`
          : `${peca.largura} × ${peca.altura} mm`;
      const nomeAmbiente = ambienteNomePorPecaId?.[peca.id] || null;

      const tooltipX = pecaHover.mouseX + 15;
      const tooltipY = pecaHover.mouseY - 10;

      ctx.font = 'bold 12px Arial';
      const larguraNome = ctx.measureText(nomePeca).width;
      ctx.font = '11px Arial';
      const larguraDim = ctx.measureText(dimensoes).width;
      ctx.font = 'italic 11px Arial';
      const larguraAmb = nomeAmbiente ? ctx.measureText(nomeAmbiente).width : 0;
      const padding = 8;
      const tooltipWidth = Math.max(larguraNome, larguraDim, larguraAmb) + padding * 2;
      const tooltipHeight = nomeAmbiente ? 56 : 40;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(nomePeca, tooltipX + padding, tooltipY + 16);

      ctx.fillStyle = 'rgba(203, 213, 225, 1)';
      ctx.font = '11px Arial';
      ctx.fillText(dimensoes, tooltipX + padding, tooltipY + 31);

      if (nomeAmbiente) {
        ctx.fillStyle = 'rgba(148, 163, 184, 1)';
        ctx.font = 'italic 11px Arial';
        ctx.fillText(nomeAmbiente, tooltipX + padding, tooltipY + 47);
      }
    }
  }

  // Peça sendo arrastada (fantasma) — esconde se mouse saiu do canvas (arrastando para outra chapa)
  if (arrastandoPeca && !mouseForaDoCanvas) {
    const w =
      (arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura) * escala;
    const h =
      (arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura) * escala;

    const cor = arrastandoPeca.colisao ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.6)';
    const corBorda = arrastandoPeca.colisao ? '#dc2626' : '#1e40af';

    ctx.fillStyle = cor;
    ctx.fillRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
    ctx.strokeStyle = corBorda;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
    ctx.setLineDash([]);

    if (arrastandoPeca.colisao) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('COLISÃO!', arrastandoPeca.x + w / 2, arrastandoPeca.y + h / 2);
    }
  }

  // Dimensões da chapa
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${chapa.material.comprimento} mm`, CANVAS_OFFSET + largura / 2, 35);
  ctx.save();
  ctx.translate(35, CANVAS_OFFSET + altura / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${chapa.material.altura} mm`, 0, 0);
  ctx.restore();
}

export function useChapaCanvas(canvasRef, { chapa, escala, ambienteIdxPorPecaId, ambienteNomePorPecaId, arrastandoPeca, pecaSelecionada, pecaHover, mouseForaDoCanvas, expandido }) {
  useEffect(() => {
    if (!expandido) return;
    desenharChapa(canvasRef, { chapa, escala, arrastandoPeca, pecaSelecionada, pecaHover, mouseForaDoCanvas, ambienteIdxPorPecaId, ambienteNomePorPecaId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapa, escala, arrastandoPeca, pecaSelecionada, pecaHover, ambienteIdxPorPecaId, ambienteNomePorPecaId, mouseForaDoCanvas, expandido]);

  const pecaNaPosicao = (x, y) => {
    return chapa.pecas.find((peca) => {
      const px = CANVAS_OFFSET + peca.posX * escala;
      const py = CANVAS_OFFSET + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });
  };

  return { pecaNaPosicao };
}

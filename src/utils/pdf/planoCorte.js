/**
 * Gera PDF do Plano de Corte (uma página por chapa) — A4 paisagem.
 * Mantém lazy-load do jsPDF via CDN para preservar compatibilidade com artifacts.
 */
export const imprimirPlanoCortePDF = async (orcamentoAtual) => {
  if (!window.jspdf) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => { gerarPlanoCortePDF(orcamentoAtual); resolve(); };
      script.onerror = () => { alert('❌ Erro ao carregar biblioteca PDF.'); resolve(); };
      document.head.appendChild(script);
    });
  }
  gerarPlanoCortePDF(orcamentoAtual);
};

export const gerarPlanoCortePDF = (orcamentoAtual) => {
  const { jsPDF } = window.jspdf;
  if (!orcamentoAtual || !orcamentoAtual.chapas || orcamentoAtual.chapas.length === 0) {
    alert('⚠️ Nenhuma chapa no plano de corte.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;
  const margin = 8;

  orcamentoAtual.chapas.forEach((chapa, idx) => {
    if (idx > 0) pdf.addPage();

    const headerY = 8;
    const headerHeight = 20;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.rect(margin, headerY, pageW - 2 * margin, headerHeight, 'S');

    pdf.line(margin, headerY + headerHeight / 2, pageW - margin, headerY + headerHeight / 2);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PLANO DE CORTE - PIETRA AMBIENTES PLANEJADOS', margin + 2, headerY + 7);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROJETO: ' + (orcamentoAtual.nome || 'NOME DO ORÇAMENTO').toUpperCase(), margin + 2, headerY + 17);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('CHAPA ' + (idx + 1) + ' / ' + orcamentoAtual.chapas.length, pageW - margin - 2, headerY + 7, { align: 'right' });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text((chapa.material?.nome || 'Material').toUpperCase(), pageW - margin - 2, headerY + 17, { align: 'right' });

    const legendaW = 55;
    const areaTop = headerY + headerHeight + 8;
    const areaLeft = margin + legendaW + 12;
    const areaRight = pageW - margin;
    const areaBottom = pageH - 14;
    const areaW = areaRight - areaLeft;
    const areaH = areaBottom - areaTop;

    const chapaW = chapa.material?.comprimento || 3000;
    const chapaH = chapa.material?.altura || 2000;
    const escalaX = areaW / chapaW;
    const escalaY = areaH / chapaH;
    const escala = Math.min(escalaX, escalaY) * 0.92;

    const desenhoW = chapaW * escala;
    const desenhoH = chapaH * escala;
    const desenhoX = areaLeft + (areaW - desenhoW) / 2;
    const desenhoY = areaTop + (areaH - desenhoH) / 2;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);

    const cotaTopY = desenhoY - 7;
    pdf.line(desenhoX, cotaTopY, desenhoX + desenhoW, cotaTopY);
    pdf.line(desenhoX, cotaTopY, desenhoX + 3, cotaTopY - 1.5);
    pdf.line(desenhoX, cotaTopY, desenhoX + 3, cotaTopY + 1.5);
    pdf.line(desenhoX + desenhoW, cotaTopY, desenhoX + desenhoW - 3, cotaTopY - 1.5);
    pdf.line(desenhoX + desenhoW, cotaTopY, desenhoX + desenhoW - 3, cotaTopY + 1.5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(chapaW + ' mm', desenhoX + desenhoW / 2, cotaTopY - 1.5, { align: 'center' });

    const cotaLeftX = desenhoX - 7;
    pdf.line(cotaLeftX, desenhoY, cotaLeftX, desenhoY + desenhoH);
    pdf.line(cotaLeftX, desenhoY, cotaLeftX - 1.5, desenhoY + 3);
    pdf.line(cotaLeftX, desenhoY, cotaLeftX + 1.5, desenhoY + 3);
    pdf.line(cotaLeftX, desenhoY + desenhoH, cotaLeftX - 1.5, desenhoY + desenhoH - 3);
    pdf.line(cotaLeftX, desenhoY + desenhoH, cotaLeftX + 1.5, desenhoY + desenhoH - 3);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(chapaH + ' mm', cotaLeftX - 2, desenhoY + desenhoH / 2, { angle: 90, align: 'center' });

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.rect(desenhoX, desenhoY, desenhoW, desenhoH, 'FD');

    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    const gridSpacing = 500 * escala;
    for (let i = gridSpacing; i < desenhoW; i += gridSpacing) {
      pdf.line(desenhoX + i, desenhoY, desenhoX + i, desenhoY + desenhoH);
    }
    for (let i = gridSpacing; i < desenhoH; i += gridSpacing) {
      pdf.line(desenhoX, desenhoY + i, desenhoX + desenhoW, desenhoY + i);
    }

    const legendaItens = [];
    const bordaW = 0.8;
    const inset = bordaW / 2;

    chapa.pecas.forEach((peca, pIdx) => {
      const px = desenhoX + peca.posX * escala;
      const py = desenhoY + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(px, py, pw, ph, 'F');

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(bordaW);
      pdf.rect(px + inset, py + inset, pw - bordaW, ph - bordaW, 'D');

      if (pw > 3 && ph > 3) {
        pdf.setTextColor(0, 0, 0);

        pdf.setFontSize(Math.min(16, pw * 0.55, ph * 0.45));
        pdf.setFont('helvetica', 'bold');
        const numeroY = ph > 10 ? py + ph / 2 - 1 : py + ph / 2 + 1;
        pdf.text(String(pIdx + 1), px + pw / 2, numeroY, { align: 'center' });

        if (ph > 10) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.largura;
          const pecaAltExib = peca.rotacao === 90 ? peca.largura : peca.altura;
          const dimText = pecaCompExib + 'x' + pecaAltExib;
          pdf.text(dimText, px + pw / 2, py + ph / 2 + 4, { align: 'center' });
        }
      }

      const nome = peca.nome || ('Peça ' + (pIdx + 1));
      const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.largura;
      const pecaAltExib = peca.rotacao === 90 ? peca.largura : peca.altura;
      legendaItens.push({ numero: pIdx + 1, nome, dim: pecaCompExib + 'x' + pecaAltExib, rotado: peca.rotacao === 90 });
    });

    pdf.setDrawColor(160, 160, 160);
    pdf.setLineWidth(0.15);
    const espacamentoHachura = 2.5;

    const pontoEmPeca = (x, y) => {
      for (const peca of chapa.pecas) {
        const px = desenhoX + peca.posX * escala;
        const py = desenhoY + peca.posY * escala;
        const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
        const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
        if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
          return true;
        }
      }
      return false;
    };

    const step = 1;
    for (let offset = -desenhoH; offset < desenhoW + desenhoH; offset += espacamentoHachura) {
      let segmentos = [];

      for (let t = 0; t < desenhoW + desenhoH; t += step) {
        const x = desenhoX + offset + t;
        const y = desenhoY + t;

        if (x >= desenhoX && x <= desenhoX + desenhoW && y >= desenhoY && y <= desenhoY + desenhoH) {
          const emPeca = pontoEmPeca(x, y);

          if (!emPeca) {
            if (segmentos.length === 0 || segmentos[segmentos.length - 1].fim) {
              segmentos.push({ x1: x, y1: y, x2: x, y2: y, fim: false });
            } else {
              segmentos[segmentos.length - 1].x2 = x;
              segmentos[segmentos.length - 1].y2 = y;
            }
          } else {
            if (segmentos.length > 0) {
              segmentos[segmentos.length - 1].fim = true;
            }
          }
        }
      }

      for (const seg of segmentos) {
        if (Math.abs(seg.x2 - seg.x1) > 1 || Math.abs(seg.y2 - seg.y1) > 1) {
          pdf.line(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }
    }

    const legendaX = margin;
    let legendaY = areaTop;

    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.setLineWidth(0.8);
    pdf.rect(legendaX, legendaY, legendaW, 8, 'FD');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEGENDA', legendaX + legendaW / 2, legendaY + 6, { align: 'center' });
    legendaY += 8;

    legendaItens.forEach((item, i) => {
      if (legendaY + 5.5 > areaBottom - 10) return;

      if (i > 0) {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(legendaX, legendaY, legendaX + legendaW, legendaY);
      }

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');

      let nomeExib = item.nome;
      if (nomeExib.length > 15) nomeExib = nomeExib.substring(0, 14) + '...';

      const textoCompleto = item.numero + ' - ' + nomeExib + ' ' + item.dim;
      pdf.text(textoCompleto, legendaX + 2, legendaY + 4);

      legendaY += 6;
    });

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    const legendaAltura = (legendaItens.length * 6) + 8;
    pdf.rect(legendaX, areaTop, legendaW, Math.min(legendaAltura, areaBottom - areaTop - 10), 'S');

    const rodapeY = pageH - 10;
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Gerado pelo Sistema Pietra  |  ' + new Date().toLocaleDateString('pt-BR'), pageW / 2, rodapeY, { align: 'center' });
  });

  const nome = orcamentoAtual.nome.replace(/[^a-z0-9]/gi, '_');
  pdf.save('PlanoCorte_' + nome + '_' + new Date().toISOString().split('T')[0] + '.pdf');
  alert('✅ PDF do Plano de Corte gerado!\n' + orcamentoAtual.chapas.length + ' chapa(s)');
};

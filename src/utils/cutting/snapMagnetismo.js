/**
 * Calcula a posição com snap magnético para a peça sendo arrastada.
 *
 * Usa dois pools de candidatos por eixo:
 *  - espaçamentoSnap: snap para borda da chapa ou gap mínimo entre peças (maior prioridade)
 *  - alinhamentoSnap: alinhamento de borda entre peças não sobrepostas
 *
 * A fase 2 re-executa snaps de X se um snap de Y moveu a peça para dentro de uma zona
 * de sobreposição vertical que não existia antes (evita o problema "o último vence").
 */
export function calcularSnap({
  origX,
  origY,
  peca,
  outrasPecas,
  chapa,
  espessuraDisco,
  margemLaterais,
  tolerancia = 40,
}) {
  const espacamento = espessuraDisco;
  const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.largura;
  const alturaPeca  = peca.rotacao === 90 ? peca.largura : peca.altura;

  let novaX = origX;
  let novaY = origY;

  let xEspacamentoSnap = null;
  let yEspacamentoSnap = null;
  let xAlinhamentoSnap = null;
  let yAlinhamentoSnap = null;

  // Snaps de borda da chapa (entram no pool de espaçamento por ter prioridade)
  const dBordaEsq = Math.abs(origX - margemLaterais);
  if (dBordaEsq < tolerancia) {
    xEspacamentoSnap = { target: margemLaterais, dist: dBordaEsq };
  }
  const dBordaDir = Math.abs(origX + larguraPeca + margemLaterais - chapa.material.comprimento);
  if (dBordaDir < tolerancia) {
    const targetDir = chapa.material.comprimento - larguraPeca - margemLaterais;
    if (!xEspacamentoSnap || dBordaDir < xEspacamentoSnap.dist) {
      xEspacamentoSnap = { target: targetDir, dist: dBordaDir };
    }
  }
  const dBordaTopo = Math.abs(origY - margemLaterais);
  if (dBordaTopo < tolerancia) {
    yEspacamentoSnap = { target: margemLaterais, dist: dBordaTopo };
  }
  const dBordaInf = Math.abs(origY + alturaPeca + margemLaterais - chapa.material.altura);
  if (dBordaInf < tolerancia) {
    const targetInf = chapa.material.altura - alturaPeca - margemLaterais;
    if (!yEspacamentoSnap || dBordaInf < yEspacamentoSnap.dist) {
      yEspacamentoSnap = { target: targetInf, dist: dBordaInf };
    }
  }

  outrasPecas.forEach((p) => {
    if (p.id === peca.id) return;

    const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
    const alturaOutra  = p.rotacao === 90 ? p.largura : p.altura;

    // Checks de sobreposição sempre com posições ORIGINAIS (sem modificar novaX/novaY ainda)
    const sobrepoeV = !(origY + alturaPeca < p.posY - tolerancia ||
                        origY > p.posY + alturaOutra + tolerancia);
    const sobrepoeH = !(origX + larguraPeca < p.posX - tolerancia ||
                        origX > p.posX + larguraOutra + tolerancia);

    if (sobrepoeV) {
      const dDir = Math.abs(origX - (p.posX + larguraOutra + espacamento));
      if (dDir < tolerancia && (!xEspacamentoSnap || dDir < xEspacamentoSnap.dist)) {
        xEspacamentoSnap = { target: p.posX + larguraOutra + espacamento, dist: dDir };
      }
      const dEsq = Math.abs(origX + larguraPeca + espacamento - p.posX);
      if (dEsq < tolerancia && (!xEspacamentoSnap || dEsq < xEspacamentoSnap.dist)) {
        xEspacamentoSnap = { target: p.posX - larguraPeca - espacamento, dist: dEsq };
      }
    }

    if (sobrepoeH) {
      const dBaixo = Math.abs(origY - (p.posY + alturaOutra + espacamento));
      if (dBaixo < tolerancia && (!yEspacamentoSnap || dBaixo < yEspacamentoSnap.dist)) {
        yEspacamentoSnap = { target: p.posY + alturaOutra + espacamento, dist: dBaixo };
      }
      const dCima = Math.abs(origY + alturaPeca + espacamento - p.posY);
      if (dCima < tolerancia && (!yEspacamentoSnap || dCima < yEspacamentoSnap.dist)) {
        yEspacamentoSnap = { target: p.posY - alturaPeca - espacamento, dist: dCima };
      }
    }

    // Alinhamentos de borda em Y (topo com topo, base com base).
    // Funciona INDEPENDENTE de sobreposição em X — permite encaixar peças no
    // "canto" de outra (cenário onde a peça está colada lateralmente e seu topo
    // alinha com o topo da vizinha, por exemplo).
    {
      const dTopo = Math.abs(origY - p.posY);
      if (dTopo < tolerancia && (!yAlinhamentoSnap || dTopo < yAlinhamentoSnap.dist)) {
        yAlinhamentoSnap = { target: p.posY, dist: dTopo };
      }
      const dBase = Math.abs(origY + alturaPeca - (p.posY + alturaOutra));
      if (dBase < tolerancia && (!yAlinhamentoSnap || dBase < yAlinhamentoSnap.dist)) {
        yAlinhamentoSnap = { target: p.posY + alturaOutra - alturaPeca, dist: dBase };
      }
    }

    // Alinhamentos de borda em X (esquerda com esquerda, direita com direita).
    // Mesma lógica do Y: independente de sobreposição em Y.
    {
      const dEsqBorda = Math.abs(origX - p.posX);
      if (dEsqBorda < tolerancia && (!xAlinhamentoSnap || dEsqBorda < xAlinhamentoSnap.dist)) {
        xAlinhamentoSnap = { target: p.posX, dist: dEsqBorda };
      }
      const dDirBorda = Math.abs(origX + larguraPeca - (p.posX + larguraOutra));
      if (dDirBorda < tolerancia && (!xAlinhamentoSnap || dDirBorda < xAlinhamentoSnap.dist)) {
        xAlinhamentoSnap = { target: p.posX + larguraOutra - larguraPeca, dist: dDirBorda };
      }
    }
  });

  // Aplica: espaçamento tem prioridade sobre alinhamento de borda
  if (xEspacamentoSnap) novaX = xEspacamentoSnap.target;
  else if (xAlinhamentoSnap) novaX = xAlinhamentoSnap.target;

  if (yEspacamentoSnap) novaY = yEspacamentoSnap.target;
  else if (yAlinhamentoSnap) novaY = yAlinhamentoSnap.target;

  // Fase 2: se o snap de Y moveu a peça para dentro da zona de sobreposição vertical
  // mas não havia snap de X na fase 1 (porque origY estava fora da zona), tenta de novo.
  if (yEspacamentoSnap && !xEspacamentoSnap) {
    outrasPecas.forEach((p) => {
      if (p.id === peca.id) return;
      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra  = p.rotacao === 90 ? p.largura : p.altura;

      const sobrepoeVOrig = !(origY + alturaPeca < p.posY - tolerancia ||
                              origY > p.posY + alturaOutra + tolerancia);
      const sobrepoeVNovo = !(novaY + alturaPeca < p.posY - tolerancia ||
                              novaY > p.posY + alturaOutra + tolerancia);

      if (!sobrepoeVOrig && sobrepoeVNovo) {
        const dDir = Math.abs(novaX - (p.posX + larguraOutra + espacamento));
        if (dDir < tolerancia && (!xEspacamentoSnap || dDir < xEspacamentoSnap.dist)) {
          xEspacamentoSnap = { target: p.posX + larguraOutra + espacamento, dist: dDir };
          novaX = xEspacamentoSnap.target;
        }
        const dEsq = Math.abs(novaX + larguraPeca + espacamento - p.posX);
        if (dEsq < tolerancia && (!xEspacamentoSnap || dEsq < xEspacamentoSnap.dist)) {
          xEspacamentoSnap = { target: p.posX - larguraPeca - espacamento, dist: dEsq };
          novaX = xEspacamentoSnap.target;
        }
      }
    });
  }

  return { novaX, novaY };
}

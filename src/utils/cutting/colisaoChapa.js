// Number() defensivo: peças podem chegar do form com altura/largura como string
// (inputs HTML retornam string). Sem isso, operações como `posX + largura` viram
// concatenação ("100" + "500" = "100500") e a peça falsamente "não cabe".
export function temColisao({ peca, outras, espacamento, novaX, novaY }) {
  const larguraPeca = Number(peca.rotacao === 90 ? peca.altura : peca.largura);
  const alturaPeca  = Number(peca.rotacao === 90 ? peca.largura : peca.altura);

  return outras.some((p) => {
    if (p.id === peca.id) return false;
    const larguraOutra = Number(p.rotacao === 90 ? p.altura : p.largura);
    const alturaOutra  = Number(p.rotacao === 90 ? p.largura : p.altura);

    // AABB inflado pelo espaçamento
    const aMinX = p.posX - espacamento;
    const aMaxX = p.posX + larguraOutra + espacamento;
    const aMinY = p.posY - espacamento;
    const aMaxY = p.posY + alturaOutra + espacamento;

    return (
      novaX < aMaxX &&
      novaX + larguraPeca > aMinX &&
      novaY < aMaxY &&
      novaY + alturaPeca > aMinY
    );
  });
}

export function foraDosLimites({ peca, chapa, margemLaterais, novaX, novaY }) {
  const larguraPeca = Number(peca.rotacao === 90 ? peca.altura : peca.largura);
  const alturaPeca  = Number(peca.rotacao === 90 ? peca.largura : peca.altura);
  const comprimentoChapa = Number(chapa.material.comprimento);
  const alturaChapa      = Number(chapa.material.altura);

  return (
    novaX + larguraPeca + margemLaterais > comprimentoChapa ||
    novaY + alturaPeca  + margemLaterais > alturaChapa      ||
    novaX < margemLaterais ||
    novaY < margemLaterais
  );
}

/**
 * Hidrata uma peça para o modal de edição adicionando estruturas padrão.
 * Retorna o objeto hidratado sem chamar nenhum setter.
 */
export function hidratarPecaParaEdicao(peca) {
  const copia = JSON.parse(JSON.stringify(peca));

  if (!copia.acabamentos) {
    copia.acabamentos = {
      polimento:  { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      esquadria:  { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      boleado:    { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      canal:      { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
    };
  }
  copia.cuba          = copia.cuba          || 0;
  copia.cubaEsculpida = copia.cubaEsculpida || 0;
  copia.cooktop       = copia.cooktop       || 0;
  copia.recorte       = copia.recorte       || 0;
  copia.pes           = copia.pes           || 0;

  if (!copia.acabamentosPersonalizados) {
    const largura = copia.rotacao === 90 ? copia.altura : copia.largura;
    const altura  = copia.rotacao === 90 ? copia.largura : copia.altura;

    copia.acabamentosPersonalizados = {};
    ['esquadria', 'boleado', 'polimento', 'canal'].forEach((tipo) => {
      if (copia.acabamentos[tipo]?.ativo) {
        let totalMm = 0;
        const lados = copia.acabamentos[tipo].lados;
        if (lados.superior) totalMm += largura;
        if (lados.inferior) totalMm += largura;
        if (lados.esquerda) totalMm += altura;
        if (lados.direita)  totalMm += altura;
        copia.acabamentosPersonalizados[tipo] = (totalMm / 1000).toFixed(2);
      } else {
        copia.acabamentosPersonalizados[tipo] = '';
      }
    });
  }

  return copia;
}

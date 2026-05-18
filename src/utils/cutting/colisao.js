// Verifica se uma peça cabe em sua posição atual (posX/posY) na chapa,
// respeitando margens da chapa e espaçamento entre peças.
// Usada em edição: se mudou tamanho mas a posição ainda comporta a peça nova,
// preserva a posição. Caso contrário, retorna false (peça vai pra avulsas).
export function cabeNaPosicaoAtual(peca, chapa, materialConfig, espacamento, margem) {
  if (!chapa || peca.posX == null || peca.posY == null) return false;

  // Number() defensivo: inputs do form podem chegar como string.
  const larguraPeca = Number(peca.rotacao === 90 ? peca.altura : peca.largura);
  const alturaPeca  = Number(peca.rotacao === 90 ? peca.largura : peca.altura);
  const comprimentoChapa = Number(materialConfig.comprimento);
  const alturaChapa      = Number(materialConfig.altura);

  if (peca.posX < margem || peca.posY < margem) return false;
  if (peca.posX + larguraPeca + margem > comprimentoChapa) return false;
  if (peca.posY + alturaPeca + margem > alturaChapa) return false;

  return !chapa.pecas.some(outra => {
    if (outra.id === peca.id) return false;
    const lOutra = Number(outra.rotacao === 90 ? outra.altura : outra.largura);
    const aOutra = Number(outra.rotacao === 90 ? outra.largura : outra.altura);
    const aMinX = outra.posX - espacamento;
    const aMaxX = outra.posX + lOutra + espacamento;
    const aMinY = outra.posY - espacamento;
    const aMaxY = outra.posY + aOutra + espacamento;
    return (
      peca.posX < aMaxX &&
      peca.posX + larguraPeca > aMinX &&
      peca.posY < aMaxY &&
      peca.posY + alturaPeca > aMinY
    );
  });
}

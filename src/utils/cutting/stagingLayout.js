/**
 * Layout das peças avulsas dentro da staging area do SVG agregado.
 *
 * Algoritmo: bin-packing simples por linhas, peças ordenadas por área decrescente.
 * Cada linha tem altura = maior peça da linha. Peças quebram pra linha nova quando
 * excedem a largura disponível (`larguraMaxMm`).
 *
 * Funções puras — recebem peças, devolvem `outsideX/Y` em mm.
 */

const GAP_PADRAO = 100; // mm entre peças na staging
const LARGURA_PADRAO = 3000; // mm (1 chapa padrão)

/**
 * Largura da staging area no SVG agregado (mm).
 * Usada como `larguraMaxMm` em layoutStaging para que peças quebrem linha
 * dentro do retângulo visual da staging.
 */
export const STAGING_LARGURA_MM = 2500;

function dimensoes(peca) {
  return {
    largura: peca.rotacao === 90 ? peca.altura : peca.largura,
    altura: peca.rotacao === 90 ? peca.largura : peca.altura,
  };
}

/**
 * Calcula `outsideX/Y` em mm para um array de peças.
 *
 * @param {Array} pecas - lista de peças avulsas (com `largura`, `altura`, `rotacao` opcional)
 * @param {object} opts
 *   @param {number} opts.larguraMaxMm - largura disponível antes de quebrar linha (default: 3000)
 *   @param {number} opts.gap - espaço entre peças em mm (default: 100)
 * @returns {Array} mesma lista, cada peça com `outsideX, outsideY` calculados
 */
export function layoutStaging(pecas, { larguraMaxMm = LARGURA_PADRAO, gap = GAP_PADRAO } = {}) {
  if (!pecas || pecas.length === 0) return [];

  const ordenadas = [...pecas].sort((a, b) => {
    const da = dimensoes(a);
    const db = dimensoes(b);
    return (db.largura * db.altura) - (da.largura * da.altura);
  });

  let x = 0;
  let y = 0;
  let alturaLinha = 0;

  return ordenadas.map((peca) => {
    const { largura, altura } = dimensoes(peca);
    if (x > 0 && x + largura > larguraMaxMm) {
      x = 0;
      y += alturaLinha + gap;
      alturaLinha = 0;
    }
    const outsideX = x;
    const outsideY = y;
    x += largura + gap;
    if (altura > alturaLinha) alturaLinha = altura;
    return { ...peca, outsideX, outsideY };
  });
}

/**
 * Bounding box ocupado pelas peças na staging.
 * Útil pra calcular o viewBox total do SVG (chapas + staging).
 */
export function bboxStaging(pecasComOutside, { gap = GAP_PADRAO } = {}) {
  if (!pecasComOutside || pecasComOutside.length === 0) {
    return { w: 0, h: 0 };
  }
  let maxX = 0;
  let maxY = 0;
  for (const peca of pecasComOutside) {
    if (peca.outsideX == null || peca.outsideY == null) continue;
    const { largura, altura } = dimensoes(peca);
    if (peca.outsideX + largura > maxX) maxX = peca.outsideX + largura;
    if (peca.outsideY + altura > maxY) maxY = peca.outsideY + altura;
  }
  return { w: maxX, h: maxY + gap };
}

/**
 * Aplica layoutStaging APENAS em peças que não têm outsideX/Y ainda.
 * Preserva posições já existentes (migração suave).
 */
export function layoutStagingMigracao(pecas, opts) {
  const semLayout = pecas.filter(p => p.outsideX == null || p.outsideY == null);
  const comLayout = pecas.filter(p => p.outsideX != null && p.outsideY != null);

  if (semLayout.length === 0) return pecas;

  // Calcula o "topo" do espaço livre (abaixo das peças com layout existente).
  const bbox = bboxStaging(comLayout, opts);
  const yInicial = bbox.h;

  const novas = layoutStaging(semLayout, opts).map(p => ({
    ...p,
    outsideY: p.outsideY + yInicial,
  }));

  // Mantém ordem original
  const novasMap = new Map(novas.map(p => [p.id, p]));
  return pecas.map(p => novasMap.get(p.id) || p);
}

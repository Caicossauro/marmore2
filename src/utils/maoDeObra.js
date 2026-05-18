/**
 * Cálculos puros de mão de obra.
 *
 * Há TRÊS modalidades:
 *  - Fixação (por peça): para peças que serão fixadas na parede com grapas (ex.: lavatório).
 *    Cobra: largura × R$/m + grapas (1 a cada 60cm) + p.u. (1 a cada 2 grapas).
 *  - Colagem (por peça): para peças grandes que serão coladas na parede (ex.: frontão).
 *    Cobra: área da peça (m²) × R$/m² (mesma tabela de montagem).
 *  - Montagem (por ambiente): para ambientes complexos (ilha, nicho).
 *    Cobra: área total das peças × R$/m².
 */

const zeradoFixacao = () => ({
  larguraM: 0,
  qtdGrapas: 0,
  qtdPus: 0,
  valorMao: 0,
  valorGrapas: 0,
  valorPus: 0,
  total: 0,
});

/**
 * Calcula a mão de obra de fixação de uma peça (lavatório, bancada, etc.).
 *
 * Regras:
 *  - Largura considera a rotação da peça (se rotacao=90, usa altura como largura).
 *  - Grapas: Math.ceil(larguraM / 0.6). Ex.: 2,7m → 5 grapas (não arredonda pra baixo).
 *  - P.U.: Math.ceil(grapas / 2). Ex.: 5 grapas → 3 PUs (não arredonda pra baixo).
 *
 * @param {object} peca - { largura (mm), altura (mm), rotacao?, cobrarFixacao? }
 * @param {object} precos - { maoDeObraFixacaoPorMetro, maoDeObraValorGrapa, maoDeObraValorPU }
 */
export function calcularFixacaoPeca(peca, precos) {
  if (!peca || peca.cobrarFixacao !== true) return zeradoFixacao();

  // Largura efetiva considerando rotação (se rotacao=90, usa altura).
  const larguraMm = Number(peca.rotacao === 90 ? peca.altura : peca.largura) || 0;
  if (larguraMm <= 0) return zeradoFixacao();

  const larguraM = larguraMm / 1000;
  const precoMetro = Number(precos?.maoDeObraFixacaoPorMetro) || 0;
  const precoGrapa = Number(precos?.maoDeObraValorGrapa) || 0;
  const precoPU = Number(precos?.maoDeObraValorPU) || 0;

  const qtdGrapas = Math.ceil(larguraM / 0.6);
  const qtdPus = Math.ceil(qtdGrapas / 2);

  const valorMao = larguraM * precoMetro;
  const valorGrapas = qtdGrapas * precoGrapa;
  const valorPus = qtdPus * precoPU;

  return {
    larguraM,
    qtdGrapas,
    qtdPus,
    valorMao,
    valorGrapas,
    valorPus,
    total: valorMao + valorGrapas + valorPus,
  };
}

/**
 * Calcula a mão de obra de colagem de uma peça grande (ex.: frontão colado na parede).
 *
 * Regras:
 *  - Considera rotação (largura/altura efetivas).
 *  - Área = largura × altura (m²).
 *  - Total = área × preço por m² (mesma tabela de montagem).
 *
 * @param {object} peca - { largura (mm), altura (mm), rotacao?, cobrarColagem? }
 * @param {object} precos - { maoDeObraMontagemPorM2 }
 */
export function calcularColagemPeca(peca, precos) {
  if (!peca || peca.cobrarColagem !== true) {
    return { areaM2: 0, total: 0 };
  }

  const largura = Number(peca.rotacao === 90 ? peca.altura : peca.largura) || 0;
  const altura  = Number(peca.rotacao === 90 ? peca.largura : peca.altura) || 0;
  const areaM2 = (largura * altura) / 1_000_000;
  const precoM2 = Number(precos?.maoDeObraMontagemPorM2) || 0;

  return {
    areaM2,
    total: areaM2 * precoM2,
  };
}

/**
 * Calcula a mão de obra de montagem de um ambiente (ilha, nicho).
 *
 * Soma a área (m²) de todas as peças do ambiente e multiplica pelo preço por m².
 * Considera rotação. Não considera quantidade.
 *
 * @param {object} ambiente - { pecas: [...], cobrarMontagem? }
 * @param {object} precos - { maoDeObraMontagemPorM2 }
 */
export function calcularMontagemAmbiente(ambiente, precos) {
  if (!ambiente || ambiente.cobrarMontagem !== true) {
    return { areaM2: 0, total: 0 };
  }

  const precoM2 = Number(precos?.maoDeObraMontagemPorM2) || 0;
  const areaM2 = (ambiente.pecas || []).reduce((acc, peca) => {
    const largura = Number(peca.rotacao === 90 ? peca.altura : peca.largura) || 0;
    const altura  = Number(peca.rotacao === 90 ? peca.largura : peca.altura) || 0;
    const qtd = Number(peca.quantidade) || 1;
    return acc + ((largura * altura) / 1_000_000) * qtd;
  }, 0);

  return {
    areaM2,
    total: areaM2 * precoM2,
  };
}

/**
 * Soma a mão de obra de todas as peças e ambientes de um orçamento.
 *
 * As três modalidades são INDEPENDENTES:
 *  - Fixação é cobrada quando a peça tem `cobrarFixacao = true` E o ambiente
 *    não tem `cobrarFixacao = false` (master switch por ambiente, default ON).
 *  - Colagem é cobrada quando a peça tem `cobrarColagem = true` E o ambiente
 *    não tem `cobrarColagem = false` (master switch por ambiente, default ON).
 *  - Montagem é cobrada quando o ambiente tem `cobrarMontagem = true`.
 *
 * Uma não interfere na outra.
 */
export function calcularMaoDeObraOrcamento(orcamento, precos) {
  if (!orcamento?.ambientes) {
    return { fixacao: 0, colagem: 0, montagem: 0, total: 0, detalhesPorAmbiente: {} };
  }

  let fixacao = 0;
  let colagem = 0;
  let montagem = 0;
  const detalhesPorAmbiente = {};

  orcamento.ambientes.forEach(amb => {
    // Master switches por ambiente — default true para retrocompat (orçamentos
    // antigos não têm esses flags e devem continuar cobrando normalmente).
    const cobrarFixacaoAmb = amb.cobrarFixacao !== false;
    const cobrarColagemAmb = amb.cobrarColagem !== false;

    const fixacaoAmb = cobrarFixacaoAmb
      ? (amb.pecas || []).reduce((acc, peca) => {
          const calc = calcularFixacaoPeca(peca, precos);
          return acc + calc.total * (Number(peca.quantidade) || 1);
        }, 0)
      : 0;
    const colagemAmb = cobrarColagemAmb
      ? (amb.pecas || []).reduce((acc, peca) => {
          const calc = calcularColagemPeca(peca, precos);
          return acc + calc.total * (Number(peca.quantidade) || 1);
        }, 0)
      : 0;
    const montagemAmb = calcularMontagemAmbiente(amb, precos);

    fixacao += fixacaoAmb;
    colagem += colagemAmb;
    montagem += montagemAmb.total;

    detalhesPorAmbiente[amb.id] = {
      fixacao: fixacaoAmb,
      colagem: colagemAmb,
      montagem: montagemAmb.total,
      areaMontagem: montagemAmb.areaM2,
      total: fixacaoAmb + colagemAmb + montagemAmb.total,
    };
  });

  return {
    fixacao,
    colagem,
    montagem,
    total: fixacao + colagem + montagem,
    detalhesPorAmbiente,
  };
}

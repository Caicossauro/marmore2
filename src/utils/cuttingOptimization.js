import { bboxGrupo } from './cutting/linkPecas';

const MATERIAL_CONFIG_PADRAO = {
  comprimento: 3000,
  altura: 2000,
  custo: 300,
  venda: 900
};

/**
 * Posição original da peça (em coords de chapa ou staging) — usada pra calcular
 * o arranjo relativo de um grupo linkado antes da limpeza de posições.
 */
function posOriginalDe(peca) {
  if (peca.chapaId != null && peca.posX != null) {
    return { x: peca.posX, y: peca.posY };
  }
  return { x: peca.outsideX || 0, y: peca.outsideY || 0 };
}

/**
 * Constrói "unidades de empacotamento" a partir das peças:
 *  - Peças com `linkId`: agrupadas como SUPER PEÇA com bbox combinado + offsets relativos
 *  - Peças individuais: ficam como unidades singletônicas
 *
 * As posições originais são lidas ANTES da limpeza pra calcular os offsets de cada
 * peça relativos ao top-left do bbox do grupo. Após o posicionamento da super peça
 * em uma chapa, cada peça do grupo recebe `posX = posSuper.x + offsetX` (idem Y),
 * preservando exatamente o arranjo manual feito pelo usuário (paginação com veio).
 *
 * Cada unidade tem: `{ tipo, materialId, largura, altura, rotacao, ... }`
 *  - tipo='peca': `{ peca }`
 *  - tipo='grupo': `{ linkId, offsets: [{ peca, dx, dy }], originalBbox: {x,y,w,h} }`
 */
function construirUnidades(pecas) {
  const porLinkId = new Map();
  const individuais = [];
  for (const p of pecas) {
    if (p.linkId) {
      if (!porLinkId.has(p.linkId)) porLinkId.set(p.linkId, []);
      porLinkId.get(p.linkId).push(p);
    } else {
      individuais.push(p);
    }
  }

  const unidades = individuais.map(p => ({
    tipo: 'peca',
    peca: p,
    materialId: p.materialId,
    largura: p.largura,
    altura: p.altura,
    rotacao: p.rotacao || 0,
  }));

  for (const [linkId, pecasGrupo] of porLinkId) {
    if (pecasGrupo.length === 1) {
      const p = pecasGrupo[0];
      unidades.push({
        tipo: 'peca', peca: p, materialId: p.materialId,
        largura: p.largura, altura: p.altura, rotacao: p.rotacao || 0,
      });
      continue;
    }
    const bbox = bboxGrupo(pecasGrupo);
    const offsets = pecasGrupo.map(p => {
      const pos = posOriginalDe(p);
      return { peca: p, dx: pos.x - bbox.x, dy: pos.y - bbox.y };
    });
    unidades.push({
      tipo: 'grupo',
      linkId,
      materialId: pecasGrupo[0].materialId,
      // Dimensões do bbox — o algoritmo de empacotamento trata como uma peça única.
      // rotacao=0 sempre: o bbox já reflete a rotação efetiva de cada peça interna.
      largura: bbox.w,
      altura: bbox.h,
      rotacao: 0,
      offsets,
      originalBbox: bbox,
    });
  }

  return unidades;
}

/**
 * Shelf Algorithm — organiza peças em linhas horizontais.
 * Ideal para corte sequencial (operador corta uma linha por vez).
 */
const encontrarPosicaoShelf = (chapa, peca, materialConfig, espacamento, margem, modoAgrupamento = false) => {
  const larguraChapa = materialConfig.comprimento;
  const alturaChapa = materialConfig.altura;
  const pecaLargura = peca.rotacao === 90 ? peca.altura : peca.largura;
  const pecaAltura = peca.rotacao === 90 ? peca.largura : peca.altura;

  if (chapa.pecas.length === 0) {
    return { x: margem, y: margem };
  }

  const shelves = [];

  chapa.pecas.forEach(p => {
    const pLargura = p.rotacao === 90 ? p.altura : p.largura;
    const pAltura = p.rotacao === 90 ? p.largura : p.altura;

    let shelf = shelves.find(s => Math.abs(p.posY - s.y) < 1);

    if (!shelf) {
      shelf = {
        y: p.posY,
        altura: 0,
        xFinal: margem,
        tamanho: `${p.largura}x${p.altura}`
      };
      shelves.push(shelf);
    }

    shelf.altura = Math.max(shelf.altura, pAltura);
    shelf.xFinal = Math.max(shelf.xFinal, p.posX + pLargura);
  });

  shelves.sort((a, b) => a.y - b.y);

  const tamanhoAtual = `${peca.largura}x${peca.altura}`;

  for (const shelf of shelves) {
    if (modoAgrupamento && shelf.tamanho !== tamanhoAtual) continue;

    const x = shelf.xFinal + espacamento;
    const y = shelf.y;

    if (x + pecaLargura + margem <= larguraChapa && pecaAltura <= shelf.altura + 1) {
      return { x, y };
    }
  }

  if (shelves.length > 0) {
    const ultimaShelf = shelves[shelves.length - 1];
    const novaY = ultimaShelf.y + ultimaShelf.altura + espacamento;

    if (novaY + pecaAltura + margem <= alturaChapa) {
      return { x: margem, y: novaY };
    }
  }

  return null;
};

/**
 * Bottom-Left Algorithm — varredura de baixo para cima.
 * Melhor aproveitamento de área, mais custoso computacionalmente.
 */
const encontrarPosicaoBottomLeft = (chapa, peca, materialConfig, espacamento, margem) => {
  const larguraChapa = materialConfig.comprimento;
  const alturaChapa = materialConfig.altura;
  const pecaLargura = peca.rotacao === 90 ? peca.altura : peca.largura;
  const pecaAltura = peca.rotacao === 90 ? peca.largura : peca.altura;

  if (chapa.pecas.length === 0) {
    return { x: margem, y: margem };
  }

  const step = Math.max(1, Math.round(espacamento));
  for (let y = margem; y + pecaAltura + margem <= alturaChapa; y += step) {
    for (let x = margem; x + pecaLargura + margem <= larguraChapa; x += step) {
      const temColisao = chapa.pecas.some(p => {
        const pLargura = p.rotacao === 90 ? p.altura : p.largura;
        const pAltura = p.rotacao === 90 ? p.largura : p.altura;

        const distanciaX = Math.abs((x + pecaLargura / 2) - (p.posX + pLargura / 2));
        const distanciaY = Math.abs((y + pecaAltura / 2) - (p.posY + pAltura / 2));

        return distanciaX < (pecaLargura + pLargura) / 2 + espacamento &&
               distanciaY < (pecaAltura + pAltura) / 2 + espacamento;
      });

      if (!temColisao) {
        return { x, y };
      }
    }
  }

  return null;
};

export const encontrarPosicaoNaChapaComOpcoes = (chapa, peca, materialConfig, espacamento, margem, tipoOtimizacao = 'sequencial', modoAgrupamento = false) => {
  if (tipoOtimizacao === 'sequencial') {
    return encontrarPosicaoShelf(chapa, peca, materialConfig, espacamento, margem, modoAgrupamento);
  }
  return encontrarPosicaoBottomLeft(chapa, peca, materialConfig, espacamento, margem);
};

/**
 * Organiza peças em chapas com margem e espaçamento customizados.
 * Retorna novo orçamento com `chapas` e `ambientes` atualizados (imutável).
 */
export const organizarPecasEmChapasComOpcoes = (orcamento, materiais, espacamento, margem, pecasOrdenadas = null, tipoOtimizacao = 'sequencial') => {
  const todasPecas = pecasOrdenadas || orcamento.ambientes.flatMap(amb => amb.pecas);
  const chapas = [];

  const pecasPorMaterial = {};
  todasPecas.forEach(peca => {
    if (!pecasPorMaterial[peca.materialId]) {
      pecasPorMaterial[peca.materialId] = [];
    }
    pecasPorMaterial[peca.materialId].push(peca);
  });

  Object.keys(pecasPorMaterial).forEach(materialId => {
    const material = materiais.find(m => String(m.id) === String(materialId));
    if (!material) return;

    const materialConfig = orcamento.materiais?.[materialId] || MATERIAL_CONFIG_PADRAO;
    const pecas = pecasPorMaterial[materialId];

    pecas.forEach(peca => {
      let colocada = false;

      for (let chapa of chapas.filter(c => String(c.materialId) === String(materialId))) {
        const pos = encontrarPosicaoNaChapaComOpcoes(chapa, peca, materialConfig, espacamento, margem, tipoOtimizacao);
        if (pos) {
          peca.chapaId = chapa.id;
          peca.posX = pos.x;
          peca.posY = pos.y;
          chapa.pecas.push(peca);
          colocada = true;
          break;
        }
      }

      if (!colocada) {
        const novaChapa = {
          id: Date.now() + Math.random(),
          materialId,
          material: { ...material, ...materialConfig },
          pecas: []
        };

        peca.chapaId = novaChapa.id;
        peca.posX = margem;
        peca.posY = margem;
        novaChapa.pecas.push(peca);
        chapas.push(novaChapa);
      }
    });
  });

  const ambientesAtualizados = orcamento.ambientes.map(amb => ({
    ...amb,
    pecas: amb.pecas.map(p => {
      const pecaAtualizada = todasPecas.find(tp => tp.id === p.id);
      return pecaAtualizada || p;
    })
  }));

  return { ...orcamento, chapas, ambientes: ambientesAtualizados };
};

/**
 * Ordena UNIDADES (peças individuais ou super peças/grupos) conforme `opcoes`.
 * Para super peças, usa as dimensões do bbox combinado.
 */
const ordenarUnidades = (unidades, opcoes) => {
  const porAreaDecrescente = (a, b) => (b.largura * b.altura) - (a.largura * a.altura);

  if (opcoes.tipoOtimizacao === 'sequencial' && opcoes.ordenacaoSequencial === 'agrupamento-tamanho') {
    const grupos = {};
    unidades.forEach(u => {
      const chave = `${u.largura}x${u.altura}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(u);
    });
    return Object.keys(grupos)
      .sort((a, b) => {
        const [c1, a1] = a.split('x').map(Number);
        const [c2, a2] = b.split('x').map(Number);
        return (c2 * a2) - (c1 * a1);
      })
      .flatMap(chave => grupos[chave]);
  }

  return [...unidades].sort(porAreaDecrescente);
};

/**
 * Coloca uma unidade em uma chapa específica na posição `pos`:
 * - tipo='peca': posiciona a peça única
 * - tipo='grupo': desempacota — cada peça do grupo recebe `pos + offset relativo`
 *                 e é inserida em `chapa.pecas` (pra que próximas peças/grupos enxerguem).
 *
 * Retorna a lista de peças posicionadas (1 ou N).
 */
const colocarUnidade = (unidade, chapa, pos) => {
  if (unidade.tipo === 'grupo') {
    const colocadas = [];
    unidade.offsets.forEach(({ peca, dx, dy }) => {
      peca.chapaId = chapa.id;
      peca.posX = pos.x + dx;
      peca.posY = pos.y + dy;
      chapa.pecas.push(peca);
      colocadas.push(peca);
    });
    return colocadas;
  }
  unidade.peca.chapaId = chapa.id;
  unidade.peca.posX = pos.x;
  unidade.peca.posY = pos.y;
  chapa.pecas.push(unidade.peca);
  return [unidade.peca];
};

/**
 * Limpa posição/chapaId de uma peça. Preserva linkId, outsideX/Y e demais campos.
 */
const limparPosicaoPeca = (peca) => {
  const { posX: _posX, posY: _posY, chapaId: _chapaId, ...sem } = peca;
  return sem;
};

/**
 * Otimiza o corte de um orçamento e retorna um novo orçamento com as chapas/peças
 * posicionadas. Função pura — não toca no state.
 *
 * Peças com `linkId` (paginação com veio) são agrupadas como SUPER PEÇAS — o
 * algoritmo posiciona o bbox combinado, e cada peça do grupo recebe sua posição
 * relativa preservando exatamente o arranjo manual feito pelo usuário.
 */
export const otimizarOrcamento = (orcamentoAtual, materiais, opcoes) => {
  // 1) Constrói unidades USANDO as posições originais (pra calcular bbox+offsets dos grupos)
  const todasPecasOrig = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
  const unidadesOrig = construirUnidades(todasPecasOrig);

  // 2) Substitui as referências de peças pelas versões limpas (sem posX/Y/chapaId).
  //    Os offsets dos grupos já foram capturados acima e ficam preservados.
  const unidades = unidadesOrig.map(u => {
    if (u.tipo === 'grupo') {
      return {
        ...u,
        offsets: u.offsets.map(({ peca, dx, dy }) => ({
          peca: limparPosicaoPeca(peca), dx, dy,
        })),
      };
    }
    return { ...u, peca: limparPosicaoPeca(u.peca) };
  });

  // 3) Ordena e agrupa por material
  const unidadesOrdenadas = ordenarUnidades(unidades, opcoes);
  const chapas = [];
  const espacamento = opcoes.espessuraDisco;
  const margem = opcoes.margemLaterais;
  const modoAgrupamento = opcoes.ordenacaoSequencial === 'agrupamento-tamanho';
  const pecasFinais = []; // pra reaplicar nos ambientes

  const unidadesPorMaterial = {};
  unidadesOrdenadas.forEach(u => {
    if (!unidadesPorMaterial[u.materialId]) unidadesPorMaterial[u.materialId] = [];
    unidadesPorMaterial[u.materialId].push(u);
  });

  Object.keys(unidadesPorMaterial).forEach(materialId => {
    const material = materiais.find(m => String(m.id) === String(materialId));
    if (!material) return;

    const materialConfig = orcamentoAtual.materiais?.[materialId] || MATERIAL_CONFIG_PADRAO;
    const unidadesDoMaterial = unidadesPorMaterial[materialId];
    const ultimaChapaPorTamanho = {};

    unidadesDoMaterial.forEach(unidade => {
      // "Peça virtual" passada ao algoritmo de empacotamento — pra grupos é o bbox.
      const pecaParaAlgoritmo = unidade.tipo === 'grupo'
        ? { largura: unidade.largura, altura: unidade.altura, rotacao: 0 }
        : unidade.peca;

      let colocada = false;
      const chaveTamanho = `${unidade.largura}x${unidade.altura}`;

      // Modo agrupamento por tamanho: tenta primeiro a "chapa preferida" daquele tamanho
      if (modoAgrupamento && ultimaChapaPorTamanho[chaveTamanho]) {
        const chapaPreferida = chapas.find(c => c.id === ultimaChapaPorTamanho[chaveTamanho]);
        if (chapaPreferida) {
          const pos = encontrarPosicaoNaChapaComOpcoes(chapaPreferida, pecaParaAlgoritmo, materialConfig, espacamento, margem, opcoes.tipoOtimizacao, modoAgrupamento);
          if (pos) {
            pecasFinais.push(...colocarUnidade(unidade, chapaPreferida, pos));
            colocada = true;
          }
        }
      }

      // Tenta nas chapas existentes do mesmo material
      if (!colocada) {
        for (const chapa of chapas.filter(c => String(c.materialId) === String(materialId))) {
          const pos = encontrarPosicaoNaChapaComOpcoes(chapa, pecaParaAlgoritmo, materialConfig, espacamento, margem, opcoes.tipoOtimizacao, modoAgrupamento);
          if (pos) {
            pecasFinais.push(...colocarUnidade(unidade, chapa, pos));
            colocada = true;
            if (modoAgrupamento) ultimaChapaPorTamanho[chaveTamanho] = chapa.id;
            break;
          }
        }
      }

      // Cria nova chapa se não couber
      if (!colocada) {
        const novaChapa = {
          id: Date.now() + Math.random(),
          materialId,
          material: { ...material, ...materialConfig },
          pecas: [],
        };
        chapas.push(novaChapa);
        pecasFinais.push(...colocarUnidade(unidade, novaChapa, { x: margem, y: margem }));
        if (modoAgrupamento) ultimaChapaPorTamanho[chaveTamanho] = novaChapa.id;
      }
    });
  });

  const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
    ...amb,
    pecas: amb.pecas.map(p => pecasFinais.find(pf => pf.id === p.id) || p),
  }));

  return { ...orcamentoAtual, chapas, ambientes: ambientesAtualizados };
};

const MATERIAL_CONFIG_PADRAO = {
  comprimento: 3000,
  altura: 2000,
  custo: 300,
  venda: 900
};

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
 * Ordena peças conforme `opcoes.tipoOtimizacao` e `opcoes.ordenacaoSequencial`.
 */
const ordenarPecas = (todasPecas, opcoes) => {
  const porAreaDecrescente = (a, b) => (b.largura * b.altura) - (a.largura * a.altura);

  if (opcoes.tipoOtimizacao === 'sequencial' && opcoes.ordenacaoSequencial === 'agrupamento-tamanho') {
    const grupos = {};
    todasPecas.forEach(peca => {
      const chave = `${peca.largura}x${peca.altura}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(peca);
    });

    return Object.keys(grupos)
      .sort((a, b) => {
        const [c1, a1] = a.split('x').map(Number);
        const [c2, a2] = b.split('x').map(Number);
        return (c2 * a2) - (c1 * a1);
      })
      .flatMap(chave => grupos[chave]);
  }

  return [...todasPecas].sort(porAreaDecrescente);
};

/**
 * Otimiza o corte de um orçamento e retorna um novo orçamento com as chapas/peças posicionadas.
 * Função pura — não toca no state.
 */
export const otimizarOrcamento = (orcamentoAtual, materiais, opcoes) => {
  const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
  const pecasOrdenadas = ordenarPecas(todasPecas, opcoes);

  const pecasLimpas = pecasOrdenadas.map(peca => {
    const { posX: _posX, posY: _posY, chapaId: _chapaId, ...pecaSemPosicao } = peca;
    return pecaSemPosicao;
  });

  const chapas = [];
  const espacamento = opcoes.espessuraDisco;
  const margem = opcoes.margemLaterais;
  const modoAgrupamento = opcoes.ordenacaoSequencial === 'agrupamento-tamanho';

  const pecasPorMaterial = {};
  pecasLimpas.forEach(peca => {
    if (!pecasPorMaterial[peca.materialId]) pecasPorMaterial[peca.materialId] = [];
    pecasPorMaterial[peca.materialId].push(peca);
  });

  Object.keys(pecasPorMaterial).forEach(materialId => {
    const material = materiais.find(m => String(m.id) === String(materialId));
    if (!material) return;

    const materialConfig = orcamentoAtual.materiais?.[materialId] || MATERIAL_CONFIG_PADRAO;
    const pecas = pecasPorMaterial[materialId];
    const ultimaChapaPorTamanho = {};

    pecas.forEach(peca => {
      let colocada = false;
      const chaveTamanho = `${peca.largura}x${peca.altura}`;

      if (modoAgrupamento && ultimaChapaPorTamanho[chaveTamanho]) {
        const chapaPreferida = chapas.find(c => c.id === ultimaChapaPorTamanho[chaveTamanho]);
        if (chapaPreferida) {
          const pos = encontrarPosicaoNaChapaComOpcoes(chapaPreferida, peca, materialConfig, espacamento, margem, opcoes.tipoOtimizacao, modoAgrupamento);
          if (pos) {
            peca.chapaId = chapaPreferida.id;
            peca.posX = pos.x;
            peca.posY = pos.y;
            chapaPreferida.pecas.push(peca);
            colocada = true;
          }
        }
      }

      if (!colocada) {
        for (let chapa of chapas.filter(c => String(c.materialId) === String(materialId))) {
          const pos = encontrarPosicaoNaChapaComOpcoes(chapa, peca, materialConfig, espacamento, margem, opcoes.tipoOtimizacao, modoAgrupamento);
          if (pos) {
            peca.chapaId = chapa.id;
            peca.posX = pos.x;
            peca.posY = pos.y;
            chapa.pecas.push(peca);
            colocada = true;
            if (modoAgrupamento) ultimaChapaPorTamanho[chaveTamanho] = chapa.id;
            break;
          }
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

        if (modoAgrupamento) ultimaChapaPorTamanho[chaveTamanho] = novaChapa.id;
      }
    });
  });

  const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
    ...amb,
    pecas: amb.pecas.map(p => {
      const pecaAtualizada = pecasLimpas.find(pl => pl.id === p.id);
      return pecaAtualizada || p;
    })
  }));

  return { ...orcamentoAtual, chapas, ambientes: ambientesAtualizados };
};

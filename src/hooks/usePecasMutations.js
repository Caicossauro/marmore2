import { CONFIG_CHAPA_PADRAO } from '../constants/config';
import { layoutStaging, STAGING_LARGURA_MM } from '../utils/cutting/stagingLayout';
import { floodFillLink, novoLinkId } from '../utils/cutting/linkPecas';

/**
 * Hook que agrupa todas as mutações de peças/chapas no plano de corte.
 *
 * IMPORTANTE: comportamento idêntico ao monolito original.
 * Não "melhorar" lógica de drag, não corrigir comparações String(id),
 * não remover setTimeout(0). Refactor puro.
 */
export function usePecasMutations({
  orcamentoAtual,
  setOrcamentoAtual,
  setOrcamentos,
  opcoesOtimizacao,
  materiais,
  setMostrarModalNovaChapa,
  setMaterialNovaChapa,
}) {
  // Girar peça (bloqueada se a peça está num grupo linkado — preserva paginação).
  const girarPeca = (pecaId, _chapaId) => {
    const pecaAlvo = orcamentoAtual.ambientes
      .flatMap(amb => amb.pecas)
      .find(p => p.id === pecaId);
    if (pecaAlvo?.linkId) {
      alert('Esta peça está linkada (paginação com veio). Desfaça o link antes de girar.');
      return;
    }
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        if (p.id === pecaId) {
          const novaRotacao = p.rotacao === 0 ? 90 : 0;
          return { ...p, rotacao: novaRotacao };
        }
        return p;
      })
    }));

    // Reconstruir as chapas
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Mover peça dentro da mesma chapa (arraste manual)
  const moverPecaNaChapa = (pecaId, chapaId, novaX, novaY) => {
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p =>
        p.id === pecaId ? { ...p, chapaId: chapaId, posX: novaX, posY: novaY } : p
      )
    }));

    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Encontrar melhor posição disponível para a peça na chapa
  const encontrarMelhorPosicao = (peca, chapaDestino) => {
    const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.largura;
    const alturaPeca = peca.rotacao === 90 ? peca.largura : peca.altura;
    const margem = opcoesOtimizacao.margemLaterais;
    const espacamento = opcoesOtimizacao.espessuraDisco;

    const larguraChapa = chapaDestino.material.comprimento;
    const alturaChapa = chapaDestino.material.altura;

    // Verificar se a peça é maior que a chapa (considerando margens)
    if (larguraPeca + margem * 2 > larguraChapa ||
        alturaPeca + margem * 2 > alturaChapa) {
      return null;
    }

    // Incremento igual ao espaçamento garante que a posição exata com gap correto
    // sempre seja testada — evita gaps maiores que o configurado.
    const incremento = espacamento;

    for (let y = margem; y + alturaPeca + margem <= alturaChapa; y += incremento) {
      for (let x = margem; x + larguraPeca + margem <= larguraChapa; x += incremento) {
        // AABB inflado pelo espaçamento — mesma lógica usada no canvas
        const sobrepoe = chapaDestino.pecas.some(p => {
          if (p.id === peca.id) return false;

          const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
          const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

          const aMinX = p.posX - espacamento;
          const aMaxX = p.posX + larguraOutra + espacamento;
          const aMinY = p.posY - espacamento;
          const aMaxY = p.posY + alturaOutra + espacamento;

          return (
            x < aMaxX &&
            x + larguraPeca > aMinX &&
            y < aMaxY &&
            y + alturaPeca > aMinY
          );
        });

        if (!sobrepoe) {
          return { x, y };
        }
      }
    }

    return null;
  };

  // Mover peça entre chapas (ou da bandeja de avulsas para uma chapa)
  const moverPeca = (pecaId, novaChapaId) => {
    let pecaMovida = null;
    orcamentoAtual.ambientes.forEach(amb => {
      const peca = amb.pecas.find(p => p.id === pecaId);
      if (peca) pecaMovida = peca;
    });

    if (!pecaMovida) {
      alert('❌ Erro: Peça não encontrada.');
      return;
    }

    // Comparar como string pois o id vindo do data-chapa-id é string
    const chapaDestino = orcamentoAtual.chapas.find(c => String(c.id) === String(novaChapaId));
    if (!chapaDestino) {
      alert('❌ Erro: Chapa de destino não encontrada.');
      return;
    }

    // Validar compatibilidade de material entre peça e chapa
    if (chapaDestino.materialId !== pecaMovida.materialId) {
      alert('⚠️ Só é possível colocar a peça em uma chapa do mesmo material.');
      return;
    }

    // Usa o id real (number) da chapa encontrada, não o id recebido (que pode ser string)
    const chapaDestinoId = chapaDestino.id;

    const posicao = encontrarMelhorPosicao(pecaMovida, chapaDestino);

    if (!posicao) {
      const larguraPeca = pecaMovida.rotacao === 90 ? pecaMovida.altura : pecaMovida.largura;
      const alturaPeca = pecaMovida.rotacao === 90 ? pecaMovida.largura : pecaMovida.altura;

      alert(
        '⚠️ Não foi possível mover a peça!\n\n' +
        '❌ Não há espaço disponível na chapa de destino.\n\n' +
        '📏 Dimensões da peça: ' + larguraPeca + ' x ' + alturaPeca + ' mm\n' +
        '📐 Dimensões da chapa: ' + chapaDestino.material.comprimento + ' x ' + chapaDestino.material.altura + ' mm\n\n' +
        '💡 Dica: Tente mover outras peças ou use outra chapa.'
      );
      return;
    }

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p =>
        p.id === pecaId ? { ...p, chapaId: chapaDestinoId, posX: posicao.x, posY: posicao.y } : p
      )
    }));

    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Excluir uma chapa vazia (sem peças)
  const excluirChapa = (chapaId) => {
    if (!orcamentoAtual) return;
    const chapa = orcamentoAtual.chapas.find(c => String(c.id) === String(chapaId));
    if (!chapa) return;
    if (chapa.pecas && chapa.pecas.length > 0) {
      alert('❌ Esta chapa não pode ser excluída pois contém peças.');
      return;
    }
    if (!window.confirm('Excluir esta chapa vazia?')) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      chapas: orcamentoAtual.chapas.filter(c => String(c.id) !== String(chapaId)),
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Plano Manual: desloca todas as peças pra "área de avulsas" (chapaId=null).
  // Chapas existentes ficam. Peças avulsas recebem layout inicial na staging,
  // agrupado por material (bin-packing simples por linha).
  const iniciarPlanoManual = () => {
    if (!orcamentoAtual) return;
    if (!window.confirm(
      'Iniciar plano manual?\n\n' +
      'Todas as peças voltarão para a área de peças avulsas.\n' +
      'As chapas existentes serão mantidas (vazias).\n\n' +
      'Você poderá arrastar as peças para as chapas uma a uma.'
    )) return;

    // Junta todas as peças num único array, agrupando por material e calculando staging.
    const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
    const pecasPorMaterial = new Map();
    for (const p of todasPecas) {
      const key = String(p.materialId);
      if (!pecasPorMaterial.has(key)) pecasPorMaterial.set(key, []);
      pecasPorMaterial.get(key).push({ ...p, chapaId: null, posX: null, posY: null });
    }

    // Aplica layoutStaging por material e indexa por id pra reaplicar nos ambientes.
    // Largura: STAGING_LARGURA_MM (mesma usada pelo retângulo visual da staging).
    const posicaoStagingPorPecaId = new Map();
    for (const [, pecasMat] of pecasPorMaterial) {
      const comLayout = layoutStaging(pecasMat, { larguraMaxMm: STAGING_LARGURA_MM });
      for (const p of comLayout) {
        posicaoStagingPorPecaId.set(p.id, { outsideX: p.outsideX, outsideY: p.outsideY });
      }
    }

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        const pos = posicaoStagingPorPecaId.get(p.id);
        return {
          ...p,
          chapaId: null,
          posX: null,
          posY: null,
          outsideX: pos?.outsideX ?? 0,
          outsideY: pos?.outsideY ?? 0,
        };
      }),
    }));
    const chapasLimpas = orcamentoAtual.chapas.map(c => ({ ...c, pecas: [] }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasLimpas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Mover peça de uma chapa de volta para a área de avulsas.
  // outsideX/Y opcionais: se vierem, peça mantém posição na staging.
  // Se omitidos, peça vai pra (0,0) — primeira posição da staging.
  const moverPecaParaAvulsas = (pecaId, outsideX, outsideY) => {
    if (!orcamentoAtual) return;

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        if (p.id !== pecaId) return p;
        const atualizada = { ...p, chapaId: null, posX: null, posY: null };
        if (outsideX !== undefined) atualizada.outsideX = outsideX;
        if (outsideY !== undefined) atualizada.outsideY = outsideY;
        return atualizada;
      }),
    }));
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id),
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  const adicionarChapa = (materialId) => {
    const material = materiais.find((m) => String(m.id) === String(materialId));
    if (!material) return;

    const materialConfig = orcamentoAtual.materiais?.[material.id] || { ...CONFIG_CHAPA_PADRAO };

    const novaChapa = {
      id: Date.now() + Math.random(),
      materialId: material.id,
      material: { ...material, ...materialConfig },
      pecas: [],
    };

    // Garantir que a config do material esteja no orçamento (para cálculos futuros)
    const materiaisConfig = { ...(orcamentoAtual.materiais || {}) };
    if (!materiaisConfig[material.id]) {
      materiaisConfig[material.id] = materialConfig;
    }

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      chapas: [...orcamentoAtual.chapas, novaChapa],
      materiais: materiaisConfig,
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos((prev) =>
      prev.map((orc) => (orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc))
    );

    setMostrarModalNovaChapa(false);
    setMaterialNovaChapa('');
  };

  /**
   * Linkar peças adjacentes a partir de uma peça-alvo.
   *
   * Flood-fill transitivo: encontra TODAS as peças tocando (transitivamente) na
   * mesma chapa e atribui o mesmo `linkId`. Se a peça já está em um grupo, o
   * grupo é estendido pra "engolir" novas vizinhas.
   *
   * Não linka cross-chapa. Não toca em peças avulsas (sem chapaId).
   */
  const linkarPecas = (pecaId) => {
    if (!orcamentoAtual) return;
    const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
    const peca = todasPecas.find(p => p.id === pecaId);
    if (!peca) return;

    // Pool de peças no MESMO escopo:
    //  • Chapa: mesma chapaId
    //  • Staging (avulsa): mesma materialId E também sem chapaId
    const escopoPecas = peca.chapaId != null
      ? todasPecas.filter(p => p.chapaId === peca.chapaId)
      : todasPecas.filter(p => p.chapaId == null && p.materialId === peca.materialId);
    const espessuraDisco = Number(opcoesOtimizacao?.espessuraDisco) || 4;
    const grupoIds = floodFillLink(peca, escopoPecas, espessuraDisco);

    if (grupoIds.length <= 1) {
      alert('Nenhuma peça adjacente para linkar. Aproxime as peças primeiro.');
      return;
    }

    // Reusa o linkId atual se já existir (extensão de grupo); senão gera novo.
    const linkId = peca.linkId || novoLinkId();

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => (grupoIds.includes(p.id) ? { ...p, linkId } : p)),
    }));
    const todasPecasAtualizadas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecasAtualizadas.filter(p => p.chapaId === chapa.id),
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  /**
   * Desfaz o link de uma peça — REMOVE o linkId de TODAS as peças do mesmo grupo.
   * Equivalente a "desfazer grupo" (o user pediu desfazer simples; reagrupar é
   * trivial: clica em qualquer peça do antigo grupo e Linkar de novo).
   */
  const desfazerLink = (pecaId) => {
    if (!orcamentoAtual) return;
    const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
    const peca = todasPecas.find(p => p.id === pecaId);
    if (!peca || !peca.linkId) return;

    const linkId = peca.linkId;
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        if (p.linkId !== linkId) return p;
        const { linkId: _removido, ...semLink } = p;
        return semLink;
      }),
    }));
    const todasPecasAtualizadas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecasAtualizadas.filter(p => p.chapaId === chapa.id),
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  /**
   * Aplica atualizações em VÁRIAS peças de uma vez (usado pelo drag de grupos linkados).
   *
   * Cada `update` é um patch parcial: `{ pecaId, chapaId?, posX?, posY?, outsideX?, outsideY? }`.
   * Campos `undefined` no patch preservam o valor atual. Após aplicar, as `chapas[].pecas`
   * são reconstruídas a partir das peças com `chapaId` correspondente.
   */
  const moverGrupoLinkado = (updates) => {
    if (!orcamentoAtual || !updates || updates.length === 0) return;
    const updatesMap = new Map(updates.map(u => [u.pecaId, u]));

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        const u = updatesMap.get(p.id);
        if (!u) return p;
        return {
          ...p,
          chapaId: u.chapaId !== undefined ? u.chapaId : p.chapaId,
          posX: u.posX !== undefined ? u.posX : p.posX,
          posY: u.posY !== undefined ? u.posY : p.posY,
          outsideX: u.outsideX !== undefined ? u.outsideX : p.outsideX,
          outsideY: u.outsideY !== undefined ? u.outsideY : p.outsideY,
        };
      }),
    }));
    const todasPecasAtualizadas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecasAtualizadas.filter(p => p.chapaId === chapa.id),
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  return {
    girarPeca,
    moverPecaNaChapa,
    moverPeca,
    moverPecaParaAvulsas,
    excluirChapa,
    iniciarPlanoManual,
    adicionarChapa,
    linkarPecas,
    desfazerLink,
    moverGrupoLinkado,
  };
}

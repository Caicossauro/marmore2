import { encontrarPosicaoNaChapaComOpcoes } from '../utils/cuttingOptimization';
import { CONFIG_CHAPA_PADRAO } from '../constants/config';
import { cabeNaPosicaoAtual } from '../utils/cutting/colisao';

export function useGerenciarPecas({
  orcamentoAtual,
  materiais,
  opcoesOtimizacao,
  aplicarOrcamento,
  mostrandoDetalhePeca,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  pecaEditada,
  setPecaEditada,
}) {
  // Adicionar peça (incremental: encaixa em chapas existentes ou cria nova chapa,
  // sem destruir o que o usuário já posicionou no plano de corte).
  const adicionarPeca = (ambienteId, peca) => {
    const material = materiais.find(m => m.id === peca.materialId);
    if (!material) {
      alert('❌ Material não encontrado!');
      return;
    }

    const materialConfig = orcamentoAtual.materiais?.[peca.materialId] || { ...CONFIG_CHAPA_PADRAO };

    const pecaComp = parseFloat(peca.largura);
    const pecaAlt = parseFloat(peca.altura);
    const chapaComp = materialConfig.comprimento;
    const chapaAlt = materialConfig.altura;

    const cabeNormal = pecaComp <= chapaComp && pecaAlt <= chapaAlt;
    const cabeRotacionada = pecaAlt <= chapaComp && pecaComp <= chapaAlt;

    if (!cabeNormal && !cabeRotacionada) {
      alert(`❌ Peça muito grande!\n\nPeça: ${pecaComp} x ${pecaAlt} mm\nChapa: ${chapaComp} x ${chapaAlt} mm\n\nA peça não cabe na chapa nem rotacionada.`);
      return;
    }

    const rotacaoInicial = !cabeNormal && cabeRotacionada ? 90 : 0;

    const novasPecas = [];
    const quantidade = peca.quantidade || 1;
    for (let i = 0; i < quantidade; i++) {
      const nomeComNumeracao = quantidade > 1
        ? `${peca.nome} ${i + 1} - ${quantidade}`
        : peca.nome;

      novasPecas.push({
        ...peca,
        id: Date.now() + i + Math.random(),
        nome: nomeComNumeracao,
        quantidade: 1,
        ambienteId,
        chapaId: null,
        posX: null,
        posY: null,
        rotacao: rotacaoInicial,
      });
    }

    const materiaisConfig = { ...orcamentoAtual.materiais };
    if (!materiaisConfig[peca.materialId]) {
      materiaisConfig[peca.materialId] = { ...CONFIG_CHAPA_PADRAO };
    }

    // Cópia mutável das chapas — o algoritmo precisa "ver" peças que acabou
    // de posicionar quando for posicionar a próxima nova peça.
    const chapasMutaveis = orcamentoAtual.chapas.map(c => ({ ...c, pecas: [...c.pecas] }));

    const espacamento = opcoesOtimizacao.espessuraDisco;
    const margem = opcoesOtimizacao.margemLaterais;
    const tipoOtimizacao = opcoesOtimizacao.tipoOtimizacao || 'sequencial';

    novasPecas.forEach(pecaNova => {
      let colocada = false;

      // 1. Tentar encaixar nas chapas existentes do mesmo material
      for (const chapa of chapasMutaveis) {
        if (String(chapa.materialId) !== String(pecaNova.materialId)) continue;
        const pos = encontrarPosicaoNaChapaComOpcoes(
          chapa, pecaNova, materialConfig, espacamento, margem, tipoOtimizacao
        );
        if (pos) {
          pecaNova.chapaId = chapa.id;
          pecaNova.posX = pos.x;
          pecaNova.posY = pos.y;
          chapa.pecas.push(pecaNova);
          colocada = true;
          break;
        }
      }

      // 2. Se não couber em nenhuma, criar uma nova chapa pra ela
      if (!colocada) {
        const novaChapa = {
          id: Date.now() + Math.random(),
          materialId: peca.materialId,
          material: { ...material, ...materialConfig },
          pecas: [],
        };
        pecaNova.chapaId = novaChapa.id;
        pecaNova.posX = margem;
        pecaNova.posY = margem;
        novaChapa.pecas.push(pecaNova);
        chapasMutaveis.push(novaChapa);
      }
    });

    const ambientes = orcamentoAtual.ambientes.map(amb =>
      amb.id === ambienteId ? { ...amb, pecas: [...amb.pecas, ...novasPecas] } : amb
    );

    const novoOrcamento = {
      ...orcamentoAtual,
      ambientes,
      chapas: chapasMutaveis,
      materiais: materiaisConfig,
    };

    aplicarOrcamento(novoOrcamento);
  };

  // Excluir peça (incremental: só remove a peça da chapa em que estava,
  // preservando posição das outras peças no plano).
  const excluirPeca = (ambienteId, pecaId) => {
    const ambientes = orcamentoAtual.ambientes.map(amb =>
      amb.id === ambienteId
        ? { ...amb, pecas: amb.pecas.filter(p => p.id !== pecaId) }
        : amb
    );

    const chapas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: chapa.pecas.filter(p => p.id !== pecaId),
    }));

    const novoOrcamento = { ...orcamentoAtual, ambientes, chapas };
    aplicarOrcamento(novoOrcamento);
  };

  // Salvar edição da peça (incremental: preserva posição/chapa quando possível).
  // - Se mudou material: peça vai para avulsas (chapa antiga é de outro material).
  // - Se mudou dimensões: tenta manter na posição atual; se não couber mais, vai pra avulsas.
  // - Demais campos (acabamentos, recortes) não afetam layout — preserva tudo.
  const salvarEdicaoPeca = () => {
    if (!pecaEditada || !mostrandoDetalhePeca) return;

    // Inputs do EditorDePecaPortal salvam altura/largura como string.
    // Normalizar antes da comparação e antes de salvar evita que peças saiam
    // da chapa por "string !== number" e que o canvas faça string-concat depois.
    const editada = {
      ...pecaEditada,
      altura:     parseFloat(pecaEditada.altura)    || 0,
      largura:    parseFloat(pecaEditada.largura)   || 0,
      quantidade: parseInt(pecaEditada.quantidade)  || 1,
    };
    const original = {
      ...mostrandoDetalhePeca,
      altura:  parseFloat(mostrandoDetalhePeca.altura)  || 0,
      largura: parseFloat(mostrandoDetalhePeca.largura) || 0,
    };

    const dimensoesMudaram =
      editada.largura !== original.largura ||
      editada.altura  !== original.altura;
    const materialMudou = editada.materialId !== original.materialId;

    let pecaFinal = editada;

    if (materialMudou) {
      pecaFinal = { ...pecaFinal, chapaId: null, posX: null, posY: null };
    } else if (dimensoesMudaram && pecaFinal.chapaId != null) {
      const chapa = orcamentoAtual.chapas.find(c => c.id === pecaFinal.chapaId);
      const materialConfig = orcamentoAtual.materiais?.[pecaFinal.materialId] || CONFIG_CHAPA_PADRAO;
      const margem = opcoesOtimizacao.margemLaterais;
      const espacamento = opcoesOtimizacao.espessuraDisco;

      if (!cabeNaPosicaoAtual(pecaFinal, chapa, materialConfig, espacamento, margem)) {
        pecaFinal = { ...pecaFinal, chapaId: null, posX: null, posY: null };
      }
    }

    const ambientes = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => (p.id === original.id ? pecaFinal : p)),
    }));

    // Reconstruir chapas[].pecas a partir das peças atualizadas
    const todasPecas = ambientes.flatMap(a => a.pecas);
    const chapas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id),
    }));

    const novoOrcamento = { ...orcamentoAtual, ambientes, chapas };
    aplicarOrcamento(novoOrcamento, true);

    setMostrandoDetalhePeca(null);
    setModoEdicaoPeca(false);
    setPecaEditada(null);
  };

  return { adicionarPeca, excluirPeca, salvarEdicaoPeca };
}

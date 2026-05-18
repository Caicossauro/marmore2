import { organizarPecasEmChapas } from '../utils/calculations';
import { otimizarOrcamento } from '../utils/cuttingOptimization';
import { CONFIG_CHAPA_PADRAO } from '../constants/config';
import { useGerenciarPecas } from './useGerenciarPecas';
import { useMaterialMutations } from './useMaterialMutations';

/**
 * Hook que agrupa as mutações principais do orçamento
 * (peças, materiais, preços, otimização e criação).
 *
 * IMPORTANTE: comportamento idêntico ao monolito original.
 * Não "melhorar" lógica, não corrigir comparações String(id),
 * não remover setTimeout(0), não remover JSON.parse(JSON.stringify),
 * não remover setOrcamentoVersion. Refactor puro.
 */
export function usePecasOrcamento({
  // Orçamento e lista
  orcamentoAtual,
  setOrcamentoAtual,
  orcamentos,
  setOrcamentos,
  // Materiais
  materiais,
  atualizarMaterialSimples,
  // Painel de preços (orçamento)
  precosTemp,
  setPrecosSalvosOrcamento,
  // Painel de materiais (orçamento)
  materiaisTemp,
  setMateriaisSalvosOrcamento,
  // Modal de detalhes da peça
  mostrandoDetalhePeca,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  pecaEditada,
  setPecaEditada,
  // Versionamento do resumo
  setOrcamentoVersion,
  // Criação de orçamento
  nomeNovoOrcamento,
  criarOrcamento,
  // Mantido na assinatura por compatibilidade do caller, mas não é mais usado:
  // criarOrcamento agora busca preços frescos internamente para evitar race condition.
  precos: _precos,
  setTela,
  // Otimização
  opcoesOtimizacao,
  setMostrarModalOtimizacao,
}) {
  // Aplica novoOrc no estado local + lista de orçamentos.
  // Ordem: setOrcamentoAtual ANTES de setOrcamentos — preserva comportamento original.
  const aplicarOrcamento = (novoOrc, incrementarVersion = false) => {
    setOrcamentoAtual(novoOrc);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? novoOrc : orc
    ));
    if (incrementarVersion) {
      setOrcamentoVersion(prev => prev + 1);
    }
  };

  const { atualizarMaterial, substituirMaterial, salvarPrecosOrcamento, salvarMateriaisOrcamento } = useMaterialMutations({
    orcamentoAtual,
    orcamentos,
    materiais,
    atualizarMaterialSimples,
    setOrcamentos,
    setOrcamentoAtual,
    precosTemp,
    setPrecosSalvosOrcamento,
    materiaisTemp,
    setMateriaisSalvosOrcamento,
    aplicarOrcamento,
    opcoesOtimizacao,
  });

  // Função auxiliar para obter configuração de um material (do orçamento ou padrão)
  const getMaterialConfig = (materialId, orcamento = orcamentoAtual) => {
    if (!orcamento || !materialId) return CONFIG_CHAPA_PADRAO;

    const config = orcamento.materiais?.[materialId];
    if (config && config.comprimento && config.altura) {
      return config;
    }

    // Retornar config padrão se não existir
    return { ...CONFIG_CHAPA_PADRAO };
  };

  // Wrapper para criar orçamento e navegar para tela de orçamento.
  // Não passamos `precos` (do usePrecos) — pode estar stale (race condition com
  // o getPrecos assíncrono). criarOrcamento busca os preços frescos internamente.
  const confirmarCriacaoOrcamento = async () => {
    const novoOrc = await criarOrcamento(nomeNovoOrcamento);
    if (novoOrc) {
      setTela('orcamento');
    }
  };

  const { adicionarPeca, excluirPeca, salvarEdicaoPeca } = useGerenciarPecas({
    orcamentoAtual,
    materiais,
    opcoesOtimizacao,
    aplicarOrcamento,
    mostrandoDetalhePeca,
    setMostrandoDetalhePeca,
    setModoEdicaoPeca,
    pecaEditada,
    setPecaEditada,
  });

  // Organizar peças em chapas automaticamente
  // Wrapper para organizar peças usando a função do utils
  const organizarPecasLocalmente = (orcamento) => {
    const orcamentoAtualizado = organizarPecasEmChapas(orcamento, materiais);
    aplicarOrcamento(orcamentoAtualizado);
  };

  const otimizarCorte = () => {
    if (!orcamentoAtual) return;
    const orcamentoOtimizado = otimizarOrcamento(orcamentoAtual, materiais, opcoesOtimizacao);
    aplicarOrcamento(orcamentoOtimizado);
    setMostrarModalOtimizacao(false);
  };

  return {
    adicionarPeca,
    excluirPeca,
    salvarEdicaoPeca,
    organizarPecasLocalmente,
    atualizarMaterial,
    getMaterialConfig,
    substituirMaterial,
    otimizarCorte,
    salvarPrecosOrcamento,
    salvarMateriaisOrcamento,
    confirmarCriacaoOrcamento,
  };
}

import { organizarPecasEmChapas } from '../utils/calculations';
import { otimizarOrcamento } from '../utils/cuttingOptimization';
import { CONFIG_CHAPA_PADRAO } from '../constants/config';

export function useMaterialMutations({
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
}) {
  // Função para atualizar material e reorganizar orçamentos
  const atualizarMaterial = (materialId, novosDados) => {
    // 1. Atualizar o material
    atualizarMaterialSimples(materialId, novosDados);

    // 2. Recalcular e reorganizar todos os orçamentos que usam esse material
    const orcamentosAtualizados = orcamentos.map(orc => {
      // Verificar se algum ambiente usa esse material
      const usaMaterial = orc.ambientes.some(amb =>
        amb.pecas.some(peca => peca.material?.id === materialId)
      );

      if (!usaMaterial) {
        return orc; // Não usa esse material, mantém inalterado
      }

      // Atualizar referência do material nas peças
      const ambientesAtualizados = orc.ambientes.map(amb => ({
        ...amb,
        pecas: amb.pecas.map(peca =>
          peca.material?.id === materialId
            ? { ...peca, material: { ...peca.material, ...novosDados } }
            : peca
        )
      }));

      // Reorganizar peças nas chapas com o novo tamanho de material
      const todasAsPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
      const pecasComMaterial = todasAsPecas.filter(p => p.material?.id === materialId);

      if (pecasComMaterial.length > 0) {
        const chapasReorganizadas = organizarPecasEmChapas(todasAsPecas, materiais);

        return {
          ...orc,
          ambientes: ambientesAtualizados,
          chapas: chapasReorganizadas
        };
      }

      return { ...orc, ambientes: ambientesAtualizados };
    });

    setOrcamentos(orcamentosAtualizados);

    // Se o orçamento atual foi afetado, atualizá-lo também
    if (orcamentoAtual) {
      const orcAtualAtualizado = orcamentosAtualizados.find(o => o.id === orcamentoAtual.id);
      if (orcAtualAtualizado) {
        setOrcamentoAtual(orcAtualAtualizado);
      }
    }
  };

  const salvarPrecosOrcamento = () => {
    if (!orcamentoAtual) return;

    // Criar orçamento atualizado com os novos preços
    const orcamentoComPrecosAtualizados = {
      ...orcamentoAtual,
      precos: { ...orcamentoAtual.precos, ...precosTemp }
    };

    // Reorganizar chapas com os novos preços (preserva os preços)
    const orcamentoReorganizado = organizarPecasEmChapas(orcamentoComPrecosAtualizados, materiais);

    aplicarOrcamento(orcamentoReorganizado, true);

    // Mostrar feedback
    setPrecosSalvosOrcamento(true);
    setTimeout(() => setPrecosSalvosOrcamento(false), 2000);
  };

  // Salvar configuração de materiais. Só reorganiza o plano de corte se DIMENSÕES
  // da chapa mudaram (comprimento/altura) — mudanças só de valor (custo/venda)
  // preservam o plano de corte atual.
  //
  // Quando re-otimiza, usa `otimizarOrcamento` (que respeita `linkId` — peças
  // linkadas viram super peça e são posicionadas juntas, preservando a paginação).
  const salvarMateriaisOrcamento = () => {
    if (!orcamentoAtual) return;

    const configAntiga = orcamentoAtual.materiais || {};
    const configNova = { ...configAntiga, ...materiaisTemp };

    const dimensoesMudaram = Object.keys(materiaisTemp).some(matId => {
      const antiga = configAntiga[matId];
      const nova = materiaisTemp[matId];
      if (!antiga) return true; // material novo no orçamento
      return (
        Number(antiga.comprimento) !== Number(nova.comprimento) ||
        Number(antiga.altura) !== Number(nova.altura)
      );
    });

    // Aviso antes de re-otimizar: o plano de corte vai mudar.
    if (dimensoesMudaram) {
      const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas || []);
      const temLinks = todasPecas.some(p => p.linkId);
      const msg = temLinks
        ? 'Alterar as dimensões da chapa vai re-otimizar o plano de corte.\n\nOs links de paginação (peças com veio) serão preservados — peças linkadas continuam juntas.\n\nContinuar?'
        : 'Alterar as dimensões da chapa vai re-otimizar o plano de corte.\n\nAs peças serão reposicionadas automaticamente.\n\nContinuar?';
      if (!window.confirm(msg)) return;
    }

    const orcamentoComMateriaisAtualizados = {
      ...orcamentoAtual,
      materiais: configNova,
    };

    let orcamentoFinal;
    if (dimensoesMudaram) {
      // Dimensões mudaram → reorganiza tudo (peças podem não caber mais).
      // Usa otimizarOrcamento (preserva linkId via super peças).
      orcamentoFinal = otimizarOrcamento(orcamentoComMateriaisAtualizados, materiais, opcoesOtimizacao || {});
    } else {
      // Só preço/custo mudou → mantém posições, mas atualiza a referência do material nas chapas
      // (pra cálculo de custos refletir os novos valores)
      const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => {
        const cfg = configNova[chapa.materialId];
        if (!cfg) return chapa;
        return {
          ...chapa,
          material: { ...chapa.material, ...cfg },
        };
      });
      orcamentoFinal = {
        ...orcamentoComMateriaisAtualizados,
        chapas: chapasAtualizadas,
      };
    }

    aplicarOrcamento(orcamentoFinal, true);

    // Mostrar feedback
    setMateriaisSalvosOrcamento(true);
    setTimeout(() => setMateriaisSalvosOrcamento(false), 2000);
  };

  // Função para substituir um material por outro no orçamento
  const substituirMaterial = (materialAntigoId, materialNovoId) => {
    if (!orcamentoAtual || !materialAntigoId || !materialNovoId) return;

    // Converter IDs para string para comparação
    const antigoIdStr = String(materialAntigoId);
    const novoIdStr = String(materialNovoId);

    if (antigoIdStr === novoIdStr) {
      alert('⚠️ Selecione um material diferente para substituição.');
      return;
    }

    // Buscar material novo (comparação flexível)
    const materialNovo = materiais.find(m => String(m.id) === novoIdStr);
    if (!materialNovo) {
      console.error('Material não encontrado. ID procurado:', novoIdStr, 'Materiais disponíveis:', materiais);
      alert('❌ Material de substituição não encontrado.');
      return;
    }

    // Contar quantas peças serão afetadas
    let totalPecas = 0;
    orcamentoAtual.ambientes.forEach(amb => {
      amb.pecas.forEach(peca => {
        if (String(peca.materialId) === antigoIdStr) {
          totalPecas++;
        }
      });
    });

    if (totalPecas === 0) {
      alert('⚠️ Nenhuma peça usa este material.');
      return;
    }

    const confirmar = window.confirm(
      `Substituir ${totalPecas} peça(s) que usam este material por "${materialNovo.nome}"?\n\n` +
      `As chapas serão reorganizadas automaticamente.`
    );

    if (!confirmar) return;

    // Substituir material em todas as peças
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(peca => {
        if (String(peca.materialId) === antigoIdStr) {
          return {
            ...peca,
            materialId: materialNovo.id, // Usar o ID original do material novo
            material: materialNovo
          };
        }
        return peca;
      })
    }));

    // Atualizar configuração de materiais (copiar config do material antigo para o novo se não existir)
    const materiaisConfig = { ...orcamentoAtual.materiais };
    if (!materiaisConfig[materialNovo.id] && materiaisConfig[materialAntigoId]) {
      materiaisConfig[materialNovo.id] = { ...materiaisConfig[materialAntigoId] };
    }
    // Se não tiver config do material novo, criar uma padrão
    if (!materiaisConfig[materialNovo.id]) {
      materiaisConfig[materialNovo.id] = { ...CONFIG_CHAPA_PADRAO };
    }

    // Criar novo orçamento com as peças atualizadas
    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      materiais: materiaisConfig
    };

    // Reorganizar chapas
    const orcamentoReorganizado = organizarPecasEmChapas(orcamentoAtualizado, materiais);

    aplicarOrcamento(orcamentoReorganizado, true);

    alert(`✅ Material substituído com sucesso!\n${totalPecas} peça(s) atualizada(s).`);
  };

  return { atualizarMaterial, substituirMaterial, salvarPrecosOrcamento, salvarMateriaisOrcamento };
}

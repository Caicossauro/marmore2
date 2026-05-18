import { useState } from 'react';
import { PRECOS_PADRAO } from '../../constants/config';
import { calcularPerdaPorAmbiente } from '../../utils/calculations';
import { AmbienteCard } from './AmbienteCard';
import { ResumoOrcamento } from './ResumoOrcamento';
import { BlocoDeslocamento } from './BlocoDeslocamento';
import { BlocoMaoDeObra } from './BlocoMaoDeObra';
import { Button } from '../ui/Button';

/**
 * Tela de edição de orçamento — alinhada visualmente ao padrão das outras
 * páginas do sistema (Clientes, Orçamentos, Materiais): container único com
 * header bg-gray-100, título + subtítulo, ações à direita.
 *
 * Componente stateless — toda lógica fica no pai.
 */
export function TelaEditorOrcamento({
  orcamentoAtual,
  setOrcamentoAtual,
  materiais,
  orcamentoVersion,
  mostrandoDetalhePeca,
  pecaParaExcluir,
  adicionarAmbiente,
  removerAmbiente,
  renomearAmbiente,
  adicionarPeca,
  onVisualizarPeca,
  setPecaParaExcluir,
  salvarOrcamentoAtual,
}) {
  // Apenas 1 form de "Nova Peça" aberto por vez — necessário pra o preview global
  // (renderizado em portal, fixed no topo da viewport) não duplicar.
  const [ambienteFormAbertoId, setAmbienteFormAbertoId] = useState(null);

  const totalAmbientes = orcamentoAtual.ambientes.length;
  const totalPecas = orcamentoAtual.ambientes.reduce(
    (acc, amb) => acc + (amb.pecas?.length || 0),
    0
  );

  const adicionarAmbienteFromInput = (e) => {
    const input = e.currentTarget.parentElement.querySelector('input');
    if (input?.value.trim()) {
      adicionarAmbiente(input.value);
      input.value = '';
    }
  };

  return (
    <div className="p-0 sm:p-0.5 space-y-2 sm:space-y-3">

      {/* Container único: header + adicionar ambiente + lista de ambientes */}
      <div
        className="bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-all border-2 overflow-hidden"
        style={{ borderColor: '#cbd5e1', borderLeft: '6px solid #475569' }}
      >

        {/* Header — nome do orçamento (editável) + ações */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between px-3 sm:px-5 py-3 sm:py-[18px] border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={orcamentoAtual.nome}
              onChange={(e) => setOrcamentoAtual({ ...orcamentoAtual, nome: e.target.value })}
              className="w-full text-2xl font-bold text-slate-800 leading-tight bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none placeholder-slate-400"
              placeholder="Nome do orçamento"
            />
            <p className="text-xs text-slate-900 mt-0.5">
              {orcamentoAtual.dataCriacao
                ? `Criado em ${new Date(orcamentoAtual.dataCriacao).toLocaleDateString('pt-BR')}`
                : 'Novo orçamento'}
              <span className="text-slate-400"> · </span>
              {totalAmbientes} {totalAmbientes === 1 ? 'ambiente' : 'ambientes'}
              <span className="text-slate-400"> · </span>
              {totalPecas} {totalPecas === 1 ? 'peça' : 'peças'}
            </p>
          </div>

        </div>

        {/* Adicionar ambiente */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Nome do novo ambiente (ex: Cozinha)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  adicionarAmbiente(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <Button variant="primary" size="lg" onClick={adicionarAmbienteFromInput} className="shrink-0">
              + Adicionar Ambiente
            </Button>
          </div>
        </div>

        {/* Lista de ambientes */}
        {totalAmbientes === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Nenhum ambiente cadastrado. Adicione um ambiente acima para começar.
          </div>
        ) : (
          <div
            className="px-2 sm:px-5 py-3 sm:py-5 space-y-4"
            style={{
              opacity: (mostrandoDetalhePeca || pecaParaExcluir) ? 0 : 1,
              pointerEvents: (mostrandoDetalhePeca || pecaParaExcluir) ? 'none' : 'auto',
              transition: 'opacity 0.3s'
            }}
          >
            {(() => {
              const perdaPorAmbiente = calcularPerdaPorAmbiente(orcamentoAtual);
              return orcamentoAtual.ambientes.map((ambiente, idx) => (
                <AmbienteCard
                  key={ambiente.id}
                  ambiente={ambiente}
                  indice={idx}
                  materiais={materiais}
                  materialConfigs={orcamentoAtual.materiais || {}}
                  precos={orcamentoAtual.precos || PRECOS_PADRAO}
                  perda={perdaPorAmbiente[ambiente.id] || 0}
                  onAdicionarPeca={(peca) => adicionarPeca(ambiente.id, peca)}
                  onExcluirAmbiente={() => removerAmbiente(ambiente.id)}
                  onRenomearAmbiente={(novoNome) => renomearAmbiente(ambiente.id, novoNome)}
                  onVisualizarPeca={(peca) => onVisualizarPeca(peca)}
                  onPedirConfirmacaoExclusao={(pecaId, pecaNome) => {
                    setPecaParaExcluir({ pecaId, ambienteId: ambiente.id, pecaNome });
                  }}
                  formAberto={ambienteFormAbertoId === ambiente.id}
                  onAbrirForm={() => setAmbienteFormAbertoId(ambiente.id)}
                  onFecharForm={() => setAmbienteFormAbertoId(null)}
                />
              ));
            })()}
          </div>
        )}
      </div>

      {/* Bloco de Mão de Obra — agrega fixação (por peça) + montagem (por ambiente) */}
      {orcamentoAtual.ambientes && orcamentoAtual.ambientes.some(amb => amb.pecas && amb.pecas.length > 0) && (
        <BlocoMaoDeObra
          orcamento={orcamentoAtual}
          precos={orcamentoAtual.precos || PRECOS_PADRAO}
          onAtualizarAmbiente={(ambienteId, patch) => setOrcamentoAtual({
            ...orcamentoAtual,
            ambientes: orcamentoAtual.ambientes.map(a =>
              a.id === ambienteId ? { ...a, ...patch } : a
            ),
          })}
        />
      )}

      {/* Bloco de Deslocamento — entre a lista de ambientes e o resumo */}
      {orcamentoAtual.ambientes && orcamentoAtual.ambientes.some(amb => amb.pecas && amb.pecas.length > 0) && (
        <BlocoDeslocamento
          deslocamento={orcamentoAtual.deslocamento}
          onChange={(novo) => setOrcamentoAtual({ ...orcamentoAtual, deslocamento: novo })}
          precos={orcamentoAtual.precos || PRECOS_PADRAO}
        />
      )}

      {/* Resumo do Orçamento — mantido fora do container, exibido apenas quando há peças */}
      {orcamentoAtual.ambientes && orcamentoAtual.ambientes.some(amb => amb.pecas && amb.pecas.length > 0) && (
        <ResumoOrcamento
          key={`resumo-${orcamentoAtual.id}-v${orcamentoVersion}`}
          orcamentoAtual={orcamentoAtual}
          materiais={materiais}
          precos={orcamentoAtual.precos || PRECOS_PADRAO}
          onSalvar={async () => {
            try {
              await salvarOrcamentoAtual();
              alert('✅ Orçamento salvo com sucesso!');
            } catch (err) {
              console.error('Falha ao salvar orçamento:', err);
              alert(`❌ Não foi possível salvar o orçamento.\n\nMotivo: ${err?.message || 'erro desconhecido'}\n\nVerifique sua conexão e tente novamente.`);
            }
          }}
        />
      )}
    </div>
  );
}

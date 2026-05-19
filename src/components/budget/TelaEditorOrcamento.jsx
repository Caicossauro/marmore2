import { useState, useMemo } from 'react';
import { PRECOS_PADRAO } from '../../constants/config';
import { calcularPerdaPorAmbiente, calcularCustosPeca, calcularOrcamentoComDetalhes } from '../../utils/calculations';
import { formatBRL } from '../../utils/formatters';
import { AmbienteCard } from './AmbienteCard';
import { ResumoOrcamento } from './ResumoOrcamento';
import { BlocoDeslocamento } from './BlocoDeslocamento';
import { BlocoMaoDeObra } from './BlocoMaoDeObra';
import { Button } from '../ui/Button';

const ABAS = [
  { id: 'ambientes',    label: 'Ambientes'    },
  { id: 'mao-de-obra',  label: 'Mão de Obra'  },
  { id: 'deslocamento', label: 'Deslocamento'  },
  { id: 'resumo',       label: 'Resumo'        },
];

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
  const [aba, setAba] = useState('ambientes');
  const [ambienteFormAbertoId, setAmbienteFormAbertoId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const reordenarAmbientes = (fromId, toId) => {
    const lista = [...orcamentoAtual.ambientes];
    const from = lista.findIndex(a => a.id === fromId);
    const to = lista.findIndex(a => a.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = lista.splice(from, 1);
    lista.splice(to, 0, moved);
    setOrcamentoAtual({ ...orcamentoAtual, ambientes: lista });
  };

  const totalAmbientes = orcamentoAtual.ambientes.length;
  const totalPecas = orcamentoAtual.ambientes.reduce(
    (acc, amb) => acc + (amb.pecas?.length || 0), 0
  );
  const toggleAtivoAmbiente = (ambienteId) => {
    setOrcamentoAtual({
      ...orcamentoAtual,
      ambientes: orcamentoAtual.ambientes.map(a =>
        a.id === ambienteId ? { ...a, ativo: a.ativo === false ? true : false } : a
      ),
    });
  };

  const ambientesAtivos = useMemo(
    () => orcamentoAtual.ambientes.filter(a => a.ativo !== false),
    [orcamentoAtual]
  );

  const totalPecasAtivas = ambientesAtivos.reduce(
    (acc, amb) => acc + (amb.pecas?.length || 0), 0
  );

  const temPecas = totalPecasAtivas > 0;

  const totaisGlobais = useMemo(() => {
    const precos = orcamentoAtual.precos || PRECOS_PADRAO;
    const configs = orcamentoAtual.materiais || {};
    return ambientesAtivos.reduce((acc, amb) => {
      return (amb.pecas || []).reduce((a2, peca) => {
        const cfg = configs[peca.materialId] || { custo: 300, venda: 900 };
        const custos = calcularCustosPeca(peca, cfg, precos);
        const qtd = Number(peca.quantidade) || 1;
        return {
          area:  a2.area  + ((peca.altura * peca.largura) / 1_000_000) * qtd,
          total: a2.total + custos.total,
        };
      }, acc);
    }, { area: 0, total: 0 });
  }, [orcamentoAtual]);

  const orcamentoFiltrado = useMemo(
    () => ({ ...orcamentoAtual, ambientes: ambientesAtivos }),
    [orcamentoAtual, ambientesAtivos]
  );

  const orcamentoCalculado = useMemo(
    () => calcularOrcamentoComDetalhes(orcamentoFiltrado, materiais, orcamentoAtual.precos || PRECOS_PADRAO),
    [orcamentoFiltrado, materiais]
  );

  const adicionarAmbienteFromInput = (e) => {
    const input = e.currentTarget.parentElement.querySelector('input');
    if (input?.value.trim()) {
      adicionarAmbiente(input.value);
      input.value = '';
    }
  };

  return (
    <div className="p-0 sm:p-0.5">
      <div
        className="bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-all border-2 overflow-hidden"
        style={{ borderColor: '#cbd5e1', borderLeft: '6px solid #475569' }}
      >

        {/* ── Header: nome + stats ── */}
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

        {/* ── Barra de abas ── */}
        <div className="flex items-end border-b border-slate-200 bg-white px-3 sm:px-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {ABAS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                aba === tab.id
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Conteúdo da aba ── */}

        {/* Ambientes */}
        {aba === 'ambientes' && (
          <>
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
                  const perdaPorAmbiente = calcularPerdaPorAmbiente(orcamentoFiltrado);
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
                      isDragging={draggingId === ambiente.id}
                      isDragOver={dragOverId === ambiente.id && draggingId !== ambiente.id}
                      onDragStart={() => setDraggingId(ambiente.id)}
                      onDragEnd={() => {
                        if (draggingId && dragOverId && draggingId !== dragOverId) {
                          reordenarAmbientes(draggingId, dragOverId);
                        }
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      onDragOver={() => setDragOverId(ambiente.id)}
                      onToggleAtivo={() => toggleAtivoAmbiente(ambiente.id)}
                    />
                  ));
                })()}
              </div>
            )}

            {/* Cards de Acabamentos, Recortes e Metragem */}
            {temPecas && (orcamentoCalculado.acabamentos > 0 || orcamentoCalculado.recortes > 0 || orcamentoCalculado.adicionais > 0 || orcamentoCalculado.detalhesChapas?.length > 0) && (
              <div className="border-t border-slate-200 px-3 sm:px-5 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {orcamentoCalculado.acabamentos > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-semibold text-slate-700 mb-3">Acabamentos</h4>
                    <div className="space-y-2 flex-1">
                      {(() => {
                        const por = {}, qtd = {};
                        (orcamentoCalculado.detalhesAcabamentos || []).forEach(d => {
                          por[d.tipo] = (por[d.tipo] || 0) + d.valor;
                          qtd[d.tipo] = (qtd[d.tipo] || 0) + 1;
                        });
                        return Object.keys(por).filter(t => por[t] > 0).map((tipo, i, arr) => (
                          <div key={tipo} className={`flex justify-between items-center text-sm ${i < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                            <span className="text-slate-600 font-medium">
                              {tipo}{qtd[tipo] > 1 && <span className="text-slate-400 ml-1 text-xs">×{qtd[tipo]}</span>}
                            </span>
                            <span className="text-slate-700 font-semibold">{formatBRL(por[tipo])}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                      <span className="text-slate-700 font-bold">Total</span>
                      <span className="text-slate-800 font-bold text-base">{formatBRL(orcamentoCalculado.acabamentos)}</span>
                    </div>
                  </div>
                )}
                {orcamentoCalculado.recortes > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-semibold text-slate-700 mb-3">Recortes</h4>
                    <div className="space-y-2 flex-1">
                      {(() => {
                        const por = {}, qtd = {};
                        (orcamentoCalculado.detalhesRecortes || []).forEach(d => {
                          por[d.tipo] = (por[d.tipo] || 0) + d.valor;
                          qtd[d.tipo] = (qtd[d.tipo] || 0) + (d.quantidade || 1);
                        });
                        return Object.keys(por).filter(t => por[t] > 0).map((tipo, i, arr) => (
                          <div key={tipo} className={`flex justify-between items-center text-sm ${i < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                            <span className="text-slate-600 font-medium">
                              {tipo}{qtd[tipo] > 1 && <span className="text-slate-400 ml-1 text-xs">×{qtd[tipo]}</span>}
                            </span>
                            <span className="text-slate-700 font-semibold">{formatBRL(por[tipo])}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                      <span className="text-slate-700 font-bold">Total</span>
                      <span className="text-slate-800 font-bold text-base">{formatBRL(orcamentoCalculado.recortes)}</span>
                    </div>
                  </div>
                )}
                {orcamentoCalculado.adicionais > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-semibold text-slate-700 mb-3">Outros</h4>
                    <div className="space-y-2 flex-1">
                      {(() => {
                        const por = {};
                        (orcamentoCalculado.detalhesAdicionais || []).forEach(d => {
                          const key = d.descricao || 'Outros';
                          por[key] = (por[key] || 0) + d.valor;
                        });
                        return Object.keys(por).filter(k => por[k] !== 0).map((desc, i, arr) => (
                          <div key={desc} className={`flex justify-between items-center text-sm ${i < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                            <span className="text-slate-600 font-medium">{desc}</span>
                            <span className="text-slate-700 font-semibold">{formatBRL(por[desc])}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                      <span className="text-slate-700 font-bold">Total</span>
                      <span className="text-slate-800 font-bold text-base">{formatBRL(orcamentoCalculado.adicionais)}</span>
                    </div>
                  </div>
                )}
                {orcamentoCalculado.detalhesChapas?.length > 0 && (() => {
                  const totalPecasM2  = orcamentoCalculado.detalhesChapas.reduce((s, d) => s + d.areaPecas,  0);
                  const totalVendaM2  = orcamentoCalculado.detalhesChapas.reduce((s, d) => s + d.vendaPecas, 0);
                  const totalSobraM2  = orcamentoCalculado.detalhesChapas.reduce((s, d) => s + d.areaSobra,  0);
                  const totalCustoSob = orcamentoCalculado.detalhesChapas.reduce((s, d) => s + d.custoSobra, 0);
                  const totalGeralM2  = orcamentoCalculado.detalhesChapas.reduce((s, d) => s + d.areaTotal,  0);
                  const aproveitamento = totalGeralM2 > 0 ? (totalPecasM2 / totalGeralM2) * 100 : 0;
                  return (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                      <h4 className="font-semibold text-slate-700 mb-3">Resumo de Metragem</h4>
                      <div className="space-y-2 flex-1">
                        <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                          <span className="text-slate-600 font-medium">Peças Cobradas</span>
                          <div className="text-right">
                            <span className="text-slate-700 font-semibold">{totalPecasM2.toFixed(2)}m²</span>
                            <span className="text-xs text-slate-500 ml-1">({formatBRL(totalVendaM2)})</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                          <span className="text-slate-600 font-medium">Perda Cobrada</span>
                          <div className="text-right">
                            <span className="text-slate-700 font-semibold">{totalSobraM2.toFixed(2)}m²</span>
                            <span className="text-xs text-slate-500 ml-1">({formatBRL(totalCustoSob)} custo)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                        <span className="text-slate-700 font-bold">Total Geral</span>
                        <div className="text-right">
                          <span className="text-slate-800 font-bold text-base">{totalGeralM2.toFixed(2)}m²</span>
                          <span className="text-xs text-slate-500 ml-1">({aproveitamento.toFixed(1)}% aproveitamento)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Barra de totais globais */}
            {temPecas && (
              <div className="border-t-2 border-slate-200 bg-white px-3 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span>
                    <span className="font-semibold text-slate-700">{ambientesAtivos.length}</span>
                    {totalAmbientes !== ambientesAtivos.length && (
                      <span className="text-slate-400">/{totalAmbientes}</span>
                    )}{' '}
                    {totalAmbientes === 1 ? 'ambiente' : 'ambientes'}
                    {totalAmbientes !== ambientesAtivos.length && (
                      <span className="text-slate-400 text-xs ml-1">
                        ({totalAmbientes - ambientesAtivos.length} desativado{totalAmbientes - ambientesAtivos.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    <span className="font-semibold text-slate-700">{totalPecasAtivas}</span>{' '}
                    {totalPecasAtivas === 1 ? 'peça' : 'peças'}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    <span className="font-semibold text-slate-700">{totaisGlobais.area.toFixed(2)} m²</span>{' '}
                    área total
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 leading-tight">Total orçado</p>
                  <p className="text-lg font-bold text-green-700 leading-tight">{formatBRL(totaisGlobais.total)}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mão de Obra */}
        {aba === 'mao-de-obra' && (
          <div className="px-2 sm:px-4 py-4">
            {temPecas ? (
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
            ) : (
              <p className="text-center py-12 text-slate-400 text-sm">
                Adicione peças em um ambiente para calcular a mão de obra.
              </p>
            )}
          </div>
        )}

        {/* Deslocamento */}
        {aba === 'deslocamento' && (
          <div className="px-2 sm:px-4 py-4">
            {temPecas ? (
              <BlocoDeslocamento
                deslocamento={orcamentoAtual.deslocamento}
                onChange={(novo) => setOrcamentoAtual({ ...orcamentoAtual, deslocamento: novo })}
                precos={orcamentoAtual.precos || PRECOS_PADRAO}
              />
            ) : (
              <p className="text-center py-12 text-slate-400 text-sm">
                Adicione peças em um ambiente para configurar o deslocamento.
              </p>
            )}
          </div>
        )}

        {/* Resumo */}
        {aba === 'resumo' && (
          <div className="px-2 sm:px-4 py-4">
            {temPecas ? (
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
            ) : (
              <p className="text-center py-12 text-slate-400 text-sm">
                Adicione peças em um ambiente para ver o resumo do orçamento.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

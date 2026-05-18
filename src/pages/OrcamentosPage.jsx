import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudgets } from '../hooks/useBudgets';
import { useMaterials } from '../hooks/useMaterials';
import { useClientes } from '../hooks/useClientes';
import { saveOrcamento, getOrcamentosColWidths, saveOrcamentosColWidths } from '../utils/database';
import { calcularOrcamentoComDetalhes } from '../utils/calculations';
import { formatBRL } from '../utils/formatters';
import { PRECOS_PADRAO, STORAGE_KEYS } from '../constants/config';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { Paginador } from '../components/layout/Paginador';
import { SearchIcon } from '../constants/icons';
import { FiltroColuna, ResizeHandle } from '../components/layout/TabelaFiltros';
import { useTabelaListagem } from '../hooks/useTabelaListagem';
import { ModalNovoOrcamentoPagina } from '../components/modals/ModalNovoOrcamentoPagina';
import { ModalNovoClienteRapido } from '../components/modals/ModalNovoClienteRapido';
import { Button } from '../components/ui/Button';

const ITENS_POR_PAGINA = 13;

const COL_MIN    = { nome: 140, cliente: 120, dataCriacao: 80, ambientes: 80, total: 100 };
const COL_ORDER  = ['nome', 'cliente', 'dataCriacao', 'ambientes', 'total'];
const COL_WIDTHS_DEFAULT = { nome: 240, cliente: 180, dataCriacao: 100, ambientes: 100, total: 130 };

export default function OrcamentosPage() {
  const navigate = useNavigate();
  const {
    orcamentos,
    setOrcamentos,
    excluirOrcamento,
    mostrarModalNovoOrcamento,
    abrirModalNovoOrcamento,
    fecharModalNovoOrcamento,
    criarOrcamento,
    carregando,
  } = useBudgets();
  const { materiais } = useMaterials();
  const { clientes, salvarCliente } = useClientes();

  const [orcamentoParaExcluir, setOrcamentoParaExcluir]       = useState(null);
  const [mostrarModalNovoCliente, setMostrarModalNovoCliente] = useState(false);

  const buscarCliente = useCallback((id) => {
    if (!id) return null;
    return clientes.find(c => c.id === id) ?? null;
  }, [clientes]);

  const enriquecidos = useMemo(() => orcamentos.map(orc => {
    const cliente     = buscarCliente(orc.clienteId);
    const clienteNome = orc.clienteId ? (cliente ? cliente.nome : 'Cliente removido') : '';
    const orcCalc     = calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO);
    return { orc, cliente, clienteNome, total: orcCalc.vendaTotal };
  }), [orcamentos, materiais, buscarCliente]);

  const filtroFn = useCallback((item, busca, filtrosColuna) => {
    const { orc, clienteNome } = item;
    const q = busca.toLowerCase();
    const matchBusca = !busca ||
      (orc.nome ?? '').toLowerCase().includes(q) ||
      clienteNome.toLowerCase().includes(q);
    const matchNome    = !filtrosColuna.nome    || (orc.nome ?? '').toLowerCase().includes(filtrosColuna.nome.toLowerCase());
    const matchCliente = !filtrosColuna.cliente || clienteNome.toLowerCase().includes(filtrosColuna.cliente.toLowerCase());
    return matchBusca && matchNome && matchCliente;
  }, []);

  const sortFn = useCallback((a, b, ordenacao) => {
    const mult = ordenacao.direcao === 'asc' ? 1 : -1;
    switch (ordenacao.coluna) {
      case 'nome':
        return mult * (a.orc.nome ?? '').localeCompare(b.orc.nome ?? '', 'pt-BR', { sensitivity: 'base' });
      case 'cliente':
        return mult * a.clienteNome.localeCompare(b.clienteNome, 'pt-BR', { sensitivity: 'base' });
      case 'dataCriacao': {
        const da  = a.orc.dataCriacao ? new Date(a.orc.dataCriacao).getTime() : 0;
        const db_ = b.orc.dataCriacao ? new Date(b.orc.dataCriacao).getTime() : 0;
        return mult * (da - db_);
      }
      case 'ambientes':
        return mult * ((a.orc.ambientes?.length ?? 0) - (b.orc.ambientes?.length ?? 0));
      case 'total':
        return mult * ((a.total ?? 0) - (b.total ?? 0));
      default:
        return 0;
    }
  }, []);

  const {
    buscaInput, setBuscaInput,
    buscaAberta, setBuscaAberta,
    filtroAberto,
    filtrosColuna,
    ordenacao,
    pagina, setPagina,
    colWidths,
    searchRef,
    tableWrapperRef,
    filtrados,
    paginaAtual,
    totalPaginas,
    temFiltroAtivo,
    handleOrdenar,
    handleFiltrar,
    handleToggleFiltro,
    handleResizeDelta,
  } = useTabelaListagem({
    dados: enriquecidos,
    itensPorPagina: ITENS_POR_PAGINA,
    colWidthsDefault: COL_WIDTHS_DEFAULT,
    colWidthsKey: STORAGE_KEYS.ORCAMENTOS_COL_WIDTHS,
    colWidthsLoader: getOrcamentosColWidths,
    colWidthsSaver: saveOrcamentosColWidths,
    colMin: COL_MIN,
    colOrder: COL_ORDER,
    filtrosInicial: { nome: '', cliente: '', dataCriacao: '' },
    ordenacaoInicial: { coluna: 'dataCriacao', direcao: 'desc' },
    filtroFn,
    sortFn,
  });

  const handleCriarOrcamento = async (clienteSelecionado, descricao) => {
    const nome = descricao
      ? `${clienteSelecionado.nome} - ${descricao}`
      : clienteSelecionado.nome;
    const novo = await criarOrcamento(nome, undefined, clienteSelecionado.id);
    if (novo?.id) {
      fecharModalNovoOrcamento();
      navigate(`/orcamentos/${novo.id}`);
    }
  };

  const handleCriarClienteRapido = async (dadosCliente) => {
    await salvarCliente(dadosCliente);
    setMostrarModalNovoCliente(false);
  };

  const duplicar = useCallback((orc) => {
    const copia = {
      ...orc,
      nome: `${orc.nome} (Cópia)`,
      dataCriacao: new Date().toISOString(),
      ambientes: orc.ambientes.map(amb => ({
        ...amb,
        id: Date.now() + Math.random(),
        pecas: amb.pecas.map(peca => ({ ...peca, id: Date.now() + Math.random() })),
      })),
      chapas: orc.chapas.map(chapa => ({ ...chapa, id: Date.now() + Math.random() })),
    };
    saveOrcamento({ ...copia, id: undefined })
      .then(salvo => {
        setOrcamentos(prev => [...prev, salvo || { ...copia, id: Date.now() }]);
      })
      .catch(err => {
        console.error('Erro ao duplicar orçamento:', err);
        alert(`❌ Não foi possível duplicar o orçamento.\n\nMotivo: ${err?.message || 'erro desconhecido'}`);
      });
  }, [setOrcamentos]);

  const tbodyRows = useMemo(() => paginaAtual.map(({ orc, clienteNome, total }) => {
    const clienteRemovido = clienteNome === 'Cliente removido';
    return (
      <tr
        key={orc.id}
        onClick={() => navigate(`/orcamentos/${orc.id}`)}
        className="marble-row-hover cursor-pointer"
      >
        <td className="mrow-cell px-5 py-3 font-medium text-slate-800 overflow-hidden">
          <span className="truncate block">
            {orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}
          </span>
        </td>
        <td className="mrow-cell px-5 py-3 text-slate-600 overflow-hidden hidden sm:table-cell">
          {clienteNome
            ? <span className={`truncate block ${clienteRemovido ? 'text-slate-400 italic' : ''}`}>{clienteNome}</span>
            : <span className="text-slate-300">—</span>}
        </td>
        <td className="mrow-cell px-5 py-3 text-slate-500 overflow-hidden hidden lg:table-cell">
          <span className="truncate block text-sm">
            {orc.dataCriacao
              ? new Date(orc.dataCriacao).toLocaleDateString('pt-BR')
              : <span className="text-slate-300">—</span>}
          </span>
        </td>
        <td className="mrow-cell px-5 py-3 text-slate-600 overflow-hidden hidden md:table-cell">
          <span className="truncate block">{orc.ambientes?.length ?? 0}</span>
        </td>
        <td className="mrow-cell px-5 py-3 font-semibold text-slate-800 overflow-hidden whitespace-nowrap">
          <span className="truncate block">{formatBRL(total)}</span>
        </td>
        <td className="mrow-cell sticky right-0 z-[2] acoes-sticky px-5 py-3 text-center overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => duplicar(orc)}
              className="duplicar-btn text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
              title="Duplicar"
            >
              Duplicar
            </button>
            <button
              onClick={() => setOrcamentoParaExcluir(orc.id)}
              className="excluir-btn text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            >
              Excluir
            </button>
          </div>
        </td>
      </tr>
    );
  }), [paginaAtual, navigate, duplicar]);

  return (
    <div className="p-6">
      <div className={`bg-gray-100 rounded-lg shadow-sm border border-slate-200 ${filtroAberto ? 'overflow-visible' : 'overflow-hidden'}`}>

        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between px-5 py-[18px] border-b border-slate-200">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">Orçamentos</h1>
            <p className="text-xs text-slate-900 mt-0.5">
              {orcamentos.length} {orcamentos.length === 1 ? 'orçamento' : 'orçamentos'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div
              className="overflow-hidden transition-[width,opacity] duration-300 ease-in-out"
              style={{ width: buscaAberta ? '280px' : '0', opacity: buscaAberta ? 1 : 0 }}
            >
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nome ou cliente..."
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setBuscaInput(''); setBuscaAberta(false); } }}
                style={{ width: '280px' }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none bg-white"
              />
            </div>
            <button
              onClick={() => setBuscaAberta(v => !v)}
              title="Buscar orçamento"
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${buscaAberta || buscaInput ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <SearchIcon size={16} />
            </button>
            <Button variant="primary" size="lg" onClick={abrirModalNovoOrcamento} className="shrink-0 w-full sm:w-auto">
              + Novo Orçamento
            </Button>
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {temFiltroAtivo ? 'Nenhum orçamento encontrado com os filtros aplicados.' : 'Nenhum orçamento criado.'}
          </div>
        ) : (
          <div ref={tableWrapperRef} className={filtroAberto ? 'overflow-visible' : 'overflow-x-auto'}>
            <table className="w-full min-w-0" style={{ tableLayout: 'fixed', width: '100%', minWidth: colWidths.nome + 130 }}>
              <thead className="relative z-20">
                <tr className="bg-marble border-b border-white/10 text-left">

                  <th style={{ width: colWidths.nome }} className="header-th px-5 py-3 text-white relative overflow-visible">
                    <FiltroColuna coluna="nome" label="Orçamento" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.nome} onFiltrar={handleFiltrar} aberto={filtroAberto === 'nome'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="nome" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.cliente }} className="header-th px-5 py-3 text-white relative overflow-visible hidden sm:table-cell">
                    <FiltroColuna coluna="cliente" label="Cliente" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.cliente} onFiltrar={handleFiltrar} aberto={filtroAberto === 'cliente'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="cliente" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.dataCriacao }} className="header-th px-5 py-3 text-white relative overflow-visible hidden lg:table-cell">
                    <FiltroColuna coluna="dataCriacao" label="Data" tipo="data" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.dataCriacao} onFiltrar={handleFiltrar} aberto={filtroAberto === 'dataCriacao'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="dataCriacao" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.ambientes }} className="header-th px-5 py-3 text-white relative overflow-visible hidden md:table-cell">
                    <FiltroColuna coluna="ambientes" label="Ambientes" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro="" onFiltrar={() => {}} aberto={false} onToggle={handleToggleFiltro} tipo="numero" />
                    <ResizeHandle coluna="ambientes" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.total }} className="header-th px-5 py-3 text-white relative overflow-visible">
                    <FiltroColuna coluna="total" label="Total" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro="" onFiltrar={() => {}} aberto={false} onToggle={handleToggleFiltro} tipo="numero" />
                    <ResizeHandle coluna="total" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: 130, minWidth: 130, maxWidth: 130 }} className="header-th sticky right-0 z-[1] bg-marble px-5 py-3 font-semibold text-white text-center acoes-th-sticky">
                    Ações
                  </th>

                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tbodyRows}
              </tbody>
            </table>
          </div>
        )}

        {filtrados.length > 0 && (
          <div className="px-5 pb-4">
            <Paginador pagina={pagina} totalPaginas={totalPaginas} onMudarPagina={setPagina} />
          </div>
        )}
      </div>

      {mostrarModalNovoOrcamento && (
        <ModalNovoOrcamentoPagina
          clientes={clientes}
          onCriar={handleCriarOrcamento}
          onCancelar={fecharModalNovoOrcamento}
          onAbrirNovoCliente={() => setMostrarModalNovoCliente(true)}
        />
      )}

      {mostrarModalNovoCliente && (
        <ModalNovoClienteRapido
          onCriar={handleCriarClienteRapido}
          onCancelar={() => setMostrarModalNovoCliente(false)}
        />
      )}

      {orcamentoParaExcluir && (
        <ConfirmDialog
          mensagem="Deseja realmente excluir este orçamento? Esta ação não pode ser desfeita."
          onConfirmar={() => { excluirOrcamento(orcamentoParaExcluir); setOrcamentoParaExcluir(null); }}
          onCancelar={() => setOrcamentoParaExcluir(null)}
        />
      )}
    </div>
  );
}

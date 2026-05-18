import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '../hooks/useClientes';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { Paginador } from '../components/layout/Paginador';
import { SearchIcon } from '../constants/icons';
import { FiltroColuna, ResizeHandle } from '../components/layout/TabelaFiltros';
import { getClientesColWidths, saveClientesColWidths } from '../utils/database';
import { STORAGE_KEYS } from '../constants/config';
import { useTabelaListagem } from '../hooks/useTabelaListagem';
import { Button } from '../components/ui/Button';

const ITENS_POR_PAGINA = 13;
const COL_WIDTHS_DEFAULT = { nome: 320, telefone: 140, cidade: 140, dataCriacao: 100 };
const COL_MIN   = { nome: 120, telefone: 108, cidade: 108, dataCriacao: 80 };
const COL_ORDER = ['nome', 'telefone', 'cidade', 'dataCriacao'];

export default function ClientesPage() {
  const navigate = useNavigate();
  const { clientes, carregando, excluirCliente } = useClientes();

  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);

  const filtroFn = useCallback((cliente, busca, filtrosColuna) => {
    const q = busca.toLowerCase();
    const matchBusca = !busca ||
      cliente.nome.toLowerCase().includes(q) ||
      (cliente.telefone ?? '').includes(q) ||
      (cliente.endereco?.cidade ?? '').toLowerCase().includes(q);
    const matchNome     = !filtrosColuna.nome     || cliente.nome.toLowerCase().includes(filtrosColuna.nome.toLowerCase());
    const matchTelefone = !filtrosColuna.telefone || (cliente.telefone ?? '').includes(filtrosColuna.telefone);
    const matchCidade   = !filtrosColuna.cidade   || (cliente.endereco?.cidade ?? '').toLowerCase().includes(filtrosColuna.cidade.toLowerCase());
    return matchBusca && matchNome && matchTelefone && matchCidade;
  }, []);

  const sortFn = useCallback((a, b, ordenacao) => {
    const mult = ordenacao.direcao === 'asc' ? 1 : -1;
    if (ordenacao.coluna === 'nome')
      return mult * a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    if (ordenacao.coluna === 'telefone')
      return mult * (a.telefone ?? '').localeCompare(b.telefone ?? '', 'pt-BR', { sensitivity: 'base' });
    if (ordenacao.coluna === 'cidade')
      return mult * (a.endereco?.cidade ?? '').localeCompare(b.endereco?.cidade ?? '', 'pt-BR', { sensitivity: 'base' });
    if (ordenacao.coluna === 'dataCriacao')
      return mult * (new Date(a.criadoEm ?? 0).getTime() - new Date(b.criadoEm ?? 0).getTime());
    return 0;
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
    dados: clientes,
    itensPorPagina: ITENS_POR_PAGINA,
    colWidthsDefault: COL_WIDTHS_DEFAULT,
    colWidthsKey: STORAGE_KEYS.CLIENTES_COL_WIDTHS,
    colWidthsLoader: getClientesColWidths,
    colWidthsSaver: saveClientesColWidths,
    colMin: COL_MIN,
    colOrder: COL_ORDER,
    filtrosInicial: { nome: '', telefone: '', cidade: '' },
    ordenacaoInicial: { coluna: 'nome', direcao: 'asc' },
    filtroFn,
    sortFn,
  });

  const tbodyRows = useMemo(() => paginaAtual.map(cliente => (
    <tr
      key={cliente.id}
      onClick={() => navigate(`/clientes/${cliente.id}`)}
      className="marble-row-hover cursor-pointer"
    >
      <td className="mrow-cell px-5 py-3 font-medium text-slate-800 overflow-hidden">
        <span className="truncate block">{cliente.nome}</span>
      </td>
      <td className="mrow-cell px-5 py-3 text-slate-600 overflow-hidden hidden sm:table-cell">
        <span className="truncate block">{cliente.telefone || <span className="text-slate-300">—</span>}</span>
      </td>
      <td className="mrow-cell px-5 py-3 text-slate-600 overflow-hidden hidden md:table-cell">
        <span className="truncate block">
          {cliente.endereco?.cidade
            ? `${cliente.endereco.cidade}${cliente.endereco.uf ? ` / ${cliente.endereco.uf}` : ''}`
            : <span className="text-slate-300">—</span>
          }
        </span>
      </td>
      <td className="mrow-cell px-5 py-3 text-slate-500 overflow-hidden hidden lg:table-cell">
        <span className="truncate block text-sm">
          {cliente.criadoEm
            ? new Date(cliente.criadoEm).toLocaleDateString('pt-BR')
            : <span className="text-slate-300">—</span>
          }
        </span>
      </td>
      <td className="mrow-cell sticky right-0 z-[2] acoes-sticky px-5 py-3 text-center overflow-hidden" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setClienteParaExcluir(cliente.id)}
          className="excluir-btn text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
        >
          Excluir
        </button>
      </td>
    </tr>
  )), [paginaAtual, navigate]);

  return (
    <div className="p-6">
      <div className={`bg-gray-100 rounded-lg shadow-sm border border-slate-200 ${filtroAberto ? 'overflow-visible' : 'overflow-hidden'}`}>

        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between px-5 py-[18px] border-b border-slate-200">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">Clientes</h1>
            <p className="text-xs text-slate-900 mt-0.5">{clientes.length} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out"
              style={{ maxWidth: buscaAberta ? '280px' : '0', opacity: buscaAberta ? 1 : 0 }}
            >
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nome, telefone ou cidade..."
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setBuscaInput(''); setBuscaAberta(false); }
                }}
                style={{ minWidth: '260px' }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none bg-white"
              />
            </div>

            <button
              onClick={() => setBuscaAberta(v => !v)}
              title="Buscar clientes"
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${buscaAberta || buscaInput ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <SearchIcon size={16} />
            </button>
            <Button variant="primary" size="lg" onClick={() => navigate('/clientes/novo')} className="shrink-0 w-full sm:w-auto">
              + Novo Cliente
            </Button>
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {temFiltroAtivo ? 'Nenhum cliente encontrado com os filtros aplicados.' : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <div ref={tableWrapperRef} className={filtroAberto ? 'overflow-visible' : 'overflow-x-auto'}>
            <table className="w-full min-w-0" style={{ tableLayout: 'fixed', width: '100%', minWidth: colWidths.nome + 100 }}>
              <thead className="relative z-20">
                <tr className="bg-marble border-b border-white/10 text-left">
                  <th style={{ width: colWidths.nome }} className="header-th px-5 py-3 text-white relative overflow-visible">
                    <FiltroColuna coluna="nome" label="Nome" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.nome} onFiltrar={handleFiltrar} aberto={filtroAberto === 'nome'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="nome" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.telefone }} className="header-th px-5 py-3 text-white relative overflow-visible hidden sm:table-cell">
                    <FiltroColuna coluna="telefone" label="Telefone" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.telefone} onFiltrar={handleFiltrar} aberto={filtroAberto === 'telefone'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="telefone" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.cidade }} className="header-th px-5 py-3 text-white relative overflow-visible hidden md:table-cell">
                    <FiltroColuna coluna="cidade" label="Cidade" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.cidade} onFiltrar={handleFiltrar} aberto={filtroAberto === 'cidade'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="cidade" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.dataCriacao }} className="header-th px-5 py-3 text-white relative overflow-visible hidden lg:table-cell">
                    <FiltroColuna coluna="dataCriacao" label="Criação" tipo="data" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro="" onFiltrar={() => {}} aberto={filtroAberto === 'dataCriacao'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="dataCriacao" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: 100, minWidth: 100, maxWidth: 100 }} className="header-th sticky right-0 z-[1] bg-marble px-5 py-3 font-semibold text-white text-center acoes-th-sticky">
                    <span className="relative">Ações</span>
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

      {clienteParaExcluir && (
        <ConfirmDialog
          mensagem="Deseja realmente excluir este cliente? Orçamentos vinculados a ele não serão afetados."
          onConfirmar={() => { excluirCliente(clienteParaExcluir); setClienteParaExcluir(null); }}
          onCancelar={() => setClienteParaExcluir(null)}
        />
      )}
    </div>
  );
}

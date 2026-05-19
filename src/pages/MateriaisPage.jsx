import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterials } from '../hooks/useMaterials';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { SearchIcon } from '../constants/icons';
import { FiltroColuna, ResizeHandle } from '../components/layout/TabelaFiltros';
import { getMateriaColumWidths, saveMateriaColumWidths } from '../utils/database';
import { STORAGE_KEYS } from '../constants/config';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { MateriaisIcon } from '../constants/icons';
import { useToast } from '../contexts/ToastContext';

const ITENS_POR_PAGINA = 13;

const COL_MIN    = { nome: 120, tipo: 90, acabamento: 90, origem: 90, dimensoes: 110 };
const COL_ORDER  = ['nome', 'tipo', 'acabamento', 'origem', 'dimensoes'];
const COL_WIDTHS_DEFAULT = { nome: 260, tipo: 130, acabamento: 130, origem: 130, dimensoes: 150 };
const COL_WIDTHS_KEY = STORAGE_KEYS.MATERIAIS_COL_WIDTHS;

const Paginador = ({ pagina, totalPaginas, onMudarPagina }) => {
  if (totalPaginas <= 1) return null;
  const btn = 'px-3 py-1 text-sm rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  return (
    <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-200 mt-3">
      <button onClick={() => onMudarPagina(1)} disabled={pagina === 1} className={btn}>«</button>
      <button onClick={() => onMudarPagina(pagina - 1)} disabled={pagina === 1} className={btn}>‹</button>
      <span className="text-sm text-slate-600 px-2">
        Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
      </span>
      <button onClick={() => onMudarPagina(pagina + 1)} disabled={pagina === totalPaginas} className={btn}>›</button>
      <button onClick={() => onMudarPagina(totalPaginas)} disabled={pagina === totalPaginas} className={btn}>»</button>
    </div>
  );
};

const formatDimLinha = (d) => {
  const partes = [d.largura, d.altura, d.espessura].filter(v => v != null && v !== '');
  return partes.length ? partes.join(' × ') + ' mm' : null;
};

const formatDim = (m) => {
  if (m.dimensoes?.length) {
    const linhas = m.dimensoes.map(formatDimLinha).filter(Boolean);
    return linhas.length ? linhas.join(' / ') : null;
  }
  return formatDimLinha(m);
};

export default function MateriaisPage() {
  const navigate = useNavigate();
  const { materiais, excluirMaterial, carregando } = useMaterials();

  const toast = useToast();

  const [buscaInput, setBuscaInput]                   = useState('');
  const [busca, setBusca]                             = useState('');
  const [buscaAberta, setBuscaAberta]                 = useState(false);
  const [filtroAberto, setFiltroAberto]               = useState(null);
  const [filtrosColuna, setFiltrosColuna]             = useState({ nome: '', tipo: '', acabamento: '', origem: '' });
  const [ordenacao, setOrdenacao]                     = useState({ coluna: 'nome', direcao: 'asc' });
  const [pagina, setPagina]                           = useState(1);
  const [materialParaExcluir, setMaterialParaExcluir] = useState(null);
  const [colWidths, setColWidths]                     = useState(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_KEY);
      return saved ? { ...COL_WIDTHS_DEFAULT, ...JSON.parse(saved) } : COL_WIDTHS_DEFAULT;
    } catch { return COL_WIDTHS_DEFAULT; }
  });
  const [colWidthsLoaded, setColWidthsLoaded] = useState(false);

  const searchRef            = useRef(null);
  const tableWrapperRef      = useRef(null);
  const saveWidthsTimeout    = useRef(null);
  const skipInitialSaveRef   = useRef(true);

  useEffect(() => {
    if (buscaAberta) searchRef.current?.focus();
    else             searchRef.current?.blur();
  }, [buscaAberta]);

  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput); setPagina(1); }, 300);
    return () => clearTimeout(t);
  }, [buscaInput]);

  useEffect(() => {
    const carregarLarguras = async () => {
      const saved = await getMateriaColumWidths();
      if (saved && typeof saved === 'object') {
        setColWidths(prev => ({ ...prev, ...saved }));
      }
      setColWidthsLoaded(true);
    };
    carregarLarguras();
  }, []);

  useEffect(() => {
    if (!colWidthsLoaded) return;
    if (skipInitialSaveRef.current) { skipInitialSaveRef.current = false; return; }
    clearTimeout(saveWidthsTimeout.current);
    saveWidthsTimeout.current = setTimeout(() => saveMateriaColumWidths(colWidths), 600);
  }, [colWidths, colWidthsLoaded]);

  const handleOrdenar = useCallback((coluna, direcao) => setOrdenacao({ coluna, direcao }), []);

  const handleFiltrar = useCallback((coluna, valor) => {
    setFiltrosColuna(prev => ({ ...prev, [coluna]: valor }));
    setPagina(1);
  }, []);

  const handleToggleFiltro = useCallback((coluna) => setFiltroAberto(coluna), []);

  const handleResizeDelta = useCallback((coluna, delta) => {
    setColWidths(prev => {
      const currMin = COL_MIN[coluna] ?? 80;
      const idx     = COL_ORDER.indexOf(coluna);
      const nextCol = COL_ORDER[idx + 1];

      if (!nextCol || prev[nextCol] == null) {
        const containerW = tableWrapperRef.current?.clientWidth ?? 0;
        const otherSum   = Object.entries(prev).filter(([k]) => k !== coluna).reduce((a, [, v]) => a + v, 0);
        const max = containerW > 0 ? Math.max(currMin, containerW - otherSum - 114) : 9999;
        return { ...prev, [coluna]: Math.min(max, Math.max(currMin, prev[coluna] + delta)) };
      }

      const nextMin = COL_MIN[nextCol] ?? 80;
      if (delta > 0) {
        const bPode  = prev[nextCol] - nextMin;
        const actual = Math.min(delta, bPode);
        return { ...prev, [coluna]: prev[coluna] + actual, [nextCol]: prev[nextCol] - actual };
      } else {
        const aPode  = prev[coluna] - currMin;
        const actual = Math.min(-delta, aPode);
        return { ...prev, [coluna]: prev[coluna] - actual, [nextCol]: prev[nextCol] + actual };
      }
    });
  }, []);

  const filtrados = useMemo(() => materiais
    .filter(m => {
      const q = busca.toLowerCase();
      const matchBusca = !busca ||
        (m.nome ?? '').toLowerCase().includes(q) ||
        (m.tipo ?? '').toLowerCase().includes(q) ||
        (m.acabamento ?? '').toLowerCase().includes(q) ||
        (m.origem ?? '').toLowerCase().includes(q);
      const matchNome       = !filtrosColuna.nome       || (m.nome ?? '').toLowerCase().includes(filtrosColuna.nome.toLowerCase());
      const matchTipo       = !filtrosColuna.tipo       || (m.tipo ?? '').toLowerCase().includes(filtrosColuna.tipo.toLowerCase());
      const matchAcabamento = !filtrosColuna.acabamento || (m.acabamento ?? '').toLowerCase().includes(filtrosColuna.acabamento.toLowerCase());
      const matchOrigem     = !filtrosColuna.origem     || (m.origem ?? '').toLowerCase().includes(filtrosColuna.origem.toLowerCase());
      return matchBusca && matchNome && matchTipo && matchAcabamento && matchOrigem;
    })
    .slice()
    .sort((a, b) => {
      const mult = ordenacao.direcao === 'asc' ? 1 : -1;
      const va = (a[ordenacao.coluna] ?? '').toString();
      const vb = (b[ordenacao.coluna] ?? '').toString();
      return mult * va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' });
    }),
  [materiais, busca, filtrosColuna, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));

  useEffect(() => { if (pagina > totalPaginas) setPagina(totalPaginas); }, [pagina, totalPaginas]);

  const pagina_ = useMemo(
    () => filtrados.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA),
    [filtrados, pagina]
  );

  const tbodyRows = useMemo(() => pagina_.map(material => (
    <tr
      key={material.id}
      onClick={() => navigate(`/materiais/${material.id}`)}
      className="hover:bg-slate-50 cursor-pointer transition-colors duration-150"
    >
      <td className="px-5 py-3 font-medium text-slate-800 overflow-hidden">
        <span className="truncate block">{material.nome}</span>
      </td>
      <td className="px-5 py-3 text-slate-600 overflow-hidden">
        <span className="truncate block">{material.tipo || <span className="text-slate-300">—</span>}</span>
      </td>
      <td className="px-5 py-3 text-slate-600 overflow-hidden">
        <span className="truncate block">{material.acabamento || <span className="text-slate-300">—</span>}</span>
      </td>
      <td className="px-5 py-3 text-slate-600 overflow-hidden">
        <span className="truncate block">{material.origem || <span className="text-slate-300">—</span>}</span>
      </td>
      <td className="px-5 py-3 text-slate-500 overflow-hidden">
        <span className="truncate block text-sm">{formatDim(material) ?? <span className="text-slate-300">—</span>}</span>
      </td>
      <td className="sticky right-0 z-[2] acoes-sticky px-5 py-3 text-center overflow-hidden" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMaterialParaExcluir(material.id)}
          className="text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
        >
          Excluir
        </button>
      </td>
    </tr>
  )), [pagina_, navigate, setMaterialParaExcluir]);

  const temFiltroAtivo = buscaInput || Object.values(filtrosColuna).some(Boolean);

  return (
    <div className="p-1 sm:p-2">
      <PageHeader
        titulo="Materiais"
        subtitulo={`${materiais.length} cadastrado${materiais.length !== 1 ? 's' : ''}`}
        acoes={
          <>
            <div
              className="overflow-hidden transition-[width,opacity] duration-300 ease-in-out"
              style={{ width: buscaAberta ? '280px' : '0', opacity: buscaAberta ? 1 : 0 }}
            >
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nome, tipo, origem..."
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setBuscaInput(''); setBusca(''); setBuscaAberta(false); } }}
                style={{ width: '280px' }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none bg-white"
              />
            </div>
            <button
              onClick={() => setBuscaAberta(v => !v)}
              title="Buscar material"
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${buscaAberta || buscaInput ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <SearchIcon size={16} />
            </button>
            <Button variant="primary" size="lg" onClick={() => navigate('/materiais/novo')} className="shrink-0">
              + Novo Material
            </Button>
          </>
        }
      />

      <div className={`bg-gray-100 rounded-lg shadow-sm border border-slate-200 ${filtroAberto ? 'overflow-visible' : 'overflow-hidden'}`}>

        {carregando ? (
          <TableSkeleton linhas={7} />
        ) : filtrados.length === 0 ? (
          temFiltroAtivo ? (
            <EmptyState
              icone={MateriaisIcon}
              titulo="Nenhum material encontrado"
              descricao="Tente ajustar ou limpar os filtros aplicados."
            />
          ) : (
            <EmptyState
              icone={MateriaisIcon}
              titulo="Nenhum material cadastrado ainda"
              descricao="Adicione materiais para usá-los nos orçamentos."
              acao={
                <Button variant="primary" size="sm" onClick={() => navigate('/materiais/novo')}>
                  + Novo Material
                </Button>
              }
            />
          )
        ) : (
          <div ref={tableWrapperRef} className={filtroAberto ? 'overflow-visible' : 'overflow-x-auto'}>
            <table className="w-full min-w-0" style={{ tableLayout: 'fixed', width: '100%', minWidth: colWidths.nome + 100 }}>
              <thead className="relative z-20">
                <tr className="bg-sidebar border-b border-white/10 text-left">

                  <th style={{ width: colWidths.nome }} className="header-th px-5 py-4 text-white relative overflow-visible">
                    <FiltroColuna coluna="nome" label="Nome" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.nome} onFiltrar={handleFiltrar} aberto={filtroAberto === 'nome'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="nome" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.tipo }} className="header-th px-5 py-4 text-white relative overflow-visible">
                    <FiltroColuna coluna="tipo" label="Tipo" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.tipo} onFiltrar={handleFiltrar} aberto={filtroAberto === 'tipo'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="tipo" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.acabamento }} className="header-th px-5 py-4 text-white relative overflow-visible">
                    <FiltroColuna coluna="acabamento" label="Acabamento" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.acabamento} onFiltrar={handleFiltrar} aberto={filtroAberto === 'acabamento'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="acabamento" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.origem }} className="header-th px-5 py-4 text-white relative overflow-visible">
                    <FiltroColuna coluna="origem" label="Origem" ordenacao={ordenacao} onOrdenar={handleOrdenar} filtro={filtrosColuna.origem} onFiltrar={handleFiltrar} aberto={filtroAberto === 'origem'} onToggle={handleToggleFiltro} />
                    <ResizeHandle coluna="origem" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: colWidths.dimensoes }} className="header-th px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-white/60 relative overflow-hidden">
                    Dimensões
                    <ResizeHandle coluna="dimensoes" onResizeDelta={handleResizeDelta} />
                  </th>

                  <th style={{ width: 100, minWidth: 100, maxWidth: 100 }} className="header-th sticky right-0 z-[1] bg-sidebar px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-white/60 text-center acoes-th-sticky">
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

      {materialParaExcluir && (
        <ConfirmDialog
          mensagem="Deseja realmente excluir este material? Orçamentos que o usam podem ficar inconsistentes."
          onConfirmar={() => { excluirMaterial(materialParaExcluir); setMaterialParaExcluir(null); toast.success('Material excluído.'); }}
          onCancelar={() => setMaterialParaExcluir(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Hook que encapsula busca+debounce, filtros por coluna, ordenação,
 * paginação e resize de colunas para as páginas de listagem.
 *
 * @param {object} opts
 * @param {Array}    opts.dados           - array de dados brutos
 * @param {number}   opts.itensPorPagina
 * @param {object}   opts.colWidthsDefault
 * @param {string}   opts.colWidthsKey    - chave localStorage (fallback síncrono)
 * @param {Function} opts.colWidthsLoader - async () => object | null
 * @param {Function} opts.colWidthsSaver  - async (widths) => void
 * @param {object}   opts.colMin          - { [col]: minWidth }
 * @param {Array}    opts.colOrder        - ordem das colunas para resize swap
 * @param {object}   opts.filtrosInicial  - { [col]: '' }
 * @param {object}   opts.ordenacaoInicial - { coluna, direcao }
 * @param {Function} opts.filtroFn        - (item, busca, filtrosColuna) => bool
 * @param {Function} opts.sortFn          - (a, b, ordenacao) => number
 */
export function useTabelaListagem({
  dados,
  itensPorPagina,
  colWidthsDefault,
  colWidthsKey,
  colWidthsLoader,
  colWidthsSaver,
  colMin,
  colOrder,
  filtrosInicial,
  ordenacaoInicial,
  filtroFn,
  sortFn,
}) {
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca]           = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(null);
  const [filtrosColuna, setFiltrosColuna] = useState(filtrosInicial);
  const [ordenacao, setOrdenacao] = useState(ordenacaoInicial);
  const [pagina, setPagina] = useState(1);
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(colWidthsKey);
      return saved ? { ...colWidthsDefault, ...JSON.parse(saved) } : colWidthsDefault;
    } catch {
      return colWidthsDefault;
    }
  });
  const [colWidthsLoaded, setColWidthsLoaded] = useState(false);

  const searchRef         = useRef(null);
  const tableWrapperRef   = useRef(null);
  const saveWidthsTimeout = useRef(null);
  const skipInitialSaveRef = useRef(true);

  useEffect(() => {
    if (buscaAberta) searchRef.current?.focus();
    else             searchRef.current?.blur();
  }, [buscaAberta]);

  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput); setPagina(1); }, 300);
    return () => clearTimeout(t);
  }, [buscaInput]);

  useEffect(() => {
    const carregar = async () => {
      const saved = await colWidthsLoader();
      if (saved && typeof saved === 'object') {
        setColWidths(prev => ({ ...prev, ...saved }));
      }
      setColWidthsLoaded(true);
    };
    carregar();
  }, [colWidthsLoader]);

  useEffect(() => {
    if (!colWidthsLoaded) return;
    if (skipInitialSaveRef.current) { skipInitialSaveRef.current = false; return; }
    clearTimeout(saveWidthsTimeout.current);
    saveWidthsTimeout.current = setTimeout(() => colWidthsSaver(colWidths), 600);
  }, [colWidths, colWidthsLoaded, colWidthsSaver]);

  const handleOrdenar = useCallback((coluna, direcao) => setOrdenacao({ coluna, direcao }), []);

  const handleFiltrar = useCallback((coluna, valor) => {
    setFiltrosColuna(prev => ({ ...prev, [coluna]: valor }));
    setPagina(1);
  }, []);

  const handleToggleFiltro = useCallback((coluna) => setFiltroAberto(coluna), []);

  const handleResizeDelta = useCallback((coluna, delta) => {
    setColWidths(prev => {
      const currMin = colMin[coluna] ?? 80;
      const idx     = colOrder.indexOf(coluna);
      const nextCol = colOrder[idx + 1];

      if (!nextCol || prev[nextCol] == null) {
        const containerW = tableWrapperRef.current?.clientWidth ?? 0;
        const otherSum   = Object.entries(prev).filter(([k]) => k !== coluna).reduce((a, [, v]) => a + v, 0);
        const max = containerW > 0 ? Math.max(currMin, containerW - otherSum - 140) : 9999;
        return { ...prev, [coluna]: Math.min(max, Math.max(currMin, prev[coluna] + delta)) };
      }

      const nextMin = colMin[nextCol] ?? 80;
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
  }, [colMin, colOrder]);

  const filtrados = useMemo(() =>
    dados
      .filter(item => filtroFn(item, busca, filtrosColuna))
      .slice()
      .sort((a, b) => sortFn(a, b, ordenacao)),
  [dados, busca, filtrosColuna, ordenacao, filtroFn, sortFn]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const paginaAtual = useMemo(
    () => filtrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina),
    [filtrados, pagina, itensPorPagina]
  );

  const temFiltroAtivo = buscaInput || Object.values(filtrosColuna).some(Boolean);

  return {
    buscaInput, setBuscaInput,
    busca,
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
  };
}

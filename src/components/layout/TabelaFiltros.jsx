import { useEffect, useRef, useCallback } from 'react';
import { Filter } from 'lucide-react';
import {
  ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon,
} from '../../constants/icons';

// ─── Alça de redimensionamento de coluna ─────────────────────────────────────

export function ResizeHandle({ coluna, onResizeDelta }) {
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    let prevX = e.clientX;
    let pendingDelta = 0;
    let rafId = null;
    const flush = () => {
      rafId = null;
      if (pendingDelta !== 0) { onResizeDelta(coluna, pendingDelta); pendingDelta = 0; }
    };
    const onMove = (ev) => {
      pendingDelta += ev.clientX - prevX;
      prevX = ev.clientX;
      if (!rafId) rafId = requestAnimationFrame(flush);
    };
    const onUp = () => {
      if (rafId) { cancelAnimationFrame(rafId); flush(); }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [coluna, onResizeDelta]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-5 cursor-col-resize group/resize z-10"
      title="Arrastar para redimensionar"
    >
      <div className="absolute right-0 top-0 h-full w-0.5 bg-white/0 group-hover/resize:bg-white/40 transition-colors duration-150" />
    </div>
  );
}

// ─── Cabeçalho de coluna ─────────────────────────────────────────────────────
// Clique no label ou na seta → ordena (toggle asc/desc).
// Botão de funil à esquerda → abre dropdown de filtro (só para colunas de texto).

export function FiltroColuna({ coluna, label, tipo = 'texto', ordenacao, onOrdenar, filtro, onFiltrar, aberto, onToggle }) {
  const ref = useRef(null);

  const ascAtivo   = ordenacao.coluna === coluna && ordenacao.direcao === 'asc';
  const descAtivo  = ordenacao.coluna === coluna && ordenacao.direcao === 'desc';
  const temSort    = ascAtivo || descAtivo;
  const filtroAtivo = !!filtro;

  const SortIcon = ascAtivo ? ArrowUpIcon : descAtivo ? ArrowDownIcon : ArrowUpDownIcon;

  const handleSort = (e) => {
    e.stopPropagation();
    onOrdenar(coluna, ascAtivo ? 'desc' : 'asc');
  };

  const handleFilterBtn = (e) => {
    e.stopPropagation();
    onToggle(aberto ? null : coluna);
  };

  useEffect(() => {
    if (!aberto) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onToggle(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aberto, onToggle]);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1.5 select-none w-full group/col">

      {/* Botão de filtro — aparece no hover ou quando filtro está ativo */}
      {tipo === 'texto' && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={handleFilterBtn}
          title="Filtrar"
          className={`shrink-0 rounded p-0.5 transition-all duration-150 ${
            filtroAtivo
              ? 'text-emerald-400 opacity-100'
              : 'text-white/40 opacity-0 group-hover/col:opacity-100 hover:!text-white/80'
          }`}
        >
          <Filter size={11} />
        </button>
      )}

      {/* Label — clica para ordenar */}
      <span
        onClick={handleSort}
        className={`text-[11px] font-semibold uppercase tracking-wider truncate flex-1 cursor-pointer transition-colors duration-150 ${
          filtroAtivo ? 'text-emerald-300' : 'text-white/60 group-hover/col:text-white'
        }`}
      >
        {label}
      </span>

      {/* Seta de sort — clica para ordenar; visível só quando ativa ou no hover */}
      <div
        onClick={handleSort}
        className={`flex items-center flex-shrink-0 cursor-pointer transition-opacity duration-150 ${
          temSort
            ? 'opacity-100 text-white'
            : 'opacity-0 group-hover/col:opacity-50 text-white'
        }`}
      >
        <SortIcon size={12} />
      </div>

      {/* Ponto indicador de filtro ativo */}
      {filtroAtivo && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}

      {/* Dropdown de filtro */}
      {aberto && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-dropdown z-50 w-52 py-1.5 text-sm overflow-hidden"
        >
          <p className="px-3 pt-1.5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Filtrar coluna
          </p>
          <div className="px-3 pb-3">
            <input
              type="text"
              placeholder="Digitar para filtrar..."
              value={filtro}
              onChange={e => onFiltrar(coluna, e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 text-slate-800 bg-slate-50"
            />
            {filtroAtivo && (
              <button
                onClick={() => { onFiltrar(coluna, ''); onToggle(null); }}
                className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                Limpar filtro ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

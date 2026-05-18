import { useEffect, useRef, useCallback } from 'react';
import {
  ChevronDownIcon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon,
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
      className="absolute right-0 top-0 h-full w-1 bg-white/30 cursor-col-resize hover:w-2 hover:bg-white/70 active:bg-white/90 transition-all z-10"
      title="Arrastar para redimensionar"
    />
  );
}

// ─── Cabeçalho de coluna com filtro estilo Excel ──────────────────────────────

export function FiltroColuna({ coluna, label, tipo = 'texto', ordenacao, onOrdenar, filtro, onFiltrar, aberto, onToggle }) {
  const ref = useRef(null);
  const ascAtivo  = ordenacao.coluna === coluna && ordenacao.direcao === 'asc';
  const descAtivo = ordenacao.coluna === coluna && ordenacao.direcao === 'desc';
  const ativo     = ascAtivo || descAtivo || !!filtro;
  const SortIcon  = ascAtivo ? ArrowUpIcon : descAtivo ? ArrowDownIcon : ArrowUpDownIcon;
  const labelAsc  = tipo === 'data'   ? 'Mais antigo primeiro'
                  : tipo === 'numero' ? 'Menor → maior'
                                      : 'A → Z';
  const labelDesc = tipo === 'data'   ? 'Mais recente primeiro'
                  : tipo === 'numero' ? 'Maior → menor'
                                      : 'Z → A';

  useEffect(() => {
    if (!aberto) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onToggle(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aberto, onToggle]);

  return (
    <div
      ref={ref}
      onClick={() => onToggle(aberto ? null : coluna)}
      className="relative inline-flex items-center gap-1.5 select-none cursor-pointer w-full"
    >
      <span className="font-semibold truncate flex-1">{label}</span>

      <div className={`flex items-center flex-shrink-0 rounded p-0.5 ${ativo ? 'text-white' : 'text-white/50'}`}>
        <SortIcon size={13} />
        <ChevronDownIcon size={11} className={`transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`} />
      </div>

      {!!filtro && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" />}

      {aberto && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 w-48 py-1 text-sm"
        >
          <button
            onClick={() => { onOrdenar(coluna, 'asc'); onToggle(null); }}
            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left ${ascAtivo ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
          >
            <ArrowUpIcon size={13} /> {labelAsc}
          </button>
          <button
            onClick={() => { onOrdenar(coluna, 'desc'); onToggle(null); }}
            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left ${descAtivo ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
          >
            <ArrowDownIcon size={13} /> {labelDesc}
          </button>

          {tipo === 'texto' && (
            <div className="border-t border-slate-100 px-3 pt-2 pb-2">
              <p className="text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Filtrar</p>
              <input
                type="text"
                placeholder="Digitar para filtrar..."
                value={filtro}
                onChange={e => onFiltrar(coluna, e.target.value)}
                onClick={e => e.stopPropagation()}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800"
              />
              {!!filtro && (
                <button
                  onClick={() => onFiltrar(coluna, '')}
                  className="mt-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Limpar filtro ✕
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

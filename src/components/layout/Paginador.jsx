export function Paginador({ pagina, totalPaginas, onMudarPagina }) {
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
}

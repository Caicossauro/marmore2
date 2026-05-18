import { useEffect } from 'react';

export function ChapaMenuContexto({
  menuContexto,
  onFechar,
  onGirar,
  onEditar,
  onMover,
  chapasDestino,
  todasChapas,
}) {
  useEffect(() => {
    if (!menuContexto) return;
    const fechar = () => onFechar();
    document.addEventListener('mousedown', fechar);
    document.addEventListener('scroll', fechar, true);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('scroll', fechar, true);
    };
  }, [menuContexto, onFechar]);

  if (!menuContexto) return null;

  return (
    <div
      className="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-[220px]"
      style={{ left: menuContexto.x, top: menuContexto.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 border-b border-slate-100">
        <p className="text-xs text-slate-500">Peça</p>
        <p className="text-sm font-semibold text-slate-800 truncate">
          {menuContexto.peca.nome || 'Sem nome'}
        </p>
      </div>

      <button
        onClick={() => { onGirar(menuContexto.peca.id); onFechar(); }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
      >
        <span className="text-base">↻</span>
        Rotacionar 90°
      </button>

      <button
        onClick={() => { onEditar(menuContexto.peca); onFechar(); }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
      >
        <span className="text-base">✏️</span>
        Editar propriedades
      </button>

      {chapasDestino.length > 0 && (
        <>
          <div className="border-t border-slate-100 my-1" />
          <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase">
            Mover para
          </div>
          {chapasDestino.map((chapaDestino) => {
            const numeroChapa = (todasChapas || []).findIndex((c) => c.id === chapaDestino.id) + 1;
            return (
              <button
                key={chapaDestino.id}
                onClick={() => { onMover(menuContexto.peca.id, chapaDestino.id); onFechar(); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Chapa #{numeroChapa} — {chapaDestino.material.nome}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

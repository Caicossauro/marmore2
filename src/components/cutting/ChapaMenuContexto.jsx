import { useEffect } from 'react';

export function ChapaMenuContexto({
  menuContexto,
  onFechar,
  onGirar,
  onEditar,
  onLinkar,
  onDesfazerLink,
  tamanhoGrupoLink, // número de peças no grupo (se a peça está linkada)
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

      {/* Link de peças (paginação com veio). Funciona em chapa OU staging. */}
      {onLinkar && (
        <>
          <div className="border-t border-slate-100 my-1" />
          {menuContexto.peca.linkId ? (
            <button
              onClick={() => { onDesfazerLink(menuContexto.peca.id); onFechar(); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              title={tamanhoGrupoLink > 1 ? `Grupo de ${tamanhoGrupoLink} peças linkadas` : 'Desfazer link'}
            >
              <span className="text-base">🔓</span>
              Desfazer link
              {tamanhoGrupoLink > 1 && (
                <span className="ml-auto text-xs text-slate-500">{tamanhoGrupoLink} peças</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => { onLinkar(menuContexto.peca.id); onFechar(); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              title="Linkar com peças tocando (paginação com veio)"
            >
              <span className="text-base">🔗</span>
              Linkar peças tocando
            </button>
          )}
        </>
      )}

    </div>
  );
}

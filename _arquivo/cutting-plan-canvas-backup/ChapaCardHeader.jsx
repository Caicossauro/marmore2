export function ChapaCardHeader({ chapa, numero, expandido, onToggleExpandir, onExcluir }) {
  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap ${expandido ? 'mb-4' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg text-slate-800">Chapa #{numero}</span>
        <span className="bg-slate-800 text-white text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
          {chapa.material.nome}
        </span>
        <span className="text-xs text-slate-500">{chapa.pecas.length} peças</span>
      </div>
      <div className="flex items-center gap-2">
        {chapa.pecas.length === 0 && onExcluir && (
          <button
            onClick={() => onExcluir(chapa.id)}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            title="Excluir esta chapa vazia"
          >
            🗑️ Excluir
          </button>
        )}
        <button
          onClick={onToggleExpandir}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          title={expandido ? 'Retrair chapa' : 'Expandir chapa'}
        >
          <span className={`transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}>▼</span>
          {expandido ? 'Retrair' : 'Expandir'}
        </button>
      </div>
    </div>
  );
}

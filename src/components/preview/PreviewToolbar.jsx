import { TIPOS, RECORTE_TIPOS_LIST } from '../../utils/preview/acabamentosGeometry';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5;

export function PreviewToolbar({
  peca,
  precos,
  tipoSelecionado,
  setTipoSelecionado,
  onAdicionarRecorte,
  zoom,
  zoomControls,
  valido,
}) {
  return (
    <>
      {/* Toolbar de acabamentos — canto inferior esquerdo */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-0.5 sm:gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm p-1">
        {TIPOS.map(({ tipo, label, cor }) => {
          const ativoNoTipo = !!peca.acabamentos?.[tipo]?.ativo;
          const selecionado = tipoSelecionado === tipo;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoSelecionado(selecionado ? null : tipo)}
              className={`px-1.5 py-1 sm:px-2 rounded text-xs font-semibold transition-all flex items-center gap-1 sm:gap-1.5 ${
                selecionado
                  ? 'text-white shadow-sm ring-1 ring-offset-1 ring-slate-400'
                  : ativoNoTipo
                    ? 'text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
              style={(selecionado || ativoNoTipo) ? { backgroundColor: cor } : {}}
              title={`${label} — R$ ${precos?.[tipo] ?? '-'}/m`}
            >
              <span
                className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full"
                style={{
                  backgroundColor: (selecionado || ativoNoTipo) ? '#fff' : cor,
                  opacity: (selecionado || ativoNoTipo) ? 0.9 : 1,
                }}
              />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar de recortes — canto inferior direito */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-0.5 sm:gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm p-1">
        {RECORTE_TIPOS_LIST.map(({ tipo, label, cor, shape }) => {
          const isPes = shape === 'toggle';
          const ativo = isPes
            ? !!peca.pes
            : (peca.recortesPosicionados || []).some(r => r.tipo === tipo);
          const count = isPes ? 0 : (peca.recortesPosicionados || []).filter(r => r.tipo === tipo).length;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onAdicionarRecorte(tipo)}
              disabled={!valido}
              className={`px-1.5 py-1 sm:px-2 rounded text-xs font-semibold transition-all flex items-center gap-1 sm:gap-1.5 ${
                ativo
                  ? 'text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              style={ativo ? { backgroundColor: cor } : {}}
              title={isPes
                ? (ativo ? 'Remover pé' : 'Adicionar pé')
                : `Adicionar ${label} ${count > 0 ? `(${count})` : ''}`}
            >
              <span
                className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full"
                style={{
                  backgroundColor: ativo ? '#fff' : cor,
                  opacity: ativo ? 0.9 : 1,
                }}
              />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && <span className="text-[10px] opacity-80">×{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Toolbar de zoom — canto superior direito */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm">
        <button
          type="button"
          onClick={zoomControls.out}
          disabled={zoom <= ZOOM_MIN + 0.001}
          className="px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-md"
          title="Diminuir zoom"
        >
          −
        </button>
        <button
          type="button"
          onClick={zoomControls.reset}
          className="px-2 py-1 text-xs font-mono text-slate-700 hover:bg-slate-100 min-w-[48px]"
          title="Reset (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomControls.in}
          disabled={zoom >= ZOOM_MAX - 0.001}
          className="px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-md"
          title="Aumentar zoom"
        >
          +
        </button>
      </div>
    </>
  );
}

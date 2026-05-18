import { Button } from '../ui/Button';

export const ModalConfirmacaoExclusao = ({ pecaParaExcluir, onConfirmar, onCancelar }) => {
  if (!pecaParaExcluir) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-gray-100 rounded-lg shadow-lg max-w-md w-full mx-4 border border-slate-200">
        <div className="bg-slate-800 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-bold text-white">Excluir Peça</h3>
        </div>

        <div className="p-6">
          <p className="text-slate-700 text-sm mb-3">
            Deseja realmente excluir esta peça?
          </p>
          <p className="text-slate-900 font-bold text-base bg-slate-50 p-3 rounded-lg border border-slate-200">
            {pecaParaExcluir.pecaNome || 'Peça sem nome'}
          </p>
          <p className="text-xs text-slate-500 mt-3">
            A peça será removida e as chapas serão reorganizadas automaticamente.
          </p>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
          <Button variant="destructiveSolid" onClick={onConfirmar}>Excluir</Button>
        </div>
      </div>
    </div>
  );
};
